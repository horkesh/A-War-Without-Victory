# Warroom Modal Consolidation — Design Intent

**Date:** 2026-03-12
**Status:** Approved intent, not yet implemented
**Scope:** Two modal merges reducing warroom anchors from 12 to 9

---

## Motivation

The warroom scene plate requires distinct physical objects with clean silhouettes for each clickable anchor. At 12 anchors, image generation becomes unreliable — objects blur together, prompt compliance drops, and iteration cycles multiply. Several modals also overlap thematically, forcing the player to hunt across multiple objects for related information.

Two merges were approved. Two others (newspaper+radio, flag+coatrack+honors) were evaluated and rejected — the radio remains a standalone toggle, and the coatrack/honors remain separate anchors.

---

## Merge 1: Tabbed Command Briefing

### What absorbs what

**Command Folio** (anchor: `command_briefing_folio`) absorbs:
- **ReportsModal** (was sharing the folio anchor, or planned as `report_stack`)
- **OperationalSituationModal** (was on `desk_map` anchor)
- **Enclave Crisis** (planned, was `enclave_dispatch_folder`)

### Anchors removed

- `enclave_dispatch_folder` — no longer needed as a hotspot; folder can remain as decorative set dressing in room art
- The `desk_map` / cork board anchor now routes **directly to the map** (no intermediate OperationalSituationModal)

### Resulting modal structure

The merged **CommandBriefingModal** becomes a tabbed document with four sections:

| Tab | Source | Content |
|-----|--------|---------|
| **SITUATION** | CommandBriefingModal | Urgent matters, logistics status, routed brigades, cut-off units, starvation warnings, convoy status |
| **INTELLIGENCE** | ReportsModal | Municipality intelligence reports (peace: org-pen/stability/control/JNA; war: operational intel briefs). Sorted by urgency. Classified headers, FROM/TO, signatures |
| **ENCLAVES** | Enclave Crisis (planned) | Enclave-specific alerts, supply status, garrison warnings. In peace phase or when no enclaves exist: tab hidden or greyed with "No enclave situations" |
| **MAP** | OperationalSituationModal | "PROCEED TO DESK MAP" / "OPEN TACTICAL MAP" button. Sector stress summary, front summary. Effectively the old OpSit content minus the intermediate click-through |

### Visual treatment

- Each tab retains its own visual identity within the shared modal frame
- SITUATION: monospace briefing on paper texture (current CommandBriefing style)
- INTELLIGENCE: classified-document formatting (current Reports style)
- ENCLAVES: urgent/red-tagged styling
- MAP: ops-center dialog style (current OpSit style)
- Tab bar at top, styled as document divider tabs on a physical binder
- Faction-specific command labels and FROM/TO headers preserved per tab

### Behavioral changes

- **Cork board click** → opens map directly (skips OperationalSituationModal)
- **Command folio click** → opens tabbed Command Briefing, defaulting to SITUATION tab
- **IVP breakdown button** remains embedded in SITUATION tab (unchanged)
- Peace phase: ENCLAVES tab hidden; INTELLIGENCE shows peace-mode content; MAP links to Phase0PreparationMap

### Files affected (implementation scope)

- `CommandBriefingModal.ts` — becomes the host, gains tab infrastructure
- `ReportsModal.ts` — content extraction into tab renderer, file eventually deleted
- `OperationalSituationModal.ts` — content extraction into tab renderer, file eventually deleted
- `ClickableRegionManager.ts` — `desk_map` routing changed to skip OpSit
- `warroom_regions_all_modals.ts` — anchor contract updated (remove `enclave_dispatch_folder`)
- Region JSON files — `enclave_dispatch_folder` region removed
- `modals.css` — tab styling added

---

## Merge 3: Intelligence Dossier

### What absorbs what

**Intelligence Journal** (anchor: `intelligence_journal`) absorbs:
- **Turn-End Intelligence Packet** (planned, was `intelligence_packet`)

### Anchors removed

- `intelligence_packet` — no longer needed as a hotspot; sealed envelope stack can remain as decorative set dressing

### Resulting modal structure

