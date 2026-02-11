# External Expert Handover — AWWV Project

**Date:** 2026-02-08  
**Audience:** External expert hired to continue work on A War Without Victory (AWWV)  
**Purpose:** Single entry point for project state, what is done, what needs to be done, and how to work within the project’s rules.

---

## 1. What This Project Is

**A War Without Victory (AWWV)** is a deterministic, turn-based wargame simulation prototype set in the Bosnian conflict (early 1990s). One turn = one week. The simulation has three phases: **Phase 0** (pre-war, referendum, declaration), **Phase I** (early war, militia/brigade emergence, control flips, displacement), and **Phase II** (fronts, AoR, supply, pressure, negotiation). Canon documents define all mechanics; code must follow canon. No randomness in the core pipeline; all ordering is stable for reproducibility.

---

## 2. Where We Are

- **MVP declared (2026-02-08).** Executive Roadmap Phase 6 is complete; scope is frozen. All gates are green: `npm run typecheck`, `npm test`, `npm run test:baselines`, `npm run warroom:build`.
- **Phases 0–5** are done: GUI MVP foundation, validation, deterministic replay, canon war start, turn pipeline → GUI integration, map & data authority. **Phase 7** (post-MVP) is explicitly deferred; work beyond MVP must be scoped as post-MVP and not pulled into MVP.
- **Canon vs implementation:** All 11 systems from the Systems Manual are designed and have state/code. Five are fully wired (External Patron/IVP, Enclave Integrity, Sarajevo Exceptions, AoR Formalization, Contested Control). Six are partially wired (Arms Embargo, Heavy Equipment/Maintenance, Legitimacy, Negotiation Capital, Tactical Doctrines, Capability Progression). Phases 0, I, and II are implemented.
- **Recent mechanics (2026-02-08):** Phase I displacement is now applied on municipality control flip (when Hostile_Population_Share > 0.30): one-time displacement, routing to friendly muns, killed/fled-abroad when 1991 census is used. Brigade movement/combat are defined as the existing pressure–breach–control-flip pipeline (no separate step). AoR assignment is documented (Phase II init from control + formation home muns; flip updates).

---

## 3. What Is Done (Summary)

