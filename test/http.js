import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EventEmitter, getEventListeners, once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  setImmediate as nextTurn,
  setTimeout as delay,
} from "node:timers/promises";

import nock from "nock";

import Consul from "../lib/index.js";
import * as utils from "../lib/utils.js";

describe("Native HTTP transport", function () {
  const clients = [];
  const servers = [];
  const agents = [];
  const directories = [];

  function client(options) {
    const instance = new Consul(options);
    clients.push(instance);
    return instance;
  }

  async function listen(handler, options) {
    const server = options
      ? https.createServer(options, handler)
      : http.createServer(handler);
    servers.push(server);
    server.on("tlsClientError", () => {});
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return server;
  }

  function json(response, body, statusCode = 200) {
    response.writeHead(statusCode, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  }

  function createClient(server, options) {
    return client({ port: server.address().port, timeout: 1000, ...options });
  }

  function observedAgent(observe) {
    const agent = new http.Agent({ keepAlive: true });
    agents.push(agent);
    const addRequest = agent.addRequest.bind(agent);
    agent.addRequest = (request, ...args) => {
      observe(request);
      addRequest(request, ...args);
    };
    return agent;
  }

  beforeEach(function () {
    nock.restore();
    nock.enableNetConnect();
  });

  afterEach(async function () {
    for (const instance of clients.splice(0)) instance.destroy();
    for (const agent of agents.splice(0)) agent.destroy();
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      if (server.listening) {
        await new Promise((resolve) => server.close(resolve));
      }
    }
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
    nock.activate();
    nock.disableNetConnect();
  });

  it("preserves query values, escaped keys, defaults, and ACL headers", async function () {
    let received;
    const server = await listen((request, response) => {
      received = { url: request.url, headers: request.headers };
      json(response, [{ Key: "folder/key with ?&", Value: "aGVsbG8=" }]);
    });
    const instance = createClient(server, {
      headers: { "X-Example": "header-value" },
      defaults: { token: "example-token", dc: "dc-default" },
    });
    const data = await instance.kv.get({
      key: "folder/key with ?&",
      dc: "dc-override",
      ns: "namespace",
      partition: "partition",
      index: 9007199254740993n,
      "node-meta": ["zone:a", "zone:b"],
      filter: `Service == "web"`,
    });
    const url = new URL(received.url, "http://localhost");
    assert.equal(url.pathname, "/v1/kv/folder%2Fkey%20with%20%3F%26");
    assert.deepEqual(url.searchParams.getAll("node-meta"), [
      "zone:a",
      "zone:b",
    ]);
    assert.equal(url.searchParams.get("dc"), "dc-override");
    assert.equal(url.searchParams.get("ns"), "namespace");
    assert.equal(url.searchParams.get("partition"), "partition");
    assert.equal(url.searchParams.get("index"), "9007199254740993");
    assert.equal(url.searchParams.get("filter"), `Service == "web"`);
    assert.equal(received.headers["x-consul-token"], "example-token");
    assert.equal(received.headers["x-example"], "header-value");
    assert.equal(data.Value, "hello");
  });

  it("logs metadata without exposing ACL tokens or KV bodies", async function () {
    const server = await listen((request, response) => {
      json(response, [
        { Value: Buffer.from("private-value").toString("base64") },
      ]);
    });
    const instance = createClient(server, {
      defaults: { token: "private-token" },
    });
    const logs = [];
    instance.on("log", (...args) => logs.push(args));
    await instance.kv.get("example/key");
    assert.ok(logs.length > 0);
    assert.equal(JSON.stringify(logs).includes("private-value"), false);
    assert.equal(JSON.stringify(logs).includes("private-token"), false);
  });

  it("accepts a URL base, preserves its path, and sends basic authentication", async function () {
    let received;
    const server = await listen((request, response) => {
      received = request;
      json(response, "leader");
    });
    const baseUrl = new URL(
      "http://example-user:example-password@127.0.0.1:" +
        server.address().port +
        "/proxy/v1",
    );
    const instance = client({ baseUrl });
    assert.equal(await instance.status.leader(), "leader");
    assert.equal(received.url, "/proxy/v1/status/leader");
    assert.equal(
      received.headers.authorization,
      "Basic " +
        Buffer.from("example-user:example-password").toString("base64"),
    );
  });

  it("supports a root base URL without an extra slash", async function () {
    let path;
    const server = await listen((request, response) => {
      path = request.url;
      json(response, "leader");
    });
    const instance = client({
      baseUrl: "http://127.0.0.1:" + server.address().port,
    });
    await instance.status.leader();
    assert.equal(path, "/status/leader");
  });

  it("rejects unsupported, malformed, and slash-terminated base URLs", function () {
    [{}, "not-a-url", "ftp://localhost/v1", "http://localhost/v1/"].forEach(
      (baseUrl) => {
        assert.throws(() => client({ baseUrl }));
      },
    );
  });

  it("rejects invalid request timeouts and missing path parameters", async function () {
    const instance = client();
    for (const timeout of [-1, NaN, "not-a-duration"]) {
      await assert.rejects(instance.status.leader({ timeout }), {
        isValidation: true,
      });
    }
    await assert.rejects(
      instance._get({ path: "/test/{missing}" }, utils.body),
      /missing param: missing/,
    );
  });

  it("preserves empty raw bytes separately from an absent key", async function () {
    const server = await listen((request, response) => {
      response.writeHead(request.url.includes("missing") ? 404 : 200);
      response.end();
    });
    const instance = createClient(server);
    assert.deepEqual(
      await instance.kv.get({ key: "empty", raw: true }),
      Buffer.alloc(0),
    );
    assert.equal(
      await instance.kv.get({ key: "missing", raw: true }),
      undefined,
    );
  });

  it("decodes JSON media types and retains plain text and binary responses", async function () {
    const responses = [
      [
        "application/problem+json; charset=utf-8",
        JSON.stringify({ ok: true }),
        { ok: true },
      ],
      ["text/plain; charset=utf-8", "leader", "leader"],
      [
        "application/octet-stream",
        Buffer.from([0, 255, 128]),
        Buffer.from([0, 255, 128]),
      ],
      [undefined, "binary", Buffer.from("binary")],
    ];
    for (const [mime, body, expected] of responses) {
      const server = await listen((request, response) => {
        if (mime) response.setHeader("content-type", mime);
        response.end(body);
      });
      const instance = createClient(server);
      assert.deepEqual(await instance.status.leader(), expected);
    }
  });

  it("rejects malformed JSON with response information", async function () {
    const server = await listen((request, response) => {
      response.setHeader("content-type", "application/json");
      response.end("{broken");
    });
    await assert.rejects(createClient(server).status.leader(), (error) => {
      assert.equal(error.isCodec, true);
      assert.equal(error.response.statusCode, 200);
      return true;
    });
  });

  it("preserves response errors, including an unknown status code", async function () {
    const server = await listen((request, response) => {
      response.writeHead(599);
      response.end();
    });
    await assert.rejects(createClient(server).status.leader(), {
      isResponse: true,
      statusCode: 599,
      message: "request failed",
    });
  });

  it("sends binary writes without JSON encoding and preserves false", async function () {
    let received;
    const server = await listen(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      received = { body: Buffer.concat(chunks), headers: request.headers };
      json(response, false);
    });
    const value = Buffer.from([0, 255, 128]);
    assert.equal(
      await createClient(server).kv.set("example/binary", value),
      false,
    );
    assert.deepEqual(received.body, value);
    assert.equal(received.headers["content-length"], "3");
  });

  it("preserves concise plain-text errors but uses status text for long bodies", async function () {
    const server = await listen((request, response) => {
      response.writeHead(403, { "content-type": "text/plain" });
      response.end(
        request.url.includes("long") ? "x".repeat(80) : "permission denied",
      );
    });
    const instance = createClient(server);
    await assert.rejects(instance.status.leader(), {
      message: "permission denied",
      statusCode: 403,
    });
    await assert.rejects(instance._get({ path: "/long" }, utils.body), {
      message: "forbidden",
      statusCode: 403,
    });
  });

  it("prefixes callback errors with or without a request name", async function () {
    const server = await listen((request, response) =>
      json(response, "leader"),
    );
    const instance = createClient(server);
    assert.equal(
      instance._err(new Error("example failure")).message,
      "consul: example failure",
    );
    await assert.rejects(
      instance._get({ path: "/example" }, (request, next) => {
        next(new Error("example failure"));
      }),
      { message: "consul: example failure" },
    );
  });

  it("supports explicit content type and native POST requests", async function () {
    let received;
    const server = await listen(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      received = {
        method: request.method,
        contentType: request.headers["content-type"],
        body: Buffer.concat(chunks).toString(),
      };
      json(response, true);
    });
    const instance = createClient(server, {
      headers: { "Content-Type": "application/custom" },
    });
    assert.equal(
      await instance._post(
        { path: "/example", body: { value: "test" } },
        utils.body,
      ),
      true,
    );
    assert.deepEqual(received, {
      method: "POST",
      contentType: "application/custom",
      body: JSON.stringify({ value: "test" }),
    });
  });

  it("times out before response headers and removes cancellation listeners", async function () {
    const server = await listen(() => {});
    const instance = createClient(server);
    const ctx = new EventEmitter();
    await assert.rejects(instance.status.leader({ timeout: "80ms", ctx }), {
      code: "ETIMEDOUT",
      isTimeout: true,
    });
    assert.equal(ctx.listenerCount("cancel"), 0);
    assert.equal(instance._requests.size, 0);
  });

  it("enforces a total deadline even while the response streams data", async function () {
    let writes = 0;
    const server = await listen((request, response) => {
      response.setHeader("content-type", "text/plain");
      response.write("start");
      const timer = setInterval(() => {
        writes += 1;
        response.write("chunk");
      }, 15);
      response.once("close", () => clearInterval(timer));
    });
    await assert.rejects(createClient(server).status.leader({ timeout: 100 }), {
      code: "ETIMEDOUT",
      isTimeout: true,
    });
    assert.ok(writes > 0);
  });

  it("accepts duration strings for constructor-level deadlines", async function () {
    const server = await listen(() => {});
    const instance = createClient(server, { timeout: "80ms" });
    await assert.rejects(instance.status.leader(), {
      code: "ETIMEDOUT",
      isTimeout: true,
    });
  });

  it("cancels a request as the last response chunk arrives", async function () {
    const server = await listen((request, response) =>
      json(response, "leader"),
    );
    const ctx = new EventEmitter();
    const agent = observedAgent((request) => {
      request.once("response", (response) => {
        response.once("data", () => ctx.emit("cancel"));
      });
    });
    const instance = createClient(server, { agent });
    const pending = instance.status.leader({ ctx });
    const rejected = assert.rejects(pending, { code: "ABORT_ERR" });
    await rejected;
    await nextTurn();
    assert.equal(ctx.listenerCount("cancel"), 0);
    assert.equal(instance._requests.size, 0);
  });

  it("rejects an already aborted signal without sending a request", async function () {
    let requests = 0;
    const server = await listen((request, response) => {
      requests += 1;
      json(response, "leader");
    });
    const controller = new AbortController();
    controller.abort();
    const instance = createClient(server);
    await assert.rejects(
      instance.status.leader({ signal: controller.signal }),
      { code: "ABORT_ERR" },
    );
    await nextTurn();
    assert.equal(requests, 0);
    assert.equal(instance._requests.size, 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  });

  it("accepts an AbortSignal cancellation during the last response chunk", async function () {
    const server = await listen((request, response) =>
      json(response, "leader"),
    );
    const controller = new AbortController();
    const agent = observedAgent((request) => {
      request.once("response", (response) => {
        response.once("data", () => controller.abort());
      });
    });
    const instance = createClient(server, { agent });
    const pending = instance.status.leader({ signal: controller.signal });
    const rejected = assert.rejects(pending, { code: "ABORT_ERR" });
    await rejected;
    await nextTurn();
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    assert.equal(instance._requests.size, 0);
  });

  it("rejects non-AbortSignal values before connecting", async function () {
    await assert.rejects(client().status.leader({ signal: {} }), {
      isValidation: true,
      message: "signal must be an AbortSignal",
    });
  });

  it("handles a signal aborted synchronously by a custom agent", async function () {
    const server = await listen((request, response) =>
      json(response, "leader"),
    );
    const controller = new AbortController();
    const reason = new Error("example stop");
    const agent = new http.Agent({ keepAlive: true });
    agents.push(agent);
    const createConnection = agent.createConnection.bind(agent);
    agent.createConnection = (options, callback) => {
      controller.abort(reason);
      return createConnection(options, callback);
    };
    const instance = createClient(server, { agent });
    await assert.rejects(
      instance.status.leader({ signal: controller.signal }),
      (error) => {
        assert.equal(error.code, "ABORT_ERR");
        assert.equal(error.cause, reason);
        return true;
      },
    );
    assert.equal(instance._requests.size, 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  });

  it("aborts pending requests and removes AbortSignal and ctx listeners", async function () {
    const server = await listen(() => {});
    const received = once(server, "request");
    const controller = new AbortController();
    const ctx = new EventEmitter();
    const instance = createClient(server);
    const pending = instance.status.leader({ signal: controller.signal, ctx });
    const rejected = assert.rejects(pending, {
      code: "ABORT_ERR",
      isAbort: true,
    });
    await received;
    controller.abort();
    await rejected;
    await nextTurn();
    assert.equal(instance._requests.size, 0);
    assert.equal(ctx.listenerCount("cancel"), 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  });

  it("uses the signal in defaults and removes listeners after success", async function () {
    const server = await listen((request, response) =>
      json(response, "leader"),
    );
    const controller = new AbortController();
    const ctx = new EventEmitter();
    const instance = createClient(server, {
      defaults: { signal: controller.signal },
    });
    assert.equal(await instance.status.leader({ ctx }), "leader");
    await nextTurn();
    assert.equal(ctx.listenerCount("cancel"), 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    controller.abort();
    await assert.rejects(instance.status.leader(), { code: "ABORT_ERR" });
  });

  it("retains ctx cancellation and rejects finished contexts", async function () {
    const server = await listen(() => {});
    const received = once(server, "request");
    const instance = createClient(server);
    const ctx = new EventEmitter();
    const pending = instance.status.leader({ ctx });
    const rejected = assert.rejects(pending, {
      code: "ABORT_ERR",
      isAbort: true,
    });
    await received;
    ctx.emit("cancel");
    await rejected;
    assert.equal(ctx.listenerCount("cancel"), 0);
    for (const property of ["canceled", "finished"]) {
      const finished = Object.assign(new EventEmitter(), { [property]: true });
      await assert.rejects(instance.status.leader({ ctx: finished }), {
        isValidation: true,
      });
    }
  });

  it("does not retry a write after the server resets its connection", async function () {
    let requests = 0;
    const server = await listen((request) => {
      requests += 1;
      request.socket.destroy();
    });
    const instance = createClient(server);
    await assert.rejects(instance.kv.set("example/key", "value"));
    await delay(30);
    assert.equal(requests, 1);
    assert.equal(instance._requests.size, 0);
  });

  it("preserves caller-owned agents and supports agent:false", async function () {
    const server = await listen((request, response) =>
      json(response, "leader"),
    );
    const agent = new http.Agent({ keepAlive: true });
    agents.push(agent);
    const destroy = agent.destroy.bind(agent);
    let destroyCalls = 0;
    agent.destroy = () => {
      destroyCalls += 1;
      destroy();
    };
    const first = createClient(server, { agent });
    await first.status.leader();
    first.destroy();
    assert.equal(destroyCalls, 0);
    const second = createClient(server, { agent });
    assert.equal(await second.status.leader(), "leader");
    assert.equal(agent.options.keepAlive, true);
    const unpooled = createClient(server, { agent: false });
    assert.equal(await unpooled.status.leader(), "leader");
    assert.equal(unpooled._opts.agent, false);
  });

  it("destroys pending requests and watches and rejects later use", async function () {
    const server = await listen(() => {});
    let resolveReceived;
    const received = new Promise((resolve) => {
      resolveReceived = resolve;
    });
    let count = 0;
    server.on("request", () => {
      if (++count === 2) resolveReceived();
    });
    const instance = createClient(server);
    const pending = instance.status.leader();
    const rejected = assert.rejects(pending, { code: "ABORT_ERR" });
    const watch = instance.watch({
      method: instance.kv.get,
      options: { key: "example/key" },
    });
    let errors = 0;
    watch.on("error", () => {
      errors += 1;
    });
    await received;
    instance.destroy();
    await rejected;
    await nextTurn();
    assert.equal(watch.isRunning(), false);
    assert.equal(errors, 0);
    assert.equal(instance._watches.size, 0);
    assert.equal(instance._requests.size, 0);
    await assert.rejects(instance.status.leader(), /client destroyed/);
    assert.throws(
      () => instance.watch({ method: instance.kv.get }),
      /client destroyed/,
    );
  });

  it("supports socketPath using a named pipe or Unix socket", async function () {
    let socketPath;
    if (process.platform === "win32") {
      socketPath = "\\\\.\\pipe\\consul-smoke-http-" + randomUUID();
    } else {
      const directory = await mkdtemp(join(tmpdir(), "consul-smoke-http-"));
      directories.push(directory);
      socketPath = join(directory, "consul.sock");
    }
    const server = http.createServer((request, response) =>
      json(response, "leader"),
    );
    servers.push(server);
    await new Promise((resolve) => server.listen(socketPath, resolve));
    const instance = client({ socketPath, timeout: 1000 });
    assert.equal(await instance.status.leader(), "leader");
  });

  it("validates a private CA and requires client certificates for mTLS", async function () {
    const cert = await readFile(
      new URL("./fixtures/tls-cert.pem", import.meta.url),
    );
    const key = await readFile(
      new URL("./fixtures/tls-key.pem", import.meta.url),
    );
    const server = await listen(
      (request, response) => {
        assert.equal(request.socket.authorized, true);
        json(response, "leader");
      },
      { cert, key, ca: cert, requestCert: true, rejectUnauthorized: true },
    );
    const options = {
      secure: true,
      servername: "localhost",
      rejectUnauthorized: true,
    };
    await assert.rejects(createClient(server, options).status.leader());
    await assert.rejects(
      createClient(server, { ...options, ca: cert }).status.leader(),
    );
    const instance = createClient(server, { ...options, ca: cert, cert, key });
    assert.equal(await instance.status.leader(), "leader");
    const agent = new https.Agent({ keepAlive: true });
    agents.push(agent);
    assert.equal(
      await createClient(server, {
        ...options,
        ca: cert,
        cert,
        key,
        agent,
      }).status.leader(),
      "leader",
    );
    await assert.rejects(
      createClient(server, {
        ...options,
        ca: cert,
        cert,
        key,
        servername: "wrong.example",
      }).status.leader(),
      { code: "ERR_TLS_CERT_ALTNAME_INVALID" },
    );
  });

  it("removes external watch abort listeners and stops the blocking request", async function () {
    const server = await listen(() => {});
    const received = once(server, "request");
    const instance = createClient(server);
    const controller = new AbortController();
    const watch = instance.watch({
      method: instance.kv.get,
      options: { key: "example/key" },
      signal: controller.signal,
    });
    watch.on("error", () =>
      assert.fail("a stopped watch must not emit an error"),
    );
    await received;
    controller.abort();
    await nextTurn();
    assert.equal(watch.isRunning(), false);
    assert.equal(instance._requests.size, 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  });

  it("does not start a watch when its external signal is already aborted", async function () {
    const instance = client();
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const watch = instance.watch({
      method: () => {
        calls += 1;
      },
      signal: controller.signal,
    });
    await nextTurn();
    assert.equal(calls, 0);
    assert.equal(watch.isRunning(), false);
    assert.equal(instance._watches.size, 0);
  });

  it("clears a watch retry timer when it ends", async function () {
    const instance = client();
    let calls = 0;
    const watch = instance.watch({
      method: () => {
        calls += 1;
        throw new Error("example failure");
      },
      backoffFactor: 30,
    });
    await new Promise((resolve) => watch.once("error", resolve));
    watch.end();
    const timer = watch._retryTimer;
    assert.equal(timer._destroyed, true);
    await delay(90);
    assert.equal(calls, 1);
  });

  it("does not schedule a retry when an error listener ends the watch", async function () {
    const instance = client();
    const watch = instance.watch({
      method: () => {
        throw new Error("example failure");
      },
      backoffFactor: 10000,
    });
    await new Promise((resolve) => {
      watch.once("error", () => {
        watch.end();
        resolve();
      });
    });
    assert.equal(watch._retryTimer, undefined);
  });

  it("ignores data resolved after a watch has ended", async function () {
    const instance = client();
    let resolveData;
    let resolveStarted;
    const started = new Promise((resolve) => {
      resolveStarted = resolve;
    });
    const watch = instance.watch({
      method: () => {
        resolveStarted();
        return new Promise((resolve) => {
          resolveData = resolve;
        });
      },
    });
    let changes = 0;
    watch.on("change", () => {
      changes += 1;
    });
    await started;
    watch.end();
    resolveData([{ headers: { "x-consul-index": "5" } }, { Value: "hello" }]);
    await nextTurn();
    assert.equal(changes, 0);
    assert.equal(watch.updateTime(), undefined);
  });

  it("decodes event payloads while retaining response tuples", async function () {
    const server = await listen((request, response) => {
      const event = { Payload: Buffer.from("payload").toString("base64") };
      json(response, request.method === "PUT" ? event : [event]);
    });
    const instance = createClient(server);
    const ctx = Object.assign(new EventEmitter(), { includeResponse: true });
    const [response, fired] = await instance.event.fire({
      name: "example",
      payload: "payload",
      ctx,
    });
    assert.equal(response.statusCode, 200);
    assert.equal(fired.Payload, "payload");
    const [listResponse, events] = await instance.event.list({
      buffer: true,
      ctx,
    });
    assert.equal(listResponse.statusCode, 200);
    assert.deepEqual(events[0].Payload, Buffer.from("payload"));
  });
});
