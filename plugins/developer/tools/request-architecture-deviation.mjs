#!/usr/bin/env node
/**
 * Developer files an architecture deviation request (WBS 4.15 / 5.12).
 * Writes JSON only — does not edit ADRs.
 *
 * Usage:
 *   node tools/request-architecture-deviation.mjs --in <request.json> --out <path>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function must(v, name) {
  if (typeof v !== "string" || !v.trim()) {
    console.error(`${name} is required`);
    process.exit(1);
  }
  return v.trim();
}

const inputPath = flag("--in");
if (!inputPath) {
  console.error("usage: request-architecture-deviation.mjs --in <json> --out <path>");
  process.exit(2);
}
const raw = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
const workPackageId = must(raw.workPackageId, "workPackageId");
const affectedId = must(raw.affectedId ?? raw.affectedDecision ?? raw.affectedContract, "affectedId");
const artifact = {
  contract: "architect.deviation.request",
  version: "0.1.0",
  id: raw.id ?? `DEV-${workPackageId}-${affectedId}`,
  status: "open",
  workPackageId,
  affectedId,
  kind: raw.kind === "contract" ? "contract" : "decision",
  requestedDeviation: must(raw.requestedDeviation, "requestedDeviation"),
  reason: must(raw.reason, "reason"),
  impact: must(raw.impact ?? raw.risk, "impact/risk"),
  evidence: must(raw.evidence ?? raw.reference, "evidence/reference"),
  bindingChange: raw.bindingChange === true,
};
const out = resolve(flag("--out") ?? `${artifact.id}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, path: out, id: artifact.id }, null, 2));
