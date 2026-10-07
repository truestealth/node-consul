import type { CommonOptions, Consul, ResponseResult } from "../consul.js";

export type AclLink =
  { ID: string; Name?: string } | { ID?: string; Name: string };

export interface AclServiceIdentity {
  ServiceName: string;
  Datacenters?: string[] | null;
}

export interface AclNodeIdentity {
  NodeName: string;
  Datacenter: string;
}

export interface AclTemplatedPolicy {
  TemplateName: string;
  TemplateVariables?: { Name: string };
  Datacenters?: string[] | null;
  TemplateID?: string;
}

interface AclScope {
  Namespace?: string;
  Partition?: string;
}

interface AclIndexes {
  CreateIndex: number;
  ModifyIndex: number;
}

interface AclIdentityGrants {
  Policies?: AclLink[] | null;
  ServiceIdentities?: AclServiceIdentity[] | null;
  NodeIdentities?: AclNodeIdentity[] | null;
  TemplatedPolicies?: AclTemplatedPolicy[] | null;
}

export interface AclTokenEntry extends AclScope, AclIdentityGrants {
  Name?: string;
  AccessorID?: string;
  SecretID?: string;
  Description?: string;
  Roles?: AclLink[] | null;
  Local?: boolean;
  ExpirationTime?: string;
  ExpirationTTL?: string;
}

export interface AclTokenUpdateEntry extends Omit<
  AclTokenEntry,
  "ExpirationTTL"
> {
  AuthMethod?: string;
  AuthMethodNamespace?: string;
}

export interface AclTokenResult
  extends AclScope, AclIdentityGrants, AclIndexes {
  Name?: string;
  AccessorID: string;
  SecretID: string;
  Description: string;
  Roles?: AclLink[] | null;
  Local: boolean;
  AuthMethod?: string;
  AuthMethodNamespace?: string;
  ExpirationTime?: string;
  CreateTime: string;
  Hash: string;
}

export type AclTokenListResult = Omit<AclTokenResult, "SecretID"> & {
  SecretID?: string;
};

export interface AclPolicyEntry extends AclScope {
  Name: string;
  Description?: string;
  Rules?: string;
  Datacenters?: string[] | null;
}

export interface AclPolicyResult extends AclScope, AclIndexes {
  ID: string;
  Name: string;
  Description: string;
  Rules: string;
  Datacenters: string[] | null;
  Hash: string;
}

export type AclPolicyListResult = Omit<AclPolicyResult, "Rules">;

export interface AclRoleEntry extends AclScope, AclIdentityGrants {
  Name: string;
  Description?: string;
}

export interface AclRoleResult extends AclRoleEntry, AclIndexes {
  ID: string;
  Description: string;
  Hash: string;
}

export interface AclTokenExpandedResult extends AclTokenResult {
  ExpandedPolicies?: AclPolicyResult[] | null;
  ExpandedRoles?: AclRoleResult[] | null;
  NamespaceDefaultPolicyIDs?: string[] | null;
  NamespaceDefaultRoleIDs?: string[] | null;
  AgentACLDefaultPolicy: string;
  AgentACLDownPolicy: string;
  ResolvedByAgent: string;
}

export type AclJsonValue =
  | string
  | number
  | boolean
  | null
  | AclJsonValue[]
  | { [key: string]: AclJsonValue };

export interface AclAuthMethodEntry extends AclScope {
  Name: string;
  Type: string;
  Description?: string;
  DisplayName?: string;
  Config: Record<string, AclJsonValue>;
  MaxTokenTTL?: string;
  TokenLocality?: "local" | "global";
  TokenNameFormat?: string;
  NamespaceRules?: { Selector?: string; BindNamespace: string }[] | null;
}

export type AclAuthMethodUpdateEntry = Omit<
  AclAuthMethodEntry,
  "Name" | "Type"
> & {
  Name?: string;
  Type?: string;
};

export interface AclAuthMethodResult extends AclAuthMethodEntry, AclIndexes {}

export type AclAuthMethodListResult = Omit<AclAuthMethodResult, "Config">;

export interface AclBindingRuleEntry extends AclScope {
  AuthMethod: string;
  Description?: string;
  Selector?: string;
  BindType: "service" | "node" | "role" | "policy" | "templated-policy";
  BindName: string;
  BindVars?: { Name: string };
}

export type AclBindingRuleUpdateEntry = Omit<
  AclBindingRuleEntry,
  "AuthMethod"
