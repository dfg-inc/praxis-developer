import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
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
  locateCodebase,
  locateProjectNotes,
  persistExecutionState,
  prepareLocalMergeRequest,
  recordRepairAttempt,
  recordWebResearch,
  runExecutionPhase,
  savePlan,
  snapshotFiles,
  suggestScale,
  writeDesignPreviews,
  writeResearchArtifact,
} from "../tools/lib/developer-governance.mjs";

const dirs = [];
afterEach(() => {
  while (dirs.length) {
    const d = dirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tmp() {
  const d = mkdtempSync(join(tmpdir(), "dev-gov-"));
  dirs.push(d);
  return d;
}

function git(repo, args, env = {}) {
  const r = spawnSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if ((r.status ?? 1) !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout ?? "").trim();
}

describe("5.2 specialized agents", () => {
  it("separates locator / analyzer / pattern-finder and writes artifact", () => {
    const root = tmp();
    const product = join(root, "product");
    mkdirSync(join(product, "src"), { recursive: true });
    writeFileSync(join(product, "src", "auth.js"), "export function login() { return true }\n");
    const before = snapshotFiles(product);
    const locator = locateCodebase({ productRoot: product, query: "login" });
    expect(locator.role).toBe("codebase-locator");
    expect(locator.analysis).toBeNull();
    expect(locator.anchors[0].path).toBe("src/auth.js");
    const analyzer = analyzeCodebase({
      productRoot: product,
      files: locator.anchors.map((a) => ({ path: a.path })),
    });
    expect(analyzer.role).toBe("codebase-analyzer");
    expect(analyzer.mechanics[0].functions).toContain("login");
    const patterns = findCodebasePatterns({ productRoot: product, needle: "export function login" });
    expect(patterns.invented).toBe(false);
    expect(patterns.patterns[0].path).toBe("src/auth.js");
    const artifact = writeResearchArtifact({
      outPath: join(root, "research.json"),
      locator,
      analyzer,
      patterns,
    });
    expect(artifact.contract).toBe("developer.research.artifact");
    expect(snapshotFiles(product)).toEqual(before);
  });
});

describe("5.3 notes / web", () => {
  it("locates advisory notes without binding override", () => {
    const repo = tmp();
    mkdirSync(join(repo, "notes"), { recursive: true });
    writeFileSync(join(repo, "notes", "impl.md"), "prefer sqlite locally\n");
    const notes = locateProjectNotes({ repoRoot: repo });
    expect(notes[0].path).toBe("notes/impl.md");
    expect(notes[0].binding).toBe(false);
  });

  it("records web research as advisory pending live", () => {
    const rec = recordWebResearch({ sources: ["https://example"], findings: [] });
    expect(rec.advisory).toBe(true);
    expect(rec.liveExecuted).toBe(false);
    expect(rec.pending).toContain("5.3 live web execution");
    expect(rec.cannotMutate).toContain("ADR");
  });
});

describe("5.6.2 scale override", () => {
  it("applies human override", () => {
    const { suggested } = suggestScale({ files: ["a.js"] });
    expect(suggested).toBe("bounded");
    const rec = applyScaleOverride({
      suggested,
      selected: "architectural",
      actor: "alice",
      reason: "touches auth boundary",
      humanConfirmed: true,
    });
    expect(rec.final).toBe("architectural");
    expect(rec.suggested).toBe("bounded");
  });

  it("rejects machine self-override", () => {
    expect(() =>
      applyScaleOverride({
        suggested: "bounded",
        selected: "architectural",
        actor: "machine",
        reason: "no",
        humanConfirmed: true,
      }),
    ).toThrow(/humanConfirmed actor/);
  });

  it("keeps suggested when no override", () => {
    const rec = applyScaleOverride({ suggested: "bounded" });
    expect(rec.final).toBe("bounded");
  });
});

describe("5.7 / 5.8.2 / 5.9.1 / 5.10.1", () => {
  it("writes distinct unapproved previews and backend n/a", () => {
    const dir = tmp();
    const ui = writeDesignPreviews({
      outDir: join(dir, "ui"),
      options: [
        { id: "opt-a", body: "A" },
        { id: "opt-b", body: "B" },
      ],
    });
    expect(ui.approvedOptionId).toBeNull();
    expect(readFileSync(join(dir, "ui", "opt-a.html"), "utf8")).toContain("opt-a");
    expect(readFileSync(join(dir, "ui", "opt-b.html"), "utf8")).toContain("opt-b");
    const be = writeDesignPreviews({ outDir: join(dir, "be"), options: [], applicable: false });
    expect(be.applicable).toBe(false);
    expect(be.options).toEqual([]);
  });

  it("blocks implementation unless approved", () => {
    const rejected = savePlan({ workPackageId: "WP-1", status: "rejected", reason: "no" });
    expect(() => assertImplementationAllowed(rejected)).toThrow(/blocked/);
    expect(() => assertPlanningAllowed({ status: "returned" })).toThrow(/architect/);
    expect(assertImplementationAllowed(savePlan({ workPackageId: "WP-1", status: "approved" })).ok).toBe(
      true,
    );
  });

  it("resumes from persisted state without rerunning green phase", () => {
    let state = createExecutionState({
      workPackageId: "WP-1",
      phases: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    });
    const path = join(tmp(), "state.json");
    state = runExecutionPhase(state, "p1", { verify: () => ({ ok: true, evidence: "p1-ok" }) });
    persistExecutionState(path, state);
    const loaded = JSON.parse(readFileSync(path, "utf8"));
    expect(loaded.completedPhases).toEqual(["p1"]);
    expect(loaded.phases[0].evidence).toBe("p1-ok");
    const next = runExecutionPhase(loaded, "p2", { verify: () => ({ ok: true, evidence: "p2" }) });
    expect(next.completedPhases).toEqual(["p1", "p2"]);
  });

  it("blocks next phase when current is red", () => {
    const marker = { ran: false };
    let state = createExecutionState({
      workPackageId: "WP-1",
      phases: [{ id: "p1" }, { id: "p2" }],
    });
    state = runExecutionPhase(state, "p1", { verify: () => ({ ok: false, evidence: "fail" }) });
    expect(state.phases[0].status).toBe("red");
    expect(() => runExecutionPhase(state, "p2", { marker })).toThrow(/red-phase-block/);
    expect(marker.ran).toBe(false);
  });
});

describe("5.11 / 5.12 / 5.14", () => {
  it("allows bounded caveman and rejects architectural / red", () => {
    const ok = evaluateCaveman({
      files: ["a.js"],
      knowledgeLoaded: true,
      acceptanceCriteria: "file contains ok",
    });
    expect(ok.allowed).toBe(true);
    expect(completeCaveman({ gate: ok, verificationOk: true, evidence: "green" }).ok).toBe(true);
    const arch = evaluateCaveman({
      files: ["a.js", "b.js"],
      architectural: true,
      knowledgeLoaded: true,
      acceptanceCriteria: "x",
    });
    expect(arch.allowed).toBe(false);
    expect(() => completeCaveman({ gate: ok, verificationOk: false })).toThrow(/verification red/);
  });

  it("gates implementation on architect deviation outcomes", () => {
    const request = {
      contract: "architect.deviation.request",
      workPackageId: "WP-1",
      affectedId: "ADR-1",
      requestedDeviation: "sqlite",
      reason: "ci",
      impact: "low",
      evidence: "ci.yml",
    };
    expect(evaluateDeviationForDeveloper({ request }).implementationAllowed).toBe(false);
    expect(
      evaluateDeviationForDeveloper({
        request,
        decision: { contract: "architect.deviation.decision", outcome: "approved", id: "d1" },
      }).implementationAllowed,
    ).toBe(true);
    expect(
      evaluateDeviationForDeveloper({
        request,
        decision: { contract: "architect.deviation.decision", outcome: "rejected", id: "d1" },
      }).implementationAllowed,
    ).toBe(false);
    expect(
      evaluateDeviationForDeveloper({
        request,
        decision: { contract: "architect.deviation.decision", outcome: "revise", id: "d1" },
      }).implementationAllowed,
    ).toBe(false);
  });

  it("enforces repair 3+2 without a sixth attempt", () => {
    let loop = createRepairLoop({ fingerprint: "same" });
    loop = recordRepairAttempt(loop, { result: "fail", evidence: "1" });
    loop = recordRepairAttempt(loop, { result: "success", evidence: "2" });
    expect(loop.status).toBe("resolved");
    expect(loop.attempts).toHaveLength(2);

    loop = createRepairLoop({ fingerprint: "same" });
    for (let i = 0; i < 3; i += 1) {
      loop = recordRepairAttempt(loop, { result: "fail", evidence: String(i) });
    }
    expect(loop.tier).toBe(2);
    for (let i = 0; i < 2; i += 1) {
      loop = recordRepairAttempt(loop, { result: "fail", evidence: `e${i}` });
    }
    expect(loop.status).toBe("human-escalation");
    expect(loop.attempts).toHaveLength(5);
    expect(() => recordRepairAttempt(loop, { result: "fail", evidence: "6" })).toThrow(/sixth attempt/);
  });
});

describe("5.15 / 5.17 git", () => {
  it("prepares local MR payload from a real repo", () => {
    const repo = tmp();
    git(repo, ["init", "-b", "main"]);
    git(repo, ["config", "user.email", "t@t.t"]);
    git(repo, ["config", "user.name", "t"]);
    writeFileSync(join(repo, "a.txt"), "base\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "base"]);
    git(repo, ["checkout", "-b", "feat"]);
    writeFileSync(join(repo, "b.txt"), "feat\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "feat"]);
    const mr = prepareLocalMergeRequest({
      repo,
      baseBranch: "main",
      workPackageId: "WP-1",
      title: "feat",
      intention: "ship",
      requirementIds: ["FR-1"],
      decisionIds: ["ADR-1"],
      qualityHandoffRef: "handoff.json",
    });
    expect(mr.branch).toBe("feat");
    expect(mr.changedFiles).toContain("b.txt");
    expect(mr.commits.length).toBeGreaterThan(0);
    expect(mr.remoteCreated).toBe(false);
  });

  it("detects stale merged branches in dry-run", () => {
    const repo = tmp();
    git(repo, ["init", "-b", "main"]);
    git(repo, ["config", "user.email", "t@t.t"]);
    git(repo, ["config", "user.name", "t"]);
    writeFileSync(join(repo, "a.txt"), "base\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "base"]);
    git(repo, ["checkout", "-b", "old-merged"]);
    writeFileSync(join(repo, "old.txt"), "old\n");
    git(repo, ["add", "."]);
    git(repo, [
      "commit",
      "-m",
      "old",
      "--date",
      "2020-01-01T00:00:00",
    ], {
      GIT_AUTHOR_DATE: "2020-01-01T00:00:00",
      GIT_COMMITTER_DATE: "2020-01-01T00:00:00",
    });
    git(repo, ["checkout", "main"]);
    git(repo, ["merge", "--no-ff", "old-merged", "-m", "merge old"]);
    git(repo, ["checkout", "-b", "fresh-active"]);
    writeFileSync(join(repo, "fresh.txt"), "fresh\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "fresh"]);
    git(repo, ["checkout", "-b", "current-feat"]);
    writeFileSync(join(repo, "cur.txt"), "cur\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "cur"]);
    const hy = detectStaleBranches({ repo, staleAfterDays: 30, nowMs: Date.now() });
    expect(hy.dryRun).toBe(true);
    expect(hy.deleted).toEqual([]);
    expect(hy.stale.some((b) => b.name === "old-merged")).toBe(true);
    expect(hy.kept.some((b) => b.name === "main" && b.reasons.includes("protected"))).toBe(true);
    expect(hy.kept.some((b) => b.name === "current-feat" && b.reasons.includes("current"))).toBe(
      true,
    );
    expect(hy.stale.some((b) => b.name === "fresh-active")).toBe(false);
  });
});
