# GUI AI Asset Brief - Presidential Desk Flow

Date: 2026-05-24
Branch: `codex/presidential-desk-flow`

## Direction

Assets should support the fantasy of being a president receiving institutional reports, not a general dragging units. Use images as context and memory anchors, not as navigation. The UI must remain fully usable with zero images.

## Asset Slots

1. President's Desk background
   - Purpose: establish the office/briefing-room setting behind the Desk shell.
   - Exact dimensions: `2752 x 1536` px, matching the existing Warroom room-plate contract.
   - Delivery format: `.webp`, quality 82-88. Keep large `.png` generation sources outside git unless a future art pipeline explicitly needs them.
   - Suggested filename: `hq_presidential_desk_1992.webp`.
   - Drop path later: `src/ui/warroom/assets/hq_presidential_desk_1992.webp`.
   - Optional later variants: `hq_presidential_desk_1993.webp`, `hq_presidential_desk_1994.webp`, `hq_presidential_desk_1995.webp`.
   - Usage: Warroom/Desk background only.

2. Decision family header cards
   - Purpose: distinguish diplomatic, military, intelligence, humanitarian, personnel, and paramilitary decision modals.
   - Exact dimensions: `1536 x 512` px.
   - Delivery format: `.webp`, quality 80-86.
   - Drop path later: `src/ui/map/assets/presidential_desk/decision_headers/`.
   - Suggested filenames:
     - `decision_header_diplomacy.webp`
     - `decision_header_military_staff.webp`
     - `decision_header_intelligence.webp`
     - `decision_header_humanitarian_convoy.webp`
     - `decision_header_personnel.webp`
     - `decision_header_paramilitary.webp`
     - `decision_header_counter_offer.webp`
   - Usage: optional modal header image behind the title, with dark overlay.

3. Desk packet thumbnails
   - Purpose: help the player scan event families in the decision packet.
   - Exact dimensions: `640 x 480` px.
   - Delivery format: `.webp`, quality 78-84.
   - Drop path later: `src/ui/map/assets/presidential_desk/packet_thumbnails/`.
   - Suggested filenames:
     - `packet_thumb_event_decision.webp`
     - `packet_thumb_peace_plan.webp`
     - `packet_thumb_reserve_request.webp`
     - `packet_thumb_officer_matter.webp`
     - `packet_thumb_paramilitary.webp`
     - `packet_thumb_intelligence.webp`
     - `packet_thumb_convoy.webp`
   - Usage: optional thumbnail on repeated decision cards; never required for identifying the action.

4. Records/consequence illustrations
   - Purpose: make resolved decisions memorable in Records and Chronicle without replacing structured data.
   - Exact dimensions: `1280 x 720` px.
   - Delivery format: `.webp`, quality 80-86.
   - Drop path later: `src/ui/map/assets/presidential_desk/consequence_stills/`.
   - Suggested filenames:
     - `consequence_negotiated_settlement.webp`
     - `consequence_reserve_deployment.webp`
     - `consequence_public_pressure.webp`
     - `consequence_humanitarian_access.webp`
     - `consequence_personnel_change.webp`
   - Usage: consequence ledger entries and aftermath summaries.

## Asset Intake Contract

Use these exact folders when the images are ready:

| Slot | Dimensions | Final asset path | Notes |
|---|---:|---|---|
| Desk background | `2752 x 1536` | `src/ui/warroom/assets/hq_presidential_desk_1992.webp` | This matches existing `hq_*_1992.webp` room plates. Do not place this under map assets. |
| Modal headers | `1536 x 512` | `src/ui/map/assets/presidential_desk/decision_headers/*.webp` | Header images are decorative context only; modal text and buttons remain independent. |
| Packet thumbnails | `640 x 480` | `src/ui/map/assets/presidential_desk/packet_thumbnails/*.webp` | Optional card thumbnails; cards must remain readable without them. |
| Consequence stills | `1280 x 720` | `src/ui/map/assets/presidential_desk/consequence_stills/*.webp` | For Records/Chronicle/Turn Aftermath memory cards. |

Raw or experimental generations should not be imported directly. Keep large `.png` generation sources outside git, then crop/convert them into the final `.webp` paths above. Only final `.webp` files should be committed and imported by React components.

