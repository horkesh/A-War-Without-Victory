# Warroom Prompt Pack v2 — Nine-Anchor Modular Architecture

**Date:** 2026-03-12
**Supersedes:** Prompt pack in `20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md` §8–§9
**Design basis:** `20260312_WARROOM_MODAL_CONSOLIDATION.md` (9-anchor contract)
**Target model:** Gemini (image generation); structure also suitable for other models

---

## Design philosophy (what changed from v1)

**v1 problem:** 15 monolithic copy-paste prompts, each ~500 words, with the shared core duplicated inline. Negative instructions accumulated organically from fighting model failures, producing walls of "avoid" text that competed for attention with positive composition. Anchor count (12) exceeded what models could reliably place with distinct silhouettes.

**v2 approach:**

1. **Modular assembly.** Three layers — Master Template + Faction Block + Year Block — composed into a single prompt at generation time. No duplication. Edit one layer, all prompts update.
2. **Positive composition first.** Describe spatial layout explicitly ("telephone right of center, radio far right") rather than relying on "avoid X obstructing Y" chains. Negative prompt stays short and categorical.
3. **Nine anchors.** Three former anchors (urgent folder, envelope stack, honors shelf) demoted to "decorative set dressing" — present for atmosphere, no silhouette isolation required.
4. **Spatial layout diagram.** An ASCII layout included per faction so the model has a concrete composition target, not just a parts list.

---

## 1. Master Template

Copy this entire block as the base of every prompt. Then append the Faction Block (§2) and the Year Block (§3).

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape orientation.

STYLE: Documentary photograph — archival press interior, 1990s photojournalism. Real materials, real wear, available light. Not AI art; not concept art; not a 3D render; not cinematic illustration. The room must look photographed, not designed.

CAMERA: Strict head-on frontal. Camera directly faces the back wall. All vertical lines parallel — no converging perspective, no fisheye, no Dutch angle, no tilt. Camera at desk height or slightly above. Cork board and date board appear as flat rectangles.

FRAMING: One primary command desk in the immediate foreground — the desk's front edge must appear in the **bottom 25%** of the frame. At most a narrow strip of floor/rug between camera and desk. No wide empty foreground. The desk is the dominant element — desk items must be large enough to identify and outline for hotspot work. The entire cork board and the entire date board must be fully inside the frame — nothing cropped.

PROJECTION SURFACES (critical — both boards on the BACK WALL):
The room has two wall-mounted boards. Both are on the **same back wall** — the wall the camera faces directly. Both appear as **flat rectangles** with zero perspective distortion. The game engine projects interactive content onto these surfaces at runtime; if either board is on a side wall or at an angle, projection breaks.
- **CORK BOARD**: Large — at least **40% of the back wall width**. Left-center of the back wall. Empty cork surface only. No map, no geography, no text, no pushpins with notes. This is the dominant wall feature.
- **DATE BOARD**: Smaller — roughly **40-60% of the cork board's width**. Mounted on the **back wall to the right of the cork board** (with the flag pole between them or adjacent). Completely blank — no text, no grid, no scribble. Must face the camera straight-on, exactly like the cork board does. NOT on a side wall. NOT at an angle. NOT around a corner.

COMPOSITION — WALL (back to front):
- BACK WALL, LEFT-CENTER: Cork board (see PROJECTION SURFACES above).
- BACK WALL, RIGHT OF CORK BOARD: Date board (see PROJECTION SURFACES above).
- RIGHT WALL ZONE: Faction flag on a floor-standing vertical pole with base. Flag hangs down; not stretched flat; not pinned to wall. Gold finial. Flag fully visible — nothing in front of it. The flag pole stands between or near the two boards.
- WALL AREA (corner or side): Coatrack — faction army uniform jacket and faction-specific military cap clearly visible as separate items. Military cap must be identifiable as a distinct object (hanging on a hook or resting visibly — not hidden behind the jacket). Visible army insignia on the jacket. Not on flag pole; not blocking cork board or date board.

COMPOSITION — DESK (left to right):
- LEFT: Command briefing folio (binder stack) + nearby folder with red tag (decorative).
- LEFT-CENTER: Newspaper stack with faction masthead visible (text illegible).
- CENTER: Ashtray, lamp, small personal items. Moderate clutter only.
- CENTER-RIGHT: Intelligence journal (one magazine, distinct from binders) + nearby sealed envelope stack (decorative).
- RIGHT: Telephone — intact, fully visible.
- FAR RIGHT: Radio — fully visible, not blocked by telephone.

COMPOSITION — WALL CORNER:
- Honors memorial shelf. PREWAR: visually neutral — empty shelf or one plain book. WAR YEARS: citation booklet with ribbon; medal ribbon bar in shadow box; accumulates across years. No framed photos; no candle; no faction symbols.

ANCHOR CONTRACT: Nine objects must have clean, distinct silhouettes for hotspot outlining — (1) flag, (2) cork board, (3) date board, (4) telephone, (5) radio, (6) newspaper stack, (7) command briefing folio, (8) intelligence journal, (9) coatrack. Each fully visible and unobstructed. No two anchors overlapping.

DECORATIVE SET DRESSING (no hotspot needed; may sit close to other objects):
- Red-tagged folder near binder stack
- Sealed envelope stack near journal
- Honors memorial shelf in wall corner

RULES:
- Exactly one telephone. Exactly one radio.
- No people; no figures; empty unoccupied room.
- **TEXT RULE (strict)**: Every piece of visible text in the scene — newspaper mastheads, journal covers, binder spines, folder labels, forms, wall signs — must be in **Bosnian, Croatian, or Serbian** (Latin or Cyrillic script), or must be **too small / blurred to read**. No English words anywhere. No Latin-alphabet words that read as English. This includes the intelligence journal cover — it must NOT say "Intelligence" or any English title.
- No visible year, date, or number that could be read as a year.
- No digital screens; no modern displays.
- Telephone intact and usable — not mangled.

DO NOT:
- Bake a detailed map onto the cork board (runtime projection only)
- Write text on the date board (runtime overlay only)
- Place the date board on a **side wall**, around a corner, or at an angle — both boards MUST be on the **back wall**, flat and frontal to the camera, like two pictures hanging side by side
- Mount the date board on any wall other than the wall the camera faces
- Include people, figures, or silhouettes of people
- Use fisheye, Dutch angle, or dramatic camera angles
- Create wide empty floor between camera and desk
- Make the desk a midground element with empty foreground
- Produce AI-art aesthetic, cinematic concept art, or glossy 3D render
- Show a visible printed year, dated newspapers, or dated forms
- Write English words on any object — no "Intelligence", no "Report", no "News", no English titles on journal or magazine covers
- Place readable English anywhere in the scene — all text on desk items, covers, spines, and papers must be local-language or illegible
- Stack objects on top of the nine anchor items
- Use a second telephone or second radio
```

---

## 2. Faction Blocks

Append **one** of these after the Master Template.

### 2.1 RBiH — The Presidency

```text
FACTION: Republic of Bosnia and Herzegovina (RBiH).

ARCHITECTURAL IDENTITY: This is a room inside the **Presidency of Bosnia and Herzegovina building in Sarajevo** — a grand Austro-Hungarian government building, now repurposed as wartime command. The architecture must read as late 19th-century Habsburg institutional: **high vaulted ceilings** (3.5m+); **ornate white plaster crown molding and ceiling rosettes**; **tall double-leaf windows** (floor-to-near-ceiling) with heavy dark-green velvet drapes and sheer inner curtains; **polished herringbone parquet floor** with a large worn oriental rug under the desk; **plastered walls** — off-white or warm cream, with subtle cracking and age. The room is grand but faded — a once-dignified state building now under siege conditions. If a door is visible in the back wall (period-appropriate double-leaf door), it must be **closed** and visually secondary to the cork board.

DESK: **Massive dark oak institutional desk** — heavy, pre-war government furniture, not military-issue. Carved legs; leather writing surface (worn). High-backed executive leather chair behind it. This is a politician's desk repurposed for war command — it should feel inherited, not chosen. **The desk must be close to the camera** — its front edge appears in the bottom 20-25% of the frame. Desk items must be large enough to clearly identify each object for hotspot outlining.

LIGHTING FIXTURE: Brass or bronze **chandelier** (period-appropriate, not modern) hangs from the ceiling rosette — visible but not dominant. A practical **desk lamp** also on the desk. **In prewar the desk lamp is switched OFF** — no glow, no light cone; room lit by daylight and chandelier only. In war years the lamp is lit when specified by the Year Block. Desk lamp must not obstruct cork board or flag.

FLAG: 1992–1998 RBiH design — white field, blue shield with gold fleurs-de-lis. Crest right-side up. No post-1998 symbols.

