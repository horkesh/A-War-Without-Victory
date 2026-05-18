# Supply Visibility Read-Model — UI-1 Batch 40 Closeout

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md` UI-1
**Branch:** `codex/execute-2026-05-17-plans`
**Scope:** UI / read-model only. No engine / no sim authority / no new schema.

## Summary

Surfaces existing supply truth (per-faction OSID supply state, corridor open/brittle/cut counts, formation `location_osid`) as a compact player-scoped projection consumed by the presidential Decision Room. No new modal, no new simulation field, no enemy-truth leakage.

The projection condenses the already player-faction-safe slices the adapter exposes (`LoadedGameState.supplyStateByOsid`, `LoadedGameState.supplySummaryByFaction[playerFaction]`) plus the player's own formations into a single deterministic view. The Decision Room consumes the projection and emits one card when the player's own supply state is `warning` (brittle/cut corridor) or `critical` (critical-supply OSID or isolated brigade).

## Changes Made

### New read-model projection

- `src/ui/map/data/playerSupplyVisibility.ts`
  - `PlayerSupplyVisibilityView` shape and `buildPlayerSupplyVisibility(state)` helper.
  - Reads only the player faction's own `supplySummaryByFaction` row and the already-filtered `supplyStateByOsid`.
  - Counts isolated active player brigades whose `location_osid` is in a critical-supply state.
  - Severity tiers: `critical` (criticalCount > 0 OR isolatedFormationCount > 0) > `warning` (corridorAtRisk) > `info` (otherwise) > `unknown` (no derivation yet).
  - Deterministic: sorted iteration by formation id, no Math.random, no Date.now.

### Decision Room consumer

- `src/ui/map/data/presidentialDecisionRoom.ts`
  - Adds `addSupplyVisibilityCard(state, cards)`, emitting one `operational` category card with id `supply:player-visibility` when the projection reports `warning` or `critical`.
  - Navigation target reuses the existing `army-hq-tab: summary` handoff (Operational SITREP / War Summary owner).
  - Card stays silent for healthy or unknown supply state, so the Decision Room is not noisier on baseline turns.

### Focused tests (TDD)

- `tests/ui_player_supply_visibility.test.ts` — 7 cases:
  - Null when no player faction.
  - Compact view from populated supply data.
  - Unknown severity when no supply data.
  - Corridor at risk → warning, headline, evidence.
  - Isolated player formation at critical OSID → critical, brigade evidence.
  - Enemy supply state does not leak into player projection (heavy vs clean parity).
  - Deterministic output regardless of formation insertion order.
- `tests/ui_decision_room_supply_visibility.test.ts` — 5 cases:
  - No card on healthy state.
  - No card on absent supply data.
  - Warning card when corridors are brittle/cut.
  - Critical card when formations are isolated at critical OSIDs.
  - No leakage when only enemy supply state is severe.

## Verification

- `npm.cmd run typecheck` — clean.
- `npx.cmd vitest run tests/ui_player_supply_visibility.test.ts tests/ui_decision_room_supply_visibility.test.ts tests/supply_panel_contract.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/presidential_decision_room_counter_offer.test.ts tests/ui_shell_navigation.test.ts --reporter=dot` — 40/40 passed.
- `npm.cmd run desktop:map:build` — built in 16.66s, no errors.
- `git diff --check` — clean (CRLF normalization notice only).

## 40w Scenario

Not run. No sim engine change, no scenario authority change, no new persisted state. The projection is a UI consumer of existing player-faction-safe adapter output; scenario hash inputs are unchanged.

## Ownership / Scope

- The engine remains the source of supply truth: `state.supply_state_by_osid`, `state.supply_corridors_osid`, `state.political.war_supply_condition`, `state.political.last_supply_state_by_osid`.
- The adapter (`GameStateAdapter.deriveSupplyStateByOsidView` / `deriveSupplySummaryByFaction`) remains the singular projector into UI-facing fields.
- `playerSupplyVisibility.ts` is a presentation-only consumer that re-shapes the already player-safe slices; it does not add a second supply truth owner.
- The Decision Room remains the singular synthesis surface; no new modal was added.

## Player-Safety Notes

- The projection reads `supplySummaryByFaction[playerFaction]` only; other faction rows in that map are deliberately ignored.
- `supplyStateByOsid` is already filtered to the player faction by the adapter.
- Isolated-formation counting reads only `formation.faction === playerFaction` brigades.
- Test `does not leak enemy supply truth` proves the projection is invariant to enemy supply data.

## Stop Gates (none triggered)

- No new simulation field needed.
- No UI surface exposes enemy-only supply truth.
- No new supply mechanics or balance tuning.
- No second owner created for Decision Room or commander supply truth.
