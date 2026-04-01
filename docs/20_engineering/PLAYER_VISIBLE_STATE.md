# Player Visible State

This file defines what the player is allowed to know, what the renderer is allowed to receive, and what must stay outside normal player-facing surfaces.

## Purpose

Fog-of-war is not enough.

If the renderer receives near-full simulation truth and the UI merely hides parts of it visually, the product is still architecturally omniscient.

The rule is:

**the player client should receive a player-facing state, not a prettified full state**

## Core classes

Every data family used by Warroom, tactical map, Army HQ, or Codex must be classified as one of:

- `player-safe`
- `staff abstraction`
- `debug-only`

### `player-safe`

The player may see this directly in normal play.

Examples:
- own formations
- own sectors
- own operations
- own officer chain
- visible settlements and fronts
- historically unlocked Codex content
- explicitly visible enemy information derived from actual player knowledge rules

### `staff abstraction`

The player may receive this only as an abstraction, summary, estimate, or narrative interpretation.

Examples:
- threat level
- enemy concentration suspicion
- likely operation direction
- staff recommendation
- confidence-weighted intelligence

The raw underlying simulation truth must not be sent just because a summary is needed.

### `debug-only`

This is not normal player information.

Examples:
- raw enemy operations
- raw enemy corps internal state
- raw `GameState` families that expose hidden truth
- raw IDs like `arbih_3rd_corps`, `axis_1`, raw `sector_id`, or backend-only assignment fields
- invariant diagnostics, engine traces, and internal planner state unless intentionally exposed as a designed player-facing explanation

## Renderer boundary rule

The desktop / tactical-map renderer may only receive:

- player-safe state directly
- staff-abstraction state that has already been shaped for the player
- debug-only state only in explicit debug mode

It must not receive full hidden enemy or engine truth by default and expect the UI to behave.

## Surface rule

Every player-facing surface must declare which class it is rendering:

- player-safe
- staff abstraction
- debug-only

If a surface is not explicitly marked, treat it as unsafe until reviewed.

## Current high-risk families

These are known danger zones and must be treated carefully:

- formations
- operations
- corps front sectors
- officer state
- threat / intelligence summaries
- settlement-level military detail
- diplomacy/event internals

## Display rule

Player-facing UI must render display names, not raw engine identifiers.

Raw IDs are allowed only in explicit debug views.

## Done means

This contract is being followed when:

1. the renderer no longer receives near-full omniscient state by default
2. player-facing surfaces are classified and reviewed
3. raw ids no longer appear in normal play
4. debug-only surfaces are explicit and gated
5. regression tests fail if forbidden truth leaks back into the client
