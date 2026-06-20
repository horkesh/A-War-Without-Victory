# Field Drilldown Context Polish

## Summary
Several secondary drilldown surfaces still used bare selection setters after the direct map routing cleanup. These paths now route through the shared field-inspection contract so Army HQ, Records, map context-menu, battle flyover, settlement-sector, and AAR links do not leave hidden or orphaned panels behind.

## Changes
- Personnel ORBAT brigade clicks now use `inspectOnField(...)`; HQ reserve brigades open `army_reserve + formation`, and corps brigades preserve corps context while closing Army HQ.
- Map settlement context-menu, normal settlement click, and battle marker click now resolve settlement -> sector -> corps context when available.
- Settlement panel Front Sector links now preserve owning corps plus settlement context.
- Embedded AAR attacker/defender/defender-contribution links now use field inspection and battle OSID context instead of bare formation setters.
- `field-sector-in-corps` can optionally carry an `osid` when the player is drilling from a settlement into its owning front sector.
- Updated the stale camera-constraint source test that still required the retired direct map formation setter.

## Verification
- Focused proof passed: `npm.cmd exec -- vitest run tests/ui_map_camera_constraints.test.ts tests/ui/map_click_routing_contract.test.ts tests/ui/gamestore_field_inspection.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/aar_tooltip_friction_labels.test.ts --pool=forks --reporter=dot` (24/24).
- Typecheck passed: `npm.cmd run typecheck`.
- Diff hygiene passed: `git diff --check`.
- Player-journey gate passed: `npm.cmd run qa:player-journeys` (234/234).
- Live browser sweep passed: `AWWV_LIVE_SURFACE_BROWSER_PORT=3247 npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`), and `.tmp_live_surface_browser_sweep` was removed afterward.

## Scope
UI/store routing/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
