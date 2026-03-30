# Movement Authority Map

> Superseded by `20260330_REPO_HEALTH_CONSOLIDATED.md` for owner-facing use. This file remains as source material.

**Date:** 2026-03-30  
**Purpose:** Single-purpose engineering map of every system that can move, stage, reassign, recall, or otherwise change the effective location or availability of brigades in war phase.  
**Audience:** Project owner, future maintainers, and any engineer trying to answer: "who is actually allowed to move a brigade?"

---

## Executive Verdict

The repo does **not** currently have a single clean movement authority.

Instead, it has:

- multiple **movement executors**
- multiple **movement-order writers**
- several **operation and front-management systems** that also issue relocation commands
- a few **availability shifters** that are not literal marching but still move combat power around the map in practical terms

This is the sharpest version of the code-health problem.

The core issue is not simply "too many files."
The core issue is:

**too many actors can tell a brigade where to go, by different mechanisms, through different order buckets, at different points in the pipeline**

That is how repos become hard to reason about even when the code itself is competent.

---

## The Key Question

When an engineer asks:

> "Why did this brigade end up here?"

the answer may currently involve some combination of:

- brigade movement
- OSID column movement
- brigade front distribution
- sector/front evaluation
- operation staging
- return-home logic
- reserve or elite-loan assignment
- desktop-side order staging

That is too many answers.

---

## Authority Categories

For clarity, I am splitting systems into four categories:

1. **Execution engines**
   Systems that physically move brigades or advance their transit state.

2. **Order writers / tactical relocation**
   Systems that generate move intents or transit orders.

3. **Operational relocation**
   Systems that move brigades because an operation, front, or corps assignment needs them somewhere.

4. **Availability shifters**
   Systems that do not literally march brigades but do move combat capacity or corps-level access around in ways that matter strategically.

---

## Movement Authority Table

| File | Category | What it does | Writes / mutates | Keep? |
|------|----------|--------------|------------------|-------|
| `src/sim/combat/brigade_movement.ts` | Execution engine | Classic pack -> in_transit -> unpack movement state machine using settlement graph | `brigade_movement_state`, formation location/state | **Maybe** |
| `src/sim/combat/brigade_movement_orders.ts` | Execution engine | Applies adjacent one-hop movement orders and entrenchment updates | consumes `brigade_movement_orders`, mutates `location_osid` | **Yes** |
| `src/sim/combat/osid_column_movement.ts` | Execution engine | Multi-turn OSID-native column transit using terrain-weighted Dijkstra | consumes column-style movement intent, mutates `brigade_movement_state` and `location_osid` | **Yes** |
| `src/sim/combat/bot_brigade_movement_ai.ts` | Order writer | Chooses movement style, front approach, interior movement helpers | movement/column intent via callers | **Yes, but narrower** |
| `src/sim/combat/bot_brigade_eval_front.ts` | Order writer / operational relocation | Issues column march or movement for sector march, reassignment, return-to-corps, pocket evacuation, front redistribution | `result.column_march_orders`, `result.movement_orders`, sometimes cancels stale orders | **Partly** |
| `src/sim/combat/brigade_front_distribution.ts` | Operational relocation | Physically spreads brigades across sector front OSIDs and issues march orders for rear brigades | direct `location_osid` mutation and `brigade_movement_orders` writes | **Maybe, but suspect** |
| `src/sim/combat/brigade_home_return.ts` | Operational relocation | Periodic return-to-home mechanism for displaced brigades | writes `brigade_movement_orders` | **Maybe / likely redesign** |
| `src/sim/combat/sector_offensive.ts` | Operational relocation | Stages brigades for operations and manages loaned arrivals / participating brigades | writes `brigade_movement_orders`, manipulates op participants | **Yes** |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Order orchestrator | Central brigade AI that gathers movement/column/attack/hold outputs from sub-evaluators | aggregates and writes movement intent into state | **Yes** |
| `src/sim/combat/apply_brigade_reposition.ts` | Dead / legacy carryover | Clears reposition orders but explicitly says AoR is never populated and nothing happens | clears `brigade_reposition_orders` only | **No** |
| `src/sim/combat/strategic_reserve.ts` | Availability shifter | Sweeps manpower into faction reserve and redistributes to under-strength brigades | manpower, personnel, reserves | **Yes** |
| `src/sim/combat/army_reserve_system.ts` | Availability shifter / command reassignment | Elite brigade loan management between corps | loan state, effective corps access to elites | **Yes** |
| `src/desktop/electron-main.cjs` | External order injection | Desktop layer can stage movement orders directly | writes movement orders into state | **Yes, as UI boundary only** |

