# Night Shift Handoff — 2026-03-30

## Mission

Build intelligent corps commanders that think like real military officers. This is not a code reorganization — it's building the BRAIN of the game. Every corps CO should assess his situation, protect his people, plan ahead, react to threats, and make decisions a real Bosnian War commander would recognize.

When this works:
- ARBiH 1st Corps CO looks at Sarajevo and says "I'm besieged, every brigade stays, we hold or we die"
- VRS 1KK CO plans the Jajce offensive weeks in advance, concentrates 6 brigades at staging, and EXECUTES
- SRK CO sees his 80-edge perimeter with 9 brigades and says "I can't spare anyone, hold the ring"
- VRS Drina Corps CO evaluates his elite brigades and assigns the mechanized unit to spearhead the sweep
- A corps CO with 2 brigades facing 5 enemy brigades says "I need reinforcement" and the army CO responds

## Design Doc

`docs/plans/2026-03-30-v080-corps-commander-intelligence-architecture.md` — READ EVERY WORD. This was synthesized from 5 expert consultations (Game Designer, War-or-Game, Operations Expert, Modern Wargame Expert, Technical Architect).

## Mandatory Reading

1. Design doc (above)
2. `.claude/napkin.md` — full runbook, current state
3. `docs/PROJECT_LEDGER.md` (last 100 lines)
4. `docs/life_lessons.md` (index + calibration.md + architecture.md + process.md)
5. `src/sim/spatial_context.ts` — your spatial data foundation
6. `src/sim/combat/bot_corps_directives.ts` — the 1990-line mess you're replacing (understand what it tries to do, not how)
7. `src/sim/combat/bot_corps_ai.ts` — entry point
8. `src/sim/combat/bot_strategy.ts` — army-level priorities and doctrine phases
9. `src/sim/combat/sector_offensive.ts` — operation lifecycle
10. `src/sim/combat/enclave_resilience.ts` — enclave definitions
11. `src/sim/combat/front_geometry_analysis.ts` — salient/chokepoint detection
12. `src/sim/combat/osid_graph_analysis.ts` — graph analysis utilities
13. `src/state/game_state.ts` — CorpsCommandState, FormationState
14. `.claude/skills/corps-army-commander/SKILL.md` — think like this

## What Makes a Commander Intelligent

### 1. He Sees Zones, Not Blobs

SpatialContext gives componentsByFaction. The commander partitions his territory into zones — each connected component is a zone. But zones aren't just topology:
- **Corridor-width detection**: a zone connected by a 1-OSID chokepoint is effectively besieged even if technically connected. BFS outward, count exits of width >= 2.
- **Commitment ratio**: front_edges / brigades. SRK has 80 edges and 9 brigades = ratio 8.9 = fully committed, zero surplus. This is NOT hardcoded — it emerges from the math.
- **Strategic value**: zones containing chokepoints, enclave capitals, or large co-ethnic populations are worth more garrison. Use existing getCoEthnicShare + osid_graph_analysis.

### 2. He Knows His Forces

Not all brigades are equal:
- `resolveEquipmentClass` + `getEquipmentOffensivePriority` from sector_offensive.ts tell you which brigades have tanks/artillery vs rifles only
- Fitness scores: offense (equipment × personnel × supply × cohesion), defense (personnel × entrenchment × cohesion), garrison (even depleted units can hold a position)
- The CO assigns elite/mechanized to schwerpunkt, depleted rifle-only to garrison. This is Grigsby's tiered assignment pattern.

### 3. He Defends First, Then Attacks

Grigsby's two-pass allocation:
- Pass 1: compute garrison budget per zone. Posture-dependent (besieged=8, defending=12, balanced=15, projecting=20 edges per brigade). Assign brigades to garrison. These are LOCKED — ops cannot touch them.
- Pass 2: whatever remains is the surplus pool. Only surplus feeds operations.
- If surplus = 0, the corps is in pure defense. No ops. No redistribution. Hold.

### 4. He Plans Ahead

The current system is reactive — each turn it recomputes everything from scratch. A real commander has a PLAN:
- "I want Jajce in 4 weeks. I need 5 brigades concentrated at Donji Vakuf."
- Each turn: advance concentration (march 1-2 brigades toward staging), check viability (do I still have the forces? has the enemy reinforced?), launch when ready.
- Plans can be suspended (threat on flank) or abandoned (lost too many brigades).
- This is why 1KK early ops used 7-8 brigades (planned concentration) and late ops used 2-3 (hasty launches with whatever was available).

### 5. He Reacts to Intel

The OPSEC/intel system already produces offensive_signs and concentration detection. The CO should READ this:
- Enemy massing on sector 3? Shift reserves from quiet sector 1 BEFORE the attack.
- Lost 3 brigades in a failed op? Downgrade to defensive, request army reinforcement.
- Quiet sector for 10 turns? Thin garrison to minimum, free up surplus.
- The sector_activity_log tracks this over time — the CO doesn't just see this turn, he sees trends.

### 6. He Protects His People

An OSID where 50,000 Bosniaks live is not the same as an empty hillside. The CO:
- Refuses to abandon high-population co-ethnic OSIDs even when "militarily logical"
- Raises garrison budget for zones with large populations
- Prioritizes counteroffensives to retake lost population centers
- Uses getCoEthnicShare from ethnic_defense.ts

### 7. He Has Personality

Per Decisive Campaigns: Barbarossa — deterministic personality parameters per officer:
- **aggression**: willingness to attack at marginal ratios (0.7 = attacks at 1.3:1)
- **caution**: reserve holdback fraction (0.4 = holds 40% surplus)
- **initiative**: exploits unexpected opportunities (undefended OSIDs, enemy withdrawal)
- These come from the existing named officer data. Wire them to officer traits.

