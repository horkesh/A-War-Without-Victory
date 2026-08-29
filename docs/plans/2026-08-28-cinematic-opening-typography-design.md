# Cinematic Opening and Typography Design

**Status:** Owner-approved design, 2026-08-28

**Roadmap lane:** R7 presentation amendment
**Base:** `8420aad135c15330f3378b563b00428b5149a792`

## Objective

Replace the generic case-file landing aesthetic with a cinematic, faction-aware opening that flows into the existing Warroom without a visual discontinuity. Consolidate the live UI on two reliably bundled type families: IBM Plex Sans Condensed for interface language and IBM Plex Mono for data language.

This is a presentation-only change. It must not alter simulation behavior, campaign payloads, saves, IPC channels, MapLibre mechanics, calibration, RE probe work, or canon.

## Locked Experience

1. A faction-neutral cinematic splash appears before the menu.
2. The splash yields to an empty international crisis-monitoring room.
3. The landing actions and Field Records use that neutral room.
4. New War initially remains faction-neutral.
5. Clicking or keyboard-selecting a faction previews that faction's exact 1992 Warroom plate.
6. The neutral-to-faction change uses a camera-through-the-map transition.
7. Switching factions repeats the transition with last-selection-wins cancellation.
8. Dossier and mode controls change over the selected room without moving the room.
9. Begin removes the menu chrome while the selected room remains visible.
10. A successful campaign opens in the same Warroom, using the same asset URL, aspect-fit stage, crop, and alignment.
11. The existing date handoff becomes a translucent sting over the retained room; the opening brief and foundational-decision order are preserved.

Faction selection is preview-only. Campaign creation still occurs exactly once, only after Begin.

## Opening Ownership

The React `MainMenu.tsx` flow becomes the sole designed opening. The outer Electron Warroom document remains a thin host but must delegate startup presentation to the embedded React shell. Its separate legacy main menu and side picker may remain only as a fail-safe until browser and desktop-host verification proves the React path; they are not a second visual product surface.

Maintaining two redesigned openings is explicitly rejected.

## Screen Composition

### Neutral splash

- Full-bleed visual with real DOM title, version, and continue affordance.
- No baked title or generated text in the art.
- Player-controlled dismissal by pointer, Enter, Space, or Escape.
- No decorative wait before input is accepted and no dependency on campaign initialization.
- Reduced motion displays a static frame and short dissolve.

### Monitoring-room landing

- Empty early-1990s international monitoring room.
- Central physical paper, cork, or relief map is the spatial portal for faction transitions.
- **Analogue-first acceptance:** the neutral opening uses paper command material and credible period analogue communications. It contains no computers, CRT monitors, electronic terminals, television displays, video walls, laptops, or futuristic display equipment. Wired telephones, HF/VHF radio sets, a credible teleprinter/telex, manual typewriter, non-computer-like fax, cassette/reel recorder, and analogue clocks are permitted.
- Compact, left-aligned action rail; the room remains the dominant image.
- Language control remains top-right and version remains bottom-right.
- No floating cream paper, giant title, italic slogan, glass cards, fake stamps, or luxury-brand gold treatment.

### Faction preview

- All three faction selectors remain available while the dossier changes.
- Selection uses click or keyboard, never hover.
- Selected state uses label, ordinal, and identity asset; color is not the sole cue.
- A dark briefing rail guarantees text contrast without hiding the selected room.
- The room plate is rendered with the same 2752 x 1536 aspect-fit geometry used by the playable Warroom.

### Confirmed Warroom

- Menu chrome fades away; the selected room does not crossfade to a duplicate.
- Playable hotspots, projected map/date, toolbar, and status UI fade in over the retained composition.
- Start failure restores menu controls over the same preview and announces the error.

## Motion Contract

Normal-motion target: approximately 1.0-1.15 seconds.

1. Lock the selected faction indicator.
2. Decode the requested 1992 plate while the current plate stays visible.
3. Push the current scene toward the authored map anchor.
4. Expand a neutral map-texture portal until it masks the plate.
5. Swap plates only while the portal is opaque.
6. Resolve the faction room from a slight push back to its exact playable framing.
7. Reveal dossier chrome after the room settles.

Only `transform` and `opacity` animate. `will-change` is temporary. There is no video, canvas animation, WebGL transition, animation library, global store state, or simulation clock.

Rapid faction changes cancel/rebase the active presentation and retain only the latest requested selection. Reduced-motion and narrow/short viewports use a 150-160 ms dissolve with no scale or parallax. Animation never delays campaign creation or changes its success condition.

The transform origin for each existing faction room is derived from its canonical region manifest, not eyeballed:

- RBiH `desk_map`: `854,576,602,325`
- RS `desk_map`: `925,502,518,315`
- HRHB `desk_map`: `1115,534,460,267`

## Asset Loading

