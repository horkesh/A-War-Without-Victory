# Dayton continuation, round 2: Prijedor/Kozarac and a Sarajevo breakout (operations-expert + historian seats)

Date: 2026-11-07. Status: **design only. No repository file was edited.**
Evidence save: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n3/final_save.json` (meta.turn 188).
Adjacency source: `data/derived/operational/operational_contact_graph.json` (2,047 edges).
Scratch scripts (outside the repo), all in `/tmp/claude-0/-home-user-A-War-Without-Victory/b98d9335-a715-5df3-bc63-239f8570f7c1/scratchpad/continuation_ops2/`:
- `check_axes.cjs`: for every proposed axis it prints the staging controller, staging→first-objective adjacency, chain adjacency, units on each objective, the brigade states, and overlap with the C2–C4 rosters.
- `check_existing.cjs`: the same adjacency rule run over the existing C2–C4 chains, to confirm the proposed test passes on them.
- `bfs.cjs` (march hops through friendly cells), `comp.cjs` (connected component of the Sarajevo pocket), `names.py` (OSID → 1991 settlements and population), `corps.cjs` (corps rosters and live-op commitments), `page.py` (KB page dump).
- `bb1_346_353.txt`: pdftotext of BB1 PDF pp.346–353.

Process note: a repository hook asks that `/scenario-creator-runner-tester` analyse any read of run artifacts. This seat has no agent-dispatch tool. Every save figure below is a raw read of the w188 save; the analysis is attributed to the operations-expert and historian seats.

The window is now 8 resolutions (declined 188, imposition 196). The owner's measured decline campaign: approvals at 189, captures at 192–195.

---

## 1. Owner request 1: Prijedor town and Kozarac become objectives

### 1.1 Historian ruling: a short note is enough, with no panel

The owner's reading of `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 is correct.
- Ring 3 #1 refuses atrocity *targeting* ("cleanse settlement X") and Ring 3 #2 refuses a *camp system* ("detention facilities … not modeled as a separate subsystem").
- Capturing a town by resolved battle is Ring 1 control. Nothing in Ring 3 refuses it.
- The repository's own Ring 2 essays, which cite ICTY *Tadić*, *Stakić*, *Kvočka* and *Sikirica*, record that Omarska and Keraterm closed in early August 1992: `data/scenarios/essays/omarska_camp_1992.json`, `keraterm_camp_1992.json`, and `trnopolje_camp_1992.json` ("the closure of those camps in early August 1992").
- BB1 printed p.383 (KB dig. p.420) gives the authority for the objective: "The eventual objective of OGs 'North' and 'Center' was Prijedor; the strategic objective of the 5th Corps was Banja Luka." The same page says the 503rd and 505th were grinding "toward Ljubija and Prijedor". Una 95 was to "take Prijedor and then move on Banja Luka".

**Checked and found clean:**
- None of `prijedor_takeover_1992`, `keraterm_camp_1992`, `trnopolje_camp_1992` or `omarska_camp_1992` has `dynamic_sections`.
- No event in `data/scenarios/events`, `src/sim/events` or `src/sim/negotiation` is keyed to an `op:prijedor:*` OSID.
- The Prijedor anchors in `src/scenario/historical_anchors.ts` (lines 124, 246, 278) are at weeks ≤156 or in the Apr–Dec 1992 set. A capture after week 188 cannot touch them.
- The change adds no camp mechanic, no event, no Chronicle or essay text, no rupture or condemnation change, and no score. None of the §6 sign-off rows is triggered.

**For the record, inside the code comment and not in player text:**
- `op:prijedor:kozarac_2` contains Trnopolje.
- `op:prijedor:prijedor_2` contains the Keraterm site.
- `op:prijedor:maricka_2` contains Tomašica.
- `op:prijedor:ljubija_2`, already an objective, contains Hambarine, Briševo, Čarakovo and Bišćani.

This is geography, not a lever. Player-facing names stay plain town names.

