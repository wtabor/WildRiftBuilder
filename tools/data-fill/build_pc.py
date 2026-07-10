#!/usr/bin/env python3
"""Abilities for champs whose WR wiki pages carry PC-League data (5-rank arrays
and PC scalings). For these the wiki is NOT trustworthy, so values come from
wildriftfire (WR-native), with damage types / structure confirmed against both.

ekko's wiki was fine except W/E missed their damage; yuumi's wiki is correct
(a genuine 5-rank ability matching wrf) and is applied via apply_batch instead.

A few fields stay conservative where neither source is clean (noted): kog'maw R
Living Artillery has no confirmable per-rank base, so baseDamage is left [].

Run: python3 tools/data-fill/build_pc.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CHAMPS = os.path.join(REPO, "data", "patches", "7.1", "champions.json")


def ab(slot, name, desc, dmg, dtype, scal, cd):
    return {"slot": slot, "name": name, "description": desc,
            "baseDamage": dmg, "damageType": dtype, "scalings": scal, "cooldown": cd}


def ap(r): return {"stat": "abilityPower", "ratio": r}


BUILDS = {
  "ekko": [
    ab("passive", "Z-Drive Resonance", "Every third hit on a target deals bonus magic damage and grants move speed.", [], "magic", [], []),
    ab("Q", "Timewinder", "Throws a device that expands on the way back, dealing magic damage and slowing.", [90, 110, 130, 150], "magic", [ap(0.3)], [8, 7, 7, 6]),
    ab("W", "Parallel Convergence", "Active casts a chronosphere that slows, then stuns enemies caught inside.", [70, 100, 130, 160], "magic", [], [20, 18, 16, 14]),
    ab("E", "Phase Dive", "Dashes, then blinks to the next attack target for bonus magic damage.", [60, 90, 120, 150], "magic", [ap(0.4)], [9, 8, 8, 7]),
    ab("R", "Chronobreak", "Rewinds to his position seconds ago, healing and dealing magic damage in an area.", [200, 350, 500], "magic", [ap(1.5)], [80, 60, 40]),
  ],
  "velkoz": [
    ab("passive", "Organic Deconstruction", "Ability hits stack Deconstruction; at 3 stacks enemies take true damage.", [], "true", [], []),
    ab("Q", "Plasma Fission", "Fires a bolt that can split, dealing magic damage and slowing.", [80, 135, 190, 245], "magic", [ap(0.75)], [7, 7, 7, 7]),
    ab("W", "Void Rift", "Opens a rift that deals magic damage on contact and again when it erupts.", [30, 60, 90, 120], "magic", [ap(0.2)], [18, 16, 14, 12]),
    ab("E", "Tectonic Disruption", "Erupts a target area, dealing magic damage and knocking up.", [70, 110, 150, 190], "magic", [ap(0.3)], [13, 12, 11, 10]),
    ab("R", "Life Form Disintegration Ray", "Channels a steerable ray dealing heavy magic damage over its duration.", [450, 625, 800], "magic", [ap(1.25)], [80, 70, 60]),
  ],
  "kogmaw": [
    ab("passive", "Icathian Surprise", "On death, moves for a few seconds then detonates for true damage.", [], "true", [], []),
    ab("Q", "Caustic Spittle", "Fires a projectile dealing magic damage and shredding resistances.", [90, 150, 210, 270], "magic", [ap(0.65)], [6, 6, 6, 6]),
    ab("W", "Bio-Arcane Barrage", "Gains attack range and on-hit % max-health magic damage for a duration.", [], "magic", [], [16, 16, 16, 16]),
    ab("E", "Void Ooze", "Launches bile dealing magic damage and leaving a slowing trail.", [80, 130, 180, 230], "magic", [ap(0.55)], [11, 11, 11, 11]),
    ab("R", "Living Artillery", "Repeatedly fires long-range artillery dealing magic damage (per-rank base unconfirmed).", [], "magic", [], []),
  ],
  "taliyah": [
    ab("passive", "Rock Surfing", "Gains move speed when out of combat near walls.", [], "none", [], []),
    ab("Q", "Threaded Volley", "Hurls five rocks dealing magic damage; creates Worked Ground.", [40, 60, 80, 100], "magic", [ap(0.5)], [6, 5, 4, 3]),
    ab("W", "Seismic Shove", "Erupts a target area, knocking enemies in a chosen direction.", [], "none", [], [13, 11, 9, 7]),
    ab("E", "Unraveled Earth", "Scatters stones dealing magic damage and slowing; detonate on dash/knockback.", [65, 120, 175, 230], "magic", [ap(0.55)], [12, 12, 12, 12]),
    ab("R", "Weaver's Wall", "Raises a massive ridable wall that knocks enemies back as it forms.", [], "none", [], [94, 85, 75]),
  ],
  "ksante": [
    ab("passive", "Dauntless Instinct", "Damaging abilities mark enemies; attacking a marked target deals % max-health physical damage.", [], "physical", [], []),
    ab("Q", "Ntofo Strikes", "Slams for physical damage (scaling with bonus armor and MR) and slows; third hit knocks up.", [80, 120, 160, 200], "physical", [], [3, 3, 3, 3]),
    ab("W", "Path Maker", "Charges (unstoppable, damage reduction) then dashes, dealing % max-health physical damage.", [180, 280, 380, 480], "physical", [], [13, 12, 11, 10]),
    ab("E", "Footwork", "Dashes and gains a shield; can dash to an allied champion.", [], "none", [], [11, 10, 9, 8]),
    ab("R", "All Out", "Knocks a champion back and goes All Out, gaining stats and a reformed kit.", [80, 115, 150], "physical", [], [80, 70, 60]),
  ],
}


def main():
    champs = json.load(open(CHAMPS))
    by_id = {c["id"]: c for c in champs}
    for cid, abilities in BUILDS.items():
        by_id[cid]["abilities"] = abilities
        print(f"built {cid}: {len(abilities)} abilities")
    with open(CHAMPS, "w", encoding="utf-8") as fh:
        json.dump(champs, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


if __name__ == "__main__":
    main()
