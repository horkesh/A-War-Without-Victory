# Warroom: Unified Room Prompt — Everything Painted Except Calendar

**Date:** 2026-03-08  
**Type:** Asset-generation specification + military-feel guidance  
**Status:** New handover (replaces/supplements nano banana approach for single-room consistency)  
**Use:** One master room layout; prewar and war share the same space. Prompt generates every visible detail except the wall calendar. Calendar zone is a flat, non-angled surface for engine overlay.

**Reference:** [WARROOM_MASTER.md](../WARROOM_MASTER.md), [20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md).

---

## 1. Core principle: same room, only details change

- **One physical room** — Same layout, same camera angle, same furniture positions, same anchor locations for **both** prewar and war **per faction**.
- **Prewar vs war** — Only the **details** change: what is on the desk map, what papers and folders contain, density of reports, tone of documents, and the degree of military/operational character. The room does not become a different space.
- **Two-step workflow (nano banana follow-up):**  
  1. **First prompt (initial):** Generate the **prewar** room from scratch for each faction (RBiH, RS, HRHB).  
  2. **Second prompt (follow-up):** Using the **previous image as reference**, generate the **war** version by **keeping the exact same room** and changing only the war details (map overlay, papers, military props, density, tone). The generator must preserve layout, camera, furniture, and walls; only desk/wall *content* changes to war phase.
- **Implication:** For each faction you produce two images: prewar (initial) then war (follow-up on that same room). Faction variants (RBiH, RS, HRHB) still differ by symbolism and mood; within each faction, prewar and war share the **same geometry**.

---

## 2. What the prompt creates vs what the engine paints

| In the image (prompt creates everything) | Painted by prompt |
|------------------------------------------|-------------------|
| Desk, map, folders, newspaper, magazine, telephone, radio, dossier, flag, ticker, all papers, lamps, seals, stamps, any military or administrative clutter | **Yes** — full detail |
| **Wall calendar** | **No** — leave a **flat, non-angled** surface |

### Calendar zone (only exception)

- **Do not paint** a calendar into the image.
- **Do not** show a blank white rectangle, whiteboard, or any bright empty “placeholder” square. The engine will overlay the calendar on a **painted** surface.
- **Paint** a **notice board or picture frame** in the same material as the room (e.g. dark wood frame, cork board, or dark fabric) that is:
  - **Flat and frontal** — facing the camera (perpendicular to the viewer).
  - **No perspective tilt** — so the engine’s 2D calendar overlay aligns.
  - **Uncluttered** — no busy texture or overlapping props that would fight the overlay.
  - **Visually part of the room** — it should look like a real notice board or frame, not a white square or empty screen.
- All other elements (faction flag, news ticker, desk map, briefing folio, newspaper stack, magazine, telephone, radio, faction dossier, optional report packet / dispatch folder / citation ledger / officer tray) are **fully painted** into the scene.

---

## 3. Technical specification (all images)

| Property | Value |
|----------|--------|
| **Output dimensions** | **2752 × 1536** pixels (exact), landscape |
| **Aspect ratio** | 2752 : 1536 (≈ 1.792 : 1) |
| **Usage** | Fixed UI scene plate; full background for warroom canvas |
| **Pipeline** | Single complete image per prompt; hotspots outlined afterward |
| **Runtime exception** | Only the **wall calendar** is not in the image; reserve a **flat, frontal** rectangular wall zone for it |

---

## 4. Shared negative prompt

Append to every generation:

```
Do not generate: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces that bury anchor silhouettes; overlapping piles crossing multiple modal regions; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas; blank white rectangles or whiteboards as placeholders; clean or stylized render; pristine surfaces; glossy or polished look; digital screens; LED or LCD displays; electronic ticker or digital readout (period is 1992); front lines or entity boundaries on the desk map; sector boundaries or faction borders on the map; text in English or other languages (all text must be in Bosnian); map showing Croatia Serbia Montenegro Adriatic or any territory outside Bosnia and Herzegovina; external coastlines or neighboring countries on the map; flag pins or city markers on the map; dossiers or folders neatly stacked in one pile (use informal spread-out arrangement); readable text in the upper-right wall area (no status board with text strips in upper right); post-1998 BiH flag or yellow triangle on blue; magazine or journal titled in English (e.g. Intelligence — use Bosnian title e.g. ODBRANA); documents or papers covering or obscuring the desk map (papers go beside the map); telephone damaged mangled bent or distorted (phone must be intact and whole).
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

## 5b. Map rules (all variants)

- **Map is the single most important visual element** — largest anchor, clearest and most visible. Nothing on the desk should compete with it for prominence.
- **Map must stay fully visible** — Do **not** place documents, folders, or paper stacks **on top of** the desk map. Papers and dossiers go **beside** the map or at the sides of the desk, not covering or obscuring it. The map surface must be clearly visible; no piles of papers or folders lying on the map. — The map must show **only** the territory of Bosnia and Herzegovina (or, for RS, only RS/Serb-held area). The map frame must **end at the border** of BiH. Do **not** show Croatia, Serbia, Montenegro, the Adriatic coast outside BiH, or any neighboring countries. Do **not** show external coastlines or land beyond BiH. Crop the map to BiH (or RS) borders so that only internal geography is visible. This is a common generator mistake: insist on **strictly internal geography**, no regional or Balkan-wide map.
- **No entity lines or strategic markers on the map** — No front lines, sector boundaries, faction borders, control lines, flag pins, city markers, pushpins marking positions, or tactical overlays. Pure **geography only**: coastline (within BiH), rivers, relief, optional place-name labels. No pins or markers that indicate cities, units, or strategic points.
- **RBiH and HRHB (prewar and war):** Desk map must show **only Bosnia and Herzegovina** — the territory of BiH only. Do **not** show a wider regional map including Croatia, Serbia, Adriatic, or full Balkans. BiH geography only, clear and readable.
- **RS:** Desk map shows **RS territory / Serb-held areas / RS administrative area only** — not the whole of BiH as one state (see §5). Again **geography only** — no front lines or entity boundaries on the map.
- **Staff map feel:** Map should read as a **staff or planning map**: clear geography, optionally light grid lines or coordinate marks for reference. Prewar: administrative **geography** of the relevant area. War: same **geographic** base; do **not** add sector boundaries, front line, or unit symbols to the map — keep it geography-only.

**Common generator mistakes to avoid:** (1) **Regional map** — generators often default to a Balkan or regional map showing Croatia, Serbia, Adriatic; insist the map is **cropped to BiH (or RS) borders only**, with no external territory visible. (2) **Flag pins / city markers** — do not add pins or markers on the map; they read as entity/strategic lines. (3) **Neat stacks** — dossiers and folders should be **spread out** in an in-use arrangement, not neatly stacked in one pile. (4) **Upper-right text** — do not put a status board or bulletin with readable text in the upper-right wall area. (5) **Magazine in English** — magazine/journal title must be in Bosnian (e.g. ODBRANA), not "Intelligence" or other English. (6) **Wrong RBiH flag** — use 1992–1998 RBiH only: blue shield with six golden fleurs-de-lis on white; not post-1998 (no yellow triangle on blue). (7) **Documents on the map** — do not place papers, folders, or dossiers on top of the desk map; the map must remain fully visible; put papers beside the map. (8) **Mangled phone** — the telephone must be intact, whole, and clearly recognizable; not damaged, bent, or distorted.

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

## 7. Master layout (same for prewar and war)

Use this layout for **every** variant (prewar RBiH/RS/HRHB, war RBiH/RS/HRHB). Only the **content and detail** of each anchor change.

| Anchor | Position | Notes |
|--------|----------|--------|
| **Desk map** | Center or lower-center, **largest and most prominent** anchor | Single most important element. **Must stay fully visible** — do not place documents or papers on top of the map; papers go beside the map. **Geography only** — no front lines, sector boundaries, or entity lines. RBiH/HRHB: BiH geography only (not regional). RS: RS territory only. Staff map feel: clear geography, optional grid/pins; no tactical or political overlays. Prewar and war: same geographic base (§5b, §6.1). |
| **Command briefing folio** | One clear side of desk | Thick folder, tabs/seals; prewar = prep brief, war = command briefing authority. |
| **Newspaper stack** | Opposite side of desk from folio | Clearly separate. **Text on baked-in papers:** see §7.1. |
| **Magazine / intelligence journal** | Separate from newspaper | Outlineable independently. **Title in Bosnian only** (e.g. ODBRANA, OBAVIJEŠTI) — do **not** use English titles such as "Intelligence". |
| **Telephone** | Strong side silhouette | Prewar: “line dead” feel optional. War: field/command phone. |
| **Radio** | Distinct from phone | Baked in; can be desk or wall. |
| **Faction dossier / archive binder** | Prominent, not competing with map | **Spread out in an informal, in-use arrangement** — folders and dossiers partially open or placed at different angles across the desk; not neatly stacked in a single pile. Desk should look actively used, with dossiers distributed rather than tidily stacked. |
| **Faction flag** | Upper wall, baked in | Any artistic angle; period symbolism. |
| **News ticker** | Baked in | **Period-appropriate (1992):** ticker-tape machine, wall bulletin with pinned strips, or chalk/peg board. **No digital screens or LED/LCD.** |
| **Wall zone for calendar** | Upper wall, flat and frontal | **Painted** notice board or picture frame (wood, cork, or dark fabric), uncluttered; engine overlays calendar. **No blank white rectangle or whiteboard.** |
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

**Initial prompt (prewar, from scratch):**  
Use for the **first** image per faction. Describe the full room: layout, camera, all anchors, prewar details (administrative map, preparatory papers, calendar zone as painted notice board, period ticker, masthead-only newspaper, symbolism). Output 2752×1536, photorealistic, grimy. One initial prompt per faction → 3 images (Prewar RBiH, Prewar RS, Prewar HRHB).

**Follow-up prompt (war, same room):**  
Use **after** you have the prewar image. Supply that image as reference. Instruct: keep this **exact** room — same layout, camera, furniture positions, walls, flag position, calendar zone, ticker. **Change only** the following to war phase: desk map (tactical overlay, front line, sectors, annotations); papers (SITREPs, stamps, denser stacks); telephone (field/command type if desired); radio (military style); ashtray/mug (more use); optional map tube, binoculars case. Do not redesign the room. Output same dimensions. One follow-up per faction → 3 images (War RBiH, War RS, War HRHB).

**Order per faction:** Run initial (prewar) then run follow-up (war) with prewar output as reference. Repeat for each of RBiH, RS, HRHB.

---

## 9. Checklist before generation

- [ ] Output dimensions **2752 × 1536**.
- [ ] **Photorealistic and grimy** — worn surfaces, visible use; no clean/stylized render or pristine look (§5a).
- [ ] **No white placeholders** — calendar zone is a **painted** notice board or frame (wood/cork/dark fabric), not a blank white rectangle (§2, §7).
- [ ] **Map** — single most important element; **fully visible** (no documents or papers on top of the map; papers beside the map); **strictly BiH (or RS) only** — frame ends at border; no Croatia, Serbia, Montenegro, Adriatic, or external coastlines; **geography only** (no front lines, sector boundaries, entity lines, flag pins, or city markers); staff map feel (§5b).
- [ ] **Telephone** — intact and whole; not damaged or mangled (§7).
- [ ] **Dossiers** — informal, spread-out arrangement across the desk; not neatly stacked in one pile (§7).
- [ ] **All text in Bosnian** — mastheads, stamps, ticker, map labels, **magazine title** (e.g. ODBRANA, not "Intelligence"), any visible text (§5d).
- [ ] **Upper-right wall: no readable text** — no status board with text strips in that area (§5e).
- [ ] **RBiH flag** — 1992–1998 only: blue shield with six golden fleurs-de-lis on white; not post-1998 (no yellow triangle on blue) (§5).
- [ ] **News ticker** — period 1992: ticker-tape machine, pinned strips, or chalk board; **no** digital screens or LED/LCD (§5c).
- [ ] Room layout **identical** for prewar and war; only details differ.
- [ ] **Everything** painted except the calendar zone.
- [ ] Calendar zone: **flat, frontal**, uncluttered, no perspective tilt.
- [ ] War variant: military feel applied (map overlay, report density, field phone/radio, stamps, optional map tube/binoculars/roster).
- [ ] Faction symbolism correct (RBiH/RS/HRHB, period 1992–1998 / 1992–1995 for RS).
- [ ] RS desk map shows RS/Serb-held area only, not whole BiH.
- [ ] **Baked-in newspaper:** approach chosen and stated (masthead only / illegible / generic period headline / folded); no turn-specific date or headline.
- [ ] Shared negative prompt appended.

---

## 10. Deliverables

| # | Asset id | Phase | Faction | How |
|---|----------|--------|---------|-----|
| 1 | warroom_prewar_RBiH  | prewar | RBiH  | **Initial** prompt (from scratch) |
| 2 | warroom_war_RBiH     | war    | RBiH  | **Follow-up** to #1 — same room, add war details |
| 3 | warroom_prewar_RS    | prewar | RS    | **Initial** prompt (from scratch) |
| 4 | warroom_war_RS       | war    | RS    | **Follow-up** to #3 — same room, add war details |
| 5 | warroom_prewar_HRHB  | prewar | HRHB  | **Initial** prompt (from scratch) |
| 6 | warroom_war_HRHB     | war    | HRHB  | **Follow-up** to #5 — same room, add war details |

**Workflow:** For each faction, run the initial (prewar) prompt first, then run the follow-up (war) prompt with that prewar image as reference so the war image is the same room with war details only.

After approval of the six scene plates, outline hotspots over the physical anchors (same region semantics where layout aligns). See [20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) §12 and `src/ui/warroom/public/data/ui/hq_clickable_regions.json` for implementation.

---

## 11. Prompts: initial (prewar) + follow-up (war, same room)

**Two-step workflow:** For each faction, run the **initial** prompt first to create the prewar room. Then run the **follow-up** prompt with that prewar image as reference; the follow-up keeps the **exact same room** and adds only war details (tactical map, military props, denser papers). Nano banana can use the first image as reference for the second.

**Initial prompts (3):** Prewar RBiH, Prewar RS, Prewar HRHB — full room from scratch. Copy one block; output 2752×1536, photorealistic, grimy.

**Follow-up prompts (3):** War RBiH, War RS, War HRHB — **attach the prewar image** for that faction, then use the follow-up block. Same room; change only the listed war details. Output same dimensions.

**Baked-in newspaper:** All six use **masthead only**. **Calendar zone:** Painted notice board or frame, no white rectangle. **Ticker:** Period 1992 — ticker-tape or pinned bulletin, no digital. **Map:** Geography only (no front lines, sector boundaries, or entity lines). RBiH/HRHB = BiH only; RS = RS territory only. **Language:** All visible text in Bosnian (§5d).

---

### Block 1 — Prewar RBiH

```text
Generate a photorealistic image of a historical Bosnian War strategy game warroom. Not a clean 3D render or stylized illustration — real photograph feel, gritty and worn. OUTPUT: Exactly 2752 pixels wide × 1536 pixels high, landscape. One image. SAME ROOM LAYOUT: One complete room. Fixed camera. Slightly elevated frontal perspective. Wide and stable. No fisheye, no Dutch angle. All anchors in the same positions: desk map center or lower-center (LARGEST and most prominent — single most important element), command briefing folio one side of desk, newspaper stack opposite side, magazine or intelligence journal separate (magazine title in Bosnian only, e.g. ODBRANA — not "Intelligence"), telephone strong silhouette, radio distinct from phone, faction dossier prominent, faction flag and news ticker on upper wall. UPPER RIGHT WALL: No readable text in the upper-right wall area — no status board with text strips; ticker paper illegible or blank if in that zone. MAP: The desk map is the dominant visual. Show ONLY Bosnia and Herzegovina — the map frame must END AT THE BORDER of BiH. Strictly internal BiH territory only: do NOT show Croatia, Serbia, Montenegro, the Adriatic outside BiH, or any neighboring countries or external coastlines. Geography only (coastline within BiH, rivers, relief, optional place names). No front lines, sector boundaries, entity boundaries, flag pins, city markers, or pushpins on the map. Clear, readable BiH outline. Staff map feel: optional light grid lines only. Administrative focus for prewar. All visible text in the scene (stamps, ticker, map labels) in Bosnian (bosanski). DOSSIERS: Folders and dossiers spread across the desk in an informal, in-use arrangement — partially open, different angles; NOT neatly stacked in one pile. Do NOT place papers or folders on top of the map; the map must stay fully visible; put papers beside the map. Telephone: intact and whole, clearly recognizable; not damaged or mangled. PAINT EVERYTHING EXCEPT CALENDAR: Desk, map, folders, newspaper stack, magazine, telephone, radio, faction dossier, faction flag, news ticker, all papers and props fully painted. CALENDAR ZONE: Paint a flat, frontal notice board or picture frame (dark wood, cork, or dark fabric) matching the room — uncluttered surface for game overlay. Do NOT paint a blank white rectangle, whiteboard, or placeholder square. NEWS TICKER: Period 1992 — no digital screens or LED/LCD. Use a ticker-tape machine (paper strip), wall bulletin with pinned typed/handwritten strips, or chalk/peg board. Physical paper or chalk only. BAKED-IN NEWSPAPER: Topmost visible paper shows only the masthead OSLOBOĐENJE; no headline, no date or only year "1992"; rest of stack folded or edge-on. SYMBOLISM: RBiH flag (1992–1998) only: blue shield with six golden fleurs-de-lis on white field. Do NOT use post-1998 BiH flag (yellow triangle on blue). Do NOT use horizontal blue-white-blue tricolor with wrong crest. PHASE: Prewar (peace). FACTION: Republic of Bosnia and Herzegovina (RBiH). Institutional, preparatory, tense. Capital and organizational focus. GRIMY AND WORN: Visible use — worn desk leather, scuffed wood, coffee stains, ashtray residue, creased papers, dusty lamp; tactile, atmospheric realism. Modest dignified command room; mixed civilian and military administrative character; heavily used papers; holding together under pressure. Not pristine, not glossy, not luxury office. MATERIALS: Dark wood; worn green or brown desk leather; practical institutional metal; paper-heavy surfaces; restrained brass; warm low light, cooler ambient shadows. Strong object silhouettes, readable edges, overlay-safe breathing room. AVOID: separate floating props; modular sprites; extreme perspective; fisheye; Dutch angle; cinematic framing; over-cluttered desk burying anchors; overlapping piles across modal regions; blurry silhouettes; illegible anchors; fantasy tech; neon; sci-fi screens; modern minimalism; cartoon; blank white rectangles or whiteboards; clean or stylized render; pristine surfaces; glossy look; digital screens; LED or LCD displays; electronic ticker; map showing Croatia or Adriatic or full Balkans or any external coastlines; front lines or entity boundaries on map; flag pins or city markers on map; dossiers neatly stacked in one pile; readable text in upper-right wall; post-1998 BiH flag (yellow triangle on blue); magazine titled in English (e.g. Intelligence); text in English; documents or papers covering the map; telephone mangled or damaged; excessive smoke or darkness; dramatic figures dominating; giant paper piles on modal-safe areas.
```

---

### Block 2 — War RBiH (follow-up: use prewar RBiH image as reference)

```text
Use the attached image as the exact room. Do not redesign the room. Keep the same layout, camera angle, furniture positions, walls, flag position, calendar zone (painted notice board), and news ticker. Change ONLY the following to war phase: (1) Desk map — keep Bosnia and Herzegovina only; map frame must end at BiH border; no Croatia, Serbia, Montenegro, or external coastlines; no flag pins, city markers, or pushpins; geography only. (2) Papers — add SITREPs, operation orders, rubber stamps in Bosnian (e.g. HITNO, ODOBRENO), denser stacks, carbon/telex feel. All visible text in Bosnian. (3) Telephone — field or command phone, cable visible if possible; must be intact and whole, not damaged or mangled. (4) Radio — military or institutional style, frequency dial, antenna. (5) Desk — more cigarette butts in ashtray, coffee stains, more stacked paperwork. (6) Optional: map tube, binoculars case. Newspaper stack: masthead OSLOBOĐENJE only; rest folded. Magazine: title in Bosnian (e.g. ODBRANA), not English. Upper-right wall: no readable text. FACTION: RBiH. SYMBOLISM: RBiH flag (1992–1998) — blue shield with six golden fleurs-de-lis on white; no post-1998 BiH crest. Output: 2752 × 1536 pixels, photorealistic, gritty and worn. AVOID: changing room geometry; white placeholders; digital screens; map with Croatia/Adriatic or external coastlines; front lines or entity boundaries on map; flag pins or city markers on map; readable text in upper-right wall; post-1998 BiH flag; magazine titled in English; text in English; documents covering the map; telephone mangled or damaged; clean render; cartoon.
```

---

### Block 3 — Prewar RS

```text
Generate a photorealistic image of a historical Bosnian War strategy game warroom. Gritty and worn. OUTPUT: Exactly 2752 × 1536 pixels, landscape. SAME ROOM LAYOUT: Map center or lower-center LARGEST and most prominent; folio one side, newspaper opposite, magazine separate, telephone, radio, dossier, flag, news ticker on wall. MAP: Dominant. RS territory / Serb-held areas / RS administrative area ONLY — map frame must end at that area border; do NOT show whole Bosnia and Herzegovina or neighboring countries. Geography only: no front lines, sector boundaries, entity lines, flag pins, or city markers. Staff map feel: clear geography, optional grid. Administrative for prewar. All visible text in Bosnian. DOSSIERS: Spread across the desk in an informal, in-use arrangement; not neatly stacked in one pile. Do NOT place papers or folders on top of the map; map must stay fully visible. Telephone: intact and whole; not damaged or mangled. MAGAZINE: Title in Bosnian only (e.g. ODBRANA), not English (e.g. Intelligence). UPPER RIGHT WALL: No readable text in upper-right wall area. CALENDAR ZONE: Painted notice board or frame (wood, cork, dark fabric), flat and frontal; no white rectangle. NEWS TICKER: 1992 — ticker-tape machine, pinned strips, or chalk board; no digital/LED. BAKED-IN NEWSPAPER: GLAS SRPSKI masthead only; rest folded. SYMBOLISM: Wartime RS (1992–1995) only; no post-Dayton coat of arms. PHASE: Prewar. FACTION: RS. Formal military authority, austere, bureaucratic. GRIMY: Worn surfaces, visible use. Materials: darker wood, colder leather, iron, dark green, muted red-brown. AVOID: white placeholders; clean render; digital screens; map of whole BiH or neighboring countries; post-1995 RS crest; front lines or entity boundaries on map; flag pins or city markers on map; dossiers neatly stacked; documents covering the map; telephone mangled or damaged; text in English; floating props; fisheye; over-cluttered desk; cartoon; giant paper piles.
```

---

### Block 4 — War RS (follow-up: use prewar RS image as reference)

```text
Use the attached image as the exact room. Do not redesign the room. Keep the same layout, camera angle, furniture positions, walls, flag position, calendar zone, and news ticker. Change ONLY the following to war phase: (1) Desk map — keep RS territory / Serb-held areas geography only; map frame at border; no front lines, sector boundaries, entity lines, flag pins, or city markers; optional light grid only. (2) Papers — SITREPs, operation orders, rubber stamps in Bosnian (e.g. HITNO, POVJERLJIVO, ODOBRENO), denser stacks. All text in Bosnian. Do not place papers on top of the map; map must stay visible. (3) Telephone — field/command phone; intact and whole, not damaged or mangled. (4) Radio — military style. (5) Desk — more ashtray use, coffee stains, dense paperwork. (6) Optional: map tube, binoculars case. Newspaper: GLAS SRPSKI masthead only; rest folded. FACTION: RS. SYMBOLISM: Wartime RS (1992–1995); no post-Dayton crest. Output: 2752 × 1536 pixels, photorealistic, gritty and worn. AVOID: changing room geometry; white placeholders; digital screens; map of whole BiH or external coastlines; front lines or entity boundaries on map; flag pins or city markers on map; readable text in upper-right wall; magazine titled in English; text in English; documents covering the map; telephone mangled or damaged; post-1995 RS crest; clean render; cartoon.
```

---

### Block 5 — Prewar HRHB

```text
Generate a photorealistic image of a historical Bosnian War strategy game warroom. Gritty and worn. OUTPUT: Exactly 2752 × 1536 pixels, landscape. SAME ROOM LAYOUT: Map center or lower-center LARGEST and most prominent; folio, newspaper, magazine, telephone, radio, dossier, flag, news ticker. MAP: ONLY Bosnia and Herzegovina — map frame must end at BiH border; no Croatia, Serbia, Montenegro, or external coastlines. No entity lines, flag pins, or city markers. Staff map feel; administrative for prewar. All visible text in Bosnian (or Croatian for HRHB masthead, e.g. HRVATSKI VOJNIK). DOSSIERS: Spread across the desk in an informal, in-use arrangement; not neatly stacked in one pile. Do NOT place papers or folders on top of the map; map must stay fully visible. Telephone: intact and whole; not damaged or mangled. MAGAZINE: Title in Bosnian only (e.g. ODBRANA), not English (e.g. Intelligence). UPPER RIGHT WALL: No readable text in upper-right wall area. CALENDAR ZONE: Painted notice board or frame; no white rectangle. NEWS TICKER: 1992 — ticker-tape or pinned bulletin; no digital/LED. BAKED-IN NEWSPAPER: HRVATSKI VOJNIK masthead only (Bosnian/Croatian); rest folded. SYMBOLISM: Period-appropriate HRHB. PHASE: Prewar. FACTION: HRHB. Compact authority, regional command identity. GRIMY: Visible use. Materials: medium-dark wood, restrained blue and warm-neutral accents. AVOID: white placeholders; clean render; digital screens; map with Croatia/Adriatic or external coastlines; front lines or entity boundaries on map; flag pins or city markers on map; dossiers neatly stacked; documents covering the map; telephone mangled or damaged; text in English; floating props; cartoon; giant paper piles.
```

---

### Block 6 — War HRHB (follow-up: use prewar HRHB image as reference)

```text
Use the attached image as the exact room. Do not redesign the room. Keep the same layout, camera angle, furniture positions, walls, flag position, calendar zone, and news ticker. Change ONLY the following to war phase: (1) Desk map — keep Bosnia and Herzegovina geography only; map frame at BiH border; no external coastlines; no flag pins or city markers; optional light grid only. (2) Papers — SITREPs, operation orders, stamps in Bosnian, denser stacks. All text in Bosnian. Do not place papers on top of the map; map must stay visible. (3) Telephone — field/command phone; intact and whole, not damaged or mangled. (4) Radio — military or institutional style. (5) Desk — more ashtray use, coffee stains. (6) Optional: map tube or binoculars case. Newspaper: HRVATSKI VOJNIK masthead only; rest folded. FACTION: HRHB. SYMBOLISM: Period-appropriate HRHB. Output: 2752 × 1536 pixels, photorealistic, gritty and worn. AVOID: changing room geometry; white placeholders; digital screens; map with Croatia/Adriatic or external coastlines; front lines or entity boundaries on map; flag pins or city markers on map; readable text in upper-right wall; post-1998 BiH flag; magazine titled in English; text in English; documents covering the map; telephone mangled or damaged; clean render; cartoon.
```

---

### Checklist for copy-paste use

- [ ] **Initial (Blocks 1, 3, 5):** Pasted one prewar block; set dimensions 2752×1536; no reference image.
- [ ] **Follow-up (Blocks 2, 4, 6):** Attached the **prewar image for that faction** as reference; pasted the matching follow-up block; set dimensions 2752×1536.
- [ ] Block number matches desired asset (1–6) from Deliverables table (§10).
- [ ] **Map:** geography only (no entity lines); **all text in Bosnian.**

---

### Alternative pipeline: clean warroom + one sprite

For a **two-step** approach: generate a **clean warroom** (room + empty map zone, no map on desk) then generate **one separate sprite** (e.g. desk map) to composite at runtime. See **[20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md)** for prompts, dimensions, and runtime notes.
