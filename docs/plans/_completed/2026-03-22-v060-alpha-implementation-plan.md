# v0.6.0-alpha Implementation Plan — Event Infrastructure + HQ Player Actions

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the engine foundation for the emergent event system (pressure, dimensions, flags, conditions, constraints, bot logic) and complete HQ Phase 3 player actions.

**Architecture:** Extend existing event types and evaluation pipeline. Add new state fields for pressure, dimensions, flags, and constraints. Wire the broken aggression modifier stub. Unify NegotiationCapital with new strategic dimensions. All changes are additive — existing events continue to work unchanged.

**Tech Stack:** TypeScript, Vitest, deterministic simulation (no Math.random)

**Design spec:** `docs/plans/2026-03-21-emergent-event-system-design.md`
**Master roadmap:** `docs/plans/2026-03-22-v06x-master-roadmap.md`

---

## Pre-flight

Before starting ANY task, read these files:
- `docs/life_lessons.md` — scan for relevant lessons
- `.claude/napkin.md` — current runbook
- `docs/plans/2026-03-21-emergent-event-system-design.md` §4, §5, §6, §7, §13, §14

Smoke-test triad before starting: `npx tsc --noEmit ; npm run test:vitest ; npm run desktop:map:build`

---

## TRACK A: Event Infrastructure (Tasks 1–12)

### Task 1: Extend EventDefinition Types

**Files:**
- Modify: `src/sim/events/event_types.ts`
- Test: `src/sim/events/__tests__/event_types.test.ts` (create if not exists)

**Step 1: Add DimensionId type and new interfaces**

Add after line 183 (after `Rng` type):

```typescript
export type DimensionId =
    | 'military_credibility'
    | 'territorial_legitimacy'
    | 'international_standing'
    | 'patron_confidence'
    | 'internal_cohesion'
    | 'negotiating_leverage';

export interface StrategicDimension {
    base_value: number;
    event_modifier: number;
    effective_value: number;
}

export interface DimensionShift {
    faction: FactionId;
    dimension: DimensionId;
    delta: number;
}

export interface PressureConfig {
    base_rate: number;
    threshold: number;
    decay_rate: number;
    modifiers?: PressureModifier[];
}

export interface PressureModifier {
    condition: EventCondition;
    rate_bonus: number;
}

export interface RecurrenceConfig {
    max_fires: number;
    cooldown_turns: number;
    escalation: 'static' | 'escalating' | 'deteriorating';
}
```

**Step 2: Extend EventDefinition interface**

Add new optional fields to `EventDefinition` (after line 165, before closing `}`):

```typescript
    // New v0.6.0 fields (all optional for backward compat)
    pressure?: PressureConfig;
    recurrence?: RecurrenceConfig;
    sets_flags?: Record<string, string | number | boolean>;
    dimension_shifts?: DimensionShift[];
    auto_resolve_turns?: number;
    priority?: number;
    mutex_group?: string;
    tags?: string[];
    enables_events?: string[];
    historical_source?: string;
```

**Step 3: Extend EventResponseOption interface**

Add new optional fields to `EventResponseOption` (after line 132, before closing `}`):

```typescript
    sets_flags?: Record<string, string | number | boolean>;
    dimension_shifts?: DimensionShift[];
    available_from_fire?: number;
    unavailable_after_fire?: number;
    aggression_affinity?: number;
    risk_level?: number;
```

**Step 4: Add new EventCondition variants**

Extend the `EventCondition` union type (lines 10–19). Add these variants:

```typescript
    | { type: 'supply_below'; faction: FactionId; threshold: number }
    | { type: 'supply_above'; faction: FactionId; threshold: number }
    | { type: 'territory_percentage'; faction: FactionId; comparator: 'above' | 'below'; threshold: number }
    | { type: 'dimension_above'; faction: FactionId; dimension: DimensionId; threshold: number }
    | { type: 'dimension_below'; faction: FactionId; dimension: DimensionId; threshold: number }
    | { type: 'flag_equals'; flag: string; value: string | number | boolean }
    | { type: 'flag_not_set'; flag: string }
    | { type: 'patron_pressure_above'; faction: FactionId; threshold: number }
    | { type: 'war_crimes_above'; faction: FactionId; threshold: number }
    | { type: 'morale_average_below'; faction: FactionId; threshold: number }
    | { type: 'week_since_event'; event_id: string; min_weeks?: number; max_weeks?: number }
    | { type: 'event_fire_count'; event_id: string; min_count?: number; max_count?: number }
    | { type: 'enclave_supply_status'; municipality: string; status: 'adequate' | 'strained' | 'critical' }
    | { type: 'corridor_severed'; from_osid: string; to_osid: string; faction: FactionId }
```

**Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (all new fields are optional, no consumers break)

**Step 6: Commit**

```bash
git add src/sim/events/event_types.ts
git commit -m "feat(events): extend EventDefinition with pressure, dimensions, flags, recurrence, new conditions"
```

---

### Task 2: Add Event State Fields to GameState

**Files:**
- Modify: `src/state/game_state.ts`
- Modify: `src/state/negotiation_types.ts`

**Step 1: Add event state fields**

Find `MilitaryState` interface in `game_state.ts`. Add these fields (all optional for backward compat with existing saves):

```typescript
    // Event system v0.6.0
    event_readiness?: Record<string, number>;
    event_fire_counts?: Record<string, number>;
    event_last_fired_turn?: Record<string, number>;
    event_flags?: Record<string, string | number | boolean>;
    enabled_event_ids?: string[];
    event_constraints?: {
        operation_blocks?: Array<{
            faction: string;
            expires_turn: number;
            reason: string;
        }>;
        doctrine_overrides?: Array<{
            faction: string;
            forced_stance: string;
            expires_turn: number;
            reason: string;
        }>;
        scope_restrictions?: Array<{
            faction: string;
            allowed_municipalities?: string[];
            blocked_municipalities?: string[];
            expires_turn?: number;
            reason: string;
        }>;
    };
```

**Step 2: Add strategic dimensions to PoliticalState (or NegotiationState)**

In `negotiation_types.ts`, add to `NegotiationState` (after line 144):

