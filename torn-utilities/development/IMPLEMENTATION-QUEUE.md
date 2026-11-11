# TU implementation status — CURRENT DEV ONLY

The approved compact UI and self-service deletion work is implemented for
**TU 0.5.42.92-dev / Item Monitor 1.12.42-dev** with agreement **1.4 / number 5**.
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
