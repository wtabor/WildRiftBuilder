#!/usr/bin/env python3
"""Write parsed abilities into data/patches/7.1/champions.json for a batch of champs.

Reads each <id>.wiki.json (the authoritative, possibly hand-adjudicated extraction)
and sets champions.json[<id>].abilities. The wiki.json is the source of truth for
the write — to fix an adjudicated value, edit the <id>.wiki.json ability field and
re-run this.

Safety:
  * only standard slots (passive/Q/W/E/R) are written; a champ with extra blocks
    (form/transform) is SKIPPED and listed, so it gets hand-built in its own batch.
  * preserves champ key order and the file's 2-space formatting.
  * applies any stat corrections present in <id>.wiki.json's `apply_stats` field.

Usage: python3 tools/data-fill/apply_batch.py <id> [<id> ...]
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUTDIR = os.path.join(HERE, "out")
CHAMPS_JSON = os.path.join(REPO, "data", "patches", "7.1", "champions.json")
VALID = {"passive", "Q", "W", "E", "R"}
ABILITY_KEYS = ("slot", "name", "description", "baseDamage", "damageType", "scalings", "cooldown")


def sanitize(s):
    return (s.replace("–", "-").replace("—", "-")
             .replace("’", "'").replace("‘", "'")
             .replace("“", '"').replace("”", '"')
             .replace(" ", " ").strip())


def clean_ability(a):
    return {
        "slot": a["slot"],
        "name": sanitize(a["name"]),
        "description": sanitize(a.get("description", "")),
        "baseDamage": a.get("baseDamage", []),
        "damageType": a.get("damageType", "none"),
        "scalings": a.get("scalings", []),
        "cooldown": a.get("cooldown", []),
    }


def main():
    ids = sys.argv[1:]
    if not ids:
        sys.exit("usage: apply_batch.py <id> ...")
    champs = json.load(open(CHAMPS_JSON))
    by_id = {c["id"]: c for c in champs}
    applied, skipped = [], []
    for cid in ids:
        wp = os.path.join(OUTDIR, cid + ".wiki.json")
        if cid not in by_id or not os.path.exists(wp):
            skipped.append(f"{cid} (missing champ or wiki.json)")
            continue
        w = json.load(open(wp))
        slots = [a["slot"] for a in w["abilities"]]
        if any(s not in VALID for s in slots):
            skipped.append(f"{cid} (form/transform: slots={slots} — hand-build)")
            continue
        abilities = [clean_ability(a) for a in w["abilities"]]
        by_id[cid]["abilities"] = abilities
        # optional stat corrections explicitly staged on the wiki.json
        for key, val in (w.get("apply_stats") or {}).items():
            by_id[cid]["stats"][key] = val
        applied.append(f"{cid} ({len(abilities)} abilities)")
    with open(CHAMPS_JSON, "w", encoding="utf-8") as fh:
        json.dump(champs, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("APPLIED:")
    for a in applied:
        print("  +", a)
    if skipped:
        print("SKIPPED:")
        for s in skipped:
            print("  -", s)


if __name__ == "__main__":
    main()
