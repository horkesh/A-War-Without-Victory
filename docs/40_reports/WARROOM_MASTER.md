# AWWV Warroom Master Reference

**Purpose:** Single living reference for warroom status (scene, modals, hotspots, assets). Read first when starting warroom work; update during the session when completing warroom changes.

**Updated:** 2026-03-07

**Relationship:** Warroom is part of the canonical GUI. For overall GUI status use [GUI_MASTER.md](GUI_MASTER.md). This document is the warroom-specific control file — one place to see what exists, what’s proposed, and where to record changes.

---

## Peace vs war: separate systems (design decision)

**Principle:** Modals and the room must differ between **prewar (peace)** and **war**. We have two distinct systems, not one system with phase-gated content only.

### Room (scene plate)

- **Two room types:** A **prewar room** and a **war room** — same layout and hotspot positions for consistency, but different art and tone.
  - **Prewar:** Institutional, preparatory, tense; capital/organization focus; no combat maps or frontline clutter.
  - **War:** Operational, maps, reports, pressure; frontline and logistics in view.
- **6 warroom assets:** One image per **(phase × faction)**.
  - **Phases:** prewar, war (2).
  - **Factions:** RBiH, RS, HRHB (3).
  - **Total:** 6 scene plates — e.g. `warroom_prewar_RBiH`, `warroom_war_RBiH`, `warroom_prewar_RS`, `warroom_war_RS`, `warroom_prewar_HRHB`, `warroom_war_HRHB` (exact filenames TBD; naming convention: `warroom_{phase}_{faction}`).
- **Runtime:** Scene plate is selected by `meta.phase` (peace → prewar, war → war) and `player_faction`; hotspot geometry stays aligned across all 6 so one region JSON can serve both phases per faction, or we maintain phase-specific region files if anchors ever diverge.

### Modals

- **Two modal systems:** **Peace modal set** and **War modal set.** Some modals appear in both but with different content; some are phase-exclusive.
- **Peace-only (examples):** Phase 0 prep brief, declaration pressure, pre-war Reports (mun intel), “Line dead” for telephone (no diplomacy). Advance turn in peace shows capital/investment preview.
- **War-only (examples):** Real Diplomacy (Belgrade/Zagreb/Alliance), Command Briefing, Operational Situation, IVP breakdown, Turn-End Intelligence, Enclave Crisis, Honors/Memorials (when implemented). Advance turn in war shows combat/stability preview.
- **Shared with different content:** Newspaper (Phase 0 events vs war headlines), Magazine (pre-war org review vs war operational review), Reports (mun intel vs operational briefs), Faction Overview (capital/org vs territory/military/command).
- **Implementation:** Modal *routing* (which modal opens for a hotspot) and *content* both depend on `meta.phase`. Prefer explicit “peace modal set” vs “war modal set” in code (e.g. hotspot → modal mapping keyed by phase) so adding phase-exclusive modals stays clear.

### Summary

| Dimension    | Peace (prewar)     | War                |
|-------------|--------------------|--------------------|
| **Room**    | Prewar plate (×3)  | War plate (×3)     |
| **Modals**  | Peace set          | War set            |
| **Assets**  | 3 prewar images    | 3 war images → **6 total** |

---

## Where to look

