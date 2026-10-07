import { CommonOptions, Consul, ResponseResult } from "./consul.js";
import { CatalogConnect } from "./catalog/connect.js";
import {
  CatalogNode,
  ListOptions as NodeListOptions,
  ListResult as NodeListResult,
} from "./catalog/node.js";
import {
  CatalogService,
  ListOptions as ServiceListOptions,
  ListResult as ServiceListResult,
} from "./catalog/service.js";

interface DatacentersOptions extends CommonOptions {}

type DatacentersResult = string[];

type NodesOptions = NodeListOptions;

type NodesResult = NodeListResult;

interface RegisterService {
  id?: string;
  service: string;
  address?: string;
  port?: number;
  tags?: string[];
  meta?: Record<string, string>;
}

interface RegisterCheckHealthDefinitionBase {
  intervalduration: string;
  timeoutduration?: string;
  deregistercriticalserviceafterduration?: string;
}

interface RegisterCheckHealthDefinitionHttp extends RegisterCheckHealthDefinitionBase {
  http: string;
  tlsskipverify?: boolean;
  tlsservername?: string;
}

interface RegisterCheckHealthDefinitionTcp extends RegisterCheckHealthDefinitionBase {
  tcp: string;
}

type RegisterCheckHealthDefinition =
  RegisterCheckHealthDefinitionHttp | RegisterCheckHealthDefinitionTcp;

interface RegisterCheck {
  node?: string;
  name?: string;
  checkid?: string;
  serviceid?: string;
  notes?: string;
  status?: "passing" | "warning" | "critical";
  definition?: RegisterCheckHealthDefinition;
}

interface RegisterOptions extends CommonOptions {
  id?: string;
  node: string;
  address: string;
  datacenter?: string;
  taggedaddresses?: Record<string, string>;
  nodemeta?: Record<string, string>;
  service?: RegisterService;
  check?: RegisterCheck;
  checks?: RegisterCheck[];
  skipnodeupdate?: boolean;
  namespace?: string;
}

type RegisterResult = undefined;

interface DeregisterOptions extends CommonOptions {
  node: string;
  datacenter?: string;
  checkid?: string;
  serviceid?: string;
  namespace?: string;
}

type DeregisterResult = undefined;

type ServicesOptions = ServiceListOptions;

type ServicesResult = ServiceListResult;

declare class Catalog {
  constructor(consul: Consul);

  consul: Consul;
  connect: CatalogConnect;
  node: CatalogNode;
  service: CatalogService;

  static Connect: typeof CatalogConnect;
  static Node: typeof CatalogNode;
  static Service: typeof CatalogService;

  datacenters<TIncludeResponse extends boolean = false>(
    options?: DatacentersOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<DatacentersResult, TIncludeResponse>>;

  nodes<TIncludeResponse extends boolean = false>(
    options?: NodesOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<NodesResult, TIncludeResponse>>;
  nodes(service: string): Promise<NodesResult>;

  register<TIncludeResponse extends boolean = false>(
    options: RegisterOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<RegisterResult, TIncludeResponse>>;
  register(node: string): Promise<RegisterResult>;

  deregister<TIncludeResponse extends boolean = false>(
    options: DeregisterOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<DeregisterResult, TIncludeResponse>>;
  deregister(node: string): Promise<DeregisterResult>;

  services<TIncludeResponse extends boolean = false>(
    options?: ServicesOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ServicesResult, TIncludeResponse>>;
  services(dc: string): Promise<ServicesResult>;
}
