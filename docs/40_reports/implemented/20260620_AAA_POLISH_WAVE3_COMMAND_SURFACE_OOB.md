# AAA Polish Wave 3: Command Surface and Startup OOB Truth

**Date:** 2026-06-20
**Run ID:** n/a
**Baseline:** `codex/aaa-polish-wave3` from current `main`
**Result:** focused UI/startup/timeline checks green; live browser gates passed; 188w engine-health gate passed; baseline manifest re-blessed for startup command-structure serialization only

## Summary
- Closed fresh Pyrrhic specialist findings from the comprehensive player sweep: command surfaces no longer expose raw week counters, density decimals, prep shorthand, or unlocalized settlement-support copy on the audited surfaces.
- Fixed a startup OOB truth bug where two active VRS formations parented to `vrs_main_staff` while that command existed only in `military.corps_command`, not `military.formations`.
- Fixed an opening command display bug where army-level commander lookup ignored `available_from_turn`, causing RBiH to show future commander Rasim Delic on 6 Apr 1992 instead of Sefer Halilovic.
- Softened opening Situation/Decision Room front language from impossible “immediate attention” telemetry to command-review language: front contacts and thinly held contacts.
- Reaffirmed Srebrenica/Zepa lifecycle ownership: settlement timelines may show operation context, but operation history cannot claim the fall receipt through `objective captured`.

## Changes Made
### Command-surface copy
- `FormationDetail` now renders last repulsed/retreated dates with `turnToDateString(...)`.
- `ArmyReservePanel` now renders deployment/travel durations as readable text and loan history as calendar ranges.
- `CorpsFrontPanel` now renders preparation phases through i18n keys such as `Intelligence gathering` and `Cycle 1 of 8`, not `INTEL` or `1/8t`.
- `CorpsFrontPanel` sector overview now renders `5 on line, 0 held back` style copy instead of `5 Front / 0 Reserve`.
- `OOBSidebar` and `CorpsDetail` now show line/held-back elements, frontage, personnel, and qualitative coverage instead of raw `assigned`, `front`, `men`, and `Density: 0.16` copy.
- `SelectionPanel` local-support copy now routes through English/BCS i18n keys.
- Empty settlement support state now renders as “No local support order is staged here,” not “Local Support target: none staged.”
- `CorpsCard` operation phase display now uses `getPlayerSafeOperationPhaseLabel(...)`.
- `OperationalSitrepView` opening headline/alerts now say “thinly held front contacts need staff review,” and Situation / War Summary / Decision Room evidence labels use `front contacts` / `thinly held` language instead of `engaged / exposed`.

### Opening command display
- `getFactionArmyCommander(...)` and army-HQ formation commander lookup now require active officers to be available on the current turn.
- Turn-0 RBiH live browser proof now shows Gen. Sefer Halilovic at army level; Rasim Delic remains unavailable until turn 60.

