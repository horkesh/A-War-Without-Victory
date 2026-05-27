# Event System Presidential Core Upgrade Plan

**Date:** 2026-05-24
**Status:** ACTIVE external-agent execution plan / Workstream A baseline closed, Workstream B evaluator ordering, overflow visibility, loader fail-closed, row-level structural validation, semantic catalog validation, event state shape validation, mutex filtering, and persisted overflow queue slices closed; Workstream E presidential acceptance diagnostic closed
**Owner lane:** Event-system product/engine lane
**Related board row:** `Command Board -> Event system presidential core upgrade`
**Do not collide with:** calibration / army-arc branch. The 2026-05-25 presidential GUI restructure is merged; use its Decision Surface Registry, President's Desk, modal stack rules, and consequence ledger instead of inventing another decision surface.

## Purpose

Upgrade the event system from a mostly functional event/catalog substrate into the primary presidential-impact layer of AWWV. The target player experience is:

- some events are no-choice consequence or external-history receipts;
- some events are multi-choice presidential decisions;
- choices alter flags, dimensions, constraints, modifiers, downstream event eligibility, and endgame/cost interpretation;
- historical outcomes emerge through pressure, state prerequisites, and bot historical defaults rather than calendar railroading.
- when a player-facing decision event fires, a non-dismissible modal opens directly on the player's screen with the situation, evidence, presidential rationale, historical baseline, options, numeric/mechanical consequences, uncertainty, and the future record trail.

The current substrate is not being replaced. The plan hardens the existing event loader/evaluator/resolver, then adds authoring taxonomy, richer presidential decision projection, pressure/dilemma authoring, and acceptance tests.

## Emergence-First Rule

Events should be emergent wherever the engine has enough live state to justify them. Calendar windows are allowed as historical guardrails, not as the primary cause of ordinary war, diplomacy, enclave, patron, alliance, or command crises.

Authoring priority:

1. Live-state pressure first: control, siege/enclave status, supply, casualties, displacement, alliance level, patron pressure, morale/cohesion, operation history, strategic-depth state, and decision flags.
2. Historical validity windows second: dates constrain plausibility, but should not fire a crisis by themselves unless the event is genuinely external.
3. Calendar-only last: reserved for exogenous events such as international resolutions, external patron decisions, peace-conference openings, or historically fixed diplomatic interventions that do not depend on battlefield state.

Every new event packet must classify its trigger as one of:

- `state_pressure_primary`
- `state_plus_historical_window`
- `external_calendar_guardrail`
- `legacy_calendar_pending_conversion`

`legacy_calendar_pending_conversion` is a debt marker, not a finished authoring state.

## Current Verified Baseline

- Event catalog: 247 valid events across `war_1992.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`, and `consequences.json`.
- Current shape: 44 events with `response_options`, 203 no-choice events.
- Required-response modal authoring: 17/36 rows are production modal-ready as of 2026-05-26. The catalog remains `NOT_READY`; the remaining 19 required-response rows are gated by sensitive-history approval, source/design default blockers, counterfactual-default blockers, or 188-week/endgame proof. Use `docs/40_reports/proposals/20260526_EVENT_MODAL_GATED_DECISION_PACKET.md` before authoring any additional row.
- Workstream A taxonomy baseline is closed as of 2026-05-27. `tools/diagnostics/event_taxonomy_report.ts` is the pure catalog report used by `tools/diagnostics/event_acceptance_report.ts`; it preserves stable file order, deterministic row sorting, duplicate-id checks across all five files, required-response ownership checks, response option ID/label checks, effect/condition vocabulary checks including pressure modifiers, missing historical-source findings for historically specific rows, sensitive-history presidential-decision blocking, catalog action classification, and legacy-calendar debt blocking for finished rows. Current diagnostic output: 247 rows, 44 choice events, 36 required-response rows, 17 modal-ready rows, 180 warnings, 0 errors.
- Choice ownership: RBiH 20, RS 18, HRHB 6.
- GUI substrate: the 2026-05-25 presidential desk merge and 2026-05-26 event-modal proof provide President's Desk, central Decision Surface Registry, direct hard-blocker modal routing, modal stack priority, consequence-ledger/Records/Chronicle trails, data-driven modal catalog coverage, and live browser-shell proof that player event decisions open directly as modal dossiers.
- Canon target from `Game_Bible_v0_9_0.md`: roughly 60% decision / 30% consequence / 10% forced events.
- Current design gap: about 18% choice events, too many calendar/headline rows, too few pressure-driven presidential dilemmas.
- Presentation gap: the modal-first substrate and 17 production-authored rows now have EU-style explicit historical/default markers, authored narration, visible citations/source notes, staff assessment, trigger evidence, and numeric consequence previews. Remaining presentation work is gated content approval, not generic modal substrate.
- Engine/spec gap: live code uses a 4-event cap with same-turn mutex filtering, overflow diagnostics, and v22 persisted overflow queueing. Runtime semantic catalog validation now fails closed for registered effect/condition vocabulary, declared enum/range fields, duplicate ids, and unresolved event references.
- Acceptance proof gap: Workstream E now has a deterministic presidential routing diagnostic proving the 17 current production modal-ready rows surface for the responding player, resolve to player decision logs, and auto-resolve headlessly on historical defaults. Catalog readiness remains `NOT_READY` because 19 required-response rows still need gated content/source/default decisions.
- Current technical blockers:
  - `evaluateEvents` caps fireable events at 4 per turn. Overflow is visible through additive report fields; same-turn `mutex_group` siblings are filtered before the cap; and ids delayed only by the cap persist in `military.event_overflow_queue` for re-evaluation on later turns.
  - Mutex/overflow behavior is packeted at `docs/40_reports/proposals/20260527_EVENT_MUTEX_OVERFLOW_DECISION_PACKET.md`; persisted overflow queueing is implemented from `docs/40_reports/proposals/20260527_EVENT_OVERFLOW_QUEUE_SCHEMA_PACKET.md` as save schema v22.
  - Loader structural validation now rejects missing/blank ids, malformed triggers, non-finite turn bounds, malformed `requires_events`, missing/kindless primary effects, malformed effect arrays, and malformed response-option id/label/effects arrays.
  - Semantic catalog validation now shares effect/condition/faction vocabulary between loader and taxonomy and rejects unknown runtime semantics before the `EventDefinition[]` cast.
  - Taxonomy remains the owner for sensitive-history policy, modal readiness, source/default blocking, and trigger-authoring classification.
  - Further required-response modal authoring is blocked until the exact historical/default label and prose boundary are approved for the remaining sensitive, counterfactual, abstract, or source-weak rows.
  - `validateGameStateShape` now covers `pending_event_notifications`, `pending_event_decisions`, `event_decision_log`, `event_aggression_modifiers`, `recruitment_modifiers`, and `equipment_quality_modifiers` when present.
  - some event condition/type fields are declared but weakly tested or partially implemented.

