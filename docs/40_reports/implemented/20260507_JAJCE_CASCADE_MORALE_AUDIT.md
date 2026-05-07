# LANE-NIGHTSHIFT-JAJCE-CASCADE-MORALE-AUDIT

**Date:** 2026-05-07
**Lane:** Closes Jajce-cascade-morale-propagation gap from D3.3 triage (af2400764).
**Owner:** nightshift autonomous lane
**Ring:** 1 (event-data tweak; mechanism unchanged)
**Surface:** §6 historical-event chain — coefficient additions only, no rupture timing change.

---

## Phase 0 — Investigation + Mini-panel

### Existing event definition (`data/scenarios/events/war_1992.json` lines 1654-1711)

`jajce_falls_1992` already has the following consequences active before this lane:

- `effect.morale_change` RBiH -10 (legacy single-effect)
- `effects[]`:
  - `morale_change` RS +3
  - `alliance_change` -0.05
  - narrative
- `dimension_shifts[]`:
  - RBiH `internal_cohesion` -10
  - HRHB `internal_cohesion` -10
  - RS `military_credibility` +5
- `sets_flags`: `jajce_fell: true`

### Engine support (`src/sim/events/apply_effects.ts`)

Confirmed effect kinds:
- `morale_change` → applies delta to ALL active brigades of faction (line 121-129).
- `cohesion_change` → applies delta to ALL active brigades of faction (line 131-139).
- `alliance_change`, `humanitarian_impact`, `patron_pressure`, `narrative`.

Both `morale_change` and `cohesion_change` are FACTION-wide — there is no corps-scoped or formation-scoped variant. Adding a faction-wide `cohesion_change` will hit ALL ARBiH brigades, including 2nd/7th Corps, but also other corps. This matches the historical pattern: Jajce's fall caused refugee crisis and morale collapse across central Bosnia, not only in adjacent corps.

### Sister-event coefficient calibration

Sister events provide the canonical schema for cascade-morale impacts:

- `jna_withdrawal_1992`: `morale_change` RBiH -5 (single, low magnitude)
- `consequences.json` cascade events: `cohesion_change` -8 to -12 typical
- Lasva-valley/Ahmici 1993 events: cohesion_change ARBiH -10..-15

### D3.3 commander observation

Delic at T28: Jajce fall logged but cascade effects on 3rd Corps cohesion (=51) appear underweighted. Petkovic at T35 flags as alliance-rupture trigger.

The current event has:
- `morale_change` -10 → immediate hit, but morale recovers each turn from rest/supply.
- `internal_cohesion` -10 dimension shift → strategic dimension only (Dayton scoring), does NOT propagate to per-brigade `cohesion` field.

The KEY GAP: there is NO `cohesion_change` effect. Per-brigade cohesion (which is what 3rd Corps avg=51 reflects) is unaffected by the event. The Dayton-layer `internal_cohesion` is a separate counter from per-brigade `cohesion`.

### Mini-panel verdict

**(B) GENUINE-CONSEQUENCE-WEAK** — bridges to (A) at the per-brigade-cohesion subsystem.

Rationale:
- Per-brigade `cohesion_change` is COMPLETELY ABSENT from `jajce_falls_1992`.
- The current `dimension_shifts.internal_cohesion` writes to a parallel Dayton-scoring lane, not to the `formation.cohesion` field that briefings/commanders read.
- Adding `cohesion_change` RBiH -8 and HRHB -6 closes the gap with minimal scope:
  - RBiH: ARBiH 2nd & 7th Corps adjacent to Jajce, refugee absorption hits cohesion.
  - HRHB: HVO formations also affected via mutual-blame friction (precursor to Lasva).
  - Faction-symmetric mechanism: same effect kind both sides.
- Coefficient -8 calibrated to be visible (≥5-point drop) but bounded (Lasva-valley events use -10/-15; Jajce is a precursor, not the rupture itself).
- Also bumping `morale_change` RBiH from -10 to -12 to align with sharper-collapse historical record (refugee crisis, not just territorial loss).

### Sources

- BB Vol I p.182 Posavina chapter (refugee crisis from Jajce fall, Oct 29 1992).
- ICTY Prlic IT-04-74-T (HVO-ARBiH Jajce defense responsibility friction → Lasva precursor).
- Sister-event calibration: `consequences.json` (Lasva-valley cohesion -10/-12), `jna_withdrawal_1992` (morale -5), `srebrenica_falls_1995` (cohesion -15).

---

## Phase 1 — Implementation

