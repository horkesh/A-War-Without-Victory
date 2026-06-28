# P19 Operation Planning And Command Accessibility Polish

**Date:** 2026-06-28
**Branch:** `codex/p19-d2-polish-continuation`
**Result:** Local P19 packet implemented and verified

## Summary
- Closed live-browser information-quality defects in Corps Detail tabs, Army HQ corps-card headers, and Ops Planning controls.
- Kept the changes UI/accessibility/i18n scoped: no simulation, scenario, startup, save, calibration, packaging, or Srebrenica/Zepa event-owned receipt behavior changed.

## Changes Made
### Corps And OOB Surfaces
- `TabBar` now preserves compact count badges while adding visible spacing, titles, and accessible count phrases.
- `CorpsDetail` supplies brigade, sector, and operation count labels so tabs read as domain-specific controls instead of glued label/count strings.
- `CorpsCard` header actions now expose explicit command-card inspection labels with personnel and fielded-brigade truth.

### Operation Planning
- `OpsPlanningModal` phase navigation now exposes step labels, locked-state copy, and current-step state through `aria-label`, `title`, and `aria-current`.
- `CommanderPhase` commander cards now expose concise selection labels and `aria-pressed` selected state.
- EN/BCS i18n keys were added for the new UI labels touched by this general-player polish.

## Verification
- `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts tests/ui/command_drilldown_routing.test.ts tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot` passed: 3 files / 55 tests.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- Manual in-app browser proof on `http://127.0.0.1:3007/` verified fresh RBiH start, opening brief, Army HQ 1st Corps command-card label, Corps Detail tab labels/counts, Ops Snapshot operation-planning handoff, phase rail labels, and commander selected-state behavior.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/TabBar.tsx` | Added count-label support, titles, accessible labels, and hidden decorative count spacing. |
| `src/ui/map/components/CorpsDetail.tsx` | Provides brigade/sector/operation tab count labels. |
| `src/ui/map/components/CorpsCard.tsx` | Adds explicit command-card header accessible/title label. |
| `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` | Adds phase step/locked/current accessibility labels. |
| `src/ui/map/components/ops_modal/CommanderPhase.tsx` | Adds commander option labels and selected-state signal. |
| `src/ui/map/i18n/messages.en.ts` | Adds EN strings for the new labels. |
| `src/ui/map/i18n/messages.bcs.ts` | Adds BCS mirrors for touched labels. |
| `tests/ui/ops_planning_target_discovery.test.ts` | Guards phase navigation and commander card labeling. |
| `tests/ui/command_drilldown_routing.test.ts` | Guards Corps Detail tab count labels. |
| `tests/ui/oob_drilldown_routing.test.ts` | Guards CorpsCard header accessible label. |

## Next Steps
- Continue P19 live-browser sweep on settlement timelines, tactical-map selection/stack behavior, and residual Army HQ/OOB/Corps Front confusion.
- Batch the next coherent fixes before broad CI/push to avoid long test waits for tiny packets.
