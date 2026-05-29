# Phase B Test Plan — Event Database Runtime Substrate

**Date:** 2026-05-27
**Status:** Phase A deliverable — Phase B implementer reads this first.
**Owner:** Technical Architect (test-plan ratification) + Gameplay Programmer (implementation) + QA Engineer (verification).
**Source reviewers:** Canon Compliance + Determinism Auditor + Game Designer (Wave 2 Phase A review).

## Purpose

Single landing pad for every Phase B test gate. Phase B implementer must add a focused test for every item in this list before claiming Workstream B closure.

## Loader tests (event_loader.ts)

### Catalog freeze (Canon Compliance)
1. No event with `family: 'H5'` (Croat-Bosniak war atrocities umbrella), `family: 'h8_mostar_bridge'`, or `family: 'un_safe_area_enforcement'` carries `requires_player_response: true` or non-empty `response_options[]`.
2. Camp-exposure option-set freeze: R4 (`concentration_camps_revealed_1992`) and H6 (`hvo_detention_camps_*`) option set is exactly `['deny','obstruct','cooperate']` — no fourth option, no rename.
3. No event with `family: 'rs_drina_campaign'` (or equivalent tag) appears in the catalog. Promoted to **required** static test (R3 §7 Q1 Canon ruling).

### Branch-tag vocabulary (Determinism Auditor)
4. Every `branch_tag` string used in `data/scenarios/events/*.json` must exist in `event_families.ts` vocabulary export.
5. Vocabulary arrays are sorted under `strictCompare` and contain no duplicates.
6. Phase B `event_families.ts` exports each family-tag set as a frozen `as const` tuple (never `Object.keys` of a literal).

### Flag-key consistency (Determinism Auditor)
7. Every `trigger.condition.flag_equals` references a flag key that some option's `sets_flags` writes (no orphan readers).
8. Every `sets_flags` key written by an option appears in at least one downstream `flag_equals` or is documented as engine-consumed (no orphan writers).

### Cross-faction option-id rejection (Determinism Auditor)
9. Two option ids identical across rows of different `responding_faction` are rejected (cheap defense against near-name reintroduction).

### Composite-tag derivation (Determinism Auditor)
10. Composite tags must use `and`-composite in `trigger.condition`; forbid any meta-flag writer step (would introduce ordering risk).

### §3.6 alignment rule (v1.3 packet §3.3)
11. `enables_events_runtime[id]` ⊂ union of `future_consequences[*].opens_events` (presentation must mention runtime opens). Symmetric for `closes_events_runtime`.
12. Unknown `branch_tag` referencing an entry not in `event_families.ts` is rejected.

### §3.6 sensitive-history (Canon Compliance)
13. Downstream `requires_enabled` event's `trigger.condition` must reference the branching response's `sets_flags` key.
14. Ring-3 enabling is rejected (a `enables_events_runtime` target whose `trigger.condition` includes a non-emergent author-selected predicate for atrocity).
15. Staff-recommendation runtime-causality is rejected: a response option that carries `enables_events_runtime` or `closes_events_runtime` on an event whose modal-ready path is `staff_recommended_response_id` is rejected.
16. Unreachable gate: an event with `requires_enabled: true` not referenced in any `EventDefinition.enables_events` or any `EventResponseOption.enables_events_runtime` is rejected. Additionally, at least one such opener must be reachable via a `historical_default_response_id` ancestor path.
17. Sensitive-act continuation: a response option whose `effects` or `sets_flags` extend, continue, or scale a sensitive-history act already in state at fire-time is rejected (except for the v1.3 §3.6 named-row carve-out `un_hostage_crisis_1995 → maintain_hostages`).
18. **§3.6 clause overlap rejection test (Game Designer Wave 2 v1.2 note):** assert that an author cannot satisfy the Ring-3 atrocity-gating clause while skirting the continuation-of-act clause — fixture: a response that scales an existing camp operation without authoring a new Ring-3 event, asserted rejected.

### Route-based §3.6 guards (Canon Compliance)
19. **R12 maintain_hostages route-based guard:** for each event downstream-enabled (directly or transitively) by `un_hostage_response: "maintain"`, assert no response option carries `effects` that increment `war_crimes_events`, write `paramilitary_policy`, or set hostage/detention/human-shield flags.
20. **R11 remove_mladic forward-looking guard:** identical route walk for `karadzic_mladic_crisis: "mladic_removed"`.

### Rupture-foreclosure prohibition (Canon Compliance)
21. **B5 rupture-foreclosure prohibition:** assert no event with `family: 'srebrenica_demilitarization_1993'` option carries `closes_events_runtime` containing `'srebrenica_falls_1995'` or `'srebrenica_genocide_1995'`. Extend to B4 `accept_*`, X4 counterfactual A, X5 D/E pending Gate §6 sign-off.

