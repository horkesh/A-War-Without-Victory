# R8 dry run, RBiH: Player Experience Council diary

| Field | Entry |
| --- | --- |
| Diary date | 2026-11-14 |
| Operator | Packaged-desktop QA harness (`tools/ui/paradox_local_qa.cjs`), scored by the Player Experience Council |
| Build | Package d (labels r8dry-rbih-m / n / q); see register "R8-dry COMPLETE" |
| Faction | RBiH, historical decision mode, autonomy level 1 |
| Span | Turn 0 (6 Apr 1992) to turn 188 (13 Nov 1995), Dayton signed, Verdict shown |
| Evidence | `F:/AWWV-worktrees/_logs/r8-dryrun-20261114/` (1,959 screenshots; not copied into the repo) |
| Status | **DRY run.** The score shapes fixes; it qualifies nothing. |

Screenshot names below drop the `r8dry-rbih-` prefix and the faction infix: `m-611` means
`r8dry-rbih-m-rbih-611-*.png` and `q-085` means `r8dry-rbih-q-rbih-085-*.png`.

## PK1 caveat

The run used autonomy level 1. That level froze **every** bot corps commander, enemy RS and HRHB corps
included (PK1, fixed in PR #624). Enemy behaviour, front movement, pacing, territory and casualty totals
are skewed. Every item below is marked **[PK1-skewed]**, **[PK1-partly]** or **[PK1-independent]**. Most
of what the council found is independent: it concerns the UI, the copy, event timing, the Dayton room
and the Verdict.

## How the council worked

Five independent seats each sampled the evidence through their own lens. All seats saw the onboarding
(m-000..039), the first five turns (m-095..160), the checkpoint tours (t1 m-099, t25 m-260, t39 m-360,
t50 m-455, t75 m-618, t100 m-780, t104 m-845, t125 m-1004, t150 m-1159, t156 m-1228, t175 m-1361,
t188 m-1493), the event windows (the 23 strategic decision cards, plus officer, proposal and
handled-event captures), every Dayton capture (q-080..084), every Verdict capture (q-085..097), and
random turns from each year. They also read the screen-text dumps of segments n and q and the final-state
decision receipts. The harness netlog is a Chromium network log, not a decision log, so the council used
the decision receipts in the final state to see what the player was asked and how they answered.

| Seat | Lens | Score |
| --- | --- | --- |
| 1 | Literate first-time player | 3 / 5 |
| 2 | Grand-strategy veteran (modern-wargame expert) | 2 / 5 |
| 3 | Historian (ICTY first, then Balkan Battlegrounds) | 3 / 5 |
| 4 | Narrative designer | 2 / 5 |
| 5 | War-or-game | 2 / 5 |

## Diary (integrated, in the player's voice)

**Week 0, 6 April 1992.** The opening works. The faction dossier, the "war has started" beat and the
Presidential Brief tell me why I am here: hold Sarajevo, Tuzla, Zenica and Bihać, and know that I will be
judged by the human cost, not by territory. The first decision cards look like a president's desk: a
date, a staff assessment, a clear "Historical default" tag, and the note that the turn is paused before
combat. I know what I am deciding.

**Weeks 1-5.** The loop turns into paperwork. Every week Halilović (later Delić) "acknowledges the
political directive but routes it through the staff's reading of conditions before passing to corps
commanders". I never learn which directive this was, what changed, or what I could do about it.
The card says "Recommended before advance" but offers only Acknowledge (m-096, m-097, m-150). "Advance"
goes by four names, and two different top bars sit on different screens. A chip saying "REVIEW BEFORE
ADVANCE 4" stays on for most of the war and never tells me which four things it means.

**1993-1994.** The big moments land in the right week, with real names: London, the Srebrenica
demilitarisation, Abdić's APWB, the NATO ultimatum, Washington, Carter. Several cards, though, tell me
the future before I choose. The Vance-Owen card already says Pale rejects the plan (m-355). The
14 Aug 1995 card already has Jajce retaken in September and Deliberate Force under way (m-1353). Some
dossiers show the developers' notes: "B8 worksheet 2026-05-28", a `docs/40_reports/...` path,
"calibration baseline", "machine-drafted". Command Authority sits at 100/100 from week 25 to the end.
It never stops me doing anything, so it never asks me to choose.

**Autumn 1995.** I accept Holbrooke's ceasefire in week 183, yet my staff keeps offering offensives, and
on Dayton day Divjak reports engagements won and ground taken (m-1471, m-1523). In the week the talks
begin, Washington phones to halt an advance on Banja Luka (q-078). That happened in mid-September.

**Dayton.** The room is staged well, and the institutions and the Brčko arbitration are well researched.
I do not understand the rules, though. "Round 1 of 3" is never explained, I cannot tell whether
DEMAND/CONCEDE is my button or their position, and the bargaining bar reads "Plenty of room" while the
outcome is already "CAPPED — HOLLOW VICTORY". I sign the mediator's draft unchanged in round 1 and get
the historical map at no cost (q-081..083). One tab label is cut off at the panel edge.

**The Verdict.** The headline says "Verdict under condemnation" over "ARBiH 75.3 A Survival" and a footer
reading "The least bad version of a tragedy" (q-085). The "hollow victory" cap Dayton promised never
appears. The lower half reads like a debug log: snake_case package ids under "Packages Rejected" (I
rejected nothing), an internal design-gate document cited as the source of every finding, and the same
RS paramilitary finding printed again and again with a rising count. Nothing tells me which of my 28
decisions helped or hurt.

## President-feel score: 2 / 5

Council mean 2.4. The integrator scores **2**, because the rubric asks whether the player felt like the
President across the whole campaign, and the two moments that matter most both fail:

1. **The weekly loop is clerical, not presidential** [PK1-independent]. 197 identical pushback
   acknowledgements, a review chip that never clears and never lists its items, no "what changed this
   week" readout, and a Command Authority meter that never binds.
2. **The ending contradicts itself** [PK1-independent]. The headline, the grade, the Dayton cap, three
   casualty totals and three territory figures disagree. The ending also makes three false historical
   claims: the initialling date, the war length and the casualty ratio.
3. **The war keeps going after the President makes peace** [PK1-independent]. RBiH offensives and
   engagements continue after the ceasefire is accepted, and the US halt arrives in the Dayton week.
4. **Proposals give too little to decide on** [PK1-independent]. "Staff recommends authorization" with
   no objective, forces, odds or cost.
5. **What works (keep it):** the opening, the dated decision cards and their historical sources, the
   paused-before-combat contract, the Decision Room's six-area layout, the Dayton room staging and its
   institutions research, and the "Does not block advance" tags.

Would the council play the next 10 turns tomorrow unprompted? The first-time player would, for the
history. The veteran would not, because nothing they do each week visibly changes anything.

## Desk -> Decision -> Advance friction list

| # | Friction | Evidence | PK1 |
| --- | --- | --- | --- |
| L1 | The officer "directive pushback" card shows the same text every week (197 times), names no directive and offers no choice, yet it is tagged "Recommended before advance" and repeated as "1 order interpretation pending" in War Direction. It takes about 2 of every turn's 6-9 clicks. | m-096, m-150, m-612, m-1056, m-1482, m-1490; m-120, m-476 | Frequency partly skewed; copy and design independent |
| L2 | No weekly dispatch after Advance. The desk shows a new date and a map. Gains, losses and battles are two clicks deep in The War's Record or scattered across inbox tiles. | m-095, m-099, m-1072, m-1076; n t188 Record text | Independent |
| L3 | "REVIEW BEFORE ADVANCE 4" stays on almost all war, does not list its items, and is still visible behind the Dayton signing and the Verdict. | m-099 onward, q-084, q-085 | Independent |
| L4 | Advance has four names ("ADVANCE", "ADVANCE WEEK →", "Advance while holding present policy", "Clear to advance") and the desk and war-map top bars differ (Records/Codex on one, Command Surface/Diplomacy/Intelligence/Faction on the other). | m-006, m-012, m-097, m-1493 | Independent |
| L5 | Proposal dossiers ask for yes or no on "Staff recommends authorization." with no objective, forces, odds, cost or map. "Withhold" and "Cancel" are not explained. | m-611, m-1099, m-1422 | Independent |
| L6 | Command Authority reads 100/100 at every checkpoint from t25 to t188 (lifetime spent 20). The meter never binds, so its prices are decoration. | m-476, m-802, m-1099, m-1383, m-1482 | Partly skewed (fewer crises), economy design independent |
| L7 | Two of six decision areas (Conscience, Diplomacy) read "Nothing waiting" almost every week. Diplomacy has no standing levers. | m-120, m-476, m-869, m-1099 | Independent |
| L8 | The same two "unrequested operation" offers (Koritnik/Breza, Brižina/Bugojno) sit unchanged from 1992 to 1995. | m-611, m-1056, m-1482 | Skewed (frozen commanders); expiry rule independent |
| L9 | The Home Front recruitment "1 to review" returns every week after "Not now". | m-284 onward | Independent |
| L10 | Every OG reads CRITICAL, so the alert carries no signal. | m-364, n-090 | Partly skewed |
| L11 | Intelligence and Faction nav items just open Army HQ tabs. Diplomacy says items are "tracked below" with nothing below. | m-035..039 | Independent |
| L12 | Dayton: rounds, DEMAND/CONCEDE ownership and the Dysfunction floor are unexplained, and "Sign agreement" is below the fold. | q-081, q-082, q-083 | Partly skewed (which ground is listed) |

## Confirmed bugs

Each bug is broken promised behaviour or inconsistent surface truth that at least one seat verified on screen.

| ID | Bug | Screenshots | PK1 |
| --- | --- | --- | --- |
| B1 | **Known item 1.** Verdict headline "Verdict under condemnation / The verdict is shaped by collapse, rupture, or condemnation before any score can redeem it." sits beside "ARBiH 75.3 A Survival". "Survival" is red in the Outcome tile and green in the sidebar. Confirmed by all five seats. | q-085, q-086, q-089 | Independent |
| B2 | **Known item 2.** The Dayton tab rail reads "Delegation fold": the Final review panel covers the rest of the label and the other three tabs. "Treaty binder" is also cut by the Current-draft panel. | q-083 (q-082 for Treaty binder) | Independent |
| B3 | Dayton warns "OUTCOME CAPPED — HOLLOW VICTORY ... it never reads as a clean win"; the Verdict shows Survival, grade A, and never says "hollow". | q-082, q-085 | Independent |
| B4 | The Verdict's "Packages Rejected: brcko_district, central_bosnia, gorazde_corridor, ..." prints raw ids, although the player signed the mediator's draft unchanged. "Institutions: ... decentralized" contradicts the signed binder (Customs, Monetary Policy, Foreign Policy = State). "Plans Accepted" omits London and Washington. | q-090, q-091 vs q-083 | Independent |
| B5 | Running totals print as separate Verdict findings: "RS paramilitary war-crimes findings" repeats with 8, 10, 12 ... 26 deployments "in the severe severity band". | q-096, q-097 | Count partly skewed; duplication independent |
| B6 | Casualty totals disagree across the ending: "43,244 soldiers and 39,724 civilians killed on all sides" (signing); "Casualties Taken 263,516 / Inflicted 70,877" (Verdict); "95,654 friendly casualties" (Record); "military casualties 44% of historical". The 44% divides military killed by the all-deaths total 97,207 (`src/sim/endgame/endgame_comparison.ts` ~l.161-165). Against the military baseline it is 72%. | q-084, q-085, q-090; n Record text | Totals skewed; wrong denominator and labels independent |
| B7 | Territory reads 30.6% (map), 39.3% "(323 settlements)" (Verdict; 323 is the RS settlement count in the final state) and 33.3% (treaty), with no basis labels. | n-090, q-090, q-083 | Values skewed; labels independent |
| B8 | Verdict "War lasted 6 weeks longer than the historical 182 weeks". `data/reference/historical_baseline.json` sets 182 weeks and labels week 182 "Dayton Accords", but week 182 is 2-8 Oct 1995 (the ceasefire). Initialling is week 189, so this run ended a week early. | q-085 | Independent |
| B9 | Dayton signing beat says "Initialled ... 13 Nov 1995" (the last turn's date). The game's own t184 card says 21 Nov 1995, the real date. | q-084 vs m-1468 | Independent |
| B10 | Ceasefire not enforced: after the player accepts the Holbrooke ceasefire (t183), the staff offers "Operation Jajce Recovery" (16 Oct), Sana 95 and Donji Vakuf 95 show as launched, and on 13 Nov Divjak reports "5 engagements ... We gained 3 positions" with the 1st Corps on OFFENSIVE. | m-1471, m-1515, m-1523 | Independent (these are RBiH operations) |
| B11 | An accepted, free proposal comes back as "Order an unrequested operation: Advance from Doljani (Jablanica) ... 25 Authority", and the toast says "Command authority is spent now" while the bar still reads 100/100. | m-611 → m-612 | Partly skewed (held op); list and toast independent |
| B12 | "Visit the front · 10 Authority" is offered on the Command Surface while Army HQ shows it on cooldown until 15 Jun 1992. | m-096, m-157 vs m-127 | Independent |
| B13 | Corps commanders at t188: 3rd Merdan, 4th Čuskić, 5th Šelmanović. Historically the 3rd was Mahmuljin and the 5th Dudaković; the game's own 26 Sep 1994 card names Dudaković. In Sep 1993 a proposal names Hadžihasanović as 4th Corps commander (he led the 3rd). The roster data has Dudaković available from t0 (inferred cause: the succession logic ignores home corps and historical order). | n-047 text, m-611, m-1068 | Independent (inferred) |
| B14 | No HRHB formations at all at t188: the map draws no HVO counters (state: formationsByFaction RBiH 104, RS 52), while HRHB holds 104 settlements and the Verdict grades "HVO 72.5 A". The status bar counts the Federation partner's ground as "Hostile-held 71.0%". | m-1494; q-085 | Partly skewed; total absence not explained by PK1, needs an engine check |
| B15 | Army HQ shows "Tanks 0/33" (1st Corps) and "Arty 135/182" (2nd Corps) beside "Heavy equipment operational pool 100%". The fraction is unlabelled and contradicts the pool. Readiness dots are red for COMBAT READY and green for ADEQUATE. | m-1191, m-1523; n army-hq text | Independent |
| B16 | Generated unit "RBiH doboj Brigade 2" (lowercase place, raw template) under "Reserve HQ / General Staff ARBiH 1 units". | m-1191, m-1523, n-000 | Template independent |
| B17 | The advance strip "WAR REQUIRED 0 REVIEW BEFORE ADVANCE 4" stays live under the signing page and the Verdict. | q-084, q-085..097 | Independent |
| B18 | Minor onboarding faults: on first paint the side picker has no RS/HRHB crest (m-001), and the inbox "Open desk" button is cut at the panel bottom (m-006, m-009). | m-001, m-006, m-009 | Independent |

## Copy problems

| ID | Problem | Example (exact on-screen text) | Screens | PK1 |
| --- | --- | --- | --- | --- |
| C1 | Developer provenance on presidential dossiers and in the Verdict | "Source dossier: B8 worksheet 2026-05-28 + v1.3 packet §3.6"; "Per Phase A B9 worksheet (docs/40_reports/research/20260527_EVENT_FAMILY_B9.md)"; "The turn 141-142 window is an exogenous calendar guardrail"; "The historical default is a calibration baseline"; "the row's"; "originally machine-drafted, then hand-corrected"; Verdict "Sources: Sensitive History Design Gate §4" under every finding; "These counts are accounting facts for the verdict surface, not a score." | m-200, m-517, m-589, m-674, m-757, m-904, m-1068, m-1120, m-1459, q-078, q-093..097 | Independent |
| C2 | Headline tone (B1) and a filler triad | "collapse, rupture, or condemnation before any score can redeem it" next to footer "The least bad version of a tragedy" | q-085 | Independent |
| C3 | Srebrenica line: a title pasted mid-sentence and engine language | "The ledger records the Srebrenica genocide after Fall of the Srebrenica safe area and subsequent genocide of Bosniak men and boys. ... the finding remains a locked condemnation fact." Suggested: "July 1995: Srebrenica falls. More than 8,000 Bosniak men and boys are killed. The ICTY and the ICJ ruled it genocide." | q-085, q-094 | Independent |
| C4 | State, army and faction nouns mixed on one screen | Verdict scores "ARBiH / VRS / HVO" (armies) next to "Focus RBiH" and "RBiH Survival; HRHB Survival"; effect lines "ARBiH morale", "Army of RBiH / HVO alliance", "Republic of Bosnia and Herzegovina morale"; "Final Split: HVO 19.9%, ARBiH 33.3%, VRS 46.8%" | q-085, q-090, m-154, m-200, m-519 | Independent |
| C5 | "Rupture" used for atrocities; one-sided framing (route to historian + §6/sensitive-copy panel) | "Ahmići and the Rupture"; "the July 1995 Srebrenica and Žepa rupture"; "Operation Storm (HV liberation of Krajina)"; the Ahmići notice credits "HVO morale +15" under "INTELLIGENCE ASSESSMENT" | m-519, m-1353 | Independent |
| C6 | Officer pushback: one contentless sentence, 197 times; "Army CO" staff shorthand | "Army CO pushed back on political directive. ... routes it through the staff's reading of conditions before passing to corps commanders." | m-096, m-150, m-325, m-607, m-1490 | Copy independent |
| C7 | Evaluator output in "What to know" | "• Commander assessment: launch • within Aug–Oct 1995 exploitation window • not applicable • 5th Corps commander state present • not applicable"; "Supply truth shows formations isolated"; Home Front "No staff report" x3; Briefing "• Military briefing" | n-030..039, m-476, m-802 | Independent |
| C8 | Raw operation ids | "una 94", "breza 94", "pauk 94 95 · ARBiH / Approved"; six ops "Pending Outcome" at game over | q-092 | Independent |
| C9 | Action cards read as news, and stutter | "Sana 95 — Staff launched Operation Sana. 25 Authority" under ACTIONS YOU CAN TAKE (the action is a halt); "Halt operation: Probe — 2nd Corps / Order 2nd Corps to break off Probe — 2nd Corps now"; "1 corps command are running active operations" | m-1099, m-1422, m-1515, m-476, n-034 | Independent |
| C10 | Em-dash "— but" templates and triads (AI cadence) | "It can rally morale — but it is double-edged: ..."; "time to rearm, resupply, and prepare for whatever comes next"; "The arithmetic is simple" | n-034, m-517, m-1120 | Independent |
| C11 | Effect lists repeat the state name and use raw decimals; one stat has three names | "Republic of Bosnia and Herzegovina morale -3 • Republic of Bosnia and Herzegovina International Credibility +15 ... Int'l Standing +10"; "alliance +0.05"; "operational aggression -0.1 for 16 weeks" | q-078, m-200, m-757, m-1120 | Independent |
| C12 | Undefined terms | "OG" never spelled out (0 hits in the text dumps); "VISIT THE FRONT [-10 CA]" vs "10 Authority" elsewhere; stance values without a tooltip; "Pyrrhic Score" first appears on the Verdict | m-012, m-127, m-033 | Independent |
| C13 | Missing diacritics, including the masthead art | "Oslobodenje", "Milosevic", "Mladic", "Gorazde", "Zepa", "Stakic", "Karadzic", "Krstic", "Grmec" next to "Grmeč" (masthead art needs a Codex asset spec) | m-161, m-1076, n-000, q-090, q-094 | Independent |
| C14 | Dev voice in Army HQ | "JNA-background officer leading the RBiH army command at scenario start"; "COMMAND: Modeled as an RBiH army-command appointment"; the heavy-equipment pool explanation; Divjak (Deputy Commander) under "Your chief of staff's picture of the war"; he addresses the President as "Commander" | m-033, m-129, n-047..051 | Independent |
| C15 | Generic briefing filler | "This is deeply troubling. Commander, the situation requires careful consideration." | m-129 | Numbers skewed; wording independent |
| C16 | Dayton labels doubled in the accessibility tree (hotspot plus rail) | "Delegation folder Current draft Settlement map Treaty binder Delegation folder Current draft ..." | q-081..083 text | Independent |
| C17 | Mixed US and British spelling; "33.3 %" with a space | "Honor the ceasefire" vs "Honour a regular formation"; "defense" vs "favouring" | n-034, q-083 | Independent |

## Historical accuracy issues

Sources: ICTY judgements first, then Balkan Battlegrounds, then Holbrooke's *To End a War*, RDC, and the
ICTY OTP demography (Zwierzchowski/Tabeau 2010).

| ID | Issue | Screens | History | PK1 |
| --- | --- | --- | --- | --- |
| H1 | Dayton initialled "13 Nov 1995" | q-080, q-084 | Initialled 21 Nov 1995 (talks opened 1 Nov; signed Paris 14 Dec). The game's own t184 card says 21 Nov. | Independent |
| H2 | War length "182 weeks" baseline | q-085 | Week 182 = the October ceasefire. Initialling is week 189 (ceasefire in force, 12 Oct, is week 183). | Independent |
| H3 | Casualty ratio uses all deaths as the military denominator; baseline file inconsistent (60,231 + 38,476 = 98,707, not 97,207); no civilian line | q-084, q-085 | Military baseline about 57,500 (RDC) / 62,600 (ICTY OTP). | Denominator independent |
| H4 | "Washington halts the Federation advance" fires 13 Nov 1995 (t188), after the t183 ceasefire and the t184 talks | q-078 | The US pressed Zagreb and Sarajevo not to take Banja Luka around 17 Sep 1995; Južni Potez ran 8-11 Oct. Belongs at about t179-181, before the ceasefire card, and should be suppressed once the ceasefire is accepted. | Timing independent; "a third of its territory" claim partly skewed |
| H5 | Corps commanders 1995 (B13) | n-047, m-611, m-1068 | 5th Corps Dudaković (late 1992 to the end); 3rd Corps Mahmuljin in 1995; Hadžihasanović was 3rd Corps to Nov 1993; the 4th Corps holder needs a source check. 1st Karavelić, 2nd Sead Delić and Army CO Delić are right. The 7th Corps is a known pre-1.0 item and is not re-flagged. | Independent |
| H6 | Cards narrate the future | m-350 (28 Dec 1992 cites UNSCR 820, Apr 1993); m-355 (4 Jan 1993: Pale "rejects it", May 1993); m-600 (23 Aug 1993 cites 20 and 29 Sep 1993); m-959 (4 Jul 1994: RS rejection, 18-20 Jul); m-1353 (14 Aug 1995: Jajce 8-13 Sep, Deliberate Force from 30 Aug, Geneva 8 Sep) | Write each card in the present of its date; keep outcomes as risks. | Independent |
| H7 | 5th Corps card (26 Sep 1994) wants to "overrun Velika Kladuša" | m-1068 vs m-674 | Velika Kladuša fell 21 Aug 1994 (the game's APWB card says so). Grmeč 94 began about 24-25 Oct 1994 (t133). | Independent |
| H8 | Owen-Stoltenberg "Assembly rejects outright" | m-600, m-698 | The 27-29 Sep 1993 assemblies accepted conditionally (return of territory); the mediators read that as rejection. | Independent |
| H9 | Small anachronisms | m-200 "Federation-track alignment with HRHB" (Jun 1992; Federation track 1994); m-605 "JNA-armed VRS and HVO" and "Contact Group" (Aug 1993; Contact Group Apr 1994); m-698 "Foreign Minister Silajdžić" (PM from 25 Oct 1993); m-904 Contact Group a week early; m-1468 presidents "arrive at Wright-Patterson" on 16 Oct (31 Oct-1 Nov); RS mandate "29 August" (q-084) vs "30 August" (m-1468) | Correct per item. | Independent |
| H10 | "OHR Authority — Bonn Powers" in the Dayton institutions; "Voluntary Return Only (as implemented)" is hindsight | q-083 | Bonn powers granted by the PIC in Dec 1997; Annex 10 gave a coordinating mandate only. | Independent |
| H11 | "pauk 94 95 · ARBiH / Approved"; "Operation Mistral 1 · HVO" | q-092 | Pauk was the RSK/APWB offensive against the 5th Corps. The historical HV/HVO operation is Maestral (Mistral) 2, Sep 1995; "Mistral 1" needs a source. | Independent |
| H12 | Prijedor camps press-access card in Mar 1994 and still in the inbox in Nov 1995, with an ICTY case number in the title | m-781, m-1493 | Omarska and Trnopolje closed Aug-Nov 1992. | Independent |
| H13 | Turn-0 OOB shows 1st-5th Corps and "ARBiH MAIN STAFF" on 6-13 Apr 1992 | m-012, m-033, m-129 | ARBiH formed 15 Apr 1992; corps from autumn 1992. At minimum the dossier should say corps labels are an abstraction from day one. | Independent |
| H14 | Manpower: "714,459 committed over campaign / 371,459 strategic reserve / 4.9% mobilisation strain" | m-1527 | Larger than the Bosniak military-age male population under Sarajevo's control; the ARBiH was short of men by 1995. About 172k fielded in 90 brigades is plausible. | Partly skewed |
| H15 | 1st Corps (besieged Sarajevo) holds 33 tanks and 47 guns after the player complied with the NATO heavy-weapons exclusion zone at t97 | m-1523 | The 1st Corps was the most tank-starved; the exclusion zone should bind after "comply". | Partly skewed |
| H16 | "120th Liberation 'Black Swans'" shown as 3,000 men | m-1523 | The Crni Labudovi unit was a few hundred strong (war-or-game seat, from memory; historian to confirm). | Independent |
| H17 | Dayton round 1 opening draft already equals the historical map | q-081..083 | The Dayton map came out of 21 days of bargaining (Sarajevo suburbs, Goražde corridor, Posavina). An unchanged round-1 signature gets the historical result for free. | Partly skewed |

Verified correct (keep): the card dates for London, the Srebrenica demilitarisation, the APWB declaration
(27 Sep 1993), the NATO ultimatum (5/9/21 Feb 1994), Washington, Carter and the Holbrooke ceasefire; the
Sovići/Doljani notice (consistent with ICTY Naletilić & Martinović); the Srebrenica genocide framing and
the 8,000 figure (Krstić 2001: 7,000-8,000; Potočari lists 8,372); and the rest of the Dayton
institutions panel. Usora HVO under the ARBiH 3rd Corps is deliberate and was not flagged.

## Realism (war-or-game)

- The President authorises a corps **defence** ("Operation Breza 94 Defense", m-1000) and village-axis
  advances with brigade lists (m-611). Defensive operations should never need presidential sign-off.
  Proposals should come at the level of a named campaign with its political stakes. [PK1-independent]
- Real Delić-Izetbegović clashes were specific and came a few times a year (the June 1995 Sarajevo
  breakout, Srebrenica/Žepa, Bihać). A weekly "the staff read conditions" note would never reach the
  President. [PK1-independent]
- For the victim faction, a headline of "condemnation" reads as if the Bosniak President is judged for
  the genocide of his own people. Frame it as loss for RBiH and as condemnation for the perpetrators,
  and keep the locked ledger fact. [PK1-independent]
- Not pursued, as PK1 artefacts: the static front, RS passivity, the 43,244 soldiers killed, the RBiH
  20,413 killed, and the territory shares.

## Top 5 fixes, ranked by player impact

1. **Make the ending tell one true story** (B1, B3-B9, C1-C4, C8, H1-H3). One headline that holds the
   grade, the Dayton cap and the Srebrenica stain without condemning the victim faction. The cap must
   show visibly. Add a score breakdown and a "your three best and worst calls" block from the decision
   receipts. Fix the real initialling date, the war-length baseline (189 or 183, like for like) and the
   military casualty denominator, and add a civilian line. Use display names, take the institutions from
   the signed binder, print one deduplicated paramilitary card, give every casualty and territory figure
   a basis label, cite public sources only, and fix the "Delegation fold" clip (B2). [PK1-independent]
2. **Replace the weekly pushback with rare, specific clashes and add a weekly dispatch** (L1, L2, L3, C6).
   A pushback should fire only when an order actually conflicts with the army's plan. It should name the
   order and the deviation, offer accept, insist (Authority) or replace, and be capped at a few a year;
   otherwise the note goes silently to the Record. After Advance, show one "This week" card: what
   changed, battles, losses, what needs me. Make the review chip clickable and have it list its items.
   [PK1-independent]
3. **Respect the peace: enforce the ceasefire and retime the late-1995 events** (B10, H4, H6). Accepting
   the ceasefire should close the operation channel, cancel running RBiH offensives and set stances to
   hold. Move the US halt to t179-181 and suppress it after the ceasefire. Rewrite the future-telling
   cards in the present of their date. [PK1-independent]
4. **Strip developer text from every player surface** (C1, C7, C14). No worksheets, repo paths, turn
   windows, "row", "calibration", "machine-drafted" or design-gate citations; rename "TRIGGER EVIDENCE"
   to "Why now"; drop "not applicable" bullets. Then do one noun and diacritics pass (C4, C5, C11, C13),
   routing the atrocity wording to the sensitive-copy panel. [PK1-independent]
5. **Give the President decisions worth making** (L5, L6, B11, B13, H5). Real proposal dossiers
   (objective, forces, odds band, cost, stakes, "Show on map"), no sign-off for defensive ops, and fix
   the accepted-becomes-unrequested bug. Authority that binds (priced authorisations, visible regen).
   Historical corps succession by default (Dudaković, Mahmuljin). [PK1-independent]

Also needs a measured engine check before any fix: B14 (zero HRHB formations at t188 while HRHB holds
104 settlements). Re-run after #624 to see whether it persists.

## Bug vs friction split

| Item | Surface | Type | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| Ending contradictions (B1, B3-B9) | Verdict, Dayton | Bug | No | UI/copy lane with the §4 copy panel and the historian |
| Ceasefire not enforced (B10) | Engine, War Direction | Bug | No | Engine lane (operations expert) |
| Pushback loop (L1) | Officer events, Decision Room | Friction | No | UI lane, corps-army-commander review |
| Developer text (C1) | Event dossiers, Verdict | Copy bug | No | Narrative pass |
| Corps succession (B13) | Officer succession | Bug | No | Engine / OOB data lane |
| HRHB formations missing (B14) | Engine state, map | Bug, unverified cause | No | Measure after #624 |

## Desk -> Decision -> Advance loop check

| Field | Entry |
| --- | --- |
| Did the top-3 include a new Desk -> Decision -> Advance friction? | **Yes** (L1 pushback loop, L2 no weekly dispatch, L3 review chip) |
| Second consecutive no-new-loop-friction diary? | No |
| R8 acceptance (rubric: two consecutive diaries, no new loop friction, no confirmed bug, 5/5) | **Not met.** Dry run only; re-run after #624 + EV1 and the fixes above |

## Triage outcome

| Rank | Accepted follow-up | Owner | Status |
| --- | --- | --- | --- |
| 1 | Ending truth pass (fix 1) | UI/copy lane + §4 copy panel + historian | Proposed |
| 2 | Pushback + weekly dispatch (fix 2) | UI lane | Proposed |
| 3 | Ceasefire enforcement + late-1995 retiming (fix 3) | Engine lane + historian | Proposed (RF entry test applies) |
| 4 | Developer-text strip + noun/diacritics pass (fix 4) | Narrative lane | Proposed |
| 5 | Proposal dossiers, Authority, corps succession (fix 5) | UI + engine | Proposed |

The council seat notes behind this diary were kept outside the repository and are summarised here. Out-of-scope findings are appended to the
coordination register under "R8 council (2026-11-14)".
