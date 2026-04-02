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

**Safety valves:** Anti-paralysis forced launch at `preparation_max_turns`. `MAX_POSTPONEMENTS=2` limits commander postponements. `preparation_max_turns` is initialised as `max(getPreparationMaxTurns(aggressiveness), op.planning_duration ?? 0)` — a pre-planned op's declared `planning_duration` is a *minimum* floor that the anti-paralysis clock cannot undercut. Without this floor, aggressiveness-5 commanders (3-turn anti-paralysis) silently discarded any `planning_duration > 3` and launched early. (n1293)

**State fields (CorpsOperation):** `preparation_sub_phase`, `preparation_turns_elapsed`, `preparation_max_turns`, `intel_confidence_at_assessment`, `supply_readiness_at_assessment`, `force_ratio_estimate`, `commander_assessment`, `postponement_count`, `active_probe: OperationActiveProbe`.

**Types (game_state.ts):** `PreparationSubPhase`, `CommanderAssessment`, `OperationActiveProbe`.

**Player UI:** `CommanderSelectionModal.tsx` (officer roster, regional fit, prep time estimates, availability), `OperationBriefingModal.tsx` (readiness gauges, force ratio, assessment badge, Launch/Probe/Postpone/Abort). Store: `gameStore.ts` (commanderSelectionContext, operationBriefingContext). Adapter: `GameStateAdapter.ts` maps preparation fields to `OperationView`.

**Bot integration:** Bot-launched operations automatically receive a commander via `selectOperationCommander()`. Preparation proceeds without player input; bot operations auto-launch when ready.

**Tests:** `tests/probe_preparation.test.ts` — 30 tests covering personality formulas, intel confidence, probe selection, state machine lifecycle, probe resolution, constants validation.

**Full spec:** Systems Manual §7.6.

## Morale-Victory Feedback (2026-03-12, n618)

Battle outcomes now feed into morale drift with diminishing returns and faction-differentiated sensitivity. This prevents the RS steamroller (unchecked victory momentum) and ARBiH death spiral (cascading defeats).

**Drift path** (`morale_drift.ts`): `BATTLE_MORALE_DRIFT` fires per formation per turn based on `recent_battle_outcome`. Formula: `finalDrift = round(baseDrift × habituation × sensitivity)`.

**Battle habituation**: `1/(1 + battle_outcome_count × 0.03)`. Tracked per formation via `FormationState.battle_outcome_count`. Counter never resets. After 20 battles: 62% effectiveness. After 40: 45%.

**Faction sensitivity multipliers** (applied after habituation):
- Victory (positive drift): RS 0.8× (expected), RBiH 1.3× (proves the army), HRHB 1.0×
- Defeat (negative drift): RS 1.3× (expects to win), RBiH 0.7× (numbed to defeat), HRHB 1.0×

**Faction home morale floors** (replaces flat `HOME_GROUND_MORALE_FLOOR=15`):
- RBiH: 30 (homeland defense, nowhere to go)
- HRHB: 25 (Herceg-Bosna identity)
- RS: 20 (Krajina identity, but can retreat to Serbia)

**RBiH existential floor**: Morale floor 25 for ARBiH formations at OSIDs with >50% Bosniak population, even without `home_defense_active`.

**Shock path** (`attack_resolution_osid.ts:1124-1142`): Unchanged in n618. Stage 2 candidate if drift-only proves insufficient.

**Constants**: `BATTLE_HABITUATION_RATE=0.03`, `FACTION_VICTORY_SENSITIVITY`, `FACTION_DEFEAT_SENSITIVITY`, `FACTION_HOME_MORALE_FLOOR`, `RBIH_EXISTENTIAL_FLOOR=25`, `EXISTENTIAL_AFFINITY_THRESHOLD=0.50`. All in `morale_drift.ts`.

**Tests**: `tests/morale_victory_feedback.test.ts` — 19 tests covering habituation, faction sensitivity, floors, existential floor.

## Intel-Gated Operation Launch (2026-03-12)

Before launching sector offensives, the corps AI gates on sector intel confidence. Low-confidence sectors receive probe operations instead of full attacks, preventing blind overcommitment.

**Key functions:**
- `getSectorIntelConfidence(state, sectorId, faction)` — reads the maximum confidence value from `state.military.sector_intel` records for the given sector. Module: `src/sim/combat/sector_intel.ts`.
- `shouldLaunchProbeInstead(state, corpsId, sectorId, faction, globalWeek)` — returns true if intel confidence is below the faction's `INTEL_GATE_LAUNCH_THRESHOLD` (RS 0.25, RBiH 0.40, HRHB 0.30), subject to: (a) RS blitz phase exemption (w0–12 bypasses gate), (b) `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT=2` forces full attack after 2 probes. Module: `src/sim/combat/bot_corps_directives.ts`.

