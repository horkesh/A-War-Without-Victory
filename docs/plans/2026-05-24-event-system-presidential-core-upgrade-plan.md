# Event System Presidential Core Upgrade Plan

**Date:** 2026-05-24  
**Status:** ACTIVE plan / not yet implemented  
**Owner lane:** Event-system product/engine lane  
**Related board row:** `Command Board -> Event system presidential core upgrade`  
**Do not collide with:** calibration / army-arc branch, GUI polish branch

## Purpose

Upgrade the event system from a mostly functional event/catalog substrate into the primary presidential-impact layer of AWWV. The target player experience is:

- some events are no-choice consequence or external-history receipts;
- some events are multi-choice presidential decisions;
- choices alter flags, dimensions, constraints, modifiers, downstream event eligibility, and endgame/cost interpretation;
- historical outcomes remain organic through pressure, state prerequisites, and bot historical defaults rather than calendar railroading.

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
- Choice ownership: RBiH 20, RS 18, HRHB 6.
- Canon target from `Game_Bible_v0_9_0.md`: roughly 60% decision / 30% consequence / 10% forced events.
- Current design gap: about 18% choice events, too many calendar/headline rows, too few pressure-driven presidential dilemmas.
- Current technical blockers:
  - `evaluateEvents` caps fireable events at 4 per turn and slices overflow silently.
  - event loading can fail open for missing/malformed files.
  - equal-priority event sorting lacks a full canonical tie-break.
  - full 247-row catalog schema validation is incomplete.
  - `PendingEventDecision` underfeeds the UI: title/options arrive, but narrative, category, risks, flags, dimension shifts, source context, and notification previews do not.
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

## Workstream A - Contract, Inventory, and Taxonomy

**Goal:** make the catalog auditable before expanding it.

1. Add an event taxonomy diagnostic/report that classifies every event row:
   - `presidential_decision`
   - `consequence_receipt`
   - `forced_external_event`
   - `recurring_pressure_decision`
   - `foreign_intelligence_notification`
   - `sensitive_history_reflection`
2. For each row, record:
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
   - sensitive-history ring if applicable.
3. Add catalog tests for:
   - duplicate IDs;
   - malformed response options;
   - required-response rows without a respondent;
   - unknown effect/condition kinds;
   - invalid faction IDs;
   - missing source notes on historically specific rows.

**Verification:**

- `node <new event taxonomy diagnostic>`
- focused catalog Vitest file
- `npm.cmd run typecheck`

**Stop gates:**

- Any taxonomy that would make atrocity a player lever.
- Any historical classification without source support.
- Any finding that changes current fired-event behavior before a separate implementation step.

## Workstream B - Engine Safety Hardening

**Goal:** make the current event substrate safe enough to carry more presidential weight.

1. Replace fail-open loader behavior in dev/test with explicit failure for missing or malformed event files.
2. Add canonical candidate ordering in `evaluateEvents`:
   - priority;
   - trigger lower bound;
   - event id using deterministic string compare.
3. Address the 4-event cap:
   - first, add a diagnostic/test that proves same-turn crowding and identifies silently dropped rows;
   - then choose one of:
     - deterministic event docket/backlog;
     - strict authoring test requiring same-turn rows to have non-crowding priority/mutex proof;
     - explicit overflow queue.
4. Lock declared but weakly tested features:
   - `mutex_group`;
   - recurrence behavior;
   - response option availability windows;
   - decision audit log parity.
5. Validate save-shape fields for:
   - `pending_event_decisions`;
   - `event_decision_log`;
   - active event modifiers;
   - pending event notifications.

**Verification:**

- `node node_modules\\vitest\\vitest.mjs run tests/events_evaluate.test.ts tests/event_decisions.test.ts tests/event_effects.test.ts tests/event_timeline_integrity.test.ts tests/player_decision_manifest.test.ts --reporter=dot`
- save migration / validate state focused tests if persistent fields change
- `tests/determinism_static_scan_r1_5.test.ts`
- baseline regression only if scenario output can move

**Stop gates:**

- Scenario hash drift without an understood event-ordering reason.
- New save fields without migration/default/validator coverage.
- Any bypass of canonical `evaluate-events` pipeline entrypoint.

## Workstream C - Presidential Crisis Brief Read Model

**Goal:** make event decisions feel like real presidential dossiers without rewriting the UI shell.

