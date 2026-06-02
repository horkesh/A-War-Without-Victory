# Command-Surface Card Art — Image Generation Prompts (Handover)

**Date:** 2026-06-02
**Surface:** Presidential command-surface card strip (`CommandCard.tsx`) + Decision-Room "Directive Card" act layer.
**Spec source:** `docs/plans/2026-06-01-presidential-command-surface-design.md` §9 (image manifest).
**Closest prior analog:** `docs/plans/2026-05-24-gui-ai-asset-brief.md` (same presidential-desk surface).

## Where the files go

Drop all generated images at: `src/ui/map/assets/command_cards/<id>.webp`

`CommandCard.tsx` loads them via `import.meta.glob`, so a correctly-named `.webp` dropped into that folder appears with **no code change**. Until art exists, each card shows a faction-tinted CSS placeholder (the feature works without art).

- **Category cards:** 4:3, **1024×768** — `cat_war_direction`, `cat_diplomacy`, `cat_home_front`, `cat_command`, `cat_conscience`, `cat_record`
- **Action cards:** 16:9, **1280×720** — `act_front_visit`, `act_replace_commander`, `act_patron_relations`, `act_authorize_op`, `act_convoy`

> The 6 **category** cards light up the existing card strip today. The 5 **action** cards are for the Decision-Room "Directive Card" act layer (still being built).

## Target model

**Google Gemini image generation** ("nano banana"). It honors exact pixel sizes ("Generate a 1024×768 px image"), so it does **not** use `--ar`. **Midjourney fallback:** replace the "Generate a WxH px image." sentence with the scene text + ` --ar 4:3 --style raw` (category) or ` --ar 16:9 --style raw` (action).

## Lessons applied (from prior prompt packs)

Studied: the warroom v1 six-prompt pack (`20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md`), the **v2** nine-anchor pack with its pass-by-pass log (`20260312_WARROOM_PROMPT_PACK_V2.md` — the v1→v2 diff is where the real lessons live), the 2026-03-08 unified-room/clean-room docs, the CRT command-surface art direction (`20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md`), the oil-paint event art direction (`ART_DIRECTION_OIL_PAINT_EVENTS.md`), the Gemini visual-asset strategy (`VISUAL_ASSET_STRATEGY.md`), and the 2026-05-24 GUI AI asset brief.

- **One self-contained block per image.** Gemini handles a single coherent prompt far better than layered/"see preamble above" composition. On a retry, re-send the **full** prompt — Gemini treats correction-only diffs as suggestions and will redesign the whole scene.
- **Positive spatial layout beats negative-avoidance walls** (the headline v1→v2 fix; their negative list shrank ~150→~80 words). Describe explicit left/centre/right placement rather than chaining "avoid X over Y."
- **Fewer, larger, well-separated subjects.** v2 cut 12 anchors → 9 because Gemini can't reliably place many distinct objects. Keep each card to a few clear objects.
- **No baked text.** Gemini loves stamping English ("REPORT", "SECRET", "Personnel"). Forbid readable text explicitly and either give the local-language word or "illegible/blurred." The one intentional legible word in this set is **"ODOBRENO"** on `act_authorize_op`.
- **Faction-symbol pitfall:** Gemini defaults to the **post-1998** BiH yellow-triangle crest. Keep flags/insignia generic, indistinct, and unreadable to stay period-correct and on the right side of the ethics line.
- **Consistency lever:** an **identical style-anchor sentence** at the head of all 11 (Gemini has no reliable seed in this workflow; verbatim style-line repetition is what held prior sets together).
- **Reserve quiet negative space** at the bottom of each card for the app-rendered title/badge (cards use a bottom-gradient title safe-area + badge per `DecisionCard.tsx`).
- **CRT-green is OFF the table** — explicitly removed from live command surfaces (2026-05-17) as too dated a signal against AWWV's sober institutional tone.
- **Ethics / tone:** memorial register, not illustration. Show **aftermath/emptiness, never the act** — no people in distress, no corpses/graves/wounds, no triumphalism or heroic charges. The `cat_conscience` card carries its weight through emptiness (zero people).

## Style (resolved)

Leading with the §9 owner-accepted spec, the single coherent style for all 11 is:

> *Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper.*

This is the shared **style-anchor sentence** — keep it identical across all 11 for set coherence.

