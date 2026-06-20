# Local Support Label I18n

**Date:** 2026-06-20
**Baseline:** Local-support UI surfaces rendered sim-owned English labels such as `weapons shipment` inside BCS chrome.
**Result:** SelectionPanel and SituationTab resolve municipality-support display labels from localized UI message keys keyed by support order type.

## Summary
- Localized municipality-support action labels for EN/BCS.
- Removed SelectionPanel's runtime import from `src/sim/combat`, keeping UI components inside the adapter boundary.
- Preserved the adapter's legacy `label` field for compatibility while stopping player surfaces from trusting it as display copy.

## Changes Made
### UI Label Resolver
- Added `src/ui/map/utils/municipalitySupportLabels.ts` to map support order types to localized labels.
- Added UI-side faction-to-support-type mapping for staging controls, avoiding a UI component dependency on sim runtime helpers.

### Player Surfaces
- `SelectionPanel` now renders active and staged support labels via localized type labels.
- `SituationTab` now renders the active support type label instead of interpolating the serialized order label.

### Localization
- Added EN/BCS `municipalitySupport.label.*` keys for weapons shipments, staff priority, Croatian support packages, and fallback local support.

## Verification
- Red proof: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` first failed on visible `Republic of Bosnia and Herzegovina weapons shipment staged`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts tests/ui_i18n.test.ts tests/ui_adapter_boundary.test.ts --pool=forks --reporter=dot` passed 39/39.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 22 files / 212 tests.
- `npm.cmd run qa:live-surface:browser` passed with `live surface browser sweep ok`; temporary evidence folder was deleted after verification.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/utils/municipalitySupportLabels.ts` | New localized support label/type helper. |
| `src/ui/map/components/SelectionPanel.tsx` | Uses localized support labels and no longer imports sim runtime support helpers. |
| `src/ui/map/components/SituationTab.tsx` | Uses localized support labels for active support orders. |
| `src/ui/map/i18n/messages.en.ts` | Adds English municipality-support label keys. |
| `src/ui/map/i18n/messages.bcs.ts` | Adds BCS municipality-support label keys. |
| `tests/ui/gui_audit_label_discipline.test.ts` | Adds BCS raw-English local-support regression. |

## Scope
- UI/read-model/i18n/test/docs polish only.
- No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Continue settlement/i18n residuals with settlement status raw-label handling or ethnic chart label localization.
