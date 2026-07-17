# RS First-20-Turn Local QA Diary - 2026-07-10

Local-only review. No staging, commits, pushes, PRs, installer work, or release tagging.

## Session Metadata

| Field | Entry |
| --- | --- |
| Diary date | 2026-07-10 |
| Operator | Codex / Paradox QA split |
| Session number | Local RS first-20-turn review |
| Build / commit | Local dirty workspace; do not treat as a release commit |
| Package version | 0.9.9-beta.1 |
| Build command | `npm.cmd run desktop:release:check` |
| Play command under review | `npm run desktop` |
| Faction | RS |
| Scenario or save | Fresh campaign |
| Start in-game date / turn | 6 Apr 1992 / turn 0 |
| End in-game date / turn | 24 Aug 1992 / turn 20 |

## Primary Evidence

Primary artifact folder:
- `tmp-paradox-qa-20260710/`

Completed exact-turn run:
- JSON: `tmp-paradox-qa-20260710/paradox-local-qa-first20-rs-completion-v12.json`
- Progress JSON: `tmp-paradox-qa-20260710/paradox-local-qa-progress-first20-rs-completion-v12.json`
- Stderr: `tmp-paradox-qa-20260710/first20-rs-completion-v12.err.log` (empty)
- Stdout: `tmp-paradox-qa-20260710/first20-rs-completion-v12.out.log`
- Screenshots: `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-*.png`

Important screenshots:
- `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-rs-339-turn-20-map-probe-overview.png`
- `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-rs-358-turn-20-command-surface.png`
- `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-rs-359-turn-20-decision-room.png`
- `tmp-paradox-qa-20260710/screenshots/first20-rs-completion-v12-rs-384-playthrough-final.png`

Completed friction-resolution replay:
- JSON: `tmp-paradox-qa-20260710/paradox-local-qa-first20-rs-friction-resolved-v6-turnflow.json`
- Screenshots: `tmp-paradox-qa-20260710/screenshots/first20-rs-friction-resolved-v6-turnflow-*.png`
- Run result: RS reached turn 20 with 51 screenshots, 0 console messages, 0 failed/flagged actions, and 0 final paramilitary requests.

Run summary:
- 385 captured events / screenshots.
- Final state: turn 20, phase `war`, player faction `RS`.
- Final pending hard-blocking paramilitary requests: 0.
- Final pending items at the stop point: one advisory event (`milosevic_isolation_warning_aug92`) and one unresolved historical-operation proposal (`Operation Kotor Varos`). These were present because the run stopped at turn 20, not because turns 1-20 were blocked.
- Action counts: `advance-turn-modal: 20`, `continue-aftermath: 14`, `review-blockers: 14`, `paramilitary-deny-all-submit: 14`, `acknowledge-event: 1`.
- Console output: one non-fatal MapLibre warning, `Map cannot fit within canvas with the given bounds, padding, and/or offset.`

Krajina counter evidence:

| Checkpoint | Rendered counters | Owned formations | Located owned | Fielded owned | Krajina owned | Krajina RS counters rendered |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Initial overview | 132 | 103 | 95 | 77 | 48 | 17 |
| Turn 1 overview | 132 | 105 | 95 | 77 | 48 | 17 |
| Turn 5 overview | 142 | 103 | 93 | 78 | 47 | 17 |
| Turn 10 overview | 120 | 88 | 78 | 78 | 47 | 17 |
| Turn 15 overview | 121 | 89 | 78 | 78 | 47 | 17 |
| Turn 20 overview | 104 | 90 | 79 | 79 | 47 | 17 |

Representative Krajina counters visible across checkpoints included `rs_11th_dubica_infantry`, `rs_11th_krupa_light_infantry`, `rs_12th_kotorsko_light_infantry`, `rs_16th_krajina_motorized`, and `rs_19th_krajina_light_infantry`.

## Executive Result

The first 20 RS turns are locally playable after the repair pass. The previous hard failures were not reproduced in the completed v12 run:

- Starting a fresh RS campaign no longer loops back to the starting-faction screen in the automated path.
- Brigade counters render on the map; Krajina is not empty.
- Paramilitary packets can be denied and then clear; final decisions no longer remain as unresolved blockers.
- Historical operation authorization reviews are advisory and do not block ending the turn.
- Decision Room cards are less duplicative: operational situation cards distinguish their underlying warning, and the dossier action now uses `Open summary` instead of a misleading same-surface `Review`.
- The Warroom/Command Surface/Decision Room route tour no longer carries tactical stack overlays into unrelated screenshots.

Small agent-actionable defects found during the pass were corrected locally. The owner-promoted friction follow-up was also completed locally after this diary's first pass; see `docs/plans/2026-07-10-first-20-turn-friction-resolution-plan.md`.

## Corrected Findings

| ID | Finding | Status |
| --- | --- | --- |
| F20-001 | Paramilitary request mode was not persisted, so offensive and rear-pocket requests could render as the wrong class. | Fixed locally with state fields and regression coverage. |
| F20-002 | Already-decided paramilitary rows could still be derived as unresolved manifest/blocker work. | Fixed locally in manifest, adapter, inbox, pre-advance, Decision Room, and desktop autonomy paths. |
| F20-003 | Advisory event-decision inbox copy said the player response was required. | Fixed locally; advisory rows now say they are available for review. |
| F20-004 | Historical operation proposals had generic briefing text and did not expose goals, command, commander, force, staging, timing, or provenance. | Fixed locally for pre-planned, triggered, and Army-HQ-marked operations, including `Operation Kotor Varos`. |
| F20-005 | Direct Warroom iframe document access emitted a cross-origin warning in Electron/dev-host combinations. | Fixed locally with same-origin guard and postMessage handoff retained. |
| F20-006 | Warroom/Decision Room navigation could inherit transient tactical overlays from stack expansion or inspection panels. | Fixed locally for app route cleanup and harness surface tours. |
| F20-007 | The local QA harness underreported event decisions and could overrun target-turn evidence. | Fixed locally in the untracked QA harness; v12 is exact turn 20. |

