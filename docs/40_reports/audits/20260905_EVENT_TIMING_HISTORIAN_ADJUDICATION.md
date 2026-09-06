# Historical adjudication — event TIMING clustering in the AWWV event catalog

**Role:** Historian (Pyrrhic). **Date:** 2026-09-05. **Scope:** read-only; no code or data changed.
**Repo:** F:\A-War-Without-Victory · **Run:** `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390/`
**Source rule applied:** ICTY first, Balkan Battlegrounds second, cross-checked (per `docs/life_lessons`).

---

## 0. The week↔date epoch — MEASURED, not assumed

The brief asked me to state my week-1 assumption. I did not have to assume: **the engine states it.**

`src/scenario/scenario_runner.ts:1963`
```ts
state.meta.scenario_start_date = { year: 1992, month: 3, day: 6 };
```
`month` is 0-indexed (`src/sim/combat/seasonal_effects.ts:123`: *"Each turn = 1 week. Month is 0-indexed in scenario_start_date."*), so **month 3 = April**. Scenario epoch = **6 April 1992** — the day of EC/US recognition of BiH. `week_index` in `weekly_report.jsonl` runs **1..188**.

**Mapping used throughout this report:**

> **week N = floor((date − 6 Apr 1992) / 7) + 1**, i.e. week N spans `6 Apr 1992 + 7(N−1)` .. `+7N−1`.

**Validated against five pinpoint (`turn_min == turn_max`) catalog entries** whose real dates are unambiguous, before I used it for anything:

| Catalog event | turn | Real date | Formula gives |
|---|---|---|---|
| `vance_owen_plan_1993` | 39 | 2 Jan 1993 (VOPP tabled, Geneva) | 39 ✓ |
| `un_resolution_819_srebrenica_1993` | 54 | 16 Apr 1993 (UNSCR 819) | 54 ✓ |
| `un_safe_areas_declared_1993` | 57 | 6 May 1993 (UNSCR 824) | 57 ✓ |
| `markale_massacre_1994` | 96 | 5 Feb 1994 (Markale I) | 96 ✓ |
| `operation_storm_1995` | 174 | 4 Aug 1995 (Oluja) | 174 ✓ |

Five independent hits, no drift. The epoch is sound and the arithmetic below is reliable. Anchor spans used repeatedly:

- week 4 = **27 Apr – 3 May 1992**
- week 14 = **6 – 12 Jul 1992**
- week 54 = **12 – 18 Apr 1993**
- week 160 = **24 – 30 Apr 1995**

---

## 1 & 2. Cluster-by-cluster verdicts

### Week 4 — the four "Battles of the Barracks" → **AUTHORING ARTIFACT**

All four carry `turn_min=4, turn_max=6`. In reality these were four **separate, staged, differently-resolved** events spread across six weeks, with sharply different characters (one seizure by force, one ambush of a withdrawing column, two negotiated evacuations).

| Event | Real date | MEASURED / INFERRED | True week |
|---|---|---|---|
| **Visoko** — TO seizes two JNA barracks, captures most of the arms | **26 Apr 1992** | MEASURED (Wikipedia *Visoko*; corroborates local TO accounts) | **3** |
| **Sarajevo** — JNA facility blockade begins; Dobrovoljačka St ambush 3 May | 2–3 May 1992 | MEASURED | **4** |
| **Tuzla** — Brčanska Malta; 92nd Motorised Bde ambushed withdrawing from Husinska Buna barracks | **15 May 1992** | MEASURED (Serbian War Crimes Prosecutor indictment, 9 Nov 2007; Wikipedia) | **6** |
| **Zenica** — Bilimišće barracks evacuated after negotiation, no shots fired | **18 May 1992** | MEASURED (Zenicainfo/Zenicablog 33rd-anniversary reporting; blockade already lethal by 13 May — Matea Jurić killed) | **7** |
| **Sarajevo** — Viktor Bubanj barracks evacuated ("liberated") | **24 May 1992** | MEASURED (*Oslobođenje*, "Na današnji dan – 24. maj") | **7** |
| **Sarajevo** — last JNA personnel leave the city | 5–6 Jun 1992 | MEASURED | **9** |

**Verdict: ARTIFACT.** Real span is **weeks 3 → 9** (26 Apr – 5 Jun 1992). The catalog compresses six weeks into a three-week window and fires all four on the same tick. Only **Visoko** is anywhere near correctly placed (real week 3, catalogued 4–6).

Two further notes:

- **Naming.** "Battle of the Barracks" (*Bitka za vojarne*) is properly a **Croatian War** term — the Sep 1991–Jan 1992 campaign against JNA garrisons in Croatia. Borrowing it for Bosnia 1992 is defensible shorthand but is not the historiographical name; in BiH these are the *blokada/deblokada kasarni*. Worth a Narrative Designer look, not a historical blocker.
- **Character, not just date.** Tuzla was an *ambush of a withdrawing column under an existing agreement* (the JNA was scheduled out of BiH by 19 May); Zenica and Viktor Bubanj were *negotiated evacuations without a shot*; Visoko was a *seizure*. Modelling all four as one event type on one turn erases the single most historically interesting thing about them — that the JNA's exit from Bosnia was negotiated in most places and violently contested in a few.

