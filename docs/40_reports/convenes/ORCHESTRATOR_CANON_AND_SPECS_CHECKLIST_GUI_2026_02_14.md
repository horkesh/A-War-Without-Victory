# Canon and specs checklist for GUI work

**Date:** 2026-02-14  
**Owner:** Gameplay Programmer + Game Designer (T5)  
**Purpose:** Checklist of canon constraints and spec requirements that GUI work must respect (launchable app, play myself + rewatch).

---

## 1. Strategic direction (GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION)

- [ ] **Base map then layers:** One base geographical map first; then information layers (political control, contested, ethnicity, OOB, etc.). Do not treat layers as replacing base geography.
- [ ] **War system separate:** Map shows *result* of state (control, formations). Order-giving and order flow (brigades, corps, OGs, army) are a separate system; GUI map work must not conflate “map view” with “order input” unless scoped as war-system workstream.
- [ ] **Settlement click required:** Click on settlement must surface (1) **Settlement** info, (2) **Municipality** info, (3) **Side** (faction/control) info. Required for any map view that shows settlements.

---

## 2. Determinism and engine invariants (Engine_Invariants_v0_5_0, context)

- [ ] **No randomness** in simulation logic, validators, derived artifacts, or **UI export paths** (e.g. replay_timeline, saved state). GUI must not introduce Math.random() or nondeterministic iteration in any path that affects persisted or replayed state.
- [ ] **No timestamps** in derived artifacts or serialization (no Date.now, time-based IDs in saves or replay).
- [ ] **Stable ordering** when iterating collections that affect outputs (e.g. formation list, settlement list in UI that writes or drives state). Use sorted keys (e.g. strictCompare).
- [ ] **Reproducibility:** Save/load must fully reconstruct world state. GUI that triggers run or advance must not alter sim inputs in a nondeterministic way.

---

## 3. Phase specs and Systems Manual

- [ ] **Phase 0 / I / II:** GUI that advances turns must use the same turn pipeline and phase semantics as canon (e.g. runPhase0Turn, Phase I/II browser runners). No new phase mechanics invented in GUI.
- [ ] **State shape:** Loaded state and replay frames must conform to GameState shape and top-level keys (see GAMESTATE_TOP_LEVEL_KEYS in serializeGameState). GUI adapters (e.g. GameStateAdapter) must not drop or invent required keys for display that would affect downstream save/replay.
- [ ] **Formation / OOB:** Display of formations, brigade AoR, militia pools must reflect state.formations, state.brigade_aor, state.militia_pools per Systems Manual and phase specs.

---

## 4. WAR_PLANNING_MAP_CLARIFICATION_REQUEST (if filled)

- [ ] If clarification request is filled: PM and Game Designer joint recommendations (base map → layers, settlement click, war system out of scope) apply to map/GUI scope. Check handover: `docs/40_reports/handovers/WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md`.

---

## 5. Placeholder and “no false precision” (gui_improvements_backlog, Phase G)

- [ ] **Placeholder content:** Any placeholder text (newspaper, magazine, reports, ticker, faction estimates) must be clearly labeled so the user does not mistake it for real turn-generated content (no false precision).
- [ ] **Estimates/labels:** Where values are derived or placeholder (e.g. personnel, supply days), label as “(Est.)” or “(Placeholder)” per Phase G / Rulebook.

---

## 6. What GUI must not do

- [ ] **No new mechanics:** GUI does not invent new game rules, phase transitions, or control-flip logic. It displays and triggers existing pipeline steps only.
- [ ] **No canon changes:** GUI work does not change FORAWWV, phase specs, or Systems Manual. If a design decision conflicts with canon, change the design or escalate; do not change canon without explicit process.
- [ ] **No silent nondeterminism:** Avoid timestamps, random seeds in UI-driven runs, or unstable iteration in any path that produces replay or save artifacts.

---

*T5 deliverable; use when implementing or reviewing GUI work.*
