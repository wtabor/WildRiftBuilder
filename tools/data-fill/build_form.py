#!/usr/bin/env python3
"""Hand-built abilities for form/transform champs whose wiki pages have >5 ability
blocks (recasts / secondary forms). Each champ's 5 schema slots are mapped from the
verified wiki damage/cooldown lines (see tools/data-fill/out/<id>.wiki.json _raw),
folding recast blocks into their parent slot. Values cross-checked vs wildriftfire.

Run: python3 tools/data-fill/build_form.py   (writes directly into champions.json)
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CHAMPS = os.path.join(REPO, "data", "patches", "7.1", "champions.json")


def ab(slot, name, desc, dmg, dtype, scal, cd):
    return {"slot": slot, "name": name, "description": desc,
            "baseDamage": dmg, "damageType": dtype, "scalings": scal, "cooldown": cd}


def ad(r):  return {"stat": "attackDamage", "ratio": r}
def bad(r): return {"stat": "bonusAttackDamage", "ratio": r}
def ap(r):  return {"stat": "abilityPower", "ratio": r}


BUILDS = {
  "riven": [
    ab("passive", "Runic Blade", "Abilities charge a stack; the next basic attack expends stacks for bonus physical damage.", [], "none", [], []),
    ab("Q", "Broken Wings", "Strikes in a line up to three times, dealing physical damage.", [30, 55, 80, 105], "physical", [bad(0.55)], [12, 12, 12, 12]),
    ab("W", "Ki Burst", "Stuns and damages nearby enemies.", [55, 95, 135, 175], "physical", [bad(1.0)], [8.5, 8, 7.5, 7]),
    ab("E", "Valor", "Dashes and gains a shield.", [], "none", [], [9, 8, 7, 6]),
    ab("R", "Blade of the Exile", "Empowers her blade; recast fires Wind Slash dealing physical damage scaling with missing health.", [100, 150, 200], "physical", [bad(0.6)], [75, 60, 45]),
  ],
  "senna": [
    ab("passive", "Absolution", "Collects Mist from dead units to permanently gain attack damage and range.", [], "none", [], []),
    ab("Q", "Piercing Darkness", "Fires through allies (healing) and enemies (damaging).", [50, 90, 130, 170], "physical", [bad(0.6)], [15, 15, 15, 15]),
    ab("W", "Last Embrace", "Roots the first enemy hit (and nearby enemies after a delay).", [90, 155, 220, 285], "physical", [bad(0.7)], [11, 11, 11, 11]),
    ab("E", "Curse of the Black Mist", "Wraiths herself and nearby allies, granting camouflage.", [], "none", [], [22, 20, 18, 16]),
    ab("R", "Dawning Shadow", "Global laser that shields allies and damages enemies.", [250, 375, 500], "physical", [bad(1.2), ap(0.5)], [85, 80, 75]),
  ],
  "sion": [
    ab("passive", "Glory in Death", "On death, reanimates with rapidly-draining health and empowered attacks.", [], "none", [], []),
    ab("Q", "Decimating Smash", "Charges then swings, dealing physical damage and knocking up if fully charged.", [50, 75, 100, 125], "physical", [bad(0.45)], [9, 8, 7, 6]),
    ab("W", "Soul Furnace", "Shields himself, then can detonate to deal magic damage.", [60, 90, 120, 150], "magic", [ap(0.4)], [14, 13, 12, 11]),
    ab("E", "Roar of the Slayer", "Fires a projectile that damages and slows.", [75, 120, 165, 210], "magic", [ap(0.55)], [11, 10, 9, 8]),
    ab("R", "Unstoppable Onslaught", "Charges in a direction, dealing physical damage and knocking up.", [150, 300, 450], "physical", [bad(0.4)], [90, 70, 50]),
  ],
  "skarner": [
    ab("passive", "Threads of Vibration", "Attacks and abilities stack a mark that, when full, immobilizes.", [], "none", [], []),
    ab("Q", "Shattered Earth / Upheaval", "Empowers attacks, then can hurl terrain dealing physical damage.", [15, 30, 45, 60], "physical", [bad(1.0)], [6.8, 5.53, 4.27, 3]),
    ab("W", "Seismic Bastion", "Gains a shield and damages nearby enemies with a shockwave.", [50, 70, 90, 110], "magic", [ap(0.8)], [9, 8, 7, 6]),
    ab("E", "Ixtal's Impact", "Dashes, knocking aside enemies and dealing physical damage.", [60, 90, 120, 150], "physical", [bad(1.2)], [20, 18, 16, 14]),
    ab("R", "Impale", "Suppresses up to two champions, carrying them and dealing magic damage.", [150, 250, 350], "magic", [ap(1.0)], [80, 70, 60]),
  ],
  "swain": [
    ab("passive", "Ravenous Flock", "Pulls Soul Fragments from immobilized/dead enemies for permanent health.", [], "none", [], []),
    ab("Q", "Death's Hand", "Fires bolts in a cone dealing magic damage.", [55, 90, 125, 160], "magic", [ap(0.32)], [6, 5, 4, 3]),
    ab("W", "Vision of Empire", "Reveals and damages a distant area, slowing enemies hit.", [80, 130, 180, 230], "magic", [ap(0.55)], [21, 20, 19, 18]),
    ab("E", "Nevermove", "Throws a wave that roots, then pulls enemies on return.", [35, 85, 135, 185], "magic", [ap(0.25)], [10, 10, 10, 10]),
    ab("R", "Demonic Ascension / Demonflare", "Drains nearby enemies; recast erupts for burst magic damage.", [150, 225, 300], "magic", [ap(0.45)], [75, 65, 55]),
  ],
  "ambessa": [
    ab("passive", "Drakehound's Step", "Repositioning dashes; reduces ability cooldowns on use.", [], "none", [], []),
    ab("Q", "Cunning Sweep / Sundering Slam", "Slashes behind then in front, dealing physical damage.", [30, 40, 50, 60], "physical", [bad(0.3)], [12, 11, 10, 9]),
    ab("W", "Repudiation", "Channels a guard, then strikes for increased physical damage if she blocked.", [70, 100, 130, 160], "physical", [bad(0.8)], [17, 16, 15, 14]),
    ab("E", "Lacerate", "Throws blades out and back, dealing physical damage.", [40, 80, 120, 160], "physical", [bad(0.5)], [11, 10, 9, 8]),
    ab("R", "Public Execution", "Dashes to a champion, knocking them up and dealing heavy physical damage.", [200, 300, 400], "physical", [bad(0.2)], [80, 70, 60]),
  ],
  "camille": [
    ab("passive", "Adaptive Defenses", "Attacking a champion grants a shield against their primary damage type.", [], "none", [], [18, 16, 14, 12]),
    ab("Q", "Precision Protocol", "Empowers the next attack for bonus physical damage; recast within the window for more.", [], "physical", [ad(1.3)], [9, 8, 7, 6]),
    ab("W", "Tactical Sweep", "Cone strike; the outer half deals bonus % max-health physical damage and heals.", [100, 130, 160, 190], "physical", [bad(1.1)], [15, 13, 11, 9]),
    ab("E", "Hookshot / Wall Dive", "Grapples to terrain, then dashes off it to stun and deal physical damage.", [60, 110, 160, 210], "physical", [bad(0.75)], [22, 20, 18, 16]),
    ab("R", "The Hextech Ultimatum", "Traps a champion in a zone, knocking other enemies away.", [], "none", [], [90, 80, 70]),
  ],
  "fizz": [
    ab("passive", "Seastone Trident", "Attacks deal bonus magic damage over time.", [], "none", [], []),
    ab("Q", "Urchin Strike", "Dashes through the target, dealing magic damage.", [20, 40, 60, 80], "magic", [ap(0.6)], [8, 7.5, 7, 6.5]),
    ab("W", "Rending Wave", "Empowers the next attack for bonus magic damage and on-hit damage over time.", [50, 75, 100, 125], "magic", [ap(0.45)], [10, 9.5, 9, 8.5]),
    ab("E", "Playful / Trickster", "Hops onto his trident (untargetable), then slams for magic damage and a slow.", [80, 150, 220, 290], "magic", [ap(0.8)], [16, 14, 12, 10]),
    ab("R", "Chum the Waters", "Tosses a lure that attaches to a champion, dealing magic damage and knocking up.", [150, 250, 350], "magic", [ap(0.6)], [85, 70, 55]),
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
