# 2026-04-07 — v0.8-to-v0.9 Save/Load and Replay Deep Hardening

## Lane

`Save/Load and Replay Deep Hardening`

Bounded package chosen:
- restore canonical desktop save-string ownership for autonomy/proposal IPC writes
- fix silent `front_segments` loss on deserialize
- prove canonical briefing persistence and operational SITREP reconstruction across a desktop-style mutate/save/load cycle

## Why This Package

Audit found one hidden persistence seam stronger than the others:
- desktop `currentGameStateJson` was supposed to be the canonical save blob, but four late IPC handlers (`set-autonomy-level`, `override-ai-decision`, `accept-proposal`, `reject-proposal`) rewrote it with raw `JSON.stringify(state)`
- `deserializeState(...)` also contained a real silent-loss bug: it checked `front_segments` on the top-level candidate object instead of under `military`, so `military.front_segments` was reset to `{}` on load

That combination meant the desktop could drift away from canonical save ordering and could silently lose replay-visible front-friction scaffolding.

## Canonical Model After Cleanup

- Canonical persisted state string: `serializeState(GameState)`
- Canonical desktop in-memory state blob: `currentGameStateJson`, but only when written via the canonical serializer
- Canonical explicit packet persistence: `state.military.last_briefing`
- Canonical derived packet reconstruction: `getOperationalSitrepView(...)` from loaded `GameState`

Rules after cleanup:
- desktop mutation handlers must read through `deserializeState(...)`
- desktop mutation handlers must write through `serializeState(...)`
- `front_segments` is persisted state and must survive deserialize intact
- operational SITREP remains derived, but its reconstruction must be stable after load

## Implementation

### Code

- `src/state/serialize.ts`
  - fixed `migrateState(...)` so `military.front_segments` is checked/defaulted under `military`, not against the top-level state object
  - added an explicit `missing military block` failure instead of silently muddling through
- `src/desktop/electron-main.cjs`
  - added `readCanonicalCurrentState(sim)` and `writeCanonicalCurrentState(sim, state, excludeSender)`
  - `get-autonomy-state` now reads via canonical deserialization
  - `set-autonomy-level`, `override-ai-decision`, `accept-proposal`, and `reject-proposal` now write back through canonical serialization instead of raw `JSON.stringify(...)`

### Tests

- `tests/state.test.ts`
  - added a desktop-style autonomy/proposal mutation round-trip test
  - proves:
    - `military.last_briefing` survives save/load intact
    - `military.front_segments` survives save/load intact
    - `getOperationalSitrepView(...)` reconstructs identically after load
    - `serialize -> deserialize -> serialize` remains byte-identical for the canonicalized post-mutation state
- `tests/desktop_persistence_contract.test.ts`
  - guards the desktop contract directly in source:
    - no `currentGameStateJson = JSON.stringify(state)` writes remain
    - autonomy/proposal handlers use the canonical helpers
    - `get-autonomy-state` no longer reads via raw `JSON.parse(...)`
- `tests/turn_pipeline_determinism_smoke.test.ts`
  - refreshed stale fixture defaults so the determinism smoke test is live again against the current canonical state shape

## Verification

### Targeted

- `npx.cmd vitest run tests/desktop_persistence_contract.test.ts tests/operational_sitrep_views.test.ts`
  - pass
- `npx.cmd tsx --test tests/state.test.ts`
  - 4/4 pass
- `npx.cmd tsx --test tests/turn_pipeline_determinism_smoke.test.ts`
  - 2/2 pass

### Full required checks

- `npm.cmd run test:vitest`
  - pass, 211 files / 2969 tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - pass
- `npm.cmd run build`
  - pass

### Evidence

- before fix, `deserializeState(...)` could erase `military.front_segments`
- after fix, `front_segments` round-trips explicitly in `tests/state.test.ts`
- before fix, late desktop autonomy/proposal writes could replace the canonical in-memory save string with ad hoc JSON
- after fix, the desktop state blob stays on the canonical serializer path
- command briefing remains explicitly persisted
- operational SITREP remains explicitly reconstructed, with stable output proven after load
- live engineering docs no longer advertise a desktop `Load Replay` / scrubber flow that the current IPC and map shell do not implement; replay timelines are documented only as harness-side artifacts now

## Deferred

Not touched in this lane:
- broader migration-path audit across every nested legacy default in `migrateState(...)`
- campaign-start snapshot optimization for desktop `New Game`
- any replay-feature resurrection or `v0.9` mechanics work

## Outcome

This lane materially raises persistence confidence before `v0.9`:
- one real silent-loss save/load seam is gone
- one real canonical-desktop-save seam is gone
- replay-visible front-friction scaffolding is now preserved instead of dropped on load
- unified briefing/SITREP surfaces now have stronger save/load proof behind them