## OPEN DECISION (owner) — faction tint

All 11 prompts below are written **faction-neutral** so one image serves all three factions and the engine's existing CSS faction-tint layer (per `DecisionCard.tsx`) does the coloring. **Recommended** — cheaper (11 images, not 33) and avoids the post-1998-crest pitfall.

Alternative: bake the tint into the art (RBiH-green / RS-red / HRHB-blue) → 3× the cards (33 images); add one line per prompt: *"subtle [green/red/blue] ink-wash tint over the desaturated base."*

> Status as of 2026-06-02: **pending owner confirmation.** Default = neutral + engine tint.

---

## The 11 prompts

### `cat_war_direction.webp` — 4:3, 1024×768

```
Generate a 1024×768 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a worn wooden operations-room table seen from slightly above, with a large folded paper situation map of mountainous Bosnian terrain laid across it; a sweeping front line drawn in greasy black-and-red grease pencil arcs across the map, with a few hand-drawn arrows. A grease pencil and a folded field report rest at the map's edge. No pins, no unit symbols, no legible place names. Composition: map fills the centre and lower two-thirds; the table's near edge sits in the bottom of the frame; keep the lower strip calm for an app-rendered title. Lighting: a single dim operations-room desk lamp casting a warm pool from the upper left; the rest of the room in low shadow. Palette: amber lamplight, olive and steel-grey map tones, dark wood, bone-white paper. Quiet, institutional, sober — no heroic framing. NEGATIVE — do not include: people, faces, hands; any readable text, numbers, place names, or labels in any language (keep all marks illegible); flags, insignia, crests, or national symbols; modern computers, screens, LED/LCD displays, keyboards, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `cat_diplomacy.webp` — 4:3, 1024×768

```
Generate a 1024×768 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a long polished conference table in a quiet European meeting room, viewed end-on from a slight height. Two small generic tabletop flags on stands flank the centre, their fabric muted and their emblems indistinct and unreadable. An open leather dossier with typed pages and a fountain pen sits mid-table; water glasses and an ashtray nearby. The chairs around the table are empty and slightly pushed back — the negotiation has paused. Composition: table recedes to the centre; flags and dossier are the focal cluster; leave the lower frame calm for an app-rendered title. Lighting: subdued daylight from tall windows on the right plus soft overhead institutional light; restrained, no glare. Palette: polished wood brown, ivory paper, steel grey, muted amber. Formal, sober, expectant — not triumphant. NEGATIVE — do not include: people, faces, hands; any readable text, numbers, or labels in any language (keep flags and papers illegible); identifiable national flags, crests, or insignia; modern computers, screens, keyboards, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `cat_home_front.webp` — 4:3, 1024×768

```
Generate a 1024×768 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: the interior of a wartime supply depot. Stacked wooden crates and burlap sacks of supplies line the back; in the foreground on a plain table lies an open hand-ruled ledger with a pencil across it, beside a clipboard of mobilisation paperwork with unreadable pseudo-typed lines and a rubber stamp. Bare concrete floor, a hanging utility bulb. No legible writing anywhere. Composition: crates fill the background, the ledger-and-paperwork cluster is centre-foreground; keep the lower strip calm for an app-rendered title. Lighting: cool overcast daylight from a high window plus one bare practical bulb; utilitarian, slightly dim. Palette: crate-wood brown, burlap tan, concrete grey, dull olive, weathered paper. Bureaucratic, strained, sober — not heroic. NEGATIVE — do not include: people, faces, hands; any readable text, numbers, manifests, or labels in any language (keep all writing illegible); flags, insignia, aid-organisation logos, or national symbols; modern computers, screens, keyboards, calculators, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `cat_command.webp` — 4:3, 1024×768

```
Generate a 1024×768 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: an empty officers' briefing room. A large paper wall map of mountainous terrain hangs on the back wall (geography only, no markings, no legible labels). Rows of empty wooden chairs face it; on a side table a black field telephone with a coiled cable sits beside a folded briefing folder. The room is unoccupied, waiting. Composition: wall map dominates the upper-back centre; chairs lead the eye in from the foreground; field telephone is a clear secondary subject lower-right; keep the lower strip calm for an app-rendered title. Lighting: muted daylight from a side window plus a dim overhead fixture; quiet, institutional. Palette: dark wood, olive, steel grey, faded map tan, bone-white. Sober, expectant, austere. NEGATIVE — do not include: people, faces, hands; any readable text, numbers, place names, or labels in any language (keep the map and folders illegible); flags, insignia, crests, or national symbols; modern computers, screens, LED/LCD displays, keyboards, mobile phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `cat_conscience.webp` — 4:3, 1024×768

