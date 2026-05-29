# Event Database And Runtime Semantics Packet

**Date:** 2026-05-27
**Status:** Proposal / next event-system packet — supersedes the scope frame at `docs/40_reports/proposals/20260527_EVENT_DATABASE_ALTERNATE_TIMELINES_SCOPE.md` by attaching exact schema, runtime semantics, source-gated inventory, and phased execution to the same direction.
**Owner lane:** Event-system product/engine lane, with Historian/Game Designer and Technical Architect/QA gates.
**Plan row:** `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` Workstreams B (engine safety), D (authoring), E (acceptance).
**Branch:** `codex/diagnostics-output-artifact-doc-closeout`. Not a calibration / army-arc / GUI-polish branch.
**Behavior change in this packet:** none. Docs-only proposal. No event JSON, runtime code, GUI code, save schema, scenario setup, or generated artifact has been modified.

---

## 0. Purpose

Convert the approved event expansion direction into a packet an external agent can execute one slice at a time. Three deliverables anchor the rest of the document:

1. A database schema plan that says where new fields live, what they mean, and what stays presentation-only.
2. A runtime semantics packet that says exactly how `opens_events`, `closes_events`, `opens_flags`, `closes_flags`, `closed_event_ids`, and `event_causality_log` interact with the existing evaluator, mutex/overflow path, pressure system, recurrence, and notification queue — without making `future_consequences` the executable source.
3. A first 40+ family research inventory grouped RS / RBiH / HRHB / cross-faction diplomacy, classified by source tier, sensitive-history ring, likely material effects, historical/default candidate, plausible counterfactuals, and downstream opens/closes.

Plus four supporting deliverables: source standard, implementation phases A–F, verification plan, and explicit non-goals.

The packet treats player decisions as the only legitimate way to open a counterfactual branch. Calendar railroading remains debt, not authorization. Historical bots stay on `bot_response_logic: 'historical'`; staff recommendations remain UI advice only.

---

## 1. Current Verified Baseline

Confirmed from `src/sim/events/*.ts`, `data/scenarios/events/*.json`, `tools/diagnostics/event_*.ts`, the active plan, and the latest closeouts:

- Catalog: 247 events across `war_1992.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`, `consequences.json`. 44 choice events; 36 required-response rows; 18 production modal-ready rows.
- `EventDefinition` already supports: `trigger.condition`, `enables_events`, `mutex_group`, `priority`, `pressure`, `recurrence`, `sets_flags`, `dimension_shifts`, `historical_default_response_id`, `staff_recommended_response_id`, `responding_faction`, `requires_player_response`, `auto_resolve_turns`, `bot_response_logic`, `notifications_to_other_factions`, `historical_source` / `source_note` / `source`.
- `EventResponseOption` already supports: `effects`, `sets_flags`, `dimension_shifts`, `available_from_fire` / `unavailable_after_fire`, `aggression_affinity`, `risk_level`, `historical_marker`, and the behavior-neutral `future_consequences[]` (id, label, timing, certainty, opens_events, closes_events, opens_flags, closes_flags, material_effect_refs, explanation).
- `state.military` already persists: `fired_event_ids`, `event_fire_counts`, `event_last_fired_turn`, `event_readiness`, `event_flags`, `event_overflow_queue` (v22), `pending_event_notifications` (v23), `pending_event_decisions` (v24), `event_decision_log`, `event_aggression_modifiers`, `recruitment_modifiers`, `equipment_quality_modifiers`, `guerrilla_threats`, `alliance_locks`, `bot_priority_shifts`, `cost_ledger_annotations`, `offensive_ops_suppressions`, `event_constraints`, and `enabled_event_ids`.
- Evaluator pipeline: `evaluateEvents()` collects from registry + overflow queue → eligibility filter (`canEventFire`, `triggerMatches` or `isEventReady` for pressure events, optional `probability` roll) → canonical sort via `compareEventCandidates` → `filterMutexCandidates` → slice at `MAX_EVENTS_PER_TURN = 4` → overflow tail persisted to `event_overflow_queue` → apply effects/flags/dimension shifts → queue player decision or auto-resolve bot → record fire counts / last-fired / `enabled_event_ids` / decision log.
- Loader (`event_loader.ts`) fails closed on missing files, malformed JSON, non-array JSON, malformed triggers, unknown effect kinds, unknown condition types, malformed response options, malformed `future_consequences`, dangling `requires_events` / `enables_events` / `future_consequences.opens_events|closes_events`, duplicate ids, invalid `historical_default_response_id` / `staff_recommended_response_id`, and `requires_player_response: true` without a valid `responding_faction`.
- Diagnostics (`event_taxonomy_report.ts`, `event_acceptance_report.ts`, `event_presidential_acceptance.ts`) classify modal readiness, source presence, sensitive-history risk, historical/default labels, branch metadata, and acceptance proofs; the presidential acceptance probe skips staff-recommendation rows so they cannot become historical bot calibration defaults.

What is **not** yet a runtime mechanism, despite already appearing in data shape:

- `future_consequences.opens_events` / `closes_events` / `opens_flags` / `closes_flags` are presentation metadata only — never read by `evaluateEvents`.
- Event-level `enables_events` writes `state.military.enabled_event_ids` but no eligibility code currently reads it as an open gate; effective bypass only happens because most events don't have prerequisite gates.
- `state.military.enabled_event_ids` exists but has no consumer.
- There is no `closed_event_ids` array (cannot soft-foreclose an event at runtime).
- There is no `event_causality_log` (cannot trace why an event became eligible, suppressed, or queued).

The current packet inherits those gaps as the work to define semantics for.

---

## 2. Database Schema Plan

The existing five JSON files remain the database. No registry/index file is added: it would duplicate `loadEventDefinitionsFromDir()` ordering and create a second source of truth. All new fields land on `EventDefinition` or `EventResponseOption` in `src/sim/events/event_types.ts`, validated by `src/sim/events/event_loader.ts`, surfaced by `tools/diagnostics/event_taxonomy_report.ts` rows.

### 2.1 Fields That Already Exist And Need No Change

- Family classification: use the existing `category` (military / political / humanitarian / diplomatic / economic / command / territorial) plus `tags[]`. Do not add an `event_family` field; `tags` already discriminates more finely and the taxonomy diagnostic already aggregates by category.
- Historical/default labeling: keep `historical_default_response_id` (defensible historical-actor choice) and `staff_recommended_response_id` (abstract command advice with no sourced historical default). Their semantics, label text, and bot-calibration interaction are settled by `docs/40_reports/proposals/20260527_EVENT_FOUNDATIONAL_DECISIONS_PACKET.md` and `docs/40_reports/implemented/20260527_EVENT_STAFF_RECOMMENDATION_DEFAULTS.md`.
- Counterfactual labeling: keep `EventResponseOption.historical_marker: 'historical_default' | 'counterfactual'`.
- Sensitive-history ring: taxonomy already computes `sensitive_history_ring: 'none' | 'risk'` and `sensitive_history_status: 'clear' | 'review_required'`; the SENSITIVE_HISTORY_DESIGN_GATE three-ring canon governs whether a row can be authored. Do not add a per-row ring field; classification stays in canon and diagnostic logic so it cannot diverge.
- Branch visibility: keep `EventResponseOption.future_consequences[]` exactly as authored today. The semantics packet below promotes a subset to runtime gates, but the **field stays the player-facing record**, not the executable source.
- Material effects: keep `EventEffect[]` (all 18 kinds in `EFFECT_KIND_ORDER`), `sets_flags`, `dimension_shifts`. No new effect kinds are required for Phase A–C; if Phase D needs one, it lands through the existing kind-ordering protocol with documented index-shift cost.
- Source status: keep `historical_source`, `source_note`, `source`. Modal source notes already render in the dossier.

### 2.2 New Authoring Fields (Schema-Only, No Runtime Behavior Yet)

These optional fields land in Phase A so the inventory can be authored honestly without changing evaluator behavior. All optional; loader validates shape only; taxonomy diagnostics surface them.

