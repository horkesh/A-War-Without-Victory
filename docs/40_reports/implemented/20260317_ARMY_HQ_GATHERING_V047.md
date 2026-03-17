# Army HQ Gathering System — v0.4.7 Implementation Report

**Date:** 2026-03-17
**Version:** v0.4.7
**Baseline:** v0.4.6 (Commander Override Layer)
**Result:** Periodic army-level command meetings producing multi-turn campaign plans with front priorities, synchronized operations, and adaptive doctrine.

## Summary

- Added a **deliberative planning layer** to the bot AI: periodic Army HQ gatherings where the army commander evaluates theater-wide state and produces a `CampaignPlan` with multi-turn scope
- Three capabilities: **resource allocation** (front priorities), **coordinated operations** (synchronized multi-corps launch windows), **adaptive doctrine** (replaces calendar-driven phases)
- Historically grounded: faction-specific cadences (VRS 8w, ARBiH 14→8w improving, HVO 10w), communication constraints (besieged corps excluded/radio-only), emergency triggers
- Formula bot only (deterministic, no API cost)

## Historical Basis

Research from Historian and War-or-Game roles:

- **VRS**: Professional JNA-inherited staff at Crna Rijeka (Han Pijesak). Mladic issued numbered strategic directives (1-7) every 4-8 months. Daily combat reports from all corps. Encrypted radio. Highest C2 capability.
- **ARBiH**: Shattered communications early war. Sarajevo besieged — commander cannot meet most corps. 5th Corps (Bihac) radio-only. Enclaves autonomous. Professionalized under Delic (1994+).
- **HVO**: Zagreb-directed via dual-track command. Small force (40 brigades). Good comms within Herzegovina, poor to Posavina/Central Bosnia pockets.

## Architecture

### New Pipeline Step
`evaluate-army-hq-gathering` — step 134 in war_phases.ts, runs AFTER `ai-army-decisions` and BEFORE `generate-bot-corps-orders`. Evaluates all 3 bot factions per turn.

### Data Flow
```
evaluateArmyHQGathering(state, faction, turn)
  ├─ shouldGather() → cadence check + emergency triggers
  ├─ assessTheater() → per-corps evaluation, threat analysis
  ├─ generateCampaignPlan() → front priorities + doctrine + sync ops
  ├─ write plan to state.military.campaign_plans[faction]
  └─ generateSyncOperationOverrides() → army_hq_overrides for sync ops
      ↓
generateCorpsStanceOrders() reads plan → suggested stance per corps
generateCorpsDirectives() reads plan → aggression, reserves, targets
tickPreparation() reads plan → waiting_for_sync sub-phase
```

### New Types
| Type | Purpose |
|------|---------|
| `CampaignPlan` | Full gathering output: priorities, doctrine, sync ops, transfers |
| `FrontPriority` | Per-corps role (primary/secondary/economy/contain) + targets |
| `DoctrineOverride` | Adaptive army stance + aggression + per-corps stance ceilings |
| `SynchronizedOperation` | Multi-corps attack with launch window timing |
| `SyncOpParticipant` | Corps role in sync op (main_effort/supporting/feint/fixing) |
| `ForceTransfer` | Brigade march between corps (typed, not implemented in v0.4.7) |
| `TheaterAssessment` | Pre-plan evaluation of all fronts |
| `CorpsAssessment` | Per-corps strength, exhaustion, threat, attendance |

### New State Fields (MilitaryState)
- `campaign_plans?: Record<FactionId, CampaignPlan | null>` — active plan per faction
- `last_gathering_turn?: Record<FactionId, number>` — when last gathered

### New Preparation Sub-Phase
- `waiting_for_sync` — operation holds at ready until synchronized launch window opens

## Changes Made

### Phase 1: Types + Constants
- Created `army_hq_gathering_types.ts` (8 interfaces)
- Created `army_hq_gathering_constants.ts` (cadences, thresholds, score values)
- Extended `PreparationSubPhase` with `waiting_for_sync`
- Extended `CorpsOperation` with `sync_operation_name`, `sync_launch_after`
- Added `campaign_plans`, `last_gathering_turn` to `MilitaryState`

### Phase 2: Trigger Evaluation
- `shouldGather()`: cadence check + emergency triggers (corps collapse, emergency events)
- `canCorpsAttendGathering()`: communication constraints (excluded/radio/full)
- Emergency cooldown: 4 turns minimum between sessions
- Emergency event IDs: NATO Deliberate Force, Operation Storm, Croat-Bosniak war, Washington Agreement

### Phase 3: Theater Assessment
- `assessTheater()`: per-corps evaluation (strength, exhaustion, active ops, officer competence, sector threat)
- Territory trend: majority-vote over corps strength classes
- Supply/manpower status: from general_supply_reserve and avg brigade personnel
- Enemy front identification: from sector_intel records

### Phase 4: Plan Generation
- `generateCampaignPlan()`: front priorities + adaptive doctrine
- Opportunity scoring: brigades, strength, exhaustion, threat
- Front priority assignment: primary (max 2) / secondary / economy / contain
- Faction personality: VRS aggressive early, ARBiH survival mode early, HRHB Herzegovina-focused
- Doctrine adaptation: territory trend + supply + manpower → army stance + aggression
- Plan validity: cadence + 2 buffer turns

