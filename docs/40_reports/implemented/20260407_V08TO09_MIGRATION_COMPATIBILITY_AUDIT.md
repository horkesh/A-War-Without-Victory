# 2026-04-07 — v0.8-to-v0.9 Migration Compatibility Audit

## Lane

`Migration Compatibility Audit — Nested Defaults and Legacy Save Guarantees`

Bounded package chosen:
- move the remaining nested migration/default logic in `migrateState(...)` onto the real owner blocks (`military`, `political`, `displacement`)
- preserve stray top-level legacy save residue by rescuing it into the canonical nested owner before defaults run
- prove that partial nested saves get deterministic sibling defaults without silently dropping canonical state

## Why This Package

The prior `front_segments` bug proved the risk class: migration code that checks the wrong owner path can silently destroy canonical state.

A focused audit of `src/state/serialize.ts` found the same class still alive in several places:
- `militia_pools`, `front_posture`, and `front_posture_regions` were still being canonicalized from top-level `candidate.*` instead of `candidate.military.*`
- `negotiation_ledger`, `supply_rights`, and `municipalities` were still defaulted/canonicalized from top-level `candidate.*` instead of `candidate.political.*`
- Phase I and Phase F partial-save defaulting still depended on top-level `candidate.*` probes instead of the nested domain owners
- because defaults ran before the late cleanup sweep, some stray top-level legacy fields could be deleted instead of rescued into the nested owner

That made the migration story harder to explain than it should be: the code was still partially relying on an accidental top-level cleanup pass instead of explicit owner-boundary logic.

## Canonical Model After Cleanup

- Canonical owner for military migration/defaulting:
  - `state.military.*`
- Canonical owner for political migration/defaulting:
  - `state.political.*`
- Canonical owner for displacement migration/defaulting:
  - `state.displacement.*`

Rules after cleanup:
- nested owner state is normalized directly at its real owner path
- partial nested saves get deterministic sibling defaults at the same owner boundary
- stray top-level legacy residue is rescued into the correct nested owner before defaulting, then removed
- the late top-level sweep remains as a compatibility backstop, not the primary migration mechanism

## Implementation

### Code

- `src/state/serialize.ts`
  - added `rescueLegacyTopLevelFields(...)` to move stray top-level save residue into the canonical nested owner before any defaulting runs
  - moved these normalization/default passes onto the real owners:
    - `military.militia_pools`
    - `military.front_posture`
    - `military.front_posture_regions`
    - `political.negotiation_ledger`
    - `political.supply_rights`
    - `political.municipalities`
  - fixed Phase I partial-save detection/defaulting so it reads and writes:
    - `political.war_consolidation_until`
    - `military.war_militia_strength`
    - `political.war_control_strain`
    - `military.war_jna`
    - `displacement.war_displacement_initiated`
  - fixed Phase F partial-save detection/defaulting so it reads and writes:
    - `displacement.settlement_displacement`
    - `displacement.settlement_displacement_started_turn`
    - `displacement.municipality_displacement`
  - kept the existing late sweep as defence-in-depth for compatibility residue, but it is no longer carrying the main ownership burden

### Tests

- `tests/migration_nested_ownership.test.ts` (new)
  - proves nested military/political owner fields are canonicalized directly
  - proves partial nested Phase I saves materialize missing sibling defaults on the real owner blocks
  - proves partial nested Phase F saves materialize missing sibling defaults under `displacement`
  - proves stray top-level legacy residue is rescued into nested owners before defaulting instead of being silently lost

## Verification

### Targeted

- `npx.cmd tsx --test tests/migration_nested_ownership.test.ts tests/state.test.ts`
  - pass, 8/8
- `npx.cmd vitest run tests/save_migration.test.ts tests/desktop_persistence_contract.test.ts`
  - pass, 7/7

### Full required checks

- `npm.cmd run test:vitest`
  - pass, 211 files / 2969 tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - pass
- `npm.cmd run build`
  - pass

### Evidence

- nested canonical saves no longer depend on top-level `candidate.*` aliases to receive canonicalization/defaulting
- partial Phase I nested saves now receive deterministic sibling defaults at the real owner paths
- partial Phase F nested saves now receive deterministic sibling defaults under `displacement`
- stray top-level legacy residue is preserved explicitly by rescue-before-defaulting instead of being silently discarded by empty nested defaults

## Deferred

Not touched in this lane:
- full migration philosophy redesign or schema-version expansion
- desktop campaign-start snapshot optimization
- replay feature work
- broad validation unification between `validateState(...)` and the older shape validators

## Outcome

This lane materially strengthens migration truth before `v0.9`:
- one more real nested-owner migration seam is gone
- legacy residue handling is explicit instead of accidental
- partial nested saves are less likely to lose state by owner-path drift
- the canonical nested-state ownership story is easier to explain and safer to build on
