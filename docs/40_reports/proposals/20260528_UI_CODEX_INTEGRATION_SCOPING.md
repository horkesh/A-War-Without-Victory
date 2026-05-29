# UI/Codex Integration Scoping — Phase D Player-Facing Surface

**Phase:** H (UI/Codex integration)
**Packet:** 1 (scoping)
**Date:** 2026-05-28
**Status:** Design-level scoping. No code. No tests. No event JSON.
**Authors (joint):** Technical Architect + Game Designer + UI/UX Developer
**Branch:** `codex/diagnostics-output-artifact-doc-closeout`

## 1. Status + scope

### 1.1 What exists today (substrate complete)

- **Phase D causal political layer** — 39 packets authored (`docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`). Foundational decisions per faction (R1/B1/H1), six diplomatic trios (X1-X8), late-war operational trio (R13/H10/B27), Ring 3 sensitive families gated.
- **Phase B substrate** — runtime causality persisted on every save:
  - `state.military.fired_event_ids` (schema v32)
  - `state.military.closed_event_ids` (schema v32)
  - `state.military.event_causality_log: CausalityLogEntry[]` (schema v33)
  - `state.military.event_decision_log` (append-only, per-resolution, distinguishes `player` / `bot_political` / `bot_v1` / `bot_ai_default`)
  - `state.military.enabled_event_ids`
  - `state.military.pending_event_decisions: PendingEventDecision[]`
- **Phase E political dimensions** — strategic dimensions persisted (`state.military.negotiation.strategic_dimensions`) and propagation gated behind env flags (`AWWV_POLITICAL_DIMENSION_PROPAGATION` + `AWWV_PDP_INTL_STANDING_OPS_HESITATION` + `AWWV_PDP_COHESION_CAUTION_BIAS`). Currently OFF in calibration / production.
- **Phase F diagnostic suite** — three observability tools:
  - `tools/diagnostics/event_causality_chain.ts` (Phase F1) — runtime chain reader
  - `tools/diagnostics/event_family_graph.ts` (Phase F3) — static authoring graph (DOT / tree / JSON, family-colored, Ring 3 marked)
  - `tools/diagnostics/political_dimensions_snapshot.ts` (Phase E4) — dimension state + flag activation
- **EventDecisionModal** — `src/ui/map/components/EventDecisionModal.tsx` already renders pending decisions with `Historical default` and `Staff recommendation` badges, `EffectPreview`, `FutureConsequencePreview`, source-note dossier sidebar. Hard-locked modal (`dismissible={false}`).
- **CodexPanel** — `src/ui/map/components/CodexPanel.tsx` already renders historical essays gated by `firedEventIds`, by year (1992-1995), with `CategoryBadge`s; uses `loadedGameState.firedEvents` + `eventFlags` + `historicalComparison` + `costLedger` + `gameOver` as resolver context.
- **WrappedOverlay / ChronicleOverlay / ChronicleSpine** — `src/ui/map/components/chronicle/` end-of-campaign slide infrastructure already exists (`generateWrappedSlides`, `WrappedSlideComponent`, `ChronicleSpine`, `ChronicleCard`).

### 1.2 What is missing (player-facing gap)

Despite all of the above, the PLAYER never sees most of the causal Phase D substrate:

- No view of the causal chain the player is currently on. The modal shows the immediate decision but not *which foundational decision led here* nor *what canon-fork this option closes vs opens beyond the next consequence*.
- No view of decision history scoped to player-sourced decisions. The `event_decision_log` exists; no UI consumes it.
- No view of which foundational branch-tags the player has activated. The `sets_flags` payload writes branch tags (`rbih_civic` vs `rbih_bosniak_national` vs `rbih_pragmatic`, etc.) but those are invisible to the player.
- No view of what *other* factions are deciding in the same turn (cross-faction trio context — Vance-Owen, Owen-Stoltenberg, Washington, Contact Group, Dayton, deliberate-force-Aug-1995).
- No view of *what's CLOSED off* by the chain so far (foreclosed canon).
- End-of-campaign Wrapped slides exist but do not yet consume the causality substrate to render "what did I change vs preserve relative to history".
- Phase E flag-activation HUD is non-existent (acceptable for now — flags are OFF in production until post-calibration-merge).

### 1.3 What this doc covers

