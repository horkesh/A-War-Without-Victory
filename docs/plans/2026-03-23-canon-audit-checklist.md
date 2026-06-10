# Canon Audit Checklist — v0.7.3 Peace Phase Removal

> **Version note (2026-03-24):** Reslotted from v0.7.2 to v0.7.3 per roadmap restructuring. Canon audit is cleanup — lowest risk, scheduled last in v0.7.x.

**Date:** 2026-03-23
**Status:** PLAN
**Prerequisite:** None (independent of v0.7.0/v0.7.1/v0.7.2)
**Context:** The full campaign now starts April 1992. The peace phase is no longer playable content. All references to September 1991 start, peace phase gameplay, Phase I (pre-war), and early-war phase transitions need to be identified and either removed or revised.

**Save migration note:** Existing saves may contain `phase: 'peace'` in GameState. After removing `'peace'` from `PhaseName`, deserialization will fail. Add a migration step in `serialize.ts`: if loaded save has `phase === 'peace'`, coerce to `'war'` with a console warning. This must be implemented in Phase E (type system changes) alongside the PhaseName update.

---

## Summary of Findings

The peace phase and its September 1991 start date are deeply woven through the codebase. The audit found:

- **11 source files** in `src/phase0/` — the entire Phase 0 (pre-war) system (capital, investment, referendum, stability, bot AI, events, alliance)
- **1 core type definition** — `PhaseName = 'peace' | 'war'` in `game_state.ts`
- **2 pipeline orchestrators** — `src/sim/turn_pipeline.ts` (peace branch) and `src/state/turn_pipeline.ts` (Phase 0 runner)
- **1 pipeline step file** — `src/sim/turn_phases/peace_phases.ts` (22 early-war steps still used in war phase)
- **18 files** in `src/sim/early_war/` — militia emergence, control strain, JNA transition, etc. (still needed for war-phase early turns)
- **3 scenario files** — `sep_1991_phase0.json`, `phase0_full_progression_52w.json`, `phase0_full_progression_20w.json`
- **22 warroom UI files** referencing peace/phase0 — Phase0DirectiveState, Phase0PreparationMap, investment panel, etc.
- **25 test files** testing phase0 systems
- **6 canon docs** with peace phase references
- **10+ engineering docs** with peace phase / Phase I terminology

### Critical Distinction: "Peace Phase" vs "Early War"

The `peace_phases.ts` file name is misleading. It contains **early-war pipeline steps** (militia emergence, pool population, JNA transition, alliance updates, displacement) that run during the **war phase** for the first ~12 weeks. These steps are NOT peace-phase-only — they are essential war-phase mechanics. The file should be renamed, not deleted.

The `src/sim/early_war/` directory is similarly still needed — it models the chaotic early weeks of the war (April-June 1992).

The `src/phase0/` directory, however, is genuinely pre-war (referendum, capital investment, declaration pressure) and is the primary deletion target.

---

## Priority 1: Functional Changes (Code Behavior)

These changes affect runtime behavior. Each carries test/calibration risk.

