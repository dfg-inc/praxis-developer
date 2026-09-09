---
name: session-start
description: Use at the start of a Developer session — runs session bootstrap (role developer, stage implement) so project config and applicable knowledge rules are loaded before other skills.
---

# Session start

Load `.project` defaults and the applicable knowledge slice for **role `developer`**, **stage `implement`** (override with `--stage`), then print a bootstrap summary. Does not mutate product code.

## What happens

1. From the product repo root (directory with or without `.project`), run:

   ```
   node <plugin-dir>/tools/session-bootstrap.mjs [repo-root]
   ```

   Packaged plugins ship `tools/session-bootstrap.cjs` (same entry).

2. Read the printed lines: plugin version, `.project` status (missing / loaded / invalid), knowledge rules loaded or why skipped/unavailable.
3. If `.project` is missing, surface the suggested path and continue with defaults only after the human acknowledges.
4. If `knowledge.path` is unset, treat rules as **not applied** (explicit skipped) — do not invent a dataset path.
5. Proceed to `accept-work-package` / research / plan skills the human asked for.

## Done when

The human has seen the bootstrap summary for this session. No product or design writes.