### Startup OOB truth
- `runBotRecruitment(...)` and the legacy OOB entry helper now materialize opening `army_hq` command structures when `available_from <= currentTurn`, without requiring control presence in the HQ municipality. Command structures are not map entities, and active subordinate units must still resolve their `corps_id` parent.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json`; `vrs_main_staff` is now an `army_hq` formation and resolves parentage for `rs_1st_guards_motorized` and `rs_65th_protection_motorized_regiment`.

### Sensitive-history provenance
- `buildSettlementTimeline(...)` now special-cases `op:srebrenica:srebrenica_2` and `op:rogatica:zepa_2`: captured operation-history rows render as operation context, while the event receipt remains the control-change owner.

## Verification
- `npm.cmd run typecheck` passed.
- `npx.cmd vitest run tests\operational_sitrep_views.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts --pool=forks --reporter=dot` passed 59/59.
- `npx.cmd vitest run tests\ui\opening_corps_commander_display.test.ts --pool=forks --reporter=dot` passed 7/7.
- `npm.cmd run desktop:startup-snapshot:build` passed and rewrote the startup artifact.
- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npx.cmd vitest run tests\ui\gui_audit_label_discipline.test.ts tests\settlement_timeline_provenance.test.ts tests\startup_snapshot_contract.test.ts --pool=forks --reporter=dot` passed 31/31.
- Fresh focused regression pack passed 8 files / 89 tests: operational SITREP, label discipline, Decision Room, pre-advance review, priority docket, settlement provenance, startup snapshot contract, and opening commander display.
- `npm.cmd run qa:player-journeys` passed 21 files / 205 tests.
- `npm.cmd run desktop:map:build` passed with existing Vite externalization/chunk warnings.
- `npm.cmd run qa:first-hour:browser` passed with strict port cleanup.
- `npm.cmd run qa:live-surface:browser` passed with strict port cleanup.
- `npm.cmd run ci:structural-fingerprint:check` passed with expected fingerprint `f282883abbab76cf`.
- `npm.cmd run sim:scenario:run:188w -- --out runs\eh_wave3` produced `runs\eh_wave3\apr1992_definitive_188w__acb538b04d79af3c__w188_n0`; `node tools\engine_health_gate.cjs runs\eh_wave3\apr1992_definitive_188w__acb538b04d79af3c__w188_n0 --horizon 188w --json` passed with `matched_osids: 658`, `consistency_failures: 3`, `zero_eligible_ops: 1`, `dead_ops: 32`, `ghost_destroyed: 2`, and `stranded_brigades: 4`.
- `npm.cmd run test:baselines` initially failed because the startup command-structure materialization moved `apr1992_52w` serialized `final_save`, `formation_delta`, `run_summary`, and `end_report` hashes while `control_delta`, `weekly_report`, `activity_summary`, and watched operations stayed byte-identical. After the 188w engine-health PASS, `UPDATE_BASELINES=1 npm.cmd run test:baselines` updated `data/derived/scenario/baselines/manifest.json`; a clean `npm.cmd run test:baselines` rerun passed.
- Direct JSON inspection confirmed `vrs_main_staff` exists as `army_hq` and the two VRS formations resolve their parent command.
- Live browser proof on `http://127.0.0.1:3003/`: RBiH start -> `WAR HAS STARTED` -> `War begins` identity -> map/OOB; `1 REVIEW` -> Warroom Decision Room -> `Open Inbox` -> visible Presidential Inbox; OOB sector -> Sector Intelligence -> ORBAT -> Formation Detail -> settlement link. Verified Sefer Halilovic at turn 0, `5 on line, 0 held back`, no old local-support empty copy, and no old “exposed front sectors require immediate attention” headline.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/recruitment_engine.ts` | Opening army-HQ formation materialization in player-choice startup path |
| `src/scenario/oob_early_war_entry.ts` | Matching legacy helper policy for opening army HQs |
| `data/derived/startup/apr_1992_initial_save.json` | Rebuilt startup artifact with `vrs_main_staff` formation |
| `data/derived/scenario/baselines/manifest.json` | Re-blessed `apr1992_52w` serialized formation/final-save/report hashes after 188w engine-health PASS; control and weekly artifacts stayed byte-identical |
| `src/ui/map/components/*` | Player-safe copy and date/coverage/phase formatting across audited command surfaces |
| `src/ui/shared/operational_sitrep_views.ts` | Opening Situation headline/alert language changed to command-review wording |
| `src/ui/map/utils/officerUtils.ts` | Army commander lookup now enforces turn availability |
| `src/ui/map/i18n/messages.en.ts`, `messages.bcs.ts` | New EN/BCS keys for reserve, sector, prep, and support copy |
| `src/ui/map/utils/buildSettlementTimeline.ts` | Event-owned fall provenance guard for Srebrenica/Zepa |
| `tests/*` | Startup parentage, sensitive-history provenance, and UI raw-copy regression guards |

## Residuals
- Keep the source-gated `available_from` mismatch finding open for historian/data review; this wave does not rewrite historical activation dates.
- The live sweep still shows a large number of thinly held front contacts at turn 0. This wave improves player copy and discoverability; a later engine/read-model lane should decide whether to aggregate, prioritize, or reduce opening sector fragments.
