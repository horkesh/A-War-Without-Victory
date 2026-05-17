# Logistics Priority Sim Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the Logistics Priority player lever and make it persist under canonical military state, then consume it in deterministic formation commitment/supply pressure math.

**Architecture:** Desktop IPC stages intent into `state.military.logistics_priority`; read models project the canonical value; sim consumers default missing priority to `1`.

**Tech Stack:** TypeScript state/read-models, Electron CJS IPC, Vitest, desktop package guards.

---

## Files

- `src/desktop/electron-main.cjs`
- `src/desktop/preload.cjs`
- `src/ui/map/desktop/useIPC.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/state/game_state.ts`
- `src/state/formation_fatigue.ts`
- `tests/phase10_ops_fatigue.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- New or extended `tests/desktop_logistics_priority_ipc_contract.test.ts`

## Implementation Tasks

1. Add a failing IPC contract test proving `stage-logistics-priority` writes `state.military.logistics_priority[faction][edgeId]` and never `state.logistics_priority`.
2. Add adapter tests proving sector priority reads canonical military state and defaults absent values to `1`.
3. Add fatigue/commitment tests proving priority `0.5`, `1`, and `2` affect commitment points deterministically for edge and region assignments.
4. Patch `stage-logistics-priority` to validate faction, target edge/sector ownership, finite priority, and canonical write location.
5. Harden missing-save/default handling so old saves without `military.logistics_priority` load and serialize cleanly.
6. Keep `CorpsFrontPanel` controls; this plan wires the lever rather than removing it.
7. Add closeout docs and ledger entry if behavior or save output changes.

## Verification

- `npx.cmd vitest run tests/phase10_ops_fatigue.test.ts tests/ui_map_game_state_adapter.test.ts`
- `npx.cmd vitest run tests/desktop_logistics_priority_ipc_contract.test.ts tests/desktop_packaging_contract.test.ts`
- `npm.cmd run typecheck`
- Optional: `npm.cmd run desktop:release:check`

## Documentation And Ledger

- Update `docs/plans/MASTER_ROADMAP.md` and `docs/40_reports/CONSOLIDATED_BACKLOG.md`.
- Add `docs/PROJECT_LEDGER.md` behavior/save-output entry.

## Stop Gates

- Stop if any write lands at top-level `state.logistics_priority`.
- Stop if priority becomes UI-only again.
- Stop if a same-config scenario hash changes for a save that never sets logistics priority.
