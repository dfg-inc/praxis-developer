#!/usr/bin/env node
/**
 * Executable final arbiter for praxis-developer (WBS 5.13).
 * Runs build/test/lint commands from the host repo and exits non-zero on failure.
 *
 * Usage:
 *   node plugins/developer/tools/final-arbiter.mjs [--cwd <dir>] [--build] [--test] [--lint]
 *   Optional overrides: --build-cmd "…" --test-cmd "…" --lint-cmd "…"
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function has(name) {
  return args.includes(name);
}

const cwd = flag("--cwd") ?? process.cwd();
const wantBuild = has("--build") || (!has("--test") && !has("--lint") && !has("--build"));
const wantTest = has("--test") || (!has("--test") && !has("--lint") && !has("--build"));
const wantLint = has("--lint") || (!has("--test") && !has("--lint") && !has("--build"));

function detectCmd(kind) {
  const override = flag(`--${kind}-cmd`);
  if (override) return override;
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return null;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const scripts = pkg.scripts ?? {};
  if (kind === "build" && scripts.build) return "npm run build";
  if (kind === "test" && scripts.test) return "npm run test";
  if (kind === "lint" && (scripts.lint || scripts["lint:check"])) {
    return scripts.lint ? "npm run lint" : "npm run lint:check";
  }
  return null;
}

function run(label, cmd) {
  if (!cmd) {
    console.log(`SKIP ${label}: no command configured`);
    return { label, ok: true, skipped: true };
  }
  console.log(`RUN ${label}: ${cmd}`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit" });
  const ok = r.status === 0;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  return { label, ok, skipped: false };
}

const results = [];
if (wantBuild) results.push(run("build", detectCmd("build") ?? flag("--build-cmd")));
if (wantTest) results.push(run("test", detectCmd("test") ?? flag("--test-cmd")));
if (wantLint) results.push(run("lint", detectCmd("lint") ?? flag("--lint-cmd")));

const failed = results.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    {
      verdict: failed.length ? "FAIL" : "PASS",
      results,
    },
    null,
    2,
  ),
);
process.exit(failed.length ? 1 : 0);
