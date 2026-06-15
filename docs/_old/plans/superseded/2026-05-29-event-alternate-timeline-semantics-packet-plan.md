# Event Alternate-Timeline Semantics Packet — Plan

**Date:** 2026-05-29
**Owner lane:** Event-system product/engine lane (Technical Architect + Game Designer hats), with Historian and Canon-Compliance gates for content, QA/Determinism gate for runtime.
**Status:** Planning only. NO code, NO data, NO commit. This document is the plan for the **technical semantics packet** named as the explicit STOP GATE in `docs/plans/COMMAND_BOARD.md` ("Do not implement runtime response-level branch behavior until a technical semantics packet approves exact open/close flag/event behavior").
**Branch:** `codex/diagnostics-output-artifact-doc-closeout`.
**Behavior change introduced by this plan:** none (it is a plan). The semantics packet it specifies is **approval + consolidation**, also behavior-neutral until the authoring ramp.

---

## 0. Critical Current-State Correction (read first)

The COMMAND_BOARD framing treats runtime branch behavior as not-yet-implemented. **The codebase contradicts that framing.** Verified facts as of this plan:

- The substrate is **fully wired**, not pending. `evaluate_events.ts` already reads `closed_event_ids` and `requires_enabled` in `isCandidateEligible` (`src/sim/events/evaluate_events.ts:290`, `:295`), writes `enabled_event_ids` / `closed_event_ids` / `event_causality_log` through single-writer helpers (`recordEnabledEvents` :191, `recordClosedEvents` :216, `recordCausality` :240), and applies response-level runtime causality on both player and bot paths (`applyResponseRuntimeCausality` :329, called at :594).
- The schema is shipped: `EventResponseOption.enables_events_runtime` / `closes_events_runtime` / `branch_tag` and `EventDefinition.requires_enabled` / `family` / `source_tier` / `emergence_class` exist in `src/sim/events/event_types.ts:374-540`.
- The save schema is shipped: `closed_event_ids` (game_state.ts:2289) and `event_causality_log` + `CausalityLogEntry` (`:2002`, `:2294`) with migrations **v32/v33** (`src/state/save_migration.ts:740-756`) — NOT the v26/v27 the prior packet predicted.
- **Data already uses these fields:** 57 `enables_events_runtime`/`closes_events_runtime`/`requires_enabled` occurrences across the four `war_19xx.json` files, including **42 `requires_enabled: true` rows** (`data/scenarios/events/*.json`).
- The loader already enforces the §3.6 rejection rules: `validateRing3EnablingRejection`, `validateRuptureForeclosurePolicy`, `validateUnreachableGates` (with the historical-default-reachable opener check at `event_loader.ts:900-922`), plus the two-channel vocabulary guards `validateDimensionShiftVocabulary` (`:939`) and `validateEffectKindVocabulary` (`:1003`).

**Consequence for this packet.** The exact open/close semantics were authored by `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` (the "Runtime Semantics Packet") and **implemented in Phase B**. This plan does NOT re-invent them. Its job is the gate the COMMAND_BOARD actually still needs:

1. **Ratify** that the already-shipped runtime open/close behavior exactly matches the approved §3 semantics and the Foundational Decisions Packet rulings (an audit + canon sign-off, not a re-design).
2. **Close the alternate-timeline gap** the prior packets left open: the explicit historical/counterfactual **source database structure + provenance + labeling** that broad `csq_*` authoring depends on.
3. **Gate the authoring ramp** (Phases D–F) behind that ratification, with byte-identity proof that the wired-but-largely-dormant substrate has not already moved baselines.

If ratification finds the implementation diverges from approved semantics, this packet's deliverable converts to a remediation plan before any csq_* authoring proceeds.

---

## 1. Objective

Unblock (a) runtime response-level branch behavior and (b) broad `csq_*` consequence-event authoring with **deterministic, auditable, canon-compliant** open/close semantics, by producing the one technical packet the STOP GATE requires. The packet must let an external agent author counterfactual branches one row per commit without ever:

- silently writing a DEAD channel (wrong DimensionId vs EffectKind),
- opening a branch by calendar instead of player choice/flags/live predicates,
- routing a historical-bot calibration run onto a non-historical path,
- enabling a sensitive-history act as a player optimization lever,
- drifting a scenario hash without a pinned, explained, reproducible cause.

**Why now:** the substrate is live and data already exercises it, but the *approval gate* the board names is not signed. Authoring `csq_*` breadth on an unratified substrate risks shipping branch behavior and a source database that canon has not blessed.

---

## 2. Scope & Non-Scope

### In scope (what this packet defines / approves)
- **Ratification audit** of the implemented open/close semantics vs `20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` §3 and the Foundational Decisions Packet.
- **The exact open/close contract**, restated as the authoritative single source (§4) so authors do not have to reverse-engineer it from code.
- **Alternate-timeline source database structure** (§5): how historical vs counterfactual rows, provenance, and labels are organized and validated.
- **The authoring ramp gate** (§6): the conditions under which Phases D–F may author each family.
- **Verification gates** that prove the dormant substrate is byte-identical with the historical-default path (§8).

### Non-scope (this packet proposes; it does not unilaterally ship)
- It does **not** author `csq_*` rows. Authoring is Phases D–F, one row per commit, each separately reviewed.
- It does **not** introduce new `EventEffect` kinds, new `DimensionId`s, new mutex/overflow/cap semantics, or any GUI redesign.
- It does **not** approve `control_change` as a branch consequence (stays canon/historian-gated per §3.8 of the runtime packet).
- It does **not** reopen any Ring-3 sensitive-history surface.
- It does **not** change the historical-bot calibration default policy (`bot_response_logic: 'historical'`, option-0 historical).

---

## 3. Current-State Findings (branch metadata, where runtime reads it, file:line)

| Concern | Status | Evidence |
| --- | --- | --- |
| Player-facing branch metadata | Behavior-neutral, shipped | `EventFutureConsequence` (opens_events/closes_events/opens_flags/closes_flags/material_effect_refs) `event_types.ts:316-339`; rendered as cards, modal slice closed (`20260527_EVENT_FUTURE_CONSEQUENCE_MODAL_SLICE.md`). |
| Runtime open (enable) gate | Wired | `EventDefinition.requires_enabled` `event_types.ts:497-506`; read at `evaluate_events.ts:295-298`; write source `enables_events` (event-level) `:619-630` and `enables_events_runtime` (response-level) via `applyResponseRuntimeCausality` `:339-357`. |
| Runtime close (foreclosure) gate | Wired | `closed_event_ids` short-circuit `evaluate_events.ts:290`; writer `recordClosedEvents` `:216`; response-level `closes_events_runtime` `:361-377`. |
| Causal chain representation | Wired | `event_causality_log` + `CausalityLogEntry` kinds `enables`/`closes`/`opens_flag`/`closes_flag`/`mutex_suppressed`/`overflowed` (`game_state.ts:2002-2009`); written for flags `:499-510`, enables `:619-630`, mutex `:464-472`, overflow `:476-484`. |
| Player/bot parity | Wired | `applyResponseRuntimeCausality` used by bot path (`:594`) and (per code comments) `resolve_decision.ts` for player path — **ratification must confirm the player-path call site exists and matches.** |
| Determinism | Enforced | Single-writer + sort-on-write via `strictCompare` (`:205`, `:230`) and `compareCausalityEntries` (`:262`); candidate ordering `compareEventCandidates` (`:41`). |
| Two-channel vocab guard | Enforced | `validateDimensionShiftVocabulary` (`event_loader.ts:939`) / `validateEffectKindVocabulary` (`:1003`) reject DEAD writes at load. |
| Sensitive-history loader gates | Enforced | `validateRing3EnablingRejection`, `validateRuptureForeclosurePolicy`, `validateUnreachableGates` invoked `event_loader.ts:1095-1098`. |
| Save schema | Shipped | migrations v32/v33 (`save_migration.ts:740-756`); empty-`[]` deterministic defaults. |
| Data already exercising substrate | Yes | 57 runtime-array occurrences; 42 `requires_enabled:true` rows across `war_19xx.json`. |

