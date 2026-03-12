# Warroom: Faction Base Rooms + Yearly War States + Overlay Surfaces

**Date:** 2026-03-08  
**Type:** Asset-generation handover — faction base rooms, yearly room aging, projected overlays  
**Status:** Active direction  
**Use:** Generate a **stable documentary-photograph room per faction**, then derive `prewar`, `year1`, `year2`, `year3`, `year4` states while preserving geometry. The **map is on the wall**: a **large cork board** that is a **placeholder only** (empty, with pins, empty frame — **no detailed map baked**); at runtime the engine **projects the full interactive map** into that quad. A separate **date / next-turn board** stays flat and frontal for runtime overlay. The **flag** is baked into the room art. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — but **keep clutter limited and organized** so all clickables remain clearly visible. No overwhelming piles.

**Reference:** [WARROOM_MASTER.md](../WARROOM_MASTER.md), [20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md).

---

## 1. Direction summary

This is the current recommended structure:

- **One physical room per faction** with stable geometry and camera.
- **Five visual states per faction:** `prewar`, `year1`, `year2`, `year3`, `year4`.
- **Year transitions happen every April**, but the **year must never be visible in the baked art**. The current year appears only via the runtime calendar / date overlay.
- **War modals remain the same from April 1992 onward.** Only the room art changes by year. Prewar is the only distinct modal phase.
- **Map on the wall:** A **large cork board** on the wall as a **placeholder only** — **empty**, or with pins / empty frame / subtle grid; **do not bake a detailed map**. At runtime the engine **projects the full interactive map** into that quad. The board must be **flat and frontal** to the camera.
- **Date / next-turn board:** A separate wall board stays **flat and frontal** for runtime overlay of current date and next-turn messaging.
- **Flag** is baked into the base art.
- **Desk:** **Moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — but **clutter limited and organized** so all clickables (telephone, radio, newspaper, etc.) remain **clearly visible and identifiable**. No overwhelming piles that bury the anchors.

This gives us stronger faction flavor, a visible yearly war arc, and stable overlay geometry without fighting desk angle or empty-desk constraints.

---

## 2. What is baked vs overlaid

### Baked into the room art

- Room identity, furniture, palette, lighting, wall wear, smoke staining, desk wear.
- **Large cork board on the wall** as a **map placeholder only** — **empty** cork, or with pins / empty frame / light grid; **no detailed map, no geography, no place names**. The engine will project the full map at runtime. The board must be flat and frontal.
- Faction-specific flag or banner.
- Separate **date / next-turn board** (flat, frontal) — can be a second board or a dedicated area; no readable text baked (blank or illegible only).
- **Desk props:** telephone, radio, lamp, ashtray, thermos, **faction newspaper stack**, folders, papers. **Clutter moderate and organized** so clickables stay visible.
- Subtle faction-specific recurring props.

### Overlaid by the engine

- **Full interactive map** projected into the **wall map quad** (the cork-board placeholder area). The engine draws the complete staff map and situational overlays there.
- **Date / next-turn board** content projected into the date-board quad.
- Existing ticker / UI chrome as needed.

### Not allowed in the baked art

- Visible year labels.
- Baked calendar year.
- Explicit dated newspapers or dated forms.
- Tactical front lines, control overlays, or unit symbols on the wall map area (those are runtime-only). **Do not bake a detailed map** on the cork board — it must be a placeholder only.

---

## 3. Hard invariants

These are non-negotiable across all yearly variants for a faction:

- **Output:** exactly **2752 × 1536**, landscape.
- **Photographic target:** must look like an **archival / journalistic / documentary interior photograph**, not concept art, not a 3D render, not a cinematic AI image.
- **Stable geometry:** same camera, same desk position, same **wall map (cork board) position**, same date-board position, same main furniture silhouettes.
- **Wall map zone:** a **large cork board** as a **placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map** — no geography, no place names, no topography. The board must be **flat and frontal** to the camera so the engine can project the full map there at runtime.
- **Date / next-turn board:** a separate wall board remains **flat, frontal, and usable for overlay**. No readable text — no English, no placeholder words (e.g. "RUNTIME OVERLAY"), no legible labels. Blank, minimal grid, or illegible/local-language scribble only.
- **Flag:** baked naturally into the room art, not overlaid.
- **Clickable / modal anchors:** **twelve distinct physical props** (see §3a) plus runtime overlay quads — each must be **fully visible and unobstructed** so `hq_clickable_regions.json` can assign non-overlapping polygons. No merging binders into one blob; Honors must include a non-binder visual (frame/medal/shelf).
- **Desk:** **moderate clutter only** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles that bury the telephone, radio, or newspapers.
- **Text:** any visible text must be Bosnian / Croatian / Serbian as appropriate, or illegible. No readable English.
- **Upper-right wall:** no distracting readable text.
- **No digital screens** or modern displays.
- **Telephone must be intact** and not mangled.
- **No visible year anywhere in the room art.**
- **No people, no figures.** The room must be empty of persons — an unoccupied command room, as if photographed between briefings.

---

## 3a. Twelve-anchor contract (baked plate — no sprites)

**Purpose:** One baked image per state; every planned warroom modal has a **dedicated silhouette** so hotspot outlining never fights overlapping folders. Prewar may show war-only anchors **dormant** (empty rack, empty frame) so **geometry matches** Year1–Year4 and region JSON stays stable.

**Rule:** Exactly **one** telephone, **one** radio. Desk clutter stays **moderate** — extra anchors use **wall, coatrack, distinct stacks**, not a second telephone. **Coatrack:** Always **faction army** uniform and **faction-specific military cap**, with **visible army insignia** (ARBiH, VRS, HVO as appropriate); Gemini knows these armies.

| # | Anchor ID (suggested) | Room object | Modal / behavior |
|---|------------------------|-------------|------------------|
| 1 | `wall_flag_area` | Flag on vertical pole, hanging down | Faction Overview |
| 2 | `desk_map` | Large cork board, empty/placeholder only | Tactical map projection |
| 3 | `wall_calendar_area` | Date / next-turn board, blank, flat | Advance turn overlay |
| 4 | `diplomatic_telephone` | One telephone | Diplomacy (+ IVP footer) |
| 5 | `desk_radio` | One radio | News ticker |
| 6 | `newspaper_stack` | Faction newspaper stack | Newspaper |
| 7 | `command_briefing_folio` | Binder stack (command briefing only) | Command Briefing |
| 8 | `intelligence_journal` | Journal/magazine distinct from binders | Magazine |
| **9** | `commander_coatrack` | **Coatrack with faction army uniform jacket + faction-specific military cap, both with visible army insignia (ARBiH, VRS, HVO as appropriate).** Gemini knows these armies. Not on flag pole. | Commander Register |
| **10** | `enclave_dispatch_folder` | **One folder — red tag** — separate from item 7 | Enclave Crisis |
| **11** | `intelligence_packet` | **Sealed envelope stack** — separate from 7 and 8 | Turn-End Intelligence Packet |
| **12** | `honors_memorial` | **Shelf/corner: citation booklet with ribbon; medal ribbon bar; no framed photos; no candle** | Honors and Memorials |

**Prompt fragment — append to shared core (§8) and to every faction block:**

```text
Twelve distinct anchors — all fully visible and unobstructed. Exactly one telephone and exactly one radio.
9. Wall area: coatrack (commander_coatrack) — **faction army** uniform jacket and **faction-specific military cap**, with **visible army insignia** (ARBiH, VRS, HVO as appropriate); not blocking flag, cork board, date board.
10. Desk: enclave dispatch folder (enclave_dispatch_folder) — one folder with visible urgent tagging (red string, stamp, band); visually separate from the command briefing binder stack.
11. Desk: intelligence packet (intelligence_packet) — sealed envelope stack; distinct from binders and from the intelligence journal.
12. Wall corner: honors memorial (honors_memorial) — small shelf; wall niche **reserved in composition** for the war-phase memorial (Honors modal is war-only). **Prewar:** shelf present but visually neutral — empty; one plain book/box; no ribbons, no citation booklets, no memorial elements. **War (Year1+):** citation booklet (closed) with ribbon; medal ribbon bar in shallow shadow box; no framed photographs; no faction symbols. Optionally evergreen sprig, empty frame. Must not read as the same object as command_briefing_folio.
Avoid: merging any of 7–12 into a single pile; second telephone; second radio; coatrack replacing flag pole; coatrack attached to flag pole.
```

**Desk layout note:** Items 4–8 stay as today (telephone, radio, journal, binders, newspaper). Items 10–11 must have **clear gap** or separate plane so outline tools get clean quads. If the model stacks 10 on 7, reject and regenerate.

**Honors memorial — display:** The modal is for sacrifice, recognition, and memory (citation/memorial ledger). Specifying "framed photo(s)" led to a **personal portrait on the main desk**, which we do not want. Prefer a **citation-focused** display: citation booklet (closed) with ribbon; medal ribbon bar on a shelf in a shallow shadow box; no framed photographs and **no faction symbols, shields, crests, or flag-derived emblems** anywhere in the memorial zone. Optionally one static symbolic element: evergreen sprig, empty frame. No candle — the room is a single photo moment; nothing that implies animation. That keeps the anchor clearly "honors and citations" without inviting a face on the desk.

**Honors memorial by year (more fallen as war drags on):** The Honors/Memorials modal is **war-only** (WARROOM_MASTER). **Prewar:** Reserve the shelf — same wall corner/shelf position in the composition, but **visually neutral**: empty shelf or one plain book/box; **no ribbons, no citation booklets, no memorial elements** so it does not read as an active memorial. **Year1 (1992):** First appearance of memorial: one citation booklet (closed) with ribbon; one medal ribbon bar in a shallow shadow box; minimal. **Year2 (1993):** two medal ribbon bars; two citation booklets; shelf slightly fuller. **Year3 (1994):** three ribbon bars; two to three citation booklets; shelf clearly fuller. **Year4 (1995):** multiple ribbon bars; several citation booklets; shelf dense, visibly full. Same shelf position every year; only from Year1 onward do citation/ribbon items accumulate (no faces, no faction crests).

