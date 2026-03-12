# Warroom External Master Handover (AWWV)

**Date:** 2026-03-11  
**Audience:** external UI/UX + asset-generation expert (handoff)  
**Scope:** warroom scene plates, clickable hotspots, modal inventory, image-generation prompt contracts, overlay alignment, and where the code/assets live.  

This document is designed to be **self-contained**. It consolidates the current living references:
- `docs/40_reports/WARROOM_MASTER.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md`
- `docs/40_reports/handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md`

---

## 1. Product intent (what the warroom is)

- The warroom is a **fixed scene plate** (a single background image) used as the **command hub**.
- Interaction is via **physical, outlineable objects** in the room (desk map, telephone, newspaper stack, etc.).
- Clicking those objects opens **modals** (briefings, diplomacy, press, etc.).
- The plate must be **documentary-photograph realism** (archival press interior), not concept art.

---

## 2. Core runtime contracts (non-negotiable)

### 2.1 Image size

- **Authoring / region JSON**: **2752 × 1536** (landscape). All region coordinates and asset generation use this.
- **Runtime (game)**: **1376 × 768** display resolution to avoid performance issues — smaller decode, less canvas memory (~4×). The game loads `*_display.png` assets at half resolution; region hit-test scales from 2752×1536 automatically.

### 2.2 Peace vs war

- Warroom is **two systems**: **peace (prewar)** and **war**, with phase-gated modal mapping and different plates.
- The current art direction expands war visuals into **yearly states** while keeping geometry stable:
  - `prewar`, `year1`, `year2`, `year3`, `year4` × 3 factions.

### 2.3 Overlay surfaces (projection)

- **Cork board on wall** is a **map placeholder only**; runtime projects the tactical map into that quad.
- **Date / next-turn board** is a flat wall board reserved for runtime overlay.
- **Flag is baked into the room art** (no runtime flag sprite).

### 2.4 Geometry must stay stable

- If the room art changes, clickable regions and overlay alignment must be re-measured and the region JSON updated.

---

## 3. Interaction anchors (hotspots)

### 3.1 Canonical anchor IDs (12-anchor contract)

The room art must include **twelve distinct physical anchors** with clean silhouettes. Items 1–8 are implemented; 9–12 are prompt-ready for planned modals.

| Anchor ID | Room object to draw (plate) | Modal / behavior |
|---|---|---|
| `wall_flag_area` | Faction flag on vertical pole, fully visible | Faction Overview |
| `wall_calendar_area` | Date / next-turn board, blank, flat, fully in frame | Advance turn (date overlay) |
| `desk_map` | Large cork board on wall, placeholder only, empty | Tactical map projection |
| `command_briefing_folio` | Binder stack, command folio | Command Briefing, Reports |
| `newspaper_stack` | Faction newspaper stack (masthead visible, text illegible) | Newspaper modal |
| `intelligence_journal` | Journal, magazine distinct from newspaper | Magazine modal |
| `diplomatic_telephone` | One telephone | Diplomacy; IVP entry points |
| `desk_radio` | One radio | News ticker |
| `commander_coatrack` | Coatrack with faction army uniform jacket + faction-specific cap; visible army insignia | Commander Register (planned) |
| `enclave_dispatch_folder` | One urgent-tagged folder with red tag | Enclave Crisis (planned) |
| `intelligence_packet` | Sealed envelope stack, report packet | Turn-End Intelligence (planned) |
| `honors_memorial` | Shelf corner with citation booklet and ribbon bar; no framed photos; no candle | Honors and Memorials (planned) |

### 3.2 Implementation note (where hotspots come from)

- Click/hover geometry is loaded from region JSON (see §6).
- Hotspot routing depends on `meta.phase` (peace vs war), and in some cases on war-only gating.

---

## 4. Modals (implemented today)

From `docs/40_reports/WARROOM_MASTER.md` (updated 2026-03-10):

- **Faction Overview** (flag)
- **Advance turn** (date board)
- **Tactical map** (cork board projection surface)
- **Newspaper** (newspaper stack)
- **Magazine** (journal)
- **Reports** (command folio)
- **Command Briefing** (command folio)
- **Operational Situation** (desk map / cork board anchor)
- **Diplomacy** (telephone)
- **Diplomatic Press Briefing (IVP breakdown)** (war-only entry, opened from Diplomacy footer and from Command Briefing)
- **Radio / ticker** (radio)
- **Settings**, **Help**
- Peace-only flow includes **“Line dead”** for telephone (no diplomacy in peace).

---

## 5. Modals (planned / prompt-ready)

These are planned and should already be **baked as physical anchors** in the scene plates (no follow-up sprite pass):

- **Commander Register** (`commander_coatrack`)
- **Enclave Crisis** (`enclave_dispatch_folder`)
- **Turn-End Intelligence Packet** (`intelligence_packet`)
- **Honors and Memorials** (`honors_memorial`)

---

## 6. Clickable region data (JSON)

### 6.1 Default file

- Default regions: `public/data/ui/hq_clickable_regions.json` (build staging copies from repo `data/ui/`).
- Region options support: `options.calendar_baked_in_art: true` (skip drawing a duplicate runtime calendar when the plate includes it).

