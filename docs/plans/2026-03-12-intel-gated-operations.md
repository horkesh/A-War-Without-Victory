# Intel-Gated Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bot AI checks sector intel confidence before launching operations — low-confidence sectors get probe operations first instead of blind full commitments.

**Architecture:** Add an intel confidence gate in `bot_corps_directives.ts` at operation launch time (line ~1104). When confidence is below the faction's threshold, launch a probe-type operation instead of a sector_attack. When confidence is sufficient, launch sector_attack as before. The existing Operation Preparation system (`operation_preparation.ts`) handles the rest — commander assessment, readiness, probes during preparation. This change gates the INITIAL decision, not the preparation phase.

**Tech Stack:** TypeScript, vitest, node:test. Files in `src/sim/combat/`. Constants in `sector_intel_constants.ts`.

**Key insight:** The preparation system already handles "should we attack?" once an operation exists. What's missing is "should we even START an operation here?" — the bot blindly launches sector_attacks into sectors it knows nothing about.

---

## Integration Points

| System | File | Role |
|--------|------|------|
| Sector intel | `src/sim/combat/sector_intel.ts` | Reads confidence per sector pair |
| Intel constants | `src/sim/combat/sector_intel_constants.ts` | Faction thresholds, named tiers |
| Corps directives | `src/sim/combat/bot_corps_directives.ts:1104` | Operation launch decision point |
| Sector offensive | `src/sim/combat/sector_offensive.ts` | `evaluateSectorOffensiveLaunch()` + lifecycle |
| Operation preparation | `src/sim/combat/operation_preparation.ts` | Handles prep after launch |
| Bot constants | `src/sim/combat/bot_constants.ts` | RS blitz exemption constant |

---

### Task 1: Add Intel Confidence Constants

**Files:**
- Modify: `src/sim/combat/sector_intel_constants.ts`

**Step 1: Add constants**

Add after the existing `CONFIDENCE_DEEP_INTEL` constant (line 72):

```typescript
/**
 * Intel confidence threshold for launching a full sector offensive.
 * Below this: launch a probe-type operation to gather intel first.
 * At or above: launch a sector_attack normally.
 * Per-faction: VRS has JNA intel inheritance (lower threshold needed),
 * ARBiH starts blind (higher threshold to compensate), HRHB moderate.
 */
export const INTEL_GATE_LAUNCH_THRESHOLD: Record<NonNullable<FactionId>, number> = {
    RS: 0.25,    // JNA inheritance means they know enough to attack sooner
    RBiH: 0.40,  // Starting blind — need more intel before committing
    HRHB: 0.30,  // Croatian SIS provides moderate baseline
};

/**
 * Maximum probe operations a corps can launch consecutively before
 * forcing a full operation regardless of intel. Prevents infinite
 * probe loops when intel never reaches threshold (e.g., decaying sectors).
 */
export const MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT = 2;
```

**Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Commit**

```
feat(intel): add intel gate launch thresholds per faction
```

---

### Task 2: Add Intel Confidence Lookup Helper

**Files:**
- Modify: `src/sim/combat/sector_intel.ts`
- Test: `tests/intel_gated_operations.test.ts` (create)

**Step 1: Write the failing test**

Create `tests/intel_gated_operations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getSectorIntelConfidence } from '../src/sim/combat/sector_intel.js';
import type { GameState } from '../src/state/game_state.js';

describe('getSectorIntelConfidence', () => {
    it('returns 0 when no sector_intel exists', () => {
        const state = { military: {} } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:1')).toBe(0);
    });

    it('returns 0 when sector has no intel records', () => {
        const state = {
            military: { sector_intel: { 'sector:1': [] } },
        } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:1')).toBe(0);
    });

    it('returns max confidence across all enemy sector records', () => {
        const state = {
            military: {
                sector_intel: {
                    'sector:1': [
                        { enemy_sector_id: 'enemy:1', confidence: 0.3 },
                        { enemy_sector_id: 'enemy:2', confidence: 0.6 },
                        { enemy_sector_id: 'enemy:3', confidence: 0.1 },
                    ],
                },
            },
        } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:1')).toBe(0.6);
    });

    it('returns 0 for unknown sector id', () => {
        const state = {
            military: { sector_intel: { 'sector:1': [{ enemy_sector_id: 'e:1', confidence: 0.5 }] } },
        } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:nonexistent')).toBe(0);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intel_gated_operations.test.ts`
