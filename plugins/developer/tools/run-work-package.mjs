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

const here = dirname(fileURLToPath(import.meta.url));
const arbiter = join(here, "final-arbiter.mjs");

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

const changeSpecPath = join(designDir, "change-spec.json");
if (!existsSync(changeSpecPath)) {
  console.error(`change-spec missing: ${changeSpecPath}`);
  process.exit(1);
}
const changeSpec = JSON.parse(readFileSync(changeSpecPath, "utf8"));

const runDir = join(designDir, "developer-run");
mkdirSync(runDir, { recursive: true });

// 1) Accept
const accept = {
  acceptedAt: new Date().toISOString(),
  workPackageId: arch.workPackageId,
  archHandoffPath: relative(runDir, archHandoffPath).split("\\").join("/"),
  product: relative(runDir, product).split("\\").join("/"),
};
writeFileSync(join(runDir, "accept.json"), JSON.stringify(accept, null, 2) + "\n");

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

// 3) Plan
const planMd = `# Implementation plan — ${arch.workPackageId}

## Research

Files: ${research.files.join(", ") || "(none)"}

## Steps

${changeSpec.changes
  .map((c, i) => `${i + 1}. Edit \`${c.file}\`: ${c.description}`)
  .join("\n")}

${changeSpec.changes.length + 1}. Run final-arbiter (build/test/lint)
${changeSpec.changes.length + 2}. Emit developer.quality.handoff
`;
writeFileSync(join(runDir, "plan.md"), planMd);

// 4) Approval gate
const approvalPath = join(runDir, "approval.json");
if (!approve) {
  writeFileSync(
    approvalPath,
    JSON.stringify(
      { status: "pending", reason: "pass --approve to continue" },
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
    { status: "approved", approvedAt: new Date().toISOString(), mode: "cli-flag" },
    null,
    2,
  ) + "\n",
);

function applyChanges() {
  for (const c of changeSpec.changes) {
    const fp = join(product, c.file);
    if (!existsSync(fp)) throw new Error(`missing file ${c.file}`);
    let text = readFileSync(fp, "utf8");
    if (!text.includes(c.match)) {
      if (text.includes(c.replace)) {
        continue; // already applied
      }
      throw new Error(`match not found in ${c.file}: ${c.match}`);
    }
    text = text.replace(c.match, c.replace);
    writeFileSync(fp, text);
  }
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
  // Deterministic repair: re-apply change-spec match→replace (product-agnostic).
  for (const c of changeSpec.changes) {
    const fp = join(product, c.file);
    if (!existsSync(fp)) continue;
    let text = readFileSync(fp, "utf8");
    if (text.includes(c.replace)) continue;
    if (text.includes(c.match)) {
      text = text.replace(c.match, c.replace);
      writeFileSync(fp, text);
    }
  }
  writeFileSync(
    join(runDir, `repair-${attempt}.json`),
    JSON.stringify(
      { attempt, action: "reapply-change-spec", at: new Date().toISOString() },
      null,
      2,
    ) + "\n",
  );
}

// 5) Implement
applyChanges();
writeFileSync(
  join(runDir, "implement.json"),
  JSON.stringify({ applied: changeSpec.changes.map((c) => c.file) }, null, 2) +
    "\n",
);

// 6) Arbiter + repair loop
let arb = runArbiter();
let repairs = 0;
while (arb.exitCode !== 0 && repairs < maxRepairs) {
  repairs += 1;
  repairOnce(repairs);
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

const verification = {
  build: true,
  tests: true,
  lint: true,
  packageCriteria: true,
};
for (const r of arb.parsed?.results ?? []) {
  if (r.label === "build") verification.build = !!r.ok;
  if (r.label === "test") verification.tests = !!r.ok;
  if (r.label === "lint") verification.lint = !!r.ok;
}
verification.packageCriteria =
  verification.build && verification.tests && verification.lint;

const qualityHandoff = {
  contract: "developer.quality.handoff",
  version: "0.1.0",
  mergeRequestRef: `local/${arch.workPackageId}`,
  intention: `Implement ${arch.features.map((f) => f.id).join(", ")} per ${arch.decisionIds.join(", ")}`,
  requirementIds: changeSpec.requirementIds ?? [],
  decisionIds: arch.decisionIds,
  verification,
  acceptanceChecks: changeSpec.acceptanceChecks ?? [],
};

const outPath =
  flag("--out") ?? join(runDir, "developer-quality.handoff.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(qualityHandoff, null, 2) + "\n");

console.log(
  JSON.stringify(
    {
      ok: true,
      runDir,
      qualityHandoffPath: outPath,
      repairs,
      qualityHandoff,
    },
    null,
    2,
  ),
);
