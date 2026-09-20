---
name: implement-work-package
description: Implement a Work Package (local WP- id or Jira key) end to end.
---

# Implement Work Package

Claude UI / Cowork is the human interface when a repository is mounted. Do not ask the user for Make, Praxis CLI, or `launchctl`.

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension. Do not instruct them to run CLI or edit config files.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.
4. If `.project` is missing: `praxis_project_init_preview`, wait for approval, then `praxis_project_init_apply` with `confirmation=YES`.

Allowed tools: common/Jira/project + WP/Developer tools. Do not start Quality.

## Flow

1. `praxis_work_package_show` with `workPackage` (`WP-20260914-002` or Jira key)
2. `praxis_developer_status`
3. `praxis_jira_status` if epic known; exclude superseded (e.g. PRX-2)
4. Show the implementation plan from the official change-spec. STOP. Wait for human approval.
5. `praxis_developer_claim` with `confirmation=YES` only after approval
6. Implement the real product change using workspace filesystem tools (Architect scratch tests do not count)
7. Run project tests (`npm test` or `.project` quality.test) only when local execution is available
8. Run project tests (`npm test` or `.project` quality.test) only when local execution is available
9. `praxis_developer_complete` with `confirmation=YES` after showing the verification plan. This writes completion evidence and a Developer→Quality handoff. **It must not mark Jira Done and must not start Quality.** Jira stays In Progress (`В работе`) until Quality approval.

Do not claim and complete in one autonomous unapproved sequence.

Examples: «Возьми WP-20260914-002 и реализуй его.» / “Take WP-20260914-002 and implement it fully.”
