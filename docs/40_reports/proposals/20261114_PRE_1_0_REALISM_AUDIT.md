# Pre-1.0 realism audit: what a 1992-95 commander would find absurd

**Date:** 2026-11-14 (lane RF-6, report only)
**Scope:** read-only audit of `main` at `0450a2e8d` for realism defects, hidden railroads and dead mechanics before 1.0. No code, data or calibration changed.
**Lenses:** War-or-Game (lead), Railroad Hunter, Gap Finder, Historian (ICTY first, Balkan Battlegrounds second).
**Excluded:**
- Everything already in the out-of-scope register (`F:/AWWV-coordination/crash_recovery_20261112/out_of_scope_findings.md`).
- Everything settled in project memory:
  - cohesion floors;
  - RS brigade-destruction asymmetry;
  - HVO passivity;
  - EH-3 `stranded_status`;
  - `strategic_depth`;
  - sectors as standing OGs;
  - the parked operation planner;
  - Usora HVO under the ARBiH 3rd Corps;
  - the owner-ratified forced fall of Srebrenica and Žepa.
- Known items that are still live and have no owning lane are flagged as KNOWN, with fresh numbers.

**How to read the freeze column.** Each finding gets a recommendation against the RF entry test in `ORCHESTRATION.md` §4b:
- (a) a correctness defect, or (b) a fidelity gap the historian says a literate player would notice;
- and (c) a measured premise.

"Measured" below means the claim was checked against the run in §1, not only read in code. The orchestrator triages.

## 1. The run

| Item | Value |
|---|---|
| Command | `npm run sim:scenario:run:188w` (headless, bots historical) |
| Commit / tree | `0450a2e8d`, `git_dirty: false`, Node 22.23.2 |
| Run directory | `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n0` (machine-local) |
| Final state hash | `0ec6d6112fd0e954` |
| Checkpoints (`tools/verify_checkpoints.cjs`) | Jan93 712 / Apr94 711 / Apr95 711 / Oct95 710, the same as main |
| Anchors, guards | 31/31 anchors; enclave guard holds; Farz P-A and P-B pass |

Data used:
- `final_save.json`: turn summaries, control events, brigade histories, the casualty ledger, displacement aggregates, sustainability, IVP and enclave resilience.
- `operation_aars.json` (71 operations).
- `weekly_report.jsonl`: operation diagnostics, supply and exhaustion series.
- `run_summary.json` and `brigade_temporal_log.jsonl`.

One supporting 60-week diagnostic run (Bihać supply, F5) was taken at the same commit. Years use the sim calendar: 1992 = weeks 0-38, 1993 = 39-90, 1994 = 91-142, 1995 = 143-187.

## 2. Ranked findings

Ranked by player impact and 1.0 risk. Columns:
- **Sev:** P0 breaks a system the player relies on; P1 distorts outcomes; P2 visible but local; P3 minor.
- **Cal:** calibration-moving.
- **Freeze:** the recommendation; the reasons are in §3.

| # | Finding | Sev | Cal | Measured | Freeze |
|---|---|---|---|---|---|
| F1 | Every municipality "collapses" by legacy-id mismatch; negotiation momentum pinned at 1.0; Washington and ceasefire IVP gates are always true | P0 | yes | yes | **RF** |
| F2 | ARBiH 1994 offensives lose 15-30:1; historian bound is 2-4:1; Grmeč-94's real success is missing | P1 | yes | yes | **RF** |
| F3 | The VRS stops taking ground after January 1994; a defender "last stand" rule favours ARBiH defenders (KNOWN symptom, new mechanism) | P1 | yes | yes | post-1.0 unless the owner pulls it in; cheap diagnosis now |
| F4 | Bosniak civilians cannot flee abroad (hardcoded 0%); refugees abroad 306k against about 1.2M | P1 §6 | likely | yes | **RF, inside RF-3** (same files, same panel) |
| F5 | Encircled pockets (Bihać, Goražde, Sarajevo) refill from a national reserve; the RBiH reserve has no ceiling (319k unused) | P1 | yes | yes | post-1.0 |
| F6 | Event aggression modifiers and the truce-break aggression spike never reach the bots | P1 | yes | yes | RF (small) or post-1.0; canon text "now" |
| F7 | Supply reserves are off in the shipping campaign; `supply_below` treats "off" as 0% and fires events | P1 | event timing | yes | condition fix **now/RF-small**; reserves post-1.0 |
| F8 | Abdić's APWB is an event only; two named 5th Corps operations do nothing | P2 | yes if fixed | yes | real model post-1.0; retire or relabel the operations pre-freeze only if byte-identical |
| F9 | Legacy front substrate is dead, and the UI still shows its values (pressure glow, heavy-equipment %, doctrines, directives, faction profile) | P2 | no (UI) / yes (engine) | yes | UI truth **now**; engine post-1.0 |
| F10 | Battle records drop all but the first attacker: the player never sees a multi-brigade assault | P2 | no | yes | **now** |
| F11 | Unsourced dated combat bonuses (Trnovo ×1.6 RS attack t69-78; Brčko ×1.75 RS defence for 34 weeks) carry real captures | P2 | yes | yes (Trnovo) | source or retire post-1.0; flag to the Pyrrhic gate now |
| F12 | `war_supply_pressure` pinned at 100 for every faction all war | P3 | no | yes | **now** (report and UI cleanup) |
| F13 | Eleven Sarajevo brigades (about 20,000 men) never fight in 188 weeks | P3 | yes | yes | post-1.0 (follows F3) |
| F14 | Operation Storm is a fixed-date event while code comments say it is emergent; HV brigades and the ×0.65 Krajina multiplier key off it | P3 | no | yes | comment fix **now**; design note |
| F15 | Canon mechanics shadowed OFF or unreachable: siege morale drain, morale-collapse override, officer regeneration, negotiation offers, supply-aware bot sizing, JNA holdout bonus | P2 | yes | partly | post-1.0; canon must say they are off **now** |

