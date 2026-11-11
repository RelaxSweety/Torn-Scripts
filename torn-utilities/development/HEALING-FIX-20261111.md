# Selected-item handler correction — DEV 0.5.42.91-dev

Item Monitor **1.12.41-dev**. Supersedes .90. All user-selected healing items
use the direct item handler. The native item-use diversion from .90 is removed.
The Worker, databases, agreement and separate production release are unchanged.

The supplied .89 report showed Morphine in travel inventory and repeated
pre-submission rejection by a handler hard-coded to two blood-bag IDs. The
handler now matches the user-selected item name/type (and instance identity,
when supplied) against fresh complete travel inventory. It submits the matching
slot through the same item-use handler regardless of the healing item type.
Unavailable, unselected or identity-conflicting items do not authorize a POST.

One trusted user action authorizes one item-use request. Consumption requires an
affirmative response and fresh evidence that the same slot is empty. Hospital
release is checked separately; partial healing stays hospitalized. Uncertain
requests remain locked without automatic retry or native fallback. Numeric-string
IDs and omitted empty-slot items from the report are supported, with duplicate,
malformed and incomplete-inventory rejection retained.

Validation: the full regression suite, selected-item handler tests for Morphine,
first-aid items, Neumune, all eight filled blood bags, the empty bag (without
assuming healing), and an arbitrary explicitly selected type; identity-conflict and
instance checks, existing blood-bag/uncertainty tests, and Chromium trusted-click
checks with all traffic mocked. Tests assert zero native item calls and exactly
one handler POST, including partial-heal and released outcomes.

No real gameplay request or item consumption was performed. The attached report
was not added to the repository. Update/reload the current DEV installer to use
the corrected handler:

https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/dev/torn-utilities-dev.user.js
