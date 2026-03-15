# Army HQ Reserve Pool — Elite Brigade Loan System

**Date:** 2026-03-15
**Commit:** f8e2e3b
**Feature:** Faction Main Staff HQ corps manage a pool of elite brigades that can be loaned to field corps on request

---

## Summary

- Elite brigades are now permanently assigned to faction Main Staff HQ corps (`vrs_main_staff`, `arbih_general_staff`, `hvo_main_staff`) rather than individual field corps. Each turn, field corps with active operations or defensive crises generate loan requests; the Army AI auto-assigns bot factions, while player faction requests surface in the new `ArmyReservePanel`.
- Loans are **op-tied** (no hard timer) — a brigade stays deployed until its operation concludes and threat subsides, or until force-recall thresholds are hit (casualty/morale/permanent degradation). A minimum 6-turn deployment prevents thrash.
- A per-brigade `EliteBrigadeTracker` records every loan episode (corps assigned to, reason, turns deployed, casualties), forming the foundation for future campaign history and awards.

---

## Design Decisions

### Op-Tied vs Fixed-Timer Loans
Previous placeholder (`ELITE_LOAN_DURATION = 6`) was a hard timer. Replaced with `ELITE_LOAN_MIN_DURATION = 6` as minimum — loans persist while the condition that created them persists. This avoids absurd mid-operation recalls and respects historical patterns (e.g. the 1st Guards Brigade staying with VRS Drina Corps for entire Drina valley operations).

### Geographic Feasibility Gate
Bot AI rejects requests where the nearest available elite is >8 BFS hops from the requesting corps. A priority penalty curve applies for intermediate distances:

| Hops | Priority Multiplier |
|------|---------------------|
| 0–3  | 1.0× (no penalty)   |
| 4–6  | 0.6×                |
| 7–8  | 0.3×                |
| >8   | −1 (rejected)       |

Player can always override (no hop restriction in the UI).

### Elite Identification via `elite_loan_state`
Elite brigades are identified at runtime by the **presence of `elite_loan_state`** on their `FormationState`, not an `is_elite` flag on `FormationState`. The `is_elite` field exists only on the OOB loader record (`oob_brigades.json`) and is consumed at formation creation to seed the loan state. This keeps runtime checks clean and consistent.

### Loan Routing Through Sector Assignment
Loaned brigades are in an exempt corps (`vrs_main_staff` etc.) which would normally be skipped by `classifyBrigadesByTerritory`. A `loanedCorpsMap` built at the top of Phase 0a routes loaned brigades through their **target corps** for sector assignment, so they fight alongside the receiving corps without needing to permanently change their `corps_id`.

---

## OOB Corrections

| Brigade | Old Corps | New Corps | Notes |
|---------|-----------|-----------|-------|
| `rs_1st_guards_motorized` | `vrs_drina` | `vrs_main_staff` | Was temp-assigned to Drina as workaround |
| `rs_65th_protection_motorized_regiment` | `vrs_drina` | `vrs_main_staff` | Same workaround |
| `hvo_1st_guard_abb` | `hvo_tomislavgrad` | `hvo_main_staff` | |
| `hvo_2nd_guard_mechanized` | `hvo_southeast_herzegovina` | `hvo_main_staff` | Added `is_elite: true` |
| `hvo_3rd_guard_jastrebovi` | `hvo_southeast_herzegovina` | `hvo_main_staff` | Added `is_elite: true` |
| `arbih_guards_brigade` | `arbih_general_staff` | (unchanged ✓) | Already correct |
| `arbih_120th_liberation_black_swans` | `arbih_general_staff` | (unchanged ✓) | Already correct |

Also fixed `EXEMPT_CORPS_IDS` naming bug: `'hvo_general_staff'` → `'hvo_main_staff'`.

---

## Mechanics

### Request Generation (`generateArmyReserveRequests`)

Runs after bot corps orders, before sector assignment. For each non-exempt corps, evaluates three trigger conditions:

| Trigger | Condition | Base Priority |
|---------|-----------|---------------|
| `offensive_support` | Active op in `execution` phase, momentum ≥ 1 | 60 + 8×momentum (max 100) |
| `defensive_gap` | Sector `threat_ratio` > 2.0 **and** ≤1 brigade assigned | 50 + 10×(ratio−2.0) (max 85) |
| `exploitation` | Active op captured OSIDs, priority < 65 | 65 (flat) |

