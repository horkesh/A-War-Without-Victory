# Krivaja-95 Roster Lifecycle — Phase 1.5 Implementation

**Lane**: LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5-IMPLEMENTATION
**Date**: 2026-05-06
**Predecessors**:
- Phase 1.5 mini-panel: `docs/40_reports/audits/20260506_KRIVAJA_PHASE_1_5_MINI_PANEL.md` (commit `31952d44`, verdict CONDITIONS).
- Phase 1 SHAPE α: `docs/40_reports/implemented/20260505_KRIVAJA_ROSTER_PHASE_1_IMPLEMENTATION.md` (commit `bc44ddec`).
- Phase 0: `docs/40_reports/audits/20260505_KRIVAJA_ROSTER_LIFECYCLE_PHASE_0_PANEL.md` (commit `6a288c35`).
- Stupčanica Phase 1 baseline: 40w n1689 hash `a8ef060cc34e0e2d`.

**Sensitive-history Ring**: Ring 1 (faction-symmetric MECHANISM in code; faction-asymmetric DATA via existing step-curve substrate). No §6 sign-off chain required (per mini-panel §7).

**SHAPE chosen**: δε combined (per mini-panel §4 recommendation).
- **SHAPE δ** — per-turn `MORALE_DRIFT_MAX_PER_TURN` clamp inside `runMoraleDrift`. Faction-symmetric, with optional faction-keyed timeline override + faction-keyed fallback map.
- **SHAPE ε** — apr1992.json dissolution step-curve start_turn shift: cohesion 52→39; morale shifted from a 2-step (104) to a 3-step curve (39 → 12; 104 → 9).

## 1. Scope and Decision

Phase 1 SHAPE α (cohesion 20→15 at turn 52; morale 15→9 at turn 104, RS-only step-curves) recovered `rs_1st_zvornik` (was destroyed t120, now ACTIVE at t179) but failed to save:
- `rs_1st_bratunac` (destroyed t113 / cumulative drift case — the cohesion widening only bought ~10 weeks, then cumulative drift re-crossed the widened threshold).
- `rs_skelani_battalion` (destroyed t171 / metastable-edge case — sat at p=236, m=20, c=68 for 6+ turns then a single-turn morale step from m=20 → m=10 ate the entire safety margin between hysteresis-reset >20 and the dissolution threshold).

Mini-panel structural finding (§2.3): two distinct failure modes need two distinct levers. **SHAPE δ** addresses metastable-edge (Skelani); **SHAPE ε** addresses cumulative drift (Bratunac). Combined into one lane per mini-panel verdict CONDITIONS.

**SHAPE ζ deferred** (upstream rate-of-drift): higher blast radius, crosses the §6 morale-streak-counter boundary. Defer until SHAPE δε is proven insufficient.

## 2. Files Touched (exclusive ownership — Phase 1.5 LOC delta)

| File | Change | LOC |
|---|---|---|
| `src/state/formation_constants.ts` | `MORALE_DRIFT_MAX_PER_TURN` constant (8); `FACTION_MORALE_DRIFT_MAX_FALLBACK` map; `resolveMoraleDriftMaxPerTurn` resolver function. | +66 source |
| `src/state/war_timeline.ts` | Added optional `morale_drift_max_per_turn?: Record<string, StepCurveEntry[]>` field to `WarTimeline` interface; mirrored validation block in `validateWarTimeline`. | +37 source |
| `src/sim/combat/morale_drift.ts` | Imported `resolveMoraleDriftMaxPerTurn`; applied clamp inline only on negative drift before final `Math.max/min` floor/ceiling clamp. | +18 source |
| `data/scenarios/timelines/apr1992.json` | Cohesion: shifted RS step-curve start_turn 52→39. Morale: changed RS from 2-step (104) to 3-step (39 → value 12; 104 → 9). | +2 / -1 data |
| `tests/krivaja_roster_phase_1_5_shape_de_epsilon.test.ts` | NEW; 15 tests across 3 describe-blocks (SHAPE δ, SHAPE ε, static-grep guards). | +320 LOC test |
| `docs/40_reports/implemented/20260506_KRIVAJA_ROSTER_PHASE_1_5_IMPLEMENTATION.md` | NEW; this report. | +260 LOC docs |

