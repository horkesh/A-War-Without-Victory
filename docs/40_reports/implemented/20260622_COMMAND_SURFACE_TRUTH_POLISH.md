# Command Surface Truth Polish

**Date:** 2026-06-22
**Run ID:** N/A
**Baseline:** `main` after `20260622_FIELDED_BRIGADE_TRUTH_AND_ROUTING`
**Result:** UI/read-model command-surface truth polish implemented on `codex/command-surface-truth-polish`

## Summary
- Closed the next command-surface consistency findings from the Pyrrhic UI/detail and routing scouts.
- Removed invented posture, stance, lifecycle, logistics, and faction-label defaults from Corps Detail, Formation Detail, Corps Front, OOB/ORBAT, Army HQ cards, and Presidential Decision Room counter-offer copy.
- Added focused tests for formation detail parity, brigade lifecycle labels, localized formation sorting, Corps Detail operation routing, Corps Front unresolved rows, supply-readiness display, and counter-offer faction labels.

## Changes Made

### Formation And Brigade Truth
- `FormationDetail` now treats corps stance and army command posture as unreported when the save/read-model does not provide them, instead of displaying a generic hold posture.
- Corps exhaustion now renders the existing 0-100 value directly rather than multiplying it by 100 again.
- `BrigadeRow` maps unknown lifecycle/status values to a neutral recorded badge instead of presenting them as active formations.

### Localized Formation Ordering
- Added `compareLocalizedFormationNames(...)` so OOB, Corps Detail, OrbatPanel, and Army HQ ORBAT sort by the displayed localized formation name with deterministic id fallback.
- This keeps BCS/EN display order aligned with what the player sees rather than raw formation ids or English-only names.

### Corps And Front Routing
- Corps Detail operation rows now route through shared field inspection as `field-operation`, clearing stale corps/sector/formation context while opening the operations panel.
- Corps Front unresolved brigade rows now expose stable proof hooks and preserve formation/sector identity for live and focused routing checks.

### Logistics And Command Cards
- Corps Front operation supply readiness now averages only finite reported values; missing readiness renders as unassessed instead of silently becoming 0%.
- Explicit zero readiness still renders as `0%`.
- CorpsCard and ArmyHQCorpsCard now show neutral unreported stance copy when stance is absent, rather than defaulting to balanced; the editable CorpsCard selector also preserves `Unreported` instead of landing on `Balanced`.

### Decision Room Counter-Offer Copy
- Counter-offer card titles and evidence now resolve known faction ids through player-safe localized side-picker labels.
- Raw `RBiH`/`RS`/`HRHB` ids are no longer displayed in counter-offer titles or territorial split evidence.

## Scenario Results
N/A. No scenario, simulation, calibration, startup snapshot, or persisted save data changed.

## Lessons Learned
- Command surfaces should distinguish absent data from favorable/default data. Unknown stance, posture, lifecycle, and readiness values need neutral recorded/unreported copy.
- Lists that display localized names must sort by the same localized display strings, with stable id fallback only for ties.
- Operation drilldowns are not corps drilldowns; they should open the operations panel and clear stale entity context.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/FormationDetail.tsx` | Neutral posture/stance display and fixed corps exhaustion scale |
| `src/ui/map/components/BrigadeRow.tsx` | Neutral recorded fallback for unknown lifecycle/status |
| `src/ui/map/components/OOBSidebar.tsx` | Localized sorting and no invented corps stance fallback |
| `src/ui/map/components/CorpsDetail.tsx` | Localized ORBAT sorting and canonical operation-row routing |
| `src/ui/map/components/OrbatPanel.tsx` | Localized formation sorting |
| `src/ui/map/components/army_hq/OrbatSection.tsx` | Localized formation sorting |
| `src/ui/map/components/CorpsFrontPanel.tsx` | Supply-readiness average fix and unresolved row proof hooks |
| `src/ui/map/components/CorpsCard.tsx` | Neutral unreported stance rendering |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | Neutral unreported stance rendering |
| `src/ui/map/data/formationNameLocalizations.ts` | Shared localized-name comparator |
| `src/ui/map/data/presidentialDecisionRoom.ts` | Localized counter-offer faction labels |
| `src/ui/map/i18n/messages.en.ts` | Added EN command-surface truth keys |
| `src/ui/map/i18n/messages.bcs.ts` | Added BCS command-surface truth keys |
| `tests/ui/formation_detail_parity.test.ts` | Pinned no invented posture and exhaustion scale |
| `tests/ui/brigade_row_supply_labels.test.ts` | Pinned recorded lifecycle fallback |
| `tests/brigade_name_localization.test.ts` | Pinned localized sort order |
| `tests/ui/command_drilldown_routing.test.ts` | Pinned Corps Detail operation route contract |
| `tests/ui/corps_front_panel_routing.test.ts` | Pinned unresolved row hooks and supply readiness display |
| `tests/presidential_decision_room_counter_offer.test.ts` | Pinned localized counter-offer labels |
| `tests/ui/gui_audit_label_discipline.test.ts` | Pinned CorpsCard and ArmyHQCorpsCard missing-stance display |

## Verification
- `node node_modules\vitest\vitest.mjs run tests\ui\gui_audit_label_discipline.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\brigade_row_supply_labels.test.ts tests\brigade_name_localization.test.ts tests\presidential_decision_room_counter_offer.test.ts tests\ui\command_drilldown_routing.test.ts tests\ui\corps_front_panel_routing.test.ts --pool=forks --reporter=dot` passed 60/60.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 271/271.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.
- `git diff --check` passed.

## Determinism And Scope
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, event mechanics, startup snapshot, turn pipeline, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.

## Next Steps
- Continue the sector-builder/data audit for zero-assignment sectors as a separate lane; this task only corrected command-surface presentation truth.
