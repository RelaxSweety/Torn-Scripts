# Achievement Compiler

Standalone, read-only Torn achievement collector for **RelaxSweety [4539436]**.

## Userscript

Install [Achievement Compiler](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/achievement-compiler/Achievement-Compiler.user.js) in Torn PDA or your userscript manager. Open Torn, select **Achievements**, and enter your Torn API key in the tool. Install from this URL to receive future version updates.

## Local reports

Set `TORN_API_KEY` in your environment and run:

```sh
python achievement-compiler/compiler.py
```

The compiler writes two files to `achievement-compiler/output/`:

- `achievements.md` lists completed and outstanding honors and medals.
- `achievements.json` contains structured awards and personal statistics.

Keep generated reports private. The scheduled report workflow belongs in the private development repository because its artifacts can contain private player statistics.

## Employment and faction history

Run **Compile** to capture current employment and record employer or position changes on this device. Use **Employment History Corrections and Backup** to confirm a former employer, or to export and restore history for the same Torn account. Backups include player confirmations, employment observations, and recognized membership log evidence. Keep them private.

The JSON report has separate `career_history`, `job_progression`, `career_diagnostics`, and `faction_history` sections. The dossier, Markdown and profile HTML use the same normalized history. Job ranks and points alone do not establish previous employment. Torn documents five points on first employment in a starter job. The API schema requires fields for all six starter jobs and does not document how never-held jobs are populated.

Observed timestamps describe when the compiler saw an employer or position. Employment dates require attributable log entries. Faction reports sum documented stints and show current API-reported tenure when a join date is unavailable. Partial results and unknown dates remain marked as such.

Torn documents `/v2/user/log` as a standalone Full Access selection. Key metadata also reports custom log permissions. An error 16 means the requested selection was denied. Its response does not identify the exact setting that blocked it. The compiler checks for supported log types and tries a targeted query when available, while keeping report compilation independent of log access. Torn's log event payload fields are dynamic, so only recognized events with an identifiable employer or faction and a valid timestamp are used.

Sources: [Torn API schema](https://www.torn.com/swagger/openapi.json), [API errors](https://www.torn.com/api.html), [Starter jobs](https://wiki.torn.com/wiki/Joblist)

## Regression tests

With Node.js, Playwright and Chromium installed, run `node --test achievement-compiler/employment.test.cjs`. Set `CHROMIUM_PATH` if Chromium is outside `/usr/bin/chromium`. Tests use fixture data and simulated PDA and Tampermonkey transports.