| # | File | Reference | Action | Risk | Notes |
|---|------|-----------|--------|------|-------|
| 1.1 | `src/state/game_state.ts:490` | `PhaseName = 'peace' \| 'war'` | REVISE | **HIGH** | Remove `'peace'` from union type. Ripples to every `phase === 'peace'` check. Must be done last after all consumers updated. |
| 1.2 | `src/state/game_state.ts:1037-1039` | `phase?: PhaseName` with Phase 0 comment | REVISE | HIGH | Remove optional, make `phase: 'war'` required or remove field entirely. |
| 1.3 | `src/sim/turn_pipeline.ts:16,41-44,124` | `import { peacePhases }`, peace phase throw guard, peace phase step loop | REVISE | **HIGH** | Remove peace branch. Keep peacePhases import but rename to `earlyWarPhases`. The steps themselves still run in war. |
| 1.4 | `src/sim/turn_phases/peace_phases.ts` (entire file) | Named `peacePhases`, comments say "Peace phase" | REVISE (rename) | **HIGH** | Rename file to `early_war_phases.ts`, rename export to `earlyWarPhases`. Do NOT delete — these 22 steps run during war phase early weeks. |
| 1.5 | `src/state/turn_pipeline.ts:17,26,66-103` | Phase 0 runner: `runPhase0Turn`, `buildPhase0TurnOptions`, peace branch | DELETE branch | **HIGH** | Remove entire `if (phase === 'peace')` block. Keep war-phase error as the only path. |
| 1.6 | `src/desktop/desktop_sim.ts:75-81` | `SEP_1991_SCENARIO_RELATIVE`, `sep_1991` key, `DesktopScenarioKey` union | REVISE | MEDIUM | Remove `sep_1991` from type and lookup map. Remove constant. |
| 1.7 | `src/desktop/desktop_sim.ts:12-14,47` | Phase0 imports (`initializePhase0Relationships`, `applyInvestment`, `runPhase0TurnAndAdvance`) | DELETE imports | MEDIUM | Remove unused imports after peace branch removal. |
| 1.8 | `src/scenario/scenario_runner.ts:647` | "Ensure peace phase militia strength" comment | REVISE | LOW | Update comment text only; logic likely still needed. |
| 1.9 | `src/state/serialize.ts:475` | "When any peace-phase key exists" | REVISE | LOW | Update comment; check if peace-phase serialization keys can be removed. |
| 1.10 | `src/state/validateGameState.ts` | PhaseName import/validation | REVISE | MEDIUM | Update validation to reject `'peace'` phase. |
| 1.11 | `src/sim/bot/bot_strategy.ts` | PhaseName import | REVISE | LOW | Update import after type change. |
| 1.12 | `src/sim/early_war/control_strain.ts:85,121` | `peacePhaseTimeFactor()` function name | REVISE | LOW | Rename to `earlyWarTimeFactor()`. Logic unchanged. |
| 1.13 | `src/sim/early_war/bot_phase_i.ts` | File name references Phase I | REVISE | LOW | Rename to `bot_early_war.ts`. |
| 1.14 | `src/sim/run_early_war_browser.ts:3` | "Used by warroom when advancing a turn in peace phase" | REVISE | LOW | Update comment. Evaluate if file is still needed. |
| 1.15 | `src/ui/map/audio/sound_manifest.ts:74` | `peace_phase` music registration | DELETE | LOW | Remove peace phase music hook. |
| 1.16 | `src/ui/map/map/builders/buildFrontLinesGeoJSON.ts:8,12` | `peacePhaseAllianceRbihHrhb` parameter | REVISE | LOW | Rename parameter. Alliance tracking still needed for early war. |
| 1.17 | `src/map/front_edges.ts:1` | Import from `early_war/alliance_update` | KEEP | NONE | Early war alliance is still active; import is correct. |

## Priority 2: Functional Changes (Phase 0 System Removal)

The entire `src/phase0/` directory and its consumers can be removed or archived.

| # | File | Reference | Action | Risk | Notes |
|---|------|-----------|--------|------|-------|
| 2.1 | `src/phase0/` (entire directory, 11 files) | Phase 0 pre-war system | ARCHIVE | **HIGH** | Move to `src/_archived/phase0/`. Includes: `index.ts`, `turn.ts`, `capital.ts`, `investment.ts`, `stability.ts`, `referendum.ts`, `declaration_pressure.ts`, `alliance.ts`, `bot_phase0.ts`, `phase0_events.ts`, `phase0_options_builder.ts`. |
| 2.2 | `src/ui/warroom/run_phase0_turn.ts` | Phase 0 turn runner for warroom | ARCHIVE | MEDIUM | Move to `src/_archived/`. |
| 2.3 | `src/ui/warroom/components/Phase0DirectiveState.ts` | Phase 0 directive UI state | ARCHIVE | MEDIUM | Move to `src/_archived/`. |
| 2.4 | `src/ui/warroom/components/Phase0PreparationMap.ts` | Phase 0 preparation map | ARCHIVE | MEDIUM | Move to `src/_archived/`. |
| 2.5 | `src/ui/warroom/components/InvestmentPanel.ts` | Phase 0 investment UI | ARCHIVE | MEDIUM | Move to `src/_archived/`. |
| 2.6 | `src/ui/warroom/components/DeclarationEventModal.ts` | Phase 0 declaration events | ARCHIVE | LOW | Move to `src/_archived/`. |

