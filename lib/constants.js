export const DEFAULT_OPTIONS = [
  "consistent",
  "dc",
  "partition",
  "stale",
  "timeout",
  "token",
  "wait",
  "wan",
];

export const AGENT_STATUS = ["none", "alive", "leaving", "left", "failed"];

export const CHECK_STATE = ["unknown", "passing", "warning", "critical"];

const du = { ns: 1 };
export { du as DURATION_UNITS };
du.us = 1000 * du.ns;
du.ms = 1000 * du.us;
du.s = 1000 * du.ms;
du.m = 60 * du.s;
du.h = 60 * du.m;
