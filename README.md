# praxis-developer

Independent Praxis Developer Skills plugin. Distribution: **`praxis-developer.zip`**.

## Clone / develop

```bash
git clone https://github.com/dfg-inc/praxis-developer.git
cd praxis-developer
npm ci
export PRAXIS_BA_ROOT=/path/to/praxis-ba
export PRAXIS_ARCHITECT_ROOT=/path/to/praxis-architect
export PRAXIS_DEVELOPER_ROOT=$PWD
npm run verify
```

Includes Developer governance + Git Delivery compatibility checks. CI uses public sibling checkouts from `dfg-inc`.

## Install

[Releases](https://github.com/dfg-inc/praxis-developer/releases): `praxis-developer.zip` + `release-meta.json`.

## Release

Tag `v$version` → GitHub Release via Actions.
