# Brigade Discipline, Combat Fatigue, and Reserve Cap (n472)

**Date:** 2026-03-04
**Run ID:** n472 (`apr1992_definitive_40w__137cf28f1ee0a9c8__w40_n472`)
**Baseline:** n471 — 650/744 (87.4%), 90.0% area-weighted
**Result:** n472 — 652/744 (87.6%), 89.7% area-weighted

---

## Summary

- Implemented three mechanic changes to improve brigade realism: (1) hard directive block preventing autonomous off-directive attacks, (2) combat-activity-based fatigue replacing inert Phase I system, (3) RESERVE_PER_EDGE_CAP reduction from 0.5 → 0.07 to cap each sector at ~1 reserve brigade.
- Net calibration effect: CENTRAL_BOSNIA improved dramatically (+8.7pp count, from 78.4% → 87.1%) at the cost of CENTRAL_CORRIDOR regression (-3.2pp, 90.4% → 87.2%); overall area-weighted slightly lower (-0.3pp). Count-based improved (+0.2pp, 87.4% → 87.6%).
- Post-investigation: the "HRHB Krajina mismatches" flagged during n472 analysis are **init-based** (ethnic Croat composition in those specific cells) — not caused by n472 changes. They appear in initial_save from the beginning of the run.

---

## Changes Made

### 1. Brigade Directive Discipline — Hard Block (`bot_brigade_ai_osid.ts`)

**Problem:** Even with a large non-priority penalty (-145 for RS offensive), brigades could still attack undefended non-directive targets (score = 100 decisive + 100 undefended - 145 = +55 > 0). Brigades were moving across the map opportunistically, ignoring corps orders.

**Solution:** Hard block added before `finalScore <= 0` check. Brigades may only attack OSIDs that are in `effectiveDirective.offensive_targets`. Counter-attacks (brigade retreated from that OSID last turn) are the sole autonomous exception.

```typescript
// Directive discipline: brigades only attack corps-ordered targets.
if (!effectiveDirective.offensive_targets.includes(s.osid) && counterAttackTarget !== s.osid) continue;
```

**Additional cleanup:** Removed the old "frontier pressure" mechanic (`+15 score for targets adjacent to directive targets`) which was an earlier, weaker attempt at the same problem. Removed the now-dead `hasDirectiveTargetAdj` variable.

**Effect:** CENTRAL_BOSNIA improved 78.4% → 87.1% (Travnik/Bugojno/Vares area now better contested since RS brigades no longer freely pick off isolated HRHB/RBiH positions).

### 2. Reserve Cap Reduction (`corps_front_sectors.ts`)

**Problem:** `RESERVE_PER_EDGE_CAP = 0.5` allowed `ceil(18 × 0.5) = 9` reserve brigades in an 18-edge sector. Far too many reserves — brigades piling up in rear.

**Solution:** Reduced to `RESERVE_PER_EDGE_CAP = 0.07`. This gives:
- 14-edge sector → max 1 reserve (ceil(14 × 0.07) = 1)
- 15-28 edge sector → max 2 reserves
- 29+ edge sector → max 3 reserves

Matches the user directive: "each sector should have maybe one in reserve, not like 9."

### 3. Combat-Activity Fatigue (`attack_resolution_osid.ts`, `formation_fatigue.ts`, `war_phases.ts`)

**Problem:** The Phase I `updateFormationFatigue()` function only incremented fatigue for formations with `assignment` (edge/region kind). Phase II OSID brigades have `location_osid` but no `assignment`, so all were always treated as "supplied" and accumulated zero fatigue — ever.

**Solution:** Combat-activity fatigue added directly in `attack_resolution_osid.ts`:
- Attacker formations: +2 fatigue per battle
- Defender formation: +1 fatigue per battle
- Maximum cap: 20
- `FormationOpsState.fatigue` field populated (with `last_supplied_turn: null` to satisfy type)

