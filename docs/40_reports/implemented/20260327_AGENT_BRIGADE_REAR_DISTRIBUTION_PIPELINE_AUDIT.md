# Brigade rear / front distribution pipeline audit

**Date:** 2026-03-27  
**Role:** Systems programmer (code audit)  
**Scope:** `assignBrigadesToSubSegments` → `primary_brigade_ids`, `distributeBrigadesToFront`, and `war_phases` ordering relative to movement and bot brigade orders.

---

## 1. How `primary_brigade_ids` is populated

**Source:** `src/sim/combat/subsegment_assignment.ts` — `assignBrigadesToSubSegments`.

- For each sector, sub-segments are cleared (`primary_brigade_ids = []`, `gap = false`).
- **Front-line set:** every brigade in `sector.assigned_brigade_ids` that is **not** in `sector.reserve_brigade_ids`, and is active, is treated as a **front brigade** and participates in assignment.
- **Reserves** (`reserve_brigade_ids`) are excluded from `frontBrigadeIds` and never receive `assigned_sub_segment_id` or `primary_brigade_ids` entries from this function.
- With one sub-segment, all front brigades go to `primary_brigade_ids` for that segment.
- With multiple sub-segments, a greedy assignment fills one brigade per sub-segment (widest first), then assigns remaining front brigades by affinity and width rules.
- `mergeGapSubSegments` merges empty gap segments into a neighbor; surviving sub-segments retain brigade lists.

**Conclusion:** `primary_brigade_ids` lists **front** sub-segment responsibility only, not the full sector roster.

---

## 2. Can a brigade be assigned to a sector but not in any `primary_brigade_ids`?

**Yes — reserve brigades.**

- Sector assignment (`assigned_brigade_ids` / `reserve_brigade_ids`) comes from corps front sector construction and brigade classification (`classifyBrigadesByTerritory` and related paths in `corps_front_sectors` / territory logic).
- `assignBrigadesToSubSegments` **explicitly skips** any brigade ID that appears in `reserve_brigade_ids` when building `frontBrigadeIds`, so those brigades are **not** placed into any `primary_brigade_ids`.

**Does `distributeBrigadesToFront` skip them?**

**Yes, entirely.** `distributeBrigadesToFront` only iterates `subSeg.primary_brigade_ids` (plus eligibility filters). Reserves are never in that list, so they get **no** Phase A redistribution and **no** Phase B column orders from this step.

---

## 3. What happens when distance `dist > MAX_REDISTRIBUTION_DISTANCE` (20)?

**Source:** `src/sim/combat/brigade_front_distribution.ts`, Phase B.

- `MAX_REDISTRIBUTION_DISTANCE = 20`.
- For each eligible primary brigade not already on a front OSID:
  - `dist === 1`: immediate `location_osid` update (adjacent hop).
  - `1 < dist <= 20`: write `brigade_movement_orders[bid]` with `stance: 'column'` and `destination_sids: [target]`.
  - **`dist > 20` or unreachable:** no state change in this function — **no** column order, **no** teleport. The brigade stays where it is for the rest of this step.

**Note:** `bfsDistance` in `src/sim/combat/sector_utils.ts` uses **`maxDepth = 20`** for the search. Paths longer than 20 hops return `Infinity`, which falls into the same “skip” branch as `dist > 20`.

---

## 4. Pipeline order: movement → sectors → distribute → bot orders

### Same-turn order in `war_phases.ts` (excerpt)

Relevant sequence:

1. **`osid-column-movement`** — processes existing column movement (`processOsidColumnMovement`).
2. **`apply-brigade-movement`** — applies `brigade_movement_orders` (`applyBrigadeMovementOrders`).
3. **`derive-osid-front-segments`**
4. **`partition-corps-front-sectors`** — builds `corps_front_sectors`.
5. **`assign-brigades-to-subsegments`** — fills `primary_brigade_ids`, `assigned_sub_segment_id`.
6. **`distribute-brigades-to-front`** — Phase A/B as above; may set **`brigade_movement_orders`** for column marches.

**Much later in the same turn:**

