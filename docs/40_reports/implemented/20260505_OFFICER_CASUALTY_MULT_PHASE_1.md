# OFFICER_CASUALTY_MULT Phase 1 — VERDICT-REPORT-ONLY (RE-DO)

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-OFFICER-CASUALTY-MULT-PHASE-1-IMPLEMENTATION (Wave 9 RE-DO)
**Outcome:** **VERDICT-REPORT-ONLY** per Phase 0 panel binding stop-trigger criterion 8. Implementation reverted; verdict report retained as audit evidence.
**Predecessor:** `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` (Phase 0 panel CONDITIONS verdict, commit `7c3792d7`).
**Prior attempt:** `docs/40_reports/implemented/20260505_OFFICER_CASUALTY_MULT_PHASE_1_VERDICT.md` (commit `e1904138`, Wave 9 self-abort).

---

## Status: VERDICT-REPORT-ONLY

The Phase 0 panel approved Phase 1 GO with 10 binding acceptance criteria + recommended numerics `RS:2.5 / HRHB:2.0 / RBiH:1.0`. This lane implemented the panel-approved code shape and ran the binding 188w smoke battery. The 188w trajectory data **fails** criterion 3 (VRS+HRHB whole-run officer_quality Δ/turn ≤0) and criterion 4 (monotonic VRS+HRHB officer_quality decline from t52). Per criterion 8 stop-trigger ("STOP and produce Wave-6-style verdict report; do NOT retune in-lane"), the lane stops. Implementation reverted; this report is the deliverable.

## Implementation surface (verified, then reverted)

The implementation was structurally correct and would have shipped if the trajectory had bent. For posterity:

- **`src/sim/combat/officer_quality_update.ts`**: `OFFICER_CASUALTY_MULT` promoted from a single scalar (`1.5`) to a faction-keyed `Record<string, number>` with `DEFAULT_OFFICER_CASUALTY_MULT = 1.5` fallback. New accessor `getOfficerCasualtyMult(faction): number` with `?? DEFAULT_OFFICER_CASUALTY_MULT`. No `if (faction === 'X')` branches. Numerics per panel: `RBiH: 1.0 / HRHB: 2.0 / RS: 2.5`. Mirrors `FACTION_LEARNING_RATE` precedent shape.
- **`src/sim/combat/attack_resolution_osid.ts`** + **`src/sim/combat/attack_post_battle_effects.ts`**: 2 callers updated to use `getOfficerCasualtyMult(faction)`.
- **`tests/officer_casualty_mult_phase_1.test.ts`** (NEW): 26 lane tests covering record shape, accessor default, faction-asymmetric values, faction-symmetric mechanism, casualty math at each multiplier.
- **`tests/attack_post_battle_effects.test.ts`** (extended): caller-test updates.

**Verification at peak (before revert):**
- `npx tsc --noEmit` clean
- 79/79 lane + caller tests GREEN (26 lane + 53 caller)
- 40w smoke: anchors 26/27 (only `op:brcko:brka_2` fails — pre-existing P0); benchmarks 6/6; faction OSID counts byte-identical to baseline (HRHB=86 / RBiH=245 / RS=381). Hash drift (`4d2a55f6afa75254`) expected per panel and not a gate.

## 188w Smoke Gate (binding)

