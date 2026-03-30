# P0 Combat Drought Fix — Plan Lifecycle + Doctrine Removal

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the v0.8 commander's post-w20 combat drought by repairing plan lifecycle bugs and removing doctrine phase railroads so combat emerges from mechanics.

**Architecture:** Four sequential calibration runs. Each fixes one bug class, verified independently. Gap B (stuck plans) → Gap C (empty targets) → Gap A (blind briefing) → Doctrine removal.

**Tech Stack:** TypeScript, Vitest, `npm run sim:scenario:run:40w` for calibration.

---

## Background

n1213 = 92.2% area-weighted, 22/22 anchors, but **war goes silent after week 20** (19 zero-combat weeks, 36 battles vs 62 baseline). Gap Finder identified 4 bugs that chain together to kill combat:

1. **Gap B**: Plans stuck in `executing` forever — no transition out, blocks new plans
2. **Gap C**: Opportunity plans have `target_osids: []` — EMIT skips them at `emit.ts:501`
3. **Gap A**: `briefing.previous_state` hardcoded null — threat detection blind
4. **Doctrine railroad**: `doctrine_stance === 'defensive'` blocks opportunity plans at `plan.ts:329`, but should be emergent

---

## Task 1: Fix Plan Lifecycle — `executing` Plans Must Complete (Gap B)

**Files:**
- Modify: `src/sim/combat/commander/plan.ts:110-225` (advanceExistingPlan)
- Test: `tests/commander/commander.test.ts`

**Problem:** When a plan transitions to `executing` (line 196), `advanceExistingPlan` is called next turn. The plan has `status: 'executing'`. It passes abandon checks (line 119), passes suspend checks (line 130), then `effectiveStatus` is `'executing'` (not suspended, line 153). The concentration check (line 174) requires `effectiveStatus === 'concentrating'` — fails. The launch check (line 190) requires `effectiveStatus === 'ready'` — fails. Falls through to line 206 and creates an `advancedPlan` with `status: 'executing'`. **The plan stays `executing` forever.**

**Step 1: Write the failing test**

Add to `tests/commander/commander.test.ts`:

```typescript
describe('plan lifecycle — executing plans', () => {
    it('should mark executing plan as completed after one turn', () => {
        const zones = [makeZoneAssessment({
            zone_id: 'zone_main' as ZoneId,
            posture: 'balanced',
            front_edge_count: 30,
            surplus_brigades: ['b1', 'b2', 'b3', 'b4'] as FormationId[],
        })];
        const forces = makeForceAssessment({ total_brigades: 8 });
        const surplusPool = makeSurplusPool(4);
        const briefing = makeBriefing({ doctrine_stance: 'balanced' });

        const executingPlan: CommanderPlan = {
            plan_id: 'plan_test_t5_opportunity',
            objective_description: 'offensive opportunity from zone_main',
            target_osids: ['op:jajce:jajce_2'],
            required_brigades: 3,
            assigned_brigades: ['b1', 'b2', 'b3'] as FormationId[],
            staging_zone: 'zone_main' as ZoneId,
            status: 'executing',
            created_turn: 5,
            target_ready_turn: 7,
            concentration_progress: 1.0,
            viability_score: 0.8,
            source: 'opportunity',
        };

        const result = managePlan(briefing, zones, forces, surplusPool, executingPlan, 8);

        // Executing plan should complete (return null) so new plans can be created
        expect(result.plan).toBeNull();
        expect(result.action).toBe('none');
    });

    it('should create new plan after executing plan completes', () => {
        const zones = [makeZoneAssessment({
            zone_id: 'zone_main' as ZoneId,
            posture: 'projecting',
            front_edge_count: 20,
            surplus_brigades: ['b1', 'b2', 'b3', 'b4'] as FormationId[],
        })];
        const forces = makeForceAssessment({ total_brigades: 8 });
        const surplusPool = makeSurplusPool(4);
        const briefing = makeBriefing({ doctrine_stance: 'balanced' });

        // No previous plan — should create new opportunity plan
        const result = managePlan(briefing, zones, forces, surplusPool, null, 10);

        expect(result.plan).not.toBeNull();
        expect(result.action).toBe('created');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commander/commander.test.ts -t "executing plans"`
