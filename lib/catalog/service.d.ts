import { CommonOptions, Consul, ResponseResult } from "../consul.js";

interface ListOptions extends CommonOptions {
  dc?: string;
  ns?: string;
  filter?: string;
}

type ListResult = Record<string, string[]>;

interface NodesOptions extends CommonOptions {
  service: string;
  dc?: string;
  tag?: string;
  near?: string;
  filter?: string;
  ns?: string;
}

type NodesResult = any[];

declare class CatalogService {
  constructor(consul: Consul);

  consul: Consul;

  list<TIncludeResponse extends boolean = false>(
    options?: ListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ListResult, TIncludeResponse>>;
  list(dc: string): Promise<ListResult>;

  nodes<TIncludeResponse extends boolean = false>(
    options: NodesOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<NodesResult, TIncludeResponse>>;
  nodes(service: string): Promise<NodesResult>;
}