**Wiring:** `bot_corps_directives.ts` lines ~1131–1157 — intel gate check inserted before operation launch in the sector offensive path. When gate triggers, operation is downgraded: max 2 brigades, 1-turn planning phase, `repulsed` minimum attack outcome.

**State:** `CorpsCommandState.consecutive_probes` — incremented on each probe launch for the sector, reset to 0 when a full attack launches or the operation completes.

**Constants:** `INTEL_GATE_LAUNCH_THRESHOLD` (`{ RS: 0.25, RBiH: 0.40, HRHB: 0.30 }`), `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT = 2`. Module: `src/sim/combat/bot_corps_directives.ts`.

**Tests:** `tests/intel_gated_operations.test.ts` — 12 tests covering threshold checks, RS blitz exemption, probe downgrade mechanics, consecutive probe commitment.

---

## Commander Intelligence Blindspot Audit (2026-04-02, Engine Health Audit)

This section documents known gaps in what the corps CO `CommanderBriefing` knows vs. what it needs to make sound decisions. All gaps discovered during a comprehensive engine health review (n1302 run).

### BRIEF-GAP-1: Supply hardcoded at 0.8 — `supply_by_osid` never consumed

**File:** `src/sim/combat/commander/briefing.ts`
**Gap:** `CommanderBriefing.supply_status` is hardcoded to `0.8`. The real supply field `state.military.supply_by_osid` exists and is populated each turn. The corps CO always believes it has 80% supply regardless of actual supply state.
**Impact:** P1. Corps CO never modulates aggression based on supply. The 94% RBiH strained-supply condition (0.75× combat multiplier) is invisible to corps commanders — ARBiH COs attack as if well-supplied.
**Fix:** Read `supply_by_osid` for sector OSIDs; derive min/mean supply and pass to briefing.

### BRIEF-GAP-2: Enemy equipment class absent from briefing

**File:** `src/sim/combat/commander/briefing.ts`
**Gap:** `CommanderBriefing` has no enemy equipment summary. The CO cannot distinguish an ARBiH rifle-only opponent from a VRS artillery+tank formation.
**Impact:** P1. Corps CO cannot weight the casualty risk or adjust force requirement. Applies equally to `checkLaunchFeasibility()` (see COMBAT_MASTER P14) and to the CO's qualitative stance/operation decisions.
**Fix:** Add `enemy_equipment_summary: { artillery: number; tanks: number; infantry_only: boolean }` derived from brigades in enemy sectors adjacent to this corps.

### BRIEF-GAP-3: Fatigue signal absent — no `brigade_fatigue_index`

**File:** `src/sim/combat/commander/briefing.ts`
**Gap:** Briefing includes brigade counts but not average fatigue. A CO ordering a third operation in six turns cannot see that his brigades are running at 80% fatigue.
**Impact:** P2. Leads to op-stacking on exhausted formations. `getWarExhaustionTempoMult()` applies globally but the CO has no individual-formation fatigue awareness.
**Fix:** Add `avg_fatigue_pct` and `brigades_above_fatigue_threshold` to briefing from `brigade_movement_state` fatigue fields.

### BRIEF-GAP-4: Corps exhaustion not in briefing

**File:** `src/sim/combat/commander/briefing.ts`
**Gap:** `state.military.corps_exhaustion[corpsId]` exists but is not included in `CommanderBriefing`. The Theater Assessment (`assessCorps()`) reads `state.meta.war_exhaustion` but not corps-level exhaustion.
**Impact:** P2. Corps-level exhaustion differentiates corps that have fought heavily from fresh corps. A Drina Corps CO at exhaustion 0.8 should behave differently from a fresh reserve CO.
**Fix:** Include `corps_exhaustion` from state in briefing (single lookup).
**Status (2026-04-02): partially resolved.** `CommanderBriefing` now carries `corps_exhaustion`, and `managePlan(...)` refuses to create a fresh offensive plan when corps exhaustion is above `MAX_EXHAUSTION_FOR_OPERATION`. Remaining work: exhaustion still influences commander behavior mainly at the plan-creation gate; deeper stance, reserve, and execution-tempo logic can still become more exhaustion-aware later.

### BRIEF-GAP-5: Adjacent corps posture absent

**File:** `src/sim/combat/commander/briefing.ts`
**Gap:** Corps CO has no visibility into what adjacent friendly corps are doing. A Drina Corps CO planning Kamenica doesn't know that East Bosnian Corps is simultaneously defending Brcko with all available brigades.
**Impact:** P2. Cannot coordinate timing, share staging zones, or avoid cannibalizing the same pool of brigades.
**Fix:** Add `adjacent_corps: { corpsId: string; stance: string; active_ops: number }[]` from `state.military.corps_command`.

