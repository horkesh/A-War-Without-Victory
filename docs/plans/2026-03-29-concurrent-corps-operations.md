# Concurrent Corps Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow corps to run multiple simultaneous operations based on brigade count, replacing the current 1-op-per-corps limit.

**Architecture:** Change `CorpsCommandState.active_operation` (single nullable object) to `active_operations: CorpsOperation[]` with a slot cap of `Math.max(1, Math.floor(activeBrigades / 12))`. Pre-planned queued ops consume slot 0 sequentially; bot AI may launch sector offensives in additional slots. Three helper functions (`hasAvailableSlot`, `findBrigadeOperation`, `getMaxOperationSlots`) centralize the migration and minimize churn across ~42 call sites in ~28 files.

**Tech Stack:** TypeScript, Vitest, deterministic simulation (no Math.random)

**Expert Design Decisions (approved by Ops Expert + Gap Finder):**
- Brigade partitioning: strict exclusive assignment. No brigade in two ops.
- Queue: remains FIFO into slot 0. Bot AI uses slot 1+. Bot secondary ops limited to `probe` or `sector_attack`.
- Exhaustion: single corps pool, both ops contribute additively. Decay = ACTIVE if any op running, IDLE if all empty.
- Freed brigades: available to NEW ops only, no auto-inject into running ops.
- Emergency defense: bypasses slot limit (special overflow slot, max 1).
- Objective overlap: forbidden at injection time (cross-op validation).
- `last_completed_operation`: tracks most recent completion (no array needed).

**Blast Radius:** 122 references across 28 files. 15 trivial guard checks, 52 medium field reads, 15 hard writes, 25 chained conditionals, ~12 test files.

---

## Phase 1: Foundation (Type + Helpers)

### Task 1: Schema Change + Helper Functions

**Files:**
- Modify: `src/state/game_state.ts` (~line 450)
- Create: `src/sim/combat/corps_operation_helpers.ts`
- Create: `tests/corps_operation_helpers.test.ts`

**Step 1: Write failing tests for helpers**

```typescript
// tests/corps_operation_helpers.test.ts
import { describe, it, expect } from 'vitest';
import {
    getMaxOperationSlots,
    hasAvailableSlot,
    findBrigadeOperation,
    getAvailableBrigades,
} from '../src/sim/combat/corps_operation_helpers.js';

describe('getMaxOperationSlots', () => {
    it('returns 1 for small corps (8 brigades)', () => {
        expect(getMaxOperationSlots(8)).toBe(1);
    });
    it('returns 1 for 11 brigades', () => {
        expect(getMaxOperationSlots(11)).toBe(1);
    });
    it('returns 2 for 12+ brigades', () => {
        expect(getMaxOperationSlots(12)).toBe(2); // special: 12 rounds to 1 with floor, need to check
    });
    it('returns 2 for 24 brigades', () => {
        expect(getMaxOperationSlots(24)).toBe(2);
    });
    it('returns 3 for 36 brigades', () => {
        expect(getMaxOperationSlots(36)).toBe(3);
    });
    it('returns 1 minimum even for 0 brigades', () => {
        expect(getMaxOperationSlots(0)).toBe(1);
    });
});

describe('hasAvailableSlot', () => {
    it('returns true when no ops active', () => {
        const cmd = { active_operations: [] } as any;
        expect(hasAvailableSlot(cmd, 10)).toBe(true);
    });
    it('returns false when all slots full', () => {
        const cmd = { active_operations: [{}] } as any;
        expect(hasAvailableSlot(cmd, 8)).toBe(false); // 8 brigades = 1 slot
    });
    it('returns true when 1 of 2 slots used', () => {
        const cmd = { active_operations: [{}] } as any;
        expect(hasAvailableSlot(cmd, 24)).toBe(true); // 24 brigades = 2 slots
    });
});

describe('findBrigadeOperation', () => {
    it('returns null when no ops', () => {
        const cmd = { active_operations: [] } as any;
        expect(findBrigadeOperation(cmd, 'brig1')).toBeNull();
    });
    it('finds the op containing the brigade', () => {
        const op1 = { name: 'Op A', participating_brigades: ['brig1', 'brig2'] };
        const op2 = { name: 'Op B', participating_brigades: ['brig3'] };
        const cmd = { active_operations: [op1, op2] } as any;
        expect(findBrigadeOperation(cmd, 'brig3')?.name).toBe('Op B');
    });
    it('returns null when brigade not in any op', () => {
        const op1 = { name: 'Op A', participating_brigades: ['brig1'] };
        const cmd = { active_operations: [op1] } as any;
        expect(findBrigadeOperation(cmd, 'brig99')).toBeNull();
    });
});

describe('getAvailableBrigades', () => {
    it('excludes brigades in active ops', () => {
        const op = { participating_brigades: ['b1', 'b2'] };
        const cmd = { active_operations: [op] } as any;
        const all = ['b1', 'b2', 'b3', 'b4'];
        expect(getAvailableBrigades(cmd, all)).toEqual(['b3', 'b4']);
    });
    it('returns all when no ops', () => {
        const cmd = { active_operations: [] } as any;
        expect(getAvailableBrigades(cmd, ['b1', 'b2'])).toEqual(['b1', 'b2']);
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/corps_operation_helpers.test.ts`
Expected: FAIL — module not found