**Top ten in one line each:**
1. F1: a legacy id mismatch marks 109 of 110 municipalities (Banja Luka included) "collapsed", which pins negotiation momentum at 1.0 and makes the Washington and ceasefire IVP gates decorative.
2. F2: failed ARBiH 1994 offensives cost about ten times the historical exchange (Grmeč-94: 1,979 killed vs 105), and Grmeč's real 250 km² first phase never happens.
3. F3: the VRS takes nothing after t95 (2 captures in 1994, 0 in 1995); a defender "last stand" rule cancels RS wins on Bosniak-majority ground at any morale.
4. F4: Bosniak flight abroad is hardcoded to 0%, so the humanitarian record shows Bosniaks as the least likely people to leave Bosnia (89k vs about 600k+).
5. F5: brigades in encircled pockets draw from a faction-wide reserve; Grmeč-94 takes 8,600 casualties and ends at the strength it started with; RBiH holds 319k unused reserves.
6. F6: about 36 authored event `aggression_modifier` effects and the canon truce-break spike have no reader (20 sit inert in the final save).
7. F7: supply reserves are disabled in the campaign the desktop ships, and `supply_below` still fires (`csq_supply_corridor_chronic_strain_RS` at t179 on a reserve that does not exist).
8. F8: the Abdić war does not exist on the map; APWB Pressure and Tigar-Sloboda hold 6-7 brigades for 6-8 weeks and make zero attacks.
9. F9: about 12 war steps run on an empty legacy front every turn, and the player still sees their outputs (pressure glow always 0, a "heavy pool %" with no combat weight).
10. F10: every battle record lists one attacker and `was_concentrated: false`, although 141 of 507 battle sites had multi-brigade assaults.

## 3. Findings in detail

### F1. Every municipality "collapses", negotiation momentum is pinned, and two historical gates are always open

**What is wrong.** Phase 22 sustainability should degrade only surrounded, unsupplied municipalities. In the run, 109 of 110 are `collapsed: true` at t188, including Banja Luka (`is_surrounded: true`, score 0); only Han Pijesak survives. Each collapse adds to `factions[*].negotiation.pressure` every turn: RBiH 22,285, RS 22,031, HRHB 20,821 at t188. `negotiation_momentum = clamp01(Σ pressure / 100)` therefore reads 1.0.

**Why.**
- Both production entry points feed the engine the legacy settlement edge list, which uses `S…` ids (`scenario_runner.ts:2975`, `desktop_sim.ts:535`).
- Control lives only under `op:` OSIDs after `migrate-political-control-osid` (`political_control_init.ts:33-67`).
- `computeSupplyReachability` and `isMunicipalitySurrounded` resolve every `S…` settlement to "unknown", so every pool municipality is "surrounded" and loses 5 points a turn (`sustainability.ts:248-345`).
- Pressure accrues in `negotiation_pressure.ts:107-149`; momentum is computed at `patron_pressure.ts:207-208`.

**Consequences.**
- These gates are always true:
  - Washington `WASH_IVP_THRESHOLD = 0.50` (`washington_agreement.ts:41,189-191`);
  - bilateral ceasefire `CEASEFIRE_IVP_THRESHOLD = 0.40` (`bilateral_ceasefire.ts:46,90-92`);
  - Storm's recorded `STORM_IVP_MOMENTUM = 0.55` (Storm itself fires by date, F14).
