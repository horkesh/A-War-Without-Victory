# Warroom: Unified Room Direction + Military Feel

**Date:** 2026-03-08  
**Type:** Asset-generation guidance + military-feel reference  
**Status:** Updated to align with faction base rooms + overlays  
**Use:** One master room layout per faction; prewar/base and war follow-up share the same space. The prompt now generates the **room, props, and baked faction identity**, while the **desk map** and **date / next-turn board** are treated as overlay surfaces.

**Reference:** [WARROOM_MASTER.md](../WARROOM_MASTER.md), [20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md).

---

## 1. Core principle: same room, same anchors, overlays on information surfaces

- **One physical room per faction** — Same layout, same camera angle, same furniture positions, same anchor locations for **both** base/prewar and war **within each faction**.
- **Prewar vs war** — Only the **details and mood** change: paperwork density, wear, urgency, side clutter, and overall pressure. The room does not become a different space.
- **Desk map is no longer baked** — The central desk map area stays **empty and fully visible** so the engine can project the map overlay later.
- **Wall board is no longer a baked calendar** — The room should contain a **flat, frontal date / next-turn board** that reads as a real board in the room, but remains simple enough for runtime overlay.
- **Flag is baked** — The faction flag or banner should be integrated into the room art, because cloth, folds, angle, and lighting look better when generated as part of the scene.
- **Two-step workflow (nano banana follow-up):**  
  1. **First prompt (initial):** Generate the **base / prewar** room from scratch for each faction (RBiH, RS, HRHB).  
  2. **Second prompt (follow-up):** Using the **previous image as reference**, generate the **war** version by **keeping the exact same room** and changing only war wear, density, urgency, and supporting props. The generator must preserve layout, camera, furniture, and walls.
- **Implication:** For each faction you produce two images: base/prewar (initial) then war (follow-up on that same room). Faction variants (RBiH, RS, HRHB) still differ by symbolism and mood; within each faction, base and war share the **same geometry**.

---

## 2. What the prompt creates vs what the engine overlays

| In the image (prompt creates) | Runtime overlay / UI |
|--------------------------------|----------------------|
| Desk, telephone, radio, folder props, newspaper/magazine set dressing, lamps, faction flag, cork board, room wear, lighting, ambient paperwork | **Yes** — generated into the room |
| **Desk map** | **No** — leave an **empty framed / inset desk zone** |
| **Date / next-turn board** | **No** — leave a **flat, frontal wall board** for runtime overlay |
| Existing ticker / UI chrome | Engine/UI |

### Overlay surfaces

#### Desk map zone

- **Do not paint** a map into the room image.
- **Do** paint a **real physical zone** on the desk: framed leather inlay, inset panel, empty planning surface, or similar.
- **Do not** place papers, folders, or props on top of this zone.
- This zone must remain **fully visible** so the engine can project the desk map into it later.

#### Date / next-turn board

- **Do not paint** a finished calendar or dense written schedule into the image.
- **Do not** show a blank white rectangle, whiteboard, or bright placeholder square.
- **Paint** a real wall board / notice board / framed surface in the same material language as the room that is:
  - **Flat and frontal** — facing the camera.
  - **No strong perspective tilt** — so the engine overlay aligns.
  - **Readable as a date / next-turn board** — it should look like it belongs to command workflow.
  - **Simple enough for overlay** — lightly gridded, minimally marked, or mostly blank.
- The board is a real room object, but the current date / next-turn information is supplied by the engine.

---

## 3. Technical specification (all images)

| Property | Value |
|----------|--------|
| **Output dimensions** | **2752 × 1536** pixels (exact), landscape |
| **Aspect ratio** | 2752 : 1536 (≈ 1.792 : 1) |
| **Usage** | Fixed UI scene plate; full background for warroom canvas |
| **Pipeline** | Base room per faction, then follow-up war variant from the same room |
| **Runtime exception** | The **desk map** and **date / next-turn board** are overlay surfaces; reserve clean zones for them |

---

## 4. Shared negative prompt

Append to every generation:

```
Do not generate: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces that bury anchor silhouettes; overlapping piles crossing multiple modal regions; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas; blank white rectangles or whiteboards as placeholders; clean or stylized render; pristine surfaces; glossy or polished look; digital screens; LED or LCD displays; electronic ticker or digital readout (period is 1992); text in English or other non-local language; dossiers or folders neatly stacked in one pile (use informal spread-out arrangement); readable text in the upper-right wall area; post-1998 BiH flag or yellow triangle on blue; magazine or journal titled in English (e.g. Intelligence — use Bosnian title e.g. ODBRANA); documents or papers covering or obscuring the empty desk map zone (papers go beside the zone); telephone damaged mangled bent or distorted (phone must be intact and whole); finished generator-made calendar content that makes overlay impossible.
```

