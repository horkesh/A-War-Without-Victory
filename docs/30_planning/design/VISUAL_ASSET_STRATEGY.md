# Visual Asset Strategy — Gemini Pro Generation Plan

**Studio:** Pyrrhic Games
**Date:** 2026-03-15
**Tool:** Gemini Pro (image generation with exact dimensions)
**Current assets:** 51 active files, 24 MB. Formation icons are programmatic (canvas-drawn).

---

## Asset Philosophy

**Archival military realism, not video game fantasy.** The game's visual identity is a NATO operations center crossed with a war documentary. Muted colors, institutional lighting, worn textures. Nothing shiny, nothing heroic. The visual language communicates: *this is serious, this happened, these decisions had consequences.*

---

## Asset Inventory — What Exists and What's Needed

### 1. WARROOM HQ BACKGROUNDS (Exist: 15 images, 3 factions × 5 years)

**Current:** AI-generated HQ room scenes per faction per year (1991-1995). WebP, ~300-500KB each.

**Improvement opportunity:** The current images are adequate but could be more distinctive per year. The 1991 RS HQ should feel different from 1995 RS HQ (institutional decay, maps on walls showing shrinking territory, more desperate atmosphere).

**Gemini Pro task — LOW PRIORITY (current images work):**
- If regenerating: 1920×1080 WebP, dark atmospheric rooms with faction-specific details
- RS HQ: JNA-inherited furniture, maps of BiH, Orthodox iconography, gradually more bunker-like by 1995
- RBiH HQ: Improvised command post, city maps, UN reports on desk, gradually more professional by 1995
- HRHB HQ: Croatian flags alongside HVO flags, Herzegovina maps, Zagreb phone on desk

---

### 2. EVENT ILLUSTRATIONS (Need: ~40-60 images for v0.4.1)

**This is the biggest Gemini Pro opportunity.** Every major historical event should have an illustration.

**Style:** Documentary photograph aesthetic — desaturated, grain, period-appropriate. As if a war photographer captured the moment. NOT dramatic paintings or game concept art.

**Dimensions:** 800×450 WebP (16:9, fits event modal with glassmorphism overlay)

**1992 Events (15-20 images):**
| Event | Image Description | Dimensions |
|-------|------------------|-----------|
| JNA Withdrawal | Military trucks leaving barracks, soldiers removing insignia | 800×450 |
| Siege of Sarajevo | Shelled apartment buildings, smoke over city skyline | 800×450 |
| Concentration camps revealed | Barbed wire fence, emaciated figures (SENSITIVE — tasteful, not graphic) | 800×450 |
| Operation Corridor | Military convoy on narrow road through forest, Posavina landscape | 800×450 |
| London Conference | Diplomatic meeting room, suited figures at long table, UN blue | 800×450 |
| Srebrenica enclave forms | Mountain town, displaced civilians, military checkpoint | 800×450 |
| Jajce falls | Medieval fortress city, smoke, retreating column | 800×450 |
| First UN convoys | White vehicles with UN markings on damaged road | 800×450 |
| Bihać isolated | Mountain valley enclave, aerial perspective | 800×450 |
| Drina valley operations | River valley, bridges destroyed, ethnic cleansing aftermath (tasteful) | 800×450 |
| Mostar siege begins | Old Bridge still standing, divided city | 800×450 |
| HVO-ARBiH tensions | Two soldiers from different factions at roadblock, wary expressions | 800×450 |

**1993 Events (10-12 images):**
| Event | Image Description |
|-------|------------------|
| Vance-Owen collapse | Diplomatic papers scattered, frustrated negotiators |
| Croat-Bosniak war erupts | Central Bosnia village, smoke, two-front reality |
| Ahmići massacre | Burned village houses (tasteful — aftermath, not act) |
| Srebrenica shelling | Mountain enclave under fire, UN observation post |
| Mostar Old Bridge threatened | Bridge with sandbags, divided city |
| Owen-Stoltenberg plan | Map on table showing three-way partition |

**1994 Events (8-10 images):**
| Event | Image Description |
|-------|------------------|
| Markale massacre | Market square aftermath, emergency response (tasteful) |
| NATO ultimatum | Fighter jets on runway, NATO flags |
| Washington Agreement | Handshake, American flag in background, documents on table |
| Contact Group plan | Map showing 51/49 line, international diplomats |
| Bihać crisis | Enclave under assault, desperate defense |

