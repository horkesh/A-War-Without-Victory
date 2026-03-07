# Warroom: Six Nano Banana Prompts (Prewar + War × RBiH, RS, HRHB)

**Date:** 2026-03-07  
**Type:** Asset-generation prompts  
**Status:** Ready for image generation  
**Use:** Copy **one** prompt block into your image generator; the generator will not see the others. Each of the six copy-paste blocks is **fully standalone** (dimensions, anchors, phase, faction, and negative/avoid list included). Output one image per prompt. Six images total.

**Reference:** Builds on [20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md). Peace vs war design from [WARROOM_MASTER.md](../WARROOM_MASTER.md).

---

## Technical specification (all 6 images)

| Property | Value |
|----------|--------|
| **Output dimensions** | **2752 pixels wide × 1536 pixels high** (exact). |
| **Aspect ratio** | 2752 : 1536 (≈ 1.792 : 1). |
| **Orientation** | Landscape. |
| **Usage** | Fixed UI scene plate; same image is used as full background for the warroom canvas. No cropping or letterboxing in engine. |
| **Pipeline** | Single complete image per prompt. Hotspots will be outlined afterward in a separate step. No separate sprites or props. |
| **Runtime exceptions** | These elements are **not** painted into the image; leave **clean, uncluttered wall space** for them so the game can draw them on top: (1) **faction flag**, (2) **wall calendar**, (3) **ticker/radio strip**. |
| **Overlay alignment** | The engine draws flag and calendar as **flat 2D rectangles** (no perspective). So the **flag zone** and **calendar zone** in the scene must be **flat and frontal**: a rectangular area **facing the camera** (perpendicular to viewer), like a notice board or picture frame, **no perspective tilt**. Otherwise the 2D overlay will not align with the room. |
| **Symbolism** | **Per-faction, period-accurate (1992–1998 war period):** **RBiH rooms:** White shield with golden fleur-de-lis and blue vertical stripes only. **Do not** use the post-1998 BiH coat of arms (yellow triangle on blue field). **RS rooms:** Use **wartime RS symbolism only (1992–1995)** on all documents, binders, stamps — e.g. Serbian tricolor, wartime RS insignia. **Do not** use the post-Dayton/post-1995 Republika Srpska coat of arms. **HRHB rooms:** Use period-appropriate HRHB-era symbolism only. **Desk map (RS only):** The RS warroom desk map must show **RS territory, Serb-held areas, or the RS operational/administrative area only**. **Do not** show a map of the whole of Bosnia and Herzegovina as a single state; that is wrong for the RS faction perspective. |

---

## Shared negative prompt (append to every generation)

Use this as the negative prompt or “avoid” list for all six:

```
Do not generate: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas.
```

---

## Modal anchor placeholders (layout must accommodate these)

The scene must include **clearly outlineable** physical objects or zones for these anchors. Same layout logic for all six; phase only changes which modals open on click (peace set vs war set). Leave **overlay-safe breathing room** in: upper-left wall, upper-right wall, center-back desk, lower-center desk, and at least one side area for wider modal overlays.

| Anchor object / zone | Modal(s) — Peace (prewar) | Modal(s) — War |
|----------------------|---------------------------|----------------|
| **Desk map** (center, largest) | Preparation map / invest view | Operational Situation → tactical map, op health, sector stress, logistics |
| **Command briefing folio** (thick stamped folder) | Reports / prep brief | Command Briefing (“what matters now”), front alarms, convoy/enclave/op failures |
| **Newspaper stack** | Newspaper (Phase 0 events) | Newspaper (war headlines) / Press narrative |
| **Magazine / intelligence journal** | Magazine (pre-war org review), Reports (mun intel) | Magazine (war operational review), Reports (operational briefs) |
| **Telephone** | “Line dead” (diplomacy inactive) | Diplomacy / IVP breakdown, Sarajevo visibility, enclave pressure |
| **Radio** | Ticker (pre-war headlines) | Ticker (war events) |
| **Faction dossier / archive binder / record ledger** | Faction Overview (capital, org, declaration pressure) | Faction Overview (territory, military, COMMAND, commander assignment) |
| **Wall space — flag** | Reserved for runtime flag | Reserved for runtime flag |
| **Wall space — calendar** | Reserved for runtime calendar | Reserved for runtime calendar |
| **Typed report packet** (optional distinct object) | — | Turn-End Intelligence Packet (front changes, enemy intent, attention points) |
| **Emergency dispatch folder** (optional) | — | Enclave Crisis (resilience, airdrop, humanitarian risk) |
| **Citation / memorial ledger** (optional) | — | Honors and Memorials (sacrifice, recognition, memory) |
| **Personnel / officer dossier tray** (optional) | — | Commander Register (commanders, assignments, competence) |

Keep **object silhouettes strong**, **edges readable**, and **no key anchor buried under clutter** or crossing multiple modal regions.

---

# Prompt 1 — Prewar RBiH

**Asset id:** `warroom_prewar_RBiH`  
**Phase:** Prewar (peace). Institutional, preparatory, tense. No combat maps or frontline clutter.  
**Faction:** Republic of Bosnia and Herzegovina (RBiH).

