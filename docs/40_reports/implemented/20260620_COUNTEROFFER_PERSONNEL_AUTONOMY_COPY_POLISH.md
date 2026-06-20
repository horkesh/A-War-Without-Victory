# Counteroffer, Personnel, and Autonomy Copy Polish

**Date:** 2026-06-20
**Run ID:** n/a
**Baseline:** `main` after raw-copy wave 5 and issue #170 residual reconciliation
**Result:** UI/read-model copy hardening for three additional player-facing leaks

## Summary
- Counter-offer modals now hide unknown response and institutional-model ids behind neutral localized copy.
- Army HQ Personnel rank rows now render localized rank labels, including tactical commanders, instead of underscore-derived rank ids.
- Autonomy proposal domain chips now render localized proposal-family labels instead of raw domain ids.

## Changes Made

### Counter-Offer Modal
- Replaced response-id fallback copy with explicit response label keys and `Unspecified response`.
- Replaced institution-id title-casing fallback with authored labels for known models and `Unspecified institutional model` for unknown ids.

### Army HQ Personnel
- Added a rank-label map for officer ranks used by the Personnel roster, including `tactical_commander`.
- Unknown or missing rank ids now fall back to `Staff officer`.

### Autonomy Panel
- Added a proposal-domain label map for military, political, events, and ops proposals.
- The proposal chip now shows player-facing proposal copy instead of raw enum ids.

### I18n And Tests
- Added English and BCS mirror keys for the new player-facing labels.
- Added focused regressions in decision-family modals, Personnel display, tactical-commander display, and raw-id fallback coverage.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/CounterOfferModal.tsx` | Response and institution fallbacks now use localized neutral labels. |
| `src/ui/map/components/AutonomyPanel.tsx` | Proposal domain chips now use localized labels. |
| `src/ui/map/components/army_hq/PersonnelContent.tsx` | Officer rank rows now use localized rank labels. |
| `src/ui/map/i18n/messages.en.ts` | English labels for proposal domains, ranks, and counter-offer fallbacks. |
| `src/ui/map/i18n/messages.bcs.ts` | BCS mirror labels for proposal domains, ranks, and counter-offer fallbacks. |
| `tests/ui/decision_family_modals.test.ts` | Regression for unknown counter-offer response/institution ids. |
| `tests/ui/personnel_player_safe_display.test.ts` | Regression for rank-label display. |
| `tests/ui/ui_copy_raw_id_fallbacks.test.ts` | Regression for Autonomy proposal domain chip display. |

## Verification
- `npm.cmd exec -- vitest run tests/ui/decision_family_modals.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed: 4 files / 28 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed: 21 files / 206 tests.
- `npm.cmd run qa:live-surface:browser` passed and verified dev-server port cleanup.
- Pyrrhic QA review found the `tactical_commander` semantic fallback gap; a red regression failed on `Tactical OfficerStaff officer`, then passed after the label/i18n fix.

## Scope And Determinism
- UI/read-model copy, i18n strings, focused tests, and docs only.
- No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Continue raw-copy sweeps only from fresh reachable evidence, not from speculative grep hits.
- Keep `qa:live-surface:browser` as the release-polish gate when touching reachable command surfaces or shell route ownership.