- Composite IVP carries a constant +0.1.
- Negotiation capital uses a fixed IVP penalty.
- The momentum term of patron commitment is constant.
- The BottomStatusStrip and SituationTab show the figure to the player.

**Severity:** P0. A load-bearing input is fake, and any later fix to the id split silently moves the Washington and ceasefire fire-weeks.

**Freeze: RF.** It passes (a) and (c). Fixing it after the freeze would move the political arc under an owner-OK rule; fixing it before means one measured lane.

**Fix lane:** a political-arc lane:
- run sustainability on the OSID graph (or retire it in favour of the OSID supply derivation);
- re-derive momentum from real pressure;
- measure where W3 and C5 now fire against their historical dates (Washington, 18 March 1994);
- 188w-validate.

### F2. Failed ARBiH offensives in 1994 cost about ten times the historical exchange, and Grmeč-94's success is missing

**What a commander sees.** 13 ARBiH operations start in 1994 and 11 fail, with almost nothing inflicted:

| Operation | Corps | Own killed | Inflicted killed |
|---|---|---:|---:|
| Grmeč 94 | 5th | 1,979 | 105 |
| Ćuprija (Brčko) | 2nd | 1,517 | 94 |
| Korak | 3rd | 1,126 | 84 |
| Oluja | 2nd | 948 | 82 |
| Gazija | 3rd | 780 | 58 |

At Ripač, six 5th Corps brigades lose 3,876 men at t135 and 4,053 at t136, against 128 and 106. Over the war, 37 contested battles exceed 10:1 (median 1.29, 90th percentile 10.9, maximum 127). RBiH takes 4 cells in all of 1994.

**History.** The direction is settled design: the attacker firepower-deficit penalty (`getAttackerFirepowerDeficitMult`, `combat_math.ts`), adopted because ARBiH infantry offensives against VRS armour were repeatedly thrown back in 1994. The magnitude is not settled. The historian check:
- Vozuća/Brana-94 (June-July 1994): about 400 ARBiH against 173 VRS killed, about 2.3:1.
- Bihać, November 1994 (the "massacre" phase, with the ARBiH retreating): about 600-700 against 193, about 3-3.6:1.
- Both figures are weakly sourced (secondary infoboxes); BB2 p.487 gives no numbers.
- A defensible bound for a failed attack on prepared VRS positions is 2-4:1, perhaps 5:1 for one bad day. The Ripač figure alone is about three times the ARBiH's whole loss in the Štit-94 battle.
- Grmeč-94 itself first succeeded. From 25 October 1994 the 5th Corps took the Grabež plateau: 100-150 km² by 27 October, about 250 km² at its peak, with Bosanska Krupa encircled. Štit-94 (4-20 November, 6,500 rising to 14,000 VRS and Krajina Serb troops) then took it all back and reached Privilica, about 2 km from central Bihać (BB2 pp.527, 541).
- The run has neither half.

**Severity:** P1.

**Freeze: RF.** It passes (b) and (c). An RBiH player meets these exchanges in every 1994 offensive.

**Fix lane:** combat realism (War-or-Game, historian, operations expert):
- bound the exchange in a failed assault to the sourced range;
- add a commander abort after a catastrophic first week (the second Ripač battle is the operation repeating a 30:1 failure);
- 188w-validate.

Keep the firepower-deficit direction. Grmeč's first phase and Štit-94 depend on F3 and are post-1.0.

### F3. The VRS stops taking ground after January 1994; a defender "last stand" rule is one reason (KNOWN symptom, new mechanism)

**Measured.**
- RS's last combat capture is t95 (late January 1994). RS combat captures by year: 81 (1992), 21 (1993), 2 (1994), 0 (1995). RS attack orders: 169, 100, 10, 1.
- Every VRS operation after t95 except Zvezda 94 (t93) ends `defender_power_too_high` with zero attacks: Munja t96, Zaslon t111, Bunar t118, Tvrđava t125, Usjek t144-162 and Izvor t171. They abort at the launch-floor check on the preparation force-ratio estimate (`sector_offensive.ts:1567-1573`).
- RS reaches the "collapsing" war-weariness band at t95, the same week, and the Chronicle shows the VRS "collapsing" for the last 93 weeks. The RS exhaustion front-load is a recorded fidelity ceiling; the presentation is not.

**New: a defender "last stand" rule cancels won attacks, asymmetrically.**
- `attack_morale_absorption.ts:104-127` cancels the capture after a won battle in three cases:
  - at 8 named enclave capitals, unless the result is `decisive_victory` (hardcoded list, `enclave_resilience.ts:659`);
  - for RBiH defenders on ground at least 50% Bosniak, on any `victory` or `costly_victory`, at any morale (cited to an internal run id, n536, not a source);
  - for RS and HRHB defenders, only above a morale floor.