---

## 5. Symbolism (period-accurate, per-faction)

- **RBiH:** **1992–1998 RBiH flag only:** white field (or white central band) with a **blue shield** containing **six golden fleurs-de-lis** (lilies). Do **not** use the post-1998 BiH flag (yellow triangle on blue field). Do **not** use horizontal blue-white-blue tricolor with a different crest — the correct period flag has the blue shield with six golden fleurs-de-lis on white.
- **RS:** Wartime RS only (1992–1995) — e.g. Serbian tricolor, wartime RS insignia on documents, binders, stamps. Do **not** use post-Dayton/post-1995 Republika Srpska coat of arms.
- **RS desk map:** Must show **RS territory, Serb-held areas, or RS administrative/operational area only**. Do **not** show a map of the whole of Bosnia and Herzegovina.
- **HRHB:** Period-appropriate HRHB-era symbolism only.

---

## 5a. Art direction: photorealism and grime

- **Style:** **Photorealistic** — the image should read as a real photograph of a 1992 command room, not a clean 3D render or stylized illustration.
- **Grimy, worn feel:** Surfaces should show **visible use**: worn desk leather, scuffed wood, coffee stains, ashtray residue, creased and thumbed papers, dusty lamp shades, faded fabric. The room is in active use under pressure, not a showroom.
- **Avoid:** Clean render, stylized render, pristine surfaces, glossy or polished look, “perfect” office. Prefer **tactile, worn, atmospheric** realism.
- **Lighting:** Naturalistic — desk lamp, window light, shadows; not flat or studio-lit.

---

## 5b. Desk map zone rules (all variants)

- **Desk map zone is the single most important empty surface** — largest anchor, clearest and most visible. Nothing on the desk should compete with it for prominence.
- **The zone must stay fully visible** — Do **not** place documents, folders, or paper stacks **on top of** the desk map zone. Papers and dossiers go **beside** it or at the sides of the desk.
- **Do not bake the map into the room** — the actual map is now a separate overlay asset.
- **Design the desk zone to receive a staff map overlay** — it should read as a real planning surface: framed leather, inset board, empty map frame, or similar.
- **RBiH and HRHB overlay intent:** the projected desk map should show **only Bosnia and Herzegovina** — the territory of BiH only.
- **RS overlay intent:** the projected desk map should show **RS territory / Serb-held areas / RS administrative area only**, not the whole of BiH as one unified state.
- **Map overlay rule:** geography only — no front lines, no sector boundaries, no pins, no city markers, no entity lines.

**Common generator mistakes to avoid:** (1) **Filling the desk zone** — do not place papers, folders, or props on the central desk map zone. (2) **Neat stacks** — dossiers and folders should be **spread out** in an in-use arrangement, not neatly stacked in one pile. (3) **Upper-right text** — do not put a status board or bulletin with readable text in the upper-right wall area. (4) **Magazine in English** — magazine/journal title must be in Bosnian (e.g. ODBRANA), not "Intelligence" or other English. (5) **Wrong RBiH flag** — use 1992–1998 RBiH only: blue shield with six golden fleurs-de-lis on white; not post-1998 (no yellow triangle on blue). (6) **Mangled phone** — the telephone must be intact, whole, and clearly recognizable; not damaged, bent, or distorted.

---

## 5c. News ticker (period-appropriate, no digital)

- **Period is 1992.** There were **no** LCD/LED digital displays or electronic tickers in a typical Bosnian command room.
- **Do not** paint a digital screen, LED board, or electronic readout as the “news ticker.”
- **Do** paint a **period-appropriate** ticker or bulletin: e.g. **ticker-tape machine** (paper strip), **wall bulletin board** with pinned typed or handwritten strips, or **chalk/peg board** with short lines of text. The ticker is a **physical** object (paper, chalk, pins), not a digital display.

---

## 5d. Language: all text in Bosnian

- **All visible text** in the image must be in **Bosnian** (bosanski jezik): newspaper mastheads, stamps on documents, ticker or bulletin text, map labels or annotations, folder tabs, any signage or handwritten notes.
- **Do not** use English (or other languages) for in-scene text. Mastheads (e.g. OSLOBOĐENJE, GLAS SRPSKI, HRVATSKI VOJNIK) are already correct; any other text — rubber stamps (e.g. HITNO, POVJERLJIVO), ticker lines, map place names — should be in Bosnian.
- **Summary:** The room is a Bosnian command space; all written content in the image should read as Bosnian.

