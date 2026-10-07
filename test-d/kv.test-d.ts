import { EventEmitter } from "events";
import { IncomingMessage } from "http";
import { expectType, expectError } from "tsd";
import Consul from "../lib";
import { GetItem, GetOptions } from "../lib/kv";

const consul = new Consul();

expectType<Promise<GetItem | undefined>>(consul.kv.get("key"));
expectType<Promise<GetItem | undefined>>(consul.kv.get());
expectType<Promise<GetItem | undefined>>(consul.kv.get({ recurse: false }));
expectType<Promise<GetItem[] | undefined>>(consul.kv.get({ recurse: true }));
expectType<Promise<Buffer | undefined>>(consul.kv.get({ raw: true }));
expectType<Promise<Buffer | undefined>>(
  consul.kv.get({ raw: true, recurse: true, buffer: false }),
);
expectType<Promise<GetItem<Buffer> | undefined>>(
  consul.kv.get({ key: "key", buffer: true }),
);
expectType<Promise<GetItem<Buffer>[] | undefined>>(
  consul.kv.get({ recurse: true, buffer: true }),
);

const recurse: boolean = Math.random() > 0.5;
expectType<Promise<GetItem | GetItem[] | undefined>>(
  consul.kv.get({ recurse }),
);
const options: GetOptions = { key: "key" };
expectType<
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
>(consul.kv.get(options));

const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
expectType<Promise<[IncomingMessage, Buffer?]>>(
  consul.kv.get({ raw: true, ctx }),
);
expectType<Promise<[IncomingMessage, GetItem[]?]>>(
  consul.kv.get({ recurse: true, ctx }),
);
expectType<Promise<[IncomingMessage, string[]]>>(consul.kv.keys({ ctx }));
expectType<Promise<[IncomingMessage, boolean]>>(
  consul.kv.set({ key: "key", value: "value", ctx }),
);
expectType<Promise<[IncomingMessage, boolean]>>(
  consul.kv.set("key", "value", { ctx }),
);
expectType<Promise<[IncomingMessage, boolean]>>(
  consul.kv.del({ key: "key", ctx }),
);

expectType<Promise<boolean>>(
  consul.kv.set("key", null, { cas: 1, timeout: "1s", partition: "default" }),
);
expectType<Promise<boolean>>(consul.kv.delete("key"));
expectType<Promise<string[]>>(
  consul.kv.keys({ timeout: 1000, token: "token" }),
);
expectError(consul.kv.get({ raw: "true" }));
expectError(consul.kv.set({ key: "key" }));
expectError(consul.kv.set("key", "value", { timeout: false }));
