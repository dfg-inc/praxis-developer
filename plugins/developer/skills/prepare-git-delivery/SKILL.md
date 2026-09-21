---
name: prepare-git-delivery
description: Read-only Git Delivery preview bound to the Quality snapshot. Does not branch, commit, or push.
---

# Prepare Git Delivery

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Call MCP:

- `praxis_doctor`
- `praxis_developer_git_preview` with `workPackage`

Show selected files, SHA256 hashes (recomputed from disk against `design/<WP>/qa/quality-review.json`), Quality Review binding, commit message, proposed branch, target remote branch (`main` after a GitHub empty-repo baseline), warnings (for example dirty `package.json`, untracked `.npmrc`), and `previewFingerprint`.

Read-only. Do not call commit in the same turn. If hashes do not match the Quality snapshot, stop: a new Quality Review is required. Do not start Quality Review or Quality Apply from this Skill. Do not include `.praxis-*`, `.npmrc`, `.project`, `package.json`, or BA artifacts unless the user explicitly allowlists them with a separate confirmation.
