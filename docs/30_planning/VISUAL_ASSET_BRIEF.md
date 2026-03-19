# Visual Asset Brief — Gemini Pro Image Generation

**Purpose:** Consolidated prompt guide for generating all visual assets needed for AWWV. Sorted by priority. All assets use WebP format. All are optional — the game runs with gradient/silhouette placeholders.

**Drop location:** Generated images go into `src/ui/map/assets/` or `src/ui/warroom/assets/` subdirectories. The UI picks them up automatically when the file exists.

---

## Art Direction (Global)

**Style:** Cinematic documentary. Direct, descriptive scene composition with heavy atmosphere. Like the opening frame of a war documentary. NOT cartoon, NOT stylized, NOT AI-generic glossy.

**Color palette:** Muted earth tones. Olive drab, concrete grey, burnt umber, winter white. Occasional sharp color for fire, blood, or UN blue. Sky is usually overcast — this is Bosnia, not the Mediterranean.

**Atmosphere:** Heavy, oppressive, claustrophobic. Even outdoor scenes feel enclosed — mountains close in, buildings crowd, smoke limits visibility. Light comes through clouds, through broken windows, through gaps in rubble.

**People:** Avoid showing people entirely where possible. When figures are necessary for scale or context, show them from behind, in silhouette, at extreme distance, or cropped — NEVER showing a face. No identifiable individuals. Generic mixed military clothing only.

**Architecture:** Recognizable Bosnian: Ottoman-era stone buildings, Yugoslav-era concrete apartment blocks, minarets alongside church steeples. Rooftops damaged by shelling. Sandbags and makeshift barricades.

