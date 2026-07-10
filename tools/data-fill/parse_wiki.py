#!/usr/bin/env python3
"""Deterministic parser for cached LoL/WR wiki markdown -> champion stats + abilities.

Reads ~/.cache/wrb/champs/<id>.md (raw wiki markdown, source #2) and extracts, by
regex only (no summarization), the data the project schema needs:

  * base + per-level stats, from the infobox `lvl1 - lvl15` ranges
    (WR uses 14 growth steps, so perLevel = (lvl15 - lvl1) / 14)
  * abilities in passive->Q->W->E->R order (delimiter = the per-ability
    `Template:WR_Data_<Champ>/<Name>?action=edit` edit-link), each with the
    headline per-rank baseDamage, damageType, scalings, and cooldown.

Every numeric field is copied verbatim from the cached text, and the raw matched
lines are kept under `_raw` so a human/agent can verify. Anything ambiguous is
listed under `_flags` rather than guessed.

Usage:
  python3 tools/data-fill/parse_wiki.py [<id> ...]   # default: all cached champs
Output: tools/data-fill/out/<id>.wiki.json  (+ a summary table to stdout)
"""
import json, os, re, sys, glob, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CACHE = os.path.expanduser("~/.cache/wrb/champs")
OUTDIR = os.path.join(HERE, "out")
CHAMPS_JSON = os.path.join(REPO, "data", "patches", "7.1", "champions.json")
LEVELS = 14  # level 1 -> level 15

# ---------------------------------------------------------------------------- #
#  helpers
# ---------------------------------------------------------------------------- #

DASH = r"[–—-]"  # en dash / em dash / hyphen


def f(x):
    v = float(x)
    return int(v) if v == int(v) else round(v, 4)


def strip_md(s):
    """Turn wiki markdown into readable plain text."""
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)           # images
    s = re.sub(r"\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)", "", s)  # image-links
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)        # [text](url) -> text
    s = s.replace("**", "").replace("\\", "")
    s = re.sub(r"\s*#\w+\)", "", s)                       # orphan anchor fragments
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_array(s):
    """'12 / 10 / 8 / 6' -> [12,10,8,6]; returns None if not a clean numeric array."""
    s = s.strip()
    if not re.fullmatch(r"[\d.]+(?:\s*/\s*[\d.]+)+", s):
        return None
    return [f(x) for x in re.split(r"\s*/\s*", s)]


# ---------------------------------------------------------------------------- #
#  stats
# ---------------------------------------------------------------------------- #

# visible label text (first non-image bracket on the infobox row) -> our key
STAT_ROWS = {
    "Health": "maxHealth",
    "Health regen. (per 5s)": "healthRegen",
    "Armor": "armor",
    "Attack damage": "attackDamage",
    "Magic resist.": "magicResist",
}


def first_label(line):
    """First non-image bracketed link text on a line, e.g. '[Health](..)' -> 'Health'."""
    for m in re.finditer(r"\[([^\[\]]+)\]\(", line):
        txt = m.group(1)
        if not txt.startswith("!"):
            return txt.strip()
    return None


def parse_stats(lines):
    """Walk the infobox; map each known stat row to the value on the next line."""
    raw = {}
    for i, line in enumerate(lines):
        lbl = first_label(line)
        if lbl in raw:
            continue  # first occurrence wins: champion infobox is at the top of the
                      # page; later "Health"/"Armor" rows belong to plants/turrets
        if lbl in STAT_ROWS or lbl in ("Move. speed", "Crit. damage", "Resource",
                                        "Resource regen."):
            # value = next non-empty line
            for j in range(i + 1, min(i + 4, len(lines))):
                if lines[j].strip():
                    raw[lbl] = lines[j].strip()
                    break
    out, ranges = {}, {}
    for lbl, key in STAT_ROWS.items():
        if lbl in raw:
            m = re.match(rf"^([\d.]+)\s*{DASH}\s*([\d.]+)", raw[lbl])
            if m:
                lo, hi = float(m.group(1)), float(m.group(2))
                out[key] = {"base": f(lo), "perLevel": f((hi - lo) / LEVELS)}
                ranges[key] = raw[lbl]
    # mana (only when Resource is a clean range, i.e. a mana champ)
    if "Resource" in raw:
        m = re.match(rf"^([\d.]+)\s*{DASH}\s*([\d.]+)", raw["Resource"])
        if m:
            lo, hi = float(m.group(1)), float(m.group(2))
            out["mana"] = {"base": f(lo), "perLevel": f((hi - lo) / LEVELS)}
            ranges["mana"] = raw["Resource"]
        if "Resource regen." in raw:
            mr = re.match(rf"^([\d.]+)\s*{DASH}\s*([\d.]+)", raw["Resource regen."])
            if mr:
                lo, hi = float(mr.group(1)), float(mr.group(2))
                out["manaRegen"] = {"base": f(lo), "perLevel": f((hi - lo) / LEVELS)}
    if "Move. speed" in raw and re.match(r"^[\d.]+$", raw["Move. speed"]):
        out["moveSpeed"] = f(raw["Move. speed"])
    if "Crit. damage" in raw:
        m = re.match(r"^([\d.]+)%", raw["Crit. damage"])
        if m:
            out["critDamageBase"] = f(float(m.group(1)) / 100 - 1)  # 175% -> 0.75
    return out, ranges