- In the run, non-probe RS wins over a present RBiH brigade that did not change the map: 7 `costly_victory` and 1 `victory`. Four of them are the same Goražde cell, `op:gorazde:slatina_2`, won by RS at t65, t67, t71 and t72 without a capture.
- RBiH wins over RS that did not flip: 5 `victory`.
- No battle in the war targeted any of the 8 capitals, so the capital clause did not fire in this run.
- Attribution to the absorption rule is by elimination. The snap event `morale_absorption` is not copied into `weekly_report`, so a run with `AWWV_DEBUG_REASON_CODES` would confirm it.

**Missing as a result (historian-confirmed):**
- Goražde, 30 March to 23 April 1994 (UNSCR 913). The run has 2 RS battles in the Goražde area all year.
- Štit-94 and Pauk at Bihać, November-December 1994 (BB2 pp.527-535). The run has 2 RS battles in the Bihać area all year.
- Any VRS assault on Srebrenica (Krivaja-95, 6-11 July 1995; Krstić TJ IT-98-33-T) or Žepa (fell 25 July 1995; Tolimir TJ IT-05-88/2-T). Both fall by owner-ratified event write.
- The autumn 1995 VRS counterattacks: from 23-24 September the 5th Corps is driven back toward Bosanska Krupa and Otoka, and on 1-3 October OG-2 advances about 17 km to within about 1 km of Ključ (BB1 pp.390-391).

**Severity:** P1. It is the largest fidelity gap left: an RBiH or HRHB player faces an enemy that cannot attack for two years.

**Freeze: post-1.0 unless the owner pulls it in.** It passes the test, but it is the broadest calibration move in this report, and the WIP limit is full. Two cheap steps now:
- one reason-code run to measure how many RS wins the absorption rule cancels;
- the selection fix memory already names (`force_eval.ts:135-143` main-effort equipment-class gate; `bot_corps_ai.ts` / `bot_corps_operations.ts`), scoped for the post-1.0 lane.

Making the homeland rule symmetric or morale-gated is part of that lane, not a standalone change.

### F4. Bosniak civilians cannot flee abroad (hardcoded 0%)

**What any reader of the humanitarian record sees.** The run produces 305,821 fled abroad out of 1.40 million displaced: Bosniak 88,732, Serb 108,077, Croat 109,012. Bosniaks are the least likely of the three peoples to leave the country.

**History.**
- UNHCR (update of position on persons from BiH, August 2000): about 1.2 million fled abroad and 1.3 million were internally displaced.
- S/1995/1031 counts 900,000 still abroad at Dayton.
- No census splits refugees abroad by ethnicity. A destination build-up gives Bosniaks roughly 55-65%:
  - Western Europe about 700,000, mostly Bosniak (Germany about 320,000);
  - FR Yugoslavia about 250,000, mostly Serb;
  - Croatia 167,000 or more, Croat and Bosniak.

**Evidence.**
- `src/state/displacement_loss_constants.ts:49-50`: `FLEE_ABROAD_FRACTION_RBIH = 0.0` ("Bosniaks: no external state to flee to"), against 0.30 for Serbs and 0.25 for Croats (`:43-47`). The same values are duplicated in `displacement.ts:42-44` and `displacement_routing_data.ts:65`.
- Bosniak flight abroad happens only through two named municipality lists (`displacement_takeover.ts:204-205`). Everyone else is routed into RBiH-held municipalities: `refugees_received` = 650,150.
- Those arrivals feed militia pools (`pool_population.ts:33-42`), and pools in lost municipalities drain into the strategic reserve (`strategic_reserve.ts:110-139`). So this likely feeds F5; that link is not measured in isolation.

**Severity:** P1. It is player-visible in the Humanitarian Ledger, the Verdict and the war dispatches, and it is a §4 truthfulness problem.

**Freeze: RF, folded into RF-3.** It passes (a), (b) and (c). It lives in the same displacement files and needs the same sensitive-history panel as RF-3, so §4b rule 4 ("touches the same lines") applies. Otherwise it is post-1.0, with the ledger caveat stated in the Codex.

**Fix lane:** a sourced route model (Croatia and Western Europe for Bosniaks; zero only where no one could leave, such as sealed enclaves), then re-measure the ledger and RBiH manpower at 188w.

### F5. Encircled pockets refill from a national manpower pool, and the RBiH reserve has no ceiling

