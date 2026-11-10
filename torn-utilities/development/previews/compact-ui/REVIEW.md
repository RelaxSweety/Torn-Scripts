# Compact UI implementation review

Preview: **0.5.42.88-dev**. Starting point: DEV commit **50c22fc**, verified against the remote DEV branch before changes. All 10 active tools come from `all-in-one/config/tools.json`. Item Monitor remains **1.12.38-dev** because its functional source is unchanged.

## Install and scope

- [PDA review build](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/compact-ui-preview-20261110/torn-utilities/releases/dev/compact-preview/torn-utilities-compact-pda.user.js)
- [Tampermonkey review build](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/compact-ui-preview-20261110/torn-utilities/releases/dev/compact-preview/torn-utilities-compact-tampermonkey.user.js)

Both packages contain the same established universal userscript, with a separate preview name/namespace and auto-update disabled. Disable the existing TU userscript before enabling the preview, then refresh Torn. Do not run both simultaneously. To revert, disable the preview and re-enable the original script. Existing preferences and window layout keys are retained.

The isolated `dev/compact-ui-preview-20261110` branch supplies the review installers. The active `dev/tu-all-in-one` update URL and all production scripts, links, Workers, schemas and agreement documents are untouched. No Worker deployment or production merge is part of this change.

## Measured dimensions

All dimensions below are CSS pixels from the real Chromium fixture. Touch layouts use coarse-pointer emulation. A smaller saved window or a longer dynamic identity can add wrapping.

| Layout | Manager before → after | Travel/Item menu header before → after |
|---|---:|---:|
| Desktop 1280 × 900 | 99.00 → 56.33 | 76.00 → 29.00 |
| Mobile portrait 390 × 844 | 135.00 → 56.33 | 118.56 → 49.00 |
| Mobile landscape 844 × 390 | 99.00 → 56.33 | 76.00 → 49.00 |
| Narrow portrait 320 × 740 | 182.00 → 67.88 | 212.12 → 51.55 |

The desktop Travel/Item header is **38.2% of its original height**, close to the 37.5% target. The Manager retains a readable-height floor because its title, subtitle, player and faction now occupy four fixed lines. Its exact height is listed above. Exact 62.5% reduction is intentionally not forced where it would clip text or reduce usable controls.

| Styling value | Baseline | Compact |
|---|---:|---:|
| Manager title | 22 px | 16.5 px |
| Item Monitor header title | 18 px | 13.5 px |
| Item Monitor section title | 19 px | 14.25 px |
| Manager card title | 16 px | 12 px |
| Base body text | 14 px | 11 px floor; 12 px on touch Travel/Item surfaces |
| Manager card padding | 13 px | 9.75 px |
| Item Monitor internal padding | 12 px | 9 px |
| Standard 8 px gap | 8 px | 6 px |
| Manager nav padding | 10 px | 7.5 px |
| Item button padding | 8 × 12 px | 6 × 9 px |
| Standard Item button minimum | 36 px | 27 px; 44 px on touch |
| Window-control hit target | mixed/tiny original controls | 24 × 24 px desktop; 44 × 44 px on touch |

The original logo data is reused byte-for-byte; no replacement, generation, filtering or aspect-ratio change. Existing Manager branding and module emblems are simply displayed at smaller sizes. No logo is added to modules that did not already use one.

## All active module headers

| Tool / surface | Before | After |
|---|---:|---:|
| Travel Assistant / Item Monitor menu | 76 px | 29 px |
| Chat Archiver | 36 px | 25 px |
| War Organizer | 47 px | 29 px |
| Flight Game | 34 px | 24 px |
| Stick Fighter | 34 px | 24 px |
| Slithering Streets | 32 px | 24 px |
| Tic-Tac-Toe | 32 px | 24 px |
| Torn Four | 32 px | 24 px |
| Torn Fleet | 32 px | 24 px |
| Chaos Marbles | 32 px | 24 px |

Already-short 32–47 px legacy headers stop at a 24 px control floor (plus necessary logo/padding/borders), rather than shrinking to unreadable 12–18 px bars. Game boards, canvases, collision coordinates, resizers and window dimensions are not scaled. These are accessibility/usability exceptions, not a claim that every header reaches 37.5%.

