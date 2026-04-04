# v0.8.0.x - Sector / Frontline Truth - Implementation Plan

**Date:** 2026-04-03  
**Status:** COMPLETE — all 6 phases landed (Waves 1–4, 2026-04-04)  
**Roadmap slot:** v0.8.0.x (immediate engine-health stabilization lane)  
**Overseer:** Orchestrator  
**Architect:** Systems Programmer / Technical Architect - may define canonical frontline-truth boundaries, but any cross-system ownership change must be flagged for user review  
**Primary implementer roles:** Systems Programmer, Gameplay Programmer, Scenario Harness Engineer, QA Engineer  
**Primary reviewer roles:** Determinism Auditor, Authority Auditor, Code Simplifier (`/simplify`), Code Review  
**Prerequisites:** truth-ownership wave landed; sector/frontline reports exist; `MASTER_ROADMAP.md` remains the sequencing authority  
**Authoring basis:** `docs/40_reports/audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md`, `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/implemented/20260402_SECTOR_FRONTLINE_AUTHORITY_HARDENING.md`, `docs/40_reports/implemented/20260403_FRONTLINE_AUTHORITY_AND_PLAYER_SHELL_INTEL_REDUCTION.md`

**Relevant life lessons to respect while executing:**
- unresolved is honest; forced assignment is a lie
- comments can become lies faster than code
- adapters and reports are where products start lying to themselves
- if two systems can both explain the same frontline outcome, one of them is fake

---

## 0. Purpose

The repo has improved sharply, but frontline truth is still not singular enough.

Known problems behind this plan:
- brigades can still end up in sector-assigned states that are not honestly front-adjacent or territory-adjacent
- some runtime mechanics and reports still re-derive frontline truth from fallback or proxy fields
- scenario reporting and diagnostics can still disagree with the canonical sector/frontline picture
- compatibility fields can still masquerade as live truth

This plan exists to make `corps_front_sectors` the only accepted frontline truth when it exists, and to ensure every runtime consumer either reads that truth or is explicitly marked compatibility-only.

---

## 1. Deliverables

- one canonical definition of frontline truth and sector truth
- one audited classification of all remaining frontline consumers/writers:
  - canonical
  - compatibility-only
  - dead
- one fix pass for sector assignment paths that can still manufacture false assignment
- one activity/displacement/reporting alignment pass so reports consume canonical phase outputs
- one regression harness for sector reachability, truthful assignment, and frontline consumer discipline

---

## 2. Scope

### In scope

- `corps_front_sectors`
- brigade assignment / reassignment / override paths
- frontline fatigue / officer quality / supply / displacement / scenario reporting consumers
- sector reachability invariants
- activity summary sourcing
- triggered / pre-planned operation injection validity where it depends on real frontline membership

### Out of scope

- new combat mechanics
- new commander personality features
- visual polish of map sectors
- late-war balance tuning unless directly required to keep canonical frontline truth honest

---

## 3. Canonical Target State

By the end of this lane:

1. `corps_front_sectors` is the canonical frontline truth whenever sector data exists.
2. No runtime writer may force a brigade into a sector it does not honestly belong to just to preserve coverage aesthetics.
3. Compatibility fields such as legacy front assignment are either demoted to fallback-only or removed from live logic.
4. Scenario activity and displacement summaries consume canonical phase outputs instead of reconstructing activity from stale proxies.
5. Sector reachability warnings become actionable diagnostics, not messages emitted after the engine already wrote false state.

---

## 4. Pyrrhic Execution Plan

### Phase 1. Frontline Writer / Consumer Census (~1 session) ✅ COMPLETE (Wave 1, 2026-04-04)
**Assigned to:** Systems Programmer + Documentation Specialist

- [x] inventory every live writer and consumer touching:
  - `corps_front_sectors`
  - `assigned_brigade_ids`
  - `reserve_brigade_ids`
  - `brigade_front_assignment`
  - activity/frontline summary fields
- [x] classify each as canonical, compatibility-only, or dead
- [x] record exact files and exact state fields touched

**Primary target files:**
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/commander_override.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/exhaustion.ts`
- `src/sim/combat/officer_quality_update.ts`
- `src/sim/combat/supply_pressure.ts`
- `src/sim/displacement_pipeline/displacement_triggers.ts`
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_reporting.ts`

**Gate:** one truthful census exists; no “maybe this still matters” ambiguity remains.

→ `/simplify` → commit

### Phase 2. Truthful Sector Assignment (~1-2 sessions) ✅ COMPLETE (Wave 1, 2026-04-04)
**Assigned to:** Systems Programmer + Gameplay Programmer

- [x] isolate the exact late/post-classification path that can still produce dishonest sector assignment
- [x] make unresolved assignment remain unresolved rather than forcing fake sector ownership
- [x] ensure any fallback or repair path respects connected components and sector territory truth
- [x] verify army-HQ reserve brigades remain the only intentional no-sector exception class

