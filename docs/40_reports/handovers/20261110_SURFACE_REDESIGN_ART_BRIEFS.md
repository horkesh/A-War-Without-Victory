# Surface redesign — art briefs for Codex

**Date:** 2026-11-10
**Why:** the owner-approved surface redesign (Command Surface style, `src/ui/map/components/surface/Surface.tsx`) shows existing art in new, much wider and shorter slots. The current files are 4:3 cards and 3:1 plates, so the wide slots crop away most of each picture and, on bright plates, the overlaid text loses contrast. These briefs ask for re-cuts at the new proportions. Nothing in the game is blocked: every slot works with today's files.

Style for every image: the existing AWWV documentary realism of the command cards and decision plates (1992–1995 Bosnia, period objects, natural light, muted palette, no people's faces in focus, no text, no logos, no modern objects). Re-use the composition "bones" of the source image named in each brief so the new cut reads as the same place.

**Text-safe zone (all banners and plates):** the surface writes a mono eyebrow, a 30–34 px title and one line of 17–18 px copy over the **bottom-left** of the picture, up to about 45 % of the width and 60 % of the height. Keep that area low-detail and dark (shadowed table, wall, floor); put the hero subject in the right half. The game still lays a dark gradient over it, but a dark source keeps the copy crisp.

Deliver WebP, quality ~82, sRGB. Filenames below are exact; dropping them in the named folder is enough once the small resolver change in "Wiring" lands (Claude does that; it falls back to today's art when a file is missing).

## 1. Area banners — 18 images (6 areas × RBiH / RS / HRHB)

- **Where it shows:** the banner at the top of the middle column of the Command Surface (and Diplomacy uses the diplomacy banner). Rendered 176 px tall and 562–1,422 px wide (1280 × 720 up to the owner's 2293 × 960), so 3.2:1 to 8:1.
- **Today:** the 4:3 category cards `src/ui/map/assets/command_cards/cat_<area>_<FACTION>.webp` (1024 × 768), cropped to a thin centre strip — the map table, the empty chairs and the depot crates are mostly cut off.
- **Ask:** `cat_<area>_banner_<FACTION>.webp`, **2400 × 480 (5:1)**, same space, hero subject, camera, light key and faction skin as the matching card (see `docs/40_reports/handovers/20260607_COMMAND_CARD_FACTION_PROMPT_PACK.md`, "Category bones"), recomposed as a wide panorama with the hero subject in the right half and the text-safe zone bottom-left. The image must survive a further crop to 8:1 (keep the subject in the vertical middle third).
- Areas: `war_direction`, `diplomacy`, `home_front`, `command`, `conscience`, `record`.

## 2. Matter detail headers — 15 images (5 actions × 3 factions)

- **Where it shows:** the top of the right-hand detail column when a matter carries an action (issue an order, replace a commander, patron relations, convoy, front visit). Rendered 208 px tall, 397–560 px wide (≈ 2:1 to 2.7:1).
- **Today:** the 16:9 action cards `command_cards/act_<action>_<FACTION>.webp` (1280 × 720), mildly cropped. These are the least affected; re-cut only if convenient.
- **Ask (optional):** `act_<action>_detail_<FACTION>.webp`, **1200 × 480 (2.5:1)**, same bones as the action card, subject centred, no text-safe zone needed (no text overlays this image).

## 3. Decision plates — 9 images

- **Where it shows:** the full-width header band of every decision surface (event decisions, officer matters, peace plans, convoys, reserves, paramilitary, counter-offers, intelligence). Rendered at least 176 px tall across 1,024–1,760 px (5.8:1 to 10:1) with eyebrow, title and a description line over the left.
- **Today:** `src/ui/map/assets/presidential_desk/decision_headers/decision_header_<family>.webp` (1536 × 512, 3:1), cropped to a strip; the personnel plate (bright paper on a desk) is the worst case for contrast.
- **Ask:** same filenames with a `_wide` suffix, `decision_header_<family>_wide.webp`, **3000 × 480 (6.25:1)**, same scene recomposed as a long desk/panorama, subject in the right 55 %, left 45 % dark (desk wood, shadow), bright paper kept out of the text-safe zone.
- Families: `counter_offer`, `diplomacy`, `economic`, `humanitarian_convoy`, `intelligence`, `military_staff`, `paramilitary`, `personnel`, `territorial`.

## 4. President's Desk banner — 1 image

- **Where:** the middle-column banner of the President's Desk (same 176 px band as §1).
- **Today:** `src/ui/warroom/assets/hq_presidential_desk_1992.webp` (2752 × 1536), centre strip.
- **Ask:** `src/ui/map/assets/presidential_desk/desk_banner.webp`, **2400 × 480**, the same 1992 presidential desk seen low and wide along the desk surface, telephone, lamp and file stack on the right, dark leather/wood bottom-left.

## Not needed

Rail thumbnails (square, 48–64 px) and packet thumbnails on Desk cards (96 × 72) read fine at today's size; documentary stills (peace plans, event illustrations) keep their own 3:2 / 16:9 slots.

## Wiring (Claude, after delivery)

`resolveCommandCardArt` already resolves `command_cards/<id>_<FACTION>.webp` first. The banner, detail and wide-plate lookups will try the new id (`cat_<area>_banner`, `act_<action>_detail`, `decision_header_<family>_wide`) and fall back to today's file when absent, so files can land one at a time. §4 needs a one-line import swap in `PresidentDeskShell.tsx`.
