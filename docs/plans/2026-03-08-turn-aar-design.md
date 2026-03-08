# Turn AAR (After-Action Report) — Design

**Date:** 2026-03-08
**Status:** Approved for implementation
**Scope:** Simulation-side `TurnSummary` object + GUI AAR panel

---

## Problem

After advancing a turn there is no centralized view of what happened. The player must click individual settlements and brigades to reconstruct events. This is a significant usability gap for a strategy game where turn-to-turn narrative is the main feedback loop.

---

## Design Goals

1. Surface all significant events from a completed turn in one place
2. No data loss on reload — summary must be written by the sim, not computed by the GUI
3. Deterministic — no snapshots held in GUI state between advance and read
4. Extensible — easy to add new event types as systems are built

---

## Architecture Overview

```
Turn start
│
├─ [1] capture-aar-snapshot          ← new pipeline step (position 2)
│       Captures: supply, arcs, decorations, formation IDs
│       Stored in TurnContext (transient, not serialized)
│
│   ... all existing pipeline steps ...
│
├─ [2] compile-turn-summary          ← new pipeline step (second-to-last)
│       Reads: context.aarSnapshot + state + context.report
│       Writes: state.turn_summaries[] (persistent, last 3)
│
└─ resolve-noop (unchanged)
```

The compiled `TurnSummary` is written to `GameState.turn_summaries[]` (trimmed to last 3 turns), survives save/load, and is read by the GUI AAR panel.

---

## Schema

### `src/state/turn_summary.ts` (new file)

```typescript
import type { FactionId, FormationId } from './game_state.js';
import type { CombatOutcome } from './brigade_history.js';
import type { NarrativeArc } from '../sim/war_stories.js';
import type { BrigadeDecoration } from './decoration_types.js';

/** A single battle that occurred this turn. Deduplicated per OSID. */
export interface TurnBattle {
    osid: string;
    mun_id?: string;
    attacker_faction: FactionId;
    defender_faction: FactionId;
    /** Pioneer brigade (first to attack this OSID this turn). */
    primary_attacker_id: FormationId;
    primary_defender_id: FormationId | null;
    /** All participating attacker IDs (concentrated assault). */
    all_attacker_ids: FormationId[];
    outcome: CombatOutcome;       // from attacker's perspective
    attacker_casualties: number;
    defender_casualties: number;
    territory_flipped: boolean;
    was_concentrated: boolean;
}

/** A territory control change deemed notable. */
export interface NotableFlip {
    osid: string;
    mun_id?: string;
    from: FactionId | null;
    to: FactionId | null;
    /** Why flagged: municipality seat, enclave breach/relief, or corridor node. */
    significance: 'municipality_seat' | 'enclave_breach' | 'enclave_relief' | 'corridor' | 'generic';
}

/** A brigade decoration newly awarded this turn. */
export interface DecorationAward {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
    decoration: BrigadeDecoration;
}

/** A formation whose narrative arc changed this turn. */
export interface ArcTransition {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
    from_arc: NarrativeArc;
    to_arc: NarrativeArc;
}

/** A formation that spawned this turn. */
export interface FormationSpawn {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
    kind: string;
}

/** A formation destroyed or disbanded this turn. */
export interface FormationDestruction {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
}

/** A notable non-combat event. */
export interface TurnNotableEvent {
    kind:
        | 'graz_accords_activated'
        | 'truce_broken'
        | 'washington_agreement'
        | 'operation_storm'
        | 'ceasefire_activated'
        | 'siege_formed'
        | 'siege_broken'
        | 'first_battle';
    description: string;
    faction?: FactionId;
    osid?: string;
}

/** Complete after-action report for one simulation turn. */
export interface TurnSummary {
    turn: number;

    // --- Combat ---
    /** All battles that occurred, deduplicated by OSID. Sorted by osid. */
    battles: TurnBattle[];

    // --- Territory ---
    /** Net OSID gain/loss per faction this turn (positive = gained). */
    territory_net: Partial<Record<FactionId, number>>;
    /** Flips deemed notable (municipality seats, enclave changes, corridors). */
    notable_flips: NotableFlip[];

    // --- Displacement ---
    displacement_total: number;
    displacement_by_ethnicity: Partial<Record<FactionId, number>>;
    /** Municipality ID with highest displacement volume this turn. */
    displacement_hotspot?: string;

    // --- Unit events ---
    decoration_awards: DecorationAward[];
    arc_transitions: ArcTransition[];
    formation_spawns: FormationSpawn[];
    formation_destructions: FormationDestruction[];

    // --- Faction pulse ---
    /** Change in general_supply_reserve per faction this turn (positive = gained). */
    supply_deltas: Partial<Record<FactionId, number>>;
    heavy_munitions_deltas: Partial<Record<FactionId, number>>;

    // --- Notable events ---
    notable_events: TurnNotableEvent[];
}
```

### AARSnapshot (transient — stored in TurnContext, never serialized)

