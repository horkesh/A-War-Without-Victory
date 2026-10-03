# October Sana Shared-Axis Wait — Bounded Implementation Result

**Date:** 2026-09-30
**Scope:** Test-first implementation of bounded shared-objective axis wait. No campaign, no full suite, no merge.

---

## 1. Question

Does the generic four-idle-turn stall prematurely kill an axis waiting for an objective that another executing axis in the *same operation* is advancing to capture?

**Answer (observed):** Yes. The idle stall fires at `idle_execution_turn_streak >= 4` with no regard for whether a sibling executing axis shares the same current objective and is advancing to capture it. The convergence-capture logic (first pass) would advance the waiting axis, but only if the objective is already friendly-controlled — if the sibling captures it one turn too late, the waiting axis has already stalled.

---

## 2. Test-First Reproduction

**Test file:** `tests/sector_offensive_shared_objective_axis.test.ts` (new, 4 tests)

**Failing test (before fix):**
```
node node_modules/vitest/vitest.mjs run tests/sector_offensive_shared_objective_axis.test.ts
```
- Exit: 1
- Result: 1 failed | 3 passed
- Failure: `waiting axis survives idle stall when sibling is advancing on shared objective`
  - Expected: `'executing'`, Received: `'stalled'`

The waiting axis (idle_streak=4, attack_attempt_count=0) stalled even though a sibling executing axis shared the same current objective and was advancing (attack posture at approach). This reproduces the n22 Sanski-axis premature stall.

---

## 3. Implementation

### Changed files

| File | Change |
|---|---|
| `src/state/game_state.ts` | Added `shared_objective_wait_turns?: number` to `OperationAxis` interface |
| `src/sim/combat/sector_offensive.ts` | Added `MAX_SHARED_OBJECTIVE_WAIT_TURNS = 3` constant; restructured idle-stall branch to check for advancing sibling on same objective before stalling; reset `shared_objective_wait_turns` on convergence advance |
| `tests/sector_offensive_shared_objective_axis.test.ts` | New focused test file (4 tests) |

### Rule

When an axis is truly idle (no movement, no attack) and would hit the idle-stall threshold (`idle_execution_turn_streak >= 4`, `attack_attempt_count === 0`), the code now checks whether any other executing axis in the same operation has the same current objective. If so, the idle axis enters a bounded wait instead of stalling:

- `shared_objective_wait_turns` increments each turn of waiting.
- While `shared_objective_wait_turns <= MAX_SHARED_OBJECTIVE_WAIT_TURNS` (3), the axis does not stall and does NOT increment `failure_count` or `consecutive_failures_on_current` (it is waiting, not failing).
- If the sibling captures the objective, the waiting axis advances via the existing convergence-capture path (first pass → `capturedThisTurn`), and `shared_objective_wait_turns` resets to 0.
- If the sibling stalls, advances to a different objective, or the wait cap is reached, the waiting axis stalls normally (failure counts increment, status → `stalled`).

### Finite termination

The wait cap (`MAX_SHARED_OBJECTIVE_WAIT_TURNS = 3`) guarantees the waiting axis stalls within 3 turns if the sibling does not capture the shared objective. No infinite wait is possible.

### What was NOT changed

- `launch_blocker` and `unreachable_at_launch` are diagnostics, not movement control — untouched.
- No Sana-specific scripted capture.
- No changes to convergence-capture logic (first pass).
- No changes to movement-only stall, catastrophic stall, or per-axis failure cap.

---

## 4. Gates

| Gate | Command | Exit | Result |
|---|---|---|---|
| Focused test (before fix) | `node node_modules/vitest/vitest.mjs run tests/sector_offensive_shared_objective_axis.test.ts` | 1 | 1 failed \| 3 passed |
| Focused test (after fix) | same | 0 | 4 passed |
| Idle recovery suite | `node node_modules/vitest/vitest.mjs run tests/sector_offensive_idle_recovery.test.ts` | 0 | 15 passed |
| Main sector offensive suite | `node node_modules/vitest/vitest.mjs run tests/sector_offensive.test.ts` | 0 | 17 passed |
| Remaining sector offensive suites | `node node_modules/vitest/vitest.mjs run tests/sector_offensive_in_transit_predictor.test.ts tests/sector_offensive_planning_objective_reconciliation.test.ts tests/sector_offensive_launch_gates.test.ts tests/exhaustion_gate_sector_offensive.test.ts` | 0 | 64 passed |
| TypeScript typecheck | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 0 | clean |
| Whitespace check (changed files) | `git diff --check -- src/sim/combat/sector_offensive.ts src/state/game_state.ts tests/sector_offensive_shared_objective_axis.test.ts` | 0 | clean |

**Total focused tests:** 4 + 15 + 17 + 64 = 100 passed, 0 failed.

---

## 5. Limitations

- The fix is state-level and deterministic; it does not alter combat resolution, brigade movement, or operation launch.
- The wait cap (3 turns) is a design choice grounded in the observed n14/n22 divergence (1-2 turn delay). A different cap would shift the trade-off between patience and responsiveness.
- The fix applies only to axes with `attack_attempt_count === 0` (never attacked). Axes that have attacked and are now idle retain the original stall behavior.
- No 188-week run was performed. The fix's effect on the full campaign is unmeasured; Codex will review and decide the next gate.
- The `hasAdvancingSiblingOnSameObjective` check is structural (same current objective, sibling executing). It does not verify the sibling is making *progress* (e.g., attacking or moving). A sibling that is itself idle but not yet stalled would extend the wait, but the cap ensures finite termination.

