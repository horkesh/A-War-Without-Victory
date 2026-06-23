# Army HQ Readability And Provenance Integration

**Date:** 2026-06-23
**Branch:** `codex/army-hq-readability-next`
**Result:** Integrated UI/read-model polish batch; packaging remains paused.

## Summary
- Army HQ, OOB, Corps Detail, and sector surfaces now distinguish friendly line truth from reserve/member context and avoid exposing raw/generated labels in player-facing rows.
- Decision, receipt, Chronicle, Codex, AAR, and Distance from History surfaces now require player-filed ownership for player history while preserving non-decision and legacy no-log compatibility.
- Browser proof was rerun against the integrated tree, including first-hour and full live-surface sweeps.

## Changes Made

### Army HQ And Sector Truth
- `ArmyReservePanel` fixes the hook-order crash by keeping store hooks before early return paths.
- `SectorsSection`, `OOBSidebar`, and `CorpsDetail` use assignment `lineHoldingIds` for visible friendly-line strength and density truth, leaving reserve/member rows as command context rather than fake front strength.
- Sector copy now renders `No friendly line` / `Enemy picture unconfirmed` instead of favorable threat or strength language when the read-model lacks line or intel confidence.
- Officer profile origin badges can be hidden where current allegiance is the player-facing truth.

### Decision Provenance
- `player_decision_manifest`, `decisionConsequenceLedger`, `filedRecordTruth`, `presidentialDecisionRoom`, and pre-advance review now scope player history, receipts, convoy/counter-offer blockers, and fallback cards to player-filed decisions for the loaded faction.
- Counter-offers carry optional target-faction ownership through the adapter and type surface.
- Raw decision-history fallbacks were removed from filed record truth so pending, bot, or foreign decisions do not become player memory.

### Chronicle, Codex, AAR, And Distance From History
- Dynamic Codex response sections reject bot/foreign decision rows when ownership is known.
- Chronicle range/chrome helpers derive ranges from narrated summaries and fall back to generated entry turns for setup-only states.
- AAR treats setup/non-narrated summaries as no report across sections.
- War Summary personnel and at-arms totals use the shared fielded tactical formation boundary.
- Distance from History uses player-safe fallback titles when catalog titles are absent.

## Verification
- `.\vitest.cmd run tests\dynamic_codex_slice_v1.test.ts tests\ui\chronicle_spine_scrubber.test.ts tests\ui\aar_tooltip_friction_labels.test.ts tests\ui_army_hq_war_summary_visibility.test.ts tests\ui\distance_from_history.test.ts tests\codex_srebrenica_rupture_receipt.test.ts tests\chronicle_entries.test.ts tests\ui_chronicle_turn_record_link.test.ts tests\ui_chronicle_operation_aar_link.test.ts tests\ui\personnel_player_safe_display.test.ts --pool=forks --reporter=dot` passed 101/101.
- `.\vitest.cmd run tests\ui\army_hq_sector_truth.test.ts tests\ui\army_reserve_hook_order.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts tests\player_decision_manifest.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\filed_record_truth.test.ts tests\presidential_decision_room_counter_offer.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\gui_audit_dead_controls.test.ts tests\ui_map_sector_lookup.test.ts --pool=forks --reporter=dot` passed 114/114.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 531 tests.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.

## GitHub Follow-Up
- The latest remote `main` failure on `00e6560b4` was traced to `tests/ui_map_sector_lookup.test.ts` expecting objects without `lineHoldingIds`; this packet updates that local test and passes it.
- The `engine-health-188w` red result in that workflow was downstream of the skipped scenario job after the unit failure, not an independent 188w defect.
- Older unresolved Codex P2 comments remain queued outside this packet: PR #440 Sarajevo contained-set gating, PR #442 verdict-fidelity tab-badge scope, and PR #444 life-lessons topic/count drift.

## Determinism And Scope
- UI/read-model/test/docs polish only.
- No simulation logic, scenario data, startup artifact, event evaluator mechanics, turn pipeline, save schema, calibration floor, structural fingerprint, baselines, golden manifests, installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
- Srebrenica/Zepa fall receipts remain event-owned, not scripted-operation calibration targets.

## Next Steps
- Push this integrated packet, monitor GitHub until green, then delete the feature and worker branches/worktrees.
- Address the three older Codex P2 comments in a separate batch so this integration packet stays bounded.
