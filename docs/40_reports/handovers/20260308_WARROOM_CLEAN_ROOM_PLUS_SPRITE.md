# Warroom: Faction Base Rooms + Yearly War States + Overlay Surfaces

**Date:** 2026-03-08  
**Type:** Asset-generation handover — faction base rooms, yearly room aging, projected overlays  
**Status:** Active direction  
**Use:** Generate a **stable documentary-photograph room per faction**, then derive `prewar`, `year1`, `year2`, `year3`, `year4` states while preserving geometry. The **map is on the wall**: a **large cork board** that is a **placeholder only** (empty, or with pins / empty frame — **no detailed map baked**); at runtime the engine **projects the full interactive map** into that quad. A separate **date / next-turn board** stays flat and frontal for runtime overlay. The **flag** is baked into the room art. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — but **keep clutter limited and organized** so all clickables remain clearly visible. No overwhelming piles.

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
- **Clickable / modal anchors:** the flag, telephone, radio, **newspaper stack**, and any other clickable elements must be **fully visible and unobstructed**.
- **Desk:** **moderate clutter only** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles that bury the telephone, radio, or newspapers.
- **Text:** any visible text must be Bosnian / Croatian / Serbian as appropriate, or illegible. No readable English.
- **Upper-right wall:** no distracting readable text.
- **No digital screens** or modern displays.
- **Telephone must be intact** and not mangled.
- **No visible year anywhere in the room art.**
- **No people or figures.** The room must be empty of persons — an unoccupied command room, as if photographed between briefings.

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
The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. The room should feel photographed, not staged for a poster.
```

### Negative prompt language to keep

```text
Avoid: AI-art look, cinematic concept art, stylized drama, hyper-clean 3D render, exaggerated mood lighting, plastic-looking materials, glossy surfaces, fake shallow depth of field, over-sharpened textures, surreal symmetry, luxury production design, dramatic color grading, poster-like staging, heroic composition, video-game splash art. **No people or figures in the room — empty, unoccupied space.**
```

---

## 5. Faction identity and recurring props

Use these as **low-salience recurring props**, not as main anchors and not as substitute modals.

### RBiH

- Tone: improvised state command, survivalist bureaucracy, dignified under scarcity.
- Recurring props:
  - practical thermos or enamel mug
  - mixed civilian-military file folders
  - spare radio cable / handset component
  - logistics or dispatch forms at the side

### RS

- Tone: colder, more bureaucratic, more severe and administrative.
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

**Time of day — lights dim across the war:** Use a fixed progression so the room slowly moves from day to night across the years, culminating in full night in Year4 (1995).

- **Prewar:** **Daytime** — natural light from the window, clear archival feel.
- **Year1 (1992):** **Daytime or soft afternoon** — room still busy in daylight.
- **Year2 (1993):** **Late afternoon / early evening** — light beginning to go, more reliance on desk lamp.
- **Year3 (1994):** **Evening** — dimmer, window darker, room lit mainly by lamp(s).
- **Year4 (1995):** **Full night** — window dark or very dim, room lit by desk lamp and practicals only; strong late-war feel.

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

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter.

On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere.

Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.**

Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

---

## 9. Prompt pack

Each prompt block below is a single copy-paste prompt: everything is inlined (no separate appendix). RBiH (9.1–9.5) and RS (9.6–9.10) share the same structure for direct comparison.

### 9.1 RBiH — Prewar

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Generate a Republic of Bosnia and Herzegovina command room in the tense prewar period. The room should feel governmental, improvised, and dignified under pressure, but not yet fully consumed by long war routine. Daytime scene: natural light from a window, clear archival feel.

RBiH identity: period-appropriate RBiH flag integrated naturally into the room; no post-1998 symbolism. The flag must be fully visible and unobstructed.

On the wall: a **large cork board** as a **map placeholder only** — **empty** or with pins / empty frame; **do not draw a detailed map**. Keep the cork board flat and frontal to the camera. A separate **date / next-turn board** (flat, frontal, no readable text) for runtime overlay.

Desk: telephone, military or institutional radio, desk lamp, ashtray, thermos or enamel mug, **faction newspaper stack** (e.g. folded papers or stack with period masthead — RBiH e.g. Oslobođenje-style), mixed civilian-military folders, papers. **Moderate clutter only** — keep clutter limited and organized so telephone, radio, newspaper stack, and other clickables remain clearly visible. No overwhelming piles.

Mood: restrained, preparatory, institutional, serious, slightly improvised. Worn wood, modest office furniture, muted green, brown, grey, and institutional off-white. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.2 RBiH — Year1

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year1 of wartime use: more urgency, more side paperwork, slightly more smoke residue, more visible use of ashtray, more radio-use feeling, stronger sense of operational activation. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: daytime or soft afternoon** — room still busy in daylight.

RBiH tone: improvised state command adapting under pressure, but still energetic rather than exhausted. Keep the thermos or mug, mixed folders, and practical field-office feel.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.3 RBiH — Year2

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year2 of wartime use: entrenched command routine, denser paperwork, more worn surfaces, more cigarette traces, more used lamp and desk surfaces, stronger logistical and administrative burden. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: late afternoon or early evening** — light beginning to go, more reliance on desk lamp.

RBiH tone: still improvised and dignified, but increasingly burdened and resource-stretched. Keep the recurring practical props and let them look more used, not replaced.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.4 RBiH — Year3

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year3 of wartime use: accumulated fatigue, darker wear patterns, more persistent smoke staining, more paperwork density at the sides, more visibly overused furniture and desk surfaces. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: evening** — dimmer, window darker, room lit mainly by lamp(s).

RBiH tone: survivalist bureaucracy under prolonged strain. The room should feel held together through necessity and discipline, not theatrical destruction.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.5 RBiH — Year4

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year4 of wartime use: hardened exhaustion, deep wear, tired surfaces, more severe signs of long duration, but the room is still functioning as a command space. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: full night** — window dark or very dim, room lit by desk lamp and practicals only; strong late-war feel.

RBiH tone: heavily burdened but still dignified and operational. No theatrical ruin. No collapse. Just the visible cost of long war use.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.6 RS — Prewar

RS prompts below are aligned with the RBiH pack: same structure (daytime/archival Prewar, explicit wall/desk instructions, shared core), same yearly follow-up pattern and lighting progression, with RS tone (colder, bureaucratic, severe) and period symbolism (1992–1995, no post-Dayton).

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Generate a Republika Srpska command room in the tense prewar period. The room should feel colder, more bureaucratic, more rigid, and more severe than a civilian office — institutional and administrative, not yet fully consumed by long war routine. Daytime scene: natural light from a window, clear archival feel.

RS identity: wartime-era RS symbolism (1992–1995) appropriate to the period, integrated naturally into the room art; no post-Dayton symbolism. The flag must be fully visible and unobstructed.

On the wall: a **large cork board** as a **map placeholder only** — **empty** or with pins / empty frame; **do not draw a detailed map**. Keep the cork board flat and frontal to the camera. A separate **date / next-turn board** (flat, frontal, no readable text) for runtime overlay.

Desk: heavier field or command telephone, sturdier radio, desk lamp, ashtray, rigid stamped binders or document trays, harder cigarette pack or small glass as subtle side prop only, **faction newspaper stack** (e.g. folded papers or stack with period masthead — RS e.g. Glas Srpski–style), restrained side papers. **Moderate clutter only** — keep clutter limited and organized so telephone, radio, newspaper stack, and other clickables remain clearly visible. No overwhelming piles.

Mood: austere, harder, administrative, formal, darker wood and colder walls. Keep clutter restrained in prewar. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.7 RS — Year1

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year1 of wartime use: stronger command pressure, slightly denser paperwork at the sides, more tobacco use, more severe atmosphere, more active communications feel. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: daytime or soft afternoon** — room still busy in daylight.

RS tone: bureaucratic and forceful, newly operationalized, not yet exhausted. Keep the heavier phone, rigid binders, and hard administrative atmosphere.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.8 RS — Year2

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year2 of wartime use: entrenched bureaucratic war routine, denser side paperwork, more stamped and handled binders, more smoke traces, slightly harsher institutional wear. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: late afternoon or early evening** — light beginning to go, more reliance on desk lamp.

RS tone: colder, more rigid, more administrative, more settled into wartime hierarchy. Props should feel used, not rearranged into a different room.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.9 RS — Year3

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year3 of wartime use: accumulated harsh wear, more severe smoke and stain traces, more paperwork density at the edges, stronger sense of command fatigue without disorder. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: evening** — dimmer, window darker, room lit mainly by lamp(s).

RS tone: stern, overused, and increasingly burdened by duration. Avoid caricature. Avoid theatrical villain aesthetics.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.10 RS — Year4

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year4 of wartime use: hardened institutional exhaustion, visibly overused materials, tired but functional command atmosphere, stronger signs of long-duration strain. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: full night** — window dark or very dim, room lit by desk lamp and practicals only; strong late-war feel.

RS tone: bureaucratic severity under late-war fatigue. No ruin, no melodrama, no visible year markings, no change to interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.11 HRHB — Prewar

```text
Generate a Herceg-Bosna / HRHB command room in the prewar period. The room should feel like a compact regional command room: tidier and slightly more orderly than the others, but still clearly serious and wartime-adjacent.

