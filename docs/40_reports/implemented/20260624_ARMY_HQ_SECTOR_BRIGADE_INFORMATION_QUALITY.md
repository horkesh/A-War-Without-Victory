# Army HQ Sector Brigade Information Quality

Date: 2026-06-24

## Summary

Closed the June 24 information-quality sweep across the live command sidebar, Army HQ, Corps Front, settlement detail, and Records surfaces. The batch fixes player-truth mismatches around territory percentages, officer mini-bios, stale sector roster ids, command-only JNA visibility, Records tab accessible names, and empty-state clarity.

The April 1992 startup snapshot now preserves authored officer mini-bio fields from source officer data so Army/OOB command surfaces render historical command profile context. This is deterministic startup-output preservation, not a sim-mechanics or calibration change.

## Changes Made

### Army / OOB / Personnel
- Preserved authored officer mini-bio fields (`bio_short`, `command_style`, `known_for`, political/sensitive notes) through officer validation and the rebuilt startup save.
- OOB sidebar now renders JNA command nodes with phantom subordinates as command rows with `0 brigades`, without counting phantom personnel or exposing phantom rows as fielded units.
- Personnel mobilization pool names now use the shared player-safe municipality label path.
- `OobCorps.available_from` is documented and tested as phased activation/OOB alignment, not a blanket startup command-visibility gate.

### Sector / Corps Front / Settlement / Records
- Situation tab territory display now uses area-weighted player territory, matching the bottom status strip.
- Army HQ and Corps Front expose stale sector roster ids separately instead of silently dropping them or counting them as fielded strength.
- Corps Front empty force buckets, unreported standard-brigade equivalency, and browser-mode disabled command reasons now render explicit player-facing states.
- Settlement detail now shows an explicit no-stationed-units state when no physical fielded units are present.
- Records subtab accessible names no longer include numeric counts; counts remain visible/tooltipped.

### Docs / Lane Hygiene
- COMMAND_BOARD and MASTER_ROADMAP now park stale autonomous/product/telemetry/Fall-1995 lanes while the current owner lane is the June 24 information-quality sweep.
- FORAWWV records the `available_from` startup-vs-bottom-up activation contract.
- Srebrenica/Zepa fall delivery remains documented as event-owned, not scripted-operation tuning.

## Verification

- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npm.cmd exec -- vitest run tests/recruitment_engine.test.ts tests/officer_system.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot` passed 10 files / 183 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 583 tests.
- `git diff --check` passed.
- Manual in-app browser proof at `http://127.0.0.1:3003/?dev=1`:
  - RBiH start shows war-start/foundational flow, Situation territory `31.5%`, status strip `Friendly 31.5%`, and Sefer Halilovic mini-bio/style.
  - Records subtab buttons expose clean accessible names such as `TURN AFTERMATH`, `LATEST AFTER-ACTION REPORT`, `OPERATION HISTORY`, `DECISION LOG`, and `OPPORTUNITIES`.
  - RS start shows JNA Herzegovina Command as a visible command node with `0 brigades`, operation commander context, and no phantom subordinate listed as a fielded brigade.

## Scope

UI/read-model/test/docs polish plus deterministic startup artifact regeneration to preserve authored officer display fields. No simulation logic, combat math, event evaluator mechanics, turn pipeline, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, or locale persistence changed.

## Next Steps

- Continue the active information-quality sweep with live browser review of remaining panels, especially ORBAT empty-state parity and settlement/sector drilldown ergonomics.
- Run broader `qa:player-journeys` and browser gates before branch closeout/merge.
- Keep packaging and BCS-only work parked until owner satisfaction with live D2 player-polish surfaces.
