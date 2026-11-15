# Citation sweep 2: Karadžić §§4263-4310, §§3471-3475, §§5810-5876 (and §§3526-3530), and "BB Vol. II Ch. N"

Hidden event text only. No player-visible string, trigger, option, effect or calibration value changes. 28 strings in four event files change (list below); a 188-week headless run is identical to a clean-tree run except `run_meta.json`.

## What the historian seat found

| Cited as | What it is | Used in events for |
| --- | --- | --- |
| Karadžić IT-95-5/18-T §§4263-4310 (also "Vol. III §§4263-4310", §§4280-4310) | Markale II witness evidence, 28 Aug 1995 | the August 1994 Contact Group rejection, the autumn 1993 Owen-Stoltenberg outcome, the September 1993 Bosniak Assembly rejection, Pale-Belgrade friction in 1993-94, a Bosniak "maximalist claim" posture |
| §§3471-3475 | SDS ideology and impunity | the Vance-Owen plan and the "ten-province" scheme |
| §§3526-3530 | opens the Sarajevo section | the Vance-Owen Assembly session; the "Federation constitutional architecture" |
| §§5810-5876 | opens with Srebrenica; Count 11 (UN personnel) is §§5852-5993 | the May 1995 UN peacekeepers hostage crisis |
| "BB Vol. II Ch. 11 / 12 / 13 / 14 / 15-16" | does not exist: BB Vol. II is annexes and addenda, not chapters | Sana, Mistral 2, the Rapid Reaction Force, Summer 95, the HV-HVO channel, the US halting the Federation advance |

Paragraphs and pages that do support the claims, and now stand where the old ones were:

| Claim | Where it is |
| --- | --- |
| Contact Group plan and its rejection | Karadžić paras 396-401 (rejected 21 July 1994, referendum 27 Aug 1994: paras 399, 401) |
| Drina blockade | para 3295 (and paras 3283-3295 for Belgrade-Pale relations) |
| Owen-Stoltenberg plan, Sarajevo | paras 377-383 (para 381: Sarajevo left undivided and UN-administered for two years; para 382: end-September 1993 rejection by the Muslim side) |
| Vance-Owen plan; the Assembly session | paras 359-375 (372 and 375: 5-6 May 1993 session, 15-16 May referendum); Six Goals para 57 |
| UN personnel detained, May 1995 | Count 11 paras 5852-5993 (para 5863: approximately 347 detained by 29 May; n.20390 "more than 300") |
| BB Vol. II material | Annex 58 pp. 507-511 (Mostar), Annex 61 pp. 534-535 (Bihać), Annex 64 pp. 563-569 (UNPROFOR 1995), Addendum 3 pp. 11-13 |
| 1995 operations | BB Vol. I ch. 62 pp. 242-243, ch. 76 pp. 296-298, pp. 364-366, 369-370, 374 (Ljeto 95), ch. 89 pp. 367-376, ch. 91 (Maestral) pp. 379-381, ch. 92-93 pp. 384-391, ch. 94 pp. 391-392 |

## Claims the source CONTRADICTS (player-visible truth issues)

These are carried by strings a player can see, so they are not reworded here (they need the historian and narrative seats; next change). The hidden copies of the same claims now say so.

1. A 3 August 1994 RS Assembly session at Bijeljina rejecting the Contact Group plan: the judgment gives 21 July 1994 and the 27 August referendum, no Bijeljina session.
2. "Flexibility on the Sarajevo allocation" in Owen-Stoltenberg: the plan left Sarajevo undivided and UN-administered (para 381).
3. "377 UN peacekeepers" and "more than 30 facilities": the judgment has about 347 by 29 May (para 5863), "more than 300" (n.20390) and neither figure.
4. Belgrade restraining Pale in 1993: paras 3286-3287 show Belgrade supporting Pale in 1993.
5. "Holbrooke bypasses Pale" and an RS Assembly "ratification vote" on Dayton (sweep 1; para 4884, paras 431-437).
6. The "ten-province" label for Vance-Owen is only a gloss at n.1166.

