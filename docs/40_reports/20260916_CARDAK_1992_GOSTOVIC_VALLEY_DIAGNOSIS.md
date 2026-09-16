# Čardak 1992 — why the engine cannot take the Gostović valley, and what was repaired

**Date:** 2026-09-16
**Target:** `op:zavidovici:cardak_2` — capture inside calendar 1992, RBiH at the January-1993 checkpoint.
**Outcome:** root cause found and repaired; **acceptance NOT yet met on the calibration scenario**.
A second, independent blocker is identified and measured but not fixed here.

---

## 1. What Čardak actually is

`op:zavidovici:cardak_2` is not a hill or an outpost. It bundles **six Serb-majority settlements** of
the upper Gostović valley, ~9–10 km south of Zavidovići town: Čardak (93.5% Serb), Kamenica (98.3%),
Kućice (59.8%), Mitrovići (95.9%), Priluk (100%), Vukmanovići (99.0%).

The valley was cleared in **November–December 1992** by a municipal Territorial Defence offensive —
Kakanj Municipal Defence Staff with its "Bosna" assault detachment, plus Zavidovići and Zenica TO
units under the Zenica Regional TO Staff. Over 120 km²; described in 3rd Corps sources as the first
major newly-liberated RBiH territory, and the line that faced Vozuća until Operation Farz in 1995.
Corroboration: the El Mudžahid Kamenica/Gostovići camp operated in this valley from 1993 (ICTY
*Hadžihasanović & Kubura*, IT-01-47), which is impossible unless the valley fell in 1992.

Sourcing caveat: **Balkan Battlegrounds has zero hits for "Čardak"**; its Zavidovići coverage begins
in 1993. This rests on Bosnian municipal/veteran sources plus the ICTY corroboration — tier-2/3, not
ICTY-tier. No exact day for Čardak village itself is sourced; use the Nov–Dec 1992 window.

ARBiH and HVO were **co-belligerents throughout 1992**; the Žepče-area breakdown is 24 June 1993
(the 305th and 319th surrendered 30 June 1993). A 1992 capture carries no Croat-flank complication.

## 2. Turn-to-calendar (verified, and it matters)

`turnToDateString` (`src/ui/map/utils/formatters.ts:12-17`): **turn 0 = 1992-04-06**, +7 days per turn.

- turn 38 = 1992-12-28 — the last turn wholly inside calendar 1992
- **turn 39 = 1993-01-04** — this is the jan1993 checkpoint week (`tools/verify_checkpoints.cjs:43`)

So a 1992 capture requires **turn ≤ 38**. "Before turn 39" is not sufficient proof on its own: turn 39's
own week spans 29 Dec 1992 – 4 Jan 1993.

## 3. Root cause — one predicate, three gates, and a probe that can never capture

Čardak's five shared-boundary neighbours are all non-RS: `kakanj:brnjic_2` (RBiH),
`zavidovici:hajderovici_2` (RBiH), `zavidovici:zavidovici_2` (RBiH), `zenica:gornja_vraca` (RBiH),
and **`zepce:viniste_2` (HRHB)**. It is cut off from VRS ground from turn 0; Vozuća is not adjacent.

`isBoundedIsolatedEnemyPosition` (`src/sim/combat/commander/plan.ts`) required **every** external ring
cell to belong to the attacking faction:

```ts
if (controllers[neighbor] !== briefing.faction) return false;
```

The single HVO-held Vinište cell therefore disqualified Čardak. That one predicate gates three places:

1. `plan.ts` — `deriveOpportunityTargetPurpose` → the `reduce_isolated_position` purpose
2. `emit.ts:471` — `findLocalOccupationCandidate`, the dedicated local-occupation path
3. `emit.ts:1790` — `targetIsBoundedPosition` → **`escalateToOperation`** (`emit.ts:1903`)

(3) is decisive. With it false the corps can only call `buildProbeOperation`, and a probe carries
`occupies_on_victory: false` (`corps_operation_helpers.ts:460`, read at
`attack_resolution_osid.ts:1451`). **A probe can never capture.** ARBiH 3rd Corps could attack Čardak
indefinitely and never take it.