**Output:** One complete room image, **2752 × 1536 pixels**, landscape. Fixed UI scene plate for a historical Bosnian War strategy game. This is not concept art and not a cinematic illustration; it is a fixed interactive background for a game interface.

**Composition:** One complete room; fixed camera angle; slightly elevated frontal perspective; wide and stable composition. No fisheye, no Dutch angle, no dramatic tilt. No perspective exaggeration that makes one hotspot huge and another tiny. Do not crop out desk interaction zones.

**UI-plate rules:** The image must function as a hotspot-outline source and modal-anchor background. Use strong object silhouettes, readable edges, enough empty space for modal overlays, no key objects buried under clutter, no overlapping piles crossing multiple future modal regions. All props (desk, map, folders, phone, radio, papers, lamp, etc.) must be painted into this single coherent scene; do not assume any separate sprites.

**Do not paint into the image (leave clean wall space for runtime overlay):** faction flag; wall calendar; ticker strip.

**Required anchors (same relative placement across all six prompts):**
- **Desk map area** — center or lower-center, largest anchor. Prewar: administrative or political map, municipality/organization focus; no frontline or military overlay.
- **Command briefing folio** — official thick folder or report with tabs/seals; one clear side of desk, not buried.
- **Newspaper stack** — opposite side of desk from briefing folio; clearly separate.
- **Magazine or intelligence journal** — separate enough from newspaper to be outlined independently.
- **Telephone** — strong side silhouette, easy to isolate (in prewar, will show “Line dead” when clicked).
- **Radio** — visually distinct from phone, not too small.
- **Faction dossier / archive binder / record object** — prominent; not competing with desk map.
- **Wall zone for flag** — upper wall, clean, uncluttered; must be a **flat, frontal** rectangular area (facing the camera, no perspective tilt) so the 2D overlay aligns.
- **Wall zone for calendar** — upper wall, separate from flag zone; must be **flat and frontal** (facing the camera, no perspective tilt).

**Overlay-safe space:** Leave breathing room in upper-left wall, upper-right wall, center-back desk, lower-center desk, and at least one side for wider modal overlays. Do not fill these with high-noise clutter.

**Prewar tone (RBiH):** Institutional and preparatory. Tense but not yet at war. Capital and organizational investment focus. Modest but dignified command room; mixed civilian and military administrative character. Worn but not filthy materials; practical furniture; heavily used papers; subtle signs of national identity and state continuity; atmosphere of holding together under pressure; responsibility over opulence. Communicate: endurance, improvised statehood, civic defense under pressure, constrained resources, seriousness and sacrifice, legitimacy under siege. Avoid: luxury office feeling, sleek modern command center, chaotic rubble melodrama, propaganda excess.

**Material palette (RBiH prewar):** Dark wood; worn green or brown desk leather; practical institutional metal; paper-heavy surfaces; restrained brass; warm low light with cooler ambient shadows.

**Style:** Historical command room; institutional decision space; serious, sober, atmospheric; tactile and material-rich. Not sci-fi, not glossy, not generic military wallpaper, not over-decorated propaganda art, not chaotic concept art. Materials: wood, leather, paper, cloth, metal fixtures, map sheets, folders, seals, stamp ink, desk lamps, administrative clutter.

---

# Prompt 2 — War RBiH

**Asset id:** `warroom_war_RBiH`  
**Phase:** War. Operational, maps, reports, pressure; frontline and logistics in view.  
**Faction:** Republic of Bosnia and Herzegovina (RBiH).

**Output:** One complete room image, **2752 × 1536 pixels**, landscape. Fixed UI scene plate for a historical Bosnian War strategy game. This is not concept art and not a cinematic illustration; it is a fixed interactive background for a game interface.

**Composition:** One complete room; fixed camera angle; slightly elevated frontal perspective; wide and stable composition. No fisheye, no Dutch angle, no dramatic tilt. No perspective exaggeration that makes one hotspot huge and another tiny. Do not crop out desk interaction zones.

**UI-plate rules:** The image must function as a hotspot-outline source and modal-anchor background. Use strong object silhouettes, readable edges, enough empty space for modal overlays, no key objects buried under clutter, no overlapping piles crossing multiple future modal regions. All props must be painted into this single coherent scene; do not assume any separate sprites.

**Do not paint into the image (leave clean wall space for runtime overlay):** faction flag; wall calendar; ticker strip.

**Required anchors (each must be physically distinct and consistently positioned):**
- **Desk map area** — center or lower-center, largest anchor. War: tactical/operational map; can suggest frontline, sectors, or logistics; annotated but not over-cluttered. Strongest desk object.
- **Command briefing folio** — thick stamped folder; obvious authority; easy silhouette.
- **Newspaper stack** — opposite side of desk from folio.
- **Magazine or intelligence journal** — outlineable separately.
- **Telephone** — strong silhouette.
- **Radio** — distinct from phone.
- **Faction dossier / archive binder** — prominent.
- **Wall zone for flag** — upper wall, clean.
- **Wall zone for calendar** — upper wall, separate from flag.

