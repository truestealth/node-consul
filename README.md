# @truestealth/consul

[Русский](README.ru.md) · [Migration guide](MIGRATION.md)

A Promise-based client for the Consul HTTP API, with TypeScript declarations
included. The package is maintained independently of the original
`silas/node-consul` project.

## Requirements and release status

- Node.js **24 or newer**. CI covers Node.js 24 and 26; see the
  [Node.js release schedule](https://nodejs.org/en/about/previous-releases).
- Native **ES modules only**. There is no separate CommonJS build.
- `1.0.0-beta.1` is a migration preview, not the stable 1.0.0 release. It switches
  the package to ESM while retaining the existing Papi transport. Replacing Papi,
  adding AbortSignal support, and supporting Config Entries are subsequent steps.

Moving from `consul@2.x` or this package's `0.1.x` releases? Start with the
[migration guide](MIGRATION.md).

## Get started

```sh
npm install @truestealth/consul@1.0.0-beta.1
```

Use an `.mjs` file or set `"type": "module"` in your application's `package.json`:

```js
import Consul from "@truestealth/consul";

const consul = new Consul({
  host: "127.0.0.1",
  port: 8500,
  defaults: { token: process.env.CONSUL_HTTP_TOKEN },
});

try {
  await consul.kv.set("example/greeting", "hello");
  const item = await consul.kv.get("example/greeting");
  // item?.Value is "hello"; no base64 decoding is needed.
  await consul.kv.del("example/greeting");
} finally {
  consul.destroy();
}
```

The client does not read `.env` files, discover servers over DNS, connect to
Redis, or start workers when imported. Read environment variables in your own
application and pass the values you need.

## Client and request options

`new Consul()` targets `http://127.0.0.1:8500/v1`.

| Client option            | Purpose                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| `host`, `port`, `secure` | Agent address; `secure: true` selects HTTPS                                      |
| `defaults`               | Common options to apply to requests; individual calls can override them          |
| `agent`                  | A Node.js `http.Agent` or `https.Agent`; otherwise a keep-alive agent is created |

The transport also accepts `baseUrl`, `headers`, `socketPath`, and Node.js TLS
options such as `ca`, `cert`, `key`, and `servername`. In this preview, declarations
do not yet cover every advanced transport option. Keep certificate verification
enabled; provide your private CA instead of disabling HTTPS verification.

Common method options include `token`, `dc`, `partition`, `consistent`, `stale`,
`filter`, `near`, `index`, `wait`, and `timeout`. An endpoint may support only a
subset; the [Consul API reference](https://developer.hashicorp.com/consul/api-docs)
defines their server-side behavior. Numeric `timeout` values are milliseconds;
duration strings such as `"2s"` are also accepted.

For a blocking read, use `index` with `wait` and leave enough time for Consul to
complete the request:

```js
const item = await consul.kv.get({
  key: "example/greeting",
  index: "12345",
  wait: "30s",
  timeout: "35s",
});
```

Use a string or bigint for indices beyond JavaScript's safe integer range.
Enterprise-only parameters do not enable Enterprise features on a Community
server.

## KV reads and conditional writes

```js
const item = await consul.kv.get("example/greeting");
const binaryItem = await consul.kv.get({
  key: "example/binary",
  buffer: true,
});
const bytes = await consul.kv.get({ key: "example/binary", raw: true });
const items = await consul.kv.get({ key: "example/", recurse: true });
const keys = await consul.kv.keys("example/");

const created = await consul.kv.set({
  key: "example/created-once",
  value: "hello",
  cas: 0,
});
// created === false means that the conditional write was not applied.
```

| Read                          | Result                                                           |
| ----------------------------- | ---------------------------------------------------------------- |
| `get(key)`                    | One KV item with a decoded string `Value`, or `undefined`        |
| `get({ key, buffer: true })`  | One KV item with a `Buffer` `Value`, or `undefined`              |
| `get({ key, raw: true })`     | A `Buffer` containing the value without metadata, or `undefined` |
| `get({ key, recurse: true })` | An array of KV items, or `undefined` if the prefix is absent     |
| `keys(key)`                   | An array of key names; no values                                 |

An item's `Value` may be `null` when Consul returns no value. Writes accept
strings, Buffers, and `null` (an empty value). `set()` and `del()` preserve the
boolean result returned by Consul; check it when using CAS or session locks.
`delete()` is an alias of `del()`. See the
[KV API](https://developer.hashicorp.com/consul/api-docs/kv) for locking and CAS
rules, including the different meaning of `cas: 0` when deleting.

## The rest of the API

The existing API sections remain available:

| Section       | Examples                                                                    |
| ------------- | --------------------------------------------------------------------------- |
| `agent`       | `self()`, `members()`, `service.register()`, `check.register()`             |
| `health`      | `node({ node })`, `service({ service, passing: true })`, `state({ state })` |
| `catalog`     | `datacenters()`, `node.list()`, `service.nodes({ service })`                |
| `session`     | `create()`, `renew({ id })`, `destroy({ id })`                              |
| `query`       | Prepared-query `create()`, `get()`, `execute()`, `destroy()`                |
| `event`       | `fire({ name, payload })`, `list()`                                         |
| `status`      | `leader()`, `peers()`                                                       |
| `transaction` | `create(operations)`                                                        |
| `acl`         | `bootstrap()`, `replication()`, and the inherited `legacy` section          |

Methods return Promises. Method options and result shapes are described by the
included declarations; consult the
[official API documentation](https://developer.hashicorp.com/consul/api-docs) for
ACL requirements and server-version restrictions. Inherited legacy ACL endpoints
are not a promise of support by current Consul servers.

## Watches and shutdown

Watches use blocking reads and retry failed reads with capped exponential backoff.
Attach an error listener and stop each watch before disposing of the client:

```js
const watch = consul.watch({
  method: consul.kv.get,
  options: { key: "example/greeting", wait: "30s" },
  backoffFactor: 1000,
  backoffMax: 30000,
  maxAttempts: 5,
});

watch.on("change", (item) => {
  // Apply the new configuration without logging secrets.
});
watch.on("error", () => {
  // Report failure through your application's error handling.
});

// During application shutdown:
watch.end();
consul.destroy();
```

In this preview, `destroy()` also destroys a supplied custom agent. Do not share
that agent with unrelated clients. Cancellation still uses an EventEmitter
`ctx` that emits `"cancel"`; native `AbortSignal` is not available yet. TypeScript
currently models `ctx.includeResponse: true` correctly only for KV methods.

## Development

Use the pnpm version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
npm test
npm run types
git diff --check
npm pack --dry-run
```

Acceptance tests need a local Consul executable and their loopback networking
environment; they are not part of the mock-only unit test run. Run
`npm run acceptance` only after preparing that environment. The client has no
build step; the npm archive ships source modules and declarations.

## Origin and license

This independent project starts from
[silas/node-consul](https://github.com/silas/node-consul), commit
`542f4ef61d500019460105356ab7b732262b5bdc`. Original authorship and notices are
retained in [LICENSE](LICENSE) and [NOTICE](NOTICE). The code is MIT-licensed;
the inherited documentation includes material derived from the Consul project,
as recorded in `NOTICE`.
