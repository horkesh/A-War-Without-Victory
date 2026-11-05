# Donji Vakuf late authored-roster repair — result (2026-09-29)

**Verdict: evidence supports the mechanism; smallest general rule implemented and proven by a state-based focused test. Cheap gates green. No campaign run. n12 failure and the 705/712 April floor remain open.**

## Question and answer

Question (handoff): can an already-authored brigade that reaches its operation's exact
assembly OSID **while a pre-planned operation is executing** join that operation before a
generic operation claims it, without changing operation timing, authored objectives,
control directly, or unrelated operation selection?

Answer: **Yes.** The existing admission helper only ranked pre-planned operations in
`phase === 'planning'`. The measured n12 Donji Vakuf operation is already in `execution`
on the turn the 16th Krajina reaches staging, so the plan never claimed its own authored
brigade and a generic operation absorbed it the next turn. Extending the phase gate to
`execution` fixes exactly that race; every other admission gate is unchanged.

## Established evidence (read, not re-run)

- `n12_diagnosis_erratum.md` §Provenance: Operation Jajce is queued/preplanned
  (`is_pre_planned === true`), so its t20 march is authorized; Donji Vakuf injects t28,
  the 16th is in transit, arrives t29, and a generic `Operacija Bedem` claims it t30.
- `src/sim/turn_phases/war_phases.ts` step order places `process-brigade-movement`
  (line 1741) and `osid-column-movement` (line 1546) **before**
  `admit-authored-pre-planned-reinforcements` (line 1972), which is before
  `generate-bot-corps-orders` (line 2433). So on t29 the brigade's arrival is already
  visible to the admission step, and no generic operation has claimed it yet.
- `src/sim/combat/operation_preparation.ts:910` — `is_pre_planned` ops bypass the
  preparation state machine straight to `ready`, and Engine_Invariants §14.11 requires
  only one full planning turn before ordinary execution. Donji Vakuf therefore executes
  on the turn after injection (n9 t29→attacks t30; n12 t28→attacks t29), which is why the
  planning-only admission misses the n12 arrival.
- Retained run artifacts (read-only): `runs/apr1992_definitive_188w__2cb8853e73fa74b8__w156_n9`
  and `…_n12`.
  - n9 AAR: `Operation Donji Vakuf` t29–t39, success, 6 participants incl.
    `rs_16th_krajina_motorized`, initial strength 8263.
  - n12 AAR: `Operation Donji Vakuf` t28–t39, partial/max_failures, 5 participants,
    initial strength 6098 — the 16th excluded.
  - Brigade temporal log, `rs_16th_krajina_motorized`: n12 t28 `op:teslic:blatnica_2`
    → **t29 `op:sipovo:pribeljci_2`** (the authored `donji_vakuf_sweep` staging OSID)
    → t30 still staging → t31 `op:sipovo:volari_2`. n9 reaches the same staging OSID t29
    and moves to `op:donji_vakuf:torlakovac_2` t30 as a participant.

## Change

`src/sim/combat/pre_planned_operations.ts` — `admitAuthoredPrePlannedReinforcements`:

- Phase gate changed from planning-only to planning-or-execution:

  ```ts
  if (!operation.is_pre_planned) continue;
  if (operation.phase !== 'planning' && operation.phase !== 'execution') continue;
  ```

- Docstring updated to state the execution window and that recovery/completion close it.
- No other production behavior touched. All existing gates still bind: authored identity
  matched through `resolveOperationFormation`, exact authored (axis) staging OSID, not
  committed to any other active operation, `isEligibleOperationFormation`, not disrupted,
  same corps (or an authored Army-HQ elite loan). `participating_brigades` /
  `assigned_brigades` / `support_brigades` are appended and re-sorted with `strictCompare`;
  `initial_strength` accounting is unchanged (`prior + personnel`). No DV name special case.

