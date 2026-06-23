# 2026-06-23 Canon Content And Field Context Follow-Up

## Summary

This packet closes the current canon/content follow-up and a low-risk field-context polish slice from the Pyrrhic scouts.

- Zepa's Codex dynamic section is now an event-cost finding keyed to `zepa_falls_1995`, not a rupture finding. Srebrenica remains the single rupture-token Codex path.
- The RS foundational Six Strategic Goals event names General Ratko Mladic in English and BCS copy instead of using generic "your commander" framing.
- Turn Aftermath now gates setup-control and turn-zero summaries through the same narrated-summary boundary for territory, combat, humanitarian cost, formations, supply deltas, strategic signals, and cost judgment.
- Army HQ reserve drilldowns preserve known settlement context through `field-formation-in-army-reserve.osid`.
- Corps Front operation-objective focus now opens settlement inspection as well as panning the map.
- Formation GeoJSON no longer carries inferred supply-state metadata from fatigue/cohesion/status.
- Expanded visible formation stacks sort by deterministic formation id order, matching marker construction.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\codex_essay_vocab_integration.test.ts tests\ui\codex_essay_resolver.test.ts tests\ui\event_decision_modal_phase3.test.ts tests\ui\turn_aftermath.test.ts tests\ui\gamestore_field_inspection.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui_map_render_smoke.test.ts tests\ui_player_visibility.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts --pool=forks --reporter=dot` passed 201/201.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 518 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed with the longer local timeout; the earlier run timed out locally, not from a reported gate failure.

## Deferred Scout Findings

The next systems/data packet should address rear/support sector truth and startup roster policy:

- Shared `sectorUtils` should model `rear_brigade_ids` consistently with Formation Detail and Corps Detail without inflating frontline density.
- Startup sector rosters should not include non-fielded `readiness: forming` brigades as combat sector assignments unless explicitly classified as assembly/support.
- Active fielded brigades with corps membership and `assignment: null` need explicit `sector`, `rear/support`, or `hq_reserve` classification.

## Scope

UI/read-model/content/test/docs polish only. No simulation logic, event evaluator mechanics, save schema, startup snapshot generation, generated calibration artifact, structural fingerprint, golden manifest, packaged installer artifact, randomness, locale sorting, or persisted output ordering changed.
