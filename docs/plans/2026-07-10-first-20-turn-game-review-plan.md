# 2026-07-10 First-20-Turn Game Review Plan

Status: completed locally. No staging, commits, pushes, or PRs.

## Objective

Drive a fresh RS campaign as a first-time player through the first 20 turns, click the major command/map/decision surfaces, identify blockers, inconsistencies, unreadable text, confusing repeated cards, and route failures, correct all small agent-actionable issues locally, and leave only product/owner decisions as explicit follow-ups.

## Evidence Inputs

- Completed exact-turn run: `tmp-paradox-qa-20260710/paradox-local-qa-first20-rs-completion-v12.json`
- Completed progress snapshot: `tmp-paradox-qa-20260710/paradox-local-qa-progress-first20-rs-completion-v12.json`
- Empty run stderr: `tmp-paradox-qa-20260710/first20-rs-completion-v12.err.log`
- Screenshots: `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-*.png`
- Final map screenshot: `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-rs-384-playthrough-final.png`
- Turn-20 Decision Room screenshot: `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-rs-359-turn-20-decision-room.png`
- Playtest report: `docs/40_reports/playtests/20260710_rs_first20_local_qa.md`

## Completed Findings And Corrections

### F20-001 - Paramilitary Request Mode Truth

Finding:
- Offensive paramilitary sweep requests did not persist their mode in pending request/history state, so the review modal could display offensive requests as the wrong class of request.

Actions completed:
- Added `mode?: 'rear_pocket' | 'offensive'` to paramilitary request/decision records.
- Set rear-pocket and offensive modes at request creation.
- Persisted mode into decision history.
- Added focused regression coverage.

Files:
- `src/state/game_state.ts`
- `src/sim/combat/paramilitary_sweep.ts`
- `tests/paramilitary_sweep.test.ts`

Status: completed locally.

### F20-002 - Already-Decided Paramilitary Rows Still Looked Unresolved

Finding:
- Rows marked `allow`, `deny`, or `regular` could still appear in player decision manifest derivation, inbox paths, command review surfaces, and desktop autonomy helpers as unresolved work.

Actions completed:
- Filtered final paramilitary decisions from manifest, adapter, inbox, pre-advance, Decision Room, and desktop autonomy paths.
- Updated proposal-review resolution semantics so `null` remains unresolved, but concrete `false` counts as resolved.
- Added regression coverage across manifest, UI, and desktop-autonomy boundaries.

Files:
- `src/state/player_decision_manifest.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/data/preAdvanceCommandReview.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/desktop/autonomy_ipc_contract.cjs`
- `src/desktop/electron-main.cjs`
- `tests/player_decision_manifest.test.ts`
- `tests/ui/paramilitary_inbox_items.test.ts`
- `tests/desktop_autonomy_boundary_truth.test.ts`

Status: completed locally.

### F20-003 - Advisory Event Decisions Used Required Copy

Finding:
- A non-blocking blue inbox decision said "A presidential decision requires your response..." even though it was routed to Decision Room and did not block advance.

Actions completed:
- Split required vs advisory event-decision inbox subtitles.
- Required decisions retain "requires your response".
- Advisory decisions now say "available for review".
- Added regression coverage.

Files:
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/inbox_items.test.ts`

Status: completed locally.

### F20-004 - Historical Operation Authorizations Needed Operation Facts

Finding:
- Historical operation proposal cards could read like duplicate generic sitreps because they did not expose operation goals, responsible command, commander, assigned force, staging, timing, or source provenance.

Actions completed:
- Decision Room historical operation reviews now derive details from existing scenario operation definitions.
- Pre-planned, triggered, and Army-HQ-marked operations report objective chains, command, assigned commander when present in the save, assigned formation count, reported personnel, staging, timing, launch floor when present, and source provenance.
- Triggered `Operation Kotor Varos` now shows the `Kotor Varos Siege` axis, objectives, three assigned formations, two-turn planning period, and triggered-operation provenance.
- Added regression coverage for pre-planned `Operation Prijedor`, triggered `Operation Kotor Varos`, and Army-HQ-marked operation provenance.

Files:
- `src/ui/map/data/historicalOperationAuthorization.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `tests/ui/presidential_decision_room.test.ts`

Status: completed locally.

### F20-005 - Cross-Origin Tactical Iframe Warning

