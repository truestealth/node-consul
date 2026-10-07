import { EventEmitter } from "node:events";
import { Agent } from "node:https";
import type { IncomingMessage } from "node:http";
import { expectType, expectError } from "tsd";
import Consul from "../lib/index.js";
import type { CommonOptions, QueryMeta, ResponseResult } from "../lib/index.js";
import type { ReplicationResult } from "../lib/acl.js";
import type { AclTokenResult } from "../lib/acl/modern.js";
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
expectType<Consul>(new Consul({ agent: false, timeout: 1000 }));
expectType<Consul>(
  new Consul({ host: "consul.example", port: 8501, secure: true }),
);
expectError(new Consul({ hostname: "consul.example" }));
expectError(new Consul({ protocol: "https:" }));
expectType<Consul>(consul.on("log", () => {}));
expectType<QueryMeta>(Consul.parseQueryMeta());
expectType<QueryMeta>(
  Consul.parseQueryMeta({ headers: { "x-consul-index": "42" } }),
);
expectType<[IncomingMessage]>(
  null as unknown as ResponseResult<undefined, true>,
);
expectType<[IncomingMessage, any]>(
  null as unknown as ResponseResult<any, true>,
);

const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
const common = { ctx, signal: new AbortController().signal, timeout: "1s" };

