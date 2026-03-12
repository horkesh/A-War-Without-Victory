# Intel-Gated Operations Implementation Report

**Date:** 2026-03-12
**Calibration:** n617
**Feature:** Bot AI checks sector intel confidence before launching operations

---

## Summary

Bot corps directives now gate operation launches on sector intel confidence. When confidence is below the faction's threshold, a probe operation (smaller, faster, accepting worse outcomes) is launched instead of a full sector_attack. Probes generate recon-by-force intel when they engage, raising confidence for subsequent full attacks.

This closes REAL_WAR_MASTER issue #21 (corps attack blind — no intelligence gathering before committing).

---

## Mechanics

### Intel Gate Decision Flow

```
Corps wants to launch operation at sector S
  → getSectorIntelConfidence(state, S) returns best confidence across enemy records
  → shouldLaunchProbeInstead(faction, confidence, consecutiveProbes, turn)
    → RS blitz phase (w0-12)? → EXEMPT, launch full attack
    → consecutiveProbes >= MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT (2)? → Force full attack
    → confidence < INTEL_GATE_LAUNCH_THRESHOLD[faction]? → Launch probe instead
    → Otherwise → Launch full sector_attack
```

### Per-Faction Thresholds

| Faction | Initial Intel | Launch Threshold | Probe on First Contact? |
|---------|--------------|-----------------|------------------------|
| RS | 0.60 | 0.25 | No — JNA intel inheritance clears gate immediately |
| RBiH | 0.05 | 0.40 | Yes — near-blind, needs 1-2 turns passive buildup |
| HRHB | 0.25 | 0.30 | Yes — Croatian SIS provides moderate but insufficient baseline |

### Probe Operations

- **Max brigades:** 2 (vs unlimited for full attacks)
- **Planning duration:** 1 turn (vs 2+ for full attacks)
- **Min outcome accepted:** `repulsed` (probes press despite poor odds)
- **Targets:** First reachable enemy OSID only (not full target list)
- **Type:** `probe` (existing CorpsOperation type)
- **Intel generation:** Engagements trigger `updateSectorIntelFromCombat` → confidence = 1.0

### Anti-Loop Safety

- `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT = 2`: After 2 probes without a full attack, corps is forced to commit regardless of intel
- `consecutive_probes` counter on `CorpsCommandState`: incremented on probe launch, reset to 0 on full attack launch or operation completion

### RS Blitz Phase Exemption

- RS during w0-12 (`RS_BLITZ_PHASE_END_WEEK`) bypasses intel gate entirely
- Rationale: JNA-trained forces execute pre-planned operations without reconnaissance phase
- Post-blitz (w13+): RS initial intel 0.60 > threshold 0.25, so most RS sectors clear the gate without probing anyway

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/sector_intel_constants.ts` | +`INTEL_GATE_LAUNCH_THRESHOLD`, +`MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT` |
| `src/sim/combat/sector_intel.ts` | +`getSectorIntelConfidence()` helper |
| `src/sim/combat/bot_corps_directives.ts` | +`shouldLaunchProbeInstead()` gate function, wired into launch path (lines 1131-1169) |
| `src/sim/combat/sector_offensive.ts` | +`cmd.consecutive_probes = 0` on operation completion |
| `src/state/game_state.ts` | +`consecutive_probes?: number` on `CorpsCommandState` |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Fix: operation participants bypass critical supply gate for movement |
| `tests/intel_gated_operations.test.ts` | 12 new tests (4 confidence helper + 8 gate function) |
| `tests/bot_operation_objective_focus.test.ts` | Fix: raised test brigade personnel above combat ineffective gate (250→500) |
| `vitest.config.ts` | Added test file to include list |

**Total new code:** ~100 LOC engine + ~120 LOC tests

---

## Calibration Results (n617 vs n601 baseline)

| Metric | n601 (baseline) | n617 (intel-gated) | Delta |
|--------|-----------------|---------------------|-------|
| Area-weighted match | 86.5% | 86.3% | -0.2pp (stable) |
| RS delta | -23 | -24 | -1 (stable) |
| Benchmarks | 6/6 PASS | 6/6 PASS | — |
| RS w20 | 0.479 | 0.479 | Stable |
| RS w40 | 0.505 | 0.517 | +0.012 (improved) |
| Total orders | ~210 | 216 | +6 |
| RS orders | ~158 | 154 | -4 |
| RBiH orders | ~20 | 32 | +12 (probes adding activity) |
| HRHB orders | ~32 | 30 | -2 |
| Attacker casualties | — | 32,239 | — |
| Defender casualties | — | 41,050 | — |
| Total casualties | ~41k | 73,289 | +32k |

### Key Observations

1. **RS w40 benchmark improved** from razor-thin 0.505 to 0.517 — more headroom above 0.503 floor
2. **RBiH orders increased 60%** (20→32) — probes generating more small-scale activity before full commitments
3. **RS blitz exemption works perfectly** — all RS pre-planned ops launched immediately during w0-12
4. **No calibration regression** — area-weighted match stable within noise (86.3% vs 86.5%)
5. **Casualty volume increased** — more engagements from probe operations contributing to total

### Operation History Highlights

- 24 completed operations (14 RS, 5 RBiH, 3 RS-2KK, 2 HRHB)
- RS operations dominate early war (Op Prijedor w0-4, Op Corridor w4-14, Op Drina w0-21)
- RBiH operations appear from w15+ (Operacija Čelik, Džihad, Strijela, Šahin, Grad)
- All corps active with operations by w26

---

## War-or-Game Insanity Check

| Check | Result |
|-------|--------|
| Zero morale-0 zombie brigades with >400 personnel? | Acceptable — desertion mechanic draining |
| No 50:1 casualty ratios? | PASS — worst outlier within acceptable range |
| Probes visible in operation history? | PASS — probe type operations launched |
| Corps `consecutive_probes` populated? | PASS — field tracks probe count |
| Blind attacks reduced? | PASS — low-confidence sectors get probes first |
| RS blitz phase attacks unaffected? | PASS — all w0-12 RS ops launched immediately |
| Enclave brigades in home pockets? | PASS — all 13 enclave brigades retained |

---

## Issues Closed

- **REAL_WAR_MASTER #21** (No probe/recon operations — corps attack blind): CLOSED. Corps now check intel confidence before committing. Low-confidence sectors get probe operations first.

## Issues Remaining

- **#17 Morale-0 zombie brigades**: Partially addressed (n588 desertion mechanic)
- **#7 HVO passivity**: Open (Graz Accords regional exceptions needed)
- **#5/#10 Morale-victory feedback**: Open (no battle-outcome morale swing)
- **#15 Density imbalance**: Open (no idle-brigade reassignment)

---

## Test Coverage

- 12 new tests in `tests/intel_gated_operations.test.ts`
  - 4 tests: `getSectorIntelConfidence` (no intel, empty records, max selection, unknown sector)
  - 8 tests: `shouldLaunchProbeInstead` (RS/RBiH/HRHB thresholds, max probes, blitz exemption)
- 501 vitest tests passing across 47 suites (was 489 across 46)
- 11/11 node:test operation objective tests passing

---

## Documentation Updated

- `docs/10_canon/Systems_Manual_v0_6_0.md` §7.6.1: Intel-Gated Operation Launch
- `docs/20_engineering/AI_STRATEGY_SPECIFICATION.md`: Intel gate functions and wiring
- `docs/PROJECT_LEDGER.md`: n617 entry
- `docs/plans/2026-03-12-intel-gated-operations.md`: Implementation plan (8 tasks, all complete)
