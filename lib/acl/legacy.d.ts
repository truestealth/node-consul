import { CommonOptions, Consul, ResponseResult } from "../consul.js";

interface CreateOptions extends CommonOptions {
  name?: string;
  type?: "client" | "management";
  rules?: string;
}

type CreateResult = any;

interface UpdateOptions extends CommonOptions {
  id: string;
  name?: string;
  type?: "client" | "management";
  rules?: string;
}

type UpdateResult = undefined;

interface DestroyOptions extends CommonOptions {
  id: string;
}

type DestroyResult = undefined;

interface InfoOptions extends CommonOptions {
  id: string;
}

interface InfoResult {
  CreateIndex: number;
  ModifyIndex: number;
  ID: string;
  Name: string;
  Type: "client" | "management";
  Rules: string;
}

type GetOptions = InfoOptions;

type GetResult = InfoResult | undefined;

interface CloneOptions extends CommonOptions {
  id: string;
}

type CloneResult = any;

interface ListOptions extends CommonOptions {}

type ListResult = InfoResult[];

declare class AclLegacy {
  constructor(consul: Consul);

  consul: Consul;

  create<TIncludeResponse extends boolean = false>(
    options?: CreateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<CreateResult, TIncludeResponse>>;

  update<TIncludeResponse extends boolean = false>(
    options: UpdateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<UpdateResult, TIncludeResponse>>;

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

  clone<TIncludeResponse extends boolean = false>(
    options: CloneOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<CloneResult, TIncludeResponse>>;
  clone(id: string): Promise<CloneResult>;

  list<TIncludeResponse extends boolean = false>(
    options?: ListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ListResult, TIncludeResponse>>;
}