## Evaluator tests (evaluate_events.ts)

22. Closed candidates never become eligible — short-circuit short of pressure/probability rolls.
23. `requires_enabled` gate works: an event with `requires_enabled: true` is only eligible if its id is in `state.military.enabled_event_ids`.
24. Pressure non-accumulation while closed: `event_readiness` does not advance while the event is closed; prior readiness preserved on close.
25. Queued candidates re-evaluated against closure on next turn — a close that fires after a candidate enters overflow queue removes it on the next eligibility pass.
26. Mutex/overflow ordering unaffected when no rows use the new fields.
27. No-op + causality-log entry: `closes_events_runtime` targeting an event id already in `fired_event_ids` is a no-op + records a `mutex_suppressed`-style entry in `event_causality_log`. Same for `enables_events_runtime` on once-fired.

## Decision tests (event_decisions.ts / resolve_decision.ts)

28. Response-level enables/closes applied on player path (resolveEventDecision).
29. Response-level enables/closes applied on bot path (evaluate_events.ts auto-resolve).
30. `event_decision_log` parity preserved across all decision sources.

## State shape (validateGameState.ts + event_state_shape_validation.test.ts)

31. `state.military.closed_event_ids` shape: string array, sorted, deduped, deterministic.
32. `state.military.event_causality_log` shape: array of `{turn, from_event, to_event?, to_flag?, kind, source_response_id?}`; sorted on read per the §2.3 sort key.
33. validateGameState rejects malformed shapes.

## Save migration (save_migration.ts + save_migration.test.ts)

34. v26 closed_event_ids: deterministic `[]` default for prior saves; current-version saves require the field.
35. v27 event_causality_log: deterministic `[]` default for prior saves.
36. Fixtures under `tests/fixtures/save_migration/v26_closed_event_ids.json` and `v27_event_causality_log.json`.
37. Round-trip contract preserved.
38. Drift audit clean.
39. Migration is pure: no I/O, logging, time, randomness, env reads, or unsorted record traversal.

## Determinism re-run (Determinism Auditor + QA Engineer convergent)

40. Focused two-run byte-identity assertion: `evaluateEvents` produces byte-identical `enabled_event_ids` / `closed_event_ids` / `event_causality_log` across two consecutive runs on the same fixture state.
41. `tests/save_migration_drift_audit.test.ts` + `tools/diagnostics/save_migration_drift_audit.cjs` artifact check blocking, not advisory.
42. `tests/startup_snapshot_contract.test.ts` + `npm.cmd run desktop:startup-snapshot:build` blocking.

## Scenario regression (test:baselines)

43. 40w byte-identity required (no row uses the new runtime arrays in Phase B; `requires_enabled` defaults `false`).
44. If `test:baselines` drifts, do not refresh blindly — explain via event ordering / queue / migration default tied to a PROJECT_LEDGER entry.

## Sort discipline (Determinism Auditor)

45. `recordEnabledEvents` and `recordClosedEvents` perform dedup-on-append + canonical sort-on-write (distinct from overflow-queue recompute pattern).
46. Both helpers share a single export; resolve_decision.ts and evaluate_events.ts route through them.

## UI / taxonomy diagnostic (QA Engineer)

47. Taxonomy diagnostic renders `enables_events_runtime` / `closes_events_runtime` inventory.
48. Taxonomy presentation-vs-runtime alignment finding renders for any mismatch.

## Cost Ledger / narrative (Canon Compliance)

49. **Cost Ledger Gate §4 compliance:** all H8 / Stari Most modal/Cost Ledger strings carry ICTY IT-04-74 citation (Trial Vol. 3 §§1366-1455; Appeals §§411-450) and avoid euphemism / minimization / achievement-language per Gate §4 "Forbidden."

## Open items deferred to Phase C/D

- Per-family causality-log triple acceptance tests (§7 Phases D-F row in v1.3 packet).
- X8 `us_halts_federation_advance_1995 → push_further` text revision + 188w scenario proof gate (mandatory before any X8 commit per Foundational packet line 58).

## References

- v1.3 packet `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` §6 Phase B, §7.
- Foundational packet `docs/40_reports/proposals/20260527_EVENT_FOUNDATIONAL_DECISIONS_PACKET.md`.
- Sensitive History Design Gate `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
- Canon Compliance Wave 2 review (Phase A close).
- Determinism Auditor Wave 2 review (Phase A close).
- Game Designer Wave 2 review (Phase A close).
- Branch-tag vocabulary `docs/40_reports/research/20260527_EVENT_FAMILY_BRANCH_TAG_VOCABULARY.md`.
