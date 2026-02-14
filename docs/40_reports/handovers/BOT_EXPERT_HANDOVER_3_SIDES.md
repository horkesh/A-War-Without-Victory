# Bot Expert Handover — Three Sides (RBiH, RS, HRHB)

**Date:** 2026-02-14  
**Audience:** External expert tasked with creating three extremely capable, intelligent bots (one per side: RBiH, RS, HRHB).  
**Purpose:** Orient the expert: current status, docs reorg, AI strategy, brigade context, and the full design brief below. No change list—only locations and requirements. The expert has repo access.

**To get yourself updated:** Read through this handover (`docs/40_reports/handovers/BOT_EXPERT_HANDOVER_3_SIDES.md`) and the locations it points to.

---

## 1. Task and Design Brief

### Core task

Design and implement **three extremely capable and intelligent bots**, one per faction: **RBiH**, **RS**, **HRHB**. Deliverables and acceptance criteria are to be agreed with the product owner; this section states the design intent.

### Tools and formations

Bots must **have strategies and utilise all their tools**:

- **Brigades** (formation-level movement, AoR, garrison, attack orders).
- **Operational groups** (where modelled in canon/state).
- **Corps** (command layer, sector/axis coordination where present).

Strategies should be coherent across these layers—e.g. corps-level axis priorities driving brigade allocation and operational-group tasks.

### Complex operations

Bots should be able to **run complex operations**, such as:

- **Posavina corridor breach** (or equivalent multi-brigade, multi-phase offensives to open or close a corridor).
- Other historically plausible operations that require coordinated use of several formations, sequencing, and objective prioritisation.

Design and, if needed, extend systems (e.g. operational directives, multi-week objectives, breach/corridor logic) so that such operations are expressible and executable by the AI.

### System changes

You will need to **create not only the bots themselves, but also add or change existing systems** if they are unsuited. If current battle resolution, order types, corps/OG abstraction, or strategic decision hooks are insufficient for intelligent, formation-aware behaviour, propose and implement the minimal changes that make the bots effective while respecting canon and determinism.

### Tactical intelligence

Bots must be **intelligent enough** to:

- **Avoid attacking when they expect heavy casualties**, especially when attacking settlements of **opposing ethnicity** (high resistance, costly fights).
- **Choose to create a breach** when the payoff is high—e.g. to **reach a cluster of their own nation’s settlements** (enclaves, corridors, linked territory). So: cost-sensitive elsewhere, but willing to accept risk for strategic corridor/relief objectives.

Balance should feel plausible: not suiciding into ethnic strongholds, but willing to run deliberate operations to open corridors or relieve pockets when the strategic value justifies it.

### Research and inspiration

Other wargames have already solved similar problems (corridor ops, casualty aversion, ethnic resistance, breach-and-relief). **Research and implement** such ideas where they fit canon and the codebase—cite or summarise sources in design notes or reports so the project can reuse the reasoning.

### Creative freedom

**Additional plot turns and twists** are welcome. If you see opportunities for more interesting bot behaviour (e.g. feints, economy of force, alliance-aware caution, or narrative beats that make runs more compelling), propose and implement them within the constraints of determinism and canon.

---

## 2. Current Status — Where to Look

| Need | Location |
|------|----------|
| **Project state and changelog** | `docs/PROJECT_LEDGER.md` — read "Non-negotiables" and "Current Phase". |
| **Session-start corrections and domain notes** | `.agent/napkin.md` — read at session start; update after significant work. |
| **What is already implemented** | `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` |
| **What is not yet implemented (backlog)** | `docs/40_reports/CONSOLIDATED_BACKLOG.md` |
| **Patterns and lessons** | `docs/40_reports/CONSOLIDATED_LESSONS_LEARNED.md` |
| **Thematic decisions and rationale** | `docs/PROJECT_LEDGER_KNOWLEDGE.md` (see `docs/10_canon/context.md` §1). |

---

## 3. Recent Docs Reorganization

