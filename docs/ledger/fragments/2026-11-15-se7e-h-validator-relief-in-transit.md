## 2026-11-15 — SE7E-h: the run validator counts a relief already in transit (validator only)

RESIGNOFF blocker from the freeze plan (Fable consult 2). Found in RF-1 Phase B (#591): the Prusac sector.

**Defect.** `tools/validate_run_consistency.cjs` failed an empty contested sector "with legal donor(s) available" even when the engine had already ordered a relief into it and the brigade was on the road. The engine's empty-sector relief (`computeEmptySectorReliefReassignments`, `hasPendingReliefForTargets` in `src/sim/combat/commander/decide.ts`) issues no second relief while one is in transit. The validator ignored the march and reported a missed reinforcement.

Observed case: on main after #591, `sector:arbih_7th_corps:3` (Prusac) is empty at t188 while the 770th Slavna is in transit to `prusac_2`, with 3 turns left. That was main's consistency 1.

**Change.** Before the donor check, the validator now applies the engine's own test: a movement order or an in-flight movement whose destinations include one of the sector's friendly front OSIDs. A match is reported as `relief_in_transit`, a logged note naming the relieving brigades, and is not a failure. Nothing else changes: no relief in flight still fails with legal donors, and a march to another OSID does not count.

**Evidence.**
- Main's 188w run (4d876050e, `..._w188_n6`) and the RF-1 final run both go from 1 failure to PASS. The Prusac line now reads "relief is in transit … (arbih_770th_slavna_mountain)".
- The validator isn't part of the simulation, so the sim and baselines are byte-identical.
- Tests: `tests/validate_run_consistency.test.ts` gains the in-transit, movement-order and wrong-destination cases; the empty-sector expectations carry the new `relief_in_transit` field. 24/24 pass; `tsc` 0.
