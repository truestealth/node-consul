import { expectTypeOf } from "expect-type";
import Consul from "../lib/index.js";
import type { ConsulLogData } from "../lib/index.js";
import type { Watch } from "../lib/watch.js";

const consul = new Consul();

expectTypeOf(
  consul.watch({
    method: consul.kv.get,
    options: { key: "configuration", wait: "5m" },
    rateLimit: 15000,
    backoffJitter: true,
  }),
).toEqualTypeOf<Watch>();
expectTypeOf(
  consul.watch({ method: consul.catalog.services, rateLimit: 0 }),
).toEqualTypeOf<Watch>();
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.watch({ method: consul.kv.get, rateLimit: "15s" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.watch({ method: consul.kv.get, backoffJitter: 0.5 });

expectTypeOf(
  consul.on("log", (tags, data) => {
    expectTypeOf(tags).toEqualTypeOf<string[]>();
    expectTypeOf(data).toEqualTypeOf<ConsulLogData>();
    expectTypeOf(data.name).toEqualTypeOf<string>();
    expectTypeOf(data.durationMs).toEqualTypeOf<number>();
    expectTypeOf(data.statusCode).toEqualTypeOf<number | undefined>();
    expectTypeOf(data.errorCode).toEqualTypeOf<string | undefined>();
  }),
).toEqualTypeOf<Consul>();
consul.once("log", (tags, data) => {
  expectTypeOf(tags).toEqualTypeOf<string[]>();
  expectTypeOf(data).toEqualTypeOf<ConsulLogData>();
});
consul.addListener("log", (tags, data) => {
  expectTypeOf(data.outcome).toEqualTypeOf<ConsulLogData["outcome"]>();
});
consul.off("log", (_tags, data: ConsulLogData) => {});
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.on("log", (tags: number[]) => {});
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.once("log", (_tags, data: string) => {});
expectTypeOf(
  consul.on("custom-event", (value: string) => {}),
).toEqualTypeOf<Consul>();
expectTypeOf(
  consul.on(Symbol("custom-event"), () => {}),
).toEqualTypeOf<Consul>();
