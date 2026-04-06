# v0.8.4 Phase B — IPC Wiring, Review Surface, and Fallback Discipline

**Date:** 2026-04-06
**Status:** CLOSED
**Milestone:** v0.8.4 Autonomy Depth + Claude API at Political Level
**Phase:** B of 5+ (Phase B: IPC Wiring + Review Surface + Fallback Discipline)

---

## Summary

Phase B wires the IPC surface that the frontend needs to read and set autonomy state, closes the Phase 1 open gap on `requires_player_response` event routing at Level 3 Observer, and introduces the `PendingProposalReview` state schema as a stub for the Level 1 proposal review surface. Three new IPC handlers (`get-autonomy-state`, `set-autonomy-level`, `override-ai-decision`) and three matching preload bridge entries are live. Level 2+ is feature-gated: `set-autonomy-level` returns a structured error for any target level ≥ 2, preventing inadvertent full-delegation activation during development. The `autonomy_overrides.ts` module provides pure deterministic helpers for applying, clearing, and reading per-domain overrides. No API calls are made in Phase B.

---

## What Was Implemented

### Override Helpers (`src/sim/ai_commander/autonomy_overrides.ts` — NEW)

Three pure deterministic functions over `GameState`:

| Function | Purpose |
|---|---|
| `applyAutonomyOverride(state, {level, target_id, faction})` | Idempotent upsert: removes any existing entry with the same `target_id`, then pushes a new `AutonomyOverride` (stamped with `state.meta.turn`). Initializes the array if absent. |
| `clearAutonomyOverride(state, targetId)` | Removes the entry for the given `target_id`; no-ops if not found. |
| `getAutonomyOverride(state, targetId)` | Returns the active `AutonomyOverride` for the given `target_id`, or `undefined` if absent. |

All three functions are deterministic: no `Math.random()`, no `Date.now()`, no timestamps. They operate directly on `GameState` and return `void` or a value — no side effects outside state mutation.

### State Schema (`src/state/game_state.ts`)

New `PendingProposalReview` interface added to `game_state.ts`:

```typescript
interface PendingProposalReview {
  id: string;                        // deterministic: "PROP_<turn>_<domain>_<seq>"
  turn: number;
  faction: FactionId;
  domain: 'military' | 'political' | 'events';
  description: string;               // human-readable summary
  proposed_action: string;           // canonical action identifier
  accepted?: boolean;                // set when player responds; absent = pending
  resolved_turn?: number;            // turn when player responded
}
```

`StateMeta` extended with `pending_proposal_reviews?: PendingProposalReview[]` — optional for backward compatibility. This field is the read/write substrate for the Level 1 proposal review surface. In Phase B it is a stub: no AI path populates it yet. Phase C adds the formula AI proposal generation path and the `accept-proposal` / `reject-proposal` IPC handlers.

### Level 3 Gate (`src/sim/events/evaluate_events.ts`)

Phase 1 auto-resolved all events at Level 3 Observer via the bot path — this was identified as a known Medium gap. Phase B closes it.

`evaluateEvents()` now evaluates a `mustShowPlayer` flag before queuing or auto-resolving:

```
mustShowPlayer = playerFaction && (autonomyLevel < 3 || def.requires_player_response === true)
```

Effect: at Level 3 Observer, events that carry `requires_player_response: true` are still queued to the player as `PendingEventDecision` rather than auto-resolved. Routine events without the flag continue to auto-resolve at Level 3 via the existing bot personality path. This implements Design Note 2 from the Phase 1 spec exactly.

`requires_player_response?: boolean` was already present on `EventDefinition` in `event_types.ts` — no change to that file was needed.

### IPC Handlers (`src/desktop/electron-main.cjs`)

Three new IPC handlers registered in `electron-main.cjs`:

| Handler | Behavior |
|---|---|
| `get-autonomy-state` | Reads `state.meta.autonomy_level`, `autonomy_level_pending`, `autonomy_overrides`, and `pending_proposal_reviews` from the current save; returns them as a structured object. Returns null values gracefully if no save is loaded. |
| `set-autonomy-level` | Validates requested level. **Level 2+ feature gate:** returns `{ ok: false, error: 'level_2_plus_not_yet_enabled' }` for any target level ≥ 2. For Level 0–1: writes `autonomy_level_pending` to state, persists save. Direction convention: level increase (more delegation) takes one turn to apply via `apply-autonomy-transition`; level decrease (reclaiming control) is immediate. |
| `override-ai-decision` | Accepts `{ level: 'army'|'corps'|'event', target_id: string, faction: FactionId }`. Inline idempotent upsert to `state.meta.autonomy_overrides` (mirrors `applyAutonomyOverride` — ESM module cannot be required from CJS). Persists save. Used to record per-decision player overrides without changing the global autonomy level. |

### Preload Bridge (`src/desktop/preload.cjs`)

Three new entries added to the `contextBridge.exposeInMainWorld` block:

| Bridge entry | Maps to |
|---|---|
| `getAutonomyState()` | `ipcRenderer.invoke('get-autonomy-state')` |
| `setAutonomyLevel(level)` | `ipcRenderer.invoke('set-autonomy-level', level)` |
| `overrideAiDecision(override)` | `ipcRenderer.invoke('override-ai-decision', override)` |

