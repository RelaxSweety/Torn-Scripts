# DEV .121 — optional thresholds and scoped Item Monitor alerts

TU 0.5.42.121-dev / Item Monitor 1.12.58-dev. War Organizer stays 0.3.31-dev.
No Worker, database, agreement or production changes.

All monitored items can save without a price, regardless of selection location.
Quantity is also optional: with neither threshold, a verified available purchase
listing triggers the alert. Saved market quantities and foreign prices are no
longer discarded. Existing configured quantity/price thresholds remain independent
triggers (either can alert), as explained beside the fields. Zero stock never
qualifies. Existing saved watches, per-item audible/visual preferences and
cross-location matching in supported shops remain supported.

The previous scanner ran its generic row/name/price fallback on unsupported pages,
including inventory and faction pages, ignored saved location when matching, and
allowed partial name matches. It could read owned quantities or displayed values
as purchasable stock/prices. Generic item.php and city URLs could also be wrongly
classified as shopping. The new route checks exclude unsupported pages and
require verified foreign shop tables or visible purchase rows on store/market
routes. Matching uses exact item ID/name and refreshes row references each scan.
Disabled/hidden purchase controls are excluded outside verified foreign stock
tables; native foreign stock remains observable during hospitalization for the
existing healing workflow. Leaving a shopping context clears old highlights,
resets row references/latches and stops the item alarm. Monitored-only filtering
also excludes unrelated pages. Manual alarm tests and other travel alarms remain
separate. Saved selection category is descriptive: matching the same item in a
valid bazaar or shop remains intentional.

Validation: focused source-executed tests reproduce inventory/faction/city and
query-string false positives, exact ID/name checks, unavailable controls/stock,
blank and explicit saved thresholds, valid shops and navigation/audio cleanup.
Full generated-bundle browser checks cover desktop, portrait and landscape with
blank thresholds in foreign shops, bazaars and Item Market; unrelated-page
mutations and polling cannot restart alerts. Full npm regressions cover the
existing hospitalization/healing/purchase/filter workflows. The desktop travel
fixture now uses Torn's complete travel route; performance tests expect no item
listing scans on unrelated pages. No credentials, real purchases or other gameplay
are used in tests. Native provider layouts beyond captured/synthetic fixtures
still need user acceptance on the updated DEV installer.

[Browser evidence](evidence/item-monitor-scope-121/validation.json).
