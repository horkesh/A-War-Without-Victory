# v0.8.3 Phase 3 — Reliability Modifier, Decay Pipeline, Warlord Supersession

**Date:** 2026-04-06
**Commits:** 7e487a40 (impl), 6841123b (tests), b20dc3a9 (docs)
**Status:** ACCEPTED
**Baseline:** 2716/2716 vitest, tsc clean (Phase 2 / v0.8.3)
**Verification:** tsc clean, 2729/2729 vitest (189 files, 13 new tests)

---

## Purpose

v0.8.3 Phase 3 closes the three seams left open by Phase 2: the `reliabilityModifier` hardcoded to `0.0` in all three interpretation functions, the absence of a per-turn decay pipeline step to manage officer interpretation state, and the deferred warlord supersession mechanic. Together these changes make the compliance scoring engine live — officer political reliability now modulates every stance, launch, and halt interpretation, early-war warlords actively resist subordination through a deterministic penalty path, and the turn pipeline correctly expires cowed states and prunes stale acknowledged events.

Phase 4 seams are explicit: UI panels (`OrderInterpretationPanel`, OOB tooltip, personality icons) remain deferred.

---

## Files Changed

| File | Change | Lines |
|---|---|---|
| `src/sim/combat/order_interpretation.ts` | `RELIABILITY_STEP`, `WARLORD_MODIFIER` constants; `computeReliabilityModifier()`, `computeEffectiveReliabilityModifier()`; three hardcoded `reliabilityModifier = 0.0` seams replaced; `NamedOfficer` type import | +~45 |
| `src/sim/turn_phases/war_phases.ts` | `decay-officer-interpretation-state` step inserted between `assert-operation-lifecycle` and `inject-queued-operations`; step count 149 → 150 | +~30 |
| `tests/sim/combat/phase3_reliability_decay.test.ts` | 13 new tests across 5 suites | new file |

---

## New Constants

| Constant | Value | Purpose |
|---|---|---|
| `RELIABILITY_STEP` | `0.10` | Per-point scaling factor for `political_reliability` deviation from baseline (3) |
| `WARLORD_MODIFIER` | `-0.15` | Additional penalty applied to warlord-class officers (RBiH, pol_rel ≤ 2, early war) |

---

## New Functions

### `computeReliabilityModifier(politicalReliability: number): number`

Pure function. Formula:

```
reliabilityModifier = (political_reliability - 3) × RELIABILITY_STEP
```

| `political_reliability` | `reliabilityModifier` |
|---|---|
| 1 | −0.20 |
| 2 | −0.10 |
| 3 | 0.00 (neutral) |
| 4 | +0.10 |
| 5 | +0.20 |

A negative modifier decreases the effective compliance score, pushing interpretation toward modified/partial/refused. A positive modifier increases it, pushing toward full compliance.

### `computeEffectiveReliabilityModifier(data: OrderInterpretationData, state: GameState): number`

Applies base `computeReliabilityModifier()` and adds `WARLORD_MODIFIER` when all three warlord supersession conditions are met:
1. Faction is `RBiH`
2. Officer `political_reliability ≤ 2`
3. `state.turn < warlord_friction_end_week` (sourced from GameState scenario parameters)

Effect range: `−0.35` (warlord at pol_rel=1, early war) to `+0.20` (loyal officer at pol_rel=5). The three replaced seams all call this composite function.

---

## Warlord Supersession

The warlord supersession mechanic reflects the early-war reality of ARBiH corps commanders who operated with substantial autonomy from Sarajevo political control before the 1993 command consolidation. Commanders with low `political_reliability` who meet the RBiH + early-war time gate receive the combined `WARLORD_MODIFIER` penalty on top of their base reliability penalty.

**Affected officers (warlord supersession active, pol_rel ≤ 2):**

| Officer ID | Name | pol_rel | agg | Active turns |
|---|---|---|---|---|
| `arbih_halilovic` | Sefer Halilović | 2 | 4 | 0–60 |
| `arbih_knez` | Željko Knez | 2 | 2 | 0–44 |

