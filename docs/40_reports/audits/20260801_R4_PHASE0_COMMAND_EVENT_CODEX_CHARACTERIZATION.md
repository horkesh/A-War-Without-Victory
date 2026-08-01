# R4 Phase 0 Command, Event, and Codex Characterization

**Date:** 2026-08-01
**Scope:** R4 Phase 0 current-state ownership and all-faction presidential cadence
**Status:** COMPLETE as characterization; one fail-closed receipt defect and the planned convergence work remain open
**Base:** integrated R2 baseline `e32d52177`

## Outcome

The current player-decision manifest contains exactly nine families. All nine have one registered producer contract, one reachable resolver surface, and a complete source-anchor proof for their producer, action route, receipt behavior, and every discovered downstream read model. Eight have a durable receipt owner. Resolved ordinary `autonomy_proposal` reviews are the single exception: they survive only through the current turn and are then removed, so the diagnostic exits nonzero with one `missing_durable_receipt` finding.

No family is unowned or unreachable and no family has two registered resolver surfaces. That is an ownership result, not a claim that the presentation is already converged. The current resolver distribution is five Desk modals, two Army HQ modals, and two Decision Room dossiers. Later R4 work still has to make the Desk triage-only, make the Decision Room the canonical presidential action surface, and retain Army HQ as evidence/support rather than a competing presidential queue.

The machine-readable inventory is `docs/40_reports/audits/20260801_R4_PHASE0_PRESIDENTIAL_COMMAND_CONVERGENCE.json` (14,083 bytes; SHA-256 `2daf74e82bb483202f48980610385ab65a54ee1ca13d635d238ec6eb170e6859`). Two consecutive executions produced the same hash. Both exited `1` after writing the report because the ordinary-proposal receipt defect is intentionally fail-closed.

## Decision-family inventory

| Family | Producer/state owner | Blocker predicate | Current resolver | Receipt/history owner | Verified read-model consumers |
| --- | --- | --- | --- | --- | --- |
| `autonomy_proposal` | `proposal_generation.ts` -> `meta.pending_proposal_reviews` | Advisory unresolved player review | Decision Room proposal dossier | Conditional current-turn proposal row | None / none |
| `convoy_decision` | `supply_reserves.ts` -> `military.pending_convoy_decisions` | Decision undefined | Desk convoy modal | `military.convoy_decision_history` | Chronicle |
| `dayton_negotiation` | `war_phase_negotiation_steps.ts` -> `military.negotiation.pending_dayton` | Pending Dayton present | Desk Dayton modal | `military.negotiation.dayton_result` | Chronicle |
| `event_decision` | `evaluate_events.ts` -> `military.pending_event_decisions` | Player response required | Desk event modal | `military.event_decision_log` | Chronicle, decision/consequence receipts, dynamic Codex |
| `officer_event` | `officer_system.ts` -> `military.pending_officer_events` | Advisory unacknowledged event | Army HQ officer modal | `military.officer_decision_history` | Records |
| `operation_opportunity` | `operation_opportunities.ts` -> opportunity + proposal state | Advisory eligible review | Decision Room operation dossier | `military.operation_opportunity_resolutions` | Records, Cost Ledger |
| `paramilitary_request` | `paramilitary_sweep.ts` -> `pending_paramilitary_requests` | No allow/deny/regular disposition | Desk paramilitary modal | `paramilitary_decision_history` | Records |
| `peace_plan` | `peace_plans.ts` -> `military.negotiation.pending_peace_plan` | Pending plan present | Desk peace-plan modal | `military.negotiation.peace_plan_history` | Chronicle |
| `reserve_request` | `army_reserve_system.ts` -> `military.pending_reserve_requests` | Advisory; never blocks Advance | Army HQ reserve modal | `military.reserve_request_history` | Records |

### Exact inventory counts

- Manifest families: `9`
- Families with one reachable resolver: `9`
- Families with a durable receipt: `8`
- Families with conditional-only receipt retention: `1`
- Missing producer ownership: `0`
- Unreachable action surfaces: `0`
- Duplicate action surfaces: `0`
- Unresolved fail-closed findings: `1`
- Source-verified family proofs: `9`
- Current Chronicle consumers: `4` families
- Current Records consumers: `4` families
- Current decision/consequence receipt consumers: `1` family
- Current dynamic Codex consumers: `1` family
- Current Cost Ledger consumers: `1` family

## Cadence baseline

Phase 0 consumes the integrated R2 paired replay instead of replacing it. Both sequential `apr1992_definitive_104w` headless runs used the same scenario inputs and reached turn 104. Their substantive artifacts were byte-identical: final-save SHA-256 `d83d10c983da384dd7f0e5f957da69e346f9d50df788e4fac8a90923b8260ccc` and schema-1 cadence-report SHA-256 `647ee513bca77f800de5db469801419258e5ec5acabe09c1013ae57ac6d4018f`. The source audit and exact hold fixture remain at `docs/40_reports/audits/20260801_RS_104W_PRESIDENTIAL_CADENCE_AUDIT.md` and `tests/fixtures/diagnostics/all_faction_104week_headless_positive_holds.json`.

| Faction | Required authored | Optional sourced | Ordinary emergent | Notices | Maximum consequential gap | Positive-hold intervals |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| RBiH | 17 | 0 | 8 | 0 | 18 | `20-38`, `40-54`, `54-70`, `82-97` |
| RS | 12 | 0 | 8 | 3 | 23 | `17-40`, `40-56`, `56-70`, `76-89` |
| HRHB | 18 | 0 | 22 | 2 | 15 | `40-51`, `52-65`, `87-102` |

