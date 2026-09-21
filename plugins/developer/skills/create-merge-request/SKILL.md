---
name: create-merge-request
description: Human-gated GitHub Pull Request (MVP) or GitLab Merge Request after push. Does not merge and does not claim CI PASS.
---

# Create Merge Request

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

GitHub Pull Requests need `github_token` in Praxis Runtime settings (PAT with repo scope, not OAuth). Never ask the user to paste the token into chat.

Call MCP:

- `praxis_developer_git_delivery_status`
- `praxis_developer_git_merge_request` with `confirmation=YES` after the user approves

If a PR/MR already exists for the branch, reuse it. Do not merge. Do not claim GitHub Actions passed unless the tool reports `ciStatus=success`. Do not write Jira here (`praxis_developer_git_link_jira_*` is a separate gate).
