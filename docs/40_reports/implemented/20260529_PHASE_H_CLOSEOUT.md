# Phase H Closeout — UI/Codex Integration of Phase D Causal Substrate

## Status

- **Date:** 2026-05-29
- **Branch:** `codex/diagnostics-output-artifact-doc-closeout`
- **Packets shipped:** H1, H2, H3, H4, H5, H6, H7, H8
- **Commits:** `c05924d0` (H1) / `4c04e5b8` (H2) / `f389f02f` (H3) / `f681f262` (H4) / `63b01890` (H5) / `68d630f2` (H6) / `37f22aa5` (H7) / `eaccbb74` (H8)
- **Test infrastructure:** 9 Phase H UI suites GREEN — `causality_query.test.ts` (25) + `event_decision_modal_decision_context.test.ts` (5) + `faction_branch_tags_badge.test.ts` (6) + `codex_panel_unlock_state.test.ts` (8) + `chronicle_causality_slides.test.ts` (11) + `catalog_wireup_integration.test.ts` (8) + `decision_history_overlay.test.ts` (11). `npx tsc --noEmit` exit 0. Baseline regression PASSING byte-identical (no sim path touched).
- **Companion docs:** `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`, `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`, `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md`, `docs/40_reports/implemented/20260529_PHASE_G_CLOSEOUT.md`
- **Source scoping doc:** `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md` (H1)

This closeout consolidates the Phase H player-facing UI integration arc shipped on `codex/diagnostics-output-artifact-doc-closeout`. Where Phase D authored the causal-chain catalog, Phase E activated the political-dimension propagation gate, Phase F instrumented the catalog with diagnostics, and Phase G operationalized the diagnostic + CI surface, Phase H closes the loop by surfacing the substrate to the player: decision context inside the event modal, branch-tag identity badges, codex unlock state, end-of-campaign causality slides, full-screen player decision history, and the catalog wire-up that activates all four substrate-to-UI bridges simultaneously. The closeout itself is documentation-only; no UI component code, scenario data, or canon is touched here.

## Scope completed

### H1 — UI/Codex integration scoping doc

Design-level scoping at `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md` (350 lines, 13 sections). Bridges the gap from "engine substrate complete" to "UI implementation packet". Identifies:

- 9 pure read-only query helpers to add at `src/sim/events/causality_query.ts` (executed in H2).
- 5 new UI components A–E (executed in H3 / H4 / H5 / H6 / H8).
- 5 open design questions for user / Game Designer (overlay vs sidebar Decision History, codex tree vs flat list, live-computed vs pre-rendered chronicle, sensitive-event visual treatment, Phase E flag activation HUD).
- Existing UI infrastructure inventory: `EventDecisionModal.tsx`, `CodexPanel.tsx`, `WrappedOverlay` / `WrappedSlide` / `generateWrappedSlides` chronicle infrastructure confirmed present; `src/desktop/**/*.tsx` confirmed absent (renderer lives entirely in `src/ui/map/`).
- Three-wave phasing recommendation (wave 1: helpers + A + B; wave 2: C + D; wave 3: E + Phase E HUD).
- State-management decision: zero new persisted fields; per-component env flags; sorted-iteration determinism.

### H2 (wave 1) — Causality query helpers

New file `src/sim/events/causality_query.ts` (537 LOC). Nine exported pure read-only query helpers:

