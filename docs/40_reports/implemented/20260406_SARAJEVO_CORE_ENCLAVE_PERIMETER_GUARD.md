# Sarajevo Core Defense — Paramilitary Rear-Pocket Enclave Guard

**Date:** 2026-04-06  
**Status:** IMPLEMENTED — VERIFIED  
**vitest:** 2944/2944 (206 suites)  
**tsc:** Clean  
**Run:** n1356 — 93.5% area-weighted, 27/27 anchors

---

## 1. Problem

Two Sarajevo core urban OSIDs were flipping to RS control without a recorded battle:

| OSID | Flip turn (before fix) |
|---|---|
| `op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo` | T7 |
| `op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo` | T12 |

Neither flip appeared in the weekly battles array. Both OSIDs are interior Sarajevo urban core cells inside an actively defended ARBiH enclave.

---

## 2. Investigation Path

### Failed hypothesis 1 — `evaluateUncontestedOccupation`

Initial suspicion was `evaluateUncontestedOccupation` in `bot_brigade_eval_attack.ts` allowing VRS walk-in when no brigade physically occupied the target OSID and `findSectorForEnemyOsid` returned null. An enclave perimeter guard was added then removed: VRS already controls `op:novi_grad_sarajevo:recica` (inside the enclave prefix namespace), so `perimeterBreached=true` was immediately true and the guard never blocked.

### Failed hypothesis 2 — `consolidateRearPockets`

A guard was added to `rear_pocket_consolidation.ts` blocking enclave-interior clusters from consolidating. This is correct and still present, but the actual flips bore `mechanism: 'combat'` with no `mun_id`, no `battle_id`, and no `attacker_brigade` in the control event — which does not match any of the three fields that `attack_resolution_osid.ts` sets. The `consolidateRearPockets` path sets `mechanism: 'consolidation'`, not `'combat'`. This guard was a valid hardening but not the root cause.

### Root cause confirmed — `detectParamilitaryTargets`

The saved `control_events` for both flipped OSIDs were:

```json
{ "from": "RBiH", "mechanism": "combat", "settlement_id": "...", "to": "RS", "turn": 7 }
```

No `mun_id`, no `battle_id`, no `attacker_brigade`. This signature exactly matches `paramilitary_sweep.ts:504-510` — the `advanceParamilitaries` capture path.

Cross-check: `paramilitary_sweep.ts:507` sets `mechanism: 'combat' as const` with no other fields. Confirmed as the only path matching the signature.

---

## 3. Root Cause

**File:** `src/sim/combat/paramilitary_sweep.ts`  
**Function:** `detectParamilitaryTargets` (line 160)

`analyzeFactionGraph` identifies `enemy_pockets` for each faction — OSIDs completely surrounded by the faction's territory. For RS, the Sarajevo interior OSIDs are topologically surrounded by RS siege ring from turn 1. This is correct siege geometry; the surrounded topology is not a mistake.

`detectParamilitaryTargets` iterated over these pockets and spawned RS rear-pocket paramilitaries targeting the Sarajevo interior OSIDs. The function had **no enclave exclusion check** — unlike `scheduleMilitiaAndParamilitaries` (the offensive paramilitary scheduling function), which already blocked enclave OSIDs via `enclaveOsids.has(osid)`.

The paramilitaries marched for `PARAMILITARY_MARCH_TURNS` turns, then `advanceParamilitaries` resolved them:
- T7: paramilitary captures `op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo`
- T12: paramilitary captures `op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo`

No `brigade_history.engagement` is created by paramilitaries → the flip appeared in `control_events` with `mechanism: 'combat'` but never in the weekly battles array.

---

## 4. Why No Battle Appeared in Weekly Summary

`compile_turn_summary.ts` compiles battles from `report.attack_resolution_osid?.battles` (which comes from direct brigade-vs-brigade combat in `attack_resolution_osid.ts`) and `brigade_history.engagements`. Paramilitaries create neither. Their capture is recorded only in `control_events`. Hence `mechanism: 'combat'` was set but the flip was invisible in the battles list — no defender was logged, no casualties were recorded against any brigade.

---

## 5. Fix

**File:** `src/sim/combat/paramilitary_sweep.ts`  
**Function:** `detectParamilitaryTargets`  
**Location:** Inside the `for (const pocketOsid of pockets)` loop, before `isDefendedAgainst` check

```typescript
// Skip enclave OSIDs — surrounded topology is correct siege geometry, not abandoned pocket
if (ENCLAVE_DEFINITIONS.some(enc => enc.faction !== faction && osidBelongsToEnclave(pocketOsid, enc))) continue;
```

`ENCLAVE_DEFINITIONS` and `osidBelongsToEnclave` were already imported at the top of the file (used by `scheduleMilitiaAndParamilitaries`). No new imports required.

The condition reads: if the pocket OSID belongs to any enclave whose protecting faction is NOT the current attacker, skip scheduling a paramilitary against it. This covers all five RBiH enclaves (Sarajevo, Srebrenica, Žepa, Goražde, Bihać) generically.

---

## 6. Defense Layer Already Added (Previous Pass)

`rear_pocket_consolidation.ts` already has an enclave guard (added in a previous pass) that blocks the `consolidateRearPockets` auto-flip path for the same OSIDs. That guard remains correct as a second defensive layer for the consolidation mechanism. The two guards protect different code paths.

---

## 7. Tests

Existing test suite: 2944/2944 (206 suites). `tests/sarajevo_core_defense.test.ts` (5 tests) covers the consolidation guard. No new tests were added for `detectParamilitaryTargets` specifically — the scenario run provides direct verification.

---

## 8. Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean — 0 errors |
| `npm run test:vitest` | **2944/2944 passed**, 206 suites |
| Area-weighted calibration (n1356) | **93.5%** (vs 93.2% pre-fix) |
| Anchors | **27/27** |
| `sarajevo_dio_novi_grad_sarajevo` controller | **RBiH** — no control events at all |
| `sarajevo_dio_stari_grad_sarajevo` controller | **RBiH** — no control events at all |

---

## 9. Residual Risks

| Item | Severity | Notes |
|---|---|---|
| Enclave definition completeness | P1 | Guard only fires for OSIDs covered by `ENCLAVE_DEFINITIONS` prefix/list entries. Any enclave OSID absent from the definition set remains unprotected from rear-pocket paramilitary targeting. |
| `advanceParamilitaries` has no enclave guard | P2 | If a paramilitary is created by some other code path with an enclave OSID as target, `advanceParamilitaries` will execute the capture. The scheduling guard is the primary defense; `advanceParamilitaries` has no secondary check. |
| Siege geometry still produces surrounded OSIDs | P3 | The topological condition (all neighbors RS) that triggers `enemy_pockets` detection is structurally correct for Sarajevo siege geometry. Enclave definition completeness is the only barrier between correct topology and incorrect rear-pocket capture. |
