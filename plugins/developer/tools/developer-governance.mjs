#!/usr/bin/env node
/**
 * Packed Developer governance CLI (WBS 5.2–5.17 local).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeCodebase,
  applyScaleOverride,
  assertImplementationAllowed,
  assertPlanningAllowed,
  completeCaveman,
  createExecutionState,
  createRepairLoop,
  detectStaleBranches,
  evaluateCaveman,
  evaluateDeviationForDeveloper,
  findCodebasePatterns,
  loadAgentContract,
  loadExecutionState,
  locateCodebase,
  locateProjectNotes,
  notesCannotOverrideArchitecture,
  persistExecutionState,
  prepareLocalMergeRequest,
  recordRepairAttempt,
  recordWebResearch,
  runExecutionPhase,
  savePlan,
  snapshotFiles,
  suggestScale,
  writeDesignPreviews,
  writeJson,
  writeResearchArtifact,
} from "./lib/developer-governance.mjs";

const args = process.argv.slice(2);
const verb = args[0];
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function loadIn() {
  const p = flag("--in");
  if (!p) fail("--in <json> is required");
  return JSON.parse(readFileSync(resolve(p), "utf8"));
}

function emit(obj) {
  const out = flag("--out");
  if (out) writeJson(resolve(out), obj);
  console.log(JSON.stringify(obj, null, 2));
}

if (!verb) {
  fail("usage: developer-governance.mjs <verb> …");
}

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  if (verb === "research") {
    const productFlag = flag("--product");
    if (!productFlag) fail("--product is required");
    const product = resolve(productFlag);
    const query = flag("--query") ?? "";
    const needle = flag("--needle") ?? query;
    const before = snapshotFiles(product);
    const locator = locateCodebase({ productRoot: product, query });
    const files = [...new Map(locator.anchors.map((a) => [a.path, { path: a.path }])).values()];
    const analyzer = analyzeCodebase({ productRoot: product, files });
    const patterns = findCodebasePatterns({ productRoot: product, needle });
    const agents = ["codebase-locator", "codebase-analyzer", "codebase-pattern-finder"].map((n) =>
      loadAgentContract(pluginRoot, n),
    );
    const outPath = resolve(flag("--out") ?? join(product, "..", "research.json"));
    const artifact = writeResearchArtifact({
      outPath,
      locator,
      analyzer,
      patterns,
      notes: [],
      web: null,
    });
    const after = snapshotFiles(product);
    if (JSON.stringify(before) !== JSON.stringify(after)) fail("research mutated product source");
    console.log(
      JSON.stringify(
        {
          ...artifact,
          agents: agents.map((a) => a.name),
          rolesDistinct:
            locator.role !== analyzer.role &&
            analyzer.role !== patterns.role &&
            locator.analysis === null,
          productUnchanged: true,
        },
        null,
        2,
      ),
    );
  } else if (verb === "notes") {
    const repo = resolve(flag("--repo") ?? "");
    const notes = locateProjectNotes({ repoRoot: repo });
    const check = notesCannotOverrideArchitecture(
      notes,
      (flag("--decisions") ?? "").split(",").filter(Boolean),
    );
    emit({ notes, ...check });
  } else if (verb === "web-research") {
    const raw = flag("--in") ? loadIn() : {};
    emit(recordWebResearch(raw));
  } else if (verb === "scale") {
    const raw = loadIn();
    const { suggested } = suggestScale(raw);
    emit(
      applyScaleOverride({
        suggested,
        selected: raw.selected,
        actor: raw.actor,
        reason: raw.reason,
        humanConfirmed: raw.humanConfirmed,
        at: raw.at,
      }),
    );
  } else if (verb === "preview") {
    emit(
      writeDesignPreviews({
        outDir: resolve(flag("--out-dir") ?? ""),
        options: flag("--in") ? loadIn().options : [],
        applicable: flag("--applicable") !== "false",
      }),
    );
  } else if (verb === "plan") {
    emit(savePlan(loadIn()));
  } else if (verb === "assert-planning") {
    emit(assertPlanningAllowed(loadIn()));
  } else if (verb === "assert-implement") {
    emit(assertImplementationAllowed(loadIn()));
  } else if (verb === "execution-init") {
    const raw = loadIn();
    const state = createExecutionState(raw);
    persistExecutionState(resolve(flag("--out") ?? ""), state);
    emit(state);
  } else if (verb === "run-phase") {
    const statePath = resolve(flag("--state") ?? "");
    const phase = flag("--phase");
    const markerPath = flag("--marker");
    const state = loadExecutionState(statePath);
    const verifyContains = flag("--verify-contains");
    const verify = () => {
      if (!verifyContains) return { ok: true, evidence: "ok" };
      const [file, needle] = verifyContains.split("::");
      const body = existsSync(resolve(file)) ? readFileSync(resolve(file), "utf8") : "";
      const ok = body.includes(needle ?? "");
      return { ok, evidence: ok ? `contains ${needle}` : `missing ${needle}` };
    };
    const marker = { ran: false };
    try {
      const next = runExecutionPhase(state, phase, { verify, marker });
      persistExecutionState(statePath, next);
      if (markerPath && marker.ran) writeJson(resolve(markerPath), { ran: true, phase });
      emit(next);
      if (next.failedPhase === phase) process.exit(1);
    } catch (e) {
      if (markerPath) {
        writeJson(resolve(markerPath), {
          ran: marker.ran,
          phase,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      throw e;
    }
  } else if (verb === "caveman") {
    const raw = loadIn();
    const gate = evaluateCaveman(raw);
    if (flag("--complete") === "true") {
      emit(
        completeCaveman({
          gate,
          verificationOk: raw.verificationOk === true,
          evidence: raw.evidence,
        }),
      );
    } else emit(gate);
  } else if (verb === "deviation-gate") {
    const request = JSON.parse(readFileSync(resolve(flag("--request") ?? ""), "utf8"));
    const decisionPath = flag("--decision");
    const decision =
      decisionPath && existsSync(resolve(decisionPath))
        ? JSON.parse(readFileSync(resolve(decisionPath), "utf8"))
        : undefined;
    emit(evaluateDeviationForDeveloper({ request, decision }));
  } else if (verb === "repair") {
    const path = resolve(flag("--state") ?? "");
    let loop = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf8"))
      : createRepairLoop({ fingerprint: flag("--fingerprint") ?? "fp" });
    if (flag("--result")) {
      loop = recordRepairAttempt(loop, {
        result: flag("--result"),
        evidence: flag("--evidence") ?? "",
      });
    }
    writeJson(path, loop);
    emit(loop);
  } else if (verb === "mr-prepare") {
    const raw = loadIn();
    emit(prepareLocalMergeRequest({ ...raw, repo: resolve(flag("--repo") ?? raw.repo) }));
  } else if (verb === "stale-branches") {
    emit(
      detectStaleBranches({
        repo: resolve(flag("--repo") ?? ""),
        protectedBranches: (flag("--protected") ?? "main,master").split(","),
        staleAfterDays: Number(flag("--stale-days") ?? "30"),
      }),
    );
  } else {
    fail(`unknown verb ${verb}`);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
