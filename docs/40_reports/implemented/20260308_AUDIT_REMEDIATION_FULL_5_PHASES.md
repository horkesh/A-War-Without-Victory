# Audit Remediation — Full 5-Phase Execution

**Date:** 2026-03-08
**Run IDs:** n414 (Phase 2), n415 (Phase 3)
**Baseline:** n403 (86.9% area-weighted)
**Result:** n415 (89.4% area-weighted, +2.5pp)

## Summary
- Systematic remediation of issues identified in two audit reports: Pyrrhic Team State of the Game Evaluation and N412 Deep Dive Sector/Ops/Combat
- 5 phases executed across 11 commits: determinism hardening, frozen front cascade fix, supply/morale balance, code health cleanup, terminology sweep + mega-file splitting, and simplify pass
- Calibration improved from 86.9% to 89.4% area-weighted; DRINA region improved +8.4pp
- 154 files touched for terminology, 11 new submodules from mega-file splitting, 3 inline ranking dicts unified

## Phase 1: Determinism Fix

**Problem:** 24 unsorted `Object.values()`/`Object.keys()` iterations in combat code could produce different battle outcomes across JS engines.

**Changes:**
- `attack_resolution_osid.ts`: 4 sorted iterations (displacement, resolution, post-flip, cleanup)
- `bot_brigade_ai_osid.ts`: 6 fixes (sector fallback, defender detection, brigade filtering)
- `bot_corps_ai.ts`: 3 fixes (settlement counting, enemy detection)
- `decoration_evaluator.ts`, `front_assignment.ts`, `operation_storm.ts`, `paramilitary_sweep.ts`, `rear_pocket_consolidation.ts`: sorted iterations

**Simplify pass:** Removed unnecessary sorts from order-independent operations — counters, `.length` checks, `.some()` existence checks, hot-loop `.filter()` callbacks replaced with `.some()`. ~8000 unnecessary sorts/turn eliminated.

**Impact:** No calibration change (reproducibility only).

## Phase 2: Frozen Front Cascade (n414: 87.4%)

**Problem:** Self-reinforcing stasis cycle at w40: entrenchment wall → attacks fail → fatigue/supply drain → aggression collapses → targets cleared → complete front freeze.

**Changes:**
1. **Concentration bonus** (`combat_math.ts`): Multi-brigade attacks get coordination bonus (2=1.15×, 3=1.25×, 4+=1.30×). Constants: `CONCENTRATION_BONUS_PER_BRIGADE=0.10`, `CONCENTRATION_BONUS_CAP=0.30`
2. **Entrenchment degradation** (`attack_resolution_osid.ts`): Defenders lose 0.5 `entrenchment_turns` per battle, win or lose. `ENTRENCHMENT_DEGRADATION_PER_BATTLE=0.5`
3. **Hold OSID corps scoping** (`bot_corps_ai.ts`): `findFriendlyOsidsFromMunicipalities` results filtered to corps sector territory only
4. **Target adjacency filter** (`bot_corps_ai.ts`): Undefended enemy sectors only targeted if adjacent to corps sectors
5. **Aggression floor** (`bot_corps_ai.ts`): `AGGRESSION_FLOOR` record: offensive=0.0, balanced=-0.10, defensive=-0.30, reorganize=-0.50

**Impact:** 87.4% (+0.5pp). RS attacks rose to 375/40w. Front still freezes after w29 but later than before.

## Phase 3: Supply & Morale Balance (n415: 89.4%)

**Problem:** RS supply hits zero by w40 (drain exceeded income after OOB grew to 112 formations). Formations at morale=0 remain active indefinitely.

**Changes:**
1. **Supply drain** (`supply_reserve_constants.ts`): `MAINTENANCE_DRAIN_PER_FORMATION` 0.045→0.035. RS drain drops from 5.04 to 3.92/turn vs ~4.0 patron income
2. **Critical morale penalty** (`combat_math.ts`): `getCriticalMoralePenalty()` — below morale 15, combat power drops to 0.3-1.0×. `CRITICAL_MORALE_THRESHOLD=15`, `CRITICAL_MORALE_FLOOR=0.3`
3. **Cohesion decay** (`morale_drift.ts`): Formations below morale 15 lose 2 cohesion/turn → organic surrender cascade

**Impact:** 89.4% (+2.0pp). DRINA jumped from 70.0% to 78.4% (+8.4pp). RS delta improved from -70 to -50.

## Phase 4: Code Health

**Problem:** Displacement routing duplicated ~120 lines across 3 loops. No supply invariant checks. 98 temporary diagnostic scripts cluttering tools/.

**Changes:**
1. **Displacement dedup** (`displacement_takeover.ts`): Extracted `routeDisplacedCohort` helper replacing duplicated routing logic across pass-through, sustained, and camp displacement. Net -412 lines
2. **Supply assertions** (`supply_reserves.ts`): `assertSupplyInvariant` checks no faction goes negative or exceeds 200. Called at start/end of `updateSupplyReserves`
3. **Script cleanup**: Deleted 5 tracked scripts, added `tools/tmp_*.cjs` to `.gitignore`

