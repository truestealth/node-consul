import { EventEmitter } from "node:events";
import { Agent } from "node:https";
import type { IncomingMessage } from "node:http";
import { expectTypeOf } from "expect-type";
import Consul from "../lib/index.js";
import type { CommonOptions, QueryMeta, ResponseResult } from "../lib/index.js";
import type { BootstrapResult, ReplicationResult } from "../lib/acl.js";
import type { InfoResult as AclInfoResult } from "../lib/acl/legacy.js";
import type { ListResult as CheckListResult } from "../lib/agent/check.js";
import type { ListResult as ServiceListResult } from "../lib/agent/service.js";
import type { NodeResult, NodeOptions } from "../lib/health.js";
import type { CreateResult as QueryCreateResult } from "../lib/query.js";
import type {
  InfoResult,
  CreateResult as SessionCreateResult,
} from "../lib/session.js";
import type {
  CreateResult as TransactionCreateResult,
  Operation,
} from "../lib/transaction.js";
import type { FireResult } from "../lib/event.js";
import type { Watch } from "../lib/watch.js";

const consul = new Consul({
  baseUrl: new URL("https://127.0.0.1:8501/v1"),
  ca: Buffer.from("ca"),
  cert: Buffer.from("cert"),
  key: Buffer.from("key"),
  servername: "consul.local",
  socketPath: "/run/consul.sock",
  agent: new Agent({ keepAlive: true }),
  headers: { "x-client": "consumer" },
  timeout: "5s",
  defaults: {
    ns: "team",
    partition: "default",
    signal: new AbortController().signal,
  },
});
expectTypeOf(
  new Consul({ agent: false, timeout: 1000 }),
).toEqualTypeOf<Consul>();
expectTypeOf(
  new Consul({ host: "consul.example", port: 8501, secure: true }),
).toEqualTypeOf<Consul>();
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
new Consul({ hostname: "consul.example" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
new Consul({ protocol: "https:" });
expectTypeOf(consul.on("log", () => {})).toEqualTypeOf<Consul>();
expectTypeOf(Consul.parseQueryMeta()).toEqualTypeOf<QueryMeta>();
expectTypeOf(
  Consul.parseQueryMeta({ headers: { "x-consul-index": "42" } }),
).toEqualTypeOf<QueryMeta>();
expectTypeOf(null as unknown as ResponseResult<undefined, true>).toEqualTypeOf<
  [IncomingMessage]
>();
expectTypeOf(null as unknown as ResponseResult<any, true>).toEqualTypeOf<
  [IncomingMessage, any]
>();

const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
const common = { ctx, signal: new AbortController().signal, timeout: "1s" };

expectTypeOf(consul.acl.replication(common)).toEqualTypeOf<
  Promise<[IncomingMessage, ReplicationResult]>
>();
const replication = await consul.acl.replication();
expectTypeOf(replication.ReplicationType).toEqualTypeOf<
  "" | "policies" | "tokens"
>();
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
replication.ReplicatedType;
expectTypeOf(
  consul.acl.bootstrap({
    bootstrapSecret: "11111111-2222-4333-8444-555555555555",
  }),
).toEqualTypeOf<Promise<BootstrapResult>>();
expectTypeOf(consul.acl.bootstrap(common)).toEqualTypeOf<
  Promise<[IncomingMessage, BootstrapResult]>
>();
const bootstrapped = await consul.acl.bootstrap();
expectTypeOf(bootstrapped.ID).toEqualTypeOf<string>();
expectTypeOf(bootstrapped.SecretID).toEqualTypeOf<string>();
expectTypeOf(bootstrapped.AccessorID).toEqualTypeOf<string>();
expectTypeOf(consul.acl.legacy.info({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, AclInfoResult?]>
>();
expectTypeOf(consul.acl.legacy.get("id")).toEqualTypeOf<
  Promise<AclInfoResult | undefined>
>();
expectTypeOf(consul.acl.legacy.update({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(consul.acl.legacy.destroy({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(consul.acl.legacy.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, AclInfoResult[]]>
>();

expectTypeOf(consul.agent.check.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, CheckListResult]>
>();
expectTypeOf(consul.agent.checks(common)).toEqualTypeOf<
  Promise<[IncomingMessage, CheckListResult]>
>();
expectTypeOf(
  consul.agent.check.register({ name: "check", ttl: "10s", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(
  consul.agent.check.deregister({ id: "id", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(consul.agent.check.pass({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(consul.agent.check.warn({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(consul.agent.check.fail({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(consul.agent.service.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, ServiceListResult]>
>();
expectTypeOf(consul.agent.services(common)).toEqualTypeOf<
  Promise<[IncomingMessage, ServiceListResult]>
>();
expectTypeOf(
  consul.agent.service.register({ name: "service", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(
  consul.agent.service.register({
    name: "consul-smoke-service",
    check: { ttl: "30s", deregistercriticalserviceafter: "1m" },
  }),
).toEqualTypeOf<Promise<undefined>>();
expectTypeOf(
  consul.agent.service.register({
    name: "consul-smoke-service",
    checks: [{ ttl: "30s" }, { name: "named check", ttl: "30s" }],
  }),
).toEqualTypeOf<Promise<undefined>>();
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.agent.check.register({ ttl: "30s" });
expectTypeOf(
  consul.agent.service.deregister({ id: "id", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(
  consul.agent.service.maintenance({ id: "id", enable: true, ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(consul.agent.reload(common)).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(
  consul.agent.maintenance({ enable: true, ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(
  consul.agent.join({ address: "127.0.0.2", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(
  consul.agent.forceLeave({ node: "node1", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(consul.agent.self(common)).toEqualTypeOf<
  Promise<[IncomingMessage, any]>
>();
expectTypeOf(consul.agent.members(common)).toEqualTypeOf<
  Promise<[IncomingMessage, any[]]>
>();

expectTypeOf(consul.catalog.datacenters(common)).toEqualTypeOf<
  Promise<[IncomingMessage, string[]]>
>();
expectTypeOf(consul.catalog.nodes()).toEqualTypeOf<Promise<any[]>>();
expectTypeOf(consul.catalog.nodes(common)).toEqualTypeOf<
  Promise<[IncomingMessage, any[]]>
>();
expectTypeOf(consul.catalog.node.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, any[]]>
>();
expectTypeOf(
  consul.catalog.node.services({ node: "node1", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage, any]>>();
expectTypeOf(consul.catalog.services(common)).toEqualTypeOf<
  Promise<[IncomingMessage, Record<string, string[]>]>
>();
expectTypeOf(consul.catalog.service.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, Record<string, string[]>]>
>();
expectTypeOf(
  consul.catalog.service.nodes({ service: "web", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage, any[]]>>();
expectTypeOf(
  consul.catalog.connect.nodes({ service: "web", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage, any[]]>>();
expectTypeOf(
  consul.catalog.register({ node: "node1", address: "127.0.0.1", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(
  consul.catalog.deregister({ node: "node1", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();

expectTypeOf(consul.health.node({ node: "node1", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, NodeResult]>
>();
expectTypeOf(consul.health.checks({ service: "web", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, NodeResult]>
>();
expectTypeOf(
  consul.health.state({ state: "passing", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage, NodeResult]>>();
expectTypeOf(
  consul.health.service({ service: "web", ...common }),
).toEqualTypeOf<Promise<[IncomingMessage, any[]]>>();

expectTypeOf(
  consul.query.create({ service: { service: "web" }, ...common }),
).toEqualTypeOf<Promise<[IncomingMessage, QueryCreateResult]>>();
expectTypeOf(consul.query.get({ query: "query", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, any]>
>();
expectTypeOf(
  consul.query.update({
    query: "query",
    service: { service: "web" },
    ...common,
  }),
).toEqualTypeOf<Promise<[IncomingMessage]>>();
expectTypeOf(consul.query.destroy({ query: "query", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(consul.query.destroy("query")).toEqualTypeOf<Promise<undefined>>();
expectTypeOf(consul.query.execute({ query: "query", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, any]>
>();
expectTypeOf(consul.query.explain({ query: "query", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, any]>
>();
expectTypeOf(consul.query.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, any[]]>
>();

expectTypeOf(consul.session.create(common)).toEqualTypeOf<
  Promise<[IncomingMessage, SessionCreateResult]>
>();
expectTypeOf(consul.session.destroy({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage]>
>();
expectTypeOf(consul.session.destroy("id")).toEqualTypeOf<Promise<undefined>>();
expectTypeOf(consul.session.info("id")).toEqualTypeOf<
  Promise<InfoResult | undefined>
>();
expectTypeOf(consul.session.info({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, InfoResult?]>
>();
expectTypeOf(consul.session.get({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, InfoResult?]>
>();
expectTypeOf(consul.session.node({ node: "node1", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, InfoResult[]]>
>();
expectTypeOf(consul.session.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, InfoResult[]]>
>();
expectTypeOf(consul.session.renew({ id: "id", ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, InfoResult[]]>
>();
expectTypeOf(consul.status.leader(common)).toEqualTypeOf<
  Promise<[IncomingMessage, string]>
>();
expectTypeOf(consul.status.peers(common)).toEqualTypeOf<
  Promise<[IncomingMessage, string[]]>
>();

const operations: Operation[] = [
  { KV: { Verb: "set", Key: "key", Value: "dmFsdWU=" } },
];
expectTypeOf(consul.transaction.create(operations)).toEqualTypeOf<
  Promise<TransactionCreateResult>
>();
expectTypeOf(consul.transaction.create(operations, common)).toEqualTypeOf<
  Promise<[IncomingMessage, TransactionCreateResult]>
>();
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create({ operations });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ verb: "set", key: "key" }]);

expectTypeOf(consul.event.fire({ name: "event" })).toEqualTypeOf<
  Promise<FireResult>
>();
expectTypeOf(consul.event.fire("event", Buffer.from("payload"))).toEqualTypeOf<
  Promise<FireResult<Buffer>>
>();
expectTypeOf(
  consul.event.fire({
    name: "event",
    payload: Buffer.from("payload"),
    ...common,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, FireResult<Buffer>]>>();
expectTypeOf(consul.event.list({ buffer: true, ...common })).toEqualTypeOf<
  Promise<[IncomingMessage, FireResult<Buffer>[]]>
>();
expectTypeOf(consul.event.list(common)).toEqualTypeOf<
  Promise<[IncomingMessage, FireResult[]]>
>();

const options: NodeOptions = { node: "node1" };
expectTypeOf(consul.health.node(options)).toEqualTypeOf<
  Promise<NodeResult | [IncomingMessage, NodeResult]>
>();
const withoutResponse = Object.assign(new EventEmitter(), {
  includeResponse: false as const,
});
expectTypeOf(
  consul.health.node({ node: "node1", ctx: withoutResponse }),
).toEqualTypeOf<Promise<NodeResult>>();
const ambiguous: CommonOptions = { ctx: new EventEmitter() };
expectTypeOf(consul.status.leader(ambiguous)).toEqualTypeOf<
  Promise<string | [IncomingMessage, string]>
>();

const watch = consul.watch({
  method: consul.kv.get,
  options: { key: "key", recurse: true, index: 42n },
  signal: new AbortController().signal,
});
expectTypeOf(watch).toEqualTypeOf<Watch>();
expectTypeOf(watch.updateTime()).toEqualTypeOf<number | undefined>();
expectTypeOf(
  consul.watch({ method: consul.catalog.services }),
).toEqualTypeOf<Watch>();
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
new Consul({ defaults: { index: 1 } });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.health.node({ node: "node1", signal: "invalid" });
