# Visual Asset Brief — Gemini Pro Image Generation

**Purpose:** Consolidated prompt guide for generating all visual assets needed for AWWV. Sorted by priority. All assets use WebP format. All are optional — the game runs with gradient/silhouette placeholders.

**Drop location:** Generated images go into `src/ui/map/assets/` or `src/ui/warroom/assets/` subdirectories. The UI picks them up automatically when the file exists.

---

## Art Direction (Global)

**Style:** Photorealistic oil painting with slight desaturation. Think war photography processed through a painter's eye — gritty, somber, documentary. NOT stylized, NOT cartoon, NOT AI-generic glossy. The Bosnian War was fought in recognizable European cities and forests, not fantasy landscapes.

**Color palette:** Muted earth tones. Olive drab, concrete grey, burnt umber, winter white. Occasional sharp color for fire, blood, or UN blue. Sky is usually overcast — this is Bosnia, not the Mediterranean.

**Atmosphere:** Heavy, oppressive, claustrophobic. Even outdoor scenes feel enclosed — mountains close in, buildings crowd, smoke limits visibility. Light comes through clouds, through broken windows, through gaps in rubble.

**People:** When shown, they should look exhausted, determined, or afraid — never heroic-poster-style. Uniforms are mismatched (especially ARBiH). Equipment is a mix of JNA surplus, civilian clothes, and whatever was available.

**Architecture:** Recognizable Bosnian: Ottoman-era stone buildings, Yugoslav-era concrete apartment blocks, minarets alongside church steeples. Rooftops damaged by shelling. Sandbags and makeshift barricades.

**Text on images:** NONE. Never burn text into the image. The UI overlays titles.

---

## Priority 1 — Commander Portraits (10 images)

**Dimensions:** 256x320px WebP
**Drop path:** `src/ui/warroom/assets/officers/{officer_id}.webp`
**Used by:** `OfficerProfile` component, corps panel, operation briefing modal

These are the most visible assets — shown every time the player opens a corps panel or plans an operation. High impact, low count.

**Style:** Head-and-shoulders portrait, 3/4 view, military uniform or field dress. Background: blurred field/office environment matching the officer's role. Lighting: dramatic side-light, documentary photography feel. Expression: serious, commanding — not posed or smiling.

**IMPORTANT:** These are real historical figures. Base likeness on available photographs where possible, but do NOT attempt photorealistic recreation — use the photo as reference for build, age, and bearing, then paint in the oil-painting style described above.

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
| 1 | **April 1992 start** | apr1992 | A Bosnian city at the moment war begins. Barricades across a boulevard. A column of JNA APCs withdrawing past anxious civilians. Smoke rising from a distant neighborhood. Spring — trees budding, but the mood is winter. Sarajevo or Mostar feel. |
| 2 | **January 1993** | jan1993 | Deep winter in Bosnia. Snow-covered trenches on a hillside overlooking a valley town. Soldiers hunched against the cold, breath visible. The front has stabilized — this is the war of position. Distant artillery smoke against grey sky. |
| 3 | **March 1994** | mar1994 | Aftermath of the Markale massacre. A destroyed market square. Emergency workers. International press. UN vehicles. The moment that changed everything — NATO intervention looming. Urban devastation. |
| 4 | **January 1995** | jan1995 | Late war. An ARBiH column marching through a forest road. Better equipped than 1992 — actual uniforms, some vehicles. Mud season. The army that started with hunting rifles now has artillery. Quiet determination before the final offensives. |

---

## Priority 3 — Peace→War Transition Background (1 image)

**Dimensions:** 1920x1080px WebP
**Drop path:** `src/ui/warroom/assets/transition_peace_war.webp`
**Used by:** Full-screen transition when game shifts from peace to war phase

