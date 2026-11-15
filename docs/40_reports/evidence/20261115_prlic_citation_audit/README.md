# Citation audit, batch 1: ICTY Prlić et al. (IT-04-74) paragraph ranges

The whole batch was checked, not a sample. The historian seat read all six volumes of the Trial Judgement (29 May 2013, official ICTY PDFs) and the Appeals Judgement (29 November 2017, scanned; paragraph numbers checked by hand). Full per-group table: the historian's report (kept in the session notes folder; its group-by-group verdicts are summarised here).

## Result

| | Groups (41) | Mentions (164) |
| --- | --- | --- |
| Supported | 2 (Vol. 4 §§44-67 and the same range in a retracted note) | 2 (1.2%) |
| Supported in part | 9 | 46 (28.0%), overstated: most uses of the "partly" ranges are wrong too |
| Wrong (the range is about something else) | 28 | 112 (68.3%) |
| Not a paragraph citation (the repo's own "§3.6") | 2 | 4 (2.4%) |
| Not verified | 0 | 0 |

The wrong ranges are templated across unrelated claims. Vol. 3 §§120-200 is the Dretelj and Gabela prisons, Vol. 3 §§412-498 is Vareš and Stupni Do, Vol. 1 §§357-422 is expert-evidence rules and the 1990-91 background, Vol. 1 §§591-640 is SIS, Health, Prisons Commission, ODPR and Finance, Vol. 2 §§556-590 and §§600-680 are Jablanica detention and the start of Mostar, and "Vol. 3 §§1700-2050" does not exist (Vol. 3 ends at §1741). All were cited for Zagreb-Boban diplomacy (the Vance-Owen plan, the Washington Agreement, the Contact Group). The judgment's own material on that is Vol. 1 §§441-490, Vol. 3 §§545-567 and Vol. 4 §§5-24 and §§518-519. The terms "airbridge", "Granić-Šušak channel" and "scope-restraint memoranda" do not occur in Vols. 1-4.

## Claims the judgment contradicts

1. "Boban signed the agreed text at Athens on 25 March 1993": Athens was 2 May 1993 and Karadžić signed (Vol. 1 §474); the 25 March signature is by "Croatian and Muslim representatives" (§467).
2. "Boban signed for HZ HB on 20 September 1993" (Owen-Stoltenberg): the Chamber says Izetbegović, Boban and Karadžić "reached a constitutional agreement" (§485).
3. "The Prlić Appeals Chamber REVERSED the finding that Tudjman, Šušak and Bobetko were JCE members" (a hidden note in `war_1992_hrhb_summer.json`, a claim about a conviction): not so. The Appeals Chamber left the finding in place and held the details of their membership unnecessary to any conviction (Appeals §§1521, 1751-1752, 1910-1911). The quotation the note carried is not in the Appeals text (OCR; the historian could not rule out a passage missed). Rewritten in this change. `docs/50_research/icty_hrhb_political_goal.md:55` carries the same unverified quotation and is not edited here.
4. 1995 events (Mistral 2, Dayton, HR H-B dissolution, the HV-HVO joint command) are outside the indictment period (1991 to April 1994), so no Prlić paragraph can support them.

## This change: hidden text only

28 strings that a player cannot see now carry, after each Prlić range, what those paragraphs actually are and where the claim is documented, or "paragraph not verified for this claim". The one claim about a conviction is rewritten to what the judgment says. A string is hidden when it is not a consequence explanation that passes the developer-text filter and not the field `resolveEventSourceLine` shows as the event's source line. Player-visible strings are not touched (40 of them carry a Prlić range, with 51 mentions, mostly `hrhb_political_goal` explanations and HRHB event source lines; they are HVO ground and go through the historian, narrative and, where a §6 surface is touched, §6 seats; the rule for them is: never show a paragraph range that is not verified, fall back to "ICTY, Prlić et al., trial judgment"). `tests/ui/event_prlic_citation_ranges.test.ts` pins both rules and keeps the visible list as an allowlist that may only shrink.

`rbih_state_identity` is pinned by a reviewed-contract hash; its three hidden Prlić notes are fixed with the re-pin in the visible-strings change.

## Files changed (exhaustive)

| File | Strings changed |
| --- | --- |
| `data/scenarios/events/war_1992.json` | 14: `hrhb_political_goal` `historical_source` and explanations ro0.fc1, fc5, fc7, fc8; ro1.fc0, fc3, fc4, fc5, fc7; ro2.fc0, fc4, fc7; `hrhb_1992_graz_cooperation_collapse` `historical_source` |
| `data/scenarios/events/war_1992_hrhb_summer.json` | 2: `hrhb_herceg_bosna_consolidation_1992` `source_note` (the Appeals sentence rewritten; the Prlić ranges corrected) and the explanation ro0.fc0 |
| `data/scenarios/events/war_1993.json` | 7: `source_note` of `hrhb_vance_owen_acceptance_1993`, `hrhb_central_bosnia_defense_1993`, `hrhb_territorial_scope_1993`, `hrhb_owen_stoltenberg_response_1993`, `hrhb_camp_exposure_response_1993`, `hrhb_federation_overture_1993`; `historical_source` of `gornji_vakuf_clashes_1993` |
| `data/scenarios/events/war_1994.json` | 4: `zagreb_orders_hrhb_ceasefire` `historical_source`; `source_note` of `hrhb_washington_agreement_1994`, `hrhb_contact_group_response_1994`, `hrhb_federation_army_integration_1994` |
| `data/scenarios/events/war_1995.json` | 1: `hrhb_dayton_acceptance_1995` `historical_source` |
| `tests/ui/event_prlic_citation_ranges.test.ts` | new |
| this README and `docs/ledger/fragments/2026-11-15-prlic-citation-audit.md` | new |

## Headless artifacts

188-week run on this branch against the clean-tree baseline: see the PR description for the comparison (final state hash and 15-artifact byte comparison).

## Next batches

Karadžić IT-95-5/18-T (87 mentions), Mladić IT-09-92-T (26), BB page references (144), BB chapter references (108); ICTY cases other than Prlić and Karadžić (Blaškić, Kordić and Čerkez, Naletilić and Martinović, Krajišnik) appear in the same strings and are in the later batches. Prevention: a verified-citations registry that CI checks every new range against (proposed, not in this change).
