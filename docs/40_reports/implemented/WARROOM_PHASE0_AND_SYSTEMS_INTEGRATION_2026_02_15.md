# Warroom Overhaul + Phase 0 Gameplay Loop + Systems Integration

**Date:** 2026-02-15
**Author:** Paradox Team (multi-session implementation)
**Status:** Complete (Phase 4 Visual Setup deferred — asset-dependent)

---

## 1. Overview

Comprehensive overhaul implementing three source documents:
1. **WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL.md** — Warroom visual refresh + Phase 0 gameplay loop
2. **INTEGRATION_AND_SYSTEMS_HANDOVER_EXTERNAL_EXPERT_2026_02_15.md** — Systems wiring (legitimacy, IVP, embargo, Phase 3B/3C, enclaves, Sarajevo, negotiation, heavy equipment)
3. **DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md** — Audit of canon-specified but unimplemented systems

**Outcome:** Phase 0 (Sep 1991 → Apr 1992) is playable through the warroom with capital allocation, bot AI, historical events, dynamic newspaper/magazine/reports content, declaration events, and Phase I transition. Eight documented-but-disconnected pipeline systems are wired with feature flags (default OFF).

**Verification:** TypeScript clean; Vitest 9 suites 130/130; npm test 130/132 (2 pre-existing `jna-ghost-degradation`); warroom Vite build succeeds (80 modules).

---

## 2. Implementation phases

### Phase 1: Foundation (5 tasks)

| Task | File(s) | Lines | What |
|------|---------|-------|------|
| 1.1A Options Builder + Alliance | `src/phase0/phase0_options_builder.ts` (NEW, 154 lines), `src/phase0/alliance.ts` (NEW, 90 lines) | 244 | Derives Phase0TurnOptions from GameState (RS/HRHB org coverage, JNA coordination, recognition, relationships). RBiH-HRHB alliance tracking with cooperation bonus from coordinated investments. |
| 1.1B Event System | `src/phase0/phase0_events.ts` (NEW, 262 lines) | 262 | Generates typed events (`declaration`, `investment_completed`, `stability_change`, `authority_degradation`, `referendum_eligible`, `war_countdown`) by comparing state snapshots. Added `phase0_events_log` to GameState and `GAMESTATE_TOP_LEVEL_KEYS`. |
| 1.2 Bot AI | `src/phase0/bot_phase0.ts` (NEW, 244 lines) | 244 | Deterministic bot using seeded RNG; prioritizes own-ethnic municipalities; budget `min(8, floor(capital*0.12))` per turn; investment priority police → party → paramilitary (TO for RBiH). |
| 1.3 Historical Ticker | `src/ui/warroom/content/ticker_events.ts` (NEW, 77 lines) | 77 | ~30 hand-authored historical events (Sep 1991 → Apr 1992): Croatia fighting, Hague conference, sovereignty vote, Dubrovnik, Vukovar, Germany recognition, Vance Plan, UNPROFOR, referendum, barricades, first shots, EC recognition. NewsTicker updated to show historical + dynamic game events. |
| 1.4 Ethnicity Layer | `src/ui/warroom/components/WarPlanningMap.ts` (MOD) | +80 | Active checkbox toggle for 1991 ethnicity (Green=Bosniak, Red=Serb, Blue=Croat, Gray=Mixed). Mutually exclusive with political control. Legend updates dynamically. |

### Phase 2: Core Gameplay UI (4 tasks, 6 agents)

| Task | File(s) | Lines | What |
|------|---------|-------|------|
| 2.1 Directive Staging | `src/ui/warroom/components/Phase0DirectiveState.ts` (NEW, 176 lines) | 176 | Stage/unstage/clear investments; validation (hostile-majority, TO-RBiH-only, sufficient capital); cost tracking. Matches Phase II order staging pattern. |
| 2.2 INVEST Layer + Panel | `src/ui/warroom/components/InvestmentPanel.ts` (NEW, 369 lines), `WarPlanningMap.ts` (MOD, +134 lines), `war-planning-map.css` (MOD, +355 lines) | 858 | Side panel with capital header (green/amber/red bar), staged investments summary with undo, municipality info (name/controller/stability/ethnicity), org factors with progress bars, investment options with INVEST buttons and cost display. INVEST checkbox (Phase 0 only), click routing, municipality selection, public API. |
| 2.3 Calendar + Turn Wiring | `WallCalendar.ts` (MOD), `ClickableRegionManager.ts` (MOD, 382 lines total) | ~50 | Phase 0 calendar visuals (capital display, referendum deadline, war countdown). Staged investment confirmation dialog; applies investments before pipeline; refreshes all warroom surfaces post-turn; checks for critical events and triggers declaration modals. |
| 2.4A Newspaper | `src/ui/warroom/content/headline_templates.ts` (NEW, 254 lines), `NewspaperModal.ts` (MOD, 192 lines total) | 254+ | Prioritized template system (P0 declaration → P7 fallback); faction-specific framing; variable substitution. Faction mastheads: OSLOBODENJE / GLAS SRPSKE / CROATIAN HERALD. |
| 2.4B Magazine | `MagazineModal.ts` (MOD, 305 lines total) | ~200 | Monthly aggregation (every 4 turns): organizational coverage %, authority trend, stability overview, capital progress, declaration watch. Between issues shows most recent. |
| 2.4C Reports | `ReportsModal.ts` (MOD, 287 lines total) | ~180 | Per-municipality intelligence from org-pen data; military typewriter format (FROM/TO/DATE/SUBJECT/CLASSIFICATION); faction-specific headers; urgency-sorted (highly contested → contested → secure). |

