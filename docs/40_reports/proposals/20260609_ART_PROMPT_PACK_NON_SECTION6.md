# Art Prompt Pack — NON-§6 Queue (Documentary Realism)

**Date:** 2026-06-09
**Status:** Generation-ready prompt pack — READ-ONLY authoring deliverable. No images generated here; generation (Canva/external) happens after owner review.
**Canon:** DOCUMENTARY REALISM. The oil-paint / sepia direction is RETIRED. Every prompt below is a war-correspondent photograph aesthetic — desaturated, film grain, period-accurate 1990s Balkans, institutional/archival light. Explicitly NO oil-paint, NO sepia filter, NO dramatic-painting style, NO heroic composition, NO video-game concept art.
**Voice/structure:** matches `docs/plans/2026-05-24-gui-ai-asset-brief.md` (the canonical prompt style for the 56 shipped presidential-desk assets) — each asset carries a positive prompt, a negative prompt, exact dimensions, the consuming surface, and a filename/key that the live resolver consumes.

---

## Shared Style Prefix (prepend to EVERY positive prompt below)

> Style: documentary war-correspondent photograph, 1990s Balkans. Desaturated colour, fine film grain, slightly faded as if scanned from a press archive. Muted palette — grey, olive, brown, cold blue. Institutional / military atmosphere. NOT oil painting, NOT sepia-toned, NOT a dramatic painting, NOT concept art, NOT heroic, NOT colourful, NOT a clean modern stock photo. Natural available light, restrained contrast. No watermark, no signature, no readable text.

## Shared Negative Prompt (append to EVERY negative prompt below)

> oil painting, sepia filter, sepia tone, dramatic painting, concept art, fantasy, sci-fi, heroic poster, propaganda poster, bright saturated colours, clean glossy stock photo, modern glass office, modern computer, smartphone, HUD, UI overlay, menu, dashboard, black panel, card placeholder, readable text, captions, subtitles, watermark, logo, signature, named real person, identifiable face, graphic gore, explicit violence

> NOTE ON SENSITIVE TEXTURE: for refugee-column / displacement / aftermath stills (Category E), show DISTANCE and ABSENCE — empty road, abandoned belongings, a far line of figures with no readable faces — never graphic violence, never identifiable victims, never camp/atrocity content (that is §6, deferred below).

---

## Resolver / filename conventions (verified against the live pipeline)

These keys match the resolvers that the just-wired event-image pipeline + command-card art layer consume:

| Family | Filename pattern | Dimensions | Drop path | Consumed by |
|---|---|---|---|---|
| Peace-plan maps | `plan_{plan_id}.webp` | 600×400 | `src/ui/map/assets/plans/` | Peace-plan modal map slot (strategy doc §3) |
| Event stills | `event_{event_id}.webp` | 800×450 (16:9) | `src/ui/map/assets/events/` | `EventModal` / `EventDecisionModal` via `EventDisplayData.image` |
| Verdict backgrounds | `verdict_{faction}.webp` + tone bg | 1920×1080 | `src/ui/map/assets/verdicts/` | `CinematicVerdict` / `VerdictScreen` tone background |
| Dayton endgame bg | `event_dayton_signed_1995.webp` (still) + `verdict_dayton_close.webp` (bg) | 800×450 / 1920×1080 | `src/ui/map/assets/events/` + `…/verdicts/` | Dayton close screen + endgame |
| Command-card fallback stills | `{act_id}.webp` (faction-agnostic) | 1280×720 (16:9) | `src/ui/map/assets/command_cards/` | `presidentialCommandArt` / `directiveActArt` override layer |
| Tutorial / teaching deck | `tutorial_{topic}.webp` | 600×400 | `src/ui/map/assets/tutorial/` | A4 onboarding negative-sum thesis deck |

Resolution precedence for command cards (verified in `src/ui/map/data/presidentialCommandArt.ts`): per-id override `command_cards/<id>.webp` → faction-specific `command_cards/<id>_<faction>.webp` → mapped shared desk still → text-only fallback. The 2 fallback stills below are the faction-AGNOSTIC `<act_id>.webp` overrides so the resolver stops falling through to a borrowed still.

---

# CATEGORY 1 — Peace-Plan Maps (5)