**Run dir:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1665`
**Final state hash:** `6d3ff5b4669ccb80` (drift expected; not a gate)
**Streaming finalizer:** Wave 7 Lane B's `streamFinalizeReplaySaveSequenceFromJsonl` worked at scale — `final_save.json` + `replay_save_sequence.json` + `run_summary.json` all written cleanly with no OOM. **First successful 188w run with full artifact emission since Wave 6's heap-cap incident.**

### Per-faction trajectory at lane checkpoints

(`t0` reported as `n/a` because `brigade_temporal_log.jsonl` starts at `t1`.)

| Checkpoint | HRHB officer_quality | RBiH officer_quality | RS officer_quality | RS active brigades |
|---|---|---|---|---|
| t52 | 0.3497 | 0.3503 | 0.5449 | 78 |
| t78 | 0.3840 | 0.4576 | 0.5424 | 69 |
| t104 | 0.4297 | 0.5729 | 0.5664 | 64 |
| t188 | 0.6366 | 0.8307 | 0.6635 | **51** |

### Whole-run rate of change (t1 → t188, 188 turns)

| Faction | Δ officer_quality | Δ/turn | Canon sign | Verdict |
|---|---|---|---|---|
| HRHB | +0.4099 | **+0.00218** | -1 (degrade) | **inverse** |
| RBiH | +0.7437 | **+0.00396** | +1 (improve) | matches |
| RS   | +0.1117 | **+0.00059** | -1 (degrade) | **inverse** |

### Adjacent-checkpoint Δ officer_quality / turn

| From → To | HRHB | RBiH | RS |
|---|---|---|---|
| t52 → t78 | +0.001318 | +0.004130 | **−0.000098** |
| t78 → t104 | +0.001761 | +0.004434 | +0.000926 |
| t104 → t188 | +0.002463 | +0.003068 | +0.001156 |

RS shows one nonpositive sub-segment (t52→t78 = −0.000098/turn) — consistent with the casualty multiplier biting at the lever's deepest band — but resumes climbing immediately at t78, accelerating through to t188.

## Per-criterion verdict (Phase 0 panel 10 binding criteria)

| # | Criterion | Verdict |
|---|---|---|
| 1 | Code shape — record + accessor + `?? 1.5` default; no faction-conditional branches | **PASS** at peak (reverted post-stop-trigger) |
| 2 | 40w smoke anchors ≥26/27 / benchmarks 6/6 / area-weighted ≥92.5% | **PASS** (26/27 anchors, 6/6 benchmarks; brka_2 pre-existing) |
| 3 | 188w VRS+HRHB Δ/turn ≤0; RBiH ≥+0.001; RS active brigades at t188 ≥35 | **PARTIAL FAIL** — VRS Δ/turn = +0.00059 (>0, FAIL); HRHB Δ/turn = +0.00218 (>0, FAIL); RBiH Δ/turn = +0.00396 (≥+0.001, PASS); RS active brigades = 51 (≥35, PASS) |
| 4 | Trajectory verification — monotonic VRS+HRHB officer_quality decline from t52 | **FAIL** — HRHB climbs every segment; RS has one nonpositive sub-segment (t52→t78) but resumes climbing |
| 5 | ≥5 lane tests + focused regression GREEN | **PASS** (79/79: 26 lane + 53 caller) |
| 6 | `npx tsc --noEmit` clean | **PASS** |
| 7 | Sensitive-history compliance | **PASS** (Ring 1, faction-symmetric mechanism, no §6 surface; assertions below) |
| 8 | Stop triggers respected | **TRIGGERED** — criterion 3+4 FAIL → stop, verdict-report-only, do NOT retune in-lane |
| 9 | Out-of-scope guards (no MORALE_OVERRIDE_ENABLED / OFFICER_QUALITY_FLOOR / FACTION_LEARNING_RATE / war_crimes_record / UNPROFOR / comms / ammo touch) | **PASS** |
| 10 | Phase 1 lane report under `docs/40_reports/implemented/` | **DELIVERED** (this file) |

**Final verdict: VERDICT-REPORT-ONLY**. Implementation reverted; lane closed.

## Sensitive-history compliance (asserted)

- **Ring 1.** No Ring 2 or Ring 3 surface touched.
- **No §6 surface.** Faction-symmetric mechanism (record-lookup pattern); no special-cased rupture / enclave / Srebrenica / Drina path.
- **Faction-agnostic mechanism with asymmetric data.** Same code path for all factions; data table `{RBiH: 1.0, HRHB: 2.0, RS: 2.5}` is data, not logic. Mirrors Wave 4 step-curve precedent.
- **No FORAWWV touch.** `docs/10_canon/FORAWWV.md` not opened, not edited.
- **No paint anchor / `political_controllers` / OOB / rupture-wiring / `enclave_resilience.ts` touch.** Confirmed by post-revert `git diff src/`.
- **No combat-math number tuned outside the panel-recommended numerics.** Implementation reverted before any retuning.
- **Determinism preserved.** No `Math.random` / `Date.now` / `new Date` / locale-sort / environment leak.

## Cross-lane finding: BOTH proximate levers fail

| Lever | Lane | 188w VRS Δ/turn | Verdict |
|---|---|---|---|
| Wave 4 reinforcement_mult step-curve (`e9584dd3`) | LANE-NIGHTSHIFT-RECONSTITUTION-POLICY-REVIEW | +0.000591 (Wave 6 verification `cc829ebb`) | inverse to canon |
| Lane A OFFICER_CASUALTY_MULT faction-asymmetric | LANE-NIGHTSHIFT-OFFICER-CASUALTY-MULT-PHASE-1-IMPLEMENTATION (this lane) | +0.00059 | inverse to canon |

**Both proximate levers — the per-faction reinforcement budget AND the casualty-side decay term — fail to bend the late-war doctrinal arc.** Wave 4 Gap 2's hypothesis ("starve the personnel-fill side so the officer-quality decay term dominates") was disproved by Wave 6. The natural successor hypothesis ("amplify the casualty-side decay term") is now disproved by Lane A. The defect must be UPSTREAM of both: the per-brigade growth term itself, NOT the per-faction budget or the casualty-side multiplier.

This is a load-bearing finding for late-war calibration: future investigation needs to trace the OFFICER-QUALITY-GROWTH path (`applyOfficerExperienceGain` and its callers; the cohort-experience formula; whether surviving brigades are over-credited per battle), NOT continue tuning the multipliers around it.

## Files Changed (this lane only)

- `docs/40_reports/implemented/20260505_OFFICER_CASUALTY_MULT_PHASE_1.md` (NEW; this file; verdict-only ship)

The implementation source (`officer_quality_update.ts`, `attack_resolution_osid.ts`, `attack_post_battle_effects.ts`) and lane test (`tests/officer_casualty_mult_phase_1.test.ts`) were reverted per panel criterion 8 stop-trigger discipline.

## Successor Handoffs

1. **Officer-quality growth path investigation** — trace `applyOfficerExperienceGain` (or the per-battle officer-cadre growth term), surviving-brigade cohort math, and the `FACTION_LEARNING_RATE` interaction. The defect is upstream of `OFFICER_CASUALTY_MULT` and `reinforcement_mult`.
2. **Diagnostic gap (carried from Wave 6 successor)** — extend `tools/diagnostics/reconstitution_188w_checkpoints.cjs` to emit faction-total personnel + per-segment-officer-quality-growth rate (not just averages), to disentangle consolidation effects from fresh growth.
3. **Wave 7 Lane B streaming finalizer validated at scale** — n1665 188w run wrote `final_save.json` + `replay_save_sequence.json` + `run_summary.json` cleanly with no OOM. This is the first full-emit 188w since Wave 6's heap-cap incident. Replay-buffer streaming is now production-validated.
4. **Phase 0 panel pattern remains the canonical §6-adjacent gate.** This lane's outcome — clean implementation + clean tests + correct numerics, but trajectory doesn't bend — is exactly the Phase 0 panel's "stop trigger" branch working as designed. The pattern saved a calibration mistake from shipping.

## Determinism

The diagnostic uses sorted iteration over canonical faction order `['HRHB', 'RBiH', 'RS']`, numeric-ascending turn iteration, and `strictCompare`. Re-running the diagnostic on n1665 produces byte-identical output. No `Math.random` / `Date.now` / `new Date` / locale-sort / environment-leak.
