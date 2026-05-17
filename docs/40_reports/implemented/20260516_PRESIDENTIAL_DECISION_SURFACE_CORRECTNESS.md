# Presidential Decision Surface Correctness Closeout

**Date:** 2026-05-16  
**Plan:** `docs/plans/2026-05-16-presidential-decision-surface-correctness-plan.md`  
**Source audit:** `docs/40_reports/audits/20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md`

## Summary

Phase 0.1 is implemented. Generated player decisions now have a shared manifest contract for ownership, surface, resolver, and gate policy. The closeout fixes the convoy resolver path, event responding-faction scoping, UI readiness/counters, and desktop advance hard-blocking so the player cannot be blocked by an invisible or wrongly owned decision family.

## Implemented

- Added `src/desktop/convoy_ipc_contract.cjs` and routed `stage-convoy-decision` through `state.military.pending_convoy_decisions`; the root convoy queue is no longer a resolver target.
- Updated event decision queuing so required player decisions are offered only to the authored `responding_faction`.
- Added explicit valid `responding_faction` metadata to required-response 1992-1995 event catalog entries.
- Added `src/state/player_decision_manifest.ts` with deterministic summaries and blocking lists for event decisions, peace plans, Dayton negotiations, paramilitary requests, convoy decisions, reserve requests, officer events, autonomy proposal reviews, and operation opportunities.
- Wired `GameStateAdapter`, pre-advance review, Presidential Decision Room readiness/metrics, and desktop `advance-turn` to the manifest summary.
- Added fallback Decision Room cards for manifest-blocking modal families so the UI cannot report "Review before advance" without an actionable row.

## Verification

- `npx.cmd vitest run tests\desktop_convoy_decision_contract.test.ts tests\event_response_ownership_catalog.test.ts tests\event_decisions.test.ts tests\events_evaluate.test.ts tests\integration_event_system.test.ts tests\player_decision_manifest.test.ts tests\desktop_player_decision_gate_contract.test.ts tests\desktop_persistence_contract.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\phase_c_supply_agency.test.ts` passed 110/110.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:sim:build` passed with the existing `import.meta` CJS warning.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/dynamic-import/chunk warnings.
- `git diff --check` reported CRLF normalization warnings only.

## Durable Rule

Future generated player-decision families must register in `src/state/player_decision_manifest.ts` before they are considered surfaced. The registration must cover producer/source path, player-faction scoping, owning surface, resolver/action route, and gate policy. `inboxItems.ts` coverage alone is not sufficient.