**Primary target files:**
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/commander_override.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/sector_assertions.ts`

**Gate:** no false sector assignment is written merely to satisfy coverage heuristics.

→ `/simplify` → commit

### Phase 3. Frontline Consumer Alignment (~1-2 sessions) ✅ COMPLETE (Wave 2, 2026-04-04)
**Assigned to:** Gameplay Programmer + Systems Programmer

- [x] align all frontline mechanics to canonical sector truth
- [x] demote or remove legacy frontline fallback reads where sector data exists
- [x] explicitly annotate any compatibility read that must remain

**Primary target files:**
- `src/sim/combat/exhaustion.ts`
- `src/sim/combat/officer_quality_update.ts`
- `src/sim/combat/supply_pressure.ts`
- `src/sim/combat/local_front_defense.ts`
- `src/scenario/scenario_end_report.ts`

**Gate:** frontline-dependent mechanics do not split between sector truth and legacy fallback truth.

→ `/simplify` → commit

### Phase 4. Activity / Reporting Truth (~1 session) ✅ COMPLETE (Wave 3, 2026-04-04)
**Assigned to:** Scenario Harness Engineer + Systems Programmer

- [x] make `activity_summary` consume canonical phase outputs instead of stale proxies
- [x] align displacement-trigger reporting with the same truth used at runtime
- [x] remove or demote report fields that imply a false inactivity story

**Primary target files:**
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_reporting.ts`
- `src/sim/displacement_pipeline/displacement_triggers.ts`
- `src/sim/turn_phases/war_phases.ts`

**Gate:** the report cannot say “nothing was active” while the engine was active.

→ `/simplify` → commit

### Phase 5. Regression Gates (~1 session) ✅ COMPLETE (Wave 4, 2026-04-04)
**Assigned to:** QA Engineer + Determinism Auditor

- [x] add tests proving sector-assigned brigades are truthful
- [x] add tests proving frontline mechanics consume sectors first
- [x] add tests proving scenario activity summaries use canonical truth
- [x] add one run-harness check that flags false-assignment regression loudly

**Primary target tests:**
- `tests/brigade_territory_reconciliation.test.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`
- `tests/scenario_activity_truth.test.ts`
- new sector/frontline truth regression tests as needed

**Gate:** future regressions fail automatically instead of showing up as run weirdness weeks later.

→ `/simplify` → commit

### Phase 6. Canon / Roadmap Propagation (~1 session) ✅ COMPLETE (Wave 4, 2026-04-04)
**Assigned to:** Documentation Specialist + Product Manager

- [x] propagate the canonical frontline truth rule into runtime docs and master docs
- [x] update roadmap wording so this lane is clearly named as a current stabilization prerequisite
- [x] preserve the army-HQ reserve brigade exception rule in repo memory

**Gate:** docs no longer overclaim “all brigades always have sectors” without the explicit reserve exception.

→ `/simplify` → commit

---

## 5. File Targets

High-probability files for this plan:
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/commander_override.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/sector_assertions.ts`
- `src/sim/combat/exhaustion.ts`
- `src/sim/combat/officer_quality_update.ts`
- `src/sim/combat/supply_pressure.ts`
- `src/sim/displacement_pipeline/displacement_triggers.ts`
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_reporting.ts`
- `src/scenario/scenario_end_report.ts`

---

## 6. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect/system-level authority changes are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when the plan is created and when execution materially changes frontline truth
- [ ] `/simplify` runs between phases
- [ ] one logical phase per commit
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before claiming done
- [ ] any scenario run is used as diagnosis/proof, not as a substitute for ownership cleanup

---

## 7. Completion Checklist

- [ ] writer/consumer census exists
- [ ] dishonest sector-assignment writer is removed or demoted
- [ ] frontline mechanics consume canonical sector truth
- [ ] activity summary/reporting consume canonical phase outputs
- [ ] regression tests added
- [ ] docs/ledger updated
- [ ] implementation report created

---

## 8. Feature Done Means

Canonical owner:
- `corps_front_sectors` and its truthful downstream consumers own frontline truth.

Demoted path:
- legacy front-assignment/proxy/reporting paths are removed or explicitly compatibility-only.

Player-visible truth:
- frontline-related reports, Army HQ summaries, and diagnostics match the actual sector/frontline state instead of a proxy reconstruction.

Canonical UI surface:
- Army HQ / reporting surfaces summarize frontline truth; tactical map visualizes it; neither invents a second definition.

Done means:
- `SECTOR REACHABILITY INVARIANT VIOLATION` warnings are either eliminated for fake assignments or remain only as honest unresolved diagnostics, and focused regression tests plus one proof run confirm the engine no longer writes false frontline/sector truth.

