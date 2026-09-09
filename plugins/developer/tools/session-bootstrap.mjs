#!/usr/bin/env node
/** Thin session bootstrap for Developer (SDK consumer — WBS 0.7 / 1.4). */
import {
  bootstrapSession,
  formatSessionBootstrap,
  parseSessionBootstrapArgs,
} from "@praxis/plugin-sdk";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const parsed = parseSessionBootstrapArgs(process.argv.slice(2));
const pkg = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../package.json"),
    "utf8",
  ),
);
const boot = bootstrapSession({
  repoRoot: parsed.repoRoot,
  role: "developer",
  stage: parsed.stage ?? "implement",
  pluginName: "praxis-developer",
  pluginVersion: pkg.version,
  latestVersion: parsed.latest,
});
console.log(formatSessionBootstrap(boot));
if (boot.version && !boot.version.continueAllowed) process.exit(1);
