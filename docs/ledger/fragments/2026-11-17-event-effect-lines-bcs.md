## 2026-11-17 — Event card narrative lines: Bosnian text, pinned to the English

**Why.** An acknowledgement card shows one narrative line under the event's narrative (the `{ kind: 'narrative', text }` row of `effects[]`, or the single `effect` when there is no `effects[]`). Those lines were English in every locale, and nothing said which ones a player can actually see. Counting with the loader's own rule (`eventDefinitionDisplayEffects`): 87 lines reach a card (62 from `effects[]`, 25 from a single `effect` on an event with no list), one per event. Another 65 sit on decisions the player must answer (the decision modal never shows narrative lines) and a large block of single `effect` rows beside an `effects[]` list is never shown; none of those gets a key.

**Change** (UI only; no engine or catalog file touched).
- `src/ui/map/data/eventEffectText.ts`: resolver. Key is `<event id>#<ordinal>`; the Bosnian line is used only while its pinned English still equals the catalog sentence, otherwise the card shows the English.
- `src/ui/map/data/eventEffectBcs.ts`: the 87 lines, each `{ en, bcs }`. Written by the narrative seat; the Historian seat reviewed the sensitive ones (see the report folder).
- `src/ui/map/App.tsx`: `buildAcknowledgementEffects` routes the card's lines through the resolver; the formatter takes the event id and ordinal.
- Retired two dead formatters: the exported `describeEventEffect` in `EventModal.tsx` (no caller) and the unreachable narrative case of `EventDecisionModal`'s `describeEffect`; the `[narrative]` prefix filter in `EventModal` never matched.
- `tests/ui/event_effect_text_localised.test.ts`: the table equals, key for key, the lines the shipped catalogs can show; each pin equals the catalog English; a reworded English falls back to English; hidden single effects have no key; and a list-driven record of the Bosnian title/narrative gap (`tests/ui/fixtures/event_bcs_copy_gap.json`, 288 of 303 events) that must shrink as events are translated and must grow only on purpose.

**Hash.** Neutral by construction (no file the engine reads changed); proved against clean main.

**Not done / follow-ups.** English-side corrections the seats found (listed in the Historian report) belong to the catalog owners. Native-reader confirmation of the Bosnian wording for the detention-facility and takeover lines remains with the owner.