**Open gaps this packet must close:**
1. No signed ratification that the live behavior == approved semantics == Foundational rulings.
2. No proof the 42 `requires_enabled:true` rows + 57 runtime arrays are byte-identical with the historical-default path (i.e. the substrate, though wired, has not silently moved baselines).
3. No locked alternate-timeline **source database** structure/labeling for the broad `csq_*` ramp.
4. `material_effect_refs` validated/reported but not rendered (acknowledged residual) — packet must state it stays out of scope, not silently DEAD.

---

## 4. Proposed Semantics — The Core Deliverable (authoritative restatement)

These are the **approved** semantics this packet ratifies. They are restated here so authors treat this file (not the code) as the contract. Where the restatement and code disagree, the ratification audit (§7 Phase R) resolves it before any authoring.

### 4.1 How a response OPENS a future branch
A response option opens a downstream branch through **two layered mechanisms**, never through `future_consequences` (which is presentation-only):

- **Flag substrate (authoritative).** The chosen option's `sets_flags: { <branch_tag_key>: <value> }` writes `state.military.event_flags`. Downstream events gate on `trigger.condition` `flag_equals` / `flag_at_least` against that same key. This is the *causal truth*: the branch state is the flag.
- **Eligibility gate (opt-in activation).** The option's `enables_events_runtime: string[]` appends ids to `enabled_event_ids`. A downstream event with `requires_enabled: true` is ineligible until its id is present. Default `requires_enabled: false` ⇒ the existing catalog is unaffected.

Rule: every id in `enables_events_runtime` MUST also appear in at least one `future_consequences[*].opens_events` on the same option (loader-enforced presentation alignment), so the player record never diverges from runtime. The inverse is not required (some presentation entries are intentionally `risk`/`conditional`).

### 4.2 How a response CLOSES a future branch
- **Soft foreclosure (authoritative).** `closes_events_runtime: string[]` appends ids to `closed_event_ids`. `isCandidateEligible` short-circuits to `false` for any id in `closed_event_ids` **before** pressure/probability/trigger evaluation, so a foreclosed event never accumulates pressure and cannot leak from the overflow queue.
- **Mutual exclusivity.** A branch is "closed" relative to its siblings because the chosen flag value differs from the sibling's required value; downstream sibling events fail their `flag_equals` predicate. `mutex_group` only deduplicates *same-turn* siblings, not cross-turn branch exclusivity — branch exclusivity is the flag.
- **No automatic re-open.** Foreclosure persists across turns; readiness is NOT zeroed on close (so a future manual re-open path could restore prior state). There is no calendar-based re-open.

### 4.3 Causal chains
A chain is a sequence of (flag-write → downstream `flag_equals` gate) and/or (`enables_events_runtime` → `requires_enabled`) links, audited by `event_causality_log`. Each link writes a `CausalityLogEntry` with `kind` ∈ {`enables`,`closes`,`opens_flag`,`closes_flag`,`mutex_suppressed`,`overflowed`}, `from_event`, `to_event`/`to_flag`, and `source_response_id` for response-driven links. The log is the chain's auditable trace; narration (Cost Ledger / Chronicle) reads it.

### 4.4 Ordering / determinism rules
- Candidate ordering: `(priority ↑, trigger.turn_min ↑, id ↑)` via `compareEventCandidates`.
- All branch-state arrays (`enabled_event_ids`, `closed_event_ids`) are dedup-on-append + canonical sort-on-write via `strictCompare`.
- `event_causality_log` sorted via `compareCausalityEntries` on write AND asserted sorted by the validator on read, so append-order drift cannot leak through save/reload.
- No `Math.random`, `Date.now`, timestamps, or env reads in any writer (CLAUDE.md sacred).

