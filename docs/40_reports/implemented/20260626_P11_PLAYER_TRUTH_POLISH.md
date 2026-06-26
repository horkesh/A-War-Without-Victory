# P11 Player Truth Polish

**Date:** 2026-06-26  
**Branch:** `codex/p11-player-truth-polish`  
**Status:** Local implementation and broad proof complete; GitHub verification, merge, branch cleanup, and final clean-worktree proof still pending.

## Scope

P11 continues the Army HQ/sector/brigade information-quality sweep as a UI/read-model/test/docs packet. It does not reopen packaging, calibration, startup construction, scenario data, save schema, baseline manifests, structural fingerprint artifacts, or Srebrenica/Zepa fall delivery. Srebrenica/Zepa fall receipts remain event-owned.

## Implemented

- Corps Detail sector inspection now preserves the first authored friendly segment OSID so sector drilldowns keep battlefield context.
- Sector entrenchment and dig-in summaries carry reported-field counts; Corps Front renders exact, partial, or unreported values instead of zero-filled aggregates.
- Formation Detail and OOB sector controls sanitize raw sector/command identifiers in title and accessible copy.
- Operation lifecycle read models require finite objective, momentum, and supply-readiness values.
- Back-the-Officer stale proposal plan ids no longer bind to the first operation as a fallback.
- G-2 prediction normalization keeps missing prediction dimensions nullable instead of defaulting to zero or `stalemate`, while preserving explicit reported zeroes.
- War Summary, Chronicle, and Wrapped campaign-cost surfaces distinguish absent casualty/displacement sources from explicit reported zeroes.

## Verification

- `npm.cmd exec -- vitest run tests/ui_map_game_state_adapter.test.ts tests/ui/back_the_officer_read_model.test.ts tests/use_prediction_normalize.test.ts tests/ui/command_drilldown_routing.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/war_summary_campaign_cost_i18n.test.ts tests/wrapped_slides.test.ts tests/chronicle_entries.test.ts --pool=forks --reporter=dot` passed: 10 files / 229 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `git diff --check` passed with the existing CRLF normalization warning on `src/ui/map/components/ops_modal/usePrediction.ts`.
- `npm.cmd run qa:player-journeys` passed: 43 files / 659 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- `npm.cmd run desktop:map:build` passed with existing non-fatal Vite externalization/chunk warnings.
- Manual in-app browser proof on `http://127.0.0.1:3003/` verified RBiH start, war-start splash, identity brief, foundational `What Is Bosnia?` blocker, named opening corps commanders, 1st Corps detail, and sector rows without sampled raw-label/title/aria leaks.
- Generated browser evidence folders were removed after verification; `.tmp_dev_server` remains for the active browser/dev session.

## Remaining Gates

Before closeout: GitHub PR checks/comments, merge, branch prune, and clean-worktree proof.

## Pyrrhic Roles

Poincare, Beauvoir, and Anscombe reported the findings absorbed into this packet and were closed after report absorption. Anscombe's separate soundscape suggestion remains deferred because this packet prioritizes owner-playthrough truth, not new atmosphere features.
