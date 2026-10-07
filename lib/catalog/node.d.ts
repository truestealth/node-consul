import { CommonOptions, Consul, ResponseResult } from "../consul.js";

interface ListOptions extends CommonOptions {
  dc?: string;
  near?: string;
  filter?: string;
}

type ListResult = any[];

interface ServicesOptions extends CommonOptions {
  node: string;
  dc?: string;
  filter?: string;
  ns?: string;
}

type ServicesResult = any;

declare class CatalogNode {
  constructor(consul: Consul);

  consul: Consul;

  list<TIncludeResponse extends boolean = false>(
    options?: ListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ListResult, TIncludeResponse>>;
  list(dc: string): Promise<ListResult>;

  services<TIncludeResponse extends boolean = false>(
    options: ServicesOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ServicesResult, TIncludeResponse>>;
  services(node: string): Promise<ServicesResult>;
}
