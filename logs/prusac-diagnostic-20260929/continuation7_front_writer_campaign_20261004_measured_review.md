# Continuation 7 front-writer campaign measured-evidence review

## Verdict

**GO — accept n42 as a bounded observational measurement.** The single authorized 139-turn run completed successfully and its retained receipts support the stated 737th-brigade turn-137–139 sequence. This verdict accepts the measurement package only. It does not accept a gameplay change, calibration result, causal explanation for the original dirty run, or any unreached late gate.

## Provenance and comparison

- Candidate: `runs/apr1992_definitive_188w__0b1f040ff4abe835__w139_n42`; baseline: retained n40.
- The runner exit is 0. The comparator independently requires commit `2a1554a50866af292b949d3668ae45aec4e861fa`, a clean run, and 139 weeks; all checks pass.
- Candidate and baseline consumed the same 30-input manifest with normalized digest `ed7fa30986392451f797708a5a0fe9d3ac83f284692be04e199305c533a1f0b6`.
- Raw `initial_save.json` SHA-256 is identical at `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`. Raw `final_save.json` SHA-256 is identical at `d6715e9cefa14d0cf88b1af34d12c38c231186b6cf44cbb71e87636c0a6b04b9`.
- All 139 normalized ordinary weekly rows and the control-count trajectory match n40. This is scoped normalization: the explicitly requested diagnostic topics and nested rejection field are excluded, while ordinary null/presence and other fields remain compared.
- The front-writer coverage reader exits 0 with 139 actor-turn rows, 278 invocations, 41 writes, no inconsistencies, and no missing expected boundaries. Its own `causal_proof` value remains `false`.

## Actual 737th-brigade receipts

The following facts were checked both in the comparator extraction and directly in n42 `weekly_report.jsonl`:

- Completed turn 137: both production call sites are reported. Each has `write_count: 0`; the actor has no reported front-distribution write and the reported movement-rejection array is empty.
- Completed turn 138: the ordinary call has no write. `final-distribute-brigades-to-front` records one `empty_front_subsegment_fill` `column_order` write to `op:bugojno:udurlije`, at `pre_write` with `post_selection_pre_write` inputs. Distance and score are 6; active pool is 8, frontline width 5, max hops 20, and the subsegment is `subseg:sector:arbih_3rd_corps:1:0`. The immediate snapshot shows location `op:busovaca:gornja_rovna`, movement order absent, movement state absent, rear membership in `sector:arbih_3rd_corps:1`, and no operation participation.
- Completed turn 139: the weekly row reports a movement rejection for the same actor from `op:busovaca:gornja_rovna` to `op:bugojno:udurlije` with reason `posture_dig_in`. The ordinary front-distribution call has no write. The final call records the same helper, target, distance/score, feature counts, rear/nonparticipant status, and absent immediate pre-write order/state as turn 138, then emits one column-order write.

These receipts identify the actual helper and the available immediate post-selection/pre-write values in this clean n42 run. They do not serialize every comparator input or earlier local mutation; the receipt explicitly says `prior_mutations_in_invocation_possible: true`. The turn-139 rejection is an actual n42 fact and no longer relies on transferring n39's reason, but the evidence does not prove that this branch or helper caused the original dirty-run behavior.

## Control and preservation gates

- Full control audit exit 0: all 139 reconstructed controller maps match; all 173 ordered control events match exactly; reached checkpoints 39 and 104 remain 707/712 with no gained or lost matches; all 11 protected controls match; anomaly reports match at 0 critical, 3 warning, and 21 info.
- Runner stderr has exactly the two retained unresolved HRHB Travnik lines and no additional unresolved category in the control audit.
- Preservation/inventory exit 0: 11 accepted source bindings, 119 parent artifacts, six retained earlier runs, two intact junctions, and an empty protected-boundary diff.
- The disclosed preservation exception remains: this turn's earlier worker preflight source/command/log/exit and pre-refactor comparator/helper summary were overwritten. The available tool readback is not original-byte recovery. Current helpers and the fresh root preflight are hash-bound, and the parent raw run directories remain present.

## Claim limits and stop

This package does not prove the original dirty n37/517th pre-order cause, later 737th admission, Jajce or the four retained losses, the n40 literal-31 provenance criterion, the late-188/Farz/HV gates, or full calibration acceptance. No gameplay defect or corrective gameplay predicate follows from this measurement alone. The authorized campaign has been consumed; no rerun is justified by this review.

No simulation, comparator, control audit, test, or source command was rerun during independent review. The review only read retained artifacts and wrote these new review files.
