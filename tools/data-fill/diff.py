#!/usr/bin/env python3
"""Cross-check wiki vs wildriftfire ability extractions -> agreement report.

Aligns the two sources by slot and, per ability, classifies baseDamage / cooldown
/ primary-scaling as:
  MATCH      both present and equal (cooldown within a 0.6 rounding tolerance)
  MISMATCH   both present but differ            -> the loop must adjudicate
  WIKI_ONLY  wiki has it, wrf empty/missing     -> unconfirmed by 2nd source
  WRF_ONLY   wrf has it, wiki empty             -> wiki may be missing it; check

The wiki is the authoritative/primary source, so the committed value defaults to
wiki; this report only tells the loop *where to look*.

Usage: python3 tools/data-fill/diff.py [<id> ...]   (default: all with both files)
"""
import json, os, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, "out")


def load(cid, ext):
    p = os.path.join(OUTDIR, f"{cid}.{ext}.json")
    return json.load(open(p)) if os.path.exists(p) else None


def cd_equal(a, b, tol=0.6):
    if len(a) != len(b):
        # allow flat-vs-perrank when all equal (e.g. [10] vs [10,10,10,10])
        if a and b and len(set(a)) == 1 and len(set(b)) == 1 and abs(a[0] - b[0]) <= tol:
            return True
        return False
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def classify(w, r, kind):
    if kind == "cooldown":
        if w and r:
            return "MATCH" if cd_equal(w, r) else "MISMATCH"
    elif kind == "baseDamage":
        if w and r:
            return "MATCH" if w == r else "MISMATCH"
    elif kind == "scaling":
        ws = (w[0]["stat"], w[0]["ratio"]) if w else None
        rs = (r[0]["stat"], r[0]["ratio"]) if r else None
        if ws and rs:
            return "MATCH" if ws == rs else "MISMATCH"
        w, r = ws, rs
    if w and not r:
        return "WIKI_ONLY"
    if r and not w:
        return "WRF_ONLY"
    return "EMPTY"


def report(cid):
    w = load(cid, "wiki")
    r = load(cid, "wrf")
    if not w:
        return None
    wabs = {a["slot"]: a for a in w["abilities"]}
    rabs = {a["slot"]: a for a in (r["abilities"] if r and not r.get("error") else [])}
    rows, mismatches = [], []
    for slot in ["passive", "Q", "W", "E", "R"]:
        wa = wabs.get(slot)
        if not wa:
            continue
        ra = rabs.get(slot, {})
        for kind in ("baseDamage", "cooldown", "scaling"):
            c = classify(wa.get(kind, []), ra.get(kind, []), kind)
            if c == "MISMATCH":
                mismatches.append(
                    f"{slot}.{kind}: wiki={wa.get(kind)} wrf={ra.get(kind)} ('{wa['name']}')"
                )
            rows.append((slot, kind, c))
    return {
        "id": cid,
        "wrf": bool(rabs),
        "mismatches": mismatches,
        "flags": w.get("flags", []),
        "counts": {c: sum(1 for _, _, x in rows if x == c) for c in
                   ("MATCH", "MISMATCH", "WIKI_ONLY", "WRF_ONLY", "EMPTY")},
    }


def main():
    ids = sys.argv[1:] or sorted(
        os.path.basename(p).split(".")[0] for p in glob.glob(os.path.join(OUTDIR, "*.wiki.json"))
    )
    tot = {"MATCH": 0, "MISMATCH": 0, "WIKI_ONLY": 0, "WRF_ONLY": 0, "EMPTY": 0}
    no_wrf, with_mis = [], []
    for cid in ids:
        rep = report(cid)
        if not rep:
            continue
        for k, v in rep["counts"].items():
            tot[k] += v
        if not rep["wrf"]:
            no_wrf.append(cid)
        if rep["mismatches"]:
            with_mis.append((cid, rep["mismatches"]))
        json.dump(rep, open(os.path.join(OUTDIR, cid + ".diff.json"), "w"), indent=1)
    print("=== cross-check totals (baseDamage/cooldown/scaling cells) ===")
    for k, v in tot.items():
        print(f"  {k:10} {v}")
    print(f"\nchamps with NO wrf data: {len(no_wrf)}")
    print(f"champs with >=1 MISMATCH: {len(with_mis)}")
    for cid, ms in with_mis[:40]:
        print(f"\n  {cid}:")
        for m in ms:
            print(f"    - {m}")


if __name__ == "__main__":
    main()
