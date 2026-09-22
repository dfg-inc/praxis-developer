# praxis-developer

Independent Praxis Developer Skills plugin. Distribution: **`praxis-developer.zip`**.

## Development

```bash
npm ci
export PRAXIS_BA_ROOT=/path/to/praxis-ba
export PRAXIS_ARCHITECT_ROOT=/path/to/praxis-architect
export PRAXIS_DEVELOPER_ROOT=$PWD
npm run verify
```

Includes Developer governance + Git Delivery compatibility checks inside acceptance.

## CI

Jobs: `validate`, `governance`, `pack_zip`.

**Required GitLab setting:** allow inbound job tokens from `praxis-developer` on `praxis-ba` and `praxis-architect`.

## Release

Artifact `praxis-developer.zip`. Independent versioning.
