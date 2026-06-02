# Command / Decision Card Art — Prompt Index & Style Canon (Handover)

**Date:** 2026-06-02
**Status of this doc:** CORRECTED. An earlier draft of this file invented a six-`cat_*` "command-strip" taxonomy and a "sepia/parchment" style. That was wrong — it ignored the owner-authored card families and prompts that already exist. This version is an index + style canon that points at the canonical source.

## Canonical prompt source

**`docs/plans/2026-05-24-gui-ai-asset-brief.md` → "Prompt Specs".**
That brief is the single source of truth for presidential card art: every card has a full Gemini prompt, a per-card **negative prompt**, exact pixel dimensions, and an exact drop path. Do not duplicate or re-author those prompts here — generate from the brief.

## Card inventory & generation status (as of 2026-06-02)

All cards in the brief's recommended set are **already generated and committed**:

| Asset | Dims | Path | Status |
|---|---|---|---|
| `hq_presidential_desk_1992.webp` | 2752×1536 | `src/ui/warroom/assets/` | ✅ generated |
| `decision_header_diplomacy.webp` | 1536×512 | `src/ui/map/assets/presidential_desk/decision_headers/` | ✅ |
| `decision_header_military_staff.webp` | 1536×512 | …/decision_headers/ | ✅ |
| `decision_header_intelligence.webp` | 1536×512 | …/decision_headers/ | ✅ |
| `decision_header_humanitarian_convoy.webp` | 1536×512 | …/decision_headers/ | ✅ |
| `decision_header_personnel.webp` | 1536×512 | …/decision_headers/ | ✅ |
| `decision_header_paramilitary.webp` | 1536×512 | …/decision_headers/ | ✅ |
| `decision_header_counter_offer.webp` | 1536×512 | …/decision_headers/ | ✅ |
| `packet_thumb_event_decision / peace_plan / reserve_request / officer_matter / paramilitary / intelligence / convoy .webp` | 640×480 | `…/presidential_desk/packet_thumbnails/` | ✅ all 7 |
| `consequence_negotiated_settlement / reserve_deployment / public_pressure / humanitarian_access / personnel_change .webp` | 1280×720 | `…/presidential_desk/consequence_stills/` | ✅ all 5 |

> If a NEW card is needed (a new decision family, a presidential-lever card, or art for the §9 command-strip surface), generate it to the **style canon below** and add a row here.

## Style canon (extracted from the brief — apply to any NEW card)

