import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const npmCli = process.env.npm_execpath;
assert(npmCli, "Run this check with npm run package:check");
await mkdir(join(root, "tmp"), { recursive: true });
const directory = await mkdtemp(join(root, "tmp", "consul-smoke-package-"));
const options = {
  timeout: 120000,
  windowsHide: true,
  env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "1" },
};

try {
  const packed = await execute(
    process.execPath,
    [
      npmCli,
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      directory,
    ],
    { ...options, cwd: root },
  );
  const [archive] = JSON.parse(packed.stdout);
  const files = archive.files.map((file) => file.path);
  for (const required of [
    "LICENSE",
    "NOTICE",
    "README.md",
    "README.ru.md",
    "MIGRATION.md",
    "MIGRATION.ru.md",
  ]) {
    assert(files.includes(required), "Missing public file: " + required);
  }
  const unexpected = files.filter(
    (file) =>
      !/^(lib\/|LICENSE$|NOTICE$|README(?:\.ru)?\.md$|MIGRATION(?:\.ru)?\.md$|package\.json$)/.test(
        file,
      ),
  );
  assert.deepEqual(unexpected, [], "Unexpected package contents");
  const consumer = join(directory, "consumer");
  await mkdir(consumer);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      name: "consul-smoke-consumer",
      private: true,
      type: "module",
    }),
  );
  await execute(
    process.execPath,
    [
      npmCli,
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      join(directory, archive.filename),
    ],
    { ...options, cwd: consumer },
  );
  const installed = JSON.parse(
    await readFile(
      join(consumer, "node_modules/@truestealth/consul/package.json"),
      "utf8",
    ),
  );
  assert.equal(installed.name, "@truestealth/consul");
  assert.equal(installed.type, "module");
  assert.equal(installed.engines.node, ">=24");
  assert.equal(installed.version, archive.version);
  assert.deepEqual(Object.keys(installed.dependencies || {}), []);
  assert.equal(installed.exports["."].import.default, "./lib/index.js");
  assert.equal(installed.exports["."].require.default, "./lib/commonjs.mjs");
  const smoke = `
    import assert from 'node:assert/strict';
    import http from 'node:http';
    import { once } from 'node:events';
    import Consul, { Consul as NamedConsul } from '@truestealth/consul';
    assert.equal(Consul, NamedConsul);
    const server = http.createServer((request, response) => {
      if (request.url.includes('stall')) return;
      response.setHeader('content-type', 'application/json');
      if (request.method === 'PUT') return response.end('false');
      if (request.url.includes('missing')) { response.statusCode = 404; return response.end(); }
      if (request.url.includes('/config/')) return response.end(JSON.stringify({ Kind: 'service-intentions', Name: 'web', Sources: [{ Name: 'api', Action: 'allow' }] }));
      response.end(JSON.stringify([{ Key: 'key', Value: 'AP8=', ModifyIndex: 1 }]));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const consul = new Consul({ port: server.address().port });
    try {
      assert.deepEqual((await consul.kv.get({ key: 'key', buffer: true })).Value, Buffer.from([0, 255]));
      assert.equal(await consul.kv.get('missing'), undefined);
      assert.equal(await consul.kv.set('key', 'value', { cas: 0 }), false);
      assert.equal((await consul.config.get({ kind: 'service-intentions', name: 'web' })).Sources[0].Action, 'allow');
      assert.equal(await consul.config.get({ kind: 'service-defaults', name: 'missing' }), undefined);
      assert.equal(await consul.config.set({ entry: { Kind: 'service-defaults', Name: 'web', Protocol: 'http' }, cas: 0 }), false);
      await assert.rejects(consul.kv.get({ key: 'stall', timeout: 20 }), (error) => error.isTimeout);
    } finally {
      consul.destroy();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  `;
  await execute(process.execPath, ["--input-type=module", "--eval", smoke], {
    ...options,
    cwd: consumer,
  });
  await execute(
    process.execPath,
    [
      "--input-type=commonjs",
      "--eval",
      "const assert = require('node:assert/strict'); const Consul = require('@truestealth/consul'); const client = new Consul(); client.destroy(); import('@truestealth/consul').then((module) => { assert.equal(Consul, module.default); assert.equal(Consul, module.Consul); });",
    ],
    { ...options, cwd: consumer },
  );
  const probe = join(consumer, "consumer.mts");
  const commonjsProbe = join(consumer, "consumer.cts");
  await writeFile(
    commonjsProbe,
    `
    import Consul = require('@truestealth/consul');
    import type { Consul as ConsulInstance, CommonOptions, ConsulOptions, ConfigEntry, ServiceIntentionsEntry, TransactionOperation, TransactionCreateResult, AclTokenEntry, AclTokenResult } from '@truestealth/consul';
    const clientOptions: ConsulOptions = { host: 'localhost' };
    const consul: Consul = new Consul(clientOptions);
    const instance: ConsulInstance = consul;
    const options: CommonOptions<false> = { timeout: '1s', signal: new AbortController().signal };
    const value: Promise<string[]> = consul.kv.keys('consul-smoke-prefix');
    const entry: ConfigEntry<'service-defaults'> = { Kind: 'service-defaults', Name: 'web' };
    const intentions: Promise<ServiceIntentionsEntry | undefined> = consul.config.get({ kind: 'service-intentions', name: 'web', ...options });
    const operations: TransactionOperation[] = [{ KV: { Verb: 'set', Key: 'consul-smoke-key', Value: 'dmFsdWU=' } }];
    const transaction: Promise<TransactionCreateResult> = consul.transaction.create(operations);
    const tokenEntry: AclTokenEntry = { Description: 'consul-smoke-token' };
    const token: Promise<AclTokenResult> = consul.acl.token.create({ entry: tokenEntry });
    consul.destroy();
  `,
  );
  await writeFile(
    probe,
    `
    import Consul, { type CommonOptions, type ServiceIntentionsEntry } from '@truestealth/consul';
    const consul = new Consul({ defaults: { timeout: '1s' } });
    const options: CommonOptions<false> = { signal: new AbortController().signal };
    const result: Promise<Buffer | undefined> = consul.kv.get({ key: 'key', raw: true, ...options });
    const intentions: Promise<ServiceIntentionsEntry | undefined> = consul.config.get({ kind: 'service-intentions', name: 'web' });
    consul.watch({ method: consul.kv.get, options: { key: 'key' } }).end();
    consul.destroy();
  `,
  );
  const tsdRequire = createRequire(import.meta.resolve("tsd"));
  const typescript = tsdRequire("@tsd/typescript");
  const program = typescript.createProgram([probe, commonjsProbe], {
    strict: true,
    noEmit: true,
    module: typescript.ModuleKind.NodeNext,
    moduleResolution: typescript.ModuleResolutionKind.NodeNext,
    target: typescript.ScriptTarget.ES2022,
    typeRoots: [join(root, "node_modules/@types")],
  });
  const diagnostics = typescript.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new Error(
      typescript.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => dirname(probe),
        getCanonicalFileName: (filename) => resolve(filename),
        getNewLine: () => "\n",
      }),
    );
  }
  console.log(
    "Package archive: " +
      files.length +
      " public files; offline install, ESM, native CommonJS loading, HTTP and NodeNext types passed.",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