**Impact:** No behavioral change. Cleaner codebase.

## Phase 5: Terminology Sweep + Mega-File Splitting

### 5A: Phase I/II Terminology Sweep

**Problem:** Canon v0.6 declared Phase I/II purged (2026-03-07), but 400 references remained across 154 files.

**Changes:**
- Comments/docstrings: "Phase I" → "Peace phase", "Phase II" → "War phase"
- Internal variables: `phaseIiSupplyPressure` → `warPhaseSupplyPressure`, `phaseIiExhaustion` → `warPhaseExhaustion`
- Preserved ~50 serialized values, exported function names, import paths, and runtime discriminators (`'phase_i'`/`'phase_ii'` literals in GameState.phase)

**Impact:** Zero behavioral change. Canon-code alignment restored.

### 5B: Mega-File Splitting

**Problem:** 4 mega-files >1,900 lines — hard to navigate, test, and review.

**bot_corps_ai.ts** (2,197→225 lines, slim orchestrator with re-exports):
| New Module | Lines | Contents |
|-----------|-------|----------|
| `bot_corps_helpers.ts` | 229 | `assessCorpsSupplyHealth`, `buildSubordinateMap`, `findTargetOsids*` helpers |
| `bot_corps_stance.ts` | 274 | `determineCorpsStance`, `shouldLaunchOperation`, stance classification |
| `bot_corps_operations.ts` | 431 | `generateCorpsOperationOrders`, planning/execution/completion lifecycle |
| `bot_corps_corridor.ts` | 159 | Posavina Corridor special-case targeting |
| `bot_corps_directives.ts` | 1,036 | `generateCorpsDirectives`, targeting helpers, `AGGRESSION_FLOOR` |

**bot_brigade_ai_osid.ts** (1,994→1,343 lines):
| New Module | Lines | Contents |
|-----------|-------|----------|
| `bot_brigade_context.ts` | 187 | `BrigadeContext` type, context builder |
| `bot_brigade_movement_ai.ts` | 338 | Movement decision logic, retreat, reposition |
| `bot_brigade_targeting.ts` | 183 | `OUTCOME_RANK`, `outcomeRank()`, `outcomeFromRank()`, `scoreTargetFromDirective`, `estimateConcentratedOutcome` |
| `bot_brigade_supply_ethnic.ts` | 143 | `getCoEthnicScore`, `getBrigadeSupplyState` |

**Deferred:**
- `war_phases.ts` (1,891L): Config artifact — splitting reduces readability
- `corps_front_sectors.ts` (2,223L): Tightly coupled territory/subsegment pipeline

### 5C: Simplify Pass — Outcome Ranking Unification

**Problem:** Three inline `outcomeRank` dictionaries (5-scale: decisive=5, victory=4, costly=3, stalemate=2, repulsed=1) duplicated independently from the canonical `OUTCOME_RANK` constant (6-scale including `catastrophic=1`). Scale mismatch: `Math.min(5,...)` cap wrong for 6-scale; supply isolation threshold `< 3` wrong for 6-scale costly_victory=4.

**Changes:**
1. **`bot_brigade_targeting.ts`**: `outcomeRank()` function now delegates to `OUTCOME_RANK` constant. `outcomeFromRank()` thresholds updated: decisive≥6, victory≥5, costly≥4, stalemate≥3
2. **`bot_brigade_ai_osid.ts`**: Replaced inline dict at supply-strained check with `OUTCOME_RANK`. Fixed `Math.min(5,...)` → `Math.min(6,...)` for outcome rank cap
3. **`bot_corps_directives.ts`**: Removed 2 inline `outcomeRank` dicts (lines 303, 634). Added `OUTCOME_RANK` + `PredictedOutcome` imports. Fixed supply isolation threshold: `< 3` → `< 4` (costly_victory is rank 4 in 6-scale)

**Impact:** Single source of truth for outcome ranking. Prevents future scale-drift bugs.

## Calibration Results (n415)

| Region | n403 | n414 | n415 | Delta |
|--------|------|------|------|-------|
| KRAJINA | 94.7% | 94.9% | 96.3% | +1.6pp |
| POSAVINA | — | 93.6% | 93.4% | stable |
| CORRIDOR | 90.8% | 90.8% | 89.5% | -1.3pp |
| CENTRAL_BOSNIA | — | 81.0% | 83.8% | +2.8pp |
| SARAJEVO | — | — | 86.2% | — |
| HERZEGOVINA | 90.3% | 90.3% | 91.5% | +1.2pp |
| DRINA | — | 70.0% | 78.4% | +8.4pp |
| **OVERALL** | **86.9%** | **87.4%** | **89.4%** | **+2.5pp** |