Two other mechanisms were checked and do not cover it:

- `analyzeFactionGraph.enemy_pockets` (the paramilitary rear sweep) applies the same
  all-neighbours-mine rule (`osid_graph_analysis.ts:528`, `:742`) so Čardak is excluded — and it is the
  wrong channel anyway, being an atrocity/war-crime path.
- `consolidateRearPockets` *does* tolerate a co-belligerent ring, but it is **dead code**: no call site
  in `src/`. It was deliberately removed from the pipeline on 2026-05-28 (`fdacd5b46`) as a "silent
  free-flip mechanism" that bypassed war-crimes, casualty and displacement wiring. It is also an
  auto-flip, which this task forbids.

## 4. The repair (shipped)

`isBoundedIsolatedEnemyPosition` now treats a ring cell held by a **current co-belligerent** as sealed —
a defender cannot be relieved across allied ground any more than across ours — provided the attacking
corps itself holds at least `ISOLATED_POSITION_RING_DOMINANCE_SHARE` (2/3) of the ring. The dominance
share mirrors `ABANDONMENT_DOMINANCE_SHARE`. A hostile third party on the ring, or a sub-dominant share,
still returns false.

**Co-belligerency is read from the alliance relationship, not from the combat gate (corrected
2026-09-16).** The first version used `isRbihHrhbCombatBlocked`; that predicate is a *combat* gate and
also returns true during a mobilization window, under a temporary ceasefire, and before the earliest-war
turn. None of those is co-belligerency, so each would have sealed a ring across an arming or merely
paused third party. The corrected check uses `areRbihHrhbAllied` (alliance value above
`ALLIED_THRESHOLD`, i.e. 0.20) on the RBiH↔HRHB pair, which is the relationship itself and touches no
control, movement, supply or combat permission.

**There is no calendar cutoff, and co-belligerency does not "end at turn 40" (corrected 2026-09-16).**
`rbih_hrhb_war_earliest_week` is 40 in both scenarios, but that only means war *cannot begin* before
turn 40; `updateAllianceValue` floors the alliance at `ALLIANCE_FLOOR_BEFORE_WAR` (0.40) while
`turn < 40`, so the alliance is still allied on turn 40 and lapses only when its value actually falls
below 0.20. The earlier "window closes at the end of calendar 1992" statement was wrong. Because the
alliance floor (0.40) is above the allied threshold (0.20) for every turn below 40, the corrected
predicate is provably identical to the old combat-gate version across the whole t0–t39 horizon of this
calibration candidate, so the predicate correction changes no simulation behaviour the candidate can
see.

**Blast radius, measured on the April-1992 control map.** A naive "tolerate allied ring" would have
given HRHB 20 new eligible clusters across Foča, Goražde, Višegrad, Rudo, Srebrenica, Bratunac and
Pale — absurd, and destructive to the Drina calibration. With the dominance requirement the total is
four clusters: RBiH +3 (`bugojno:brizina`+`prijaci`, `konjic:bijela_2`+`sitnik`, `zavidovici:cardak_2`),
HRHB +1 (`bosanski_samac:crkvina_2`), RS +0. In the Federation era (apr1994/apr1995 painted maps) it is
zero. In the 40-week run the Konjic and Šamac cells did not move at all.

## 5. Measurements

| run | configuration | jan1993 | apr1994 | apr1995 | oct1995 |
|---|---|---|---|---|---|
| baseline `ac3e5e152` | HEAD | **700** | 702 | 697 | 667 |
| n396 | predicate repair only | **700** | 702 | 697 | 667 |
| n397 | + authored op after Maglaj (af 28) | **699** | 703 | 700 | 665 |
| n398 | + authored op before Maglaj (af 8) | **698** | 704 | 699 | 674 |

