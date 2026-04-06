# v0.8.4 Phase C — Level 1 Proposals, Review UI, and Level 2+ Unlock

**Date:** 2026-04-06
**Status:** CLOSED
**Milestone:** v0.8.4 Autonomy Depth + Claude API at Political Level
**Phase:** C of 5+ (Phase C: Level 1 Proposal Generation + Accept/Reject IPC + UI Surface + Level 2+ Unlock)

---

## Summary

Phase C delivers the first end-to-end autonomy proposal loop: at Level 1 Assisted, the formula AI now generates corps stance-change proposals each turn, surfaces them to the player as `PendingProposalReview` records, and accepts or rejects them via two new IPC handlers that write the result back into `CorpsCommandState`. A new `AutonomyPanel` React component exposes the autonomy level selector (0–3) and a per-proposal accept/reject card list to the player. The Level 2+ feature gate introduced in Phase B is removed — `set-autonomy-level` now accepts all values 0–3, with the full-delegation path already wired in the `ai-army-decisions` and `ai-corps-decisions` pipeline steps from Phase 1. Phase C adds 32 new tests across 9 groups; the suite is 2813/2813 clean.

---

## What Was Implemented

### State Schema Extension (`src/state/game_state.ts`)

Two fields added to the existing `PendingProposalReview` interface:

| Field | Type | Purpose |
|---|---|---|
| `current_value?` | `string` | Human-readable representation of the current state (e.g. current corps stance) |
| `proposed_value?` | `string` | Human-readable representation of the proposed change (e.g. proposed stance) |

One field added to `CorpsCommandState`:

| Field | Type | Purpose |
|---|---|---|
| `ai_recommended_stance?` | `CorpsStance` | Formula AI's stance recommendation, written every turn before the `player_ordered_stance` guard executes |

### Stance Recommendation Recording (`src/sim/combat/bot_corps_stance.ts`)

`generateCorpsStanceOrders()` now writes `cmd.ai_recommended_stance = stance` before the `player_ordered_stance` guard check. This means the formula recommendation is always recorded regardless of whether the bot is permitted to apply it. Player-ordered corps therefore carry the AI's recommended stance as a proposal candidate without having their active stance overwritten.

### Proposal Generation (`src/sim/ai_commander/proposal_generation.ts` — NEW)

`generateLevel1StanceProposals(state, playerFaction)`: pure deterministic function that iterates all player corps (sorted via `strictCompare`), reads `ai_recommended_stance` from `CorpsCommandState`, and emits `PendingProposalReview[]` under the following rules:

| Rule | Effect |
|---|---|
| `ai_recommended_stance` absent | Skip corps — no recommendation recorded |
| `ai_recommended_stance === current stance` | Skip corps — no change to propose |
| `player_ordered_stance` set | Skip corps — player has already issued an explicit order |
| All other corps | Emit proposal with deterministic `PROP_<turn>_military_<seq>` ID |

`proposed_action` format: `SET_STANCE:<corps_id>:<stance>` — colon-delimited, parseable by the CJS IPC handler without an ESM import.

### Pipeline Steps (`src/sim/turn_phases/war_phases.ts`)

Two new steps added (step count 151→153):

| Step | Position | Behavior |
|---|---|---|
| `generate-player-stance-recommendations` | After bot stance pass | Runs the stance recommendation logic for the player faction, populating `ai_recommended_stance` on each corps |
| `generate-level1-proposals` | After recommendations step | Calls `generateLevel1StanceProposals()`, writes results to `state.meta.pending_proposal_reviews` |

The existing `apply-autonomy-transition` step was extended to expire unresolved proposals from prior turns before generating new ones.

### IPC Handlers (`src/desktop/electron-main.cjs`)

