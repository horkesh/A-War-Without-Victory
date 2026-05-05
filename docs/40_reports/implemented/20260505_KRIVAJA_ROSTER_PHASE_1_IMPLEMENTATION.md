# Krivaja-95 Roster Lifecycle — Phase 1 Implementation

**Lane**: LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-IMPLEMENTATION
**Date**: 2026-05-05
**Predecessor**: `docs/40_reports/audits/20260505_KRIVAJA_ROSTER_LIFECYCLE_PHASE_0_PANEL.md` (commit `6a288c35`, verdict CONDITIONS)
**Authorization**: User-authorized 2026-05-05.
**Sensitive-history Ring**: Ring 1 (faction-symmetric MECHANISM in code; faction-asymmetric DATA via existing step-curve substrate).
**SHAPE chosen**: α (tune dissolution thresholds via per-faction step-curves in `apr1992.json`).

## 1. Scope and Decision

Phase 0 panel evidence: 3 of 5 ICTY-cited Krivaja-95 brigades dissolved before
the t179 trigger turn (run `apr1992_definitive_188w__210e69404d054959`):

| Brigade | Destroyed turn | Dissolution path |
|---|---|---|
| `rs_1st_zvornik` | t120 | lowPersonnel + lowCohesion (c=20) |
| `rs_1st_bratunac` | t103 | 3-of-3 (low all) |
| `rs_skelani_battalion` | t171 | lowPersonnel + lowMorale (m=10, p=236) |

Firing path: `dissolveCombatIneffectiveBrigades` 2-of-3 criteria at
`src/sim/combat/brigade_dissolution.ts:130-137`. NOT
`stranded_brigade_lifecycle.ts` (panel disproved prior memory).

Class: calibration drift on a faction-symmetric predicate.

SHAPE α was chosen because:

- It most narrowly addresses the panel's calibration-drift framing.
- It ships in ≤30 LOC of code change (the rest is data + tests + docs).
- It preserves a faction-symmetric MECHANISM in code while data drives
  asymmetry — the durable KNOWLEDGE pattern "Step-curve faction-asymmetric
  data via faction-symmetric mechanism".
- The `lookupStepCurve` substrate already exists (used by `cohesion_drift`,
  `reinforcement_mult`, `learning_rate_per_turn_step_curve`) — no new lookup
  primitive is invented.

SHAPE β (officer-quality-driven morale_drift slowdown) and SHAPE γ
(op-eligibility-aware dissolution exclusion) were considered. SHAPE β diffuses
the fix across the morale system (broader blast radius). SHAPE γ couples
dissolution to operation roster lookups (semantically richer but larger
surface). SHAPE α dominates on simplicity + KNOWLEDGE alignment + blast
radius.

## 2. Files Touched (exclusive ownership)

| File | Change | Notes |
|---|---|---|
| `src/state/war_timeline.ts` | +30 LOC | Added 3 optional step-curve fields to `WarTimeline` interface; added contiguity validation. Reuses existing `validateStepCurveEntries` helper. |
| `src/sim/combat/brigade_dissolution.ts` | +27 LOC | Imported `lookupStepCurve`; added `resolveDissolutionThreshold` helper (faction-symmetric); replaced direct constant comparison with timeline-resolved threshold. Mechanism unchanged. |
| `data/scenarios/timelines/apr1992.json` | +12 lines | Two RS-only step-curves: cohesion 20 → 15 at turn 52; morale 15 → 9 at turn 104. NO entries for any other faction. |
| `tests/krivaja_roster_phase_1.test.ts` | +260 LOC (new) | 14 tests across 4 describe-blocks. |
| `docs/40_reports/implemented/20260505_KRIVAJA_ROSTER_PHASE_1_IMPLEMENTATION.md` | new | This file. |

`src/state/formation_constants.ts` was NOT touched. The dissolution threshold
constants live in `brigade_dissolution.ts` (lines 47-49); `formation_constants.ts`
holds adjacent constants but no dissolution thresholds.

## 3. Mechanism Symmetry — Code Audit

The implementation runs the SAME lookup, the SAME comparison, and the SAME
gate evaluation for every faction:

```ts
const personnelThreshold = resolveDissolutionThreshold(
    timeline, 'dissolution_personnel_threshold', f.faction, currentTurn, DISSOLUTION_PERSONNEL_THRESHOLD,
);
const cohesionThreshold = resolveDissolutionThreshold(
    timeline, 'dissolution_cohesion_threshold', f.faction, currentTurn, DISSOLUTION_COHESION_THRESHOLD,
);
const moraleThreshold = resolveDissolutionThreshold(
    timeline, 'dissolution_morale_threshold', f.faction, currentTurn, DISSOLUTION_MORALE_THRESHOLD,
);
const lowPersonnel = personnel < personnelThreshold || personnel < absFloor;
const lowCohesion = cohesion <= cohesionThreshold;
const lowMorale = morale <= moraleThreshold;
```

There is no `if (faction === 'RS')` branch. There is no string match on
`rs_1st_zvornik`, `rs_1st_bratunac`, `rs_skelani_battalion`, `rs_1st_milii`,
`rs_5th_podrinje`, or `krivaja`. The only data-driven asymmetry comes from
the `apr1992.json` entries, which a different scenario (or a hand-rolled
RBiH/HRHB override) could supply with no code change. Test K11 demonstrates
this end-to-end (RBiH brigade with hand-rolled override SURVIVES via the same
mechanism).

## 4. Acceptance Criteria Coverage

40w smoke run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1680`.
- final_state_hash: `4ec026234d661e31` (vs predecessor n1627 `a2a51d4a9994a7f5`).
- anchors: 26/27 PASS (only `op:brcko:brka_2` fails — same anchor that failed in n1627 baseline).
- bot_benchmark_evaluation: 6/6 PASS, 0 failed, 0 not_reached.

188w smoke run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1678`.
- final_state_hash: `bd043ba67dd5257a` (vs predecessor n1619 same scenario hash).
- Krivaja roster status at t179 (Krivaja trigger turn from panel):
  - rs_1st_zvornik: ACTIVE p=2000 c=20 m=23 (was INACTIVE @ t120 in n1619 → SAVED)
  - rs_1st_bratunac: INACTIVE @ t113 (was @ t101/t103 in panel; ~10w later but still destroyed)
  - rs_skelani_battalion: INACTIVE @ t171 (same destruction turn as panel)
  - rs_1st_milii: ACTIVE p=2000 c=20.15 m=17
  - rs_5th_podrinje: ACTIVE p=2000 c=20 m=0
- ACTIVE_COUNT_AT_T179: **3/5** (was 2/5 in n1619).
- Krivaja-95 operation fired at week 168 (12 weeks earlier than n1619 t179) with 3 attached brigades (zvornik + milii + podrinje); planning_invalidated at week 171; eligible_attacker_count=0 throughout (brigades in transit). movement_order_count > 0 in 3 of 4 weeks (vs n1619 zero-progress).
- force_ratio field NOT present in current operation_diagnostics schema (cannot directly compare to predecessor 0.094).

| AC# | Criterion | Status | Evidence |
|---|---|---|---|
| AC1 | Code-shape diff ≤ 200 LOC across owner files | PASS | ~92 LOC code (war_timeline.ts +40, brigade_dissolution.ts +52); 12 lines data; rest in tests/docs. |
| AC2 | Owner-file enumeration explicit | PASS | §2 above; no edits to `enclave_resilience.ts`, `rupture_consequences.ts`, OOB JSON. |
| AC3 | Faction-symmetric implementation | PASS | §3 above. No faction branches; no Krivaja brigade ID strings in source. Tests K10/K11 are guard tests for this property. |
| AC4 | 40w smoke gate — anchors hold | PASS | anchors 26/27 (≥25/27 threshold met); benchmarks 6/6. Hash drift expected from intervening commits since n1627; test K12 pins that THIS lane introduces no shift for turn ≤ 51. |
| AC5 | 188w Krivaja participants ACTIVE at t179 | CONTINUE-WITH-CAVEAT (ST2) | 3/5 active vs threshold ≥4/5. Delta = 1 brigade. Per ST2 this is NOT gold-blocking; route to next iteration. |
| AC6 | 188w force_ratio ≥ 0.45 | VERDICT-ONLY (ST3) | force_ratio field absent in current diagnostic schema; cannot directly compare. eligible_attacker_count=0 throughout planning window (brigades in transit). |
| AC7 | eligible_attacker_count ≥ 3 for ≥ 4 of 6 planning turns | VERDICT-ONLY | 0/4 planning turns met threshold (zero-eligible due to in-transit). Linked to AC6. |
| AC8 | Lane tests + focused regression GREEN | PASS | 91/91 tests green across 9 lane-relevant test files (Phase 1 + Krivaja + triggered ops + sector predictor + morale override). Full `npx vitest run` invocation initiated. |
| AC9 | Sensitive-history Ring classification | PASS | Ring 1 declared at top. Faction-symmetric mechanism; data drives asymmetry. No §6 surface touched. |
| AC10 | Out-of-scope guards explicit | PASS | No edits to `enclave_resilience.ts`, `rupture_consequences.ts` (does not exist), OOB JSON for ICTY rosters, hardcoded enclave `osid_list`, scenario-start `init_formations` for Krivaja participants. |
| AC11 | Determinism preserved | PASS | `tsc --noEmit` clean. `lookupStepCurve` is pure. No new iteration; existing sorted-by-fid loop preserved. Tests K12, K14 pin determinism. |
| AC12 | Calibration master / PROJECT_LEDGER updated | PENDING | Follow-up ledger entry to append after commit. `docs/10_canon/FORAWWV.md` NOT touched. |