Cartographic / diagrammatic territorial-division maps. These are the ONE exception to the photograph aesthetic: a **period-accurate neutral cartographic style** (printed 1990s diplomatic-annex map, not a painting, not a glossy infographic). Each shows the proposed division of Bosnia and Herzegovina. The shared photograph style prefix does NOT apply to this category; use the cartographic prefix below instead.

**Cartographic style prefix (Category 1 only):**
> Style: a neutral, period-accurate 1990s diplomatic territorial-division map of Bosnia and Herzegovina, printed-paper cartographic look as if reproduced from a peace-conference annex. Flat matte print, restrained muted ink colours, fine cartographic linework, faint paper grain. NOT a glossy digital infographic, NOT a painting, NOT oil/sepia, NOT 3D. Recognisable BiH outline (the distinctive triangular country with the Sava in the north and the narrow Neretva corridor to the Adriatic). Province/entity boundaries drawn as clean printed lines. No readable place labels, no legend text, no flags.

**Cartographic negative prompt (Category 1 only — plus shared negative):**
> United States map, U.S. state map, any modern national map other than Bosnia, glossy 3D globe, satellite photo, video-game minimap, colourful tourist map, neon colours, readable place names, legend, title block

### 1.1 Vance-Owen Plan (`plan_vance_owen.webp`)
- **Surface:** Peace-plan modal, map slot below the territorial-split readout.
- **Format:** 600×400 WebP.
- **Prompt:** [cartographic prefix] Bosnia and Herzegovina divided into TEN numbered provinces, each a distinct muted ink tint (provinces ringed by clean printed boundaries, a fragmented checkerboard of cantons rather than three blocks), suggesting an ethnically mixed cantonal partition with Sarajevo as a separate special district. Restrained beige-and-ink palette. No readable numbers or labels — the ten-province fragmentation must read purely from shape and tint.
- **Negative:** [cartographic negative] three large solid blocks, two-way split, readable province numbers.

### 1.2 Owen-Stoltenberg Plan (`plan_owen_stoltenberg.webp`)
- **Surface:** Peace-plan modal map slot.
- **Format:** 600×400 WebP.
- **Prompt:** [cartographic prefix] Bosnia and Herzegovina divided into THREE distinct contiguous territories in three muted tints (a Serb-majority union, a Bosniak-majority union, a Croat-majority union), the three-way confederal partition reading as three large solid regions with a constricted Sarajevo district between them. Visibly fewer, larger blocks than the ten-province version.
- **Negative:** [cartographic negative] ten provinces, checkerboard cantons, 51/49 single dividing line.

### 1.3 Washington Agreement (`plan_washington.webp`)
- **Surface:** Peace-plan modal map slot (Bosniak-Croat Federation formation).
- **Format:** 600×400 WebP.
- **Prompt:** [cartographic prefix] Bosnia and Herzegovina showing the Bosniak-Croat FEDERATION as a single unified tint across central, western and northern government-held territory (the former two-way internal line dissolved into one federation colour), with the remaining Serb-held territory in a separate contrasting muted tint. The map's story is unification of two former adversaries into one entity facing a third. A faint dotted former-internal boundary may remain as a ghost line inside the federation tint.
- **Negative:** [cartographic negative] three equal blocks, ten provinces, single clean 51/49 line.

### 1.4 Contact Group Plan (`plan_contact_group.webp`)
- **Surface:** Peace-plan modal map slot.
- **Format:** 600×400 WebP.
- **Prompt:** [cartographic prefix] Bosnia and Herzegovina divided by a single clear printed dividing line into TWO shares — a larger Federation share (~51 percent) in one muted tint and a smaller Serb-entity share (~49 percent) in a contrasting tint. The composition's defining feature is one decisive boundary partitioning the country into two near-equal halves. Clean, almost administrative.
- **Negative:** [cartographic negative] ten provinces, three blocks, checkerboard, readable percentage numbers.

### 1.5 Dayton Map (`plan_dayton.webp`)
- **Surface:** Peace-plan modal map slot AND the Dayton close / endgame screen (the most consequential map in the game).
- **Format:** 600×400 WebP (a 1920×1080 endgame variant is covered in Category 2).
- **Prompt:** [cartographic prefix] the FINAL Dayton division of Bosnia and Herzegovina: the Federation (~51 percent) and Republika Srpska (~49 percent) shown as two muted tints separated by the long, irregular, deeply convoluted Inter-Entity Boundary Line that snakes across the country, with the narrow Brčko corridor pinching the north and the Goražde corridor reaching east. The boundary should look negotiated and tortured rather than clean — many small jogs and salients. Sober, definitive, final.
- **Negative:** [cartographic negative] clean straight dividing line, ten provinces, three equal blocks, readable labels.