Recovery via `applyFatigueRecovery()` (new function in `formation_fatigue.ts`):
- -1 fatigue per turn for all active formations
- Called from `update-formation-fatigue` pipeline step, BEFORE the Phase I `updateFormationFatigue` call

The Phase I supply-assignment fatigue mechanism (`updateFormationFatigue`) remains but is effectively inert for Phase II brigades — combat-activity fatigue supersedes it.

**`war_phases.ts` update:**
```typescript
{
    name: 'update-formation-fatigue',
    run: (context) => {
        applyFatigueRecovery(context.state); // combat fatigue recovery first
        const edges = context.input.settlementEdges;
        if (!edges) return;
        // ... Phase I supply-assignment fatigue follows
    }
}
```

---

## Scenario Results

### OSID Match Rate

| Metric | n471 | n472 | Delta |
|--------|------|------|-------|
| Count match | 650/744 (87.4%) | 652/744 (87.6%) | +0.2pp |
| Area-weighted | 90.0% | 89.7% | -0.3pp |

### Regional Breakdown

| Region | n471 | n472 | Delta |
|--------|------|------|-------|
| CENTRAL_BOSNIA | 78.4% | 87.1% | **+8.7pp** |
| CENTRAL_CORRIDOR | 90.4% | 87.2% | **-3.2pp** |
| KRAJINA | ~91% | 91.6% | ~flat |
| POSAVINA_NE | ~86% | 86.2% | ~flat |
| DRINA | ~80% | 80.5% | ~flat |
| SARAJEVO | ~84% | 83.9% | ~flat |
| HERZEGOVINA | ~96% | 95.7% | ~flat |

### Faction OSID Totals

| Faction | Painted | n472 Sim | Delta |
|---------|---------|----------|-------|
| RS | 411 | 395 | -16 |
| RBiH | 246 | 252 | +6 |
| HRHB | 87 | 97 | +10 |

**Note on HRHB +10:** All 10 extra HRHB cells (banja_luka:dragocaj, banja_luka:potkozarje_3, bosanska_gradiska:mackovac, prijedor:raljas, odzak:bosanski_samac, orasje:ostra_luka, teslic:kamenica_2, jablanica:doljani_2, kiseljak:brnjaci_2) are present in the `initial_save` as HRHB — they are init-based due to ethnic Croat composition in those cells. These were also present in n471, n465, and earlier runs. Not a regression from n472 changes.

### Troop Strengths (Week 40)

| Faction | Brigade Personnel |
|---------|-------------------|
| ARBiH (RBiH) | 99,537 |
| VRS (RS) | 76,450 |
| HVO (HRHB) | 36,218 |

### Military Casualties (Week 40)

| Faction | KIA | WIA | MIA |
|---------|-----|-----|-----|
| ARBiH | 10,252 | 19,610 | 0 |
| VRS | 12,645 | 24,265 | 0 |
| HVO | 6,339 | 12,034 | 0 |

### Supply Reserves (Week 40)

Stored at top-level state fields `general_supply_reserve` and `heavy_munitions_reserve` (not nested under `supply_reserves`):

| Faction | General | Heavy |
|---------|---------|-------|
| RS | 27.8 (strained) | 64.3 (adequate) |
| RBiH | 7.5 (critical) | 0 (critical) |
| HRHB | 0 (critical) | 0 (critical) |

RS heavy increased from n413's 42.9 to 64.3 — likely because fewer RS battles (hard block) → reduced munition expenditure.

### Key Control Checks (Week 40)

| Check | Result |
|-------|--------|
| RS holds Brčko + Posavina corridor | ✓ |
| HVO holds Orašje pocket | ✓ |
| ARBiH holds south of Brčko (Gradačac/Srebrenik) | partial |
| RS holds Vozuća | ✓ |
| RBiH holds Bihać pocket | ✓ |
| RBiH holds Srebrenica | ✓ |
| RBiH holds Goražde | ✓ |
| RS holds Sarajevo suburbs (Pale, Ilidža, Vogošća) | ✓ |
| RBiH holds Sarajevo center | ✓ |

