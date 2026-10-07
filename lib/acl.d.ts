import { AclLegacy } from "./acl/legacy.js";
import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface BootstrapOptions extends CommonOptions {
  bootstrapsecret?: string;
  bootstrapSecret?: string;
}

type BootstrapResult = any;

interface ReplicationOptions extends CommonOptions {
  dc?: string;
}

interface ReplicationResult {
  Enabled: boolean;
  Running: boolean;
  SourceDatacenter: string;
  ReplicationType: "" | "policies" | "tokens";
  ReplicatedIndex: number;
  ReplicatedTokenIndex: number;
  LastSuccess: string;
  LastError: string;
  LastErrorMessage: string;
}

declare class Acl {
  constructor(consul: Consul);

  consul: Consul;
  legacy: AclLegacy;

  static Legacy: typeof AclLegacy;

  bootstrap<TIncludeResponse extends boolean = false>(
    options?: BootstrapOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<BootstrapResult, TIncludeResponse>>;

  replication<TIncludeResponse extends boolean = false>(
    options?: ReplicationOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ReplicationResult, TIncludeResponse>>;
}