| Handler | Behavior |
|---|---|
| `accept-proposal` | Parses `proposed_action` (`SET_STANCE:<corps_id>:<stance>`); writes proposed stance to `corps_command[id].stance` AND `player_ordered_stance`; marks proposal `accepted: true`, `resolved_turn`; persists save |
| `reject-proposal` | Marks proposal `accepted: false`, `resolved_turn`; writes current stance as `player_ordered_stance` for one turn — prevents the formula AI from re-applying the same proposal in the immediate next cycle |
| `set-autonomy-level` | Level 2+ feature gate **removed** — all levels 0–3 now settable |

### Preload Bridge (`src/desktop/preload.cjs`)

Two new entries:

| Bridge entry | Maps to |
|---|---|
| `acceptProposal(proposalId)` | `ipcRenderer.invoke('accept-proposal', proposalId)` |
| `rejectProposal(proposalId)` | `ipcRenderer.invoke('reject-proposal', proposalId)` |

### UI Component (`src/ui/map/components/AutonomyPanel.tsx` — NEW)

React component mounted conditionally from `App.tsx` via `autonomyPanelOpen` state:

- **Level selector:** radio/button group 0–3 with label text (Full Presidential Control / Assisted / Delegated / Observer). Calls `window.awwv.setAutonomyLevel(level)` on change.
- **Proposal review panel:** iterates `pending_proposal_reviews` from `getAutonomyState()`; renders one card per pending proposal showing description, `current_value`, `proposed_value`, and Accept/Reject buttons.
- Accept calls `window.awwv.acceptProposal(id)`; Reject calls `window.awwv.rejectProposal(id)`.
- Uses `GlassPanel` wrapper. Local state only — no Redux/shared store dependency.

### Type Surface (`src/ui/map/desktop/useIPC.ts`)

`WindowAwwv` interface extended with the full Phase B+C bridge surface:

```typescript
getAutonomyState(): Promise<...>
setAutonomyLevel(level: number): Promise<...>
overrideAiDecision(override: ...): Promise<...>
acceptProposal(proposalId: string): Promise<...>
rejectProposal(proposalId: string): Promise<...>
```

### Tests (`tests/sim/autonomy/autonomy_phase_c.test.ts` — NEW)

32 tests across 9 groups:

| Group | Coverage |
|---|---|
| Proposal generation guards | No recommendation → skip; no-change → skip |
| Proposal shape | Correct ID format, domain, faction, `proposed_action` string |
| `player_ordered_stance` skip | Player-ordered corps excluded from proposals |
| Sort order | Corps sorted by `strictCompare` → deterministic proposal sequence |
| Determinism | Same state produces identical proposal list across repeated calls |
| State machine | Accept writes stance + `player_ordered_stance`; Reject locks current as `player_ordered_stance` |
| Schema contract | `current_value` and `proposed_value` fields present and typed correctly |
| Level 2+ gate removal | `set-autonomy-level` no longer returns `level_2_plus_not_yet_enabled` error |
| Proposal expiry | `apply-autonomy-transition` clears unresolved prior-turn proposals before generating new ones |

Step count test (`tests/war_phase_step_order.test.ts`) updated 151→153 with changelog comment.

---

## Design Decisions

### Domain scope for Level 1

Level 1 Assisted proposals cover corps stance changes only. This is the narrowest meaningful proposal domain — the formula AI already computes stance recommendations every turn as part of bot_corps_stance.ts, so surfacing them to the player costs zero new inference and produces immediately legible choices.

### `proposed_action` as colon-delimited string

The IPC handler is CJS; the proposal generation module is ESM. Rather than a shared type import, `proposed_action` uses a self-describing string (`SET_STANCE:<corps_id>:<stance>`) that the CJS handler can parse with a simple `split(':')`. This keeps the boundary clean without requiring a CommonJS bridge module.

### Accept writes both `stance` and `player_ordered_stance`

Accepting a proposal applies the recommended stance immediately and records it as player-ordered. This prevents the bot from undoing the accepted stance on the next cycle — the `player_ordered_stance` guard in `bot_corps_stance.ts` will skip this corps until the player explicitly changes it.

