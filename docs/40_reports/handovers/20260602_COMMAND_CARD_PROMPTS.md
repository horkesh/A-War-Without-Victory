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

## Surfaces note (for whoever reconciles the GUI)

Two surfaces reference card art and have **diverged**:
- **Presidential-desk decision surface** (this brief): `src/ui/map/assets/presidential_desk/{decision_headers,packet_thumbnails,consequence_stills}/` — art exists, wired to the decision modals.
- **§9 command-strip** (`docs/plans/2026-06-01-presidential-command-surface-design.md`, built in #111): `CommandCard.tsx` loads `src/ui/map/assets/command_cards/<id>.webp` (empty but for `.gitkeep`).
If the command-strip is pursued, its cards should **reuse the families + style canon above** (map e.g. patron/diplomacy, authorize/military, convoy/humanitarian, replace-CO/personnel, internal-security/paramilitary), not a new style — and ideally share assets rather than duplicate them.

## Source references

- `docs/plans/2026-05-24-gui-ai-asset-brief.md` — **canonical prompts + negatives + paths.**
- `docs/plans/2026-06-01-presidential-command-surface-design.md` §9 — the newer command-strip surface (divergent ids/paths).
- Prior packs: `docs/40_reports/handovers/20260312_WARROOM_PROMPT_PACK_V2.md`, `20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md`, `docs/40_reports/implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md` (CRT removed), `docs/30_planning/design/{IMAGE_GENERATION_PROMPTS.md,ART_DIRECTION_OIL_PAINT_EVENTS.md,VISUAL_ASSET_STRATEGY.md}`.
