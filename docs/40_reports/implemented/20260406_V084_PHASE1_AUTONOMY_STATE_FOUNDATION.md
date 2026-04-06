# v0.8.4 Phase 1 — Autonomy State and Review Foundation

**Date:** 2026-04-06
**Status:** CLOSED
**Milestone:** v0.8.4 Autonomy Depth + Claude API at Political Level
**Phase:** 1 of 5+ (Phase A: State + Skeleton)

---

## Summary

Phase 1 lays the state schema, type infrastructure, and pipeline skeleton required for the v0.8.4 autonomy system. Three new fields on `StateMeta` express the player's current delegation level and any pending transitions; a new `apply-autonomy-transition` step (the 151st war-phase step) owns the commit logic. Decision routing at Level 2 and Level 3 is wired into the existing bot paths — no API calls occur in Phase A, and the fallback contract is fully defined.

---

## What Was Implemented

### State (game_state.ts)

New interface and three optional fields added to `StateMeta`:

```typescript
interface AutonomyOverride {
  faction: FactionId;
  domain: 'military' | 'political' | 'events';
  level: 0 | 1 | 2 | 3;
  expires_turn?: number;
}
```

| Field | Type | Purpose |
|---|---|---|
| `autonomy_level` | `0\|1\|2\|3` | Current active delegation level (0 = full presidential control; 3 = observer) |
| `autonomy_level_pending` | `0\|1\|2\|3` | Requested level, committed on next `apply-autonomy-transition` step |
| `autonomy_overrides` | `AutonomyOverride[]` | Per-domain, per-faction transient overrides (e.g. "military Level 2 until turn 40") |

All three fields are optional for backward compatibility. Absent fields are treated as Level 0 (full player control).

### Type Infrastructure (ai_types.ts, decision_log.ts)

**`ai_types.ts`:**
- New `PoliticalDecision` interface added to the `decision` discriminated union — carries `type: 'political'`, `faction`, `event_id`, `chosen_option_id`, and `rationale?: string`.
- `CommandDecisionLogEntry.level` union extended: was `'army' | 'corps' | 'brigade'`, now also accepts `'political' | 'event'`. Enables decision log consumers (briefing, trace viewers) to receive and display political-level entries without a type error.

**`decision_log.ts`:**
- `getLoggedDecision()` level parameter updated to match the extended union. No behavioral change — purely a type-safe extension of the existing log accessor.

### Pipeline Step (war_phases.ts)

`apply-autonomy-transition` added as the 151st step in the `war_phases` array. It runs after all existing phase steps (after `decay-officer-interpretation-state` at step 150). On each turn it:

1. Reads `state.meta.autonomy_level_pending`.
2. If a pending change is set and it differs from `autonomy_level`, applies the transition logic:
   - **Downward changes** (more delegation, e.g. 1→2) take one turn to apply — the pending value is written to `autonomy_level` on the *next* turn.
   - **Upward changes** (reclaiming control, e.g. 2→1) apply immediately — `autonomy_level` is written in the same turn.
3. Clears `autonomy_level_pending` after committing.
4. Prunes expired `autonomy_overrides` entries (`expires_turn < current_turn`).

The one-turn delay on downward changes reflects the Game Designer directive: reclaiming control should be instantaneous; delegating more authority requires a turn to propagate.

### Decision Routing (war_phases.ts + evaluate_events.ts)

**`war_phases.ts` — `ai-army-decisions` and `ai-corps-decisions` steps:**

The `botFactions` filter that gates AI military processing was extended. Previously it excluded the player's faction entirely. Now:
- When `state.meta.autonomy_level >= 2`, the player's faction is included in `botFactions` — the formula AI runs all military decisions for the player faction as if it were a bot faction.
- Level 0 and Level 1 preserve existing behavior (player faction fully excluded from bot processing).

**`evaluate_events.ts` — Level 3 event auto-response:**

`evaluateEvents()` now branches on `autonomy_level` before queuing `PendingEventDecision`:
- **Level 3 (Observer):** calls the existing `pickPoliticalResponse()` / `pickBotResponseV1` path to auto-resolve the event immediately. No new bot personality is introduced — the bot uses the same faction personality already in place.
- **Level 0–2:** queues a `PendingEventDecision` as before, routing the event to the player for resolution.

The distinction between `requires_player_response` / high-stakes events and routine auto-resolved events at Level 3 is deferred to Phase B/C per Game Designer review.

### Tests

7 new tests across 2 new test files:

| File | Tests | Coverage |
|---|---|---|
| `tests/sim/autonomy/autonomy_state.test.ts` | 4 | `AutonomyOverride` type shape; `autonomy_level` field presence and optionality; immediate vs. one-turn delay transition semantics; override expiry pruning |
| `tests/sim/autonomy/autonomy_event_routing.test.ts` | 3 | Level 3 auto-response fires bot path; Level 0–2 queues `PendingEventDecision`; Level 2 player-faction bot routing enabled |

Step count test updated: `tests/war_phase_step_order.test.ts` 150→151.

---

