# Debug Surface Policy

This file defines what counts as debug-only, how debug surfaces should behave, and what must never leak into normal play.

## Purpose

The project currently mixes player truth and developer truth too often.

That is acceptable for investigation.
It is not acceptable as a shipping product default.

## Debug-only definition

A surface, panel, field, or string is `debug-only` if it exposes information that exists primarily for:

- diagnosing engine behavior
- validating determinism
- inspecting hidden AI state
- reading raw internal identifiers
- seeing hidden enemy truth
- checking pipeline or save integrity

## Normal-play rule

Debug-only information must not appear in normal play unless it has been explicitly redesigned into a player-facing explanation or staff abstraction.

## Examples of debug-only content

- raw corps IDs
- raw sector IDs
- raw axis IDs
- raw planner state
- full enemy operation objects
- full enemy commander internals
- diagnostic traces and invariant outputs
- backend-only assignment or lifecycle fields

## Acceptable player-facing conversion

Debug truth can become player-safe only if it is intentionally converted into:

- a display name
- a staff summary
- a confidence-weighted estimate
- a designed explanation trace

Raw debug strings are not acceptable substitutes.

## UI marking rule

Any explicit debug surface should be labeled clearly in code and UI behavior as debug-only.

If a surface is not meant for players, do not let it masquerade as a normal tab or panel.

## Build / review rule

Any time a player-facing UI change touches:

- operations
- intelligence
- personnel
- sectors
- formations
- desktop shell wiring

the reviewer must ask:

1. is this player-safe?
2. is this a staff abstraction?
3. is this actually debug-only?

If the answer is "debug-only," it should not silently ship to normal play.

## Done means

This policy is being followed when:

1. debug surfaces are explicit
2. player-facing views no longer leak raw internal strings
3. hidden enemy truth is not exposed by accident
4. tests or review gates catch future regressions
