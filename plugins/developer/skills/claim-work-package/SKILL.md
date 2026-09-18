---
name: claim-work-package
description: Claim a Jira Work Package for the current developer. Fails if another actor holds an active claim.
---

# Claim work package

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Allowed tools: common/Jira/project + WP/Developer. Do not start Quality.

Show current status with `praxis_developer_status`. Wait for human approval.

Then `praxis_developer_claim` with `workPackage` and `confirmation=YES`.

Resolves local WP id or Jira key. Discovers available Jira transitions for the issue and posts only a numeric transition id; localized workflow names are supported. Never steal a claim. Force-release requires `praxis_developer_release` with `confirmation=YES`. Do not claim without approval.
