# Premium ETA availability correction — DEV .110

TU **0.5.42.110-dev**, War Organizer **0.3.24-dev**, Item Monitor unchanged at **1.12.53-dev**.

The user's .109 screenshot showed successful battle estimates/FF and Traveling players without an ETA. The user reported the old flight status "Personal premium return-flight ETA · estimated arrival window." That status is reached after a successful premium flight read; it establishes the premium gate succeeded, but does not establish usable return-arrival data for any particular target.

## Corrections

The .109 parser unnecessarily required a positive takeoff timestamp and both arrival bounds. FFScouter's public OpenAPI defines FlightLeg values, including takeoff and arrival bounds, as nullable. The official Torn PDA client at `28fdc2b8a0ea6e39758ceba8483d4cf4367c4067`, `lib/models/chaining/ffscouter/ffscouter_flights_model.dart`, can use one available bound and does not require takeoff time for its estimate. The public FFScouter War Room client at https://ffscouter.com/war-room also reads arrival bounds independently of takeoff time and normalizes status whitespace.

Valid return arrival estimates now accept null/omitted takeoff time. A provided takeoff time is still checked for consistency. A single available positive arrival bound produces **ETA ~MM:SS**, explicitly approximate; two bounds retain **ETA MM:SS–MM:SS**. Missing/expired/inverted/implausible times remain unavailable. Provider status descriptions are normalized for repeated whitespace before return/outbound detection.

The generic premium-success status is replaced with counts for available return ETAs, outbound trips, no current flight, omitted players, unknown direction, missing arrival times, expired and invalid times. Expanding a traveling player shows a corresponding fixed explanation. No provider body/status text, raw key, response URL or account metadata is exposed. These diagnostic categories remain private memory state and never enter saved rosters or shared storage.

The reported screenshot/status cannot determine whether its individual players were outbound, had missing provider fields, or triggered the stricter parser. This release corrects the demonstrated parser restrictions and makes those outcomes distinguishable. It does not claim authenticated estimates were reproduced using the user's key.

## TU update check

Fixed the independently reproduced TU update-check comparison bug: .106, .108 and .109 were all equal under a loop limited to the first three numeric components. Comparison now includes all numeric components, numeric prerelease ordering and stable/prerelease distinctions; invalid metadata fails explicitly. TU's check remains informational, with installation handled by PDA/Tampermonkey. Correct generic update/download URLs remain unchanged. A PDA installation whose stored source is an old commit-pinned URL still requires changing that source to the moving DEV URL; TU cannot alter the host app's saved installation URL.

## Validation

Build and full npm regression suite. Expanded flight service tests cover nullable/omitted takeoff, single-bound approximations, status whitespace normalization and availability reasons, in addition to existing premium gating, own-key isolation, caching, stale responses, failures and expiry. Added update-version tests cover .106→.109, .109→.110, .99→.100, stable/prerelease and invalid metadata.

Full generated-bundle Chromium tests at desktop, mobile portrait and landscape use a **null takeoff timestamp** in the synthetic provider payload and confirm ETA remains visible. They additionally return premium success with `current: null`, verify that the aggregate line reports "no current flight", and verify the expanded player's explanation. All credentials, identities, rosters and FFScouter responses are synthetic. Screenshots and logs are under [war-scouter-110](evidence/war-scouter-110/).

No real credentials or target data were used for API requests. Actual authenticated flight availability, other live response variants and real PDA/GM behavior still need user-side acceptance. Own-key premium access and opt-in remain mandatory; no premium redistribution or automatic registration is added.

DEV publication only: `dev/tu-all-in-one` and `release/approved-changes-20261110`. Production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`. Earlier archived installers/evidence, Workers, databases, agreements, purchase/healing behavior and navigation remain unchanged.
