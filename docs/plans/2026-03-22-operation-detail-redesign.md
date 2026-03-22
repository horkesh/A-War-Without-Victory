# Operation Detail Panel Redesign — Commander's Situation Report

**Date:** 2026-03-22
**Status:** CONCEPT — brainstormed from live gameplay feedback
**Priority:** HIGH — operations are the core gameplay loop and are presented poorly
**Related:** OpsPlanningModal (pre-launch, has G2 narrative), Army HQ OperationsSection (has halt button)

---

## Problem

The OperationDetail panel (right-side slide-out) shows raw data: commander stats, brigade count, momentum, objectives, axes. No narrative, no assessment, no player actions. The player reads a database record, not a military briefing.

Meanwhile, the OpsPlanningModal (pre-launch) has a beautiful G2 narrative with classified stamps, commander sections, and typewriter font. That quality drops to zero once the operation launches.

The player (as political leader) should receive a **commander's situation report** — not raw data — and should be able to **act** on it (halt, reinforce, modify).

---

## Design

### Player Actions (always visible)

| Action | When Available | IPC |
|--------|--------------|-----|
| **Halt Operation** | During execution, planning, or staging | `stageOperationHalt` (exists) |
| **Force Launch** | During assessment/ready phase | `stageOperationForceLaunch` (exists) |

Both IPC handlers already exist and are wired in Army HQ OperationsSection. Just need buttons in OperationDetail.

### Commander's Situation Report (SITREP)

A pure function `generateOperationSITREP(operation, gameState)` that produces a structured report. No API calls — computed from game state. Presented in the same typewriter/classified document style as the G2 NarrativeTab.

**Report sections:**

1. **Status Summary** — one line: "Operation Vihor is in RECOVERY after failing to capture primary objectives."

2. **Timeline** — key events since launch:
   - "w32: Operation launched from Ripač staging area"
   - "w33: Main Advance engaged enemy at Bihać — REPULSED (casualties: 104 att / 287 def)"
   - "w35: Momentum stalled. 0/3 checkpoints. Commander requests reassessment."

3. **Force Assessment** — current vs initial strength:
   - "2 brigades committed (was 3 at launch — 1 dissolved)"
   - "Personnel: 1,847 remaining (was 2,400 — 23% attrition)"
   - "Supply readiness: 0% (CRITICAL — resupply impossible from current position)"

4. **Enemy Situation** — what the op has revealed:
   - "Bihać defense stronger than intelligence indicated"
   - "5th Corps committed 4 brigades to sector defense (intel estimated 2)"

5. **Commander's Recommendation** — based on momentum, casualties, supply:
   - Momentum 0/3 + high casualties → "Recommend ABORT. Further attacks will destroy this force."
   - Momentum 2/3 + moderate casualties → "Recommend CONTINUE. One more push should secure the objective."
   - Supply critical → "Recommend HALT. Resupply before any further advance."
   - Completed → "Operation COMPLETE. Objectives secured. Recommend consolidation."

6. **Projected Outcome** (if continuing) — combat predictor estimate for next engagement

### Data Sources (all in engine already)

| Data | Source |
|------|--------|
| Operation state | `OperationView` on LoadedGameState |
| Battles at objectives | `turn_summaries[].battles` filtered by op OSID targets |
| Casualties | Brigade personnel delta since op start turn |
| Supply | `supply_state_by_osid` for staging/objective OSIDs |
| Enemy forces | `sector_intel` for the op's sector |
| Commander personality | `namedOfficerData` → aggressiveness drives recommendation tone |

### Visual Treatment

Same as G2 NarrativeTab in OpsPlanningModal:
- Typewriter font (Courier New)
- OGRANIČENO classified stamp
- Faction army header (republic + army + corps — G-2 Odjel)
- Section numbering
- Amber/gold accent for section headers

### Where It Lives

The existing OperationDetail panel stays UNCHANGED — raw data (commander, objectives, axes, momentum) remains the default view. Two additions:

1. **HALT button** — at the top of the panel, always visible during execution phase. Calls existing `stageOperationHalt` IPC.
2. **REQUEST SITREP button** — opens the commander's situation report as a modal overlay (same z-level as OpsPlanningModal). The SITREP is on-demand — the president asks for the commander's assessment when they want it.

The SITREP modal uses the same visual treatment as the G2 NarrativeTab (typewriter font, classified stamps, faction headers). It is NOT a replacement for the operation panel — it is an additive briefing launched from it.

---

## How It Fits in the Plan

This is **v0.6.0 merge Track B** work — UI improvements to make operations feel presidential. It requires:

1. **No engine changes** — all data is already on LoadedGameState
2. **Pure function** — `generateOperationSITREP()` reads state, returns structured text
3. **Halt/Force-Launch buttons** — IPC already wired, just needs UI buttons in OperationDetail
4. **Commander personality** — aggressive commanders say "press the attack" even when losing; cautious ones recommend abort early. Uses existing aggressiveness/competence scores.

**Estimated scope:** 1 session. The G2 NarrativeTab pattern is already proven — this is applying the same pattern to in-progress operations.

**Sequence:** After the current toolbar + briefing work. Before or alongside the event decision UI.

---

## Connection to the Metagame

Operations are where the president's strategic decisions meet military reality. The SITREP is the commander **talking back to the president** about what his orders have wrought.

When the command autonomy slider ships (v0.7+), the SITREP becomes the primary way delegated commanders report to the president. At high delegation, you don't see the map — you read SITREPs and make go/no-go decisions.

This is also where officer defiance events would surface: "Commander Mladić has ignored your halt order and is continuing the Drina offensive. Your SITREP shows him recommending exactly what you told him not to do."