## Fallback Contract

The following table defines system behavior at each autonomy level when no API key is present or an API call fails. No API calls are made in Phase A; the table specifies the Phase B+ contract so it can be implemented against a clear promise.

| Level | Label | No API key | API error (Phase B+) |
|---|---|---|---|
| 0 | Full Presidential Control | Formula bot only for enemy factions. Player faction: no AI. Unchanged from pre-v0.8.4. | N/A — no API calls at Level 0 ever. |
| 1 | Assisted | Phase A: identical to Level 0. Phase B: AI proposal review surface added via IPC. No API calls if key absent; proposal surface shows "AI assistance unavailable." | Phase B: show last-known proposal or empty proposal state. Never block player action. |
| 2 | Delegated | Phase A: formula bot runs all military for player faction (same path as enemy factions). No API calls. Phase B: cadet guard fires first; if key absent, formula bot covers all decisions. | Phase B: formula bot fallback fires. Player sees "delegated to formula AI" status. |
| 3 | Observer | Phase A: formula bot auto-resolves all military and events using existing personality path. No API calls. Phase B+: high-stakes `requires_player_response` events surfaced to player regardless of autonomy level (deferred to Phase B/C). | Phase B+: formula bot fallback. All events auto-resolved via personality path. |

---

## Design Notes for Phase B

The following decisions emerged from the Game Designer review and must be carried into Phase B implementation:

1. **One-turn delay applies only to downward changes (more delegation).** Upward changes (reclaiming control) must apply immediately — this is a presidential authority assertion, not a gradual handoff. The `apply-autonomy-transition` step implements this correctly in Phase A.

2. **Level 3 Observer must surface `requires_player_response` / high-stakes events.** Auto-resolving *all* events at Level 3 is too aggressive. Phase B/C should define which event types carry a `requires_player_response` flag and route those to the player even in Observer mode. The current Phase A implementation auto-resolves everything via the bot path — this is a known Medium gap, not a blocking defect.

3. **Level 2 IPC handler must add a feature gate.** The `botFactions` extension for Level 2 is low actual risk in Phase A because no IPC handler exists to set `autonomy_level >= 2`. Phase B must add a feature gate check in the IPC handler before writing `autonomy_level_pending = 2` to prevent inadvertent activation during development or testing.

---

## Open Gaps

| Gap | Severity | Resolution |
|---|---|---|
| Level 3 `requires_player_response` routing | Medium | Deferred to Phase B/C. High-stakes events must not auto-resolve at Level 3; define flag and routing gate. |
| Level 2 `botFactions` test — player-faction military decisions verified end-to-end | Low | Phase A test confirms routing inclusion. Full end-to-end test (bot decisions actually land in GameState for player faction) should be added in Phase B alongside IPC handler. |

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | CLEAN |
| `npm run test:vitest` | 2772/2772 pass (193 files, +7 new tests) |
| `npm run desktop:map:build` | CLEAN |
| Canon review | GREEN |
| QA verdict | READY FOR COMMIT |

---

## Files Changed

| File | Change |
|---|---|
| `src/state/game_state.ts` | `AutonomyOverride` interface; 3 optional fields on `StateMeta` (`autonomy_level`, `autonomy_level_pending`, `autonomy_overrides`) |
| `src/sim/ai_commander/ai_types.ts` | `PoliticalDecision` interface; `CommandDecisionLogEntry.level` extended with `'political' \| 'event'`; `decision` union extended with `\| PoliticalDecision` |
| `src/sim/ai_commander/decision_log.ts` | `getLoggedDecision()` level parameter extended to match new union |
| `src/sim/turn_phases/war_phases.ts` | `apply-autonomy-transition` step (151st); `botFactions` filter in `ai-army-decisions` and `ai-corps-decisions` includes player faction when `autonomy_level >= 2` |
| `src/sim/events/evaluate_events.ts` | Level 3 auto-response via bot path; Level 0–2 queues `PendingEventDecision` |
| `tests/war_phase_step_order.test.ts` | Step count updated 150→151 |
| `tests/sim/autonomy/autonomy_state.test.ts` | New — 4 tests (state schema, transition semantics, override expiry) |
| `tests/sim/autonomy/autonomy_event_routing.test.ts` | New — 3 tests (Level 3 auto-response, Level 0–2 queuing, Level 2 routing) |

---

## Next Phase

**Phase B: Override System + IPC (grab the wheel)**

Primary deliverables:
- `src/sim/ai_commander/autonomy_overrides.ts` (new) — `applyAutonomyOverride()`, `clearAutonomyOverride()`, override validation and domain-scoping logic
- `electron-main.cjs` + `preload.cjs` — IPC handlers: `set-autonomy-level` (with feature gate), `set-autonomy-override`, `clear-autonomy-override`
- Level 1 AI proposal state — `PendingProposalReview[]` on `StateMeta`; proposal generation stub; IPC handler to accept/reject
- Level 2 IPC feature gate as specified in Design Note 3 above
- Level 3 `requires_player_response` flag and routing gate (Design Note 2 above)
