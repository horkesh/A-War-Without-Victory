# Warroom `nano banana` Image and Modal Brief

**Date:** 2026-03-07  
**Type:** Expert handover / asset-generation brief  
**Status:** Advisory, not yet implemented  
**Audience:** UI/UX, asset generation operator, implementation owner  
**Primary use:** Generate the warroom as a single scene image, then outline modal hotspots over it

---

## 1. Purpose

This document consolidates the warroom visual-direction guidance, modal recommendations, and asset-generation prompts into a single handover for image production.

It is specifically written for the user's stated workflow:

- the **warroom should be generated as one complete image**
- modal regions will be **outlined afterward** using a separate tool
- separate perspective props/sprites **must not** be relied on for the warroom scene
- only this remains a separate runtime-rendered element:
  - **calendar**

This means the warroom should be treated as a **fixed scene plate**, not as a modular kit. Faction flags and news tickers are now baked into the image.

---

## 2. Current implementation constraints

### Warroom implementation facts

Current code already supports the correct direction for a single-image warroom:

- [`src/ui/warroom/warroom.ts`](f:\A-War-Without-Victory\src\ui\warroom\warroom.ts) loads a fixed background image as the warroom plate.
- That file currently sets the warroom canvas to:
  - **width:** `2752`
  - **height:** `1536`
- The same file already treats the **calendar** as a dynamic overlay.
- Existing interactive logic is already routed through clickable regions loaded by:
  - [`src/ui/warroom/ClickableRegionManager.ts`](f:\A-War-Without-Victory\src\ui\warroom\ClickableRegionManager.ts)

### Existing interactive actions already map cleanly to room objects

Current warroom action routing already expects a physically anchored room:

- faction overview
- tactical / primary map
- advance turn
- newspaper modal
- magazine modal
- reports modal
- diplomacy
- ticker / radio

That makes the single-image approach not just aesthetically preferable, but structurally aligned with the implementation.

---

## 3. Core strategic decision

### Single agreed priority

**The warroom should be authored as one modal-ready strategic tableau, not assembled from separate room sprites.**

### Owner

**Orchestrator -> UI/UX / asset-generation operator** for visual specification  
**Implementation owner** to preserve hotspot alignment and overlay-safe spaces

---

## 4. Non-negotiable generation rules

These rules should be treated as mandatory when prompting `nano banana`.

### 4.1 Composition rules

- Generate **one complete room image**
- Use a **fixed camera angle**
- Use a **slightly elevated frontal perspective**
- Keep composition **wide and stable**
- No fisheye
- No Dutch angle
- No dramatic cinematic tilt
- No close-up composition that crops out desk interaction zones
- No perspective exaggeration that makes one hotspot huge and another tiny

### 4.2 UI-plate rules

The image is **not** concept art and **not** a cinematic illustration.

It must function as:

- a fixed UI scene plate
- a hotspot-outline source
- a modal-anchor background

That means:

- strong object silhouettes
- readable edges
- enough empty space for overlays
- no key objects buried under clutter
- no overlapping piles crossing multiple future modal regions

### 4.3 Pipeline rules

Do **not** depend on separate perspective props for the warroom.

Do not design the scene assuming later placement of:

- desk props
- wall props
- folders
- lamps
- radios
- telephones
- papers
- ornaments

All of those should already exist in the single painted plate.

### 4.4 Runtime exception list

The only separate runtime-rendered warroom element is the **calendar**.

Everything else, including the **faction flag** and **news ticker**, should be baked into the scene image.

**Overlay alignment:** The engine draws the calendar as a **flat 2D rectangle** (no perspective transform). So the wall area reserved for the calendar must be **flat and frontal**: a rectangular zone **facing the camera** (perpendicular to the viewer), like a notice board or picture frame, **with no perspective tilt**. Other areas of the room, including those for the baked-in flag and ticker, can be at angled or receding perspectives to enhance the artistic quality.

### 4.5 Symbolism (period-accurate, per-faction)

The game period is **1992–1998**. All in-scene documents, binders, folders, and stamps must use **period-appropriate symbolism** per faction:

- **RBiH:** White shield with golden fleur-de-lis and blue vertical stripes (the 1992–1998 Republic of Bosnia and Herzegovina crest).
- **Do not** use the **post-1998 BiH** coat of arms (yellow triangle on blue field) in RBiH rooms. That is anachronistic and wrong for faction identity.
- **RS:** Use **wartime RS symbolism only (1992–1995)** — e.g. Serbian tricolor, wartime RS insignia. **Do not** use the post-Dayton or post-1995 Republika Srpska coat of arms (post-war RS state symbols).
- **HRHB:** Use period-appropriate HRHB-era symbolism only.

**Desk map (RS warroom only):** The desk map in the RS room must show **RS territory, Serb-held areas, or the RS operational/administrative area only**. **Do not** show a map of the whole of Bosnia and Herzegovina as a single state; that is wrong for the RS faction perspective.

---

## 5. Art direction

### 5.1 Global style

The warroom should feel like:

- a historical command room
- an institutional decision space
- a place of maps, reports, and pressure
- serious, sober, and atmospheric
- tactile and material-rich

It should **not** feel like:

- sci-fi command center
- glossy modern strategy HUD art
- generic “military wallpaper”
- over-decorated propaganda art
- chaotic concept art
- action poster framing

### 5.2 Material language

Preferred material vocabulary:

- wood
- leather
- paper
- cloth
- metal fixtures
- map sheets
- folders
- seals
- stamp ink
- desk lamps
- administrative clutter

### 5.3 Emotional tone

The room should communicate:

- command responsibility
- political weight
- fatigue
- administrative gravity
- strategic focus

The room should not communicate:

- playful adventure
- spectacle-first heroics
- sleek techno-futurism
- theatrical villain aesthetics

---

## 6. Recommended fixed layout

All faction variants should preserve the same broad spatial logic so hotspot outlining stays stable.

## 6.1 Primary room anchors

These should be physically distinct and consistently positioned:

1. **Desk map area**
2. **Command briefing folio / official folder**
3. **Newspaper stack**
4. **Magazine or intelligence journal**
5. **Telephone**
6. **Radio**
7. **Faction dossier / archive binder / record object**
8. **Wall space for the separate flag**
9. **Wall space for the separate calendar**

## 6.2 Suggested placement logic

- **Desk map**: center or lower-center, largest and most important anchor
- **Briefing folio**: one clear side of the desk, not buried
- **Newspaper stack**: opposite side of desk from briefing folio
- **Magazine / journal**: separate enough from newspaper to be outlined independently
- **Telephone**: strong side silhouette, easy to isolate
- **Radio / Ticker**: visually distinct from phone; can be integrated into the desk or wall at an angle
- **Faction dossier / record object**: prominent but not competing with desk map
- **Calendar zone**: upper wall, clean visibility; **flat and frontal** (facing the camera, no perspective tilt) so the 2D calendar overlay aligns.
- **Flag**: can be a draped banner, framed cloth, or hanging flag; can be at any artistic angle or receding perspective.

## 6.3 Overlay-safe spaces

Leave modal-safe visual breathing room in:

- upper-left wall area
- upper-right wall area
- center-back desk area
- lower-center desk area
- at least one side corridor for wider modal overlays

Do not fill these areas with high-noise clutter.

---

## 7. Best warroom modal set

These modal recommendations are specifically chosen because they map naturally to physical objects in a single-image room.

## P0 warroom modals

### 7.1 Command Briefing Modal

**Anchor object:** official report folio / thick stamped folder

**Purpose:**

- what matters now
- urgent decisions
- front alarms
- convoy questions
- enclave warnings
- operation failures
- immediate priority routing

**Why this should exist:**

This is the best warroom expression of the GUI review's top finding: the player needs a clearer answer to what matters right now.

**Visual cue in scene:**

- a prominent folder
- tabs or seals
- obvious authority
- easy silhouette

### 7.2 Operational Situation Modal

**Anchor object:** desk map

**Purpose:**

- route into tactical map
- operation health
- sector stress
- logistics concern overview
- front-state summary

**Visual cue in scene:**

