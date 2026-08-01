# Command, Event, and Dynamic Codex Convergence Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one phase at a time.

**Goal:** Close the remaining presidential-command, Free War texture, event-system, and Dynamic Codex residuals as one finite player-truth lane.

**Architecture:** Keep the existing five presidential levers and the Decision Room as the only act surface. Build one deterministic cadence/priority read model over existing decision families, add only source-backed optional initiatives, and project the same receipts into the Inbox, Decision Room, Chronicle, Cost Ledger, and Dynamic Codex. Quiet intervals become explicit positive-hold briefings rather than invented decisions.

**Tech stack:** TypeScript, React, Vitest, JSON-authored events/essays, Electron browser gates, deterministic scenario runner.

**Date:** 2026-07-31
**Status:** IN PROGRESS -- Phases 0-1 complete on integrated R2; Phase 2 is next
**Roadmap workstream:** R4
**Canonical owner:** Presidential Decision Room for action; Desk for triage; Records/Codex for receipts
**Collision rule:** Do not overlap source edits with RS packets FR-01 or FR-04. Rebase on their shared priority and cadence contracts before Phase 0.
**Activation:** Begin only after the owner says `Execute the master roadmap` or explicitly names this plan.

---

## 1. Resolved decisions

These are implementation inputs, not questions:

1. The five shipped presidential levers are the complete 1.0 lever set. Do not add a sixth lever.
2. The president commands through generals. Brigade/axis micromanagement remains outside this lane.
3. The Decision Room owns actions. Army HQ and the tactical map provide evidence and return paths.
4. A meaningful presidential beat should appear every 8-10 weeks when a sourced review exists. No source means an explicit positive-hold briefing, not a fictional choice.
5. Near-cap Command Authority may expose at most one optional source-backed initiative. Authority level is an eligibility signal, never historical evidence.
6. Dynamic Codex prose is unlocked by state/receipt truth. Calendar time alone may provide context but cannot claim an outcome.
7. The event mechanism is treated as complete until Phase 0 proves a live unreachable writer/reader. Prefer content/read-model repair over a new subsystem.

## 2. Purpose and non-goals

### In scope

- one priority/cadence inventory across every player-decision family;
- removal of duplicate or unreachable action ownership;
- source-backed optional presidential initiatives and explicit positive-hold rows;
- event notification/decision reachability and response ownership;
- Dynamic Codex consequence and ghost-entry receipt coverage;
- all-faction 104-turn cadence evidence and a 188-turn endgame projection check.

### Non-goals

- no new military command level, combat pathway, or operational planner;
- no atrocity decision, optimization surface, or calendar-only rupture;
- no broad event rewrite or content-volume target for its own sake;
- no save-schema field unless existing receipts/cooldowns cannot represent the contract;
- no package, version, tag, public release, or `FORAWWV.md` edit.

## 3. External-agent execution contract

### Session start

```powershell
git status --short --branch
Get-Content -Raw .claude/napkin.md
Get-Content -Raw docs/life_lessons.md
Get-Content -Raw docs/plans/MASTER_ROADMAP.md
Get-Content -Raw docs/plans/2026-07-31-rs-104week-friction-remediation-plan.md
Get-Content -Raw docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md
rg -n "PLAYER_DECISION_FAMILIES|pending_event|buildDynamicSections|command_authority" src tests data/scenarios
```

Inspect before editing:

- `src/state/player_decision_manifest.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/ui/map/data/inboxItems.ts`
- `src/sim/events/evaluate_events.ts`
- `src/sim/events/emit_notifications.ts`
- `src/sim/codex/dynamic_section_builder.ts`
- `src/sim/endgame/cost_ledger.ts`
- `data/scenarios/events/`
- `data/scenarios/essays/`

### Task boundary

- Work one phase per logical commit.
- Write the failing contract test or diagnostic before runtime changes.
- Run `/simplify`, fix its findings, then run phase verification.
- Existing player decision receipts are the first reuse option.
- If a persisted cooldown is genuinely necessary, add migration/default/validator/round-trip proof in the same phase.
- Unsupported historical copy is omitted or labeled unknown; it is never inferred into a decision.

## 4. Phase sequence

## Phase 0 -- Current-state and cadence characterization

