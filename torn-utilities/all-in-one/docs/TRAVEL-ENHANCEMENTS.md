# Travel Assistant DEV acceptance: 0.5.42.40-dev

Alarms update status and sound without changing whether the user minimized the main window. Monitoring continues while the activated tool is minimized, on the actively viewed Torn page. Exit stops its runtime. Hidden or unfocused pages are not scanned for stock.

**Show monitored items only** hides unmatched native shop rows while retaining monitored zero-stock rows. It follows watch changes and dynamic shop rows. Disable the option or Exit to restore TU-hidden rows. It does not remove rows or change native filters. Unsupported layouts are left alone rather than guessing which containers to hide.

## Snatch and Run (opt-in DEV)

On a foreign page, add the item to monitor, choose it in Snatch and Run and answer whether you are hospitalized. Arming verifies the player, country and status with Torn's read-only API. Hospital users load medical inventory with the active verified Limited Access login key and select an item. Torn may cache inventory for 15 minutes; native availability must still be confirmed. Public Only keys cannot load the inventory picker.

Bind the actual visible Torn Use, Buy and Return to Torn controls using the selection buttons. The selection click is captured and does not execute the action. Escape cancels selection. Controls must be selected again after navigation or replacement by Torn. Setup never stores action URLs, DOM bindings, keys or tokens.

The selected monitor's stock alarm unlocks the compact action toolbar. Each trusted user click delegates one gameplay action to a matching visible native Torn control:

1. Hospital users use the selected medical item. The next stage waits for observed hospital release. Users answering No skip this stage.
2. Buy sets a verified native Max and delegates Buy for the monitored row. The next stage waits for a new matching native purchase-success message.
3. Return delegates the visible native Return to Torn control. Completion requires confirmation of a return flight.

Complete Torn's own confirmations manually. Use **Check result / refresh status** after state changes when needed. This reads status; it does not submit another gameplay action. Navigation, controls and dialogs can require more than three clicks. The tool does not call private mutation endpoints, retry gameplay actions automatically, or proceed on assumed success. Unknown layouts, stale stock, missing controls, unfocused pages and unverified results block progress.

A session-only intent can survive navigation for up to 15 minutes; native controls must be rebound and status refreshed. Cancel or Exit clears the sequence. No action resumes automatically. The compact toolbar does not restore the main window.

## Validation boundary

Automated fixtures cover minimized alarms, reversible filtering, explicit gestures, Max/Buy delegation, confirmed transitions, stale stock, focus, expiry and cleanup. They do not establish compatibility with the live logged-in foreign shop, medical inventory or travel controls. Actual Android PDA and Tampermonkey acceptance remains required, including the new TU Test checks. Exact native markup and usable confirmation messages must be recorded before considering this feature production-ready.

Architecture references reviewed: Torn's public GET-only API schema at https://www.torn.com/swagger/openapi.json and script rules at https://www.torn.com/rules.php. Keep gameplay actions directly initiated by the user on the actively viewed page; never add hidden-page extraction, automatic chaining or CAPTCHA bypasses.
