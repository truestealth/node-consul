import { expectType, expectError } from "tsd";
import { EventEmitter } from "node:events";

import Consul, { Consul as NamedConsul } from "../lib/index.js";

const consul = new Consul();

expectType<typeof Consul>(NamedConsul);
expectType<Consul>(consul);

consul.health.node({
  node: "node1",
  timeout: "1s",
  ctx: new EventEmitter(),
  wait: "5m",
  index: "9007199254740993",
  partition: "default",
  consistent: true,
});
consul.health.service({ service: "service1", index: 10, stale: true });
consul.agent.check.register({ name: "check1", ttl: "10s" });
consul.agent.service.register({
  name: "service1",
  check: { name: "check1", ttl: "10s" },
});
expectError(consul.health.node({ name: "node1" }));
expectError(consul.health.node({ node: "node1", timeout: false }));
