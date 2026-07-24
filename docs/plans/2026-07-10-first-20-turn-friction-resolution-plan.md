# 2026-07-10 First-20-Turn Friction Resolution Plan

Status: completed local implementation. No staging, commits, pushes, PRs, or packaging.

## Objective

Resolve every residual first-20-turn friction item from the completed RS local QA run that the owner promoted from diary triage to implementation scope. The goal is a clearer first-time-player loop through Desk -> Decision Room -> War Map -> Advance Turn, with fewer repeated modal interruptions, visible review consequences, readable primary text, and no avoidable console-warning noise.

## Evidence Inputs

- Completed first-20 run: `tmp-paradox-qa-20260710/paradox-local-qa-first20-rs-completion-v12.json`
- Friction-resolution fast 20-turn proof: `tmp-paradox-qa-20260710/paradox-local-qa-first20-rs-friction-resolved-v6-turnflow.json`
- Playtest report: `docs/40_reports/playtests/20260710_rs_first20_local_qa.md`
- Prior completed plan: `docs/plans/2026-07-10-first-20-turn-game-review-plan.md`
- Owner directive: remaining friction must be resolved even if previously classified as diary/product follow-up.

## Closeout Evidence

Completed local changes:
- Added packet-only and standing-order paramilitary controls. `Always deny` / `Always allow` persist `state.paramilitary_policy`; packet-only actions leave policy at `ask`.
- Preserved paramilitary standing-policy strings through save migration instead of replacing them with `{}`.
- Resolved stale player paramilitary requests under an active standing policy before rear-pocket and offensive sweeps, including after the relevant fade weeks.
- Suppressed Command Briefing for the current turn when leaving tactical review surfaces so blocker review does not leave a map-obscuring overlay behind.
- Replaced selected same-dossier Decision Room `Review` actions with disabled `Current Dossier` affordances and wrapped primary dossier/source/advance/same-surface text.
- Clamped main-map and operation-map fit padding and guarded degenerate bounds before MapLibre `fitBounds`.