| Helper | Purpose |
|---|---|
| `getCausalDescendants(eventId, state)` | BFS forward over `event_causality_log` `enables` edges, sorted via `strictCompare`. |
| `getCausalAncestors(eventId, state)` | Reverse BFS over the same log, sorted. |
| `getPlayerDecisionHistory(state)` | Filter `event_decision_log` to `decision_source === 'player'`, turn-ascending. |
| `getCounterfactualDivergencePoints(state, eventCatalog?)` | Cross-references player decisions against each event's `historical_default_response_id`, turn-ascending. |
| `getBranchTagsActive(state, faction, eventCatalog?)` | Extracts chosen-option `sets_flags` per fired event, filters by faction prefix (`rs_` / `rbih_` / `hrhb_`), sorted. |
| `getCausalChainAt(turn, state)` | Turn-bounded snapshot of fired / enabled / closed / causality_log. |
| `getActivePhaseEFlags()` | Re-exports gate-module active sub-flag names via `isIntlStandingOpsHesitationActive` + `isCohesionCautionBiasActive`, sorted. |
| `getProjectedDimensionMultiplier(state, faction)` | Projects `getIntlStandingOpsHesitationMultiplier` × `getCohesionCautionBiasMultiplier` unconditionally (UI "what-if" hook). |
| `getEventChainSummary(state, eventCatalog)` | Aggregate stats (foundational_count, downstream_fired_count, closed_count, max_depth, player_divergence_count) for Wrapped slides. |

Each helper is PURE — no state mutation, no side effects. All array returns sorted via `strictCompare`. Companion test file `tests/causality_query.test.ts` covers all 9 helpers across 25 tests (synthetic R1 → R6 → R12_child chain, empty-input edge cases, gate-isolated `getActivePhaseEFlags` with `resetPoliticalDimensionGates`, Phase E3 math `intl_standing=20 + cohesion=30 → 0.7 × 0.85 = 0.595`, branch-tag faction-prefix filtering, counterfactual divergence catalog cross-reference).

### H3 — Component A: Decision Context expansion

Extended `src/ui/map/components/EventDecisionModal.tsx` (current 486 lines, +105 LOC in H3). First substrate-to-UI bridge. Added:

- Two new optional props: `eventCatalog?: ReadonlyMap<string, EventDefinition>` and `state?: GameState`. Graceful degradation when omitted — existing callers passing only `decision` + `onRespond` continue to work.
- Local `DecisionContextSection` component rendering three optional sub-rows after the dossier sidebar / before the response option list: "Family: <family> | Source: <source_tier>" pulled from `EventDefinition`; "Ancestry: <comma-separated event_ids>" computed via `getCausalAncestors(decision.event_id, state)`; "Source dossier: <first 200 chars + ...>" truncation of catalog `source_note` / `historical_source`.
- Local helpers `SOURCE_DOSSIER_EXCERPT_MAX_CHARS = 200` constant + `truncateSourceDossier(text)` pure function.

Zero new CSS files. Reuses existing modal classes (`border-panel-border`, `bg-panel-card/80`, `text-accent-gold`, `text-text-secondary`). New test file `tests/ui/event_decision_modal_decision_context.test.ts` (5 tests). Also corrected a pre-existing drift in `tests/ui/event_decision_modal_catalog.test.ts` (production_modal_authoring_ready_events count 18 → 45, family-coverage assertion 36 → 65) so the catalog test reflects the Phase D-era catalog reality.

### H4 — Component D: Branch-tag faction badge (standalone)

New file `src/ui/map/components/BranchTagBadgeRow.tsx` (89 LOC). Second substrate-to-UI bridge. Standalone React component with three props: `faction: FactionId` (required), `eventCatalog?: ReadonlyMap<string, EventDefinition>` (optional), `state?: GameState` (optional). Both optional props are required for the helper to resolve any tags — when either is missing the component returns `null`. When tags resolve, renders a `<div data-testid="branch-tag-badge-row">` carrying `data-faction`, a `title` tooltip with `(count): tag1, tag2, ...`, and one `<span data-testid="branch-tag-chip" data-tag="...">` per tag in deterministic alphabetical order (via `getBranchTagsActive` → `strictCompare`). Zero new CSS files. New test file `tests/ui/faction_branch_tags_badge.test.ts` (6 tests). Component shipped standalone in H4; mount-into-host wiring lands in H7.

### H5 — Component C: Codex unlock state display

