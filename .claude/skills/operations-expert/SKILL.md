---
name: operations-expert
description: Use when creating, modifying, debugging, or reviewing ANY military operation — pre-planned ops, triggered ops, objective changes, brigade assignments, staging OSIDs, timing, or corps command. MUST be consulted before any change to pre_planned_operations.ts, triggered_operations.ts, sector_offensive.ts, operation_preparation.ts, or jna_phantom_brigades.ts. Also use when calibration runs show unexpected territorial changes that could be caused by operation behavior.
---

# Operations Expert

## Required Reading (before any work)
- `docs/life_lessons/calibration.md` — calibration, OOB, combat lessons
- `docs/life_lessons/architecture.md` — engine and architecture lessons
- `docs/knowledge/ARMY_STRENGTH_COMPARISON.md` — cross-faction strength comparison (OOB masters are authoritative, not BB)

## Mandate
- **Single authority** on how military operations work in the AWWV engine.
- **MUST be consulted** before ANY operation change: new ops, objective edits, brigade assignments, staging, timing, corps assignment.
- **Owns** the operation lifecycle: injection → planning → preparation → execution → recovery.

## Authority Files
| File | Owns |
|------|------|
| `src/sim/combat/pre_planned_operations.ts` | Pre-planned op definitions, injection, queuing |
| `src/sim/combat/triggered_operations.ts` | Condition-triggered ops |
| `src/sim/combat/sector_offensive.ts` | Lifecycle: planning→execution→recovery, per-axis tracking, failure caps |
| `src/sim/combat/operation_preparation.ts` | Preparation state machine: intel→force_staging→supply→assessment→ready |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Brigade attack evaluation during op execution (lines 143-212) |
| `src/sim/combat/bot_brigade_ai_osid.ts` | `getSectorOffensiveCurrentObjective`, `getSectorOffensiveApproachOsids` |
| `src/sim/combat/corps_command.ts` | Corps command init, op advancement |
| `src/sim/combat/jna_phantom_brigades.ts` | JNA phantom spawn/withdrawal, synthetic corps |
| `src/scenario/scenario_runner.ts` | Init order: `initializeCorpsCommand` → `spawnJnaPhantomBrigades` → `initializeCorpsCommand` (again) → `injectPrePlannedOperations` |

## Session Report
`docs/40_reports/20260321_HERZEGOVINA_CALIBRATION_SESSION.md` — comprehensive investigation with 19 lessons learned.

## Operation Lifecycle

```
PRE-PLANNED DEF → injectPrePlannedOperations (w0)
                     ↓
TRIGGERED DEF ──→ checkTriggeredOperations (per turn, condition-gated)
                     ↓
              ┌─ PLANNING ──────────────────────────────────┐
              │  Preparation state machine:                  │
              │    intel_gathering → force_staging →          │
              │    supply_check → assessment → ready          │
              │  Brigades column-march to staging/approach    │
              │  force_staging: 60% assembly gate             │
              └──────────────────────────────────────────────┘
                     ↓ (preparationReady || elapsed > planDuration)
              ┌─ EXECUTION ─────────────────────────────────┐
              │  Per-axis parallel: each axis tracks own     │
              │    current_objective_index, failure_count,    │
              │    status (executing/stalled/complete)        │
              │  Brigade AI: predictAllAdjacentTargets from   │
              │    CURRENT location → find objective → attack │
              │  MAX_ATTACKERS_PER_TARGET = 12                │
              │  MAX_TOTAL_FAILURES = 8 (per axis)            │
              │  Zero-progress abort: per-axis (≥3 failures,  │
              │    0 captures, 1+ attempt → axis stalled)     │
              └──────────────────────────────────────────────┘
                     ↓ (all axes terminal)
              ┌─ RECOVERY ──────────────────────────────────┐
              │  Cool-down period. Corps stance reverts.      │
              │  Next queued op injects after recovery.       │
              └──────────────────────────────────────────────┘
```

## Sacred Rules

1. **One active op per corps.** Ops queue sequentially. Use synthetic corps for parallelism.
2. **NEVER share brigades between ops on different corps.** The first op grabs them; the second runs empty. VRS brigades follow their OWN `corps_id`'s active op, not the synthetic corps op.
3. **Staging OSID must be adjacent to the first objective.** Non-adjacent staging = weeks of marching = op stalls.
4. **NEVER add a painted-opposite-faction OSID as an objective.** Check `painted_control_jan1993.json` before adding ANY objective. If painted RBiH, it MUST NOT be a VRS objective (and vice versa).
5. **After ANY objective change, verify corridor anchors.** Run BFS from teocak_krstac_2 to tuzla_2. Check zepa_2, vitinica_2, rastosnica_2.
6. **After removing objectives (e.g. OSID merge), add replacements to maintain op tempo.** Fewer objectives = faster completion = freed brigades = cascade.
7. **Preparation sub-phase overrides planning_duration.** An aggressive commander completes preparation in 3 turns regardless. Use `force_staging` assembly check for brigade march timing, not `planning_duration`.