- large central map sheet
- annotated but not over-cluttered
- strongest desk object

### 7.3 International Pressure / Diplomacy Modal

**Anchor object:** telephone

**Purpose:**

- IVP breakdown
- Sarajevo visibility
- enclave pressure
- atrocity visibility
- consequences and diplomatic framing

**Why this is important:**

The GUI review identified IVP as one of the clearest under-surfaced systems. A phone-linked diplomatic surface is a better fit than a static number.

### 7.4 Press / Public Narrative Modal

**Anchor object:** newspaper stack

**Purpose:**

- current events
- press framing
- external narrative
- public-facing atmosphere

### 7.5 Faction Overview / Record Book Modal

**Anchor object:** dossier, archive binder, or command ledger

**Purpose:**

- faction identity
- casualties
- honors
- notable commanders
- symbolic strongholds
- campaign continuity

**Why this matters:**

This is the strongest pride-and-attachment modal.

## P1 warroom modals

### 7.6 Turn-End Intelligence Packet

**Anchor object:** official typed report packet

**Purpose:**

- key front changes
- likely enemy intent
- humanitarian pressure
- political risk
- recommended attention points

### 7.7 Enclave Crisis Modal

**Anchor object:** emergency-tagged dispatch folder

**Purpose:**

- enclave resilience
- isolation trend
- airdrop posture
- humanitarian jeopardy

### 7.8 Honors and Memorials Modal

**Anchor object:** citation folder / ribbon ledger / remembrance file

**Purpose:**

- sacrifice
- recognition
- memory
- faction continuity

### 7.9 Commander Register Modal

**Anchor object:** officer dossier tray / personnel folder

**Purpose:**

- commanders
- assignments
- competence
- notable service

---

## 8. Modal-to-object mapping table

| Physical anchor | Recommended modal | Priority |
|---|---|---|
| Desk map | Operational Situation / Tactical Map | P0 |
| Briefing folio | Command Briefing | P0 |
| Telephone | Diplomacy / International Pressure | P0 |
| Newspaper stack | Press / Public Narrative | P0 |
| Archive binder / dossier | Faction Overview / Record Book | P0 |
| Typed report packet | Turn-End Intelligence Packet | P1 |
| Emergency dispatch folder | Enclave Crisis | P1 |
| Citation / memorial ledger | Honors and Memorials | P1 |
| Personnel file tray | Commander Register | P1 |

**Bake-in (2026-03-10):** For a **single plate** with no sprite follow-up, prompts must place **all** anchors in the first image. See [20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md) §3a — **commander_coatrack** (cap/uniform on coatrack) preferred over tray for Commander Register; **enclave_dispatch_folder**, **intelligence_packet**, **honors_memorial** must be distinct silhouettes.

---

## 9. `nano banana` master prompt

Use this first to solve composition before faction-specific mood.

```text
Create a master warroom UI scene plate for a historical Bosnian War strategy game.

This image is not concept art and not a dramatic illustration. It is a fixed interactive background for a game interface.

Requirements:
- one complete room image
- wide composition
- slightly elevated frontal perspective
- no perspective distortion
- designed for later hotspot outlining
- very clear object silhouettes
- enough negative space for modal overlays
- all props painted into one coherent scene
- no separate sprite assumptions

Separate runtime-rendered element that must NOT be painted into the background:
- wall calendar

Must include (painted into the image):
- faction flag
- news ticker
- central desk map
- command briefing folio or official folder
- newspaper stack
- magazine or intelligence journal
- telephone
- radio
- faction dossier or archive binder
- clean wall space for a separate calendar

Style:
- serious historical command room
- grounded realism
- atmospheric but readable
- tactical administration, paperwork, map work, institutional decision-making
- not futuristic
- not glossy
- not cinematic
- not clutter-chaos

Goal:
produce the most usable single-image warroom layout for later interactive region outlining.
```

---

## 10. Shared negative prompt

Use this with every generation attempt.

