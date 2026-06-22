# Sector, Brigade, and Desk Routing Polish

Date: 2026-06-22

## Summary

Closed a general player-polish batch from the Pyrrhic live sweep, deliberately not centered on BCS. The work hardens sector/brigade truth across map, OOB, Corps Front, Army HQ, and Formation Detail; fixes a visible flip-card defect in the OOB/Army HQ corps cards; returns presidential inbox handoffs to the President's Desk owner; and extends live browser proof for exact Records-to-Chronicle decision focus.

This is UI/read-model/map-projection/test/docs polish only. It does not resume packaged-installer work.

## Changes

- Added a shared current-sector projection for brigade sector overrides, including same-corps/same-faction validation and deterministic current membership lists.
- Updated formation map markers, map selection routing, Corps Detail, Corps Front, OOB sidebar, OrbatPanel hover state, and Army HQ Sectors to use the same current-sector truth instead of stale roster-only sector arrays.
- Added command-directed brigade buckets/counts in sector views so a player override is visible as a sector assignment rather than hidden behind stale roster membership.
- Changed formation `is_in_operation` map marker truth to use active operation participants instead of attack/assault posture.
- Fixed President's Desk decision consequence counts so the metric shows the total ledger count, not just the two rendered rows.
- Routed Desk Chronicle-filed decision rows to the exact focused Chronicle decision record.
- Tightened the live-surface browser sweep so Records-to-Chronicle drilldown must focus the exact matching Chronicle record.
- Fixed `FlipCard` hidden faces so OOB/Army HQ card backs do not paint or read as visible at startup.
- Changed `kind: inbox` handoffs from Decision Room/pre-advance review to open the President's Desk owner instead of dropping the player back to the tactical-map inbox rail.
- Relabeled Formation Detail's brigade lifecycle field from `Readiness:` to `Lifecycle:` to avoid confusing formation state with force readiness.

## Live Review

- Verified new RBiH campaign startup in the in-app browser: faction start shows the war-start splash with identity/situation/asymmetry before play.
- Verified Decision Room `Open Inbox` now opens `president-desk-shell` with the pending decision packet visible, not the map inbox rail.
- Verified OOB corps card backs no longer visibly paint at startup after Vite hot reload.
- Verified Army HQ Personnel exposes 78 brigade links and a clicked brigade opens Formation Detail with corps, sector, posture, lifecycle, equipment, cohesion, morale, location, and home municipality.

## Verification

- `npm.cmd run typecheck` passed.
- Focused proof passed 82/82:
  `node node_modules\vitest\vitest.mjs run tests\ui_map_sector_lookup.test.ts tests\ui_map_render_smoke.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts tests\ui\president_desk_shell.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\first_hour_browser_gate_contract.test.ts tests\ui_shell_frame_contract.test.ts tests\ui\warroom_shell_ownership.test.ts --pool=forks --reporter=dot`
- `npm.cmd run qa:player-journeys` passed 253/253.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.

## Scope

UI/read-model/map-projection/live-QA/test/docs polish only. No simulation logic, scenario data, event mechanics, turn pipeline, save schema, startup snapshot, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Follow-Ups

- Operation readiness unknown/null presentation remains a separate UI truth lane.
- Brigade list density can still improve by adding compact supply/readiness/sector/operation chips to repeated brigade rows.
- Canonical supply display should converge on one shared helper where local row heuristics still exist.
