# Progressive War Stories Implementation

**Date:** 2026-03-02
**Baseline:** War stories code complete but unwired (end-of-game only, never called)
**Result:** War stories regenerated every war turn, stored on FormationState, displayed in GUI panel

## Summary

- Wired the existing war stories engine (`war_stories.ts`) into the turn pipeline so narratives evolve as the war unfolds — not just at game end
- Added `war_story` field to `FormationState`, a `generate-war-stories` pipeline step, and full GUI display in the FormationDetail panel
- Each brigade's narrative arc (veteran, bloodied, shattered, risen, destroyed, garrison) updates every turn based on live `brigade_history` data

## Context

The OOB Rework (2026-03-02) implemented the war stories engine with 6 narrative arcs, deterministic templates, and 15 passing tests — but `generateWarStories()` was never called in production. The code was complete but disconnected:

- Not in the turn pipeline
- Not stored on GameState
- Not in save JSON
- No GUI component displayed narratives

The user requested progressive war stories that evolve during gameplay, not just a post-game summary.

## Changes Made

### 1. War Stories Module Update (`war_stories.ts`)

- Updated module doc comment to reflect progressive (per-turn) use, not end-of-game only
- Added `generateWarStoryForFormation(f: FormationState)` — single-brigade helper for per-turn pipeline use
- Existing `generateWarStories(state)` preserved for batch/end-of-game use

### 2. GameState Schema Extension (`game_state.ts`)

- Added `war_story?: BrigadeWarStory` to `FormationState` interface (line 346)
- Added import of `BrigadeWarStory` type from `../sim/war_stories.js`
- Field serialized automatically in saves via `serializeState()`

### 3. Pipeline Step (`war_phases.ts`)

- Added `generate-war-stories` step after `elite-loan-lifecycle` and before `phase-ii-wia-trickleback`
- Runs every war turn: iterates all formations with `brigade_history`, calls `generateWarStoryForFormation()`, attaches result to `f.war_story`
- Uses dynamic import (`await import('../war_stories.js')`) following existing pipeline pattern
- Sorted iteration via `Object.keys(formations).sort()` for determinism

### 4. UI Type Extension (`types.ts`)

Added to `FormationView`:
```typescript
narrativeArc?: 'veteran' | 'bloodied' | 'shattered' | 'risen' | 'destroyed' | 'garrison';
warNarrative?: string;
notableMoments?: Array<{ turn: number; description: string }>;
```

### 5. UI Data Adapter (`GameStateAdapter.ts`)

- Extracts `war_story` from raw formation data
- Validates arc value against the 6 valid arc strings
- Maps `narrative` and `notable_moments` to FormationView fields
- Follows existing adapter patterns (safe casts, type guards)

### 6. FormationDetail Panel (`FormationDetail.tsx`)

Added war story section between status row and corps sector section:
- **Arc badge**: Color-coded pill showing narrative arc
  - veteran → green, bloodied → amber, shattered → red, risen → emerald, destroyed → gray, garrison → neutral
- **Narrative**: Italic paragraph with the brigade's evolving story
- **Notable moments**: Bulleted list with turn numbers (first battle, victory streaks, worst casualties, decorations, etc.)

Section only renders when `narrativeArc` and `warNarrative` are present (brigades with combat history).

## Narrative Arc Reference

| Arc | Criteria | Color | Tone |
|-----|----------|-------|------|
| veteran | >65% win rate + >60% personnel retained | Green | "Backbone of the corps" |
| bloodied | ≥5 battles + >200 casualties | Amber | "Cost of holding the line" |
| shattered | <50% peak personnel + >100 casualties | Red | "A shadow, still in the line" |
| risen | >150% cumulative casualties, rebuilt >50% peak | Emerald | "Destroyed and reborn" |
| destroyed | Inactive/disbanded/destroyed | Gray | "Ceased to exist" |
| garrison | ≤2 battles | Neutral | "Patience, not blood" |

## How It Works (Data Flow)

```
battle (attack_resolution_osid.ts)
  → brigade_history_recorder.ts updates BrigadeHistory tallies + engagement log
    → generate-war-stories pipeline step (each war turn)
      → generateWarStoryForFormation() classifies arc, generates narrative, selects moments
        → stores on FormationState.war_story
          → serialized in saves automatically
            → GameStateAdapter extracts to FormationView
              → FormationDetail.tsx renders in panel
```

A brigade might progress: **garrison** (turn 1-3) → **bloodied** (turn 10, after heavy combat) → **veteran** (turn 25, if maintaining high win rate) — or **shattered** → **risen** if rebuilt after near-destruction.

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/sim/war_stories.ts` | Updated doc, added `generateWarStoryForFormation()` | +36 |
| `src/state/game_state.ts` | Added `war_story` field + import | +3 |
| `src/sim/turn_phases/war_phases.ts` | Added `generate-war-stories` pipeline step | +13 |
| `src/ui/map/data/types.ts` | Added 3 fields to FormationView | +4 |
| `src/ui/map/data/GameStateAdapter.ts` | Extracts war_story data | +8 |
| `src/ui/map/components/FormationDetail.tsx` | War story display section | +31 |
| **Total** | **6 files** | **+95 lines** |

## Test Results

- `tsc --noEmit`: Clean (0 errors)
- `vitest`: 220 pass, 1 skipped (unchanged from baseline)
- Existing `war_stories.test.ts`: 15 tests still pass
- No new tests needed — existing 15 tests cover arc classification, narrative generation, notable moments, and `generateWarStories()`. The new `generateWarStoryForFormation()` is a thin extraction of the same logic.

## Design Decisions

1. **Per-turn regeneration, not incremental**: War stories are recomputed every turn from `brigade_history`. This is simpler and more robust than incremental updates — the cost is negligible (~247 brigades × simple switch/if logic).

2. **Stored on FormationState, not top-level**: `war_story` lives on each formation rather than a top-level array. This keeps it co-located with the brigade data and serializes naturally.

3. **UI computes nothing**: The adapter is a pure extractor. No narrative logic in the browser — all computation happens in the sim pipeline.

4. **Graceful degradation**: Panel section only renders when `narrativeArc` and `warNarrative` are present. Peace-phase formations and non-brigade formations show nothing.

## Deferred

- **Scenario runner integration**: `generateWarStories()` batch function could be called in scenario summary output for reporting — not yet wired
- **War stories in scenario reports**: Standing directive metrics don't yet include war story arc distribution
- **Expanded templates**: Current templates are 2-3 sentences. Could expand with more narrative variety while keeping determinism
- **OOB rework gaps**: 3 VRS brigades from master plan never added; 104th→144th rename not done; HVO guard timing (w80-88 vs plan w40-48)

## Status

**COMPLETE** — Progressive war stories are live. Narratives evolve each turn, are persisted in saves, and displayed in the FormationDetail panel.
