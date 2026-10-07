import { Agent as httpAgent } from "node:http";
import { Agent as httpsAgent } from "node:https";
import { EventEmitter } from "node:events";
import { Acl } from "./acl.js";
import { Agent } from "./agent.js";
import { Catalog } from "./catalog.js";
import { Event } from "./event.js";
import { Health } from "./health.js";
import { Kv } from "./kv.js";
import { Query } from "./query.js";
import { Session } from "./session.js";
import { Status } from "./status.js";
import { Transaction } from "./transaction.js";
import { Watch, WatchOptions } from "./watch.js";

export interface CommonOptions {
  token?: string;
  dc?: string;
  partition?: string;
  wan?: boolean;
  consistent?: boolean;
  stale?: boolean;
  index?: string | number | bigint;
  wait?: string;
  near?: string;
  "node-meta"?: string[];
  filter?: string;
  timeout?: string | number;
  ctx?: EventEmitter & { includeResponse?: boolean };
}

type DefaultOptions = Omit<CommonOptions, "ctx" | "node-meta">;

interface ConsulOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  defaults?: DefaultOptions;
  agent?: httpAgent | httpsAgent;
}

declare class Consul {
  constructor(options?: ConsulOptions);

  acl: Acl;
  agent: Agent;
  catalog: Catalog;
  event: Event;
  health: Health;
  kv: Kv;
  query: Query;
  session: Session;
  status: Status;
  transaction: Transaction;

  static Acl: typeof Acl;
  static Agent: typeof Agent;
  static Catalog: typeof Catalog;
  static Event: typeof Event;
  static Health: typeof Health;
  static Kv: typeof Kv;
  static Query: typeof Query;
  static Session: typeof Session;
  static Status: typeof Status;
  static Transaction: typeof Transaction;
  static Watch: typeof Watch;

  destroy(): void;

  watch(options: WatchOptions): Watch;
}

export { Consul };
