import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { expectError, expectType } from "tsd";
import Consul from "../lib/index.js";
import type { CommonOptions } from "../lib/consul.js";
import type {
  AclAuthMethodEntry,
  AclAuthMethodListResult,
  AclAuthMethodResult,
  AclBindingRuleResult,
  AclLink,
  AclPolicyListResult,
  AclPolicyResult,
  AclRoleResult,
  AclTokenEntry,
  AclTokenExpandedResult,
  AclTokenListResult,
  AclTokenResult,
} from "../lib/acl/modern.js";

const consul = new Consul();
const common = {
  token: "consul-smoke-management",
  dc: "dc1",
  ns: "team",
  partition: "part1",
  signal: new AbortController().signal,
  timeout: "5s",
  wait: "1m",
  index: 123n,
};
const ctx = Object.assign(new EventEmitter(), {
  includeResponse: true as const,
});
const tokenEntry: AclTokenEntry = {
  Description: "consul-smoke-token",
  Policies: [{ Name: "consul-smoke-policy" }, { ID: "policy-id" }],
  Roles: [{ Name: "consul-smoke-role" }],
  ServiceIdentities: [{ ServiceName: "consul-smoke", Datacenters: ["dc1"] }],
  NodeIdentities: [{ NodeName: "consul-smoke-node", Datacenter: "dc1" }],
  TemplatedPolicies: [
    {
      TemplateName: "builtin/service",
      TemplateVariables: { Name: "consul-smoke" },
    },
  ],
  Local: false,
  ExpirationTTL: "1h",
  Namespace: "team",
  Partition: "part1",
};

expectType<Promise<AclTokenResult>>(
  consul.acl.token.create({ entry: tokenEntry, ...common }),
);
expectType<Promise<AclTokenResult>>(consul.acl.token.create({ entry: {} }));
expectType<Promise<[IncomingMessage, AclTokenResult]>>(
  consul.acl.token.create({ entry: tokenEntry, ...common, ctx }),
);
expectType<Promise<AclTokenResult>>(
  consul.acl.token.update({
    id: "accessor-id",
    entry: { Policies: [] },
    ...common,
  }),
);
expectType<Promise<AclTokenResult | undefined>>(
  consul.acl.token.get("accessor-id"),
);
expectType<Promise<[IncomingMessage, AclTokenResult?]>>(
  consul.acl.token.get({ id: "accessor-id", ...common, ctx }),
);
expectType<Promise<AclTokenExpandedResult | undefined>>(
  consul.acl.token.get({ id: "accessor-id", expanded: true, ...common }),
);
expectType<Promise<[IncomingMessage, AclTokenExpandedResult?]>>(
  consul.acl.token.get({ id: "accessor-id", expanded: true, ...common, ctx }),
);
expectType<Promise<AclTokenResult | undefined>>(
  consul.acl.token.get({ id: "accessor-id", expanded: false }),
);
const expanded: boolean = Math.random() > 0.5;
expectType<Promise<AclTokenResult | AclTokenExpandedResult | undefined>>(
  consul.acl.token.get({ id: "accessor-id", expanded }),
);
expectType<Promise<AclTokenResult | undefined>>(consul.acl.token.self());
expectType<Promise<[IncomingMessage, AclTokenResult?]>>(
  consul.acl.token.self({ ...common, ctx }),
);
expectType<Promise<AclTokenListResult[]>>(
  consul.acl.token.list({
    policy: "policy-id",
    role: "role-id",
    serviceName: "consul-smoke",
    authMethod: "consul-smoke-jwt",
    authMethodNamespace: "auth-team",
    ...common,
  }),
);
expectType<Promise<[IncomingMessage, AclTokenListResult[]]>>(
  consul.acl.token.list({ ...common, ctx }),
);
expectType<Promise<AclTokenResult>>(consul.acl.token.clone("accessor-id"));
expectType<Promise<[IncomingMessage, AclTokenResult]>>(
  consul.acl.token.clone({
    id: "accessor-id",
    description: "",
    ...common,
    ctx,
  }),
);
expectType<Promise<boolean>>(consul.acl.token.del("accessor-id"));
expectType<Promise<[IncomingMessage, boolean]>>(
  consul.acl.token.del({ id: "accessor-id", ...common, ctx }),
);