HRHB identity: period-appropriate HRHB / HVO-era visual identity baked naturally into the room art.

On the wall: a **large cork board** as a **map placeholder only** — **empty** or with pins / empty frame; **do not draw a detailed map**. Flat and frontal. A separate **date / next-turn board** (flat, frontal, no readable text).

Desk: intact telephone, military or institutional radio, desk lamp, ashtray, clipped dispatch folders, **faction newspaper stack**, tidier desk accessories, restrained side papers. **Moderate clutter only** — keep clutter limited and organized so clickables stay visible.

Mood: compact authority, regional administration, cleaner discipline, warm-neutral and restrained blue accents. Keep clutter limited in prewar. No visible year anywhere except the future runtime calendar overlay.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.12 HRHB — Year1

```text
Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year1 of wartime use: somewhat denser paperwork, slightly stronger command-post atmosphere, a little more smoke and use, but still relatively organized. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: daytime or soft afternoon.**

HRHB tone: compact regional wartime administration, more pressured but still controlled. Keep the clipped folders and tidier desk logic.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.13 HRHB — Year2

```text
Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year2 of wartime use: mature wartime routine, denser side paperwork, more visible use of ashtray and lamp, more administrative pressure, but still more orderly than RBiH and less monolithic than RS. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: late afternoon or early evening.**

