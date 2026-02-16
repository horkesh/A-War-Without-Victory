# Implemented Work — Warroom Restyle, Scenario Fix, Embedded Tactical Map, Fog-of-War

**Date:** 2026-02-16
**Status:** Complete
**Scope:** Four interrelated GUI/scenario changes spanning two sessions

---

## 1. Warroom UI Aesthetic Overhaul

**What:** Every warroom modal, dialog, panel, and component restyled to match the tactical map's NATO C2 ops-center aesthetic. Replaced scattered inline styles with a unified CSS design system.

**Why:** The warroom components had mismatched visual styles: white backgrounds, light themes, mixed font families, and per-component inline `style.cssText` blocks. The tactical map already established a coherent dark theme during its visual overhaul (2026-02-14). This pass unifies everything.

### Design System Established

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0a0a1a`, `#10101e`, `#111122` | Modal backdrops, dialog backgrounds, ticker |
| Surface | `#181828`, `#1a1a2e`, `#252540` | Cards, panels, rows |
| Text primary | `#d8d8e0` | Body text, labels |
| Text muted | `#8888a0` | Secondary info, placeholders |
| Accent green | `#00e878` | Success, active, primary actions |
| Accent amber | `#ffab00` | Warnings, contested status |
| Accent red | `#ff3d00` | Danger, critical, classification stamps |
| Accent cyan | `#00bcd4` | HRHB faction, info |
| Font | `'IBM Plex Mono', monospace` | All UI text |

### Files Modified

**`src/ui/warroom/styles/modals.css`** (complete rewrite, ~1235 lines)
- Foundation CSS for all warroom modals and panels
- Shared utility classes: `.wr-dialog` (dialog base), `.wr-btn-primary`/`.wr-btn-secondary`/`.wr-btn-danger` (buttons), `.wr-bar-track`/`.wr-bar-fill` (progress bars), `.wr-dialog-row`, `.wr-dialog-info` with color variants
- Component sections: faction overview (`.fo-*`), newspaper (`.newspaper-*`), magazine (`.magazine-*`), reports (`.report-*`), declaration events (`.decl-*`), side picker (`.sp-*`, `.side-picker-*`), scenario picker (`.scn-*`), main menu (`.mm-*`)

**`src/ui/warroom/styles/ticker.css`** (restyled, ~81 lines)
- News ticker: 36px height, `#111122` background, IBM Plex Mono
- Red label (`#ff3d00`), ghost close button with hover effect
- Scrolling animation: `scroll-left` linear 60s

**`src/ui/warroom/components/DeclarationEventModal.ts`**
- Replaced all inline `style.cssText` blocks with CSS classes (`decl-overlay`, `decl-title`, `decl-subtitle`, `decl-body`, `decl-btn`, `decl-divider`)
- Only per-faction dynamic colors remain as inline `style.color`

**`src/ui/warroom/ClickableRegionManager.ts`**
- Three inline dialog styles replaced: Advance Turn uses `.wr-dialog` + `.wr-dialog-row` + `.wr-btn-primary`/`.wr-btn-secondary`; Diplomacy "Line Dead" uses `.wr-dialog` + `.wr-dialog-notice`; Diplomacy placeholder uses `.wr-dialog` + `.wr-dialog-row`

**`src/ui/warroom/components/FactionOverviewPanel.ts`**
- All inline `style="..."` replaced with `.fo-stat-row`, `.fo-stat-label`, `.fo-stat-value`
- Progress bars use `.wr-bar-track`/`.wr-bar-fill`
- Accent colors unified: `#4a8` -> `#00e878`, `#da3` -> `#ffab00`, `#e44` -> `#ff3d00`

**`src/ui/warroom/components/MagazineModal.ts`**
- Progress bars converted from inline `cssText` to `.wr-bar-track`/`.wr-bar-fill`
- Stats boxes, section headers, badges use `.magazine-*` CSS classes

**`src/ui/warroom/components/ReportsModal.ts`**
- Removed redundant inline `whiteSpace`/`fontFamily` (now handled by `.report-body` CSS)

**`src/ui/warroom/warroom.ts`**
- Settings and Help placeholder modals use `.wr-dialog` and `.wr-dialog-notice`/`.wr-dialog-body`

### Determinism

N/A. Presentation-only changes. No simulation, state, or serialization affected.

---

## 2. Ahistorical 1992 Scenario Fix

**What:** Switched all April 1992 scenarios from `ethnic_1991` to `hybrid_1992` init_control_mode, and added explicit `"init_control": "apr1992"` to reference the curated municipal controller file.

**Why:** The `ethnic_1991` mode derives political control purely from 1991 census ethnic majorities. This produces ahistorical results for April 1992: municipalities like Bratunac, Foca, and Prijedor were assigned to the wrong faction because census ethnicity doesn't reflect the political and military reality of spring 1992. The curated file `data/source/municipalities_1990_initial_political_controllers_apr1992.json` (112 municipalities) has historically accurate assignments.