### Reject locks current stance for one turn

Rejecting a proposal writes the *current* stance as `player_ordered_stance` — not the proposed stance. This signals the player's intent to hold course for one turn, giving the bot exactly one turn of silence before it may surface a new recommendation on the next cycle.

### Expiry at `apply-autonomy-transition`

Unresolved proposals do not accumulate. At the start of each turn, `apply-autonomy-transition` clears all proposals from the prior turn before the recommendation and generation steps run. Players who do not review proposals in time lose those specific proposals, but the formula AI will regenerate equivalent ones next turn if conditions still apply.

---

## Fallback Contract (Updated)

The following table reflects the updated state of the fallback contract after Phase C.

| Level | Label | No API key | API error (Phase D+) |
|---|---|---|---|
| 0 | Full Presidential Control | Formula bot only for enemy factions. Player faction: no AI. Unchanged from pre-v0.8.4. | N/A — no API calls at Level 0 ever. |
| 1 | Assisted | **Phase C: End-to-end live.** Formula AI generates stance proposals each turn. `accept-proposal` / `reject-proposal` IPC handlers live. `AutonomyPanel` React component surfaces proposals to player. No API calls at Level 1 — pure formula recommendations. | Phase D+: show last-known proposal or empty proposal state. Never block player action. |
| 2 | Delegated | **Phase C: Feature gate removed.** `set-autonomy-level` accepts level 2. Formula AI runs all military decisions for player faction via `ai-army-decisions` / `ai-corps-decisions` `botFactions` path (wired in Phase 1). Player sees delegated status in `AutonomyPanel`. | Phase D+: formula bot fallback. Player sees "delegated to formula AI" status. |
| 3 | Observer | **Phase B: `requires_player_response` gate live.** High-stakes events route to player even at Level 3. Formula AI runs all military + political decisions. **Phase C: gate removal also applies** — Level 3 now freely settable. | Phase D+: formula bot fallback. High-stakes events always surfaced to player. |

---

## Active Side Lanes

The following known open issues were reviewed against Phase C scope:

| Issue | Classification | Notes |
|---|---|---|
| Desktop New Game Snapshot | DEFERRED | Own lane — independent of autonomy system |
| Warroom parity | DEFERRED | Own lane — UI density/cohesion pass, v0.8-to-v0.9 |
| Drina regression (~1.5pp) | DEFERRED | Calibration lane — pre-existing, not Phase C scope |
| boljanic_2 Doboj P1 | DEFERRED | Calibration lane — pre-existing open anchor |
| Ozren pocket P1 | DEFERRED | Calibration lane — pre-existing |
| Warlord enclave-lock fix (Orić/Srebrenica, Palić/Žepa) | DEFERRED | Historian-flagged, own lane — no autonomy dependency |
| High-stakes event authoring (Sarajevo UNPROFOR ultimatum) | NEXT | Phase D — first high-stakes event with `requires_player_response: true`; exercises the Level 3 gate closed in Phase B |
| Op planning proposals (which corps should launch an offensive) | NEXT | Phase D — extends Level 1 Assisted beyond stance domain into operation planning |

---

## Open Gaps

Phase D should address:

| Gap | Severity | Resolution |
|---|---|---|
| Op planning proposals — Level 1 does not yet generate proposals for offensive operation launch decisions | Medium | Phase D. Requires reading `CampaignPlan` / `CommanderIntent` output and surfacing corps-level operation recommendations. |
| High-stakes event authoring — no event currently carries `requires_player_response: true` | Medium | Phase D. Sarajevo UNPROFOR ultimatum event is the target vehicle. Level 3 gate from Phase B is live and waiting. |
| `override-ai-decision` end-to-end integration test (override lands in GameState, readable via `getAutonomyState`) | Low | Phase D. Phase B unit tests cover helpers. Full IPC round-trip test deferred. |
| `AutonomyPanel` visual polish (density, transition, keyboard nav) | Low | v0.8-to-v0.9 UI pass — not blocking. |

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | CLEAN |
| `npm run test:vitest` | 2813/2813 pass (195 files, +32 new Phase C tests; was 2781/2781) |
| `npm run desktop:map:build` | CLEAN (6.49s) |
| Build warnings | 3 pre-existing accepted debt items (large chunk, dynamic/static overlap, loaders.gl spawn) |
| Canon review | GREEN |
| QA verdict | READY FOR COMMIT |

