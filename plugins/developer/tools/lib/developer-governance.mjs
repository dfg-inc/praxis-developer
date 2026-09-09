/**
 * Deterministic Developer governance (WBS 5.2–5.15 local, 5.17).
 * No network, no Jira, no LLM. Packed as plain .mjs with the plugin.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

function fail(msg) {
  throw new Error(msg);
}

function writeJson(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`);
  return obj;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fingerprint(text) {
  return createHash("sha256").update(String(text)).digest("hex").slice(0, 16);
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function rel(root, p) {
  return relative(root, p).split("\\").join("/");
}

export function loadAgentContract(pluginRoot, name) {
  const path = join(pluginRoot, "agents", `${name}.md`);
  if (!existsSync(path)) fail(`missing agent definition: ${name}`);
  const text = readFileSync(path, "utf8");
  return { name, path: rel(pluginRoot, path), text };
}

/** 5.2 — locator: paths/symbols only, no architecture essay. */
export function locateCodebase({ productRoot, query }) {
  const q = String(query ?? "").toLowerCase();
  if (!q) fail("locator query is required");
  const anchors = [];
  for (const file of walkFiles(productRoot)) {
    if (!/\.(js|mjs|cjs|ts|tsx|md)$/.test(file)) continue;
    const body = readFileSync(file, "utf8");
    const lines = body.split("\n");
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(q)) {
        anchors.push({
          path: rel(productRoot, file),
          line: i + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    });
  }
  return {
    role: "codebase-locator",
    query,
    anchors,
    analysis: null,
  };
}