> & {
  ID?: string;
  AuthMethod?: string;
};

export interface AclBindingRuleResult extends AclBindingRuleEntry, AclIndexes {
  ID: string;
}

export interface AclTokenListOptions {
  policy?: string;
  role?: string;
  serviceName?: string;
  authMethod?: string;
  authMethodNamespace?: string;
}

type AclId = { id: string };
type AclName = { name: string };
type AclIdOrName = { id: string; name?: never } | { id?: never; name: string };

type WriteMethod<TOptions, TResult> = <
  TIncludeResponse extends boolean = false,
>(
  options: TOptions & CommonOptions<TIncludeResponse>,
) => Promise<ResponseResult<TResult, TIncludeResponse>>;

type LookupMethod<TIdentifier, TResult> = <
  TIncludeResponse extends boolean = false,
>(
  options: string | (TIdentifier & CommonOptions<TIncludeResponse>),
) => Promise<ResponseResult<TResult | undefined, TIncludeResponse>>;

type ListMethod<TOptions, TResult> = <TIncludeResponse extends boolean = false>(
  options?: TOptions & CommonOptions<TIncludeResponse>,
) => Promise<ResponseResult<TResult[], TIncludeResponse>>;

export declare class AclToken {
  constructor(consul: Consul);
  consul: Consul;
  create: WriteMethod<{ entry: AclTokenEntry }, AclTokenResult>;
  update: WriteMethod<AclId & { entry: AclTokenUpdateEntry }, AclTokenResult>;
  get<
    TExpanded extends boolean = false,
    TIncludeResponse extends boolean = false,
  >(
    options:
      | string
      | (AclId & { expanded?: TExpanded } & CommonOptions<TIncludeResponse>),
  ): Promise<
    ResponseResult<
      | (TExpanded extends true ? AclTokenExpandedResult : AclTokenResult)
      | undefined,
      TIncludeResponse
    >
  >;
  list: ListMethod<AclTokenListOptions, AclTokenListResult>;
  del: WriteMethod<string | AclId, boolean>;
  clone: WriteMethod<
    string | (AclId & { description?: string }),
    AclTokenResult
  >;
  self<TIncludeResponse extends boolean = false>(
    options?: CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<AclTokenResult | undefined, TIncludeResponse>>;
}

export declare class AclPolicy {
  constructor(consul: Consul);
  consul: Consul;
  create: WriteMethod<{ entry: AclPolicyEntry }, AclPolicyResult>;
  update: WriteMethod<
    AclId & { entry: AclPolicyEntry & { ID?: string } },
    AclPolicyResult
  >;
  get: LookupMethod<AclIdOrName, AclPolicyResult>;
  list: ListMethod<{}, AclPolicyListResult>;
  del: WriteMethod<string | AclId, boolean>;
}

export declare class AclRole {
  constructor(consul: Consul);
  consul: Consul;
  create: WriteMethod<{ entry: AclRoleEntry }, AclRoleResult>;
  update: WriteMethod<
    AclId & { entry: AclRoleEntry & { ID?: string } },
    AclRoleResult
  >;
  get: LookupMethod<AclIdOrName, AclRoleResult>;
  list: ListMethod<{ policy?: string }, AclRoleResult>;
  del: WriteMethod<string | AclId, boolean>;
}

export declare class AclAuthMethod {
  constructor(consul: Consul);
  consul: Consul;
  create: WriteMethod<{ entry: AclAuthMethodEntry }, AclAuthMethodResult>;
  update: WriteMethod<
    AclName & { entry: AclAuthMethodUpdateEntry },
    AclAuthMethodResult
  >;
  get: LookupMethod<AclName, AclAuthMethodResult>;
  list: ListMethod<{}, AclAuthMethodListResult>;
  del: WriteMethod<string | AclName, boolean>;
}

export declare class AclBindingRule {
  constructor(consul: Consul);
  consul: Consul;
  create: WriteMethod<{ entry: AclBindingRuleEntry }, AclBindingRuleResult>;
  update: WriteMethod<
    AclId & { entry: AclBindingRuleUpdateEntry },
    AclBindingRuleResult
  >;
  get: LookupMethod<AclId, AclBindingRuleResult>;
  list: ListMethod<{ authMethod?: string }, AclBindingRuleResult>;
  del: WriteMethod<string | AclId, boolean>;
}