expectType<Promise<AclPolicyResult>>(
  consul.acl.policy.create({
    entry: {
      Name: "consul-smoke-policy",
      Rules: 'key_prefix "smoke/" { policy = "read" }',
    },
    ...common,
  }),
);
expectType<Promise<[IncomingMessage, AclPolicyResult]>>(
  consul.acl.policy.update({
    id: "policy-id",
    entry: { Name: "consul-smoke-policy", Rules: "" },
    ctx,
  }),
);
expectType<Promise<AclPolicyResult | undefined>>(
  consul.acl.policy.get("policy-id"),
);
expectType<Promise<AclPolicyResult | undefined>>(
  consul.acl.policy.get({ name: "consul-smoke-policy", ...common }),
);
expectType<Promise<[IncomingMessage, AclPolicyResult?]>>(
  consul.acl.policy.get({ id: "policy-id", ...common, ctx }),
);
expectType<Promise<AclPolicyListResult[]>>(consul.acl.policy.list());
expectType<Promise<[IncomingMessage, AclPolicyListResult[]]>>(
  consul.acl.policy.list({ ...common, ctx }),
);
expectType<Promise<boolean>>(consul.acl.policy.del("policy-id"));

expectType<Promise<AclRoleResult>>(
  consul.acl.role.create({
    entry: { Name: "consul-smoke-role", Policies: [{ ID: "policy-id" }] },
  }),
);
expectType<Promise<[IncomingMessage, AclRoleResult]>>(
  consul.acl.role.update({
    id: "role-id",
    entry: { Name: "consul-smoke-role", Policies: null },
    ctx,
  }),
);
expectType<Promise<AclRoleResult | undefined>>(consul.acl.role.get("role-id"));
expectType<Promise<[IncomingMessage, AclRoleResult?]>>(
  consul.acl.role.get({ name: "consul-smoke-role", ...common, ctx }),
);
expectType<Promise<AclRoleResult[]>>(
  consul.acl.role.list({ policy: "policy-id" }),
);
expectType<Promise<boolean>>(consul.acl.role.del("role-id"));

const authEntry: AclAuthMethodEntry = {
  Name: "consul-smoke-jwt",
  Type: "jwt",
  Config: {
    JWTValidationPubKeys: ["public-key"],
    ClaimMappings: { sub: "subject" },
    BoundAudiences: ["consul-smoke"],
    ExpirationLeeway: -1,
  },
  MaxTokenTTL: "1h",
  TokenLocality: "local",
  NamespaceRules: [
    { Selector: 'value.subject == "consul-smoke"', BindNamespace: "team" },
  ],
};
expectType<Promise<AclAuthMethodResult>>(
  consul.acl.authMethod.create({ entry: authEntry, ...common }),
);
expectType<Promise<[IncomingMessage, AclAuthMethodResult]>>(
  consul.acl.authMethod.update({
    name: "consul-smoke-jwt",
    entry: { Config: authEntry.Config },
    ctx,
  }),
);
expectType<Promise<AclAuthMethodResult | undefined>>(
  consul.acl.authMethod.get("consul-smoke-jwt"),
);
expectType<Promise<[IncomingMessage, AclAuthMethodResult?]>>(
  consul.acl.authMethod.get({ name: "consul-smoke-jwt", ...common, ctx }),
);
expectType<Promise<AclAuthMethodListResult[]>>(consul.acl.authMethod.list());
expectType<Promise<boolean>>(consul.acl.authMethod.del("consul-smoke-jwt"));

