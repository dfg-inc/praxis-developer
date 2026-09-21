---
name: check-delivery-status
description: Read-only Git Delivery journal (commit SHA, PR URL, CI if known). Does not push or merge.
---

# Check Delivery Status

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Call MCP:

- `praxis_doctor`
- `praxis_developer_git_delivery_status` with `workPackage`

Read-only. Show lifecycle (`committed`, `baseline-published`, `pushed`, `awaiting-review`), commit SHA only if it was really created, PR/MR URL only if it exists, and CI status without fabricating PASS. Merge is out of scope.