expectType<Promise<[IncomingMessage, ReplicationResult]>>(
  consul.acl.replication(common),
);
const replication = await consul.acl.replication();
expectType<"" | "policies" | "tokens">(replication.ReplicationType);
expectError(replication.ReplicatedType);
expectType<Promise<AclTokenResult>>(
  consul.acl.bootstrap({
    bootstrapSecret: "11111111-2222-4333-8444-555555555555",
  }),
);
expectType<Promise<[IncomingMessage, AclTokenResult]>>(
  consul.acl.bootstrap(common),
);
expectType<Promise<[IncomingMessage, AclInfoResult?]>>(
  consul.acl.legacy.info({ id: "id", ...common }),
);
expectType<Promise<AclInfoResult | undefined>>(consul.acl.legacy.get("id"));
expectType<Promise<[IncomingMessage]>>(
  consul.acl.legacy.update({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.acl.legacy.destroy({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage, AclInfoResult[]]>>(
  consul.acl.legacy.list(common),
);

expectType<Promise<[IncomingMessage, CheckListResult]>>(
  consul.agent.check.list(common),
);
expectType<Promise<[IncomingMessage, CheckListResult]>>(
  consul.agent.checks(common),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.check.register({ name: "check", ttl: "10s", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.check.deregister({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.check.pass({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.check.warn({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.check.fail({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage, ServiceListResult]>>(
  consul.agent.service.list(common),
);
expectType<Promise<[IncomingMessage, ServiceListResult]>>(
  consul.agent.services(common),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.service.register({ name: "service", ...common }),
);
expectType<Promise<undefined>>(
  consul.agent.service.register({
    name: "consul-smoke-service",
    check: { ttl: "30s", deregistercriticalserviceafter: "1m" },
  }),
);
expectType<Promise<undefined>>(
  consul.agent.service.register({
    name: "consul-smoke-service",
    checks: [{ ttl: "30s" }, { name: "named check", ttl: "30s" }],
  }),
);
expectError(consul.agent.check.register({ ttl: "30s" }));
expectType<Promise<[IncomingMessage]>>(
  consul.agent.service.deregister({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.service.maintenance({ id: "id", enable: true, ...common }),
);
expectType<Promise<[IncomingMessage]>>(consul.agent.reload(common));
expectType<Promise<[IncomingMessage]>>(
  consul.agent.maintenance({ enable: true, ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.join({ address: "127.0.0.2", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.agent.forceLeave({ node: "node1", ...common }),
);
expectType<Promise<[IncomingMessage, any]>>(consul.agent.self(common));
expectType<Promise<[IncomingMessage, any[]]>>(consul.agent.members(common));

expectType<Promise<[IncomingMessage, string[]]>>(
  consul.catalog.datacenters(common),
);
expectType<Promise<any[]>>(consul.catalog.nodes());
expectType<Promise<[IncomingMessage, any[]]>>(consul.catalog.nodes(common));
expectType<Promise<[IncomingMessage, any[]]>>(consul.catalog.node.list(common));
expectType<Promise<[IncomingMessage, any]>>(
  consul.catalog.node.services({ node: "node1", ...common }),
);
expectType<Promise<[IncomingMessage, Record<string, string[]>]>>(
  consul.catalog.services(common),
);
expectType<Promise<[IncomingMessage, Record<string, string[]>]>>(
  consul.catalog.service.list(common),
);
expectType<Promise<[IncomingMessage, any[]]>>(
  consul.catalog.service.nodes({ service: "web", ...common }),
);
expectType<Promise<[IncomingMessage, any[]]>>(
  consul.catalog.connect.nodes({ service: "web", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.catalog.register({ node: "node1", address: "127.0.0.1", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.catalog.deregister({ node: "node1", ...common }),
);

expectType<Promise<[IncomingMessage, NodeResult]>>(
  consul.health.node({ node: "node1", ...common }),
);
expectType<Promise<[IncomingMessage, NodeResult]>>(
  consul.health.checks({ service: "web", ...common }),
);
expectType<Promise<[IncomingMessage, NodeResult]>>(
  consul.health.state({ state: "passing", ...common }),
);
expectType<Promise<[IncomingMessage, any[]]>>(
  consul.health.service({ service: "web", ...common }),
);

expectType<Promise<[IncomingMessage, QueryCreateResult]>>(
  consul.query.create({ service: { service: "web" }, ...common }),
);
expectType<Promise<[IncomingMessage, any]>>(
  consul.query.get({ query: "query", ...common }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.query.update({
    query: "query",
    service: { service: "web" },
    ...common,
  }),
);
expectType<Promise<[IncomingMessage]>>(
  consul.query.destroy({ query: "query", ...common }),
);
expectType<Promise<undefined>>(consul.query.destroy("query"));
expectType<Promise<[IncomingMessage, any]>>(
  consul.query.execute({ query: "query", ...common }),
);
expectType<Promise<[IncomingMessage, any]>>(
  consul.query.explain({ query: "query", ...common }),
);
expectType<Promise<[IncomingMessage, any[]]>>(consul.query.list(common));

expectType<Promise<[IncomingMessage, SessionCreateResult]>>(
  consul.session.create(common),
);
expectType<Promise<[IncomingMessage]>>(
  consul.session.destroy({ id: "id", ...common }),
);
expectType<Promise<undefined>>(consul.session.destroy("id"));
expectType<Promise<InfoResult | undefined>>(consul.session.info("id"));
expectType<Promise<[IncomingMessage, InfoResult?]>>(
  consul.session.info({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage, InfoResult?]>>(
  consul.session.get({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage, InfoResult[]]>>(
  consul.session.node({ node: "node1", ...common }),
);
expectType<Promise<[IncomingMessage, InfoResult[]]>>(
  consul.session.list(common),
);
expectType<Promise<[IncomingMessage, InfoResult[]]>>(
  consul.session.renew({ id: "id", ...common }),
);
expectType<Promise<[IncomingMessage, string]>>(consul.status.leader(common));
expectType<Promise<[IncomingMessage, string[]]>>(consul.status.peers(common));

const operations: Operation[] = [
  { KV: { Verb: "set", Key: "key", Value: "dmFsdWU=" } },
];
expectType<Promise<TransactionCreateResult>>(
  consul.transaction.create(operations),
);
expectType<Promise<[IncomingMessage, TransactionCreateResult]>>(
  consul.transaction.create(operations, common),
);
expectError(consul.transaction.create({ operations }));
expectError(consul.transaction.create([{ verb: "set", key: "key" }]));

expectType<Promise<FireResult>>(consul.event.fire({ name: "event" }));
expectType<Promise<FireResult<Buffer>>>(
  consul.event.fire("event", Buffer.from("payload")),
);
expectType<Promise<[IncomingMessage, FireResult<Buffer>]>>(
  consul.event.fire({
    name: "event",
    payload: Buffer.from("payload"),
    ...common,
  }),
);
expectType<Promise<[IncomingMessage, FireResult<Buffer>[]]>>(
  consul.event.list({ buffer: true, ...common }),
);
expectType<Promise<[IncomingMessage, FireResult[]]>>(consul.event.list(common));

const options: NodeOptions = { node: "node1" };
expectType<Promise<NodeResult | [IncomingMessage, NodeResult]>>(
  consul.health.node(options),
);
const withoutResponse = Object.assign(new EventEmitter(), {
  includeResponse: false as const,
});
expectType<Promise<NodeResult>>(
  consul.health.node({ node: "node1", ctx: withoutResponse }),
);
const ambiguous: CommonOptions = { ctx: new EventEmitter() };
expectType<Promise<string | [IncomingMessage, string]>>(
  consul.status.leader(ambiguous),
);

const watch = consul.watch({
  method: consul.kv.get,
  options: { key: "key", recurse: true, index: 42n },
  signal: new AbortController().signal,
});
expectType<Watch>(watch);
expectType<number | undefined>(watch.updateTime());
expectType<Watch>(consul.watch({ method: consul.catalog.services }));
expectError(new Consul({ defaults: { index: 1 } }));
expectError(consul.health.node({ node: "node1", signal: "invalid" }));