**Optional war-only anchors (if space allows, keep outlineable):** Typed report packet (Turn-End Intelligence); emergency dispatch folder (Enclave Crisis); citation/memorial ledger (Honors and Memorials); personnel/officer dossier tray (Commander Register).

**Overlay-safe space:** Upper-left wall, upper-right wall, center-back desk, lower-center desk, one side for wider modals. No high-noise clutter in these zones.

**War tone (RBiH):** Operational and under pressure. Endurance and improvised statehood under war conditions; strained but legitimate; civic defense; constrained resources; seriousness and sacrifice. Same modest, dignified, mixed civilian-military character as prewar but with more maps, reports, and sense of ongoing operations. Heavily used papers, practical furniture, atmosphere of holding together under siege. Not luxury, not sleek, not rubble melodrama, not propaganda excess.

**Material palette (RBiH war):** Dark wood; worn green or brown leather; institutional metal; paper-heavy; restrained brass; warm low light, cooler shadows; can add more maps and report stacks than prewar.

**Style:** Historical command room; institutional decision space; serious, sober, atmospheric; tactile and material-rich. Not sci-fi, not glossy, not generic military wallpaper. Materials: wood, leather, paper, cloth, metal, map sheets, folders, seals, desk lamps, administrative clutter.

---

# Prompt 3 — Prewar RS

**Asset id:** `warroom_prewar_RS`  
**Phase:** Prewar (peace). Institutional, preparatory, tense. No combat maps or frontline clutter.  
**Faction:** Republika Srpska (RS).

**Output:** One complete room image, **2752 × 1536 pixels**, landscape. Fixed UI scene plate for a historical Bosnian War strategy game. This is not concept art and not a cinematic illustration; it is a fixed interactive background for a game interface.

**Composition:** One complete room; fixed camera angle; slightly elevated frontal perspective; wide and stable composition. No fisheye, no Dutch angle, no dramatic tilt. No perspective exaggeration. Do not crop out desk interaction zones.

**UI-plate rules:** Strong object silhouettes, readable edges, overlay space, no clutter burying anchors, no piles crossing modal regions. All props painted into one scene; no separate sprites.

**Do not paint (leave clean wall space):** faction flag; wall calendar; ticker strip.

**Required anchors (each must be physically distinct and consistently positioned):**
- **Desk map area** — center or lower-center, largest anchor. Prewar: administrative or political map, municipality/organization focus; no frontline or military overlay. **RS: map must show RS territory, Serb-held areas, or RS administrative area only — do NOT show a map of the whole of Bosnia and Herzegovina.**
- **Command briefing folio** — official thick folder or report with tabs/seals; one clear side of desk, not buried.
- **Newspaper stack** — opposite side of desk from briefing folio; clearly separate.
- **Magazine or intelligence journal** — separate enough from newspaper to be outlined independently.
- **Telephone** — strong side silhouette, easy to isolate.
- **Radio** — visually distinct from phone, not too small.
- **Faction dossier / archive binder / record object** — prominent; not competing with desk map.
- **Wall zone for flag** — upper wall, clean, uncluttered; must be a **flat, frontal** rectangular area (facing the camera, no perspective tilt) so the 2D overlay aligns.
- **Wall zone for calendar** — upper wall, separate from flag zone; must be **flat and frontal** (facing the camera, no perspective tilt).

**RS symbolism:** Use **wartime RS only (1992–1995)** on all documents, binders, stamps — e.g. Serbian tricolor, wartime RS insignia. **Do not** use the post-Dayton or post-1995 Republika Srpska coat of arms.

**Overlay-safe space:** Upper-left and upper-right wall, center-back desk, lower-center desk, one side for wider modals. No high-noise clutter there.

**Prewar tone (RS):** Formal military authority; austere confidence; bureaucratic force; heavy apparatus; command discipline; institutional hardness without cartoon villainy. More militarized and rigid than RBiH/HRHB; cleaner lines; stronger sense of command infrastructure; systematic paperwork and map handling; colder emotional temperature; apparatus and control. Avoid: theatrical villain aesthetics, modern bunker sci-fi, over-ornamentation. Should feel organized, weighty, deliberate, grounded and believable.

**Material palette (RS prewar):** Darker wood; colder leather tones; iron, steel, dark green, muted red-brown accents; harder shadows; restrained insignia-bearing atmosphere.

**Style:** Historical command room; institutional; serious, sober, atmospheric; tactile and material-rich. Not sci-fi, not glossy, not cartoon villain. Materials: wood, leather, paper, metal, folders, seals, desk lamps, administrative clutter.

---

# Prompt 4 — War RS

**Asset id:** `warroom_war_RS`  
**Phase:** War. Operational, maps, reports, pressure; frontline and logistics in view.  
**Faction:** Republika Srpska (RS).

**Output:** One complete room image, **2752 × 1536 pixels**, landscape. Fixed UI scene plate for a historical Bosnian War strategy game. This is not concept art and not a cinematic illustration; it is a fixed interactive background for a game interface.

**Composition:** One complete room; fixed camera angle; slightly elevated frontal perspective; wide and stable composition. No fisheye, no Dutch angle, no dramatic tilt. No perspective exaggeration. Do not crop out desk interaction zones.

