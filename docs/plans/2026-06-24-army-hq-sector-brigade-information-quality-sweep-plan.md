# Army HQ Sector Brigade Information Quality Sweep

**Status:** ACTIVE 2026-06-24.

**Goal:** Turn the next owner-facing polish pass into a single substantial batch: live-click Army HQ, OOB, Corps Front, sector, brigade, formation detail, settlement, and command handoff surfaces; fix confirmed information-quality defects without reopening packaging, BCS-only cleanup, or calibration.

**Why now:** `MASTER_ROADMAP.md` and `COMMAND_BOARD.md` make D2 owner playthrough the remaining 1.0 gate. The closed June 22 sector-truth plan established the rules; this sweep verifies the current live surfaces again and closes the next coherent set before another long CI wait.

## Progress 2026-06-24

Completed and verified first substantial slice:

- Situation territory now uses area-weighted player territory and matches the bottom status strip.
- Officer mini-bio/profile fields are preserved into the deterministic April 1992 startup snapshot.
- Army HQ and Corps Front expose stale sector roster ids separately from fielded strength.
- Corps Front now renders explicit empty-force, unreported-standard-brigade, and bridge-unavailable disabled-control states.
- Settlement detail renders a no-stationed-units empty state when no physical fielded formations are present.
- Records subtab accessible names no longer include numeric counts.
- OOB sidebar renders JNA command nodes with only `jna_phantom` subordinates as `0 brigades` command rows without counting phantom force.
- Personnel mobilization pool labels use the shared player-safe municipality formatter.
- `OobCorps.available_from` is tested and documented as phased activation/OOB alignment, not a startup command-visibility gate.
- FORAWWV addendum scope is limited to that tested activation contract. Panel sign-off basis for merge: systems/formation contract proof via `tests/recruitment_engine.test.ts`, canon/process review confirming no Section 6 or gameplay-canon change, and QA/process evidence recorded in this plan/report.
- COMMAND_BOARD and MASTER_ROADMAP now park stale autonomous/product/telemetry/Fall-1995 lanes while this owner lane is active.

Verification passed: `desktop:startup-snapshot:check`, focused 10-file / 183-test pack, `typecheck`, `qa:player-journeys` 43 files / 583 tests, `git diff --check`, and manual in-app browser proof for RBiH and RS.

Second slice implemented before the next push:

- Chronicle generated decision-ledger rows now respect `recordTarget`: Chronicle-target receipts render in Chronicle, while Records-target receipts stay in Records and cannot backdoor into Chronicle history.
- Warroom historical ticker rows for Srebrenica fall, Srebrenica massacre, and Zepa fall now require the matching live event/rupture receipts before appearing, preserving the event-owned safe-area fall model.
- The blocked turn-advance toolbar action now says `REVIEW BLOCKERS` while blocked instead of looking like a normal `ADVANCE TURN` command.
- Hiding advanced Decision Room filters clears the active dossier/card selection with the lens/category state, preventing stale cards from remaining active off-screen.
- The GitHub Event System CI baseline failure was reproduced locally and traced to preserved officer display metadata in `final_save.json`; `control_delta.json`, `formation_delta.json`, `activity_summary.json`, `end_report.md`, `watched_operations.json`, and `weekly_report.jsonl` stayed byte-identical. The baseline manifest was re-blessed only for `apr1992_52w` `final_save.json` and the hash-reporting `run_summary.json`.

Additional verification passed after the second slice: `typecheck`, expanded focused UI pack 8 files / 128 tests, `qa:player-journeys` 43 files / 583 tests, `qa:first-hour:browser`, `qa:live-surface:browser`, baseline regression after the narrow manifest re-bless, `git diff --check`, and temp evidence cleanup.

Third slice implemented locally before the next broad verification packet:

- Shared fielded tactical-formation truth no longer counts records with both `status` and `readiness` missing as fielded force; explicit active rows still count unless readiness says forming/unreported/destroyed.
- Corps Front, Army HQ sector detail, Corps Detail, Army HQ Corps Card, OOB Corps Card, and Personnel no longer coerce missing personnel/equipment-condition data into exact zeroes or fully operational counts. Reported values render as exact, mixed values render as `Partial`, and completely absent values render as `Unreported`.
- Stale sector roster ids stay in diagnostic attributes (`data-stale-roster-ids`) while visible player copy shows only stale-record counts/help.
- Personnel Main Staff rows label HQ reserve/security context, so Main Staff reserve brigades do not read as ordinary front-line corps strength.
- Srebrenica/Zepa collapse comments and Lane V assertion messages now say the fall receipts are event-owned; Krivaja/Stupcanica remain chronology/AAR context only.
- Lorentz (UI/modern-wargame scout) and Maxwell (canon/process scout) were closed after their reports were verified and absorbed. Maxwell found active canon clean; only archived/superseded grep hazards remain as historical docs.
- Dirac (QA/process scout) found and closed the remaining sparse-data consistency gaps: lifecycle-free sector overrides no longer bypass fielded-force filtering, Corps Front combat-personnel fallback renders partial/unreported instead of exact totals, ORBAT total personnel renders partial/unreported, and the old Command Board statusless-projection compatibility sentence now carries the 2026-06-24 supersession rule.

Third-slice local verification: focused red/green pack passed 6 files / 92 tests; adjacent command/OOB/Corps Detail pack passed 6 files / 34 tests; `npm.cmd run typecheck -- --pretty false` passed; `git diff --check` passed; `npm.cmd run qa:player-journeys` passed 43 files / 586 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed; in-app browser proof covered RBiH war-start splash, foundational decision routing/lock, Army HQ Personnel, and 1st Corps command surface without error banners or visible raw diagnostic ids.

Remaining closeout gates before declaring the whole sweep done: inspect any new GitHub failures/comments after push, merge to `main` only after green, and delete the branch/worktree/temp evidence. Local temp cleanup removed the baseline comparison worktree, browser evidence folders, and `data/derived/scenario/_baseline_tmp`; only `.tmp_dev_server` remains because it belongs to the active browser/dev server.

## Pyrrhic Roles

- **Orchestrator:** keep the lane scoped, update board/roadmap/ledger, merge and clean branch/worktree after verification.
- **UI/UX Developer:** inspect live Army HQ/OOB/sector/brigade flows and implement player-facing fixes.
- **Technical Architect:** protect surface ownership: President's Desk and Decision Room own presidential decisions; Army HQ owns staff detail, command review, OOB, records, and operation evidence.
- **Modern Wargame Expert:** challenge information hierarchy and repeated-action ergonomics.
- **QA Engineer:** own focused red/green tests, `qa:player-journeys`, and live browser gates.
- **Quality Assurance Process:** review closeout evidence and stop any unsupported completion claim.

## Scope

1. Live browser sweep:
   - Start a fresh faction game.
   - Resolve opening splash/brief/foundational decision.
   - Click Army HQ summary, personnel/ORBAT, sectors, corps cards, Corps Front tabs, brigade rows, Formation Detail tabs, settlement links, and Records handoffs.
   - Record confusing copy, missing context, stale selection, raw ids, invented zeroes, invented readiness, and route ownership mismatches.
2. Focused code pass:
   - Prefer shared helpers already used by the closed sector-truth plan.
   - Keep missing data as unreported/incomplete.
   - Keep physical presence separate from AoR, reserve membership, and command-only anchors.
   - Preserve Decision Room / President's Desk ownership for presidential choices.
3. Test pass:
   - Write failing focused tests before production changes.
   - Expand existing UI/player-journey coverage only where the live sweep finds a real gap.
4. Documentation pass:
   - Update `COMMAND_BOARD.md`, `MASTER_ROADMAP.md`, `docs/PROJECT_LEDGER.md`, and this plan with exact evidence.

## Non-Goals

- No installer/package work.
- No BCS-only copy cleanup unless touched by a general player-truth fix.
- No Srebrenica/Zepa operation-delivery tuning; fall receipts remain event-owned.
- No sector-builder/calibration change unless a failing proof shows player-facing UI cannot honestly represent current truth.

## Verification

- Focused UI tests for changed surfaces.
- `npm.cmd run typecheck -- --pretty false`.
- `npm.cmd run qa:player-journeys`.
- `npm.cmd run qa:first-hour:browser`.
- `npm.cmd run qa:live-surface:browser`.
- Manual in-app browser proof on the active local app.
- `git diff --check`.

## Done Means

The batch is only complete when the player can move through Army HQ -> sector/corps -> brigade/formation -> settlement/records without seeing invented favorable truth, raw/debug labels, missing owner context, or presidential decisions routed through Army HQ as the primary surface; all evidence is documented, branch is merged to `main`, branch/worktree are deleted, and GitHub checks are green.
