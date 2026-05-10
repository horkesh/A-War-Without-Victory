# Consequence Substrate Inventory

**Date:** 2026-05-10
**Lane:** v0.9.0 Consequence System Refresh, Packet C1
**Status:** Complete

## Summary

Packet C1 is now executable. `tools/diagnostics/consequence_substrate_inventory.cjs` scans the authored event catalog and emits a deterministic owner matrix for every event-effect substrate that consequence work can use.

Current catalog measurement:

- Events scanned: 238
- Effect instances: 796
- Effect kinds: 18
- Live substrates: 18
- Partial-reader substrates: none
- Unknown substrates: none

## Owner Matrix Result

The audit confirms there is no unknown effect substrate in the current catalog. Most consequence work can be expressed through existing writers/readers:

- Political pressure: `patron_pressure`, `negotiation_capital`
- Military quality and readiness: `morale_change`, `cohesion_change`, `equipment_quality_modifier`, `equipment_grant`, `supply_delta`
- Operational constraints: `doctrine_constraint`, `bot_priority_shift`, `aggression_modifier`
- Alliance state: `alliance_change`, `alliance_lock`
- Narrative/endgame recording: `narrative`, `humanitarian_impact`, `cost_ledger_annotation`
- Territorial facts: `control_change`

The follow-up reader pass confirmed both previously suspicious substrates are live: `guerrilla_threat` is consumed by `applyGuerrillaAttrition(...)` through `getActiveGuerrillaThreatIntensity(...)`, and `recruitment_modifier` is consumed by `ongoing_mobilization` through `getActiveRecruitmentMultiplier(...)`.

## Faction Coverage Notes

The diagnostic reports asymmetric faction coverage where a kind has a `faction` field but does not touch all three factions. Not every asymmetry is a bug:

- `control_change` is RBiH-only in the current catalog because it is used for specific early-war territorial events, not a generic consequence path.
- `doctrine_constraint` is RS-only because the current authored constraints are Drina/safe-area focused.
- `equipment_grant` has no RS use because current grants are barracks/captured-supply and RBiH/HRHB arms-flow shaped.
- `guerrilla_threat` is still single-use and RS-scoped, but the reader is live; future work should treat it as an authoring-coverage question, not a missing-substrate question.

## Verification

- `npx.cmd vitest run tests/consequence_substrate_inventory_diagnostic.test.ts tests/consequence_consumers.test.ts --reporter=dot` passed 25/25.
- Real catalog command: `node tools/diagnostics/consequence_substrate_inventory.cjs --json`.

## Roadmap Disposition

Packet C1 is complete. The next v0.9.0 consequence lane should not be another broad audit. It should pick one of the two grounded follow-ups:

- C2 pressure consequence completion using already-live `patron_pressure` / `negotiation_capital` / `cost_ledger_annotation` surfaces.
- Authoring-coverage work for `guerrilla_threat` only if a concrete future divergence chain needs faction mirrors.