**UI-plate rules:** Strong object silhouettes, readable edges, overlay space, no clutter burying anchors, no piles crossing modal regions. All props painted into one scene; no separate sprites.

**Do not paint (leave clean wall space):** faction flag; wall calendar; ticker strip.

**Required anchors (each must be physically distinct and consistently positioned):**
- **Desk map area** — center or lower-center, largest anchor. War: tactical/operational map; can suggest frontline, sectors, or logistics; annotated but not over-cluttered. **RS: map must show RS territory, Serb-held areas, or RS operational area only — do NOT show a map of the whole of Bosnia and Herzegovina.**
- **Command briefing folio** — thick stamped folder; obvious authority; easy silhouette.
- **Newspaper stack** — opposite side of desk from folio.
- **Magazine or intelligence journal** — outlineable separately.
- **Telephone** — strong silhouette.
- **Radio** — distinct from phone.
- **Faction dossier / archive binder** — prominent.
- **Wall zone for flag** — upper wall, clean.
- **Wall zone for calendar** — upper wall, separate from flag.

**RS symbolism:** Use **wartime RS only (1992–1995)** on all documents, binders, stamps — e.g. Serbian tricolor, wartime RS insignia. **Do not** use the post-Dayton or post-1995 Republika Srpska coat of arms.

**Optional war-only anchors (if space allows, keep outlineable):** Typed report packet (Turn-End Intelligence); emergency dispatch folder (Enclave Crisis); citation/memorial ledger (Honors and Memorials); personnel/officer dossier tray (Commander Register).

**Overlay-safe space:** Upper-left wall, upper-right wall, center-back desk, lower-center desk, one side for wider modals. No high-noise clutter there.

**War tone (RS):** Operational and at war. Same formal military authority, austere confidence, bureaucratic force, heavy apparatus, command discipline. Strongest “apparatus” room of the three factions. More maps, reports, and operational pressure than prewar; organized, weighty, deliberate; grounded and believable. Avoid: theatrical villain aesthetics, modern bunker sci-fi, over-ornamentation.

**Material palette (RS war):** Darker wood; colder leather; iron, steel, dark green, muted red-brown; harder shadows; restrained insignia. Can show more operational paperwork and map annotations than prewar.

**Style:** Historical command room; institutional; serious, sober, atmospheric; tactile and material-rich. Not sci-fi, not glossy. Materials: wood, leather, paper, metal, maps, folders, seals, desk lamps, administrative clutter.

---

# Prompt 5 — Prewar HRHB

**Asset id:** `warroom_prewar_HRHB`  
**Phase:** Prewar (peace). Institutional, preparatory, tense. No combat maps or frontline clutter.  
**Faction:** Croatian Republic of Herzeg-Bosnia (HRHB).

**Output:** One complete room image, **2752 × 1536 pixels**, landscape. Fixed UI scene plate for a historical Bosnian War strategy game. This is not concept art and not a cinematic illustration; it is a fixed interactive background for a game interface.

**Composition:** One complete room; fixed camera angle; slightly elevated frontal perspective; wide and stable composition. No fisheye, no Dutch angle, no dramatic tilt. No perspective exaggeration. Do not crop out desk interaction zones.

**UI-plate rules:** Strong object silhouettes, readable edges, overlay space, no clutter burying anchors, no piles crossing modal regions. All props painted into one scene; no separate sprites.

**Do not paint (leave clean wall space):** faction flag; wall calendar; ticker strip.

**Required anchors (each must be physically distinct and consistently positioned):**
- **Desk map area** — center or lower-center, largest anchor. Prewar: administrative or political map, municipality/organization focus; no frontline.
- **Command briefing folio** — thick official folder with tabs/seals; one clear side of desk.
- **Newspaper stack** — opposite side of desk from folio.
- **Magazine or intelligence journal** — separate from newspaper.
- **Telephone** — strong side silhouette.
- **Radio** — distinct from phone.
- **Faction dossier / archive binder** — prominent.
- **Wall zone for flag** — upper wall, clean.
- **Wall zone for calendar** — upper wall, separate from flag. Compact authority; regional command identity; disciplined political-military administration; limited scale but strong symbolic self-definition; confidence mixed with fragility and dependency. Somewhat tidier and more curated than RBiH; less heavy and monolithic than RS; strong symbolic identity in a smaller administrative-feeling space; compact but intentional command atmosphere. Avoid: luxury political office, generic modern European office, sleek western command-center styling. Most compact and self-styled variant; orderly and identity-conscious; not weak or too polished.

**Material palette (HRHB prewar):** Medium-dark wood; slightly brighter desk treatment; restrained blue and warm-neutral accents; orderly paper handling; less exhausted than RBiH; less severe than RS.

**Style:** Historical command room; institutional; serious, sober, atmospheric; tactile and material-rich. Not sci-fi, not glossy. Materials: wood, leather, paper, cloth, metal, folders, seals, desk lamps, administrative clutter.

---

# Prompt 6 — War HRHB

**Asset id:** `warroom_war_HRHB`  
**Phase:** War. Operational, maps, reports, pressure; frontline and logistics in view.  
**Faction:** Croatian Republic of Herzeg-Bosnia (HRHB).

