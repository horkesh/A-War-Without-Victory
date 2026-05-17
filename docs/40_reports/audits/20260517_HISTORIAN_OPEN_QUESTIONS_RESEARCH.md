# Historian — Open Questions Research (H1–H5)

> **Date:** 2026-05-17
> **Role:** `/historian`
> **Source hierarchy:** ICTY (verdicts, indictments) > BB (Balkan Battlegrounds vols. I–II) > museum B/C/S > English Wikipedia.
> **Gates respected:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (Ring 1/2/3); `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` (per-faction verdict, no leaderboard).
> **Scope:** Cited-source recommendations for five open question lanes. Where ICTY/BB do not speak directly, this report says so explicitly and recommends `/historian` follow-up rather than fabricating.

---

## H1 — Sarajevo Special-Casing Canonicity

**Constants under review** (`src/sim/combat/battle_resolution.ts:99,107,409`, `src/sim/combat/exhaustion.ts:83–90`):
- `SARAJEVO_DEFENSE_BONUS = 0.40` (vs `URBAN_DEFENSE_BONUS = 0.25`)
- `SARAJEVO_ATTACKER_CASUALTY_MULT = 2.0` (vs `URBAN_ATTACKER_CASUALTY_MULT = 1.5`)
- Siege exhaustion: RBiH +3.0/turn, RS +2.0/turn (besieged only).

**What the sources establish (BB tier, with ICTY context):**

