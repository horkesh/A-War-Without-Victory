## 2026-11-15 — Brčko Tactical Group relocates only onto held ground; emergency-retreat step 3 documented

Same failure class as the t73 elite-recall freeze (#675): a write to `location_osid` that does not check who holds the target. Both items are latent: neither runs in a default game.

- **Brčko Tactical Group** (`src/sim/combat/brcko_tactical_group.ts`, behind `AWWV_BRCKO_TACTICAL_GROUP`, default OFF).
  - At turn 56 it moved `rs_5th_kozara_light_infantry` to `op:brcko:brcko`, and at turn 70 back to `home_osid`, without checking control.
  - With the flag on, in a game where Brčko or the home cell had fallen, that teleported the brigade into enemy territory. The move runs before combat and before `displace-enemy-territory`, so the barrier would not fire. Displacement would then treat the brigade as overrun in a cell it never fought for: a wrong outcome, not a freeze.
  - Fix: each move now goes only onto a cell its side holds, using the barrier's own test (controlled, and `isFriendlyFaction`). Otherwise the brigade stays where it is and its journey is untouched. No forced control.
- **`findEmergencyRetreatOsid` step 3** (`src/sim/combat/attack_retreat_displacement.ts`). The BFS never fills `next`, so it is one hop. This is not a bug.
  - It never expands through enemy territory, and the first friendly neighbour returns at once, so `next` could only ever hold friendly cells, and those would already have returned.
  - Farther friendly ground in the same component is handled by steps 4-5, and the cut-off rule forbids crossing to another component.
  - Comment only, no code change. The `friendlyPathToAny` consolidation goes to the sector lane later.
- **Tests.** `tests/brcko_tactical_group_journey_lifecycle.test.ts`:
  - the fixture now gives RS both cells;
  - new cases: does not attach to a lost Brčko (the journey is kept); does not return to a lost or uncontrolled home (it stays at Brčko);
  - the flag-off no-op case is unchanged;
  - `tests/emergency_retreat_reachability.test.ts` passes.
- **Headless: byte-identical.** With the flag off the module returns before the guard. `npm run test:baselines` (188-week master): "all scenarios match" (log `C:/Pyrrhic/AWWV-worktrees/_logs/latent-guards-20261115/baselines.log`). Not a measured change.