**Output:** One complete room image, **2752 × 1536 pixels**, landscape. Fixed UI scene plate for a historical Bosnian War strategy game. This is not concept art and not a cinematic illustration; it is a fixed interactive background for a game interface.

**Composition:** One complete room; fixed camera angle; slightly elevated frontal perspective; wide and stable composition. No fisheye, no Dutch angle, no dramatic tilt. No perspective exaggeration. Do not crop out desk interaction zones.

**UI-plate rules:** Strong object silhouettes, readable edges, overlay space, no clutter burying anchors, no piles crossing modal regions. All props painted into one scene; no separate sprites.

**Do not paint (leave clean wall space):** faction flag; wall calendar; ticker strip.

**Required anchors (each must be physically distinct and consistently positioned):**
- **Desk map area** — center or lower-center, largest anchor. War: tactical/operational map; frontline, sectors, or logistics; annotated but not over-cluttered.
- **Command briefing folio** — thick stamped folder; obvious authority.
- **Newspaper stack** — opposite side of desk from folio.
- **Magazine or intelligence journal** — outlineable separately.
- **Telephone** — strong silhouette.
- **Radio** — distinct from phone.
- **Faction dossier / archive binder** — prominent.
- **Wall zone for flag** — upper wall, clean.
- **Wall zone for calendar** — upper wall, separate from flag.

**Optional war-only anchors (if space allows, keep outlineable):** Typed report packet; emergency dispatch folder; citation/memorial ledger; personnel/officer dossier tray.

**Overlay-safe space:** Upper-left and upper-right wall, center-back desk, lower-center desk, one side for wider modals. No high-noise clutter there.

**War tone (HRHB):** Operational and at war. Same compact authority, regional command identity, disciplined administration; strong symbolic self-definition; confidence mixed with fragility. More maps and reports than prewar; compact but intentional; orderly and identity-conscious. Avoid: luxury office, generic modern office, sleek western styling; not weak or too polished.

**Material palette (HRHB war):** Medium-dark wood; slightly brighter desk; restrained blue and warm-neutral accents; orderly paper; more operational maps/reports than prewar.

**Style:** Historical command room; institutional; serious, sober, atmospheric; tactile and material-rich. Not sci-fi, not glossy. Materials: wood, leather, paper, cloth, metal, maps, folders, seals, desk lamps, administrative clutter.

---

## Checklist before generation

- [ ] Output dimensions set to **2752 × 1536** exactly.
- [ ] If using a **copy-paste block**: the block is standalone (negative list is already inside it). If using a **long-form prompt** (Prompt 1–6 sections): apply the Shared negative prompt from the top of this document.
- [ ] Phase (prewar vs war) and faction (RBiH, RS, HRHB) match the chosen prompt.
- [ ] All nine required anchors present and outlineable; optional war-only anchors included for war prompts if feasible.
- [ ] Wall space left empty for flag, calendar, ticker.
- [ ] Overlay-safe zones kept low-clutter.

---

## Deliverables

| # | Asset id | Phase | Faction | Filename suggestion |
|---|----------|--------|---------|----------------------|
| 1 | warroom_prewar_RBiH  | prewar | RBiH  | `warroom_prewar_RBiH.png`  |
| 2 | warroom_war_RBiH     | war    | RBiH  | `warroom_war_RBiH.png`     |
| 3 | warroom_prewar_RS    | prewar | RS    | `warroom_prewar_RS.png`    |
| 4 | warroom_war_RS       | war    | RS    | `warroom_war_RS.png`       |
| 5 | warroom_prewar_HRHB  | prewar | HRHB  | `warroom_prewar_HRHB.png`  |
| 6 | warroom_war_HRHB     | war    | HRHB  | `warroom_war_HRHB.png`     |

After approval of the six scene plates, outline hotspots over the physical anchors (same region semantics across all six where layout aligns). See [20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) §12 and `src/ui/warroom/public/data/ui/hq_clickable_regions.json` for implementation.

---

## Copy-paste blocks (all-in-one, standalone)

Each block below is **fully standalone**: copy and paste one block only. The image generator will not see the other prompts. Every block includes its own negative/avoid list at the end. No need to append anything else.

**Block 1 — Prewar RBiH**

