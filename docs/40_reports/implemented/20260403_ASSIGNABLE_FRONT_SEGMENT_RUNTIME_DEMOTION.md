# 2026-04-03 - Assignable Front Segment Runtime Demotion

## Summary

Stopped the live turn pipeline from rebuilding `assignable_front_segments`.

The field still exists as compatibility baggage for old saves/tests, but it no longer has a ceremonial runtime writer pretending it is part of the modern frontline system.

## What changed

- removed `deriveAssignableFrontSegments(...)` from the live war-phase pipeline
- removed `deriveAssignableFrontSegments(...)` from the end-of-turn refresh path
- tightened the honesty regression so it now proves canonical runtime files no longer rebuild or assign `assignable_front_segments`
- updated the schema comment so the field is described honestly as compatibility-only residue

## Why

This is classic swamp code:

- no live shell or AI path still needed `assignable_front_segments`
- but the runtime kept rebuilding it every turn
- and that made the field look current and authoritative

In practice, that kind of ritual writer is how dead systems come back to life. Future work sees the pipeline step, assumes the field still matters, and attaches new logic to the wrong layer.

## Files changed

- `src/sim/turn_phases/war_phases.ts`
- `src/sim/turn_pipeline.ts`
- `src/state/game_state.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\engine_honesty_legacy_contracts.test.ts`

## Follow-on

- decide later whether `assignable_front_segments` should remain as a compatibility serialization field or be retired entirely
- do not reintroduce a live writer unless a canonical owner is explicitly restored