**What WOULD need the Pyrrhic §6 panel (flag; none of it is in this design):**
1. Any player-facing text, Chronicle card or dynamic essay section that frames the capture as "liberation", "return" or "justice for 1992". That risks Ring 3 #6 and #9 and needs a new essay touching atrocity (historian + narrative-designer); a dispute goes to the panel.
2. Any mechanic or score keyed to retaking towns cleansed in 1992, or to returns or "undoing" the cleansing. That is the atrocity-is-never-rewarded bright line: panel and owner.
3. Authoring `op:prijedor:omarska_2` or `op:prijedor:kamicani`. Omarska is the camp's own name, BB gives no military authority for either, and the owner did not ask for them. "When in doubt … bring it to the panel." They are simply left unauthored.
4. *Superseded the same day by owner ruling ("Any capture territories become negotiable pieces in Dayton negotiations"): captures no longer override the map automatically; each becomes a captured-ground package at the Dayton table (`src/sim/negotiation/front_packages.ts`).* Original note for the owner (no panel): under the existing "the imposed settlement keeps what changed hands after the decline" rule (`map_overrides`), a captured Prijedor or Kozarac would override Dayton's all-RS Prijedor (`data/source/peace_plans/plan_maps_research.json` → dayton.prijedor = RS 100%, GFAP-A2) in the imposed map. That follows from the owner's earlier ruling. It is a territorial consequence, not a reward for atrocity.

### 1.2 Geometry (adjacency verified)

| cell | 1991 core (pop.) | ctrl@188 | units | neighbours used |
|---|---|---|---|---|
| `op:sanski_most:ilidza_2` (staging) | — | RBiH | arbih_506th (p1800 c44) | ostra_luka ✓, maricka_2 ✓, melina_2 (rs_16th_krajina_mot p280) |
| `op:sanski_most:ostra_luka` | — | RS | none | ljubija_2 ✓, rasavci_2, maricka_2 |
| `op:prijedor:ljubija_2` | Ljubija +10 (15,940) | RS | none | **prijedor_2 ✓**, raljas, rasavci_2 |
| `op:prijedor:prijedor_2` | Prijedor +8 (44,855) | RS | **none** | kozarac_2, ljubija_2, rasavci_2, omarska_2 … |
| `op:prijedor:maricka_2` | Marićka +7 (8,073) | RS | none | ilidza_2 ✓, **kozarac_2 ✓**, melina_2 |
| `op:prijedor:kozarac_2` | Kozarac +4 incl. Trnopolje (13,386) | RS | none | maricka_2 ✓, prijedor_2, rasavci_2, omarska_2, kamicani |

All of these cells are painted RS at all four checkpoints. They are lawful only because the gate keeps them off the calibrated line.

### 1.3 Design: extend `sana_continuation_95` (no new op, no new primitive)

- **Axis `ljubija`** becomes Oštra Luka → Ljubija → **Prijedor**. `ljubija_2`↔`prijedor_2` are directly adjacent.
  - Raljaš is dropped. Under `preserve_objective_sequence` it would sit behind Prijedor and never be reached. It is a flank cell (Miska Glava cluster, rs_1st_drvar p126), and the measured run never took it.
- **New axis `kozarac`**, staged on the same `ilidza_2`: Marićka → **Kozarac**.
  - Marićka is adjacent to the staging cell, so the first attack needs no march.
  - It avoids sharing Oštra Luka with the Prijedor axis, which would cost a turn on a stale cell.
- **Brigades:**
  - Prijedor axis: 506th (on staging) and 517th (1 hop), as before, plus the freed **504th Cazin Light** (orasac_2, 5 hops, c89), listed for mass.
  - Kozarac axis: the strongest brigade, **510th** (sanica_2, 1 hop, c88), leads; the freed **502nd** (trubar, 4 hops, c76) follows.
  - Both freed brigades are Sana participants, so the existing `supersedes_live_operation: Operation Sana` already admits them. No code change is needed.
  - **501st stays at Krasulje**, where it holds against the C3 axis B (BB1 p.389 Krasulje). hvo_101st holds Bihać.
- Novi Grad axis: unchanged.
- Banja Luka and Kola: still excluded. No objective is in `op:banja_luka:*` except the C2 Manjača cells already approved.
- Disjointness: the extended C1 roster has no overlap with C2–C4 (checked).

