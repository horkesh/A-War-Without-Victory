# B3 Negotiation Counter-Offers

**Date:** 2026-05-17
**Plan:** `docs/plans/2026-05-17-b3-negotiation-counter-offers-plan.md`
**Status:** Implemented through deterministic state, bot generation, phase wiring, player submission surface, save migration, and focused UI/read-model coverage.

## Change

The negotiation pipeline now supports bounded counter-offers instead of only binary accept/reject responses.

- Added `CounterOffer`, `NegotiationDelta`, and `pending_counter_offers[]` to `NegotiationState`.
- Added `last_counter_turn` to `NegotiationStatus`.
- Added deterministic historical counter-offer envelopes for Vance-Owen, Owen-Stoltenberg, and Contact Group plans.
- Added `generateCounterOffer`, `resolveCounterOffers`, and `submitPlayerCounterOffer`.
- Inserted `resolve-counter-offers` immediately after `evaluate-peace-plans` in the war negotiation helper slice.
- Added Decision Room counter-offer projection, navigation, and IPC/preload/electron submission plumbing.
- Added save migration v13 to initialize the new persisted fields.

## Determinism And Limits

- Counter IDs are deterministic (`<author>_<seq>`).
- Bot iteration is sorted by the fixed faction list and excludes the player faction.
- Chain depth is capped at 2.
- Each faction emits at most one counter per turn through `last_counter_turn`.
- Counter authoring has zero negotiation-capital cost; capital remains a ratification concern.
- No `Math.random`, `Date.now`, or locale-sensitive ordering was added.

## Verification

- `npx.cmd vitest run tests\negotiation_counter_offer_state.test.ts tests\historical_envelopes_citations.test.ts tests\counter_offer_generator.test.ts tests\resolve_counter_offers_phase.test.ts tests\save_migration_counter_offers.test.ts tests\presidential_decision_room_counter_offer.test.ts` passed in the worker lane: 6 files / 13 tests.
- `npx.cmd vitest run tests\save_migration_versioned_steps.test.ts tests\war_phase_step_order.test.ts tests\ui\presidential_decision_room.test.ts tests\ui_presidential_decision_room_wiring.test.ts` passed in the worker lane: 4 files / 27 tests.
- Parent integration `npx.cmd tsc --noEmit --pretty false` passed after repairing the `ParentOffer` union access and one fixture cast.
- Parent focused integration suite passed with B3, Sarajevo, and embargo tests together: 22 files / 95 tests.
- Integrated 40w run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1853` completed with hash `c16ba5bc33b79277`, 27/27 anchors, diagnostics WARN-only, and consistency PASS.
- Integrated 188w run `runs\apr1992_definitive_188w__210e69404d054959__w188_n1854` completed with hash `1f81ab4263ace3e9`. Temporarily disabling the `resolve-counter-offers` phase produced n1856 with the same hash, so the already-dirty n1847 188w anchor set is not caused by B3 counter-offer generation.

## Follow-Up

Dayton-era counter ranges remain out of scope until a historian follow-up provides citation-backed envelopes.
