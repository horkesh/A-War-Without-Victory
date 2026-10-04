# Focused front-distribution order-conflict diagnosis

## Verdict

The real producer-to-consumer fixture establishes a deterministic mechanism: the main front-distribution Phase B writer can issue a column order for an idle `dig_in` brigade, and `processOsidColumnMovement` immediately rejects and deletes that order as `posture_dig_in` without movement. The same producer output starts transit when the posture is `defend`. An active-operation participant is excluded before repair distribution writes an order.

This is a characterization of current source behavior, not a failing contract test or proof of the n41 internal branch. No production correction is authorized or proposed from this synthetic fixture alone.

## Six writer families

| Writer family | Required predicates relevant to an order write | n41 discriminator coverage |
| --- | --- | --- |
| `disperseStackedRearBrigadesForSector` | Sector has non-front friendly territory targets and at least two rear-owned brigades; actor is active, located, supported kind, rear-owned, off-front, non-operation, non-disrupted, not in transit; its rear OSID is stacked; an empty allowed non-front territory target is reachable within 20 hops and farther than the direct-repair threshold. | Pre-phase rear bucket, stack, target pool, occupancy, route and distance are unreported. |
| `commitReserveToThreatenedFront` | Standing-OG reserve commit enabled; threat ratio at least 1.5; actor is in `reserve_brigade_ids`, active, located, supported kind, non-operation, non-disrupted, not in transit and has no order; target subsegment is threatened and has friendly/enemy OSIDs; allowed affinity target is reachable within 20 hops and farther than one hop. | Feature value, pre-phase reserve bucket, threat selection, affinity, occupancy, route and distance are unreported. |
| `fillEmptyFrontSubsegmentsFromSectorReserve` | Sector has active assigned/reserve/rear pool and an underfilled subsegment; actor comes from that pool, is active, located, supported kind, off every sector front, non-operation, non-disrupted, not in transit and has no order; an empty friendly allowed target is reachable within the configured bound and farther than one hop. | Pre-phase pool/subsegment rosters, staffing count, occupancy, operation membership, route and distance are unreported. |
| `deconflictSharedFrontOsidStacks` | Actor is assigned to a sector and located on a front OSID shared by active formations claimed across multiple sectors; it is non-operation, non-disrupted, not in transit and has no order; an empty allowed target on its claimed front is reachable within 20 hops and farther than one hop. | Pre-phase sector claims, shared stack, assignment, occupancy, route and distance are unreported. |
| `pinGarrisonToMustHoldFrontEdge` | A same-corps must-hold target is configured, friendly and undefended; actor is active, located, supported kind, non-operation, at least 400 personnel, non-disrupted, not entrenched, not in transit, without an order and destination-eligible; target is reachable within 20 hops and farther than one hop. | Pre-phase must-hold map, occupancy, personnel/entrenchment at the writer boundary, route and distance are unreported. Post-turn n41 has no 3rd Corps must-hold entry but cannot reconstruct earlier input. |
| Main Phase B loop in `distributeBrigadesToFront` | Actor is a primary brigade of a subsegment with at least two front OSIDs, not inactive, non-disrupted and non-operation; actor is off that front and not in transit; at least one allowed non-island friendly/corps target exists; selected distance is 2–20 hops. | Pre-phase primary roster, front set, operation membership, target pool and distance are unreported. The synthetic fixture isolates this writer by construction. |

All six families can write the same `{destination_sids:[target], stance:"column"}` shape. Order shape therefore cannot identify the writer.

## Run-bound n41 limits

Measured n41 facts remain: actor 737 has no observed change at completed turn 137; phase 176 creates the Udurlije order at 138; phase 34 removes it without movement state or location change at 139; phase 176 recreates it at 139. The n41 rejection field is unreported.

The post-turn t139 state places actor 737 active and `dig_in` at Gornja Rovna, with rear role in `sector:arbih_3rd_corps:1`; Udurlije is a friendly front OSID in that sector, and the post-turn must-hold map has no 3rd Corps entry. If these were the exact pre-distribution inputs, `fillEmptyFrontSubsegmentsFromSectorReserve` would be the only listed family structurally compatible with a rear-pool actor and a front destination. They are not the exact pre-distribution inputs: phase 176 calls distribution and then `sealFinalSectorTruthFromCurrentSectors`, which can reconcile roster buckets and subsegment assignments, and phase 177 seals them again. The observer does not snapshot those rosters or writer predicates. The conditional narrowing cannot be promoted to actual helper attribution.

The strongest supported negative claim is: retained n41 artifacts do not discriminate the phase-176 internal writer. They prove only that one of the six writer sites in the real phase call wrote the order. A smallest sufficient discriminator would record the selected writer family plus the actor's pre-write sector bucket/subsegment, operation participation, occupancy/stack state, target pool, selected target and computed distance.

## Contract assessment

`MOVEMENT_AUTHORITY.md` assigns front distribution to T6 bounded local repair and column movement to T3 execution. The Systems Manual permits deterministic column orders for interior and reassigned brigades and requires truthful `unstaffed_front` when donor commitments block staffing. The movement authority contract also preserves operation authority, restricts ordinary line movement to its assigned subsegment, and requires empty-sector donors to be free of `dig_in` and operation commitments.

The source already protects operation participants in every writer family. The focused control confirms that protection for the real distributor. The main Phase B producer does not test posture, while T3 deliberately vetoes unauthorized `dig_in` movement. That is a real cross-tier order-churn mechanism. Current governing text does not explicitly say that every local-distribution candidate must be filtered by posture, so this fixture alone does not establish a violated canonical contract or authorize changing eligibility. Any selector/order-lifecycle correction remains subject to the original 517th cause restriction and territory-moving validation gates.

## Focused fixture and evidence

The new test uses the real `distributeBrigadesToFront` and `processOsidColumnMovement` functions. Its primary chain does not fabricate a movement order. The topology, formation, sector and operation data are explicitly synthetic and make no historical or territorial claim.

- Initial focused run: exit `0`, 1 file and 3 tests passed; tests took 11 ms.
- Final focused run after explicit fixture type annotations: exit `0`, 1 file and 3 tests passed; tests took 11 ms.
- Unchanged production test files were not rerun; their existing evidence is reused.
- No production source, canonical documentation, campaign, replay, full suite, or manual typecheck was changed or run.

Evidence paths:

- `tests/front_distribution_order_conflict_diagnostic.test.ts`
- `continuation5_front_conflict_20261004_newfile.log` and `.exit.txt`
- `continuation5_front_conflict_20261004_newfile_final.log` and `.exit.txt`

Hashes:

- Test: `a46a4b082f86c06e5c2d62c07d921ed7204a069a3172ff3e2e52665fdf56d1b3`.
- Final focused log: `58aae317665b5c4708b862d0713453b0917e02ffd79703be1a3dce4131ead714`.
- Front distribution source inspected: `ef36c1d5882ec529a94024af0dcf3ca482d52645158cac5211049c2a3f19f755`.
- Column movement source inspected: `a3600a86885ecd34bb976dd92e784c0f01fe8c1796d66bd2039cf5bae46a6489`.
- Final sector seal source inspected: `156cd47f10c7057d7795552425bb13628bc598d73653635628a6a1ffcd22e255`.
