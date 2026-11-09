# Torn Utilities DEV installation

Use this guide for `dev/tu-all-in-one` only. Production and the previous Manager remain unchanged.

1. Export important existing tool data, especially Chat Archiver records. TU's Manager backup covers TU-managed namespaces, not every legacy tool's storage.
2. Disable the old TU Manager and separately installed TU tools. Keep their scripts and saved data for rollback; do not run both architectures on the same page.
3. Install the single [rolling DEV userscript](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js). In Tampermonkey, open the link and approve installation. In Torn PDA, add the URL in Settings → Advanced Browser Settings → Manage Scripts and Fetch / Load / Authorize.
4. Reload Torn, open the draggable TU launcher, and verify the current published User Agreement using a Public Only or Limited Access key. Full Access registration is unsupported. Use Show / Hide when checking your entry.
5. Open Tools and select a category and tool. No individual tool URLs or catalog refresh are needed. Use Settings for API keys, backups, time display and diagnostics; About contains User Agreement and Version Notes.
6. Update this one userscript to update every bundled tool. Metadata points at the rolling DEV URL. The immutable [0.5.42.73-dev artifact](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-0.5.42.73-dev.user.js) is also available.

Complete the [manual acceptance checklist](all-in-one/docs/DEV-ACCEPTANCE.md). DEV multiplayer requires a DEV account session and fresh DEV room sessions; production rooms are separate. No automatic gameplay actions are added.

## Rollback

Disable the all-in-one DEV script, re-enable the previously installed Manager and tools, and reload Torn. The previous working Manager at the pre-integration commit is preserved here:

https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/b5ba89c003f8f76f3a9d6bd3bba3fd830d357f18/torn-utilities/core/cross-platform/torn-utilities.user.js

Do not clear browser storage during rollback. DEV session isolation does not delete previous room sessions or historical records.
