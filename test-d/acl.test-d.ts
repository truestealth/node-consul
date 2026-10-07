import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { expectTypeOf } from "expect-type";
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

expectTypeOf(
  consul.acl.token.create({ entry: tokenEntry, ...common }),
).toEqualTypeOf<Promise<AclTokenResult>>();
expectTypeOf(consul.acl.token.create({ entry: {} })).toEqualTypeOf<
  Promise<AclTokenResult>
>();
expectTypeOf(
  consul.acl.token.create({ entry: tokenEntry, ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, AclTokenResult]>>();
expectTypeOf(
  consul.acl.token.update({
    id: "accessor-id",
    entry: { Policies: [] },
    ...common,
  }),
).toEqualTypeOf<Promise<AclTokenResult>>();
expectTypeOf(consul.acl.token.get("accessor-id")).toEqualTypeOf<
  Promise<AclTokenResult | undefined>
>();
expectTypeOf(
  consul.acl.token.get({ id: "accessor-id", ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, AclTokenResult?]>>();
expectTypeOf(
  consul.acl.token.get({ id: "accessor-id", expanded: true, ...common }),
).toEqualTypeOf<Promise<AclTokenExpandedResult | undefined>>();
expectTypeOf(
  consul.acl.token.get({ id: "accessor-id", expanded: true, ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, AclTokenExpandedResult?]>>();
expectTypeOf(
  consul.acl.token.get({ id: "accessor-id", expanded: false }),
).toEqualTypeOf<Promise<AclTokenResult | undefined>>();
const expanded: boolean = Math.random() > 0.5;
expectTypeOf(
  consul.acl.token.get({ id: "accessor-id", expanded }),
).toEqualTypeOf<Promise<AclTokenResult | AclTokenExpandedResult | undefined>>();
expectTypeOf(consul.acl.token.self()).toEqualTypeOf<
  Promise<AclTokenResult | undefined>
>();
expectTypeOf(consul.acl.token.self({ ...common, ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, AclTokenResult?]>
>();
expectTypeOf(
  consul.acl.token.list({
    policy: "policy-id",
    role: "role-id",
    serviceName: "consul-smoke",
    authMethod: "consul-smoke-jwt",
    authMethodNamespace: "auth-team",
    ...common,
  }),
).toEqualTypeOf<Promise<AclTokenListResult[]>>();
expectTypeOf(consul.acl.token.list({ ...common, ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, AclTokenListResult[]]>
>();
expectTypeOf(consul.acl.token.clone("accessor-id")).toEqualTypeOf<
  Promise<AclTokenResult>
>();
expectTypeOf(
  consul.acl.token.clone({
    id: "accessor-id",
    description: "",
    ...common,
    ctx,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, AclTokenResult]>>();
expectTypeOf(consul.acl.token.del("accessor-id")).toEqualTypeOf<
  Promise<boolean>
>();
expectTypeOf(
  consul.acl.token.del({ id: "accessor-id", ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, boolean]>>();

expectTypeOf(
  consul.acl.policy.create({
    entry: {
      Name: "consul-smoke-policy",
      Rules: 'key_prefix "smoke/" { policy = "read" }',
    },
    ...common,
  }),
).toEqualTypeOf<Promise<AclPolicyResult>>();
expectTypeOf(
  consul.acl.policy.update({
    id: "policy-id",
    entry: { Name: "consul-smoke-policy", Rules: "" },
    ctx,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, AclPolicyResult]>>();
expectTypeOf(consul.acl.policy.get("policy-id")).toEqualTypeOf<
  Promise<AclPolicyResult | undefined>
>();
expectTypeOf(
  consul.acl.policy.get({ name: "consul-smoke-policy", ...common }),
).toEqualTypeOf<Promise<AclPolicyResult | undefined>>();
expectTypeOf(
  consul.acl.policy.get({ id: "policy-id", ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, AclPolicyResult?]>>();
expectTypeOf(consul.acl.policy.list()).toEqualTypeOf<
  Promise<AclPolicyListResult[]>
>();
expectTypeOf(consul.acl.policy.list({ ...common, ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, AclPolicyListResult[]]>
>();
expectTypeOf(consul.acl.policy.del("policy-id")).toEqualTypeOf<
  Promise<boolean>
>();

expectTypeOf(
  consul.acl.role.create({
    entry: { Name: "consul-smoke-role", Policies: [{ ID: "policy-id" }] },
  }),
).toEqualTypeOf<Promise<AclRoleResult>>();
expectTypeOf(
  consul.acl.role.update({
    id: "role-id",
    entry: { Name: "consul-smoke-role", Policies: null },
    ctx,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, AclRoleResult]>>();
expectTypeOf(consul.acl.role.get("role-id")).toEqualTypeOf<
  Promise<AclRoleResult | undefined>
>();
expectTypeOf(
  consul.acl.role.get({ name: "consul-smoke-role", ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, AclRoleResult?]>>();
expectTypeOf(consul.acl.role.list({ policy: "policy-id" })).toEqualTypeOf<
  Promise<AclRoleResult[]>
>();
expectTypeOf(consul.acl.role.del("role-id")).toEqualTypeOf<Promise<boolean>>();

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
expectTypeOf(
  consul.acl.authMethod.create({ entry: authEntry, ...common }),
).toEqualTypeOf<Promise<AclAuthMethodResult>>();
expectTypeOf(
  consul.acl.authMethod.update({
    name: "consul-smoke-jwt",
    entry: { Config: authEntry.Config },
    ctx,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, AclAuthMethodResult]>>();
expectTypeOf(consul.acl.authMethod.get("consul-smoke-jwt")).toEqualTypeOf<
  Promise<AclAuthMethodResult | undefined>
>();
expectTypeOf(
  consul.acl.authMethod.get({ name: "consul-smoke-jwt", ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, AclAuthMethodResult?]>>();
expectTypeOf(consul.acl.authMethod.list()).toEqualTypeOf<
  Promise<AclAuthMethodListResult[]>
>();
expectTypeOf(consul.acl.authMethod.del("consul-smoke-jwt")).toEqualTypeOf<
  Promise<boolean>
>();

expectTypeOf(
  consul.acl.bindingRule.create({
    entry: {
      AuthMethod: "consul-smoke-jwt",
      BindType: "role",
      BindName: "consul-smoke-role",
    },
    ...common,
  }),
).toEqualTypeOf<Promise<AclBindingRuleResult>>();
expectTypeOf(
  consul.acl.bindingRule.create({
    entry: {
      AuthMethod: "consul-smoke-jwt",
      BindType: "templated-policy",
      BindName: "builtin/service",
      BindVars: { Name: "consul-smoke-${value.subject}" },
    },
  }),
).toEqualTypeOf<Promise<AclBindingRuleResult>>();
expectTypeOf(
  consul.acl.bindingRule.update({
    id: "rule-id",
    entry: { BindType: "service", BindName: "consul-smoke" },
    ctx,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, AclBindingRuleResult]>>();
expectTypeOf(consul.acl.bindingRule.get("rule-id")).toEqualTypeOf<
  Promise<AclBindingRuleResult | undefined>
>();
expectTypeOf(
  consul.acl.bindingRule.get({ id: "rule-id", ...common, ctx }),
).toEqualTypeOf<Promise<[IncomingMessage, AclBindingRuleResult?]>>();
expectTypeOf(
  consul.acl.bindingRule.list({ authMethod: "consul-smoke-jwt", ...common }),
).toEqualTypeOf<Promise<AclBindingRuleResult[]>>();
expectTypeOf(consul.acl.bindingRule.del("rule-id")).toEqualTypeOf<
  Promise<boolean>
>();

expectTypeOf(
  consul.acl.login({
    authMethod: "consul-smoke-jwt",
    bearerToken: "consul-smoke-bearer",
    meta: { source: "smoke" },
    ...common,
  }),
).toEqualTypeOf<Promise<AclTokenResult>>();
expectTypeOf(
  consul.acl.login({
    authMethod: "consul-smoke-jwt",
    bearerToken: "consul-smoke-bearer",
    ctx,
  }),
).toEqualTypeOf<Promise<[IncomingMessage, AclTokenResult]>>();
expectTypeOf(consul.acl.logout()).toEqualTypeOf<Promise<boolean>>();
expectTypeOf(consul.acl.logout({ ...common, ctx })).toEqualTypeOf<
  Promise<[IncomingMessage, boolean]>
>();
const ambiguous: CommonOptions = { ctx: new EventEmitter() };
expectTypeOf(consul.acl.logout(ambiguous)).toEqualTypeOf<
  Promise<boolean | [IncomingMessage, boolean]>
>();

// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.token.create({});
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.token.update({ entry: {} });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.token.update({ id: "accessor-id", entry: { ExpirationTTL: "1h" } });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.token.get({ id: "accessor-id", expanded: "true" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.token.self({ expanded: true });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.token.del({ name: "consul-smoke" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.policy.create({ entry: { Rules: "" } });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.policy.get({});
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.policy.get({ id: "policy-id", name: "consul-smoke" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.role.create({ entry: {} });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.role.get({ id: "role-id", name: "consul-smoke" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.authMethod.create({ entry: { Name: "consul-smoke", Type: "jwt" } });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.authMethod.get({ id: "consul-smoke" });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.authMethod.update({ name: "consul-smoke", entry: {} });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.bindingRule.create({ entry: { BindType: "role", BindName: "consul-smoke" }, });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.bindingRule.create({ entry: { AuthMethod: "consul-smoke", BindType: "invalid", BindName: "consul-smoke", }, });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.login({ authMethod: "consul-smoke" });
// prettier-ignore
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
consul.acl.login({ authMethod: "consul-smoke", bearerToken: "consul-smoke", meta: { count: 1 }, });
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
const rejected3: AclLink = {};
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
(await consul.acl.policy.list())[0].Rules;
// @ts-expect-error Некорректные параметры или отсутствующее поле должны отклоняться.
(await consul.acl.authMethod.list())[0].Config;
expectTypeOf((await consul.acl.token.list())[0].SecretID).toEqualTypeOf<
  string | undefined
>();