- Engine APIs to expose (read-only query helpers over existing state shape).
- UI components to extend (EventDecisionModal) and to add (Decision History, Codex causal-chain tab, branch-tag faction badge, end-of-campaign causality chronicle).
- State-management decisions (no new persisted fields).
- Integration touchpoints with existing UI files.
- Phasing recommendation (three implementation waves).
- Sensitive-history canon-gate (§4 / §3.6) read-only mirror.

### 1.4 What this doc does NOT cover

- Implementation. (Future packet — Phase H wave 1 packet.)
- Pixel-level UI design or interaction prototypes. (Future packet — UI/UX Developer asset review.)
- QA / test plan. (Future packet — QA Engineer test matrix authoring.)
- Phase E activation HUD design beyond the deferral note. (Future packet — when flags flip post-calibration.)
- Localization / i18n strings beyond noting that `t()` is already in use in `CodexPanel.tsx` and must continue.
- Save-migration. (Not needed — no new persisted fields.)

---

## 2. Player-facing experience goals

| Goal | Player question answered | Substrate consumed | Component |
|---|---|---|---|
| **A. Decision context** | "Why am I being asked this now? What chain led here? What are the other two factions facing this same turn?" | `event_causality_log` (ancestors), `pending_event_decisions` (cross-faction), event catalog (family, source_tier) | A — modal expansion panel |
| **B. Decision history** | "What did I already choose? Was that my historical choice or a divergence?" | `event_decision_log` filtered by `decision_source === 'player'` | B — Decision History overlay |
| **C. Codex causal-chain view** | "What events have I unlocked? What's still possible? What's foreclosed?" | `fired_event_ids`, `enabled_event_ids`, `closed_event_ids`, static authoring graph (F3) | C — Codex causal-chain tab |
| **D. Branch-tag faction badge** | "What foundational identity is my faction on?" | `event_flags` (resolved branch tags), `fired_event_ids` ∩ foundationals | D — Faction-panel branch-tag chip |
| **E. End-of-campaign chronicle** | "What did I change vs preserve relative to history? What did I close off?" | All of the above + Wrapped infrastructure | E — Wrapped slide extension |
| **F. Phase E HUD (deferred)** | "Why are my ops weaker this turn?" | `state.military.negotiation.strategic_dimensions`, env flags via `getActivePhaseEFlags` | Deferred — Phase H wave 3 |

All five live goals (A-E) require ZERO new persisted state. Phase B substrate already writes everything needed.

---

## 3. Engine APIs to expose (or build)

### 3.1 Already-available state shape

Confirmed by reading `src/state/game_state.ts` lines 2240-2400 and `src/sim/events/event_types.ts`:

- `state.military.fired_event_ids: string[]`
- `state.military.closed_event_ids?: string[]`
- `state.military.event_causality_log?: CausalityLogEntry[]` (sorted on read by `(turn, from_event, to_event ?? '', to_flag ?? '', kind, source_response_id ?? '')`)
- `state.military.event_decision_log: Array<{ event_id, response_id, decision_source, faction, turn }>`
- `state.military.enabled_event_ids: string[]`
- `state.military.pending_event_decisions?: PendingEventDecision[]`
- `state.military.event_flags: Record<string, string | number | boolean>`
- `state.military.event_fire_counts: Record<string, number>`
- `state.military.event_last_fired_turn: Record<string, number>`
- `state.military.negotiation.strategic_dimensions?: DimensionStore` (for Phase E HUD, deferred)

These are all PERSISTED in save (schema v32 + v33) and already read by `validateGameState` and the Phase F1 / F3 / E4 diagnostic harnesses.

### 3.2 To-build read-only query helpers

Proposed new file: `src/sim/events/causality_query.ts` (UI-safe; no engine mutation; pure functions over state shape). Each helper mirrors a Phase F diagnostic but exposes a UI-consumable shape rather than text/DOT/JSON renderers.

