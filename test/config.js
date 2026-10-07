import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import * as helper from "./helper.js";

describe("Config", function () {
  helper.setup(this);

  const entry = {
    Kind: "service-defaults",
    Name: "web",
    Protocol: "http",
  };

  describe("get", function () {
    it("should read one entry", async function () {
      this.nock.get("/v1/config/service-defaults/web").reply(200, entry);

      const data = await this.consul.config.get({
        kind: "service-defaults",
        name: "web",
      });
      assert.deepEqual(data, entry);
    });

    it("should preserve common read options", async function () {
      const scope = this.nock
        .get("/v1/config/service-defaults/web")
        .query({
          dc: "dc2",
          ns: "team",
          partition: "part1",
          consistent: "1",
          index: "99",
          wait: "1m",
        })
        .matchHeader("x-consul-token", "test-token")
        .reply(200, entry);

      await this.consul.config.get({
        kind: "service-defaults",
        name: "web",
        dc: "dc2",
        ns: "team",
        partition: "part1",
        consistent: true,
        index: 99n,
        wait: "1m",
        token: "test-token",
      });
      scope.done();
    });

    it("should return undefined for a missing entry", async function () {
      this.nock.get("/v1/config/service-defaults/web").reply(404, "not found");

      assert.equal(
        await this.consul.config.get({ kind: "service-defaults", name: "web" }),
        undefined,
      );
    });

    it("should include responses for existing and missing entries", async function () {
      const ctx = new EventEmitter();
      ctx.includeResponse = true;
      this.nock.get("/v1/config/service-defaults/web").reply(200, entry);
      this.nock.get("/v1/config/service-defaults/none").reply(404, "not found");

      const [response, data] = await this.consul.config.get({
        kind: "service-defaults",
        name: "web",
        ctx,
      });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(data, entry);

      const missing = await this.consul.config.get({
        kind: "service-defaults",
        name: "none",
        ctx,
      });
      assert.equal(missing.length, 1);
      assert.equal(missing[0].statusCode, 404);
    });

    it("should preserve HTTP errors", async function () {
      this.nock.get("/v1/config/service-defaults/web").reply(403, "denied");

      await assert.rejects(
        this.consul.config.get({ kind: "service-defaults", name: "web" }),
        { statusCode: 403 },
      );
    });

    it("should preserve network errors without a response", async function () {
      this.nock.get("/v1/config/service-defaults/web").replyWithError(
        Object.assign(new Error("connection lost"), {
          code: "ECONNRESET",
        }),
      );

      await assert.rejects(
        this.consul.config.get({ kind: "service-defaults", name: "web" }),
        { code: "ECONNRESET" },
      );
    });

    it("should escape names as a single path parameter", async function () {
      this.nock
        .get("/v1/config/service-defaults/web%2Fapi%3Ftest")
        .reply(200, entry);

      await this.consul.config.get({
        kind: "service-defaults",
        name: "web/api?test",
      });
    });
  });

  describe("set", function () {
    it("should apply an entry without modifying it", async function () {
      const scope = this.nock.put("/v1/config", entry).reply(200, true);
      const options = Object.freeze({ entry: Object.freeze(entry) });

      assert.equal(await this.consul.config.set(options), true);
      scope.done();
    });

    it("should send CAS zero and namespace/partition options", async function () {
      const scope = this.nock
        .put("/v1/config", entry)
        .query({ cas: "0", dc: "dc2", ns: "team", partition: "part1" })
        .reply(200, false);

      assert.equal(
        await this.consul.config.set({
          entry,
          cas: 0,
          dc: "dc2",
          ns: "team",
          partition: "part1",
        }),
        false,
      );
      scope.done();
    });

    ["18446744073709551615", 18446744073709551615n].forEach(function (cas) {
      it("should send precise CAS index " + typeof cas, async function () {
        const scope = this.nock
          .put("/v1/config", entry)
          .query({ cas: "18446744073709551615" })
          .reply(200, true);

        assert.equal(await this.consul.config.set({ entry, cas }), true);
        scope.done();
      });
    });

    it("should write service intentions without changing L4/L7 fields", async function () {
      const intentions = {
        Kind: "service-intentions",
        Name: "web",
        Sources: [
          { Name: "admin", Action: "allow" },
          {
            Name: "frontend",
            Permissions: [
              {
                Action: "allow",
                HTTP: {
                  PathPrefix: "/api/",
                  Methods: ["GET"],
                  Header: [{ Name: "x-role", Exact: "reader" }],
                },
              },
            ],
          },
        ],
      };
      const scope = this.nock.put("/v1/config", intentions).reply(200, true);

      assert.equal(await this.consul.config.set({ entry: intentions }), true);
      scope.done();
    });
  });

  describe("list", function () {
    it("should list entries by kind", async function () {
      this.nock.get("/v1/config/service-defaults").reply(200, [entry]);

      assert.deepEqual(await this.consul.config.list("service-defaults"), [
        entry,
      ]);
    });

    it("should forward list filters and blocking options", async function () {
      const scope = this.nock
        .get("/v1/config/service-defaults")
        .query({
          filter: `Name == "web"`,
          ns: "team",
          partition: "part1",
          index: "42",
          wait: "1s",
        })
        .reply(200, []);

      assert.deepEqual(
        await this.consul.config.list({
          kind: "service-defaults",
          filter: `Name == "web"`,
          ns: "team",
          partition: "part1",
          index: 42,
          wait: "1s",
        }),
        [],
      );
      scope.done();
    });
  });

  describe("del", function () {
    it("should delete entries without CAS", async function () {
      this.nock.delete("/v1/config/service-defaults/web").reply(200, {});

      assert.equal(
        await this.consul.config.del({ kind: "service-defaults", name: "web" }),
        true,
      );
    });

    it("should preserve HTTP errors instead of returning success", async function () {
      this.nock.delete("/v1/config/service-defaults/web").reply(403, "denied");

      await assert.rejects(
        this.consul.config.del({ kind: "service-defaults", name: "web" }),
        { statusCode: 403 },
      );
    });

    it("should preserve network errors instead of returning success", async function () {
      this.nock
        .delete("/v1/config/service-defaults/web")
        .replyWithError(
          Object.assign(new Error("connection lost"), { code: "ECONNRESET" }),
        );

      await assert.rejects(
        this.consul.config.del({ kind: "service-defaults", name: "web" }),
        { code: "ECONNRESET" },
      );
    });

    it("should preserve CAS zero instead of deleting unconditionally", async function () {
      const scope = this.nock
        .delete("/v1/config/service-defaults/web")
        .query({ cas: "0", ns: "team", partition: "part1" })
        .reply(200, false);

      assert.equal(
        await this.consul.config.delete({
          kind: "service-defaults",
          name: "web",
          cas: 0,
          ns: "team",
          partition: "part1",
        }),
        false,
      );
      scope.done();
    });

    it("should forward a nonzero CAS index", async function () {
      const scope = this.nock
        .delete("/v1/config/service-defaults/web")
        .query({ cas: "42" })
        .reply(200, true);

      assert.equal(
        await this.consul.config.del({
          kind: "service-defaults",
          name: "web",
          cas: 42,
        }),
        true,
      );
      scope.done();
    });
  });

  ["set", "list", "del"].forEach(function (method) {
    it(
      method + " should include the response when requested",
      async function () {
        const ctx = new EventEmitter();
        ctx.includeResponse = true;
        const body = method === "list" ? [entry] : method === "del" ? {} : true;
        const scope = this.nock;
        if (method === "set") scope.put("/v1/config", entry).reply(200, body);
        if (method === "list")
          scope.get("/v1/config/service-defaults").reply(200, body);
        if (method === "del")
          scope.delete("/v1/config/service-defaults/web").reply(200, body);

        const [response, data] = await this.consul.config[method]({
          entry,
          kind: "service-defaults",
          name: "web",
          ctx,
        });
        assert.equal(response.statusCode, 200);
        assert.deepEqual(data, method === "del" ? true : body);
        assert.deepEqual(response.body, body);
        scope.done();
      },
    );
  });

  ["get", "list", "del"].forEach(function (method) {
    it(method + " should require a kind", async function () {
      for (const kind of [undefined, "", 123]) {
        await assert.rejects(this.consul.config[method]({ kind }), {
          message: "consul: config." + method + ": kind required",
          isValidation: true,
        });
      }
    });
  });

  ["get", "del"].forEach(function (method) {
    it(method + " should require a name", async function () {
      for (const name of [undefined, "", 123]) {
        await assert.rejects(
          this.consul.config[method]({ kind: "service-defaults", name }),
          {
            message: "consul: config." + method + ": name required",
            isValidation: true,
          },
        );
      }
    });
  });

  it("set should require an object entry", async function () {
    for (const invalid of [undefined, null, [], "entry"]) {
      await assert.rejects(this.consul.config.set({ entry: invalid }), {
        message: "consul: config.set: entry required",
        isValidation: true,
      });
    }
  });

  it("set should require entry Kind and Name", async function () {
    for (const Kind of [undefined, "", 123]) {
      await assert.rejects(this.consul.config.set({ entry: { Kind } }), {
        message: "consul: config.set: entry.Kind required",
        isValidation: true,
      });
    }
    for (const Name of [undefined, "", 123]) {
      await assert.rejects(
        this.consul.config.set({ entry: { Kind: "service-defaults", Name } }),
        {
          message: "consul: config.set: entry.Name required",
          isValidation: true,
        },
      );
    }
  });

  ["set", "del"].forEach(function (method) {
    it(method + " should reject invalid CAS indexes", async function () {
      for (const cas of [
        undefined,
        null,
        true,
        -1,
        -1n,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
        "-1",
        "1.5",
        "invalid",
        "18446744073709551616",
      ]) {
        await assert.rejects(
          this.consul.config[method]({
            entry,
            kind: "service-defaults",
            name: "web",
            cas,
          }),
          { isValidation: true },
        );
      }
    });
  });
});