**Step 3: Change the type in game_state.ts**

In `src/state/game_state.ts`, find `CorpsCommandState` interface (~line 450). Change:
```typescript
// OLD:
active_operation?: CorpsOperation | null;

// NEW:
active_operations: CorpsOperation[];
```

Keep `last_completed_operation` as-is (singular, most recent).

**Step 4: Implement helper functions**

```typescript
// src/sim/combat/corps_operation_helpers.ts
import type { CorpsCommandState, CorpsOperation } from '../../state/game_state.js';

/** Max concurrent operation slots for a corps based on brigade count */
export function getMaxOperationSlots(activeBrigadeCount: number): number {
    return Math.max(1, Math.floor(activeBrigadeCount / 12));
}

/** Whether the corps has a free operation slot */
export function hasAvailableSlot(cmd: CorpsCommandState, activeBrigadeCount: number): boolean {
    return cmd.active_operations.length < getMaxOperationSlots(activeBrigadeCount);
}

/** Find which operation (if any) a brigade participates in */
export function findBrigadeOperation(cmd: CorpsCommandState, brigadeId: string): CorpsOperation | null {
    for (const op of cmd.active_operations) {
        if (op.participating_brigades.includes(brigadeId)) return op;
    }
    return null;
}

/** Get brigade IDs not committed to any active operation */
export function getAvailableBrigades(cmd: CorpsCommandState, allCorpsBrigadeIds: string[]): string[] {
    const busy = new Set<string>();
    for (const op of cmd.active_operations) {
        for (const bid of op.participating_brigades) busy.add(bid);
    }
    return allCorpsBrigadeIds.filter(bid => !busy.has(bid));
}

/** Whether the corps has ANY active operation (replaces `if (cmd.active_operation)`) */
export function hasActiveOperation(cmd: CorpsCommandState): boolean {
    return cmd.active_operations.length > 0;
}

/** Get the primary (first/oldest) active operation, or null */
export function getPrimaryOperation(cmd: CorpsCommandState): CorpsOperation | null {
    return cmd.active_operations[0] ?? null;
}

/** Remove a specific operation from the active list by reference or name */
export function removeOperation(cmd: CorpsCommandState, op: CorpsOperation): void {
    const idx = cmd.active_operations.indexOf(op);
    if (idx >= 0) cmd.active_operations.splice(idx, 1);
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/corps_operation_helpers.test.ts`
Expected: PASS

**Step 6: Run tsc**

Run: `npx tsc --noEmit`
Expected: ~42 type errors (all sites that reference the old `active_operation` field). This is expected — we'll fix them in subsequent tasks.

**Step 7: Commit**

```bash
git add src/state/game_state.ts src/sim/combat/corps_operation_helpers.ts tests/corps_operation_helpers.test.ts
git commit -m "feat(ops): change active_operation to active_operations array + helper functions"
```

---

