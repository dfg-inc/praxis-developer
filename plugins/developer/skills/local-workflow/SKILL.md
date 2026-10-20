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

## Inspect stored work

When the user asks what exists ("show requirements, Stories, architecture decisions, current work and Quality results"), call `praxis_workflow_inspect` (read-only; no Jira needed). Start with `view: "overview"`, then `requirements`, `stories`, `decisions`, `work`, `handoffs`, `open-items` or `quality`, or `all`. Pass `workItemId` when several Work Items exist, and `id` for one record. Report what it returns, including Story confirmation state: an unconfirmed Story stays unconfirmed. Do not ask the user to open files for anything Runtime can return.
