# Migrating to 1.0

[Русский](MIGRATION.ru.md) · [Package documentation](README.md)

This guide applies to `consul@2.x` and `@truestealth/consul@0.1.x` applications.
The `1.0.0-beta.1` preview introduces the module-format change first. Transport
and API additions will follow before the stable 1.0.0 release; do not assume
features from the roadmap are already available.

## 1. Update Node.js and the dependency

Use Node.js 24 or newer. Test the application on Node.js 24; this package also
runs CI on Node.js 26.

```sh
npm uninstall consul
npm install @truestealth/consul@1.0.0-beta.1
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

## Preview limits

Papi is still the HTTP transport in `1.0.0-beta.1`. The preview has not yet added
native AbortSignal, Config Entries, or service-intentions through Config Entries.
It also retains the old ownership rule: `destroy()` destroys a custom agent.
Avoid sharing that agent. `ctx` cancellation remains available; response-tuple
typing for `ctx.includeResponse: true` is currently correct only for KV methods.

Run application tests against your real Consul configuration before adopting the
preview. Test ACLs, TLS, binary KV values, CAS failures, blocking reads, watch
shutdown, and any Enterprise parameters you use.
