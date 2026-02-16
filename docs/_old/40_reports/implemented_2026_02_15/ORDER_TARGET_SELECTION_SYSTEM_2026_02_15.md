# Order Target Selection System

**Date:** 2026-02-15
**Type:** Feature — UX overhaul
**Scope:** Full targeting mode for attack/move orders: visual overlay, tactical tooltips, attack confirmation, Escape cancel, cursor feedback, panel header
**Prereq:** Orders pipeline and posture UX (same date)

---

## 1. Problem Statement

The order staging pipeline worked (orders reached the engine and executed), but the target selection UX was bare-bones:

- Click Attack → click any settlement → done. One misclick stages the wrong order.
- No visual differentiation — the map looked identical during target selection.
- No tactical context — the player couldn't see which faction controlled a settlement, who defended it, or what NATO class it was.
- No way to cancel except clicking empty space (undiscoverable).
- No confirmation step, despite attack orders being settlement-specific with significant combat implications.

**Why it matters:** Attack orders are resolved per-settlement. The exact SID determines terrain modifiers (river crossing, slope, urban +0.25/+0.40 Sarajevo), urban casualty multipliers (1.5×/2.0×), which brigade defends, and front hardening. Move orders, by contrast, are municipality-level — clicking any settlement in the municipality is equivalent.

---

## 2. Changes Implemented

All changes in `src/ui/map/MapApp.ts` (pure UI — no engine, state, or type changes).

### 2.1 Targeting Mode State

Expanded `pendingOrderMode` from three string fields to a structured object carrying the full `FormationView` reference and an optional `candidateTargetSid` for the attack confirmation step.

Added supporting caches:
- `defenderBySid: Map<string, FormationView>` — reverse lookup from `brigadeAorByFormationId`, rebuilt on game state load. O(1) defender lookup during hover.
- `munToSidsCache: Map<string, string[]>` — lazily built municipality→SID list for move-targeting municipality highlight.

### 2.2 Escape to Cancel

Escape now cancels targeting as the first priority in the key handler — before search, before selection dismiss, before zoom reset. A `cancelPendingOrder()` method centralizes cleanup.

### 2.3 Cursor Feedback

During targeting mode:
- Over a settlement: `crosshair` (attack) or `cell` (move)
- Over empty space: `not-allowed`

Normal cursor logic (`pointer`/`grab`/`default`) is bypassed while `pendingOrderMode` is active.

### 2.4 Canvas Targeting Overlay

New `drawTargetingOverlay(rc)` method inserted into the render pipeline between AoR highlight (step 5b) and selection highlight (step 6).

**Attack mode:**
- Dims all settlements controlled by the ordering brigade's own faction (35% black overlay) so enemy-held territory pops visually.
- Pulsing red border on hovered target (sine-wave, matching `#ff4444` attack arrow color).
- When a candidate target is set (confirmation step), that settlement gets a dashed red outline even when hovering elsewhere.

**Move mode:**
- Highlights all settlements in the hovered municipality with faction-colored fill at 12% alpha.
- Pulsing faction-colored border on hovered target.

Animation driven by a `requestAnimationFrame` loop (started on entering targeting mode, stopped on exit), matching the existing AoR breathing glow pattern.

### 2.5 Enriched Targeting Tooltips

`showTooltip()` now supports multiline via `white-space: pre-line`.

**Attack targeting tooltip:**
```
TARGET: Sarajevo Centar
URBAN_CENTER — RBiH controlled
Defender: BR-RBiH-001 (defend)
```

**Move targeting tooltip:**
```
MOVE TO: Sarajevo
```

### 2.6 Panel Targeting Header

Instead of closing the panel when entering targeting mode, a compact targeting header is shown:
- Brigade name + faction flag
- Subtitle: "Selecting ATTACK target…" / "Selecting MOVE target…"
- "Select target settlement/municipality" label
- "Cancel (Esc)" button

Extracted `showFormationPanelHeader()` helper to share panel header setup with the confirmation panel.

### 2.7 Attack Confirmation Flow

Two-step confirmation for attack orders:

1. First click on a target settlement → sets `candidateTargetSid`, shows confirmation panel with target details (settlement name, NATO class, controller, defending brigade + posture), draws preview attack arrow (dashed red, dimmer than committed arrows).
2. Confirm via: clicking the same settlement again, or clicking "Confirm Attack" button. Cancel via: "Cancel" button or Escape.
3. Re-clicking a different settlement updates the candidate and re-renders the confirmation panel.

**Move orders remain single-click** — no confirmation needed since municipality-level targeting is low-stakes.

### 2.8 Preview Arrow

`drawOrderArrows()` now draws a dashed red preview arrow from the formation to the candidate target settlement during attack confirmation. Uses `setLineDash([6, 4])` and reduced opacity (`rgba(255, 68, 68, 0.7)`) to distinguish from committed solid arrows.

---

## 3. Refactors Applied

Post-implementation refactor pass:

1. **Removed redundant fields** from `pendingOrderMode`: `brigadeId`, `brigadeName`, `brigadeFaction` were copies of `formation.id`, `.name`, `.faction`. All access now goes through `mode.formation.*`.
2. **Extracted `exitTargetingMode()`**: Shared teardown sequence (null state, stop animation, close panel, re-render) was duplicated in three places. `cancelPendingOrder()` adds `clearStatusBar()` on top.
3. **Extracted `showFormationPanelHeader()`**: Panel header setup (open panel, set name/subtitle/flag, clear tabs) was duplicated between `enterOrderSelectionMode` and `showAttackConfirmation`.

Earlier refactors from the orders pipeline session:
4. **Removed dead imports** from `desktop_sim.ts`: `accrueRecruitmentResources` and `runPhaseIITurn`.
5. **Removed redundant local types** from `GameStateAdapter.ts`: local `AttackOrderView` and `MoveOrderView` replaced with canonical imports from `types.ts`.
6. **Consolidated brigade panel AoR/coverage** sections into a single compact "AoR" line: `32/42 settlements covered · 10 overextended · urban fortress`.

---

## 4. Architecture

```
Brigade Panel
  ├── [Attack] button → enterOrderSelectionMode('attack', formation)
  └── [Move] button   → enterOrderSelectionMode('move', formation)
        │
        ▼
  Targeting Mode Active
  ├── pendingOrderMode = { type, formation, candidateTargetSid? }
  ├── Render: drawTargetingOverlay() — dim/highlight + pulse
  ├── Tooltip: enriched tactical info (attack) or municipality (move)
  ├── Cursor: crosshair / cell / not-allowed
  ├── Panel: targeting header + Cancel button
  │
  ├── [Click settlement — MOVE] → IPC stageMoveOrder → exitTargetingMode()
  │
  ├── [Click settlement — ATTACK, no candidate] → set candidateTargetSid
  │     ├── Panel: confirmation (target details + Confirm/Cancel)
  │     ├── Render: preview dashed arrow
  │     └── [Click same again OR Confirm button] → IPC stageAttackOrder → exitTargetingMode()
  │
  ├── [Click different settlement — ATTACK, has candidate] → update candidate, re-render
  ├── [Click empty space] → cancelPendingOrder()
  └── [Escape] → cancelPendingOrder()
```

---

## 5. Files Modified

| File | Changes |
|------|---------|
| `src/ui/map/MapApp.ts` | Targeting mode state, cancel/exit methods, Escape handler, cursor override, enriched tooltips, `drawTargetingOverlay()`, preview arrow, panel header helper, attack confirmation flow, defender/municipality caches, targeting animation loop, multiline tooltip, consolidated AoR panel section |
| `src/ui/map/data/GameStateAdapter.ts` | Import canonical `AttackOrderView`/`MovementOrderView` from types (refactor) |
| `src/desktop/desktop_sim.ts` | Remove dead imports (refactor) |

---

## 6. Verification

- `npx tsc --noEmit` — clean
- `npm run canon:check` — determinism scan clean + baseline regression match
- No engine changes — pure UI rendering and interaction in MapApp.ts