### Accepted build debt (pre-existing, not Phase C regressions)

1. **Large chunk** — `tactical_map-*.js` 3,146 kB / 865 kB gzip. MapLibre+deck.gl bundle. Requires `manualChunks` split; out of Phase C scope.
2. **Dynamic/static import overlap** — 3 instances in `Minimap.tsx`. Fix = convert to static imports in Minimap.tsx. Deferred.
3. **loaders.gl `spawn` warning** — `@loaders.gl/worker-utils` ships Node-only `child_process.spawn` reference. Not reachable in browser/Electron. Vendor packaging issue; not fixable without upstream change.

---

## Files Changed

| File | Change |
|---|---|
| `src/state/game_state.ts` | +2 fields on `PendingProposalReview` (`current_value?`, `proposed_value?`); +1 field on `CorpsCommandState` (`ai_recommended_stance?: CorpsStance`) |
| `src/sim/combat/bot_corps_stance.ts` | Sets `cmd.ai_recommended_stance = stance` before the `player_ordered_stance` guard — always records formula recommendation |
| `src/sim/ai_commander/proposal_generation.ts` | NEW — `generateLevel1StanceProposals(state, playerFaction)`: iterates player corps sorted by `strictCompare`, reads `ai_recommended_stance`, skips no-change and player-ordered corps, emits `PendingProposalReview[]` with deterministic `PROP_<turn>_military_<seq>` IDs |
| `src/sim/turn_phases/war_phases.ts` | `apply-autonomy-transition` extended to expire prior-turn proposals; 2 new steps: `generate-player-stance-recommendations`, `generate-level1-proposals`. Step count 151→153. |
| `src/desktop/electron-main.cjs` | Level 2+ feature gate removed from `set-autonomy-level`; 2 new IPC handlers: `accept-proposal`, `reject-proposal` |
| `src/desktop/preload.cjs` | 2 new bridge entries: `acceptProposal`, `rejectProposal` |
| `src/ui/map/components/AutonomyPanel.tsx` | NEW — React component: autonomy level selector (0–3) + proposal review panel (accept/reject per card) |
| `src/ui/map/App.tsx` | Imports `AutonomyPanel`; adds `autonomyPanelOpen` state; mounts panel conditionally |
| `src/ui/map/desktop/useIPC.ts` | `WindowAwwv` interface extended with Phase B+C bridge (`getAutonomyState`, `setAutonomyLevel`, `overrideAiDecision`, `acceptProposal`, `rejectProposal`) |
| `tests/sim/autonomy/autonomy_phase_c.test.ts` | NEW — 32 tests across 9 groups |
| `tests/war_phase_step_order.test.ts` | Step count updated 151→153 with changelog comment |

---

## Next Phase

**Phase D: Op Planning Proposals and High-Stakes Event Authoring**

Primary deliverables:
- Level 1 op planning proposals — formula AI surfaces recommendations for which corps should launch an offensive, consuming `CampaignPlan` / `CommanderIntent` output; proposal shape mirrors stance proposals (`proposed_action: LAUNCH_OP:<corps_id>:<zone_id>`)
- High-stakes event authoring — Sarajevo UNPROFOR ultimatum event authored with `requires_player_response: true`; exercises the Level 3 `requires_player_response` gate closed in Phase B
- Constraints from Phase B unchanged: direction convention (delegation = one-turn delay, reclaim = immediate); Level 2+ only active with formula bot fallback; no API calls in Phase D scope
