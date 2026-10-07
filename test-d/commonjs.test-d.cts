import Consul = require("@truestealth/consul");
import type {
  CommonOptions,
  ConsulOptions,
  ServiceIntentionsEntry,
  TransactionOperation,
  TransactionCreateResult,
  AclTokenResult,
} from "@truestealth/consul";
import { expectTypeOf } from "expect-type";

const options: ConsulOptions = { defaults: { timeout: "1s" } };
const consul = new Consul(options);
const common: CommonOptions<false> = { signal: new AbortController().signal };
expectTypeOf(consul).toEqualTypeOf<Consul>();
expectTypeOf(consul.kv.get({ raw: true, ...common })).toEqualTypeOf<
  Promise<Buffer | undefined>
>();
expectTypeOf(
  consul.config.get({ kind: "service-intentions", name: "web" }),
).toEqualTypeOf<Promise<ServiceIntentionsEntry | undefined>>();
const operations: TransactionOperation[] = [
  { KV: { Verb: "set", Key: "consul-smoke-key", Value: "dmFsdWU=" } },
];
expectTypeOf(consul.transaction.create(operations)).toEqualTypeOf<
  Promise<TransactionCreateResult>
>();
expectTypeOf(consul.acl.token.self()).toEqualTypeOf<
  Promise<AclTokenResult | undefined>
>();
consul.destroy();