Expected: FAIL — `getSectorIntelConfidence` not exported

**Step 3: Implement the helper**

Add to `src/sim/combat/sector_intel.ts` after the existing exports (after `updateSectorIntelFromCombat` or at the end of the file):

```typescript
/**
 * Get the best (maximum) intel confidence for a friendly sector
 * across all its facing enemy sector records.
 * Returns 0 if no intel data exists.
 */
export function getSectorIntelConfidence(state: GameState, sectorId: string): number {
    const records = state.military.sector_intel?.[sectorId];
    if (!records || records.length === 0) return 0;
    let best = 0;
    for (const rec of records) {
        if (rec.confidence > best) best = rec.confidence;
    }
    return best;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/intel_gated_operations.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```
feat(intel): add getSectorIntelConfidence helper for operation launch gating
```

---

### Task 3: Add Intel Gate to Operation Launch

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts:1104-1113`
- Test: `tests/intel_gated_operations.test.ts` (extend)

**Step 1: Write the failing test**

Add to `tests/intel_gated_operations.test.ts`:

```typescript
import { shouldLaunchProbeInstead } from '../src/sim/combat/bot_corps_directives.js';
import type { FactionId } from '../src/state/game_state.js';

describe('shouldLaunchProbeInstead', () => {
    it('returns false when intel is above faction threshold (RS)', () => {
        expect(shouldLaunchProbeInstead('RS', 0.30, 0)).toBe(false);
    });

    it('returns true when intel is below faction threshold (RS)', () => {
        expect(shouldLaunchProbeInstead('RS', 0.20, 0)).toBe(true);
    });

    it('returns false when intel is below threshold but max probes reached', () => {
        expect(shouldLaunchProbeInstead('RS', 0.10, 2)).toBe(false);
    });

    it('returns true for RBiH at 0.35 (below 0.40 threshold)', () => {
        expect(shouldLaunchProbeInstead('RBiH', 0.35, 0)).toBe(true);
    });

    it('returns false for RBiH at 0.45 (above 0.40 threshold)', () => {
        expect(shouldLaunchProbeInstead('RBiH', 0.45, 0)).toBe(false);
    });

    it('returns true for HRHB at 0.25 (below 0.30 threshold)', () => {
        expect(shouldLaunchProbeInstead('HRHB', 0.25, 0)).toBe(true);
    });

    it('returns false during RS blitz phase (turn <= 12) regardless of intel', () => {
        expect(shouldLaunchProbeInstead('RS', 0.0, 0, 5)).toBe(false);
    });

    it('returns true for RS after blitz phase with low intel', () => {
        expect(shouldLaunchProbeInstead('RS', 0.10, 0, 20)).toBe(true);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intel_gated_operations.test.ts`
Expected: FAIL — `shouldLaunchProbeInstead` not exported

**Step 3: Implement the gate function**

Add to `src/sim/combat/bot_corps_directives.ts` (before `generateCorpsDirectives` or at module level):

```typescript
import { getSectorIntelConfidence } from './sector_intel.js';
import { INTEL_GATE_LAUNCH_THRESHOLD, MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT } from './sector_intel_constants.js';
import { RS_BLITZ_PHASE_END_WEEK } from './bot_constants.js';

/**
 * Should the bot launch a probe-type operation instead of a full sector_attack?
 * Returns true when intel confidence is below the faction's threshold and the
 * corps hasn't exhausted its consecutive probe limit.
 *
 * Exemptions:
 * - RS during blitz phase (w0-12): JNA-style pre-planned ops attack blind.
 * - Corps that already probed MAX_CONSECUTIVE_PROBES times: force commitment.
 */
export function shouldLaunchProbeInstead(
    faction: FactionId,
    sectorIntelConfidence: number,
    consecutiveProbes: number,
    turn?: number,
): boolean {
    // RS blitz phase exemption: JNA-trained forces attack without probing
    if (faction === 'RS' && (turn ?? 999) <= RS_BLITZ_PHASE_END_WEEK) return false;

    // Already probed enough — commit regardless
    if (consecutiveProbes >= MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT) return false;

    const threshold = INTEL_GATE_LAUNCH_THRESHOLD[faction] ?? 0.30;
    return sectorIntelConfidence < threshold;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/intel_gated_operations.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```
