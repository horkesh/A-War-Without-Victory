# Headless Opportunity Decision Bridge

Date: 2026-05-22

## Summary

The scenario harness now resolves Operation Opportunity proposals in non-interactive runs instead of leaving player-faction opportunities permanently pending.

Interactive desktop semantics are unchanged: player-faction opportunities still surface through `pending_proposal_reviews` and are applied by `applyResolvedOpportunityDecisions` after the player marks a review row. The harness-only path now covers two non-interactive cases:

- Level 1 reviews generated during headless runs are marked with the same staff recommendation shown to the player.
- Any opportunity still `eligible_pending_review` after the turn pipeline is resolved with `applyBotOpportunityDecisions(..., playerFaction = null)`, using the existing deterministic default/staff recommendation path.

No operation catalog definitions, scenario data, OOB rows, painted targets, combat math, save schema, or outcome tuning changed.

## Evidence

- Red test: `autoResolveOpportunityProposalReviews` was missing and the new review-marking test failed.
- Green focused test: `npx.cmd vitest run tests\operation_opportunities_phase2_decisions.test.ts --reporter=dot` PASS (15/15).
- Expanded opportunity catalog suite: `npx.cmd vitest run tests\operation_opportunities_phase2_decisions.test.ts tests\operation_opportunities_catalog.test.ts tests\operation_opportunities_central_bosnia_catalog.test.ts tests\operation_opportunities_federation_western_bosnia_catalog.test.ts --reporter=dot` PASS (76/76).
- `npm.cmd run typecheck` PASS.
- `npm.cmd run test:baselines` PASS before the final harness bridge; covered baselines remain pre-late-war for this lane.
- Fresh 188w run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1938` completed with final hash `091949f7cb8dcbf9`.
- 188w bot benchmarks: 6 evaluated, 6 passed, 0 failed.

## 188w Result

The bridge closes the proposal-decision gap:

- `sana_95`: eligible and approved at turn 175; executed op `Operation Sana`; AAR `arbih_5th_corps:Operation Sana:t175`.
- `donji_vakuf_95`: eligible and approved at turn 177; executed op `Operation Donji Vakuf 95`; AAR `arbih_7th_corps:Operation Donji Vakuf 95:t177`.
- Opportunity campaign proof now reports `surfaced_executed: 2`, `health_decisions: 5`, no broken AAR links, and no unlinked approvals.

The bridge does not yet close the painted-control gap:

- `sana_95` exits `did_not_launch` with AAR outcome `failure`, 0 attacks, 0 captures, 18 targeted OSIDs, and `NO_OPENING_ATTACK:2`.
- `donji_vakuf_95` exits `did_not_launch` with AAR outcome `failure`, 0 attacks, 0 captures, 10 targeted OSIDs, and `NO-CONTACT-PATH:2` / `defender_power_too_high`.
- `mistral_2_95` remains blocked by Federation authorization and Kupres/Cincar staging.
- Painted `oct1995` area-weighted match remains 71.7%; sim area share is still RS 60.9%, RBiH 26.5%, HRHB 12.6%.

## Next Lane

Do not move to W3 casualty-trajectory schema from this evidence alone. The current blocker is later in the delivery chain: accepted late-war opportunities now reach AARs but fail to launch attacks. The next implementation lane should inspect launch feasibility / opening attack generation for `Operation Sana` and `Operation Donji Vakuf 95`, preserving the new trace/AAR evidence boundary.
