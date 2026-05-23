# ENGINE-1 Axis Pooling Implementation Memo

**Date:** 2026-05-23
**Status:** Implemented (no commit). Awaiting orchestrator git handoff.
**Predecessor design:** `docs/40_reports/proposals/20260523_ENGINE_1_COMBAT_CONCENTRATION_DESIGN.md` (Option A).
**Predecessor audit:** `docs/40_reports/audits/20260523_SANA_95_COMBAT_BALANCE.md`.

## 0. Progress Checkpoints

| Checkpoint | Status |
|---|---|
| Design memo read; flow + line numbers confirmed | DONE |
| Predictor `additionalAttackers` signature verified at `combat_predictor.ts:253` and aggregate sum at `:463-465` | DONE |
| Existing per-brigade gate inspected at `bot_brigade_eval_attack.ts:286-322` | DONE |
| `OperationAxis` schema confirmed (`game_state.ts:248-286`) | DONE |
| Column-march skip-check confirmed at `bot_brigade_ai_osid.ts:629-634` (siblings already in column-march are pre-filtered before entry — but we re-check defensively for non-orchestrator callers) | DONE |
| `getBrigadeAxis` import confirmed in eval_attack file (line 69) | DONE |
| Edit applied to `bot_brigade_eval_attack.ts` execution branch | DONE — `FormationId` added to type import on line 23; new pooled-prediction block at lines 287-381 |
| Typecheck (`npx tsc --noEmit`) | DONE — clean (0 errors, 0 warnings) after `FormationId` import fix |
| Targeted vitest run | DONE — `tests/bot_orders_perf_profile.test.ts` 5/5 PASS, `tests/operation_execution_staging_truth.test.ts` 3/3 PASS, `tests/attack_resolution_osid_intel_friction.test.ts` 9/9 PASS |
| Memo size check (≥ 8 KB) | DONE — 14554 bytes (14.2 KB) |

## 1. Summary

The design memo (Option A) called for the per-brigade decision gate at
`bot_brigade_eval_attack.ts:265-322` to swap its solo prediction for an
axis-pooled prediction when the solo verdict fails to clear the probe
threshold. Implemented exactly that — minimum surgical change in a single
file, ~70 LOC inserted into the `execution` branch of `evaluateSectorAttack`.

The change is faction-agnostic, deterministic (sorted iteration via
`strictCompare`), and emits exactly ONE pooled attack order per concentrated
group per turn from the lowest-sorted brigade. The downstream resolver
(`attack_resolution_osid.ts:347-358` + `:597-614`) sums attacker power across
all attackers grouped by target OSID — but only attackers that ALSO emit an
order arrive in that group. So the chosen design emits orders for ALL
eligible siblings simultaneously so that the resolver receives them all at
once and applies `coordPenalty` + `getConcentrationBonus` over the true group.
This is the design memo's §3 Option A step 2 (emit orders for all siblings
when aggregate clears threshold).

## 2. What Changed

**File:** `src/sim/combat/bot_brigade_eval_attack.ts`
**Function:** `evaluateSectorAttack` — `activeOp.phase === 'execution'` branch.
**Insertion point:** Inside the `if (directObjectiveAttack)` block, AFTER the
solo `predictedOutcome` is classified and BEFORE the final attack-emission
gate. New code spans lines 302-419 (the ENGINE-1 Option A pooled-prediction
block). `FormationId` added to the type import at line 23.

### Before (old lines 286-322, abbreviated)