feat(intel): add shouldLaunchProbeInstead gate function
```

---

### Task 4: Wire Intel Gate into Corps Directive Launch Path

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts:1104-1113`
- Modify: `src/state/game_state.ts` (add `consecutive_probes` to corps command)

**Step 1: Add state field**

In `src/state/game_state.ts`, find the corps command interface (search for `corps_command` type or `CorpsCommand`) and add:

```typescript
/** Number of consecutive probe operations launched by this corps without a full attack. */
consecutive_probes?: number;
```

**Step 2: Wire the gate into the launch path**

In `src/sim/combat/bot_corps_directives.ts`, replace the operation launch block at ~line 1104-1113:

```typescript
                const op = evaluateSectorOffensiveLaunch(
                    state, corps.id, sec.sector_id, faction,
                    finalBrigadeIds, secEnemyOsids, reachableTargets, supplyByOsid,
                    bestMinOutcome
                );
                if (op) {
                    cmd.active_operation = op;
                    assignOperationCommander(state, op, corps.id, faction);
                    break; // One offensive at a time per corps
                }
```

With:

```typescript
                // ── Intel gate: check sector confidence before committing ──
                const sectorConfidence = getSectorIntelConfidence(state, sec.sector_id);
                const consecutiveProbes = cmd.consecutive_probes ?? 0;
                const turn = state.meta?.turn ?? 0;

                if (shouldLaunchProbeInstead(faction, sectorConfidence, consecutiveProbes, turn)) {
                    // Low intel — launch a probe operation instead of full attack.
                    // Probes are smaller (max 2 brigades), shorter planning, and generate
                    // recon-by-force intel when they engage.
                    const probeBrigades = finalBrigadeIds.slice(0, 2);
                    if (probeBrigades.length >= 1 && secEnemyOsids.length >= 1) {
                        const probeOp = evaluateSectorOffensiveLaunch(
                            state, corps.id, sec.sector_id, faction,
                            probeBrigades, secEnemyOsids, reachableTargets.slice(0, 1), supplyByOsid,
                            'repulsed' // Probes accept worse outcomes
                        );
                        if (probeOp) {
                            probeOp.type = 'probe';
                            probeOp.planning_duration = 1; // Fast planning
                            cmd.active_operation = probeOp;
                            cmd.consecutive_probes = consecutiveProbes + 1;
                            assignOperationCommander(state, probeOp, corps.id, faction);
                            break;
                        }
                    }
                    // If probe launch fails, fall through to try full attack
                }

                const op = evaluateSectorOffensiveLaunch(
                    state, corps.id, sec.sector_id, faction,
                    finalBrigadeIds, secEnemyOsids, reachableTargets, supplyByOsid,
                    bestMinOutcome
                );
                if (op) {
                    cmd.active_operation = op;
                    cmd.consecutive_probes = 0; // Reset probe counter on full attack
                    assignOperationCommander(state, op, corps.id, faction);
                    break;
                }
```

**Step 3: Run typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: All pass

**Step 4: Commit**

```
feat(intel): wire intel gate into corps directive operation launch path
```

---

### Task 5: Reset Probe Counter on Operation Completion

**Files:**
- Modify: `src/sim/combat/sector_offensive.ts`

**Step 1: Find operation removal path**

In `sector_offensive.ts`, find where operations are removed (recovery completion). Search for `cmd.active_operation = ` or where operations transition to null/undefined.

**Step 2: Add probe counter reset**

At every point where `cmd.active_operation` is cleared (set to null/undefined), also reset `cmd.consecutive_probes = 0`. This ensures the probe counter resets when an operation cycle completes (not just on launch).

Additionally, when a probe-type operation transitions to recovery, the intel gained from combat (via `updateSectorIntelFromCombat` — recon-by-force sets confidence=1.0) will naturally raise the sector's confidence above the threshold. The next corps directive cycle will then see sufficient confidence and launch a full sector_attack.

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 4: Commit**

