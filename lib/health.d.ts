import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface NodeOptions extends CommonOptions {
  node: string;
  dc?: string;
  filter?: string;
  ns?: string;
}

interface Node {
  ID: string;
  Node: string;
  CheckID: string;
  Name: string;
  Status: "passing" | "warning" | "critical";
  Notes: string;
  Output: string;
  ServiceID: string;
  ServiceName: string;
  ServiceTags: string[];
  Namespace: string;
}

type NodeResult = Node[];

interface ChecksOptions extends CommonOptions {
  service: string;
  dc?: string;
  near?: string;
  filter?: string;
  ns?: string;
}

type ChecksResult = Node[];

interface ServiceOptions extends CommonOptions {
  service: string;
  dc?: string;
  near?: string;
  tag?: string;
  passing?: boolean;
  filter?: string;
  peer?: string;
  ns?: string;
}

type ServiceResult = any[];

interface StateOptions extends CommonOptions {
  state: "any" | "passing" | "warning" | "critical";
  dc?: string;
  near?: string;
  filter?: string;
  ns?: string;
}

type StateResult = Node[];

declare class Health {
  constructor(consul: Consul);

  consul: Consul;

  node<TIncludeResponse extends boolean = false>(
    options: NodeOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<NodeResult, TIncludeResponse>>;
  node(name: string): Promise<NodeResult>;

  checks<TIncludeResponse extends boolean = false>(
    options: ChecksOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ChecksResult, TIncludeResponse>>;
  checks(service: string): Promise<ChecksResult>;

  service<TIncludeResponse extends boolean = false>(
    options: ServiceOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ServiceResult, TIncludeResponse>>;
  service(service: string): Promise<ServiceResult>;

  state<TIncludeResponse extends boolean = false>(
    options: StateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<StateResult, TIncludeResponse>>;
  state(
    state: "any" | "passing" | "warning" | "critical",
  ): Promise<StateResult>;
}
