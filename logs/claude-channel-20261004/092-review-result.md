# [092] Jajce turn-188 roster and order evidence — independent review

## Verdict

**GO for the bounded authored-source, pipeline-order, and stored-endpoint facts, with the qualifications below. Calibration remains NO-GO.** The evidence supports a strong reconstruction that the two expeditionary brigades reached their authored turn-188 withdrawal boundary before sector-offensive order generation, while the retained artifacts do not capture the withdrawal action itself.

## Accepted finite facts

- `hv_112th_infantry_1995` and `hv_1st_hgz_1995` are authored `hv_phantom` formations with `withdrawal_turn: 188`. The bound withdrawal source is blob-identical at HEAD and clean `7b9c242a3`.
- In the inspected clean pipeline, `jna-phantom-withdrawals` precedes `reconcile-live-operation-truth` and `advance-sector-offensives`. The inspected withdrawal function removes a qualifying phantom from the first containing operation's participants and axes, marks it withdrawn/inactive, and deletes it from the formation registry.
- The endpoints fit that source path: both brigades are active through the prior retained temporal row, absent from the weekly-188 operation roster, and absent from the final registry. Weekly 188 contains only `hv_4th_guards_split` and `hvo_2nd_guard_mechanized`, with attack attempts `0` and aggregate eligible attackers `0`.
- The two surviving members have stored weekly-188 order decisions. The 4th Guards record is `objective_missing_or_friendly` with a null objective; the final Drvar axis is complete. The 2nd Guard Mechanized record is `in_transit_skipped` toward Bravnice; its temporal row with stored `turn = 188` records an in-transit column and that destination. The inspected clean/current producer branches terminate in defend/no attack behavior before an attack order is produced.

## Required qualifications

1. **Authored removal plus matching endpoints is a reconstruction, not a captured action.** No retained withdrawal event was found. The source path and order make withdrawal at the boundary the coherent explanation, but the review must not relabel it as an observed event or exact executed branch.
2. **The survivors' records explain the lack of their attack orders; `eligible_attacker_count = 0` remains an aggregate.** The individual order-decision rows are positive branch records, not per-brigade eligibility-rejection records. They support that neither survivor produced an attack order at weekly 188. They do not decompose the aggregate counter into individual rejection predicates or prove that every eligibility path was inspected.
3. **The exact order-detail write phase is not bound.** The clean pipeline receipt orders withdrawal before `advance-sector-offensives`, and the producer receipts identify the branches that create the two decision values. They do not show the precise clean call site connecting that generator to `advance-sector-offensives` or another pipeline step. Therefore the stored order-detail rows must not be described as proven writes during that named step. Their values and weekly association remain direct stored facts.
4. **Weekly and temporal indices have different meanings.** The weekly record is `week_index = 188`; the corresponding survivor temporal rows are stored with `week_index = 187` and `turn = 188`. They may be aligned by the explicit stored turn field, but they are not interchangeable phase labels or independent proof of the withdrawal call's exact intra-turn timing. The removed brigades' lack of a temporal `turn = 188` row is endpoint absence, not an action receipt.
5. **The launch-readiness detail is historical/stale with respect to weekly-188 membership.** It still names the removed 112th/HGZ while the same weekly operation roster and order details contain only the survivors. It therefore cannot be used as a current turn-188 participant, readiness, or pre-order input. The finite producer read is consistent with the worker's launch-time interpretation but does not establish every possible writer or serializer.
6. **Finite grep does not prove exhaustive writer, caller, reader, or serializer coverage.** The receipts show a direct producer/caller and no serializer hit in the searched source set. They cannot prove that no alias, indirect mutation, alternate serializer, or unsearched path exists.
7. **No schedule or collision cause follows.** The evidence does not show that the authored withdrawal caused the earlier two-week execution shift, that any roster collision caused it, or that either removed brigade would have attacked Lupnica or Barevo at turn 188. Those are unmeasured counterfactuals. The prior t186–187 `participant_attack_orders` identify HGZ within that retained operation output; they do not establish the complete attack universe. The evidence also does not justify changing the withdrawal date, canon, readiness, or operation schedule.

The bounded roster lane can stop. Reused 073 and 083–085 evidence remains qualified as previously reviewed; no fresh extraction changes the unresolved cause of the earlier schedule shift. Nothing here establishes a shared cause with Southern Move, 517, 737/Varošluk, towns, or the dirty-run matches.

## Review record

- Reviewed at HEAD `f405c7bdd7e4e108f2253b910664656eee60abda`.
- Inputs: `092-jajce-result.md` and the eight `092-jajce-*` primary receipt sets. All eight exits are `0`; the three nonempty stderr files contain only the Node `NO_COLOR`/`FORCE_COLOR` warning.
- Independent receipt files: `092-review-read.*` and `092-review-verify.*`.
- No source, canon, documentation, worker-report, test, run, replay, campaign, or remote action was performed.
