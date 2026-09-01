/**
 * YAML frontmatter helpers for Developer state Markdown.
 * Scalar keys are always unique — updates replace, never append duplicates.
 */
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Find duplicate keys in a YAML frontmatter mapping body (top-level scalars/lists).
 * @param {string} yamlBody
 * @returns {string[]}
 */
export function findDuplicateFrontmatterKeys(yamlBody) {
  const counts = new Map();
  for (const line of yamlBody.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:/);
    if (!m) continue;
    const key = m[1];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([k]) => k);
}

/**
 * Split markdown into { frontmatter, body } (body without leading fences).
 * @param {string} text
 */
export function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: "", body: text, hasFence: false };
  return { frontmatter: m[1], body: m[2], hasFence: true };
}

/**
 * Parse simple top-level YAML mapping (scalars + inline lists). Not a full YAML parser.
 * @param {string} yamlBody
 * @returns {Record<string, string>}
 */
export function parseSimpleFrontmatter(yamlBody) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of yamlBody.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    // Last occurrence wins when repairing corrupted files
    out[m[1]] = m[2].trim();
  }
  return out;
}

/**
 * Serialize simple frontmatter map with stable key order (insertion + known first).
 * @param {Record<string, string | number | boolean | null | undefined>} fields
 * @param {string[]} [preferredOrder]
 */
export function serializeFrontmatter(fields, preferredOrder = []) {
  const keys = [
    ...preferredOrder.filter((k) => k in fields),
    ...Object.keys(fields).filter((k) => !preferredOrder.includes(k)),
  ];
  const lines = [];
  for (const k of keys) {
    const v = fields[k];
    if (v === undefined) continue;
    lines.push(`${k}: ${v === null ? "" : String(v)}`);
  }
  return lines.join("\n");
}

/**
 * Assert markdown frontmatter has no duplicate scalar keys.
 * @param {string} text
 * @param {string} [label]
 */
export function assertNoDuplicateFrontmatterKeys(text, label = "markdown") {
  const { frontmatter, hasFence } = splitFrontmatter(text);
  if (!hasFence) return;
  const dups = findDuplicateFrontmatterKeys(frontmatter);
  if (dups.length) {
    throw new Error(
      `${label}: duplicate YAML frontmatter keys: ${dups.join(", ")}`,
    );
  }
}

/**
 * Update frontmatter fields by rewrite (single value per key). Body preserved.
 * @param {string} text
 * @param {Record<string, string | number | boolean | null | undefined>} patch
 * @param {{ preferredOrder?: string[] }} [opts]
 */
export function upsertFrontmatter(text, patch, opts = {}) {
  const preferredOrder = opts.preferredOrder ?? [
    "workPackageId",
    "status",
    "currentPhase",
    "phasesComplete",
    "approvedAt",
    "updatedAt",
  ];
  const { frontmatter, body, hasFence } = splitFrontmatter(text);
  const current = hasFence ? parseSimpleFrontmatter(frontmatter) : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    current[k] = v === null ? "" : String(v);
  }
  const yaml = serializeFrontmatter(current, preferredOrder);
  assertNoDuplicateFrontmatterKeys(`---\n${yaml}\n---\n`, "upsertFrontmatter");
  return `---\n${yaml}\n---\n${hasFence ? body : body.startsWith("\n") ? body : `\n${body}`}`;
}

/**
 * Read → upsert → write a markdown state file.
 * @param {string} path
 * @param {Record<string, string | number | boolean | null | undefined>} patch
 * @param {{ createBody?: string, preferredOrder?: string[] }} [opts]
 */
export function updateMarkdownFrontmatter(path, patch, opts = {}) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    text = `---\n---\n${opts.createBody ?? ""}`;
  }
  const next = upsertFrontmatter(text, patch, opts);
  assertNoDuplicateFrontmatterKeys(next, path);
  writeFileSync(path, next.endsWith("\n") ? next : `${next}\n`);
  return next;
}