- **Tool:** Google Gemini image generation. Phrase as "Generate a `W x H` px image", export `.webp` (quality 80–88). Keep large `.png` sources out of git; commit only final `.webp`.
- **Register:** **1990s archival / documentary realism** of a Yugoslav-era wartime government office. Subdued, practical warm/amber + muted green-brown light. Cinematic but **not** glossy. NOT concept art, NOT 3D render, NOT propaganda poster, NOT sepia/parchment.
- **Subjects are objects, not people:** desks, folders, paper maps of Bosnia, radio handsets, lamps, paperclips. **No people, no faces, no hands.** Convey the decision family through the props on the desk.
- **Per-family object cue:** diplomacy = peace-proposal folder + territorial map; military = operational map + grease pencil + radio handset; intelligence = recon photos + redaction strips + magnifier; humanitarian = unlabeled route map + dashed checkpoints (bureaucratic/urgent, **not** heroic); personnel = blank tabbed dossier + **obscured** photo slip; paramilitary/internal-security = red-brown incident folder + municipal street-map fragment, **signals civilian danger without showing violence**; counter-offer = two proposal folders + Bosnia-like partition map under tracing paper.
- **Hard negatives (the hard-won lessons — keep per the brief's per-card lists):** no readable text/numbers/labels in any language; do NOT bake the literal words ("PERSONNEL", "SECRET", "TOP SECRET", "WARNING", "Aid Manifest", "manifest table", "checklist grid"); no faction insignia/flags with legible symbols; no real-person likenesses; no modern electronics (computers, CRT/LCD, keyboards, printers, phones, calculators, smartphones); no weapons/blood/gore/soldiers/action scenes; **no baked-in UI — no black/translucent panels, overlay boxes, card placeholders, HUD, menus, titles, badges**; no watermark/logo/signature.
- **Reserve quiet space for app overlay:** leave a calm darker band (lower third / left third, per card) so app-rendered title/badge/modal text stays legible. The image is an affordance enhancer, never the locator — every slot has a text-only fallback.
- **Tone:** sober, restrained, negative-sum. Consequence stills are **aftermath/memory** — quiet and resolved, never triumphant; show the empty table after the meeting, not the act.
- **Counter-offer / map pitfall:** the territorial map must read as **Bosnia/Balkan partition**, never a US/modern national map (a documented past failure).

## Standalone per-card prompts (one copy-paste block each)

Transcribed from the brief's "Prompt Specs", with each card's negative prompt folded inline so every block is self-contained. The brief remains authoritative — if these drift, the brief wins. All 20 are **already generated**; use these to regenerate/iterate.

### Desk background — `hq_presidential_desk_1992.webp` (2752×1536) → `src/ui/warroom/assets/`
```
Generate a 2752 x 1536 px image. Scene: early 1990s Balkan presidential office used as a wartime briefing room, large wooden desk with folders, paper maps of Bosnia and Herzegovina, radio set, ashtray, telephone, muted daylight through tall windows, documentary realism, subdued warm practical light, no people, no flags with legible symbols, no text, no modern computers, cinematic but not glossy. The left third of the image must be a clean, natural dark office wall or shadowed room area reserved for app-rendered UI overlays: no black rectangles, no translucent panels, no embedded UI shapes, no empty card placeholders, no fake interface elements. Keep the desk and key props concentrated in the center and lower-right. Keep the window side softly exposed but not blown out, with a gentle natural vignette so white/amber UI text remains legible if placed over the scene. No watermark or signature. NEGATIVE: fantasy, sci-fi, modern glass office, readable text, dramatic explosions, soldiers posing, propaganda poster, bright saturated colors, clean stock photo, black UI panels, transparent UI panels, overlay boxes, card placeholders, interface mockup, HUD, menu, dashboard, watermark, logo, signature, pasted border, fake text labels, overexposed window.
```

### Decision headers (1536×512) → `src/ui/map/assets/presidential_desk/decision_headers/`

**`decision_header_diplomacy.webp`**
```
Generate a 1536 x 512 px modal header strip. Scene: close-up of a diplomatic peace proposal folder on an old wooden desk, typed pages, colored territorial map partly visible but no readable labels, fountain pen, 1990s archival documentary style, restrained beige paper, soft side light, no people, no readable text. Keep the center-left calm enough for title text under a dark overlay. NEGATIVE: people, hands, readable text, labels, flags, insignia, modern electronics, UI overlay, black panel, watermark, signature, bright saturated colors, glossy 3D render.
```

**`decision_header_military_staff.webp`**
```
Generate a 1536 x 512 px modal header strip. Scene: military staff desk with operational map, grease pencil marks, folded field reports, radio handset, subdued green and amber light, 1990s Yugoslav-era office atmosphere, documentary realism, no soldiers, no readable text, no national insignia. Keep contrast restrained so white/amber modal text remains legible. NEGATIVE: people, soldiers, hands, readable text, numbers, place names, flags, insignia, modern computers, screens, keyboards, UI overlay, black panel, watermark, signature, bright saturated colors, glossy 3D render.
```

**`decision_header_intelligence.webp`**
```
Generate a 1536 x 512 px modal header strip. Scene: intelligence briefing file with black-and-white reconnaissance photos, redacted strips, paper clips, magnifying glass, low-key office lighting, 1990s archival realism, no readable text, no gore, no people. Leave a dark quiet band across the lower third for modal copy. NEGATIVE: people, faces, hands, readable text, codes, labels, gore, agency logos, flags, modern electronics, UI overlay, black panel, watermark, signature, bright saturated colors.
```

**`decision_header_humanitarian_convoy.webp`**
```
Generate a 1536 x 512 px modal header strip. Scene: humanitarian convoy route packet on a worn wooden desk: an unlabeled route map with dashed route line and checkpoints, blank folded paperwork, pencil, paper clips, weathered paper, muted daylight, documentary realism, no people. Do not include an aid manifest table, checklist grid, form title, numbers, stamps with readable symbols, logos, readable handwriting, readable labels, calculators, keyboards, or modern electronics. The image should feel bureaucratic and urgent, not heroic or action-oriented. Leave the left third visually quiet for modal title overlay. NEGATIVE: Aid Manifest, manifest table, checklist grid, readable text, readable handwriting, numbers, form fields, stamped logos, warning icons, calculator, keyboard, modern laptop, modern tablet, people, soldiers, vehicles, gore, dramatic action scene, UI overlay, black panel, watermark, signature.
```

**`decision_header_personnel.webp`**
```
Generate a 1536 x 512 px modal header strip. Scene: officer personnel dossier folder on a worn wooden desk, blank tabbed folder with no readable label, passport-style photograph area fully obscured by a plain black rectangle or paper slip, service-record papers with blurred/unreadable pseudo-text, brass desk lamp, pencil, paper clips, muted 1990s office setting, documentary realism, no people. Avoid medals, insignia, real-person likenesses, readable labels, readable classification stamps, readable handwriting, typed form fields, modern computer monitors, keyboards, printers, or obvious modern office equipment. NEGATIVE: PERSONNEL, SECRET, TOP SECRET, classified stamp, readable folder tab, readable labels, readable handwriting, readable typed text, numbers, forms with legible fields, real portrait, face, medals, insignia, modern computer, CRT monitor, printer, keyboard, UI overlay, black panel, watermark, signature.
```

**`decision_header_paramilitary.webp`**
```
Generate a 1536 x 512 px modal header strip. Scene: internal security case folder on a dark wooden desk, blank incident-report papers with blurred/unreadable pseudo-text, unlabeled municipal street-map fragment, plain red-brown folder, desk lamp, subdued red-brown and charcoal palette, 1990s documentary realism, no weapons in foreground, no people, no readable text, no insignia. The tone should signal political risk and civilian danger without showing violence. Do not include large warning stamps, caution labels, classification labels, readable headlines, logos, watermarks, or symbolic icons. Leave the left third visually quiet for modal title overlay. NEGATIVE: WARNING, WAR, CAUTION, DANGER, SECRET, TOP SECRET, readable text, readable labels, readable stamps, readable handwriting, large block letters, logo, watermark, signature, warning triangle, icon, insignia, weapons, blood, gore, soldiers, masked men, dramatic action scene, UI overlay, black panel.
```

**`decision_header_counter_offer.webp`**
```
Generate a 1536 x 512 px modal header strip. Scene: negotiation table detail with two blank proposal folders, crossed-out but unreadable pencil markings, a Bosnia-like territorial map under translucent tracing paper, coffee cup, pencil, muted office light, 1990s diplomatic documentary realism, no people, no flags, no readable text. The map must suggest Bosnia/Balkan partition lines, not the United States or any modern national map. Leave the left third as plain wood or shadowed paper for modal title overlay. Do not include any embedded title, subtitle, poster text, typography, UI mockup, or watermark. NEGATIVE: readable text, embedded title, subtitle, poster layout, typography, negotiation text, United States map, U.S. state map, modern national map, flags, logos, watermark, signature, UI overlay, black panel, people, hands, dramatic courtroom scene, clean stock photo, colorful infographic map.
```

### Packet thumbnails (640×480) → `src/ui/map/assets/presidential_desk/packet_thumbnails/`

> Shared negative folded into each: *readable text/numbers/labels, faction names, code names, insignia, flags, logos, watermarks, signatures, UI overlay, HUD, menu, black panel, title/subtitle text, poster layout, infographic, modern computer, keyboard, printer, calculator, smartphone, people, hands, faces, gore, weapons, soldiers, battlefield action, clean stock photo, bright modern office.*

**`packet_thumb_event_decision.webp`** — `Generate a 640 x 480 px packet-card thumbnail. Scene: tight close-up of an urgent but unlabeled presidential decision folder on a worn wooden desk, paperclip, blank cover sheet, blurred pseudo-typed blocks that cannot be read, muted amber desk lamp spill, 1990s government-office documentary realism. Leave one quiet darker corner for app-rendered urgency badges. No people, no readable text, no warning stamps, no UI elements.` + shared negative.

**`packet_thumb_peace_plan.webp`** — `Generate a 640 x 480 px packet-card thumbnail. Scene: diplomatic peace-plan packet with two blank proposal folders, a folded Bosnia-like territorial map under translucent tracing paper, fountain pen, restrained archival paper tones, soft office daylight. The map must suggest Balkan negotiation geography without readable place names or modern national borders. No flags, no readable labels, no embedded title, no people.` + shared negative.

**`packet_thumb_reserve_request.webp`** — `Generate a 640 x 480 px packet-card thumbnail. Scene: military staff request paperwork beside a 1990s field radio handset, dull green office telephone, blank roster sheet with unreadable pseudo-lines, pencil marks on a map fragment, subdued staff-office lighting. No insignia, no unit names, no readable numbers, no soldiers, no weapons, no modern electronics.` + shared negative.

**`packet_thumb_officer_matter.webp`** — `Generate a 640 x 480 px packet-card thumbnail. Scene: personnel matter file on a desk, blank tabbed folder, obscured black photo placeholder, service papers with unreadable pseudo-text, brass lamp edge, dusty 1990s office realism. No real faces, no readable classification stamps, no PERSONNEL text, no SECRET text, no computer monitor, no printer, no keyboard.` + shared negative.

**`packet_thumb_paramilitary.webp`** — `Generate a 640 x 480 px packet-card thumbnail. Scene: internal security incident file, blank red-brown folder, municipal street-map fragment with no place names, clipped memo pages with blurred pseudo-text, desk lamp shadow, dark restrained palette. Avoid sensational imagery. No large warning stamps, no readable caution labels, no police logos, no weapons, no gore, no people, no action scene.` + shared negative.

**`packet_thumb_intelligence.webp`** — `Generate a 640 x 480 px packet-card thumbnail. Scene: intelligence packet on a desk with blurred reconnaissance print shapes, black redaction strips, brass magnifying glass, manila folder, paperclips, low archival light. The images and text must remain unreadable at full size. No real locations, no target labels, no agency logos, no readable codes, no people.` + shared negative.

**`packet_thumb_convoy.webp`** — `Generate a 640 x 480 px packet-card thumbnail. Scene: humanitarian access packet with blank route map, weathered paperwork, pencil, paperclips, and a worn wooden desktop, cool daylight from a window. Use unlabeled route lines and blank form shapes only. No manifest table, no checklist grid, no aid organization logos, no readable handwriting, no stamps, no calculators, no people.` + shared negative.

### Consequence stills (1280×720) → `src/ui/map/assets/presidential_desk/consequence_stills/`

> Shared negative folded into each: *readable text/numbers, headlines, captions, subtitles, labels, faction names, code names, insignia, flags, logos, watermarks, signatures, UI overlay, HUD, menu, black panel, poster layout, propaganda, modern computer, keyboard, printer, smartphone, people, faces, soldiers, weapons, gore, explosions, battlefield action, dramatic cinematic battle scene, clean stock photo, bright modern office.*

**`consequence_negotiated_settlement.webp`** — `Generate a 1280 x 720 px Records/Chronicle consequence still. Scene: empty negotiation table after a late meeting, two blank proposal folders left open, Bosnia-like territorial map sheets turned partly face-down, ashtray, pencil, cold coffee cup, dim practical office lighting, 1990s archival documentary realism. Leave a calm negative-space area for app-rendered record text. No readable text, no flags, no people, no triumphant symbolism.` + shared negative.

**`consequence_reserve_deployment.webp`** — `Generate a 1280 x 720 px Records/Chronicle consequence still. Scene: staff desk after reserve deployment approval, field radio handset resting idle, stacked blank movement papers, map with unreadable grease-pencil arrows, subdued green-brown military-office lighting, chair pushed back. It should imply the order has gone out without showing combat. No soldiers, no weapons, no insignia, no unit names, no readable numbers.` + shared negative.

**`consequence_public_pressure.webp`** — `Generate a 1280 x 720 px Records/Chronicle consequence still. Scene: government office desk with muted press-clipping shapes, telephone, unopened envelopes, blurred newspaper columns that cannot be read, soft grey daylight, restrained 1990s archival realism. The mood should suggest political pressure and scrutiny without a literal headline. No legible headlines, no protest crowd, no flags, no TV screen, no people.` + shared negative.

**`consequence_humanitarian_access.webp`** — `Generate a 1280 x 720 px Records/Chronicle consequence still. Scene: aid-access paperwork and an unlabeled route map on a worn desk, pencil laid across the map, blank form pages, paperclips, quiet daylight, desaturated documentary palette. It should feel administrative and sober, not heroic. No aid logos, no manifest table, no checklist grid, no readable handwriting, no convoy vehicles, no people.` + shared negative.

**`consequence_personnel_change.webp`** — `Generate a 1280 x 720 px Records/Chronicle consequence still. Scene: closed personnel folder after a staff decision, blank tab, obscured photo placeholder, desk lamp pool of light, files slightly rearranged, restrained 1990s office realism. It should imply a personnel action has been recorded, not expose a face or identity. No real faces, no readable classification stamps, no PERSONNEL text, no SECRET text, no modern computer, no printer.` + shared negative.

## §9 command-strip prompts (desk style)

Standalone prompts for the newer command-strip surface (`src/ui/map/assets/command_cards/<id>.webp`, loaded by `CommandCard.tsx`), written in the **same 1990s documentary-realism desk style** as the brief above — NOT sepia. Faction-neutral (engine CSS tint). The first sentence is the shared style anchor — keep it identical across all 11 for set coherence. Each block ends with the same compact negative so it is self-contained.

> Shared style anchor (opens every prompt): *1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber + muted green-brown), desaturated period palette, cinematic but not glossy.*
> Shared negative (closes every prompt): *NEGATIVE: people, faces, hands; readable text/numbers/labels in any language (keep illegible); the literal words PERSONNEL/SECRET/WARNING/CAUTION, aid-manifest tables, checklist grids; flags or insignia with legible symbols; modern electronics (computers, CRT/LCD, keyboards, printers, phones); weapons, blood, gore, soldiers, combat, explosions; baked-in UI — black/translucent panels, overlay boxes, card placeholders, HUD, menus, titles, badges; watermark, logo, signature; concept art, 3D render, propaganda poster, bright saturated colors.*

