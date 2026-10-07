import { once } from "node:events";
import assert from "node:assert/strict";

import * as helper from "./helper.js";

helper.describe("Watch", function () {
  before(async function () {
    await helper.before(this);
  });

  after(async function () {
    await helper.after(this);
  });

  beforeEach(async function () {
    await this.c1.kv.del({ recurse: true });
  });

  it("should work", async function () {
    const key = "test";
    const changes = [];
    const updateTimes = [];
    const errors = [];

    const watch = this.c1.watch({
      method: this.c1.kv.get,
      options: { key: key, wait: "1ms" },
    });

    watch.on("change", (data) => {
      updateTimes.push(watch.updateTime());
      changes.push(data);
    });

    watch.on("error", (err) => {
      errors.push(err);
    });

    try {
      await once(watch, "change", { signal: AbortSignal.timeout(5000) });
      for (const value of ["1", "2", "3"]) {
        await Promise.all([
          once(watch, "change", { signal: AbortSignal.timeout(5000) }),
          this.c1.kv.set(key, value),
        ]);
      }
      await Promise.all([
        once(watch, "change", { signal: AbortSignal.timeout(5000) }),
        this.c1.kv.del(key),
      ]);

      const values = changes.map((data) => data && data.Value);
      assert.deepEqual(values, [undefined, "1", "2", "3", undefined]);
      assert.equal(errors.length, 0);
      assert.equal(watch.isRunning(), true);

      watch.end();
      assert.equal(watch.isRunning(), false);
      watch._run();
      assert.equal(watch.isRunning(), false);
      assert.ok(updateTimes.length > 0);
      updateTimes.forEach(function (updateTime, index) {
        if (index === 0) return;
        assert.ok(updateTime >= updateTimes[index - 1]);
      });
    } finally {
      watch.end();
    }
  });

  it("should not retry on 400 errors", async function () {
    const watch = this.c1.watch({ method: this.c1.kv.get });
    try {
      const [error] = await once(watch, "error", {
        signal: AbortSignal.timeout(5000),
      });
      assert.deepEqual(error.statusCode, 400);
      assert.deepEqual(watch._attempts, 0);
      assert.deepEqual(watch._end, true);
    } finally {
      watch.end();
    }
  });

  it("should exponential retry", async function () {
    const todo = ["one", "two", "three"];

    const method = async function () {
      throw new Error(todo.shift());
    };

    const time = Date.now();

    const watch = this.c1.watch({ method: method });

    try {
      const times = [];
      for (const message of ["one", "two", "three"]) {
        const [error] = await once(watch, "error", {
          signal: AbortSignal.timeout(5000),
        });
        assert.equal(error.message, message);
        times.push(Date.now());
      }
      assert.ok(Math.abs(times[0] - time) <= 100);
      assert.ok(Math.abs(times[1] - times[0] - 200) <= 100);
      assert.ok(Math.abs(times[2] - times[1] - 400) <= 100);
    } finally {
      watch.end();
    }
  });
});
