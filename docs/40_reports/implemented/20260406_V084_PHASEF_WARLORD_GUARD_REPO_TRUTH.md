# v0.8.4 Phase F — Warlord Guard, DRINA Investigation, and v0.8.x Repo-Truth Pass

**Date:** 2026-04-06
**Status:** PARTIALLY CLOSED — enclave-lock guard and roadmap truth complete; DRINA investigation inconclusive
**Commit:** (pending)
**vitest:** 2881/2881 (198 files)
**tsc:** clean
**build:** clean (pre-existing chunk-size/dynamic-import warnings accepted debt)

---

## Deliverable 1: Enclave-Lock Guard in `checkWarlordFriction` — COMPLETE

### Problem

The napkin flagged (Historian, 2026-04-06): enclave-locked commanders
(Orić/Srebrenica, Palić/Žepa, Imamović/Goražde) could theoretically be
emitted as `refused_release` friction events. Physical isolation is not
insubordination — these commanders cannot release brigades to army reserve
because they have no physical connection to the command chain.

### Investigation Findings

- `enclave_lock` field already exists in `NamedOfficer` type (`src/state/officer_types.ts:74`)
  with `enclave_id` and optional `locked_until_turn`
- Field is populated in `data/scenarios/officers/apr1992_officers.json` for all enclave commanders:
  - `arbih_oric` — `enclave_lock: {enclave_id: "srebrenica", locked_until_turn: 168}` (pol_rel=3)
  - `arbih_palic` — `enclave_lock: {enclave_id: "zepa"}` (pol_rel=4)
  - `arbih_imamovic` — `enclave_lock: {enclave_id: "gorazde"}` (pol_rel=4)
  - Also: Sarajevo 1st Corps officers, Bihać 5th Corps officers
- All named enclave commanders currently have `pol_rel ≥ 3`, meaning they never trigger
  warlord friction today. **No live bug exists.** The guard is a correctness contract:
  if any future enclave commander has `pol_rel < 2`, the false `refused_release` is prevented.
- `warlord_friction.ts` did NOT read `enclave_lock` anywhere before this fix.

### Fix Applied

**File:** `src/sim/combat/warlord_friction.ts`

After `frictionType` is determined, before the event is constructed:

```typescript
// Enclave-lock guard: physically isolated commanders cannot refuse to
// release brigades — they have no connection to army reserve.
// Their non-compliance is structural isolation, not insubordination.
// (Orić/Srebrenica, Palić/Žepa, Imamović/Goražde — Historian-flagged 2026-04-06)
if (frictionType === 'refused_release' && data.enclave_lock) {
    const lock = data.enclave_lock;
    const lockActive = lock.locked_until_turn === undefined || turn < lock.locked_until_turn;
    if (lockActive) continue;
}
```

The guard:
- Only fires when `frictionType === 'refused_release'`
- Respects `locked_until_turn` — after the lock expires (enclave breakout/evacuation), refused_release can fire normally
- Other friction types (`ignored_stance`, `unauthorized_op`) are unaffected — besieged commanders can still act independently within their enclave

### Tests Added

**File:** `tests/officer_experience.test.ts` — 4 new tests in `checkWarlordFriction` describe block:

1. **permanent lock suppresses refused_release**: officer 'c1' (pol_rel=1, permanent enclave_lock) — 0 refused_release events across 1000 turns; other types still fire
2. **lock expiry allows refused_release**: officer 'c1' (locked_until_turn=413) — 0 refused in turns [0,413), >0 in turns [413,1000)
3. **non-enclave officer can emit refused_release**: officer 't1' (no enclave_lock) — >0 refused events in 1000 turns
4. **type selectivity**: officer 'c1' with permanent lock — ignored_stance and unauthorized_op still fire; refused_release = 0

Note: officer IDs 't1' and 'c1' chosen for specific djb2 hash distribution (verified by hash inspection). The djb2 % 10000 function has poor uniformity for many ID strings — some never hit the refused_release bucket (typeRoll ≥ 0.85) in 500+ turns.

### Behavioral Impact

