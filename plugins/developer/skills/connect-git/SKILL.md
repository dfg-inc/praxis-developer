---
name: connect-git
description: Preview and apply a Git remote (GitHub MVP). Does not create a GitHub repository and does not push.
---

# Connect Git

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Call MCP:

- `praxis_doctor`
- `praxis_developer_git_status`
- `praxis_developer_git_connect_preview` with `remoteUrl` the user chose (GitHub HTTPS or SSH)
- After human approval: `praxis_developer_git_connect_apply` with `confirmation=YES` and `previewFingerprint`

Do not add `origin` without approval. If `origin` already points at the same GitHub repository over HTTPS, an approved SSH URL **updates that origin** (`git remote set-url`). It does not add a second remote. Do not create a GitHub/GitLab project. Do not push. If several remotes exist, ask which `remoteName` to use. Never request SSH private keys or API tokens in chat. After apply, re-read `git remote get-url` and show the actual URL. `wrote=true` only if that URL matches the approved plan.
