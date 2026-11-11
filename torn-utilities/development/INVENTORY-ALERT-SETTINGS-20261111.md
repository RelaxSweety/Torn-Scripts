# DEV per-item inventory alarm channels — 0.5.42.97-dev

TU 0.5.42.97-dev / Item Monitor 1.12.47-dev removes the redundant Audio and Visual checkboxes from the common Inventory alarm settings. Each monitored item's saved audible/visual preferences are authoritative.

The common Inventory sound, master volume, duration, alarm-until-muted and test/mute controls remain. Hospital and Landing channel controls remain independent and unchanged. Legacy global inventoryAudio/inventoryVisual values no longer suppress enabled item preferences; existing per-item flags, thresholds, edit/reload persistence, monitoring and Snatch readiness are preserved.

Changed implementation: `torn-utilities/modules/item-monitor.user.js` (inventory channel rendering and alert/highlight gates), DEV metadata/distributions, and `tests/item-alert-options.mjs`. Regression fixtures seed stale disabled global switches and verify enabled/disabled per-item sound/visual behavior, silent monitoring/readiness, settings persistence and absence of the duplicate controls. Build, 179 integration checks, per-item alerts, landing/exit settings, compact presentation, integrated stock evidence and primary DEV diagnostic lifecycle passed. Chromium verifies the settings on desktop, portrait and landscape with synthetic authorization/network responses; screenshots are in `evidence/inventory-alert-settings-97/`.

Recovery: .96 commit `35bb9ba610b682928b31267189ce9c11f47d00a3` and archived .96 installer. Production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`; Worker, databases, agreement and other server/storage remain unchanged. No real gameplay or tester-data operations were used for verification.
