import { Agent as httpAgent } from "http";
import { Agent as httpsAgent } from "https";
import { EventEmitter } from "events";
import { Acl } from "./acl";
import { Agent } from "./agent";
import { Catalog } from "./catalog";
import { Event } from "./event";
import { Health } from "./health";
import { Kv } from "./kv";
import { Query } from "./query";
import { Session } from "./session";
import { Status } from "./status";
import { Transaction } from "./transaction";
import { Watch, WatchOptions } from "./watch";

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
