# v0.9.1 Codex Essay Vocabulary — Dynamic Section Drafts

**Date:** 2026-04-22
**Status:** DRAFT — no essay_index.json changes proposed here. Report-only.
**Author:** research pass on v0.9.1 resolver vocabulary.
**Resolver contract:** `src/ui/map/components/codex/codexEssayResolver.ts` (v0.9.1 atoms + tokens).
**Tests referenced:** `tests/ui/codex_essay_resolver.test.ts`.
**Gate:** all drafts follow `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` — no achievement framing, no optimization-positive atrocity content, historical voice only.

## Scope and method

Three `dynamic_sections` drafts. Each:

- Extends an existing `generated: true` essay (authored by /historian, not by me).
- Uses only the v0.9.1 vocabulary: condition atoms `DURATION_LONGER`, `DURATION_SHORTER`, `CASUALTY_ABOVE:<r>`, `CASUALTY_BELOW:<r>`, `DISPLACEMENT_ABOVE:<r>`, `DISPLACEMENT_BELOW:<r>`, `TERRITORY_ABOVE:<faction>:<pct>`, `TERRITORY_BELOW:<faction>:<pct>`, plus pre-existing `ALWAYS`, `GAME_OVER`, `COMPARISON_NOTES`, `RUPTURE:<id>`, `EVENT:<id>`, `FLAG:<name>`, composed with `AND`/`OR`/`NOT`/parentheses. Tokens: `{comparison_notes}`, `{duration_delta_weeks}`, `{duration_delta_abs}`, `{casualty_ratio_pct}`, `{displacement_ratio_pct}`, `{rupture_list}`, `{territory_<factionKey>_delta}`.
- Adds a `dynamic_sections` entry only. No mutation of canonical `content`. No new canonical paragraphs anywhere — the substrate is immutable per the plan rule.
- Under 200 words of prose per draft.
- Uses deterministic inputs only (`historicalComparison`, fired event set, flags). No rng.

Draft ids are namespaced `v091_*` so that when/if these are ever promoted to essay_index.json they will not collide with the existing `player_endgame_divergence` block on `essay_dayton_signed_1995`.

---

## Draft 1 — Dayton territorial map divergence (divergence variant)

**Target essay:** `essay_dayton_signed_1995` — "The Dayton Agreement: Ending the War, Freezing the Questions".

**Why this essay:** the canonical essay is anchored on the historical 51–49 Federation/RS split. When the player's run ends with significantly different territory, the historical framing becomes a teaching comparison rather than a fact statement. The existing `player_endgame_divergence` block only surfaces raw `{comparison_notes}`; this draft adds a second, sharper section that reads the territorial vector itself.

**Why these atoms and tokens:** `TERRITORY_ABOVE:RS:5` keys on a material divergence — five percentage points past the historical 49% (i.e., >~54% RS territory) is the threshold at which the Dayton map stops describing what the player produced. `{territory_RS_delta}` and `{territory_RBiH_HRHB_Federation_delta}` give the signed, one-decimal delta so the prose is grammatical for both positive and negative values. `GAME_OVER` guards against pre-endgame render when the comparison is not yet stable.

**Why this insertion point:** after paragraph index 3 (the "territorial provisions… 51–49…" paragraph). Attaching to that paragraph keeps the divergence local to the map discussion rather than floating at the end of the essay.

**Historical grounding:** historical 49% RS / 51% Federation figure from the General Framework Agreement for Peace Annex 2 (Inter-Entity Boundary Line); the Holbrooke halt at ~49% RS is the baseline the delta is measured against. Burg and Shoup, *The War in Bosnia-Herzegovina* (2000), chs. 7–8, on the territorial arithmetic. Mirror draft (`TERRITORY_BELOW:RS:-5`) grounded in the counterfactual of a deeper Federation advance toward Banja Luka that Holbrooke halted historically — same sources.

