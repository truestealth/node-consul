import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EventEmitter, getEventListeners } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

import Consul from "../../lib/index.js";
import * as helper from "./helper.js";

helper.describe("Secure Consul HTTP API", function () {
  before(async function () {
    await helper.before(this, { secure: true, nodeCount: 1 });
    this.key = "consul-smoke-secure-" + randomUUID();
    this.clients = [];
  });

  after(async function () {
    for (const client of this.clients || []) client.destroy();
    await helper.after(this);
  });

  function client(test, options) {
    const instance = new Consul({ timeout: 1000, ...options });
    test.clients.push(instance);
    return instance;
  }

  it("requires a trusted CA and a client certificate", async function () {
    const options = this.cluster.clientOptions;
    const untrusted = client(this, {
      ...options,
      ca: undefined,
    });
    await assert.rejects(untrusted.status.leader(), (error) => {
      assert.ok(
        ["DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN"].includes(
          error.code,
        ),
      );
      return true;
    });
    const missingCertificate = client(this, {
      ...options,
      cert: undefined,
      key: undefined,
    });
    await assert.rejects(missingCertificate.status.leader());
    assert.ok(await this.c1.status.leader());
  });

  it("enforces ACL tokens independently from TLS client authentication", async function () {
    assert.equal(await this.c1.kv.set(this.key, "example-value"), true);
    const anonymous = client(this, {
      ...this.cluster.clientOptions,
      defaults: {},
    });
    await assert.rejects(anonymous.kv.set(this.key, "unauthorized-value"), {
      statusCode: 403,
    });
    assert.equal((await this.c1.kv.get(this.key)).Value, "example-value");
    assert.equal(await this.c1.kv.del(this.key), true);
  });

  it("enforces deadlines and aborts blocking HTTPS queries", async function () {
    assert.equal(await this.c1.kv.set(this.key, "blocking-value"), true);
    const current = await this.c1.kv.get(this.key);
    const options = { key: this.key, index: current.ModifyIndex, wait: "5s" };
    await assert.rejects(this.c1.kv.get({ ...options, timeout: 80 }), {
      code: "ETIMEDOUT",
    });
    const controller = new AbortController();
    const ctx = new EventEmitter();
    const pending = this.c1.kv.get({
      ...options,
      timeout: 1000,
      signal: controller.signal,
      ctx,
    });
    const rejected = assert.rejects(pending, { code: "ABORT_ERR" });
    await delay(30);
    controller.abort();
    await rejected;
    assert.equal(ctx.listenerCount("cancel"), 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    assert.equal(this.c1._requests.size, 0);
    assert.equal(await this.c1.kv.del(this.key), true);
  });
});
