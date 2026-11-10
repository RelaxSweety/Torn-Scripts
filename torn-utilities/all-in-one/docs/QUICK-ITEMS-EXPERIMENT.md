# TU Direct Quick Items and travel-request test build

Version: **0.5.42.81-quickitems-test.4**, based on **0.5.42.81-dev**. This has a separate userscript name, namespace and update URL. It does not replace the ordinary DEV artifact or represent a completed compliance clearance.

Install: https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/experimental/torn-utilities-quick-items-test.user.js

## Install and record one normal trip

1. Disable the ordinary TU and any older TU Manager/tool installations before enabling this experiment. Do not run both versions together. Refresh Torn and confirm the footer shows `0.5.42.81-quickitems-test.2`.
2. On Torn's Travel Agency page, open Business Tools → Travel Assistant and Item Monitor → **Open Item Monitor**. This starts the existing diagnostic monitors and the experimental travel network recorder. The diagnostic indicator must be green. Configure this experiment's monitors/settings as needed: its Item Monitor settings and armed run are separate from normal DEV.
3. Minimize TU and make the normal outbound trip. Perform the planned inventory use, healing, purchase and return actions. Using Torn's native controls manually is useful for identifying the exact native request contracts. Existing Snatch and Run actions can also be observed; the timeline distinguishes actual user clicks from synthetic native clicks.
4. Keep the same browser tab/PDA WebView. Recording resumes after same-tab navigation/refresh while the module/diagnostics are active. Closing the tool stops recording; minimize and Back keep it running.
5. After the trip, restore Item Monitor. Use **Monitoring Deactivation**, then **Report Generation**. There is still one report-generation control. The new data is under `quickItemExperiment.travelRequestCapture`; the stock timeline, action diagnostics and native page fragments remain in the report.

The new recorder includes request method, pathname, sanitized query/body fields, numeric item/slot identifiers, response shape/status/signals, timing, native control actions, user/synthetic click correlation and navigation markers. It wraps the real page's fetch/XHR for observation and restores them on Stop. It never initiates or replays a captured request. A user action can have several associated requests; the report does not equate all requests with separate gameplay transactions.

Cookies, headers, security-token values, API keys, raw responses and chat traffic are not recorded by the network recorder. Unknown request values are marked `[omitted]`. Nested request objects are summarized with bounded safe fields. The experimental export omits broad DOM-change/click fragments from the base recorder to reduce the known chat-exclusion risk, while retaining structured function events and native travel fragments. Inspect diagnostic exports before sharing.

Limits: 300 requests and 300 action/navigation records, with discarded-entry counters. Session writes are deferred and flushed on navigation/Stop. `persistenceState: failed` means memory evidence is available but refresh retention could not be written. The report's `hooks` indicate fetch/XHR hook installation; live PDA/PC capture must still be confirmed with a representative request.

This does not literally record every possible endpoint: top-level document loads are represented by navigation markers, not intercepted network responses. WebSocket, service-worker, native-bridge traffic and unrecognized routes may not appear. API/TU service calls and unrelated/private routes are excluded. Capturing a request identifies a candidate contract; it is not permission to replay it or proof that a different inventory can use it safely.

## Personal Quick Item direct-POST pilot

The same test version adds **Open Direct Quick Items Test** to the Travel/Item Monitor menu. On Torn's **personal Items page**, open the Medical list in Torn, then use **Refresh item list** in the test panel. Only visible native medical entries with known positive quantities and numeric item IDs are offered. Read the personal-inventory warning, check consent, select one item, and deliberately press **Use selected item (POST)**.

This uses the user-supplied Quick Items protocol (`item.php`, `step=useItem`, `itemID`, `item`) with the logged-in Torn session and local RFC token. It makes no simulated Use/Yes clicks, no automatic follow-up actions, and no automatic retry. The in-flight guard rejects duplicate clicks. The result is displayed as plain text rather than executable HTML. Additional choices must be made in Torn.

An uncertain timeout/network result remains locked across refresh. Verify Torn's actual inventory/result before using the explicit review control to clear the attempt. Closing the panel or aborting a request cannot establish that Torn did not execute it. Receipt of a JSON response is not automatically proof of consumption. Logs include timing/result categories, never RFC/session credentials or raw request/response bodies.

**Personal/faction Quick Items is not proven to use the same inventory as foreign travel.** For that reason this experiment blocks personal direct use on travel/foreign pages. Snatch and Run's heal/hospitalize/purchase/destruction/return transport remains unchanged in this first test build. Its existing automation concerns are not resolved merely by installing this experiment. The travel recorder supplies the missing endpoint evidence for a later, separately validated adapter.