```text
Generate a single complete room image for a historical Bosnian War strategy game warroom. This is a fixed UI scene plate, not concept art or cinematic illustration. OUTPUT: Exactly 2752 pixels wide × 1536 pixels high, landscape. One image. COMPOSITION: One complete room. Fixed camera. Slightly elevated frontal perspective. Wide and stable. No fisheye, no Dutch angle, no dramatic tilt. Strong object silhouettes, readable edges, enough empty space for modal overlays. No key objects buried under clutter; no overlapping piles crossing multiple modal regions. All props (desk, map, folders, phone, radio, papers, lamp) painted into this single scene — no separate sprites. Leave CLEAN EMPTY WALL SPACE for: (1) faction flag, (2) wall calendar, (3) ticker strip — these are drawn by the game on top. The flag and calendar zones must be FLAT AND FRONTAL: a rectangular area facing the camera (perpendicular to viewer), like a notice board or picture frame, NO perspective tilt, so the 2D overlay aligns. Use RBiH-era symbolism only (1992–1998): white shield with golden fleur-de-lis and blue vertical stripes; do NOT use the post-1998 BiH coat of arms (yellow triangle on blue). All documents, binders, stamps in scene must show RBiH crest or period-appropriate faction symbols. REQUIRED ANCHORS: Desk map area — center or lower-center, LARGEST anchor; prewar = administrative/political map, municipality/organization focus, NO frontline. Command briefing folio — thick official folder with tabs/seals, one clear side of desk. Newspaper stack — opposite side of desk from folio. Magazine or intelligence journal — separate from newspaper. Telephone — strong side silhouette. Radio — distinct from phone. Faction dossier/archive binder — prominent. Upper wall: one clean zone for flag, one clean zone for calendar. OVERLAY-SAFE: Breathing room in upper-left wall, upper-right wall, center-back desk, lower-center desk, one side. No high-noise clutter. PHASE: Prewar (peace). Institutional, preparatory, tense. Capital and organizational focus. No combat maps. FACTION: Republic of Bosnia and Herzegovina (RBiH). Modest dignified command room; mixed civilian and military administrative character; worn but not filthy; practical furniture; heavily used papers; subtle national identity; holding together under pressure. Endurance, improvised statehood, civic defense under pressure, constrained resources, seriousness and sacrifice, legitimacy under siege. NOT: luxury office, sleek modern command center, rubble melodrama, propaganda excess. MATERIALS: Dark wood; worn green or brown desk leather; practical institutional metal; paper-heavy surfaces; restrained brass; warm low light, cooler ambient shadows. Historical command room; serious, sober, atmospheric; tactile, material-rich. Wood, leather, paper, cloth, metal, map sheets, folders, seals, desk lamps, administrative clutter. NOT sci-fi, NOT glossy. AVOID / DO NOT GENERATE: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas.
```

**Block 2 — War RBiH**

```text
Generate a single complete room image for a historical Bosnian War strategy game warroom. Fixed UI scene plate, not concept art or cinematic illustration. OUTPUT: Exactly 2752 pixels wide × 1536 pixels high, landscape. One image. COMPOSITION: One complete room. Fixed camera. Slightly elevated frontal perspective. Wide and stable. No fisheye, no Dutch angle, no dramatic tilt. Strong object silhouettes, readable edges, enough empty space for modal overlays. No key objects buried under clutter; no overlapping piles crossing multiple modal regions. All props painted into this single scene — no separate sprites. Leave CLEAN EMPTY WALL SPACE for: (1) faction flag, (2) wall calendar, (3) ticker strip. Flag and calendar zones must be FLAT AND FRONTAL (facing the camera, no perspective tilt). Use RBiH-era symbolism only (1992–1998); do NOT use post-1998 BiH crest on documents. REQUIRED ANCHORS: Desk map — center or lower-center, LARGEST; war = tactical/operational map, frontline/sectors/logistics, annotated but not over-cluttered. Command briefing folio — thick stamped folder, obvious authority. Newspaper stack — opposite side of desk from folio. Magazine or intelligence journal — separate from newspaper, outlineable. Telephone — strong silhouette. Radio — distinct from phone. Faction dossier/archive binder — prominent. Upper wall: one clean zone for flag, one clean zone for calendar. OPTIONAL (include if space allows, each outlineable): typed report packet; emergency dispatch folder; citation/memorial ledger; personnel/officer dossier tray. OVERLAY-SAFE: Upper-left wall, upper-right wall, center-back desk, lower-center desk, one side. No high-noise clutter. PHASE: War. Operational; maps, reports, pressure; frontline and logistics in view. FACTION: Republic of Bosnia and Herzegovina (RBiH). Modest dignified command room; mixed civilian and military administrative character; endurance and improvised statehood under war; strained but legitimate; civic defense; constrained resources; heavily used papers; practical furniture; holding together under siege; more maps and report stacks than a prewar room. NOT: luxury office, sleek modern command center, rubble melodrama, propaganda excess. MATERIALS: Dark wood; worn green or brown leather; institutional metal; paper-heavy; restrained brass; warm low light, cooler shadows. Historical command room; serious, sober, atmospheric; tactile, material-rich. Wood, leather, paper, cloth, metal, map sheets, folders, seals, desk lamps, administrative clutter. NOT sci-fi, NOT glossy. AVOID / DO NOT GENERATE: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas.
```

**Block 3 — Prewar RS**