### Category cards — 4:3, 1024×768

**`cat_war_direction.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber + muted green-brown), desaturated period palette, cinematic but not glossy. Generate a 1024×768 px image. Scene: a worn wooden operations-room table seen slightly from above, a folded paper situation map of mountainous Bosnia laid across it, a sweeping front line drawn in black-and-red grease pencil, folded field reports and a radio handset at the edge; no unit symbols, no legible place names. A single dim ops-room desk lamp from the upper left; the rest in low shadow. Keep the lower strip calm for an app-rendered title. NEGATIVE: people, faces, hands; readable text/numbers/labels in any language; legible flags or insignia; modern electronics; weapons, gore, soldiers, combat; baked-in UI/panels/HUD/titles/badges; watermark; concept art, 3D render, bright saturated colors.`

**`cat_diplomacy.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber + muted green-brown), desaturated period palette, cinematic but not glossy. Generate a 1024×768 px image. Scene: a diplomatic peace-proposal folder open on an old wooden desk, typed pages with unreadable pseudo-text, a Bosnia-like territorial map partly under translucent tracing paper, fountain pen, restrained beige paper, soft side light, empty chairs implied. Keep the center-left calm for an app-rendered title. NEGATIVE: people, faces, hands; readable text/labels in any language; legible national flags or insignia; modern electronics; baked-in UI/panels/titles/badges; watermark; United States/modern national map; bright saturated colors, glossy 3D render.`