## Non-Goals

- No operation outcome tuning.
- No HVO/HV calibration work in this lane.
- No new faction IDs. HV remains HRHB-attached phantom/substrate where relevant.
- No initial OSID overrides.
- No `avoided_osids_by_faction`.
- No 7th Corps simulation.
- No sensitive-history leverification: atrocity remains consequence/reflection, not an optimization button.
- No FORAWWV edits.
- No broad GUI shell rewrite; player-facing decision work must reuse the merged President's Desk, Decision Surface Registry, existing modal stack, and consequence ledger.
- No hidden model reasoning text. The modal should show player-facing rationale, evidence, staff assessment, historical baseline, and consequence explanation.

## External-Agent Execution Contract

This plan is executable by an external agent without clarifying questions. The agent must treat the work as sequential implementation slices, not one broad refactor.

**Overseer:** Orchestrator
**Primary owner lane:** Event-system product/engine lane
**Branch collision rule:** before any code change, confirm the active branch is not the calibration / army-arc branch and is not the GUI polish branch unless explicitly handed off.

Session start requirements:

- [ ] Run `git status --short --branch`.
- [ ] Read `.claude/napkin.md`.
- [ ] Read `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`.
- [ ] Read this plan in full.
- [ ] Read `docs/plans/COMMAND_BOARD.md` row `Event system presidential core upgrade`.
- [ ] Read `docs/40_reports/GUI_MASTER.md` and `docs/plans/2026-05-24-gui-shell-reorganization-scope.md` current implementation evidence so event work uses the landed President's Desk/modal registry instead of reopening GUI ownership.
- [ ] Read `docs/plans/MASTER_ROADMAP.md` latest event-system addendum.
- [ ] Inspect current event-system files before editing:
  - `src/sim/events/event_types.ts`
  - `src/sim/events/event_loader.ts`
  - `src/sim/events/evaluate_events.ts`
  - `src/sim/events/resolve_decision.ts`
  - `src/sim/events/apply_effects.ts`
  - `src/state/player_decision_manifest.ts`
  - `src/state/game_state.ts`
  - `src/state/validateGameState.ts`
  - `data/scenarios/events/war_1992.json`
  - `data/scenarios/events/war_1993.json`
  - `data/scenarios/events/war_1994.json`
  - `data/scenarios/events/war_1995.json`
  - `data/scenarios/events/consequences.json`

Global stop rule: if any task needs a canon ruling, sensitive-history judgment, GUI ownership decision, save-schema decision, or calendar-vs-state design decision not already resolved here, stop and produce a decision packet instead of improvising.

## Task Boundary Rules for External Agents

- Phase 1 / Workstream A may add diagnostics/tests only; it must not alter event firing.
- Phase 2 / Workstream B may alter loader/evaluator safety but must not add historical content.
- Phase 3 / Workstream C must make required event decisions modal-first and may enrich the modal payload/read model; it must not create a new decision authority.
- Phase 4 / Workstream E must establish acceptance proof before Phase 5 content expansion.
- Phase 5 / Workstream D must proceed one historical packet at a time; do not batch multiple theaters or years into one commit.
- Any save-shape change requires migration/default/validator tests in the same slice.
- Any scenario hash drift requires an explanation tied to event ordering, queueing, migration/defaults, bot-choice policy, or authored content before acceptance.

## Workstream A - Contract, Inventory, and Taxonomy

**Goal:** make the catalog auditable before expanding it.

File targets:

- Add `tools/diagnostics/event_taxonomy_report.ts` or `.cjs`.
- Add `tests/sim/events/event_taxonomy_report.test.ts` or a root `tests/event_taxonomy_report.test.ts`.
- Extend `tests/event_timeline_integrity.test.ts` only for catalog-wide contract checks that belong there.

Diagnostic rows must include:

- file, id, title, category, trigger window;
- respondent faction;
- choice count;
- `requires_player_response`;
- pressure vs calendar/state trigger;
- trigger emergence class;
- effect kinds;
- flags and dimension shifts;
- notification coverage;
- historical source status;
- sensitive-history ring if applicable;
- row classification: keep, rewrite, cut, source-blocked, sensitive-gated.

Tests to write first:

