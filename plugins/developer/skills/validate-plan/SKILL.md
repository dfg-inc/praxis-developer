---
name: validate-plan
description: Validate plan completeness, context-slice compliance, and testability; obtain human approval before implement-plan (WBS 5.8).
---

# Validate Plan

Machine + human gate over `create-plan` output. Implementation must not start until this skill records **approved** (WBS `5.8.2`).

## When to use

- Immediately after `create-plan` produces `design/<workPackageId>/dev/plan.md`.
- After any material plan edit (re-validate before continuing implement).
- When resuming a session and `plan.md` status is unclear.

## Inputs

| Input | Path |
|-------|------|
| Plan | `design/<workPackageId>/dev/plan.md` |
| Status journal | `design/<workPackageId>/dev/plan-status.md` |
| Context slice | From acceptance / handoff |
| Acceptance | `design/<workPackageId>/dev/acceptance.md` |

## Checks (all must pass or be explicitly waived)

1. **Structure**  
   Frontmatter present; ≥1 phase; each phase has Files, verify, Done when.

2. **Files**  
   Each path is either an existing repo file or an intentional `create`. No vague “relevant modules”.

3. **Slice compliance**  
   No phase changes contracts/ADRs outside the context slice without a linked `request-architecture-deviation` id.

4. **Testability**  
   Each phase verify step is executable (command, test name, or arbiter flag) — not “looks good”.

5. **Traceability**  
   Done-when criteria map to `requirementIds` / feature ids from the handoff.

6. **TDD honesty**  
   If `TDD: yes`, the phase orders test before production change.

7. **Status**  
   Plan still `draft` or `revised` entering this skill; not already `approved` without re-check after edits.

## Steps

1. Run the checks above; write findings into:

   `design/<workPackageId>/dev/plan-validation.md`

   Table: `check`, `result: pass|fail|waive`, `detail`.

2. If any `fail` → set plan `status: revised-needed`; do **not** ask for approval; return to `create-plan` edits.

3. If all `pass` (or human-recorded waivers):  
   **AskUserQuestion:** “Approve this plan for `<workPackageId>`?” Show path + phase summary. Never proceed on silence.

4. On approve:  
   - Set plan frontmatter `status: approved`, `approvedAt: YYYY-MM-DD`.  
   - Append to `plan-status.md` log: `validated+approved`.  
   - Allow `implement-plan`.

5. On reject:  
   - Keep `status: draft` (or `rejected`).  
   - Capture reject reasons in `plan-validation.md`.  
   - Implementation remains blocked.

## Human gates

| Gate | Required |
|------|----------|
| Approval to implement | Yes — explicit |
| Waive a failed check | Yes — name check + reason in validation file |

## Done when

- `plan-validation.md` exists with all checks green or waived.
- Plan `status: approved` **only** after explicit human yes.
- Or plan blocked with clear failures and no implementation started.

## Failure modes

| Mode | Response |
|------|----------|
| Implement before approve | **Forbidden** |
| Approve by inference / timeout | **Forbidden** |
| Waive without recording | Re-open; write waiver |
| Ignoring slice violations | Fail check; deviation skill or replan |
| Stale approval after plan edit | Re-run validate-plan; reset to draft until re-approved |