/** 5.2 — analyzer: only files handed in (does not rescan the tree). */
export function analyzeCodebase({ productRoot, files }) {
  if (!Array.isArray(files) || files.length === 0) fail("analyzer requires files from locator");
  const mechanics = [];
  for (const f of files) {
    const abs = resolve(productRoot, f.path ?? f);
    if (!existsSync(abs)) fail(`analyzer file missing: ${f.path ?? f}`);
    const body = readFileSync(abs, "utf8");
    const fns = [...body.matchAll(/\bfunction\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const exports_ = [...body.matchAll(/\bexport\s+(?:function|const|class)\s+([A-Za-z0-9_]+)/g)].map(
      (m) => m[1],
    );
    mechanics.push({
      path: f.path ?? f,
      functions: [...new Set([...fns, ...exports_])],
      bytes: body.length,
    });
  }
  return { role: "codebase-analyzer", scopedTo: files.map((f) => f.path ?? f), mechanics };
}

/** 5.2 — pattern finder: never invents a missing pattern. */
export function findCodebasePatterns({ productRoot, needle }) {
  const n = String(needle ?? "");
  if (!n) fail("pattern needle is required");
  const matches = [];
  for (const file of walkFiles(productRoot)) {
    if (!/\.(js|mjs|cjs|ts)$/.test(file)) continue;
    const body = readFileSync(file, "utf8");
    if (!body.includes(n)) continue;
    const line = body.split("\n").findIndex((l) => l.includes(n)) + 1;
    matches.push({ path: rel(productRoot, file), line, reference: n });
  }
  return {
    role: "codebase-pattern-finder",
    needle: n,
    patterns: matches,
    invented: false,
  };
}

export function writeResearchArtifact({
  outPath,
  locator,
  analyzer,
  patterns,
  notes = [],
  web = null,
}) {
  const artifact = {
    contract: "developer.research.artifact",
    version: "0.1.0",
    locator,
    analyzer,
    patterns,
    notes,
    web,
    binding: false,
  };
  return writeJson(outPath, artifact);
}

export function snapshotFiles(root) {
  const map = {};
  for (const f of walkFiles(root).sort()) {
    if (statSync(f).isFile()) map[rel(root, f)] = readFileSync(f, "utf8");
  }
  return map;
}

/** 5.3A — project notes: advisory, never binding. */
export function locateProjectNotes({ repoRoot }) {
  const roots = ["notes", "docs/notes", ".praxis/notes", "engineering-notes"];
  const notes = [];
  for (const r of roots) {
    const dir = join(repoRoot, r);
    if (!existsSync(dir)) continue;
    for (const f of walkFiles(dir)) {
      if (!f.endsWith(".md")) continue;
      notes.push({
        path: rel(repoRoot, f),
        kind: "engineering-note",
        binding: false,
        excerpt: readFileSync(f, "utf8").slice(0, 240),
      });
    }
  }
  return notes;
}

export function notesCannotOverrideArchitecture(notes, decisionIds = []) {
  for (const n of notes) {
    if (n.binding === true) fail("engineering notes must not be binding");
  }
  return { ok: true, decisionIds, notesAreAdvisory: true };
}

/** 5.3B — web research record without live network. */
export function recordWebResearch({ sources = [], findings = [], liveExecuted = false } = {}) {
  return {
    contract: "developer.web-research.advisory",
    version: "0.1.0",
    advisory: true,
    liveExecuted: liveExecuted === true,
    pending: liveExecuted ? [] : ["5.3 live web execution"],
    sources,
    findings,
    cannotMutate: ["requirements", "canon", "ADR", "platform-contracts"],
  };
}

export const PLAN_STATUSES_BLOCKING_IMPLEMENT = [
  "draft",
  "rejected",
  "returned",
  "invalid",
  "awaiting-approval",
];

export function savePlan(plan) {
  const status = plan?.status;
  if (!status) fail("plan.status is required");
  return {
    contract: "developer.plan",
    version: "0.1.0",
    workPackageId: plan.workPackageId,
    status,
    reason: plan.reason ?? "",
    phases: Array.isArray(plan.phases) ? plan.phases : [],
    humanApproval: plan.humanApproval ?? null,
  };
}

export function assertImplementationAllowed(plan) {
  if (!plan || plan.status !== "approved") {
    fail(
      `implementation blocked: plan status is ${plan?.status ?? "(missing)"}, need approved`,
    );
  }
  return { ok: true };
}

export function suggestScale(input) {
  const files = Array.isArray(input?.files) ? input.files : [];
  const architectural = input?.architectural === true || input?.multiBoundary === true;
  let suggested = "bounded";
  if (architectural) suggested = "architectural";
  else if (files.length <= 1 && input?.exploratory === true) suggested = "exploratory";
  else if (files.length <= 2) suggested = "bounded";
  return { suggested, files };
}

export function applyScaleOverride({ suggested, selected, actor, reason, humanConfirmed, at }) {
  if (selected && selected !== suggested) {
    if (humanConfirmed !== true || !actor || actor === "machine") {
      fail("scale override requires humanConfirmed actor");
    }
    if (!reason) fail("scale override requires reason");
  }
  const final = selected ?? suggested;
  return {
    contract: "developer.scale",
    version: "0.1.0",
    suggested,
    selected: final,
    final,
    actor: selected && selected !== suggested ? actor : actor ?? "machine",
    reason: selected && selected !== suggested ? reason : reason ?? "no-override",
    humanConfirmed: selected && selected !== suggested ? true : Boolean(humanConfirmed),
    at: at ?? new Date().toISOString(),
    machineSelfOverride: false,
  };
}

export function writeDesignPreviews({ outDir, options, applicable = true }) {
  mkdirSync(outDir, { recursive: true });
  if (!applicable) {
    const rec = {
      contract: "developer.design.preview",
      version: "0.1.0",
      applicable: false,
      reason: "backend-only",
      options: [],
      approvedOptionId: null,
    };
    writeJson(join(outDir, "preview.json"), rec);
    return rec;
  }
  if (!Array.isArray(options) || options.length < 2) fail("UI preview needs at least two options");
  const written = [];
  for (const opt of options) {
    if (!opt?.id) fail("preview option id required");
    const html = `<!doctype html><html><head><title>${opt.id}</title></head><body data-option-id="${opt.id}"><h1>${opt.id}</h1><p>${opt.body ?? ""}</p><p data-approval="none">not approved</p></body></html>`;
    const path = join(outDir, `${opt.id}.html`);
    writeFileSync(path, html);
    written.push({ id: opt.id, path, approved: false });
  }
  const rec = {
    contract: "developer.design.preview",
    version: "0.1.0",
    applicable: true,
    options: written,
    approvedOptionId: null,
  };
  writeJson(join(outDir, "preview.json"), rec);
  return rec;
}

export function createExecutionState({ workPackageId, phases }) {
  if (!Array.isArray(phases) || phases.length === 0) fail("phases required");
  return {
    contract: "developer.execution.state",
    version: "0.1.0",
    workPackageId,
    currentPhase: phases[0].id,
    completedPhases: [],
    failedPhase: null,
    inProgressPhase: null,
    phases: phases.map((p) => ({
      id: p.id,
      status: "pending",
      evidence: null,
    })),
  };
}

export function persistExecutionState(path, state) {
  return writeJson(path, state);
}

export function loadExecutionState(path) {
  return readJson(path);
}

export function runExecutionPhase(state, phaseId, { verify, marker } = {}) {
  const idx = state.phases.findIndex((p) => p.id === phaseId);
  if (idx < 0) fail(`unknown phase ${phaseId}`);
  if (idx > 0) {
    const prev = state.phases[idx - 1];
    if (prev.status !== "green") {
      fail(`red-phase-block: ${prev.id} is ${prev.status}; cannot start ${phaseId}`);
    }
  }
  if (marker) marker.ran = true;
  state.inProgressPhase = phaseId;
  const result = typeof verify === "function" ? verify() : { ok: true, evidence: "ok" };
  const phase = state.phases[idx];
  if (result?.ok) {
    phase.status = "green";
    phase.evidence = result.evidence ?? "pass";
    state.failedPhase = null;
    state.completedPhases = [...new Set([...state.completedPhases, phaseId])];
    state.currentPhase = state.phases[idx + 1]?.id ?? phaseId;
  } else {
    phase.status = "red";
    phase.evidence = result?.evidence ?? "fail";
    state.failedPhase = phaseId;
    state.currentPhase = phaseId;
  }
  state.inProgressPhase = null;
  return state;
}

export function evaluateCaveman(input) {
  const files = Array.isArray(input?.files) ? input.files : [];
  const reasons = [];
  if (input?.architectural === true || input?.scale === "architectural") {
    reasons.push("architectural");
  }
  if (input?.multiBoundary === true || input?.highRisk === true) reasons.push("high-risk/cross-boundary");
  if (files.length > 2) reasons.push("scope-too-large");
  if (!input?.acceptanceCriteria) reasons.push("missing-acceptance-criteria");
  if (!input?.knowledgeLoaded) reasons.push("knowledge-not-loaded");
  const allowed = reasons.length === 0;
  return {
    contract: "developer.caveman.gate",
    version: "0.1.0",
    allowed,
    reasons,
    files,
    requiresVerification: true,
  };
}

export function completeCaveman({ gate, verificationOk, evidence }) {
  if (!gate?.allowed) fail(`caveman rejected: ${(gate.reasons ?? []).join(",")}`);
  if (!verificationOk) fail("caveman completion blocked: verification red");
  return { ok: true, evidence: evidence ?? "green" };
}

export function evaluateDeviationForDeveloper({ request, decision }) {
  if (!request || request.contract !== "architect.deviation.request") {
    fail("developer deviation gate requires architect.deviation.request");
  }
  const fields = [
    "workPackageId",
    "affectedId",
    "requestedDeviation",
    "reason",
    "impact",
    "evidence",
  ];
  for (const f of fields) {
    if (!request[f]) fail(`deviation request missing ${f}`);
  }
  if (!decision) {
    return { implementationAllowed: false, wait: true, outcome: "pending" };
  }
  if (decision.contract !== "architect.deviation.decision") {
    fail("unexpected deviation decision contract");
  }
  if (decision.outcome === "approved") {
    return {
      implementationAllowed: true,
      outcome: "approved",
      approvedDeviationId: decision.id,
    };
  }
  return { implementationAllowed: false, outcome: decision.outcome, wait: true };
}

export function createRepairLoop({ fingerprint: fp }) {
  return {
    contract: "developer.repair.loop",
    version: "0.1.0",
    fingerprint: fp,
    attempts: [],
    tier: 1,
    status: "open",
  };
}

export function recordRepairAttempt(loop, { result, evidence }) {
  if (loop.status === "human-escalation") {
    fail("repair loop exhausted; sixth attempt is not executed");
  }
  if (loop.status === "resolved") fail("repair loop already resolved");
  const n = loop.attempts.length + 1;
  const tier = n <= 3 ? 1 : 2;
  if (n > 5) fail("repair loop exhausted; sixth attempt is not executed");
  loop.attempts.push({
    attempt: n,
    tier,
    fingerprint: loop.fingerprint,
    result,
    evidence: evidence ?? "",
  });
  loop.tier = tier;
  if (result === "success") {
    loop.status = "resolved";
    return loop;
  }
  if (n >= 5) loop.status = "human-escalation";
  else if (n === 3) loop.tier = 2;
  return loop;
}

function git(repo, args) {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  if ((r.status ?? 1) !== 0) {
    fail(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout ?? "").trim();
}

export function prepareLocalMergeRequest(input) {
  const repo = input.repo;
  const baseBranch = input.baseBranch ?? "main";
  const branch = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const range = `${baseBranch}..HEAD`;
  const commits = git(repo, ["log", "--format=%H", range])
    .split("\n")
    .filter(Boolean);
  const changedFiles = git(repo, ["diff", "--name-only", range])
    .split("\n")
    .filter(Boolean);
  return {
    contract: "developer.merge-request.local",
    version: "0.1.0",
    branch,
    baseBranch,
    commitRange: range,
    commits,
    changedFiles,
    title: input.title ?? `WP ${input.workPackageId}`,
    intention: input.intention ?? "",
    workPackageId: input.workPackageId,
    requirementIds: input.requirementIds ?? [],
    decisionIds: input.decisionIds ?? [],
    approvedDeviationIds: input.approvedDeviationIds ?? [],
    verification: input.verification ?? {},
    qualityHandoffRef: input.qualityHandoffRef ?? null,
    remoteCreated: false,
  };
}

export function detectStaleBranches({
  repo,
  protectedBranches = ["main", "master"],
  staleAfterDays = 30,
  nowMs = Date.now(),
}) {
  const current = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const mergedRaw = git(repo, ["branch", "--merged"]);
  const merged = new Set(
    mergedRaw
      .split("\n")
      .map((l) => l.replace(/^\*/, "").trim())
      .filter(Boolean),
  );
  const refs = git(repo, [
    "for-each-ref",
    "--format=%(refname:short)|%(committerdate:unix)",
    "refs/heads",
  ]);
  const stale = [];
  const kept = [];
  for (const line of refs.split("\n").filter(Boolean)) {
    const [name, unix] = line.split("|");
    const reasons = [];
    const ageDays = (nowMs / 1000 - Number(unix)) / 86400;
    if (protectedBranches.includes(name)) reasons.push("protected");
    if (name === current) reasons.push("current");
    const isMerged = merged.has(name);
    const isStaleAge = ageDays >= staleAfterDays;
    let staleHit = false;
    if (!reasons.length && isMerged && isStaleAge) {
      staleHit = true;
      reasons.push("merged-old");
    } else if (!reasons.length) {
      reasons.push(isMerged ? "merged-recent" : "active");
    }
    const rec = { name, ageDays: Number(ageDays.toFixed(2)), reasons, stale: staleHit };
    if (staleHit) stale.push(rec);
    else kept.push(rec);
  }
  return {
    contract: "developer.branch.hygiene",
    version: "0.1.0",
    dryRun: true,
    deleted: [],
    current,
    stale,
    kept,
  };
}

export function assertPlanningAllowed(acceptance) {
  const status = acceptance?.status;
  if (status !== "accepted") {
    fail(`create-plan blocked: acceptance ${status}; return to architect`);
  }
  return { ok: true };
}

export { writeJson, readJson, fingerprint, fail };
