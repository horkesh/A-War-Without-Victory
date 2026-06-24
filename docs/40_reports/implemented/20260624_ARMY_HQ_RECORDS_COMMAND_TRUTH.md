# Army HQ Records Command Truth

**Date:** 2026-06-24
**Result:** Fourth slice implemented locally; focused tests, typecheck, broad local browser gates, and manual in-app proof pass. GitHub/merge cleanup remains required before declaring the branch closed.

## Summary
- Closed the next Army HQ/Records truth gaps found by the Pyrrhic scouts without touching simulation, calibration, startup artifacts, save schema, or packaging.
- Preserved sparse reporting in Army HQ modal chrome, expanded ORBAT equipment rows, and Supply Intelligence.
- Aligned Records/decision consequence ownership with the loaded player and removed confusing CommandTopBar / authority-gauge command-authority/debug copy.

## Changes Made
### Army HQ Sparse Aggregates
- `ArmyHQModal.tsx` now renders total personnel through reported-metric helpers, so mixed reports show `Partial` and absent reports show `Unreported`.
- `OrbatSection.tsx` now uses shared equipment-condition helpers. Missing tank/artillery condition renders unreported instead of fully operational.
- `SupplyIntelligence.tsx` now distinguishes absent reserve reports from explicit zero stockpiles and suppresses false depletion runway when current supply is unreported.

### Records And Consequence Ownership
- `RecordsContent.tsx` counts only player-facing operation-history rows for the archive summary.
- `decisionConsequenceLedger.ts` explicitly filters paramilitary and officer consequence rows by loaded player faction when one is present.

### Command Copy
- `CommandTopBar.tsx` now labels commander selection as operations commander, localizes discard/authorize/submitting actions, and removes the `TRANSFUSING...` placeholder.
- EN/BCS message catalogs gained the new `planUi.*` keys for these labels.
- Presidential toolbar authority copy now renders as `Authority` / Presidency intervention authority instead of exposing `Command Authority` and Level-3 override jargon in the war-start overlay.

## Verification
- Red/green evidence from agents:
  - Army HQ aggregate tests first failed on missing modal aggregate chip and sparse equipment rendering as `10/10 operational`, then passed.
  - Records/ledger tests first failed on foreign operation/paramilitary/officer rows leaking into player summaries, then passed.
  - Supply Intelligence tests first failed because reserve reporting flags were absent, then passed.
  - CommandTopBar tests first failed on `Command Authority`, `DISCARD`, `AUTHORIZE directive`, and `TRANSFUSING...`, then passed.
- Focused consolidated command: `node node_modules\vitest\vitest.mjs run tests\ui\gui_audit_label_discipline.test.ts tests\ui\supply_intelligence_mobilization.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\operation_aar_records_review.test.ts --pool=forks --reporter=dot` passed 5 files / 87 tests.
- Post-copy focused command: `node node_modules\vitest\vitest.mjs run tests\ui\gui_polish_typography_floor.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot` passed 3 files / 37 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- Final broad local gates passed after docs/code closeout: `npm.cmd run typecheck -- --pretty false`; `npm.cmd run qa:player-journeys` passed 43 files / 588 tests; `npm.cmd run qa:first-hour:browser` passed; `npm.cmd run qa:live-surface:browser` passed with 41 steps / 0 errors and dev-server cleanup verified; `git diff --check` passed.
- Manual in-app browser proof on `http://127.0.0.1:3003/?dev=1` verified RBiH start, the `WAR BEGINS: 6 APR 1992` foundation splash, no old command-authority copy or raw `TRANSFUSING`/`AUTHORIZE directive`/`DISCARD` labels, Army HQ Records turn-zero zero-count truth with no hostile-takeover leak, Command Access -> 1st Corps visible sector/brigade inspect controls, sector inspect opening `corps-front-panel`, and brigade inspect opening sector + formation detail panels with no console errors or malformed values.

## Files Changed
| File | Change |
| --- | --- |
| `src/ui/map/components/army_hq/ArmyHQModal.tsx` | Reported personnel modal chrome |
| `src/ui/map/components/army_hq/OrbatSection.tsx` | Sparse equipment condition display |
| `src/ui/map/components/army_hq/RecordsContent.tsx` | Player-facing operation count |
| `src/ui/map/components/army_hq/SupplyIntelligence.tsx` | Reserve reporting flags |
| `src/ui/map/components/plan_ui/CommandTopBar.tsx` | Commander/action copy |
| `src/ui/map/data/decisionConsequenceLedger.ts` | Player-faction filters |
| `src/ui/map/i18n/messages.en.ts` | EN topbar and authority-gauge keys |
| `src/ui/map/i18n/messages.bcs.ts` | BCS topbar and authority-gauge keys |
| `tests/ui/gui_audit_label_discipline.test.ts` | Army HQ aggregate/ORBAT regressions |
| `tests/ui/gui_polish_typography_floor.test.ts` | Authority-gauge copy regression |
| `tests/ui/supply_intelligence_mobilization.test.ts` | Reserve reporting regressions |
| `tests/ui/ui_copy_raw_id_fallbacks.test.ts` | CommandTopBar copy regressions |
| `tests/ui/decision_consequence_trail.test.ts` | Consequence ownership regressions |
| `tests/ui/operation_aar_records_review.test.ts` | Records archive count regression |

## Scope And Determinism
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, event evaluator mechanics, startup snapshot, save schema, baseline manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Next Steps
- Push, inspect GitHub failures/comments, merge only after green, then delete branch/worktree/temp evidence.