NEWSPAPER: **Oslobođenje** broadsheet stack — folded broadsheet; several issues so it reads unmistakably as a newspaper stack. Masthead visible; text illegible. No loose sheets on top.

COATRACK — PREWAR: **Green beret** (clearly visible as a separate item — hanging on a hook above the jacket or placed prominently on the coatrack, not hidden behind the jacket) + uniform jacket with visible **TO BiH** (Teritorijalna odbrana BiH) insignia — a simple shield shape with "TO" letters. **NOT** the post-1998 modern Bosnia and Herzegovina coat of arms (yellow triangle with stars). No modern BiH state symbols.
COATRACK — WAR YEARS: **Green beret** (same visibility requirement) + uniform jacket with visible **ARBiH** (Army of RBiH) insignia.

RECURRING PROPS (low salience): Practical thermos or enamel mug (no pens inside mugs); mixed civilian-military file folders; spare radio cable; logistics or dispatch forms at the side. A box of candles or battery lantern (siege power cuts). Mismatched office supplies — nothing matches because nothing can be replaced.

EMOTIONAL KEY: This room tells the story of a grand state institution reduced to improvisation under siege. The architecture says "government" — the desk clutter says "survival." The contrast between the ornate Habsburg ceiling and the military radio on the desk IS the RBiH story.

SPATIAL LAYOUT (approximate — desk CLOSE to camera, cork board LARGE):
┌──────────────────────────────────────────────────────────┐
│  ┌TALL WINDOW┐                                           │
│  │ drapes    │                                           │
│  └──────────┘                                            │
│                                                          │
│  ┌═══════ BACK WALL ══════════════════════════════════┐  │
│  │ ┌════ CORK BOARD ════┐  FLAG  ┌─DATE BOARD─┐      │  │
│  │ │  (large, dominant, │ (pole) │ (smaller,  │      │  │
│  │ │   40%+ of wall)    │        │  blank,    │      │  │
│  │ │                    │        │  flat)     │      │  │
│  │ └════════════════════┘        └────────────┘      │  │
│  └════════════════════════════════════════════════════┘  │
│  COATRACK (left corner,                  HONORS SHELF   │
│   beret visible above jacket)                            │
│  chandelier (ceiling, above desk)                        │
├──── desk front edge in bottom 20-25% of frame ──────────┤
│  BINDER+FOLDER  NEWSPAPER  LAMP(off) JOURNAL+ENV       │
│                                      PHONE       RADIO  │
│  ════════════ DESK (grand oak, leather top) ════════════ │
│              ~~~ worn oriental rug ~~~                    │
│  ─ narrow parquet strip ─                                │
└──────────────────────────────────────────────────────────┘
NOTE: Cork board and date board are BOTH on the back wall — the wall
the camera faces. Date board is NOT on a side wall or around a corner.
```

### 2.2 RS — The Mountain Command Post

```text
FACTION: Republika Srpska (RS).

ARCHITECTURAL IDENTITY: This is a room in a **Yugoslav-era military or government building** — the kind of concrete-and-wood institution found in Pale, Han Pijesak, or Banja Luka. Think JNA officers' club or municipal government building repurposed as VRS headquarters. The dominant feature is **heavy dark vertical wood paneling** covering the back wall — dark reddish-brown, varnished, with visible grain and age. **Lower ceiling** than RBiH (standard 2.8m); **simpler plaster above the paneling** — no ornament, no crown molding. **Linoleum or worn tile floor** with a heavy dark rectangular rug. **Smaller window** than RBiH — standard double-pane, not grand. The room feels like a **JNA briefing room that was never designed to be beautiful** — functional, authoritarian, institutional. Heavy, dark, enclosed.

DESK: **Heavy dark wood desk** — JNA-surplus or Yugoslav government-issue. Rectangular, solid, no ornamental carving. Functional chair (padded armrests, fabric, not leather executive). Metal desk drawers. The desk was requisitioned, not inherited from a palace.

LIGHTING FIXTURE: **No chandelier.** Overhead fluorescent strip (visible, institutional). **Desk lamp** on the desk — heavier, more industrial than RBiH. Must not obstruct the cork board (not in front of it; not in line of sight). Must not obstruct the flag. Lamp off in prewar (bright room); on when needed in darker years.

WINDOW: **Smaller** than RBiH. Old-style curtains — heavy tan drapes + sheer white lace curtains. Period-appropriate Yugoslav fabric. Not floor-to-ceiling; standard institutional window.

FLAG: Wartime-era RS (1992–1995) plain tricolor only — three horizontal stripes: red (top), blue (middle), white (bottom). No crest; no emblem. No post-2000; no post-Dayton RS symbolism.

NEWSPAPER: **Glas Srpske** in Cyrillic — masthead reads "Глас Српске" with visible golden decorations (gilded lettering, gold outline, gold band/emblem). Top newspaper fully visible; no loose papers or envelopes on top covering the masthead.

COATRACK: **VRS** uniform jacket and **Serb traditional military cap** (e.g. šajkača — period-appropriate; let the model interpret), with **visible VRS insignia**.

RECURRING PROPS (low salience): Heavier field telephone; rigid stamped binders or document trays; cigarette pack, small glass; optional discreet bottle as side prop (never central). Metal filing cabinet partially visible. Olive-drab military items mixed with civil service stationery.

EMOTIONAL KEY: This room is purpose-built for command — there is no irony in its use, no repurposing. The JNA inheritance is physical: the building, the furniture, the filing system. The wood paneling absorbs light and makes the room feel enclosed and controlled. Where RBiH is a palace under siege, RS is a bunker that was always a bunker.

SPATIAL LAYOUT (approximate):
┌──────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓ DARK WOOD PANELING (full back wall) ▓▓▓▓▓▓▓ │
│  [window]                                                │
│  tan drapes                                              │
│  ┌═══════ BACK WALL ══════════════════════════════════┐  │
│  │  ┌════ CORK BOARD ════┐  FLAG  ┌─DATE BOARD─┐     │  │
│  │  │     (large)        │ (pole) │ (smaller,  │     │  │
│  │  │                    │        │  blank)    │     │  │
│  │  └════════════════════┘        └────────────┘     │  │
│  └════════════════════════════════════════════════════┘  │
│  COATRACK (corner)                         HONORS SHELF  │
│  ═══ fluorescent strip (ceiling) ═══                     │
├──────────────────────────────────────────────────────────┤
│  NEWSPAPER+BINDERS  ASHTRAY/GLASS   JOURNAL+ENV         │
│  LAMP (left,desk)                   PHONE         RADIO  │
│  ════════════ DESK (dark, JNA-surplus) ═════════════════ │
│              ~~~ heavy dark rug ~~~                       │
│  ─── linoleum or worn tile floor ───                     │
└──────────────────────────────────────────────────────────┘
NOTE: Cork board and date board are BOTH on the back wall — the wall
the camera faces. Date board is NOT on a side wall or around a corner.

RS-SPECIFIC CAMERA NOTE: All vertical lines (window frame, wall edges, board sides, wood paneling grain) must be parallel. No converging perspective. Compose so the right edge of the image falls to the right of the date board — both boards fully visible, not cropped at any edge.
```

### 2.3 HRHB — The Regional Administration

```text
FACTION: Herceg-Bosna / HRHB (HVO).

ARCHITECTURAL IDENTITY: This is a room in a **Croatian-style regional administrative building** — the kind found in Grude, Mostar, or Livno. Think municipal government or a repurposed commercial building: **Mediterranean-influenced architecture** with **white or light-cream plastered walls**; **exposed stone accents** — a stone archway, stone window frame, or partial stone wall section (limestone, not granite — Herzegovinian karst stone). **Lower ceiling** than RBiH but airier than RS. **Terracotta tile floor** or lighter wood parquet; smaller worn rug. **Shuttered windows** — wooden interior shutters (not heavy drapes), possibly with thin curtains behind them. The room is smaller and more compact than either RBiH or RS — a regional office, not a national headquarters.

DESK: **Medium-sized wooden desk** — lighter wood than RS (walnut or lighter oak), tidier, more civilian. Not grand like RBiH; not military-surplus like RS. A practical regional administrator's desk. Simpler chair — wooden with cushion, or basic padded office chair.

LIGHTING FIXTURE: **No chandelier; no fluorescent strip.** A **standing floor lamp** or **simple pendant lamp** (warm light, Mediterranean style). **Desk lamp** also present — compact, cleaner than the others. Must not obstruct cork board or flag.

WINDOW: **Shuttered** — wooden interior shutters, lighter than RS drapes. Possibly a smaller arched window (Mediterranean). Natural light is warm and southern — different quality from the grey Sarajevo or mountain Pale light.

FLAG: Period-appropriate HRHB / HVO-era flag. On a floor-standing pole; baked into the room art.

