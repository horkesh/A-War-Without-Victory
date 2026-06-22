# Surface Truth And Provenance Follow-Up

**Date:** 2026-06-22  
**Type:** UI/read-model/test/docs polish.  
**Branch:** `codex/surface-truth-provenance-hardening`

## Summary

Closed three residual player-truth gaps found by the Pyrrhic surface scouts:

- Formation Detail sector-assignment counts now subtract brigades that have been validly overridden away to another same-corps sector.
- OOB corps cards now show a planning operation when no execution operation exists, instead of claiming there are no active operations while the OOB operation list shows staff work in planning.
- Setup-control summaries and unanswered foundational decisions no longer project as filed/faced player history in UI read models.

## Changes

- `FormationDetail` now passes the full same-corps sector list into `buildSectorFormationAssignment`, so stale roster-sector counts drop when a brigade is command-overridden elsewhere.
- OOB corps cards select `execution` operations first and then `planning` operations for display, matching Army HQ's planning-only truth.
- `shouldNarrateTerritorySummary` now suppresses explicit setup provenance markers (`setup_control`, `scenario_start`, `initial_control`, `is_setup`) in addition to turn-zero summaries.
- `deriveFiredEvents` skips pending unanswered event decisions even if their ids are present in `fired_event_ids`, preserving that field as internal once-only gating without showing an event as filed history before the player responds.
- `buildDilemmaSpine` does not mark a keystone dilemma as faced while the only evidence is an unanswered pending decision.

## Verification

- Red tests reproduced the stale source-sector count, planning-only OOB operation-card omission, setup-control provenance leak, fired-event overprojection, and Dilemma Spine pending-decision overclaim.
- Focused green proof: `node node_modules\vitest\vitest.mjs run tests\ui\formation_detail_parity.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\turn_aftermath.test.ts tests\chronicle_entries.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\first_hour_fired_event_labels.test.ts tests\ui\dilemma_spine.test.ts --pool=forks --reporter=dot` passed 116/116.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:first-hour:browser` passed with all RBiH, RS, and HRHB foundational decision flows resolved, turn-zero Records/AAR provenance counts at zero for all factions, receipt checks true, raw first-hour labels absent, and server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with RBiH and RS owner drilldowns, Ops Planning modal reachability, setup-provenance record-card count at zero, war-start foundational flow proof, and server cleanup verified.
- `npm.cmd run qa:player-journeys` passed 263/263.
- Temporary browser evidence folders were removed after verification.

## Scope

UI/read-model/test/docs polish only. No simulation logic, event evaluator mechanics, scenario source data, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