**Assigned role:** Product Manager + QA Engineer
**Independent review:** Technical Architect
**Output:** deterministic reports only; no behavior change

### Task 0.1 -- Inventory every decision family

**Files:**

- Create `tools/diagnostics/presidential_command_convergence.ts`
- Create `tests/presidential_command_convergence_diagnostic.test.ts`

- [x] Emit stable rows containing family id, producer, blocker predicate, action surface, receipt/history owner, and Codex/Chronicle consumers.
- [x] Fail on a producer with no reachable action surface.
- [x] Fail on two action surfaces for one family.
- [x] Fail on a player-visible decision with no durable receipt.
- [x] Sort by stable family id with `strictCompare`; exclude timestamps and absolute paths.

### Task 0.2 -- Measure all-faction decision cadence

**Files:**

- Create `tools/diagnostics/presidential_cadence_report.ts`
- Create `tests/presidential_cadence_report.test.ts`
- Reuse/extend `tests/rs_104week_decision_cadence.test.ts` when FR-04 creates it

- [x] Classify required decisions, optional sourced initiatives, ordinary emergent proposals, notices, and positive-hold weeks.
- [x] Run RBiH, RS, and HRHB through 104 turns with identical documented scenario inputs. (Consumed the integrated R2 paired `apr1992_definitive_104w` replay; no redundant rerun.)
- [x] Record consequential-gap lengths and near-cap Authority weeks. (Headless Authority coverage is explicitly `unreported`; separate owner-diary exact-cap counts are retained without cross-run inference.)
- [x] Prove the report is byte-identical under input permutation and repeated execution.

### Phase 0 execution evidence -- 2026-08-01

