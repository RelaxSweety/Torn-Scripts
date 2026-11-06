# DEV 0.5.42.38 — session reuse and observation lifecycle

## Verification

- The backend remains authoritative for authentication, current-agreement acceptance and protected requests. Cached client state is not a replacement for backend enforcement.
- A confirmed session/accepted agreement version is cached in session storage for **five minutes**, bound to the current session token. Fresh cached navigation reuses it without HTTP. Expiry is checked on relevant activity (tool activation/API use), page resume or an explicit refresh; there is no polling timer.
- Initial restoration uses `/api/auth/agreement`, whose response includes agreement metadata and accepted status, without the full agreement text. Missing/rejected/changed-version acceptance is not converted to a pass. Expired tokens can renew once through the Manager; revocation does not trigger automatic acceptance.
- Verified identity is reused with its matching session and saved-key record. Profile details may refresh after **30 minutes** without re-verifying the key. An existing matching identity can carry over a backend-confirmed token renewal for the same player. New/unknown identity or explicit key operations still require normal verification.
- Saved-key changes, confirmed cancellation/removal, cross-tab logout and relevant backend denial invalidate cached access. Room-token failures do not incorrectly force account re-verification.
- Session storage must persist in the host for navigation reuse. A new WebView/session with no retained cache performs normal restoration.

## Agreement text and version

Full agreement text is fetched when the user deliberately opens/reviews the agreement or needs it for explicit acceptance. A **24-hour session cache**, keyed by the known agreement version, avoids downloading it repeatedly. A known version change invalidates the content cache. Acceptance checks the current backend version; if it changed after the displayed copy, TU opens the new text and requires a fresh explicit confirmation. It never accepts unseen updated terms automatically.

TU Test compares `agreement_version` only. GitHub supplies a small `torn-utilities/agreements/dev/version.json`; the Manager exposes a read-only backend version-status bridge. No full agreements are downloaded, uploaded or compared word for word by this diagnostic check. The bridge does not register a key, renew a token or write an agreement event: if the current token cannot verify status, reopen the Manager to restore the session. The full document, number and effective date remain available in User Agreement. Existing backend acceptance/event contracts remain in force; no Worker or database is deployed by this change.

`build-diagnostics.mjs` regenerates `version.json` from the published `current.json` and rejects stale metadata in `--check` mode. Agreement publications must update the published version when the agreement changes and commit the generated metadata alongside the full document.

## DOM observations

The idle Manager has **no connected MutationObserver or ResizeObserver** and no one-second authorization interval. Hidden tool registration also no longer causes repeated hidden Manager rendering.

When the Manager is visible, it observes only its own UI. While a tool is activated, it observes that tool's TU window elements; a direct-child-only body observer discovers floating tool windows. It does not watch the whole Torn subtree for class/style changes. Window/resize observation disconnects after Exit or hiding the idle Manager, and while the document is hidden. TU Test observes its panel size only while that panel is open.

Actual Torn-content observation belongs to the activated tools that require it: Item Monitor starts it with its runtime and stops it on deactivation; Chat Archiver observes the selected chat only during capture and disconnects on stop/Exit. Minimizing an active monitor/capture may intentionally preserve monitoring. Games do not acquire a global Torn-content observer merely by being registered.

## Validation limits

`session-lifecycle.mjs` exercises cold/warm restoration, expiry, version changes, read-only checks, full-text caching, revocation, cross-tab logout, identity reuse and disconnected/scoped observers using mocked services and jsdom. Existing integration, saved-key, diagnostics and performance regressions also run. These checks demonstrate client behavior, not actual PDA frame rate or live account/backend acceptance. Device retesting remains necessary before production review.