### Task 2: Add Compatibility Shim + Fix Initialization

The type change creates ~42 compilation errors. Before migrating each site individually, add a temporary backward-compatible accessor to reduce the blast radius, then fix initialization.

**Files:**
- Modify: `src/sim/combat/corps_command.ts` (~line 160, 219, 253, 268)
- Modify: `src/state/game_state.ts` (if CorpsCommandState needs default)

**Step 1: Fix corps_command.ts initialization**

Every place that sets `active_operation: null` must become `active_operations: []`.

Search `corps_command.ts` for `active_operation` — there should be ~4 sites:
- Line ~160: initial state creation → `active_operations: []`
- Line ~219-220: phase transitions → use `removeOperation()` or `cmd.active_operations = []`
- Line ~253-254: similar
- Line ~268: clear → `cmd.active_operations = []`

**Step 2: Run tsc to verify corps_command errors are fixed**

The remaining errors are in other files. Count them.

**Step 3: Commit**

```bash
git add src/sim/combat/corps_command.ts
git commit -m "fix(ops): update corps_command.ts initialization for active_operations array"
```

---

## Phase 2: Migration — Trivial Guard Checks (15 sites)

### Task 3: Migrate Guard Checks

These are all `if (cmd.active_operation)` → `if (hasActiveOperation(cmd))` or `if (cmd.active_operations.length > 0)`.

**Files to modify (11 files, 15 sites):**

| File | Line | Old | New |
|------|------|-----|-----|
| `bot_corps_operations.ts` | 122 | `if (cmd.active_operation) continue` | `if (!hasAvailableSlot(cmd, corpsBrigadeCount)) continue` |
| `bot_corps_operations.ts` | 214 | `if (!cmd?.active_operation) continue` | `if (!hasActiveOperation(cmd)) continue` |
| `bot_corps_operations.ts` | 311 | `if (!cmd?.active_operation) continue` | `if (!hasActiveOperation(cmd)) continue` |
| `bot_corps_operations.ts` | 385 | `if (cmd.active_operation) continue` | `if (!hasAvailableSlot(cmd, corpsBrigadeCount)) continue` |
| `pre_planned_operations.ts` | 783 | `if (cmd.active_operation) continue` | `if (hasActiveOperation(cmd)) continue` (queued ops still go to slot 0 only) |
| `pre_planned_operations.ts` | 847 | `if (cmd.active_operation) return false` | `if (hasActiveOperation(cmd)) return false` (queue remains sequential) |
| `bot_corps_corridor.ts` | 127 | `if (cmd.active_operation) continue` | `if (!hasAvailableSlot(cmd, corpsBrigadeCount)) continue` |
| `triggered_operations.ts` | 68 | `return !cmd.active_operation && ...` | `return !hasActiveOperation(cmd) && ...` |
| `triggered_operations.ts` | 359 | `if (primaryCmd.active_operation) continue` | `if (!hasAvailableSlot(primaryCmd, brigadeCount)) continue` |
| `triggered_operations.ts` | 366 | `if (secCmd?.active_operation)` | `if (secCmd && !hasAvailableSlot(secCmd, brigadeCount))` |
| `commander_override.ts` | 102 | `if (corpsCmd?.active_operation)` | `if (hasActiveOperation(corpsCmd))` |
| `army_hq_overrides.ts` | 48 | `if (cc?.active_operation) continue` | `if (!hasAvailableSlot(cc, brigadeCount)) continue` |
| `battle_resolution.ts` | 317 | `if (!corps?.active_operation) return 1.0` | `if (!hasActiveOperation(corps)) return 1.0` |
| `war_phases.ts` | 845 | `if (!cmd?.active_operation && ...)` | `if (!hasActiveOperation(cmd) && ...)` |
| `collect_briefing.ts` | 110 | `active_operations` reference | Already uses plural — verify correct |

**IMPORTANT DESIGN NOTE:** For launch gates (bot_corps_operations, bot_corps_corridor, army_hq_overrides, triggered_operations), use `hasAvailableSlot(cmd, brigadeCount)` NOT `hasActiveOperation`. This is the key behavioral change — these gates should allow a second op if the corps has enough brigades. For queued pre-planned ops (pre_planned_operations.ts), keep `hasActiveOperation` — queued ops are sequential into slot 0.