## Synthetic JNA Corps Pattern
For parallel early-war JNA-directed operations:
1. Create JNA phantoms with `corps_id: 'jna_<name>_command'` and `no_equipment_handoff: true`
2. `initializeCorpsCommand` must be called AFTER `spawnJnaPhantomBrigades` in `scenario_runner.ts`
3. Only JNA phantoms (with matching `corps_id`) on the synthetic corps op — VRS brigades follow their own corps
4. JNA phantoms withdraw w6-w8; captured territory needs VRS follow-up (triggered op or corps-level auto-ops)

## Attack Evaluation Pipeline (lines 143-212 of bot_brigade_eval_attack.ts)
1. Phase = execution check
2. `getSectorOffensiveCurrentObjective` — per-axis objective from brigade's axis
3. Friendly-capture skip (objective already taken by own/allied faction)
4. `predictAllAdjacentTargets` from brigade's **CURRENT** location (NOT staging — marching brigades don't see the target)
5. Alliance filter (RBiH↔HRHB)
6. `avoided_osids_by_faction` filter (deprecated/banned)
7. `targets.find(t => t.osid === currentObjective)` — if not in list, brigade CANNOT attack
8. Solo prediction vs `min_attack_outcome` threshold
9. Concentrated estimate: `1 + N × 0.85` multiplier (N = adjacent axis participants, STATIC count)
10. Attacker cap: `alreadyAssigned < MAX_ATTACKERS_PER_TARGET` (12)

## Key Constants
| Constant | Value | Location |
|----------|-------|----------|
| MAX_ATTACKERS_PER_TARGET | 12 | `bot_brigade_targeting.ts`, `battle_resolution.ts` |
| MAX_TOTAL_FAILURES | 8 | `sector_offensive.ts` (per axis) |
| MAX_CONSECUTIVE_FAILURES_ON_CURRENT | 3 | `sector_offensive.ts` |
| MAX_OPERATION_ZERO_PROGRESS_FAILURES | 3 | `sector_offensive.ts` (per axis) |
| REACTIVE_DEFENSE_RATIO | 1.5 | `combat_math.ts` |
| REACTIVE_DISTANCE_BASE | 0.60 | `combat_math.ts` (decay per hop) |

## Known Coupled Anchors
Changes in one area cascade through VRS force allocation to affect the other:
- **Žepa ↔ Teočak** (Drina Corps): Stronger Žepa defense → VRS stays north → blocks Teočak corridor
- **Višegrad ↔ Rogatica** (Herzegovina Corps): Op Višegrad direction shifts Rogatica front
- **Herzegovina ops ↔ all VRS**: Extra early-war personnel (even temporary JNA phantoms) cascades across the entire map

## Pre-Change Checklist
Before ANY operation change:
- [ ] Check painted control: `node -e "console.log(require('./data/source/calibration/painted_control_jan1993.json').by_settlement_id['op:...:...'])"`
- [ ] Verify staging adjacency to first objective
- [ ] Check brigade corps_id matches op corps (or is JNA phantom on synthetic corps)
- [ ] No shared brigades with other corps' ops
- [ ] After run: verify all anchors (zepa, vitinica, rastosnica, teočak BFS, derventa, enclaves 4/4)
- [ ] After run: full territory diff vs previous (`compare_painted_vs_sim.cjs`)

## Debugging Operations
1. Check `operation_diagnostics` in weekly report — phase, captures, eligible, participants
2. If eligible=0: brigade not adjacent to objective (check CURRENT location, not staging)
3. If captures stall: check per-axis failure count vs MAX_TOTAL_FAILURES
4. If op never fires: check corps queue (`queued_operations`), `available_from` gating, `corpsOpFinished` trigger
5. If op fires but wrong brigades: check `buildAxesFromDef` filter — `isEligibleOperationFormation` (kind+status), `EXEMPT_CORPS_IDS`
6. If ping-pong: decisive victory but OSID retaken next turn — counts as failure toward cap
7. **Always add debug logging** (`console.log` in bot_brigade_eval_attack.ts) before theorizing. Trace the exact code path.
