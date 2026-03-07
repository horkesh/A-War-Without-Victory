# GUI Expert Advice — What to Change

**Date:** 2026-03-07  
**Purpose:** Expert review of the game’s GUI with prioritized advice on what to change. No comparison to live implementation.  
**Sources:** GUI Expert Review (Antigravity AI), `docs/knowledge/GUI Expert Review - A War Without Victory.mhtml`; optional design reference: Figma Make “Wargame Simulation GUI”.  
**Audience:** Product, design, and implementation owners deciding GUI changes.

---

## 1. Scope of the review

The **GUI Expert Review** describes the current game interface as:

- **Philosophy:** Military command center / tactical ops room; “Dossier” metaphor; information density and authenticity over casual accessibility.
- **Core areas:** Strategic tactical map (MapLibre, OSIDs, sectors), OOB sidebar (Supply/Fatigue, map↔sidebar link, stance controls), Intelligence Dossier / sector panels (intel confidence, risk analytics, OPSEC), operational planning and execution modals (chain of command, casualty projection).

This document takes that description as the baseline and adds **prioritized expert advice on what to change**, from a GUI/UX and wargame-genre perspective (representation, clarity, and player-facing communication only — no new mechanics).

---

## 2. What to change — prioritized

### P0 — High impact, clear gaps (do first)

| # | Change | Rationale |
|---|--------|-----------|
| **1** | **Interactive IVP breakdown** | IVP is shown as a flat percentage; causes (civilian casualties, territorial aggression, shelling) are hidden. **Change:** Add a “Diplomatic Press Briefing” (or equivalent) panel/modal: clicking the IVP value opens a breakdown of what drove the number. Surfaces “political cost” of military actions and supports meaningful player trade-offs. Common in strategy games (e.g. stability/aggression breakdowns). |
| **2** | **Enclave early warning** | Enclaves have a resilience countdown but no warning before isolation. **Change:** Add an early-warning state (e.g. “At risk” or “Approaching isolation”) when an enclave is N turns from becoming isolated, with a clear cue in the relevant panel or map. Reduces surprise and supports defensive decisions. |
| **3** | **Officer traits in OOB** | Commander traits (Aggressive, Cautious, etc.) affect simulation but are not visible in the OOB. **Change:** Show a small badge or label per commander in the OOB (e.g. “Aggressive”, “Cautious”) so the player sees why behavior differs. Keeps UI truthful to sim and supports planning. |

### P1 — Strong value, moderate scope

| # | Change | Rationale |
|---|--------|-----------|
| **4** | **Supply line overlay** | Current supply view is heat-map only; flow (paths, choke points) is not shown. **Change:** Add an optional “Supply lines” overlay showing paths from source to formation (or key nodes). Helps identify critical links for protection or interdiction without inventing new mechanics. |
| **5** | **Population: current vs original** | Displacement is in the sim but not clearly visible per settlement. **Change:** In the Settlement (or Dossier) panel, show current vs original population (or a simple “displaced” indicator). Makes humanitarian impact of the war visible and grounds the displacement mechanic. |
| **6** | **Global casualty / attrition ticker** | Turn and date are visible; cumulative cost of the conflict is not. **Change:** Add a subtle status-bar ticker (or compact summary) for cumulative casualties / attrition. Keeps the scale of the conflict present without dominating the UI. |

### P2 — Polish and consistency

| # | Change | Rationale |
|---|--------|-----------|
| **7** | **Formation panel completeness** | If a “Formation panel” exists but is placeholder (“coming soon”), **change:** Replace with at least minimal content (e.g. name, posture, parent corps, key constraints) or hide until ready. Avoids dead-end UI. |
| **8** | **Intel confidence and REDACTED** | Low-confidence intel is shown as REDACTED. **Change:** Ensure REDACTED is used consistently and that the player can tell what *kind* of data is redacted (e.g. “Strength: REDACTED” vs “Posture: REDACTED”). Improves fog-of-war clarity. |
| **9** | **Accessibility and keyboard** | Command-center UIs are often keyboard-heavy. **Change:** Confirm critical actions (e.g. advance turn, open OOB, open IVP breakdown) have keyboard shortcuts and that focus order and labels support screen readers. No mechanics change. |

---

## 3. What not to change (expert guardrails)

- **No new mechanics.** All advice is about representation and communication (what to show, where, how). No new rules, formulas, or systems.
- **No canon edits.** Expert does not modify `docs/10_canon/` or invent new design authority.
- **Determinism.** Any new UI that displays ordered lists or tables should use stable, documented ordering (e.g. sort keys) so outputs remain deterministic where required.

---

## 4. Suggested order of work

1. **First:** IVP breakdown (P0 #1) and enclave early warning (P0 #2) — largest information gaps.
2. **Second:** Officer traits in OOB (P0 #3), then supply line overlay (P1 #4) and population current vs original (P1 #5).
3. **Third:** Global casualty ticker (P1 #6), then P2 polish (formation panel, intel consistency, accessibility).

Product/design can resequence or drop items based on scope and roadmap; this order is by impact and dependency.

---

## 5. References

- **GUI Expert Review (source):** `docs/knowledge/GUI Expert Review - A War Without Victory.mhtml` (Antigravity AI, 2026-03-07).
- **Optional design reference:** Figma Make project “Wargame Simulation GUI” (components: TacticalMap, OOBSidebar, SettlementPanel, CommandBar, StatusBar, etc.) — use only for layout/structure ideas, not as implementation spec.
- **Existing handovers:** `docs/40_reports/handovers/GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md`, `EXTERNAL_EXPERT_HANDOVER.md` for context and constraints.

---

**Prepared by:** Orchestrator (Paradox GUI expert perspective — ui-ux-developer + modern-wargame-expert advisory).  
**Status:** Advisory; implementation owner and priority set by Product/design.