7. **`generate-bot-corps-orders`**
8. **`generate-bot-brigade-orders`** — `generateAllBotOrdersOsid` → `executeFactionDirectives` → evaluation chain including **`evaluateSectorMarch`** in `bot_brigade_eval_front.ts` (covers both **assigned** and **reserve** sector brigades not on the sector front, subject to its own guards).

So within one turn, **physical movement from prior orders runs first**; **sector geometry and primary assignment** run next; **distribution** may append column orders **after** that movement; **bot AI** runs **after** distribution.

**Cross-turn behavior:** Column orders written at `distribute-brigades-to-front` are intended to be consumed at the **next** turn’s `osid-column-movement` / `apply-brigade-movement` (same ordering as above).

---

## 5. Races: can brigades end up with no movement orders when they need them?

### A. Reserves vs `distributeBrigadesToFront`

- Reserves **never** receive distribution step column orders. Rear positioning for reserves depends on **bot** logic (e.g. `evaluateSectorMarch`) or other systems, not on `distributeBrigadesToFront`.

### B. Primary brigades with `dist > 20` (or BFS `Infinity`)

- **That turn**, `distributeBrigadesToFront` does nothing for Phase B for that brigade. They may still receive bot-issued column marches later **the same turn** if `evaluateSectorMarch` (or another evaluator) produces a destination.

### C. Overwrite of `brigade_movement_orders` at `generateAllBotOrdersOsid`

**Important:** `generateAllBotOrdersOsid` builds `mergedMovement` from **only** bot-generated `movement_orders` and `column_march_orders`. When `Object.keys(mergedMovement).length > 0`, it assigns:

```ts
state.military.brigade_movement_orders = mergedMovement;
```

This is a **full replacement**, not a merge with pre-existing orders.

**Implications:**

- If the bot produces **no** movement/column entries, the `if` block does **not** run, and **`brigade_movement_orders` from `distribute-brigades-to-front` can persist** into the next turn.
- If the bot produces **at least one** movement/column order, **all** prior keys on `brigade_movement_orders` that are **not** in `mergedMovement` are **dropped** — including column marches that distribution assigned earlier **the same turn**, unless the bot also emits an order for those brigade IDs.

So there is a **real ordering interaction**: distribution runs **before** `generate-bot-brigade-orders`, but bot output can **wipe** distribution-only column orders when any bot movement is written.

### D. Bot evaluation order and “no orders”

- `executeFactionDirectives` runs a fixed evaluator chain per brigade; not every brigade gets an attack/move each turn.
- A brigade can still receive **posture-only** orders via `brigade_posture_orders` without movement.
- **Stranded primary rear brigades** (distribution skipped due to distance, bot did not issue march): may see **no** new movement orders that turn; they remain until a later turn’s distribution, bot march, or another subsystem moves them.

---

## 6. Summary table

| Question | Answer |
|----------|--------|
| Brigades in sector but not in `primary_brigade_ids`? | **Yes** — **reserve** brigades (`reserve_brigade_ids`). |
| Does `distributeBrigadesToFront` skip them? | **Yes** — only `primary_brigade_ids` are processed. |
| `dist > 20` this turn? | No Phase B column order from distribution; no instant move unless `dist === 1` handled separately; BFS cap may yield `Infinity`. |
| Movement apply vs distribute vs bot? | Same turn: **movement apply → sectors → assign → distribute → … → bot brigade orders**. Distribution orders are meant for **next** turn’s movement steps unless overwritten by bot. |
| Race on orders? | **Yes:** bot **replaces** `brigade_movement_orders` when it emits any movement; distribution-only marches can be lost. Reserves never get distribution marches; they rely on bot/other paths. |

---

## 7. File references

| Topic | File |
|-------|------|
| Primary assignment | `src/sim/combat/subsegment_assignment.ts` |
| Distribution Phases A/B | `src/sim/combat/brigade_front_distribution.ts` |
| BFS distance cap | `src/sim/combat/sector_utils.ts` (`bfsDistance`) |
| War phase step order | `src/sim/turn_phases/war_phases.ts` |
| Bot sector march (assigned + reserve) | `src/sim/combat/bot_brigade_eval_front.ts` |
| Bot order write / movement merge | `src/sim/combat/bot_brigade_ai_osid.ts` (`generateAllBotOrdersOsid`) |
