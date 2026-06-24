# Army HQ Sector Brigade Information Quality

Date: 2026-06-24

## Summary

Closed the first substantial June 24 information-quality sweep across the live command sidebar, Army HQ, Corps Front, settlement detail, and Records surfaces, then extended it with truth-boundary slices for Chronicle, Warroom, turn-advance blockers, Decision Room stale state, and sparse Army HQ/OOB/Corps Front aggregate reporting. The batch fixes player-truth mismatches around territory percentages, officer mini-bios, stale sector roster ids, command-only JNA visibility, Records tab accessible names, empty-state clarity, receipt routing, safe-area ticker ownership, and missing personnel/equipment-condition data.

The April 1992 startup snapshot now preserves authored officer mini-bio fields from source officer data so Army/OOB command surfaces render historical command profile context. This is deterministic startup-output preservation, not a sim-mechanics or calibration change. The resulting `apr1992_52w` baseline manifest update is limited to `final_save.json` and `run_summary.json` hashes after proving control, formation, activity, end-report, watched-operation, and weekly-report artifacts stayed byte-identical.

## Changes Made

### Army / OOB / Personnel
- Preserved authored officer mini-bio fields (`bio_short`, `command_style`, `known_for`, political/sensitive notes) through officer validation and the rebuilt startup save.
- OOB sidebar now renders JNA command nodes with phantom subordinates as command rows with `0 brigades`, without counting phantom personnel or exposing phantom rows as fielded units.
- Personnel mobilization pool names now use the shared player-safe municipality label path.
- Personnel, OOB CorpsCard, Corps Detail, Army HQ Corps Card, and Corps Front logistics use shared reported-metric helpers so missing personnel and equipment condition fields render as partial/unreported instead of exact zeroes or fully operational counts.
- ORBAT and Corps Front combat-personnel fallbacks use the same reported-metric semantics, so mixed brigade reports render as partial/unreported instead of exact totals.
- Personnel Main Staff rows now label HQ reserve/security context for army-HQ-assigned brigades.
- `OobCorps.available_from` is documented and tested as phased activation/OOB alignment, not a blanket startup command-visibility gate.

### Sector / Corps Front / Settlement / Records
- Situation tab territory display now uses area-weighted player territory, matching the bottom status strip.
- Army HQ and Corps Front expose stale sector roster ids separately instead of silently dropping them or counting them as fielded strength; raw ids are diagnostic attributes, not visible player copy.
- Corps Front empty force buckets, unreported standard-brigade equivalency, and browser-mode disabled command reasons now render explicit player-facing states.
- Shared fielded tactical-formation truth no longer counts a record with both `status` and `readiness` missing as active fielded force; explicit active rows still count unless readiness says forming/unreported/destroyed.
- Sector override projections now use that same fielded-force boundary; lifecycle-free override rows cannot appear as command-directed line force.
- Settlement detail now shows an explicit no-stationed-units state when no physical fielded units are present.
- Records subtab accessible names no longer include numeric counts; counts remain visible/tooltipped.

### Chronicle / Warroom / Decision Room
- Chronicle decision-ledger generation filters to `recordTarget === 'chronicle'`; Records-target receipts remain Records evidence and no longer appear as Chronicle history.
- Warroom static safe-area ticker rows for Srebrenica fall, Srebrenica massacre, and Zepa fall now require live event/rupture receipts before rendering.
- The blocked turn-advance toolbar state renders `REVIEW BLOCKERS`, making the action read as a review path rather than a normal turn-advance command.
- Hiding advanced Decision Room filters clears active lens/category/card state so an off-screen advanced card cannot remain selected.

### Docs / Lane Hygiene
- COMMAND_BOARD and MASTER_ROADMAP now park stale autonomous/product/telemetry/Fall-1995 lanes while the current owner lane is the June 24 information-quality sweep.
- FORAWWV records the `available_from` startup-vs-bottom-up activation contract. Panel sign-off basis: the addendum documents a tested systems/formation invariant, is backed by `tests/recruitment_engine.test.ts`, does not alter Section 6/sensitive-history canon, and received canon/process review before merge.
- Srebrenica/Zepa fall delivery remains documented as event-owned, not scripted-operation tuning.
- Collapse comments and Lane V containment assertion messages now preserve that event-owned fall-receipt framing.
- PROJECT_LEDGER_KNOWLEDGE now records the Chronicle `recordTarget` boundary and the Warroom safe-area ticker receipt gate.