## First Delivery Checklist

Minimum useful first delivery:

| Priority | Filename | Dimensions | Drop path |
|---:|---|---:|---|
| 1 | `hq_presidential_desk_1992.webp` | `2752 x 1536` | `src/ui/warroom/assets/` |
| 2 | `decision_header_diplomacy.webp` | `1536 x 512` | `src/ui/map/assets/presidential_desk/decision_headers/` |
| 3 | `decision_header_military_staff.webp` | `1536 x 512` | `src/ui/map/assets/presidential_desk/decision_headers/` |
| 4 | `decision_header_intelligence.webp` | `1536 x 512` | `src/ui/map/assets/presidential_desk/decision_headers/` |
| 5 | `decision_header_humanitarian_convoy.webp` | `1536 x 512` | `src/ui/map/assets/presidential_desk/decision_headers/` |
| 6 | `decision_header_personnel.webp` | `1536 x 512` | `src/ui/map/assets/presidential_desk/decision_headers/` |
| 7 | `decision_header_paramilitary.webp` | `1536 x 512` | `src/ui/map/assets/presidential_desk/decision_headers/` |
| 8 | `packet_thumb_event_decision.webp` | `640 x 480` | `src/ui/map/assets/presidential_desk/packet_thumbnails/` |
| 9 | `packet_thumb_peace_plan.webp` | `640 x 480` | `src/ui/map/assets/presidential_desk/packet_thumbnails/` |
| 10 | `packet_thumb_reserve_request.webp` | `640 x 480` | `src/ui/map/assets/presidential_desk/packet_thumbnails/` |
| 11 | `consequence_negotiated_settlement.webp` | `1280 x 720` | `src/ui/map/assets/presidential_desk/consequence_stills/` |
| 12 | `consequence_reserve_deployment.webp` | `1280 x 720` | `src/ui/map/assets/presidential_desk/consequence_stills/` |
| 13 | `consequence_public_pressure.webp` | `1280 x 720` | `src/ui/map/assets/presidential_desk/consequence_stills/` |

## Prompt Specs

### Presidential Desk Background

Prompt:

> Generate a `2752 x 1536` px image. Export final as `hq_presidential_desk_1992.webp` and later drop it in `src/ui/warroom/assets/`. Scene: early 1990s Balkan presidential office used as a wartime briefing room, large wooden desk with folders, paper maps of Bosnia and Herzegovina, radio set, ashtray, telephone, muted daylight through tall windows, documentary realism, subdued warm practical light, no people, no flags with legible symbols, no text, no modern computers, cinematic but not glossy. The left third of the image must be a clean, natural dark office wall or shadowed room area reserved for app-rendered UI overlays: no black rectangles, no translucent panels, no embedded UI shapes, no empty card placeholders, no fake interface elements. Keep the desk and key props concentrated in the center and lower-right. Keep the window side softly exposed but not blown out, with a gentle natural vignette so white/amber UI text remains legible if placed over the scene. No watermark or signature.

Negative prompt:

> fantasy, sci-fi, modern glass office, readable text, dramatic explosions, soldiers posing, propaganda poster, bright saturated colors, clean stock photo, black UI panels, transparent UI panels, overlay boxes, card placeholders, interface mockup, HUD, menu, dashboard, watermark, logo, signature, pasted border, fake text labels, overexposed window

### Diplomatic Decision Header

Prompt:

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_diplomacy.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: close-up of a diplomatic peace proposal folder on an old wooden desk, typed pages, colored territorial map partly visible but no readable labels, fountain pen, 1990s archival documentary style, restrained beige paper, soft side light, no people, no readable text. Keep the center-left calm enough for title text under a dark overlay.

### Military Staff Request Header

Prompt:

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_military_staff.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: military staff desk with operational map, grease pencil marks, folded field reports, radio handset, subdued green and amber light, 1990s Yugoslav-era office atmosphere, documentary realism, no soldiers, no readable text, no national insignia. Keep contrast restrained so white/amber modal text remains legible.

### Intelligence Brief Header

