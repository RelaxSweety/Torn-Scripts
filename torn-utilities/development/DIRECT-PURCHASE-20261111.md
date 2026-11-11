# DEV direct foreign purchase — 0.5.42.93-dev

TU 0.5.42.93-dev / Item Monitor 1.12.43-dev routes foreign-shop purchases through the direct handler. Healing, hospitalization and selected destruction remain direct; return travel retains native controls. Agreement 1.4 / number 5 and its separate-user-action rule remain unchanged.

## Captured contract

The supplied .92 diagnostic shows a trusted Buy / Yes action causing GET `/page.php?sid=travelData&step=buy&itemID=258&amount=18` (RFC omitted). HTTP 200 JSON had `success:true`, a bought signal, and message/total/item/amount fields. Fresh inventory changed from empty to 18 unique slots containing Jaguar Plushie (258). The endpoint mutates via GET, so the handler explicitly disables cache and redirects and does not retry a request. Raw reports and real account/slot/token values are not committed.

## Quantity and remainder behavior

Before each purchase, fresh complete travel inventory establishes actual base plus special capacity and occupied slots (bounded validation up to 100 slots). The existing native read-only shop resolver supplies the unique item identity, current visible price, stock and cash. It supports both explicit-ID and exact-name monitors; no native Buy, Max or confirmation is clicked. Missing/ambiguous shop data blocks the request. This uses current monitored/visible shop values, not an invented parser for the unrecorded raw shop-response schema.

Quantity is bounded by free slots, current stock, affordable quantity, and the remaining original purchase target. Initial stock must meet the monitor threshold. Verified remainder purchases may fill from lower remaining stock, as in the preceding native implementation. Maximum price is retained when arming; remainder price increases also stop reconciliation. The initial cash budget minus confirmed spending remains an upper bound even while Torn's displayed balance catches up.

The limit is one initial purchase plus five remainder transactions, six purchases total. Each requires another trusted click and fresh stock/inventory checks. Attempt count, target, amount, spend and inventory fingerprint are retained in the armed run, including across navigation. Unknown outcomes lock the sequence across reloads and cannot be replayed; they do not enable return travel. A known pre-submission stop after confirmed partial purchases can finish with a warning and no additional purchase. Return is always separate.

Success requires a positive response amount no greater than requested, an exact response total matching that amount and quoted price, and a fresh inventory showing exactly that many newly occupied slots of the selected item. All pre-existing item identities and total capacity must remain unchanged. Between purchases, any unexpected inventory change stops reconciliation.

## Verification and limitations

New tests cover variable capacities (8, 18 and 60), occupied slots, cash/stock constraints, partial fills, six-transaction cap, retained state, minimum/maximum constraints, stale stock, cancellation and concurrent presses, wrong item/amount/total, network and inventory failures, unrelated changes, reload locks, no automatic retry and separate return. Desktop and PDA full-bundle fixtures now simulate the captured direct endpoint while retaining native-return tests. The payload budget was raised 10 KB for this implementation.

Chromium trusted-click tests use fully synthetic responses and inventory on desktop, portrait and landscape; screenshots are in `evidence/direct-purchase-93/`. They verify the workflow fixture rather than a live Torn/PDA session. No real purchases, cash spending, destruction or tester data deletion were performed. The capture establishes the successful route, but does not retain raw response total/amount values or the raw shop schema; the strict parser safely locks rather than assuming success if the live format differs. A normal intended overseas purchase remains the live acceptance check. Shop observations and server mutations are not atomic, as with Torn's own request contract.

Recovery before publication: `72a8fc4b1e561bb6ca1d2b8a4a82036c703c3c58` and archived .92 installer. Implementation files: `direct-quick-items.js`, `snatch-direct-items.js`, `travel-enhancements.js`, `integrate-direct-items.mjs`, new purchase tests/browser validator, updated transport fixtures and DEV metadata/distributions. No Worker, D1, Durable Object, other server/storage or agreement changes are needed. Separate production main stays `73c42788968612913ccfee20b1d5c194324dc8fd`.

Validation results: `npm run validate` completed successfully. After final capacity-ledger and cancellation hardening, the release was rebuilt and the direct purchase, destruction, selected-item, travel-feature and full desktop/PDA bundle regressions passed again. All three trusted Chromium validators (purchase, destruction and healing) passed against that final build. Final payload: 944,308 bytes, 10 tools; diagnostics: 59 checks.
