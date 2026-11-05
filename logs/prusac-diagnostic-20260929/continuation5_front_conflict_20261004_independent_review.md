# Independent review: focused front-distribution order conflict

## Verdict

**GO for the bounded source characterization and its three focused tests; STOP without a production correction, campaign, replay, or historical attribution.**

The fixture proves a real current-code mechanism in the isolated main Phase B path: `distributeBrigadesToFront` can issue a column order for an idle `dig_in` brigade, and a subsequent `processOsidColumnMovement` invocation rejects and deletes that order as `posture_dig_in` without changing location or creating movement state. With otherwise identical synthetic inputs and `defend` posture, the consumer starts transit. A brigade participating in the fixture's active operation receives no distribution order.

This is a deterministic synthetic characterization. It does not prove that main Phase B wrote n41's order, that n41 took the `posture_dig_in` rejection branch, or that this mechanism caused the original 517th behavior. No canon text reviewed here requires every T6 distribution writer to filter by posture, so the fixture does not establish a contract violation or justify a gameplay change.

## Fixture correctness and ownership

The test calls the real producer and consumer at `tests/front_distribution_order_conflict_diagnostic.test.ts:125-138`; it does not fabricate the movement order. The topology, formation, sector, and operation records at `:11-122` are explicitly synthetic and make no historical or territorial claim.

The main-path attribution is sound by construction. The actor is the sole primary brigade of a two-cell subsegment, starts off-front at a friendly location two hops from the selected empty front cell, is active and undisrupted, and has no movement state. Main Phase B collects it at `brigade_front_distribution.ts:817-824`, selects the deterministic allowed target at `:881-936`, and writes the order at `:943-950`. Later writer families see the already-produced order where their source filters apply or have no matching fixture preconditions. The test should therefore be described as isolating **main Phase B**, not as independently exercising all six writer families.

The controls are meaningful:

- The `dig_in` case runs twice from fresh state and compares the complete returned observation, then asserts the produced order, exact rejection reason/context, zero starts, one blocked order, absent resulting order and movement state, unchanged location, posture, and dig-in progress (`:147-172`).
- The `defend` case proves the same real producer output is accepted into transit (`:174-189`).
- The active-operation case proves this constructed main Phase B candidate is excluded before an order is written (`:191-200`). Source inspection, rather than this single fixture, establishes that all six families consult the common operation-participant set.

The fixture owns its state locally and resets both `AWWV_DEBUG_REASON_CODES` and the reason-code topic cache after each test (`:141-144`). Its `GameState` cast is appropriate for a narrow synthetic diagnostic because the exercised producer and consumer receive all fields they read. The retained final command exited `0` with one file and three tests passing; its test and log hashes match the summary (`a46a4b...` and `58aae317...`). No additional test run was needed for this review.

## Source, canon, and determinism

The producer uses stable ordering for sector/front/candidate selection and deterministic distance/tie-breaking. The fixture fixes adjacency, controllers, terrain, formations, sectors, and operation data, and its repeated result is equal. The test introduces no production or serialization change.

`MOVEMENT_AUTHORITY.md:14-19,34-42` places column execution at T3 and bounded local front repair at T6. Its routine-scope policy at `:57-74` preserves actual operation authority, while `:109-120` requires explicit delayed column movement for empty-sector relief and truthful `unstaffed_front` when no legal donor exists. `Systems_Manual_v0_9_0.md:203` likewise permits deterministic column orders for interior/reassigned brigades and requires unresolved staffing to remain truthful. These authorities support the characterization of cross-tier order churn, but they do not themselves impose a posture filter on every T6 local-distribution candidate.

The consumer behavior is explicit: `osid_column_movement.ts:553-571` rejects an unauthorized dug-in brigade before pathfinding and deletes its order; an accepted order writes transit state at `:639-647` and is then consumed at `:658-660`. The fixture demonstrates those branches against a real Phase B order.

## Writer-family inventory review

The six candidate order-write sites and the central conclusion are correct: all can emit the same column-order shape, so order shape cannot identify n41's writer. The n41 observer does not serialize the pre-write rosters, helper identity, candidates, occupancy, operation membership, selected target, or distance. Phase 176 also seals sector truth after distribution and phase 177 seals it again, so post-phase/post-turn rosters cannot be promoted to pre-write evidence.

Two table phrases need correction before the summary is treated as a precise predicate inventory:

1. `commitReserveToThreatenedFront` draws candidates from both `reserve_brigade_ids` **and** `rear_brigade_ids` (`brigade_front_distribution.ts:335-339`), not only `reserve_brigade_ids`. Its row should say "reserve or rear bucket."
2. `pinGarrisonToMustHoldFrontEdge` checks `entrenchment_turns < ENTRENCHMENT_REDISTRIBUTION_THRESHOLD` (`:721-744`). Its row should say "below the entrenchment redistribution threshold" rather than the broader "not entrenched."

Those wording defects do not invalidate the fixture or the bounded mechanism. The remaining table rows are suitable as source-derived candidate predicates, provided they are not described as actual n41 eligibility or executed branches.

One chronology phrase also needs tightening: production phase 34 precedes phase 176 in a turn, as n41 shows by issuance at completed turn 138 and consumption at completed turn 139. The summary's "immediately rejects" describes adjacent calls in the fixture, not same-turn production chronology. Use "the next `processOsidColumnMovement` consumer invocation rejects" or "the following completed turn in the measured n41 chronology."

## Claim limits and stopping point

The retained n41 receipts still attribute only the phase boundaries: phase 176 creates the Udurlije order at completed turn 138; phase 34 removes it without movement at 139; phase 176 recreates it. The n41 helper identity and rejection reason remain unreported. The n39 `posture_dig_in` receipt is exact for n39 only and cannot be transferred to n41.

The conditional post-turn suggestion that a rear-role actor would fit `fillEmptyFrontSubsegmentsFromSectorReserve` remains hypothetical because phase 176/177 sealing can change the rosters being inspected. The strongest n41 claim remains that one of six source writers created the order. The focused fixture proves main Phase B can produce the same class of churn under synthetic inputs; it is not historical proof.

Preserve the original 517th selector/order-lifecycle cause restriction and the required territory-moving suite/188-week gates. No posture filter, eligibility change, or production fix follows from this evidence. The bounded investigation should stop after integrating the three wording corrections above; any correction proposal requires a separately justified contract decision and the existing required validation gates.
