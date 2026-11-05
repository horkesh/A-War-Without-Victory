# [094] Stari Majdan retained battle-tuple gate — independent review

## Verdict

**GO for the finite artifact inventory and brigade-history joins, with the corrections below. Calibration remains NO-GO.** The inspected retained artifacts do not expose an exact resolver-time power/modifier tuple or the order-time predictor's selected defender set for the turn-188 Stari Majdan battle. They add post-combat evidence of one 506th attacker engagement record and at least three defender engagement records sharing the battle ID, but they do not classify the `1.296` versus `0.93` difference.

## Accepted finite facts

- The corrected AAR search found no `Operation Sana` entry among the 62 retained finalized AAR records. Reused endpoint evidence shows the operation still in `execution` at final turn 188. This is an active-operation/no-retained-finalized-AAR result for this run, not global absence.
- The weekly rows positively contain both the turn-187 control battle and the turn-188 Stari Majdan battle. Their battle schema includes the summarized `power_ratio`, outcome, casualties, named attacker and one named `defender_brigade`, but no serialized strength/modifier tuple.
- In `final_save.json`, the turn-188 battle ID occurs in four brigade-history engagement records: the 506th attacker plus matched defender-role records for the 15th Biha, 17th Ključ, and 3rd Petrovac brigades. Their stored casualties reconcile: defender inflicted values `116 + 51 + 37 = 204` equal the attacker's casualties taken, while defender casualties taken `0 + 7 + 5 = 12` equal the attacker's casualties inflicted.
- The turn-187 control battle ID occurs in the 506th attacker history, one matched 17th Ključ defender history, and one control-event record. This verifies the search path and a positive neighboring battle.

## Required corrections and limits

1. **The tuple result is finite to the inspected artifacts and representations.** No exact battle-associated resolver or predictor tuple was found in `operation_aars.json`, the inspected summary/report artifacts, the weekly battle row, or the matched final-save engagement records. Finite exact-string and key searches do not prove that no equivalent data exists in every artifact, alias, encoding, writer, or serializer.
2. **No Sana AAR is not a global no-AAR claim.** The retained AAR file has no Sana entry while the final endpoint has Sana active. This does not establish what another run, later finalized state, alternate artifact, or unsearched serializer would contain.
3. **The brigade-history records are post-combat summaries.** Their shared battle ID, roles, outcomes, and reciprocal casualty sums do not reconstruct resolver power, the full defender set considered by combat, the predictor's selected set, or any pre-order input. The finite projector grep identifies a direct engagement-history writer but is not an all-writers proof.
4. **Use “at least three matched defender records,” not a complete three-defender participant set.** A zero-casualty or otherwise unrecorded participant is not excluded by this evidence. Likewise, the turn-187 control has one matched defender history record; it does not prove that the complete resolved participant set contained exactly one defender.
5. **The one-versus-three forecast explanation is unproved.** The weekly battle row's singular `defender_brigade` field does not establish which defender set the order-time predictor used, and the worker did not inspect the resolver aggregation or predictor selection. A predictor selecting one defender while resolution aggregates three is a concrete hypothesis for a future trace, not a finding or causal explanation.
6. **The `1.296` and `0.93` values remain different-stage summaries.** Without the two input tuples and selected sets, their difference is neither a defect nor demonstrated ordinary variance. No equality, mismatch, or production-contract conclusion follows.
7. **The observer outline is only a proposal.** Default-off behavior, stdout-only output, deterministic ordering, save/hash equality, and absence from normal artifacts are desired acceptance properties that have not been prepared or verified. No observer, helper, test, or run is authorized by this review. A full 188-turn run is neither granted nor established as inevitable; any future plan must first assess retained checkpoints or cheaper reproduction and obtain owner authority for the smallest necessary run.

Nothing here supplies a dirty 517 cause, a shared Jajce/737/Varošluk cause, a tuning basis, or an acceptance change. The first missing premise remains the paired order-time and resolver-time selected sets and power/modifier terms for the same attack.

## Review record

- Reviewed at HEAD `378067760a033418acf4ee9b242d1e87bfc2b152`.
- Inputs: `094-battle-result.md` and the five `094-battle-{aar,aar-v2,other,paths,projector}` receipt sets.
- Exits: initial `aar = 1` from the preserved regex syntax error; corrected `aar-v2 = 0`; `other = 0`; `paths = 0`; `projector = 0`. Nonempty stderr for successful Node reads contains only the `NO_COLOR`/`FORCE_COLOR` warning.
- Independent receipts: `094-review-read.*` and `094-review-verify.*`.
- No source, documentation, worker-report, helper, test, simulation, replay, campaign, observer, or remote action was performed.
