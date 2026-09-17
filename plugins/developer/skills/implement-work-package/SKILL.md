---
name: implement-work-package
description: Implement a Work Package (local WP- id or Jira key) end to end.
---

# Implement Work Package

Claude UI is the human interface. Do not ask the user for Make or Node commands.

## Capability detection

Detect repo. `${CLAUDE_PLUGIN_ROOT}/bin/praxis doctor --json`. If it cannot run: `LOCAL_RUNTIME_UNAVAILABLE`.

If unsure: `praxis developer --help` / `praxis work-package --help`.

## Flow

1. `praxis work-package show --wp <WP> --json` (accepts `WP-20260914-002` or Jira key)
2. `praxis jira status --epic <EPIC> --json` if epic known; reread remote members; exclude superseded (e.g. PRX-2)
3. `praxis developer claim --wp <WP> --json`
4. Build an implementation plan from the official change-spec; show it; wait for human approval
5. Implement the real change (Architect scratch tests do not count)
6. Run the project tests
7. `praxis developer complete --wp <WP> --confirm YES --json` after verification passes

Do not start Quality.

Examples: «Возьми WP-20260914-002 и реализуй его.» / “Take WP-20260914-002 and implement it fully.”