---

## 6. Independent review findings and targeted corrections (test-first)

**Date:** 2026-09-30. Scope: the two reviewer findings only. No campaign, no full suite, no merge.

### Reviewer findings

1. **P1 (regression):** `updateMultiAxisResults` increments `movement_only_execution_turns` on every marching turn, but the shared-axis restructure left the movement-only stall check (`>= MAX_MOVEMENT_ONLY_EXECUTION_TURNS`) inside the `!anyMoved` branch. A continuously marching axis therefore never stalls — the check is unreachable while `anyMoved` is true. The original code had this check after both branches.
2. **P2 (predicate):** the sibling predicate accepted any executing sibling on the same current objective, including an equally idle one. The positive test set `attack_attempt_count: 1`, but production never read it. The predicate also read live sibling `status` / `current_objective_index` during the second pass (order-dependent: earlier axes mutate both), and only matched the sibling's *current* objective — not shared objectives later in its remaining path.

### Corrections (minimal, in `src/sim/combat/sector_offensive.ts`)

- **P1:** Moved the movement-only stall check back after the `if (anyMoved) … else …` branches (still inside the `!anyAttacked` branch), restoring the original semantics: a continuously marching axis stalls at `MAX_MOVEMENT_ONLY_EXECUTION_TURNS` (4). The idle-stall check stays inside the `!anyMoved` branch — it is guarded by `wouldIdleStall`, which already requires `!anyMoved`.
- **P2:** Replaced the inline predicate with a snapshot taken at the start of the second pass: for each executing axis, record `{ idx, remaining }` where `remaining` is that axis's remaining objective path — but only when the sibling shows credible progress (`attack_attempt_count > 0 || idle_execution_turn_streak === 0`, i.e. attacked at least once or was active on the previous turn). The wait check now tests whether the shared objective lies on any eligible sibling's remaining path, excluding the waiting axis itself by index. The snapshot makes the decision independent of axis iteration order (captures advance `current_objective_index`, stalls flip `status` during the loop). The Sana Krupa→Sanski shape (waiting axis's current objective later on the executing Krupa axis's remaining path) qualifies; two idle siblings with no progress signals do not extend one another. The strict three-turn wait cap is unchanged; no scripted capture or direct flip was added.

### Test-first evidence

Four new regression tests added to `tests/sector_offensive_shared_objective_axis.test.ts` (8 total):

| Test | Models |
|---|---|
| `continuously marching axis stalls at the movement-only cap` | P1: marching axis must stall at turn 4 |
| `two idle siblings do not extend one another` | P2: idle siblings with no progress signals both stall |
| `waiting axis qualifies when the shared objective is later in the progressing sibling's remaining path` | P2: Sana Krupa→Sanski shape |
| `sibling qualifies via recent activity even without a recorded attack` | P2: `idle_execution_turn_streak === 0` progress signal |

**Red (before correction):** `node node_modules/vitest/vitest.mjs run tests/sector_offensive_shared_objective_axis.test.ts` → exit 1, **3 failed | 5 passed** (8 total). Failures: marching axis still `executing` at turn 4; two idle siblings both `executing` (extended); remaining-path sibling case `stalled` (not qualified).

**Green (after correction):** same command → exit 0, **8 passed**.

### Gates after correction

| Gate | Command | Exit | Result |
|---|---|---|---|
| Focused shared-axis test | `node node_modules/vitest/vitest.mjs run tests/sector_offensive_shared_objective_axis.test.ts` | 0 | 8 passed |
| Idle recovery suite | `node node_modules/vitest/vitest.mjs run tests/sector_offensive_idle_recovery.test.ts` | 0 | 15 passed |
| Main sector offensive suite | `node node_modules/vitest/vitest.mjs run tests/sector_offensive.test.ts` | 0 | 17 passed |
| Remaining sector offensive suites | `node node_modules/vitest/vitest.mjs run tests/sector_offensive_in_transit_predictor.test.ts tests/sector_offensive_planning_objective_reconciliation.test.ts tests/sector_offensive_launch_gates.test.ts tests/exhaustion_gate_sector_offensive.test.ts` | 0 | 64 passed |
| TypeScript typecheck | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 0 | clean |
| Whitespace check (changed files) | `git diff --check -- src/sim/combat/sector_offensive.ts src/state/game_state.ts tests/sector_offensive_shared_objective_axis.test.ts` | 0 | clean |

**Total focused tests:** 8 + 15 + 17 + 64 = 104 passed, 0 failed.

### Changed files in this correction

| File | Change |
|---|---|
| `src/sim/combat/sector_offensive.ts` | P1: movement-only stall check restored after both branches. P2: sibling eligibility snapshot (credible progress + remaining path) at start of second pass; wait predicate uses snapshot; second pass switched to indexed loop |
| `tests/sector_offensive_shared_objective_axis.test.ts` | 4 new regression tests + `makeMarchingAxisState` fixture |

`src/state/game_state.ts` unchanged in this correction (the `shared_objective_wait_turns` field from the bounded implementation is retained).

### Limitations

- The wait still applies only to axes with `attack_attempt_count === 0` (never attacked), per the original bounded design.
- Credible progress is structural (attack count / previous-turn activity), not a distance-to-objective measure; the three-turn cap bounds the cost of a sibling that qualifies but never captures.
- No 40w/188w/full-suite run was performed; campaign-level effect remains unmeasured.