For each file:
1. Add import: `import { hasActiveOperation, hasAvailableSlot } from './corps_operation_helpers.js';`
2. Replace the pattern
3. For `hasAvailableSlot`, you need the brigade count. Find how the function gets corps brigades — usually from `state.military.formations` filtered by `corps_id`.

**Step 1: Make all 15 changes**

**Step 2: Run tsc — remaining errors should be only MEDIUM and HARD sites**

**Step 3: Commit**

```bash
git commit -m "refactor(ops): migrate 15 trivial guard checks to helper functions"
```

---

## Phase 3: Migration — Hard Writes (15 sites)

### Task 4: Migrate Operation Launch Sites

All `cmd.active_operation = op` → `cmd.active_operations.push(op)`.

**Files (8 files, ~10 launch sites):**

| File | Line | Context |
|------|------|---------|
| `bot_corps_operations.ts` | 191 | Named op launch |
| `bot_corps_operations.ts` | 435 | Named op launch (2nd) |
| `pre_planned_operations.ts` | 793 | Pre-planned injection |
| `pre_planned_operations.ts` | 892 | Pre-planned injection (2nd) |
| `bot_corps_corridor.ts` | 152 | Corridor breach |
| `triggered_operations.ts` | 389 | Triggered op |
| `bot_corps_directives.ts` | 1732 | Probe launch |
| `bot_corps_directives.ts` | 1857 | Sector op launch |
| `bot_corps_directives.ts` | 1908 | Sector op launch (2nd) |

For each: `cmd.active_operation = op` → `cmd.active_operations.push(op)`

**For bot_corps_directives.ts secondary slot launches (1857, 1908):** Add the bot-only type guard:
```typescript
// Secondary slot ops must be probe or sector_attack only
if (cmd.active_operations.length > 0 && op.type !== 'probe' && op.type !== 'sector_attack') {
    continue; // Don't launch general_offensive in secondary slot
}
```

**Step 1: Make all changes**
**Step 2: Run tsc**
**Step 3: Commit**

### Task 5: Migrate Operation Completion/Clear Sites

All `cmd.active_operation = null` → `removeOperation(cmd, op)` or `cmd.active_operations = []`.

**Files:**

| File | Line | Context | New Pattern |
|------|------|---------|-------------|
| `bot_corps_operations.ts` | 284 | Op completion | `removeOperation(cmd, op)` — must have reference to the specific op being completed |
| `sector_offensive.ts` | 1166 | Recovery clear | `removeOperation(cmd, op)` |
| `corps_command.ts` | 268 | Stance transition | `cmd.active_operations = []` (clear all) |

**CRITICAL:** The completion sites currently do `cmd.last_completed_operation = cmd.active_operation; cmd.active_operation = null;`. With multi-slot: `cmd.last_completed_operation = op; removeOperation(cmd, op);` — the specific op must be passed through the call chain.

**Step 1: Trace the completion call chain to ensure the specific op reference is available**
**Step 2: Make changes**
**Step 3: Run tsc**
**Step 4: Commit**

### Task 6: Migrate Mutation Sites

Brigade additions and battle tracking must target the correct op.

**Files:**

| File | Lines | Context | Fix |
|------|-------|---------|-----|
| `army_reserve_system.ts` | 372, 590, 594 | `activeOp.participating_brigades.push(...)` | Use `findBrigadeOperation` or select nearest op |
| `attack_resolution_osid.ts` | 1656, 1659 | `activeOp.battles_this_turn++` | Use `findBrigadeOperation(cmd, attackerBrigadeId)` |
| `brigade_dissolution.ts` | 33-35 | `op.participating_brigades.filter(...)` | Iterate ALL ops: `for (const op of cmd.active_operations)` |
| `jna_phantom_brigades.ts` | 426-431, 575-580 | Remove phantom from op | Iterate ALL ops |

