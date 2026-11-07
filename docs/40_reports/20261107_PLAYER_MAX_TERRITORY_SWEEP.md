# Player maximum-territory sweep and an RS grade-A route — 2026-11-07

**Owner request:** find a legitimate way for RS to reach grade A, then run multiple campaigns per faction to find the maximum territory each can reach. Only territory counts. Decisions may be changed; no cheating.

**Ground rules applied.** Only actions a desktop player can take: event answers, historical-operation authorization, paramilitary decisions, peace-plan answers, REQUEST-OP (through the same `queryDirectiveObjection` pre-check as the IPC handler, and marked `forced_over_objection` whenever the commander's answer is not `launch`, as the UI does), municipality support, reserve deployment, proposal reviews, autonomy level and decision mode. No edits to simulation, scoring, map or data. No option was chosen that is more atrocious than the historical answer (for example, RBiH minority purges were never selected).

**Evidence only.** No calibration, baseline, pin or canon change follows from this report.

## Harness

- `tools/ai_play/territory_sweep.ts`: one live-equivalent player campaign (desktop `advanceTurn`, production `startNewCampaign`, pause-before-combat answers), driven by a JSON strategy file.
- `tools/ai_play/territory_sweep_strategies/*.json`: every strategy reported below.
- Run: `node --import tsx tools/ai_play/territory_sweep.ts --strategy <file> --out <dir>`.
- **Validation:** the baseline strategy (`bot_equivalent` answers, production autonomy) matches the headless 188-week run (`apr1992_definitive_188w__6deb5845c150c196__w188_n0`, 712/711/712/710) cell for cell: 0 differences for each player faction.
- **Determinism:** the best RBiH and RS runs were repeated; the final saves are byte-identical.
- **Territory metric:** area-weighted share at war end (`capital.territory_controlled_pct`), the same value the grade reads, plus OSID count out of 712.

## Pre-Dayton versus Dayton (owner correction)

RS's 49% is the Dayton map. Before Dayton, RS held less:
- About **46%** in published accounts (Bosniaks about 28%, Croats about 25%).
- The repo's painted October 1995 war map gives **RS 47.40%** (RBiH 31.86%, HRHB 20.74%), area-weighted the same way the game is.
- The calibrated run ends at RS 47.37%.

`data/reference/historical_baseline.json` (`territory_final`, sourced to "Dayton Annex 2") and the RS anchor A ("≥49% … contiguous territory") therefore set a post-Dayton bar against a pre-Dayton map. Dayton is still pending at week 188 and does not redraw control. A historically faithful RS earns B on territory, before the genocide cap. Whether to re-anchor is an owner decision. Options:
1. Re-anchor RS to the pre-Dayton line.
2. Keep 49% as an "outperform history" bar.
3. Make Dayton transfer territory before grading.

## Results

### Maximum territory per faction

| Faction | Best final (area / OSIDs) | Strategy | Baseline | Peak during war |
|---|---|---|---|---|
| RS | **66.15% / 398** | Accept the Contact Group plan (week 118); war ends week 119 | 47.37% / 310 | 66.15% (week 96) |
| RS, fought to week 188 | 48.49% / 312 | `martial` events + forced REQUEST-OP | 47.37% / 310 | 65.99% (week 83) |
| RBiH | **38.09% / 352** | Aggressive political answers + `martial` events + forced REQUEST-OP | 31.89% / 293 | final = peak |
| HRHB | **20.74% / 109** | Baseline; no variant did better | 20.74% / 109 | final = peak |

### RS grade A: three legitimate routes, all through peace

| Run | End | RS area | Grade | How |
|---|---|---|---|---|
| `rs_peace_cg_consistent` | wk 119, Contact Group | 66.15% | **A** | Accepts on the event card and in the peace dialog. Cohesion 26.7 gives an earned B; casualties 46,080 (0.49× historical) give the +1 step to A. |
| `rs_peace_cg` | wk 119, Contact Group | 66.15% | **A** | Earned A (cohesion 56.7). Uses the inconsistent answer below. |
| `rs_peace_vopp` | wk 41, Vance–Owen | 63.42% | **A** | Earned A (cohesion 32.8); casualties 17,306. |

- Every RS campaign fought to week 188 ends at D (genocide cap) or B. The rupture is raised whenever RS holds Srebrenica town at week ≥160 after the enclave formed (`rupture_consequences.ts`).
- Srebrenica town is `objective_unreachable` for every RS corps in 1992, so a player cannot prevent the enclave from forming.
- `l1_accept_RS` (autonomy 1, accept every proposal) is the only full-length RS run without the genocide flag: Srebrenica never falls. It grades B at 46.23%.

### What moves territory and what does not

| Lever | Effect |
|---|---|
| Accepting a peace plan the other two sides historically accept | **Largest lever for RS.** Locks in the 1993–94 line. |
| Forced REQUEST-OP (commander says "delay") | **+3.9 to +6.2 points for RBiH**; about +1 point for RS; −0.3 to −1.8 points for HRHB. |
| `martial` event answers (best own morale, cohesion, supply, recruitment) | Small: about +0.2 to +1.4 points combined with REQUEST-OP. |
| Aggressive political overrides | About ±0.1 points on their own. |
| Paramilitary allow, emergent mode, HRHB alliance choices | No gain. Emergent RBiH draws an `authorized_cleansing` condemnation (C); HRHB united front loses ground (19.84%, C). |
| Autonomy 1 + accept every proposal | Worse for all three (HRHB 12.87%). |
| REQUEST-OP on `launch` only | Never fires: corps slots are always full at production autonomy. |
| Local Support | **No effect at all** (defect below). |
| Reserve (elite) deployment | No requests arose to approve. |

## Caveats (independent scenario-tester review)

1. **Contact Group answers are not synchronized.** RS can reject on `rs_contact_group_response_1994` (no cost) and accept in the peace dialog. Vance–Owen has an event/plan sync; Contact Group does not. The consistent run is reported as the headline, and it still grades A.
2. **Peace freezes the current lines; it does not apply the plan's split.** `resolvePeacePlan` (`peace_plans.ts:497-512`) ends the game on today's control, so RS keeps 66% under a plan whose `proposed_split` gives it 49%. The RS-A-via-peace route is reachable, but it rests on this design gap.
3. **RBiH forced REQUEST-OP rests on an empty objection.** 29 of 30 directives were "delay" at force ratio 0.00, i.e. the predictor returned nothing (`operation_prediction.ts:159-163`) and the recommendation came from aggressiveness alone.
   - All directives became `CorpsOperation`s, as the canon requires.
   - The gains are mostly after week 172: Srebrenica never falls (+13 cells), Zvornik including the town (+7), Brčko including the town (+6), Foča (+5), Goražde (+5), Trnovo (+5).
   - Zvornik and Brčko (the Posavina corridor) need an operations-expert / war-or-game read before this is treated as plausible.
4. Earlier RBiH 38.94% and RS 47.83% figures came from a harness version without the forced flag. They are excluded.

## Defect found: Local Support is a no-op

- `municipality_support_staging.cjs` stamps `staged_turn = meta.turn`.
- `turn_pipeline.ts:139-143` increments `meta.turn` before any phase runs.
- `getActiveMunicipalitySupport` (`municipality_support.ts:32`) requires an exact match, so the order is never active (consumers: `ongoing_mobilization.ts:322`, `formation_spawn.ts:462`).
- An A/B single-turn test and full 188-week runs confirm no effect.
- The unit tests set both values to the same turn and skip the pipeline (`tests/phase_e_municipality_support.test.ts`).
- Not fixed here: a fix changes gameplay for any player who uses Local Support.

## Addendum (later on 2026-11-07): superseded by the settlement and re-anchor changes

Three owner-directed changes landed after this sweep:
- RS anchors re-anchored to the pre-Dayton line (A ≥46%, B ≥42%, C ≥37%, D ≥27%).
- Local Support fixed.
- Accepted peace plans and Dayton now settle on the plan's map and terms ([peace-plan research](20261107_PEACE_PLANS_RESEARCH.md); canon table in `VICTORY_AND_PYRRHIC_SCORING.md` §3.2).

The peace-route results above no longer hold. Re-run on the new source:

| Run | War ends | Wartime RS | Settled RS | RS grade | Why |
|---|---|---|---|---|---|
| `rs_peace_cg_consistent` | wk 118, Contact Group | 66.15% | **51.24%** | **B** | earned B (cohesion 26.7 < 30), +1 for low casualties, capped at B by the Contact Group terms (unnamed entity) |
| `rs_peace_vopp` | wk 40, Vance–Owen | 63.42% | **44.83%** | **C** | earned B, +1 for low casualties, capped at C: no Serb entity under Vance–Owen |

- The settled Contact Group share (51.2%) is above the map's 48.9% because the Sarajevo neutral zone stays with its wartime holder, and RS held most of it.
- The fought-to-188 maximum for RS (48.49%) and the RBiH and HRHB maxima are unchanged: no settlement is reached in those runs.
- Freezing a peak front line through peace is no longer possible. RS can now reach A only through a signed Dayton (no cap) with cohesion of 30 or more and no Srebrenica condemnation, and every RS campaign fought to week 188 here carries that condemnation.
