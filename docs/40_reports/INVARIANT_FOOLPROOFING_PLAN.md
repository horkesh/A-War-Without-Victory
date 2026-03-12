# Invariant Assertion Foolproofing Plan

**Date:** 2026-03-12
**Status:** COMPLETE (2026-03-12)
**Origin:** Recurring disconnected brigade bug (n598→n601→n635) proved that implicit invariants + multiple code paths + no centralized check = silent corruption. `assertBrigadeReachability()` fixed it permanently. This plan applies the same pattern to 5 other vulnerable systems.

**Template (proven with assertBrigadeReachability):**
1. Identify the implicit invariant
2. Enumerate all code paths that can violate it
3. Write a single post-pipeline assertion function
4. Wire it into `war_phases.ts` as a named pipeline step (or inline after the relevant step)
5. Add a diagnostic `.cjs` script for post-run validation
6. Run `/simplify` on changed code

---

## Phase 0: Determinism Fixes (unsorted iteration)

**Invariant:** All iteration over `Object.keys()` in `src/sim/` must use `.sort(strictCompare)` for deterministic output.

**Violations found (grep: `Object.keys(…formations)` and `Object.keys(…pc)` without `.sort`):**

| File | Line | Function | Impact |
|------|------|----------|--------|
| `bot_brigade_context.ts` | 172 | `countCorpsBrigadesAtOsid()` | Brigade density → movement decisions |
| `bot_brigade_context.ts` | 195 | `countFactionBrigadesAtOsid()` | Gap-fill movement |
| `bot_brigade_eval_attack.ts` | 428 | attack target scanning | Target selection order |
| `bot_corps_stance.ts` | 127, 129 | RBiH counteroffensive check | Stance flip |
| `compile_turn_summary.ts` | 32, 110 | Summary compilation | Report ordering |
| `faction_resilience.ts` | 47, 70 | Resilience calculation | Faction collapse |

**Work:** Add `.sort(strictCompare)` to each. No assertion needed — these are inline fixes.

**Implementation note:** `/simplify` review identified that `.sort()` on counting-only loops (countCorpsBrigadesAtOsid, countFactionBrigadesAtOsid, countFactionSettlements, totalSettlements, defender check) is pure overhead — sorting can't change a count. **Reverted** these 5 sorts. Only kept sorts where iteration order affects output (e.g. tie-breaking, first-match selection).

**Role:** Gameplay Programmer
**Risk:** LOW (read-only counting functions mostly; output order may change but logic is correct)

### /simplify checkpoint after Phase 0 ✓

---

## Phase 1a: Dissolved Brigades in Sectors

**Invariant:** No brigade with `status !== 'active'` or `lifecycle_status === 'destroyed'|'disbanded'` may appear in any sector's `assigned_brigade_ids` or `reserve_brigade_ids`.

**Code paths that modify formation status:**
1. `brigade_dissolution.ts` → `dissolveCombatIneffectiveBrigades()` — marks inactive
2. `formation_lifecycle.ts` → `updateFormationLifecycle()` — event-driven dissolution
3. `attack_resolution_osid.ts` → `forceRetreatWithPenalties()` — can set disrupted
4. `formation_spawn.ts` → recruitment — creates new active formations
5. `corps_front_sectors.ts` → `classifyBrigadesByTerritory()` — reads status, populates sectors

**Current gap:** `classifyBrigadesByTerritory()` checks `f.status !== 'active'` (line 502) but does NOT check `lifecycle_status`. A brigade with `status='active', lifecycle_status='destroyed'` would be assigned.

**Assertion function:**
```typescript
function assertSectorBrigadesActive(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
): void {
    const violations: string[] = [];
    for (const sec of sectors) {
        for (const bid of [...sec.assigned_brigade_ids, ...(sec.reserve_brigade_ids ?? [])]) {
            const f = formations[bid];
            if (!f) { violations.push(`${bid} in ${sec.sector_id}: formation not found`); continue; }
            if (f.status !== 'active') violations.push(`${bid} in ${sec.sector_id}: status=${f.status}`);
            if (f.lifecycle_status === 'destroyed' || f.lifecycle_status === 'disbanded')
                violations.push(`${bid} in ${sec.sector_id}: lifecycle=${f.lifecycle_status}`);
        }
    }
    if (violations.length > 0) console.error(`SECTOR BRIGADE STATUS VIOLATION:\n  ${violations.join('\n  ')}`);
}
```

