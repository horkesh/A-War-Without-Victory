## 2026-11-14 — B11: an accepted proposal no longer comes back as an "unrequested operation"

**Problem (R8 dry-run Council, B11, m-611 → m-612).** After the President accepted a free staff proposal, the Decision Room offered the same plan as "Order an unrequested operation: … 25 Authority", and the receipt said "Command authority is spent now" while nothing had been spent.

**Cause.** `accept-proposal` resolves the APPROVE_OP review and stages `corps_command[c].player_op_response`; the plan stays `ready` until Advance. The proactive force-launch projections (`buildForceableReadyPlans` in `backTheOfficer.ts`, `buildForceableReadyPlanData` in `autonomy_ipc_contract.cjs`) only excluded plans with a pending proposal, so the just-answered plan looked unrequested. The `proactive-force-launch-op` IPC accepted it too: clicking would charge 25 CA and re-tag an ordinary commit as a force-launch (Direct Intervention, which feeds command strain and lowers CA recovery). The engine-side `proposal_generation.ts` already excluded such plans. Separately, `DirectiveCard.markIssued` printed the same "authority is spent" receipt for cost-0 directives.

**Change (UI projection and desktop guard only; no sim, state, save or calibration change).**
- New `resolveProactiveForceLaunchRefusal` in `src/desktop/autonomy_ipc_contract.cjs`: `plan_has_pending_proposal`, `plan_already_answered` (a staged `player_op_response` for the plan, or any resolved APPROVE_OP review for it from the player's faction), or null. Used by `buildForceableReadyPlanData` and by the `proactive-force-launch-op` handler in `electron-main.cjs`.
- `buildForceableReadyPlans` mirrors the rule from the raw state.
- `DirectiveCard` uses `directive.receipt.stagedNextTurnFree` (EN, BCS) when the directive costs 0.

**Checked.** `tests/ui/b11_answered_plan_not_unrequested.test.ts` (16 cases: accepted, withheld, consumed response, staged force-launch, other plan, pending proposal, other faction) failed 16/16 before the fix and passes after; the new receipt assertion in `tests/ui/decision_room_review_proposal.test.ts` failed on the old `DirectiveCard` and passes now. Every test that reads `electron-main.cjs`, `backTheOfficer` or `autonomy_ipc_contract`, plus the i18n parity suites: 57 files, 784 tests green. `npx tsc --noEmit` exit 0.

**Not done.** Rendered check in the packaged app. The wider command-loop redesign is the proposal `docs/40_reports/proposals/20261114_COMMAND_LOOP_PROPOSAL.md`.
