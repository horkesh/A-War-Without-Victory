# 2026-06-21 - BCS First-Hour Decision Chrome

## Summary

Closed the next BCS first-hour residual found by the Pyrrhic sweep. The foundational event modal, fallback Presidential Inbox items, and President's Desk packet labels now route first-hour chrome through EN/BCS i18n instead of preserving English component/registry literals.

This branch does not translate authored event data titles, option labels, narrative, source notes, or staff assessments. Those remain data-owned content and need a separate event-data localization plan.

## Files

- `src/ui/map/components/EventDecisionModal.tsx`
- `src/ui/map/components/presidential_desk/DecisionCard.tsx`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/event_decision_modal_phase3.test.ts`
- `tests/ui/inbox_items.test.ts`
- `tests/ui/president_desk_decision_card_fallback.test.ts`

## Verification

- Red proof initially failed under BCS on English `Decision Required`, `Situation`, `Dossier`, `Presidential Response`, `Historical default`, `Record trail`, `Event decision`, `Decide now`, `Peace proposal`, and fallback inbox copy.
- Green focused pack: `npm.cmd exec -- vitest run tests/ui/event_decision_modal_phase3.test.ts tests/ui/inbox_items.test.ts tests/ui/president_desk_decision_card_fallback.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 58/58.
- TypeScript: `npm.cmd exec -- tsc --noEmit --pretty false` passed.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, Srebrenica/Zepa lifecycle ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Remaining Work

Author-owned event data localization remains open: BCS first required decisions can still show English authored event title/body/option data such as `What Is Bosnia?` or English option labels because those strings originate in `data/scenarios/events/war_1992.json`.
