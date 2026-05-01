# Multi-Corps Operation Visibility Fix (Bounded Engine Repair)

**Date:** 2026-05-01
**Predecessors:**
- `docs/40_reports/implemented/20260501_TARGET_AWARE_SCENARIO_HEALTH_BASELINE.md`
- `docs/40_reports/implemented/20260501_LATE_1995_SCRIPTED_OPS_PACKET.md` (introduced the multi-corps Operation Mistral 2 that exposed the bug)
- `docs/40_reports/implemented/20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` (Family-2 four-owner stop-at-plan)

**Scope:** Bounded engine fix to the brigade-AI op-visibility hot path. **No combat tuning, OOB, painted target, scenario init, operation objective list, or atrocity/narrative mechanics changed.**

---

## 1. Root cause with file/line owner

**Owner: brigade-AI hot path uses corps-local op lookup, missing cross-corps participants in multi-corps operations.**

### Pre-fix code paths

`src/sim/combat/corps_operation_helpers.ts:45-50` — `findBrigadeOperation(cmd, brigadeId)`:
```ts
export function findBrigadeOperation(cmd: CorpsCommandState, brigadeId: string): CorpsOperation | null {
    for (const op of cmd.active_operations) {
        if (op.participating_brigades.includes(brigadeId)) return op;
    }
    return null;
}
```
Only iterates the passed-in `cmd`'s active_operations. Cannot see ops in other corps.

`src/sim/combat/triggered_operations.ts:756` — `checkTriggeredOperations` injection:
```ts
primaryCmd.active_operations.push(result.op);
```
Pushes the joint op onto **primary corps only**. The op's `participating_brigades` list contains brigades from secondary corps too, but the op physically lives in `corps_command[primary_corps].active_operations` and nowhere else.

`src/sim/combat/bot_brigade_ai_osid.ts:421-426` — brigade AI hot path (pre-fix):
```ts
const corpsId = loanedTo ?? brigade.corps_id;
const cmd = corpsId ? state.military.corps_command?.[corpsId] : null;
const activeOp = cmd ? findBrigadeOperation(cmd, brigade.id) : null;
const isActiveSectorOperationParticipant =
    (activeOp?.type === 'sector_attack' || activeOp?.type === 'probe') &&
    isOperationParticipant(activeOp, brigade.id);
```
Looks up the brigade's OWN corps_command. For a brigade whose corps differs from the op's primary corps, `findBrigadeOperation` returns `null`, so `isActiveSectorOperationParticipant` is `false`, and the brigade falls through every operation-aware evaluation in `bot_brigade_eval_attack.ts:97-308` (planning-phase column-march, execution-phase attack-launch, recovery-phase posture).

### Where this matters

`Operation Mistral 2` (introduced in `20260501_LATE_1995_SCRIPTED_OPS_PACKET`):
- `primary_corps: 'hvo_main_staff'`
- Axis 1 (`mistral_drvar`): brigades from `hvo_main_staff`
- Axis 2 (`mistral_sipovo`): brigades from `hvo_tomislavgrad` (different corps)

In n1593 final_save, both `hrhb_kralj_petar_kreimir_iv_brigade` (axis 2) and `hrhb_kralj_tomislav_brigade` (axis 2) are in the op's `participating_brigades`, but they are corps_id=`hvo_tomislavgrad`. `corps_command['hvo_tomislavgrad'].active_operations = []`. They never see the op via the brigade-AI hot path.

This is the first multi-corps triggered operation in the catalog. All four pre-existing TRIGGERED_OPS (`Posavina Corridor`, `Herzegovina Consolidation`, `Kotor Varos`, `Cerska-Kamenica`) and the new RS-only `Krivaja-95` + `Stupčanica-95` are single-corps, so the bug had not surfaced.

### Verification of suspicions from prompt
1. **"Active-operation visibility is corps-local in `bot_brigade_ai_osid.ts`; multi-corps triggered ops may inject only into primary_corps."** — CONFIRMED. File/line evidence above.
2. **"Mistral 2 may expose a cross-corps axis visibility bug."** — CONFIRMED.
3. "Cerska/Stupčanica/Mistral may be no-order/no-attack failures." — DISTINCT FAILURE MODES. Mistral 2 axis 2 is the visibility bug. Cerska/Stupčanica are single-corps and not affected by visibility — their 0-attacks are a separate residual.
4. "Sana may be a different capture-delivery failure: attempts happen but no captures land." — CONFIRMED. Sana's 7 attempts / 0 captures is a combat-resolution / target-selection residual, not visibility.
5. "checkTriggeredOperations hardcodes assignOperationCommander(..., 'RS')." — Affects Federation ops cosmetically (no commander assigned); orthogonal to capture delivery.

