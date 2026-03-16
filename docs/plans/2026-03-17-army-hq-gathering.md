# Army HQ Gathering System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add periodic army-level command meetings that produce multi-turn campaign plans with front priorities, synchronized multi-corps operations, and adaptive doctrine — replacing the current reactive per-turn bot strategy with deliberative planning.

**Architecture:** A new `evaluateArmyHQGathering()` function runs each turn, fires on cadence or emergency triggers, and writes a `CampaignPlan` to state. Existing corps directive generation and operation preparation systems read the plan. New `waiting_for_sync` preparation sub-phase enables coordinated multi-corps launches.

**Tech Stack:** TypeScript, Vitest tests, deterministic (no RNG in gathering logic).

**Version:** v0.4.7 (formula bot enhancement, no API cost).

---

## Historical Basis (Historian + War-or-Game findings)

**VRS:** Professional JNA-inherited staff at Crna Rijeka. Mladic issued numbered strategic directives (Directive 1-7) every 4-8 months. Daily combat reports from all corps. Encrypted radio to all corps commanders. Mladic personally led operations at the front. Highest coordination capability.

**ARBiH:** Shattered communications early war. Sarajevo besieged — commander cannot meet most corps. 5th Corps (Bihac) radio-only. Enclaves autonomous. Professionalized under Delic (1994+). Multi-corps ops only possible late war.

**HVO:** Zagreb-directed via dual-track command. Small force (40 brigades). Good comms within Herzegovina, poor to Posavina/Central Bosnia pockets.

**Key realism constraints:**
- Plans take 1-2 turns to disseminate (VRS: 1, ARBiH: 2, HVO: 1)
- Besieged/enclaved corps cannot attend (get simplified directive, late)
- Corps commanders can partially comply based on personality
- No instant redeployment — force transfers take turns with march penalties
- Plans create COMMITMENT — gathering cadence means living with bad plans

---

## New Types

### `CampaignPlan` (the gathering output)

```typescript
export interface CampaignPlan {
    /** Turn this plan was created */
    issued_turn: number;
    /** Turn this plan expires (forces re-evaluation) */
    valid_until_turn: number;
    /** Was this an emergency session? */
    emergency: boolean;
    /** Reason for gathering */
    trigger_reason: string;

    /** Per-corps front classification */
    front_priorities: FrontPriority[];

    /** Doctrine override (replaces calendar-driven phases) */
    doctrine_override?: DoctrineOverride;

    /** Multi-corps synchronized operations */
    synchronized_operations: SynchronizedOperation[];

    /** Brigade transfers between corps */
    force_transfers: ForceTransfer[];

    /** Corps that could not attend (besieged/enclaved) */
    excluded_corps: string[];
}

export interface FrontPriority {
    corps_id: string;
    /** primary = gets reinforcements + offensive ops.
     *  secondary = supporting attacks, balanced stance.
     *  economy = hold with minimum force, defensive.
     *  contain = siege posture, no offensive. */
    role: 'primary' | 'secondary' | 'economy' | 'contain';
    /** Suggested stance override (corps can still deviate based on commander personality) */
    suggested_stance: CorpsStance;
    /** Target municipalities for primary/secondary fronts */
    offensive_targets?: string[];
    /** Municipalities to hold at all costs */
    hold_targets?: string[];
}

export interface DoctrineOverride {
    /** Army-wide stance */
    army_stance: ArmyStance;
    /** Per-corps stance ceilings (e.g. "herzegovina cannot go above balanced") */
    corps_stance_ceilings?: Record<string, CorpsStance>;
    /** Aggression modifier applied to all corps */
    aggression_modifier: number;
}

export interface SynchronizedOperation {
    /** Human-readable name for debugging */
    name: string;
    /** Participating corps with roles */
    participants: SyncOpParticipant[];
    /** Earliest turn any participant should launch */
    launch_window_start: number;
    /** Latest turn — launch regardless of readiness */
    launch_window_end: number;
    /** Target municipalities (shared objective area) */
    target_area: string[];
}

export interface SyncOpParticipant {
    corps_id: string;
    /** main_effort gets resource priority; supporting gets less */
    role: 'main_effort' | 'supporting' | 'feint' | 'fixing';
    /** Target OSIDs for this participant's axis */
    target_osids: string[];
    /** Minimum brigades to commit */
    min_brigades: number;
}

export interface ForceTransfer {
    /** Which brigade to move */
    brigade_id: string;
    from_corps: string;
    to_corps: string;
    /** Estimated turns to march */
    march_turns: number;
    /** Turn issued */
    issued_turn: number;
    /** Whether the transfer has completed */
    completed: boolean;
}
```