**What a commander sees.** The 5th Corps sat in a pocket cut off until the August 1995 link-up (BB1 pp.184-186) and could recruit only from the pocket. In the run, Grmeč-94 (t133-139) takes 1,979 killed and 6,655 wounded, and its AAR reports 10,800 men at the start and 10,800 at the end. At t188 the RBiH strategic reserve holds 319,359 unused men on top of 216,580 in brigades (RS 0; HRHB 35,818). That is above the ARBiH's sourced peak of 261,500 (BB1 p.216) and close to the whole Bosniak military-age male population of 1991.

**Evidence.**
- The supply graph does see the pocket. Re-running the derivation on t20, t40 and t60 saves puts `op:bihac:bihac_2` in a 19-node RBiH component with no path to Zenica. The pocket cells stay `strained` until a real link-up at t185 (Bihać, Ripač, Petrovac, Ključ, HRHB-held Šipovo, Donji Vakuf, Jajce, Travnik).
- The pocket can never be `critical`, because the Bihać supply source `S100838` (`scenario_runner.ts:294`) sits inside it.
- `isEligibleForExternalReinforcement` (`formation_constants.ts:203-208`) refuses outside reinforcement only on `critical` cells. Its callers are `strategic_reserve.ts:195` and `formation_spawn.ts:311, :419`.
- So pocket brigades draw every week from a reserve that moves men across VRS and Krajina Serb ground. Goražde and Sarajevo do too; they are also special-cased by name as always besieged (`enclave_resilience.ts:409`).
- The reserve only grows: per-municipality overflow above 5,000 and every orphan pool drain into it, and nothing decays it (`strategic_reserve.ts:94-139`). This part was recorded in memory as an open question; the pocket mechanism is new.

**Severity:** P1.

**Freeze: post-1.0.** It passes the test, but it is a broad manpower recalibration that would change every front measured by RF-1 to RF-3.

**Fix lane:** manpower realism (formation expert, historian):
- refuse reserve and cross-municipality draws for brigades outside their faction's heartland component, via a stored pocket flag from `computeFactionSupplyState`;
- retire the `ALWAYS_BESIEGED_ENCLAVES` name list;
- add a demographic ceiling and decay to the reserve;
- validate at 188w (risk: the Bihać, Sana and Goražde anchors).

### F6. Event aggression and truce-break aggression never reach the bots

**Evidence.**
- About 36 authored `aggression_modifier` event effects push onto `military.event_aggression_modifiers` (`apply_effects.ts:135-136, 497-513`); 20 are present at t188.
- `getEventAggressionBonus` (`bot_corps_directives.ts:94`) has no caller anywhere in `src/`, although its doc comment says "wired into the corps aggression computation".
- `getTruceBreakAggressionBonus` (`local_truces.ts:259`) is imported and never called. The Systems Manual promises "+0.25 aggression for 6 turns after a truce break".
- The only aggression the bots use comes from commander personality (`commander/emit.ts:1606-1607`).

**Severity:** P1. Events tell the player that an enemy has grown more aggressive, and nothing happens.

**Freeze:** RF if a slot is free (correctness, measured, small code, calibration-moving); otherwise post-1.0. In either case, canon and event copy should say now that the effect is not applied.

### F7. Supply reserves are off in the shipping campaign, and the event layer reads "off" as "empty"

**Evidence.**
- `apr1992_definitive_188w.json` (the desktop new-game scenario, `desktop_sim.ts:187`) never sets `supply_reserves_enabled`.
- So these never run: siege counters, bombardment attrition, UN airdrops, humanitarian convoys, the JNA inheritance bonus and the heavy-munitions multiplier (`war_phases.ts:1594-1617, 3449-3455`; `supply_reserves.ts:505, 571, 712`; `combat_math.ts:891-894`).
- No reserve keys exist in the final save.
- `event_types.ts:841-848` evaluates `supply_below` as `(reserve ?? 0) < threshold`, which is always true when the system is off. `csq_supply_corridor_chronic_strain_RS` (gated `supply_below RS < 30`) fired at t179 on a reserve that does not exist.
- Canon (Engine Invariants v0.9, Systems Manual) and the Supply panel present reserves as live.

**Severity:** P1.

**Freeze:**
- **Now / RF-small:** make `supply_below` and `supply_above` false when reserves are off. It moves event firing, so measure it.
- **Post-1.0:** enabling reserves.
- **Now:** canon must say they are off in the campaign.

### F8. The Abdić war is a paper operation; Velika Kladuša never changes hands

