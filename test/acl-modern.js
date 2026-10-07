import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import nock from "nock";

import Consul from "../lib/index.js";
import * as helper from "./helper.js";

const id = "11111111-2222-4333-8444-555555555555";
const indexes = { CreateIndex: 12, ModifyIndex: 14 };
const token = {
  AccessorID: id,
  SecretID: "consul-smoke-token",
  Description: "consul-smoke-token",
  Policies: [{ ID: id, Name: "consul-smoke-policy" }],
  Local: false,
  CreateTime: "2026-10-07T00:00:00Z",
  Hash: "aGFzaA==",
  ...indexes,
};
const resources = [
  {
    name: "token",
    path: "token",
    list: "tokens",
    identifier: { id },
    entry: { Description: "consul-smoke-token", Local: false, Policies: [] },
    result: token,
  },
  {
    name: "policy",
    path: "policy",
    list: "policies",
    identifier: { id },
    entry: {
      Name: "consul-smoke-policy",
      Rules: `key_prefix "smoke/" { policy = "read" }`,
    },
    result: {
      ID: id,
      Name: "consul-smoke-policy",
      Description: "",
      Rules: `key_prefix "smoke/" { policy = "read" }`,
      Datacenters: null,
      Hash: "aGFzaA==",
      ...indexes,
    },
  },
  {
    name: "role",
    path: "role",
    list: "roles",
    identifier: { id },
    entry: { Name: "consul-smoke-role", Policies: [{ ID: id }] },
    result: {
      ID: id,
      Name: "consul-smoke-role",
      Description: "",
      Hash: "aGFzaA==",
      ...indexes,
    },
  },
  {
    name: "authMethod",
    path: "auth-method",
    list: "auth-methods",
    identifier: { name: "consul-smoke-auth" },
    entry: {
      Name: "consul-smoke-auth",
      Type: "jwt",
      Config: { BoundAudiences: ["consul-smoke"] },
    },
    result: { Name: "consul-smoke-auth", Type: "jwt", Config: {}, ...indexes },
  },
  {
    name: "bindingRule",
    path: "binding-rule",
    list: "binding-rules",
    identifier: { id },
    entry: {
      AuthMethod: "consul-smoke-auth",
      BindType: "role",
      BindName: "consul-smoke-role",
    },
    result: {
      ID: id,
      AuthMethod: "consul-smoke-auth",
      BindType: "role",
      BindName: "consul-smoke-role",
      ...indexes,
    },
  },
];