```text
Do not generate:
- separate floating props
- modular sprite-like objects
- extreme perspective distortion
- fisheye lens
- Dutch angle
- cinematic action framing
- over-cluttered desk surfaces
- overlapping hotspot objects
- blurry silhouettes
- illegible room anchors
- fantasy tech
- neon UI elements
- sci-fi screens
- modern office minimalism
- cartoon stylization
- excessive smoke, haze, or darkness that obscures object outlines
- dramatic human figures dominating the room
- giant paper piles covering all modal-safe areas
```

---

## 11. Faction prompt pack

All three faction variants should preserve the same broad object layout and camera logic as the master composition.

## 11.1 RBiH warroom prompt

```text
Create a single full-scene warroom image for the Republic of Bosnia and Herzegovina command environment in the early Bosnian War.

This room should communicate:
- endurance
- improvised statehood
- civic defense under pressure
- constrained resources
- seriousness and sacrifice
- legitimacy under siege

Keep the same stable UI scene composition and object layout:
- large desk map at center
- command briefing folio
- newspaper stack
- magazine or journal
- telephone
- radio
- faction dossier or archive binder
- reserved wall space for separate flag
- reserved wall space for separate calendar

Faction-specific art direction:
- modest but dignified command room
- mixed civilian and military administrative character
- worn but not filthy materials
- practical furniture
- heavily used papers
- subtle signs of national identity and state continuity
- atmosphere of holding together under pressure
- responsibility over opulence

Material palette:
- dark wood
- worn green or brown desk leather
- practical institutional metal
- paper-heavy surfaces
- restrained brass
- warm low light with cooler ambient shadows

Avoid:
- luxury office feeling
- sleek modern command center look
- chaotic rubble melodrama
- propaganda excess
```

### RBiH notes

- Should feel strained but legitimate
- Should feel emotionally weighty
- Should not feel shabby to the point of caricature

## 11.2 RS warroom prompt

```text
Create a single full-scene warroom image for the Republika Srpska command environment in the early Bosnian War.

This room should communicate:
- formal military authority
- austere confidence
- bureaucratic force
- heavy apparatus
- command discipline
- institutional hardness without cartoon villainy

Keep the same stable UI scene composition and object layout:
- large desk map at center — RS only: map must show RS territory, Serb-held areas, or RS administrative/operational area only; do NOT show a map of the whole of Bosnia and Herzegovina
- command briefing folio
- newspaper stack
- magazine or journal
- telephone
- radio
- faction dossier or archive binder
- reserved wall space for separate flag
- reserved wall space for separate calendar

RS symbolism: use wartime RS only (1992–1995) on documents, binders, stamps — e.g. Serbian tricolor, wartime RS insignia; do NOT use post-Dayton or post-1995 Republika Srpska coat of arms.

Faction-specific art direction:
- more militarized and rigid than the other variants
- cleaner lines
- stronger sense of command infrastructure
- systematic paperwork and map handling
- colder emotional temperature
- stronger impression of apparatus and control

Material palette:
- darker wood
- colder leather tones
- iron, steel, dark green, muted red-brown accents
- harder shadows
- restrained insignia-bearing atmosphere

Avoid:
- theatrical villain aesthetics
- modern bunker sci-fi
- over-ornamentation
```

### RS notes

- Strongest apparatus room
- Should feel organized, weighty, and deliberate
- Should remain grounded and believable
- **Map:** Desk map must be of RS territory / Serb-held areas / RS administrative area only; never a map of the whole of Bosnia and Herzegovina
- **Crest:** Wartime RS (1992–1995) only; no post-Dayton or post-1995 RS coat of arms on documents, binders, or stamps

## 11.3 HRHB warroom prompt

```text
Create a single full-scene warroom image for the Croatian Republic of Herzeg-Bosnia command environment in the early Bosnian War.

This room should communicate:
- compact authority
- regional command identity
- disciplined political-military administration
- limited scale but strong symbolic self-definition
- confidence mixed with fragility and dependency

Keep the same stable UI scene composition and object layout:
- large desk map at center
- command briefing folio
- newspaper stack
- magazine or journal
- telephone
- radio
- faction dossier or archive binder
- reserved wall space for separate flag
- reserved wall space for separate calendar

Faction-specific art direction:
- somewhat tidier and more curated than RBiH
- less heavy and monolithic than RS
- strong symbolic identity in a smaller administrative-feeling space
- compact but intentional command atmosphere

Material palette:
- medium-dark wood
- slightly brighter desk treatment
- restrained blue and warm-neutral accents
- orderly paper handling
- less exhausted than RBiH
- less severe than RS

Avoid:
- luxury political office look
- generic modern European office
- sleek western command-center styling
```