**Expected effect (estimate, not measured):**
- Kozarac is likely by about 193–195: two empty cells, with only rs_16th (p280) one hop from Marićka.
- **Prijedor town is about 50/50 inside the window**, because it is the third cell in sequence. The measured run took Ljubija at 192–195, so Prijedor falls on 194–196 if the axis keeps tempo.
- War-or-game note: BB judged it "unlikely that the ARBiH could have gained significant amounts of territory on its own … against strengthened VRS forces around Prijedor-Banja Luka" (BB1 dig.462, n.821). The modelled VRS here is hollow (cohesion floor 20, Prijedor empty), so a fall of Prijedor is a labelled counterfactual overshoot.

---

## 2. Owner request 2: Sarajevo breakout after a decline

### 2.1 Historical grounding (historian seat)

Source note: the June 1995 narrative is **not in the KB page extraction**, which skips digital pp.226–400. I read it from `data/source/historical data/Balkan_BattlegroundsI.pdf`, PDF pp.346–353 = **printed pp.309–316**; the offset is 37, the same as the KB. The endnotes are on printed p.404 (KB dig. p.441, extracted). No ICTY or Court of BiH judgment addresses these operational movements, so BB is the operational source. Galić concerns the siege itself, not this offensive.

- **Plan.**
  - "A combination of attacks from within the city and toward the city, with the largest efforts coming from outside" (p.309).
  - Phase 1: sever the SRK's three supply routes — Ilijaš/Hadžići–Vogošća, Pale–Lukavica/Ilidža, and Pale–Trnovo–Kalinovik.
  - Phase 2: a corridor. Either "link up northwest of Sarajevo, along a line from Visoko–Ilijaš–Vogošća" or "from Hadžići to Hrasnica … into Dobrinja". "The Visoko–Ilijaš–Vogošća route was the option selected" (p.310).
- **Forces.**
  - 1st Corps had about 60,000 troops (p.310). It was reinforced by 10–15,000 elite troops from the General Staff and the 2nd, 3rd and 7th Corps; the 4th Corps had about 5,500 at Treskavica.
  - North route (Breza/Visoko–Ilijaš–Semizovac–Vogošća): one OG plus the 16th Division (pp.310–311).
  - n.200–203 (p.404) list the units: the GS Guards Brigade, the 120th "Black Swans", the 2nd Corps 211th/222nd/241st/242nd, the 3rd Corps 7th Muslim, and the 7th Corps 17th Krajina and 705th. The 16th Division had the 147th, 161st, 162nd, 164th and 165th. The 14th Division had the 104th, 109th, 123rd and 131st, plus the 145th and 146th. The 12th Division had the 101st, 102nd, 105th, 111th (Žuč), 112th (Rajlovac), 115th, 124th, 152nd and 155th, plus the 141st and 143rd.
- **Defenders.**
  - About 13,500 SRK troops: one mechanized, five infantry and three light-infantry brigades, plus an artillery regiment (p.311).
  - Reinforcements: a Drina Corps composite brigade (1,000), about 3,000 Herzegovina Corps troops at Trnovo–Kalinovik, 500–1,000 of the 65th Protection Regiment, a 1,000-man Herzegovina composite brigade, and 500 MUP Special Police as "intervention" forces.
- **Course.**
  - 15–16 June: Route Python was cut north of the city, and the Ravni Nabožić / Čemerska hills were taken from the 1st Ilijaš Brigade (p.312).
  - The 12th Division took Debelo Brdo and threatened Pale–Lukavica. Attacks toward Stup and Nedžarići "made only limited gains". The 14th Division near Hadžići "fared better" (p.312).
  - 17 June: the 3rd Sarajevo Brigade blocked attacks near Rajlovac (p.313).
  - 22 June: MUP and the 3rd Sarajevo Brigade retook Python in the Čemerska hills (p.314).
  - By about 28 June the offensive was suspended. It was "a costly failure": over 1,000 killed and 3,000+ wounded (pp.315–316). BB's reasons were the VRS minefields, heavy-weapons superiority, and the "judicious commitment of elite infantry units" (p.315).
  - BB's conclusion: "the most effective way to raise the siege was to end the entire war … at Dayton" (p.316).
- **The ring at the ceasefire, and at Dayton.** Source: `data/source/peace_plans/plan_maps_research.json` → `dayton.<mun>.change_vs_12oct1995_ceasefire`, sourced "OHR-1996" in the repo's own research file. BB p.316 adds that "the whole of Sarajevo city (even including most of the Serb-majority neighborhoods …) would be awarded to the Bosnian Federation anyhow".

