# Consequence C3: Early Peace Ledger Bridge

**Date:** 2026-05-10
**Lane:** v0.9.0 Consequence System Refresh, Packet C3
**Status:** Implemented

## Summary

Accepted all-faction peace plans already terminated the war and froze the endgame snapshot. Packet C3 closes the remaining handoff gap by making the Cost Ledger record that early settlement as a duration finding.

The new finding is `early_peace_implementation_record`. It appears when `state.military.event_flags.war_ended_early === true` and records:

- accepted peace plan id from `early_peace_implemented`
- termination week from `state.meta.turn`
- restrained wording that treats early peace as a termination fact, not as proof that political or civilian costs disappeared

## Canon Posture

This is a read-only endgame reflection bridge. It does not change treaty acceptance, bot response logic, termination priority, scoring anchors, scenario data, save schema, or sensitive-history rupture logic.

## Verification

- Red first: `npx.cmd vitest run tests/peace_plans_war_ended_early_producer.test.ts --reporter=dot` failed on missing `early_peace_implementation_record`.
- Green focused: the same suite passed 3/3 after implementation.

## Roadmap Disposition

Packet C3 is complete for the first bounded accepted-peace path. Remaining v0.9.0 work should move to broader narrative-reader authoring or a different roadmap lane rather than another early-peace producer audit.
