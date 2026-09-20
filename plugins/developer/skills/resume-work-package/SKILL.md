---
name: resume-work-package
description: Resume Developer work on a claimed or unclaimed Work Package.
---

# Resume Work Package

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Allowed tools: common/Jira/project + WP/Developer. Do not start Quality.

Call `praxis_doctor` then `praxis_developer_status`. Continue claim → plan → implement → complete.

If Jira is already Done but local evidence/handoff is missing, call `praxis_developer_complete_recovery_preview`, show the proposed restore, and wait for a separate human approval before `praxis_developer_complete_recovery_apply`.

Writes require human confirmation (`praxis_developer_claim` / `praxis_developer_complete` / `praxis_developer_complete_recovery_apply` with `confirmation=YES`). Do not immediately apply after showing the plan. Developer complete does not mark Jira Done.