```
Generate a 1024×768 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a grave, empty council chamber at night. A single desk lamp throws a small warm pool of light onto a plain desk where an open ledger lies, its pages unreadable. The rest of the long table and the empty chairs recede into deep shadow. Absolutely no people — the emptiness and the lone lamp carry the moral weight. Composition: the lit desk and open ledger sit centre-to-lower; surrounding chamber falls into darkness; keep the lower strip calm for an app-rendered title. Lighting: one desk lamp ON as the sole light source; everything beyond it dim and shadowed. Palette: deep shadow, amber lamplight, dark wood, bone-white page. Solemn, restrained, memorial — never graphic, never triumphant. NEGATIVE — do not include: ANY people, faces, hands, figures, or silhouettes of people; graves of bodies, corpses, wounds, blood, or any depiction of violence; any readable text, numbers, or labels in any language (keep the ledger illegible); flags, insignia, crests, or national symbols; candles or religious icons as focal elements; modern computers, screens, keyboards, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

> `cat_conscience` note: "a grave, empty council chamber" = a *grave/solemn* empty chamber, not a burial grave. The prompt renders it that way and explicitly forbids burial imagery, per the ethics line.

### `cat_record.webp` — 4:3, 1024×768

```
Generate a 1024×768 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: an archive corner. A stack of folded period newspapers sits on a desk beside a manual typewriter with a sheet of paper rolled in; behind them a wooden archive shelf holds rows of bound ledgers and document boxes. Newspaper mastheads and typed lines are blurred and unreadable. Composition: typewriter and newspaper stack are the foreground cluster, archive shelving fills the background; keep the lower strip calm for an app-rendered title. Lighting: soft grey daylight from one side plus a dim interior; still, dusty, archival. Palette: aged newsprint grey, typewriter black-and-steel, wood brown, sepia paper. Quiet, documentary, reflective. NEGATIVE — do not include: people, faces, hands; any readable text, headlines, dates, numbers, or labels in any language (keep mastheads and pages illegible); flags, insignia, crests, or national symbols; modern computers, screens, keyboards, printers, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `act_front_visit.webp` — 16:9, 1280×720

```
Generate a 1280×720 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a dark period staff car on a muddy mountain road, seen from behind at a distance, climbing toward a quiet front-line trench position on a forested ridge. Sandbags and timber trench supports are visible ahead; no combat, no firing, no smoke. The landscape is cold and still. Composition: the road and car lead the eye from lower-foreground into the middle distance; ridge and trench line across the upper third; wide, calm framing; keep the lower strip quiet for an app-rendered title. Lighting: flat overcast mountain daylight, low contrast. Palette: mud brown, pine dark-green, steel grey, overcast white, faded olive. Sober, tense, anticipatory — no action, no heroism. NEGATIVE — do not include: visible people, faces, soldiers in the open, combat, gunfire, explosions, or smoke; any readable text, numbers, or labels in any language; flags, insignia, crests, or national symbols; modern vehicles, computers, screens, or electronics; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `act_replace_commander.webp` — 16:9, 1280×720

```
Generate a 1280×720 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a tight tabletop still — a plain military officer's peaked cap resting on a worn wooden desk on top of a single typed-and-signed order, an ink pen laid across the page. The cap bears no legible badge or insignia; the order's text is blurred and unreadable except for the suggestion of a signature line. Quiet, weighty, final. Composition: cap and order centred, filling the middle of the frame; soft empty desk around them; keep one lower corner quiet for an app-rendered title. Lighting: a low desk lamp from the side casting a warm, focused pool and a long soft shadow. Palette: dark olive cap, amber lamplight, ivory paper, dark wood, ink black. Restrained, consequential — not heroic. NEGATIVE — do not include: people, faces, hands; readable text, names, numbers, classification stamps, or labels in any language (keep the order illegible); cap badges, medals, insignia, crests, or national symbols; modern computers, screens, keyboards, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `act_patron_relations.webp` — 16:9, 1280×720

