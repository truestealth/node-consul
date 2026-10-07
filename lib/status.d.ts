import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface LeaderOptions extends CommonOptions {}

type LeaderResult = string;

interface PeersOptions extends CommonOptions {}

type PeersResult = string[];

declare class Status {
  constructor(consul: Consul);

  consul: Consul;

  leader<TIncludeResponse extends boolean = false>(
    options?: LeaderOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<LeaderResult, TIncludeResponse>>;

  peers<TIncludeResponse extends boolean = false>(
    options?: PeersOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<PeersResult, TIncludeResponse>>;
}
