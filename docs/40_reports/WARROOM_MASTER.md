# AWWV Warroom Master Reference

**Purpose:** Single living reference for warroom status (scene, modals, hotspots, assets). Read first when starting warroom work; update during the session when completing warroom changes.

**Updated:** 2026-04-02

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
- **Player-facing label discipline:** Warroom-adjacent shells and overlays must resolve settlement/command labels through player-safe helpers. OPORDs, roster/history hover titles, and faction reports are not exempt just because they look like documents.

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
| **Unified room direction + military feel** | [handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md) — guidance doc for the hybrid model: same room per faction, yearly war aging preserves geometry, **desk map stays empty for overlay**, **date / next-turn board stays flat for overlay**, **flag baked into art**, archival-photo target |
| **Faction yearly rooms + overlay surfaces** | [handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md) — copy-paste prompt pack for `prewar/year1/year2/year3/year4` per faction; staff-map base template; Gemini measurement prompts; baked flag + projected map/date board |
| **External expert master handover (single file)** | [handovers/20260311_WARROOM_EXTERNAL_MASTER_HANDOVER.md](handovers/20260311_WARROOM_EXTERNAL_MASTER_HANDOVER.md) — consolidated brief: modals, prompt contracts, overlay alignment, assets, code entrypoints |
| **Six nano banana prompts (6 assets)** | [handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md](handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md) — 2752×1536, prewar+war × RBiH/RS/HRHB, copy-paste blocks and modal placeholders |
| **Overlay alignment + RBiH symbolism** | [handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md](handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md) — flat/frontal flag & calendar zones, RBiH-era only on documents |
| **Warroom implementation (scene, hotspots, identity)** | [implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md) — scene-plate contract, physical anchors, faction voice |
| **Comprehensive GUI review (player perspective)** | [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) — warroom recommendations, faction fantasy |
| **GUI expert advice (what to change)** | [handovers/GUI_EXPERT_ADVICE_WHAT_TO_CHANGE.md](handovers/GUI_EXPERT_ADVICE_WHAT_TO_CHANGE.md) — P0/P1 recommendations including IVP breakdown |
| **Code entrypoints** | `src/ui/warroom/` — warroom.ts, ClickableRegionManager.ts, components/*.ts, data/*.ts |

---

## Current status (summary)

- **Scene:** Fixed plate **2752×1536**; faction-keyed background image. Current direction: **15 room images total** (`prewar/year1/year2/year3/year4` × 3 factions), **flag baked into room art**, **desk map projected as runtime overlay**, **date / next-turn board projected as runtime overlay**. Ticker/UI chrome remains engine-side as needed.
- **Hotspots:** Physical anchors drive routing; **twelve-anchor contract** for baked plates (see [20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md) §3a). Implemented today: `wall_flag_area`, `desk_map`, `wall_calendar_area`, `command_briefing_folio`, `newspaper_stack`, `intelligence_journal`, `diplomatic_telephone`, `desk_radio`. **Planned anchors** (region JSON + ClickableRegionManager when modals land): `commander_coatrack`, `enclave_dispatch_folder`, `intelligence_packet`, `honors_memorial`. Legacy action strings kept for compatibility.

**Canonical anchor → modal mapping (definitive).** Room art must show **twelve distinct physical anchors** on the first bake so hotspot outlining never merges props. Items 1–8 are implemented; 9–12 are prompt-ready for P1 modals.

**Flag (precise — avoid flat/pinned flag):** The flag must **hang down** from the pole: attached at or near the top of the pole, the cloth **drops vertically downward** under gravity (like a normal indoor flag). Do **not** show the flag stretched flat against the wall, pinned flat, taut horizontally, stiffened, or displayed like a banner. It must **hang down** from the pole.

| Anchor ID | Room object (what to draw) | Modal / behavior |
|-----------|----------------------------|------------------|
| wall_flag_area | Flag on pole (baked), fully visible | Faction Overview |
| wall_calendar_area | Date / next-turn board (blank, flat, fully in frame) | Advance turn; runtime overlays date |
| desk_map | Large cork board (map placeholder only, empty) | Primary/tactical map; runtime projects map |
| command_briefing_folio | Binders / folders on desk | Reports (command briefing) |
| newspaper_stack | Stack of newspapers (faction masthead) | Newspaper modal |
| intelligence_journal | Separate journal or magazine (distinct from newspaper) | Intelligence Journal / Magazine modal |
| diplomatic_telephone | Telephone on desk | Diplomacy modal |
| desk_radio | Radio on desk | News ticker |
| commander_coatrack | Coatrack + military cap + uniform jacket hanging | Commander Register (planned) |
| enclave_dispatch_folder | Single folder, urgent tag/elastic/stamp | Enclave Crisis (planned) |
| intelligence_packet | Sealed envelope stack / typed-report packet | Turn-End Intelligence Packet (planned) |
| honors_memorial | Shelf/corner: citation booklet with ribbon; medal ribbon bar; no framed photos; no candle | Honors and Memorials (planned) |

- **Region data:** Click/hover geometry is in `public/data/ui/hq_clickable_regions.json`. Region bounds must match the scene plate; default JSON has `options.calendar_baked_in_art: true` so the runtime does not draw a second calendar when the room art already shows one. For a different room layout, use a custom region file (see § Region data and new room layout).
- **Modals (implemented):** Newspaper, Magazine, Reports, Diplomacy, Faction Overview (COMMAND + commander assignment), Advance turn confirmation, Declaration event, War begins, Settings (placeholder), Help (warroom controls), “Line dead” (diplomacy in peace).
- **Command-shell truth (2026-04-02):** Reports now use generic player-safe headquarters authorship instead of fake-specific section names, and Command Briefing derives its warnings from the extracted Warroom snapshot instead of hardcoded enclave/convoy claims.
- **Density direction (2026-04-02):** Warroom modal chrome has been tightened to better match the tactical shell. The intended direction is command-console density, not roomy dashboard spacing.
- **Commander assignment:** **Warroom only** — Faction Overview (wall flag) → COMMAND section → CHANGE → ASSIGN COMMANDER modal. Map UI displays only; no assignment there. IPC: `assign-commander`.
- **Shell relationship:** Tactical-map top-shell history access now routes through Army HQ / Codex instead of orphan top-level history modals; Warroom remains the strategic shell and return destination, not a second owner of Army HQ records.

---

## Modals: implemented vs proposed

### Implemented (current)

| Modal | Anchor ID | Short description |
|-------|------------|--------------------|
| Newspaper | newspaper_stack | Faction newspaper, T-1 events; start brief on load |
| Magazine (Intelligence Journal) | intelligence_journal | Monthly operational review, game stats |
| Reports (Command Briefing) | command_briefing_folio | Situation reports; pre-war mun intel, war-phase operational briefs |
| Diplomacy | diplomatic_telephone | Belgrade/Zagreb/Alliance channels; war only (peace → “Line dead”) |
| Faction Overview | wall_flag_area | Faction stats, COMMAND (officers + CHANGE → ASSIGN COMMANDER) |
| Advance turn | wall_calendar_area | Confirmation, staged investments, preview |
| Primary/tactical map | desk_map | Map view (cork board = projection surface) |
| News ticker | desk_radio | Radio toggle |
| Declaration event | after advance (Phase 0) | Full-screen critical events (RS/HRHB declaration, referendum) |
| War begins | peace→war transition | Full-screen “War begins” |
| Settings | toolbar | Audio/Video settings dialog |
| Help | toolbar | Warroom controls list |
| Command Briefing | command_briefing_folio | “What matters now”: urgent decisions, front alarms, convoy questions, enclave warnings; when IVP ≥60% or consequences active, footer button opens IVP breakdown |
| Operational Situation | desk_map | Op health, sector stress, logistics, routes to tactical map |
| Diplomatic Press Briefing (IVP) | diplomatic_telephone (footer button) | Composite IVP + four weighted components (Sarajevo siege, enclave pressure, displacement visibility, negotiation momentum), thresholds 30/60/80%, active consequences; war only |
| Commander Selection | command_briefing_folio (via OpsPlanningModal) | Officer roster with competence/aggressiveness ratings, regional fit, prep-time estimates; triggered from OpsPlanningModal submission |
| Operation Briefing | command_briefing_folio (via CorpsFrontPanel) | Readiness gauges, commander assessment, Launch/Probe/Postpone/Abort actions; triggered from CorpsFrontPanel assessment-ready button |

### Proposed (not yet implemented)

From [nano banana brief](handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) §7 and [GUI expert advice](handovers/GUI_EXPERT_ADVICE_WHAT_TO_CHANGE.md):

| Priority | Proposed modal | One-line description |
|----------|----------------|----------------------|
| P1 | Turn-End Intelligence Packet | Front changes, enemy intent, humanitarian pressure, political risk, attention points |
| P1 | Enclave Crisis Modal | Enclave resilience, isolation trend, airdrop posture, humanitarian risk |
| P1 | Honors and Memorials Modal | Sacrifice, recognition, memory, faction continuity |
| P1 | Commander Register Modal | Commanders, assignments, competence, notable service — **anchor:** `commander_coatrack` (cap/uniform on coatrack) |

**Bake-in note:** All four P1 rows should be authored into the **same** scene plate up front (no second generation pass). Prompt pack updated in clean-room handover §3a + RS blocks 9.6–9.10.

---

## Known gaps / placeholder flows (Phase E Trust-and-Baseline)

Documented so future work can prioritise. See also [GUI_MASTER.md](GUI_MASTER.md) “Recent GUI changes” and state-of-game evaluation.

| Gap | Description | Where |
|-----|-------------|--------|
| Warroom smoke automation | “Load warroom → select map → no crash” is covered by unit test (desk_map click invokes tactical-map handler). Full browser/Electron smoke is manual or e2e. | Phase E deliverable |

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
| 2026-04-02 | **Warroom command shell truth + density pass:** Reports now use generic player-safe headquarters authorship instead of fake-specific section names; Command Briefing now derives warnings from the extracted command snapshot instead of hardcoded enclave/convoy certainty; Operational Situation and help copy were clarified; shared modal spacing tightened. | [implemented/20260402_WARROOM_COMMAND_SHELL_TRUTH_AND_DENSITY_PASS.md](implemented/20260402_WARROOM_COMMAND_SHELL_TRUTH_AND_DENSITY_PASS.md) |
| 2026-04-02 | **Army HQ summary player-truth alignment:** the tactical-map/Army-HQ summary surface no longer behaves like an all-faction debug scoreboard. Own-side exact values remain; enemy-wide totals are pushed back into staff abstractions and reports. | [implemented/20260402_ARMY_HQ_WAR_SUMMARY_PLAYER_TRUTH.md](implemented/20260402_ARMY_HQ_WAR_SUMMARY_PLAYER_TRUTH.md) |
| 2026-03-12 | **Operation Preparation System UI wired:** CommanderSelectionModal (officer roster with competence/aggressiveness, regional fit, prep-time estimates) + OperationBriefingModal (readiness gauges, commander assessment, Launch/Probe/Postpone/Abort actions) now connected via IPC to operation state machine. Triggered from OpsPlanningModal submission and CorpsFrontPanel assessment-ready button. | This file § Modals |
| 2026-03-10 | **Twelve-anchor contract:** Prompt pack expanded from eight to twelve baked props — coatrack+cap/uniform (`commander_coatrack`), urgent folder (`enclave_dispatch_folder`), sealed packet (`intelligence_packet`), honors shelf/frame (`honors_memorial`). RS §9.6–9.10 blocks and shared core updated; §3a table in clean-room handover. | [20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md) §3a |
| 2026-03-09 | **Phase 2 Completion (Modals):** Implemented `CommandBriefingModal` (linked to `command_briefing_folio`), `OperationalSituationModal` (linked to `desk_map`), and functional `SettingsModal` (toolbar). Removed placeholder routing. | This file § Modals |
| 2026-03-08 | **Canonical anchor → modal mapping:** Added definitive table in § Current status: eight anchors (wall_flag_area, wall_calendar_area, desk_map, command_briefing_folio, newspaper_stack, intelligence_journal, diplomatic_telephone, desk_radio) with room object and modal for each. Fixed Implemented table so Reports = command_briefing_folio, Magazine = intelligence_journal. Prompts must show all eight distinct props. | This file § Current status, § Modals |
| 2026-03-08 | **Missing shared regions file no longer black-screens startup:** Initial region loading is now non-fatal and tries multiple candidates (`override`, shared default, then faction files). This prevents `init()` from aborting when `hq_clickable_regions.json` is intentionally removed and only faction-specific files remain. | warroom.ts, this file |
| 2026-03-08 | **Early Electron bridge init:** `window.awwv` is now read at the start of `init()` instead of after later async warroom/map loading. This fixes a startup race where clicking **New Campaign** quickly could hit `Desktop bridge unavailable.` before the preload bridge had been assigned to `this.desktopBridge`. | warroom.ts, this file |
| 2026-03-08 | **Faction-specific region files:** Warroom loads `hq_<faction>_clickable_regions.json` (e.g. `hq_rbih_clickable_regions.json`, `hq_rs_clickable_regions.json`, `hq_hrhb_clickable_regions.json`) when game state has a player faction; falls back to default if missing. Staging script copies all three faction files from repo root `data/ui/`. Override still used at init when no faction is known. | warroom.ts, warroom_stage_assets.ts, WARROOM_MASTER |
| 2026-03-08 | **Region file config + calendar overlay:** (1) Region URL is configurable via `window.__awwvWarroomRegionsUrl` so new room art can use a custom region JSON with measured quads. (2) Region JSON supports `options.calendar_baked_in_art: true`; when set, runtime does not draw the calendar overlay (avoids duplicate/mismatch when art has calendar baked). Default `hq_clickable_regions.json` now has this option set. (3) WARROOM_MASTER § Region data and new room layout added. | warroom.ts, ClickableRegionManager.ts, WARROOM_MASTER |
| 2026-03-08 | **Flag no longer drawn as sprite:** Removed runtime flag overlay so room art is not obscured. Per clean-room handover and WARROOM_MASTER, flag is baked into room art; only calendar (and future desk map / date board) are runtime overlays. `renderFlag()` removed; `wall_flag_area` remains for click/tooltip (Faction Overview). | warroom.ts, this file |
| 2026-04-02 | **Enemy-contact reporting made player-safe:** `extractWarData()` now emits abstract hostile contact labels for Warroom use, and Reports/Magazine enemy-assessment surfaces consume those labels instead of exact enemy formation names. This keeps Warroom acting like a headquarters shell rather than a debug console. | [20260402_ENGINE_HEALTH_WAVE1_CORRECTNESS_FIXES.md](implemented/20260402_ENGINE_HEALTH_WAVE1_CORRECTNESS_FIXES.md) |
| 2026-03-08 | **Faction yearly rooms + overlay surfaces:** Current direction. Generate one stable room per faction, then derive `prewar/year1/year2/year3/year4` with yearly aging while preserving geometry; bake the flag into room art; keep the desk-map zone empty for projection; use a flat date / next-turn board for overlay; target archival/documentary photorealism. | [handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md) |
| 2026-03-08 | **Unified room direction:** Guidance/reference doc updated to support the hybrid model rather than “everything painted except calendar.” Same room per faction, war follow-up preserves geometry, military-feel guidance retained. | [handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md) |
| 2026-03-07 | **Six nano banana prompts:** 6 detailed prompts (prewar+war × RBiH/RS/HRHB), 2752×1536, modal placeholders, copy-paste blocks | [handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md](handovers/20260307_WARROOM_SIX_NANO_BANANA_PROMPTS.md) |
| 2026-03-07 | **Overlay alignment + RBiH symbolism:** Flat/frontal flag & calendar zones; RBiH-era only on documents; prompts and brief updated | [handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md](handovers/20260307_WARROOM_OVERLAY_ALIGNMENT_AND_CREST.md) |
| 2026-03-07 | **Peace vs war:** Separate room (6 assets) and modal systems; design decision and gates | This file § Peace vs war |
| 2026-03-07 | Scene-plate contract, hotspot anchors, faction identity | [20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md) |
| 2026-03-07 | Nano banana brief: single-image pipeline, proposed modals §7 | [handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md](handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md) |

---

## Region data and new room layout

Overlays (e.g. calendar) and click/hover hotspots use **region geometry** from a JSON file. If the scene plate changes (new room art with different positions for corkboard, whiteboard, flag, desk props), that geometry will be wrong until the region data is updated.

- **Default region file:** `public/data/ui/hq_clickable_regions.json` (or repo root `data/ui/` for build). It includes `options.calendar_baked_in_art: true` so the runtime does **not** draw a calendar overlay when the room art already has a calendar baked in (avoids duplicate/mismatched calendar).
- **Faction-specific region files (preferred):** The warroom loads **per-faction** region data when a game state with a player faction is present. Place one file per faction in the same folder as the default:
  - **RBiH:** `hq_rbih_clickable_regions.json`
  - **RS:** `hq_rs_clickable_regions.json`
  - **HRHB:** `hq_hrhb_clickable_regions.json`
  If a faction file is missing, the runtime falls back to the default `hq_clickable_regions.json`. At init (before any campaign is loaded) the override or default is used; once state arrives, the matching faction file is loaded.
  - **Dev** (`npm run dev:warroom`): place in `src/ui/warroom/public/data/ui/` or rely on repo-root fallback (`data/ui/`).
  - **Electron/desktop build:** place in repo root `data/ui/`. Run `npm run warroom:build` so `tools/ui/warroom_stage_assets.ts` copies them into `dist/warroom/data/ui/`.
- **Optional single override:** If `hq_clickable_regions_override.json` exists, it is used at init when no faction is known. Faction-specific files still take precedence once state is loaded.
- **Optional:** Set `window.__awwvWarroomRegionsUrl` before the warroom script runs to force a single URL (disables faction-specific loading).

---

## Gates / discipline

- **Single scene plate:** Warroom remains one scene plate per faction/phase for room art, but current direction allows **projected information surfaces** inside that plate: desk map and date / next-turn board. See [handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md).
- **Overlay alignment:** Current direction is **desk map projected into the desk quad** and **date / next-turn board projected into the wall-board quad**. The **flag is baked into the art** and is **no longer drawn as a runtime sprite** (code updated 2026-03-08 so overlays do not obscure corkboard/whiteboard regions). Keep overlay surfaces flat/frontal where required and preserve measured quad geometry.
- **Symbolism:** In-scene documents, binders, stamps must use **RBiH-era (1992–1998)** only; no post-1998 BiH crest. See same handover.
- **Peace vs war:** Modal logic remains split between **prewar** and **war**, but current art direction expands war visuals into yearly states: `prewar` + `year1/year2/year3/year4` per faction. War modals stay the same from April 1992 onward; only the room art ages by year.
- **Hotspot contract:** Use physical anchor ids for new behavior; legacy action strings are compatibility only.
- **Commander assignment:** Stays in Warroom Faction Overview → COMMAND; do not duplicate assignment UI in map without design decision.
- **New warroom modals:** Align with proposed list above and nano banana §7 when adding; update this table when a proposed modal is implemented. Add to the correct set (peace and/or war).

---

*For overall GUI status use [GUI_MASTER.md](GUI_MASTER.md). For calibration use [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md). For thematic decisions see docs/PROJECT_LEDGER_KNOWLEDGE.md and .claude/napkin.md § GUI / HoI Map.*