The experiment shares existing TU login credentials/agreement/session and other tools' data, but isolates Item Monitor configuration, monitored items, armed run, diagnostic logs, stock-reporting preference/queue and landing notification state. Stop the experiment and re-enable ordinary DEV to return to the previous configuration. No Worker or production deployment is part of this test build.

## Development checks

- `npm run build:quick-items-test`
- `npm run test:quick-items-test`
- `node scripts/build-quick-items-experiment.mjs --check`
- `node scripts/build-dev.mjs --check` confirms ordinary DEV has not changed.

Validation uses fixtures and mocked requests. No live item was consumed, purchased or destroyed during development tests.

## Test .2 recorder revision

The first PDA report from test .1 contained a native DOM result showing a Blood Bag was added, but zero intercepted requests and zero native actions. Hooks being marked installed did not establish live coverage. Test .2 installs passive page-world hooks at document-start, before normal module activation, to cover transport functions cached by Torn. Recording remains off until diagnostics start. It observes pointerdown and click, deduplicates the physical gesture, and accepts native inventory picker controls without exporting their text.

The export now includes `instrumentedAt`, `documentState`, `documentMatchesPage`, transport/control counters and `resourceEndpoints` from a metadata-only PerformanceObserver. Resource entries can reveal a route/timing when a cached or alternative request path bypasses the full hook, but cannot supply its POST body. They are not a substitute for full capture. Live PDA coverage is still to be verified.

After updating, first record a short Travel Agency search/Add operation and generate a report. Check that native actions, requests or resource endpoints appear before relying on an entire-trip recording. This revision does not claim that the cause of the first report's blind spot is conclusively proven.

## Test .3 recorder revision

The test .2 PDA report confirmed live interception and identified `sid=travelData`, including `addSlotItem`, `inventory` and `searchItem`. Test .3 recognizes travelData without depending on a recent click. It decodes multipart field names with the same strict value exclusions. Multiple interceptor layers returning the same response object are coalesced and counted separately; different actual responses remain separate even for identical requests. This avoids treating duplicate observations as duplicate gameplay submissions. Normal DEV remains unchanged.

## Test .4 body-capture revision

The test .3 report captured packing Clear All, Add and inventory/search requests, but the Add body was missing. The recorder previously attempted Request.formData() and then cloned the original request again on failure; by that point the native fetch could have consumed it. Test .4 takes one text clone before pass-through and uses the bounded JSON/form/multipart parsers. Late body parsing is redirected to the retained observation when interceptor layers merge. Body capture state and alternative safe field shapes are explicit rather than treating every empty array as a genuinely empty request. XHR duplicate observations are associated with an open/send transaction rather than conflating separate uses of the same XHR object. No request is replayed or changed.

## Test .5: travel inventory evidence

Open Direct Quick Items Test and select **Inspect current travel inventory (GET only)** before and after using a travel item through Torn normally. Keep diagnostics active, then use Item Monitor → Report Generation. The capture includes bounded inventory field structure, explicit slot/item identity candidates, native inventory labels and typed success/itemRemoved/useAnother flags. Generic IDs and array positions are not interpreted as slot identities. Duplicate identities remain unresolved.

Consumption and hospital release are reported separately. A removal flag requires inventory verification; an explicit release message requires current status verification. These are evidence labels, not authorization to advance Snatch and Run. Direct foreign item use remains disabled pending a live report establishing the schema and response semantics. No direct purchase, destruction or travel requests were added. Ordinary DEV remains unchanged.

## Test .6: uppercase travel slot identities

Captures the observed `slots[].ID` separately from `slots[].item.ID`, with item names and identity-source annotation. Array position and armouryID are never substituted for slot/item identity. Nested IDs survive same-tab diagnostic restoration. Duplicate slot IDs remain unresolved, and direct foreign use stays disabled. Inspect with medical items present before and after normal Torn use, then export Report Generation to compare the request slotID with fresh inventory identities and consumption/release flags.

## Test .7: direct travel blood bag pilot

Open Direct Quick Items Test, inspect current travel inventory, select one A+ or AB+ blood bag, check the travel-item consent box, and click **Use selected travel blood bag (POST)**. Confirm the item use; the confirmation explicitly mentions use before landing when flight progress is present. Only these two traced item types are enabled.