| Need | Location |
|------|----------|
| **Reports folder entrypoint and structure** | `docs/40_reports/README.md` — master index, subfolders (audit/, implemented/, backlog/, convenes/, handovers/). |
| **Cleanup and consolidation rationale** | `docs/40_reports/ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md` |
| **Main docs index** | `docs/00_start_here/docs_index.md` — "Reports (docs/40_reports)" section links to the above. |

---

## 4. AI Strategies

| Need | Location |
|------|----------|
| **AI strategy specification (faction profiles, determinism, difficulty, consolidation)** | `docs/20_engineering/AI_STRATEGY_SPECIFICATION.md` |
| **Bot integration points (code)** | Same doc § "Integration points" — `src/sim/bot/bot_strategy.ts`, `bot_interface.ts`, `simple_general_bot.ts`, `bot_manager.ts`, `src/sim/consolidation_scoring.ts`, scenario types/loader/runner. |
| **Recent bot AI implementation and closure** | `docs/40_reports/implemented/BOT_AI_HISTORICAL_ALIGNMENT_CLOSURE_2026_02_13.md`, `docs/40_reports/implemented/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md` (and any BOT_AI_* in `implemented/`). |
| **Phase II brigade-level AI** | `src/sim/phase_ii/bot_strategy.ts`, `src/sim/phase_ii/bot_brigade_ai.ts` (and references in AI_STRATEGY_SPECIFICATION). |
| **Corps / OOB structure** | `data/source/oob_corps.json`, `oob_brigades.json`; formation `corps_id` / tags; AoR and sector logic in `src/sim/phase_ii/brigade_aor.ts` (corps-aware fallbacks). |

---

## 5. Brigade Consolidations

| Need | Location |
|------|----------|
| **Brigade AoR, municipality layer, operational cap** | `.agent/napkin.md` — "Patterns That Work" (AoR, same-HQ/missing-HQ robustness, dynamic frontage cap, urban fortress, municipality assignment, 803rd Light). |
| **Implemented brigade/AoR reports** | `docs/40_reports/implemented/` — e.g. `BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md`, `803rd_light_223_settlements_investigation.md`, `municipality_supra_layer_implementation_report.md`, `refactor_pass_2026_02_11_brigade_aor.md`. |
| **Formation and brigade design (canon/design)** | `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` |
| **Brigade AoR and cap code** | `src/sim/phase_ii/brigade_aor.ts`, `src/state/brigade_operational_cap.ts`, `src/state/formation_constants.ts` |

---

## 6. Rules You Must Follow

- **Canon precedence:** `docs/10_canon/` is authoritative; code must follow canon. If canon is silent, ask. See `docs/20_engineering/CODE_CANON.md`.
- **Determinism:** No `Math.random()` in bot logic; seeded RNG only; stable ordering for candidate sets. See AI_STRATEGY_SPECIFICATION § "Determinism contract" and `.agent/napkin.md` "Smart-bot determinism".
- **Ledger:** Any change that affects behaviour, data outputs, or scenarios → entry in `docs/PROJECT_LEDGER.md`. When unclear, ask.
- **Napkin:** Read `.agent/napkin.md` at session start; update after significant changes.

---

## 7. Short Summary

**Task:** Three extremely capable bots (RBiH, RS, HRHB) with full use of brigades, operational groups, and corps; complex ops (e.g. Posavina corridor breach); add/change systems as needed; casualty- and ethnicity-aware tactics; research other wargames; creative twists welcome. **Status:** CONSOLIDATED_IMPLEMENTED, CONSOLIDATED_BACKLOG, PROJECT_LEDGER, napkin. **Docs reorg:** 40_reports README and ORCHESTRATOR_40_REPORTS_CLEANUP memo. **AI:** AI_STRATEGY_SPECIFICATION + implemented BOT_AI_* reports + bot/phase_ii code; corps/OOB in oob_corps.json, oob_brigades.json, brigade_aor. **Brigades:** napkin patterns, implemented brigade/AoR reports, MILITIA_BRIGADE_FORMATION_DESIGN, brigade_aor/brigade_operational_cap/formation_constants.
