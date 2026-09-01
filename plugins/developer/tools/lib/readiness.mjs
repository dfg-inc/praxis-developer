/**
 * Developer readiness gate before emitting developer.quality.handoff.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertNoDuplicateFrontmatterKeys,
  parseSimpleFrontmatter,
  splitFrontmatter,
} from "./frontmatter.mjs";

/**
 * @param {{
 *   workPackageId: string,
 *   designDir: string,
 *   acceptancePath: string,
 *   planStatusPath: string,
 *   approvalPath?: string,
 *   verification: Record<string, { status: string, required: boolean }>,
 *   qualityHandoff: Record<string, unknown>,
 *   validateHandoff?: (data: unknown) => void,
 * }} input
 * @returns {{ ok: true } | { ok: false, blockers: string[] }}
 */
export function assertDeveloperReadyForQuality(input) {
  const blockers = [];
  const {
    workPackageId,
    acceptancePath,
    planStatusPath,
    approvalPath,
    verification,
    qualityHandoff,
  } = input;

  if (!workPackageId) blockers.push("missing workPackageId");

  if (!existsSync(acceptancePath)) {
    blockers.push(`acceptance journal missing: ${acceptancePath}`);
  } else {
    const text = readFileSync(acceptancePath, "utf8");
    try {
      assertNoDuplicateFrontmatterKeys(text, acceptancePath);
    } catch (e) {
      blockers.push(e instanceof Error ? e.message : String(e));
    }
    const { frontmatter, body } = splitFrontmatter(text);
    const fm = parseSimpleFrontmatter(frontmatter);
    if (fm.workPackageId && fm.workPackageId !== workPackageId) {
      blockers.push(
        `WP id mismatch: acceptance.md has ${fm.workPackageId}, expected ${workPackageId}`,
      );
    }
    if (fm.status !== "accepted") {
      blockers.push(
        `acceptance status is ${fm.status ?? "(missing)"}, not accepted`,
      );
    }
    for (const heading of [
      "Applicable decisions",
      "Contracts",
      "NFR budgets",
      "Boundaries (out of slice)",
      "Residual opens",
    ]) {
      const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
        "i",
      );
      const m = body.match(re);
      const content = (m?.[1] ?? "").trim();
      if (!content) {
        blockers.push(`acceptance.md section empty: ${heading}`);
      }
    }
  }

  if (!existsSync(planStatusPath)) {
    blockers.push(`plan-status missing: ${planStatusPath}`);
  } else {
    const text = readFileSync(planStatusPath, "utf8");
    try {
      assertNoDuplicateFrontmatterKeys(text, planStatusPath);
    } catch (e) {
      blockers.push(e instanceof Error ? e.message : String(e));
    }
    const fm = parseSimpleFrontmatter(splitFrontmatter(text).frontmatter);
    if (fm.workPackageId && fm.workPackageId !== workPackageId) {
      blockers.push(
        `WP id mismatch: plan-status.md has ${fm.workPackageId}, expected ${workPackageId}`,
      );
    }
    if (fm.status && fm.status !== "approved" && fm.status !== "complete") {
      blockers.push(`plan not approved (status=${fm.status})`);
    }
    if (String(fm.phasesComplete) !== "true") {
      blockers.push(
        "implementation phases not complete (phasesComplete!=true)",
      );
    }
  }

  if (approvalPath && existsSync(approvalPath)) {
    try {
      const a = JSON.parse(readFileSync(approvalPath, "utf8"));
      if (a.status !== "approved") {
        blockers.push(`approval not approved (${a.status})`);
      }
    } catch {
      blockers.push("approval.json unreadable");
    }
  }

  const v = verification;
  for (const [name, check] of Object.entries(v)) {
    if (!check || typeof check !== "object") {
      blockers.push(`verification.${name} missing structured status`);
      continue;
    }
    if (check.status === "failed") {
      blockers.push(`verification.${name} failed`);
    } else if (check.required && check.status !== "passed") {
      blockers.push(
        `verification.${name} required but status=${check.status}`,
      );
    }
  }
  if (v.packageCriteria?.status !== "passed") {
    blockers.push("packageCriteria not passed");
  }

  if (qualityHandoff?.workPackageId !== workPackageId) {
    blockers.push(
      `Quality handoff workPackageId mismatch: ${qualityHandoff?.workPackageId} vs ${workPackageId}`,
    );
  }

  if (typeof input.validateHandoff === "function") {
    try {
      input.validateHandoff(qualityHandoff);
    } catch (e) {
      blockers.push(
        `Quality handoff schema invalid: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  if (blockers.length) return { ok: false, blockers };
  return { ok: true };
}

/** Convenience: default paths under designDir/dev */
export function defaultDevPaths(designDir) {
  const dev = join(designDir, "dev");
  return {
    acceptancePath: join(dev, "acceptance.md"),
    planStatusPath: join(dev, "plan-status.md"),
    planPath: join(dev, "plan.md"),
    qualityHandoffPath: join(dev, "quality-handoff.json"),
  };
}
