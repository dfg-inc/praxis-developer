import { join } from "node:path";

export const PLUGINS = [
  {
    id: "praxis-developer",
    title: "Praxis Developer",
    src: "plugins/developer",
    role: "developer",
    requiredSkills: [
      "implement-work-package",
      "resume-work-package",
      "developer-status",
      "git-status",
      "connect-git",
      "prepare-git-delivery",
      "commit-approved-changes",
      "publish-branch",
      "create-merge-request",
      "check-delivery-status",
    ],
    helpCommands: [["developer", "--help"]],
  },
];

export const PLUGIN_ZIP_FILES = PLUGINS.map((p) => `${p.id}.zip`);
export const MANIFEST_CONTRACT = "praxis.claude-plugins.manifest";

export function distClaudePluginsDir(root, version) {
  return join(root, "dist", "claude-plugins", version);
}

export function repoClaudePluginsDir(root) {
  return join(root, "claude-plugins");
}
