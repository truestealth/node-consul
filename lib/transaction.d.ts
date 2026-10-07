import { CommonOptions, Consul, ResponseResult } from "./consul.js";

interface KVOption {
  Verb: string;
  Key: string;
  Value?: string;
  Flags?: number;
  Index?: number;
  Session?: string;
  Namespace?: string;
  Partition?: string;
}

interface NodeOption {
  Verb: string;
  Node: any;
}

interface ServiceOption {
  Verb: string;
  Node: string;
  Service: any;
}

interface CheckOption {
  Verb: string;
  Check: any;
}

type Operation =
  | { KV: KVOption }
  | { Node: NodeOption }
  | { Service: ServiceOption }
  | { Check: CheckOption };

interface CreateOptions extends CommonOptions {}

interface CreateResult {
  Results?: Partial<Record<"KV" | "Node" | "Service" | "Check", any>>[];
  Errors?: any[];
}

declare class Transaction {
  constructor(consul: Consul);

  consul: Consul;

  create<TIncludeResponse extends boolean = false>(
    operations: Operation[],
    options?: CreateOptions & CommonOptions<TIncludeResponse>,
  ): Promise<ResponseResult<CreateResult, TIncludeResponse>>;
}
