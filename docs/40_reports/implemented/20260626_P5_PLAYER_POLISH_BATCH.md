# P5 Player-Polish Batch

**Date:** 2026-06-26  
**Branch:** `codex/p5-player-polish-batch`  
**Type:** UI/read-model/accessibility/test/docs polish  
**Status:** Merged to `main` through PR #448 at `3182bddb8`; post-merge GitHub green and branch refs pruned.

## Summary

This packet continues the D2 owner-playthrough polish lane from `docs/plans/2026-06-24-army-hq-sector-brigade-information-quality-sweep-plan.md`. It focuses on player-facing truthfulness and route ownership across Army HQ, Decision Room, Formation Detail, ORBAT, Chronicle, and pre-advance review.

Packaging remains paused. This packet does not change simulation logic, event evaluator mechanics, scenario data, startup snapshot construction, save schema, calibration floors, baseline/golden manifests, structural fingerprint artifacts, Srebrenica/Zepa event ownership, or packaged installer artifacts.

## Implemented

- Army CO pushback warning rows now render unnamed warning sources as `Commander record unreported` instead of blank or `Unknown commander`.
- Army HQ flip-card inactive faces now use native `hidden` together with `aria-hidden`, pointer-event, and focus guards.
- Command-only presidential review aggregates route to the Decision Room command card, with Army HQ Briefing retained as the source handoff, instead of the Desk inbox.
- Chronicle generated operation/officer entries distinguish logged execution captures from final-held objectives; final-held-only AAR rows no longer become captured-objective headlines.
- Army HQ sector detail marks morale/fatigue/personnel aggregates as `Partial` when any line holder lacks reported personnel/cohesion/fatigue data.
- Formation Detail and Army HQ ORBAT label turn-zero recent engagement rows as setup records rather than campaign combat dates.
- Pre-advance fallback blocker counts and Decision Room review cards trust live required event-decision rows when that source exists, preventing stale queue event counts from inventing blockers.

## Verification

- Focused red/green pack passed: `npm.cmd exec -- vitest run tests/a5_army_co_pushback_ui.test.ts tests/ui_shell_frame_contract.test.ts tests/ui/presidential_decision_room.test.ts tests/chronicle_entries.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/pre_advance_command_review.test.ts --pool=forks --reporter=dot`  
  Result: 8 files / 180 tests passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 625 tests.
- `npm.cmd run qa:first-hour:browser` passed, with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed after rerun with a longer local timeout, with dev-server cleanup verified.
- Manual in-app browser proof on `http://127.0.0.1:3003/` verified fresh RBiH start, `WAR HAS STARTED`, identity brief, `Begin`, foundational Desk decision, Decision Room review route without inbox leakage, Army HQ commander/OOB data, native-hidden inactive flip-card backs with zero visible inactive Back buttons, and no sampled `ENOENT`, `Unknown commander`, `Command Authority`, `TRANSFUSING`, `Obj 0/0`, or `front sitrep` leak.
- GitHub `main` was checked green before branch push.
- PR #448 merged to `main` at `3182bddb8`.
- Post-merge `main` checks passed across Event System CI, Desktop Release Guard, Baseline Regression, and Full Suite + Structural Fingerprint.
- Local/remote `codex/p5-player-polish-batch` refs were deleted/pruned, the repo returned to one clean `main` worktree, all P5 scout agents were closed after report absorption, and temporary browser-gate evidence folders were cleaned.

## Next Queue

- Battle marker/timeline fog filtering and missing-casualty unreported handling.
- Chronicle-vs-Records decision filing ownership.
- Reserve-origin order-arrow snapping.
