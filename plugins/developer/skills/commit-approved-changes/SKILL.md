---
name: commit-approved-changes
description: Human-gated local Git branch + allowlist stage + commit. No push and no pull request.
---

# Commit Approved Changes

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Call MCP:

- `praxis_developer_git_preview` first
- Wait for human approval
- `praxis_developer_git_commit` with `confirmation=YES` and the matching `previewFingerprint`

Do not `git add -A`. Only the allowlist (Quality snapshot files, typically `src/counter.js` and `src/counter.test.js`) is staged. After the commit, hashes are read back from the Git object and compared to the Quality snapshot. No push, no PR, no Jira write, no `reset --hard`, no `git clean`, no amend, no force. If verification fails, the result is `partial` — do not hide that as success. Retry of an already-created commit is a no-op.
