# Operation Panel Map Review Hardening

**Date:** 2026-06-24
**Branch:** `codex/operation-panel-stale-truth`
**Baseline:** `6dddb2a07`
**Result:** Implemented and locally verified through focused UI proof, TypeScript, player journeys, and browser gates

## Summary

- Closed the next Pyrrhic scout slice across field operation truth, map inspection context, defense tooltips, command-review ownership, opportunity dossier bridge state, and active docs hygiene.
- Kept the batch UI/read-model/test/docs only. No simulation logic, scenario source data, startup artifact, save schema, event evaluator mechanics, calibration floor, baseline manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaging artifact, randomness, timestamps, or persisted output ordering changed.

## Changes Made

- Operations Panel now surfaces stale operation participant records the same way Army HQ does, while keeping stale raw ids non-clickable.
- Defense-mode settlement tooltips now find sectors through canonical `frontEdgesOsid` via `collectSectorFriendlyOsids(...)`, so `__` edge ids do not suppress defense previews.
- Settlement context-menu `View Sector` preserves the clicked settlement OSID through field inspection instead of opening a bare sector route.
- Operation Briefing action controls render only for planning-phase decision briefings. Execution/recovery command reviews are close-only and explicitly read-only.
- Operation Briefing recommendation rationale no longer converts unreported intel/supply readiness into `0%` blockers.
- Operation opportunity dossier resolution controls no longer render as clickable no-ops when the desktop command bridge is unavailable.
- Active docs now point at current structural fingerprint `b9f5a40aa0a1726e`, with older fingerprints marked as lineage, and the implemented sector-truth plan is marked history-only.

## Verification

- Focused proof passed 5 files / 125 tests:
  `node node_modules\vitest\vitest.mjs run tests\ui\army_hq_timing_copy.test.ts tests\ui\oob_operations_panel.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui\map_click_routing_contract.test.ts tests\command_authority_explanation_delegation.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 557 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- `git diff --check` passed.
- Temporary browser evidence folders were removed; `.tmp_dev_server` remains as the active dev-server workspace.

## Follow-Up Queue

- Implemented follow-up: operation-history missing AAR grade, raw AAR axis labels, empty objective-chain `0/0`, Decision Room opportunity recommendation copy sanitization, review-aware opportunity authorization, sector inspect OSID anchoring, and neutral missing-condition presentation. Report: `docs/40_reports/implemented/20260624_OPERATION_HISTORY_DECISION_SECTOR_POLISH.md`.
- Remaining later polish: BCS status-value localization remains intentionally deferred behind the user's current "not BCS-first" direction.
