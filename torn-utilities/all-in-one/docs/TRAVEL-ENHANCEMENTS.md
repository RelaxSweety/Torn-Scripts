# Travel Assistant DEV acceptance: 0.5.42.54-dev

Alarms update status and sound without changing whether the user minimized the main window. Monitoring continues while the activated tool is minimized, on the actively viewed Torn page. Exit stops its runtime. Hidden or unfocused pages are not scanned for stock.

**Show monitored items only** hides unmatched native shop rows while retaining monitored zero-stock rows. It follows watch changes and dynamic shop rows. Disable the option or Exit to restore TU-hidden rows. The checkbox sits beside its label. Unmatched foreign-shop items have their outer list containers collapsed too, so monitored items collect at the top of the item list without blank slots. It does not remove/reorder DOM nodes or change native filters. Unsupported layouts are left alone rather than guessing which containers to hide.

## Snatch and Run (opt-in DEV)

On a foreign page, add the item to monitor, choose it in Snatch and Run and answer whether you are hospitalized. Arming verifies the player, country and status with Torn's read-only API. Hospital users load medical inventory with the active verified Limited Access login key and select an item. Torn may cache inventory for 15 minutes; native availability must still be confirmed. Public Only keys cannot load the inventory picker.

Press **Arm Snatch and Run** to minimize the main window and show a single red **Snatch and Run** button. A red-button click does nothing. The selected item's stock alarm turns it green. The same button presents these actions:

The native adapter uses foreign-page DOM captured on PC Tampermonkey and Android Torn PDA. Each trusted click handles exactly one requested gameplay stage, including its matching native confirmation:

1. **Heal from Hospital** finds the selected medical item by its exact inventory-slot label (including blood type), expands the slot, selects **Use**, verifies the named item in its own question and selects **Yes**. It waits for **You are out of the hospital!** before offering Purchase Max. It does not purchase automatically. If the medical item does not release the user, it never consumes another item automatically. Non-hospitalized users skip healing.
2. **Purchase Max** uses the monitored numeric item ID and exact native row name. On PC it uses the inline maximum icon and text quantity field. On the compact PDA layout it first opens the item-specific buy icon, verifies the expanded quantity panel names that item, and uses only its visible Max and quantity controls before selecting Buy. Hidden desktop quantity fields are ignored. Both layouts wait for the matching item/quantity confirmation panel before selecting **Yes**. It waits for the selected-item inventory count to increase by the confirmed amount before offering Return to Torn. No automatic return follows.
3. **Return to Torn** opens **Travel home**, verifies Torn in the return question, selects **Travel Back**, waits for the airstrip/pilot booking message and selects the enabled **Continue** button. Disabled countdown controls are respected. It does not book a second flight or repeat a submission.

The single button stays red/inactive until stock conditions are met. Arming minimizes the main window, and alarms preserve minimization. There are no native-control selection buttons or separate status panel. Exact item type/quantity/destination mismatches, ambiguous confirmations, missing controls, stale stock, changed player/country, loss of focus and cancellation block further clicks. Cancel is available by restoring the main setup; Exit cancels as well. Stock is rechecked before medical confirmation, and native hospitalization state is checked before buying.

The shared adapter enables for Tampermonkey or a detected Torn PDA bridge/user agent and selects inline versus compact controls from the native layout. It prefers the native maximum icon; a visible MAX button scoped to that same quantity panel is a supported fallback. Existing unrelated confirmations, wrong item/quantity panels, missing controls and ambiguity block submission. It never confirms another item's dialog.

During a native action, a bounded DOM observer waits for the next control/result; it disconnects on success, failure or cancellation. There is no additional observer/polling when idle. Native result evidence advances successful native stages without waiting for cached API status. If a heal/return submission was accepted but its result was not established, existing bounded status refreshes may help recover; submissions never retry automatically. Unknown intermediate outcomes remain pending for manual resolution rather than risking duplicate item use/purchase.

A same-tab armed intent survives navigation and waiting without a fixed timer. Cancel, explicit tool exit or a verified player change ends it. Controls are matched again on the new page. No action resumes automatically. Stock must remain fresh; unknown layouts, stale stock, missing controls, unfocused pages and unverified results block progress. Setup stores no action URLs, DOM bindings, keys or tokens.

## Validation boundary