---

## The Two Real Order Buckets

These are the practical movement authority choke points:

### 1. `state.military.brigade_movement_orders`

Used for:

- direct adjacent movement
- return-home logic
- front distribution
- operation staging
- some brigade AI relocation behavior

Executor:

- [brigade_movement_orders.ts](F:/A-War-Without-Victory/src/sim/combat/brigade_movement_orders.ts)

Main risk:

- many writers
- one shared bucket
- unclear ownership

### 2. `column_march_orders` / column-style transit path

Used for:

- sector march
- deep rear movement
- return-to-corps
- pocket evacuation
- long-distance redeployment

Executor:

- [osid_column_movement.ts](F:/A-War-Without-Victory/src/sim/combat/osid_column_movement.ts)

Main risk:

- multiple evaluators issue column moves
- different pathfinding and safety assumptions than adjacent movement

---

## Current Ownership Map

## A. Physical movement execution

### `brigade_movement_orders.ts`

This is the simple one-hop executor.

It:

- reads `state.military.brigade_movement_orders`
- checks adjacency
- updates `location_osid`
- resets entrenchment if moved
- clears the whole order bucket at end

This looks like a legitimate final surviving piece.

### `osid_column_movement.ts`

This is the long-distance transit executor.

It:

- computes terrain-weighted pathing
- sets in-transit state
- advances multi-turn transit
- lands brigades at destination

This also looks like a legitimate surviving piece.

### Problem

The repo likely wants **exactly these two execution modes** long-term:

- adjacent tactical move
- multi-turn column transit

That part is actually not crazy.

The mess is mostly in who gets to feed them.

---

## B. Tactical / front / corps writers

### `bot_brigade_eval_front.ts`

This file currently does a lot:

- sector reassignment
- sector march
- return-to-corps
- pocket evacuation
- anti-overstack redistribution

This is useful, but too broad. It is not one policy; it is several movement doctrines glued together.

This file is one of the strongest candidates for "too much hidden authority."

### `brigade_front_distribution.ts`

This file is especially suspicious because it does both:

- direct relocation by mutating `location_osid`
- indirect relocation by writing `brigade_movement_orders`

That is exactly the kind of mixed authority that makes maintainers uneasy.

It feels like a corrective patch layer:

- paper assignment was not enough
- brigades stacked badly
- so this file became a physical fix-up stage

This may be useful today, but it is not a clean long-term owner.

### `brigade_home_return.ts`

This is a periodic recall mechanism.

Conceptually, it is plausible.
Architecturally, it is dangerous because it is an independent writer into shared movement orders, based on a separate worldview.

This is the kind of subsystem that should only survive if:

- it is clearly subordinate to commander intent
- it cannot fight front / operation logic

Right now it reads like an additional autonomous relocation policy.

---

## C. Operation-driven relocation

### `sector_offensive.ts`

This one should survive.

Operations need the right to stage and move their participants.

The danger is not that it exists.
The danger is that operation staging logic coexists with other movement writers that may be trying to do other things to the same brigades.

Long-term, operation staging should probably be one of the few blessed reasons a brigade gets to override generic front-placement behavior.

---

## D. Availability shifters

These are not literal map movement, but they matter.

### `strategic_reserve.ts`

This is manpower redistribution, not brigade relocation.
It should be treated separately in design conversations.

It changes battlefield strength distribution, but not who marched where.

Keep it, but do **not** let engineers casually call it a movement system without qualification.

### `army_reserve_system.ts`

This is not tactical movement either.
It is command-level access reassignment for elite units.

Still important, because from the player's point of view it can feel like movement:

- one corps gets access
- another loses it
- brigades "show up" in a different operational context

Keep it, but classify it as force-assignment / command access, not normal movement.

---

## What Should Survive

If I were drawing the target ownership model, I would preserve these as first-class survivors:

### Survive as core execution

1. [brigade_movement_orders.ts](F:/A-War-Without-Victory/src/sim/combat/brigade_movement_orders.ts)
2. [osid_column_movement.ts](F:/A-War-Without-Victory/src/sim/combat/osid_column_movement.ts)

