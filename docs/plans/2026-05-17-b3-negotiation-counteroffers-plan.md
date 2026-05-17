# B3 Negotiation Counter-Offers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade counter-offers into deterministic, inspectable negotiation packets with acceptance reasons, scoped deltas, expiry, and UI visibility.

**Architecture:** Extend negotiation offer state and read models without mutating ceasefire/enforcement state until a counter-offer is explicitly accepted.

**Tech Stack:** TypeScript negotiation state, war phase negotiation steps, React diplomacy panel, Vitest.

---

## Files

- `src/state/negotiation_offers.ts`
- `src/sim/turn_phases/war_phase_negotiation_steps.ts`
- `src/ui/map/data/diplomacyView.ts`
- `src/ui/map/components/DiplomacyPanel.tsx`
- `tests/negotiation_offers.test.ts`
- `tests/ui/diplomacy_view.test.ts`
- `tests/ui/diplomacy_panel.test.ts`
- `tests/ui/diplomacy_player_truth.test.ts`

## Implementation Tasks

1. Add failing tests for counter-offer reason taxonomy, narrowed scope, duration reduction, no empty freeze edges, stable IDs, and stable UI projection.
2. Define schema fields: `base_offer_id`, `countered_by`, `concessions`, `reasons`, `expires_turn`.
3. Extend `AcceptanceReport.counter_offer` deterministically while preserving accepted enforcement package behavior.
4. Sort reasons, concessions, and target edges with stable compare helpers.
5. Project active offers and counter-offers through `diplomacyView`.
6. Surface counter-offers in Diplomacy panel using player-readable reasons, not raw threshold math.
7. Add docs/ledger closeout.

## Verification

- `npx.cmd vitest run tests/negotiation_offers.test.ts tests/ui/diplomacy_view.test.ts tests/ui/diplomacy_panel.test.ts tests/ui/diplomacy_player_truth.test.ts`
- `npm.cmd run typecheck`

## Documentation And Ledger

- Update `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`.
- Update `docs/plans/MASTER_ROADMAP.md`.
- Add `docs/PROJECT_LEDGER.md` behavior/UI entry.

## Stop Gates

- Stop if counter-offers mutate ceasefire state before explicit acceptance.
- Stop if offer IDs depend on insertion order.
- Stop if the UI exposes raw acceptance thresholds.