```ts
const alreadyAssigned = chosenTargets.get(currentObjective) ?? 0;
if (directObjectiveAttack) {
    const probeThreshold = getSectorOffensiveProbeThreshold(activeOp, brigade.id);
    const predictedOutcome = directObjectiveAttack.prediction.predicted_outcome;
    const axisBrigades = getBrigadeAxis(activeOp, brigade.id)?.assigned_brigades
        ?? activeOp.participating_brigades ?? [];
    const adjacentOperationParticipants = …count of adjacent siblings…;
    const concentratedOutcome = adjacentOperationParticipants > 1
        ? estimateConcentratedOutcome(
            directObjectiveAttack.prediction.power_ratio,
            Math.max(alreadyAssigned + 1, adjacentOperationParticipants) - 1
        )
        : null;
    const canDirectAttackObjective =
        isOutcomeSufficientForAttack(predictedOutcome, probeThreshold) ||
        (concentratedOutcome != null &&
            isOutcomeSufficientForAttack(concentratedOutcome, probeThreshold));
    if (canDirectAttackObjective && alreadyAssigned < MAX_ATTACKERS_PER_TARGET) {
        const attackPosture: BrigadePosture = (brigade.cohesion ?? 0) >= 60 ? 'assault' : 'attack';
        result.posture_orders.push({ brigade_id: brigade.id, posture: attackPosture });
        result.attack_orders[brigade.id] = currentObjective;
        result.attack_scores[brigade.id] = 900;
        chosenTargets.set(currentObjective, alreadyAssigned + 1);
        return true;
    }
}
```

### After (the new contract)

The solo prediction remains the FIRST attempt. If solo clears the threshold,
emit the existing solo order — behavior identical to today (no regression for
single-brigade ops or already-feasible solo attacks).

If solo FAILS, build a deterministic sibling pool of eligible adjacent
brigades on the same axis (see §4 eligibility rules), call
`predictCombatOutcome` a SECOND time with `additionalAttackers = pool`, and
if the pooled outcome clears the threshold:

1. Designate the lowest-sorted brigade ID in `[brigade.id, ...pool]` as the
   pooled-attack issuer.
2. Emit attack orders for ALL brigades in the pool (including `brigade.id`
   itself) — the resolver then groups by target and sums power.
3. Mark `chosenTargets[currentObjective] += pool.length + 1` so subsequent
   brigade evaluations don't double-book.
4. Set posture `'assault'` (cohesion ≥ 60) or `'attack'` per the existing
   rule, individually per pooled brigade.
5. If `brigade.id` is NOT the lowest-sorted in the pool, this evaluation
   call still emits the orders for the entire group (deterministic — same
   pool, same outcome from the lowest-sorted's perspective, but it's the
   current brigade evaluating, so we emit for the group from THIS call).

The "lowest-sorted issuer" rule is moot because we emit for the whole group
in one shot; whichever brigade triggers the eval first gets the credit for
emitting. Determinism is preserved because the FIRST brigade to evaluate
within the sorted iteration loop in `bot_brigade_ai_osid.ts` is the
lowest-sorted in the pool, and we early-return from the second-N evaluations
when `chosenTargets[currentObjective] >= MAX_ATTACKERS_PER_TARGET` or the
brigade is already in `result.attack_orders`.

### Why it's the minimum surgical change

- **No predictor change.** `additionalAttackers` parameter already exists at
  `combat_predictor.ts:253`. Power summation already implemented at
  `:463-465`. `coordPenalty` already applied at `:452-453`.
- **No resolver change.** `attack_resolution_osid.ts:347-358` already groups
  orders by target. `:597-614` already sums multi-brigade power with
  `coordPenalty` and `getConcentrationBonus`.
- **No launch-gate change.** `sector_offensive_launch_helpers.ts:116-202`
  already sums attacker power.
- **No state schema change.** Pool is recomputed per-turn from
  `activeOp.axes[*].assigned_brigades` and live `formation.location_osid`.
- **No new tunables.** Same `getSectorOffensiveProbeThreshold` decision rule
  applied to a pooled prediction instead of a solo one.
- **Preserves the legacy `estimateConcentratedOutcome` heuristic** as a
  fallback when the second predictor call somehow produces no result (defence
  in depth — the heuristic stays in the call chain).

## 3. Edge Cases Handled