NEWSPAPER: **Hrvatski Vojnik** or HRHB faction newspaper stack — masthead visible; text illegible. Reads clearly as a newspaper stack, not generic papers.

COATRACK: **HVO** uniform jacket and **Croat traditional military cap**, with **visible HVO insignia**.

RECURRING PROPS (low salience): Clipped dispatch folders; tidier desk accessory grouping; restrained ashtray or cigarette case. A crucifix or small religious image on the wall (subtle, period-accurate for Herzegovina — not dominant). Croatian-language forms and stationery.

EMOTIONAL KEY: This room is the smallest and most provincial of the three — a regional command, not a national capital. It reads as "local government office pressed into military service." The Mediterranean light and stone accents ground it in Herzegovina specifically — this is not Zagreb, not a national army, but a regional force operating from the buildings it has. Where RBiH has grandeur-under-siege and RS has institutional darkness, HRHB has compact provincial authority — tidy, competent, constrained by scale.

SPATIAL LAYOUT (approximate):
┌──────────────────────────────────────────────────────────┐
│  ┌─SHUTTERED─┐    stone accent                           │
│  │  WINDOW   │                                           │
│  └───────────┘                                           │
│  ┌═══════ BACK WALL ══════════════════════════════════┐  │
│  │  ┌════ CORK BOARD ════┐  FLAG  ┌─DATE BOARD─┐     │  │
│  │  │     (large)        │ (pole) │ (smaller,  │     │  │
│  │  │                    │        │  blank)    │     │  │
│  │  └════════════════════┘        └────────────┘     │  │
│  └════════════════════════════════════════════════════┘  │
│  COATRACK (corner)                          HONORS SHELF │
│                    pendant lamp (ceiling)                 │
├──────────────────────────────────────────────────────────┤
│  BINDER+FOLDER  NEWSPAPER   LAMP/ASHTRAY  JOURNAL+ENV  │
│                                           PHONE   RADIO  │
│  ════════════ DESK (lighter wood, tidy) ════════════════ │
│              ~~~ small worn rug ~~~                       │
│  ─── terracotta tile or light parquet ───                │
└──────────────────────────────────────────────────────────┘
NOTE: Cork board and date board are BOTH on the back wall — the wall
the camera faces. Date board is NOT on a side wall or around a corner.
```

---

## 3. Year Blocks

Append **one** of these after the Faction Block. Each year block is self-contained — it states lighting, curtains, wear level, and honors progression.

### 3.0 Prewar

```text
YEAR STATE: Prewar (1991) — institutional, tense, preparatory. Room not yet consumed by wartime routine.

LIGHTING & CURTAINS:
- RBiH: Darkness 3/5 — overcast, subdued midday. Curtains partially open. **Desk lamp is present on the desk but SWITCHED OFF** — no glow, no light cone, no warm pool of light. Room lit by daylight from window and overhead chandelier only.
- RS: Bright sunny daytime. Curtains open; slightly drawn. Full daylight. Desk lamp off. No smoke.
- HRHB: Daytime — natural light, clear archival feel. Desk lamp off.

ROOM CONDITION: Clean institutional state. No smoke staining. No heavy wear. Minor signs of administrative use only.

HONORS SHELF: **MUST be visually neutral in prewar** — empty shelf; one plain book or box at most. **No ribbons; no medals; no citation booklets; no shadow box contents; no memorial elements whatsoever.** The memorial only begins accumulating in Year1. If the shelf has any military honors visible, the image is wrong for prewar.

FLAG CONDITION: New or near-new. Clean, unfaded.

COATRACK CHECK: The military cap (green beret for RBiH, šajkača for RS, Croat cap for HRHB) must be **clearly visible as a separate item** from the jacket — hanging on a hook above the jacket or placed prominently. If the cap is not distinguishable, the image is wrong.
```

### 3.1 Year1 (1992)

```text
YEAR STATE: Year1 (1992) — first wartime year. Room becomes activated and improvised. Urgency; stronger command-post atmosphere.

Use the previous image as the exact same room. Do not redesign the room. Keep same geometry, same furniture positions, same camera angle, same wall surfaces.

LIGHTING & CURTAINS:
- RBiH: Darkness 4/5 — late afternoon / early evening. Shadows lengthen; desk lamp in use.
- RS: Soft afternoon. Heavy drapes cover ~1/3 of window glass. Desk lamp remains off.
- HRHB: Daytime or soft afternoon.

ROOM CONDITION: Slight increase in use. A few more cigarette butts in ashtray. A few more papers at desk edges. Early signs of wall wear: slight hairline cracks, minor discoloration.

HONORS SHELF: First memorial appearance — one citation booklet (closed) with ribbon; one medal ribbon bar in shadow box. Minimal.

FLAG CONDITION: Light wear — slight fading, dust, minor edge wear. Still clearly serviceable.

COATRACK (RBiH only): Switch from TO BiH to ARBiH insignia.

Cork board and date board must remain completely blank — same as prewar.
```

### 3.2 Year2 (1993)

```text
YEAR STATE: Year2 (1993) — entrenched wartime routine. Denser paperwork; more worn surfaces; administrative burden visible.

Use the previous image as the exact same room. Do not redesign the room. Keep same geometry, same furniture positions, same camera angle, same wall surfaces.

LIGHTING & CURTAINS:
- RBiH: Darkness 5/5 — full dark. Window black. Room lit by desk lamp and practicals only. Siege longest night.
- RS: Late afternoon / early evening. Desk lamp on. Heavy drapes cover ~1/2 of window glass.
- HRHB: Late afternoon or early evening.

ROOM CONDITION: More visible use. Fuller ashtray. Cigarette traces and minor stains on desk surface. Binders and folders look more handled. Clearer wall cracks; stained paneling.

HONORS SHELF: Two to three citation booklets; two to three medal ribbon bars. Shelf clearly fuller.

FLAG CONDITION: Moderate wear — more fading, softened edges, perhaps a small mend. Not replacement-level.

Cork board and date board must remain completely blank — same as prewar.
```

### 3.3 Year3 (1994)

```text
YEAR STATE: Year3 (1994) — accumulated fatigue. Darker wear patterns; persistent smoke staining; more paperwork density; visibly overused furniture.

Use the previous image as the exact same room. Do not redesign the room. Keep same geometry, same furniture positions, same camera angle, same wall surfaces.

LIGHTING & CURTAINS:
- RBiH: Darkness 2/5 — softening. Soft daytime; room brightening again.
- RS: Evening. Window dark. Heavy drapes cover ~3/4 of window. Room lit primarily by desk lamp.
- HRHB: Evening.

ROOM CONDITION: Noticeable accumulation. Well-used ashtray. Stronger smoke staining on desk surface. Increased paperwork density. Props feel overused. Clearer cracks; soot or smoke discoloration on walls.

HONORS SHELF: Multiple ribbon bars; several citation booklets. Shelf dense.

FLAG CONDITION: Noticeable wear — faded, slightly frayed edges, possible small stains or mends. Still the same flag; not replacement-level.

Cork board and date board must remain completely blank — same as prewar.
```

### 3.4 Year4 (1995)

```text
YEAR STATE: Year4 (1995) — hardened exhaustion. Deep wear; tired surfaces; long-duration strain. Room still functioning as command space — no theatrical ruin; no melodramatic collapse.

Use the previous image as the exact same room. Do not redesign the room. Keep same geometry, same furniture positions, same camera angle, same wall surfaces.

LIGHTING & CURTAINS:
- RBiH: Darkness 1/5 — bright afternoon. Hopeful, clear light. Restoration feel.
- RS: Full night. Heavy drapes fully closed. Room lit exclusively by desk lamp and practical interior lighting.
- HRHB: Full night.

ROOM CONDITION: Heavy but functional. Ashtray full or nearly full. Strong smoke and stain traces on desk. Desk and materials visibly overused. Telephone and radio remain intact and fully usable. Pronounced wall cracks; peeling or stained paint; aged ceiling; heavily worn paneling.

HONORS SHELF: Memorial at fullest — multiple ribbon bars; several citation booklets; shelf visibly full. No faces; no faction crests.

FLAG CONDITION: Heavy wear — faded, worn edges, visible mends or stains. Long-used and tired but still in place. Not replacement-level.