---

## 4. Photorealism target

Use this visual target for every prompt:

- **archival press photograph**
- **documentary interior photograph**
- **1990s photojournalism**
- **matter-of-fact composition**
- **available light + one practical lamp**
- **real materials, real wear, believable clutter**

The image should look like a real room that was photographed, not a scene designed to look impressive.

### Add this to every prompt

```text
The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. The room should feel photographed, not staged for a poster.
```

### Negative prompt language to keep

```text
Avoid: AI-art look, cinematic concept art, stylized drama, hyper-clean 3D render, exaggerated mood lighting, plastic-looking materials, glossy surfaces, fake shallow depth of field, over-sharpened textures, surreal symmetry, luxury production design, dramatic color grading, poster-like staging, heroic composition, video-game splash art. **No people; no figures in the room — empty, unoccupied space.**
```

---

## 5. Faction identity and recurring props

Use these as **low-salience recurring props**, not as main anchors and not as substitute modals.

### RBiH

- Tone: improvised state command, survivalist bureaucracy, dignified under scarcity.
- **Coatrack (RBiH only):** **Green beret** and uniform jacket. **Prewar:** visible **TO BiH (Teritorijalna odbrana BiH)** insignia. **Year1–Year4 (wartime):** visible **Army of RBiH (ARBiH)** insignia.
- Recurring props:
  - practical thermos or enamel mug
  - mixed civilian-military file folders
  - spare radio cable / handset component
  - logistics or dispatch forms at the side

### RS

- Tone: colder, more bureaucratic, more severe and administrative.
- **Lamp:** **desk lamp** — on the desk; position it so it does **not** obstruct the cork board or the flag (flag is on the right). Same desk lamp in all yearly variants.
- Recurring props:
  - heavier field or command telephone
  - rigid stamped binders or document trays
  - harder cigarette pack / small glass
  - optional discreet bottle as side prop only, never central

### HRHB

- Tone: compact regional HQ, tidier and more orderly, still pressured.
- Recurring props:
  - clipped dispatch folders
  - tidier desk accessory grouping
  - restrained ashtray / cigarette case
  - compact office lamp or cleaner document stand

Rule: recurring props may persist and age across years, but they must never obstruct the flag or other modal elements, or block the wall map (cork board) or date board from view.

---

## 6. Year states

Use these labels internally in prompts and docs:

- **Prewar** — institutional, tense, preparatory
- **Year1** — first wartime year; room becomes activated and improvised
- **Year2** — entrenched routine; more paperwork and operational density
- **Year3** — accumulated strain; heavier wear and fatigue
- **Year4** — hardened exhaustion; same room, visibly overused and tired

These are **April-to-April** states, but the room itself must not display a printed year.

**Time of day — lights dim across the war:** Use a fixed progression so the room slowly moves from day to night across the years, culminating in full night in Year4 (1995). **Curtains** should progress in step: prewar open → Year1 open or slightly drawn → Year2 half-closed → Year3 mostly closed → Year4 fully closed (interior light only).

**RBiH darkness scale (1 = brightest, 5 = full dark):** RBiH uses a specific arc — starts mid-scale, darkens through siege peak, then brightens toward 1995.
- **Scale:** 1 = bright afternoon; 2 = soft daytime; 3 = overcast / subdued midday; 4 = late afternoon / early evening, lamp needed; 5 = full dark, interior light only.
- **Prewar (1991):** **3** — overcast or subdued midday; room neither bright nor dark.
- **Year1 (1992):** **4** — late afternoon / early evening; shadows lengthen, desk lamp in use.
- **Year2 (1993):** **5** — full dark; window black or very dim, room lit by lamp and practicals only (siege longest night).
- **Year3 (1994):** **2** — softening; soft daytime, room brightening again.
- **Year4 (1995):** **1** — bright afternoon; hopeful, clear light (restoration).

Generic progression (other factions may differ):
- **Prewar:** **Daytime** — natural light from the window, clear archival feel. Curtains open or slightly drawn.
- **Year1 (1992):** **Daytime or soft afternoon** — room still busy in daylight. Curtains open or only slightly more drawn.
- **Year2 (1993):** **Late afternoon / early evening** — light beginning to go, more reliance on (standing or desk) lamp. Curtains half-closed or more drawn.
- **Year3 (1994):** **Evening** — dimmer, window darker, room lit mainly by lamp(s). Curtains mostly closed; interior light dominant.
- **Year4 (1995):** **Full night** — window dark or very dim, room lit by (standing or desk) lamp and practicals only; strong late-war feel. Curtains fully closed; interior lighting only.

Geometry and overlay zones must stay consistent across all times of day. Document the chosen time of day per image when measuring quads.

### Modals and anchors by time

- **Prewar:** distinct prewar modal set.
- **Year1-Year4:** same war modal set and same clickable anchors from April 1992 onward.
- The room art evolves, but the interaction grammar does not.

---

## 7. Prompt structure

For each faction:

1. Generate **Prewar** from scratch.
2. Generate **Year1** as a follow-up to Prewar.
3. Generate **Year2** as a follow-up to Year1.
4. Generate **Year3** as a follow-up to Year2.
5. Generate **Year4** as a follow-up to Year3.

Every follow-up must explicitly preserve:

- same camera angle
- same desk shape and position
- same **wall map (cork board + pinned map)** position and proportions
- same date-board position
- same flag placement
- same core furniture silhouettes

Only the **wear, pressure, clutter density, smoke traces, paperwork density, and emotional tone** should intensify over the years.

---

## 8. Shared prompt core

The text below is **inlined into every prompt block** in §9, so you can copy-paste a single prompt without appending anything. It is repeated here for reference and for editing the standard constraints in one place.

### 8.1 Initial (P1 / baseline) prompts — copy-paste block

**Use this only for the first image in each faction series (Prewar).** It includes dimensions, master rules, and negative prompt so the block is self-contained. Follow-up prompts (Year1–Year4) start with "Use the attached image" and keep dimensions for consistency.

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Master — composition and requirements:
- One complete room image; wide composition; fixed camera angle.
- **One primary command desk only** — no second table, no extra foreground furniture. The desk is the **main foreground element**: avoid a large empty strip of floor between camera and desk; the desk should read as dominant in the frame (e.g. at most a narrow strip of rug in front; at most a narrow strip of floor in front — but do not push the desk into the midground with a wide empty foreground). **Tight framing:** Frame the shot so the desk is in the **immediate foreground** — at most a narrow strip of floor and rug visible in front of the desk; no wide empty floor between camera and desk.
- Strict head-on (frontal) perspective: camera directly faces the back wall. Cork board and date board appear as flat rectangles with minimal perspective distortion for projection.
- No fisheye, no Dutch angle, no dramatic tilt, no angled views, no three-quarter views of the back wall.
- Designed for later hotspot outlining: strong object silhouettes, readable edges, no key objects buried under clutter, no overlapping piles crossing multiple modal regions.
- All props painted into one coherent scene; no separate sprite; no floating-prop assumptions. The only runtime-rendered element is the calendar; faction flag and ticker are baked in.
- Must include (painted in): faction flag; central desk map placeholder (cork board, empty); command briefing folio; newspaper stack; magazine; intelligence journal; one telephone; one radio; faction dossier; archive binder; clean wall space for calendar; **coatrack with faction army uniform jacket and faction-specific military cap, both with visible army insignia (ARBiH, VRS, HVO as appropriate)**; one urgent-tagged dispatch folder (red tag); sealed envelope stack; honors memorial (citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle). Twelve distinct anchors total; each fully visible and unobstructed.

Avoid (negative prompt):
- Separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, darkness that obscures object outlines; dramatic human figures; giant paper piles covering modal-safe areas; AI-art look; cinematic concept art; glossy render; plastic materials; over-sharpening; fake depth of field; dramatic poster composition; visible printed year; dated newspapers, dated forms; mangled phone; white placeholder rectangles; people, figures in the room — the space must be empty and unoccupied; readable English; placeholder text on wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; **large empty floor strip between camera and desk; desk pushed to midground; single loose sheet instead of a visible newspaper stack; generic military cap without visible army insignia; generic military jacket without visible army insignia.**
```

### 8.2 Shared core (inlined into every prompt, including follow-ups)

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter.

On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere.

Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. **Twelve-anchor contract (§3a):** also bake **coatrack with faction army uniform and faction-specific cap, visible insignia (ARBiH/VRS/HVO)** (commander register), **urgent-tagged folder** (enclave crisis), **sealed packet/envelopes** (intelligence packet), and **honors memorial** (citation booklet with ribbon; medal ribbon bar on shelf; no framed photos; no candle) — each distinct silhouette, non-overlapping, one telephone and one radio only. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.**

Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

---

## 9. Prompt pack

**Prompt precision:** No "or" in copy-paste prompt text. Use semicolons to list alternatives (e.g. "generic military cap without visible army insignia; generic military jacket without visible army insignia"). Keeps prompts unambiguous for the model.

Each prompt block below is a single copy-paste prompt: everything is inlined (no separate appendix). RBiH (9.1–9.5) and RS (9.6–9.10) share the same structure for direct comparison.

### 9.1 RBiH — Prewar (initial — copy-paste as-is)

```text
Create a single full-scene warroom image for the Republic of Bosnia and Herzegovina command environment in 1991.

- **Output: Exactly 2752 × 1536 pixels, landscape.**
- **Documentary realism, journalistic photography style.**
- **Empty room, no people, unoccupied, no human figures.**
- **View: Strict head-on (frontal) perspective.** Camera directly facing the back wall. The back wall is the primary plane.
- **Flat surfaces:** One large cork board and one whiteboard on the back wall must appear as flat rectangles with minimal perspective distortion for projection.

