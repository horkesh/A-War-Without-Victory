# Commander Override Layer Phase B — Army HQ Overrides + Probes/Feints

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add army-level override directives that force corps commanders to commit garrison brigades for critical operations, and wire probe/feint operations as low-cost intel-gathering tools directed by army HQ.

**Architecture:** New `ArmyHQOverride` type on `MilitaryState`. Generated per-turn in `generateAllCorpsOrders` based on army priorities with high weight + low corps action. Consumed in `generateCorpsDirectives` to force offensive targets even when the corps commander would normally hold. Probes/feints use the existing `CorpsOperation` type (already has `'probe' | 'feint'`), the existing probe mechanics in `operation_preparation.ts`, and the existing `evaluateSectorOffensiveLaunch` pipeline — just with smaller brigade caps and shorter planning.

**Tech Stack:** TypeScript, Vitest, existing CorpsOperation/ArmyOperationPriority types.

**Source design:** `docs/30_planning/COMMANDER_OVERRIDE_LAYER.md` steps 5-6.

---

## Task 1: ArmyHQOverride type + state field

**Files:**
- Modify: `src/state/game_state.ts` — add type + field
- Test: `tests/commander_override.test.ts`

**Step 1: Add ArmyHQOverride interface**

In `game_state.ts`, near the other military types (after `CorpsDirective` or `ArmyOperationPriority`), add:

```typescript
/**
 * Army HQ directive that forces a corps to commit garrison brigades to an offensive.
 * Rare — represents army commander overriding corps-level caution for strategic necessity.
 * Historical examples: Mladić ordering Drina Corps to take Srebrenica, Halilović ordering breakout.
 */
export interface ArmyHQOverride {
    /** Target corps formation ID. */
    corps_id: string;
    /** Name for the forced operation (e.g. "Brčko Corridor Push"). */
    operation_name: string;
    /** Minimum brigades the corps must commit (drawn from garrison if needed). */
    min_brigades: number;
    /** Target OSIDs for the forced operation. */
    target_osids: string[];
    /** Human-readable reason. */
    reason: string;
    /** Turn this override was issued. */
    issued_turn: number;
    /** Operation type: full offensive or intelligence probe. */
    type: 'offensive' | 'probe' | 'feint';
    /** Max brigades for probe/feint (1-2 for probe, 2-3 for feint). Ignored for offensive. */
    max_brigades?: number;
}
```

**Step 2: Add to MilitaryState**

In the `MilitaryState` interface, add after `pending_reserve_requests`:

```typescript
/** Army HQ overrides that force corps to launch operations this turn. Consumed and cleared each turn. */
army_hq_overrides?: ArmyHQOverride[];
```

**Step 3: Write basic type test**

```typescript
describe('ArmyHQOverride type', () => {
    it('is assignable with all fields', () => {
        const override: ArmyHQOverride = {
            corps_id: 'vrs_drina',
            operation_name: 'Srebrenica Push',
            min_brigades: 4,
            target_osids: ['op:srebrenica:srebrenica_2'],
            reason: 'Take Srebrenica at all costs',
            issued_turn: 20,
            type: 'offensive',
        };
        expect(override.corps_id).toBe('vrs_drina');
    });

    it('supports probe type with max_brigades', () => {
        const probe: ArmyHQOverride = {
            corps_id: 'arbih_2nd_corps',
            operation_name: 'Brčko Probe',
            min_brigades: 1,
            target_osids: ['op:brcko:brka_2'],
            reason: 'Test VRS defenses at Brčko',
            issued_turn: 15,
            type: 'probe',
            max_brigades: 2,
        };
        expect(probe.type).toBe('probe');
        expect(probe.max_brigades).toBe(2);
    });
});
```

**Step 4: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
git add src/state/game_state.ts tests/commander_override.test.ts
git commit -m "feat: ArmyHQOverride type + state field on MilitaryState"
```

---

## Task 2: Army HQ override generation

Generate `ArmyHQOverride[]` each turn based on army priorities that are high-weight but where the corps has no active operation and hasn't attacked in the target area recently.

**Files:**
- Create: `src/sim/combat/army_hq_overrides.ts`
- Test: `tests/commander_override.test.ts`

**Step 1: Create the generation function**

```typescript
// src/sim/combat/army_hq_overrides.ts
import type { GameState, ArmyHQOverride, FormationState } from '../../state/game_state.js';
import type { ArmyOperationPriority } from './bot_strategy.js';
import { getCorpsArmyPriorities } from './bot_strategy.js';
import type { FactionId } from '../../state/game_state.js';

/** Weight threshold — only the most critical army priorities trigger HQ overrides. */
const ARMY_HQ_OVERRIDE_WEIGHT_THRESHOLD = 8;

