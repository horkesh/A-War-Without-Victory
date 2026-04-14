# 2026-04-11 Podrinje / Sarajevo / Posavina Story-Breaker Hardening

## Scope

Three live story-breakers were investigated together and then split back into their real owners:

1. Podrinje brigades drifting to Banja Luka.
2. Sarajevo city ending the run as not under siege.
3. Posavina corridor ending severed.

They were not one bug.

## Exact root causes

### 1. Podrinje in Banja Luka

Two separate seams were involved.

- Recruitment identity preservation was missing for already-existing OOB brigades when `recruited_brigade_ids` was stale. Existing Podrinje formations could be recreated from OOB data and respawned at enemy-held `home_osid`, then emergency-retreated into Banja Luka.
- Multi-axis operation readiness in `sector_offensive.ts` only checked the first objective approach path globally, so multi-axis operations could stall even when every axis was correctly staged on its own approach.

The combined result was a false campaign story: Podrinje formations either got recreated into an enemy-home displacement path or missed the offensive lane that should have kept them in Drina-area action.

### 2. Sarajevo not under siege

`updateSarajevoState(...)` was reading the Sarajevo city core too broadly. It detected the city-core OSIDs correctly, but then:

- picked a single controller for the whole split city, and
- averaged supply across all core OSIDs, including RS-held besieger tiles.

That let the political `sarajevo_state` read `OPEN` even while:

- `military.event_flags.sarajevo_siege_active === true`,
- enclave resilience still treated Sarajevo as under siege, and
- the core city pocket was still RBiH-held and encircled.

### 3. Posavina corridor cut off

This was a compound engine-plus-contract seam:

- the same multi-axis readiness bug above could stall corridor-relevant operations,
- `Operation Koridor` was not pinned to an explicit corridor-breaking contract strongly enough, and
- the definitive 40-week scenario still carried stale `must_hold_osids_by_corps` references, including a dead `vrs_posavina` entry and dead/non-live OSIDs.

That meant the substrate could fail to tell the corridor story even when the operational geography still supported it.

## Exact changes

### Recruitment / Podrinje identity

- `src/sim/recruitment_engine.ts`
  - `recruitBrigade(...)` now treats an already-existing `state.military.formations[id]` as canonical truth and returns `already_recruited`.
  - `runBotRecruitment(...)` now marks already-existing OOB brigades into `recruited_brigade_ids` instead of recreating them.
- `src/sim/recruitment_turn.ts`
  - `applyRsMandatoryMobilizationAccrual(...)` now excludes already-existing formations from pending mandatory accrual.
- `tests/recruitment_existing_formation_identity.test.ts`
  - locks both the recruitment and ongoing-mobilization identity cases.

### Multi-axis readiness / Podrinje + Koridor + Prsten

- `src/sim/combat/sector_offensive.ts`
  - multi-axis readiness now checks each axis against its own current objective approach truth rather than using the first objective approach globally.
- `tests/sector_offensive_idle_recovery.test.ts`
  - regression proving a multi-axis operation launches when every axis is correctly staged on its own approach.

### Sarajevo split-pocket state truth

- `src/state/sarajevo_exception.ts`
  - canonical siege activity now prefers the besieged Sarajevo pocket owner, not whole-city majority control.
  - supply and `settlement_ids` are now computed only from the controller-held pocket OSIDs.
- `src/state/enclave_integrity.ts`
  - adds canonical `SARAJEVO_CITY_CORE_MUN_IDS`.
  - enclave ids now use a browser-safe deterministic hash instead of `node:crypto`, fixing map bundle compatibility.
- `src/sim/combat/enclave_resilience.ts`
  - Sarajevo enclave scope now uses only the city core municipalities, not the larger metro ring.
- `tests/sarajevo_exception.test.ts`
  - new split-pocket regression proving the besieged RBiH pocket stays `BESIEGED` even when RS-held Sarajevo-core OSIDs are well supplied.

### Posavina scenario contract + operation contract

- `src/sim/combat/pre_planned_operations.ts`
  - `Operation Koridor` now keeps an explicit corridor-breaking contract (`min_attack_outcome: 'repulsed'`, `planning_duration: 3`).
