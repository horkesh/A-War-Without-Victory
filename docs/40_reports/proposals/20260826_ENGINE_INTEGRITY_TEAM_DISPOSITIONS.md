# RE Engine Integrity — Full Pyrrhic Team Dispositions

**Date:** 2026-08-26
**Status:** planning evidence; not execution authority
**Source-review HEAD:** `c98a704f691710002af94b606d12fcaf01e642e4`
**Executable authority:** `docs/plans/2026-08-26-engine-integrity-plan.md`

This records the full-roster source review used to replace the RE discovery diary. Specialists read the relevant code and repo authority; they did not edit files. Where seats disagreed, the executable plan either records the reconciled algorithm or creates an explicit decision gate.

| Seats consulted | Disposition carried into the plan |
|---|---|
| Orchestrator, Technical Architect, Architect, Product Manager | Replace the stale diary with one HEAD-bound executable rail; prioritize ownership/accounting; hold speculative mechanics; impose a net-non-positive complexity budget. |
| Systems Programmer, Gameplay Programmer, Formation Expert, Performance Engineer | Delete duplicate casualty accounting; separate raw pool loss from realism-scaled K/W/M; use existing graph/state owners; profile rather than assume; do not reuse broad `disrupted_turns` for narrow latency. |
| Game Designer, Historian, Canon Compliance Reviewer | Quiet fronts and dissolution are not defects by outcome alone; APWB and presidential-enclave questions require explicit canon rulings; no blanket enclave rule or invented replacement mechanic. |
| General Code Review, QA Engineer, Determinism Auditor, Scenario Harness Engineer, Scenario Creator/Runner/Tester, Integration perspective | Require red/positive/adversarial tests, liveness, clean Node-22 provenance, byte-identical distinct-output candidates, one behavioral packet per long-run pair, and independent review. |
| UI/UX Developer, Graphics Programmer, Lua Scripting, Asset Integration, Map Geometry Reviewer, Modern Wargame Expert | Reuse Decision Room/receipt surfaces; expose no hidden IDs or fog-sensitive data; add no panel, render layer, Lua API, map data, geometry, or asset system. Graphics/Lua/assets are NO IMPACT unless scope changes. |
| Platform Specialist, Build Engineer, DevOps | Align authoritative evidence with CI Node 22; repair desktop changed-path truth and extend the existing packaged probe; add no launcher/service; verify heavy PR jobs actually run. |
| Operations Expert, Corps/Army Commander Expert, War-or-Game, Narrative Designer, Authority Auditor | Converge onto exact-ID authority and refuse before debit; remove stale IPC/name fallbacks; fix threat ownership and queue starvation generically; do not force artificial activity; reuse existing player-safe language. |
| Documentation Specialist, Ledger Scribe, Reports Custodian, Process QA, Retrospective Analyst | Freeze the diary as proposal evidence; preserve one canonical plan path; use checkbox/simplify/assignment gates; update ledger per slice and roadmaps atomically; keep reusable knowledge separate from run narrative. |
| Code Simplifier, Refactor Pass | Zero new pipeline steps/flags/default streams; target zero persisted fields; delete dead IPC and duplicate scans; reject default-on operation telemetry; require net production deletion and no compatibility residue. |

## Reconciled source findings

- The old RE file was not executable: it mixed hypotheses, corrections, and completed discovery under a stale “not started” status.
- Baseline n374 has contradictory provenance and cannot anchor RE; a fresh exact-parent S0 is mandatory.
- Existing operation diagnostics dominate the weekly artifact; no new default stream or creation emitter is justified.
- Legacy force-launch/decision paths use stale authority state and can violate debit/refusal ordering; canonical exact-ID routes already exist.
- Casualty resolution already owns formation shares, while a later pipeline step re-derives losses with divergent constants. Consolidation must preserve distinct raw pool loss and realism-scaled reported K/W/M.
- Threat inheritance must handle both splits and merges deterministically and attribute each globally vanished OSID once.
- Named pre-planned follow-on queues are duplication; terminal invalid heads must not starve valid followers.
- Emergency retreat has a generic graph-routing defect; same-turn dissolution is not proven wrong.
- APWB/friendly overrides and presidential enclave targeting have contradictory or incomplete authority and therefore remain decision gates.
- Reserve decay, rebuild latency, garrison fallback, predictor retuning, dissolution floors, and outcome-specific immunity remain evidence-only unless separately approved.

## Source anchors at reviewed HEAD

- Plan/process authority: `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`, `docs/plans/PLAN_EXECUTION_STANDARD.md`, and the frozen discovery record.
- Baseline provenance: `docs/40_reports/CALIBRATION_MASTER.md` and `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n374/run_meta.json`.
- Desktop authority: `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`, `src/desktop/autonomy_ipc_contract.cjs`, `src/sim/combat/order_interpretation.ts`, and `src/ui/map/components/army_hq/DirectiveCard.tsx`.
- Casualty ownership: `src/sim/combat/attack_casualty_distribution.ts`, `src/sim/combat/battle_resolution.ts`, `src/state/casualty_ledger.ts`, and `src/sim/turn_phases/war_phases.ts`.
- Threat and queue behavior: `src/sim/combat/commander/assess.ts`, `src/sim/combat/commander/zone_detection.ts`, `src/sim/combat/commander/decide.ts`, and `src/sim/combat/pre_planned_operations.ts`.
- Routing and locality: `src/sim/combat/attack_retreat_displacement.ts`, `src/sim/combat/osid_adjacency.ts`, `src/sim/combat/brigade_dissolution.ts`, and `src/sim/negotiation/patron_pressure.ts`.
- APWB/enclave authority: `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md`, `docs/40_reports/audits/20260521_APWB_CUT_SUBSTRATE_CONSUMER_PRECLEAR.md`, `src/sim/combat/operation_opportunities.ts`, and `src/sim/combat/sector_offensive.ts`.
- Runtime/CI: `.github/workflows/desktop-release-guard.yml`, `tools/desktop_packaged_runtime_probe.mjs`, `tools/engine_health_gate.cjs`, `tools/op_schedule_diff.cjs`, `tools/validate_run_consistency.cjs`, and `tools/verify_checkpoints.cjs`.

## No-impact trigger

Graphics, Lua, assets, and map-data seats remain NO IMPACT only while RE reuses existing UI and adjacency data. Any new surface, binding, asset, geometry, or data derivation reopens their review and stops the active packet.
