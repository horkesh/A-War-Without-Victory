# Army HQ Nerve Center — Roadmap

**Date:** 2026-03-22
**Status:** Active
**Owner:** Orchestrator
**Parent plan:** `docs/plans/2026-03-20-ui-overhaul-master-plan.md`
**Design spec:** `docs/plans/2026-03-21-army-hq-nerve-center-v2.md`

---

## Context

The UI Overhaul Master Plan defines 5 phases for the Army HQ modal. The Nerve Center v2 design adds intelligence synthesis layers — Threat Assessment, Force Readiness, Supply Intelligence, Chief of Staff briefings, and a Staff Situation Map. This roadmap integrates both into a single phased delivery sequence.

The principle: the player must first **see** (intelligence panels), then **act** (player actions), then **refine** (AI briefing, visual polish). Intelligence without action is a dashboard. Action without intelligence is guesswork.

---

## Phase Summary

| Phase | Name | Sessions | Status |
|-------|------|----------|--------|
| 0 | Foundation Repair | 1 | ✅ Complete |
| 1 | HQ Shell + Overview | 2 | ✅ Complete |
| 2 | Corps Drill-Down | 2 | ✅ Complete |
| 2.5 | Intelligence Panels | 1 | ✅ Complete (2026-03-22) |
| 3 | Player Actions | 2 | ✅ Complete (2026-03-22) |
| 3.5 | Intelligence Polish + CoS | 1 | ✅ Partial (2026-03-22) — CoS, layout, nav done; deltas + dispatches remaining |
| 4 | Tab Restructure + Modal Absorption | 2 | **Next** — absorb WarSummary, AAR, OpsHistory, Recruitment |
| 5 | Deep Drill-Down + Polish | 1-2 | Queued |
| 6 | Staff Map + Surrounding Polish | 1-2 | Queued |

**Total remaining: 4-6 sessions.**

---

## Phase 0: Foundation Repair ✅

Float formatting sweep, missing design tokens (`accent-blue`, status colors), EventDecisionModal migration, GlassPanel color fix.

**Done gate:** Zero raw floats visible. All panels use design system.

---

## Phase 1: HQ Shell + Overview ✅

Modal opens via faction click or H key. Army commander + strategic situation + all corps cards visible. Alert strip shows pending actions.

**Deliverables:** gameStore fields, ArmyHQModal shell, ArmyCommanderCard, StrategicSituationCard, ArmyHQCorpsCard grid, alert strip, H hotkey.

---

## Phase 2: Corps Drill-Down ✅

Click corps card → FlipCard 3D animation. Full detail: Commander, Sectors, Operations, ORBAT, Combat Record. Breadcrumb navigation.

**Deliverables:** FlipCard.tsx, CommanderSection, SectorsSection, OperationsSection, OrbatSection, CombatRecordSection. Green terminal palette fully replaced with warroom aesthetic.

---

## Phase 2.5: Intelligence Panels ✅ (2026-03-22)

Three new panels synthesize engine data the player otherwise has to piece together from 5 corps, 30 sectors, and 125 brigades.

### Delivered

**Adapter:**
- `SectorIntelRecordView` type (11 fields) exposed on `LoadedGameState`
- Single-pass derivation (merged fogOfWar + sectorIntel loop)

**Threat Assessment** (`ThreatAssessment.tsx`):
- ACTIVE THREATS — enemy `offensive_signs` from sector intel + enemy operations in execution/staging
- HARDENED POSITIONS — stalled enemy operations (≥3 consecutive failures)
- INTELLIGENCE GAPS — sectors with avg confidence < 30%
- Pre-indexed via `formationById` Map and `enemyCorpsToFriendlyCorps` Map

**Force Readiness** (`ForceReadiness.tsx`):
- Per-corps grade: COMBAT READY / ADEQUATE / STRAINED / DEGRADED / INEFFECTIVE
- Computed from: ineffective brigade %, avg fatigue, avg cohesion, disrupted count
- Recommendation per corps (REORGANIZE / REINFORCE / HOLD / reduce tempo)

