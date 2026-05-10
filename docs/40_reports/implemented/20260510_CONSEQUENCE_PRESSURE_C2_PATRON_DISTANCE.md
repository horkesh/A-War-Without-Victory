# Consequence Pressure C2: Patron-Distance Completion

**Date:** 2026-05-10
**Lane:** v0.9.0 Consequence System Refresh, Packet C2
**Status:** Implemented

## Summary

Packet C2 now has a concrete pressure-completion slice. The patron-distance chain no longer has RS-only writers while downstream RBiH/HRHB arms-pipeline events wait on faction-scoped review flags that nothing authored.

Added four consequence events to `data/scenarios/events/consequences.json`:

- `csq_patron_arms_review_imposed_RBiH`
- `csq_patron_disavowal_partial_RBiH`
- `csq_patron_arms_review_imposed_HRHB`
- `csq_patron_disavowal_partial_HRHB`

The new events reuse existing condition and effect kinds only. They write faction-scoped review/disavowal flags plus live `recruitment_modifier`, `supply_delta`, `patron_pressure`, and CostLedger annotations.

## Canon Posture

This is an additive Ring 1 consequence-content slice. It does not add a new patron model, rupture mechanic, state schema, event substrate, sensitive-history surface, player command lever, or scenario paint. RBiH/HRHB wording is deliberately framed as conditional external-channel pressure rather than cloning the Belgrade-Pale historical disavowal pattern.

## Verification

- Red first: `npx.cmd vitest run tests/consequence_pressure_c2_patron_distance.test.ts --reporter=dot` failed 4/4 on missing event IDs.
- Green focused: the same suite passed 4/4 after authoring.
- Real inventory: `node tools/diagnostics/consequence_substrate_inventory.cjs --json` reports 242 event definitions, 812 effect instances, 18 known effect kinds, 18 live substrates, and zero unknown or partial-reader substrates.

## Roadmap Disposition

Packet C2 is complete for the patron-distance seam. Remaining v0.9.0 consequence work should move to Packet C3 early-peace consequence bridging or a deliberately scoped narrative-reader follow-up.
