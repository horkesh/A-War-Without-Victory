# Calibration Proposal: Structural Fixes for n256

**Date:** 2026-02-28
**Based on:** CALIBRATION_MASTER.md + OOB docs + BB KB (BB1/BB2 citations) + engine mechanics analysis
**Approach:** Material conditions + mechanic extension. No behavioral blocks, no faction hard-coding.
**Target:** >85% overall OSID match; casualty distribution approaching historical (ARBiH ~11.5k KIA at w40)

---

## Historical Grounding

### Why ARBiH had MORE casualties than VRS despite being defenders

Standard military doctrine: defenders take fewer casualties (BASE_DEFENDER=0.015 vs 0.03). This is
correct when defenders have the option to withdraw. ARBiH often did not:

- **"The harder and more grimly the Muslims fought"** as pushed toward their last positions (BB2 p556)
- **"Coldly determined to return to their homes"** — 7th Corps Donji Vakuf fighters (BB2 p484)
- Abdić kept civilians in Pecigrad because evacuating them would destroy defenders' will to fight (BB2 p538)
- Srebrenica defenders used "iron pipes filled with nails" and still held for weeks (BB2 p416)
- VRS lost **30 KIA + 100 wounded in ONE Srebrenica engagement** (BB2 p405)
- HV 81st Guards (400-500 elite troops) took **40 casualties to dislodge 120 defenders** at Previle Pass (BB1 p456)

**Pattern:** When defenders have nowhere to go (psychologically, not just geographically), BOTH sides
bleed heavily. Defenders absorb casualties rather than yield — and attackers pay dearly for each meter.

### Why the current engine understates this

The engine has a lastStand mechanic (×1.5 defender power, ×2 casualties both sides) that fires
when `retreatDests.length === 0` — complete geographic encirclement. This captures the most extreme
case. But ARBiH defenders fought with this psychology even when ONE adjacent friendly OSID remained,
because that OSID was the next line in the last stand, not safety.

Between "open front" (free retreat, low defender casualties) and "encircled" (no retreat, 2× casualties)
lies a zone the engine doesn't model: **homeland defense** — where defenders fight harder and absorb
more casualties because they're defending their home, not just territory.

---

## Fix 0: Morale System + Population Affinity Determination [NEW — Core mechanic]

### 0a: Morale as a new brigade field

**Morale** (new field, `morale: number // [0,100]`) is distinct from `cohesion`:

| Field | Represents | Effect |
|---|---|---|
| `cohesion` | Tactical effectiveness — how organized/trained | Multiplicative on combat power (existing) |
| `morale` | Willingness to fight — how much a unit WANTS to hold | Determines retreat resistance (new) |

A badly organized militia defending its home has LOW cohesion, HIGH morale.
A professional unit fighting for territory it doesn't care about has HIGH cohesion, LOW morale.
Currently the engine conflates these. They need to be separated.

**Files affected:**
- `src/state/game_state.ts` — add `morale?: number` to `FormationState`
- `src/sim/phase_ii/cohesion_drift.ts` — add parallel `morale_drift.ts` or morale drift step
- `src/sim/phase_ii/attack_resolution_osid.ts` — use morale in retreat resistance

### 0b: Population Affinity — the data hook

**Trigger:** When a brigade is in combat as defender, compute the **population affinity** of the
OSID being defended using the 1991 census data that the engine already maintains for displacement.

```
affinity = fraction of OSID 1991 population that shares ethnicity with defending faction
```

| Affinity | Example | Effect |
|---|---|---|
| > 0.70 | Bosniak defending 80% Bosniak Srebrenica OSID | Very high morale bonus |
| 0.40–0.70 | Bosniak defending mixed Brčko OSID | Moderate morale |
| < 0.30 | Bosniak defending Serb-majority OSID (occupied VRS territory) | Low morale, willing to yield |

**This data already exists.** The 1991 census population fractions are used in displacement
calculations. No new data collection needed — just read it in the combat resolver.

