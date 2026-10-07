import { CommonOptions, Consul, ResponseResult } from "./consul.js";
import {
  AgentCheck,
  ListOptions as CheckListOptions,
  ListResult as CheckListResult,
} from "./agent/check.js";
import {
  AgentService,
  ListOptions as ServiceListOptions,
  ListResult as ServiceListResult,
} from "./agent/service.js";

interface MembersOptions extends CommonOptions {
  wan?: boolean;
  segment?: string;
}

type MembersResult = any[];

interface ReloadOptions extends CommonOptions {}

type ReloadResult = undefined;

interface SelfOptions extends CommonOptions {}

type SelfResult = any;

interface MaintenanceOptions extends CommonOptions {
  enable: boolean;
  reason?: string;
}

type MaintenanceResult = undefined;

interface JoinOptions extends CommonOptions {
  address: string;
  wan?: boolean;
}

type JoinResult = undefined;

interface ForceLeaveOptions extends CommonOptions {
  node: string;
  prune?: boolean;
  wan?: boolean;
}

type ForceLeaveResult = undefined;

declare class Agent {
  constructor(consul: Consul);

  consul: Consul;
  check: AgentCheck;
  service: AgentService;

  static Check: typeof AgentCheck;
  static Service: typeof AgentService;

  checks<TIncludeResponse extends boolean = false>(
    options?: CheckListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<CheckListResult, TIncludeResponse>>;

  services<TIncludeResponse extends boolean = false>(
    options?: ServiceListOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ServiceListResult, TIncludeResponse>>;

  members<TIncludeResponse extends boolean = false>(
    options?: MembersOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<MembersResult, TIncludeResponse>>;

  reload<TIncludeResponse extends boolean = false>(
    options?: ReloadOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ReloadResult, TIncludeResponse>>;

  self<TIncludeResponse extends boolean = false>(
    options?: SelfOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<SelfResult, TIncludeResponse>>;

  maintenance<TIncludeResponse extends boolean = false>(
    options: MaintenanceOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<MaintenanceResult, TIncludeResponse>>;
  maintenance(enable: boolean): Promise<MaintenanceResult>;

  join<TIncludeResponse extends boolean = false>(
    options: JoinOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<JoinResult, TIncludeResponse>>;
  join(address: string): Promise<JoinResult>;

  forceLeave<TIncludeResponse extends boolean = false>(
    options: ForceLeaveOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ForceLeaveResult, TIncludeResponse>>;
  forceLeave(node: string): Promise<ForceLeaveResult>;
}