expectType<Promise<AclBindingRuleResult>>(
  consul.acl.bindingRule.create({
    entry: {
      AuthMethod: "consul-smoke-jwt",
      BindType: "role",
      BindName: "consul-smoke-role",
    },
    ...common,
  }),
);
expectType<Promise<AclBindingRuleResult>>(
  consul.acl.bindingRule.create({
    entry: {
      AuthMethod: "consul-smoke-jwt",
      BindType: "templated-policy",
      BindName: "builtin/service",
      BindVars: { Name: "consul-smoke-${value.subject}" },
    },
  }),
);
expectType<Promise<[IncomingMessage, AclBindingRuleResult]>>(
  consul.acl.bindingRule.update({
    id: "rule-id",
    entry: { BindType: "service", BindName: "consul-smoke" },
    ctx,
  }),
);
expectType<Promise<AclBindingRuleResult | undefined>>(
  consul.acl.bindingRule.get("rule-id"),
);
expectType<Promise<[IncomingMessage, AclBindingRuleResult?]>>(
  consul.acl.bindingRule.get({ id: "rule-id", ...common, ctx }),
);
expectType<Promise<AclBindingRuleResult[]>>(
  consul.acl.bindingRule.list({ authMethod: "consul-smoke-jwt", ...common }),
);
expectType<Promise<boolean>>(consul.acl.bindingRule.del("rule-id"));

expectType<Promise<AclTokenResult>>(
  consul.acl.login({
    authMethod: "consul-smoke-jwt",
    bearerToken: "consul-smoke-bearer",
    meta: { source: "smoke" },
    ...common,
  }),
);
expectType<Promise<[IncomingMessage, AclTokenResult]>>(
  consul.acl.login({
    authMethod: "consul-smoke-jwt",
    bearerToken: "consul-smoke-bearer",
    ctx,
  }),
);
expectType<Promise<boolean>>(consul.acl.logout());
expectType<Promise<[IncomingMessage, boolean]>>(
  consul.acl.logout({ ...common, ctx }),
);
const ambiguous: CommonOptions = { ctx: new EventEmitter() };
expectType<Promise<boolean | [IncomingMessage, boolean]>>(
  consul.acl.logout(ambiguous),
);

expectError(consul.acl.token.create({}));
expectError(consul.acl.token.update({ entry: {} }));
expectError(
  consul.acl.token.update({
    id: "accessor-id",
    entry: { ExpirationTTL: "1h" },
  }),
);
expectError(consul.acl.token.get({ id: "accessor-id", expanded: "true" }));
expectError(consul.acl.token.self({ expanded: true }));
expectError(consul.acl.token.del({ name: "consul-smoke" }));
expectError(consul.acl.policy.create({ entry: { Rules: "" } }));
expectError(consul.acl.policy.get({}));
expectError(consul.acl.policy.get({ id: "policy-id", name: "consul-smoke" }));
expectError(consul.acl.role.create({ entry: {} }));
expectError(consul.acl.role.get({ id: "role-id", name: "consul-smoke" }));
expectError(
  consul.acl.authMethod.create({
    entry: { Name: "consul-smoke", Type: "jwt" },
  }),
);
expectError(consul.acl.authMethod.get({ id: "consul-smoke" }));
expectError(consul.acl.authMethod.update({ name: "consul-smoke", entry: {} }));
expectError(
  consul.acl.bindingRule.create({
    entry: { BindType: "role", BindName: "consul-smoke" },
  }),
);
expectError(
  consul.acl.bindingRule.create({
    entry: {
      AuthMethod: "consul-smoke",
      BindType: "invalid",
      BindName: "consul-smoke",
    },
  }),
);
expectError(consul.acl.login({ authMethod: "consul-smoke" }));
expectError(
  consul.acl.login({
    authMethod: "consul-smoke",
    bearerToken: "consul-smoke",
    meta: { count: 1 },
  }),
);
expectError<AclLink>({});
expectError((await consul.acl.policy.list())[0].Rules);
expectError((await consul.acl.authMethod.list())[0].Config);
expectType<string | undefined>((await consul.acl.token.list())[0].SecretID);