Verification completed:
- `npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/save_migration.test.ts --pool=forks --reporter=dot` - 2 files / 44 tests passed after red/green coverage.
- `npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/player_decision_manifest.test.ts tests/ui/paramilitary_inbox_items.test.ts tests/ui/inbox_items.test.ts tests/desktop_persistence_contract.test.ts tests/save_migration.test.ts tests/ui/paramilitary_review_modal.test.ts tests/ui/paramilitary_review_modal_i18n.test.ts tests/ui/decision_room_flat_contract.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/warroom_shell_ownership.test.ts tests/ui/warroom_shell_accessibility.test.ts tests/ui_map_deck_counter_visibility.test.ts tests/ui_map_game_state_adapter.test.ts --pool=forks --reporter=dot` - 15 files / 316 tests passed.
- `npm.cmd run qa:player-journeys` - 44 files / 718 tests passed after restoring the Turn Aftermath footer action aria label to `Next presidential action`.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run desktop:release:check` - passed.
- `node tmp-paradox-qa-20260710\paradox-local-qa.cjs --faction=RS --turns=20 --label=first20-rs-friction-resolved-v6-turnflow --skip-initial-tour --no-checkpoint-tour` - reached turn 20 as RS, 51 screenshots, 0 console messages, 0 failed/flagged actions, 0 final paramilitary requests, 90 owned formations / 79 located owned formations.

Known stop-point state:
- The v6 run intentionally stopped at turn 20 with one advisory event review (`milosevic_isolation_warning_aug92`) and one advisory historical-operation proposal (`PROP_20_historical_op_triggered_vrs_1st_krajina_operation_kotor_varos`). These were not advance blockers during turns 1-20.
- A deeper v4 checkpoint-tour harness run timed out inside the synthetic Decision Room deep-dive loop at turn 10; the fast v6 turnflow and the focused UI tests supersede it for completion evidence.

## Scope Rules

- Local-only implementation; do not push or open PRs.
- Prefer existing state fields and flows before adding new concepts.
- Preserve deterministic simulation behavior for headless/bot factions.
- Treat copy/readability/action feedback as UI/read-model scope unless a blocking gameplay path requires state changes.
- Update docs and ledger only after verification makes the status truthful.

## Action Items

### F20-FR-001 - Repeated Early Paramilitary Modal Cadence

Status: completed.

Finding:
- The first-20 RS run required repeated denial of early paramilitary packets. The engine already supports `paramilitary_policy`, but the player-facing modal only resolves the current packet, so a player who chooses a consistent policy must repeat the same decision.

Plan:
- Add regression coverage for standing policy submission from `ParamilitaryReviewModal`.
- Extend the desktop IPC payload to accept an optional `policy` of `ask`, `always_deny`, or `always_allow`.
- When a standing policy is submitted, persist it to `state.paramilitary_policy`, apply it to current pending player requests, and rely on existing sweep logic to auto-handle future requests.
- Make modal copy distinguish packet-only actions from standing-order actions.

Acceptance:
- A standing-deny submission clears the current packet, records denied decisions, sets `paramilitary_policy: 'always_deny'`, and future player requests do not reopen the modal.
- A packet-only submission preserves `paramilitary_policy: 'ask'`.

### F20-FR-002 - Command Briefing Overlay Left Open After Blocker Review

Status: completed.

Finding:
- The local run could finish a blocker-review loop with the map still visually covered by the Command Briefing surface, making the final map state look less playable than it was.

Plan:
- Add regression coverage for route cleanup when entering review/blocker surfaces and returning to the map.
- Ensure Decision Room, Desk, Inbox, and advance-blocker review entrypoints close command briefing and tactical overlays before changing surfaces.

Acceptance:
- Opening blocker review cannot leave `Command Briefing` as the active visible overlay on return to War Map.

### F20-FR-003 - Selected Decision-Room Review Action Feels Inert

Status: completed.

Finding:
- Decision Room-owned cards intentionally keep the player in Decision Room, but the visible action can still say `Review` even when the selected dossier is already open. That reads as a dead button.

Plan:
- Add model and panel regression coverage for selected Decision Room-owned cards.
- When a dossier action targets the same selected Decision Room card, render it as an explicit current-dossier affordance and disable the button instead of dispatching a no-op navigation.

Acceptance:
- The selected card no longer presents an active `Review` button that appears to do nothing.
- Source handoff actions still work for real drilldown destinations.

### F20-FR-004 - Primary Text Readability And Truncation

Status: completed.

Finding:
- The Decision Room screenshot showed important source/advance/same-surface text truncating in compact containers.

Plan:
- Add source-level or render tests for primary Decision Room dossier text.
- Replace truncation on primary dossier title/source/advance/same-surface rows with wrapping or `break-words`; keep truncation only for deliberately dense secondary metadata.
- Add `title` attributes only where compact metadata must remain visually clipped.

Acceptance:
- Priority dossier title, source owner/label, advance label, and same-surface card title are readable without relying on hover.

### F20-FR-005 - MapLibre Fit Warning Noise

Status: completed.

Finding:
- The first-20 local run recorded a non-fatal MapLibre `Map cannot fit within canvas with the given bounds, padding, and/or offset` warning.

Plan:
- Add regression coverage around counter-aware camera padding so computed padding cannot leave impossible fit bands.
- Clamp camera padding before `fitBounds` calls when the visible map canvas is too small for current occluders.

Acceptance:
- Fit-bound calls use a safe padding object whose horizontal and vertical sums leave a minimum visible band.

### F20-FR-006 - Fresh Local Playthrough Proof

Status: completed.

Finding:
- The fixes affect the first-20 play loop, so unit tests alone are insufficient.

Plan:
- Run focused Vitest coverage for the changed surfaces.
- Run `npm.cmd run typecheck`.
- Run `npm.cmd run desktop:release:check`.
- Run at least a fresh short local Electron playthrough smoke through repeated early turns. Run a full 20-turn replay if time and runtime conditions permit.

Acceptance:
- Verification evidence is recorded in this plan and the playtest report.
- Any remaining friction is explicit and not represented as fixed.