**Wire into:** End of `buildCorpsFrontSectors()` in `corps_front_sectors.ts`, right after `assertBrigadeReachability()`.

**Diagnostic script:** `tools/check_sector_brigade_status.cjs`

**Role:** Systems Programmer
**Risk:** LOW (assertion-only, no behavioral change)

---

## Phase 1b: Political Control Event Consistency

**Invariant:** Every mutation of `state.political.political_controllers[osid]` must produce a corresponding entry in `state.political.control_events[]` with matching `settlement_id`, `from`, `to`, and `turn`.

**All mutation sites (7 total):**

| File | Line | Context |
|------|------|---------|
| `attack_resolution_osid.ts` | 1084 | Battle victory |
| `sector_offensive.ts` | 758 | Null-OSID auto-claim (movement) |
| `sector_offensive.ts` | 923 | Null-OSID auto-claim (execution) |
| `rear_pocket_consolidation.ts` | 134 | Pocket absorption |
| `jna_phantom_brigades.ts` | 228 | JNA phantom capture |
| `early_war/control_flip.ts` | 442 | Early-war referendum |
| `paramilitary_sweep.ts` (if exists) | — | Paramilitary capture |

**Assertion function:**
```typescript
function assertControlEventConsistency(state: GameState, turnStart: Record<string, string>): void {
    const pc = state.political.political_controllers ?? {};
    const events = state.political.control_events ?? [];
    const turn = state.meta?.turn ?? 0;
    const thisTurnEvents = events.filter(e => e.turn === turn);
    const eventedOsids = new Set(thisTurnEvents.map(e => e.settlement_id));
    const violations: string[] = [];
    for (const [osid, ctrl] of Object.entries(pc)) {
        const prev = turnStart[osid];
        if (prev !== ctrl && !eventedOsids.has(osid)) {
            violations.push(`${osid}: ${prev} → ${ctrl} with no control_event`);
        }
    }
    if (violations.length > 0) console.error(`CONTROL EVENT CONSISTENCY VIOLATION:\n  ${violations.join('\n  ')}`);
}
```

**Implementation note:** Requires snapshotting `political_controllers` at turn start. Add a shallow copy step early in the war pipeline:
```typescript
{ name: 'snapshot-political-controllers', run: (ctx) => {
    ctx._controlSnapshot = { ...ctx.state.political.political_controllers };
}}
```
Then assert at turn end:
```typescript
{ name: 'assert-control-events', run: (ctx) => {
    assertControlEventConsistency(ctx.state, ctx._controlSnapshot);
}}
```

**Diagnostic script:** `tools/check_control_event_consistency.cjs` — compares week-over-week `political_controllers` diffs against `control_events` in weekly_report.jsonl.

**Role:** Systems Programmer
**Risk:** LOW (assertion-only; snapshot is a shallow copy of ~744 string entries)

### /simplify checkpoint after Phase 1a + 1b ✓

**Implementation notes:**
- Phase 1a: `else if` on lifecycle_status check — only fires as invariant violation (destroyed but still status='active'). `/simplify` caught redundant double-check.
- Phase 1b: Typed accessors `getPoliticalControlSnapshot`/`setPoliticalControlSnapshot` in `turn_pipeline_types.ts` — `/simplify` caught `(context as any)._controlSnapshot` leak, replaced with typed pattern matching `getAARSnapshot`/`setAARSnapshot`.

---

## Phase 2a: Operation Lifecycle Cleanup

**Invariant:** All `participating_brigades` in active operations must be active formations. Execution-phase operations with zero active participants are stale.

**Implementation note:** Operations don't have `completed`/`failed` status — they're nulled out when done (`cmd.active_operation = null`). The actual invariant checks participant validity instead:
1. Every brigade ID in `participating_brigades` must exist in `formations`
2. Every such formation must have `status === 'active'`
3. Execution-phase ops with 0 active participants are stale (all dissolved mid-operation)

**Assertion function:** `src/sim/combat/assert_operation_lifecycle.ts` — `assertOperationLifecycle(state)`

**Wire into:** After `advance-sector-offensives` step in war_phases.ts. ✓

**Test:** `tests/operation_lifecycle_assertion.test.ts` (5 tests)

**Role:** Gameplay Programmer
**Risk:** LOW (assertion-only)

---

## Phase 2b: Formation Location in Friendly Territory

**Invariant:** Every active brigade's `location_osid` must be controlled by its own faction (exceptions: enclave brigades in contested territory, formations at null location).

