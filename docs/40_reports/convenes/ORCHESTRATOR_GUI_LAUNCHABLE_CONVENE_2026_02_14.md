# Orchestrator — Launchable GUI convene (play + rewatch)

**Date:** 2026-02-14  
**Goal:** Plan for a working, **launchable** (non-web) GUI so the user can **play the game myself** and **rewatch runs**.  
**Scope:** Locked per [ORCHESTRATOR_GUI_PLAY_AND_REWATCH_SCOPE_2026_02_14.md](ORCHESTRATOR_GUI_PLAY_AND_REWATCH_SCOPE_2026_02_14.md).

---

## 1. Convened roles and inputs

| Role | Question / input |
|------|-------------------|
| **Product Manager** | Scope and priority: play-myself + rewatch; phased plan and handoff to dev. Single priority = deliver tool recommendation (T8) then phased implementation plan (T9). |
| **Technical Architect** | Integration options for launchable app; how run/replay/state connect to UI; packaging approach; tool evaluation (Godot, Electron, Tauri). |
| **UI/UX Developer** | Must-haves for map/panels from existing tactical map and warroom; alignment with TACTICAL_MAP_SYSTEM, HANDOVER_WARROOM_GUI. |
| **Game Designer** | Design intent for "play myself" and rewatch; canon on info layers and settlement click (GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION). |
| **Scenario Harness Engineer** | Runner and replay pipeline; how launchable app can invoke or consume run/replay artifacts. |
| **QA Engineer** | Test strategy for GUI (play + rewatch); regression, determinism. |

---

## 2. Stated goal (single priority)

**One launchable application** (not web-only) that supports:

1. **Play myself** — Load starting state; human advances turns and sees results.
2. **Rewatch runs** — Load replay timeline; step through weeks.

**Next steps:** Execute research todos T3–T8, then T9 (phased plan) and T10 (Process QA).

---

## 3. Research list (assigned)

| ID | Owner | Output |
|----|--------|--------|
| T3 | UI/UX + Tech Architect | GUI state and gaps memo (warroom + tactical map) |
| T4 | Scenario Harness Engineer | Runner and replay from launchable app options |
| T5 | Gameplay Programmer + Game Designer | Canon and specs checklist for GUI |
| T6 | PM | Backlog alignment for play-myself + rewatch |
| T7 | Technical Architect | Integration architecture options (ADR-ready) |
| T8 | Technical Architect + PM | Tool recommendation + concrete tools list |

---

## 4. Must-haves (from UI/UX + Game Designer)

- **Launchable:** One executable or packaged install; no "open in browser" as primary.
- **Map:** Base geography + layers (political control, formations when state loaded); settlement click → settlement / municipality / side info (per strategic direction).
- **Play myself:** Load scenario/start; advance turn; see updated state on map.
- **Rewatch:** Load `replay_timeline.json`; play/pause/step weeks; same format tactical map already consumes.
- **Canon:** No new mechanics; determinism preserved; GUI reads/writes per phase specs and Systems Manual.

---

## 5. Handoff

- **Orchestrator → Research owners:** T3–T8 memos to be produced and collected.
- **PM (deputy):** After T3–T8, synthesize T9 (phased implementation plan) and handoff to dev.
- **Process QA (T10):** After T9, validate process (napkin, ledger, convene docs).

---

*Orchestrator convene note; research and phased plan follow.*
