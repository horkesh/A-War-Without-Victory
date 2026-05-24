# BCS Presidential Inbox Chrome Localization

**Date:** 2026-05-23
**Type:** Implemented UI chrome localization slice
**Scope:** Presidential Inbox panel, quiet state, opening brief, badge, and owned item chrome

## Summary

The Presidential Inbox now routes its visible frame copy through the English/BCS localization substrate, including the panel title, situation divider, severity and item-type badges, notification dismiss affordance, update chip, opening presidential briefs for all three playable factions, quiet-inbox capsule, and toolbar badge titles.

This is presentation-only. It does not change Inbox item derivation, decision routing, opening-brief dismissal state, actionable-item counting, notification semantics, scenario data, save schema, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\inbox_dedup.test.ts --reporter=dot` failed while BCS mode still rendered English Inbox opening/quiet chrome.
- Green: `npx.cmd vitest run tests\ui\inbox_dedup.test.ts --reporter=dot` passed 6/6.
- Related: `npx.cmd vitest run tests\ui\inbox_dedup.test.ts tests\ui\onboarding_track_d_consolidation.test.ts tests\ui\inbox_items.test.ts --reporter=dot` passed 46/46.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Decision Room generated card prose, command-loop lane labels/summaries, source handoff labels, shared date formatting, broader War Summary non-overview chrome, Chronicle prose, map overlays, event prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
