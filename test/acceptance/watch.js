import { once } from "node:events";
import should from "should";

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
      should(values).eql([undefined, "1", "2", "3", undefined]);
      should(errors).be.empty();
      should(watch.isRunning()).be.true();

      watch.end();
      should(watch.isRunning()).be.false();
      watch._run();
      should(watch.isRunning()).be.false();
      should(updateTimes).not.be.empty();
      updateTimes.forEach(function (updateTime, index) {
        if (index === 0) return;
        should(updateTime).have.above(updateTimes[index - 1]);
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
      should(error).have.property("statusCode", 400);
      should(watch).have.property("_attempts", 0);
      should(watch).have.property("_end", true);
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
        should(error.message).equal(message);
        times.push(Date.now());
      }
      should(times[0] - time).be.approximately(0, 100);
      should(times[1] - times[0]).be.approximately(200, 100);
      should(times[2] - times[1]).be.approximately(400, 100);
    } finally {
      watch.end();
    }
  });
});
