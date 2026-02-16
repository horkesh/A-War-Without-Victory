# Three-Sided Bot AI: Corps Command, Operations, and Standing Orders (2026-02-14)

## Summary

Implemented a full three-layer bot AI architecture for all three factions (RS, RBiH, HRHB), adding corps-level decision-making, named operations, operational group activation, corridor breach detection, and historical army-wide standing orders. This closes the gaps identified in `BOT_EXPERT_HANDOVER_3_SIDES.md`.

## Architecture

Three decision layers, each feeding into the next:

1. **Army Standing Orders** — historical army-level directives set `state.army_stance` per faction per time period
2. **Corps AI** (`bot_corps_ai.ts`) — stance selection, named operations, OG activation, corridor breach
3. **Brigade AI** (`bot_brigade_ai.ts`) — posture decisions, target scoring, attack orders, casualty-aversion

Army stance overrides corps stance via existing `getEffectiveCorpsStance()` in `corps_command.ts` and `getCorpsStance()` in `battle_resolution.ts`. Corps stance modulates brigade posture (offensive corps lowers attack thresholds 30%, defensive corps forces defend posture).

## Changes by Phase

### Phase A: Foundation Fixes

| Change | File | Detail |
|--------|------|--------|
| A1: Defender casualty fix | `battle_resolution.ts`, `formation_constants.ts` | Added `MIN_COMBAT_PERSONNEL = 100`. Casualty cap and `applyPersonnelLoss` floor use this instead of `MIN_BRIGADE_SPAWN` (800). Post-battle readiness degradation when personnel < 800. |
| A2: HRHB activation | `bot_strategy.ts` | `attack_coverage_threshold`: 170 → 100. `max_attack_posture_share`: 0.25 → 0.35. Added `min_active_brigades: 2`. |
| A3: RS early-war aggression | `bot_strategy.ts`, `bot/bot_strategy.ts` | RS `early_war_aggression`: 0.64 → 0.82. RBiH: 0.62 → 0.45. Time-phased taper in `resolveAggression()`. `getEffectiveAttackShare()`: RS gets 0.55 at turn 0, tapering to 0.4 by turn 20. |
| A4: AoR rebalancing | `brigade_aor.ts`, `turn_pipeline.ts` | `rebalanceBrigadeAoR()` sheds rear settlements from oversized brigades (>2x median), absorbs into undersized (<0.3x median). New pipeline step `rebalance-brigade-aor`. |

### Phase B: Corps Command

| Change | File | Detail |
|--------|------|--------|
| B1: Corps stance | `bot_corps_ai.ts` (new) | `generateCorpsStanceOrders()` — threat ratio, personnel/cohesion health, faction overrides. RS corridor corps never below balanced; RBiH Sarajevo always defensive; HRHB Herzegovina defensive. |
| B2: Corps → brigade | `bot_brigade_ai.ts` | `getParentCorpsStance()` helper. Offensive corps: -30% attack threshold, 0.6 attack share. Defensive/reorganize corps: force defend. |
| B3: Named operations | `bot_corps_ai.ts` | Faction operation catalogs (RS: Corridor/Drina Sweep/Sarajevo Tightening; RBiH: Enclave Relief/Sarajevo Breakout/Central Corridor; HRHB: Lasva Valley/Mostar Consolidation/Herzegovina Shield). Multi-turn lifecycle: planning → execution → recovery. |

### Phase C: Operational Groups

| Change | File | Detail |
|--------|------|--------|
| C1: OG activation | `bot_corps_ai.ts`, `bot_brigade_ai.ts` | `generateOGActivationOrders()` creates OGs from 2-4 donors during operation execution. Implemented `isPartOfOGOperationToward()` stub — checks corps active operation in execution phase with matching target. HRHB uses lower 2-donor threshold (small force compensation). |
| C2: Corridor breach | `bot_corps_ai.ts` | `detectCorridorBreachOpportunities()` finds narrow enemy strips (<5 settlements) between friendly clusters. `attemptCorridorBreach()` launches sector attack + offensive stance. |
| C3: Operation progress | `bot_corps_ai.ts` | `evaluateOperationProgress()` — abort if <20% progress after 2 turns, succeed if >50%, max 6-turn execution. Replaces damaged brigades (>30% losses) with fresh reserves from same corps. |

### Phase D: Strategic Intelligence

| Change | File | Detail |
|--------|------|--------|
| D1: Casualty-aversion | `bot_brigade_ai.ts`, `combat_estimate.ts` (new) | `estimateAttackCost()` returns expected loss fraction, win probability, power ratio. Brigades skip attacks with >15% expected losses and <60% win probability, unless strategic target (25%/30% thresholds). |
| D2: Ethnic resistance | `bot_brigade_ai.ts` | -40 score penalty for attacking settlements in enemy defensive priority municipalities. Override for OG operations, corridor targets, and offensive objectives. |
| D3: Time-phased doctrine | `bot_strategy.ts` | `FACTION_DOCTRINE_PHASES` per faction: RS offensive→balanced→defensive; RBiH defensive→balanced→counteroffensive; HRHB balanced→balanced→balanced. `getActiveDoctrinePhase()` provides default corps stance when situation is ambiguous. |
| D4: Economy of force | `bot_brigade_ai.ts` | Lowest-density quiet-sector brigades switch to `elastic_defense`. Max 2 per faction. |
| D5: Feints | `bot_brigade_ai.ts` | During named operation planning phase, 1-2 non-participating brigades set to `probe` on different sectors to draw defenders. |

### Phase E: Faction Personality

Embedded in corps AI overrides within `generateCorpsStanceOrders()`:

- **RS "Heavy Hammer"**: Corridor corps never below balanced. Early-war (weeks 0-20): prefer offensive when healthy. Sarajevo siege corps: maintain pressure, never reorganize.
- **RBiH "Resilient Defender"**: Sarajevo corps always defensive. No offensive in weeks 0-12. Late-war (week 40+): counteroffensive if holding >25% territory with healthy brigades.
- **HRHB "Compact Fortress"**: Herzegovina corps always defensive. Alliance-sensitive: central Bosnia corps goes offensive when at war with RBiH (alliance < 0.2).

### Army-Wide Standing Orders

Historical army-level directives set via `setArmyStandingOrder()` in `bot_corps_ai.ts`, using data from `FACTION_STANDING_ORDERS` in `bot_strategy.ts`.

**RS (VRS):**
| Order | Weeks | Army Stance | Intent |
|-------|-------|-------------|--------|
| Territorial Seizure | 0-12 | `general_offensive` | Exploit JNA equipment for maximum land grab |
| Consolidation | 12-52 | `balanced` | Secure gains, fortify corridors — corps decide locally |
| Strategic Hold | 52+ | `general_defensive` | Manpower crisis, hold and wait for political settlement |

**RBiH (ARBiH):**
| Order | Weeks | Army Stance | Intent |
|-------|-------|-------------|--------|
| Survival Defense | 0-12 | `general_defensive` | Hold what you can, evacuate what you cannot |
| Active Defense | 12-40 | `balanced` | Reorganize into corps structure, local counterattacks |
| Stretch the Front | 40-80 | `general_offensive` | 1994 pinprick strategy — constant small attacks along the entire front to stretch VRS reserves thin and prevent concentration |
| Controlled Counteroffensive | 80+ | `balanced` | Shift from attrition to targeted counteroffensives |

**HRHB (HVO):**
| Order | Weeks | Army Stance | Intent |
|-------|-------|-------------|--------|
| Consolidate Herzegovina | 0-12 | `balanced` | Secure the Croat heartland |
| Lasva Offensive | 12-26 | `general_offensive` | Push into central Bosnia (only when at war with RBiH) |
| Washington Pivot | 26+ | `general_defensive` | Post-Washington Agreement — cease offensives, cooperate with ARBiH |

Standing orders flow through existing mechanisms:
- `state.army_stance[faction]` → `getEffectiveCorpsStance()` (corps_command.ts) → corps stance override
- `state.army_stance[faction]` → `getCorpsStance()` (battle_resolution.ts) → combat modifiers

## New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/sim/phase_ii/bot_corps_ai.ts` | ~830 | Corps-level AI: stance, operations, OGs, corridor breach, standing orders |
| `src/sim/phase_ii/combat_estimate.ts` | ~130 | Read-only combat power estimation for casualty-aversion |
| `src/sim/phase_ii/phase_ii_adjacency.ts` | ~55 | Shared: buildAdjacencyFromEdges, getFactionBrigades (refactor 2026-02-14) |
| `tests/bot_three_sides_validation.test.ts` | ~184 | 22 validation tests |

## Modified Files

| File | Changes |
|------|---------|
| `src/sim/phase_ii/battle_resolution.ts` | Casualty cap uses `MIN_COMBAT_PERSONNEL`; readiness degradation |
| `src/sim/phase_ii/bot_strategy.ts` | `min_active_brigades`, doctrine phases, standing orders, tuned thresholds |
| `src/sim/phase_ii/bot_brigade_ai.ts` | Corps integration, `isPartOfOGOperationToward()`, D1-D5 intelligence |
| `src/sim/phase_ii/brigade_aor.ts` | `rebalanceBrigadeAoR()`; refactor: uses `buildAdjacencyFromEdges` from phase_ii_adjacency |
| `src/sim/turn_pipeline.ts` | `rebalance-brigade-aor` and `generate-bot-corps-orders` pipeline steps |
| `src/sim/bot/bot_strategy.ts` | RS/RBiH early-war aggression tuning |
| `src/state/formation_constants.ts` | `MIN_COMBAT_PERSONNEL` constant |
| `vitest.config.ts` | Added test file to include list |

## Pipeline Step Order

```
... → validate-brigade-aor → rebalance-brigade-aor → ... → generate-bot-corps-orders → generate-bot-brigade-orders → ...
```

`generate-bot-corps-orders` runs before `generate-bot-brigade-orders` so corps stance and operations are set before brigades read them.

## Determinism

- All new code uses `strictCompare` for sorting
- No `Math.random()` — all decisions are deterministic functions of game state, faction, and turn number
- Factions processed in sorted order (HRHB, RBiH, RS)
- Corps and brigades iterated in sorted `FormationId` order
- No timestamps or Date usage
- Standing orders depend only on `faction`, `turn`, and `phase_i_alliance_rbih_hrhb` (for HRHB Lasva Offensive gate)

## Validation

- 22 vitest tests pass (`tests/bot_three_sides_validation.test.ts`)
- All existing tests pass (110 vitest + 17 node:test)
- No new TypeScript compilation errors (pre-existing `downlevelIteration`/`kdbush` errors unaffected)

---

## Refactor pass (2026-02-14)

- **Shared module:** `src/sim/phase_ii/phase_ii_adjacency.ts` — `buildAdjacencyFromEdges(edges)` and `getFactionBrigades(state, faction)` used by bot_corps_ai, bot_brigade_ai, and brigade_aor (rebalanceBrigadeAoR). Removed duplicate implementations.
- **Dead code:** Removed unused imports from `bot_corps_ai.ts` (computeBrigadeDensity, MIN_BRIGADE_SPAWN).
- **Verification:** `npx tsc --noEmit` and `npx vitest run` pass after refactor.
