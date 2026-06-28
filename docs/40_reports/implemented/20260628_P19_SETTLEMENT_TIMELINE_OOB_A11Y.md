# P19 Settlement Timeline, OOB, And Tactical Contact Polish

**Date:** 2026-06-28
**Branch:** `codex/p19-d2-polish-continuation`
**Result:** Local P19 packet implemented and verified

## Summary
- Closed settlement timeline provenance leaks, OOB accordion naming, expanded-stack enemy-contact presentation, and decision-response action labeling found during the P19 owner-playthrough sweep.
- Kept the packet UI/read-model/accessibility scoped: no simulation, scenario, startup, save, calibration, packaging, or Srebrenica/Zepa event-owned receipt behavior changed.

## Changes Made
### Settlement Timeline Truth
- Turn-zero control rows now always render as scenario-start provenance.
- Setup-control mechanisms render as scenario-start provenance even if the source row is not turn zero.
- Setup/provenance turn summaries no longer feed movement or supply transition rows into settlement timelines.
- `casualties_reported === false` is authoritative for timeline battle rows, so sparse zero placeholders render as unreported.
- Direct movement timeline rows sanitize raw formation identifiers before display.

### OOB And Tactical Controls
- Shared OOB section accordion buttons now expose explicit expand/collapse aria/title labels and hide decorative counts/chevrons from the accessible name.
- Expanded tactical-map stacks render enemy contacts as neutral redacted contact glyphs with neutral glow, not raw enemy formation icons, faction colors, or posture-specific symbols.
- Event decision response buttons now expose action-specific labels: `Choose response: {response}`.

## Verification
- `npm.cmd exec -- vitest run tests/ui_map_game_state_adapter.test.ts tests/settlement_timeline_provenance.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/stack_expansion_overlay_viewport.test.ts tests/ui/event_decision_modal_phase3.test.ts --pool=forks --reporter=dot` passed: 7 files / 144 tests.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/GameStateAdapter.ts` | Applies setup-summary narration guard to movement and supply timeline derivation. |
| `src/ui/map/utils/buildSettlementTimeline.ts` | Hardens setup control, casualty-reporting, and movement-name display behavior. |
| `src/ui/map/components/AccordionHeader.tsx` | Adds explicit expand/collapse labels and decorative count isolation. |
| `src/ui/map/components/StackExpansionOverlay.tsx` | Uses neutral redacted enemy-contact glyphs in expanded stacks. |
| `src/ui/map/components/EventDecisionModal.tsx` | Adds response-button action labels. |
| `src/ui/map/i18n/messages.en.ts` | Adds EN labels for accordion and response actions. |
| `src/ui/map/i18n/messages.bcs.ts` | Adds BCS mirrors for touched labels. |
| `tests/ui_map_game_state_adapter.test.ts` | Guards setup movement/supply filtering. |
| `tests/settlement_timeline_provenance.test.ts` | Guards setup-control and movement-id provenance. |
| `tests/ui/settlement_timeline_i18n.test.ts` | Guards unreported casualty rendering. |
| `tests/ui/oob_drilldown_routing.test.ts` | Guards OOB accordion labels. |
| `tests/ui/stack_expansion_overlay_viewport.test.ts` | Guards expanded-stack enemy-contact redaction. |
| `tests/ui/event_decision_modal_phase3.test.ts` | Guards response-button action labels. |

## Remaining P19 Queue
- Army HQ corps-card command-strain missing-source truth.
- Corps Detail exhaustion i18n cleanup.
- Formation Detail AA condition unreported truth.
- Sparse OOB army commander absence copy.
- Disabled-reason copy for Army HQ Situation briefing and operation opportunities.
- Tactical-map enemy-contact hover context preservation without identity leakage.
