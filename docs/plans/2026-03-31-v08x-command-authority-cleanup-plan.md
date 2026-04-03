# v0.8.x-final Command Authority Cleanup

**Date:** 2026-03-31 (rewritten 2026-04-03 with file-level specificity)  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.8.x-final  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - owns architectural calls, flags decisions for user review  
**Primary implementer roles:** Technical Architect, Gameplay Programmer, Systems Programmer, UI/UX Developer  
**Primary reviewer roles:** Authority Auditor, UI Truth Keeper, Code Simplifier, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

**Purpose:** Make ownership singular across the command stack so the repo stops lying about who decides movement, operations, and command execution.

**Prerequisites:**
- `v0.8.0` stabilization credible (n1302 ATH: 93.7%, 25/25 anchors)
- Operations singularity Phase 1-4 already COMPLETE (Phase 5 deferred to v0.8-to-v0.9)
- `codex/truth-ownership-wave2` branch merged (spatial truth invariants in place)
- `generateCorpsDirectives` already removed from codebase
- `USE_COMMANDER_LOOP` toggle already removed from codebase

**Codex Truth Principles (established by truth-ownership-wave2, MUST be respected):**
1. Spatial truthfulness > arbitrary assignment coverage
2. Connected components are hard boundaries — no cross-component teleportation
3. Late mutation layers must respect earlier truth
4. Persisted player intent is not fact — guard against stale geography
5. Operational caps ≠ truthful invariants — don't reuse tactical params as truth proofs
6. Unresolved is honest; forced assignment is a lie