**`cat_home_front.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber + muted green-brown), desaturated period palette, cinematic but not glossy. Generate a 1024×768 px image. Scene: a wartime supply depot interior — stacked wooden crates and burlap sacks at the back, a foreground table with an open hand-ruled ledger, mobilization paperwork with blurred pseudo-text, a pencil and a rubber stamp; bare concrete floor, a hanging utility bulb, cool practical light. Bureaucratic and strained, not heroic. NEGATIVE: people, faces, hands; readable text/numbers/manifests/labels; aid-organisation logos; legible insignia/flags; modern electronics (calculators, keyboards); baked-in UI/panels/titles; watermark; bright saturated colors, glossy 3D render.`

**`cat_command.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber + muted green-brown), desaturated period palette, cinematic but not glossy. Generate a 1024×768 px image. Scene: an empty officers' briefing room — a large paper wall map of mountainous terrain (geography only, no markings or legible labels), rows of empty wooden chairs facing it, a black field telephone with a coiled cable beside a folded briefing folder on a side table; dim institutional light. Unoccupied, waiting. Keep the lower strip calm for an app-rendered title. NEGATIVE: people, faces, hands; readable text/place-names/labels; legible flags or insignia; modern electronics (computers, LCD, keyboards, mobile phones); baked-in UI/panels/titles/badges; watermark; bright saturated colors, glossy 3D render.`

