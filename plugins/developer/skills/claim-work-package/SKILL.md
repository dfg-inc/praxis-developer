---
name: claim-work-package
description: Claim a Jira Work Package for the current developer. Fails if another actor holds an active claim.
---

# Claim work package

```
praxis developer claim --wp <WP> --json
```

Resolves local WP id or Jira key. Never steal a claim. Force-release requires `praxis developer release --wp <WP> --confirm YES`.