The merged **MagazineModal** gains a second section:

| Section | Source | Content |
|---------|--------|---------|
| **OPERATIONAL REVIEW** | MagazineModal | Monthly operational review (every 4 turns). Force strength, casualties, territory, displacement, exhaustion/supply. Enemy assessment. Peace: organizational coverage, capital, stability |
| **INTELLIGENCE PACKET** | Turn-End Intelligence (planned) | Per-turn intelligence summary. New contacts, threat assessments, movement reports. Updates every turn (vs monthly for review) |

### Visual treatment

- Two-section layout rather than tabs — the journal opens to the most recent content
- If the monthly review is fresh (current turn), it leads; otherwise the per-turn packet leads
- Review section: magazine layout with faction-specific styling (current Magazine style)
- Packet section: sealed-envelope / classified-document styling
- Both sections scrollable within the single modal

### Behavioral changes

- **Journal click** → opens Intelligence Dossier with both sections
- When Turn-End Intelligence is not yet implemented, the modal behaves exactly as current MagazineModal (no visible change until the packet section is built)

### Files affected (implementation scope)

- `MagazineModal.ts` — gains second section, rename consideration to `IntelligenceDossierModal.ts`
- `warroom_regions_all_modals.ts` — anchor contract updated (remove `intelligence_packet`)
- Region JSON files — `intelligence_packet` region removed

---

## Revised Anchor Contract (9 anchors)

| # | Anchor ID | Room object | Modal / behavior |
|---|-----------|-------------|------------------|
| 1 | `wall_flag_area` | Faction flag on vertical pole | Faction Overview |
| 2 | `wall_calendar_area` | Date / next-turn board | Advance Turn |
| 3 | `desk_map` | Cork board on wall | **Direct to map** (no intermediate modal) |
| 4 | `command_briefing_folio` | Binder stack, command folio | **Tabbed Command Briefing** (Situation / Intelligence / Enclaves / Map) |
| 5 | `newspaper_stack` | Faction newspaper stack | Newspaper modal |
| 6 | `intelligence_journal` | Journal / magazine | **Intelligence Dossier** (Operational Review / Intel Packet) |
| 7 | `diplomatic_telephone` | Telephone | Diplomacy + IVP |
| 8 | `desk_radio` | Radio | News ticker toggle |
| 9 | `commander_coatrack` | Coatrack with faction uniform | Commander Register (planned) |

**Removed anchors** (now decorative set dressing only):
- `enclave_dispatch_folder` — absorbed into Command Briefing ENCLAVES tab
- `intelligence_packet` — absorbed into Intelligence Dossier
- `honors_memorial` — remains decorative; no planned modal

---

## Impact on Image Generation

Reducing from 12 to 9 interactive anchors means:
- 3 fewer objects that need clean, unambiguous silhouettes
- Remaining decorative objects (folder, envelope, shelf) can be looser in placement and don't need isolation for hit-testing
- 9 distinct objects is reliably achievable with current image models
- Prompt contracts in `20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md` should be updated to reflect the reduced anchor set

---

## What This Does NOT Change

- DeclarationEventModal (auto-triggered, not anchor-bound)
- SettingsModal / Help
- NewsTicker toggle behavior
- DiplomacyModal / IvpBreakdownModal
- FactionOverviewPanel
- Map scenes (TacticalMap, WarPlanningMap, Phase0PreparationMap)
- ModalManager infrastructure
- Any simulation or game state logic

---

## Amended Prompt Contracts

This section provides the updated prompt fragments that replace the corresponding sections in `20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md`. The changes are systematic: 12→9 anchors, three items demoted from "distinct anchor" to "decorative set dressing."

### Amended §3a — Nine-anchor contract (replaces twelve-anchor contract)

**Purpose:** One baked image per state; every warroom modal has a **dedicated silhouette** so hotspot outlining never fights overlapping folders. Prewar may show war-only anchors **dormant** (empty rack, empty frame) so **geometry matches** Year1–Year4 and region JSON stays stable.

