# Combat-fatigue ownership preimplementation review

**Verdict: GO for the bounded single-writer correction described below.** The two current mutations are duplicate charges, not distinct intended costs.

This review is source/history/canon only. It did not invoke the resolver, simulation, planner, query, stage, advance, campaign, or tests, and it made no production change. The prepared T25 fork remains parked.

## Canon and ownership finding

- `Systems_Manual_v0_9_0.md` line 1109 and `context.md` line 301 independently define the entire per-battle formation-fatigue charge as attacker **+2**, primary defender **+1**, capped at 30. The current recovery/frontline coefficients differ between those two prose records, but that unrelated drift does not affect their agreement on the per-battle charge and must not be changed in this fix.
- `attack_resolution_osid.ts` currently applies `recordFormationFatigue(a, defenderFormation ? 2 : 0.5)` to every physical attacker and `recordFormationFatigue(defenderFormation, 1)` to the primary defender. Later in the same battle iteration it calls `applyCombatFatigue`, which adds another +2 to every physical attacker and another +1 to the same primary defender. A defended uncapped battle therefore writes +4/+2 despite the +2/+1 contract.
- The helper explicitly documents +2/+1 as the complete charge. The inline attacker comment explicitly treats +0.5 as the complete lower cost for a sweep without a defending formation. Neither site labels its mutation as a separate fatigue category. Both mutate the same `formation.ops.fatigue` field during the same battle-resolution pass.
- History confirms duplication rather than additive design. The inline +2 existed before the March 8 undefended scaling change; the second +2/+1 block also existed in that same pre-change resolver. Commit `948c6fdf4` later extracted that second block into `attack_resource_aftermath.ts` as an “exact reproduction,” and the extracted module declares ownership of combat fatigue. No history or canon source assigns distinct meanings to the two charges.

## Minimal lawful correction

Keep `attack_resource_aftermath.ts::applyCombatFatigue` as the sole post-battle owner, because that module's declared domain is post-battle resource and fatigue aftermath. Make its attacker delta depend on the already supplied `defenderFormation`: +2 when a defending formation exists, +0.5 when none exists; keep the primary-defender +1 and cap 30. Remove the earlier attacker and primary-defender `recordFormationFatigue` calls and the now-unused resolver import.

This preserves:

- defended battle totals of +2 per physical attacker and +1 for the primary defender;
- the established +0.5 undefended/militia-only sweep intent;
- `FATIGUE_MAX=30`, initialization of absent `ops`, participant identity, and stable attacker iteration;
- all recovery, frontline-duty, supply-fatigue, combat-power, casualty, movement, control, operation, and schema rules.

Do not tune fatigue constants, recovery cadence, attack/defense multipliers, operation logic, or Korenici-specific data in this correction.

## Required proof

1. Preserve the planned real-resolver RED showing one defended battle produces the current +4 attacker/+2 primary-defender delta while the canon expectation is +2/+1. The fixture must start below the cap and identify exactly one resolution invocation, so saturation or multiple battles cannot mask ownership.
2. After the correction, the same real-resolver fixture must show exactly +2/+1. Include multiple physical attackers if practical, or otherwise a focused maintained check proving each attacker receives one +2 charge.
3. Add or retain a focused undefended-resolution check proving +0.5, plus a boundary check proving the single writer still caps at 30. These can be cheap focused tests; they do not justify another campaign.
4. Run the affected combat tests and nonincremental TypeScript check once. Preserve raw exits and logs. Review the final diff for a single owner and no coefficient drift.

The correction changes deterministic simulation output but introduces no nondeterministic operation: each participant receives one fixed additive mutation in the existing stable resolver order. Existing calibration, full-suite, and campaign evidence predates the fix and cannot qualify its outputs. A later campaign requires its own explicit question and authorization; the parked T25 fork must not be interpreted as qualification or a 707 waiver.

## Scope limits

The duplicate writer is older than the current REQUEST-OP and fractional-save work. Removing it is an engine correctness fix with broad downstream trajectory effects, not calibration tuning and not evidence that any particular historical mismatch will resolve. The source also contains stale prose about recovery/frontline coefficients; reconcile that separately rather than expanding this code correction.
