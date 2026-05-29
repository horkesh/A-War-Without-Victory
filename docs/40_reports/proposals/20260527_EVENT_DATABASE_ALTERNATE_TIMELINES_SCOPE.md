# Event Database And Alternate Timelines Scope

**Date:** 2026-05-27
**Status:** Proposal / next event-system packet
**Owner:** Event-system product/engine lane, with Historian/Game Designer and Technical Architect gates

## Purpose

The event system now needs a full historical/counterfactual database, not a small row-by-row modal authoring pass. The target is a causal presidential layer where foundational decisions open, close, delay, or reshape later event families and material consequences.

## Required Separation

- Historical facts require citations before authoring.
- Historical/default choices are calibration paths and must remain distinct from staff recommendations.
- Counterfactuals are design hypotheses grounded in historical conditions, not claims that something was likely or inevitable.
- Sensitive-history events can model exposure, discipline, humanitarian access, legal pressure, patron reaction, and political fallout. They must not turn atrocities, camps, civilian targeting, hostage taking, or concealment into player optimization levers.

## First Research Families

### RS

1. Six Strategic Goals platform adoption.
2. Selective-goals counter-platform.
3. Aggressive-expansion counter-platform.
4. Paramilitary policy interaction with RS strategic goals.
5. Drina Valley campaign consequences.
6. Prijedor/camp exposure response.
7. Belgrade pressure on Pale.
8. Belgrade embargo and patron distancing.
9. RS Assembly rejection of Vance-Owen.
10. RS referendum/mandate framing.
11. RS independence path.
12. RS negotiated-autonomy path.
13. Pale versus military-command split.
14. Late-war survival under sanctions.
15. Post-Storm strategic contraction.

### RBiH

16. Civic republic path.
17. Bosniak national-state path.
18. Pragmatic coalition path.
19. Minority officer/recruitment retention.
20. Reintegration offers to Serb/Croat communities.
21. Enclave-defense policy.
22. Safe-area diplomacy.
23. Arms embargo/lift-and-strike pressure.
24. Abdic/APWB rupture.
25. Federation acceptance/refusal path.
26. Centralized-state peace-talks path.
27. Territorial-reintegration offensive path.
28. Negotiated-survival path.

### HRHB

29. Separate Croat republic path.
30. Full alliance with ARBiH path.
31. Strategic ambiguity path.
32. Zagreb pressure and HVO command integration.
33. HVO-ARBiH cooperation preservation.
34. HVO-ARBiH rupture and central Bosnia war.
35. Mostar/Neretva front branch.
36. Central Bosnia pocket branch.
37. Detention-camp exposure response.
38. Washington Agreement compliance.
39. Third-entity negotiating path.
40. Territorial-maximalist/conquest path.
41. Federation military integration.
42. HV/HVO late-war cooperation path.

### Cross-Faction Diplomacy

43. Vance-Owen causal packet.
44. Owen-Stoltenberg causal packet.
45. Contact Group 51/49 packet.
46. Washington Agreement packet.
47. NATO escalation/safe-area enforcement packet.
48. Dayton entry-conditions packet.

## Technical Semantics Needed Before Runtime Behavior

The next technical packet must decide executable semantics for:

- response-level `opens_events`, `closes_events`, `opens_flags`, `closes_flags`;
- persisted `closed_event_ids` and optional `event_causality_log`;
- deterministic evaluator ordering between normal trigger eligibility and explicitly enabled events;
- save migration and validation if new persisted state is added;
- diagnostic alignment between executable opens/closes and modal `future_consequences`;
- title-resolved player-facing branch previews instead of raw event IDs.

`future_consequences` remains presentation metadata until that semantics packet is approved.

## Material Consequence Classes

Allowed consequence classes include:

- equipment grants and equipment-quality modifiers;
- supply/ammunition deltas and supply-condition modifiers;
- morale/cohesion changes;
- recruitment/pool modifiers;
- alliance locks and diplomatic/patron pressure;
- bot priority shifts and offensive-operation suppression;
- control changes or territory flips only when historically/canon approved and regression-tested;
- Codex/Records/Chronicle/endgame cost annotations.

## Stop Gates

- Historical/default label without source support.
- Counterfactual prose written as fact.
- Sensitive-history leverification.
- Runtime branch behavior before exact open/close semantics are approved.
- Staff recommendation used by historical bot calibration.
- Territory flip without canon/source and scenario proof.
- Scenario hash drift without event-order or behavior explanation.

## Done Means

Done for the next phase means a source-backed event-family inventory, an alternate-timeline decision tree, exact runtime branch semantics, sensitive-history ring classification, and a test matrix for historical bot calibration versus player counterfactual divergence.