### Tests (`tests/sim/autonomy/autonomy_phase_b.test.ts` — NEW)

9 new tests:

| Test | Coverage |
|---|---|
| `applyAutonomyOverride` writes entry to empty array | Override helper initializes array |
| `applyAutonomyOverride` replaces existing same-domain entry | Idempotency / replace semantics |
| `clearAutonomyOverride` removes matching entry | Removal path |
| `clearAutonomyOverride` no-ops on absent entry | Defensive no-op |
| `getAutonomyOverride` returns matching entry | Read path |
| `getAutonomyOverride` returns undefined when absent | Null case |
| `PendingProposalReview` schema — field presence and optionality | State schema contract |
| Level 3 `requires_player_response=true` routes to player | Level 3 gate (Design Note 2) |
| Level 3 `requires_player_response=false` auto-resolves via bot | Routine event at Level 3 |

---

## Fallback Contract (Updated)

The following table reflects the updated state of the fallback contract after Phase B. Cells that changed from Phase 1 are noted.

| Level | Label | No API key | API error (Phase C+) |
|---|---|---|---|
| 0 | Full Presidential Control | Formula bot only for enemy factions. Player faction: no AI. Unchanged from pre-v0.8.4. | N/A — no API calls at Level 0 ever. |
| 1 | Assisted | **Phase B: IPC wiring live** (`get-autonomy-state`, `set-autonomy-level` for level 0–1). `PendingProposalReview` schema present but no AI path populates it yet (Phase C stub). Proposal surface shows "AI assistance unavailable" when no proposals present. | Phase C: show last-known proposal or empty proposal state. Never block player action. |
| 2 | Delegated | **Phase B: feature-gated.** `set-autonomy-level` returns `{ ok: false, error: 'level_2_plus_not_yet_enabled' }` for level ≥ 2. Formula bot covers all decisions via Phase 1 `botFactions` path. | Phase C: formula bot fallback. Player sees "delegated to formula AI" status. |
| 3 | Observer | **Phase B: `requires_player_response` gate live.** High-stakes events now route to player even at Level 3. Routine events auto-resolve via bot personality path. | Phase C+: formula bot fallback. High-stakes events always surfaced to player. |

---

## Open Gaps

| Gap | Severity | Resolution |
|---|---|---|
| Level 1 proposal generation — formula AI does not yet populate `pending_proposal_reviews` | Medium | Phase C. `PendingProposalReview` schema is live; Phase C adds the AI path that writes proposals to it. |
| `accept-proposal` / `reject-proposal` IPC handlers | Medium | Phase C. Required alongside proposal generation; no value without proposals to accept/reject. |
| UI component consuming `getAutonomyState` / `setAutonomyLevel` | Medium | Phase C. IPC surface is live; Phase C adds the React component that exposes the autonomy slider to the player. |
| Level 2+ full-delegation path | Low | Phase C unlock. Feature gate is intentional; `set-autonomy-level` at level 2+ will be unblocked once proposal review surface is complete. |
| `override-ai-decision` end-to-end test (override lands in GameState, is read back by `getAutonomyState`) | Low | Phase C. Phase B unit tests cover helper functions. Integration test deferred alongside UI surface. |

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | CLEAN |
| `npm run test:vitest` | 2781/2781 pass (194 files, +9 new Phase B tests; was 2772/2772) |
| `npm run desktop:map:build` | CLEAN (6.47s) |
| Canon review | GREEN |
| QA verdict | READY FOR COMMIT |

---

## Files Changed

| File | Change |
|---|---|
| `src/state/game_state.ts` | `PendingProposalReview` interface; `pending_proposal_reviews?: PendingProposalReview[]` on `StateMeta` |
| `src/sim/events/evaluate_events.ts` | Level 3 `requires_player_response` gate: `mustShowPlayer = playerFaction && (autonomyLevel < 3 \|\| def.requires_player_response === true)` |
| `src/desktop/electron-main.cjs` | 3 new IPC handlers: `get-autonomy-state`, `set-autonomy-level` (w/ Level 2+ feature gate), `override-ai-decision` |
| `src/desktop/preload.cjs` | 3 new bridge entries: `getAutonomyState`, `setAutonomyLevel`, `overrideAiDecision` |
| `src/sim/ai_commander/autonomy_overrides.ts` | NEW — `applyAutonomyOverride`, `clearAutonomyOverride`, `getAutonomyOverride` (pure deterministic helpers) |
| `tests/sim/autonomy/autonomy_phase_b.test.ts` | NEW — 9 tests (override helpers, PendingProposalReview schema, Level 3 gate) |

---

## Next Phase

**Phase C: Level 1 Proposal Generation and UI Surface**

Primary deliverables:
- Formula AI proposal generation path — populates `pending_proposal_reviews[]` during the `apply-autonomy-transition` step (or a dedicated step) for Level 1 Assisted mode
- `accept-proposal` and `reject-proposal` IPC handlers in `electron-main.cjs` + `preload.cjs`
- React UI component consuming `getAutonomyState` / `setAutonomyLevel` — autonomy slider + proposal review panel
- Level 2+ feature gate unlock: remove gate from `set-autonomy-level` once proposal review surface is complete and Level 2 full-delegation UX is validated
- End-to-end integration test: override applied via IPC → persisted to save → readable via `getAutonomyState`
