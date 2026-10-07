import should from "should";

import * as errors from "../lib/errors.js";

import * as helper from "./helper.js";

describe("errors", function () {
  helper.setup(this);

  describe("Consul", function () {
    it("should work", function () {
      const msg = "test message";

      let err = errors.Consul(msg);
      should(err).have.property("isConsul", true);
      should(err).have.property("message", msg);

      const test = new Error(msg);
      test.isTest = true;

      err = errors.Consul(test);
      should(err).have.property("message", msg);
      should(err).have.property("isConsul", true);
      should(err).have.property("isTest", true);

      err = errors.Consul(null);
      should(err).not.have.property("message", undefined);
      should(err).have.property("isConsul", true);

      err = errors.Consul("");
      should(err).not.have.property("message", undefined);
      should(err).have.property("isConsul", true);
    });
  });

  describe("Validation", function () {
    it("should work", function () {
      const msg = "test";
      const err = errors.Validation(msg);

      should(err).have.property("isConsul", true);
      should(err).have.property("isValidation", true);
      should(err).have.property("message", msg);

      should(errors.Validation).not.have.property("message");
    });
  });
});
