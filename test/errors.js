import assert from "node:assert/strict";

import * as errors from "../lib/errors.js";

import * as helper from "./helper.js";

describe("errors", function () {
  helper.setup(this);

  describe("Consul", function () {
    it("should work", function () {
      const msg = "test message";

      let err = errors.Consul(msg);
      assert.deepEqual(err.isConsul, true);
      assert.deepEqual(err.message, msg);

      const test = new Error(msg);
      test.isTest = true;

      err = errors.Consul(test);
      assert.deepEqual(err.message, msg);
      assert.deepEqual(err.isConsul, true);
      assert.deepEqual(err.isTest, true);

      err = errors.Consul(null);
      assert.ok(!("message" in err) || err.message !== undefined);
      assert.deepEqual(err.isConsul, true);

      err = errors.Consul("");
      assert.ok(!("message" in err) || err.message !== undefined);
      assert.deepEqual(err.isConsul, true);
    });
  });

  describe("Validation", function () {
    it("should work", function () {
      const msg = "test";
      const err = errors.Validation(msg);

      assert.deepEqual(err.isConsul, true);
      assert.deepEqual(err.isValidation, true);
      assert.deepEqual(err.message, msg);

      assert.ok(!("message" in errors.Validation));
    });
  });
});
