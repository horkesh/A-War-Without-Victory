# Plan: n500 Defense Floor, Uncontested Occupation, and Bihać Stabilization

**Date:** 2026-03-10
**Context:** n500 achieved 6/6 benchmarks with ops-only + unified sector defense + attack-through, but 100% attack success rate, Bihać collapse, and Čardak stagnation reveal three structural gaps.
**Historian consulted:** BB1/BB2 citations below.

---

## Problem Statement

Three issues cascading from n500's structural changes:

1. **100% attack success rate** — Unified sector defense divides total power by edge count, producing trivially low per-edge defense. Even weak attacks generate 5-10× power ratios. Historically: VRS succeeded ~70-80% early war, dropping to ~20-30% by late 1992.

2. **Bihać Krajina pocket collapses** — RS holds 68/70 OSIDs. Historically, Bihać held as an enclave throughout 1992-95. 5th Corps under Dudaković (initially Dreković) was among ARBiH's most effective. VRS 2nd Krajina Corps repeatedly failed to take the Grabež plateau (BB2 p.534). Current sim: every RS attack succeeds → pocket erased by w30.

3. **Čardak never captured** — RS OSID surrounded by 4 RBiH + 1 HRHB neighbors sits uncaptured for 40 weeks. Three mechanisms fail: paramilitary fade (>w20), rear pocket consolidation (mixed-faction surrounding), ops-only doctrine (no independent movement into empty territory).

**Root cause cascade:** Fix #1 (defense floor) → fixes #2 (Bihać holds because attacks fail) → #3 is independent and needs its own fix.

---

## Design Principles

- **Organic, not phase-switched.** No `if (turn < 12)` hacks. Defense strength emerges from the same formula at all times.
- **Historically grounded.** Attack success curve: 70-80% early → 40-50% mid → 20-30% late. This emerges from entrenchment growth + reinforcement, not a timer.
- **Minimal intervention.** Each fix touches the fewest lines possible. No refactoring adjacent systems.

---

## Change 1: Minimum Defense Floor Per Edge (P0)

### Problem
`defenderPower = totalPower × (1/edges) × densityMod` produces trivially low values when edges >> brigades.

Example: 6 brigades (5,040 power) / 20 edges × 0.60 density penalty = **151 defense** vs **840 attack** = ratio 5.56 → decisive.

### Fix
Add a minimum floor: defense per edge cannot be less than a fraction of a single brigade's average power.

```typescript
// combat_math.ts — new constant
export const MIN_DEFENSE_FLOOR_FRACTION = 0.40; // 40% of avg brigade power

// attack_resolution_osid.ts line ~505 and combat_predictor.ts line ~218
const avgBrigadePower = totalPower / sectorBrigades.length;
const minFloor = avgBrigadePower * MIN_DEFENSE_FLOOR_FRACTION;
defenderPower = Math.max(totalPower * edgeShare * densityMod, minFloor);
```

### Expected effect
- Example becomes: `max(151, 840 × 0.40) = max(151, 336) = 336`
- Ratio: `840 / 336 = 2.5` → decisive but close to threshold
- Thin sectors still weaker than dense ones (floor vs full power)
- Dense sectors (≥1 brigade/edge) unaffected — formula already produces values above floor
- **Tune `MIN_DEFENSE_FLOOR_FRACTION` to hit ~40-60% attack success rate overall**

### Historical calibration target
- **w1-w8:** ~70-80% VRS success (low entrenchment, ARBiH disorganized)
- **w9-w20:** ~40-50% (entrenchment growing, defenders digging in)
- **w21-w40:** ~20-30% (mature positions, positional warfare)
- The floor constant doesn't change over time — the organic transition comes from entrenchment growth, fatigue accumulation, and defender reinforcement increasing `totalPower` over time.

### Files changed
- `src/sim/combat/combat_math.ts` — add `MIN_DEFENSE_FLOOR_FRACTION` constant
- `src/sim/combat/attack_resolution_osid.ts` — apply floor (~line 505)
- `src/sim/combat/combat_predictor.ts` — mirror floor (~line 218)

### Acceptance criteria
- Run 40w. Attack success rate drops from 100% to 40-60% overall.
- Bihać pocket survives (RBiH holds ≥50% of Bihać/Cazin/Velika Kladuša OSIDs at w40).
- RS still advances in early war — floor should NOT prevent all attacks from succeeding.
- 6/6 benchmarks still pass.

