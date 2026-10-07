import assert from "node:assert/strict";

import * as helper from "./helper.js";

describe("Agent", function () {
  helper.setup(this);

  describe("checks", function () {
    it("should work", async function () {
      this.nock.get("/v1/agent/checks").reply(200, [{ ok: true }]);

      const data = await this.consul.agent.checks({});
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/agent/checks").reply(200, [{ ok: true }]);

      const data = await this.consul.agent.checks();
      assert.deepEqual(data, [{ ok: true }]);
    });
  });

  describe("check", function () {
    describe("list", function () {
      it("should work", async function () {
        this.nock.get("/v1/agent/checks").reply(200, [{ ok: true }]);

        const data = await this.consul.agent.check.list({});
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with no arguments", async function () {
        this.nock.get("/v1/agent/checks").reply(200, [{ ok: true }]);

        const data = await this.consul.agent.check.list();
        assert.deepEqual(data, [{ ok: true }]);
      });
    });

    describe("register", function () {
      it("should work (http)", async function () {
        this.nock
          .put("/v1/agent/check/register", {
            ID: "123",
            Name: "test",
            ServiceID: "service",
            HTTP: "http://example.org/",
            TLSSkipVerify: true,
            Interval: "5s",
            Notes: "http check",
            Status: "critical",
          })
          .reply(200);

        await this.consul.agent.check.register({
          id: "123",
          name: "test",
          service_id: "service",
          http: "http://example.org/",
          tls_skip_verify: true,
          interval: "5s",
          notes: "http check",
          status: "critical",
        });
      });

      it("should work (script)", async function () {
        this.nock
          .put("/v1/agent/check/register", {
            Name: "test",
            Script: "true",
            Interval: "5s",
          })
          .reply(200);

        await this.consul.agent.check.register({
          name: "test",
          script: "true",
          interval: "5s",
        });
      });

      it("should work (ttl)", async function () {
        this.nock
          .put("/v1/agent/check/register", {
            ID: "123",
            Name: "test",
            ServiceID: "service",
            TTL: "10s",
            Notes: "ttl check",
          })
          .reply(200);

        await this.consul.agent.check.register({
          id: "123",
          name: "test",
          serviceid: "service",
          ttl: "10s",
          notes: "ttl check",
        });
      });

      it("should require check", async function () {
        try {
          await this.consul.agent.check.register({
            name: "test",
            serviceid: "service",
          });
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.check.register: args/grpc/h2ping/http/tcp/udp and interval, " +
              "ttl, or aliasnode/aliasservice",
          );
        }
      });

      it("should require name", async function () {
        try {
          await this.consul.agent.check.register({
            http: "http://localhost:5000/health",
            interval: "10s",
          });
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.check.register: name required",
          );
        }
      });
    });

    describe("deregister", function () {
      it("should work", async function () {
        this.nock.put("/v1/agent/check/deregister/123").reply(200);

        await this.consul.agent.check.deregister({ id: "123" });
      });

      it("should work with just id", async function () {
        this.nock.put("/v1/agent/check/deregister/123").reply(200);

        await this.consul.agent.check.deregister("123");
      });

      it("should require id", async function () {
        try {
          await this.consul.agent.check.deregister({});
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.check.deregister: id required",
          );
        }
      });
    });

    describe("pass", function () {
      it("should work", async function () {
        this.nock.put("/v1/agent/check/pass/123?note=ok").reply(200);

        await this.consul.agent.check.pass({
          id: "123",
          note: "ok",
        });
      });

      it("should work with just id", async function () {
        this.nock.put("/v1/agent/check/pass/123").reply(200);

        await this.consul.agent.check.pass("123");
      });

      it("should require id", async function () {
        try {
          await this.consul.agent.check.pass({});
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.check.pass: id required",
          );
        }
      });
    });

    describe("warn", function () {
      it("should work", async function () {
        this.nock.put("/v1/agent/check/warn/123?note=ify").reply(200);

        await this.consul.agent.check.warn({
          id: "123",
          note: "ify",
        });
      });

      it("should work with just id", async function () {
        this.nock.put("/v1/agent/check/warn/123").reply(200);

        await this.consul.agent.check.warn("123");
      });

      it("should require id", async function () {
        try {
          await this.consul.agent.check.warn({});
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.check.warn: id required",
          );
        }
      });
    });

    describe("fail", function () {
      it("should work", async function () {
        this.nock.put("/v1/agent/check/fail/123?note=error").reply(200);

        await this.consul.agent.check.fail({
          id: "123",
          note: "error",
        });
      });

      it("should work with just id", async function () {
        this.nock.put("/v1/agent/check/fail/123").reply(200);

        await this.consul.agent.check.fail("123");
      });

      it("should require id", async function () {
        try {
          await this.consul.agent.check.fail({});
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.check.fail: id required",
          );
        }
      });
    });
  });

  describe("services", function () {
    it("should work", async function () {
      this.nock.get("/v1/agent/services").reply(200, [{ ok: true }]);

      const data = await this.consul.agent.services({});
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/agent/services").reply(200, [{ ok: true }]);

      const data = await this.consul.agent.services();
      assert.deepEqual(data, [{ ok: true }]);
    });
  });

  describe("service", function () {
    describe("list", function () {
      it("should work", async function () {
        this.nock.get("/v1/agent/services").reply(200, [{ ok: true }]);

        const data = await this.consul.agent.service.list({});
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with no arguments", async function () {
        this.nock.get("/v1/agent/services").reply(200, [{ ok: true }]);

        const data = await this.consul.agent.service.list();
        assert.deepEqual(data, [{ ok: true }]);
      });
    });

    describe("register", function () {
      it("should work with only name", async function () {
        this.nock
          .put("/v1/agent/service/register", { Name: "service" })
          .reply(200);

        await this.consul.agent.service.register("service");
      });

      it("registers a TTL service check without a check name", async function () {
        this.nock
          .put("/v1/agent/service/register", {
            Name: "consul-smoke-service",
            Check: { TTL: "30s", DeregisterCriticalServiceAfter: "1m" },
          })
          .reply(200);

        const result = await this.consul.agent.service.register({
          name: "consul-smoke-service",
          check: { ttl: "30s", deregistercriticalserviceafter: "1m" },
        });
        assert.equal(result, undefined);
      });

      it("should require valid check", async function () {
        try {
          await this.consul.agent.service.register({
            name: "service",
            check: {},
          });
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.service.register: args/grpc/h2ping/http/tcp/udp and interval, " +
              "ttl, or aliasnode/aliasservice",
          );
        }
      });

      it("should require name", async function () {
        try {
          await this.consul.agent.service.register({});
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.service.register: name required",
          );
        }
      });
    });

    describe("deregister", function () {
      it("should work", async function () {
        this.nock.put("/v1/agent/service/deregister/123").reply(200);

        await this.consul.agent.service.deregister({ id: "123" });
      });

      it("should work with just id", async function () {
        this.nock.put("/v1/agent/service/deregister/123").reply(200);

        await this.consul.agent.service.deregister("123");
      });

      it("should require id", async function () {
        try {
          await this.consul.agent.service.deregister({});
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.service.deregister: id required",
          );
        }
      });
    });

    describe("maintaince", function () {
      it("should work", async function () {
        this.nock
          .put("/v1/agent/service/maintenance/123?enable=true")
          .reply(200);

        await this.consul.agent.service.maintenance({ id: 123, enable: true });
      });

      it("should work with reason", async function () {
        this.nock
          .put("/v1/agent/service/maintenance/123?enable=false&reason=test")
          .reply(200);

        await this.consul.agent.service.maintenance({
          id: 123,
          enable: false,
          reason: "test",
        });
      });

      it("should require id", async function () {
        try {
          await this.consul.agent.service.maintenance({});
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.service.maintenance: id required",
          );
          assert.deepEqual(err.isValidation, true);
        }
      });

      it("should require enable", async function () {
        try {
          await this.consul.agent.service.maintenance({ id: 123 });
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: agent.service.maintenance: enable required",
          );
          assert.deepEqual(err.isValidation, true);
        }
      });
    });
  });

  describe("members", function () {
    it("should work", async function () {
      this.nock.get("/v1/agent/members").reply(200, [{ ok: true }]);

      const data = await this.consul.agent.members({});
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/agent/members").reply(200, [{ ok: true }]);

      const data = await this.consul.agent.members();
      assert.deepEqual(data, [{ ok: true }]);
    });
  });

  describe("reload", function () {
    it("should work", async function () {
      this.nock.put("/v1/agent/reload").reply(200);

      await this.consul.agent.reload({});
    });

    it("should work with no arguments", async function () {
      this.nock.put("/v1/agent/reload").reply(200);

      await this.consul.agent.reload();
    });
  });

  describe("self", function () {
    it("should work", async function () {
      this.nock.get("/v1/agent/self").reply(200, { ok: true });

      const data = await this.consul.agent.self({});
      assert.deepEqual(data, { ok: true });
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/agent/self").reply(200, { ok: true });

      const data = await this.consul.agent.self();
      assert.deepEqual(data, { ok: true });
    });
  });

  describe("maintenance", function () {
    it("should work", async function () {
      this.nock.put("/v1/agent/maintenance?enable=true&reason=test").reply(200);

      await this.consul.agent.maintenance({ enable: true, reason: "test" });
    });

    it("should work with just enable", async function () {
      this.nock.put("/v1/agent/maintenance?enable=false").reply(200);

      await this.consul.agent.maintenance(false);
    });

    it("should require enable", async function () {
      try {
        await this.consul.agent.maintenance({});
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: agent.maintenance: enable required",
        );
        assert.deepEqual(err.isValidation, true);
      }
    });
  });

  describe("join", function () {
    it("should work", async function () {
      this.nock.put("/v1/agent/join/127.0.0.2").reply(200);

      await this.consul.agent.join({ address: "127.0.0.2" });
    });

    it("should work with just address", async function () {
      this.nock.put("/v1/agent/join/127.0.0.2").reply(200);

      await this.consul.agent.join("127.0.0.2");
    });

    it("should require address", async function () {
      try {
        await this.consul.agent.join({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(err.message, "consul: agent.join: address required");
        assert.deepEqual(err.isValidation, true);
      }
    });
  });

  describe("forceLeave", function () {
    it("should work", async function () {
      this.nock.put("/v1/agent/force-leave/node").reply(200);

      await this.consul.agent.forceLeave({ node: "node" });
    });

    it("should work with just address", async function () {
      this.nock.put("/v1/agent/force-leave/node").reply(200);

      await this.consul.agent.forceLeave("node");
    });

    it("should require node", async function () {
      try {
        await this.consul.agent.forceLeave({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: agent.forceLeave: node required",
        );
        assert.deepEqual(err.isValidation, true);
      }
    });
  });
});
