# 2026-06-21 - BCS First-Hour Authored Decision Copy

## Summary

Closed the authored-content portion of the BCS first-hour decision residual. The three foundational opening decisions now carry `localizations.bcs` data for title, narrative, staff assessment, trigger evidence where present, source note, and response option labels/descriptions.

The event decision modal resolves localized authored fields from the full event catalog at render time, and the President's Desk / Presidential Inbox event packets use the same catalog-localized title boundary so the first packet no longer leaks `What Is Bosnia?` in BCS mode.

## Files

- `data/scenarios/events/war_1992.json`
- `src/sim/events/event_types.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/components/EventDecisionModal.tsx`
- `src/ui/map/components/PresidentialInbox.tsx`
- `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx`
- `src/ui/map/data/inboxItems.ts`
- `tests/ui/event_decision_modal_phase3.test.ts`
- `tests/ui/inbox_items.test.ts`

## Verification

- Focused event/content pack: `npm.cmd exec -- vitest run tests/ui/event_decision_modal_phase3.test.ts tests/ui/inbox_items.test.ts tests/ui/event_decision_modal_decision_context.test.ts tests/ui/event_decision_advisor_label.test.ts tests/event_loader.test.ts tests/ui/event_decision_modal_catalog.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 107/107.
- TypeScript: `npm.cmd run typecheck` passed.
- Whitespace: `git diff --check` passed.
- Live browser proof on `http://127.0.0.1:3003/`: BCS RBiH new campaign showed the war-start splash, identity brief, localized Desk packet title `Sta je Bosna?`, and localized modal authored copy including `Predsjednistvo mora proglasiti viziju drzave.`, `Majska platforma iz 1992. nalazi se pred Predsjednistvom.`, `Gradjanska multietnicka republika`, and `Kontekst presude Karadzicu`. Targeted English leaks (`What Is Bosnia?`, `Your Presidency must declare`, `The May 1992 platform debate is before the Presidency.`, `Civic multi-ethnic republic`, `Karadzic judgment context`) were absent. Console errors: none.

## Scope

Scenario event display data, UI read-model title resolution, focused tests, and docs. The new `localizations` field is read-only display metadata; event evaluators, response ids, effects, flags, historical defaults, bot response logic, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, and persisted output ordering are unchanged.

## Remaining Work

The live BCS modal still exposes separate effect-preview/faction-name vocabulary in downstream effect rows, for example English faction names and branch-record values such as `Civic`. That belongs to the event-effect display/i18n boundary, not authored scenario narrative data.
