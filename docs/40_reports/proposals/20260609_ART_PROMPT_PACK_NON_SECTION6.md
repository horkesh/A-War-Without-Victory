# Art Prompt Pack — NON-§6 Queue (Documentary Realism) — STANDALONE / COPY-PASTE

**Date:** 2026-06-09
**Status:** Generation-ready prompt pack — READ-ONLY authoring deliverable. No images generated here; generation (Canva/external) happens after owner review.
**How to use:** Each asset below is a fully self-contained block. Copy ONE block and paste it straight into your image generator — the style, the scene, the UI-reservation, the dimensions, and the negative prompt are all inlined. No prefix assembly required (same workflow as the shipped presidential-desk cards). Each block is: a one-line **Filename** + **Drop path** + **Dimensions**, then a self-contained **Prompt:** paragraph, then a self-contained **Negative prompt:** line. The format mirrors the card prompts in `docs/plans/2026-05-24-gui-ai-asset-brief.md`.
**Canon:** DOCUMENTARY REALISM. The oil-paint / sepia direction is RETIRED. Every prompt is a war-correspondent photograph aesthetic — desaturated, film grain, period-accurate 1990s Balkans, institutional/archival light. Explicitly NO oil-paint, NO sepia filter, NO dramatic-painting style, NO heroic composition, NO video-game concept art. (Category 1 peace-plan maps are the one exception: a neutral period-accurate cartographic style, redrawn faithfully from an ATTACHED reference photo.)

---

## Resolver / filename conventions (verified against the live pipeline)

These keys match the resolvers that the event-image pipeline + command-card art layer consume:

| Family | Filename pattern | Dimensions | Drop path | Consumed by |
|---|---|---|---|---|
| Peace-plan maps | `plan_{plan_id}.webp` | 600×400 | `src/ui/map/assets/plans/` | Peace-plan modal map slot (strategy doc §3) |
| Event stills | `event_{event_id}.webp` | 800×450 (16:9) | `src/ui/map/assets/events/` | `EventModal` / `EventDecisionModal` via `EventDisplayData.image` |
| Verdict backgrounds | `verdict_{tone}.webp` | 1920×1080 | `src/ui/map/assets/verdicts/` | `CinematicVerdict` / `VerdictScreen` tone background |
| Dayton endgame | `event_dayton_signed_1995.webp` (still) + `verdict_dayton_close.webp` (bg) | 800×450 / 1920×1080 | `src/ui/map/assets/events/` + `…/verdicts/` | Dayton close screen + endgame |
| Tutorial / teaching deck | `tutorial_{topic}.webp` | 600×400 | `src/ui/map/assets/tutorial/` | A4 onboarding negative-sum thesis deck |

