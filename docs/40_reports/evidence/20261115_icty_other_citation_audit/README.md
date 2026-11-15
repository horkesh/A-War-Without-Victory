# Citation audit, batch 2: the other ICTY, ICJ and UN paragraph ranges

The historian read every text for the whole batch (48 range groups, 181 mentions): Karadžić (remaining ranges), Mladić IT-09-92-T, the Milošević IT-02-54 Rule 98bis Decision, Krajišnik, Kordić and Čerkez, Blaškić, Stakić, Krstić, Brđanin, Tadić, Naletilić and Martinović, Halilović, the ICJ judgment (PCA-hosted copy; icj-cij.org returns 403 to automated clients) and UN A/54/549.

## Result

| | Mentions (181) |
| --- | --- |
| Already known wrong from sweeps 1-2 (Karadžić §§4263-4310 etc.) | 71 (39.2%) |
| Not citations (the repo's own Design Gate §1/§3 numbers; two mis-parsed correction notes) | 18 (9.9%) |
| **Newly checked: 92** | |
| Supported | 9 (9.8% of checked; 5.0% of all) |
| Supported in part (range over-broad, or context only) | 35 (38.0%) |
| **Wrong** | **48 (52.2% of checked)** |
| Not verified | 0 |

Only 9 mentions of the 181 are clean as written; 44 more are usable once narrowed.

## Findings

- Mladić §§5169-5215 is cumulative convictions and sentencing, not hostages. Hostage-taking is **Count 11**, not Count 6, and both judgments give **about 347** UN personnel held, not 377 (Mladić ¶2218; Karadžić ¶5863).
- Karadžić §§5648-5703 (cited for the August 1995 dismissal of Mladić) is Srebrenica legal findings. The dismissal is Karadžić ¶¶3135-3139, and the rescission is dated **27 August 1995** (¶3138), not 11 August. A/54/549 ¶¶270-280 is 9-10 July; the dismissal is A/54/549 ¶432.
- Mladić §§4631-4685 is mens rea, not Markale II (Mladić Vol. II ¶¶2120-2151); §§4750-4795 has nothing on Annex 1-A.
- Krajišnik §§1006-1040 is 1992 knowledge material; the judgment ends 30 December 1992, so it cannot carry a 1993-94 claim.
- Milošević IT-02-54-T has only the 16 June 2004 Rule 98bis Decision (he died in 2006): its ¶283 (Dayton) is evidence at a "could be satisfied" standard, not a finding, and "§§290-340" runs past its last paragraph (¶330). The "Patriarch Paper" appears in none of the ICTY texts; the facts are Karadžić ¶424 (29 August 1995) and ¶431 (29 October 1995).
- Kordić §§465-650 and Blaškić §§99-220 do not carry the Operative Zone Central Bosnia structure, a Tuđman-Šušak airbridge (Šušak is absent from Kordić) or 1993 operations.
- Stakić §§88-168 covers Keraterm (¶¶160-166) but not Trnopolje (¶¶185-195); §§220-300 is killings and destruction, not press or ICRC access. Naletilić §§361-422 is torture findings; the Heliodrom findings are ¶¶429-438. Karadžić §§3289-3340 is Milošević's influence on Pale, not a Trnopolje VIP-visit pattern. Brđanin §§540-558 is the law of deportation, not the creation of the Autonomous Region of Krajina.
- ICJ ¶¶278-297 is Srebrenica only; Dayton is not in it. Halilović is a 1993 acquittal and cannot support late-war doctrine or Operation Sana claims (topical cites, no paragraphs; queued).
- Krstić §§16-28 (Srebrenica 1993-95) and Tadić §§154-237 (the camp findings are ¶¶154-178) hold.

## This change

**Hidden text (27 strings)**: each unmarked range now says what the paragraphs are and the correct cite ("the earlier cite ..."), and the earlier "paragraph not verified" markers for Mladić and Milošević ranges are replaced by the verified correction. **Player-visible text (6 source lines)**: the unverified ranges are removed and the source name kept (Stakić, Brđanin, Karadžić §§3289-3340 and §§3473-3475 on the camp and Prijedor events); `karadzic_mladic_split_1995` also gets the right paragraphs and the right date: "paras 3135-3139 (dismissal attempt, officer revolt, 27 Aug 1995 rescission)" (the judgment gives 27 August; the line said 11 August). `srebrenica_demilitarization_1993` now cites A/54/549 paras 59-65 and 69 and Krstić paras 19-25, the paragraphs that carry the claim (a second historian check: the old A/54/549 §§57-98 is mostly Security Council politics; Krstić §§16-28 is too broad). Tadić §§154-237 and Mladić §§4762-4778 (context for command continuity), A/54/549 §§270-280 (topical) and Stakić §§88-168 on the Keraterm line stay: verified.

**Not changed because the event is pinned by a reviewed-contract hash**: `rbih_state_identity` (3 visible explanations still cite A/54/549 §§57-98 and Krstić §§16-28, imprecise rather than false) and `rbih_paramilitary_policy_1992` (hidden notes cite UN A/54/549 §35, which is the Srebrenica enclave before the safe areas, not the ARBiH chain of command). Both are fixed with their next seat-reviewed re-pin; `tests/ui/event_icty_other_citation_ranges.test.ts` lists the three visible strings as an allowlist that may only shrink.

## Files changed

`data/scenarios/events/war_1992.json` (20 strings), `war_1993.json` (8), `war_1995.json` (5); `tests/ui/event_icty_other_citation_ranges.test.ts` (new), `tests/ui/event_karadzic_citation_ranges.test.ts` (the "not verified" rule also accepts the verified correction); this README and `docs/ledger/fragments/2026-11-15-icty-other-citation-audit.md`. Strings changed: `rs_strategic_goals` (10 hidden), `hrhb_political_goal` (4 hidden), `hrhb_1992_graz_cooperation_collapse`, `gornji_vakuf_clashes_1993`, `hrhb_territorial_scope_1993`, `hrhb_camp_exposure_response_1993`, `rs_assembly_rejects_voplan_1993`, `rs_owen_stoltenberg_response_1993`, `rs_belgrade_pressure_response_1993`, `rs_autonomy_path_decision_1993`, `holbrooke_us_belgrade_channel_1995`, `deliberate_force_rs_compliance_1995`, `rs_dayton_acceptance_1995`, `karadzic_mladic_split_1995` (hidden note and visible line) and the visible lines of `omarska_camp_1992`, `trnopolje_camp_1992`, `prijedor_takeover_1992`, `concentration_camps_revealed_1992` (hidden note and visible line) and `srebrenica_demilitarization_1993`.

## Headless artifacts

188-week run against a clean `origin/main` run at the same commit: see the PR description.
