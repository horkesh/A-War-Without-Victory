# Working On — Session 2026-03-30 (Night Shift)

## v0.8 Corps Commander Intelligence

Implementing the most important architectural change in the project — replacing 15 separate brigade movement systems and a 1400-line generateCorpsDirectives with ONE intelligent commander decision loop.

Design doc: docs/plans/2026-03-30-corps-commander-intelligence.md

### Why This Is Urgent

Concurrent ops (n1211) exposed a critical flaw: Sarajevo's garrison marched to Breza because the sector system treated the whole 1st Corps territory as one zone. 13 brigades column-marched out through the Ilidza corridor before Op Prsten closed it. By turn 11 the city was empty and fell to paramilitary sweep. This never happened in 1200+ prior runs — concurrent ops caused more aggressive redistribution that stripped the garrison.

### Root Cause (from day session investigation)

1. Column march teleportation: paths computed pre-combat, not revalidated at arrival
2. No zone awareness: sector system sees one big blob, not besieged/open zones
3. No garrison lock: no system prevents stripping a critical position
4. 15 separate brigade movement systems fighting each other
5. Information silently dropped between 114 pipeline steps

### Architecture: PERCEIVE → DECIDE → EXECUTE

- PERCEIVE: world state derivation (SpatialContext, supply, sectors)
- DECIDE: ONE commander loop per corps (assess→allocate→plan→decide→emit)
- EXECUTE: combat resolution, effects (unchanged)

### 10 Implementation Steps

1. Type definitions (commander_state.ts)
2. buildBriefing() (briefing.ts)
3. ASSESS phase (assess.ts) — zones, threats, force eval
4. ALLOCATE phase (allocate.ts) — garrison lock, surplus — FIXES SARAJEVO
5. PLAN phase (plan.ts) — multi-turn intentions
6. DECIDE phase (decide.ts) — intel reactive
7. EMIT phase (emit.ts) — produce existing interface
8. Wire commander loop (commander_loop.ts)
9. CommanderState on game_state.ts + save migration
10. Delete old code (phased)

### Baseline

- n1211 with enriched contact graph: 90.2% area-weighted
- 21/22 anchors (Sarajevo Centar FAILED — this is what we're fixing)
- 44% zero-attack operations
- 95 battles, 107 orders

### Key Decisions Already Made

- Corridor-width for besieged detection (not encirclement ratio)
- Commitment ratio for SRK-type corps
- Garrison budget posture-dependent (8/12/15/20 edges per brigade)
- Equipment class matters for force evaluation
- Population protection via co-ethnic garrison boost
- Commander personality as deterministic parameters
- Same output interface (CorpsDirective) — downstream unchanged

### Contact Graph

The enriched contact graph (shared_segments) is committed and correct. 48 point-only contacts filtered. This is the true baseline.
