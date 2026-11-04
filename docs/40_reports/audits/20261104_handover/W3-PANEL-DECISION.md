# Pyrrhic panel decision — W3 (empty-sector no-teleport), 2026-11-04

Integrator: Claude (planner). Packet: `../DECISION-PACKET-W3.md` (frozen before dispatch). Seats were blind to each other. Verdict files are in this folder.

## Vote: KEEP — 3 to 1

| seat | vote | confidence | load-bearing reason |
|---|---|---|---|
| Canon / game design | KEEP | medium | Engine Invariants §14.9 and MOVEMENT_AUTHORITY ("no engine tier may teleport"; "unresolved-is-honest is preferable to paper staffing") already settle it. PARK would keep calibrating against a forbidden mechanic. |
| Operations | KEEP | medium | Ozren was lost because Farz 95 was never injected (`injectArmyHqOperations` blocks on `hasActiveOperation`, which counts a recovering probe), not because of any staffing W3 removed. |
| Sectors | KEEP | medium | 2nd/3rd Corps sectors stay staffed in both runs (all assigned at w188 in C); the cause is the same Farz injection gate. W3 is a correct, narrow §14.9 implementation. |
| History | PARK | medium | B's lead is mostly real history (Konjic, Hotonj, Trnovo, Vlašić); C's oct1995 gains are last-week coincidences, and one (Pelagićevo→HRHB) is ahistorical. Land W3 only once relief staffs those fronts. |

## Convergence (highest-confidence findings)
- **Operations and Sectors independently found the same root cause.** At t178 in C, `probe_arbih_3rd_corps_t177` is still recovering. `injectArmyHqOperations` (`triggered_operations.ts:~1513`) refuses to inject Farz 95 while ANY op is active. The 3rd Corps then never frees up (Donji Vakuf 95, Jajce Recovery, Rijeka), so the one-shot op never fires. The ordinary triggered path uses `hasAvailableSlot`, and queued ops use `isSlot0AvailableForQueue`, which deliberately ignore probes. The 4/4 in B hinged on a one-turn coincidence of probe parity.

## Contradiction sweep
- History says C's early losses come from unstaffed sectors (inferred); Sectors measures the 2nd/3rd Corps fully staffed. **No conflict:** the early losses are in the EAST and SOUTH (Goražde/Čajniče/Foča, Konjic, Trnovo, Hotonj), not 2nd/3rd Corps. Operations attributes them to the regenerated startup placing eastern brigades differently (e.g. 851st), plus missing t9–t25 captures. All three agree the jan1993 −7 is a genuine W3 effect.
- History counts B's advantage as mostly real; Operations says part of B's score was "bought by the teleport". **Both true:** the ground is historically right, but B reaches it through a forbidden mechanic. The canon seat and owner directive ("never buy score with a broken mechanic") decide which way that cuts. History down-weights four Goražde-rim cells as SUSPECT references; B still leads without them.
- Canon notes the full suite had not run on C. It was started before the decision (`../full-vitest-HEAD.log`); its result gates W3 leaving the integration branch.

## Conditions attached to KEEP (all four seats' concerns)
1. **Next single measured change:** the Army HQ injection gate must not be blocked by probes or recovery-phase ops. Use the triggered path's `hasAvailableSlot` and record a trace when blocked. Recheck the Srebrenica/Žepa guard, because the same gate governs Krivaja 95 (RS). Expected: Ozren 4/4. Not yet measured.
2. **The historian's dissent is binding for main adoption.** The early-war ground C loses (Konjic Glavatičevo/Ljuta, Hotonj, Trnovo Tošići, the eastern rim) must be recovered through the legal T1/T2/T3 relief path and startup placement before W3 reaches main. Never by restoring the teleport.
3. **Recorded residuals (not fixed by W3):**
   - own-sector reserve/rear promotion is still an instant move within 3 hops;
   - `severe-rescue:floor-completion` and `severe-relief` still instantly move brigades into thin-but-staffed sectors;
   - T1 skips a sector that holds reserve/rear brigades whose promotion failed for a non-legal reason, so it can stay empty and unflagged;
   - column starts fell 1175→771 (not attributed; stranded = 0);
   - the inherited Farz authored-AAR receipt guard fails in all three runs.
4. **Full suite and tsc on the final candidate** before anything leaves this local integration branch. Nothing is pushed or merged by this decision.
