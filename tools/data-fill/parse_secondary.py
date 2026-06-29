#!/usr/bin/env python3
"""Secondary source: wildriftfire.com guide pages -> abilities (for cross-check).

Independent of the wiki. Fetches https://www.wildriftfire.com/guide/<id> (plain
server-rendered HTML, no JS needed), caches it under ~/.cache/wrb/champs2/<id>.html,
and extracts each ability's per-rank damage + cooldown from the main "Champion
Abilities" section.

Only the FIRST block per ability slug is parsed — the slug repeats later in
skill-order tables and the patch-history section (those carry stale `old -> new`
values and must be ignored).

Usage:
  python3 tools/data-fill/parse_secondary.py [<id> ...]   # default: all cached wiki champs
Output: tools/data-fill/out/<id>.wrf.json
"""
import json, os, re, sys, glob, time, html, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
WIKI_CACHE = os.path.expanduser("~/.cache/wrb/champs")
CACHE2 = os.path.expanduser("~/.cache/wrb/champs2")
OUTDIR = os.path.join(HERE, "out")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

SLOTS = ["passive", "Q", "W", "E", "R", "extra5", "extra6", "extra7", "extra8"]
ABIL_IMG = re.compile(r"images/ability/([a-z0-9-]+)\.png")
CD_RE = re.compile(r"Cooldown:\s*([\d.]+(?:\s*/\s*[\d.]+)*)", re.I)
# <array> (optional + N% STAT) <optional type> damage
DMG_RE = re.compile(
    r"([\d.]+(?:\s*/\s*[\d.]+)+)\s*"
    r"(?:\(\s*\+\s*([\d.]+)\s*%?\s*(Ability Power|bonus AD|AP|AD)\s*\)\s*)?"
    r"(magic|physical|true)?\s*damage",
    re.I,
)
STAT_MAP = {"ap": "abilityPower", "ability power": "abilityPower",
            "ad": "attackDamage", "bonus ad": "bonusAttackDamage"}


def f(x):
    v = float(x)
    return int(v) if v == int(v) else round(v, 4)


def arr(s):
    s = s.strip()
    return [f(x) for x in re.split(r"\s*/\s*", s)] if re.fullmatch(r"[\d.]+(?:\s*/\s*[\d.]+)*", s) else None


def clean(seg):
    seg = re.sub(r"<[^>]+>", " ", seg)
    return re.sub(r"\s+", " ", html.unescape(seg)).strip()


def fetch(cid):
    path = os.path.join(CACHE2, cid + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return open(path, encoding="utf-8").read(), "cache"
    os.makedirs(CACHE2, exist_ok=True)
    url = f"https://www.wildriftfire.com/guide/{cid}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return None, f"http {e.code}"
    except Exception as e:
        return None, f"err {e}"
    open(path, "w", encoding="utf-8").write(data)
    time.sleep(1.0)  # be polite
    return data, "fetched"


def parse(cid, h):
    parts = ABIL_IMG.split(h)  # [pre, slug, body, slug, body, ...]
    seen, abilities = set(), []
    for slug, body in zip(parts[1::2], parts[2::2]):
        # ability slug = champ-prefixed; keep first occurrence of each, in order
        if slug in seen:
            continue
        seen.add(slug)
        txt = clean(body[:1800])
        if "→" in txt[:400] or "wf-patch" in body[:200]:
            continue  # patch-history fragment
        cdm = CD_RE.search(txt)
        cooldown = arr(cdm.group(1)) if cdm else []
        # damage: first array followed by 'damage' (skips the Cooldown/Cost arrays)
        dmg = DMG_RE.search(txt)
        base, dtype, scal = [], "none", []
        if dmg:
            base = arr(dmg.group(1)) or []
            if dmg.group(4):
                dtype = dmg.group(4).lower()
            if dmg.group(2) and dmg.group(3):
                scal = [{"stat": STAT_MAP[dmg.group(3).lower()], "ratio": f(float(dmg.group(2)) / 100)}]
        slot = SLOTS[len(abilities)] if len(abilities) < len(SLOTS) else f"x{len(abilities)}"
        abilities.append({
            "slot": slot, "slug": slug, "baseDamage": base, "damageType": dtype,
            "scalings": scal, "cooldown": cooldown, "_text": txt[:300],
        })
        if len(abilities) >= 9:
            break
    return abilities


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    ids = sys.argv[1:] or sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(WIKI_CACHE, "*.md")))
    print(f"{'id':18} {'src':8} {'abil':4} dmg")
    for cid in ids:
        h, src = fetch(cid)
        if not h:
            print(f"{cid:18} {src}")
            json.dump({"id": cid, "error": src, "abilities": []}, open(os.path.join(OUTDIR, cid + ".wrf.json"), "w"))
            continue
        ab = parse(cid, h)
        json.dump({"id": cid, "abilities": ab}, open(os.path.join(OUTDIR, cid + ".wrf.json"), "w"), indent=1)
        print(f"{cid:18} {src:8} {len(ab):<4} {sum(1 for a in ab if a['baseDamage'])}")


if __name__ == "__main__":
    main()
