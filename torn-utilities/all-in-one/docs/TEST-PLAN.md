# Cross-platform test plan

Each release requires separate Tampermonkey and PDA sessions. Each checklist item has instructions, expected behavior, Pass/Fail/Skip, notes, time, build ID, and captured diagnostic events.

Critical checks: launcher visible; drag and position persistence; manager opens; consent; Public key verification; Limited key verification; correct verified label; key persistence; authorization gating; module registry; lazy activation and cleanup; navigation; backup/export redaction; recovery after failed module; no duplicate launchers; cross-platform UI visibility.

Per-module tests: launch, UI controls, primary workflow, error handling, minimize/restore, cleanup. Item Monitor additionally: select an item, cancel, Escape, persistence, alert settings. Travel Assistant: destination, travel mode, calculations, and stock display. War Organizer: list loading, reservation controls and timers.

Failure reports: timestamp, platform, browser/app version if available, build ID, module ID/version, test ID, expected/observed, sanitized error traces, optional screenshot and user notes. Never include API credentials.

Release gate: all critical checks passed on both platforms; skipped critical checks block promotion pending review. Tests cannot automatically prove all game UI functionality.