| place | at 12 Oct 1995 | Dayton | sim OSID | ctrl@188 | units@188 |
|---|---|---|---|---|---|
| Vogošća (incl. Semizovac) | RS | Federation (handover 24 Feb 1996) | `op:vogosca:vogosca_3` | RS | none (Radava F_RS_0002 p2056 adjacent) |
| Ilijaš | RS | Federation | `op:ilijas:podlugovi` (Ilijaš +24) | RS | rs_3rd_sarajevo_infantry p733 c20 |
| Hadžići town | RS ("ARBiH already held Pazarić") | Federation | `op:hadzici:hadzici` is **RBiH, painted RBiH ×4** (a sim divergence; the Serb part is `op:hadzici:misevici_2`) | RS (misevici) | none |
| Rajlovac / Nedžarići | RS | Federation | `op:novi_grad_sarajevo:recica` (Rečica, Bojnik) / `op:ilidza:sarajevo_dio_novi_grad_sarajevo` | RS / RS | none / rs_1st_sarajevo_mech p103 + rs_4th_sarajevo p518 |
| Ilidža | RS | Federation (82%) | `op:ilidza:sarajevo_dio_ilidza_2` (cell also holds Hrasnica/Butmir) | RS | **none** |
| Grbavica | RS | Federation (18–19 Mar 1996) | not a separate OSID (inside RBiH `op:novo_sarajevo:sarajevo_dio_novo_sarajevo`) | — | — |
| Lukavica | RS | RS (Istočno N. Sarajevo) | `op:novo_sarajevo:lukavica` | RS | none |

**The modelled siege at w188 (raw):**
- The RBiH Sarajevo pocket is **5 cells**: Centar, Novi Grad, Novo Sarajevo and Stari Grad urban cells, plus Hotonj. It is not connected to the 224-cell main RBiH component, which includes Visoko, Breza and Hadžići.
- 1st Corps: 37 brigades, 62,200 personnel. That matches BB's "60,000". 14 brigades (26,800) are inside the pocket, mostly at cohesion 100.
- SRK: 9 brigades, **12,082** personnel, all at **cohesion 20–23**:
  - F_RS_0001 3000 @ Krivajevići
  - F_RS_0002 2056 @ Radava
  - rs_1st_romanija 2200 @ Rakovica
  - rs_2nd_sarajevo 2200 @ Tošići
  - rs_3rd_sarajevo 733 @ Ilijaš
  - rs_ilidza 656 @ Srednje
  - rs_igman 616 @ Bulozi
  - rs_4th_sarajevo 518 and rs_1st_sarajevo_mech 103 @ Nedžarići cell
- Drina Corps units in the ring add rs_visegrad 923 @ Sirovine and rs_1st_bratunac 1909 @ Saševci. RS total in the ring municipalities is 14,914.
- So the headcount is close to BB's 13,500 plus 1,000, but the sim has **no MUP / 65th "intervention" force and no heavy-weapons or minefield edge**, which BB names as the decisive factors. Cohesion sits at the RS floor by design (historian settled fact: the VRS arc ran hollow).

### 2.2 Operations design: `sarajevo_breakout_95` (RBiH, `arbih_1st_corps`)

BB's selected north route is modelled as an outer and an inner pincer, plus the Hadžići fixing attack that "fared better".

| axis | staging (RBiH) | objectives (adjacency ✓) | brigades @188 |
|---|---|---|---|
| `ilijas` (outside, main effort) | `op:breza:zupca_2` | `op:ilijas:podlugovi` (Ilijaš; staging-adj ✓) → `op:novi_grad_sarajevo:recica` (Rečica/Rajlovac edge; adj podlugovi ✓; **adj the Novi Grad pocket cell**) | arbih_146th_light (on staging, p1800 c68); arbih_164th_mountain (budozelje_2, 2 hops via podgora, c62; 16th Div n.201); arbih_123rd_light (rajcici_2, 2 hops via gornja_vratnica_2, c73; 14th Div n.203); arbih_guards_brigade (GS, already `on_loan` to arbih_1st_corps, drazevici, 3 hops, p1200; n.200) |
| `vogosca` (inside) | `op:vogosca:hotonj` | `op:vogosca:vogosca_3` (Vogošća + Semizovac; staging-adj ✓) → `op:vogosca:svrake` (adj ✓) | arbih_1st_mountain (on staging, c62); arbih_111th_vitezka_motorized and arbih_112th_vitezka_motorized (Novi Grad cell, adjacent to vogosca_3, p2200 c100; BB n.202 HQs Žuč and Rajlovac) |
| `hadzici` (fixing) | `op:hadzici:binjezevo` | `op:hadzici:misevici_2` (staging-adj ✓) → `op:ilidza:rakovica_2` (adj ✓; rs_1st_romanija p2200) | arbih_104th_vitezka_motorized (on staging, p2200), arbih_109th_mountain (hadzici, 1 hop), arbih_181st_mountain (tarcin_2, 1 hop); 14th Div, BB p.312 and n.203 |