| Field | Owner | Type | Purpose |
| --- | --- | --- | --- |
| `EventDefinition.source_tier` | event-level | `'icty_icj_un' \| 'agreement_text' \| 'balkan_battlegrounds' \| 'corroborated_participant' \| 'design_counterfactual' \| 'pending'` | Pins which Source Standard tier the row claims. Required when `historical_source` is asserted; otherwise blocks modal readiness. |
| `EventDefinition.emergence_class` | event-level | `'incident' \| 'pressure' \| 'threshold' \| 'duration' \| 'compound' \| 'exogenous' \| 'legacy_calendar_pending_conversion'` | Already an implicit taxonomy column; promote to authored data so debt is explicit. Finished modal-ready rows must not be `legacy_calendar_pending_conversion`. |
| `EventDefinition.family` | event-level | string from a fixed vocabulary in `src/sim/events/event_families.ts` (`rs_strategic_goals`, `rs_drina_campaign`, `rs_patron_pressure`, `rbih_state_identity`, `rbih_enclave_policy`, `hrhb_political_goal`, `hrhb_alliance`, `diplomacy_vance_owen`, `diplomacy_owen_stoltenberg`, `diplomacy_contact_group`, `diplomacy_washington`, `diplomacy_dayton`, `intervention_nato`, `intervention_un`, etc.) | Allows the taxonomy report to group rows by causal family without re-deriving from tags. Authoring-only; no runtime use. |
| `EventResponseOption.branch_tag` | response-level | string in `event_families.ts` (e.g. `rs_all_six`, `rs_selective`, `rbih_civic`, `hrhb_united_front`) | Canonical authored handle for the branch state set by `sets_flags`. Required for any option whose `future_consequences` references downstream events; used as the executable handle in §3.3 below. |
| `EventDefinition.material_effect_minimum_satisfied` | computed | boolean | Diagnostic-derived, never authored. True iff at least one of: `effects[]` non-empty; `sets_flags` non-empty; `dimension_shifts` non-empty; `enables_events_runtime` non-empty; `closes_events_runtime` non-empty; or `future_consequences[*].timing in {immediate, next_turn}`. Cost-Ledger annotations are covered via the existing `cost_ledger_annotation` effect kind under `effects[]`, not as a separate path. Modal-readiness gate. |

Schema rules:

- Adding any of these fields is loader-validated only — runtime evaluator does not read them.
- `branch_tag` is the only one with a stronger downstream rule: when a response-level `future_consequences.opens_events[]` or `closes_events[]` references a downstream event that requires the branch as a prerequisite, the downstream event's `trigger.condition` must reference the same flag key/value the branching response wrote (see §3.3).
- Anything else (rationale prose, staff assessment, trigger evidence, notification text) stays under the existing fields.

### 2.3 Persisted State Fields (Phase B — Save-Schema-Gated)

These land later, gated by `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md`. Phase A authors no JSON that would require them; Phase B implementation adds them with migration/default/validator coverage in the same slice.

| Persisted field | Type | Purpose | Schema-bump | Migration default |
| --- | --- | --- | --- | --- |
| `state.military.closed_event_ids` | `string[]`, sorted, deduped, deterministic | Records event ids that have been explicitly foreclosed (e.g. by a counterfactual decision) and must not become eligible again in this run. | v26 | `[]` for current saves, computed-`[]` for prior saves. |
| `state.military.event_causality_log` | `Array<{ turn: number; from_event: string; to_event: string \| null; to_flag: string \| null; kind: 'enables' \| 'closes' \| 'opens_flag' \| 'closes_flag' \| 'mutex_suppressed' \| 'overflowed'; source_response_id?: string }>` | Audit trail for why an event became eligible, was foreclosed, or was deferred. Sorted by `(turn, from_event, to_event ?? '', to_flag ?? '', kind, source_response_id ?? '')`. | v27 | `[]` for current saves. |
| `state.military.enabled_event_ids` (already exists, no schema change) | `string[]` | Existing field gains a real consumer in Phase C (see §3.2). | — | unchanged |

Each persisted field must follow the Save-Schema Gate in the parent plan: optional first, validator added when current-version saves require it, fixture under `tests/fixtures/save_migration/vNN_<feature>.json`, drift-audit clean, deterministic migration in `src/state/save_migration.ts`.

### 2.4 Where The Database Stops, Where Code Begins

- The five JSON files own static definitions, branch metadata, source notes, modal authoring, and bot-response policy.
- The runtime evaluator owns ordering, eligibility, mutex/overflow, decision queueing, and effect application.
- `event_families.ts` owns the vocabulary that ties `family` and `branch_tag` to the loader and taxonomy diagnostic.
- `validateGameState.ts` owns shape proof for `closed_event_ids` and `event_causality_log` once persisted.
- No new database registry, scenario-specific override file, or per-faction event index is needed. If a future scenario needs to scope a family, do it through scenario `start_lifecycle_phase` + `apr1992_*.json` flags, not by sharding event JSON.

---

## 3. Runtime Semantics Packet

### 3.1 Existing Evaluator Contract (Preserved)

The semantics in this section are additive. None of them changes the existing contract:

- Canonical ordering: `(priority ↑, trigger.turn_min ↑, id ↑)` via `compareEventCandidates`.
- Per-turn cap: `MAX_EVENTS_PER_TURN = 4` (raised from 3 by jna_withdrawal_1992 cascade rescue, do not change).
- Mutex: only one event per `mutex_group` per turn; siblings recorded in `mutex_suppressed_ids`.
- Overflow: tail above the cap persists in `state.military.event_overflow_queue` for next-turn re-evaluation; queue is canonically sorted; queued-but-eligible candidates are tried before non-queued candidates in the same turn but still go through `compareEventCandidates`.
- Pressure events use `isEventReady` plus `triggerMatches` (both must agree).
- Once-only events check `state.military.fired_event_ids`.
- Recurrence checks `event_fire_counts` and cooldown via `event_last_fired_turn`.
- Decision events queue `pending_event_decisions` for player faction, auto-resolve via `pickBotResponseV1` / `applyAIDefaultResponse` / political-personality path otherwise; all paths call `recordEventDecision`.

### 3.2 `enables_events` and `closed_event_ids` (Phase B/C Wiring)

Today `enables_events` writes `state.military.enabled_event_ids` but no consumer reads it. The packet defines exactly two consumers:

1. **Event-level gate (additive, opt-in).** A new optional `EventDefinition.requires_enabled?: boolean` (loader-validated). When `true`, `isCandidateEligible` returns `false` unless `state.military.enabled_event_ids.includes(def.id)`. Default `false` so the existing catalog is byte-identical.
2. **Soft foreclosure.** `isCandidateEligible` returns `false` when `state.military.closed_event_ids.includes(def.id)`. This is checked before pressure/probability rolls and before queued-candidate eligibility, so a foreclosed event cannot leak from the overflow queue either.

`enables_events` semantics stay simple: any event firing appends its ids to `enabled_event_ids` (deduped, deterministic) regardless of whether downstream events use the new opt-in gate. This keeps the existing audit/diagnostic value while gating runtime activation through `requires_enabled`.

### 3.3 Promoting `future_consequences` Branches To Runtime — The Causal Substrate

`future_consequences` stays the **player-facing record**. It must not be the executable source. Reasons:

- It is a presentation contract: timing, certainty, explanation, label.
- It is authored per-response option, but downstream eligibility is global state.
- Many entries are `risk` or `conditional`; they can't be executable opens/closes.

Instead, executable causality is carried by **flags**. The branch state set by `sets_flags` is the authoritative substrate; `future_consequences` describes what that flag will mean. Downstream events gate on `trigger.condition` (`flag_equals` or `flag_at_least`) against the same flag. The schema rule from §2.2 (`branch_tag` plus downstream `trigger.condition.flag_*`) gives the loader/diagnostic enough information to verify alignment.

The runtime semantics packet then defines five executable consequences a response can produce (any combination), each backed by an existing or new persisted writer:

