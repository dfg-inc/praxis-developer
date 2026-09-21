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

- `praxis_developer_git_publish_preview` with `mode=baseline` when Git Status / GitHub API reports an empty repository (`remoteEmpty=true`). Show `sourceBranch`, `sourceCommitSha`, `targetRemote`, `targetRemoteBranch`, exact `refspec` (for example `b96e9d1e…:refs/heads/main`). Local `master` is not renamed and remote `master` is not created.
- Wait for human approval of that fingerprint
- `praxis_developer_git_publish` with `confirmation=YES`, `previewFingerprint`, and the same `mode`
- After baseline exists, repeat preview + apply with `mode=branch` for the feature branch only

If the GitHub repository is empty, first publish `mode=baseline` (pushes the approved committed HEAD to the GitHub default branch, typically `main`). Then publish `mode=branch` for the feature branch. If the remote already has history, do not force-push or overwrite it. Never `git push origin master` when the target is `main`. Transport uses the system SSH agent or Git credential helper — never ask for a private key in chat.

On partial failure, show `writeSucceeded`, `verificationStatus`, `partial`, and `recoveryInstructions`. Retry is a no-op when the remote SHA already matches. Do not create a second commit, second push, or second PR.
