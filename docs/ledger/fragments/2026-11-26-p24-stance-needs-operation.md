## 2026-11-26 — P2.4: a corps holds the offensive stance only while an offensive operation carries it

Authority: freeze inventory §8 R1 (MUST-FIX before 1.0); released under orchestrator ruling §26 (Fable consult 10 merge rule). Hash-moving.

**Change.**
- With no sector attack, feint, probe or general offensive in planning or execution, a corps' stance is capped at balanced (`corpsHasPlanningOrExecutionOperation`, last layer of `generateCorpsStanceOrders`, trace driver `no_operation`; the Level 1 recommendation is capped too).
- `capCorpsStancesWithoutOperation` runs after the commander loop in `bot_corps_ai.ts`, before clamp 3; `player_ordered_stance` is skipped and holds still clamp last.
- Canon: Systems Manual paragraph after "Corps threat ratio reads the OSID graph"; Rulebook sentence after "Who decides". FORAWWV unchanged.
- Tests: `tests/sim/p24_stance_needs_operation.test.ts`; three formula tests give their corps a planning operation.

**Measured.** 188w pair on main 5993d906c + P2.4 (7884b6583): hist 2345a6cf36a2ed5d, emer fd64de0580f485b4. Re-measured after #884 (CAS-REPORT-2) merged, on c752ccafe: hist 55e86955b0907681, emer 68b1c6da77e571d9; against pair a, control, all 297 formations and all battles are equal in both modes (only CAS-REPORT-2 records move). Engine health PASS both modes; live parity hands-off RBiH a2 0/0/0/0 both modes. Offensive corps-weeks with no operation: main 263/268, P2.4 16 (trace residue). Under the §26 merge rule the Farz gates are green; shape rows on the Part 6 list: Lukavac Brijesnica early (both modes, t161, Val 2), Petrovo (hist, t176, Rijeka 2), gornja Bočinja retaken (emer, t183). Baselines re-pinned. Calibration on hold: scores recorded, not tuned.

**Re-measured after WASH-IMPOSED (#891, ruling §29) merged**, on 28431e6cc (main 4c46a9fea merged in): hist `dc9a2233e9a76d0a`, emer `438370583cc5f377`; re-pinned. Ceasefire t95 and Washington t99 in both modes (was t117/t121 before #891), so `assertHistoricalWashingtonBeforeQuietFrontWindow` passes in both. Under the §26 tool (`verify_checkpoints.cjs`): G1-G3 green, no tripwire, and 0 shape rows red in both modes (S1 4/4, S2 0 early falls, S4 0, S5 31/31), so no new Part 6 rows. Checkpoints jan1993 692, apr1994 690, apr1995 687, oct1995 659 of 712 in both modes. The Systems Manual RF-F1 note now carries the measured weeks (t95/t99, about 3 and 2 weeks early).