**Not faction-specific. Not location-specific.** VRS defenders of Serb-majority OSIDs also get
the bonus. HRHB defenders of Croat-majority OSIDs also get the bonus. Symmetric by design.

### 0c: Morale effect on retreat resistance

**How morale modifies the retreat decision:**

Currently: if attacker wins (`flip = true`), defender always retreats to best adjacent friendly.
New: before retreat, check morale-based reluctance:

```
retreatResistanceThreshold = lerp(MORALE_LOW_THRESHOLD, MORALE_HIGH_THRESHOLD, morale/100)
// MORALE_LOW_THRESHOLD  ~0.30  (low morale → retreats on any attacker win)
// MORALE_HIGH_THRESHOLD ~0.80  (high morale → requires decisive/victory to retreat)

if (outcome === 'costly_victory' && morale > MORALE_RESIST_FLOOR) {
  // Defender absorbs the outcome instead of retreating
  // Apply partial last-stand casualty multiplier (×1.35)
  // Territory does NOT flip
  // Morale drains from the beating
}
```

In plain terms: **high morale defenders absorb costly_victory outcomes without retreating.**
They take the casualties, hold the OSID, and their morale drops. Eventually morale runs low
enough that they yield — but only after absorbing far more than a low-morale unit would.

### 0d: Morale drift

Morale should drift based on:
- **High-affinity defense** (defending own population): morale +1–2/turn
- **Low-affinity defense** (defending enemy-population OSID): morale −1–2/turn
- **Sustained siege / encirclement** (no adjacent friendly): morale +3/turn for encircled defenders
  (the "cornered rat" effect, BB2 p556: fought harder when pushed closer to original positions)
- **Costly battle survived**: morale +1 (survived a hard fight)
- **Decisive defeat**: morale −5

**Encirclement INCREASES morale for own-population defenders** — this is the key historical
insight. Don't model encirclement as morale penalty (standard doctrine). Model it as morale
SPIKE for defenders protecting their own people.

### 0e: Effect on casualty distribution

| Scenario | Territory result | Attacker casualties | Defender casualties |
|---|---|---|---|
| High-morale stalemate | holds | 1.0× | 0.8× |
| High-morale absorbs costly_victory | holds instead of flipping | 1.8× | 1.2× — both bleed |
| Low-morale costly_victory | flips as today | 1.8× | 1.2× |
| Last stand (no retreat + high morale) | holds or annihilated | 2.0× | 2.0× (existing) |

ARBiH defending Zenica (high affinity, high morale): absorbs costly outcomes, both sides bleed.
ARBiH unit deep in RS-held territory (low affinity, low morale): retreats quickly, low casualties.
VRS defending Banja Luka from ARBiH counterattack: also gets affinity bonus, fights hard.

Net: ~30–50% more total casualties in high-affinity contested areas. ARBiH defender KIA rises
from ~775 (n254) toward ~5–8k, closer to historical ~11.5k at w40. Combined with more VRS
attacker casualties (harder fights), overall distribution approaches historical.

---

## Fix 1: Enclave Brigade Material Deprivation [Stops enclave offensives]

**File:** `data/source/oob_brigades.json`

Set all Srebrenica, Goražde, Žepa brigade compositions to infantry-only with low condition.

**Historical basis:**
- Srebrenica fighters had hunting rifles and improvised weapons (BB2 p416)
- Zero tanks, zero artillery, zero resupply in any enclave throughout 1992
- Arms embargo from day 1 of the war

**Specific changes** (all brigades with `municipality` in `["srebrenica", "gorazde", "zepa"]`):
```json
"composition": { "infantry": 1000, "tanks": 0, "art": 0, "aa": 0 },
"condition": 0.35–0.45
```

**Engine mechanism:** RBiH CRITICAL supply penalty = -300 per attack score. Zero heavy weapons
+ CRITICAL supply → attack scores go strongly negative → brigades organically stop attacking.
No behavioral blocks needed.

**Interaction with Fix 0:** Enclave brigades stop attacking (Fix 1) AND defend harder (Fix 0).
This is historically correct: Orić's men couldn't attack VRS positions, but they fought
desperately when VRS attacked the enclave.

