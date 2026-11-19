#!/usr/bin/env python3
"""Compile Torn honors/medals into a local Markdown and JSON report."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

BASE = "https://api.torn.com/v2"
PLAYER = 4539436

def fetch(path, key):
    request = urllib.request.Request(BASE + path, headers={
        "Authorization": "ApiKey " + key,
        "Accept": "application/json",
        "User-Agent": "AchievementCompiler/0.1",
    })
    with urllib.request.urlopen(request, timeout=25) as response:
        data = json.load(response)
    if "error" in data:
        raise RuntimeError("Torn API error: " + str(data["error"].get("code", "unknown")))
    return data

def entries(payload, field):
    raw = payload.get(field, payload)
    if isinstance(raw, dict):
        return [{"id": str(k), **(v if isinstance(v, dict) else {"value": v})} for k,v in raw.items()]
    if isinstance(raw, list):
        return [v if isinstance(v, dict) else {"id": str(v)} for v in raw]
    return []

def identifier(item):
    return str(item.get("id", item.get("honor_id", item.get("medal_id", ""))))

def compile_awards(earned_data, catalog_data, kind):
    earned = entries(earned_data, kind)
    catalog = entries(catalog_data, kind)
    catalog_by_id = {identifier(x): x for x in catalog}
    earned_ids = {identifier(x) for x in earned}
    output = []
    for award in catalog:
        aid = identifier(award)
        observed = next((x for x in earned if identifier(x) == aid), {})
        output.append({
            "type": kind[:-1], "id": aid,
            "name": award.get("name", observed.get("name", "Unknown")),
            "description": award.get("description", observed.get("description", "")),
            "earned": aid in earned_ids,
            "earned_at": observed.get("earned_at") or observed.get("timestamp"),
        })
    for award in earned:
        aid = identifier(award)
        if aid not in catalog_by_id:
            output.append({"type": kind[:-1], "id": aid, "name": award.get("name", "Unknown"),
                           "description": "", "earned": True, "earned_at": None})
    return sorted(output, key=lambda a: (not a["earned"], a["name"].casefold()))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="achievement-compiler/output")
    parser.add_argument("--player", type=int, default=PLAYER)
    args = parser.parse_args()
    key = os.environ.get("TORN_API_KEY", "").strip()
    if not key:
        raise SystemExit("TORN_API_KEY is required (store it as a GitHub Actions secret).")
    if args.player != PLAYER:
        raise SystemExit("This initial release is restricted to RelaxSweety [4539436].")
    responses = {}
    for name, path in {
        "honors": "/user/honors",
        "medals": "/user/medals",
        "honors_catalog": "/torn/honors",
        "medals_catalog": "/torn/medals",
        "personalstats": "/user/personalstats?cat=all",
    }.items():
        responses[name] = fetch(path, key)
    awards = compile_awards(responses["honors"], responses["honors_catalog"], "honors")
    awards += compile_awards(responses["medals"], responses["medals_catalog"], "medals")
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    report = {"player_id": args.player, "generated_at": now, "awards": awards,
              "personalstats": responses["personalstats"]}
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    (output / "achievements.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    completed = [a for a in awards if a["earned"]]
    pending = [a for a in awards if not a["earned"]]
    lines = ["# RelaxSweety — Achievement Compiler", "", f"Generated: {now}", "",
             f"Completed: **{len(completed)}** | Not yet earned: **{len(pending)}**", "",
             "Dates are shown only when explicitly supplied by Torn; unknown dates are not inferred.", ""]
    for heading, group in [("Completed", completed), ("Not yet earned", pending)]:
        lines += [f"## {heading}", ""]
        for a in group:
            label = a["name"].replace("\n", " ")
            description = str(a["description"]).replace("\n", " ")
            lines.append(f"- **{label}** ({a['type']}, ID {a['id']}) — {description}" +
                         (f" [date: {a['earned_at']}]" if a["earned_at"] else ""))
        lines.append("")
    (output / "achievements.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Compiled {len(completed)} completed awards and {len(pending)} unearned awards.")

if __name__ == "__main__":
    main()