**`cat_conscience.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber + muted green-brown), desaturated period palette, cinematic but not glossy. Generate a 1024×768 px image. Scene: a grave, empty council chamber at night — a single desk lamp throws a small warm pool onto a plain desk with an open ledger (pages unreadable); the long table and empty chairs recede into deep shadow. Absolutely no people; the emptiness and the lone lamp carry the moral weight. Solemn, restrained, memorial — never graphic. NEGATIVE: ANY people, faces, hands, figures or silhouettes; corpses, graves of bodies, wounds, blood, any violence; readable text/labels; legible insignia/flags; religious icons or candles as focal elements; modern electronics; baked-in UI/panels/titles; watermark; bright saturated colors, glossy 3D render.`

**`cat_record.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber + muted green-brown), desaturated period palette, cinematic but not glossy. Generate a 1024×768 px image. Scene: an archive corner — a stack of folded period newspapers (mastheads blurred and unreadable), a manual typewriter with a sheet rolled in, a wooden archive shelf of bound ledgers and document boxes behind; soft grey daylight, still and dusty. Keep the lower strip calm for an app-rendered title. NEGATIVE: people, faces, hands; readable text/headlines/dates/numbers/labels; legible insignia/flags; modern electronics (computers, keyboards, printers); baked-in UI/panels/titles; watermark; bright saturated colors, glossy 3D render.`

