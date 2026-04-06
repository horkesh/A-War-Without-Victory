# v0.8.3 Phase 2 — IPC Wiring and Operation Interpretation

**Date:** 2026-04-06
**Commit:** bc88eed3
**Tests commit:** e764491a
**Status:** ACCEPTED
**Baseline:** 2696/2696 vitest, tsc clean (Phase 1 / v0.8.3)
**Verification:** tsc clean, 2716/2716 vitest (188 files, 20 new tests)

---

## Purpose

v0.8.3 Phase 2 closes the gap between the Phase 1 scoring engine and the live game. Phase 1 built the deterministic compliance score and `interpretStanceOrder`; Phase 2 wires all four IPC handlers through the interpretation layer so player orders in Electron pass through the corps commander's personality before taking effect. It also adds `interpretOperationLaunch` and `interpretOperationHalt` — the operation-level interpretation functions that Phase 1 defined constants for but left unimplemented — and the `halt_delay_turns_remaining` countdown field on `CorpsOperation` that allows an aggressive officer's resistance to a halt order to play out over turns rather than resolving instantly.

Phase 3 seams are explicit and unchanged: `reliabilityModifier` remains `0.0` in both new functions, the decay pipeline step (`decay-officer-interpretation-state` in `war_phases.ts`) is not yet added, and warlord supersession via `political_reliability` is deferred.

---

## Files Changed

| File | Change | Lines |
|---|---|---|
| `src/sim/combat/order_interpretation.ts` | `interpretOperationLaunch`, `interpretOperationHalt`, `buildOperationEvent`, `pushOfficerEvent` added; two new exported interfaces | +288 |
| `src/desktop/electron-main.cjs` | Four IPC handlers wired: `stage-corps-stance-order`, `stage-operation-halt`, `stage-operation-force-launch`, `acknowledge-officer-event` override branch | +57 |
| `src/sim/combat/bot_corps_stance.ts` | Player stance order guard — bot formula skips corps with `player_ordered_stance != null` | +7 |
| `src/sim/combat/sector_offensive.ts` | `halt_delay_turns_remaining` countdown in `advanceSectorOffensives` | +11 |
| `src/state/game_state.ts` | `halt_delay_turns_remaining?: number` added to `CorpsOperation` | +5 |

---

## New Interfaces

### `LaunchInterpretationResult`

| Field | Type | Meaning |
|---|---|---|
| `compliance` | `'full' \| 'modified' \| 'partial' \| 'refused'` | Compliance outcome |
| `effective_planning_duration?` | `number \| undefined` | New planning duration if cautious officer extended it; undefined = no change |
| `effective_objectives?` | `string[] \| undefined` | Trimmed objective list if aggressive officer shortened scope; undefined = no change |
| `event?` | `PendingOfficerEvent \| undefined` | Event pushed to state (non-full compliance only) |
| `reason?` | `string \| undefined` | Human-readable explanation |

### `HaltInterpretationResult`

| Field | Type | Meaning |
|---|---|---|
| `compliance` | `'full' \| 'modified' \| 'partial' \| 'refused'` | Compliance outcome |
| `halt_delay_turns?` | `number \| undefined` | Turns before halt takes effect (0 = immediate) |
| `event?` | `PendingOfficerEvent \| undefined` | Event pushed to state (non-full compliance only) |
| `reason?` | `string \| undefined` | Human-readable explanation |

---

## New State

`halt_delay_turns_remaining?: number` added to `CorpsOperation` in `src/state/game_state.ts`.

Set by `interpretOperationHalt` via the IPC layer. Decremented per-turn in `advanceSectorOffensives`. When it reaches `0`, `recovery_reason = 'manual_termination'` is written and the operation enters recovery. The field is `undefined` (absent) on all operations not subject to a halt order — no state churn for the common case.

---

## IPC Seams Wired

| Handler | What it now calls | Compliance routing |
|---|---|---|
| `stage-corps-stance-order` | `interpretStanceOrder(state, corpsId, stance)` | Records raw order in `player_ordered_stance`; applies `result.effective_stance` (may differ from ordered if officer deviates); event pushed by interpreter |
| `stage-operation-halt` | `interpretOperationHalt(state, corpsId, operationName)` | `full` → `recovery_reason = 'manual_termination'` immediately; `modified`/`partial`/`refused` → `halt_delay_turns_remaining = haltResult.halt_delay_turns` |
| `stage-operation-force-launch` | `interpretOperationLaunch(state, corpsId, op.name)` | `refused` → op already has `recovery_reason = 'manual_termination'`, IPC returns early without launching; `full`/`modified`/`partial` → modifications applied, force-launch proceeds |
| `acknowledge-officer-event` | `overrideInterpretation(state, corpsId, eventId)` when `evt.override_action === 'override-officer-interpretation'` | Increments `override_count`, sets `last_override_turn`, checks cowed condition, marks event acknowledged |

