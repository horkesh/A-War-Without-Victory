# Settlement Timeline Control/Battle Copy

## Summary

Settlement timeline control, battle, and brigade movement rows now render through localized player copy instead of inline English string assembly.

## Changes

- Localized scenario-start control, control-change, and control-mechanism detail rows.
- Localized battle titles, battle details, battle outcomes, and capture suffix copy.
- Localized brigade arrived/departed movement rows.
- Added neutral fallback copy for unknown factions and unknown battle outcomes so raw ids do not surface.
- Left Srebrenica/Zepa event-owned receipt framing intact; existing provenance coverage continues to guard that behavior.

## Verification

- Red focused proof first failed on visible English fragments in BCS mode: `Controlled by`, `took control`, `Battle`, `attacked`, `territory captured`, `stationed`, and `departed`.
- Worker focused proof passed: `npm.cmd exec -- vitest run tests/ui/settlement_timeline_i18n.test.ts tests/settlement_timeline_provenance.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (36/36).
- Integrated focused proof passed: `npm.cmd exec -- vitest run tests/ui_map_tooltip_player_visibility.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/settlement_timeline_provenance.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (41/41).
- Additional gates passed: `npm.cmd run typecheck`; `git diff --check`; `npm.cmd run qa:player-journeys` (234/234); `AWWV_LIVE_SURFACE_BROWSER_PORT=3241 npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). The temporary `.tmp_live_surface_browser_sweep` evidence directory was deleted afterward.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, Srebrenica/Zepa lifecycle ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
