# Citation sweep: Karadžić §§4940-4982, §§4985-5020, §§4985-5067, §§5020-5067, §§5025-5040

Hidden event notes cited these ranges of the Karadžić Trial Judgment (IT-95-5/18-T, 24 March 2016) for the Deliberate Force compliance decision, a "Holbrooke-Belgrade channel", the Patriarch Paper and an RS "ratification". The historian seat read the judgment text: those paragraphs are the Srebrenica 1993 Morillon convoy and Resolution 819 (§§4960-4982), UN convoys then Srebrenica up to DutchBat (§§4985-5020) and the fall of Srebrenica, 6-12 July 1995 (§§5020-5067). The words "Holbrooke" and "Patriarch" do not occur in 4940-5067. The passages that do exist:

| Paragraphs | What they record |
| --- | --- |
| 422-430 ("Initiative by the USA") | 21 Aug meeting; 28 Aug Assembly resolution welcoming the US initiative; 29 Aug Dobanovci agreement (para 424); 30 Aug NATO strikes; 1 Sep pause; 2 Sep Mladić concessions; 6-8 Oct meetings; cease-fire accepted 11 Oct |
| 431-437 | Karadžić's authorisation of the delegation (29 Oct); the Dayton talks; 21 Nov initialling by Tuđman, Milošević and Izetbegović; the RS delegation's absence and objections; the signed statement that the RS leadership accepted the agreement; the London talks; the Paris signing |
| 3614, 4884 | Sarajevo siege Aug-Oct 1995; the 14 Sep framework agreed by Karadžić and Holbrooke (Karadžić dealt with Holbrooke directly) |
| 4297-4301, 4338-4340 | Markale II (28 Aug 1995) and the NATO campaign |

The judgment has no passage on a "Holbrooke-Belgrade channel", on an RS Assembly vote on Dayton, or on the "Patriarch Paper" by name.

## What changed (hidden text only)

| File | Events | Change |
| --- | --- | --- |
| `data/scenarios/events/war_1992.json` | `rs_strategic_goals` (option `future_consequences` explanations; 10 mentions across the three platform options) | §§4940-4982 mapped to paras 423, 425-428, 3614, 4297-4301, 4338-4340, 4884 (events only; the causal link is marked design inference); §§4985-5020 and the "Holbrooke-Belgrade channel" claim marked "paragraph not verified", with the Patriarch Paper delegation mapped to paras 424 and 431; §§5020-5067 mapped to paras 424, 431 and 435-436, with "no Assembly ratification vote" and the unsupported "eastern-enclave" and "Federation offensive halted only by the Holbrooke line" claims noted; Mladić §§4631-4685 and §§4750-4795 and Milošević §§245-298 marked "paragraph not verified" |
| `data/scenarios/events/war_1995.json` | `holbrooke_us_belgrade_channel_1995`, `deliberate_force_rs_compliance_1995`, `dayton_talks_begin_1995` (hidden `historical_source` and `source_note`) | same mappings; the non-existent "BB Vol. II Ch. 15" replaced by BB Vol. I ch. 94 p. 391; Milošević IT-02-54-T marked unverified (no trial judgment exists, only the 16 June 2004 Rule 98 bis decision); `dayton_talks_begin_1995` no longer says Milošević initialled "for the Bosnian Serbs" |
| `tests/ui/event_karadzic_citation_ranges.test.ts` | | new: no event text cites a swept range without saying it is the earlier, wrong cite; every Mladić and Milošević range that could not be checked is marked "paragraph not verified" |

`rs_dayton_acceptance_1995` and `rbih_late_war_offensive_1995` were corrected in #669 and #663.

## Exhaustive list: tracked files that contain a swept range

Run over all 12,187 tracked files (`git grep`, no truncation):

| File | Mentions | Disposition |
| --- | --- | --- |
| `data/scenarios/events/war_1992.json` | 10 | edited; every mention now records the correction (test) |
| `data/scenarios/events/war_1995.json` | 6 | edited; same |
| `tests/ui/event_karadzic_citation_ranges.test.ts` | 1 | the test's own description of the ranges |
| `tests/ui/patriarch_paper_date.test.ts` | 1 | an assertion that the old range is gone |
| `docs/40_reports/evidence/20261115_counterfactual_default_label/README.md` | 1 | records the earlier correction (history) |
| `docs/PROJECT_LEDGER_ARCHIVE_2026Q2.md` | 8 | ledger archive, a historical record; not edited |
| `docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/initial-autosave.json` | 12 | playtest evidence save (frozen state); not edited |

## Headless artifacts

Two 188-week headless runs (clean tree at the #662 tip vs this branch): final state hash `e44c77f5b41052f8` in both; 14 of 15 artifacts byte-identical; `run_meta.json` differs only in the output-directory suffix, `git_commit` and the input digests of the edited event files. Raw numbers only.

## Found, not changed (same bad-range class, beyond the ranges asked for)

- Karadžić §§4263-4310 (attached to "Belgrade's August 1994 embargo") is Markale II of 28 August 1995; §§3471-3475 (attached to Vance-Owen) is SDS ideology and impunity; §§5810-5876 (attached to Count 11, 377 UN peacekeepers) opens with Srebrenica. They recur across many `rs_strategic_goals` and neighbouring explanations (dozens of mentions).
- "BB Vol. II Ch. 13 / 14 / 15" remains at eight places in `war_1995.json` (lines ~98, 856, 911, 1221, 2074, 2138, 2315): BB Vol. II is annexes and has no 1995 content (Operation Storm and Sana are in Vol. I ch. 89 and 91).
- Mladić IT-09-92-T and Milošević IT-02-54-T ranges are marked unverified, not corrected: the texts were not available to the historian.