Finding:
- Electron emitted `[warroom] Could not configure tactical map iframe: SecurityError...` because `warroom.ts` attempted direct iframe `document` access against the HTTP tactical map server.

Actions completed:
- Added a same-origin guard before direct iframe document injection.
- Kept cross-origin runtime handoff on postMessage.
- Added source-level regression coverage.

Files:
- `src/ui/warroom/warroom.ts`
- `tests/ui/dev_host_consistency.test.ts`

Status: completed locally.

### F20-006 - Tactical Overlays Could Poison Warroom Surface Tours

Finding:
- Map stack expansion and field-inspection overlays could remain open while the harness attempted Command Surface and Decision Room clicks, producing misleading evidence and player confusion.

Actions completed:
- App route cleanup now clears tactical inspection overlays before entering Warroom Decision Room, Desk, and Inbox surfaces.
- Toolbar field-panel cleanup also clears expanded stacks, tooltips, and aftermath overlays.
- The local QA harness dismisses stack expansion before continuing surface tours.
- Added route/shell regression coverage.

Files:
- `src/ui/map/App.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `tmp-paradox-qa-20260710/paradox-local-qa.cjs`
- `tests/ui/warroom_shell_ownership.test.ts`
- `tests/ui/warroom_shell_accessibility.test.ts`

Status: completed locally.

### F20-007 - QA Harness Exact-Turn And Surface Truth

Finding:
- The local Electron harness originally underreported pending event decisions, could overrun the requested target turn, and wrote generic output filenames that hid which run produced which artifact.

Actions completed:
- Pending event decisions are read from adapter, meta, and military raw-state shapes.
- Checkpoint draining holds on the final advance confirmation instead of consuming it past the target turn.
- Output JSON/progress/live-event files are now run-label-specific.
- The completed v12 run ended at exact turn 20 with empty stderr.

Files:
- `tmp-paradox-qa-20260710/paradox-local-qa.cjs`

Status: completed locally.

## Completed Playthrough Result

The completed `first20-rs-completion-v12` run captured 385 events/screenshots and reached turn 20 as RS. The run advanced through 20 turn confirmations, handled 14 aftermath modals, reviewed blockers 14 times, denied and cleared 14 paramilitary packets, and acknowledged 1 event. No paramilitary requests remained at the stop point.

The final pending advisory event and Kotor Varos historical-operation proposal were expected stop-point work, not evidence that turns 1-20 were blocked.

Krajina was not empty: every map-overview checkpoint reported 47-48 owned Krajina formations and 17 visible RS Krajina counters in the current overview.

## Open Product Follow-Ups

These are not small local bug fixes and should stay in the WP-9 diary queue:

1. Reduce early modal cadence by batching repeated low-stakes paramilitary/rear-area packets or adding a standing policy path.
2. Consider stronger stack-expansion and command-briefing overlay context only if owner diaries repeat the confusion.
3. Audit compact OOB/side-panel truncation only for primary decision text, not every intentionally dense label.
4. Promote the temporary Electron click-everything harness into a maintained QA gate only after the product flow stabilizes; the current file remains a local artifact.

## Verification

Completed fresh after local fixes:
- `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui/inbox_items.test.ts tests/triggered_operations.test.ts --pool=forks --reporter=dot` - 3 files / 125 tests passed.
- `npm.cmd run typecheck` - passed.
- `node --check tmp-paradox-qa-20260710\paradox-local-qa.cjs` - passed.
- `npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/player_decision_manifest.test.ts tests/ui/paramilitary_inbox_items.test.ts tests/ui/inbox_items.test.ts tests/ui/dev_host_consistency.test.ts tests/desktop_autonomy_boundary_truth.test.ts tests/ui/decision_surface_registry.test.ts tests/ui/president_desk_shell.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_blockers.test.ts tests/ui/presidential_decision_room.test.ts tests/operation_opportunities_phase2_decisions.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/warroom_shell_accessibility.test.ts --pool=forks --reporter=dot` - 14 files / 262 tests passed.
- `npm.cmd run desktop:release:check` - passed.

## Stop Gates

- Do not stage, commit, push, or open PRs from this local review.
- Do not edit simulation/canon behavior merely to improve UI cadence.
- Do not call remaining modal-cadence friction a blocker unless a new owner play diary or failing harness proof shows it blocks advance.