---

# CATEGORY 2 — Dayton Endgame / Verdict-Screen Backgrounds (4)

The war-close climax and the generic Pyrrhic-verdict backgrounds. Diplomatic and somber — NOT atrocity, NOT combat. Photograph aesthetic (shared prefix applies). Verdict backgrounds sit behind a glassmorphism overlay, so each needs a calm negative-space band for app-rendered verdict copy.

### 2.1 Dayton / Paris Signing — endgame still (`event_dayton_signed_1995.webp`)
- **Surface:** Dayton close screen + `EventModal` for `dayton_signed_1995`.
- **Format:** 800×450 WebP (16:9).
- **Prompt:** [shared prefix] interior of a 1995 American air-base conference room set up for a peace signing: a long polished table with three sets of folded document folders and pens laid at three delegation positions, name-card holders left blank/unreadable, water glasses, microphones on stands, large unmarked territorial maps of Bosnia mounted on the back wall, rows of empty chairs, cold institutional overhead light through high windows. The room is composed and bureaucratic — the war ends at a table, not on a battlefield. No people, no readable name cards, no flags with legible symbols.
- **Negative:** [shared negative] battlefield, soldiers, celebration, handshake close-up of named leaders, readable name placards, legible flags.

### 2.2 Dayton-close verdict background (`verdict_dayton_close.webp`)
- **Surface:** `CinematicVerdict` / endgame background behind the verdict overlay.
- **Format:** 1920×1080 WebP.
- **Prompt:** [shared prefix] wide, quiet establishing view at dusk of a Bosnian town three-and-a-half years into war: damaged but still-standing apartment blocks and a church or minaret in silhouette, a few lit windows, mist or cold haze over the valley, no fighting, the stillness of a war that has simply stopped. The lower third is a calm darker band of shadowed townscape and sky reserved for app-rendered verdict text. Elegiac, not triumphant. No people in the foreground, no flags, no fire.
- **Negative:** [shared negative] explosions, active combat, triumphant symbolism, sunrise hope cliché, readable signage, crowds.

### 2.3 Pyrrhic verdict background — somber / pyrrhic tone (`verdict_pyrrhic.webp`)
- **Surface:** `CinematicVerdict` background for the `pyrrhic` / `somber` tones (`VerdictSceneTone`).
- **Format:** 1920×1080 WebP.
- **Prompt:** [shared prefix] an emptied government-office briefing room after the war's end: a long table strewn with closed map folders and an overflowing ashtray, chairs pushed back as if everyone has just left, a wall map of Bosnia with faded grease-pencil front lines, cold grey daylight through tall windows, dust in the air. The mood is depletion and the morning-after of a war won at ruinous cost — survival, not victory. Leave a calm negative-space area (upper-left or lower band) for app-rendered verdict copy. No people, no flags, no readable text.
- **Negative:** [shared negative] victory celebration, bright colour, medals, trophies, readable map labels, people.

### 2.4 Catastrophic verdict background — collapse tone (`verdict_catastrophic.webp`)
- **Surface:** `CinematicVerdict` background for the `catastrophic` tone.
- **Format:** 1920×1080 WebP.
- **Prompt:** [shared prefix] a wide, bleak winter landscape at the edge of a destroyed Bosnian town: a burnt-out roofless building, a snow-dusted empty road leading out of frame, an abandoned overcoat or chair left in the snow, a leaden overcast sky, no horizon hope. Absolute desaturation — near-monochrome grey and white with a faint cold blue. The image is the cost made visible: emptiness, ruin, abandonment, the country hollowed out. A quiet darker sky band at top reserved for app-rendered verdict text. No bodies, no graphic content, no people, no flags.
- **Negative:** [shared negative] bodies, gore, identifiable victims, fire spectacle, dramatic action, bright colour, people in frame.

---

# CATEGORY 3 — Command-Card Fallback Stills (2)

