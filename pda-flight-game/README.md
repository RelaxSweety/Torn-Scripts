# Torn PDA Arcade

Modular, mobile-first Torn PDA arcade by RelaxSweety [4539436].

## Current release

**v0.8.0**

Flight Arcade is the first registered game module. The Arcade Manager provides the persistent launcher, game list, per-game visibility and availability settings, storage, and shared arcade infrastructure.

## Files

- `Torn-PDA-Flight-Game.user.js` — current bundled production userscript. The legacy filename is retained to preserve existing update/install URLs.
- `Torn-PDA-Flight-Game.meta.js` — lightweight version metadata used for update checks.
- `CHANGELOG.md` — maintained production release history.
- `drafts/` — archived development/release files.

## Release process

For every production release:

1. Increment the userscript `@version`.
2. Add the new release summary to the userscript release-notes header.
3. Promote the tested bundled userscript to production.
4. Increment the matching `.meta.js` version.
5. Update `CHANGELOG.md`.
6. Update this README when architecture, installation, or user-facing behavior changes.
7. Verify the production userscript and metadata versions after deployment.

Large builds are promoted using Git blob → tree → commit → main branch ref rather than the normal single-file update operation.