```typescript
    strategic_dimensions?: Record<string, Record<string, {
        base_value: number;
        event_modifier: number;
        effective_value: number;
    }>>;
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (all new fields are optional)

**Step 4: Run tests**

Run: `npm run test:vitest`
Expected: All 1261 tests pass (no behavioral change)

**Step 5: Commit**

```bash
git add src/state/game_state.ts src/state/negotiation_types.ts
git commit -m "feat(state): add event system state fields — readiness, flags, dimensions, constraints"
```

---

### Task 3: Expand Condition Evaluator

**Files:**
- Modify: `src/sim/events/event_types.ts` (evaluateCondition function, lines 203–254)
- Create: `src/sim/events/__tests__/condition_evaluator.test.ts`

**Step 1: Write tests for new condition types**

Create `src/sim/events/__tests__/condition_evaluator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../event_types.js';
import type { GameState } from '../../../state/game_state.js';

// Helper to build minimal state for testing
function minState(overrides?: Partial<GameState>): GameState {
    return {
        meta: { turn: 20, phase: 'war', scenario_start_date: '1992-04-06' },
        political: {
            political_controllers: {},
            war_alliance_rbih_hrhb: 0.5,
        },
        military: {
            formations: {},
            general_supply_reserve: { RS: 50, RBiH: 30, HRHB: 40 },
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
                strategic_dimensions: {},
            },
            event_flags: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
        },
        ...overrides,
    } as unknown as GameState;
}

describe('evaluateCondition — new condition types', () => {
    it('supply_below: true when faction supply is below threshold', () => {
        const state = minState();
        const result = evaluateCondition(
            { type: 'supply_below', faction: 'RBiH', threshold: 40 },
            state
        );
        expect(result).toBe(true); // RBiH supply is 30, below 40
    });

    it('supply_below: false when faction supply is above threshold', () => {
        const state = minState();
        const result = evaluateCondition(
            { type: 'supply_below', faction: 'RS', threshold: 40 },
            state
        );
        expect(result).toBe(false); // RS supply is 50, above 40
    });

    it('flag_equals: matches set flag', () => {
        const state = minState();
        state.military.event_flags = { rs_strategic_goals: 'all_six' };
        const result = evaluateCondition(
            { type: 'flag_equals', flag: 'rs_strategic_goals', value: 'all_six' },
            state
        );
        expect(result).toBe(true);
    });

    it('flag_equals: false when flag has different value', () => {
        const state = minState();
        state.military.event_flags = { rs_strategic_goals: 'selective' };
        const result = evaluateCondition(
            { type: 'flag_equals', flag: 'rs_strategic_goals', value: 'all_six' },
            state
        );
        expect(result).toBe(false);
    });

    it('flag_not_set: true when flag does not exist', () => {
        const state = minState();
        state.military.event_flags = {};
        const result = evaluateCondition(
            { type: 'flag_not_set', flag: 'rs_strategic_goals' },
            state
        );
        expect(result).toBe(true);
    });

    it('dimension_below: true when dimension effective_value below threshold', () => {
        const state = minState();
        state.military.negotiation!.strategic_dimensions = {
            RS: {
                international_standing: { base_value: 60, event_modifier: -25, effective_value: 35 },
            },
        };
        const result = evaluateCondition(
            { type: 'dimension_below', faction: 'RS', dimension: 'international_standing', threshold: 40 },
            state
        );
        expect(result).toBe(true);
    });

    it('event_fire_count: true when event fired enough times', () => {
        const state = minState();
        state.military.event_fire_counts = { srebrenica_assault: 2 };
        const result = evaluateCondition(
            { type: 'event_fire_count', event_id: 'srebrenica_assault', min_count: 2 },
            state
        );
        expect(result).toBe(true);
    });

    it('week_since_event: true when enough weeks have passed', () => {
        const state = minState(); // turn 20
        state.military.event_last_fired_turn = { camp_revelations: 10 };
        const result = evaluateCondition(
            { type: 'week_since_event', event_id: 'camp_revelations', min_weeks: 8 },
            state
        );
        expect(result).toBe(true); // 20 - 10 = 10 weeks >= 8
    });

    it('war_crimes_above: true when war crimes exceed threshold', () => {
        const state = minState();
        state.military.negotiation!.capital = {
            RS: { war_crimes_events: 5 } as any,
        };
        const result = evaluateCondition(
            { type: 'war_crimes_above', faction: 'RS', threshold: 3 },
            state
        );
        expect(result).toBe(true);
    });
});
```

**Step 2: Run tests — verify they fail**

Run: `npm run test:vitest -- --reporter=verbose src/sim/events/__tests__/condition_evaluator.test.ts`
Expected: FAIL (new condition types not implemented yet)

**Step 3: Implement new condition handlers**

In `evaluateCondition()` (event_types.ts, lines 203–254), add cases for each new condition type. Add after the existing `not` case (before the closing `default`):

```typescript
        case 'supply_below': {
            const supply = (state.military as any).general_supply_reserve?.[condition.faction] ?? 0;
            return supply < condition.threshold;
        }
        case 'supply_above': {
            const supply = (state.military as any).general_supply_reserve?.[condition.faction] ?? 0;
            return supply >= condition.threshold;
        }
        case 'territory_percentage': {
            const pc = state.political?.political_controllers ?? {};
            const allOsids = Object.keys(pc);
            const factionOsids = allOsids.filter(osid => pc[osid] === condition.faction);
            const pct = allOsids.length > 0 ? factionOsids.length / allOsids.length : 0;
            return condition.comparator === 'above' ? pct >= condition.threshold : pct < condition.threshold;
        }
        case 'dimension_above': {
            const dims = (state.military as any).negotiation?.strategic_dimensions?.[condition.faction];
            const dim = dims?.[condition.dimension];
            return (dim?.effective_value ?? 50) >= condition.threshold;
        }
        case 'dimension_below': {
            const dims = (state.military as any).negotiation?.strategic_dimensions?.[condition.faction];
            const dim = dims?.[condition.dimension];
            return (dim?.effective_value ?? 50) < condition.threshold;
        }
        case 'flag_equals': {
            const flags = (state.military as any).event_flags ?? {};
            return flags[condition.flag] === condition.value;
        }
        case 'flag_not_set': {
            const flags = (state.military as any).event_flags ?? {};
            return !(condition.flag in flags);
        }
        case 'patron_pressure_above': {
            const pr = (state.military as any).negotiation?.patron_relationships?.[condition.faction];
            return (pr?.override_authority ?? 0) >= condition.threshold;
        }
        case 'war_crimes_above': {
            const cap = (state.military as any).negotiation?.capital?.[condition.faction];
            return (cap?.war_crimes_events ?? 0) >= condition.threshold;
        }
        case 'morale_average_below': {
            const formations = state.military?.formations ?? {};
            const factionBrigades = Object.values(formations)
                .filter((f: any) => f.faction === condition.faction && f.kind === 'brigade' && f.status === 'active');
            if (factionBrigades.length === 0) return false;
            const avgMorale = factionBrigades.reduce((sum: number, f: any) => sum + (f.morale ?? 50), 0) / factionBrigades.length;
            return avgMorale < condition.threshold;
        }
        case 'week_since_event': {
            const lastFired = (state.military as any).event_last_fired_turn?.[condition.event_id];
            if (lastFired == null) return false;
            const weeksSince = (state.meta?.turn ?? 0) - lastFired;
            if (condition.min_weeks != null && weeksSince < condition.min_weeks) return false;
            if (condition.max_weeks != null && weeksSince > condition.max_weeks) return false;
            return true;
        }
        case 'event_fire_count': {
            const count = (state.military as any).event_fire_counts?.[condition.event_id] ?? 0;
            if (condition.min_count != null && count < condition.min_count) return false;
            if (condition.max_count != null && count > condition.max_count) return false;
            return true;
        }
        case 'enclave_supply_status': {
            // Read from supply state by OSID — deferred to integration with supply system
            // For now, check if municipality has strained/critical supply
            return false; // placeholder — needs supply system integration
        }
        case 'corridor_severed': {
            // BFS connectivity check — deferred to integration with adjacency graph
            // For now, return false
            return false; // placeholder — needs adjacency graph integration
        }