Cork board and date board must remain completely blank — same as prewar.
```

---

## 4. Assembly instructions

To produce a single copy-paste prompt for any faction×year combination:

1. Start with the **Master Template** (§1)
2. Append the appropriate **Faction Block** (§2.1 / §2.2 / §2.3)
3. Append the appropriate **Year Block** (§3.0–§3.4)
4. For **Prewar** (initial image): use as-is — this is the baseline generation
5. For **Year1–Year4** (follow-ups): attach the previous year's approved image and begin the Year Block with "Use the previous image as the exact same room"

**Example assembly for RS Year2:**
```
[Master Template §1]
[RS Faction Block §2.2]
[Year2 Block §3.2]
```

Total prompt length: ~600–700 words (vs ~1200+ in v1). The spatial layout diagram and positive composition instructions replace most of the old negative-avoidance chains.

---

## 5. Faction-specific RS camera block

For RS prompts, always append this after the faction block (RS rooms had persistent camera compliance issues in v1):

```text
RS CAMERA COMPLIANCE:
- Camera faces back wall directly — no angle from left; no angle from right.
- Back wall (cork board and date board) appears perpendicular to viewer.
- Desk is front-on; no diagonal recession.
- All vertical lines parallel: window frame, wall edges, board sides, wood paneling grain.
- Both boards fully inside frame — compose so right edge of image falls to the right of the date board.
```

---

## 5a. Refinement prompts (DEPRECATED)

**Status: DEPRECATED.** Three passes proved that refinement prompts do not reliably fix issues with Gemini — the model responds better to getting it right in the initial prompt. All fixes from Passes 1–3 have been folded back into the Master Template (§1), Faction Blocks (§2), and Year Blocks (§3). The prompts below are retained for historical reference only. **Do not use them — rework the base prompts instead.**

### 5a.1 RBiH Prewar — refinement after Pass 1 (superseded by 5a.2)

*Superseded — see 5a.2 below.*

### 5a.2 RBiH Prewar — refinement after Pass 2

```text
OUTPUT: exactly 2752 × 1536 pixels, landscape.

Use the attached image as the base. This is an RBiH Presidency room (prewar). Keep the exact same architectural style, furniture, camera angle, and room character. The cork board size, desk proximity, and overall composition are good — keep them. Apply these corrections:

1. DATE BOARD ON THE BACK WALL: The date board (whiteboard) is currently mounted on the **right side wall at an angle** to the camera. This is wrong — it must be on the **BACK WALL**, to the right of the cork board and to the right of the flag, **flat and frontal to the camera** (perpendicular to the viewer). The engine projects date/turn content onto this surface at runtime; an angled surface breaks projection. Move the whiteboard so it hangs on the same back wall as the cork board. Keep it smaller than the cork board (roughly half its width). Completely blank — no text, no grid.

2. NO ENGLISH TEXT ON DESK ITEMS: The intelligence journal/magazine currently has English text visible on the cover ("Intelligence"). All visible text on desk items must be in **Bosnian/Croatian/Serbian** or **completely illegible**. No readable English anywhere in the scene. The journal should look like a local-language military or intelligence publication.

3. DESK LAMP OFF: This is **prewar** — the desk lamp should be present on the desk but **switched off** (no visible glow, no light cone). The room is lit by natural daylight from the window and the chandelier.

4. GREEN BERET VISIBLE ON COATRACK: The uniform jacket is visible on the coatrack but the **green beret** must also be clearly visible — hanging on a hook or placed on the coatrack. The beret should read as a distinct military item, not blend into the jacket.

Keep everything else exactly as it is: same chandelier, same crown molding, same herringbone parquet, same oriental rug, same dark green drapes, same oak desk with leather top, same executive chair. Same large cork board (good size — keep it). Same flag (RBiH fleurs-de-lis on floor-standing pole). Same desk proximity to camera (good — keep it). Same desk items in the same left-to-right arrangement (binders, newspaper, lamp, journal, phone, radio). Same documentary realism — archival photograph, not AI art. No people. No readable English. No visible year.
```

---

## 6. Post-generation follow-up prompts

### 6.1 Measure cork board quad

```text
This attached warroom image is exactly 2752 × 1536 pixels. On the wall there is a large empty cork board (map placeholder). Measure the visible cork board surface.

Return:
Top-Left: (x, y)
Top-Right: (x, y)
Bottom-Right: (x, y)
Bottom-Left: (x, y)

Fallback bounding box:
Top-Left X:
Top-Left Y:
Width:
Height:

Use the visible inner edge of the board, not the outer frame.
```

### 6.2 Measure date board quad

```text
This attached warroom image is exactly 2752 × 1536 pixels. Measure the wall-mounted date / next-turn board.

Return:
Top-Left: (x, y)
Top-Right: (x, y)
Bottom-Right: (x, y)
Bottom-Left: (x, y)

Fallback bounding box:
Top-Left X:
Top-Left Y:
Width:
Height:

Use the visible board edge, not surrounding wall.
```

### 6.3 Measure clickable region bounds

```text
This attached warroom image is exactly 2752 × 1536 pixels. Identify and measure bounding rectangles for each of these nine interactive objects:

1. wall_flag_area — the flag and pole
2. desk_map — the cork board on the wall
3. wall_calendar_area — the date board on the wall
4. diplomatic_telephone — the telephone on the desk
5. desk_radio — the radio on the desk
6. newspaper_stack — the newspaper stack on the desk
7. command_briefing_folio — the binder stack on the desk
8. intelligence_journal — the journal/magazine on the desk
9. commander_coatrack — the coatrack with uniform

For each, return:
- Anchor ID
- Top-Left: (x, y)
- Bottom-Right: (x, y)
- Width × Height

