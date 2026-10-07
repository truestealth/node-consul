# Migrating to 1.0

[Русский](MIGRATION.ru.md) · [Package documentation](README.md)

This guide applies to `consul@2.x` and `@truestealth/consul@0.1.x` applications.
The `1.0.0-beta.2` preview includes the ESM conversion and native Node.js HTTP
transport. Config Entries will follow before stable 1.0.0; do not assume every
feature from the roadmap is already available.

## 1. Update Node.js and the dependency

Use Node.js 24 or newer. Test the application on Node.js 24; this package also
runs CI on Node.js 26.

```sh
npm uninstall consul
npm install @truestealth/consul@1.0.0-beta.2
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

There is only one package implementation, written as ES modules. Do not rely on
`require()` returning the constructor or import internal `lib/` paths. A
CommonJS application can load the public entry point asynchronously:

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

For a Node.js application, use `module: "NodeNext"` and
`moduleResolution: "NodeNext"`. Your TypeScript sources must belong to an ESM
package, or use `.mts`. Replace `import Consul = require("consul")` with the
default import above. Declarations are shipped alongside the source; no separate
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

## Preview limits

Config Entries and service-intentions through Config Entries are not included
in `1.0.0-beta.2`. The inherited API does not cover every endpoint of every Consul
version. No Redis-backed resolver, DNS discovery, or scoring subsystem is added.

Run application tests against your real Consul configuration before adopting the
preview. Test ACLs, TLS, binary KV values, CAS failures, blocking reads, watch
shutdown, and any Enterprise parameters you use.
