# Continuation 4 movement campaign extraction

## Scope and result

This is a bounded read-only comparison of candidate `runs/apr1992_definitive_188w__0b1f040ff4abe835__w139_n41` against retained n40. It does not accept calibration, prove an internal writer branch, explain the original dirty n37 run, or close 188-week gaps.

- Runner exit: `0` (root-owned retained receipt).
- Initial comparison exit: `0`; verdict `PASS_BOUNDED_MOVEMENT_CAMPAIGN_COMPARISON`.
- Supplemental full temporal-control audit syntax exit: `0`.
- Supplemental full temporal-control audit exit: `0`; verdict `PASS_FULL_TEMPORAL_CONTROL_AND_PREFIX_AUDIT`.
- No tracked source, test, or documentation files were edited. No campaign, replay, test, or typecheck was run by this extraction task.

## Measured facts

- Candidate provenance is clean at `c43290677156767b7f9ba665bbc9f4d0d9b0282a`, with 139 weeks. Its consumed-input manifest and digest exactly match n40.
- Initial save SHA-256 is identical: `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`.
- Final save SHA-256 is identical: `d6715e9cefa14d0cf88b1af34d12c38c231186b6cf44cbb71e87636c0a6b04b9`; reported short hash is `d6715e9cefa14d0c`.
- All 139 ordinary weekly rows are equal after removing the new movement diagnostic fields.
- All 139 controller maps reconstructed from `initial_political_controllers` plus ordered control events through each completed turn are exactly equal. Both map trajectories hash to `b1bae54e8cacfbcb94d6d39fa8598540f69cf2d9583fa5d5b1f96f6f9b3f2eac`.
- All 173 ordered control-event objects through completed turn 139 are exactly equal.
- Reached checkpoint comparisons are identical: January 1993 is 707/712 and April 1994 is 707/712, with zero lost matches, zero gained matches, and zero candidate/baseline controller differences on reference OSIDs.
- All 11 protected-control points match the expected controller and n40.
- Prefix anomalies exactly match n40: 24 total, 0 critical, 3 warning, 21 info.
- Runner stderr has exactly two nonempty unresolved lines, both for `hrhb_travnik_brigade`; these are retained diagnostics and are not reported as critical anomaly rows.
- The movement diagnostic has 190 manifest entries, 190 phase receipts, and one terminal receipt at each completed turn 137, 138, and 139. Every report says `causal_proof: false`.

## Actor 737 phase boundaries

| Completed turn | Phase index and name | Measured before/after change |
| --- | --- | --- |
| 137 | none | No observed formation, movement-state, or order change. |
| 138 | 176 `final-distribute-brigades-to-front` | Order changes from absent to `{destination_sids:["op:bugojno:udurlije"], stance:"column"}`. Formation stays active RBiH, 3rd Corps, at Gornja Rovna; movement state stays absent. |
| 139 | 34 `osid-column-movement` | That order changes from present to absent. Formation location and movement state remain unchanged/absent. |
| 139 | 176 `final-distribute-brigades-to-front` | The same order changes from absent to present again. Formation location and movement state remain unchanged/absent. |

These snapshots establish the named phase boundaries that removed and recreated the order. They do not establish which internal branch executed.

## Source-bound interpretation and missing discriminator

`final-distribute-brigades-to-front` calls `distributeBrigadesToFront`. Within that call, six source locations can create a column order, owned by `disperseStackedRearBrigadesForSector`, `commitReserveToThreatenedFront`, `fillEmptyFrontSubsegmentsFromSectorReserve`, `deconflictSharedFrontOsidStacks`, `pinGarrisonToMustHoldFrontEdge`, and the main Phase B loop. The phase receipt cannot distinguish these candidates. The Phase B branch specifically requires an eligible, non-front, non-transit brigade; an allowed reachable front target; and `dist > 1 && dist <= 20`, but its pre-distribution candidate lists, front set, distances, and selected helper are not serialized.

`osid-column-movement` deletes an order on several rejection branches: missing/inactive/unsupported formation, unauthorized `dig_in`, missing location, invalid/equal destination, routine destination outside scope, or no friendly path. An accepted order writes `brigade_movement_state` before deleting the order. The measured removal with no movement state or location change therefore supports a rejection/deletion branch. It does not select the rejection reason. The final post-turn formation has `posture: "dig_in"`, which makes `posture_dig_in` a source-supported hypothesis, but it is not the phase-34 pre-input and cannot prove that branch.

The smallest discriminator is a bounded pre-branch receipt for actor 737 during these two implicated phases:

- In phase 34: formation existence/status/kind/posture, operation authorization outcome, location and destination validation, routine-scope predicate result, and friendly-path result/rejection reason.
- In phase 176: the internal helper identity plus its actor eligibility, front-membership/transit state, allowed candidate front OSIDs, selected target, computed distance, and boundary/allowed-destination predicate outcomes.

## Evidence

- `continuation4_movement_campaign_20261004_compare.json` and `.compare.log`, exit `0`.
- `continuation4_movement_campaign_20261004_full_control_audit.json` and `.log`, exit `0`; stderr log is empty.
- `continuation4_movement_campaign_20261004_runner.stderr.log` contains the two Travnik diagnostics.
- Initial helper SHA-256: `f593a7f4cc272e9f45cec92f2bc80a8a174033f16c176df97a84829fdDBE94C1` (case-insensitive hexadecimal).
- Initial comparison JSON SHA-256: `e1d62d7f503e1d390b32ae71306afa02f826582701bbe882fb563ef21bfacf27`.
- Supplemental helper SHA-256 before this summary: `131bd79dde335e006022960a179adfa8576b950afa849142c3e6dee3f4a6670f`.
- Supplemental JSON SHA-256: `555ed79c2453856ea7474e79bb2659ef626e4cd14c35be3012e0bbd49b275171`.
- Inspected source SHA-256 values: war phase reconciliation `2f62a89c0ac5a145fa7737930b015aab74ac976b0d2532cec45e63a0b792d0b6`; brigade front distribution `ef36c1d5882ec529a94024af0dcf3ca482d52645158cac5211049c2a3f19f755`; OSID column movement `a3600a86885ecd34bb976dd92e784c0f01fe8c1796d66bd2039cf5bae46a6489`.
