import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";

import Consul from "../../lib/index.js";
import * as helper from "./helper.js";

function bearerToken(privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    { alg: "RS256", typ: "JWT" },
    {
      iss: "consul-smoke",
      aud: "consul-smoke",
      sub: "consul-smoke-user",
      iat: now,
      exp: now + 300,
    },
  ]
    .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
    .join(".");
  return (
    unsigned +
    "." +
    sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url")
  );
}

helper.describe("Modern ACL acceptance", function () {
  before(async function () {
    await helper.before(this, { secure: true, nodeCount: 1 });
  });

  after(async function () {
    await helper.after(this);
  });

  it("manages policies and tokens and enforces limited KV access", async function () {
    const name = "consul-smoke-token-" + randomUUID();
    const prefix = name + "/";
    const policy = await this.c1.acl.policy.create({
      entry: {
        Name: name,
        Rules: `key_prefix "${prefix}" { policy = "read" }`,
      },
    });
    assert.equal((await this.c1.acl.policy.get(policy.ID)).Name, name);
    assert.equal((await this.c1.acl.policy.get({ name })).ID, policy.ID);
    assert.ok(
      (await this.c1.acl.policy.list()).some((entry) => entry.ID === policy.ID),
    );
    const updatedPolicy = await this.c1.acl.policy.update({
      id: policy.ID,
      entry: {
        Name: name,
        Description: "consul-smoke-updated",
        Rules: policy.Rules,
      },
    });
    assert.equal(updatedPolicy.Description, "consul-smoke-updated");

    const created = await this.c1.acl.token.create({
      entry: {
        Description: name,
        Policies: [{ ID: policy.ID }],
        Local: false,
        ExpirationTTL: "5m",
      },
    });
    assert.equal(
      (await this.c1.acl.token.get(created.AccessorID)).Description,
      name,
    );
    const expanded = await this.c1.acl.token.get({
      id: created.AccessorID,
      expanded: true,
    });
    assert.ok(
      expanded.ExpandedPolicies.some((entry) => entry.ID === policy.ID),
    );
    assert.ok(
      (await this.c1.acl.token.list({ policy: policy.ID })).some(
        (entry) => entry.AccessorID === created.AccessorID,
      ),
    );
    const updated = await this.c1.acl.token.update({
      id: created.AccessorID,
      entry: {
        Description: "consul-smoke-updated",
        Policies: [{ ID: policy.ID }],
        Local: false,
      },
    });
    assert.equal(updated.Description, "consul-smoke-updated");
    const cloned = await this.c1.acl.token.clone({
      id: created.AccessorID,
      description: "consul-smoke-cloned",
    });
    assert.notEqual(cloned.AccessorID, created.AccessorID);
    assert.equal(cloned.Description, "consul-smoke-cloned");

    await this.c1.kv.set(prefix + "allowed", "consul-smoke-value");
    const limited = new Consul({
      ...this.cluster.clientOptions,
      defaults: { token: created.SecretID },
    });
    try {
      assert.equal(
        (await limited.acl.token.self()).AccessorID,
        created.AccessorID,
      );
      assert.equal(
        (await limited.kv.get(prefix + "allowed")).Value,
        "consul-smoke-value",
      );
      await assert.rejects(limited.kv.get("consul-smoke-forbidden/key"), {
        statusCode: 403,
      });
      await assert.rejects(
        limited.kv.set(prefix + "allowed", "consul-smoke-new"),
        { statusCode: 403 },
      );
      await assert.rejects(limited.acl.policy.list(), { statusCode: 403 });
    } finally {
      limited.destroy();
    }

    assert.equal(await this.c1.acl.token.del(cloned.AccessorID), true);
    assert.equal(await this.c1.acl.token.del(created.AccessorID), true);
    assert.equal(await this.c1.acl.token.get(created.AccessorID), undefined);
    await assert.rejects(this.c1.acl.token.del(created.AccessorID), {
      statusCode: 404,
    });
    assert.equal(await this.c1.acl.policy.del(policy.ID), true);
    assert.equal(await this.c1.acl.policy.get({ name }), undefined);
    await this.c1.kv.del(prefix + "allowed");
  });

  it("manages roles and attaches role grants to a token", async function () {
    const name = "consul-smoke-role-" + randomUUID();
    const policy = await this.c1.acl.policy.create({
      entry: { Name: name, Rules: `node_prefix "" { policy = "read" }` },
    });
    const role = await this.c1.acl.role.create({
      entry: { Name: name, Policies: [{ ID: policy.ID }] },
    });
    assert.equal((await this.c1.acl.role.get(role.ID)).Name, name);
    assert.equal((await this.c1.acl.role.get({ name })).ID, role.ID);
    assert.ok(
      (await this.c1.acl.role.list({ policy: policy.ID })).some(
        (entry) => entry.ID === role.ID,
      ),
    );
    const updated = await this.c1.acl.role.update({
      id: role.ID,
      entry: {
        Name: name,
        Description: "consul-smoke-updated",
        Policies: [{ ID: policy.ID }],
      },
    });
    assert.equal(updated.Description, "consul-smoke-updated");
    const token = await this.c1.acl.token.create({
      entry: { Description: name, Roles: [{ Name: name }] },
    });
    assert.ok(token.Roles.some((entry) => entry.ID === role.ID));
    assert.equal(await this.c1.acl.token.del(token.AccessorID), true);
    assert.equal(await this.c1.acl.role.del(role.ID), true);
    assert.equal(await this.c1.acl.role.get({ name }), undefined);
    await assert.rejects(this.c1.acl.role.del(role.ID), { statusCode: 404 });
    await this.c1.acl.policy.del(policy.ID);
  });

  it("manages JWT auth methods and binding rules and revokes login tokens", async function () {
    const name = "consul-smoke-login-" + randomUUID();
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const role = await this.c1.acl.role.create({
      entry: {
        Name: name,
        ServiceIdentities: [{ ServiceName: "consul-smoke-service" }],
      },
    });
    const config = {
      JWTValidationPubKeys: [publicKey.export({ type: "spki", format: "pem" })],
      JWTSupportedAlgs: ["RS256"],
      BoundIssuer: "consul-smoke",
      BoundAudiences: ["consul-smoke"],
      ClaimMappings: { sub: "subject" },
    };
    const method = await this.c1.acl.authMethod.create({
      entry: {
        Name: name,
        Type: "jwt",
        Config: config,
        MaxTokenTTL: "5m",
        TokenLocality: "local",
      },
    });
    assert.equal(method.Name, name);
    assert.equal((await this.c1.acl.authMethod.get(name)).Type, "jwt");
    assert.ok(
      (await this.c1.acl.authMethod.list()).some(
        (entry) => entry.Name === name,
      ),
    );
    const updated = await this.c1.acl.authMethod.update({
      name,
      entry: {
        Config: config,
        Description: "consul-smoke-updated",
        MaxTokenTTL: "5m",
      },
    });
    assert.equal(updated.Description, "consul-smoke-updated");

    const rule = await this.c1.acl.bindingRule.create({
      entry: {
        AuthMethod: name,
        Selector: `value.subject == "consul-smoke-user"`,
        BindType: "role",
        BindName: name,
      },
    });
    assert.equal((await this.c1.acl.bindingRule.get(rule.ID)).AuthMethod, name);
    assert.ok(
      (await this.c1.acl.bindingRule.list({ authMethod: name })).some(
        (entry) => entry.ID === rule.ID,
      ),
    );
    const updatedRule = await this.c1.acl.bindingRule.update({
      id: rule.ID,
      entry: {
        Description: "consul-smoke-updated",
        BindType: "role",
        BindName: name,
      },
    });
    assert.equal(updatedRule.Description, "consul-smoke-updated");

    const anonymous = new Consul({
      ...this.cluster.clientOptions,
      defaults: {},
    });
    try {
      const loggedIn = await anonymous.acl.login({
        authMethod: name,
        bearerToken: bearerToken(privateKey),
        meta: { source: "consul-smoke" },
      });
      assert.equal(loggedIn.AuthMethod, name);
      assert.equal(loggedIn.Local, true);
      assert.ok(loggedIn.Roles.some((entry) => entry.ID === role.ID));
      assert.equal(
        (await anonymous.acl.token.self({ token: loggedIn.SecretID }))
          .AccessorID,
        loggedIn.AccessorID,
      );
      assert.equal(
        await anonymous.acl.logout({ token: loggedIn.SecretID }),
        true,
      );
      assert.equal(await this.c1.acl.token.get(loggedIn.AccessorID), undefined);
      await assert.rejects(anonymous.acl.logout({ token: loggedIn.SecretID }), {
        statusCode: 401,
      });
    } finally {
      anonymous.destroy();
    }

    assert.equal(await this.c1.acl.bindingRule.del(rule.ID), true);
    assert.equal(await this.c1.acl.bindingRule.get(rule.ID), undefined);
    assert.equal(await this.c1.acl.authMethod.del(name), true);
    assert.equal(await this.c1.acl.authMethod.get(name), undefined);
    await this.c1.acl.role.del(role.ID);
  });
});
