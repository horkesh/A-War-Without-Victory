# OpenCode handoff — Sana source continuity, then conditional continuous trace

Work only in `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`.
Branch `codex/october-calibration-continuation-20261003`, clean checkpoint
`9e96cdc16` (diagnosis), production base `24452b5fa`. You are a bounded diagnostic
worker; Codex retains causal diagnosis, acceptance decisions and integration.

Read `AGENTS.md`, `docs/20_engineering/AGENT_WORKFLOW.md`, the current section
of `docs/40_reports/CALIBRATION_MASTER.md`, and these existing receipts:

- `logs/prusac-diagnostic-20260929/sana_ivanjska_joint_validation_plan.md`
- `logs/prusac-diagnostic-20260929/sana_n37_convergence_report.md`
- `logs/prusac-diagnostic-20260929/continuation_independent_review.md`
- `continuation_sana_preorder_trace.ts`, `continuation_sana_t187_exact_result.json`,
  `continuation_sana_t188_trace_result.json`, and
  `continuation_sana_t188_diff_classification.json` in that directory.

## First task: source continuity, read-only

Establish whether the exact dirty production source used for retained n37/n38
can be recovered from contemporaneous source snapshots, patches, Git objects,
manifests or logs. Older evidence checkout:
`C:/Users/User/.codex/worktrees/april-1995-glamoc/A-War-Without-Victory`.
Its retained evidence directory is `logs/prusac-diagnostic-20260929`; read it
without editing it. Do not scan whole run/log histories indiscriminately: use
file inventories and narrow searches for source snapshots, hashes and patches.

Retained runs are accessible through local `runs` links:

- n37: `apr1992_definitive_188w__6deb5845c150c196__w188_n37`
- n38: `apr1992_definitive_188w__4658849344f21642__w186_n38`

Both record dirty `df3cc` provenance, consumed-input digest
`8f13061b19ed9fd2d899f77f0115fdd4c5379e52cb058b3edadbd00e0e41af20`, and initial
save SHA256 `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`.
Current checkpoint differs from clean df3cc in 23 simulation/scenario files.
Matching current/older working-copy bytes, commit ancestry, data digest or
selected outcomes alone does NOT fingerprint the original dirty executable.
Report what contemporaneous evidence binds each relevant source file, and the
unbound remainder. Do not invent a source receipt or silently weaken this gate.

Question: can executable source continuity be established from retained evidence?
Cost: focused filesystem/Git inspection, minutes. Pass: contemporaneous evidence
binds the relevant production source bytes used by n37/n38 to the executable
selected for the trace. Stop this task with an explicit insufficiency finding if
the original dirty tree cannot be established. No replay follows that failure.

## Conditional second task: one continuous t186→t188 diagnostic

Only if source continuity passes, prepare a NEW diagnostic helper, using the
existing helper as reference, that resumes n38 `save_w186.json` ONCE and runs
t187 and t188 continuously through the production runner. `save_w186` is
post-turn. The previous two single-turn resumes passed selected t187 receipts
but failed t188 whole-state/column equivalence: 1,147 behavioral differences,
including 1st Cerska/105th Modrica reconstituted only in the resumed trace.
Source continuity, second-resume effects and flag neutrality remain hypotheses.

Record the exact command, prerequisites, question, pass criteria, expected cost
and stop rule in the EXISTING validation plan before dispatch. Proposed command
shape (choose this exact new helper filename):

```powershell
$env:AWWV_DEBUG_REASON_CODES = 'axis_reject,movement_reject'
node node_modules/tsx/dist/cli.mjs logs/prusac-diagnostic-20260929/continuation2_sana_continuous_trace.ts
Remove-Item Env:AWWV_DEBUG_REASON_CODES
```

Question: does avoiding the second resume recover retained n37 t188 behavior,
and which exact pre-order decision/column rejection explains the 517th route?
Expected cost: setup plus TWO simulated turns, minutes. Allow exactly ONE
continuous diagnostic invocation; no automatic retry. First cheaply verify Node
22, required files, resume indices, source hashes, flag parsing, and fresh output
paths. Do not invoke `run_scenario_with_preflight.ts` or start at turn zero.

Pass: t187 retained brigade movement/status snapshots, battles/objectives/control
and column totals match; t188 equivalents and diagnostic-free whole state match
n37, with actual order and movement-rejection receipts naming the actor/branch.
Only strip the three known receipt fields (`launch_blocker_detail`,
`launch_readiness_detail`, `order_generation_details`); never strip behavioral
state to obtain equivalence. Explicitly distinguish pre-order receipts from
post-turn approach reconstruction. Stop on nonzero, missing inputs/receipts,
local mismatch or whole-state mismatch; classify ALL failure categories from
retained output before proposing anything else. No retry.

## Boundaries and separate acceptance gaps

No production/test/scenario/canon/control/paint/geometry/denominator/save-schema
edit, teleportation, direct flip, scripted victory, retiming, tuning, full suite,
new prefix/188-week campaign, push, merge or baseline adoption. Never delete or
overwrite retained evidence, linked runs or node_modules. New outputs must use
fresh `continuation2_*` names and refuse existing paths. Raw artifacts stay local.
Do not change an agreed acceptance criterion. Resolve routine diagnostic choices
from evidence without pausing for permission.

n37 remains NO-GO: Petrovac t181, Kljuc t185, Sanski town RS; four Sanski belt
gains t184–187; Jajce only 3/5; n25 October matches Barevo/Lupnica/Majdan/Varosluk
lost. Protected controls retained and critical anomalies zero. Separate fresh
western audit: Mistral2 launch t178→t180, HGZ/112th leave roster by t188;
SouthernMove starts planning t185, stays planning at w188, elapsed3/5, initial
intel unreported; Varosluk loss inherited in n29/n30. Do not bundle these into
a Sana correction or trade protected outcomes for Sanski.

The 2026-09-29 Farz owner ruling supersedes the old wrong-corps blocker. Actual
four Farz operation-owned captures pass; 2nd Corps participation absent is a
fidelity diagnostic. Sana belt gains are not Farz receipts.

## Deliverable

Return a compact source-continuity verdict with exact evidence/hash coverage and
unbound remainder. If conditional trace runs, return exact exit, measured
pre-order branch, fidelity gates, all failure category counts and evidence paths.
Label measured facts, hypotheses and missing evidence. Put raw logs in files.
Use a new small `continuation2_source_continuity.json` receipt and append settled
findings to the EXISTING convergence report; do not create another status report.
Do not update board/roadmap/ledger, commit, or claim calibration acceptance;
Codex owns integration and independent review. Stop after the bounded result.
