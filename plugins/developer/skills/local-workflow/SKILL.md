---
name: local-workflow
description: Implement approved requirements across services or repositories without Jira. Use when writing code, finding missing contracts, or needing security or quality guidance. Do not silently change approved business behavior.
---

# Local Developer workflow

## Shared Praxis Runtime

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`.
2. Call `praxis_workflow_status` and read the requirement ids before editing.
3. Missing Jira configuration does not block local implementation. Report `JIRA_CONFIG_UNAVAILABLE` only if the user asked to update Jira.
4. Report Runtime `code` and `errors` exactly.

## Behavior

Decompose work per service. For each service, `record-implementation` with the source path, requirement ids, and contract reference. One finished service does not complete the feature.

If architecture or business rules conflict, hand back with `praxis_workflow_preview` (`targetRole=architect` or `targetRole=ba`) and wait for approval before `praxis_workflow_apply`.

Call `praxis_capabilities` for security architecture or retry/idempotency guidance. Follow the guidance in the implementation. Do not treat it as an executed plugin, and do not run destructive Git or Jira writes unless the matching explicit command was approved.
