import { EventEmitter } from "node:events";
import { IncomingMessage } from "node:http";
import { expectTypeOf } from "expect-type";
import Consul from "../lib/index.js";
import { GetItem, GetOptions } from "../lib/kv.js";

const consul = new Consul();

expectTypeOf(consul.kv.get("key")).toEqualTypeOf<
  Promise<GetItem | undefined>
>();
expectTypeOf(consul.kv.get()).toEqualTypeOf<Promise<GetItem | undefined>>();
expectTypeOf(consul.kv.get({ recurse: false })).toEqualTypeOf<
  Promise<GetItem | undefined>
>();
expectTypeOf(consul.kv.get({ recurse: true })).toEqualTypeOf<
  Promise<GetItem[] | undefined>
>();
expectTypeOf(consul.kv.get({ raw: true })).toEqualTypeOf<
  Promise<Buffer | undefined>
>();
expectTypeOf(
  consul.kv.get({ raw: true, recurse: true, buffer: false }),
).toEqualTypeOf<Promise<Buffer | undefined>>();
expectTypeOf(consul.kv.get({ key: "key", buffer: true })).toEqualTypeOf<
  Promise<GetItem<Buffer> | undefined>
>();
expectTypeOf(consul.kv.get({ recurse: true, buffer: true })).toEqualTypeOf<
  Promise<GetItem<Buffer>[] | undefined>
>();

const recurse: boolean = Math.random() > 0.5;
expectTypeOf(consul.kv.get({ recurse })).toEqualTypeOf<
  Promise<GetItem | GetItem[] | undefined>
>();
const options: GetOptions = { key: "key" };
expectTypeOf(consul.kv.get(options)).toEqualTypeOf<
  Promise<
    | GetItem<string | Buffer>
    | GetItem<string | Buffer>[]
    | Buffer
    | undefined
    | [
        IncomingMessage,
        (GetItem<string | Buffer> | GetItem<string | Buffer>[] | Buffer)?,
      ]
  >
>();

const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
expectTypeOf(consul.kv.get({ raw: true, ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, Buffer?]>
>();
expectTypeOf(consul.kv.get({ recurse: true, ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, GetItem[]?]>
>();
expectTypeOf(consul.kv.keys({ ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, string[]]>
>();
expectTypeOf(consul.kv.set({ key: "key", value: "value", ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, boolean]>
>();
expectTypeOf(consul.kv.set("key", "value", { ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, boolean]>
>();
expectTypeOf(consul.kv.del({ key: "key", ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, boolean]>
>();

expectTypeOf(
  consul.kv.set("key", null, { cas: 1, timeout: "1s", partition: "default" }),
).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(consul.kv.delete("key")).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(consul.kv.keys({ timeout: 1000, token: "token" })).toEqualTypeOf<
  Promise<string[]>
>();
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.kv.get({ raw: "true" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.kv.set({ key: "key" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.kv.set("key", "value", { timeout: false });
