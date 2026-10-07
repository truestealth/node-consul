import should from "should";
import { EventEmitter } from "node:events";

import * as helper from "./helper.js";

describe("Kv", function () {
  helper.setup(this);

  describe("get", function () {
    it("should work", async function () {
      this.nock.get("/v1/kv/key1").reply(200, [{ ok: true }]);

      const data = await this.consul.kv.get({ key: "key1" });
      should(data).eql({ ok: true });
    });

    it("should return raw", async function () {
      this.nock.get("/v1/kv/key1?raw=true").reply(200, "value1");

      const data = await this.consul.kv.get({
        key: "key1",
        raw: true,
      });
      should(data).eql(Buffer.from("value1"));
    });

    it("should return handle not found", async function () {
      this.nock.get("/v1/kv/key1").reply(404, "value1");

      const data = await this.consul.kv.get("key1");
      should(data).be.undefined();
    });

    it("should decode values", async function () {
      this.nock
        .get("/v1/kv/?recurse=true")
        .reply(200, [{ Value: "dmFsdWUx" }, { ok: true }]);

      const data = await this.consul.kv.get({ recurse: true });
      should(data).eql([{ Value: "value1" }, { ok: true }]);
    });

    it("should decode buffers and preserve null values", async function () {
      const scope = this.nock
        .get("/v1/kv/?recurse=true")
        .reply(200, [{ Value: "dmFsdWUx" }, { Value: null }]);

      const data = await this.consul.kv.get({ recurse: true, buffer: true });
      should(data).eql([{ Value: Buffer.from("value1") }, { Value: null }]);
      scope.done();
    });

    it("should return one item when recurse is false", async function () {
      this.nock.get("/v1/kv/key1").reply(200, [{ Value: "dmFsdWUx" }]);

      const data = await this.consul.kv.get({ key: "key1", recurse: false });
      should(data).eql({ Value: "value1" });
    });

    it("should include response for raw and missing keys", async function () {
      const ctx = new EventEmitter();
      ctx.includeResponse = true;
      this.nock.get("/v1/kv/key1?raw=true").reply(200, "value1");
      this.nock.get("/v1/kv/missing").reply(404);

      const [res, data] = await this.consul.kv.get({
        key: "key1",
        raw: true,
        ctx,
      });
      should(res.statusCode).equal(200);
      should(data).eql(Buffer.from("value1"));
      const [missingRes, missingData] = await this.consul.kv.get({
        key: "missing",
        ctx,
      });
      should(missingRes.statusCode).equal(404);
      should(missingData).be.undefined();
      should(ctx.listenerCount("cancel")).equal(0);
    });

    it("should empty response", async function () {
      this.nock.get("/v1/kv/?recurse=true").reply(200, []);

      const data = await this.consul.kv.get({ recurse: true });
      should.not.exist(data);
    });

    it("should handle errors", async function () {
      this.nock.get("/v1/kv/key1").reply(500);

      try {
        await this.consul.kv.get("key1");
        should.ok(false);
      } catch (err) {
        should(err).have.property(
          "message",
          "consul: kv.get: internal server error",
        );
      }
    });

    it("should forward common query options", async function () {
      const scope = this.nock
        .get("/v1/kv/key1")
        .query({
          partition: "default",
          index: "10",
          wait: "5s",
          consistent: "1",
        })
        .reply(200, [{ Value: "dmFsdWUx" }]);

      const result = await this.consul.kv.get({
        key: "key1",
        partition: "default",
        index: "10",
        wait: "5s",
        consistent: true,
      });
      should(result.Value).equal("value1");
      scope.done();
    });

    it("should remove context listeners after timeout", async function () {
      const ctx = new EventEmitter();
      const client = this.consul;
      this.nock.get("/v1/kv/key1").delay(100).reply(200, []);

      try {
        await client.kv.get({ key: "key1", timeout: "10ms", ctx });
        should.ok(false);
      } catch (err) {
        should(err.isTimeout).equal(true);
        should(ctx.listenerCount("cancel")).equal(0);
      } finally {
        client.destroy();
      }
    });

    it("should remove context listeners after cancellation", async function () {
      const ctx = new EventEmitter();
      const client = this.consul;
      this.nock.get("/v1/kv/key1").delay(100).reply(200, []);
      const pending = client.kv.get({ key: "key1", ctx });
      ctx.emit("cancel");

      try {
        await pending;
        should.ok(false);
      } catch (err) {
        should(err.isAbort).equal(true);
        should(ctx.listenerCount("cancel")).equal(0);
      } finally {
        client.destroy();
      }
    });

    it("should remove context listeners after network errors", async function () {
      const ctx = new EventEmitter();
      const client = this.consul;
      const error = new Error("connection reset");
      error.code = "ECONNRESET";
      this.nock.get("/v1/kv/key1").replyWithError(error);

      try {
        await client.kv.get({ key: "key1", ctx });
        should.ok(false);
      } catch (err) {
        should(err.code).equal("ECONNRESET");
        should(ctx.listenerCount("cancel")).equal(0);
      } finally {
        client.destroy();
      }
    });
  });

  describe("keys", function () {
    it("should work", async function () {
      this.nock.get("/v1/kv/key1?keys=true&separator=%3A").reply(200, ["test"]);

      const data = await this.consul.kv.keys({ key: "key1", separator: ":" });
      should(data).eql(["test"]);
    });

    it("should work string argument", async function () {
      this.nock.get("/v1/kv/key1?keys=true").reply(200, ["test"]);

      const data = await this.consul.kv.keys("key1");
      should(data).eql(["test"]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/kv/?keys=true").reply(200, ["test"]);

      const data = await this.consul.kv.keys();
      should(data).eql(["test"]);
    });
  });

  describe("set", function () {
    it("should preserve a failed CAS result", async function () {
      const scope = this.nock
        .put("/v1/kv/key1?cas=1", "value1")
        .reply(200, false);

      const result = await this.consul.kv.set({
        key: "key1",
        value: "value1",
        cas: 1,
      });
      should(result).equal(false);
      scope.done();
    });

    it("should not mutate positional options", async function () {
      const opts = Object.freeze({ cas: 1 });
      this.nock.put("/v1/kv/key1?cas=1", "value1").reply(200, true);

      should(await this.consul.kv.set("key1", "value1", opts)).equal(true);
      should(opts).eql({ cas: 1 });
    });

    it("should work", async function () {
      this.nock
        .put("/v1/kv/key1?cas=1&flags=2&acquire=session", "value1")
        .reply(200, { ok: true });

      const data = await this.consul.kv.set({
        key: "key1",
        value: "value1",
        cas: 1,
        flags: 2,
        acquire: "session",
      });
      should(data).eql({ ok: true });
    });

    it("should work with 4 arguments", async function () {
      this.nock.put("/v1/kv/key1?release=session", "").reply(200, { ok: true });

      const opts = { release: "session" };
      const data = await this.consul.kv.set("key1", null, opts);
      should(data).eql({ ok: true });
    });

    it("should work with 3 arguments", async function () {
      this.nock.put("/v1/kv/key1", "value1").reply(200, { ok: true });

      const data = await this.consul.kv.set("key1", "value1");
      should(data).eql({ ok: true });
    });

    it("should require key", async function () {
      try {
        await this.consul.kv.set({});
        should.ok(false);
      } catch (err) {
        should(err).have.property("message", "consul: kv.set: key required");
      }
    });

    it("should require value", async function () {
      try {
        await this.consul.kv.set({ key: "key1" });
        should.ok(false);
      } catch (err) {
        should(err).have.property("message", "consul: kv.set: value required");
      }
    });
  });

  describe("del", function () {
    it("should preserve a failed CAS result", async function () {
      this.nock.delete("/v1/kv/key1?cas=1").reply(200, false);

      should(await this.consul.kv.del({ key: "key1", cas: 1 })).equal(false);
    });

    it("should work", async function () {
      this.nock.delete("/v1/kv/key1?cas=1").reply(200, true);

      const result = await this.consul.kv.del({ key: "key1", cas: 1 });
      should(result).equal(true);
    });

    it("should work using delete alias", async function () {
      this.nock.delete("/v1/kv/key1?cas=1").reply(200, true);

      const result = await this.consul.kv.delete({ key: "key1", cas: 1 });
      should(result).equal(true);
    });

    it("should work with string", async function () {
      this.nock.delete("/v1/kv/key1").reply(200);

      await this.consul.kv.del("key1");
    });

    it("should work support recurse", async function () {
      this.nock.delete("/v1/kv/?recurse=true").reply(200);

      await this.consul.kv.del({ recurse: true });
    });
  });
});
