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

EXPERIMENTS_AND_RECOMMENDATION_PLACEHOLDER
