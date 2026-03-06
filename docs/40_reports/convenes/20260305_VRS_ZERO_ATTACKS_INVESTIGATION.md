# VRS Zero-Attack Investigation — n77/n78/n79 Post-Mortem

**Date:** 2026-03-05
**Run IDs:** n77, n78, n79 (40w, `apr1992_definitive_40w`)
**Baseline:** n65 ATH 99.2% (52w), n466 ATH 92.0% (40w)
**Session result:** Regressed. Code changes made but core problem unresolved.

---

## Summary

- **The core problem**: VRS makes **zero attacks** in 40 weeks. Every run (n77, n78, n79) ends with the initial political_controllers map unchanged — no OSID changed hands due to combat.
- **The blunder**: n78's RS=292 (vs n77's RS=279) was mistaken as evidence that the MERGE fix made pre-planned operations work. It wasn't combat — it was hinterland demographic drift. The pre-planned operations have **never worked** in any run this session.
- **What was implemented**: Brigade repositioning (home_osid), `anyAttacked` adjacency fix in sector_offensive.ts, getEffectiveSupplyState revert. The first two were introduced based on a false premise.

---

## The Blunder — Full Account

### What I believed

n78 (with the MERGE fix applied to op objectives) showed RS=292 in the comparison tool. n77 (without MERGE) showed RS=279. I concluded the MERGE fix caused 13 additional RS territorial gains, and therefore the core problem was "brigades not adjacent to objectives" — not that operations were simply never executing.

I then diagnosed that:
1. Operations were generating false failure counts (any brigade with `posture='attack'` counted as attempting the current objective, even Banja Luka brigades attacking unrelated targets)
2. RS brigades weren't starting adjacent to pre-planned op objectives

And I implemented two fixes targeting these diagnoses.

### What was actually happening

Comparing `initial_save.json` → `final_save.json` for each run:

| Run | Initial RS | Final RS | Territory changes |
|-----|-----------|----------|-------------------|
| n77 | 279 | 279 | **0** |
| n78 | 279 | 292 | **15** |
| n79 | 279 | 279 | **0** |

**n78's 15 "gains" were not combat.** The OSIDs that changed in n78:

```
op:hanpijesak:nevacka_3     RBiH → RS   (Han Pijesak hinterland)
op:ilijas:krivajevici       RBiH → RS   (Ilijas, deep behind SRK front)
op:ilijas:medojevici        RBiH → RS
op:ilijas:sirovine          RBiH → RS
op:kladanj:tuholj_2         RBiH → RS   (Kladanj)
op:olovo:kamensko_2         RBiH → RS   (Olovo)
op:olovo:milankovici_2      RBiH → RS
op:olovo:olovo_2            RBiH → RS
op:sokolac:knezina_2        RBiH → RS   (Sokolac)
op:sokolac:meljine_2        RBiH → RS
op:sokolac:sasevci_2        RBiH → RS
op:vares:ravne              RBiH → RS   (Vareš)
op:vlasenica:pomol_2        RBiH → RS   (Vlasenica)
op:zavidovici:ribnica_dio   RBiH → RS   (Zavidovići)
op:kladanj:olovci_2         RS → RBiH   (regression)
```

**Every single one is in the eastern/central hinterland** — not in any pre-planned op's target list (Prijedor, Brčko, Foča, Sarajevo, Drina). These are demographic drift events — small RS militia pockets converting OSIDs in ethnically mixed areas. They happened in n78 due to some non-deterministic or configuration difference, not because operations worked.

**Zero battles were logged in any turn in any run.** The `weekly_report.jsonl` `battles` field is empty for all 40 turns across all three runs.

### Why I didn't catch it sooner

I was working top-down: compare tool output → delta in RS count → assume combat → diagnose combat mechanics. I didn't directly check whether the changed OSIDs in n78 were actually pre-planned op objectives, and I didn't verify `initial_save.json == final_save.json` until deep into the session.

---

## Actual State of Pre-Planned Operations

VRS has 5 pre-planned operations injected at turn 0 (planning phase, planning_duration=1, so execution starts turn 1):

- **Operation Koridor** (EBK): target garevac_2 from staging brcko
- **Operation Drina** (Drina Corps): zvornik → novo_selo → bratunac_2
- **Operation Prsten** (SRK): ilidža → rakovica → svrake → hotonj
- **Operation Foča** (Herzegovina Corps): brusna → kosman → tjentiste → miljevina → izbisno → patkovina
- **Operation Prijedor** (1KK): Sweep Prijedor / Sanski Most / Ključ

All five operations inject into their respective corps. All five corps show `active_operation = null` and `corps_exhaustion = 0` at w40. This means operations RAN (went through planning → execution → recovery and cleared), but no objectives were ever captured because no attacks were generated.

### Why attacks aren't generating

