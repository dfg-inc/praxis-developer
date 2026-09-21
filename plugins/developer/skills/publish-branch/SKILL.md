---
name: publish-branch
description: Human-gated git push of baseline (empty GitHub repo) or feature branch. Never force-push.
---

# Publish Branch

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Call MCP:

- `praxis_developer_git_publish_preview`
- Wait for human approval
- `praxis_developer_git_publish` with `confirmation=YES` and `previewFingerprint`

If the GitHub repository is empty, first publish `mode=baseline` (creates the default branch from existing local history). Then publish `mode=branch` for the feature branch. If the remote already has history, do not force-push or overwrite it. Transport uses the system SSH agent or Git credential helper — never ask for a private key in chat.