```
feat(intel): reset probe counter on operation completion
```

---

### Task 6: Integration Test — Full Pipeline

**Files:**
- Test: `tests/intel_gated_operations.test.ts` (extend)

**Step 1: Write integration test**

Add to the test file:

```typescript
describe('intel gate integration', () => {
    it('low intel corps launches probe, not sector_attack', () => {
        // Minimal state: one corps with offensive stance, one sector, low intel
        // Call generateCorpsDirectives → verify cmd.active_operation.type === 'probe'
        // (This test verifies the full wiring — will need enough state to reach
        // the launch path in bot_corps_directives.ts)
    });

    it('high intel corps launches sector_attack normally', () => {
        // Same setup but with intel confidence above threshold
        // Call generateCorpsDirectives → verify cmd.active_operation.type === 'sector_attack'
    });

    it('RS blitz phase skips intel gate', () => {
        // RS at turn 5 with zero intel still launches sector_attack
    });

    it('after MAX_CONSECUTIVE_PROBES, corps launches full attack', () => {
        // Set consecutive_probes = 2, low intel → verify sector_attack not probe
    });
});
```

Note: The integration tests need realistic state (formations, sectors, edges). Use the pattern from `tests/bot_operation_objective_focus.test.ts` — minimal but sufficient state objects cast via `as unknown as GameState`.

**Step 2: Run full suite**

Run: `npx vitest run && node_modules/.bin/tsx --test tests/bot_operation_objective_focus.test.ts`
Expected: All pass

**Step 3: Commit**

```
test(intel): add integration tests for intel-gated operations
```

---

### Task 7: Run 40w Scenario + Verification

**Step 1: Run calibration scenario**

Run: `npm run sim:scenario:run:40w`

**Step 2: Verify with comparison tool**

Run: `node tools/compare_painted_vs_sim.cjs <run_dir>`

**Step 3: Check for behavioral changes**

- Probe operations should appear in early turns (RS w0-12 exempt; RBiH/HRHB should probe)
- Post-blitz RS should probe sectors with low intel before committing
- Total operations may increase (probes are small and fast)
- Area-weighted match should stay ≥85%
- All 6 benchmarks should pass

**Step 4: War-or-game insanity check**

Inspect `final_save.json` for:
- Zero morale-0 zombie brigades with >400 personnel
- No 50:1 casualty ratios
- Probe operations visible in operation history
- Corps `consecutive_probes` field populated
- Blind attacks into unknown sectors reduced

**Step 5: Commit**

```
feat(intel): verify intel-gated operations in 40w calibration
```

---

### Task 8: Update Documentation

**Files:**
- Modify: `docs/10_canon/Systems_Manual_v0_6_0.md` (§7.6 or new §7.7)
- Modify: `docs/20_engineering/AI_STRATEGY_SPECIFICATION.md`
- Modify: `docs/40_reports/CALIBRATION_MASTER.md`
- Append: `docs/PROJECT_LEDGER.md`

Document:
- Intel gate thresholds per faction
- RS blitz exemption
- Probe→full-attack escalation lifecycle
- MAX_CONSECUTIVE_PROBES anti-loop
- `consecutive_probes` state field
- Calibration impact of the change

---

## Summary

| Task | What | Estimated Size |
|------|------|---------------|
| 1 | Constants | 10 LOC |
| 2 | Intel confidence helper + tests | 30 LOC + 25 LOC tests |
| 3 | Gate function + tests | 25 LOC + 35 LOC tests |
| 4 | Wire into launch path | 30 LOC |
| 5 | Reset counter | 5 LOC |
| 6 | Integration tests | 60 LOC tests |
| 7 | Calibration run + verify | Run + inspect |
| 8 | Docs | 4 files |

**Total new code:** ~100 LOC engine + ~120 LOC tests.

**Risk:** RS w40 benchmark is razor-thin (0.505 vs 0.503). Intel gating could slightly reduce RS early operations. Mitigation: RS blitz phase (w0-12) is explicitly exempt. Post-blitz RS has JNA intel inheritance (0.60 initial confidence) which is above the 0.25 threshold — most RS sectors will clear the gate immediately.
