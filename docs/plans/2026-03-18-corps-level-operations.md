# Corps-Level Operations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple operations from sectors — corps commander selects targets from full corps directive, assigns brigades from entire corps, stages from any corps territory. Contiguity enforced from corps front, not sector front.

**Architecture:** Replace the sector-iteration loop in `generateCorpsDirectives()` with a single corps-level operation evaluation. `evaluateSectorOffensiveLaunch()` becomes `evaluateCorpsOffensiveLaunch()` — takes corps-wide targets and brigades instead of sector-scoped ones. Existing contiguity chain (n914) seeds from all corps friendly OSIDs instead of one sector. Pre-planned ops unchanged. Probes remain sector-scoped (small, recon-focused).

**Tech Stack:** TypeScript, Vitest, deterministic iteration (strictCompare)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/sim/combat/sector_offensive.ts` | Modify | Rename `evaluateSectorOffensiveLaunch` → `evaluateCorpsOffensiveLaunch`. Accept corps-wide brigades + targets. Seed contiguity from all corps sectors. Staging from nearest friendly OSID to first objective. |
| `src/sim/combat/bot_corps_directives.ts` | Modify | Replace sector loop (lines 1679-1830) with single corps-level launch. Gather all corps brigades + all enemy OSIDs across all sectors. Keep probe logic sector-scoped. |
| `src/state/game_state.ts` | Check only | `CorpsOperation.sector_id` field — make optional (ops no longer bound to one sector) |
| `tests/corps_level_operations.test.ts` | Create | Test corps-level launch, contiguity from corps front, brigade selection across sectors |

## Key Design Decisions

1. **Probes stay sector-scoped** — probes are small recon-by-force actions at a specific front segment. They don't need corps-level scope.
2. **`sector_id` on CorpsOperation becomes optional** — corps-level ops span multiple sectors. Set to the primary sector (where most objectives are) for backward compatibility.
3. **Brigade selection: all corps subordinates** — not just brigades in one sector's territory. Filter by: active, not disrupted, not in another op, personnel ≥ 400.
4. **Staging OSID: nearest to first objective** — pick the friendly OSID closest (by BFS) to the first contiguous objective.
5. **Contiguity seed: all corps friendly OSIDs** — union of all sectors' friendly_osids for this corps.
6. **Cooldown check: corps-level** — no longer per-sector theater check. One op per corps, cooldown applies to the whole corps.

---

## Chunk 1: Core Refactor

### Task 1: Make CorpsOperation.sector_id optional

**Files:**
- Modify: `src/state/game_state.ts` — `CorpsOperation.sector_id` field

- [ ] **Step 1: Check all consumers of `sector_id`**

Grep for `\.sector_id` in `src/sim/combat/` and `src/ui/` to find all consumers. Many will need `?.` null checks.

- [ ] **Step 2: Make field optional**

In `game_state.ts`, change `sector_id: string` to `sector_id?: string` on `CorpsOperation`.

- [ ] **Step 3: Fix type errors**

Add `?.` or `?? ''` at every consumer that now has a type error.

- [ ] **Step 4: Typecheck + test**

Run: `npx tsc --noEmit` then `npx vitest run`

- [ ] **Step 5: Commit**

```
fix(types): make CorpsOperation.sector_id optional for corps-level ops
```

### Task 2: Rename and refactor evaluateSectorOffensiveLaunch

**Files:**
- Modify: `src/sim/combat/sector_offensive.ts`

- [ ] **Step 1: Rename function**

`evaluateSectorOffensiveLaunch` → `evaluateCorpsOffensiveLaunch`. Update signature:

```typescript
export function evaluateCorpsOffensiveLaunch(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    corpsBrigadeIds: FormationId[],       // ALL corps brigades, not sector-scoped
    corpsEnemyOsids: string[],            // ALL enemy OSIDs across all corps sectors
    offensiveTargets: string[],
    supplyByOsid?: SupplyStateByOsidReport | null,
    minAttackOutcome?: CorpsOperation['min_attack_outcome'],
    primarySectorId?: string,             // For backward compat / UI display
): CorpsOperation | null
```

Remove `sectorId` as required param. Remove `sectorBrigadeIds` / `sectorEnemyOsids` params — replaced by corps-wide versions.

- [ ] **Step 2: Update contiguity seed**

Change contiguity seed from one sector's friendly_osids to ALL corps sectors' friendly_osids:

```typescript
// Seed: ALL corps friendly front OSIDs (not just one sector)
const allSectors = state.military.corps_front_sectors ?? {};
const reachable = new Set<string>();
for (const [sid, sec] of Object.entries(allSectors)) {
    if (sec.corps_id !== corpsId) continue;
    for (const ss of sec.sub_segments) {
        for (const fo of ss.friendly_osids) reachable.add(fo);
    }
}
```

- [ ] **Step 3: Update staging OSID**

Pick staging from nearest corps friendly OSID to first objective (not just first sector's friendly):

```typescript
// Staging: nearest friendly OSID to first objective via BFS
let stagingOsid: string | undefined;
const firstObj = objectives[0];
if (firstObj) {
    const neighbors = osidAdj.get(firstObj);
    if (neighbors) {
        for (const n of neighbors) {
            if (reachable.has(n)) { stagingOsid = n; break; }
        }
    }
}
if (!stagingOsid) {
    // Fallback: first friendly OSID in corps territory (deterministic)
    const sorted = [...reachable].sort(strictCompare);
    stagingOsid = sorted[0];
}
```

- [ ] **Step 4: Set sector_id as optional**

```typescript
return {
    // ...
    sector_id: primarySectorId, // Optional — corps-level ops may span sectors
    // ...
};
```

- [ ] **Step 5: Update re-export and old name**

Keep old name as deprecated alias for backward compatibility:
```typescript
/** @deprecated Use evaluateCorpsOffensiveLaunch */
export const evaluateSectorOffensiveLaunch = evaluateCorpsOffensiveLaunch;
```

- [ ] **Step 6: Typecheck + test**

Run: `npx tsc --noEmit` then `npx vitest run`

- [ ] **Step 7: Commit**

```
refactor(ops): evaluateCorpsOffensiveLaunch — corps-level target selection
```

### Task 3: Refactor bot_corps_directives.ts caller

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts` (lines ~1679-1830)

