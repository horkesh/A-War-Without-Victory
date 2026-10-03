# OpenCode bounded retained western failure extraction

Workdir: `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`.
Branch `codex/october-calibration-continuation-20261003`, checkpoint `75a1ff11f`.
You extract evidence; Codex owns causal diagnosis, acceptance and integration.

Read `AGENTS.md`, `docs/20_engineering/AGENT_WORKFLOW.md`, current Sana sections
of `docs/40_reports/CALIBRATION_MASTER.md`, and these existing local files:
`sana_ivanjska_joint_validation_plan.md`, `sana_n37_convergence_report.md`,
`continuation_western_receipts.json`, `continuation_retained_acceptance_audit_final.json`,
`continuation_retained_acceptance_audit.cjs`, `continuation_independent_review.md`.
All local file names above are in `logs/prusac-diagnostic-20260929/`.

## Fixed question and evidence

For each lost October n25 matching OSID, identify the first observable relevant
divergence in retained n25 versus n37 receipts, and the causal predicates that
are recorded or missing. Do not equate chronological correlation with code cause.

Exact lost targets (denominator remains 712):

- `op:jajce:barevo_2`, HRHB in n25, RS in n37.
- `op:jajce:lupnica`, HRHB in n25, RS in n37.
- `op:mrkonjic_grad:majdan_2`, HRHB in n25, RS in n37. This is NOT Sana's
  `op:sanski_most:stari_majdan`; do not conflate them.
- `op:travnik:varosluk`, RBiH in n25, RS in n37.

Run roots are `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n25`
and the corresponding `_n37`, `_n29`, `_n30`. n29/n30 may be read only when
needed to localize inherited divergence. Resolve exact actors, do not guess.
Artifacts include `weekly_report.jsonl`, `brigade_temporal_log.jsonl`,
`operation_aars.json`, `watched_operations.json`, `destroyed_brigades.json`,
`control_delta.json`, `final_save.json`, `initial_save.json`, `run_meta.json`.
Inspect schemas before extracting. Record row keys/turns/operation/formation
IDs and consumed artifact SHA256, so a reviewer can verify the extraction.

Established observations, not new causal conclusions:
Mistral 2 starts planning t175 in both; first execution n25 t178, n37 t180.
n37 captures Bravnice t185, Vinac t186, Jajce t187; Barevo/Lupnica remain RS.
At n37 endpoint HGZ/112th leave Mistral roster; Jajce axis has 2nd Guard
Mechanized at Lupnica. Trace first relevant roster, axis, movement and battle
divergences; distinguish operation reassignment, withdrawal, destruction and
unreported lifecycle cause. Southern Move starts planning t185 and stays
planning at n37 t188, preparation elapsed 3/5, initial intel unreported.
Varošluk's 737th route issue was already observed in n29/n30; localize it from
receipts. Source continuity for n37/n38 is NOT established: do not claim
present source uniquely caused the dirty retained run. No more source recovery.

## Scope, checks and stopping rule

Read-only retained evidence audit; expected 5–10 minutes. Cheap preflight checks
file readability and relevant schema before full extraction. You may create ONE
small guarded deterministic Node CJS extraction helper and ONE new JSON receipt:
`continuation3_western_failure_audit.cjs` and
`continuation3_western_failure_receipts.json` in the existing log directory.
Guard output against overwrite; never mutate input files, run directories,
production code, tests, data, save schemas, references, canon or denominators.
No scenario runner, `runTurn`, bot order generation, resume, full suite, build
or campaign. No direct flip, teleportation, retiming, scripted victory or
selector/lifecycle change. Protected controls and required Farz receipts remain.

Pass: all four categories have exact IDs, successful extraction exits, first
observable divergence with before/after rows, relevant operation/formation/battle
chain and explicit evidence gaps. Missing fields mean unreported, not zero.
Stop at missing causal evidence without inventing it. One extraction command:

```powershell
node logs/prusac-diagnostic-20260929/continuation3_western_failure_audit.cjs
```

Save raw stdout/stderr and exact `.exit.txt`. Correct an extraction-schema error
cheaply using a new output name if needed; preserve failed outputs. Append a
concise evidence section to EXISTING `sana_n37_convergence_report.md` only.
Do not update ledger/board/master, commit, push, merge or adopt a baseline.
Return verdict, counts, exact exit, artifact paths, observed chain and missing
predicates. Suggest the smallest discriminating check, but do not run it.

Exact lead dispatch (raw output captured separately):

```powershell
opencode run --standalone --model 'opencode-go/gpt-5.6-luna#medium' --format json --auto --title 'Sana retained western failures' --file logs/prusac-diagnostic-20260929/continuation3_opencode_handoff.md 'Execute the bounded retained-evidence extraction handoff. Cover every failure category; preserve evidence and stop at unreported causal predicates. Do not run a scenario or change production.'
```