```json
{
  "id": "v091_territory_dayton_map_divergence",
  "insert_after_paragraph": 3,
  "condition": "GAME_OVER AND (TERRITORY_ABOVE:RS:5 OR TERRITORY_BELOW:RS:-5)",
  "variant": "divergence",
  "content": "The Inter-Entity Boundary Line as it appears in Annex 2 of the General Framework Agreement records a 51-49 split. The campaign simulated here closed on a different map: Republika Srpska ended {territory_RS_delta} percentage points from the historical line, the Federation {territory_RBiH_HRHB_Federation_delta}. A Dayton text drafted against those figures would have produced a different Annex 2 — the constitutional architecture rests on the frozen front, and the front was not frozen where history froze it."
}
```

Word count: 78. No second-person address. Register matches canonical tone.

---

## Draft 2 — Sarajevo siege prolonged-war note (note variant)

**Target essay:** `essay_sarajevo_siege_begins_1992` — "The Siege Begins: Sarajevo Under the Guns".

**Why this essay:** the canonical essay ends at the opening of the siege. It mentions the historical 1,425-day duration in passing ("The encirclement would endure until February 1996"). When the simulated war runs longer AND produces higher casualties than history, the reader should be cued that the siege in their campaign is not the siege described — it is a longer, bloodier one.

**Why these atoms and tokens:** `DURATION_LONGER AND CASUALTY_ABOVE:1.2` requires both axes — a war that is longer but no bloodier is a different story from one that is longer and substantially worse. `{duration_delta_abs}` renders the absolute week gap so the prose reads grammatically; `{casualty_ratio_pct}` gives the rounded percentage of historical casualties.

**Why this insertion point:** after paragraph index 4 (the paragraph ending "…until February 1996"). The divergence note attaches directly to the sentence that cites the historical duration — same topic, immediately adjacent.

**Historical grounding:** the Siege of Sarajevo ran 5 April 1992 to 29 February 1996, approximately 1,425 days (~203 weeks). Galić Trial Judgment (IT-98-29-T), factual findings section. RDC (Research and Documentation Center, Sarajevo) 2007 figures: approximately 13,952 killed in the city during the siege, of whom 5,434 were civilians. Per-week casualty baselines from those figures. Burg and Shoup (2000), ch. 4–5, for siege chronology. Casualty ratio math against the RDC baseline is pending historian review if the numbers are pushed into in-game prose rather than computed at comparison time by the engine.

```json
{
  "id": "v091_sarajevo_prolonged_costly_note",
  "insert_after_paragraph": 4,
  "condition": "GAME_OVER AND DURATION_LONGER AND CASUALTY_ABOVE:1.2",
  "variant": "note",
  "content": "The siege in this campaign did not end when it ended historically. It ran {duration_delta_abs} weeks longer, and the country as a whole recorded casualties at {casualty_ratio_pct} percent of the historical baseline. The paragraphs above describe the siege that was — the shelling patterns, the tunnel, the mandate. What this campaign produced was a longer, costlier siege documented against that template, not a repetition of it."
}
```

Word count: 70.

---

## Draft 3 — Bihać 5th Corps ghost entry (ghost variant)

**Target essay:** `essay_bihac_5th_corps_offensive_1994` — "The 5th Corps Breaks Out: Dudakovic's Gamble at Bihac".

**Why this essay (and why ghost):** the canonical essay describes the historical 1994–95 trajectory where the 5th Corps eventually broke the siege and survived into 1995. The Chain 4 consequence `csq_bihac_pocket_collapses_1994` (defined in `data/scenarios/events/consequences.json`) sets `bihac_pocket_fell: true` as its counterfactual. In runs where that flag is set, the canonical essay no longer describes what happened — the breakout did not come, the Corps did not reach Operation Sana, Dudaković did not finish the war as a figure of the Federation offensive. A ghost-variant section attached to the final paragraph lets the essay hold the canonical arc in historical voice while noting that this run did not reach that outcome. This is the opposite direction from the `essay_srebrenica_falls_1995` ghost pattern (which hides the whole essay when the rupture is absent) — here the canonical essay remains as historical record and the ghost text is an appended counterfactual, cued by a fired consequence event rather than an absent rupture.

**Why these atoms:** `FLAG:bihac_pocket_fell` is the deterministic hook set by the consequence. `GAME_OVER` ensures the contrast is stable. `DISPLACEMENT_ABOVE:1.1` narrows to runs where the Bihać collapse actually produced the displacement wave documented in `csq_bihac_refugee_crisis_1994` — the "quarter million on the move" consequence. The `{displacement_ratio_pct}` token lets the prose render the divergence numerically without committing a raw count that would require historian verification.