### Phase 3: Events, Transitions, and Polish (5 tasks)

| Task | File(s) | Lines | What |
|------|---------|-------|------|
| 3.1 Declaration Modals | `src/ui/warroom/components/DeclarationEventModal.ts` (NEW, 315 lines) | 315 | Full-screen dramatic modals for RS/HRHB declaration, referendum, war beginning. Dark overlay, faction crest, dramatic typography, ACKNOWLEDGE button. Helper functions `findCriticalEvent`, `checkWarTransition`, `showDeclarationModal`, `showWarBeginsModal`. |
| 3.2 Phase I Handoff | `src/ui/warroom/run_phase0_turn.ts` (MOD, 157 lines total) | ~60 | Seeds un-invested municipality org-pen from control baseline; initializes `phase_i_jna`; sets `meta.phase = 'phase_i'`; enables phone region; disables INVEST layer. State carry-forward: stability_score, organizational_penetration, political_controllers, declared, prewar_capital. |
| 3.3 Faction Overview | `FactionOverviewPanel.ts` (MOD, 561 lines total) | ~150 | Phase 0 section: capital bar (green > 50%, amber > 25%, red < 25%); investment counts by type; organizational coverage %; declaration pressure bars (RS/HRHB). |
| 3.4 Escalation Cues | `headline_templates.ts` (MOD), `WallCalendar.ts` (MOD), `warroom.ts` (MOD, 291 lines total) | ~40 | Headline urgency scaling by pressure level; calendar "WAR IN N WEEKS" countdown with red pulsing; canvas red vignette at high pressure (`rgba(139,0,0, intensity*0.15)`); starting brief EXTRA EDITION newspaper at Turn 0. |
| 3.5 Scenario File | `data/scenarios/sep_1991_phase0.json` (NEW, 14 lines) | 14 | `start_phase: "phase_0"`, 32 weeks, capital pools (RS=100, RBiH=70, HRHB=40), institutional `init_control`. |

### Phase 5: Systems Integration (6 tasks, all feature-gated OFF)

| Task | Gate flag | What |
|------|-----------|------|
| 5.1 Legitimacy Wiring | `enable_legitimacy_wiring` | `updateLegitimacyState()` output wired to authority consolidation (low legitimacy caps authority at Contested) and recruitment efficiency (capital accrual multiplier [0.5, 1.0] from average legitimacy). |
| 5.2 IVP → Exhaustion + Negotiation | `enable_ivp_exhaustion` | IVP wired into exhaustion accumulation (`exhaustion_delta += k * IVP`, monotonic) and negotiation capital formula. Patron state as constraint (no control flips from patrons). |
| 5.3 Embargo Enforcement | `enable_embargo_enforcement` | Equipment/ammo ceilings in recruitment enforced from `state.embargo_profiles`. Differential per faction (not binary). |
| 5.4 Phase 3B + 3C | `enable_phase3b`, `enable_phase3c` | 3B: pressure → exhaustion coupling (sole source, single responsibility). 3C: exhaustion → collapse gating (threshold gate). Reconciled with existing exhaustion step. |
| 5.5 Enclave/Sarajevo → IVP + Treaty | `enable_enclave_ivp`, `enable_sarajevo_treaty` | Enclave humanitarian pressure and Sarajevo visibility wired into IVP. Sarajevo treaty clause: rejection with `rejection_reason = 'sarajevo_unresolved'`. |
| 5.6 Heavy Equipment + Maintenance | `enable_heavy_equipment_integration` | Equipment degradation wired to formation equipment state; maintenance capacity slows degradation; combat power reflects equipment state. |

---

## 3. Build fix: Browser-safe module extraction

**Problem:** Warroom Vite build failed with `"resolve" is not exported by "__vite-browser-external"` because the browser-reachable import chain `authority_degradation.ts → legitimacy.ts → political_control_init.ts → settlement_ethnicity.ts` pulled `node:fs/promises` and `node:path` into the bundle.