**Files the Codex agent modified (coordinate if touching):**
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/commander_override.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/pre_planned_operations.ts`
- `src/sim/combat/operation_validation.ts`
- `src/scenario/scenario_runner.ts`
- `src/state/game_state.ts`

**Relevant life lessons to respect while executing:**
- Fix the symptom in ALL callers — verify the actual code path uses the change
- Gap finder asks the questions nobody else thinks to ask — use before architectural work
- Parallel agent dispatch needs exclusive file ownership
- Decisions without traces are undebuggable — instrument before investigating
- Build diagnostic tools, not one-off scripts

---

## 0. Scope

This milestone is broader than operations singularity.
It includes the repo-wide command authority cleanup that later commander maturity, order interpretation, and ops UX work depend on.

Primary sublanes:
- operations singularity — **COMPLETE (Phases 1-4)**
- movement ownership cleanup — **THIS PLAN, Phase 2**
- hardcoded rail cleanup — **THIS PLAN, Phase 3**
- hotspot ownership annotation — **THIS PLAN, Phase 4**
- UI / adapter truth alignment — **THIS PLAN, Phase 5**

The five mandatory cleanup questions remain binding for every task:
1. canonical owner after the change
2. competing path removed or demoted
3. test or observable proof
4. UI or report surface that reflects the truth
5. future milestone unblocked

---

## 1. Phase Status

### Phase 1. Operations Singularity — ✅ COMPLETE

Phases 1-4 completed 2026-04-01. Phase 5 (diagnostics/SITREP alignment) deferred to v0.8-to-v0.9.
- Commit bd1712dd: canonical ownership comments
- Commit b5d89af2: lifecycle collapse
- Commit 14b9b74d: creation/launch/update unification
- Commit 8820ef43: UI truth alignment

**Done gate satisfied:** One canonical operation object, one lifecycle owner (`sector_offensive.ts`), one creation factory (`corps_operation_helpers.ts`).

---

## 2. Phase 2 — Movement Authority Classification

**Goal:** Classify every brigade movement writer into exactly one authority tier. Declare `commander_loop.ts` as the sole strategic intent owner. Document the authority hierarchy so a maintainer opening any movement file knows its role.

**Assigned to:** Gameplay Programmer + Technical Architect  
**Reviewer:** Authority Auditor, Code Review  
**Sign-off:** Orchestrator, Architect

### 2.1. The Authority Hierarchy

Every system that writes `brigade_movement_orders`, `brigade_movement_state`, or `location_osid` falls into exactly one tier:

| Tier | Role | Description |
|------|------|-------------|
| **T1 — Strategic Intent** | Decides WHERE brigades should be | Only the commander loop. Writes sector assignments, operation plans, stance directives. |
| **T2 — Tactical Routing** | Decides HOW to get there | Bot brigade AI evaluates sector march, column march targets, interior repositioning. Operates within T1's assignment. |
| **T3 — Execution** | Moves brigades along decided paths | Column march engine, single-hop movement application. No decision authority. |
| **T4 — Combat Consequence** | Movement forced by battle outcome | Attack resolution: retreat, advance, breakthrough. Not a planning decision. |
| **T5 — Lifecycle** | Spawn/despawn placement | Reconstitution, reserve system. Not a movement decision per se. |
| **T6 — Repair** | Fixes broken state post-decision | Commander march correction, front distribution, home return. Corrective, not authoritative. |

### 2.2. File-Level Classification Table

Each file gets a boundary comment declaring its tier. The comment also names what this file MUST NOT do.

| File | Tier | Writes | Must Not |
|------|------|--------|----------|
| `src/sim/combat/commander/commander_loop.ts` | T1 | `directive`, `active_operations`, `sector_stance` | Write `brigade_movement_orders` directly |
| `src/sim/combat/commander/allocate.ts` | T1 | `sector_assignment` (via directive) | Move brigades — only assigns to sectors |
| `src/sim/combat/commander/emit.ts` | T1 | `active_operations` (creates ops) | Write movement orders |
| `src/sim/combat/bot_brigade_ai_osid.ts` | T2 | `brigade_movement_orders` (merged) | Override T1 sector assignment |
| `src/sim/combat/bot_brigade_eval_front.ts` | T2 | `brigade_movement_orders` (sector march) | Reassign to different corps sector |
| `src/sim/combat/bot_brigade_eval_movement.ts` | T2 | `brigade_movement_orders` (interior move) | Move cross-component (Codex principle #2) |
| `src/sim/combat/bot_brigade_movement_ai.ts` | T2 | Column march targets (offensive) | Override T1 operation objectives |
| `src/sim/combat/osid_column_movement.ts` | T3 | `brigade_movement_state`, `location_osid` | Decide destination — only execute path |
| `src/sim/combat/brigade_movement_orders.ts` | T3 | `location_osid` (single-hop) | Decide destination — only apply order |
| `src/sim/combat/attack_resolution_osid.ts` | T4 | `location_osid` (retreat/advance) | Issue march orders — only resolve combat position |
| `src/sim/combat/sector_offensive.ts` | T4 | `brigade_movement_orders` (op march) | Override commander's operation plan |
| `src/sim/combat/brigade_reconstitution.ts` | T5 | `location_osid` (spawn placement) | Move existing brigades |
| `src/sim/combat/army_reserve_system.ts` | T5 | `location_osid`, clears movement state | Override active operations |
| `src/sim/combat/commander_march_correction.ts` | T6 | `brigade_movement_orders` (fix invalid) | Issue new strategic intent |
| `src/sim/combat/brigade_front_distribution.ts` | T6 | `location_osid`, `brigade_movement_orders` | Override sector assignment |
| `src/sim/combat/brigade_home_return.ts` | T6 | `brigade_movement_orders` (return march) | Override active operation participation |

### 2.3. Implementation Steps

**Step 2.3.1 — Add boundary comments to each file (15 files)**

Add a structured comment block at the top of each file (after imports). Format:

```typescript
/**
 * MOVEMENT AUTHORITY: T[N] — [Role Name]
 *
 * Writes: [what state fields this file writes]
 * Reads:  [what it reads to make decisions]
 * Must not: [what this file must never do]
 *
 * Upstream authority: [what T1/T2 decision this executes]
 * Downstream consumers: [what reads this file's output]
 *
 * Codex truth invariants respected:
 * - [list applicable principles from truth-ownership-wave2]
 */