**Bonus finding — the hardcoded Graz Accords is off by one week.** `src/sim/turn_phases/war_phases.ts:1062` comments *"fires at week 4 (6 May 1992)"*. Under the engine's own epoch, **6 May 1992 is week 5**, not week 4 (week 4 ends 3 May). The Boban–Karadžić Graz meeting was 6 May 1992. Small, but it is a hardcode whose comment contradicts the engine's own calendar.

---

### Week 14 — Prijedor takeover + three camps → **AUTHORING ARTIFACT (and both halves are late)**

Week 14 = **6–12 July 1992**. Nothing in this cluster happened in July.

| Event | Real date | MEASURED / INFERRED | True week |
|---|---|---|---|
| **Prijedor takeover** | **30 Apr 1992** (night 29–30 Apr) | MEASURED — ICTY *Stakić* (IT-97-24-T), *Brđanin* (IT-99-36-T), *Tadić* (IT-94-1-T) | **4** |
| **Omarska / Keraterm / Trnopolje established** | **~24–25 May 1992**, "towards the end of May 1992" | MEASURED — ICTY *Kvočka et al.* (IT-98-30/1-T, TJ 2 Nov 2001): crimes charged **26 May – 30 Aug 1992** | **8** |

**Verdict: ARTIFACT, twice over.**

1. **The two halves are not simultaneous.** The takeover of Prijedor (30 Apr) precedes the camps (late May) by **four weeks**. The intervening causal chain is the substance of the ICTY Prijedor cases: takeover 30 Apr → the Hambarine checkpoint incident and the **attack on Kozarac, 24–26 May 1992** → mass detention → camps. Collapsing takeover and camps onto one turn deletes the *reason the camps existed*: they were the disposal mechanism for a population removed by an armed operation a month earlier. That is not a cosmetic ordering complaint; the sequence is the finding of fact in *Stakić* and *Kvočka*.
2. **Both halves are placed far too late.** Prijedor is **10 weeks late** (week 4 → catalogued 14); the camps are **6 weeks late** (week 8 → catalogued 14).

The **missing middle** is `kozarac_attack_1992` — 24–26 May 1992, week 8 — which the catalog does not contain at all. Adding it would make the cluster legible.

`concentration_camps_revealed_1992` (turn_min 16, fired w17) is approximately right: Gutman's *Newsday* "The Death Camps of Bosnia" ran **2 Aug 1992** (week 17); ITN footage was filmed 5 Aug, broadcast 6 Aug. Leave it.

---

### Week 54 — mid-April 1993 → **CORRECT COMPRESSION. Do not touch.**

Week 54 = **12–18 April 1993**. This is the single best-dated cluster in the catalog, and it is *right*.

| Event | Real date | MEASURED / INFERRED | True week |
|---|---|---|---|
| **Ahmići massacre** (~116 Bosniak civilians) | **16 Apr 1993** | MEASURED — ICTY *Kupreškić et al.* (IT-95-16-T), *Blaškić* (IT-95-14-T), *Kordić & Čerkez* (IT-95-14/2-T) | **54** |
| **Trusina killings** (Konjic; ~22 Croat civilians/POWs, ARBiH 4th Corps) | **16 Apr 1993** | MEASURED — Court of BiH, *Memić et al.*; ICTY-adjacent | **54** |
| **UNSCR 819** (Srebrenica declared a safe area) | **16 Apr 1993** | MEASURED — UN | **54** |
| **UNSCR 820** (sanctions tightening) | **17 Apr 1993** | MEASURED — UN | **54** |
| **Sovići/Doljani attack** (HVO, Jablanica mun.) | **begins 17 Apr 1993**, runs to 23 Apr | MEASURED — ICTY *Prlić et al.* (IT-04-74-T) | **54** |
| **Srebrenica demilitarization agreement** (Halilović–Mladić, Wahlgren/Morillon) | **18 Apr 1993** | MEASURED — UN/UNPROFOR | **54** |

**All six fall inside 12–18 April 1993.** Every one lands in week 54 by the formula. This is not authoring laziness — it is the historical fact. Mid-April 1993 is the hinge week of the war: the Croat–Bosniak war goes fully kinetic in the Lašva Valley and Neretva on the same days the Security Council creates the safe-area regime that will fail at Srebrenica 27 months later. **The catalog is correct and the clustering is a virtue, not a defect.** If anything the game should *mark* this week as exceptional rather than dilute it.

The two week-54 entries that are *not* pinpoint-dated — `milosevic_vopp_pressure` (54–62) and `csq_hvo_central_bosnia_offensive_1993` — are process/consequence rows with legitimately wide windows. Fine.

---