Caco and Čelo are absent from the named officers JSON and handled separately by `warlord_friction.ts` stochastic triggers. Phase 3 does not alter their pathway.

**Combined penalty for warlord officers:** `reliabilityModifier = (2−3)×0.10 + (−0.15) = −0.25`. Applied identically in stance, launch, and halt interpretation — the compliance score is lower, making modified/partial/refused outcomes more probable against the same aggressiveness thresholds.

---

## Decay Pipeline Step

### `decay-officer-interpretation-state`

**Position:** between `assert-operation-lifecycle` and `inject-queued-operations` in `war_phases.ts`.

**Ownership — what this step manages:**
- `cowed_until_turn` expiry: when `state.turn > cmd.cowed_until_turn`, clears the cowed state and resets `override_count = 0`. This prevents the cowed mechanic from persisting indefinitely when the player stops overriding.
- Stale acknowledged officer event cleanup: removes acknowledged events from `pending_officer_events` older than 8 turns. Prevents unbounded accumulation in long-run saves.

**Deliberate non-ownership — what this step does NOT manage, and why:**
- `halt_delay_turns_remaining` countdown: stays in `sector_offensive.ts` by design. The halt countdown is part of operation lifecycle, not officer interpretation state. Moving it to the decay step would require the decay step to iterate over active operations, coupling two independent responsibilities. The Phase 2 comment in `sector_offensive.ts` explicitly nominated this placement as permanent, not interim.

**Step count:** 149 → 150.

---

## Compliance Score Interaction

The reliability modifier is additive with the existing aggressiveness/compliance gap computation. For reference:

```
complianceScore = orderedRank − (aggressiveness − compliance) × gapWeight + reliabilityModifier
```

Where `reliabilityModifier` is now sourced from `computeEffectiveReliabilityModifier()` rather than the hardcoded `0.0`. All three interpretation functions (`computeInterpretation` for stance, `interpretOperationLaunch`, `interpretOperationHalt`) share the same modifier computation path, ensuring consistent behavior across order types.

---

## Tests (13 new, 5 suites)

| Suite | Tests | What it covers |
|---|---|---|
| Reliability wiring (A) | 3 | `computeReliabilityModifier` formula at pol_rel 1/3/5; modifier applied in stance/launch/halt |
| Warlord supersession (B) | 4 | Warlord penalty active (RBiH, pol_rel=2, early turn → refused); penalty absent (post-friction_end); penalty absent (RS officer); penalty absent (pol_rel=3) |
| Cowed expiry (C) | 2 | `cowed_until_turn` cleared when turn > threshold; `override_count` reset to 0 on expiry; not cleared when turn still within window |
| Stale event cleanup (D) | 3 | Acknowledged + >8 turns removed; acknowledged + ≤8 turns kept; unacknowledged never removed |
| `halt_delay` scope guard (E) | 1 | Decay step does not touch `halt_delay_turns_remaining` or active operations |

---

## Deferred

### Phase 4
- UI: `OrderInterpretationPanel` (event notification surface for pending officer events and compliance outcomes), OOB tooltip (compliance preview on hover showing effective reliability modifier), personality icons in corps panel. All deferred until Phase 3 closes the engine.

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()` added. Both new functions are pure arithmetic. Decay step uses deterministic turn comparison only. |
| GameState as single source of truth | PASS | All reads from `state.military.corps_command` and `state.military.pending_officer_events`. No shadow state. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only. Warlord gate checks `faction === 'RBiH'` exclusively. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| Backward compatibility | PASS | `computeEffectiveReliabilityModifier` gracefully handles missing `warlord_friction_end_week` (treats as no supersession). Decay step is a no-op when no cowed officers or stale events are present. |

**Status: GO.** All checks pass. No blockers.

---

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2729/2729 (189 files, 13 new tests)
- 13 new tests in `tests/sim/combat/phase3_reliability_decay.test.ts`
