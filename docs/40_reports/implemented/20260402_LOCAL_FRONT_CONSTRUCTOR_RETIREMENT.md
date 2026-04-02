# 2026-04-02 - Local Front Constructor Retirement

## Purpose

This checkpoint removes one more half-alive legacy surface from the engine core.

The runtime had already stopped rebuilding `local_fronts`, but `local_front_defense.ts`
still exported a full `buildLocalFronts(...)` constructor and `game_state.ts` still
described `local_fronts` as if it were derived every turn. That was exactly the kind
of stale-but-plausible code path that teaches future implementers the wrong architecture.

## What changed

- removed `buildLocalFronts(...)` from `src/sim/combat/local_front_defense.ts`
- rewrote `local_front_defense.ts` as what it truly is now:
  - a shared frontline-density formula module
  - plus a compatibility fallback for legacy `brigade_front_assignment`
- updated `src/state/game_state.ts` comments so `LocalFront` and `local_fronts`
  are explicitly documented as legacy compatibility state rather than live runtime truth
- added a regression in `tests/engine_honesty_legacy_contracts.test.ts` proving:
  - there is no exported `buildLocalFronts(...)`
  - `local_fronts` is documented as a legacy cache, not an active pipeline product

## Why this matters

This is not mainly about saving lines of code.

It matters because the worst legacy bugs in AWWV are usually not old code that is obviously dead.
They are code paths that still look authoritative enough to mislead a future agent or human.

Before this pass:

- sectors were the actual frontline truth
- the war pipeline already cleared `local_fronts`
- but the code still advertised a plausible local-front constructor as if a runtime layer might come back at any moment

That is exactly how split-truth architecture survives.

## Canonical truth after this pass

- live frontline truth: `corps_front_sectors`
- legacy fallback only: `brigade_front_assignment`
- no live `local_fronts` runtime layer

## Verification

- `node_modules\.bin\vitest.cmd run tests\engine_honesty_legacy_contracts.test.ts tests\local_front_density_modifier_precedence.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on

This does not remove every front-assignment compatibility field from the engine.

It does remove one of the most misleading leftovers: a constructor that looked like it still
owned a runtime layer the pipeline had already abandoned.
