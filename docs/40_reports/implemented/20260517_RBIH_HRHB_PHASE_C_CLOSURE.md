# RBiH-HRHB Phase C Closure

Date: 2026-05-17
Lane: independent Phase C implementation after `b26d7a82`

## Implemented

- Closed C2 formation diversion:
  - `reassignCorpsForBilateralWar(...)` deterministically selects one eligible corps by mixed-municipality bilateral-front overlap, with `strictCompare` tie-breaks.
  - HRHB requires at least three corps; RBiH requires at least four corps.
  - The helper writes corps stance/directive hints only; brigade migration remains emergent through existing assignment logic.
- Closed C3 bilateral displacement cascade:
  - RBiH-HRHB takeover displacement uses `BILATERAL_KILL_FRACTION = 0.03`.
  - Croat displacement under bilateral takeover uses `BILATERAL_HRHB_FLEE_ABROAD = 0.35`.
  - Bilateral routing prioritizes same-side destinations without event-driven massacre changes.
- Closed C4 ceasefire redeployment:
  - Diverted corps release over three deterministic turns after ceasefire.
  - Washington release is permanent and marks the prior diverted corps as post-Washington joint-ops ready.
- Closed C5 Washington joint pressure and mixed-municipality restoration:
  - Washington signing restores `allied_mixed_municipalities` from current RBiH/HRHB formations and militia pools, plus the default mixed set.
  - Post-Washington RBiH/HRHB defense against RS in restored mixed municipalities receives the existing `POST_WASH_JOINT_PRESSURE_BONUS = 1.15`.
  - The multiplier is applied in both OSID attack resolution and legacy SID battle resolution.

## Verification

- `npx.cmd vitest run tests\bilateral_formation_diversion.test.ts tests\bilateral_ceasefire_redeployment.test.ts tests\bilateral_displacement_cascade.test.ts tests\washington_joint_pressure.test.ts` - PASS, 10/10 tests.
- `npm.cmd run typecheck` - PASS.

## Scenario Probes

- 40w probe: `npm.cmd run sim:scenario:run:40w` - PASS.
  - Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1867`
  - `final_state_hash`: `583aaa2f33875d8c`
  - Anchors: 27/27.
- 188w probe: `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs` - PASS.
  - Run dir: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1868`
  - `final_state_hash`: `3700a34cd255c99c`
  - Anchors: 25/27.
- Caveat: this checkout contains unrelated dirty supply, strict-null, latest-run, and audit edits outside the owned RBiH-HRHB lane. Treat these hashes as current integration-context probes, not isolated Phase C-only hashes.

## Determinism

- Corps diversion sorts corps, sectors, OSIDs, and tie-breaks with `strictCompare`.
- Washington restoration sorts formation ids, militia-pool keys, municipality rows, and output.
- No randomness, timestamps, filesystem ordering, or nondeterministic iteration were introduced.

## Canon And Sensitive-History Gate

- Canon mapping: War Spec v0.9.0 §4/§6 and Systems Manual v0.9.0 §6.4/§6.6a place corps command, RBiH-HRHB alliance behavior, ceasefire/Washington checks, and displacement in war-phase mechanics; Engine Invariants v0.9.0 §13/§14 require OSID state and brigade-operation ordering to be deterministic.
- Focused tests do not touch Ahmici, Stupni Do, Grabovica, or Uzdol fixtures.
- 188w watched-event scan:
  - `csq_hvo_central_bosnia_offensive_1993` / Ahmici text fired on turn 48.
  - `grabovica_uzdol_massacres_1993` fired on turn 73.
  - `stupni_do_massacre_1993` fired on turn 80.
  - The generic enclave diagnostic reports existing `OPEN_P0` enclave status for Srebrenica/Zepa, hash `3700a34cd255c99c`; this is outside the RBiH-HRHB sensitive-history gate and matches the known late-war watched-operation gap class.
