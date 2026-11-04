# TU All-in-One (DEV)

Single-install cross-platform Torn Utilities architecture. This directory is a new development workspace; existing production and WHO DEV scripts are unchanged.

## Distribution
- Tampermonkey: one bundled userscript
- Torn PDA: one bundled userscript
- Modules remain individually maintained in source and are registered by the build.
- Diagnostic rescue utility remains independently installable.

## Security and API
- User chooses Public or Limited as requested access level.
- Existing server-side verification and agreement acceptance remain mandatory.
- Actual API access level must be verified by the server, never inferred from a label.
- Store confirmed key with verified access level and player identity; redact secrets from logs, exports and diagnostics.
- Never silently downgrade or upgrade permissions.

## Release rules
- DEV and PROD remain separate.
- Both Tampermonkey and PDA acceptance tests are required for release.
- No automatic activation of gameplay actions.
- No production changes until tests and review are complete.

See docs/ARCHITECTURE.md and docs/TEST-PLAN.md.