HRHB tone: disciplined, regional, increasingly burdened but still relatively composed.

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.14 HRHB — Year3

```text
Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year3 of wartime use: accumulated wear, denser paper handling, more smoke and long-hours fatigue, slightly darker strain, but retain the faction's more orderly visual discipline. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: evening.**

Do not add visible year markings. Do not change the interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
```

### 9.15 HRHB — Year4

```text
Use the attached image as the exact same room. Do not redesign the room.

Transform it into Year4 of wartime use: visibly tired, worn, and prolonged by duration, but still functioning and still more ordered than total chaos. Keep the same geometry, same wall map (cork board + pinned map), same date board, same flag, same furniture, same camera.

**Lighting: full night.**

HRHB tone: late-war exhaustion in a compact regional HQ, no melodrama, no visible year markings, no change to interaction anchors.

The image must look like a real archival or journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter. On the wall: a **large cork board** as a **map placeholder only** — **empty** (or with pins / empty frame / light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank or minimally gridded or illegible scribble only. No readable year anywhere. Flag is baked naturally into the room art and must be **fully visible and unobstructed** (nothing in front of it). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. Any visible text must be local-language or illegible. No readable English. No digital screens. Telephone intact and usable. **No people or figures in the room — the space must be empty and unoccupied.** Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people or figures in the room, readable English or placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"), obstructed flag or blocked clickable elements.**
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
