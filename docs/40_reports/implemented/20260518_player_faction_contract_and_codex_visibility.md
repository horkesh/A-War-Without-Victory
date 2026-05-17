# Player Faction Contract and Codex Visibility

Date: 2026-05-18

## Scope

Implemented Phase A, Phase B, and Phase B+ from `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`.

Not implemented: Phase C notification queue and Phase D authored notification content.

## Changes

- Verified Phase A Codex visibility behavior with existing focused coverage: unfired non-ghost essays remain hidden, ghost essays remain visible, fired essays remain visible, and empty year headers remain hidden.
- Bumped loaded-save schema to v14 and added a deterministic legacy-save migration that defaults missing or invalid `meta.player_faction` to `RBiH`.
- Hardened current loaded-state validation so schema v14 requires `meta.player_faction` to be one of `RBiH`, `RS`, or `HRHB`.
- Added canonical `playerFactionMatch` / `requirePlayerFaction` helpers for strict player-facing faction checks.
- Replaced permissive null-fallback filters in inbox, operation opportunity views, autonomy proposals, map adapter player-facing queues, faction-keyed records, visible formations, and warroom player-faction resolution.
- Preserved scenario JSON neutrality: authored scenario `player_faction` remains optional and scenario validation/contract tests continue to pass.

## Determinism

The migration is a pure in-place constant default with no I/O, time, randomness, locale ordering, or environment reads. Runtime filtering changes only player-facing UI exposure. Scenario JSON inputs remain unchanged.

Expected hash drift: possible only for legacy saves without canonical `meta.player_faction`, because migration v14 now materializes `RBiH` before validation/serialization.

## Verification

- `npx.cmd vitest run tests/state/player_faction_contract.test.ts tests/ui/inboxItems.faction_scope.test.ts tests/ui/warroom_player_faction.test.ts`
  - Initial red run failed on the intended missing contracts.
  - Final result: 3 files passed, 4 tests passed.
- `npx.cmd vitest run tests/ui/codex_panel_dynamic_mount.test.ts tests/ui/codex_essay_resolver.test.ts tests/scenario_player_faction_contract.test.ts tests/state/player_faction_contract.test.ts tests/ui/inboxItems.faction_scope.test.ts tests/ui/warroom_player_faction.test.ts tests/autonomy_panel_player_faction_truth.test.ts tests/player_faction_shell_boundary_truth.test.ts tests/save_migration_counter_offers.test.ts tests/save_migration_versioned_steps.test.ts`
  - Result: 10 files passed, 53 tests passed.
- `npm.cmd run typecheck`
  - Result: passed.
- `npm.cmd run desktop:map:build`
  - Result: passed.
  - Existing warnings observed: browser externalization for Node modules imported by combat files, dynamic/static import overlap, and large chunk size.

## Blockers

None for Phase A/B/B+ scope.