Floors 694/674/668/641; **authorized January minimum 700**. Independently verified: n396 reproduces the
recorded baseline exactly; anchor contract 31/31, enclave guard 9/9, engine-health gate PASS and
`consistency_failures` 0 in all three. The "GUARD BREACHED / Do not merge" line in the checkpoint tool
is the Farz P-A discriminator (Vozuća taken by 3rd rather than 2nd Corps); it **fails identically on
n396**, so it is pre-existing and not caused by any change here.

**Date fidelity favours n397 rather than counting against it.** Turn 27 = **12 October 1992** is about
six weeks early against the historian's Nov–Dec clearing — inside tolerance for a multi-week municipal
TO offensive. The HEAD baseline capture at turn 64 = **28 June 1993** is roughly seven months *late*.

**40-week scenario (A/B, `apr1992_definitive_40w`):** baseline 678 → repair 679. Exactly two control
differences map-wide. Čardak RS→RBiH at **turn 34 = 30 November 1992**, mechanism `combat`, operation
**"Operacija Strijela"** (`sector_attack`, 3rd Corps, started t29), brigades
`arbih_705th_slavna_mountain` + `arbih_725th_light`. The second difference,
`op:odzak:donja_dubica`, occurs at turn 40 — after the week-39 checkpoint. So in the 40-week scenario
the repair alone produces exactly the required outcome, on the historically right date.

**188-week calibration scenario: it does not.** The two scenarios differ materially (the 188w is the
`calibration_scenario: true` authority; they differ in `initial_osid_controllers`,
`osid_control_overrides`, `must_hold_osids_by_corps`, recruitment rates,
`firepower_deficit_penalty_enabled` and `supply_reserves_enabled`). There, the repair is
**measured-neutral** — identical scores — and Čardak is still taken at turn 64 (1993-06-28) by the
summer-1993 counteroffensive.

## 6. The second blocker (found, measured, NOT fixed)

`getHeadQueuedPrePlannedBrigadeIds` (`pre_planned_operations.ts:2494-2509`) reserves the roster of
`queued_operations[0]` **only**, and `emit.ts` filters those brigades out of commander operations.

On the calibration scenario the 3rd Corps head entry from t14 to t60 is the **Central Bosnia
Counteroffensive, which holds sixteen brigades in that reserved state for 46 turns.** That is why the
corps launches nothing but probes across the whole second half of 1992, and why the now-unblocked
isolated-position mechanism never fires on Čardak there.

This was proved, not inferred. In n397, inserting a three-brigade operation at the head released
thirteen brigades, and the commander immediately took Čardak at **turn 27 = 12 October 1992** by
combat — operation `Operacija Naprijed`, brigades `arbih_314th_slavna_liberation` +
`arbih_712th_mountain`, RBiH at week 39, i.e. **both acceptance criteria met**. Both capturing
brigades are on the sixteen-brigade Central Bosnia roster; the operation could only form because they
were released. The first brigade-state divergence from n396 is **turn 16** — two turns after the
reservation changes, eleven turns before the capture, and twelve before the authored op's own
`available_from` — which proves the effect is the pre-injection reservation, not the operation.

The authored operation contributed nothing: it reached injection at t30 and was **skipped**, receipt in
`run_summary.json → op_injection_validation`:
`{"check":"all_objectives_owned","op_name":"Gostović Valley","turn":30}` — Čardak was already RBiH from
t27. Zero battles, zero appearances in `operation_diagnostics` across 188 weeks.

**The cost, stated correctly.** The −2 at jan1993 is **not** RBiH over-extending. `donji_vakuf:prusac_2`,
`donji_vakuf:korenici` and `sipovo:volari_2` all start **RBiH**, and the painted reference expects **RS**
to have taken them by jan1993. The loss is **RS running late**, not RBiH gaining:
`prusac_2` RS t39 → t41; `korenici` RS t36 → t38 (n397) or never (n398); `volari_2` RS t30 → t41, and by a
different RS brigade. The traceable chain: at t19 `arbih_707th_slavna_mountain` (3rd Corps) vacates
`op:donji_vakuf:korenici` for `op:bugojno:vesela_2` — it is standing on the cell in n396 and gone in
n397 — which changes the defender and slips RS 16th Krajina Motorized's timing past week 39.

