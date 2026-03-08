# Warroom: Clean Room + One Separate Sprite (Alternative Pipeline)

**Date:** 2026-03-08  
**Type:** Asset-generation alternative — base room + composited sprite  
**Status:** Proposal / experiment  
**Use:** Generate a **clean warroom** (base plate) with nano banana, then generate **one separate sprite** (e.g. desk map) to composite at runtime. Reduces generator load (fewer baked-in details) and allows swapping the sprite by phase/faction.

**Reference:** [WARROOM_MASTER.md](../WARROOM_MASTER.md), [20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md).

---

## 1. Pipeline overview

| Step | What | How |
|------|------|-----|
| **1** | **Clean warroom** | One (or one per faction) base image: room + furniture + **empty/reserved zones** for map and calendar. No map on desk (or empty map frame), no papers on the map, minimal baked-in text. |
| **2** | **One separate sprite** | One image asset (e.g. **desk map** — BiH geography only) generated separately. Dimensions and alignment defined so the engine can composite it onto the desk in the clean room. |
| **Runtime** | Composite | Engine draws: `clean_warroom` + sprite(s). Calendar (and optionally flag) remain engine-drawn overlays. |

**Why:** Nano banana can follow up on a previous image. Generating a **clean** room first (fewer details to get wrong) then a **single sprite** (e.g. just the map) in a second pass keeps the hardest elements (map extent, no entity lines, no documents on map) in one small asset. The room stays stable; only the sprite may change by phase/faction.

---

## 2. Clean warroom — what to generate

- **One base plate** at **2752 × 1536** (same as current scene plate).
- **Room + furniture:** Desk, lamp, telephone (intact), radio, chair, filing cabinet, wall with cork/notice boards. Gritty, photorealistic, 1992 period.
- **Reserved zones (empty or neutral):**
  - **Desk map zone:** A clear **empty** area on the desk (e.g. green leather inlay, or an empty map frame with no map inside). Nothing on top of this zone — no papers, no folders. So the **sprite** (the map) can be composited here later.
  - **Calendar zone:** Flat, frontal notice board or frame (no calendar painted). Engine overlays calendar as today.
  - **Optional:** Flag zone as empty pole/frame so engine can overlay faction flag; or paint one neutral/minimal flag and accept one base for all.
- **Minimal or no baked-in content:** No newspaper stack, or a folded stack with no readable text. No dossiers with text. No map on the desk. Optionally: ashtray, lamp, phone, radio only. Goal is a **clean** plate so the generator does not mess up map extent, entity lines, documents-on-map, or mangled phone.
- **Upper-right wall:** No readable text (per existing rule).
- **Language:** Any rare text (e.g. on lamp or equipment) in Bosnian or illegible.

**Prompt angle:** "Generate a 1992 command room. Desk with a large **empty** central area (green leather or empty map frame) where a map will be placed later — nothing on this area. Telephone, radio, lamp, ashtray on the desk. Wall with empty cork board and empty notice board for calendar. No papers on the desk map zone. Photorealistic, gritty, 2752×1536."

---

## 3. One separate sprite — what to generate

- **Suggested sprite:** The **desk map** (BiH geography only, no entity lines, no external coastlines). This is the asset that causes the most generator drift (regional map, entity lines, documents on top).
- **Dimensions:** Decide based on where the map zone sits in the clean room. Example: if the map zone is roughly the center 60% of the desk width and 40% of the desk height, the sprite might be **~1200×600** or similar, with transparency or a mask so it fits the desk perspective. Exact dimensions and corner positions should be documented after the clean room is approved (measure the empty zone in the image).
- **Content:** Only the map — BiH (or RS) geography, strictly internal, no Croatia/Serbia/Montenegro, no front lines, no pins. Place names in Bosnian if any. Staff-map feel.
- **Format:** PNG with transparency (or opaque rectangle). Same aspect as the map zone in the clean room so the engine can scale and place it.
- **Variants:** One sprite per faction (RBiH/RS/HRHB) and/or one per phase (prewar = lighter, war = same geography) if needed; or one neutral map and use it for all.

**Prompt angle:** "Generate a single topographic map of Bosnia and Herzegovina only. The map frame ends at the border of BiH; no Croatia, Serbia, Montenegro, or external coastlines. Geography only: rivers, relief, coastline within BiH. No front lines, sector boundaries, or markers. Place names in Bosnian. Staff map style. Output dimensions [W×H]. No desk, no room — only the map graphic."

---

## 4. Nano banana workflow

1. **Initial prompt:** Generate the **clean warroom** from scratch (one prompt per faction, or one neutral room). Output 2752×1536. No map on desk; empty map zone; calendar zone empty; no text in upper right.
2. **Optional follow-up:** If the first pass has minor issues (e.g. phone slightly odd), use the clean-room image as reference and ask for a follow-up: "Same room, but ensure the telephone is clearly intact and the central desk area is completely empty."
3. **Separate generation:** Generate the **desk map sprite** in a **new** prompt (no reference image). Just the map graphic at the chosen dimensions. Export as PNG.
4. **Document placement:** In the clean room image, note the pixel coordinates or proportional position of the map zone (e.g. "center of desk, from (x1,y1) to (x2,y2)") so the engine or a composite step can place the sprite correctly.

---

## 5. Runtime / implementation notes

- **Current engine:** WARROOM_MASTER says only **flag**, **calendar**, and **ticker** are separate runtime overlays; the rest is one scene plate. To use this pipeline we would:
  - Load **clean_warroom** as the base scene plate (or one per faction).
  - Load **desk_map_sprite** (or one per faction/phase) and draw it over the map zone at the documented position/size.
  - Keep existing calendar (and flag/ticker) overlay logic.
- **Hotspots:** Hotspot regions (newspaper_stack, telephone, etc.) are still defined on the **clean** plate; the sprite sits only in the map zone and does not change hotspot geometry.
- **Fallback:** If sprite compositing is not implemented yet, the clean warroom can still be used as a **static** scene (with no map, or with a placeholder) until the sprite path is in place.

---

## 6. Deliverables (this pipeline)

| # | Asset | Dimensions | How |
|---|--------|------------|-----|
| 1 | Clean warroom (base) | 2752×1536 | Initial prompt: room + empty map zone + empty calendar zone; no map on desk. |
| 2 | Desk map sprite | TBD (e.g. 1200×600) | Separate prompt: map of BiH only, geography only; no room. |
| (optional) | Clean warroom follow-up | 2752×1536 | Follow-up on #1 if refinements needed. |

After approval of the clean room, measure the map zone and fix sprite dimensions; then generate the sprite. Document placement (e.g. in `hq_clickable_regions.json` or a small config) for the engine.

---

## 7. Relation to existing pipelines

- **Unified room (6 plates):** Still valid — full prewar+war × RBiH/RS/HRHB with everything painted. Use when you want a single self-contained image per state.
- **Clean room + sprite:** Use when you want to isolate the hardest asset (map) and keep the room stable; engine composites map onto clean room. Fewer full-scene generations; easier to fix or swap only the map.

---

*For full prompt rules (map, language, flag, no text upper right, etc.) see [20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md).*