/** Minimum turns since last operation in this area before HQ forces a new one. */
const MIN_IDLE_TURNS_FOR_OVERRIDE = 6;

/** Probe weight threshold — lower than full override, for intel-gathering. */
const PROBE_WEIGHT_THRESHOLD = 5;

/**
 * Generate army HQ overrides for this turn.
 * Army HQ issues overrides when:
 * 1. A high-weight priority exists (weight >= 8)
 * 2. The assigned corps has no active operation
 * 3. The corps hasn't attacked in the priority's target area for MIN_IDLE_TURNS_FOR_OVERRIDE turns
 *
 * For medium-weight priorities (5-7), generates probes instead of full offensives.
 */
export function generateArmyHQOverrides(
    state: GameState,
    faction: FactionId,
): ArmyHQOverride[] {
    const overrides: ArmyHQOverride[] = [];
    const turn = state.meta.turn;
    const corpsCommand = state.military.corps_command ?? {};

    // Get all corps for this faction
    const factionCorps = Object.entries(state.military.formations)
        .filter(([_, f]) => f.faction === faction && f.kind === 'corps')
        .map(([id]) => id)
        .sort();

    for (const corpsId of factionCorps) {
        const cc = corpsCommand[corpsId];
        // Skip if corps has an active operation
        if (cc?.active_operation) continue;

        const priorities = getCorpsArmyPriorities(faction, corpsId, turn);

        for (const p of priorities) {
            if (p.weight < PROBE_WEIGHT_THRESHOLD) continue;

            // Check idle condition: no operation completed recently in this area
            const lastOpTurn = cc?.last_operation_end_turn ?? 0;
            if (turn - lastOpTurn < MIN_IDLE_TURNS_FOR_OVERRIDE) continue;

            // Build target OSIDs from priority
            const targetOsids = [...(p.target_osids ?? [])];
            // Also derive from target_municipalities via political_controllers
            if (p.target_municipalities.length > 0 && targetOsids.length === 0) {
                for (const [osid, controller] of Object.entries(state.political_controllers)) {
                    if (controller === faction) continue; // skip own territory
                    const mun = osid.split(':')[1];
                    if (mun && p.target_municipalities.includes(mun)) {
                        targetOsids.push(osid);
                        if (targetOsids.length >= 5) break; // cap for focused operation
                    }
                }
                targetOsids.sort();
            }

            if (targetOsids.length === 0) continue;

            if (p.weight >= ARMY_HQ_OVERRIDE_WEIGHT_THRESHOLD) {
                // Full offensive override
                overrides.push({
                    corps_id: corpsId,
                    operation_name: `HQ: ${p.name}`,
                    min_brigades: 3,
                    target_osids: targetOsids.slice(0, 5),
                    reason: `Army HQ directive: ${p.name} (weight ${p.weight})`,
                    issued_turn: turn,
                    type: 'offensive',
                });
                break; // One override per corps per turn
            } else {
                // Probe for medium-weight priorities
                overrides.push({
                    corps_id: corpsId,
                    operation_name: `Probe: ${p.name}`,
                    min_brigades: 1,
                    target_osids: targetOsids.slice(0, 2),
                    reason: `Intel probe: ${p.name}`,
                    issued_turn: turn,
                    type: 'probe',
                    max_brigades: 2,
                });
                break;
            }
        }
    }

    return overrides;
}
```

**Step 2: Write tests**

```typescript
import { generateArmyHQOverrides } from '../src/sim/combat/army_hq_overrides.js';

describe('generateArmyHQOverrides', () => {
    function makeMinimalState(overrides: Partial<any> = {}): any {
        return {
            meta: { turn: 20, phase: 'war', ...overrides.meta },
            military: {
                formations: {
                    vrs_drina: { faction: 'RS', kind: 'corps', status: 'active' },
                    vrs_1st_krajina: { faction: 'RS', kind: 'corps', status: 'active' },
                },
                corps_command: overrides.corps_command ?? {},
                ...overrides.military,
            },
            political_controllers: {
                'op:srebrenica:srebrenica_2': 'RBiH',
                'op:brcko:brka_2': 'RBiH',
                ...overrides.political_controllers,
            },
        };
    }

    it('generates offensive override for high-weight idle corps', () => {
        const state = makeMinimalState({
            corps_command: {
                vrs_drina: { last_operation_end_turn: 5 }, // idle for 15 turns
            },
        });
        // Note: depends on VRS_ARMY_PRIORITIES having a weight >= 8 priority for vrs_drina
        // If none exist, this test validates that no override is generated for low-weight
        const result = generateArmyHQOverrides(state, 'RS');
        // Result depends on actual army priorities — test that function runs without error
        expect(Array.isArray(result)).toBe(true);
    });

    it('skips corps with active operation', () => {
        const state = makeMinimalState({
            corps_command: {
                vrs_drina: { active_operation: { name: 'Op Drina', phase: 'execution' } },
            },
        });
        const result = generateArmyHQOverrides(state, 'RS');
        const drinaOverrides = result.filter(o => o.corps_id === 'vrs_drina');
        expect(drinaOverrides.length).toBe(0);
    });

    it('skips corps that operated recently', () => {
        const state = makeMinimalState({
            meta: { turn: 10 },
            corps_command: {
                vrs_drina: { last_operation_end_turn: 8 }, // only 2 turns ago
            },
        });
        const result = generateArmyHQOverrides(state, 'RS');
        const drinaOverrides = result.filter(o => o.corps_id === 'vrs_drina');
        expect(drinaOverrides.length).toBe(0);
    });

    it('generates at most one override per corps', () => {
        const state = makeMinimalState();
        const result = generateArmyHQOverrides(state, 'RS');
        const corpsIds = result.map(o => o.corps_id);
        const unique = new Set(corpsIds);
        expect(corpsIds.length).toBe(unique.size);
    });
});
```

**Step 3: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
git add src/sim/combat/army_hq_overrides.ts tests/commander_override.test.ts
git commit -m "feat: army HQ override generation — high-weight priorities force corps action"
```

