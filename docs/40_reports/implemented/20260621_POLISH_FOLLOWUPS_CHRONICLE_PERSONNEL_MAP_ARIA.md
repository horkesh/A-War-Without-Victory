# Polish Followups: Chronicle, Personnel, Map Aria

Date: 2026-06-21

## Summary

Closed three Pyrrhic scout followups while the pushed diplomacy/SITREP merge was in GitHub CI:

- Chronicle cost cards now suppress turn-0 setup `territory_net` narration and metadata, so scenario-start control cannot read as post-start ground gained or lost.
- Personnel read-model projection no longer defaults future officers with no mutable state to active before their `available_from_turn`.
- Tactical-map landmark aria copy is localized through `map.aria.tacticalMap`, and live browser readiness now uses stable `data-testid="tactical-map"` instead of English aria text.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\chronicle_entries.test.ts tests\ui\personnel_player_safe_display.test.ts tests\ui\opening_corps_commander_display.test.ts tests\ui\officer_dossier.test.ts tests\v093_a11y_lane_b_map_landmarks.test.ts tests\ui\first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` passed 54/54.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 239/239.
- `npm.cmd run qa:live-surface:browser` passed on the stable map selector; evidence JSON was inspected (`ok: True`) and `.tmp_live_surface_browser_sweep` was removed.
- `git diff --check` passed.

## Determinism

UI/read-model/test/docs polish only. No simulation logic, scenario data, officer source data, Srebrenica/Zepa event ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
