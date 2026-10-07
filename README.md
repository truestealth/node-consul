# @truestealth/consul

[Русский](README.ru.md) · [Migration guide](MIGRATION.md)

A Promise-based client for the HashiCorp Consul HTTP API, with TypeScript
declarations included. This is an independent community project, not an official
HashiCorp client.

## Requirements and release status

- Node.js **24 or newer**. CI covers Node.js 24 and 26; see the
  [Node.js release schedule](https://nodejs.org/en/about/previous-releases).
- Native **ES modules only**. There is no separate CommonJS build.
- No runtime dependencies: requests use Node.js `http` and `https`.
- `1.0.0-beta.2` previews the native HTTP transport and lifecycle changes. Config
  Entries are the next stage; acceptance and release checks must finish before
  stable 1.0.0.

Moving from `consul@2.x` or this package's `0.1.x` releases? Start with the
[migration guide](MIGRATION.md).

## Get started

```sh
npm install @truestealth/consul@1.0.0-beta.2
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

| Client option            | Purpose                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `host`, `port`, `secure` | Agent address; `secure: true` selects HTTPS                                                                       |
| `defaults`               | Common options to apply to requests; individual calls can override them                                           |
| `agent`                  | A Node.js `http.Agent` or `https.Agent`; `false` disables pooling, otherwise an owned keep-alive agent is created |

The constructor also accepts `baseUrl`, `headers`, `socketPath`, and Node.js TLS
options such as `ca`, `cert`, `key`, and `servername`. Keep certificate verification
enabled; provide your private CA instead of disabling HTTPS verification. A
custom agent remains yours to configure and destroy.

```js
import { readFile } from "node:fs/promises";

const consul = new Consul({
  host: "consul.internal",
  port: 8501,
  secure: true,
  ca: await readFile("./certs/ca.pem"),
  cert: await readFile("./certs/client.pem"),
  key: await readFile("./certs/client-key.pem"),
});
```

Common method options include `token`, `dc`, `ns`, `partition`, `consistent`,
`stale`, `filter`, `near`, `index`, `wait`, `timeout`, and `signal`. An endpoint may support only a
subset; the [Consul API reference](https://developer.hashicorp.com/consul/api-docs)
defines their server-side behavior. Numeric `timeout` values are milliseconds;
duration strings such as `"2s"` are also accepted. The timeout is a total request
deadline, including the response body; expiration destroys the request rather
than merely reporting that it is slow.

Pass an AbortSignal to cancel a call, or put it in `defaults` to cancel a group
of calls:

```js
const controller = new AbortController();
const pending = consul.kv.get({
  key: "example/greeting",
  signal: controller.signal,
});
controller.abort();
await pending.catch((error) => {
  // Handle cancellation; the request is no longer running.
});
```

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

`watch.end()` cancels both the in-flight blocking read and any retry timer.
`consul.destroy()` stops all of that client's watches, cancels pending requests,
and destroys its own agent. It does not destroy an agent supplied by the caller.
The client cannot be reused after destruction; create another instance instead.

The legacy EventEmitter `ctx` with a `"cancel"` event remains supported.
`ctx.includeResponse: true` returns `[response, result]` instead of only the data;
for a missing result the second tuple element may be absent. The response is a
Node.js `IncomingMessage`.

Ordinary requests are never retried automatically, including writes. A network
failure does not prove a write was rejected by Consul; reconcile the result or
use CAS rather than blindly resubmitting a non-idempotent operation.

## Development

Use the pnpm version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
npm test
npm run types
npm run package:check
git diff --check
npm pack --dry-run
```

`npm test` combines Nock-based API tests with real local HTTP/HTTPS servers,
including TLS and cancellation cases. `npm run package:check` installs the actual
npm archive offline and checks its imports, HTTP requests and NodeNext types.

Acceptance tests start three HashiCorp Consul agents on `127.0.0.1`–`127.0.0.3`.
Set `CONSUL_BIN` to a local executable if `consul` is not on `PATH`, prepare those
loopback addresses, then run `npm run acceptance`. The test cluster enables
Connect and uses the BoltDB Raft backend for Windows compatibility; these are
test settings, not requirements for your deployment. The client has no build
step; the npm archive ships source modules and declarations.

## Origin and license

This independent project starts from
[silas/node-consul](https://github.com/silas/node-consul), commit
`542f4ef61d500019460105356ab7b732262b5bdc`. Original authorship and notices are
retained in [LICENSE](LICENSE) and [NOTICE](NOTICE). The code is MIT-licensed;
the inherited documentation includes material derived from the Consul project,
as recorded in `NOTICE`.