| Authored field on `EventResponseOption` | Persisted state effect | Existing writer reused? |
| --- | --- | --- |
| `sets_flags: { rs_strategic_goals: 'all_six', ... }` | Writes `state.military.event_flags[key] = value` (already wired). | Existing `applyDefinitionFlags`. |
| `enables_events_runtime?: string[]` (NEW, optional) | Appends ids to `state.military.enabled_event_ids` exactly like event-level `enables_events`. | Reuse `recordEnabledEvents` via a small new caller in `resolve_decision.ts` and the bot path in `evaluate_events.ts`. |
| `closes_events_runtime?: string[]` (NEW, optional) | Appends ids to `state.military.closed_event_ids` (deduped, sorted). | New writer `recordClosedEvents` symmetrical to `recordEnabledEvents`. |
| `effects[]` / `dimension_shifts[]` (existing) | Material consequences. | Existing `applyEventEffects`, `applyDefinitionDimensionShifts`. |
| `future_consequences[]` (existing, presentation only) | None — modal only. | Existing UI render. |

Rules for the new fields:

- `enables_events_runtime` and `closes_events_runtime` are **disjoint** from the presentation-only `future_consequences.opens_events` and `future_consequences.closes_events`. Loader validates the disjointness in both directions: every id in the runtime arrays must also appear in at least one `future_consequences[*].opens_events|closes_events` entry on the same option, so the player-visible record never silently diverges from runtime; the inverse is not required (some presentation entries are intentionally `risk` / `conditional` and have no runtime effect).
- Both new arrays may only reference event ids that exist in the catalog (loader-validated through the same dangling-ref pass that already covers `enables_events`).
- A response option cannot `closes_events_runtime` an event that has already fired (`fired_event_ids`); the runtime check no-ops and records a `mutex_suppressed`-style entry in `event_causality_log`.
- A response option cannot `enables_events_runtime` an event with `once: true` that is already in `fired_event_ids`; same no-op + log.
- Foreclosed events stay foreclosed across turns; there is no automatic re-opening.

This gives the system causal branches with zero new executable semantics that aren't backed by existing flag + enable + close substrate, and keeps `future_consequences` as the source of truth for what the player sees.

### 3.4 `event_causality_log`

Single writer surface in `evaluate_events.ts` + `resolve_decision.ts` + `apply_effects.ts` (limited). Append entries deterministically, sorted on serialization. Used for:

- Diagnostics (taxonomy diagnostic learns to render causal chains).
- Cost Ledger / Records / Chronicle narration ("Vance-Owen rejection foreclosed Owen-Stoltenberg acceptance window").
- Investigation when a scenario hash drifts unexpectedly.

The log is bounded by run length; for a 52w run with 44 decision events × ≤3 causal entries per fire, expect well under 1000 entries — small enough to keep alongside `event_decision_log`. No GC needed for v0.9 milestone.

### 3.5 Interactions With Existing Mechanisms

| Existing mechanism | Interaction with new causality |
| --- | --- |
| `triggerMatches` / `isEventReady` | Run **after** `closed_event_ids` and `requires_enabled` checks — closed/disabled events never reach trigger evaluation, never pay condition-evaluator cost. |
| Pressure system | `event_readiness` accumulates only when `triggerMatches` returns true; closed events have zero pressure accumulation (because eligibility short-circuits before pressure). When a closed event has prior readiness, the readiness is **not** zeroed (so re-opening (Phase D+, manual only) restores the prior state); zero accumulation while closed is sufficient. |
| Mutex | Mutex filtering applies after closure/enabled filtering; an enabled event still loses to a higher-priority same-group sibling per existing rules. |
| Overflow queue (v22) | Eligible-but-overflowed ids persist; on the next turn the closure/enabled check runs again. A close that fires after a candidate enters the overflow queue will remove it on the next eligibility pass. |
| Recurrence | Closure overrides recurrence: a closed recurring event stops recurring even if `max_fires` is not reached. |
| Notifications (v23) | No change. Notifications fire on the chosen response only. |
| Pending decisions (v24) | No change. A close cannot retroactively cancel an already-fired event's pending player decision. |
| `enabled_event_ids` (existing, unconsumed) | Becomes the read source for the new optional `requires_enabled` gate. Existing writes via `enables_events` keep working. |
| Bot calibration | Bots stay on `bot_response_logic: 'historical'`; option 0 is the historical/default path. `enables_events_runtime` and `closes_events_runtime` author what the historical path opens/forecloses; bots get the same downstream consequences without further policy. |
| Staff recommendation | `staff_recommended_response_id` continues to be UI-only and is excluded from historical bot calibration probes. A staff-recommendation option **must not** carry `enables_events_runtime` or `closes_events_runtime`. Runtime causality is restricted to rows whose modal-ready path is `historical_default_response_id` and therefore covered by the presidential-acceptance probe. Staff-recommendation rows are excluded from historical bot calibration by design; allowing them to gate downstream eligibility would let bot fallbacks silently route through non-historical causality. |

### 3.6 Failure Modes And Rejection Rules

The loader and runtime must reject the following:

- A response option with `enables_events_runtime` or `closes_events_runtime` referencing an unknown event id.
- A response option that runtime-enables and runtime-closes the same id.
- A response option whose runtime arrays disagree with its presentation arrays as described in §3.3 (presentation must mention the executed branch).
- A `future_consequences` entry whose `opens_events` / `closes_events` references an event that is not loader-resolvable (already enforced; widen to also cover the new runtime arrays).
- A sensitive-history Ring 3 family appearing as a runtime open/close target.
- A counterfactual option whose `enables_events_runtime` would open an atrocity event whose own `trigger.condition` does not include an emergent, non-author-selected predicate (this prevents authoring around the Ring rules).
- A response option whose `effects` or `sets_flags` extend, continue, or scale a sensitive-history act already in state at fire-time — including hostage detention, paramilitary deployment beyond the canonical `paramilitary_policy` surface, cleansing, civilian targeting, or camp operation. The Gate's player-authorized war-crime surface is `paramilitary_policy`; no other response-option path may authorize new sensitive acts. Existing `un_hostage_crisis_1995 → maintain_hostages` is a response-to-existing-state crisis, not authorization of new hostage-taking, and is permitted under this rule.
- A response option that carries `enables_events_runtime` or `closes_events_runtime` on an event whose modal-ready path is `staff_recommended_response_id`.
- An event with `requires_enabled: true` whose id is not referenced in any `EventDefinition.enables_events` or any `EventResponseOption.enables_events_runtime` anywhere in the catalog (unreachable gate). Additionally, at least one such opener must itself be reachable via a `historical_default_response_id` ancestor path — otherwise the historical bot calibration cannot reach the gated event, even though it is technically reachable through counterfactual play.

### 3.7 Determinism Notes

- `enabled_event_ids` and `closed_event_ids` are written through a single shared helper pair (`recordEnabledEvents`, `recordClosedEvents`) that performs dedup-on-append plus canonical sort-on-write. `recordEnabledEvents` is currently module-private at `src/sim/events/evaluate_events.ts:184`; Phase B exports it and adds the symmetrical `recordClosedEvents`. Both helpers are distinct from the overflow-queue recompute pattern (which is recomputed every turn from eligibility, not append-only).
- `event_causality_log` is sorted at every read for diagnostic / UI surfaces; the in-memory append order is also deterministic because the evaluator processes events in `compareEventCandidates` order and writes log entries in fixed substep order.
- `validateGameState` asserts `event_causality_log` is sorted on read per the §2.3 sort key, so append-order drift cannot leak through save/reload.
- No timestamps, randomness, or environment reads in the new writers.
- All new state shapes follow `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`.

### 3.8 What Stays Off Limits In This Semantics Pass

- Territory flips (`control_change`) as a runtime branch consequence are allowed only with explicit canon/historian approval per Sensitive-History Gate; no Phase B–D row introduces a new `control_change` without a separate sign-off packet.
- "Atrocity-as-lever" gating is repeated here for clarity: a counterfactual that runtime-enables an event by author-authorized cleansing is rejected by §3.6.
- Staff-recommendation rows must not gain runtime open/close capability if they would put a historical-bot run on a non-historical path.