### Action cards — 16:9, 1280×720

**`act_front_visit.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime setting, subdued practical lighting, desaturated period palette, cinematic but not glossy. Generate a 1280×720 px image. Scene: a dark period staff car on a muddy mountain road, seen from behind at a distance, climbing toward a quiet front-line trench position on a forested ridge (sandbags and timber supports ahead); no combat, no firing, no smoke; cold and still under flat overcast mountain daylight. Wide, calm framing; keep the lower strip quiet for an app-rendered title. NEGATIVE: visible people, faces, soldiers in the open, combat, gunfire, explosions, smoke; readable text/labels; legible flags or insignia; modern vehicles/electronics; baked-in UI/panels/titles; watermark; bright saturated colors, glossy 3D render.`

**`act_replace_commander.webp`** — `1990s archival documentary photograph, Yugoslav-era wartime government office, subdued practical lighting (warm amber), desaturated period palette, cinematic but not glossy. Generate a 1280×720 px image. Scene: a tight tabletop still — a plain military officer's peaked cap (no legible badge or insignia) resting on a worn wooden desk on top of a single typed-and-signed order, an ink pen laid across the page; the order's text blurred and unreadable except the suggestion of a signature line; a low desk lamp from the side casts a warm focused pool and a long soft shadow. Quiet, weighty, final. NEGATIVE: people, faces, hands; readable text/names/numbers/classification stamps (keep the order illegible); the literal words PERSONNEL/SECRET; cap badges, medals, insignia; modern electronics; baked-in UI/panels/titles; watermark; bright saturated colors, glossy 3D render.`