**History** (historian check):
- Abdić declared the Autonomous Province of Western Bosnia on 27 September 1993. It held about 600 km², the north-west third of the pocket, with six "Narodna odbrana" brigades.
- The 5th Corps overran Velika Kladuša on 21 August 1994 (Tigar-Sloboda 94).
- Abdić came back with OG Pauk and retook it on 17 December 1994.
- The 5th Corps overran the APWB for good on 7-8 August 1995 (BB2 pp.513-517, 531, 535).

**Run.**
- The declaration event fires at t77. Velika Kladuša is RBiH from t0 to t188.
- "APWB Pressure" (t113-120, 7 brigades, 0/5 objectives) and "Tigar-Sloboda" (t117-123, 6 brigades, 0/4) make zero attacks and end as failures.
- Both target RBiH-held cells through `targets_friendly_overrides` (`operation_opportunity_catalog_5th_corps.ts:736-757, 861-1036`); nothing makes those cells an enemy.
- The AAR classifier already called them paper operations in May (`operation_aar.ts:755-766`).

**Severity:** P2 for realism, but P1 for an RBiH player's trust.

**Freeze:**
- **Post-1.0:** the real model. It needs a sourced controller change at the declaration, since ownership transfer is not a calibration lever.
- **Pre-freeze:** retire or relabel the two operations, only if checkpoints stay byte-identical (they make no attacks, but they reserve brigades).

### F9. The legacy front substrate is dead, and the UI still shows its values

**Evidence.** The same `S…` id mismatch as F1 empties `computeFrontEdges` (`front_edges.ts:36-89`) every turn. About 12 war steps run over nothing (`war_phases.ts:1214-1253, 4155-4277, 4323-4335, 4392-4398, 4449-4537`): segments, posture, commitment, pressure, exhaustion, loss-of-control trends and negotiation offers. At t188:
- `front_segments`, `front_pressure` and every posture assignment are empty.
- `factions[*].profile.exhaustion` is 0.2258 for all three factions.
- `profile.authority`, `legitimacy` and `logistics` are 50 for every faction.

Related, all measured at 0 or constant:
- **Tactical doctrines (System 9):** 0 of 306 formations eligible. Eligibility needs an `edge` assignment, and the run has 220 `sector` and 86 none (`doctrine.ts:29-31`).
- **Political directive producer:** pinned from about week 6. Its exhaustion threshold is 500 on a 0-10000 scale, and its IVP rule reads a field that does not exist (`political_directive_producer.ts:84, 156-163`). At t188: RBiH HONOR_TRUCE, RS and HRHB PREPARE_RESERVE.
- **`political.enclaves`:** empty, so the legacy Sarajevo tunnel flag and convoy targets never activate. The B7 lifeline is a separate live path.

**Player-visible:**
- The front-line pressure glow and tooltip intensity are always 0 (`GameStateAdapter.ts:2642-2655`).
- The Corridor Heartbeat overlay always uses its proxy.
- Army HQ shows an "abstract heavy pool %" from `equipment_state`, which has no combat weight (`equipmentSummary.ts:19-25`).

**Severity:** P2.

**Freeze:** **now** for the UI (hide or relabel the dead values; non-calibration). Post-1.0 for reviving or retiring the engine steps; retiring them is a cleanup lane with byte-identity checks.

### F10. Battle records show every attack as one brigade

**Evidence.**
- `turn_summaries[].battles` holds 524 battles, all with one attacker and `was_concentrated: false`.
- Brigade histories show 141 of 507 battle sites with two or more attacking brigades in the same week (407 of 763 attacker engagements concentrated), for example six HV/HVO brigades at Kupres at t136.
- Cause: `compile_turn_summary.ts:143` builds `all_attacker_ids` from `b.attacker_brigade` (the first attacker), and `:158` sets `was_concentrated = group.length > 1`. But the resolver writes one raw battle per target, with the full list in `attacker_brigades` (`attack_resolution_osid.ts:1208-1211`).
- Consumers: `AARPanel.tsx:226`, `Tooltip.tsx:104`, `buildBattleMarkersGeoJSON.ts:146`, `player_visible_state.cjs:800`.

**Severity:** P2. It is player-visible, and it is an audit trap: any review reading `turn_summaries` concludes the AI never masses force.

**Freeze: now** (report-only, not calibration-moving). Add a two-brigade test.

### F11. Unsourced dated combat bonuses carry real captures

**Evidence.**
- `data/scenarios/timelines/apr1992.json:401-409` gives RS attacks on `op:trnovo:*` ×1.6 in turns 69-78 (used at `combat_math.ts:1547-1600`). The row has no source. In the run, RS takes `op:trnovo:trnovo` at t70 and `delijas` and `tosici` at t71, all inside the window.
- `apr1992.json:410-417` gives RS defenders at Brčko ×1.75 for 34 weeks. BB cites Sadejstvo 93 for one week in July 1993; nothing sources the other 30-odd weeks.
- The outcomes are roughly historical (Trnovo fell in the summer 1993 Lukavac operation), but the captures are bought by a calendar knob aimed at one target.