```text
Generate a single complete room image for a historical Bosnian War strategy game warroom. Fixed UI scene plate, not concept art or cinematic illustration. OUTPUT: Exactly 2752 pixels wide × 1536 pixels high, landscape. One image. COMPOSITION: One complete room. Fixed camera. Slightly elevated frontal perspective. Wide and stable. No fisheye, no Dutch angle, no dramatic tilt. Strong object silhouettes, readable edges, enough empty space for modal overlays. No key objects buried under clutter; no overlapping piles crossing multiple modal regions. All props (desk, map, folders, phone, radio, papers, lamp) painted into this single scene — no separate sprites. Leave CLEAN EMPTY WALL SPACE for: (1) faction flag, (2) wall calendar, (3) ticker strip. Flag and calendar zones must be FLAT AND FRONTAL (facing the camera, no perspective tilt). RS room: use **wartime RS symbolism only (1992–1995)** on documents, binders, stamps — e.g. Serbian tricolor, wartime RS insignia; do NOT use post-Dayton or post-1995 Republika Srpska coat of arms. Desk map: must show **RS territory, Serb-held areas, or RS administrative area only**; do NOT show a map of the whole of Bosnia and Herzegovina. REQUIRED ANCHORS: Desk map area — center or lower-center, LARGEST anchor; prewar = administrative/political map of RS area only, municipality/organization focus, NO frontline, NO full BiH map. Command briefing folio — thick official folder with tabs/seals, one clear side of desk. Newspaper stack — opposite side of desk from folio. Magazine or intelligence journal — separate from newspaper. Telephone — strong side silhouette. Radio — distinct from phone. Faction dossier/archive binder — prominent. Upper wall: one clean zone for flag, one clean zone for calendar. OVERLAY-SAFE: Upper-left wall, upper-right wall, center-back desk, lower-center desk, one side. No high-noise clutter. PHASE: Prewar (peace). Institutional, preparatory, tense. No combat maps. FACTION: Republika Srpska (RS). Formal military authority; austere confidence; bureaucratic force; heavy apparatus; command discipline; institutional hardness without cartoon villainy. More militarized and rigid; cleaner lines; strong command infrastructure; systematic paperwork and map handling; colder emotional temperature. Organized, weighty, deliberate, grounded and believable. NOT: theatrical villain aesthetics, modern bunker sci-fi, over-ornamentation. MATERIALS: Darker wood; colder leather tones; iron, steel, dark green, muted red-brown accents; harder shadows; restrained insignia-bearing atmosphere. Historical command room; serious, sober, atmospheric; tactile, material-rich. Wood, leather, paper, metal, folders, seals, desk lamps, administrative clutter. NOT sci-fi, NOT glossy, NOT cartoon villain. AVOID / DO NOT GENERATE: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas; map of the whole of Bosnia and Herzegovina; post-Dayton or post-1995 RS coat of arms.
```

**Block 4 — War RS**

```text
Generate a single complete room image for a historical Bosnian War strategy game warroom. Fixed UI scene plate, not concept art or cinematic illustration. OUTPUT: Exactly 2752 pixels wide × 1536 pixels high, landscape. One image. COMPOSITION: One complete room. Fixed camera. Slightly elevated frontal perspective. Wide and stable. No fisheye, no Dutch angle, no dramatic tilt. Strong object silhouettes, readable edges, enough empty space for modal overlays. No key objects buried under clutter; no overlapping piles crossing multiple modal regions. All props painted into this single scene — no separate sprites. Leave CLEAN EMPTY WALL SPACE for: (1) faction flag, (2) wall calendar, (3) ticker strip. Flag and calendar zones must be FLAT AND FRONTAL (facing the camera, no perspective tilt). RS room: use **wartime RS symbolism only (1992–1995)** on documents, binders, stamps — e.g. Serbian tricolor, wartime RS insignia; do NOT use post-Dayton or post-1995 Republika Srpska coat of arms. Desk map: must show **RS territory, Serb-held areas, or RS operational area only**; do NOT show a map of the whole of Bosnia and Herzegovina. REQUIRED ANCHORS: Desk map — center or lower-center, LARGEST; war = tactical/operational map of RS area only, frontline/sectors/logistics, annotated but not over-cluttered; NO full BiH map. Command briefing folio — thick stamped folder. Newspaper stack — opposite side of desk from folio. Magazine or intelligence journal — separate, outlineable. Telephone — strong silhouette. Radio — distinct from phone. Faction dossier/archive binder — prominent. Upper wall: one clean zone for flag, one clean zone for calendar. OPTIONAL (include if space allows, each outlineable): typed report packet; emergency dispatch folder; citation/memorial ledger; personnel/officer dossier tray. OVERLAY-SAFE: Upper-left wall, upper-right wall, center-back desk, lower-center desk, one side. No high-noise clutter. PHASE: War. Operational; maps, reports, pressure; frontline and logistics in view. FACTION: Republika Srpska (RS). Formal military authority; austere confidence; bureaucratic force; heavy apparatus; command discipline; strongest apparatus room of the three factions; more maps and operational pressure; systematic paperwork and map handling; organized, weighty, deliberate, grounded and believable. NOT: theatrical villain aesthetics, modern bunker sci-fi, over-ornamentation. MATERIALS: Darker wood; colder leather; iron, steel, dark green, muted red-brown; harder shadows; restrained insignia; more operational paperwork and map annotations than a prewar room. Historical command room; serious, sober, atmospheric; tactile, material-rich. Wood, leather, paper, metal, maps, folders, seals, desk lamps, administrative clutter. NOT sci-fi, NOT glossy. AVOID / DO NOT GENERATE: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas; map of the whole of Bosnia and Herzegovina; post-Dayton or post-1995 RS coat of arms.
```