### 6.2 Faction region files (preferred)

- `hq_rbih_clickable_regions.json`
- `hq_rs_clickable_regions.json`
- `hq_hrhb_clickable_regions.json`

Runtime behavior: at init it may use an override; once state loads it prefers the matching faction file, falling back to default if missing.

### 6.3 Regions script (all 12 modals)

A single script defines the **canonical 12-anchor contract** and supports listing, template generation, and validation:

- **Script:** `tools/ui/warroom_regions_all_modals.ts`
- **List anchors:** `npx tsx tools/ui/warroom_regions_all_modals.ts list`
- **Generate template:** `npx tsx tools/ui/warroom_regions_all_modals.ts generate [--out path]`  
  Writes a full region JSON with all 12 anchors and placeholder bounds; replace bounds/polygons in region_mapper or by hand.
- **Validate file(s):** `npx tsx tools/ui/warroom_regions_all_modals.ts validate <path> [path ...]`  
  Checks schema 2.1, dimensions 2752×1536, and that all 12 anchor IDs are present.

Use this script to ensure every modal has a region (e.g. before or after re-measuring with region_mapper).

### 6.4 Resizing oversized warroom assets

If new scene plates (e.g. `hq_rbih_*.png`) are too large in **dimensions** or **file size**:

- **Script:** `tools/ui/warroom_resize_assets.ts`
- **Run:** `npm run warroom:assets:resize` — resizes to **2752×1536** (fit + letterbox), re-encodes PNG, and **emits `*_display.png` at 1376×768** for game runtime (smaller load and canvas memory).
- **Dry run:** `npx tsx tools/ui/warroom_resize_assets.ts --dry-run`
- **Skip display output:** `npx tsx tools/ui/warroom_resize_assets.ts --no-display`
- **Specific files:** `npx tsx tools/ui/warroom_resize_assets.ts path/to/image.png`

Requires `sharp` (devDependency). The game uses `*_display.png` when available; region JSON stays 2752×1536. For maximum file-size reduction, consider external tools (e.g. pngquant, oxipng).

The authoritative prompt pack and constraints live in:
- `docs/40_reports/handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md`

Key invariants to preserve:

- **Strict head-on frontal camera** (no fisheye, no Dutch angle).
- **Tight framing** so the desk is in the immediate foreground (no wide empty foreground floor).
- **One primary command desk** (no second table; no extra foreground furniture).
- **Cork board** is a **placeholder only** (no detailed map baked).
- **Date board** is **blank** (no readable text).
- **All 12 anchors visible and unobstructed.**
- **No readable English** anywhere.
- **No people; no figures** (empty room).

### 7.1 Newspaper identity must be visible (while text remains illegible)

- RBiH: **Oslobođenje** must read as a **broadsheet newspaper stack** on the desk.
- RS: **Glas Srpske** masthead in Cyrillic (Глас Српске) with **gold decorations** is required.
- HRHB: faction paper must read as a newspaper stack (masthead visible; text illegible).

### 7.2 Coatrack identity must be explicit

Uniform and cap on the coatrack must be **faction army specific** and show **visible insignia**.

- **RBiH progression**:
  - **Prewar**: green beret + uniform jacket with **TO BiH (Teritorijalna odbrana BiH)** insignia.
  - **Year1–Year4**: green beret + uniform jacket with **Army of RBiH (ARBiH)** insignia.
- **RS**: **VRS** uniform jacket + **Serb traditional military cap** (Gemini interprets; e.g. šajkača) with **visible VRS insignia**.
- **HRHB**: **HVO** uniform jacket + **Croat traditional military cap** with **visible HVO insignia**.

### 7.3 Prompt precision rule

Copy-paste prompt text must avoid ambiguous branching language. Do not use **“or”** in the prompts.

---

## 8. Where the code lives (entrypoints)

### 8.1 Warroom UI

- `src/ui/warroom/warroom.ts` (warroom init, plate, IPC wiring, routing)
- `src/ui/warroom/ClickableRegionManager.ts` (region loading, hover/click resolution)
- `src/ui/warroom/components/*` (modal components)

### 8.2 Staging assets into builds

- `tools/ui/warroom_stage_assets.ts` (copies `data/ui/*.json` into build output)

---

## 9. What the external expert should evaluate

- **Plate usability as a UI substrate**: silhouettes, separation, consistent geometry.
- **Modal-to-object legibility**: each clickable object should read unambiguously (especially newspapers, coatrack, urgent folder, packet stack, honors shelf).
- **Overlay safety**: cork board and date board must be perfect flat rectangles; fully in frame.
- **Faction differentiation**: tone and symbolism must read without adding new clutter.
- **Determinism of the art workflow**: ensure prompts yield repeatable results; reject outputs that violate anchor separation.

---

## 10. Canonical “single source of truth” pointers

- **Warroom status + anchor mapping**: `docs/40_reports/WARROOM_MASTER.md`
- **Overall GUI status**: `docs/40_reports/GUI_MASTER.md`
- **Authoritative prompt pack**: `docs/40_reports/handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md`
- **Original “nano banana” brief** (historical context): `docs/40_reports/handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md`

