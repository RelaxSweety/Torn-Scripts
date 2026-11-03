# Honors & Medals DEV review

## Architecture reviewed

Baseline: `RelaxSweety/Torn-Scripts` main, commit `73c42788968612913ccfee20b1d5c194324dc8fd`, cross-platform Manager v0.5.34; the separate PDA Manager is older (v0.4.42). The similarly named private Torn-Scripts-Dev repository has an older, different layout. This implementation branches from the current production source to avoid losing recent Manager changes.

Modules are independently installed scripts. They register inert `activate/deactivate` definitions with `TornUtilities`, then receive a mount, close and minimize context. Manager owns enable/disable, catalogs, navigation, header controls and floating-window behavior. The cross-platform Manager also persists window geometry. Module preferences use existing namespaced storage and participate in existing backups. Personal achievement responses remain in memory and are cleared on exit or identity change.

The new panel is added to Manager's existing window lists; other module IDs and behavior remain unchanged. The cross-platform request gateway retains its existing faction routes and adds five exact achievement routes. The PDA gateway uses its existing saved/PDA-injected key and transport. The module contains no key entry, key storage, direct network transport or authentication fallback.

## Verified API contract

Checked 2026-11-03 against Torn's official [OpenAPI schema](https://www.torn.com/swagger/openapi.json), version 6.15.0, and [Swagger documentation](https://www.torn.com/swagger.php).

| GET route | Required access | Used for |
| --- | --- | --- |
| `/v2/torn/honors` | Public | Honor catalog: IDs, names, descriptions, type |
| `/v2/torn/medals` | Public | Medal catalog |
| `/v2/user/honors` | Minimal | Earned honor IDs and timestamps |
| `/v2/user/medals` | Public | Earned medal IDs and timestamps |
| `/v2/user/personalstats?cat=all` | Public | Nested v2 public counters |
| `/v2/key/info` | Existing Manager authentication | Key owner and access type |

Ownership responses are arrays of `{id,timestamp}` objects. Personal stats use nested v2 paths such as `attacking.attacks.won`, `jail.busts.success` and `travel.total`. Private stats require greater access and are not used. The full public category is needed across several achievement families; requests are sequential, activation-only, and manual refresh is limited to once per 30 seconds. No background polling occurs.

**Permission limitation:** the current cross-platform Manager deliberately accepts only Public Only keys. That policy is preserved. With those keys, earned and unearned medals work, but honor ownership is shown as Unknown. Failed/malformed ownership responses are never interpreted as empty lists. The older PDA Manager may already have a Minimal key configured; if Torn permits `/user/honors`, the same module automatically displays honor ownership too. No higher key is requested by the module. Full honor ownership in cross-platform TU needs a separately approved change to Manager authentication policy.

## Progress and recommendations

Requirements are matched against narrow complete-description patterns, using the live catalog for numeric targets. Supported families include attack/defend wins, busts/bails, jail visits, travel totals and destinations, weapon finishing hits, medical items, races, critical hits, respect, ammunition and items bought abroad. Examples were checked against the official [Awards wiki](https://wiki.torn.com/wiki/Award); wiki descriptions may lag the live catalog, so unmatched descriptions remain untracked. Crimes-version awards and compound/timed requirements are excluded.

Missing or null stats remain unknown, while a real zero is valid. Percentage is capped at 100; reaching a target never changes API-confirmed ownership. Default honor bars are identified separately. Recommendations include only known unearned achievements with supported progress, ranked by percentage complete. They show remaining actions and explicitly describe this as proximity: different activities have different costs and durations, so this is not a claim to know actual time-to-completion. Unsupported or retired requirements receive no guessed progress.

Search and type/status/category filters combine. Name/type/category/status/progress/date sorting works in both directions; unknown values remain last. Columns use buttons and `aria-sort`. API text is rendered with `textContent`.

## Isolated DEV installation

Branch: `dev/honors-medals`. Production main and existing production scripts have not been deployed or modified remotely.

Run:

```sh
node torn-utilities/dev/build-honors-medals.cjs /tmp/tu-honors-medals-dev
```

Use a separate browser profile/PDA test setup. Disable the existing TU Manager there and install exactly one generated Manager (`cross-platform` for Tampermonkey, `pda` for PDA) plus `honors-medals-DEV.user.js`. Generated Managers fetch the DEV catalog and disable production auto-update metadata; other modules retain their original URLs. Do not run two Managers together, since they intentionally share the same registration guard and existing authentication. The new module appears under Other Tools. Existing API keys remain in Manager's own settings.

Canonical source URLs stay on main so the reviewed code remains suitable for a later production merge. The generator provides DEV catalog routing without changing production hosting or weakening its catalog validator.

## Validation

```sh
node --test torn-utilities/tests/honors-medals.test.cjs
node torn-utilities/tests/honors-medals.browser.cjs
git diff --check
```

Validation result: 7 unit tests passed; browser scenarios passed for cross-platform GM transport, cross-platform fetch, PDA native-wrapper simulation and PDA fetch. Both canonical Managers and generated DEV Managers were exercised. Syntax checks and `git diff --check` passed. Endpoint permission references were also checked against the downloaded official OpenAPI 6.15.0 schema.

Browser checks require Playwright and Chromium (`CHROMIUM_PATH` overrides `/usr/bin/chromium`). Responses are schema-shaped fixtures, not captured player data. They cover independent script registration, existing GM/PDA authentication transport, unavailable honors, malformed ownership, filters/sorting, safe catalog text, drag, keyboard resizing, Back/Minimize/Restore/Exit, narrow route access, mobile viewport sizing and in-flight cleanup. Unit tests cover progress math, missing data, malformed responses, ID collisions, defaults and recommendations. Set `MANAGER_DIR` to the generated installer directory to exercise those builds, and `ARTIFACT_DIR` to save desktop/mobile screenshots.

Before production release, test on an actual Torn PDA device and Tampermonkey installation with the owner's key: native PDA transport and touch/browser engine behavior cannot be proven by desktop fixtures. No live player key was supplied for authenticated API validation. Review the permission limitation above before marking the PR ready.