### HRHB notes

- Most compact and self-styled variant
- Orderly and identity-conscious
- Avoid making it feel weak or too polished

---

## 12. Hotspot specification

This section is specifically for the user's outline-after-generation workflow.

## 12.1 Required hotspot logic

The final scene should make these objects easily outlineable:

- desk map
- briefing folio
- newspaper stack
- magazine or journal
- telephone
- radio
- archive binder / dossier
- calendar wall area
- flag wall area

## 12.2 Best hotspot characteristics

Each hotspot should have:

- a clean silhouette
- edge separation from nearby clutter
- no major overlapping objects
- stable perspective
- enough visual room for an outline to read clearly

## 12.3 What to avoid

Avoid:

- diagonal piles of papers crossing two or more intended hotspot regions
- tiny props touching the outline edges of key objects
- severe occlusion of phone, radio, or folder edges
- bright noisy background texture directly behind modal-heavy zones

---

## 13. Flat overlay assets that still make sense

Because separate in-scene sprites are not workable in this pipeline, only **flat overlay assets** remain recommended.

These are safe because they do not need room perspective.

### Recommended flat assets

- dossier modal skins
- intelligence-paper modal skins
- report-cover modal skins
- diplomatic cable modal skins
- archive-ledger modal skins
- flat alert icons
- honors / seals / ribbon graphics for modal interiors

These should be treated as 2D overlay UI, not room props.

---

## 14. Recommended generation workflow

## Step 1: master composition

Generate one **neutral master warroom composition** first.

This should solve:

- camera
- desk arrangement
- hotspot spacing
- modal-safe regions
- readability

Do **not** start by generating three unrelated faction rooms from scratch.

## Step 2: faction variants

Use the master composition as the basis for:

- `RBiH`
- `RS`
- `HRHB`

Keep:

- object placement
- perspective
- hotspot geometry
- negative space

Change only:

- mood
- materials
- symbolic identity
- paper density
- emotional temperature

## Step 3: outline hotspots

After the scene plates are approved:

- outline modal anchors over the physical objects
- keep hotspot semantics consistent across faction variants where possible

---

## 15. Recommended implementation note

If the warroom image is regenerated, implementation should preserve compatibility with:

- [`src/ui/warroom/warroom.ts`](f:\A-War-Without-Victory\src\ui\warroom\warroom.ts)
- [`src/ui/warroom/ClickableRegionManager.ts`](f:\A-War-Without-Victory\src\ui\warroom\ClickableRegionManager.ts)
- clickable region data used for hotspot mapping

This means the art operator and implementation owner should agree on:

- final image dimensions
- hotspot object placement
- whether region JSON must be updated for the new plate

---

## 16. Final recommendation

The best warroom art direction for AWWV is:

- **one fixed master warroom scene**
- **three faction variants sharing the same layout**
- **modals anchored to physical objects in the room**
- **no perspective-dependent prop sprites**
- **only the calendar remaining an external runtime element; flag and ticker are baked in**

This approach best supports:

- the existing warroom implementation
- the user's outlining workflow
- faction identity
- warroom modal expansion
- a more believable and polished command-space fantasy

---

## 17. Summary checklist

### Must do

- one complete scene plate
- fixed perspective
- hotspot-friendly composition
- preserve space for separate flag/calendar/ticker
- maintain stable layout across faction variants

### Must not do

- modular room sprites
- separate perspective props
- dramatic lens distortion
- clutter across modal zones
- unrelated faction layouts

### Best first deliverables

1. neutral master warroom composition
2. RBiH variant
3. RS variant
4. HRHB variant
5. hotspot outline pass