---

## Bot Stance Guard

`generateCorpsStanceOrders` in `bot_corps_stance.ts` now guards against overwriting a player stance order. If `cmd.player_ordered_stance != null`, the bot formula `continue`s without writing `cmd.stance`. This ensures that a player-issued stance order (which was already routed through `interpretStanceOrder` and written as the effective stance by the IPC handler) is never silently clobbered by the next bot cycle. The guard fires before the final `cmd.stance = stance` assignment and is intentionally minimal — the IPC layer owns interpretation, the bot guard owns non-interference.

---

## Halt Countdown (`sector_offensive.ts`)

`advanceSectorOffensives` now ticks down `halt_delay_turns_remaining` before any attack logic. If the field is present and `> 0`, it is decremented; if it reaches `0`, `recovery_reason = 'manual_termination'` is written and the loop `continue`s without advancing the attack that turn. If the field is `> 0` but not yet zero, the advance is also skipped via `continue` — the operation runs no combat while counting down. This gate is explicitly noted in comments as a Phase 3 responsibility: the full decay pipeline step will own the broader `cowed_until_turn` expiry and stale event cleanup; this halt gate must exist now to make the IPC wiring functional.

---

## Compliance Outcome Table

| Function | Compliance | State effect |
|---|---|---|
| `interpretOperationLaunch` | `full` | No change to op; proceeds to force-launch |
| `interpretOperationLaunch` | `modified` | Cautious (agg ≤ 2): `op.planning_duration += CAUTIOUS_EXTRA_PREP_TURNS[agg]`. Aggressive (agg ≥ 4): `op.objectives = objectives.slice(0, -1)`. Event emitted. |
| `interpretOperationLaunch` | `partial` | Both: extend planning duration AND trim one objective. Event emitted. |
| `interpretOperationLaunch` | `refused` | `op.recovery_reason = 'manual_termination'`. IPC returns early. Event emitted. |
| `interpretOperationHalt` | `full` | `op.recovery_reason = 'manual_termination'` immediately. |
| `interpretOperationHalt` | `modified` | `op.halt_delay_turns_remaining = 1`. Event emitted. |
| `interpretOperationHalt` | `partial` | `op.halt_delay_turns_remaining = AGGRESSIVE_HALT_DELAY (2)` if momentum ≥ threshold, else 1. Event emitted. |
| `interpretOperationHalt` | `refused` | `op.halt_delay_turns_remaining = AGGRESSIVE_HALT_DELAY (2)`. Event emitted. |

---

## Deferred

### Phase 3
- `reliabilityModifier` population: hardcoded `0.0` in both `interpretOperationLaunch` and `interpretOperationHalt`. Phase 3 will read from `officer.political_reliability` to connect warlord friction signals to the deterministic scoring path.
- Decay pipeline step: no `decay-officer-interpretation-state` step in `war_phases.ts`. Phase 3 will own `cowed_until_turn` expiry, stale event cleanup, and the full per-turn interpretation state tick.
- `halt_delay_turns_remaining` pipeline ownership: Phase 3 decay step will own this alongside other interpretation state. The current countdown in `sector_offensive.ts` is an interim gate.
- Warlord supersession: low-`political_reliability` early-war militia commanders refusing subordination. Connects `warlord_friction.ts` stochastic triggers to the deterministic override pathway.

### Phase 4
- UI: `OrderInterpretationPanel` (event notification surface), OOB tooltip (compliance preview on hover), personality icons in corps panel. All deferred until Phase 3 closes the engine.

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()` added. All new logic is pure arithmetic over officer traits and operation state. |
| GameState as single source of truth | PASS | All writes go through `state.military.corps_command`, `state.military.pending_officer_events`. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| Backward compatibility | PASS | `halt_delay_turns_remaining` is optional. All new IPC paths have `undefined`-safe fast-paths. |

**Status: GO.** All checks pass. No blockers.

---

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2716/2716 (188 files, 20 new tests)
- 20 new tests in `tests/sim/command/phase2_operation_interpretation.test.ts`
