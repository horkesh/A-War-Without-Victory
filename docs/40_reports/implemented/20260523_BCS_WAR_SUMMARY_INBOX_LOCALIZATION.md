# BCS War Summary And Inbox Localization

**Date:** 2026-05-23
**Type:** UI localization extraction only
**Scope:** War Summary overview, focused SituationTab empty/OPSEC states, and Presidential Inbox quiet-state chrome

## Summary

This slice continues the BCS localization extraction beyond Operations Planning into the main command shell. It keeps state derivation, inbox routing, save contracts, scenario data, and simulation behavior unchanged. English remains the fallback locale.

## Implemented

- Added English/BCS message keys for War Summary overview sections, personnel/displacement/cost labels, tab labels, and selected SituationTab empty/OPSEC strings.
- Routed `WarSummaryContent` through `t(...)` for overview labels and player-safe summary prose.
- Routed high-visibility SituationTab empty states and OPSEC health labels through `t(...)`.
- Added English/BCS message keys for Presidential Inbox quiet-state chrome, header, update chip, dismiss command, and badge titles.
- Routed `PresidentialInbox` shell copy through `t(...)` while preserving inbox item ids and action routing.

## Boundaries

- Dynamic inbox item titles/subtitles from `deriveInboxItems(...)`, event/notification bodies, operation names, formation names, and settlement names remain data-driven or source-authored.
- Broader localization work remains open for Decision Room, Chronicle, Army HQ detail panels, verdict/endgame panels, report panels, and native-language review.

## Verification

- `npx.cmd vitest run tests/ui/war_summary_personnel_label.test.ts tests/ui/war_summary_empty_states.test.ts tests/ui/war_summary_opsec_reconciliation.test.ts tests/ui/inbox_dedup.test.ts tests/ui_i18n.test.ts --reporter=dot` passed: 23/23.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with known Vite externalization/dynamic-import/chunk-size warnings.
