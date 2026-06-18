# Army HQ First-Paint / Drilldown Polish

**Date:** 2026-06-18  
**Scope:** UI/store route/read-model polish only. No simulation logic, scenario data, save schema, generated calibration artifact, 188w floor, golden baseline, or packaged installer artifact changed.

## Summary

This closes the scoped Army HQ first-paint/drilldown ergonomics slice from the Pyrrhic UI review.

- Army HQ first paint now includes a compact corps `Command Access` strip above the briefing grid, with readiness, sector counts, and operation counts. Corps buttons use the existing corps drilldown path.
- Expanded corps cards now surface sectors and operations before command-friction/narrative detail, with sectors/operations default-open when data exists.
- Toolbar Records and Warroom/Decision Room archive handoffs now default to the Aftermath/campaign archive route instead of Operation AARs. Decision Records source handoffs have distinct label copy.
- Command briefing, selection, and formation drilldowns now use a shared atomic `FieldInspectionTarget` route for Tactical Map inspection. Compound targets such as formation-in-sector are set in one store action instead of being cleared by sequenced setters.
- Sector, operation, and formation detail fallback copy now suppresses raw ids, enum slugs, generated operation names, and raw notable-moment internals when authored labels are missing.
- Overlay backdrops no longer expose covered phantom named controls to automation or assistive tech; outside-click dismissal remains live for the war-start briefing and Pause menu.

## Pyrrhic Roles

- Volta: route-architecture review for atomic field inspection.
- Zeno: Army HQ first-paint/drilldown and raw-copy fallback review.
- Codex/orchestrator: integration, live browser verification, docs sync, branch hygiene.

Both subagents were read-only reviewers and were closed after their findings were integrated.

## Verification

Focused UI pack:

```powershell
npx.cmd vitest run tests/ui/records_button_behavior.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/gamestore_field_inspection.test.ts tests/ui/command_briefing_banner_contract.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts tests/ui/game_start_intro.test.ts tests/ui/pause_menu_i18n.test.ts --pool=forks --reporter=dot
```

Result: 8 files, 75 tests passed.

Broader gates:

```powershell
npm.cmd run typecheck -- --pretty false
npm.cmd run qa:player-journeys
npm.cmd run desktop:map:build
git diff --check
```

Results: typecheck passed; `qa:player-journeys` passed 11 files / 105 tests; `desktop:map:build` passed with existing Vite/browser-external and large-chunk warnings; `git diff --check` passed.

Live browser smoke on `http://127.0.0.1:5186` verified:

- RBiH new game reaches the war-start splash and war-begins identity briefing.
- War-begins outside click dismisses the briefing; no `Close WAR BEGINS` phantom named control is exposed.
- Records toolbar title is `Open Army HQ Records: campaign archive`; Records opens to Aftermath/archive content.
- Army HQ first paint exposes `COMMAND ACCESS` with corps readiness, sector counts, and operation counts.
- Corps drilldown exposes sectors and operations immediately.
- Escape opens Pause; no `Resume game` phantom label is exposed; outside click resumes.
- No page errors were observed in the smoke. The only console error filtered was the existing dev 404 resource noise.

## Follow-Up

Continue broad live-browser sweeps across command-map, warroom, settlements, units, sectors, and all panels. The remaining work is discovery/polish, not this Army HQ first-paint/drilldown slice.
