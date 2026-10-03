# Targeted correction of western evidence extraction

Work only in `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`.
Read the Continuation3 subsection of `continuation_independent_review.md` and
`continuation3_western_failure_audit.cjs` / `continuation3_western_failure_receipts.json`
in `logs/prusac-diagnostic-20260929/`. The initial OpenCode dispatch/extraction
both exit0, but review BLOCKS its coverage claim. STOP for code cause remains.

Correct only these evidence-extraction gaps, expected 3–5 minutes; no simulation:

1. Preserve initial helper/JSON/logs. Create NEW
   `continuation3_western_failure_audit_corrected.cjs` and guarded NEW
   `continuation3_western_failure_receipts_corrected.json`, with parent receipt
   SHA256. Record the comparison window170–188 for original temporal claims;
   no run-earliest claim from that window. For the relevant actors, cheap full
   retained temporal scan may locate earlier differences, but distinguish
   irrelevant personnel drift from route/operation/roster divergence.
2. Include actual existing attack_order_targets, participant_attack_orders,
   eligible_attacker_count, skipped_attack_orders and relevant AAR/watched
   records. Do not label a skipped-order reason absent without inspecting it.
   Preserve explicit actor→target→battle chronology in compact output.
3. For Varošluk explicitly include `arbih_737th_muslim_light` across full
   temporal history for n25/n37 and relevant n29/n30 comparisons, including
   route after leaving target. Do not rely on operation=null participant IDs.
4. HGZ/112th lifecycle/destruction: search all locations for those actor IDs,
   not only target OSID. Distinguish recorded destruction, operation roster
   departure and unreported withdrawal reason. Capture relevant active_op_id
   changes without claiming their code cause.
5. Use explicit codepoint ordering rather than localeCompare in diagnostic
   sorting. Missing fields remain unreported. Fix report wording: 737th's
   capture receipt is RBiH, not HRHB/RBiH. Relabel initial extraction as
   superseded coverage, retain exact exits and name corrected evidence.

Exact correction check:
`node logs/prusac-diagnostic-20260929/continuation3_western_failure_audit_corrected.cjs`.
Save raw `.stdout.log`, `.stderr.log`, `.exit.txt` with prefix
`continuation3_western_corrected`. Pass: schema/IDs correct; all coverage gaps
resolved; raw inputs and parent receipt unchanged; unsupported causal claims
removed. Stop after this targeted correction if still unresolved; no repeat
investigation, production/test/data/canon/save/control changes, scenario,
resume, full suite, campaign, push, commit, merge or adoption. Codex integrates.
Append concise corrected findings to existing `sana_n37_convergence_report.md`;
do not update other docs. Return exact exits and small evidence summary.