---

## 4. Historical / Counterfactual Research Inventory (Phase A Authoring Backlog)

51 families. Each row classifies: family name; what historically happened (citation tier); historical/default option label candidate; plausible counterfactual options; likely material effects; downstream opens/closes; sensitive-history ring; source priority. Phase A research must produce a one-page worksheet per family; this is the index.

### 4.1 RS Families (15)

| # | Family | Historical fact / citation tier | Historical/default candidate | Counterfactual options | Likely material effects | Downstream opens/closes | Sensitive ring | Source priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | RS Six Strategic Goals platform | Karadzic IT-95-5/18-T; ICJ 2007 — ICTY/ICJ/UN | `all_six` | `selective`; `aggressive` | aggression_modifier, dimension_shifts, patron_pressure | opens RS paramilitary policy + Drina campaign families; closes RS reintegration | Ring 1/2 borderline — option set must not authorize abuse | A: ICTY/ICJ |
| R2 | RS paramilitary policy in war | Stakic IT-97-24, Brdjanin IT-99-36; UN reports | `always_allow` mirrors historical Arkan/White Eagles tolerance | `ask`; `always_deny` | bot priority shift, war_crimes counter (auto, not lever) | opens paramilitary sweep events; closes reintegration; closes csq_paramilitary_authorization_refused | Ring 1 (existing engine system; do not author option to authorize abuse beyond canon) | A: ICTY |
| R3 | Drina valley 1992 campaign tempo | Stakic, Krajisnik, Brdjanin; BB I — ICTY + BB | `restrained` (consistent with command discipline framing) | Blocked per Foundational packet drina_cleansing_decision_1992 ruling — convert to consequence/reflection only; no authored counterfactual option | morale, supply, displacement (engine-driven) | opens csq_drina_partisan_resistance; closes Drina reintegration | Ring 3 for option label; Ring 1 for outcome | A: ICTY |
| R4 | Prijedor / camp exposure response (1992) | Stakic; Tadic IT-94-1 — ICTY | `deny` (historical) | `obstruct`; `cooperate` | patron pressure, international_standing, ICTY-establishment tempo | opens csq_accelerated_camps_discovery_1992; opens early NATO threshold | Ring 1 — already authored; do not expand option set | A: ICTY |
| R5 | Belgrade pressure on Pale (Aug 1992) | UN/Milosevic memoirs; BB I | `acknowledge_pressure` (later defied historically per record) | `resist_patron` | patron pressure, dimension shifts | opens Milosevic distancing track | none | B: BB + corroborated |
| R6 | RS Assembly rejects Vance-Owen 1993 | UN/agreement texts; Karadzic; BB II | `reject` (historical Assembly vote) | `accept`; `override_assembly` (counterfactual: Pale overrides) | international_standing, internal_cohesion, alliance_lock | opens csq_international_disillusionment_1993; closes Vance-Owen track | none | A/B |
| R7 | RS Assembly rejection internal politics | as R6 | `accept_rejection` | `override_assembly` (already authored) | dimension shifts | already wired via current branch metadata. Phase A worksheet must specify a counterfactual cost floor — internal_cohesion and patron-trust penalties at least as severe as the international-standing cost the historical rejection avoids — to prevent override from dominating the historical default. | none | A/B |
| R8 | Belgrade embargo on RS (Aug 1994) | UN/agreement texts; BB II | `negotiate` (eventual historical accommodation) | `defiant` | supply, patron pressure, recruitment | opens csq_patron_arms_review_imposed; closes csq_patron_arms_pipeline_attenuated | none | A/B |
| R9 | Owen-Stoltenberg engagement | agreement texts; BB II | `acknowledge_pressure` | `resist_patron` | dimension shifts | opens RS partition track | none | B |
| R10 | UN safe-area enforcement (UNSC 819/824/836/844 (843 same-day pair; operative: 844 UNPROFOR troop-reinforcement)) | UN; ICTY Mladic | follow-on consequences only — not a player decision row for RS in the current design | n/a | offensive_ops_suppression in specific cases | opens NATO escalation gates | Ring 1 — engine consequence | A |
| R11 | Karadzic / Mladic split (1995) | UN/ICTY; BB II | `back_down` (Karadzic did not remove Mladic) | `remove_mladic` | command discipline, dimension shifts | opens csq_political_split_temporary; closes Mladic-led offensives where reachable | none | A |
| R12 | RS hostage crisis response (May 1995) | UN/UNPROFOR; ICTY | `release_gradually` (eventual historical path) | `maintain_hostages` (Ring 2/3 boundary — UN hostage-taking is a war crime; option may exist as exposure/consequence response, not as authorization to take more hostages — see §3.6) | international_standing, patron pressure | opens NATO Deliberate Force trigger | Ring 1/2 | A |
| R13 | Deliberate Force compliance (Sep 1995) | UN; BB II | `withdraw_heavy_weapons` | `absorb_strikes_hold_position` | combat power (equipment_quality_modifier), morale, supply | opens federation_ground_offensive readiness; closes Sarajevo siege escalation | Ring 1 | A |
| R14 | RS Holbrooke / Belgrade channel | agreement texts; BB II | `comply_with_belgrade` | `defy_us_framework` | patron pressure, alliance_lock | opens Dayton track; closes alternative endgame | none | A |
| R15 | RS Dayton acceptance | Dayton accords | `accept` | `hardline` | territorial_legitimacy, alliance, endgame | opens dayton_signed; closes prolonged-war track | none | A |

### 4.2 RBiH Families (13)

| # | Family | Historical fact / citation tier | Historical/default candidate | Counterfactual options | Likely material effects | Downstream opens/closes | Sensitive ring | Source priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | RBiH state identity (1992) | UN/Karadzic context; BB I | `civic` | `bosniak_national`; `pragmatic` | morale, dimension shifts, recruitment | opens minority-defection / minority-retention chains | none | B (already authored) |
| B2 | RBiH paramilitary policy | UN reports; BB I | `always_deny` (historical ARBiH discipline relative to RS/HRHB) | `ask`; `always_allow` | bot priority shift, war_crimes counter (auto) | opens csq_paramilitary_authorization_refused | Ring 1 | A |
| B3 | Vance-Owen acceptance (1993) | agreement text; BB II | `accept` (historical) | `reject` | dimension shifts, alliance_lock, recruitment | opens Owen-Stoltenberg / Washington track | none | A |
| B4 | Owen-Stoltenberg posture | agreement text | `reject_via_assembly` (Presidency narrowly accepted 20 Sept 1993; RBiH Assembly rejected outright 29 Sept 1993; cite UN S/26486) | `reject_sincerely` | dimension shifts | opens follow-on dilution; closes early reintegration | none | A |
| B5 | Srebrenica demilitarization (1993) | UNSC 819, Morillon; ICTY | `hide_weapons` (per Foundational packet — partial/nominal compliance) | `comply_fully`; `refuse` | enclave resilience, supply | opens Srebrenica enclave fate; closes premature fall | Ring 1/2 | A |
| B6 | Bihac corps offensive 1994 | BB II | `press_offensive` | `consolidate_defend`; `seek_negotiation`; `accept_ceasefire_terms` | morale, supply, alliance, dimension shifts | opens csq_bihac_pocket_collapses (counterfactual). Phase A worksheet must specify alliance_lock or recruitment cost reflecting the Fifth Corps political position, preventing accept_ceasefire_terms / consolidate_defend from trivially dominating press_offensive. | none | B |
| B7 | Sarajevo siege response posture | UN; ICTY Mladic | follow-on — currently engine-driven | n/a | enclave resilience | opens Sarajevo siege end conditions | Ring 1 | A |
| B8 | RBiH-Abdic relationship | BB II; UN | follow-on of abdic_apwb / abdic_karadzic_pact | n/a | dimension shifts, csq_alliance_holds | opens APWB rupture | none | A/B |
| B9 | NATO ultimatum compliance (Sarajevo HWEZ) | UN, NATO record | `comply_withdraw_hwez` | `defy_ultimatum_hwez` | enclave resilience, dimension shifts | opens NATO escalation track; closes RS siege escalation | Ring 1 | A |
| B10 | Washington Agreement acceptance (1994) | agreement text; BB II | `accept` | `reluctant` (still accepted historically; "reluctant" framing per Foundational packet) | alliance_lock (floor), dimension shifts, recruitment | opens federation track; closes Croat-Bosniak war chains | none | A |
| B11 | Federation military integration | agreement texts; BB II | follow-on of B10 | n/a | bot priority shift, alliance_lock | opens joint offensive readiness | none | A |
| B12 | Reintegration of Serb/Croat minorities in ARBiH | UN; BB; Divjak record | follow-on of B1 civic | n/a | recruitment, retention | opens minority-cohesion chain | none | B |
| B13 | RBiH Dayton acceptance | Dayton accords | `accept` | `hardline` | endgame, dimension shifts | opens dayton_signed | none | A |