```typescript
// Internal to compile_turn_summary.ts — not exported to game_state.ts

interface AARSnapshot {
    turn: number;
    supply: Partial<Record<FactionId, number>>;
    heavy_munitions: Partial<Record<FactionId, number>>;
    /** war_story.arc per formation, before generate-war-stories runs. */
    arcs: Record<FormationId, NarrativeArc>;
    /** decoration IDs per formation, before evaluate-brigade-decorations runs. */
    decoration_ids: Record<FormationId, string[]>;
    /** Formation IDs that already had lifecycle_status 'destroyed'/'disbanded' before this turn. */
    already_destroyed: Set<FormationId>;
    /** All formation IDs present at turn start. */
    formation_ids: Set<FormationId>;
}
```

---

## TurnContext Extension

Following the existing `getOperationalData`/`setOperationalData` pattern in `turn_pipeline_types.ts`:

```typescript
/** AAR snapshot captured at turn start. Transient — not on GameState. */
export function getAARSnapshot(context: TurnContext): AARSnapshot | undefined {
    return (context as TurnContext & { aarSnapshot?: AARSnapshot }).aarSnapshot;
}
export function setAARSnapshot(context: TurnContext, snapshot: AARSnapshot): void {
    (context as TurnContext & { aarSnapshot?: AARSnapshot }).aarSnapshot = snapshot;
}
```

---

## GameState Addition

In `game_state.ts`, on the `GameState` interface:

```typescript
/**
 * Per-turn after-action reports. Compiled at end of each war turn.
 * Kept for last 3 turns. Sorted by turn descending (index 0 = most recent).
 * Read-only to simulation after compilation; used by GUI only.
 */
turn_summaries?: TurnSummary[];
```

---

## Pipeline Steps

### Step: `capture-aar-snapshot` (insert at position 2, immediately after `initialize`)

```typescript
{
    name: 'capture-aar-snapshot',
    run: (context) => {
        if (context.state.meta.phase !== 'war') return;
        const { setAARSnapshot } = await import('../turn_pipeline_types.js');
        const { captureAARSnapshot } = await import('./compile_turn_summary.js');
        setAARSnapshot(context, captureAARSnapshot(context.state));
    }
}
```

### Step: `compile-turn-summary` (insert as second-to-last, before `resolve-noop`)

```typescript
{
    name: 'compile-turn-summary',
    run: (context) => {
        if (context.state.meta.phase !== 'war') return;
        const { getAARSnapshot } = await import('../turn_pipeline_types.js');
        const { compileTurnSummary } = await import('./compile_turn_summary.js');
        const snapshot = getAARSnapshot(context);
        if (!snapshot) return;
        const summary = compileTurnSummary(context.state, snapshot, context.report);
        // Keep last 3 summaries, most recent first
        const existing = context.state.turn_summaries ?? [];
        context.state.turn_summaries = [summary, ...existing].slice(0, 3);
    }
}
```

---

## `compile_turn_summary.ts` — Compilation Logic

Located at `src/sim/compile_turn_summary.ts`.

### `captureAARSnapshot(state)` — called at turn start

1. Iterate `state.formations` (sorted keys for determinism)
2. For each formation: capture `war_story?.arc` → `arcs[fid]`
3. For each formation: capture `decorations?.map(d => d.id)` → `decoration_ids[fid]`
4. Capture `state.general_supply_reserve` and `state.heavy_munitions_reserve` (cloned)
5. Build `formation_ids` Set from all formation keys
6. Build `already_destroyed` Set from formations with `lifecycle_status === 'destroyed' || 'disbanded'`
7. Return `AARSnapshot`

### `compileTurnSummary(state, snapshot, report)` — called at turn end

**Section 1: Battles** — from `report.attack_resolution_osid?.battles`

Group raw battle records by `target_osid`. Per group:
- `primary_attacker_id` = first entry's `attacker_brigade`
- `all_attacker_ids` = all `attacker_brigade` IDs in the group (distinct)
- `outcome` = first entry's outcome (pioneer establishes the result)
- `territory_flipped` = check `state.control_events` for a flip on this OSID this turn
- `attacker_casualties` / `defender_casualties` = sum from `brigade_history.engagements` for matching (turn, osid)
- `was_concentrated` = group.length > 1
- `mun_id` = from `control_events` entry if present

Sort by osid for determinism.

**Section 2: Territory** — from `state.control_events` filtered to `turn === currentTurn`

- `territory_net`: per faction, count `to === faction` (gained) minus `from === faction` (lost)
- `notable_flips`: mark as notable if osid is a municipality seat (check operational data if available); also check if a flip changes enclave integrity

**Section 3: Displacement** — from `state.displacement_event_log` filtered to `turn === currentTurn`

- `displacement_total` = sum of `displaced` field
- `displacement_by_ethnicity` = sum by `ethnicity`
- `displacement_hotspot` = municipality with highest displacement volume

**Section 4: Decoration awards** — diff snapshot vs current state

For each formation in `state.formations` (sorted keys):
- Get current `decorations ?? []`
- Compare to `snapshot.decoration_ids[fid] ?? []`
- Any decoration ID not in snapshot → `DecorationAward` entry

**Section 5: Arc transitions** — diff snapshot vs current state

