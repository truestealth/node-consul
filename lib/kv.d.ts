import { EventEmitter } from "events";
import { IncomingMessage } from "http";
import { CommonOptions, Consul } from "./consul";

interface GetOptions extends CommonOptions {
  key?: string;
  dc?: string;
  raw?: boolean;
  buffer?: boolean;
  recurse?: boolean;
  keys?: boolean;
  separator?: string;
  ns?: string;
}

interface GetOptionsRecurse extends GetOptions {
  recurse: boolean;
}

interface GetItem<TValue = string> {
  CreateIndex: number;
  ModifyIndex: number;
  LockIndex: number;
  Key: string;
  Flags: number;
  Value: TValue | null;
}

type GetResult = GetItem | undefined;

type GetResultRecurse = GetItem[] | GetItem | undefined;

type GetData<
  TRaw extends boolean,
  TRecurse extends boolean,
  TBuffer extends boolean,
> =
  | (TRaw extends true
      ? Buffer
      : TRecurse extends true
        ? GetItem<TBuffer extends true ? Buffer : string>[]
        : GetItem<TBuffer extends true ? Buffer : string>)
  | undefined;

type ContextOptions<TIncludeResponse extends boolean> = {
  ctx?: EventEmitter & { includeResponse?: TIncludeResponse };
};

type Result<
  TData,
  TIncludeResponse extends boolean,
> = TIncludeResponse extends true
  ? undefined extends TData
    ? [IncomingMessage, Exclude<TData, undefined>?]
    : [IncomingMessage, TData]
  : TData;

interface KeysOptions extends GetOptions {
  recurse?: boolean;
}

type KeysResult = string[];

interface SetOptions extends CommonOptions {
  key?: string;
  value: string | Buffer | null;
  dc?: string;
  flags?: number;
  cas?: number;
  acquire?: string;
  release?: string;
  ns?: string;
}

type SetResult = boolean;

interface DelOptions extends CommonOptions {
  key?: string;
  dc?: string;
  recurse?: boolean;
  cas?: number;
  ns?: string;
}

type DelResult = boolean;

declare class Kv {
  constructor(consul: Consul);

  consul: Consul;

  get<
    TRaw extends boolean = false,
    TRecurse extends boolean = false,
    TBuffer extends boolean = false,
    TIncludeResponse extends boolean = false,
  >(
    options?: GetOptions & {
      raw?: TRaw;
      recurse?: TRecurse;
      buffer?: TBuffer;
    } & ContextOptions<TIncludeResponse>,
  ): Promise<Result<GetData<TRaw, TRecurse, TBuffer>, TIncludeResponse>>;
  get(key: string): Promise<GetResult>;

  keys<TIncludeResponse extends boolean = false>(
    options?: KeysOptions & ContextOptions<TIncludeResponse>,
  ): Promise<Result<KeysResult, TIncludeResponse>>;
  keys(key: string): Promise<KeysResult>;

  set<TIncludeResponse extends boolean = false>(
    options: SetOptions & ContextOptions<TIncludeResponse>,
  ): Promise<Result<SetResult, TIncludeResponse>>;
  set(key: string, value: string | Buffer | null): Promise<SetResult>;
  set<TIncludeResponse extends boolean = false>(
    key: string,
    value: string | Buffer | null,
    options: Omit<SetOptions, "key" | "value"> &
      ContextOptions<TIncludeResponse>,
  ): Promise<Result<SetResult, TIncludeResponse>>;

  del<TIncludeResponse extends boolean = false>(
    options: DelOptions & ContextOptions<TIncludeResponse>,
  ): Promise<Result<DelResult, TIncludeResponse>>;
  del(key: string): Promise<DelResult>;

  delete: Kv["del"];
}
