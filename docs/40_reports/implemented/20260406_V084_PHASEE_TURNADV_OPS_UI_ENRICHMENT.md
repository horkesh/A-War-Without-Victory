# v0.8.4 Phase E — Turn-Advance Block, Ops Card UI, Description Enrichment

**Date:** 2026-04-06  
**Status:** ACCEPTED  
**Commit:** 691f4409  
**Milestone:** v0.8.4 Autonomy Depth — CLOSED (all phases A–E complete)

---

## What Changed

### A. Turn-Advance Block for Unresolved High-Stakes Decisions

**`src/sim/events/event_types.ts`** — `requires_player_response?: boolean` added to `PendingEventDecision` interface. Carries the flag from the event definition into the queued decision object so the IPC handler can inspect it without event registry access.

**`src/sim/events/evaluate_events.ts`** — Line 229: `requires_player_response: def.requires_player_response` stamped onto the decision object at push time. `undefined` for normal events (falsy); `true` for high-stakes events.

**`src/desktop/electron-main.cjs`** — Lines 617–632: block guard inserted in `advance-turn` handler between `deserializeState` and `advanceTurn`. Filters `state.military.pending_event_decisions ?? []` for entries where `requires_player_response === true`. If found, returns:
```js
{ ok: false, error: 'pending_required_decisions', blocked_decisions: [{ event_id, event_title, faction }] }
```
If none found, falls through to `advanceTurn` as before.

**Resolve clears block:** `src/sim/events/resolve_decision.ts` line 42 (`pending.splice(idx, 1)`) removes the entry when the player responds via the existing `resolve-decision` IPC — no new IPC needed.

### B. Domain-Specific Ops Card Rendering

**`src/ui/map/components/AutonomyPanel.tsx`**:
- Line 25: `domain` union extended from `'military' | 'political' | 'events'` to include `'ops'`
- Lines 87–90: `APPROVE_OP:` action format parsed (`const isOp = parts[0] === 'APPROVE_OP'`); corps label derived the same way as `SET_STANCE:`
- Line 117: card header shows `"Op Order — <CorpsLabel>"` for ops proposals (was: plain corps label)
- Line 120: domain badge shows `"OP ORDER"` instead of raw `"ops"`
- Lines 150, 157: button labels show `"Authorize"` / `"Abort"` for ops proposals; stance cards unchanged (`"Accept"` / `"Reject"`)

### C. Op Proposal Description Enrichment

**`src/sim/ai_commander/proposal_generation.ts`** — New exported helpers:
- `formatZoneName(zoneId)` — title-cases `staging_zone` (replaces `_` with space)
- `formatThreatLabel(pressure)` — maps `overall_pressure` enum (`'low'|'moderate'|'heavy'|'critical'`) to player copy (`'Low'|'Moderate'|'High'|'Critical'`)
- `buildOpProposalDescription(corpsName, cs, objectiveDesc)` — assembles enriched string:
  - `Zone: <zone>` from `cs.current_plan.staging_zone`
  - `Force: N brigades` from `cs.current_plan.assigned_brigades.length`
  - `Threat: <label>` from `cs.threat_assessment.overall_pressure`
  - `Plan: <objectiveDesc>` appended if non-empty
  - Falls back to `"<corpsName> offensive operation"` if all data absent

`generateLevel1OpProposals()` now calls `buildOpProposalDescription()` instead of the previous inline template string.

### D. Tests

**`tests/sim/autonomy/autonomy_phase_e_block.test.ts`** (new, 14 tests):
- Block behaviour: blocked/not-blocked cases including empty array, `undefined`, `false`, mixed
- `blocked_decisions` payload: correct `event_id`, `event_title`, `faction`; only high-stakes included; multiple blocked listed
- `evaluateEvents` stamping: field stamped when def has it; absent when def omits it; Level 3 autonomy still queues high-stakes event

**`tests/sim/autonomy/autonomy_phase_e_enrichment.test.ts`** (new, 17 tests):
- Zone name: formatting, multi-word, single-word, null-plan fallback
- Force count: plural, singular, empty array
- Threat label: all four `overall_pressure` values
- Objective description: ordering, empty-string omission
- Fallback safety: never-empty guarantee, corps-name fallback, objectiveDesc-only, full round-trip

---

## Player-Visible Truth

- **High-stakes events** (e.g. `nato_ultimatum_sarajevo_1994` with `requires_player_response:true`) now **block turn advance** until resolved. The `advance-turn` call returns a legible error with a list of blocked decisions.
- **Op proposals** in the Autonomy Panel at Level 1 are visually distinct from stance proposals: header reads "Op Order — Corps Name", badge reads "OP ORDER", buttons read "Authorize"/"Abort".
- **Op proposal descriptions** include zone name, force count, and threat level — giving the player real context before deciding.

---

## Canonical Owners

| Component | File |
|---|---|
| Turn-advance block | `src/desktop/electron-main.cjs` (lines 617–632) |
| PendingEventDecision schema | `src/sim/events/event_types.ts` |
| Decision stamping | `src/sim/events/evaluate_events.ts` (line 229) |
| Ops card rendering | `src/ui/map/components/AutonomyPanel.tsx` |
| Description enrichment | `src/sim/ai_commander/proposal_generation.ts` |

---

## Verification

- `npx.cmd tsc --noEmit -p tsconfig.json`: **CLEAN**
- `npm run test:vitest`: **2877/2877 passed (198 files)**
- `npm run desktop:map:build`: **CLEAN**
- Build warnings: 5 pre-existing (chunk size, dynamic imports) — classified as accepted debt, zero new

---

## v0.8.4 Milestone Status

All phases complete:
| Phase | Deliverable | Status |
|---|---|---|
| Phase 1 | Autonomy state + review foundation | CLOSED |
| Phase B | IPC wiring, fallback discipline | CLOSED |
| Phase C | Level 1 proposals, AutonomyPanel | CLOSED |
| Phase D | Op proposals, high-stakes event gate | CLOSED |
| Phase E | Turn-advance block, ops UI, enrichment | CLOSED |

**v0.8.4 CLOSED.** Next: v0.9 per `docs/plans/MASTER_ROADMAP.md`.

---

## Open Items Carried Forward (Pre-Phase E)

- `gradacac_2` RS overperformance P0 — pre-existing calibration regression
- Warlord friction enclave-lock guard (Orić/Srebrenica etc.) — Historian-flagged 2026-04-06, ~5 lines
- DRINA regression (~1.5pp) from must_hold freed brigades
- Engine health P0s: ARMY-GAP-1 (CampaignPlan never read by corps briefings), UNPROFOR absent