- Load the splash and neutral monitoring-room plate first.
- On entering faction selection, request the three 1992 room plates; decode the selected plate before its swap.
- Do not preload or decode all 15 faction/year room plates.
- Keep at most the current and incoming full-resolution plates composited.
- Existing 1992 room assets are the continuity source of truth and remain valid fallbacks:
  - `src/ui/warroom/assets/hq_rbih_1992.webp`
  - `src/ui/warroom/assets/hq_rs_1992.webp`
  - `src/ui/warroom/assets/hq_hrhb_1992.webp`
- `src/ui/warroom/assets/game start.webp` is not reused: its baked title and disaster tableau conflict with the approved neutral direction.

## Owner Asset Manifest and Prompts

All masters should be authored at 3840 x 2160 or the generator's native 16:9 size, then cropped/exported to 2752 x 1536 WebP. Do not bake UI, title text, flags, emblems, dates, document copy, or generated labels into the neutral assets.

**Analogue material rule:** Prefer paper folders, carbon-copy forms, pencils, physical cork/paper
relief maps, map lamps, and fluorescent/tungsten practical lighting. Electronic communications are
limited to credible period analogue equipment such as wired telephones, HF/VHF radios,
teleprinter/telex, non-computer-like fax, cassette/reel recorder, and analogue clocks. Reject every
computer, CRT monitor, electronic terminal, television display, video wall, laptop, digital glow,
or futuristic command-center shorthand. The retained 1992 faction rooms already satisfy this
direction and remain unchanged.

**Acceptance split:** A and B are the two required owner-art deliverables and replace the temporary
splash and CSS monitoring-room fallbacks. C and D retain useful prompts but are optional later
enhancements; they have no current registry and require a separate small tested integration if used.
The three existing faction Warroom plates are retained and are not part of this creative manifest.

### A. Main splash: `opening_splash_neutral_master`

**Protected zones:** left 8-42%, y 18-72% dark and low-detail for title; bottom-right 12% quiet for version; focus right of center.

**Prompt:**

> Cinematic documentary establishing image for a morally serious political command strategy game set in Bosnia and Herzegovina, early spring 1992 before dawn, seen from inside an anonymous international observation office through rain-streaked glass; a dark Dinaric river valley and scattered town lights beyond, first distant columns of smoke but no spectacle; foreground edge of a plain metal desk with only a wired telephone, closed paper briefing folder, pencils and folded physical regional map, practical tungsten interior light against cold blue-grey dawn, authentic late-1980s and early-1990s analogue equipment, restrained 35mm photojournalism, natural film grain, imperfect practical lighting, sober and ominous, human scale, deep readable shadows; composition keeps the left forty percent dark and uncluttered and places the landscape focus right of center; no computers or screens, no people, no faction symbols, no readable writing, no title, no logo, no UI, 16:9.

**Negative prompt:**

> computer, desktop computer, laptop, CRT monitor, electronic terminal, television display, video wall, digital screen, futuristic display equipment, glowing interface, movie poster, heroic soldiers, posed weapons, explosions, burning entire city, gore, propaganda, national flags, modern LED lighting, teal-orange blockbuster grade, glossy concept art, fantasy, symmetrical centered composition, collage, floating papers, fake stamps, legible generated text, watermark, duplicated phones, malformed maps, excessive smoke. Do not remove credible wired telephones or analogue radios if naturally present.

### B. Neutral landing: `opening_monitoring_room_neutral_master`

**Protected zones:** central portal x 36-64%, y 23-59%, rectangular and unobstructed; menu-safe x 4-30%, y 18-82%; upper-right x 78–96%, y 5–24% must be plain low-contrast matte wall reserved for the language UI, with no wall clock, lamp, antenna, frame, shelving, cable, equipment, fixture, highlight, bright circular object, or ornament; bottom-right quiet.

**Prompt:**

> Empty international crisis-monitoring observation office in Europe, early 1992 at night, period-accurate, modest and entirely analogue; central wall-mounted physical paper, cork, or shallow relief map of Yugoslavia and Bosnia in a clean rectangular wooden or metal frame, neutral map surface without readable labels, illuminated by an ordinary angled map lamp; side tables hold wired telephones, one or two credible HF/VHF radio receiver or transceiver sets with physical dials, a manual typewriter, paper logs, carbon-copy forms, pencils, folders and binders, with an optional credible teleprinter/telex, non-computer-like fax or cassette/reel recorder; analogue wall clocks may appear elsewhere in the room but never in the reserved upper-right zone; fluorescent ceiling spill mixed with tungsten desk and map lamps; signs of recent use but no people; sober institutional documentary realism, 35mm lens, subtle film grain, layered depth with a dark foreground table edge; strictly faction-neutral, no flags or emblems; central physical map unobstructed, left third dark and low-detail for menu UI; upper-right x 78–96%, y 5–24% is uninterrupted plain low-contrast matte wall reserved for the language UI, with no wall clock, lamp, antenna, frame, shelving, cable, equipment, fixture, highlight, bright circular object, or ornament; no screens, 16:9, no text, no logo, no UI.

**Negative prompt:**