## Priority 3: Functional Changes (Warroom Peace-Phase Branches)

These files have `if (phase === 'peace')` branches that become dead code.

| # | File | Reference | Action | Risk | Notes |
|---|------|-----------|--------|------|-------|
| 3.1 | `src/ui/warroom/warroom.ts:699` | `phase === 'peace' ? 'Peace phase'` | REVISE | MEDIUM | Remove peace branch from phase display. |
| 3.2 | `src/ui/warroom/ClickableRegionManager.ts:31,395-396,514,528` | `runPhaseITurn` import, `phase === 'peace'` checks, Phase 0 transition | REVISE | MEDIUM | Remove all peace-phase branches. |
| 3.3 | `src/ui/warroom/components/WarPlanningMap.ts` | Peace phase map mode | REVISE | LOW | Remove peace-phase rendering branch. |
| 3.4 | `src/ui/warroom/components/ReportsModal.ts` | Phase 0 report sections | REVISE | LOW | Remove peace-phase report sections. |
| 3.5 | `src/ui/warroom/components/NewspaperModal.ts` | Peace/phase0 content | REVISE | LOW | Remove peace-phase newspaper content. |
| 3.6 | `src/ui/warroom/components/MagazineModal.ts` | Peace/phase0 content | REVISE | LOW | Remove peace-phase magazine content. |
| 3.7 | `src/ui/warroom/components/FactionOverviewPanel.ts` | Peace phase faction display | REVISE | LOW | Remove peace-phase faction overview. |
| 3.8 | `src/ui/warroom/data/warroom_state.ts` | Peace phase state tracking | REVISE | LOW | Remove peace state fields. |
| 3.9 | `src/ui/warroom/data/war_data_extractor.ts` | Peace phase data extraction | REVISE | LOW | Remove peace data paths. |
| 3.10 | `src/ui/warroom/components/warroom_utils.ts:38` | "For a Sep 1991 scenario" comment | REVISE | LOW | Update comment. |
| 3.11 | `src/ui/warroom/components/NewsTicker.ts:69` | "keyed to the Sep-1991 epoch" | REVISE | LOW | Update epoch reference. |
| 3.12 | `src/ui/warroom/content/ticker_events.ts` | Sep 1991 scripted events | REVISE | LOW | Remove pre-April 1992 events. |
| 3.13 | `src/ui/warroom/content/headline_templates.ts` | Peace phase headlines | REVISE | LOW | Remove peace-phase headline templates. |
| 3.14 | `src/ui/warroom/map_viewer_app.ts:660,776` | `'Turn 0 -- Sep 1991'` display text | REVISE | LOW | Change to April 1992. |
| 3.15 | `src/ui/map/desktop/campaignRecruitmentActions.ts:51` | `'Sep 1991'` date string | REVISE | LOW | Remove sep_1991 branch. |
| 3.16 | `src/ui/map/data/GameStateAdapter.ts` | Peace phase adapter logic | REVISE | LOW | Remove peace-phase data paths. |
| 3.17 | `src/ui/map/data/types.ts` | Peace phase type fields | REVISE | LOW | Remove peace-phase type definitions. |
| 3.18 | `src/scenario/scenario_loader.ts` | Peace phase scenario loading | REVISE | LOW | Remove peace-phase loading path. |
| 3.19 | `src/ui/warroom/components/DiplomacyModal.ts` | Peace/pre-war diplomacy | REVISE | LOW | Remove peace-phase diplomacy. |
| 3.20 | `src/ui/warroom/components/CommandBriefingModal.ts` | Phase0/peace content | REVISE | LOW | Remove peace-phase briefing content. |
| 3.21 | `src/ui/warroom/content/war_headline_templates.ts` | Peace phase references | REVISE | LOW | Remove peace-phase headline templates. |
| 3.22 | `src/state/political_control_init.ts` | Phase0 initialization | REVISE | LOW | Check if peace-specific init paths exist. |

## Priority 4: Scenario & Data Files