**For army_reserve_system.ts:** When an elite brigade auto-joins, it should join the FIRST op that is in `execution` phase and has room. Use:
```typescript
const targetOp = cmd.active_operations.find(op => op.phase === 'execution');
if (targetOp) targetOp.participating_brigades.push(brigadeId);
```

**Step 1: Make all changes**
**Step 2: Run tsc**
**Step 3: Commit**

---

## Phase 4: Migration — Medium Reads (52 sites)

### Task 7: Migrate Field Reads — Combat System

Replace `cmd.active_operation` field reads with `findBrigadeOperation` or `getPrimaryOperation`.

**Files (combat-critical, highest risk):**

| File | Strategy |
|------|----------|
| `combat_math.ts` (7 sites) | Use `findBrigadeOperation(cmd, brigadeId)` — combat modifiers must apply to the brigade's specific op |
| `battle_resolution.ts` (1 site) | Same — `findBrigadeOperation` |
| `bot_brigade_eval_attack.ts` (complex) | The `activeOp` local variable must come from `findBrigadeOperation` |
| `bot_brigade_ai_osid.ts` (4 sites) | `findBrigadeOperation` for the current brigade being evaluated |
| `operation_casualty_attribution.ts` (2 sites) | `findBrigadeOperation` |
| `compute_home_defense.ts` (2 sites) | `findBrigadeOperation` |

**Pattern for all:** Where current code does:
```typescript
const activeOp = cmd.active_operation;
```
Replace with:
```typescript
const activeOp = findBrigadeOperation(cmd, brigadeId);
```

