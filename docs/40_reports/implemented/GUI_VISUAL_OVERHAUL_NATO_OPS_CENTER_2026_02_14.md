# GUI Visual Overhaul — NATO Ops Center Aesthetic

**Date:** 2026-02-14
**Status:** Implemented
**Scope:** Tactical Map visual identity transformation

---

## Summary

Transformed the Tactical Map viewer from a warm beige/paper aesthetic to a dark navy 1990s NATO C2 ops center look with phosphor-green accents and CRT terminal styling. The overhaul touched every visual layer — color palette, typography, canvas rendering, UI chrome, and interactive elements — while preserving all existing functionality.

---

## Motivation

The original Tactical Map used an aged-paper, light-background palette that did not match the intended visual identity described in `docs/20_engineering/GUI_DESIGN_BLUEPRINT.md`: a dark, moody warroom feel evoking 1990s NATO command centers, CIA situation rooms, and phosphor-green CRT terminals.

---

## Artifacts Created / Modified

### New Document
| File | Description |
|------|-------------|
| `docs/20_engineering/GUI_DESIGN_BLUEPRINT.md` | Comprehensive 23-section GUI design blueprint covering all gameplay screens, interactions, and visual identity. Includes appendices for data binding, NATO APP-6 symbols, and ASCII wireframes. |

### Modified Files

| File | Changes |
|------|---------|
| `src/map/nato_tokens.ts` | Canonical color palette rewritten: paper `#ebe1cd` → `#0d0d1a`, all faction colors retuned for dark-background contrast, roads/rivers dimmed, added `phosphorGreen`, `amber`, `signalRed`, `cyan`, `textPrimary`, `textMuted`, `panelBg`, `cardBg`, `border`, `hover` tokens. |
| `src/ui/map/constants.ts` | Faction fill alpha raised 0.55 → 0.65. Neutral fill darkened. Front line redesigned to two-pass (glow + dashed white). Added `SETTLEMENT_BORDER` constant with same-faction/diff-faction styling. Readiness colors updated to phosphor palette. Base layer colors subdued for dark canvas. Minimap 180×120 → 200×150. |
| `src/ui/map/styles/tactical-map.css` | Complete rewrite. IBM Plex Mono font. 18 CSS custom properties for dark navy theme. Toolbar: monospace uppercase buttons with green active glow. Panels: dark card backgrounds with green section headers and text-shadow glow. Map cursor: crosshair. CRT scanline overlay. Backdrop blur on modals. Custom dark scrollbars. Main menu card with glow border. |
| `src/ui/map/tactical_map.html` | Favicon updated (dark bg, green text). Added subtitle line in main menu. Minimap canvas dimensions updated. |
| `src/ui/map/MapApp.ts` | `drawSettlements()`: added inter-settlement border strokes. `drawFrontLines()`: two-pass rendering (amber glow layer + bright dashed main line), now visible at all zoom levels. `drawNatoFormationMarker()`: dark translucent bg with faction-colored border and drop shadow, phosphor-green posture badge. `drawLabels()`: IBM Plex Mono, dark halo on light text, brightness varies by settlement class. `drawOrderArrows()`: brighter attack arrows with shadow glow. `drawFlipFireOverlay()`: increased intensity for dark canvas. `drawMinimap()`: dark background. |

---

## Design Decisions

### Color Palette
- **Background:** Deep dark navy `#0a0a1a` / `#0d0d1a` — evokes unlit command bunker
- **Primary accent:** Phosphor green `#00e878` — CRT terminal glow
- **Warning:** Amber `#ffab00` — standard NATO caution
- **Alert:** Signal red `#ff3d00` — immediate threat
- **Interactive:** Cyan `#00bcd4` — links and hover states
- **Text:** Off-white `#e0e0e0` primary, muted gray `#7a7a8a` secondary

### Typography
- **Font:** IBM Plex Mono — monospaced, military terminal feel, excellent readability
- **Style:** UPPERCASE for toolbar/headers, normal case for body text
- **Sizes:** 11–13px base, tight letter-spacing for labels

### Faction Colors (retuned for dark bg)
| Faction | RGB | Role |
|---------|-----|------|
| RS (VRS) | `rgb(180, 50, 50)` | Deep crimson |
| RBiH (ARBiH) | `rgb(55, 140, 75)` | Forest green |
| HRHB (HVO) | `rgb(50, 110, 170)` | Steel blue |

### Front Lines
Two-pass rendering for maximum visibility on dark canvas:
1. **Glow pass:** Wider (`6px`), solid, `rgba(255, 200, 100, 0.25)` — warm amber halo
2. **Main pass:** Narrower (`2.5px`), dashed `[8, 4]`, `rgba(255, 255, 255, 0.85)` — bright white

### Settlement Borders
- Same-faction: `rgba(60, 60, 80, 0.3)` at `0.4px` — barely visible grid
- Different-faction: `rgba(255, 255, 255, 0.7)` at `2px` — bright boundary (reinforces front lines)

### CRT Effect
Optional scanline overlay via CSS `::after` pseudo-element — repeating green-tinted horizontal lines at 3px pitch, toggleable in Settings.

---

## Verification

- **TypeScript:** `npx tsc --noEmit --pretty` — clean, zero errors
- **Visual:** Inspected via browser at all three zoom levels (Strategic, Operational, Tactical)
- **Panels:** Settlement detail panel, OOB sidebar, ethnic majority view, legend — all confirmed working
- **Interactivity:** Hover tooltips, click-to-select, search overlay, layer toggles — all functional
- **Performance:** No regressions; canvas rendering remains smooth with ~5,800 settlement polygons

---

## Determinism

No simulation logic was touched. All changes are purely visual (CSS, canvas rendering, color constants). Determinism is unaffected.

---

## Screenshots Taken

Browser verification performed at:
- Strategic zoom — full country overview, front lines visible with amber glow
- Operational zoom — regional detail, formation markers with NATO styling
- Tactical zoom — settlement-level detail, labels readable with dark halos
- Settlement panel open — dark card styling, green section headers
- OOB sidebar — formation listings with faction-colored badges
- Ethnic 1991 view — census majority overlay with matching faction hues

---

## Known Remaining Work

Per the GUI Design Blueprint, the following screens are not yet implemented (map viewer only):
- Recruitment / Force Generation panel
- Brigade Order System (movement arrows, attack orders UI)
- Corps/Army Command dashboard
- Intelligence panel
- Supply overlay
- Diplomacy screen
- War Correspondent's Notebook
- Grease Pencil Layer
- Full War Summary dashboard

These are tracked in the blueprint and backlog for future implementation.