**Supply Intelligence** (`SupplyIntelligence.tsx`):
- Supply breakdown (maintenance drain, patron aid, net per turn) from canonical `supply_reserve_constants.ts`
- Enclave resilience bars (color-coded green/amber/red)
- Supply runway projection ("Depletion ~12 turns")
- Mobilization summary (exhausted municipalities, manpower pool)

**Corps Card Enhancements:**
- Readiness grade drives left border color (emerald → red)
- ⚠ INCOMING threat badge from sector intel offensive_signs
- Health stripe: dual-segment bar (cohesion + fatigue)
- Pre-indexed lookups (readinessByCorpsId Map, activeThreatsById Set)

**Bug Fixes:**
- Math.round() on all equipment values, resilience, combat effectiveness
- Date fallback via existing `turnToDateString()` utility
- Stance badges: OFF / DEF / BAL / REORG

---

## Phase 3: Player Actions — ✅ Complete (2026-03-22)

All 7 deliverables implemented:
- Replace corps commander (InlineOfficerPicker in CommanderSection)
- Change corps stance (dropdown on corps card back face)
- Change sector stance (dropdown per sector in SectorsSection)
- Force launch operation (button in OperationsSection)
- Stand down operation (button in OperationsSection)
- Quick stance sweep (EMERGENCY POSTURE dropdown in HQ header)
- Officer dismissal (DISMISS button in CommanderSection)

---

## Phase 3.5: Intelligence Polish + CoS — ✅ Partial (2026-03-22)

### Completed
- **Chief of Staff Briefing** — paper missive from named deputy (Divjak/Milovanović/Petković). Template-based personality-driven text. Two paragraphs: last-turn events (battles, territory) + current situation assessment. Cream paper aesthetic matching OperationBriefingModal.
- **Strategic Position** — 6 dimension bars with full names, event_modifier indicators, color-coded fills.
- **Situation Briefing** — grid of compact rounded cards with specific navigation targets (→ SECTOR, → OP, → CORPS).
- **Layout redesign** — 4-column top (Commander | CoS Brief | Crest | Strategic Position), rounded corners, tighter padding.

### Remaining
- Strategic Situation Dashboard with deltas (▲/▼ per stat)
- Dispatches & Field Reports (war dispatches, battle narratives, corps dialogues)
- Enclave Dashboard link from SupplyIntelligence panel

---

## Phase 4: Tab Restructure + Modal Absorption

**Goal:** Army HQ becomes a multi-tab military command center. Absorb orphaned modals that lost entry points when TopToolbar was replaced by PresidentialToolbar.

**Spatial metaphor:** The warroom is the President's Office (political decisions). Army HQ is the Command Center down the hall (military reports and orders). See master roadmap "The Two Rooms" section.

### Tab Structure

| Tab | Content | Source |
|-----|---------|--------|
| **BRIEFING** | CoS brief, situation briefing cards, corps cards (flip detail) | Current HQ content |
| **SUMMARY** | Weekly war summary: territory changes, casualties, combat overview, faction comparison | Absorb `WarSummaryModal` |
| **RECORDS** | After-action reports, operation history, combat log | Absorb `AARPanel`, `OperationHistoryPanel` |
| **PERSONNEL** | Recruitment, officer roster, reserves, ORBAT overview | Absorb `RecruitmentModal`, `OrbatPanel`, `ArmyReservePanel` |

### Implementation

1. **Add tab bar** to ArmyHQModal header (BRIEFING | SUMMARY | RECORDS | PERSONNEL)
2. **Active tab state** in gameStore (persists across opens)
3. **BRIEFING tab** — current content, no changes needed
4. **SUMMARY tab** — render `WarSummaryModal` content inline (not as separate modal). Refactor: extract WarSummary content component from its modal wrapper.
5. **RECORDS tab** — render AAR + OperationHistory inline. Same extraction pattern.
6. **PERSONNEL tab** — render recruitment + ORBAT + reserves inline.
7. **Keyboard shortcut** `S` → open Army HQ on SUMMARY tab (interim access until tabs built)
8. **Remove modal wrappers** for absorbed panels (they become tab content, not standalone modals)

### Done gate
Player can reach War Summary, AAR, Operation History, Recruitment, and ORBAT from within Army HQ without any toolbar button. No orphaned military modals remain.

