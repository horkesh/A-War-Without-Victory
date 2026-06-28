# P19 Chronicle and Records Ownership Polish

**Date:** 2026-06-28
**Run ID:** N/A
**Baseline:** `main` at `3a67397ce`, P18 merged and green
**Result:** Local P19 packet implemented on `codex/p19-d2-polish-continuation`

## Summary
- Corrected the first live-browser P19 confusion: Chronicle-filed presidential decisions were being described as if they also lived in Army HQ Records.
- Kept existing routing architecture intact while making labels and disabled states honest.
- Improved CorpsCard Order of Battle controls so repeated visible labels have corps-specific accessible names.

## Changes Made
### Chronicle / Records Ownership
- `EventDecisionModal` record-trail copy now says foundational decisions file in the Chronicle decision ledger while Army HQ Records keeps consequences, opportunities, operations, and turn aftermath.
- Records archive summary now says `Latest Filed Decision`, preserving the separate `Decisions` and `Chronicle Filed` counts.
- Chronicle decision actions now say `Focus Chronicle Decision`.
- Chronicle entries without a real turn aftermath record render disabled `Chronicle Entry Only` actions instead of opening an empty Records aftermath tab.

### OOB Accessibility
- CorpsCard Order of Battle buttons keep compact visible copy but expose corps-specific aria/title labels, e.g. `Open 1st Corps order of battle`.

### Browser Gates and Tests
- First-hour and live-surface browser scripts now wait for `Latest Filed Decision`.
- Focused tests pin the updated decision modal copy, Chronicle action labels, Chronicle-only disabled routing, and CorpsCard OOB accessible names.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | Added aftermath-turn awareness and Chronicle-only disabled actions. |
| `src/ui/map/components/CorpsCard.tsx` | Added corps-specific OOB aria/title labels. |
| `src/ui/map/i18n/messages.en.ts` | Updated Chronicle, Records, decision, and OOB English copy. |
| `src/ui/map/i18n/messages.bcs.ts` | Added matching BCS keys/copy for parity. |
| `tools/ui/first_hour_browser_gate.cjs` | Updated Records text expectation. |
| `tools/ui/live_surface_browser_sweep.cjs` | Updated Records text expectation. |
| `tests/ui_chronicle_operation_aar_link.test.ts` | Pinned Chronicle focus and Chronicle-only disabled routing. |
| `tests/ui/event_decision_modal_phase3.test.ts` | Pinned corrected record-trail copy. |
| `tests/ui/oob_drilldown_routing.test.ts` | Pinned corps-specific OOB accessible name. |
| `tests/ui/first_hour_browser_gate_contract.test.ts` | Pinned updated browser-gate contract copy. |

## Verification
- `npm.cmd exec -- vitest run tests/ui_chronicle_operation_aar_link.test.ts tests/ui/event_decision_modal_phase3.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` passed 4 files / 42 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- `git diff --check` passed.
- Manual in-app browser proof on `http://127.0.0.1:3007/` verified RBiH start, war-start splash, opening brief, foundational decision copy, Records `Latest Filed Decision`, Chronicle `Focus Chronicle Decision`, disabled `Chronicle Entry Only`, and corps-specific OOB labels.

## Next Steps
- Continue P19 live-browser sweep on settlement timelines, operation planning, tactical-map selection/stack behavior, and residual Army HQ/OOB/Corps Front confusion.
- Batch the next coherent fix set before broad CI/push.
