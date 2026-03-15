# Pyrrhic Team — State of the Game Convene
**Date:** 2026-03-12
**Convened by:** Orchestrator
**Participants:** All Paradox roles
**Context:** Post-n601 baseline, Operation Preparation system fully implemented, architecture cleanup Phases 1-4 complete

---

## Executive Summary

AWWV is in strong shape. Calibration is at 86.5% area-weighted match with 6/6 benchmarks passing. The Operation Preparation System is fully implemented (engine + UI + 30 tests). Architecture is clean: determinism enforced, state schema sound, 489 vitest tests passing. The sim produces historically plausible 40-week wars.

**The project has shifted from "make it work" to "make it right."** The remaining work is mechanics completion (probes gating blind attacks, morale victory boost, Graz exceptions), content depth (HVO officers, mid-war operations), and polish (warroom art, regression dashboard).

---

## Role-by-Role Assessment

### Game Designer

**Verdict: Design promises delivered. Mechanics gaps, not tuning gaps, are the bottleneck.**

- Game Bible principles ALL implemented: attack-driven control change, brigade-as-spatial-actor, exhaustion irreversibility, enclave resilience, supply gating
- **Three design gaps** requiring new mechanics, not constant tuning:
  1. **Probe gating** — Bot AI commits full attacks into unknown defensive positions. Sector intel exists but isn't checked before attacking. Root cause of residual 22:1 casualty outliers.
  2. **Morale-victory feedback** — Morale drifts on population affinity and encirclement but not battle outcomes. VRS can be zero-morale despite winning everywhere.
  3. **Graz Accords regional exceptions** — Blanket RS↔HRHB truce blocks ALL HVO-RS contact. Historical reality: active fighting in Posavina, Jajce, Mostar while ceasefire holds elsewhere.

### War-or-Game (Realism Auditor)

**Verdict: No show-stopping absurdities. Six items a real commander would flag.**

| Issue | Severity | Root Cause |
|-------|----------|------------|
| Blind attacks into fortified positions | P1 | No intel confidence gate before attack commitment |
| Morale divorced from victories | P1 | Missing battle-outcome morale swing |
| HVO total passivity (15 orders/40w vs 40-60 historical) | P1 | Graz truce blocks all RS targets |
| Density stacking 16x within corps | P2 | No idle-brigade reassignment mechanic |
| Geographic rigidity at corps boundaries | P2 | BFS stops at corps territory edge |
| RS w40 benchmark razor-thin (0.505 vs 0.503 floor) | P2 | Any RBiH buff breaks it |

### Technical Architect

**Verdict: Architecture health STRONG. Two test regressions to fix.**

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Determinism | A | Mulberry32 RNG, strictCompare everywhere, no wall-clock in state |
| State schema | A | Domain segregation complete (military/political/displacement), CURRENT_SCHEMA_VERSION=1 |
| Pipeline | A | 81 war-phase steps, slim orchestrator, step-order test enforced |
| Test suite (vitest) | A- | 489 pass, 1 fail (`corps_front_sector_corps_ownership` — function reference) |
| Test suite (node:test) | C | `bot_operation_objective_focus` failing — objective OSID returning undefined |
| Code debt | B | 5 TODO markers (mostly archived), 2 test regressions |
| Documentation | A | CODE_CANON, REPO_MAP, PIPELINE_ENTRYPOINTS all current |

**Action items:**
1. Fix `splitDisconnectedTerritorySectors` reference in `corps_front_sectors.ts` (blocks 1 test suite)
2. Debug `bot_operation_objective_focus.test.ts` node:test failures

### Systems Programmer

**Verdict: Core invariants holding. Determinism contract clean.**

- No `Math.random()` in sim core (11 grep hits are all bot AI tie-breaking — acceptable, seeded RNG)
- No `Date.now()` or `new Date()` in sim path
- All `Object.keys()` sorted via `strictCompare`
- `determinism_guard.ts` localeCompare→strictCompare fix landed (2026-03-12)
- State serialization: no derived values persisted

### Gameplay Programmer

**Verdict: Operation lifecycle complete. Probe integration is next frontier.**

- **Operation Preparation System**: Fully implemented (555 LOC engine, 196 LOC commander modal, 177 LOC briefing modal, 30 tests)
- **Sector offensives**: Planning→execution→recovery lifecycle stable
- **Three-tier bot AI**: Army→Corps→Brigade working; ops-only attack doctrine enforced
- **Gap**: Bot doesn't check sector intel confidence before launching operations. The preparation system adds commander personality to the process but doesn't gate on intel — that's the next step.

### Scenario Creator / Historian

**Verdict: April 1992 blitz deeply modeled. Mid-war and HVO critically under-covered.**

| Category | Coverage | Assessment |
|----------|----------|------------|
| Scenarios | 51 files, April 1992 primary | April 1992 heavily calibrated; 1993-1995 scaffolded only |
| Brigade OOB | 247 brigades (RBiH 127, RS 80, HRHB 40) | Complete; all have home_osid + corps |
| Pre-planned ops | 9 total (VRS 7, HVO 1, ARBiH 1) | VRS blitz well-covered; ARBiH/HVO opening under-scripted |
| Officers | 84 named (VRS 90%, ARBiH 85%, **HVO 20%**) | **HVO missing command roster entirely** |
| Timeline | apr1992.json comprehensive | Doctrine phases, standing orders, temporal events defined |
| Mid-war calibration | Not started | 1993-1995 scenarios exist but not combat-calibrated |

**Critical gap:** HVO has zero named officers. This blocks HVO narrative authority and morale/command friction modeling.

### UI/UX Developer

**Verdict: Tactical map 7.5/10, warroom 6.5/10. Art pipeline is the blocker.**

