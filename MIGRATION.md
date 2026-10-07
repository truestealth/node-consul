# Migrating to 1.0

[Русский](MIGRATION.ru.md) · [Package documentation](README.md)

This guide applies to `consul@2.x` and `@truestealth/consul@0.1.x` applications.
Version 1.0.0 includes ESM, the native Node.js HTTP transport, and Config Entries
with service-intentions support.

## 1. Update Node.js and the dependency

Use Node.js 24 or newer. Test the application on Node.js 24; this package also
runs CI on Node.js 26.

```sh
npm uninstall consul
npm install @truestealth/consul@1.1.0
```

Skip the uninstall command if you already use the scoped package. Update any
dependency aliases, mocks, and import paths that still refer to `consul`.

## 2. Import the ESM entry point

Before:

```js
const Consul = require("consul");
const consul = new Consul();
```

After:

```js
import Consul from "@truestealth/consul";
const consul = new Consul();
```

Use `.mjs` files or set `"type": "module"` in the application package. Adding that
field changes the interpretation of every `.js` file in its scope, including
configuration and test files; use `.cjs` for files that must stay CommonJS.

There is one implementation, written as ES modules. Starting with 1.0.1, Node.js
24 can also load it synchronously from CommonJS:

```js
const Consul = require("@truestealth/consul");
const consul = new Consul();
```

The CommonJS entry point returns the same constructor as the ESM default export.
It uses Node.js's native ESM loader and adds no separate CommonJS build. Existing
TypeScript default imports compiled to CommonJS continue to work on Node.js 24.
An asynchronous import remains available:

```js
async function start() {
  const { default: Consul } = await import("@truestealth/consul");
  const consul = new Consul();
  try {
    return await consul.status.leader();
  } finally {
    consul.destroy();
  }
}
```

## 3. Adjust TypeScript's module resolution

Use TypeScript 5 or newer. For a Node.js application, use `module: "NodeNext"` and
`moduleResolution: "NodeNext"`. Use `.mts` or an ESM package for default imports;
CommonJS `.cts` sources can use `import Consul = require("@truestealth/consul")`.
Declarations are shipped alongside the source; no separate
`@types/consul` package is needed.

The package's `exports` map defines the supported entry point. Imports such as
`@truestealth/consul/lib/kv` are not supported public API.

## 4. Check result handling and shutdown

- A missing KV key or prefix resolves to `undefined`, not `null` or an empty
  recursive array. A returned item's `Value` can still be `null`.
- Normal KV reads decode `Value` to a string. `buffer: true` keeps binary values;
  `raw: true` returns a Buffer without metadata, even without `buffer: true`.
- Conditional writes can resolve to `false`. Do not mistake that result for
  successful persistence.
- Use `health.node({ node: "node-name" })`; `name` is not the runtime option.
- Stop watches with `watch.end()` and then call `consul.destroy()`.

The Promise API and existing sections (`kv`, `agent`, `health`, `catalog`,
`session`, `query`, `event`, `status`, `transaction`, `acl`, and `watch`) remain.
Server support for inherited legacy endpoints still depends on your Consul
version.

## 5. Check transport customization and lifecycle

Papi has been removed. The client has no runtime dependencies and uses Node.js
`http` and `https` directly. Standard HTTPS options, private CA certificates,
client certificates, keep-alive, a custom agent, and `socketPath` remain available.
Pass TLS settings in the constructor; `agent: false` disables connection pooling.
Use `host`, `port`, and `secure` or an HTTP(S) `baseUrl` for the address, not
Node.js `hostname` or `protocol` options.

Papi plugin, middleware, and codec extension hooks are not supported. Applications
that extend or access Papi internals need to remove that integration; those hooks
are not replaced by a new extension framework. Use the public constructor and
endpoint options instead.

Lifecycle changes are intentional:

- `signal` accepts an AbortSignal per call or through `defaults`. Legacy
  EventEmitter `ctx` cancellation is retained.
- `timeout` now bounds the whole request, including receipt of the response body.
  Expiration destroys the request. Numbers are milliseconds; strings such as
  `"2s"` are accepted.
- `watch.end()` cancels both the blocking request and its retry timer.
- `destroy()` cancels the client's pending requests and watches. It closes only
  the agent it created; a caller-supplied agent survives and must be closed by
  its owner. Requests on a destroyed client fail.
- `ctx.includeResponse: true` returns response tuples across the API, with
  matching declarations rather than KV-only typing.
- Ordinary requests, including writes, are not automatically retried. Handle
  uncertain write outcomes explicitly; a transport error is not evidence that
  the server did not commit the operation.

## 6. Adopt Config Entries where needed

The new `consul.config` section provides `get({ kind, name })`, `set({ entry })`,
`list(kind)` or `list({ kind })`, and `del({ kind, name })` with a `delete()` alias.
The entry body uses the original PascalCase Consul fields. Missing reads return
`undefined`; writes and conditional deletes preserve boolean CAS results.
Successful unconditional deletes normalize Consul's empty-object response to
`true`, without asserting that the entry existed.

`cas: 0` is sent, not discarded: it means create-only on `set()`, and does not
delete an existing entry on `del()`. Omit `cas` for an unconditional operation.
Use the current `ModifyIndex` for a conditional update, and exact strings or
bigints for large CAS values. `ns` and `partition` are forwarded but still depend
on Consul Enterprise and ACL policy.

For modern intentions, use a `service-intentions` entry identified by destination
service name. Do not treat an old intention ID as that name. Writes replace the
whole entry: preserve existing sources when editing and use CAS. L4 sources use
`Action`; L7 sources use `Permissions` with HTTP match rules and require a
compatible service protocol. See the [examples](README.md#config-entries) and
[HashiCorp reference](https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions).

## Updating from 1.0.x to 1.1

No transport or connection change is required. Modern ACL resources are additive;
`acl.legacy` stays available where the server supports it. Use AccessorID for
token resource operations, and SecretID for request authentication. Login does
not change defaults. See the [ACL examples](README.md#modern-acls).

Declarations now distinguish transaction operation verbs and required CAS/session
fields. For stored arrays, use `TransactionOperation[]` or
`satisfies TransactionOperation[]` instead of allowing `Verb` to widen to
`string`. Transaction values stay base64 encoded. Config Entry types now infer
`service-defaults` and `proxy-defaults`; other kinds remain available through
`ConfigEntry`. These type checks do not change the request bodies sent to Consul.

## Verified scope and limits

The inherited API does not cover every endpoint of every Consul version, and
declarations are not a substitute for the server's configuration validation.
Acceptance covers Consul 1.22.7 and 2.0.4 Community, including real ACL and mutual
TLS scenarios. Mocks check transmission of
Enterprise namespace and partition parameters only; Enterprise behavior requires
testing against your own deployment.
No Redis-backed resolver, DNS discovery, or scoring subsystem is added.

Run application tests against your real Consul configuration before upgrading.
Test ACLs, TLS, binary KV values, CAS failures, blocking reads, watch
shutdown, and any Enterprise parameters you use.
