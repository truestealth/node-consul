import { CommonOptions, Consul, ResponseResult } from "../consul.js";

interface ListOptions extends CommonOptions {
  filter?: string;
  ns?: string;
}

interface Check {
  Node: string;
  CheckID: string;
  Name: string;
  Status: "passing" | "warning" | "critical";
  Notes: string;
  Output: string;
  ServiceID: string;
  ServiceName: string;
  ServiceTags: string[];
  Interval: string;
  Timeout: string;
  Type: string;
  ExposedPort: number;
  Definition: any;
  Namespace: string;
  CreateIndex: number;
  ModifyIndex: number;
}

type ListResult = Record<string, Check>;

export interface CheckOptions {
  name: string;
  checkid?: string;
  serviceid?: string;
  http?: string;
  body?: string;
  header?: Record<string, string>;
  disableredirects?: boolean;
  h2ping?: string;
  h2pingusetls?: boolean;
  tlsskipverify?: boolean;
  tcp?: string;
  udp?: string;
  args?: string[];
  script?: string;
  dockercontainerid?: string;
  grpc?: string;
  grpcusetls?: boolean;
  shell?: string;
  timeout?: string;
  interval?: string;
  ttl?: string;
  aliasnode?: string;
  aliasservice?: string;
  notes?: string;
  status?: string;
  deregistercriticalserviceafter?: string;
  failuresbeforewarning?: number;
  successbeforepassing?: number;
  failuresbeforecritical?: number;
}

interface RegisterOptions
  extends CheckOptions, Omit<CommonOptions, "timeout"> {}

type RegisterResult = undefined;

interface DeregisterOptions extends CommonOptions {
  id: string;
}

type DeregisterResult = undefined;

interface PassOptions extends CommonOptions {
  id: string;
  note?: string;
}

type PassResult = undefined;

interface WarnOptions extends CommonOptions {
  id: string;
  note?: string;
}

type WarnResult = undefined;

interface FailOptions extends CommonOptions {
  id: string;
  note?: string;
}

type FailResult = undefined;

declare class AgentCheck {
  constructor(consul: Consul);

  consul: Consul;

  list<TIncludeResponse extends boolean = false>(
    options?: ListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ListResult, TIncludeResponse>>;

  register<TIncludeResponse extends boolean = false>(
    options: RegisterOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<RegisterResult, TIncludeResponse>>;

  deregister<TIncludeResponse extends boolean = false>(
    options: DeregisterOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<DeregisterResult, TIncludeResponse>>;
  deregister(id: string): Promise<DeregisterResult>;

  pass<TIncludeResponse extends boolean = false>(
    options: PassOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<PassResult, TIncludeResponse>>;
  pass(id: string): Promise<PassResult>;

  warn<TIncludeResponse extends boolean = false>(
    options: WarnOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<WarnResult, TIncludeResponse>>;
  warn(id: string): Promise<WarnResult>;

  fail<TIncludeResponse extends boolean = false>(
    options: FailOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<FailResult, TIncludeResponse>>;
  fail(id: string): Promise<FailResult>;
}
