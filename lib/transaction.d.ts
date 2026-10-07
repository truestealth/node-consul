import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface KVFields {
  Key: string;
  Namespace?: string;
  Partition?: string;
}

export type KVOption = KVFields &
  (
    | { Verb: "set"; Value: string | null; Flags?: number }
    | { Verb: "cas"; Value: string | null; Index: number; Flags?: number }
    | {
        Verb: "lock" | "unlock";
        Value: string | null;
        Session: string;
        Flags?: number;
      }
    | {
        Verb:
          | "get"
          | "get-or-empty"
          | "get-tree"
          | "check-not-exists"
          | "delete"
          | "delete-tree";
      }
    | { Verb: "check-index" | "delete-cas"; Index: number }
    | { Verb: "check-session"; Session: string }
  );

export interface NodeData {
  ID?: string;
  Node?: string;
  Address?: string;
  Datacenter?: string;
  TaggedAddresses?: Record<string, string> | null;
  Meta?: Record<string, string> | null;
  Partition?: string;
  PeerName?: string;
  CreateIndex?: number;
  ModifyIndex?: number;
  [field: string]: unknown;
}

type NodeIdentity = { Node: string } | { ID: string };

export type NodeOption =
  | { Verb: "get"; Node: NodeData & NodeIdentity }
  | { Verb: "set" | "delete"; Node: NodeData & { Node: string } }
  | {
      Verb: "cas" | "delete-cas";
      Node: NodeData & { Node: string; ModifyIndex: number };
    };

export interface ServiceData {
  ID?: string;
  Service?: string;
  Address?: string;
  Port?: number;
  Tags?: string[] | null;
  Meta?: Record<string, string> | null;
  TaggedAddresses?: Record<string, { Address: string; Port: number }> | null;
  Weights?: { Passing: number; Warning: number };
  EnableTagOverride?: boolean;
  Kind?: string;
  Namespace?: string;
  Partition?: string;
  PeerName?: string;
  Connect?: Record<string, unknown>;
  Proxy?: Record<string, unknown>;
  CreateIndex?: number;
  ModifyIndex?: number;
  [field: string]: unknown;
}

export type ServiceOption = { Node: string } & (
  | { Verb: "get" | "delete"; Service: ServiceData & { ID: string } }
  | { Verb: "set"; Service: ServiceData & { Service: string } }
  | {
      Verb: "cas";
      Service: ServiceData & { Service: string; ModifyIndex: number };
    }
  | {
      Verb: "delete-cas";
      Service: ServiceData & { ID: string; ModifyIndex: number };
    }
);

export interface CheckData {
  Node: string;
  CheckID?: string;
  Name?: string;
  Status?: "passing" | "warning" | "critical";
  Notes?: string;
  Output?: string;
  ServiceID?: string;
  ServiceName?: string;
  ServiceTags?: string[] | null;
  Definition?: Record<string, unknown> | null;
  Namespace?: string;
  Partition?: string;
  CreateIndex?: number;
  ModifyIndex?: number;
  [field: string]: unknown;
}

type CheckIdentity = { CheckID: string } | { Name: string };

export type CheckOption =
  | { Verb: "set"; Check: CheckData & CheckIdentity }
  | { Verb: "get" | "delete"; Check: CheckData & { CheckID: string } }
  | {
      Verb: "cas";
      Check: CheckData & CheckIdentity & { ModifyIndex: number };
    }
  | {
      Verb: "delete-cas";
      Check: CheckData & { CheckID: string; ModifyIndex: number };
    };

export type Operation =
  | { KV: KVOption; Node?: never; Service?: never; Check?: never }
  | { KV?: never; Node: NodeOption; Service?: never; Check?: never }
  | { KV?: never; Node?: never; Service: ServiceOption; Check?: never }
  | { KV?: never; Node?: never; Service?: never; Check: CheckOption };

export interface KVResult extends KVFields {
  LockIndex: number;
  Value: string | null;
  Flags: number;
  CreateIndex: number;
  ModifyIndex: number;
  Session?: string;
}

export interface TransactionResult {
  KV?: KVResult | null;
  Node?: NodeData | null;
  Service?: ServiceData | null;
  Check?: CheckData | null;
}

export interface TransactionError {
  OpIndex: number;
  What: string;
}

interface CreateOptions extends CommonOptions {}

interface CreateResult {
  Results?: TransactionResult[] | null;
  Errors?: TransactionError[] | null;
}

declare class Transaction {
  constructor(consul: Consul);

  consul: Consul;

  create<TIncludeResponse extends boolean = false>(
    operations: readonly Operation[],
    options?: CreateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<CreateResult, TIncludeResponse>>;
}