---

## 5e. Upper-right wall: no text

- **Upper-right wall area** must contain **no readable text**. No status board with text strips, no bulletin board with typed or handwritten lines, no labels or signage in that zone.
- Use that area for: **ticker-tape machine only** (paper strip can be illegible or blank), or an **empty cork/notice board**, or a **second empty frame**. Do **not** place the news ticker there if it would show readable text; if the ticker is in the upper right, its paper/strips must be **illegible or blank**.
- **Rationale:** Keeps the upper right as overlay-safe breathing room and avoids conflicting or redundant text with game UI.

---

## 6. Military feel: ideas and suggestions (war room only)

The war room should read clearly as an **operational command space**, not just an office with more papers. Below are concrete ways to add military feel without going cartoon, sci-fi, or melodramatic.

### 6.1 Desk map (war variant)

- **Geography only** — Same as prewar: coastline, rivers, relief, optional place names. Do **not** add sector boundaries, front line, unit markers, or entity lines to the map. The map stays a **geographic** base; military feel comes from papers, phone, radio, stamps, not from the map overlay.
- **Map treatment** — Acetate overlay, folded corners, creases from use. Optional light grid or coordinate marks for reference only. **Do not** add pushpins, flag pins, or markers at cities or locations — no tactical or political markers on the map.
- **Content hint** — Operational area as **geography**; not a decorative map. Any text on the map (place names, labels) in Bosnian.

### 6.2 Papers and reports (war variant)

- **Document types** — Situation reports (SITREP), casualty or strength summaries, operation orders, field reports, logistics requests, message traffic.
- **Stamps and markings** — Rubber stamps (“PRIORITY”, “EYES ONLY”, “APPROVED”), date/time stamps, classification or unit designations on file tabs.
- **Material** — Carbon copies, telex or facsimile printouts, typed sheets with handwritten marginal notes; more stacked and layered than prewar.
- **Avoid** — Clean, empty desk; single decorative folder. War = **density and urgency** of paperwork. **Do not** place papers or folders **on top of** the desk map — the map must stay fully visible; put papers beside the map.

### 6.3 Communications (war variant)

- **Telephone** — Field telephone or heavy-duty command phone; cable visible; not a sleek civilian model. **Must be intact and whole** — clearly recognizable, strong silhouette; not damaged, bent, or mangled.
- **Radio** — Military or institutional radio; frequency dial, antenna; distinct from the telephone so both are outlineable.
- **Message traffic** — Message pads with timestamps, cipher or code references (suggested, not literal classified content), incoming/outgoing trays.

### 6.4 Atmosphere and objects (war variant)

- **Lighting** — Slightly more utilitarian: strong desk lamp, one overhead or wall light; shadows that suggest long hours and night shifts.
- **Desk surface** — Ashtray (period-appropriate), coffee cup or mug, pen holder, stapler, hole punch; less “clean office”, more “24-hour ops”.
- **Optional military touch** — Map tube, binoculars case, helmet on a shelf or hook, webbing or field bag in corner; **avoid** weapons, ammo, or graphic battle photos. Keep it **command/administrative** military.
- **Wall** — Pinboard with orders, situation snapshots, or roster; small situation map fragment; unit or duty roster. Do not obscure the calendar zone or main anchors.

### 6.5 Faction-specific military tone

- **RBiH (war)** — Improvised, civilian-military mix; hand-typed or mimeographed reports; worn but dignified; sense of scarcity and adaptation.
- **RS (war)** — More formal hierarchy; stamped documents, clearer chain-of-command feel; colder, more institutional; map = RS/Serb-held area only.
- **HRHB (war)** — Compact regional HQ; mixed Croatian military paperwork; tidier than RBiH, less monolithic than RS; strong symbolic identity.

### 6.6 What to avoid (military feel)

- Theatrical villain aesthetics, modern bunker sci-fi, over-ornamentation.
- Combat gear or weapons on display (command room, not frontline).
- Chaotic rubble or destruction inside the room.
- Generic “military wallpaper” — prefer specific, period-plausible detail.

---

## 7. Master layout (same for base and war follow-up)

Use this layout for **every** variant (prewar RBiH/RS/HRHB, war RBiH/RS/HRHB). Only the **content and detail** of each anchor change.

