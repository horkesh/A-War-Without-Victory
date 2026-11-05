# Bounded Sanski planning-prefix diagnostic

## Verdict

The focused real-topology fixture reproduces the n30 planning suffix. With the
retained Sanski walk, all objectives RS-controlled, and the real graph edge
`op:bosanski_petrovac:jasenovac_2 → op:kljuc:hadzici` supplied as live in a
bounded synthetic state (RBiH → RS), the first
lawful approach is **`op:kljuc:hadzici`**. `reconcilePlanningObjectives`
prunes the preceding 11-objective prefix and retains:

```text
op:kljuc:hadzici → op:kljuc:kljuc_2 → op:kljuc:krasulje_2
```

The positive control uses the real `ivanjska_2 → donji_dubovik_2` edge and
retains its complete prefix. A staging-only differential (`Bihać` versus
`Otoka`) produces identical reconciliation, proving that staging is not an
input to this function.

## Retained t175–180 evidence

Sources: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n29/` and
`..._n30/`, specifically `brigade_temporal_log.jsonl`, `weekly_report.jsonl`,
and `final_save.json`.

| run | t175–176 | t177–178 | t179–180 |
|---|---|---|---|
| n29 | 506th + 517th at `op:bihac:bihac_2` | same | same |
| n30 | 506th + 517th at `op:bihac:bihac_2` | both at `op:bosanska_krupa:otoka_2` | 506th at `op:bosanska_krupa:veliki_badic`; 517th at `op:bosanska_krupa:otoka_2` |

Weekly operation receipts show Sana in planning at t175–176 in both runs and
execution at t177. n29 retains the 14-objective third axis in its final save;
n30 retains only Hadžići/Ključ/Krasulje and records Otoka as its staging OSID.
The n30 final-save difference is therefore real, but the retained receipts do
not serialize the exact live front-edge/controller set consumed by planning
reconciliation at the boundary.

## Causal boundary

The fixture establishes the selector behavior, not that Otoka caused the
selector input to differ. `reconcilePlanningObjectives` receives state,
corps, operation, faction, and optional static adjacency; it does not read
`staging_osid` or brigade locations from them. The first divergent selector input is
therefore **the live approach/contact state** (front edges plus friendly
controllers) if it differed at reconciliation. The retained n29/n30 temporal
and weekly receipts prove different movement/ownership trajectories, but do
not provide enough boundary-state serialization to identify which earlier
writer produced that contact difference. No causal attribution to Otoka is
claimed.

## Checks

- `cmd /c npx vitest run tests/sector_offensive_planning_objective_reconciliation.test.ts --reporter=dot`: exit **0**, 11/11 tests passed. Output: `mistral_otoka_planning_fixture_test.out`; exit: `mistral_otoka_planning_fixture_test.exit`.
- `git diff --check`: exit **0**. Exit: `mistral_otoka_planning_fixture_diff_check.exit`.

The focused test, this retained-evidence report/check logs, and the required
ledger/knowledge closeout entries were added or changed by this bounded task.
No production code or campaign/full suite was run.