Extended `src/ui/map/components/CodexPanel.tsx` (current 464 lines, +131 LOC in H5). Third substrate-to-UI bridge. Added:

- Two new optional props on `CodexPanelProps`: `eventCatalog?: ReadonlyMap<string, EventDefinition>` and `state?: GameState`.
- `UNLOCK_STATE_MAX_ROWS_PER_LIST = 25` cap constant + pure `formatUnlockRow(id, eventCatalog)` helper.
- `useMemo`-keyed `unlockState` derivation that returns `null` when either prop is absent (graceful degradation) and otherwise produces `{ fired, enabled, closed, summary }` — fired = `state.military.fired_event_ids` sorted alphabetical; enabled = `state.military.enabled_event_ids` minus the fired set (pending opportunities); closed = `state.military.closed_event_ids` sorted; summary = `getEventChainSummary(state, eventCatalog)`.
- New Unlock State section between top chrome and year-tabs sidebar: aggregate headline row ("Foundational: N | Fired downstream: M | Closed: K | Max depth: D") plus three sub-list columns (Fired / Enabled / Closed) with per-event rows showing `id [family=X] [source=Y]` from the catalog.

Zero new CSS files. Reuses existing Tailwind tokens. New test file `tests/ui/codex_panel_unlock_state.test.ts` (8 tests). Backward-compat: existing CodexPanel callers in `MapContainer` and the pre-existing CodexPanel test pass only `isOpen` + `onClose` — they continue to render exactly as before (existing 6-test suite passes unchanged with zero edits).

### H6 — Component E: Chronicle causality slides

Extended `src/ui/map/components/chronicle/generateWrappedSlides.ts` (current 476 lines, +220 LOC in H6). Fourth substrate-to-UI bridge. Added:

- Optional 2nd arg `eventCatalog?: ReadonlyMap<string, EventDefinition>` on `generateWrappedSlides`.
- Exported pure helper `generateCausalitySlides(state, playerFaction, playerFactionLabel, eventCatalog)` plus internal `pickFoundationalChoice` resolver.
- When `eventCatalog` is absent or empty, no causality slides are appended — the canonical 10 slides are returned byte-identical (`tests/wrapped_slides.test.ts` passes unchanged).
- When the catalog is provided, up to 3 causality slides are appended in fixed order: F1 `foundational_choice` (active branch tags + chosen foundational option + source_note), F2 `your_divergences` (counterfactual divergence count + top-5 turn-sorted divergences with chosen vs historical), F3 `causal_chain_summary` (foundational / downstream / closed / max-depth aggregates from `getEventChainSummary`). Each slide is conditionally appended only when its signal is non-trivial (graceful degradation).

Zero new CSS — reuses existing `WrappedSlide` rendering contract. New test file `tests/ui/chronicle_causality_slides.test.ts` (11 tests).

### H7 — Catalog wire-up (activates H3–H6 bridges simultaneously)

Threads `eventCatalog: ReadonlyMap<string, EventDefinition>` through the UI call sites so all four substrate-to-UI bridges go live together. Six files modified (+514 LOC total):