**Severity:** P2.

**Freeze:**
- Post-1.0: source the rows (historian) or retire them.
- **Now:** list both as answers to the Pyrrhic gate's standing question "which matched cells depend on a known-broken mechanic?"

Same class, sourced, for the gate's list:
- The COHA single-turn exception lets only Operation Vlašić Ridge fight at t155 (Domet-1, BB-cited; `coha_operation_exception.ts`). Measured: the only battle in t143-160 is at Paklarevo at t155.
- It depends on a Paklarevo window of exactly t139, which the code calls "calibration assumption, not a sourced date" (`operation_opportunity_catalog_central_bosnia.ts:571-592`).

### F12. `war_supply_pressure` is pinned at 100

**Evidence.** The only value it takes in all 188 weekly reports is 100, for every faction. It adds 3 per front edge, caps at 100 and never decreases (`supply_pressure.ts:117-128`). It survives as a legacy UI fallback (`GameStateAdapter.ts:2085`, `SupplyPanel.tsx:53-85`, `buildSupplyGeoJSON.ts:87-95`), in `end_report.md` ("Supply pressure 100 → 100") and as a flat +10 a turn exhaustion term for everyone.

**Severity:** P3. **Freeze: now:** drop it from reports and UI fallbacks, or redefine it as `100 - supply_condition`.

### F13. Eleven Sarajevo brigades never fight

**Evidence.**
- `run_summary.anomaly_detection` (`brigade_never_fights`) lists 16 front-sector brigades with zero battles in 188 turns. Eleven are 1st Corps brigades inside the city: 101st, 105th, 10th, 115th, 124th, 141st, 143rd, 152nd, 1st and 2nd Mountain, and Kralj Tvrtko.
- RS attacks in the Sarajevo area: 17 in 1992, 11 in 1993, none after.
- Historically the city lines saw continual infantry fighting, and the whole 1st Corps took part in the June 1995 attempt to lift the siege.

**Severity:** P3. Shelling and sniping are outside the combat model by design.

**Freeze:** post-1.0; it follows F3 and a June 1995 Sarajevo catalog entry.

### F14. Storm fires by date; the code says it is emergent

**Evidence.**
- `operation_storm_1995` has `turn_min = turn_max = 174` and no condition (`war_1995.json:914-966`).
- `operation_storm.ts:130-155` sets `operation_storm_triggered` from the event alone. The Washington, RS-share, exhaustion and IVP preconditions are only recorded; in the run they were met at t98 and did not matter.
- The comment at `combat_math.ts:1037-1055` still says the preconditions gate it.
- From t174:
  - two VRS corps ids take ×0.65 defender power (`strategic_depth.ts:79-112`);
  - the firepower-deficit penalty is lifted for every attacker;
  - HV brigades spawn unconditionally (`jna_phantom_brigades.ts:456-536`; the ICTY pointer there is marked [UNVERIFIED]).
- The date is history (4-7 August 1995), so this is modelled history with a misleading comment. A one-turn window with `MAX_EVENTS_PER_TURN = 4` could in principle crowd it out; it fired at t174 here.

**Severity:** P3. **Freeze:** fix the comment **now**; source the HV pointer post-1.0.

### F15. Canon mechanics that are shadowed off or unreachable

| Mechanic | Canon | State |
|---|---|---|
| Siege-defender morale drain | Engine Invariants §6.10 | Behind `SIEGE_MORALE_DRAIN_ENABLED` since May, and it needs siege counters that do not exist without supply reserves (F7) |
| Morale-collapse override | EI §6.2.4 / SM §6.4 | `MORALE_OVERRIDE_ENABLED` off since May |
| Officer pool regeneration, Zagreb cadre, Roso restructuring | Rulebook §217-218 | Data in `apr1992.json:466, 480-481`; no reader |
| Negotiation offers | Phase 11B | Computed every turn; `applyNegotiation` is never passed by the scenario runner or desktop |
| Supply-aware bot sizing and targeting | supply reserves Phase D | `computeSupplyAwareOpSize` and two siblings have no callers |
| JNA holdout bonus | early-war control | `jna_presence` never seeded |

**Severity:** P2 together.

**Freeze:** post-1.0 for revival. **Now:** a docs pass so canon says which of these are off, because players and Codex readers are told they are live.

### Initial-state note for the owner