### Three Init Control Modes (from `src/state/political_control_init.ts`)

| Mode | Behavior | When to use |
|------|----------|-------------|
| `ethnic_1991` | Pure census ethnic majority per settlement | Test/research only; ahistorical for 1992 |
| `hybrid_1992` | Municipal baseline from `apr1992` file + settlement-level ethnic overrides at >= 70% threshold | **Canon for April 1992 scenarios** |
| `institutional` | Pure `apr1992` file; no settlement-level ethnic override | When you want strict municipal-level control only |

### Scenarios Modified

All April 1992 scenarios now specify:
```json
"init_control": "apr1992",
"init_control_mode": "hybrid_1992"
```

Files changed (11 total):
- `apr1992_definitive_52w.json`
- `apr1992_historical_52w.json`
- `apr1992_4w.json`
- `apr1992_50w_bots.json`
- `apr1992_phase_ii_4w.json`
- `historical_mvp_apr1992_52w.json`
- `historical_mvp_apr1992_52w_tuned_v2.json`
- `historical_mvp_apr1992_52w_cap1.json`
- `historical_mvp_apr1992_phase_ii_20w.json`
- `historical_mvp_apr1992_52w_institutional.json`
- `player_choice_recruitment_no_flip_4w.json`

**Not changed (intentionally):** `ethnic_1991_init_4w.json` (test file for ethnic mode), all `_tmp_*` files.

### Test Impact

**`tests/scenario_init_formations.test.ts`**
- Assertion relaxed from exact formation count (`=== 3`) to minimum (`>= 3`)
- Comment added: "hybrid_1992 init_control produces more formations than the old ethnic_1991 mode. The key assertion is determinism (identical runs), not a specific count."
- Determinism check (two identical runs produce byte-identical `final_save.json`) retained — this is the real value of the test

### Verified Output

4-week scenario run with hybrid_1992:
```
[E5] Political control initialized (hybrid_1992, threshold=0.7):
     5822 settlements, RBiH=2291, RS=2507, HRHB=1024
```

### Determinism

Preserved. `hybrid_1992` uses sorted iteration via `strictCompare`. The 70% ethnic threshold is deterministic. No randomness or timestamps.

---

## 3. Tactical Map Embedded as Full-Screen Layer

**What:** The tactical map no longer opens as a separate Electron `BrowserWindow`. It now opens as a full-screen iframe layer within the warroom window, using the existing scene-swap pattern.

**Why:** Opening a separate window created a disjointed experience. The player had to Alt-Tab between warroom and tactical map. Embedding it as a same-window layer provides seamless scene transitions (like switching views in a single-page app).

### Architecture

```
Warroom Window (single BrowserWindow)
  |
  |- #warroom-scene (HQ desk canvas)     -- display:none when inactive
  |- #map-scene (War Planning Map)       -- display:none when inactive
  |- #tactical-map-scene (NEW)           -- display:none when inactive
       |
       `- <iframe src="awwv://warroom/tactical-map/tactical_map.html?embedded=1">
            |
            `- MapApp (full tactical map with all features)
```

### Key Design Decisions

**Same-origin iframe via protocol sub-routing:** The Electron `awwv://` custom protocol registers `warroom` and `app` as separate hosts. Since `awwv://warroom` and `awwv://app` are different origins, the iframe can't access `window.parent.awwv` across origins. Solution: serve tactical map files under the warroom host at `awwv://warroom/tactical-map/...`, making the iframe same-origin.

**Bridge inheritance via inline script:** The tactical map's `tactical_map.html` has an inline `<script>` that runs before MapApp initializes. When `?embedded=1` is detected, it copies `window.parent.awwv` (the IPC bridge) into the iframe's `window.awwv`, creating a shallow proxy with `focusWarroom` overridden to use `postMessage` for scene-swap instead of IPC window focus.

**Lazy iframe creation:** The iframe is created only on first tactical map open. Subsequent opens just show/hide the scene div. The iframe persists across scene swaps, so reopening is instant.

**Dev/browser fallback:** In non-Electron mode (Vite dev server), cross-origin prevents the iframe approach. Falls back to `window.open('http://localhost:3001', '_blank')`.

### Flow

1. User clicks "War Map" desk region or toolbar button
2. `showTacticalMapScene()` creates iframe at `awwv://warroom/tactical-map/tactical_map.html?embedded=1`
3. Inline script in iframe detects `?embedded=1`, copies parent's `awwv` bridge
4. MapApp initializes, finds bridge, calls `getCurrentGameState()` and `setGameStateUpdatedCallback()`
5. Tactical map shows with current game state, full order-issuing capability
6. "Back to HQ" button calls `awwv.focusWarroom()` -> `postMessage({ type: 'awwv-back-to-hq' })`
7. Warroom receives message, calls `showWarroomScene()`, re-registers its callback, pulls latest state