- Report reads exactly these files in stable order: `war_1992.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`, `consequences.json`.
- Every row has deterministic taxonomy output sorted by `(file, trigger.turn_min ?? MAX_SAFE_INTEGER, id)`.
- Duplicate IDs fail across all five files, including `consequences.json`.
- Required response rows require `responding_faction`.
- Response options require unique non-empty IDs and labels. If absent `effects` is preserved, make that allowance explicit.
- Unknown `effect.kind` and condition type fail.
- Historically specific rows with `historical_source` missing are reported, not auto-fixed.
- Sensitive-history taxonomy must never classify a player-selectable atrocity lever as a valid `presidential_decision`.
- Finished rows must not keep `legacy_calendar_pending_conversion`.

Implementation order:

1. Build pure collector functions: `loadCatalogRows()`, `classifyTriggerEmergence()`, `classifyEventTaxonomy()`, `collectCatalogFindings()`.
2. Add CLI output modes: human text default and `--json` for tests.
3. Keep this phase behavior-neutral: no changes to `evaluateEvents`, event data, or loader behavior.
4. Use the diagnostic to produce the initial inventory baseline; freeze expected totals in tests only if the catalog is stable enough.

Verification:

```powershell
node <new event taxonomy diagnostic>
npx.cmd vitest run <new focused catalog taxonomy test> --reporter=dot
npm.cmd run typecheck
```

Baseline regression is not required if this is diagnostic/test-only and does not change event firing, catalog rows, scenario output, save shape, or generated artifacts.

Stop gates:

- Any taxonomy that would make atrocity a player lever.
- Any historical classification without source support.
- Any diagnostic that changes current fired-event behavior.

## Workstream B - Engine Safety Hardening

**Goal:** make the current event substrate safe enough to carry more presidential weight.

File targets:

- `src/sim/events/event_loader.ts`
- `src/sim/events/evaluate_events.ts`
- `src/sim/events/event_types.ts`
- `src/state/validateGameState.ts`
- `src/state/game_state.ts`
- `tests/events_evaluate.test.ts`
- new `tests/event_loader.test.ts`
- new `tests/state/event_save_shape_validation.test.ts` if validation changes

Tests to write first:

- Loader throws for missing required event files in dev/test path.
- Loader throws for malformed JSON and non-array JSON.
- Candidate ordering tie-break is `priority`, then `trigger.turn_min ?? MAX_SAFE_INTEGER`, then deterministic event ID compare.
- Five same-priority same-turn events fire deterministically and expose overflow/crowding through a diagnostic field before behavior changes.
- `mutex_group` allows only one event per group per turn, chosen by canonical ordering, or the plan explicitly records why mutex remains catalog debt.
- Recurrence max/cooldown remains deterministic.
- `available_from_fire` / `unavailable_after_fire` response options are filtered or explicitly rejected by catalog validation until implemented.
- `event_decision_log` records bot and player paths with stable fields.
- Save validator rejects malformed `pending_event_decisions`, `event_decision_log`, active modifier arrays, and `pending_event_notifications`.

Implementation order:

1. Extract `compareEventCandidates(a, b)` from evaluator and test it directly.
2. Add overflow visibility without changing firing behavior: extend `EventsEvaluationReport` with fields such as `candidates_considered`, `overflowed`, and `overflowed_ids`; ensure existing callers tolerate extra fields.
3. Apply canonical sort before slicing.
4. Implement `mutex_group` filtering after sort and before cap, or stop with a canon/spec decision packet if live behavior cannot match `Systems_Manual_v0_9_0.md`.
5. Harden loader with explicit throwing path; keep any production/backcompat escape explicit, named, and tested.
6. Add save-shape validation for event fields.
7. Only after diagnostics show current crowding impact, choose queue/backlog versus strict authoring gate. Do not silently change scenario output.

Verification:

```powershell
node node_modules\vitest\vitest.mjs run tests/events_evaluate.test.ts tests/event_decisions.test.ts tests/event_effects.test.ts tests/event_timeline_integrity.test.ts tests/player_decision_manifest.test.ts --reporter=dot
npx.cmd vitest run tests/determinism_static_scan_r1_5.test.ts --reporter=dot
npm.cmd run typecheck
```

If persistent fields change, also run:

```powershell
node tools\diagnostics\save_migration_drift_audit.cjs
npx.cmd vitest run tests\save_migration.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\startup_snapshot_contract.test.ts --reporter=dot
npm.cmd run desktop:startup-snapshot:build
npm.cmd run typecheck
```

Baseline regression is required if any of these change:

- `evaluateEvents` ordering, cap, overflow/backlog behavior, mutex, recurrence, or response availability;
- event loader failure mode changes scenario startup/firing;
- event effect application changes;
- defaults/migrations can influence scenarios, bot choice, event queueing, active modifiers, notifications, or calibration.

Run:

```powershell
npm.cmd run test:baselines
```

If output drift is intended, do not refresh blindly. Require documented approval, then:

```powershell
npm.cmd run test:baselines -- --update
npm.cmd run test:baselines
```

Stop gates:

- Scenario hash drift without an understood event-ordering reason.
- New save fields without migration/default/validator coverage.
- Any bypass of canonical `evaluate-events` pipeline entrypoint.
- Implementation contradicts Systems Manual cap/queue/mutex text without explicit plan/doc update.

## Workstream C - Modal-First Presidential Event Decisions

**Goal:** when a player-facing event decision fires, the player is clearly interrupted by a full presidential decision modal. The modal is the primary resolver. President's Desk, Inbox, Advance Clearance, Warroom docket, Records, and Chronicle may summarize or deep-link, but they must not be the only place the player learns what happened.

Architecture:

