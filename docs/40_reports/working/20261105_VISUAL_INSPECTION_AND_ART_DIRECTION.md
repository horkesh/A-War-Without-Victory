# Visual inspection and art-direction proposals — 2026-11-05

**Status:** working assessment, no code changed. Read-only inspection of the shipped art library
(`src/ui/map/assets/**`, `src/ui/warroom/assets/**`) and a browser walk of the live map app on
main `f0d77121c` (Vite dev server, 1366x768 and 1920x1080, RBiH, turn 1). Screenshots are in
[20261105_visual_inspection/](20261105_visual_inspection/).

Scope is chosen to stay clear of the two active lanes: calibration (`src/sim/**`, `tools/ai_play/**`,
worktree `queue-pollution`) and Codex's player-experience packet (renderer audio bus, Settings and
modal keyboard/focus accessibility, worktree `player-experience-completion`). Everything below is
presentation: map style, panel materials, typography, art wiring, vector assets.

## 1. What the art library already is

About 130 raster assets, all one voice: photographic, desaturated, cold-blue dusk and warm tungsten,
period-correct props (rotary phones, field radios, typewriters, Oslobođenje and Glas Srpske mastheads).

| Group | Count | Verdict |
|---|---|---|
| Opening (splash, neutral monitoring room, map portal) | 3 | Excellent. The splash is the best frame in the game. |
| Faction HQ room plates, 3 factions x 1991-1995 | 15 | Excellent and under-used. The RBiH 1995 plate has cracked, water-stained walls; the rooms decay with the war. The corkboard and whiteboard are deliberately empty hotspot surfaces. |
| Command cards (category 4:3 and action 16:9), per faction | 36 | Strong. Faction-specific tables, flags, crests. Shown at thumbnail size with text over them, so most of the painting is lost. |
| Event illustrations | 31 | Strong and tasteful. Sensitive subjects are handled by absence (Srebrenica: an empty factory yard with a shoe and a chair). |
| Presidential desk headers, thumbnails, consequence stills | 19 | Good. Only the thumbnails are wired into a visible surface; the seven decision headers are not seen on the first decision. |
| Crests and flags | 11 | Good, weathered-enamel look. |
| Verdict, plans, tutorial, scenario briefings | 15 | Verdicts and plans good. Tutorial plates carry AI pseudo-text (`tutorial_02_map.webp`); same on several newspaper folds and folder labels. Acceptable at distance, visible at 1920. |
| Officer source photos | 6 | Real photographs of real people in `officers/source/`. Rights and sensitivity need an explicit disposition before any ship. |

Conclusion: the game does not have an art problem. It has an art-to-UI gap.

### Wiring facts (verified in source, 2026-11-05)

- `src/ui/map/data/eventIllustrationArt.ts` resolves any authored `image` key against the 31
  shipped illustrations by basename. Only **28 events across the six catalog files carry an
  `image` key** (`consequences.json` 9, `war_1992.json` 3, `war_1993.json` 6, `war_1994.json` 6,
  `war_1995.json` 4, `war_1992_hrhb_summer.json` 0). The module's own header still says the
  directory "is intentionally empty"; it is not.
- `DecisionModalImageHeader.tsx` (image + eyebrow + title over a gradient) is used by six decision
  modals: convoy, counter-offer, intelligence brief, officer matter, paramilitary review, reserve
  request. **`EventDecisionModal.tsx`, which renders the required turn-1 decision, does not use
  it**, so the first thing the player decides has no art although `decision_header_*` plates exist.
- `CommandCard.tsx` maps the six category cards and five action cards to desk assets; per-faction
  `command_cards/<id>_<faction>.webp` overrides take precedence. All 36 resolve. They are rendered
  only in `CommandCardStrip.tsx` at thumbnail size.
- The corkboard control map is drawn by `WarroomShellLayer.tsx` from live control through
  `warroomCorkSheet.ts` (luminance-matched sheet) and `warroomMarkerInk.ts`. It is already live
  data, not a raster; its low fidelity is a rendering choice, so lane B can improve it in place.
- A procedural paper "Staff Map" already exists at the fourth zoom level (parchment, hatching,
  serif labels, barbed-wire fronts; see `TACTICAL_MAP_SYSTEM.md`). Lane A should promote that
  language to the main map rather than invent a second one.
- Map base layers live in `src/ui/map/map/awwv_map_style.json`, `MapContainer.tsx`,
  `frontLineIcons.ts`, `formationIcons.ts`, Deck layers under `src/ui/map/layers/`. Rivers, roads
  (`data/derived/terrain/major_roads_wgs84.geojson`), hillshade and terrain PMTiles are present.

## 2. What the live app does with it