---

## New State Fields

On `MilitaryState`:
```typescript
/** Active campaign plan per faction (null = no plan, use default behavior) */
campaign_plans?: Record<FactionId, CampaignPlan | null>;
/** Turn of last gathering per faction */
last_gathering_turn?: Record<FactionId, number>;
```

On `PreparationSubPhase` (extend existing union):
```typescript
export type PreparationSubPhase =
    | 'intel_gathering' | 'force_staging' | 'supply_check'
    | 'assessment' | 'ready'
    | 'waiting_for_sync';  // NEW: waiting for synchronized launch window
```

On `CorpsOperation` (extend existing):
```typescript
/** If part of a synchronized operation, the sync op name */
sync_operation_name?: string;
/** Earliest turn to launch (from sync window) */
sync_launch_after?: number;
```

---

## Gathering Cadence & Triggers

### Regular cadence (faction-specific, historically grounded)

```typescript
export const GATHERING_CADENCE: Record<FactionId, (turn: number) => number> = {
    RS: () => 8,           // Every 8 weeks (~bimonthly). Professional staff.
    RBiH: (turn) => {      // Improves over the war as ARBiH professionalizes
        if (turn < 40) return 14;   // 1992: barely functional C2
        if (turn < 80) return 10;   // 1993: improving under Delic
        return 8;                    // 1994+: competent staff work
    },
    HRHB: () => 10,        // Every 10 weeks. Zagreb-directed, small force.
};
```

### Emergency triggers (checked every turn)

```typescript
export interface GatheringEmergencyCheck {
    /** Lost a municipality capital (settlement >5000 pop) */
    municipality_capital_lost: boolean;
    /** Supply corridor severed */
    corridor_severed: boolean;
    /** Enclave fell */
    enclave_fallen: boolean;
    /** Lost >5% controlled territory in last 4 turns */
    rapid_territory_loss: boolean;
    /** A corps lost >30% strength in last 8 turns */
    corps_strength_collapse: boolean;
    /** External event triggered (NATO strikes, Washington Agreement, etc.) */
    triggered_by_event: boolean;
}
```

