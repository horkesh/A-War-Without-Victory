# Movement Authority Tiers

**AWWV v0.8.x — Command Authority Cleanup (Phase 2)**  
Created: 2026-04-07  
Cross-reference: `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md` §2

Every system that writes `brigade_movement_orders`, `brigade_movement_state`, or `location_osid` belongs to exactly one authority tier. A maintainer opening any movement file should immediately know its tier, what it writes, and what it must not do.

---

## 1. The Six-Tier Hierarchy

| Tier | Role | Description |
|------|------|-------------|
| **T1 — Strategic Intent** | Decides WHERE brigades should be | Only the commander loop. Writes sector assignments, operation plans, stance directives. |
| **T2 — Tactical Routing** | Decides HOW to get there | Bot brigade AI evaluates sector march, column march targets, interior repositioning. Operates within T1's assignment. |
| **T3 — Execution** | Moves brigades along decided paths | Column march engine, single-hop movement application. No decision authority. |
| **T4 — Combat Consequence** | Movement forced by battle outcome | Attack resolution: retreat, advance, breakthrough. Not a planning decision. |
| **T5 — Lifecycle** | Spawn/despawn placement | Reconstitution, reserve system. Not a movement decision per se. |
| **T6 — Repair** | Fixes broken state post-decision | Commander march correction, front distribution, home return. Corrective, not authoritative. |

**Key principle:** T6 repair files must never import from T1 intent files. Repair must not depend on strategic intent.

---

## 2. File Classification Table

| File | Tier | Writes | Must Not |
|------|------|--------|----------|
| `src/sim/combat/commander/commander_loop.ts` | T1 | `directive` (sector_stance, sector_assignment), `active_operations` | Write `brigade_movement_orders` or `location_osid` directly |
| `src/sim/combat/commander/allocate.ts` | T1 | `sector_assignment` (via directive) | Move brigades — only assigns to sectors |
| `src/sim/combat/commander/emit.ts` | T1 | `active_operations` (creates ops from ready plans), `CorpsDirective`, `SectorStance` | Write movement orders |
| `src/sim/combat/bot_brigade_ai_osid.ts` | T2 | `brigade_movement_orders` (merged from all bot evaluations) | Override T1 sector assignment or reassign to different corps |
| `src/sim/combat/bot_brigade_eval_front.ts` | T2 | `brigade_movement_orders` (column march to sector front) | Reassign brigade to different corps sector |
| `src/sim/combat/bot_brigade_eval_movement.ts` | T2 | `brigade_movement_orders` (rear-area repositioning) | Move cross-component (Codex principle #2) |
| `src/sim/combat/bot_brigade_movement_ai.ts` | T2 | Column march targets for operation participants | Override T1 operation objectives |
| `src/sim/combat/osid_column_movement.ts` | T3 | `brigade_movement_state` (init/update/clear), `location_osid` (incremental) | Decide destination — only execute Dijkstra path from T2 orders |
| `src/sim/combat/brigade_movement_orders.ts` | T3 | `location_osid` (adjacent OSID move), clears `brigade_movement_orders` | Decide destination — only validate adjacency and apply |
| `src/sim/combat/attack_resolution_osid.ts` | T4 | `location_osid` (defender retreat, attacker advance, displacement) | Issue march orders — only resolve combat-forced position changes |
| `src/sim/combat/sector_offensive.ts` | T4 | `brigade_movement_orders` (op march during preparation/execution) | Override commander's operation plan |
| `src/sim/combat/brigade_reconstitution.ts` | T5 | `location_osid` (spawn placement at home municipality) | Move existing brigades — only place newly reconstituted ones |
| `src/sim/combat/army_reserve_system.ts` | T5 | `location_osid` (reserve recall), clears movement orders/state | Override active operation participation |
| `src/sim/combat/commander_march_correction.ts` | T6 | `brigade_movement_orders` (recomputed BFS path), deletes invalid `movement_state` | Issue new strategic intent — only fix invalid march destinations |
| `src/sim/combat/brigade_front_distribution.ts` | T6 | `location_osid` (Phase A: unstack), `brigade_movement_orders` (Phase B: march to front) | Override sector assignment — only spread within assigned sector |
| `src/sim/combat/brigade_home_return.ts` | T6 | `brigade_movement_orders` (column march home) | Override active operation participation — only recall idle displaced brigades |

---

## 3. Pipeline Step Ordering

Steps from `src/sim/turn_phases/war_phases.ts` (approximate step numbers):

```
[T1]  commander-loop               — Strategic intent, sector assignment, op creation
[T4]  advance-sector-offensives    — Op march orders written (T4 movement clause)
[T4]  resolve-attack-orders-osid   — Combat resolution, retreat/advance (T4 location_osid)
[T3]  osid-column-movement         — Execute multi-hop column march (step ~574)
[T3]  apply-brigade-movement       — Execute single-hop move (step ~597)
[T6]  distribute-brigades-to-front — Repair stacking / march to front (step ~676)
[T6]  return-displaced-brigades    — Repair displacement / home return (step ~690)
[T2]  generate-bot-brigade-orders  — Tactical routing decisions (step ~1062)
[T6]  commander-correct-march-orders — Repair invalid march destinations (step ~1027)
```

Note: T1 runs earlier in the pipeline via `commander-loop` step. T5 (reconstitution, reserve) runs at lifecycle boundaries, not within the main movement pipeline.

---

## 4. Codex Truth Principles Referenced

These principles from the AWWV Codex apply across movement tiers:

- **Principle #2 — Connected-component boundary**: No brigade may move cross-component (T2 and T6 must both respect this).
- **Principle #4 — Persisted player intent is not fact**: UI read path (GameStateAdapter) must not expose raw engine internals; player-visible state flows through display helpers.
- **Principle #6 — Unresolved-is-honest**: Front distribution (T6) must never force-assign cross-component; emit a warning instead.

---

## 5. Key Invariants

1. **T1 is the sole strategic intent authority.** `commander_loop.ts` is the only file that decides WHERE brigades should be. All other movement flows execute, repair, or respond to T1's decisions.
2. **T6 repair files must not import from T1 intent files.** Verified by `tests/movement_authority_tiers.test.ts`.
3. **T3 execution files must not call T2 decision functions.** `osid_column_movement.ts` must not call `evaluateSectorMarch` or `generateBotBrigadeOrders`.
4. **T4 combat consequence must not write `brigade_movement_orders`.** Only `location_osid` changes on retreat/advance.
5. **`assigned_sub_segment_id` is live authority** (napkin 2026-04-03): when a brigade loses sector ownership, clear this field during sector sync so T6 march correction does not follow a stale frontline destiny.

---

## 6. SKIP: `brigade_assignment.ts`

This file has active Codex agent modifications. Annotation deferred until Codex branch merges. When added, it must reference Codex truth invariants: spatial truthfulness, connected components, unresolved-is-honest.