- Machine-readable inventory: `docs/40_reports/audits/20260801_R4_PHASE0_PRESIDENTIAL_COMMAND_CONVERGENCE.json`, SHA-256 `2daf74e82bb483202f48980610385ab65a54ee1ca13d635d238ec6eb170e6859` on two consecutive runs. All `9` family proofs resolve producer/action/receipt and discovered Chronicle/Records/receipt/Codex/Cost-Ledger source anchors; operation Records and Cost Ledger anchor the exact durable resolution read and have an injected-resolution behavior proof.
- Characterization report: `docs/40_reports/audits/20260801_R4_PHASE0_COMMAND_EVENT_CODEX_CHARACTERIZATION.md`.
- Exact ownership result: `9` families, `9` reachable, `8` durable receipts, `1` conditional receipt, `0` duplicate surfaces, `1` fail-closed finding (`autonomy_proposal` durable-history gap).
- Integrated paired cadence result: final-save SHA-256 `d83d10c983da384dd7f0e5f957da69e346f9d50df788e4fac8a90923b8260ccc`; byte-identical cadence SHA-256 `647ee513bca77f800de5db469801419258e5ec5acabe09c1013ae57ac6d4018f`; all `11` long gaps are exact positive holds with `0` unresolved and `0` invalid holds.
- Provenance-hardening evidence: schema-versioned hold/Authority bundles bind source id, scenario, run, player, range, end-turn save, save SHA-256, evidence byte hashes, and optional anchors. Authority observations additionally require exact parsed faction/turn/current/cap rows in their attested JSON bytes. The tracked RS owner-save schema-3 report at `docs/40_reports/audits/20260801_R4_PHASE0_RS_CADENCE_SCHEMA3.json` repeated at SHA-256 `f9726f571a48d011deb55635834235022ec9d0d79b608b6a2e3fb07f6864fcb6`; an executable CLI regression proves a forged turn-0 save advertised as end turn 1 exits nonzero and writes no output.
- Cadence projection now includes player-owned `negotiation.dayton_result` and durable, non-expired `military.operation_opportunity_resolutions`; transient `OPPORTUNITY:` proposal carriers do not double-count them.
- Verification: corrected focused suite passed `6` files / `42` tests; full TypeScript passed.
- Scope: deterministic diagnostics, tests, and documentation only. No Phase 1 behavior, historical content, canon, scenario, save schema, package, version, tag, push, publication, or release state changed.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/presidential_command_convergence_diagnostic.test.ts tests/presidential_cadence_report.test.ts tests/player_decision_manifest.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
```

`/simplify` -> review -> commit `test(command): characterize presidential convergence`

## Phase 1 -- One priority and action contract

**Assigned role:** UI/UX Developer
**Independent review:** Technical Architect + Wargame Advisor

### Task 1.1 -- Pin the shared priority model

**Files:**

- Modify the FR-01 shared priority module
- Modify `src/state/player_decision_manifest.ts`
- Modify `src/ui/map/data/presidentialDecisionRoom.ts`
- Modify `src/ui/map/data/inboxItems.ts`
- Test `tests/ui/presidential_decision_room.test.ts`
- Test `tests/ui/presidential_blockers.test.ts`

- [x] Make blocker, urgency, source, deadline, and recommended destination a single read-model contract.
- [x] Prove Desk, Inbox, toolbar, and Decision Room order the same active rows.
- [x] Preserve player-faction visibility and fog restrictions.
- [x] Remove only duplicate renderer ownership; do not delete durable receipts.

### Task 1.2 -- Close action/receipt loops

**Files:**

- Modify `src/ui/map/data/decisionConsequenceLedger.ts`
- Modify `src/ui/map/data/consequenceReceipts.ts`
- Modify `src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx`
- Test `tests/ui/decision_consequence_trail.test.ts`
- Test `tests/ui/decision_consequence_records_panel.test.ts`

- [x] Every action deep-links back to its source and forward to its receipt.
- [x] Current dossiers remain selected after evidence-map round trips.
- [x] No raw enum/debug copy reaches the player.

**Phase 1 evidence (2026-08-01):**

- `PresidentialPriorityReadModel` is the shared blocker/band, urgency, source id, deadline, and recommended-destination contract. Inbox, Decision Room, Desk pre-advance review, and the Warroom toolbar consume its deterministic ordering; exact-expiry regressions prove the same opportunity order across all four surfaces.
- The nine-family manifest now owns the recommended workspace and durable receipt path beside the existing source state path. No duplicate renderer was found by the executable ownership inventory, so no renderer or durable receipt was deleted.
- Player-faction regressions exclude foreign opportunity dossiers. Existing player-safe projections and evidence-map return-card ownership remain intact; the selected dossier id is restored on return.
- Ordinary resolved autonomy proposals now archive idempotently in optional `meta.proposal_decision_history`. Shared `proposal id :: resolved turn` identity owns writer deduplication, validation, and Records ledger ids; invalid domains, malformed optional fields, and duplicates fail closed. An exported desktop `advanceTurn` -> save/load -> Electron projection regression proves that only the player faction's durable receipt reaches the renderer.
- Authored event consequence source/receipt ids include event, response, and decision turn, and confirmation requires the causality entry turn to equal that decision turn. A same-event, same-response recurrence regression with only one matching turn-scoped edge proves distinct receipts, expansion state, and exact backlinks. Structured localized proposal fields prevent English description, raw stance, action, formation-id, or debug-token leakage in BCS.
- Machine report: `docs/40_reports/audits/20260801_R4_PHASE1_PRESIDENTIAL_COMMAND_CONVERGENCE.json`, 14,488 bytes, SHA-256 `43c0df567cbfb4592450cdfe6864967c239e8b6f63080efe463351ae29c31506`. Exact result: `9` families, `9` reachable actions, `9` durable receipts, `0` conditional receipts, `0` unresolved findings, and `9` verified source-proof rows.
- This is additive save state only: older saves omit the optional receipt history and continue with an empty history. No scenario, historical event, canon, deterministic baseline, package/version, tag, installer, publication, or release state changed; `docs/10_canon/FORAWWV.md` is unchanged.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/ui/presidential_decision_room.test.ts tests/ui/presidential_blockers.test.ts tests/ui/decision_consequence_trail.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui_presidential_decision_room_wiring.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run qa:player-journeys
```

Committee-corrected verification: `18` focused files / `297` tests and `44` player-journey files / `770` tests passed, followed by TypeScript, canon/determinism/baseline, and diff gates.

`/simplify` -> review -> commit `refactor(command): converge priority and receipt ownership`

## Phase 2 -- Source-backed cadence and positive holds

**Assigned role:** Gameplay Programmer + Historian
**Independent review:** Game Designer + Canon Compliance Reviewer

### Task 2.1 -- Implement the FR-04 initiative catalog

**Files:**

