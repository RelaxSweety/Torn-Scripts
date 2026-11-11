# TU implementation status — CURRENT DEV ONLY

The approved compact UI and self-service deletion work is implemented for
**TU 0.5.42.96-dev / Item Monitor 1.12.46-dev** with agreement **1.4 / number 5**.
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
