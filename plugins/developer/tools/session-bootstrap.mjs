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
// The packaged plugin has .claude-plugin/plugin.json but not package.json, so read the manifest first.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function readManifest() {
  for (const file of [".claude-plugin/plugin.json", "package.json"]) {
    try {
      return JSON.parse(readFileSync(join(root, file), "utf8"));
    } catch {
      /* try the next one */
    }
  }
  return {};
}
const pkg = readManifest();
const boot = bootstrapSession({
  repoRoot: parsed.repoRoot,
  role: "developer",
  stage: parsed.stage ?? "implement",
  pluginName: "praxis-developer",
  pluginVersion: String(pkg.version ?? "0.0.0"),
  latestVersion: parsed.latest,
});
console.log(formatSessionBootstrap(boot));
if (boot.version && !boot.version.continueAllowed) process.exit(1);
