# Event Modal Browser Proof

**Date:** 2026-05-26

**Status:** Implemented and verified on `main`.

## Summary

The event decision modal upgrade now has live browser-shell proof in addition to focused unit/jsdom coverage. The proof confirms that a real pending event decision opens as a direct `EventDecisionModal` surface with authored historical/default/source/staff/trigger/consequence material, rather than requiring the player to discover the decision inside Decision Room or President's Desk.

The event catalog remains content-incomplete at 17/36 production modal-ready required-response rows. Remaining rows are gated by sensitive-history review, source/design default blockers, explicit option-design issues, or 188-week proof.

## Implemented Proof

- `tests/ui/event_decision_modal_catalog.test.ts` renders every current production modal-ready required-response row from the real event JSON catalog.
- `tests/ui/event_decision_auto_launch_contract.test.ts` now also checks the selected pending event decision payload is rendered through `EventDecisionModal`.
- `tools/ui/event_modal_browser_smoke.cjs` starts the Vite map shell, loads the startup save through the live app save-load path, injects real event row `rbih_state_identity` into `military.pending_event_decisions`, and verifies the direct event dialog.

The browser smoke verifies:

- visible dialog title: `What Is Bosnia?`
- historical default text
- source note
- staff assessment
- trigger evidence
- numeric consequences, including `morale +3` and `international standing +15`
- no `Decision Room` or `President's Desk` text inside the event dialog

## Process Safety

The smoke script uses a dedicated default port, `3227`, and verifies cleanup after completion. Windows cleanup was hardened to:

- launch Vite so the long-lived server PID is tracked,
- parse exact local listener ports instead of using loose substring matching,
- kill only owned listeners whose command line matches this worktree and exact `--port 3227` / `--port=3227`,
- report that port `3227` is not listening after the run.

Smoke evidence is written under ignored `.tmp_event_modal_browser_proof/`.

## Verification

Commands run on main:

```powershell
git diff --check HEAD~3..HEAD
node --check tools\ui\event_modal_browser_smoke.cjs
node tools\ui\event_modal_browser_smoke.cjs
npx.cmd vitest run tests\ui\event_decision_modal_catalog.test.ts tests\ui\event_decision_auto_launch_contract.test.ts tests\ui\event_decision_modal_phase3.test.ts tests\ui\modal_stack_priority.test.ts tests\event_decisions.test.ts tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_taxonomy_report.test.ts --reporter=dot
npm.cmd run typecheck
npm.cmd run test:baselines
```

Results:

- browser smoke passed and verified dev-server cleanup,
- focused UI/event suite passed 66/66,
- typecheck passed,
- baseline regression passed with `Baseline regression: all scenarios match.`

## Residuals

- Full event catalog remains `NOT_READY`.
- `nato_ultimatum_sarajevo_1994` needs sensitive-history approval before modal-ready default authoring.
- `karadzic_mladic_split_1995` needs option-order/design review because the historically grounded default is not current option 0.
- `us_halts_federation_advance_1995` remains deferred for 188-week proof.
