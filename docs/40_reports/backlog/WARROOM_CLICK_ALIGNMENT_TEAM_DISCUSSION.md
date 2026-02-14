# Warroom Click Alignment — Orchestrator Team Discussion

**Date:** 2026-02-07  
**Convened by:** Orchestrator  
**Issue:** User cannot click on some warroom items, or items are misaligned (clicks don't match where visuals appear).  
**Question:** Should we move from baked-in props to sprites or other approaches?

---

## 1. Problem Statement

The warroom uses:
- **Single background image** (`hq_background_mvp.png`) with desk props (phone, newspaper, magazine, reports, radio) **baked in**
- **Clickable regions map** (`hq_clickable_regions.json`) — rectangular bounds for each interactive element, defined for `image_dimensions: 2048×1152`
- **Canvas** 1920×1080; regions are scaled proportionally
- **Dynamic overlays:** crest (sprite), map, calendar — rendered at scaled region bounds

**Observed:** Some items don't respond to clicks, or the click hotspot is misaligned with the visual.

---

## 2. Root Cause Hypotheses (Team Input)

| Role | Hypothesis |
|------|------------|
| **Technical Architect** | **Dimension/composition drift:** The regions JSON was created for one version of the background (or spec dimensions 2048×1152). If the actual background image has different native size or was regenerated (Sora) with different composition, regions no longer match. Scaling assumes background and regions share the same coordinate space. |
| **UI/UX Developer** | **Baked vs overlay mismatch:** Crest works because it's a sprite — we render it at the same bounds we use for hit-testing. Desk props are baked; we have no control over where they appear. Any change to the background breaks alignment. |
| **Product Manager** | **Asset lifecycle:** Baked-in approach is fragile. Every Sora regeneration or Photoshop edit risks misalignment. A sprite-based approach decouples hit targets from background art. |
| **Build Engineer** | **Staging/version mismatch:** `hq_background_mvp.png` may be sourced from different paths (assets/raw_sora vs src/ui/warroom/public). If build and dev use different images, regions won't match. |

---

## 3. Current Architecture Summary

| Element | Type | Rendered | Hit-test |
|---------|------|----------|----------|
| Crest | Sprite overlay | Rendered at `national_crest` bounds | Same bounds |
| Map | Dynamic render | Rendered at `wall_map` bounds | Same bounds |
| Calendar | Dynamic render | Rendered at `wall_calendar` bounds | Same bounds |
| Phone, newspaper, magazine, reports, radio | Baked in background | Part of bg image | Regions JSON (must match baked positions) |

**Crest, map, calendar** — alignment is inherent (we draw and hit-test the same rects).  
**Desk props** — alignment depends on regions JSON matching the baked image exactly.

---

## 4. Proposed Solutions

### Option A: Fix Regions JSON Only (Minimal)

- Re-measure or regenerate `hq_clickable_regions.json` against the **current** `hq_background_mvp.png`.
- Use a region-mapper tool (see CLICKABLE_REGIONS_SPECIFICATION.md §4.2) or manual Photoshop measurement.
- **Pros:** No asset or render changes; fast.  
- **Cons:** Breaks again if background is ever regenerated or cropped. No structural fix.

### Option B: Clean Background + Desk Prop Sprites

- **New asset:** "Clean" background image — same HQ scene but **without** phone, newspaper, magazine, reports, radio. Just wall, desk surface, map frame, calendar frame.
- **New assets:** Individual sprites for phone, newspaper, magazine, report stack, radio.
- **Render order:** Background → sprites at known positions.
- **Regions:** Regions JSON bounds = sprite render bounds. Perfect alignment by construction.
- **Pros:** Alignment guaranteed; can add hover states, swap sprites (e.g. phone ringing); background can change without breaking clicks.  
- **Cons:** Requires new asset pipeline (Sora/Photoshop for clean bg + isolated props); more render logic.

### Option C: Hybrid — Sprites for Problem Props Only

- Keep current background if most props align.
- Replace **only** the misaligned props with sprites drawn on top (partially covering the baked version).
- Regions = sprite bounds.
- **Pros:** Smaller change; can iterate per-prop.  
- **Cons:** Possible visual doubling if sprite doesn't exactly cover baked version; partial solution.

### Option D: DOM Overlay Instead of Canvas Hit-Testing

- Render the warroom as a layered scene: background (img or canvas), then **HTML elements** (div/button) positioned absolutely over each interactive area.
- Use CSS `position: absolute` and percent or pixel coordinates.
- **Pros:** Native hit-testing; accessibility (focus, keyboard); no JSON regions.  
- **Cons:** Architectural change; current warroom is canvas-centric; map/calendar are canvas-rendered and would need DOM overlay or pointer-events passthrough.

---

## 5. Team Recommendations

| Role | Recommendation |
|------|----------------|
| **Orchestrator** | Short-term: Option A (fix regions) to unblock. Medium-term: Option B (clean bg + sprites) for robustness. Document as preferred direction. |
| **Product Manager** | Option B aligns with asset lifecycle and future states (desperation, faction-specific props). Scope as "Warroom Asset Refresh" — clean background + isolated props. |
| **Technical Architect** | Option B is structurally sound. Region bounds and sprite render bounds can share a single config (e.g. regions JSON extended with `sprite_src` for overlay elements). Option D is viable but larger refactor. |
| **UI/UX Developer** | Option B gives us hover/active states and accessibility (sprites can be `<button>` or have ARIA if we move to DOM overlay later). Prefer sprite approach over baking. |
| **Build Engineer** | Ensure single source of truth for background image; avoid duplicate paths. If Option B: add sprite assets to manifest and staging. |

---

## 6. Asset Implications (Option B)

**New assets needed:**
- `hq_background_clean.png` — HQ without desk props (wall, desk surface, map frame, calendar frame, empty prop spots or subtle shadows).
- `sprite_phone.png` — Phone, transparent background.
- `sprite_newspaper.png` — Newspaper.
- `sprite_magazine.png` — Magazine.
- `sprite_reports.png` — Report stack.
- `sprite_radio.png` — Transistor radio.

**Regions JSON:**  
Extend schema for sprite overlays — add `sprite_src` (optional). For sprite regions, bounds = both hit area and render area. Same pattern as crest.

**Render logic:**  
1. Draw clean background.  
2. For each region with `sprite_src`, draw sprite at `bounds`.  
3. Hit-test unchanged (already uses bounds).

---

## 7. Open Points

1. **Image dimensions:** Confirm native size of `hq_background_mvp.png`. If not 2048×1152, regions must be authored for actual dimensions, or we standardize on a canonical size.
2. **Canvas vs display size:** If the canvas is scaled by CSS (e.g. `max-width: 100%`), click coordinates may need adjustment. Verify `getBoundingClientRect` and coordinate transform.
3. **Region order:** If regions overlap, first match wins. Ensure map region doesn't occlude desk props (or vice versa) if z-order matters.

---

## 8. Next Steps (Orchestrator)

1. **Immediate:** Run Option A — re-measure regions against current background; verify `image_dimensions` match actual image; add a region-mapper run or doc to reproduce.
2. **Plan:** Add "Warroom Asset Refresh (clean bg + sprites)" to backlog; assign to Product Manager for scoping and asset pipeline (Sora/Photoshop).
3. **Document:** Add to preferences: "Warroom click alignment — prefer sprite overlays for interactive props over baked-in; regions JSON must match image_dimensions of actual background."
4. **Verify:** After any fix, test each region (crest, map, calendar, phone, newspaper, magazine, reports, radio) for click and hover.

---

*This document captures the Paradox team discussion. Implementation decisions remain with Product Manager and Technical Architect.*