| # | File | Reference | Action | Risk | Notes |
|---|------|-----------|--------|------|-------|
| 4.1 | `data/scenarios/sep_1991_phase0.json` | September 1991 scenario | ARCHIVE | LOW | Move to `data/_archived/`. |
| 4.2 | `data/scenarios/phase0_full_progression_52w.json` | Phase 0 full progression | ARCHIVE | LOW | Move to `data/_archived/`. |
| 4.3 | `data/scenarios/phase0_full_progression_20w.json` | Phase 0 full progression | ARCHIVE | LOW | Move to `data/_archived/`. |
| 4.4 | `data/scenarios/sep1991_to_dayton.json` | Sep 1991 to Dayton timeline | ARCHIVE | LOW | Move to `data/_archived/`. |
| 4.5 | `data/scenarios/sep1991_to_sep1992_52w.json` | Sep 1991 one-year scenario | ARCHIVE | LOW | Move to `data/_archived/`. |

## Priority 5: Test Files

All 25 test files testing Phase 0 systems. These should be archived, not deleted, in case peace phase is resurrected.

| # | File | Action | Notes |
|---|------|--------|-------|
| 5.1 | `tests/phase0_turn.test.ts` | ARCHIVE | |
| 5.2 | `tests/phase0_to_phasei_brigade_availability.test.ts` | ARCHIVE | |
| 5.3 | `tests/phase0_state_schema.test.ts` | ARCHIVE | |
| 5.4 | `tests/phase0_stability.test.ts` | ARCHIVE | |
| 5.5 | `tests/phase0_referendum.test.ts` | ARCHIVE | |
| 5.6 | `tests/phase0_investment.test.ts` | ARCHIVE | |
| 5.7 | `tests/phase0_declaration_pressure.test.ts` | ARCHIVE | |
| 5.8 | `tests/phase0_capital.test.ts` | ARCHIVE | |
| 5.9 | `tests/sep_1991_phase0_schedule.test.ts` | ARCHIVE | |
| 5.10 | `tests/scenario_phase0_full_progression.test.ts` | ARCHIVE | |
| 5.11 | `tests/phase0_v4_full_suite_regression.test.ts` | ARCHIVE | |
| 5.12 | `tests/phase0_v1_no_war_without_referendum_e2e.test.ts` | ARCHIVE | |
| 5.13 | `tests/phase0_v2_phasei_unreachable_without_referendum_e2e.test.ts` | ARCHIVE | |
| 5.14 | `tests/phase0_v3_non_war_terminal_path_e2e.test.ts` | ARCHIVE | |
| 5.15 | `tests/phase0_referendum_held_war_start_e2e.test.ts` | ARCHIVE | |
| 5.16 | `tests/early_war_entry_gating.test.ts` | REVISE | Update to remove peace-phase gating tests; keep war-phase early-war tests. |
| 5.17 | `tests/emergence_pressure_gating.test.ts` | REVISE | Check for peace-phase assumptions. |
| 5.18 | `tests/emergence_pipeline_integration.test.ts` | REVISE | Check for peace-phase assumptions. |
| 5.19 | `tests/emergence_aor_instantiation.test.ts` | REVISE | Check for peace-phase assumptions. |
| 5.20 | `tests/displacement_pipeline_pipeline_integration.test.ts` | REVISE | Check for peace-phase assumptions. |
| 5.21 | `tests/displacement_pipeline_displacement_triggers.test.ts` | REVISE | Check for peace-phase assumptions. |
| 5.22 | `tests/alliance_lifecycle.test.ts` | REVISE | Alliance still matters in early war; remove peace-phase-specific tests. |
| 5.23 | `tests/local_truces.test.ts` | REVISE | Check for peace-phase setup. |
| 5.24 | `tests/events_evaluate.test.ts` | REVISE | Check for peace/phase0 event types. |
| 5.25 | `tests/dayton_negotiation.test.ts` | REVISE | Check for phase0 references. |

## Priority 6: Canon Documentation

