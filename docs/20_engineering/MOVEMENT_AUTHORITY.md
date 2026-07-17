# Movement Authority Tiers

**AWWV v0.9.x - current movement ownership**

Updated: 2026-07-15
Cross-reference: `docs/10_canon/Engine_Invariants_v0_9_0.md` section 14.9

Every writer of `sector_reassignment_orders`, `brigade_movement_orders`, `brigade_movement_state`, or `location_osid` belongs to one authority tier. The tiers separate strategic intent from route selection and physical movement.

## 1. Authority hierarchy

| Tier | Role | Authority |
|---|---|---|
| **T1 - Strategic intent** | Decides where a brigade is needed | Commander decision and emit code may write directives, operations, and `sector_reassignment_orders`. It must not rewrite `location_osid`. |
| **T2 - Tactical routing** | Chooses a legal route toward T1 intent | Brigade order generation translates assignments and operation needs into `brigade_movement_orders`. It must preserve corps ownership, enclave legality, and player overrides. |
| **T3 - Execution** | Moves along the chosen path | Column and adjacent-movement engines update transit state and `location_osid`. They do not choose strategic destinations. |
| **T4 - Combat consequence** | Applies retreat, advance, and displacement | Combat resolution may change location as a consequence of battle, not as planning authority. |
| **T5 - Lifecycle** | Places or recalls formations at lifecycle boundaries | Recruitment, reconstitution, and reserve systems may place newly activated or recalled formations under their own contracts. |
| **T6 - Repair** | Repairs invalid or stale movement state | Correction and local distribution code may repair paths or local coverage. It must not invent cross-corps intent or bypass legal connectivity. |

## 2. Current owners

| File | Tier | Current responsibility |
|---|---|---|
| `src/sim/combat/commander/decide.ts` | T1 | Computes commander intent, including one legal same-corps donor for each empty staffable front sector. |
| `src/sim/combat/commander/emit.ts` | T1 | Emits `sector_reassignment_orders`; direct empty-sector relief has precedence over generic reserve shifts and is deduplicated by brigade. |
| `src/sim/combat/bot_corps_ai.ts` | T1 | Produces corps directives and invokes the commander loop from `generate-bot-corps-orders`. |
| `src/sim/combat/bot_brigade_ai_osid.ts` | T2 | Converts sector reassignments and other legal staff intent into movement orders during `generate-bot-brigade-orders`. |
| `src/sim/combat/bot_brigade_eval_front.ts` | T2 | Chooses a reachable destination on the assigned sector front. |
| `src/sim/combat/bot_brigade_eval_movement.ts` | T2 | Handles rear-area repositioning within legal friendly connectivity. |
| `src/sim/combat/bot_brigade_movement_ai.ts` | T2 | Routes operation participants without changing operation objectives. |
| `src/sim/combat/osid_column_movement.ts` | T3 | Initializes and advances multi-hop column movement state and physical location. |
| `src/sim/combat/brigade_movement_orders.ts` | T3 | Validates and applies adjacent movement orders. |
| `src/sim/combat/attack_resolution_osid.ts` | T4 | Applies combat-forced retreat, advance, and displacement. |
| `src/sim/combat/sector_offensive.ts` | T4 | Applies operation movement clauses owned by an active operation. |
| `src/sim/combat/brigade_reconstitution.ts` | T5 | Places newly reconstituted brigades. |
| `src/sim/combat/army_reserve_system.ts` | T5 | Applies reserve assignment and recall lifecycle effects. |
| `src/sim/combat/commander_march_correction.ts` | T6 | Repairs invalid march paths and transit state. |
| `src/sim/combat/brigade_front_distribution.ts` | T6 | Performs bounded local front distribution without paper transfers. |
| `src/sim/combat/brigade_home_return.ts` | T6 | Routes eligible idle displaced brigades home. |
| `src/sim/combat/corps_front_sectors.ts` | Derived truth | Classifies only roster-eligible, legally reachable formations as potential sector staff and marks a sector `unstaffed_front` when no legal donor exists. |

## 3. Empty-sector relief lifecycle

1. During `generate-bot-corps-orders`, T1 identifies an empty same-corps sector and selects a deterministic legal donor. The donor must be roster-eligible, connected through friendly territory within the movement bound, permitted by enclave rules, and free of operation, dig-in, elite-loan, or active-transit commitments. Donating line sectors retain their minimum staffing floor.
2. T1 emits a `sector_reassignment_order`. This records intent only; the brigade remains at its physical `location_osid`.
3. During `generate-bot-brigade-orders`, T2 translates the reassignment into a column movement order after revalidating the destination and route.
4. On later turns, `osid-column-movement` and `apply-brigade-movement` perform T3 movement. Arrival is proven by physical `location_osid`, not by assignment metadata.
5. If no legal donor exists, the sector remains empty and is marked `unstaffed_front: true`. The UI may report the gap, but no engine tier may teleport a brigade or fabricate staffing.

## 4. Pipeline constraints

- `osid-column-movement` runs before `apply-brigade-movement`; reversing them can discard column intent.
- `generate-bot-corps-orders` owns T1 intent. `generate-bot-brigade-orders` owns T2 translation.
- T6 local repair may improve coverage only inside its legal connectivity and assignment bounds. It cannot substitute a direct location rewrite for T1/T2/T3 movement.
- Player automation is explicit: autonomy 0 is manual except accepted historical-operation participants; autonomy 1+ includes deterministic staff execution while preserving player-staged attack, movement, and posture overrides.

## 5. Required invariants

1. T1 intent does not mutate brigade location or sector bucket membership.
2. T2 does not reassign a brigade across corps or violate enclave movement restrictions.
3. T3 does not call strategic decision functions.
4. T4 location changes require a combat consequence.
5. T6 cannot import strategic intent as permission for cross-component repair.
6. `assigned_sub_segment_id` is cleared when its sector ownership becomes stale.
7. Legitimately isolated sectors are represented as `unstaffed_front`; unresolved-is-honest is preferable to paper staffing.