```

**Step 4: Run tests — verify they pass**

Run: `npm run test:vitest -- --reporter=verbose src/sim/events/__tests__/condition_evaluator.test.ts`
Expected: PASS (all new condition tests green)

**Step 5: Run full test suite + typecheck**

Run: `npx tsc --noEmit ; npm run test:vitest`
Expected: All pass

**Step 6: Commit**

```bash
git add src/sim/events/event_types.ts src/sim/events/__tests__/condition_evaluator.test.ts
git commit -m "feat(events): expand condition evaluator with 15 new condition types"
```

---

### Task 4: Pressure System

**Files:**
- Create: `src/sim/events/pressure_system.ts`
- Create: `src/sim/events/__tests__/pressure_system.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import { updateEventReadiness } from '../pressure_system.js';
import type { GameState } from '../../../state/game_state.js';
import type { EventDefinition } from '../event_types.js';

function minState(): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        political: { political_controllers: {}, war_alliance_rbih_hrhb: 0.5 },
        military: {
            formations: {},
            event_readiness: {},
            event_flags: {},
            negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: {} },
        },
    } as unknown as GameState;
}

const testEvent: EventDefinition = {
    id: 'test_event',
    trigger: { condition: { type: 'alliance_below', value: 0.6 } },
    effect: { kind: 'narrative', text: 'test' },
    pressure: { base_rate: 1.0, threshold: 5, decay_rate: 0.3 },
};

describe('pressure system', () => {
    it('increments readiness when conditions met', () => {
        const state = minState(); // alliance 0.5 < 0.6
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBe(1.0);
    });

    it('accumulates readiness over multiple calls', () => {
        const state = minState();
        updateEventReadiness(state, [testEvent]);
        updateEventReadiness(state, [testEvent]);
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBe(3.0);
    });

    it('decays readiness when conditions NOT met', () => {
        const state = minState();
        state.military.event_readiness = { test_event: 4.0 };
        state.political.war_alliance_rbih_hrhb = 0.8; // above 0.6, condition not met
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBeCloseTo(3.7); // 4.0 - 0.3
    });

    it('does not go below zero', () => {
        const state = minState();
        state.military.event_readiness = { test_event: 0.1 };
        state.political.war_alliance_rbih_hrhb = 0.8;
        updateEventReadiness(state, [testEvent]);
        expect(state.military.event_readiness!['test_event']).toBe(0);
    });

    it('skips events without pressure config', () => {
        const state = minState();
        const noPressure: EventDefinition = {
            id: 'old_event',
            trigger: { turn_min: 5 },
            effect: { kind: 'narrative', text: 'old' },
        };
        updateEventReadiness(state, [noPressure]);
        expect(state.military.event_readiness!['old_event']).toBeUndefined();
    });

    it('applies pressure modifiers when sub-conditions met', () => {
        const state = minState();
        const eventWithMod: EventDefinition = {
            ...testEvent,
            pressure: {
                base_rate: 1.0,
                threshold: 5,
                decay_rate: 0.3,
                modifiers: [
                    { condition: { type: 'supply_below', faction: 'RBiH', threshold: 40 }, rate_bonus: 0.5 }
                ],
            },
        };
        (state.military as any).general_supply_reserve = { RBiH: 30 };
        updateEventReadiness(state, [eventWithMod]);
        expect(state.military.event_readiness!['test_event']).toBe(1.5); // 1.0 + 0.5
    });
});
```

**Step 2: Run tests — verify they fail**

Run: `npm run test:vitest -- --reporter=verbose src/sim/events/__tests__/pressure_system.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement pressure system**

Create `src/sim/events/pressure_system.ts`:

```typescript
import type { GameState } from '../../state/game_state.js';
import type { EventDefinition } from './event_types.js';
import { evaluateCondition, triggerMatches } from './event_types.js';

/**
 * Update readiness counters for all pressure-enabled events.
 * Called once per turn BEFORE event evaluation.
 *
 * Events without a `pressure` config are skipped (old-style events).
 * Deterministic: sorted by event ID, pure state reads.
 */
export function updateEventReadiness(
    state: GameState,
    registry: EventDefinition[]
): void {
    if (!state.military.event_readiness) {
        state.military.event_readiness = {};
    }

    const readiness = state.military.event_readiness;

    for (const def of registry) {
        if (!def.pressure) continue;

        const { base_rate, decay_rate, modifiers } = def.pressure;

        // Check if the event's trigger conditions are met
        const conditionsMet = def.trigger.condition
            ? evaluateCondition(def.trigger.condition, state)
            : true;

        // Also check turn window if present
        const turn = state.meta?.turn ?? 0;
        const inWindow = (def.trigger.turn_min == null || turn >= def.trigger.turn_min)
            && (def.trigger.turn_max == null || turn <= def.trigger.turn_max);

        if (conditionsMet && inWindow) {
            // Conditions met: increment readiness
            let rate = base_rate;

            // Apply modifiers
            if (modifiers) {
                for (const mod of modifiers) {
                    if (evaluateCondition(mod.condition, state)) {
                        rate += mod.rate_bonus;
                    }
                }
            }

            readiness[def.id] = (readiness[def.id] ?? 0) + rate;
        } else {
            // Conditions not met: decay readiness
            if (readiness[def.id] != null && readiness[def.id] > 0) {
                readiness[def.id] = Math.max(0, readiness[def.id] - decay_rate);
            }
        }
    }
}

/**
 * Check if an event's readiness has reached its threshold.
 */
export function isEventReady(state: GameState, def: EventDefinition): boolean {
    if (!def.pressure) return false;
    const readiness = state.military.event_readiness?.[def.id] ?? 0;
    return readiness >= def.pressure.threshold;
}
```

**Step 4: Run tests — verify they pass**

Run: `npm run test:vitest -- --reporter=verbose src/sim/events/__tests__/pressure_system.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sim/events/pressure_system.ts src/sim/events/__tests__/pressure_system.test.ts
git commit -m "feat(events): pressure system — readiness counters with increment, decay, modifiers"
```

---

### Task 5: Strategic Dimensions — Unified Hybrid System

**Files:**
- Create: `src/sim/events/strategic_dimensions.ts`
- Create: `src/sim/events/__tests__/strategic_dimensions.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
    initializeStrategicDimensions,
    applyDimensionShift,
    getDimensionEffective,
    DIMENSION_IDS,
} from '../strategic_dimensions.js';

describe('strategic dimensions', () => {
    it('initializes all 6 dimensions for all 3 factions at 50/0/50', () => {
        const dims = initializeStrategicDimensions();
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            for (const dim of DIMENSION_IDS) {
                expect(dims[faction][dim].base_value).toBe(50);
                expect(dims[faction][dim].event_modifier).toBe(0);
                expect(dims[faction][dim].effective_value).toBe(50);
            }
        }
    });

    it('applies positive shift correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'military_credibility', 15);
        expect(dims['RS']['military_credibility'].event_modifier).toBe(15);
        expect(dims['RS']['military_credibility'].effective_value).toBe(65);
    });

    it('applies negative shift correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -20);
        expect(dims['RS']['international_standing'].event_modifier).toBe(-20);
        expect(dims['RS']['international_standing'].effective_value).toBe(30);
    });

    it('clamps effective_value to 0-100', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -80);
        expect(dims['RS']['international_standing'].effective_value).toBe(0);
        applyDimensionShift(dims, 'RBiH', 'international_standing', 80);
        expect(dims['RBiH']['international_standing'].effective_value).toBe(100);
    });

    it('accumulates multiple shifts', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -10);
        applyDimensionShift(dims, 'RS', 'international_standing', -5);
        expect(dims['RS']['international_standing'].event_modifier).toBe(-15);
        expect(dims['RS']['international_standing'].effective_value).toBe(35);
    });

    it('getDimensionEffective reads correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'HRHB', 'patron_confidence', 10);
        expect(getDimensionEffective(dims, 'HRHB', 'patron_confidence')).toBe(60);
    });
});
```

**Step 2: Run tests — verify they fail**

Run: `npm run test:vitest -- --reporter=verbose src/sim/events/__tests__/strategic_dimensions.test.ts`
Expected: FAIL

**Step 3: Implement**

Create `src/sim/events/strategic_dimensions.ts`:

```typescript
import type { DimensionId } from './event_types.js';

export const DIMENSION_IDS: DimensionId[] = [
    'military_credibility',
    'territorial_legitimacy',
    'international_standing',
    'patron_confidence',
    'internal_cohesion',
    'negotiating_leverage',
];

const CANONICAL_FACTIONS = ['RBiH', 'RS', 'HRHB'];

export interface DimensionStore {
    [faction: string]: {
        [dimension: string]: {
            base_value: number;
            event_modifier: number;
            effective_value: number;
        };
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function initializeStrategicDimensions(): DimensionStore {
    const store: DimensionStore = {};
    for (const faction of CANONICAL_FACTIONS) {
        store[faction] = {};
        for (const dim of DIMENSION_IDS) {
            store[faction][dim] = {
                base_value: 50,
                event_modifier: 0,
                effective_value: 50,
            };
        }
    }
    return store;
}

export function applyDimensionShift(
    store: DimensionStore,
    faction: string,
    dimension: string,
    delta: number
): void {
    if (!store[faction]?.[dimension]) return;
    const dim = store[faction][dimension];
    dim.event_modifier += delta;
    dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
}

export function getDimensionEffective(
    store: DimensionStore,
    faction: string,
    dimension: string
): number {
    return store[faction]?.[dimension]?.effective_value ?? 50;
}

export function updateBaseValue(
    store: DimensionStore,
    faction: string,
    dimension: string,
    newBase: number
): void {
    if (!store[faction]?.[dimension]) return;
    const dim = store[faction][dimension];
    dim.base_value = clamp(newBase, 0, 100);
    dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
}
```

**Step 4: Run tests — verify they pass**

Run: `npm run test:vitest -- --reporter=verbose src/sim/events/__tests__/strategic_dimensions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sim/events/strategic_dimensions.ts src/sim/events/__tests__/strategic_dimensions.test.ts
git commit -m "feat(events): strategic dimensions — hybrid base_value + event_modifier system"
```

---