**Solution:** Created `src/state/legitimacy_utils.ts` (48 lines) with browser-safe pure functions (`getFactionLegitimacyAverages` and legitimacy constants). Updated `authority_degradation.ts` to import from `legitimacy_utils.js`. Re-exported from `legitimacy.ts` for backward compatibility with separate `import` for local use (re-exports don't make symbols available locally in TS).

---

## 4. Files inventory

### New files (11 files, 2,003 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `src/phase0/phase0_options_builder.ts` | 154 | Derives Phase0TurnOptions from GameState |
| `src/phase0/phase0_events.ts` | 262 | Typed event generation from state snapshots |
| `src/phase0/alliance.ts` | 90 | RBiH-HRHB alliance tracking |
| `src/phase0/bot_phase0.ts` | 244 | Deterministic bot AI for non-player factions |
| `src/ui/warroom/content/ticker_events.ts` | 77 | Historical news events Sep 1991 → Apr 1992 |
| `src/ui/warroom/content/headline_templates.ts` | 254 | Prioritized headline template system |
| `src/ui/warroom/components/Phase0DirectiveState.ts` | 176 | Investment staging with validation |
| `src/ui/warroom/components/InvestmentPanel.ts` | 369 | Phase 0 investment side panel |
| `src/ui/warroom/components/DeclarationEventModal.ts` | 315 | Full-screen declaration/transition modals |
| `src/state/legitimacy_utils.ts` | 48 | Browser-safe legitimacy functions |
| `data/scenarios/sep_1991_phase0.json` | 14 | Phase 0 scenario (Sep 1991, 32 weeks) |

### Modified files (18 files)

| File | Total lines | What changed |
|------|-------------|--------------|
| `src/phase0/turn.ts` | 71 | Accepts and passes real Phase0TurnOptions |
| `src/state/game_state.ts` | 1,008 | Added `phase0_events_log`, `phase0_relationships`, Phase0Event types |
| `src/state/serialize.ts` | 555 | Added `phase0_events_log` to GAMESTATE_TOP_LEVEL_KEYS |
| `src/state/legitimacy.ts` | 117 | Re-exports from legitimacy_utils.js; dual import for local use |
| `src/state/acceptance_constraints.ts` | 189 | Sarajevo treaty clause (rejection_reason) |
| `src/sim/phase_i/authority_degradation.ts` | 113 | Import from legitimacy_utils.js (browser-safe) |
| `src/sim/recruitment_turn.ts` | 214 | Embargo equipment ceiling enforcement |
| `src/ui/warroom/run_phase0_turn.ts` | 157 | Bot AI integration, Phase I handoff, directive application |
| `src/ui/warroom/components/WarPlanningMap.ts` | 1,383 | INVEST layer, ethnicity layer, investment panel wiring |
| `src/ui/warroom/styles/war-planning-map.css` | 895 | Investment panel styles (~355 lines), settlement tabs |
| `src/ui/warroom/components/NewsTicker.ts` | 175 | Historical + dynamic event display |
| `src/ui/warroom/components/NewspaperModal.ts` | 192 | Dynamic content from headline templates, faction mastheads |
| `src/ui/warroom/components/MagazineModal.ts` | 305 | Monthly aggregation from real game state |
| `src/ui/warroom/components/ReportsModal.ts` | 287 | Per-municipality intelligence, typewriter format |
| `src/ui/warroom/components/FactionOverviewPanel.ts` | 561 | Phase 0 capital/investment/coverage section |
| `src/ui/warroom/components/WallCalendar.ts` | 81 | Phase 0 visuals, war countdown |
| `src/ui/warroom/ClickableRegionManager.ts` | 382 | Turn advance wiring, declaration event checks, directive integration |
| `src/ui/warroom/warroom.ts` | 291 | Phase 0 mock state, escalation vignette |

---

## 5. Determinism compliance

- All new code uses `strictCompare` for sorted iteration
- Bot AI uses seeded deterministic RNG from `state.meta.seed`
- No `Math.random()` or `Date.now()` in any pipeline-reachable code
- Feature flags default OFF — existing Phase II behavior unchanged with flags off
- `npm run canon:check` passes

---

## 6. Canon references

- Phase 0 Specification v0.4.0 §4.1 (capital), §4.2 (investment types), §5 (turn sequence)
- Engine Invariants §11.3 (deterministic iteration), §16.A (authority caps), §16.D (embargo), §16.K (Phase 0 → Phase I handoff)
- Systems Manual v0.5.0 §2.1 (legitimacy), §7 (combat/equipment), §13 (recruitment)
- Phase II Specification v0.5.0 §5 (pipeline), §12 (battle resolution)

---

## 7. Deferred work

| Item | Reason |
|------|--------|
| Phase 4: Visual Setup (sprite loading, render pipeline, asset staging, faction customization) | Blocked on external asset delivery (clean background + desk sprites) |
| INVEST layer canvas overlay (org-pen heat map, investment icons on map, diagonal stripes for blocked municipalities) | Optional enhancement; panel-based UX is complete |
| Visual deterioration (progressive warroom damage) | Deferred to Polish phase per plan |
| Intra-side political fragmentation | Deferred to post-Phase O; narrative only |
| MCZs (Municipal Control Zones) | Deferred; report-only if needed |

---

## 8. Testing notes

- **Pre-existing failures (not from this work):** 2 tests in `phase_i_turn_structure.test.ts` fail because the `jna-ghost-degradation` pipeline step is not prefixed with `phase-i-`
- **Pre-existing build note:** Post-build asset staging fails (`Missing source file: assets/raw_sora/crest_hrhb_v1_sora.png`) — raw Sora asset files don't exist on disk. The Vite build itself succeeds.
- **Systems integration regression:** All feature flags default OFF. With flags OFF, Phase II scenario output is identical to pre-change baseline.
