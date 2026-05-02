# Presidential Decision Room / Strategic Priorities

**Date:** 2026-05-02
**Run ID:** N/A
**Baseline:** Army HQ BRIEFING with separate attention panel, opportunity dossiers, command briefing, SITREP, Turn Aftermath records, active campaign cost, and Chronicle memory.
**Result:** Army HQ BRIEFING opens with a deterministic next-action board that prioritizes those existing read models and routes every card to an existing inspection surface.

## Summary

- Added a pure UI read model, `buildPresidentialDecisionRoomView(...)`, that synthesizes current command urgency without touching simulation, combat, catalog, or sensitive-history systems.
- Added `PresidentialDecisionRoomPanel` as the first Army HQ BRIEFING section, ahead of the existing attention and briefing areas.
- Updated GUI/product-shell docs, project ledger, knowledge ledger, and napkin to record the Decision Room as a synthesis and handoff surface, not a new source owner.

## Changes Made

### Read Model

- Created `src/ui/map/data/presidentialDecisionRoom.ts`.
- Inputs are existing player-facing DTOs only: `presidentialReviewQueue`, `operationOpportunityProposals`, `commandBriefing`, `operationalSitrep`, Turn Aftermath record views, active campaign cost, and Chronicle availability.
- Cards carry stable category, severity, title, explanation, source owner, evidence, action label, deterministic sort key, and typed navigation target.
- Sorting is deterministic by severity, category, urgency, source id, and card id. No randomness, wall-clock time, locale sorting, or unsorted map iteration.

### UI Surface

- Created `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`.
- Mounted it at the top of Army HQ BRIEFING in `ArmyHQModal.tsx`.
- Rendered a dense warroom-style Strategic Priorities surface with urgency metrics, priority cards, Inspect Next handoffs, and Review Before Advance handoffs.
- Actions route through `shellNavigation` helpers into Army HQ tabs, Army HQ Records, focused Turn Aftermath records, corps briefings, or Chronicle.

### Tests

- Added `tests/ui/presidential_decision_room.test.ts`.
- Added `tests/ui_presidential_decision_room_wiring.test.ts`.
- Covered deterministic severity sorting, source ownership, routing targets, advance-review behavior, no-player-faction empty state, Army HQ mount order, shell-navigation usage, and absence of combat/sensitive-history imports.

### Documentation

- Updated `docs/40_reports/GUI_MASTER.md`, `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, and `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`.
- Updated `docs/40_reports/README.md` and `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md`.
- Appended `docs/PROJECT_LEDGER.md`; added durable knowledge to `docs/PROJECT_LEDGER_KNOWLEDGE.md`; updated `.claude/napkin.md`.

## Parallel Review Findings

- Architect guidance: keep this in Army HQ BRIEFING as a synthesis surface and route through central shell helpers.
- Modern wargame guidance: make it a command-priorities outliner, not a marketing page or a new shell.
- UI/UX guidance: use a compact top priority board with clear Inspect Next and Review Before Advance side rails.
- QA guidance: prove deterministic order, routing, empty-state behavior, and no duplicate ownership.
- Canon guidance: keep presidential command model intact; no brigade command and no hidden enemy truth.
- Determinism guidance: no time, random, locale sorting, catalog imports, or combat-lane reads.

## Verification

| Command | Result |
|---------|--------|
| `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui_shell_navigation.test.ts tests/army_hq_presidential_review_coherence.test.ts tests/ui/inbox_items.test.ts tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_chronicle_turn_record_link.test.ts tests/ui_chronicle_review_tools.test.ts tests/chronicle_entries.test.ts tests/operational_sitrep_views.test.ts tests/ui/gamestore_load_reset.test.ts tests/ui_player_visibility.test.ts tests/ui_adapter_boundary.test.ts` | 14 files passed, 158 tests passed. |
| `npx.cmd tsc --noEmit -p tsconfig.json` | Passed. |
| `npm.cmd run desktop:map:build` | Passed; existing Vite warnings only for loader worker shim, shared dynamic/static imports, and bundle size. |
| `git diff --check` | Passed; Git reported line-ending normalization warnings only. |

## Determinism And Scope

- UI/read-model only.
- No simulation tuning, combat logic, calibration, OOB, scenario, painted-target, operation-catalog, or sensitive-history content changed.
- No new persistent state writer.
- No second inbox, opportunity ledger, cost ledger, Chronicle, event log, or operations owner.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/presidentialDecisionRoom.ts` | New pure Strategic Priorities read model. |
| `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | New Army HQ command surface. |
| `src/ui/map/components/army_hq/ArmyHQModal.tsx` | Mount Decision Room first in BRIEFING. |
| `tests/ui/presidential_decision_room.test.ts` | Read-model regression tests. |
| `tests/ui_presidential_decision_room_wiring.test.ts` | Source/wiring regression tests. |
| `docs/40_reports/GUI_MASTER.md` | GUI master updated. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Tactical map reference updated. |
| `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md` | Product shell ownership updated. |
| `docs/40_reports/README.md` | Reports index updated. |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Implemented index updated. |
| `docs/PROJECT_LEDGER.md` | Ledger entry appended. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Durable pattern recorded. |
| `.claude/napkin.md` | Runbook updated. |

## Next Steps

- Consider a browser screenshot pass in a future UI-polish lane if the Army HQ layout changes again.
- Extend the Decision Room only by adding source-backed cards and handoffs; keep source truth in the existing owning surfaces.