Per `src/ui/map/data/directiveActArt.ts`, the §10 leadership-gesture levers `address_nation` and `decorate_unit` currently resolve to TEMPORARY byte-identical copies of the front-visit art. These two faction-AGNOSTIC fallback stills give the resolver a real `<act_id>.webp` override to land on (the per-faction `<act_id>_<faction>.webp` files already exist; these agnostic stills are the safety net the resolver falls to before the text-only header). 16:9 dossier-header framing, calm left third for the directive-card title overlay.

### 3.1 Address-the-Nation fallback (`act_address_nation.webp`)
- **Surface:** Decision Room `DirectiveCard` 16:9 dossier header for the `address_nation` lever (faction-agnostic fallback in `presidentialCommandArt`).
- **Format:** 1280×720 WebP (16:9).
- **Prompt:** [shared prefix] a 1990s radio/television address setup in a spare government office: a single microphone on a desk before an empty chair, a folded sheet of prepared remarks, a glass of water, a switched-on but unreadable studio light, heavy curtains behind, muted warm practical lamp light. The scene implies a leader about to speak to a nation at war — sober, weighty, solitary. No people, no flags with legible symbols, no readable text. Keep the left third quiet and shadowed for the directive-card title overlay.
- **Negative:** [shared negative] cheering crowd, podium rally, bright stage lights, modern broadcast graphics, legible flag, people.

### 3.2 Decorate-the-Unit fallback (`act_decorate_unit.webp`)
- **Surface:** Decision Room `DirectiveCard` 16:9 dossier header for the `decorate_unit` lever (faction-agnostic fallback).
- **Format:** 1280×720 WebP (16:9).
- **Prompt:** [shared prefix] a quiet commemoration arrangement on a worn wooden desk: a plain unmarked medal or ribbon resting on a folded citation paper, a candle or small lamp, a field cap set aside, restrained shadow. The tone is recognition and mourning intertwined — honouring a unit that paid dearly, not a parade. No faces, no readable citation text, no legible insignia, no flags. Keep the left third visually quiet for the directive-card title overlay.
- **Negative:** [shared negative] parade, marching soldiers, saluting crowd, readable medal text, legible insignia, real person, bright ceremony.

---

# CATEGORY 4 — A4 Onboarding Teaching-Deck Imagery (8)

The negative-sum-thesis onboarding deck. One teaching image per onboarding step (`src/ui/map/components/onboarding/onboardingSteps.ts` — ids `01_welcome`…`08_judge`). Each image teaches the step's lesson WITHOUT graphic content; the through-line is "this war can only be survived, ended, or made worse." Photograph aesthetic (shared prefix applies). Restrained, diagrammatic where the step is about a UI concept; atmospheric where the step is about the war's nature. Filename keyed to the step id so the overlay can resolve per-step art.

### 4.1 `tutorial_01_welcome.webp` — "A War You Cannot Win"
- **Surface:** Onboarding step `01_welcome` teaching panel.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] a worn wall map of Bosnia and Herzegovina under a single desk lamp in a darkened command office, the front lines drawn in faded grease pencil, no scoreboard and no victory marker anywhere — just a contested, exhausted country. The image must read as "there is no victory screen here." No people, no flags, no readable labels.
- **Negative:** [shared negative] trophy, podium, victory banner, scoreboard, bright hopeful light.

### 4.2 `tutorial_02_map.webp` — "The Map Is Not the Score"
- **Surface:** Onboarding step `02_map`.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] two near-identical map overlays of the same Bosnian front laid side by side on a light table, the front line essentially unchanged between them, while the margins are covered in tally marks and crossing-out — the visual argument that the line barely moved while the cost mounted. Documentary, diagrammatic. No readable numbers, no people.
- **Negative:** [shared negative] dramatic arrows of conquest, bright victory colour, readable statistics.

### 4.3 `tutorial_03_brief.webp` — "The Brief"
- **Surface:** Onboarding step `03_brief`.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] a presidential desk packet at the start of a working day: a stack of unopened institutional report folders, a map fragment, a field telephone, muted morning light. The lesson is "read the desk packet before you act." No readable text, no people.
- **Negative:** [shared negative] modern laptop, screens, bright office, people.

### 4.4 `tutorial_04_inspect.webp` — "Inspect Before You Decide"
- **Surface:** Onboarding step `04_inspect`.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] a staff-officer's desk with a magnifying glass laid over an operational map, supply ledgers and readiness sheets fanned out beneath, a green desk lamp, the posture of scrutiny before commitment. Sober, deliberate. No readable figures, no people, no insignia.
- **Negative:** [shared negative] action scene, soldiers, bright colour, readable numbers.