**Prompt:** A Bosnian city street at the exact moment of transformation. Left side: normal life — a cafe with patrons, a tram, people walking. Right side: the same street but barricades are going up, windows are being sandbagged, a sniper position is being prepared on a balcony. The transition is a gradient — normalcy dissolving into war. Color shifts from warm (left) to cold desaturated (right). Spring 1992 — the last day of peace.

---

## Priority 4 — Peace Plan Maps (3 images)

**Dimensions:** 600x400px WebP
**Drop path:** `src/ui/warroom/assets/peace_plans/{plan_id}.webp`
**Used by:** Diplomatic event modals (Vance-Owen, Owen-Stoltenberg, Contact Group)

**Note:** These CAN be programmatically generated as choropleths from partition data. Artistic versions are nicer but not essential.

**Style:** Clean cartographic style — like a newspaper infographic from the 1990s. Bosnia-Herzegovina outline with proposed ethnic partition colored: RS=blue, RBiH=green, HRHB=red (or period-appropriate colors). Major cities labeled. Rivers and roads lightly sketched. Title bar at top.

| # | Plan | Prompt |
|---|------|--------|
| 1 | **Vance-Owen Plan** | 10 semi-autonomous provinces. Complex patchwork. Each province colored by intended majority ethnicity. Sarajevo as separate district. The plan that failed. |
| 2 | **Owen-Stoltenberg Plan** | Three ethnic republics. Simpler partition — large contiguous blocks. RS gets ~52%, RBiH gets ~30%, HRHB gets ~18%. Srebrenica as isolated enclave. |
| 3 | **Contact Group Plan** | 51/49 split — Federation (RBiH+HRHB) 51%, RS 49%. The template for Dayton. Clean two-way division. |

---

## Priority 5 — Event Illustrations (39 images — LOW priority)

**Dimensions:** 800x450px WebP
**Drop path:** `src/ui/map/assets/events/{event_id}.webp`
**Used by:** `EventModal.tsx` — shown when events fire during gameplay

**Placeholder works well** — the type-colored gradient with event headline is clean and functional. These images are nice-to-have but the game doesn't suffer without them.

**Style:** Documentary vignette — a single powerful image that captures the essence of the event. Less detailed than portraits or briefings. More like a news photo with painterly processing. Dark vignette edges.

### 1992 Events (18)