**Rule:** Exactly **one** telephone, **one** radio. Desk clutter stays **moderate** — extra anchors use **wall, coatrack, distinct stacks**, not a second telephone. **Coatrack:** Always **faction army** uniform and **faction-specific military cap**, with **visible army insignia** (ARBiH, VRS, HVO as appropriate); Gemini knows these armies.

| # | Anchor ID | Room object | Modal / behavior |
|---|-----------|-------------|------------------|
| 1 | `wall_flag_area` | Flag on vertical pole, hanging down | Faction Overview |
| 2 | `desk_map` | Large cork board, empty/placeholder only | Tactical map projection |
| 3 | `wall_calendar_area` | Date / next-turn board, blank, flat | Advance turn overlay |
| 4 | `diplomatic_telephone` | One telephone | Diplomacy (+ IVP footer) |
| 5 | `desk_radio` | One radio | News ticker |
| 6 | `newspaper_stack` | Faction newspaper stack | Newspaper |
| 7 | `command_briefing_folio` | Binder stack (command briefing + reports + enclave alerts + map link) | Tabbed Command Briefing |
| 8 | `intelligence_journal` | Journal/magazine distinct from binders | Intelligence Dossier (operational review + intel packet) |
| **9** | `commander_coatrack` | **Coatrack with faction army uniform jacket + faction-specific military cap, both with visible army insignia (ARBiH, VRS, HVO as appropriate).** Gemini knows these armies. Not on flag pole. | Commander Register |

**Decorative set dressing** (present in room art for atmosphere; no hotspot required; no silhouette isolation needed):
- Urgent-tagged folder (red tag) — on desk, near binder stack; adds visual urgency but absorbed into Command Briefing modal
- Sealed envelope stack — on desk; adds texture but absorbed into Intelligence Dossier modal
- Honors memorial (citation booklet with ribbon; medal ribbon bar on shelf; no framed photos; no candle) — wall corner; evolves across years as before but has no modal

**Prompt fragment — append to shared core and to every faction block:**

```text
Nine distinct anchors — all fully visible and unobstructed. Exactly one telephone and exactly one radio.
9. Wall area: coatrack (commander_coatrack) — **faction army** uniform jacket and **faction-specific military cap**, with **visible army insignia** (ARBiH, VRS, HVO as appropriate); not blocking flag, cork board, date board.
Decorative set dressing (no hotspot needed; may overlap other desk items; do not need isolated silhouettes):
- One folder with urgent tagging (red string, stamp, band) near the binder stack — adds visual urgency.
- Sealed envelope stack near the journal — adds desk texture.
- Wall corner: honors memorial shelf. **Prewar:** visually neutral — empty shelf; one plain book/box; no ribbons, no citation booklets. **War (Year1+):** citation booklet (closed) with ribbon; medal ribbon bar in shallow shadow box; no framed photographs; no faction symbols. Accumulates across years. No candle.
Avoid: second telephone; second radio; coatrack replacing flag pole; coatrack attached to flag pole.
```

**Key change from old §3a:** The urgent folder, envelope stack, and honors shelf are still in the room art — they contribute atmosphere and visual richness — but they no longer need to be "distinct, non-overlapping, fully unobstructed" anchors. They can sit closer to other objects, partially overlap desk items, or be less prominent. Only the 9 anchored objects need clean silhouettes for hotspot outlining.

---

### Amended §8.1 — Initial (P1 / baseline) prompt copy-paste block