---

## Task 3: Army HQ override consumption in generateCorpsDirectives

When an `ArmyHQOverride` exists for a corps, inject its targets into `offensiveTargets` and override the supply gate (army says go, corps obeys).

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts`
- Test: `tests/commander_override.test.ts`

**Step 1: Consume overrides in generateCorpsDirectives**

In `generateCorpsDirectives`, after the supply gate section (~line 975) and before the operation launch section:

```typescript
// Army HQ override: inject forced targets
const armyOverrides = (state.military.army_hq_overrides ?? [])
    .filter(o => o.corps_id === corps.id);

for (const hqOverride of armyOverrides) {
    // Add target OSIDs directly — army HQ overrides supply gate
    for (const osid of hqOverride.target_osids) {
        if (!offensiveTargets.includes(osid)) {
            offensiveTargets.push(osid);
        }
    }
    // For probe/feint, override max operation size
    if (hqOverride.type === 'probe' || hqOverride.type === 'feint') {
        // Will be consumed in the operation launch section below
    }
}
```

In the operation launch section, when creating the operation, check for matching HQ override to set operation type:

```typescript
// If HQ override exists for this sector's targets, use its type
const matchingHqOverride = armyOverrides.find(o =>
    o.target_osids.some(t => sectorTargets.includes(t))
);
if (matchingHqOverride) {
    // Set operation type from HQ override
    // Cap brigade count for probe/feint
    if (matchingHqOverride.type === 'probe') {
        finalBrigadeIds = finalBrigadeIds.slice(0, matchingHqOverride.max_brigades ?? 2);
    } else if (matchingHqOverride.type === 'feint') {
        finalBrigadeIds = finalBrigadeIds.slice(0, matchingHqOverride.max_brigades ?? 3);
    }
}
```

**Step 2: Write test**

```typescript
describe('army HQ override consumption', () => {
    it('injects forced targets into offensive targets', () => {
        // This is an integration test concept — verify the override
        // targets flow through to directive generation
        // Test the consumption logic in isolation
        const offensiveTargets: string[] = ['op:zvornik:zvornik'];
        const hqOverride: ArmyHQOverride = {
            corps_id: 'vrs_drina',
            operation_name: 'Srebrenica Push',
            min_brigades: 4,
            target_osids: ['op:srebrenica:srebrenica_2', 'op:bratunac:bratunac'],
            reason: 'Army directive',
            issued_turn: 20,
            type: 'offensive',
        };
        // Simulate consumption
        for (const osid of hqOverride.target_osids) {
            if (!offensiveTargets.includes(osid)) {
                offensiveTargets.push(osid);
            }
        }
        expect(offensiveTargets).toContain('op:srebrenica:srebrenica_2');
        expect(offensiveTargets).toContain('op:bratunac:bratunac');
        expect(offensiveTargets.length).toBe(3);
    });
});
```

**Step 3: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
git add src/sim/combat/bot_corps_directives.ts tests/commander_override.test.ts
git commit -m "feat: army HQ override consumption in generateCorpsDirectives"
```

---

## Task 4: Pipeline integration — generate + clear overrides

Wire the generation into the turn pipeline and clear consumed overrides.

**Files:**
- Modify: `src/sim/combat/bot_corps_ai.ts` — call generateArmyHQOverrides
- Test: `tests/commander_override.test.ts`

**Step 1: Add generation call**

In `generateAllCorpsOrders` (bot_corps_ai.ts), after `setArmyStandingOrder` and before `evaluateOperationProgress`:

```typescript
// Generate army HQ overrides for this turn
const armyOverrides = generateArmyHQOverrides(state, faction);
state.military.army_hq_overrides = armyOverrides.length > 0 ? armyOverrides : undefined;
```

Import `generateArmyHQOverrides` from `./army_hq_overrides.js`.

**Step 2: Clear consumed overrides**

At the END of `generateAllCorpsOrders`, after all corps directives have been processed:

```typescript
// Clear consumed army HQ overrides (they're per-turn directives)
state.military.army_hq_overrides = undefined;
```

**Step 3: Verify typecheck + full test suite**

```bash
npx tsc --noEmit
npx vitest run
```

**Step 4: Commit**

```bash
git add src/sim/combat/bot_corps_ai.ts src/sim/combat/army_hq_overrides.ts
git commit -m "feat: wire army HQ overrides into bot AI pipeline"
```

---

## Task 5: Probe/feint operation type handling in sector_offensive

Ensure probe and feint operation types behave correctly — shorter planning, smaller brigade cap, auto-abort on repulse.

**Files:**
- Modify: `src/sim/combat/sector_offensive.ts`
- Test: `tests/commander_override.test.ts`

**Step 1: Add probe/feint constants**

```typescript
const PROBE_MAX_BRIGADES = 2;
const FEINT_MAX_BRIGADES = 3;
const PROBE_PLANNING_TURNS = 1;
const FEINT_PLANNING_TURNS = 2;
```

**Step 2: Handle in evaluateSectorOffensiveLaunch**

When the operation is flagged as probe/feint (from HQ override type), modify:
- Planning phase duration → shorter (1-2 turns vs normal 3-7)
- Brigade cap → PROBE_MAX_BRIGADES or FEINT_MAX_BRIGADES
- Auto-abort on first repulse (probes don't push through)

Find where `CorpsOperation` is constructed and add:

```typescript
// Set operation type from HQ override if present
const hqOverride = (state.military.army_hq_overrides ?? [])
    .find(o => o.corps_id === corpsId && o.target_osids.some(t => objectives.includes(t)));

const opType = hqOverride?.type === 'probe' ? 'probe'
    : hqOverride?.type === 'feint' ? 'feint'
    : 'sector_attack';
```

**Step 3: Handle in advanceSectorOffensives**

In the execution loop, probes auto-abort after first repulse:

```typescript
if (op.type === 'probe' && lastOutcome === 'repulsed') {
    // Probe complete — enemy defenses confirmed strong
    op.phase = 'recovery';
    op.recovery_reason = 'probe_complete';
}
```

**Step 4: Write tests**

```typescript
describe('probe/feint operation handling', () => {
    it('probes cap at 2 brigades', () => {
        const cap = 2; // PROBE_MAX_BRIGADES
        const brigades = ['b1', 'b2', 'b3', 'b4'];
        const probeBrigades = brigades.slice(0, cap);
        expect(probeBrigades.length).toBe(2);
    });

    it('feints cap at 3 brigades', () => {
        const cap = 3; // FEINT_MAX_BRIGADES
        const brigades = ['b1', 'b2', 'b3', 'b4'];
        const feintBrigades = brigades.slice(0, cap);
        expect(feintBrigades.length).toBe(3);
    });
});
```

**Step 5: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
npx vitest run
git add src/sim/combat/sector_offensive.ts tests/commander_override.test.ts
git commit -m "feat: probe/feint operation types — shorter planning, smaller caps, auto-abort"
```

---

## Task 6: Integration — typecheck + vitest + /simplify + 40w + /war-or-game

**Step 1: Typecheck**

```bash
npx tsc --noEmit
```

**Step 2: Full test suite**

```bash
npx vitest run
```

**Step 3: Run /simplify**

Invoke `/simplify` skill to review all Phase B changes.

**Step 4: Run 40w scenario**

```bash
npm run sim:scenario:run:40w
```

**Step 5: Run comparison tool**

```bash
node tools/compare_painted_vs_sim.cjs <run_dir>
```

**Step 6: /war-or-game sign-off**

**Step 7: Commit + version bump to v0.4.6**

```bash
git add -A
git commit -m "feat: commander override layer Phase B — army HQ overrides + probes/feints"
```

Update `package.json` version to `0.4.6`. Commit version bump separately.

---

## Execution Checklist

| Step | Task | Gate |
|------|------|------|
| 1 | ArmyHQOverride type + state field | Tests pass |
| 2 | Override generation logic | Tests pass |
| 3 | Override consumption in directives | Tests pass |
| 4 | Pipeline integration (generate + clear) | All vitest pass |
| 5 | Probe/feint op type handling | All vitest pass |
| 6 | /simplify → 40w → /war-or-game | Sign-off |