---

## 2. Fix shipped (bounded; tests prove the contract)

### 2a. New helper

`src/sim/combat/corps_operation_helpers.ts`:
```ts
export function findBrigadeOperationAnywhere(
    state: GameState,
    brigadeId: string,
): { cmd: CorpsCommandState; op: CorpsOperation } | null {
    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand) return null;
    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const cid of corpsIds) {
        const cmd = corpsCommand[cid];
        if (!cmd) continue;
        for (const op of cmd.active_operations) {
            if (op.participating_brigades.includes(brigadeId)) {
                return { cmd, op };
            }
        }
    }
    return null;
}
```

State-wide deterministic lookup (`strictCompare` corps iteration). Returns the hosting `cmd` (primary corps) plus the op. The returned `cmd` is the operation host, NOT necessarily the brigade's own corps; callers needing the brigade's own command for stance/sector reads continue to use `state.military.corps_command[brigade.corps_id]`.

### 2b. Brigade-AI hot path wiring

`src/sim/combat/bot_brigade_ai_osid.ts:416-432`:
```ts
const cmd = corpsId ? state.military.corps_command?.[corpsId] : null;
// First try corps-local lookup (fast path). For multi-corps triggered ops
// (op pushed onto primary corps only; secondary-axis brigade lives in a
// foreign corps_command), corps-local lookup misses — fall back to a
// state-wide search so secondary-axis brigades see their op during
// planning + execution. Determinism: state-wide search iterates corps
// ids via strictCompare. See tests/multi_corps_operation_visibility.test.ts.
let activeOp = cmd ? findBrigadeOperation(cmd, brigade.id) : null;
if (!activeOp) {
    const found = findBrigadeOperationAnywhere(state, brigade.id);
    if (found) activeOp = found.op;
}
```

Fast path unchanged for the 99%+ single-corps case. Slow path triggers only when a brigade does NOT find its op in its own corps's active_operations — which happens precisely for cross-corps op participants.

### 2c. Why this is bounded