Architectural details (Restore Richness):
- **High ceilings, ornate white crown molding.**
- **Large wooden-framed windows with heavy velvet drapes (dark green).**
- **Flooring:** Polished parquet wood floor with a large, worn rectangular rug under the desk.
- **Furniture:** One primary command desk only — no second table; no extra foreground furniture. **Massive dark oak institutional desk as the main foreground element** (do not push it to midground; avoid a large empty strip of floor between camera and desk). **Tight framing:** desk in immediate foreground; at most a narrow strip of floor/rug in front; no wide empty floor. High-backed executive leather chair; a **coat rack** in the corner holding **uniform jacket and green beret, with visible TO BiH (Teritorijalna odbrana BiH) insignia** (Commander Register anchor; prewar = Territorial Defense of BiH; Gemini knows TO BiH).

Wall zones (no overlap):
1. **Map placeholder:** Large cork board in its own zone, **empty** with a few pins only. No detailed map, no geography.
2. **Date placeholder:** Whiteboard in its own zone; **fully blank; illegible only** (no English words, no year).
3. **Flag:** Right side of the room. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). 1992–1998 RBiH design (white, blue shield, fleurs-de-lis). Crest right-side up. No post-1998 symbols.

Electronics & objects (twelve modal anchors — all distinct and unobstructed; no desk map baked):
- **Telephone:** Black rotary phone; clearly visible; nothing stacked on it.
- **Radio:** Institutional radio (olive green); clearly visible; nothing on top of it.
- **Desk lamp:** One practical desk lamp on the command desk, present already in prewar but switched **off**. Position it so it does **not** obstruct the cork board; does **not** obstruct the flag; does **not** obstruct the telephone; does **not** obstruct the radio.
- **Newspaper stack:** **Oslobođenje** — a broadsheet newspaper stack **clearly visible** on the desk (folded broadsheet; several issues so it reads unmistakably as a newspaper, not as generic papers). Must be identifiable as Oslobođenje; headlines and text illegible.
- **Command briefing folio:** One distinct folder; no English text; no post-1998 symbols.
- **Intelligence journal:** One magazine; no English on cover/spine; no post-1998 symbols.
- **Enclave dispatch folder:** One folder with red tag; visually separate from the command briefing folio.
- **Intelligence packet:** Sealed envelope stack; distinct from binders and from the intelligence journal.
- **Honors memorial:** Small shelf; wall niche **reserved for war-phase memorial**. **Prewar:** keep it **visually neutral** — empty shelf; one plain book/box; **no ribbons, no citation booklet, no memorial elements**. Must not read as an active memorial (Honors modal is war-only). Not merged with the binder stack. No candle.
- **Mugs/cups:** With beverage only; **no pens inside**.
- **No English titles.**

Lighting: **3 on darkness scale** (1 = bright afternoon, 5 = full dark) — overcast, subdued midday; room neither bright nor dark; natural light from the window but not strong mid-morning.
```

### 9.2 RBiH — Year1

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year1 of wartime use: more urgency, more side paperwork, slightly more smoke residue, more visible use of ashtray, more radio-use feeling, stronger sense of operational activation. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Honors memorial:** Year1 — first appearance of memorial: one citation booklet (closed) with ribbon; one medal ribbon bar in shallow shadow box; minimal (more fallen). No faces, no faction crests.

**Coatrack:** **Green beret** and uniform jacket with **visible Army of RBiH (ARBiH) insignia** (wartime; same coatrack position as prewar, now ARBiH).

**Lighting: 4 on darkness scale** (1 = bright afternoon, 5 = full dark) — late afternoon / early evening; shadows lengthen, desk lamp in use; room still busy but light beginning to go.

RBiH tone: improvised state command adapting under pressure, but still energetic rather than exhausted. Keep the thermos, mixed folders, and practical field-office feel.

Do not add visible year markings. Do not change the interaction anchors. **Cork board and whiteboard must remain clear** — cork board empty; pushpins only (no notes, papers, text); whiteboard completely blank (no grid, text, symbols). Same as prewar in every year.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.3 RBiH — Year2

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year2 of wartime use: entrenched command routine, denser paperwork, more worn surfaces, more cigarette traces, more used lamp and desk surfaces, stronger logistical and administrative burden. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Honors memorial:** Year2 — three ribbon bars; two to three citation booklets; shelf clearly fuller (more fallen). No faces, no faction crests.

**Coatrack:** **Green beret** and uniform jacket with **visible Army of RBiH (ARBiH) insignia** (wartime).

**Lighting: 5 on darkness scale** (full dark) — window black, very dim, room lit by desk lamp and practicals only; siege longest night.

RBiH tone: still improvised and dignified, but increasingly burdened and resource-stretched. Keep the recurring practical props and let them look more used, not replaced.

Do not add visible year markings. Do not change the interaction anchors. **Cork board and whiteboard must remain clear** — cork board empty; pushpins only (no notes, papers, text); whiteboard completely blank (no grid, text, symbols). Same as prewar in every year.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.4 RBiH — Year3

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year3 of wartime use: accumulated fatigue, darker wear patterns, more persistent smoke staining, more paperwork density at the sides, more visibly overused furniture and desk surfaces. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Honors memorial:** Year3 — multiple ribbon bars; several citation booklets; shelf dense (more fallen). No faces, no faction crests.

**Coatrack:** **Green beret** and uniform jacket with **visible Army of RBiH (ARBiH) insignia** (wartime).

**Lighting: 2 on darkness scale** (1 = bright afternoon, 5 = full dark) — softening; soft daytime, room brightening again.

RBiH tone: survivalist bureaucracy under prolonged strain. The room should feel held together through necessity and discipline, not theatrical destruction.

Do not add visible year markings. Do not change the interaction anchors. **Cork board and whiteboard must remain clear** — cork board empty; pushpins only (no notes, papers, text); whiteboard completely blank (no grid, text, symbols). Same as prewar in every year.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.5 RBiH — Year4

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year4 of wartime use: hardened exhaustion, deep wear, tired surfaces, more severe signs of long duration, but the room is still functioning as a command space. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Honors memorial:** Year4 — memorial at fullest; multiple ribbon bars, several citation booklets; shelf visibly full of citations and ribbons (more fallen). No faces, no faction crests.

**Coatrack:** **Green beret** and uniform jacket with **visible Army of RBiH (ARBiH) insignia** (wartime).

**Lighting: 1 on darkness scale** (bright afternoon) — hopeful, clear light; restoration feel.

RBiH tone: heavily burdened but still dignified and operational. No theatrical ruin. No collapse. Just the visible cost of long war use.

Do not add visible year markings. Do not change the interaction anchors. **Cork board and whiteboard must remain clear** — cork board empty; pushpins only (no notes, papers, text); whiteboard completely blank (no grid, text, symbols). Same as prewar in every year.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.6 RS — Prewar (initial — copy-paste as-is)

RS prompts below are aligned with the RBiH pack: same structure (daytime/archival Prewar, explicit wall/desk instructions, shared core), same yearly follow-up pattern and lighting progression, with RS tone (colder, bureaucratic, severe) and period symbolism (1992–1995, no post-Dayton).

**Lamp:** RS uses a **desk lamp** on the desk; position it so it does not obstruct the cork board; does not obstruct the flag (flag is on the right).

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Master — composition and requirements:
- One complete room image; wide composition; fixed camera angle.
- **One primary command desk only** — no second table, no extra foreground furniture. The desk is the **main foreground element**: avoid a large empty strip of floor between camera and desk; the desk should read as dominant in the frame (e.g. at most a narrow strip of rug in front; at most a narrow strip of floor in front — but do not push the desk into the midground with a wide empty foreground). **Tight framing:** Frame the shot so the desk is in the **immediate foreground** — at most a narrow strip of floor and rug visible in front of the desk; no wide empty floor between camera and desk.
- Strict head-on (frontal) perspective: camera directly faces the back wall. Cork board and date board appear as flat rectangles with minimal perspective distortion for projection.
- No fisheye, no Dutch angle, no dramatic tilt, no angled views, no three-quarter views of the back wall.
- Designed for later hotspot outlining: strong object silhouettes, readable edges, no key objects buried under clutter, no overlapping piles crossing multiple modal regions.
- All props painted into one coherent scene; no separate sprite; no floating-prop assumptions. The only runtime-rendered element is the calendar; faction flag and ticker are baked in.
- Must include (painted in): faction flag; central desk map placeholder (cork board, empty); command briefing folio; newspaper stack; magazine; intelligence journal; one telephone; one radio; faction dossier; archive binder; clean wall space for calendar; **coatrack with faction army uniform jacket and faction-specific military cap, both with visible army insignia (ARBiH, VRS, HVO as appropriate)**; one urgent-tagged dispatch folder (red tag); sealed envelope stack; honors memorial (citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle). Twelve distinct anchors total; each fully visible and unobstructed.

Avoid (negative prompt):
- Separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, darkness that obscures object outlines; dramatic human figures; giant paper piles covering modal-safe areas; AI-art look; cinematic concept art; glossy render; plastic materials; over-sharpening; fake depth of field; dramatic poster composition; visible printed year; dated newspapers, dated forms; mangled phone; white placeholder rectangles; people, figures in the room — the space must be empty and unoccupied; readable English; placeholder text on wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; **large empty floor strip between camera and desk; desk pushed to midground; single loose sheet instead of a visible newspaper stack; generic military cap without visible army insignia; generic military jacket without visible army insignia.**

Camera: strictly straight-on frontal view. Camera faces the back wall directly — no angle from the left; no angle from the right. Back wall (cork board and whiteboard) appears as a flat rectangle perpendicular to the viewer. Desk is front-on; no diagonal recession. Camera at desk height; slightly above; no low angle. All vertical lines (window frame, wall edges, board sides) parallel; no converging perspective.

Framing: the entire cork board and the entire whiteboard must be fully inside the image frame. Do not crop the whiteboard on the right; do not crop the whiteboard on any edge. Do not crop the cork board. Compose so the right edge of the image falls to the right of the whiteboard. The whiteboard can be smaller than the cork board; both must be fully visible.

Generate a Republika Srpska command room in the tense prewar period (1991). The room should feel colder, more bureaucratic, and more severe than a civilian office — institutional and administrative, not yet fully consumed by long war routine.

Lighting and curtains (Prewar): Sunny daytime. Strong natural light from the window; the room is bright and clear. Curtains open; only slightly drawn so the window lets in full daylight. No interior lamp needed as primary light. No smoke in the air; no smoke haze.

Window: old-style curtains — period-appropriate fabric (e.g. lace and a heavier draw curtain), open; slightly drawn to show sunny day outside. Not a bare window.

RS identity: wartime-era RS (1992–1995) only. Plain tricolor only: three horizontal stripes — red (top), blue (middle), white (bottom). No crest, no emblem. No post-2000; no post-Dayton RS symbolism. RS room (distinct from other factions): the back wall has dark vertical wood paneling — dark reddish-brown; similar tone.

Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag).

Twelve distinct anchors — all fully visible and unobstructed (items 1–8 unchanged; 9–12 per §3a). Exactly one telephone and exactly one radio. **Lamp: desk lamp** — on the desk. Placement rules: (1) Position the desk lamp so it does **not** obstruct the cork board — do not place the lamp in front of the cork board; do not place the lamp in the line of sight between viewer and cork board. (2) Position the desk lamp so it does **not** obstruct the flag (flag is on the right). (3) The telephone must not obstruct the radio — place the telephone and radio so that each is fully visible and neither blocks the other.
1. Wall: flag on a vertical pole in a floor stand; in a base (wall_flag_area) — one pole only; flag hanging down. **The flag MUST stay on the right side of the room, between the cork board and whiteboard.** Nothing in front of the flag.
2. Wall: large cork board as map placeholder only (desk_map). Empty; pushpins only — no notes, no papers, no text. Flat and frontal, fully in frame. The desk lamp must not be placed in front of the cork board; the cork board must remain fully visible.
3. Wall: separate date / next-turn board (whiteboard) (wall_calendar_area) — flat and frontal, completely blank, fully in frame. Whiteboard can be smaller than the cork board; entire whiteboard visible, not cropped.
4. Desk: one telephone only (diplomatic_telephone) — fully visible; the telephone must not obstruct the radio.
5. Desk: one radio only (desk_radio) — fully visible; the radio must not be obstructed by the telephone.
6. Desk: newspaper stack (newspaper_stack) — masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations (gilded lettering, gold outline, gold band/emblem). Top newspaper fully visible; no loose papers; no envelopes on top covering the masthead.
7. Desk: command briefing folio (command_briefing_folio) — one clear stack of binders; fully visible and unobstructed.
8. Desk: intelligence journal (intelligence_journal) — one clearly identifiable journal, distinct from the binder stack; fully visible and unobstructed.
9. Wall area: coatrack (commander_coatrack) — **VRS** uniform jacket and **Serb traditional military cap** (e.g. šajkača; period-appropriate Serb military cap; let Gemini interpret), with **visible VRS insignia**; not on flag pole; not blocking cork board, date board, desk items.
10. Desk: enclave dispatch folder (enclave_dispatch_folder) — one folder with red tag; separate silhouette from command briefing binder stack (item 7).
11. Desk: intelligence packet (intelligence_packet) — sealed envelope stack; distinct from binders (7) and journal (8).
12. Wall corner: honors memorial (honors_memorial) — citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle; not merged with binder stack.

Desk: front-on to camera; moderate clutter; all twelve anchors distinct and unobstructed. **Desk lamp on the desk** — position it so it does not obstruct the cork board, the flag. The items MUST stay in the exact same positions as the previous image. From left to right: newspaper stack and binders on the left, ashtray/glass/cigarettes in the center, journal center-right, telephone on the right, radio on the far right; desk lamp on the desk (e.g. left), not in front of cork board, flag. Let me repeat — lamp must NOT obstruct the cork board; must NOT obstruct the flag.

Place the telephone and radio so the telephone does not obstruct the radio — both fully visible.

Ashtray, cigarette pack; small glass, restrained papers — do not cover the flag, telephone, radio, newspaper stack, binders, or journal.

Do not put loose sheets; do not put envelopes on top of the newspaper stack. One telephone, one radio.

No smoke in the air; no smoke haze.

Mood: austere, administrative, formal, dark wood paneling and colder walls. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph of an actual 1990s command room, not AI art; not concept art. Documentary realism: natural light, believable materials, real wear, physically plausible clutter. Straight-on frontal composition; verticals parallel. Prewar: sunny daytime, curtains open; slightly drawn, bright room. RS: dark vertical wood paneling. Flag on a vertical pole in a floor stand; flag hanging down; flag and pole fully visible. Cork board fully visible — lamp not in front of cork board. Telephone and radio both fully visible — telephone not obstructing radio. Cork board and whiteboard both fully in frame. One telephone, one radio. All twelve anchors fully visible and unobstructed. Newspaper: masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations; top paper unobstructed. One distinct journal/magazine. Any visible text local-language; illegible only. No readable English. No digital screens. Telephone intact. No people; no figures in the room — empty and unoccupied. No smoke in the air; no smoke haze.

Avoid: AI-art look, cinematic concept art, angled; corner perspective, low camera angle, desk receding diagonally, flag on a wall-mounted bracket; wall fixture, desk lamp; any object in front of the flag, lamp obstructing; lamp in front of the cork board (cork board must be fully visible), telephone obstructing the radio (both must be fully visible and separate), second flag pole; empty pole, leaning; tilted pole, flag stretched flat; flag pinned to the wall, whiteboard; cork board cropped at the edge, bare window without curtains, newspaper masthead without golden decorations, loose papers; envelopes on top of the newspaper stack, lamp; other props covering any clickable anchor, wrong flag order, second telephone; second radio, RS crest; emblem on flag, cork board with notes; papers; text, date board with grid; scribbles, obstructed; merged anchors, converging verticals, fisheye, smoke in the air; smoke haze, people in the room, **desk lamp obstructing cork board or flag**.

Let me repeat — lamp must NOT obstruct the cork-board.
```