| Anchor | Position | Notes |
|--------|----------|--------|
| **Desk map zone** | Center or lower-center, **largest and most prominent** anchor | Single most important surface. Leave it **empty and fully visible** so the runtime map can be projected into it. Use a framed leather inlay, inset surface, or empty map frame. No papers on top. |
| **Command briefing folio** | One clear side of desk | Thick folder, tabs/seals; prewar = prep brief, war = command briefing authority. |
| **Newspaper stack** | Opposite side of desk from folio | Clearly separate. **Text on baked-in papers:** see §7.1. |
| **Magazine / intelligence journal** | Separate from newspaper | Outlineable independently. **Title in Bosnian only** (e.g. ODBRANA, OBAVIJEŠTI) — do **not** use English titles such as "Intelligence". |
| **Telephone** | Strong side silhouette | Prewar: “line dead” feel optional. War: field/command phone. |
| **Radio** | Distinct from phone | Baked in; can be desk or wall. |
| **Faction dossier / archive binder** | Prominent, not competing with map | **Spread out in an informal, in-use arrangement** — folders and dossiers partially open or placed at different angles across the desk; not neatly stacked in a single pile. Desk should look actively used, with dossiers distributed rather than tidily stacked. |
| **Faction flag** | Upper wall, baked in | Any artistic angle; period symbolism. Bake it into the art. |
| **News ticker** | UI / baked ambience | Keep period-appropriate if shown physically, but do not let it compete with overlays. |
| **Wall zone for date / next-turn board** | Upper wall, flat and frontal | **Painted** notice board or framed surface (wood, cork, or dark fabric), uncluttered; engine overlays date / next-turn messaging. **No blank white rectangle or whiteboard.** |
| **Optional (war)** | If space allows | Typed report packet, emergency dispatch folder, citation/memorial ledger, personnel/officer dossier tray. |

**Overlay-safe:** Breathing room in upper-left wall, upper-right wall, center-back desk, lower-center desk, and at least one side for wider modals. No high-noise clutter in those zones. **Upper-right wall: no readable text** — no status board with text strips, no bulletins with typed text in that area (§5e).

### 7.1 Baked-in newspaper text (turn-after-turn)

The newspaper stack is **painted into the scene** and the same image is used **every turn**. The modal that opens on click shows dynamic, turn-specific content; the **visible papers in the image** must not contradict that.

**Rule:** Do **not** paint turn-specific headlines, dates, or lead stories on the baked-in newspapers. The image is static; the player will see it on every turn.

**Recommended approaches (pick one and state it in the prompt):**

| Approach | Prompt guidance | Use when |
|----------|-----------------|----------|
| **Masthead only** | Topmost visible paper shows only the **faction masthead** (e.g. OSLOBOĐENJE, GLAS SRPSKI, HRVATSKI VOJNIK). No headline, no date, or a generic year (e.g. “1992”). Rest of stack: folded, edge-on, or slightly obscured. | You want period identity without any specific “issue.” |
| **Illegible / generic script** | Newspaper stack visible but **text is illegible** — blurred type, generic script, or small/unreadable so no concrete headline is readable. Reads as “papers” not “this week’s front page.” | You want density of print without committing to any wording. |
| **Generic period headline** | One **timeless**, period-appropriate line only (e.g. “Developments in the region”, “Front situation”, “Official communiqué”). No date, or only year. Avoid anything that could conflict with a specific turn’s modal lead. | You want one readable “newspaper” feel without tying to a turn. |
| **Folded / stacked** | Papers **folded or stacked** so the visible surface is mostly masthead, blank margin, or the edge of pages. No full headline legible. | You want the prop to read as “newspaper stack” with minimal text. |

**Per faction (masthead if used):** RBiH — OSLOBOĐENJE. RS — GLAS SRPSKI. HRHB — HRVATSKI VOJNIK (or CROATIAN HERALD for English). Match period symbolism (§5).

**Summary:** The baked-in newspapers are **set dressing**. Turn-after-turn content lives in the **modal**. Keep painted newspaper text generic, masthead-only, or illegible so the same master image works for all turns.

---

## 8. Prompt structure: initial vs follow-up

**Initial prompt (base / prewar, from scratch):**  
Use for the **first** image per faction. Describe the full room: layout, camera, all anchors, base/prewar details, **empty desk map zone**, **date / next-turn board as painted wall board**, period ticker ambience, masthead-only newspaper, symbolism. Output 2752×1536, photorealistic, grimy. One initial prompt per faction → 3 images.

**Follow-up prompt (war, same room):**  
Use **after** you have the base/prewar image. Supply that image as reference. Instruct: keep this **exact** room — same layout, camera, furniture positions, walls, flag position, date / next-turn board, and anchor geometry. **Change only** the following to war phase: more wear, denser side papers, stronger command-post urgency, more operational atmosphere, optional field-telephone/radio emphasis, optional map tube or binoculars case. Do not redesign the room. Do **not** fill the desk map zone. Output same dimensions. One follow-up per faction → 3 images.