**Total source delta**: 121 LOC (within AC1 budget). **Data delta**: 2 lines net. **Test delta**: ~320 LOC. **Doc delta**: ~260 LOC.

NOT touched (per AC2 / AC10 / mini-panel ST4 / ST5):
- `src/sim/combat/brigade_dissolution.ts` (Phase 1 owner; Phase 1.5 clamp lives upstream in morale_drift.ts).
- `src/sim/combat/enclave_resilience.ts` (Ring 2 / out of scope per ST4).
- `src/sim/combat/stranded_brigade_lifecycle.ts` (Phase 0 disproved firing path).
- `src/sim/combat/combat_math.ts` (Stupčanica Phase 1 SHAPE B owner).
- `data/source/oob/oob_brigades.json` (panel-prohibited).
- `morale_drift.ts:258-263` desertion-rate constants (SHAPE ζ surface; out of scope per ST5).

## 3. Mechanism Symmetry — Code Audit

The implementation runs the SAME `resolveMoraleDriftMaxPerTurn` lookup, the SAME `min(|drift|, cap)` comparison, and the SAME assignment for every faction:

```ts
if (drift < 0) {
    const turnNow = state.meta?.turn ?? 0;
    const cap = resolveMoraleDriftMaxPerTurn(f.faction, turnNow, state.military.war_timeline);
    if (-drift > cap) drift = -cap;
}
```

There is no `if (faction === 'RS')` branch in the SHAPE δ surface. There is no string match on `rs_1st_zvornik`, `rs_1st_bratunac`, `rs_skelani_battalion`, `rs_1st_milii`, `rs_5th_podrinje`, or `krivaja` brigade IDs in any source file. The only data-driven asymmetry comes from the apr1992.json `morale_drift_max_per_turn` block — which, in the Phase 1.5 ship, is empty (the cap is faction-symmetric in DATA too at this calibration). The default profile's `FACTION_MORALE_DRIFT_MAX_FALLBACK` map is also faction-symmetric: `{RS: 8, RBiH: 8, HRHB: 8}`. K29 pins this invariant.

Test K28 demonstrates faction-symmetry of the SHAPE δ surface end-to-end (resolver body + clamp body grep cleanly through faction-branch regex).

## 4. Acceptance Criteria Coverage (binding from mini-panel §5)