### 9.7 RS — Year1 (1992)

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact base room. Keep the exact same geometry, furniture, flag, and camera angle. The cork board and whiteboard must remain completely blank.

Camera: strictly straight-on frontal view. Camera faces the back wall directly — no angle from the left; no angle from the right. Back wall (cork board and whiteboard) appears as a flat rectangle perpendicular to the viewer. Desk is front-on; no diagonal recession. Camera at desk height; slightly above; no low angle. All vertical lines (window frame, wall edges, board sides) parallel; no converging perspective.

Framing: the entire cork board and the entire whiteboard must be fully inside the image frame. Do not crop the whiteboard on the right; do not crop the whiteboard on any edge. Do not crop the cork board. Compose so the right edge of the image falls to the right of the whiteboard. The whiteboard can be smaller than the cork board; both must be fully visible.

Generate a Republika Srpska command room in Year 1 of wartime use (1992). The room is newly operationalized: stronger command pressure, more active communications feel.

**Lighting — must change from 1991:** Soft afternoon light. Draw the heavy drapes on the left side of the window so they cover about one third of the window glass. The sheer white lace curtains remain as they are. The desk lamp remains off.

**Room stress (non-interactive areas only):** Add **early signs of wear** to walls and ceiling: slight hairline cracks, minor discoloration, faint stains on the dark wood paneling. Do not alter the cork board, whiteboard, flag placement; do not add clutter; do not add writing to the cork board; do not add writing to the whiteboard. They remain completely blank.

**Wear and Tear (Year 1):** Slight increase in use. Add a few more cigarette butts to the ashtray. Add a few more papers at the edges of the desk.

**Flag:** Same plain tricolor design (red, blue, white horizontal stripes) on a vertical pole, right side. **Add light wear to the flag**: slight fading; dust, minor edge wear; still clearly serviceable. **Never so damaged that it should be replaced.** Gold finial and tassel. Fully visible; no overlap with cork board; no overlap with whiteboard.

Window: old-style curtains — period-appropriate fabric (heavy tan drapes and sheer white lace curtains). The heavy drapes are pulled slightly more closed than before, covering about one third of the window glass to soften the afternoon light. Not a bare window.

RS identity: wartime-era RS (1992–1995) only. Plain tricolor only: three horizontal stripes — red (top), blue (middle), white (bottom). No crest, no emblem. No post-2000; no post-Dayton RS symbolism. RS room (distinct from other factions): the back wall has dark vertical wood paneling — dark reddish-brown; similar tone.

Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag).

Twelve distinct anchors — all fully visible and unobstructed (items 1–8 unchanged; 9–12 per §3a). Exactly one telephone and exactly one radio. **Lamp: desk lamp** — on the desk. Placement rules: (1) Position the desk lamp so it does **not** obstruct the cork board — do not place the lamp in front of the cork board; do not place the lamp in the line of sight between viewer and cork board. (2) Position the desk lamp so it does **not** obstruct the flag (flag is on the right). (3) The telephone must not obstruct the radio — place the telephone and radio so that each is fully visible and neither blocks the other.
1. Wall: flag on a vertical pole in a floor stand; in a base (wall_flag_area) — one pole only; flag hanging down. **The flag MUST stay on the right side of the room, between the cork board and whiteboard.** Nothing in front of the flag.
2. Wall: large cork board as map placeholder only (desk_map). **Completely blank.** No map outline, no grid, no pushpins, no markings, no geography. Empty cork surface only. Flat and frontal, fully in frame. The desk lamp must not be placed in front of the cork board; the cork board must remain fully visible.
3. Wall: separate date / next-turn board (whiteboard) (wall_calendar_area) — flat and frontal, **completely blank** (no grid, no text, no symbols), fully in frame. Whiteboard can be smaller than the cork board; entire whiteboard visible, not cropped.
4. Desk: one telephone only (diplomatic_telephone) — fully visible; the telephone must not obstruct the radio.
5. Desk: one radio only (desk_radio) — fully visible; the radio must not be obstructed by the telephone.
6. Desk: newspaper stack (newspaper_stack) — masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations (gilded lettering, gold outline, gold band/emblem). Top newspaper fully visible; no loose papers; no envelopes on top covering the masthead.
7. Desk: command briefing folio (command_briefing_folio) — one clear stack of binders; fully visible and unobstructed.
8. Desk: intelligence journal (intelligence_journal) — one clearly identifiable journal, distinct from the binder stack; fully visible and unobstructed.
9. Wall area: coatrack (commander_coatrack) — **VRS** uniform jacket and **Serb traditional military cap** (e.g. šajkača; period-appropriate Serb military cap; let Gemini interpret), with **visible VRS insignia**; not on flag pole; not blocking cork board, date board, desk items.
10. Desk: enclave dispatch folder (enclave_dispatch_folder) — one folder with red tag; separate silhouette from command briefing binder stack (item 7).
11. Desk: intelligence packet (intelligence_packet) — sealed envelope stack; distinct from binders (7) and journal (8).
12. Wall corner: honors memorial (honors_memorial) — citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle; not merged with binder stack.