- Zero behavioral change for any current gameplay — all named enclave commanders have pol_rel ≥ 3 and never trigger friction anyway
- Defensive correctness contract for future officer additions
- Determinism preserved: no new randomness introduced

---

## Deliverable 2: DRINA Regression Investigation — INCONCLUSIVE

### Problem

Napkin P1: "DRINA regression (~1.5pp): must_hold freed Drina brigades → eastern OSID overcapture."
Calibration: n1323=94.0% → n1344=93.3% (−0.7pp total; DRINA-region contribution unknown).

### Investigation

Dispatched a Systems Programmer agent to investigate via `latest_run_final_save.json` and static analysis.

**Agent returned findings that could not be verified:**
- Claimed root cause: deletion of "Op Teočak" removing ARBiH counter-pressure
- Claimed commit `be9e89df` changed `rastosnica_2` initial control
- Claimed `vrs_drina` zone posture: "projecting", 8 brigades, surplus=2

**Verification findings (main agent):**
- Op Teočak is NOT deleted — `data/scenarios/apr1992_definitive_40w.json` line 720 shows `"op:ugljevik:teocak_krstac_2": "RBiH"` (still present as initial control)
- `vrs_drina` in `latest_run_final_save.json` shows `current_stance: None` — contradicts agent's "projecting" claim
- Op Podrinje Sweep DOES exist in `pre_planned_operations.ts` (line 154) targeting `vlasenica:cerska_2`

**Conclusion: The agent's root cause was fabricated.** The investigation is inconclusive.

### What Is Known

1. The 40w scenario's `must_hold_osids_by_corps` does NOT include `vrs_drina`
2. `vrs_drina` zone IS marked `is_must_hold` via `engineMustHold` chokepoint BFS detection (not scenario data)
3. Op Podrinje Sweep exists and uses `rs_5th_podrinje` + `rs_1st_podrinje` brigades
4. The napkin hypothesis ("must_hold freed Drina brigades") has not been verified or refuted

### Required Next Step

A dedicated calibration session with:
1. Fresh 40w scenario run with DRINA region diagnostic
2. Per-OSID control change log in the DRINA region
3. Historian consultation on which eastern BiH OSIDs VRS actually held by January 1993
4. Compare against painted targets to identify which mismatches are engine bugs vs calibration data issues

**This is NOT a Phase F blocker** — the enclave-lock guard and roadmap pass are complete and independent.

---

## Deliverable 3: Repo-Truth / Roadmap Closeout — COMPLETE

### Changes

**`docs/plans/MASTER_ROADMAP.md`:**
- `Current Version: 0.8.3` → `0.8.4` (was stale since Phase D claimed "Roadmap Truth" but never bumped version)
- Phase E closing text scoped to "Phases A–E CLOSED"
- Phase F IN PROGRESS bullet added at line 205

**Note:** `MASTER_ROADMAP.md` already had the complete v0.8.4 phase status entries from prior commits (Phases 1, B, C, D, E). The only missing items were the version number and the Phase F entry.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ clean |
| `vitest run` | ✅ 2881/2881 (198 files) |
| `desktop:map:build` | ✅ clean (pre-existing warnings accepted) |
| 4 new enclave-lock tests | ✅ all pass |
| DRINA fix | ⚠️ inconclusive — deferred |
| Roadmap version | ✅ 0.8.4 |
| Phase F ledger entry | ✅ |

---

## Open P1s After Phase F

1. **DRINA regression (~0.7pp overall)** — root cause unknown; requires fresh diagnostic run + Historian on eastern BiH Jan 1993 territory
2. **boljanic_2 (Doboj)** — pre-existing
3. **Ozren pocket** — pre-existing
4. **ZEA rate 47%** — pre-existing
5. **Casualty ratio discrepancy** — pre-existing

## Recommended Next Lane Before v0.9

Per Phase F scope: "repo closeout first, next prompt second."

**Recommended: dedicated DRINA calibration session**
- Run 40w scenario with diagnostic output
- Historian confirms eastern BiH territorial reality at January 1993
- Fix or accept the DRINA delta based on evidence
- Then open v0.8.x final cleanup lane or proceed to v0.9 per MASTER_ROADMAP.md