| # | File | Reference | Action | Notes |
|---|------|-----------|--------|-------|
| 6.1 | `docs/10_canon/Peace_Specification_v0_6_0.md` | Entire file is the Peace phase spec | ARCHIVE | Move to `docs/_old/10_canon/`. Already partially superseded by v0.6 consolidation. |
| 6.2 | `docs/10_canon/Phase_Specifications_v0_6_0.md` | "Peace and War only" two-phase model | REVISE | Rewrite to single-phase (War only) model. Remove Peace spec link. |
| 6.3 | `docs/10_canon/War_Specification_v0_6_0.md:20,84` | "no separate Phase I or Phase II", "two-phase (Peace/War) model" | REVISE | Update to state single-phase model. War is the only phase. |
| 6.4 | `docs/10_canon/Systems_Manual_v0_7_0.md:58,60,68,70,156,621,898,922` | Multiple peace phase references (early-war phase, brigade location, control status, stability) | REVISE | Rewrite sections 3 and related to remove peace phase. Keep early-war mechanics description. |
| 6.5 | `docs/10_canon/Rulebook_v0_7_0.md:491,605` | Section 17.1 "Peace phase (Pre-War)", stability-based control | REVISE | Remove or rewrite Section 17.1. Update stability reference. |
| 6.6 | `docs/10_canon/Engine_Invariants_v0_7_0.md:404,414,419` | "Peace/War model" changelog entries | REVISE | Update changelog to reflect v0.7.2 single-phase. |
| 6.7 | `docs/10_canon/context.md:37,43,98,274,312,315,317,338,359` | Peace phase fatigue, early_war directory description, peace_phases.ts listing, Phase 1 contact graph | REVISE | Update directory tree, remove peace_phases.ts entry, update descriptions. |
| 6.8 | `docs/10_canon/FORAWWV.md:216-217` | "Canonical adjacency (Phase 1)" | FLAG | **Edits require Pyrrhic-panel sign-off per sacred rules.** Route through the appropriate panel. This "Phase 1" refers to contact graph phase, not game phase. |

## Priority 7: Engineering Documentation

| # | File | Reference | Action | Notes |
|---|------|-----------|--------|-------|
| 7.1 | `docs/20_engineering/CODE_CANON.md:33` | "Peace phase / canonical pipeline" | REVISE | Update to war-only pipeline. |
| 7.2 | `docs/20_engineering/REPO_MAP.md:23-24,65,71` | peace_phases.ts references, peace-phase turn advance | REVISE | Update file references after rename. |
| 7.3 | `docs/20_engineering/VERSIONING.md:47,182` | "Peace phase fully playable" milestone, partial status | REVISE | Remove peace phase from version milestones. |
| 7.4 | `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md:21,23,32` | `sep_1991` scenario key, peace turn advance | REVISE | Remove sep_1991 key. Remove peace-phase advance behavior. |
| 7.5 | `docs/20_engineering/DISPLACEMENT_CENSUS_SEEDING.md:10,22` | "peace or war phase" conditional | REVISE | Remove peace phase references. |
| 7.6 | `docs/20_engineering/DISPLACEMENT_MASTER.md:6` | "no separate Phase I or Phase II" | REVISE | Update to single-phase model statement. |
| 7.7 | `docs/20_engineering/TACTICAL_MAP_SYSTEM.md:552` | "peace = Sep 1991 anchor" for date display | REVISE | Remove peace anchor. Only war anchor (Apr 1992). |
| 7.8 | `docs/20_engineering/PIPELINE_ENTRYPOINTS.md:86` | peace_phases.ts pipeline reference | REVISE | Update file name after rename. |
| 7.9 | `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md:11,32,34-35,154` | "Peace phase" link, agency section | REVISE | Rewrite to remove peace phase framing. |
| 7.10 | `docs/20_engineering/PHASEI_NOFLIP_SCENARIO_AUTHOR_CHECKLIST.md` | Entire file about Phase I no-flip | ARCHIVE | Move to `docs/_old/`. Already has legacy note. |
| 7.11 | `docs/20_engineering/PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.md` | Entire file about Phase I overhaul | ARCHIVE | Move to `docs/_old/`. Already has legacy note. |
| 7.12 | `docs/20_engineering/AOR_ZOC_LEGACY_AUDIT.md:5,167,190-250` | Phase I/II purge documentation | REVISE | Update to reflect peace phase removal (v0.7.2). |

## Priority 8: Reports (Cosmetic, Low Priority)

