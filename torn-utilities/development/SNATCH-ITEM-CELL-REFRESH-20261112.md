# Snatch and Grab item-cell refresh — DEV .112

TU **0.5.42.112-dev**, Item Monitor **1.12.54-dev**; War Organizer is **0.3.26-dev** with the accompanying travel/revive/separator corrections.

Snatch and Grab now uses the same page-realm focus-event refresh as verified purchases after each **verified hospital/healing item consumption** and each **verified item destruction**. Torn's subscribed native inventory queries can then refresh their item cells. The hook runs only after the direct handler confirms the action response and fresh inventory removal.

Confirmed partial heals also refresh, as do confirmed removals whose later hospital-status read fails. Item consumption and hospital outcome are distinct: the cell refresh does not imply the player was released or hospitalized. The existing status/uncertainty checks remain authoritative. The hook is before later status/ledger work so a proven removal still requests a native redraw even if the subsequent stage cannot proceed.

Each verified removal produces one best-effort, synchronous focus dispatch with no awaiting of native refresh work. Diagnostic events identify the action (`heal`, `hospitalize`, `destroy`), dispatch outcome and verified-item basis, without credentials or gameplay payloads. Dispatch or diagnostic callback failure cannot invalidate a confirmed mutation or block the next stage. There is no added direct inventory GET, page reload/navigation, observer timer, delay or automatic action/retry. Healing still uses the armed inventory snapshot and skips its pre-use GET; its existing post-use inventory verification is retained.

Rejected, unconfirmed, uncertain, canceled or blocked actions do not refresh. Destruction with no selected item remaining is a no-op and does not refresh. Existing post-purchase refresh behavior is unchanged.

## Validation

Build and full npm regression suite; expanded Snatch and Grab integration tests assert one focus event per verified use, including partial healing and later status failure, and confirmed completion despite a throwing refresh hook. Destruction tests assert one event per removed item, none for uncertain/no-op results, and no new uncertainty when dispatch fails. Focused direct purchase and armed-healing checks preserve previous refresh behavior and the faster inventory path.

Generated-function Chromium fixtures at desktop 1280×900, portrait 390×844 and landscape 844×390 use trusted clicks and entirely synthetic item inventories/responses. Healing asserts the exact sequence `inventory` (arm), `useItem`, `inventory` (verify), then one focus event. Destruction asserts one focus event for each verified POST/removal and none for an uncertain result. The focus listeners return unresolved promises to verify the workflow does not wait for native work. Evidence is under [snatch-item-refresh-112](evidence/snatch-item-refresh-112/) and [snatch-trash-refresh-112](evidence/snatch-trash-refresh-112/).

These tests verify dispatch and workflow behavior; real PDA/native item-cell redraw after medical use/destruction still needs user-side acceptance. No real item use, inventory destruction, purchases, tester data or user credentials were used. The shared focus-refresh mechanism's previous native observation is recorded in [purchase refresh validation](PURCHASE-NATIVE-REFRESH-20261111.md).

DEV-only publication: `dev/tu-all-in-one` and `release/approved-changes-20261110`. Production remains `73c42788968612913ccfee20b1d5c194324dc8fd`. Archived .111 and earlier installers/evidence, Workers, databases, agreements, approved War board layout, DEV monitor tools, removed green purchase checkmarks, red markers/notifications and no purchase page reload remain unchanged.
