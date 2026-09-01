/**
 * Deterministic apply of Architect change-spec operations (edit + create).
 * Shared by Developer run-work-package and unit tests.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

/**
 * @typedef {{
 *   file: string,
 *   description?: string,
 *   op?: 'edit'|'create',
 *   match?: string,
 *   replace?: string,
 *   content?: string,
 *   write?: string,
 * }} RawChange
 */

/**
 * @param {RawChange} c
 */
export function normalizeChangeOp(c) {
  const op =
    c.op ??
    (c.content !== undefined || c.write !== undefined ? "create" : "edit");
  if (op === "create") {
    const content = c.content ?? c.write;
    if (content === undefined) {
      throw new Error(`create change for ${c.file} missing content`);
    }
    return { file: c.file, description: c.description, op: "create", content };
  }
  if (c.match === undefined || c.replace === undefined) {
    throw new Error(`edit change for ${c.file} requires match and replace`);
  }
  return {
    file: c.file,
    description: c.description,
    op: "edit",
    match: c.match,
    replace: c.replace,
  };
}

/**
 * Apply one change under productRoot. Idempotent for both edit and create.
 * @returns {{ file: string, op: string, status: 'applied'|'already-applied' }}
 */
export function applyOneChange(productRoot, raw) {
  const c = normalizeChangeOp(raw);
  const fp = join(productRoot, c.file);

  if (c.op === "create") {
    mkdirSync(dirname(fp), { recursive: true });
    if (existsSync(fp)) {
      const existing = readFileSync(fp, "utf8");
      if (existing === c.content) {
        return { file: c.file, op: "create", status: "already-applied" };
      }
      throw new Error(
        `create conflict: ${c.file} exists with unexpected content`,
      );
    }
    writeFileSync(fp, c.content);
    return { file: c.file, op: "create", status: "applied" };
  }

  // edit
  if (!existsSync(fp)) {
    throw new Error(`missing file ${c.file} (edit requires an existing target)`);
  }
  let text = readFileSync(fp, "utf8");
  if (!text.includes(c.match)) {
    if (text.includes(c.replace)) {
      return { file: c.file, op: "edit", status: "already-applied" };
    }
    throw new Error(`match not found in ${c.file}: ${c.match}`);
  }
  text = text.replace(c.match, c.replace);
  writeFileSync(fp, text);
  return { file: c.file, op: "edit", status: "applied" };
}

/**
 * @param {string} productRoot
 * @param {RawChange[]} changes
 */
export function applyChangeSpec(productRoot, changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("change-spec.changes must be a non-empty array");
  }
  return changes.map((c) => applyOneChange(productRoot, c));
}

/** Human-readable plan step for one change. */
export function planStepForChange(c, index) {
  const n = normalizeChangeOp(c);
  if (n.op === "create") {
    return `${index}. Create \`${n.file}\`${n.description ? `: ${n.description}` : ""}`;
  }
  return `${index}. Edit \`${n.file}\`${n.description ? `: ${n.description}` : ""}`;
}
