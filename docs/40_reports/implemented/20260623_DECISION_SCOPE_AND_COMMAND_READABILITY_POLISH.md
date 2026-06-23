# Decision Scope And Command Readability Polish

Date: 2026-06-23

## Summary

Closed the follow-up Pyrrhic scout findings from the command drilldown/decision ownership tranche.

- Decision Room pending event reviews now scope to the loaded player faction instead of showing foreign-faction event decisions.
- Pre-advance legacy fallback counts now ignore foreign pending event decisions.
- Officer matter modals resolve the exact Inbox dedupe id instead of opening the first pending officer event.
- Presidential blocker tests now encode convoy ownership: player-route convoy decisions block the turn, foreign-route convoy decisions do not.
- Army HQ sector rows now spell out reserve and command-directed counts without staff shorthand or `//` separators, and density includes command-directed front elements while excluding reserves.
- ORBAT brigade rows now expose a stable accessible command summary with name, personnel, supply truth, cohesion, fatigue, and status.
- Formation Detail renders simple municipality slugs as player-facing names.
- Corps Front shows `Friendly line reported` when a friendly line exists but the precomputed strength class is unreported, instead of collapsing to a dash.
- Stale H1/packaging plans now say packaging is paused and Srebrenica/Zepa fall delivery is event-owned; legacy DELIV/delivery-status terms are diagnostic-only.

## Verification

Focused proof passed:

```powershell
node node_modules\vitest\vitest.mjs run tests\ui\presidential_blockers.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\decision_family_modals.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\army_hq_sector_truth.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\corps_front_panel_routing.test.ts --pool=forks --reporter=dot
```

Result: 8 files, 91 tests passed.

Additional verification passed:

```powershell
npm.cmd run typecheck
npm.cmd run qa:player-journeys
npm.cmd run qa:live-surface:browser
git diff --check
```

Results: typecheck passed; player journeys passed 27 files / 284 tests; live surface browser sweep passed with `ok: true` across 41 steps and verified dev-server port cleanup; temporary live-surface evidence was removed after inspection; diff check passed.

The prior GitHub Baseline Regression failure on `e83f7c21b` was traced to `tests/ui/presidential_blockers.test.ts`: the tests expected an RS-route convoy to block an RBiH player after the intended player-route scoping change. The engine-health job failure in the same workflow was a downstream dependency result from that failed test job, not an independent workflow defect.

An attempted local full fast-suite run exceeded the local 20-minute command window and was not counted as passing; GitHub Baseline Regression remains the authoritative full-suite gate for this packet.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, startup artifact, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
