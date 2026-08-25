---
name: load-stack-rules
description: Load applicable stack rules from knowledge base and project config (WBS 5.5).
---

# Load Stack Rules

Подъём правил стека из свода норм и `.project`.

## Steps

1. Resolve role=developer, current stage.
2. Load knowledge slice + project overrides.
3. Summarize mandatory vs advisory rules for this stack.

## Acceptance

Mandatory rules listed before planning/coding.