## Files and architecture

- `all-in-one/src/ui/compact.css`: one shared compact header/control stylesheet, responsive wrapping, visible focus and touch exceptions.
- `all-in-one/scripts/compact-presentation.mjs`: build-time conversion of CSS typography, padding, margins and gaps from original source baselines. Applies once; no runtime layout scanner, zoom or transformed hitboxes. Font values have an 11 px minimum. Geometry, timeouts and calculation values are excluded.
- `all-in-one/src/manager/manager.user.js`: stylesheet insertion point and local DEV version. The existing Back, Minimize and Exit handlers are retained. CSS moves all existing controls right and makes Minimize visibly styled. Presentation-only DOM placement keeps keyboard Back/Minimize/Exit order consistent.
- `all-in-one/scripts/build-dev.mjs`: apply presentation conversion to the active Manager and every tool from the registry; isolated preview build support.
- `all-in-one/scripts/build-compact-preview.mjs`: package the existing universal bundle for PDA and Tampermonkey review with updates disabled.
- `all-in-one/config/releases.json`, `package.json`: local DEV release notes, build command and compact validation.
- `all-in-one/tests/compact-presentation.mjs`, `tests/fixtures/compact-preview.html`, `scripts/preview-compact-ui.py`: numeric baseline tests and reproducible real-browser previews.
- Generated DEV bundles and this review gallery. Historical .87 bundle remains unchanged.

No functional module rewrite or navigation rearrangement. Tools/Settings/About, category hierarchy, category back buttons, Business Tools, cards, versions/status/Open actions, travel planning, reporting, predictions, monitoring, alarms, Snatch and Run, diagnostics and agreements remain present. Player/faction text still comes from the existing identity requests and events.

## Validation

- Full `npm run validate`: build and all functional regression suites. The follow-up identity-line formatting also passed saved-key, launcher and browser line-position checks.
- Compact tests: one-pass conversion, readable minima, unchanged geometry/calculation literals, shared stylesheet emitted once, existing controls and touch floors.
- Real Chromium: 1280 × 900 desktop, 390 × 844 touch portrait, 844 × 390 touch landscape and 320 × 740 narrow touch portrait.
- Before/after screenshots for Manager, tool menu, Travel Assistant and Item Monitor at every size; desktop screenshots and opening/closing for all other active tools.
- Real header drag, native CSS resize, saved dimensions and reload restoration; module minimize/restore, closing/reopening, category navigation and scrolling.
- No page exceptions or unintended horizontal overflow on the measured Manager and Travel/Item surfaces.
- Existing tests cover PDA bridges/adapted source, Tampermonkey integration, APIs, inventory calculations, alarms, sessions, agreement rendering/acceptance, native actions, window navigation and state persistence.

## Limitations and exceptions

- Chromium desktop/mobile emulation and PDA bridge fixtures were exercised. Physical Android/iOS Torn PDA, Safari/WebKit, and live Torn API/gameplay were not tested here.
- Touch controls remain at least 44 px. Touch form text stays at 16 px where needed to avoid iOS focus zoom. Checkbox marks retain their existing geometry; associated labels supply larger targets.
- Labels/body text stop at readable minimums, and long titles/identities wrap. Therefore exact percentage reductions are not forced for every element.
- The Manager is taller than the strict desktop 37.5% target because the title, subtitle and separate dynamic player/faction lines are retained. Already-short legacy headers have the control floor described above.
- CSS uses the same modern selector family already used by TU (`:is`, `:has`). Older embedded engines without those selectors require device-specific follow-up.
- Fixture data is mocked. Screenshots show the actual implemented interface, not a generated visual design. No real inventory was used, purchased or destroyed.

## Reproduce

From `torn-utilities/all-in-one`:

```sh
npm run validate
npm run build:compact-preview
python scripts/preview-compact-ui.py
```

Python previewing requires Playwright and Chromium. Browser execution in a restricted workspace may require its standard browser sandbox permission. No network credentials are used by the fixture.