Automated fixtures include sanitized structural excerpts from the 2026-11-07 desktop recording: inventory slot/popover and medical Yes/No, native maximum/text-input/Buy controls, item-specific purchase confirmation, and Travel home/Back/Continue. Tests exercise the exported adapter and complete generated bundle with synthetic host/API responses, plus wrong blood type, quantity/destination mismatch, unrelated Yes, re-hospitalization, duplicate clicks and cancellation. PDA excerpts additionally cover Morphine, the compact Dahlia quantity/confirmation panels and native MAX controls. PDA tests verify one consumed medical item, 17 acquired Dahlia plus a remaining Morphine, hidden-field isolation, scoped MAX fallback, and the complete generated bundle using a mocked official PDA HTTP bridge. Only the necessary item/control excerpts are committed; the user's video, full export and profile/sidebar details are not.

These tests do not perform real gameplay or establish live desktop/PDA reliability. Both host-specific implementations still require actual live acceptance before production; production and Workers are unchanged. The PDA evidence proves the manual native structure, not successful live Snatch and Run execution. No further diagnostic interruptions are needed between healing, buying and returning: start continuous monitoring beforehand, execute the whole sequence and stop/export only once safely flying.

Architecture references reviewed: Torn's public GET-only API schema at https://www.torn.com/swagger/openapi.json and script rules at https://www.torn.com/rules.php. Keep gameplay actions directly initiated by the user on the actively viewed page; never add hidden-page extraction, chaining distinct gameplay stages without a new user click or bypassing CAPTCHAs.

## Name-based watches and the no-hospital path (0.5.42.49-dev)

Existing foreign watches saved as `name:...` remain usable. Purchase Max resolves one exact native item name against its current numeric form ID and matching Buy-panel control. An explicit numeric ID is never replaced with a different item; duplicate exact-name rows, mismatched identifiers and partial-name matches block rather than guessing. New page selections retain the ID from `item-N-form` or `item-N-buyPanel` even when no `data-item-id` attribute exists. No watch recreation is required.

When Hospital is No, no medical item or medical inventory request is needed. Both PC and PDA generated-bundle tests cover this route with Public Only keys, legacy name watches and no medical selection. The desktop Jaguar Plushie report established the previous numeric-key-only failure.

## PDA launcher startup diagnostics

The full bundle now waits for BODY before starting the Manager and registering lazy tools together. This covers PDA injection before normal document-idle timing. A startup status marker records waiting-for-body, starting, ready or failed and sanitized error information. No polling or persistent DOM observer is added. Saved launcher positions reserve the icon's 34px size even if layout measurements report zero, preventing placement beyond the screen boundary.

TU Test 0.2.13 adds `startup` to its normal export: startup phase/build/error, whether the Manager API exists, launcher presence, hidden/display/visibility state and measured rectangle. If the icon remains missing, export TU Test immediately without running gameplay. A not-observed startup marker cannot distinguish script injection being disabled from a parse failure before bootstrap; the PDA script entry still needs to be enabled/current. The subsequent PDA export showed no startup marker, Manager API or launcher. The quote-normalization parser failure described below provides a reproducible explanation; actual device verification is still required.

## Return-panel readiness and movable action button (0.5.42.49-dev)

An empty or collapsed `travel-home-panel` is not a valid return confirmation. The action expands Travel home once when its link is collapsed, waits for a visible Torn destination question and enabled Travel Back control, and follows the current panel if Torn replaces it during rendering. An already-expanded but still-loading panel is allowed to finish without toggling closed. Automatic countdown navigation to the flight screen counts as completion without an extra Continue click. Mismatched destinations still block.

Drag the single action button with mouse or touch in red or green state. Its position is saved separately and clamped to the viewport on restore/resize. Red remains inactive for gameplay using aria-disabled and an action guard while accepting drag gestures. Releasing a drag cannot submit Heal, Purchase or Return; a short suppression window absorbs the compatibility click following the drag. A later deliberate click performs the enabled stage.

## Fresh purchase capacity (0.5.42.49-dev)

Purchase Max now reads the current total travel capacity and occupied native inventory slots, cash on hand, the selected item's price and current stock. The verified quantity is the smallest of free slots, affordable items and available stock. The exact medical slot consumed by this run is excluded while a stale result tile remains, and its result popover is closed before the check. A remaining carried item still occupies its slot.

