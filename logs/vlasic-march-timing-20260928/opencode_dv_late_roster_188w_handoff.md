# Owner-authorized single 188-week campaign on the late-roster candidate

Codex is reasoning lead; OpenCode executes and reports. The owner said “Authorized, have open code run it” after reviewing the n13 156-week prefix pass. This authorizes exactly one full 188-week measurement of the current uncommitted, independently reviewed candidate. Do not edit production code, tests, scenario, paint, canon or acceptance criteria. Preserve all dirty worktree changes. Do not run a full suite, second campaign, map refresh, merge, baseline adoption, or October retuning.

## Question, command, cost and stop rule

Question: Does the n13 April 1995 gain survive the full single-scenario trajectory without losing earlier checkpoints, protected anchors, named seats, or the retained October floor? Compare against n13 for w39/w104/w156 and retained 188-week n0 for w188. The checkpoints must be from this one 188-week run, not a stitched comparison.

Exact command from repo root in `pwsh`:

`node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 188 --unique --out runs`

Expected cost: one 188-week simulation, approximately 5–10 minutes plus artifact analysis. Stop after exactly one completed campaign. On launcher failure, invalid preflight, or campaign failure, retain evidence and stop; do not automatically retry, retune, or run a second campaign. The Farz P-A §6 no-merge gate and full suite remain separate and open regardless of this result.

## Cheapest gates before launch

Confirm scenario/tsx/harness and n13 comparator artifacts exist; the reviewed late-roster code and focused tests/typecheck/reviewer GO are recorded in `opencode_dv_late_roster_result.md`; `git diff --check` is clean aside from the pre-existing ledger CRLF notice; no already completed post-fix 188-week campaign exists. Reuse unaffected green checks. Use one unique output dir. Capture the child stdout/stderr, exit, run path, 188 weekly rows, initial-save SHA-256, final state hash and unresolved final refs. Do not count a wrapper exit as child success.

## Pass criteria and evidence report

- Checkpoint fit from the one run: w39 January 1993 at least 707/712; w104 April 1994 at least 707/712; w156 April 1995 at least 705/712; w188 October 1995 at least retained n0's 669/712. Preserve each checkpoint's protected anchors; report counts and failed IDs, with all 40/40 at April.
- At w156 preserve Donja Mahala HRHB, Doljani RBiH (including w104), Ljubunci/Lug/Paroš HRHB, Gornja Presjenica RS, the Donji Vakuf RS trio, Paklarevo and Gornje Krčevine RBiH, Varošluk RS. Do not assume w188 controls from w156; report them separately.
- Confirm ordinary-combat AAR/battle provenance for the key Donji Vakuf trio and Vlašić cells, the 16th Krajina roster, operation windows, final controller differences versus retained comparators, critical anomalies and diagnostic failures. Distinguish measured facts from inference. A score pass cannot waive a protected trade, anomaly gate, or Farz P-A §6.

Write `logs/vlasic-march-timing-20260928/opencode_dv_late_roster_188w_result.md` with concise verdict, exits/counts/hashes, raw evidence paths, checkpoint and anchor table, named seat outcomes, anomalies, and residual open gates. Do not tune or dispatch another agent after a failure.
