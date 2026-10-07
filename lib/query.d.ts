import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface ListOptions extends CommonOptions {}

type ListResult = any[];

interface CreateServiceOptions {
  service: string;
  namespace?: string;
  failover?: {
    nearestn?: number;
    datacenters?: string[];
    targets?: { peer?: string; datacenter?: string }[];
  };
  ignorecheckids?: string[];
  onlypassing?: boolean;
  near?: string;
}

interface CreateDnsOptions {
  ttl?: string;
}

interface CreateOptions extends CommonOptions {
  name?: string;
  session?: string;
  token?: string;
  service: CreateServiceOptions;
  tags?: string[];
  nodemeta?: Record<string, string>;
  servicemeta?: Record<string, string>;
  connect?: boolean;
  dns?: CreateDnsOptions;
}

interface CreateResult {
  ID: string;
}

interface GetOptions extends CommonOptions {
  query: string;
}

type GetResult = any;

interface UpdateOptions extends CreateOptions {
  query: string;
}

type UpdateResult = undefined;

interface DestroyOptions extends CommonOptions {
  query: string;
}

type DestroyResult = undefined;

interface ExecuteOptions extends CommonOptions {
  query: string;
}

type ExecuteResult = any;

interface ExplainOptions extends CommonOptions {
  query: string;
}

type ExplainResult = any;

declare class Query {
  constructor(consul: Consul);

  consul: Consul;

  list<TIncludeResponse extends boolean = false>(
    options?: ListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ListResult, TIncludeResponse>>;

  create<TIncludeResponse extends boolean = false>(
    options: CreateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<CreateResult, TIncludeResponse>>;
  create(service: string): Promise<CreateResult>;

  get<TIncludeResponse extends boolean = false>(
    options: GetOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<GetResult, TIncludeResponse>>;
  get(query: string): Promise<GetResult>;

  update<TIncludeResponse extends boolean = false>(
    options: UpdateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<UpdateResult, TIncludeResponse>>;

  destroy<TIncludeResponse extends boolean = false>(
    options: DestroyOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<DestroyResult, TIncludeResponse>>;
  destroy(query: string): Promise<DestroyResult>;

  execute<TIncludeResponse extends boolean = false>(
    options: ExecuteOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ExecuteResult, TIncludeResponse>>;
  execute(query: string): Promise<ExecuteResult>;

  explain<TIncludeResponse extends boolean = false>(
    options: ExplainOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ExplainResult, TIncludeResponse>>;
  explain(query: string): Promise<ExplainResult>;
}