Prompt:

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_intelligence.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: intelligence briefing file with black-and-white reconnaissance photos, redacted strips, paper clips, magnifying glass, low-key office lighting, 1990s archival realism, no readable text, no gore, no people. Leave a dark quiet band across the lower third for modal copy.

### Humanitarian Convoy Header

Prompt:

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_humanitarian_convoy.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: humanitarian convoy route packet on a worn wooden desk: an unlabeled route map with dashed route line and checkpoints, blank folded paperwork, pencil, paper clips, weathered paper, muted daylight, documentary realism, no people. Do not include an aid manifest table, checklist grid, form title, numbers, stamps with readable symbols, logos, readable handwriting, readable labels, calculators, keyboards, or modern electronics. The image should feel bureaucratic and urgent, not heroic or action-oriented. Leave the left third visually quiet for modal title overlay.

Negative prompt:

> Aid Manifest, manifest table, checklist grid, readable text, readable handwriting, numbers, form fields, stamped logos, warning icons, calculator, keyboard, modern laptop, modern tablet, people, soldiers, vehicles, gore, dramatic action scene, UI overlay, black panel, watermark, signature

### Personnel Matter Header

Prompt:

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_personnel.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: officer personnel dossier folder on a worn wooden desk, blank tabbed folder with no readable label, passport-style photograph area fully obscured by a plain black rectangle or paper slip, service-record papers with blurred/unreadable pseudo-text, brass desk lamp, pencil, paper clips, muted 1990s office setting, documentary realism, no people. Avoid medals, insignia, real-person likenesses, readable labels, readable classification stamps, readable handwriting, typed form fields, modern computer monitors, keyboards, printers, or obvious modern office equipment.

Negative prompt:

> PERSONNEL, SECRET, TOP SECRET, classified stamp, readable folder tab, readable labels, readable handwriting, readable typed text, numbers, forms with legible fields, real portrait, face, medals, insignia, modern computer, CRT monitor, printer, keyboard, UI overlay, black panel, watermark, signature

### Paramilitary / Internal Security Header

Prompt:

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_paramilitary.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: internal security case folder on a dark wooden desk, blank incident-report papers with blurred/unreadable pseudo-text, unlabeled municipal street-map fragment, plain red-brown folder, desk lamp, subdued red-brown and charcoal palette, 1990s documentary realism, no weapons in foreground, no people, no readable text, no insignia. The tone should signal political risk and civilian danger without showing violence. Do not include large warning stamps, caution labels, classification labels, readable headlines, logos, watermarks, or symbolic icons. Leave the left third visually quiet for modal title overlay.

Negative prompt:

> WARNING, WAR, CAUTION, DANGER, SECRET, TOP SECRET, readable text, readable labels, readable stamps, readable handwriting, large block letters, logo, watermark, signature, warning triangle, icon, insignia, weapons, blood, gore, soldiers, masked men, dramatic action scene, UI overlay, black panel

### Counter-Offer Header

Prompt:

> Generate a `1536 x 512` px modal header strip. Export final as `decision_header_counter_offer.webp` and later drop it in `src/ui/map/assets/presidential_desk/decision_headers/`. Scene: negotiation table detail with two blank proposal folders, crossed-out but unreadable pencil markings, a Bosnia-like territorial map under translucent tracing paper, coffee cup, pencil, muted office light, 1990s diplomatic documentary realism, no people, no flags, no readable text. The map must suggest Bosnia/Balkan partition lines, not the United States or any modern national map. Leave the left third as plain wood or shadowed paper for modal title overlay. Do not include any embedded title, subtitle, poster text, typography, UI mockup, or watermark.

Negative prompt:

> readable text, embedded title, subtitle, poster layout, typography, 199EFO, negotiation text, United States map, U.S. state map, modern national map, flags, logos, watermark, signature, UI overlay, black panel, people, hands, dramatic courtroom scene, clean stock photo, colorful infographic map

### Desk Packet Thumbnails

Use these prompts for optional packet-card images. Each final image must be exactly `640 x 480` px, converted to `.webp`, and dropped in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Keep the subject large enough to read as an object cue at small card size. Do not bake any game UI, labels, badges, titles, buttons, tabs, black panels, or notification overlays into the image.

Shared negative prompt for every thumbnail:

> readable text, readable numbers, labels, faction names, code names, insignia, flags, logos, watermarks, signatures, UI overlay, HUD, menu, black panel, title text, subtitle text, poster layout, infographic, modern computer, keyboard, printer, calculator, smartphone, people, hands, faces, gore, weapons, soldiers, battlefield action, clean stock photo, bright modern office

- `packet_thumb_event_decision.webp`: Generate a `640 x 480` px packet-card thumbnail. Export final as `packet_thumb_event_decision.webp` and later drop it in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Scene: tight close-up of an urgent but unlabeled presidential decision folder on a worn wooden desk, paperclip, blank cover sheet, blurred pseudo-typed blocks that cannot be read, muted amber desk lamp spill, 1990s government-office documentary realism. Leave one quiet darker corner for app-rendered urgency badges. No people, no readable text, no warning stamps, no UI elements.
- `packet_thumb_peace_plan.webp`: Generate a `640 x 480` px packet-card thumbnail. Export final as `packet_thumb_peace_plan.webp` and later drop it in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Scene: diplomatic peace-plan packet with two blank proposal folders, a folded Bosnia-like territorial map under translucent tracing paper, fountain pen, restrained archival paper tones, soft office daylight. The map must suggest Balkan negotiation geography without readable place names or modern national borders. No flags, no readable labels, no embedded title, no people.
- `packet_thumb_reserve_request.webp`: Generate a `640 x 480` px packet-card thumbnail. Export final as `packet_thumb_reserve_request.webp` and later drop it in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Scene: military staff request paperwork beside a 1990s field radio handset, dull green office telephone, blank roster sheet with unreadable pseudo-lines, pencil marks on a map fragment, subdued staff-office lighting. No insignia, no unit names, no readable numbers, no soldiers, no weapons, no modern electronics.
- `packet_thumb_officer_matter.webp`: Generate a `640 x 480` px packet-card thumbnail. Export final as `packet_thumb_officer_matter.webp` and later drop it in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Scene: personnel matter file on a desk, blank tabbed folder, obscured black photo placeholder, service papers with unreadable pseudo-text, brass lamp edge, dusty 1990s office realism. No real faces, no readable classification stamps, no `PERSONNEL` text, no `SECRET` text, no computer monitor, no printer, no keyboard.
- `packet_thumb_paramilitary.webp`: Generate a `640 x 480` px packet-card thumbnail. Export final as `packet_thumb_paramilitary.webp` and later drop it in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Scene: internal security incident file, blank red-brown folder, municipal street-map fragment with no place names, clipped memo pages with blurred pseudo-text, desk lamp shadow, dark restrained palette. Avoid sensational imagery. No large warning stamps, no readable caution labels, no police logos, no weapons, no gore, no people, no action scene.
- `packet_thumb_intelligence.webp`: Generate a `640 x 480` px packet-card thumbnail. Export final as `packet_thumb_intelligence.webp` and later drop it in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Scene: intelligence packet on a desk with blurred reconnaissance print shapes, black redaction strips, brass magnifying glass, manila folder, paperclips, low archival light. The images and text must remain unreadable at full size. No real locations, no target labels, no agency logos, no readable codes, no people.
- `packet_thumb_convoy.webp`: Generate a `640 x 480` px packet-card thumbnail. Export final as `packet_thumb_convoy.webp` and later drop it in `src/ui/map/assets/presidential_desk/packet_thumbnails/`. Scene: humanitarian access packet with blank route map, weathered paperwork, pencil, paperclips, and a worn wooden desktop, cool daylight from a window. Use unlabeled route lines and blank form shapes only. No manifest table, no checklist grid, no aid organization logos, no readable handwriting, no stamps, no calculators, no people.

### Consequence Stills

Use these prompts for Records/Chronicle memory images. Each final image must be exactly `1280 x 720` px, converted to `.webp`, and dropped in `src/ui/map/assets/presidential_desk/consequence_stills/`. These are aftermath and memory stills, not decision prompts: quiet, resolved, documentary, and emotionally restrained. Do not show the player interface, a modal, a newspaper headline, a propaganda poster, combat, gore, or named historical people.

Shared negative prompt for every consequence still:

> readable text, readable numbers, headlines, captions, subtitles, labels, faction names, code names, insignia, flags, logos, watermarks, signatures, UI overlay, HUD, menu, black panel, poster layout, propaganda, modern computer, keyboard, printer, smartphone, people, faces, soldiers, weapons, gore, explosions, battlefield action, dramatic cinematic battle scene, clean stock photo, bright modern office

- `consequence_negotiated_settlement.webp`: Generate a `1280 x 720` px Records/Chronicle consequence still. Export final as `consequence_negotiated_settlement.webp` and later drop it in `src/ui/map/assets/presidential_desk/consequence_stills/`. Scene: empty negotiation table after a late meeting, two blank proposal folders left open, Bosnia-like territorial map sheets turned partly face-down, ashtray, pencil, cold coffee cup, dim practical office lighting, 1990s archival documentary realism. Leave a calm negative-space area for app-rendered record text. No readable text, no flags, no people, no triumphant symbolism.
- `consequence_reserve_deployment.webp`: Generate a `1280 x 720` px Records/Chronicle consequence still. Export final as `consequence_reserve_deployment.webp` and later drop it in `src/ui/map/assets/presidential_desk/consequence_stills/`. Scene: staff desk after reserve deployment approval, field radio handset resting idle, stacked blank movement papers, map with unreadable grease-pencil arrows, subdued green-brown military-office lighting, chair pushed back. It should imply the order has gone out without showing combat. No soldiers, no weapons, no insignia, no unit names, no readable numbers.
- `consequence_public_pressure.webp`: Generate a `1280 x 720` px Records/Chronicle consequence still. Export final as `consequence_public_pressure.webp` and later drop it in `src/ui/map/assets/presidential_desk/consequence_stills/`. Scene: government office desk with muted press-clipping shapes, telephone, unopened envelopes, blurred newspaper columns that cannot be read, soft grey daylight, restrained 1990s archival realism. The mood should suggest political pressure and scrutiny without a literal headline. No legible headlines, no protest crowd, no flags, no TV screen, no people.
- `consequence_humanitarian_access.webp`: Generate a `1280 x 720` px Records/Chronicle consequence still. Export final as `consequence_humanitarian_access.webp` and later drop it in `src/ui/map/assets/presidential_desk/consequence_stills/`. Scene: aid-access paperwork and an unlabeled route map on a worn desk, pencil laid across the map, blank form pages, paperclips, quiet daylight, desaturated documentary palette. It should feel administrative and sober, not heroic. No aid logos, no manifest table, no checklist grid, no readable handwriting, no convoy vehicles, no people.
- `consequence_personnel_change.webp`: Generate a `1280 x 720` px Records/Chronicle consequence still. Export final as `consequence_personnel_change.webp` and later drop it in `src/ui/map/assets/presidential_desk/consequence_stills/`. Scene: closed personnel folder after a staff decision, blank tab, obscured photo placeholder, desk lamp pool of light, files slightly rearranged, restrained 1990s office realism. It should imply a personnel action has been recorded, not expose a face or identity. No real faces, no readable classification stamps, no `PERSONNEL` text, no `SECRET` text, no modern computer, no printer.

## Implementation Rules

1. Do not make image cards replace top-level tabs. Navigation should remain text/icon based.
2. Every image slot needs a text-only fallback with identical action affordance.
3. Images must never contain readable invented labels, faction insignia, or historical people unless an explicit asset policy approves it.
4. Use images to separate decision families and resolved consequence records, not to obscure critical text.
5. Keep modal image height constrained so the decision options remain visible without scrolling on 1080p.

## Recommended First Asset Set

1. One Desk background.
2. Six decision family header strips:
   - diplomacy
   - military request
   - intelligence
   - humanitarian
   - personnel
   - paramilitary/internal security
3. Three consequence record stills:
   - negotiated settlement pressure
   - reserve deployment
   - public/international reaction

## Pushback On Image Cards As Tabs

Image cards can enrich the Desk packet, but should not replace tabs or primary navigation. Tabs need to be fast, stable, and readable. Image cards are better for decision cards, modal headers, or consequence records where the image is an affordance enhancer rather than the only locator.
