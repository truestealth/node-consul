import assert from "node:assert/strict";

import * as helper from "./helper.js";

describe("Health", function () {
  helper.setup(this);

  describe("node", function () {
    it("should work", async function () {
      this.nock.get("/v1/health/node/node1").reply(200, { ok: true });

      const data = await this.consul.health.node({ node: "node1" });
      assert.deepEqual(data, { ok: true });
    });

    it("should work with one argument", async function () {
      this.nock.get("/v1/health/node/node1").reply(200, { ok: true });

      const data = await this.consul.health.node("node1");
      assert.deepEqual(data, { ok: true });
    });

    it("should require node", async function () {
      try {
        await this.consul.health.node({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(err.message, "consul: health.node: node required");
      }
    });
  });

  describe("checks", function () {
    it("should work", async function () {
      this.nock.get("/v1/health/checks/service1").reply(200, { ok: true });

      const data = await this.consul.health.checks({ service: "service1" });
      assert.deepEqual(data, { ok: true });
    });

    it("should work with one argument", async function () {
      this.nock.get("/v1/health/checks/service1").reply(200, { ok: true });

      const data = await this.consul.health.checks("service1");
      assert.deepEqual(data, { ok: true });
    });

    it("should require service", async function () {
      try {
        await this.consul.health.checks({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: health.checks: service required",
        );
      }
    });
  });

  describe("service", function () {
    it("should work", async function () {
      this.nock
        .get("/v1/health/service/service1?tag=tag1&passing=true")
        .reply(200, { ok: true });

      const data = await this.consul.health.service({
        service: "service1",
        tag: "tag1",
        passing: "true",
      });
      assert.deepEqual(data, { ok: true });
    });

    it("should work with one argument", async function () {
      this.nock.get("/v1/health/service/service1").reply(200, { ok: true });

      const data = await this.consul.health.service("service1");
      assert.deepEqual(data, { ok: true });
    });

    it("should require service", async function () {
      try {
        await this.consul.health.service({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: health.service: service required",
        );
      }
    });
  });

  describe("state", function () {
    it("should work", async function () {
      this.nock.get("/v1/health/state/any").reply(200, { ok: true });

      const data = await this.consul.health.state({ state: "any" });
      assert.deepEqual(data, { ok: true });
    });

    it("should work with one argument", async function () {
      this.nock.get("/v1/health/state/warning").reply(200, { ok: true });

      const data = await this.consul.health.state("warning");
      assert.deepEqual(data, { ok: true });
    });

    it("should require state", async function () {
      try {
        await this.consul.health.state({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(err.message, "consul: health.state: state required");
      }
    });

    it("should require valid state", async function () {
      try {
        await this.consul.health.state("foo");
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: health.state: state invalid: foo",
        );
      }
    });
  });
});
