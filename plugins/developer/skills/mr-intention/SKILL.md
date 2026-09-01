---
name: mr-intention
description: Describe merge-request intention linking requirements and decisions, attach verification evidence, emit developer.quality.handoff (WBS 5.15).
---

# MR Intention

Author the merge-request description so a reviewer (and Quality) can validate **intent** without replaying the whole diff history. Emit `developer.quality.handoff` after final arbiter is green (WBS `5.15.1`).

## When to use

- After `final-arbiter` is all-true (or explicitly waived with recorded reasons).
- When opening / updating the MR that delivers the work package.
- Not before phases complete.

## Inputs

| Input | Source |
|-------|--------|
| Arbiter report | `design/<workPackageId>/dev/arbiter-report.md` |
| Plan / status | `dev/plan.md`, `dev/plan-status.md` |
| Acceptance / slice | decisions + requirements |
| MR ref | Git host MR/PR id or URL once opened |

## Handoff schema

Emit JSON conforming to `DeveloperToQualityHandoffSchema` (`@praxis/contracts`):

```json
{
  "contract": "developer.quality.handoff",
  "version": "0.1.0",
  "workPackageId": "<WP-…>",
  "mergeRequestRef": "<!id or URL>",
  "intention": "<one paragraph>",
  "requirementIds": ["…"],
  "decisionIds": ["…"],
  "verification": {
    "build": { "status": "skipped", "required": false },
    "tests": { "status": "passed", "required": true },
    "lint": { "status": "skipped", "required": false },
    "packageCriteria": { "status": "passed", "required": true }
  }
}
```

`status` is one of `passed` | `failed` | `skipped`. Never encode skipped as passed.
Persist beside the package:

`design/<workPackageId>/dev/quality-handoff.json`

## MR description template

```markdown
## Intention
<what changed and why — product/architecture outcome, not file laundry list>

## Requirements
- <id> — <one line>

## Decisions followed
- <ADR-id> — <rule one-liner> — path

## Out of scope / not changed
<from context slice boundaries>

## Verification
- build: pass|fail|waived (ref arbiter report)
- tests: …
- lint: …
- package criteria: …

## Repair / waivers
<link repair-journal if used; list waivers>
```

## Steps

1. Confirm arbiter verification object is all true or waived-with-reason. If red → refuse; send back to `final-arbiter` / `repair-loop`.
2. Draft Intention from plan Goal + acceptance boundaries (human-readable).
3. Collect `requirementIds` from handoff/plan; `decisionIds` from context slice / acceptance.
4. Open or update MR with the template body (gh/glab/UI — follow repo norm). Record `mergeRequestRef`.
5. Write `quality-handoff.json` via schema parse (`parseContract(DeveloperToQualityHandoffSchema, …)` when running in-repo tooling).
6. Point Quality / reviewer at MR + handoff path. Do not claim Quality acceptance — that is Quality’s job.

## Human gates

| Situation | Gate |
|-----------|------|
| Push / publish MR | Per repo norm (often explicit go) |
| Waived verification on handoff | Already recorded at arbiter; surface again in MR body |
| Intention wording | Optional skim |

## Done when

- MR body names intention, requirements, decisions, verification.
- `developer.quality.handoff` artifact written and schema-valid.
- Reviewer can judge intent without full history archaeology.
- Quality contour has a concrete MR ref to process.

## Failure modes

| Mode | Response |
|------|----------|
| MR with only file list / “misc fixes” | Rewrite intention |
| Missing requirement or decision links | Incomplete — add ids |
| Handoff with false verification | **Forbidden** until arbiter green/waived |
| Emitting handoff before MR ref exists | Open MR first or use draft ref policy; prefer real ref |
| Omitting waivers | Surface in MR + handoff notes |
| Skipping Quality handoff file | Write `quality-handoff.json` |