---

## Change 2: Uncontested Occupation (P1)

### Problem
Ops-only doctrine prevents brigades from walking into adjacent undefended enemy OSIDs. A brigade standing next to an empty enemy field needs a corps-level operation to take one step forward. In the real war, abandoned territory was occupied within hours to 1-2 days (BB1).

### Fix
Add a single exception in `evaluateOffensive` (or a new `evaluateUncontestedOccupation` step): a brigade adjacent to an undefended enemy OSID can move in without an operation.

**"Undefended"** means:
- No enemy formations at the OSID
- No enemy formations in any sector that covers the OSID (i.e., the unified sector defense produces zero totalPower — no sector brigades)
- The OSID is controlled by an enemy faction

**Guard rails:**
- Maximum 1 uncontested occupation per brigade per turn
- Brigade must not be in an active operation (operation participants follow their op orders)
- Brigade must be in `defend` or `hold` posture (not disrupted, not in column march)
- No attack resolution needed — just flip control + move brigade

### Historical grounding
"When a position was abandoned, the other side would typically occupy it within hours to 1-2 days if there were road access" — BB research. This was universal across all factions. No commander waits for a formal operation order to walk into an empty field.

### Critical: This also fixes Jajce
VRS 1st Krajina has 6+ brigades at `op:jajce:prisoje` with Jajce in offensive targets. HRHB holds 3 Jajce OSIDs (barevo_2, divicani_2, lupnica) with **zero defending brigades** — HVO has no formations with home in Jajce municipality. Graz Accords do NOT block this (VRS 1st Krajina is not in any Graz corps pair; central Bosnia explicitly uncovered). The sole blocker is ops-only doctrine refusing to attack empty territory. Uncontested occupation lets VRS walk in. Historically, Jajce fell Oct 29, 1992 (~w25); in the sim it should fall even earlier given no HVO defense.

### Files changed
- `src/sim/combat/bot_brigade_eval_attack.ts` — add `evaluateUncontestedOccupation()` before `evaluateOffensive()` in the evaluation chain
- `src/sim/combat/attack_resolution_osid.ts` — may need a lightweight "uncontested flip" function (no combat, just control change + formation move)

### Acceptance criteria
- Čardak captured by RBiH within a few turns of becoming surrounded
- No false positives — brigades don't walk into defended territory via this path
- Uncontested captures show in control_change_attribution as new bucket (not combat)

---

## Change 3: Allied-Faction Rear Pocket Consolidation (P1)

### Problem
`rear_pocket_consolidation.ts` requires ALL external neighbors to be the SAME faction. Čardak has 4 RBiH + 1 HRHB neighbor → consolidation skipped. In 1992, RBiH and HRHB were functionally allied (BB2 pp.486-500; Shrader 2003). Mixed-control areas were common in central Bosnia.

### Fix
Add a co-belligerent check: before the Croat-Bosniak war erupts (tracked by `state.war_timeline` or a turn threshold), treat RBiH and HRHB as the same side for rear pocket consolidation.

```typescript
// rear_pocket_consolidation.ts ~line 95
function areCobelligerent(factionA: string, factionB: string, state: GameState): boolean {
    // Pre-Croat-Bosniak war: RBiH and HRHB are allies
    // Graz is RS↔HRHB truce; this is the inverse — RBiH↔HRHB cooperation
    if ((factionA === 'RBiH' && factionB === 'HRHB') ||
        (factionA === 'HRHB' && factionB === 'RBiH')) {
        // Active until Croat-Bosniak war trigger (timeline-driven, ~w44-52)
        return !isCroatBosnjakWarActive(state);
    }
    return false;
}
```

The surrounding-faction check becomes: `nCtrl !== surroundingFaction && !areCobelligerent(nCtrl, surroundingFaction, state)`.

### Historical grounding
"Personnel, supplies, and even units moved relatively freely between areas held by each faction [in 1992]. This changed dramatically in January-April 1993." — BB research. The sim's 40w window (Apr 1992 → Jan 1993) is entirely within the cooperation period.

### Files changed
- `src/sim/combat/rear_pocket_consolidation.ts` — add co-belligerent check (~line 95-107)
- May need to consult `src/sim/local_truces.ts` or `src/state/war_timeline.ts` for the Croat-Bosniak war trigger