**Why this insertion point:** after the final canonical paragraph (`insert_after_paragraph: -1`). The canonical essay should be read in full first; the ghost note is an epilogue, not an interruption.

**Historical grounding:** the 5th Corps historically survived, broke the Bihać siege with support from Croatian HV Operation Maestral/Una/Sana 1995, and linked up with the broader Federation offensive in September–October 1995. Sources: Balkan Battlegrounds vol. II, ch. on the Bihać pocket and 5th Corps; Hoare, *How Bosnia Armed* (2004), ch. on 5th Corps operations. Counterfactual collapse path is the Chain 4 counterfactual documented in `docs/plans/2026-03-24-v090-consequence-system-plan.md`. No atrocity claim is advanced in the ghost prose — the `csq_bihac_pocket_collapses_1994` event itself speaks in terms of military defeat and refugee displacement, and the ghost paragraph holds that register. SENSITIVE_HISTORY_DESIGN_GATE §4 ("no minimization, no trivializing comparison") is respected — the prose notes what did not happen, it does not rank the counterfactual against history.

```json
{
  "id": "v091_bihac_fell_ghost_epilogue",
  "insert_after_paragraph": -1,
  "condition": "GAME_OVER AND FLAG:bihac_pocket_fell AND DISPLACEMENT_ABOVE:1.1",
  "variant": "ghost",
  "content": "The essay above records the historical 5th Corps — the breakout of October 1994, the counteroffensive survived, the linkup with the Federation advance in 1995. This campaign did not reach that outcome. The pocket broke before the breakout could be redeemed. Country-wide displacement ran at {displacement_ratio_pct} percent of the historical baseline, and the 5th Corps ended the war on a casualty list rather than on the approaches to Sanski Most. Dudaković's gamble is recorded here as history; in this war it did not pay."
}
```

Word count: 94. Variant `ghost` is correct even though the carrier essay is canonically unlocked — the paragraph variant signals the counterfactual register to the UI regardless of whether the whole essay is a ghost entry.

---

## Cross-cutting notes

- **No essay_index.json edit proposed.** These drafts are a vocabulary exercise. Promotion requires /historian + /narrative-designer sign-off per SENSITIVE_HISTORY_DESIGN_GATE §6.
- **Token hygiene.** Every token used renders to empty string when the backing field is absent (per resolver §expandToken). None of the drafts depend on the empty-string rendering for correctness — each condition gates the section on the relevant comparison field being present.
- **Determinism.** No `Math.random()`, no time-based inputs, no faction avoidance. All conditions are pure predicates on `historicalComparison`, the fired event set, and flags.
- **Word budget.** Total prose across all three drafts: 242 words. Report total below 1500 words.
- **Open question for historian review.** Draft 2's 1.2 casualty ratio threshold is a placeholder — the correct threshold should come from the RDC 2007 figures and the simulated casualty distribution; the threshold is calibration-tunable and should be signed off separately before any promotion.

## Sources cited

- ICTY Galić Trial Judgment (IT-98-29-T) — siege of Sarajevo findings (Draft 2).
- ICTY Karadžić Trial Judgment (IT-95-5/18-T) — political/military chain of command (all three drafts).
- General Framework Agreement for Peace in Bosnia and Herzegovina, Annex 2 (Dayton 1995) — IEBL and 51-49 split (Draft 1).
- Burg, S., and Shoup, P., *The War in Bosnia-Herzegovina: Ethnic Conflict and International Intervention* (M.E. Sharpe, 2000) — chs. 4, 7, 8 (Drafts 1, 2).
- Hoare, M. A., *How Bosnia Armed* (Saqi, 2004) — 5th Corps and ARBiH trajectory (Draft 3).
- Research and Documentation Center (RDC), Sarajevo, *Bosnian Book of the Dead* (2007 figures) — casualty baselines (Draft 2, pending historian review for any specific threshold).
- Balkan Battlegrounds vol. II — 5th Corps operations (Draft 3).
- `docs/plans/2026-03-24-v090-consequence-system-plan.md` Chain 4 — counterfactual provenance (Draft 3).
