# Architect Notes

Purpose: repo-local architect board for active findings, accepted direction, and outstanding infrastructure. This is not a session log. Keep it current enough that prompt generation and review do not depend on chat memory.

## Current Product Direction

- The player is the faction president.
- Default play is presidential:
  - strategic guidance
  - reserve allocation
  - plan approval / denial
  - directives to Army HQ / corps
  - selective intervention
- Direct brigade-level control is exceptional override, not baseline fantasy.
- Operations are the spikes of excitement.
- Events, delegation, reserve decisions, and command review are the tension between spikes.

## Accepted Findings

### Wrong Now

- Command abstraction is still not fully singular across engine, UI, and reports.
- Sector semantics still need finishing: sectors must remain frontlines, not slide back into territory buckets.
- Reporting/activity truth still has proxy-driven surfaces that can drift from canonical phase outputs.
- Warroom / Army HQ / Tactical Map shell ownership is improved but not finished.

### Strong Systems To Push Harder

- Operation preparation is one of the game's signature mechanics and should remain central.
- Army-level reserve loans create real scarcity and presidential decision weight.
- Constrained institutional command is the game's core identity and should shape future UX/mechanics.
- Best 10x direction: make operations + sectors + command review the center of play.

## Active / Recent Accepted Lanes

- **Command Review Consolidation Wave 2 (Wave 9)** — CLOSED. `buildOperationTrendSummary()` + `OperationTrendSummary` in `command_strain.ts`; three-tier `OutcomeCategoryBadge` on completed op cards in `OperationHistoryPanel`; compact trend line in history tab header; Command Record narrative distinguishes all three tiers; 7 Wave 9 tests pass. Silence=healthy preserved. Report: `docs/40_reports/implemented/20260404_COMMAND_REVIEW_CONSOLIDATION_WAVE2.md`.
- **Command Chain Truth Wave 2** — GAP 1: demotion loop in `corps_front_sectors.ts` now clears `formation.assigned_sub_segment_id` on demoted brigades; GAP 2: `GameStateAdapter` builds reverse map from `corps_front_sectors` sub_segments before formations loop — canonical sector truth drives UI, formation field is fallback only. 6 regression tests in `sector_frontline_truth_wave2.test.ts`. Report: `docs/40_reports/implemented/20260404_COMMAND_CHAIN_TRUTH_WAVE2.md`.
- `063ddaca`+`4a129b9b` **Command Chain Truth Wave 1** — Phase 1.5 front-adjacency guard (territory match alone insufficient; BFS ≤30 hops required before assigned); assertBrigadeReachability returns actionable string[] (caller demotes unreachable to reserve); brigade_front_assignment dead-writer comment (canonical block + preserved JSDoc contract text); ensureMinimumSectorCoverage hop-ceiling comment; generateThreatAssessment intel-fog comment; 9 regression tests. Pre-existing failures confirmed unchanged. Report: `docs/40_reports/implemented/20260404_COMMAND_CHAIN_TRUTH_WAVE1.md`.
- Wave 4 Presidential Command Friction — Stabilize Command Relationship action (pay CA, resolve all friction at once, 3-turn cooldown); strain-gated stance (offensive blocked when compromised ≥6); CommandManagementSection new collapsible component; IPC-side stance gate enforced in stage-corps-stance-order; 119/119 tests pass; tsc clean; governance OK
- Notification delivery fix (post-Wave 4) — notify.ps1 rewritten; canonical method is WScript.Shell Popup (confirmed working on Windows 11 Pro 10.0.26200); BurntToast/msg*/WinRT all fail on this machine; run_handoff.ps1 captures [notify] output and prints Notify log line in runner summary
- Desktop notification contract repair — popup moved from Stop hook (on_stop.ps1) to run_handoff.ps1 end. Stop hook fires before artifacts are written; sole canonical trigger is now run_handoff.ps1 after response.md + meta.json + architect_review.json + Slack are all committed. completion_signal.json write retained in on_stop.ps1 for diagnostics. Notification lane: CLOSED.
- `36bb32c0`+`831778ea`+`1cb68fc8` Presidential Command Friction Wave 3 — friction resolution loop closed: IPC handler acknowledge-friction-event sets resolved:true; adapter exposes FrictionEventView[]; ArmyHQCorpsCard back face shows per-event Acknowledge buttons; front face FRICTION ACTIVE badge demoted to dot indicator; back face is canonical friction detail surface; 90 tests pass
- `c689ba74`+`387da70b`+`45feea0d`+`7d8006ac` Presidential Command Friction Wave 2 — strain-shaped CoS briefing paragraph, OperationsSection command-risk notice, OperationBriefingModal compound warning; silence=healthy at all three surfaces
- `44356235`+`59b9f2f7`+`16a0726b`+`37668647` Presidential Command Friction Wave 1 — command strain visibility + warlord friction surfaced + institutional story in ops review
- `3a80f60a` map-first usability restoration
- `962414fc` player-knowledge integrity wave 1
- `25cea9ea` presidential command doctrine codification
- `1ae662de` presidential shell language + roadmap reminder
- `a8c982c9` army HQ presidential shell behavior
- `992328de` command authority vertical slice
- `dcdc5156` first full presidential command-review loop
- `c0e3eea8` first playable between-ops presidential decisions
- `37698eb5` + `f4cfe051` player-knowledge integrity wave 2