- `findBrigadeOperation(cmd, ...)` semantics unchanged. All other call sites continue to work as designed.
- No change to op injection (still single primary push).
- No change to op cleanup (`removeOperation` still corps-local; the op only lives in one corps's active_operations).
- No combat tuning, OOB, painted target, scenario init, op objective lists.
- No atrocity / narrative / consequence mechanics.
- Pure visibility fix at the brigade-AI evaluation layer.

---

## 3. Files changed

| File | Change |
|---|---|
| `src/sim/combat/corps_operation_helpers.ts` | Added `findBrigadeOperationAnywhere` helper + supporting `GameState` import. ~30 lines including doc comment. |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Added `findBrigadeOperationAnywhere` to imports. Updated lines 421-432 to fall back to state-wide search when corps-local lookup misses. |
| `tests/multi_corps_operation_visibility.test.ts` | New file. 5 tests across 2 describe blocks: bug-exposure (1) + fix contract (4 — happy path + missing brigade + determinism + empty/missing corps_command). |
| `docs/40_reports/implemented/20260501_MULTI_CORPS_OPERATION_VISIBILITY_FIX.md` | This report. |
| `docs/PROJECT_LEDGER.md` | Behavioral-change entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Reusable lesson on op-visibility / state-wide vs corps-local lookup. |
| `working-on.md` | Continuation notes (untracked). |

No combat code, OOB, painted target, scenario init, or operation objective list changed.

---

## 4. Tests and run hashes

### Tests

| Suite | Result |
|---|---|
| `tests/multi_corps_operation_visibility.test.ts` (new, 5 tests) | ✅ pass |
| `tests/triggered_operations.test.ts` (15 tests) | ✅ pass |
| `tests/triggered_operations_late_1995.test.ts` (12 tests) | ✅ pass |
| `tests/sector_offensive_idle_recovery.test.ts` (12 tests) | ✅ pass |
| `tests/scenario_operation_diagnostics.test.ts` (20 tests) | ✅ pass |
| **Total targeted pack** | **64/64 pass** |
| `npx tsc --noEmit` | ✅ clean |

### Scenario runs

| Run | Weeks | Hash | vs prior baseline | Verdict |
|---|---|---|---|---|
| n1594 | 104 | `6b6daa39dcaf66f7` | **= baseline `6b6daa39dcaf66f7` ✓** | Determinism preserved (no late-war ops fire pre-w168). |
| n1595 | 156 | `57f742a558d8e619` | **= baseline `57f742a558d8e619` ✓** | Determinism preserved (run ends at w156 before any late-1995 op fires). |
| n1596 | 183 | `dd2d560c3e68a443` | ≠ prior `6a6570c525ae24a9` | State evolved differently (hvo_tomislavgrad brigades now see Mistral 2 during planning → different `column_march_orders`/`brigade_movement_orders`). |

The 183w hash change confirms the visibility fix is observable in engine state. Cross-corps brigades' planning-phase column-march orders evolve differently when they can see their op.

---

## 5. 183w before/after operation attack/capture table

| Op | n1593 (pre-fix) attempts | n1593 captured | n1596 (post-fix) attempts | n1596 captured | Delta |
|---|---|---|---|---|---|
| Cerska-Kamenica (single-corps, t40) | 0 | 0 | 0 | 0 | none — visibility fix N/A (single-corps) |
| Stupčanica-95 (single-corps, t172) | 0 | 0 | 0 | 0 | none — visibility fix N/A (single-corps) |
| Mistral 2 (multi-corps, t175) | 0 | 0 | 0 | 0 | **none at AAR level** — visibility now unblocked but other gates hold (see §6) |
| Sana (single-corps, t175) | 7 | 0 | 7 | 0 | none — visibility fix N/A (single-corps); separate capture-delivery residual |

**Painted-vs-sim oct1995:** 70.9% count / 63.2% area-weighted, IDENTICAL in n1593 and n1596. KRAJINA 60.0%, DRINA 60.6%, HERZEGOVINA 42.9%.

### Interpretation

The visibility fix is correctly delivering what its test contract proves: cross-corps brigades now find their op via the state-wide lookup. The state hash change confirms brigade-level orders evolve differently. **However, the fix alone does not unlock territorial improvement on this scenario state** because Mistral 2 axis 2's executable behavior is gated by additional engine residuals upstream of attack-launch:

1. **Secondary-corps stance gating.** When a triggered op fires, line 758 of `triggered_operations.ts` sets `primaryCmd.stance = 'offensive'` only for the primary corps. The secondary corps (`hvo_tomislavgrad`) keeps whatever stance it had before — likely `'defensive'` under the E3 Herzegovina blanket lock. The brigade AI reads `corpsStance` from the brigade's own cmd at line 429, so secondary-corps brigades may be stance-filtered out of attack evaluation even after visibility is restored.
2. **Brigade-to-staging distance + planning_duration window.** `hrhb_kralj_tomislav_brigade` is at `op:prozor:rumboci_2` (Prozor) at t175 — many hops from `op:livno:livno_2` axis 2 staging. With `planning_duration=4` and execution window ~4 turns, the column-march runs out before brigade reaches a position adjacent to the first objective.
3. **Cincar 1994 corridor is unmodeled.** The path from Livno to Mistral 2 objectives crosses Glamoč proper (`glamoc_2`/`kovacevci_2`/`pribelja`/`vidimlije_2`) which are painted=HRHB at apr1995 in painted truth (Cincar 1994 territory) but stay RS in sim because no Cincar op exists. Brigades attempting to march through enemy Glamoč without a captured corridor stall.

These are the residuals named in §6 below.

---

## 6. Remaining blockers (split by owner)

### Owner A — vrs_drina survival / Krivaja-95
**Status:** Stop-at-plan from `20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` (four owners, four sign-offs). Krivaja-95 is correctly defined but injection-blocked because 3 of 4 vrs_drina brigades are destroyed pre-w168.

### Owner B — Multi-corps operation model (this packet shipped Sub-owner B1)
**B1 — Brigade-AI op visibility.** ✅ FIXED THIS PACKET (`findBrigadeOperationAnywhere` + brigade-AI hot path wiring).

**B2 — Secondary-corps stance gating** (NOT FIXED).
- File: `src/sim/combat/triggered_operations.ts:758`. Currently `primaryCmd.stance = 'offensive'` only.
- Proposed change candidates: also set `secondaryCmd.stance = 'offensive'` for axis-corps with op participants. Or: when reading `corpsStance` for a brigade in an active op, override with op-driven stance.
- Sign-off required: `/operations-expert` + `/sector-expert` (cross-faction validation that secondary-corps stance flip doesn't break defensive obligations).

**B3 — Op cleanup symmetry** (NOT FIXED, lower priority).
- The op currently lives only in primary's `active_operations`; cleanup at three call sites (`corps_command.ts:269`, `sector_offensive.ts:937`, `sector_offensive.ts:1929`) calls `removeOperation(cmd, op)` with the primary cmd. This is correct since the op physically lives in only one place. But the `last_completed_operation` write at `sector_offensive.ts:934` records on primary corps only — secondary corps never gets the AAR follow-on suppression context.
- Out of scope here; flagged for future work.

### Owner C — Operation execution / capture delivery
**C1 — Long-distance brigade staging window** (NOT FIXED).
- File: `src/sim/combat/operation_preparation.ts` `tickPreparation` + `ASSEMBLY_THRESHOLD=0.6`, `ASSEMBLY_TIMEOUT_TURNS=5`. Op transitions to execution after 60% of brigades assemble OR 5-turn timeout. Brigades that haven't reached staging by execution-start are still "in_transit" and don't deliver attacks.
- Owner: `/operations-expert` + `/qa-engineer`. The fix is likely op-definition-side (longer `planning_duration` for ops with brigades far from staging) rather than engine-side, but engine could also gate execution start on a higher assembly threshold.

**C2 — 0-attacks despite single-corps op + brigades present** (NOT FIXED).
- Cerska-Kamenica + Stupčanica-95 fire correctly (single-corps, no visibility issue), brigades selected, but 0 attacks delivered. Pattern: brigades far from staging + planning_duration insufficient for column-march to complete + execution window too short.
- Same root cause as C1 likely. Cerska-Kamenica has been in the catalog since w40 with this shape — pre-existing residual.

**C3 — Sana 7 attempts / 0 captures** (NOT FIXED).
- Different failure: brigades DO attack, but their attacks land on intermediate (non-objective) OSIDs OR on objectives where combat resolution doesn't flip control. Likely combat-strength-vs-defender mismatch or attack-through path selection.
- File: `src/sim/combat/bot_brigade_eval_attack.ts:285-303` "attack through" intermediate selection.
- Owner: `/operations-expert` + `/qa-engineer`. Out of scope for this bounded packet.

### Owner D — Content followups
- **Cincar 1994** (Glamoč proper + Kupres). Out of scope per user prompt for the late-1995 packet. Would close apr1995 Glamoč gap and provide a captured corridor for Mistral 2 axis 2.
- **Sensitive-history consequences for Krivaja-95 / Stupčanica-95.** Atrocity / narrative / scoring mechanics. Requires `/historian` + `/game-designer` per `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
- **Hardcoded `'RS'` in `assignOperationCommander` call** (`triggered_operations.ts:759`). RS ops correct; Federation ops fire without commander. Affects officer-effects only, not territorial outcome. Out of scope.

---

## 7. Validation summary

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `vitest tests/multi_corps_operation_visibility.test.ts` | ✅ 5/5 pass |
| `vitest tests/triggered_operations.test.ts` | ✅ 15/15 pass |
| `vitest tests/triggered_operations_late_1995.test.ts` | ✅ 12/12 pass |
| `vitest tests/sector_offensive_idle_recovery.test.ts` | ✅ 12/12 pass |
| `vitest tests/scenario_operation_diagnostics.test.ts` | ✅ 20/20 pass |
| 104w n1594 hash | ✅ `6b6daa39dcaf66f7` = baseline (determinism preserved) |
| 156w n1595 hash | ✅ `57f742a558d8e619` = baseline (determinism preserved) |
| 183w n1596 hash | `dd2d560c3e68a443` (changed; visibility unblock observable in state) |
| 183w `compare_painted_vs_sim --target oct1995` | 70.9% count / 63.2% area (unchanged vs n1593; capture-level flip pending Owners B2 + C1/C2/C3) |

---

## 8. Determinism statement

- No `Math.random()`, no `Date.now()`, no timestamps, no nondeterministic iteration.
- `findBrigadeOperationAnywhere` iterates `Object.keys(corps_command).sort(strictCompare)` — stable corps order.
- Inner loop iterates `cmd.active_operations` in insertion order (single-element typically; alphabetical tiebreak via outer loop).
- Brigade-AI hot path adds a fallback that runs only when corps-local lookup misses, and the fallback itself is deterministic.
- 104w + 156w hashes preserved across the entire fix.

---

## 9. Commit hash

_(to be filled in after commit)_