Not verified (marked "paragraph not verified" in the hidden text): Krajišnik IT-00-39-T §§1006-1040; Mladić IT-09-92-T Count 6 §§5169-5215; the 20% figure behind "BB Vol. II Ch. 15-16"; the Igman deployment page; the BB Vol. I chronology page for Annex 61; the Šušak-Tudjman-Boban-successor channel; a Bosniak "maximalist claim" posture (a judgment on the Bosnian Serb leadership does not address it); the 20 and 29 September Presidency and Assembly sequence; the "Federation constitutional architecture" claim.

## Not changed because the event is pinned

`rbih_state_identity` is pinned by a reviewed-contract hash (`REVIEWED_IDENTITY_FNV64`, `src/sim/events/opening_policy_transition.ts`): editing any string of it, hidden text included, throws "Reviewed contract changed for rbih_state_identity" and fails `tests/pre_first_advance_paramilitary_policy.test.ts` and `tests/browser_campaign_start_fallback.test.ts` (24 tests; found by running the event-related set). A UI lane makes no sim change, so its four hidden strings keep the old cites until the contract owner re-pins the hash. `tests/ui/event_citation_sweep2.test.ts` lists the event as an explicit exemption.

## Files changed (exhaustive)

| File | Strings changed | Which |
| --- | --- | --- |
| `data/scenarios/events/war_1992.json` | 14 | `rs_strategic_goals` hidden explanations ro0.fc1, fc2, fc5, fc6, fc7; ro1.fc1, fc4, fc5, fc6; ro2.fc1, fc4, fc5, fc6; `hrhb_political_goal` ro0.fc1 |
| `data/scenarios/events/war_1993.json` | 4 | `source_note` of `rs_owen_stoltenberg_response_1993`, `rs_belgrade_pressure_response_1993`, `rbih_reintegration_offers_1993`, `rs_autonomy_path_decision_1993` |
| `data/scenarios/events/war_1994.json` | 3 | `rs_contact_group_response_1994` `source_note`; `operation_cincar_1994`, `carter_ceasefire_1994` `historical_source` |
| `data/scenarios/events/war_1995.json` | 7 | `historical_source` of `operation_flash_1995`, `rapid_reaction_force_1995`, `operation_summer_95`, `operation_mistral_2_1995`, `operation_sana_1995`, `us_halts_federation_advance_1995`; `source_note` of `hv_hvo_cooperation_1995` |
| `tests/ui/event_citation_sweep2.test.ts` | new | hidden text: no swept cite stands as live support; player-visible text: never annotated, and the visible strings that still carry a swept cite are a known list (33) that may only shrink; the pinned event is the only exemption |
| `docs/40_reports/evidence/20261115_citation_sweep2/README.md`, `docs/ledger/fragments/2026-11-15-citation-sweep2.md` | new | this record |

## Exhaustive list: tracked files that still contain a swept pattern (`git grep -c`, no truncation)

`data/scenarios/events/war_1992.json` 41, `war_1993.json` 11, `war_1994.json` 5, `war_1995.json` 9 (what remains is the correction notes themselves, the 33 player-visible strings of the known list, and the four pinned hidden strings of `rbih_state_identity`); `docs/40_reports/EVENTS_1994_1995_RESEARCH.md` 20, `docs/40_reports/research/20260527_EVENT_FAMILY_B4.md` 4, `..._X3.md` 4, `..._X8.md` 6 (research notes that carry the old cites; historical record, not edited, but they are where the wrong ranges came from); `docs/PROJECT_LEDGER_ARCHIVE_2026Q2.md` 30 (archive); `docs/40_reports/playtests/evidence/20260730_session15_hrhb_80turn/autosaves/initial-autosave.json` 4 and `20260731_session16_rs_104week_player/autosaves/initial-autosave.json` 27 (frozen playtest saves); `docs/40_reports/evidence/20261115_karadzic_citation_sweep/README.md` 2 and its ledger fragment 1 (sweep 1's description of these ranges).

## Headless artifacts

Two 188-week runs, a clean tree at the #662 tip versus this branch: final state hash `e44c77f5b41052f8` in both; 14 of 15 artifacts byte-identical; `run_meta.json` differs only in the output-dir suffix, `git_commit` and the input digests of the edited event files.