Each click fetches complete live inventory, matches the selected slot ID, item ID and name, then sends one `travelData/useItem` JSON POST with the current slotID. It checks the fresh inventory after the response. Slot IDs are reusable containers; a changed occupant blocks the request. No actionForm request, automatic retry, second item, purchase, destruction or travel is triggered. Uncertain outcomes retain a same-tab reload lock until the user checks Torn and clears it. Partial healing never advances a workflow; explicit release messages remain labeled as requiring a current status check.

Export Report Generation after testing. The report includes travel consumption/release evidence and passive request captures. Ordinary DEV and the existing Snatch and Run action path remain unchanged.

## Test .8: experimental Snatch and Run integration

Hospitalize Me, + Hosp?, and Heal now use the direct travel blood bag adapter in the experimental bundle. Configure and arm Snatch and Run normally; no separate pilot inspection is needed. Only the validated A+ (732) and AB+ (736) bags are supported; another selected item blocks rather than falling back to simulated use clicks. Existing before-landing confirmation is retained. Each original trusted click performs a fresh slot-to-item check, one use POST, removal verification, and a separate profile status read.

Hospital state must confirm hospitalization, extension must increase the deadline, and healing advances only when profile state is Abroad. A partial heal remains Heal. Unknown status blocks progression; existing read-only status reconciliation can recover a confirmed consumption after a transient status read failure. An uncertain use itself remains locked for manual review and is never resolved solely by hospital status. Capacity is credited once per confirmed consumption. Diagnostic reports include direct-item steps and profile state evidence. Buying, destruction, and return use their existing native transport. Ordinary DEV is unchanged.

Test hospitalization during flight and abroad, + Hosp? with a remaining bag, partial and complete healing, then the existing purchase/return sequence. Export Report Generation after each run.

## Test .9: visible arming feedback

The reported .8 attempt was made before departure at Torn Travel Agency. Existing arming requires a confirmed outbound flight or foreign location. Setup can be completed at the agency, but depart first and then Arm. Arming failures now appear in a prominent live alert beside the Arm button and scroll into view. The button is disabled while its context lookup runs and restored afterward. No arming eligibility or gameplay action was added.

## Test .10: active-button execution without popups

The active Snatch button executes the selected action without a before-landing confirmation popup. Direct A+/AB+ use remains one click per bag with fresh inventory and hospital-status checks. The separate direct pilot likewise uses its consent checkbox and active button without an additional popup.

Native purchase, destruction and return flows pause before every additional Torn control click. The Snatch button displays the next action (for example Confirm purchase, Destroy selected item, Book return flight, or Continue to return flight); each fresh trusted click performs that step. Reconciliation purchases and every additional destroyed item also require subsequent clicks. Pending hydration/result checks temporarily block additional clicks. Canceling stops suspended chains; synthetic clicks cannot resume them. Existing destruction setup acceptance remains required. Ordinary DEV remains unchanged.

## Test .11: restored-run capacity preflight

After refresh/navigation the saved capacity ledger is intentionally invalidated. The direct adapter now rebuilds it from current visible travel inventory before testing eligibility, matching the native adapter order. If rebuilding cannot verify capacity, the action remains blocked with a specific explanation. Reports record the rebuild reason and verification result. A current player/run guard and unresolved-attempt lock are checked first. This fixes the .10 case where Hospitalize Me appeared ready but rejected a restored run until rearming.

## Test .12: resolve known hospitalization outcomes

The .10 report confirmed AB+ consumption followed by profile state Abroad. That known status previously left the workflow on Confirming hospitalization. A consumed item followed by Abroad now automatically resolves to Waiting for available stock with an explanation that hospitalization was not confirmed; it never uses another bag automatically. Existing read-only reconciliation also resolves this case. A Hospital result with an unchanged extension deadline reports that no extension is confirmed while continuing to monitor the existing hospitalization. Later profile reads update known consumed-item status. Unknown responses and uncertain consumption remain blocked. Includes the .11 restored-capacity fix.

## Test .13: fresh heal release evidence and purchase wording

The .12 report showed an explicit live hospital-release response and confirmed bag removal, followed by a conflicting Hospital profile result. Explicit release plus verified consumption now advances healing automatically without waiting for a profile read. Partial heals still require status verification. A contradictory Hospital profile result during the next 30 seconds is recorded as a conflict rather than overwriting the fresh release evidence; later status changes are still accepted. Old hospital deadlines are cleared after confirmed release.

Review purchase is renamed Buy selected quantity. This step clicks Torn's actual BUY button in the quantity panel; Confirm purchase then clicks Torn's Yes control. Neither is an informational acknowledgement. Inventory checks, result parsing and status messages require no user click.