**1995 Events (8-10 images):**
| Event | Image Description |
|-------|------------------|
| Srebrenica falls | Empty town, bus convoy, the most haunting image in the game |
| Žepa falls | Mountain enclave, surrender |
| Operation Storm | Croatian military columns, mass civilian exodus |
| NATO Deliberate Force | Explosions on military positions, aerial view |
| Federation ground offensive | Advancing troops, western Bosnia landscape |
| Dayton | Wright-Patterson AFB conference room, three delegations, maps on walls |

---

### 3. PEACE PLAN ILLUSTRATIONS (Need: 5 images for v0.3.1/v0.4.1)

Each peace plan offer should have a distinctive illustration showing the proposed map.

**Dimensions:** 600×400 WebP

| Plan | Image Description |
|------|------------------|
| Cutileiro | Map of BiH with three-color cantonization overlay, March 1992 |
| Vance-Owen | Map with 10 numbered provinces, color-coded |
| Owen-Stoltenberg | Map divided into three distinct territories |
| Contact Group | Map with clear 51/49 dividing line |
| Dayton | Final Dayton map — the most important image in the game |

---

### 4. SCENARIO BRIEFING SCREENS (Need: 3 more for v0.4.2)

**Current:** 2 exist (apr1992_briefing.png, sep1991_briefing.png)
**Need:** 3 more for the additional scenarios

**Dimensions:** 1280×720 WebP (720p, loading screen)

| Scenario | Image Description |
|----------|------------------|
| January 1993 | Winter in Bosnia, post-Corridor landscape, divided fronts visible |
| March 1994 | Spring, Washington signing aftermath, Federation unity symbolism |
| January 1995 | Dark winter, Srebrenica in distance, end approaching, heavy atmosphere |

---

### 5. VERDICT SCREEN BACKGROUNDS (Need: 3 faction-specific for v0.3.1 Phase 5)

The Pyrrhic Score verdict screen needs a faction-specific atmospheric background.

**Dimensions:** 1920×1080 WebP (full-screen behind glassmorphism overlay)

| Faction | Image Description |
|---------|------------------|
| RBiH verdict | Sarajevo skyline at dusk, damaged but standing, defiant |
| RS verdict | Banja Luka government building, flags at half-mast, empty streets |
| HRHB verdict | Mostar, rebuilt bridge skeleton, two sides of the city |

---

### 6. PEACE→WAR TRANSITION SCREEN (Need: 1 image for v0.4.0)

The dramatic "War Begins" moment.

**Dimensions:** 1920×1080 WebP

**Description:** Split composition — left half shows a peaceful Bosnian town (pre-war), right half shows the same town burning/shelled. The dividing line runs through the center. Desaturated, documentary style. This single image captures the entire tragedy.

---

### 7. MAIN MENU / TITLE SCREEN (Need: 1 image for v0.5.1)

**Current:** `game start.webp` exists but may need refresh.

**Dimensions:** 1920×1080 WebP

**Description:** A war room table seen from above. Maps of BiH spread across it, marked with faction colors. Coffee cups, ashtrays, radio equipment at the edges. Three chairs pushed back — as if the commanders just left. Dim overhead light. The title "A WAR WITHOUT VICTORY" in austere military stencil font overlaid.

---

### 8. LOADING SCREENS (Need: 5-8 for v0.7.3)

Atmospheric images shown during scenario loading.

**Dimensions:** 1920×1080 WebP

Themes: mountain roads, destroyed bridges, refugee columns, UN checkpoints, artillery positions, sniper alley, winter in Sarajevo, empty market square.

---

### 9. COMMANDER PORTRAITS (Need: ~30 for v0.4.5/v0.5.4)

For the officer system — portrait illustrations for key named officers.

**Dimensions:** 256×320 WebP (portrait aspect, used in OfficerProfile component)

**Style:** Military portrait, slightly stylized (not photographic — avoids likeness issues with living persons). Uniform-focused, showing rank insignia, faction colors. Face partially shadowed or abstracted.

**Priority commanders (10 most visible):**
- Mladić, Milovanović, Talić, Galić (RS)
- Halilović, Delić, Dudaković, Orić (RBiH)
- Petković, Blaškić (HRHB)

**Second tier (20 more):** remaining corps commanders and key successors.

---

### 10. TUTORIAL ILLUSTRATIONS (Need: 10-15 for v0.5.2)

Instructional diagrams explaining game mechanics.

**Dimensions:** 600×400 WebP

Topics: how to read the map, what sectors mean, how operations work, understanding supply, officer management, negotiation capital, the Pyrrhic Score.

