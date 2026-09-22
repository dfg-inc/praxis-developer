/**
 * Resolve a pack-safe staged plugin directory for cross-role governance.
 *
 * Never return raw plugins/<id> trees: those still declare
 * file:../../vendor/*.tgz dependencies. npm pack + install of such a tree
 * fails with ENOENT under a temp consumer (clean-clone architect flake).
 *
 * Prefer dist/release-mirror. If missing for a sibling, stage it in-place.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ENV_BY_ID = {
  ba: "PRAXIS_BA_ROOT",
  architect: "PRAXIS_ARCHITECT_ROOT",
  developer: "PRAXIS_DEVELOPER_ROOT",
};

function hasUnsafeFileDeps(pkg) {
  for (const section of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    if (!pkg[section]) continue;
    for (const value of Object.values(pkg[section])) {
      if (typeof value === "string" && value.startsWith("file:")) return true;
    }
  }
  return false;
}

function isPackableMirror(dir) {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return false;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return false;
  }
  if (hasUnsafeFileDeps(pkg)) return false;
  // Staged role plugins ship the CJS bootstrap; raw source does not.
  if (!existsSync(join(dir, "tools/session-bootstrap.cjs"))) return false;
  return true;
}

function run(cmd, cwd) {
  const r = spawnSync(cmd, {
    cwd,
    shell: true,
    encoding: "utf8",
  });
  return {
    ok: (r.status ?? 1) === 0,
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

/**
 * @param {string} id ba | architect | developer
 * @param {string} localRoot current repository root
 * @param {{ stageMissing?: boolean }} [opts]
 * @returns {string | null}
 */
export function resolvePackablePlugin(id, localRoot, opts = {}) {
  const stageMissing = opts.stageMissing !== false;
  const envKey = ENV_BY_ID[id];
  const candidates = [];
  if (envKey && process.env[envKey]) {
    candidates.push(join(process.env[envKey], "dist/release-mirror/plugins", id));
  }
  candidates.push(join(localRoot, "dist/release-mirror/plugins", id));

  for (const candidate of candidates) {
    if (isPackableMirror(candidate)) return candidate;
  }

  if (!stageMissing) return null;

  const siblingRoot =
    envKey && process.env[envKey] ? process.env[envKey] : id === guessLocalId(localRoot) ? localRoot : null;
  // Stage local id when this repo owns it
  const localPlugin = join(localRoot, "plugins", id);
  const stageRoot =
    siblingRoot && existsSync(join(siblingRoot, "plugins", id))
      ? siblingRoot
      : existsSync(localPlugin)
        ? localRoot
        : null;
  if (!stageRoot) return null;

  console.log(`staging packable mirror for ${id} in ${stageRoot}…`);
  if (!existsSync(join(stageRoot, "node_modules"))) {
    const install = run("npm ci || npm install", stageRoot);
    if (!install.ok) {
      console.error(install.stderr || install.stdout);
      return null;
    }
  }
  const staged = run(
    `node --input-type=module -e "import { buildAllPluginArtifacts } from './tools/scripts/package-plugins.mjs'; buildAllPluginArtifacts();"`,
    stageRoot,
  );
  if (!staged.ok) {
    console.error(staged.stderr || staged.stdout);
    return null;
  }
  const mirror = join(stageRoot, "dist/release-mirror/plugins", id);
  return isPackableMirror(mirror) ? mirror : null;
}

function guessLocalId(localRoot) {
  for (const id of Object.keys(ENV_BY_ID)) {
    if (existsSync(join(localRoot, "plugins", id, ".claude-plugin/plugin.json"))) return id;
  }
  return null;
}
