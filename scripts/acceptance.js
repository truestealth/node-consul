import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const runner = spawn(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("mocha/bin/mocha.js")),
    "test/acceptance",
    "--recursive",
    "--check-leaks",
    "--timeout",
    "30000",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, ACCEPTANCE: "true" },
    windowsHide: true,
  },
);

runner.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
runner.on("exit", (code) => {
  process.exitCode = code === null ? 1 : code;
});