## Next Priority Lanes

1. **CLOSED 2026-04-04** — Command Chain Truth Package (v0.8.0.x stabilization lane). All 6 plan phases landed across Waves 1–4.
   - Canonical owner: `corps_front_sectors` and its truthful downstream consumers.
   - Demoted path: legacy proxy/fallback paths removed or explicitly annotated compatibility-only.
   - Test count: 29 regression tests across `sector_frontline_truth_wave1–4.test.ts` lock all invariants I1–I9.
   - Wave 1 (2026-04-04): Phase 1.5 front-adjacency guard (BFS ≤30 hops), assertBrigadeReachability actionable return, dead brigade_front_assignment write confirmed, displacement double-count guard verified.
   - Wave 2 (2026-04-04): GAP 1 demotion clears assigned_sub_segment_id; GAP 2 adapter canonical-first sub-segment derivation. 6 regression tests.
   - Wave 3 (2026-04-04): Displacement trigger proxy-fork observable (console.warn); activity zero-fill; activity summary fidelity. 7 regression tests.
   - Wave 4 (2026-04-04): 3 gap-filler regression tests (assertBrigadeReachability topology stress, adapter re-assignment fidelity, proxy/canonical pressure_eligible_size parity); MASTER_ROADMAP, plan doc, SECTOR_MASTER, architect_notes all updated. Lane closed.
   - Wave 5 CI-integration candidates noted as minor future hardening (not a lane re-open).
   - Plan: `docs/plans/2026-04-03-v080x-sector-frontline-truth-plan.md`

2. **CLOSED 2026-04-04** — Presidential Command Friction Wave 4 complete.
   - Stabilize Command Relationship: pay CA (10/15), resolve all friction at once, 3-turn cooldown
   - Strain-gated stance: offensive locked when compromised, IPC-side enforcement
   - CommandManagementSection: new collapsible component, silence=healthy
   - notify.ps1: native Windows toast fallback added

3. **CLOSED 2026-04-04** — Presidential Command Friction Wave 5 / Wave 10 (Standing + Decay Preview + CA Consequence).
   - `projectStrainDecay` + `deriveRecoveryForecast` in command_strain.ts — strain projection over future turns
   - `CommandRelationshipSection` (new): consolidated standing indicator with strain status, recovery forecast, friction count, stance constraint notice. Silence=healthy.
   - CA recovery penalty in `recover-command-authority` step: 0.5 per recent intervention/friction, capped at full recovery loss. Inline approximation (no UI imports).
   - CommandManagementSection: stance constraint notice removed (Standing section owns it). OperationsSection: command-risk demoted to inline.
   - 10 Wave 10 tests; 179/179 pass.