### 4.5 `tutorial_05_decide.webp` — "President's Desk"
- **Surface:** Onboarding step `05_decide`.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] a desk before a decision: two unmarked proposal folders, a fountain pen resting between them, a single lamp, the weight of an unmade choice. Restrained, quiet, consequential. No readable text, no people, no flags.
- **Negative:** [shared negative] dramatic spotlight, courtroom theatre, bright colour, people.

### 4.6 `tutorial_06_execute.webp` — "Operations"
- **Surface:** Onboarding step `06_execute`.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] a field radio handset resting on an operational map with grease-pencil unit markings — the order goes out THROUGH commanders, not from the president's own hand. Implies command-at-a-distance, not a general pushing units. Subdued green-brown staff-office light. No soldiers, no combat, no insignia, no readable text.
- **Negative:** [shared negative] battlefield, soldiers in action, explosions, readable unit names.

### 4.7 `tutorial_07_report.webp` — "Advance and Read the Aftermath"
- **Surface:** Onboarding step `07_report`.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] the aftermath as a record on the desk: a turn-summary report sheet, a map with a front line nudged only slightly, and beside it a far, distant line of people leaving a road at the horizon (no faces, no detail) — the human cost recorded soberly, not sensationalised. Cold grey daylight. No graphic content, no identifiable people, no readable text.
- **Negative:** [shared negative] graphic violence, identifiable faces, gore, dramatic spectacle, readable text.

### 4.8 `tutorial_08_judge.webp` — "The Cost Ledger Is the Scoreboard"
- **Surface:** Onboarding step `08_judge`.
- **Format:** 600×400 WebP.
- **Prompt:** [shared prefix] a sober accounting laid on a desk: a long ledger sheet with columns and tally marks (unreadable), an ashtray, a cold coffee cup, the Dayton-style territorial map turned partly face-down beneath it — the war tallied as cost, not conquest, and judged at the negotiating table. Elegiac, administrative, final. No readable numbers, no people, no flags.
- **Negative:** [shared negative] trophy, scoreboard, bright colour, victory imagery, readable figures.

---

# CATEGORY 5 — NON-§6 Event Stills (12)

The war's texture WITHOUT graphic atrocity: diplomacy, mobilisation, supply, the political/referendum process, ceasefire, and distant-displacement-that-is-not-atrocity-graphic. 800×450 WebP, 16:9, `event_{event_id}.webp`, consumed by `EventModal` via `EventDisplayData.image`. The "maps to event family" column ties each still to the branch-tag families in `src/sim/events/event_families.ts` and the diplomacy composite tags.

### 5.1 Diplomatic negotiation — generic (`event_diplomatic_negotiation.webp`)
- **Maps to event families:** `diplomacy_vance_owen`, `diplomacy_owen_stoltenberg`, `diplomacy_london_subscribed/rejected`, `diplomacy_un_safe_areas` (composite diplomacy tags); reusable for any negotiation event lacking a bespoke still.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a 1990s international negotiation room: a long table with proposal folders, water carafes, microphones, a territorial map of Bosnia propped on an easel at the back, suited figures seen only as out-of-focus silhouettes from behind (no faces), cold institutional light. The mood is grinding diplomacy under pressure. No readable text, no legible flags, no identifiable faces.
- **Negative:** [shared negative] handshake of named leaders, legible flags, readable documents, celebration.

### 5.2 Washington Agreement signing (`event_washington_agreement.webp`)
- **Maps to event families:** `diplomacy_washington`, `rbih_washington_accept/reluctant`, `hrhb_washington_accept/reluctant`, `hrhb_washington_agreement_1994`.
- **Surface:** `EventModal` for `washington_agreement`.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a 1994 Washington signing-room interior: two delegations' folders set across a table with a third mediating position, blank name cards, a map of central Bosnia on the wall showing two former adversaries' territory merging into one federation, sober institutional daylight. The story is two enemies forced into alliance. No people, no readable name cards, no legible flags.
- **Negative:** [shared negative] American flag close-up readable, named leaders shaking hands, celebration, readable text.

