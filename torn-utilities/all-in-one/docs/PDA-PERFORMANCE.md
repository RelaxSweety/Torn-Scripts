# PDA lag investigation — DEV 0.5.42.37

## Findings

Review of 0.5.42.36 identified two sources of avoidable main-thread work:

1. The Manager attached body-wide MutationObservers for every child-list mutation and every `style`, `hidden` or `class` change. Unrelated Torn updates invoked floating-window discovery, header enhancement and launcher visibility evaluation. With a tool active, launcher evaluation calls `getComputedStyle`/layout-related APIs.
2. Item Monitor reacted to document mutations by querying item/listing candidates even with no configured monitors. Its category detection can also enumerate page tables. These page-wide searches serve no monitoring purpose when the watch list is empty.

The saved-key patch itself has no recurring inventory poll: key-record reads occur during verification, API key operations, role selection and identity restoration. The observer design predated that patch. The unchanged approved logo remains embedded; this investigation did not establish an image-decoding cause for the reported continuous lag.

## Measured work

A jsdom fixture opens the generated DEV Travel/Item Monitor tool, then performs 20 unrelated Torn-style class/style/text updates in separate batches. Counters measure TU window root lookups, computed-style calls and item candidate queries. They are counts of work, not device frame-time measurements.

| Work during the update fixture, no monitors | Before (.36) | After (.37) |
| --- | ---: | ---: |
| Selected TU window root lookups | 200 | 0 |
| Computed-style calls | 40 | 0 |
| Item candidate scans | 1 | 0 |

The patched fixture with a configured monitor still performs its coalesced listing scan while avoiding unrelated Manager layout work. Regression checks also verify header rebuilding, launcher visibility updates and suspension of listing/style reads while the document is hidden.

## Change

The Manager now filters mutation records for relevant TU windows/headers and batches work to at most one update per animation frame. Unchanged headers are not rewritten; replaced headers receive controls again. Hidden pages defer UI work until visible. Item Monitor skips empty/hidden scans and ignores changes wholly inside TU's own UI. Normal configured monitoring and scheduled fallback remain available.

Run `node tests/performance.mjs` and `node tests/performance.mjs --with-monitor` from `torn-utilities/all-in-one`. The fixture can measure a previous generated artifact via `node tests/performance.mjs /path/to/prior.user.js --measure-only`. Other existing core, lifecycle, saved-key and diagnostic regressions remain part of `npm test`.

## Device acceptance still required

No actual PDA CPU profile or frame-rate measurement was taken. Retest the same Torn page in PDA with only one TU Manager version enabled: after reload, Manager closed/open, Travel closed/open/minimized, zero and configured monitors, and TU Test closed/open. Check scrolling, dragging, tool switching, alerts and recovery after background/resume. If lag remains, record the PDA version/device, page, active tool, reporting/monitor state and whether the independent TU Test script is enabled. Keep all changes in DEV.
