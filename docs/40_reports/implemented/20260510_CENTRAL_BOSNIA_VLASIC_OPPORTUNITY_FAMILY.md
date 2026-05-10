# Central Bosnia / Vlasic Opportunity Family

**Date:** 2026-05-10  
**Lane:** Operation Opportunity Families, Phase 2  
**Ring:** 1, non-sensitive territorial military operation  
**Primary files:** `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`, `src/sim/combat/operation_opportunities.ts`

## Summary

This slice extends the opportunity system beyond the 5th Corps family with the first Central Bosnia / Vlasic entry: `vlasic_ridge_95`.

The new entry is a prerequisite-driven ARBiH 3rd Corps proposal for the spring 1995 Travnik / Vlasic ridge line. It uses the generic opportunity substrate: live prerequisites produce a proposal, player/bot decision records a response, approval routes through `buildCorpsOperation`, and AAR closure links an exit class.

## What Shipped

- New family catalog export: `CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES`.
- New opportunity: `VLASIC_RIDGE_95_OPPORTUNITY`.
- Canonical catalog composition now includes the Central Bosnia family.
- Required gates: date window, 3rd Corps readiness, Travnik staging access, live RS-held ridge objectives, and post-Washington alliance context.
- Optional gates: logistics, weather/season, commander confidence, and force quality; at least two must be green.
- Redirect variants: `ridge_probe` and `bugojno_support`.

## Behavior

The proposal appears only when the live state supports it. If the alliance is broken, staging anchors are lost, no ridge objectives remain in enemy hands, or too many optional soft signals are red, the opportunity does not surface. Decline records a resolution with no operation spawn. Approve and redirect spawn normal corps operations through the existing factory and lifecycle.

## Verification

- Red first: the new catalog test failed on the missing Central Bosnia catalog module.
- Green focused suite: `npx.cmd vitest run tests/operation_opportunities_central_bosnia_catalog.test.ts --reporter=dot` passed 6/6.
- Green broader opportunity suite: `npx.cmd vitest run tests/operation_opportunities_catalog.test.ts tests/operation_opportunities_phase2_decisions.test.ts tests/operation_opportunities_central_bosnia_catalog.test.ts --reporter=dot` passed 62/62.

## Canon Posture

No combat math, scenario data, OOB, painted target, sensitive-history gate, rupture rule, event trigger, or save schema changed. This is additive catalog behavior over the existing operation-opportunity substrate.
