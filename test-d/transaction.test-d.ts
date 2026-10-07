import { EventEmitter } from "node:events";
import { IncomingMessage } from "node:http";
import { expectType, expectError } from "tsd";
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
expectType<Promise<CreateResult>>(consul.transaction.create(operations));
const frozen = [{ KV: { Verb: "get", Key: "key" } }] as const;
expectType<Promise<CreateResult>>(consul.transaction.create(frozen));
expectType<Promise<CreateResult>>(
  consul.transaction.create([
    { KV: { Verb: "cas", Key: "key", Value: "", Index: 0 } },
  ]),
);
const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
expectType<Promise<[IncomingMessage, CreateResult]>>(
  consul.transaction.create(operations, {
    ctx,
    token: "token",
    dc: "dc1",
    ns: "team",
    partition: "default",
    signal: new AbortController().signal,
    timeout: 1000,
  }),
);
const result = await consul.transaction.create(frozen);
expectType<TransactionResult[] | null | undefined>(result.Results);
expectType<TransactionError[] | null | undefined>(result.Errors);
expectType<string | null | undefined>(result.Results?.[0].KV?.Value);
expectType<number | undefined>(result.Errors?.[0].OpIndex);
expectType<string | undefined>(result.Errors?.[0].What);
expectType<"passing" | "warning" | "critical" | undefined>(
  result.Results?.[0].Check?.Status,
);

expectError(
  consul.transaction.create([
    { KV: { Verb: "create", Key: "key", Value: "" } },
  ]),
);
expectError(consul.transaction.create([{ KV: { Verb: "set", Key: "key" } }]));
expectError(
  consul.transaction.create([{ KV: { Verb: "cas", Key: "key", Value: "" } }]),
);
expectError(
  consul.transaction.create([
    { KV: { Verb: "cas", Key: "key", Value: "", Index: 1n } },
  ]),
);
expectError(
  consul.transaction.create([{ KV: { Verb: "lock", Key: "key", Value: "" } }]),
);
expectError(
  consul.transaction.create([{ KV: { Verb: "check-index", Key: "key" } }]),
);
expectError(
  consul.transaction.create([{ KV: { Verb: "check-session", Key: "key" } }]),
);
expectError(
  consul.transaction.create([{ KV: { Verb: "delete-cas", Key: "key" } }]),
);
expectError(consul.transaction.create([{ KV: { Verb: "get" } }]));
expectError(consul.transaction.create([{ Node: { Verb: "get", Node: {} } }]));
expectError(
  consul.transaction.create([
    { Node: { Verb: "cas", Node: { Node: "node1" } } },
  ]),
);
expectError(
  consul.transaction.create([
    { Service: { Verb: "get", Service: { ID: "web1" } } },
  ]),
);
expectError(
  consul.transaction.create([
    { Service: { Verb: "set", Node: "node1", Service: { ID: "web1" } } },
  ]),
);
expectError(
  consul.transaction.create([
    { Check: { Verb: "get", Check: { CheckID: "check1" } } },
  ]),
);
expectError(
  consul.transaction.create([
    { Check: { Verb: "cas", Check: { Node: "node1", CheckID: "check1" } } },
  ]),
);
expectError(
  consul.transaction.create([
    {
      Check: {
        Verb: "set",
        Check: { Node: "node1", CheckID: "check1", Status: "invalid" },
      },
    },
  ]),
);
expectError(
  consul.transaction.create([
    {
      KV: { Verb: "get", Key: "key" },
      Node: { Verb: "get", Node: { Node: "node1" } },
    },
  ]),
);
expectError(consul.transaction.create([{ kv: { verb: "get", key: "key" } }]));