| Case | Behavior |
|---|---|
| Single-brigade axis (legacy probe ops) | Pool size = 1 (just `brigade.id`); second predictor call has empty `additionalAttackers`; outcome identical to solo first call; no change in behavior. |
| Brigade NOT in any axis (op uses flat `participating_brigades`) | Falls back to `activeOp.participating_brigades ?? []` (same fallback as the legacy `adjacentOperationParticipants` calc). |
| No siblings tactically adjacent to the current objective | Pool size = 1; pooled prediction = solo prediction; falls through to existing solo gate which already failed → march/intermediate path runs as before. |
| Sibling in column-march | Excluded from the pool. Their `brigade_movement_state[id].stance === 'column' && status === 'in_transit'` means they'd be skipped at `bot_brigade_ai_osid.ts:631-633` anyway and won't emit an attack order this turn. We exclude them from the pool to avoid the resolver expecting their power. |
| Sibling disrupted (`disrupted_turns > 0`) | Excluded. Disrupted brigades can't reliably contribute to combat. |
| Sibling not `status === 'active'` | Excluded. |
| Sibling at OSID NOT tactically adjacent to current objective | Excluded — they can't physically attack the same OSID this turn. |
| Sibling at the same OSID as `brigade` | Allowed if tactically adjacent (covers stacked-OSID concentration). |
| `chosenTargets[currentObjective]` already at or near `MAX_ATTACKERS_PER_TARGET` | Pool truncated. We cap the pool size so total assigned attackers ≤ `MAX_ATTACKERS_PER_TARGET = 12`. Sufficient slack — historical max was ~5-7 per axis. |
| Alliance-blocked objective | The existing `skipDirectObjective` gate (alliance check at lines 250-258) runs BEFORE pool construction. Pooling only runs when the alliance gate has passed. |
| `avoided_osids_by_faction` includes objective | Same — `skipDirectObjective` filters it before pooling runs. |
| Faction-asymmetry | None. The same rule runs for RBiH, RS, HRHB without any faction-conditional branches. |
| Multi-axis op | Pool comes from `getBrigadeAxis(activeOp, brigade.id).assigned_brigades` — strictly per-axis. Brigade B's siblings on axis A do NOT pool with brigade C's siblings on axis B. |
| Brigade with `corps_id` null | Pool still constructed; `result.eligible_attackers_by_corps` counter not incremented for that brigade (existing behavior). |
| Operation type `feint` / `general_offensive` etc. | Pooling only runs when `activeOp.type === 'sector_attack' || activeOp.type === 'probe'` (existing gate at line 171). Feint ops do not pool. |
| Save/load determinism | Pool recomputed each turn from `state` — no new persisted field. Hash recompute on n1289 is expected (this IS the calibration sign-off requirement). |

## 4. Sibling-Pool Eligibility Rules (concrete)

A sibling brigade ID `sid ∈ axis.assigned_brigades` (or
`activeOp.participating_brigades` if `axes` empty) is INCLUDED in the pool
iff ALL of:

1. `sid !== brigade.id` (the evaluating brigade is added separately as the
   first attacker).
2. `state.military.formations[sid]` exists and `status === 'active'`.
3. `state.military.formations[sid].location_osid` is defined.
4. `getTacticalAdjacentOsids(state, location_osid, adjacency).includes(currentObjective)`
   — sibling is one hop from the objective via tactical adjacency.
5. `(formation as { disrupted_turns?: number }).disrupted_turns ?? 0 === 0`
   — sibling is not in disruption recovery.
6. `state.military.brigade_movement_state?.[sid]` is NOT `{ stance: 'column',
   status: 'in_transit' }` — sibling is not in active column march. (A
   sibling in column-march would not have entered evaluateSectorAttack via
   the orchestrator's skip-check at `bot_brigade_ai_osid.ts:631-633`; this
   guard is defensive against direct callers.)
7. Sibling has not already had an order emitted this turn (i.e.
   `!(sid in result.attack_orders)` and `!(sid in result.column_march_orders)`).

The pool is then **sorted by `strictCompare`** for deterministic order, and
truncated so the eventual `chosenTargets.get(currentObjective) + 1 +
pool.length ≤ MAX_ATTACKERS_PER_TARGET`.

