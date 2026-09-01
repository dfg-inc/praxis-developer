/**
 * Materialize Developer acceptance journal from Architect handoff + context slice.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * @param {string} markdown
 * @param {string} heading  e.g. "Out of slice"
 */
export function extractMarkdownSection(markdown, heading) {
  const re = new RegExp(
    `##\\s*${escapeRegExp(heading)}\\b([^\\n]*)\\n([\\s\\S]*?)(?=\\n##\\s|\\n?$)`,
    "i",
  );
  const m = markdown.match(re);
  if (!m) return null;
  return m[2].trim();
}

/**
 * @param {string} markdown
 * @param {string} heading
 */
export function extractMarkdownSubSection(markdown, parentHeading, subHeading) {
  const parent = extractMarkdownSection(markdown, parentHeading);
  if (!parent) return null;
  const re = new RegExp(
    `###\\s*${escapeRegExp(subHeading)}\\b([^\\n]*)\\n([\\s\\S]*?)(?=\\n###\\s|\\n?$)`,
    "i",
  );
  const m = parent.match(re);
  if (!m) return null;
  return m[2].trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function orNone(text) {
  const t = (text ?? "").trim();
  if (!t || t === "n/a" || /^none\.?$/i.test(t)) return "None";
  return t;
}

/**
 * Resolve context-slice.md path beside design package / handoff.
 * @param {string} designDir
 * @param {{ contextSlicePath?: string }} arch
 */
export function resolveContextSlicePath(designDir, arch) {
  const candidates = [
    join(designDir, "context-slice.md"),
    arch.contextSlicePath
      ? join(dirname(designDir), arch.contextSlicePath)
      : "",
    arch.contextSlicePath ? join(designDir, "..", arch.contextSlicePath) : "",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

/**
 * Build acceptance.md body from handoff + slice (no invented facts).
 * @param {{
 *   workPackageId: string,
 *   status: 'accepted'|'returned',
 *   blockers: string[],
 *   arch: { decisionIds?: string[], contextSlicePath?: string },
 *   designDir: string,
 * }} input
 */
export function buildAcceptanceJournal(input) {
  const { workPackageId, status, blockers, arch, designDir } = input;
  const slicePath = resolveContextSlicePath(designDir, arch);
  const slice = slicePath && existsSync(slicePath)
    ? readFileSync(slicePath, "utf8")
    : "";

  const decisionsFromSlice =
    extractMarkdownSubSection(slice, "In slice", "Decisions") ??
    extractMarkdownSection(slice, "Applicable decisions");
  const contractsFromSlice =
    extractMarkdownSubSection(slice, "In slice", "Contracts") ??
    extractMarkdownSection(slice, "Contracts");
  const nfrFromSlice =
    extractMarkdownSubSection(slice, "In slice", "NFR budgets") ??
    extractMarkdownSection(slice, "NFR budgets");
  const outOfSlice =
    extractMarkdownSection(slice, "Out of slice") ??
    extractMarkdownSection(slice, "Boundaries (out of slice)");
  const opens =
    extractMarkdownSection(slice, "Open items") ??
    extractMarkdownSection(slice, "Residual opens");

  const decisionIds = Array.isArray(arch.decisionIds) ? arch.decisionIds : [];
  let decisionsBlock = decisionsFromSlice;
  if (!decisionsBlock || !decisionsBlock.trim()) {
    decisionsBlock =
      decisionIds.length > 0
        ? decisionIds.map((id) => `- ${id}`).join("\n")
        : "None";
  } else if (decisionIds.length) {
    // Ensure every handoff decision id is visible even if slice prose omits a bullet
    const missing = decisionIds.filter((id) => !decisionsBlock.includes(id));
    if (missing.length) {
      decisionsBlock = `${decisionsBlock.trim()}\n${missing.map((id) => `- ${id}`).join("\n")}`;
    }
  }

  const decisionIdsFm = decisionIds.length
    ? `[${decisionIds.map((id) => JSON.stringify(id)).join(", ")}]`
    : "[]";

  return `---
workPackageId: ${workPackageId}
acceptedAt: ${new Date().toISOString()}
decisionIds: ${decisionIdsFm}
status: ${status}
---

## Applicable decisions
${status === "accepted" ? orNone(decisionsBlock) : "n/a — returned"}

## Contracts
${status === "accepted" ? orNone(contractsFromSlice) : "n/a — returned"}

## NFR budgets
${status === "accepted" ? orNone(nfrFromSlice) : "n/a — returned"}

## Boundaries (out of slice)
${status === "accepted" ? orNone(outOfSlice) : "n/a — returned"}

## Residual opens
${status === "accepted" ? orNone(opens) : "n/a — returned"}

## Blockers returned (if any)
${blockers.map((b) => `- ${b}`).join("\n") || "(none)"}
`;
}
