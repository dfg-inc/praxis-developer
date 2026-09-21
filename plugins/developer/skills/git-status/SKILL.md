---
name: git-status
description: Read-only Git Delivery Assessment for a Work Package (remotes, identity, working tree). Does not guess a remote or print tokens.
---

# Git Status

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Allowed tools: common/Jira/project + `praxis_developer_git_status`. Do not start Quality.

Call MCP:

- `praxis_doctor`
- `praxis_developer_git_status` with `workPackage`

Read-only. No confirmation. Show branch, HEAD, remotes (redacted), provider, identity, staging safety, and whether a remote is missing. If `remoteConfigured=false`, do **not** invent GitHub or GitLab hosts from Jira, other checkouts, or chat history. Never print `github_token`, `gitlab_token`, or credential-bearing URLs.