### 5.3 Mobilisation / recruitment (`event_mobilization.webp`)
- **Maps to event families:** formation/recruitment events; reusable for any mobilisation or call-up event. (Faction-agnostic.)
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a 1990s town mobilisation scene at distance: a queue of ordinary men in civilian coats outside a municipal building under a grey sky, a posted but unreadable call-up notice on the wall, a parked civilian bus, no weapons displayed, no uniforms of note — citizens becoming soldiers, reluctantly. Cold documentary light. No readable text, no faces in close-up, no insignia.
- **Negative:** [shared negative] heroic recruitment poster, marching parade, weapons brandished, readable notices, bright colour.

### 5.4 Supply convoy on the road (`event_supply_convoy.webp`)
- **Maps to event families:** supply / logistics events; reusable for convoy and resupply events.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a small convoy of canvas-backed trucks on a narrow mountain road through Bosnian forest, mud and snow at the verges, a leaden sky, the road clinging to a hillside — the tenuous lifeline of a besieged country. Seen from a distance, documentary. No markings legible, no soldiers in close-up, no UN logos legible.
- **Negative:** [shared negative] gleaming new trucks, readable logos, military parade, bright colour, soldiers posing.

### 5.5 Supply shortage / scarcity (`event_supply_shortage.webp`)
- **Maps to event families:** supply-strain / shortage events; reusable for ammunition- or fuel-scarcity events.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a near-empty supply depot: a few crates and jerricans on a concrete floor, empty pallet racks stretching into shadow, a single hanging bulb, a clipboard hung on a nail — the visual of running out. Cold, dim, depleted. No people, no readable labels, no insignia.
- **Negative:** [shared negative] full warehouse, abundance, bright light, readable labels, people.

### 5.6 Political process / referendum (`event_referendum.webp`)
- **Maps to event families:** foundational political-decision events; `rs_assembly_*`, `rbih_*_assembly`, `hrhb_croat_republic`, `rbih_civic/bosniak` identity tags; reusable for any assembly/referendum political event.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a 1990s polling station or assembly hall: rows of empty wooden chairs facing a plain table with a ballot box, a hand-lettered but unreadable notice, weak daylight through tall windows, the quiet civic ritual that precedes a war. Sober, documentary. No people, no readable text, no flags.
- **Negative:** [shared negative] crowds cheering, rally, banners with readable slogans, bright colour, legible flags.

### 5.7 Assembly / political session (`event_political_session.webp`)
- **Maps to event families:** `rs_assembly_accept_rejection`, `rs_assembly_override`, `rs_vopp_override_assembly`, `rbih_owen_stoltenberg_reject_via_assembly`; reusable for any parliamentary/assembly-decision event.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] the interior of a 1990s republican assembly chamber: tiers of empty seats, a speaker's rostrum, a microphone, an unreadable order-of-business sheet on a desk, dim institutional light — the chamber where a fateful vote is about to be cast. Sober, weighty. No people, no readable text, no flags.
- **Negative:** [shared negative] cheering chamber, readable signage, bright colour, identifiable figures.

### 5.8 Ceasefire / truce (`event_ceasefire.webp`)
- **Maps to event families:** `hrhb_central_bosnia_ceasefire`, `hrhb_zagreb_ceasefire_acknowledge/resist`, `rbih_abdic_accept_ceasefire`; reusable for any truce/ceasefire event.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a quiet, snowy frontline street during a ceasefire: sandbagged positions empty of action, a white cloth or rag tied to a pole, a deserted no-man's-land of damaged houses, low grey light, the eerie calm of guns gone silent. Documentary, melancholy. No people, no bodies, no readable text, no flags.
- **Negative:** [shared negative] active combat, explosions, soldiers fighting, celebration, bright colour, readable signage.

### 5.9 Refugee column at distance (NON-atrocity) (`event_displacement_column.webp`)
- **Maps to event families:** displacement-tracking events; reusable for any civilian-displacement event that is NOT a camp/massacre (those are §6). See SENSITIVE-TEXTURE note in the shared negative prompt.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a long column of civilians seen from far away walking a road out of a Bosnian valley, carrying bundles and pushing a handcart, a tractor-trailer at the head, mist over distant hills — figures small and anonymous, no faces, no detail, the scale of displacement read through the length of the line. Cold, grey, restrained, sorrowful. ABSOLUTELY no graphic content, no identifiable victims, no violence, no camp imagery.
- **Negative:** [shared negative] close-up faces, graphic injury, gore, camp, barbed wire, soldiers herding people, dramatic spectacle.

