import "should";

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import createDebug from "debug";

import Consul from "../../lib/index.js";

async function retry(operation, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (String(error.code).includes("CERT")) throw error;
      if (attempt === attempts - 1) throw error;
      await delay(100);
    }
  }
}

function bufferToString(value, depth) {
  if (!value) return value;
  if (!depth) depth = 0;
  if (depth > 10) return value;

  if (Buffer.isBuffer(value)) return value.toString();

  if (Array.isArray(value)) {
    return value.map((v) => bufferToString(v, depth + 1));
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      value[k] = bufferToString(v, depth + 1);
    }
  }

  return value;
}

function debugBuffer(name) {
  const debug = createDebug(name);

  return function () {
    debug.apply(debug, bufferToString(Array.prototype.slice.call(arguments)));
  };
}

class Cluster {
  constructor(options = {}) {
    this.options = options;
    this.nodeCount = options.nodeCount || (options.secure ? 1 : 3);
    this.httpsPort = 28501;
    this.clientOptions = {};
    this._started = false;
    this.process = {};
    this.dataPaths = [];
  }

  async spawn(opts) {
    const binPath = process.env.CONSUL_BIN || "consul";

    const args = ["agent"];
    for (const [key, value] of Object.entries(opts)) {
      args.push("-" + key);
      if (typeof value !== "boolean" && value !== undefined) {
        args.push("" + value);
      }
    }

    const serverDataPath = await mkdtemp(path.join(tmpdir(), "consul-smoke-"));
    this.dataPaths.push(serverDataPath);
    const serverConfigPath = path.join(serverDataPath, "config.json");

    const serverConfig = {
      primary_datacenter: "dc1",
      acl: {
        enabled: false,
      },
      connect: { enabled: true },
      raft_logstore: { backend: "boltdb" },
      enable_script_checks: true,
    };
    if (this.options.secure) {
      serverConfig.acl = {
        enabled: true,
        default_policy: "deny",
        tokens: {
          initial_management: this.managementToken,
          agent: this.managementToken,
        },
      };
      serverConfig.ports = { http: -1, https: this.httpsPort };
      serverConfig.tls = {
        https: {
          ca_file: this.certPath,
          cert_file: this.certPath,
          key_file: this.keyPath,
          verify_incoming: true,
        },
      };
    }
    await writeFile(serverConfigPath, JSON.stringify(serverConfig), {
      mode: 0o600,
    });

    args.push("-config-file");
    args.push(serverConfigPath);
    args.push("-data-dir");
    args.push(path.join(serverDataPath, opts.node, "data"));
    args.push("-pid-file");
    args.push(path.join(serverDataPath, opts.node, "pid"));

    const server = spawn(binPath, args, { windowsHide: true });
    let startupError;
    let closed = false;
    const exit = new Promise((resolve) => {
      server.once("error", (error) => {
        startupError = error;
      });
      server.once("close", (code) => {
        closed = true;
        resolve(code);
      });
    });
    this.process[opts.node] = { server, exit };

    const serverLog = debugBuffer("consul:server:" + opts.node);
    server.stdout.on("data", (data) => serverLog(data));
    server.stderr.on("data", (data) => serverLog(data));

    const client = new Consul({
      host: opts.bind,
      timeout: 1000,
      ...this.clientOptions,
    });

    const clientLog = debugBuffer("consul:client:" + opts.node);
    client.on("log", clientLog);

    try {
      await retry(async () => {
        if (startupError) throw startupError;
        if (closed) {
          throw new Error("Consul exited before startup: " + opts.node);
        }
        if (opts.bootstrap) {
          const leader = await client.status.leader();
          if (!leader) throw new Error("Consul leader is not elected yet");
          if (this.options.secure) await client.acl.token.self();
        } else {
          await client.agent.self();
        }
      }, 300);
    } finally {
      client.destroy();
    }
  }

  async setup() {
    if (this._started) throw new Error("already started");
    this._started = true;

    if (this.options.secure) {
      this.managementToken = randomUUID();
      this.certPath = fileURLToPath(
        new URL("../fixtures/tls-cert.pem", import.meta.url),
      );
      this.keyPath = fileURLToPath(
        new URL("../fixtures/tls-key.pem", import.meta.url),
      );
      const cert = await readFile(this.certPath);
      const key = await readFile(this.keyPath);
      this.clientOptions = {
        secure: true,
        port: this.httpsPort,
        ca: cert,
        cert,
        key,
        defaults: { token: this.managementToken },
      };
    }

    const nodes = Array.from(
      { length: this.nodeCount },
      (_unused, nodeIndex) => {
        const node = "node" + (nodeIndex + 1);

        const opts = {
          node: node,
          datacenter: "dc1",
          bind: "127.0.0." + (nodeIndex + 1),
          client: "127.0.0." + (nodeIndex + 1),
        };

        if (nodeIndex === 0) {
          opts.bootstrap = true;
          opts.server = true;
        }

        return this.spawn(opts);
      },
    );

    const results = await Promise.allSettled(nodes);
    const failure = results.find((result) => result.status === "rejected");
    if (failure) {
      await this.teardown();
      throw failure.reason;
    }
  }

  async teardown() {
    const processes = Object.values(this.process);
    for (const { server } of processes) {
      if (server.exitCode === null && server.signalCode === null) {
        server.kill("SIGKILL");
      }
    }

    await Promise.all(processes.map(({ exit }) => exit));
    await Promise.all(
      this.dataPaths.map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
    this.process = {};
    this.dataPaths = [];
  }
}

async function before(test, options) {
  test.timeout(60000);
  test.cluster = new Cluster(options);

  await test.cluster.setup();

  for (let i = 1; i <= test.cluster.nodeCount; i++) {
    const client = (test["c" + i] = new Consul({
      host: "127.0.0." + i,
      ...test.cluster.clientOptions,
    }));
    client.on("log", debugBuffer("consul:" + "127.0.0." + i));
  }
}

async function after(test) {
  for (const name of ["c1", "c2", "c3"]) {
    if (test[name]) test[name].destroy();
  }
  await test.cluster.teardown();
}

function skip() {}
skip.skip = skip;

const acceptanceDescribe = process.env.ACCEPTANCE === "true" ? describe : skip;
export { before, after, retry, acceptanceDescribe as describe };
