# Session-start hook (Developer)

At the beginning of a Developer session, run the bootstrap script so role/stage
rules and `.project` status are visible before other skills:

```
node ${CLAUDE_PLUGIN_ROOT}/tools/session-bootstrap.mjs --repo .
```

Optional stage override (default `implement`):

```
node ${CLAUDE_PLUGIN_ROOT}/tools/session-bootstrap.mjs --repo . --stage implement
```

Equivalent skill: `session-start`. Role `developer`, stage `implement` by default.
Uses shared `@praxis/plugin-sdk.bootstrapSession()` (bundled into
`session-bootstrap.cjs` in release artifacts). Does not invent a Knowledge path
when `knowledge.path` is unset.
