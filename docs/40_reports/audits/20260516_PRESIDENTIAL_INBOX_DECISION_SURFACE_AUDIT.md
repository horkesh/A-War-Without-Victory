# Presidential Inbox Decision Surface Audit

**Date:** 2026-05-16  
**Scope:** AAA+++ Phase 0 Track A0, step 2. Read-only audit of player-facing pending decision families against the Presidential Inbox surface, followed by closure of uncovered gaps in the implementation wave documented in `docs/40_reports/implemented/20260516_GUI_PHASE0_DECISION_SURFACE_AND_POLISH.md`.

## Result

The audit found the original paramilitary gap plus two additional decision-capable surfaces that were visible elsewhere but not listed in Presidential Inbox:

- `pending_paramilitary_requests` - now covered by `paramilitary_request` Inbox cards and `ParamilitaryReviewModal`.
- `pendingConvoyDecisions` / `state.military.pending_convoy_decisions` - now covered by `convoy_decision` Inbox cards routing to War Summary `convoys`.
- `pendingDayton` - now covered by a blocking `dayton_negotiation` Inbox card while the Dayton modal remains the must-submit authority.

Second-pass correction: this audit was too narrow because it checked Inbox card coverage, not end-to-end decision-surface correctness. It is superseded by [20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md](20260516_PRESIDENTIAL_DECISION_SURFACE_SECOND_PASS_AUDIT.md), which found residual issues in convoy resolution, event decision faction ownership, and unified gate/counter policy.

## Covered Families

| Family | Inbox coverage | Owning action surface |
|---|---|---|
| Event decisions | `event_decision` | Army HQ briefing / Presidential Attention panel |
| Peace plan | `peace_plan` | `PeacePlanModal` |
| Dayton negotiation | `dayton_negotiation` | `DaytonNegotiationModal` |
| Autonomy proposal reviews | `autonomy_proposal` | `AutonomyPanel` |
| Operation opportunities | `operation_opportunity` | Army HQ opportunity dossier |
| Paramilitary requests | `paramilitary_request` | `ParamilitaryReviewModal` |
| Convoy decisions | `convoy_decision` | War Summary `convoys` section / `SituationTab` convoy actions |
| Reserve requests | `reserve_request` | Army Reserve panel |
| Officer/personnel events | `officer_event` | Army HQ personnel / attention surfaces |

## Non-Decision Pending Fields

- `pending_casualties`: accumulated and drained into operation AARs; not a player decision queue.
- `drain_pending_count`: diagnostic counter for siege morale drain instrumentation.
- `pending_player_requests`: paramilitary report metric; actual decision queue is `pending_paramilitary_requests`.
- UI-local pending fields such as `pendingAttackConfirmation`, replay save sequence/manifest, local `pendingMove`, and local `pendingMandatoryRs`: not engine decision families.

## Verification

- `npx.cmd vitest run tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\ui\paramilitary_inbox_items.test.ts tests\ui\records_button_behavior.test.ts` passed 35/35.
- Integrated regression: `npx.cmd vitest run tests\ui\paramilitary_review_modal.test.ts tests\ui\peace_plan_modal.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\ui\records_button_behavior.test.ts tests\ui\no_unicode_escapes_in_rendered_text.test.ts tests\ui\bottom_status_strip_labels.test.ts tests\ui\error_boundary_isolation.test.ts tests\ui\emergency_posture_confirm.test.ts tests\ui\pause_escape_shortcuts.test.ts tests\ui\gui_polish_typography_floor.test.ts tests\ui\retired_chrome_imports.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui\pre_advance_command_review.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\desktop_persistence_contract.test.ts` passed 81/81.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/chunk warnings.
