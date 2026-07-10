#!/usr/bin/env python3
"""Abilities for the remaining form/transform + hybrid champs (8-10 wiki blocks,
some also PC-contaminated). Primary form's 5 slots mapped from verified wiki lines;
where the wiki carried PC data (jayce, lee-sin E, nidalee Q/W, rell) the WR values
come from wildriftfire. Secondary-form blocks are dropped (schema has 5 slots).

Run: python3 tools/data-fill/build_form2.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CHAMPS = os.path.join(REPO, "data", "patches", "7.1", "champions.json")


def ab(slot, name, desc, dmg, dtype, scal, cd):
    return {"slot": slot, "name": name, "description": desc,
            "baseDamage": dmg, "damageType": dtype, "scalings": scal, "cooldown": cd}


def adr(r):  return {"stat": "attackDamage", "ratio": r}
def bad(r):  return {"stat": "bonusAttackDamage", "ratio": r}
def ap(r):   return {"stat": "abilityPower", "ratio": r}
def hp(r):   return {"stat": "maxHealth", "ratio": r}


BUILDS = {
  "rell": [
    ab("passive", "Break the Mold", "Attacks and abilities steal armor and magic resist from enemies hit.", [], "none", [], []),
    ab("Q", "Shattering Strike", "Thrusts her lance, dealing magic damage in a line and breaking shields.", [70, 130, 190, 250], "magic", [ap(0.6)], [11, 10, 9, 8]),
    ab("W", "Ferromancy: Crash Down / Mount Up", "Dismounts to slam down (dealing magic damage, knock up) or mounts up for speed.", [70, 100, 130, 160], "magic", [ap(0.6)], [9, 9, 9, 9]),
    ab("E", "Full Tilt", "Builds move speed for herself and a tethered ally; the tether can stun.", [], "none", [], [13, 13, 13, 13]),
    ab("R", "Magnet Storm", "Pulls nearby enemies toward her repeatedly, dealing magic damage.", [120, 200, 280], "magic", [], [75, 70, 65]),
  ],
  "zeri": [
    ab("passive", "Living Battery", "Moving and shielding charges her; the charge empowers her next Burst Fire.", [], "none", [], []),
    ab("Q", "Burst Fire", "Fires a burst of shots (a charged shot when empowered) dealing magic damage.", [35, 60, 85, 110], "magic", [adr(0.55), ap(0.3)], [7.5, 6, 4.5, 3]),
    ab("W", "Ultrashock Laser", "Fires a long-range laser that damages and slows the first enemy hit.", [30, 70, 110, 150], "magic", [adr(0.8), ap(0.4)], [12, 11, 10, 9]),
    ab("E", "Spark Surge", "Dashes and vaults small walls; empowers her next few attacks.", [], "none", [], [22, 19.5, 17, 14.5]),
    ab("R", "Lightning Crash", "Discharges an AoE burst and overcharges, ramping damage with takedowns.", [150, 200, 250], "magic", [bad(0.7), ap(0.8)], [70, 65, 60]),
  ],
  "aurelion-sol": [
    ab("passive", "Cosmic Creator", "Stardust from abilities permanently increases his ability damage and stats.", [], "none", [], []),
    ab("Q", "Breath of Light", "Channels a sustained beam dealing magic damage per second to enemies.", [55, 65, 75, 85], "magic", [ap(0.35)], [3, 3, 3, 3]),
    ab("W", "Astral Flight", "Flies in a direction, able to keep casting Breath of Light.", [], "none", [], [18, 17, 16, 15]),
    ab("E", "Singularity", "Forms a black hole that pulls and deals magic damage per tick.", [4, 5.5, 7, 8.5], "magic", [ap(0.03)], [12, 12, 12, 12]),
    ab("R", "Falling Star / The Skies Descend", "Drops a star that stuns and deals magic damage; empowered at max Stardust.", [150, 250, 350], "magic", [ap(0.65)], [85, 80, 75]),
  ],
  "gnar": [
    ab("passive", "Rage Gene", "Builds Rage in combat; at full Rage his next ability transforms him into Mega Gnar.", [], "none", [], []),
    ab("Q", "Boomerang Throw / Boulder Toss", "Throws a boomerang (Mini) or boulder (Mega) dealing physical damage.", [5, 55, 105, 155], "physical", [adr(1.25)], [16, 14, 12, 10]),
    ab("W", "Hyper / Wallop", "Third attack deals bonus magic damage (Mini); Mega stuns in a line.", [10, 20, 30, 40], "magic", [], [20, 19, 18, 17]),
    ab("E", "Hop / Crunch", "Leaps off enemies dealing physical damage based on max health.", [50, 95, 140, 185], "physical", [hp(0.06)], [21, 18, 15, 12]),
    ab("R", "GNAR!", "As Mega Gnar, knocks enemies back, dealing physical damage and stunning against walls.", [200, 300, 400], "physical", [bad(0.5)], [60, 45, 30]),
  ],
  "jayce": [
    ab("passive", "Hextech Capacitor", "Transforming grants a burst of move speed and can pass through units.", [], "none", [], []),
    ab("Q", "To the Skies! / Shock Blast", "Leaps to an enemy (Hammer) or fires an orb (Cannon) for physical damage.", [70, 120, 170, 220], "physical", [bad(1.4)], [14, 12, 10, 8]),
    ab("W", "Lightning Field / Hyper Charge", "Aura of magic damage (Hammer) or an attack-speed burst (Cannon).", [40, 57.5, 75, 92.5], "magic", [ap(0.25)], [10, 10, 10, 10]),
    ab("E", "Thundering Blow / Acceleration Gate", "Knocks an enemy back for % max-health magic damage (Hammer) or a speed gate (Cannon).", [], "magic", [], [18, 16, 14, 12]),
    ab("R", "Mercury Cannon / Mercury Hammer", "Transforms between ranged and melee stances, empowering the next ability.", [], "none", [], [5, 5, 5, 5]),
  ],
  "khazix": [
    ab("passive", "Unseen Threat", "While unseen by enemies, his next attack deals bonus magic damage and slows.", [], "magic", [], []),
    ab("Q", "Taste Their Fear", "Strikes a target for physical damage, increased against Isolated targets.", [75, 110, 145, 180], "physical", [bad(1.3)], [5, 4.5, 4, 3.5]),
    ab("W", "Void Spike", "Fires spikes that deal physical damage and heal him if Isolated.", [70, 110, 150, 190], "physical", [bad(1.0)], [9, 9, 9, 9]),
    ab("E", "Leap", "Leaps to an area, dealing physical damage on landing.", [65, 110, 155, 200], "physical", [bad(0.2)], [18, 16, 14, 12]),
    ab("R", "Void Assault", "Enters stealth and gains bonus damage; recastable, and evolves his abilities.", [], "none", [], [75, 65, 55]),
  ],
  "lee-sin": [
    ab("passive", "Flurry", "After casting an ability, his next two attacks gain attack speed and restore energy.", [], "none", [], []),
    ab("Q", "Sonic Wave / Resonating Strike", "Fires a wave for physical damage, then can dash to the marked target for more.", [55, 90, 125, 160], "physical", [bad(1.0)], [8, 7, 6, 5]),
    ab("W", "Safeguard / Iron Will", "Dashes to a target and shields; recast grants lifesteal and spell vamp.", [], "none", [], [15, 14, 14, 13]),
    ab("E", "Tempest / Cripple", "Smashes the ground for magic damage and reveal; recast slows enemies hit.", [90, 140, 190, 240], "magic", [adr(1.25)], [8, 8, 8, 8]),
    ab("R", "Dragon's Rage", "Roundhouse kicks a champion, knocking them back into other enemies.", [100, 250, 400], "physical", [bad(1.8)], [70, 60, 50]),
  ],
  "nidalee": [
    ab("passive", "Prowl", "Gains move speed in brush; marks low-health enemies (Hunted) for bonus effects.", [], "none", [], []),
    ab("Q", "Javelin Toss / Takedown", "Throws a javelin dealing more magic damage the farther it travels (Human form).", [90, 120, 150, 180], "magic", [ap(0.5)], [5, 5, 5, 5]),
    ab("W", "Bushwhack / Pounce", "Lays a trap that damages and reveals (Human); Cougar form pounces.", [10, 20, 30, 40], "magic", [ap(0.2)], [12, 11, 10, 9]),
    ab("E", "Primal Surge / Swipe", "Heals an ally and grants attack speed (Human); Cougar form claws in a cone.", [], "none", [], [12, 12, 12, 12]),
    ab("R", "Aspect of the Cougar", "Transforms into a cougar, swapping to her Takedown/Pounce/Swipe abilities.", [], "none", [], [3, 3, 3]),
  ],
  "heimerdinger": [
    ab("passive", "Hextech Affinity", "Gains move speed near allied turrets and his own deployables.", [], "none", [], []),
    ab("Q", "H-28G Evolution Turret", "Deploys a turret that fires beams at enemies; stores charges over time.", [], "magic", [], [1, 1, 1, 1]),
    ab("W", "Hextech Micro-Rockets", "Fires a spread of rockets that converge, dealing magic damage.", [60, 85, 110, 135], "magic", [ap(0.6)], [10, 9, 8, 7]),
    ab("E", "CH-2 Electron Storm Grenade", "Throws a grenade dealing magic damage, stunning the center and slowing.", [70, 120, 170, 220], "magic", [ap(0.6)], [11, 11, 11, 11]),
    ab("R", "UPGRADE!!!", "Empowers his next basic ability with a stronger special version.", [], "none", [], [80, 70, 60]),
  ],
  "shyvana": [
    ab("passive", "Fury of the Dragonborn", "Gains stats per dragon slain and builds Fury to transform with her ultimate.", [], "none", [], []),
    ab("Q", "Twin Bite", "Strikes twice; the second hit applies on-hit effects (cleaves in dragon form).", [], "physical", [adr(0.2)], [8.5, 7.5, 6.5, 5.5]),
    ab("W", "Burnout", "Surrounds herself with fire dealing magic damage per second and gaining move speed.", [35, 50, 65, 80], "magic", [bad(0.3)], [13, 12, 11, 10]),
    ab("E", "Flame Breath", "Launches a fireball that deals magic damage and leaves a debuff.", [60, 110, 160, 210], "magic", [adr(0.3), ap(0.4)], [11, 10, 9, 8]),
    ab("R", "Dragon's Descent", "Transforms into a dragon, flying to a location and dealing magic damage.", [150, 250, 350], "magic", [ap(0.8)], []),
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