If Torn's Max gives 17 after the last medical item was consumed but current capacity/cash/stock allow 18, the script updates the native quantity field to 18 through input/change events, verifies that quantity on the matching confirmation and selects Yes once. It does not submit a second purchase to fill a gap. Capacity/funds changes before confirmation block submission. Unknown/incomplete layouts retain the native-Max fallback; an unverified affordability increase after healing is blocked rather than guessed.

The `capacity-check` function event records verified state, total/occupied/free slots, native Max, chosen quantity and whether space, stock or funds limited it. Wallet balance is not included in this event. Tests cover stale Max, retained/cleared medical tiles, another carried item, limited funds, low stock and no-hospital purchases. These are fixture results; the other user's healed live flow still needs confirmation.

## PDA loader syntax compatibility (0.5.42.49-dev)

The official Torn PDA `UserscriptsProvider.adaptSource` wraps each script in a storage-bound closure, then globally changes curly single/double quotes to ASCII before evaluation. TU had a curly apostrophe inside a single-quoted error message. That transformation produced a syntax error in the entire generated script before any bootstrap marker could be written. This explains why an up-to-date script could show no startup phase, Manager API or icon while the independent diagnostic still ran.

The message now uses compatible text. Both build scripts parse the PDA-normalized output in addition to the original. A regression test reproduces the failure using the immutable 0.5.42.47 artifact, then evaluates the corrected bundle under the official wrapper/normalization, with the PDA bridge and both existing/pre-BODY documents. The corrected test reaches ready, creates a visible launcher and registers all ten tools. Original timing/position safeguards remain, but were not a remedy for this parser failure.

Reference: Manuito83/torn-pda, `lib/providers/userscripts_provider.dart`, `adaptSource` (reviewed 2026-11-07). No user video/report or credentials are included in the regression test. Production remains unchanged.

## Catalog labels and minimized tool resume (0.5.42.49-dev)

Foreign Complete List dropdown options and group headings display the country name only, e.g. Canada. Canonical location values remain internal so existing country filters and Foreign monitor selection stay compatible. The Torn / Item Market / Bazaar option and its complete catalog remain available.

Opening the already-active Travel Assistant and Item Monitor card now invokes a resume hook and unhides its existing main window. It does not deactivate/restart the module, rerender forms, discard unsaved fields or cancel an armed Snatch and Run session. The TU icon continues restoring the most recently minimized main/planner window. Tests cover repeated card reopening, launcher/planner restore, no duplicate windows, country filtering and armed-flow preservation.

## PDA pending-action taps (0.5.42.50-dev)

The supplied .49 PDA report shows two pre-submit Heal timeouts following repeated waiting-button taps and collapsed medical popovers, then a successful Heal, 18-item purchase and return flight. TU now stops its button touch/pointer/mouse/click events from bubbling into native outside-tap handlers. Capture-phase diagnostics still record clicks. Pending labels identify healing, purchasing and return booking; repeated taps never queue the next stage or retry native submission.

A fixture reproduces document outside-tap dismissal while the medical Yes question is delayed. Verify one Use/Yes, no dismissal and no purchase until a separate click. Existing desktop/PDA buy, confirmation, capacity and flight fixtures remain required. This is simulated regression coverage; a live PDA recording is still needed to confirm device behavior.

## Refresh persistence and purchase latency (0.5.42.51-dev)

The same tab resumes its previously active monitor after authorization and player identity restoration, with its panel minimized. Explicit Exit or switching tools clears the resume intent. Saved watch identities, selected item, quantity/price drafts, filter/alarm configuration and Snatch and Run setup remain stored. Restoring preferences does not newly arm Snatch and Run or submit gameplay; an existing armed run retains its original expiry and still requires user clicks.

The .50 PDA report confirms Heal in 1.196 seconds and flight booking in 0.539 seconds. Purchase had native success at 05:56:53.596 but TU remained busy until the inventory-only wait timed out at 05:56:56.925. The adapter now also accepts a fresh matching native purchase proof. Cash parsing searches the foreign travel information banner outside travel-root, avoiding freed-slot rejection when mobile sidebar cash is absent. Native Max and input synchronization retain bounded 32 ms yields; no API call is added to stage actions. Torn rendering/network responses and passive diagnostic recording still contribute to wall-clock time; this report does not separate their costs.

