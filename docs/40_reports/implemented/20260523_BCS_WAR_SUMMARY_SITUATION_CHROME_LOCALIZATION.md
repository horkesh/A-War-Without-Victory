# BCS War Summary Situation Chrome Localization

**Date:** 2026-05-23
**Type:** Army HQ War Summary situation-tab localization slice
**Scope:** Non-overview War Summary section headings, empty states, and OPSEC operation-health chrome

## Summary

The War Summary non-overview situation tab now routes its component-owned convoy, local-support, OPSEC, and diplomacy headings/empty states through the English/BCS message substrate. The OPSEC flagged-operation-health count and per-operation supply/failure summary also localize while preserving the existing operation filtering, ordering, and player-safe disclosure boundary.

This is presentation-only. It does not change War Summary model math, convoy staging IPC, municipality-support data, OPSEC sector derivation, operation state, diplomacy capital data, scenario data, save schema, simulation output, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\war_summary_empty_states.test.ts tests\ui\war_summary_opsec_reconciliation.test.ts --reporter=dot` failed while BCS mode still rendered English empty states and OPSEC health labels.
- Green: `npx.cmd vitest run tests\ui\war_summary_empty_states.test.ts tests\ui\war_summary_opsec_reconciliation.test.ts --reporter=dot` passed 10/10.
- Related: `npx.cmd vitest run tests\ui\war_summary_empty_states.test.ts tests\ui\war_summary_opsec_reconciliation.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts tests\ui\war_summary_personnel_label.test.ts tests\ui\gui_audit_label_discipline.test.ts --reporter=dot` passed 16/16.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Broad Chronicle prose/chrome, rich Verdict authored prose/source-provided labels, source-provided Decision Room prose, map overlays, event prose, operation-planning chrome/prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
