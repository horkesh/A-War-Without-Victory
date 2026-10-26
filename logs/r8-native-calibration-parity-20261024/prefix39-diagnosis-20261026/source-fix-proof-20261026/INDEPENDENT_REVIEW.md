# Independent REQUEST-OP personnel-floor review

**Review date:** 2026-10-26  
**Base:** `33f99fc5aac9a620a7bb0000cf233d86f270ce24`  
**Verdict:** **GO for the bounded source correction.** No critical, suggestion, or nice-to-have findings.

## Reviewed source

- `src/sim/turn_phases/war_phases.ts` — SHA-256 `8a085a37835541f4dc267e5c1f7f75a714bafc596e21d43b1467cb8ee62d7fcd`
- `tests/op_directive_objection.test.ts` — SHA-256 `892242ebe14ac935581cf218877fa466ca8f1f218e0d97ed9c21f34acc83902f`
- `tests/op_directive_injection.test.ts` — SHA-256 `add227b78c06141a2ee501972907dad52caf4edd5069b5244b6f2d6020a01115`

The production diff imports the existing `MIN_ATTACK_PERSONNEL` constant and adds exactly one selector predicate before reachable-force counting and the existing minimum-three gate. It preserves availability, state-wide commitment, active-brigade, enclave/objective, physical-route, 3–12 roster, equipment-priority, strict-ID ordering, validation, operation-slot, and injection rules.

## Correctness and public-path findings

- `499` is rejected and `500` admitted across assigned on-front, assigned off-front, and reserve fixtures.
- A connected mixed roster with two usable and eight understrength brigades returns the existing `no_available_force` result in the pure planner and desktop query without mutation.
- The injection phase consumes the directive, records `no_available_force`, creates no operation, and creates no attack-order ownership.
- A normal public `runTurn` proves the same outcome after the canonical turn increment: rejection turn `15`, no active operation, and no `brigade_attack_order_owners`.
- Legal rosters retain the existing 12-member cap, equipment-priority ranking, canonical participant ordering, route/control/alliance guards, and pure-query behavior through the unchanged prior tests.

## Canon mapping

- Rulebook §6.4 (`Rulebook_v0_9_0.md:281-289`) keeps all offensive attacks under `CorpsOperation` and explicitly preserves the generic 500-person attack floor.
- Rulebook §7.1–7.3 (`Rulebook_v0_9_0.md:313-348`) preserves corps force selection, preparation, staff movement, and launch ownership; this patch changes admission only.
- Engine Invariants §6.3 and §14.11 preserve operations-only attack authority, one full planning turn, readiness/attack executability, and the existing anti-paralysis budget. None is edited.
- Systems Manual §21 (`Systems_Manual_v0_9_0.md:970-978`) keeps REQUEST-OP at 3–12 available, uncommitted active brigades with existing eligibility, connectivity, ranking, and hard rejection rules. Applying the already-canonical offensive floor aligns the selector with its normal consumer.
- Game Bible §21.5 (`Game_Bible_v0_9_0.md:290-300`) and Rulebook §17.3 (`Rulebook_v0_9_0.md:525-536`) retain presidential objective-setting and corps ownership of brigade assignment, axes, preparation, and execution.

## Determinism and boundary review

No determinism risk found. The added predicate is a pure scalar comparison against an existing constant. It introduces no random/time input, iteration, mutation, serialization, state field, or ordering change. Existing explicit staging sort, equipment-priority tie-break, participant canonicalization, and fail-closed validation remain unchanged. `git diff --check` exits `0` (the only message is an unrelated pre-existing ledger CRLF warning).

The diff does not touch assembly percentage, `planning_duration`, `preparation_max_turns`, anti-paralysis, movement, supply, enclave policy, combat prediction/resolution, casualties, political control, CA cost, thresholds, or save schema.

## Retained evidence

- TDD RED: `attempt-001-red`, child/wrapper `1/1`, 37 total, 34 pass, three expected new failures.
- Focused GREEN before the public-turn addition: `attempt-002-green`, child/wrapper `0/0`, 37/37.
- Public-turn fixture failures remain preserved: `attempt-005-public-turn-green` (missing late-OG fixture field) and `attempt-006-public-turn-green-corrected` (direct-phase turn 14 versus public-turn turn 15 expectation). These are test-fixture corrections, not production defects.
- Targeted public-turn GREEN: `attempt-007-public-turn-targeted-green`, child/wrapper `0/0`, one selected test passed and 14 intentionally filtered.
- Final nonincremental TypeScript: `attempt-008-typecheck-final`, child/wrapper `0/0`, empty stdout/stderr.

All tests are self-contained repository fixtures. They do not read ignored logs, run artifacts, or local-only evidence.

## Scope limits

This is a source/canon/determinism GO only. No full suite, 188-week campaign, package, native/Electron run, calibration tuning, baseline adoption, or reference repaint was performed or authorized. The ordinary-player `707` criterion remains unmet. Prior V3 exact-baseline evidence and the V4 `704` negative result retain their original scope; this review does not requalify or replace either result.