# ---------------------------------------------------------------------------- #
#  abilities
# ---------------------------------------------------------------------------- #

SLOTS = ["passive", "Q", "W", "E", "R"]
DELIM = re.compile(r"Template:WR_Data_[^/]+/([^?]+)\?action=edit")
DMG_LINE = re.compile(
    r"\*\*([^*]*?[Dd]amage[^*:]*?):\*\*[\s►]*([\d.]+(?:\s*/\s*[\d.]+)+)([^\n]*)"
)
# labels that are buffs / aggregates / conditional, not an ability's headline hit
NOT_HEADLINE = re.compile(
    r"bonus|maximum|total|increased|reduction|sweetspot|healing|\bheal\b|shield|"
    r"minion|monster|per second|missing|over time",
    re.I,
)


def all_scalings(tail):
    """Extract every '(+ N% STAT)' from a headline damage line's tail (AP/AD/bonus
    AD/% max|bonus health). Captures hybrids (e.g. Akali +25% AD +30% AP). Returns
    (scalings:list[{stat,ratio}], per_rank:bool)."""
    # only the primary value's scalings: stop at the sweetspot/secondary marker
    seg = re.split(r"◄|\*\*", tail)[0]
    scalings, per_rank = [], False
    for m in re.finditer(r"\\?\+\s*([\d.]+)((?:\s*/\s*[\d.]+)*)\s*%\s*"
                         r"(bonus AD|AD|AP|of[^,)]*?(?:bonus )?(?:maximum|max)\s+health)", seg, re.I):
        kind = m.group(3).lower().strip()
        if "health" in kind:
            stat = "bonusHealth" if "bonus" in kind else "maxHealth"
        else:
            stat = {"ap": "abilityPower", "ad": "attackDamage", "bonus ad": "bonusAttackDamage"}[kind]
        scalings.append({"stat": stat, "ratio": f(float(m.group(1)) / 100)})
        if m.group(2):
            per_rank = True
    return scalings, per_rank


def damage_type_from(label, block):
    for t in ("Magic", "Physical", "True"):
        if t.lower() in label.lower():
            return t.lower()
    for t in ("magic", "physical", "true"):
        if f"{t} damage" in block.lower():
            return t
    return "none"


def first_sentence(block):
    for tag in ("Active:", "Passive:", "Innate:", "Toggle:"):
        m = re.search(rf"\*\*{tag}\*\*\s*(.+)", block)
        if m:
            txt = strip_md(m.group(1))
            txt = re.split(r"(?<=[.!])\s", txt)[0]
            return txt[:240]
    # fallback: first non-meta prose line
    for ln in block.splitlines():
        s = strip_md(ln)
        if len(s) > 30 and not s.endswith(":"):
            return s[:240]
    return ""


