---
name: create-plan
description: Create an implementation plan with phases, file lists, and per-phase acceptance criteria after research (WBS 5.8). Does not start implementation — human approval required via validate-plan.
---

# Create Plan

Produce an executable implementation plan: ordered phases, files touched/created, and completion criteria per phase (WBS `5.8.1`). Implementation must not start until the human approves (`validate-plan` / approve gate — WBS `5.8.2`).

## When to use

- After `accept-work-package` (`status: accepted`) and enough `research-codebase` to name real files.
- After `classify-scale` when scale is limited or architectural (caveman path skips full plan).
- Before any `implement-plan` phase.

## Inputs

| Input | Source |
|-------|--------|
| Acceptance journal | `design/<workPackageId>/dev/acceptance.md` |
| Context slice | `contextSlicePath` |
| Research notes | From `research-codebase` |
| Stack rules | From `load-stack-rules` |
| Scale | From `classify-scale` |

## Output path

```text
design/<workPackageId>/dev/plan.md
design/<workPackageId>/dev/plan-status.md   # stub for journal (plan-status skill owns updates)
```

If the project already uses `wp/<id>/plan.md`, write there **and** keep a pointer from `design/<id>/dev/plan.md`.

## Plan shape (required)

```markdown
---
workPackageId: <id>
status: draft
scale: exploratory|limited|architectural
requirementIds: []
decisionIds: []
created: YYYY-MM-DD
---

# Plan — <workPackageId>

## Goal
One paragraph.

## Constraints
Non-negotiables from context slice / ADRs.

## Phases

### Phase N — <title>
- **Intent:** …
- **Files:**
  - `path` — create|modify|delete — why
- **Tests / verify:** exact commands or checks
- **Done when:** observable criteria (map to requirement ids)
- **TDD:** yes|no (if yes, red→green→refactor order)
```

Rules:
- ≥1 phase; prefer small phases with verify after each.
- Every phase has a non-empty **Files** list and **Done when**.
- No phase may invent architecture outside the slice — deviations go through `request-architecture-deviation`.
- Link `requirementIds` / `decisionIds` in frontmatter.

## Steps

1. Confirm acceptance journal is `accepted`.
2. Draft phases from research (locator/analyzer/pattern-finder outputs). Prefer existing patterns named in research.
3. Mark TDD phases where behavior changes are testable cheaply.
4. Write `plan.md` with `status: draft`.
5. Create/reset `plan-status.md`:

   ```markdown
   ---
   workPackageId: <id>
   planPath: design/<id>/dev/plan.md
   currentPhase: 1
   phases: [{ n: 1, status: pending }]
   ---
   # Plan status
   ## Log
   ```

6. Hand off to `validate-plan` — **do not** implement yet.

## Human gates

None inside create-plan itself. Approval lives in `validate-plan`. Creating a draft is not approval (WBS `5.8.2`).

## Done when

- `plan.md` exists with phases → files → verify → done-when.
- Frontmatter links requirements and decisions.
- `plan-status.md` stub exists.
- `validate-plan` is the next step; code unchanged by this skill.

## Failure modes

| Mode | Response |
|------|----------|
| Plan without file lists | Incomplete — rewrite |
| Phases without verify | Incomplete — rewrite |
| Out-of-slice architecture in plan | Split out; open deviation or return to Architect |
| Starting implement on `draft` | **Forbidden** — validate/approve first |
| Giant single phase | Split until each has a crisp done-when |