| Event | Prompt |
|-------|--------|
| battle_of_the_barracks_sarajevo | JNA tanks surrounded by civilians and irregular fighters in a Sarajevo street. Tense standoff. Spring. |
| battle_of_the_barracks_tuzla | JNA column ambushed on a road. Smoke, confusion. The Brčanska Malta incident. |
| battle_of_the_barracks_zenica | Workers and militia surrounding a JNA barracks compound. Negotiations at the gate. |
| battle_of_the_barracks_visoko | Smaller barracks scene — rural setting, improvised barricades. |
| arms_embargo_impact_1992 | Empty weapons racks. ARBiH soldiers with hunting rifles and a single Kalashnikov between them. Desperation. |
| jna_withdrawal_1992 | Long column of JNA vehicles leaving through a mountain pass. Watching Bosnians — relief and dread. |
| sarajevo_siege_begins_1992 | Sniper Alley — an empty boulevard with bullet holes in buildings. A single person sprinting across. |
| mostar_liberation_1992 | The old bridge (Stari Most) still standing. HVO and ARBiH fighters together (they're still allies). Celebration. |
| srebrenica_enclave_forms_1992 | Refugees flooding into a small town. Overcrowded. Forest hills surrounding. Enclave forming. |
| posavina_corridor_fighting_1992 | Tank battle on flat Posavina farmland. VRS pushing through. Burning haystacks, tractors. |
| drina_valley_ethnic_cleansing_1992 | Columns of refugees on a road. Burning villages on hillsides behind them. Eastern Bosnia. |
| concentration_camps_revealed_1992 | Behind barbed wire — emaciated men. The image that shocked the world (Omarska/Trnopolje). Journalistic. |
| london_conference_1992 | Diplomats at a conference table. Maps of Bosnia. Tension. The gap between suits and the war. |
| bihac_isolation_deepens_1992 | The Bihać pocket from above — a valley surrounded by hostile territory. Isolated. A small airstrip. |
| jajce_falls_1992 | Refugees fleeing a medieval fortress town. VRS flags on the castle. Autumn. |
| hvo_arbih_tensions_rise_1992 | HVO and ARBiH soldiers at a checkpoint. Suspicious glances. Weapons not pointed but ready. Uneasy. |
| graz_accords | Diplomats shaking hands. A ceasefire line on a map. Both sides know it won't hold. |
| un_convoys_begin_1992 | White UN trucks on a mountain road. Escorted by APCs. A Bosnian winter. |

### 1993 Events (13)

| Event | Prompt |
|-------|--------|
| gornji_vakuf_clashes_1993 | Street fighting in a small Bosnian town. HVO and ARBiH — former allies now shooting at each other. Confusion, betrayal. |
| vance_owen_plan_1993 | A peace plan map being presented. Diplomats. The map that started the Croat-Bosniak war. |
| croat_bosniak_war_begins_1993 | Three-way front lines on a map of central Bosnia. Overlapping arrows. Chaos. |
| ahmici_massacre_1993 | A burned village. Smoke still rising. A child's bicycle in rubble. Dawn light. The horror of Ahmici. |
| srebrenica_shelling_1993 | Artillery impacts on a crowded town. People running. UN white vehicles parked helplessly. |
| un_safe_areas_declared_1993 | A UN flag planted on a hillside overlooking a Bosnian town. The promise. Blue helmets with binoculars. |
| east_mostar_siege_1993 | The east bank of Mostar — narrow streets, damaged Ottoman buildings. Looking west across the Neretva at HVO positions. Siege. |
| central_bosnia_fighting_1993 | Three-way checkpoint — VRS, HVO, ARBiH flags all visible from one intersection. The impossible geometry of the war. |
| markale_area_shelling_1993 | A marketplace with shell crater. Aftermath. Medical workers. The image that preceded NATO intervention. |
| owen_stoltenberg_plan_1993 | Another peace plan, another conference room. Weariness on the diplomats' faces. Maps covered in colored lines. |
| operation_neretva_93_1993 | ARBiH soldiers advancing along the Neretva river valley. Rocky terrain, Mediterranean vegetation. Determined. |
| abdic_apwb_declared_1993 | Fikret Abdić addressing a crowd in Velika Kladuša. Populist energy. The Bihać pocket splitting. |
| mostar_bridge_destroyed_1993 | The moment after Stari Most collapses into the Neretva. Dust and shock. The empty space where 400 years of history stood. |

### 1994 Events (8)

| Event | Prompt |
|-------|--------|
| markale_massacre_1994 | The Markale market aftermath. Emergency response. International cameras. The tipping point. |
| nato_ultimatum_sarajevo_1994 | NATO jets over Bosnian mountains. The sky is no longer safe for Serb forces. |
| nato_shoots_down_planes_1994 | Burning wreckage of shot-down aircraft on a snowy field. NATO's first combat since founding. |
| washington_agreement_1994 | Signing ceremony. Bosniak and Croat leaders. American mediators. Handshake that ended the war-within-a-war. |
| gorazde_crisis_1994 | The Goražde enclave under attack. Drina river valley. VRS armor on surrounding hills. UN impotence. |
| bihac_crisis_1994 | The Bihać pocket's darkest hour. Attacks from four directions — VRS, Abdić, RSK. 5th Corps surrounded. |
| contact_group_plan_1994 | Yet another map. 51/49. The template. Simpler lines this time. |
| anti_sniping_agreement_sarajevo_1994 | Sarajevo streets with anti-sniper barriers. UN-brokered. Cautious hope. People walking but hunched. |

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
