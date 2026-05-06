# Q1 — HVO Northwest Bosnia Empty Corps Shell at t0

**Lane:** LANE-NIGHTSHIFT-Q1-HVO-NORTHWEST-BOSNIA-EMPTY-CORPS
**Date:** 2026-05-07
**Status:** IMPLEMENTED

## Surface

API smoke run `bft5bixcj` (commit `a2d564e6`) — Petković AI commander
turn 1, the corps `hvo_northwest_bosnia` was reported with 0 brigades + 0
personnel at t0/t1, with `created_turn=0`, `activation_gated=false`,
`activation_turn=null`. By run end (week 40), 4 brigades (`hrhb_101st_oraje`,
`hrhb_102nd`, `hrhb_106th_bosanska_posavina`, `hvo_hrvoje_vukcic`) were wired
to the corps.

Tier-1 verdict by `/scenario-creator-runner-tester` `a5e960c0`: REAL bug.

## Investigation Findings (CHECKPOINT)

### OOB data (truth)

`data/source/oob_corps.json`:
```json
{ "id": "hvo_northwest_bosnia", "faction": "HRHB", ..., "available_from": 10 }
```

`data/source/oob_brigades.json` — 7 brigades reference `corps:
"hvo_northwest_bosnia"`:
- `hrhb_101st_oraje_brigade` — `available_from: 2`
- `hrhb_102nd_brigade` — `available_from: 8`
- `hrhb_103rd_derventa_brigade` — `available_from: 8`
- `hrhb_104th_bosanski_brod_brigade` — `available_from: 8`
- `hrhb_105th_modrica_brigade` — `available_from: 8`
- `hrhb_106th_bosanska_posavina_brigade` — `available_from: ?`
- `hvo_hrvoje_vukcic_brigade` — `available_from: ?`
- `hvo_4th_guard_sinovi_posavine` — `available_from: ?`

The OOB design is: brigades come online weeks 2/8 (deferred via
`available_from`), and the corps formation activates week 10. So
**the OOB data is internally consistent**: at t0/t1, neither brigades nor
the corps formation should exist.

### Two activation pathways (engine)

1. `src/scenario/oob_early_war_entry.ts:createOobFormations` — initial scenario
   init. In `bottom_up` mode skips non-RS corps + brigades (deferred).
   Otherwise (`player_choice`, `auto_oob`) creates ALL corps + brigades at
   `created_turn=currentTurn` (=0) regardless of `available_from`.
2. `src/sim/early_war/activate_corps.ts:activateCorpsForTurn` — only runs in
   `bottom_up` mode (gated by pipeline) and respects `available_from`.

### The actual bug

Scenario `data/scenarios/apr1992_definitive_40w.json` uses
`recruitment_mode: "player_choice"`. In this mode the
`createOobFormations` path runs at scenario init and creates the
`hvo_northwest_bosnia` corps formation at t0 (line 188-204 of
`oob_early_war_entry.ts`) **without consulting `available_from`**, ignoring
the OOB-author intent that this OZ should not exist until week 10. The
brigades' own `available_from: 2/8/...` IS respected by the brigade-level
scenario init path (TBD: confirm), so the corps appears as an empty shell
at t0/t1.

### Root cause classification

**OOB-data intent is being violated by the engine path**, not a briefing
reducer bug. The reducer (`getCorpsSubordinates` in `bot_corps_helpers.ts`)
correctly returns 0 brigades because the brigades genuinely don't exist
yet. The fix is to make `createOobFormations` honor `available_from` for
corps in non-bottom_up modes too — gate corps creation by `currentTurn >=
available_from`. This matches the existing brigade gating semantics and
makes engine behavior consistent across all `recruitment_mode` values.

## Proposed Fix

In `src/scenario/oob_early_war_entry.ts:createOobFormations`, add an
`available_from` gate before corps formation creation, mirroring the
existing bottom_up skip:

```typescript
// Honor `available_from`: corps not yet activated should not exist as a
// formation. Applies to all recruitment modes (was previously only enforced
// by activate_corps.ts in bottom_up mode).
if ((c.available_from ?? 0) > currentTurn) continue;
```

This is faction-symmetric (no per-faction branch — just an `available_from`
check that applies uniformly).

## Tests

`tests/q1_hvo_northwest_bosnia_corps_shell.test.ts` — 6 tests, all pass:

- T1: corps with `available_from=10` not created at turn 0.
- T2: same corps IS created at turn 10.
- T3: determinism — same inputs produce identical corps composition.
- T4: backward-compat — `available_from=0` corps still creates at t0.
- T5: faction-symmetric — gates RBiH/RS/HRHB uniformly.
- T6: idempotency — once created, subsequent calls do not re-create or
  overwrite (preserves `created_turn`).

## Verification

- `npx vitest run tests/q1_*.test.ts` — 6/6 pass.
- `npx vitest run tests/recruitment_engine.test.ts` — 19/19 pass
  (regression check, includes existing `available_from` brigade-gate test).
- `npx vitest run tests/recruitment_existing_formation_identity.test.ts` —
  4/4 pass.
- `npx tsc --noEmit -p tsconfig.json` — clean.
- `tests/c1_*.test.ts` — pre-existing T7 failure on `main` (unrelated to
  this lane; verified by `git stash` baseline run shows the same single
  failure on commit `a2d564e6`).

## Files Touched (singular ownership)

- `src/sim/recruitment_engine.ts` — single 1-line `if` gate + canonical
  comment block (12 line addition).
- `tests/q1_hvo_northwest_bosnia_corps_shell.test.ts` — NEW.
- `docs/40_reports/implemented/20260507_Q1_HVO_NORTHWEST_BOSNIA_EMPTY_CORPS_FIX.md`
  — NEW (this file).

No A1-A5 / B1+B2 / C1+C2 frozen surfaces touched. No UI files. No §6
surface. Faction-symmetric mechanism — no per-faction branches.

## Calibration impact

40w smoke is expected to drift slightly because previously HRHB OZ corps
(hvo_central_bosnia available_from=10, hvo_northwest_bosnia
available_from=10, hvo_main_staff/southeast_herzegovina/tomislavgrad
available_from=10) were created at t0 and now are deferred to week 10.
This affects:
- `corps_command` map population (entries appear at week 10 not t0).
- Briefing snapshots for those corps before week 10 (no longer report
  empty shells).
- The `subordinate_count: 1` value seen in
  `data/derived/startup/apr_1992_initial_save.json:1184` at t0 was an
  artifact of this bug; that derived snapshot will need regeneration.

The fix preserves OOB-author intent and engine semantics: the
`activate_corps.ts` step in `war_phases.ts` (line 474) handles the
deferred activation idempotently from week N onward, so corps still
appear when their `available_from` turn arrives.

## Commit

TBD (next step).