### Task 6: Wire Broken Event Aggression Modifier

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts` (~line 964)
- Create: `src/sim/combat/__tests__/event_aggression_integration.test.ts`

**Step 1: Write test**

```typescript
import { describe, it, expect } from 'vitest';

describe('event aggression modifier integration', () => {
    it('active event aggression modifiers are summed into corps aggression', () => {
        // This is an integration-level test that verifies the wiring exists.
        // We check that the function getEventAggressionBonus exists and computes correctly.
        const { getEventAggressionBonus } = require('../bot_corps_directives.js');

        const mockState = {
            meta: { turn: 10 },
            military: {
                event_aggression_modifiers: [
                    { faction: 'RS', delta: 0.15, expires_turn: 15 },
                    { faction: 'RS', delta: 0.10, expires_turn: 8 }, // expired
                    { faction: 'RBiH', delta: 0.20, expires_turn: 15 }, // wrong faction
                ],
            },
        };

        const bonus = getEventAggressionBonus('RS', mockState);
        expect(bonus).toBeCloseTo(0.15); // only the non-expired RS modifier
    });
});
```

**Step 2: Implement in bot_corps_directives.ts**

Add a new exported helper function near the top of the file:

```typescript
/**
 * Sum active (non-expired) event aggression modifiers for a faction.
 */
export function getEventAggressionBonus(faction: FactionId, state: GameState): number {
    const mods = state.military.event_aggression_modifiers ?? [];
    const currentTurn = state.meta?.turn ?? 0;
    return mods
        .filter(m => m.faction === faction && m.expires_turn > currentTurn)
        .reduce((sum, m) => sum + m.delta, 0);
}
```

Then at ~line 964 where `aggressionModifier` is computed, add:

```typescript
const eventAggBonus = getEventAggressionBonus(faction, state);
let aggressionModifier = (doctrinePhase?.aggression_modifier ?? 0) + armyAggressionBonus + seasonalAdj + truceBreakBonus + eventAggBonus;
```

**Step 3: Run tests**

Run: `npm run test:vitest`
Expected: All pass including the new integration test

**Step 4: Commit**

```bash
git add src/sim/combat/bot_corps_directives.ts src/sim/combat/__tests__/event_aggression_integration.test.ts
git commit -m "fix(events): wire event_aggression_modifiers into bot corps directives — was broken stub"
```

---

### Task 7: Event Constraint Bus — Operation Blocks + Scope Restrictions

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts`
- Create: `src/sim/events/__tests__/event_constraints.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import { isOperationBlocked, getActiveDoctrineOverride, filterByScope } from '../event_constraints.js';

describe('event constraints', () => {
    it('isOperationBlocked returns true when active block exists', () => {
        const constraints = {
            operation_blocks: [
                { faction: 'RS', expires_turn: 15, reason: 'NATO ultimatum' },
            ],
        };
        expect(isOperationBlocked(constraints, 'RS', 10)).toBe(true);
    });

    it('isOperationBlocked returns false when block expired', () => {
        const constraints = {
            operation_blocks: [
                { faction: 'RS', expires_turn: 8, reason: 'NATO ultimatum' },
            ],
        };
        expect(isOperationBlocked(constraints, 'RS', 10)).toBe(false);
    });

    it('filterByScope removes blocked municipalities', () => {
        const constraints = {
            scope_restrictions: [
                { faction: 'RS', blocked_municipalities: ['srebrenica', 'zepa'], reason: 'Selective conquest' },
            ],
        };
        const targets = ['op:srebrenica:sreb_2', 'op:brcko:brcko_2', 'op:zepa:zepa_2'];
        const filtered = filterByScope(constraints, 'RS', targets);
        expect(filtered).toEqual(['op:brcko:brcko_2']);
    });

    it('filterByScope keeps only allowed municipalities when set', () => {
        const constraints = {
            scope_restrictions: [
                { faction: 'RS', allowed_municipalities: ['brcko', 'doboj'], reason: 'Corridor only' },
            ],
        };
        const targets = ['op:srebrenica:sreb_2', 'op:brcko:brcko_2', 'op:doboj:doboj_2'];
        const filtered = filterByScope(constraints, 'RS', targets);
        expect(filtered).toEqual(['op:brcko:brcko_2', 'op:doboj:doboj_2']);
    });
});
```

**Step 2: Create event_constraints.ts**

Create `src/sim/events/event_constraints.ts`:

```typescript
/**
 * Event constraint bus — checks event-imposed restrictions on military operations.
 * Read by bot AI before launching operations or selecting targets.
 */

export interface EventConstraints {
    operation_blocks?: Array<{ faction: string; expires_turn: number; reason: string }>;
    doctrine_overrides?: Array<{ faction: string; forced_stance: string; expires_turn: number; reason: string }>;
    scope_restrictions?: Array<{
        faction: string;
        allowed_municipalities?: string[];
        blocked_municipalities?: string[];
        expires_turn?: number;
        reason: string;
    }>;
}

export function isOperationBlocked(
    constraints: EventConstraints | undefined,
    faction: string,
    currentTurn: number
): boolean {
    if (!constraints?.operation_blocks) return false;
    return constraints.operation_blocks.some(
        b => b.faction === faction && b.expires_turn > currentTurn
    );
}

export function getActiveDoctrineOverride(
    constraints: EventConstraints | undefined,
    faction: string,
    currentTurn: number
): string | null {
    if (!constraints?.doctrine_overrides) return null;
    const active = constraints.doctrine_overrides.find(
        d => d.faction === faction && d.expires_turn > currentTurn
    );
    return active?.forced_stance ?? null;
}

export function filterByScope(
    constraints: EventConstraints | undefined,
    faction: string,
    targetOsids: string[]
): string[] {
    if (!constraints?.scope_restrictions) return targetOsids;

    const activeRestrictions = constraints.scope_restrictions.filter(
        r => r.faction === faction && (r.expires_turn == null || r.expires_turn > 0)
    );

    if (activeRestrictions.length === 0) return targetOsids;

    let filtered = targetOsids;

    for (const restriction of activeRestrictions) {
        if (restriction.allowed_municipalities) {
            filtered = filtered.filter(osid => {
                const mun = osid.split(':')[1];
                return restriction.allowed_municipalities!.includes(mun);
            });
        }
        if (restriction.blocked_municipalities) {
            filtered = filtered.filter(osid => {
                const mun = osid.split(':')[1];
                return !restriction.blocked_municipalities!.includes(mun);
            });
        }
    }

    return filtered;
}
```