| Helper | Inputs | Output | Mirrors |
|---|---|---|---|
| `getCausalDescendants(eventId, state)` | event id, GameState | `Set<string>` of event ids transitively enabled (BFS forward over `event_causality_log` `enables` + `future_consequence` edges) | F1 `collectEventNeighborhood` (downstream half) |
| `getCausalAncestors(eventId, state)` | event id, GameState | `Set<string>` of event ids that enabled this one (BFS reverse) | F1 `collectEventNeighborhood` (upstream half) |
| `getPlayerDecisionHistory(state)` | GameState | `EventDecision[]` filtered to `decision_source === 'player'`, sorted by turn ascending | New — direct filter over `event_decision_log` |
| `getCounterfactualDivergencePoints(state, catalog)` | GameState + event catalog | `Array<{ event_id, chosen_option, historical_default_option }>` where `chosen_option !== historical_default_response_id` and `decision_source === 'player'` | New — joins decision log against catalog `historical_default_response_id` |
| `getBranchTagsActive(state, catalog)` | GameState + event catalog | `Record<FactionId, string[]>` — resolves the canonical branch tags set by every fired foundational option's `sets_flags` payload | New — joins `fired_event_ids` ∩ foundationals with each option's `sets_flags` |
| `getCausalChainAt(turn, state)` | turn number, GameState | `EventCausalitySnapshot`-like trimmed to `entry.turn <= turn` | New — turn-bounded slice of F1 snapshot |
| `getCrossFactionPendingDecisions(state)` | GameState | `PendingEventDecision[]` grouped by event family (Vance-Owen, Washington, etc.) for trio framing | New — group `pending_event_decisions` by `family` |
| `getActivePhaseEFlags(envOverride?)` | optional env | `GateActivationSnapshot` (already exported by Phase E4) | F4 `buildGateActivation` (re-export) |
| `getProjectedDimensionMultiplier(faction, state, envOverride?)` | faction, state, optional env | `current_cumulative_multiplier: number` per Phase E4 logic | F4 `buildFactionSnapshot` (single-faction wrapper) |

**Design rule:** every helper is PURE; no side effects on state. Iteration is sorted via `strictCompare` to match the on-read sort contract in `validateGameState`. No `Math.random`, no `Date.now`. The helpers may be invoked from both the renderer (UI) and the main process (Electron preload bridge) — Phase H wave 1 implementation packet decides which side computes which.

### 3.3 Phase E activation surfacing (deferred)

`getActivePhaseEFlags()` and `getProjectedDimensionMultiplier(faction, state)` are the planned read-side hooks. Both already implemented in `tools/diagnostics/political_dimensions_snapshot.ts` exports (`buildGateActivation`, `buildFactionSnapshot`) — Phase H wave 3 lifts them into `src/sim/events/causality_query.ts` (or a sibling module) so the renderer can import without pulling tool-tree code.

---

## 4. UI components to build

### 4.1 Existing infrastructure (do NOT duplicate)

