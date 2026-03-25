# Art Direction: Oil Paint Event & Codex Images

**Date:** 2026-03-25
**Source:** Pyrrhic team convene (Narrative Designer, UI/UX Developer, Modern Wargame Expert)
**Status:** APPROVED -- ready for production

---

## Style

Oil-paint remasters of Bosnian War photographic subjects. Classical war-painting gravitas applied to 1990s conflict. Not photorealistic, not cartoonish -- interpretive. The register of a historian's careful prose, rendered visually.

**Key attributes:**
- Visible impasto brushstrokes
- Dark, desaturated earth-tone palette
- No heroic compositions -- documentary gravitas
- Emphasis on places, objects, anonymous groups (not individuals)
- Muted colors: amber, rust, steel, olive, bone-white
- Atmospheric: fog, rain, winter light, harsh overhead fluorescent, dawn haze

**Reference artists:**
- Gerhard Richter's photo-paintings (photographs blurred into oil paint)
- John Singer Sargent's "Gassed" (classical war painting without glorification)
- This War of Mine loading screens (emotional tone, though charcoal not oil)

---

## Ethics Line

**NEVER depict:**
- Executions, mass graves, or torture
- Identifiable victims or real individuals' faces
- Children in danger or distress
- Graphic wounds or corpses
- Triumphalist military imagery (raised flags, heroic charges)
- Any specific faction's flag or insignia prominently featured

**ALWAYS:**
- Show faces from behind, in shadow, at distance, or abstracted by brushstrokes
- Use the oil-paint style to suggest rather than display
- Favor empty spaces, aftermath, waiting -- not the moment of violence itself
- Treat every image as a memorial, not an illustration

---

## UI Integration

**CSS filter chain** (applied to all event/Codex images):
```css
filter: saturate(0.45) sepia(0.15) brightness(0.75) contrast(1.1);
```

**Border:** `1px solid rgba(180, 160, 130, 0.2)` matching panel-border

**Bottom fade:** `linear-gradient(to bottom, transparent 70%, #1c1a17 100%)` overlaid

**Paper texture:** Existing paper-grain::before pseudo-element applied over images

---

## Dimensions

| Surface | Aspect Ratio | Display Size | Source Resolution (@2x) | Format |
|---------|-------------|-------------|------------------------|--------|
| Event Modal header | 2.5:1 | 560 x 224px | 1120 x 448px | WebP q80 |
| Codex essay header | 16:9 | 480 x 270px | 960 x 540px | WebP q80 |
| Wrapped/Verdict | 16:9 | 640 x 360px | 1280 x 720px | WebP q80 |

---

## Scope Tiers

| Tier | Count | Coverage | Bundle Size |
|------|-------|----------|-------------|
| Minimum Viable | 20 | 15 signature events + 5 category headers | ~1 MB |
| Ideal | 50-60 | All Tier 1 + Tier 2 + major Codex essays | ~3 MB |
| Premium | 100-120 | Every event + every essay + Wrapped + Verdict | ~6 MB |

---

## Production Pipeline

1. **Generate:** Midjourney v6.1 --style raw or Flux Pro
2. **Review:** Expert check for historical accuracy (uniforms, architecture, terrain, season)
3. **Post-process:** Crop to standard dimensions, apply desaturation/tone-mapping
4. **Name:** {event_id}.webp or {essay_id}.webp
5. **Place:** dist/tactical-map/assets/images/events/
6. **Credit:** "Event imagery generated with AI assistance, reviewed for historical accuracy"
7. **Replace:** Commission human artist for Tier 1 signature images if game reaches commercial release

---

## Image Categories

### Tier 1 -- Signature Events (15-20 images, unique per event)
Key historical moments. Full oil-paint treatment. The images players remember.

### Tier 2 -- Category Headers (8-12 images, reusable across events)
One per major event type:
- Military offensive (troops staging at dawn)
- Refugee displacement (column on a road)
- Siege life (civilians in winter)
- Political/diplomatic meeting (suited men, maps, cigarettes)
- International intervention (UN vehicles, airport)
- Ruins/aftermath (destroyed building, empty street)
- Corridor/supply (trucks on mountain road)
- Ethnic violence aftermath (empty village, abandoned belongings)

### Tier 3 -- Codex Essay Headers (20-30 images)
Smaller, more closely cropped. Historical subjects matching essay content.

---

## Placement Rules

- **Event Modal:** Header band above narrative text, inside modal. Bottom gradient fade.
- **Codex Panel:** Fixed header at top of essay content area. Scrolls with essay.
- **Chronicle Cards:** NO images. Keep intelligence-report density.
- **Verdict Screen:** One signature image (Dayton signing or empty courtroom).
- **Wrapped Overlay:** Final slide may use a full-bleed image.