### 8. He Communicates Up

Army HQ needs to know:
- Which corps zones are besieged (for relief operations)
- Which corps have surplus (for strategic reserve allocation)
- Which corps need reinforcement
- The army CO (already exists in ai_commander/) makes inter-corps decisions based on this

## Implementation Approach

### New Directory: `src/sim/combat/commander/`

Build the commander as a NEW system alongside the old one. Don't gut `generateCorpsDirectives` yet — build the replacement, verify it works, THEN switch over.

### Core Files to Create

| File | What It Does |
|------|-------------|
| `commander_state.ts` | All types: CommanderState, ZoneAssessment, ForceAssessment, CommanderPlan, BrigadeEval, etc. |
| `briefing.ts` | `buildBriefing()` — assemble all inputs into one struct |
| `assess.ts` | Zone classification, corridor detection, commitment ratio, threat eval, force eval |
| `allocate.ts` | Two-pass: garrison budget → lock garrison → compute surplus |
| `plan.ts` | Multi-turn CommanderPlan lifecycle |
| `decide.ts` | Intel consumption, reactive stance adjustment, reserve shifting |
| `emit.ts` | Produce CorpsDirective, CorpsOperation[], SectorStance[] |
| `commander_loop.ts` | Wire assess→allocate→plan→decide→emit. The ICorpsCommander interface. |
| `force_eval.ts` | Brigade fitness scoring, tiered assignment |
| `zone_detection.ts` | Corridor-width BFS, commitment ratio, besieged classification |

### Integration

The commander loop produces the SAME output types as today (CorpsDirective, CorpsOperation[]). Downstream systems (sector_offensive lifecycle, combat resolution, brigade AI) don't change. The commander is a drop-in replacement for `generateCorpsDirectives`.

Wire it in `bot_corps_ai.ts`:
```
// Old: generateCorpsDirectives(state, faction, ...)
// New: for each corps { runCommanderLoop(buildBriefing(state, corps), commanderState) }
```

### Testing Strategy

- Unit tests for zone detection (known topologies → expected zones, besieged classification)
- Unit tests for force evaluation (known brigades → expected fitness scores and tiers)
- Unit tests for garrison allocation (known zones + brigades → expected garrison assignments)
- Integration test: 1st Corps with Sarajevo topology → inner zone besieged, brigades locked
- Integration test: 1KK with surplus → plan created, brigades concentrating
- Integration test: SRK with 80 edges, 9 brigades → commitment ratio blocks surplus
- 40w calibration run after full wiring

### Calibration Checkpoints

Run `npm run sim:scenario:run:40w` + `node tools/compare_painted_vs_sim.cjs <dir>` after:
- Garrison allocation working (step 4-equivalent)
- Full commander loop wired (step 8-equivalent)
- Old code removed (step 10-equivalent)

Current baseline: 90.2% area-weighted, 21/22 anchors (Sarajevo Centar FAILED).
Target: Sarajevo Centar PASSES, zero-attack ops < 10%.

## Pre-Resolved Decisions

**Corridor-width threshold (expert research):** Sarajevo bottleneck is 1 OSID wide (op:ilidza:sarajevo_dio_ilidza_2). Threshold: width ≤ 1 = besieged, width = 2 = pressured, width ≥ 3 = open. Sarajevo is correctly besieged from turn 0.

**Pre-planned ops:** Corps commander ADOPTS pre-planned ops as his plan and owns execution. He can modify, defer, or abandon them based on situation assessment. Pre-planned ops are starting suggestions, not sacred orders.

**Build and replace, not shadow mode.** Wire the commander in and replace generateCorpsDirectives for the calibration run. No shadow mode — we need to see results.

**Officer personality:** Use existing 4 attributes (competence, aggressiveness, defensive_skill, political_reliability) on 80+ named officers. Derive initiative and caution from combinations — no new officer JSON fields needed. The AI commander personality system already labels officers from these stats.

## Critical Rules

- **Determinism**: strictCompare everywhere. No Math.random(), no timestamps, no Date.now().
- **One commit per meaningful chunk**: tsc + vitest after each.
- **The enriched contact graph (shared_segments) is correct** — do NOT revert.
- **SpatialContext is your foundation** — componentsByFaction, friendlyOsidsByFaction, spatialFriendlyDistance.
- **The ICorpsCommander interface must be clean** enough for an LLM to implement later.
- **Do NOT hardcode corps names, municipality names, or OSIDs** anywhere in the commander.
- **Build alongside, then switch** — don't gut existing code until replacement is verified.
- **Read .claude/skills/corps-army-commander/SKILL.md** — the red flags list applies to every decision.

## DO NOT Touch

- `src/sim/combat/attack_resolution_osid.ts` (combat resolution)
- `src/sim/combat/enclave_resilience.ts` (definitions only — consumed, not modified)
- `src/ui/` (no UI changes)
- `data/derived/` (no data pipeline changes)
- `data/scenarios/` (no scenario changes)

## What Success Looks Like

A morning report that says:
- "Sarajevo 1st Corps inner zone classified as besieged. 13 brigades locked. City held through w40."
- "1KK planned Jajce offensive at turn 12, concentrated 5 brigades by turn 16, launched at turn 17, captured jajce_3 at turn 19."
- "SRK commitment ratio 8.9 — zero surplus, pure screening posture. No brigades pulled for other ops."
- "Zero-attack operations: 3/27 (11%) down from 12/27 (44%)."
- "Calibration: XX.X% area-weighted, Sarajevo Centar anchor PASSES."