## 5. Determinism Audit Notes

- `axisBrigades` is iterated in its source order (op-construction contract:
  `sector_offensive.ts` Phase 3 sector-anchored contract sorts at creation).
  Even so, we `slice().sort(strictCompare)` before pool construction.
- No `Math.random`, no `Date.now`, no timestamps. All math is pure arithmetic
  over `predictCombatOutcome` output (deterministic) and existing combat
  modifiers.
- The pooled `predictCombatOutcome` call receives `additionalAttackers` in
  sorted order; predictor at `:272-275` builds `allAttackerIds = [attackerId,
  ...additionalAttackers]` and iterates that list directly — deterministic
  because input is sorted.
- `result.attack_orders` and `result.posture_orders` mutations are
  per-brigade, no shared accumulator other than `chosenTargets` which is
  always incremented before the next brigade evaluation.

## 6. Test Plan

### Targeted unit tests (existing infrastructure)

- `npm run test:vitest -- bot_brigade_eval_attack` — runs all eval-attack
  suite tests (concentration, alliance gate, supply gate paths).
- `npm run test:vitest -- combat_predictor` — multi-brigade prediction tests
  with `additionalAttackers`.
- `npm run test:vitest -- attack_resolution_osid` — multi-brigade resolver
  power summing with `coordPenalty` and `getConcentrationBonus`.

### New unit tests (recommended, not added in this implementation)

1. **3-brigade axis, solo 0.6 ratio each → pooled clears:**
   - Setup: 3 brigades at OSIDs adjacent to the same objective.
   - Solo: `predictCombatOutcome` returns `repulsed`.
   - Pooled: `predictCombatOutcome` with 2 `additionalAttackers` returns
     `victory` or `costly_victory`.
   - Expected: 3 `attack_orders` entries, all targeting the objective.
2. **1-brigade axis:** pool size = 0; second predictor call returns the same
   outcome as the first; existing solo behavior unchanged.
3. **Faction symmetry:** identical scenario with RS attackers as RBiH
   attackers → identical order set (modulo faction-ID strings).
4. **One sibling disrupted:** excluded from pool; aggregate over remaining
   N-1.
5. **One sibling in column-march:** excluded; aggregate over remaining N-1.

### Integration / regression

- 40w `n1289` re-run: target ≥ 25/25 anchors, 6/6 benchmarks, no probe-
  capture regressions.
- 52w default re-run: Sana 95 produces 5-15 ARBiH-side flips in turns
  170-180. Krivaja-95 / Stupčanica-95 launch feasibility unchanged or
  improved. HRHB Mistral / Maestral show western-Bosnia progress.
- Watchpoint OSIDs: Sarajevo siege ring (no ARBiH 1st Corps breakouts),
  east-Bosnia enclaves (Srebrenica / Žepa / Goražde — ≤ 1 OSID flip in
  baseline 52w), Brčko corridor (VRS holds all 40w).

## 7. References

- Implementation: `src/sim/combat/bot_brigade_eval_attack.ts:302-419`
  (new ENGINE-1 Option A pooled-prediction block inserted into the existing
  `execution` branch of `evaluateSectorAttack`). `FormationId` added to the
  type import at line 23.
- Design memo: `docs/40_reports/proposals/20260523_ENGINE_1_COMBAT_CONCENTRATION_DESIGN.md`
  §3 Option A, §6 Recommended Option.
- Audit: `docs/40_reports/audits/20260523_SANA_95_COMBAT_BALANCE.md`.
- Predictor: `src/sim/combat/combat_predictor.ts:245-470`.
- Resolver: `src/sim/combat/attack_resolution_osid.ts:347-358, 597-614`.
- Axis helpers: `src/sim/combat/bot_brigade_ai_osid.ts:234-296`
  (`getBrigadeAxis`, `getSectorOffensiveCurrentObjective`,
  `getSectorOffensiveProbeThreshold`).

---

*End of implementation memo.*
