import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface CreateOptions extends CommonOptions {
  dc?: string;
  lockdelay?: string;
  node?: string;
  name?: string;
  checks?: string[];
  nodechecks?: string[];
  servicechecks?: { id: string; namespace?: string }[];
  behavior?: "release" | "delete";
  ttl?: string;
}

interface CreateResult {
  ID: string;
}

interface DestroyOptions extends CommonOptions {
  id: string;
  dc?: string;
  ns?: string;
}

type DestroyResult = undefined;

interface InfoOptions extends CommonOptions {
  id: string;
  dc?: string;
}

interface InfoResult {
  ID: string;
  Name: string;
  Node: string;
  LockDelay: number;
  Behavior: "release" | "delete";
  TTL: string;
  NodeChecks: string[] | null;
  ServiceChecks: string[] | null;
  CreateIndex: number;
  ModifyIndex: number;
}

type GetOptions = InfoOptions;

type GetResult = InfoResult | undefined;

interface NodeOptions extends CommonOptions {
  node: string;
  dc?: string;
}

type NodeResult = InfoResult[];

interface ListOptions extends CommonOptions {
  dc?: string;
}

type ListResult = InfoResult[];

interface RenewOptions extends CommonOptions {
  id: string;
  dc?: string;
}

type RenewResult = InfoResult[];

declare class Session {
  constructor(consul: Consul);

  consul: Consul;

  create<TIncludeResponse extends boolean = false>(
    options?: CreateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<CreateResult, TIncludeResponse>>;

  destroy<TIncludeResponse extends boolean = false>(
    options: DestroyOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<DestroyResult, TIncludeResponse>>;
  destroy(id: string): Promise<DestroyResult>;

  info<TIncludeResponse extends boolean = false>(
    options: InfoOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<InfoResult | undefined, TIncludeResponse>>;
  info(id: string): Promise<InfoResult | undefined>;

  get<TIncludeResponse extends boolean = false>(
    options: GetOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<GetResult, TIncludeResponse>>;
  get(id: string): Promise<GetResult>;

  node<TIncludeResponse extends boolean = false>(
    options: NodeOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<NodeResult, TIncludeResponse>>;
  node(node: string): Promise<NodeResult>;

  list<TIncludeResponse extends boolean = false>(
    options?: ListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ListResult, TIncludeResponse>>;

  renew<TIncludeResponse extends boolean = false>(
    options: RenewOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<RenewResult, TIncludeResponse>>;
  renew(id: string): Promise<RenewResult>;
}