1. **Opening**: splash and main menu work and look finished. The faction step opens a large empty
   black "COMMAND BRIEFING" box with three dashes until a faction is picked, and repeats the heading
   "Choose your faction" in two panels side by side ([03](20261105_visual_inspection/03_faction_select_empty_box.jpg)).
2. **Warroom**: the room plate is beautiful; everything laid on top of it is generic. A floating row
   of dark pill tabs, a black inbox rectangle covering a third of the room, and a low-resolution
   green-blob control map pinned to the corkboard ([05](20261105_visual_inspection/05_warroom_desk.jpg)).
   The handwritten date on the whiteboard is the one diegetic element and it works.
3. **Command Surface**: the only place the command-card art appears, as five 150 px thumbnails with
   four lines of text on top of each ([11](20261105_visual_inspection/11_command_surface.jpg)).
4. **First decision, "What Is Bosnia?"**: the most important screen of turn 1 has no image, no
   crest, and presents consequences as raw ledger lines ("Republic of Bosnia and Herzegovina morale
   +3") in bordered boxes ([12](20261105_visual_inspection/12_first_decision_modal.jpg)). The
   `decision_header_*` art exists for exactly this.
5. **War Map**: a competent GIS view, not a war map. Pastel fills on a hillshade, no rivers, roads
   or terrain character at campaign zoom, plain green rectangles for counters, and the inbox panel
   still covering the right third ([06](20261105_visual_inspection/06_war_map_political.jpg),
   [07](20261105_visual_inspection/07_war_map_zoomed.jpg)). Three stacked panels plus legend plus
   bottom bar at 1366 wide.
6. **Army HQ, Chronicle, Codex**: monospace text dashboards on flat black. No crest, no art, no
   paper. Codex badges wrap ("FIXED HISTORY" on two lines) ([08](20261105_visual_inspection/08_army_hq.jpg),
   [09](20261105_visual_inspection/09_chronicle.jpg), [10](20261105_visual_inspection/10_codex.jpg)).

## 3. Proposed lanes, in recommended order

### A. The war map as a map (highest visual return)
The screen the player looks at most. Restyle the MapLibre layers only:
- paper or linen base under a muted hillshade, with period cartographic colours (olive, ochre, slate);
- rivers and main roads at campaign zoom, settlement labels in one map typeface;
- front line drawn as an inked, slightly irregular stroke rather than a polygon seam;
- counters redrawn as printed NATO counters with faction crest colour, echelon and a worn edge;
- the inbox panel does not sit over the map; the map gets the width.
Owner files: `src/ui/map/` map style and counter components. No sim, no state, no modal focus logic.

### B. Diegetic warroom chrome
Replace the floating pill tab bar and black inbox rectangle with objects that belong in the room:
the inbox as a dossier on the desk, decisions as paper packets using the existing
`decision_header_*` art, the corkboard carrying a live hand-drawn control map (SVG from state, paper
filter, pins) instead of a raster blob. Uses the five-year room plates as intended.

### C. Art wiring pass
Connect what already exists: decision headers on the first decision and event dialogs, event
illustrations as dialog headers, consequence stills on aftermath, crest on Army HQ. Effect rows as
a typed staff memo, not a ledger. Visual only; dialog focus and keyboard behaviour stay Codex's.

### D. Paper-dossier material and type pass for Army HQ, Chronicle, Codex
One serif for reading, one typewriter face for staff records, monospace only for figures; cream
paper panels with the existing `texture_paper_cream.webp`; fix chip wrapping; section headers with
crest. Codex essays get `codex_atrocity_essay_header.webp`-style header art.

### E. Opening polish
Faction step: remove the empty box state and the duplicated heading; show the faction room plate
and crest as the dossier opens.

### F. Asset QA
Replace the pseudo-text tutorial plate and newspaper folds that are legible at 1920; decide the
officer source-photo disposition; re-export the corkboard map at native resolution.

## 4. What Claude can author directly

- Vector and procedural: counters, icons, crest-based badges, map style JSON, front-line and
  pin rendering, paper and cardboard materials (CSS and SVG filters), typography system.
- Layout and components in `src/ui/map/**`.
- Precise generation briefs for any new photographic plate, matched to the existing voice, for the
  owner's external image pipeline. Claude does not have a raster image generator in this session.

## 5. Collision notes

- Codex (CX-20261105-012/013) owns renderer audio and Settings/modal keyboard, focus and
  accessibility. Lanes B and C touch modal presentation; focus and dismissal code is not changed, and
  file lists go into the shared handoff file before any edit.
- Calibration owns `src/sim/**` and `tools/ai_play/**`. None of the lanes touch them.
- `.claude/launch.json` was corrected during this inspection so `preview_start` finds the workspace
  Vite binary (it pointed at a non-existent `src/ui/map/node_modules/vite`). Uncommitted.