**Style:** Clean diagrammatic, dark background matching game UI, accent-gold annotations.

---

## Generation Priority Order

| Priority | Asset Set | Count | For Version | When to Generate |
|----------|-----------|-------|-------------|-----------------|
| **P0** | Event illustrations (1992) | 15-20 | v0.4.1 | Before v0.4.1 implementation |
| **P0** | Peace plan maps | 5 | v0.4.1 | Before v0.4.1 Phase 5 (Event UI) |
| **P1** | Scenario briefing screens | 3 | v0.4.2 | Before scenario authoring |
| **P1** | Peace→War transition | 1 | v0.4.0 | Before v0.4.0 Phase 2 |
| **P1** | Event illustrations (1993-1995) | 20-30 | v0.4.1 | Before v0.4.1 Phase 4 |
| **P2** | Verdict screen backgrounds | 3 | v0.5.1 (polish) | Before UI completion |
| **P2** | Commander portraits | 10+20 | v0.4.5 / v0.5.4 | Before officer experience / AI commander |
| **P3** | Main menu refresh | 1 | v0.5.1 | Before UI completion |
| **P3** | Loading screens | 5-8 | v0.7.3 | Before visual polish |
| **P3** | Tutorial illustrations | 10-15 | v0.5.2 | Before tutorial |

---

## Technical Specifications for Generation

### Standard Prompt Prefix (use for all Gemini Pro generations):
```
Style: Documentary war photography aesthetic. Desaturated colors, film grain,
period-appropriate (1990s Balkans). Muted tones — grey, olive, brown, cold blue.
NOT dramatic fantasy art. NOT heroic. NOT colorful. Think war correspondent's
photograph, slightly faded. Institutional/military atmosphere.

For sensitive content (massacres, camps, displacement): Show AFTERMATH, not the
act. Burned buildings, empty shoes, abandoned belongings. Never graphic violence
or identifiable victims.
```

### File Naming Convention:
```
event_{event_id}.webp          — event illustrations
plan_{plan_id}.webp            — peace plan maps
scenario_{scenario_id}.webp    — briefing screens
verdict_{faction}.webp         — verdict backgrounds
commander_{officer_id}.webp    — officer portraits
loading_{number}.webp          — loading screens
tutorial_{topic}.webp          — tutorial diagrams
```

### Output Location:
```
src/ui/map/assets/events/       — event illustrations
src/ui/map/assets/plans/        — peace plan maps
src/ui/map/assets/scenarios/    — scenario briefings
src/ui/map/assets/verdicts/     — verdict backgrounds
src/ui/map/assets/commanders/   — officer portraits
src/ui/map/assets/loading/      — loading screens
src/ui/map/assets/tutorial/     — tutorial illustrations
```

---

## Integration Notes

- All images loaded via Vite `?url` import (same as warroom assets)
- WebP format for all new assets (no PNG)
- Event images referenced in event JSON: `"image": "events/event_jna_withdrawal.webp"`
- Commander portraits referenced by officer ID: `getCommanderPortrait(officerId)`
- Lazy-load all images (don't bundle into main chunk)
- Fallback: if image missing, show faction-colored gradient placeholder

---

## Existing Plans — Asset Additions

### v0.4.0 (Peace Phase Interactivity)
- Add: Peace→War transition image (1 image, P1)
- In PeaceWarTransition.tsx: full-screen background behind glassmorphism overlay

### v0.4.1 (Complete Event System)
- Add: Event illustrations (40-50 images, P0)
- Add: Peace plan map illustrations (5 images, P0)
- In EventModal.tsx: event image above narrative text
- In PeacePlanModal.tsx: plan map below territorial split display

### v0.4.2 (Additional Scenarios)
- Add: Scenario briefing screens (3 images, P1)
- In scenario selection screen: briefing image as background

### v0.4.5 (Officer Experience)
- Add: Commander portraits (10 priority, P2)
- In OfficerProfile.tsx: portrait above name/stats

### v0.5.1 (UI Completion)
- Add: Verdict backgrounds (3 images, P2)
- Add: Main menu refresh (1 image, P3)
- In VerdictScreen.tsx: faction-specific background
- In main menu: title screen background

### v0.5.2 (Tutorial)
- Add: Tutorial illustrations (10-15 images, P3)
- In tutorial component: instructional diagrams

### v0.7.3 (Visual Polish)
- Add: Loading screens (5-8 images, P3)
- In loading component: atmospheric images

---

*"The camera doesn't lie. It just chooses what to frame."*