- Create `src/sim/presidency/presidential_initiatives.ts`
- Create `data/scenarios/presidential_initiatives/apr1992.json`
- Modify `src/sim/turn_phases/war_phases.ts`
- Modify `src/ui/map/data/inboxItems.ts`
- Create `tests/presidential_initiatives.test.ts`

- [ ] Require stable id, faction, turn window, state predicate, source citation, existing lever, Authority cost, cooldown, and once rule.
- [ ] Cap pending optional initiatives at one.
- [ ] Never make an initiative an Advance blocker.
- [ ] Never create a historical default without an explicit source row.
- [ ] If a measured gap lacks a source-backed action, emit a nonblocking positive-hold briefing referencing the live posture and continue.

### Task 2.2 -- Prove cadence without forced decisions

- [ ] Rerun the three 104-turn cadence reports.
- [ ] Require a meaningful sourced review every 8-10 weeks where the catalog supports one.
- [ ] Require every unsupported interval to contain an explicit positive-hold row.
- [ ] Record actual decision gaps separately from briefing gaps.
- [ ] Reject generic `spend Authority` content.

**Historical evidence protocol:** Use the local Balkan Battlegrounds KB first (`BB1`/`BB2` volume and page), then official UN/IRMCT primary sources. If evidence is absent or contradictory, the deterministic outcome is `positive_hold`, not an implementation pause.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/presidential_initiatives.test.ts tests/rs_104week_decision_cadence.test.ts tests/event_timing.test.ts tests/event_timeline_integrity.test.ts --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run typecheck
```

`/simplify` -> historian/canon review -> commit `feat(command): add sourced presidential cadence`

## Phase 3 -- Event reachability and two-level surfacing closeout

**Assigned role:** Gameplay Programmer
**Independent review:** QA Engineer + Determinism Auditor

### Task 3.1 -- Turn the Phase 0 inventory into invariants

**Files:**

- Modify `src/sim/events/evaluate_events.ts`
- Modify `src/sim/events/emit_notifications.ts`
- Modify `src/sim/events/ai_default_response.ts`
- Modify `tests/sim/events/event_presidential_acceptance.test.ts`
- Modify `tests/sim/events/event_notification_residuals_diagnostic.test.ts`

- [ ] Repair only inventory-proven unreachable writers/readers.
- [ ] Keep informational notifications nonblocking.
- [ ] Give AI respondents deterministic authored defaults only where data supplies them.
- [ ] Preserve stable event ordering and idempotent once/cooldown semantics.

### Task 3.2 -- Close authored coverage gaps

**Files:**

- Modify the specific files under `data/scenarios/events/` identified by the report
- Modify `tests/sim/events/event_notification_content_backfill.test.ts`

- [ ] Add recipient-specific notification text where the event already exists.
- [ ] Do not invent a new event solely to improve a percentage.
- [ ] Keep every `requires_player_response` event owned by exactly one respondent.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/event_decisions.test.ts tests/events_evaluate.test.ts tests/sim/events/event_presidential_acceptance.test.ts tests/sim/events/event_notification_residuals_diagnostic.test.ts tests/sim/events/event_notification_content_backfill.test.ts --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run typecheck
```

`/simplify` -> review -> commit `fix(events): close presidential reachability residuals`

## Phase 4 -- Dynamic Codex and consequence convergence

**Assigned role:** Gameplay Programmer + Documentation Specialist
**Independent review:** Historian + Canon Compliance Reviewer

### Task 4.1 -- Pin state/receipt ownership

**Files:**

- Modify `src/sim/codex/dynamic_section_builder.ts`
- Modify `src/sim/endgame/cost_ledger.ts`
- Modify `src/ui/map/data/consequenceReceipts.ts`
- Modify `tests/dynamic_codex_slice_v1.test.ts`
- Modify `tests/ui/codex_panel_dynamic_mount.test.ts`

- [ ] Every dynamic claim names its state/receipt predicate.
- [ ] Ghost entries require a documented missed-condition predicate.
- [ ] Calendar-only context cannot claim territorial, casualty, atrocity, or negotiation outcomes.
- [ ] One receipt renders consistently across Codex, Chronicle, Records, and Cost Ledger.

### Task 4.2 -- Close content residuals found by the inventory

**Files:**

