import { AclLegacy } from "./acl/legacy.js";
import {
  AclToken,
  AclPolicy,
  AclRole,
  AclAuthMethod,
  AclBindingRule,
  AclTokenResult,
} from "./acl/modern.js";
import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface BootstrapOptions extends CommonOptions {
  bootstrapsecret?: string;
  bootstrapSecret?: string;
}

interface BootstrapResult extends AclTokenResult {
  ID: string;
}

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

interface LoginOptions {
  authMethod: string;
  bearerToken: string;
  meta?: Record<string, string>;
}

declare class Acl {
  constructor(consul: Consul);

  consul: Consul;
  legacy: AclLegacy;
  token: AclToken;
  policy: AclPolicy;
  role: AclRole;
  authMethod: AclAuthMethod;
  bindingRule: AclBindingRule;

  static Legacy: typeof AclLegacy;
  static Token: typeof AclToken;
  static Policy: typeof AclPolicy;
  static Role: typeof AclRole;
  static AuthMethod: typeof AclAuthMethod;
  static BindingRule: typeof AclBindingRule;

  bootstrap<TIncludeResponse extends boolean = false>(
    options?: BootstrapOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<BootstrapResult, TIncludeResponse>>;

  replication<TIncludeResponse extends boolean = false>(
    options?: ReplicationOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<ReplicationResult, TIncludeResponse>>;

  login<TIncludeResponse extends boolean = false>(
    options: LoginOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<AclTokenResult, TIncludeResponse>>;

  logout<TIncludeResponse extends boolean = false>(
    options?: CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<boolean, TIncludeResponse>>;
}