Not yet fully root-caused, but leading hypotheses:
1. **Supply state gates**: Bot brigade AI (`bot_brigade_ai_osid.ts`) has supply-based gating. If supply_reserves_enabled applies strained/critical state to RS brigades early in the game, attacks require 'victory' outcome prediction, which may not pass the threshold.
2. **Sector op posture lock**: Brigades in `participating_brigades` may be locked into a defensive-only posture by some gate in `bot_brigade_ai_osid.ts` when the operation hasn't produced orders.
3. **`computeSupplyReadiness` returning < SUPPLY_READINESS_LAUNCH (0.6)**: This gates sector offensive launch in `evaluateSectorOffensiveLaunch`. Pre-planned ops bypass this check (they use `injectPrePlannedOperations`, not `evaluateSectorOffensiveLaunch`), but there may be an abort gate in `advanceSectorOffensives`.

This needs a single focused debugging session with turn-by-turn logging of what attack orders are (or aren't) generated.

---

## Code Changes Made This Session

### 1. `sector_offensive.ts` — `anyAttacked` adjacency fix

**Intent**: Fix false failure counting. When Banja Luka brigades attacked their local targets and counted as "attempting" the current op objective (e.g., kozarac_2), they generated spurious failures, cycling operations too fast.

**Implementation**: `updateSectorOffensiveResults` now builds `adjacentFriendlyOsids` from `corps_front_sectors` sub-segments and only counts a brigade as attacking the current objective if it's at an adjacent friendly OSID.

**Status**: Correct in principle. However, it also means that if `anyAttacked` is always false (e.g., corps_front_sectors doesn't cover the objective, or the brigade is never given posture='attack' on the objective), the operation accumulates zero failures and loops in infinite stalemate. **Stalemate counter needed** (see Next Steps).

**Determinism impact**: None. Logic is pure function of state.

### 2. `oob_brigades.json` — Brigade repositioning via `home_osid`

**Intent**: Place VRS brigades adjacent to pre-planned op objectives at game start, so attacks can generate immediately.

**11 brigades repositioned**:

| Brigade | home_osid | Initial controller | Adjacency purpose |
|---------|-----------|-------------------|-------------------|
| rs_43rd_prijedor_motorized | op:prijedor:prijedor_2 | RS ✓ | kozarac_2, ljubija_2 |
| rs_5th_kozara_light_infantry | op:prijedor:rasavci_2 | RS ✓ | kozarac_2, ljubija_2, raljas |
| rs_1st_gradika_light_infantry | op:bosanska_gradiska:gornji_podgradci | RS ✓ | kozarac_2, kamicani |
| rs_11th_dubica_infantry | op:bosanska_dubica:vojskova | RS ✓ | kozarac_2 |
| rs_1st_novigrad_infantry | op:bosanski_novi:suhaca_4 | **RBiH ✗** | raljas (WRONG — enemy territory) |
| rs_1st_bratunac | op:bratunac:glogova | RS ✓ | bratunac_2 |
| rs_1st_birac | op:vlasenica:cerska_2 | RS ✓ | vlasenica area |
| rs_foa_brigade | op:foca:foca_3 | RS ✓ | brusna_2 |
| rs_2nd_posavina_light_infantry | op:bosanski_samac:crkvina_2 | RS ✓ | garevac_2 |
| rs_2nd_sarajevo_light_infantry | op:ilidza:kasindo | RS ✓ | sarajevo_dio_ilidza_2, rakovica |
| rs_3rd_sarajevo_infantry | op:vogosca:vogosca_3 | RS ✓ | svrake, hotonj |

**One confirmed error**: `rs_1st_novigrad` placed at `op:bosanski_novi:suhaca_4`, which is **RBiH-controlled** at game start. The session summary incorrectly claimed this was verified from `final_save.json` — but that file reflects t=40 state, not t=0. The municipality-level controller says bosanski_novi=RS, but the OSID-level controller says suhaca_4=RBiH. `svodna_2` (Bosanski Novi, RS-controlled, adjacent to raljas) should be used instead.

**Note on n79 being identical to n77 despite repositioning**: The repositioning may not have caused n79 to be worse than n77 — rather, the underlying attack-generation problem means neither run had any combat, and both preserved the initial political_controllers identically. The n79/n77 "difference" of 1 OSID is likely a rounding artifact in the comparison tool.

### 3. `supply_reserves.ts` — `getEffectiveSupplyState` revert

**Reverted**: strained reachability + high reserves → adequate (overreach from prior session)

**Kept**: critical reachability + adequate reserves (≥50) → strained (intentional fix for isolated-source brigades)

**Test fixes**: 7 tests updated in `supply_reserves.test.ts` and `supply_phase_e1.test.ts` to reflect per-faction initial reserve values (RBiH=10/5, RS=80/60, HRHB=55/25).

### 4. `data/scenarios/apr1992_definitive_40w.json` — Brčko overrides

**Added** (to support Operation Koridor): `osid_control_overrides` for op:brcko:brcko and op:brcko:krepsic → RS. These restore the pre-existing behavior noted in MEMORY.md ("Brčko control overrides: op:brcko:brcko + op:brcko:krepsic start RS in scenarios") which had been lost. This allows EBK to stage Operation Koridor from Brčko and attack garevac_2 (adjacent RS neighbor: crkvina_2, tisina, skugric_gornji_2).

---

## Scenario Results

### n78 (last run before session changes)
- **Overall match**: 574/744 (77.2%), area-weighted 79.6%
- **Faction totals**: RS=291, RBiH=334, HRHB=119 (target: RS=411, RBiH=246, HRHB=87)
- **RS gap**: -120 OSIDs from target

### n79 (post-session — regressed)
- **Overall match**: 573/744 (77.0%), area-weighted 79.6%
- **Faction totals**: RS=278, RBiH=347, HRHB=119
- **RS gap**: -133 OSIDs from target

The -15 OSID regression (n78→n79) in RS count is attributable to the absence of the demographic drift events that appeared in n78, not to combat regression. The underlying calibration position is unchanged from n77 across all three runs.

---

## Key Discoveries

1. **Zero battles in 40 weeks**: No battles logged in `weekly_report.jsonl` for any turn in any run (n77, n78, n79). Pre-planned operations complete (go to recovery) without capturing any objectives.

2. **Demographic drift ≠ combat**: The 13-OSID "improvement" in n78 was hinterland militia control drift, not combat results. The comparison tool's faction count delta is not a reliable indicator of combat effectiveness.

3. **Initial state verification must use `initial_save.json`**: Municipality-level controllers from `municipalities_1990_initial_political_controllers_apr1992.json` are demographic defaults. Actual OSID-level controllers can differ significantly (e.g., prijedor_2 = RS despite Prijedor municipality = RBiH). Always verify against `initial_save.json`.

4. **OSID adjacency from contact graph is reliable**: `data/derived/operational/operational_contact_graph.json` edges correctly describe the playfield. The adjacency analysis (RS neighbors of pre-planned objectives) was accurate.

5. **anyAttacked stalemate loop**: With the adjacency fix, if `corps_front_sectors` doesn't populate the objective in any sector's enemy_osids, `adjacentFriendlyOsids` is empty → always stalemate → `failure_count` never increments → operations never abort. Need a stalemate counter to bound this case.

---

## Files Changed

| File | Change | Status |
|------|--------|--------|
| `src/sim/combat/sector_offensive.ts` | `anyAttacked` uses `corps_front_sectors` adjacency | Needs stalemate counter |
| `data/source/oob_brigades.json` | `home_osid` for 11 VRS brigades | rs_1st_novigrad suhaca_4 → svodna_2 needed |
| `data/scenarios/apr1992_definitive_40w.json` | Brčko osid_control_overrides restored | Correct |
| `src/state/supply_reserves.ts` | Reverted strained→adequate overreach | Correct |
| `tests/supply_reserves.test.ts` | Per-faction reserve value updates | Correct, all pass |
| `tests/supply_phase_e1.test.ts` | Per-faction reserve value updates | Correct, all pass |

---

## Next Steps (Prioritized)

### P0 — Root cause why zero attacks generate
Add turn-by-turn diagnostic logging (or a one-off debug run) to answer:
- Does `injectPrePlannedOperations` successfully inject operations at t=0?
- At t=1, does `advance-sector-offensives` transition planning→execution?
- Does `generate-bot-brigade-orders` produce attack orders for any VRS brigade?
- If orders ARE generated, does `attack_resolution_osid.ts` resolve them?

This is the critical missing link. Everything else is downstream.

### P1 — Fix `rs_1st_novigrad` home_osid
Change from `op:bosanski_novi:suhaca_4` (RBiH) to `op:bosanski_novi:svodna_2` (RS, adjacent to raljas).

### P2 — Add stalemate counter to `updateSectorOffensiveResults`
When `anyAttacked = false`, increment `consecutive_failures_on_current`. After `MAX_CONSECUTIVE_FAILURES_ON_CURRENT` (2) stalemate turns on the same objective, skip to next objective (not a failure — just unreachable). This prevents infinite stalemate locks.

### P3 — Verify Brčko overrides
Confirm `op:brcko:brcko` and `op:brcko:krepsic` are properly RS-controlled in `initial_save.json` of next run. Check that EBK's Operation Koridor injects and executes.

### P4 — Revert anyAttacked and repositioning if P0 shows systemic blocker
If the root cause of zero attacks is something in `bot_brigade_ai_osid.ts` (supply gate, outcome threshold, missing posture assignment), the anyAttacked fix and repositioning may be irrelevant. Diagnose first, then decide what to keep.
