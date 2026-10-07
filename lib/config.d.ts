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

export type ServiceProtocol = "" | "tcp" | "http" | "http2" | "grpc";

export interface MeshGatewayConfig {
  Mode?: "" | "none" | "local" | "remote";
}

export interface ExposeConfig {
  Checks?: boolean;
  Paths?:
    | {
        Path: string;
        LocalPathPort: number;
        ListenerPort: number;
        Protocol?: "http" | "http2";
        readonly ParsedFromCheck?: boolean;
      }[]
    | null;
}

interface ProxySettings {
  Mode?: "" | "direct" | "transparent";
  MutualTLSMode?: "" | "strict" | "permissive";
  TransparentProxy?: {
    OutboundListenerPort?: number;
    DialedDirectly?: boolean;
  } | null;
  MeshGateway?: MeshGatewayConfig;
  Expose?: ExposeConfig;
  EnvoyExtensions?:
    | {
        Name: string;
        Required?: boolean;
        Arguments?: Record<string, unknown> | null;
        ConsulVersion?: string;
        EnvoyVersion?: string;
      }[]
    | null;
}

export interface UpstreamConfig {
  Protocol?: ServiceProtocol;
  ConnectTimeoutMs?: number;
  MeshGateway?: MeshGatewayConfig;
  BalanceOutboundConnections?: string;
  Limits?: {
    MaxConnections?: number;
    MaxPendingRequests?: number;
    MaxConcurrentRequests?: number;
  } | null;
  PassiveHealthCheck?: {
    Interval?: string | number;
    MaxFailures?: number;
    EnforcingConsecutive5xx?: number;
    MaxEjectionPercent?: number;
    BaseEjectionTime?: string | number;
    [field: string]: unknown;
  } | null;
  [field: string]: unknown;
}

export interface ServiceDefaultsEntry
  extends ConfigEntry<"service-defaults">, ProxySettings {
  Protocol?: ServiceProtocol;
  ExternalSNI?: string;
  BalanceInboundConnections?: string;
  MaxInboundConnections?: number;
  MaxRequestHeadersKB?: number;
  LocalConnectTimeoutMs?: number;
  LocalRequestTimeoutMs?: number;
  Destination?: { Addresses: string[]; Port: number } | null;
  UpstreamConfig?: {
    Defaults?: UpstreamConfig | null;
    Overrides?:
      | (UpstreamConfig & {
          Name: string;
          Namespace?: string;
          Partition?: string;
          Peer?: string;
        })[]
      | null;
  } | null;
}

export interface ProxyDefaultsEntry
  extends ConfigEntry<"proxy-defaults">, ProxySettings {
  Name: "global";
  Config?: Record<string, unknown> | null;
  AccessLogs?: {
    Enabled?: boolean;
    DisableListenerLogs?: boolean;
    Type?: "" | "file" | "stderr" | "stdout";
    Path?: string;
    JSONFormat?: string;
    TextFormat?: string;
  };
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

interface KnownConfigEntries {
  "service-intentions": ServiceIntentionsEntry;
  "service-defaults": ServiceDefaultsEntry;
  "proxy-defaults": ProxyDefaultsEntry;
}

type KnownConfigKind = keyof KnownConfigEntries;

export type EntryFor<TKind extends string> = TKind extends KnownConfigKind
  ? KnownConfigEntries[TKind]
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

  set<
    const TKind extends KnownConfigKind,
    TIncludeResponse extends boolean = false,
  >(
    options: SetOptions<TKind, TIncludeResponse>,
  ): Promise<ResponseResult<boolean, TIncludeResponse>>;
  set<const TKind extends string, TIncludeResponse extends boolean = false>(
    options: SetOptions<TKind, TIncludeResponse> & {
      entry: { Kind: TKind extends KnownConfigKind ? never : TKind };
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
