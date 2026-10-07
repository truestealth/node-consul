import { EventEmitter } from "node:events";
import { IncomingMessage } from "node:http";
import { expectTypeOf } from "expect-type";
import Consul from "../lib/index.js";
import type {
  ConfigEntry,
  GetOptions,
  IntentionSource,
  ProxyDefaultsEntry,
  ServiceDefaultsEntry,
  ServiceIntentionsEntry,
} from "../lib/config.js";

const consul = new Consul();
const signal = new AbortController().signal;

expectTypeOf(
  consul.config.get({
    kind: "service-defaults",
    name: "web",
    ns: "team",
    partition: "part1",
    token: "token",
    index: 12n,
    wait: "1m",
    timeout: "2m",
    signal,
  }),
).toEqualTypeOf<Promise<ServiceDefaultsEntry | undefined>>();
expectTypeOf(
  consul.config.get({ kind: "service-intentions", name: "web" }),
).toEqualTypeOf<Promise<ServiceIntentionsEntry | undefined>>();
expectTypeOf(consul.config.list("service-intentions")).toEqualTypeOf<
  Promise<ServiceIntentionsEntry[]>
>();
expectTypeOf(
  consul.config.list({ kind: "service-defaults", filter: 'Name == "web"' }),
).toEqualTypeOf<Promise<ServiceDefaultsEntry[]>>();

const intentions: ServiceIntentionsEntry = {
  Kind: "service-intentions",
  Name: "web",
  Sources: [
    { Name: "admin", Action: "allow", Namespace: "team", Partition: "part1" },
    {
      Name: "frontend",
      Peer: "remote",
      Permissions: [
        {
          Action: "allow",
          HTTP: {
            PathPrefix: "/api/",
            Methods: ["GET"],
            Header: [{ Name: "x-role", Exact: "reader", IgnoreCase: true }],
          },
        },
      ],
    },
  ],
};
expectTypeOf(consul.config.set({ entry: intentions, cas: 0 })).toEqualTypeOf<
  Promise<boolean>
>();
expectTypeOf(
  consul.config.set({
    entry: {
      Kind: "service-intentions",
      Name: "web",
      Sources: [
        {
          Name: "frontend",
          Permissions: [{ Action: "allow", HTTP: { PathPrefix: "/api/" } }],
        },
      ],
    },
  }),
).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(
  consul.config.set({
    entry: { Kind: "service-defaults", Name: "web", Protocol: "http" },
    cas: "18446744073709551615",
  }),
).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(
  consul.config.del({
    kind: "service-defaults",
    name: "web",
    cas: 42n,
    signal,
  }),
).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(
  consul.config.delete({ kind: "service-defaults", name: "web", cas: 0 }),
).toEqualTypeOf<Promise<boolean>>();

const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
expectTypeOf(
  consul.config.get({ kind: "service-intentions", name: "web", ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, ServiceIntentionsEntry?]>>();
expectTypeOf(
  consul.config.list({ kind: "service-intentions", ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, ServiceIntentionsEntry[]]>>();
expectTypeOf(
  consul.config.set({ entry: intentions, cas: 0, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, boolean]>>();
expectTypeOf(
  consul.config.del({ kind: "service-intentions", name: "web", ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, boolean]>>();
const options: GetOptions = { kind: "service-defaults", name: "web" };
expectTypeOf(consul.config.get(options)).toEqualTypeOf<
  Promise<ConfigEntry | undefined | [IncomingMessage, ConfigEntry?]>
>();

// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.get({ kind: "service-defaults" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.list({ name: "web" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.set({ entry: { Name: "web" } });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.set({ entry: intentions, cas: true });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.set({ entry: { Kind: "service-intentions", Name: "web", Sources: [ { Name: "frontend", Action: "allow", Permissions: [{ Action: "allow", HTTP: {} }], }, ], }, });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.del({ kind: "service-defaults", name: "web", signal: 1 });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
const rejected8: IntentionSource = { Name: "frontend", Action: "allow", Permissions: [{ Action: "allow", HTTP: {} }], };
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
const rejected7: IntentionSource = { Name: "frontend", Action: "invalid" };
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
const rejected6: IntentionSource = { Name: "frontend", Permissions: [{ Action: "allow" }], };

const defaults: ServiceDefaultsEntry = {
  Kind: "service-defaults",
  Name: "web",
  Protocol: "http2",
  Mode: "transparent",
  MutualTLSMode: "strict",
  UpstreamConfig: {
    Defaults: {
      ConnectTimeoutMs: 5000,
      MeshGateway: { Mode: "local" },
      Limits: { MaxConnections: 100 },
    },
    Overrides: [{ Name: "api", Protocol: "grpc", Namespace: "team" }],
  },
  AdditionalServerSetting: { enabled: true },
};
expectTypeOf(consul.config.set({ entry: defaults, cas: 0 })).toEqualTypeOf<
  Promise<boolean>
>();
const serviceDefaults = await consul.config.get({
  kind: "service-defaults",
  name: "web",
});
expectTypeOf(serviceDefaults?.Protocol).toEqualTypeOf<
  "" | "tcp" | "http" | "http2" | "grpc" | undefined
>();
expectTypeOf(
  serviceDefaults?.UpstreamConfig?.Defaults?.ConnectTimeoutMs,
).toEqualTypeOf<number | undefined>();
expectTypeOf(
  consul.config.get({ kind: "proxy-defaults", name: "global" }),
).toEqualTypeOf<Promise<ProxyDefaultsEntry | undefined>>();
expectTypeOf(consul.config.list("proxy-defaults")).toEqualTypeOf<
  Promise<ProxyDefaultsEntry[]>
>();
expectTypeOf(
  consul.config.set({
    entry: {
      Kind: "proxy-defaults",
      Name: "global",
      Config: { protocol: "http", envoy_cluster_json: { custom: true } },
      Expose: {
        Paths: [{ Path: "/metrics", LocalPathPort: 9000, ListenerPort: 9001 }],
      },
    },
  }),
).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(
  consul.config.get({ kind: "service-defaults", name: "web", ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, ServiceDefaultsEntry?]>>();
expectTypeOf(
  consul.config.get({ kind: "future-kind", name: "web" }),
).toEqualTypeOf<Promise<ConfigEntry<"future-kind"> | undefined>>();
expectTypeOf(
  consul.config.set({
    entry: { Kind: "future-kind", Name: "web", ArbitrarySetting: [1, 2] },
  }),
).toEqualTypeOf<Promise<boolean>>();
const rawEntry: ConfigEntry = {
  Kind: "service-defaults",
  Name: "web",
  NewServerField: true,
};
expectTypeOf(consul.config.set({ entry: rawEntry })).toEqualTypeOf<
  Promise<boolean>
>();
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.set({ entry: { Kind: "service-defaults", Name: "web", Protocol: "https" }, });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.set({ entry: { Kind: "service-defaults", Name: "web", Protocol: 123 }, });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.set({ entry: { Kind: "proxy-defaults", Name: "not-global" } });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.config.set({ entry: { Kind: "proxy-defaults", Name: "global", MeshGateway: { Mode: "invalid" }, }, });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
const rejected1: ServiceDefaultsEntry = { Kind: "service-defaults", Name: "web", UpstreamConfig: { Overrides: [{ Protocol: "http" }] }, };
