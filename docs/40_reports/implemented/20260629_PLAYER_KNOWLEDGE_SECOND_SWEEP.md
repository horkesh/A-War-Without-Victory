# Player-Knowledge Second Sweep

Date: 2026-06-29

## Summary

This sweep followed the first-hour Codex/ticker repair and used parallel Pyrrhic audit lanes to look for the same class of failure across other first-hour and player-facing contracts. The sweep found additional leaks or guard gaps in first-contact copy, consequence receipts, Warroom ticker chronology, dynamic ticker fallbacks, pending-decision adapter state, AI-as-player serialization, and production DOM attributes.

The fix standardizes the rule: player surfaces may show current facts and confirmed receipts, but they must not name branchable future historical outcomes or expose authoring contracts before the campaign has surfaced the relevant event.

## Changes

- Removed pre-receipt Dayton naming from opening brief, onboarding, and command-briefing copy; first-hour sentinel coverage now includes those strings.
- Changed consequence receipts to confirmed-only materialization. Pending and foreclosed `future_consequences` no longer create player-visible receipt rows or counts.
- Receipt-gated additional static Warroom ticker rows:
  - Srebrenica siege/offensive/Morillon/safe-area setup.
  - UN safe-area declarations including Zepa.
  - Washington Agreement / HVO-ARBiH ceasefire / Federation constitution.
  - October 1995 ceasefire, 51% halt, IFOR, UNPROFOR replacement, and entity-boundary rows.
- Changed dynamic ticker settlement fallback from raw `S*` / `op:*` identifiers to generic reported-sector language.
- Sanitized `GameStateAdapter` pending event decisions into a player-facing DTO instead of passing raw engine objects through to the UI store.
- Removed future-consequence and source-note contracts from AI-as-player `serializeDecisionContext(...)`.
- Removed raw event/response ids from EventDecisionModal production DOM and gated DecisionHistoryOverlay raw id attributes/source notes behind diagnostics.
- Updated first-hour browser gate to click decision responses by visible label and to fail on any first-hour `Dayton` mention.

## Verification

Passed:

- `npm.cmd exec -- vitest run tests/ui/warroom_ticker_event_receipts.test.ts tests/ui/consequence_receipts.test.ts tests/ui/decision_history_overlay_dev_gate.test.ts tests/tutorial_content_v1.test.ts tests/ai_play_decision_context_contract.test.ts tests/ui_adapter_boundary.test.ts tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot`
- `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `npm.cmd run warroom:build`
- `npm.cmd run desktop:map:build`
- `npm.cmd run qa:first-hour:browser`
- `npm.cmd run qa:live-surface:browser`

Known non-fatal build warnings remain the existing Vite chunk-size / externalized Node module / loaders.gl warnings.

## Scope

UI presentation, read-model projection, browser-QA tooling, AI-player serialization, tests, and docs only.

No simulation resolver behavior, event evaluator mechanics, event JSON, scenario data, startup artifact, save schema, baseline/golden manifest, structural fingerprint artifact, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