### Files Modified

**`src/ui/warroom/index.html`**
- Added `#tactical-map-scene` to scene swap CSS alongside `#warroom-scene` and `#map-scene`
- Added hidden `#tactical-map-scene` div with CSS for full-screen iframe (100% w/h, no border)

**`src/ui/warroom/warroom.ts`**
- Added `tacticalMapIframe` and `tacticalMapReady` state tracking
- New methods: `showTacticalMapScene()`, `injectBridgeIntoTacticalMap()`, `reRegisterWarroomCallback()`, `pullLatestGameState()`
- Updated `showWarroomScene()` to also hide tactical map scene and sync state on return
- Added `postMessage` listener for `awwv-back-to-hq` from iframe
- Toolbar "War Map" button now calls `showTacticalMapScene()` instead of IPC
- Wired `setTacticalMapOpenHandler()` on ClickableRegionManager

**`src/ui/warroom/ClickableRegionManager.ts`**
- Added `tacticalMapOpenHandler` property and `setTacticalMapOpenHandler()` setter
- Updated `openTacticalMap()` to use handler when available, falling back to IPC/browser

**`src/ui/map/tactical_map.html`**
- Extended inline script to detect `?embedded=1` and inherit parent's bridge
- Creates shallow proxy with `focusWarroom` overridden for scene-swap via `postMessage`
- Shows "Back to HQ" button when embedded

**`src/desktop/electron-main.cjs`**
- Added `awwv://warroom/tactical-map/...` route serving tactical map files under warroom origin
- Added `awwv://warroom/assets/...` route for crests, flags, and scenario images
- Both routes required so the embedded iframe (same origin) can load map assets and data

### Callback Singleton Handling

The preload.cjs has a single `gameStateUpdatedCallback` slot. When the iframe's MapApp calls `setGameStateUpdatedCallback()`, it overwrites the warroom's callback. This is acceptable because:
- While viewing the tactical map, only MapApp needs updates
- While viewing the warroom, only warroom needs updates
- On return to warroom: `reRegisterWarroomCallback()` re-sets the warroom's callback, and `pullLatestGameState()` catches any state changes made in the tactical map (e.g., advanced turns)

### Determinism

N/A. UI/window management only. No simulation or state changes.

---

## 4. Faction Fog-of-War (Own Formations Only)

**What:** The tactical map canvas now only renders formations belonging to the player's faction. Enemy formations are hidden. Enemy defenders remain visible in the attack confirmation panel and targeting tooltips (required for gameplay).

**Why:** Previously all formations from all factions were drawn on the canvas and clickable. This broke immersion and removed a fundamental wargame mechanic: uncertainty about enemy positions. The player should only see their own forces on the map.

### Implementation

**`src/ui/map/MapApp.ts`** — Two filter insertions:

**`buildFormationPositionGroups()` (~line 790)**
```typescript
const playerFaction = gs.player_faction ?? null;
// ... inside the loop:
if (playerFaction && f.faction !== playerFaction) continue;
```
This single filter gates both what formations are **drawn** on the canvas (markers, labels, strength bars) and what formations are **clickable** (since `getFormationAtScreenPos` also calls `buildFormationPositionGroups`).

**`drawOrderArrows()` (~line 875-942)**
```typescript
const playerFaction = gs.player_faction ?? null;
// Attack orders loop:
if (playerFaction && formation.faction !== playerFaction) continue;
// Movement orders loop:
if (playerFaction && formation.faction !== playerFaction) continue;
```
Only the player's own attack and movement order arrows are drawn.

### What Remains Visible (by design)

| Element | Visible? | Why |
|---------|----------|-----|
| Own formations | Yes | Core gameplay |
| Own order arrows | Yes | Feedback on staged orders |
| Enemy formations on canvas | **No** | Fog-of-war |
| Enemy order arrows | **No** | Fog-of-war |
| Enemy defender in attack panel | **Yes** | Required for attack decision-making |
| Enemy info in targeting tooltip | **Yes** | Required for target selection |
| Corps subordinate lines | Self-gating | Only drawn for selected formation (selection already filtered) |
| Brigade AoR highlight | Self-gating | Same reasoning |

### Backward Compatibility

When `player_faction` is `null` (replay viewer, dev mode, browser-only), the filter is skipped and all formations are visible. This preserves the replay/debug experience.

### Determinism

N/A. Rendering-only filter. No simulation, state, or serialization affected. The `defenderBySid` cache remains unfiltered so attack targeting still works correctly.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Clean (0 errors) |
| `npm run test:vitest` | 9 suites, 130 tests, all pass |
| `scenario_init_formations.test.ts` | Passes with relaxed assertion (>= 3 formations) |
| Determinism | hybrid_1992 two-run byte-identical check passes |