```

**Exact changes per file:**

1. **`commander/commander_loop.ts`** — Add after line 1 imports:
   ```
   MOVEMENT AUTHORITY: T1 — Strategic Intent Owner
   Writes: directive (sector_stance, sector_assignment), active_operations
   Reads: briefing (world state summary), previous commander state
   Must not: write brigade_movement_orders or location_osid directly
   Downstream: allocate.ts → emit.ts → bot_brigade_ai_osid.ts
   ```

2. **`bot_brigade_ai_osid.ts`** — Add after imports:
   ```
   MOVEMENT AUTHORITY: T2 — Tactical Routing (Bot Brigade AI)
   Writes: brigade_movement_orders (merged from all bot evaluations)
   Reads: T1 directive (sector assignment, stance), sector sub-segments
   Must not: override T1 sector assignment or reassign to different corps
   Upstream: commander_loop.ts directive
   Downstream: osid_column_movement.ts, brigade_movement_orders.ts
   Codex: respects connected-component boundaries (principle #2)
   ```

3. **`bot_brigade_eval_front.ts`** — Add after imports:
   ```
   MOVEMENT AUTHORITY: T2 — Tactical Routing (Sector March)
   Writes: brigade_movement_orders (column march to sector front)
   Reads: sector sub_segments.friendly_osids, directive.sector_reassignment_orders
   Must not: reassign brigade to different corps sector
   Upstream: commander_loop.ts sector assignment
   ```

4. **`bot_brigade_eval_movement.ts`** — Add after imports:
   ```
   MOVEMENT AUTHORITY: T2 — Tactical Routing (Interior Reposition)
   Writes: brigade_movement_orders (rear-area repositioning)
   Reads: brigade location, sector assignment, front state
   Must not: move cross-component (Codex principle #2)
   ```

5. **`bot_brigade_movement_ai.ts`** — Add after imports:
   ```
   MOVEMENT AUTHORITY: T2 — Tactical Routing (Offensive Movement)
   Writes: column march targets for operation participants
   Reads: operation objectives, attack orders
   Must not: override T1 operation objectives
   ```

6. **`osid_column_movement.ts`** — Add after imports:
   ```
   MOVEMENT AUTHORITY: T3 — Execution (Column March Engine)
   Writes: brigade_movement_state (init/update/clear), location_osid (incremental)
   Reads: brigade_movement_orders with stance='column'
   Must not: decide destination — only execute Dijkstra path from T2 orders
   ```

7. **`brigade_movement_orders.ts`** — Add after imports:
   ```
   MOVEMENT AUTHORITY: T3 — Execution (Single-Hop Movement)
   Writes: location_osid (adjacent OSID move), clears brigade_movement_orders
   Reads: brigade_movement_orders (no stance)
   Must not: decide destination — only validate adjacency and apply
   ```

8. **`attack_resolution_osid.ts`** — Add after imports:
   ```
   MOVEMENT AUTHORITY: T4 — Combat Consequence
   Writes: location_osid (defender retreat, attacker advance, displacement)
   Reads: combat outcome, fallback destinations
   Must not: issue march orders — only resolve combat-forced position changes
   ```

9. **`sector_offensive.ts`** — Existing canonical ownership comment covers operations. Add movement clause:
   ```
   MOVEMENT AUTHORITY: T4 — Combat Consequence (Operation March)
   Writes: brigade_movement_orders during operation preparation/execution
   Must not: override commander's operation plan — only march participants to objectives
   ```

10. **`brigade_reconstitution.ts`** — Add after imports:
    ```
    MOVEMENT AUTHORITY: T5 — Lifecycle (Brigade Reconstitution)
    Writes: location_osid (spawn placement at municipality)
    Must not: move existing brigades — only place newly reconstituted ones
    ```

11. **`army_reserve_system.ts`** — Add after imports:
    ```
    MOVEMENT AUTHORITY: T5 — Lifecycle (Army Reserve)
    Writes: location_osid (reserve recall), clears movement orders/state
    Must not: override active operation participation
    ```

12. **`commander_march_correction.ts`** — Add after imports:
    ```
    MOVEMENT AUTHORITY: T6 — Repair (March Correction)
    Writes: brigade_movement_orders (recomputed BFS path), deletes invalid movement_state
    Reads: assigned sub-segment friendly_osids, current march destination
    Must not: issue new strategic intent — only fix invalid march destinations
    Codex: respects connected-component boundaries (principle #2)
    ```

13. **`brigade_front_distribution.ts`** — Add after imports:
    ```
    MOVEMENT AUTHORITY: T6 — Repair (Front Distribution)
    Writes: location_osid (Phase A: unstacking), brigade_movement_orders (Phase B: march to front)
    Reads: sector sub_segments, brigade locations, stacking state
    Must not: override sector assignment — only spread within assigned sector
    Codex: unresolved is honest (principle #6) — don't force-assign cross-component
    ```

14. **`brigade_home_return.ts`** — Add after imports:
    ```
    MOVEMENT AUTHORITY: T6 — Repair (Home Return)
    Writes: brigade_movement_orders (column march home)
    Reads: brigade home_osid, current location, hop distance
    Must not: override active operation participation — only recall idle displaced brigades
    Rate limited: RETURN_MAX_PER_CORPS=2 simultaneous, RETURN_CHECK_INTERVAL=4 turns
    ```

**Step 2.3.2 — Create movement authority reference doc**

Write `docs/20_engineering/MOVEMENT_AUTHORITY.md` with:
- The 6-tier table from §2.1
- The file classification table from §2.2
- Pipeline step ordering (from war_phases.ts):
  ```
  Step 574: osid-column-movement (T3 — execute multi-hop)
  Step 597: apply-brigade-movement (T3 — execute single-hop)
  Step 676: distribute-brigades-to-front (T6 — repair stacking)
  Step 690: return-displaced-brigades (T6 — repair displacement)
  Step 1027: commander-correct-march-orders (T6 — repair invalid)
  Step 1062: generate-bot-brigade-orders (T2 — tactical routing)
  ```
- Note: T1 runs earlier in pipeline via `commander-loop` step; T4 runs inside `resolve-attack-orders-osid`
- Cross-reference to Codex truth principles

**Step 2.3.3 — Add movement authority test**

Create `tests/movement_authority_tiers.test.ts`:
- Test 1: Verify `commander_loop` never writes `brigade_movement_orders` directly (grep/AST check of exports)
- Test 2: Verify `osid_column_movement` never calls `evaluateSectorMarch` or any T2 decision function
- Test 3: Verify `brigade_movement_orders.ts` (T3) never calls any function from commander/ directory
- Test 4: Verify `attack_resolution_osid.ts` never writes `brigade_movement_orders` (only `location_osid`)
- Test 5: Verify no T6 file imports from T1 (repair must not depend on strategic intent)

**Verification:**
```bash
npx tsc --noEmit
node_modules/.bin/vitest run tests/movement_authority_tiers.test.ts
node_modules/.bin/vitest run
npm run desktop:map:build
```

**Done gate:** Every movement file has a tier annotation. `MOVEMENT_AUTHORITY.md` exists. Authority tier tests pass. A maintainer opening any movement file knows its tier, what it writes, what it must not do.

→ `/simplify` → smoke-test triad → `/verification-before-completion` → `/awwv-pre-commit-check` → commit

---

## 3. Phase 3 — Hardcoded Rail Cleanup

**Goal:** Replace hardcoded corps name-checks and faction-specific constants with data-driven alternatives. The remaining "rails" are not legacy command paths (those are already gone) — they are hardcoded behavioral exemptions that should flow from scenario data or faction doctrine tables.

**Assigned to:** Systems Programmer + Gameplay Programmer  
**Reviewer:** Authority Auditor, Code Review, Canon Compliance  
**Sign-off:** Orchestrator, Architect

### 3.1. Legacy Command Paths — Already Removed

- `generateCorpsDirectives` — grep confirms: **zero references in src/**. Fully removed.
- `USE_COMMANDER_LOOP` — grep confirms: **zero references in src/**. Fully removed.
- No hidden fallback restoring the old authority model.

### 3.2. Remaining Hardcoded Rails

**Inventory (from grep):**

| Rail | File:Line | What It Does | Data-Driven Alternative |
|------|-----------|-------------|------------------------|
| RS blitz exemption | `bot_corps_directives.ts:224` | `faction === 'RS' && turn <= RS_BLITZ_PHASE_END_WEEK` bypasses probe requirement | Move to `FACTION_DOCTRINE_PHASES` — RS blitz phase already has `default_corps_stance`. Add `probe_exempt: true` field to `DoctrinePhase` |
| RS blitz prep skip | `sector_offensive.ts:1010-1011` | `faction === 'RS' && turn <= RS_BLITZ_PHASE_END_WEEK` skips operation preparation | Same: read `probe_exempt` from active doctrine phase |
| Sarajevo comms | `army_hq_gathering.ts:116` | `corpsId === 'arbih_1st_corps'` → radio before tunnel turn | Move to scenario JSON: `comms_override_by_corps: { arbih_1st_corps: { before_turn: N, mode: 'radio' } }` |
| HVO Central Bosnia gate | `bot_corps_stance.ts:227` | `corps.id === 'hvo_central_bosnia'` → blocks offensive until HRHB-RBiH war starts | Already correctly gated by `state.political.rbih_hrhb_state?.war_started_turn`. The corps name-check is the right guard — this corps literally doesn't exist until the war transition creates it. **KEEP AS-IS.** |
| SRK siege coverage | `brigade_assignment.ts:932` | `sector.corps_id === 'vrs_sarajevo_romanija'` → special coverage rule | Codex agent is actively working on this file. **DEFER — do not touch until Codex branch merges.** After merge, evaluate whether the Codex truth invariants make this check unnecessary. |

### 3.3. Implementation Steps

**Step 3.3.1 — Add `probe_exempt` to DoctrinePhase type**

File: `src/state/war_timeline.ts`
```typescript
export interface DoctrinePhase {
    // ... existing fields ...
    /** When true, corps may commit to operations without probing first. */
    probe_exempt?: boolean;
}
```

**Step 3.3.2 — Add `probe_exempt: true` to RS blitz doctrine phase**

File: `src/sim/combat/bot_strategy.ts` — in `FACTION_DOCTRINE_PHASES.RS[0]` (the blitz phase, weeks 0-12):
```typescript
{ start: 0, end: 12, ..., probe_exempt: true }
```

**Step 3.3.3 — Replace hardcoded RS blitz check in `bot_corps_directives.ts`**

File: `src/sim/combat/bot_corps_directives.ts`, line ~217-224

The function `shouldLaunchProbeInstead` is exported but **never called at runtime** — only by `tests/intel_gated_operations.test.ts`. The inline RS blitz check is the only consumer of `RS_BLITZ_PHASE_END_WEEK` in this file.

Before:
```typescript
export function shouldLaunchProbeInstead(
    faction: FactionId,
    sectorIntelConfidence: number,
    consecutiveProbes: number,
    turn?: number,
): boolean {
    // RS blitz phase exemption: JNA-trained forces attack without probing
    if (faction === 'RS' && (turn ?? 999) <= RS_BLITZ_PHASE_END_WEEK) return false;
```

After:
```typescript
export function shouldLaunchProbeInstead(
    faction: FactionId,
    sectorIntelConfidence: number,
    consecutiveProbes: number,
    turn?: number,
    timeline?: WarTimeline,
): boolean {
    // Doctrine phase exemption: some phases (e.g. RS blitz) bypass probe requirement
    const doctrinePhase = getActiveDoctrinePhase(faction, turn ?? 0, timeline);
    if (doctrinePhase?.probe_exempt) return false;
```

Add `import type { WarTimeline } from '../../state/war_timeline.js'` if not already present.
Add `import { getActiveDoctrinePhase } from './bot_strategy.js'` if not already present.

Update test file `tests/intel_gated_operations.test.ts`:
- RS blitz test (line 72): `shouldLaunchProbeInstead('RS', 0.0, 0, 5)` still works (timeline=undefined → falls back to hardcoded `FACTION_DOCTRINE_PHASES`)
- No other callers exist in src/ — no runtime callers to update.

**Step 3.3.4 — Replace hardcoded RS blitz check in `sector_offensive.ts`**

File: `src/sim/combat/sector_offensive.ts`, line ~1010-1011

Before:
```typescript
const isPrePlannedBlitz = faction === 'RS' && turn <= RS_BLITZ_PHASE_END_WEEK;
```

After:
```typescript
const activePhase = getActiveDoctrinePhase(faction, turn, state.military.war_timeline);
const isPrePlannedBlitz = activePhase?.probe_exempt === true;
```

**Step 3.3.5 — Add comms override to scenario JSON**

File: `src/scenario/scenario_types.ts` — add optional field:
```typescript
comms_override_by_corps?: Record<string, { before_turn: number; mode: 'radio' | 'full' }>;
```

File: `data/scenarios/apr1992_definitive_40w.json` — add:
```json
"comms_override_by_corps": {
    "arbih_1st_corps": { "before_turn": 18, "mode": "radio" }
}
```

File: `src/sim/combat/army_hq_gathering.ts`, line ~116 — replace:
```typescript
if (corpsId === 'arbih_1st_corps') {
    return turn < SARAJEVO_TUNNEL_TURN ? 'radio' : 'full';
}
```
with:
```typescript
const override = scenario.comms_override_by_corps?.[corpsId];
if (override && turn < override.before_turn) {
    return override.mode;
}
```

**Step 3.3.6 — Remove `RS_BLITZ_PHASE_END_WEEK` if no remaining consumers**

After steps 3.3.3 and 3.3.4, grep for `RS_BLITZ_PHASE_END_WEEK`. If zero consumers remain, delete the constant from `bot_constants.ts`.

**Step 3.3.7 — Add rail-free verification test**

Create `tests/hardcoded_rail_audit.test.ts`:
- Test 1: Grep `src/sim/combat/` for `=== 'RS'` pattern — whitelist known-legitimate checks, fail on new ones
- Test 2: Grep for `RS_BLITZ_PHASE_END_WEEK` — expect zero matches outside bot_constants.ts and tests
- Test 3: Verify `DoctrinePhase` has `probe_exempt` field
- Test 4: Verify RS blitz doctrine phase has `probe_exempt: true`

**Verification:**
```bash
npx tsc --noEmit
node_modules/.bin/vitest run tests/hardcoded_rail_audit.test.ts
node_modules/.bin/vitest run
npm run sim:scenario:run:40w
```

Run 40w scenario because probe exemption and prep skip affect combat timing — verify no anchor regressions.

**Done gate:** No hardcoded `faction === 'RS' && turn <= RS_BLITZ_PHASE_END_WEEK` remains in combat logic. Blitz behavior flows from `DoctrinePhase.probe_exempt`. Sarajevo comms flows from scenario JSON. Calibration anchors unchanged.

→ `/simplify` → smoke-test triad → 40w calibration run → `/verification-before-completion` → `/awwv-pre-commit-check` → commit

---

## 4. Phase 4 — Hotspot Ownership Annotation

**Goal:** Add structured ownership comments to the top of every command-authority hotspot file. After this phase, a new maintainer opening any hotspot file immediately knows: who owns it, what it decides, what it must not do, and which truth principles it respects.

**Assigned to:** Technical Architect + Documentation Specialist  
**Reviewer:** Authority Auditor  
**Sign-off:** Orchestrator, Architect

### 4.1. Current State

Only **1 of 16 hotspot files** has an ownership annotation:
- ✅ `sector_offensive.ts` — has `CANONICAL LIFECYCLE OWNER — Corps Operations`
- ❌ All 15 others have no ownership annotation

### 4.2. Annotation Format

Every hotspot file gets this block after its imports (before first export/function):

```typescript
/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: [Canonical | Transitional | Execution-Only | Repair]
 * DOMAIN:    [what domain this file owns]
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   [what decisions this file makes]
 * WRITES:    [what state fields it mutates]
 * READS:     [key inputs]
 * MUST NOT:  [hard constraints — what this file must never do]
 *
 * UPSTREAM:  [what feeds into this file's decisions]
 * DOWNSTREAM: [what consumes this file's output]
 *
 * TRUTH INVARIANTS:
 * - [applicable Codex truth principles]
 *
 * MOVEMENT TIER: T[N] — [tier name] (if applicable, references MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */
```

### 4.3. Files to Annotate

**Combine with Phase 2 movement annotations** — files that got T-tier comments in Phase 2 get the full ownership block instead (movement tier is one field within it). Do NOT annotate twice.

**Additional non-movement hotspot files needing ownership annotation:**

| # | File | Ownership | Domain |
|---|------|-----------|--------|
| 1 | `src/sim/combat/commander/commander_loop.ts` | Canonical | Corps commander decision cycle |
| 2 | `src/sim/combat/commander/briefing.ts` | Canonical | Commander situational awareness |
| 3 | `src/sim/combat/commander/assess.ts` | Canonical | Threat/opportunity assessment |
| 4 | `src/sim/combat/commander/plan.ts` | Canonical | Operation planning |
| 5 | `src/sim/combat/commander/allocate.ts` | Canonical | Brigade-to-sector allocation |
| 6 | `src/sim/combat/commander/emit.ts` | Canonical | Directive emission |
| 7 | `src/sim/combat/commander/decide.ts` | Canonical | Commander decision routing |
| 8 | `src/sim/combat/bot_corps_operations.ts` | Transitional | Legacy op creation entry points |
| 9 | `src/sim/combat/corps_operation_helpers.ts` | Canonical | Operation factory functions |
| 10 | `src/sim/combat/bot_corps_directives.ts` | Transitional | Bot corp directive generation |
| 11 | `src/sim/combat/bot_corps_stance.ts` | Canonical | Corps stance computation |
| 12 | `src/sim/combat/bot_strategy.ts` | Canonical | Faction strategy + doctrine phases |
| 13 | `src/sim/combat/brigade_assignment.ts` | Canonical | Brigade territory classification + sector assignment |
| 14 | `src/ui/map/data/GameStateAdapter.ts` | Canonical | UI read path — single source of game state for all UI |
| 15 | `src/sim/combat/operation_preparation.ts` | Canonical | Operation preparation state machine |

**Note on `brigade_assignment.ts`:** Codex agent actively modified this file. Add annotation ONLY after Codex branch merges. The annotation must reference the Codex truth invariants (spatial truthfulness, connected components, unresolved-is-honest).

### 4.4. Implementation Steps

**Step 4.4.1 — Write annotations for commander/ directory (7 files)**

These are the safest — no Codex conflicts, clear canonical ownership.

**Step 4.4.2 — Write annotations for bot strategy files (4 files)**

`bot_corps_operations.ts` gets `Transitional` — must explicitly say:
```
OWNERSHIP: Transitional — legacy/compatibility operation creation
MUST NOT: create operations outside its declared entry points (emergency defense, OG activation)
DOWNSTREAM: sector_offensive.ts (canonical lifecycle takes over after creation)
NOTE: This file's creation paths will be folded into commander/emit.ts when v0.8.1 lands
```

**Step 4.4.3 — Write annotations for execution/repair files (covered by Phase 2)**

Already done if Phase 2 executed first. If running Phase 4 independently, use the full annotation format from §4.2 instead of the shorter movement-only comments from Phase 2.

**Step 4.4.4 — Write `GameStateAdapter.ts` annotation**

```
OWNERSHIP: Canonical — UI Read Path
DOMAIN: Single source of game state for all UI components
DECIDES: nothing — read-only adapter
WRITES: nothing in game state — only transforms for UI consumption
MUST NOT: mutate game state, cache stale state, or expose raw engine internals to player
TRUTH INVARIANTS:
- Player-visible state boundary (Codex principle #4 — persisted player intent is not fact)
- All fields must resolve through player-safe display helpers
```

**Step 4.4.5 — Verify no annotation contradicts another**

Quick audit: for every `MUST NOT` in one file, verify no other file's `DECIDES` or `WRITES` contradicts it. Example: if `commander_loop.ts` says `MUST NOT: write brigade_movement_orders`, verify no code path in `commander_loop.ts` or its callees writes that field.

**Verification:**
```bash
npx tsc --noEmit
node_modules/.bin/vitest run
```

No calibration run needed — comments-only change.

**Done gate:** Every hotspot file in the command stack has a structured ownership annotation. No two annotations claim canonical ownership of the same domain. `MUST NOT` constraints are verified against actual code.

→ `/simplify` → documentation verification → commit

---

## 5. Phase 5 — UI / Adapter Truth Alignment

**Goal:** Verify that command-related UI surfaces present the same authority truth that the engine enforces. Flag any UI surface that implies cleaner ownership than the backend guarantees.

**Assigned to:** UI/UX Developer + Technical Architect  
**Reviewer:** UI Truth Keeper, Modern Wargame Expert  
**Sign-off:** Orchestrator, Architect

### 5.1. Current State — Adapter Discipline Already Clean

Grep confirms: **zero instances** of `state.military.` in `src/ui/map/components/**/*.{tsx,ts}`. All UI components already read through `GameStateAdapter`. The truth-ownership-wave2 agent also cleaned player-safe label leaks.

This means Phase 5 is a **verification and lock-down phase**, not a fix phase.

### 5.2. Surfaces to Verify

| Surface | File(s) | What to Verify |
|---------|---------|---------------|
| Operations Panel | `src/ui/map/components/ops_modal/OperationsPanel.tsx` | Operation phases match `sector_offensive.ts` lifecycle |
| Operation Briefing | `src/ui/map/components/ops_modal/OperationBriefingModal.tsx` | Commander identity matches `emit.ts` logic |
| Corps Front Panel | `src/ui/map/components/CorpsFrontPanel.tsx` | Sector display matches `corps_front_sectors.ts` truth |
| Army HQ ORBAT | `src/ui/map/components/army_hq/OrbatSection.tsx` | Player-safe labels (already cleaned by Codex agent) |
| War Summary | `src/ui/map/components/army_hq/WarSummaryContent.tsx` | Respects player-visible-state boundary |
| GameStateAdapter | `src/ui/map/data/GameStateAdapter.ts` | Confirmed: sole UI read path — no bypasses |

### 5.3. Implementation Steps

**Step 5.3.1 — Verify operation lifecycle display**

Read `OperationsPanel.tsx` and confirm:
- Operation phases displayed match `sector_offensive.ts` lifecycle phases
- No phantom operation states that don't exist in the engine
- Commander identity (who created the op) matches `emit.ts` logic
- If discrepancies found: fix them. If clean: document in completion report.

**Step 5.3.2 — Verify sector display**

Read `CorpsFrontPanel.tsx` and confirm:
- Sector IDs match `corps_front_sectors.ts` output
- Unresolved brigades (from Codex principle #6) are displayed honestly, not hidden
- If the panel hides unresolved brigades, add a "unassigned" indicator

**Step 5.3.3 — Add adapter boundary regression test**

Create `tests/ui_adapter_boundary.test.ts`:
- Test 1: Grep `src/ui/map/components/` for `state.military.` — expect zero matches (lock down current discipline)
- Test 2: Grep `src/ui/map/components/` for imports from `src/sim/combat/` — whitelist only type imports; flag runtime imports
- Test 3: Verify `GameStateAdapter` operation view fields match `sector_offensive.ts` phase enum values

This test prevents future adapter bypass — any new component that reads raw state will fail CI.

**Step 5.3.4 — Add ownership annotation to `GameStateAdapter.ts`**

(Already specified in Phase 4 §4.4.4 — verify it was applied.)

**Verification:**
```bash
npx tsc --noEmit
node_modules/.bin/vitest run tests/ui_adapter_boundary.test.ts
node_modules/.bin/vitest run
npm run desktop:map:build
```

**Done gate:** Verification confirms UI surfaces are clean. Regression test locks down adapter discipline. Any discrepancies found during verification are fixed. Completion report documents the audit results.

→ `/simplify` → smoke-test triad → `/verification-before-completion` → `/awwv-pre-commit-check` → commit

---

## 6. Protocol Enforcement

- [ ] Orchestrator oversees the milestone
- [ ] Architect flags architectural decisions for user review
- [ ] `.claude/napkin.md` read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` updated for major cleanup milestones
- [ ] `docs/life_lessons.md` scanned before each phase
- [ ] every task answers the five cleanup questions before work starts
- [ ] engine and UI changes remain in separate commits unless explicitly justified
- [ ] Codex truth principles (§Prerequisites) respected in every change
- [ ] No modifications to files the Codex agent is actively changing (see §Prerequisites list)
- [ ] `/create-report` writes a completion report to `docs/40_reports/implemented/` when the milestone closes

---

## 7. Completion Checklist

- [ ] ~~Phase 1: operations singularity~~ ✅ COMPLETE
- [ ] Phase 2: movement authority classified, annotated, tested, documented
- [ ] Phase 3: hardcoded rails replaced with data-driven alternatives, 40w calibration clean
- [ ] Phase 4: all hotspot files have structured ownership annotations
- [ ] Phase 5: UI command surfaces read through adapter, regression test in place
- [ ] `docs/20_engineering/MOVEMENT_AUTHORITY.md` created
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated if new recurring authority-cleanup lessons emerged
- [ ] roadmap and audit docs updated if scope/status changed materially
- [ ] completion report written in `docs/40_reports/implemented/`

---

## 8. What This Unblocks

- `v0.8.1` Commander Maturity on top of honest command ownership
- `v0.8.3` Order Interpretation on top of real authority boundaries
- `v0.9.1` ops UX overhaul on top of one real command object
- `v0.8-to-v0.9` repo simplification with less ambiguity about what should survive

---

## 9. Nightshift Execution Notes

This plan is designed for autonomous nightshift execution:

**Phase ordering:** 2 → 3 → 4 → 5 (sequential — each phase's annotations inform the next)

**Safe to parallelize:** Phase 2 (movement annotations) and Phase 4 (non-movement hotspot annotations) could run in parallel if using separate worktrees, since they touch different files. But sequential is safer and recommended.

**Calibration run required:** Only Phase 3 (hardcoded rail cleanup) needs a 40w run — it changes combat behavior. Phases 2, 4, 5 are annotation/audit/test changes.

**Codex coordination:** Wait for `codex/truth-ownership-wave2` to merge before starting. The plan references Codex truth principles that must be in the codebase.

**Conservative choices:**
- When in doubt about a `MUST NOT` constraint, be more restrictive (the constraint can always be relaxed later)
- When in doubt about a file's tier, classify it higher (T2 rather than T3) — demotion is safer than promotion
- If a UI surface's truth alignment is unclear, mark it `// TODO: verify authority alignment` rather than guessing

**Commit strategy:** One commit per phase. Conventional commit messages:
- Phase 2: `docs: classify movement authority tiers across 15 combat files`
- Phase 3: `refactor: replace hardcoded RS blitz and Sarajevo comms with data-driven doctrine`
- Phase 4: `docs: add ownership annotations to 15 command hotspot files`
- Phase 5: `fix: route UI command surfaces through GameStateAdapter`