134 report files contain peace/phase0/Phase I references. Most are historical records of past work.

| # | Scope | Action | Notes |
|---|-------|--------|-------|
| 8.1 | `docs/40_reports/backlog/PHASE0_JNA_STATUS_HANDOFF_HOWTO.md` | ARCHIVE | Obsolete backlog item. |
| 8.2 | `docs/40_reports/convenes/PYRRHIC_PHASE0_ORCHESTRATOR_REPORT.md` | KEEP | Historical record. |
| 8.3 | All other `docs/40_reports/` files (131 files) | KEEP | Historical records. Add note to README that pre-v0.7.2 reports may reference deprecated peace phase. |

---

## Risk Assessment

### HIGH RISK (must run smoke-test triad after each change)
1. **`PhaseName` type change** (1.1) — affects every file that imports or checks `PhaseName`. Must be the LAST change.
2. **Pipeline orchestrator changes** (1.3, 1.5) — any mistake breaks all sim runs.
3. **`peace_phases.ts` rename** (1.4) — the early-war steps in this file are essential for war-phase weeks 0-12. Renaming must not break imports.
4. **Phase 0 archival** (2.1) — must remove all `src/phase0/` imports from non-archived files first.

### MEDIUM RISK
5. **Desktop sim** (1.6, 1.7) — Electron app breaks if imports are wrong.
6. **Warroom UI branches** (3.1-3.22) — dead code removal, but must verify no remaining `'peace'` string comparisons.
7. **Test archival** (5.1-5.15) — must not accidentally archive tests that cover war-phase behavior.

### LOW RISK
8. **Comment updates** (1.8, 1.9, 1.12) — cosmetic, no behavioral change.
9. **Documentation updates** (6.x, 7.x) — text only.
10. **Scenario archival** (4.x) — no runtime consumer references these in war-only mode.

### ZERO RISK (safe to do anytime)
11. **Report file changes** (8.x) — historical records, no code dependency.

---

## Recommended Execution Order

1. **Phase A — Archive dead systems** (2.1-2.6, 4.1-4.5, 5.1-5.15, 6.1, 7.10-7.11, 8.1): Move files to `_archived` directories. Fix broken imports. Run smoke-test triad.
2. **Phase B — Rename early-war files** (1.4, 1.12, 1.13): Rename `peace_phases.ts` to `early_war_phases.ts`, `peacePhaseTimeFactor` to `earlyWarTimeFactor`, `bot_phase_i.ts` to `bot_early_war.ts`. Update all imports. Run smoke-test triad.
3. **Phase C — Remove peace branches from pipelines** (1.3, 1.5, 1.6, 1.7): Remove `if (phase === 'peace')` from both pipeline orchestrators. Remove sep_1991 from desktop_sim. Run smoke-test triad.
4. **Phase D — Clean warroom UI** (3.1-3.22): Remove all peace-phase branches from warroom components. Run smoke-test triad.
5. **Phase E — Update type system** (1.1, 1.2, 1.10, 1.11): Change `PhaseName` to `'war'` only (or remove type entirely). Fix all type errors. Run smoke-test triad.
6. **Phase F — Update documentation** (6.2-6.8, 7.1-7.9, 7.12): Rewrite canon docs and engineering docs. Route FORAWWV.md edits through Pyrrhic-panel sign-off.
7. **Phase G — Update remaining tests** (5.16-5.25): Revise tests that reference peace phase but test war-phase behavior.

**Estimated scope:** ~100 files touched, ~3000 lines removed, ~200 lines revised.

---

## Files NOT to Change

| File/Directory | Reason |
|----------------|--------|
| `src/sim/early_war/` (18 files) | Still needed for war-phase early weeks. "Early war" != "peace phase". |
| `docs/10_canon/FORAWWV.md` | Sacred rule: edits require Pyrrhic-panel sign-off. |
| `docs/40_reports/` (most files) | Historical records of past development. |
| `src/_archived/` (existing) | Already archived code. |
| `data/scenarios/essays/` | Essay files mentioning "pre-war" in historical context — correct usage. |

---

*Canon Audit Checklist v0.7.2 — generated 2026-03-23*