> computer, desktop computer, laptop, CRT monitor, electronic terminal, television display, video wall, digital screen, futuristic display equipment, touchscreen, hologram, digital glow, science-fiction command center, blue neon, NATO or UN logos, flags, people, soldiers, weapons, dramatic explosion, luxury boardroom, glassmorphism, symmetrical showroom, cinematic teal-orange, legible generated labels, watermark, duplicated equipment, impossible cables; upper-right clock, upper-right wall clock, bright circular object in the upper-right, UI-safe-zone clutter, lamp, antenna, frame, shelving, cable, equipment, fixture, highlight, or ornament inside upper-right x 78–96%, y 5–24%. Do not reject credible wired telephones, analogue HF/VHF radios, teleprinter/telex, manual typewriter or analogue clocks elsewhere outside the reserved upper-right zone.

### C. Optional foreground: `opening_monitoring_foreground`

Create only if the alpha extraction is clean. Otherwise omit it rather than simulate depth with excessive blur.

**Prompt using B as the reference image:**

> Isolate only the nearest dark table or console edge, one out-of-focus wired telephone handset and cable, and a partial analogue radio casing or tuning-dial silhouette from the supplied monitoring room; preserve the source camera, perspective and lighting exactly; transparent background; no new objects and no text.

**Negative prompt:**

> computer, desktop computer, laptop, CRT monitor, electronic terminal, television display, video wall, digital screen, monitor bezel, futuristic display equipment, touchscreen, hologram, digital glow. Preserve credible telephone and analogue-radio shapes.

**Output:** 2752 x 1536 transparent PNG or lossless WebP.

### D. Transition texture: `opening_map_portal`

This is an atmospheric mask, not a control or historical map. It must not imply faction control.

**Prompt:**

> Close study of an early-1990s physical operations-room wall map surface, Yugoslavia and Bosnia recognizable only through coastline, rivers and restrained relief linework, grey-green paper under ordinary angled tungsten/fluorescent map-lamp illumination, subtle registration marks at the edges, documentary physical texture, no labels, no colored front lines, no flags, no symbols, no text, frame-filling.

**Negative prompt:**

> computer, desktop computer, laptop, CRT monitor, electronic terminal, television display, video wall, digital screen, futuristic display equipment, screen glow, digital glow, modern satellite map, Google Maps, glowing tactical icons, faction colors, borders presented as gameplay truth, readable labels, fantasy terrain, neon HUD. Do not reject ordinary tungsten or fluorescent light falling on physical paper.

**Output:** 2048 x 1152 WebP.

## Typography Contract

- `IBM Plex Sans Condensed`: headings, prose, navigation, controls, documents, and labels.
- `IBM Plex Mono`: dates, version strings, codes, tabular figures, compact status labels, and machine-state readouts.
- Decorative serif/typewriter roles are retired.
- Italic remains available only for semantic emphasis, not as an aesthetic system.
- Map glyph PBF typography is a separate renderer contract and is not migrated in this packet.
- Painter/debug/standalone tools are not release UI and are excluded from the active-surface sweep.

The shipped app must bundle and load the selected faces locally. Naming a missing font and relying on platform fallback does not satisfy this contract. Use only the required regular/semibold/bold weights. IBM Plex is distributed by IBM under the SIL Open Font License 1.1; provenance and the license must ship beside any newly vendored Mono webfonts.

## Accessibility and Responsive Rules

- All room/splash art is decorative; title and status are real DOM text.
- Splash dismissal supports pointer, Enter, Space, and Escape and exposes a visible-on-focus control.
- Faction choices use radiogroup/radio or equivalent pressed-button semantics.
- Background movement does not steal focus. Selection is announced after the transition settles.
- Scrims maintain at least 4.5:1 text contrast over every room.
- Focus indicators are at least 2px and not faction-color-only.
- At 1024px and below, controls become a scroll-safe sheet/rail while the aspect-fit room remains visible.
- At 720px, short viewports, 200% zoom, or reduced motion, transition becomes a dissolve.
- Hidden plates are `aria-hidden`, non-interactive, and removed from compositing after the handoff.

## Hard Scope Exclusions

- `src/sim/**`
- `src/state/**`
- scenario or calibration data
- `desktop_sim.ts`
- Electron IPC schemas or handlers
- campaign start payload or save schema
- MapLibre/Deck map mechanics other than active text-family constants
- audio additions
- package/probe configuration and the blocked RE route
- `docs/10_canon/FORAWWV.md`

## Acceptance

- Packaged and browser startup show the same React-owned opening.
- Neutral remains visible until a faction is deliberately selected.
- All three faction previews use the exact 1992 Warroom URL and stage geometry used after confirmation.
- Faction changes are cancellable and last-selection-wins.
- Begin calls campaign creation exactly once and successful new campaigns enter `warroom`.
- The required date/opening-brief/foundational-decision sequence remains intact.
- Reduced-motion and keyboard routes are complete.
- Active player-facing UI resolves to the two bundled families with no live serif/typewriter/Arial override.
- No engine, state, IPC, simulation, calibration, canon, or RE file changes occur.