Emergency sessions have a minimum cooldown of 4 turns (can't gather every turn during a crisis).

### Communication constraints

```typescript
export function canCorpsAttendGathering(
    corpsId: string, faction: FactionId, state: GameState
): 'full' | 'radio' | 'excluded' {
    // ARBiH enclaves: excluded (Srebrenica, Zepa, Gorazde garrisons)
    // ARBiH 5th Corps (Bihac): radio only (simplified plan, 2-turn delay)
    // ARBiH 1st Corps (Sarajevo): radio until tunnel (turn ~60), then full
    // VRS SRK: full (close to Pale/Han Pijesak)
    // HVO Posavina: radio only (isolated pocket)
    // All others: full attendance
}
```

Corps with `radio` attendance get the plan 1-2 turns late and receive simplified directives (front priority + doctrine only, no synchronized ops). Corps with `excluded` get only a one-line directive ("hold at all costs" / "continue current operations").

---

## Pipeline Integration

### New step: `evaluate-army-hq-gathering`

Insert BEFORE `generate-bot-corps-orders` (step 802) and AFTER `ai-army-decisions` (step 745).

```typescript
{
    name: 'evaluate-army-hq-gathering',
    run: (context) => {
        for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
            if (faction === context.state.meta.player_faction) continue; // Player controls own strategy
            evaluateArmyHQGathering(context.state, faction, context.state.meta.turn);
        }
    }
}
```

### Consumption points (modify existing code)

1. **`generateCorpsStanceOrders()`** in `bot_corps_stance.ts` — read `campaign_plans[faction].front_priorities[corps].suggested_stance` as a bias input (not absolute override — commander personality modulates).

2. **`generateCorpsDirectives()`** in `bot_corps_directives.ts` — read `campaign_plans[faction].front_priorities[corps].offensive_targets` to set priority targets. Read `front_priorities[corps].role` to adjust `reserve_fraction` and `aggression_modifier`.

3. **`tickPreparation()`** in `operation_preparation.ts` — when `preparation_sub_phase === 'ready'` and `sync_operation_name` is set, check if we're within the launch window. If before `sync_launch_after`, transition to `waiting_for_sync`. If within window and at least one other participant is also ready or in window, launch. If past `launch_window_end`, force launch regardless.

4. **`generateArmyHQOverrides()`** in `army_hq_overrides.ts` — when a `SynchronizedOperation` exists in the campaign plan, generate coordinated overrides for all participating corps with matching `target_osids` and timing.

---

## Task Breakdown

### Task 1: Types and state fields

**Files:**
- Create: `src/sim/combat/army_hq_gathering_types.ts`
- Modify: `src/state/game_state.ts` (add `campaign_plans`, `last_gathering_turn` to MilitaryState)
- Modify: `src/sim/combat/operation_preparation.ts` (add `waiting_for_sync` to PreparationSubPhase)

Define all types from the "New Types" section above. Add state fields. Add `waiting_for_sync` to the PreparationSubPhase union. Add `sync_operation_name` and `sync_launch_after` to CorpsOperation.

**Tests:** Typecheck passes. No behavioral tests yet.

**Commit:** `feat(gathering): add CampaignPlan types and state fields`

---

### Task 2: Gathering trigger evaluation

**Files:**
- Create: `src/sim/combat/army_hq_gathering.ts`
- Test: `tests/army_hq_gathering.test.ts`

Implement:
- `shouldGather(state, faction, currentTurn): { gather: boolean; reason: string }` — checks cadence + emergency triggers
- `canCorpsAttendGathering(corpsId, faction, state): 'full' | 'radio' | 'excluded'`
- `GATHERING_CADENCE` constants
- `EMERGENCY_COOLDOWN = 4` constant
- Emergency detection: territory loss rate, corps strength monitoring, event-triggered

**Tests (8):**
1. VRS gathers at turn 8 (first gathering)
2. VRS does not gather at turn 7
3. ARBiH gathers at turn 14 early war, turn 10 mid-war, turn 8 late war
4. Emergency: territory loss >5% triggers immediate gathering
5. Emergency cooldown: no emergency gathering within 4 turns of last
6. Besieged ARBiH 1st Corps returns 'radio' early, 'full' after tunnel
7. Enclaved corps return 'excluded'
8. Player faction skipped

**Commit:** `feat(gathering): trigger evaluation — cadence, emergencies, communication constraints`

---

### Task 3: Theater assessment (the "intelligence briefing")

**Files:**
- Modify: `src/sim/combat/army_hq_gathering.ts`
- Test: `tests/army_hq_gathering.test.ts`

Implement:
- `assessTheater(state, faction): TheaterAssessment` — evaluates all fronts
  - Per-corps: strength class, exhaustion, active ops, recent gains/losses, sector threat ratios
  - Theater-wide: total controlled territory %, supply situation, manpower reserves
  - Enemy assessment: which enemy corps are weak, where are opportunities
  - Uses `sector_combat_ratings` and `sector_intel` for data

```typescript
interface TheaterAssessment {
    corps_assessments: CorpsAssessment[];
    territory_trend: 'gaining' | 'stable' | 'losing';
    supply_status: 'abundant' | 'adequate' | 'strained' | 'critical';
    manpower_status: 'healthy' | 'adequate' | 'strained' | 'critical';
    weakest_enemy_front: string | null;  // corps_id of most vulnerable enemy
    strongest_threat: string | null;     // corps_id of most dangerous enemy
}

interface CorpsAssessment {
    corps_id: string;
    attendance: 'full' | 'radio' | 'excluded';
    strength_class: SectorStrengthClass;
    exhaustion: number;
    has_active_op: boolean;
    recent_territory_change: number;  // OSIDs gained - lost in last 8 turns
    sector_threat_avg: number;
    available_brigades: number;
    officer_competence: number;
}
```

**Tests (5):**
1. Assessment correctly identifies weakest enemy front
2. Assessment flags corps with high exhaustion
3. Territory trend: 'gaining' when net positive, 'losing' when negative
4. Supply status derived from `general_supply_reserve` thresholds
5. Excluded corps still assessed (army HQ has some intelligence even without attendance)

**Commit:** `feat(gathering): theater assessment — corps evaluation, threat analysis`

---

### Task 4: Plan generation — front priorities + doctrine adaptation

**Files:**
- Modify: `src/sim/combat/army_hq_gathering.ts`
- Test: `tests/army_hq_gathering.test.ts`

Implement:
- `generateCampaignPlan(state, faction, assessment, turn): CampaignPlan`

**Front priority algorithm:**
1. Rank corps by opportunity score: `(enemy_weakness × own_strength) - exhaustion`
2. Top 1-2 corps → `primary` (offensive stance, get reinforcements)
3. Corps with high threat → `contain` or `economy` (defensive)
4. Remaining → `secondary` (balanced)
5. Factor in existing army priorities (`FACTION_ARMY_PRIORITIES`) as weight bias

**Doctrine adaptation algorithm:**
1. If territory_trend === 'losing' && manpower_status === 'strained': shift to `general_defensive`
2. If territory_trend === 'gaining' && supply_status !== 'critical': maintain or escalate to `general_offensive`
3. If all corps exhausted (avg exhaustion > 50): force `balanced` with negative aggression
4. Otherwise: `balanced` with faction-specific aggression
5. Plan valid for `GATHERING_CADENCE[faction]` turns

**Faction personality in plan generation:**
- VRS: Aggressive early (w0-26), increasingly defensive after. Primary front gets heavy concentration.
- ARBiH: Conservative early (survival), gradually bolder. Multiple secondary fronts (stretch enemy thin — Delic's historical strategy).
- HVO: Herzegovina-focused. Never commits heavily outside core territory. Zagreb political constraints.

**Tests (8):**
1. VRS early war: at least one corps designated `primary` with offensive stance
2. VRS late war with high exhaustion: doctrine shifts to `general_defensive`
3. ARBiH early war: no corps designated `primary` (too weak)
4. ARBiH mid-war: one corps can become `primary` if assessment shows opportunity
5. Plan validity: `valid_until_turn` = `issued_turn + cadence`
6. Besieged corps (excluded) receive `contain` role, not `primary`
7. Corps with active successful operation retains `primary` even if others are stronger
8. Plan with all corps exhausted: doctrine forces `balanced`, negative aggression

**Commit:** `feat(gathering): plan generation — front priorities, adaptive doctrine`

---

### Task 5: Synchronized operations

**Files:**
- Modify: `src/sim/combat/army_hq_gathering.ts`
- Modify: `src/sim/combat/operation_preparation.ts` (add `waiting_for_sync` logic)
- Modify: `src/sim/combat/army_hq_overrides.ts` (generate sync'd overrides)
- Test: `tests/army_hq_gathering.test.ts`

**Sync operation generation:**
1. During plan generation, check if 2+ adjacent `primary`/`secondary` corps share a border with the same enemy
2. If yes and both have available brigades, create a `SynchronizedOperation` with:
   - `launch_window_start`: current turn + 3 (minimum prep time)
   - `launch_window_end`: current turn + 8 (max wait)
   - Main effort: stronger corps. Supporting: weaker corps.
3. Write `ArmyHQOverride` for each participant with matching timing

**Operation preparation changes:**
- New sub-phase `waiting_for_sync` after `ready`:
  - If `sync_launch_after` is set and current turn < `sync_launch_after`: stay in `waiting_for_sync`
  - If current turn >= `sync_launch_after` and <= `launch_window_end`: check if at least one partner is also `ready` or `waiting_for_sync` → transition to execution
  - If current turn > `launch_window_end`: force launch regardless (window closing)
  - Anti-stall: if waiting > 4 turns in `waiting_for_sync`, force launch

**Tests (8):**
1. Two corps with shared enemy border produce a SynchronizedOperation
2. Solo corps (no adjacent allies) produces no sync ops
3. Operation in `ready` state with `sync_operation_name` transitions to `waiting_for_sync`
4. Operation in `waiting_for_sync` launches when partner is also ready
5. Operation in `waiting_for_sync` force-launches after window closes
6. Excluded corps cannot participate in synchronized operations
7. `waiting_for_sync` does not tick preparation_turns_elapsed
8. Sync op with one participant aborted: remaining participant launches solo

**Commit:** `feat(gathering): synchronized multi-corps operations with launch windows`

---

### Task 6: Integration with existing corps directive system

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts` (read campaign plan)
- Modify: `src/sim/combat/bot_corps_stance.ts` (read front priorities)
- Test: `tests/army_hq_gathering.test.ts`

**Corps stance integration:**
- In `generateCorpsStanceOrders()`, after computing base stance from health metrics:
  - If `campaign_plans[faction]` exists and has a `FrontPriority` for this corps:
    - Use `suggested_stance` as the baseline (instead of doctrine default)
    - Apply `doctrine_override.corps_stance_ceilings` as a cap
    - Commander personality still modulates: a cautious commander assigned `offensive` may only go `balanced`

**Corps directive integration:**
- In `generateCorpsDirectives()`:
  - If `front_priorities[corps].role === 'primary'`: boost `aggression_modifier` by +0.05, reduce `reserve_fraction` by 0.05
  - If `role === 'economy'`: set `aggression_modifier` to -0.15, increase `reserve_fraction` to 0.3
  - If `role === 'contain'`: set `aggression_modifier` to -0.30, no offensive targets
  - Use `front_priorities[corps].offensive_targets` as priority targets (prepended to existing)
  - Use `front_priorities[corps].hold_targets` as hold_osids

**Tests (6):**
1. Corps with `primary` role gets boosted aggression
2. Corps with `economy` role gets defensive stance and reduced aggression
3. Corps with `contain` role gets no offensive targets
4. No campaign plan: behavior unchanged from current (regression test)
5. Campaign plan with excluded corps: excluded corps uses default behavior
6. Commander personality override: cautious commander with `primary` role stays `balanced`

**Commit:** `feat(gathering): integrate campaign plan into corps directives and stances`

---

### Task 7: Pipeline integration + gathering step

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts` (add pipeline step)
- Modify: `src/sim/combat/army_hq_gathering.ts` (top-level `evaluateArmyHQGathering()`)
- Test: `tests/army_hq_gathering.test.ts`

**Top-level function:**
```typescript
export function evaluateArmyHQGathering(
    state: GameState, faction: FactionId, currentTurn: number
): void {
    if (faction === state.meta.player_faction) return;

    const { gather, reason } = shouldGather(state, faction, currentTurn);
    if (!gather) return;

    const assessment = assessTheater(state, faction);
    const plan = generateCampaignPlan(state, faction, assessment, currentTurn);

    // Write plan to state
    if (!state.military.campaign_plans) state.military.campaign_plans = {};
    state.military.campaign_plans[faction] = plan;
    if (!state.military.last_gathering_turn) state.military.last_gathering_turn = {};
    state.military.last_gathering_turn[faction] = currentTurn;

    // Generate army HQ overrides for synchronized operations
    generateSyncOperationOverrides(state, faction, plan);
}
```

**Pipeline step** (insert after `ai-army-decisions`, before `generate-bot-corps-orders`):
```typescript
{
    name: 'evaluate-army-hq-gathering',
    run: (context) => {
        for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
            evaluateArmyHQGathering(context.state, faction, context.state.meta.turn);
        }
    }
}
```

**Tests (4):**
1. Pipeline step exists and runs after ai-army-decisions
2. Player faction is skipped
3. Full integration: 52-turn scenario produces gatherings at expected intervals
4. Emergency gathering fires on territory loss

**Commit:** `feat(gathering): pipeline integration — evaluateArmyHQGathering step`

---

### Task 8: Serialization + validation

**Files:**
- Modify: `src/state/serialize.ts` (serialize/deserialize campaign_plans, last_gathering_turn)
- Modify: `src/state/validateGameState.ts` (validate new fields)
- Test: `tests/validate_game_state_shape.test.ts`

Ensure `campaign_plans` and `last_gathering_turn` survive save/load. Validate structure in `validateGameState`.

**Tests (3):**
1. CampaignPlan round-trips through serialize/deserialize
2. Validation accepts valid campaign plan
3. Validation rejects malformed campaign plan (missing required fields)

**Commit:** `feat(gathering): serialization and validation for campaign plans`

---

### Task 9: Full regression test

Run: `npm run test:vitest` — all tests must pass
Run: `npm run typecheck` — clean
Run: `npm run sim:scenario:run:40w` — scenario completes without errors

**Commit:** Only if fixes needed.

---

## Constants Summary

```typescript
// army_hq_gathering_constants.ts

/** Turns between regular gatherings */
export const GATHERING_CADENCE_RS = 8;
export const GATHERING_CADENCE_HRHB = 10;
export function GATHERING_CADENCE_RBIH(turn: number): number {
    if (turn < 40) return 14;
    if (turn < 80) return 10;
    return 8;
}

/** Minimum turns between emergency sessions */
export const EMERGENCY_COOLDOWN = 4;

/** Territory loss % in 4 turns to trigger emergency */
export const RAPID_TERRITORY_LOSS_THRESHOLD = 0.05;

/** Corps strength loss % in 8 turns to trigger emergency */
export const CORPS_STRENGTH_COLLAPSE_THRESHOLD = 0.30;

/** Plan validity extension beyond cadence (buffer) */
export const PLAN_VALIDITY_BUFFER = 2;

/** Communication delay for radio-only corps */
export const RADIO_DELAY_TURNS = 2;

/** Max turns to wait in waiting_for_sync before force launch */
export const SYNC_WAIT_MAX_TURNS = 4;

/** Sync operation launch window default size */
export const SYNC_WINDOW_DEFAULT = 5;

/** Minimum brigades for sync operation participant */
export const SYNC_MIN_BRIGADES = 3;

/** Front priority aggression modifiers */
export const PRIORITY_AGGRESSION = {
    primary: 0.05,
    secondary: 0.0,
    economy: -0.15,
    contain: -0.30,
};
```

---

## What This Does NOT Include (future work)

1. **Force transfers** — brigade march between corps is typed but not implemented. Requires movement system changes. Defer to v0.4.8.
2. **Player-facing gathering UI** — when the player's faction gathers, they should see a war council screen. Defer to v0.5.1.
3. **LLM narrative** — the gathering "discussion" narrated by AI. Defer to v0.5.4.
4. **Political interference** — Karadžic vetoing Mladic, Zagreb overriding HVO. Defer to v0.5.0 diplomatic system.

## Estimated Test Count

~42 new tests across 8 tasks.
