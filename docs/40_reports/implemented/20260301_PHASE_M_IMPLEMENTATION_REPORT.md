# Phase M Implementation Report

**Date:** 2026-03-01
**Calibration run:** n268 (81.0% OSID match, 6/6 benchmarks pass)

## Mechanics Implemented

### M1 — Schema & Canon Foundation
- **Morale field** on FormationState: `morale?: number` [0,100], default 60, non-monotonic
- **DisplacementEvent** interface + `displacement_event_log` on GameState
- **Serializer**: morale default 60 + clamping [0,100]; displacement_event_log default []
- **Canon**: Engine Invariants §14.3a (morale), §6.1 (displacement event log), §14.5a (retreat resistance); Systems Manual §4, §6.0a/b, §12.1/12.2
- **Tests**: `tests/morale_displacement_schema.test.ts` (7 tests)

**Files:**
- `src/state/game_state.ts` — morale field, DisplacementEvent, displacement_event_log
- `src/state/serialize.ts` — morale default + clamping, event log default
- `src/state/serializeGameState.ts` — event log in allowlist
- `docs/10_canon/ENGINE_INVARIANTS.md` — §14.3a, §6.1, §14.5a
- `docs/10_canon/SYSTEMS_MANUAL.md` — §4, §6.0a/b, §12.1/12.2

### M2 — Core Combat Mechanics
- **Morale drift**: Per-turn drift toward population affinity (census-driven). `morale_drift.ts`
- **Morale retreat resistance**: High morale (≥70) + costly_victory → absorb, no retreat. Decisive always retreats.
- **Post-battle morale effects**: +5 attacker win, -5 attacker loss, +3 defender hold, -8 defender loss
- **ZoC virtual defense**: Linked friendly brigade defends adjacent unoccupied OSID under attack
- **Turn pipeline**: Added morale drift step after displacement

**Files:**
- `src/sim/phase_ii/morale_drift.ts` — new file
- `src/sim/phase_ii/attack_resolution_osid.ts` — morale resist, post-battle, ZoC defense
- `src/sim/phase_ii/combat_predictor.ts` — morale resistance in predictions
- `src/sim/turn_pipeline.ts` — morale drift step
- `tests/morale_combat.test.ts` — 17 tests

### M3 — Material Conditions
- **Enclave OOB**: 13 brigades in Srebrenica/Gorazde/Zepa with composition `{ infantry: 100 }` and `initial_morale: 70`
- **Equipment verification**: Confirmed equipment_class drives heavy weapons effectiveness

**Files:**
- `data/source/oob_brigades.json` — 13 enclave brigades with composition + morale
- `src/scenario/oob_loader.ts` — composition + initial_morale parsing
- `src/scenario/oob_phase_i_entry.ts` — composition + initial_morale copying

### M4 — Displacement Routing + Bot Strategy
- **Per-municipality routing**: 8 regions × 3 ethnicities = 47 routing sub-regions with specific destination chains
- **Displacement event log population**: Origin-side events (step 2) and settlement events (step 3)
- **Rear-area cleanup directive**: Corps-level, weeks 0-12, targets enemy formations in own-controlled rear
- **3rd Corps priority boost**: Central Corridor Defense 60→80, Counter 80→120, added tesanj/maglaj/zavidovici/zepce

**Files:**
- `src/state/displacement_routing_data.ts` — rewritten with routing tables
- `src/state/displacement_takeover.ts` — simplified routing, event log population
- `src/sim/phase_ii/bot_corps_ai.ts` — rear-area cleanup directive
- `src/sim/phase_ii/bot_strategy.ts` — 3rd Corps priority weights
- `tests/displacement_routing.test.ts` — 23 tests

### M5 — Breakthrough Retreat (DEFERRED)
Evaluated and deferred. Orasje gap is an OOB assignment issue (hvo_northwest_bosnia has 0 brigades), not a breakthrough retreat issue. Existing M2 mechanics (morale retreat resistance + ZoC defense) cover main cases.

## Test Results

| Suite | Tests | Pass | Skip |
|-------|-------|------|------|
| Vitest (18 suites) | 206 | 193 | 13 |
| Node:test — morale_combat | 17 | 17 | 0 |
| Node:test — schema | 7 | 7 | 0 |
| Node:test — displacement_routing | 23 | 23 | 0 |
| Typecheck | — | clean | — |

## Calibration Results

n268 vs painted targets (Jan 1993, week 40):
- **Match rate: 81.0% (610/753)**
- RS: 437 (painted 416, +21)
- RBiH: 235 (painted 248, -13)
- HRHB: 81 (painted 89, -8)
- **6/6 benchmarks pass**

Key issues identified (see CALIBRATION_REPORT for details):
1. Drina enclave overexpansion (24 OSIDs wrong) — enclave morale 70 too strong
2. Central corridor overrun by RS (16 OSIDs wrong) — 3rd Corps insufficient
3. Central Bosnia overrun (15 OSIDs wrong) — Bugojno completely falls
4. Orasje still falls — OOB gap

## Deferred Items

| Item | Rationale |
|------|-----------|
| M5 Breakthrough Retreat | Orasje is OOB issue, not retreat issue |
| OSID-level displacement tracking | System operates at municipality level |
| Enclave morale tuning (70→55) | Identified in M6 as top priority iteration |
| RS attack share reduction | Identified in M6 as #2 iteration priority |

## Lessons Learned

1. **Morale retreat resistance is a strong lever** — morale=70 at the resist floor makes units nearly immovable. Careful with initial morale assignments.
2. **ZoC virtual defense doesn't reduce free captures much** — most "free" OSIDs are behind the front where no ZoC reaches. The mechanic helps at the contact line but not deep rear.
3. **Enclave brigades need offense suppression** — infantry-only composition should limit attack power, not just equipment effectiveness. The composition field is there but attack logic doesn't penalize infantry-only attackers enough.
4. **Bot priority weight increases have diminishing returns** — 3rd Corps Counter weight 120 still can't overcome RS territorial advantage from w0-20 offensive.
5. **Displacement routing tables are clean data architecture** — static lookup + runtime validation is the right split. Easy to extend.
