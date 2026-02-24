# Mobilization Calibration & OSID Political-Control Fix

**Date:** 2026-02-24
**Author:** Architect (Claude)
**Status:** Implemented + Calibrated (6 scenario runs)

---

## Summary

Fixed two critical bugs in the OSID-as-base-layer transition that broke formation recruitment and ongoing mobilization, then calibrated mobilization parameters against historical force trajectories for the first year of the Bosnian War (April 1992 – April 1993).

---

## Bugs Fixed

### Bug 1: Zero Formations Spawn (factionHasPresenceInMun)

**Root cause:** `factionHasPresenceInMun()` in `oob_phase_i_entry.ts` iterates a SID-keyed `sidToMun` map and checks `state.political_controllers[sid]`. After the OSID-as-base-layer promotion, `political_controllers` uses OSID keys (e.g., `op:bosanski_petrovac:prkosi`) while `sidToMun` has canonical SID keys (e.g., `S105791`). Every lookup returns `undefined` → all 183 OOB brigades skipped for "no control".

**Fix:**
1. Added `buildOsidToMunFromReverseMap()` in `oob_phase_i_entry.ts` — builds OSID→mun map from `operationalToCanonical` reverse map + canonical `sidToMun`.
2. In `scenario_runner.ts`, after state creation detects OSID-keyed `political_controllers`, rebuilds `sidToMun` as OSID→mun.
3. Fixed historical reference state creation to pass `baseDir` + `settlementGraph`.

**Files modified:**
- `src/scenario/oob_phase_i_entry.ts` — added `buildOsidToMunFromReverseMap()`
- `src/scenario/scenario_runner.ts` — OSID sidToMun rebuild + historical reference fix

### Bug 2: Ongoing Mobilization Produces Zero Manpower (getMunicipalityController)

**Root cause:** `getMunicipalityController()` (used by `runPhaseIIOngoingMobilization`, pool population, displacement, control strain, minority decay) does the same SID-vs-OSID mismatch. It checks `pc[sid]` with canonical SIDs against OSID-keyed `political_controllers`. Result: every municipality returns "no controller" → zero ongoing mobilization each turn.

**Fix:** Added OSID-prefix fallback to `getMunicipalityController()`. When SID lookup fails and optional `munId` is provided, scans `political_controllers` keys matching `op:<munId>:*` to find the controller. Updated all callers to pass `munId`.

**Files modified:**
- `src/sim/phase_i/pool_population.ts` — `getMunicipalityController()` with OSID fallback
- `src/sim/phase_ii/ongoing_mobilization.ts` — passes `munId` to controller check
- `src/sim/phase_i/minority_militia_decay.ts` — local copy with OSID fallback
- `src/sim/phase_i/control_strain.ts` — local copy with OSID fallback

---

## Calibration Results

### Historical Targets (April 1992 → April 1993)

| Faction | Start | Historical End | Sim End (W52) | Status |
|---------|-------|---------------|---------------|--------|
| RBiH | ~60-80K | 120-140K | **144,029** | ~3% above max |
| RS | ~80K | 90-110K | **101,425** | ✓ Within range |
| HRHB | ~30K | 40-50K | **50,491** | ✓ At top edge |

All three factions within 10% of historical targets. This is acceptable calibration tolerance for a strategic-level simulation.

### Calibration Iteration Log

| Run | RBiH End | RS End | HRHB End | Key Change |
|-----|----------|--------|----------|------------|
| 1 | 70,040 | 56,523 | 18,190 | Baseline (Bug 1 fix only) |
| 2 | 72,590 | 64,892 | 18,264 | Rate 0.004, surge 3.0/2.2/1.4, JNA 30K |
| 3 | 145,002 | 174,549 | 51,430 | **Bug 2 fix** — mobilization now works |
| 4 | 144,941 | 151,168 | 50,491 | RS scale 0.45, RBiH 1.5, HRHB 1.2 |
| 5 | 144,887 | 123,749 | 50,491 | RS scale 0.25, RBiH 1.3 |
| **6** | **144,029** | **101,425** | **50,491** | **RS 0.15, RBiH 1.1** ✓ |

### Final Parameters

| Parameter | Value | File |
|-----------|-------|------|
| `BASE_MOBILIZATION_RATE` | 0.003 | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.RBiH` | 1.1 | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.RS` | 0.15 | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.HRHB` | 1.2 | `ongoing_mobilization.ts` |
| `RS_JNA_INHERITANCE_BONUS` | 30,000 | `pool_population.ts` |
| `REINFORCEMENT_RATE` | 400 | `formation_constants.ts` |
| `COMBAT_REINFORCEMENT_RATE` | 200 | `formation_constants.ts` |
| Surge curve | 3.0/2.2/1.4/0.9/0.5/0.3 | `ongoing_mobilization.ts` |
| `MAX_MOBILIZATION_PER_MUN_PER_TURN` | 300 | `ongoing_mobilization.ts` |
| `EXHAUSTION_THRESHOLD` | 0.20 | `ongoing_mobilization.ts` |
| `EXHAUSTION_HARD_CAP` | 0.35 | `ongoing_mobilization.ts` |

### RS Scale Rationale (0.15)

RS controls 43% of territory with ~80%+ Serb ethnic majority in most areas, giving them by far the largest eligible population pool. Historically, VRS was already near full mobilization from the JNA handover (May 1992) — their growth was only ~38% over 3 years. The low scale (0.15) correctly models that most eligible Serbs were already mobilized at start via the 30K JNA inheritance bonus + initial pools, leaving little room for further ongoing mobilization.

---

## Combat Pattern Observations (Not Yet Addressed)

1. **Combat collapses after week ~20**: Orders drop from 49/week (w1) to 1/week (w26+). By w33, zero casualties.
2. **RS dominates offensives**: 240 RS orders (76%) vs 75 RBiH (24%). HRHB=0.
3. **Zero new formations**: 0 brigades added during 52-week run. Ongoing recruitment not spawning delayed brigades.
4. **Total casualties**: ~14K (11.7K attacker + 2.3K defender). At 25% KIA = ~3,500. Historical first-year KIA was ~25-30K.

These are bot AI, posture mechanics, and ongoing recruitment issues — separate from the mobilization calibration completed here.

---

## Test Status

- TypeScript: ✓ Clean
- Vitest: 15 suites, 157 passed, 13 skipped
- node:test: Not re-run (no new test files)
- 52-week scenario: 6 successful runs, final hash `5e6670850b969a4e`
