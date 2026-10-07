import { EventEmitter } from "node:events";
import { IncomingMessage } from "node:http";
import { expectTypeOf } from "expect-type";
import Consul from "../lib/index.js";
import type {
  CreateResult,
  Operation,
  TransactionError,
  TransactionResult,
} from "../lib/transaction.js";

const consul = new Consul();
const operations: Operation[] = [
  { KV: { Verb: "set", Key: "key", Value: "dmFsdWU=", Flags: 0 } },
  { KV: { Verb: "set", Key: "empty", Value: null } },
  { KV: { Verb: "cas", Key: "key", Value: "dmFsdWU=", Index: 0 } },
  { KV: { Verb: "lock", Key: "lock", Value: "", Session: "session" } },
  { KV: { Verb: "unlock", Key: "lock", Value: "", Session: "session" } },
  { KV: { Verb: "check-index", Key: "key", Index: 42 } },
  { KV: { Verb: "check-session", Key: "lock", Session: "session" } },
  { KV: { Verb: "check-not-exists", Key: "missing" } },
  { KV: { Verb: "get", Key: "key", Namespace: "team", Partition: "default" } },
  { KV: { Verb: "get-or-empty", Key: "missing" } },
  { KV: { Verb: "get-tree", Key: "prefix/" } },
  { KV: { Verb: "delete", Key: "key" } },
  { KV: { Verb: "delete-tree", Key: "prefix/" } },
  { KV: { Verb: "delete-cas", Key: "key", Index: 42 } },
  { Node: { Verb: "set", Node: { Node: "node1", Address: "127.0.0.1" } } },
  { Node: { Verb: "get", Node: { ID: "node-id" } } },
  { Node: { Verb: "delete", Node: { Node: "node1" } } },
  { Node: { Verb: "cas", Node: { Node: "node1", ModifyIndex: 0 } } },
  { Node: { Verb: "delete-cas", Node: { Node: "node1", ModifyIndex: 42 } } },
  {
    Service: {
      Verb: "set",
      Node: "node1",
      Service: { ID: "web1", Service: "web" },
    },
  },
  { Service: { Verb: "get", Node: "node1", Service: { ID: "web1" } } },
  { Service: { Verb: "set", Node: "node1", Service: { Service: "web" } } },
  { Service: { Verb: "delete", Node: "node1", Service: { ID: "web1" } } },
  {
    Service: {
      Verb: "cas",
      Node: "node1",
      Service: { ID: "web1", Service: "web", ModifyIndex: 0 },
    },
  },
  {
    Service: {
      Verb: "delete-cas",
      Node: "node1",
      Service: { ID: "web1", ModifyIndex: 42 },
    },
  },
  {
    Check: {
      Verb: "set",
      Check: { Node: "node1", CheckID: "service:web1", Status: "passing" },
    },
  },
  { Check: { Verb: "get", Check: { Node: "node1", CheckID: "service:web1" } } },
  { Check: { Verb: "set", Check: { Node: "node1", Name: "check" } } },
  {
    Check: {
      Verb: "delete",
      Check: { Node: "node1", CheckID: "service:web1" },
    },
  },
  {
    Check: {
      Verb: "cas",
      Check: { Node: "node1", CheckID: "service:web1", ModifyIndex: 0 },
    },
  },
  {
    Check: {
      Verb: "delete-cas",
      Check: { Node: "node1", CheckID: "service:web1", ModifyIndex: 42 },
    },
  },
];
expectTypeOf(consul.transaction.create(operations)).toEqualTypeOf<
  Promise<CreateResult>
>();
const frozen = [{ KV: { Verb: "get", Key: "key" } }] as const;
expectTypeOf(consul.transaction.create(frozen)).toEqualTypeOf<
  Promise<CreateResult>
>();
expectTypeOf(
  consul.transaction.create([
    { KV: { Verb: "cas", Key: "key", Value: "", Index: 0 } },
  ]),
).toEqualTypeOf<Promise<CreateResult>>();
const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
expectTypeOf(
  consul.transaction.create(operations, {
    ctx,
    token: "token",
    dc: "dc1",
    ns: "team",
    partition: "default",
    signal: new AbortController().signal,
    timeout: 1000,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, CreateResult]>>();
const result = await consul.transaction.create(frozen);
expectTypeOf(result.Results).toEqualTypeOf<
  TransactionResult[] | null | undefined
>();
expectTypeOf(result.Errors).toEqualTypeOf<
  TransactionError[] | null | undefined
>();
expectTypeOf(result.Results?.[0].KV?.Value).toEqualTypeOf<
  string | null | undefined
>();
expectTypeOf(result.Errors?.[0].OpIndex).toEqualTypeOf<number | undefined>();
expectTypeOf(result.Errors?.[0].What).toEqualTypeOf<string | undefined>();
expectTypeOf(result.Results?.[0].Check?.Status).toEqualTypeOf<
  "passing" | "warning" | "critical" | undefined
>();

// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { KV: { Verb: "create", Key: "key", Value: "" } }, ]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ KV: { Verb: "set", Key: "key" } }]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ KV: { Verb: "cas", Key: "key", Value: "" } }]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { KV: { Verb: "cas", Key: "key", Value: "", Index: 1n } }, ]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ KV: { Verb: "lock", Key: "key", Value: "" } }]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ KV: { Verb: "check-index", Key: "key" } }]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ KV: { Verb: "check-session", Key: "key" } }]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ KV: { Verb: "delete-cas", Key: "key" } }]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ KV: { Verb: "get" } }]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ Node: { Verb: "get", Node: {} } }]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { Node: { Verb: "cas", Node: { Node: "node1" } } }, ]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { Service: { Verb: "get", Service: { ID: "web1" } } }, ]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { Service: { Verb: "set", Node: "node1", Service: { ID: "web1" } } }, ]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { Check: { Verb: "get", Check: { CheckID: "check1" } } }, ]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { Check: { Verb: "cas", Check: { Node: "node1", CheckID: "check1" } } }, ]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { Check: { Verb: "set", Check: { Node: "node1", CheckID: "check1", Status: "invalid" }, }, }, ]);
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([ { KV: { Verb: "get", Key: "key" }, Node: { Verb: "get", Node: { Node: "node1" } }, }, ]);
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.transaction.create([{ kv: { verb: "get", key: "key" } }]);
