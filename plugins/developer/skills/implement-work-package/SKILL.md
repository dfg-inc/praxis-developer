---
name: implement-work-package
description: Implement a Work Package (local WP- id or Jira key) end to end.
---

# Implement Work Package

Claude UI / Cowork is the human interface when a repository is mounted. Do not ask the user for Make or Praxis CLI commands.

## Capability detection

Call `praxis_doctor`. If it cannot run: `LOCAL_RUNTIME_UNAVAILABLE`. If the repo is missing: `REPOSITORY_UNAVAILABLE`. Do not fake source edits when the filesystem is unavailable. Never paste tokens into chat.

## Flow

1. `praxis_work_package_show` with `workPackage` (`WP-20260914-002` or Jira key)
2. `praxis_developer_status`
3. `praxis_jira_status` if epic known; exclude superseded (e.g. PRX-2)
4. Show the implementation plan from the official change-spec. STOP. Wait for human approval.
5. `praxis_developer_claim` with `confirmation=YES` only after approval
6. Implement the real product change using workspace filesystem tools (Architect scratch tests do not count)
7. Run project tests (`npm test` or `.project` quality.test) only when local execution is available
8. Record evidence, then `praxis_developer_complete` with `confirmation=YES`

Do not start Quality. Do not claim and complete in one autonomous unapproved sequence.

Examples: «Возьми WP-20260914-002 и реализуй его.» / “Take WP-20260914-002 and implement it fully.”
