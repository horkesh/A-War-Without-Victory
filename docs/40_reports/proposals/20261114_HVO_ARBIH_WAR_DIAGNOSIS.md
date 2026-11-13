# The 1993 HVO–ARBiH war: diagnosis and proposal

**Date:** 2026-11-14
**Status:** diagnosis and proposal for owner decision. Docs only; the experiment code lives on branch `claude/hvo-arbih-war-diagnosis` and is not for merge.
**Asked:** the displacement-attribution lane (#587) measured HVO-caused displacement of Bosniaks at 1,279 against 43,267 Croats displaced by the ARBiH over the 188-week baseline. Why does the 1993 Croat–Bosniak war barely happen, and how should it be modelled honestly?
**Baseline:** `origin/main` 0450a2e8d, 188w headless, hash `0ec6d6112fd0e954`, checkpoints 712/711/711/710, strict health gate PASS.

## 1. Short answers

- **Is the war absent, delayed, too small, or present but non-displacing?** It is present and on time, but one-sided and far too small. It is also nearly non-displacing on the HVO side.
  - The alliance breaks at t41 (11 Jan 1993), open war starts at t49 (8 Mar 1993), the ceasefire comes at t94 (17 Jan 1994) and the Washington Agreement at t98 (14 Feb 1994), about five weeks early.
  - There are **32 HVO–ARBiH battles in 45 weeks: 30 ARBiH attacks and 2 HVO attacks.** Mostar sees no battle at all.
  - The territory comes out exactly right: all 19 cells the painted references change between January 1993 and April 1994 change in the sim, in the right direction.
  - The HVO's 1993 expulsions happened inside ground it already held (the Lašva valley, west Mostar, Stolac, Čapljina, Prozor). Displacement in the engine is triggered by a change of control, and almost no control changes, so those expulsions never happen.
- **Root cause, in one line each:**
  1. **The HVO is disarmed before the war starts.** At mobilization (t41) the Lašva, Busovača, Novi Travnik and Kiseljak brigades are classed as stranded. Their cohesion falls about 6 points a week, exempt from the HRHB floor of 40, and reaches 0 by t49. It stays between 0 and 6 until the Washington Agreement.
  2. **The stance layer makes the war one-sided by rule.** In open war, ARBiH Central Bosnia corps are forced offensive (`bot_corps_stance.ts:253-260`), HVO Central Bosnia is forced defensive (`:280-284`), and the Herzegovina HVO corps are capped at defensive at all times (`:264-268`).
  3. **Displacement has no war-start seed for the bilateral pair.** Minorities in already-held ground are only seeded on the first war turn of 1992, when the RBiH–HRHB pair is allied and therefore skipped (`displacement_takeover.ts:580-616`). Nothing seeds them when the bilateral war begins.
  4. **The ARBiH side of the war is authored.** Its 1993 offensives are pre-planned operations whose objectives are the painted cells (`pre_planned_operations.ts:1633` onward). This is legal under the owner rule (operations can fail), but it means the territorial match says nothing about whether the HVO side works.
- **The narrative and the map disagree.** The 1993 events fire on schedule. Ahmići fires at t54. "Coordinated HVO operations strike from Jablanica to the Lašva Valley" fires at t54. "HVO Besieges East Mostar … 55,000 Bosniaks are trapped" fires at t57. On the map, at the same moment, the HVO has cohesion 0 in Central Bosnia and is dug in facing the VRS in Herzegovina.

## 2. What the baseline does (measured)

Tool: `hvo_arbih_metrics.cjs` (session scratchpad; to be added under `tools/diagnostics/` if adopted) over `final_save.json` `turn_summaries[].battles`, `political.control_events` and `displacement_event_log.jsonl`. Dates: t1 = 6 Apr 1992.

| Quarter | All battles | ARBiH→HVO battles (captures) | HVO→ARBiH battles (captures) | Croats displaced by ARBiH | Bosniaks displaced by HVO |
|---|---|---|---|---|---|
| 1993 Q1 | 33 | 1 (1) | 0 | 8 | 0 |
| 1993 Q2 | 39 | 12 (9) | 0 | 2,544 | 0 |
| 1993 Q3 | 42 | 13 (5) | 2 (2) | 27,363 | 1,096 |
| 1993 Q4 | 13 | 2 (2) | 0 | 11,709 | 134 |
| 1994 Q1 | 21 | 2 (0) | 0 | 1,643 | 49 |
| **War total** | | **30 (17)** | **2 (2)** | **43,267** | **1,279** |

- **Where the fighting is.** Gornji Vakuf, Bugojno, Kakanj, Fojnica, Novi Travnik, Jablanica/Konjic and Vareš. There is none in Mostar, Vitez/Ahmići, Busovača or Kiseljak, apart from two ARBiH probes at Žepče and a late one at Kreševo.
- **The HVO's only offensive.** The two HVO captures (Lug and Paroš, Prozor, t73) come from one authored pre-planned operation, the Prozor–Rama Line Counterattack. The HVO Central Bosnia corps launches no operation in the whole run, and neither does HVO South-East Herzegovina against the ARBiH.
- **Control against the painted references.** Central Bosnia, north Herzegovina and the Mostar belt match exactly at January 1993 and April 1994 (0 mismatches). They also match at April 1995 (1 mismatch) and October 1995 (0). Painted January 1993 → April 1994 changes 17 cells HVO→ARBiH and 2 ARBiH→HVO. The sim produces exactly those 19 flips and no others.
- **Displacement.** All 1,279 HVO-caused Bosniak displacements come from the two Prozor captures. Bosniaks living in HVO-held cells when the war started total 74,521 (1991 census by cell). They include Mostar Zapad 6,569, Stolac 8,084, Čapljina 7,672, Kiseljak 5,421, Žepče 5,584, Vitez 3,950 and Prozor 3,821. None of them is ever displaced.

**So: the war is present and on time, it is too small, it is one-sided, and it is non-displacing on the HVO side.**

## 3. History (Historian seat; ICTY first, Balkan Battlegrounds second)

Full brief with paragraph citations: side-session notes `hvo_arbih_1993_historian_brief.md`. The main points:

- **Phases.**
  - Prozor, 23–24 Oct 1992: HVO attack (Prlić TJ).
  - Gornji Vakuf, 18 Jan 1993: HVO attack after its 15–16 Jan subordination ultimatum. Prlić finds the joint criminal enterprise in existence from mid-January 1993; affirmed on appeal.
  - The Lašva valley from 16 Apr 1993: Ahmići, the Vitez villages, Kiseljak from 18 Apr. "The Bosnian Croats threw the first punch" (BB1).
  - Sovići/Doljani from 17 Apr.
  - Mostar, 9 May 1993; the siege of East Mostar from June 1993 to early 1994.
  - Stolac, Čapljina and Prozor expulsions and the camp network (Heliodrom, Dretelj, Gabela), July–August 1993.
  - The ARBiH counteroffensive from June to November 1993: Travnik, Kakanj, Fojnica, Bugojno, Neretva '93 with Grabovica and Uzdol, then Vareš.
  - Stupni Do, 23 Oct 1993.
  - Ceasefire 23 Feb 1994; Washington Agreement 1/18 Mar 1994.
- **Initiative.** The HVO opened every phase from October 1992 to May 1993. The ARBiH held the initiative in Central Bosnia from June to November 1993. The HVO kept the initiative where it was the occupying force: the Herzegovina expulsions and the siege of East Mostar.
- **Outcome.**
  - The ARBiH took and held Travnik, Bugojno, Fojnica, Kakanj and Vareš; Gornji Vakuf stayed partitioned.
  - The HVO kept the Lašva pocket, Kiseljak–Kreševo, Žepče and West Mostar.
  - This is exactly what the painted references encode and what the sim reproduces.
- **Forces.**
  - HVO Central Bosnia Operational Zone (Blaškić): about 10,000–12,000 (repo OOB master, unsourced). The Vitez brigade alone was about 1,500 (BB2).
  - ARBiH 3rd Corps (Hadžihasanović): numerically superior; the 307th at Bugojno alone was 3,000–3,500.
  - The sim starts the HVO Central Bosnia brigades at 700 each (8,300 in total).
  - Croatia exercised overall control over the HVO and HV units fought in BiH. This is an international-armed-conflict finding (Prlić, Kordić appeals).
- **Displacement, per side (contested; ranges).**
  - **Bosniaks displaced by the HVO, 1992–94: about 20,000–45,000.** The judicial floor is about 15,000–20,000 summed from dated incidents: Prozor about 5,000 (1992) plus at least 2,500 (1993); West Mostar several thousand over four operations; Stolac about 3,000; Čapljina 420–3,000; the Lašva and Kiseljak villages; the Vareš enclave. Tabeau's UNHCR-based expert figure is 40,266 Bosniak refugees and IDPs originating in Herceg-Bosna; it includes 1992 VRS-caused movement and is disputed.
  - **Croats displaced by the ARBiH, 1993: about 25,000–50,000, unsourced as a total.** Kakanj alone 12,000–15,000 (BB2). Travnik, Bugojno, Fojnica, Konjic/Jablanica and Vareš add "thousands" each. The Prlić TJ finds that the HVO itself organised part of the Croat movement out of Central Bosnia.
- **What that means for the measured asymmetry.** The sim's **43,267 Croats displaced by the ARBiH is inside the historical range**. The **1,279 Bosniaks displaced by the HVO is 3–6% of it.** The defect is on the HVO side only.

## 4. Root cause, traced

### 4.1 The HVO Central Bosnia corps is disarmed at mobilization (engine)

- **What happens.** `alliance_update.ts:116-150`: at t41 the alliance falls to 0.10, below the allied threshold of 0.20. RBiH ground stops being friendly (`isFriendlyFaction`, `alliance_update.ts:103`).
- **The snapshots** (`--save-weeks 40,42,46,52`) show:
  - 30 HRHB cells go to `critical` supply at t42 (0 at t40).
  - Nine HVO Central Bosnia brigades turn `stranded_status: 'holding'`: Vitezovi, Jure Francetić, Stjepan Tomašević, Kiseljak, Ban Jelačić, the 94th, the 95th, Kreševo and N. Š. Zrinski.
- **The decay.** `stranded_brigade_lifecycle.ts:134` treats a critical cell as unreachable. `:369-376` then takes 3 cohesion and 2 morale a turn. `cohesion_drift.ts:180` exempts stranded holders from the faction floor. The measured loss is about 6 a turn (Vitezovi: 44 at t41, 20 at t45, 0.1 at t49).
- **Why only Žepče escapes.** The 111th carries the `enclave` tag (`oob_brigades.json`), so the stranded lifecycle skips it (`:313`) and its cohesion holds at the floor (30–41).
- **The gap.** The Lašva and Kiseljak pockets are defined as HRHB enclaves in `enclave_resilience.ts:313-337` (`resilience_start_turn: 40`), but none of their brigades is tagged. A besieged pocket is therefore treated as a stray.
- **The health gate cannot see it.** `stranded_brigades` is measured at t188, after the Washington Agreement has reconnected everyone, so it reads 0.

### 4.2 The stance layer makes the war one-sided (engine, explicit rule)

`bot_corps_stance.ts`:
- `:250-260`, RBiH: in open war, corps whose HQ is in Travnik, Bugojno, Vitez, Novi Travnik, Busovača, Kiseljak or Zenica are set **offensive**.
- `:280-284`, HRHB: in open war, every non-Herzegovina corps is set **defensive**, commented "HVO holds its central Bosnia enclaves while ARBiH attacks". This is the "Candidate A" lever from the 2026-06-09 Central Bosnia calibration work. It cured HVO over-expansion into ARBiH-painted cells, but it also deletes the HVO's April 1993 offensive.
- `:264-268`, HRHB: every corps whose HQ is in a Herzegovina "corridor" municipality is capped at **defensive** at all times. The Zagreb patron directive "Herzegovina Offensive: take Mostar hinterland" (`timelines/apr1992.json`, ceiling *offensive* from w40) can never take effect, so there is no Mostar front.

### 4.3 The bilateral war never starts displacement (engine)

- **Step 0** of `processDisplacementTakeover` (`displacement_takeover.ts:580-616`) seeds a displacement timer for every minority in every held cell, but only on the first war turn (`currentTurn === war_start_turn + 1`). On that turn `areFactionsAtWar(RBiH, HRHB)` is false (`:188-199`).
- **Step 1** (`:621-643`) seeds only on a battle capture.
- So when the bilateral war starts at t49, nothing reaches the Bosniaks in HVO-held cells or the Croats in ARBiH-held cells unless the cell changes hands.
- **Minority erosion** (`minority_erosion.ts`) acts on militia only, not on civilians.

### 4.4 The ARBiH side is authored; the HVO side is dead

- **ARBiH.** The 1993 offensives are pre-planned operations (`pre_planned_operations.ts:1633` onward): the Central Bosnia Counteroffensive, Operacija Krug, Strijela, the Battle of Bugojno, Neretva '93 and the Vareš November Offensive. Their objectives are the 17 painted cells. They may fail, so they are legal under the 2026-09-17 owner rule. But they are why the territorial match holds whatever the HVO does.
- **HVO.** The emergent HVO side would need more than its paper intent:
  - the bot war aim "Lasva Valley Offensive" (`bot_strategy.ts:566`);
  - the patron directives "Central Bosnia Offensive" (w50+) and "Herzegovina Offensive";
  - the corps directive `offensive_targets` (Busovača and Fojnica cells at t60).
  
  None of these can act: the brigades are at cohesion 0 (4.1) and the stance is pinned (4.2).
- **A small leak worth noting.** At t60 the same Busovača/Fojnica target list also appears on `hvo_southeast_herzegovina`'s directive, a corps 100 km away.

### 4.5 Not the cause

- **Alliance timing.** War at t49 against a historical January–April 1993; ceasefire at t94 against 23 Feb 1994 (t99). Both are close.
- **The Graz accords.** They are scoped to the Serb–Croat Herzegovina pairs (memory `hvo_passivity_analysis`).
- **HVO OOB size.** It matters for how strong the war is, but it is not why the war is absent.
- **The painted references.** They agree with the history (§3).

## 5. Experiments (8 measured 188w runs, budget per ORCHESTRATION.md §4b)

**Setup.**
- Branch `claude/hvo-arbih-war-diagnosis`, from `origin/main` 0450a2e8d. Each change is a named `EXPERIMENT_*` toggle; none is for merge.
- Each run was checked with `tools/verify_checkpoints.cjs` (checkpoints and guards), `tools/engine_health_gate.cjs --horizon 188w --strict` and the conflict metrics from §2.
- "Bosniaks/Croats displaced" means displaced + fled abroad + killed, attributed to the other side, over the whole run.
- Runs 2 and 4 were inert, and that is the finding.

| # | Change (toggle) | Hash | Jan93 / Apr94 / Apr95 / Oct95 | Guards | Strict health | HVO→ARBiH attacks (captures) | HVO operations vs ARBiH | Bosniaks displaced by HVO | Croats displaced by ARBiH |
|---|---|---|---|---|---|---|---|---|---|
| base | none | `0ec6d611` | 712/711/711/710 | intact | PASS | 2 (2) | Prozor–Rama (authored) | 1,279 | 43,267 |
| 1 | **E1** `enclave` tag on the 10 Lašva/Kiseljak HVO brigades (OOB data) | `a6dd4fb7` | 712/709/709/**700** | **breach**: 3 unwarranted ARBiH captures at Brčko, t173–178 | PASS (consistency 1) | 2 (2) | none | 1,279 | 43,357 |
| 2 | E1 + **E2** lift the open-war HVO-defensive stance rule | `a6dd4fb7` | same as 1 | | | **inert**: an enclave-tagged brigade may only attack inside its own (already HVO) enclave | | | |
| 3 | **E1b** stranded lifecycle skips brigades inside their own faction's defined enclave area (engine; replaces E1) | `fb79372d` | 712/711/**712**/709 | **breach**: Farz Bočinja receipt missing | **FAIL** (consistency 4: Sanski Most/Ključ 1995) | 2 (2) | none | 1,279 | 43,267 |
| 4 | E1b + E2 | `fb79372d` | same as 3 | | | **inert**: `reassignCorpsForBilateralWar` re-pins the HVO defensive with no targets (`bot_corps_ai.ts:195,338`) | | | |
| 5 | E1b + E2 + **E2b** symmetric bilateral-front diversion (HVO gets ARBiH's targets/stance/aggression) | `54e18faa` | 712/709/710/705 | intact | PASS | 3 (3) | **Operacija Snaga, Pljusak, Oseka** (HVO Central Bosnia, t49–59) | 1,618 | 43,267 |
| 6 | **E4** seed bilateral minority timers on the RBiH–HRHB front at war start (displacement only) | `abdce324` | 712/709/709/708 | intact | PASS | 2 (2) | none | **60,074** | **142,979** |
| 7 | **E4b** as E4, but seeded timers get one 0.25 wave and no sustained drain | `ac1d8c8c` | 712/**711/711**/707 | intact | PASS | 2 (2) | none | **17,885** | **70,935** |
| 8 | run 5 + **E3** Herzegovina corps not capped defensive during open bilateral war | `2cf0bf5d` | 712/710/709/704 | intact | PASS | **6 (3)**, incl. East Mostar t68 (repulsed) and Blagaj t66 | Snaga, Pljusak, Oseka, **Operacija Kobac** (Mostar, t58–64), Zamah | 1,618 | 43,340 |

**What the runs show.**

1. **The military war needs three gates opened together.** Those gates are the stranded decay, the stance rule and the diversion asymmetry. Each one alone is inert or only damages late 1995. With all three open (run 5), HVO Central Bosnia plans its own April–May 1993 offensive for the first time: three operations, t49–59. With the Herzegovina cap also lifted (run 8), the HVO attacks East Mostar in July 1993 and is repulsed, and East Mostar holds as it historically did.
2. **The resulting HVO war is still small.** It is 6 attacks against 30 by the ARBiH, and the Lašva operations produce 1 battle among them. What remains:
   - the HRHB cohesion floor drops 40→30 at w53;
   - the HVO keeps a `costly_victory` minimum predicted outcome on its directive;
   - the HVO OOB is thin: 700-man brigades against a historical Vitez brigade of about 1,500.
3. **The checkpoint cost is −1 to −6 per checkpoint, with guards intact (runs 5 and 8).**
   - **The direct cost is one cell, Gornja Rovna (Busovača).** The HVO takes it at t52 and the ARBiH never retakes it, because no ARBiH operation targets it. This is the old "HVO over-capture" mode, and it now needs an ARBiH answer rather than a stance cap.
   - **Every other lost cell is a late-war cascade**: Brčko, Goražde, Donji Vakuf, Sanski Most, Ilijaš. This is the known 1995 knife-edge.
4. **Displacement is decided by one rule, the war-start seed.**
   - The bounded seed (run 7) lifts HVO-caused Bosniak displacement from 1,279 to 17,885, the judicial floor of the historical range.
   - The cost to checkpoints is one October 1995 cell net, against the main baseline.
   - A symmetric rule over-displaces Croats: 70,935 against about 25,000–50,000. There are 203,024 Croats in ARBiH-held cells against 74,521 Bosniaks in HVO-held cells, and the ARBiH's captures already produce 43k. The historical asymmetry was one of policy, not geography: the Prlić TJ finds a joint criminal enterprise to remove the Muslim population, and Croats in Tuzla, Sarajevo and much of Zenica stayed. So the asymmetry should come from a policy decision, not from a constant tuned per faction (§6).
5. **The health gate is blind to all of this.** In the baseline, nine HVO brigades sit stranded at cohesion 0 for about 50 weeks, yet `stranded_brigades` reads 0 at t188.

## 6. Options for the owner

**RF entry test (ORCHESTRATION.md §4b).** All three parts pass, measured above:
- **(a) correctness defect.** There is a player-visible lie: the events report an HVO offensive and a siege of East Mostar that do not happen on the map. Several mechanics never fire: the "Herzegovina Offensive" and "Central Bosnia Offensive" patron directives and the "Lasva Valley Offensive" war aim. A whole corps sits stranded at cohesion 0 for 50 weeks.
- **(b) fidelity gap.** The Historian rates Ahmići, Mostar and the Lašva valley as among the best-known events of the war. A literate player playing RBiH sees almost no Bosniaks displaced by the HVO and 43k Croats displaced by their own army.
- **(c) measured.** Eight runs plus the baseline census.

**Queue context.** RF-1 (7th Corps), RF-2 (stance effects) and RF-3 (siege displacement, §6) hold the three calibration slots, and RF-4 (officer tenure) waits. There are file overlaps:
- Options C and D touch `bot_corps_stance.ts` and `bot_corps_ai.ts` (RF-2's files) and the 3rd Corps sector (RF-1's).
- Option B touches `displacement_takeover.ts`, the file RF-3 changes, and needs the same §6 bright-line panel.

| Option | What it changes | Measured | Player experiences | Risk | Cost and queue trade |
|---|---|---|---|---|---|
| **A. Tell the truth (presentation only)** | Condition the 1993 HVO events on what the engine did: the Lašva offensive and East Mostar siege cards fire only if HVO operations or attacks happened. Re-time or reword the Washington cards so the decision is not offered four weeks after the engine signed. Fix the Ahmići event, which has no `humanitarian_impact` while Stupni Do has 2. | n/a | Cards stop claiming what the map denies. The displacement ledger still shows 1.3k and 43k. | Low. Sensitive copy needs the small §4 copy panel. | Non-calibration N-lane. Takes no RF slot. |
| **B. Bilateral displacement on war start, decided by policy** | E4b's front-gated seed, with the rate set by a presidential policy decision on minorities in the war zone. Bots take the historical default: HRHB authorizes it, per the Prlić JCE finding; RBiH does not, and Croat departures come from captures and flight. Authorized expulsions feed the §2a condemnation signals, closing the known "refugee-only expulsion escapes both gates" residual. | Run 7 (symmetric 0.25): 712/711/711/707, guards and health PASS, 17.9k / 70.9k. A policy split would be about 17.9k / 43–50k (not measured). | As HRHB president, a decision in early 1993: expel or not. Expelling buys a "secure" rear and earns the condemnation grade cap. As RBiH president, the ledger now shows the HVO expulsions. | Medium. Population feeds recruitment, so every front shifts slightly. Needs the eight-seat §6 bright-line panel. | One calibration lane after RF-3 (same file, same panel), before or after RF-4. Est. 4–6 runs. |
| **C. The HVO can fight its war** | E1b + E2 + E2b + E3 as a proper lane: enclave pockets besieged, not stranded; symmetric bilateral diversion; Herzegovina corps free in open war; plus an ARBiH answer to HVO over-captures (catalog opportunity, not pre-planned), the HVO attack threshold, and an OOB check of the HVO Central Bosnia strengths. | Run 8: 712/710/709/704, guards and health PASS, HVO attacks 2→6, East Mostar attacked and held, no Mostar control change. | An April 1993 HVO offensive in the Lašva valley and a July Mostar assault. As RBiH president you defend first and counterattack in June, as in history. | High. Late-1995 cascades (−6 at Oct95), the Gornja Rovna over-capture, and an RS-front knock-on from freeing HVO corps. | One calibration lane after RF-1 and RF-2 merge. Est. 8+ runs. Displaces RF-4 or extends the queue. |
| **D. B + C + a Washington decision** | Everything above, plus a presidential Washington decision for both sides, replacing the preconditions-only signature at t98. | not measured | The full arc: ultimatum, war, siege, counteroffensive, and the choice to sign. | Highest. | Two lanes, post-1.0 in practice. |

**Sensitive history.** Ahmići, Stupni Do, the Mostar siege and the Heliodrom/Dretelj camps are adjudicated crimes.
- **What the policy must preserve.** Any option that makes them emerge rather than narrated (B, C, D) needs the §6 panel. The policy must:
  - keep the judicial characterisations: the JCE finding (Prlić), and the ARBiH crimes at Grabovica, Uzdol and Trusina recorded but not equated;
  - keep the bright line: atrocity caps the grade and never rewards;
  - never let the player stage a named massacre. The engine produces expulsion and displacement; the named events stay discrete narrative ruptures under the §2 rules.
- **Option A also needs the §4 copy panel**, because it changes when sensitive cards fire.

## 7. Recommendation

1. **Do A now** as a non-calibration N-lane. The cards currently tell the player about an HVO offensive and a siege that the map does not show. That is a correctness defect, and it costs no RF slot.
2. **Build B before 1.0**, as RF-5, queued directly after RF-3, because they share `displacement_takeover.ts` and the §6 bright-line panel.
   - It is the measured fix for the asymmetry the owner asked about.
   - It is small: one rule plus one presidential policy decision.
   - Its symmetric form already passes the merge bar except for one October 1995 cell.
   - It is the honest model: the HVO expulsions happened inside ground the HVO held, so no territorial change is needed or wanted, and the owner rule on ownership transfer is untouched.
3. **Defer C to post-1.0**, and park this branch with an `archive/` tag as its starting point.
   - C works as a mechanism: three gates opened together produce a real HVO offensive and a Mostar assault, with guards intact.
   - But it is still too small to matter, it costs up to six late-war cells, and it collides with RF-1 and RF-2 files.
   - The territorial outcome is already right.
   - Exception: **E1b alone is a defensible engine-correctness fix.** A besieged pocket inside a defined enclave should not count as stranded. Run 3 shows it would need its own Farz/consistency work, so it goes in C, not B.

## 8. Findings outside this lane (report only)

1. **Health-gate blind spot.** `stranded_brigades` is measured only at t188. Nine HVO brigades stranded at cohesion 0 for about 50 weeks read as 0. Suggest a max-concurrent or brigade-weeks metric.
2. **Narrative/mechanics mismatch** (Option A). "Coordinated HVO operations strike from Jablanica to the Lašva Valley" (t54), "HVO Besieges East Mostar" (t57) and the "Lasva Valley Offensive" war aim describe things the engine never does.
3. **The Ahmići event has no `humanitarian_impact` effect**, while Stupni Do (2), the camps (3), Grabovica/Uzdol (2) and Trusina (1) have one (`events/war_1993.json`).
4. **Washington timing.** The engine signs at t98 (14 Feb 1994), against a historical 1/18 Mar 1994. The presidential "Washington Agreement" cards fire at t102–105, after the fact.
5. **Directive leak.** At t60 the HVO Central Bosnia war-aim targets (Busovača and Fojnica cells) also sit on `hvo_southeast_herzegovina`'s directive.
6. **Two orphan HVO formations, `F_HRHB_0003`/`0004`.** They are at Travnik with `corps_id` undefined, 0 battles in 188 turns and 3,000 and 1,834 men.
7. **Historian gaps.**
   - `HISTORICAL_TIMELINE_MASTER.md` stops at 25 Jan 1993. The brief lists 38 dated anchors to add.
   - `HVO_ORDER_OF_BATTLE_MASTER.md` line 519 calls Stupni Do an "ARBiH response massacre". It was an HVO attack on a Bosniak village. The same file misspells Blaškić and has unsourced East Mostar death and HV-strength figures.
   - The BB knowledge base lacks BB1 pp. 226–270 (the Croat–Muslim war chapters).
8. **Tracked-file trap** (known, N-4). Every run with `--map` rewrites `data/derived/latest_run_final_save.json`.

## 9. Reproduce

- Experiment branch: `claude/hvo-arbih-war-diagnosis` (toggles named in §5; flip and run `npm run sim:scenario:run:188w`). Run 8's exact toggle state: `claude/hvo-arbih-war-diagnosis-run8-toggles`.
- Metrics script, snapshot inspector and census script: copied to `tools/diagnostics/hvo_arbih_war/` on the experiment branch.
- Historian brief: side-session notes `hvo_arbih_1993_historian_brief.md` (the orchestrator's coordination folder).