This is the most common pattern. The `brigadeId` is always available in the calling context (it's the brigade being evaluated/resolved).

**Step 1: Make changes file by file**
**Step 2: Run tsc after each file**
**Step 3: Commit per file or per logical group**

### Task 8: Migrate Field Reads — Bot AI + Directives

| File | Strategy |
|------|----------|
| `bot_corps_directives.ts` (6 read sites) | Mix: `getPrimaryOperation` for corps-level decisions, `findBrigadeOperation` for brigade-level |
| `sector_offensive.ts` (8 read sites) | Must iterate ALL ops for advance/result loops. Use `for (const op of cmd.active_operations)` |
| `sector_intel.ts` (4 sites) | `cmd.active_operations.some(op => op.type === 'sector_attack')` |
| `corps_front_sectors.ts` (2 sites) | Merge participants: `cmd.active_operations.flatMap(op => op.participating_brigades)` |
| `bot_corps_ai.ts` (2 sites) | Report: list all ops |

**Step 1-3: Same pattern as Task 7**

### Task 9: Migrate Field Reads — Scenario/UI/AAR

| File | Strategy |
|------|----------|
| `scenario_runner.ts` (2 sites) | `findBrigadeOperation` for battle tagging |
| `anomaly_detector.ts` (5 sites) | Iterate `cmd.active_operations` |
| `anomaly_checks_extended.ts` (1 site) | Iterate |
| `operation_aar.ts` (2 sites) | Called per-op at completion — should already have the specific op |
| `scenario_end_report.ts` (1 site) | Already handles array in some places |
| `combat_causality.ts` (1 site) | `getPrimaryOperation` or iterate |
| `GameStateAdapter.ts` (2 sites) | Build ops array from `cmd.active_operations` directly |
| `war_data_extractor.ts` (1 site) | Iterate |
| `buildOperationalWeightGeoJSON.ts` (3 sites) | Iterate or `getPrimaryOperation` |
| AI commander files (4 sites) | `getPrimaryOperation` for prompt context |

**Step 1-3: Same pattern**

---

## Phase 5: Brigade Partitioning + Cross-Op Validation

### Task 10: Brigade Exclusion at Launch

**Files:**
- Modify: `src/sim/combat/bot_corps_operations.ts` — `evaluateCorpsOffensiveLaunch`
- Modify: `src/sim/combat/bot_corps_directives.ts` — sector op launch path
- Create: test for brigade exclusion

Before launching a new op, filter out brigades already in active ops:
```typescript
import { getAvailableBrigades } from './corps_operation_helpers.js';
const available = getAvailableBrigades(cmd, corpsBrigadeIds);
if (available.length < MIN_BRIGADES_FOR_OFFENSIVE) continue; // not enough free brigades
```

### Task 11: Cross-Op Objective Overlap Validation

**Files:**
- Modify: `src/sim/combat/operation_validation.ts` — `validateOpAtInjection`

Add check: if any active op for this corps already targets an objective OSID, warn/reject.

```typescript
for (const existingOp of cmd.active_operations) {
    const existingObjectives = new Set(existingOp.axes?.flatMap(a => a.objectives) ?? []);
    for (const newObj of newOp.axes?.flatMap(a => a.objectives) ?? []) {
        if (existingObjectives.has(newObj)) {
            warnings.push({ type: 'objective_overlap', osid: newObj });
        }
    }
}
```

---

## Phase 6: Exhaustion + Queue Interaction

### Task 12: Exhaustion Model Update

**Files:**
- Modify: `src/sim/combat/sector_offensive.ts` — exhaustion decay logic (~line 882)

```typescript
// OLD:
const decayRate = cmd.active_operation ? EXHAUSTION_DECAY_ACTIVE : EXHAUSTION_DECAY_IDLE;

// NEW:
const decayRate = cmd.active_operations.length > 0 ? EXHAUSTION_DECAY_ACTIVE : EXHAUSTION_DECAY_IDLE;
```

No per-op exhaustion tracking. Single pool, additive costs.

### Task 13: Queue Interaction Fix

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts` — the queue check at ~line 1644

```typescript
// OLD: queued ops block ALL bot launches
const canLaunchSectorOp = !hasQueuedOps && !existingOp && ...;

// NEW: queued ops block slot 0 only; bot can use slot 1+
const slot0Occupied = hasActiveOperation(cmd); // queued ops use slot 0
const canLaunchSectorOp = hasAvailableSlot(cmd, brigadeCount) && !isDefenseStrained && !isCorpsExhaustedForOffensive;
```

This is the KEY behavioral change that lets 1KK run Op Corridor in slot 0 while bot AI attacks Jajce in slot 1.

---

## Phase 7: Tests + Verification

### Task 14: Integration Tests

**Files:**
- Create: `tests/concurrent_operations.test.ts`

Test scenarios:
1. Corps with 36 brigades can launch 2 concurrent ops
2. Corps with 8 brigades cannot launch 2nd op
3. Brigade in op A cannot be drafted into op B
4. Completing op A frees brigades for future ops (not mid-op injection)
5. Pre-planned queue still executes sequentially in slot 0
6. Bot sector offensive can launch in slot 1 while queued op runs in slot 0
7. Emergency defensive op bypasses slot limit
8. Two ops cannot target same objective OSID

### Task 15: Full Regression

**Steps:**
1. `npx tsc --noEmit` — clean
2. `npm run test:vitest` — all existing tests pass (or known failures only)
3. `npm run sim:scenario:run:40w` — calibration run
4. `node tools/compare_painted_vs_sim.cjs` — compare
5. `node tools/diagnose_run.cjs` — diagnostics
6. `node tools/validate_run_consistency.cjs` — consistency
7. Dispatch /war-or-game for sign-off

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Brigade double-booking | `getAvailableBrigades` filter at every launch site |
| Two ops attack same OSID simultaneously | Cross-op validation at injection |
| `last_completed_operation` loses history | Acceptable — tracks most recent, cooldown still works |
| Exhaustion spikes from concurrent completions | Monitor via calibration; tune if needed |
| Save/load backwards compatibility | Need migration: old saves with `active_operation` → `active_operations: [op]` |
| UI assumes single op | GameStateAdapter already builds arrays; verify CorpsCard/OOBSidebar |
| Cascade through calibration | Expected — concurrent ops change war dynamics. Budget 2-3 calibration runs. |

## Save Migration (Task 0 — do before any testing)

Old saves have `active_operation`. Add migration in scenario_runner.ts or state loading:
```typescript
if (cmd.active_operation && !cmd.active_operations) {
    cmd.active_operations = cmd.active_operation ? [cmd.active_operation] : [];
    delete cmd.active_operation;
}
```