**Step 3: Wire into bot_corps_directives.ts**

In `evaluateCorpsOffensiveLaunch` (~line 1351), add at the top of the function:

```typescript
// Check event constraints: operation blocks
if (isOperationBlocked(state.military.event_constraints, faction, state.meta?.turn ?? 0)) {
    return null;
}
```

In the target filtering section of `evaluateCorpsOffensiveLaunch`, add scope filtering:

```typescript
// Apply event scope restrictions
const scopedTargets = filterByScope(state.military.event_constraints, faction, corpsEnemyOsids);
```

Add imports at top of file:

```typescript
import { isOperationBlocked, filterByScope } from '../events/event_constraints.js';
```

**Step 4: Run all tests**

Run: `npx tsc --noEmit ; npm run test:vitest`
Expected: All pass

**Step 5: Commit**

```bash
git add src/sim/events/event_constraints.ts src/sim/events/__tests__/event_constraints.test.ts src/sim/combat/bot_corps_directives.ts
git commit -m "feat(events): event constraint bus — operation blocks + scope restrictions wired into bot AI"
```

---

### Task 8: TurnIncidents Collection

**Files:**
- Create: `src/sim/events/turn_incidents.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`

**Step 1: Create TurnIncidents type and collector**

Create `src/sim/events/turn_incidents.ts`:

```typescript
/**
 * Collects significant events that happened THIS turn.
 * Fed into event condition evaluation for incident-based triggers.
 */

export interface TurnIncidents {
    battles_fought: Array<{ osid: string; attacker_faction: string; defender_faction: string; outcome: string }>;
    osids_flipped: Array<{ osid: string; from_faction: string; to_faction: string }>;
    formations_dissolved: Array<{ formation_id: string; faction: string }>;
    operations_completed: Array<{ name: string; corps_id: string; faction: string; success: boolean }>;
    enclave_status_changes: Array<{ municipality: string; new_status: string }>;
}

export function createEmptyTurnIncidents(): TurnIncidents {
    return {
        battles_fought: [],
        osids_flipped: [],
        formations_dissolved: [],
        operations_completed: [],
        enclave_status_changes: [],
    };
}
```

**Step 2: Wire into war_phases pipeline context**

In `war_phases.ts`, import and pass `TurnIncidents` through context. Add to the context initialization (this will be refined when specific pipeline steps populate incidents — for now, create empty and pass through):

At the evaluate-events step (~line 217), pass incidents to evaluateEvents:

```typescript
// The TurnIncidents object is available on context.incidents
// For now, created empty — population happens in future tasks
```

**Step 3: Commit**

```bash
git add src/sim/events/turn_incidents.ts src/sim/turn_phases/war_phases.ts
git commit -m "feat(events): TurnIncidents collection infrastructure — empty for now, wired into pipeline"
```

---

### Task 9: Bot Decision Logic v1

**Files:**
- Create: `src/sim/events/bot_response.ts`
- Create: `src/sim/events/__tests__/bot_response.test.ts`
- Modify: `src/sim/events/evaluate_events.ts` (replace pickBotResponse)

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import { pickBotResponseV1 } from '../bot_response.js';
import type { EventResponseOption } from '../event_types.js';

const options: EventResponseOption[] = [
    { id: 'accept', label: 'Accept', effects: [], aggression_affinity: -0.5, risk_level: 0.2 },
    { id: 'reject', label: 'Reject', effects: [], aggression_affinity: 0.8, risk_level: 0.7 },
    { id: 'stall', label: 'Stall', effects: [], aggression_affinity: 0.0, risk_level: 0.4 },
];

describe('bot response v1 — personality weighted', () => {
    it('aggressive commander prefers high aggression_affinity options', () => {
        const result = pickBotResponseV1(options, 'personality_weighted', { aggressiveness: 5, competence: 3 });
        expect(result.id).toBe('reject'); // highest aggression_affinity
    });

    it('cautious commander prefers low risk options', () => {
        const result = pickBotResponseV1(options, 'personality_weighted', { aggressiveness: 1, competence: 5 });
        expect(result.id).toBe('accept'); // lowest risk
    });

    it('historical mode always picks first option', () => {
        const result = pickBotResponseV1(options, 'historical', { aggressiveness: 3, competence: 3 });
        expect(result.id).toBe('accept');
    });

    it('falls back to first option when no scoring hints', () => {
        const noHints: EventResponseOption[] = [
            { id: 'a', label: 'A', effects: [] },
            { id: 'b', label: 'B', effects: [] },
        ];
        const result = pickBotResponseV1(noHints, 'personality_weighted', { aggressiveness: 5, competence: 5 });
        expect(result.id).toBe('a');
    });
});
```

**Step 2: Implement**

Create `src/sim/events/bot_response.ts`:

```typescript
import type { EventResponseOption, EventDefinition } from './event_types.js';

interface CommanderProfile {
    aggressiveness: number;  // 1-5
    competence: number;      // 1-5
}

/**
 * Personality-weighted bot response selection.
 * Deterministic: same profile + same options = same choice.
 */
