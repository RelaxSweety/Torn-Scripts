# DEV Direct Item Tools section removal — 0.5.42.96-dev

TU 0.5.42.96-dev / Item Monitor 1.12.46-dev completes the queued cleanup. The Direct Item Tools section heading, explanatory paragraph and standalone launch button are removed from the Travel Assistant and Item Monitor menu.

The change removes the menu injection in `all-in-one/scripts/integrate-direct-items.mjs`; integrated item use, destruction, purchasing, notifications, slot badges, end-of-sequence refresh and native clock synchronization remain intact. Normal Item Monitor diagnostic activation, recording, export and deactivation remain available. Internal handler code is retained; this is not removal of integrated functionality.

Validation: DEV build, primary full-bundle menu/diagnostic lifecycle, 179 integration checks, direct purchase and slot badges, terminal refresh and selected-item handler regression checks. Chromium checks the rendered menu on desktop, portrait and landscape and confirms normal diagnostic controls are reachable. Screenshots: `evidence/remove-direct-tools-96/`. All browser authorization/network responses are fixtures; no real gameplay or tester-data changes.

Recovery: .95 commit `fa8282bfae69c7d38bc37fe60207cb8cc3d778d5` and archived .95 installer. Separate production main remains `73c42788968612913ccfee20b1d5c194324dc8fd`. Worker, databases, agreement and other server/storage are unchanged.