Replace the old §8.1 with this. Changes marked with `[CHANGED]` comments (remove comments before pasting to image model).

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Master — composition and requirements:
- One complete room image; wide composition; fixed camera angle.
- **One primary command desk only** — no second table, no extra foreground furniture. The desk is the **main foreground element**: avoid a large empty strip of floor between camera and desk; the desk should read as dominant in the frame (e.g. at most a narrow strip of rug in front; at most a narrow strip of floor in front — but do not push the desk into the midground with a wide empty foreground). **Tight framing:** Frame the shot so the desk is in the **immediate foreground** — at most a narrow strip of floor and rug visible in front of the desk; no wide empty floor between camera and desk.
- Strict head-on (frontal) perspective: camera directly faces the back wall. Cork board and date board appear as flat rectangles with minimal perspective distortion for projection.
- No fisheye, no Dutch angle, no dramatic tilt, no angled views, no three-quarter views of the back wall.
- Designed for later hotspot outlining: strong object silhouettes, readable edges, no key objects buried under clutter, no overlapping piles crossing multiple modal regions.
- All props painted into one coherent scene; no separate sprite; no floating-prop assumptions. The only runtime-rendered element is the calendar; faction flag and ticker are baked in.
- Must include (painted in): faction flag; central desk map placeholder (cork board, empty); command briefing folio; newspaper stack; intelligence journal; one telephone; one radio; clean wall space for calendar; **coatrack with faction army uniform jacket and faction-specific military cap, both with visible army insignia (ARBiH, VRS, HVO as appropriate)**. Nine distinct anchors total; each fully visible and unobstructed. Additionally as decorative set dressing (no hotspot needed): one urgent-tagged folder (red tag) near the binder stack; sealed envelope stack near the journal; honors memorial shelf (citation booklet with ribbon; medal ribbon bar; no framed photos; no candle — prewar: neutral/empty shelf only).

Avoid (negative prompt):
- Separate floating props; modular sprite-like objects; extreme perspective distortion; fisheye; Dutch angle; cinematic action framing; over-cluttered desk surfaces; overlapping hotspot objects; blurry silhouettes; illegible room anchors; fantasy tech; neon UI elements; sci-fi screens; modern office minimalism; cartoon stylization; excessive smoke, darkness that obscures object outlines; dramatic human figures; giant paper piles covering modal-safe areas; AI-art look; cinematic concept art; glossy render; plastic materials; over-sharpening; fake depth of field; dramatic poster composition; visible printed year; dated newspapers, dated forms; mangled phone; white placeholder rectangles; people, figures in the room — the space must be empty and unoccupied; readable English; placeholder text on wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; **large empty floor strip between camera and desk; desk pushed to midground; single loose sheet instead of a visible newspaper stack; generic military cap without visible army insignia; generic military jacket without visible army insignia.**
```

---

### Amended §8.2 — Shared core (inlined into every prompt)

Replace the old §8.2 with this:

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

The image must look like a real archival photograph; a real journalistic photograph taken inside an actual 1990s command room, not AI art, not concept art, not a 3D render, and not a cinematic illustration. Aim for documentary realism, ordinary interior photography, natural available light, believable materials, real wear, and physically plausible clutter.

On the wall: a **large cork board** as a **map placeholder only** — **empty** (with pins, empty frame, light grid). **Do not draw a detailed map**: no geography, no place names, no topography. The engine will project the full map there at runtime. Keep the board **flat and frontal** to the camera. Keep a second wall board **flat and frontal** as the date / next-turn board for runtime overlay; it must have **no readable text** — no English, no placeholder words, no legible labels. Blank; minimally gridded; illegible scribble only. No readable year anywhere.

Flag and pole (precise): The flag must hang from a vertical pole. Use a floor-standing pole in a base on the floor (base may sit on the desk). Not a wall bracket; not a wall fixture. Exactly one pole, perfectly vertical; no lean, no tilt. The flag hangs down from the pole; do not stretch it flat; do not pin it to the wall; do not show it taut. Do not pin the flag to the wall; do not tack the flag to the wall. Gold-colored pointed finial at the top is fine, as well as the gold tassels on the flag. The flag and pole must be fully visible and unobstructed — nothing in front of them (no standing lamp; no telephone; no other object blocking the flag). The telephone, radio, **newspaper stack**, and any other clickable elements must also be unobstructed. The **desk** has **moderate clutter** — telephone, radio, lamp, thermos, **faction newspaper stack**, folders, papers — **clutter limited and organized** so every clickable is clearly visible. No overwhelming piles. **Nine-anchor contract:** coatrack with faction army uniform and faction-specific cap, visible insignia (ARBiH/VRS/HVO) — each of the nine anchored objects must have a distinct silhouette, non-overlapping, fully visible. Decorative set dressing (folder with red tag; sealed envelope stack; honors memorial shelf) adds atmosphere but does not need isolated silhouettes. Any visible text must be local-language; otherwise illegible only. No readable English. No digital screens. Telephone intact and usable. **No people; no figures in the room — the space must be empty and unoccupied.**

Avoid: AI-art look, cinematic concept art, glossy render, plastic materials, over-sharpening, fake depth of field, dramatic poster composition, visible printed year, dated newspapers, dated forms, mangled phone, clean modern office, white placeholder rectangles, fisheye distortion, **people; figures in the room; readable English; placeholder text on the wall boards (e.g. "RUNTIME OVERLAY"); obstructed flag; blocked clickable elements; large empty floor strip between camera and desk; desk in midground; single loose sheet instead of a visible newspaper stack; generic military cap without visible army insignia; generic military jacket without visible army insignia.**
```

