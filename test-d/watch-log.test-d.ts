import { expectError, expectType } from "tsd";
import Consul from "../lib/index.js";
import type { ConsulLogData } from "../lib/index.js";
import type { Watch } from "../lib/watch.js";

const consul = new Consul();

expectType<Watch>(
  consul.watch({
    method: consul.kv.get,
    options: { key: "configuration", wait: "5m" },
    rateLimit: 15000,
    backoffJitter: true,
  }),
);
expectType<Watch>(
  consul.watch({ method: consul.catalog.services, rateLimit: 0 }),
);
expectError(consul.watch({ method: consul.kv.get, rateLimit: "15s" }));
expectError(consul.watch({ method: consul.kv.get, backoffJitter: 0.5 }));

expectType<Consul>(
  consul.on("log", (tags, data) => {
    expectType<string[]>(tags);
    expectType<ConsulLogData>(data);
    expectType<string>(data.name);
    expectType<number>(data.durationMs);
    expectType<number | undefined>(data.statusCode);
    expectType<string | undefined>(data.errorCode);
  }),
);
consul.once("log", (tags, data) => {
  expectType<string[]>(tags);
  expectType<ConsulLogData>(data);
});
consul.addListener("log", (tags, data) => {
  expectType<ConsulLogData["outcome"]>(data.outcome);
});
consul.off("log", (_tags, data: ConsulLogData) => {});
expectError(consul.on("log", (tags: number[]) => {}));
expectError(consul.once("log", (_tags, data: string) => {}));
expectType<Consul>(consul.on("custom-event", (value: string) => {}));
expectType<Consul>(consul.on(Symbol("custom-event"), () => {}));