Desk: front-on to camera; moderate clutter; all twelve anchors distinct and unobstructed. **Desk lamp on the desk** — position it so it does not obstruct the cork board, the flag. The items MUST stay in the exact same positions as the previous image. From left to right: newspaper stack and binders on the left, ashtray/glass/cigarettes in the center, journal center-right, telephone on the right, radio on the far right; desk lamp on the desk (e.g. left), not in front of cork board, flag. Let me repeat — lamp must NOT obstruct the cork board; must NOT obstruct the flag.

Place the telephone and radio so the telephone does not obstruct the radio — both fully visible.

Ashtray, cigarette pack; small glass, restrained papers — do not cover the flag, telephone, radio, newspaper stack, binders, or journal.

Do not put loose sheets; do not put envelopes on top of the newspaper stack. One telephone, one radio.

No smoke in the air; no smoke haze.

Mood: bureaucratic and forceful, newly operationalized, not yet exhausted. Hard administrative atmosphere. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph of an actual 1990s command room, not AI art; not concept art. Documentary realism: soft afternoon window light, heavy drapes covering about one third of the window glass, early wall/ceiling/paneling wear, believable materials, physically plausible clutter. Straight-on frontal composition; verticals parallel. RS: dark vertical wood paneling. Flag on a vertical pole in a floor stand; flag hanging down; flag and pole fully visible. **Flag:** light wear; never so damaged it should be replaced. Cork board fully visible — lamp not in front of cork board. Telephone and radio both fully visible — telephone not obstructing radio. Cork board and whiteboard both fully in frame and completely blank. One telephone, one radio. All twelve anchors fully visible and unobstructed. Newspaper: masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations; top paper unobstructed. One distinct journal/magazine. Any visible text local-language; illegible only. No readable English. No digital screens. Telephone intact. No people; no figures in the room — empty and unoccupied. No smoke in the air; no smoke haze.

Avoid: AI-art look, cinematic concept art, angled; corner perspective, low camera angle, desk receding diagonally, flag on a wall-mounted bracket; wall fixture, desk lamp; any object in front of the flag, lamp obstructing; lamp in front of the cork board (cork board must be fully visible), telephone obstructing the radio (both must be fully visible and separate), second flag pole; empty pole, leaning; tilted pole, flag stretched flat; flag pinned to the wall, whiteboard; cork board cropped at the edge, bare window without curtains, newspaper masthead without golden decorations, loose papers; envelopes on top of the newspaper stack, lamp; other props covering any clickable anchor, wrong flag order, second telephone; second radio, RS crest; emblem on flag, cork board with notes; papers; text, date board with grid; scribbles, obstructed; merged anchors, converging verticals, fisheye, smoke in the air; smoke haze, people in the room, **desk lamp obstructing cork board or flag**, **flag so damaged it should be replaced** — wear is light only.

Let me repeat — lamp must NOT obstruct the cork-board.
```

### 9.8 RS — Year2 (1993)

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact base room. Keep the exact same geometry, furniture, flag, and camera angle. The cork board and whiteboard must remain completely blank.

Camera: strictly straight-on frontal view. Camera faces the back wall directly — no angle from the left; no angle from the right. Back wall (cork board and whiteboard) appears as a flat rectangle perpendicular to the viewer. Desk is front-on; no diagonal recession. Camera at desk height; slightly above; no low angle. All vertical lines (window frame, wall edges, board sides) parallel; no converging perspective.

Framing: the entire cork board and the entire whiteboard must be fully inside the image frame. Do not crop the whiteboard on the right; do not crop the whiteboard on any edge. Do not crop the cork board. Compose so the right edge of the image falls to the right of the whiteboard. The whiteboard can be smaller than the cork board; both must be fully visible.

Generate a Republika Srpska command room in Year 2 of wartime use (1993). Entrenched bureaucratic war routine, harsher institutional wear, more settled into wartime hierarchy.

**Lighting — must change from 1992:** Late afternoon or early evening. The window light is fading, so turn on the desk lamp to supplement the light. Draw the heavy drapes on the left side of the window so they cover about half of the window glass. The sheer white lace curtains remain in place.

**Room stress (non-interactive areas only):** **More wear** than 1992: visible hairline cracks, slightly stained wood paneling, possible water stains or soot. Do not alter the cork board, whiteboard, flag placement; do not add clutter; do not add writing to the cork board; do not add writing to the whiteboard. They remain completely blank.

**Wear and Tear (Year 2):** More visible use. Make the ashtray fuller. Add some cigarette traces and minor stains to the desk surface. Make the binders and folders look more handled.

**Flag:** Same plain tricolor design (red, blue, white horizontal stripes) on a vertical pole, right side. **Moderate wear on the flag**: more fading, softened or slightly worn edges, perhaps a small mend or stitch; clearly used but **not replacement-level**. Gold finial and tassel. Fully visible; no overlap with cork board; no overlap with whiteboard.

Window: old-style curtains — period-appropriate fabric (heavy tan drapes and sheer white lace curtains). The heavy drapes are pulled halfway closed across the window as the day ends.

RS identity: wartime-era RS (1992–1995) only. Plain tricolor only: three horizontal stripes — red (top), blue (middle), white (bottom). No crest, no emblem. No post-2000; no post-Dayton RS symbolism. RS room (distinct from other factions): the back wall has dark vertical wood paneling — dark reddish-brown; similar tone.

Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag).

Twelve distinct anchors — all fully visible and unobstructed (items 1–8 unchanged; 9–12 per §3a). Exactly one telephone and exactly one radio. **Lamp: desk lamp** — on the desk. Placement rules: (1) Position the desk lamp so it does **not** obstruct the cork board — do not place the lamp in front of the cork board; do not place the lamp in the line of sight between viewer and cork board. (2) Position the desk lamp so it does **not** obstruct the flag (flag is on the right). (3) The telephone must not obstruct the radio — place the telephone and radio so that each is fully visible and neither blocks the other.
1. Wall: flag on a vertical pole in a floor stand; in a base (wall_flag_area) — one pole only; flag hanging down. **The flag MUST stay on the right side of the room, between the cork board and whiteboard.** Nothing in front of the flag.
2. Wall: large cork board as map placeholder only (desk_map). **Completely blank.** No map outline, no grid, no pushpins, no markings, no geography. Empty cork surface only. Flat and frontal, fully in frame. The desk lamp must not be placed in front of the cork board; the cork board must remain fully visible.
3. Wall: separate date / next-turn board (whiteboard) (wall_calendar_area) — flat and frontal, **completely blank** (no grid, no text, no symbols), fully in frame. Whiteboard can be smaller than the cork board; entire whiteboard visible, not cropped.
4. Desk: one telephone only (diplomatic_telephone) — fully visible; the telephone must not obstruct the radio.
5. Desk: one radio only (desk_radio) — fully visible; the radio must not be obstructed by the telephone.
6. Desk: newspaper stack (newspaper_stack) — masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations (gilded lettering, gold outline, gold band/emblem). Top newspaper fully visible; no loose papers; no envelopes on top covering the masthead.
7. Desk: command briefing folio (command_briefing_folio) — one clear stack of binders; fully visible and unobstructed.
8. Desk: intelligence journal (intelligence_journal) — one clearly identifiable journal, distinct from the binder stack; fully visible and unobstructed.
9. Wall area: coatrack (commander_coatrack) — **VRS** uniform jacket and **Serb traditional military cap** (e.g. šajkača; period-appropriate Serb military cap; let Gemini interpret), with **visible VRS insignia**; not on flag pole; not blocking cork board, date board, desk items.
10. Desk: enclave dispatch folder (enclave_dispatch_folder) — one folder with red tag; separate silhouette from command briefing binder stack (item 7).
11. Desk: intelligence packet (intelligence_packet) — sealed envelope stack; distinct from binders (7) and journal (8).
12. Wall corner: honors memorial (honors_memorial) — citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle; not merged with binder stack.

Desk: front-on to camera; moderate clutter; all twelve anchors distinct and unobstructed. **Desk lamp on the desk** — position it so it does not obstruct the cork board, the flag. The items MUST stay in the exact same positions as the previous image. From left to right: newspaper stack and binders on the left, ashtray/glass/cigarettes in the center, journal center-right, telephone on the right, radio on the far right; desk lamp on the desk (e.g. left), not in front of cork board, flag. Let me repeat — lamp must NOT obstruct the cork board; must NOT obstruct the flag.

Place the telephone and radio so the telephone does not obstruct the radio — both fully visible.

Ashtray, cigarette pack; small glass, restrained papers — do not cover the flag, telephone, radio, newspaper stack, binders, or journal.

Do not put loose sheets; do not put envelopes on top of the newspaper stack. One telephone, one radio.

No smoke in the air; no smoke haze.

Mood: entrenched bureaucratic war routine, colder, more rigid, more administrative. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph of an actual 1990s command room, not AI art; not concept art. Documentary realism: late afternoon/early evening window light (desk lamp turned on), heavy drapes covering about half of the window glass, more wall/ceiling/paneling wear than 1992, believable materials, physically plausible clutter. Straight-on frontal composition; verticals parallel. RS: dark vertical wood paneling. Flag on a vertical pole in a floor stand; flag hanging down; flag and pole fully visible. **Flag:** moderate wear; never so damaged it should be replaced. Cork board fully visible — lamp not in front of cork board. Telephone and radio both fully visible — telephone not obstructing radio. Cork board and whiteboard both fully in frame and completely blank. One telephone, one radio. All twelve anchors fully visible and unobstructed. Newspaper: masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations; top paper unobstructed. One distinct journal/magazine. Any visible text local-language; illegible only. No readable English. No digital screens. Telephone intact. No people; no figures in the room — empty and unoccupied. No smoke in the air; no smoke haze.

Avoid: AI-art look, cinematic concept art, angled; corner perspective, low camera angle, desk receding diagonally, flag on a wall-mounted bracket; wall fixture, desk lamp; any object in front of the flag, lamp obstructing; lamp in front of the cork board (cork board must be fully visible), telephone obstructing the radio (both must be fully visible and separate), second flag pole; empty pole, leaning; tilted pole, flag stretched flat; flag pinned to the wall, whiteboard; cork board cropped at the edge, bare window without curtains, newspaper masthead without golden decorations, loose papers; envelopes on top of the newspaper stack, lamp; other props covering any clickable anchor, wrong flag order, second telephone; second radio, RS crest; emblem on flag, cork board with notes; papers; text, date board with grid; scribbles, obstructed; merged anchors, converging verticals, fisheye, smoke in the air; smoke haze, people in the room, **desk lamp obstructing cork board or flag**, **flag so damaged it should be replaced** — wear is moderate only.

Let me repeat — lamp must NOT obstruct the cork-board.
```

