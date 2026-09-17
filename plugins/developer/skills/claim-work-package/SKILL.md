---
name: claim-work-package
description: Claim a Jira Work Package for the current developer. Fails if another actor holds an active claim.
---

# Claim work package

Show current status with `praxis_developer_status`. Wait for human approval.

Then `praxis_developer_claim` with `workPackage` and `confirmation=YES`.

Resolves local WP id or Jira key. Never steal a claim. Force-release requires `praxis_developer_release` with `confirmation=YES`. Do not claim without approval.
