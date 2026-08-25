---
name: final-arbiter
description: Run executable final checks before done — build, tests, lint, package criteria — via node plugins/developer/tools/final-arbiter.mjs (WBS 5.13).
---

# Final Arbiter

Machine gate before MR / quality handoff. “Looks correct” is not verification. Run the executable arbiter and require green results for build, tests, lint, and package criteria (WBS `5.13.1`).

## When to use

- After `implement-plan` marks all phases `done`.
- Before `mr-intention`.
- After `repair-loop` claims the suite is green — re-run arbiter as source of truth.

## Inputs

| Input | Source |
|-------|--------|
| WP / plan | `design/<workPackageId>/dev/plan.md` + `plan-status.md` |
| Package criteria | Context slice Done/AC, feature readiness, plan done-when |
| Script | `plugins/developer/tools/final-arbiter.mjs` (added separately; invoke even if scaffolding lands later) |

## Invocation

From repo root:

```bash
node plugins/developer/tools/final-arbiter.mjs --build --test --lint
```

### Flags

| Flag | Meaning |
|------|---------|
| `--build` | Run project build |
| `--test` | Run test suite |
| `--lint` | Run linters / typechecks as configured |
| (default combo) | Prefer passing all three together for full arbiter |

Optional project flags may appear later (`--docker`, `--filter`); document them in the script help. Until then, use the three flags above.

Capture stdout/stderr and exit code. Non-zero exit → not done.

## Steps

1. **Preflight**  
   Confirm all phases `done` in `plan-status.md`. If not, return to `implement-plan`.

2. **Run arbiter**  
   Execute:

   `node plugins/developer/tools/final-arbiter.mjs --build --test --lint`

   Prefer the same Dockerized workflow the project uses for logic changes (build/test inside compose if that is the norm).

3. **Map results** into verification object for `developer.quality.handoff`:

   ```json
   {
     "build": true|false,
     "tests": true|false,
     "lint": true|false,
     "packageCriteria": true|false
   }
   ```

   `packageCriteria`: manually/script-assisted check that plan done-when + slice non-negotiables are evidenced (checklist in arbiter output or companion file). If the script emits JSON, prefer parsing it; else write:

   `design/<workPackageId>/dev/arbiter-report.md`

   with one section per criterion and pass/fail.

4. **On any false**  
   Do not open MR. Enter `repair-loop` with arbiter evidence. Re-run this skill after repairs.

5. **On all true**  
   Persist report path; proceed to `mr-intention` which embeds the verification object.

6. **Human waive** (exceptional)  
   AskUserQuestion with the failed criterion + risk. If waived, record `waived: true`, criterion, reason, date in `arbiter-report.md`. Waivers are visible to Quality — never silent.

## Human gates

| Situation | Gate |
|-----------|------|
| All green | None required |
| Fail + want to ship anyway | Explicit waive per criterion |
| Script missing | Stop — do not fake green; note blocker until script exists, or run equivalent commands and record them as manual arbiter with same four fields |

## Done when

- Arbiter (or recorded equivalent) produced machine-readable pass/fail per criterion.
- All four verification fields true, or human-waived with written reason.
- Evidence file `dev/arbiter-report.md` (or script artifact) exists.
- Eligible for `mr-intention`.

## Failure modes

| Mode | Response |
|------|----------|
| Declaring done without running script/commands | **Forbidden** |
| Partial flags omitting a red area | Re-run with full `--build --test --lint` |
| Skipping packageCriteria | Fail — checklist required |
| Silent waive | **Forbidden** |
| Proceeding to MR on red | **Forbidden** — repair-loop |