### 9.9 RS — Year3 (1994)

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact base room. Keep the exact same geometry, furniture, flag, and camera angle. The cork board and whiteboard must remain completely blank.

Camera: strictly straight-on frontal view. Camera faces the back wall directly — no angle from the left; no angle from the right. Back wall (cork board and whiteboard) appears as a flat rectangle perpendicular to the viewer. Desk is front-on; no diagonal recession. Camera at desk height; slightly above; no low angle. All vertical lines (window frame, wall edges, board sides) parallel; no converging perspective.

Framing: the entire cork board and the entire whiteboard must be fully inside the image frame. Do not crop the whiteboard on the right; do not crop the whiteboard on any edge. Do not crop the cork board. Compose so the right edge of the image falls to the right of the whiteboard. The whiteboard can be smaller than the cork board; both must be fully visible.

Generate a Republika Srpska command room in Year 3 of wartime use (1994). Accumulated harsh wear, command fatigue, stern and overused but without disorder or ruin.

**Lighting — must change from 1993:** Evening. The window is dark. Pull the heavy drapes on the left side of the window so they are mostly closed, covering about three-quarters of the window glass. The room should now be lit primarily by the desk lamp.

**Room stress (non-interactive areas only):** **More wear** than 1993: clearer cracks, stains, possible soot or smoke discoloration on the walls and wood paneling. Do not alter the cork board, whiteboard, flag placement; do not add clutter; do not add writing to the cork board; do not add writing to the whiteboard. They remain completely blank.

**Wear and Tear (Year 3):** Noticeable accumulation. The ashtray is well used. Add stronger smoke staining to the desk surface. Increase the density of paperwork on the desk. The props should feel overused.

**Flag:** Same plain tricolor design (red, blue, white horizontal stripes) on a vertical pole, right side. **Noticeable wear on the flag**: faded, softened or slightly frayed edges, possible small stains or mends; worn but still clearly the same flag and **not replacement-level**. Gold finial and tassel. Fully visible; no overlap with cork board; no overlap with whiteboard.

Window: old-style curtains — period-appropriate fabric (heavy tan drapes and sheer white lace curtains). The heavy drapes are pulled mostly closed, covering most of the window.

RS identity: wartime-era RS (1992–1995) only. Plain tricolor only: three horizontal stripes — red (top), blue (middle), white (bottom). No crest, no emblem. No post-2000; no post-Dayton RS symbolism. RS room (distinct from other factions): the back wall has dark vertical wood paneling — dark reddish-brown; similar tone.

Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag).

Twelve distinct anchors — all fully visible and unobstructed (items 1–8 unchanged; 9–12 per §3a). Exactly one telephone and exactly one radio. **Lamp: desk lamp** — on the desk. Placement rules: (1) Position the desk lamp so it does **not** obstruct the cork board — do not place the lamp in front of the cork board; do not place the lamp in the line of sight between viewer and cork board. (2) Position the desk lamp so it does **not** obstruct the flag (flag is on the right). (3) The telephone must not obstruct the radio — place the telephone and radio so that each is fully visible and neither blocks the other.
1. Wall: flag on a vertical pole in a floor stand; in a base (wall_flag_area) — one pole only; flag hanging down. **The flag MUST stay on the right side of the room, between the cork board and whiteboard.** Nothing in front of the flag.
2. Wall: large cork board as map placeholder only (desk_map). **Completely blank.** No map outline, no grid, no pushpins, no markings, no geography. Empty cork surface only. Flat and frontal, fully in frame. The desk lamp must not be placed in front of the cork board; the cork board must remain fully visible.
3. Wall: separate date / next-turn board (whiteboard) (wall_calendar_area) — flat and frontal, **completely blank** (no grid, no text, no symbols), fully in frame. Whiteboard can be smaller than the cork board; entire whiteboard visible, not cropped.
4. Desk: one telephone only (diplomatic_telephone) — fully visible; the telephone must not obstruct the radio.
5. Desk: one radio only (desk_radio) — fully visible; the radio must not be obstructed by the telephone.
6. Desk: newspaper stack (newspaper_stack) — masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations (gilded lettering, gold outline, gold band/emblem). Top newspaper fully visible; no loose papers; no envelopes on top covering the masthead.
7. Desk: command briefing folio (command_briefing_folio) — one clear stack of binders; fully visible and unobstructed.
8. Desk: intelligence journal (intelligence_journal) — one clearly identifiable journal, distinct from the binder stack; fully visible and unobstructed.
9. Wall area: coatrack (commander_coatrack) — **VRS** uniform jacket and **Serb traditional military cap** (e.g. šajkača; period-appropriate Serb military cap; let Gemini interpret), with **visible VRS insignia**; not on flag pole; not blocking cork board, date board, desk items.
10. Desk: enclave dispatch folder (enclave_dispatch_folder) — one folder with red tag; separate silhouette from command briefing binder stack (item 7).
11. Desk: intelligence packet (intelligence_packet) — sealed envelope stack; distinct from binders (7) and journal (8).
12. Wall corner: honors memorial (honors_memorial) — citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle; not merged with binder stack.

Desk: front-on to camera; moderate clutter; all twelve anchors distinct and unobstructed. **Desk lamp on the desk** — position it so it does not obstruct the cork board, the flag. The items MUST stay in the exact same positions as the previous image. From left to right: newspaper stack and binders on the left, ashtray/glass/cigarettes in the center, journal center-right, telephone on the right, radio on the far right; desk lamp on the desk (e.g. left), not in front of cork board, flag. Let me repeat — lamp must NOT obstruct the cork board; must NOT obstruct the flag.

Place the telephone and radio so the telephone does not obstruct the radio — both fully visible.

Ashtray, cigarette pack; small glass, restrained papers — do not cover the flag, telephone, radio, newspaper stack, binders, or journal.

Do not put loose sheets; do not put envelopes on top of the newspaper stack. One telephone, one radio.

No smoke in the air; no smoke haze.

Mood: stern, overused, and increasingly burdened by duration. Avoid caricature. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph of an actual 1990s command room, not AI art; not concept art. Documentary realism: evening window light, lit primarily by desk lamp, heavy drapes mostly closed covering about three-quarters of the window glass, more wall/ceiling/paneling wear than 1993, believable materials, physically plausible clutter. Straight-on frontal composition; verticals parallel. RS: dark vertical wood paneling. Flag on a vertical pole in a floor stand; flag hanging down; flag and pole fully visible. **Flag:** noticeable wear; never so damaged it should be replaced. Cork board fully visible — lamp not in front of cork board. Telephone and radio both fully visible — telephone not obstructing radio. Cork board and whiteboard both fully in frame and completely blank. One telephone, one radio. All twelve anchors fully visible and unobstructed. Newspaper: masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations; top paper unobstructed. One distinct journal/magazine. Any visible text local-language; illegible only. No readable English. No digital screens. Telephone intact. No people; no figures in the room — empty and unoccupied. No smoke in the air; no smoke haze.

Avoid: AI-art look, cinematic concept art, angled; corner perspective, low camera angle, desk receding diagonally, flag on a wall-mounted bracket; wall fixture, desk lamp; any object in front of the flag, lamp obstructing; lamp in front of the cork board (cork board must be fully visible), telephone obstructing the radio (both must be fully visible and separate), second flag pole; empty pole, leaning; tilted pole, flag stretched flat; flag pinned to the wall, whiteboard; cork board cropped at the edge, bare window without curtains, newspaper masthead without golden decorations, loose papers; envelopes on top of the newspaper stack, lamp; other props covering any clickable anchor, wrong flag order, second telephone; second radio, RS crest; emblem on flag, cork board with notes; papers; text, date board with grid; scribbles, obstructed; merged anchors, converging verticals, fisheye, smoke in the air; smoke haze, people in the room, **desk lamp obstructing cork board or flag**, **flag so damaged it should be replaced** — wear is noticeable only.