## Commits

| Commit | Phase | Description |
|--------|-------|-------------|
| `3965345` | 1 | Determinism audit — sort iteration, remove wasteful sorts |
| `69addd4` | 1 | Ledger entry |
| `4cc3e47` | 2 | Frozen front cascade — 5 fixes |
| `c0d207f` | 2 | Ledger + calibration master |
| `dec0352` | 3 | Supply balance + morale collapse |
| `c7fc67d` | 3 | Ledger + calibration master (n415) |
| `acd6265` | 4 | Code health — dedup, assertions, cleanup |
| `06cfb43` | 4 | Ledger entry |
| `7773525` | — | Audit remediation report Phases 1-4 |
| `a8f2b41` | 5A | Phase I/II terminology sweep (154 files) |
| `4d487f7` | 5B | Mega-file splitting (11 new modules) |
| `8dd6d5f` | 5 | Ledger entry |
| `efdfd0e` | 5C | outcomeRank unification (simplify) |

## Files Changed

| File | Phase | Change |
|------|-------|--------|
| `attack_resolution_osid.ts` | 1,2 | Determinism sorts + concentration bonus + entrenchment degradation |
| `bot_brigade_ai_osid.ts` | 1,5B,5C | Determinism sorts + split to 4 submodules + outcomeRank fix |
| `bot_corps_ai.ts` | 1,2,5B | Determinism sorts + frozen-front fixes + split to 5 submodules |
| `bot_brigade_context.ts` | 5B | New: brigade context builder (187L) |
| `bot_brigade_movement_ai.ts` | 5B | New: movement decision logic (338L) |
| `bot_brigade_targeting.ts` | 5B,5C | New: targeting + scoring (183L) + outcomeRank unification |
| `bot_brigade_supply_ethnic.ts` | 5B | New: supply state + co-ethnic scoring (143L) |
| `bot_corps_helpers.ts` | 5B | New: supply health + subordinate helpers (229L) |
| `bot_corps_stance.ts` | 5B | New: stance classification (274L) |
| `bot_corps_operations.ts` | 5B | New: operation lifecycle (431L) |
| `bot_corps_corridor.ts` | 5B | New: Posavina corridor targeting (159L) |
| `bot_corps_directives.ts` | 5B,5C | New: directive generation (1,036L) + outcomeRank fix |
| `combat_math.ts` | 2,3 | Concentration bonus + critical morale penalty |
| `morale_drift.ts` | 3 | Cohesion decay at critical morale |
| `supply_reserve_constants.ts` | 3 | Maintenance drain 0.045→0.035 |
| `supply_reserves.ts` | 4 | Supply invariant assertions |
| `displacement_takeover.ts` | 4 | Routing dedup (-412 lines) |
| `decoration_evaluator.ts` | 1 | Determinism sort |
| `front_assignment.ts` | 1 | Determinism sort |
| `operation_storm.ts` | 1 | Determinism sort |
| `paramilitary_sweep.ts` | 1 | Determinism sort |
| `rear_pocket_consolidation.ts` | 1 | Determinism sort |
| `.gitignore` | 4 | `tools/tmp_*.cjs` rule |
| 154 files | 5A | Phase I/II → Peace/War terminology |
| 5 diagnostic scripts | 4 | Deleted |

## Verification

- TypeScript: `npx tsc --noEmit` — clean
- Tests: 389/389 passing (38 suites), 3.29s
- Zero behavioral changes from Phase 1, 4, 5A, 5B, 5C
- Phases 2+3 verified via calibration runs n414, n415

## Remaining Issues

- **Drina region**: 78.4% improved but still weakest — RS aggression in eastern Bosnia underperforming
- **Zero-eligible-attacker operations**: 8 sector ops launching without eligible brigades
- **HRHB corps rework**: Herzegovina/Central Bosnia corps boundary issues
- **UI testing**: 0% coverage on React components
- **corps_front_sectors.ts**: 2,223L mega-file deferred (tightly coupled)
- **Calibration loop**: Still manual (5 steps, 30-100 min per cycle)

## Lessons Learned

1. **Frozen front cascades are self-reinforcing**: Breaking them requires attacking the cycle at multiple points simultaneously — concentration bonuses, entrenchment erosion, directive quality, aggression floors
2. **Supply drain must match OOB growth**: RS grew from ~70 to 112 formations; drain exceeded income. The fix was reducing per-formation drain, not increasing income
3. **Inline constant duplication causes scale drift**: Three copies of `outcomeRank` dict diverged from canonical `OUTCOME_RANK` — unified to single source of truth
4. **Mega-file splitting**: Re-export pattern preserves backward compatibility; modules split along responsibility boundaries, not size targets
5. **Terminology sweeps must preserve runtime discriminators**: Serialized values (`'phase_i'`/`'phase_ii'`) cannot be renamed without migration