### Not absorbed (political — stays for warroom v0.7+)
- `EventLogPanel` — history of political decisions
- `EconomyPanel` — political economy
- `DiplomacyOverview` — diplomatic relationships
- `AiSettingsPanel` — meta config (pause menu)

**Interim keyboard shortcuts** until v0.7+: `E` → Event Log

---

## Phase 5: Deep Drill-Down + Polish

**Goal:** Full depth available without leaving HQ. Retire legacy panels.

**Deliverables:**

| Feature | Notes |
|---------|-------|
| Brigade sub-card expansion | Stats, engagement history, equipment, narrative arc |
| Operation sub-card expansion | Axes, objectives, per-brigade status within op |
| Sector sub-card expansion | Brigade positions, recent battles, intel confidence |
| ArmyDetail.tsx retirement | All functionality migrated to Army HQ modal |
| Asset integration | Wood/paper textures where appropriate |
| Operation readiness composite | Green/amber/red at-a-glance indicator on op cards |

---

## Phase 6: Staff Situation Map + Surrounding Polish

**Goal:** Everything around the HQ matches its quality. Staff Map fills the dead space.

**Deliverables:**

### Staff Situation Map (canvas 2D)
- Territory shading from `controlBySettlement` (30% opacity faction colors)
- Corps boundary lines (dashed amber, labeled)
- Front line (thick white)
- Operation arrows (gold = ours, red = enemy)
- Threat zones (pulsing red overlay where `offensive_signs: true`)
- Enclave markers (circled icons, supply-state color)
- ~350px tall, full width, below corps cards
- Interactive: hover corps zone → highlight card, click op arrow → detail, click enclave → tooltip
- Pure `<canvas>` 2D — no MapLibre dependency

### Surrounding Polish
- CorpsFrontPanel interior theme (Option A: paper with dark bridge header)
- Settlement panel quick-action buttons (Dig In / Attack Adjacent)
- Map legend enrichment (numeric scale labels, faction highlight)
- Keyboard shortcut system (1-5 for corps, Tab to cycle)

---

## Post-Phase Discipline (Every Phase)

1. `/simplify` review (code reuse, quality, efficiency)
2. Smoke-test triad: `tsc --noEmit` + `vitest run` + `desktop:map:build`
3. `/verification-before-completion`
4. `/pre-commit-check` (canon, determinism, tests, ledger, life lessons)
5. Commit with descriptive message
6. Documentation: PROJECT_LEDGER + napkin + working-on.md
7. Canon propagation (if applicable)

---

## Future Vision (Not Scoped)

These items are designed in the spec but not scheduled:

- **Conversational CoS:** "Ask the Chief" — player asks questions, CoS responds with full situation context and personality. Uses `player_advisor.ts` pattern.
- **Command autonomy slider:** Player sets how much the CoS acts on their behalf. See `memory/player_identity_and_command.md`.
- **Loss of control indicators:** Visual representation of faction cohesion decay, collapse risk, and political exhaustion as cracks in the warroom aesthetic.

---

## Key Architecture Decisions

1. **All intelligence panels are pure functions.** `generateThreatAssessment()`, `generateForceReadiness()`, `computeSupplyBreakdown()` read `LoadedGameState` and return structured data. No IPC, no side effects, no engine dependency.

2. **Adapter is the chokepoint.** New data (sector intel) flows through `GameStateAdapter.ts` → `LoadedGameState` → UI components. Never read raw game state in components.

3. **Pre-indexed lookups.** Formation lookups use `Map<id, formation>` (O(1)) instead of `.find()` (O(n)). Corps readiness and threat data pre-indexed as Map/Set in the modal's `useMemo`.

4. **Supply constants imported from canonical source.** `MAINTENANCE_DRAIN_PER_FORMATION`, `HEAVY_MAINTENANCE_PER_WEAPON`, `PATRON_AID_SCALE` come from `supply_reserve_constants.ts` — never duplicated in UI.

5. **CoS briefing is display-only.** Haiku text is never stored in GameState. Cached per turn in React state. Fallback to structured data if API unavailable.

6. **Staff Map is canvas, not MapLibre.** Avoids the symbol rendering bug, avoids second MapLibre context, and keeps the HQ modal self-contained.