Let me repeat — lamp must NOT obstruct the cork-board.
```

### 9.10 RS — Year4 (1995)

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the previous image as the exact base room. Keep the exact same geometry, furniture, flag, and camera angle. The cork board and whiteboard must remain completely blank.

Camera: strictly straight-on frontal view. Camera faces the back wall directly — no angle from the left; no angle from the right. Back wall (cork board and whiteboard) appears as a flat rectangle perpendicular to the viewer. Desk is front-on; no diagonal recession. Camera at desk height; slightly above; no low angle. All vertical lines (window frame, wall edges, board sides) parallel; no converging perspective.

Framing: the entire cork board and the entire whiteboard must be fully inside the image frame. Do not crop the whiteboard on the right; do not crop the whiteboard on any edge. Do not crop the cork board. Compose so the right edge of the image falls to the right of the whiteboard. The whiteboard can be smaller than the cork board; both must be fully visible.

Generate a Republika Srpska command room in Year 4 of wartime use (1995). Hardened institutional exhaustion, visibly overused materials, tired but functional command atmosphere, stronger signs of long-duration strain.

**Lighting — must change from 1994:** Full night. Pull the heavy drapes on the left side of the window so they are fully closed, completely covering the window glass. The room is lit exclusively by the desk lamp and practical interior lighting.

**Room stress (non-interactive areas only):** **Most wear** of the series: pronounced cracks, peeling or stained paint above the paneling, soot or smoke staining, aged ceiling, heavily worn wood paneling. Do not alter the cork board, whiteboard, flag placement; do not add clutter; do not add writing to the cork board; do not add writing to the whiteboard. They remain completely blank.

**Wear and Tear (Year 4):** Heavy but functional. The ashtray is full or nearly full. Show strong smoke and stain traces on the desk. Desk and materials are visibly overused. Telephone and radio must remain intact and fully usable.

**Flag:** Same plain tricolor design (red, blue, white horizontal stripes) on a vertical pole, right side. **Heavy wear on the flag**: faded, worn edges, visible mends or stains; clearly long-used and tired but **still in place and not to the point of replacement**. Gold finial and tassel. Fully visible; no overlap with cork board; no overlap with whiteboard.

Window: old-style curtains — period-appropriate fabric (heavy tan drapes and sheer white lace curtains). The heavy drapes are fully closed, completely blocking the window.

RS identity: wartime-era RS (1992–1995) only. Plain tricolor only: three horizontal stripes — red (top), blue (middle), white (bottom). No crest, no emblem. No post-2000; no post-Dayton RS symbolism. RS room (distinct from other factions): the back wall has dark vertical wood paneling — dark reddish-brown; similar tone.

Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag).

Twelve distinct anchors — all fully visible and unobstructed (items 1–8 unchanged; 9–12 per §3a). Exactly one telephone and exactly one radio. **Lamp: desk lamp** — on the desk. Placement rules: (1) Position the desk lamp so it does **not** obstruct the cork board — do not place the lamp in front of the cork board; do not place the lamp in the line of sight between viewer and cork board. (2) Position the desk lamp so it does **not** obstruct the flag (flag is on the right). (3) The telephone must not obstruct the radio — place the telephone and radio so that each is fully visible and neither blocks the other.
1. Wall: flag on a vertical pole in a floor stand; in a base (wall_flag_area) — one pole only; flag hanging down. **The flag MUST stay on the right side of the room, between the cork board and whiteboard.** Nothing in front of the flag.
2. Wall: large cork board as map placeholder only (desk_map). **Completely blank.** No map outline, no grid, no pushpins, no markings, no geography. Empty cork surface only. Flat and frontal, fully in frame. The desk lamp must not be placed in front of the cork board; the cork board must remain fully visible.
3. Wall: separate date / next-turn board (whiteboard) (wall_calendar_area) — flat and frontal, **completely blank** (no grid, no text, no symbols), fully in frame. Whiteboard can be smaller than the cork board; entire whiteboard visible, not cropped.
4. Desk: one telephone only (diplomatic_telephone) — fully visible; the telephone must not obstruct the radio.
5. Desk: one radio only (desk_radio) — fully visible; the radio must not be obstructed by the telephone.
6. Desk: newspaper stack (newspaper_stack) — masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations (gilded lettering, gold outline, gold band/emblem). Top newspaper fully visible; no loose papers; no envelopes on top covering the masthead.
7. Desk: command briefing folio (command_briefing_folio) — one clear stack of binders; fully visible and unobstructed.
8. Desk: intelligence journal (intelligence_journal) — one clearly identifiable journal, distinct from the binder stack; fully visible and unobstructed.
9. Wall area: coatrack (commander_coatrack) — **VRS** uniform jacket and **Serb traditional military cap** (e.g. šajkača; period-appropriate Serb military cap; let Gemini interpret), with **visible VRS insignia**; not on flag pole; not blocking cork board, date board, desk items.
10. Desk: enclave dispatch folder (enclave_dispatch_folder) — one folder with red tag; separate silhouette from command briefing binder stack (item 7).
11. Desk: intelligence packet (intelligence_packet) — sealed envelope stack; distinct from binders (7) and journal (8).
12. Wall corner: honors memorial (honors_memorial) — citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle; not merged with binder stack.

Desk: front-on to camera; moderate clutter; all twelve anchors distinct and unobstructed. **Desk lamp on the desk** — position it so it does not obstruct the cork board, the flag. The items MUST stay in the exact same positions as the previous image. From left to right: newspaper stack and binders on the left, ashtray/glass/cigarettes in the center, journal center-right, telephone on the right, radio on the far right; desk lamp on the desk (e.g. left), not in front of cork board, flag. Let me repeat — lamp must NOT obstruct the cork board; must NOT obstruct the flag.

Place the telephone and radio so the telephone does not obstruct the radio — both fully visible.

Ashtray, cigarette pack; small glass, restrained papers — do not cover the flag, telephone, radio, newspaper stack, binders, or journal.

Do not put loose sheets; do not put envelopes on top of the newspaper stack. One telephone, one radio.

No smoke in the air; no smoke haze.

Mood: bureaucratic severity under late-war fatigue, without melodrama or destruction. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph of an actual 1990s command room, not AI art; not concept art. Documentary realism: full night, lit exclusively by desk lamp and practical interior lighting, heavy drapes fully closed completely blocking the window, maximum wall/ceiling/paneling wear, believable materials, physically plausible clutter. Straight-on frontal composition; verticals parallel. RS: dark vertical wood paneling. Flag on a vertical pole in a floor stand; flag hanging down; flag and pole fully visible. **Flag:** heavy wear; never so damaged it should be replaced. Cork board fully visible — lamp not in front of cork board. Telephone and radio both fully visible — telephone not obstructing radio. Cork board and whiteboard both fully in frame and completely blank. One telephone, one radio. All twelve anchors fully visible and unobstructed. Newspaper: masthead "Glas Srpske" in Cyrillic (Глас Српске) with visible golden decorations; top paper unobstructed. One distinct journal/magazine. Any visible text local-language; illegible only. No readable English. No digital screens. Telephone intact. No people; no figures in the room — empty and unoccupied. No smoke in the air; no smoke haze.

Avoid: AI-art look, cinematic concept art, angled; corner perspective, low camera angle, desk receding diagonally, flag on a wall-mounted bracket; wall fixture, desk lamp; any object in front of the flag, lamp obstructing; lamp in front of the cork board (cork board must be fully visible), telephone obstructing the radio (both must be fully visible and separate), second flag pole; empty pole, leaning; tilted pole, flag stretched flat; flag pinned to the wall, whiteboard; cork board cropped at the edge, bare window without curtains, newspaper masthead without golden decorations, loose papers; envelopes on top of the newspaper stack, lamp; other props covering any clickable anchor, wrong flag order, second telephone; second radio, RS crest; emblem on flag, cork board with notes; papers; text, date board with grid; scribbles, obstructed; merged anchors, converging verticals, fisheye, smoke in the air; smoke haze, people in the room, **desk lamp obstructing cork board or flag**, **flag so damaged it should be replaced** — heavy wear but still serviceable.

Let me repeat — lamp must NOT obstruct the cork-board.
```

### 9.11 HRHB — Prewar (initial — copy-paste as-is)

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Master — composition and requirements:
- One complete room image; wide composition; fixed camera angle.
- **One primary command desk only** — no second table, no extra foreground furniture. The desk is the **main foreground element**: avoid a large empty strip of floor between camera and desk; the desk should read as dominant in the frame (e.g. at most a narrow strip of rug in front; at most a narrow strip of floor in front — but do not push the desk into the midground with a wide empty foreground). **Tight framing:** Frame the shot so the desk is in the **immediate foreground** — at most a narrow strip of floor and rug visible in front of the desk; no wide empty floor between camera and desk.
- Strict head-on (frontal) perspective: camera directly faces the back wall. Cork board and date board appear as flat rectangles with minimal perspective distortion for projection.
- No fisheye, no Dutch angle, no dramatic tilt, no angled views, no three-quarter views of the back wall.
- Designed for later hotspot outlining: strong object silhouettes, readable edges, no key objects buried under clutter, no overlapping piles crossing multiple modal regions.
- All props painted into one coherent scene; no separate sprite; no floating-prop assumptions. The only runtime-rendered element is the calendar; faction flag and ticker are baked in.
- Must include (painted in): faction flag; central desk map placeholder (cork board, empty); command briefing folio; newspaper stack; magazine; intelligence journal; one telephone; one radio; faction dossier; archive binder; clean wall space for calendar; **coatrack with faction army uniform jacket and faction-specific military cap, both with visible army insignia (ARBiH, VRS, HVO as appropriate)**; one urgent-tagged dispatch folder (red tag); sealed envelope stack; honors memorial (citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle). Twelve distinct anchors total; each fully visible and unobstructed.

Avoid (negative prompt):
- Separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, darkness that obscures object outlines; dramatic human figures; giant paper piles covering modal-safe areas; AI-art look; cinematic concept art; glossy render; plastic materials; over-sharpening; fake depth of field; dramatic poster composition; visible printed year; dated newspapers, dated forms; mangled phone; white placeholder rectangles; people, figures in the room — the space must be empty and unoccupied; readable English; placeholder text on wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; **large empty floor strip between camera and desk; desk pushed to midground; single loose sheet instead of a visible newspaper stack; generic military cap without visible army insignia; generic military jacket without visible army insignia.**

Generate a Herceg-Bosna / HRHB command room in the prewar period. The room should feel like a compact regional command room: tidier and slightly more orderly than the others, but still clearly serious and wartime-adjacent.

HRHB identity: period-appropriate HRHB / HVO-era visual identity baked naturally into the room art.

On the wall: a **large cork board** as a **map placeholder only** — **empty** or with pins / empty frame; **do not draw a detailed map**. Flat and frontal. A separate **date / next-turn board** (flat, frontal, no readable text).