## Residual Friction

| Item | Surface | Blocks play? | Follow-up |
| --- | --- | --- | --- |
| Repeated early paramilitary packets produce paperwork cadence. | Presidential blockers / paramilitary authorization | No | Resolved locally by packet-only vs standing-policy controls, desktop IPC policy persistence, save-migration preservation of `paramilitary_policy`, and standing-policy cleanup in rear/offensive sweeps. |
| The final map can still have a `Command Briefing` overlay open after reviewing blockers until the player dismisses it. | War Map | No | Resolved locally by suppressing the Command Briefing for the current turn when tactical review overlays are cleared. |
| A `Review`/selected-card action can appear inert when the selected item is already open. | Decision Room | No | Resolved locally by rendering selected same-dossier actions as disabled `Current Dossier`. |
| Compact map, OOB, and side-panel rows still intentionally truncate some long labels. | Map / Army HQ compact rows | No | Primary Decision Room text is wrapped locally; compact secondary OOB/map labels remain intentionally dense and should be audited only when primary decision text is unreadable. |
| One MapLibre fit warning appears during the run. | Console | No | Resolved locally by clamping map/operation-map padding and guarding degenerate fit bounds; v6 replay had 0 console messages. |

## Friction Follow-Up Closeout

The owner-promoted follow-up is completed locally under `docs/plans/2026-07-10-first-20-turn-friction-resolution-plan.md`.

Completed fixes:
- Standing paramilitary policy controls: `Deny packet`, `Allow packet`, `Always deny`, and `Always allow`.
- Desktop IPC and main-process persistence for standing policy submission.
- Save migration now preserves `ask` / `always_deny` / `always_allow` strings instead of clobbering them to `{}`.
- Rear-pocket and offensive paramilitary sweeps consume stale player requests before fade-week returns when standing policy is active.
- Command Briefing no longer lingers over the map after blocker-review cleanup.
- Same-dossier Decision Room actions show `Current Dossier` and are disabled instead of appearing inert.
- Primary Decision Room source/advance/same-surface text wraps.
- Main and operation map camera fit calls clamp padding and use degenerate-bound fallbacks.
- Turn Aftermath persistent footer actions keep the accessible label `Next presidential action` so the broader player-journey gate and screen-reader contract match the visible decision flow.

Additional verification:
- `npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/save_migration.test.ts --pool=forks --reporter=dot` - 2 files / 44 tests passed after red/green coverage.
- `npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/player_decision_manifest.test.ts tests/ui/paramilitary_inbox_items.test.ts tests/ui/inbox_items.test.ts tests/desktop_persistence_contract.test.ts tests/save_migration.test.ts tests/ui/paramilitary_review_modal.test.ts tests/ui/paramilitary_review_modal_i18n.test.ts tests/ui/decision_room_flat_contract.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/warroom_shell_accessibility.test.ts tests/ui_map_deck_counter_visibility.test.ts tests/ui_map_game_state_adapter.test.ts --pool=forks --reporter=dot` - 15 files / 316 tests passed.
- `npx.cmd vitest run tests/ui/turn_aftermath_modal_i18n.test.ts --pool=forks --reporter=dot` - 1 file / 9 tests passed after the broader gate found stale action aria copy.
- `npm.cmd run qa:player-journeys` - 44 files / 718 tests passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run desktop:release:check` - passed.
- `node tmp-paradox-qa-20260710\paradox-local-qa.cjs --faction=RS --turns=20 --label=first20-rs-friction-resolved-v6-turnflow --skip-initial-tour --no-checkpoint-tour` - reached turn 20, 0 console messages, 0 flagged actions, 0 final paramilitary requests.

## Presidential Feel Grade

| Field | Entry |
| --- | --- |
| Did I feel like the President? | 3 / 5 |
| One-sentence reason | The command loop is functional and information-rich, but repeated modal handling still feels more administrative than strategic. |
| Would I play the next 10 turns tomorrow unprompted? | Yes for QA; for pleasure, the packet cadence still needs smoothing. |

## Verification

Completed after the local fixes:
- `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui/inbox_items.test.ts tests/triggered_operations.test.ts --pool=forks --reporter=dot` - 3 files / 125 tests passed.
- `npm.cmd run typecheck` - passed.
- `node --check tmp-paradox-qa-20260710\paradox-local-qa.cjs` - passed.
- `npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/player_decision_manifest.test.ts tests/ui/paramilitary_inbox_items.test.ts tests/ui/inbox_items.test.ts tests/ui/dev_host_consistency.test.ts tests/desktop_autonomy_boundary_truth.test.ts tests/ui/decision_surface_registry.test.ts tests/ui/president_desk_shell.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_blockers.test.ts tests/ui/presidential_decision_room.test.ts tests/operation_opportunities_phase2_decisions.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/warroom_shell_accessibility.test.ts --pool=forks --reporter=dot` - 14 files / 262 tests passed.
- `npm.cmd run desktop:release:check` - passed.

## Triage Outcome

| Rank | Accepted follow-up | Status |
| --- | --- | --- |
| 1 | Fix paramilitary truth/stale blockers. | Completed locally. |
| 2 | Fix advisory event-decision copy. | Completed locally. |
| 3 | Add richer historical operation dossiers for operation authorization reviews. | Completed locally. |
| 4 | Fix QA harness exact-turn/surface truth and record completed first-20 evidence. | Completed locally. |
| 5 | Reduce early repeated packet cadence. | Completed locally in the owner-promoted friction follow-up. |