- `src/ui/map/data/DataLoader.ts` (current 202 lines, +57 LOC) — new browser-side full-catalog loader `loadEventDefinitionsFull(): Promise<Map<string, EventDefinition>>` that fetches the same 5 JSON files as the engine loader (`war_1992..war_1995` + `consequences.json`), returns canonically-typed records, cached separately from the existing `EventDefinitionView` cache.
- `src/ui/map/data/types.ts` (current 1373 lines, +19 LOC) — added optional `rawGameState?: GameState` to `LoadedGameState` (runtime-only handle, not persisted, no save-migration).
- `src/ui/map/data/GameStateAdapter.ts` (current 3184 lines, +8 LOC) — `parseGameState` now passes `gameState` through to `LoadedGameState.rawGameState`.
- `src/ui/map/App.tsx` (current 1359 lines, +30 LOC in H7, +25 LOC again in H8) — boot-time `loadEventDefinitionsFull()` into a React state `eventCatalogFull`, threaded to (a) `CodexPanelWrapper`, (b) `EventDecisionModal` inline, (c) `WrappedOverlay`, (d) `BottomStatusStrip`.
- `src/ui/map/components/chronicle/WrappedOverlay.tsx` (current 145 lines, +15 LOC) — accepts `WrappedOverlayProps.eventCatalog`, forwards as 2nd arg into `generateWrappedSlides(state, eventCatalog)`.
- `src/ui/map/components/BottomStatusStrip.tsx` (current 370 lines, +25 LOC) — accepts `BottomStatusStripProps.eventCatalog` and mounts `BranchTagBadgeRow` inline in the faction-contextual indicator zone between operations count and divider; divider conditional matches `BranchTagBadgeRow`'s own degradation rules so empty-tag case omits both row and divider.

New test file `tests/ui/catalog_wireup_integration.test.ts` (8 tests). Integration gap from H3 / H4 / H5 / H6: ZERO remaining — all four bridges receive the same App-boot-loaded catalog instance, ensuring single-source-of-truth.

### H8 — Component B: Decision History overlay

Final H1 §4.2 wave-2 component. New file `src/ui/map/components/DecisionHistoryOverlay.tsx` (318 LOC) + `src/ui/map/App.tsx` (+25 LOC additive).

- Full-screen overlay (`Z.CODEX` z-layer matching `CodexPanel`) listing every `event_decision_log` entry with `decision_source === 'player'`. Each row: turn number, event id, family (catalog lookup), chosen response id, divergence-vs-historical badge ("Diverged" amber / "Historical" neutral).
- Row click expands to show `getCausalDescendants` of the chosen-decision's event plus a 200-char source-note excerpt.
- ESC closes via standard `keydown` handler.
- Graceful degradation: empty-state when state or catalog absent; "No player decisions recorded yet" when filter yields empty.
- App.tsx changes: import + `isDecisionHistoryOpen` state + 'D' hotkey toggle (mirrors C/X for Chronicle/Codex) added inside the existing `useEffect` keyboard handler + mount of overlay component next to `WrappedOverlay` and `CodexPanelWrapper` sharing the same `eventCatalogFull` + `loadedGameState?.rawGameState` from H7.

New test file `tests/ui/decision_history_overlay.test.ts` (11 tests). 'D' hotkey from anywhere in the game shell; self-toggle (D opens AND closes); ESC also closes.

## Component reference table

| Packet | Component | File | LOC | Tests | Commit | Mounted in |
|---|---|---|---|---|---|---|
| H1 | UI/Codex scoping doc | `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md` | 350 | n/a (docs) | c05924d0 | n/a |
| H2 | Causality query helpers | `src/sim/events/causality_query.ts` | 537 | 25 | 4c04e5b8 | consumed by H3/H4/H5/H6/H8 |
| H3 | Component A (Decision Context) | `src/ui/map/components/EventDecisionModal.tsx` (extended) | 486 (+105) | 5 | f389f02f | existing modal call sites (App.tsx) |
| H4 | Component D (Branch-tag badge) | `src/ui/map/components/BranchTagBadgeRow.tsx` (new) | 89 | 6 | f681f262 | BottomStatusStrip via H7 |
| H5 | Component C (Codex unlock state) | `src/ui/map/components/CodexPanel.tsx` (extended) | 464 (+131) | 8 | 63b01890 | CodexPanelWrapper via H7 |
| H6 | Component E (Chronicle slides) | `src/ui/map/components/chronicle/generateWrappedSlides.ts` (extended) | 476 (+220) | 11 | 68d630f2 | WrappedOverlay via H7 |
| H7 | Catalog wire-up | DataLoader.ts + types.ts + GameStateAdapter.ts + App.tsx + WrappedOverlay.tsx + BottomStatusStrip.tsx | +514 LOC across 6 files | 8 | 37f22aa5 | activates H3/H4/H5/H6 simultaneously |
| H8 | Component B (Decision History overlay) | `src/ui/map/components/DecisionHistoryOverlay.tsx` (new) + App.tsx | 318 + 25 | 11 | eaccbb74 | App.tsx via 'D' hotkey |