## Purchase quantity readiness (0.5.42.53-dev)

A PC .52 report shows a four-second pre-submit timeout after verified capacity 18 and stale native Max 17. The second attempt succeeded. Input values are intentionally absent from the DOM snippets, so the report alone does not establish whether Torn replaced the input or reset its value. The adapter now reacquires the current item row/input during readiness checks and prepares replacement inputs once, rechecking live capacity first. A regression replaces the input during preparation and confirms one 18-item purchase. Quantity preparation/readiness events expose the next observed value and reason without raw input dumps. This hardens form replacement; live confirmation is still required for the reported pause.

## Outbound arming, persistence and filtering (0.5.42.54-dev)

Arm while Traveling to a recognized foreign destination. The action remains red until the destination page is visible, identity matches and fresh stock is observed. A return-to-Torn flight cannot be armed as an outbound trip. Completion hides the floating button. The old 15-minute intent expiry is removed; fresh-stock and per-action timeout protections remain. An unloaded player identity cannot cancel intent; a verified different player does cancel it. Refresh never replays a submitted native action automatically.

Watch matching uses stable item ID or exact item name, without a country restriction. Scanner evaluation no longer restricts a saved watch to its original shop category. Quantity and price thresholds apply where those values are available; a quantity-only watch does not create a price target. An active filter hides absent/unmonitored items and explicitly explains when no watched items are listed here.

## Screen color alert and Inventory Destruction (0.5.42.56-dev)

The optional screen color alert checkbox is directly below Show monitored items only. While Snatch and Run is armed it draws a click-through 10 px red viewport border. Available monitored stock turns the border green with a 400 ms flashing cycle; it persists through the sequence and disappears on completion/cancel/exit or when disabled. It adds no polling or screen interception.

Inventory Destruction defaults OFF. Enabling it shows a large red modal with the requested exact warning and explicit Accept/Decline. Decline or Escape keeps it off; changing the option during an armed run cancels that intent and requires rearming. Acceptance is saved with setup and copied into each armed intent. This option covers the foreign travel inventory slots only, never the inventory stored back in Torn. Its action order is Heal if hospitalized → Destroy Travel Inventory → Purchase Max → Return to Torn. Each stage requires a fresh click, and repeated pending clicks never queue another stage.

One Destroy Travel Inventory click processes the initially visible foreign slot items sequentially through native Trash and matching Yes confirmations. It checks current player/country/focus, hospital release, stock, unchanged inventory counts and exact item name, then requires removal evidence before selecting another item. It does not buy or fly in that click. Partial failure/cancellation stops the batch; submitted work is not retried or replayed after refresh. Unsupported confirmation/result layouts stop safely and require live diagnostic evidence. Synthetic fixtures cover these controls; live PC/PDA Trash confirmation remains unverified.

## Hospitalization planning and selected destruction (0.5.42.57-dev)

Planning to Hospitalize? replaces the previous status question. Yes exposes healing and hospitalization item selections. Load inventory uses verified Limited Access reads; carried items are preferred when the foreign inventory is visible. Items must actually be carried when used. While out of hospital with unavailable monitored stock, Hospitalize Me is an explicit actionable step. It opens the selected native item, verifies Use/Yes and waits for observed hospital evidence. There is no automatic use, replay or retry. Torn must confirm hospitalization; items with unsupported confirmation flows or no observable hospitalization stop rather than advancing. Actual supported item effects still need a live recording.

If stock is present before hospitalization, the step is skipped: the button offers Heal only if actually hospitalized, otherwise selected destruction or Purchase Max. If stock arrives between opening the hospitalization item and confirming Use, its verified No control cancels the attempt. After confirmed hospitalization, the button waits for stock before Heal. Planning is allowed outbound but the use step remains blocked until the foreign page, identity and stock state are verified.

Inventory Destruction now requires an explicit checkbox selection of item types in its red confirmation dialog. Only matching selected types carried abroad are destroyed; all unselected items remain. The selected types are listed in setup. Legacy all-item consent is invalidated and old broad armed intents are canceled instead of being reinterpreted. A Limited Access inventory read populates the selectors; all actions remain through native controls. Existing explicit consent, per-stage clicks, confirmation matching and partial-failure guards remain.
