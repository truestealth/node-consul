import { EventEmitter } from "node:events";
import { CommonOptions, Consul } from "./consul.js";

interface WatchOptions extends CommonOptions {
  method: Function;
  options?: CommonOptions & Record<string, unknown>;
  backoffFactor?: number;
  backoffMax?: number;
  maxAttempts?: number;
}

declare class Watch extends EventEmitter {
  constructor(consul: Consul, options: WatchOptions);

  consul: Consul;

  isRunning(): boolean;

  updateTime(): number | undefined;

  end(): void;
}
