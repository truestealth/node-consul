import assert from "node:assert/strict";

import * as helper from "./helper.js";

helper.describe("Session", function () {
  before(async function () {
    await helper.before(this);
  });

  after(async function () {
    await helper.after(this);
  });

  beforeEach(async function () {
    const session = await this.c1.session.create();
    this.id = session.ID;
  });

  afterEach(async function () {
    try {
      await this.c1.session.destroy(this.id);
    } catch (err) {
      // ignore
    }
  });

  describe("create", function () {
    it("should create session", async function () {
      const session = await this.c1.session.create();
      assert.ok(Object.hasOwn(session, "ID"));
    });
  });

  describe("destroy", function () {
    it("should destroy session", async function () {
      await this.c1.session.destroy(this.id);

      const session = await this.c1.session.get(this.id);
      assert.ok(session == null);
    });
  });

  describe("get", function () {
    it("should return session information", async function () {
      const session = await this.c1.session.get(this.id);

      assert.ok(
        [
          "CreateIndex",
          "ID",
          "Name",
          "Node",
          "NodeChecks",
          "LockDelay",
          "Behavior",
          "TTL",
        ].every((key) => key in session),
      );
    });
  });

  describe("node", function () {
    it("should return sessions for node", async function () {
      const sessions = await this.c1.session.node("node1");

      assert.ok(sessions instanceof Array);
      assert.ok(sessions.length > 0);

      for (const session of sessions) {
        assert.ok(
          [
            "CreateIndex",
            "ID",
            "Name",
            "Node",
            "NodeChecks",
            "LockDelay",
            "Behavior",
            "TTL",
          ].every((key) => key in session),
        );
      }
    });

    it("should return an empty list when no node found", async function () {
      const sessions = await this.c1.session.node("node");

      assert.ok(sessions instanceof Array);
      assert.deepEqual(sessions.length, 0);
    });
  });

  describe("list", function () {
    it("should return all sessions", async function () {
      const sessions = await this.c1.session.list();

      assert.ok(sessions instanceof Array);
      assert.ok(sessions.length > 0);

      for (const session of sessions) {
        assert.ok(
          [
            "CreateIndex",
            "ID",
            "Name",
            "Node",
            "NodeChecks",
            "LockDelay",
            "Behavior",
            "TTL",
          ].every((key) => key in session),
        );
      }
    });
  });

  describe("renew", function () {
    it("should renew session", async function () {
      const renew = await this.c1.session.renew(this.id);

      assert.ok(Array.isArray(renew));

      assert.ok(renew.length > 0);

      assert.ok(
        [
          "CreateIndex",
          "ID",
          "Name",
          "Node",
          "NodeChecks",
          "LockDelay",
          "Behavior",
          "TTL",
        ].every((key) => key in renew[0]),
      );
    });
  });
});
