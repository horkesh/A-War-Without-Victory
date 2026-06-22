# Fielded Brigade Truth And Routing

**Date:** 2026-06-22
**Type:** UI/read-model/routing/i18n/test/docs polish.
**Branch:** `codex/fielded-brigade-truth-routing`

## Summary

Closed the next Pyrrhic scout tranche around active brigade truth and command-surface routing:

- Tactical-map formation counters now render only active fielded tactical formations, so destroyed/forming brigades and operational groups do not remain clickable field markers.
- OOB, Corps Detail, ORBAT, Corps Front, and sector assignment projections now share the same active tactical-formation boundary for displayed field strength.
- Brigade rows render terminal lifecycle badges such as `DESTROYED` and `COLLAPSED` instead of falling back to `ACTIVE`.
- Formation Detail no longer exposes sector-assignment controls for non-fielded brigades.
- Generic Presidential Inbox `decision_room` actions open the Decision Room instead of bouncing to the Desk.
- Situation Inbox rows remain Desk-owned even though the registry uses the shared `decision_room` action token.
- Corps Front and Corps Detail drilldowns preserve corps/sector context through the shared field-inspection route.

## Verification

- Red tests reproduced tactical-map non-fielded counters, terminal badge fallback, destroyed brigade active-count inflation in OOB/Corps/ORBAT, non-fielded Formation Orders controls, generic `decision_room` Desk fallback, and drilldown context loss. Code review then caught statusless lightweight sector records being dropped and desk-owned `sit:*` rows routing to Decision Room; both were fixed and pinned.
- Focused green proof: `node node_modules\vitest\vitest.mjs run tests\ui_map_sector_lookup.test.ts tests\ui_player_visibility.test.ts tests\ui_map_render_smoke.test.ts tests\ui\brigade_row_supply_labels.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\command_drilldown_routing.test.ts tests\ui\warroom_shell_ownership.test.ts --pool=forks --reporter=dot` passed 80/80.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:first-hour:browser` passed after preserving the Desk-owned `opening-brief:desk` and `empty:desk` exceptions.
- `npm.cmd run qa:live-surface:browser` passed the owner drilldown, Decision Room, OOB/Corps Front, Ops Planning, Formation Detail, Settlement Detail, Records, setup-provenance, and war-start foundational proof paths.
- `npm.cmd run qa:player-journeys` passed 267/267.
- Temporary browser evidence folders were removed after verification.

## Scope

UI/read-model/routing/i18n/test/docs polish only. No simulation logic, scenario source data, event mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
