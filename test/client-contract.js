import assert from "node:assert/strict";
import nock from "nock";

import Consul from "../lib/index.js";
import * as helper from "./helper.js";

describe("Application client contracts", function () {
  helper.setup(this);

  beforeEach(function () {
    this.client = new Consul();
  });

  afterEach(function () {
    this.client.destroy();
  });

  it("preserves decoded settings reads, missing keys and prefix discovery", async function () {
    const scope = nock("http://127.0.0.1:8500")
      .get("/v1/kv/consul-smoke%2Fsettings")
      .reply(200, [{ Key: "consul-smoke/settings", Value: "aGVsbG8=" }])
      .get("/v1/kv/consul-smoke%2Fmissing")
      .reply(404)
      .get("/v1/kv/consul-smoke")
      .query({ keys: true })
      .reply(200, ["consul-smoke/settings"]);

    const item = await this.client.kv.get({
      key: "consul-smoke/settings",
      timeout: 10000,
    });
    assert.equal(item.Value, "hello");
    assert.equal(await this.client.kv.get("consul-smoke/missing"), undefined);
    assert.deepEqual(await this.client.kv.keys("consul-smoke"), [
      "consul-smoke/settings",
    ]);
    scope.done();
  });

  it("preserves TTL registration, heartbeat and maintenance lifecycle", async function () {
    const scope = nock("http://127.0.0.1:8500")
      .put("/v1/agent/service/register", {
        Name: "consul-smoke-service",
        ID: "consul-smoke-instance",
        Address: "127.0.0.1",
        Port: 8080,
        Check: { TTL: "30s", DeregisterCriticalServiceAfter: "1m" },
      })
      .reply(200)
      .put("/v1/agent/check/pass/service%3Aconsul-smoke-instance")
      .reply(200)
      .put("/v1/agent/service/maintenance/consul-smoke-instance")
      .query({ enable: true, reason: "scheduled maintenance" })
      .reply(200)
      .put("/v1/agent/service/deregister/consul-smoke-instance")
      .reply(200);

    assert.equal(
      await this.client.agent.service.register({
        name: "consul-smoke-service",
        id: "consul-smoke-instance",
        address: "127.0.0.1",
        port: 8080,
        check: { ttl: "30s", deregistercriticalserviceafter: "1m" },
      }),
      undefined,
    );
    assert.equal(
      await this.client.agent.check.pass({
        id: "service:consul-smoke-instance",
      }),
      undefined,
    );
    assert.equal(
      await this.client.agent.service.maintenance({
        id: "consul-smoke-instance",
        enable: true,
        reason: "scheduled maintenance",
      }),
      undefined,
    );
    assert.equal(
      await this.client.agent.service.deregister("consul-smoke-instance"),
      undefined,
    );
    scope.done();
  });

  it("preserves health and catalog discovery fields and does not retry writes", async function () {
    const scope = nock("http://127.0.0.1:8500")
      .get("/v1/health/service/consul-smoke-service")
      .query({ dc: "dc1", passing: true })
      .reply(200, [
        { Service: { Address: "127.0.0.1", Port: 8080 }, Checks: [] },
      ])
      .get("/v1/catalog/service/consul-smoke-service")
      .reply(200, [{ ServiceAddress: "127.0.0.1", ServicePort: 8080 }])
      .put("/v1/agent/check/pass/service%3Aconsul-smoke-instance")
      .reply(429);

    const health = await this.client.health.service({
      dc: "dc1",
      service: "consul-smoke-service",
      passing: true,
    });
    assert.deepEqual(health[0].Service, { Address: "127.0.0.1", Port: 8080 });
    const catalog = await this.client.catalog.service.nodes({
      service: "consul-smoke-service",
      timeout: 10000,
    });
    assert.equal(catalog[0].ServiceAddress, "127.0.0.1");
    assert.equal(catalog[0].ServicePort, 8080);
    await assert.rejects(
      this.client.agent.check.pass({ id: "service:consul-smoke-instance" }),
      (error) => error.statusCode === 429,
    );
    scope.done();
  });
});
