# TU implementation status — CURRENT DEV ONLY

The approved compact UI and self-service deletion work is implemented for
**TU 0.5.42.98-dev / Item Monitor 1.12.48-dev** with agreement **1.4 / number 5**.
Earlier production-target references and implementation holds are superseded by
the explicit DEV-only authorization.

Completed: compact Manager/integrated tools; original branding and window state;
Manager minimize; separate dynamic faction information; flush scrolling headers;
Select Item on Screen; monitored filter below Add/update monitor; hidden empty
arming feedback; compact persisted independent alarm channels; resumable,
ownership-verified account deletion and current-agreement re-registration.

Independent observations are preserved, including information sourced through
other users' APIs or submissions. Only requester-derived identifying attribution
is removed from mixed records.

See [the release and validation record](DEV-RELEASE-20261111.md),
[the deletion specification](SELF-SERVICE-DATA-DELETION-PLAN.md), and
[the operative DEV agreement](../agreements/dev/1.4.md).

Separate production remains unchanged. Real-device acceptance and provider/
other-installation cleanup limitations are recorded in the release report.

The .91 correction routes every selected healing item through the direct item
handler, removes the .90 native diversion, and retains travel inventory schema
compatibility. See [handler regression evidence](HEALING-FIX-20261111.md).

The .92 follow-up routes selected inventory destruction through the handler,
with one verified removal per trusted click. See [destruction validation](DIRECT-TRASH-20261111.md).

The .93 follow-up routes foreign purchases through the direct handler and retains
one initial purchase plus five trusted-click remainder attempts. See
[direct purchase validation](DIRECT-PURCHASE-20261111.md).

The .94 follow-up completes any same-player armed stage on confirmed return
travel, clearing the action and screen alarm even after refresh. See
[return-flight cleanup](RETURN-CLEANUP-20261111.md).

The .95 follow-up adds per-purchase three-second quantity/capacity feedback and
a single inventory page refresh only after the purchase sequence finishes, and
verified green/red inventory-slot badges and native flight/hospital countdown synchronization.
See [purchase notification](PURCHASE-NOTICE-20261111.md).

## Completed UI cleanup — requested 2026-11-11

- **Completed in .96-dev:** Removed the Direct Item Tools section heading, explanatory text and standalone launch button from Travel Assistant and Item Monitor. Integrated healing, hospitalization, destruction, purchase handlers and normal diagnostic controls are preserved. See [removal and validation](DIRECT-TOOLS-UI-REMOVAL-20261111.md).

The .97 follow-up removes the redundant common Inventory Audio/Visual switches
and makes per-item alert preferences authoritative. See
[inventory alert settings](INVENTORY-ALERT-SETTINGS-20261111.md).

## Current purchase refresh policy — .98-dev

Automatic page refresh after purchase and its departure lock are removed. Keep
verified slot badges and per-purchase confirmation notifications. Return and
departure choices are immediately available after verification. A native
inventory refresh command remains unverified and is not substituted. See
[removal and validation](NO-AUTO-REFRESH-20261111.md).

## Temporary native refresh diagnostic — .99-dev

Added read-only native refresh-function inspection and a trusted-click A+ blood
bag add-to-carried-inventory POST test inside existing DEV diagnostics. Grounded
Travel Agency/status guards, exact inventory verification and unresolved-attempt
protection apply. Automatic page refresh remains removed. See
[native refresh diagnostic and validation](NATIVE-REFRESH-DIAGNOSTIC-20261111.md).

## Manual native focus refresh test — .100-dev

Added **Test Native Inventory Refresh** to existing diagnostics. One explicit
focus event is followed by five seconds of passive request/native-cell evidence.
No automatic purchase integration or page reload. Real PDA redraw acceptance is
pending. See [test and validation](NATIVE-FOCUS-REFRESH-20261111.md).

## Non-blocking post-purchase native refresh — .101-dev

One native focus event now follows each verified direct purchase, without
waiting, a five-second observer, page reload or departure lock. Removed the
Native inventory refresh investigation section; normal passive diagnostics
remain. Real foreign-market acceptance is pending. See
[implementation and validation](PURCHASE-NATIVE-REFRESH-20261111.md).

## Armed healing inventory — .102-dev

Healing inventory is prepared while arming and refreshed by post-hospitalization
verification. Heal skips its pre-use inventory GET and retains the post-use
consumption check. Missing/changed snapshots require re-arming; no hidden fallback
GET or automatic retry. DEV monitor controls remain, per the user's final
instruction. See [implementation and validation](ARMED-HEALING-INVENTORY-20261112.md).