## Verification

- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npm.cmd exec -- vitest run tests/recruitment_engine.test.ts tests/officer_system.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot` passed 10 files / 183 tests.
- `npm.cmd run typecheck` passed.
- Expanded second-slice focused proof `npm.cmd exec -- vitest run tests/ui/chronicle_decision_ledger.test.ts tests/ui/warroom_ticker_event_receipts.test.ts tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/stale_state_resets.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/decision_consequence_trail.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_decision_room.test.ts --pool=forks --reporter=dot` passed 8 files / 128 tests.
- `npm.cmd run qa:player-journeys` passed 43 files / 583 tests.
- Third-slice focused red/green proof `node node_modules\vitest\vitest.mjs run tests\ui\corps_front_panel_routing.test.ts tests\ui\personnel_player_safe_display.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\army_hq_sector_truth.test.ts tests\ui_player_visibility.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts --pool=forks --reporter=dot` passed 6 files / 92 tests.
- Adjacent command/OOB/Corps Detail proof `node node_modules\vitest\vitest.mjs run tests\ui\command_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\commander_read_model_surfaces.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts --pool=forks --reporter=dot` passed 6 files / 34 tests.
- Final third-slice `npm.cmd run typecheck -- --pretty false` passed.
- Final third-slice `npm.cmd run qa:player-journeys` passed 43 files / 586 tests.
- Final third-slice `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- Final third-slice `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.
- Final third-slice `git diff --check` passed.
- Focused second-slice proof `npm.cmd exec -- vitest run tests/ui/chronicle_decision_ledger.test.ts tests/ui/warroom_ticker_event_receipts.test.ts tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/stale_state_resets.test.ts --pool=forks --reporter=dot` passed 4 files / 26 tests after red proof.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.
- `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` passed after the narrow `apr1992_52w` manifest re-bless.
- `git diff --check` passed with the existing CRLF-normalization warning for `src/ui/warroom/components/NewsTicker.ts` and `src/ui/warroom/content/ticker_events.ts`.
- Ignored temp cleanup removed `data/derived/scenario/_baseline_tmp`, `.tmp_first_hour_browser_gate`, `.tmp_live_surface_browser_sweep`, and the detached baseline comparison worktree; `.tmp_dev_server` remains active for the local browser/dev server.
- Manual in-app browser proof at `http://127.0.0.1:3003/?dev=1`:
  - RBiH start shows war-start/foundational flow, Situation territory `31.5%`, status strip `Friendly 31.5%`, and Sefer Halilovic mini-bio/style.
  - Records subtab buttons expose clean accessible names such as `TURN AFTERMATH`, `LATEST AFTER-ACTION REPORT`, `OPERATION HISTORY`, `DECISION LOG`, and `OPPORTUNITIES`.
  - RS start shows JNA Herzegovina Command as a visible command node with `0 brigades`, operation commander context, and no phantom subordinate listed as a fielded brigade.
  - Third-slice spot check verified RBiH war-start splash, foundational decision routing/lock, Army HQ Personnel, and 1st Corps command surface without error banners or visible raw diagnostic ids.

## Scope

UI/read-model/test/docs polish plus deterministic startup artifact regeneration to preserve authored officer display fields. No simulation logic, combat math, event evaluator mechanics, turn pipeline, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, packaged installer artifact, randomness, timestamps, or locale persistence changed. Baseline manifest movement is limited to `apr1992_52w` `final_save.json` and `run_summary.json` because the saved officer display metadata and resulting final-state hash changed; the substantive scenario artifacts listed above stayed byte-identical.

## Next Steps

- Historical closeout is complete on `main`; packaging and BCS-only work remain parked until owner satisfaction with live D2 player-polish surfaces.
- Current D2 polish follow-up is tracked in `docs/40_reports/implemented/20260625_PLAYER_SURFACE_EDGE_POLISH.md` and `docs/plans/2026-06-24-army-hq-sector-brigade-information-quality-sweep-plan.md`.
