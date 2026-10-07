import { EventEmitter } from "node:events";
import { IncomingMessage } from "node:http";
import { expectType, expectError } from "tsd";
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

expectType<Promise<ServiceDefaultsEntry | undefined>>(
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
);
expectType<Promise<ServiceIntentionsEntry | undefined>>(
  consul.config.get({ kind: "service-intentions", name: "web" }),
);
expectType<Promise<ServiceIntentionsEntry[]>>(
  consul.config.list("service-intentions"),
);
expectType<Promise<ServiceDefaultsEntry[]>>(
  consul.config.list({ kind: "service-defaults", filter: 'Name == "web"' }),
);

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
expectType<Promise<boolean>>(consul.config.set({ entry: intentions, cas: 0 }));
expectType<Promise<boolean>>(
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
);
expectType<Promise<boolean>>(
  consul.config.set({
    entry: { Kind: "service-defaults", Name: "web", Protocol: "http" },
    cas: "18446744073709551615",
  }),
);
expectType<Promise<boolean>>(
  consul.config.del({
    kind: "service-defaults",
    name: "web",
    cas: 42n,
    signal,
  }),
);
expectType<Promise<boolean>>(
  consul.config.delete({ kind: "service-defaults", name: "web", cas: 0 }),
);

const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
expectType<Promise<[IncomingMessage, ServiceIntentionsEntry?]>>(
  consul.config.get({ kind: "service-intentions", name: "web", ctx }),
);
expectType<Promise<[IncomingMessage, ServiceIntentionsEntry[]]>>(
  consul.config.list({ kind: "service-intentions", ctx }),
);
expectType<Promise<[IncomingMessage, boolean]>>(
  consul.config.set({ entry: intentions, cas: 0, ctx }),
);
expectType<Promise<[IncomingMessage, boolean]>>(
  consul.config.del({ kind: "service-intentions", name: "web", ctx }),
);
const options: GetOptions = { kind: "service-defaults", name: "web" };
expectType<Promise<ConfigEntry | undefined | [IncomingMessage, ConfigEntry?]>>(
  consul.config.get(options),
);

expectError(consul.config.get({ kind: "service-defaults" }));
expectError(consul.config.list({ name: "web" }));
expectError(consul.config.set({ entry: { Name: "web" } }));
expectError(consul.config.set({ entry: intentions, cas: true }));
expectError(
  consul.config.set({
    entry: {
      Kind: "service-intentions",
      Name: "web",
      Sources: [
        {
          Name: "frontend",
          Action: "allow",
          Permissions: [{ Action: "allow", HTTP: {} }],
        },
      ],
    },
  }),
);
expectError(
  consul.config.del({ kind: "service-defaults", name: "web", signal: 1 }),
);
expectError<IntentionSource>({
  Name: "frontend",
  Action: "allow",
  Permissions: [{ Action: "allow", HTTP: {} }],
});
expectError<IntentionSource>({ Name: "frontend", Action: "invalid" });
expectError<IntentionSource>({
  Name: "frontend",
  Permissions: [{ Action: "allow" }],
});

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
expectType<Promise<boolean>>(consul.config.set({ entry: defaults, cas: 0 }));
const serviceDefaults = await consul.config.get({
  kind: "service-defaults",
  name: "web",
});
expectType<"" | "tcp" | "http" | "http2" | "grpc" | undefined>(
  serviceDefaults?.Protocol,
);
expectType<number | undefined>(
  serviceDefaults?.UpstreamConfig?.Defaults?.ConnectTimeoutMs,
);
expectType<Promise<ProxyDefaultsEntry | undefined>>(
  consul.config.get({ kind: "proxy-defaults", name: "global" }),
);
expectType<Promise<ProxyDefaultsEntry[]>>(consul.config.list("proxy-defaults"));
expectType<Promise<boolean>>(
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
);
expectType<Promise<[IncomingMessage, ServiceDefaultsEntry?]>>(
  consul.config.get({ kind: "service-defaults", name: "web", ctx }),
);
expectType<Promise<ConfigEntry<"future-kind"> | undefined>>(
  consul.config.get({ kind: "future-kind", name: "web" }),
);
expectType<Promise<boolean>>(
  consul.config.set({
    entry: { Kind: "future-kind", Name: "web", ArbitrarySetting: [1, 2] },
  }),
);
const rawEntry: ConfigEntry = {
  Kind: "service-defaults",
  Name: "web",
  NewServerField: true,
};
expectType<Promise<boolean>>(consul.config.set({ entry: rawEntry }));
expectError(
  consul.config.set({
    entry: { Kind: "service-defaults", Name: "web", Protocol: "https" },
  }),
);
expectError(
  consul.config.set({
    entry: { Kind: "service-defaults", Name: "web", Protocol: 123 },
  }),
);
expectError(
  consul.config.set({
    entry: { Kind: "proxy-defaults", Name: "not-global" },
  }),
);
expectError(
  consul.config.set({
    entry: {
      Kind: "proxy-defaults",
      Name: "global",
      MeshGateway: { Mode: "invalid" },
    },
  }),
);
expectError<ServiceDefaultsEntry>({
  Kind: "service-defaults",
  Name: "web",
  UpstreamConfig: { Overrides: [{ Protocol: "http" }] },
});