### Acceptance criteria
- Čardak auto-flips to RBiH (or HRHB, depending on majority surrounding faction)
- Post-1993 (when Croat-Bosniak war fires): mixed RBiH/HRHB surrounding no longer counts as allied — consolidation correctly stops

---

## Change 4: 504th Brigade OOB Fix (P2)

### Problem
504th is defined as mandatory/available_from=0 but **never activates** (activation_turn: null in n500 save). Meanwhile it's the largest 5th Corps asset at 1,200 initial personnel.

### Historical finding (BB2)
- **Correctly named:** "504th Cazin Light Brigade" (not "Viteška Mountain"). Viteška honorific awarded later.
- **Home:** Cazin, not Bihać (BB2 p.537)
- **Formation date:** Likely mid-to-late 1992, similar to 503rd (est. ~23 Aug 1992)
- **Equipment class:** Light, not mountain

### Fix
```json
{
  "id": "arbih_504th_cazin_light",
  "name": "504th Cazin Light Brigade",
  "home_mun": "cazin",
  "home_osid": "op:cazin:sturlic_2",  // or appropriate Cazin OSID
  "default_equipment_class": "light",
  "available_from": 18,  // ~August 1992, matching 503rd formation wave
  "mandatory": true,
  "initial_personnel": 1200,
  "initial_cohesion": 50  // new formation, lower readiness
}
```

### Additional investigation needed
Why does the current 504th (available_from=0, mandatory=true) not activate? Is there a spawn gate blocking it? This needs debugging before the OOB fix to ensure the corrected brigade actually spawns at turn 18.

### Files changed
- `data/source/oob_brigades.json` — update 504th definition
- Investigate spawn pipeline if activation still fails

---

## Execution Sequence

```
Change 1 (defense floor)          ← P0, do first — fixes Bihać cascade
    ↓ run 40w, verify attack success ~40-60%, Bihać holds
Change 2 (uncontested occupation)  ← P1, independent of Change 1
Change 3 (allied consolidation)    ← P1, independent of Change 1
    ↓ run 40w, verify Čardak + similar pockets flip
Change 4 (504th OOB fix)          ← P2, independent
    ↓ run 40w, verify 504th spawns at ~w18, reinforces Bihać pocket
Final calibration run              ← verify 6/6 benchmarks, attack distribution
```

Changes 2 and 3 can be done in parallel. Change 4 can be done in parallel with 2+3 but verify after.

---

## HVO Attacks — Not a Priority

Per user direction: HVO already controls Mostar-area territory it should control by end of its summer 1992 offensive. The 0-attack count for HRHB is acceptable for the 40w window. HVO offensive activity is a future concern for the 1993+ Croat-Bosniak war period, not the current calibration target.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Defense floor too high → attacks never succeed | Start at 0.40, tune down if needed. Floor only applies to thin sectors. |
| Defense floor causes RS benchmark regression | RS early-war advantage comes from equipment + experience, not defense weakness. Floor affects both sides equally. If RS regresses, lower floor or add equipment bonus. |
| Uncontested occupation creates land-grab race | Guard: only adjacent, only defend/hold posture, only truly empty (no sector defense). |
| Allied consolidation flips territory wrong faction gets | Assign to the faction with majority surrounding OSIDs, not the first one found. |
| 504th activation still fails after OOB fix | Debug spawn pipeline separately — may be a formation_spawn_directive or pool issue. |

---

## Historical Reference (BB-cited)

- **VRS attack success 1992:** ~80-90% Apr-Jun (blitzkrieg), ~50-60% Jul-Oct, ~20-30% Nov-Jan 1993 (BB1 passim; Burg & Shoup 1999 pp.129-135)
- **Bihać pocket resilience:** VRS 2nd Krajina repeatedly failed to take Grabež plateau (BB2 p.534). Pocket contracted to ~800-1000 km² at worst but never fell.
- **Territory occupation speed:** Hours to 1-2 days for road-accessible, days to a week for cross-country (BB1 general pattern)
- **ARBiH-HVO cooperation 1992:** Functionally allied, free movement, mixed control in central Bosnia (BB2 pp.486-500; Shrader 2003 chs.1-3)
- **504th Brigade:** "504th Cazin Light Brigade", Cazin-based, formed mid-1992, partially defected to Abdić Sept 1993 (BB2 pp.433, 537)