- **CLOSED 2026-04-04** — **Order Interpretation Preview Loop (Wave 5)**
   - Gap: clean-approval launches showed no strain context. `DirectInterventionSection` only fires on override path.
   - `deriveOrderInterpretation` added to `command_strain.ts`: severity (normal/caution/alarm), cautionNotice (null=healthy), interventionStrength.
   - `OrderInterpretationSection` (new): amber/red bordered notice, staff-briefing prose, silence=healthy, no buttons.
   - Wired into `OperationBriefingModal` after CommandRecord, before DirectInterventionSection, planning phase only.
   - 12 tests in `Wave 5: Order Interpretation Preview` block in `command_authority.test.ts`.
   - Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_PREVIEW_LOOP.md`

- **CLOSED 2026-04-04** — **Operation Outcome Category (Order Interpretation Preview Loop Wave 3 / Command Friction Wave 7)**
   - Gap: `CommandRecord` collapsed ordinary approval and reluctant compliance into a single "Approved" badge, hiding the case where the president launched against the commander's recommendation without spending CA.
   - `deriveOperationOutcomeCategory` + `OperationOutcomeCategory` type added to `command_strain.ts` (Wave 7 block): pure derivation, three tiers — `ordinary_compliance` / `reluctant_compliance` / `direct_intervention`.
   - `CommandRecord` in `OperationBriefingModal.tsx` upgraded to three-tier display: green Ordinary Compliance, amber-light Approved Against Recommendation (+ Interpretation row), amber-bold Direct Intervention.
   - "⚠ Overrode Command Chain" → "⚠ Direct Intervention" (canonical terminology).
   - Silence = healthy: ordinary_compliance shows clean green badge, no explanation row.
   - CA cost row and institutional strain follow-through remain gated on `wasForce` only.
   - 8 tests in `Wave 7: Operation Outcome Category` block; 150/150 command_authority tests pass.
   - Report: `docs/40_reports/implemented/20260404_OPERATION_OUTCOME_CATEGORY_WAVE3.md`

- **CLOSED 2026-04-04** — **Command Review Consolidation Wave 8 (Command Review Consolidation Wave 1)**
   - Gap: OperationsSection showed execution status but not the command-decision story — player had to navigate to OperationBriefingModal separately to see outcome category.
   - `OutcomeCategoryBadge` added to `OperationsSection.tsx` executing/recovery op-card headers: silence=healthy for `ordinary_compliance`; amber dim for `reluctant_compliance`; amber bold `⚠ Direct Intervention` for `direct_intervention`. Reuses `deriveOperationOutcomeCategory` from `command_strain.ts`.
   - `[ REVIEW COMMAND DECISION ]` button added to executing/recovery cards where `commander_assessment_at_launch` snapshot exists — opens `OperationBriefingModal` directly from the list via `setOperationBriefingContext`.
   - Button label fix: `[ FORCE LAUNCH — N AUTH ]` → `[ DIRECT INTERVENTION — N AUTH ]` (canonical terminology).
   - 11 tests in `Wave 8: Command Review Consolidation` block; 161 total in `command_authority.test.ts`.
   - Canonical owner: `OperationBriefingModal` (full review via `CommandRecord`). `OperationsSection` = summary surface (outcome badge + modal entry point).
   - Report: `docs/40_reports/implemented/20260404_COMMAND_REVIEW_CONSOLIDATION_WAVE8.md`

- **Wave 9 candidates (post-Wave 8):**
   - Outcome category in operation history / AAR review panel (completed ops may still use two-tier display)
   - Reluctant compliance frequency counter: cumulative "command relationship pressure" indicator
   - Strain decay preview on back face ("strain will drop to X next turn" — decay math already in command_strain.ts)
   - Expand strain sources: corps exhaustion above threshold (grounded in `CorpsState.corps_exhaustion`)
   - Connect strain to CA recovery rate reduction (compromised corps recover CA slower — needs recovery modifier in war_phases.ts)

- **CLOSED 2026-04-04** — **Stance Interpretation Preview (Order Interpretation Preview Loop Wave 2 / Command Friction Wave 6)**
   - Gap: stance dropdown committed immediately with zero preview even when corps was strained + requesting offensive.
   - `deriveStanceInterpretation` added to `command_strain.ts`: severity (normal/caution/constrained), notice (null=healthy), isBlocked.
   - Two-step flow in `ArmyHQCorpsCard`: `pendingStance` state; normal→immediate commit; caution/constrained→show inline panel.
   - Caution (strained+offensive): notice + Confirm/Cancel buttons. Constrained (compromised+offensive): notice + restore message, no confirm.
   - `StanceInterpretationSection` exported from `OrderInterpretationSection.tsx` as pure display scaffolding.
   - 11 tests in `Wave 6: Stance Interpretation Preview` block in `command_authority.test.ts`.
   - Report: `docs/40_reports/implemented/20260404_STANCE_INTERPRETATION_PREVIEW_WAVE2.md`

2. **Wave 6 candidates (post-Wave 5):**
   - Strain decay preview on back face ("strain will drop to X next turn" — decay math already in command_strain.ts, trivial to add)
   - Stance-change interpretation: show strain context when player changes a compromised corps's stance
   - Expand strain sources: corps exhaustion above threshold (grounded in `CorpsState.corps_exhaustion`)
   - Connect strain to CA recovery rate reduction (compromised corps recover CA slower — needs recovery modifier in war_phases.ts)
   - Commander competence penalty from strain (Wave 1 deferred; needs a real competence field to write to cleanly)

2. **CLOSED 2026-04-04** — Warroom React migration complete.
   - Wave 1 (2026-04-03): React WarroomShellLayer foundation, scene plate + hotspot overlays, `?view=warroom` activation. Report: `docs/40_reports/implemented/20260403_WARROOM_REACT_SHELL_FOUNDATION.md`.
   - Wave 1b runtime wiring (2026-04-03): `REACT_SHELL_ENABLED=true`, iframe loads with `?embedded=1&view=warroom`, live room navigation is React. Report: `docs/40_reports/implemented/20260403_WARROOM_REACT_SHELL_ENTRY.md`.
   - Wave 2 (2026-04-03): canvas render loop gated, mouse handlers gated, `advance-turn` wired, `AdvanceTurnModal`. Report: `docs/40_reports/implemented/20260403_WARROOM_REACT_MIGRATION_WAVE2.md`.
   - Wave 3 (2026-04-03): all 5 hotspot groups React-owned, `warroomCommandStaysInRoom()`, `WarroomStatusBar`. Report: `docs/40_reports/implemented/20260403_WARROOM_REACT_MIGRATION_WAVE3.md`.
   - Final deletion (2026-04-04): `REACT_SHELL_ENABLED` deleted, 483 lines of canvas room code removed, 15 methods / 13 fields / 12 imports gone. `warroom.ts` retains only launch/picker/iframe/bridge responsibilities. Report: `docs/40_reports/implemented/20260404_WARROOM_LEGACY_CANVAS_DELETION.md`.
   - **Current state**: React (`src/ui/map/components/warroom/`) is the sole owner of live room rendering, hotspot interaction, and room-level flow. `warroom.ts` owns main menu, side picker, scenario picker, Electron bridge, and iframe lifecycle.
2. **CLOSED 2026-04-04** — Canonicalize live runtime assets to `webp`.
   - 11 dead PNG twins deleted from `src/ui/warroom/assets/` (crest_*, flag_*, game start, wall_map_frame_v1)
   - `vite.config.ts`: `.webp → image/webp` added to dev server MIME map
   - `warroom_resize_assets.ts`: header clarified — art-pipeline only, not live format
   - `_old/` and `raw_sora/` untouched; `src/ui/map/assets/crests/` already clean
   - Report: `docs/40_reports/implemented/20260404_RUNTIME_ASSET_CANONICALIZATION.md`

## Closed Lanes

- Make Command Authority legible inside command review / override flow: CLOSED 2026-04-03.
  - `CommandRecord` in `OperationBriefingModal` is the canonical four-part surface.
  - `commander_assessment_at_launch` is the permanent decision-time snapshot.
  - `ForceLaunchBadge` is demoted to legacy fallback.
  - See `docs/40_reports/implemented/20260403_PRESIDENTIAL_COMMAND_REVIEW_LOOP.md`.

- Continue player-knowledge integrity beyond adapter wave 1: CLOSED 2026-04-03.
  - RawIntelTab removed from normal play.
  - Threat assessment now uses uncertainty-qualified language and bucketed confidence.
  - Remaining candidate later: own-sector force-balance precision in `CorpsFrontPanel`.
  - See `docs/40_reports/implemented/20260403_PLAYER_KNOWLEDGE_INTEGRITY_WAVE2.md`.

- Use event-layer presidential decisions to fill between-operation dead zones: CLOSED 2026-04-03.
  - Strategic Posture Review + Visit to the Front shipped for all 3 factions.
  - EventModal already had correct presidential wording.
  - See `docs/40_reports/implemented/20260403_PRESIDENTIAL_BETWEEN_OPS_EVENTS.md`.

## Infrastructure / Process Watchlist

- `tools/architect/` is now landed and usable as the canonical repo-local architect-to-executor handoff system. Future cleanup should focus on ergonomics and reliability, not whether the system exists.
- Do not rely on chat memory for accepted findings or next lanes; update this file when major architect decisions change.
- Bundle roadmap-memory follow-ups into Claude prompts when they are part of the same lane.
- Explorer findings should be summarized here after review instead of staying only in chat.
- Live Warroom/runtime asset rule: current runtime already imports `.webp` for backgrounds, crests, flags, scenario plates, and wall-map frame. Cleanup target is residue and tooling drift, not a runtime panic. Check `src/ui/warroom/assets` duplicate `.png` twins, `src/ui/warroom/vite.config.ts` MIME handling, and PNG-centric Warroom tooling/docs before claiming the asset pipeline is clean.

## Open Questions

- Which remaining player-facing surfaces still leak staff certainty or internal jargon?
- RESOLVED (wave 3 Warroom): all warroom hotspot groups now have React-owned behavior. Next open question: which in-room overlays should expand (e.g. WarroomStatusBar → richer campaign pulse) vs which should remain pure handoffs.
- RESOLVED (Wave 3 friction): warlord friction resolution now requires player acknowledgement — sets resolved: true via IPC. Unresolved events accumulate until acknowledged; decay already reduces their strain contribution to 0 after 2 turns but they remain visible until acknowledged. Auto-resolve path would conflict with the visible loop.
- RESOLVED (Wave 3 mechanics): command strain remains purely informational through Wave 3. Wave 4 can add a real mechanical consequence (e.g. CA recovery rate reduction for compromised corps) only if grounded in an existing field. No fake modifiers.
- RESOLVED (Wave 4): Stabilize Command Relationship action wired. Player can pay CA to resolve all friction at once with 3-turn cooldown. Stance gate blocks offensive when compromised (strain ≥ 6).
- RESOLVED (Wave 5/10): back face now shows recovery forecast via `projectStrainDecay` + `deriveRecoveryForecast`. CommandRelationshipSection displays "Strain resolving in N turns" or "Recovery: strain drops to N (label) next turn". CA recovery penalty also landed.
- Wave 5 open: what is the right scope for strain sources beyond force-launch and warlord friction? Corps exhaustion (`corps_exhaustion` on CorpsCommandState) could contribute — needs calibration study before adding.