**Expected:** DRINA 62.5% → ~80%+. RBiH attack orders drop from 87 to ~40–50.

---

## Fix 2: RS-HRHB Co-Ethnic Scoring Penalty [Stops RS attacking Croatian territory]

**File:** `src/sim/phase_ii/bot_brigade_ai_osid.ts`

**Historical basis:** No VRS-HVO open war in 1992. Herzegovina Corps was DEFENSIVE. VRS had no
reason to attack HRHB territory — if RS is doing so, it's because RS brigades are mispositioned
(not enough in Drina/Corridor) and scoring system finds HRHB OSIDs as convenient.

Add to OSID scoring when `faction === 'RS' && controllerFaction === 'HRHB'`:
- Outside Posavina corridor municipalities: **−400 score**
- Within Posavina (Orašje/Brčko/Gradačac area): **−100 score** (some RS-HVO conflict is historical there)

**Expected:** HRHB territory 83 → ~87–90 (target 89). RS redirects attacks to actual priorities.

---

## Fix 3: ARBiH 3rd Corps Corridor Weight [Holds Tešanj-Zavidovići]

**File:** `src/sim/phase_ii/bot_strategy.ts`

**Historical basis:** 3rd Corps (Zenica, ~15–20k men) held Tešanj-Maglaj-Zavidovići-Žepče
continuously throughout 1992–1993. This was ARBiH's core defensive mission in that region.

Change `Central Corridor Counter` priority:
- Weight: 80 → **120**
- Add `hold_osids` for: Tešanj, Maglaj, Zavidovići, Žepče key OSIDs

**Expected:** CORRIDOR 77.7% → ~87–90%.

---

## Fix 4: VRS Troop Count [116k → 100k target]

**File:** `src/sim/phase_i/pool_population.ts`

`FACTION_POOL_SCALE` RS: **0.35 → 0.30**

**Historical basis:** OOB master: VRS ~90–100k by December 1992.

Monitor: if RS territory drops below 405 after n256, this fix is too aggressive. May need 0.32.

---

## What Does NOT Change

- `avoided_osids` — Only `vozuca_2` stays
- RS offensive doctrine phases — RS territory (422) is already near target (416)
- HRHB brigade counts — at exact target
- `BASE_ATTACKER_LOSS_RATE` / `BASE_DEFENDER_LOSS_RATE` — the homeland determination mechanic
  achieves casualty uplift through multipliers, not raw rate changes. Keep base rates for now;
  revisit after n256 if casualty gap persists.

---

## Sequencing

1. **Fix 0** — Homeland determination (engine mechanic, most impactful for casualties)
2. **Fix 1** — Enclave material deprivation (OOB data change)
3. **Fix 2** — RS-HRHB scoring penalty (AI scoring addition)
4. **Fix 3** — 3rd Corps weight (strategy config)
5. **Fix 4** — Pool scale (population config)

Then run n256 and compare:
```
node tools/compare_painted_vs_sim.cjs runs/<n256_dir>
```

---

## Success Criteria for n256

| Metric | n254 | n256 Target | Notes |
|---|---|---|---|
| Overall match | 81.4% | >85% | |
| DRINA | 62.5% | >80% | Fix 0+1 |
| CORRIDOR | 77.7% | >85% | Fix 3 |
| HRHB territory | 83 OSIDs | 87–90 | Fix 2 |
| RS territory | 422 OSIDs | 410–425 | Fix 0 may help reduce slightly |
| VRS strength | 116k | 97–102k | Fix 4 |
| RBiH attack orders | ~87 | ~40–55 | Fix 1 |
| Defender total KIA | ~775 (3.1k × 0.25) | ~3,000+ | Fix 0 |
| Total KIA | ~6,750 | ~12–15k | Fix 0 primary driver |

**Do not optimize one metric at expense of others.**
If RS drops below 400, the RS-HRHB penalty or pool scale is too aggressive — back off Fix 2 or Fix 4.