- **Tactical map**: 34 React components, 126 source files. Core features 95% complete: panel choreography, fog of war, settlement tabs, operation cards, command briefing, IVP breakdown, AAR panel, ops planning modal
- **Warroom**: 37 source files, 12+ modals implemented. Architecture solid. **Visually placeholder** — needs 6 scene plates (3 factions × prewar/war minimum)
- **Operation Preparation UI**: CommanderSelectionModal + OperationBriefingModal both live (just documented)
- **Open bug**: OpsPlanningModal arrow rendering in modal context (parked, main map arrows work)
- **Key blocker**: Warroom scene art generation. System is functionally complete but has no art.

### Performance Engineer

**Verdict: No performance concerns at current scale.**

- 40-week scenario runs complete in seconds
- `requestIdleCallback` defers heavy GUI work (formation icons)
- O(n³)→O(n) fix landed in `consolidateIsolatedCorpsPockets`
- `Array.shift()` O(n²)→index-based O(n) in sector assignment

### QA Engineer

**Verdict: Process discipline strong. Test debt manageable.**

- **489 vitest tests passing** (46 suites, 1 failure)
- **One-change-then-verify** enforced since n587
- **Life lessons**: 2 recent violations (big-bang refactor, bundled changes) — both documented with mitigations
- **Gap**: No automated regression dashboard for metrics drift (area%, KIA trends)
- **Gap**: GameStateAdapter field path testing is smoke-only

### Product Manager

**Verdict: Feature delivery on track. Critical path is Operation Preparation Phase 1.**

**Delivered last 14 days:**
- Operation Preparation System (full stack)
- Architecture cleanup Phases 1-4
- Operation Jajce + home-municipality affinity
- Casualty ratio fix (n589-n590)
- Enclave defense overhaul (n524-n527)
- Sector contiguity (triple-junction, n532)
- Enclave brigade retention (n598-n601)
- IVP Breakdown + Press Briefing
- Dev/Live map split

**Overall project health: 7.5/10** — shipping features, tests green, calibration tight. Main risks: GUI adapter brittleness, razor-thin calibration floor, HVO content gaps.

---

## Synthesized Priority Stack

Based on all role assessments, here is the unified priority ranking:

### Tier 1 — Fix Now (blocking quality or correctness)

1. **Fix test regressions** — `corps_front_sector_corps_ownership.test.ts` function reference + `bot_operation_objective_focus.test.ts` objective resolution. *Owner: Systems Programmer*

2. **Verify RS w20 benchmark** — Run fresh 40w with latest fixes (n589-n601). If w20 still fails, scope RS early-war tuning. *Owner: Calibration*

### Tier 2 — Next Feature Priority (mechanics completion)

3. **Intel-gated operations** — Bot AI checks sector intel confidence before committing attacks. Low-confidence sectors get probes first, not full commitments. This closes the "blind attack" realism gap and integrates naturally with the new Operation Preparation system. *Owner: Gameplay Programmer*

4. **Morale-victory feedback** — Battle outcomes should swing morale (victory boost, defeat penalty). Closes the "zero-morale winners" absurdity. *Owner: Game Designer → Gameplay Programmer*

5. **Graz Accords regional exceptions** — Add pre-planned operations or timeline overrides for Posavina/Jajce/Mostar active HVO-RS combat. Closes HVO passivity gap. *Owner: Scenario Creator + Gameplay Programmer*

### Tier 3 — Content Depth

6. **HVO named officer roster** — Add 15-20 named HVO commanders (Curčić, Praljak, Stipić, etc.). Unblocks HVO narrative authority. *Owner: Historian → Scenario Creator*

7. **Mid-war scenario calibration** — Validate jan1993_start.json through April 1994. Establish second calibration baseline beyond April 1992. *Owner: Scenario Creator + Calibration*

8. **ARBiH opening defensive operations** — Script 2-3 pre-planned defensive ops for ARBiH turn 0-10 (Sarajevo hold, Tuzla defense). *Owner: Scenario Creator*

### Tier 4 — Polish & Infrastructure

9. **Warroom scene art pipeline** — Generate 6 hero scene plates (3 factions × 2 phases). *Owner: Graphics Programmer / External*

10. **Regression dashboard** — Automated tracking of area%, KIA, casualty ratios across calibration runs. *Owner: QA Engineer*

11. **GameStateAdapter path tests** — Unit tests for every adapter path that feeds interactive layers. *Owner: UI/UX Developer*

12. **CI workflow (Phase 5)** — GitHub Actions. Deferred pending user confirmation. *Owner: Build Engineer*

---

## Single Agreed Priority

**Intel-gated operations** (Tier 2, item #3) — after fixing the two test regressions (Tier 1).

**Rationale:** The Operation Preparation system is built and waiting. The natural next step is wiring sector intel confidence into operation launch decisions so the preparation phase has teeth — low intel → probes ordered → confidence builds → launch. This closes the #1 realism gap (blind attacks), integrates with existing systems (sector_intel + operation_preparation), and has the highest return on investment of any remaining work item.

**Handoff:** Orchestrator → Gameplay Programmer for implementation. Game Designer reviews intel threshold design. War-or-Game validates with insanity check after calibration run.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| RS w40 benchmark breaks with next change | Medium | High (6/6→5/6) | Lock calibration floor; test every change |
| GameStateAdapter silent undefined cascade | Medium | High (entire UI feature dies) | Path tests + lint rule |
| HVO narrative authority gap blocks player experience | Low | Medium | Officer roster is content, not code |
| Warroom art blocks "release-ready" assessment | High | Medium | Functional without art; cosmetic blocker |
| Mid-war dynamics untested | Medium | Medium | Second calibration baseline needed |

---

*Next convene: After intel-gated operations land + fresh calibration run.*
