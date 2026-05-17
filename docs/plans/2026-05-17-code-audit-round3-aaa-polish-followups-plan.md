# Code Audit Round 3 AAA Polish Follow-Ups Plan

**Date:** 2026-05-17
**Source audit:** `docs/40_reports/audits/20260516_CODE_AUDIT_ROUND3_AAA_POLISH.md`
**Scope:** Convert the Round 3 AAA polish audit into implementation lanes. This plan intentionally separates quick correctness fixes from broader product polish audits.

## Findings Triage

| Audit item | Priority | Owner area |
|---|---:|---|
| `CANON.md` stale current-version line | P0 docs hygiene | Canon/docs |
| HRHB priority fronts pulling Banja Luka area | P1 faction correctness | UI read model / front prioritization |
| RS opening-brief action button inconsistency | P1 onboarding consistency | Opening brief UI |
| RBiH/HRHB patron/alliance status coverage gap | P1 faction status bar | Bottom status / patron read model |
| Raw OSID priority-front labels | P2 readability | Situation/priority-front labels |
| `GameStateAdapter.ts` `as any` hotspot | P2 type safety | UI adapter |
| Panel-level error boundaries | P1 resilience | UI shell |
| Proposed next-round audits | P3-P4 | QA/product |

## Phase A: Fast Docs Hygiene

**Files:** `docs/10_canon/CANON.md`, `docs/00_start_here/docs_index.md` if cross-reference needed.

**Task:** Update stale "Current: v0.3.1" wording to the active package milestone/version statement without changing canon semantics.

**Verification:** `rg -n "v0\.3\.1|Playable Alpha \+ Endgame" docs/10_canon docs/00_start_here`; `git diff --check`.

## Phase B: Faction Onboarding and Status Consistency

**Files to inspect first:** `src/ui/map/components/OpeningBrief*.tsx`, `src/ui/map/data/openingBrief*`, `src/ui/map/components/BottomStatusStrip.tsx`, `src/ui/map/data/warroomPriorityDocket.ts`, `src/ui/map/data/preAdvanceCommandReview.ts`, and any priority-front builder feeding `SituationTab`.

**Tasks:**
1. Make RS/RBiH/HRHB opening-brief action buttons consistent unless a faction-specific reason is documented.
2. Add or repair status-bar coverage so HRHB exposes Zagreb/patron pressure and RBiH exposes the relevant international/alliance status without hiding the Bosniak-Croat alliance.
3. Investigate HRHB priority-front selection. If Banja Luka fronts are not HRHB-owned/relevant, filter or rank priority fronts by player faction relevance.
4. Humanize priority-front labels by mapping OSID pairs to municipality/front display labels.

**Tests:** focused read-model tests for each faction's opening brief action set; status-bar projection tests for RBiH, RS, HRHB; priority-front relevance test using Turn 0 fixture; label formatting test that rejects raw `op:` IDs and underscore-heavy settlement names in player-facing labels.

**Browser QA:** Start clean sessions for all three factions, capture first-screen screenshots, and confirm tutorial/brief overlay does not obscure the primary brief content.

## Phase C: Adapter Type Safety

**Files:** `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/data/types.ts`, `tests/game_state_adapter_*.test.ts`.

**Tasks:**
1. Inventory every `as any` in `GameStateAdapter.ts`.
2. Classify each as `boundary unknown`, `known shape`, `legacy save compatibility`, or `dead cast`.
3. Replace at least the known-shape/dead casts with narrow type guards or helper readers.
4. Keep deterministic sorting and adapter defaults unchanged.

**Acceptance:** cast count decreases with a test-backed baseline; no change to parsed output for retained startup save fixture.

## Phase D: Panel-Level Resilience

**Files:** `src/ui/map/components/RootErrorBoundary.tsx`, `src/ui/map/App.tsx`, panel owners for Presidential Inbox, Command rail, Army HQ, OpsPlanningModal, and Decision Room; tests under `tests/ui/`.

**Tasks:**
1. Add reusable panel-level error boundary wrapper with compact recovery UI.
2. Wrap major panels so one render failure does not blank the whole shell.
3. Add tests that deliberately throw from a child component and confirm only that panel falls back.

**Stop Gate:** Do not swallow errors silently; fallback UI must preserve enough diagnostic text for debugging.

## Phase E: Next-Round Audit Queue

Create separate plans or audit tickets before implementation for i18n bare-string sweep, colorblind palette validation, telemetry/privacy posture, mod-support readiness, real sound design integration beyond the stub, animation token consistency, keyboard shortcut discoverability, save-file atomicity/corruption recovery, multi-monitor/window-size resilience, historian audit of remaining Codex essays, `validateGameState` invariant coverage, Electron main-process security review, first-time-user recorded playtest, deprecated game-state schema fields, and Endgame Verdict + Cost Ledger content review.

## Determinism Safeguards

- UI read-model changes must be pure projections over existing state.
- Any new diagnostics must sort file paths, IDs, and emitted rows with `strictCompare` or stable lexical sort.
- No scenario data or calibration constants in this plan unless a later explicit implementation plan authorizes it.

## Required Docs

- Update `docs/40_reports/CONSOLIDATED_BACKLOG.md` as phases close.
- Add implemented reports for any shipped Phase B-D changes.
- Update `docs/40_reports/GUI_MASTER.md` if status bar, opening brief, or panel resilience behavior changes.
- Ledger entry after implementation.