## Verification command

To re-verify Phase H state, run:

```
node node_modules/vitest/vitest.mjs run tests/causality_query.test.ts tests/ui/event_decision_modal_decision_context.test.ts tests/ui/faction_branch_tags_badge.test.ts tests/ui/codex_panel_unlock_state.test.ts tests/ui/chronicle_causality_slides.test.ts tests/ui/catalog_wireup_integration.test.ts tests/ui/decision_history_overlay.test.ts tests/wrapped_slides.test.ts --reporter=dot
npx tsc --noEmit
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
```

Expected outcomes:

- 95 tests GREEN across the 8 listed files: `causality_query` (25) + `event_decision_modal_decision_context` (5) + `faction_branch_tags_badge` (6) + `codex_panel_unlock_state` (8) + `chronicle_causality_slides` (11) + `catalog_wireup_integration` (8) + `decision_history_overlay` (11) + `wrapped_slides` (21 — preserved canonical 10-slide assertions).
- `npx tsc --noEmit` exit 0.
- Baseline regression: "Baseline regression: all scenarios match." (byte-identical — Phase H touched no sim path).

## Open follow-ups (non-blocking, deferred)

1. **Sensitive-event visual treatment (H1 §11.4)** — H1 open design question 4. Currently the four UI bridges (modal context / branch-tag badge / codex unlock state / chronicle slides / decision history) treat Ring 3 sensitive families with the same visual weight as non-sensitive rows. The H1 doc lists three candidate treatments (red border / warning icon / source-tier chip). Deferred until Game Designer / UI-UX Developer panel sign-off.
2. **Phase E flag activation HUD (H1 §11.5)** — H1 open design question 5. Whether players should see when `AWWV_PDP_*` sub-flags are active (and the projected dimension multiplier from `getProjectedDimensionMultiplier`) is a developer-vs-player visibility call. The query helper exists; the HUD does not. Deferred.
3. **Codex causal-chain tree view (H1 §11.2)** — H1 open design question 2. H5 ships flat sorted sub-lists; a tree view over `event_causality_log` `enables` edges is a separate scope.
4. **Decision History sidebar variant (H1 §11.1)** — H1 open design question 1 was resolved in favor of full-screen overlay (H8). If a sidebar variant is later desired, the `getPlayerDecisionHistory` helper is already reusable.
5. **End-of-campaign chronicle pre-rendering (H1 §11.3)** — H1 open design question 3. H6 ships live-computed slides (default per H1 §11.3 recommendation). Pre-rendering would require new persisted state and is not in Phase H scope.
6. **Catalog loader cache invalidation** — `loadEventDefinitionsFull` caches the result for the App's lifetime. Hot-reload of edited JSON in dev mode is not currently supported by this loader.
7. **`event_decision_modal_catalog.test.ts` drift counter** — H3 updated the hardcoded count from 18 to 45 and family-coverage from 36 to 65. If catalog growth resumes (new Phase D-style authoring), the counter will drift again; a derivation-based assertion would be more durable.
8. **Mobile / small-viewport layout** — H8 full-screen overlay assumes desktop-grade viewport. Mobile-shell adaptation is out of scope.

## Hard constraints honored throughout