> **NOTE — command-card leadership gestures are already shipped.** The `address_nation` and `decorate_unit` levers have real per-faction art (`command_cards/act_address_nation_{RBiH,RS,HRHB}.webp`, `command_cards/act_decorate_unit_{RBiH,RS,HRHB}.webp`, shipped in PR #317). The faction-aware resolver hits those first, so the old faction-agnostic fallback stills are NOT needed and have been removed from this pack.

> **NOTE ON SENSITIVE TEXTURE:** for refugee-column / displacement / aftermath stills, show DISTANCE and ABSENCE — empty road, abandoned belongings, a far line of figures with no readable faces — never graphic violence, never identifiable victims, never camp/atrocity content (that is §6, deferred at the end of this doc).

---

# CATEGORY 1 — Peace-Plan Maps (5)

Cartographic / diagrammatic territorial-division maps — the ONE exception to the photograph aesthetic. **For every map in this category you will ATTACH a reference photo** of the actual historical proposed map for that plan. Each prompt below tells the generator to use the attached photo as the exact reference for the territorial boundaries and faithfully redraw it in a neutral period-accurate 1990s cartographic style. The brief historical note under each tells you which map to attach.

### 1.1 Vance-Owen Plan — `plan_vance_owen.webp`
- **Drop path:** `src/ui/map/assets/plans/plan_vance_owen.webp`
- **Dimensions:** 600×400
- **Attach:** a photo/scan of the historical **Vance-Owen Peace Plan (January 1993)** map — Bosnia divided into TEN numbered provinces (a cantonal mosaic), with Sarajevo as a separate special district.
- **Prompt:** Generate a `600 x 400` px image. Export final as `plan_vance_owen.webp` and later drop it in `src/ui/map/assets/plans/`. Using the ATTACHED historical map of the Vance-Owen plan as the exact reference for the territorial boundaries, faithfully recreate and redraw it as a neutral, period-accurate 1990s diplomatic territorial-division map of Bosnia and Herzegovina. Printed-paper cartographic look as if reproduced from a peace-conference annex: flat matte print, restrained muted ink colours, fine cartographic linework, faint paper grain. Keep the recognisable BiH outline (the distinctive triangular country with the Sava in the north and the narrow Neretva corridor toward the Adriatic). Render the ten provinces from the reference as distinct muted ink tints ringed by clean printed boundaries — a fragmented checkerboard of cantons, not three blocks — with Sarajevo as a separate special district. NOT a glossy digital infographic, NOT a painting, NOT oil/sepia, NOT 3D. No readable place labels, no legend text, no province numbers, no flags.
- **Negative prompt:** United States map, U.S. state map, any national map other than Bosnia, glossy 3D globe, satellite photo, video-game minimap, colourful tourist map, neon colours, readable place names, readable province numbers, legend, title block, three large solid blocks, two-way split, oil painting, sepia, watermark, signature, text.

### 1.2 Owen-Stoltenberg Plan — `plan_owen_stoltenberg.webp`
- **Drop path:** `src/ui/map/assets/plans/plan_owen_stoltenberg.webp`
- **Dimensions:** 600×400
- **Attach:** a photo/scan of the historical **Owen-Stoltenberg / Invincible plan (August 1993)** map — Bosnia as a confederal union of THREE ethnically-based republics, with a constricted Sarajevo district.
- **Prompt:** Generate a `600 x 400` px image. Export final as `plan_owen_stoltenberg.webp` and later drop it in `src/ui/map/assets/plans/`. Using the ATTACHED historical map of the Owen-Stoltenberg plan as the exact reference for the territorial boundaries, faithfully recreate and redraw it as a neutral, period-accurate 1990s diplomatic territorial-division map of Bosnia and Herzegovina. Printed-paper cartographic look as if reproduced from a peace-conference annex: flat matte print, restrained muted ink colours, fine cartographic linework, faint paper grain. Keep the recognisable BiH outline. Render the three contiguous republics from the reference as three distinct muted tints (a Serb-majority union, a Bosniak-majority union, a Croat-majority union) reading as three large solid regions with a constricted Sarajevo district between them — visibly fewer, larger blocks than the ten-province version. NOT a glossy digital infographic, NOT a painting, NOT oil/sepia, NOT 3D. No readable place labels, no legend text, no flags.
- **Negative prompt:** United States map, U.S. state map, any national map other than Bosnia, glossy 3D globe, satellite photo, video-game minimap, colourful tourist map, neon colours, readable place names, legend, title block, ten provinces, checkerboard cantons, single 51/49 dividing line, oil painting, sepia, watermark, signature, text.

### 1.3 Washington Agreement — `plan_washington.webp`
- **Drop path:** `src/ui/map/assets/plans/plan_washington.webp`
- **Dimensions:** 600×400
- **Attach:** a photo/scan of a historical **Washington Agreement (March 1994)** map — the Bosniak-Croat Federation as one unified entity across government-held territory, with the remaining Serb-held territory separate.
- **Prompt:** Generate a `600 x 400` px image. Export final as `plan_washington.webp` and later drop it in `src/ui/map/assets/plans/`. Using the ATTACHED historical map of the Washington Agreement as the exact reference for the territorial boundaries, faithfully recreate and redraw it as a neutral, period-accurate 1990s diplomatic territorial-division map of Bosnia and Herzegovina. Printed-paper cartographic look as if reproduced from a peace-conference annex: flat matte print, restrained muted ink colours, fine cartographic linework, faint paper grain. Keep the recognisable BiH outline. Following the reference, show the Bosniak-Croat FEDERATION as a single unified tint across central, western and northern government-held territory (the former two-way internal line dissolved into one federation colour, with at most a faint dotted ghost line where it used to run), and the remaining Serb-held territory in a separate contrasting muted tint — the story is two former adversaries unified into one entity facing a third. NOT a glossy digital infographic, NOT a painting, NOT oil/sepia, NOT 3D. No readable place labels, no legend text, no flags.
- **Negative prompt:** United States map, U.S. state map, any national map other than Bosnia, glossy 3D globe, satellite photo, video-game minimap, colourful tourist map, neon colours, readable place names, legend, title block, three equal blocks, ten provinces, single clean 51/49 line, oil painting, sepia, watermark, signature, text.

### 1.4 Contact Group Plan — `plan_contact_group.webp`
- **Drop path:** `src/ui/map/assets/plans/plan_contact_group.webp`
- **Dimensions:** 600×400
- **Attach:** a photo/scan of a historical **Contact Group plan (July 1994)** map — Bosnia split 51/49 between the Federation and the Bosnian-Serb entity by a single decisive boundary.
- **Prompt:** Generate a `600 x 400` px image. Export final as `plan_contact_group.webp` and later drop it in `src/ui/map/assets/plans/`. Using the ATTACHED historical map of the Contact Group plan as the exact reference for the territorial boundaries, faithfully recreate and redraw it as a neutral, period-accurate 1990s diplomatic territorial-division map of Bosnia and Herzegovina. Printed-paper cartographic look as if reproduced from a peace-conference annex: flat matte print, restrained muted ink colours, fine cartographic linework, faint paper grain. Keep the recognisable BiH outline. Following the reference, divide the country by a single clear printed dividing line into TWO shares — a larger Federation share (~51 percent) in one muted tint and a smaller Serb-entity share (~49 percent) in a contrasting tint — the composition's defining feature being one decisive boundary partitioning the country into two near-equal halves, clean and almost administrative. NOT a glossy digital infographic, NOT a painting, NOT oil/sepia, NOT 3D. No readable place labels, no legend text, no percentage numbers, no flags.
- **Negative prompt:** United States map, U.S. state map, any national map other than Bosnia, glossy 3D globe, satellite photo, video-game minimap, colourful tourist map, neon colours, readable place names, legend, title block, ten provinces, three blocks, checkerboard, readable percentage numbers, oil painting, sepia, watermark, signature, text.

### 1.5 Dayton Map — `plan_dayton.webp`
- **Drop path:** `src/ui/map/assets/plans/plan_dayton.webp`
- **Dimensions:** 600×400 (a 1920×1080 endgame variant of this division mood is covered in Category 2)
- **Attach:** a photo/scan of the historical **Dayton Agreement (December 1995)** map — the final Federation (~51%) / Republika Srpska (~49%) division along the convoluted Inter-Entity Boundary Line, with the Brčko corridor pinching the north and the Goražde corridor reaching east.
- **Prompt:** Generate a `600 x 400` px image. Export final as `plan_dayton.webp` and later drop it in `src/ui/map/assets/plans/`. Using the ATTACHED historical Dayton map as the exact reference for the territorial boundaries, faithfully recreate and redraw it as a neutral, period-accurate 1990s diplomatic territorial-division map of Bosnia and Herzegovina. Printed-paper cartographic look as if reproduced from a peace-conference annex: flat matte print, restrained muted ink colours, fine cartographic linework, faint paper grain. Keep the recognisable BiH outline. Following the reference, show the final Dayton division: the Federation (~51 percent) and Republika Srpska (~49 percent) as two muted tints separated by the long, irregular, deeply convoluted Inter-Entity Boundary Line that snakes across the country, with the narrow Brčko corridor pinching the north and the Goražde corridor reaching east — the boundary negotiated and tortured rather than clean, full of small jogs and salients. Sober, definitive, final. NOT a glossy digital infographic, NOT a painting, NOT oil/sepia, NOT 3D. No readable place labels, no legend text, no flags.
- **Negative prompt:** United States map, U.S. state map, any national map other than Bosnia, glossy 3D globe, satellite photo, video-game minimap, colourful tourist map, neon colours, readable place names, legend, title block, clean straight dividing line, ten provinces, three equal blocks, oil painting, sepia, watermark, signature, text.

---

# CATEGORY 2 — Dayton Endgame / Verdict-Screen Backgrounds (4)

The war-close climax and the generic Pyrrhic-verdict backgrounds. Diplomatic and somber — NOT atrocity, NOT combat. Verdict backgrounds sit behind a glassmorphism overlay, so each reserves a calm negative-space band for app-rendered verdict copy.

### 2.1 Dayton / Paris Signing — endgame still — `event_dayton_signed_1995.webp`
- **Drop path:** `src/ui/map/assets/events/event_dayton_signed_1995.webp`
- **Dimensions:** 800×450 (16:9)
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_dayton_signed_1995.webp` and later drop it in `src/ui/map/assets/events/`. Scene: the interior of a 1995 American air-base conference room set up for a peace signing — a long polished table with three sets of folded document folders and pens laid at three delegation positions, name-card holders left blank and unreadable, water glasses, microphones on stands, large unmarked territorial maps of Bosnia mounted on the back wall, rows of empty chairs, cold institutional overhead light through high windows. The room is composed and bureaucratic: the war ends at a table, not on a battlefield. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, slightly faded as if scanned from a press archive, muted grey-olive-brown palette, restrained contrast, natural available light. No people, no readable name cards, no legible flags, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** battlefield, soldiers, celebration, handshake close-up of named leaders, readable name placards, legible flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, modern computer, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 2.2 Dayton-close verdict background — `verdict_dayton_close.webp`
- **Drop path:** `src/ui/map/assets/verdicts/verdict_dayton_close.webp`
- **Dimensions:** 1920×1080
- **Prompt:** Generate a `1920 x 1080` px image. Export final as `verdict_dayton_close.webp` and later drop it in `src/ui/map/assets/verdicts/`. Scene: a wide, quiet establishing view at dusk of a Bosnian town three-and-a-half years into war — damaged but still-standing apartment blocks and a church or minaret in silhouette, a few lit windows, mist or cold haze over the valley, no fighting, the stillness of a war that has simply stopped. The lower third is a calm darker band of shadowed townscape and sky reserved for app-rendered verdict text. Elegiac, not triumphant. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive-blue palette, restrained contrast, natural light. No people in the foreground, no flags, no fire, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** explosions, active combat, triumphant symbolism, sunrise hope cliché, readable signage, crowds, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 2.3 Pyrrhic verdict background — somber / pyrrhic tone — `verdict_pyrrhic.webp`
- **Drop path:** `src/ui/map/assets/verdicts/verdict_pyrrhic.webp`
- **Dimensions:** 1920×1080
- **Prompt:** Generate a `1920 x 1080` px image. Export final as `verdict_pyrrhic.webp` and later drop it in `src/ui/map/assets/verdicts/`. Scene: an emptied government-office briefing room after the war's end — a long table strewn with closed map folders and an overflowing ashtray, chairs pushed back as if everyone has just left, a wall map of Bosnia with faded grease-pencil front lines, cold grey daylight through tall windows, dust in the air. The mood is depletion and the morning-after of a war won at ruinous cost: survival, not victory. Leave a calm negative-space area (upper-left or lower band) for app-rendered verdict copy. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive-brown palette, restrained contrast, natural light. No people, no flags, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** victory celebration, bright colour, medals, trophies, readable map labels, people, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 2.4 Catastrophic verdict background — collapse tone — `verdict_catastrophic.webp`
- **Drop path:** `src/ui/map/assets/verdicts/verdict_catastrophic.webp`
- **Dimensions:** 1920×1080
- **Prompt:** Generate a `1920 x 1080` px image. Export final as `verdict_catastrophic.webp` and later drop it in `src/ui/map/assets/verdicts/`. Scene: a wide, bleak winter landscape at the edge of a destroyed Bosnian town — a burnt-out roofless building, a snow-dusted empty road leading out of frame, an abandoned overcoat or chair left in the snow, a leaden overcast sky, no horizon hope. Absolute desaturation, near-monochrome grey and white with a faint cold blue. The image is the cost made visible: emptiness, ruin, abandonment, the country hollowed out. A quiet darker sky band at top is reserved for app-rendered verdict text. Style: documentary war-correspondent photograph, 1990s, fine film grain, near-monochrome muted palette, restrained contrast, natural light. No bodies, no people in frame, no flags, no graphic content, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, gore, identifiable victims, fire spectacle, dramatic action, bright colour, people in frame, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face.

---

# CATEGORY 3 — A4 Onboarding Teaching-Deck Imagery (8)

The negative-sum-thesis onboarding deck. One teaching image per onboarding step (`src/ui/map/components/onboarding/onboardingSteps.ts` — ids `01_welcome`…`08_judge`). Each image teaches the step's lesson WITHOUT graphic content; the through-line is "this war can only be survived, ended, or made worse." Restrained and diagrammatic where the step is about a UI concept, atmospheric where it is about the war's nature.

### 3.1 `tutorial_01_welcome.webp` — "A War You Cannot Win"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_01_welcome.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_01_welcome.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: a worn wall map of Bosnia and Herzegovina under a single desk lamp in a darkened command office, the front lines drawn in faded grease pencil, no scoreboard and no victory marker anywhere — just a contested, exhausted country. The image must read as "there is no victory screen here." Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive-brown palette, restrained contrast, natural lamp light. No people, no flags, no readable labels. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** trophy, podium, victory banner, scoreboard, bright hopeful light, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, watermark, logo, signature, identifiable face, graphic gore.

### 3.2 `tutorial_02_map.webp` — "The Map Is Not the Score"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_02_map.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_02_map.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: two near-identical map overlays of the same Bosnian front laid side by side on a light table, the front line essentially unchanged between them, while the margins are covered in tally marks and crossing-out — the visual argument that the line barely moved while the cost mounted. Documentary, diagrammatic. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted palette, restrained contrast, natural light. No readable numbers, no people, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** dramatic arrows of conquest, bright victory colour, readable statistics, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, watermark, logo, signature, identifiable face.

### 3.3 `tutorial_03_brief.webp` — "The Brief"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_03_brief.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_03_brief.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: a presidential desk packet at the start of a working day — a stack of unopened institutional report folders, a map fragment, a field telephone, muted morning light. The lesson is "read the desk packet before you act." Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive-brown palette, restrained contrast, natural light. No readable text, no people, no flags, no modern electronics. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** modern laptop, screens, smartphone, bright office, people, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, watermark, logo, signature, identifiable face.

### 3.4 `tutorial_04_inspect.webp` — "Inspect Before You Decide"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_04_inspect.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_04_inspect.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: a staff-officer's desk with a magnifying glass laid over an operational map, supply ledgers and readiness sheets fanned out beneath, a green desk lamp — the posture of scrutiny before commitment. Sober, deliberate. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted green-brown office palette, restrained contrast, natural lamp light. No readable figures, no people, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** action scene, soldiers, bright colour, readable numbers, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, watermark, logo, signature, identifiable face.

### 3.5 `tutorial_05_decide.webp` — "President's Desk"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_05_decide.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_05_decide.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: a desk before a decision — two unmarked proposal folders, a fountain pen resting between them, a single lamp, the weight of an unmade choice. Restrained, quiet, consequential. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural lamp light. No readable text, no people, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** dramatic spotlight, courtroom theatre, bright colour, people, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, watermark, logo, signature, identifiable face.

### 3.6 `tutorial_06_execute.webp` — "Operations"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_06_execute.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_06_execute.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: a field radio handset resting on an operational map with grease-pencil unit markings — the order goes out THROUGH commanders, not from the president's own hand. It implies command-at-a-distance, not a general pushing units. Subdued green-brown staff-office light. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted palette, restrained contrast, natural light. No soldiers, no combat, no insignia, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** battlefield, soldiers in action, explosions, readable unit names, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, watermark, logo, signature, identifiable face.

### 3.7 `tutorial_07_report.webp` — "Advance and Read the Aftermath"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_07_report.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_07_report.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: the aftermath as a record on the desk — a turn-summary report sheet, a map with a front line nudged only slightly, and beside it a far, distant line of people leaving a road at the horizon (no faces, no detail) — the human cost recorded soberly, not sensationalised. Cold grey daylight. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted palette, restrained contrast, natural light. No graphic content, no identifiable people, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** graphic violence, identifiable faces, gore, dramatic spectacle, readable text, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, watermark, logo, signature.

### 3.8 `tutorial_08_judge.webp` — "The Cost Ledger Is the Scoreboard"
- **Drop path:** `src/ui/map/assets/tutorial/tutorial_08_judge.webp`
- **Dimensions:** 600×400
- **Prompt:** Generate a `600 x 400` px image. Export final as `tutorial_08_judge.webp` and later drop it in `src/ui/map/assets/tutorial/`. Scene: a sober accounting laid on a desk — a long ledger sheet with columns and tally marks (unreadable), an ashtray, a cold coffee cup, a Dayton-style territorial map turned partly face-down beneath it — the war tallied as cost, not conquest, and judged at the negotiating table. Elegiac, administrative, final. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural light. No readable numbers, no people, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic.
- **Negative prompt:** trophy, scoreboard, bright colour, victory imagery, readable figures, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, watermark, logo, signature, identifiable face.

---

# CATEGORY 4 — NON-§6 Event Stills (12)

The war's texture WITHOUT graphic atrocity: diplomacy, mobilisation, supply, the political/referendum process, ceasefire, and distant-displacement-that-is-not-atrocity-graphic. 800×450 WebP, 16:9, consumed by `EventModal` via `EventDisplayData.image`. The "maps to event families" note ties each still to the branch-tag families in `src/sim/events/event_families.ts` and the diplomacy composite tags.

### 4.1 Diplomatic negotiation — generic — `event_diplomatic_negotiation.webp`
- **Drop path:** `src/ui/map/assets/events/event_diplomatic_negotiation.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** `diplomacy_vance_owen`, `diplomacy_owen_stoltenberg`, `diplomacy_london_subscribed/rejected`, `diplomacy_un_safe_areas`; reusable for any negotiation event lacking a bespoke still.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_diplomatic_negotiation.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a 1990s international negotiation room — a long table with proposal folders, water carafes, microphones, a territorial map of Bosnia propped on an easel at the back, suited figures seen only as out-of-focus silhouettes from behind (no faces), cold institutional light. The mood is grinding diplomacy under pressure. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive palette, restrained contrast, natural light. No readable text, no legible flags, no identifiable faces. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** handshake of named leaders, legible flags, readable documents, celebration, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.2 Washington Agreement signing — `event_washington_agreement.webp`
- **Drop path:** `src/ui/map/assets/events/event_washington_agreement.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** `diplomacy_washington`, `rbih_washington_accept/reluctant`, `hrhb_washington_accept/reluctant`, `hrhb_washington_agreement_1994`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_washington_agreement.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a 1994 Washington signing-room interior — two delegations' folders set across a table with a third mediating position, blank name cards, a map of central Bosnia on the wall showing two former adversaries' territory merging into one federation, sober institutional daylight. The story is two enemies forced into alliance. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive palette, restrained contrast, natural light. No people, no readable name cards, no legible flags, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** readable American flag close-up, named leaders shaking hands, celebration, readable text, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.3 Mobilisation / recruitment — `event_mobilization.webp`
- **Drop path:** `src/ui/map/assets/events/event_mobilization.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** formation/recruitment events; reusable for any mobilisation or call-up event (faction-agnostic).
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_mobilization.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a 1990s town mobilisation at distance — a queue of ordinary men in civilian coats outside a municipal building under a grey sky, a posted but unreadable call-up notice on the wall, a parked civilian bus, no weapons displayed, no uniforms of note — citizens becoming soldiers, reluctantly. Cold documentary light. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural light. No readable text, no faces in close-up, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** heroic recruitment poster, marching parade, weapons brandished, readable notices, bright colour, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.4 Supply convoy on the road — `event_supply_convoy.webp`
- **Drop path:** `src/ui/map/assets/events/event_supply_convoy.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** supply / logistics events; reusable for convoy and resupply events.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_convoy.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a small convoy of canvas-backed trucks on a narrow mountain road through Bosnian forest, mud and snow at the verges, a leaden sky, the road clinging to a hillside — the tenuous lifeline of a besieged country, seen from a distance. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive-brown palette, restrained contrast, natural light. No legible markings, no soldiers in close-up, no legible UN logos, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** gleaming new trucks, readable logos, military parade, bright colour, soldiers posing, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.5 Supply shortage / scarcity — `event_supply_shortage.webp`
- **Drop path:** `src/ui/map/assets/events/event_supply_shortage.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** supply-strain / shortage events; reusable for ammunition- or fuel-scarcity events.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_shortage.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a near-empty supply depot — a few crates and jerricans on a concrete floor, empty pallet racks stretching into shadow, a single hanging bulb, a clipboard hung on a nail — the visual of running out. Cold, dim, depleted. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, dim available light. No people, no readable labels, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** full warehouse, abundance, bright light, readable labels, people, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.6 Political process / referendum — `event_referendum.webp`
- **Drop path:** `src/ui/map/assets/events/event_referendum.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** foundational political-decision events; `rs_assembly_*`, `rbih_*_assembly`, `hrhb_croat_republic`, `rbih_civic/bosniak` identity tags; reusable for any assembly/referendum political event.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_referendum.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a 1990s polling station or assembly hall — rows of empty wooden chairs facing a plain table with a ballot box, a hand-lettered but unreadable notice, weak daylight through tall windows — the quiet civic ritual that precedes a war. Sober, documentary. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural light. No people, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** crowds cheering, rally, banners with readable slogans, bright colour, legible flags, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.7 Assembly / political session — `event_political_session.webp`
- **Drop path:** `src/ui/map/assets/events/event_political_session.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** `rs_assembly_accept_rejection`, `rs_assembly_override`, `rs_vopp_override_assembly`, `rbih_owen_stoltenberg_reject_via_assembly`; reusable for any parliamentary/assembly-decision event.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_political_session.webp` and later drop it in `src/ui/map/assets/events/`. Scene: the interior of a 1990s republican assembly chamber — tiers of empty seats, a speaker's rostrum, a microphone, an unreadable order-of-business sheet on a desk, dim institutional light — the chamber where a fateful vote is about to be cast. Sober, weighty. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, dim institutional light. No people, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** cheering chamber, readable signage, bright colour, identifiable figures, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.8 Ceasefire / truce — `event_ceasefire.webp`
- **Drop path:** `src/ui/map/assets/events/event_ceasefire.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** `hrhb_central_bosnia_ceasefire`, `hrhb_zagreb_ceasefire_acknowledge/resist`, `rbih_abdic_accept_ceasefire`; reusable for any truce/ceasefire event.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_ceasefire.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a quiet, snowy frontline street during a ceasefire — sandbagged positions empty of action, a white cloth or rag tied to a pole, a deserted no-man's-land of damaged houses, low grey light, the eerie calm of guns gone silent. Documentary, melancholy. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-blue palette, restrained contrast, natural light. No people, no bodies, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** active combat, explosions, soldiers fighting, celebration, bright colour, readable signage, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### 4.9 Refugee column at distance (NON-atrocity) — `event_displacement_column.webp`
- **Drop path:** `src/ui/map/assets/events/event_displacement_column.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** displacement-tracking events; reusable for any civilian-displacement event that is NOT a camp/massacre (those are §6). See the SENSITIVE-TEXTURE note at the top of this doc.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_displacement_column.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a long column of civilians seen from far away walking a road out of a Bosnian valley, carrying bundles and pushing a handcart, a tractor-trailer at the head, mist over distant hills — figures small and anonymous, no faces, no detail, the scale of displacement read through the length of the line. Cold, grey, restrained, sorrowful. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, natural light. ABSOLUTELY no graphic content, no identifiable victims, no violence, no camp imagery, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** close-up faces, graphic injury, gore, camp, barbed wire, soldiers herding people, dramatic spectacle, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face.

### 4.10 UN / international observation — `event_un_presence.webp`
- **Drop path:** `src/ui/map/assets/events/event_un_presence.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** `diplomacy_un_safe_areas`, `bihac_5th_corps_1994_response` and other UNPROFOR-context events; reusable for any UN-presence / safe-area event.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_un_presence.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a white armoured vehicle and an observation post on a damaged Bosnian road, sandbags and a watchtower, a flag pole with an unreadable pale flag hanging limp, cold overcast light — the limited, watching international presence. Documentary, sober, slightly futile in mood. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, natural light. No legible UN markings, no faces, no readable text. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** readable UN logo, heroic peacekeepers, bright colour, action scene, identifiable faces, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, graphic gore.

### 4.11 Besieged-city texture (NON-graphic) — `event_siege_city.webp`
- **Drop path:** `src/ui/map/assets/events/event_siege_city.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** siege / shelling context events (the city-under-siege texture, NOT the Markale shelling itself, which is §6); reusable for siege-condition events.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_siege_city.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a wide view of a besieged Bosnian city — shell-pocked apartment blocks, plastic sheeting over blown-out windows, a thin column of smoke on the skyline at distance, empty streets, grey winter light — endurance under siege, the daily texture of the war. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, natural light. No bodies, no people in close-up, no graphic content, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, gore, identifiable casualties, dramatic explosion in foreground, bright colour, readable signage, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face.

### 4.12 Patron / foreign-backing meeting — `event_patron_relations.webp`
- **Drop path:** `src/ui/map/assets/events/event_patron_relations.webp`
- **Dimensions:** 800×450 (16:9)
- **Maps to event families:** `rs_belgrade_*`, `hrhb_zagreb_*`, `hrhb_hv_support_*`, `rbih_nato_comply/defy`, `rs_holbrooke_*`; reusable for any patron-relationship / external-backer event.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_patron_relations.webp` and later drop it in `src/ui/map/assets/events/`. Scene: a closed-door meeting between a wartime delegation and a foreign patron — two sets of chairs across a small table in a dim private office, a telephone with an international line, an unmarked map fragment, cigarette smoke, a single window — the quiet dependency on an outside backer. Figures only as out-of-focus silhouettes, no faces. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, dim available light. No readable text, no legible flags, no identifiable faces. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** identifiable named leaders, legible flags, readable documents, bright colour, public ceremony, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

---

# §6 DEFERRED — OWNER SIGN-OFF REQUIRED

The following assets are §6 (owner-gated, sensitive camp/atrocity/enclave-fall/decision-header content). **No generation prompts are authored for these.** They are listed ONLY to confirm they exist in the art surface and are deferred to owner §6 sign-off:

1. **Detention camps** — Omarska, Keraterm, Trnopolje (and any camp codex essay header).
2. **Srebrenica fall** (July 1995) — `srebrenica_falls_1995` event still / codex header.
3. **Žepa fall** (1995) — `zepa_falls_1995` event still / codex header.
4. **Ahmići massacre** — Central Bosnia atrocity still / codex header.
5. **Markale market shelling** — the shelling act itself (the generic besieged-city texture in 4.11 is NON-§6 and does NOT depict Markale).
6. **Drina valley executions** — execution / mass-grave imagery.
7. **The enclave OVERRUN / CONTAIN decision header** — the presidential moral-choice header art for the never-fell-enclave overrun decision.
8. **Any camp / atrocity codex essay header** — the 13 unindexed deposit essays (Foča, Višegrad, Prijedor, Zvornik 1992, etc.) and any future atrocity codex headers.

These require explicit owner + §6 sign-off before any prompt is authored or any image generated.

---

# Summary

| Category | Prompts authored |
|---|---:|
| 1. Peace-plan maps (attached-reference redraw) | 5 |
| 2. Dayton endgame / verdict backgrounds | 4 |
| 3. A4 onboarding teaching-deck imagery | 8 |
| 4. NON-§6 event stills | 12 |
| **Total NON-§6 prompts** | **29** |
| §6 prompts authored | **0** (8 items deferred, listed only) |

Every prompt is fully self-contained and copy-paste-ready: the style, the scene, the UI-reservation, the dimensions, and the negative prompt are all inlined into each block (no prefix assembly). All are documentary-realism (war-correspondent photograph aesthetic, except Category 1's neutral cartographic style redrawn from an attached reference photo), explicitly no oil-paint / no sepia / no dramatic-painting. Filenames/keys match the live resolvers (`EventDisplayData.image`, and the strategy doc's `event_{id}` / `plan_{id}` / `verdict_{tone}` conventions). The command-card `address_nation` / `decorate_unit` leadership gestures are intentionally NOT in this pack — they already ship real per-faction art (PR #317) that the faction-aware resolver hits first. Generation happens after owner review.
