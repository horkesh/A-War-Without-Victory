# 2026-06-21 - BCS First-Hour Effect Preview Localization

## Summary

Closed the remaining BCS first-hour event-decision display leak after authored decision copy landed. `EventDecisionModal` now renders downstream effect previews, dimension shifts, campaign-record flag values, and modal faction/date labels through localized display helpers instead of English player-safe fallback strings.

The RBiH first-hour decision no longer shows BCS players English effect rows such as `Republic of Bosnia and Herzegovina morale +3`, English dimension labels such as `international standing`, or branch-record values such as `Civic`.

## Files

- `src/ui/map/components/EventDecisionModal.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/event_decision_modal_phase3.test.ts`
- `tests/ui/event_decision_modal_catalog.test.ts`

## Verification

- Focused proof: `npm.cmd exec -- vitest run tests/ui/event_decision_modal_phase3.test.ts tests/ui/event_decision_modal_catalog.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 26/26.
- TypeScript: `npm.cmd run typecheck` passed.

## Scope

UI/read-model/i18n/test/docs polish only. No event response ids, effects, flags, historical defaults, bot response logic, save schema, simulation logic, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
