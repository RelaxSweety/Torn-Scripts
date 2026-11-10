# Pending disclosure amendment — not approved or implemented

The approved agreement draft remains preserved verbatim. This note identifies additions needed before eventual implementation; it is not a replacement agreement or a new approval request.

1. Describe verified, unencrypted userscript-private storage on supported managers and unencrypted Torn-origin fallback on PDA/unsupported hosts. Mention that typed or revealed keys enter the page DOM.
2. Describe private TU session records in the candidate, nonsensitive cache markers, server-enforced expiry, removal on read/clear, and the absence of guaranteed background deletion of orphaned records or manager backups.
3. State that the compatible stock-reporting client sends a TU bearer session to TU for authorization, while raw Torn API keys are not included in stock payloads. The backend already handles verification identity; rate counters use short-lived hashed identity/IP/key fingerprints, not anonymous identifiers. Active counter expiry is distinct from provider/backups retention.
4. Preserve the distinction between application database behavior and provider logging/access policies; do not promise a verified live operational control before checking it.
5. Confirm the private support contact, applicable YATA/source-data conditions, effective date and available agreement number. A possible support route is a private Torn message to the script author, RelaxSweety [4539436]; ownership/contact availability still needs confirmation, not a public issue containing secrets.
6. Mount the prepared API/data-use disclosure table visibly at every key-entry surface only when implementation is authorized. Verify registration, agreement and saved-key entry; review backup/import and feature-specific legacy key surfaces.

The prepared table component at `all-in-one/src/features/api-disclosure.js` is inert and unit-tested. It is not currently mounted. Agreement 1.2 and the approved 1.3 file have not been changed; renewed consent has not been triggered.