**Order per faction:** Run initial (prewar) then run follow-up (war) with prewar output as reference. Repeat for each of RBiH, RS, HRHB.

---

## 9. Checklist before generation

- [ ] Output dimensions **2752 × 1536**.
- [ ] **Photorealistic and grimy** — worn surfaces, visible use; no clean/stylized render or pristine look (§5a).
- [ ] **No white placeholders** — date / next-turn board is a **painted** notice board or frame (wood/cork/dark fabric), not a blank white rectangle (§2, §7).
- [ ] **Desk map zone** — single most important surface; **fully visible and empty** (no documents or papers on top; papers beside the zone); designed to receive a runtime projected map (§5b).
- [ ] **Telephone** — intact and whole; not damaged or mangled (§7).
- [ ] **Dossiers** — informal, spread-out arrangement across the desk; not neatly stacked in one pile (§7).
- [ ] **All text in Bosnian** — mastheads, stamps, ticker, map labels, **magazine title** (e.g. ODBRANA, not "Intelligence"), any visible text (§5d).
- [ ] **Upper-right wall: no readable text** — no status board with text strips in that area (§5e).
- [ ] **RBiH flag** — 1992–1998 only: blue shield with six golden fleurs-de-lis on white; not post-1998 (no yellow triangle on blue) (§5).
- [ ] **News ticker** — period 1992: ticker-tape machine, pinned strips, or chalk board; **no** digital screens or LED/LCD (§5c).
- [ ] Room layout **identical** for base and war follow-up; only details differ.
- [ ] **Map is not baked**; the desk zone stays empty.
- [ ] Date / next-turn board: **flat, frontal**, uncluttered, no perspective tilt.
- [ ] War variant: military feel applied (report density, field phone/radio emphasis, optional map tube/binoculars/roster) without filling the desk map zone.
- [ ] Faction symbolism correct (RBiH/RS/HRHB, period 1992–1998 / 1992–1995 for RS).
- [ ] RS desk map shows RS/Serb-held area only, not whole BiH.
- [ ] **Baked-in newspaper:** approach chosen and stated (masthead only / illegible / generic period headline / folded); no turn-specific date or headline.
- [ ] Shared negative prompt appended.

---

## 10. Deliverables

| # | Asset id | Phase | Faction | How |
|---|----------|--------|---------|-----|
| 1 | `warroom_rbih_base`  | base/prewar | RBiH  | **Initial** prompt (from scratch) |
| 2 | `warroom_rbih_war`   | war         | RBiH  | **Follow-up** to #1 — same room, more war strain |
| 3 | `warroom_rs_base`    | base/prewar | RS    | **Initial** prompt (from scratch) |
| 4 | `warroom_rs_war`     | war         | RS    | **Follow-up** to #3 — same room, more war strain |
| 5 | `warroom_hrhb_base`  | base/prewar | HRHB  | **Initial** prompt (from scratch) |
| 6 | `warroom_hrhb_war`   | war         | HRHB  | **Follow-up** to #5 — same room, more war strain |
| 7 | `warroom_map_overlay_*` | runtime overlay | per faction if needed | Separate map asset projected into the desk quad |
| 8 | `warroom_date_overlay`  | runtime overlay | shared/per faction | Current date / next-turn content projected into wall-board quad |

**Workflow:** For each faction, run the initial (prewar) prompt first, then run the follow-up (war) prompt with that prewar image as reference so the war image is the same room with war details only.

After approval of the six scene plates, outline hotspots over the physical anchors (same region semantics where layout aligns). See [20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) §12 and `src/ui/warroom/public/data/ui/hq_clickable_regions.json` for implementation.

---

## 11. Prompt source of truth

This document is now the **guidance and constraint reference**.

Use **[20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md)** as the **copy-paste prompt pack**, because it reflects the current direction:

- faction-specific base rooms
- war follow-up prompts
- baked flags
- empty desk map zone for runtime projection
- flat date / next-turn board for runtime overlay
- measured overlay quads

In short:

- Use **this file** for shared constraints, symbolism, tone, language, and military-feel guidance.
- Use **the other file** for the actual prompt blocks and overlay workflow.

---

### Alternative pipeline: clean warroom + one sprite

For a **two-step** approach: generate a **clean warroom** (room + empty map zone, no map on desk) then generate **one separate sprite** (e.g. desk map) to composite at runtime. See **[20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md)** for prompts, dimensions, and runtime notes.
