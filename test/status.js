import assert from "node:assert/strict";

import * as helper from "./helper.js";

describe("Status", function () {
  helper.setup(this);

  describe("leader", function () {
    it("should work", async function () {
      this.nock.get("/v1/status/leader").reply(200, { ok: true });

      const data = await this.consul.status.leader({});
      assert.deepEqual(data, { ok: true });
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/status/leader").reply(200, { ok: true });

      const data = await this.consul.status.leader();
      assert.deepEqual(data, { ok: true });
    });
  });

  describe("peers", function () {
    it("should work", async function () {
      this.nock.get("/v1/status/peers").reply(200, [{ ok: true }]);

      const data = await this.consul.status.peers({});
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/status/peers").reply(200, [{ ok: true }]);

      const data = await this.consul.status.peers();
      assert.deepEqual(data, [{ ok: true }]);
    });
  });
});
