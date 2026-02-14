# GUI Polish Pass and Refactor — Implementation Report

**Date:** 2026-02-14
**Type:** Feature implementation + refactor pass
**Scope:** Tactical map UI (browser + desktop)

---

## 1. Objective

The tactical map GUI had grown organically through multiple implementation sprints (Phases 1–3, blueprint pass, recruitment UI, side picker). While functionally complete, it needed a polish pass to feel like a finished product. Specific pain points addressed:

1. Confusing settlement panel tab names
2. Strategic view showing too many formations
3. Missing corps-level interaction
4. Non-functional action buttons (SET POSTURE, MOVE, ATTACK)
5. Vestigial overlay stubs
6. No zoom-to-selection behavior
7. Strategic zoom rendering too much detail

---

## 2. Changes Implemented

### 2.1 Rename Confusing Settlement Panel Tabs

- `OVER` → `OVERVIEW`, `CTRL` → `CONTROL`, `INTEL` → `MILITARY`, `AAR` → `HISTORY`
- Section headers updated to match new tab labels

### 2.2 Strategic View: Corps Only

- Added `ZOOM_FORMATION_FILTER` constant: strategic zoom (level 0) shows only `corps` and `corps_asset` formation kinds
- `corps_asset` (the actual formation kind in save files) uses NATO XX symbol (two crossing lines)
- Hit test (`getFormationAtScreenPos`) respects zoom filter — at strategic zoom, only corps markers are clickable

### 2.3 Corps Detail Panel

- `openBrigadePanel()` refactored: dispatches to `renderCorpsPanel()` for corps/corps_asset, `renderBrigadePanel()` for all other kinds
- Corps panel sections:
  - **CORPS COMMAND:** stance, exhaustion, command span, status, creation turn
  - **STRENGTH:** subordinate count, total personnel
  - **OPERATIONAL GROUPS:** OG slots, active OGs with names
  - **ORDER OF BATTLE:** clickable subordinate formation rows
- Brigade panel now shows parent corps as clickable link
- Section header changed from "BRIGADE" to "FORMATION" for generality

### 2.4 Wire Up SET POSTURE, MOVE, ATTACK

- **Posture dropdown** with 5 options: defend, probe, attack, elastic_defense, consolidation — current posture pre-selected
- **MOVE/ATTACK** enter target-selection mode (`pendingOrderMode` state):
  - Closes panel, shows status message prompting map click
  - Next map click resolves the order and logs to status bar
  - Click handler intercepts pending order mode before normal settlement/formation selection

### 2.5 Zoom to Selected Settlement/Formation

- `zoomIn()` now pans to centroid of selected settlement or formation (via HQ settlement or municipality centroid)
- Works with both settlement and formation selections

### 2.6 Strategic Zoom: Watercolor Effect

- Small settlements (non-URBAN_CENTER, non-TOWN) rendered at 0.45 alpha at strategic zoom
- Settlement borders skipped for small settlements at strategic zoom
- Large settlements keep full opacity — creates a clean watercolor wash effect

### 2.7 Prune Legacy Overlays

- **SETTINGS modal:** stub checkboxes removed → "Settings coming soon."
- **HELP modal:** title "Help", descriptive intro paragraph, "KEYBOARD SHORTCUTS" subsection with +/-, Home/F, S, etc.
- **Main menu (browser mode):** "New Campaign" → "Load Scenario" when no desktop API; "Continue" button dimmed when no state loaded, re-enabled after state load

### 2.8 Fix Dataset Dropdown

- `applyGameStateFromJson()` now passes `datasetEl` to `applyLoadedGameState()` so the dataset dropdown always updates when game state is loaded externally

### 2.9 Fix AAR/Summary 0 Events Message

- When `recentControlEvents` is empty and turn > 0, shows helpful message: "Control events are recorded during turn execution. Load a replay to see the full history."

### 2.10 Main Menu Browser Mode

- "New Campaign" relabeled to "Load Scenario" when no desktop API
- Continue button dimmed (opacity 0.4, not-allowed cursor) when no state loaded; re-enabled after load

---

## 3. Refactor Pass

After the feature implementation, a dedicated refactor pass was applied:

### 3.1 Panel Readiness Color Deduplication

- **Before:** 4 identical nested ternary expressions computing Material Design readiness colors inline
- **After:** Added `PANEL_READINESS_COLORS` constant (private) and `panelReadinessColor(readiness)` helper in `constants.ts`; all 4 call sites now use the helper
- Note: Separate from `READINESS_COLORS` (phosphor palette for canvas markers)

### 3.2 Panel Open Helper

- **Before:** `openSettlementPanel` and `openBrigadePanel` duplicated 5 lines of panel-open + faction-color setup
- **After:** Extracted `showPanel(factionColor): HTMLElement | null` — handles class manipulation, aria-hidden, border color, CSS variable

### 3.3 Order Selection Mode Helper

- **Before:** Move and attack button handlers duplicated state assignment, status message, and panel close
- **After:** Extracted `enterOrderSelectionMode(type, brigadeId, brigadeName)` — single method with parameterized message

### 3.4 Dead Code Analysis

- Scanned for unused imports, dead methods, debug statements, redundant type casts
- **Result:** No significant dead code found; two `console.error()` calls for fetch failures are legitimate error logging

---

## 4. Implementation Findings

### `corps_asset` not `corps`

The actual formation kind in save files is `corps_asset`, not `corps`. Both are now handled in `ZOOM_FORMATION_FILTER`, `FORMATION_KIND_SHAPES`, `GameStateAdapter`, and panel detection. The codebase accepts both values.

### `corps_command` empty in test save

The 52-week final save has an empty `corps_command` record and no `corps_id` on brigades. The UI gracefully shows "—" for missing data and "No subordinate formations". When saves with populated corps_command exist, the panel will show full data.

### Hit test needed zoom filter

Without filtering `getFormationAtScreenPos` by zoom level, clicking at strategic zoom would select invisible brigade formations instead of visible corps markers. Fixed by adding `zoomFilter` check.

---

## 5. Files Modified

| File | Changes |
|------|---------|
| `src/ui/map/MapApp.ts` | Tab renames, corps panel, brigade panel refactor, posture/move/attack wiring, zoom-to-selection, watercolor effect, order arrows fix, browser mode menu, showPanel/enterOrderSelectionMode/panelReadinessColor helpers |
| `src/ui/map/types.ts` | Added corps fields to `FormationView`: `corps_id`, `corpsStance`, `corpsExhaustion`, `subordinateIds`, `corpsOgSlots`, `corpsActiveOgIds`, `corpsCommandSpan` |
| `src/ui/map/data/GameStateAdapter.ts` | Extract `corps_command` data, OG slots, subordinate lists for `corps` and `corps_asset` kinds; extract `corps_id` from each formation |
| `src/ui/map/constants.ts` | Added `corps`/`corps_asset` to `FORMATION_KIND_SHAPES` with `'xx'` shape; `ZOOM_FORMATION_FILTER`; `PANEL_READINESS_COLORS` and `panelReadinessColor()` |
| `src/ui/map/tactical_map.html` | Pruned SETTINGS/HELP modals, updated keyboard shortcuts |

---

## 6. Verification

- `npm run typecheck` — clean
- `npm run test:vitest` — 8 suites, 119 tests, all pass
- Browser visual verification (Vite dev server on port 3001) — all features working
- Vite HMR confirmed all changes hot-reload correctly

---

## 7. Determinism

No simulation logic changed. All UI-only changes. Formation data extraction uses sorted iteration and sorted arrays throughout (`subordinateIds`, `corpsActiveOgIds`). No timestamps or randomness introduced.
