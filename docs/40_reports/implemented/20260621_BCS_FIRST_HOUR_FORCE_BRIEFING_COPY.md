# 2026-06-21 - BCS First-Hour Force Briefing Copy

## Summary

Closed the live-discovered BCS opening identity-brief force-description leak. The `PeaceWarTransition` identity block already rendered through `intro.identity.*` keys, but the three force briefing cards still stored English paragraphs in the component-local `FACTION_BRIEFINGS` table and bypassed i18n. The force briefing names and body copy now resolve through `intro.forceBriefing.*` keys in EN and BCS.

## Files

- `src/ui/map/components/PeaceWarTransition.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/game_start_intro.test.ts`

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/game_start_intro.test.ts --pool=forks --reporter=dot` initially failed because BCS still rendered the English RBiH/VRS/HVO force-description paragraphs.
- Green proof: `npm.cmd exec -- vitest run tests/ui/game_start_intro.test.ts --pool=forks --reporter=dot` passed 10/10.
- I18n pack: `npm.cmd exec -- vitest run tests/ui/game_start_intro.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 23/23.
- TypeScript: `npm.cmd exec -- tsc --noEmit --pretty false` passed.
- Live browser proof: RBiH new campaign under BCS on `http://127.0.0.1:3003/` showed the localized ARBiH/VRS/HVO force briefing paragraphs (`Vojska Republike Bosne i Hercegovine`, `Vojska Republike Srpske nasljedjuje`, `Hrvatsko vijece obrane organizuje`), no targeted English force-briefing leaks, and no console errors. Temporary dev-server logs were removed after verification.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, Srebrenica/Zepa lifecycle ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Up From Pyrrhic Sweep

The parallel first-hour BCS sweep found adjacent but larger lanes that were intentionally left out of this focused branch. Current status:

- Foundational event modal BCS content/chrome: closed by `20260621_BCS_FIRST_HOUR_DECISION_CHROME.md`.
- Authored first-hour event data and Desk/Inbox event packet titles: closed by `20260621_BCS_FIRST_HOUR_AUTHORED_DECISION_COPY.md`.
- Downstream effect-preview/faction-name vocabulary: closed by `20260621_BCS_FIRST_HOUR_EFFECT_PREVIEW_LOCALIZATION.md`.
- First-modal failure paths: event/peace/Dayton failure strings remain a separate non-first-hour-force-briefing lane.

These should be handled as separate test-first branches because they touch event data, modal chrome, and decision-surface packet plumbing rather than the force-briefing component boundary.
