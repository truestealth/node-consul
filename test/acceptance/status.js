import assert from "node:assert/strict";

import * as helper from "./helper.js";

helper.describe("Status", function () {
  before(async function () {
    await helper.before(this);
  });

  after(async function () {
    await helper.after(this);
  });

  describe("leader", function () {
    it("should return leader", async function () {
      const data = await this.c1.status.leader();
      assert.deepEqual(data, "127.0.0.1:8300");
    });
  });

  describe("peers", function () {
    it("should return peers", async function () {
      const data = await this.c1.status.peers();
      assert.deepEqual(data, ["127.0.0.1:8300"]);
    });
  });
});
