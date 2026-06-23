# Sector Audit, Tooltip, And Picker Proof

## Summary

Closed the next sector/command-surface polish slice without changing production simulation behavior. The sector audit CLI now audits persisted sectors and rebuilt-sector diagnostics against separate cloned states, so rebuilding sectors cannot mutate formation locations before the saved-sector audit runs.

Persisted April 1992 startup sector truth is the release gate. Rebuilt-sector reserve-only truth remains visible as a diagnostic (`rebuilt_ok: false`) because the direct engine-side promotion candidate changed the startup snapshot, baseline regression, and structural fingerprint. That repair is a calibration/sector-builder lane, not part of this UI/read-model polish packet.

Player-facing tooltip and Formation Detail surfaces were hardened:

- Own front tooltips no longer show favorable density/threat copy when the sector has no current fielded friendly line.
- Uncovered own front tooltips now show `No friendly line`.
- Front extent copy says `front segments`, not hardcoded `edges`.
- Formation Detail sector option buttons now expose stable proof hooks for sector id, current brigade count, and frontline brigade count.
- Formation Detail sector brigade-count copy uses explicit one/many keys.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\startup_snapshot_contract.test.ts -t "sector truth audits clean" --pool=forks --reporter=dot` passed 1/1.
- `node node_modules\vitest\vitest.mjs run tests\ui_map_tooltip_player_visibility.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 25/25.
- `npm.cmd run sim:scenario:audit-sectors -- --save data/derived/startup/apr_1992_initial_save.json` exited 0 with saved counts all zero, `ok: true`, and retained rebuilt diagnostic `reserve_only_live_sectors: 1`, `rebuilt_ok: false`.
- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run test:baselines` passed with all scenarios matching.
- `npm.cmd run ci:structural-fingerprint:check` passed with expected fingerprint `f282883abbab76cf`.
- `npm.cmd run qa:player-journeys` passed 278/278.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- Manual in-app browser proof on `http://127.0.0.1:3003/` verified RBiH new campaign start, war-start splash, opening identity brief, Decision Room routing to President's Desk, the foundational decision modal, and Army HQ opening commander/summary surfaces.

## Scope

UI/read-model/test/docs/diagnostic-tool polish only. No production simulation logic, scenario source data, startup artifact, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.

## Follow-Up

The rebuilt-sector diagnostic remains actionable: rebuilt April 1992 sectors currently report one reserve-only live sector (`sector:arbih_1st_corps:3`). A production fix must be handled as a separate sector-builder/calibration lane with startup snapshot, baseline, structural fingerprint, and longer scenario proof.