### BRIEF-GAP-6: `recent_territory_change` hardcoded to 0

**File:** `src/sim/combat/commander/assess.ts`
**Gap:** `assessCorps()` returns `recent_territory_change: 0` always (hardcoded placeholder). The Theater Assessment is blind to whether a corps has been losing OSIDs in recent turns.
**Impact:** P1. A corps losing 3 OSIDs/turn should trigger defensive reassessment. Currently the threat response is purely instantaneous (current threat_ratio), not trend-based. Corps COs don't know if they're bleeding territory.
**Fix:** Compute over the last 3–5 turns: `Δ(friendly_osids)` for the corps area. Negative = ground loss = raise threat estimate; positive = gaining ground = can be more ambitious.

### BRIEF-GAP-7: Reinforcement requests not consumed by Army HQ

**File:** `src/sim/combat/army_hq_gathering.ts`
**Gap:** Corps COs can emit reinforcement requests (field exists on `CorpsCommandState`). Army HQ gathering sees all corps states but does not read or act on these requests. Requests accumulate, are never cleared.
**Impact:** P2. The reinforcement feedback loop is broken. Corps in crisis can't signal HQ for help, and HQ can't redistribute strategic reserves based on request signals.
**Fix:** In `army_hq_gathering.ts`, scan `corps_command` for pending reinforcement requests; factor into `CampaignPlan.front_priorities`; emit reserve brigade transfer directives.
**Status (2026-04-02): partially resolved.** Corps commander reinforcement requests are now persisted on `CorpsCommandState`, Army HQ theater assessment reads them into `CorpsAssessment`, and front-priority generation now treats high/critical requesters as non-economy fronts. Remaining work: Army HQ still does not convert that signal into explicit reserve-transfer directives or unify it with the elite reserve loan queue.

### ARMY-GAP-1: `CampaignPlan` briefing disconnect — partially resolved on 2026-04-02

**Files:** `src/sim/combat/army_hq_gathering.ts`, `src/sim/combat/commander/briefing.ts`
**Original gap:** `army_hq_gathering.ts` produced a `CampaignPlan` each turn with `front_priorities`, `doctrine_overrides`, and synchronized operations, but `buildBriefing()` did not read it. Corps COs were unaware of Army HQ's theater-level plan.
**Implemented on 2026-04-02:** `CommanderBriefing` now carries campaign front role, offensive targets, hold targets, doctrine ceiling, and synchronized-op participant data. Campaign `hold_targets` also merge into `must_hold_osids`, and opportunity planning now prefers Army HQ offensive targets when selecting staging zones and target OSIDs.
**Remaining gap:** Campaign intent is now present, but only opportunity planning and `must_hold` behavior consume it directly. Further work should still use front priorities to influence broader sector offensive scoring and synchronized multi-corps timing.

### ARMY-GAP-2: Feint operation type is underpowered as deception, not fully dead

**File:** `src/sim/combat/sector_offensive.ts` (operation resolution), `army_hq_gathering.ts` (feint generation)
**Updated reading (2026-04-02):** Feints are no longer fully inert. They already flow through sector intel into `offensive_signs`, `offensive_prep`, commander `concentration_detected`, and can trigger enemy `fortify` reactions. The real remaining gap is that feints are still a thin deception mechanic rather than a richer reserve-drawing or misallocation system.
**Impact:** P2. Feints now have some enemy-facing effect, but they are still too weak and too close to a self-taxed pseudo-op.
**Fix:** Treat feints as a later deception-quality improvement, not a literal dead-code emergency. Any future improvement should build on the now-live enemy-intel reaction path instead of replacing it.

### ARMY-GAP-3: No winter season combat modifier

**File:** `src/sim/combat/combat_math.ts`
**Gap:** No seasonal modifier exists. Bosnian winters (Dec–Mar) significantly degraded offensive operations — frozen ground, snow-blocked mountain passes, supply difficulty. The 40-week scenario runs Jan–Oct 1993, spanning a full winter. Both sides suffered but mountain-based operations were especially constrained.
**Impact:** P2. Operations in Ozren, Vlašić, Igman highlands run at full capacity in January as in July. VRS mountain drives (Majevica, Trebević) are unrealistically winter-agnostic.
**Fix:** `getSeasonalCombatMult(week, latitude)` — reduce attacker power by ~15% in weeks 1–8 (Jan–Feb) and 48–52 (Dec), scaled by elevation. Defender unaffected (prepared positions, local terrain familiarity). Winter window aligns with known operational pauses in the historical record.