### 5.10 UN / international observation (`event_un_presence.webp`)
- **Maps to event families:** `diplomacy_un_safe_areas`, `bihac_5th_corps_1994_response` and other UNPROFOR-context events; reusable for any UN-presence / safe-area event.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a white armoured vehicle and an observation post on a damaged Bosnian road, sandbags and a watchtower, a flag pole with an unreadable pale flag hanging limp, cold overcast light — the limited, watching international presence. Documentary, sober, slightly futile in mood. No legible UN markings, no faces, no readable text.
- **Negative:** [shared negative] readable UN logo, heroic peacekeepers, bright colour, action scene, identifiable faces.

### 5.11 Besieged-city texture (NON-graphic) (`event_siege_city.webp`)
- **Maps to event families:** siege / shelling context events (the city-under-siege texture, NOT the Markale shelling itself, which is §6); reusable for siege-condition events.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a wide view of a besieged Bosnian city: shell-pocked apartment blocks, plastic sheeting over blown-out windows, a thin column of smoke on the skyline at distance, empty streets, grey winter light — endurance under siege, the daily texture of the war. No bodies, no people in close-up, no graphic content, no readable text.
- **Negative:** [shared negative] bodies, gore, identifiable casualties, dramatic explosion in foreground, bright colour, readable signage.

### 5.12 Patron / foreign-backing meeting (`event_patron_relations.webp`)
- **Maps to event families:** `rs_belgrade_*`, `hrhb_zagreb_*`, `hrhb_hv_support_*`, `rbih_nato_comply/defy`, `rs_holbrooke_*`; reusable for any patron-relationship / external-backer event.
- **Surface:** `EventModal` image slot.
- **Format:** 800×450 WebP.
- **Prompt:** [shared prefix] a closed-door meeting between a wartime delegation and a foreign patron: two sets of chairs across a small table in a dim private office, a telephone with an international line, an unmarked map fragment, cigarette smoke, a single window — the quiet dependency on an outside backer. Figures only as out-of-focus silhouettes, no faces. No readable text, no legible flags.
- **Negative:** [shared negative] identifiable named leaders, legible flags, readable documents, bright colour, public ceremony.

---

# §6 DEFERRED — OWNER SIGN-OFF REQUIRED

The following assets are §6 (owner-gated, sensitive camp/atrocity/enclave-fall/decision-header content). **No generation prompts are authored for these.** They are listed ONLY to confirm they exist in the art surface and are deferred to owner §6 sign-off:

1. **Detention camps** — Omarska, Keraterm, Trnopolje (and any camp codex essay header).
2. **Srebrenica fall** (July 1995) — `srebrenica_falls_1995` event still / codex header.
3. **Žepa fall** (1995) — `zepa_falls_1995` event still / codex header.
4. **Ahmići massacre** — Central Bosnia atrocity still / codex header.
5. **Markale market shelling** — the shelling act itself (the generic besieged-city texture in 5.11 is NON-§6 and does NOT depict Markale).
6. **Drina valley executions** — execution / mass-grave imagery.
7. **The enclave OVERRUN / CONTAIN decision header** — the presidential moral-choice header art for the never-fell-enclave overrun decision.
8. **Any camp / atrocity codex essay header** — the 13 uniexed deposit essays (Foča, Višegrad, Prijedor, Zvornik 1992, etc.) and any future atrocity codex headers.

These require explicit owner + §6 sign-off before any prompt is authored or any image generated.

---

# Summary

| Category | Prompts authored |
|---|---:|
| 1. Peace-plan maps | 5 |
| 2. Dayton endgame / verdict backgrounds | 4 |
| 3. Command-card fallback stills | 2 |
| 4. A4 onboarding teaching-deck imagery | 8 |
| 5. NON-§6 event stills | 12 |
| **Total NON-§6 prompts** | **31** |
| §6 prompts authored | **0** (8 items deferred, listed only) |

All prompts are documentary-realism (war-correspondent photograph aesthetic, except Category 1's neutral cartographic style), explicitly no oil-paint / no sepia / no dramatic-painting. Filenames/keys match the live resolvers (`presidentialCommandArt`, `directiveActArt`, `EventDisplayData.image`, and the strategy doc's `event_{id}` / `plan_{id}` / `verdict_{faction}` conventions). Generation happens after owner review.
