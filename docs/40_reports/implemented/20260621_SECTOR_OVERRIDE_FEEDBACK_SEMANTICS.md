# Sector Override Feedback Semantics

**Date:** 2026-06-21

**Type:** UI/read-model/map-feedback polish.

## Summary

Brigade-to-sector override orders now keep sector targets distinct from OSID targets in staged-order state. Formation Detail presents a player override sector as the active sector instead of showing the stale automatic roster sector, Order Queue resolves sector order labels through sector metadata, and map ghost paths / staged movement arrows resolve sector ids to deterministic friendly sector OSIDs for visible feedback.

## Changes

- Added `StagedOrder.targetSectorId` for sector assignments while preserving `targetOsid` for attack/settlement targets and legacy compatibility.
- Updated map-click and Formation Detail sector assignment actions to stage `targetSectorId`.
- Added deterministic sector target resolution for map feedback: sector candidate OSIDs come from `territory_osids` and sub-segment `friendly_osids`, are sorted, and the nearest resolvable centroid to the brigade source is selected with lexical tie-breaks.
- Updated ghost paths and staged order arrows to render sector assignment feedback instead of silently failing sector-id-as-OSID lookup.
- Updated Formation Detail overview to prefer `formation.sectorOverrideId` over stale sector roster membership for the active assignment card.

## Verification

- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui\formation_detail_parity.test.ts tests\ui_map_order_actions.test.ts tests\ui\order_queue_player_copy.test.ts tests\ui\sector_staged_order_map_feedback.test.ts --pool=forks --reporter=dot` failed on stale Formation Detail overview sector, `targetOsid` sector staging, missing Order Queue sector label, and absent ghost-path / staged-arrow sector geometry.
- Reviewer follow-up red proof: the same focused command failed on a stale missing `sectorOverrideId` being badged as active in Formation Detail.
- Green proof: the same focused command passed 17/17 after implementation and reviewer follow-up fixes.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 244/244.
- `npm.cmd run qa:live-surface:browser` passed and confirmed war-start/foundational flow, major-surface reachability, owner drilldown, Records/Chronicle archive routes, operation-opportunity Inbox/Desk/Record-category Decision Room routing, and port cleanup. Temporary `.tmp_live_surface_browser_sweep` evidence was inspected and removed.
- `npm.cmd run desktop:map:build` passed.

## Scope / Determinism

UI/read-model/store/map-feedback/test/docs polish only. No simulation logic, scenario data, save schema, generated artifact, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed. Srebrenica/Zepa fall receipts remain event-owned and are not touched by this lane.