**The effect is dispersive, not targeted.** n397 hit `prusac_2` + `volari_2`; n398 hit `korenici` +
`prusac_2` — same frontage (the documented Jajce / Skender Vakuf / Donji Vakuf / Šipovo western-Bosnia
cascade site), different cells. Do not plan on "fixing the two cells": a third placement will hit a
third pair. The lever is the release scope, not the cells.

## 7. A falsified premise worth recording

The authored operation was first designed on the belief that Čardak is undefended — the run diagnostic
`sector:vrs_1st_krajina:4`, `unstaffed: true`, 0 assigned / 0 reserve / 0 rear. **That evidence is a
week-40 snapshot of a 40-week run and does not hold in mid-1992.** When the operation was placed early
(n398, injecting t8) its attacks resolved at **power_ratio 0.66 (repulsed), 0.86 (stalemate), 0.69
(repulsed)** — the attacker was weaker than the defender, and the operation ended in `failure`.

This vindicates the historical date rather than contradicting it: **Nov–Dec 1992 is when the local
force ratio finally supported the attack.** By t28–t34 the Kakanj 329th is 1,151 men, the Zenica 303rd
1,800, and the 7th Muslim 2,200 sits on the staging OSID. An early-1992 authored operation cannot
succeed on force ratio; and because the queue only ever inspects index 0, a late-1992 authored
operation cannot be scheduled without displacing the Maglaj counterattack.

**The engine's refusal was correct behaviour, not a bug.** Two mountain brigades attacking at a low
confidence band on stale intel, losing 172 men to inflict 37 on village militia, is exactly what a
June-1992 3rd Corps attempt on this pocket should look like. A June capture would have been the absurd
outcome. (The axis also went in with two brigades rather than three: `arbih_351st_liberation` has
`available_from: 8` but was not yet instantiated — `brigade_missing` at t8.)

## 8. What is in the tree

- `src/sim/combat/commander/plan.ts` — the predicate repair.
- `src/sim/combat/pre_planned_operations.ts` — comment correction only; the previous comment asserted
  Čardak is ineligible for the isolated-position operation, which the repair makes false.
- `tests/commander/operation_purpose_guard.test.ts` — the old "any foreign ring cell disqualifies"
  test replaced by three: hostile third party ⇒ null; allied minority ⇒ isolated; ally-dominated
  ring ⇒ null.

`npx tsc --noEmit` exit 0. Focused tests 87/87. Full suite green on this tree (~13,982 passed; the only
reported failures were the deliberate `vitest_balanced` failure-control fixture, and
`front_edge_foca_shared_border_real_save.test.ts`, which reads
`data/derived/latest_run_final_save.json` and fails only when a scenario run has overwritten it —
it passes against the committed save).

Behaviourally this tree is n396: **700/702/697/667, identical to baseline. Non-regressive.**

## 8b. Reproducibility of the two candidate runs

**n397 and n398 are not re-creatable from HEAD.** The authored `Gostović Valley` operation that
produced them was deliberately reverted (§8), so the source that generated those two runs no longer
exists in the tree. Their artifacts under `runs/` are immutable and every figure in this report was
read from them, but anyone wanting to reproduce either must first re-author the operation:
n397 = the op placed *after* `Maglaj Local Counterattack` with `available_from: 28`,
`planning_duration: 4`; n398 = the same op placed *before* Maglaj with `available_from: 8`,
`planning_duration: 3`, `minimum_viable_participants: 1`; both staged at
`op:zavidovici:hajderovici_2`, objective `op:zavidovici:cardak_2`, brigades
`[arbih_329th_mountain, arbih_303rd_vitezka_mountain, arbih_351st_liberation]`.

Only **n396** — the predicate repair alone — corresponds to the current tree, and it is the
configuration that is non-regressive.

## 9. Open