**How these fit the UI:** Event images appear inside dark GlassPanel modals. Scenario briefings are full-bleed behind dark text overlays. The muted earth-tone palette blends with the existing UI chrome (panel-bg #1c1a17, accent-gold #c4a35a, paper #f0e8d8).

**Text on images:** NONE. Never burn text into the image. The UI overlays titles.

**NEUTRALITY RULES (MANDATORY):**
- **NO FLAGS.** No faction flags, no national flags, no political symbols of any side. Not on uniforms, not on buildings, not on vehicles. The game presents all three sides without endorsement.
- **NO FACTION IDENTIFICATION on people.** Soldiers should wear generic/mixed military clothing. Do not depict identifiable faction-specific insignia, patches, or uniforms. The player assigns meaning through gameplay, not through art.
- **NO EDITORIAL FRAMING.** Prompts describe what is VISIBLE, not who is right or wrong. "A besieged city" not "the aggressors surround the city." "Soldiers advancing" not "liberators advancing."
- **NO FACES.** No recognizable human faces in any image. Show people from behind, in silhouette, at distance, or cropped above/below the face. Hands, boots, helmets, backs — but never a face. This avoids likeness issues entirely.
- **SENSITIVE CONTENT:** War crimes, massacres, and atrocities are historical facts. Depict aftermath and consequences (destroyed buildings, refugees, empty streets) — never the act itself. No graphic violence, no identifiable victims.

---

## Priority 1 — Commander Portraits (10 images)

**Dimensions:** 256x320px WebP
**Drop path:** `src/ui/warroom/assets/officers/{officer_id}.webp`
**Used by:** `OfficerProfile` component, corps panel, operation briefing modal

These are the most visible assets — shown every time the player opens a corps panel or plans an operation. High impact, low count.

**Style:** Processed real photography — NOT AI-generated. Source actual press/ICTY photographs of each officer, then apply a consistent artistic filter: high-contrast duotone, halftone newspaper print, or posterized/threshold treatment. The result should look like a 1990s newspaper clipping or intelligence dossier photo. Real photos = real likeness = no uncanny valley.

**EXCEPTION TO NO-FACES RULE:** Portraits are the ONE category where faces are shown — real photographs, artistically processed.

**Process:**
1. Source photo in `src/ui/map/assets/officers/source/{officer_id}_source.jpg`
2. Process via Gemini Pro (upload + request duotone/halftone filter) or manual editing
3. Target palette: warm brown/gold tones matching game UI (#c4a35a / #1c1a17)
4. Export at 256x320 WebP to `src/ui/warroom/assets/officers/{officer_id}.webp`
5. Crop tight to head/shoulders — no flags, no patches

**Source photos downloaded** (in `src/ui/map/assets/officers/source/`):
- ratko_mladic (376x500), naser_oric (331x393), rasim_delic (350x485)
- slobodan_praljak (960x1381), manojlo_milovanovic (960x1358, grayscale)
- tihomir_blaskic (120x130 — needs better source)

**Still need manual sourcing**: atif_dudakovic, momir_talic, sefer_halilovic, mehmed_alagic

### The 10 Priority Portraits

| # | Officer | Faction | Prompt Notes |
|---|---------|---------|-------------|
| 1 | **Ratko Mladić** | VRS | Stocky build, round face, military cap. Field uniform. Confident, aggressive bearing. Often photographed in the field with troops. Age ~50. |
| 2 | **Atif Dudaković** | ARBiH | Lean, intense eyes. 5th Corps commander — the defender of Bihać. Field uniform, often without insignia. Enclave commander: determined, defiant. Age ~40s. |
| 3 | **Tihomir Blaškić** | HVO | Central Bosnia OZ commander. Younger than most (30s). Clean-cut, HVO uniform. Convicted at ICTY. Professional military bearing. |
| 4 | **Naser Orić** | ARBiH | Srebrenica defender. Muscular build, sometimes in civilian clothes with military vest. Guerrilla commander. Fierce, street-fighter energy. Age ~30s. |
| 5 | **Momir Talić** | VRS | 1st Krajina Corps commander. Senior officer, experienced bearing. Standard VRS uniform with general's insignia. Methodical, professional. Age ~50s. |
| 6 | **Sefer Halilović** | ARBiH | First ARBiH chief of staff. Slim build, mustache. Struggled to build an army from nothing. Stressed, overworked appearance. Field dress. Age ~40s. |
| 7 | **Rasim Delić** | ARBiH | Replaced Halilović. More composed, professional military bearing. JNA-trained. Standard ARBiH uniform (when they had standards). Age ~40s. |
| 8 | **Mehmed Alagić** | ARBiH | 3rd Corps (later 7th Corps). Aggressive, capable. Field commander. Mixed uniform — characteristic of ARBiH improvisation. Age ~40s. |
| 9 | **Manojlo Milovanović** | VRS | VRS chief of staff. Mladić's right hand. Tall, thin, intellectual appearance. Staff officer — maps and planning, not field. Age ~50s. |
| 10 | **Slobodan Praljak** | HVO | Theatrical personality, former theater director turned general. Flamboyant compared to other commanders. Age ~50s. |

---

## Priority 2 — Scenario Briefing Images (4 images)

**Dimensions:** 1280x720px WebP
**Drop path:** `src/ui/warroom/assets/scenarios/{scenario_id}.webp`
**Used by:** Scenario selection screen, game start briefing

These set the mood for each scenario start date. Shown once per game session but first-impression critical.

**Style:** Wide establishing shot, cinematic aspect ratio, heavy atmosphere. Like the opening frame of a war documentary.

| # | Scenario | Date | Prompt |
|---|----------|------|--------|
| 1 | **April 1992 start** | apr1992 | 1280x720 WebP. Cinematic documentary style, wide establishing shot, heavy atmosphere, muted earth tones. A Bosnian city boulevard at the moment war begins. Barricades of furniture and sandbags across a tram line. Armored vehicles halted in the distance. Smoke rising from a neighborhood beyond rooftops. Spring — trees budding against an overcast sky. Muted earth tones, concrete grey. No people, no flags, no insignia. |
| 2 | **January 1993** | jan1993 | 1280x720 WebP. Cinematic documentary style, wide establishing shot, heavy atmosphere, muted earth tones. Deep winter in Bosnia. Snow-covered trenches on a hillside overlooking a valley town. Empty positions — helmets on stakes, ammunition boxes, a field telephone. The front stabilized into static lines. Distant artillery smoke against grey sky. No people, no flags, no insignia. |
| 3 | **March 1994** | mar1994 | 1280x720 WebP. Cinematic documentary style, wide establishing shot, heavy atmosphere, muted earth tones. A destroyed open-air market square. Shell crater in the center, scattered produce, shredded market umbrellas. Press cameras on tripods (unmanned). White UN vehicles parked nearby. Urban devastation. Overcast. No people, no flags, no insignia. |
| 4 | **January 1995** | jan1995 | 1280x720 WebP. Cinematic documentary style, wide establishing shot, heavy atmosphere, muted earth tones. Late war exhaustion. A scarred Bosnian valley — trenches on both hillsides, a destroyed bridge in the middle, shell craters in frozen fields. Three years of war visible in the landscape. Winter fog, muted tones. No people, no flags, no insignia. |

---

## Priority 3 — Peace→War Transition Background (1 image)

**Dimensions:** 1920x1080px WebP
**Drop path:** `src/ui/warroom/assets/transition_peace_war.webp`
**Used by:** Full-screen transition when game shifts from peace to war phase

**Prompt:** 1920x1080 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A Bosnian city street showing the transformation from peace to war. Left side: a cafe with empty chairs, an intact tram, flower boxes on balconies — warm color tones. Right side: the same street but barricades of sandbags and furniture block the road, windows are taped and sandbagged, a balcony has been fortified — cold desaturated tones. The transition is a gradient across the image — normalcy dissolving into war. Spring 1992. No people visible, no flags, no insignia — the street tells the story through objects.

---

## Priority 4 — Peace Plan Maps (3 images)

**Dimensions:** 600x400px WebP
**Drop path:** `src/ui/warroom/assets/peace_plans/{plan_id}.webp`
**Used by:** Diplomatic event modals (Vance-Owen, Owen-Stoltenberg, Contact Group)

**Gemini CANNOT generate these** — they require exact historical territorial boundaries. Two viable approaches:

**Option A: Programmatic generation (RECOMMENDED).** We already have BiH municipality polygons in `data/derived/operational/operational_settlements.geojson`. Write a Node script that:
1. Loads the municipality polygons
2. Colors each municipality by its proposed assignment in each peace plan
3. Renders to a static 600x400 canvas/SVG with the game's color palette
4. Overlays major city labels (Sarajevo, Banja Luka, Mostar, Tuzla, Bihac)
5. Exports as WebP

Data needed per plan (municipality → proposed controlling entity):
- **Vance-Owen:** 10 provinces, each municipality assigned to one. Wikipedia has the full province list.
- **Owen-Stoltenberg:** 3 republics, each municipality assigned. Simpler.
- **Contact Group / Dayton:** 2 entities (Federation 51%, RS 49%), municipality-level boundaries well documented.

**Option B: Source historical maps.** Academic papers, ICTY exhibits, and UN documents contain period maps of each plan. Source these and process like officer photos (crop, recolor to match game palette, overlay in UI). The UN Cartographic Section published official maps for each plan.

| # | Plan | Data Source |
|---|------|------------|
| 1 | **Vance-Owen Plan** | 10 provinces: Wikipedia "Vance-Owen Peace Plan" has the full municipality→province mapping. Color by proposed majority: Bosniak (green), Serb (red), Croat (blue), Sarajevo (neutral). |
| 2 | **Owen-Stoltenberg Plan** | 3 republics: Republika Srpska ~52%, Bosniak republic ~30%, Croat republic ~18%. Municipality boundaries from ICTY exhibits. |
| 3 | **Contact Group / Dayton** | 51/49 Federation/RS split. Inter-Entity Boundary Line (IEBL) is well-documented. Municipality assignments from OHR. |

---

## Priority 5 — Event Illustrations (39 images — LOW priority)

**Dimensions:** 800x450px WebP
**Drop path:** `src/ui/map/assets/events/{event_id}.webp`
**Used by:** `EventModal.tsx` — shown when events fire during gameplay

**Placeholder works well** — the type-colored gradient with event headline is clean and functional. These images are nice-to-have but the game doesn't suffer without them.

**Style:** Documentary vignette — a single powerful image that captures the essence of the event. More like a news photo with painterly processing. Dark vignette edges.

**Each prompt below is STANDALONE** — includes dimensions, style, and mood. Copy-paste directly into Gemini.

### 1992 Events (18)

| Event | Prompt |
|-------|--------|
| battle_of_the_barracks_sarajevo | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Armored vehicles halted on a Sarajevo boulevard. Improvised barricades of furniture and sandbags block the road. Tense spring morning, overcast. No people visible, no flags, no insignia — just the standoff frozen in objects. Muted earth tones, concrete grey, spring green budding on trees. |
| battle_of_the_barracks_tuzla | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A military convoy halted on a road, smoke rising from the lead vehicle. Scattered personal effects on the asphalt. Confusion captured in debris. Overcast spring sky. No people, no flags, no insignia. Muted earth tones. |
| battle_of_the_barracks_zenica | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A military compound gate, closed, seen from outside through barbed wire. Sandbags piled hastily. Civilian cars parked haphazardly nearby. Spring, overcast. No people, no flags, no insignia. |
| battle_of_the_barracks_visoko | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A small rural military barracks compound — concrete walls, guard towers. Improvised barricades of logs and tractors at the entrance. Spring countryside, Bosnian hills. No people, no flags. |
| arms_embargo_impact_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Empty weapon racks in a dimly lit basement armory. A single hunting rifle propped against the wall. Boxes of mismatched ammunition. Desperation told through objects. Warm tungsten light. No people, no flags, no insignia. |
| jna_withdrawal_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A long column of military vehicles on a Bosnian mountain road, seen from above. The convoy stretching around switchbacks. Empty landscape. Spring. No people visible, no flags, no insignia. |
| sarajevo_siege_begins_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. An empty city boulevard with bullet-pocked building facades. Tram tracks running through the middle. A single abandoned shoe at the crossing. Overcast. No people, no flags. Concrete grey, muted. |
| mostar_liberation_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. The Stari Most (old bridge) intact, spanning the emerald Neretva river. Sunlight on the Ottoman stone. The city behind it — damaged but standing. A moment of calm. No people, no flags, no insignia. |
| srebrenica_enclave_forms_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A small Bosnian town from above — forested hills closing in on all sides. Roads clogged with abandoned vehicles and belongings. Overcrowded rooftops. Overcast. No people visible, no flags. |
| posavina_corridor_fighting_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Flat farmland with tank tracks cutting through plowed fields. A burning haystack. Destroyed tractor. The Posavina plain scarred by armored movement. Overcast sky. No people, no flags, no insignia. |
| drina_valley_ethnic_cleansing_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A mountain road in eastern Bosnia. Abandoned belongings — suitcases, blankets, a child's toy — scattered along the roadside. Burning village on a distant hillside. Overcast. No people, no flags. |
| concentration_camps_revealed_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Barbed wire fence in harsh flat daylight. Empty concrete yard behind it. A single water bucket. Industrial buildings repurposed as a compound. Journalistic framing. No people, no flags, no insignia. |
| london_conference_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A conference table from above — maps of Bosnia spread across it, colored markers, diplomatic folders, coffee cups. No faces, no people — just the documents and the problem. Warm indoor light. |
| bihac_isolation_deepens_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Aerial view of a valley pocket — a small airstrip, a river, mountains on all sides. Roads leading out disappear into hostile territory. Isolation captured from altitude. Overcast. No people, no flags. |
| jajce_falls_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A medieval Bosnian fortress town in autumn. A waterfall between cliffs. Smoke rising from the old quarter. Abandoned vehicles on the bridge. Autumn foliage. No people, no flags, no insignia. |
| hvo_arbih_tensions_rise_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A checkpoint on a Bosnian road — two sets of sandbag positions facing each other across the road. Weapons laid on sandbags pointed in both directions. No people visible, no flags, no insignia. Uneasy geometry. Overcast. |
| graz_accords | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A ceasefire line drawn on a military map with grease pencil. Two different colored markers meeting at a boundary. Diplomatic papers and coffee cups around the edge of the table. Warm indoor light. No people, no flags. |
| un_convoys_begin_1992 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. White UN-marked trucks on a snow-covered Bosnian mountain road. Armored escort vehicles. The convoy winding through a winter landscape. Overcast grey sky. No people visible, no faction flags. |

### 1993 Events (13)

| Event | Prompt |
|-------|--------|
| gornji_vakuf_clashes_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A small Bosnian town street — bullet holes on both sides of the road. Shell damage to a shop front. Broken glass, spent casings on pavement. Two sides of the same street destroyed by each other. Overcast winter. No people, no flags, no insignia. |
| vance_owen_plan_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A peace plan map spread on a conference table — Bosnia divided into colored provinces. Diplomatic pens, folders, markers on boundaries. Warm indoor light. No faces, no people — just the map and the problem. |
| croat_bosniak_war_begins_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A military map of central Bosnia covered in overlapping front line markings — three colors of grease pencil crossing over each other. The impossible geometry of a three-way war. Warm desk-lamp light. No people, no flags. |
| ahmici_massacre_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A burned village at dawn. Smoke still rising from roofless stone houses. A child's bicycle in the rubble of a doorway. Empty, silent aftermath. Muted tones, early morning light. No people, no flags, no insignia. |
| srebrenica_shelling_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Shell craters in a town square. Shattered windows. White UN vehicles parked behind a building, untouched amid the damage. Helplessness captured in architecture. Overcast. No people, no flags. |
| un_safe_areas_declared_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A UN observation post on a hillside — sandbags, blue-painted barriers, binoculars on a tripod pointing down at a Bosnian town below. The promise of protection. Overcast. No people, no faction flags. |
| east_mostar_siege_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Narrow streets of old Mostar — Ottoman stone buildings with shell damage. The Neretva river visible at the end of the street. A divided city. Warm Mediterranean light filtering through smoke. No people, no flags, no insignia. |
| central_bosnia_fighting_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. An intersection in a Bosnian town with three different sets of barricades pointing in three different directions. Sandbags, concrete barriers, burned-out vehicles. Three-way war captured in one frame. Overcast. No people, no flags, no insignia. |
| markale_area_shelling_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. An open-air marketplace with a shell crater in the center. Scattered produce, overturned stalls, shredded market umbrellas. Aftermath. No people, no flags. Overcast urban light. |
| owen_stoltenberg_plan_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A conference room table with maps covered in colored territorial lines. Coffee cups, diplomatic folders, crumpled papers, overflowing ashtray. Diplomatic exhaustion in objects. Warm indoor light. No faces, no people. |
| operation_neretva_93_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. The Neretva river valley from above — rocky karst terrain, Mediterranean scrub vegetation. Military vehicle tracks on a dirt road winding along the river. The landscape of an offensive. No people, no flags, no insignia. |
| abdic_apwb_declared_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A public square in a small Bosnian town — a makeshift podium, loudspeakers on poles, scattered leaflets on the ground. The setup of a political rally, before or after the crowd. No people, no flags. Overcast. |
| mostar_bridge_destroyed_1993 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. The empty space where Stari Most stood — two stone abutments reaching toward nothing over the emerald Neretva. Dust still settling. Four hundred years of history in the gap. Overcast light. No people. |

### 1994 Events (8)

| Event | Prompt |
|-------|--------|
| markale_massacre_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. The Markale market square — a shell crater surrounded by scattered market goods. Press cameras on tripods (unmanned). Emergency tape cordoning the area. Overcast urban light. No people, no flags, no insignia. |
| nato_ultimatum_sarajevo_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Military jets seen from below against a Bosnian mountain sky. Contrails crossing over a besieged valley. The geometry of intervention from above. Clear cold sky. No people, no flags, no insignia. |
| nato_shoots_down_planes_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Burning aircraft wreckage on a snowy Bosnian field. Black smoke against white snow. Scattered debris trail. Winter. No people, no flags, no insignia. |
| washington_agreement_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A signing table — two documents, two pens, two chairs pulled back. Warm indoor light. Diplomatic formality captured in empty furniture. No people, no faces, no faction flags. |
| gorazde_crisis_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A river valley enclave from above — a small town along the Drina, armored vehicles visible as specks on surrounding hillsides. Encirclement seen from altitude. Overcast. No people, no flags, no insignia. |
| bihac_crisis_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A military map of the Bihac valley — attack arrows drawn from four directions converging on a pocket. Grease pencil on acetate overlay. Warm desk-lamp light. The most dangerous moment for an enclave. No people, no flags. |
| contact_group_plan_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. A clean cartographic map of Bosnia with a single bold line dividing it 51/49. Two colors. Simpler than previous plans. The template for Dayton. Warm indoor light on paper. No people, no flags. |
| anti_sniping_agreement_sarajevo_1994 | 800x450 WebP. Cinematic documentary style, heavy atmosphere, muted earth tones. Sarajevo streets with anti-sniper barriers — corrugated metal sheets and shipping containers placed across intersections. A cautious city emerging. Overcast light. No people, no flags, no insignia. |

---

## Priority 6 — Economy Assets (optional, 10 images)

**Mostly programmatic** — the economy panel is data-driven (bars, numbers). Images are garnish.

| Asset | Dimensions | Prompt |
|-------|-----------|--------|
| 7x factory illustrations | 200x150 WebP | Industrial buildings in varying states of repair. Zenica steelworks (large, smoking). Small arms workshop (basement, improvised). Ammunition factory (sandbagged). etc. |
| 3x smuggling route icons | 64x64 SVG | **Generate programmatically** — dashed arrow line, no image needed. |

---

## Delivery Checklist

When generating, follow this order:
1. [ ] 10 commander portraits (P1)
2. [ ] 4 scenario briefing images (P2)
3. [ ] 1 peace→war transition (P3)
4. [ ] 3 peace plan maps (P4)
5. [ ] 39 event illustrations (P5 — do in batches: 1992 first, then 1993, then 1994)
6. [ ] 7 factory illustrations (P6 — optional)

**Total: 64 images** (57 essential + 7 optional)

**Format:** All WebP, exact dimensions specified per category. Name files exactly as the `event_id` or `officer_id` — the UI loads by convention.
