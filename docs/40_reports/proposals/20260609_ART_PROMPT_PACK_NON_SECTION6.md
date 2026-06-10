# Art Prompt Pack — NON-§6 Queue (Documentary Realism) — STANDALONE / COPY-PASTE

**Date:** 2026-06-09
**Status:** Generation-ready prompt pack — READ-ONLY authoring deliverable. No images generated here; generation (Canva/external) happens after owner review.
**How to use:** Each asset below is a fully self-contained block. Copy ONE block and paste it straight into your image generator — the style, the scene, the UI-reservation, the dimensions, and the negative prompt are all inlined. No prefix assembly required (same workflow as the shipped presidential-desk cards). Each block is: a one-line **Filename** + **Drop path** + **Dimensions**, then a self-contained **Prompt:** paragraph, then a self-contained **Negative prompt:** line. The format mirrors the card prompts in `docs/plans/2026-05-24-gui-ai-asset-brief.md`.
**Canon:** DOCUMENTARY REALISM. The oil-paint / sepia direction is RETIRED. Every prompt is a war-correspondent photograph aesthetic — desaturated, film grain, period-accurate 1990s Balkans, institutional/archival light. Explicitly NO oil-paint, NO sepia filter, NO dramatic-painting style, NO heroic composition, NO video-game concept art. (Category 1 peace-plan maps were originally the one exception — a cartographic style redrawn from an ATTACHED reference photo — but the owner dropped that route 2026-06-10; the shipped plan stills are atmospheric document scenes in the standard photograph aesthetic. See GENERATION STATUS.)

---

## GENERATION STATUS (updated 2026-06-10)

Owner generated + delivered a first batch; QC'd, cropped to exact dims (`fit:cover`), converted to webp, placed in the wired/spec'd dirs.

**✅ DONE — generated, QC-passed, cropped→webp, placed (17):**

| Asset | Dims | Placed in |
|---|---|---|
| `tutorial_01_welcome` … `tutorial_08_judge` (all 8) | 600×400 | `src/ui/map/assets/tutorial/` |
| `verdict_dayton_close` / `verdict_pyrrhic` / `verdict_catastrophic` | 1920×1080 | `src/ui/map/assets/verdicts/` |
| `event_diplomatic_negotiation` / `event_dayton_signed_1995` | 800×450 | `src/ui/map/assets/event_illustrations/` (live-wired dir) |
| `plan_vance_owen` / `plan_owen_stoltenberg` / `plan_contact_group` / `plan_dayton` | 600×400 | `src/ui/map/assets/plans/` |

- **Event stills** land in the live-wired `event_illustrations/` (resolved by `eventIllustrationArt.ts` `import.meta.glob`) — they render once an event carries the matching `image` key.
- **Verdict + tutorial + plans** dirs are NOT yet globbed by any resolver → placement done, but a small WIRING follow-up is needed for them to render (VerdictScreen / onboarding-deck / peace-plan surface import).
- **Verdicts upscaled** 1672×941 → 1920×1080 (same 16:9, ~15% upscale; acceptable for full-screen bg). Reserved text bands preserved (no crop on matching aspect).