### Week 160 — the 1995 cluster → **AUTHORING ARTIFACT (a shared floor masquerading as a cluster)**

Week 160 = **24–30 April 1995**. Not one of these six events happened in April 1995. All six share `turn_min=160` and then spread via wide `turn_max` values — so the "cluster" is really a **common floor set ~4–9 weeks too early**, with the engine's own drift doing the staging.

| Event | Real date | MEASURED / INFERRED | True week | Catalog `turn_min` | Fired at | Error |
|---|---|---|---|---|---|---|
| **Tuzla Kapija massacre** (71 killed, ~150 wounded) | **25 May 1995** | MEASURED | **164** | 160 | w160 | **4 wks early** |
| **UN hostage crisis** (377 UNPROFOR seized after the Pale strikes) | **25–26 May 1995** | MEASURED (NATO PR (95)53, 26 May 1995) | **164** | 160 | w160 | **4 wks early** |
| **Srebrenica falls** | **11 Jul 1995** | MEASURED — ICTY *Krstić* (IT-98-33-T), *Popović et al.* (IT-05-88-T) | **171** | 160 | **w162** | **9 wks early** |
| **Srebrenica column breakout** (Šušnjari/Jaglići, night 11–12 Jul) | **12 Jul 1995** | MEASURED — *Krstić*, *Popović* | **171** | 160 | **w163** | **8 wks early** |
| **Žepa falls** | **25 Jul 1995** | MEASURED — ICTY *Tolimir* (IT-05-88/2) | **173** | 160 | **w164** | **9 wks early** |
| `un_safe_area_enforcement_1995` | (composite/process) | — | — | 160 | w163 | n/a |

**Two distinct problems, and the second is serious.**

