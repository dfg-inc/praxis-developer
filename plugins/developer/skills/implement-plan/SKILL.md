---
name: implement-plan
description: Implement an approved plan phase by phase with verification after each phase; on failure enter repair-loop (WBS 5.10).
---

# Implement Plan

Execute `design/<workPackageId>/dev/plan.md` one phase at a time. A phase is finished only when its verify step is green. Red verify → do not start the next phase; enter `repair-loop` (WBS `5.10.1`).

## When to use

- Plan `status: approved` via `validate-plan`.
- After `tdd` skill guidance when a phase marks `TDD: yes`.
- Resume after context compression using `plan-status`.

Do **not** use on `draft` / `rejected` plans.

## Inputs

| Input | Path |
|-------|------|
| Approved plan | `design/<workPackageId>/dev/plan.md` |
| Status journal | `design/<workPackageId>/dev/plan-status.md` |
| Slice / ADRs | From acceptance |
| Stack rules | Loaded earlier |

## Steps

1. **Preflight**  
   Read plan + `plan-status.md`. Confirm `status: approved`. Determine `currentPhase` (first `pending` / `in_progress`).

2. **Mark phase in progress**  
   Update `plan-status.md`: phase `n` → `in_progress`, timestamp, short intent note.

3. **Execute phase work**  
   - Touch only the phase’s Files list (plus tests required by verify).  
   - If `TDD: yes`, follow `tdd` skill: failing test → minimal code → refactor.  
   - Stay inside context-slice non-negotiables; out-of-slice need → pause and `request-architecture-deviation`.

4. **Run phase verification**  
   Execute the phase’s **Tests / verify** exactly (commands from the plan). Prefer Dockerized project commands when the repo standard is Docker (restart services if logic changed).  
   Capture exit codes / summaries into the status log.

5. **On green**  
   - Mark phase `done` in `plan-status.md` with evidence (command + result).  
   - Only then advance `currentPhase` to n+1.  
   - If more phases remain → loop step 2.  
   - If last phase done → hand off to `final-arbiter` (not yet MR).

6. **On red**  
   - Mark phase `failed` with failure excerpt.  
   - **Do not** start phase n+1.  
   - Invoke `repair-loop` with: WP id, phase n, failure evidence, plan path.  
   - After repair-loop green, re-run this phase’s verify; then continue.

7. **Status discipline**  
   Every transition (`in_progress` / `done` / `failed` / `repaired`) is a dated log line in `plan-status.md` so `plan-status` skill can reconstruct progress after context loss.

## Human gates

| Situation | Gate |
|-----------|------|
| Deviation from ADR needed | Stop — `request-architecture-deviation` |
| Repair-loop exhausted | Human via `repair-loop` |
| Normal green phases | None mid-flight |

## Done when

- All plan phases `done` with verify evidence in `plan-status.md`.
- No skipped verify steps.
- Ready for `final-arbiter`.

## Failure modes

| Mode | Response |
|------|----------|
| Next phase after red verify | **Forbidden** — repair-loop first |
| Editing files outside phase list “while here” | Revert or open new phase + re-validate |
| Silent retry without repair-loop journal | Use `repair-loop` |
| Implementing unapproved plan | **Forbidden** |
| Claiming done without commands run | **Forbidden** — evidence in journal |
| Ignoring Docker/restart rule when logic changed | Restart/rebuild per project norm before verify |