### 4.3 HRHB Families (14)

| # | Family | Historical fact / citation tier | Historical/default candidate | Counterfactual options | Likely material effects | Downstream opens/closes | Sensitive ring | Source priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | HRHB political goal (1992) | Boban / Karadzic-Tudjman meetings; ICTY Prlic IT-04-74; BB | `croat_republic` (historical) | `united_front`; `strategic_ambiguity` | dimension shifts, alliance changes | opens Croat-Bosniak war chains; closes early Washington | none | A |
| H1a | Graz Karadzic-Boban meeting / RBiH-HVO 1992 cooperation collapse | 6 May 1992 Graz meeting between Karadzic and Boban; first HVO-ARBiH frictions follow — ICTY Prlic IT-04-74 + Tudjman tapes | `local_friction_emerges` | `formal_alliance_persists` | alliance (RBiH-HRHB), dimension shifts | opens H2 / H5 cascade; closes early federation | none | A |
| H2 | Gornji Vakuf clashes 1993 | ICTY Prlic; BB II | `escalate` (historical local escalation) | `negotiate` | morale, alliance, dimension shifts | opens central Bosnia war; closes early federation | Ring 1/2 | A |
| H3 | Vance-Owen pressure on HRHB | agreement text; ICTY Prlic | `acknowledge_pressure` | `resist_patron` | patron pressure, dimension shifts | opens VOPP HRHB track | none | A |
| H4 | Boban / Zagreb restraint (VOPP) | ICTY Prlic; BB | `acknowledge_pressure` | `resist_patron` | patron pressure, alliance | opens later HV/HVO realignment | none | A |
| H5 | Croat-Bosniak war 1993 (Ahmici / Stupni Do / Grabovica / Uzdol) | ICTY Blaskic, Kordic, Kupreskic, Naletilic, Prlic | follow-on of H1; engine-driven incidents | n/a | morale, war_crimes counter (auto), supply | opens detention-camp exposure | Ring 1/2 — narrative only, no leverification | A |
| H6 | HVO detention camp exposure (Heliodrom, Dretelj, Gabela) | ICTY Prlic; ICRC | `deny` (historical posture per current row) | `obstruct`; `cooperate` (counterfactual) | patron pressure, international_standing | opens accelerated tribunal track | Ring 1/2 | A |
| H7 | Zagreb orders HRHB ceasefire (1994) | Tudjman record; BB II | `acknowledge_pressure` | `resist_patron` | patron pressure, alliance_lock | opens Washington track | none | A |
| H8 | Mostar bridge destroyed 1993 | ICTY Prlic, Stari Most case; UNESCO | follow-on / narrative; not a player decision | n/a | dimension shifts, narrative | opens HRHB Western narrative track | Ring 1/2 | A |
| H9 | Washington Agreement acceptance (HRHB side) | agreement text; BB II | `accept` | `reluctant` | alliance_lock floor, dimension shifts | opens federation military integration | none | A |
| H10 | Federation military integration (HRHB side) | agreement; BB II | follow-on of H9 | n/a | bot priority shift, alliance_lock | opens joint offensive | none | A |
| H11 | HV expeditionary support (post-Storm) | BB II; design substrate (HV attached to HRHB per canon) | follow-on of Storm + Mistral 2 | n/a | equipment_quality_modifier (already wired), supply | opens late-war HRHB offensive readiness | none | A/B |
| H12 | HRHB Dayton acceptance | Dayton | `accept` | `hardline` | endgame | opens dayton_signed | none | A |
| H13 | HRHB third-entity counterfactual | design / Prlic JCE context | counterfactual only | `third_entity_push`; `federation_settle`; `defeat_into_arbih_zone` | dimension shifts, alliance_lock, control changes (canon-gated only) | opens csq_partition_referendum_proposal | none | C (design counterfactual) |

### 4.4 Cross-Faction Diplomacy & Intervention (9)

| # | Family | Historical fact / citation tier | Historical/default candidate | Counterfactual options | Likely material effects | Downstream opens/closes | Sensitive ring | Source priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X1 | London Conference 1992 | London Principles signed by all parties 26-27 Aug 1992; implementation collapsed. UN S/24795; Karadzic IT-95-5/18-T — ICTY/UN | `accept_principles` | `accept` | dimension shifts | opens early-peace track | none | A |
| X2 | Vance-Owen Plan (overall) | agreement text | composite of R6 + B3 + H3 | n/a | alliance_lock, dimension shifts | opens VOPP follow-on chains | none | A |
| X3 | Owen-Stoltenberg (overall) | agreement text | composite of R9 + B4 + H4 | n/a | dimension shifts | opens late-1993 peace track | none | A |
| X4 | Contact Group 51/49 (1994) | agreement texts | composite of all-faction Contact Group rows | n/a | alliance_lock, dimension shifts, territory partition framework | opens Dayton entry conditions; closes maximalist tracks | none | A |
| X5 | Washington Agreement (overall) | agreement text | composite of B10 + H9 | n/a | alliance_lock (floor), federation framework | opens federation track; closes Croat-Bosniak war | none | A |
| X6 | NATO escalation (Deny Flight → Deliberate Force) | UN, NATO | composite — engine-driven gating | n/a | offensive_ops_suppression, equipment_quality_modifier | opens federation offensive | none | A |
| X7 | UN safe-areas system | UN | composite — engine-driven | n/a | enclave resilience | opens fall / hold cascade | Ring 1 | A |
| X8 | Holbrooke / 51:49 halt (Oct 1995) | Holbrooke / BB II | `comply` | `push_further` | offensive_ops_suppression, alliance_lock | opens Dayton; closes Banja Luka reach | none | A (live-state gated per Foundational packet) |
| X9 | Dayton entry conditions | Dayton accords | composite of R15 + B13 + H12 | n/a | endgame, alliance_lock | opens dayton_signed | none | A |

**Totals:** 51 families. RS 15; RBiH 13; HRHB 14; cross-faction 9.

**Authoring deliverable per family:** a one-page worksheet at `docs/40_reports/research/20260527_EVENT_FAMILY_<FAMILY_ID>.md` with: cited historical narrative, defensible historical/default option (or `Blocked`), proposed counterfactual options with design provenance, exact material effects from §3.3, exact `enables_events_runtime` / `closes_events_runtime` targets keyed to other families' rows, sensitive-history ring, source notes for the modal. Phase A delivers worksheets only; Phase D authors them into JSON one row per commit.

---

## 5. Source Standard

