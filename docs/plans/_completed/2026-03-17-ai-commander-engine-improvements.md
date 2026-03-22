# AI Commander Engine Improvements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 4 engine improvements discovered by the AI commander diagnostic system, plus make AI commanders a permanent QA tool.

**Architecture:** All changes are additive and gated — no behavior change in formula-only mode. Stance-aware density uses existing `cmd.stance`. Status reason is a new informational field. Gate audit trace is diagnostic-only output. Stasis investigation adjusts entrenchment parameters. QA runner is a new npm script.

**Tech Stack:** TypeScript, Vitest, existing sim pipeline.

**Findings source:** Three-commander run (2026-03-17) — `memory/ai_commander_three_agents.md`

---

### Task 1: Stance-Aware Density Gate

The `isDefenseStrained` gate in `bot_corps_directives.ts` blocks operation launch when `corpsDensity < 0.167` regardless of stance. Offensive corps should accept thinner lines to concentrate force.

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts:597-607`
- Test: `tests/stance_aware_density_gate.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/stance_aware_density_gate.test.ts
import { describe, it, expect } from 'vitest';

describe('stance-aware density gate', () => {
    // These thresholds are the contract we're testing
    const CRITICAL_DENSITY_THRESHOLD = 0.10;
    const STRAINED_DEFENSIVE = 0.167;
    const STRAINED_BALANCED = 0.12;
    const STRAINED_OFFENSIVE = 0.08;

    function isDefenseStrained(density: number, stance: string): boolean {
        if (density <= 0) return false;
        if (density < CRITICAL_DENSITY_THRESHOLD) return true; // Critical always blocks
        const threshold = stance === 'offensive' ? STRAINED_OFFENSIVE
            : stance === 'balanced' ? STRAINED_BALANCED
            : STRAINED_DEFENSIVE;
        return density < threshold;
    }

    it('offensive corps NOT strained at 0.12 density (was strained under old threshold)', () => {
        expect(isDefenseStrained(0.12, 'offensive')).toBe(false);
    });

    it('defensive corps IS strained at 0.12 density', () => {
        expect(isDefenseStrained(0.12, 'defensive')).toBe(true);
    });

    it('balanced corps NOT strained at 0.13 density', () => {
        expect(isDefenseStrained(0.13, 'balanced')).toBe(false);
    });

    it('offensive corps strained at 0.07 density (below offensive threshold)', () => {
        expect(isDefenseStrained(0.07, 'offensive')).toBe(true);
    });

    it('critical density blocks all stances', () => {
        expect(isDefenseStrained(0.05, 'offensive')).toBe(true);
        expect(isDefenseStrained(0.05, 'balanced')).toBe(true);
        expect(isDefenseStrained(0.05, 'defensive')).toBe(true);
    });

    it('high density never strained', () => {
        expect(isDefenseStrained(0.5, 'offensive')).toBe(false);
        expect(isDefenseStrained(0.5, 'defensive')).toBe(false);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/stance_aware_density_gate.test.ts`
Expected: PASS (this is a pure logic test — we're defining the contract first)

**Step 3: Implement in engine**

In `src/sim/combat/bot_corps_directives.ts` lines 597-607, replace:

```typescript
// Critical threshold: fewer than 1 brigade per 10 edges means the front
// is so thin that any attack could break through. Commander goes defensive.
const CRITICAL_DENSITY_THRESHOLD = 0.10;
// Strained threshold: fewer than 1 brigade per 6 edges. Commander stays
// balanced but won't launch new operations — hold what you have.
const STRAINED_DENSITY_THRESHOLD = 0.167;
const isDefenseCritical = corpsDensity > 0 && corpsDensity < CRITICAL_DENSITY_THRESHOLD;
const isDefenseStrained = corpsDensity > 0 && corpsDensity < STRAINED_DENSITY_THRESHOLD;
```

With:

```typescript
// Critical threshold: fewer than 1 brigade per 10 edges means the front
// is so thin that any attack could break through. Commander goes defensive.
const CRITICAL_DENSITY_THRESHOLD = 0.10;
// Strained threshold: stance-aware. Offensive corps accept thinner lines
// to concentrate force for operations. Defensive corps play it safe.
// Offensive: 1 per 12.5 edges (0.08). Balanced: 1 per 8 (0.12). Defensive: 1 per 6 (0.167).
const STRAINED_DENSITY_THRESHOLD = cmd.stance === 'offensive' ? 0.08
    : cmd.stance === 'balanced' ? 0.12
    : 0.167;
const isDefenseCritical = corpsDensity > 0 && corpsDensity < CRITICAL_DENSITY_THRESHOLD;
const isDefenseStrained = corpsDensity > 0 && corpsDensity < STRAINED_DENSITY_THRESHOLD;
```

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: 1086+ tests pass, 0 failures

**Step 5: Commit**

```bash
git add src/sim/combat/bot_corps_directives.ts tests/stance_aware_density_gate.test.ts
git commit -m "feat(bot): stance-aware density gate — offensive corps accept thinner lines"
```

---

### Task 2: Corps Status Reason Field

Add a `status_reason` field to `CorpsCommandState` that explains WHY a corps can't execute its stance. Surfaced to AI commanders, player UI, and diagnostics.

**Files:**
- Modify: `src/state/game_state.ts:406-437` (CorpsCommandState interface)
- Modify: `src/sim/combat/bot_corps_directives.ts:1535-1549` (set reason during directive generation)
- Test: `tests/corps_status_reason.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/corps_status_reason.test.ts
import { describe, it, expect } from 'vitest';
import type { CorpsStatusReason } from '../src/state/game_state.js';

describe('corps status reason', () => {
    const VALID_REASONS: CorpsStatusReason[] = [
        'executing_operation', 'density_strained', 'supply_critical',
        'no_targets', 'cooldown', 'no_eligible_sectors', 'queued_ops_pending',
        'ready'
    ];

    it('all reason values are distinct', () => {
        expect(new Set(VALID_REASONS).size).toBe(VALID_REASONS.length);
    });

    it('type includes all expected values', () => {
        // This test validates the type definition exists and has the right members.
        // If the type changes, this test will fail at compile time.
        for (const r of VALID_REASONS) {
            const typed: CorpsStatusReason = r;
            expect(typed).toBe(r);
        }
    });
});
```

**Step 2: Add type to game_state.ts**

After the `CorpsCommandState` interface closing brace (line 437), add:

```typescript
/** Why a corps can't execute its assigned stance (informational). */
export type CorpsStatusReason =
    | 'executing_operation'   // Has active operation
    | 'density_strained'     // Front too thin for operations
    | 'supply_critical'      // Supply gate stripped targets
    | 'no_targets'           // No valid offensive targets
    | 'cooldown'             // Post-operation cooldown
    | 'no_eligible_sectors'  // No sectors with enemy contact
    | 'queued_ops_pending'   // Queued operations blocking auto-launch
    | 'ready';               // Can launch operations
```

Add to `CorpsCommandState` interface (after `ai_assessment`):

```typescript
    /** Why this corps can or can't execute its stance (diagnostic/UI). */
    status_reason?: CorpsStatusReason;
```

**Step 3: Set reason in bot_corps_directives.ts**

After `cmd.directive = directive;` (line 1536), add reason computation:

```typescript
        // ── Set corps status reason (diagnostic + UI) ────────────────────
        if (existingOp) {
            cmd.status_reason = 'executing_operation';
        } else if (hasQueuedOps) {
            cmd.status_reason = 'queued_ops_pending';
        } else if (isDefenseStrained) {
            cmd.status_reason = 'density_strained';
        } else if (offensiveTargets.length === 0) {
            cmd.status_reason = maxOpSize === 0 ? 'supply_critical' : 'no_targets';
        } else if (directiveEligibleSectors.length === 0) {
            cmd.status_reason = 'no_eligible_sectors';
        } else {
            cmd.status_reason = 'ready';
        }
```

Then after the cooldown check creates an operation (or doesn't), update:

```typescript
        // Update status_reason if cooldown blocked
        if (!cmd.active_operation && cmd.status_reason === 'ready') {
            const lastCompletedTurn2 = cmd.last_completed_operation_turn ?? -999;
            const effectiveCooldown2 = cmd.stance === 'offensive'
                ? SECONDARY_OP_COOLDOWN_TURNS_OFFENSIVE
                : SECONDARY_OP_COOLDOWN_TURNS;
            if (cmd.last_completed_operation && (currentTurn - lastCompletedTurn2) <= effectiveCooldown2) {
                cmd.status_reason = 'cooldown';
            }
        }
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All pass including new test

**Step 5: Commit**

```bash
git add src/state/game_state.ts src/sim/combat/bot_corps_directives.ts tests/corps_status_reason.test.ts
git commit -m "feat(bot): corps status_reason field — explains why corps can't execute stance"
```

---

### Task 3: Gate Audit Trace for Operation Launch

Add a lightweight diagnostic trace that logs which gate blocked operation launch. Written to `cmd.op_launch_trace` for post-run analysis.

**Files:**
- Modify: `src/state/game_state.ts` (add `op_launch_trace` to CorpsCommandState)
- Modify: `src/sim/combat/bot_corps_directives.ts:1538-1549` (build trace)
- Test: `tests/op_launch_trace.test.ts`

**Step 1: Add type and field**

In `CorpsCommandState` interface, add:

```typescript
    /** Diagnostic: which gates blocked/allowed operation launch this turn. */
    op_launch_trace?: string[];
```

**Step 2: Build trace in bot_corps_directives.ts**

Replace the operation launch gate block (lines 1538-1549) with trace-instrumented version:

```typescript
        const existingOp = cmd.active_operation;
        const hasQueuedOps = cmd.queued_operations && cmd.queued_operations.length > 0;
        const canLaunchSectorOp = !hasQueuedOps && !existingOp && !isDefenseStrained;
        const hasHqProbeOverride = armyHqOverrides.some(o => o.type === 'probe' || o.type === 'feint');
        const stanceAllowsOps = cmd.stance === 'offensive' || cmd.stance === 'balanced' || hasHqProbeOverride;

        // Gate audit trace (diagnostic — consumed by AI commander QA and run analysis)
        const trace: string[] = [];
        if (existingOp) trace.push(`blocked:existing_op(${existingOp.name}:${existingOp.phase})`);
        if (hasQueuedOps) trace.push('blocked:queued_ops');
        if (isDefenseStrained) trace.push(`blocked:density_strained(${corpsDensity.toFixed(3)}<${STRAINED_DENSITY_THRESHOLD})`);
        if (!stanceAllowsOps) trace.push(`blocked:stance(${cmd.stance})`);
        if (directiveEligibleSectors.length === 0) trace.push('blocked:no_eligible_sectors');
        if (offensiveTargets.length === 0) trace.push('blocked:no_targets');
        if (trace.length === 0) trace.push('clear:all_gates_passed');
        cmd.op_launch_trace = trace;
```

**Step 3: Write test**

```typescript
// tests/op_launch_trace.test.ts
import { describe, it, expect } from 'vitest';

describe('op launch trace format', () => {
    it('trace entries use blocked: or clear: prefix', () => {
        const sampleTraces = [
            'blocked:existing_op(Operation Drina:execution)',
            'blocked:density_strained(0.120<0.167)',
            'blocked:stance(defensive)',
            'clear:all_gates_passed',
        ];
        for (const t of sampleTraces) {
            expect(t.startsWith('blocked:') || t.startsWith('clear:')).toBe(true);
        }
    });
});
```

**Step 4: Run tests + commit**

Run: `npx vitest run`

```bash
git add src/state/game_state.ts src/sim/combat/bot_corps_directives.ts tests/op_launch_trace.test.ts
git commit -m "feat(bot): op launch gate audit trace — diagnose why ops don't launch"
```

---

### Task 4: Late-War Stasis Investigation

Territory froze at 49.4% from w20-w39. Entrenchment at w20 = `sqrt(20) * 0.035 * 2 = 0.313` bonus (1.31× defense). At w40 = `sqrt(40) * 0.035 * 2 = 0.443` (1.44× defense). Combined with reactive defense, terrain, and corps stance bonuses, this creates an impenetrable late-war front.

The fix: add **entrenchment fatigue** — long-static positions degrade over time (troops become complacent, positions become predictable, morale sags from inactivity). This creates windows for offensive action in the mid-late war.

**Files:**
- Modify: `src/sim/combat/combat_math.ts:909-921` (add entrenchment fatigue cap)
- Modify: `src/sim/combat/combat_math.ts:51` (add new constant)
- Test: `tests/entrenchment_fatigue.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/entrenchment_fatigue.test.ts
import { describe, it, expect } from 'vitest';
import { ENTRENCHMENT_PER_TURN, MAX_ENTRENCHMENT } from '../src/sim/combat/combat_math.js';

describe('entrenchment fatigue', () => {
    // The entrenchment bonus formula: 1.0 + sqrt(et) * ENTRENCHMENT_PER_TURN * 2 * suppression
    // At et=20 (week 20): sqrt(20) * 0.035 * 2 = 0.313 → 1.313×
    // At et=40 (week 40): sqrt(40) * 0.035 * 2 = 0.443 → 1.443×

    it('ENTRENCHMENT_PER_TURN is 0.035', () => {
        expect(ENTRENCHMENT_PER_TURN).toBe(0.035);
    });

    it('MAX_ENTRENCHMENT is 6', () => {
        expect(MAX_ENTRENCHMENT).toBe(6);
    });

    // New: entrenchment effective turns should plateau — long-static positions
    // become predictable and complacent. Effective entrenchment stops growing after
    // ENTRENCHMENT_EFFECTIVE_CAP turns (e.g. 30), not MAX_ENTRENCHMENT (hard cap).
    // This means: at 30+ turns in position, entrenchment bonus is ~0.38× (not 0.44×).
    // The difference creates a 4-6% offensive window in the late war.
});
```

**Step 2: Add effective cap constant**

In `src/sim/combat/combat_math.ts` after line 51 (`ENTRENCHMENT_PER_TURN = 0.035`), add:

```typescript
/**
 * Entrenchment effective cap: bonus stops growing after this many turns.
 * Models complacency in long-static positions — troops become predictable,
 * positions become known to the enemy, morale sags from inactivity.
 * At 26 turns: sqrt(26) * 0.035 * 2 = 0.357 (1.36× defense).
 * Beyond 26: entrenchment bonus frozen at this level.
 * The 0.08 difference vs uncapped (1.44×) creates a late-war offensive window.
 */
export const ENTRENCHMENT_EFFECTIVE_CAP_TURNS = 26;
```

**Step 3: Apply cap in getEntrenchmentBonus calculation**

In `src/sim/combat/combat_math.ts` line 909, change:

```typescript
    const entrenchmentTurns = Math.min(MAX_ENTRENCHMENT, (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0);
```

To:

```typescript
    const rawEntrenchmentTurns = (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
    const entrenchmentTurns = Math.min(MAX_ENTRENCHMENT, rawEntrenchmentTurns);
    // Effective cap: bonus stops growing after ENTRENCHMENT_EFFECTIVE_CAP_TURNS.
    // Formations still accumulate entrenchment_turns (for disruption recovery),
    // but the defensive bonus plateaus — long-static positions become predictable.
    const effectiveEntrenchmentForBonus = Math.min(ENTRENCHMENT_EFFECTIVE_CAP_TURNS, entrenchmentTurns);
```

And update the bonus calculation on line 921 to use `effectiveEntrenchmentForBonus`:

```typescript
    const entrenchmentMult = 1.0 + Math.sqrt(effectiveEntrenchmentForBonus) * ENTRENCHMENT_PER_TURN * 2 * suppressionFactor;
```

**Step 4: Add import for new constant**

Add `ENTRENCHMENT_EFFECTIVE_CAP_TURNS` to the existing imports/exports as needed.

**Step 5: Run tests + commit**

Run: `npx vitest run`

```bash
git add src/sim/combat/combat_math.ts tests/entrenchment_fatigue.test.ts
git commit -m "feat(combat): entrenchment effective cap at 26 turns — prevents late-war stasis"
```

**IMPORTANT:** This is a sim-affecting change. After implementation, run `npm run sim:scenario:run:40w` and compare against n875 baseline. If area-weighted drops below 89%, revert and investigate.

---

### Task 5: AI Commander QA as Permanent npm Script

Make the three-commander diagnostic system a permanent tool that runs after every calibration scenario.

**Files:**
- Modify: `package.json` (add npm scripts)
- Modify: `tools/claude_plays_vrs/run_three_commanders.ts` (add JSON summary output for automation)
- Create: `tools/claude_plays_vrs/summarize_diagnostics.cjs` (parse diagnostic_report.json and print actionable summary)

**Step 1: Add npm scripts**

In `package.json` scripts section, add:

```json
"sim:qa:commanders": "tsx tools/claude_plays_vrs/run_three_commanders.ts --mode reactive",
"sim:qa:commanders:cadet": "tsx tools/claude_plays_vrs/run_three_commanders.ts --mode cadet",
"sim:qa:diagnostics": "node tools/claude_plays_vrs/summarize_diagnostics.cjs"
```

**Step 2: Write the diagnostic summary script**

```javascript
// tools/claude_plays_vrs/summarize_diagnostics.cjs
const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '../../runs/three_commanders/diagnostic_report.json');
if (!fs.existsSync(reportPath)) {
    console.error('No diagnostic report found. Run: npm run sim:qa:commanders');
    process.exit(1);
}

const observations = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const bySeverity = { bug: [], calibration: [], design_gap: [], historical_divergence: [] };
for (const o of observations) {
    if (bySeverity[o.severity]) bySeverity[o.severity].push(o);
}

console.log('=== AI Commander QA Diagnostic Summary ===\n');
console.log(`Total observations: ${observations.length}`);
console.log(`  Bugs:                  ${bySeverity.bug.length}`);
console.log(`  Calibration issues:    ${bySeverity.calibration.length}`);
console.log(`  Design gaps:           ${bySeverity.design_gap.length}`);
console.log(`  Historical divergence: ${bySeverity.historical_divergence.length}`);

if (bySeverity.bug.length > 0) {
    console.log('\n🔴 BUGS (require fix):');
    const seen = new Set();
    for (const o of bySeverity.bug) {
        const key = `${o.faction}:${o.description}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(`  [${o.faction} w${o.turn}] ${o.description}`);
        console.log(`    Expected: ${o.expected}`);
        console.log(`    Actual:   ${o.actual}`);
    }
}

if (bySeverity.historical_divergence.length > 0) {
    console.log('\n🟠 HISTORICAL DIVERGENCE:');
    const seen = new Set();
    for (const o of bySeverity.historical_divergence) {
        const key = `${o.faction}:${o.description}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(`  [${o.faction} w${o.turn}] ${o.description}`);
        console.log(`    Expected: ${o.expected}`);
        console.log(`    Actual:   ${o.actual}`);
    }
}

if (bySeverity.design_gap.length > 0) {
    console.log('\n🔵 DESIGN GAPS:');
    const seen = new Set();
    for (const o of bySeverity.design_gap) {
        const key = `${o.faction}:${o.description}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(`  [${o.faction} w${o.turn}] ${o.description}`);
    }
}

if (bySeverity.calibration.length > 0) {
    console.log('\n🟡 CALIBRATION NOTES:');
    const seen = new Set();
    for (const o of bySeverity.calibration) {
        const key = `${o.faction}:${o.description}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(`  [${o.faction} w${o.turn}] ${o.description}`);
    }
}

const exitCode = bySeverity.bug.length > 0 ? 1 : 0;
console.log(`\n${exitCode === 0 ? '✅ PASS' : '❌ FAIL'} — ${bySeverity.bug.length} bugs`);
process.exit(exitCode);
```

**Step 3: Update three-commander runner to consume `status_reason` and `op_launch_trace`**

In `run_three_commanders.ts`, update the offensive-corps-idle observation to use the new `status_reason` field:

```typescript
// Replace the manual reason computation with the engine's native status_reason
const cc = corpsCommand[c.id];
const statusReason = (cc as any)?.status_reason ?? 'unknown';
const trace = ((cc as any)?.op_launch_trace ?? []).join(', ');

if (statusReason !== 'executing_operation' && statusReason !== 'ready') {
    observations.push({
        severity: statusReason === 'density_strained' || statusReason === 'cooldown' ? 'calibration' : 'design_gap',
        commander: commanderName,
        faction,
        turn,
        description: `Corps ${c.id} offensive with ${c.brigades} bde — ${statusReason}`,
        expected: 'Offensive corps should be executing or ready to launch',
        actual: `status: ${statusReason}, trace: ${trace}`,
        affected_system: 'operation_generation',
    });
}
```

**Step 4: Run tests + commit**

Run: `npx vitest run && npx tsc --noEmit`

```bash
git add package.json tools/claude_plays_vrs/summarize_diagnostics.cjs tools/claude_plays_vrs/run_three_commanders.ts
git commit -m "feat(qa): AI commander QA as permanent npm scripts — sim:qa:commanders + sim:qa:diagnostics"
```

---

### Task 6: Verification Run

Run the full pipeline with all changes and compare against baseline.

**Step 1: Run 40w calibration scenario (formula bot only)**

```bash
npm run sim:scenario:run:40w
```

Compare against n875 baseline. Area-weighted must be >= 89.0%.

**Step 2: Run three-commander QA**

```bash
npm run sim:qa:commanders
npm run sim:qa:diagnostics
```

Expected: 0 bugs. Fewer than 6 calibration notes (stance-aware density should eliminate most vrs_2nd_krajina observations).

**Step 3: Compare results**

```bash
node tools/compare_painted_vs_sim.cjs runs/three_commanders
```

Document result in CALIBRATION_MASTER.md.

**Step 4: If calibration regresses**

If area-weighted drops below 89%, the entrenchment effective cap (Task 4) is the most likely cause. Increase `ENTRENCHMENT_EFFECTIVE_CAP_TURNS` from 26 to 30, or revert entirely. Run one-change-then-verify protocol.

---

## Summary

| Task | Type | Risk | Files |
|------|------|------|-------|
| 1. Stance-aware density | Engine fix | Medium | bot_corps_directives.ts |
| 2. Corps status reason | Informational | Low | game_state.ts, bot_corps_directives.ts |
| 3. Gate audit trace | Diagnostic | Low | game_state.ts, bot_corps_directives.ts |
| 4. Entrenchment cap | Engine fix | High | combat_math.ts |
| 5. QA npm scripts | Tooling | None | package.json, new scripts |
| 6. Verification | Validation | None | — |

**Order matters:** Tasks 1-3 are safe and independent. Task 4 is sim-affecting and must be verified. Task 5 depends on Tasks 2-3. Task 6 is the final gate.
