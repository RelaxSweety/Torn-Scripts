# Torn Utilities — single-script DEV

Version **0.5.42.35-dev**, branch `dev/tu-all-in-one`. Install one complete userscript for desktop Tampermonkey or Torn PDA. This is a DEV release for manual acceptance; no production deployment is included.

[Install DEV](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js) · [Installation and rollback](../INSTALLATION.md) · [Acceptance checklist](docs/DEV-ACCEPTANCE.md)

The 10 retained tools are Flight Game, Stick Fighter, Tic-Tac-Toe, Torn Four, Torn Fleet, Slithering Streets, Chaos Marbles, Travel Assistant and Item Monitor, War Organizer, and Chat Archiver. Navigation is Tools / Settings / About, with War Organizer under War Tools. User Agreement loads the published DEV agreement; Version Notes are embedded.

## Build and tests

Use Node 24 and npm. From `torn-utilities/all-in-one`:

```sh
npm ci --no-audit --no-fund
npm run validate
node scripts/build-dev.mjs --check
```

`npm run build` assembles `src/manager/manager.user.js` and the explicit `config/tools.json` sources. The staging, version-specific, and rolling DEV files are identical. No module catalog or external script installation is required. `config/releases.json` supplies the embedded release history; update it with each release. The builder checks source/bundle syntax, metadata, tool count, production endpoints, obsolete diagnostics, and patch markers. `--check` rejects stale committed outputs.

Tests use jsdom, mocked HTTP/account responses and a mocked canvas. They validate integration behavior, not actual game graphics, native GM/PDA bridges, or live multiplayer service behavior. See the acceptance report before installing.

## Architecture and migration

The internal Manager registers 10 lazy factories. Each retained source initializes on its first activation, captures its definition through a private Window facade, and receives its own version through `GM_info`. Native Window methods retain their receiver. Closing a tool calls its cleanup; reopening uses the retained factory. The build removes obsolete authorization bootstrap wrappers; the Manager controls access and revocation. Flight/Stick listeners use abortable scopes; Travel polling and observers stop on deactivation and resume on reopening. Minimizing preserves the active tool.

All bundled service endpoints target the DEV Worker. Multiplayer requests carry account authorization plus a separate room token. DEV room session keys are separate from production; saved game history, settings, and other storage namespaces remain in place. Existing room sessions are not copied between servers. Backups preserve the existing TU-managed namespace format; large archives and legacy tool storage are outside that backup format and must be exported using their own tools.

The selected sample #1 Integrated Gold logo is embedded from `../assets/tu-logo-integrated-gold.png`, including the compact 34px launcher, shared headers and War Organizer logo. The previous SVG master remains available for historical releases. Device rendering remains an acceptance check.

Historical independent sources, `modules.json`, legacy catalog Managers, and production guard workflows remain for rollback and existing supported installations. They are not inputs to the DEV integrated build. Never run the production candidate builder as part of DEV release setup, and never deploy Workers or databases for this workflow.

## Independent TU Test

Use [TU Testing and Diagnostics DEV](docs/TU-TEST.md) v0.2.1-dev for the 50-check acceptance plan, separate PDA/Tampermonkey evidence, and sanitized exports. This checklist targets the current integrated DEV build; actual host tests remain manual. `npm run build` also regenerates this independent test tool; `npm run build:diagnostics` updates only TU Test.