```
Generate a 1280×720 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a quiet negotiation table with two small generic tabletop flags on stands set near the centre, their fabric muted and their emblems indistinct and unreadable. Empty chairs face each other across the table; a folded dossier and two water glasses sit between them. The room is unoccupied — a meeting about to begin or just ended. Composition: the two flags and the gap of empty chairs anchor the centre; wide 16:9 framing with calm space at the lower edge for an app-rendered title. Lighting: subdued daylight from one side plus soft overhead light; restrained, formal. Palette: muted flag tones, polished wood, ivory paper, steel grey, amber. Formal, transactional, sober. NEGATIVE — do not include: people, faces, hands; readable text, numbers, or labels in any language; identifiable national flags, crests, or insignia (keep flag emblems indistinct); modern computers, screens, keyboards, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

### `act_authorize_op.webp` — 16:9, 1280×720

```
Generate a 1280×720 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a close, top-down view of a folded paper operations map of mountainous Bosnian terrain on a wooden desk, marked with faint grease-pencil arrows, and a fresh red rubber stamp reading "ODOBRENO" pressed across one corner — that single Bosnian/Croatian word is the ONLY legible text in the image; everything else (place names, notes) is blurred and unreadable. An ink pad and stamp rest beside the map. Composition: map fills most of the frame, the red "ODOBRENO" stamp is the clear focal accent set off-centre; keep the lower strip quiet for an app-rendered title. Lighting: a desk lamp from the upper left, warm focused pool. Palette: desaturated olive-and-steel map, dark wood, ivory paper, with the single stamp in muted oxblood red. Decisive, weighty, sober. NEGATIVE — do not include: people, faces, hands; any readable text other than the single red word "ODOBRENO" — keep all place names, numbers, and notes illegible; do NOT render English words, and do NOT misspell the stamp; flags, insignia, crests, or national symbols; modern computers, screens, keyboards, phones; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

> If Gemini mangles or anglicises "ODOBRENO" across a couple of passes, fall back to "an illegible red approval stamp" rather than fighting it pass-by-pass.

### `act_convoy.webp` — 16:9, 1280×720

```
Generate a 1280×720 px image. Muted sepia/parchment period photo-illustration — an archival documentary still from 1992–95 Bosnia, desaturated and lightly sepia-toned with a faint aged-paper grain, as if a faded period photograph reproduced on old paper. Scene: a column of plain UN-white trucks crawling along a narrow snow-covered mountain road through dark forest, seen from a distance and slightly above. Headlights catch the falling snow; the road curves away into mist between steep wooded slopes. The vehicles bear no readable markings or legible emblems. No people visible. Composition: the convoy and road lead from the lower-foreground into the middle distance and curve out of frame; forested slopes frame both sides; wide cold framing with a calm lower strip for an app-rendered title. Lighting: pale overcast winter light with headlight glow; low contrast, snow-muted. Palette: UN white, snow white, pine dark-green, slate grey, cold blue-grey. Bleak, humanitarian, sober — not heroic. NEGATIVE — do not include: people, faces, hands; any readable text, numbers, vehicle markings, or labels in any language (keep the trucks plain and unmarked); flags, insignia, crests, aid-organisation logos, or national symbols; modern SUVs, computers, screens, or electronics; UI panels, HUD, badges, black rectangles, card-placeholder shapes, or baked-in title text; bright saturated colours, glossy 3D render, cartoon or fantasy style; watermark or signature.
```

---

## Source references

- `docs/plans/2026-06-01-presidential-command-surface-design.md` §9 — the image manifest this set implements.
- `docs/plans/2026-05-24-gui-ai-asset-brief.md` — closest prior analog (presidential-desk surface).
- `docs/40_reports/handovers/20260312_WARROOM_PROMPT_PACK_V2.md` — v1→v2 lessons + pass log.
- `docs/40_reports/handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md` — original six warroom prompts.
- `docs/40_reports/handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md`, `20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md`.
- `docs/40_reports/implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md` — CRT removed from command surfaces.
- `docs/30_planning/design/ART_DIRECTION_OIL_PAINT_EVENTS.md`, `IMAGE_GENERATION_PROMPTS.md`, `VISUAL_ASSET_STRATEGY.md`.
