# ⛔ REJECTED IMPLEMENTATION EXPERIMENT — withdrawn 2026-09-17

**Everything in this directory is preserved as the evidence record of a change that was WITHDRAWN.**
It is **not** an accepted result and **not** a calibration baseline.

## What was here

A change specification, manifest and run evidence for three event rows in
`data/scenarios/events/war_1992.json` — `donji_vakuf_serb_takeover_1992`, `donji_vakuf_korenici_1992`,
`donji_vakuf_torlakovac_1992` — each granting a Donji Vakuf operational cell to RS through a
`control_change` effect on a documented 1992 date, plus the removal of `op:donji_vakuf:donji_vakuf_2`
from the `donji_vakuf_sweep` objective list.

Measured as `n404`, reproduced byte-identically as `n405`: jan1993 **701 → 702/712**, 1 cell fixed,
0 introduced, anchors 31/31, `consistency_failures` 0, `kw_ratio` 3.957 in band.

## Why it was rejected

Owner rule, 2026-09-17: **calibrate military capability and behaviour; do not author the territorial
result.** No new or expanded event-driven OSID ownership transfer is authorized. A date plus a
substantive condition is still prohibited when it assigns the outcome. A historical citation, a passing
suite, a higher score or an expert's approval cannot supply the missing authorization — only a separate
explicit owner instruction naming the exception can, and there was none.

The measurement being clean is **not** a defence. The mechanism was the problem.

## Status of the numbers

- `n403` (**701/712**) is the January comparison baseline.
- `n404` / `n405` (**702/712**) are the rejected experiment's runs. Do not quote them as a floor, a
  baseline, or evidence that the correction works.
- The Prusac +1 was a **coincidental** agreement with a reference the evidence does not vouch for, and it
  disappears with the withdrawal.

## What survives

The **history** — the ICTY findings, the citation corrections, the dead-writer inventory and the Prusac
negative finding — is sound and is retained in
`docs/40_reports/20260917_PRUSAC_DONJI_VAKUF_JANUARY_DIAGNOSIS.md` §9, with the withdrawal recorded at §10.
The historical defect (town captured t35 vs a documented 17 April 1992 takeover) remains **OPEN**.

Standing guard against reintroduction: `tests/donji_vakuf_no_authored_takeover.test.ts`.
