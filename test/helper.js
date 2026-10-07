import nock from "nock";
import sinon from "sinon";

import Consul from "../lib/index.js";

function setup(scope) {
  if (scope._setup) return;
  scope._setup = true;

  beforeEach.call(scope, function () {
    this.sinon = sinon.createSandbox();

    nock.disableNetConnect();

    Object.defineProperty(this, "consul", {
      configurable: true,
      enumerable: true,
      get: function () {
        return new Consul();
      },
    });

    Object.defineProperty(this, "nock", {
      configurable: true,
      enumerable: true,
      get: function () {
        return nock("http://127.0.0.1:8500");
      },
    });
  });

  afterEach.call(scope, function () {
    this.sinon.restore();

    nock.cleanAll();
  });
}

export const consul = (opts) => new Consul(opts);
export { setup };
