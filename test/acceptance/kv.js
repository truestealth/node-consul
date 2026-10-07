import assert from "node:assert/strict";

import * as helper from "./helper.js";

helper.describe("Kv", function () {
  before(async function () {
    await helper.before(this);
  });

  after(async function () {
    await helper.after(this);
  });

  beforeEach(async function () {
    this.key = "hello";
    this.value = "world";

    await this.c1.kv.del({ recurse: true });

    const ok = await this.c1.kv.set(this.key, this.value);
    if (!ok) throw new Error("not setup");
  });

  describe("get", function () {
    it("should return one kv pair", async function () {
      const data = await this.c1.kv.get(this.key);

      assert.ok(
        [
          "CreateIndex",
          "ModifyIndex",
          "LockIndex",
          "Key",
          "Flags",
          "Value",
        ].every((key) => Object.hasOwn(data, key)),
      );
      assert.deepEqual(data.Key, this.key);
      assert.deepEqual(data.Flags, 0);
      assert.deepEqual(data.Value, this.value);
    });

    it("should return raw value", async function () {
      const data = await this.c1.kv.get({ key: this.key, raw: true });
      assert.deepEqual(Buffer.from(this.value), data);
    });

    it("should return no kv pair", async function () {
      const data = await this.c1.kv.get("none");
      assert.ok(data == null);
    });

    it("should return list of kv pairs", async function () {
      const data = await this.c1.kv.get({ recurse: true });
      assert.ok(data instanceof Array);
      assert.deepEqual(data.length, 1);

      const item = data[0];
      assert.ok(
        [
          "CreateIndex",
          "ModifyIndex",
          "LockIndex",
          "Key",
          "Flags",
          "Value",
        ].every((key) => Object.hasOwn(item, key)),
      );
      assert.deepEqual(item.Key, this.key);
      assert.deepEqual(item.Flags, 0);
      assert.deepEqual(item.Value, this.value);
    });

    it("should wait for update", async function () {
      const update = "new-value";

      const get = await this.c1.kv.get(this.key);

      const waitingGet = this.c1.kv.get({
        key: this.key,
        index: get.ModifyIndex,
        wait: "3s",
      });

      await this.c1.kv.set(this.key, update);

      const data = await waitingGet;
      assert.deepEqual(data.Value, update);
    });
  });

  describe("keys", function () {
    beforeEach(async function () {
      this.keys = ["a/x/1", "a/y/2", "a/z/3"];

      await Promise.all(this.keys.map((key) => this.c1.kv.set(key, "value")));
    });

    it("should return keys", async function () {
      const data = await this.c1.kv.keys("a");
      assert.ok(data instanceof Array);

      assert.equal(data.length, 3);

      assert.deepEqual(
        data,
        this.keys.filter((key) => {
          return key.match(/^a/);
        }),
      );
    });

    it("should return keys with separator", async function () {
      const data = await this.c1.kv.keys({
        key: "a/",
        separator: "/",
      });
      assert.ok(data instanceof Array);

      assert.equal(data.length, 3);

      assert.deepEqual(
        data,
        this.keys
          .filter((key) => {
            return key.match(/^a\//);
          })
          .map(function (v) {
            return v.slice(0, 4);
          }),
      );
    });

    it("should return all keys", async function () {
      const data = await this.c1.kv.keys();
      assert.ok(data instanceof Array);

      assert.equal(data.length, 4);
    });
  });

  describe("set", function () {
    it("should create kv pair", async function () {
      const c = this.c1;
      const key = "one";
      const value = "two";

      const ok = await c.kv.set(key, value);
      assert.equal(ok, true);

      const data = await c.kv.get(key);
      assert.ok(
        [
          "CreateIndex",
          "ModifyIndex",
          "LockIndex",
          "Key",
          "Flags",
          "Value",
        ].every((key) => Object.hasOwn(data, key)),
      );
      assert.deepEqual(data.Value, value);
    });

    it("should create kv pair with null value", async function () {
      const c = this.c1;
      const key = "one";
      const value = null;

      const ok = await c.kv.set(key, value);
      assert.equal(ok, true);

      const data = await c.kv.get(key);
      assert.ok(
        [
          "CreateIndex",
          "ModifyIndex",
          "LockIndex",
          "Key",
          "Flags",
          "Value",
        ].every((key) => Object.hasOwn(data, key)),
      );
      assert.equal(data.Value, null);
    });
  });

  describe("del", function () {
    it("should delete kv pair", async function () {
      const del = await this.c1.kv.del(this.key);
      assert.equal(del, true);

      const data = await this.c1.kv.get(this.key);
      assert.ok(data == null);
    });
  });
});
