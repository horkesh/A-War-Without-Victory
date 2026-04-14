# Attack Resolution OSID Decomposition — Tranche 1

**Date:** 2026-04-13
**Program:** v0.8-to-v0.9 god-file decomposition tranche 1
**Type:** Maintainability / no-behavior-drift decomposition
**Baseline hash:** `16badcf4f470d2ce` (n1564, HEAD original file, no extraction)
**Post-extraction hash:** `16badcf4f470d2ce` (n1563, extraction applied) — **IDENTICAL**

---

## Codex Review & Repair

Initial submission was **REJECTED** by Codex review. The extraction was performed on a dirty worktree that contained three uncommitted behavioral changes in `attack_resolution_osid.ts`, plus three matching test additions in `probe_territory_flip.test.ts`. These were carried into the extraction diff, making the "no behavior change" claim dishonest.

### Behavioral changes found and reverted

| Change | Classification | Action |
|--------|---------------|--------|
| `adjacency.get(loc)` → `getTacticalAdjacentOsids(...)` in attacker filtering | Behavior change (attacker eligibility) | **Reverted to HEAD** |
| Force `outcome = 'costly_victory'` on empty non-probe enemy territory | Behavior change (outcome override) | **Reverted to HEAD** |
| `!isProbeOp` blanket flip guard (removed `defenderlessEnemyTile` exception) | Behavior change (probe flip semantics) | **Reverted to HEAD** |
| `attackerCorpsId`/`activeOp`/`isProbeOp` hoisted to top of loop | Code motion enabling behavioral changes | **Reverted to HEAD position** |
| 3 test additions/modifications in `probe_territory_flip.test.ts` | Tests for the behavioral changes | **Reverted to HEAD** |

These behavioral changes and their tests belong to a separate lane (probe/territory semantics), not this decomposition tranche. They remain as uncommitted worktree state for future work.

### Proof methodology corrected

The original baseline (n1560, `379fdd5cc3f5ce48`) was taken with the dirty behavioral changes present — it was invalid as a decomposition baseline. The corrected proof:

1. Restored HEAD's original `attack_resolution_osid.ts` (no extraction, no behavioral changes)
2. Ran scenario → n1564 hash `16badcf4f470d2ce`
3. Applied pure extraction only
4. Ran scenario → n1563 hash `16badcf4f470d2ce`
5. **Match confirmed — zero drift from pure extraction**

---

## Candidate Decomposition Seams Considered

After auditing the 1,936-line `attack_resolution_osid.ts`, four ownership families were identified:

| Family | Lines | Risk | Decision |
|--------|-------|------|----------|
| Retreat & displacement helpers | ~440 | Low — pure helpers, clear inputs/outputs, two already exported | **Extracted** |
| Battle report types + snap events | ~90 | Minimal — pure type definitions + one helper | **Extracted** |
| Equipment battle effects (loss, scavenge, capture) | ~350 | Medium — inline in main loop, requires refactoring into callable helpers | **Deferred to tranche 2** |
| Post-battle effects (morale, experience, officer quality) | ~200 | Medium — inline, tightly coupled to outcome variable scope | **Deferred to tranche 2+** |

## Exact Seams Chosen

### Seam 1: Retreat & Displacement → `attack_retreat_displacement.ts` (502 lines)

Extracted functions:
- `resetFormationEntrenchment()`
- `applyDefeatPenalties()`
- `buildSlopeByOsid()`
- `bfsDistanceToCapital()`
- `getFriendlyRetreatDestinations()`
- `allocateIntegerByWeights()`
- `findEmergencyRetreatOsid()` (was already exported)
- `buildFriendlySet()`
- `buildFriendlyComponentsLocal()`
- `findLargestComponent()`
- `forceRetreatWithPenalties()`
- `displaceFormationsInEnemyTerritory()` (was already exported)
- `applyPersonnelLoss()`

Extracted constants:
- `SECTOR_ROUT_DISRUPTED_TURNS`, `SECTOR_ROUT_COHESION_LOSS`, `SECTOR_ROUT_PERSONNEL_RETAIN`
- `EMERGENCY_RETREAT_BFS_MAX_HOPS`, `EMERGENCY_RETREAT_PERSONNEL_RETAIN`, `EMERGENCY_RETREAT_COHESION_LOSS`, `EMERGENCY_RETREAT_DISRUPTED_TURNS`

Extracted interface:
- `ForceRetreatOptions`

### Seam 2: Battle Report Types → `attack_resolution_types.ts` (102 lines)

Extracted types:
- `AttackResolutionOsidSnapEventType`
- `AttackResolutionOsidSnapEvent`
- `AttackResolutionOsidReport`
- `DefenderContribution`
- `AttackOutcome` (backward-compat alias)
- `CombatOutcome` re-export