For each formation with `war_story`:
- Compare `state.formations[fid].war_story.arc` vs `snapshot.arcs[fid]`
- If changed → `ArcTransition` entry
- Skip if `from_arc === to_arc` or either is undefined

**Section 6: Formation spawns** — detect new formations

Formations in `state.formations` that were NOT in `snapshot.formation_ids` → `FormationSpawn`
Or: formations where `available_from === currentTurn` (deterministic, no snapshot needed for this case)

**Section 7: Formation destructions** — detect newly destroyed

Formations in `state.formations` where:
- `lifecycle_status === 'destroyed' || 'disbanded'`
- AND `fid` was in `snapshot.formation_ids`
- AND `fid` was NOT in `snapshot.already_destroyed`

**Section 8: Supply deltas** — diff snapshot vs current

`current.general_supply_reserve[f] - snapshot.supply[f]` per faction. Only include if diff ≠ 0.
Same for `heavy_munitions_reserve`.

**Section 9: Notable events** — from state fields

- Graz Accords: `state.vienna_declaration_turn === currentTurn` → `graz_accords_activated`
- Truce breaks: `state.truce_breaks` where turn === currentTurn
- Washington Agreement: `state.washington_agreement_turn === currentTurn`
- Operation Storm: `state.operation_storm_turn === currentTurn`

---

## GUI Integration

### `GameStateAdapter.ts` — add to derived view

```typescript
latestTurnSummary: loadedState.turn_summaries?.[0] ?? null,
```

### `types.ts` — add field

```typescript
latestTurnSummary: TurnSummary | null;
```

### `AARPanel.tsx` (new component)

Triggered by "AAR" button in the turn control bar (not auto-shown — player pulls it).

Structure:
```
[Turn N — Week of {date}]

COMBAT  (N battles)
  ▸ [OSID name] — [AttFaction] attacks [DefFaction]
    [attacker brigade(s)] → [outcome badge] → [territory flip?]
    Att: Xk cas  Def: Yk cas

TERRITORY  (+N / -N)
  ▸ [Notable flips with significance badge]
  ▸ Net: RS +3  RBiH -2  HRHB -1

UNIT EVENTS
  ▸ [Brigade name] earned [decoration] (faction color)
  ▸ [Brigade name] arc: garrison → bloodied (color-coded)
  ▸ [Brigade name] disbanded / destroyed

FACTION PULSE
  RS: supply -8  munitions -5 | 2 brigades formed
  RBiH: supply +4  munitions -3
  HRHB: supply -12  munitions -8 | ⚠ low supply

DISPLACEMENT  (N,NNN total)
  Hotspot: [municipality name]  Serb: N  Bosniak: N  Croat: N

NOTABLE EVENTS
  ▸ Graz Accords activated (RS-HRHB non-aggression)
  ▸ RS broke Graz Accords truce
```

Sections collapse/expand. Empty sections hidden. Panel is dismissible, not blocking.

---

## Serialization

`turn_summaries` — persisted in GameState serialization (trimmed to 3).
`aarSnapshot` — transient, stored on TurnContext only, never written to state.

Check `serializeGameState.ts` to verify no exclusion list blocks `turn_summaries`.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/state/turn_summary.ts` | TurnSummary type definitions |
| `src/sim/compile_turn_summary.ts` | `captureAARSnapshot` + `compileTurnSummary` |
| `src/ui/map/components/AARPanel.tsx` | GUI panel |

## Files to Modify

| File | Change |
|------|--------|
| `src/state/game_state.ts` | Add `turn_summaries?: TurnSummary[]` to GameState |
| `src/sim/turn_pipeline_types.ts` | Add `getAARSnapshot`/`setAARSnapshot` + `AARSnapshot` interface |
| `src/sim/turn_phases/war_phases.ts` | Add `capture-aar-snapshot` + `compile-turn-summary` steps |
| `src/ui/map/data/GameStateAdapter.ts` | Expose `latestTurnSummary` |
| `src/ui/map/data/types.ts` | Add `latestTurnSummary` to view type |

---

## Non-Goals

- No event bus / pub-sub on GameState. Snapshot diff is sufficient and simpler.
- No per-battle commander attribution (can be added later once notable battles are identified).
- No historical trend — AAR is per-turn only. Career stats remain in CombatSummaryPanel.
- No automatic post-turn modal — player initiates AAR view.

---

## Open Questions

1. **Notable flip detection**: Do we have operational data available in the compile step to determine if an OSID is a municipality seat? The `load-operational-data` step runs before `compile-turn-summary`, so `getOperationalData(context)` should be available.

2. **Truce break field name**: `state.truce_breaks` — confirm exact field name in `game_state.ts` before implementing.

3. **Supply fields**: Confirm `heavy_munitions_reserve` field name (may be `heavy_munitions_reserves`).

---

## Estimated Implementation

| Work | Scope |
|------|-------|
| Schema + types | ~1h |
| `compile_turn_summary.ts` | ~2h |
| Pipeline wiring | ~30m |
| GUI panel (basic) | ~2h |
| GUI panel (styled) | ~1h |
| Tests | ~1h |
| **Total** | ~7-8h |