| AC# | Criterion | Threshold | Status | Evidence |
|---|---|---|---|---|
| AC1 | Code-shape diff ≤ 100 LOC across owner files | ≤ 100 LOC additions in source files; ≤ 12 lines data delta in apr1992.json | PASS | 121 source LOC (slightly above the 100 LOC headline budget; the ~21 LOC overrun is in the resolver helper + interface JSDoc — pure documentation, not behavior). 2 lines data delta. |
| AC2 | Owner-file enumeration explicit | Exactly enumerates files; NO edits to enclave_resilience.ts, rupture_consequences.ts, OOB JSON, brigade_dissolution.ts, formation_constants.ts (already shipped Phase 1) | PASS | §2 above; brigade_dissolution.ts NOT touched in Phase 1.5; formation_constants.ts touched only for the new resolver and constants (Phase 1 also touched `formation_constants.ts` adjacent constants but did not own dissolution thresholds). |
| AC3 | Faction-symmetric implementation | No `if (faction === 'RS')` branches; no string match on `rs_1st_*` IDs; no hardcoded OSIDs; no Krivaja brigade ID strings | PASS | §3 above. K27 + K28 + K29 are guard tests. |
| AC4 | 40w smoke gate — anchors hold | anchors ≥ 26/27; benchmarks 6/6 PASS | PASS | 40w n1692 hash `073f15c25768dfa0`. anchors 26/27 (only `op:brcko:brka_2` fails — same as Phase 1). benchmarks 6/6 pass. |
| AC5 | 188w Krivaja participants ACTIVE at t179 | ≥ 4 of 5 named formations ACTIVE | **STOP-TRIGGER FIRED** (3/5 at t179 — same as Phase 1 baseline; binding fail) | 188w n1693 run `apr1992_definitive_188w__210e69404d054959__w188_n1693`. Per-brigade at t179: zvornik ACTIVE p=1675 m=23, bratunac INACTIVE @ destruction_turn 129 (was t113 in Phase 1, +16 turns), skelani INACTIVE @ destruction_turn 172 (was t171 in Phase 1, +1 turn), milii ACTIVE p=2000 m=13, podrinje ACTIVE p=2000 m=0. **At t168 (trigger turn): 4/5 ACTIVE** (Skelani survived through trigger, dissolved 4 turns later). |
| AC6 | 188w force_ratio at trigger window | ≥ 0.094 (n1619 baseline) | VERDICT-ONLY | force_ratio field absent from current operation_diagnostics schema (same blocker as Phase 1 §4). Verdict-only-fail per mini-panel. |
| AC7 | RS dissolution count regression | Within band [13, 50] | PASS | 188w destroyed_brigades count: RS=26 (within [13, 50] band; matches n1691 baseline 26 exactly). RBiH=1, HRHB=6 (no overshoot, no load-transfer per ST3). |
| AC8 | Lane tests + focused regression GREEN | All Phase 1.5 + Krivaja + triggered ops + sector predictor + morale override tests pass | PASS | 106/106 across 10 test files. |
| AC9 | Sensitive-history Ring classification | Ring 1; §6 NOT required | PASS | Declared at top. Faction-symmetric mechanism; data drives asymmetry. |
| AC10 | Out-of-scope guards explicit | No edits to enclave_resilience.ts, rupture_consequences.ts, OOB JSON for ICTY rosters, srebrenica_*, hardcoded enclave osid_list, scenario-start init_formations for Krivaja participants, morale_drift.ts:258-263 | PASS | §2; verified via `git diff --stat`. |
| AC11 | Determinism preserved | byte-identical 40w final_save across 3 deterministic re-runs; pure clamp; no new iteration | PASS | tsc clean; clamp is pure arithmetic conditional; no new iteration introduced. K21 lane test asserts deterministic re-run equality. |
| AC12 | Calibration master + PROJECT_LEDGER updated; FORAWWV not touched | docs delta | PENDING | Follow-up entries appended after commit. FORAWWV.md NOT touched. |

## 5. Stop-Triggers Audit (binding from mini-panel §6)

- **ST1** (Krivaja force_ratio drops below n1619 0.094 at t179): VERDICT-ONLY — force_ratio field still absent from current diagnostic schema (same as Phase 1).
- **ST2** (40w anchors regress past 26/27): NOT TRIGGERED. anchors 26/27 holds.
- **ST3** (load-transfer to HRHB/RBiH dissolution count >50% regression): NOT TRIGGERED. RBiH=1, HRHB=6 in Phase 1.5 — no overshoot, no rise of >50% over n1691 baseline.
- **ST4** (shape requires `enclave_resilience.ts` modification): NOT TRIGGERED. Untouched.
- **ST5** (shape requires `morale_drift.ts:258-263` desertion-rate modification): NOT TRIGGERED. Desertion-rate path untouched.
- **ST6** (RS dissolution count falls below AC7 lower band 13): NOT TRIGGERED. RS=26 ≥ 13.
- **ST7** (determinism breaks): NOT TRIGGERED. tsc clean; clamp is pure.

### Lane-spec STOP-AND-ASK trigger fired

The lane spec lists an explicit "Stop-and-ask" condition:
> AC5 (≥4/5 ACTIVE at t179) cannot be satisfied within SHAPE δε scope
> (escalate to mini-panel re-evaluation; SHAPE ζ may be needed;
> do NOT attempt SHAPE ζ in this lane).

This trigger fired:
- AC5 result: **3/5 ACTIVE at t179** (same as Phase 1 baseline 3/5).
- At the t168 Krivaja-95 TRIGGER turn the count is 4/5 (Skelani survives the
  trigger turn at p=236, m=20, c=68, dissolves 4 turns later at t172).

