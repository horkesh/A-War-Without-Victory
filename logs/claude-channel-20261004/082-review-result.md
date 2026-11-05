# [082] Independent review — retained Mistral caller-gate diagnosis

**Verdict: GO_CONDITIONAL_DIAGNOSIS_WITH_CORRECTIONS.** The retained n43 evidence and unchanged source chain support the conditional conclusion that the opening-readiness aggregate was held by `anyApproaching` on turns 177-179 and released when both axes classified executable on turn 180. This is a deduction from fresh per-axis detail, the persisted planning outcome, and the caller's control flow. It is not a captured aggregate/per-axis branch receipt. The report must correct its timeout and roster exclusions and must not present Bosansko Grahovo approach-set membership or gate-time transit as measured.

Calibration remains NO-GO; n42 observational GO remains; literal 31 remains OPEN; dirty-517 attribution and every historical/town/match acceptance boundary remain untouched.

## Reviewed material and exact exits

- `082-diagnosis-result.md`, SHA256 `8e39731a48c1e11421a63161ca3d700949f10592c92a7aed18c77958a9f06f5d`.
- `082-diagnosis-extract.*`: exit 0; seven weekly rows, 28 temporal rows, two final axes. Extract JSON SHA256 `27214a95166bd72076a3dfa4cfb611c4776494e57cb593d4035f0f07173726d3`.
- `082-diagnosis-control.*`: exit 0; reconstructed controller history for the seven named OSIDs. Control JSON SHA256 `32cef122cee262b4251aed0a381e8d992aa107efb575de2f746cc5c0a1611530`.
- `082-diagnosis-blobs.*`: exit 0; five reported gate-chain files have identical n39, n42, current-HEAD, and worktree blobs. Blob stdout SHA256 `113cb4931f9c17e36dfaac8cbcaf40a594a48538bd1f3fb3a3e0b63872e64b13`.
- Independent focused reads all exited 0: production `require_all_axes_ready` write/deletion inventory; readiness call sites and ordering; `launch_readiness_detail` writer/clear paths; full turn-177-through-180 extracted axis details; approach-set/front-edge fallback source; timeout writes and caller floor reads; TG-ready mutation path; retained receipt commands/exits/hashes.
- Review base: current docs-only `HEAD 172f397d6e9e6be19aff0a872b12872b2be154d2`; the five reviewed simulation blobs equal the n43 source at `56bc584e5`. No comparator, test, simulation, replay, source change, or prior review was rerun.

## Source binding and freshness

The blob receipt establishes unchanged code for `sector_offensive.ts`, `sector_offensive_launch_helpers.ts`, `sector_offensive_axis_helpers.ts`, `operation_preparation.ts`, and `tactical_group_config.ts` across clean n39, n42, current HEAD, and the worktree. The diagnosis correctly limits this claim: front-edge construction, synchronized-brigade selection, combat math, alliance/friendly-control helpers, and other transitive dependencies were not comprehensively bound.

The per-axis details are fresh for turns 176-180. `classifyAxisOpeningAttack` deletes `axis.launch_readiness_detail` at entry and rewrites it under the enabled `axis_reject` topic (`sector_offensive_launch_helpers.ts:1109-1113`, `:1192-1236`). Values change across turns, including Sipovo power ratios 20.535, 26.027, 30.813, and 42.529. The unchanged turn-180 detail visible again at turn 181 is expected because execution no longer re-enters the planning classifier.

## Premise review

### P1 — `require_all_axes_ready` absent

**Supported.** Production search finds the field written only by operation construction when an authored definition supplies literal `true` (`corps_operation_helpers.ts:296-324`); the only production definition found with `true` is Operation Cerska-Kamenica (`triggered_operations.ts:315-335`). There is no production assignment after creation and no deleter. Mistral's final serialized operation reports the field absent. Under the unchanged source chain, absence at turn 181 therefore supports absence during turns 175-180. Tests that assign the field are not runtime writers.

This is a static immutability inference plus final-state observation, not a gate-time field receipt.

### P2 — participant gate passed before opening-readiness detail

**Supported for turns 176-179.** At these elapsed values, the early invalidation call at `sector_offensive.ts:1448` is not reachable because it requires elapsed greater than planning duration plus grace (`4 + 2`). The planning launch call to `evaluateOpeningAttackReadiness` at `:1650` occurs only after the second `areParticipantsReadyForExecution` check at `:1637-1649` passes. Fresh `launch_readiness_detail` proves the classifier was reached. Thus the participant check did not take its hold path on those turns.

The receipt captures the downstream per-axis classifier detail, not the participant boolean itself. The source ordering makes the inference valid.

### P3 — approaching membership

**Only the aggregate/per-axis veto is conditionally inferable; the specific membership story is unproved.** On turns 177-179, Sipovo is freshly classified executable while Drvar is freshly classified non-executable, and the operation persists in planning. With P1, `evaluateOpeningAttackReadiness` can return executable only when `anyExecutable && !anyApproaching`; therefore the unchanged source plus persisted outcome implies `anyApproaching === true` (`sector_offensive_launch_helpers.ts:1392-1429`). Drvar is the sole non-executable live axis, so its classifier result must be the contributing approaching result.

Neither `anyApproaching` nor the per-axis `approaching` field is serialized in the retained artifacts. The inference does **not** establish which Drvar brigade matched, which destination was present at gate time, or that `op:bosansko_grahovo:bosansko_grahovo_2` belonged to the friendly approach set at that moment.

