# AI Strategy Specification (Phase A1)

## Purpose

Define deterministic smart-bot strategy profiles, benchmark targets, and difficulty behavior for scenario harness runs.

This spec covers:
- faction profiles (`RBiH`, `RS`, `HRHB`),
- deterministic tactical decision rules,
- difficulty presets (`easy`, `medium`, `hard`),
- benchmark targets used for evaluation and tuning.

## Determinism contract

- No `Math.random()` in simulation or bot logic.
- Bot decisions must use seeded RNG input only.
- Candidate sets (edges, formations) must be sorted before selection.
- Same scenario + seed + difficulty => identical bot decisions and artifacts.

## Faction strategy profiles

- `RBiH`
  - Early-war posture: defensive survival with selective probing.
  - Late-war posture: increased local offensives where pressure improves.
  - Priority SIDs: `S166499`, `S155551`, `S162973`, `S100838`, `S117994`, `S224065` (core + enclaves Srebrenica, Goražde, Bihać); `S163520` (Sapna — connected stronghold, not enclave); `S123749`, `S208019`, `S151360` (Kalesija/Teočak–Čelić, Doboj, Tešanj — RBiH stronghold regions).
  - Benchmarks:
    - Turn 26: hold core centers (`expected_control_share=0.20`, `tolerance=0.10`)
    - Turn 52: preserve survival corridors (`expected_control_share=0.25`, `tolerance=0.12`)

- `RS`
  - Early-war posture: aggressive expansion.
  - Late-war posture: consolidation-first.
  - Priority SIDs: `S200026`, `S216984`, `S200891`, `S230545`, `S227897`, `S205176`, `S202258`, `S203009`, `S220469`, `S218375` (Drina/Prijedor axis); `S120154`, `S162094` (Gračanica/Petrovo, Zavidovići/Vozuća — VRS strongholds in RBiH muns); Sarajevo ring via existing SIDs.
  - Benchmarks:
    - Turn 26: early territorial expansion (`expected_control_share=0.45`, `tolerance=0.15`)
    - Turn 52: consolidate gains (`expected_control_share=0.50`, `tolerance=0.15`)

- `HRHB`
  - Early-war posture: opportunistic offensives with retention of key lines.
  - Late-war posture: balanced hold/defend posture.
  - Priority SIDs: `S166090`, `S120880`, `S130486`.
  - Benchmarks:
    - Turn 26: secure Herzegovina core (`expected_control_share=0.15`, `tolerance=0.08`)
    - Turn 52: hold central Bosnia nodes (`expected_control_share=0.18`, `tolerance=0.10`)

## Difficulty presets

- `easy`
  - lower push share,
  - lower reassignment bias,
  - lower tactical churn.
- `medium`
  - baseline behavior for historical plausibility.
- `hard`
  - higher push share and reassignment bias,
  - faster adaptation to front pressure.

## Decision model (deterministic)

1. Build relevant edges (`side_a==faction || side_b==faction`) and sort by `edge_id`.
2. Score each edge by:
   - disadvantage under current front pressure,
   - objective SID bonus,
   - pressure magnitude.
3. Assign posture:
   - top-ranked edge subset => `attack` or `assault`,
   - mid-ranked with pressure/objective signal => `defend`,
   - remainder => `hold`.
4. Assign formations:
   - sorted active formations only,
   - deterministic target selection over ranked edge list,
   - movement decision uses seeded RNG only.

## Time-adaptive doctrine

Bots support optional `scenario_start_week` (weeks since Jan 1992) from scenario input.

- `global_week = scenario_start_week + state.meta.turn`
- Aggression tapers deterministically from early-war to late-war profile across weeks.
- Broad aggression is additionally moderated by:
  - **front length** (more edges -> lower broad push share),
  - **manpower pressure** (low active personnel + pool -> lower broad push share).
- Planned operations remain viable via `planned_ops_min_aggression` and objective-SID prioritization.