- Determinism preserved — no `Math.random()`, no `Date.now()`, no timestamps in component or test code; all causality reads delegate to `causality_query.ts` helpers which sort via `strictCompare`; chronicle slide ordering deterministic.
- `docs/10_canon/FORAWWV.md` never auto-edited.
- `.claude/scheduled_tasks.lock` never staged.
- Locked worktree (`F:/awwv-baseline-probe`) never entered.
- No initial OSID overrides.
- No `avoided_osids_by_faction` usage.
- No new persisted state fields — `rawGameState` on `LoadedGameState` is a runtime-only passthrough handle, no save-migration bump.
- No save schema version bump.
- No engine sim path touched — every Phase H bridge consumes existing schema v32 + v33 substrate read-only.
- No baseline refresh in Phase H (Phase H is pure UI display; cannot legitimately move a baseline).
- No emojis; markdown GitHub-flavored.

## Architecture reinforcement

Phase H **is** the player-visible surface for the entire Phase D / E / F / G substrate stack:

- **H2** opens the engine query API to the UI shell. PURE read-only helpers; deterministic sorted output. Reusable by future F1 / E4 diagnostic-tool refactors.
- **H3 / H4 / H5 / H6** are independent component-level bridges, each conservatively shipped with optional props + graceful degradation. They can ship before their hosts are wired and continue to render correctly when the hosts catch up.
- **H7** is the single catalog wire-up that activates all four simultaneously — a deliberate design choice so a partial UI catalog rollout does not leave the four bridges in inconsistent visibility states.
- **H8** completes the wave-2 component set (Decision History) and integrates into the same App-boot-loaded catalog instance H7 established.

The closeout series now reads:

- **Phase D closeout** — what was authored (substrate + 44+ causal-chain packets + §6 sign-off).
- **Phase E activation procedure** — how to turn on the political-dimension consumer wiring safely.
- **Phase F closeout** — how to inspect, audit, and regression-test the chain (diagnostic suite + e2e integration test).
- **Phase G closeout** — how to keep the authoring + canon-compliance contract durable (authoring guide + tuned heuristic + named CI workflow).
- **Phase H closeout** (this doc) — how the player sees the chain (decision context, branch tags, codex unlock state, chronicle causality, decision history).

## Cross-references

- Closeout series entry 1 (authoring substrate): `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`
- Closeout series entry 2 (consumer activation): `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
- Closeout series entry 3 (observability layer): `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md`
- Closeout series entry 4 (operationalization + CI): `docs/40_reports/implemented/20260529_PHASE_G_CLOSEOUT.md`
- H1 scoping doc: `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md`
- Engine dimension vocabulary canonical map: `memory/engine_dimension_vocabulary.md`
- Sensitive-history canon: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
- H2 query helper source: `src/sim/events/causality_query.ts`
- H3 component source (extended): `src/ui/map/components/EventDecisionModal.tsx`
- H4 component source: `src/ui/map/components/BranchTagBadgeRow.tsx`
- H5 component source (extended): `src/ui/map/components/CodexPanel.tsx`
- H6 component source (extended): `src/ui/map/components/chronicle/generateWrappedSlides.ts`
- H7 wire-up sources: `src/ui/map/data/DataLoader.ts`, `src/ui/map/data/types.ts`, `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/App.tsx`, `src/ui/map/components/chronicle/WrappedOverlay.tsx`, `src/ui/map/components/BottomStatusStrip.tsx`
- H8 component source: `src/ui/map/components/DecisionHistoryOverlay.tsx`
- Phase H test suite: `tests/causality_query.test.ts`, `tests/ui/event_decision_modal_decision_context.test.ts`, `tests/ui/faction_branch_tags_badge.test.ts`, `tests/ui/codex_panel_unlock_state.test.ts`, `tests/ui/chronicle_causality_slides.test.ts`, `tests/ui/catalog_wireup_integration.test.ts`, `tests/ui/decision_history_overlay.test.ts`
- Foundational F-tier diagnostic suite (referenced by H1 §3): `tools/diagnostics/event_causality_chain.ts`, `tools/diagnostics/event_family_graph.ts`, `tools/diagnostics/political_dimensions_snapshot.ts`