Each corps emits at most one request (highest-priority trigger wins). The request includes the nearest available elite brigade as `suggested_brigade_id`.

`enclave_relief` is defined as a type but not yet generated (no sector-level enclave flag available at request time).

### Bot AI Assignment (`evaluateArmyReserveAssignments`)

Processes requests in descending priority order:
- **Bot faction**: auto-assigns if suggested brigade is available and within `MAX_AUTO_DEPLOY_HOPS`; falls back to nearest available alternative
- **Player faction**: request left in `pending_reserve_requests` list for UI action
- Fulfilled requests are removed; remaining requests persist for player

### Recall Lifecycle (`tickEliteLoans`)

Runs after battles each turn. Per loaned brigade, evaluates in priority order:

| Condition | Type | Recall Reason |
|-----------|------|---------------|
| Personnel < 50% of loan-start | Permanent | `permanent_degradation` |
| Personnel < 70% of loan-start | Forced | `casualty_threshold` |
| Morale < 35 | Forced | `morale_collapse` |
| Min duration met + op ended + threat < 1.5 | Voluntary | `op_complete` or `need_expired` |

`permanently_degraded` brigades cannot be re-loaned and are flagged in the UI.

### Cooldown

4-turn cooldown (`ELITE_LOAN_COOLDOWN`) between loans prevents thrash after voluntary recall.

### Episode Tracker

Every loan creates an `EliteLoanEpisode`:
```
episode_id, corps_id, reason, loan_start_turn, loan_end_turn,
recall_reason, travel_hops, personnel_start, personnel_end,
casualties_taken, battles_fought, osids_captured, kia_inflicted_est
```

Totals accumulate in `EliteBrigadeTracker` (`total_loans`, `total_turns_deployed`, `total_casualties_taken`). Used in the UI Campaign History section and available for future awards/decorations.

---

## Turn Pipeline

| Step | Position | Action |
|------|----------|--------|
| `generate-army-reserve-requests` | After `generate-bot-corps-orders` | Generates + auto-assigns requests; player requests remain pending |
| `tick-elite-loans` | Replaces old `elite-loan-lifecycle` | Force/voluntary recall + tracker updates |

Step count: 119 → 120 (`war_phase_step_order.test.ts` updated).

---

## IPC / Desktop Bridge

Three new player actions exposed through the full IPC stack:

| Action | IPC Channel | Function |
|--------|-------------|----------|
| Approve request | `approve-reserve-request` | `approveReserveRequest(state, corpsId, brigadeId)` |
| Recall brigade | `recall-elite-brigade` | `recallEliteBrigade(state, brigadeId)` |
| Redirect loan | `redirect-reserve-loan` | `redirectReserveLoan(state, brigadeId, newCorpsId)` |

Stack: `desktop_sim.ts` → `electron-main.cjs` → `preload.cjs` → `useIPC.ts` (TypeScript interface).

---

## UI

### FormationDetail — Orders Tab
Elite loan status section added at top of the Orders tab when viewing a brigade:
- **READY** (green) — available for loan
- **ON LOAN** (amber) — shows receiving corps name, turns deployed, inline Recall button
- **COOLDOWN** (muted) — shows turns remaining
- **DEGRADED** (red) — permanently degraded, no re-loan

### ArmyReservePanel
New component rendered when an `army_hq` formation is selected (replaces `FormationDetail` for HQ formations). Three sections:

**Reserve Pool** — all faction elite brigades with:
- Status badge (READY / ON LOAN / COOLDOWN / DEGRADED)
- Personnel bar (colour: green ≥70%, amber ≥40%, red <40%)
- If on loan: receiving corps name, weeks deployed, Recall button

**Pending Requests** — unresolved player-faction requests:
- Corps name + description
- Reason chip (colour-coded by priority)
- Travel time estimate
- Priority bar
- APPROVE (auto-selects suggested brigade) / Dismiss buttons

**Campaign History** (collapsible) — per-brigade totals (loans, weeks, KIA) plus episode log with corps, reason, turn range, and recall reason.

### App.tsx Routing
```tsx
railState.primary === 'formation' && (
  kind === 'army_hq' ? <ArmyReservePanel /> : <FormationDetail />
)
```
Same logic for secondary rail slot.