This allows behavior such as:
- **RS 1992:** broad aggressive expansion.
- **RS 1995:** lower broad aggression due to overextension/manpower pressure, but still able to run planned objective operations.

## Consolidation and rear cleanup

AI prioritizes **municipality consolidation**: cleaning hostile settlements inside owned municipalities and pushing toward isolated hostile clusters. Behavior is deterministic and produces tracked military action (casualties) rather than administrative flips.

- **Early-war period:** Edge scoring includes a consolidation bonus when the scenario runner supplies graph context (`consolidationContext`). Strategy profiles have `consolidation_priority_weight` (RS 0.8, RBiH 0.5, HRHB 0.4). Control-flip candidate order prefers municipalities with more attacker-controlled adjacent muns (consolidation pressure first).
- **War phase (8-posture system, 2026-03-04):** Brigades on a **soft front** (adjacent enemy settlements with no or weak garrison) adopt **hold** posture and issue attack orders; cleanup is resolved via battle resolution with casualty ledger updates. **Real fronts** = brigade-vs-brigade contact; soft fronts = rear pockets and undefended settlements. The legacy 'consolidation' and 'probe' postures have been removed; saves with those values normalize to 'hold' on load.
- **Exception data:** Connected strongholds (e.g. Sapna S163520, Teočak S123749) and isolated holdouts (e.g. Petrovo S120154, Vozuća S162094) receive scoring penalties so they persist as in history. Fast rear-cleanup municipalities (Prijedor, Banja Luka) receive a priority bonus; baseline calibration targets completion within ~4 turns.
- **Garrison/casualties:** Cleanup engagements remain attack-order driven; undefended or weakly defended settlements still incur defender casualties (militia/rear security) so all flips produce tracked casualties.

Integration: `src/sim/consolidation_scoring.ts`, `src/sim/bot/simple_general_bot.ts`, `src/sim/combat/bot_brigade_ai_osid.ts`, `src/sim/early_war/control_flip.ts`, `src/state/game_state.ts` (BrigadePosture: 8-posture system — hold, defend, defend_at_all_costs, elastic_defense, counterattack, dig_in, attack, assault).

## Attack target de-duplication

At most **one brigade per faction per turn** may be assigned to attack a given settlement. When assigning attack orders, already-chosen targets are treated as unavailable. The only exception: a brigade may be assigned to a settlement that is already chosen **if** (1) that brigade is part of an active operational group (OG) conducting an operation toward that settlement, **and** (2) the target has **heavy resistance** (defender brigade present at the settlement or garrison at or above a defined threshold, e.g. 250). Until operation targeting exists (e.g. corps/OG orders with target_sid), the OG+operation check is a stub (no duplicate targets). Run summaries report `unique_attack_targets` (distinct SIDs targeted per turn) alongside `orders_processed` and `flips_applied` for diagnostics.

## War-phase bot architecture (three-sided)

War-phase bot decisions are organized in three layers, run in pipeline order:

1. **Army standing orders** — historical army-level directives set `state.army_stance` per faction (e.g. RS Territorial Seizure 0–12, RBiH Survival Defense 0–12, HRHB Lasva Offensive 12–26 when at war with RBiH). Data: `FACTION_STANDING_ORDERS` in `bot_strategy.ts`.
2. **Corps AI** — stance selection, named operations, OG activation, corridor breach. Sets corps stance and active operations before brigade AI runs.
3. **Brigade AI** — posture, target scoring, attack orders, casualty-aversion. Reads corps stance via `getParentCorpsStance()`; offensive corps lowers attack threshold, defensive/reorganize forces defend.

Shared helpers used by corps AI, brigade AI, and AoR rebalancing:

- `src/sim/combat/war_adjacency.ts` — `buildAdjacencyFromEdges(edges)`, `getFactionBrigades(state, faction)` (deterministic, sorted iteration).