def parse_abilities(content):
    matches = list(DELIM.finditer(content))
    blocks = []
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        blocks.append((urllib.parse.unquote(m.group(1)).replace("_", " "), content[start:end]))

    abilities, flags = [], []
    if len(blocks) > 5:
        flags.append(f"{len(blocks)} ability blocks (>5) — form/transform champ, verify slot mapping")

    for idx, (tname, block) in enumerate(blocks):
        name = tname.strip()  # template name is clean; block's first line is a stray ")"
        slot = SLOTS[idx] if idx < len(SLOTS) else f"extra{idx}"

        # cooldown: a block may carry STATIC COOLDOWN (per-cast lockout, scalar) AND
        # RECHARGE (charge regen, per-rank) AND/OR a plain COOLDOWN. The meaningful
        # cooldown is the per-rank array; prefer plain COOLDOWN > RECHARGE > STATIC,
        # and any array over any scalar. Expanded to rank count below.
        LP = {"COOLDOWN": 0, "RECHARGE": 1, "STATIC COOLDOWN": 2}
        cd_lines = list(re.finditer(r"(STATIC COOLDOWN|RECHARGE|COOLDOWN):\s*\n+\s*([^\n]+)", block))
        cands = []  # (is_scalar, label_priority, array, scalar)
        for c in cd_lines:
            val = c.group(2).strip()
            arr = parse_array(val)
            sca = float(val) if re.fullmatch(r"[\d.]+", val) else None
            if arr is not None:
                cands.append((0, LP[c.group(1)], arr, None))
            elif sca is not None:
                cands.append((1, LP[c.group(1)], None, sca))
        cands.sort(key=lambda x: (x[0], x[1]))
        cd_array = cands[0][2] if cands else None
        cd_scalar = cands[0][3] if cands else None

        # damage: the headline is the first damage line whose label is not a
        # buff/aggregate/conditional (e.g. skip "Bonus Attack Damage", "Total Damage")
        all_dmg = list(DMG_LINE.finditer(block))
        headline = next((m for m in all_dmg if not NOT_HEADLINE.search(m.group(1))), None)
        base_damage, damage_type, scalings = [], "none", []
        if headline:
            lbl, arr_s, tail = headline.group(1), headline.group(2), headline.group(3)
            base_damage = parse_array(arr_s) or []
            damage_type = damage_type_from(lbl, block)
            scalings, per_rank = all_scalings(tail)
            if per_rank:
                flags.append(f"{slot} '{name}': per-rank scaling ratio (stored rank-1) — verify")
            others = [m for m in all_dmg if m is not headline and not NOT_HEADLINE.search(m.group(1))]
            if others:
                flags.append(f"{slot} '{name}': multiple headline damage lines — took '{lbl.strip()}', verify")
        elif all_dmg:
            flags.append(f"{slot} '{name}': only buff/aggregate damage lines, set baseDamage=[] — verify")

        # finalize cooldown: per-rank array as-is; flat scalar repeated to rank count
        ranks = len(base_damage) if base_damage else (3 if slot == "R" else 4 if slot in ("Q", "W", "E") else 1)
        if cd_array:
            cooldown = cd_array
        elif cd_scalar is not None:
            cooldown = [f(cd_scalar)] * ranks
        else:
            cooldown = []

        # anomaly: WR basic abilities are 4-rank, ults 3-rank. A 5-element array
        # usually means the wiki page is showing PC League data (e.g. WR:Bard).
        if len(cooldown) == 5 or len(base_damage) == 5:
            flags.append(f"{slot} '{name}': 5-element array (PC-data?) — verify WR rank count")

        abilities.append({
            "slot": slot,
            "name": name,
            "description": first_sentence(block),
            "baseDamage": base_damage,
            "damageType": damage_type,
            "scalings": scalings,
            "cooldown": cooldown,
            "_raw": {
                "template": tname,
                "damageLines": [f"{m.group(1).strip()}: {m.group(2)}{m.group(3)[:60]}" for m in all_dmg],
                "cooldownLines": [f"{c.group(1)}: {c.group(2).strip()}" for c in cd_lines],
            },
        })
    return abilities, flags


# ---------------------------------------------------------------------------- #
#  diff vs current data + driver
# ---------------------------------------------------------------------------- #

def stat_diff(parsed, current):
    diffs = []
    for key, val in parsed.items():
        cur = current.get(key)
        if cur is None:
            continue
        if isinstance(val, dict):
            for sub in ("base", "perLevel"):
                tol = 0.5 if sub == "base" else 0.5
                if abs(val[sub] - cur.get(sub, 0)) > tol:
                    diffs.append(f"{key}.{sub}: {cur.get(sub)} -> {val[sub]}")
        else:
            if abs(val - (cur if isinstance(cur, (int, float)) else 0)) > 0.5:
                diffs.append(f"{key}: {cur} -> {val}")
    return diffs


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    champs = {c["id"]: c for c in json.load(open(CHAMPS_JSON))}
    ids = sys.argv[1:] or sorted(
        os.path.basename(p)[:-3] for p in glob.glob(os.path.join(CACHE, "*.md"))
    )
    print(f"{'id':18} {'abil':4} {'dmg':4} {'statDiff':8} flags")
    for cid in ids:
        md = os.path.join(CACHE, cid + ".md")
        if not os.path.exists(md):
            print(f"{cid:18} -- NO CACHE FILE")
            continue
        content = open(md, encoding="utf-8").read()
        lines = content.splitlines()
        stats, ranges = parse_stats(lines)
        abilities, flags = parse_abilities(content)
        sdiff = stat_diff(stats, champs.get(cid, {}).get("stats", {})) if cid in champs else []
        out = {
            "id": cid,
            "stats": stats,
            "statRanges": ranges,
            "statDiff": sdiff,
            "abilities": abilities,
            "flags": flags,
        }
        json.dump(out, open(os.path.join(OUTDIR, cid + ".wiki.json"), "w"), indent=1)
        n_dmg = sum(1 for a in abilities if a["baseDamage"])
        print(f"{cid:18} {len(abilities):<4} {n_dmg:<4} {len(sdiff):<8} {'; '.join(flags)[:80]}")


if __name__ == "__main__":
    main()
