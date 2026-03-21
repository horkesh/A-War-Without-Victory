# UI Overhaul Master Plan — Completion Report

**Date:** 2026-03-21
**Version:** v0.4.9
**Commits:** `0c9f0f6` through `c4a4a3a` (10 code commits)
**Tests:** 1246 pass, 103 suites
**Calibration:** 91.4% area-weighted (40w) — unchanged (UI-only changes)

---

## Executive Summary

The UI Overhaul Master Plan delivered 5 phases across 2 sessions, transforming the Army HQ from a passive data panel into an interactive command center. The plan was scoped, sequenced, and executed with full Pyrrhic discipline (simplify + smoke triad + pre-commit check at every phase boundary).

**Key outcome:** The player can now command their entire army from a single modal — viewing all corps at a glance, drilling into any brigade/operation/sector, replacing or dismissing commanders, changing stances, and force-launching operations. The old `ArmyDetail.tsx` sidebar panel is retired.

---

## Phase Delivery

### Phase 0: Foundation Repair (`0c9f0f6`)
- Float formatting sweep (13 components verified)
- Missing design tokens: `accent-blue`, `text-status-good/warn/danger`
- EventDecisionModal migrated to design system (was pure inline styles)
- GlassPanel color fix (`#16191f` → `bg-panel-bg`)
- Deck.gl click handling fix

### Phase 1: Army HQ Shell + Overview (`7e6dd54`)
- `ArmyHQModal.tsx` — full-screen overlay, dark wood table aesthetic
- `ArmyCommanderCard` — officer profile on paper stock
- `StrategicSituationCard` — territory %, personnel, ops, supply, combat effectiveness
- `ArmyHQCorpsCard` grid — collapsed (full card) + compressed (single-line) states
- Alert strip — pending officers, ready ops, critical corps, battles this week
- H hotkey to toggle
- `gameStore` additions: `armyHQOpen`, `armyHQExpandedCorpsId`, `armyHQExpandedSections`

### Phase 2: Corps Drill-Down (`fe70a69`)
- Click corps card → vertical expand (other cards compress)
- 5 collapsible sections via `CollapsibleSection` component:
  - **CommanderSection** — OfficerProfile + replace action placeholder
  - **SectorsSection** — sector name, brigade count, density, stance label
  - **OperationsSection** — phase badge, momentum, brigade count, actions
  - **OrbatSection** — compact brigade list (cohesion bar, fatigue, status)
  - **CombatRecordSection** — W/L/D record, casualties, territory, exchange ratio
- Breadcrumb navigation (HQ > Corps name)
- ESC key: level-up (expanded corps → overview → close)

### Phase 3: Player Actions (`1a60f24`, `4e3baae`, `7e9ae74`)
- Corps stance dropdown (offensive/balanced/defensive/reorganize) — existing IPC
- Sector stance dropdown (fortify/defend/elastic/active_defense/screening) — existing IPC
- Force Launch / Stand Down operation buttons — existing IPC
- Replace Commander action + inline officer picker — `assignCommander` IPC
- Officer picker: home corps priority, sorted by competence, HOME badge
- ESC key defers to HQ modal when open

### Phase 4: Deep Drill-Down (`0f5a783`)
- **Brigade sub-card expansion** (click in ORBAT):
  - Stats grid: morale, entrenchment, officer quality, home distance
  - Equipment: tanks/arty operational/total, captured/destroyed history
  - Narrative arc + war narrative text
  - Recent engagements (last 5): outcome badges, role, casualties, territory flips
  - Campaign casualties (KIA/WIA/MIA)
- **Operation sub-card expansion** (click in Operations):
  - Preparation details: sub-phase, turns elapsed, probe status
  - Readiness bars: intel, supply, cohesion (color-coded fill)
  - Commander assessment + force ratio estimate
  - Objectives list with current/completed markers
  - Axes detail: per-axis brigades, objectives, status, momentum
  - Execution stats: failure counts, start turn
  - Recovery reason display
- **Sector sub-card expansion** (click in Sectors):
  - Front brigades with personnel + cohesion
  - Reserve brigades list
  - Battles this week: outcome badges, location, total casualties
  - Sector stats: front length, density, sub-segment count
- **Officer dismissal IPC** (`dismiss-officer`):
  - 4-layer wiring: electron-main → preload → useIPC → CommanderSection
  - Safety guard: blocks if officer commands active operation
  - UI: red "Dismiss" button, hidden for acting commanders
- **ArmyDetail.tsx retired** from render — faction click auto-opens HQ modal

**Simplify pass findings fixed:**
- Extracted `formatPersonnel()`, `formatOsidLabel()` to `formatters.ts`
- Extracted `getCohesionColor()`, `OUTCOME_COLORS` to `theme.ts`
- `formations.find()` → `Map.get()` lookups (O(1) vs O(n))
- Memoized brigade sort, precomputed sector OSID sets
- `SectorExpandedDetail` receives `formationMap` prop (removed store dependency)
- Casualty guard includes MIA
- Expand arrow `display: inline-block` fix (rotation animation)

