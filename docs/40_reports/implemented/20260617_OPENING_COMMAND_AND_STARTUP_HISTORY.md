# Opening Command and Startup History

## Summary

The D2 first-hour sweep found two startup-state truth defects in the baked April 1992 campaign snapshot:

- Active turn-0 corps assets for `vrs_drina`, `arbih_3rd_corps`, and `arbih_4th_corps` rendered as command vacancies.
- JNA phantom setup control was serialized as turn-0 `mechanism:"combat"` control history, implying player-time combat before the campaign had begun.

The first attempted fix seated active turn-0 commanders in simulation state. Focused tests and first-hour browser checks looked good, but the 188w engine-health gate regressed (`matched_osids=622`, `consistency_failures=17`). The final fix keeps command truth player-visible while leaving long-horizon simulation state untouched: opening corps command is now a tactical-map read-model, not a startup sim mutation.

## Implementation

- Removed the unsafe startup commander seating path from scenario birth; no corps commander is actively assigned into sim state solely to satisfy first-hour display.
- Added `resolveCorpsCommanderDisplay(...)`, which lets the Army HQ/OOB UI show time-safe acting commanders from the available officer pool without mutating `military.named_officers`.
- The read model displays Svetozar Andric for Drina Corps, Selmo Cikotic for ARBiH 3rd Corps, and Midhad Hujdur for ARBiH 4th Corps as opening acting commanders.
- Added a synthetic `JNA forward command staff` display for the JNA Herzegovina command asset so it no longer renders as an empty personal-command vacancy.
- Kept later official commanders such as Milenko Zivanovic, Enver Hadzihasanovic, and Arif Pasalic absent at turn 0.
- Retired the misleading `seatInitialCorpsCommanders` helper so future startup work cannot accidentally reuse the long-horizon-breaking mutation.
- Added explicit `emitControlEvents`, `controlEventMechanism`, and `seedDisplacementTimers` options to `spawnJnaPhantomBrigades`, preserving default turn-pipeline combat history while allowing scenario birth to suppress false startup combat events.
- Preserved `political.control_events` as an empty persisted bus at turn 0, then refreshed `initial_political_controllers` after setup-control flips so the baked birth map and initial map agree.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` for the final read-model-safe startup contract.
- Re-blessed `data/derived/scenario/baselines/manifest.json`: 4w scenarios move only `final_save` / `run_summary`; `apr1992_52w` also moves history/readout artifacts because setup-control is no longer counted as post-start war history.

## Verification

- Red proof failed on emitted phantom combat-control history, false baked turn-0 combat events, stale startup artifact freshness, and then on the 188w engine-health regression caused by active startup commander seating.
- `npx.cmd vitest run tests\startup_snapshot_contract.test.ts tests\jna_phantom_brigades.test.ts tests\officer_system.test.ts tests\ui\opening_corps_commander_display.test.ts --pool=forks --reporter=dot` -> 4 files / 75 tests passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:startup-snapshot:check` passed.
- `UPDATE_BASELINES=1 npm.cmd run test:baselines` updated the deliberate startup-history manifest drift, then `npm.cmd run test:baselines` passed with "Baseline regression: all scenarios match."
- 188w proof: `npm.cmd run sim:scenario:run:188w -- --out runs\eh_local_opening_read_model_final`, then `node tools\engine_health_gate.cjs runs\eh_local_opening_read_model_final\apr1992_definitive_188w__acb538b04d79af3c__w188_n0 --horizon 188w` passed with `matched_osids=658`, `consistency_failures=3`, anchors intact, and K:W `3.847`.
- Sensitive-history proof on that run: Srebrenica 11/11 RS, Zepa 1/1 RS, Srebrenica falls turn 162, genocide rupture present, Zepa falls turn 164.
- Live browser on `http://127.0.0.1:4198/tactical_map.html?dev=1` verified RS/RBiH war-start splash, foundational desk route, Army HQ/OOB readiness, Drina/3rd/4th Corps acting commanders, JNA synthetic command label, and no console errors.

## Residuals

- HVO Vitezovi elite commander metadata remains a separate content-data lane.
- Remaining invalid-coordinate/DeckGL warnings remain a map-data/rendering polish lane.
- Drina/Krivaja long-run consistency residuals are lifecycle/calibration issues around brigade dissolution/attrition during late-war triggered-operation delivery, not startup command or first-hour OOB defects.
