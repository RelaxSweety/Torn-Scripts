# Travel Assistant DEV acceptance: 0.5.42.41-dev

Alarms update status and sound without changing whether the user minimized the main window. Monitoring continues while the activated tool is minimized, on the actively viewed Torn page. Exit stops its runtime. Hidden or unfocused pages are not scanned for stock.

**Show monitored items only** hides unmatched native shop rows while retaining monitored zero-stock rows. It follows watch changes and dynamic shop rows. Disable the option or Exit to restore TU-hidden rows. It does not remove rows or change native filters. Unsupported layouts are left alone rather than guessing which containers to hide.

## Snatch and Run (opt-in DEV)

On a foreign page, add the item to monitor, choose it in Snatch and Run and answer whether you are hospitalized. Arming verifies the player, country and status with Torn's read-only API. Hospital users load medical inventory with the active verified Limited Access login key and select an item. Torn may cache inventory for 15 minutes; native availability must still be confirmed. Public Only keys cannot load the inventory picker.

Press **Arm Snatch and Run** to minimize the main window and show a single red **Snatch and Run** button. A red-button click does nothing. The selected item's stock alarm turns it green. The same button presents these actions:

1. **Heal from Hospital** for hospitalized users. One click matches and uses the selected visible native healing item. Confirmed hospital release advances to Purchase Max. Non-hospitalized users skip healing.
2. **Purchase Max** sets the native verified maximum and delegates Buy for the monitored row. A new matching purchase-success message enables the next stage.
3. **Return to Torn** delegates the visible native return action. Return flight status confirms completion.

There are no native-control selection buttons or separate floating status panel. The controller automatically matches a unique visible Torn control on each click, including after DOM replacement. Missing or ambiguous controls block action rather than guessing. Its title and the restored setup message explain blocked actions. Cancel remains in the setup, accessible by restoring the main window; Exit also cancels.

Complete Torn's own confirmations manually. After a user-initiated heal or return, up to three bounded read-only status refreshes (after 1.2, 4 and 10 seconds) check the result; they stop on confirmed transition, cancellation or Exit, and do not run in an unfocused page. They never retry gameplay actions. Navigation, controls and dialogs may still require extra manual action. No private mutation endpoints or offscreen inventory actions are assumed. Live foreign layouts must be validated before claiming a guaranteed three-click flow.

A session-only intent can survive navigation for up to 15 minutes. Controls are matched again on the new page. No action resumes automatically. Stock must remain fresh; unknown layouts, stale stock, missing controls, unfocused pages and unverified results block progress. Setup stores no action URLs, DOM bindings, keys or tokens.

## Validation boundary

Automated fixtures cover minimized alarms, reversible filtering, explicit gestures, Max/Buy delegation, confirmed transitions, stale stock, focus, expiry and cleanup. They do not establish compatibility with the live logged-in foreign shop, medical inventory or travel controls. Actual Android PDA and Tampermonkey acceptance remains required, including the new TU Test checks. Exact native markup and usable confirmation messages must be recorded before considering this feature production-ready.

Architecture references reviewed: Torn's public GET-only API schema at https://www.torn.com/swagger/openapi.json and script rules at https://www.torn.com/rules.php. Keep gameplay actions directly initiated by the user on the actively viewed page; never add hidden-page extraction, automatic chaining or CAPTCHA bypasses.