- [ ] **Step 1: Gather corps-wide data before the loop**

Before the sector loop, collect ALL corps brigades and ALL enemy OSIDs:

```typescript
// Corps-level brigade pool: all active subordinates eligible for operations
const corpsBrigadeIds = subordinates
    .filter(b => b.status === 'active' && (b.personnel ?? 0) >= 400
        && !(b.disrupted_turns && b.disrupted_turns > 0))
    .map(b => b.id)
    .sort(strictCompare);

// Corps-level enemy OSIDs: union across all corps sectors
const corpsEnemyOsids = new Set<string>();
for (const sec of corpsSectors) {
    for (const ss of sec.sub_segments) {
        for (const eo of ss.enemy_osids) corpsEnemyOsids.add(eo);
    }
}
const allCorpsEnemyOsids = [...corpsEnemyOsids].sort(strictCompare);
```

- [ ] **Step 2: Replace sector loop with single corps-level launch**

Replace the `for (const sec of sortedLaunchSectors)` loop body (lines 1679-1830) with:

```typescript
// Corps-level operation launch (replaces per-sector loop)
if (!inCooldown || /* same-theater check at corps level */ true) {
    // Reachable targets: adjacent to at least one friendly OSID
    const reachableTargets = offensiveTargets.filter(target => {
        const neighbors = adjacency.get(target) ?? [];
        return neighbors.some(n => getPoliticalControllerOSID(state, n, reverseMap) === faction);
    });

    if (reachableTargets.length >= 1 && corpsBrigadeIds.length >= MIN_BRIGADES_FOR_SECTOR_ATTACK) {
        // Apply supply cap, army HQ override caps...
        let finalBrigadeIds = corpsBrigadeIds;
        if (maxOpSize > 0 && maxOpSize < finalBrigadeIds.length) {
            finalBrigadeIds = finalBrigadeIds.slice(0, maxOpSize);
        }
        // ... (army HQ probe/feint caps)

        const op = evaluateCorpsOffensiveLaunch(
            state, corps.id, faction,
            finalBrigadeIds, allCorpsEnemyOsids, reachableTargets,
            supplyByOsid, minAttackOutcomeForOpLaunch,
            sortedLaunchSectors[0]?.sector_id  // Primary sector for display
        );
        if (op) {
            cmd.active_operation = op;
            assignOperationCommander(state, op, corps.id, faction);
        }
    }
}
```

- [ ] **Step 3: Keep probe logic sector-scoped**

The probe section (lines 1633-1677) stays as-is — probes are sector-level recon actions.

- [ ] **Step 4: Update cooldown check**

Cooldown is now corps-level (one op per corps). Remove the per-sector theater adjacency check.

- [ ] **Step 5: Typecheck + test**

Run: `npx tsc --noEmit` then `npx vitest run`

- [ ] **Step 6: Run 40w calibration**

Run: `npm run sim:scenario:run:40w`
Check: area-weighted ≥ 89%, anchors 12+/13, no regressions

- [ ] **Step 7: Commit**

```
feat(ops): corps-level operation launch — brigades from entire corps
```

### Task 4: Write tests

**Files:**
- Create: `tests/corps_level_operations.test.ts`

- [ ] **Step 1: Test contiguity from corps front**

Set up a state with 2 sectors in one corps. Target OSID adjacent to sector A's front but not sector B's. Verify it's selected as an objective.

- [ ] **Step 2: Test brigade selection across sectors**

Brigades in sector A and sector B should both be eligible for the operation.

- [ ] **Step 3: Test non-contiguous targets rejected**

Target OSID not adjacent to any corps friendly OSID should be filtered out.

- [ ] **Step 4: Test pre-planned ops exempt**

Pre-planned operations should not have contiguity filtering applied.

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`

- [ ] **Step 6: Commit**

```
test(ops): corps-level operation launch tests
```

---

## Chunk 2: Cleanup and Verification

### Task 5: Update downstream consumers

**Files:**
- Check: `src/sim/combat/bot_brigade_ai_osid.ts` — brigade attack logic references `active_operation.sector_id`
- Check: `src/sim/combat/operation_preparation.ts` — preparation system
- Check: `src/ui/map/` — UI displays operation sector

- [ ] **Step 1: Grep for all `active_operation.sector_id` usages**
- [ ] **Step 2: Add null checks where needed**
- [ ] **Step 3: Typecheck + test**
- [ ] **Step 4: Commit**

### Task 6: Update documentation

- [ ] **Step 1: Update working-on.md with results**
- [ ] **Step 2: Append to PROJECT_LEDGER.md**
- [ ] **Step 3: Update memory if needed**
- [ ] **Step 4: Commit and push**
