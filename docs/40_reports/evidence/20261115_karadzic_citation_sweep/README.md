# Citation sweep: Karadžić §§4940-4982, §§4985-5020, §§4985-5067, §§5020-5067, §§5025-5040

Event notes cited these ranges of the Karadžić Trial Judgment (IT-95-5/18-T, 24 March 2016) for the Deliberate Force compliance decision, a "Holbrooke-Belgrade channel", the Patriarch Paper and an RS "ratification". The historian seat read the judgment text: those paragraphs are the Srebrenica 1993 Morillon convoy and Resolution 819 (§§4960-4982), UN convoys then Srebrenica up to DutchBat (§§4985-5020) and the fall of Srebrenica, 6-12 July 1995 (§§5020-5067). The words "Holbrooke" and "Patriarch" do not occur in 4940-5067. The passages that do exist:

| Paragraphs | What they record |
| --- | --- |
| 422-430 ("Initiative by the USA") | 21 Aug meeting; 28 Aug Assembly resolution welcoming the US initiative; 29 Aug Dobanovci agreement (para 424); 30 Aug NATO strikes; 1 Sep pause; 2 Sep Mladić concessions; 6-8 Oct meetings; cease-fire accepted 11 Oct |
| 431-437 | Karadžić's authorisation of the delegation (29 Oct); the Dayton talks; 21 Nov initialling by Tuđman, Milošević and Izetbegović; the RS delegation's absence and objections; the signed statement that the RS leadership accepted the agreement; the London talks; the Paris signing |
| 3614, 4884 | Sarajevo siege Aug-Oct 1995; the 14 Sep framework agreed by Karadžić and Holbrooke (Karadžić dealt with Holbrooke directly) |
| 4297-4301, 4338-4340 | Markale II (28 Aug 1995) and the NATO campaign |

The judgment has no passage on a "Holbrooke-Belgrade channel", on an RS Assembly vote on Dayton, or on the "Patriarch Paper" by name.

## This change is hidden text only

A player can see two kinds of event text that carry these citations: a consequence `explanation` that passes the developer-text filter (it appears as the predicted explanation in the turn-aftermath record), and the one field `resolveEventSourceLine` picks as an event's source line. Everything else is hidden. A check run during this work (`tests/ui/event_karadzic_citation_ranges.test.ts` now pins it) found that annotating the visible strings with audit notes would have put "historian check ... paragraph not verified" in front of players, so **no visible string is changed here**. The annotations are applied to hidden strings only.

| File | Hidden strings annotated | Change |
| --- | --- | --- |
| `data/scenarios/events/war_1992.json` | `rs_strategic_goals` option explanations that carry a snake_case id (so the filter hides them) | the swept ranges mapped to paras 423, 425-428, 3614, 4297-4301, 4338-4340, 4884 (events only; causal links marked design inference), paras 424, 431 and 435-436, or marked "paragraph not verified"; Mladić §§4631-4685 and §§4750-4795 and Milošević §§245-298 marked "paragraph not verified" |
| `data/scenarios/events/war_1995.json` | `holbrooke_us_belgrade_channel_1995` and `deliberate_force_rs_compliance_1995` `historical_source`; `dayton_talks_begin_1995` `source_note` | same mappings; the non-existent "BB Vol. II Ch. 15" replaced by BB Vol. I ch. 94 p. 391; Milošević IT-02-54-T marked unverified (no trial judgment exists, only the 16 June 2004 Rule 98 bis decision); `dayton_talks_begin_1995` no longer says Milošević initialled "for the Bosnian Serbs" |
| `tests/ui/event_karadzic_citation_ranges.test.ts` | | hidden text: no swept range stands as live support and every unchecked Mladić or Milošević range is marked; player-visible text: never annotated, and the strings that still cite a swept range are exactly a known list that may only shrink |

`rs_dayton_acceptance_1995` and `rbih_late_war_offensive_1995` were corrected in #669 and #663.

## Player-visible strings that still cite a swept range (not changed here)

These need the historian and narrative seats and are the next change: `dayton_talks_begin_1995` `historical_source` (it is the Dayton talks card's visible source line) and eleven `rs_strategic_goals` explanations (`ro0.fc10, fc11, fc13; ro1.fc0, fc9, fc10, fc12; ro2.fc0, fc9, fc10, fc12`). Several of the claims beside them are contradicted by the judgment (para 4884: Karadžić dealt with Holbrooke directly, so "Holbrooke bypasses Pale" is wrong; no Assembly ratification vote exists), so they are player-visible truth issues, not citation tidying.

## Exhaustive list: tracked files that contain a swept range

Run over all 12,187 tracked files (`git grep`, no truncation):

| File | Mentions | Disposition |
| --- | --- | --- |
| `data/scenarios/events/war_1992.json` | 10 | hidden ones edited; visible ones listed above |
| `data/scenarios/events/war_1995.json` | 6 | hidden ones edited; one visible (listed above) |
| `tests/ui/event_karadzic_citation_ranges.test.ts` | 1 | the test's own description of the ranges |
| `tests/ui/patriarch_paper_date.test.ts` | 1 | an assertion that the old range is gone |
| `docs/40_reports/evidence/20261115_counterfactual_default_label/README.md` | 1 | records the earlier correction (history) |
| `docs/PROJECT_LEDGER_ARCHIVE_2026Q2.md` | 8 | ledger archive, a historical record; not edited |
| `docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/initial-autosave.json` | 12 | playtest evidence save (frozen state); not edited |

## Correction to an earlier statement

An earlier version of this sweep said BB Vol. II "has no 1995 content". That was too strong. Vol. II is annexes and addenda, not chapters, so "Vol. II Ch. 15" does not exist, but it does carry 1995 material: Addendum 2 (the 1995 chapters of Vol. I), Addendum 3 (Sekulić corrections to Vol. I ch. 77, 88 and 89: Bljesak, the July 1995 Bihać offensive and Oluja) and Annex 64 "UNPROFOR in 1995". The hidden note now says so.

## Headless artifacts

Two 188-week headless runs (clean tree at the #662 tip vs the first version of this branch): final state hash `e44c77f5b41052f8` in both; 14 of 15 artifacts byte-identical; `run_meta.json` differs only in the output-directory suffix, `git_commit` and the input digests of the edited event files. The final version of this branch only reverts text to its main version, so it cannot move an artifact. Raw numbers only.

## Found, not changed (same bad-range class)

Karadžić §§4263-4310 (Markale II, not the 1994 embargo), §§3471-3475 (SDS ideology, not Vance-Owen), §§5810-5876 (opens with Srebrenica; Count 11 is §§5852-5993) and "BB Vol. II Ch. 11-15": swept in the next change.