**Relocation paths:**
1. `attack_resolution_osid.ts:1084-1102` — advance after victory
2. `attack_resolution_osid.ts:372` — combat retreat
3. `brigade_movement.ts` — column march
4. `formation_hq_relocation.ts` — HQ relocation when displaced
5. `apply_brigade_reposition.ts` — sector-driven repositioning
6. `bot_brigade_eval_front.ts` — sector march movement orders

**Current partial enforcement:** `displaceFormationsInEnemyTerritory()` runs only after attack resolution (war_phases.ts lines 527-540, 1150-1160, 1201-1220). Does NOT run after brigade movement or HQ relocation.

**Assertion function:** `src/sim/combat/assert_formation_territory.ts` — `assertFormationsInFriendlyTerritory(state)`

Respects RBiH↔HRHB alliance via `isFriendlyFaction()`. Skips null/undefined controllers (unclaimed territory during early war). Filters to brigade/og/operational_group only.

**Wire into:** Single end-of-turn assertion (before `assert-control-event-consistency`). ✓

Placed at end-of-turn rather than mid-pipeline to avoid false positives from transient states during turn processing (e.g. territory flips mid-combat that are resolved by displacement logic later in the pipeline).

**Test:** `tests/formation_territory_assertion.test.ts` (6 tests)

**Role:** Systems Programmer
**Risk:** LOW (end-of-turn assertion avoids transient false positives)

### /simplify checkpoint after Phase 2a + 2b ✓

---

## Phase 3: Wire Assertions into Turn Pipeline — MERGED INTO PHASE 1/2

Pipeline wiring was done inline during Phase 1 and 2 implementation rather than as a separate phase. All 4 assertion steps + 1 snapshot step are live in `war_phases.ts` (114→118 steps):

| Pipeline step | Position | Phase |
|---|---|---|
| `snapshot-political-controllers` | Early (before combat) | 1b |
| `assert-operation-lifecycle` | After `advance-sector-offensives` | 2a |
| `assert-formations-in-friendly-territory` | Late (before summary) | 2b |
| `assert-control-event-consistency` | Late (before summary) | 1b |

Phase 1a (`assertSectorBrigadesActive`) runs inside `buildCorpsFrontSectors()`, not as a separate pipeline step.

---

## Determinism Checklist (per AWWV determinism protocol)

- [x] No `Math.random()` introduced
- [x] No `Date.now()` or timestamps in any assertion
- [x] All `Object.keys()` / `Object.entries()` iterations in assertion code use `.sort(strictCompare)`
- [x] Assertions are pure reads — no state mutation
- [x] Assertions do not affect control flow (log only, no throw in production)
- [x] Snapshot (Phase 1b) is shallow copy of string map — deterministic

## Test Requirements

- [x] Phase 0: Existing tests pass (counting sorts reverted per /simplify)
- [x] Phase 1a: `sector_brigade_status_assertion.test.ts` — 4 tests (inactive, destroyed, missing, all-active)
- [x] Phase 1b: `control_event_consistency.test.ts` — 6 tests (flip w/o event, flip w/ event, no flips, removal, addition, snapshot isolation)
- [x] Phase 2a: `operation_lifecycle_assertion.test.ts` — 5 tests (ghost participant, inactive, zero-active execution, all-active, no ops)
- [x] Phase 2b: `formation_territory_assertion.test.ts` — 6 tests (enemy territory, own territory, inactive, no location, non-brigade, allied territory)
- [ ] All phases: 40w scenario must complete without assertion violations (pending calibration run)

## Ledger Notes

Each phase gets its own ledger entry:
- Phase 0: `fix(determinism): sort unsorted Object.keys iterations in bot AI`
- Phase 1: `feat(invariants): sector brigade status + control event consistency assertions`
- Phase 2: `feat(invariants): operation lifecycle + formation territory assertions`
- Phase 3: `refactor(pipeline): wire invariant assertions into war_phases.ts`

## Role Assignments

| Phase | Primary Role | Review Role |
|-------|-------------|-------------|
| 0 | Gameplay Programmer | Determinism Auditor |
| 1a | Systems Programmer | QA Engineer |
| 1b | Systems Programmer | QA Engineer |
| 2a | Gameplay Programmer | Systems Programmer |
| 2b | Systems Programmer | Gameplay Programmer |
| 3 | Technical Architect | Orchestrator (sign-off) |