**✅ OWNER DECISION (2026-06-10) — peace-plan slots go the NO-MAP route.** The previously-HELD `plan_*` images (atmospheric desk/document scenes, delivered without the attached historical reference maps) were **approved as-is by the owner**: the cartographic territorial-division requirement in Category 1 is DROPPED. The four delivered scenes carry each plan's semantics through object language instead — a fragmented mosaic of scattered folders/maps (Vance-Owen's ten provinces), three folders at a round table (Owen-Stoltenberg's three republics), a ruler dividing two document stacks (Contact Group 51/49), and the empty pre-signing conference table (Dayton). QC-passed (no people, no readable text, no flags, period-accurate, documentary palette), resized 1536×1024 → 600×400 (same 3:2, no crop), webp, placed. The Category 1 prompt blocks below are retained for the historical record only — do NOT regenerate against them.

---

# PROVEN STYLE & LESSONS — distilled from the SHIPPED assets

> This section is the inherited contract for every prompt below (and for any future AWWV image prompt). It is distilled from the prompts that actually produced the 56 shipped presidential-desk / decision-header / consequence-still assets (`docs/plans/2026-05-24-gui-ai-asset-brief.md`), the 33+6 shipped faction command-card assets (`docs/40_reports/handovers/20260607_COMMAND_CARD_FACTION_PROMPT_PACK.md`, PRs #294 / #311 / #317), and the explicitly-RETIRED oil-paint/sepia direction (`docs/30_planning/_legacy/ART_DIRECTION_OIL_PAINT_EVENTS.md` + `docs/30_planning/design/IMAGE_GENERATION_PROMPTS.md`, both SUPERSEDED 2026-06-09). Read it once; every block below already conforms.

## 1. The five recurring conventions (every prompt must carry these)

1. **Opening contract line, verbatim shape:** `Generate a` `WxH` `px image. Export final as <file>.webp and later drop it in <path>.` — this exact phrasing is in every shipped prompt. The dimensions and drop path live *inside* the prompt, never only in a header.
2. **UI-overlay reservation clause — only where the surface renders app text OVER the image.** The shipped desk background reserves "the left third … a clean, natural dark office wall … reserved for app-rendered UI overlays: no black rectangles, no translucent panels, no embedded UI shapes, no card placeholders, no fake interface elements." Decision headers reserve "the center-left calm enough for title text under a dark overlay" or "a dark quiet band across the lower third for modal copy." **Reserve negative space ONLY when text sits on the image** (verdict backgrounds → glassmorphism overlay; the rule does NOT apply to event-modal stills or onboarding cards, where the app draws text in a panel BELOW the image — those must instead carry the explicit "no baked UI" guard so the generator does not invent a fake text strip).
3. **The standard guard set, every prompt:** `no people` (or distant/anonymous/from-behind only) · `no readable text` · `no legible flags or insignia` · `no modern electronics / computers / keyboards / LCD screens`. Let objects carry meaning — never a semantic English label (Gemini/MJ will write English if prompted with concepts like "peace proposal"; the shipped fix is to forbid English and keep documents blurred/unreadable).
4. **Documentary-realism descriptor block, every prompt:** "documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted [grey-olive-brown] palette, restrained contrast, natural [available/lamp] light." Plus the faction-pack's stronger form where useful: "full-frame continuous natural documentary photograph from edge to edge, with realistic film grain, true-to-life worn materials, and natural camera optics — a real photograph, not an illustration or render."
5. **The anti-sepia / anti-painting negative, every prompt:** the negative prompt must explicitly include `oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo` AND the baked-UI guards `HUD, UI overlay, readable text, captions, watermark, logo, signature` AND `identifiable face, graphic gore`.

## 2. What NOT to do — the RETIRED direction (active guard)

The first art direction (2026-03-25, retired) failed and is the cautionary baseline. Its prompts ALL opened with **"Oil painting, visible impasto brushstrokes, classical war painting style"**, referenced **Gerhard Richter / John Singer Sargent / This War of Mine**, were targeted at **Midjourney `--ar 5:2 --style raw`**, and were displayed under a CSS filter chain that literally applied **`saturate(0.45) sepia(0.15) brightness(0.75) contrast(1.1)`** — "the sepia mistake." Every prompt below actively guards against this: NO oil paint, NO impasto/brushstrokes, NO "classical war painting," NO Richter/Sargent painterly reference, NO sepia tone, NO `--style raw` painting tags. Documentary realism is the SOLE register (Category 1 cartographic redraw excepted).

## 3. The proven faction-differentiation recipe ("category = bones, faction = skin")

This is HOW the shipped command cards differentiate RBiH / RS / HRHB **without any legible flag or insignia** — the recipe to reuse for any faction-specific still:

- **Bones (shared across factions):** the space type + the hero subject + the camera + the lighting key. These read the asset's *meaning* and stay identical across factions.
- **Skin (changes per faction):** architecture, script, newspaper masthead, and faction marker. These change the *who* without changing the silhouette:

| | Architecture / setting | Equipment register (asymmetry) | Script | Newspaper | Faction marker (NO legible insignia) |
|---|---|---|---|---|---|
| **RBiH** (ARBiH) | Sarajevo Presidency — ornate late-Habsburg plaster, tall windows, dark-green drapes, herringbone parquet, dark oak; or a besieged-Sarajevo cellar depot | Improvised / besieged / scarce — mismatched civilian-into-soldier kit, bare shelves, UN-white aid trucks as the lifeline | Bosnian Latin | Oslobođenje | Wall-mounted coat-of-arms plaque (blue shield, white diagonal band, gold fleurs-de-lis) — flat, NOT a canted decal; NOT the post-1998 flag. (Per owner override, the `address_nation`/`decorate_unit` cards hang the 1992–1998 wartime white flag instead.) |
| **RS** (VRS) | Yugoslav-era military/government office in Pale / Han Pijesak / Banja Luka — dark vertical wood paneling, low ceiling, humming fluorescent strip, worn linoleum, JNA-surplus furniture | Ex-JNA materiel — olive-drab military radios, surplus crates, institutional plenty/control (the artillery-and-armour army) | Serbian Cyrillic | Glas Srpske / Глас Српске | Wartime plain tricolor (red-top / blue-middle / white-bottom, NO crest or emblem) |
| **HRHB** (HVO) | Compact Croatian-style provincial office in Grude / Mostar / Livno — white plaster, exposed Herzegovinian limestone, wooden shutters, terracotta tile, walnut | Croatian-backed provincial — better-equipped than ARBiH but provincial in scale; karst-road logistics | Croatian Latin | Hrvatski Vojnik | Wall-mounted checkerboard coat-of-arms plaque (red-and-white šahovnica shield) — NOT the Republic-of-Croatia crown-of-five-shields, NOT the plain Croatian flag |

- **Field / action scenes carry NO flag and NO crest** — faction is read from terrain alone (RBiH = Sarajevo mountain road; RS = wooded mountains; HRHB = Herzegovinian karst / limestone hills).
- **Insignia attachment (only for the four insignia cards):** attach the aged cast-metal crest `.webp` as a reference and render it *small, worn, color-graded into the scene*, on a real object the army marks (folder cover / desk-standard / ink-stamp pečat / cap-badge) — never a clean bright wall-framed badge, never a flat vector. (The `decorate_unit` card is the one exception where the insignia is the legible, faithful SUBJECT.)
- **Bright line for any military still:** regular formations only — no paramilitary / irregular-militia emblems (no skull / wolf / eagle patches), no glorification of atrocity.

## 4. Resolver facts (verified against the live pipeline 2026-06-09)

- **Command-card / directive-act art IS faction-aware:** `presidentialCommandArt.ts` resolves `command_cards/<id>_<faction>.webp` for the active player faction FIRST, then the faction-agnostic `command_cards/<id>.webp`, then a shared desk asset. `directiveActArt.ts` routes the act levers through that same resolver. Drop a `_<faction>.webp` in and it wins with no code edit.
- **Event-still art is NOT auto-faction-aware:** `eventIllustrationArt.ts` resolves `event.image` by **bare-basename suffix** from `src/ui/map/assets/event_illustrations/*.webp`. There is no automatic `_<faction>` fallback. So a faction-specific event still is achieved by **authoring a distinct `image` key on the faction-tagged event variant** (e.g. `rbih_washington_accept.image = 'event_washington_agreement_RBiH.webp'`). The resolver matches `…_RBiH.webp` by suffix exactly like any other basename — the faction split is an authoring choice in `src/sim/events/`, not a resolver feature. (The Category-table drop path below names `assets/events/`, which mirrors the strategy-doc convention; the live wired directory is `assets/event_illustrations/` — drop generated stills there.)

---

## Resolver / filename conventions (verified against the live pipeline)

These keys match the resolvers that the event-image pipeline + command-card art layer consume:

| Family | Filename pattern | Dimensions | Drop path | Consumed by |
|---|---|---|---|---|
| Peace-plan maps | `plan_{plan_id}.webp` | 600×400 | `src/ui/map/assets/plans/` | Peace-plan modal map slot (strategy doc §3) |
| Event stills | `event_{event_id}.webp` | 800×450 (16:9) | `src/ui/map/assets/event_illustrations/` *(live wired dir; strategy doc says `assets/events/`)* | `EventModal` via `resolveEventIllustration(event.image)` — bare-basename suffix match, NOT faction-aware (see Proven Style & Lessons §4) |
| Verdict backgrounds | `verdict_{tone}.webp` | 1920×1080 | `src/ui/map/assets/verdicts/` | `CinematicVerdict` / `VerdictScreen` tone background |
| Dayton endgame | `event_dayton_signed_1995.webp` (still) + `verdict_dayton_close.webp` (bg) | 800×450 / 1920×1080 | `src/ui/map/assets/events/` + `…/verdicts/` | Dayton close screen + endgame |
| Tutorial / teaching deck | `tutorial_{topic}.webp` | 600×400 | `src/ui/map/assets/tutorial/` | A4 onboarding negative-sum thesis deck |

> **NOTE — command-card leadership gestures are already shipped.** The `address_nation` and `decorate_unit` levers have real per-faction art (`command_cards/act_address_nation_{RBiH,RS,HRHB}.webp`, `command_cards/act_decorate_unit_{RBiH,RS,HRHB}.webp`, shipped in PR #317). The faction-aware resolver hits those first, so the old faction-agnostic fallback stills are NOT needed and have been removed from this pack.

> **NOTE ON SENSITIVE TEXTURE:** for refugee-column / displacement / aftermath stills, show DISTANCE and ABSENCE — empty road, abandoned belongings, a far line of figures with no readable faces — never graphic violence, never identifiable victims, never camp/atrocity content (that is §6, deferred at the end of this doc).

---

# CATEGORY 1 — Peace-Plan Maps (4) — SUPERSEDED 2026-06-10 (owner went the NO-MAP route)

> **⚠️ DO NOT GENERATE FROM THESE BLOCKS.** The owner approved the delivered atmospheric document-scene stills for all four `plan_*` slots and dropped the cartographic requirement (see GENERATION STATUS above). The blocks below are retained for the historical record only.

Cartographic / diagrammatic territorial-division maps — the ONE exception to the photograph aesthetic. **For every map in this category you will ATTACH a reference photo** of the actual historical proposed map for that plan. Each prompt below tells the generator to use the attached photo as the exact reference for the territorial boundaries and faithfully redraw it in a neutral period-accurate 1990s cartographic style. The brief historical note under each tells you which map to attach.

> **Note — the Washington Agreement is NOT a peace-plan map.** It was not a territorial-division proposal and had no map: the Washington Agreement (March 1994) ended the ARBiH–HVO war and created the Federation of Bosnia and Herzegovina. It is represented in this pack by the event still `event_washington_agreement.webp` (Category 4) — the signing of a ceasefire/alliance — not by a plan map.

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

### 1.3 Contact Group Plan — `plan_contact_group.webp`
- **Drop path:** `src/ui/map/assets/plans/plan_contact_group.webp`
- **Dimensions:** 600×400
- **Attach:** a photo/scan of a historical **Contact Group plan (July 1994)** map — Bosnia split 51/49 between the Federation and the Bosnian-Serb entity by a single decisive boundary.
- **Prompt:** Generate a `600 x 400` px image. Export final as `plan_contact_group.webp` and later drop it in `src/ui/map/assets/plans/`. Using the ATTACHED historical map of the Contact Group plan as the exact reference for the territorial boundaries, faithfully recreate and redraw it as a neutral, period-accurate 1990s diplomatic territorial-division map of Bosnia and Herzegovina. Printed-paper cartographic look as if reproduced from a peace-conference annex: flat matte print, restrained muted ink colours, fine cartographic linework, faint paper grain. Keep the recognisable BiH outline. Following the reference, divide the country by a single clear printed dividing line into TWO shares — a larger Federation share (~51 percent) in one muted tint and a smaller Serb-entity share (~49 percent) in a contrasting tint — the composition's defining feature being one decisive boundary partitioning the country into two near-equal halves, clean and almost administrative. NOT a glossy digital infographic, NOT a painting, NOT oil/sepia, NOT 3D. No readable place labels, no legend text, no percentage numbers, no flags.
- **Negative prompt:** United States map, U.S. state map, any national map other than Bosnia, glossy 3D globe, satellite photo, video-game minimap, colourful tourist map, neon colours, readable place names, legend, title block, ten provinces, three blocks, checkerboard, readable percentage numbers, oil painting, sepia, watermark, signature, text.

### 1.4 Dayton Map — `plan_dayton.webp`
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

> **Baked-UI guard (applies to every onboarding image AND every Category-4 event still).** The app renders the step/event title and body in its own panel, NOT over the image — so these images must NOT reserve a text band and must NOT bake one in. Each prompt's negative already forbids `HUD, UI overlay, readable text, captions`; treat the shipped faction-pack form as the inherited intent: *no black bar, no dark bottom strip, no title area, no caption area, no app frame, no gradient overlay, no watermark, no logo, no signature.* A full-bleed, edge-to-edge photograph with no invented interface furniture.

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

# FACTION-SPECIFIC RECOMMENDATIONS (the owner's question)

**The question:** which of the 28 should be authored per-faction (RBiH / RS / HRHB) rather than shared?

**The grounding (verified — see Proven Style & Lessons §4):**
- The event-still resolver is NOT auto-faction-aware. A faction split is an **authoring choice**: the faction-tagged event variant in `src/sim/events/` points its `image` key at a `…_<faction>.webp` basename (e.g. `rbih_washington_accept.image = 'event_washington_agreement_RBiH.webp'`). The resolver matches that basename by suffix exactly like any other. So faction-specific stills cost (a) three generations instead of one and (b) a one-line `image` edit per faction-tagged event row — they are cheap, but only worth it where the *picture itself* should differ.
- Many event families ARE faction-tagged (`rbih_washington_*` / `hrhb_washington_*`, `rs_assembly_*`, `rs_belgrade_*` / `hrhb_zagreb_*` / `rbih_nato_*`, faction recruitment/supply/siege families), so the hooks exist where we want them.
- **The discriminator: equipment & institutional asymmetry.** The war's defining texture is that the three armies are materially different — rifle-armed improvised ARBiH vs ex-JNA artillery/armour VRS vs Croatian-backed provincial HVO. Where a still depicts **mobilisation, supply, or the besieged/garrison condition**, a single shared image actively *misrepresents* at least two factions. Where a still depicts **diplomacy, cartography, a civic ritual, or an abstract teaching idea**, the factions are not materially distinct in-frame and a shared image is correct (and cheaper, and avoids inventing differences that did not exist at a negotiating table).

## Verdict table

| Asset | Recommendation | Reasoning |
|---|---|---|
| 1.1–1.4 Peace-plan maps | **SHARED** | Cartographic; the territorial division is faction-neutral by definition. |
| 2.1 Dayton signing still | **SHARED** | One signing room; the point is all three at one table. |
| 2.2–2.4 Verdict backgrounds | **SHARED** | Generic tone backgrounds keyed by *outcome* (`verdict_{tone}`), not faction. |
| 3.1–3.8 Onboarding deck | **SHARED** | Teaches the negative-sum thesis to any player; equipment-neutral by intent. |
| 4.1 Diplomatic negotiation | **SHARED** | International room; faction-neutral protocol space. |
| 4.2 Washington Agreement | **SHARED** | Two former enemies into one federation — the shared room IS the meaning. (RBiH/HRHB families may point at the same shared key; no split.) |
| 4.6 Referendum | **SHARED** | Civic ritual; a polling station is not faction-equipment. (Cyrillic-vs-Latin signage is the only differentiator and the prompt already forbids readable text.) |
| 4.7 Political session | **SHARED** | Empty assembly chamber; same reasoning as referendum. |
| 4.8 Ceasefire | **SHARED** | A silent frontline street reads the same for whoever stopped firing. |
| 4.9 Displacement column | **SHARED** | Deliberately anonymous, distant, faction-unattributed (and §-sensitive). Attributing displacement to a faction's "look" would be wrong. |
| 4.10 UN presence | **SHARED** | The UN is the constant third party; faction-neutral. |
| **4.3 Mobilisation** | **SPLIT → 3** | The single clearest equipment-asymmetry beat: ARBiH = civilians-into-soldiers with no kit; VRS = ex-JNA call-up with materiel; HVO = Croatian-backed provincial muster. A shared image lies about two of them. |
| **4.4 Supply convoy** | **SPLIT → 3** | Lifeline differs by faction: ARBiH = UN-white aid trucks on a besieged-Sarajevo mountain road; VRS = olive-drab ex-JNA military convoy; HVO = Croatian-supplied trucks on a Herzegovinian karst road. |
| **4.5 Supply shortage** | **SPLIT → 3** | Scarcity is asymmetric and is a *core mechanic* (the besieged ARBiH depot is near-empty; the VRS depot is institutional ex-JNA stock under strain; the HVO depot is provincial). |
| **4.11 Besieged-city texture** | **SPLIT → 3** | Faction experience of siege differs in setting and posture: RBiH = enduring *inside* a besieged Sarajevo; RS = the besieging army's hillside positions looking down; HVO = a divided Herzegovinian town (Mostar). |
| **4.12 Patron relations** | **SPLIT → 3** | The patron channel is faction-defining: RBiH ↔ a constrained Western/UN line; RS ↔ Belgrade; HVO ↔ Zagreb. The room skin + correspondence already differ in the families. |

**Net: 5 assets split × 3 factions = 15 authored per-faction prompt variants** (below). The shared faction-agnostic prompt for each of the five stays in Category 4 as the default/fallback; the per-faction variants below are the override stills. Filenames use the `…_<faction>.webp` suffix; wire them by setting the faction-tagged event's `image` key to the matching basename.

> **Differentiation discipline:** every variant changes ONLY the proven *skin* axes (architecture / setting, equipment register, faction marker) and keeps the *bones* (hero subject, camera, lighting, mood) constant — and carries NO legible flag or insignia (field/logistics scenes carry none at all; faction is read from setting + equipment). This is the shipped command-card recipe applied to event stills.

## 4.3 — Mobilisation, per faction

### `event_mobilization_RBiH.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_mobilization_RBiH.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of the RBiH formation/recruitment event(s) to `event_mobilization_RBiH.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_mobilization_RBiH.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a 1992–95 mobilisation in besieged Sarajevo seen at distance — a queue of ordinary men in mismatched civilian coats and a few odd pieces of improvised kit outside a damaged municipal building, shell-pocked plaster and a sandbagged doorway behind them, a posted but unreadable call-up notice, a battered civilian bus pressed into service, no proper uniforms and almost no weapons — citizens becoming soldiers with whatever they have. Cold grey light. The story is improvisation and scarcity, an army made of civilians. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural light. No readable text, no faces in close-up, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** heroic recruitment poster, marching parade, gleaming uniforms, abundant weapons, ex-JNA armour, readable notices, bright colour, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_mobilization_RS.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_mobilization_RS.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of the RS formation/recruitment event(s) to `event_mobilization_RS.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_mobilization_RS.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a 1992–95 Bosnian-Serb call-up at distance outside a Yugoslav-era municipal building — a queue of men in a mix of civilian coats and ex-JNA olive-drab surplus, with parked military trucks and crates of materiel behind them, a posted but unreadable mobilisation notice, the institutional weight of inheriting the old Yugoslav army's equipment. Cold flat light. The story is an organised call-up backed by ex-JNA materiel, not improvisation. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive palette, restrained contrast, natural light. No readable text, no faces in close-up, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** heroic recruitment poster, triumphant parade, brandished weapons, readable notices, bright colour, improvised rag-tag look only, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_mobilization_HRHB.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_mobilization_HRHB.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of the HRHB formation/recruitment event(s) to `event_mobilization_HRHB.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_mobilization_HRHB.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a 1992–95 HVO muster at distance in a Herzegovinian town — a queue of men outside a white-plaster-and-limestone provincial building with wooden shutters, better and more uniform kit than a rag-tag militia (Croatian-supplied), a parked truck or two, a posted but unreadable call-up notice, terracotta rooftops and karst hills behind. Subdued daylight. The story is a Croatian-backed provincial force, decently equipped but local in scale. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural light. No readable text, no faces in close-up, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** heroic recruitment poster, marching parade, brandished weapons, Republic-of-Croatia flag, readable notices, bright colour, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

## 4.4 — Supply convoy, per faction

### `event_supply_convoy_RBiH.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_supply_convoy_RBiH.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RBiH supply/convoy event(s) to `event_supply_convoy_RBiH.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_convoy_RBiH.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a small line of plain UN-white aid trucks on a snow-and-mud mountain road descending toward a besieged Bosnian town in a valley, dark forest at the verges, a leaden sky, the tenuous humanitarian lifeline of a surrounded population, seen from above and behind. No legible markings on the trucks. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive-brown palette, restrained contrast, natural light. No legible markings, no soldiers in close-up, no legible UN logos, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** gleaming new trucks, readable logos, military parade, ex-JNA armour, soldiers posing, bright colour, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_supply_convoy_RS.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_supply_convoy_RS.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RS supply/convoy event(s) to `event_supply_convoy_RS.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_convoy_RS.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a convoy of olive-drab ex-JNA military trucks, canvas-backed and possibly towing a field gun or trailer, on a forested mountain road through Bosnian-Serb-held high country, mud and snow at the verges, a leaden sky — the materiel advantage of the army that inherited Yugoslavia's stocks, moving with institutional weight. Seen from above and behind. No legible markings. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive palette, restrained contrast, natural light. No legible markings, no soldiers in close-up, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** gleaming new trucks, UN-white aid livery, readable logos, parade, soldiers posing, bright colour, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_supply_convoy_HRHB.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_supply_convoy_HRHB.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of HRHB supply/convoy event(s) to `event_supply_convoy_HRHB.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_convoy_HRHB.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a line of plain canvas-backed trucks on a narrow Herzegovinian karst road between bare limestone hills, sparse scrub and dry-stone walls at the verges, overcast light — the Croatian-supplied lifeline reaching a provincial HVO-held area from the south, seen from above and behind. No legible markings. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural light. No legible markings, no soldiers in close-up, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** gleaming new trucks, UN-white aid livery, readable logos, Republic-of-Croatia flag, forested alpine valley, parade, bright colour, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

## 4.5 — Supply shortage / scarcity, per faction

### `event_supply_shortage_RBiH.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_supply_shortage_RBiH.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RBiH supply-strain/shortage event(s) to `event_supply_shortage_RBiH.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_shortage_RBiH.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a near-empty besieged-Sarajevo supply cellar — bare brick vaulting, a few half-empty crates and a single jerrican on a concrete floor, empty shelving fading into shadow, one weak hanging bulb, a clipboard on a nail — the depot of an army that never had enough, scraping the bottom. Cold, dim, depleted. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, dim available light. No people, no readable labels, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** full warehouse, abundance, ex-JNA crates stacked high, bright light, readable labels, people, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_supply_shortage_RS.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_supply_shortage_RS.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RS supply-strain/shortage event(s) to `event_supply_shortage_RS.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_shortage_RS.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a Yugoslav-era military depot under strain — grey concrete and metal shelving holding ex-JNA crates and olive-drab ammunition boxes, more institutional stock than the besieged enclaves have but visibly thinning, a fluorescent strip flickering overhead, a battered counter with a ledger — the better-supplied army feeling the pinch of fuel and sanctions, not destitution. Dim, institutional. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive palette, restrained contrast, dim available light. No people, no readable labels, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** totally empty bare cellar, abundance overflowing, bright light, readable labels, people, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_supply_shortage_HRHB.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_supply_shortage_HRHB.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of HRHB supply-strain/shortage event(s) to `event_supply_shortage_HRHB.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_supply_shortage_HRHB.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a provincial Herzegovinian storeroom running low — stone-and-plaster walls, a terracotta or concrete floor, a few wooden crates and cloth sacks on battered walnut shelving, half the racks empty, one weak bulb, a counter ledger — a Croatian-supplied provincial force's stock thinning when the southern lifeline tightens. Dim, depleted but not destitute. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, dim available light. No people, no readable labels, no insignia, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** full warehouse, abundance, brick siege cellar, bright light, readable labels, people, oil painting, sepia tone, dramatic painting, concept art, heroic poster, bright saturated colours, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

## 4.11 — Besieged / siege texture, per faction

### `event_siege_city_RBiH.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_siege_city_RBiH.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RBiH siege/shelling-context event(s) to `event_siege_city_RBiH.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_siege_city_RBiH.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a wide view from INSIDE a besieged Bosnian city (Sarajevo) — shell-pocked socialist-era apartment blocks, plastic sheeting over blown-out windows, a thin column of smoke on the skyline at distance, an empty street where crossing is dangerous, grey winter light — endurance under siege, the daily texture of being the surrounded. No bodies, no people in close-up. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, natural light. No bodies, no graphic content, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, gore, identifiable casualties, dramatic explosion in foreground, hillside besieging positions, bright colour, readable signage, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face.

### `event_siege_city_RS.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_siege_city_RS.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RS siege-context event(s) to `event_siege_city_RS.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_siege_city_RS.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a wide view from a wooded hillside position LOOKING DOWN onto a besieged Bosnian city in the valley below — sandbagged earthworks and an empty dug-in position in the foreground, the grey shell-marked city spread out far beneath under winter haze, a thin column of smoke rising from it at distance — the perspective of the besieging army on the high ground. No bodies, no people in close-up, no weapons in focus. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-olive palette, restrained contrast, natural light. No bodies, no graphic content, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, gore, identifiable casualties, dramatic explosion in foreground, view from inside the streets, glorified gun crew, bright colour, readable signage, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face.

### `event_siege_city_HRHB.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_siege_city_HRHB.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of HRHB siege/divided-town-context event(s) to `event_siege_city_HRHB.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_siege_city_HRHB.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a wide view of a divided Herzegovinian town (Mostar) under siege — Ottoman-and-Austro-Hungarian stone buildings and a destroyed river bridge over a green river gorge, shell-scarred facades on both banks, plastic sheeting over windows, a thin column of smoke at distance, grey light — a city split and fought through street by street. No bodies, no people in close-up. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, natural light. No bodies, no graphic content, no readable text, no flags. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** bodies, gore, identifiable casualties, dramatic explosion in foreground, socialist high-rise skyline only, bright colour, readable signage, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face.

## 4.12 — Patron / foreign-backing meeting, per faction

### `event_patron_relations_RBiH.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_patron_relations_RBiH.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RBiH patron events (`rbih_nato_comply/defy`, Western/UN-channel families) to `event_patron_relations_RBiH.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_patron_relations_RBiH.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a closed-door meeting between a besieged Bosnian-government delegation and a Western/international interlocutor — two sets of chairs across a small table in a dim, war-worn Sarajevo office with cracked plaster, a field telephone with an international line, an unmarked map fragment, cigarette smoke, weak daylight through a taped window — the constrained, dependent relationship of a government appealing to outside powers it cannot command. Figures only as out-of-focus silhouettes, no faces. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, dim available light. No readable text, no legible flags, no identifiable faces. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** identifiable named leaders, legible flags, readable documents, bright colour, public ceremony, opulent undamaged office, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_patron_relations_RS.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_patron_relations_RS.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of RS patron events (`rs_belgrade_*`, `rs_holbrooke_*`) to `event_patron_relations_RS.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_patron_relations_RS.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a closed-door meeting between a Bosnian-Serb delegation and a Belgrade patron — two sets of chairs across a heavier table in a wood-paneled Yugoslav-era office, a black landline telephone, an unmarked map fragment, an ashtray and cigarette smoke, a single window, fluorescent fill — the back-channel dependency on Belgrade, more materially backed than the besieged government but politically tethered. Figures only as out-of-focus silhouettes, no faces. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey palette, restrained contrast, dim available light. No readable text, no legible flags, no identifiable faces. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** identifiable named leaders, legible flags, readable documents, bright colour, public ceremony, war-damaged cracked office, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

### `event_patron_relations_HRHB.webp`
- **Drop path:** `src/ui/map/assets/event_illustrations/event_patron_relations_HRHB.webp`
- **Dimensions:** 800×450 (16:9)
- **Wire:** set the `image` key of HRHB patron events (`hrhb_zagreb_*`, `hrhb_hv_support_*`) to `event_patron_relations_HRHB.webp`.
- **Prompt:** Generate a `800 x 450` px image. Export final as `event_patron_relations_HRHB.webp` and later drop it in `src/ui/map/assets/event_illustrations/`. Scene: a closed-door meeting between an HVO delegation and a Zagreb patron — two sets of chairs across a walnut table in a compact Herzegovinian provincial office with white plaster and exposed limestone, wooden shutters half-closed, a telephone with an international line, an unmarked map fragment, cigarette smoke, subdued daylight — the close but quiet dependency on Zagreb. Figures only as out-of-focus silhouettes, no faces. Style: documentary war-correspondent photograph, 1990s, desaturated colour, fine film grain, muted grey-brown palette, restrained contrast, dim available light. No readable text, no legible flags, no identifiable faces. NOT oil painting, NOT sepia, NOT a dramatic painting, NOT concept art, NOT heroic, NOT a clean glossy stock photo.
- **Negative prompt:** identifiable named leaders, legible flags, Republic-of-Croatia flag, readable documents, bright colour, public ceremony, oil painting, sepia tone, dramatic painting, concept art, heroic poster, clean glossy stock photo, HUD, UI overlay, readable text, captions, watermark, logo, signature, identifiable face, graphic gore.

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
| 1. Peace-plan maps (attached-reference redraw) | 4 |
| 2. Dayton endgame / verdict backgrounds | 4 |
| 3. A4 onboarding teaching-deck imagery | 8 |
| 4. NON-§6 event stills (shared / faction-agnostic default) | 12 |
| **Total NON-§6 shared prompts** | **28** |
| Faction-specific variants (5 stills × RBiH/RS/HRHB) | 15 |
| **Grand total prompts authored** | **43** |
| §6 prompts authored | **0** (8 items deferred, listed only) |

Every prompt is fully self-contained and copy-paste-ready: the style, the scene, the UI-reservation, the dimensions, and the negative prompt are all inlined into each block (no prefix assembly). All are documentary-realism (war-correspondent photograph aesthetic, except Category 1's neutral cartographic style redrawn from an attached reference photo), explicitly no oil-paint / no sepia / no dramatic-painting — see the **Proven Style & Lessons** header for the inherited contract distilled from the shipped assets. Filenames/keys match the live resolvers (event stills resolve by bare basename through `resolveEventIllustration` from `assets/event_illustrations/`; the strategy doc's `event_{id}` / `plan_{id}` / `verdict_{tone}` conventions otherwise hold). The command-card `address_nation` / `decorate_unit` leadership gestures are intentionally NOT in this pack — they already ship real per-faction art (PR #317) that the faction-aware resolver hits first.

**Faction-specificity (Part C):** the five military / equipment-asymmetry stills — mobilisation (4.3), supply convoy (4.4), supply shortage (4.5), besieged-city texture (4.11), and patron relations (4.12) — are recommended for a per-faction split (15 authored variants, `…_<faction>.webp`), because a single shared image misrepresents the rifle-armed improvised ARBiH vs ex-JNA artillery/armour VRS vs Croatian-backed provincial HVO asymmetry. The diplomatic, cartographic, civic-ritual, and onboarding assets stay SHARED — the factions are not materially distinct in those frames and a shared image is both cheaper and more honest. Each variant changes only the proven *skin* axes (setting / equipment / faction marker) over constant *bones* (subject / camera / light), and carries no legible flag or insignia. Wire a faction split by pointing the faction-tagged event's `image` key at the matching `…_<faction>.webp` basename. Generation happens after owner review.
