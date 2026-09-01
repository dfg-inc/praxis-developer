#!/usr/bin/env node
/**
 * Developer intake gate for architect.developer.handoff (machine checks).
 *
 * Usage:
 *   node <plugin>/tools/accept-work-package.mjs \
 *     --arch-handoff <path> [--design-dir <dir>] [--out <acceptance.md>]
 *
 * Exit 0 + status accepted → proceed.
 * Exit 1 + status returned → do not create-plan / implement.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const archHandoffPath = resolve(flag("--arch-handoff") ?? "");
const designDirFlag = flag("--design-dir");

/** @type {{ status: 'accepted'|'returned', blockers: string[], workPackageId?: string }} */
const result = { status: "returned", blockers: [] };

function fail(msg) {
  result.blockers.push(msg);
}

function finish(code) {
  const wpId = result.workPackageId ?? "unknown";
  const designDir = designDirFlag
    ? resolve(designDirFlag)
    : archHandoffPath
      ? dirname(archHandoffPath)
      : process.cwd();
  const outPath = resolve(
    flag("--out") ?? join(designDir, "dev", "acceptance.md"),
  );
  mkdirSync(dirname(outPath), { recursive: true });
  const status = result.blockers.length ? "returned" : "accepted";
  result.status = status;
  const body = `---
workPackageId: ${wpId}
acceptedAt: ${new Date().toISOString()}
status: ${status}
---

## Applicable decisions
${status === "accepted" ? "(from handoff decisionIds)" : "n/a — returned"}

## Contracts
## NFR budgets
## Boundaries (out of slice)
## Residual opens

## Blockers returned (if any)
${result.blockers.map((b) => `- ${b}`).join("\n") || "(none)"}
`;
  writeFileSync(outPath, body);
  console.log(
    JSON.stringify(
      {
        ok: status === "accepted",
        status,
        blockers: result.blockers,
        acceptancePath: outPath,
        workPackageId: wpId,
      },
      null,
      2,
    ),
  );
  process.exit(code);
}

if (!archHandoffPath || !existsSync(archHandoffPath)) {
  fail("missing architect.developer.handoff JSON (--arch-handoff)");
  finish(1);
}

let arch;
try {
  arch = JSON.parse(readFileSync(archHandoffPath, "utf8"));
} catch {
  fail("arch-handoff is not valid JSON");
  finish(1);
}

result.workPackageId = arch.workPackageId;

if (arch.contract !== "architect.developer.handoff") {
  fail(`invalid contract: ${arch.contract ?? "(missing)"}`);
}
if (!arch.version || !/^\d+\.\d+\.\d+$/.test(arch.version)) {
  fail("missing or invalid version");
}
if (!arch.workPackageId) fail("missing workPackageId");
if (!arch.designPackagePath) fail("missing designPackagePath");
if (!arch.contextSlicePath) fail("missing contextSlicePath");
if (!Array.isArray(arch.decisionIds)) fail("missing decisionIds[]");
if (!Array.isArray(arch.features) || arch.features.length === 0) {
  fail("missing features[]");
} else {
  for (const f of arch.features) {
    if (!f?.id || !f?.title) {
      fail(`feature missing id/title: ${JSON.stringify(f)}`);
      continue;
    }
    if (f.readyForDev !== true) {
      fail(`feature ${f.id} not readyForDev`);
    }
  }
}

const designDir = designDirFlag
  ? resolve(designDirFlag)
  : dirname(archHandoffPath);

const sliceCandidates = [
  join(designDir, "context-slice.md"),
  // handoff paths are relative to design root; try common layouts
  join(dirname(designDir), arch.contextSlicePath ?? ""),
  join(designDir, "..", arch.contextSlicePath ?? ""),
].filter(Boolean);

const sliceOk = sliceCandidates.some((p) => p && existsSync(p));
if (!sliceOk && !existsSync(join(designDir, "context-slice.md"))) {
  fail("missing-artifact: context-slice.md");
}

const indexOk =
  existsSync(join(designDir, "index.md")) ||
  existsSync(join(designDir, "design-package.md"));
if (!indexOk) {
  fail("missing-artifact: design package index.md / design-package.md");
}

const changeSpecPath = join(designDir, "change-spec.json");
if (!existsSync(changeSpecPath)) {
  fail(`change-spec missing: ${changeSpecPath}`);
}

if (result.blockers.length) finish(1);
finish(0);