| Tier | Use For | Examples |
| --- | --- | --- |
| `icty_icj_un` (Tier A) | All atrocity / camp / cleansing / safe-area / hostage / siege-starvation / massacre / civilian-targeting rows. Required for any rupture or condemnation-flag-bearing event. | ICTY Krstic, Karadzic, Mladic, Blaskic, Kordic, Kupreskic, Stakic, Prlic; ICJ Bosnia v. Serbia (2007); UN A/54/549. |
| `agreement_text` (Tier A) | Peace-plan rows, Washington/Dayton/Vance-Owen/Owen-Stoltenberg/Contact Group/London. | Published agreement texts and UN/EU/Contact-Group records. |
| `balkan_battlegrounds` (Tier B) | Operational chronology, control flips, campaign tempo, OOB. Acceptable for non-legal operational rows. | BB volumes I-II. |
| `corroborated_participant` (Tier B) | Memoirs and on-record participant interviews when corroborated by ICTY/BB/UN. | Filipovic/Divjak/Holbrooke records when corroborated. |
| `design_counterfactual` (Tier C) | Rows that do not depict history but model a plausible branch. Must label as `Counterfactual staff path` in the modal; never a `Historical default`. | csq_* rows, H13, R7 override. |
| `pending` | Authoring placeholder. Modal-readiness gate. Cannot ship. | — |

Source standards are enforceable through `source_tier` (§2.2) plus the existing diagnostic `historical_source_status: 'present' | 'missing'`. A row with sensitive content (Ring 1/2) must carry `source_tier in {icty_icj_un, agreement_text}` and cite the case/resolution by ID.

---

## 6. Implementation Phases

Each phase ships independently with its own tests, ledger entry, and report. The phases are strictly sequential: B cannot ship before A; C cannot ship before B; D–F can only ship the families that A has worksheeted.

### Phase A — Research Inventory And Source Packet (docs-only)

**Owner:** Historian + Game Designer + Product Manager.
**Goal:** lock the 51-family inventory in research worksheets and the source-tier vocabulary.
**Deliverable per family:** `docs/40_reports/research/20260527_EVENT_FAMILY_<id>.md` worksheet.
**Schema changes:** none. No JSON authored. No code touched.
**Tests:** `git diff --check`; lint that worksheet filenames match `20260527_EVENT_FAMILY_*.md`.
**Ledger:** PROJECT_LEDGER entry on close. Knowledge addendum if a sourcing pattern emerges that future families should reuse.
**Stop gates:** any family that can't be sourced becomes `Blocked` in the worksheet, not a paper compliance pass.

### Phase B — Runtime Semantics And Tests (engine-only, minimal data)

**Owner:** Technical Architect + Gameplay Programmer.
**Goal:** wire `requires_enabled`, `closed_event_ids`, `enables_events_runtime`, `closes_events_runtime`, and `event_causality_log`.
**Files:**
- `src/sim/events/event_types.ts` — add `requires_enabled?: boolean` on `EventDefinition`; add `enables_events_runtime?: string[]` and `closes_events_runtime?: string[]` on `EventResponseOption`; add `event_families.ts` vocabulary if Phase A worksheets require it.
- `src/sim/events/event_loader.ts` — validate new fields; validate disjoint+presentation-alignment from §3.6; reject Ring-3 leverification per §3.6.
- `src/sim/events/evaluate_events.ts` — `isCandidateEligible` short-circuit on `closed_event_ids` and `requires_enabled`; append `event_causality_log` entries on enables / closes / mutex / overflow events.
- `src/sim/events/resolve_decision.ts` — call shared `recordEnabledEvents` / `recordClosedEvents` on the chosen response.
- `src/sim/events/apply_effects.ts` — no new effect kinds; reused.
- `src/state/game_state.ts` — `closed_event_ids: string[]` (optional), `event_causality_log: CausalityLogEntry[]` (optional).
- `src/state/validateGameState.ts` — shape proof on both.
- `src/state/save_migration.ts` — v26 (closed_event_ids), v27 (event_causality_log); deterministic `[]` defaults.
- `tests/event_loader.test.ts` — reject mismatched runtime/presentation arrays, dangling refs, ring-3 enabling.
- `tests/events_evaluate.test.ts` — closed candidates never become eligible; requires_enabled gates correctly; queued candidates re-evaluated against closure on next turn; pressure readiness does not accumulate while closed; mutex/overflow ordering unaffected when no rows use the new fields.
- `tests/event_decisions.test.ts` — response-level enables/closes applied on player path and bot path; `event_decision_log` parity preserved.
- `tests/state/event_state_shape_validation.test.ts` — new shapes accepted and malformed rejected.
- `tests/save_migration.test.ts` and `tests/save_migration_validator_rejection.test.ts` — v26/v27 migrations and rejection coverage.
- `tests/save_migration_drift_audit.test.ts` — drift audit clean on new fields.
- `tools/diagnostics/event_taxonomy_report.ts` — surface runtime open/close inventory; emit findings when presentation arrays disagree with runtime arrays.
- `tools/diagnostics/event_acceptance_report.ts` — count rows with runtime causality wiring.
**Verification (Workstream B contract):**
```powershell
node node_modules\vitest\vitest.mjs run tests\event_loader.test.ts tests\events_evaluate.test.ts tests\event_decisions.test.ts tests\event_effects.test.ts tests\event_timeline_integrity.test.ts tests\player_decision_manifest.test.ts tests\state\event_state_shape_validation.test.ts tests\save_migration.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\startup_snapshot_contract.test.ts --reporter=dot
npx.cmd vitest run tests\determinism_static_scan_r1_5.test.ts --reporter=dot
node tools\diagnostics\save_migration_drift_audit.cjs
npm.cmd run desktop:startup-snapshot:build
npm.cmd run typecheck
npm.cmd run test:baselines
```
**Expected scenario hash impact:** none, because no Phase B JSON row uses the new runtime arrays and `requires_enabled` defaults to `false`. If `test:baselines` drifts in Phase B, stop and explain via event ordering / queue / migration default — do not refresh.
**Stop gates:** any drift; any save-shape change without migration fixture; any leverification path leaking through `enables_events_runtime`.
**Ledger:** PROJECT_LEDGER entry for behavior-permitting infrastructure change.

**Phase B Implementation Notes (non-blocking):**

- **Sort-on-write is net-new behavior, not a rename.** The existing `recordEnabledEvents` at `src/sim/events/evaluate_events.ts:184` performs dedup-on-append only; it does not sort. Phase B's "canonical sort-on-write" requirement (§3.7) introduces new ordering behavior, even though the helper signature is preserved. The Phase B PROJECT_LEDGER entry must call this out so reviewers do not read it as a pure refactor. (Source: Technical Architect round-2 review.)
- **Loader-test the §3.6 clause overlap.** §3.6's pre-existing Ring-3 atrocity-gating clause and the new continuation-of-act clause (Edit 5) overlap. An author could attempt to satisfy one while skirting the other (e.g., a response that scales an existing camp operation without authoring a new Ring-3 event). Phase B loader tests must include a rejection case at the overlap so future authoring cannot pass by satisfying only one rule. (Source: Game Designer round-2 review.)

### Phase C — First Executable Causal Packet (RS Strategic Goals → paramilitary policy availability)

**Owner:** Gameplay Programmer + Game Designer.
**Goal:** Use Phase B substrate to wire one closed loop: RS strategic-goals decision (R1) opens RS paramilitary-policy availability (R2) and forecloses RS reintegration counterfactuals. The candidate row stays a player-visible decision; `bot_response_logic: 'historical'` keeps calibration on `all_six` (or the precise historical default Phase A worksheet settles).
**Data changes:** R1 response options gain `enables_events_runtime` / `closes_events_runtime` consistent with R2's `requires_enabled` and the matching `future_consequences` entries.
**Tests:**
- focused event tests: R1 → `enabled_event_ids` and `closed_event_ids` deltas; R2 eligibility before/after R1 fires.
- player-path test: R1 player resolution writes the runtime arrays.
- bot-path test: R1 historical bot resolution writes the same runtime arrays.
- regression: Phase C — Byte-identity required outside the R2 firing turn. On the R2 firing turn, scenario hash may drift, but (a) the drift must reproduce identically across two consecutive runs of the same fixture, and (b) a focused acceptance test pins the exact set of OSIDs / state fields whose deltas were predicted in the PROJECT_LEDGER entry — no unexplained territorial or casualty deltas. No numeric tolerance; deterministic equality always.
**Verification:**
```powershell
npm.cmd run sim:scenario:run:40w
npm.cmd run test:baselines
```
**Stop gates:** sensitive-history regression; calibration drift not tied to the new opening; Ring rules violated.