- Blocking execution stays in `src/ui/map/components/EventDecisionModal.tsx` and `src/ui/map/App.tsx`.
- `App.tsx` already auto-launches the first player-faction `pendingEventDecisions` entry; this work hardens that contract and tests it as a must-not-regress rule.
- Inbox/Desk/Advance/Warroom routes stay projections through the merged `decisionSurfaceRegistry.ts`, `presidentialBlockers.ts`, `preAdvanceCommandReview.ts`, and `warroomPriorityDocket.ts`.
- Decision Room may retain staff-priority synthesis, but it must not be the primary event resolver.
- Consequences route through the merged decision consequence ledger, Army HQ Records, and Chronicle decision ledger; do not create a second event-history owner.

Required modal payload:

- situation: title, narrative, category, respondent faction, turn/date, source context;
- why this is on the president's desk: live-state trigger evidence, prerequisite flags/events, relevant pressure metrics, and staff assessment;
- historical baseline: which option is historical, why bots choose it for calibration, and what historical/default path the current run is being compared against;
- options: every response label plus short policy meaning; the historical/default option must be visibly marked in the modal in an EU-style way, such as `Historical choice`, `Historical default`, or `AI historical path`;
- numeric/mechanical consequences: flags set, dimension shifts, morale/cohesion/supply/patron/alliance/equipment/constraint modifiers, duration, affected faction, and whether an effect is immediate or delayed;
- risks and uncertainty: what is known, what is staff estimate, and what may emerge later;
- narration and grounding: a short authored historical narrative, a staff interpretation paragraph, and source notes/citations compact enough for the modal with a route to deeper Codex/Records context;
- record trail: where the resolved decision will appear after response.

Rules:

- Do not serialize UI-only modal view models unless the underlying event payload cannot carry the required data.
- Prefer enriching `PendingEventDecision` at the engine boundary when the modal needs authored narrative/source/options/effects that must persist until response.
- Do not expose hidden enemy truth. Trigger evidence must be player-safe or phrased as staff assessment.
- Do not show hidden model reasoning. Show deterministic, player-facing rationale/evidence and consequence explanation.
- Historical bot calibration contract: bots use the historical/default response for calibration; authors must put the historical option first and label the modal's historical/default option clearly. Player alternatives are valid counterfactual branches through event effects, not army micromanagement.
- Historical label contract: every required-response event must identify exactly one historical/default option. If there is no defensible historical default, the event must be marked source/design-blocked instead of silently falling back to option 0.
- Narrative contract: every required-response event must carry player-facing narrative and historical grounding. Bare mechanical choice rows are insufficient for presidential-core events.
- Sort and present multiple pending player decisions deterministically: blocking severity, turn fired, event ID.

Implementation order:

1. Add a red UI test proving a pending event decision auto-opens `EventDecisionModal` and is not only reachable through Decision Room/Desk.
2. Extend `PendingEventDecision` and/or a pure modal view builder with narrative, category, historical source, trigger/rationale evidence, historical option metadata, and consequence preview rows.
3. Replace the compact current modal body with a dossier layout: situation, rationale/evidence, options, numeric consequences, risk, and record trail.
4. Harden missing-effect and missing-source fallbacks so the modal stays readable but diagnostics flag weak authoring.
5. Preserve active modal state and selected response on IPC failure; do not clear the modal until the engine accepts the response.
6. After resolution, ensure the consequence ledger/Records/Chronicle path records the selected response and major consequence rows.

Tests:

- Add or extend modal tests:
  - pending player event auto-opens the modal on turn entry;
  - modal contains narrative/situation, rationale/evidence, visible historical/default marker, numeric consequence rows, source note, and record trail;
  - option with no effects renders an explicit no-immediate-mechanical-effect row and is flagged by taxonomy diagnostics;
  - IPC failure keeps the modal open;
  - no hidden raw IDs, raw state keys, or enemy-only truth leak into the modal.
- Extend event taxonomy tests:
  - every required-response event reports modal-readiness fields;
  - every bot-calibrated event has exactly one historical/default option and it is first unless Product Manager records an explicit exception;
  - every required-response event has narrative text and `historical_source` or a source-blocked finding;
  - non-`historical` bot response logic is reported as calibration debt unless explicitly exempted by Product Manager.

Verification:

```powershell
npx.cmd vitest run tests/ui/decision_family_modals.test.ts tests/ui/modal_stack_priority.test.ts tests/ui/presidential_blockers.test.ts tests/ui/decision_consequence_trail.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/inbox_items.test.ts tests/player_decision_manifest.test.ts tests/event_decisions.test.ts --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:map:build
```

Baseline regression is normally not required if this is pure UI/read-model projection from already persisted state. It is required if the slice changes event queue shape, save fields, bot-choice behavior, resolver behavior, scenario serialization, or generated artifacts.

Collision risks:

- `src/ui/map/components/EventDecisionModal.tsx`
- `src/ui/map/App.tsx`
- `src/ui/map/data/decisionSurfaceRegistry.ts`
- `src/ui/map/data/decisionConsequenceLedger.ts`
- `src/ui/map/data/types.ts`
- `src/sim/events/event_types.ts`
- `src/sim/events/evaluate_events.ts`
- `src/sim/events/resolve_decision.ts`
- `data/scenarios/events/*.json`

Stop gates:

- Player decision is only visible in Decision Room/Desk and does not auto-pop.
- Hidden enemy truth exposed through modal rationale.
- Hidden model reasoning text exposed instead of player-facing evidence/rationale.
- Bot calibration path can choose non-historical options without explicit Product Manager approval.
- New event queue/ledger duplicates President's Desk, modal, Records, or Chronicle authority.

## Workstream D - Historical Pressure and Dilemma Authoring

**Goal:** convert the event catalog from chronology toward organic historical pressure.

Authoring rules:

1. Emergence first: every event must fire from state pressure, incident, threshold, duration, or compound predicates. Calendar windows are bounding guards only.
2. Historical option first: bot calibration assumes `response_options[0]` is the historical choice when using `bot_response_logic: "historical"`.
3. Historical-choice marker: every decision option set must mark the historical/default option explicitly in data or derived modal view so the player can see the historical path before choosing.
4. Narrative first-class: every presidential decision needs authored narration, staff interpretation, and a consequence preview. It should read like a presidential briefing, not a spreadsheet row.
5. Sensitive-history gate: atrocity is consequence, not lever. No player options that select, tune, mitigate, optimize, or bargain with atrocity.
6. Source gate: no BB/ICTY/source-supported claim, no authored row. If source support is missing, create a research blocker.
7. Delete test: if removing an event changes no state, no decision pressure, no Cost Ledger annotation, and no future trigger, cut or rewrite it.

Trigger emergence classes:

- Incident trigger: a concrete thing happened this turn, such as OSID flip, enclave encirclement, operation outcome, officer death, or source-gated massacre predicate.
- Pressure trigger: readiness accumulates while conditions hold, such as alliance decay, patron pressure, international visibility, exhaustion, siege pressure, or negotiation pressure.
- Threshold trigger: state crosses a boundary, such as supply below X, territory share above/below X, war-crimes counter above X, or dimension below X.
- Duration trigger: condition persisted for N turns, such as enclave besieged, corridor severed, siege active, or alliance mobilizing.
- Compound trigger: AND/OR composition of the above plus flags.
- Exogenous trigger: real outside calendar event only, such as UN resolution or JNA/Belgrade decision; effects should still scale from game state where possible.

Authoring packet order:

1. **Packet 0: Source Gate + Existing Event Inventory**
   - Build a manifest of candidate rows from `data/scenarios/events/*.json`.
   - Classify each row: keep, rewrite, cut, source-blocked, sensitive-gated.
   - Acceptance: every row has `emergence_class`, `source_status`, `sensitive_ring`, `substrate_used`, and `calendar_primary: false` unless explicitly exogenous.
2. **Packet 1: Trigger Predicate Vocabulary**
   - Define the condition vocabulary authoring packets may use: alliance threshold, supply status, corridor severed, enclave encircled, control percentage, patron pressure, war-crimes counter, strategic dimensions, event flag, event fire count, turns since event, operation outcome.
   - Acceptance: no later packet requires an unsupported predicate; missing predicates become implementation blockers before prose authoring.
3. **Packet 2: 1992 Foundation Rewrite**
   - Priority rows: Sarajevo siege begins, Srebrenica enclave forms, Operation Corridor, Drina Valley pressure, Prijedor camp revelations, London Conference, HVO-ARBiH tensions, Jajce fall.
   - Cut wallpaper rows such as pure convoy/isolation notices unless they mutate supply, pressure, or flags.
   - Acceptance: no 1992 event fires on week alone except true exogenous events; every rewritten row sets/reads at least one flag, dimension, pressure, or live substrate.
4. **Packet 3: Foundational Dilemmas**
   - RS strategic goals, RBiH state identity, HRHB political goal.
   - HRHB priority: historical option is Croat Republic / separate Herceg-Bosna project; United Front is ahistorical and must suppress Croat-Bosniak war chains only through state flags, not calendar deletion.
   - Acceptance: each faction has one early defining decision; option 0 is historical; downstream events read explicit flags.
5. **Packet 4: HRHB-RBiH Pressure Chain**
   - Rows: Gornji Vakuf, Vance-Owen pressure, Croat-Bosniak war begins, East Mostar siege, Central Bosnia fighting replacement if needed, Washington preconditions.
   - Acceptance: Croat-Bosniak war emerges from alliance value, territorial incidents, refugee pressure, patron pressure, and prior HRHB/RBiH flags. No April 1993 because-date trigger.
6. **Packet 5: Named Sensitive HRHB/RBiH Events**
   - Ahmici, Stupni Do, Grabovica, Uzdol, Mostar bridge.
   - These are Ring 2 narrative/consequence rows unless an existing Ring 1 substrate already owns the mechanical fact.
   - Acceptance: no player option authorizes or scales the atrocity; event fires only from documented war state plus source-gated predicates; Cost Ledger wording follows third-person historical voice.
7. **Packet 6: Enclave Formation + Safe-Area Pressure**
   - Srebrenica, Zepa, Gorazde, Bihac, Sarajevo as enclave/siege pressure systems.
   - Acceptance: enclave events require actual encirclement/supply/siege state. Srebrenica rupture trigger is not changed here.
8. **Packet 7: 1994 Diplomacy and Intervention Pressure**
   - Markale/NATO ultimatum, Washington Agreement, Gorazde crisis, Contact Group, Bihac crisis.
   - Acceptance: diplomacy fires from pressure thresholds, siege/enclave incidents, territorial state, and prior flags. Washington uses Croat-Bosniak war duration plus mutual exhaustion plus patron pressure, not date alone.
9. **Packet 8: 1995 Endgame Rebuild**
   - Srebrenica fall, Zepa fall, Storm, Deliberate Force, Federation offensive, US halt, ceasefire, Dayton.
   - Acceptance: zero primary calendar triggers. Srebrenica and Zepa fire only if the modeled war produces the fall. Dayton requires ceasefire/exhaustion/territorial-pressure predicates.
10. **Packet 9: Notifications, Codex, and Ghost Entries**
   - Only after mechanics exist.
   - Acceptance: narrative does not paper over missing mechanics; no alternate-history minimization; all sensitive copy has historian/narrative gate clearance.

Source gates:

- Gate A: BB/ICTY citation required for historical factual claims. Unsupported facts become `source_blocked`.
- Gate A2: Player-facing modal narration must expose a compact source note or citation label; deeper citations may route to Codex/Records, but the modal cannot hide the historical basis.
- Gate B: if a row touches atrocity, detention camps, siege starvation, safe areas, genocide, or massacre, classify Ring 1/2/3 before writing.
- Gate C: if the row would create a new rupture, stop. That requires separate Historian + Game Designer + user approval.
- Gate D: if the row makes atrocity a player-selected tactic, stop. Refuse the design.
- Gate E: if historical timing conflicts with emergent state, emergent state wins; historical record moves to essay/Codex/ghost entry.

Priority call: start with Packets 0-5. That gives the external agent a source-gated 1992 + HRHB/RBiH authoring base without touching the most dangerous 1995 rupture/endgame space too early. Enclave work follows only after predicate vocabulary and sensitive-history gates are proven.

Verification per authoring packet:

```powershell
npx.cmd vitest run tests/events_evaluate.test.ts tests/event_decisions.test.ts tests/event_effects.test.ts tests/event_timeline_integrity.test.ts <relevant consequence-chain tests> --reporter=dot
npm.cmd run typecheck
```

Baseline regression is required for any event data authoring that can fire in covered baseline windows:

- use 52w for early/mid-war packets that affect covered scenarios;
- use 188w for late-war, Washington/Dayton/Srebrenica/Banja Luka halt, or full-campaign presidential acceptance claims;
- refresh manifests only after scenario/design sign-off and written drift explanation.

Stop gates:

- Sensitive-history copy without historian/user gate.
- Event text that asserts impossible live-map facts.
- Historical row that railroads Washington/Dayton/Srebrenica/Banja Luka halt solely from calendar when live prerequisites disagree.

## Workstream E - President Impact Acceptance Tests

**Goal:** prove the system is becoming the heart of play, not just a larger catalog.

**Status:** CLOSED for current production modal-ready acceptance proof as of 2026-05-27. `tools/diagnostics/event_presidential_acceptance.ts` probes all 17 production modal-ready rows from `buildEventAcceptanceReport()`, neutralizes only trigger/pressure gates, and verifies player surfacing, player resolution logs, headless historical auto-resolution, and stable consequence traces.

File targets:

- Add `tools/diagnostics/event_presidential_acceptance.ts`.
- Add `tests/sim/events/presidential_acceptance_diagnostic.test.ts` or root equivalent.
- Extend `tests/event_decisions.test.ts` for no-stuck-headless and decision-log parity.

Tests to write first:

- Synthetic 52-week player-faction state/run fixture proves at least one required player event decision surfaces for the selected faction.
- Headless mode with no `player_faction` auto-resolves choice events and leaves no `pending_event_decisions`.
- Every resolved choice event has exactly one `event_decision_log` entry with `event_id`, `response_id`, `decision_source`, `faction`, `turn`.
- Acceptance diagnostic outputs stable JSON: counts by faction, pending blocker count, decision-log count, and consequence traces from `sets_flags`/`dimension_shifts`.
- 188-week historical-default proof is a stop-gated scenario run, not a unit test, because event ordering changes can move hashes.

Verification:

```powershell
npx.cmd vitest run <new president impact acceptance diagnostic tests> tests/events_evaluate.test.ts tests/event_decisions.test.ts tests/player_decision_manifest.test.ts --reporter=dot
npm.cmd run typecheck
```

Closed proof:

```powershell
node node_modules\vitest\vitest.mjs run tests\sim\events\event_presidential_acceptance.test.ts tests\events_evaluate.test.ts tests\event_decisions.test.ts tests\player_decision_manifest.test.ts --reporter=dot
npx.cmd tsx tools\diagnostics\event_presidential_acceptance.ts --json
npm.cmd run typecheck
```

Scenario proof:

- For 52-week player-faction proof, use a focused scenario diagnostic or `npm.cmd run sim:scenario:run:default` only if the diagnostic depends on run artifacts.
- For 188-week historical-default proof, run the dedicated scenario/acceptance diagnostic the slice adds. It must verify no stuck `pending_event_decisions`, populated `event_decision_log`, and deterministic historical bot defaults.

Baseline regression is required if acceptance diagnostics prove or change scenario behavior/output. It is required before accepting any claim that scenario behavior remains byte-identical.

## Immediately Executable Phase Sequence

### Phase 0 - Dispatch and Baseline Lock

**Assigned to:** Product Manager + Systems Programmer
**Goal:** prove the lane is safe to start and capture the current event substrate before behavior changes.

- [ ] Confirm no branch collision with GUI polish or calibration / army-arc work.
- [ ] Record current event counts: total events, choice events, no-choice events, choice events by respondent faction.
- [ ] Record current loader/evaluator behavior without changing it.
- [ ] Identify the exact command that will become the taxonomy diagnostic.
- [ ] Create or update a short baseline note in the implementation report draft, not in canon.

Artifacts expected:

- Baseline counts in the eventual implementation report.
- No event data rewrites.
- No behavior change.

Verification:

```powershell
npm.cmd run typecheck
```

Handoff: Systems Programmer owns Phase 1. Product Manager verifies the baseline summary matches this plan.

### Phase 1 - Catalog Contract and Taxonomy Diagnostic

**Assigned to:** Systems Programmer
**Reviewers:** QA Engineer, Canon Compliance Reviewer, Historian for source-status fields
**Status:** CLOSED 2026-05-27 as Workstream A baseline.
**Goal:** make the full catalog auditable before expanding it.

Executed Workstream A without event JSON, firing, evaluator, loader, save-schema, or sensitive-history content changes. The taxonomy report remains a pure diagnostic module and the acceptance report continues to import `buildEventTaxonomyReport`, `loadCatalogRows`, and `EventTaxonomyRow` compatibly.

Verification run for closeout:

```powershell
npx.cmd vitest run tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_taxonomy_report.test.ts --reporter=dot
npx.cmd vitest run tests\event_timeline_integrity.test.ts --reporter=dot
npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json
npm.cmd run typecheck
```

Handoff: QA receives diagnostic output and confirms all 247 catalog rows are represented exactly once. Next executable slice is Workstream B - Loader, Ordering, Cap, and Save Safety.

### Phase 2 - Loader, Ordering, Cap, and Save Safety

**Assigned to:** Systems Programmer / Gameplay Programmer
**Reviewers:** Determinism Auditor, QA Engineer
**Status:** CLOSED for current substrate hardening. Evaluator ordering/overflow visibility, loader fail-closed, row validation, semantic catalog validation, state validation, mutex filtering, and persisted overflow queue slices closed 2026-05-27.
**Goal:** harden the substrate before more presidential decisions depend on it.

Closed evaluator slice: `compareEventCandidates(...)` now orders eligible candidates by `priority`, `trigger.turn_min ?? Number.MAX_SAFE_INTEGER`, then event id before the unchanged four-event cap. `EventsEvaluationReport` now returns additive `candidates_considered`, `overflowed`, `overflowed_ids`, and `mutex_suppressed_ids` fields. Same-turn `mutex_group` filtering runs after canonical sorting and before the cap. The loaded 247-row catalog has a no-drift test proving current stable priority-only order and canonical comparator order are identical.

Closed loader slice: `loadEventDefinitions(...)` now fails closed when any of the fixed five required event files is missing, malformed JSON, or valid non-array JSON. `loadEventDefinitionsFromDir(...)` is a deterministic test seam using the same fixed file order, filter, and sort path. Valid current catalog behavior remains 247 rows, sorted by `trigger.turn_min ?? Number.MAX_SAFE_INTEGER` then event id.

Closed semantic validation slice: event effect kinds, trigger/pressure condition types, event factions, declared category/bot/probability/boolean/phase/range fields, duplicate event ids, response option ids, historical default response ids, and event references now fail closed in the loader. The taxonomy diagnostic uses the same shared vocabulary and still reports the current 247-row catalog with 180 warnings and 0 errors.

Closed overflow queue slice: save schema v22 adds `military.event_overflow_queue` as persisted event ids delayed only by the cap. Legacy saves materialize an empty queue; current-version saves reject missing or malformed queues. Queued ids are de-duplicated, resolved through the current registry, re-gated for phase/trigger/pressure/recurrence/cooldown/probability, combined with newly eligible candidates, canonically sorted, mutex-filtered, capped, and replaced with the next post-cap overflow ids. Non-war evaluation clears the queue.

Next executable slice: run Workstream E acceptance diagnostics before changing event prose or further live event firing. Do not implement additional event prose without `docs/40_reports/proposals/20260526_EVENT_MODAL_GATED_DECISION_PACKET.md` approval.

If this phase changes event ordering, cap behavior, queueing, mutex, or migration defaults, run baseline regression and explain drift before acceptance.

Handoff: Determinism Auditor signs off on ordering, cap behavior, and hash movement explanation.

### Phase 3 - Modal-First Presidential Event Decisions

**Assigned to:** UI/UX Developer + Technical Architect
**Reviewers:** Modern Wargame Expert, QA Engineer
**Goal:** expose pending event decisions as auto-popping presidential modal dossiers without creating a new queue or authority.

Execute Workstream C. `App.tsx` may be touched only to harden the existing auto-launch/modal-state contract; avoid `GameStateAdapter.ts` unless the modal needs a field not already exposed.

Handoff: UI/UX hands QA a screenshot or visual artifact plus test command output proving the event modal auto-pops, explains rationale/evidence, shows numeric consequences, preserves IPC-failure state, and records the consequence trail.

### Phase 4 - Acceptance Diagnostics Before Authoring

**Assigned to:** QA Engineer + Scenario Harness Engineer
**Reviewers:** Product Manager, Determinism Auditor
**Goal:** define pass/fail proof before adding major new content.

Execute Workstream E. Acceptance diagnostics may fail initially, but failures must be explicit and actionable.

Handoff: Product Manager chooses first authoring packet from diagnostic gaps.

### Phase 5 - Historical Pressure and Dilemma Authoring Waves

**Assigned to:** Historian + Scenario Creator/Runner/Tester + Gameplay Programmer
**Reviewers:** Game Designer, Canon Compliance Reviewer, QA Engineer
**Goal:** add pressure-driven presidential content in small reviewable packets.

Execute Workstream D one packet per commit unless Product Manager changes priority in `COMMAND_BOARD.md`.

Handoff: Historian signs source status; Canon reviewer signs sensitive-history boundaries; QA signs deterministic acceptance. Product Manager verifies every authored decision labels the historical/default option first so bot calibration stays on the historical path while players can choose counterfactual branches.

## Save-Schema Gate

Any field that can appear in `GameState` must follow `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md`:

- Add optional field first unless every legacy save already has it.
- Bump `CURRENT_SCHEMA_VERSION`.
- Add deterministic migration in `src/state/save_migration.ts`.
- Add required-field validator only when current-version saves must carry it.
- Add `tests/fixtures/save_migration/vNN_<feature>.json`.
- Run the full save migration command block from Workstream B.
- If the default can affect scenario output, classify it as sensitive and get sign-off before commit.

For event-system slices, this applies to `military.pending_event_decisions`, `military.event_decision_log`, active event modifiers, pending event notifications, overflow queues/backlogs, and any new decision/read-model state that is persisted.

## Determinism Risks

