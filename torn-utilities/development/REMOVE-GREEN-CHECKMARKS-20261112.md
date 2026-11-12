# Remove green Snatch and Run purchase checkmarks — DEV .103

TU 0.5.42.103-dev / Item Monitor 1.12.53-dev removes green filled-slot purchase checkmarks from Snatch and Run. The renderer no longer creates a green badge or checkmark character. Purchase results retain only unfilled-slot status, legacy saved filled marks are ignored/filtered when inspected, and existing filled badge DOM is removed. New native inventory mounts cannot restore green marks.

Red X marks remain on requested slots that are still empty, and disappear when the corresponding space fills. Native item cells are preserved. The three-second quantity/capacity purchase notification, native post-purchase focus refresh, initial plus five click-dependent remainder attempts, immediate departure, no-page-reload policy, armed healing snapshot flow and DEV diagnostic monitor tools remain.

Validation: `npm run build` (970335 bytes), full `npm test`, focused direct-purchase regression and `scripts/validate-no-green-checkmarks.py`. The unit regression covers no green marks after partial purchases, after native remount, and after injecting legacy filled state/DOM. It also preserves red slot mapping, unrelated/decorative cells, ambiguous-number rejection and noninteractive behavior. Trusted Chromium fixtures cover desktop, 390×844 portrait and 844×390 landscape, successful/partial/exhausted purchase sequences, saved-state manual reload, notifications, one focus event per verified purchase, no automatic reload, immediate return/departure and uncertain-result locks. All gameplay and responses are synthetic; no real items were purchased or moved.

Screenshots: `evidence/no-green-checkmarks-103/`, including partial/full purchases and retained red X marks. Changed implementation: `all-in-one/src/features/direct-items/snatch-direct-items.js`; purchase regression/browser fixture; DEV metadata/distributions and this record.

Recovery: .102 commit `043e519c1741f816e99707ac9cb2a126f47667f3` and archived .102 installer. Only DEV/recovery refs are published. Separate production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`; Worker, databases, agreement and server storage are unchanged.