1. The siege of Sarajevo was a distinct phenomenon, not a generic urban battle. BB1 p.220–222 (Chapter 37, "The Siege Continues, Sarajevo 1993") characterises it as "the grim routine of trench warfare," with "intermittent but persistent shelling and exchanges of small-arms fire, punctuated by the occasional battle for a key suburb, terrain feature, or defensive position." The "biggest military event" of 1993 was the VRS capture of Mount Igman cutting "the city's last supply line" — not a battle inside Sarajevo proper.
2. The terrain inversion (defenders in dense pre-war urban core, besiegers on commanding ridges) is recurrent in BB. BB1 p.222 references Zuc Hill, Grbavica, Stup, Otes, Azici as the battles that actually happened; all were *peripheral* breakthrough attempts that the VRS lost or held only marginally. BB1 p.220 notes "the VRS's superiority in firepower" and Muslim defenders falling back on "elemental tactics of strong trench and bunker defenses" that "could slow and eventually halt a strong Serb attack." This is the empirical signature of an *outsize* defender bonus, not a normal urban bonus.
3. Siege exhaustion asymmetry is sourced. RBiH carried the civilian-population cost (Galic IT-98-29-T documents the four-year sniping/shelling campaign against the city's residents); RS carried the political-international cost (Karadžić IT-95-5/18-T, Mladić IT-09-92-T find the siege itself as criminal conduct, producing sustained international condemnation and the eventual NATO airstrike posture). Both factions exhausted, but for different reasons, at different magnitudes. BB1 p.222 explicitly attributes international pressure that ended the Mt. Igman push to the siege framing.

**What the sources do NOT establish:** Specific numerical values. No source — ICTY or BB — mandates +0.40 vs +0.25 for defender bonus, or 2.0× vs 1.5× attacker casualties, or +3.0 vs +2.0 exhaustion split. These are tuning numbers chosen to *reproduce* the empirical Sarajevo outcome (no VRS breakthrough across 1,425 days) within the engine's combat math, not numbers a tribunal or BB derived.

**Recommendation: Branch B (LIFT TO SCENARIO), with one nuance.**

- The *fact* that Sarajevo is mechanically distinct from generic urban combat is canonical: BB and ICTY both establish a unique siege geometry (defenders in valley, besiegers on heights, four-year duration, single supply tunnel) that does not generalise to Mostar, Tuzla, or Banja Luka. The 0.40 vs 0.25 distinction is therefore canon-justified in principle.
- The *specific values* are simulation tuning, not historical mandate. Lift them to scenario data (`data/scenarios/timelines/apr1992.json` or a new `siege_parameters` block) so that (a) tutorial/what-if scenarios can adjust without code changes, (b) the canon distinction "Sarajevo ≠ Mostar" remains explicit in data, (c) future research that produces better empirical anchors (e.g., revised casualty estimates from the Sarajevo Census Bureau / RDC) can update without a code review cycle.
- **RBiH/RS exhaustion split should remain two knobs, not one.** The two factions exhausted through different mechanisms (civilian siege-cost vs international-condemnation cost) at empirically different rates. Collapsing to one knob would erase a real historical asymmetry. Keep both, lift both to scenario.

**Source tier:** BB (siege distinctness, asymmetric exhaustion mechanism); ICTY Galic + Karadžić + Mladić (siege-as-crime framing, sustained international condemnation). Specific numerical values: **no source found** — tuning, not canon.

**Recommendation:** **Branch B** — lift `SARAJEVO_DEFENSE_BONUS`, `SARAJEVO_ATTACKER_CASUALTY_MULT`, and both siege-exhaustion deltas to scenario data. Keep the RBiH/RS split as two independent knobs. Code retains the *condition* (besieged Sarajevo OSIDs apply siege parameters) but the *values* are scenario-authored.

---

## H2 — B3 Negotiation Counter-Offer Historical Envelopes

**Per-plan envelopes from BB1 (Chronology, pp.40–76) and ICTY case context:**

| Plan | Date | Proposed split | RS counter | RBiH counter | HRHB counter | Citation |
|---|---|---|---|---|---|---|
| **Cutileiro (Lisbon)** | 18 Mar 1992 — initial; collapsed 27 May 1992 | Three ethnic cantons, no external border change, weak central government. No fixed % — cantons drawn on ethnic-majority criteria. | Accepted in principle (Karadžić signed); maximalist version sought contiguous Serb territory. | Initially signed (Izetbegović), then **withdrew** after EC Lisbon walk-out — abandoned in favour of unitary state. | Accepted as Croat canton; Boban's HRHB later treated this as license for Herceg-Bosna territorial claim. | BB1 p.40 ("18 March," "27 May"); BB1 p.170 (HVO formation parallel) |
| **Vance-Owen** | Jan 1993 (presented) — rejected 6 May 1993 | 10 ethnic provinces (3 Serb, 3 Muslim, 3 Croat, 1 Sarajevo-mixed); Serbs ~43%, Muslims ~28%, Croats ~25%, Sarajevo separate. | Karadžić accepted at Athens 1–2 May 1993 conditional on assembly; **assembly rejected 51-to-2 (12 abstentions) on 6 May 1993**; referendum 15–16 May confirmed rejection. | Accepted (would have given less than current ARBiH-held + recoverable territory but was the only legal framework on offer). | Accepted (Boban; HRHB perceived plan as ratifying Herceg-Bosna canton). | BB1 p.44 ("29 April," "1–2 May," "6 May," "15–16 May") |
| **Owen-Stoltenberg** | Aug 1993 (presented at Geneva, July; Izetbegović walked out 18 June; revived August) | Ethnic partition into 3 republics within loose union. ~52% Serb, ~30% Muslim, ~18% Croat (approximate; mapped in negotiation, not a single fixed figure). | Accepted (Milošević 19 June proposed his own three-republic partition; RS broadly aligned). | **Conditional acceptance** — Bosnian assembly 29 Sept 1993 voted to accept "with the condition that territory seized by force be returned." | Accepted initially, then on 1 Oct 1993 Bosnian Croat assembly "voted to withdraw territorial concessions made to the Bosnian Muslims." | BB1 p.45 ("16–17 June," "18 June," "19 June"); BB1 p.49 ("28 Sept," "29 Sept," "1 Oct"). Sarajevo arrangement: "Sarajevo will not be divided and will be administered by the UN for two years." |
| **Contact Group** | 6 July 1994 (presented) — RS referendum rejection 27–28 Aug 1994 | **51% Croat-Muslim Federation / 49% Serb** territorial split. Continuation of sanctions against Serbia with easing-on-cooperation. Four-month cease-fire. | **Rejected** — Bosnian Serb referendum (27–28 Aug 1994) "overwhelmingly rejects." Karadžić leadership refused; Belgrade (Milošević) reportedly pressured acceptance and broke with Pale over the rejection. | **Accepted** (Bosnian assembly approved 18 July 1994). | Accepted (Bosnian Croats accepted within Federation envelope; Federation already operative since March 1994 Washington Agreement). | BB1 p.57 ("13 May" — "51 percent of Bosnian territory for the Croat-Muslim federation"); BB1 p.58 ("18 July"); BB1 p.61 ("27–28 August"). |
| **Dayton** | Nov 1995 (initialed 21 Nov; signed 14 Dec) | 51/49 (Federation/RS); single state with two entities; Brčko district arbitrated separately. | Accepted (Milošević signed for RS under pressure; Karadžić excluded). | Accepted (Izetbegović). | Accepted (Tudjman signed for HRHB; Federation framework retained). | **No source found in extracted BB pages** for Dayton-specific counter-offers — the deal was effectively a take-it-or-walk imposed at Wright-Patterson. ICTY case context (Karadžić, Mladić) treats Dayton as the war's terminating settlement, not as a negotiated envelope. Recommend `/historian` follow-up using Holbrooke "To End a War" (memoir, secondary), R. Holbrooke testimony at ICTY, and U.S. State Dept. records if extending. |

**Engine envelope guidance:**
- For Cutileiro: RS counter = "ethnic canton with maximal contiguity"; RBiH counter = "unitary state, no cantons" (the walk-out position); HRHB counter = "Croat canton with Mostar."
- For Vance-Owen: RS counter = REJECT (assembly position). The interesting counter is *intra-RS* — Milošević supported, Pale rejected. This is a leverage-axis decision, not a territorial counter.
- For Owen-Stoltenberg: RBiH counter is uniquely informative — "accept conditional on return of seized territory." This is a clean engine pattern: ACCEPT + RIDER. HRHB shows the reverse pattern: accept then renege.
- For Contact Group: 51/49 is the canonical envelope center. RS counter = REJECT (referendum). Federation parties = ACCEPT.
- For Dayton: source-thin in this repo. Treat as termination event, not as a counter-offer envelope, until follow-up research lands.

**Source tier:** BB (all five plans, chronological detail). ICTY (Karadžić, Mladić): plan context and post-rejection consequences. No museum B/C/S consulted.

**Recommendation:** Use the table above as the engine envelope for plans 1–4. For Dayton, model as termination/finalisation event rather than a multi-counter envelope until `/historian` follow-up produces Holbrooke-era documentation. Flag any future scenario data that asserts specific Dayton counter-offer ranges as requiring fresh citation.

---

## H3 — Paramilitary Classification

Classification key: **Paramilitary (Ring 1/2)** = irregular force outside formal military chain of command; **Official military** = brigade/corps within faction army (ARBiH/VRS/HVO); **Hybrid** = formally subordinated but operationally autonomous, frequently used for atrocity.

| Force | Classification | Citation |
|---|---|---|
| **Patriotska Liga / Green Berets** (RBiH side, 1991–1992) | **Paramilitary → folded into ARBiH** | BB1 p.166–168: SDA-organised, formed Feb 1991, "30,000 to 40,000 armed people" by April 1992. Izetbegović 1997 speech: "main headquarters of the League of Patriots was formed immediately before the war"; nine regional commands (Sarajevo, Doboj, Cazin, Prijedor, Livno, Mostar, Visegrad, Tuzla, Sandžak), 103 municipal HQs. BB1 p.167: PL was "the organizational and philosophical forerunner of the future Bosnian army." |
| **HOS** (Hrvatske Obrambene Snage) | **Paramilitary (HSP-political, HRHB-aligned)** | BB1 p.170: HOS organised by HDZ paramilitary structures from late summer 1991. Distinct from HVO. "By the close of the first year of fighting, the HOS as an independent fighting force would cease to exist." HOS commander Blaz Kraljević and eight staff **assassinated by HVO on 9 August 1992** — that ended HOS as an independent force. Survivors absorbed into HVO. |
| **Convicts' Battalion** (Kažnjenička Bojna, KB; Mladen Naletilić "Tuta") | **Hybrid (HVO-subordinated, atrocity-grade)** | ICTY Naletilić & Martinović (IT-98-34-T) — convictions for crimes against humanity, persecution, forcible transfer in Mostar campaign 1993. KB nominally HVO; operationally Naletilić's personal command; BB pages indexed but extracted text-block in this audit did not surface explicit BB citation. ICTY judgment is the authoritative source. |
| **Arkan's Tigers** (Srpska Dobrovoljačka Garda) | **Paramilitary (cross-border, Serbia-directed)** | BB1 p.173–174: Arkan led the Zvornik assault 8–10 April 1992; Bijeljina 1–2 April 1992 ("experience the fate of Bijeljina" — his own ultimatum, BB1 p.173). ICTY: Arkan indicted IT-97-27 (sealed 1997, unsealed after his assassination Jan 2000); never prosecuted. SDG was an arm of Serbian State Security (DB/RDB), not a VRS subordinate. |
| **White Eagles** (Beli Orlovi) | **Paramilitary (Šešelj/SRS-aligned)** | BB1 p.173: "Seselj's 'Serbian Chetnik Movement'" present at Zvornik. White Eagles often used as parallel name for Šešelj-aligned irregulars and remnants of WWII-era nomenclature; precise unit boundaries fuzzy in BB. ICTY Šešelj (IT-03-67, partial conviction on appeal 2018) addresses SRS command responsibility. |
| **Scorpions** (Škorpioni) | **Paramilitary (Serbian DB-aligned, surfaced post-Srebrenica)** | **No BB citation surfaced in extracted pages.** Public record (ICTY Trbić et al. and the Scorpions video introduced at Milošević trial) establishes the unit as DB-aligned; six members executed at Trnovo July 1995 (video evidence) and the unit appears in the Krivaja-95 aftermath. Recommend `/historian` follow-up to nail down BB references or rely on ICTY transcripts directly. |
| **Yellow Wasps** (Žute Ose, Vučković brothers) | **Paramilitary (Zvornik-area, DB-supported)** | BB1 p.173–174 chapter on Zvornik does not name the Yellow Wasps in the extracted text (Arkan and Šešelj are explicit). Vojin Vučković prosecuted in Serbian courts (not ICTY) for Zvornik crimes. **No BB citation surfaced in extracted pages** for Yellow Wasps specifically — recommend `/historian` follow-up if a named entity is required for the engine. |

**On Patriotska Liga chronological cutoff (`PARAMILITARY_FADE_WEEK=20`):**

BB1 p.168 establishes formal ARBiH formation in **mid-1992**, with the PL providing the "organizational and philosophical" backbone. The Bosnian state declared the formation of the ARBiH on 15 April 1992 (general knowledge, confirmed in BB1 narrative). The actual *operational* transition from "PL units" to "ARBiH brigades" took the rest of 1992: most regional PL HQs became ARBiH brigade nuclei through summer-autumn 1992. By **week 26–32 of the campaign (Oct–Nov 1992)** the PL nomenclature had largely been retired in favour of ARBiH brigade numbering.

**Recommendation:** `PARAMILITARY_FADE_WEEK=20` is *too early* by ~6–12 weeks. The BB-supported window is **week 26–32** for full transition; week 20 captures only the formal declaration. If the fade represents "PL is no longer a distinct paramilitary entity in the OOB," `26` is closer to canon. If the fade represents "first PL→ARBiH renaming," `15` (mid-April 1992) is closer. Choose semantics, then set the constant.

**Source tier:** BB (PL, HOS, Arkan, Šešelj/White Eagles); ICTY (Naletilić/KB, Arkan indictment, Šešelj). Scorpions and Yellow Wasps: **no BB source found in this audit's extracted pages** — `/historian` follow-up recommended before engine names them as Ring 1 entities.

**Recommendation:** Six of seven entries cited and classifiable now. Two (Scorpions, Yellow Wasps) require follow-up citation before they appear as named units in OOB. Move PARAMILITARY_FADE_WEEK from 20 → 26 if "fully absorbed into ARBiH" is the intended semantic.

---

## H4 — RBiH Arms Embargo Timeline

**Canonical phases sourced from BB1 (chronology pp.40–76, embargo context p.167):**

| Phase | Calendar window | Event trigger | Source |
|---|---|---|---|
| **Phase 1: Embargo imposed and enforced** | 25 Sept 1991 → mid-1992 | UNSCR 713 (25 Sept 1991) imposes complete arms embargo on all of former Yugoslavia. BB1 p.167: "The practical consequence of UN Resolution 713 was to lock in the weapons advantage of one side — the Bosnian Serbs — and to close off the other side's ability to achieve parity." | BB1 p.167; UNSCR 713 |
| **Phase 2: Croatia transit window (de facto, contested)** | Mid-1992 → ~mid-1993 | No single trigger in extracted BB pages. PL/ARBiH "procured some [weapons] through Croatia" (BB1 p.167) — a continuous trickle, not a phase change. Significant arms flow contingent on HV/HVO cooperation, which **collapses with the HVO-ARBiH war in April 1993** (BB1 narrative, Lašva Valley April 1993; Mostar siege May 1993). | BB1 p.167 (Croatia route); BB1 timeline (HVO-ARBiH war onset Apr 1993) |
| **Phase 3: Croatian-Bosnian rapprochement; Iranian "Black Flights" via Zagreb** | March 1994 (Washington Agreement) → late 1994 | **No direct BB citation surfaced in extracted pages** for "Black Flights" by name. Washington Agreement (1 March 1994) creates Federation; Croatia-RBiH transit normalises; covert Iranian arms shipments via Zagreb are public record (US Senate Intelligence Committee 1996 inquiry, "Iranian Green Light" controversy). Recommend `/historian` follow-up for primary documentation. | BB1 chronology March 1994 (general); US Senate Intel Committee (secondary) — flag as `no BB source found` for Black Flights specifically |
| **Phase 4: US non-enforcement** | Nov 1994 → mid-1995 | US Congress votes to lift embargo (non-binding) Nov 1994; Clinton administration ceases active enforcement of arms embargo against RBiH. BB1 p.63 (3 Nov 1994): "The UN General Assembly approves a nonbinding resolution to lift the arms embargo against Bosnia in six months if the Bosnian Serbs do not accept the contact group peace plan." UNSC members "endorse the resolution with five in favor and 10 abstentions." This is the public turn — the embargo remains on paper, enforcement is gone. | BB1 p.63 (3 Nov 1994) |
| **Phase 5: Dayton-era formal lift** | After Dayton (signed 14 Dec 1995) | Embargo formally lifted post-Dayton (UNSCR 1021, 22 Nov 1995, phased lift; full lift by Mar 1996). **No direct citation in extracted BB pages** for UNSCR 1021 by number — flag as `general knowledge`, recommend follow-up. | UNSCR 1021 (general knowledge, GK-tagged) |

**Canonical engine flag for `embargo_lifted`:**

BB1 p.63 dates the **3 November 1994** US non-enforcement vote as the *de facto* turning point — from this date onward, the embargo is symbolic rather than operational. The formal lift (Dayton/UNSCR 1021) is post-war and largely retrospective.

**Recommendation:** Set `embargo_lifted` flag to **3 Nov 1994** (week ~136 of the apr_1992 scenario). This is the BB-cited threshold at which RBiH's supply environment materially changes. Treat Phase 5 (formal Dayton lift) as an event/narrative beat, not as a separate engine state — by then the war is ending.

**Supply-effect bands (estimates, marked):**

| Phase | RBiH heavy-weapons availability | Status |
|---|---|---|
| 1 | ~5% of demand (BB1 p.167: "fell far short of its requirements") | BB-anchored qualitative; specific % is **estimate** |
| 2 | ~10–15% of demand (small Croatia trickle) | **Estimate** — no BB-cited figure |
| 3 | ~20–30% of demand (Federation transit + covert flights) | **Estimate** — no BB-cited figure |
| 4 | ~40–50% of demand (open transit, US non-enforcement) | **Estimate** — no BB-cited figure |
| 5 | Normal procurement | Post-war |

**All percentages are estimates derived from BB qualitative descriptions, not direct citations.** A tribunal-cited reconstruction would require expert testimony from a procurement-history witness (e.g., Charles Shrader, *The Muslim-Croat Civil War in Central Bosnia* uses qualitative bands; ICTY Galic and Karadžić judgments discuss supply asymmetry qualitatively but do not produce numbered bands).

**Source tier:** BB1 p.167 (Phase 1 mechanism), BB1 p.63 (Phase 4 trigger date). Phase 3 (Black Flights) and Phase 5 (UNSCR 1021): **no source found in extracted BB pages** — `/historian` follow-up recommended for primary citations. All supply-effect % bands are estimates marked as such.

**Recommendation:** `embargo_lifted` flag = **3 Nov 1994** (BB-cited). Phase 1/2/4 supply bands acceptable as engine estimates with the qualitative anchor. Phase 3 (Black Flights specifics) and Phase 5 (UNSCR 1021) require `/historian` follow-up before they appear in player-facing essays or events. Do not represent the embargo timeline as fully canon-cited until Phase 3 and Phase 5 are anchored.

---

## H5 — Brigade Dissolution / Krivaja-95 Roster

### Vitezovi (HVO elite) destruction circumstances

BB2 p.437 documents the unit thoroughly:
- Formed "late 1992 or beginning of 1993"; HQ in Vitez area; commanded by Darko Kraljević (nephew of HOS commander Blaz Kraljević, killed by HVO Aug 1992).
- Company-sized elite, subordinate to HVO Central Bosnia Operational Zone (Blaškić's command).
- Active through January 1994; thereafter "absorbed into another HVO unit — probably the then forming 3rd HVO Guards brigade." Kraljević died in a car accident **26 June 1995**.
- BB2 p.441 (Sept 1993 Lašva Valley counter-offensive): Vitezovi led counterattack that retook Bobaš village against ARBiH 17th Krajina Brigade — i.e., the unit was *active and effective* through autumn 1993.

ICTY: Vitezovi implicated (varying evidence) in **Ahmići massacre 16 April 1993** (Blaškić IT-95-14-T; Kordić IT-95-14/2-T). The unit is **not** documented as destroyed in combat by BB — instead **absorbed administratively** into the 3rd HVO Guards Brigade in early 1994.

**Project memory note ("Vitezovi 12 battles → destroyed" at turn 122 / op:skender_vakuf:donji_koricani) is a SIM OUTCOME, not history.** Historically Vitezovi was not destroyed — it was administratively absorbed. The sim-destruction is an artifact of force-quality calibration runs.

### Krivaja-95 brigade roster (Srebrenica genocide, July 1995)

VRS Drina Corps subordinated units that participated, per ICTY Krstić (IT-98-33-T) and Mladić (IT-09-92-T) judgments:

| Unit | Role | Status |
|---|---|---|
| **1st Zvornik Infantry Brigade** | Northern axis; primary executions roster (Orahovac, Petkovci dam, Pilica/Branjevo, Kozluk, Rocevic) | ICTY-cited; already in OOB |
| **1st Bratunac Light Infantry Brigade** | Southern axis from Bratunac; Potočari separation; Sandići-Kravica killings | ICTY-cited; already in OOB |
| **Skelani Independent Battalion** | Southeast flank from Skelani | BB1 p.220 cited (Skelani as VRS reinforcement point); already in OOB |
| **5th Podrinje Light Infantry Brigade (Višegrad)** | Drina Corps subordinate; participated in enclave reduction | ICTY Krstić, Mladić — present in Krivaja-95 order of battle |
| **2nd Romanija Motorized Brigade (Sokolac)** | Drina Corps support; armoured/motorised element | ICTY Krstić — listed in Drina Corps Krivaja-95 order |
| **1st Milići Light Infantry Brigade** | Western Srebrenica axis; Milići-Konjević Polje road | ICTY Krstić — Drina Corps subordinate, Krivaja-95 participant |
| **1st Birač Light Infantry Brigade (Šekovići)** | Northern blocking force; Konjević Polje road interdiction | ICTY Krstić |
| **65th Protection Regiment (VRS Main Staff)** | Mladić's escort; Potočari, Bratunac; key role at execution sites incl. Pilica | BB1 p.220, BB2 p.519, BB2 p.520. See below for classification. |
| **10th Sabotage Detachment (VRS Main Staff)** | Branjevo military farm executions (16 July 1995) | ICTY Erdemović (IT-96-22) — Erdemović was a member; direct ICTY conviction |
| **MUP units / "Special Police" (Jahorina training camp)** | Sandići meadow, Kravica warehouse killings | ICTY Karadžić, Mladić; **Scorpions** unit also present (see H3) |

**Recommendation for OOB:** Add **5th Podrinje (Višegrad)**, **2nd Romanija (Sokolac)**, **1st Milići**, **1st Birač (Šekovići)**, **10th Sabotage Detachment**, and the MUP Special Police Brigade/Jahorina element to the Krivaja-95 participant roster. 65th Protection Regiment classification: see next item.

### 65th Protection Regiment classification

BB2 p.519: "Both the Sarajevo-Romanija and Herzegovina Corps probably could also draw on some VRS Main Staff elements, primarily the 65th Protection Motorized Regiment, plus parts of the MUP Special Police Brigade, to counterattack any ARBiH advances."

BB2 p.520: "counterattacked with elements of the 11th Herzegovina Infantry and 18th Herzegovina Light Infantry Brigades — probably led by the VRS 65th Protection Regiment and MUP special police units — brought in as reinforcements."

**Verdict:** 65th Protection is **a regular VRS Main Staff motorised regiment that doubles as Mladić's escort and as a strategic reserve / "fire brigade" for any Corps that needs reinforcement.** Not paramilitary; not corps-HQ-security only; **frontline-capable mobile reserve** that ICTY documents at Srebrenica execution sites. Closer in function to JNA's old 72nd Special Brigade than to a static HQ guard battalion.

**Project memory note** ("65th Protection Regiment (RBiH) ... 5 Corps HQ-security unit") is **incorrect on two counts**: (a) the 65th Protection is VRS, not RBiH; (b) it is mobile and frontline-capable, not HQ-security. Recommend OOB correction: classify as VRS Main Staff mobile reserve (motorised), Krivaja-95 participant, **not garrison-tagged**.

### Other documented brigade dissolutions vs administrative disbandments 1992–1995

**Combat destruction (BB-cited):**
- **9th Grahovo Light Infantry Brigade (VRS)**: destroyed in Operation Storm/Maestral (BB1 p.455 — flagged in `docs/plans/2026-05-17-brigade-dissolution-threshold-plan.md` Task 2.3). OOB id `rs_9th_grahovo_light_infantry`.
- **ARBiH 9th and 10th Mountain Brigades**: BB1 p.222 — Bosnian Government cracked down on Celo Delalić's 9th and Caco Topalović's 10th in October 1993 ("two of its own units that had gotten out of hand"). These were **disbanded by government action, not destroyed in combat against an external enemy**. Distinct lifecycle: government action, not destruction.
- **Cerska/Kamenica pocket forces (ARBiH)**: BB1 p.220 — overrun mid-March 1993 in VRS Cerska 93 operation. Survivors absorbed into Srebrenica enclave defenders; later reconstituted as **28th Division (ARBiH)** post-DMZ.

**Administrative disbandment (not combat destruction):**
- **HOS** (Aug 1992) — leadership assassinated by HVO; survivors absorbed into HVO.
- **Vitezovi** (early 1994) — absorbed into 3rd HVO Guards Brigade after Croat-Muslim war ended (Washington Agreement).
- **Patriotic League regional commands** (through 1992) — became ARBiH brigade nuclei.
- **ARBiH 9th and 10th Mountain** (Oct 1993) — disbanded by government action against criminal-extortion units.

### Lifecycle mapping recommendation

The two lifecycle states should be:

| State | Trigger | Examples |
|---|---|---|
| `dissolved` (force-destruction) | Combat attrition to threshold floor; brigade ceases to exist as a fighting entity | 9th Grahovo; Cerska/Kamenica defenders |
| `disbanded` (administrative) | Faction command order; survivors absorbed/reorganised; not combat destruction | HOS; Vitezovi; PL→ARBiH transition; 9th/10th Mountain |

**Vitezovi should map to `disbanded`, not `dissolved`.** The sim's current destruction at turn 122 in calibration runs is a force-quality artifact, not historical. The historical lifecycle is "absorbed into 3rd HVO Guards Brigade" after Washington Agreement (March 1994 ≈ week 100 of apr_1992).

**Source tier:** BB1 p.220 (Cerska, 9th/10th Mountain disbandment, Skelani); BB1 p.222 (Sarajevo 1993 detail); BB1 p.455 (9th Grahovo); BB2 p.437 (Vitezovi); BB2 p.519–520 (65th Protection role); ICTY Krstić (IT-98-33-T), Mladić (IT-09-92-T), Erdemović (IT-96-22) for Krivaja-95 roster.

**Recommendation:** Add six VRS brigades + 10th Sabotage Detachment + MUP/Jahorina element to the Krivaja-95 OOB roster, with ICTY Krstić citation. Reclassify 65th Protection as VRS Main Staff motorised reserve (not RBiH, not garrison). Add the two-state lifecycle: `dissolved` (combat) and `disbanded` (administrative). Vitezovi maps to `disbanded` at ~week 100 (Washington Agreement absorption), not `dissolved`. 9th Grahovo maps to `dissolved` (combat destruction in Operation Storm/Maestral).

---

## Summary of Recommendations

| Lane | Recommendation | Source tier | Follow-up needed |
|---|---|---|---|
| H1 | Branch B — lift Sarajevo constants to scenario; keep RBiH/RS exhaustion split as two knobs | BB + ICTY (mechanism); **no source** for specific values | None — values are tuning, not canon |
| H2 | Use table for plans 1–4; treat Dayton as termination event, not envelope | BB (plans 1–4); **no source** for Dayton counters | Holbrooke / State Dept. for Dayton envelope |
| H3 | 5 of 7 forces cited and classifiable; Scorpions and Yellow Wasps need citation; PL fade week 20 → 26 | BB + ICTY (5 of 7); **no source** for Scorpions, Yellow Wasps in extracted BB pages | `/historian` for Scorpions + Yellow Wasps before they appear as named OOB units |
| H4 | `embargo_lifted` flag = 3 Nov 1994 (BB-cited); supply % bands marked as estimates | BB1 p.63, p.167; **no source** for Black Flights specifics or UNSCR 1021 | `/historian` for Iranian Black Flights and UNSCR 1021 |
| H5 | Add 6 brigades + 10th Sabotage + MUP to Krivaja-95 OOB; 65th Protection = VRS mobile reserve (not RBiH); two-state lifecycle (`dissolved`/`disbanded`); Vitezovi = `disbanded` not `dissolved` | BB + ICTY Krstić/Mladić/Erdemović | None for primary findings; future Drina Corps brigade strengths if needed |

**Gates respected:** All recommendations remain inside Ring 1 (mechanical) and Ring 2 (narrative). No recommendation creates a Ring 3 surface. Verdict-side scoring (`VICTORY_AND_PYRRHIC_SCORING.md` §3.2) unaffected; per-faction grade anchors unchanged. Srebrenica rupture trigger (§2 of Sensitive History Gate) unchanged — H5 expands the participating roster but does not alter the discrete game-state predicate for rupture firing.
