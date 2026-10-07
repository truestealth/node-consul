import {
  Agent as httpAgent,
  IncomingMessage,
  OutgoingHttpHeaders,
} from "node:http";
import { RequestOptions } from "node:https";
import { EventEmitter } from "node:events";
import { Acl } from "./acl.js";
import { Agent } from "./agent.js";
import { Catalog } from "./catalog.js";
import { Config } from "./config.js";
import { Event } from "./event.js";
import { Health } from "./health.js";
import { Kv } from "./kv.js";
import { Query } from "./query.js";
import { Session } from "./session.js";
import { Status } from "./status.js";
import { Transaction } from "./transaction.js";
import { Watch, WatchOptions } from "./watch.js";

export interface CommonOptions<TIncludeResponse extends boolean = boolean> {
  token?: string;
  dc?: string;
  ns?: string;
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
  signal?: AbortSignal;
  ctx?: EventEmitter & { includeResponse?: TIncludeResponse };
}

export type ResponseResult<
  TData,
  TIncludeResponse extends boolean,
> = TIncludeResponse extends true
  ? 0 extends 1 & TData
    ? [IncomingMessage, TData]
    : [TData] extends [undefined]
      ? [IncomingMessage]
      : undefined extends TData
        ? [IncomingMessage, Exclude<TData, undefined>?]
        : [IncomingMessage, TData]
  : TData;

type DefaultOptions = Pick<
  CommonOptions,
  | "consistent"
  | "dc"
  | "ns"
  | "partition"
  | "signal"
  | "stale"
  | "timeout"
  | "token"
  | "wait"
  | "wan"
>;

export interface QueryMeta {
  LastIndex?: string;
  LastContact?: number;
  KnownLeader?: boolean;
  AddressTranslationEnabled?: boolean;
}

export interface ConsulLogData {
  name: string;
  method: string;
  durationMs: number;
  outcome:
    | "success"
    | "http-error"
    | "abort"
    | "timeout"
    | "network-error"
    | "codec-error"
    | "validation-error"
    | "error";
  statusCode?: number;
  errorCode?: string;
}

type ConsulListener<TEvent extends string | symbol> = TEvent extends "log"
  ? (tags: string[], data: ConsulLogData) => void
  : (...args: any[]) => void;

export interface ConsulOptions extends Omit<
  RequestOptions,
  | "agent"
  | "headers"
  | "host"
  | "hostname"
  | "method"
  | "path"
  | "port"
  | "protocol"
  | "signal"
  | "timeout"
> {
  host?: string;
  port?: number;
  secure?: boolean;
  baseUrl?: string | URL;
  headers?: OutgoingHttpHeaders;
  timeout?: number | string;
  defaults?: DefaultOptions;
  agent?: httpAgent | false;
}

declare class Consul extends EventEmitter {
  constructor(options?: ConsulOptions);

  on<TEvent extends string | symbol>(
    event: TEvent,
    listener: ConsulListener<NoInfer<TEvent>>,
  ): this;
  once<TEvent extends string | symbol>(
    event: TEvent,
    listener: ConsulListener<NoInfer<TEvent>>,
  ): this;
  addListener<TEvent extends string | symbol>(
    event: TEvent,
    listener: ConsulListener<NoInfer<TEvent>>,
  ): this;
  prependListener<TEvent extends string | symbol>(
    event: TEvent,
    listener: ConsulListener<NoInfer<TEvent>>,
  ): this;
  prependOnceListener<TEvent extends string | symbol>(
    event: TEvent,
    listener: ConsulListener<NoInfer<TEvent>>,
  ): this;
  removeListener<TEvent extends string | symbol>(
    event: TEvent,
    listener: ConsulListener<NoInfer<TEvent>>,
  ): this;
  off<TEvent extends string | symbol>(
    event: TEvent,
    listener: ConsulListener<NoInfer<TEvent>>,
  ): this;

  acl: Acl;
  agent: Agent;
  catalog: Catalog;
  config: Config;
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
  static Config: typeof Config;
  static Event: typeof Event;
  static Health: typeof Health;
  static Kv: typeof Kv;
  static Query: typeof Query;
  static Session: typeof Session;
  static Status: typeof Status;
  static Transaction: typeof Transaction;
  static Watch: typeof Watch;

  static parseQueryMeta(response?: Pick<IncomingMessage, "headers">): QueryMeta;

  destroy(): void;

  watch(options: WatchOptions): Watch;
}

export { Consul };
