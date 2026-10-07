import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface FireOptions extends CommonOptions {
  name: string;
  payload?: string | Buffer;
  dc?: string;
  node?: string;
  service?: string;
  tag?: string;
}

interface FireResult<TPayload = string> {
  ID: string;
  Name: string;
  Payload: TPayload | null;
  NodeFilter: string;
  ServiceFilter: string;
  TagFilter: string;
  Version: number;
  LTime: number;
}

interface ListOptions extends CommonOptions {
  buffer?: boolean;
  name?: string;
  node?: string;
  service?: string;
  tag?: string;
}

type ListResult<TPayload = string> = FireResult<TPayload>[];

declare class Event {
  constructor(consul: Consul);

  consul: Consul;

  fire(name: string): Promise<FireResult>;
  fire<TPayload extends string | Buffer>(
    name: string,
    payload: TPayload,
  ): Promise<FireResult<TPayload extends Buffer ? Buffer : string>>;
  fire<
    TPayload extends string | Buffer = string,
    TIncludeResponse extends boolean = false,
  >(
    options: FireOptions & {
      payload?: TPayload;
    } & CommonOptions<TIncludeResponse>,
  ): Promise<
    ResponseResult<
      FireResult<TPayload extends Buffer ? Buffer : string>,
      TIncludeResponse
    >
  >;

  list<
    TBuffer extends boolean = false,
    TIncludeResponse extends boolean = false,
  >(
    options?: ListOptions & {
      buffer?: TBuffer;
    } & CommonOptions<TIncludeResponse>,
  ): Promise<
    ResponseResult<
      ListResult<TBuffer extends true ? Buffer : string>,
      TIncludeResponse
    >
  >;
  list(name: string): Promise<ListResult>;
}
