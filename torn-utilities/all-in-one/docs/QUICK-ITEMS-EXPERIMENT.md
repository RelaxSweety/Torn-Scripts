# TU Direct Quick Items and travel-request test build

Version: **0.5.42.81-quickitems-test.1**, based on **0.5.42.81-dev**. This has a separate userscript name, namespace and update URL. It does not replace the ordinary DEV artifact or represent a completed compliance clearance.

Install: https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/releases/experimental/torn-utilities-quick-items-test.user.js

## Install and record one normal trip

1. Disable the ordinary TU and any older TU Manager/tool installations before enabling this experiment. Do not run both versions together. Refresh Torn and confirm the footer shows `0.5.42.81-quickitems-test.1`.
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