`src/sim/combat/osid_column_movement.ts` — corrected the false comment that named the
t20 `Operation Jajce` as an emergent bot `sector_attack`. It is a queued scenario-authored
pre-planned op (`is_pre_planned === true`), so the authorization gate correctly admits it.
Comment-only; no code change.

`tests/pre_planned_operations.test.ts` — four new state-based tests built through the real
`injectQueuedOperation` path for `Operation Donji Vakuf` (16th absent, op advanced to
`execution`):

1. positive (t29-like): 16th at `op:sipovo:pribeljci_2` joins the executing op, both
   `participating_brigades` and the `donji_vakuf_sweep` axis gain it, and `initial_strength`
   increases by the brigade's personnel. Driven through the real war-phase step
   `admit-authored-pre-planned-reinforcements`.
2. negative — wrong staging (`op:teslic:blatnica_2`): admitted 0.
3. negative — other commitment (a generic `Operacija Bedem` already rosters it): admitted 0.
4. negative — non-pre-planned operation (`is_pre_planned = false`): admitted 0.

## Checks (commands, exits, counts, artifacts)

| Check | Command | Exit | Result | Log |
|---|---|---|---|---|
| Focused (red) | `node node_modules/vitest/vitest.mjs run tests/pre_planned_operations.test.ts -t "reaches its assembly OSID while the pre-planned operation is executing"` | 1 | 1 failed / 90 skipped — positive test fails without the fix | `opencode_dv_late_roster_focused_red.log` |
| Focused (green) | `node node_modules/vitest/vitest.mjs run tests/pre_planned_operations.test.ts` | 0 | 91 passed / 91 | `opencode_dv_late_roster_focused.log` |
| Related operation/movement | `node node_modules/vitest/vitest.mjs run tests/osid_column_movement.test.ts tests/sector_offensive.test.ts` | 0 | 46 passed / 46 (29 + 17) | `opencode_dv_late_roster_related.log` |
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 0 | no output | `opencode_dv_late_roster_typecheck.log` |
| Whitespace/diff | `git diff --check` | 0 | clean for the touched files (only pre-existing CRLF notice on `docs/PROJECT_LEDGER.md`) | `opencode_dv_late_roster_diff_check.log` |

Affected diff: `src/sim/combat/pre_planned_operations.ts` (+17/−5, `opencode_dv_late_roster_affected.diff`),
`tests/pre_planned_operations.test.ts` (+107, `opencode_dv_late_roster_tests.diff`), and the
comment hunk in `src/sim/combat/osid_column_movement.ts`. No campaign, prefix, full suite,
merge, baseline adoption, map/reference/canon change, or October work was performed.

## Residual risk and open items

- **Unmeasured.** This is a gate change proven only by focused unit tests. Whether it
  restores the three protected Donji Vakuf RS positions (`donji_vakuf_2`, `korenici`,
  `oborci_2`) and the April fit is **not** measured here and requires a new owner decision
  for a campaign.
- **Blast radius is broader than one brigade.** The rule is general: any authored brigade
  that reaches its pre-planned op's exact assembly OSID while that op is executing now joins
  it instead of a generic operation. The exact-staging + uncommitted + authored-identity
  gates keep it narrow, but the full 188-week effect is unmeasured; a change in unrelated
  operation selection cannot be excluded without a run.
- **Only the in-transit case is fixed.** `getActiveAuthoredAssemblyOsid` (same file) still
  routes not-yet-created mandatory brigades to the assembly OSID only for planning/queued
  operations; a brigade recruited after an op entered execution is not covered. No
  demonstrated need was shown, so it was left untouched.
- **n12 remains a failed candidate** (703/712, 39/40 anchors, `donji_vakuf_2` anchor failing)
  and **must not be repeated** under this handoff. The **705/712 April floor remains unmet.**
- The worktree was already dirty with the authorization-gate work; only the three files above
  were changed by this task, and all unrelated changes were preserved.