| Need | Go to |
|------|--------|
| **Scene plate + asset-generation brief** | [handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) — single-image warroom, hotspot mapping, modal anchors, generation rules |
| **Six nano banana prompts (6 assets)** | [handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md](handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md) — 2752×1536, prewar+war × RBiH/RS/HRHB, copy-paste blocks and modal placeholders |
| **Overlay alignment + RBiH symbolism** | [handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md](handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md) — flat/frontal flag & calendar zones, RBiH-era only on documents |
| **Warroom implementation (scene, hotspots, identity)** | [implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md) — scene-plate contract, physical anchors, faction voice |
| **Comprehensive GUI review (player perspective)** | [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) — warroom recommendations, faction fantasy |
| **GUI expert advice (what to change)** | [handovers/GUI_EXPERT_ADVICE_WHAT_TO_CHANGE.md](handovers/GUI_EXPERT_ADVICE_WHAT_TO_CHANGE.md) — P0/P1 recommendations including IVP breakdown |
| **Code entrypoints** | `src/ui/warroom/` — warroom.ts, ClickableRegionManager.ts, components/*.ts, data/*.ts |

---

## Current status (summary)

- **Scene:** Fixed plate **2752×1536**; faction-keyed background image. Only **flag**, **calendar**, and **ticker** are separate runtime overlays. No separate room sprites/props.
- **Hotspots:** Physical anchors drive routing: `wall_flag_area`, `command_briefing_folio`, `newspaper_stack`, `intelligence_journal`, `diplomatic_telephone`, `desk_radio`, `wall_calendar_area`. Legacy action strings kept for compatibility.
- **Modals (implemented):** Newspaper, Magazine, Reports, Diplomacy, Faction Overview (COMMAND + commander assignment), Advance turn confirmation, Declaration event, War begins, Settings (placeholder), Help (warroom controls), “Line dead” (diplomacy in peace).
- **Commander assignment:** **Warroom only** — Faction Overview (wall flag) → COMMAND section → CHANGE → ASSIGN COMMANDER modal. Map UI displays only; no assignment there. IPC: `assign-commander`.

---

## Modals: implemented vs proposed

### Implemented (current)

| Modal | Trigger | Short description |
|-------|---------|--------------------|
| Newspaper | newspaper_stack / desk | Faction newspaper, T-1 events; start brief on load |
| Magazine | open_magazine_modal | Monthly operational review, game stats |
| Reports | intelligence_journal / report stack | Situation reports; pre-war mun intel, war-phase operational briefs |
| Diplomacy | diplomatic_telephone | Belgrade/Zagreb/Alliance channels; war only (peace → “Line dead”) |
| Faction Overview | wall_flag_area | Faction stats, COMMAND (officers + CHANGE → ASSIGN COMMANDER) |
| Advance turn | calendar | Confirmation, staged investments, preview |
| Declaration event | after advance (Phase 0) | Full-screen critical events (RS/HRHB declaration, referendum) |
| War begins | peace→war transition | Full-screen “War begins” |
| Settings | toolbar | Placeholder “coming soon” |
| Help | toolbar | Warroom controls list |

### Proposed (not yet implemented)

From [nano banana brief](handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) §7 and [GUI expert advice](handovers/GUI_EXPERT_ADVICE_WHAT_TO_CHANGE.md):

| Priority | Proposed modal | One-line description |
|----------|----------------|----------------------|
| P0 | Command Briefing Modal | “What matters now”: urgent decisions, front alarms, convoy questions, enclave warnings, op failures (folio hotspot; currently opens Reports) |
| P0 | Operational Situation Modal | Desk-map anchor: route to map, op health, sector stress, logistics, front summary |
| P0 | Diplomatic Press Briefing (IVP) | IVP value → causes (civilian casualties, territorial aggression, shelling); expert asks dedicated panel/modal |
| P1 | Turn-End Intelligence Packet | Front changes, enemy intent, humanitarian pressure, political risk, attention points |
| P1 | Enclave Crisis Modal | Enclave resilience, isolation trend, airdrop posture, humanitarian risk |
| P1 | Honors and Memorials Modal | Sacrifice, recognition, memory, faction continuity |
| P1 | Commander Register Modal | Commanders, assignments, competence, notable service |

---

## When working warroom

1. **Read this file first** before starting warroom changes (modals, hotspots, scene, assets).
2. **Update this file during the session** when you complete a warroom slice (e.g. add a row under “Recent warroom changes”, refresh “Current status” if needed).
3. **Link implementation reports** from CONSOLIDATED_IMPLEMENTED and 40_reports README; add a row here with date and report path.
4. **Propagate to** GUI_MASTER.md “Recent GUI changes” when the change affects overall GUI status; keep nano banana brief in sync if you change modal list or hotspot contract.

---

## Recent warroom changes

| Date | Change | Report / reference |
|------|--------|--------------------|
| 2026-03-07 | **Six nano banana prompts:** 6 detailed prompts (prewar+war × RBiH/RS/HRHB), 2752×1536, modal placeholders, copy-paste blocks | [handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md](handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md) |
| 2026-03-07 | **Overlay alignment + RBiH symbolism:** Flat/frontal flag & calendar zones; RBiH-era only on documents; prompts and brief updated | [handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md](handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md) |
| 2026-03-07 | **Peace vs war:** Separate room (6 assets) and modal systems; design decision and gates | This file § Peace vs war |
| 2026-03-07 | Scene-plate contract, hotspot anchors, faction identity | [20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md) |
| 2026-03-07 | Nano banana brief: single-image pipeline, proposed modals §7 | [handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) |

---

## Gates / discipline

- **Single scene plate:** Warroom is one image (or one plate per faction); modal regions outlined afterward. No separate desk/wall props, folders, lamps, radios in the scene. See nano banana brief §4.
- **Overlay alignment:** Flag and calendar are drawn by the engine as flat 2D rectangles. Scene plates must show the flag zone and calendar zone as **flat and frontal** (facing the camera, no perspective tilt) so overlays align. See handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md.
- **Symbolism:** In-scene documents, binders, stamps must use **RBiH-era (1992–1998)** only; no post-1998 BiH crest. See same handover.
- **Peace vs war:** Separate **room** (6 assets: prewar + war × RBiH, RS, HRHB) and separate **modal systems** (peace set vs war set). Scene plate selection = f(phase, faction); modal routing and content = f(phase). See “Peace vs war: separate systems” above.
- **Hotspot contract:** Use physical anchor ids for new behavior; legacy action strings are compatibility only.
- **Commander assignment:** Stays in Warroom Faction Overview → COMMAND; do not duplicate assignment UI in map without design decision.
- **New warroom modals:** Align with proposed list above and nano banana §7 when adding; update this table when a proposed modal is implemented. Add to the correct set (peace and/or war).

---

*For overall GUI status use [GUI_MASTER.md](GUI_MASTER.md). For calibration use [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md). For thematic decisions see docs/PROJECT_LEDGER_KNOWLEDGE.md and .claude/napkin.md § GUI / HoI Map.*
