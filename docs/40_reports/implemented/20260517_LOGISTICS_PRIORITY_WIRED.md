# Logistics Priority Wired

**Date:** 2026-05-17
**Plan:** `docs/plans/2026-05-17-logistics-priority-wire-or-remove-plan.md`
**Result:** Implemented and parent-integrated with save-migration hardening. Integrated 40w proof n1848 completed after merge.

## Summary
- Corrected the live Electron IPC write path so `stage-logistics-priority` writes canonical `state.military.logistics_priority[faction][edgeId]` entries instead of the orphan top-level path.
- Threaded the lever through shared combat supply math with deterministic `[0.5, 1.5]` clamping while preserving default `1.0` neutrality.
- Refactored formation fatigue to use the same logistics-priority reader as combat supply math, including conservative region assignment behavior.

## Changes Made
### IPC Path
- `src/desktop/electron-main.cjs` now initializes and writes `state.military.logistics_priority`.
- `tests/logistics_priority_ipc_path.test.ts` covers canonical-path round-trip behavior and statically guards the Electron handler against `state.logistics_priority`.

### Combat And Fatigue Consumers
- `src/sim/combat/combat_math.ts` now owns `LOGISTICS_PRIORITY_MIN`, `LOGISTICS_PRIORITY_MAX`, `lookupLogisticsPriority(...)`, and `applyLogisticsPriorityClamp(...)`.
- `getSupplyMult(...)` applies the clamp after the existing supply-state branch, preserving the prior base values when no priority is staged.
- `src/state/formation_fatigue.ts` delegates logistics-priority lookup to the shared helper instead of duplicating path and region logic.
- `tests/logistics_priority_wiring_red.test.ts` covers orphan top-level no-effect behavior, canonical combat effect, formation-fatigue continuity, clamp edges, default neutrality, and region-assignment boost behavior.

### UI And Contract
- `src/ui/map/components/CorpsFrontPanel.tsx` displays the effective clamp, marks `1.0x` as neutral, and limits buttons to `0.5x`, `1.0x`, and `1.5x`.
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` documents the actual payload shape, canonical write target, and simulation clamp.
- `src/ui/map/data/GameStateAdapter.ts` was audited and already reads `state.military.logistics_priority`.

## Verification
| Command | Exit | Evidence |
|---|---:|---|
| `npx.cmd vitest run tests\logistics_priority_wiring_red.test.ts` after adding the region regression before the helper fix | 1 | Expected red: 1 failed, region full-boost expected `1.5` but received `1`. |
| `npx.cmd vitest run tests\logistics_priority_wiring_red.test.ts` after helper fix | 0 | 5 tests passed. |
| `npx.cmd vitest run tests\logistics_priority_wiring_red.test.ts tests\logistics_priority_ipc_path.test.ts` | 0 | 2 files passed, 7 tests passed. |
| `npx.cmd tsc --noEmit` first pass | 1 | Test fixture type widened `schema` to `number`; fixed with explicit `FrontRegionsFile`. |
| `npx.cmd vitest run tests\logistics_priority_wiring_red.test.ts tests\logistics_priority_ipc_path.test.ts` after type fix | 0 | 2 files passed, 7 tests passed. |
| `npx.cmd tsc --noEmit` after type fix | 0 | Typecheck passed with no diagnostics. |
| `git diff --check -- <lane files>` | 0 | Whitespace check passed; only existing LF/CRLF warnings were emitted. |
| `npm.cmd run sim:scenario:run:40w` | 0 | Integrated parent run n1848: hash `c09a498b7dc9ccae`, 27/27 anchors, 6/6 benchmarks, consistency PASS. |

## Determinism Notes
- No randomness, timestamps, unordered iteration, or serialized derived state were introduced.
- Default/no-priority path returns clamp `1.0`; `getSupplyMult(...)` multiplies by identity when the lever is unset.
- Region assignments are conservative: missing edge priorities count as neutral `1.0`, all region edges must be boosted before the region-level multiplier rises above neutral, and any lower edge or explicit region value pulls the multiplier down.

## Parent Integration Notes
- `PROJECT_LEDGER.md`, `PROJECT_LEDGER_KNOWLEDGE.md`, `MASTER_ROADMAP.md`, `CONSOLIDATED_BACKLOG.md`, and `CALIBRATION_MASTER.md` were updated during parent integration.
- Save-migration hardening now owns legacy/orphan top-level `state.logistics_priority` handling as part of the schema-v12 load path.
- `src/state/game_state.ts` contains the logistics-priority JSDoc and schema-v12 bump.
- Integrated 40w n1848 keeps 27/27 anchors and 6/6 benchmarks. The final-save hash changes under the schema-v12 save/output contract; the control-alignment counts match n1846.

## Files Changed
| File | Change |
|---|---|
| `src/desktop/electron-main.cjs` | Canonical IPC write path. |
| `src/sim/combat/combat_math.ts` | Shared logistics-priority lookup and clamp; combat supply multiplier application. |
| `src/state/formation_fatigue.ts` | Uses shared lookup; exported `getFormationSupplyMultiplier` for regression coverage. |
| `src/ui/map/components/CorpsFrontPanel.tsx` | Effective clamp display and bounded priority buttons. |
| `tests/logistics_priority_wiring_red.test.ts` | Combat/fatigue/clamp/default/region regression coverage. |
| `tests/logistics_priority_ipc_path.test.ts` | IPC canonical path regression coverage. |
| `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` | Contract reconciliation. |
| `docs/40_reports/implemented/20260517_LOGISTICS_PRIORITY_WIRED.md` | Implementation report. |