**`act_patron_relations.webp`** — `1990s archival documentary photograph, Yugoslav-era diplomatic setting, subdued practical lighting, desaturated period palette, cinematic but not glossy. Generate a 1280×720 px image. Scene: a quiet negotiation table with two small generic tabletop flags on stands near the centre, their fabric muted and emblems indistinct and unreadable; empty chairs face each other; a folded dossier and two water glasses between them; the room unoccupied — a meeting about to begin or just ended; subdued daylight from one side, formal. Keep calm space at the lower edge for an app-rendered title. NEGATIVE: people, faces, hands; readable text/labels; identifiable national flags, crests or insignia (keep emblems indistinct); modern electronics; baked-in UI/panels/titles; watermark; United States/modern national map; bright saturated colors, glossy 3D render.`

**`act_authorize_op.webp`** — `1990s archival documentary photograph, Yugoslav-era military staff office, subdued practical lighting (warm amber), desaturated period palette, cinematic but not glossy. Generate a 1280×720 px image. Scene: a close top-down view of a folded paper operations map of mountainous Bosnia on a wooden desk, faint grease-pencil arrows, and a fresh red rubber stamp reading "ODOBRENO" pressed across one corner — that single Bosnian/Croatian word is the ONLY legible text; all place names and notes are blurred and unreadable; an ink pad and stamp rest beside the map; a desk lamp from the upper left. NEGATIVE: people, faces, hands; any readable text other than the single red word "ODOBRENO" (keep everything else illegible); do NOT render English words and do NOT misspell the stamp; legible flags or insignia; modern electronics; baked-in UI/panels/titles; watermark; bright saturated colors, glossy 3D render.`
> If Gemini mangles/anglicises "ODOBRENO" over a couple of passes, fall back to "an illegible red approval stamp".

**`act_convoy.webp`** — `1990s archival documentary photograph, winter, subdued overcast light, desaturated period palette, cinematic but not glossy. Generate a 1280×720 px image. Scene: a column of plain UN-white trucks crawling along a narrow snow-covered mountain road through dark forest, seen from a distance and slightly above; headlights catch the falling snow; the road curves into mist between steep wooded slopes; the vehicles bear no readable markings or legible emblems; no people. Wide, cold framing with a calm lower strip for an app-rendered title. NEGATIVE: people, faces, hands; readable text/numbers/vehicle-markings/labels (keep trucks plain); flags, insignia, aid-organisation logos; modern SUVs/electronics; baked-in UI/panels/titles; watermark; bright saturated colors, glossy 3D render.`

## Surfaces note (for whoever reconciles the GUI)

Two surfaces reference card art and have **diverged**:
- **Presidential-desk decision surface** (this brief): `src/ui/map/assets/presidential_desk/{decision_headers,packet_thumbnails,consequence_stills}/` — art exists, wired to the decision modals.
- **§9 command-strip** (`docs/plans/2026-06-01-presidential-command-surface-design.md`, built in #111): `CommandCard.tsx` loads `src/ui/map/assets/command_cards/<id>.webp` (empty but for `.gitkeep`).
If the command-strip is pursued, its cards should **reuse the families + style canon above** (map e.g. patron/diplomacy, authorize/military, convoy/humanitarian, replace-CO/personnel, internal-security/paramilitary), not a new style — and ideally share assets rather than duplicate them.

## Source references

- `docs/plans/2026-05-24-gui-ai-asset-brief.md` — **canonical prompts + negatives + paths.**
- `docs/plans/2026-06-01-presidential-command-surface-design.md` §9 — the newer command-strip surface (divergent ids/paths).
- Prior packs: `docs/40_reports/handovers/20260312_WARROOM_PROMPT_PACK_V2.md`, `20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md`, `docs/40_reports/implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md` (CRT removed), `docs/30_planning/design/{IMAGE_GENERATION_PROMPTS.md,ART_DIRECTION_OIL_PAINT_EVENTS.md,VISUAL_ASSET_STRATEGY.md}`.
