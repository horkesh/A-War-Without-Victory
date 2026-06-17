# Startup Operation-Participant and Raw-Copy Polish

Date: 2026-06-17

## Summary

This closeout fixes the red desktop campaign-start contract from the previous push and closes another player-facing raw-copy lane found during live review.

Startup unresolved-sector diagnostics now treat active-operation participants as already owned by their operation context. This prevents opening operation participants such as `rs_visegrad_brigade` from being misreported as sector-orphaned at campaign birth.

The UI now projects player-safe operation labels across Operation History, Chronicle operation cards, settlement timelines, forced-operation receipts, and Army Reserve evidence copy while retaining raw ids/names internally for joins and diagnostics. The RS foundational decision's non-diagnostic future-consequence preview also strips flag/consequence vocabulary from visible prose.

## Scope

- `src/sim/combat/corps_front_sectors.ts`
  - Excludes active-operation participants from unresolved-sector brigade diagnostics.
- `src/ui/map/data/GameStateAdapter.ts`
  - Adds `operation_display_name` for completed and active operation rows.
- `src/ui/map/data/types.ts`
  - Carries optional operation display labels in the UI read model.
- `src/ui/map/components/OperationHistoryPanel.tsx`
  - Prefers display labels for operation records.
- `src/ui/map/components/chronicle/generateChronicleEntries.ts`
  - Uses display labels for operation and officer Chronicle entries.
- `src/ui/map/utils/buildSettlementTimeline.ts`
  - Uses display labels for settlement operation timeline events.
- `src/ui/map/data/forcedOpReceipts.ts`
  - Formats forced-operation receipt operation names through the player-safe helper.
- `src/ui/map/utils/armyReserveSeverity.ts`
  - Formats Army Reserve operation evidence through the player-safe helper.
- `src/ui/map/utils/formatters.ts`
  - Normalizes compact corps slugs such as `vrs_drinacorps` into readable corps names.
- `src/ui/map/components/EventDecisionModal.tsx`
  - Adds RS Six Strategic Goals future-consequence term replacements for non-diagnostic display.

## Determinism And Calibration

No scenario source data, save schema, generated artifacts, calibration constants, golden baselines, randomness, timestamps, or persisted output ordering changed.

The simulation touch is a deterministic diagnostic classification boundary: active operation participants are not unresolved sector brigades at startup. Structural fingerprint and baseline regression remained unchanged.

## Verification

- `npx.cmd vitest run tests\desktop_campaign_start_contract.test.ts --pool=forks --reporter=dot` passed 7/7.
- `npx.cmd vitest run tests\final_sector_truth_reconciliation.test.ts tests\final_sector_truth_reconciliation_cache.test.ts tests\sector_frontline_truth.test.ts tests\brigade_territory_reconciliation.test.ts --pool=forks --reporter=dot` passed 76/76.
- Operation-label UI pack passed 83/83.
- `npx.cmd vitest run tests\ui\event_decision_modal_phase3.test.ts --pool=forks --reporter=dot` passed 6/6.
- `npm.cmd run ci:structural-fingerprint:check` preserved fingerprint `dbd82a4719719c55`.
- `npm.cmd run test:baselines` matched all scenarios.
- `npm.cmd run test:vitest:scenario` passed 105/105 with 1 skipped.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 103/103.
- `npm.cmd run desktop:map:build` passed.
- Live in-app browser smoke on `http://127.0.0.1:4179/` verified RS start, war-start splash, opening brief, `The Assembly Speaks`, default decision resolution, Army HQ, Records, and Chronicle with no console errors and no raw operation/id probe hits.
- `git diff --check` passed.

## Follow-Up

Continue autonomous polish on the remaining non-operation raw-copy lanes, Vitezovi PPN-vs-local-brigade identity modeling, Drina/Krivaja lifecycle triage, issue #170 residuals, PR #329 held/NO-GO verification, and any actionable GitHub/Codex comments.