### Phase 5: Synchronized Operations
- `generateSynchronizedOperations()`: pairs primary/secondary corps for coordinated attacks
- Launch windows: start = turn+3, end = turn+3+SYNC_WINDOW_DEFAULT(5)
- `waiting_for_sync` in operation_preparation: holds ready ops until window opens
- Anti-stall: force launch after SYNC_WAIT_MAX_TURNS(4)
- Max 1 sync op per gathering

### Phase 6: Corps Directive Integration
- `bot_corps_stance.ts`: reads `suggested_stance` from front priorities; enforces stance ceilings
- `bot_corps_directives.ts`: adjusts aggression, reserves, targets based on front priority role
- Health-based overrides (reorganize) still trump plan
- Graceful degradation: no plan = unchanged behavior

### Phase 7: Pipeline Integration
- `evaluateArmyHQGathering()` top-level function
- Pipeline step in war_phases.ts (step 134)
- Player faction skipped

### Phase 8: Serialization + Validation
- `validateGameState.ts`: validates campaign_plans structure
- JSON round-trip verified
- No serialize.ts changes needed (plain objects)

### Simplify Pass
- Extracted all magic numbers to constants (strength thresholds, supply thresholds, opportunity scores)
- Removed unused `nonExcluded` variable
- Fixed army_hq_overrides collision: `generateAllCorpsOrders()` in bot_corps_ai.ts was REPLACING overrides instead of merging — sync overrides from gathering were being wiped. Fixed to merge.

## Determinism Impact

**No impact.** All gathering logic is deterministic:
- No RNG usage
- No timestamps
- Cadence is turn-number-based
- Assessment uses only current state
- Plan generation is algorithmic with sorted iteration
- Sync operations use deterministic pairing (sorted by corps ID)

## Tests

**54 new tests** in `tests/army_hq_gathering.test.ts`:

| Category | Count |
|----------|-------|
| Trigger evaluation (cadence, emergencies, comms) | 12 |
| Theater assessment | 5 |
| Plan generation (priorities, doctrine, factions) | 8 |
| Synchronized operations + waiting_for_sync | 8 |
| Corps directive integration | 9 |
| Pipeline integration | 4 |
| Serialization + validation | 3 |
| Step count update | 1 (war_phase_step_order) |

**Full suite:** 1028 vitest tests pass, typecheck clean.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/army_hq_gathering.ts` | **NEW** — 838 lines, core logic |
| `src/sim/combat/army_hq_gathering_types.ts` | **NEW** — type definitions |
| `src/sim/combat/army_hq_gathering_constants.ts` | **NEW** — constants and thresholds |
| `src/state/game_state.ts` | campaign_plans, last_gathering_turn, waiting_for_sync, sync fields |
| `src/sim/combat/operation_preparation.ts` | waiting_for_sync sub-phase handling |
| `src/sim/combat/bot_corps_directives.ts` | reads campaign plan for aggression/reserves/targets |
| `src/sim/combat/bot_corps_stance.ts` | reads campaign plan for suggested stance |
| `src/sim/combat/bot_corps_ai.ts` | fixed override merge (was replace) |
| `src/sim/turn_phases/war_phases.ts` | pipeline step 134 |
| `src/state/validateGameState.ts` | campaign plan validation |
| `tests/army_hq_gathering.test.ts` | **NEW** — 54 tests |
| `tests/war_phase_step_order.test.ts` | step count 133→134 |

## What This Does NOT Include (deferred)

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Force transfers (brigade march between corps) | v0.4.8 | Requires movement system changes |
| Player-facing gathering UI (war council screen) | v0.5.1 | UI milestone |
| LLM narrative (gathering "discussion") | v0.5.4 | AI narrative milestone |
| Political interference (Karadžic veto, Zagreb override) | v0.5.0 | Diplomatic system milestone |
| Territory loss tracking (historical snapshots) | v0.4.8 | Emergency trigger enhancement |

## Lessons Learned

1. **Override collision was silent**: `generateAllCorpsOrders()` replaced `army_hq_overrides` wholesale, wiping sync overrides from the gathering. Caught in /simplify review. **Lesson**: any pipeline step writing to a shared array must check if prior steps already populated it.

2. **Calendar-driven doctrine still needed as fallback**: The gathering produces adaptive doctrine, but before the first gathering fires (turns 0-8 for VRS), the old `FACTION_DOCTRINE_PHASES` constants serve as initial defaults. Removing them would break early-war behavior.

3. **Communication constraints add real asymmetry**: ARBiH's inability to coordinate enclaved/besieged corps creates historically accurate independent action for 5th Corps and Sarajevo early war. This emerged naturally from the attendance model.

## Next Steps

1. **Run 40w calibration** to measure impact of gathering on territorial outcomes
2. **Monitor sync operations** — do VRS multi-corps attacks produce corridor-like patterns?
3. **Tune opportunity scoring** — current weights are initial estimates, may need calibration
4. **Add territory loss tracking** for emergency triggers (currently uses corps strength only)
