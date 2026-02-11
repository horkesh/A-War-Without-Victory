# Systems (AWWV Knowledge Base)

Collated excerpts on game systems, mechanics, pressure, supply, exhaustion, negotiation, formations, fronts.

## Source conversations (raw)

- `../raw/2026-01-22_Bosnia_War_Simulation_Design.md` — Layer 2–5 summary: map substrate, strategic dynamics, forces & politics, end-state.
- `../raw/2026-01-31_Project_Handover_AWWV.md` — Canonical facts, architecture status, population displacement constraint.
- `../raw/2026-01-20_Wargame_Brigade_Movement_Ideas.md` — Operational Front Segments, settlements as state variables, brigades assigned to sectors.

## Key excerpts

**Layered mental model (handover):**

- **Layer 2 – Map substrate:** Settlement polygons, stable settlement IDs, undirected adjacency graph, orphan handling, derived front edges, derived front regions.
- **Layer 3 – Strategic dynamics:** Persistent front segments, posture system (per-edge + per-region), pressure generation (posture-driven, supply-modulated), supply reachability, exhaustion (irreversible), breaches (derived), control-flip proposals (deterministic, proposal-only), scenario runner.
- **Layer 4 – Forces & politics:** Political factions RBiH, RS, HRHB; armies as labels (ARBiH, VRS, HVO); formation roster; municipality-based militia pools; formation generation (CLI-only, deterministic); command capacity & friction; negotiation pressure (monotonic); negotiation capital + spend ledger; treaty system (offer generation, acceptance scoring, structural constraints, military/territorial annexes); corridor rights deprecated; territorial valuation (liabilities cheaper); Negotiation Map Dev UI.
- **Layer 5 – End-state:** Peace ends the war; no post-peace fronts; deterministic end-state snapshot.

**Core principle (brigade movement):**  
"Settlements are *state variables*, not *decision targets*."  
"Brigades are assigned to *operational sectors*, not places."  
"Frontlines are an *emergent boundary condition* created by pressure across settlement graphs."

**Population displacement (locked):**  
"Population displacement WILL be modeled at settlement level and municipality level. Geometry must remain immutable across turns. Population attributes must be separable, turn-indexed overlays."

## Tags

`system` `design` `phase` `map`