- Equal-priority event ordering must use stable tie-breaks: priority, trigger lower bound, then event ID with strict deterministic compare.
- The 4-event cap is currently a risk because silent overflow can make same-turn outcomes depend on candidate ordering.
- Loader hardening must not introduce filesystem-order dependence.
- Overflow/backlog queues must serialize in canonical order and avoid timestamps/generated IDs.
- Do not use `Date.now`, `new Date`, `Math.random`, locale collation, unsorted `Object.keys`, unordered `Map`/`Set` emission, or environment-dependent behavior in sim/save paths.
- Migrations must be pure: no I/O, logging, time, randomness, env reads, or unsorted record traversal.
- Headless scenarios must preserve the `meta.headless_scenario_auto_control === true` exemption for absent `player_faction`.
- Historical bot defaults must remain deterministic and record `event_decision_log` entries.

## External-Agent Prompt Template

Use this prompt when assigning the lane to an external agent:

```text
Role and objective: You are the implementation agent for the AWWV Event System Presidential Core Upgrade. Execute docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md one phase at a time, starting with the next unfinished phase recorded in docs/plans/COMMAND_BOARD.md. The goal is to make events an emergent presidential-impact system, not a calendar script. Required player decisions must auto-pop as modal presidential dossiers with situation, evidence/rationale, historical/default option, numeric consequences, risk, and record trail.

Canon references: Read .claude/napkin.md, docs/20_engineering/PYRRHIC_PLANNING_RULES.md, docs/plans/COMMAND_BOARD.md, docs/plans/MASTER_ROADMAP.md latest event-system addendum, docs/10_canon/Game_Bible_v0_9_0.md, docs/10_canon/Rulebook_v0_9_0.md, docs/10_canon/Systems_Manual_v0_9_0.md, docs/20_engineering/DETERMINISM_TEST_MATRIX.md, docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md, and the full event upgrade plan before editing. Inspect src/sim/events/*, src/state/player_decision_manifest.ts, src/state/game_state.ts, src/state/validateGameState.ts, and all five data/scenarios/events/*.json files.

Determinism and ledger constraints: No timestamps, randomness, environment-dependent logic, or nondeterministic iteration. Stable ordering is required for candidates, queues, diagnostics, persisted output, and migrations. Do not add save fields without migration/default/validator tests. Append docs/PROJECT_LEDGER.md for behavior/output/scenario/data/roadmap changes; add docs/PROJECT_LEDGER_KNOWLEDGE.md only for reusable process or design lessons. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective; calibration branch collision; sensitive-history judgment required; scenario hash drift is unexplained; save-schema default could affect scenario output without sign-off; event design would make atrocity a player lever; ordinary war/diplomacy/enclave/patron/alliance/command event is calendar-primary without an exogenous reason; modal copy would expose hidden model reasoning or hidden enemy truth; bot calibration would choose a non-historical response without Product Manager approval.

Output format and validation: Work one phase per commit. In your final handoff, include changed files, phase completed, tests run with pass/fail, scenario hash/baseline result if applicable, drift explanation if any, docs/ledger updates, and next unfinished phase. Run the slice-specific verification in the plan. Before claiming final acceptance, run npm.cmd run typecheck, npm.cmd test, npm.cmd run test:baselines when behavior/output can move, npm.cmd run desktop:map:build for UI slices, and git diff --check.
```

## Roadmap and Board Update Requirements

Every closed phase must update planning state if status, scope, owner, verification, or next action changed.

`docs/plans/COMMAND_BOARD.md` must contain:

- current status for `Event system presidential core upgrade`;
- current owner lane;
- next executable action;
- verification/proof actually run;
- active stop gate if the lane is blocked;
- whether the next slice is taxonomy, hardening, modal-first event decisions, acceptance, or authoring.

`docs/plans/MASTER_ROADMAP.md` must receive a short addendum only when a workstream or authoring packet closes. The addendum must include:

- date;
- closed phase or packet name;
- files or systems changed at a high level;
- verification commands run;
- scenario/hash result if applicable;
- remaining event-system next action;
- explicit note if no canon, calibration, GUI ownership, or save-schema boundary moved.

Do not use `MASTER_ROADMAP.md` for detailed implementation narrative. Put that in `docs/40_reports/implemented/YYYYMMDD_EVENT_SYSTEM_<PHASE>.md`.

`docs/40_reports/CONSOLIDATED_BACKLOG.md` and `docs/40_reports/GAME_STATE_RATING_MASTER.md` must be updated only if the work changes backlog status, event-system grade, residual risk, or release readiness.

`docs/PROJECT_LEDGER.md` must receive an entry for every behavior, output, scenario, data, roadmap, or verification-significant change.

## Required Closeout

Every implementation slice must update:

- this plan if scope/status changes;
- `docs/plans/COMMAND_BOARD.md` if status/owner/next action changes;
- `docs/plans/MASTER_ROADMAP.md` with a short addendum when a workstream closes;
- `docs/PROJECT_LEDGER.md`;
- an implementation report under `docs/40_reports/implemented/` for code/data changes.

Minimum reviewer matrix:

- Engine changes: Systems Programmer or Gameplay Programmer implements; Determinism Auditor, QA Engineer, and Canon Compliance Reviewer review.
- UI changes: UI/UX Developer implements; Technical Architect, Modern Wargame Expert, and QA review.
- Historical authoring: Historian/Scenario role prepares; Game Designer and Canon reviewer review.
- Docs-only updates: Documentation Specialist drafts; Quality Assurance Process checks that rows remain actionable.

Final acceptance checklist before accepting external-agent handoff:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:baselines
npm.cmd run desktop:map:build
git diff --check
```

The full checklist applies only when the completed slice touches enough surface to justify it. For docs-only or diagnostic-only slices, use the slice-specific gates and explain why broader gates were not required.