### Survive as upstream intent generators

3. [sector_offensive.ts](F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts)
   Only for operation staging / op-owned relocation

4. [bot_brigade_ai_osid.ts](F:/A-War-Without-Victory/src/sim/combat/bot_brigade_ai_osid.ts)
   As the central aggregator of brigade movement intent

### Survive as separate non-movement systems

5. [strategic_reserve.ts](F:/A-War-Without-Victory/src/sim/combat/strategic_reserve.ts)
6. [army_reserve_system.ts](F:/A-War-Without-Victory/src/sim/combat/army_reserve_system.ts)

But these should be explicitly treated as **availability systems**, not put in the same conceptual box as movement engines.

---

## What Looks Like It Should Be Absorbed Or Retired

### `apply_brigade_reposition.ts`

This one is easy.

It literally says:

- no physical move
- AoR is never populated
- orders are cleared with no effect

This is dead-weight compatibility code, not a real system.

### `brigade_front_distribution.ts`

This looks more like a compensating mechanism than a clean owner.

It may still be needed today, but as a target architecture I would not want:

- a front-distribution pass that sometimes teleports locally
- and sometimes emits move orders
- and lives beside brigade AI and commander-driven staging

This feels like something that should eventually be absorbed into:

- commander-owned front-placement policy
- or brigade AI execution policy

### `brigade_home_return.ts`

This might survive conceptually, but probably not as an independent relocation authority.

It should likely become:

- a commander or corps-level priority signal
- not a separate order-writing engine with equal status

### large parts of `bot_brigade_eval_front.ts`

This file probably contains behaviors that should survive,
but not necessarily in their current shape as one giant movement-authority cluster.

Likely split:

- keep sector march logic
- keep pocket evacuation logic if historically desired
- demote or absorb return-to-corps / redistribution logic into clearer owners

---

## The Real Problem In One Sentence

The repo currently has decent movement executors, but too many movement philosophers.

Everyone has an opinion about where brigades ought to go:

- front logic
- corps assignment logic
- return-home logic
- operation logic
- distribution logic
- reserve logic

That is what makes the system feel railroad-prone even when nobody intended it.

---

## Recommended Target Ownership Model

If the project wants a clean future state, I would aim for this:

### 1. Exactly two execution engines

- adjacent/tactical movement
- multi-turn column transit

### 2. Exactly one central order aggregator

Likely:

- [bot_brigade_ai_osid.ts](F:/A-War-Without-Victory/src/sim/combat/bot_brigade_ai_osid.ts)

This file can remain the place where movement intents are resolved and conflicts are arbitrated.

### 3. Limited privileged writers

Only a small set of systems should be allowed to produce movement intent:

- operation staging
- front / sector assignment
- explicit player / desktop orders
- maybe one fallback recall policy

Not six different semi-autonomous writers.

### 4. Availability systems explicitly separated from movement

- strategic reserve
- army reserve / elite loans

These should be discussed as force distribution or command-access systems, not brigade movement systems.

---

## Most Concerning Findings

1. **Shared order buckets have too many writers.**
   This is the clearest technical risk.

2. **`brigade_front_distribution.ts` mixes direct relocation with order writing.**
   That is an unhealthy amount of authority for a corrective subsystem.

3. **`bot_brigade_eval_front.ts` has become a cluster of relocation doctrines, not one clean responsibility.**

4. **There is still dead compatibility code in the movement area.**
   `apply_brigade_reposition.ts` is the cleanest example.

5. **The conceptual border between movement and availability is blurry.**
   That creates confused design conversations and confused cleanup priorities.

---

## Plain-English Advice

If I were advising the team brutally, I would say:

> Stop asking "how many movement systems do we have?"
> Start asking "which files are allowed to order a brigade to go somewhere?"

That is the real authority map.

And the answer right now is:

**too many**

---

## Suggested Follow-up Questions

1. Which files may write `brigade_movement_orders`?
2. Which files may write column-march intent?
3. Which of those are command decisions, and which are cleanup patches?
4. Which one should win if two systems disagree?
5. Which movement-order writers are temporary and should be retired after commander cleanup?

---

## Notes

- This document is read-only analysis.
- No code changed.
- `FORAWWV.md` was not edited.
- No ledger update was made because this records observations, not behavior changes.