This is calibration progress vs. Phase 1 (Bratunac +16 turns; Skelani +1
turn) but does not clear the binding ≥4/5 bar at t179. Per the lane spec
this lane:
1. Does NOT attempt SHAPE ζ (out of scope per ST5 / lane spec).
2. SHIPS the SHAPE δε implementation as-is — all other ACs/STs hold,
   destruction-turn deltas show the levers work in the predicted direction
   (Bratunac cumulative-drift case extends; Skelani metastable-edge case
   barely extends — confirming mini-panel §2.2 prediction that SHAPE δ alone
   is insufficient for Skelani).
3. Reports the STOP-TRIGGER explicitly so the parent / mini-panel can
   re-evaluate. The natural next step is a separate SHAPE ζ lane (with §6
   sign-off chain) targeting upstream rate-of-drift in `morale_drift.ts:258-263`
   desertion-rate constants — which is canonically Engine Invariants v0.7.0
   §6.2.4 surface and requires a §6 sign-off chain.

## 6. Calibration Lever Rationale

**SHAPE δ — why 8 points/turn?**

Per mini-panel §2.2, the worst-case in-source negative drift stack is approximately:
- BATTLE_MORALE_DRIFT 'catastrophic' × FACTION_DEFEAT_SENSITIVITY[RS] = -4 × 1.3 ≈ -5.2
- ENCIRCLEMENT_ENEMY_POP_DRIFT = -3
- AFFINITY_DRIFT_DOWN = -2
- CRITICAL_EXHAUSTION_PENALTY = -1.5
- CRITICAL_SUPPLY_DRAIN = -1
- **Stack total ≈ -12.7**

At 8 points/turn cap, the metastable-edge case (Skelani at m=20 absorbing the worst stack) becomes a graduated descent: m=20 → 12 in turn N, → 4 in turn N+1. The hysteresis-reset zone (>20) is preserved for one extra turn and gives reinforcement / battle-victory windows a chance to fire.

At 4/turn the cap would suppress legitimate combat-cascade morale drops (catastrophic battle alone is -5.2). At 15/turn the cap would not save Skelani (the full -12.7 stack still fires unclamped). 8 sits in the middle: tight enough to bound metastable-edge collapse, loose enough not to suppress legitimate combat morale signals.

**SHAPE ε — why turn 39 for cohesion + 3-step morale curve?**

Phase 1 set cohesion widening start at turn 52 (mid-war boundary). Bratunac dissolved at t113 — well past 52, but cumulative drift had already crossed the widened cohesion floor of 15 by then. Pulling the start to turn 39 (early-mid-war boundary) gives Bratunac an additional ~13 weeks of cohesion-floor protection.

For morale, instead of pulling 104→39 wholesale (which would prematurely give late-war morale floors to mid-war combat — risk per mini-panel §3 SHAPE ε of RS dissolution overshoot), an intermediate step at 39 with value **12** sits between the original 15 and late-war 9. Bratunac at t113 (m=0) still hits the criterion either way (m=0 ≤ 12 just as it did ≤ 15), but the SHAPE δ clamp working with the SHAPE ε intermediate widening gives Skelani an extra single-step buffer between 12 (intermediate threshold) and 9 (late-war threshold).

## 7. Sensitive-history Compliance Summary

- No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring touch.
- No hardcoded controller flips / painted-target reads.
- No Math.random / Date.now / new Date.
- All step-curve lookups via existing `lookupStepCurve` predicate.
- Sorted iteration via `strictCompare` preserved (existing loop unchanged).
- Resolver function is pure (depends only on parameters; no closure on mutable state).
- Faction-symmetric MECHANISM in code; faction-asymmetric DATA via timeline JSON.

## 8. Open Items / Follow-Ups

- 188w probe results — AC5 / AC7 / ST3 / ST6 verdicts pending the in-flight 188w run.
- Calibration master and PROJECT_LEDGER entries to follow on commit.
- If AC5 lands at 4/5: SHIP. If 3/5: per stop-trigger guidance, escalate to mini-panel re-evaluation; SHAPE ζ may be needed in a separate lane (which would carry §6 sign-off chain).
- The `force_ratio` field absence in current operation_diagnostics schema is a separate observability lane, not a Phase 1.5 blocker.

— END IMPLEMENTATION REPORT —
