---
name: repair-loop
description: Repair red verification with escalation 3 same-agent + 2 fresh stronger + human on the 5th exhaustion; journal every round (WBS 5.14).
---

# Repair Loop

Escalating repair protocol when phase verify or `final-arbiter` is red. Rounds are ordered, journaled, and finite: **3** with the same executor, **2** with a fresh stronger agent/model, then **human** with the full journal (WBS `5.14.1`, `5.14.2`).

## When to use

- `implement-plan` phase verify failed.
- `final-arbiter` returned any false criterion.
- Explicit “repair this failure” with evidence in hand.

Do **not** use for green suites, or as unbounded silent retries.

## Journal path

Primary:

`design/<workPackageId>/dev/repair-journal.md`

If multiple concurrent failures, use:

`design/<workPackageId>/dev/repair-journal-<phase-or-slug>.md`

Also append a one-line pointer in `plan-status.md` log.

## Protocol (fixed order)

| Round | Executor | Model posture |
|-------|----------|----------------|
| 1–3 | **Same** agent/session that produced the failing change | Same tier; fix from evidence |
| 4–5 | **Fresh** agent / stronger model | New hypothesis; do not blindly replay round 1–3 patches |
| After 5 still red | **Human** | Present journal; human chooses narrow scope / revert / escalate Architect |

Stop early on first green verify that covers the failure (re-run the **same** check that failed).

## Steps

1. **Open / create journal** with frontmatter:

   ```markdown
   ---
   workPackageId: <id>
   trigger: phase-verify|final-arbiter
   phase: <n|null>
   check: "<command or criterion>"
   started: YYYY-MM-DDThh:mm:ssZ
   status: open|resolved|escalated-human
   ---

   # Repair journal — <workPackageId>

   ## Failure evidence
   (paste command, exit code, relevant stderr)

   ## Rounds
   ```

2. **Round k (1–5)**  
   For each round, append:

   ```markdown
   ### Round k — <same|fresh> — YYYY-MM-DDThh:mm
   - Hypothesis: …
   - Changes: files touched
   - Verify: command + result (pass|fail)
   - Notes: …
   ```

   Rules:
   - Rounds 1–3: same executor; each round needs a **new** hypothesis or narrowed fix (no identical blind retry).
   - Rounds 4–5: spawn fresh context / stronger model; read the journal; forbid copy-paste of failed patch without new analysis.
   - After each round, re-run the failing check (phase verify or arbiter flags).

3. **On green**  
   Set `status: resolved`, `resolvedRound: k`. Return control to `implement-plan` or `final-arbiter` for full re-check as appropriate.

4. **On exhaustion (5 fails)**  
   Set `status: escalated-human`.  
   **AskUserQuestion** with:
   - Journal path
   - Summary table of 5 hypotheses + results
   - Options: narrow scope / revert phase / escalate Architect (`request-architecture-deviation`) / accept waive (rare; needs written reason)

   Do not invent a 6th autonomous round.

5. **Human decision recording**  
   Append `## Human decision` with choice + date. Follow the chosen path; if Architect escalate, pause coding on the disputed area.

## Human gates

| When | Gate |
|------|------|
| After round 5 still red | Required |
| Mid-loop scope change | Optional but recommended |
| Early stop green | None |

## Done when

- Journal exists at `design/<workPackageId>/dev/repair-journal.md` (or slug variant).
- Every attempted round has hypothesis + verify result.
- Either `resolved` with green check, or `escalated-human` with recorded human decision.
- No silent infinite retries.

## Failure modes

| Mode | Response |
|------|----------|
| Retry without journal lines | **Forbidden** |
| Round 4–5 with same unexamined patch | Invalid — new hypothesis required |
| Skipping to human before 5 without human request | Allowed only if human pulls early; note `early-escalation` |
| Continuing implement on other phases while critical fail open | Only if failure is isolated and plan says so; default = block next phase |
| Declaring resolved without re-running the failing check | **Forbidden** |
| Sixth autonomous round | **Forbidden** — human gate |