### 4.5 Alternate-timeline vs historical-default labeling (runtime-relevant)
- `EventResponseOption.historical_marker: 'historical_default' | 'counterfactual'` is the per-option label.
- The single historical-default path per event is `EventDefinition.historical_default_response_id`; `staff_recommended_response_id` is UI advice only and is **excluded** from the historical-bot calibration probe.
- **Hard rule:** a `staff_recommended_response_id` option MUST NOT carry `enables_events_runtime`/`closes_events_runtime`. Runtime causality is restricted to options reachable on the historical-default path, so a historical-bot run never silently routes through non-historical causality. (Loader `validateUnreachableGates` enforces the dual: every `requires_enabled` event must have a historical-default-reachable opener — `event_loader.ts:900-922`.)
- A counterfactual branch may only be opened by an explicit player choice (or a bot only when option-0 is itself the historical default that opens it). **Never by date alone.**

### 4.6 Interaction with mutex_group + overflow queue + 4-event cap
- Closure/enabled checks run **before** mutex, overflow, and cap. A foreclosed/ungated event is removed at eligibility; it never consumes a cap slot, never enters the overflow queue, never suppresses a mutex sibling.
- An enabled event still loses to a higher-priority same-`mutex_group` sibling per existing rules; the cap (`MAX_EVENTS_PER_TURN = 4`) is unchanged and MUST NOT be raised for branch authoring.
- A close that fires while a candidate sits in the overflow queue removes it on the next eligibility pass.

### 4.7 No-op rules
- `closes_events_runtime` targeting an already-fired event: state no-op (no write needed), but a causality entry IS recorded (audit captures intent).
- `enables_events_runtime` targeting a `once:true` already-fired event: same no-op + audit entry.

### 4.8 Save-schema implications (key deliverable for §9 reporting)
The persisted surface is **already shipped** at migrations **v32 (`closed_event_ids`) and v33 (`event_causality_log`)** with deterministic empty-`[]` defaults; `enabled_event_ids` predates this. Therefore this packet introduces **NO new save-schema fields**. The save-schema work is **verification, not creation**: confirm v32/v33 migration determinism, validator shape-proof, fixture coverage, round-trip, and drift-audit cleanliness — and confirm the validator asserts `event_causality_log` sorted-on-read. If the ratification audit (§7 Phase R) finds a missing validator assertion, that becomes a focused bug-fix slice gated by `SAVE_SCHEMA_EVOLUTION.md`, NOT a new version bump.

---

## 5. Alternate-Timeline Source-Database Structure

The five existing JSON files (`war_1992/1993/1994/1995.json`, `consequences.json`) remain the database. No new registry file (it would duplicate `loadEventDefinitionsFromDir` ordering). Structure for the historical/counterfactual database + provenance:

- **Historical vs counterfactual at the row + option layer.** Event provenance is `EventDefinition.source_tier` ∈ {`icty_icj_un`, `agreement_text`, `balkan_battlegrounds`, `corroborated_participant`, `design_counterfactual`, `pending`}. Option provenance is `historical_marker`. A `design_counterfactual` row may never carry `historical_default` on any option.
- **Family grouping.** `EventDefinition.family` (vocabulary in `event_families.ts`) groups rows into the 51 causal families (RS 15 / RBiH 13 / HRHB 14 / cross-faction 9) from the runtime packet §4. Authoring-only; no runtime use.
- **Provenance worksheets (the source database's research layer).** One per family at `docs/40_reports/research/20260527_EVENT_FAMILY_<id>.md`: cited historical narrative + tier; the defensible historical/default option (or `Blocked`); counterfactual options with design provenance; exact material effects; exact `enables_events_runtime`/`closes_events_runtime` targets keyed to other families; sensitive ring; modal source notes. **Worksheet existence is the gate** for authoring that family's JSON.
- **Source-tier enforcement.** Any Ring-1/2 (sensitive) row must carry `source_tier ∈ {icty_icj_un, agreement_text}` and cite the case/resolution by ID. `pending` is a modal-readiness blocker and cannot ship.
- **Counterfactual labeling truth.** Every counterfactual option's modal must read "Counterfactual staff path" / equivalent and never "Historical default." The taxonomy/presidential-acceptance diagnostics already enforce that staff-recommendation rows can't become historical bot defaults.

---

## 6. Step-by-Step Plan (discrete phases)

### Phase R — Ratification & Semantics Sign-off (docs-only; THIS packet's primary output)
**Owner:** Technical Architect + Canon-Compliance + Game Designer.
**Goal:** Produce the signed semantics packet doc (`docs/40_reports/proposals/20260529_EVENT_ALTERNATE_TIMELINE_SEMANTICS_PACKET.md`) that (a) restates §4 as canon, (b) records a line-by-line audit that the live implementation matches §4 and the Foundational rulings, (c) confirms the player-path `applyResponseRuntimeCausality` call site in `resolve_decision.ts` matches the bot path, (d) lists any divergence as a blocking remediation item.
**Schema/data/code changes:** none.
**Exit:** Canon sign-off + a clean §8 verification run proving byte-identity (see below). Only on exit may Phases D–F author.

### Phase S — Source-Database Lock (docs-only)
**Owner:** Historian + Game Designer + Product Manager.
**Goal:** Confirm/complete the 51 family worksheets and source-tier assignments; mark un-sourceable families `Blocked`.
**Exit:** Every family Phase D–F intends to author has a non-`Blocked` worksheet.

### Phase V — Save-Schema & Validator Verification (engine-only, no new fields)
**Owner:** Systems Programmer + QA.
**Goal:** Prove v32/v33 migration determinism, validator shape-proof + `event_causality_log` sorted-on-read assertion, fixture/round-trip/drift-audit cleanliness. Add a missing assertion only as a focused bug-fix if the audit finds one.
**Exit:** All save-migration gates green; no version bump.

### Phase A-RUNTIME — Behind-flag confirmation (engine-only, default-OFF, byte-identical)
**Owner:** Gameplay Programmer + Determinism.
**Goal:** Because the substrate is already live, this phase does NOT add a new flag for substrate plumbing. Instead it confirms the **dormant-by-default invariant**: with the current catalog, `requires_enabled`/runtime-array rows produce byte-identical baselines vs the historical-default path. If any live row already moves a baseline, that is surfaced, explained, and pinned in the ledger BEFORE authoring continues. (Net: the "flag, default-OFF" intent is realized as "runtime arrays default-empty + `requires_enabled` default-false + every authored use proven byte-identical.")
**Exit:** §8 byte-identity gate green.

### Phase D/E/F — Authoring Ramp (one row per commit, gated by Phase R+S exit)
**Owner:** Game Designer + Historian (per family). Per the runtime packet: Phase C (RS R1→R2) is the first executable loop; D = HRHB alliance (H1→H9/H2/H5/H6); E = RBiH identity/reintegration (B1→B12/B7/B8); F = peace-plan/late-war composites (X2–X9). B5/B6/H11 are **188w-required** proofs.

---

## 7. Determinism & Canon

- **Determinism (sacred):** all branch writes go through the single-writer + sort-on-write helpers; no nondeterministic inputs. Phase A-RUNTIME's byte-identity gate is the proof.
- **Canon hierarchy:** Engine Invariants > Phase Specs > Systems Manual. The semantics packet must not contradict Engine Invariants §6 (sensitive-history). Sensitive-history events stay §6-gated; `validateRing3EnablingRejection` is the load-time enforcement, and no counterfactual may open an atrocity event lacking an emergent (non-author-selected) predicate.
- **Calendar-railroad ban:** branches open/close only via player choice + flags + live predicates, never `turn_min` alone. Authors must not foreclose a chain by date.
- **No `avoided_osids_by_faction`, no initial-OSID override** (CLAUDE.md sacred) — out of any branch consequence.

---

## 8. Test / Verification Gates

Run at every phase (docs phases run only the first block):
```powershell
npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json
npx.cmd tsx tools\diagnostics\event_acceptance_report.ts --json
npx.cmd tsx tools\diagnostics\event_presidential_acceptance.ts --json
npm.cmd run typecheck
git diff --check
```
Phase V / A-RUNTIME / D-F additionally:
```powershell
npx.cmd vitest run tests\event_loader.test.ts tests\events_evaluate.test.ts tests\event_decisions.test.ts `
  tests\event_effects.test.ts tests\event_timeline_integrity.test.ts tests\player_decision_manifest.test.ts `
  tests\sim\events\event_taxonomy_report.test.ts tests\sim\events\event_acceptance_report.test.ts `
  tests\sim\events\event_presidential_acceptance.test.ts tests\state\event_state_shape_validation.test.ts `
  tests\save_migration.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_drift_audit.test.ts `
  tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts `
  tests\ui\event_decision_modal_phase3.test.ts tests\ui\event_decision_modal_catalog.test.ts --reporter=dot
npx.cmd vitest run tests\determinism_static_scan_r1_5.test.ts --reporter=dot
node tools\diagnostics\save_migration_drift_audit.cjs
npm.cmd run desktop:map:build
npm.cmd run test:baselines
```
**Byte-identity gate (the load-bearing one):** `npm run test:baselines` and a 40w scenario hash must be byte-identical to the current recorded baseline with the catalog as-is. If a `requires_enabled:true` / runtime-array row already moves a baseline, STOP: it means the substrate is not actually dormant; reconcile and explain before authoring. `--update` is forbidden without written approval + a documented drift cause tied to ordering / runtime causality / migration default.

**Per-family acceptance (Phases C–F):** each commit ships a focused test pinning the exact `(from_event, to_event, kind)` causality triples produced when that family's historical-default driver fires, plus the predicted OSID/state delta set on the firing turn (deterministic equality, no tolerance).

---

## 9. Risks, Rollback, Dependencies, Owner, DoD

### Risks
- **Substrate already moved baselines undetected.** Highest risk: 42 live `requires_enabled:true` rows + 57 runtime arrays may already perturb output. Mitigation: Phase A-RUNTIME byte-identity gate runs BEFORE any new authoring; any drift is a STOP.
- **Calendar railroading** disguised as a branch. Mitigation: §7 ban + author review.
- **Hidden model-reasoning text** leaking into player-facing prose. Mitigation: modal copy review; counterfactual labels enforced by diagnostics.
- **Hash drift** during D–F. Mitigation: per-family acceptance triples + reproducible-twice rule.
- **DEAD-channel authoring** (DimensionId vs EffectKind). Mitigation: existing loader vocab guards (`event_loader.ts:939`, `:1003`) — already a load-time failure.
- **Doc/code divergence** between this restatement and the prior runtime packet. Mitigation: Phase R audit resolves to code-truth and amends this doc.

### Rollback
- Docs phases: revert the doc.
- Phase D–F authoring: each row is one commit; `git revert` the row restores byte-identity (substrate stays dormant). No migration rollback needed (no new versions).

### Dependencies / sequencing
- Depends on: `20260527_EVENT_FOUNDATIONAL_DECISIONS_PACKET.md` (rulings), `20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` (implemented semantics), Phase B substrate (shipped).
- Strict order: **R + S + V + A-RUNTIME must all exit green before D.** D → E → F per family; B5/B6/H11 are 188w-gated.

### Owner
Event-system product/engine lane. Technical Architect + Canon-Compliance own Phase R; Historian + Game Designer own Phase S and authoring; Systems/QA own Phase V + A-RUNTIME.

### Definition of Done
1. Signed semantics packet doc exists, restates §4 as canon, and records a clean ratification audit (or a remediation list).
2. Player-path / bot-path runtime-causality parity confirmed at the call sites.
3. Byte-identity gate green: current catalog with live `requires_enabled`/runtime rows reproduces the recorded baseline exactly.
4. Save-schema verification green at v32/v33, including `event_causality_log` sorted-on-read assertion.
5. 51-family source database locked (worksheets present or `Blocked`), source tiers assigned.
6. Authoring ramp (D–F) is explicitly unblocked, one-row-per-commit, with the per-family acceptance-triple contract defined.
