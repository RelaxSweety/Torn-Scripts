# Torn Multi-Chat Archiver

Tampermonkey userscript for archiving Torn City private, faction, global, and trade chats.

## Current stable version
**v1.9** — includes upward wheel-event emulation before scrollTop updates, preventing live messages from resetting historical scrolling.

## Layout
- `tampermonkey/`: installable userscript and release instructions
- `archive/`: snapshots of previous released scripts
- `docs/`: design, usage, and troubleshooting
- `tests/`: manual test checklists

## Status
Repository scaffold created. The working v1.9 source must be added to `tampermonkey/torn-multi-chat-archiver.user.js` before using it as an install/update URL.

## Notes
Keep the wheel-before-scrollTop logic from v1.9 when making revisions. Chat data is stored in session memory and can be exported to CSV/JSON.