Expected: FAIL — first test fails because `managePlan` returns `{ action: 'advanced', plan: { status: 'executing' } }` instead of completing.

**Step 3: Write minimal implementation**

In `src/sim/combat/commander/plan.ts`, modify `advanceExistingPlan` to handle `executing` status. Add this block immediately after the abandon/suspend checks (after line 150) and before the `effectiveStatus` computation (line 153):

```typescript
    // Executing plans have been handed to EMIT — they're done from the planner's perspective.
    // Clear the plan so new plans can be created next turn.
    if (plan.status === 'executing') {
        return {
            plan: null,
            action: 'none',
            reason: 'plan handed to execution pipeline',
            concentration_orders: [],
        };
    }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commander/commander.test.ts -t "executing plans"`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run tests/commander/commander.test.ts`
Expected: All tests pass (41 existing + 2 new)

**Step 6: Commit**

```bash
git add src/sim/combat/commander/plan.ts tests/commander/commander.test.ts
git commit -m "fix(commander): executing plans complete after one turn — unblocks new plan creation"
```

---

## Task 2: Populate Target OSIDs for Opportunity Plans (Gap C)

**Files:**
- Modify: `src/sim/combat/commander/plan.ts:337-384` (createOpportunityPlan)
- Modify: `src/sim/combat/commander/emit.ts:497-538` (buildOperations — fallback for empty targets)
- Test: `tests/commander/commander.test.ts`

**Problem:** `createOpportunityPlan` sets `target_osids: []` (line 360). EMIT's `buildOperations` requires `planDecision.plan.target_osids.length > 0` (line 501). Opportunity plans never produce CorpsOperations through the main path.

**Two-part fix:**
- (A) Have `createOpportunityPlan` derive targets from the staging zone's enemy OSIDs
- (B) As a safety net, have `buildOperations` handle empty targets by deriving them from sectors

**Step 1: Write the failing test**

```typescript
describe('opportunity plan target population', () => {
    it('should populate target_osids from staging zone enemy adjacency', () => {
        const zones = [makeZoneAssessment({
            zone_id: 'zone_main' as ZoneId,
            posture: 'projecting',
            front_edge_count: 20,
            surplus_brigades: ['b1', 'b2', 'b3', 'b4'] as FormationId[],
            enemy_adjacent_osids: ['op:jajce:jajce_2', 'op:jajce:donji_vakuf_2'],
        })];
        const forces = makeForceAssessment({ total_brigades: 8 });
        const surplusPool = makeSurplusPool(4);
        const briefing = makeBriefing({ doctrine_stance: 'balanced' });

        const result = managePlan(briefing, zones, forces, surplusPool, null, 1);

        expect(result.plan).not.toBeNull();
        expect(result.plan!.target_osids.length).toBeGreaterThan(0);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commander/commander.test.ts -t "target population"`
Expected: FAIL — `target_osids` is empty.

**Step 3A: Add `enemy_adjacent_osids` to ZoneAssessment**

In `src/sim/combat/commander/commander_state.ts`, add to the `ZoneAssessment` interface:

```typescript
    /** Enemy OSIDs adjacent to this zone's front (for opportunity targeting). */
    readonly enemy_adjacent_osids: readonly string[];
```

In `src/sim/combat/commander/zone_detection.ts`, populate this field during zone detection from the zone's front edges — collect enemy OSIDs from `sub_segments.enemy_osids` for all sectors overlapping the zone. Sort with `strictCompare`.

**Step 3B: Use enemy adjacency in `createOpportunityPlan`**

In `src/sim/combat/commander/plan.ts`, change line 360 from:

```typescript
        target_osids: [],  // EMIT phase will determine specific targets
```

To:

```typescript
        target_osids: selectOpportunityTargets(stagingZone, requiredBrigades),
```

Add helper function:

```typescript
/**
 * Select opportunity targets from the staging zone's enemy-adjacent OSIDs.
 * Cap at OBJECTIVES_PER_BRIGADE * required_brigades, max MAX_OBJECTIVES.
 * Sorted deterministically.
 */
function selectOpportunityTargets(
    stagingZone: ZoneAssessment,
    requiredBrigades: number,
): string[] {
    const enemyOsids = stagingZone.enemy_adjacent_osids;
    if (enemyOsids.length === 0) return [];

    const maxObjectives = Math.max(1, Math.min(6, Math.floor(requiredBrigades * 0.5)));
    return [...enemyOsids].sort(strictCompare).slice(0, maxObjectives);
}
```

**Step 3C: Add EMIT fallback for empty targets**

In `src/sim/combat/commander/emit.ts`, modify `buildOperations` (line 498-501). Change:

```typescript
        planDecision.plan.target_osids.length > 0
```

To:

```typescript
        (planDecision.plan.target_osids.length > 0 || planDecision.plan.source === 'opportunity')
```

And when `target_osids` is empty but source is opportunity, derive objectives from the corps's sector enemy OSIDs:

```typescript
        const objectives = planDecision.plan.target_osids.length > 0
            ? [...planDecision.plan.target_osids].sort(strictCompare)
            : deriveTargetsFromSectors(briefing, Math.floor(participatingBrigades.length * 0.5));
```

Add helper:

```typescript
function deriveTargetsFromSectors(briefing: CommanderBriefing, maxTargets: number): string[] {
    const targets = new Set<string>();
    const corpsSectors = briefing.sectors
        .filter(s => s.corps_id === briefing.corps_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    for (const sector of corpsSectors) {
        for (const subSeg of sector.sub_segments) {
            for (const eo of subSeg.enemy_osids) {
                targets.add(eo);
            }
        }
    }

    return [...targets].sort(strictCompare).slice(0, Math.max(1, maxTargets));
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/commander/commander.test.ts -t "target population"`
Expected: PASS

**Step 5: Run full test suite + typecheck**

Run: `npx tsc --noEmit ; npx vitest run tests/commander/commander.test.ts`
Expected: Clean

**Step 6: Commit**

```bash
git add src/sim/combat/commander/plan.ts src/sim/combat/commander/emit.ts src/sim/combat/commander/commander_state.ts src/sim/combat/commander/zone_detection.ts tests/commander/commander.test.ts
git commit -m "fix(commander): populate opportunity plan targets from zone enemy adjacency"
```

---

## Task 3: Wire `briefing.previous_state` From GameState (Gap A)

**Files:**
- Modify: `src/sim/combat/commander/briefing.ts:275-276`
- Test: `tests/commander/commander.test.ts`

**Problem:** Line 276 hardcodes `const previousState: CommanderState | null = null`. The `commander_loop.ts` reads the real state at line 108-109, but functions consuming `briefing.previous_state` (like `checkSuspendConditions` in `plan.ts:437` and `assessThreats` in `assess.ts:74`) are blind.

**Step 1: Write the failing test**

```typescript
describe('briefing previous_state', () => {
    it('should pass previous commander state through briefing', () => {
        // This is an integration-level test — verify the briefing builder
        // reads commander_state from corps_command when available.
        // Tested via the commander loop's full pipeline.
    });
});
```

Note: This is best tested as an integration test. For the unit level, we verify that `buildBriefing` accepts and passes through the state.

**Step 2: Modify `buildBriefing` to accept and use previous state**

In `src/sim/combat/commander/briefing.ts`, the function needs access to the corps's `commander_state`. It already reads `state.military.corps_command?.[corpsId]` at line 234. Change line 275-276 from:

```typescript
    // 9. Previous commander state (not yet on CorpsCommandState — return null)
    const previousState: CommanderState | null = null;
```

To:

```typescript
    // 9. Previous commander state from last turn's persisted state
    const previousState: CommanderState | null = corpsCmd?.commander_state ?? null;
```

This is a one-line fix. The `corpsCmd` variable (line 234) already holds `state.military.corps_command?.[corpsId]`, and `commander_state` is persisted there by `applyCommanderOutput` at `commander_loop.ts:159`.

**Step 3: Run full test suite + typecheck**

Run: `npx tsc --noEmit ; npx vitest run tests/commander/commander.test.ts`
Expected: Clean (no existing tests break because previous_state being null was the default)

**Step 4: Commit**

```bash
git add src/sim/combat/commander/briefing.ts
git commit -m "fix(commander): wire briefing.previous_state from persisted GameState"
```

---

## Task 4: Remove Doctrine Phase Railroads

**Files:**
- Modify: `src/sim/combat/commander/plan.ts:328-331` (remove defensive gate)
- Modify: `src/sim/combat/commander/emit.ts:301-316` (remove stance modifier from aggression)
- Modify: `src/sim/combat/commander/briefing.ts:256-258` (stop reading doctrine stance)
- Modify: `src/sim/combat/commander/commander_state.ts:268` (deprecate field)
- Test: `tests/commander/commander.test.ts`
- **DO NOT** modify: `data/scenarios/timelines/apr1992.json` or `src/sim/combat/bot_strategy.ts` — the old system still uses these behind the feature flag.

**Problem:** `doctrine_stance` from timeline JSON overrides the commander's emergent decision-making. RS is "offensive" (doesn't cause the drought), but RBiH is "defensive" w0-15 (blocks ALL opportunity plans via `plan.ts:329`). The commander should decide based on zone posture, force balance, and personality — not a hardcoded week schedule.

**Design decision:** The commander already has mechanics that produce the right behavior emergently:
- **RBiH early defense**: Low intel (0.05), no heavy weapons, disorganized → commander can't find surplus → no ops naturally
- **RS early aggression**: JNA inheritance, full equipment, trained → commander finds surplus → ops naturally
- The doctrine `max_attack_share_override` and `aggression_modifier` become unnecessary if the commander's own allocation and personality drive behavior.

**Step 1: Write the failing test**

```typescript
describe('doctrine removal — emergent behavior', () => {
    it('should create opportunity plans even with defensive doctrine (commander decides)', () => {
        const zones = [makeZoneAssessment({
            zone_id: 'zone_main' as ZoneId,
            posture: 'projecting',
            front_edge_count: 15,
            surplus_brigades: ['b1', 'b2', 'b3', 'b4'] as FormationId[],
            enemy_adjacent_osids: ['op:target:target_1'],
        })];
        const forces = makeForceAssessment({ total_brigades: 8 });
        const surplusPool = makeSurplusPool(4);
        // Even with defensive doctrine, commander should create plans
        // if zone assessment shows surplus and opportunity
        const briefing = makeBriefing({ doctrine_stance: 'defensive' });

        const result = managePlan(briefing, zones, forces, surplusPool, null, 5);

        expect(result.plan).not.toBeNull();
        expect(result.action).toBe('created');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commander/commander.test.ts -t "doctrine removal"`
Expected: FAIL — `plan.ts:329` blocks defensive doctrine from creating opportunity plans.

**Step 3: Remove the doctrine gate in `plan.ts`**

In `src/sim/combat/commander/plan.ts`, remove lines 328-331:

```typescript
    // REMOVED: Doctrine phase no longer gates opportunity plans.
    // The commander decides based on zone posture, surplus, and personality.
    // A corps with surplus brigades in a projecting zone SHOULD attack,
    // regardless of what a timeline JSON says.
```

Replace with nothing — just delete the block. The function continues to `const bestZone = projectingZones[0]!;`.

**Step 4: Remove doctrine stance from aggression modifier in `emit.ts`**

In `src/sim/combat/commander/emit.ts`, modify `computeAggressionModifier` (line 302-316). Remove the doctrine stance modifier — aggression comes from personality only:

```typescript
function computeAggressionModifier(personality: OfficerPersonality): number {
    // Aggression from personality only. Zone posture already controls
    // min_attack_outcome and garrison allocation — no need for doctrine overlay.
    return (personality.aggression - 0.4) * 0.375;
}
```

Update the call site at line 182 to remove the second argument:

```typescript
    const aggressionModifier = computeAggressionModifier(personality);
```

**Step 5: Stop reading doctrine_stance in briefing**

In `src/sim/combat/commander/briefing.ts`, change lines 256-258. Instead of reading from `getActiveDoctrinePhase`, set a neutral default:

```typescript
    // 5. Doctrine stance — deprecated. Commander decides from zone posture + personality.
    // Kept as 'balanced' for backward compatibility with any downstream checks.
    const doctrineStance = 'balanced';
```

Note: Keep the `doctrine_stance` field on `CommanderBriefing` for now — removing it would require touching many files. Just make it always `'balanced'` so it has no effect.

**Step 6: Run test to verify it passes**

Run: `npx vitest run tests/commander/commander.test.ts -t "doctrine removal"`
Expected: PASS

**Step 7: Run full test suite + typecheck + smoke test triad**

Run: `npx tsc --noEmit ; npx vitest run ; npm run desktop:map:build`
Expected: Clean. Some existing tests that checked doctrine behavior may need updating.

**Step 8: Commit**

```bash
git add src/sim/combat/commander/plan.ts src/sim/combat/commander/emit.ts src/sim/combat/commander/briefing.ts tests/commander/commander.test.ts
git commit -m "feat(commander): remove doctrine phase railroads — combat emerges from mechanics"
```

---

## Task 5: Calibration Run + Widen Opportunity Eligibility

**Files:**
- Modify: `src/sim/combat/commander/plan.ts:309-318` (widen to balanced zones)
- Modify: `src/sim/combat/commander/emit.ts:544-545` (lower probe initiative threshold)

**After Tasks 1-4 are committed**, run a 40w calibration:

```bash
npm run sim:scenario:run:40w
```

Verify: area-weighted >= 90%, 22/22 anchors, battles > 36.

**If combat is still low** (likely — the fixes above unblock the pipeline but opportunity plans still require `projecting` posture), apply the Plan agent's recommendation:

**Step 1: Widen opportunity eligibility**

In `plan.ts` `tryCreateFromOpportunity`, change lines 309-318 from:

```typescript
    const projectingZones = zones
        .filter(z => z.posture === 'projecting' && z.surplus_brigades.length >= MIN_BRIGADES_FOR_PLAN)
```

To:

```typescript
    const eligibleZones = zones
        .filter(z =>
            (z.posture === 'projecting' || z.posture === 'balanced') &&
            z.surplus_brigades.length >= MIN_BRIGADES_FOR_PLAN
        )
        .sort((a, b) => {
            // Prefer projecting over balanced
            const posturePriority = (p: string) => p === 'projecting' ? 0 : 1;
            const posDiff = posturePriority(a.posture) - posturePriority(b.posture);
            if (posDiff !== 0) return posDiff;
            const diff = b.surplus_brigades.length - a.surplus_brigades.length;
            if (diff !== 0) return diff;
            return strictCompare(a.zone_id, b.zone_id);
        });
```

Update references from `projectingZones` to `eligibleZones` on lines 318, 324, 333.

**Step 2: Lower probe initiative threshold**

In `emit.ts` line 545, change:

```typescript
        personality.initiative > 0.6
```

To:

```typescript
        personality.initiative > 0.3
```

**Step 3: Run calibration again**

```bash
npm run sim:scenario:run:40w
```

Target: battles > 50, area-weighted >= 90%, 22/22 anchors.

**Step 4: Commit**

```bash
git add src/sim/combat/commander/plan.ts src/sim/combat/commander/emit.ts
git commit -m "feat(commander): widen opportunity eligibility to balanced zones + lower probe threshold"
```

---

## Task 6: Calibration Validation + War-or-Game

After all fixes:

1. Run 40w scenario: `npm run sim:scenario:run:40w`
2. Verify:
   - Area-weighted >= 90% (target: 92%+)
   - 22/22 anchors PASS
   - 6/6 benchmarks PASS
   - Battles > 50 (target: 60+)
   - No 5+ consecutive zero-combat weeks
   - Sarajevo HELD, Gorazde HELD
3. If passing, invoke `/war-or-game` for approval
4. Update `docs/40_reports/CALIBRATION_MASTER.md` with results
5. Update `docs/PROJECT_LEDGER.md`

---

## Risk Mitigation

- **Over-aggression after doctrine removal**: Mitigated by garrison-first allocation (Grigsby two-pass). Surplus is computed AFTER garrison is locked. Corps under pressure naturally have zero surplus.
- **Sarajevo/Gorazde regression**: Both are besieged zones. Besieged corps never generate opportunity plans. Garrison locks prevent stripping.
- **One change per calibration**: Tasks 1-3 are bug fixes (not behavioral changes) — they can be committed together. Task 4 (doctrine removal) is the behavioral change requiring its own calibration. Task 5 (widen eligibility) is a second behavioral change if needed.
- **Rollback**: `USE_COMMANDER_LOOP = false` in `bot_corps_ai.ts` reverts to old system instantly.