---

## Post-Investigation: HRHB Krajina Cells

During n472 analysis, the following cells appeared as "painted=RS, sim=HRHB" and were incorrectly suspected as new regressions:
- `op:banja_luka:dragocaj`, `op:banja_luka:potkozarje_3`
- `op:bosanska_gradiska:mackovac`, `op:prijedor:raljas`
- `op:odzak:bosanski_samac`, `op:orasje:ostra_luka`

**Root cause:** These cells are initialized as HRHB in `initial_save` because specific settlement polygons within those municipalities have Croat ethnic majorities. The scenario init derives initial control from ethnic composition, and these cells legitimately start under HRHB control. They are NOT RS under-captures that need fixing — they are correct reflections of the ethnic geography.

**Confirmed:** No HRHB brigades were physically in banja_luka, bosanska_gradiska, or prijedor municipalities. Runtime combat had no involvement in these cells' HRHB status.

---

## Lessons Learned

1. **Hard block required — penalty-based approach was insufficient.** A non-priority penalty of -145 still leaves score positive for undefended targets (+100 decisive, +100 undefended). Only a hard continue-skip enforces true directive discipline.

2. **CENTRAL_CORRIDOR regression is real but likely acceptable.** The -3.2pp regression is likely because some RS corridor captures required opportunistic attacks that the hard block now prevents. Future fix: add those OSIDs to RS 1st KK directive targets if historically correct.

3. **Phase I fatigue system was dead code for Phase II.** The `updateFormationFatigue` function's supply-assignment path never triggered because Phase II brigades have `location_osid` not `assignment`. This was a latent bug since Phase II launch.

4. **Init-based mismatches are confusing — need stable documentation.** Several persistent HRHB/RS mismatches that appear in every run are due to ethnic init logic, not combat dynamics. These are documented in napkin and should not be chased as bot calibration issues.

5. **Supply reserves state schema:** Located at `state.general_supply_reserve` and `state.heavy_munitions_reserve` (per-faction flat objects), NOT under `state.supply_reserves`. The `supply_reserves` key on state is empty/vestigial.

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_ai_osid.ts` | Hard directive block; removed frontier pressure mechanic; cleaned dead variable |
| `src/sim/combat/corps_front_sectors.ts` | `RESERVE_PER_EDGE_CAP`: 0.5 → 0.07 |
| `src/sim/combat/attack_resolution_osid.ts` | Combat fatigue: +2 attacker, +1 defender per battle, cap 20 (later raised to 30 in n159 audit) |
| `src/state/formation_fatigue.ts` | `applyFatigueRecovery()` function added |
| `src/sim/turn_phases/war_phases.ts` | Import `applyFatigueRecovery`; call before `updateFormationFatigue` in `update-formation-fatigue` step |
| `tools/check_hrhb_krajina.cjs` | Diagnostic tool created (not production code; may be removed) |
| `.claude/napkin.md` | Updated: sector pipeline, brigade discipline, HRHB init-based mismatches, calibration entries |

---

## Next Steps

1. **Local HRHB-RS truces (Task #15):** Add `local_truces` to scenario config, enforce in `bot_corps_ai.ts` by filtering truce-municipality cells from directive `offensiveTargets`. Areas: Kiseljak+Hadžići (week 0), West Herzegovina (week 0), East Herzegovina (~week 4), Žepče (~week 8).

2. **CENTRAL_CORRIDOR regression:** Review RS 1st KK (`vrs_1st_krajina`) directive targets — some Doboj/Maglaj/Breza cells need explicit inclusion to restore ~90.4% match.

3. **Donji Vakuf cells:** 4 cells (donji_vakuf_2, jemanlici, korenici, prusac_2) now sim=RBiH vs painted=RS. Possible effect of hard block on RS Operational Group Zapad. May need Donji Vakuf added to RS OGZ target municipalities.

4. **Run n473:** After local truces implementation, run 40w calibration to verify truce areas don't distort overall score.
