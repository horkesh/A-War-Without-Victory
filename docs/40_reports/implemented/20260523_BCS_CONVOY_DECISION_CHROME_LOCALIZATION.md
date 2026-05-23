# BCS Convoy Decision Chrome Localization

**Date:** 2026-05-23
**Type:** Humanitarian convoy decision localization slice
**Scope:** Convoy decision modal chrome/prose and War Summary convoy action buttons

## Summary

The standalone humanitarian convoy decision modal now routes its title, close action, route/supply/staged fields, default decision state, summary prose, action labels/details, staging fallback, and fallback error copy through the English/BCS message substrate. The War Summary convoy section also localizes its inline Allow/Block/Divert action buttons.

This is presentation-only. It does not change convoy lifecycle evaluation, decision staging IPC, player-decision gating, pending convoy queues, supply effects, IVP effects, scenario data, save schema, simulation output, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\convoy_decision_modal_i18n.test.ts tests\ui\war_summary_empty_states.test.ts --reporter=dot` failed while BCS mode still rendered English modal chrome and inline convoy buttons.
- Green: `npx.cmd vitest run tests\ui\convoy_decision_modal_i18n.test.ts tests\ui\war_summary_empty_states.test.ts --reporter=dot` passed 10/10.
- Related: `npx.cmd vitest run tests\ui\convoy_decision_modal_i18n.test.ts tests\ui\war_summary_empty_states.test.ts tests\ui\war_summary_opsec_reconciliation.test.ts tests\ui\war_summary_campaign_cost_i18n.test.ts --reporter=dot` passed 13/13.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Broad Chronicle prose/chrome, rich Verdict authored prose/source-provided labels, source-provided Decision Room prose, map overlays, event prose, operation-planning chrome/prose, launch copy, and terminology/native-speaker review remain follow-up localization targets.