| Area | Status | Reference |
|------|--------|-----------|
| **Simulation core** | Deterministic turn pipeline; Phase 0, I, II; scenario runner; baseline regression | `src/sim/turn_pipeline.ts`, `src/scenario/scenario_runner.ts`, `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` |
| **Warroom GUI** | Interactive command room, calendar advance, map scene, modals, faction overview; build stable | `src/ui/warroom/`, `docs/40_reports/WARROOM_GUI_IMPLEMENTATION_REPORT.md` |
| **Tactical Map** | Standalone map app: base map, political control, contested, formations, settlement panel, zoom | `src/ui/map/`, `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `npm run dev:map` (port 3001) |
| **Map & data** | A1 base map STABLE; 1990 municipalities; settlement graph; political control data; canonical build path | `docs/20_engineering/MAP_BUILD_SYSTEM.md`, `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md` |
| **Formations / OOB** | Historical OOB (brigades, corps) at Phase I entry; emergent spawn from pools; HQ placement; displacement tracking | `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md`, `src/state/displacement.ts` |
| **Canon** | Phase specs, Engine Invariants, Systems Manual v0.4, Rulebook, Game Bible; Phase I §4.3–§4.4 displacement | `docs/10_canon/` |
| **Knowledge base** | Index of `docs/50_research/` (markdown, code, PDFs); PDF extracts exist but are not reliably readable | `docs/50_research/README_KNOWLEDGE_BASE.md` |

---

## 4. What Needs to Be Done (Post-MVP and Open Items)

**Post-MVP (Phase 7, do not pull into MVP):** Dynamic newspapers/reports, corps/unit viz at map zoom, desperation visuals/props/sound, diplomacy panel (Phase II+). See `docs/30_planning/EXECUTIVE_ROADMAP.md` Phase 7.

**Open priorities (to be sequenced by product/owner):**

1. **50_research PDFs:** Current text extracts are not suitable for content study (encoding/glyph issues). Options: add Poppler (pdftotext) for extraction, or have a human extract bullets from high-priority PDFs (Control_* v2, CORRECTED_CORPS_SUPPLY_RESEARCH, COMPLETE_SYSTEM_SUMMARY, MASTER_*) and add to the knowledge base or canon. See `docs/40_reports/PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md`.
2. **Partial systems (2, 3, 4, 7, 9, 10):** Six systems have state and some consumers but are not fully wired (e.g. full turn-order hooks, downstream behaviour). Completing them is post-MVP and should follow canon.
3. **GUI backlog:** Prioritized in `docs/50_research/gui_improvements_backlog.md` (P0/P1/P2). Map-only external expert deliverable is documented in `docs/40_reports/GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md` (standalone map app; warroom out of scope for that phase).
4. **Single next priority:** Not yet fixed. A product or project owner should set the order of (a) PDF extraction, (b) partial-system wiring, (c) GUI backlog, and record it (e.g. in the third state-of-game meeting doc or the ledger).

---

## 5. Key Docs to Read First

| Doc | Use |
|-----|-----|
| **docs/PROJECT_LEDGER.md** | Authoritative project state, non-negotiables, changelog. Read "Non-negotiables" and "Current Phase". |
| **.agent/napkin.md** | Session-start read. Corrections, patterns, domain notes; update as you work. |
| **docs/20_engineering/CODE_CANON.md** | Canon precedence, determinism contract, entrypoints, contradiction protocol. |
| **docs/20_engineering/REPO_MAP.md** | Where code lives; "Change X → Go Here". |
| **docs/20_engineering/PIPELINE_ENTRYPOINTS.md** | Canonical entrypoints; turn pipeline vs canon systems. |
| **docs/10_canon/** | Phase specs, Engine Invariants, Systems Manual — do not contradict; if canon is silent, ask. |
| **docs/30_planning/EXECUTIVE_ROADMAP.md** | Phases 0–7; MVP = Phase 6 complete; Phase 7 = post-MVP. |
| **docs/30_planning/MVP_CHECKLIST.md** | MVP scope and gates; post-MVP items. |

**If your remit is GUI/map only:** Start with `docs/40_reports/GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md` and `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`.

**If your remit is simulation/mechanics:** Start with `docs/10_canon/Phase_Specifications_v0_4_0.md`, `docs/10_canon/Systems_Manual_v0_4_0.md`, and `src/sim/turn_pipeline.ts`.

---

## 6. Rules You Must Follow

- **Canon precedence:** Canon documents are authoritative. If code conflicts with canon, change code (or follow the contradiction protocol in CODE_CANON). Do not invent new mechanics; if canon is silent, ask.
- **Determinism:** No timestamps, no Math.random in the core pipeline; stable ordering for all collections; byte-identical replay for identical inputs.
- **Ledger:** Any change that affects behaviour, data outputs, or scenarios requires an entry in `docs/PROJECT_LEDGER.md`. Docs-only changes may still need a ledger entry; when unclear, ask.
- **Do not edit FORAWWV.md** unless explicitly authorised.
- **Napkin:** Read `.agent/napkin.md` at session start; update it after significant changes or discoveries.
- **Commit discipline:** Group changes by phase/scope; one commit per phase when possible. If multiple phases are touched, clarify split before committing.

---

## 7. Domain-Specific Handovers

| Focus | Handover doc |
|-------|----------------|
| **GUI creation (map-only phase)** | [GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md](GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md) — standalone map application; warroom out of scope. |
| **War Planning Map / full scene** | [PARADOX_WAR_PLANNING_MAP_FULL_SCENE_TEAM_CONVENE.md](PARADOX_WAR_PLANNING_MAP_FULL_SCENE_TEAM_CONVENE.md), [GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md](GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md). |
| **Tactical map (canonical map viewer)** | [docs/20_engineering/TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md). |
| **State of game (third convening)** | [PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md) — knowledge base, canon audit, next steps. |
| **Militia/brigade design and rework** | [MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md](MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md), [docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md](../20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md). |

---

## 8. Short Summary (Elevator Version)

**Where we are:** MVP is declared and frozen. Deterministic simulation (Phase 0, I, II), warroom GUI, tactical map, map data, formations, displacement, and canon are in place. All 11 systems are designed and implemented to some degree; five fully wired, six partially wired.

**What needs to be done:** Post-MVP work (Phase 7) and open priorities: (1) make 50_research PDF content usable (Poppler or human extraction), (2) fully wire the six partial systems if desired, (3) execute GUI backlog (including map-only deliverable if that is the remit). The single next priority should be set and recorded by the product/project owner.

**How to work:** Read Ledger, napkin, CODE_CANON, and canon; preserve determinism and canonical precedence; update the ledger for behaviour/output changes; do not edit FORAWWV; use the handover doc that matches your remit.
