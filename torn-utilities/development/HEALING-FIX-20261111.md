# DEV healing fix — 0.5.42.90-dev

Item Monitor **1.12.40-dev**. DEV client update only; the Worker, databases,
agreement and separate production release are unchanged.

The supplied .89 diagnostic shows Morphine in the travel inventory and repeated
healing failures reporting that no supported selected blood bag was carried.
Those attempts were marked `submitted: false`. The direct healing adapter was
being used for a selection outside its two-blood-bag pilot scope.

Healing selections containing non-pilot medicals now use the existing visible,
name-matched native item controls. Transport is chosen before any item-use
submission. Native selection, Use and confirmation each require a separate
trusted gesture. Hospital status, stock and the selected item are checked again
at the actual confirmation. Partial healing stays in the healing stage; confirmed
release enables the next stage. An uncertain earlier direct use cannot switch
to native use or retry automatically. Blood-bag-only pilot selections retain
their existing direct path.

The report also exposed canonical decimal-string inventory IDs and empty slots
without an `item` member. Validation now accepts these observed shapes while
rejecting invalid/duplicate IDs and incomplete inventories. Consumption still
requires an affirmative use response and fresh evidence that the same slot is
empty. Empty-slot capacity counting handles both omitted and null items.

Validation passed:

- `npm run validate`, including the new generated-bundle Morphine regression.
- Native selection/Use/confirmation, partial healing, release and capacity credit.
- Stock drops, changed hospital status, mismatched confirmation and cancellation.
- Existing direct blood-bag use, uncertain-result locks and no automatic fallback.
- String IDs, omitted empty items, duplicate-ID rejection and post-use verification.
- Chromium trusted-click flow and changed-stock rejection with synthetic controls.

No real gameplay request or item consumption was performed. Physical-user
verification should update/reload DEV and retry the configured healing sequence.
The attached diagnostic itself was not added to the repository.

Install/update:
https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
