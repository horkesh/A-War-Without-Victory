# Player-visible truth fixes after the citation audit (PR-B)

Sweeps 1 and 2 and Prlić batch 1 (#671, #674, #676) fixed the hidden provenance text. This change fixes what a player can read: wrong citations, claims the judgments contradict, two older leaks of developer text, the Dayton essay's territory figure, and the identity card's reviewed contract.

## What changed, by kind

| Kind | Strings | Seats |
| --- | --- | --- |
| **Content fix**: citations corrected and contradicted claims removed (32 non-sensitive visible strings in `rs_strategic_goals` (17), `rs_assembly_rejects_voplan_1993`, the 1993-94 RS/RBiH response events, `dayton_talks_begin_1995`, and 6 in `rbih_state_identity`) | 32 | historian (all 43 rewritten; paragraphs read in the judgments) + narrative designer (19 wording edits, no facts changed) |
| **Range-strip only**: the unverified paragraph range is dropped and the source name kept; the claim wording is NOT changed (47 strings: 11 sensitive `rs_strategic_goals`/`hrhb_political_goal`/`hrhb_owen_stoltenberg_response_1993`/`un_hostage_crisis_1995` strings, plus 36 visible HVO/Prlić strings: `hrhb_political_goal` explanations and HRHB event source lines) | 47 | historian + narrative suffice: this is not a claim change |
| **Developer text removed** from two visible HVO source lines (a `[UNVERIFIED, no local copy]` tag; a design-consult paragraph with a date and an issue number) | 2 | the same |
| **Older leaks on main fixed**: `csq_alliance_holds_past_w35` (said "the date the historians had circled" and gave week 35 as April 1993; week 35 is early December 1992) and `embargo_croatia_transit_1992` (source line "BB1 p.167; 2026-05-17 Historian audit H4."; p.167 is the extraction file number, the printed pages are 131 and 142) | 2 events | historian + narrative |
| **Essay**: `rs_dayton_acceptance_1995` (file and index): "roughly two-thirds ... at their peak" becomes "more than 70 percent of the country that Yugoslav officials said the Bosnian Serbs held in November 1994" (Karadžić trial judgment para 3294) | 2 | historian + narrative |
| **Reviewed contract**: `rbih_state_identity` (13 strings: 6 visible wording and citation fixes, 7 hidden notes) and the pin re-set | 13 | historian + narrative + canon-compliance on the whole event |

The 6 hostage, siege and Markale strings and the HRHB content corrections that need more than a range-strip (a "joint command" claim with no checked source, the Prlić claims about Zagreb directives that the judgment does not contain) are NOT corrected here: they go to the §6 change with the §6 seats. Their wrong paragraph ranges no longer show.

## Claims the sources contradict (removed or corrected in the 32 content-fix strings)

- A 3 August 1994 Bijeljina session rejecting the Contact Group plan: rejected 21 July 1994 and by referendum on 27 August 1994 (Karadžić paras 399, 401).
- Owen-Stoltenberg "retaining the Sarajevo division": Sarajevo was left undivided and UN-administered (para 381).
- "377 UN peacekeepers" and "more than 30 facilities": about 347 UN personnel by 29 May 1995 (para 5863).
- "Holbrooke bypasses Pale": Karadžić met Holbrooke directly on 14 September 1995 (paras 3614, 4884).
- An RS Assembly ratification vote on Dayton: none in the judgment; the delegation members and Karadžić signed a statement of acceptance (para 436).
- Belgrade restraining Pale in 1993: the judgment shows Belgrade supporting Pale (paras 3286-3287).
- Deliberate Force "30 August to 14 September": it began on 30 August (para 4300); 14 September is the suspension tied to the Holbrooke agreement.
- Markale II paragraphs (4263-4310) cited for the 1994 embargo, Owen-Stoltenberg and Pale-Belgrade friction.

## Canon-compliance verdict and the pin

The canon seat reviewed `rbih_state_identity` as it stands: exactly 13 `explanation` strings differ from main and nothing structural (trigger, responding faction, option ids and order, effects, flags, dimension shifts, defaults, notifications, localizations structure). Re-pinned in `src/sim/events/opening_policy_transition.ts`: length 69579 to **70817**, FNV-1a 64 `6d447e72f84a687d` to **`a5cda75445f4eff3`**. The seat found three things beyond citations:
- **F1** (invented mechanic): option 1's Contact Group line said rejecting the plan "would cost more international standing here than on any other path"; the engine has no identity-conditioned penalty. Changed to the reviewed wording used on the sibling option ("would still cost Sarajevo international standing and the goodwill of the Contact Group states").
- **F2** (save compatibility): see the next section.
- **F3** (not changed, follow-up): the Owen-Stoltenberg option label says "Assembly-rejection path" but the event it opens is a player Accept or Resist decision.

## F2: a pending identity card saved before a wording change

Reproduced. A pending decision copies the event's display text into the save when it fires, and `requireIdentityLane` compared the whole saved decision with a freshly built one, so any wording change made an unanswered identity card throw "RBiH identity decision is stale, forged, or already completed". The card fires at campaign birth, so any save made before it is answered is affected. `tests/identity_pending_text_drift.test.ts` builds such a save (all display fields, option labels and explanations altered) and fails on the old comparison with exactly that error.

Fix (`src/sim/events/opening_policy_transition.ts`): the decision is judged on its structure, with the player-facing wording removed from both sides (`withoutDisplayText`): event id, turn, faction, option ids, effects, flags, dimension shifts, defaults and consequence structure must match the reviewed definition; titles, narrative, source lines, option labels and descriptions, consequence explanations and notification text may differ. The reviewed-contract hash still pins the catalog definition, wording included. The paramilitary-policy decision keeps its strict comparison: its existing tests pin forged notifications and a forged descriptive source as refused, and its text is unchanged here. The test also shows forged option ids, effects, dimension shifts, flags, fire turn, faction and default response are still refused, as is answering twice.

## Permanent guard

`tests/ui/player_visible_event_text_clean.test.ts`: no audit, sign-off or lane vocabulary (historian check or audit, "not verified", "the earlier cite", lane ids, ISO audit dates, UNVERIFIED) may appear in any player-visible event string: title, narrative, situation, staff assessment, trigger evidence, option labels and descriptions, notifications, every localization, the picked source line (en and bcs) and every consequence explanation that passes the developer-text filter. It scans every event file. Its known-leak list is empty. The sweep tests' allowlists of visible strings with swept citations are now empty too.

## Verification

- 188-week headless run on this branch against a clean `origin/main` run (same commit, `4d876050e`): final state hash `19262a0b19df1567` in both; 14 of 15 artifacts byte-identical; `run_meta.json` differs in digests only. (Main's hash moved from `e44c77f5b41052f8` in earlier checks because other changes merged; it is the same on both sides here.)
- A 7-week run of the identity decision shows no event text in any artifact (canon seat); the 188-week artifacts do not include these strings.
- `tsc` clean; the 145-file event/essay/codex set plus the new tests green.

## Found, not changed

- `os_rbih_tactical_acceptance_1993`: option label "Assembly rejects outright (Drina enclaves & Posavina non-negotiable)" carries unsupported reasons (BB records a conditional acceptance on 29 September 1993; ICTY records the outcome as a rejection); `dayton_talks_begin_1995` option "Repudiate the Framework, Walk the Paris Signature" sounds odd against para 437. Option labels need their own decision.
- Essays `strategic_posture_review_rs` ("roughly two-thirds" in 1993; the judgment records 75 percent claimed in December 1993, para 3287) and `hvo_arbih_tensions_rise_1992` (two-thirds by midsummer 1992; para 2779 gives about 70 percent claimed or controlled in April 1992).
- `docs/50_research/icty_hrhb_political_goal.md:55` repeats the unverified Appeals "reversed" quotation (hidden note fixed in #676).
- BB Vol. II "Ch. N" and page references in the remaining strings: the BB batches.

## Files changed (exhaustive)

Events: `war_1992.json`, `war_1992_hrhb_summer.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`, `consequences.json`. Essays: `rs_dayton_acceptance_1995.json`, `essay_index.json`. Source: `src/sim/events/opening_policy_transition.ts` (the re-pin and `withoutDisplayText`). Tests: `identity_pending_text_drift.test.ts` and `ui/player_visible_event_text_clean.test.ts` (new); `ui/event_citation_sweep2.test.ts`, `ui/event_karadzic_citation_ranges.test.ts`, `ui/event_prlic_citation_ranges.test.ts` (allowlists emptied; the pinned-event exemption removed); `ui/rs_dayton_acceptance_wording.test.ts` (the essay figure). Docs: this README and `docs/ledger/fragments/2026-11-15-visible-truth-fixes.md`.