---

### Systematic find-replace guide for §9 (per-faction prompts)

Rather than reproducing all 15 prompts, apply these substitutions to every prompt in §9.1–§9.15:

| Find | Replace with |
|------|-------------|
| `Twelve distinct anchors total; each fully visible and unobstructed.` | `Nine distinct anchors total; each fully visible and unobstructed. Additionally as decorative set dressing (no hotspot needed): one urgent-tagged folder (red tag) near the binder stack; sealed envelope stack near the journal; honors memorial shelf.` |
| `Twelve distinct anchors — all fully visible and unobstructed (items 1–8 unchanged; 9–12 per §3a).` | `Nine distinct anchors — all fully visible and unobstructed (items 1–8 unchanged; 9 per §3a). Decorative set dressing (folder, envelopes, honors shelf) present for atmosphere; no hotspot isolation needed.` |
| `All twelve anchors fully visible and unobstructed.` | `All nine anchors fully visible and unobstructed.` |
| `all twelve anchors distinct and unobstructed` | `all nine anchors distinct and unobstructed` |
| `all twelve clickable elements must be unobstructed` | `all nine clickable elements must be unobstructed` |
| `all twelve clickables clearly visible and unobstructed` | `all nine clickables clearly visible and unobstructed` |
| Lines 10–12 in numbered anchor lists (enclave_dispatch_folder, intelligence_packet, honors_memorial) | Delete these three numbered items entirely from the anchor list. Add after item 9: `Decorative set dressing (not anchors): folder with red tag near binders; sealed envelope stack near journal; honors memorial shelf (prewar neutral; Year1+ accumulating citations/ribbons).` |

**For the "Must include (painted in)" lists** in initial prompts (§9.1, §9.6, §9.11):

| Find | Replace with |
|------|-------------|
| `one urgent-tagged dispatch folder (red tag); sealed envelope stack; honors memorial (citation booklet with ribbon; medal ribbon bar on shelf in shadow box; no framed photos; no candle). Twelve distinct anchors total` | `Nine distinct anchors total` |

Then add after the anchor sentence: `Additionally as decorative set dressing (no hotspot needed): one urgent-tagged folder (red tag) near the binder stack; sealed envelope stack near the journal; honors memorial shelf (prewar: neutral/empty; Year1+: citation booklet with ribbon, medal ribbon bar, accumulating across years; no framed photos; no candle).`

**Honors memorial yearly progression** lines (in Year1–Year4 follow-up prompts) remain unchanged — the memorial still evolves visually across years. Only the anchor status changes (decorative, not hotspot).

---

### Amended §3 — Hard invariants (line change)

Replace:
```
- **Clickable / modal anchors:** **twelve distinct physical props** (see §3a) plus runtime overlay quads — each must be **fully visible and unobstructed** so `hq_clickable_regions.json` can assign non-overlapping polygons. No merging binders into one blob; Honors must include a non-binder visual (frame/medal/shelf).
```

With:
```
- **Clickable / modal anchors:** **nine distinct physical props** (see §3a) plus runtime overlay quads — each must be **fully visible and unobstructed** so `hq_clickable_regions.json` can assign non-overlapping polygons. No merging binders into one blob. Decorative set dressing (urgent folder, envelope stack, honors shelf) adds atmosphere but does not need hotspot-ready isolation.
```
