import { CommonOptions, Consul, ResponseResult } from "../consul.js";
import { CheckOptions } from "./check.js";

interface ListOptions extends CommonOptions {
  filter?: string;
}

type ListResult = Record<string, any>;

interface RegisterConnect {
  native?: boolean;
  proxy?: any;
  sidecarservice: Record<string, any>;
}

export type ServiceCheckOptions = Omit<CheckOptions, "name"> & {
  name?: string;
};

interface RegisterOptions extends CommonOptions {
  name: string;
  id?: string;
  tags?: string[];
  address?: string;
  taggedaddresses?: Record<string, any>;
  meta?: Record<string, string>;
  namespace?: string;
  port?: number;
  kind?: string;
  proxy?: any;
  connect?: RegisterConnect;
  check?: ServiceCheckOptions;
  checks?: ServiceCheckOptions[];
}

type RegisterResult = undefined;

interface DeregisterOptions extends CommonOptions {
  id: string;
}

type DeregisterResult = undefined;

interface MaintenanceOptions extends CommonOptions {
  id: string;
  enable: boolean;
  reason?: string;
  ns?: string;
}

type MaintenanceResult = undefined;

declare class AgentService {
  constructor(consul: Consul);

  consul: Consul;

  list<TIncludeResponse extends boolean = false>(
    options?: ListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ListResult, TIncludeResponse>>;

  register<TIncludeResponse extends boolean = false>(
    options: RegisterOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<RegisterResult, TIncludeResponse>>;
  register(name: string): Promise<RegisterResult>;

  deregister<TIncludeResponse extends boolean = false>(
    options: DeregisterOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<DeregisterResult, TIncludeResponse>>;
  deregister(id: string): Promise<DeregisterResult>;

  maintenance<TIncludeResponse extends boolean = false>(
    options: MaintenanceOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<MaintenanceResult, TIncludeResponse>>;
}
