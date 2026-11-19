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
