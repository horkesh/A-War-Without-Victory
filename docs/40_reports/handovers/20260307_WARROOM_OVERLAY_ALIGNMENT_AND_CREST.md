# Warroom overlay alignment: flag, calendar, crest

**Date:** 2026-03-07  
**Type:** Design note / prompt fix  
**Status:** Decisions and prompt updates  
**Context:** Generated warroom image showed (1) flag/calendar at an angle, (2) wrong BiH crest on documents. Engine draws both overlays as flat rectangles.

---

## Problems

1. **Flag at an angle vs head-on asset**  
   The scene had wall space for the flag at a receding angle. The game draws the faction flag from a **head-on (2D) image** into a **rectangular region** with `drawImage(flag, x, y, w, h)` — no perspective. So if the background shows an angled wall, the flat flag looks pasted on and breaks the illusion.

2. **Calendar at an angle**  
   Same as flag: `WallCalendar` is rendered to a canvas and drawn with `drawImage(calCanvas, x, y, w, h)`. If the “calendar zone” in the scene is in perspective (e.g. receding wall), the 2D calendar won’t align.

3. **Wrong crest on documents**  
   The image showed the **post-1998 BiH** coat of arms (yellow triangle on blue) on binders/folders. The game period is **1992–1998**; documents should use **RBiH** symbolism: white shield, golden fleur-de-lis, blue vertical stripes. Using the later BiH crest is anachronistic and confuses faction identity.

---

## Options considered

### Flag and calendar: how to align 2D overlay with scene

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Constrain the scene (prompt)** | Require that the “wall space for flag” and “wall space for calendar” are **frontal**: a flat rectangular area facing the camera (perpendicular to viewer), like a notice board or picture frame. No receding perspective in those two zones. | No engine change. Single source of truth: art matches engine. | Room composition must reserve two frontal panels; might constrain dramatic angles. |
| **B. Engine perspective transform** | Store hotspot as a quadrilateral (4 points), use canvas 2D transform or WebGL to map the 2D flag/calendar onto that quad so it “sticks” to the angled wall. | Allows angled walls in the scene. | More complex (quad regions, perspective math, possible distortion). Hotspot format and ClickableRegionManager would need to support quads. |
| **C. Bake flag/calendar into scene** | Don’t use runtime overlay; bake flag and calendar into each of the 6 scene plates. | Perfect alignment. | Loses dynamic faction flag and dynamic calendar (turn/date); not acceptable. |

**Decision:** **A**. Update the **nano banana prompts** (and brief) so that the **flag zone** and **calendar zone** are explicitly **flat and frontal** (facing the camera, rectangular from the viewer’s POV, no perspective tilt). The existing rectangular `drawImage` then matches the scene. If we ever want angled walls, we can add Option B later (quad-based overlay).

### Crest: correct symbolism

| Option | Description |
|--------|-------------|
| **Prompt + brief fix** | Add to all six prompts and to the nano banana brief: **RBiH-era symbolism only (1992–1998)**. Specify: white shield with golden fleur-de-lis and blue vertical stripes; **do not** use the post-1998 BiH coat of arms (yellow triangle on blue). All documents, binders, stamps in the room must use RBiH crest or period-appropriate faction symbols (RS, HRHB as appropriate). |

**Decision:** Add the RBiH-vs-BiH crest rule to the prompts and to the master brief so future generations and human artists follow it.

### RS-specific: map and crest

- **Desk map (RS warroom only):** The desk map must show **RS territory, Serb-held areas, or the RS operational/administrative area only**. **Do not** show a map of the whole of Bosnia and Herzegovina as a single state; that is wrong for the RS faction perspective.
- **Crest (RS warroom only):** Use **wartime RS symbolism only (1992–1995)** on all documents, binders, stamps — e.g. Serbian tricolor, wartime RS insignia. **Do not** use the post-Dayton or post-1995 Republika Srpska coat of arms (post-war RS state symbols).

**Decision:** Add these RS-specific constraints to the RS prompts (Blocks 3 & 4), long-form Prompts 3 & 4, technical spec, nano banana brief §4.5 and §11.2.

---

## Prompt and doc changes

1. **Six nano banana prompts**  
   In every prompt (and in every copy-paste block):
   - **Flag zone:** Replace “clean wall space for flag” with: “a **flat, frontal** rectangular area for the faction flag (e.g. a notice board or picture frame **facing the camera**, perpendicular to viewer, **no perspective tilt**), so a 2D overlay will align.”
   - **Calendar zone:** Same: “a **flat, frontal** rectangular area for the wall calendar (e.g. a calendar board **facing the camera**, **no perspective tilt**), so a 2D overlay will align.”
   - **Crest:** Add: “Use **RBiH-era symbolism only (1992–1998)**: white shield with golden fleur-de-lis and blue vertical stripes. **Do not** use the post-1998 BiH coat of arms (yellow triangle on blue field). All documents, binders, and stamps must show RBiH crest or period-appropriate faction symbols (RS, HRHB as appropriate).”

2. **Nano banana brief**  
   In §4.4 (runtime exceptions) or §6 (layout): state that the flag and calendar zones must be **frontal** (flat to camera). Add a short “Symbolism” subsection: RBiH-era only; no post-1998 BiH crest on in-scene documents.

3. **WARROOM_MASTER**  
   Under gates or “When working warroom”: note that overlay zones for flag and calendar must be **frontal** in generated art so the engine’s rectangular draw matches; and that in-scene documents must use RBiH-era (not post-1998 BiH) symbolism.

---

## Summary

- **Flag and calendar:** Engine draws both as flat rectangles. Scene must show their zones as **flat and frontal** (facing the camera) so the 2D overlay aligns. Prompts updated to require this.
- **Crest:** Prompts and brief updated to require **RBiH-era symbolism only**; no post-1998 BiH crest on documents.