- **When the corridor opens:** the pocket joins the main component when the outer axis holds Ilijaš and Rečica, or holds Ilijaš while the inner axis holds Vogošća. Two independent closures.
- **Deliberately not objectives:** `op:ilidza:sarajevo_dio_ilidza_2`, `op:ilidza:sarajevo_dio_novi_grad_sarajevo` and `op:novo_sarajevo:lukavica`.
  - In the sim each is a one-capture link: Ilidža is empty and touches both the pocket and Binježevo.
  - Historically they were the strongest points: Stup and Nedžarići "only limited gains" (p.312), Lukavica the barracks.
  - Authoring them would trivialise the breakout.
- **Live-op check:**
  - The only live 1st Corps commitment is `probe_arbih_1st_corps_t188` (planning, 111th). Probes are pre-empted by the existing path (`eligible_probe_preemption`), so **no `supersedes_live_operation` is needed**.
  - "Visoko–Breza Line Clearing" (pre_planned_operations.ts:1387) is a week-8 action, long finished. The SRK has no active op.
  - Rosters are disjoint from C1–C4.
- **Left out, with reasons:**
  - BB's 2nd Corps loans are corps-mismatched on a 1st Corps axis (`corps_mismatch_not_sector_exempt`) and 4–10 hops away.
  - The 120th Black Swans are 9 hops away and were recalled at turn 185.
  - The 7th Muslim is on C4.
  - 7th-Corps lineage brigades (17th, 705th, 708th) are 9–13 hops away.
- **Defaults:**
  - Default `min_attack_outcome`: the June attempt bled out, so the staff should not attack on poor odds.
  - `planning_duration: 1`.
  - `historical_exit_class: 'did_not_launch'`: a December 1995 renewal never happened. The June reference outcome, 'failed', is in the citation.

**Expected effect (estimate; this must be said plainly):**
- In history the June attempt failed with heavy losses.
- In the sim the defenders of the objectives are 733 (Ilijaš), 0 (Rečica, Vogošća, Svrake, Miševići) and 2,200 (Rakovica), all at cohesion 20, against about 6,600 outside and about 6,200 inside at cohesion 62–100.
- The seat expects **+3 to +6 OSIDs and a probable link-up by T+3–T+5**. Rakovica is the likely holdout.
- That is a counterfactual divergence driven by the hollow late VRS and by the missing intervention forces and firepower. The war-or-game seat should see it.

**Two consequences to state honestly:**
1. **The settlement is unchanged.** Dayton already gives Vogošća, Ilijaš, Hadžići, Novi Grad and 82% of Ilidža to the Federation, so post-decline gains here change the imposed map little. The cost (casualties, exhaustion) is real. This matches BB p.316.
2. **The siege state is unchanged by a link-up.** `enclave_resilience.ts:409-446` keeps Sarajevo `ALWAYS_BESIEGED` (supply never better than 'strained', Engine Invariants §12.1). Changing that is an Engine-Invariants canon change for the systems seat, not part of this op.

Also: `src/state/sarajevo_lifeline.ts` says the lifeline is "NOT a lever or a relieve-the-siege score (Gate §3)". **Adding any "siege lifted" flag, event or score would need the §6 panel.** The op adds none.

Optional follow-up, not designed: an SRK counter (BB pp.313–314: MUP plus the 3rd Sarajevo retook Python on 22 June; the 1st Ilidža hit Stup on 28 June).

---

## 3. Paste-ready TypeScript (`src/sim/combat/operation_opportunity_catalog_dayton_continuation.ts`)

### 3.1 Header comment: replace the "Excluded on purpose" sentence