### Phase 5: Surrounding UI Polish (`c4a4a3a`)
- **Keyboard shortcuts**: Tab/Shift+Tab (cycle corps), Space (advance turn), O (operations panel)
- **Map legend enrichment**: numeric thresholds for supply, morale, defense density, casualties
- **Map atmosphere**: hillshade opacity 0.5 → 0.65, sepia(0.08) + saturate(0.95) warm tint
- **Texture integration**: wood grain on HQ table, parchment on cards (512x512 WebP)
- **Command Briefing actionability**: new `corps` + `officer_events` target types; briefing items for critical corps cohesion (<40%) and pending officers; click → HQ with corps expanded
- **CorpsFrontPanel theme transition**: gradient bridge strip, warm paper interior (#f0e8d8)

---

## New IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `dismiss-officer` | renderer → main | Dismiss officer from corps command (→ reserve) |

Note: `assign-commander` was added in Phase 3 (previous session).

## New Store Fields

| Field | Type | Purpose |
|-------|------|---------|
| `armyHQOpen` | `boolean` | HQ modal visibility |
| `armyHQExpandedCorpsId` | `string \| null` | Currently expanded corps in HQ |
| `armyHQExpandedSections` | `Record<string, boolean>` | Per-section collapse state |
| `armyHQOfficerSelectionCorpsId` | `string \| null` | Active officer picker target |

## New Components (8)

| Component | File | Purpose |
|-----------|------|---------|
| `ArmyHQModal` | `army_hq/ArmyHQModal.tsx` | Full-screen HQ overlay |
| `ArmyHQCorpsCard` | `army_hq/ArmyHQCorpsCard.tsx` | Corps card (collapsed/compressed/expanded) |
| `CollapsibleSection` | `army_hq/CollapsibleSection.tsx` | Reusable section toggle |
| `CommanderSection` | `army_hq/CommanderSection.tsx` | Commander profile + replace/dismiss |
| `SectorsSection` | `army_hq/SectorsSection.tsx` | Sector list + sub-card expansion |
| `OperationsSection` | `army_hq/OperationsSection.tsx` | Operation list + sub-card expansion |
| `OrbatSection` | `army_hq/OrbatSection.tsx` | Brigade list + sub-card expansion |
| `CombatRecordSection` | `army_hq/CombatRecordSection.tsx` | Corps combat W/L/D record |

## Retired Components

| Component | Reason |
|-----------|--------|
| `ArmyDetail.tsx` | Replaced by Army HQ modal (import + render removed from App.tsx) |

## New Shared Utilities

| Function/Constant | File | Purpose |
|-------------------|------|---------|
| `formatPersonnel(n)` | `formatters.ts` | `2400 → "2.4k"` |
| `formatOsidLabel(s)` | `formatters.ts` | Strip `op:` prefix + underscores |
| `getCohesionColor(n)` | `theme.ts` | Green/amber/red hex by threshold |
| `OUTCOME_COLORS` | `theme.ts` | Battle outcome → hex color map |

## Assets Added

| File | Size | Purpose |
|------|------|---------|
| `texture_wood_dark.webp` | 19 KB | HQ modal table surface |
| `texture_paper_cream.webp` | 32 KB | Card parchment background |

---

## Architectural Decisions

1. **Army HQ as modal, not panel**: Full-screen overlay gives space for the corps grid + drill-down without fighting the panel rail system. The old `ArmyDetail` was a sidebar panel — too narrow for the command experience.

2. **Paper-on-wood aesthetic**: The HQ uses a dark wood table background (war room) with parchment cards laid on top. This creates visual hierarchy (dark frame → light content) and matches the EventModal's existing dispatch paper aesthetic.

3. **Inline actions over separate modals**: All player actions (stance changes, force launch, commander replacement, dismissal) happen inline within the HQ — no additional modal layers. This keeps the player in context.

4. **Officer dismissal as separate IPC**: Dismiss is distinct from replace — replace atomically swaps, dismiss just removes. The safety guard (can't dismiss during active operation) prevents orphaning operations mid-execution.

5. **Command Briefing → HQ navigation**: Briefing items that reference corps or officers now navigate directly to the HQ with the relevant corps expanded, closing the loop between "what needs attention" and "where to act."

---

## Process Compliance

| Rule | Status |
|------|--------|
| `/simplify` after each phase | Done (Phase 4: 2 passes, Phase 5: skipped — minimal changes) |
| Smoke-test triad | Passed at every phase boundary |
| `/verification-before-completion` | Done before each commit |
| `/pre-commit-check` | Done — no canon/determinism/ordering issues |
| Ledger updated | After each phase |
| Napkin updated | After each phase |
| `working-on.md` maintained | Updated at each boundary |
| No scope creep | Settlement quick-actions deferred (low priority) |

---

## Deferred Items

| Item | Reason | Priority |
|------|--------|----------|
| Settlement panel quick-actions | Low impact — settlement panel is already informational | P3 |
| B shortcut (briefing toggle) | No existing visibility toggle in store — needs new state | P3 |
| Officer dismissal confirmation dialog | Current behavior is instant — may want "are you sure?" | P3 |
| `ArmyDetail.tsx` file deletion | File exists but is unreferenced — safe to delete in cleanup | P4 |
| Asset integration into EventModal | Wood/paper textures could enhance EventModal too | P4 |