Desk: intact telephone, military or institutional radio, desk lamp, ashtray, **command briefing folio** (one binder stack), **newspaper stack**, **intelligence journal** (one magazine distinct from binders), **enclave dispatch folder** (one folder with red tag; separate from binder stack), **intelligence packet** (sealed envelope stack; distinct from binders and journal). **Coatrack** with **HVO** uniform jacket and **Croat traditional military cap**, with **visible HVO insignia** (wall or side, not on flag pole). **Honors memorial**: small shelf or wall niche with citation booklet with ribbon; medal ribbon bar; no framed photos; no candle — not merged with binder stack. Clipped dispatch folders, tidier desk accessories, restrained side papers. **Moderate clutter only** — all twelve clickables clearly visible and unobstructed.

Mood: compact authority, regional administration, cleaner discipline, warm-neutral and restrained blue accents. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and all twelve clickable elements must be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.12 HRHB — Year1

```text
Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year1 of wartime use: somewhat denser paperwork, slightly stronger command-post atmosphere, a little more smoke and use, but still relatively organized. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: daytime or soft afternoon.**

HRHB tone: compact regional wartime administration, more pressured but still controlled. Keep the clipped folders and tidier desk logic.

Do not add visible year markings. Do not change the interaction anchors. **Cork board and whiteboard must remain clear** — cork board empty; pushpins only (no notes, papers, text); whiteboard completely blank (no grid, text, symbols). Same as prewar in every year.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.13 HRHB — Year2

```text
Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year2 of wartime use: mature wartime routine, denser side paperwork, more visible use of ashtray and lamp, more administrative pressure, but still more orderly than RBiH and less monolithic than RS. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: late afternoon or early evening.**

HRHB tone: disciplined, regional, increasingly burdened but still relatively composed.

Do not add visible year markings. Do not change the interaction anchors. **Cork board and whiteboard must remain clear** — cork board empty; pushpins only (no notes, papers, text); whiteboard completely blank (no grid, text, symbols). Same as prewar in every year.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.14 HRHB — Year3

```text
Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year3 of wartime use: accumulated wear, denser paper handling, more smoke and long-hours fatigue, slightly darker strain, but retain the faction's more orderly visual discipline. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: evening.**

Do not add visible year markings. Do not change the interaction anchors. **Cork board and whiteboard must remain clear** — cork board empty; pushpins only (no notes, papers, text); whiteboard completely blank (no grid, text, symbols). Same as prewar in every year.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.15 HRHB — Year4

```text
Use the previous image as the exact same room. Do not redesign the room.

Transform it into Year4 of wartime use: visibly tired, worn, and prolonged by duration, but still functioning and still more ordered than total chaos. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: full night.**

HRHB tone: late-war exhaustion in a compact regional HQ, no melodrama, no visible year markings, no change to interaction anchors.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere. Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; **generic military cap without visible army insignia; generic military jacket without visible army insignia.**"
```

### 9.16 Wall map: placeholder only (no baked map)

The **wall map** is a **placeholder only**: a large cork board that is **empty** (or with pins / empty frame / light grid). **Do not** generate a detailed map (no geography, no place names, no topography) in the room image. At runtime the engine **projects the full interactive map** into that quad.

If you need a **standalone map asset** for reference or a different aspect ratio, use the prompt below to generate a map sheet only; the room image itself must not contain a detailed baked map.

```text
Generate a single period-appropriate staff map sheet for a Bosnian War command room. This is not a full room image — only the map that could be pinned to a cork board.

The map must show Bosnia and Herzegovina, with the frame at the BiH border. Geography only: rivers, relief, terrain texture, place names in Bosnian. No front lines, no sector boundaries, no faction borders, no unit counters, no tactical arrows, no pins. Muted paper tone, subtle wear, light coordinate grid if helpful, restrained cartographic styling. No desk, no room, no shadows. Output dimensions as needed.
```

---

## 10. Overlay surfaces and projection

Overlay geometry is **not universal**. The exact quads depend on the final approved room image, so they must be measured **per approved faction room** and re-measured for any yearly follow-up that changes camera or wall geometry.

The coordinates below are **example only** (from an older test room). For each approved room, store quads in **TL, TR, BR, BL** order for perspective projection.

### Wall map zone (cork board placeholder) — measure per room

Measure the **visible cork board surface** (empty placeholder) so the engine can project the full interactive map into this quad. Use the inner edge of the board.

Example format:
- TL (x, y), TR (x, y), BR (x, y), BL (x, y)
- Bounding box: Top-Left X, Top-Left Y, Width, Height

### Date / next-turn board — measure per room

Measure the **date / next-turn board** (separate wall board) outer frame. Example format as above.

### Runtime composition

1. Load the approved room image (with cork board **placeholder** — no detailed map baked).
2. Project the **full interactive map** into the **wall map quad**.
3. Project the **date / next-turn** content into the date-board quad.

---

## 11. Gemini follow-up prompts

Use these with the approved room image attached.

### 11.1 Measure wall map (cork board + pinned map) quad

```text
This attached warroom image is exactly 2752 pixels wide and 1536 pixels tall. On the wall there is a large cork board that serves as a **map placeholder** (empty or with pins / empty frame — no detailed map). Measure the visible cork board surface where the runtime interactive map will be projected.

I need the exact quad for that surface. Return the result in this exact order:

Top-Left: (x, y)
Top-Right: (x, y)
Bottom-Right: (x, y)
Bottom-Left: (x, y)

Also give me a fallback bounding box:

Top-Left X:
Top-Left Y:
Width:
Height:

Use the visible inner edge of the map or board, not the outer frame. Be precise enough for runtime perspective projection.
```

### 11.2 Measure date / next-turn board quad

```text
This attached warroom image is exactly 2752 pixels wide and 1536 pixels tall. Measure the wall-mounted date / next-turn board that is intended for runtime overlay.

I need the exact quad for the outer visible board surface. Return the result in this exact order:

Top-Left: (x, y)
Top-Right: (x, y)
Bottom-Right: (x, y)
Bottom-Left: (x, y)

Also give me a fallback bounding box:

Top-Left X:
Top-Left Y:
Width:
Height:

Use the visible board edge, not the surrounding wall. Be precise enough for runtime perspective projection.
```

### 11.3 Verify whether a yearly follow-up kept the same geometry

```text
I am attaching two warroom images, both 2752 × 1536:

Image A = approved earlier year state
Image B = later yearly follow-up

Compare the geometry of the wall map (cork board + pinned map) and the date / next-turn board between the two images.

Tell me:
1. whether the wall map quad is effectively unchanged,
2. whether the date / next-turn board quad is effectively unchanged,
3. whether I can safely reuse the same runtime projection coordinates,
4. or whether I should measure Image B separately.

If there is any meaningful shift in perspective, placement, or proportions, say that the later image must be measured separately.
```

### 11.4 Ask Gemini to identify unwanted visible year or English text

```text
This attached warroom image is intended to show a yearly room state. The baked art must not reveal the actual year anywhere except through the future runtime calendar overlay, and there must be no readable English or placeholder text on the wall board (e.g. "RUNTIME OVERLAY").

Please inspect the image and tell me:
1. Whether there is any visible year number, dated newspaper, dated form, dated board text, or any other readable date-like element baked into the room art.
2. Whether there is any readable English text on the wall board or elsewhere (e.g. placeholder words, labels, signs).

If you find any, list them precisely and explain where they appear so I can reject or revise the image.
```

### 11.5 Ask Gemini to confirm the room has no people or figures

```text
This attached warroom image must show an empty, unoccupied command room — no people or figures in the frame.

Please confirm whether any person, face, or human figure is visible in the image. If yes, describe where they appear so I can reject or revise the image.
```

---

## 12. Workflow

1. Generate **Prewar** room per faction from scratch (with wall cork board **placeholder**, date board, desk with **moderate clutter** and **faction newspaper stack**).
2. Approve the strongest prewar room for each faction.
3. Generate **Year1** as follow-up to Prewar.
4. Generate **Year2** as follow-up to Year1.
5. Generate **Year3** as follow-up to Year2.
6. Generate **Year4** as follow-up to Year3.
7. After approval of each room, use the Gemini prompts in **§11** to measure the **wall map quad** and **date-board quad** and verify geometry.
8. Runtime: project the **full interactive map** into the wall map quad (placeholder area), and project **date / next-turn** content into the date-board quad.

---

## 13. Deliverables

| # | Asset set | Count | Notes |
|---|-----------|-------|-------|
| 1 | `warroom_rbih_prewar/year1/year2/year3/year4` | 5 | Same room, yearly aging, flag baked, **wall cork board placeholder** (no detailed map), date board, desk with **moderate clutter** and **faction newspaper stack** |
| 2 | `warroom_rs_prewar/year1/year2/year3/year4` | 5 | Same room, yearly aging, flag baked, wall map placeholder + date board, desk with moderate clutter and newspaper stack |
| 3 | `warroom_hrhb_prewar/year1/year2/year3/year4` | 5 | Same room, yearly aging, flag baked, wall map placeholder + date board, desk with moderate clutter and newspaper stack |
| 4 | Runtime map overlay | runtime | Projected into wall map quad (placeholder) |
| 5 | Runtime date / next-turn board overlay | runtime | Projected into date-board quad |

Total room images: **15**. Optional: standalone staff-map asset if a separate sheet is needed (see §9.16).

---

## 14. Relation to previous direction

- The earlier "clean room + one sprite" and "desk map zone" approach was a useful step; we moved the **map to the wall** to avoid desk angle and empty-desk constraints.
- **Map on wall:** large **cork board** as **placeholder only** (empty or pins / empty frame — **no detailed map**); at runtime the engine **projects the full interactive map** into that quad.
- The **flag** stays baked into the room art.
- The **date / next-turn board** is a separate wall board for runtime overlay.
- The **desk** has **moderate clutter** and **faction newspaper stack**; clutter limited and organized so clickables stay visible.
- The art arc is **yearly** (prewar, year1–year4).

---

*For broader warroom prompt history and constraints, see [20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md).*
