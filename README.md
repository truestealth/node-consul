# @truestealth/consul

[Русский](README.ru.md) · [Migration guide](MIGRATION.md)

A Promise-based client for the HashiCorp Consul HTTP API, with TypeScript
declarations included. This is an independent community project, not an official
HashiCorp client.

## Requirements

- Node.js **24 or newer**. CI covers Node.js 24 and 26 on Linux and Windows; see the
  [Node.js release schedule](https://nodejs.org/en/about/previous-releases).
- One native **ES module implementation**. Node.js 24 also loads it through `require()`; there is no separate CommonJS build.
- No runtime dependencies: requests use Node.js `http` and `https`.
- TypeScript **5.4 or newer** when using the included declarations.

Version **1.2.1** refreshes the development tools and type checks. It retains
the modern ACL API, typed Config Entry/transaction contracts, opt-in watch pacing
and safe request diagnostics introduced in earlier releases.

Moving from `consul@2.x`? Start with the
[migration guide](MIGRATION.md).

## Get started

```sh
npm install @truestealth/consul@1.2.1
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

Choose the address with `host`, `port`, and `secure`, or supply an HTTP(S)
`baseUrl`. Node.js request options named `hostname` and `protocol` are not
supported client-address settings.

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

## Config Entries

Use `config` for Consul configuration entries. Request options use lower-case
names, while `entry` is the original Consul JSON document: keep fields such as
`Kind`, `Name`, and `Protocol` in their documented case.

```js
const entry = {
  Kind: "service-defaults",
  Name: "example-web",
  Protocol: "http",
};
const created = await consul.config.set({ entry, cas: 0 });
const stored = await consul.config.get({ kind: entry.Kind, name: entry.Name });
const entries = await consul.config.list("service-defaults");

if (created && stored?.ModifyIndex !== undefined) {
  const removed = await consul.config.del({
    kind: entry.Kind,
    name: entry.Name,
    cas: stored.ModifyIndex,
  });
}
```

`get()` returns one entry or `undefined` for HTTP 404. `list()` returns an array
and also accepts `{ kind, dc, ns, partition, filter, index, wait }`. `set()` and
CAS-protected `del()` preserve Consul's boolean result. A successful unconditional
`del()` normalizes Consul's empty-object response to `true`; this does not prove
the entry existed. `delete()` aliases `del()`.

Omit `cas` for an unconditional write or deletion. With `cas: 0`, `set()` is
create-only and `del()` does not delete an existing entry. A nonzero CAS must
match the entry's `ModifyIndex`; `false` means the condition failed. CAS accepts
a safe integer, decimal string, or bigint in the uint64 range. For larger
indices, supply an exact string or bigint rather than an already-rounded number.

The client forwards `ns` and `partition`, including on writes and deletes.
These options require the relevant Consul Enterprise features and ACLs. Mocks
verify that the parameters are sent, not how an Enterprise server handles them;
Enterprise acceptance has not been run. See the
[Config API](https://developer.hashicorp.com/consul/api-docs/config) for supported
kinds and server-side rules.

### Service intentions

Manage intentions through `Kind: "service-intentions"`, not legacy intentions
CRUD by ID. `Name` identifies the destination service. Each source uses either
an L4 `Action` or L7 `Permissions`, never both. For L7 rules, first configure a
compatible service protocol, for example a `service-defaults` entry with
`Protocol: "http"`.

```ts
import type { ServiceIntentionsEntry } from "@truestealth/consul";

await consul.config.set({
  entry: { Kind: "service-defaults", Name: "example-web", Protocol: "http" },
});

const intentions: ServiceIntentionsEntry = {
  Kind: "service-intentions",
  Name: "example-web",
  Sources: [
    { Name: "example-admin", Action: "allow" },
    {
      Name: "example-frontend",
      Permissions: [
        { Action: "allow", HTTP: { PathPrefix: "/api/", Methods: ["GET"] } },
      ],
    },
  ],
};

const applied = await consul.config.set({ entry: intentions, cas: 0 });
const storedIntentions = await consul.config.get({
  kind: "service-intentions",
  name: "example-web",
});
```

A write replaces the whole configuration entry, not just one source. To change
an existing entry, read it, preserve the sources you need, and write with its
current CAS index. The declarations model L4/L7 fields, but Consul validates the
complete configuration. Protocol, mesh, and edition restrictions are documented
in the [service-intentions reference](https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions).

## Modern ACLs

`acl.token`, `acl.policy`, `acl.role`, `acl.authMethod`, and `acl.bindingRule`
provide `create({ entry })`, `update({ id, entry })`, `get(id)`, `list()`, and
`del(id)`. Auth methods use `name` instead of `id`. Policy and role lookups also
accept `{ name }`. Tokens support `self()`, `clone(id)`, and
`get({ id, expanded: true })`.

Use `entry` for Consul's JSON document. Request settings (`token`, `dc`, `ns`,
`partition`, `timeout`, `signal`) belong outside it:

```js
const policy = await consul.acl.policy.create({
  entry: {
    Name: "example-settings-reader",
    Rules: 'key_prefix "example/" { policy = "read" }',
  },
});
const issued = await consul.acl.token.create({
  entry: { Policies: [{ ID: policy.ID }], ExpirationTTL: "1h" },
});
try {
  const item = await consul.kv.get({
    key: "example/settings",
    token: issued.SecretID,
  });
} finally {
  await consul.acl.token.del(issued.AccessorID);
}
```

Token resource IDs are **AccessorIDs**; authentication uses **SecretIDs**.
Do not log issued tokens or complete token lists: lists can contain secrets
depending on ACL permissions. HTTP 404 reads resolve to `undefined`; failed
deletes still reject. Updates do not merge records; retain grants that must
survive a PUT.

`acl.login({ authMethod, bearerToken, meta })` returns the issued token without
changing defaults. Use it explicitly, then call
`acl.logout({ token: issued.SecretID })`. Login requires a configured auth method
and matching binding rule, not just ACL bootstrap. The
[ACL API](https://developer.hashicorp.com/consul/api-docs/acl) describes the
required permissions and server-version restrictions.

Consul can return 403 rather than 404 for a deleted or unknown ACL token.
These responses remain errors, including logout after revocation.

Deleting an auth method also removes its binding rules and login-issued tokens
on the Consul server. Treat this as credential revocation, not just cleanup.

## Typed configuration and transactions

`service-defaults`, `proxy-defaults`, and `service-intentions` have dedicated
declarations and inferred `get/list` results. Other kinds retain the generic
`ConfigEntry` API. Import `ServiceDefaultsEntry` or `ProxyDefaultsEntry` to check
a stored document; Consul still validates the actual configuration.

Transactions distinguish KV, Node, Service, and Check operations and supported
verbs. Annotate arrays kept in a variable so the verb does not widen to `string`:

```ts
import type { TransactionOperation } from "@truestealth/consul";

const operations: TransactionOperation[] = [
  { KV: { Verb: "set", Key: "example/settings", Value: "aGVsbG8=" } },
  { KV: { Verb: "check-index", Key: "example/version", Index: 10 } },
];
const result = await consul.transaction.create(operations);
```

Transaction KV values remain **base64** in requests and results, unlike
`kv.get()`. A conflict rejects with HTTP 409; inspect the error response's
`Errors`, not a boolean CAS result. `Results` and `Errors` can be `null`.
See the [transaction API](https://developer.hashicorp.com/consul/api-docs/txn).

## The rest of the API

The existing API sections remain available:

| Section       | Examples                                                                             |
| ------------- | ------------------------------------------------------------------------------------ |
| `agent`       | `self()`, `members()`, `service.register()`, `check.register()`                      |
| `health`      | `node({ node })`, `service({ service, passing: true })`, `state({ state })`          |
| `catalog`     | `datacenters()`, `node.list()`, `service.nodes({ service })`                         |
| `session`     | `create()`, `renew({ id })`, `destroy({ id })`                                       |
| `query`       | Prepared-query `create()`, `get()`, `execute()`, `destroy()`                         |
| `event`       | `fire({ name, payload })`, `list()`                                                  |
| `status`      | `leader()`, `peers()`                                                                |
| `transaction` | `create(operations)`                                                                 |
| `acl`         | Modern resources, `login()`, `logout()`, `bootstrap()`, `replication()` and `legacy` |

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
  rateLimit: 15000,
  backoffJitter: true,
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

Watch pacing is **opt-in**: `rateLimit` defaults to `0` (disabled). A value of
`15000` allows two immediate queries, then refills one request every 15 seconds
under sustained change. A long poll resumes without an extra delay once its
budget has refilled. Intermediate changes can be coalesced while paced.
Error retries retain exponential backoff; `backoffJitter: true` chooses a delay
between half and all of the calculated backoff. Jitter defaults to `false`.
Stopping the watch, destroying the client or aborting its signal cancels both
the active query and any pacing/retry timer.

Ordinary requests are never retried automatically, including writes. A network
failure does not prove a write was rejected by Consul; reconcile the result or
use CAS rather than blindly resubmitting a non-idempotent operation.

## Request diagnostics

The existing `log` event provides timing and outcomes without request contents.
Each request submitted to the transport emits one completion event:

```ts
import type { ConsulLogData } from "@truestealth/consul";

consul.on("log", (tags: string[], data: ConsulLogData) => {
  console.info(tags, data);
});
```

Metadata includes `name`, `method`, `durationMs`, `outcome`, and optional
`statusCode`/`errorCode`. Timing includes waiting in an Agent queue. Outcomes
distinguish success, HTTP, network, codec and validation failures, timeout and
abort. A missing KV key is a successful normalized result with status 404.
Response tags remain `["consul", "response"]` when an HTTP response is known;
failures without a response use `["consul", "error"]`.
URLs, keys, headers, bodies, credentials and error messages are deliberately
omitted. Keep listeners lightweight: throwing retains normal EventEmitter
behavior rather than being silently ignored.

Endpoint parameter validation can reject before submitting a request; those
failures do not emit a transport event.

## Development

Use the pnpm version pinned in `package.json`:

```sh
pnpm install --frozen-lockfile
npm test
npm run lint
npm run types
npm run package:check
git diff --check
npm pack --dry-run
```

`npm test` combines Nock-based API tests with real local HTTP/HTTPS servers,
including TLS and cancellation cases. `npm run package:check` installs the actual
npm archive offline and checks its imports, HTTP requests and NodeNext types.

ESLint checks JavaScript, Prettier checks formatting, and assertions use
`node:assert/strict`. Type tests use the TypeScript CLI and `expect-type` to check
inferred results and reject invalid calls; archive consumers use the compiler
CLI as well.

Acceptance starts three Consul agents on `127.0.0.1`–`127.0.0.3` and isolated
single-agent ACL/TLS scenarios.
Set `CONSUL_BIN` to a local executable if `consul` is not on `PATH`, prepare those
loopback addresses, then run `npm run acceptance`. The test cluster enables
Connect and uses the BoltDB Raft backend for Windows compatibility; these are
test settings, not requirements for your deployment. The client has no build
step; the npm archive ships source modules and declarations.

CI checks runtime tests, 100% coverage, declarations and actual archive consumers
on Node.js 24 and 26, on Linux and Windows. Acceptance uses Consul **1.22.7** and
**2.0.4 Community**, including authenticated CRUD, JWT login/logout and HTTPS
with client certificates. These checks do not establish compatibility with every
server version or edition; inherited endpoints require server support. Enterprise
namespace/partition behavior remains unverified beyond request mocks.

## Origin and license

This independent project starts from
[silas/node-consul](https://github.com/silas/node-consul), commit
`542f4ef61d500019460105356ab7b732262b5bdc`. Original authorship and notices are
retained in [LICENSE](LICENSE) and [NOTICE](NOTICE). The code is MIT-licensed;
the inherited documentation includes material derived from the Consul project,
as recorded in `NOTICE`.