### Phase D — HRHB Alliance Branch

**Owner:** Game Designer + Historian.
**Goal:** Wire H1 → H2 / H5 / H6 (Croat-Bosniak war chain) and H9 / H10 (Washington / federation chain), with H1 = `united_front` foreclosing the war chain while `croat_republic` opens it.
**Data changes:** one family per commit, starting with H1 → H9 (Washington open/close) because it has no sensitive prose.
**Verification:** focused tests + 52w scenario proof. 188w only if the slice can move endgame.
**Stop gates:** sensitive ring violations on H5/H6/H8; counterfactual labeled as historical.

### Phase E — RBiH State Identity / Reintegration Branch

**Owner:** Game Designer + Historian.
**Goal:** Wire B1 (state identity) to B12 (minority retention) and B7/B8 (enclave / Abdic) where defensible.
**Data changes:** one family per commit.
**Verification:** focused tests + 52w scenario proof.

### Phase F — Peace-Plan And Late-War Branches

**Owner:** Game Designer + Historian + Modern Wargame Expert review.
**Goal:** Wire X2 / X3 / X4 / X5 / X8 / X9 as composite cross-faction gates whose runtime opens/closes coordinate the per-faction rows (R6 / R8 / R14 / R15; B3 / B4 / B10 / B13; H3 / H4 / H7 / H9 / H12).
**Data changes:** one family per commit.
**Verification:** focused tests + 188w scenario proof. Banja Luka / Dayton entry conditions live-state-gated per Foundational packet.
**Stop gates:** any row that closes a chain by date alone; any Holbrooke halt framing that overclaims live-state proof.

---

## 7. Verification Plan

| Layer | Phase A | Phase B | Phase C | Phase D–F |
| --- | --- | --- | --- | --- |
| Loader | n/a | New runtime arrays; ring-3 enable rejection; disjoint/presentation alignment | per-row dangling ref tests | per-family loader add tests |
| Loader rejection | n/a | §3.3 alignment rule (runtime arrays ⊂ presentation arrays); unknown `branch_tag` vocabulary; downstream `requires_enabled` event whose `trigger.condition` does not reference the branching response's `sets_flags` key; Ring-3 enabling rejection; staff-recommendation runtime-causality rejection | per-row rejection coverage | per-family rejection coverage |
| Evaluator | n/a | Closed/enabled gating; pressure non-accumulation; queued re-eval; mutex/overflow unaffected; queued-overflow + same-turn close interaction; pressure non-accumulation while closed (readiness preserved on close); no-op + causality-log entry when targets are already in `fired_event_ids` | R1 → R2 eligibility | per-family eligibility chains |
| Causality-log acceptance | n/a | covered by Phase C focused test | per-row focused acceptance test pinning the exact `(from_event, to_event, kind)` triple set produced when R1's historical-default driver fires | Each family commit (Phases D-F) ships a focused acceptance test that pins the exact `(from_event, to_event, kind)` triples produced when its historical-default driver fires — same shape as the Phase C focused acceptance test but per-family. Locks the causal chain as a contract rather than a side-effect; catches silent log-entry drops or duplicates that eligibility tests would miss. |
| Apply effects | n/a | no new kinds; reused | reused | reused unless Phase D introduces a kind (then schema/index-shift protocol) |
| Save migration | n/a | v26 closed_event_ids; v27 event_causality_log; fixtures; drift audit | n/a (no new fields) | n/a (no new fields) |
| Validator | n/a | shape proof on new state | n/a | n/a |
| Determinism re-run | n/a | Focused test that `evaluateEvents` produces byte-identical `enabled_event_ids` / `closed_event_ids` / `event_causality_log` across two consecutive runs on the same fixture. `tests/save_migration_drift_audit.test.ts`, `tools/diagnostics/save_migration_drift_audit.cjs`, and `tests/startup_snapshot_contract.test.ts` are blocking gates, not advisory. | repeated for any new-field path | repeated per family |
| UI modal | n/a | future_consequences cards unchanged; runtime-vs-presentation diagnostic surfaced in catalog test; taxonomy presentation-vs-runtime alignment finding renders | per-row modal rendering test | per-family modal rendering test |
| Historical bot calibration | n/a | unchanged | R1 historical bot writes runtime arrays; calibration byte-identical unless R2 fires | per-family calibration check |
| Scenario proof | n/a | 40w byte-identity required; 188w if behavior can move | 40w (and 52w if Phase C row fires) | 52w for mid-war; 188w for late-war/endgame — B5, B6, H11 are **188w required** (not 52w). Rationale: Rupture cascade (B5), 1994 Bihac pocket counterfactual (B6), and HV post-Storm equipment uplift (H11) only materialize at the 1995 window. |
| Diagnostics | inventory worksheets | taxonomy/acceptance/presidential JSON smoke | smoke | smoke |
| Final acceptance commands | `git diff --check` | full Workstream B block (see Phase B) | Phase B block + `sim:scenario:run:40w` | Phase B block + 52w/188w |

Every phase runs:

```powershell
npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json
npx.cmd tsx tools\diagnostics\event_acceptance_report.ts --json
npx.cmd tsx tools\diagnostics\event_presidential_acceptance.ts --json
npm.cmd run typecheck
git diff --check
```

Phase B+ additionally runs:

```powershell
npx.cmd vitest run tests\event_loader.test.ts tests\events_evaluate.test.ts tests\event_decisions.test.ts tests\event_effects.test.ts tests\event_timeline_integrity.test.ts tests\player_decision_manifest.test.ts tests\sim\events\event_taxonomy_report.test.ts tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_presidential_acceptance.test.ts tests\state\event_state_shape_validation.test.ts tests\save_migration.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\ui\event_decision_modal_phase3.test.ts tests\ui\event_decision_modal_catalog.test.ts --reporter=dot
npm.cmd run desktop:map:build
npm.cmd run test:baselines
```

`npm.cmd run test:baselines -- --update` is permitted only after written approval and a documented drift explanation tied to event ordering, runtime causality wiring, or migration defaults.

---

## 8. Non-Goals

- No dozens of new events authored in this packet. Authoring begins in Phase D, one row per commit.
- No territory flips (`control_change`) without explicit canon/historian sign-off per the Sensitive-History Gate.
- No atrocity as player lever. Every option that touches Ring 1/2 must be vetted against §3.6.
- No staff-recommendation row promoted to historical bot calibration default.
- No change to calibration branch work or 40w/52w/188w expected hashes outside what Phase B/C/D explain in PROJECT_LEDGER.
- No new worktree.
- No large run artifacts persisted in the proposal.
- No edits to `docs/10_canon/FORAWWV.md`.
- No new GUI shell or parallel decision authority — modal-first contract per the active plan stays load-bearing.
- No "calendar-only" foreclosure: a counterfactual must be foreclosed by player choice + flags, not by a date passing.
- No new effect kinds in Phase B; if Phase D needs one, it follows the EFFECT_KIND_ORDER protocol with documented index-shift cost.
- No conversion of `future_consequences` into the executable source — it stays presentation.

---

## 9. Open Questions (For Product / Canon Owners)

These do not block the packet but should be answered before Phase D begins:

1. Should Phase D include H13 (HRHB third-entity counterfactual) as a player-selectable option, given that it currently exists only in `csq_partition_referendum_proposal`? Foundational packet requires explicit user/Product approval before authoring as a foundational choice.
2. Does Product Manager want event-level `requires_enabled` to be a per-trigger gate (current proposal: yes, single boolean) or a per-condition predicate that can be combined with other trigger conditions? Recommend per-trigger boolean for simplicity; can be upgraded later.
3. Should `closed_event_ids` allow Phase D author-level "auto-reopen on flag clear" semantics, or do all re-opens require an explicit later response? Recommend strict mode: no auto-reopen; an event closed by player choice stays closed unless an explicit later decision restores it.
4. Phase C target — R1 → R2 is the cleanest first executable packet because R2 already has a Ring 1 ceiling that prevents leverification. Confirm with Game Designer that this is the right packet vs. H1 → H9 (Washington open) which has no Ring 1 content but is more diplomatic-flavored.
5. Is the 51-family Phase A inventory the right scope, or should it expand to include lower-tier rows (csq_*) that are currently in `consequences.json`? Recommend keeping Phase A at 51 historical-family worksheets; csq_* rows are already structurally authored and should be re-classified rather than re-researched.

---

## 10. Done Means

Done for **this packet** (docs-only):

- This proposal lands on disk under `docs/40_reports/proposals/`.
- COMMAND_BOARD row `Event system presidential core upgrade` does not need updating yet; the proposal is the next-action handoff.
- The next executable session reads §2 and §3 and starts on Phase A worksheets.

Done for **Phase A**:

- 51 family worksheets live under `docs/40_reports/research/`.
- Each family has a defensible historical/default option or a `Blocked` classification.
- Source tier is explicit per row.
- No JSON or code touched.

Done for **Phase B**:

- `requires_enabled`, `closed_event_ids`, `event_causality_log`, `enables_events_runtime`, `closes_events_runtime` exist, validated, and tested.
- 40w scenario byte-identical because no row uses them yet.
- v26/v27 save migrations land with fixtures and drift-audit proof.
- Loader rejects every failure mode in §3.6.

Done for **Phase C**:

- One executable causal packet ships, with focused tests and explained scenario drift.
- Historical bot calibration unchanged at the bot pick.
- Modal renders unchanged `future_consequences` cards plus new diagnostic visibility.

Done for **Phases D–F**:

- Each family ships in its own commit with focused tests + scenario proof.
- No sensitive-history boundary moved.
- Phase F closes with full late-war / Dayton causal coverage.

---

## 11. Orchestrator Completion Block

**Canonical owner:** Event-system product/engine lane.

**Reviewer matrix:**
- Phase A: Historian + Game Designer + Product Manager.
- Phase B: Technical Architect + Gameplay Programmer; reviewed by Determinism Auditor, QA Engineer, Canon Compliance Reviewer.
- Phase C: Gameplay Programmer + Game Designer; reviewed by Modern Wargame Expert, QA, Determinism Auditor.
- Phases D–F: Historian + Scenario Creator/Runner/Tester + Gameplay Programmer; reviewed by Game Designer, Canon Compliance Reviewer, QA. Each Ring 1/2 row also requires Narrative Designer sign-off.

**Demoted path:** broad event prose authoring before Phase A inventory closes; runtime branch implementation before Phase B substrate ships; territory flips without canon approval.

**Player-visible truth:** modal-first presidential dossier (per Workstream C) continues to render situation, evidence, historical baseline, options, numeric consequences, source note, future-consequence cards, and record trail. Branch metadata stays the player-visible record; runtime causality stays internal to the engine but flows through the same flags the modal already shows.

**Done means:** see §10.

---

## 12. Revision History

| Version | Date | Author / Scope | Summary |
| --- | --- | --- | --- |
| v1 | 2026-05-27 | Event-system product/engine lane | Original packet. §0–§11 as authored. |
| v1.1 | 2026-05-27 | Panel-driven revision | 13 edits applied across §2.2, §3.5, §3.6, §3.7, §4 R3 / X1 / B4 / R7 / B6 / new H1a, §7. No new findings; reviewer-driven corrections only. |
| v1.2 | 2026-05-27 | Residual closure | 3 reviewer-named residual edits. Edit 14 §7 verification matrix — added "Causality-log acceptance" row pinning the exact `(from_event, to_event, kind)` triple set produced when each family's historical-default driver fires (QA Engineer residual). Edit 15 §10 Phase A "Done means" — `50 family worksheets` → `51 family worksheets` to match v1.1 H1a addition (Historian residual). Edit 16 §6 Phase B — new "Phase B Implementation Notes (non-blocking)" subsection with two bullets: sort-on-write is net-new behavior not a rename (Technical Architect round-2 review); loader-test the §3.6 clause overlap between Ring-3 atrocity-gating and the new continuation-of-act clause (Game Designer round-2 review). No new findings beyond the four named reviewers' residuals. |
| v1.3 | 2026-05-27 | Historian round-3 verification | Edit 17 — full-packet stale-count sweep: replaced remaining `50-family` / `50 historical-family` references with `51` (§5, §9). Source: Historian round-3 verification. |

**v1.1 edit log and reviewer attribution:**

1. §4 R3 (Drina campaign) counterfactual-options cell — Canon Compliance Reviewer NO-GO finding (Gate §1 data-not-comment / Stupčanica-95 lesson 2026-05-07). Replaced `systematic` lever with `Blocked per Foundational packet drina_cleansing_decision_1992 ruling — convert to consequence/reflection only; no authored counterfactual option`.
2. §4 X1 (London Conference 1992) — Historian must-fix. Historical default `reject` → `accept_principles`; citation expanded to UN S/24795 + Karadzic IT-95-5/18-T.
3. §4 B4 (Owen-Stoltenberg / HMS Invincible) — Historian must-fix. Historical default `accept_for_optics` → `reject_via_assembly`; appended Presidency-narrowly-accepted-20-Sept / Assembly-rejected-29-Sept / UN S/26486 citation.
4. §4 new H1a row (Graz Karadzic-Boban meeting / RBiH-HVO 1992 cooperation collapse) — Historian coverage gap. Inserted between H1 and H2. Updated §4 totals: 50 → 51 families; HRHB 13 → 14.
5. §3.6 — Canon Compliance Reviewer + Game Designer convergent. Appended rejection rule against response options extending or scaling sensitive-history acts in state; `paramilitary_policy` remains the only player-authorized war-crime surface.
6. §3.5 / §3.6 staff-recommendation hardening — Game Designer must-fix. §3.5 staff-recommendation row replaced; §3.6 gained matching rejection bullet. Staff-recommendation rows can no longer carry runtime causality.
7. §3.7 writer contract — Technical Architect + Determinism Auditor convergent. Shared `recordEnabledEvents` / `recordClosedEvents` helper pair with dedup + canonical sort; `evaluate_events.ts:184` export note. Added `validateGameState` on-read sort assertion bullet.
8. §3.6 loader reachability — Technical Architect + Game Designer convergent. Appended unreachable-gate rejection plus historical-default ancestor reachability requirement.
9. §2.2 material consequence minimum — Game Designer must-fix. Expanded condition set with `enables_events_runtime` / `closes_events_runtime` non-empty; clarified Cost-Ledger annotations route through existing `cost_ledger_annotation` effect kind.
10. §7 verification matrix — QA Engineer must-fix. Added Determinism re-run row (blocking gates); added Loader rejection row; expanded Evaluator row with queued-overflow + same-turn close interaction, pressure non-accumulation while closed, no-op + causality-log on already-fired targets; UI modal row gained taxonomy presentation-vs-runtime alignment finding.
11. §7 Phase C drift gate — QA Engineer must-fix. Phase C regression bullet rewritten: byte-identity outside R2 firing turn; deterministic reproducibility on the firing turn; focused acceptance test pinning predicted-delta OSIDs / state fields; no numeric tolerance.
12. §7 scenario proof column — QA Engineer must-fix. B5, B6, H11 marked 188w-required (not 52w); rationale noted inline (rupture cascade, 1994 Bihac pocket counterfactual, HV post-Storm equipment uplift only materialize at the 1995 window).
13. §4 R7 and B6 worksheet directives — Game Designer must-fix. R7 worksheet must specify counterfactual cost floor preventing `override_assembly` from dominating the historical default; B6 worksheet must specify alliance_lock or recruitment cost preventing `accept_ceasefire_terms` / `consolidate_defend` from trivially dominating `press_offensive`.
