# Independent review: continuation 4 movement campaign n41

## Verdict

**GO to retain n41 as a bounded phase-attribution measurement; STOP without a gameplay correction, another campaign, or calibration acceptance.**

The retained evidence supports the narrow result that actor `arbih_737th_muslim_light` first changes within the completed-turn 137–139 observation window at completed turn 138, phase 176 `final-distribute-brigades-to-front`, where an Udurlije column order is created. At completed turn 139, phase 34 `osid-column-movement` removes that order without changing the observed formation location or creating movement state; phase 176 then creates the same order again. The receipts attribute these mutations to named phase boundaries. They do not identify the internal phase-176 writer or the phase-34 rejection reason.

No blocking evidence-integrity, canon, determinism, provenance, or process defect was found within this review's bounded scope.

## Reviewed scope and evidence

This review covers the single authorized 139-week n41 diagnostic run and its new comparison/extraction packet:

- `continuation4_movement_campaign_20261004_started.json`
- `continuation4_movement_campaign_20261004_run_identity.json`
- `continuation4_movement_campaign_20261004_compare.json`, `.compare.log`, and `compare_extract.cjs`
- `continuation4_movement_campaign_20261004_coverage.json`
- `continuation4_movement_campaign_20261004_full_control_audit.json`, `.log`, and `.exit.txt`
- `continuation4_movement_campaign_20261004_extraction_summary.md`
- `continuation4_movement_campaign_20261004_retained_rejection_complete.json`, its helper, logs, exits, and `retained_rejection_summary.md`
- `continuation4_movement_campaign_20261004_preservation.json`
- the implicated production source in `src/sim/turn_phases/war_phase_reconciliation_steps.ts`, `src/sim/combat/brigade_front_distribution.ts`, and `src/sim/combat/osid_column_movement.ts`

I reused the already accepted observer/reader preparation evidence and the unchanged n40/n39 acceptance evidence. I did not rerun a campaign, replay, extractor, consumer, test, suite, or typecheck.

## Evidence integrity and neutrality

- n41 is recorded at clean source commit `c43290677156767b7f9ba665bbc9f4d0d9b0282a`; the runner exited `0` and the strict coverage reader exited `0`.
- Coverage is complete for the requested actor and range: 26,410 receipts, 139 actor-turns, 190 named phases per turn, one terminal receipt per turn, with zero missing receipts and zero inconsistencies. Each report retains `causal_proof: false`.
- n41 and n40 consumed the same 30-input manifest and normalized input digest. Their initial save SHA-256 is `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`; their final save SHA-256 is `d6715e9cefa14d0cf88b1af34d12c38c231186b6cf44cbb71e87636c0a6b04b9`.
- All 139 weekly rows compare equal only after the comparison helper removes both `movement_phase_diagnostics` and `bot_order_diagnostics`. This is an ordinary-row comparison, not a claim of raw weekly-report byte equality or equality of the stripped diagnostics.
- The supplemental audit exited `0`. All 139 reconstructed controller maps and all 173 ordered control-event objects are exactly equal to n40. Reached checkpoints at completed turns 39 and 104 are each 707/712 with zero lost matches, zero gained matches, and zero controller differences on reference OSIDs. All 11 protected-control points match. Prefix anomalies are equal at 24 total: 0 critical, 3 warning, and 21 info.
- Runner stderr contains exactly two retained unresolved-formation lines for `hrhb_travnik_brigade`; these are not critical anomaly rows and do not affect the bounded actor-737 phase attribution.
- `continuation4_movement_campaign_20261004_preservation.json` exits `0` and binds 10 observer/source files, 6 parent artifacts, 7 protected sources, 6 retained runs, and 2 junctions. It also correctly preserves the known process limitation: the earlier untracked interim summary was overwritten and no original-byte recovery exists. Preservation is therefore adequate for this packet, but is not perfect across the full continuation history.

## Phase chronology and source-bound interpretation

The retained phase receipts establish this chronology:

| Completed turn | Named phase | Observed boundary change |
| --- | --- | --- |
| 137 | none | No formation, movement-state, or movement-order change for actor 737. |
| 138 | 176 `final-distribute-brigades-to-front` | Order changes from absent to `{destination_sids:["op:bugojno:udurlije"], stance:"column"}`. Formation remains active RBiH, 3rd Corps, at Gornja Rovna; movement state remains absent. |
| 139 | 34 `osid-column-movement` | The order changes from present to absent. Formation location remains Gornja Rovna and movement state remains absent. |
| 139 | 176 `final-distribute-brigades-to-front` | The same order changes from absent to present again. Formation and movement state remain unchanged. |

The phase-176 attribution is consistent with `war_phase_reconciliation_steps.ts:170-180`, where `final-distribute-brigades-to-front` calls `distributeBrigadesToFront`. That function contains six candidate column-order writer families at `brigade_front_distribution.ts:303-306`, `:412-415`, `:515-518`, `:629-632`, `:763-766`, and `:943-950`. The receipts do not serialize helper identity, pre-distribution candidate lists, front membership, transit state, selected distance, or the predicates needed to choose among those writers. The exact phase-176 writer remains **UNMEASURED**.

The phase-34 interpretation is also bounded correctly. `osid_column_movement.ts:512-632` deletes a pending order on multiple rejection branches, including missing/inactive/unsupported formation, unauthorized `dig_in`, missing location, invalid or equal destination, routine-scope rejection, and no friendly path. An accepted order writes `brigade_movement_state` at `:639-647` before consuming the order at `:658-660`. The observed order removal with unchanged location and absent movement state therefore supports a rejection/deletion path, but does not prove which rejection predicate fired. The final post-turn `dig_in` posture makes `posture_dig_in` a source-supported hypothesis only; it is not a serialized phase-34 pre-input and is not proof of that branch.

The retained rejection inventory adds a useful boundary. It inspected 36 target rows and exited `0`: 30 rows did not report `column_rejections`, six n39 rows reported nonempty arrays, and exactly one target-actor receipt exists. That receipt proves that **n39**, actor 737, completed turn 139 rejected the same Gornja Rovna-to-Udurlije order for `posture_dig_in`. It does not prove n41's reason because n41 is a different run and its completed-turn-139 `column_rejections` field is unreported. Unreported diagnostic coverage is not evidence of no rejection. The earlier 21-row extraction is preserved; the complete 36-row artifact supersedes it for this review.

The source already provides a default-off `movement_reject` channel with the exact rejection reason and relevant serialized context at `osid_column_movement.ts:298-328` and `:442-469`. If a later run is separately authorized, the smallest phase-34 discriminator is to enable and read that existing channel rather than add another observer. Phase 176 would still need helper identity and its candidate/predicate/distance inputs if internal writer ownership remains a required question. No source change follows from the current evidence alone.

## Claim limits and preserved gates

This review does not establish a shared cause or failing predicate, the cause of the original dirty n37 behavior, the complete turn-517 evaluator input tuple, or any later admission linkage. It does not promote a post-turn reconstruction into pre-order proof. Existing evidence about the n39 late-517 trajectory, towns/belt/Jajce/lost matches/Farz, and other later outcomes is reused without reinterpretation.

This result is not calibration acceptance. The literal 31-input provenance criterion remains failed and unwaived; the known 30-input common/current comparison remains a separate bounded fact. The 139-week run reaches only the completed-turn 39 and 104 checkpoints; future 156- and 188-week gates are unreached. Protected control/data/save boundaries, denominators, paint/control checks, Farz evidence, and all existing acceptance gaps remain in force.

## Review decision

Accept the measurement packet as the stopping point for this authorized run. It answers the phase-boundary question for actor 737 through completed turn 139, while honestly leaving internal writer identity and n41's rejection cause unresolved. Any further phase-34 measurement should reuse the existing `movement_reject` channel and requires separate authorization; the current packet does not justify a gameplay edit or another campaign.