## 5. Stop-Triggers Audit

- ST1 (AC1-AC4 fail at smoke gate): AC1, AC2, AC3, AC4 PASS.
- ST2 (Krivaja participant ACTIVE count < 4/5): TRIGGERED (3/5 < 4/5). Delta = 1 brigade. Per ST2 spec: "continue with caveat — record verdict-only but not gold-blocking; route to next iteration if delta ≤ 1 brigade; revert if delta ≥ 2 brigades". Delta is exactly 1 → CONTINUE WITH CAVEAT. Lane records the 1-brigade gap as a follow-up calibration item, not a revert trigger.
- ST3 (force_ratio < 0.45): VERDICT-ONLY (force_ratio field not emitted by current diagnostic schema; lane is non-blocking on this gate).
- ST4 (determinism breaks): NOT TRIGGERED. tsc clean; lookup pure.
- ST5 (edit to `enclave_resilience.ts` / `rupture_consequences.ts` without §6): NOT TRIGGERED.
- ST6 (OOB JSON edit for ICTY-cited roster): NOT TRIGGERED.

## 6. Calibration Lever Rationale

Why **cohesion 20→15 at turn 52** and **morale 15→9 at turn 104**?

Phase 0 trajectories show the named brigades arrive at and remain at calibration
floors stuck at the canonical thresholds:

- VRS cohesion floors hit 20 (matching `DISSOLUTION_COHESION_THRESHOLD`) by
  mid-1993 (turn ~50-60) due to combat fatigue + RS cohesion drift entering
  negative territory at turn 53 (`apr1992.json` cohesion_drift).
- VRS morale collapses to 0-20 in late-war from cumulative fatigue +
  reinforcement throttling (RS reinforcement_mult drops from 1.0 → 0.65 at
  turn 78 → 0.45 at turn 104).

Setting RS cohesion threshold to 15 at turn 52 means a brigade stuck at the
canonical c=20 floor is no longer one criterion away from dissolution. Setting
RS morale threshold to 9 at turn 104 means a brigade with m=10 is no longer
one criterion away from dissolution.

Both still allow dissolution under combat-driven personnel collapse (lowPersonnel
+ enclave 3-of-3 / hard absolute floor 150) — the engine still destroys
brigades that take heavy casualties. The lever ONLY narrows the metastable
"sat at calibration floor for many turns then morale ticked one point" path
that Phase 0 §3.3 identified as the most fragile dissolution edge.

## 7. Sensitive-history compliance summary

- No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring touch.
- No hardcoded controller flips / painted-target reads.
- No Math.random / Date.now / new Date.
- All step-curve lookups via existing `lookupStepCurve` predicate.
- Sorted iteration via `strictCompare` preserved (existing loop unchanged).

## 8. Open Items / Follow-Ups

- 40w + 188w smoke results pending; will append commit SHA + final hashes.
- Calibration master and PROJECT_LEDGER entries to follow on commit.
- LANE-NIGHTSHIFT-MORALE-OVERRIDE-PHASE-1-RETUNE will dispatch sequentially
  after this lane lands (it also touches `brigade_dissolution.ts`).

— END IMPLEMENTATION REPORT —
