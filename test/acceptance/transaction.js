import assert from "node:assert/strict";

import * as helper from "./helper.js";

helper.describe("Transaction", function () {
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

  describe("create", function () {
    it("should create two kv pairs", async function () {
      const key1 = "key1";
      const value1 = "value1";
      const key2 = "key2";
      const value2 = "value2";

      const response = await this.c1.transaction.create([
        {
          KV: {
            Verb: "set",
            Key: key1,
            Value: Buffer.from(value1).toString("base64"),
          },
        },
        {
          KV: {
            Verb: "set",
            Key: key2,
            Value: Buffer.from(value2).toString("base64"),
          },
        },
      ]);

      assert.ok("Results" in response);
      assert.ok(Array.isArray(response.Results));

      const results = response.Results;
      assert.equal(results.length, 2);
      assert.ok("KV" in results[0]);
      assert.ok("KV" in results[1]);
      assert.ok(
        ["CreateIndex", "ModifyIndex", "LockIndex", "Key", "Flags"].every(
          (key) => Object.hasOwn(results[0].KV, key),
        ),
      );
      assert.ok(
        ["CreateIndex", "ModifyIndex", "LockIndex", "Key", "Flags"].every(
          (key) => Object.hasOwn(results[1].KV, key),
        ),
      );

      const data1 = await this.c1.kv.get(key1);
      assert.ok("Value" in data1);
      assert.deepEqual(data1.Value, value1);

      const data2 = await this.c1.kv.get(key2);
      assert.ok("Value" in data2);
      assert.deepEqual(data2.Value, value2);
    });
  });
});