| Existing file | Role | Reuse pattern |
|---|---|---|
| `src/ui/map/components/EventDecisionModal.tsx` | Pending decision modal | Extend with a new optional `DecisionContextPanel` child (Component A). |
| `src/ui/map/components/CodexPanel.tsx` | Essay viewer keyed off `firedEvents` | Extend with a second tab "Causal chains" (Component C). Essay surface stays as-is. |
| `src/ui/map/components/chronicle/WrappedOverlay.tsx` + `WrappedSlide.tsx` + `generateWrappedSlides.ts` | End-of-campaign Wrapped flow | Extend `generateWrappedSlides` with causality slides (Component E). |
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` + `ChronicleSpine.tsx` + `ChronicleCard.tsx` | In-campaign chronicle ledger | Reuse styling primitives for Decision History overlay (Component B). |
| `src/ui/shared/Modal.tsx` | Shared modal wrapper | Use for any new modal (Decision History). |
| `src/ui/map/store/gameStore.ts` | Zustand store; loaded game state already exposed to components | Add UI-local toggles only (decisionHistoryOpen, etc.). No new persisted state. |

### 4.2 New components needed

**A. Decision-context expansion panel** (inside `EventDecisionModal.tsx`)

Renders inside the existing modal, as a third column or below the existing `Dossier` sidebar:

- "Chain origin" — the foundational event id + family (e.g., `rbih_state_identity_1992 [family=RBiH]`) that the current event traces back to. Computed via `getCausalAncestors(decision.event_id, state)` then filtered to `state.military.fired_event_ids` and ranked by source-tier + turn ascending.
- "Recent ancestry" — last 3 fired events in the chain (turn, event id, family, chosen option).
- "Other factions facing decisions this turn" — `getCrossFactionPendingDecisions(state)` rows for the same family group, rendered as a compact 3-row list (RS / RBiH / HRHB). Reads from `pending_event_decisions[].faction` and family field.
- "Source citation" — already partially shown via `sourceNote` in `Dossier`. Expansion shows the full `historical_source` + `source_tier` field. Sensitive events (Ring 3 family or `source_tier === 'icty_icj_un'`) get a red-bordered citation block.

No props change required for `EventDecisionModalProps`. The panel pulls `state` from `useGameStore` directly. Behind a feature flag `AWWV_UI_DECISION_CONTEXT` for staged rollout (mirrors Phase E flag pattern).

**B. Decision-history overlay** (new component `src/ui/map/components/DecisionHistoryOverlay.tsx`)

Triggered by a new hotkey or a sidebar button (Phase H wave 1 implementation packet picks one). Renders:

- Filtered, sorted list of `getPlayerDecisionHistory(state)` rows. Each row: turn, event id, event title (resolved from catalog), faction, chosen option label, divergence chip (yes / no via `getCounterfactualDivergencePoints`).
- Click-to-expand: shows `getCausalDescendants(event_id, state) ∩ fired_event_ids` (what fired downstream) + `closed_event_ids ∩ descendants` (what was foreclosed).
- Empty state: "No player decisions yet — your first presidential decision will land in the modal."
- Uses the shared `Modal` wrapper with `dismissible={true}` (this is a review surface, not a forced-response surface).
- Virtualized list (potentially 100+ entries by Dayton; reuse list-virtualization pattern from `OrderQueue.tsx` / `EventLogPanel.tsx`).

**C. Codex causal-chain tab** (extends `CodexPanel.tsx`)

`CodexPanel` currently renders one viewer (essay-only). Phase H wave 2 adds a tab selector:

- Tab 1: "Essays" (existing UI, unchanged).
- Tab 2: "Causal chains" — three sub-sections:
  - **Fired** — events that have fired this campaign, grouped by family, sortable by turn. Each row: family chip, source_tier chip, ICTY citation if present.
  - **Open** — events ENABLED but not fired (from `enabled_event_ids \ fired_event_ids`).
  - **Foreclosed** — `closed_event_ids` with `closed_by` event + `turn_closed` (resolved via Phase F1 logic).
- Visual: family-graph tree from F3 `renderTree` output, paginated by family. Re-implementing the tree as React (not SVG/DOT) — flat list with indentation suffices for v1; Phase H wave 3 may upgrade to a force-graph layout if user-tested adoption justifies it.
- Sensitive marker: Ring 3 events get a red border and a "Historically binding — source: ICTY case X-X" tooltip.

**D. Branch-tag faction badge** (new component or new section inside existing faction info panel)

Renders in the faction info area (likely beside `getPlayerSafePoliticalFactionName(state)` header). Component name TBD — proposal: `BranchTagBadgeRow.tsx` in `src/ui/map/components/`.

- For the player faction (and optionally bot factions in spectator mode): one chip per active branch tag from `getBranchTagsActive(state, catalog)[faction]`.
- Example chips for RBiH: `civic` / `bosniak_national` / `pragmatic` (mutually exclusive within `rbih_state_identity_1992`). Plus additive branch tags from downstream foundationals.
- Hover tooltip: which event set this tag + which turn.

**E. End-of-campaign chronicle slides** (extends `generateWrappedSlides.ts`)

Existing Wrapped infrastructure (`WrappedOverlay`, `WrappedSlideComponent`, `generateWrappedSlides`) already renders end-of-campaign slides. Phase H wave 3 adds new slide types:

- "Foundational choices" — one slide per faction (player's faction emphasized): the foundational option chosen + the branch tag set.
- "Your divergences" — `getCounterfactualDivergencePoints` rendered as a count + top-3 list with turn + event title + chosen vs historical.
- "What you closed off" — `closed_event_ids` filtered to events whose `closed_by` is in the player's decision chain. Each row: event title + family + canonical historical outcome lost.
- "Causality chronicle" — a single slide pointing back to in-campaign Decision History (component B) for full audit trail.

All slide content is computed at slide-generation time from save state; no new persisted fields. The existing pre-rendered slide cache (if any) is unchanged.

### 4.3 Phase E flag-activation HUD (deferred — Phase H wave 3)

When Phase E flags flip ON post-calibration-merge:

- Compact HUD strip near the turn counter: "Patron support: 20/100 (embargo bites: ops -15%)". Reads from `getProjectedDimensionMultiplier(playerFaction, state)`.
- One per faction in spectator mode.
- Detail tooltip surfaces the per-dimension breakdown from Phase E4 `buildFactionSnapshot.cells`.
- Out of scope for Phase H waves 1-2.

---

## 5. State management decisions

| Decision | Choice | Rationale |
|---|---|---|
| Persisted state changes | **None** | Causality log + decision log + closed events + flags are already persisted by Phase B substrate. UI is pure derivation. |
| Save-migration version bump | **No** | No schema change. No migration. |
| Query-helper location | `src/sim/events/causality_query.ts` (new) | Mirrors `event_loader.ts` / `event_families.ts` siblings. UI imports from `src/sim/events/` already established (see `EventDecisionModal.tsx` line 14-20). |
| Renderer-vs-main computation | Default to renderer | Save state already deserialized in renderer via `useGameStore`. Phase H wave 1 packet may move heavy graph-walks to preload if perf regression observed. |
| Caching | Per-turn memoization | Reuse `useMemo` keyed on `loadedGameState.turn` + `firedEvents.length`. Mirrors `CodexPanel.tsx` resolver pattern. |
| Virtualization | Decision History only | Other surfaces (modal panel, branch-tag badge) bound by family/foundational counts (<20). Decision History potentially 100+ rows by Dayton. |
| Feature flags | `AWWV_UI_DECISION_CONTEXT`, `AWWV_UI_DECISION_HISTORY`, `AWWV_UI_CODEX_CAUSAL_CHAINS`, `AWWV_UI_BRANCH_TAG_BADGE`, `AWWV_UI_CAUSALITY_WRAPPED` | Per-component env flags so each wave ships independently. Mirrors Phase E `AWWV_POLITICAL_DIMENSION_PROPAGATION` pattern. |
| Determinism | All UI computation is read-only over persisted state | No new sources of nondeterminism. Sorted iteration via `strictCompare`. |
| Localization | Continue `t()` pattern from `CodexPanel.tsx` | Branch-tag labels, divergence chips, chronicle slide copy must route through `t()`. |

---

## 6. Integration touchpoints

| File | Change | Wave |
|---|---|---|
| `src/sim/events/causality_query.ts` (NEW) | Read-only query helpers (§3.2) | 1 |
| `src/ui/map/components/EventDecisionModal.tsx` | Add decision-context expansion panel (Component A) | 1 |
| `src/ui/map/components/DecisionHistoryOverlay.tsx` (NEW) | Decision History overlay (Component B) | 1 |
| `src/ui/map/store/gameStore.ts` | UI-local toggles only: `decisionHistoryOpen`, `setDecisionHistoryOpen`, `codexTab`, `setCodexTab` | 1-2 |
| `src/ui/map/components/CodexPanel.tsx` | Tab selector + Causal-chains tab (Component C) | 2 |
| `src/ui/map/components/BranchTagBadgeRow.tsx` (NEW) | Faction-panel branch-tag badge (Component D) | 2 |
| Player-faction header (location TBD — likely `BottomStatusStrip.tsx` or `StrategicDashboard.tsx`) | Mount `BranchTagBadgeRow` | 2 |
| `src/ui/map/components/chronicle/generateWrappedSlides.ts` | Causality slides (Component E) | 3 |
| `src/ui/map/components/chronicle/WrappedSlide.tsx` | New slide-type renderers if needed | 3 |
| Phase E HUD location (TBD) | Activation HUD (deferred) | 3 |
| `data/scenarios/events/*.json` | Unchanged. | — |
| Engine sim code (`src/sim/...` outside `events/causality_query.ts`) | Unchanged. | — |
| Canon (`docs/10_canon/`) | Unchanged. | — |

`src/desktop/` was searched for `.tsx`; none found. Electron entry is `src/desktop/` for main process; the renderer lives entirely under `src/ui/map/`. Future Decision History overlay therefore mounts inside the renderer, not in a separate Electron window.

---

## 7. Source-tier display + Cost Ledger wording

Per `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §4 (Cost Ledger Wording Constraints):

- Cost Ledger annotations and Codex prose MUST be prosecutorial / ICTY-cited. No euphemisms.
- The UI must surface `source_tier` on every event row in the Codex Causal-chains tab and Decision History overlay. Catalog values per F3 reader: `icty_icj_un`, `agreement_text`, `balkan_battlegrounds`, plus other authored tiers from `data/scenarios/events/*.json`.
- For Ring 3 family events (per `isRing3SensitiveFamily` in `src/sim/events/event_families.ts`), Modal + Decision History row + Codex row all display the §3.6 source-note guard text alongside the option label. Already partially achieved in `EventDecisionModal.tsx` via `sourceNote` propagation; extension wires the same prop through Components B + C.
- For non-sensitive events, the existing description display is sufficient.

The Cost Ledger renderer (existing) already enforces §4 wording. No UI rewrite needed; the new components consume the existing Cost Ledger output rather than re-rendering raw flag payloads.

---

## 8. Sensitive-history UI canon-gate (§4 + §3.6 enforcement)

Read-only mirror of engine canon-gate. The engine already enforces:

- Ring 3 family freeze via `RING3_SENSITIVE_FAMILIES` set (in `src/sim/events/event_families.ts`).
- Camp-exposure option freeze via `CAMP_EXPOSURE_OPTION_IDS` (in `src/sim/events/event_loader.ts`).
- Phase F2 strict canon-compliance gate (CI-enforced — see Phase G4 ledger entry: `event-system-ci.yml` workflow).

The UI mirrors these without re-validating:

- Modal `ResponseButton` for a Ring 3 / camp-exposure option renders with a red border + canon-binding chip "Historically binding — author-locked".
- Decision History rows for Ring 3 events include the same red-border treatment.
- Codex Causal-chains tab "Foreclosed" sub-section flags Ring 3 entries with the §3.6 source-note guard text inline.
- Player cannot author or modify sensitive events at runtime — already engine-enforced; UI is read-only on these rows.
- Cost Ledger prose for sensitive events passes through existing §4 prosecutorial-voice renderer; UI does not edit copy.

§3 (Player-Authorized War Crime Surface) Ring 1 explicit events display with the canonical author-supplied option labels and `humanitarian_impact` effect rows; no UI suppression.

---

## 9. Implementation phasing recommendation

| Wave | Components | Query helpers | Deliverable |
|---|---|---|---|
| **Phase H wave 1** (recommended first) | A (modal context panel) + B (Decision History overlay) | `getCausalDescendants`, `getCausalAncestors`, `getPlayerDecisionHistory`, `getCounterfactualDivergencePoints`, `getCrossFactionPendingDecisions` | Minimal viable: player can see decision context in-modal + audit decision history. Demonstrates the substrate is accessible. |
| **Phase H wave 2** | C (Codex causal-chain tab) + D (branch-tag faction badge) | `getBranchTagsActive`, `getCausalChainAt` | Codex extension + faction identity readout. Requires a UI design pass for the causal-chain tree and the branch-tag chip styling. |
| **Phase H wave 3** | E (causality Wrapped slides) + Phase E HUD activation surfacing | `getActivePhaseEFlags`, `getProjectedDimensionMultiplier` | End-of-campaign chronicle + Phase E flag visibility once flags flip ON post-calibration-merge. |

Each wave ships behind its own env flag (§5) so partial rollout is safe. Calibration runs default flags OFF; player builds default flags ON once UI work merges.

---

## 10. Dependencies + sequencing

- **Wave 1 depends on**: Phase D substrate (DONE), Phase E substrate (DONE), Phase F diagnostics (DONE — used as reference implementation for query helpers).
- **Wave 1 internal sequencing**:
  1. Query helpers (`src/sim/events/causality_query.ts`) ship first with unit tests mirroring Phase F1 test patterns.
  2. Decision Context Panel (A) consumes helpers; ships behind `AWWV_UI_DECISION_CONTEXT`.
  3. Decision History Overlay (B) consumes helpers; ships behind `AWWV_UI_DECISION_HISTORY`.
- **Wave 2 depends on**: Wave 1 merged; UI design pass for Codex tab + branch-tag chip; new icons / chips if any (asset review).
- **Wave 3 depends on**: Phase E activation post-calibration-merge (currently blocked on flag flip); Wave 1 + Wave 2 merged.

---

## 11. Open design questions (for user / Game Designer)

1. **Decision History surface — overlay or sidebar?** Modal overlay (matches `WrappedOverlay` pattern) keeps the main map clean but requires explicit open / close. A persistent sidebar tab (matches `OOBSidebar.tsx`) makes the history one click away but consumes screen real estate.
2. **Codex causal-chains tab — tree or list?** Tree layout (mirroring F3 ASCII output) shows topology but is harder to scan. Flat list grouped by family is easier to scan but loses depth-relationships. v1 default: flat list grouped by family with collapsible foundational headers.
3. **End-of-campaign chronicle — pre-rendered or live-computed?** Pre-rendered at game-over locks the narrative against post-game state mutation but adds save fields. Live-computed at slide-generation time preserves the no-new-persisted-state rule (preferred). Default: live-computed.
4. **Sensitive-event visual treatment — which canonical marker?** Red border is the simplest. Alternatives: warning icon + tooltip, monochrome rendering, source-tier chip. Coordinate with UI/UX Developer asset review.
5. **Phase E flag activation surfacing — player-visible or developer-only?** When flags flip ON, should the HUD strip render for the player (transparent "embargo bites: -15% ops" indicator) or stay developer-only (no UI; effect propagates invisibly)? Game Designer call. Default proposal: player-visible with prose label, no raw multiplier exposed.

---

## 12. Cross-references

### Phase docs

- `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md` — Phase D substrate scope
- `docs/40_reports/implemented/20260527_EVENT_STAFF_RECOMMENDATION_DEFAULTS.md` — existing modal staff-recommendation badge infrastructure
- `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` (v1.3) — schema v32 + v33 source

### Canon

- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §3.6 (forward-looking guard), §4 (Cost Ledger wording), §1.3 (Ring 3 refusal)
- `docs/20_engineering/EVENT_SYSTEM_AUTHORING_GUIDE.md` §4 (CI gates including Phase F2 strict gate)

### Engine

- `src/state/game_state.ts` lines 2240-2400 — military.* event-substrate fields
- `src/sim/events/event_types.ts` — `PendingEventDecision`, `EventResponseOption`, `EventEffect`, `DimensionShift`, `EventFutureConsequence`, `CausalityLogEntry`
- `src/sim/events/event_families.ts` — `isRing3SensitiveFamily`, `RING3_SENSITIVE_FAMILIES`
- `src/sim/events/event_loader.ts` — `CAMP_EXPOSURE_OPTION_IDS`

### Diagnostic suite (reference implementations for query helpers)

- `tools/diagnostics/event_causality_chain.ts` (Phase F1) — `buildEventCausalitySnapshot`, `collectEventNeighborhood`, `findFoundationals`
- `tools/diagnostics/event_family_graph.ts` (Phase F3) — `buildEventFamilyGraph`, `extractEdgesFromRow`, `getDescendants`, `isRing3SensitiveFamily` consumer
- `tools/diagnostics/political_dimensions_snapshot.ts` (Phase E4) — `buildPoliticalDimensionsSnapshot`, `buildGateActivation`, `buildFactionSnapshot`

### Existing UI files

- `src/ui/map/components/EventDecisionModal.tsx` — pending-decision modal (Component A extension target)
- `src/ui/map/components/CodexPanel.tsx` — essay viewer (Component C extension target)
- `src/ui/map/components/chronicle/WrappedOverlay.tsx` + `WrappedSlide.tsx` + `generateWrappedSlides.ts` (file exists — sibling) — end-of-campaign Wrapped (Component E extension target)
- `src/ui/map/components/chronicle/ChronicleOverlay.tsx` + `ChronicleSpine.tsx` + `ChronicleCard.tsx` — in-campaign chronicle (styling reuse for Component B)
- `src/ui/shared/Modal.tsx` — shared modal wrapper

### Search results that informed this doc

- `src/desktop/**/*.tsx` — 0 matches. Renderer lives in `src/ui/map/`; no separate Electron renderer window.
- `src/ui/map/components/**/Codex*` — `CodexPanel.tsx` exists. No `Wrapped*` outside `chronicle/`.

---

## 13. Verification + ledger

- This packet adds one new doc file: `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md`. No code. No tests. No event JSON. No canon edits. No `docs/10_canon/FORAWWV.md` edits.
- Determinism unaffected (no engine code touched).
- Ledger entry appended to top of `docs/PROJECT_LEDGER.md` per protocol.
- Future implementation packet (Phase H wave 1) will introduce `src/sim/events/causality_query.ts` + unit tests + UI component changes; this scoping doc is the design contract that packet executes against.