---

## Files Changed

| File | Change |
|------|--------|
| `src/state/elite_loan_types.ts` | Renamed `ELITE_LOAN_DURATION→MIN`; added `ArmyReserveRequest`, `EliteLoanEpisode`, `EliteBrigadeTracker`, `current_episode_id`, `MAX_AUTO_DEPLOY_HOPS` |
| `src/state/game_state.ts` | `MilitaryState`: +`pending_reserve_requests`, +`elite_brigade_tracker` |
| `src/sim/combat/army_reserve_system.ts` | **New** — 476 LOC; all loan management functions |
| `src/sim/combat/corps_front_sectors.ts` | Phase 0a loan routing via `loanedCorpsMap` |
| `src/sim/combat/corps_front_sectors_constants.ts` | Fix `hvo_main_staff` naming |
| `src/sim/combat/elite_loan.ts` | Renamed constant reference |
| `src/sim/turn_phases/war_phases.ts` | +`generate-army-reserve-requests` step; replaced `elite-loan-lifecycle` → `tick-elite-loans` |
| `src/scenario/oob_early_war_entry.ts` | Added `current_episode_id: null` to inline loan state |
| `src/sim/recruitment_engine.ts` | Same fix |
| `src/desktop/desktop_sim.ts` | 3 new IPC handler functions |
| `src/desktop/electron-main.cjs` | 3 new `ipcMain.handle` entries |
| `src/desktop/preload.cjs` | 3 new `ipcRenderer.invoke` exposures |
| `src/ui/map/desktop/useIPC.ts` | 3 new entries in `WindowAwwv` interface |
| `src/ui/map/data/types.ts` | `eliteLoanState` on `FormationView`; `pendingReserveRequests`, `eliteBrigadeTracker` on `LoadedGameState` |
| `src/ui/map/data/GameStateAdapter.ts` | Populate all new fields; `deriveEliteBrigadeTracker()` helper |
| `src/ui/map/components/FormationDetail.tsx` | Elite loan status section in Orders tab |
| `src/ui/map/components/ArmyReservePanel.tsx` | **New** — 302 LOC; army HQ panel |
| `src/ui/map/App.tsx` | Conditional render: `army_hq` → `ArmyReservePanel` |
| `data/source/oob_brigades.json` | 7 elite brigade re-assignments (see OOB table) |
| `tests/army_reserve_system.test.ts` | **New** — 12 tests covering all core functions |
| `tests/elite_loan.test.ts` | Updated constant name |
| `tests/war_phase_step_order.test.ts` | Step count 119 → 120 |
| `vitest.config.ts` | Added `army_reserve_system.test.ts` to include list |

**Total:** 23 files, +2108 / −271 lines. 618 vitest tests passing.

---

## Known Limitations / Future Work

- **`enclave_relief` requests not yet generated** — requires a sector-level `is_enclave_sector` flag to filter correctly. Hook is in the type system; implementation deferred.
- **Redirect loan** — IPC wired, but no UI button yet in `ArmyReservePanel` (approve assigns the suggested brigade; player cannot choose a different brigade from the panel). Low priority.
- **Episode `battles_fought` / `osids_captured`** — these fields exist in the tracker but are not yet updated during battle resolution (would require cross-referencing attack reports). Currently always 0. Set up for a future wiring pass.
- **Loan tracker in serialization** — `elite_brigade_tracker` is on `MilitaryState`; confirm it serializes correctly through `serialize.ts` round-trip (not explicitly tested; state schema test covers schema shape).

---

## Calibration Impact

No calibration run performed — this is a pure system addition. For bot factions the auto-assignment path is active, but elite brigades are thin (2 per faction) and will only deploy when specific conditions are met. Expected impact:
- **VRS**: 1st Guards and 65th Protection now in `vrs_main_staff` pool. Bot AI will deploy them to Drina/SRK when momentum ≥1. Marginal effect since these brigades were previously assigned there anyway.
- **HVO**: 3 guards brigades now pooled. More likely to see loan activity given HVO multi-front stress in 1993+.
- **ARBiH**: Guards and 120th were already in `arbih_general_staff`; no change in bot behaviour.

No determinism hazard — all iteration sorted via `strictCompare`, no timestamps or `Math.random()`.