The supporting temporal rows are post-turn. They show the 112th and 4th Guards in transit to Bosansko Grahovo after turns 177-179; they do not capture movement state/destinations at the earlier readiness decision. `gate_adjacent:2` also does not prove friendly approach membership: the executability count uses the wider opening-attack adjacency, while `approaching` uses the friendly-filtered `collectObjectiveApproachOsids` set (`sector_offensive_launch_helpers.ts:1183-1209`, `:1270-1277`, and the known-gap explanation at `:1383-1390`).

## Required corrections to the branch table

### Timeout / anti-paralysis

The diagnosis overstates exclusion B when it says the caller never reads the timeout result. `tickPreparation` writes `op.force_ratio_estimate` on the timeout branch (`operation_preparation.ts:940-961`), and the caller reads that field at both launch floors (`sector_offensive.ts:1552-1559` and `:1667-1674`). In this run the measured pre-timeout value 18.61 and timeout value 1 are both above Mistral's 0.15 floor, so the **force-ratio floor did not release the operation**. That measured comparison is the valid exclusion.

The timeout path also calls `formTgsAtReadyTransition`. The helper is intended to be idempotent, and Mistral first reached ready on turn 176, but the retained diagnosis does not carry a direct turn-180 no-mutation receipt for every state that readiness consumes. Therefore state only that the timeout and execution transition are separate writers and that the timeout's FR rewrite did not change the floor verdict; do not categorically exclude every indirect same-turn contribution.

### Roster change

The diagnosis overstates exclusion G. Turn-180 `launch_readiness_detail.brigades` identifies the brigades considered by `axisHasExecutableOpeningAttack`; it is not a serialization of each axis's full gate-time `assigned_brigades`. The classifier may use `getSynchronizedOperationBrigadesAtObjective` as `convergingBrigades`, further narrowing the executability pool (`sector_offensive_launch_helpers.ts:1393-1410`). The weekly four-participant roster and final Sipovo assignment are post-turn artifacts.

It is valid to say the 2nd Guard Mechanized was **not present in the retained turn-180 considered-brigade detail** and was not needed for the two recorded executable classifications. It is not valid to conclude from that detail that the brigade was added only after the gate or was absent from the gate-time assigned roster.

### Decision-time versus post-turn state

The diagnosis generally acknowledges this distinction, but its branch-table support and P3 prose still use post-turn transit as though it identified gate-time membership. Keep those rows as consistency evidence only. They cannot name the brigade/destination that made `approaching` true at decision time.

## What is retained and what is inferred

Measured retained evidence:

- turn 176: both axes non-executable; operation remains planning;
- turns 177-179: Sipovo executable, Drvar non-executable, operation remains planning;
- turn 180: both axes executable and operation transitions to execution;
- the per-axis considered-brigade facts and changing prediction ratios;
- post-turn movement and roster snapshots;
- control-event reconstruction for the named OSIDs.

Conditional source-chain inference:

- the participant gate passed before each retained classifier detail;
- `require_all_axes_ready` was absent at the decision;
- the turn-177-through-179 aggregate opening result was held by `anyApproaching` and Drvar was its only possible contributing non-executable axis;
- turn 180 satisfied the ordinary opening-readiness aggregate because both axes classified executable.

Not established:

- a directly captured aggregate or per-axis approaching branch;
- exact gate-time approach-set membership, transit destination, full assigned roster, or synchronized/converging pool;
- whether every timeout-side mutation was irrelevant to turn-180 readiness;
- historical plausibility, a gameplay defect, a retarget/fix, later-turn acceptance, or any dirty-run attribution.

## Cheapest next discriminator

The proposed read-only graph reconstruction from retained controllers plus the static contact graph is under-specified as direct proof. `collectObjectiveApproachOsids` first consumes gate-time `war_front_edges_osid` adjacency, filters it through static adjacency and political/friendly-alliance state, and may fall back to gate-time `corps_front_sectors[*].sub_segments` before its static-graph fallback (`sector_offensive_launch_helpers.ts:393-469`). Exact `approaching` also needs gate-time movement destinations and the actual assigned/converging brigade pool. Those gate-time inputs are not all retained for turns 177-179; post-turn temporal rows cannot substitute for them.

Therefore do not authorize a controllers-plus-static-graph reconstruction as a branch proof. At most it would be labelled a reconstruction hypothesis after inventorying every required input and stopping when any gate-time input is absent. The smallest direct discriminator, if the owner later authorizes another run, is the existing opt-in axis-readiness diagnostic for aggregate `anyApproaching`/`held_by_approaching`; exact P3 membership would additionally need the approach OSID set and per-axis approaching brigade IDs recorded at the readiness call. No such run or reconstruction was performed here.

## Findings

- **Blocking for an unconditional/direct-capture claim:** P3's exact Bosansko Grahovo membership and gate-time transit are not retained; the diagnosis cannot be promoted to a captured-branch result.
- **Nonblocking for the conditional diagnosis:** correct the timeout-read and roster-timing exclusions as described above.
- **Accepted conditional result:** “Under unchanged source, absent `require_all_axes_ready`, and fresh downstream classifier detail, turns 177-179 were held by the opening-readiness `anyApproaching` condition; Drvar was the only possible contributing axis. The exact gate-time member/destination is unobserved.”

No worker report, raw receipt, source, documentation, channel, commit, or run artifact was modified. Only this new ignored review result was added.
