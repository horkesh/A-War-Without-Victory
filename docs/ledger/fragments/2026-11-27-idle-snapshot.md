## 2026-11-27 — IDLE-SNAPSHOT: a pool is judged idle before the reserve pass, so a reserve top-up does not make it idle

Authority: orchestrator ruling §48 (Codex r4717315272 on #900, MUST-FIX, pre-freeze). Hash-moving.

**Change.**
- `reinforceFromStrategicReserves` takes the idle-pool key snapshot (`findIdlePoolKeys`) before the strategic-reserve loop and passes it to `placeIdleReplacements`. Before, the snapshot was taken after the reserve loop, so a pool whose last under-cap home brigade was topped up from the reserve that turn counted as idle, and its weariness loss was offered. The code now matches the Systems Manual "Idle replacement" line ("judged after the home reinforcement pass"), which is unchanged. No new field or number; order and determinism unchanged (sorted keys).
- Receipt: `[reinforcement_allocation] idle_snapshot {turn, reserve_flipped, with_loss}`, printed only when a pool flips, under the `reinforcement_allocation` topic. Console only.
- Test (written first, red on main 380 vs 300): `tests/strategic_reserve_idle_stock.test.ts`, Codex's repro (a home brigade at 1,999/2,000, one reserve man, an 80-man weariness loss: nothing is transferred).

**Measured.** 188w pair on main ed24f1846 + this change (7e7b70c92, receipts on): hist `39cb33709877c8be`, emer `f47000754d6ce9cc` (main `4db63c2305185224` / `58393c6f834709f9`); baselines re-pinned (final_save, run_summary). The structural fingerprint is unchanged.
- Reached: pool-turns that flip to idle only because of a reserve top-up, hist 133 (22 with a weariness loss over 16 turns: RBiH 14, HRHB 7, RS 1), emer 134 (25 over 19 turns: RBiH 16, HRHB 6, RS 3). The first divergence is the idle offer at the first flipped pool-turn (t13 HRHB, offer 142 → 131, duvno:HRHB out; 50 men placed either way).
- Hist: no placement changes (HRHB 6,386 / RS 29,554). Only two HRHB pools' `committed` booking moves (duvno, livno); every other artefact is byte-identical to main.
- Emer: the first placement change is turn 178, RS 366 → 367 (war total 31,739 → 31,750); the first brigade-log difference is week 177 (rs_27th_derventa_motorized 830 → 831), the first battle difference week 182. Control is identical to main at all four checkpoints in both modes; activity, formation and watched operations are byte-identical.
- Consult 12 appendix B: January 1993 691 in both modes, cells identical to main; the seven Ozren-line brigades have 0 weeks under 400 men in weeks 100-178 (lowest 4th Ozren 424/423); RS brigades under 400 at weeks 100/140/178: at most 1; receipts RS placed 0 before its route opens (week 40), RBiH placed 0; battles 470 / 474.
- §26 gates and tripwire PASS in both modes (one early fall, stopping line 0, anchors 31/31 hist and 30/31 emer, as main). Strict health, consistency and Washington pass. Calibration on hold: recorded, not tuned.