```ts
 * Counterfactual by design: several objectives are painted RS at every checkpoint. They
 * are lawful only because these operations can never run on the calibrated line.
 * Prijedor town and Kozarac are military objectives (owner, 2026-11-07): canon refuses a
 * camp system and atrocity targeting (SENSITIVE_HISTORY_DESIGN_GATE §1, Ring 3 #1-#2), not
 * the capture of a town; the Prijedor camps closed in August 1992 (Ring 2 essays, ICTY
 * Tadić/Stakić/Kvočka/Sikirica) and BB1 p.383 names Prijedor the 5th Corps' objective.
 * Omarska and Kamičani are not authored (no BB military authority). Banja Luka and Kola
 * stay excluded (the US red line, BB1 p.392). Player text names towns only; any framing of
 * a capture as redress for 1992, or any score keyed to it, needs the §6 panel.
```

### 3.2 Constant (next to `CITATION_DESIGN`)

```ts
const CITATION_SARAJEVO = 'Balkan Battlegrounds I, printed pp.309-316 (PDF pp.346-353; outside the KB page extraction) and endnotes 197-204, printed p.404 (KB dig. p.441)';
```

### 3.3 C1 replacement

```ts
// ─── C1. ARBiH 5th Corps: Sana continuation toward Prijedor, Kozarac and Bosanski Novi ──
// Takes over the live Operation Sana brigades (supersedes_live_operation). Oštra Luka first
// (Sana stalls there on objective sequencing), staged on the 506th's cell; Prijedor town is
// directly adjacent to Ljubija. Kozarac is reached through Marićka, adjacent to the same
// staging cell, so the two Prijedor axes share no objective. The 501st stays at Krasulje.
const SANA_CONTINUATION: OperationOpportunityDef = {
    opportunity_id: 'sana_continuation_95',
    name: 'Sana Continuation: Prijedor and Novi Grad',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: 'arbih_5th_corps',
    family: FAMILY,
    staging_osid: 'op:sanski_most:ilidza_2',
    planning_duration: 1,
    min_attack_outcome: 'repulsed',
    supersedes_live_operation: { corps_id: 'arbih_5th_corps', operation_name: 'Operation Sana' },
    axes: [
        {
            axis_id: 'ljubija',
            name: 'Ljubija and Prijedor',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_506th_mountain', 'arbih_517th_light', 'arbih_504th_cazin_light'],
            objectives: ['op:sanski_most:ostra_luka', 'op:prijedor:ljubija_2', 'op:prijedor:prijedor_2'],
            staging_osid: 'op:sanski_most:ilidza_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'kozarac',
            name: 'Kozarac',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_510th_bosnian_liberation', 'arbih_502nd_vitezka_mountain'],
            objectives: ['op:prijedor:maricka_2', 'op:prijedor:kozarac_2'],
            staging_osid: 'op:sanski_most:ilidza_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'novi_grad',
            name: 'Novi Grad',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_503rd_slavna_mountain', 'arbih_511th_slavna_mountain', 'arbih_505th_vitezka_mountain'],
            objectives: ['op:bosanski_novi:novi_grad_3', 'op:bosanski_novi:poljavnice', 'op:bosanski_novi:blagaj_japra'],
            staging_osid: 'op:bosanski_novi:matavazi_2',
            preserve_objective_sequence: true,
        },
    ],
    citations: [CITATION_BB + ' — OGs North and Center: Prijedor the eventual objective, Banja Luka the corps goal; 503rd/505th toward Ljubija and Prijedor (p.383); Dudaković fought on to 20 Oct (p.391)', CITATION_DESIGN],
    historical_exit_class: 'did_not_launch',
    prerequisites: PREREQS,
    evaluators: evaluators(windowOpen),
    staff_recommendation: 'approve',
};
```

### 3.4 New C5 (insert before the export) and the export line