export function pickBotResponseV1(
    options: EventResponseOption[],
    logic: EventDefinition['bot_response_logic'],
    commander: CommanderProfile
): EventResponseOption {
    if (options.length === 0) throw new Error('No options to pick from');
    if (options.length === 1) return options[0];

    // Historical: always first option (the historical choice)
    if (logic === 'historical' || logic === 'accept_first') return options[0];

    // Reject all: always last option
    if (logic === 'reject_all') return options[options.length - 1];

    // Personality weighted
    if (logic === 'personality_weighted') {
        const aggrNorm = (commander.aggressiveness - 3) / 2; // [-1, 1]
        const compNorm = (commander.competence - 3) / 2;     // [-1, 1]

        let bestScore = -Infinity;
        let bestOption = options[0];

        for (const opt of options) {
            const aggrAffinity = opt.aggression_affinity ?? 0;
            const risk = opt.risk_level ?? 0.5;

            // Aggressive commanders like high aggression_affinity
            // Competent commanders avoid high risk (they see the danger)
            const score = aggrAffinity * aggrNorm * 2 + (1 - risk) * compNorm;

            if (score > bestScore) {
                bestScore = score;
                bestOption = opt;
            }
        }

        return bestOption;
    }

    // Default: first option
    return options[0];
}
```

**Step 3: Wire into evaluate_events.ts**

Replace the `pickBotResponse` function (lines 28–35) with an import:

```typescript
import { pickBotResponseV1 } from './bot_response.js';
```

And update the call site (~line 100) to pass commander profile. For now, use default moderate profile until officer lookup is wired:

```typescript
const botResponse = pickBotResponseV1(
    def.response_options!,
    def.bot_response_logic ?? 'historical',
    { aggressiveness: 3, competence: 3 } // TODO: read from faction army commander
);
```

**Step 4: Run all tests**

Run: `npx tsc --noEmit ; npm run test:vitest`
Expected: All pass

**Step 5: Commit**

```bash
git add src/sim/events/bot_response.ts src/sim/events/__tests__/bot_response.test.ts src/sim/events/evaluate_events.ts
git commit -m "feat(events): personality-weighted bot decision logic v1 — replaces placeholder pickBotResponse"
```

---

### Task 10: Recurrence Model

**Files:**
- Modify: `src/sim/events/evaluate_events.ts`
- Create: `src/sim/events/__tests__/recurrence.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import { canEventFire } from '../evaluate_events.js';

describe('event recurrence', () => {
    it('once:true event cannot fire twice', () => {
        expect(canEventFire(
            { once: true },
            { fired_event_ids: ['test_event'] },
            'test_event'
        )).toBe(false);
    });

    it('event with max_fires:3 can fire if count < 3', () => {
        expect(canEventFire(
            { recurrence: { max_fires: 3, cooldown_turns: 0, escalation: 'static' } },
            { event_fire_counts: { test_event: 2 } },
            'test_event'
        )).toBe(true);
    });

    it('event with max_fires:3 cannot fire if count >= 3', () => {
        expect(canEventFire(
            { recurrence: { max_fires: 3, cooldown_turns: 0, escalation: 'static' } },
            { event_fire_counts: { test_event: 3 } },
            'test_event'
        )).toBe(false);
    });

    it('cooldown prevents firing too soon', () => {
        expect(canEventFire(
            { recurrence: { max_fires: 5, cooldown_turns: 4, escalation: 'static' } },
            { event_fire_counts: { test_event: 1 }, event_last_fired_turn: { test_event: 8 } },
            'test_event',
            10 // current turn
        )).toBe(false); // 10 - 8 = 2 < 4 cooldown
    });

    it('cooldown allows firing after enough turns', () => {
        expect(canEventFire(
            { recurrence: { max_fires: 5, cooldown_turns: 4, escalation: 'static' } },
            { event_fire_counts: { test_event: 1 }, event_last_fired_turn: { test_event: 5 } },
            'test_event',
            10 // current turn
        )).toBe(true); // 10 - 5 = 5 >= 4 cooldown
    });
});
```

**Step 2: Implement canEventFire and integrate into evaluateEvents**

Add exported `canEventFire` function to `evaluate_events.ts` and update the main loop to check recurrence before firing.

**Step 3: Run all tests**

Run: `npx tsc --noEmit ; npm run test:vitest`
Expected: All pass

**Step 4: Commit**

```bash
git add src/sim/events/evaluate_events.ts src/sim/events/__tests__/recurrence.test.ts
git commit -m "feat(events): recurrence model — max_fires, cooldown, fire count tracking"
```

---

### Task 11: Event Queue with 3/turn Cap

**Files:**
- Modify: `src/sim/events/evaluate_events.ts`

**Step 1: Add queue cap logic**

In `evaluateEvents()`, after collecting all candidates that pass trigger checks, sort by priority and cap at 3. Queue overflow events by incrementing their readiness to ensure they fire next turn.

**Step 2: Write test**

Test that when 5 events trigger simultaneously, only 3 fire and the other 2 are queued.

**Step 3: Run all tests + typecheck**

**Step 4: Commit**

```bash
git commit -m "feat(events): event queue with 3/turn cap — overflow queued to next turn"
```

---

### Task 12: Integrate Pressure into Evaluation Pipeline

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts` (~line 217)
- Modify: `src/sim/events/evaluate_events.ts`

**Step 1: Add pressure update step before evaluate-events**

In `war_phases.ts`, add a new pipeline step immediately before `evaluate-events`:

```typescript
{
    name: 'update-event-readiness',
    run: (context) => {
        updateEventReadiness(context.state, context.input.eventDefinitions ?? []);
    }
},
```

**Step 2: Modify evaluateEvents to check pressure**

In `evaluateEvents()`, for events with `pressure` config, check `isEventReady()` instead of just `triggerMatches()`. Events without pressure config use the existing trigger logic (backward compatible).

**Step 3: Update event firing to record counts and turns**

When an event fires, update:
- `state.military.event_fire_counts[def.id] = (current + 1)`
- `state.military.event_last_fired_turn[def.id] = currentTurn`
- Apply `dimension_shifts` and `sets_flags` from the EventDefinition
- If `enables_events`, add them to `state.military.enabled_event_ids`

**Step 4: Run 40w scenario**

Run: `npm run sim:scenario:run:40w`
Expected: Same results as baseline (no events use pressure config yet)

**Step 5: Run full test suite**

Run: `npx tsc --noEmit ; npm run test:vitest`
Expected: All pass

**Step 6: Commit**

```bash
git commit -m "feat(events): integrate pressure system into evaluation pipeline — backward compatible"
```

---

### Task 13: Dead Code Removal

**Files:**
- Modify: `src/sim/events/event_types.ts` (remove dead condition handlers)
- Modify: `src/sim/events/apply_effects.ts` (remove narrative-only path if possible)

**Step 1: Remove dead `siege_active` and `operation_completed` condition handlers**