- `tests/pre_planned_operations.test.ts`
  - regression proving Koridor stays on the corridor-breaking contract.
- `src/scenario/scenario_runner.ts`
  - validates `must_hold_osids_by_corps` against live corps ids and operational OSIDs before startup state construction.
- `data/scenarios/apr1992_definitive_40w.json`
  - removes stale corridor anchors and rewrites them to live East Bosnian / Brcko-Doboj operational truth.
- `tests/scenario_must_hold_contract.test.ts`
  - proves the definitive scenario only references live corps ids and real operational OSIDs.

## Verification

### Targeted regressions

- `npx.cmd tsx --test tests\\sarajevo_exception.test.ts`
  - PASS
- `npx.cmd tsx --test tests\\pre_planned_operations.test.ts`
  - PASS
- `npx.cmd tsx --test tests\\scenario_must_hold_contract.test.ts`
  - PASS
- `npx.cmd vitest run tests/sector_offensive_idle_recovery.test.ts -t "launches a multi-axis operation when each axis is staged on its own approach"`
  - PASS
- `npx.cmd vitest run tests/recruitment_existing_formation_identity.test.ts`
  - PASS

### Build / type proof

- `npx.cmd tsc --noEmit -p tsconfig.json`
  - PASS
- `npm.cmd run desktop:map:build`
  - PASS
- `npm.cmd run build`
  - PASS

### Fresh scenario proof

- `npm.cmd run sim:scenario:run:40w`
  - final proof run: `runs/apr1992_definitive_40w__480e358e5d284e09__w40_n1437`
  - final hash: `e146406ca031ebf2`

### Final-save proof from `n1437`

#### Podrinje

- `rs_1st_podrinje`
  - `created_turn: 0`
  - `location_osid: op:rogatica:pljesevica`
  - assigned to `sector:vrs_drina:0`
  - no movement order
- `rs_5th_podrinje`
  - `created_turn: 0`
  - not in Banja Luka
  - destroyed after fighting in the Drina/Zepa lane (`location_osid: op:hanpijesak:godjenje_2`, `last_repulsed_from.osid: op:rogatica:zepa_2`)

#### Sarajevo

- `political.sarajevo_state.siege_status === "BESIEGED"`
- `settlement_ids` now resolve to the RBiH-held city-core pocket only:
  - `op:centar_sarajevo:sarajevo_dio_centar_sajarevo`
  - `op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo`
  - `op:novo_sarajevo:sarajevo_dio_novo_sarajevo`
  - `op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo`

#### Posavina corridor

- A fresh RS-controlled BFS path exists from Banja Luka into the corridor:
  - `op:banja_luka:banja_luka_2`
  - `op:celinac:celinac_2`
  - `op:celinac:josavka_donja_2`
  - `op:prnjavor:donji_vijacani_2`
  - `op:doboj:stanari_2`
  - `op:derventa:cerani_2`
  - `op:derventa:derventa_2`
  - `op:derventa:luzani_bosanski`
  - `op:modrica:vranjak_2`
  - `op:modrica:modrica`

This is the exact opposite of a cut corridor.

## What did not close here

The full suite is not globally clean after this lane, but the remaining reds are different seams:

- `tests/integration_anomaly.test.ts`
  - `hrhb_herceg_stjepan_brigade` unresolved frontline anomaly
- `tests/integration_deployment_health.test.ts`
  - `op:brcko:brka_2` anchor mismatch
- `tests/sector_foca_kalinovik_front_ownership_real_save.test.ts`
  - Herzegovina/Foča front-edge ownership regression around `op:foca:donje_zesce__op:foca:mazlina`

Those are real and should not be hand-waved, but they are not the three story-breakers covered by this report.

## Outcome

This lane restored the intended 1992 strategic story in three places without inventing new systems:

- Podrinje formations now preserve identity and participate from Drina truth instead of teleporting into Banja Luka failure states.
- Sarajevo's political state now matches the military/enclave truth of an active siege.
- Posavina corridor proof now exists in the final save as a live RS-controlled path rather than a broken scenario narrative.
