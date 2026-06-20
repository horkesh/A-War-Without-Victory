# Settlement Timeline Supply I18n

**Date:** 2026-06-20
**Baseline:** Settlement timeline supply transitions rendered hardcoded English titles with raw supply state ids.
**Result:** Supply transition timeline rows render through EN/BCS i18n labels and no longer expose raw state ids in BCS mode.

## Summary
- Localized settlement timeline supply transition titles in `buildSettlementTimeline(...)`.
- Added EN/BCS labels for supply transition copy and state labels.
- Pinned BCS mode against visible `Supply`, `adequate`, `strained`, or `critical` in settlement timeline supply rows.

## Changes Made
### Timeline Copy
- `src/ui/map/utils/buildSettlementTimeline.ts` now resolves supply transition titles through `t(...)` and maps supply state ids through localized labels.
- The loop variable was renamed to avoid shadowing the imported translation helper.

### Localization
- `src/ui/map/i18n/messages.en.ts` adds supply degraded/restored copy and supply state labels.
- `src/ui/map/i18n/messages.bcs.ts` uses the existing project vocabulary around `Snabdijevanje`, avoiding the rejected `opskr*` root.

### Tests
- `tests/ui/settlement_timeline_i18n.test.ts` now covers BCS supply transition rendering and rejects raw English/state-id leakage.

## Verification
- Red proof: `npm.cmd exec -- vitest run tests/ui/settlement_timeline_i18n.test.ts --pool=forks --reporter=dot` first failed on visible `Supply strained (was adequate)`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/settlement_timeline_i18n.test.ts tests/settlement_timeline_provenance.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 32/32.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 22 files / 212 tests.
- `npm.cmd run qa:live-surface:browser` passed with `live surface browser sweep ok`; temporary evidence folder was deleted after verification.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/utils/buildSettlementTimeline.ts` | Localizes supply transition titles and state labels. |
| `src/ui/map/i18n/messages.en.ts` | Adds English supply timeline messages. |
| `src/ui/map/i18n/messages.bcs.ts` | Adds BCS supply timeline messages using existing `Snabdijevanje` vocabulary. |
| `tests/ui/settlement_timeline_i18n.test.ts` | Adds BCS raw-copy regression for supply transitions. |

## Scope
- UI/read-model/i18n/test/docs polish only.
- No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Continue the raw-copy/i18n wave against newly proven reachable leaks, especially settlement status and local-support labels from the Noether/Mill sweep.
