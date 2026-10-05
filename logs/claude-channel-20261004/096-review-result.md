# [096] Predictor/resolver defender-source correction — independent review

## Verdict

**GO for the corrected finite source comparison in 096, with the qualifications below. The original 095 overstatements are superseded and must not be cited without the 096 addendum. Calibration remains NO-GO; all existing observational, provenance, protected-boundary, canon, determinism, save, 517, and acceptance gates remain unchanged.**

The supported design conclusion is narrow: both inspected paths are capable of building multi-defender sector models, so a fixed “predictor is single-defender by design while resolver is multi-defender by design” explanation is rejected. The evidence does not establish identical runtime defender sets or cardinality for turn 188, and it does not exclude a one-versus-many runtime difference.

## Accepted finite source facts

- The order-evaluation call invokes `predictCombatOutcome` for one named attacker and passes `undefined` for `additionalAttackers`. The predictor constructs a defender collection from the standing sector roster plus physical defenders, sorts it, ranks it, and calculates physical and distance-weighted reactive contributions. Thus the predictor's attacker call shape is one attacker while its defender model is multi-defender capable.
- The resolver also constructs a sorted collection from standing sector defenders plus physical defenders and calculates physical and reactive contributions. It additionally applies an anchor-garrison filter and an empty-sector adjacent-defender fallback before ranking. Those differences alone prevent an identical-set or identical-cardinality conclusion.
- The two paths share several helpers and the broad physical-plus-reactive model, while differing in phase, filters, reserve division, fog treatment, and other attacker/defender modifiers. This is a finite structural comparison, not whole-contract equivalence.
- Clean-source bindings are complete for the displayed ranges: the evaluator, predictor, and resolver blobs match clean and HEAD; `reason_code_debug.ts` differs at HEAD, and the cited `battle_power` registration is bound specifically to the clean blob.

## Required qualifications and corrections

1. **095's categorical “rejected as a source possibility” and “cardinality is not different by design” wording is too strong.** The corrected 096 formulation supersedes it: a fixed single-defender predictor design is rejected, but actual turn-188 sets and counts are unreported. Resolver-only anchor eligibility and fallback logic can change the runtime set; other phase/state differences may also matter.
2. **One predictor attacker does not prove the resolver's turn-188 attacker count.** Passing `undefined` for `additionalAttackers` proves the predictor invocation's attacker shape. No retained resolver input set or executed-call receipt proves how many attackers resolution used at that boundary.
3. **The history records do not bind casualty distribution to this source path.** The inspected resolver comment says casualties use the same weights, but these receipts do not capture the caller/writer sequence that produced each brigade-history engagement. The three matched defender histories from 094 remain post-combat records, not proof of the precise resolver set, weights, or write phase.
4. **Fog arithmetic is conditional feasibility only.** Using the displayed values gives `0.93 / 1.296 ≈ 0.718`, which lies within the inspected fog-factor range if defender sets, attacker terms, phase inputs, and every other modifier are assumed equal. None of those equalities or the turn-188 confidence is measured. The proposed `[0.925, 0.935)` interval additionally assumes a particular rounding rule that these receipts do not bind, so that interval should not be treated as evidence.
5. **Outcome-band consistency does not make the gap benign.** The stored `0.93` and `stalemate` remain threshold-consistent, but that neither reconstructs the resolver call nor classifies `1.296` versus `0.93` as ordinary variance. No cause, defect, or harmlessness conclusion follows.
6. **`battle_power` mutates the enabled battle artifact and is only a partial resolver receipt.** The source conditionally adds `power_breakdown` to the battle record; it is not stdout-only. Its fields expose aggregate operands and sector context, but not every defender ID, per-defender term, applied modifier, predictor input, or full tuple. The source comment describes the off-state empty spread; byte equality, default-off neutrality, save/hash equality, and enabled-run behavior have not been verified here.
7. **Missing receipts are finite, not global absence.** No predictor-side receipt was found in the inspected n39 evidence and four source files. This does not prove that no equivalent data, alias, artifact, or serializer exists elsewhere.
8. **096 clearly marks its corrected claims as replacements, but 095 remains physically present.** Any integrated documentation must cite the 096 qualifications alongside 095 or quote only the corrected formulation.
9. **Receipt exits are sufficient for this capture, not a fail-fast wrapper guarantee.** Both 096 shell scripts return outer exit `0`, and the retained output contains 15 binding inner-exit lines and 10 source inner-exit lines, all `0` (including each `sed|awk` pair as `0/0`); both stderr files are empty. The scripts print native exits but do not propagate an earlier failure, so outer `0` alone would not establish future command success.

No observer, receipt change, helper, test, run, replay, or campaign is authorized or shown ready. A new observer and a full 188-turn run are neither inevitable nor granted. The source comparison does not support tuning, canon adjudication, a shared Jajce/737 cause, a dirty 517 explanation, or any acceptance change.

## Review record

- Reviewed at HEAD `c1fbb899adef0680778c9df038b37e427ee2bb8d`.
- Inputs: preserved `095-defenders-result.md`, corrective `096-defenders-result.md`, and the `095-defenders-{a,battlepower}` plus `096-defenders-{binding,source}` receipt sets.
- Worker exits: `095-defenders-a = 0`, `095-defenders-battlepower = 0`, `096-defenders-binding = 0`, `096-defenders-source = 0`; all four stderr files are empty.
- Independent receipts: `096-review-read.*` and `096-review-verify.*`.
- No other file was edited and no source/helper/test/observer/simulation/replay/campaign/remote action was performed.