describe("Modern ACL", function () {
  helper.setup(this);

  resources.forEach(function (resource) {
    describe(resource.name, function () {
      const path = "/v1/acl/" + resource.path;
      const value = Object.values(resource.identifier)[0];

      it("creates an entry without changing JSON field names or values", async function () {
        const entry = JSON.parse(JSON.stringify(resource.entry));
        const scope = this.nock.put(path, entry).reply(200, resource.result);
        const client = this.consul;
        assert.deepEqual(
          await client.acl[resource.name].create({ entry }),
          resource.result,
        );
        assert.deepEqual(entry, resource.entry);
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("updates the entry using its identifier in the URL", async function () {
        const scope = this.nock
          .put(path + "/" + value, resource.entry)
          .reply(200, resource.result);
        const client = this.consul;
        assert.deepEqual(
          await client.acl[resource.name].update({
            ...resource.identifier,
            entry: resource.entry,
          }),
          resource.result,
        );
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("reads an entry using the string shorthand", async function () {
        const scope = this.nock
          .get(path + "/" + value)
          .reply(200, resource.result);
        const client = this.consul;
        assert.deepEqual(
          await client.acl[resource.name].get(value),
          resource.result,
        );
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("returns undefined and response metadata for an absent entry", async function () {
        const scope = this.nock
          .get(path + "/" + value)
          .reply(404, "ACL not found");
        const ctx = Object.assign(new EventEmitter(), {
          includeResponse: true,
        });
        const client = this.consul;
        const result = await client.acl[resource.name].get({
          ...resource.identifier,
          ctx,
        });
        assert.equal(result.length, 1);
        assert.equal(result[0].statusCode, 404);
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("preserves permission errors with the HTTP response", async function () {
        const scope = this.nock
          .get(path + "/" + value)
          .reply(403, "Permission denied");
        const ctx = Object.assign(new EventEmitter(), {
          includeResponse: true,
        });
        const client = this.consul;
        await assert.rejects(
          client.acl[resource.name].get({ ...resource.identifier, ctx }),
          (error) => {
            assert.equal(error.statusCode, 403);
            assert.equal(error.response.statusCode, 403);
            return true;
          },
        );
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("lists entries", async function () {
        const scope = this.nock
          .get("/v1/acl/" + resource.list)
          .reply(200, [resource.result]);
        const client = this.consul;
        assert.deepEqual(await client.acl[resource.name].list(), [
          resource.result,
        ]);
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("returns the server's deletion boolean", async function () {
        const scope = this.nock.delete(path + "/" + value).reply(200, false);
        const client = this.consul;
        assert.equal(await client.acl[resource.name].del(value), false);
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("does not turn deletion errors into successful results", async function () {
        const scope = this.nock
          .delete(path + "/" + value)
          .reply(404, "ACL not found");
        const client = this.consul;
        await assert.rejects(
          client.acl[resource.name].del(resource.identifier),
          { statusCode: 404 },
        );
        assert.equal(scope.isDone(), true);
        client.destroy();
      });

      it("requires an identifier and a JSON entry before making requests", async function () {
        const client = this.consul;
        for (const operation of ["get", "del", "update"]) {
          await assert.rejects(
            client.acl[resource.name][operation]({}),
            /required/,
          );
        }
        for (const entry of [undefined, null, "invalid", []]) {
          await assert.rejects(
            client.acl[resource.name].create({ entry }),
            /entry required/,
          );
        }
        await assert.rejects(
          client.acl[resource.name].update(resource.identifier),
          /entry required/,
        );
        client.destroy();
      });
    });
  });

  ["policy", "role"].forEach(function (name) {
    it(
      "reads " + name + " by escaped name and rejects ambiguous identifiers",
      async function () {
        const scope = this.nock
          .get("/v1/acl/" + name + "/name/consul%20smoke")
          .reply(200, { ID: id });
        const client = this.consul;
        assert.deepEqual(await client.acl[name].get({ name: "consul smoke" }), {
          ID: id,
        });
        await assert.rejects(
          client.acl[name].get({ name: "consul-smoke", id }),
          /either id or name/,
        );
        await assert.rejects(
          client.acl[name].get({ name: "" }),
          /name required/,
        );
        await assert.rejects(
          client.acl[name].create({ entry: {} }),
          /entry.Name required/,
        );
        await assert.rejects(
          client.acl[name].update({ id, entry: { Name: 1 } }),
          /entry.Name required/,
        );
        assert.equal(scope.isDone(), true);
        client.destroy();
      },
    );
  });

  it("passes common and token-list filters without placing secrets in the URL", async function () {
    const scope = this.nock
      .get("/v1/acl/tokens")
      .query({
        dc: "dc1",
        ns: "team",
        partition: "part1",
        index: "12",
        wait: "1m",
        consistent: "1",
        filter: `Description == "consul-smoke"`,
        policy: id,
        role: id,
        servicename: "consul-smoke",
        authmethod: "consul-smoke-auth",
        "authmethod-ns": "auth-team",
      })
      .matchHeader("x-consul-token", "consul-smoke-management")
      .reply(200, []);
    const client = new Consul({
      defaults: { token: "consul-smoke-management", dc: "dc1" },
    });
    assert.deepEqual(
      await client.acl.token.list({
        ns: "team",
        partition: "part1",
        index: 12n,
        wait: "1m",
        consistent: true,
        filter: `Description == "consul-smoke"`,
        policy: id,
        role: id,
        serviceName: "consul-smoke",
        authMethod: "consul-smoke-auth",
        authMethodNamespace: "auth-team",
      }),
      [],
    );
    assert.equal(scope.isDone(), true);
    client.destroy();
  });

  it("passes role and binding-rule filters", async function () {
    const roleScope = this.nock
      .get("/v1/acl/roles")
      .query({ policy: id })
      .reply(200, []);
    const bindingScope = this.nock
      .get("/v1/acl/binding-rules")
      .query({ authmethod: "consul-smoke-auth" })
      .reply(200, []);
    const client = this.consul;
    assert.deepEqual(await client.acl.role.list({ policy: id }), []);
    assert.deepEqual(
      await client.acl.bindingRule.list({ authMethod: "consul-smoke-auth" }),
      [],
    );
    assert.equal(roleScope.isDone(), true);
    assert.equal(bindingScope.isDone(), true);
    client.destroy();
  });

  it("enables expanded reads only when explicitly true", async function () {
    const expanded = {
      ...token,
      ExpandedPolicies: [],
      ResolvedByAgent: "consul-smoke-node",
    };
    const expandedScope = this.nock
      .get("/v1/acl/token/" + id)
      .query({ expanded: "true" })
      .reply(200, expanded);
    const plainScope = this.nock.get("/v1/acl/token/" + id).reply(200, token);
    const client = this.consul;
    assert.deepEqual(
      await client.acl.token.get({ id, expanded: true }),
      expanded,
    );
    assert.deepEqual(
      await client.acl.token.get({ id, expanded: false }),
      token,
    );
    await assert.rejects(
      client.acl.token.get({ id, expanded: "false" }),
      /expanded must be a boolean/,
    );
    assert.equal(expandedScope.isDone(), true);
    assert.equal(plainScope.isDone(), true);
    client.destroy();
  });

  it("reads the current token and handles an absent self token", async function () {
    const success = this.nock
      .get("/v1/acl/token/self")
      .matchHeader("x-consul-token", "consul-smoke-token")
      .reply(200, token);
    const missing = this.nock
      .get("/v1/acl/token/self")
      .reply(404, "Supplied token does not exist");
    const client = this.consul;
    assert.deepEqual(
      await client.acl.token.self({ token: "consul-smoke-token" }),
      token,
    );
    assert.equal(await client.acl.token.self(), undefined);
    assert.equal(success.isDone(), true);
    assert.equal(missing.isDone(), true);
    client.destroy();
  });

  it("clones tokens with optional and empty descriptions", async function () {
    const plain = this.nock
      .put("/v1/acl/token/" + id + "/clone", {})
      .reply(200, token);
    const described = this.nock
      .put("/v1/acl/token/" + id + "/clone", { Description: "" })
      .reply(200, token);
    const client = this.consul;
    assert.deepEqual(await client.acl.token.clone(id), token);
    assert.deepEqual(
      await client.acl.token.clone({ id, description: "" }),
      token,
    );
    await assert.rejects(client.acl.token.clone({}), /id required/);
    assert.equal(plain.isDone(), true);
    assert.equal(described.isDone(), true);
    client.destroy();
  });

  it("validates required auth-method and binding-rule creation fields", async function () {
    const client = this.consul;
    for (const [entry, message] of [
      [{}, "Name"],
      [{ Name: "consul-smoke" }, "Type"],
    ]) {
      await assert.rejects(
        client.acl.authMethod.create({ entry }),
        new RegExp("entry." + message + " required"),
      );
    }
    for (const [entry, message] of [
      [{}, "BindType"],
      [{ BindType: "role" }, "BindName"],
      [{ BindType: "role", BindName: "consul-smoke-role" }, "AuthMethod"],
    ]) {
      await assert.rejects(
        client.acl.bindingRule.create({ entry }),
        new RegExp("entry." + message + " required"),
      );
    }
    client.destroy();
  });

  it("allows immutable auth-method and binding fields to be omitted on update", async function () {
    const authScope = this.nock
      .put("/v1/acl/auth-method/consul-smoke", { Config: {} })
      .reply(200, {});
    const bindingScope = this.nock
      .put("/v1/acl/binding-rule/" + id, {
        BindType: "role",
        BindName: "consul-smoke",
      })
      .reply(200, {});
    const client = this.consul;
    await client.acl.authMethod.update({
      name: "consul-smoke",
      entry: { Config: {} },
    });
    await client.acl.bindingRule.update({
      id,
      entry: { BindType: "role", BindName: "consul-smoke" },
    });
    assert.equal(authScope.isDone(), true);
    assert.equal(bindingScope.isDone(), true);
    client.destroy();
  });

  it("logs in with a bearer token without changing the client's defaults", async function () {
    const scope = this.nock
      .post("/v1/acl/login", {
        AuthMethod: "consul-smoke-auth",
        BearerToken: "consul-smoke-bearer",
        Meta: { source: "consul-smoke" },
      })
      .query({ ns: "team", partition: "part1", dc: "dc1" })
      .reply(200, token);
    const client = new Consul({
      defaults: { token: "consul-smoke-management" },
    });
    assert.deepEqual(
      await client.acl.login({
        authMethod: "consul-smoke-auth",
        bearerToken: "consul-smoke-bearer",
        meta: { source: "consul-smoke" },
        ns: "team",
        partition: "part1",
        dc: "dc1",
      }),
      token,
    );
    assert.equal(client._defaults.token, "consul-smoke-management");
    assert.equal(scope.isDone(), true);
    client.destroy();
  });

  it("validates login credentials and preserves unauthorized responses", async function () {
    const scope = this.nock
      .post("/v1/acl/login", {
        AuthMethod: "consul-smoke",
        BearerToken: "consul-smoke-bearer",
      })
      .reply(401, "Login denied");
    const client = this.consul;
    await assert.rejects(client.acl.login(), /authmethod required/);
    await assert.rejects(
      client.acl.login({ authMethod: "consul-smoke" }),
      /bearertoken required/,
    );
    await assert.rejects(
      client.acl.login({
        authMethod: "consul-smoke",
        bearerToken: "consul-smoke-bearer",
      }),
      {
        statusCode: 401,
      },
    );
    assert.equal(scope.isDone(), true);
    client.destroy();
  });

  it("logs out using the selected token and preserves the response boolean", async function () {
    const scope = this.nock
      .post("/v1/acl/logout")
      .matchHeader("x-consul-token", "consul-smoke-token")
      .reply(200, true);
    const ctx = Object.assign(new EventEmitter(), { includeResponse: true });
    const client = this.consul;
    const [response, value] = await client.acl.logout({
      token: "consul-smoke-token",
      ctx,
    });
    assert.equal(response.statusCode, 200);
    assert.equal(value, true);
    assert.equal(scope.isDone(), true);
    client.destroy();
  });

  it("honors pre-aborted operations without making an HTTP request", async function () {
    const client = this.consul;
    const signal = AbortSignal.abort();
    await assert.rejects(client.acl.token.get({ id, signal }), {
      code: "ABORT_ERR",
    });
    await assert.rejects(
      client.acl.policy.create({ entry: { Name: "consul-smoke" }, signal }),
      {
        code: "ABORT_ERR",
      },
    );
    assert.deepEqual(nock.pendingMocks(), []);
    client.destroy();
  });
});
