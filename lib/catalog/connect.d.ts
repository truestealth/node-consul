import { Consul } from "../consul.js";
import { NodesOptions, NodesResult } from "./service.js";

declare class CatalogConnect {
  constructor(consul: Consul);

  consul: Consul;

  nodes(options: NodesOptions): Promise<NodesResult>;
  nodes(service: string): Promise<NodesResult>;
}
