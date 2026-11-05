# [091] Southern Move endpoint intel snapshot — independent review

## Verdict

**GO for the bounded endpoint facts and conditional arithmetic, with the corrections below. Calibration remains NO-GO.** The retained post-turn-188 snapshot supports a positive objective-to-enemy-sector mapping and a mapped-sector maximum confidence of `max(0.245, 0.11) = 0.245`. The stored operation has no `commander_officer_id`; under the inspected current/clean-matching preparation source, a call on that stored operation would therefore use competence `3` and aggressiveness `3`, producing `0.6 - 3*0.06 + 3*0.04 = 0.54`. Thus `0.245 < 0.54` if the confidence comparison is reached with those snapshot values.

## Accepted finite evidence

- The retained endpoint is `meta.turn = 188`. Its operation sector is `sector:hvo_tomislavgrad:1`, and `commander_officer_id` is absent from the operation keys.
- The five stored objectives map positively under the inspected selector: Majdan, Podrasnica, Mrkonjic Grad, and Bjelajce each have one first match in `sector:vrs_1st_krajina:8`; Baljvine has one first match in `sector:vrs_1st_krajina:9`.
- The corresponding endpoint sector-intel confidences are `0.245` and `0.11`, both with `last_updated_turn = 188`, so the selected maximum is `0.245`.
- The inspected preparation source uses defaults of competence `3` and aggressiveness `3` when `getOpsCommander` returns no commander, and its threshold formula gives `0.54` for those defaults. The relevant source blobs in the worker receipt match the stated clean source bindings.

## Required corrections and limits

1. **The threshold comparison is conditional, not a captured t188 execution.** In the inspected `intel_gathering` path, an unresolved `active_probe` causes an early return before current confidence is read and compared. The endpoint arithmetic therefore shows that the comparison *would be red if reached after the probe wait clears with the same inputs*. It does not show that the confidence predicate executed on turn 188.
2. **Do not claim that every possible commander has a threshold of at least `0.34`.** The inspected comments/examples do not establish the complete allowed range of competence and aggressiveness. The `0.54` result is supported for the actual absent-commander/default case; the universal range claim is not.
3. **The finite text search is not an only-writer or all-callers proof.** It identifies `assignOperationCommander` as the visible direct assignment and a finite set of textual references, but it does not exclude dynamic mutation, aliases, serialization paths, or unsearched callers. The direct endpoint fact remains that this stored operation lacks the field, so the inspected helper's defaults apply if it evaluates that operation.
4. **`active_probe.started_turn = 188` is an endpoint field, not complete ordering evidence.** Without a bound producer/call trace or complete event/writer capture, it does not prove the exact intra-turn write, the writer/caller, or that every earlier probe was resolved, cleared, or absent before this record.
5. **Post-turn-188 intel does not bind earlier decision inputs.** `last_updated_turn = 188` and the final values do not establish the values seen at earlier ticks or a historical cause. No pure-helper execution was captured in this lane.

This closes the endpoint-intel lane without tuning, correction, observer, or campaign work. A subsequent bounded Jajce review should reuse the already reviewed 073/western-actor evidence and inspect only the finite roster-removal/eligible-output producer; it should not repeat the 185–188 extraction. Nothing here establishes a shared cause for the 517/737/Jajce/town issues, and no production contract violation or calibration acceptance follows.

## Review record

- Reviewed at HEAD `cf01ebd001c32b791ab6b3be0489f644ead0fc75`.
- Inputs: `091-intel-result.md` and the `091-intel-{source,extract,commander}` receipts; all three worker receipt exits were `0`.
- Independent read and verification receipts: `091-review-read.*` and `091-review-verify.*`.
- No source, documentation, worker-report, or test files were edited; no test, simulation, replay, campaign, or remote action was run.