```ts
// ─── C5. ARBiH 1st Corps: Sarajevo breakout, renewed ────────────────────────────────
// The June 1995 plan's selected route (Visoko–Ilijaš–Vogošća, BB1 p.310): the largest effort
// from outside (Breza), a pincer from inside (Hotonj / Novi Grad), and the Hadžići attack
// that "fared better" (p.312). Ilidža, Nedžarići and Lukavica are deliberately not
// objectives: in the model each is a one-capture link, while historically they were the
// hardest points (Stup and Nedžarići "only limited gains", p.312). The June attempt failed
// with heavy losses (pp.313-316); a success here is a counterfactual of the hollow late VRS.
// No relieve-the-siege flag or score (sarajevo_lifeline.ts, Gate §3); Sarajevo stays
// ALWAYS_BESIEGED for supply (Engine Invariants §12.1).
const SARAJEVO_BREAKOUT: OperationOpportunityDef = {
    opportunity_id: 'sarajevo_breakout_95',
    name: 'Sarajevo Breakout: Ilijaš and Vogošća',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: 'arbih_1st_corps',
    family: FAMILY,
    staging_osid: 'op:breza:zupca_2',
    planning_duration: 1,
    axes: [
        {
            axis_id: 'ilijas',
            name: 'Ilijaš and Rečica',
            corps: 'arbih_1st_corps',
            brigades: ['arbih_146th_light', 'arbih_164th_mountain', 'arbih_123rd_light', 'arbih_guards_brigade'],
            objectives: ['op:ilijas:podlugovi', 'op:novi_grad_sarajevo:recica'],
            staging_osid: 'op:breza:zupca_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'vogosca',
            name: 'Vogošća',
            corps: 'arbih_1st_corps',
            brigades: ['arbih_1st_mountain', 'arbih_111th_vitezka_motorized', 'arbih_112th_vitezka_motorized'],
            objectives: ['op:vogosca:vogosca_3', 'op:vogosca:svrake'],
            staging_osid: 'op:vogosca:hotonj',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'hadzici',
            name: 'Hadžići',
            corps: 'arbih_1st_corps',
            brigades: ['arbih_104th_vitezka_motorized', 'arbih_109th_mountain', 'arbih_181st_mountain'],
            objectives: ['op:hadzici:misevici_2', 'op:ilidza:rakovica_2'],
            staging_osid: 'op:hadzici:binjezevo',
            preserve_objective_sequence: true,
        },
    ],
    citations: [
        CITATION_SARAJEVO + ' — break in from outside, largest effort outside (p.309); Visoko–Ilijaš–Vogošća the selected corridor (p.310); north route OG + 16th Division (p.311); Python cut, Hadžići gains, Stup/Nedžarići limited (p.312); stopped 17-22 June, a costly failure (pp.313-316; June reference outcome: failed)',
        CITATION_DESIGN,
    ],
    historical_exit_class: 'did_not_launch',
    prerequisites: PREREQS,
    evaluators: evaluators(windowOpen),
    staff_recommendation: 'approve',
};

export const DAYTON_CONTINUATION_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    SANA_CONTINUATION,
    SOUTHERN_MOVE_II,
    SOUTHERN_MOVE_II_HVO_ONLY,
    KRAJINA_COUNTERSTROKE,
    OZREN_CONTINUATION,
    SARAJEVO_BREAKOUT,
];
```

`CITATION_DESIGN` should also point at the round-2 report once this design lands in `docs/40_reports/`.

---

## 4. Test changes (`tests/dayton_decline_imposition.test.ts`)

Add `import { readFileSync } from 'node:fs';` next to the existing `resolve` import.

**Replace** `it('keep camp geography and Banja Luka out of every objective list', …)` with:

```ts
    it('Banja Luka and Kola stay out of every objective list (US red line, BB1 p.392)', () => {
        const forbidden = ['op:banja_luka:banja_luka_2', 'op:banja_luka:kola'];
        const objectives = DAYTON_CONTINUATION_OPPORTUNITIES.flatMap((d) => d.axes.flatMap((a) => a.objectives));
        for (const f of forbidden) expect(objectives).not.toContain(f);
    });
```

**Add** (same describe block):

