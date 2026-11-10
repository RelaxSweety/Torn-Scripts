# TU scripting review brief — prepared, not sent

Use this description with the user's supplied rules and any retained Torn approval correspondence. It is a review aid, not a requirement to seek generic permission for every feature, and no message has been sent to Torn staff.

- Public API reads: key/info plus user/basic for registration; enabled player/profile/catalog/travel/medical-inventory/cooldown and faction reads with verified key level/owner and shared budgets. No gameplay mutations through api.torn.com.
- Travel item use: a fresh trusted button press authorizes one website POST to page.php with sid=travelData and step=useItem. A current inventory response resolves the live slot before that action; response/post-inventory evidence confirms consumption and hospitalization/release. Slots are reusable, so cached slot IDs alone are not trusted. No automatic replay after an uncertain result.
- Personal quick item test: a fresh trusted press requests item.php step=useItem for the selected supported item. The Torn website session/security token authorizes it, not a public API key.
- Purchase/destruction/departure: required Torn controls advance one gameplay action per fresh trusted press. Quantity calculations, stock/cash/capacity checks, labels and response interpretation are informational. No timed autonomous sequence buys, consumes, destroys or travels just because stock appears.
- Passive diagnostics: bounded request/DOM evidence while enabled; token/key/password fields are scrubbed from reports; exports are local/user-initiated. No automatic sending of diagnostic reports is introduced.
- Chat Archiver: separately review automatic history scrolling and access to currently rendered/React/tooltip message data. Quick Items approval does not settle this behavior.

Retain the exact wording, scope and date of any approval being relied on. The user reports Torn administration approved the provided Quick Items POST approach. This brief does not broaden that report into a claim that all TU automation has been approved.
