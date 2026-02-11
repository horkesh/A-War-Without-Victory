# RBiH/HRHB Alliance Redesign — Design Document

**Status:** IMPLEMENTED (2026-02-09). Code, canon, and tests complete.  
**Purpose:** Replace the current binary "always allied" Phase I behaviour with a fragile 1992 alliance, patron-driven HRHB confrontation, handling of municipalities with multiple allied formations, and an organic path to the Washington Agreement.  
**Canon:** Phase I Spec v0.5.0 §4.8, Phase 0 Spec v0.5.0, Systems Manual v0.5.0 §10, Engine Invariants v0.5.0 §J — all updated to support dynamic alliance, precondition-driven ceasefire and Washington Agreement.

---

## 1. Current State (post-implementation)

- **State:** `GameState.phase_i_alliance_rbih_hrhb: number` in [-1, 1] — actively maintained per turn.
- **State:** `GameState.rbih_hrhb_state: RbihHrhbState` — tracks war start, ceasefire, Washington, stalemate, bilateral flips, mixed municipalities.
- **Behaviour:** In `control_flip.ts`, RBiH and HRHB use **dynamic threshold-based alliance check** (`areRbihHrhbAllied()`). When alliance > 0.20, they do not flip each other's control. Below that threshold, normal flip rules apply.
- **Ceasefire:** Precondition-driven (6 conditions: C1–C6). Freezes bilateral flips, starts alliance recovery.
- **Washington Agreement:** Precondition-driven (6 conditions: W1–W6). Locks alliance at 0.80, boosts HRHB capabilities (HV support), enables COORDINATED_STRIKE.
- **Mixed municipalities:** `rbih_hrhb_state.allied_mixed_municipalities` (default: bugojno, busovaca, kiseljak, mostar, novi_travnik, travnik, vitez). Allied defense bonus vs RS when alliance > ALLIED_THRESHOLD.
- **Minority erosion:** 10%/turn erosion of minority militia in mixed muns during open war (alliance < 0.0). Formation displacement when militia < 50.
- **Bot integration:** Alliance-aware edge filtering, post-Washington joint RS targeting, patron-pressure-driven HRHB confrontation.
- **Turn pipeline:** 6 new steps: phase-i-alliance-update, phase-i-ceasefire-check, phase-i-washington-check, phase-i-control-flip (existing, modified), phase-i-bilateral-flip-count, phase-i-minority-erosion.
- **Tests:** 30 tests in `tests/alliance_lifecycle.test.ts` covering all mechanics + determinism + full lifecycle smoke.

---

## 2. Historical Research (Condensed)

### 2.1 Fragile alliance (1992)

- **RBiH (ARBiH):** Wanted to keep HRHB (HVO) as ally against VRS; had incentive to **appease** to avoid a second front.
- **HRHB (HVO):** Under **Croatian (Zagreb) patron pressure** and Herceg-Bosna project (Mate Boban): takeover of Croat-majority areas, imposition of Croatian currency, ultimatums to Bosnian forces. Croatia was judged to have "overall control" over HVO (ICTY).
- **Timeline:** First armed incidents **October 1992** (Novi Travnik, Vitez); open conflict in western Herzegovina by late 1992; escalation in central Bosnia through 1993 (e.g. Bugojno July 1993); Washington Agreement **March 1994**.

### 2.2 Patron pressure on HRHB

- Croatia backed HVO formation (April 1992, Grude) and Herceg-Bosna.
- Systematic consolidation: municipal takeovers, flags, "Bosnian military units illegal," weapon ultimatums.
- Zagreb limited Croatian military support to consolidating Croat territory rather than supporting a unified Bosnian war effort (NYT, Oct 1992).

### 2.3 Municipalities with mixed formations

Historically, both ARBiH and HVO had formations in: **Travnik, Novi Travnik, Vitez, Bugojno, Mostar, Kiseljak, Busovaca** (and others). These became the flashpoints of the Croat-Bosniak war.

### 2.4 Washington Agreement (March 1994)