1. **The head-of-queue brigade reservation — the one lever worth pulling.** Reserving sixteen brigades
   for 46 turns before an operation injects is the substantive engine finding here, and it is what
   suppresses the historically-correct October capture. The documented purpose of the reservation
   (`pre_planned_operations.ts:2511-2516`, ADR-0005 v2.2c) is to stop TG donor consumption stranding an
   op *just before* injection — a 46-turn horizon is far beyond that intent. Narrowing the release —
   by lookahead window, or to the relevant axis subset rather than the whole roster — would plausibly
   keep the t27 capture while leaving the Donji Vakuf frontage undisturbed. **One change, one measured
   run.** It is an engine change with cross-corps blast radius, so it wants its own lane and its own
   decision.

   There is an owner decision attached: **n397 already meets the acceptance criteria** (combat capture
   12 Oct 1992, RBiH at jan1993, no override) at jan1993 **699** — one below the authorized 700
   minimum, above the 694 floor, and **net +1 across the four checkpoints** (2767 vs 2766). Whether to
   take acceptance at 699 or hold the 700 contract is a threshold call. If n397's shape is ever merged,
   it must be merged *for the reservation release*, not for the authored operation — the operation
   contributed nothing and was skipped.

1b. **RS end-state health moved materially and deserves its own lane.** Across n396 → n397 → n398: RS
   mean morale 36.6 → 40.2 → 42.6; RS combat-effective brigades 23 → 31 → 32; RS hollow_ratio
   0.371 → 0.492 → 0.525; total killed 47,915 → 46,998 → 46,075; cascade 30 → 27 → 37. That is what
   buys n398 its +7 at oct1995. Real calibration signal, unrelated to Čardak.
2. **OOB anachronisms near Zavidovići** (flagged, not fixed): `arbih_7th_vitezka_muslim_liberation`
   carries `available_from: 0` but was formed 19 Nov 1992 in Zenica (ICTY IT-01-47) and BB places it in
   this sector only in 1995 — yet it is the brigade the 1993 axis assigns to Čardak.
   `arbih_328th_mountain` carries `available_from: 2` but the real 328th formed 29 Sep 1994 (from the
   318th, 19 Dec 1992, and the 320th). `arbih_303rd_vitezka_mountain` carries `available_from: 0` but
   formed 18 May 1992 and spent 1992 at Smetovi / Visoko–Ilijaš.
3. **`operational_initial_master.json`** lists `cardak_2` (and `vozuca_2`) as RBiH, contradicting
   `operational_political_control.json` (RS), which is what the engine reads.
4. **`docs/10_canon/HISTORICAL_TIMELINE_MASTER.md` has no Zavidovići or Žepče entries at all.** The
   Gostović valley operation — Nov–Dec 1992, >120 km², the largest ARBiH territorial gain of that year
   — is a genuine canon gap.

## 10. Reservation-policy lane — executioner result (2026-09-16)

This section records the bounded follow-up the packet authorised: narrow the head-of-queue brigade
reservation so a distant queued plan does not freeze its roster against commander-generated operations.
It supersedes the "Open" item §9.1 and the un-fixed status in §6.

### 10.1 Starting state preserved

- Local HEAD: `e9024b61a392a500c019b4d6b017d8d15a1b3a1e` (branch
  `codex/january-1993-operations-20260914`).
