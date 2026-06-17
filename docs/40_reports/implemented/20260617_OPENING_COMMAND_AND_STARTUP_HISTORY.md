# Opening Command and Startup History

## Summary

The D2 first-hour sweep found two startup-state truth defects in the baked April 1992 campaign snapshot:

- Active turn-0 corps assets for `vrs_drina`, `arbih_3rd_corps`, and `arbih_4th_corps` rendered as command vacancies.
- JNA phantom setup control was serialized as turn-0 `mechanism:"combat"` control history, implying player-time combat before the campaign had begun.

This slice fixes both at scenario birth and rebuilds `data/derived/startup/apr_1992_initial_save.json`.

## Implementation

- Added `seatInitialCorpsCommanders(state)` after opening OOB creation, assigning time-safe acting commanders from available reserve officers without backdating later official commanders.
- Seated Svetozar Andric on Drina Corps, Selmo Cikotic on ARBiH 3rd Corps, and Midhad Hujdur on ARBiH 4th Corps in the opening snapshot.
- Kept later official commanders such as Milenko Zivanovic, Enver Hadzihasanovic, and Arif Pasalic absent at turn 0.
- Extended acting-commander succession so startup acting commanders yield when later home commanders become available.
- Added a startup setup-control mode to `spawnJnaPhantomBrigades`, preserving default turn-pipeline combat history while suppressing false startup combat events.
- Preserved `political.control_events` as an empty persisted bus at turn 0, then refreshed `initial_political_controllers` after setup-control flips so the baked birth map and initial map agree.
- Re-blessed the golden baseline manifest for the resulting startup commander/history read-model movement.

## Verification

- Red proof failed on emitted phantom combat-control history, missing `vrs_andric` assignment, false baked turn-0 combat events, and stale startup artifact freshness.
- `node_modules\.bin\vitest.cmd run tests\startup_snapshot_contract.test.ts tests\jna_phantom_brigades.test.ts --pool=forks --reporter=dot` -> 2 files / 25 tests passed.
- `node_modules\.bin\vitest.cmd run tests\startup_snapshot_contract.test.ts tests\desktop_campaign_start_contract.test.ts tests\browser_campaign_start_fallback.test.ts tests\jna_phantom_brigades.test.ts --pool=forks --reporter=dot` -> 4 files / 34 tests passed.
- `node_modules\.bin\vitest.cmd run tests\officer_system.test.ts --pool=forks --reporter=dot` -> 1 file / 46 tests passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npm.cmd run qa:player-journeys` -> 11 files / 102 tests passed.
- `npm.cmd run ci:structural-fingerprint:check` passed with structural fingerprint `f282883abbab76cf`.
- `node_modules\.bin\vitest.cmd run tests\tg_schema_freeze.test.ts tests\startup_snapshot_contract.test.ts --pool=forks --reporter=dot` -> 2 files / 16 tests passed after preserving the empty `control_events` bus.
- `npm.cmd run test:baselines` passed after the deliberate manifest re-bless.
- Live browser on `http://127.0.0.1:4197/tactical_map.html?dev=1` verified RS/RBiH war-start splash, foundational desk route, Army HQ readiness, Drina/3rd/4th Corps acting commanders, and no turn-0 backdating of later official commanders.

## Residuals

- Synthetic JNA command label/staff treatment remains a separate OOB polish lane.
- HVO Vitezovi elite commander metadata remains a separate content-data lane.
- Remaining invalid-coordinate/DeckGL warnings remain a map-data/rendering polish lane.
