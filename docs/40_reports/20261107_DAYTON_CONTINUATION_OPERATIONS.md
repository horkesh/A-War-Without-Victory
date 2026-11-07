# Dayton-decline continuation operations: design (operations-expert + historian seats)

Date: 2026-11-07. Status: **design only. No repository file was edited.**
Evidence save: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n2/final_save.json` (meta.turn 188, no `player_faction`).
Scratch evidence (outside the repo):
- `/tmp/claude-0/-home-user-A-War-Without-Victory/b98d9335-a715-5df3-bc63-239f8570f7c1/scratchpad/continuation_ops/probe.cjs`: OSID controller, painted checkpoints, neighbours and units.
- `/tmp/claude-0/-home-user-A-War-Without-Victory/b98d9335-a715-5df3-bc63-239f8570f7c1/scratchpad/continuation_ops/decline_probe.mts`: loads the w188 save, declines Dayton as RBiH at autonomy 2, and advances turns through `desktop_sim.advanceTurn`.
- `/tmp/claude-0/-home-user-A-War-Without-Victory/b98d9335-a715-5df3-bc63-239f8570f7c1/scratchpad/continuation_ops/decline_rbih.json` (4 turns) and `decline_rbih_dbg.json` (3 turns, `AWWV_DEBUG_REASON_CODES=axis_reject`).

Measured result, reproduced: after the decline (imposition_turn 192) there were **0 control flips** in turns 189–192, and the game ended at the imposition on t192.

---

## 0. The constraint that shapes everything: the window is 4 resolutions long

Dayton is declined while `meta.turn` = T (188 by default, 180 under `dayton_close_out`). The pipeline increments the turn at the start of each resolution (`turn_pipeline.ts:142`). That gives resolutions T+1 … T+4. The settlement is imposed at the end of T+4 (`enforceDaytonImposition`, negotiation steps, late in the pipeline). The relevant step order in `war_phases.ts`:

| step | line |
|---|---|
| advance-sector-offensives (planning → execution) | 1926 |
| check-triggered-operations | 2193 |
| apply-resolved-opportunity-decisions (applies the player's answer) | 2215 |
| evaluate-operation-opportunities | 2651 |
| apply-bot-opportunity-decisions (bot or autonomy ≥2: spawn the same turn) | 2662 |
| generate-level1-opportunity-proposals (player review rows) | 2682 |
| generate-bot-brigade-orders (march and attack orders) | 2748 |

Attack turns available:
- **Bot faction, or the player at autonomy ≥2:** eligible and spawned at T+1 (planning). At T+2 the op advances to execution if it is staged, then attacks at T+2, T+3 and T+4. That is **3 attack turns**.
- **Manual player (autonomy 0/1):** the review is created at T+1. The answer is applied at T+2 (2215 runs after 1926), execution starts at T+3, and the op attacks at T+3 and T+4. That is **2 attack turns**.

Design rules that follow:
- `planning_duration: 1`.
- Brigades already on or one hop from staging.
- Staging adjacent to the first objective (Sacred Rule 3).
- Objective chains of 3 cells or fewer, each adjacent to the previous cell or to a friendly approach.
- **No objective that a sibling op could take first.** Section 4 shows why: a stale cell costs a whole turn.

## 1. Historical grounding (historian seat)

Source hierarchy: no ICTY or Court of BiH judgment speaks to these operational movements, so BB is the operational source. BB1 printed pages are given with the KB digital page in brackets. The KB pages are `data/derived/knowledge_base/balkan_battlegrounds/pages/BB1_p0420…0429,0462.json`. BB2 for this period is annex and source lists only (BB2 dig. p.557: sources incl. "503rd … From Mokreš to Sanski Most"). It adds no narrative.

**What each side was doing when the 12 Oct ceasefire took hold**

- **ARBiH 5th Corps (Dudaković), Operation Sana.**
  - OG "North" and OG "Center" had **Prijedor** as their eventual objective, and **Banja Luka was the corps' strategic objective** (BB1 p.383 [dig.420]).
  - The 503rd and 505th were "grinding forward … around Bosanski Novi and in the Majdan Mountains toward **Ljubija and Prijedor**" (p.383).
  - Sanski Most fell on 10 Oct. Dudaković kept attacking despite the ceasefire. The VRS 43rd Motorized rallied NE of Sanski Most, and the fighting "seesawed" until **20 Oct** (BB1 p.391 [dig.428]).
  - On 9 Oct OG "Center" had the 502nd and 510th, and OG "South" had five 7th Corps brigades. About 10,000 7th Corps and other ARBiH troops had arrived (p.391).
  - BB's own judgement: "it seems unlikely that the ARBiH could have gained significant amounts of territory on its own in the near term against strengthened VRS forces around Prijedor-Banja Luka". Delić "begged Izetbegović to let the fighting continue" (BB1 dig.462, endnote 821).
- **HV/HVO, Južni Potez (Southern Move), 8–11 Oct.**
  - The objective was Mrkonjić Grad plus a drive into **Manjača**, to gain "a stranglehold over Banja Luka" (BB1 p.390 [dig.427]).
  - Phase 1 (HV 4th and 7th Guards, 1st HGZ) was Mrkonjić, the Podrašnica valley and the **Čađavica** road junction.
  - Phase 2 (HVO Guards) was the southern edge of Manjača and the **Bočac** hydro plant.
  - The HV was withdrawn on 11 Oct. The HVO Guards reached their stop line on the southern edge of Manjača, **25 km from Banja Luka** (p.391).
  - US pressure on Tuđman "to refrain from … capturing Banja Luka" (BB1 p.392 [dig.429]). The US pressure came in September after Maestral, and Zagreb launched Južni Potez anyway (dig.462, n.823).
- **US halt and ceasefire.** The ceasefire was tentatively agreed on 5 Oct and took effect on the morning of 12 Oct. "Fighting in western Bosnia rumbled on for another week." Izetbegović "bowed to US pressure", and the government "wanted to continue fighting to gain as much territory as possible" (BB1 p.392).
  - Holbrooke's own account (*To End a War*) is **not in the KB**. My recollection is that he urged taking Sanski Most, Prijedor and Bosanski Novi but not Banja Luka. That is **unverified** and must be checked against the book before it is cited.
- **ARBiH 2nd/3rd Corps, Ozren (Uragan/Farz).**
  - VRS military police and MUP reinforcements stabilized Doboj on 24 Sep (BB1 p.388 [dig.425]).
  - The last drive was 5–7 Oct: the 35th Division/3rd Corps against the 3rd Ozren Brigade NE of Maglaj.
  - The VRS pulled the 16th Krajina Mot back to Ozren. The ARBiH "finally halted the Ozren campaign when the country-wide cease-fire took effect" (p.388).
- **VRS counteroffensives, 24 Sep – 9 Oct.** The VRS acted as a "counter puncher" (BB1 p.389 [dig.426]):
  - Arkan's SDG, the 65th Protection Regt, the 16th Krajina Mot and the 43rd Mot drove OG "North" back up to 15 km. They halted "with Bosanska Krupa and Otoka in sight".
  - Two tactical groups formed around Mrkonjić. The 2nd Krajina Inf and 16th Krajina Mot drove toward the Sana NE of **Ključ**. The Special Police plus SDG pushed the 5th Corps off Mrkonjić.
  - The **5th Kozara and 6th Sanske** of OG-10 "Prijedor" pushed south from Sanski Most toward Ključ. By 6 Oct they were within 1 km of Ključ. They fought "near **Krasulje** … gaining little ground … through 8-9 October".
  - Earlier, 20–22 Sep, the 5th Kozara and 6th Sanske had nearly encircled the 510th at Hrustovo (p.383).

**What was "next" when the halt came (the authoring basis):**
1. 5th Corps: Ljubija and Prijedor, Bosanski Novi.
2. HVO: the southern edge of Manjača and Bočac, and the Čađavica junction. The halt line was explicitly *short of Banja Luka*.
3. 2nd/3rd Corps: the Ozren/Doboj shoulder.
4. VRS: retake Ključ (Krasulje) and roll back the 5th Corps' western gains.

**How far the modelled VRS differs from history (the war-or-game seat should see this).**
- At w188, `vrs_2nd_krajina` is a set of remnants: 105–380 personnel, cohesion 18–20.
- Prijedor holds one unit (rs_1st_drvar, p126).
- The historical OG-10 counter-punch formations (5th Kozara 833, 6th Sanske 752) sit with six other 1st Krajina brigades at **op:jajce:kruscica**. That is about 8,850 personnel in one cell, all at cohesion 20.
- So the BB n.821 "strengthened VRS around Prijedor-Banja Luka" does not exist in the sim. Continuation gains on the Prijedor axis will exceed what BB judged plausible. That argues for short objective lists.

## 2. Mechanism (operations seat)

### What exists
| path | gate | player authorization | fit |
|---|---|---|---|
| Pre-planned (`pre_planned_operations.ts`) | injected at w0 and queued per corps | `HISTORICAL_OP:preplanned` | Wrong. Calendar-ordered queues, slot-0 semantics. |
| Triggered (`triggered_operations.ts` `trigger(state,turn)`) | arbitrary predicate | `HISTORICAL_OP:triggered`, **born accepted** (`ensureHistoricalOperationAuthorizationReview`: owner 2026-08-31, "auto-authorize, same as headless") | Workable but poor. No real player choice. `assignOperationCommander(...,'RS')` is hardcoded. Decline/re-offer counters live in state. |
| **Opportunity catalog** (`operation_opportunities.ts` + `operation_opportunity_catalog_*.ts`) | 10 typed prerequisite predicates | `OPPORTUNITY:<proposal_id>` review (approve/delay/redirect/under_resource/decline) at autonomy 0/1; staff decides at autonomy ≥2; bots auto-decide | **Recommended.** Sana, Mistral 2 and Southern Move already live here. |

### Recommendation
Add a new family file, `src/sim/combat/operation_opportunity_catalog_dayton_continuation.ts`, exporting `DAYTON_CONTINUATION_OPPORTUNITIES`. Spread it into `OPERATION_OPPORTUNITY_CATALOG`. Each def has:
- `tier: 'T1'`, `family: 'dayton_continuation'`, `historical_exit_class: 'did_not_launch'`;
- `staff_recommendation: 'approve'`, `planning_duration: 1`.

**Gate, one shared predicate.** It is a pure read and must be true on all counts:

```ts
function daytonContinuationWindow(state, turn) {
  const neg = state.military.negotiation;
  const d = neg?.dayton_decline;                                  // {faction, declined_turn, imposition_turn}
  const by = state.military.event_flags?.[DAYTON_DECLINED_BY_FLAG]; // 'dayton_declined_by'
  return !!d && typeof by === 'string' && by === d.faction
      && !neg?.dayton_result && state.meta.game_over !== true
      && turn > d.declined_turn && turn <= d.imposition_turn;
}
```

Use it as the **`date_window`** evaluator, marked `'required'`. Also short-circuit every other predicate on it, so headless reads stay shallow. Why `date_window` matters: `evaluateOperationOpportunities` writes an ineligibility diagnostic and a `blocked` trace only when `date_window` is green (`inWindow`). With the gate in `date_window`, a run without a decline writes **nothing**: no proposal, no diagnostic and no trace.

**Player versus bot.**
- The declining player's own continuation ops go through the **OPPORTUNITY review**, not `HISTORICAL_OP`. HISTORICAL_OP is born accepted only so that history matches the headless line. These ops have no headless twin, so the choice to resume is the player's.
- At autonomy ≥2 the staff approves the same turn, keeping 3 attack turns. At autonomy 0/1 the player gets 2.
- All other factions are bots and approve at T+1.
- Every continuation op is enabled for every faction whichever one declined. The war reopens for all, so a decline is never one-sided.

**Out of headless by construction:**
1. `dayton_declined_by` is written only by `recordDaytonDecline`. That is reachable only from `declineDaytonNegotiation` (needs `meta.player_faction` and `pending_dayton`) or `applyPlayerDaytonHardline` (needs `player_faction`). The calibration save has no `player_faction`.
2. The gate also requires the `dayton_decline` record and `turn > declined_turn`.
3. A red `date_window` writes no diagnostics or traces.
4. A guard test with a positive control, plus 188w byte-identity against the floor in `docs/40_reports/CALIBRATION_MASTER.md` (section 5).

**One new primitive is needed for the 5th Corps op: supersession.** All 10 5th Corps line brigades are still `participating_brigades` of the live Sana op (phase `execution`). `selectEligibleOpportunityParticipants` therefore rejects them as `committed_to_live_operation`. The 7th Corps reinforcements that existed historically are not in the region in the sim.

Proposed field: `supersedes_live_operation?: { corps_id: string; operation_name: string }` on `OperationOpportunityDef`.
- Honoured only for `tier 'T1'` and `family 'dayton_continuation'`, scoped like `targets_friendly_overrides`.
- It reuses the probe-preemption path: `preemptOpportunityProbeParticipants` strips the brigade from the predecessor's `participating_brigades` and axes.
- The predecessor enters recovery via `enterOperationRecovery` only when it is left empty.
- It needs either a new `recovery_reason` value `'superseded'` (an additive union member; validator and save-compatibility check required) or reuse of `'manual_termination'`.
- Without this field, Sana and its continuation cannot share brigades, and the 5th Corps op cannot exist. Sacred Rule 2 is honoured because both are on the same corps and there is an explicit handover.

**Open designer and owner questions:**
- **(a) Should decline-window gains survive the imposed settlement?** `resolveDaytonNegotiation` → `applyPeaceSettlement(state,'dayton',…)` settles on the *researched Dayton map*: "Wartime control is never rewritten" (commit 6739422). As built, these ops change wartime control, casualties and exhaustion, but not the settled map. The decline is then pure cost, which is thematically coherent (negative-sum). Making gains count instead is a scoring and canon decision, not an ops decision.
- **(b) HV participation when HRHB itself declined.** `DAYTON_COERCING_POWER.HRHB = 'zagreb'`, so Zagreb arguably would not lend HV Guards to an HRHB that is defying it. Default proposed here: C2 is available regardless. Game-designer to rule.
- **(c) Window length.** Should the 4-week grace count from the first continuation launch? That is an owner choice. A manual player's 2 attack turns are tight.

## 3. Operation specs

All IDs were checked in the w188 save. "p" is personnel and "c" is cohesion at w188. Every objective is held by the enemy at w188. Adjacency was checked on `data/derived/operational/operational_contact_graph.json`.

These ops are **counterfactual by design**. Several objectives are painted RS at every checkpoint, which Sacred Rule 4 would forbid for calibrated ops. They are lawful here only because they can never run on the calibrated line. The BB citations above are the direction-of-effort authority.

### C1. `sana_continuation_95`: "Sana Continuation: Ljubija and Novi Grad" (RBiH, `arbih_5th_corps`)
- Gate: window. `staging_access`: ilidza_2 and matavazi_2 held by RBiH. `enemy_weakness`: at least one objective held by RS. `supersedes_live_operation: {arbih_5th_corps, 'Operation Sana'}`. `min_attack_outcome: 'repulsed'`, matching Sana.
- **Axis A `ljubija`**, staging `op:sanski_most:ilidza_2` (adjacent to ostra_luka ✓).
  - Brigades: `arbih_506th_mountain` (on ilidza_2, p1800, c44), `arbih_510th_bosnian_liberation` (sanica_2, 1 hop, c88), `arbih_517th_light` (kljevci, 1 hop, c78).
  - Objectives: `op:sanski_most:ostra_luka` (RS, empty) → `op:prijedor:ljubija_2` (RS, empty; adjacent ✓) → `op:prijedor:raljas` (RS, rs_1st_drvar p126; adjacent ✓).
- **Axis B `novi_grad`**, staging `op:bosanski_novi:matavazi_2` (503rd on it; adjacent ✓).
  - Brigades: `arbih_503rd_slavna_mountain` (c68), `arbih_511th_slavna_mountain` (donji_dubovik_2, via krslje_2, c79), `arbih_505th_vitezka_mountain` (vranjska_2, c70).
  - Objectives: `op:bosanski_novi:novi_grad_3` (town; rs_17th_klju p380) → `op:bosanski_novi:poljavnice` (rs_3rd_petrovac p211; adjacent ✓) → `op:bosanski_novi:blagaj_japra` (empty; adjacent ✓).
- Excluded on purpose: `prijedor_2`, `kozarac_2`, `omarska_2`, `kamicani` and `maricka_2` (toward Omarska and Kozarac). This is camp geography: ICTY Tadić, Kvočka and Stakić. Banja Luka is excluded too.
- Expected effect: **+3 to +5 OSIDs** for a bot or autonomy ≥2, **+2 to +4** for a manual player. The defenders are remnants of 105–380 personnel at cohesion about 18–20. Reactive reinforcement nearby is minimal (rs_16th_krajina_motorized p280 at melina_2). This is an estimate, not a measurement.

### C2. `southern_move_manjaca_95`: "Southern Move II: Manjača" (HRHB, `hvo_tomislavgrad`)
- Gate: window. `political_authorization`: reuse the `politicalAuthorizationMistral` rule (Washington signed, alliance ≥ 0.50). `staging_access`: mrkonjic_grad_2 and baljvine_2 held by HRHB. Mistral 2 and Southern Move are in recovery and do not commit brigades (`findBrigadeLiveOperationAnywhere` reads only planning or execution).
- **Axis A `cadjavica_manjaca`**, staging `op:mrkonjic_grad:mrkonjic_grad_2`.
  - Brigades: `hv_1st_guards_tigers` (on staging, p2425, c61), `hrhb_kralj_petar_kreimir_iv_brigade` (donji_vrbljani_2, 1 hop, c30).
  - Objectives: `op:kljuc:cadjavica` (RS, empty; adjacent ✓. Historically taken by Južni Potez phase 1, BB1 p.390, yet painted RS@oct1995) → `op:banja_luka:pavici_2` (rs_2nd_krajina_infantry p536; adjacent to staging ✓).
- **Axis B `rekavice`**, staging `op:mrkonjic_grad:baljvine_2`.
  - Brigades: `hrhb_kralj_tomislav_brigade` (resolves through `oob:` alias to `F_HRHB_0001`, p2967, on staging), `hvo_rama_brigade` (prisoje, 1 hop, p1429). Optional: `hvo_3rd_guard_jastrebovi` (already loaned to hvo_tomislavgrad; at Šipovo).
  - Objective: `op:banja_luka:rekavice_2` (rs_1st_armored p377 plus two 100-man remnants; adjacent ✓). This is the Manjača southern edge.
- Hard exclusion: `op:banja_luka:banja_luka_2` and `kola` (the city and its approach). BB1 p.392 records the US red line. Before naming Bočac, check with the map pipeline which OSID contains the plant.
- Expected effect: **+2 to +3 OSIDs**. Čađavica is undefended, and Pavići and Rekavice hold weak defenders.

### C3. `krajina_counterstroke_95`: "Krajina Counterstroke" (RS, `vrs_1st_krajina`; the RS op)
- Gate: window. `staging_access`: kruscica and donje_ratkovo_2 held by RS. Use the default `min_attack_outcome`, not `'repulsed'`: RS units are all at cohesion 20, and the staff should not bleed them on poor odds. `vrs_1st_krajina` has no live op. One op with two axes keeps Sacred Rule 1 (one op per corps).
- **Axis A `jajce`**, staging `op:jajce:kruscica` (the cell where the modelled VRS reserve actually stands).
  - Brigades: `rs_1st_banja_luka_light_infantry` (2000), `rs_2nd_banja_luka_light_infantry` (2000), `rs_11th_mrkonji_light_infantry` (1101), `rs_31st_light_infantry` (984), `rs_5th_kozara_light_infantry` (833), `rs_6th_sanske_infantry` (752). All are on staging, so they need no march.
  - Objectives: `op:jajce:lupnica` (HRHB, empty; adjacent ✓) → `op:jajce:jajce_3` (HRHB, empty town; adjacent ✓) → `op:jajce:barevo_2` (HRHB, empty; adjacent ✓).
  - Honest framing: the October 1995 VRS counter-punch was at Ključ and Krupa, not Jajce. This axis is the documented counter-punching pattern (BB1 p.389) applied where the modelled reserve stands. Historian sign-off: acceptable as counterfactual, labelled as such.
- **Axis B `kljuc_krasulje`**, staging `op:kljuc:donje_ratkovo_2` (RS; adjacent to kljuc_2 ✓ and krasulje_2 ✓). This is the historically sourced axis (BB1 pp.389, 391).
  - Brigades: `rs_2nd_krajina_infantry` (pavici_2, 1 hop, p536; `disrupted_turns` 1 at w188, should clear by T+1), `rs_43rd_prijedor_motorized` (krusevo_brdo_i, p1512; **a long march, likely too late in 4 turns**), `rs_22nd_krajina_infantry` (kruscica, p583; also a long march. Drop it if the march-time check says it cannot arrive by T+3, and accept that axis B is a one-brigade axis). `arbih_505th` on C1-B is likewise 2+ hops (vranjska_2) and may arrive late; it is listed for mass, not for opening.
  - Objectives: `op:kljuc:kljuc_2` (RBiH, **empty**) → `op:kljuc:krasulje_2` (arbih_501st p1800, c62).
- Disjoint from C1 and C2 rosters ✓.
- Expected effect: **RS 0 to +3 OSIDs**, most likely on axis A (empty HRHB cells against a mass of about 8.8k). Axis B probably takes Ključ town at best and is repulsed at Krasulje.

### C4 (optional, lowest priority). `uragan_continuation_95`: "Ozren Continuation" (RBiH, `arbih_3rd_corps` plus a 2nd Corps axis)
- Gate: window. 3rd Corps Donji Vakuf 95 is in recovery, so its brigades are free. The 2nd Corps has no op.
- **Axis A `petrovo`**, corps 3rd, staging `op:maglaj:gornja_bocinja`.
  - Brigades: `arbih_351st_liberation`, `arbih_328th_mountain`, `arbih_7th_vitezka_muslim_liberation` (all on staging), `arbih_327th_vitezka_mountain` (brijesnica_donja_2, adjacent).
  - Objectives: `op:gracanica:petrovo_2` (RS, empty; adjacent ✓) → `op:doboj:boljanic_2` (rs_2nd_armored p1108; adjacent ✓).
- **Axis B `ozren_north`**, corps 2nd, staging `op:doboj:brijesnica_velika`.
  - Brigades: `arbih_224th_mountain` (on staging), `arbih_221st_mountain` (dzakule, adjacent to the objective).
  - Objectives: `op:doboj:zelinja_gornja_2` (RS, empty; adjacent ✓) → `op:doboj:grapska_gornja_2` (rs_3rd_ozren p521; adjacent ✓).
- Expected effect: **+1 to +3**. The Doboj crust (1st Doboj, 1st Novigrad, 2nd Armored, 1st Srbac, 1,079–1,221 each) makes Boljanić unlikely. BB1 p.388 is the authority.

**Priority and ordering.** Opportunities are evaluated in `opportunity_id` order (strictCompare) and bot decisions in proposal-id order. Rosters are disjoint, so order has no effect on admission. Author C1–C3 first; C4 is optional.

## 4. Why Operation Sana stalls at Oštra Luka (inspected and reproduced)

The Sana record at w188:
- phase execution; 39 captures; force_ratio_estimate 3.50;
- 10 participants (all 5th Corps line brigades plus hvo_101st);
- `_prev_objective_state`: all 34 objectives RBiH except `op:sanski_most:ostra_luka`.

Per axis: 5 complete; `sana_veliki_badic_503rd_late` stalled (gate never met); three executing.

**Oštra Luka is in exactly one axis**: `sana_west_sana_510th` (`[sanica_2, ilidza_2, kljevci, sanski_most_2, ostra_luka]`, `preserve_objective_sequence`, 510th only). At w188 its index sat on `kljevci`, which the 517th had already taken. The 2026-11-06 calibration deliberately removed Oštra Luka from the 506th's walk because it is painted RS at all four checkpoints.

What the decline probe shows (`AWWV_DEBUG_REASON_CODES=axis_reject`, `order_generation_details`):

| turn | 510th location | axis objective seen by the brigade AI | decision |
|---|---|---|---|
| 189 | sanica_2 | kljevci (RBiH) | `objective_missing_or_friendly`, no order |
| 190 | sanica_2 | sanski_most_2 (RBiH) | `objective_missing_or_friendly` |
| 191 | sanica_2 | ostra_luka (RS) | `march_to_approach` → ilidza_2 |
| 192 | (arriving) | none | imposition at end of turn |

Over the same turns, the 506th, which is **adjacent** to Oštra Luka at ilidža_2, walked its own all-friendly tail one cell per turn (sanica → hadzici → kljuc → krasulje). It never attacks because Oštra Luka is not on its axis. Failure counters on the Oštra Luka axis are 0/0, and **no battle was ever fought there**.

Cell facts:
- Oštra Luka has no RS unit on it.
- Its neighbours are three empty Prijedor cells (ljubija_2, maricka_2, rasavci_2).

**Diagnosis:** it is not a combat wall but an **objective-sequencing wall**:
1. The lifecycle advances a `preserve_objective_sequence` axis past a cell a sibling already captured by one index per turn.
2. The brigade AI acts on the index from before the lifecycle advance (generate-bot-brigade-orders reads the index advance-sector-offensives left).
3. The only owning brigade was 2 hops away.

The result is that the first possible attack is T+5 = 193, after the imposition. Before the halt this was invisible, because the calibrated run ends at 188.

**Would a continuation hit the same wall?** Only if authored the same way. C1 avoids it by construction:
- spawn-time filtering of friendly objectives (`spawnCorpsOperationFromOpportunity`);
- Oštra Luka as objective 1;
- the adjacent 506th on the axis, with staging on its cell;
- no objective shared with Sana's remaining axes.

A broader engine fix (skip every leading friendly objective in one pass) would change the calibrated line. It is calibration-gated and out of scope.

## 5. Risks and tests

**Canon and hard-boundary checks**
- *Brigades attack only through CorpsOperation:* every op is built by `buildCorpsOperation` on approval, and attacks come from the normal brigade AI under `sector_offensive`. No control writes, no direct flips. ✓
- *Never override initial control or use `avoided_osids_by_faction`:* no override and no avoid-list. Objectives are reached only by resolved battles. Several Prijedor and Novi cells have census `initial_political_controllers` = RBiH. That is irrelevant and untouched. ✓
- *Determinism:* predicates are pure reads; no RNG, clock or `localeCompare`; catalog and proposal sorting use strictCompare; proposal IDs are `OPP_<turn>_<id>`. A supersession must iterate the predecessor's brigades in sorted order. ✓
- *Calibration:* zero effect is a claim that must be **proven**, not asserted. The same goes for the `supersedes_live_operation` code path, which must not run unless the field is set.
- *Sensitive history:* this is territorial content only, in Prijedor municipality and next to camp sites. Ljubija has its own post-war mass-grave history. Requirements:
  - excluded OSIDs as listed in C1;
  - no event, Chronicle or essay text without the §4 register;
  - no Ring-3 enabling.
  - The historian and game-designer seats should confirm under `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` whether a counterfactual ARBiH op into Prijedor needs the panel route.
  - Fallback if they object: axis A ends at Oštra Luka.
- *Realism (war-or-game):* the hollow modelled VRS will let C1 overshoot BB's judgement (n.821). Keep the lists short.
- *Slots:* opportunity spawn does not check `hasAvailableSlot`. C2 adds a third op on hvo_tomislavgrad, and two of them are in recovery. That has precedent but should be recorded.
- *Commander:* `assignOperationCommander(state, op, def.primary_corps, def.faction)` is faction-correct on this path. Unlike the triggered path, it is not hardcoded to 'RS'. ✓

**Tests**
1. `tests/dayton_continuation_inert_without_decline.test.ts`. Run `runOpportunityEvaluationStep` over t175–200 on a fixture with no decline. Assert that no `DAYTON_CONTINUATION` id appears in `operation_opportunities`, `operation_opportunity_diagnostics` or `operation_opportunity_traces`, and that the state is deep-equal before and after for those keys. Positive control: the same fixture with `dayton_decline` plus the flag must produce eligible proposals. A variant with the gate stubbed true must fail the absence assertion.
2. Gate unit tests:
   - false with the flag but no `dayton_decline` record;
   - false with the record but no flag;
   - false at `turn == declined_turn`, true at `+1`;
   - false at `> imposition_turn`, after `dayton_result`, and on `game_over`.
3. Catalog integrity:
   - every staging and objective OSID is in the 712-OSID universe;
   - staging is adjacent to the first objective (contact graph);
   - each chain step is adjacent to the previous cell or to a friendly approach;
   - rosters are disjoint across all continuation defs and against each other's axes;
   - each roster id resolves (`resolveOperationFormation`, including the `oob:` alias) to a formation whose corps matches the axis corps or is a sector-exempt loan;
   - forbidden-objective list: `prijedor_2`, `kozarac_2`, `omarska_2`, `kamicani`, `banja_luka_2`, `kola`.
4. Supersession unit test. With Sana live holding the 506th, approving C1 moves the 506th out of Sana's `participating_brigades` and axes and into C1. Sana enters recovery only when emptied. The result is deterministic under shuffled input order. Without the field, the 506th is rejected (`committed_to_live_operation`).
5. Player-path test, extending `tests/dayton_decline_imposition.test.ts`:
   - RBiH player at autonomy 0: the decline produces `OPPORTUNITY:` review rows at T+1; accepting spawns C1 at T+2; the RS C3 is bot-approved at T+1.
   - At autonomy 2: C1 spawns at T+1.
   - Nothing spawns after the imposition.
6. Behavioural probe, not CI: re-run the scratch `decline_probe.mts` from the w188 save. Each of C1–C3 must reach `execution` and log at least one battle by T+3, and two identical runs must give identical final hashes.
7. Gates: `npx tsc --noEmit`, full `npm run test:vitest`, `npm run sim:scenario:run:40w`, and **`npm run sim:scenario:run:188w`**, which must be byte-identical to the current pinned manifest and fingerprint in `docs/40_reports/CALIBRATION_MASTER.md`. A 40w pass alone is a false green for op code (napkin: 188w before merge).

**Ownership:** `operation_opportunities.ts` (supersession) and the new catalog file. operations-expert and corps-army-commander sign-off. Ledger entry on landing.
