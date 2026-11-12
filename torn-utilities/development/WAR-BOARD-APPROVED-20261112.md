# Approved compact dual-faction board — DEV .111

TU **0.5.42.111-dev**, War Organizer **0.3.25-dev**, Item Monitor unchanged at **1.12.53-dev**.

The user approved the final v6 screenshot after reviewing compact faction summaries, row ordering and Reserve dimensions. The approved temporary previews remain under `/workspace/scratch/war-layout-preview`; this release implements the design in the actual module, rather than applying the preview DOM patch.

## Player board and navigation

- Both faction summaries are buttons. Selecting either switches the player roster and highlights the active faction. Online, Okay, Hosp, Trvl and **Rev** totals are computed from each full unfiltered roster. Rev stays on the same line as Okay/Hosp/Trvl.
- Own-faction and opposing rosters are stored separately. A failed own-faction read retains only its own cached rows with stale-data feedback and unavailable totals, never substitutes opposing players. Own-faction viewing works without an opposing faction selected. Own rows use profile links and Details; no attack link or Reserve action is provided, including when the chosen opposing ID equals the viewer's faction ID.
- The approved row order is name + level + health; health bar; status/travel/ETA/revive information, with **BS/FF in a fixed column directly left of Reserve** beneath the bar. Reserve is **90.9px wide** (10% narrower than the approved 101px reference) and **27px high**, per the user's explicit compact-control request. This supersedes the previous 44px Reserve minimum. Long status data can wrap without moving the metrics into the action column.
- Faction controls, Players/Reservations/Settings navigation, 31px-high search, sort and filters remain above an independently scrolling player list. A compact landscape arrangement uses the available width. API/source and FFScouter information sit below the list, with longer data-source/flight explanations in expandable notes. The footer shows premium status and a count of the currently listed return ETAs.

## Travel and revive data

Torn faction-member `status.description` is retained and rendered as destinations/direction: **Traveling → Japan**, **Returning → Torn**, **Abroad → Mexico**, or Unknown when the API does not provide a recognized destination. These labels do not require FFScouter Premium. Recognized return information from the viewer's private provider result may identify a return when Torn's description is absent. A known Torn outbound description suppresses a stale provider return ETA.

Per-player **Revivable: Yes/No** uses the strict boolean `is_revivable` from Torn's faction-member response, for either faction. Missing or invalid values are **Unknown**, never inferred as No. Summary Rev is the count of confirmed true values; all unknown displays `Rev —`, and partial availability displays `Rev N+` with explanatory notes. The private `revive_setting` preference is not used or claimed for opponents. Public schema reference: Torn PDA's bundled Torn API v2 schema at official client commit `28fdc2b8a0ea6e39758ceba8483d4cf4367c4067`, `FactionMember.is_revivable` and `/faction/{id}/members`.

The existing player health workflow is scoped to the selected roster and viewer. Own-faction rows are held in module memory; saved opposing target records retain only existing native API/player fields plus travel description and revive availability. No FF estimate, premium flag, provider flight timestamp or availability reason is added to saved rosters, exports, faction storage or backend calls. Provider consent, selected-key isolation, no automatic registration and no premium redistribution remain unchanged.

## Refresh and scroll corrections

The player list DOM node remains stable across renders. Before a background update, the module records the first visible player's ID and its pixel offset, then restores that anchor synchronously after rebuilding rows. Inserting rows or changing FF sort values above the viewport does not jump to the top. Each faction keeps a separate in-session scroll position. Explicit search/filter/sort changes start at the top of the new result set. Minimize/restore preserves the current player position, window and actual Settings draft.

Background roster updates no longer rebuild Settings forms. Asynchronous faction-directory completion updates only the picker, preventing a previously typed key or reservation draft from disappearing before its action is clicked. Resume uses the existing DOM, with credential state refreshed through the Manager instead of rebuilding the window.

## Validation and remaining limits

Build, full npm regression suite, and final focused War/compact/PDA/travel checks passed. The explicit payload budget is 1,040,000 bytes for the new roster/scroll/layout logic.

`scripts/validate-war-board.py` runs the generated bundle in Chromium at desktop 1280×900, mobile portrait 390×844 and landscape 844×390 with **80 own and 80 opposing synthetic members**. It verifies:

- native destination/return/abroad labels; revive Yes/No/Unknown and exact partial totals;
- fixed summary/control/footer positions while scrolling; search/Reserve dimensions and single-line Rev totals;
- repeated refreshes, insertion above the viewport, FF-sorted refreshes, stable list identity and preserved player anchor;
- independent faction positions and profile-only own-faction controls;
- minimize/restore position and the actual in-DOM Settings draft;
- failed own-faction reads retaining own rows, no attacks/reservations, stale feedback and unavailable totals;
- selected-key premium ETA, suppression for known outbound targets, and no persisted/shared provider fields.

The existing full-bundle FFScouter fixture also passes with the new Players label and approved Reserve dimensions. Screenshots/logs are in [war-board-111](evidence/war-board-111/) and [war-scouter-111](evidence/war-scouter-111/). All identities, credentials, rosters and FFScouter results in these tests are synthetic. No user credentials or real tester data were used. Live registered premium-flight completeness and real PDA/device acceptance remain unverified.

Only DEV branches `dev/tu-all-in-one` and `release/approved-changes-20261110` are publication targets. Production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`. Archived .110 and earlier installers/evidence, Workers, databases, agreements, Item Monitor DEV tools, removed green purchase checkmarks, purchase notifications/no-reload policy and faster healing workflow remain unchanged.
