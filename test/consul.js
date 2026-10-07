import http from "node:http";
import { execFileSync } from "node:child_process";

import assert from "node:assert/strict";
import nock from "nock";

import consul, { Consul } from "../lib/index.js";

import * as helper from "./helper.js";

describe("Consul", function () {
  helper.setup(this);

  it("should expose the same default and named constructor", function () {
    assert.equal(consul, Consul);
  });

  it("should allow a process to exit after import", function () {
    this.timeout(10000);
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import " +
          JSON.stringify(new URL("../lib/index.js", import.meta.url).href),
      ],
      { timeout: 5000 },
    );
  });

  it("should work", function () {
    assert.ok(!("_defaults" in helper.consul()));

    assert.ok(!("_defaults" in helper.consul({ defaults: { foo: "bar" } })));

    assert.deepEqual(helper.consul({ defaults: { token: "123" } })._defaults, {
      token: "123",
    });

    assert.deepEqual(
      helper.consul({
        defaults: { token: "123", dc: "test", foo: "bar" },
      })._defaults,
      {
        token: "123",
        dc: "test",
      },
    );

    assert.deepEqual(helper.consul()._opts.baseUrl, {
      protocol: "http:",
      port: "8500",
      hostname: "127.0.0.1",
      path: "/v1",
    });

    assert.deepEqual(
      helper.consul({
        host: "127.0.0.2",
        port: "8501",
        secure: true,
      })._opts.baseUrl,
      {
        protocol: "https:",
        port: "8501",
        hostname: "127.0.0.2",
        path: "/v1",
      },
    );

    assert.deepEqual(
      helper.consul({
        baseUrl: "https://user:pass@example.org:8502/proxy/v1",
      })._opts.baseUrl,
      {
        protocol: "https:",
        auth: "user:pass",
        port: "8502",
        hostname: "example.org",
        path: "/proxy/v1",
      },
    );

    assert.throws(() => {
      helper.consul({ baseUrl: {} });
    }, /baseUrl must be a string.*/);

    const agent = new http.Agent();
    assert.equal(
      helper.consul({
        agent,
      })._opts.agent,
      agent,
    );
  });

  it("should not mutate options", function () {
    const opts = { test: "opts" };
    const client = helper.consul(opts);

    assert.notEqual(client._opts, opts);
    assert.partialDeepStrictEqual(client._opts, { test: "opts" });
    client._opts.test = "fail";

    assert.deepEqual(opts, { test: "opts" });
  });

  describe("destroy", function () {
    it("should close a keep-alive socket", async function () {
      nock.enableNetConnect("127.0.0.1");
      const server = http.createServer((request, response) => {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify("127.0.0.1:8300"));
      });
      const socketClosed = new Promise((resolve) => {
        server.once("connection", (socket) => socket.once("close", resolve));
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const client = helper.consul({
        port: server.address().port,
        timeout: 1000,
      });

      try {
        assert.equal(await client.status.leader(), "127.0.0.1:8300");
        client.destroy();
        await socketClosed;
      } finally {
        client.destroy();
        await new Promise((resolve) => server.close(resolve));
        nock.disableNetConnect();
      }
    });

    it("should work", function () {
      const client = helper.consul();
      assert.notEqual(client._opts.agent, null);

      client.destroy();
      delete client._opts.agent.destroy;
      client.destroy();
      delete client._opts.agent;
      client.destroy();
    });
  });

  describe("parseQueryMeta", function () {
    it("should work", function () {
      assert.deepEqual(consul.parseQueryMeta(), {});
      assert.deepEqual(consul.parseQueryMeta({}), {});
      assert.deepEqual(consul.parseQueryMeta({ headers: {} }), {});
      assert.deepEqual(
        consul.parseQueryMeta({
          headers: {
            "x-consul-index": "5",
            "x-consul-lastcontact": "100",
            "x-consul-knownleader": "true",
            "x-consul-translate-addresses": "true",
          },
        }),
        {
          LastIndex: "5",
          LastContact: 100,
          KnownLeader: true,
          AddressTranslationEnabled: true,
        },
      );
    });
  });
});