1. **The late-May pair and the July trio are seven weeks apart in reality.** Tuzla Kapija and the hostage crisis are *causally one event* — the VRS shelled Tuzla on 25 May in direct retaliation for the first NATO Pale air strike that same day, and seized the hostages the next day. Co-locating *those two* is correct compression. But binding them to the same `turn_min` as Srebrenica and Žepa is not: they are the **May** crisis, and Srebrenica/Žepa are the **July** catastrophe. The intervening seven weeks (the RRF deployment, the collapse of the safe-area regime's credibility) are the causal bridge.

2. **Srebrenica falls on 8–14 May 1995 in-game against 11 July 1995 in history — nine weeks early. Žepa likewise.** This is the finding I would put in front of the panel. It is consistent with the known hardcoded-write mechanism (`memory/srebrenica_fall_is_a_hardcoded_write.md`: all 10 OSIDs flip in one tick at t162, mechanism=`event`, zero of 599 battles ever target the enclave). The **ENCLAVE GUARD is satisfied in letter** — Srebrenica and Žepa do fall — **but the campaign dates the genocide to May instead of July**, and it falls *before* the Split Agreement, *before* the RRF is even authorised, and in the wrong strategic context entirely. A player reading the in-game chronicle would take away a false sequence of cause and effect about the best-documented atrocity of the war.

   I am flagging this as **§6-adjacent and panel-worthy** (see §5 below), separately from the timing fix.

---

## 3. Corrected `turn_min` values

Week-1 assumption stated and derived in §0: **week 1 = 6–12 April 1992**, from `scenario_runner.ts:1963`.

### Worked arithmetic (two, as requested)

**(a) Prijedor takeover, 30 April 1992.**
Days from epoch: 30 Apr 1992 − 6 Apr 1992 = **24 days**.
week = floor(24 / 7) + 1 = floor(3.43) + 1 = 3 + 1 = **week 4**.
Check: week 4 spans 6 Apr + 21 = 27 Apr .. 3 May 1992. 30 Apr ∈ [27 Apr, 3 May] ✓.
Catalog has 14 → **10 weeks late**.

**(b) Srebrenica falls, 11 July 1995.**
Days from epoch: 6 Apr 1992 → 6 Apr 1995 = 1095 days (1992's leap day, 29 Feb, precedes the epoch, so three plain 365-day years). 6 Apr → 11 Jul 1995 = 24 (rest of Apr) + 31 (May) + 30 (Jun) + 11 (Jul) = 96. Total **1191 days**.
week = floor(1191 / 7) + 1 = floor(170.14) + 1 = 170 + 1 = **week 171**.
Check: week 171 spans 10–16 Jul 1995. 11 Jul ∈ that ✓.
Catalog has 160, fired w162 → **9 weeks early**.

### Table of corrections

| Event id | Current `turn_min`–`turn_max` | **Corrected `turn_min`** | Suggested `turn_max` | Real date |
|---|---|---|---|---|
| `battle_of_the_barracks_visoko` | 4–6 | **3** | 4 | 26 Apr 1992 |
| `battle_of_the_barracks_sarajevo` | 4–6 | **4** | 9 | 2 May – 5 Jun 1992 (blockade → final JNA exit) |
| `battle_of_the_barracks_tuzla` | 4–6 | **6** | 7 | 15 May 1992 |
| `battle_of_the_barracks_zenica` | 4–6 | **7** | 8 | 18 May 1992 |
| `graz_accords` (hardcode, war_phases.ts:1062) | wk 4 | **5** | — | 6 May 1992 |
| `prijedor_takeover_1992` | 14–30 | **4** | 6 | 30 Apr 1992 |
| *(new)* `kozarac_attack_1992` | — | **8** | 9 | 24–26 May 1992 |
| `omarska_camp_1992` | 14–30 | **8** | 10 | ~25 May 1992 |
| `keraterm_camp_1992` | 14–30 | **8** | 10 | ~24 May 1992 |
| `trnopolje_camp_1992` | 14–30 | **8** | 10 | ~24–25 May 1992 |
| `concentration_camps_revealed_1992` | 16–30 | 17 (≈ correct, optional) | 19 | 2–6 Aug 1992 |
| **week 54 cluster (all six)** | 54–… | **NO CHANGE — correct** | — | 16–18 Apr 1993 |
| `tuzla_gate_massacre_1995` | 160–160 | **164** | 164 | 25 May 1995 |
| `un_hostage_crisis_1995` | 160–163 | **164** | 167 | 25 May – 18 Jun 1995 |
| `srebrenica_falls_1995` | 160–185 | **171** | 172 | 11 Jul 1995 |
| `srebrenica_column_breakout_1995` | 160–190 | **171** | 173 | 11–16+ Jul 1995 |
| `zepa_falls_1995` | 160–190 | **173** | 174 | 25 Jul 1995 |

**Caution flagged, not resolved:** narrowing `turn_max` on `srebrenica_falls_1995` / `zepa_falls_1995` touches the **ENCLAVE GUARD**. I am recommending the *dates*; whether the windows may be tightened without risking a non-fall is the panel's call, not mine, and must be measured before it is merged.

### Secondary drift found while validating (not asked for, but material)

Late-1994 rows have accumulated a consistent 3–5-week **early** bias that is not visible as a "cluster":

| Event id | `turn_min` | True week | Error |
|---|---|---|---|
| `contact_group_plan_1994` | 117 | 118 | 1 early |
| `bihac_5th_corps_offensive_1994` | 129 | ~134 | 5 early |
| `operation_cincar_1994` | 131 | 135 | 4 early |
| `bihac_crisis_1994` | 135 | 138 | 3 early |
| `carter_ceasefire_1994` | 138 | 142 | 4 early |
| `coha_ceasefire_begins_1995` | 139 | 143–144 | 4–5 early |
| `coha_expires_1995` | 156 | 161 | 5 early |
| `operation_flash_1995` | 157 | 161 | 4 early |

`embargo_lifted_non_enforcement_1994` (136 vs true 136) and the whole 1993 file are clean, so this is localised to late-1994/early-1995 authoring. **This bias is itself a partial cause of the w140–144 drought** (§4): the events that belong there were placed 4–5 weeks earlier, vacating the window.

---

## 4. Droughts — what the calendar says should be there

### w112–116 = **23 May – 26 Jun 1994**

The post-Washington-Agreement diplomatic lull. Genuinely quieter than its neighbours, but not empty:

- **Contact Group formed, London, 26 Apr 1994** (US/Russia/UK/France/Germany) — week 108, just before the window, and **entirely absent from the catalog**; `contact_group_plan_1994` (w117) jumps straight to the plan without the body existing. MEASURED.
- **Federation of BiH constitution adopted 30 Mar 1994**, with the Vienna military/defence annexes negotiated **May 1994** — the actual machinery of the Washington Agreement. The catalog has `rbih_/hrhb_federation_army_integration_1994` at w120–124, ~4 months after the fact. INFERRED placement.
- **ARBiH 2nd/3rd Corps operations around Ozren and Vlašić, Jun 1994** — the low-intensity continuation the COHA-less summer. INFERRED; would need BB for precise framing.

**Assessment: a real lull, mildly under-served.** Lowest priority of the five. One event (Contact Group formation, w108) is the clear gap.

### w124–128 = **15 Aug – 18 Sep 1994**

**Not a lull — this is a densely eventful month the catalog simply omits.** Highest-value drought.

- **Velika Kladuša falls to the ARBiH 5th Corps, 21 Aug 1994** — Operation Tiger '94 (2 Jun – 21 Aug 1994) ends; **Abdić's Autonomous Province of Western Bosnia is abolished**; ~30,000 of Abdić's supporters flee into Krajina, the largest refugee movement in over a year, *Bosniaks fleeing Bosniaks*. Week **124** — dead centre of the drought. MEASURED (*Christian Science Monitor*, 24 Aug 1994; *Vreme* No. 153, 29 Aug 1994). **The catalog has `abdic_apwb_declared_1993` (w77) and `abdic_karadzic_pact_1993` (w80) but nothing that ends the APWB.** An arc is opened and never closed.
- **RS National Assembly rejects the Contact Group plan, 8 Aug 1994** (week 123) → **RS referendum, 27–28 Aug 1994, plan rejected by 96.65%** (936,934 No / 32,429 Yes) — week **125**. MEASURED (Wikipedia *1994 Republika Srpska Contact Group partition plan referendum*; sudd.ch direct-democracy database). This is the decisive political rupture between Pale and Belgrade, and the catalog's `rs_contact_group_response_1994` (w118) fires *before* either. The referendum itself is absent.
- **UNSCR 942/943, 23 Sep 1994** (week 129, just past the window) — 942 tightened sanctions on RS, 943 partially suspended sanctions on FRY *rewarding* Milošević's 4 Aug border closure. MEASURED. The catalog has `belgrade_embargo_rs_1994` (w121) but not the international quid pro quo that paid for it.

**Assessment: ARTIFACT drought. Three first-rank political events missing.** Recommend prioritising this window.

### w140–144 = **5 Dec 1994 – 8 Jan 1995**

Largely **self-inflicted** by the late-1994 early-bias documented in §3:

- **Carter in Pale, 19–20 Dec 1994** → true week **142**; catalogued at 138.
- **COHA signed 31 Dec 1994, in force 1 Jan 1995** (four months) → true week **143**; catalogued at 139.

Move those two to their real weeks and roughly half this drought closes by itself. Genuinely missing from the window:

- **UNSCR 970, 12 Jan 1995** (FRY border-closure monitoring as sanctions condition) — week 145, at the edge. MEASURED.
- The **Bihać crisis** cluster is also misplaced early: NATO strike on **Udbina airfield, 21 Nov 1994** and the SAM strikes near Otoka **23 Nov 1994**, UNSCR 958 (**19 Nov 1994**) — all true week **138**, catalogued `bihac_crisis_1994` at 135.

**Assessment: mostly a placement artifact, not a content gap.** Fixing §3's drift is the cheaper repair.

### w146–155 = **16 Jan – 26 Mar 1995** (10 weeks)

The COHA freeze. The brief is right that combat is frozen by design — but this was one of the **busiest diplomatic stretches of the war**, and the catalog has *nothing* in it.

- **UNSCR 981 / 982 / 983, all adopted 31 Mar 1995** — week **156**, immediately after the window: **UNPROFOR in Croatia becomes UNCRO** (981, mandate to 30 Nov 1995), UNPROFOR retained in BiH (982), UNPREDEP in Macedonia (983). MEASURED (UN Digital Library; UNSCR 981 text). The *negotiation* over this restructuring ran through Feb–Mar 1995 and is the political spine of the window. **Nothing in the catalog represents the UNPROFOR→UNCRO transition at all.**
- **Croatia's refusal to extend UNPROFOR's mandate** (announced Jan 1995; mandate expiry 31 Mar 1995 is MEASURED, the specific January announcement date is **INFERRED and should be verified** before it is authored). This is what forces 981.
- **Contact Group "Z-4 Plan" for Croatia presented 30 Jan 1995** — week 148, squarely inside. MEASURED. Rejected by the RSK; sets up Flash and Storm.
- **Clinton meets Tuđman and Federation leaders, 16 Mar 1995** (Washington Accords first anniversary) — week 154. MEASURED (Clinton White House archive, 1995-03-16). Commemorative, but a usable political beat.
- **ARBiH operations around Mt. Vlašić, ~20 Mar 1995** — week 155; the COHA effectively breaking before its formal expiry. INFERRED framing; the political event (COHA collapse) is what matters, not the combat.

**Assessment: ARTIFACT drought, and the most defensible one to fill** — every candidate is political/diplomatic, so nothing here perturbs the frozen-combat design. Recommend second priority after w124–128.

**Correction to a candidate named in the brief:** the **Split Agreement is 22 July 1995**, not March 1995 (Tuđman, Izetbegović, Zubak, Silajdžić; Croatia commits the HV to relieve Bihać). MEASURED. It belongs at **week 172** — *not* in this drought, but it is **absent from the catalog entirely**, and it is the political trigger for Summer '95, Storm and Mistral 2, all three of which the catalog does model. That is a causally load-bearing omission: three Croatian operations occur with no event explaining why Croatia entered Bosnia. I found no evidence of a distinct March 1995 Croatian–Bosnian military agreement; if one is believed to exist it should be sourced before authoring.

### w184–188 = **9 Oct – 12 Nov 1995**

**Not a content gap — a firing failure plus a horizon problem.**

- **Countrywide ceasefire signed 5 Oct 1995** (Izetbegović; Karadžić and Mladić for RS; witnessed by Amb. John Menzies and Milošević), **in force 12 Oct 1995**, "60 days or until completion of proximity talks, whichever is later." Week **183–184**. MEASURED (PA-X agreement 322; UN Peacemaker). The catalog **has** `ceasefire_1995` (window 181–200) — **and it never fired in this run.**
- Also non-firing in the run: `us_halts_federation_advance_1995`, `dayton_talks_begin_1995`, `dayton_signed_1995`, `rs_dayton_acceptance_1995`, `hrhb_dayton_acceptance_1995`.
- **Mrkonjić Grad taken ~10 Oct 1995**; Ključ and Sanski Most 10–13 Oct — week 184. The Sana/Mistral endgame.
- **Dayton proximity talks open 1 Nov 1995** = week **187** (inside the run); **initialled 21 Nov 1995** = week **190**; **signed in Paris 14 Dec 1995** = week **193**.

**Assessment: two separate defects.** (i) `ceasefire_1995` and the Dayton rows are catalogued in-window but silent — that is a *gating* bug to hand to the engine lane, not a timing question for me. (ii) **A 188-week campaign ends two weeks before Dayton is initialled.** If "play through to Dayton" is the D2 goal, the horizon needs to be **≥190 weeks** (initialling) or **≥193** (Paris signature). Flagging for the roadmap; not my call.

---

## 5. RULING — `ahmici_massacre_1993`

### The brief's premise is incorrect, and the real cause is worse

The brief states Ahmići is blocked on a flag "that no event and no code ever writes (verified: zero writers in `src/`)". **The `src/` observation is correct but the conclusion does not follow — the writer is in data, not code.**

`data/scenarios/events/war_1992.json` → `hvo_arbih_tensions_rise_1992` ("HVO–ARBiH Clash at Prozor", window 20–35) carries:
```json
"sets_flags": { "hvo_arbih_tensions_rising": true }
```
**It fires at w23 in this very run** (`weekly_report.jsonl`, w23), and the final save confirms the write:
`military.event_flags.hvo_arbih_tensions_rising = true`.

**The flag is live. It is not the blocker.**

### The actual blocker: an OSID-granularity artifact

Ahmići's trigger is an `and` of two conditions. The failing one is the first:

```json
{ "type": "faction_controls_municipality", "faction": "HRHB",
  "municipality": "vitez", "threshold": 0.5 }
```

The evaluator (`src/sim/events/event_types.ts:749-755`) counts OSIDs matching `:vitez:` and requires `controlled / total >= 0.5`.

**Measured in this run:** Vitez municipality has exactly **three** OSIDs. HRHB holds exactly **one**.

| OSID | `initial_save.json` | `final_save.json` |
|---|---|---|
| `op:vitez:vitez_2` | HRHB | HRHB |
| `op:vitez:kruscica` | RBiH | RBiH |
| `op:vitez:preocica_3` | RBiH | RBiH |

Vitez appears in **zero of the 201 control flips** recorded across the 188 weeks (`control_delta.json` contains no Vitez entry; no Vitez OSID appears anywhere in `weekly_report.jsonl`, which does carry 287 distinct OSIDs — so this is a true absence, not a reporting gap).

**HRHB control of Vitez = 1/3 = 0.333 from turn 1 to turn 188, constant. The gate demands ≥ 0.500. Ahmići is not improbable — it is arithmetically unreachable, in every playthrough, for the entire campaign.**

Two aggravating details:

1. **`turn_min = 54` is historically exact.** Ahmići was 16 April 1993 = week 54 (§0 formula, §2). Whoever authored this row got the date perfectly right. The date is not the problem.
2. **The painted initial control disagrees with the runtime initial state.** `data/derived/operational/operational_initial_master.json` paints **all three** Vitez OSIDs `political_controller: HRHB` (all `contested_control: true`, `CONTESTED`, `stability_score: 55`). The run's `initial_save.json` has only one. The `init_control_mode: hybrid_1992` census-based initialisation is overriding the paint. That divergence is worth a separate look by the data lane — I note it, I do not adjudicate it.

Historically, a 1/3 split is not absurd for Vitez *municipality*: the HVO held Vitez town and the Lašva valley strip while Stari Vitez remained a besieged ARBiH pocket inside the town, and Kruščica was Bosniak. The defect is that a **3-OSID municipality cannot express "the HVO controlled the town and its approaches"** at a 0.5 threshold. The gate encodes a resolution the map does not have.

### Ruling on the historical question

**Yes. A campaign in which Ahmići never happens is making a historical claim the project has not signed off on — and it is making it silently.**

My reasoning, as Historian:

- Ahmići is not a marginal incident. It is the **most judicially documented crime of the Croat–Bosniak war**, the subject of four ICTY trial judgements (*Kupreškić*, *Blaškić*, *Kordić & Čerkez*, and evidentially in *Prlić*), and the event that made the Lašva Valley campaign legible as a *campaign* rather than a series of clashes. ~116 Bosniak civilians killed in a few hours on 16 April 1993.
- The catalog's own week-54 cluster models **Trusina the same day** — an ARBiH crime against Croat civilians — and **Sovići/Doljani the next day**. Both fire. Ahmići does not. The result is a campaign in which mid-April 1993 renders **the Bosniak-perpetrated massacre and the HVO's territorial attack, but not the HVO-perpetrated massacre.** I want to be precise about the nature of this claim: it is not that the game asserts Ahmići did not happen. It is that the game's mid-April-1993 chronicle is **selectively complete in one direction**, every time, deterministically. Given that AWWV's stated thesis is that atrocity is never rewarded and the war is negative-sum, a permanent one-sided omission at exactly the moment the catalog otherwise depicts atrocity from two directions is a fidelity problem the project should own consciously rather than inherit from a threshold constant.
- The omission is **invisible from the run artifacts** — a non-firing event leaves no trace. This has presumably been true of every 188-week campaign the project has run.

### Recommendation — **this needs the panel, and it is §6 business**

I am **not** ruling on §6 myself; the Sacred Rules assign §6 and the bright line to the Pyrrhic panel, and this is squarely §6-adjacent under `SENSITIVE_HISTORY_DESIGN_GATE.md`. My recommendation to the panel:

1. **Convene the standard §6 four** (Historian + scenario-tester/calibration + Engine/systems + Red-team). This does **not** need the broader eight-seat panel — nothing here proposes to cross the bright line. It proposes to *stop silently under-representing one side's atrocity*, which moves toward the stated thesis, not away from it.
2. **The fix is the gate, not the date.** `turn_min = 54` is correct and must not be touched. Candidate remedies, in my order of preference:
   - **Lower the threshold to `0.33`** — matches the map's actual resolution and the historical fact that the HVO held Vitez town. Smallest change, no map work, immediately testable.
   - **Re-target the condition to the specific OSID** `op:vitez:vitez_2` rather than a municipality fraction — most faithful, since Ahmići is a village in the HVO-held zone, not a function of municipal share.
   - **Do not** simply delete the control condition; the event should stay conditional on the HVO actually holding the ground, or it becomes a railroad (`feedback_emergent_not_railroads`).
3. **Audit for siblings.** `faction_controls_municipality` gates with `threshold >= 0.5` against small-OSID municipalities are a defect *class*, not one row. I checked Ahmići because I was asked to; I did not sweep the catalog. That sweep should be commissioned — any other event silently dead for the same reason is another unexamined historical claim.
4. **Separately**, the `operational_initial_master` vs `hybrid_1992` Vitez divergence (3 HRHB painted, 1 HRHB at runtime) should go to the data lane. It may be correct behaviour; it is at minimum undocumented.

I also recommend the panel consider, as a **second and independent §6 item**, the **nine-week-early fall of Srebrenica and Žepa** documented in §2. The enclave guard holds in letter, but the campaign dates the genocide to May 1995 rather than July 1995, before the Split Agreement and before the RRF existed. That is a stronger historical claim than a missing massacre, and it is currently shipping.

---

## Appendix — MEASURED vs INFERRED

**MEASURED from source** (dates I verified this session against ICTY, UN, PA-X, NATO, contemporaneous press, or specialist reporting): all four barracks dates; Graz 6 May 1992; Prijedor 30 Apr 1992; Kozarac 24–26 May 1992; camps ~24–25 May / 26 May – 30 Aug 1992; Gutman 2 Aug 1992; all six week-54 events; Markale I 5 Feb 1994; Washington Agreement 18 Mar 1994; Contact Group 26 Apr 1994; FRY border closure 4 Aug 1994; RS Assembly rejection 8 Aug 1994; Velika Kladuša 21 Aug 1994; RS referendum 27–28 Aug 1994 (96.65% No); UNSCR 942/943 23 Sep 1994; Udbina 21 Nov 1994; Carter 19–20 Dec 1994; COHA 31 Dec 1994 / 1 Jan 1995; UNSCR 970 12 Jan 1995; Z-4 30 Jan 1995; Clinton meeting 16 Mar 1995; UNSCR 981–983 31 Mar 1995; Pale strikes + Tuzla Kapija 25 May 1995; hostage crisis 25–26 May 1995 (377 hostages); UNSCR 998 16 Jun 1995; Srebrenica 11 Jul 1995; column 11–12 Jul 1995; Split Agreement 22 Jul 1995; Žepa 25 Jul 1995; Storm 4 Aug 1995; 5 Oct 1995 ceasefire (in force 12 Oct); Dayton 1 Nov / 21 Nov / 14 Dec 1995.

**MEASURED from the repo** (not history — engine/run facts I verified directly): epoch 6 Apr 1992 (`scenario_runner.ts:1963`); `week_index` 1..188; Vitez 3 OSIDs / HRHB 1 in both `initial_save.json` and `final_save.json`; zero Vitez control flips in 201 total; `hvo_arbih_tensions_rising = true` in `military.event_flags`; `hvo_arbih_tensions_rise_1992` fires w23; `operational_initial_master.json` paints all 3 Vitez OSIDs HRHB; `ceasefire_1995` and the five Dayton rows never fire.

**INFERRED** (reasoning, not a cited date — treat as hypotheses): the exact January 1995 date of Croatia's UNPROFOR non-renewal announcement; ARBiH Ozren/Vlašić operation framing for w112–116 and w155; suggested `turn_max` values in §3 (I set dates, not window widths); the characterisation of the late-1994 3–5-week bias as a single authoring episode.

**CORRECTED** (claims in the brief or in circulation that I found to be wrong): Ahmići is *not* blocked by an unwritten flag — the flag is written in `war_1992.json` and is true from w23; the blocker is the `>=0.5` Vitez control threshold against a 3-OSID municipality. The Split Agreement is 22 July 1995, not March 1995.

## Sources

- [ICTY Kvočka et al. (IT-98-30/1) trial judgement](https://www.icty.org/x/cases/kvocka/tjug/en/kvo-tj011102e-1.htm) · [case summary](https://cglj.org/human-rights-law/international-criminal-law/icty/case-summaries/kvocka/)
- [ICTY Blaškić trial judgement (Vitez/Ahmići findings)](https://www.icty.org/x/cases/blaskic/tjug/en/bla-tj000303e-3.htm)
- [1992 JNA column incident in Tuzla](https://en.wikipedia.org/wiki/1992_Yugoslav_People's_Army_column_incident_in_Tuzla) · [Serbian War Crimes Prosecutor indictment, 9 Nov 2007](https://www.asser.nl/upload/documents/DomCLIC/Docs/NLP/Serbia/TuzlaColumn_Indictement_9-11-2007.pdf) · [kultura sjećanja: Tuzla, Brčanska Malta](https://kulturasjecanja.org/en/tuzla-brcanska-malta/)
- [Oslobođenje — Viktor Bubanj barracks, 24 May 1992](https://www.oslobodjenje.ba/dosjei/vremeplov/na-danasnji-dan-24-maj-oslobodena-je-kasarna-bivse-jna-viktor-bubanj-1043771/)
- [Zenicainfo — 33rd anniversary of the Zenica barracks evacuation](https://zenicainfo.ba/2025/05/19/sjecanje-povodom-33-godisnjice-iseljavanja-kasarne-u-zenici-koja-je-protekla-bez-ijednog-incidenta/) · [Zenicablog video/witness accounts](https://www.zenicablog.com/video-pogledajte-autenticne-snimke-izlaska-jna-iz-zenice-i-izjave-svjedoka-i-aktera/)
- [Visoko — JNA barracks seized 26 April 1992](https://en.wikipedia.org/wiki/Visoko)
- [1992 JNA column incident in Sarajevo (Dobrovoljačka)](https://en.wikipedia.org/wiki/1992_Yugoslav_People's_Army_column_incident_in_Sarajevo) · [Siege of Sarajevo](https://en.wikipedia.org/wiki/Siege_of_Sarajevo)
- [1994 Republika Srpska Contact Group partition plan referendum](https://en.wikipedia.org/wiki/1994_Republika_Srpska_Contact_Group_partition_plan_referendum) · [sudd.ch direct-democracy record, 28 Aug 1994](https://sudd.ch/event.php?amp=&id=ba011994&lang=en)
- [Operation Tiger (1994) / APWB collapse](https://en.wikipedia.org/wiki/Operation_Tiger_(1994)) · [Christian Science Monitor, 24 Aug 1994](https://www.csmonitor.com/1994/0824/24091.html) · [Vreme News Digest No. 153, 29 Aug 1994](http://www.scc.rutgers.edu/serbiandigest/153/t153-7.htm)
- [May 1995 Pale air strikes and hostage crisis](https://en.wikipedia.org/wiki/May_1995_Pale_air_strikes) · [NATO Press Release (95)53, 26 May 1995](https://www.nato.int/docu/pr/1995/p95-053.htm) · [Washington Post, 27 May 1995](https://www.washingtonpost.com/archive/politics/1995/05/27/serbs-take-hostages-after-airstrike/3ac0c3f0-64a7-467c-b103-93351bf18d08/)
- [Split Agreement, 22 July 1995](https://en.wikipedia.org/wiki/Split_Agreement)
- [UNSCR 981 (1995) — UNPROFOR → UNCRO](https://digitallibrary.un.org/record/283910?ln=en) · [UNSCR 982](https://en.wikipedia.org/wiki/United_Nations_Security_Council_Resolution_982)
- [PA-X: Cease-fire Agreement for Bosnia and Herzegovina, 5 Oct 1995](https://www.peaceagreements.org/agreements/322/) · [UN Peacemaker record](https://peacemaker.un.org/en/node/9390)
- [House of Commons Research Paper 95/55, "Bosnia and Croatia: the conflict continues", 1 May 1995](https://researchbriefings.files.parliament.uk/documents/RP95-55/RP95-55.pdf)
- [Clinton White House archive, 16 March 1995](https://clintonwhitehouse6.archives.gov/1995/03/1995-03-16-president-meets-with-croat-and-bosnian-leaders.html)
