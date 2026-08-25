---
name: accept-work-package
description: Accept Architect work package and context slice; verify handoff readiness and return incomplete packages (WBS 5.4).
---

# Accept Work Package

Developer-side intake gate for `architect.developer.handoff`. Make applicable decisions, contracts, budgets, and package boundaries **visible in the working set**; refuse packages missing ready-for-dev criteria (WBS `5.4.1`, `5.4.2`).

## When to use

- First Developer skill after Architect publishes design package + context slice.
- Before `research-codebase`, `load-stack-rules`, `classify-scale`, or `create-plan`.
- Re-run when Architect re-issues a repaired handoff.

## Inputs

| Input | Path / source |
|-------|----------------|
| Handoff | `architect.developer.handoff` JSON (`ArchitectToDeveloperHandoffSchema`) |
| Design package | `designPackagePath` (default `design/<workPackageId>/`) |
| Context slice | `contextSlicePath` (default `design/<workPackageId>/context-slice.md`) |
| Journal | `design/<workPackageId>/dev/acceptance.md` or `wp/<id>/dev/acceptance.md` |

## Steps

1. **Parse handoff**  
   Validate with `ArchitectToDeveloperHandoffSchema` from `@praxis/contracts`:
   - `contract: "architect.developer.handoff"`
   - `workPackageId`, `designPackagePath`, `contextSlicePath`
   - `decisionIds[]`, `features[]` with `readyForDev`  
   Schema fail → **stop**; return to Architect with schema errors. Do not invent fields.

2. **Open artifacts**  
   Read `designPackagePath/index.md` (or package root) and `contextSlicePath`. Missing either → return package (`missing-artifact`).

3. **Ready-for-dev gate**  
   - Every feature in `features[]` must have `readyForDev: true` **or** be explicitly listed as out-of-this-delivery with Architect note.  
   - If **any** in-delivery feature has `readyForDev: false` / missing readiness criteria → **stop**, name the feature ids, return to Architect (WBS `5.4.2`).  
   - Context slice must include In slice / Out of slice / Non-negotiables sections.

4. **Materialize working view**  
   Write acceptance journal:

   `design/<workPackageId>/dev/acceptance.md`

   ```markdown
   ---
   workPackageId: <id>
   acceptedAt: YYYY-MM-DDThh:mm:ssZ
   decisionIds: [...]
   status: accepted|returned
   ---

   ## Applicable decisions
   (from slice — id, path, rule one-liner)

   ## Contracts
   ## NFR budgets
   ## Boundaries (out of slice)
   ## Residual opens
   ## Blockers returned (if any)
   ```

5. **On return**  
   Set `status: returned`. Message Architect with blocker list. Do not start `create-plan`.

6. **On accept**  
   Set `status: accepted`. Confirm human saw residual opens (AskUserQuestion if opens non-empty). Proceed to `load-stack-rules` / `research-codebase`.

## Human gates

| Situation | Gate |
|-----------|------|
| Residual opens in slice | Human acknowledges before coding |
| Schema/artifact fail | No gate — automatic return |
| All green | Optional skim; acceptance journal is enough |

## Done when

- Handoff schema valid; design package + slice readable.
- Working view lists applicable decisions, contracts, budgets, and **explicit boundaries**.
- Either `status: accepted` with journal written, or `status: returned` with named missing readiness items.
- No implementation started on a returned package.

## Failure modes

| Mode | Response |
|------|----------|
| Accept without `readyForDev` | **Forbidden** — return |
| Inventing missing ADRs/contracts | **Forbidden** — return to Architect |
| Skipping journal | **Forbidden** — write `dev/acceptance.md` |
| Treating whole `architecture/` as in-slice | Use slice only; escalate if binding ADR omitted |
| Starting plan on returned package | **Forbidden** |