All eleven long headless intervals have exact admitted positive-hold evidence. Unresolved gaps: `0`. Invalid holds: `0`. Optional sourced receipts are `0` in this headless projection because resolved player proposal reviews do not exist on that path; this must not be interpreted as absence from owner play.

The existing RS owner fixture remains a separate player-path baseline: `12` required authored, `16` optional sourced, `11` ordinary emergent, `5` notices, maximum sourced gap `23`, and four exact positive holds (`17-40`, `41-56`, `56-69`, `76-89`). Its different endpoints are not merged with or approximately matched to the headless holds. The new schema-3 replay of that tracked owner save is `docs/40_reports/audits/20260801_R4_PHASE0_RS_CADENCE_SCHEMA3.json` (45,645 bytes; SHA-256 `f9726f571a48d011deb55635834235022ec9d0d79b608b6a2e3fb07f6864fcb6` on two consecutive runs). It binds `final-autosave.json` at turn `104` and SHA-256 `aaebe5bd01d9ac78ffb264b74f3827ba34307c4f5ad312b4e735aa65fdca7062` to scenario, run, player faction, range, and the hashed evidence bundle. The other two faction projections in that player save remain unresolved because this artifact intentionally supplies only the RS owner-run hold bundle; it does not borrow headless holds across provenance contexts.

## Command Authority coverage

`military.command_authority` is player-only and absent from headless/calibration states. Cadence schema 3 therefore records an optional schema-versioned Authority observation bundle, exact save/run/scenario/player/range provenance, hashes for the save and evidence bytes, a documented near-cap threshold (default `0.9`), observed/missing turn lists, and `complete`, `partial`, or `unreported` coverage for each faction. With no Authority observation bundle attached to either retained replay, all three Authority summaries are truthfully `unreported`; no final-save value is expanded into invented weekly history.

Separate owner diaries provide useful but non-comparable exact-cap evidence:

| Owner run | Coverage actually reported | At exact cap | Interpretation at the 90% near-cap threshold |
| --- | --- | ---: | --- |
| RBiH 80-turn diary | 80 observed turns | 80 | At least 80 near-cap weeks |
| RS 104-week diary | 105 observed states | 87 | At least 87 near-cap observations |
| HRHB 80-turn diary | Exact turns-at-cap not exposed | Unreported | Unreported; final state alone is not a cadence series |

These player runs establish a severe Authority-saturation signal but do not substitute for a same-input all-faction player replay. The diagnostic now makes that evidence gap machine-readable instead of silently filling it.

## Bugs versus friction

**Bug:** Ordinary autonomy-proposal decisions have no durable receipt after their current-turn retention window. This breaks the action-to-record contract and is the sole fail-closed finding.

**Friction / planned convergence:** Presidential action is split across five Desk modals, two Army HQ modals, and two Decision Room dossiers. Chronicle consumes four families, Records four, decision/consequence receipts one, dynamic Codex one, and Cost Ledger one. Those are real ownership/presentation gaps, but they are not duplicate writers, unreachable decisions, or evidence that another event subsystem is needed.

**Historical/content disposition:** The cadence audit found no supported additional lever in the eleven long headless intervals. They remain explicit positive holds. Phase 0 adds no initiative, no generic Authority-spend choice, and no fictional gap filler.

## Determinism and verification

- `presidential_command_convergence` sorts family ids and findings with `strictCompare`, emits no timestamp or absolute path, and is byte-identical under family/surface/ownership/source-proof permutation.
- Every producer, action route, receipt behavior, and discovered Chronicle/Records/receipt/Codex/Cost-Ledger consumer is anchored to text loaded from the repository. The operation consumer proof now anchors the exact durable `operation_opportunity_resolutions` read in both `operationOpportunityLedger.ts` and `cost_ledger.ts`; a behavior regression injects one durable resolution and asserts its Records and Cost-Ledger outputs. Removing any tested producer/action/receipt/Cost-Ledger anchor makes the diagnostic fail closed with `source_anchor_missing`.
- Positive-hold and Authority bundles are schema-versioned and must match the actual source id, scenario, run, player faction, turn range, save turn, and save SHA-256. Every cited evidence id must be attested, its repository-relative path must resolve, its byte hash must match, and its optional Markdown anchor must exist. Authority evidence must additionally be schema-1 JSON whose parsed observation exactly matches faction, turn, current, and cap; generic attested prose and separate tampering of turn/current/cap are rejected.
- The executable CLI regression runs a reviewer-style forged startup proof (`turn 0` save with `--end-turn 1`, invented run id, and the retained hold file), asserts exit `1`, asserts no output file, and matches `Source save turn 0 does not equal --end-turn 1.`
- The cadence and Authority summaries deduplicate exact observations, reject conflicting same-faction/same-turn observations, preserve stable numeric turn order, and are byte-identical under input permutation and repeated construction.
- Focused verification: `6` files / `42` tests passed.
- TypeScript: `tsc --noEmit -p tsconfig.json` passed.
- The convergence CLI's nonzero exit is expected evidence of the open receipt bug, not a test failure.

## Phase handoff

Phase 1 may consume this inventory after shared R2 ownership is confirmed clear. It should first give ordinary proposals a durable action receipt, then converge the shared priority/action/read-model contract around Decision Room ownership. No Phase 1 behavior change is included here.
