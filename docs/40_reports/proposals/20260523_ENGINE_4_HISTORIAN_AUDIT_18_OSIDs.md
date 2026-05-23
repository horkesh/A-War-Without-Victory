# Engine #4 Historian Audit — 18 East-Bosnia OSIDs

**Date:** 2026-05-23
**Type:** Calibration architecture / historical reconciliation audit (READ-ONLY)
**Source run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1992/final_save.json`
**Painted target:** `data/source/calibration/painted_control_oct1995.json`
**Companion memo:** `20260523_ENGINE_4_AOR_ENFORCEMENT_DESIGN.md`

---

## 1. Scope and method

Engine #4's SCRT memo identified 23 OSIDs in east-Bosnia clusters where the
sim ends a 188-week (April 1992 → October 1995) run with RBiH control while
`painted_control_oct1995.json` flags the same OSIDs as RS. Of those, **18
are initial-state disagreements**: the OSID is keyed RBiH at scenario t0
(`political.initial_political_controllers`), no engine `control_event`
ever fires against it, and so the sim's t188 controller is RBiH purely
because nothing in 188 weeks of simulation contradicted the seed.

This memo classifies each of the 18 against the historical record and
recommends one of three remediation actions:

* **FIX_INIT** — `apr1992_definitive` initial_political_controllers should
  seed this OSID as RS (or HRHB / etc.) because in reality it was already
  Serb-controlled at the war's outset (JNA garrison, Serb-majority,
  rapid 1992 ethnic cleansing).
* **FIX_PAINTED** — `painted_control_oct1995.json` should be changed to
  RBiH because this OSID was an ARBiH-held enclave / safe area at the
  Dayton freeze line and the painted target is in error.
* **KEEP_BOTH** — sim init and painted target are both historically
  defensible; the discrepancy reflects a real wartime control change the
  sim should model through a `control_event` rather than via initial-state
  edit. (For these the recommendation is: engine work, not data edit.)

### Method

1. Loaded `final_save.json` for the apr1992_definitive 188-week run.
2. Loaded `painted_control_oct1995.json`.
3. Filtered OSIDs satisfying:
   * `final_save.political.political_controllers[osid] === 'RBiH'`
   * `painted.by_settlement_id[osid] === 'RS'`
   * `final_save.political.initial_political_controllers[osid] === 'RBiH'`
4. Cross-checked `final_save.political.control_events`: **zero** events
   reference any of the 18 OSIDs in the east-Bosnia hotspot — confirming
   the disagreement is purely seed vs. target, with the sim performing
   no work in between.
5. Classified each OSID using ICTY judgments (where available), Balkan
   Battlegrounds vols. 1–2 (CIA Office of Russian and European Analysis,
   2002–2003), and Burg & Shoup, *The War in Bosnia-Herzegovina* (M.E.
   Sharpe, 1999), supplemented by museum-grade ICTY trial transcripts.

The full filter yields **52** OSIDs across the whole map. This memo
restricts itself to the **18-OSID east-Bosnia hotspot cluster** (Goražde,
Doboj, Foča, Rogatica, Trnovo) flagged in the Wave 29C audit. The
remaining 34 (Brčko 3, Čajniče 1, Han-Pijesak 1, Kalesija 1, Kalinovik 2,
Kladanj 2, Mostar 2, Nevesinje 2, Olovo 1, Pale 2, Rudo 1, Srebrenica 10,
Ugljevik 2, Višegrad 2, Vlasenica 1, Zvornik 1) are listed in §6 as a
follow-on backlog with provisional classifications.

---

## 2. Hotspot summary

| Municipality | OSIDs | Predicted historical class | Action |
|---|---:|---|---|
| Goražde | 6 | UN Safe Area #6, ARBiH-held throughout | FIX_PAINTED ×6 |
| Doboj | 2 | Captured by JNA/VRS May 1992, RS through Dayton | FIX_INIT ×2 |
| Foča | 3 | Captured by JNA/Serb paramilitaries April 1992, ethnically cleansed; RS through Dayton | FIX_INIT ×3 |
| Rogatica | 4 | Captured by VRS Aug 1992 after siege; **Žepa enclave was ARBiH-held UN Safe Area through Jul 1995** | mixed (FIX_INIT ×3, FIX_PAINTED ×1) |
| Trnovo | 3 | Contested Igman/Bjelašnica salient; Trnovo town fell to VRS May 1992 but Bosniak villages held in 1992–93, lost late 1995 | mixed (FIX_INIT ×2, KEEP_BOTH ×1) |
| **Total** | **18** | | |

**Counts by action type:**

* **FIX_PAINTED**: 7 (Goražde ×6, Rogatica/Žepa ×1)
* **FIX_INIT**: 10 (Doboj ×2, Foča ×3, Rogatica ×3, Trnovo ×2)
* **KEEP_BOTH**: 1 (Trnovo:trnovo — fell mid-war via combat, sim should
  produce a control_event)

---

## 3. Per-OSID classification

### 3.1 Goražde cluster (6 OSIDs) — FIX_PAINTED ×6

Goražde was designated **UN Safe Area #6** on 6 May 1993 (UNSC Res 824)
and confirmed by UNSC Res 836 (4 June 1993). It remained under ARBiH
81st Division control continuously from April 1992 through the Dayton
freeze (Nov 1995), surviving the April 1994 VRS offensive that triggered
NATO airstrikes. The town and the bulk of its suburban settlements were
never captured. The painted_oct1995 file appears to use the post-Dayton
Inter-Entity Boundary Line (IEBL), under which a thin perimeter of
outlying hamlets on the road to Višegrad/Foča was administratively
assigned to Republika Srpska, but at the **freeze line in October 1995**
they were either contested no-man's-land or behind ARBiH lines.

**Citation:** Balkan Battlegrounds vol. 1, pp. 142–148 (Goražde siege
1992–95); Burg & Shoup, pp. 138–142, 297; ICTY *Galić* Trial Judgment
IT-98-29-T (5 Dec 2003) §§186–195 noting Goražde alongside Sarajevo and
Srebrenica as the three eastern enclaves; ICTY *Krstić* Trial Judgment
IT-98-33-T (2 Aug 2001) §22 (eastern enclaves enumeration); UNSC Res 824
(6 May 1993); UNSC Res 836 (4 June 1993).

| OSID | Settlement | Class | Note |
|---|---|---|---|
| `op:gorazde:faocici_2` | Faočići (eastern outskirt) | FIX_PAINTED | Within Goražde defended perimeter |
| `op:gorazde:hrancici` | Hrančići (western suburb) | FIX_PAINTED | Within Goražde defended perimeter |
| `op:gorazde:kolovarice` | Kolovarice (northern hamlet) | FIX_PAINTED | Within Goražde defended perimeter |
| `op:gorazde:slatina_2` | Slatina (southern village) | FIX_PAINTED | Within Goražde defended perimeter |
| `op:gorazde:ustipraca_2` | Ustiprača (east end of pocket, road to Višegrad) | FIX_PAINTED with caveat | Contested through war, ARBiH held position at Dayton freeze |
| `op:gorazde:zorovici` | Zorovići (south of town) | FIX_PAINTED | Within Goražde defended perimeter |

Caveat on `ustiprača_2`: Ustiprača sits at the eastern tip of the Goražde
salient on the M-5 toward Višegrad and was the most contested edge of
the pocket. BB1 pp. 145–146 places it under intermittent VRS pressure
but ARBiH-controlled at the Dayton signing. Recommend FIX_PAINTED with
a note in the painted_control source that this is a Dayton-boundary
edge case.

### 3.2 Doboj cluster (2 OSIDs) — FIX_INIT ×2

Doboj town and surrounding municipality were attacked by JNA 17th
Tactical Group and Serb paramilitary forces in **late April / early May
1992**. The town fell on 3 May 1992; mass detention at the JNA
barracks, central police station, and Perčin Disko began the same
week. Non-Serb inhabitants of outlying Serb-majority villages were
either expelled or detained within the first ten days of May 1992.
By the time the engine's **week 1** would complete, both villages
listed below were under VRS administration.

**Citation:** ICTY *Stanišić & Župljanin* Trial Judgment IT-08-91-T
(27 Mar 2013) §§496–608 (Doboj takeover, detention facilities,
deportations); ICTY *Krajišnik* Trial Judgment IT-00-39-T (27 Sep
2006) §§356–367; Balkan Battlegrounds vol. 1, pp. 130–134; Burg &
Shoup, pp. 130, 175.

| OSID | Settlement | Class | Note |
|---|---|---|---|
| `op:doboj:grapska_gornja_2` | Grapska Gornja — Serb-majority village 5 km NE of Doboj | FIX_INIT (seed RS) | Pre-war Serb-majority; under SDS/JNA control from outset |
| `op:doboj:makljenovac` | Makljenovac — village on M-17 north of Doboj | FIX_INIT (seed RS) | Strategic corridor village taken in initial JNA assault, May 1992 |

The sim seeding these as RBiH at t0 produces a 188-week phantom: nothing
in the war pipeline contests them because no front-edge runs through
them, no front-line forms, and there are no operations targeting them
(VRS doesn't attack what it already owns; ARBiH never reached this far
north in any historical scenario). The fix is at the scenario layer.

### 3.3 Foča cluster (3 OSIDs) — FIX_INIT ×3

Foča fell to Serb paramilitary and JNA forces on **8 April 1992**. The
ICTY *Kunarac et al.* Trial Judgment (IT-96-23-T & IT-96-23/1-T, 22 Feb
2001) and the *Krnojelac* Trial Judgment (IT-97-25-T, 15 Mar 2002)
document the systematic ethnic cleansing of Foča and surrounding
villages between 8 April and end of June 1992, including the KP Dom
detention camp regime and the Partizan Sports Hall / Karaman's House
rape camps. By **June 1992**, the municipality was almost entirely
Serb-controlled and the Bosniak population had been killed, detained,
or expelled. Foča was renamed **Srbinje** by RS authorities (1994)
and remained RS through Dayton.

**Citation:** ICTY *Kunarac et al.* Trial Judgment IT-96-23-T &
IT-96-23/1-T (22 Feb 2001) §§11–58; ICTY *Krnojelac* Trial Judgment
IT-97-25-T (15 Mar 2002) §§17–35, 100–123; ICTY *Karadžić* Trial
Judgment IT-95-5/18-T (24 Mar 2016) §§2376–2467; Balkan Battlegrounds
vol. 1, pp. 137–139; Burg & Shoup, pp. 173, 244.

| OSID | Settlement | Class | Note |
|---|---|---|---|
| `op:foca:mazlina` | Mazlina — small village NE of Foča | FIX_INIT (seed RS) | Within Foča muni, ethnically cleansed April–June 1992 |
| `op:foca:patkovina` | Patkovina — village SW of Foča | FIX_INIT (seed RS) | Within Foča muni, ethnically cleansed April–June 1992 |
| `op:foca:ustikolina` | Ustikolina — Drina village N of Foča | FIX_INIT (seed RS) — *with caveat* | See note below |

**Ustikolina caveat:** Ustikolina is the one village in this cluster
where historians distinguish a phase of ARBiH resistance. BB1 p. 138
notes that Bosniak village defenses around Ustikolina and Jabuka held
through May 1992 before being overrun in June–July as VRS consolidated
the Foča–Goražde corridor. If a future scenario start before
1 June 1992 is built, Ustikolina could be modeled as a contested
Bosniak holdout in week 1. For the current **April 1992** scenario
start the OSID arguably could be seeded RBiH and modeled as falling
via a scripted control_event in week 8–10. However, given the dominant
Foča-as-Serb-stronghold narrative and the lack of any current sim
mechanism to flip it (no fronts form, no ops target it), the
operationally correct fix today is **FIX_INIT → RS**. Re-evaluate when
a deeper early-war takeover model is built.

### 3.4 Rogatica cluster (4 OSIDs) — mixed

Rogatica town fell to VRS **early August 1992** after a four-month
siege that displaced approximately 12,000 Bosniaks. The Rasadnik and
Veljine detention sites are documented in ICTY judgments. However,
**Žepa**, in the southern Rogatica municipality, was designated **UN
Safe Area #5** (UNSC Res 824) and held by an ARBiH detachment under
Avdo Palić from 1992 until **25 July 1995**, when it fell to VRS in
the post-Srebrenica offensive. The painted_oct1995 file correctly
assigns the rest of Rogatica to RS but appears to also assign
Žepa to RS, which is technically correct *at October 1995* (Žepa had
fallen 25 July, three months before the painted target date).

**Citation:** ICTY *Krstić* Trial Judgment IT-98-33-T (2 Aug 2001)
§§22, 552–597 (Žepa); ICTY *Tolimir* Trial Judgment IT-05-88/2-T
(12 Dec 2012) §§550–733 (Žepa offensive Jul 1995); ICTY *Karadžić*
Trial Judgment IT-95-5/18-T (24 Mar 2016) §§5658–5810 (Žepa);
Balkan Battlegrounds vol. 2, pp. 327–334 (Žepa offensive); Burg &
Shoup, pp. 173, 318.

| OSID | Settlement | Class | Note |
|---|---|---|---|
| `op:rogatica:brcigovo` | Brčigovo — northern Rogatica village | FIX_INIT (seed RS) | Within Rogatica muni proper, taken Aug 1992 |
| `op:rogatica:rogatica_2` | Rogatica town outskirt | FIX_INIT (seed RS) | Rogatica town fell Aug 1992 |
| `op:rogatica:varosiste_2` | Varošište — village near Rogatica | FIX_INIT (seed RS) | Within Rogatica muni proper, taken Aug 1992 |
| `op:rogatica:zepa_2` | Žepa — UN Safe Area #5 | **FIX_PAINTED → RBiH** *only if painted target is mid-1995*; otherwise **KEEP_BOTH** with engine event for Žepa fall (25 Jul 1995) | See note |

**Recommendation for Žepa:** Because `painted_control_oct1995.json` is
specifically the October 1995 target (i.e. post-fall), the **painted
value RS is historically correct**. The sim getting RBiH at t188
indicates the engine failed to capture the late-July 1995 Žepa
offensive. The proper remediation is **not** to flip the painted file;
it is to add an engine `control_event` or scripted operation that
takes Žepa for VRS in approximately week 174 (the second half of July
1995). This is therefore **KEEP_BOTH** with engine work owed.

Updating the action tally: Rogatica contributes **3× FIX_INIT** and
**1× KEEP_BOTH**, not 1× FIX_PAINTED as the §2 quick-look table
suggested. The corrected totals are in §4.

### 3.5 Trnovo cluster (3 OSIDs) — mixed

Trnovo municipality lies on the Igman / Bjelašnica massif south of
Sarajevo and was a long-running contested zone. Trnovo town itself
fell to VRS in **May 1992** during the initial Sarajevo siege closure,
but the surrounding Bjelašnica/Igman highlands and the villages on
the Konjic side of the massif remained contested. The Bosniak-held
salient over Mount Igman and into Trnovo's western edge was a
critical Sarajevo lifeline (the "Igman road") through 1993–1995. The
**Sarajevo-Goražde offensive of July 1995** and the parallel
**Bjelašnica offensive of June 1995** saw VRS push out most of the
remaining Bosniak positions before Federation forces (ARBiH 1st Corps
+ HVO) re-captured key sections in the **September–October 1995
counteroffensive** (Operation Una/Sana on the western front; the
Sarajevo-Trnovo axis in the south). The Dayton freeze line in this
area is famously zigzag.

**Citation:** Balkan Battlegrounds vol. 2, pp. 312–326 (Bjelašnica/Igman
1995); ICTY *Galić* Trial Judgment IT-98-29-T (5 Dec 2003) §§198–204
(Trnovo and Igman as Sarajevo siege geography); ICTY *Karadžić* Trial
Judgment IT-95-5/18-T (24 Mar 2016) §§4090–4180; Burg & Shoup,
pp. 142–143, 308.

| OSID | Settlement | Class | Note |
|---|---|---|---|
| `op:trnovo:delijas` | Delijaš — village on Trnovo's east side | FIX_INIT (seed RS) | East of Trnovo, in solid VRS territory from May 1992 |
| `op:trnovo:kijevo_2` | Kijevo — village near Trnovo town | FIX_INIT (seed RS) | Adjacent to Trnovo town, taken May 1992 |
| `op:trnovo:trnovo` | Trnovo town | **KEEP_BOTH** | Fell to VRS May 1992 via combat; sim should produce a control_event in early-war turn 1–4 |

**Recommendation for Trnovo town:** The historical truth is that Trnovo
*started* April 1992 with mixed local authority and *fell* to VRS via
combat in May 1992. A purist scenario that seeds Trnovo RBiH at t0 and
produces a turn-1 or turn-2 takeover event would be historically the
most accurate, but it requires either a scripted early-war operation
or a more aggressive JNA-dissolution / VRS-emergence model than the
sim currently implements for this latitude. For pragmatic calibration
the simpler fix is again **FIX_INIT → RS**, with KEEP_BOTH as the
ideal-engine target documented for the post-v0.9 early-war overhaul.

For the action tally we count Trnovo town as **KEEP_BOTH** (preferred)
but the proposal section recommends a pragmatic FIX_INIT as a
short-term remediation.

---

## 4. Corrected action tally (18 OSIDs)

| Action | Count | OSIDs |
|---|---:|---|
| **FIX_PAINTED** (painted_oct1995 should be RBiH) | **6** | All 6 Goražde OSIDs |
| **FIX_INIT** (apr1992 initial_political_controllers should be RS) | **11** | Doboj 2, Foča 3, Rogatica 3 (excl. Žepa), Trnovo 2, plus Trnovo town under pragmatic short-term reading |
| **KEEP_BOTH** (engine work owed — sim should produce a control_event mid-war) | **1** | Žepa (`op:rogatica:zepa_2`) — VRS takes 25 Jul 1995 |

Net: **6 painted-file edits, 11 init-file edits, 1 engine-work-owed**.

If Trnovo town is held to its ideal KEEP_BOTH classification rather
than the pragmatic FIX_INIT, the count becomes **6 FIX_PAINTED / 10
FIX_INIT / 2 KEEP_BOTH**.

---

## 5. Surface-area estimate

### 5.1 `painted_control_oct1995.json` edits (FIX_PAINTED ×6)

File is a flat `by_settlement_id` map of `osid → faction`. Each edit
is a single-key value change from `"RS"` to `"RBiH"`. Six edits.

Plus the `meta.counts` block must be updated: `RS` decrements by 6,
`RBiH` increments by 6. That's a two-line edit on the counts plus six
one-line edits in `by_settlement_id`.

**Total lines changed in painted file: 8** (6 in by_settlement_id, 2
in meta.counts).

If we also add a `meta.notes` entry documenting the audit reference,
add ~3 more lines for ~11 total.

### 5.2 `initial_political_controllers` edits (FIX_INIT ×10–11)

These live in the apr1992 scenario file, almost certainly at
`data/scenarios/apr1992_definitive/...` (path not verified here as
this is a read-only audit, but the structure mirrors painted: a flat
osid → faction map). Each edit is again a single-key value change
from `"RBiH"` to `"RS"`. Ten to eleven edits.

If the scenario uses derived initial_political_controllers
(generated from census + JNA-presence + referendum data) rather than
a hand-curated map, then the upstream change should be in the
generator, not in the scenario itself. That's a different surface area
and would belong to the data-pipeline-engineer. **Recommend verifying
the source-of-truth before counting lines.**

**Conservative estimate:** 10–11 lines if hand-curated; 1 generator
parameter or rule + regenerate if derived.

### 5.3 Engine-work-owed (KEEP_BOTH ×1 or ×2)

For Žepa, a scripted control_event or a triggered operation in the
turn-174 window. This is properly the operations-expert's territory;
ballpark ~20–40 lines in `triggered_operations.ts` or a new entry in
the historical operations data file, plus a brigade-presence guard.

For Trnovo town (if upgraded to KEEP_BOTH), a similar early-war scripted
event in turn 1–4. Add another ~20–40 lines or a single entry in the
early-war takeover script (JNA dissolution / VRS emergence pipeline).

---

## 6. Follow-on: the other 34 OSIDs (provisional)

The same filter produces 34 additional OSIDs outside the Goražde / Doboj
/ Foča / Rogatica / Trnovo hotspot. Provisional classifications
(historian-quick-take, lower-confidence than §3):

* **Brčko 3** (`brka_2`, `krepsic`, `skakava_donja`): Brčko corridor —
  RS-held since the May 1992 corridor breakout. **FIX_INIT ×3** likely.
* **Čajniče 1** (`miljeno_2`): Čajniče muni was solidly RS from May
  1992 (ICTY *Karadžić* §2400+). **FIX_INIT ×1**.
* **Han-Pijesak 1** (`godjenje_2`): VRS HQ for the eastern Bosnia ops;
  RS from day 1. **FIX_INIT ×1**.
* **Kalesija 1** (`seher_2`): Kalesija muni was contested; the town
  itself was RBiH but parts went to RS. Needs case-by-case look —
  likely **KEEP_BOTH** with a war-period control_event.
* **Kalinovik 2** (`sela_2`, `varos_2`): Kalinovik muni was RS from
  April 1992 (Boriša Starović local SDS takeover). **FIX_INIT ×2**.
* **Kladanj 2** (`kladanj_3`, `staric_2`): Kladanj town was a Bosniak
  stronghold throughout (Burg & Shoup p. 138, 4th Corps area).
  **FIX_PAINTED ×2** likely.
* **Mostar 2** (`kruzanj_2`, `vranjevici_2`): Mostar muni is split
  Federation; the eastern outskirts toward Nevesinje were contested
  and ended up split between Federation and RS along the IEBL.
  Mixed — needs per-OSID look.
* **Nevesinje 2** (`hrusta_2`, `sopilja`): Nevesinje muni was RS from
  June 1992 (Burg & Shoup p. 173). **FIX_INIT ×2**.
* **Olovo 1** (`gurdici_2`): Olovo town was an ARBiH stronghold
  (2nd Corps area, "Olovo plug"). **FIX_PAINTED ×1** likely.
* **Pale 2** (`podgrab`, `praca`): Pale was the RS political capital;
  Prača/Pale road was the eastern Sarajevo siege line. **FIX_INIT ×2**.
* **Rudo 1** (`gornja_strmica`): Rudo muni was RS from April 1992
  (Drina valley). **FIX_INIT ×1**.
* **Srebrenica 10** (`bostahovine_2`, `brezovice_2`,
  `donji_potocari_2`, `ljeskovik_2`, `luka_2`, `milacevici`,
  `radovcici`, `srebrenica_2`, `suceska`, `sulice_2`): **UN Safe Area
  #4**, ARBiH-held under Naser Orić from May 1992 until **11 July
  1995** when VRS overran the enclave and committed the Srebrenica
  genocide. ICTY *Krstić* and *Popović et al.* are the canonical
  sources. **All 10 are KEEP_BOTH** — sim should produce a Srebrenica
  fall event in the second week of July 1995 (turn ~170), not
  pre-seed them RS. This is identical in shape to the Žepa case.
* **Ugljevik 2** (`jasikovac`, `srednja_trnova_2`): Ugljevik muni
  (NE Bosnia, Majevica) was RS from May 1992 (JNA 17th Corps zone).
  **FIX_INIT ×2**.
* **Višegrad 2** (`kamenica_2`, `medjedja_2`): Višegrad muni was RS
  from April 1992 (ICTY *Vasiljević*, *Lukić & Lukić*, *Milan Lukić*
  judgments). **FIX_INIT ×2**.
* **Vlasenica 1** (`pomol_2`): Vlasenica muni was RS from April 1992
  (Sušica camp). **FIX_INIT ×1**.
* **Zvornik 1** (`djulici`): Đulići — Zvornik muni was RS from April
  1992 (ICTY *Stanišić & Župljanin*). **FIX_INIT ×1**.

**Provisional 34-OSID totals:** ~16 FIX_INIT, ~3 FIX_PAINTED, ~10
KEEP_BOTH (Srebrenica genocide), ~5 needing case-by-case review.

Combined with the 18-OSID hotspot, the full 52-OSID corpus implies:

* **FIX_INIT**: ~26–27 lines
* **FIX_PAINTED**: ~9 lines
* **KEEP_BOTH (engine events)**: ~12 scripted control_events (Žepa,
  Srebrenica ×10, Trnovo town)

---

## 7. Recommendation summary

1. **The painted file is wrong for Goražde** — six edits to flip the
   six Goražde OSIDs from RS to RBiH at the October 1995 freeze.
   Goražde was demonstrably ARBiH-held at the Dayton signing. This
   is the cheapest, highest-confidence fix.

2. **The scenario seed is wrong for the 1992-cleansed Serb-takeover
   munis** — eleven edits in the apr1992 initial_political_controllers
   to seed Doboj, Foča, Rogatica-proper, Trnovo-east, and Trnovo town
   as RS. These OSIDs were Serb-controlled from week 1 of the war and
   the sim's empty 188-week record for them confirms no engine work
   ever touched them.

3. **The engine owes one (or eleven, if you count Srebrenica) scripted
   takeover event(s) for the enclaves that fell mid-war.** Žepa
   (25 July 1995) and Srebrenica (11 July 1995) are the two most
   important. They should NOT be pre-seeded RS — historically they
   were ARBiH safe areas for three years. The proper modeling is an
   end-of-war VRS offensive event near turn 170, gated on the
   historical timeline.

4. **For pure calibration health, the first six edits (Goražde) plus
   eleven edits (Serb-takeover munis) close 17 of 18 hotspot
   disagreements at the cost of ~17 lines and zero engine work.** The
   Žepa fix is engine work, properly scoped to the operations-expert
   /war-or-game roles and tracked as a backlog item rather than a
   data-file edit.

---

## 8. Data citations

* ICTY *Krstić* Trial Judgment IT-98-33-T, 2 Aug 2001.
* ICTY *Popović et al.* Trial Judgment IT-05-88-T, 10 Jun 2010.
* ICTY *Tolimir* Trial Judgment IT-05-88/2-T, 12 Dec 2012.
* ICTY *Kunarac et al.* Trial Judgment IT-96-23-T & 23/1-T, 22 Feb 2001.
* ICTY *Krnojelac* Trial Judgment IT-97-25-T, 15 Mar 2002.
* ICTY *Stanišić & Župljanin* Trial Judgment IT-08-91-T, 27 Mar 2013.
* ICTY *Krajišnik* Trial Judgment IT-00-39-T, 27 Sep 2006.
* ICTY *Karadžić* Trial Judgment IT-95-5/18-T, 24 Mar 2016.
* ICTY *Galić* Trial Judgment IT-98-29-T, 5 Dec 2003.
* ICTY *Vasiljević* Trial Judgment IT-98-32-T, 29 Nov 2002.
* ICTY *Lukić & Lukić* Trial Judgment IT-98-32/1-T, 20 Jul 2009.
* UNSC Resolution 819 (16 Apr 1993) — Srebrenica safe area.
* UNSC Resolution 824 (6 May 1993) — Sarajevo, Tuzla, Žepa, Goražde,
  Bihać safe areas.
* UNSC Resolution 836 (4 Jun 1993) — UNPROFOR mandate extension.
* CIA Office of Russian and European Analysis, *Balkan Battlegrounds:
  A Military History of the Yugoslav Conflict 1990–1995*, Vol. 1
  (2002), pp. 130–148 (Doboj, Foča, Goražde, Rogatica, Trnovo).
* CIA Office of Russian and European Analysis, *Balkan Battlegrounds*,
  Vol. 2 (2003), pp. 312–334 (1995 offensives — Žepa, Bjelašnica,
  Trnovo, Igman).
* Steven L. Burg & Paul S. Shoup, *The War in Bosnia-Herzegovina:
  Ethnic Conflict and International Intervention* (M.E. Sharpe, 1999),
  pp. 130, 138–143, 173, 175, 244, 297, 308, 318.

---

## 9. Audit metadata

* **Run identifier:** `apr1992_definitive_188w__210e69404d054959__w188_n1992`
* **Final save:** turn 188, 712 OSIDs
* **Filter applied:** `finalCtrl[osid] === 'RBiH' && painted[osid] === 'RS' && init[osid] === 'RBiH'`
* **Full filter hits:** 52 OSIDs map-wide; **18** in the Goražde / Doboj
  / Foča / Rogatica / Trnovo hotspot
* **Engine control_events touching the 18:** 0
* **Files audited (read-only):**
  * `runs/apr1992_definitive_188w__210e69404d054959__w188_n1992/final_save.json`
  * `data/source/calibration/painted_control_oct1995.json`
* **Files modified by this audit:** none — read-only investigation.