1. Add a deterministic read model that joins pending `event_id` to its event definition.
2. Expose player-safe fields:
   - title and full narrative;
   - category and turn;
   - respondent faction;
   - response option labels/descriptions;
   - effects;
   - dimension shifts;
   - flags set;
   - risk level / aggression affinity;
   - relevant notification preview where authored;
   - historical source label where safe.
3. Keep the existing resolver path unchanged.
4. Harden the modal against missing `option.effects`.
5. Do not clear the active modal if IPC response fails.
6. Project event decisions into Decision Room / pre-advance review as named crisis items, not only anonymous blockers.

**Verification:**

- UI data/read-model unit tests
- event modal tests for option rows with and without `effects`
- `npm.cmd run typecheck`
- desktop/map build
- browser/Electron visual check when GUI branch ownership permits

**Stop gates:**

- Collision with active GUI branch.
- Hidden enemy truth exposed through crisis brief context.
- New event queue/ledger that duplicates Decision Room or Inbox authority.

## Workstream D - Historical Pressure and Dilemma Authoring

**Goal:** convert the event catalog from chronology toward organic historical pressure.

Author pressure/dilemma packets in small, reviewable waves:

1. 1992 local takeover / consolidation dilemmas:
   - Drina / Zvornik / Sapna-style holdouts;
   - Prijedor / Foca / local governance pressure;
   - state-conditioned displacement/exposure consequences.
2. Posavina / Corridor 1992 pressure packet:
   - Modrica / Derventa / Bosanski Brod / Brcko bottleneck pressure;
   - corridor cut/reopen pressure, not one static headline event.
3. Enclave and pocket recurring decisions:
   - Srebrenica, Zepa, Gorazde, Bihac, Cerska/Kamenica, Maglaj;
   - relief, convoy access, demilitarization, propaganda cost, reserve risk.
4. HRHB presidential dilemmas:
   - Croat-Bosniak escalation;
   - Mostar and Central Bosnia;
   - Zagreb pressure;
   - Washington timing.
5. Patron and international pressure:
   - Belgrade/Pale friction;
   - Zagreb/HRHB pressure;
   - UN/NATO credibility and safe-area pressure.

Each packet must:

- use historical bot defaults unless a documented political-scoring mode is required;
- put the historical bot choice at `response_options[0]` when using `bot_response_logic: "historical"`;
- avoid calendar-only firing unless the event is truly exogenous;
- prefer `state_plus_historical_window` over fixed turn windows for normal war/political crises;
- include a conversion note if a currently calendar-bound row cannot yet be made emergent because the needed live-state predicate is missing;
- cite historical sources for new factual claims;
- define downstream flags/dimensions/consequences before adding narrative.

**Verification:**

- event catalog tests
- consequence chain tests where flags/dimensions feed later rows
- historian/source packet for new historical claims
- 52w or 188w scenario run depending on impact
- `event_decision_log` audit in resulting save

**Stop gates:**

- Sensitive-history copy without historian/user gate.
- Event text that asserts impossible live-map facts.
- Historical row that railroads Washington/Dayton/Srebrenica/Banja Luka halt solely from calendar when live prerequisites disagree.

## Workstream E - President Impact Acceptance Tests

**Goal:** prove the system is becoming the heart of play, not just a larger catalog.

Add acceptance diagnostics/tests that can be run per faction and scenario length:

1. 52-week player-faction run:
   - foundational decision surfaced/resolved;
   - at least several event decisions or pressure warnings appear for the player faction;
   - at least one visible consequence is traceable to an earlier event choice.
2. 188-week historical-default headless run:
   - no pending event decisions remain stuck in headless mode;
   - `event_decision_log` records bot choices for choice events;
   - historical bot defaults remain deterministic;
   - match ratio regression is explained before acceptance.
3. UI readiness proof:
   - blocking event decisions appear as named crisis items;
   - the crisis brief shows narrative and consequences;
   - resolving a decision clears the blocker and logs the decision.

**Verification:**

- focused acceptance diagnostic
- existing event/decision/manifest tests
- scenario runner proof where behavior can move
- desktop gate if UI flow changes

## Implementation Sequence

1. Workstream A diagnostic and taxonomy audit.
2. Workstream B loader/order/catalog validation hardening.
3. Workstream C crisis-brief read model and modal robustness.
4. Workstream E baseline acceptance diagnostics.
5. Workstream D authoring waves, one packet at a time.
6. Regrade event/decision system after acceptance tests show presidential agency, pressure visibility, and downstream consequence traceability.

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
