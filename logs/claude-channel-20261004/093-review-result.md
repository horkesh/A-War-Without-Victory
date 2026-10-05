# [093] Sana axis Stari Majdan endpoint — independent review

## Verdict

**GO for the finite turn-188 battle, positive order, serial-axis, and endpoint facts with the qualifications below. Calibration remains NO-GO.** The retained clean n39 evidence records a 506th Mountain order against the current Stari Majdan objective, an associated battle with stored ratio `0.93`, `stalemate`, and `attacker_won: false`, and an end state that remains on Stari Majdan with Sanski town next.

## Accepted finite facts

- At weekly turn 188, `arbih_506th_mountain` has a positive `direct_attack` order-generation detail for `op:sanski_most:stari_majdan`, with order-time assessed ratio `1.295851859441795` and predicted `costly_victory`. The associated `participant_attack_orders` row marks that target as the current objective.
- The retained turn-188 battle against Stari Majdan records the 506th as attacker, the 15th Biha infantry as defender, stored battle ratio `0.93`, outcome `stalemate`, and `attacker_won: false`.
- The authored and stored Sana axis is sequence-preserving. Stari Majdan is index 6 and Sanski town is index 7. At the end of turn 188, the axis remains executing at index 6; `consecutive_failures_on_current` is `1`, Stari Majdan remains RS-controlled, and Sanski town remains RS-controlled.
- In the bound source, `0.93` lies in the stalemate band (`0.7 <= ratio < 1.0`), so the stored ratio and stored outcome are threshold-consistent. This is a consistency check, not an execution trace.

## Required qualifications

1. **Do not universalize a capture-only advance rule.** The clean source also advances an axis after `MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 3` unsuccessful objective battles. The actual endpoint is below that threshold at `1` and stays at index 6, so no failure skip occurred by the retained endpoint. The bounded conclusion is that Sanski town remained the next objective after unresolved Stari Majdan at the horizon, not that capture is the only possible way to reach it.
2. **The retained evidence proves one turn-188 Stari Majdan battle and positive order, not a complete-history uniqueness claim.** The compact extraction covers turns 186–188. It does not by itself prove that this was the only Stari Majdan attack anywhere in the full horizon or the complete attack universe.
3. **Order-time assessment and post-combat state are different phases.** The positive turn-188 order detail establishes the pre-combat target and assessment. Weekly `current_objectives` and the final axis index/controller are post-combat endpoint facts. The turn-187 weekly row showing Stari Majdan cannot alone establish the preceding pre-order value; the positive turn-188 order does that work here.
4. **Threshold consistency is not exact resolver-call proof.** The stored battle ratio is reported as `0.93`; the bound source would classify a ratio in that band as stalemate absent the surrender branch. The receipts do not preserve the exact unrounded value passed to `classifyOutcome`, an executed-branch trace, or the resolver's complete input tuple. Therefore they support consistency, not exact numerical replay.
5. **The predictor/resolver difference remains unclassified.** `1.295851859441795` is the order-generation assessment and `0.93` is the stored battle ratio. The receipts lack the attacker/defender power terms, terrain, supply, fatigue, reinforcement, and modifier inputs needed to compare the two computations. The gap is neither a proven defect nor proven ordinary variance.
6. **Missing `territory_flipped` is not standalone no-capture proof.** The no-capture conclusion is supported jointly by `attacker_won: false`, `stalemate`, the final index remaining 6, and Stari Majdan remaining RS-controlled. Field absence alone would be insufficient.
7. **Finite searches are not exhaustive serializer or writer proofs.** Missing power terms in these inspected rows means unreported in this bounded evidence, not absent from every artifact or path.

No dirty 517 cause, shared Jajce/737 cause, tuning lever, route change, date change, readiness change, or production contract violation follows. The first missing causal premise for the `1.296` versus `0.93` difference remains the resolver-time input tuple; this review does not authorize a receipt change or run.

## Review record

- Reviewed at HEAD `7803cb584d2395208477d47e1740f8f4ae9955d4`.
- Inputs: `093-sanski-result.md` and the five `093-sanski-{reuse,weekly,weekly-v2,ladder,source}` receipt sets, plus one narrow clean-source context read for the failure-advance predicate omitted from the worker's grep excerpt.
- All five worker exits are `0`. Four stderr files contain only the Node `NO_COLOR`/`FORCE_COLOR` warning; source stderr is empty.
- Independent receipts: `093-review-read.*` and `093-review-verify.*`.
- No source, canon, documentation, worker-report, test, helper, simulation, replay, campaign, or remote action was performed.