Extracted function:
- `pushSnapEvent()`

## Canonical Owner Before Extraction

**Single file:** `src/sim/combat/attack_resolution_osid.ts` (1,936 lines) — owned everything: retreat logic, displacement, type definitions, snap events, the main resolver, equipment effects, post-battle effects, and all associated constants.

## Canonical Owners After Extraction

| Domain | Owner | Lines |
|--------|-------|-------|
| Retreat, displacement, emergency repositioning | `src/sim/combat/attack_retreat_displacement.ts` | 502 |
| Battle report types, snap event types, defender contribution | `src/sim/combat/attack_resolution_types.ts` | 102 |
| Main resolver orchestration, combat math application, control flip, morale, equipment, experience, recording | `src/sim/combat/attack_resolution_osid.ts` | ~1,430 |

## Demoted Paths

- Inline retreat/displacement code in attack_resolution_osid.ts → now imports from attack_retreat_displacement.ts
- Inline type definitions in attack_resolution_osid.ts → now imports from attack_resolution_types.ts
- Both original export sites preserved as backward-compat re-exports (consumers need not change imports)

## Exact Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/attack_retreat_displacement.ts` | **NEW** — 502 lines, retreat & displacement ownership |
| `src/sim/combat/attack_resolution_types.ts` | **NEW** — 102 lines, type definitions |
| `src/sim/combat/attack_resolution_osid.ts` | **MODIFIED** — 1,936 → ~1,430 lines (-26%). Imports from new modules, backward-compat re-exports retained. Three pre-existing dirty worktree behavioral changes reverted to HEAD. |
| `tests/probe_territory_flip.test.ts` | **REVERTED TO HEAD** — three dirty worktree test additions removed (belong to separate behavioral lane) |

## Exact Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm run test:vitest` | PASS — 290/290 files, 3311/3311 tests |
| `npm run build` | PASS |
| `npm run desktop:map:build` | PASS |
| 40w scenario hash (n1564 HEAD baseline) | `16badcf4f470d2ce` |
| 40w scenario hash (n1563 pure extraction) | `16badcf4f470d2ce` |
| **Hash match** | **IDENTICAL — zero behavior drift** |

## Residual Maintainability Risks in attack_resolution_osid.ts

The file is still ~1,430 lines — materially smaller but still a large file. Remaining ownership families that could be extracted in future tranches:

1. **Equipment battle effects** (~350 lines): equipment loss calculation, battlefield scavenging with fractional accumulator, equipment capture from retreating forces, abandoned equipment on uncontested occupation. Currently inline in the main resolver loop — extraction requires refactoring into callable helper functions with explicit parameter passing.

2. **Post-battle state effects** (~200 lines): experience gain, officer quality loss, morale-based retreat resistance / homeland determination, post-battle morale adjustments. Tightly coupled to outcome variables from the main loop scope.

3. **The main resolver loop itself** remains a single ~1,200-line function. Even after extracting helpers, the `resolveAttackOrdersOsid()` function is still large. Future tranches could break it into per-target-OSID resolution + orchestration.

## Uncommitted Behavioral Changes (not part of this tranche)

Three behavioral changes remain in the dirty worktree as uncommitted modifications. They form a coherent probe/territory-semantics lane that should be evaluated and landed separately:

1. **Tactical adjacency for attacker eligibility** — use `getTacticalAdjacentOsids()` instead of raw graph adjacency
2. **Forced costly_victory on empty non-probe territory** — militia/garrison can't hold political control against deliberate attack
3. **Blanket probe no-flip** — probes never flip territory (removes defenderless exception)

These changes have matching tests in `probe_territory_flip.test.ts`. They should be landed as their own documented behavioral lane with appropriate rationale, tests, and scenario proof.

## Recommended Next Tranche Seam

**Equipment battle effects extraction** is the safest next target:
- Domain: equipment loss, scavenging, capture, abandoned equipment
- Target: `attack_equipment_effects.ts`
- Risk: Medium — requires creating helper functions with explicit parameter signatures for what is currently inline code accessing loop-scoped variables
- Proof: same-hash scenario comparison

## Architecture Lesson

1. **Never extract from a dirty worktree without auditing the diff against HEAD first.** Pre-existing uncommitted behavioral changes will be carried into the extraction diff and contaminate a "no behavior change" claim.

2. **The correct baseline for a decomposition proof is HEAD, not the working tree.** A baseline taken from a dirty worktree includes all uncommitted changes — comparing against it proves nothing about the extraction itself.

3. Pure-helper extraction (functions with clear inputs/outputs, no shared mutable state) is the safest decomposition pattern. Type extraction is trivially safe. Both can be proven with same-hash scenario comparison against HEAD.
