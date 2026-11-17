## 2026-11-17 — The Bosnian language option is labelled honestly as partial

**Why.** Owner decision 2026-11-17: version 1.0 ships with English as the complete language; the Bosnian option stays selectable but must say it is partial wherever the player picks it. The picker showed "BCS" (an academic abbreviation no player calls their language) and nothing about the fact that 172 of the 186 events that fire in a campaign (92%) have no Bosnian title or narrative (count in the 2026-11-17 BCS gap report).

**Change** (UI strings, two components, one CSS rule; no simulation state, hash unchanged):
- Option labels: "English" in both UIs (a language is named in itself, so a player who landed in the wrong UI can still find theirs); "Bosanski (partial)" in the English UI, "Bosanski (djelimično)" in the Bosnian UI ("djelimično", the Bosnian form, consistent with the file's lexicon). Written by the narrative seat.
- One always-visible line under the picker, in the main menu header and in Settings > Language, wired to the select with `aria-describedby`: EN "The interface is in Bosnian; most event text is still in English." BCS "Interfejs je na bosanskom, a većina tekstova događaja još je na engleskom."
- Settings description tidied ("Language of the game interface" / "Jezik interfejsa igre"). The saved-notice template is unchanged (`{locale}` carries the new label).
- Tests: `tests/ui_i18n.test.ts` pins the labels in both languages and that both pickers show and describe the note.

**Not done.** The translation itself (post-1.0, own decisions first, then the shared notices); the effects[] resolver and its shrinking allowlist (the tracker for that work) is a separate PR.
