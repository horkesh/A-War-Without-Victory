# Orchestrator — GUI "Play the game" scope decision memo

**Date:** 2026-02-14  
**Status:** Locked  
**Purpose:** Record user-confirmed scope for the launchable GUI plan. All planning and implementation align to this definition.

---

## 1. Scope (locked)

| Requirement | Meaning |
|-------------|--------|
| **Play myself** | Load a starting state (scenario/start); **human player** makes decisions (or at least advances turns and sees results), not just watching bot runs. |
| **Rewatch runs** | Ability to **replay** past runs (e.g. load `replay_timeline.json`, step through weeks). The launchable app must support it. |

---

## 2. Non-web / launchable

- **Not web-based.** The user wants something that **works and can be launched** (desktop/native or packaged app).
- One **launchable application** (not web-only) that supports both **interactive play** and **rewatch**.

---

## 3. Success criteria (for "good working GUI")

- User can **launch** the app (one executable or packaged install).
- User can **load a starting state** and **play as human** (advance turns, make or observe decisions).
- User can **rewatch** past runs (load replay timeline, step through weeks).
- Tool recommendation from planning (T8) will specify the stack (e.g. Godot, Electron, Tauri).

---

## 4. References

- Plan: Launchable GUI to Play the Game and Rewatch Runs (GUI Implementation Plan).
- CONSOLIDATED_BACKLOG §4 (GUI/War Planning Map); gui_improvements_backlog.md.

---

*Orchestrator decision memo; scope locked for planning phase.*