Pipeline steps: `generate-bot-corps-orders` (before) → `generate-bot-brigade-orders`. See [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §6.

## Integration points

- `src/sim/bot/bot_strategy.ts`
- `src/sim/bot/bot_interface.ts`
- `src/sim/bot/simple_general_bot.ts`
- `src/sim/bot/bot_manager.ts`
- `src/sim/consolidation_scoring.ts`
- `src/sim/combat/war_adjacency.ts` (shared adjacency and faction brigades)
- `src/sim/combat/bot_corps_ai.ts` (corps stance, operations, OGs, corridor breach, standing orders)
- `src/sim/combat/bot_brigade_ai_osid.ts` (posture, target scoring, attack orders)
- `src/sim/combat/bot_strategy.ts` (war-phase faction profiles, doctrine phases, standing orders)
- `src/sim/combat/combat_estimate.ts` (read-only attack cost for casualty-aversion)
- `src/scenario/scenario_types.ts` (`bot_difficulty`)
- `src/scenario/scenario_loader.ts`
- `src/scenario/scenario_runner.ts`
- `src/sim/combat/operation_preparation.ts` (preparation state machine, probe mechanics, commander personality formulas)

## Operation Preparation System (2026-03-12)

Operations pass through a preparation phase between launch and execution. The preparation system is a state machine within `CorpsOperation`, driven by the assigned commander's personality.

**Sub-phases:** `intel_gathering` → `force_staging` → `supply_check` → `assessment` → `ready`. Each advances once per turn via `tickPreparation()` in `advance-sector-offensives`.

**Commander personality formulas:**
- `getRequiredConfidence(comp, agg)` — cautious (high comp, low agg) commanders demand higher intel.
- `getRequiredForceRatio(comp, agg)` — aggressive commanders accept lower force ratios.
- `getPreparationMaxTurns(comp, agg)` — aggressive commanders prepare faster.
- `getGoThreshold(comp, agg)` — composite readiness threshold for "launch" assessment.

**Probe mechanic:** During preparation, commanders may order reconnaissance-in-force probes. `selectProbeBrigades()` chooses candidates (equipment priority, ≥400 personnel, not disrupted). Resolution via `resolveActiveProbe()`: `PROBE_FORCE_COMMITMENT_FACTOR=0.4`, `PROBE_EXHAUSTION_COST=5`. Counter-probe: defenders gain `COUNTER_PROBE_CONFIDENCE_GAIN=0.15` intel about the probing force. Unresolved probes block sub-phase advancement; `autoResolveProbe()` resolves stale probes (≥2 turns).

**Safety valves:** Anti-paralysis forced launch at `preparation_max_turns`. `MAX_POSTPONEMENTS=2` limits commander postponements.

**State fields (CorpsOperation):** `preparation_sub_phase`, `preparation_turns_elapsed`, `preparation_max_turns`, `intel_confidence_at_assessment`, `supply_readiness_at_assessment`, `force_ratio_estimate`, `commander_assessment`, `postponement_count`, `active_probe: OperationActiveProbe`.

**Types (game_state.ts):** `PreparationSubPhase`, `CommanderAssessment`, `OperationActiveProbe`.

**Player UI:** `CommanderSelectionModal.tsx` (officer roster, regional fit, prep time estimates, availability), `OperationBriefingModal.tsx` (readiness gauges, force ratio, assessment badge, Launch/Probe/Postpone/Abort). Store: `gameStore.ts` (commanderSelectionContext, operationBriefingContext). Adapter: `GameStateAdapter.ts` maps preparation fields to `OperationView`.

**Bot integration:** Bot-launched operations automatically receive a commander via `selectOperationCommander()`. Preparation proceeds without player input; bot operations auto-launch when ready.

**Tests:** `tests/probe_preparation.test.ts` — 30 tests covering personality formulas, intel confidence, probe selection, state machine lifecycle, probe resolution, constants validation.

**Full spec:** Systems Manual §7.6.