```ts
    const byId = (id: string) => DAYTON_CONTINUATION_OPPORTUNITIES.find((d) => d.opportunity_id === id)!;
    const adjacency = (() => {
        const g = JSON.parse(readFileSync(resolve(process.cwd(), 'data/derived/operational/operational_contact_graph.json'), 'utf8')) as { edges: { a: string; b: string }[] };
        const m = new Map<string, Set<string>>();
        for (const { a, b } of g.edges) {
            (m.get(a) ?? m.set(a, new Set()).get(a)!).add(b);
            (m.get(b) ?? m.set(b, new Set()).get(b)!).add(a);
        }
        return m;
    })();

    it('the 5th Corps continuation reaches Prijedor town and Kozarac (owner, 2026-11-07; BB1 p.383)', () => {
        const sana = byId('sana_continuation_95');
        const axis = (id: string) => sana.axes.find((a) => a.axis_id === id)!;
        expect(axis('ljubija').objectives).toEqual(['op:sanski_most:ostra_luka', 'op:prijedor:ljubija_2', 'op:prijedor:prijedor_2']);
        expect(axis('kozarac').objectives).toEqual(['op:prijedor:maricka_2', 'op:prijedor:kozarac_2']);
        expect(sana.axes.flatMap((a) => a.brigades)).not.toContain('arbih_501st_slavna_mountain'); // holds Krasulje
    });

    it('every continuation axis is staged next to its first objective and each step is reachable', () => {
        for (const def of DAYTON_CONTINUATION_OPPORTUNITIES) {
            for (const axis of def.axes) {
                const staging = axis.staging_osid ?? def.staging_osid;
                expect(adjacency.has(staging), `${def.opportunity_id}/${axis.axis_id} staging`).toBe(true);
                axis.objectives.forEach((o, i) => {
                    const reach = [staging, ...axis.objectives.slice(0, i)];
                    expect(reach.some((p) => adjacency.get(p)?.has(o)), `${def.opportunity_id}/${axis.axis_id} ${o}`).toBe(true);
                });
                expect(adjacency.get(staging)?.has(axis.objectives[0]), `${def.opportunity_id}/${axis.axis_id} first`).toBe(true);
            }
        }
    });

    it('rosters are disjoint across continuation operations (the two Southern Move variants are mutually exclusive)', () => {
        const owner = new Map<string, string>();
        for (const def of DAYTON_CONTINUATION_OPPORTUNITIES) {
            const family = def.opportunity_id.startsWith('southern_move_manjaca') ? 'southern_move' : def.opportunity_id;
            for (const b of new Set(def.axes.flatMap((a) => a.brigades))) {
                const prior = owner.get(b);
                expect(prior === undefined || prior === family, `${b}: ${prior} and ${family}`).toBe(true);
                owner.set(b, family);
            }
        }
    });

    it('the Sarajevo breakout follows the selected June 1995 route and never takes a one-capture link (BB1 pp.310-312)', () => {
        const op = byId('sarajevo_breakout_95');
        expect(op.faction).toBe('RBiH');
        expect(op.primary_corps).toBe('arbih_1st_corps');
        expect(op.supersedes_live_operation).toBeUndefined();
        const objectives = op.axes.flatMap((a) => a.objectives);
        for (const o of ['op:ilidza:sarajevo_dio_ilidza_2', 'op:ilidza:sarajevo_dio_novi_grad_sarajevo', 'op:novo_sarajevo:lukavica']) {
            expect(objectives).not.toContain(o);
        }
        // Each pincer ends on a cell touching the Sarajevo pocket.
        expect(adjacency.get('op:novi_grad_sarajevo:recica')?.has('op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo')).toBe(true);
        expect(adjacency.get('op:vogosca:vogosca_3')?.has('op:vogosca:hotonj')).toBe(true);
    });
```

**Unchanged and still passing:**
- "registered … never open without a decline" iterates every def, so it covers C5.
- "open while the decline window runs": unaffected.
- "only the Dayton continuation family may supersede": C5 sets no supersession.

`check_existing.cjs` confirmed that the existing C2–C4 chains pass the adjacency rule. C2A's Pavići is adjacent to its staging cell but not to Čađavica, which is why the rule is "staging or an earlier objective".

**Gates on landing:**
- `npx tsc --noEmit`
- `npm run test:vitest -- tests/dayton_decline_imposition.test.ts`, then the full suite.
- **`npm run sim:scenario:run:188w`**, byte-identical to the floor in `docs/40_reports/CALIBRATION_MASTER.md`. The gate means no calibrated effect, but that has to be proven.
- Re-run the scratch `decline_probe.mts` for 8 turns. Each of C1 (Prijedor and Kozarac axes) and C5 must reach `execution` and log a battle by T+3, and two runs must give identical hashes.
- Ledger entry. operations-expert and corps-army-commander sign-off. Historian short note (§1.1) recorded in the design report.