- Modify only identified JSON files under `data/scenarios/essays/`
- Modify `tests/codex_sensitive_claim_inventory.test.ts`
- Modify `tests/consequence_substrate_inventory_diagnostic.test.ts`

- [ ] Remove stale rupture tags from non-rupture essays.
- [ ] Add missing source notes without copying source prose.
- [ ] Preserve the Section 6 rule that atrocity is consequence, never lever.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/dynamic_codex_slice_v1.test.ts tests/ui/codex_panel_dynamic_mount.test.ts tests/codex_sensitive_claim_inventory.test.ts tests/consequence_substrate_inventory_diagnostic.test.ts tests/consequence_consumers.test.ts --pool=forks --reporter=dot
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run typecheck
```

`/simplify` -> historian/canon review -> commit `fix(codex): converge dynamic consequence truth`

## Phase 5 -- Integrated proof and closeout

**Assigned role:** QA Engineer
**Independent review:** Process QA

- [ ] Run all-faction 104-turn cadence proof twice and compare deterministic outputs.
- [ ] Run fresh 40w and paired 188w baseline/engine-health proof.
- [ ] Run player journeys, first-hour browser, live-surface browser, and Electron runtime contracts.
- [ ] Inspect Decision Room, evidence map, Records, Chronicle, Codex, and endgame at 1920x1080 and 3440x1440.
- [ ] File `docs/40_reports/implemented/20260731_COMMAND_EVENT_CODEX_CONVERGENCE.md`.
- [ ] Update `docs/plans/MASTER_ROADMAP.md`, this execution log, `docs/PROJECT_LEDGER.md`, and reusable ledger knowledge if a durable pattern changed.

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run qa:player-journeys
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
npm.cmd run qa:electron-runtime-contracts
npm.cmd run desktop:release:check
git diff --check
```

## 5. Determinism and schema rules

- No `Math.random`, `Date.now`, locale-dependent ordering, wall-clock timestamps, or environment-dependent content.
- Stable IDs and `strictCompare` ordering for initiatives, decisions, receipts, diagnostics, and generated reports.
- New persisted fields require migration, materialized default, validator rejection, old-save fixture, and round-trip tests.
- No baseline refresh hides unexplained drift. Behavior-owned drift is reviewed from a fresh before/after run before the documented re-floor path.

## 6. Success criteria

- [ ] One action owner and one receipt owner per decision family.
- [ ] No duplicate Desk/Inbox/Decision Room priority disagreement.
- [ ] No unsupported historical choice added to fill a drought.
- [ ] Sourced review cadence meets the 8-10-week target where evidence exists; all other long intervals render positive-hold truth.
- [ ] Every dynamic Codex claim is state/receipt backed.
- [ ] RBiH, RS, and HRHB 104-turn proofs and repeated 188-turn proof are deterministic and green.

## 7. Copy-ready execution prompt

```text
Role and objective: Implement roadmap R4 using docs/plans/2026-07-31-command-event-codex-convergence-plan.md, one phase at a time. Start at the first unchecked phase.

Read first: .claude/napkin.md, docs/life_lessons.md, docs/plans/MASTER_ROADMAP.md, docs/plans/2026-07-31-rs-104week-friction-remediation-plan.md, docs/10_canon/CANON.md, docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md, and the target files listed in the phase.

Locked decisions: five presidential levers only; Decision Room owns action; no operational micromanagement; use source-backed optional initiatives; unsupported gaps become positive-hold briefings; Dynamic Codex claims require state/receipt truth.

Constraints: deterministic ordering, TDD, one phase per logical commit, /simplify before verification, no FORAWWV/package/version/tag/release change. Do not overlap FR-01/FR-04 source work.

Handoff: report files changed, tests with exact results, cadence gaps by faction, scenario hashes/drift, source citations, docs/ledger updates, and the next unchecked phase.
```

## 8. Orchestrator completion block

**Canonical owner:** Presidential Decision Room and `player_decision_manifest.ts`.
**Demoted path:** duplicate renderer queues, invented cadence events, brigade/axis presidential control.
**Player-visible truth:** one prioritized dossier, one evidence path, one action, one durable consequence trail.
**Canonical UI surface:** Desk -> Decision Room -> Records/Codex, with map/Army HQ as evidence.
**Done means:** all decision families converge, sourced cadence is bounded, positive holds replace fiction, and all-faction deterministic proof is green.
