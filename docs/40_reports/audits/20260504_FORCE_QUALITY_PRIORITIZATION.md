# Force Quality Mechanism Gap Prioritization

**Date:** 2026-05-04
**Authors:** /game-designer + /modern-wargame-expert (read-only research)
**Inputs:**
- `docs/40_reports/audits/20260504_FORCE_QUALITY_TRAJECTORY_AUDIT.md` (Mission G)
- `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`
- `docs/plans/2026-05-01-force-quality-operation-architecture-contract.md`
- `src/sim/combat/officer_quality_update.ts`, `src/sim/combat/morale_drift.ts`, `src/sim/combat/equipment_effects.ts`, `src/scenario/brigade_temporal_emit.ts`
**Status:** Recommendation only. No code changes. User selects Priority 1; future lane implements.

## TL;DR

**Priority 1: Gap 1 (officer-quality observability).** Free, riskless, and unblocks the evidence chain every other gap depends on. **Priority 2: Gap 2 (officer brain-drain).** Mission G's Top-10 already shows VRS cohesion + morale arc-direction matches doctrine — extending the same mechanism to officer quality is the smallest believable next consumer of the architecture contract. **Priority 3: Gap 4 (equipment attrition).** Closes the personnel-rebound illusion (rows 1-2). **Priority 4: Gap 3 (morale veterancy stratification).** Largest refactor, highest anchor risk; defer until 1-3 are paid for.

## Per-Gap Assessment

| Gap | Effort | Cross-system risk | Calibration risk | Closes which audit divergence |
|---|---|---|---|---|
| 1 Officer obs | XS (~50 LOC) | none — harness emit | **zero** | none directly; unblocks all others |
| 2 Officer brain-drain | S-M | combat predictor consumes `officer_quality`; corps commander reads it | medium | extends matching VRS cohesion/morale arc to officer dimension |
| 3 Morale veterancy | L | morale_drift, cohesion_drift, attack_resolution, dissolution gate | **high** — touches morale-collapse override (NIGHTSHIFT-N4) | partial fix to inverse HRHB morale + drifting fatigue |
| 4 Equipment attrition | M | equipment_effects, combat predictor support thresholds, Cost Ledger | medium | personnel rebound is downstream of intact equipment count; reduces `support_delivery` over time |

### Gap 1 — Observability (PRIORITY 1)

`brigade_temporal_emit.ts` row schema (lines 43-80) currently emits `personnel`, `morale`, `cohesion`, `fatigue` — Mission G aggregated from those four. `officer_quality` lives on `FormationState` and is updated every turn by `updateBrigadeOfficerQuality` (`src/sim/combat/officer_quality_update.ts`). Extension: append `officer_quality` and (optionally) a derived `officer_count_active` field to the `BrigadeTemporalRow` after line 80, populated at line 167-170 alongside the existing scalars. ~30-50 LOC including a deterministic round, schema test update, and the existing static-grep guard. **Zero behavior impact, zero anchor risk.** Without this, the audit cannot classify gap 2 (we only have end-state in `final_save.json` per Mission G §"Mechanism Gaps" item 1). With this, gap 2 becomes measurable on the same diagnostic harness `tools/diagnostics/force_quality_trajectory.cjs` already runs.

### Gap 2 — Officer Brain-Drain (PRIORITY 2)

Critical context the brief understates: `officer_quality_update.ts` lines 41-60 already document that the **calendar-driven VRS brain-drain railroad was deliberately removed in Phase 3 of FORCE QUALITY FOUNDATION (2026-05-01)**. The replacement mechanism is casualty-driven attrition via `applyOfficerCasualtyLoss` in `attack_post_battle_effects.ts` plus `operation_readiness` in Phase 4 of the architecture contract. So the recommendation is **not** to re-introduce a calendar railroad. The work is:

1. Verify (via Gap 1 emit) that the existing casualty-driven path is in fact producing the expected VRS decline + ARBiH rise per turn, not just at end-state. The architecture contract §"Implementation Packet Rules" item 1 ("Unit semantics first") already flags `officer_config.learning_rate` shape ambiguity — that ambiguity is now resolved in code (lines 127-149 of `officer_quality_update.ts`) but never proven on a 188w trace.
2. If the casualty path is too weak, the lever is `OFFICER_CASUALTY_MULT` (currently 1.5) and faction-asymmetric multipliers on `applyOfficerCasualtyLoss` — **not** a per-turn calendar decay. Faction asymmetry is canon: VRS replacement officers are lower quality than the JNA-inheritance cadre they replace; ARBiH replacement officers are higher quality than the militia commanders they replace.
3. The architecture contract already names this exact ownership in row `formation.officer_quality` ("brigade-level command learning → local attack/defense quality, readiness sampling"). **No new lane plan needed**; this slots into the existing Minimum Viable Slice §"Confirm/fix officer learning semantics" + §"Add a deterministic computeCorpsOperationReadiness".

### Gap 3 — Morale Veterancy Stratification (PRIORITY 4, deferred)

`morale_drift.ts` already has heavy structure: affinity-driven, encirclement-aware, supply-CRITICAL drain, exhaustion penalties, battle-outcome drift, faction-differentiated victory sensitivity, NIGHTSHIFT-N4 override threshold (lines 55-57). Adding a per-tenure stratification field to `FormationState.morale` would require touching the morale-collapse override gate, the `MORALE_OVERRIDE_THRESHOLD` semantics, and 26/27 anchors that are currently passing under the existing aggregate morale model. **High anchor risk + multi-system refactor.** Defer until Gaps 1, 2, 4 prove that aggregate morale alone is insufficient — Mission G's data does not yet prove that.

### Gap 4 — Equipment Attrition (PRIORITY 3)

`equipment_effects.ts` defines composition + `EquipmentCondition {operational, degraded, non_operational}` per brigade but Mission G found "equipment count flat in audit." The maintenance loop is the missing consumer. Architecture contract row `equipment + maintenance + supply → support thresholds` names this exactly. Connects to Cost Ledger templates per the v0.9 roadmap. Implementation is a per-turn condition shift (VRS without spare parts: small `operational → degraded → non_operational` flow; ARBiH with imports/captures: reverse flow capped by import volume). Medium risk because combat predictor consumes equipment via `support_delivery`.

## Anchor Risk Ranking

Lowest to highest: **Gap 1 (zero) < Gap 4 (medium, isolated to support delivery) < Gap 2 (medium, but mechanism already exists) < Gap 3 (high, touches override gate)**.

## Plan Reference for Priority 1

No new lane plan required. Gap 1 is a pure observability extension to `src/scenario/brigade_temporal_emit.ts` and lives under the existing **LANE-2026-05-02-A1-PER-TURN-BRIGADE-SNAPSHOT** observability lane (referenced in the file header). A future Gap-2 lane should anchor itself to the architecture contract's Minimum Viable Slice §1-2.
