# Contained Copy Polish

**Date:** 2026-06-21  
**Type:** UI/i18n copy-boundary polish.

## Summary

This batch closes a contained set of residual player-copy leaks without touching simulation state:

- Battle-tooltip no-row fallback now renders through EN/BCS keys instead of hardcoded `Battle at ...`.
- Records subtab count accessible labels now render through EN/BCS keys.
- Back-the-Officer opportunity cards now localize officer rank labels, donor title copy, and the short structured framing sentence instead of echoing English read-model prose.
- Legacy Warroom Settings modal chrome now renders through the shared EN/BCS i18n dictionary.

## Verification

- `npx.cmd vitest run tests\ui\aar_tooltip_friction_labels.test.ts tests\ui\operation_aar_records_review.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\warroom_settings_modal_i18n.test.ts --reporter=dot` -> 33/33 passed.
- `npm.cmd run typecheck` -> passed.
- `git diff --check` -> passed with only the existing CRLF normalization warning for `src/ui/warroom/components/SettingsModal.ts`.
- `npm.cmd run qa:player-journeys` -> 245/245 passed.
- `npm.cmd run qa:first-hour:browser` -> passed; evidence showed all three foundational response ids, Records/Chronicle receipts, raw-label absence checks, and dev-server cleanup, then `.tmp_first_hour_browser_gate` was removed.
- `npm.cmd run qa:live-surface:browser` -> passed; evidence showed major-surface reachability, Army HQ/Records proofs, exact AAR fixture proof, battle-marker proof, operation-opportunity routing/ledger proof, archive drilldowns, and dev-server cleanup, then `.tmp_live_surface_browser_sweep` was removed.
- `npm.cmd run desktop:map:build` -> passed; Vite emitted the existing browser-external/chunk-size warnings but exited 0.

## Determinism / Scope

UI/i18n/test/docs only. No simulation logic, scenario data, event mechanics, save schema, generated artifact, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
