# Decision Provenance Read-Model Follow-Up

Date: 2026-06-23

## Summary

Closed the next decision-provenance follow-up after the Pyrrhic auditor found remaining broad player-history consumers.

- Dilemma Spine now treats raw `fired_event_ids` as a compatibility fallback only when no decision log row exists; logged bot or foreign-faction decisions can no longer mark a loaded player's dilemma as faced.
- Promise-to-receipt consequence rows now require player-authored decisions for the loaded player faction before applying last-wins ownership.
- `getPlayerDecisionHistory()` and counterfactual divergence helpers now filter to the loaded player's faction when `meta.player_faction` is available, while preserving legacy player-source behavior for older state without that metadata.
- Branch-tag projection now uses only player-filed decisions for the faction being queried, so bot defaults no longer activate player branch badges or Wrapped/Codex branch displays.
- Distance from History now matches its visible "Your War vs History" framing by counting only the loaded player's filed decisions.

## Verification

Focused provenance proof passed:

```powershell
node node_modules\vitest\vitest.mjs run tests\causality_query.test.ts tests\ui\distance_from_history.test.ts tests\ui\dilemma_spine.test.ts tests\ui\consequence_receipts.test.ts tests\ui\first_hour_fired_event_labels.test.ts tests\ui\decision_consequence_trail.test.ts --pool=forks --reporter=dot
```

Result: 6 files, 82 tests passed.

Additional verification:

```powershell
npm.cmd run typecheck
npm.cmd run qa:player-journeys
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
git diff --check
```

Results: typecheck passed. `qa:player-journeys` passed 288/288. `qa:first-hour:browser` passed with `first-hour browser gate ok` and dev-server cleanup verified. `qa:live-surface:browser` passed with `live surface browser sweep ok` and dev-server cleanup verified. Browser evidence folders were removed after inspection.

## Scope

Read-model/query-helper/UI-test/docs hygiene only. Although `src/sim/events/causality_query.ts` changed, it remains a pure query helper and does not mutate state or participate in event evaluation. No simulation logic, event firing, scenario data, startup artifact, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