In `evaluateCondition()`, the `siege_active` and `operation_completed` cases use `as any` casts to read nonexistent state fields. Remove these cases (they're unreachable — no event uses them).

**Step 2: Run all tests**

Run: `npx tsc --noEmit ; npm run test:vitest`
Expected: All pass

**Step 3: Commit**

```bash
git commit -m "refactor(events): remove dead siege_active and operation_completed condition handlers"
```

---

## TRACK B: HQ Phase 3 — Player Actions (Tasks 14–16)

### Important Finding: Most IPC Already Exists

The research revealed that most HQ Phase 3 features are **already implemented**:

| Feature | Status | File | Notes |
|---------|--------|------|-------|
| Corps stance change | **DONE** | ArmyHQCorpsCard.tsx:149 | `ipc.stageCorpsStanceOrder` already wired |
| Commander assignment | **DONE** | CommanderSection.tsx:49 | `ipc.assignCommander` already wired |
| Officer dismissal | **DONE** | CommanderSection.tsx:58 | `ipc.dismissOfficer` already wired |
| Force launch operation | **DONE** | OperationsSection.tsx:214 | `ipc.stageOperationForceLaunch` already wired |
| Stand down operation | **DONE** | OperationsSection.tsx:220 | `ipc.stageOperationHalt` already wired |
| Sector stance change | **NOT DONE** | SectorsSection.tsx | No stance dropdown exists |
| Quick stance sweep | **NOT DONE** | ArmyHQModal.tsx | No army-level action exists |

Track B is much smaller than estimated. Only 2 features need implementation.

---

### Task 14: Sector Stance Dropdown in SectorsSection

**Files:**
- Modify: `src/ui/map/components/army_hq/SectorsSection.tsx`

**Step 1: Add sector stance dropdown**

In `SectorsSection.tsx`, for each sector in the expanded detail, add a stance dropdown similar to the corps stance dropdown in `ArmyHQCorpsCard.tsx`. The IPC call pattern is:

```typescript
// Sector stances use the same staging pattern
await ipc.stageSectorStanceOrder(sectorId, newStance);
```

Check if `stageSectorStanceOrder` exists in `useIPC.ts`. If not, check for the equivalent IPC channel name and wire it.

**Step 2: Verify stance is displayed and changeable**

Run: `npm run desktop` — open Army HQ → expand a corps → expand Sectors section → verify stance dropdown appears and changes persist.

**Step 3: Commit**

```bash
git commit -m "feat(ui): sector stance dropdown in Army HQ SectorsSection"
```

---

### Task 15: Quick Stance Sweep — Army-Level Action

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`

**Step 1: Add "Set All Corps" dropdown**

Add a dropdown at the top of ArmyHQModal (near the Strategic Situation area) that sets ALL corps to a single stance. Implementation:

```typescript
async function handleQuickStanceSweep(stance: CorpsStance) {
    for (const corps of playerCorps) {
        await ipc.stageCorpsStanceOrder(corps.id, stance);
    }
}
```

Render as a small dropdown button labeled "Emergency Posture" with options: Defensive / Balanced / Offensive / Reorganize.

**Step 2: Verify**

Run: `npm run desktop` — open HQ → click Emergency Posture → select Defensive → verify all corps cards update.

**Step 3: Commit**

```bash
git commit -m "feat(ui): emergency posture sweep — set all corps stance from Army HQ"
```

---

### Task 16: Track B Smoke Test

**Step 1: Run smoke-test triad**

Run: `npx tsc --noEmit ; npm run test:vitest ; npm run desktop:map:build`
Expected: All pass

**Step 2: Run desktop and verify HQ**

Run: `npm run desktop` — verify all 7 player actions work from HQ:
1. Corps stance change (existing)
2. Commander assignment (existing)
3. Officer dismissal (existing)
4. Force launch operation (existing)
5. Stand down operation (existing)
6. Sector stance change (Task 14)
7. Emergency posture sweep (Task 15)

**Step 3: Commit if any remaining fixes**

---

## Final Verification (Task 17)

**Step 1: Full smoke-test triad**

Run: `npx tsc --noEmit ; npm run test:vitest ; npm run desktop:map:build`
Expected: All pass

**Step 2: Run 40w scenario**

Run: `npm run sim:scenario:run:40w`
Expected: Same results as baseline (no events use new infrastructure yet — all backward compatible)

**Step 3: Verify test count**

Run: `npm run test:vitest` and verify test count increased (new tests from Tasks 3-6, 9-10).

**Step 4: Update napkin**

Update `.claude/napkin.md` §Current State to reflect v0.6.0-alpha infrastructure complete.

**Step 5: Update ledger**

Append to `docs/PROJECT_LEDGER.md` documenting v0.6.0-alpha infrastructure delivery.

**Step 6: Final commit**

```bash
git commit -m "docs: v0.6.0-alpha complete — event infrastructure + HQ Phase 3 player actions"
```

---

## Task Summary

| # | Track | Task | Est. Complexity |
|---|-------|------|----------------|
| 1 | A | Extend EventDefinition types | Small |
| 2 | A | Add event state fields to GameState | Small |
| 3 | A | Expand condition evaluator (15 types) | Medium |
| 4 | A | Pressure system | Medium |
| 5 | A | Strategic dimensions | Medium |
| 6 | A | Wire broken aggression modifier | Small |
| 7 | A | Event constraint bus | Medium |
| 8 | A | TurnIncidents collection | Small |
| 9 | A | Bot decision logic v1 | Medium |
| 10 | A | Recurrence model | Small |
| 11 | A | Event queue 3/turn cap | Small |
| 12 | A | Integrate pressure into pipeline | Medium |
| 13 | A | Dead code removal | Small |
| 14 | B | Sector stance dropdown | Small |
| 15 | B | Emergency posture sweep | Small |
| 16 | B | Track B smoke test | Small |
| 17 | — | Final verification | Small |

**Total: 17 tasks. Track A: 13 tasks (engine). Track B: 3 tasks (UI). Final: 1 task.**

**Dependencies:** Tasks 1-2 must be first (types + state). Tasks 3-13 can be done in any order after 1-2 but the listed order is recommended. Track B (14-16) is independent of Track A and can run in parallel.
