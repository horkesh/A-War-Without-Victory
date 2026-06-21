# 2026-06-21 - BCS First-Hour Decision Chrome

## Summary

Closed the next BCS first-hour residual found by the Pyrrhic sweep. The foundational event modal, fallback Presidential Inbox items, and President's Desk packet labels now route first-hour chrome through EN/BCS i18n instead of preserving English component/registry literals.

This branch did not translate authored event data titles, option labels, narrative, source notes, or staff assessments. That adjacent data-owned lane is now closed by `20260621_BCS_FIRST_HOUR_AUTHORED_DECISION_COPY.md`; downstream effect-preview copy is closed by `20260621_BCS_FIRST_HOUR_EFFECT_PREVIEW_LOCALIZATION.md`.

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

## Follow-Up Status

Closed by later same-day slices: authored event data localization and downstream effect-preview/faction-name localization. No first-hour BCS decision-copy residual remains in this report's scope.
