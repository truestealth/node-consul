import type * as Types from "./index.js" with { "resolution-mode": "import" };

declare const Consul: typeof Types.Consul;
type Consul = Types.Consul;

declare namespace Consul {
  type Consul = Types.Consul;
  type CommonOptions<TIncludeResponse extends boolean = boolean> =
    Types.CommonOptions<TIncludeResponse>;
  type ConsulOptions = Types.ConsulOptions;
  type QueryMeta = Types.QueryMeta;
  type ResponseResult<
    TData,
    TIncludeResponse extends boolean,
  > = Types.ResponseResult<TData, TIncludeResponse>;
  type ConfigEntry<TKind extends string = string> = Types.ConfigEntry<TKind>;
  type IntentionHTTPHeader = Types.IntentionHTTPHeader;
  type IntentionHTTPPermission = Types.IntentionHTTPPermission;
  type IntentionJWTRequirement = Types.IntentionJWTRequirement;
  type IntentionPermission = Types.IntentionPermission;
  type IntentionSource = Types.IntentionSource;
  type ServiceIntentionsEntry = Types.ServiceIntentionsEntry;
  type ServiceDefaultsEntry = Types.ServiceDefaultsEntry;
  type ProxyDefaultsEntry = Types.ProxyDefaultsEntry;
  type ServiceProtocol = Types.ServiceProtocol;
  type TransactionOperation = Types.TransactionOperation;
  type TransactionCreateResult = Types.TransactionCreateResult;
  type TransactionResult = Types.TransactionResult;
  type TransactionError = Types.TransactionError;
  type AclLink = Types.AclLink;
  type AclServiceIdentity = Types.AclServiceIdentity;
  type AclNodeIdentity = Types.AclNodeIdentity;
  type AclTemplatedPolicy = Types.AclTemplatedPolicy;
  type AclTokenEntry = Types.AclTokenEntry;
  type AclTokenUpdateEntry = Types.AclTokenUpdateEntry;
  type AclTokenResult = Types.AclTokenResult;
  type AclTokenListResult = Types.AclTokenListResult;
  type AclTokenExpandedResult = Types.AclTokenExpandedResult;
  type AclTokenListOptions = Types.AclTokenListOptions;
  type AclPolicyEntry = Types.AclPolicyEntry;
  type AclPolicyResult = Types.AclPolicyResult;
  type AclPolicyListResult = Types.AclPolicyListResult;
  type AclRoleEntry = Types.AclRoleEntry;
  type AclRoleResult = Types.AclRoleResult;
  type AclJsonValue = Types.AclJsonValue;
  type AclAuthMethodEntry = Types.AclAuthMethodEntry;
  type AclAuthMethodUpdateEntry = Types.AclAuthMethodUpdateEntry;
  type AclAuthMethodResult = Types.AclAuthMethodResult;
  type AclAuthMethodListResult = Types.AclAuthMethodListResult;
  type AclBindingRuleEntry = Types.AclBindingRuleEntry;
  type AclBindingRuleUpdateEntry = Types.AclBindingRuleUpdateEntry;
  type AclBindingRuleResult = Types.AclBindingRuleResult;
}

export = Consul;
