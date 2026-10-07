import { CommonOptions, Consul, ResponseResult } from "./consul.js";

export interface ConfigEntry<TKind extends string = string> {
  Kind: TKind;
  Name: string;
  Namespace?: string;
  Partition?: string;
  Meta?: Record<string, string>;
  readonly CreateIndex?: number;
  readonly ModifyIndex?: number;
  [field: string]: unknown;
}

export interface IntentionJWTRequirement {
  Providers: {
    Name: string;
    VerifyClaims?: { Path: string[]; Value: string }[];
  }[];
}

export interface IntentionHTTPHeader {
  Name: string;
  Present?: boolean;
  Exact?: string;
  Prefix?: string;
  Suffix?: string;
  Contains?: string;
  Regex?: string;
  Invert?: boolean;
  IgnoreCase?: boolean;
}

export interface IntentionHTTPPermission {
  PathExact?: string;
  PathPrefix?: string;
  PathRegex?: string;
  Methods?: string[];
  Header?: IntentionHTTPHeader[];
}

export interface IntentionPermission {
  Action: "allow" | "deny";
  HTTP: IntentionHTTPPermission;
  JWT?: IntentionJWTRequirement;
}

interface IntentionSourceFields {
  Name: string;
  Peer?: string;
  Namespace?: string;
  Partition?: string;
  SamenessGroup?: string;
  Type?: "consul";
  Description?: string;
  readonly Precedence?: number;
  readonly LegacyID?: string;
  readonly LegacyMeta?: Record<string, string>;
  readonly LegacyCreateTime?: string;
  readonly LegacyUpdateTime?: string;
}

export type IntentionSource = IntentionSourceFields &
  (
    | { Action: "allow" | "deny"; Permissions?: never }
    | { Action?: never; Permissions: IntentionPermission[] }
  );

export interface ServiceIntentionsEntry extends ConfigEntry<"service-intentions"> {
  Sources?: IntentionSource[] | null;
  JWT?: IntentionJWTRequirement;
}

type EntryFor<TKind extends string> = TKind extends "service-intentions"
  ? ServiceIntentionsEntry
  : ConfigEntry<TKind>;

export interface GetOptions<
  TKind extends string = string,
  TIncludeResponse extends boolean = boolean,
> extends CommonOptions<TIncludeResponse> {
  kind: TKind;
  name: string;
}

export interface SetOptions<
  TKind extends string = string,
  TIncludeResponse extends boolean = boolean,
> extends CommonOptions<TIncludeResponse> {
  entry: ConfigEntry<TKind> & EntryFor<TKind>;
  cas?: number | string | bigint;
}

export interface ListOptions<
  TKind extends string = string,
  TIncludeResponse extends boolean = boolean,
> extends CommonOptions<TIncludeResponse> {
  kind: TKind;
}

export interface DelOptions<
  TIncludeResponse extends boolean = boolean,
> extends GetOptions<string, TIncludeResponse> {
  cas?: number | string | bigint;
}

declare class Config {
  constructor(consul: Consul);

  consul: Consul;

  get<const TKind extends string, TIncludeResponse extends boolean = false>(
    options: GetOptions<TKind, TIncludeResponse>,
  ): Promise<ResponseResult<EntryFor<TKind> | undefined, TIncludeResponse>>;

  set<TIncludeResponse extends boolean = false>(
    options: SetOptions<"service-intentions", TIncludeResponse>,
  ): Promise<ResponseResult<boolean, TIncludeResponse>>;
  set<const TKind extends string, TIncludeResponse extends boolean = false>(
    options: SetOptions<TKind, TIncludeResponse> & {
      entry: { Kind: TKind extends "service-intentions" ? never : TKind };
    },
  ): Promise<ResponseResult<boolean, TIncludeResponse>>;

  list<const TKind extends string, TIncludeResponse extends boolean = false>(
    options: ListOptions<TKind, TIncludeResponse>,
  ): Promise<ResponseResult<EntryFor<TKind>[], TIncludeResponse>>;
  list<TKind extends string>(kind: TKind): Promise<EntryFor<TKind>[]>;

  del<TIncludeResponse extends boolean = false>(
    options: DelOptions<TIncludeResponse>,
  ): Promise<ResponseResult<boolean, TIncludeResponse>>;

  delete: Config["del"];
}

export { Config };
