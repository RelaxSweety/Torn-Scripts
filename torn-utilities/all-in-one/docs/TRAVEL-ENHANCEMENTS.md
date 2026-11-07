# Travel Assistant DEV acceptance: 0.5.42.43-dev

Alarms update status and sound without changing whether the user minimized the main window. Monitoring continues while the activated tool is minimized, on the actively viewed Torn page. Exit stops its runtime. Hidden or unfocused pages are not scanned for stock.

**Show monitored items only** hides unmatched native shop rows while retaining monitored zero-stock rows. It follows watch changes and dynamic shop rows. Disable the option or Exit to restore TU-hidden rows. The checkbox sits beside its label. Unmatched foreign-shop items have their outer list containers collapsed too, so monitored items collect at the top of the item list without blank slots. It does not remove/reorder DOM nodes or change native filters. Unsupported layouts are left alone rather than guessing which containers to hide.

## Snatch and Run (opt-in DEV)

On a foreign page, add the item to monitor, choose it in Snatch and Run and answer whether you are hospitalized. Arming verifies the player, country and status with Torn's read-only API. Hospital users load medical inventory with the active verified Limited Access login key and select an item. Torn may cache inventory for 15 minutes; native availability must still be confirmed. Public Only keys cannot load the inventory picker.

Press **Arm Snatch and Run** to minimize the main window and show a single red **Snatch and Run** button. A red-button click does nothing. The selected item's stock alarm turns it green. The same button presents these actions:

Desktop Tampermonkey (PC) uses the foreign-page DOM recorded on Edge/Tampermonkey. Each trusted click handles exactly one requested gameplay stage, including its matching native confirmation:

1. **Heal from Hospital** finds the selected medical item by its exact inventory-slot label (including blood type), expands the slot, selects **Use**, verifies the named item in its own question and selects **Yes**. It waits for **You are out of the hospital!** before offering Purchase Max. It does not purchase automatically. If the medical item does not release the user, it never consumes another item automatically. Non-hospitalized users skip healing.
2. **Purchase Max** uses the monitored numeric item ID and exact native row name, clicks its maximum icon, reads the native text quantity input, selects Buy and verifies that item's own confirmation quantity/name before selecting **Yes**. It waits for the selected-item inventory count to increase by the confirmed amount before offering Return to Torn. No automatic return follows.
3. **Return to Torn** opens **Travel home**, verifies Torn in the return question, selects **Travel Back**, waits for the airstrip/pilot booking message and selects the enabled **Continue** button. Disabled countdown controls are respected. It does not book a second flight or repeat a submission.

The single button stays red/inactive until stock conditions are met. Arming minimizes the main window, and alarms preserve minimization. There are no native-control selection buttons or separate status panel. Exact item type/quantity/destination mismatches, ambiguous confirmations, missing controls, stale stock, changed player/country, loss of focus and cancellation block further clicks. Cancel is available by restoring the main setup; Exit cancels as well. Stock is rechecked before medical confirmation, and native hospitalization state is checked before buying.

The desktop adapter exists only for PC Tampermonkey without a PDA bridge/mobile user agent. PDA retains its previous action implementation and is not fixed or validated by this change. Its native confirmations may still need manual handling.

During a desktop action, a bounded DOM observer waits for the next control/result; it disconnects on success, failure or cancellation. There is no additional observer/polling when idle. Native result evidence advances successful desktop stages without waiting for cached API status. If a heal/return submission was accepted but its result was not established, existing bounded status refreshes may help recover; submissions never retry automatically. Unknown intermediate outcomes remain pending for manual resolution rather than risking duplicate item use/purchase.

A session-only intent can survive navigation for up to 15 minutes. Controls are matched again on the new page. No action resumes automatically. Stock must remain fresh; unknown layouts, stale stock, missing controls, unfocused pages and unverified results block progress. Setup stores no action URLs, DOM bindings, keys or tokens.

## Validation boundary

Automated fixtures include sanitized structural excerpts from the 2026-11-07 desktop recording: inventory slot/popover and medical Yes/No, native maximum/text-input/Buy controls, item-specific purchase confirmation, and Travel home/Back/Continue. Tests exercise the exported adapter and complete generated bundle with synthetic host/API responses, plus wrong blood type, quantity/destination mismatch, unrelated Yes, re-hospitalization, duplicate clicks and cancellation. Only the necessary item/control excerpts are committed; the user's video, full export and profile/sidebar details are not.

These tests do not perform real gameplay or establish live desktop/PDA reliability. Actual PC acceptance remains required before production; production and Workers are unchanged. PDA needs separate live DOM evidence and implementation validation.

Architecture references reviewed: Torn's public GET-only API schema at https://www.torn.com/swagger/openapi.json and script rules at https://www.torn.com/rules.php. Keep gameplay actions directly initiated by the user on the actively viewed page; never add hidden-page extraction, chaining distinct gameplay stages without a new user click or bypassing CAPTCHAs.
