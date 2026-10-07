import { CommonOptions, Consul, ResponseResult } from "../consul.js";
import { NodesOptions, NodesResult } from "./service.js";

declare class CatalogConnect {
  constructor(consul: Consul);

  consul: Consul;

  nodes<TIncludeResponse extends boolean = false>(
    options: NodesOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<NodesResult, TIncludeResponse>>;
  nodes(service: string): Promise<NodesResult>;
}