- Brokered by the US; ended the Croat-Bosniak conflict.
- Created the Federation of Bosnia and Herzegovina (Croat-Bosniak entity).
- Preconditions: mutual exhaustion, international pressure, Croatian diplomatic constraint, RS territorial threat.
- Post-Washington: HVO received Croatian Army (HV) material and training support, enabling 1995 joint operations (Operation Storm, Operation Maestral).

---

## 3. Implementation Summary

### 3.1 Alliance Value Update (per turn)

```
delta = appeasement - patron_drag - incident_penalty + ceasefire_boost

appeasement = 0.003 * (no_incidents ? 1.0 : 0.3)
patron_drag = 0.015 * hrhb_patron_commitment
incident_penalty = 0.04 * bilateral_flips_last_turn
ceasefire_boost = ceasefire_active ? 0.015 : 0
```

### 3.2 Relationship Phases

| Range | Phase | Effects |
|-------|-------|---------|
| > 0.50 | Strong alliance | Full coordination, joint defense bonus vs RS |
| (0.20, 0.50] | Fragile alliance | No flips, weakened coordination |
| (0.00, 0.20] | Strained | Flips enabled, no coordination bonus |
| [-0.50, 0.00] | Open war | Minority erosion begins |
| < -0.50 | Full war | Maximum pressure, formation displacement |

### 3.3 Ceasefire Preconditions (ALL must be true)

| ID | Condition | Threshold |
|----|-----------|-----------|
| C1 | War duration | >= 20 turns |
| C2 | HRHB exhaustion | > 35 |
| C3 | RBiH exhaustion | > 30 |
| C4 | Stalemate | >= 4 turns (0 bilateral flips) |
| C5 | IVP negotiation_momentum | > 0.40 |
| C6 | HRHB patron constraint_severity | > 0.45 |

### 3.4 Washington Preconditions (ALL must be true)

| ID | Condition | Threshold |
|----|-----------|-----------|
| W1 | Ceasefire active | true |
| W2 | Ceasefire duration | >= 4 turns |
| W3 | IVP negotiation_momentum | > 0.50 |
| W4 | HRHB patron constraint_severity | > 0.55 |
| W5 | RS territorial control share | > 0.40 |
| W6 | Combined RBiH+HRHB exhaustion | > 55 |

### 3.5 Post-Washington Effects

- Alliance locked at 0.80
- HRHB equipment_access → 0.65, croatian_support → 0.90
- HRHB external_pipeline_status → 0.85, heavy_equipment_access → 0.65
- COORDINATED_STRIKE enabled for HRHB
- Joint pressure bonus vs RS: 1.15

### 3.6 Files Modified/Created

**New files:**
- `src/sim/phase_i/alliance_update.ts` — Core alliance mechanics + constants
- `src/sim/phase_i/bilateral_ceasefire.ts` — Ceasefire evaluator
- `src/sim/phase_i/washington_agreement.ts` — Washington evaluator + effects
- `src/sim/phase_i/minority_erosion.ts` — Minority militia erosion
- `src/sim/phase_i/mixed_municipality.ts` — Mixed mun tracking + defense bonus
- `tests/alliance_lifecycle.test.ts` — 30 tests

**Modified files:**
- `src/state/game_state.ts` — RbihHrhbState interface, GameState field
- `src/state/serializeGameState.ts` — Allowlist for rbih_hrhb_state
- `src/scenario/scenario_types.ts` — init_alliance_rbih_hrhb, init_mixed_municipalities, enable_rbih_hrhb_dynamics
- `src/scenario/scenario_loader.ts` — Normalize new scenario fields
- `src/sim/phase_i/control_flip.ts` — Dynamic alliance check, allied defense bonus
- `src/sim/turn_pipeline.ts` — 6 new pipeline steps
- `src/sim/bot/simple_general_bot.ts` — Alliance-aware edge filtering + post-Washington bonuses
- `src/sim/bot/bot_strategy.ts` — Alliance-aware aggression modifiers

**Canon files updated:**
- `docs/10_canon/Engine_Invariants_v0_5_0.md` — Precondition-driven milestones
- `docs/10_canon/Phase_I_Specification_v0_5_0.md` — Full §4.8 rewrite
- `docs/10_canon/Systems_Manual_v0_5_0.md` — Washington preconditions + effects
