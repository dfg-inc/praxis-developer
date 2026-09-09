---
name: request-architecture-deviation
description: File a design deviation request to Architect (WBS 5.12).
---

# Request Architecture Deviation

Оформление отклонения от дизайна.

## Steps

1. Cite decision id and why it cannot hold.
2. Propose alternative + impact.
3. Stop implementation of conflicting parts until Architect responds.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/request-architecture-deviation.mjs --in <request.json> --out design/<wp>/deviations/<id>.json
```

Required fields: workPackageId, affectedId, requestedDeviation, reason, impact, evidence.

## Acceptance

Request filed; no silent drift.