### Before (lines 1671-1710 pre-edit)

```json
"effect": { "kind": "morale_change", "faction": "RBiH", "delta": -10 },
"effects": [
  { "kind": "morale_change", "faction": "RS", "delta": 3 },
  { "kind": "alliance_change", "delta": -0.05 },
  { "kind": "narrative", "text": "Jajce falls to the VRS. Mutual blame..." }
]
```

### After (lines 1693-1727 post-edit)

```json
"effect": { "kind": "morale_change", "faction": "RBiH", "delta": -12 },
"effects": [
  { "kind": "morale_change", "faction": "HRHB", "delta": -6 },
  { "kind": "morale_change", "faction": "RS", "delta": 3 },
  { "kind": "cohesion_change", "faction": "RBiH", "delta": -8 },
  { "kind": "cohesion_change", "faction": "HRHB", "delta": -6 },
  { "kind": "alliance_change", "delta": -0.05 },
  { "kind": "narrative", "text": "Jajce falls to the VRS. Refugee columns flood central Bosnia; mutual blame..." }
]
```

Coefficient justification:
- RBiH morale -10→-12 (+20% magnitude): refugee crisis sharper than territorial-loss-only baseline.
- HRHB morale -6 (NEW): mutual-blame friction touches HVO formations too.
- RBiH cohesion -8 (NEW): closes per-brigade-cohesion gap; visible in 2nd/7th Corps avg cohesion at w28+.
- HRHB cohesion -6 (NEW): faction-symmetric — Lasva precursor friction.
- Alliance -0.05 unchanged.
- `dimension_shifts` unchanged — Dayton-layer scoring already calibrated.

Q3 trigger window (turn_min=28, turn_max=39, condition jajce ≥0.5 RS) PRESERVED — no §6 rupture-timing change.

## Phase 2 — Tests + Verification

`tests/jajce_cascade_morale_audit.test.ts` (4 tests, ALL GREEN):
- T1 PASS: non-empty consequences with morale + cohesion impacts; RBiH cohesion ≥5 magnitude.
- T2 PASS: every effect kind in supported set; faction in canonical {RBiH, RS, HRHB}.
- T3 PASS: faction-symmetric — RBiH AND HRHB both receive cohesion drops in [-15, -5] band; alliance erosion present.
- T4 PASS: deterministic re-load; trigger window 28/39 unchanged from Q3.

Result: `1 passed (1) | Tests 4 passed (4) | Duration 513ms`.

### Adjacent regression check

`npx vitest run tests/event_` — 5 test suites, 61/61 PASS:
- tests/event_decisions.test.ts (8)
- tests/event_effects.test.ts (9)
- tests/event_timeline_integrity.test.ts (17)
- tests/event_conditions.test.ts (13)
- tests/event_timing.test.ts (14)

`npx tsc --noEmit` — clean.

## Commit

`ec837dca` — `fix(events): jajce_falls_1992 cascade-morale consequences — close audit gap (LANE-NIGHTSHIFT-JAJCE-CASCADE-MORALE-AUDIT)`

3 files changed, 359 insertions(+), 2 deletions(-).

## 40w / 188w handoff (PARENT runs)

### 40w smoke

```
npm run sim:scenario:run:40w
```

Hash WILL drift from baseline (a2a51d4a9994a7f5). Drift visible at w28+ when jajce_falls_1992 fires. Confirm:
- ARBiH 3rd Corps avg cohesion at w29-w35 drops ≥5 points vs control.
- ARBiH 7th Corps avg cohesion at w29-w35 drops ≥5 points vs control (southern flanks; faction-wide effect).
- HRHB avg cohesion at w29-w35 drops ≥4 points vs control.
- alliance_rbih_hrhb at w29 drops by 0.05 vs prior turn.

### 188w A/B (parent runs)

```
# Control (pre-commit)
git stash
npm run sim:scenario:run:default 2>&1 | tee /tmp/jajce_control_188w.log

# Treatment (post-commit)
git stash pop
npm run sim:scenario:run:default 2>&1 | tee /tmp/jajce_treatment_188w.log

# Diff at w28-w35
diff <(grep -E "(w2[8-9]|w3[0-5]).*cohesion" /tmp/jajce_control_188w.log) \
     <(grep -E "(w2[8-9]|w3[0-5]).*cohesion" /tmp/jajce_treatment_188w.log)
```

Binding threshold: ARBiH 3rd Corps morale and cohesion at w29-w35 should both show ≥5-point drops vs control.

