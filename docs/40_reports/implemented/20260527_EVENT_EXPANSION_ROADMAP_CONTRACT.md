# Event Expansion Roadmap Contract

**Date:** 2026-05-27
**Result:** Roadmap close-in plus branch-visibility metadata/diagnostics contract

## Summary
- Updated the event-system roadmap contract for the approved direction: a full historical/counterfactual event database with explicit historical/default labels, historical bot calibration, causal branch opens/closes, detailed modal explanations, and material consequences.
- Preserved the current gate: no broad event content authoring until sensitive-history, source, and historical-default decisions are satisfied.
- Implemented the immediate safe slice as behavior-neutral `future_consequences` response-option metadata, loader validation, taxonomy diagnostics, and focused tests. The next content/product step is the foundational decisions packet before authoring waves.

## Changes Made

### Event Plan
- Added the user-approved expansion contract to `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md`.
- Replaced the open-ended closeout sequence with a six-phase expansion sequence:
  1. Dispatch and baseline lock.
  2. Branch visibility metadata and diagnostics.
  3. Foundational decisions packet.
  4. Predicate and consequence substrate.
  5. Modal-first presidential explanation pass.
  6. Gated historical and counterfactual authoring waves.

### Command Board
- Reframed the event-system lane as active/gated: technical substrate and current acceptance diagnostics are closed, but broad content authoring remains blocked.
- Recorded branch-visibility metadata/diagnostics as the behavior-neutral closed slice and set the next executable action to the foundational decisions packet.

### Reports and Ledger
- Added this implementation report and registered it in the reports index and consolidated implemented index.
- Added a PROJECT_LEDGER entry marking the change as behavior-neutral diagnostics/roadmap work.

### Branch-Visibility Metadata Contract
- Added optional response-option `future_consequences` metadata for player-facing branch visibility.
- Validated metadata shape, timing/certainty enums, string-array fields, and dangling opened/closed event references.
- Extended taxonomy rows and tests so malformed or dangling future-consequence metadata blocks modal readiness until corrected.

## Boundary
- Behavior-neutral code/test/docs change. No event JSON, scenario data, save schema, generated artifacts, UI behavior, event firing, bot choices, runtime evaluator gating, or calibration behavior changed.
- `docs/plans/MASTER_ROADMAP.md` was not edited because this slice was scoped to the event plan, command board, ledger, reports index, consolidated implemented index, diagnostics metadata, and focused tests.
- `.claude/scheduled_tasks.lock` had pre-existing local changes and was not touched.

## Files Changed

| File | Change |
| --- | --- |
| `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Added event expansion contract and six-phase gated sequence. |
| `docs/plans/COMMAND_BOARD.md` | Updated event-system lane next action and gates. |
| `src/sim/events/event_types.ts` | Added optional response-option `future_consequences` metadata type. |
| `src/sim/events/event_loader.ts` | Added behavior-neutral metadata validation and dangling event-reference rejection. |
| `tools/diagnostics/event_taxonomy_report.ts` | Added future-consequence summaries/findings and readiness blocking for malformed/dangling metadata. |
| `tests/event_loader.test.ts` | Added loader coverage for valid and invalid future-consequence metadata. |
| `tests/sim/events/event_taxonomy_report.test.ts` | Added taxonomy coverage for future-consequence summaries, findings, and readiness blocking. |
| `tests/sim/events/event_acceptance_report.test.ts` | Corrected stale current-count expectation for missing authored source notes. |
| `docs/PROJECT_LEDGER.md` | Added docs/process ledger entry. |
| `docs/40_reports/README.md` | Registered the roadmap contract report. |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Registered the roadmap contract report. |
| `docs/40_reports/implemented/20260527_EVENT_EXPANSION_ROADMAP_CONTRACT.md` | New implementation report. |

## Verification
- `npx.cmd vitest run tests/event_loader.test.ts tests/sim/events/event_taxonomy_report.test.ts tests/sim/events/event_acceptance_report.test.ts tests/sim/events/event_presidential_acceptance.test.ts tests/events_evaluate.test.ts tests/event_decisions.test.ts tests/player_decision_manifest.test.ts --reporter=dot` - PASS; 124/124 tests.
- `npx.cmd tsx tools/diagnostics/event_taxonomy_report.ts --json` - PASS.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS.
- Independent review - fixed blockers on readiness gating and docs scope consistency.

## Next Steps
- Draft the foundational decisions packet for historical/default labels, source boundaries, sensitive-history limits, and material-consequence minimums before broad event authoring.
