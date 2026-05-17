# BCS Localization First Pass

**Date:** 2026-05-17
**Run ID:** N/A
**Baseline:** English-only tactical-map UI copy in the scoped Settings surface
**Result:** Typed UI localization substrate with English fallback, BCS first-batch dictionary, and Settings language control

## Summary
- Added a small TypeScript i18n layer for UI-bound copy only; scenario data, IDs, diagnostics, and canon text were not changed.
- Added English and BCS dictionaries for a first Settings-screen batch, with English fallback and interpolation coverage.
- Added a Settings language selector that persists the local UI preference in localStorage; default remains English.

## Changes Made
### Localization Substrate
- `src/ui/map/i18n/index.ts` defines supported locales, storage key, locale resolution, lookup, interpolation, and a React hook for UI components.
- `src/ui/map/i18n/messages.en.ts` is the canonical complete message set for this first batch.
- `src/ui/map/i18n/messages.bcs.ts` is intentionally partial-capable and falls back through English for missing keys.

### Settings Integration
- `src/ui/map/components/SettingsScreen.tsx` uses localized labels for the scoped Settings surface and adds a Language tab with English/BCS options.
- Preference persistence is UI-only through `awwv.locale`; it does not touch saves or simulation state.

### Tests
- `tests/ui_i18n.test.ts` covers default English, BCS lookup, English fallback, interpolation, locale validation, and persistence.
- `tests/ui/settings_screen_i18n.test.ts` covers default English render plus switching to and persisting BCS from Settings.

## Terminology Notes
- Proper nouns and historical/canon labels were not extracted in this batch.
- BCS copy uses ASCII-only spellings for repo consistency in this pass; native diacritic review remains a follow-up.
- The BCS dictionary should receive domain-language review before broad extraction into Chronicle, Army HQ, verdict, or report surfaces.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/i18n/index.ts` | Locale API, fallback, interpolation, persistence, React hook |
| `src/ui/map/i18n/messages.en.ts` | Complete first-batch English message dictionary |
| `src/ui/map/i18n/messages.bcs.ts` | First-batch BCS message dictionary |
| `src/ui/map/components/SettingsScreen.tsx` | Settings-only translation use and language selector |
| `tests/ui_i18n.test.ts` | Pure i18n regression coverage |
| `tests/ui/settings_screen_i18n.test.ts` | Settings integration coverage |

## Verification
- `npx.cmd vitest run tests\ui_i18n.test.ts tests\ui\settings_screen_i18n.test.ts` passed: 8 tests.
- `npx.cmd vitest run tests\v092_tutorial_lane_b_auto_dismiss.test.ts tests\v093_a11y_lane_d_contrast_reduced_motion.test.ts tests\ui\accessibility_form_labels.test.ts tests\ui\accessibility_clickable_controls.test.ts` passed: 23 tests.
- `npx.cmd tsc --noEmit --target ES2021 --module ES2020 --moduleResolution Node --jsx react-jsx --strict --esModuleInterop --skipLibCheck --resolveJsonModule --types node,vite/client src\ui\map\i18n\index.ts src\ui\map\i18n\messages.en.ts src\ui\map\i18n\messages.bcs.ts src\ui\map\components\SettingsScreen.tsx tests\ui_i18n.test.ts tests\ui\settings_screen_i18n.test.ts` passed.
- `npm.cmd run typecheck` passed.

## Next Steps
- Review BCS terminology and diacritics before extracting historically sensitive or narrative-heavy surfaces.
- Extend dictionaries in narrow batches for Chronicle, Army HQ, and verdict screens with tests per batch.
- Add browser visual checks for long BCS strings once broader panels are translated.
