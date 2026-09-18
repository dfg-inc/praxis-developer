---
name: developer-status
description: Read-only Developer status for a Work Package (local id or Jira key).
---

# Developer Status

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Allowed tools: common/Jira/project + WP/Developer status. Do not start Quality.

Call MCP:

- `praxis_doctor`
- `praxis_developer_status` with `workPackage`

Read-only. No confirmation. Status may include `jiraStatus` and `availableTransitions` (id, name, target status) for diagnosing claim mapping. Do not expose credentials.