Use tight bounding boxes around each object's visible silhouette.
```

---

## 7. Quick reference — what changed from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Anchors | 12 | 9 (3 demoted to decorative) |
| Prompt count | 15 monolithic | 3 layers × compose |
| Shared core | Duplicated inline in every prompt | Master Template (one copy) |
| Composition guidance | Parts list + negative avoidance | ASCII layout diagram + positive spatial |
| Negative prompt | ~150 words per prompt | ~80 words (Master Template only) |
| Total words per assembled prompt | ~1200 | ~600–700 |
| Honors shelf | Anchor #12 (hotspot) | Decorative (no hotspot) |
| Urgent folder | Anchor #10 (hotspot) | Decorative (no hotspot) |
| Envelope stack | Anchor #11 (hotspot) | Decorative (no hotspot) |
| Cork board click | → OperationalSituationModal → Map | → Map directly |

---

## 8. Hard invariants (unchanged from v1)

These remain non-negotiable:

- **2752 × 1536** authoring resolution; **1376 × 768** display resolution
- Strict frontal camera; no fisheye; no Dutch angle
- Cork board = empty placeholder (runtime map projection)
- Date board = blank (runtime overlay)
- Flag baked in room art
- No people; no figures
- No readable English; no visible year
- No digital screens
- Geometry stable across all 5 year states per faction
- 9 anchored objects: clean silhouettes, non-overlapping, fully visible

---

## 9. Generation lessons learned (living section)

Update this section after each generation pass. These are observed model behaviors that inform prompt refinement.

### RBiH Prewar — Pass 1 (2026-03-12, Gemini)

**What worked well:**
- Habsburg Presidency architecture: crown molding, ceiling rosette, chandelier, herringbone parquet, oriental rug, double-leaf door, dark green drapes — all landed perfectly
- Documentary realism: image reads as a photographed interior, not AI art
- All 9 anchors present and identifiable
- Flag correct (RBiH fleurs-de-lis, floor-standing pole, gold finial)
- Coatrack with green beret and uniform visible
- Desk items generally well-placed and distinct

**What needs fixing (incorporated into v2.1 prompt updates):**
1. **Cork board too small** — appeared as ~15% of back wall width. The runtime map projection needs this to be the dominant wall feature. **Fix applied:** Master Template now specifies "at least 40% of the back wall width" and "dominant wall feature." Spatial diagram updated with proportional cork board.
2. **Honors shelf showed medals in prewar** — shadow box had ribbon bars and citations visible. Prewar must be neutral/empty. **Fix applied:** Year Block §3.0 now has emphatic language: "no ribbons, no medals, no citation booklets, no shadow box contents... if the shelf has any military honors visible, the image is wrong for prewar."
3. **Desk too far from camera** — ~20% of frame was floor/parquet. Desk items were small, making hotspot outlining harder. **Fix applied:** Master Template FRAMING now specifies "desk's front edge must appear in the bottom 25% of the frame." RBiH faction block adds "desk must be close to the camera — front edge in bottom 20-25%."
4. **Door in back wall** — white double-leaf door appeared center-left. Architecturally authentic for Presidency building but competes with cork board for attention. **Fix applied:** RBiH faction block now notes "if a door is visible, it must be closed and visually secondary to the cork board."
5. **Date board proportions** — date board was similar size to cork board. It should be noticeably smaller. **Fix applied:** Master Template now specifies date board "roughly 40-60% of the cork board's width."
6. **Right-side arch** — decorative arch appeared on far right wall. Adds authenticity but crowds the coatrack/honors area. **Status:** Not explicitly blocked — monitor in next pass. If it recurs and creates problems, add to faction block.

### RBiH Prewar — Pass 2 (2026-03-12, Gemini, refinement from Pass 1)

**What improved:**
- Cork board much larger — now dominant wall feature, close to 40% target
- Desk closer to camera — items identifiable, tighter framing
- Door gone — cleaner back wall
- Honors shelf neutral/empty — prewar fix worked
- Oslobođenje newspaper stack clearly readable

**What needs fixing (incorporated into v2.2 prompt updates):**
1. **Date board on side wall (critical)** — whiteboard placed on the right side wall at ~45° angle. Runtime projection requires it flat and frontal on the back wall. **Fix applied:** Master Template now explicitly states "on the same back wall as the cork board, not on a side wall" and "perpendicular to the camera." Added to DO NOT list: "Place the date board on a side wall." Refinement prompt §5a.2 makes this correction #1.
2. **English text on journal** — magazine cover reads "Intelligence" in English. Violates no-English rule. **Fix applied:** DO NOT list now specifies "all text on desk items, covers, spines, and papers must be local-language or illegible." Refinement prompt §5a.2 addresses this.
3. **Desk lamp lit in prewar** — should be present but switched off; room lit by daylight. Minor. **Fix applied:** in refinement prompt §5a.2.
4. **Green beret not clearly visible** — uniform jacket on coatrack but beret hard to confirm. **Fix applied:** in refinement prompt §5a.2.
5. **Radio very large** — olive military field radio dominates right desk area. Functionally fine (clean silhouette) but reads as field equipment rather than institutional. **Status:** acceptable — good hotspot target. Monitor.

### RBiH Prewar — Pass 3 (2026-03-12, Gemini, refinement from Pass 2 using §5a.2)

**Result: Refinement prompt approach FAILED.** The §5a.2 prompt was attached with the Pass 2 image. Gemini did not reliably apply the corrections — date board remained misplaced, English text persisted. This confirmed that iterative refinement prompts are not a viable strategy with Gemini for spatial corrections.

**Key lesson:** All critical spatial constraints must be in the **initial base prompt** — not in follow-up refinement. Gemini treats refinement prompts as suggestions, not commands. The base prompts (Master Template + Faction Block + Year Block) have now been reworked to incorporate all Pass 1–3 fixes directly:
- Dedicated PROJECTION SURFACES section in Master Template (§1) — emphatic back-wall placement for both boards
- Spatial diagrams in all three faction blocks now show both boards explicitly inside a labeled "BACK WALL" box
- "NOT on a side wall" repeated in PROJECTION SURFACES, COMPOSITION, and DO NOT list (triple reinforcement)
- Text rule strengthened with specific English word examples to avoid ("Intelligence", "Report", "News")
- Desk lamp explicitly "SWITCHED OFF" in prewar year block with "no glow, no light cone" specifics
- Green beret / military cap visibility requirement in both faction block and year block
- §5a refinement prompts marked DEPRECATED

### RBiH Prewar — Pass 4 (2026-03-12, Gemini, reworked base prompts v2.2)

**Result: Best pass yet. Date board placement FIXED.**

**What worked:**
- Date board on the back wall, flat and frontal — the PROJECTION SURFACES section and triple reinforcement worked
- Green beret clearly visible on coatrack
- Cork board large and dominant
- Desk close to camera, items identifiable
- Desk lamp appears off
- Documentary realism excellent
- All 9 anchors present and identifiable
- Habsburg architecture fully landed

**Remaining minor issues:**
1. **Honors shelf has items** — right wall shelves show a book/object. Should be bare in prewar. **Fix applied:** assembled prompt (§Pass 5) adds explicit "bare shelves only" + DO NOT entry.
2. **Cork board ~30% width** — good but could be bigger. **Fix applied:** assembled prompt bumps to "45%+".
3. **Oriental rug not visible** — hidden by desk or absent. **Fix applied:** assembled prompt specifies "visible under and in front of the desk."
4. **Journal cover text** — unclear at resolution. Monitor.

**Action:** Assembled single prompt written to `20260312_ASSEMBLED_RBIH_PREWAR.md` for Pass 5 — merges all three layers into one targeted prompt with Pass 4 fixes inline.

### RBiH Prewar — Pass 5 (2026-03-12, Gemini, assembled single prompt)

**Result: Near production-ready. Two persistent issues remain.**

**What worked:**
- Date board on back wall — solid, consistent now
- Cork board larger than Pass 4
- Green beret visible
- Oriental rug visible (fix worked)
- Honors shelf minimal/acceptable
- Desk close, items identifiable
- Documentary realism excellent
- Oslobođenje masthead correct

**Issues:**
1. **Post-1998 BiH crest on uniform sleeve** — modern yellow-triangle-with-stars coat of arms visible on jacket patch. Should be pre-war TO BiH insignia (simple shield with "TO" letters). Gemini defaults to the modern state symbol. **Fix applied:** Assembled prompt now explicitly describes the TO BiH insignia shape AND explicitly prohibits "yellow triangle with stars" in both the composition section and DO NOT list. Master prompt pack RBiH faction block updated.
2. **Journal still says "Intelligence" in English** — despite the text rule, Gemini keeps generating this English title on the magazine cover. The word "Intelligence" in the desk composition line may be triggering it. **Fix applied:** Assembled prompt now describes the journal as "plain magazine or dossier" with "NO readable title — either blank, or text too small to read, or Bosnian-language title only." Added explicit DO NOT entry: "Write a readable title on the intelligence journal cover."

**Action:** Assembled prompt updated to Pass 6 version in `20260312_ASSEMBLED_RBIH_PREWAR.md`.

### RBiH Prewar — Pass 6 (2026-03-12, Gemini, assembled single prompt with easel/insignia/journal fixes)

**Result: Architecture and vaulting gorgeous. Cork board wall-mounted. But regression on telephone count and coatrack form.**

**What worked:**
- Cork board HUNG ON WALL — no easel (fix worked)
- Date board on back wall, flat, blank, no grid (all fixes landed)
- One window (fix worked)
- Cork board large (~45%)
- Journal cover — no visible English (fix worked!)
- Documentary realism excellent
- Desk close, items identifiable
- Lamp appears off
- Honors shelf bare
- Oriental rug visible
- Radio clearly visible

**Issues:**
1. **Two telephones** — white phone right of flag + another on desk. Prompt says "exactly one" but Gemini duplicated.
2. **Coatrack is a dress form / mannequin stand** — not a proper coatrack with hooks. Green beret perched on mannequin head looks odd.
3. **User decision: drop headgear entirely from coatrack.** Just patch the RBiH crest onto the jacket. Simplifies the coatrack constraint.

### RBiH Prewar — Pass 7 (2026-03-12, Gemini, assembled single prompt — initially accepted, then flag rejected)

**Result: All layout constraints landed but flag fleurs-de-lis were wrong.** Lilies looked malformed/simplified. Led to Passes 7b and 8.

**All constraints landed except flag heraldry:**
- Cork board hung on wall, large (~45%), dominant
- Date board on back wall, flat, blank, no grid
- One window, one telephone, one radio
- Proper wooden coatrack with hooks (not mannequin)
- Jacket with RBiH fleurs-de-lis crest patch visible — no headgear (per user decision)
- No English text on any desk item
- Oslobođenje masthead in Bosnian
- Desk close, items identifiable, good hotspot silhouettes
- Lamp off, honors shelf bare (one book acceptable)
- Documentary realism excellent — vaulted Habsburg architecture stunning
- Oriental rug visible
- **Flag heraldry wrong** — lilies malformed on the shield

### RBiH Prewar — Pass 7b (2026-03-12, Gemini, reference image attached + heraldry description)

**Result: Flag WORSE.** Gemini acknowledged it couldn't reproduce the heraldry from a reference image: "the model successfully incorporated the lilies and stripe from your reference, but it simplified the overall flag." Architecture also regressed to vaulted Gothic ceiling. Confirmed: Gemini cannot reliably reproduce heraldic detail from reference images alone.

### RBiH Prewar — Pass 8 (2026-03-12, Gemini, merged Pass 7 prompt + new flag language — accepted then superseded)

**Result: Production-ready but lacked desk lamp.** Flag heraldry correct. All layout constraints landed. But desk lamp was not present as a physical object, making Year 1 "switch on" impossible — Gemini would invent a lamp from scratch, changing desk composition.

### RBiH Prewar — Pass 9 (2026-03-12, Gemini, Pass 8 + explicit desk lamp — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RBiH Prewar plate.**

**All constraints landed:**
- Cork board hung on wall, large (~45%), dominant
- Date board on back wall, flat, blank, no grid
- One window, one telephone, one radio
- Proper wooden coatrack with hooks, olive military jacket
- Jacket with RBiH fleurs-de-lis crest patch visible — no headgear
- No English text on any desk item
- Oslobođenje masthead in Bosnian
- Desk close, items identifiable, good hotspot silhouettes
- **Desk lamp present but OFF** — green banker's lamp, no glow (ready for Year 1 switch-on)
- Honors shelf bare (recessed wall niche)
- Documentary realism excellent — flat ceiling with crown molding and rosette
- Oriental rug visible
- Executive chair visible
- **Flag heraldry CORRECT** — blue shield, diagonal white stripe, six gold fleurs-de-lis, right-side up, taut

**Lesson: desk lamp must be seeded in prewar.** Year-to-year follow-up prompts that say "switch on the lamp" fail if there's no lamp to switch on — Gemini fabricates one from scratch, breaking desk composition continuity. All prewar prompts must include an explicit, visible, switched-off desk lamp.

**Key fix — flag heraldry language that works:**
The critical missing detail was describing the **"diagonal white stripe"** inside the blue shield. Previous prompts said "diagonal band of lilies" which Gemini couldn't interpret. The working description:
> "WHITE field, BLUE shield centered on the flag. Inside the blue shield: a DIAGONAL WHITE STRIPE running upper-left to lower-right, with SIX GOLDEN FLEURS-DE-LIS arranged in two rows of three along the stripe."
Plus crest orientation instructions and "FAIRLY TAUT" to prevent drape from obscuring the design.

**Additional fixes over Pass 7:**
- "high FLAT ceilings — NOT vaulted, NOT arched, NOT Gothic" prevents architecture regression
- "military jacket (olive or dark green, not black, not civilian)" prevents civilian suit
- "small wall shelf, NOT a large bookcase" prevents bookcase substitution
- "the chair MUST be visible" prevents missing chair
- "no pushpins" on cork board

**Winning prompt formula (lessons for other factions):**
- Single assembled prompt (not modular layers) — Gemini handles one coherent block better
- PROJECTION SURFACES as dedicated section with "HUNG ON THE WALL" repeated
- Explicit counting ("ONE telephone only", "ONE window only") + matching DO NOT entries
- "Wooden coatrack with hooks" beats generic "coatrack" (avoids mannequin interpretation)
- Drop headgear complexity — jacket-only coatrack is simpler and reliable
- Journal described as "plain magazine or dossier" with "NO readable title" avoids English text trigger
- Flag heraldry: describe the **diagonal white stripe** inside the shield explicitly — "diagonal band" alone fails
- Flag: "FAIRLY TAUT" prevents drape from obscuring crest
- Negative architecture constraints: explicitly block wrong ceiling types (vaulted, Gothic, arched)
- Explicit jacket color/type prevents civilian interpretation
- DO NOT list: ~26 entries, each specific and actionable
- Reference images do NOT help Gemini with heraldry — descriptive text is the only reliable channel
- Desk lamp must be seeded in prewar (present but OFF) — follow-up "switch on" fails without a visible lamp to reference
- No haze/smoke/fog — static plates should not suggest movement or dynamic atmosphere

### RBiH Year 1 (1992) — Pass 1 (2026-03-12, Gemini, follow-up from Pass 9 prewar — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RBiH Year 1 plate.**

**All constraints landed:**
- Lamp ON — same green banker's lamp, warm glow on desk surface
- Darker mood (4/5) — weaker daylight, late afternoon
- All anchor objects in same positions as prewar
- Cork board empty, date board blank — same positions
- Flag heraldry correct, consistent with prewar
- Architecture consistent — flat ceiling, crown molding, chandelier
- Executive chair visible
- Coatrack same position, olive jacket
- One window, one phone, one radio
- Wall cracks more visible — good year-over-year progression
- Honors niche has citation + ribbon — correct for Year 1
- No haze or atmospheric effects (fix worked)
- Oriental rug visible
- Documentary realism maintained

**Key lesson: "no haze" rule.** Initial Year 1 attempt had cigarette haze. User flagged: static plates should not suggest dynamic atmosphere. Haze removed from prompt + added to DO NOT. Standing rule for all year prompts.

### RBiH Year 2 (1993) — Pass 1 (2026-03-12, Gemini, follow-up from Year 1 — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RBiH Year 2 plate.**

**All constraints landed:**
- Window BLACK — full night, 5/5 darkness, siege darkest year
- Lamp ON + chandelier — only light sources
- Wall cracks significantly more visible, plaster discoloration/staining — clear progression
- Desk more cluttered, papers more disorganized
- All anchor objects in same positions
- Cork board empty, date board blank
- Flag heraldry correct, moderate wear
- Honors niche fuller — multiple items
- No haze
- Architecture consistent
- Documentary realism maintained

### RBiH Year 3 (1994) — Pass 1 (2026-03-12, Gemini, follow-up from Year 2 — rejected)

**Result: Two issues.** (1) Newspaper stack buried under loose papers — anchor violation. (2) Wall cracks too subtle — not visibly worse than Year 2.

### RBiH Year 3 (1994) — Pass 2 (2026-03-12, Gemini, reinforced wall cracks + anchor visibility — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RBiH Year 3 plate.**

**All constraints landed:**
- Daylight returns — soft, diffused, 2/5 darkness. Clear contrast with Year 2's black window
- Lamp ON but less dominant — daylight supplements
- Wall cracks DRAMATIC — long jagged lines across entire back wall, water/yellowing stains around cork board. Huge improvement over Pass 1
- Newspaper stack visible — masthead readable, not buried (fix worked)
- Flag shows wear — edges stained/yellowed, fabric softer
- All anchor objects in same positions
- Cork board empty, date board blank
- Flag heraldry correct
- Honors niche dense — multiple ribbons/citations
- No haze
- Architecture consistent
- Documentary realism maintained

**Key fixes over Pass 1:**
- ANCHOR VISIBILITY section added — explicitly protects newspaper stack from being buried under loose sheets
- Wall cracks: "at least 3-4 visible crack lines," "OBVIOUS at a glance — not subtle" — much stronger language
- Standing lesson: as desk clutter increases in later years, anchor visibility must be explicitly reinforced

**RBiH lighting arc summary:**
- Prewar: Daylight 3/5, lamp OFF
- Year 1: Late afternoon 4/5, lamp ON
- Year 2: BLACK night 5/5, lamp + chandelier only
- Year 3: Soft daylight 2/5, lamp ON
- Year 4: Bright afternoon 1/5, lamp ON — hopeful, restoration

### RBiH Year 4 (1995) — Pass 1 (2026-03-12, Gemini, follow-up from Year 3 Pass 2 — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RBiH Year 4 plate. RBiH faction COMPLETE — 5/5 plates accepted.**

**All constraints landed:**
- BRIGHT daylight — 1/5 darkness, strongest light in entire arc. Window wide open, light flooding
- Wall damage clearly WORSE than Year 3 — peeling plaster patches, larger staining, flaking near ceiling
- Lamp ON but overwhelmed by daylight
- Flag worn — staining on fabric edges, frayed gold cord
- Newspaper stack visible — masthead readable
- All anchor objects in same positions
- Cork board empty, date board blank
- Flag heraldry correct
- Honors niche full — complete memorial
- No haze
- Architecture consistent
- Documentary realism maintained

**RBiH COMPLETE.** All 5 plates (Prewar + Years 1-4) accepted. Lighting arc, wear progression, honors accumulation, and flag degradation all track correctly across the series.

### RS Prewar — Pass 1 (2026-03-13, Gemini — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RS Prewar plate.**

**All constraints landed:**
- Dark wood paneling — heavy vertical grain, dark reddish-brown, dominant back wall feature
- Cork board on back wall, large, empty — good size and placement
- Date board on back wall to right of cork board, flat, blank — correct position
- RS tricolor flag (red-blue-white) on floor-standing pole — correct wartime-era design, no crest
- Glas Srpske newspaper stack — Cyrillic masthead visible
- Wooden coatrack with VRS uniform jacket and šajkača cap visible
- Telephone and radio on desk — distinct, identifiable
- Command briefing folio (binders) on left desk area
- Journal/magazine on desk — no English text
- Desk lamp present but OFF — bright daylight, no glow (ready for Year 2 switch-on)
- Honors shelf visible — empty bookshelf on right wall, visually neutral (intended for war-year medal/citation accumulation)
- Fluorescent overhead lighting — institutional, JNA-era
- Lower ceiling, simpler plaster — correct contrast with RBiH Habsburg grandeur
- Documentary realism excellent — reads as photographed JNA briefing room
- No people, no English text, no visible year
- All 9 anchors present with clean silhouettes

**RS lighting arc (defined in Year Blocks §3.0–§3.4 — mirrors VRS doctrinal arc):**
- Prewar: Bright sunny daytime, lamp OFF — JNA confidence, professional order
- Year 1: Soft afternoon, drapes 1/3 covered, lamp OFF — early war, still in control
- Year 2: Late afternoon/early evening, lamp ON, drapes 1/2 — sustained operations wearing
- Year 3: Evening, window dark, drapes 3/4 — attrition biting hard
- Year 4: Full night, drapes fully closed, lamp only — darkness, exhaustion

This arc inverts the RBiH arc: RS starts bright (professional confidence) and ends in darkness (attrition, brain drain). RBiH starts dim (siege, improvisation) and ends bright (hope, restoration). The crossing point is Year 2 — RBiH's darkest hour is RS's turning point from confidence to strain.

### RS Year 1 (1992) — Pass 1 (2026-03-13, Gemini, follow-up from Prewar — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RS Year 1 plate.**

**All constraints landed:**
- Same room geometry, same furniture positions, same camera angle — no redesign
- Drapes covering ~1/3 of window — correct Year 1 dimming
- Desk lamp present but OFF — enough daylight, consistent with RS Year 1 spec
- Cork board on back wall, large, empty — same position as prewar
- Date board on back wall, flat, blank — faint marks noted, monitor in Year 2
- RS tricolor flag correct, slight dust/softening vs prewar
- Glas Srpske Cyrillic masthead visible, not buried
- Telephone and radio fully visible, same positions
- Command briefing folio with red-tagged folder on left desk
- Coatrack with VRS jacket and peaked officer's cap (JNA-inherited formal headgear — acceptable)
- Honors shelf has first items — medal/ribbon visible. Good progression from empty prewar
- Desk clutter increased — more papers, ashtray with butts, glass. Working atmosphere
- No haze, no English text, no people
- Documentary realism maintained
- Fluorescent overhead still on

**Minor notes (not blocking):**
- Cap is peaked officer's cap rather than šajkača — reads as JNA-inherited formal headgear, actually better for early war
- Date board has faint marks — monitor in Year 2 to ensure it stays blank

### RS Year 2 (1993) — Pass 1 (2026-03-13, Gemini, follow-up from Year 1 — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RS Year 2 plate.**

**All constraints landed:**
- Same room geometry, same furniture positions, same camera angle — no redesign
- Desk lamp ON — subtle warm glow on desk surface (first time in RS arc). Fluorescent overhead also on — mixed lighting as specified
- Drapes covering ~1/2 of window — more closed than Year 1, less daylight entering
- Cork board on back wall, large, empty — same position
- Date board on back wall, flat, blank — same position
- RS tricolor flag correct, moderate wear/fading
- Glas Srpske Cyrillic masthead visible
- Telephone and radio fully visible, same positions
- Command briefing folio on left desk
- Coatrack with VRS jacket and officer's cap
- Honors shelf fuller — more items on right bookshelf than Year 1
- Desk clutter increased — more papers, worn look
- No haze, no English text, no people
- Documentary realism maintained

**Lighting arc progression confirmed:** Prewar (bright, lamp OFF) → Year 1 (soft afternoon, lamp OFF) → Year 2 (late afternoon, lamp ON, drapes 1/2). Subtle but correct — institutional degradation, not dramatic collapse.

### RS Year 3 (1994) — Pass 1 (2026-03-13, Gemini, follow-up from Year 2 — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RS Year 3 plate.**

**All constraints landed:**
- Same room geometry, same furniture positions, same camera angle — no redesign
- Window DARK — black outside, evening/night. Drapes ~3/4 closed. Major shift from Year 2
- Desk lamp ON — warm glow, now primary light with fluorescent overhead
- Room significantly darker — enclosed bunker feeling landing well
- Cork board on back wall, large, empty — same position
- Date board on back wall, flat, blank — same position
- RS tricolor flag with visible staining on white band, worn edges — excellent degradation
- Glas Srpske Cyrillic masthead visible, not buried
- Telephone and radio fully visible, same positions
- Command briefing folio on left desk with red tag
- Coatrack with VRS jacket and officer's cap
- Honors shelf denser — more items on right bookshelf than Year 2
- Desk clutter much heavier — loose papers spread across desk, keys/items scattered
- Wood paneling darker, more worn
- No haze, no English text, no people
- Documentary realism maintained

**Lighting arc progression:** Prewar (bright, lamp OFF) → Year 1 (soft afternoon, lamp OFF) → Year 2 (late afternoon, lamp ON, drapes 1/2) → Year 3 (evening/dark window, lamp ON, drapes 3/4). The oppressive feeling is building correctly.

### RS Year 4 (1995) — Pass 1 (2026-03-13, Gemini — REJECTED)

**Result: Wall damage overdone.** Dramatic jagged cracks in plaster, large water stains on wood paneling. Reads as "abandoned building" not "tired command post." Correction prompt reduced damage too far — Pass 2 was identical to Year 3 except drapes.

### RS Year 4 (1995) — Pass 3 (2026-03-13, Gemini — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as RS Year 4 plate.**

**All constraints landed:**
- Drapes FULLY CLOSED — complete blackout, zero natural light
- Desk lamp ON + fluorescent overhead — exclusive light sources
- Flag noticeably MORE faded than Year 3 — colors washed out (red muted, blue greyed), fabric limper, staining on white band heavier. Strongest visual progression cue
- Hairline crack visible on wall near cork board — subtle, not dramatic
- Wood paneling duller — worn matte finish, less gloss than earlier years
- Cork board on back wall, large, empty
- Date board on back wall, flat, blank
- Glas Srpske Cyrillic masthead visible
- Telephone and radio fully visible
- Command briefing folio on left desk
- Coatrack with VRS jacket (faded) and officer's cap
- Honors shelf full — right bookshelf dense with items
- Desk clutter heaviest of all years
- No haze, no English text, no people
- Documentary realism maintained

**Lesson: wear level sweet spot.** Pass 1 overdid wall damage (peeling plaster, water stains → "abandoned"). Pass 2 correction overcorrected (identical to Year 3). Pass 3 found the balance: hairline cracks, dingy yellowed plaster, dull varnish, faded flag. The key was leading with flag fading as the primary progression signal — fabric wear is more legible than architectural damage at this resolution.

**RS COMPLETE.** All 5 plates (Prewar + Years 1-4) accepted. Lighting arc tracks correctly: bright JNA confidence → sealed bunker darkness. Inverts the RBiH arc (dim siege → bright hope). Flag degradation is the strongest year-over-year visual signal across the RS series.

### HRHB Prewar — Pass 1 (2026-03-13, Gemini — REJECTED: Croatian flag, no desk lamp)

Croatian state flag used instead of Herceg-Bosna. Desk lamp missing (needed for Year 2 switch-on seeding).

### HRHB Prewar — Pass 2 (2026-03-13, Gemini — REJECTED: plain tricolor, no coat of arms)

Flag was plain red-white-blue tricolor without Herceg-Bosna coat of arms. User wants the šahovnica shield on the flag. Also no desk lamp.

### HRHB Prewar — Pass 3 (2026-03-13, Gemini, flag reference attached — REJECTED: date board grid)

Herceg-Bosna flag correct. Desk lamp present. But date board had grid lines drawn on it — must be completely blank for runtime projection.

### HRHB Prewar — Pass 4 (2026-03-13, Gemini — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as HRHB Prewar plate.**

**All constraints landed:**
- Herceg-Bosna flag with šahovnica on tricolor, floor pole, gold finial — correct
- Cork board large (~40%+), back wall, empty, hung on wall
- Date board on back wall, flat, BLANK — no grid (fix worked)
- Desk lamp present but OFF — compact, on desk, ready for Year 2 switch-on
- Pendant lamp (Mediterranean style)
- Telephone and radio fully visible
- Hrvatski Vojnik newspaper stack, masthead visible
- Command briefing folio with red-tagged folder
- Journal/dossier center-right
- Wooden coatrack with hooks, HVO jacket, crucifix above
- Honors shelf small, neutral
- White plastered walls, limestone stone accents, terracotta tile floor
- Wooden shuttered window, open, bright daylight
- Compact provincial scale — reads as regional office
- Bright warm Mediterranean daylight — warmest prewar of all three factions
- No people, no English text, no haze
- Documentary realism excellent

**HRHB lighting arc (designed 2026-03-13):**
- Prewar: Bright warm Mediterranean daylight 1/5 darkness, lamp OFF — provincial confidence, sunshine
- Year 1: Clear daytime 2/5, lamp OFF — early war, slight dimming
- Year 2: Late afternoon 4/5, lamp ON, shutters half-closed — SHARP DROP, 1993 two-front war crisis
- Year 3: Evening 4/5, shutters 3/4 closed, lamp ON — Washington Agreement but diminished
- Year 4: Evening/night 5/5, shutters nearly closed, lamp ON — fading into irrelevance

This arc starts brightest and ends darkest of all three factions. The cliff at Year 2 (1993) reflects the Bosniak-Croat conflict that overstretched HVO. Unlike RBiH (V-shape recovery) or RS (steady decline), HRHB falls off a cliff and never recovers.

**Lesson: always full prompt on retry.** User feedback — never give short correction-only retry prompts. Always provide complete assembled prompt. Gemini handles one coherent block better than incremental fixes (confirmed same pattern as RBiH refinement prompt failure).

**Lesson: flag reference image works.** Attaching Herceg-Bosna flag as reference image resolved the flag identity issue that text description alone could not.

### HRHB Prewar — Pass 5 (2026-03-13, Gemini, pendant lamp OFF — REJECTED: pendant lamp off)

Pendant ceiling lamp appeared OFF (dark). The three-light-source system requires pendant ON in prewar. Prompt did not explicitly address pendant lamp — Gemini defaulted to off.

### HRHB Prewar — Pass 6 (2026-03-13, Gemini, explicit three-light-source section — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as HRHB Prewar plate (replaces Pass 4).**

**All constraints landed:**
- Herceg-Bosna flag with šahovnica on tricolor, floor pole, gold finial
- Cork board large, back wall, empty, hung on wall
- Date board on back wall, flat, blank, no grid
- Lighter wood desk (walnut/oak), tidy
- Desk lamp present but OFF — compact, on desk
- **Pendant ceiling lamp ON** — clearly lit, warm glow on glass shade (fix worked)
- Window daylight ON — bright warm Mediterranean sunshine through open shutters
- Telephone and radio visible with good separation
- Hrvatski Vojnik newspaper masthead visible
- Command briefing folio with red-tagged folder
- Journal/dossier center-right
- Wooden wall-mounted coatrack hooks, HVO jacket, crucifix
- Honors shelf small, neutral
- White plastered walls, limestone arches on both sides, terracotta floor
- Documentary realism excellent

**Lesson: explicit three-light-source section.** Dedicating a LIGHTING section that names all three sources (window, pendant, desk lamp) with ON/OFF state for each prevents ambiguity. Gemini respects explicit state declarations when grouped together. Applied to all subsequent HRHB year prompts.

### HRHB Year 1 (1992) — Pass 1 (2026-03-13, Gemini, follow-up from Prewar Pass 6 — REJECTED: pendant lamp off, honors shelf too full)

Follow-up prompt lost the pendant lamp (OFF when should be ON). Honors shelf had multiple medals — too dense for Year 1.

### HRHB Year 1 (1992) — Pass 1b (2026-03-13, Gemini, follow-up correction — MAJOR REGRESSION)

Complete room redesign: camera angle shifted, flag pinned to wall, dark wood desk, standing coatrack rack, newspaper on floor, 3D render aesthetic. Follow-up approach unreliable for HRHB. Decision: fresh master prompt for each year.

### HRHB Prewar — Pass 7 (2026-03-13, Gemini, fresh master prompt with explicit three-light-source section + phone/radio separation — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as HRHB Prewar plate (final version).**

All constraints from Pass 6 landed plus:
- Phone and radio well-separated on right side of desk (fix from Pass 6 bunching issue)
- Limestone arches on both sides — strong Mediterranean character
- All three light sources correctly established: window ON, pendant ON, desk lamp OFF

### HRHB Year 1 (1992) — Pass 2 (2026-03-13, Gemini, follow-up from Prewar Pass 7 — REJECTED: honors shelf too full)

Room geometry preserved. Lighting correct (window ON, pendant ON, desk lamp OFF). But honors shelf had too many items for Year 1 — medals, plaque, framed item. Should be single small item only.

### HRHB Year 1 (1992) — Pass 3 (2026-03-13, Gemini, follow-up from Pass 2 correction — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as HRHB Year 1 plate.**

**All constraints landed:**
- Room geometry preserved from Prewar Pass 7
- Window daylight ON, slightly softer — shutters still open
- Pendant lamp ON — clearly lit
- Desk lamp OFF — present but not lit
- Honors shelf reduced to one small booklet — correct for Year 1
- All 9 anchors visible with good separation
- Cork board empty, date board blank
- Herceg-Bosna flag on pole, light wear
- HVO jacket on wall hooks, crucifix
- Hrvatski Vojnik masthead visible
- Documentary realism maintained

### HRHB Year 2 (1993) — Pass 1 (2026-03-13, Gemini, follow-up from Year 1 Pass 3 — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as HRHB Year 2 plate.**

**All constraints landed:**
- Shutters HALF-CLOSED — noticeably less daylight. Clear dimming from Year 1
- **Desk lamp ON for first time** — warm glow on desk surface. Key visual shift
- Pendant lamp ON — clearly lit
- Room darker overall — two-front war pressure reads
- Desk clutter increased — more spread papers
- Honors shelf more items than Year 1
- All 9 anchors visible with good separation
- Cork board empty, date board blank
- Herceg-Bosna flag showing wear
- Room geometry preserved
- Documentary realism maintained

### HRHB Year 3 (1994) — Pass 1 (2026-03-13, Gemini, follow-up from Year 2 — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as HRHB Year 3 plate.**

**All constraints landed:**
- Shutters THREE-QUARTERS CLOSED — minimal daylight. Clear step down from Year 2
- Desk lamp ON — warm glow
- Pendant lamp ON — now one of two main light sources alongside desk lamp
- Room noticeably darker than Year 2
- Desk clutter heavier
- Honors shelf fuller
- Flag showing more wear
- All 9 anchors visible
- Cork board empty, date board blank
- Room geometry preserved
- Documentary realism maintained

### HRHB Year 4 (1995) — Pass 1 (2026-03-13, Gemini, follow-up from Year 3 — ACCEPTED)

**Result: PRODUCTION-READY. Accepted as HRHB Year 4 plate. HRHB faction COMPLETE — 5/5 plates accepted.**

**All constraints landed:**
- Shutters NEARLY FULLY CLOSED — almost no daylight, 5/5 darkness
- **Pendant lamp OFF** — ceiling lamp dark, unlit. Key visual shift — the institution is dying
- Desk lamp ON — SOLE significant light source. Room falls into deep shadow
- All 9 anchors still identifiable in low light
- Cork board empty, date board blank
- Herceg-Bosna flag faded, fabric limp
- Desk clutter at heaviest
- Honors shelf full
- HVO jacket worn
- Room geometry preserved throughout all 5 plates
- Documentary realism maintained

**Lesson: pendant-off in Year 4 is powerful.** The institutional overhead light failing while only the personal desk lamp remains — the institution is collapsing but the person at the desk is still working. Unique to HRHB arc; RS uses drape closure + fluorescent as primary darkening; RBiH uses window blackout/recovery.

**HRHB COMPLETE.** All 5 plates (Prewar + Years 1-4) accepted. Lighting arc: bright Mediterranean sunshine → cliff-drop at Year 2 (two-front war) → pendant dies in Year 4 (institutional collapse). The three-light-source system (window/pendant/desk lamp) with independent ON/OFF control gave the most nuanced progression of all three factions.

**HRHB lighting arc summary:**
- Prewar: Window ON (dominant), pendant ON, desk lamp OFF — bright sunshine, 1/5
- Year 1: Window ON (softer), pendant ON, desk lamp OFF — 2/5
- Year 2: Window ON (half shutters), pendant ON, desk lamp ON — 3/5, sharp dimming
- Year 3: Window ON (3/4 shutters), pendant ON, desk lamp ON — 4/5
- Year 4: Window minimal, pendant OFF, desk lamp ON (sole light) — 5/5

---

## 10. All factions complete — summary

**Total plates: 15** (5 per faction × 3 factions)

| Faction | Prewar | Year 1 | Year 2 | Year 3 | Year 4 | Total passes |
|---------|--------|--------|--------|--------|--------|-------------|
| RBiH | Pass 9 | Pass 1 | Pass 1 | Pass 2 | Pass 1 | 14 |
| RS | Pass 1 | Pass 1 | Pass 1 | Pass 1 | Pass 3 | 7 |
| HRHB | Pass 7 | Pass 3 | Pass 1 | Pass 1 | Pass 1 | 13 |

**Key cross-faction lessons:**
1. **Single assembled prompts beat modular composition** — Gemini handles one coherent block better than layered assembly
2. **Desk lamp must be seeded in prewar** — follow-up "switch on" fails without a visible lamp to reference
3. **Explicit light-source sections** — name each source, state ON/OFF, prevents ambiguity
4. **Follow-up prompts are unreliable for HRHB** — fresh master prompts more reliable for Gemini
5. **Flag reference images work** — text description alone cannot reliably convey heraldry
6. **Wear sweet spot** — flag fading is more legible than wall damage at game resolution
7. **Always full prompt on retry** — never give short correction-only prompts
8. **Pendant lamp OFF as narrative signal** — institutional infrastructure failing (HRHB Year 4)
9. **Three distinct architectural identities** — Habsburg grandeur (RBiH), JNA institutional dark wood (RS), Mediterranean provincial limestone (HRHB)
