#!/usr/bin/env node
/**
 * Executable Developer work-package runner (accept → research → plan →
 * approval → implement → final-arbiter → repair loop → quality handoff).
 *
 * Usage:
 *   node plugins/developer/tools/run-work-package.mjs \
 *     --arch-handoff <path> --design-dir <dir> --product <dir> --approve \
 *     [--out <quality-handoff.json>] [--max-repairs 2]
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyChangeSpec,
  planStepForChange,
} from "./lib/apply-change-spec.mjs";
import {
  assertNoDuplicateFrontmatterKeys,
  updateMarkdownFrontmatter,
} from "./lib/frontmatter.mjs";
import {
  assertDeveloperReadyForQuality,
  defaultDevPaths,
} from "./lib/readiness.mjs";
import { assertImplementationAllowed } from "./lib/developer-governance.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const arbiter = join(here, "final-arbiter.mjs");
const acceptTool = join(here, "accept-work-package.mjs");

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function has(name) {
  return args.includes(name);
}

const archHandoffPath = resolve(flag("--arch-handoff") ?? "");
const designDir = resolve(flag("--design-dir") ?? dirname(archHandoffPath));
const product = resolve(flag("--product") ?? "");
const maxRepairs = Number(flag("--max-repairs") ?? "2");
const approve = has("--approve");

if (!archHandoffPath || !existsSync(archHandoffPath)) {
  console.error("missing --arch-handoff");
  process.exit(1);
}
if (!product || !existsSync(product)) {
  console.error("missing --product");
  process.exit(1);
}

const arch = JSON.parse(readFileSync(archHandoffPath, "utf8"));
if (arch.contract !== "architect.developer.handoff") {
  console.error(`unexpected contract: ${arch.contract}`);
  process.exit(1);
}
if (!arch.features?.every((f) => f.readyForDev)) {
  console.error("not all features readyForDev");
  process.exit(1);
}
if (!arch.workPackageId) {
  console.error("arch handoff missing workPackageId");
  process.exit(1);
}

const changeSpecPath = join(designDir, "change-spec.json");
if (!existsSync(changeSpecPath)) {
  console.error(`change-spec missing: ${changeSpecPath}`);
  process.exit(1);
}
const changeSpec = JSON.parse(readFileSync(changeSpecPath, "utf8"));
if (!Array.isArray(changeSpec.changes) || changeSpec.changes.length === 0) {
  console.error("change-spec.changes must be a non-empty array");
  process.exit(1);
}

const runDir = join(designDir, "developer-run");
const devPaths = defaultDevPaths(designDir);
mkdirSync(runDir, { recursive: true });
mkdirSync(dirname(devPaths.acceptancePath), { recursive: true });

// 1) Accept — materialize working view from Architect slice
{
  const r = spawnSync(
    process.execPath,
    [
      acceptTool,
      "--arch-handoff",
      archHandoffPath,
      "--design-dir",
      designDir,
      "--out",
      devPaths.acceptancePath,
    ],
    { encoding: "utf8" },
  );
  if ((r.status ?? 1) !== 0) {
    console.error(r.stdout ?? "");
    console.error(r.stderr ?? "");
    console.error("accept-work-package failed");
    process.exit(1);
  }
  writeFileSync(
    join(runDir, "accept.json"),
    JSON.stringify(
      {
        acceptedAt: new Date().toISOString(),
        workPackageId: arch.workPackageId,
        acceptancePath: relative(runDir, devPaths.acceptancePath)
          .split("\\")
          .join("/"),
        archHandoffPath: relative(runDir, archHandoffPath).split("\\").join("/"),
        product: relative(runDir, product).split("\\").join("/"),
      },
      null,
      2,
    ) + "\n",
  );
}

// 2) Research codebase (deterministic file listing)
function listJs(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) listJs(p, base, out);
    else if (/\.(js|mjs|cjs)$/.test(ent.name)) {
      out.push(relative(base, p).split("\\").join("/"));
    }
  }
  return out;
}
const research = {
  files: listJs(join(product, "src")).concat(listJs(join(product, "test"))),
  targets: changeSpec.changes.map((c) => c.file),
};
writeFileSync(
  join(runDir, "research.json"),
  JSON.stringify(research, null, 2) + "\n",
);

// 3) Plan — every machine op, including creates and package/tooling edits
const planSteps = changeSpec.changes.map((c, i) => planStepForChange(c, i + 1));
const totalPhases = planSteps.length + 2; // ops + arbiter + quality handoff
const planMd = `# Implementation plan — ${arch.workPackageId}

## Research

Files: ${research.files.join(", ") || "(none)"}

## Steps

${planSteps.join("\n")}

${changeSpec.changes.length + 1}. Run final-arbiter (build/test/lint per verificationPolicy)
${changeSpec.changes.length + 2}. Emit developer.quality.handoff
`;
writeFileSync(join(runDir, "plan.md"), planMd);
writeFileSync(devPaths.planPath, planMd);

// plan-status stub (phase 1) — unique frontmatter keys only
writeFileSync(
  devPaths.planStatusPath,
  `---
workPackageId: ${arch.workPackageId}
status: pending
currentPhase: 1
phasesComplete: false
updatedAt: ${new Date().toISOString()}
---

# Plan status — ${arch.workPackageId}

## Log

- ${new Date().toISOString()} created plan (${planSteps.length} implementation steps)
`,
);
assertNoDuplicateFrontmatterKeys(
  readFileSync(devPaths.planStatusPath, "utf8"),
  devPaths.planStatusPath,
);

function appendPlanLog(line) {
  const prev = readFileSync(devPaths.planStatusPath, "utf8");
  const next = prev.trimEnd() + `\n- ${new Date().toISOString()} ${line}\n`;
  writeFileSync(devPaths.planStatusPath, next);
  assertNoDuplicateFrontmatterKeys(next, devPaths.planStatusPath);
}

function setPlanPhase(phase, extra = {}) {
  updateMarkdownFrontmatter(devPaths.planStatusPath, {
    workPackageId: arch.workPackageId,
    currentPhase: phase,
    updatedAt: new Date().toISOString(),
    ...extra,
  });
}

// 4) Approval gate
const approvalPath = join(runDir, "approval.json");
if (!approve) {
  writeFileSync(
    approvalPath,
    JSON.stringify(
      {
        status: "pending",
        reason: "pass --approve to continue",
        planPath: "plan.md",
      },
      null,
      2,
    ) + "\n",
  );
  console.error("approval required: re-run with --approve");
  process.exit(2);
}
writeFileSync(
  approvalPath,
  JSON.stringify(
    {
      status: "approved",
      approvedAt: new Date().toISOString(),
      mode: "cli-flag",
      planSteps: planSteps.length,
    },
    null,
    2,
  ) + "\n",
);
setPlanPhase(1, {
  status: "approved",
  approvedAt: new Date().toISOString(),
  phasesComplete: false,
});
appendPlanLog("plan approved");

function loadPersistedPlan() {
  for (const p of [
    join(runDir, "plan.json"),
    join(designDir, "dev", "plan.json"),
  ]) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf8"));
    }
  }
  return null;
}

function applyChanges() {
  const persisted = loadPersistedPlan();
  if (persisted) assertImplementationAllowed(persisted);
  return applyChangeSpec(product, changeSpec.changes);
}

function runArbiter() {
  const r = spawnSync(process.execPath, [arbiter, "--cwd", product], {
    encoding: "utf8",
  });
  let parsed = null;
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const jsonMatch = out.match(/\{[\s\S]*"verdict"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = null;
    }
  }
  return {
    exitCode: r.status ?? 1,
    parsed,
    raw: out,
  };
}

function repairOnce(attempt) {
  const results = applyChangeSpec(product, changeSpec.changes);
  writeFileSync(
    join(runDir, `repair-${attempt}.json`),
    JSON.stringify(
      {
        attempt,
        action: "reapply-change-spec",
        results,
        at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}

// 5) Implement — advance phases without duplicating frontmatter keys
setPlanPhase(2, { status: "approved", phasesComplete: false });
appendPlanLog("implement in_progress");
let applied;
try {
  applied = applyChanges();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
writeFileSync(
  join(runDir, "implement.json"),
  JSON.stringify({ applied }, null, 2) + "\n",
);
appendPlanLog(`implement done (${applied.length} ops)`);

// Simulate multiple phase transitions (regression for duplicate keys)
for (let phase = 2; phase <= Math.min(3, totalPhases); phase += 1) {
  setPlanPhase(phase, { status: "approved", phasesComplete: false });
}

// 6) Arbiter + repair loop
setPlanPhase(Math.min(totalPhases - 1, 3), {
  status: "approved",
  phasesComplete: false,
});
appendPlanLog("final-arbiter running");
let arb = runArbiter();
let repairs = 0;
while (arb.exitCode !== 0 && repairs < maxRepairs) {
  repairs += 1;
  try {
    repairOnce(repairs);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  arb = runArbiter();
}
writeFileSync(
  join(runDir, "arbiter.json"),
  JSON.stringify(
    {
      exitCode: arb.exitCode,
      repairs,
      verdict: arb.parsed?.verdict ?? (arb.exitCode === 0 ? "PASS" : "FAIL"),
      results: arb.parsed?.results ?? [],
    },
    null,
    2,
  ) + "\n",
);

if (arb.exitCode !== 0) {
  console.error("final-arbiter failed after repairs");
  console.error(arb.raw);
  process.exit(1);
}

const policy = changeSpec.verificationPolicy ?? {};
const requireTests =
  policy.requireTests === true ||
  (policy.requireTests !== false &&
    (changeSpec.changes.some(
      (c) =>
        /(^|\/)test\//.test(c.file) ||
        /\.test\.(js|mjs|cjs)$/.test(c.file) ||
        c.file === "package.json",
    ) ||
      (changeSpec.acceptanceChecks ?? []).some((c) => c.type === "npm-test")));

const results = arb.parsed?.results ?? [];
function step(label) {
  return results.find((r) => r.label === label);
}

function checkFromArbiter(label, required) {
  const s = step(label);
  if (!s || s.skipped) {
    return { status: required ? "failed" : "skipped", required: !!required };
  }
  return { status: s.ok ? "passed" : "failed", required: !!required };
}

const build = checkFromArbiter("build", !!policy.requireBuild);
const tests = checkFromArbiter("test", requireTests);
const lint = checkFromArbiter("lint", !!policy.requireLint);
const parts = [build, tests, lint];
const packageCriteria = {
  status: parts.some((c) => c.status === "failed") ||
    parts.some((c) => c.required && c.status !== "passed")
    ? "failed"
    : "passed",
  required: true,
};

const verification = { build, tests, lint, packageCriteria };

if (requireTests && tests.status !== "passed") {
  console.error(
    "Developer PASS refused: tests did not execute successfully (requireTests)",
  );
  process.exit(1);
}

setPlanPhase(totalPhases, {
  status: "complete",
  phasesComplete: true,
});
appendPlanLog("all phases complete");

const qualityHandoff = {
  contract: "developer.quality.handoff",
  version: "0.1.0",
  workPackageId: arch.workPackageId,
  mergeRequestRef: `local/${arch.workPackageId}`,
  intention: `Implement ${arch.features.map((f) => f.id).join(", ")} per ${arch.decisionIds.join(", ")}`,
  requirementIds: changeSpec.requirementIds ?? [],
  decisionIds: arch.decisionIds,
  verification,
  acceptanceChecks: (changeSpec.acceptanceChecks ?? []).filter(
    (c) => c.file && c.contains,
  ),
};

// Schema validation when @praxis/contracts is resolvable (monorepo);
// otherwise structural checks that packaged plugins can run alone.
async function validateQualityHandoff(data) {
  for (const k of ["build", "tests", "lint", "packageCriteria"]) {
    const c = data.verification?.[k];
    if (!c || !["passed", "failed", "skipped"].includes(c.status)) {
      throw new Error(`verification.${k} invalid`);
    }
    if (typeof c.required !== "boolean") {
      throw new Error(`verification.${k}.required must be boolean`);
    }
  }
  if (!data.workPackageId) throw new Error("missing workPackageId");
  if (data.contract !== "developer.quality.handoff") {
    throw new Error(`unexpected contract ${data.contract}`);
  }

  try {
    const mod = await import("@praxis/contracts");
    mod.parseContract(mod.DeveloperToQualityHandoffSchema, data);
  } catch {
    /* optional — structural checks above already ran */
  }
}

