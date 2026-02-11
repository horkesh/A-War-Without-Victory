# Warroom Option B — Clean Background + Desk Prop Sprites
## Single Handover Document

**Date:** 2026-02-07  
**Status:** Plan / Handover  
**Purpose:** Fix warroom click alignment by replacing baked-in desk props with sprite overlays. Asset generation can be handed to an external expert; code changes are scoped for internal implementation.

---

## 1. Summary

Replace the single baked HQ background (`hq_background_mvp.png`) with a clean background plus five desk prop sprites. Click regions will align with sprite bounds by construction. Asset generation can be handed to an external expert via the spec in §2; code and pipeline work are described in §3–§8.

---

## 2. External Expert Asset Deliverables

### 2.1 Deliverables Table

| Asset | Format | Dimensions | Purpose |
|-------|--------|------------|---------|
| `hq_background_clean.png` | PNG RGB | 2048×1152 | Base layer; HQ without desk props |
| `sprite_phone.png` | PNG RGBA (transparent bg) | TBD | Desk prop |
| `sprite_newspaper.png` | PNG RGBA | TBD | Desk prop |
| `sprite_magazine.png` | PNG RGBA | TBD | Desk prop |
| `sprite_reports.png` | PNG RGBA | TBD | Desk prop |
| `sprite_radio.png` | PNG RGBA | TBD | Desk prop |

### 2.2 Clean Background Prompt

Same HQ scene as current `hq_background_mvp.png`, but **without** phone, newspaper, magazine, report stack, or radio. Include:
- Wall (light grey concrete), map frame (empty), calendar frame (empty), crest plaque (empty)
- Desk surface (dark walnut, 1970s socialist-era)
- Empty prop spots or subtle shadows where props will be overlaid
- 2048×1152, 16:9, photorealistic 1990s Bosnian command HQ aesthetic

Reference: `docs/40_reports/IMPLEMENTATION_PLAN_GUI_MVP.md` §2.1 for full Sora/Photoshop prompt.

### 2.3 Sprite Prompts (Per Prop)

Each sprite: RGBA, transparent background, period-accurate (1990s Eastern European office).

- **Phone:** 1970s red rotary telephone, coiled cord visible
- **Newspaper:** Folded newspaper, blank masthead, aged newsprint (#ebe1cd)
- **Magazine:** Glossy vertical magazine, blank cover, blue-grey (#4a5a6a)
- **Reports:** 3–4 typewritten onionskin pages stacked, red CONFIDENTIAL stamp
- **Radio:** 1990s transistor radio, antenna extended

### 2.4 Coordinate Handoff

Expert may provide approximate pixel bounds (x, y, w, h) for each prop in 2048×1152 space so regions can be authored. Otherwise, bounds will be measured post-delivery via region-mapper tool.

### 2.5 Asset Placement

Place delivered files in `assets/raw_sora/`:
- `hq_background_clean.png`
- `sprite_phone.png`, `sprite_newspaper.png`, `sprite_magazine.png`, `sprite_reports.png`, `sprite_radio.png`

---

## 3. Regions JSON Schema Extension

Extend `hq_clickable_regions.json` schema v1.1:

- Add optional `sprite_src` to region objects.
- Desk prop regions: change `type` from `"baked_prop"` to `"sprite_overlay"` and add `sprite_src`.

**Example region:**
```json
{
  "id": "red_telephone",
  "type": "sprite_overlay",
  "bounds": {"x": 102, "y": 836, "width": 380, "height": 214},
  "sprite_src": "/assets/raw_sora/sprite_phone.png",
  "action": "open_diplomacy_panel",
  "hover_style": "red_outline",
  "cursor": "pointer",
  "tooltip": "Diplomacy (Phase II+)",
  "disabled": true,
  "layer": "desk"
}
```

Update `docs/40_reports/CLICKABLE_REGIONS_SPECIFICATION.md` with schema v1.1.

---

## 4. Warroom Render Pipeline

**File:** `src/ui/warroom/warroom.ts`

1. Change background import from `hq_background_mvp.png` to `hq_background_clean.png`.
2. Load sprites for regions with `sprite_src`; cache in `Map<regionId, HTMLImageElement>`.
3. Render order: (1) clean background, (2) desk prop sprites at scaled bounds, (3) crest, (4) map, (5) calendar.
4. Fallback: log warning if clean bg or sprites missing; optionally fail fast.

**RegionManager:** Add `getSpriteRegions(): Array<{region, bounds, sprite_src}>` so warroom can load and draw sprites.

---

## 5. ClickableRegionManager

**File:** `src/ui/warroom/ClickableRegionManager.ts`

- Parse `sprite_src` from regions.
- Add `getSpriteRegions()` returning regions that have `sprite_src` with scaled bounds.

---

## 6. Asset Paths and Staging

**Paths:**
- Clean background: `assets/raw_sora/hq_background_clean.png`
- Sprites: `assets/raw_sora/sprite_*.png` (5 files)

**File:** `tools/ui/warroom_stage_assets.ts` — Add clean background and 5 sprites to COPY_FILES. Stage only if files exist, or require them.

Sprites loaded at runtime from public path; `sprite_src` in regions JSON drives paths.

---

## 7. DeskInstruments

**File:** `src/ui/warroom/components/DeskInstruments.ts`

Keep as-is (no-op). Desk props are rendered by warroom from regions. Ensure it does not draw over sprites.

---

## 8. Regions JSON Authoring

After assets delivered:
- Run `tools/ui/region_mapper.html` with `hq_background_clean.png` to define bounds.
- Add `sprite_src` to each desk prop region.
- Keep `image_dimensions`: 2048×1152.

---

## 9. Testing and Ledger

1. Verify each region (crest, map, calendar, phone, newspaper, magazine, reports, radio) responds to click and hover.
2. Verify no visual regression.
3. Add PROJECT_LEDGER entry: "Warroom Asset Refresh: clean background + desk prop sprites (Option B)".

---

## 10. Dependencies and Order

| Phase | Depends on |
|-------|------------|
| Asset generation (§2) | None |
| Schema extension (§3) | None |
| RegionManager (§5) | Schema |
| Warroom render (§4) | Schema, RegionManager |
| Staging (§6) | Asset delivery |
| Regions authoring (§8) | Asset delivery |
| Testing (§9) | All |

**Parallel:** Asset generation and schema extension can start immediately. Staging and regions authoring need delivered assets.

---

## 11. References

- `docs/40_reports/WARROOM_CLICK_ALIGNMENT_TEAM_DISCUSSION.md` — Problem and Option B rationale
- `docs/40_reports/IMPLEMENTATION_PLAN_GUI_MVP.md` — HQ aesthetic, Sora prompts
- `docs/40_reports/CLICKABLE_REGIONS_SPECIFICATION.md` — Regions schema
- `.agent/napkin.md` — Visual preferences (read at session start)
