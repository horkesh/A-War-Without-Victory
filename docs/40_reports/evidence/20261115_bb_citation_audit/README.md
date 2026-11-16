# Citation audit, batch 3: Balkan Battlegrounds page and chapter references

The historian read the cited location of every Balkan Battlegrounds (BB) reference in the event and essay data: 109 groups, 279 mentions, against the repo's two BB volumes (`docs/Balkan_BattlegroundsI.pdf`, `docs/Balkan_BattlegroundsII.pdf`, text layer, plus the partial knowledge base). Full per-group table: the historian's report (session notes folder), summarised here.

## Result

| Verdict | Groups | Mentions (279) |
| --- | --- | --- |
| Printed page right | 44 | 109 (39%) |
| Right only at the extraction/PDF number (the printed page shown is wrong) | 16 | 36 (13%) |
| In part | 6 | 12 (4%) |
| **Wrong** (the location holds something else) | **39** | **108 (39%)** |
| Accurate "does not exist" correction notes (from the earlier sweeps) | 4 | 14 (5%) |
| Not verified | 0 | 0 |

Of the 108 wrong mentions, **80 cite Vol. II "chapters"**: BB Vol. II has no chapters (three addenda and annexes 1-64), so every "Vol. II Ch. N" points at nothing and in each case the topic (1994-95 arms flows, manpower and cadre trends, post-Dayton train-and-equip) is also absent from the same-number annex and chapter: modelled history with no BB anchor. 27 are wrong pages in 9 groups (pages from the wrong year or place: Vol. II pp. 358-366 are 1992 Herzegovina but were cited for the August 1995 command crisis; pp. 312-321 are Posavina 1992-93, cited for the May-June 1995 hostage crisis; pp. 406-417 are 1993, cited for Bihać 1994; pp. 459-462 and 471-475 are Goražde 1994, cited for HVO detention camps (Heliodrom, Dretelj and Gabela appear nowhere in BB); pp. 506-520 are Kupres and Abdić 1994, cited for the Washington Agreement channel; Vol. I pp. 198-229 are 1993-94 chapters, cited for the 1992 camps, while BB says on p. 166 that it "will not examine the detention camp system"). One is Vol. I ch. 8-9 (Croatia 1991) cited for the 1992 Drina campaign.

**Two numbering conventions were mixed in the repo.** Printed pages (Vol. I printed = PDF page - 37; Vol. II printed = PDF page - 19; confirmed on page footers and the table of contents) and knowledge-base extraction or PDF numbers (the 16 "extraction" groups: Vol. I pp. 63, 187, 215-218, 416-429, 462 and Vol. II pp. 410-411, 448, 452, 536-538). A reader with the printed book lands on the wrong page for the second kind. Vol. I has chapters 1-95 (the audit brief said 94).

Flags from the historian: BB p. 291 describes the 4 August 1995 Mladić move as a "joint coordinator" arrangement, not a dismissal (ICTY wins); the "3 July 1992 HZ HB consolidation" date is not in BB (it rests on Prlić); BB calls the September 1995 operation "Maestral", the repo's "Mistral 2" is not BB's name; Vol. II p. 451 mentions "both options are forms of acceptance" are design glosses, not BB statements.

## This change

- **Hidden notes (95 strings)**: each wrong BB location is followed by "(the earlier cite: ...)" with the correction, e.g. "BB Vol. II has annexes and addenda, not chapters, and the claim has no BB anchor" or "this page does not carry this claim; <correct cite>".
- **Extraction numbers become printed pages in all text (19 mentions)**: for example Vol. I p. 187 becomes p. 151 (Zvornik and Foča, April 1992), p. 462 becomes p. 425 (endnotes 821, 823), pp. 416-420 become pp. 379-383, Vol. II pp. 536-538 become pp. 517-519 (Annex 59, the order-of-battle charts), pp. 410-411 become pp. 390-392. Near-misses fixed: p. 22 becomes pp. 21-23, p. 250 becomes pp. 28-29, pp. 386-395 become pp. 377-380 and 394-395, Maglaj moves from Vol. II pp. 450-451 to Vol. I pp. 196-197, the Vol. II pp. 28-31 Vance-Owen claim moves to Vol. I p. 8, and the historian's own PR-B rewrite "pp. 418-421" (an extraction number) becomes pp. 381-384.
- **Player-visible text (events and essays, 52 strings)**: a wrong page or a non-existent Vol. II chapter is removed (source name only); extraction numbers are replaced by the verified printed page. Camp, detention and Drina source lines lose their wrong pages and nothing else.
- `tests/ui/event_bb_citations.test.ts` (new): no Vol. II chapter reference stands uncorrected; the extraction numbers and the wrong page ranges are never cited as a BB location unless a correction marks them; player-visible text shows none of them.
- `tests/ui/player_visible_event_text_clean.test.ts`: the audit vocabulary now also catches "the H4 audit" (one more visible leak on main: `embargo_lifted_non_enforcement_1994`, "BB1 p.63 and the H4 audit support ..." is now "Balkan Battlegrounds Vol. I, p. 27 supports ...").
- Two older tests pinned the wrong strings and are updated: `sensitive_history_player_choice_content` (the Drina source line no longer cites "BB Vol. I Ch. 8-9") and `codex_essay_localization` (the Bihać essay cites pp. 517-519; its event line no longer cites pp. 406-417).
- Names: the correction notes carry restored Bosnian spellings (the project's own `restoreBosnianPlaceNames`), which the player-facing name sweep enforces.

**Not changed because the event is pinned by a reviewed-contract hash**: `rbih_state_identity` (3 visible explanations still cite Vol. II pp. 406-417 for Bihać 1994, plus its hidden BB notes) and `rbih_paramilitary_policy_1992`. A third seat-reviewed re-pin of `rbih_state_identity` will clear them; the BB test lists the three strings as an allowlist that may only shrink.

## Verification

188-week headless run against a clean `origin/main` run at the same commit: see the PR description. `tsc` clean; 150 related test files (2311 tests) green.

## Files changed (exhaustive)

Events: `war_1992.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`, `consequences.json` (the 68 "BB II Ch. N" mentions). Essays: `essay_index.json`, `bihac_5th_corps_offensive_1994.json`, `contact_group_plan_1994.json`, `maglaj_enclave_blockade_1993.json`, `nato_deliberate_force_1995.json`, `operation_lukavac_93.json`, `operation_sana_1995.json`, `rs_assembly_rejects_voplan_1993.json`, `us_halts_federation_advance_1995.json`. Tests: `ui/event_bb_citations.test.ts` (new), `ui/player_visible_event_text_clean.test.ts`, `sensitive_history_player_choice_content.test.ts`, `ui/codex_essay_localization.test.ts`. Docs: this README and `docs/ledger/fragments/2026-11-16-bb-citation-audit.md`.