await validateQualityHandoff(qualityHandoff);

const ready = assertDeveloperReadyForQuality({
  workPackageId: arch.workPackageId,
  designDir,
  acceptancePath: devPaths.acceptancePath,
  planStatusPath: devPaths.planStatusPath,
  approvalPath,
  verification,
  qualityHandoff,
  validateHandoff: (data) => {
    // sync structural re-check (async already done)
    if (data.workPackageId !== arch.workPackageId) {
      throw new Error("workPackageId mismatch in handoff object");
    }
    if (data.verification?.packageCriteria?.status !== "passed") {
      throw new Error("packageCriteria not passed");
    }
  },
});

if (!ready.ok) {
  console.error("Developer readiness gate failed — refusing Quality handoff:");
  for (const b of ready.blockers) console.error(`  - ${b}`);
  process.exit(1);
}

const outPath = flag("--out") ?? devPaths.qualityHandoffPath;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(qualityHandoff, null, 2) + "\n");
// Keep a copy under developer-run for tooling that looks there
writeFileSync(
  join(runDir, "developer-quality.handoff.json"),
  JSON.stringify(qualityHandoff, null, 2) + "\n",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      runDir,
      qualityHandoffPath: outPath,
      acceptancePath: devPaths.acceptancePath,
      planStatusPath: devPaths.planStatusPath,
      repairs,
      planSteps,
      applied,
      qualityHandoff,
    },
    null,
    2,
  ),
);
