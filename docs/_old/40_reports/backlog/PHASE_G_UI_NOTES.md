# Phase G UI Notes (Prototype)

This note describes what the Phase G UI prototype exposes and what it deliberately avoids to prevent false precision.

## Player-visible signals
- Political control is shown by settlement coloring and control counts.
- Turn and phase are displayed as labels only (no dates).
- Exhaustion and negotiation pressure are shown as approximate summaries.
- IVP is shown as a coarse set of indicators (Sarajevo, enclaves, momentum).

## Explicit uncertainty and delay
- Supply, pressure, and visibility are derived and can lag behind real-world dynamics.
- No numeric field is presented as exact ground truth for contested zones.
- Any future intel or command friction data must be labeled as delayed or partial.

## What the prototype does not imply
- No UI element implies guaranteed control permanence.
- No UI element implies perfect knowledge of opposing factions.
- No UI element implies exact timing of control flips or negotiation outcomes.

## Read-only guarantee
- The UI reads a saved GameState and does not write or mutate simulation state.
- Any edits or interventions must remain out of scope for Phase G.