**Block 5 — Prewar HRHB**

```text
Generate a single complete room image for a historical Bosnian War strategy game warroom. Fixed UI scene plate, not concept art or cinematic illustration. OUTPUT: Exactly 2752 pixels wide × 1536 pixels high, landscape. One image. COMPOSITION: One complete room. Fixed camera. Slightly elevated frontal perspective. Wide and stable. No fisheye, no Dutch angle, no dramatic tilt. Strong object silhouettes, readable edges, enough empty space for modal overlays. No key objects buried under clutter; no overlapping piles crossing multiple modal regions. All props (desk, map, folders, phone, radio, papers, lamp) painted into this single scene — no separate sprites. Leave CLEAN EMPTY WALL SPACE for: (1) faction flag, (2) wall calendar, (3) ticker strip. Flag and calendar zones must be FLAT AND FRONTAL (facing the camera, no perspective tilt). Use RBiH-era symbolism only (1992–1998); do NOT use post-1998 BiH crest on documents. REQUIRED ANCHORS: Desk map area — center or lower-center, LARGEST anchor; prewar = administrative/political map, municipality/organization focus, NO frontline. Command briefing folio — thick official folder with tabs/seals, one clear side of desk. Newspaper stack — opposite side of desk from folio. Magazine or intelligence journal — separate from newspaper. Telephone — strong side silhouette. Radio — distinct from phone. Faction dossier/archive binder — prominent. Upper wall: one clean zone for flag, one clean zone for calendar. OVERLAY-SAFE: Upper-left wall, upper-right wall, center-back desk, lower-center desk, one side. No high-noise clutter. PHASE: Prewar (peace). Institutional, preparatory, tense. No combat maps. FACTION: Croatian Republic of Herzeg-Bosnia (HRHB). Compact authority; regional command identity; disciplined political-military administration; limited scale but strong symbolic self-definition; confidence mixed with fragility. Tidier and more curated; strong symbolic identity in a smaller administrative-feeling space; compact but intentional command atmosphere; orderly and identity-conscious. NOT: luxury political office, generic modern European office, sleek western command-center styling; NOT weak or too polished. MATERIALS: Medium-dark wood; slightly brighter desk treatment; restrained blue and warm-neutral accents; orderly paper handling. Historical command room; serious, sober, atmospheric; tactile, material-rich. Wood, leather, paper, cloth, metal, folders, seals, desk lamps, administrative clutter. NOT sci-fi, NOT glossy. AVOID / DO NOT GENERATE: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas.
```

**Block 6 — War HRHB**

```text
Generate a single complete room image for a historical Bosnian War strategy game warroom. Fixed UI scene plate, not concept art or cinematic illustration. OUTPUT: Exactly 2752 pixels wide × 1536 pixels high, landscape. One image. COMPOSITION: One complete room. Fixed camera. Slightly elevated frontal perspective. Wide and stable. No fisheye, no Dutch angle, no dramatic tilt. Strong object silhouettes, readable edges, enough empty space for modal overlays. No key objects buried under clutter; no overlapping piles crossing multiple modal regions. All props painted into this single scene — no separate sprites. Leave CLEAN EMPTY WALL SPACE for: (1) faction flag, (2) wall calendar, (3) ticker strip. Flag and calendar zones must be FLAT AND FRONTAL (facing the camera, no perspective tilt). Use RBiH-era symbolism only (1992–1998); do NOT use post-1998 BiH crest on documents. REQUIRED ANCHORS: Desk map — center or lower-center, LARGEST; war = tactical/operational map, frontline/sectors/logistics, annotated but not over-cluttered. Command briefing folio — thick stamped folder. Newspaper stack — opposite side of desk from folio. Magazine or intelligence journal — separate, outlineable. Telephone — strong silhouette. Radio — distinct from phone. Faction dossier/archive binder — prominent. Upper wall: one clean zone for flag, one clean zone for calendar. OPTIONAL (include if space allows, each outlineable): typed report packet; emergency dispatch folder; citation/memorial ledger; personnel/officer dossier tray. OVERLAY-SAFE: Upper-left wall, upper-right wall, center-back desk, lower-center desk, one side. No high-noise clutter. PHASE: War. Operational; maps, reports, pressure; frontline and logistics in view. FACTION: Croatian Republic of Herzeg-Bosnia (HRHB). Compact authority; regional command identity; disciplined political-military administration; strong symbolic self-definition; confidence mixed with fragility; more maps and reports than a prewar room; compact but intentional; orderly and identity-conscious. NOT: luxury office, generic modern European office, sleek western styling; NOT weak or too polished. MATERIALS: Medium-dark wood; slightly brighter desk; restrained blue and warm-neutral accents; orderly paper; more operational maps and reports than a prewar room. Historical command room; serious, sober, atmospheric; tactile, material-rich. Wood, leather, paper, cloth, metal, maps, folders, seals, desk lamps, administrative clutter. NOT sci-fi, NOT glossy. AVOID / DO NOT GENERATE: separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye lens; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, haze, or darkness that obscures object outlines; dramatic human figures dominating the room; giant paper piles covering all modal-safe areas.
```
