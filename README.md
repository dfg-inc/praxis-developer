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

Jobs: `validate`, `governance`, `pack_zip`; on tag `v$version` → `publish_release`.

**Required GitLab setting:** allow inbound job tokens from `praxis-developer` on `praxis-ba` and `praxis-architect`.

## Release

Install from [GitLab Releases](https://gl.jetru.by/engineering/ai-tooling/praxis-developer/-/releases): `praxis-developer.zip` + `release-meta.json`. Independent versioning via tags.