- Retained predicate-only working configuration preserved before any experiment: git tag
  `preserve/n396-predicate-only` → `8518670881bf8f770ba0e461cb363c01fae5a3b2`; full worktree patch and
  a copy of this report saved under `%TEMP%\opencode\n396_preserve\`.
- The reverted authored `Gostović Valley` operation was **not** restored. n397/n398 remain
  non-reproducible diagnostic evidence only (§8b); the candidate below does not depend on them.

### 10.2 Caller audit (the four reservation helpers)

| helper | callers | purpose | touched |
|---|---|---|---|
| `getHeadQueuedPrePlannedBrigadeIds` | `emit.ts:328,1604,1795` | **command-selection** exclusion from local-occupation candidates and probes | **changed** |
| `getQueuedPrePlannedBrigadeIds` | `stranded_brigade_lifecycle.ts`, `standing_og_defense.ts` | full-queue **routing** protection | preserved |
| `getReservedPrePlannedBrigadeIds` | `operation_preparation.ts`, `tactical_group_selection.ts` | **TG donor-consumption** protection (`available_from > turn`) | preserved |
| `getActiveAuthoredAssemblyOsid` | `recruitment_engine.ts` | **recruitment/assembly** placement | preserved |

Only the command-selection helper was in scope. The bounded policy was applied there and nowhere else.

### 10.3 The bounded policy

`getHeadQueuedPrePlannedBrigadeIds` now reserves a corps' head queued roster **only once that plan is
due** — `(def.available_from ?? 0) <= state.meta.turn` — and takes `meta` for the turn (callers already
pass the full `GameState`). `available_from` is the plan's own earliest preparation/injection point; no
lookahead constant was introduced, `planning_duration` is not subtracted from it, and missing timing
defaults to due (0), matching `getReservedPrePlannedBrigadeIds`. Queue order, objectives,
`available_from` values, brigade data, control, combat strength, probe-occupation rules and political
timing are unchanged.

Effect on the observed defect: from t14 to t59 the 3rd Corps head is the Central Bosnia Counteroffensive
(`available_from` 60); under the old helper its sixteen brigades
(`17th/733rd/737th`, `329th/303rd/319th`, `314th/330th/717th`, `708th/712th/727th`, `327th/328th/351st`,
`7th`) were reserved the whole time. Under the bound they are eligible until the plan is due.

Focused coverage added/updated: distant head ⇒ no exclusion; due head ⇒ reserved; missing
`available_from` ⇒ due from the start; plus the predicate cases (allied / hostile / ceasefire /
mobilization / exact-2⁄3 boundary / sub-dominant / non-co-belligerent third party / all-attacker ring).
Typecheck exit 0; focused suites 93/93 plus the adjacent reservation, commander, routing and recruitment
suites (604/604).

### 10.4 Candidate measurement (188w scenario, `--weeks 39`, no `--map`)

| run | jan1993 | final_state_hash |
|---|---|---|
| n396 (predicate only, retained) | 700 | — |
| **n399** (predicate corrected + reservation bound) | **700 / 712** | `31b0388ecdacd0c4` |
| **n400** (identical inputs) | **700 / 712** | `31b0388ecdacd0c4` |

n399 and n400 are byte-identical (`final_save.json` sha256
`31b0388ecdacd0c42702ccc64e0239f64059bc4445715c164c38e75757ac5c48`). Both sit at the authorised January
minimum of 700. This lane used only local HEAD plus the working patch; no 40w run, no 188w full run, no
authored operation.

### 10.5 Čardak provenance

- **Capture:** `op:zavidovici:cardak_2` RS → RBiH at **turn 23 = 1992-09-14**, mechanism `combat`,
  event `{attacker_brigade: arbih_303rd_vitezka_mountain, from: RS, to: RBiH}`.
- **Operation-owned:** battle `battle_id 23:op:zavidovici:cardak_2:arbih_303rd_vitezka_mountain:null`,
  `operation_id arbih_3rd_corps:Operacija Izlaz:t21`, `operation_name "Operacija Izlaz"`,
  `operation_type sector_attack`, created **t21**, planning t21–22, `recovery: completed` at t23.
- **Participants:** `arbih_303rd_vitezka_mountain`, `arbih_314th_slavna_liberation`,
  `arbih_329th_mountain` — three of the sixteen Central Bosnia roster brigades.
- **Battle:** 3 attack orders on the objective, 1 battle, `decisive_victory`, `power_ratio 3.68`,
  defender `RS` militia (`zavidovici:RS`), attacker casualties 86 / defender 69.
- **Controller at t39:** RBiH (checkpoint satisfied).

**Causal chain, traceable to the changed call site.** `findLocalOccupationCandidate` is gated by the
command-selection reservation (`emit.ts:328`) and is only reachable from turn 21 (`emit.ts:324`). On t21
the old helper reserved all sixteen Central Bosnia brigades, so no candidate existed; with the bound the
same brigades are eligible and the corps built its own operation. The capture is therefore the repaired
mechanism firing, not an authored roster.

**Timing is stated separately from the historical window and is not gated.** t23 = 1992-09-14 sits about
seven weeks before the historian's Nov–Dec 1992 Gostović clearing (§1). The acceptance requirement for
this packet is year-level (a 1992 capture), which is met; the September date is recorded as the
candidate's own result and is **not** reconciled to the November–December window. This closeout adds no
date gate and changes no OOB entry.

### 10.6 January match diff (vs retained n396) — one correction, one new mismatch

12 mismatches in each; the sets differ by exactly one cell each way:

- **Fixed:** `op:zavidovici:cardak_2` (n396 RS → n399 RBiH; reference RBiH). This is the target.
- **New:** `op:donji_vakuf:prusac_2` (n396 RS → n399 RBiH; reference RS).

**`prusac_2` is OPEN — a diagnosed timing regression, not an accepted exception.** There is no owner
waiver for it. All three `prusac_2` / `korenici` / `volari_2` cells start RBiH and the reference expects
RS by jan1993, so the new mismatch is RS not having arrived, not RBiH over-extending. Inspected cause:

- n396: `rs_16th_krajina_motorized` takes `korenici` in **one** strike at w36 (`decisive_victory`,
  ratio 2.03, vs defender `arbih_707th_slavna_mountain`) and then `prusac_2` at w39 (ratio 7.91).
- n399: the same attacker meets a rotating defence on `korenici` — 707th at w36 (only
  `costly_victory`, ratio **1.32**), `arbih_705th_slavna_mountain` at w37 (`stalemate`, ratio 0.79),
  `arbih_770th_slavna_mountain` at w38 (`decisive_victory`) — and is still engaged on the 39th week.
- `arbih_705th` is on the released Central Bosnia roster; the ARBiH 3rd Corps dispositions on this
  frontage changed once the roster was free. The 707th vacating `korenici` for the Bugojno area is part
  of the picture (it ends at `op:bugojno:prijaci` in n399) but, as the packet warned, is a lead and not
  by itself the complete explanation: the load-bearing fact is the changed defender rotation and the
  lower w36 power ratio.

**Scope of the claim is the t39 candidate, which ends at t39.** `prusac_2` is **RBiH at the checkpoint —
not captured by RS within the measured candidate**. Because the candidate stops at t39, this report does
**not** assert that RS takes `prusac_2` later, nor any eventual capture date; no such evidence exists in
n399/n400. `volari_2` slips within the window (RS t30 → t34, by `rs_1st_gradika_light_infantry`) but is
still RS at t39 and so matches; that timing shift is recorded, not explained.

This is the same dispersive site documented in §6 — n397/n398/n399 each hit a different cell pair on the
Jajce / Skender Vakuf / Donji Vakuf / Šipovo frontage. **No location-specific holds or target-specific
strength changes were added**, per the packet, and nothing here is to be tuned to restore `prusac_2`. The
cell remains an **open January mismatch**; the January numerical minimum is still met at 700.

### 10.7 Verdicts

**A. Reservation-policy repair — SUPPORTED by the implementation audit and passing tests.** The defect
is isolated, reproduced with the existing queue, and fixed by the plan's own `available_from` timing with
no new constant. Task-group donor protection, full-queue routing protection and recruitment placement
are untouched and their regressions pass. The changed helper is the command-selection reservation and it
no longer freezes a distant roster. The alliance-predicate correction is separately attributable and
proven identical for t0–t39 (alliance floor above the allied threshold until turn 40).

**B. Čardak — year-level requirement met.** Operation-owned combat capture at **t23 = 1992-09-14**
(calendar 1992), RBiH-controlled at the t39 checkpoint. No event/calendar override; the capture comes
from the repaired isolated-position mechanism.

**C. January numerical minimum — PASS; January map preservation — one correction and one new mismatch.**
jan1993 **700/712**, equal to the authorised minimum. Exactly one January cell fixed (`cardak_2`) and one
new mismatch introduced (`prusac_2`). `prusac_2` is **OPEN**: a diagnosed timing regression, not an
accepted exception, with no owner waiver (§10.6). The four-checkpoint sum is **not** used to argue this
candidate.

**D. Overall January calibration — OPEN.** Čardak is captured and the numerical minimum is met, but the
map is not preserved because `prusac_2` is an unresolved new mismatch. Closing the packet's Čardak
objective does not close January calibration.

**E. Remaining evidence limitations.** This lane measured a t39-truncated run only; later checkpoints
were not run and the full 188-week territorial result is not established (not required by the packet).
The predicate correction is argued behaviour-neutral for t0–t39 from the alliance floor, not measured by
a separately gated run. Pješivac-Kula / Čagalj is **not** addressed here and remains open. The OOB
anachronisms and `operational_initial_master.json` contradiction remain flagged for a later lane and were
not bundled into this experiment. Nothing is merged to `main`, no baseline replaced, nothing published.

### 10.8 Measured candidate — binding and preservation

**n399 and n400 are two independent executions of one candidate** (`npm run`-equivalent launcher invoked
twice), not a candidate and a variant. Both bind to:

| item | value |
|---|---|
| source commit | `e9024b61a392a500c019b4d6b017d8d15a1b3a1e` + working patch (below) |
| working tree | dirty (`git_dirty: true`), which is why the run is exploratory and not §6-grade |
| scenario | `data/scenarios/apr1992_definitive_188w.json` |
| truncation | `--weeks 39` (reaches turn 39 = 1993-01-04) |
| flags | `--unique --out runs` (no `--map`) |
| runtime | Node `v22.23.2`, no §6/override env vars |
| input digest | `f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf` (both runs) |
| run paths | `runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n399`, `..._n400` |
| final save sha256 | `31b0388ecdacd0c42702ccc64e0239f64059bc4445715c164c38e75757ac5c48` (both) |

The identical final-save evidence establishes determinism **for this candidate at this scope only**
(t39, these inputs); it says nothing about later turns or other scenarios. No third unchanged January
run was taken.

Preserved before and after the candidate: the n396 starting snapshot (tag `preserve/n396-predicate-only`,
patch + report under `%TEMP%\opencode\n396_preserve\`), and the **final production patch plus the
untracked production report** saved to the same directory (`final_candidate.patch`). The scoped local
checkpoint commit records the production change, tests, this report and the ledger entry; no push, no
`main` merge, no baseline replacement, no viewer publication.

### 10.9 Full-suite verification record

`npm run test:vitest` (balanced, 4 shards, Git Bash on `PATH`) returned top-level **exit status 1**. This
invocation was **not fully green** and must not be described as such. Per-shard file results:

| shard | passed | failed | skipped |
|---|---|---|---|
| 1 | 337 | 0 | 1 |
| 2 | 335 | 0 | 1 |
| 3 | 330 | **1** | 1 |
| 4 | 335 | 0 | 1 |

Two distinct things produced red lines; only one is a real failure:

1. **Expected negative-control child output (not a failure).** `tests/fixtures/vitest_balanced/deliberate_failure.fixture.ts`
   is run as a child process by `tests/run_vitest_balanced.test.ts`, which asserts the balanced runner
   returns status 1 on an intentionally failing inventory
   (`tests/run_vitest_balanced.test.ts:82,90,102`). That child's `FAIL` lines are expected; the parent
   test passes.
2. **Real failure — dependency-hook timeout.** `tests/runtime_dependency_resolution.test.ts` failed with
   `Error: Hook timed out in 10000ms`, skipping its 12 tests, in shard 3. **Isolated retry: 12/12 passed**
   (`npx vitest run tests/runtime_dependency_resolution.test.ts`, 1.52 s). This is a load-sensitive hook
   timeout, not a regression from this change; the suite was not rerun wholesale.

Focused evidence reused: `npx tsc --noEmit` exit 0; the changed-suite tests 93/93 and the adjacent
reservation/commander/routing/recruitment suites 604/604.