JNA phantom units capture 7 cells at t0 (Stolac ×3, Čapljina, Mostar Hodbina and two Kupres cells), with control events suppressed. The calibration scenario also carries 28 `osid_control_overrides`, reported by the harness as "initial_state_correction". Both are initial-state data, not mid-war railroads. Their existence sits awkwardly with CLAUDE.md's "Never override initial OSID control" wording, which reads as a rule for agents. No change proposed.

## 4. Errata found on the way (docs only)

- `docs/40_reports/proposals/20260523_RESEARCH_ARBIH_1994_OPS.md` dates Abdić's retaking of Velika Kladuša as "18-22 Nov 1994". BB2 p.535 gives **17 December 1994**.
- `combat_math.ts:1037-1055` (Storm gating comment) and the `getEventAggressionBonus` doc comment ("wired into the corps aggression computation") describe behaviour the code does not have.
- `battle_of_the_barracks_tuzla` (`war_1992.json`) says "over 50 JNA soldiers are killed" in its narrative, while its own `source_note` says the row adds no casualty figures.

## 5. Checked and not raised

| Observation | Why it is not a finding |
|---|---|
| Srebrenica (13 cells, t171) and Žepa (t173) change hands by event write; 8 of the 13 writes are RS→RS no-ops | Owner-ratified forced fall (memory `presidential_enclave_decision`, Q2). The no-op writes are cosmetic. |
| 16 RS brigades destroyed t174-188, 11 of them at t174 | Settled modelled history. |
| Simin Han (Tuzla) control written by event at t6 | Dated event conditioned on RBiH holding Tuzla, ICTY-tier source. |
| 33 paramilitary takeovers | All in t1-t20 (April-August 1992). |
| HVO-ARBiH, Mostar and Lašva quiet in 1993 | Register DA2 / RF-5. |
| 3rd Corps Kopljem, Ihlas, Ponos and Vidik with zero attacks | Register 7C5. |
| VRS Usjek held 18 turns before cancelling | Spans the cessation of hostilities; the cancellation is F3. |
| A 12-week lull, w142-153 | The Carter cessation of hostilities; correct. |
| RS strength 89k at start, 141k at t156, 79k at the end | Inside the OOB Master band for start and mid-war; the end figure is the settled 1995 collapse. |
| RS exhaustion highest from 1992 | Recorded fidelity ceiling (memory `exhaustion_desaturation_and_friction_trap`). |
| Srebrenica's `isolation_turns` is 0 in the final save | Reset at the fall; its core cells were `critical` from t3 to t171. |
| Combat tempo: 164 / 129 / 92 / 139 battles a year, 17 battleless weeks outside the COHA | REAL_WAR_MASTER #39/#40, open; mostly a consequence of F3 and the missing HVO-ARBiH war. |

## 6. What a commander would recognise

- **Civilian deaths:** Bosniak 33,903, Serb 3,308, Croat 2,706, close to the RDC shape.
- **Military deaths:** 53,494 (RBiH 26,886, RS 19,132, HRHB 7,476), inside the working band; killed:wounded about 1:3.7.
- **1992:**
  - RS takes 81 cells by combat and 33 by paramilitary takeover in the first 20 weeks;
  - RS→RBiH battles are won 65% of the time, with the attacker losing half what the defender loses;
  - Corridor 92 runs 13 weeks;
  - Srebrenica, Cerska and Goražde survive the year.
- **1995:** the cessation-of-hostilities lull, Srebrenica at t171, Storm at t174, then Mistral, Uragan/Farz and Sana in the right order, and the western VRS collapse.
- **Force concentration exists:** up to six brigades on one objective (F10 hides it).

## 7. Method notes and traps

- **`turn_summaries[].battles` under-reports attackers** (F10). Use `formations[*].brigade_history.engagements`.
- **`political.last_supply_state_by_osid` and `turn_summaries[].supply_transitions` are flattened, with no faction key** (`war_phases.ts:1440-1448`). RS-held villages next to the Bihać pocket show up as "Bihać adequate". This audit's first reading made that mistake, and a diagnosis run corrected it. Join on the controller before reading supply by place.
- **`isolation_turns` resets on a link-up or a fall.** Read it as a time series, not from the final save.
- **Probes are absent from `operation_aars.json`.** They are in `weekly_report.jsonl` `operation_diagnostics`: 647 probe operation-weeks against 506 sector-attack weeks.
- **`morale_absorption` snap events are not copied into `weekly_report`.** Measure F3 with a reason-code run or a battle-to-control-event join.
- **Every sim run rewrites the tracked `data/derived/latest_run_final_save.json`.** It was reverted before committing this report.
- **The analysis scripts are not committed.** Every figure can be regenerated from the run directory with the field paths named above.
