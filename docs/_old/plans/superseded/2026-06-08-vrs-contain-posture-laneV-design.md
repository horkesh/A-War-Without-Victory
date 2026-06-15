# Lane V — VRS strangle-not-capture contain-posture (§6, default-off)

**Status:** DESIGN, build-ready. 2026-06-08. Owner §6 approval granted 2026-06-08 (owner-backlog #4).
**Branch:** `feat/vrs-contain-posture`. Flag: `AWWV_VRS_CONTAIN_POSTURE` (DEFAULT-OFF).
**Builds on:** `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md` (Lane 1 predicate shipped #273; this is Lane V).
**Gate:** Sensitive-History Design Gate §1/§2/§6. The #1 acceptance gate is RELEASE RELIABILITY (Srebrenica + Žepa still fall, rupture still records).

---

## 0. The §6 hard invariant (non-negotiable)

The 1995-pivot RELEASE must reliably fire so **Srebrenica and Žepa STILL FALL** and the genocide
rupture `srebrenica_genocide_1995` is STILL RECORDED. A contain-posture that strands the enclaves
held is a FAR WORSE §6 failure than not building this at all.

## 1. Investigation findings — why this is safe-by-construction

The enclaves fall through **THREE independent paths**, and the contain posture touches only ONE of them.

### 1a. Path A — scripted control_change events (PRIMARY fall mechanism)
`data/scenarios/events/war_1995.json`:
- `srebrenica_falls_1995` (turn 160–185, requires `srebrenica_enclave_formed` + `srebrenica_demilitarized` flags)
  → `control_change` effect flips `op:srebrenica:srebrenica_2` + 6 more srebrenica OSIDs to RS.
- `zepa_falls_1995` (turn 160–190, requires `srebrenica_falls_1995` fired) → `control_change` flips `op:rogatica:zepa_2` to RS.

These are EVENT-SYSTEM effects, applied by `apply_effects.ts`. The contain posture does NOT touch the
event system. **This path alone is sufficient to satisfy the rupture predicate.**

### 1b. Path B — triggered operations (Krivaja-95 / Stupčanica-95)
`src/sim/combat/triggered_operations.ts`:
- `Operation Krivaja-95` (trigger `turn >= 170`, `primary_corps: vrs_drina`) — objectives include `op:srebrenica:srebrenica_2`.
- `Operation Stupčanica-95` (Žepa, t≥172) — objective `op:rogatica:zepa_2`.
- `Operation Cerska-Kamenica` (t≥40) — srebrenica pocket OSIDs (brezovice_2, mala_daljegosta_2, osmace_2, radovcici, sulice_2).

Triggered ops are injected by `checkTriggeredOperations()`: the op is pushed DIRECTLY into
`primaryCmd.active_operations` with `primaryCmd.stance = 'offensive'`, with HARDCODED objectives from
the op def. **They do NOT flow through the organic commander target-generation path** (no
`evaluateSectorStances`, no `tryCreateFromOpportunity`, no `selectOpportunityTargets`). The contain
posture suppresses ONLY the organic path → **triggered ops bypass containment by construction.**

### 1c. Path C — organic bot opportunity targeting (the ONLY thing contain suppresses)
`src/sim/combat/commander/plan.ts` `createOpportunityPlan()` → `selectOpportunityTargets()` ranks
`enemy_adjacent_osids` candidates. This is where the VRS bot ORGANICALLY assaults enclave-core OSIDs it
should historically have contained (the bug from §6 / HIST-GAP-2 + `enclave_mechanics_research`). The
candidates already pass through a `cooldownSet` filter at plan.ts:1320 — the contain filter is a
parallel set-membership filter at the identical site.

### Rupture predicate (the receipt)
`src/sim/negotiation/rupture_consequences.ts`: records `srebrenica_genocide_1995` when
`controllers['op:srebrenica:srebrenica_2'] === 'RS'` AND `srebrenica_enclave_formed === true` AND
`turn >= 140`. Keyed on CONTROL, regardless of which path flipped it. Path A (events) flips it at
t160–185 unconditionally → rupture records regardless of contain.

**Conclusion:** Suppressing organic targeting (Path C) cannot strand the enclaves, because Paths A and B
are independent and B is the primary territorial representation of the fall. Contain only removes the
AHISTORICAL pre-1995 organic over-capture.

## 2. The mechanism

### 2a. Containment set (computed once per turn)
At the supply-resolution war-phase step (war_phases.ts, beside the existing `buildContainDiagnostic`),
when the flag is ON, compute the set of OSIDs that are containable by RS using the already-shipped
`isEnclaveContainable(state, osid, 'RS', osidReach)` predicate over the BFS report `osidReach`. Store as
`state.political.last_contained_osids_by_faction` (a `Record<FactionId, string[]>`, sorted). Lane V only
populates the `RS` key (faction-agnostic infra; ARBiH-side is Lane A, not in scope here).

**Flag-off:** the field is NEVER written → byte-identical. Established pattern (mirrors
`last_supply_state_by_osid` written at the same step).

### 2b. Release predicate (the §6-critical part)
`isEnclaveContainable` returns false (→ OSID NOT contained → bot free to target) once the release fires.
The release is the **1995-pivot signal**, deterministic, preferring event-driven over turn-number:

A containable RS-vs-enclave OSID is RELEASED when ANY of:
1. `srebrenica_falls_1995` event has fired (`event_flags.srebrenica_fell === true` or the rupture is
   recorded) — the canonical pivot signal; OR
2. `turn >= SREBRENICA_RELEASE_TURN` (160 — the event-window floor; a turn-number BACKSTOP so contain
   lifts even if the event is delayed, guaranteeing the bot's own Krivaja path is never throttled in the
   1995 window).

Because the fall is owned by Paths A+B which are themselves turn≥160/170 gated, the release at t≥160
guarantees contain is LIFTED before the fall window opens. The §6 invariant holds: contain can only ever
delay an AHISTORICAL early fall; it cannot prevent the historical one.

**Goražde:** historically did NOT fall (UNPROFOR / April-1994 NATO ultimatum). It has no `*_falls_1995`
event and no Krivaja-equivalent op, so it stays contained with NO release — correct, and also caps the
known long-horizon Goražde over-capture.

### 2c. Suppression chokepoint (organic only)
`commander/plan.ts createOpportunityPlan()` — alongside the cooldown filter at :1320, drop any candidate
OSID in the RS containment set. Fallback-safe (mirrors cooldown: if EVERY candidate is contained, the
plan simply doesn't form — the corps screens instead of assaulting, which is exactly the contain posture).
The set is read from `state.political.last_contained_osids_by_faction[corpsFaction]`.

This withholds the bot's OWN assault target generation (gate-compliant: not `avoided_osids_by_faction`,
not an OSID blacklist override, not an initial-OSID override). Safe-by-construction: it only ever REMOVES
an attack the bot would have generated; it cannot create an attack, a reward, or a control flip.

## 3. Flag + determinism

- Flag module: `src/sim/combat/contain_posture_gate.ts` — `isVrsContainPostureEnabled()` reads
  `process.env.AWWV_VRS_CONTAIN_POSTURE` (`'true'`/`'1'` → ON; default OFF), with a test override
  setter, mirroring `political_dimension_propagation_gate.ts`.
- Determinism: no RNG, no wall-clock; sorted iteration via `strictCompare`; set membership only.
- Flag-OFF contract: the containment-set field is never written and the suppression filter is never
  reached → 40w + 188w BYTE-IDENTICAL to the floor (`235c61f408dc3d95` / `d311eeac18492683`).

## 4. Bright line (binding, from gate §1/§3 + parent design §5)
Bot-only posture (never a player "bottle" lever). No reward for restraint or for the eventual fall (the
rupture stays locked/idempotent/unrewarded; the reward for an intact enclave is the ABSENCE of a
condemnation flag, never a badge). No `avoided_osids_by_faction`. No initial-OSID override. The fall (on
release) flows through the existing, already-tested Path A + Path B.

## 5. Validation (the gate)
- Flag OFF: 40w byte-identical `235c61f408dc3d95`; 188w byte-identical `d311eeac18492683`.
- Flag ON: 188w — PROVE `op:srebrenica:srebrenica_2` flips to RS in t160–185, `op:rogatica:zepa_2`
  flips to RS in t160–190, and `srebrenica_genocide_1995` rupture records. Report exact turns.
  If either enclave is held by RBiH past its historical fall → FAIL → STOP + report.
- tsc clean; relevant vitest suites green; new test pins the release-fires invariant (flag-on:
  containment lifts → enclave falls → rupture records).

## VALIDATION RESULTS (running log)
- tsc clean; Lane V test (12) + Lane 1 test (13) = 25 pass.
- **Flag-OFF 40w `final_state_hash: 235c61f408dc3d95` — BYTE-IDENTICAL to floor. ✓**
- **Flag-OFF 188w `final_state_hash: d311eeac18492683` — BYTE-IDENTICAL to floor. ✓**
- **Flag-ON 188w §6 RELEASE-RELIABILITY PROOF — INVARIANT HOLDS (flag-on hash `cb00dd310cc04a29`):**
  - `srebrenica_falls_1995` fires **week 162** (historical window t160–185) → `op:srebrenica:srebrenica_2` → **RS**. ✓
  - `zepa_falls_1995` fires **week 164** (historical window t160–190) → `op:rogatica:zepa_2` → **RS**. ✓
  - `srebrenica_genocide_1995` rupture **RECORDED @ turn 162, perpetrator RS**. ✓
  - `op:gorazde:gorazde_2` → **RBiH** (held — historically correct, Goražde did not fall). ✓
  - **Fall turns IDENTICAL flag-off vs flag-on (162/164); rupture turn IDENTICAL (162).** The posture
    does not delay or prevent the historical fall by even one week.
  - End-state OSID control IDENTICAL flag-off vs flag-on (RS 321 / RBiH 285 / HRHB 106) — the posture
    changes trajectory (op churn / casualties), not net territory, in this scenario.
  - Contain set VERIFIED firing at the right turns (probe): Srebrenica+Žepa from t16, Žepče from t30,
    Kiseljak+Lašva from t40; eastern set EMPTIED at release before the fall window.

## 6. Key files
- `src/sim/combat/enclave_resilience.ts` — `isEnclaveContainable` (extend with release predicate).
- `src/sim/combat/contain_posture_gate.ts` — NEW flag module.
- `src/sim/turn_phases/war_phases.ts` — compute containment set at supply step (flag-gated).
- `src/sim/combat/commander/plan.ts` — suppression filter in `createOpportunityPlan`.
- `src/state/game_state.ts` — `last_contained_osids_by_faction` field type.
- `src/sim/negotiation/rupture_consequences.ts` — the predicate Lane V must keep satisfiable (read-only).
