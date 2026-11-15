## 2026-11-15 — corps_plan receipts: why a corps made no plan (default off)

The deferral seats found that on main all four ARBiH corps make no commander plan in t99-178 and read "defensive stance, no new plans" at t188. Whether the stance gate or the exhaustion gate causes it was untraced. This adds the trace that RF-STRENGTH uses as its premise.

**Change.** A new reason-code topic, `AWWV_DEBUG_REASON_CODES=corps_plan`. After the commander loop it writes one `[corps_plan]` stdout line per corps per bot pass, holding:
- the corps stance and the formula layer that set it (`stance_driver`, from the read-only stance trace);
- `corps_exhaustion`;
- the commander's `last_plan_action` and `last_plan_reason`, and the current plan status;
- the active operations;
- the force tiers the readiness layer reads (`tier_counts`);
- the brigade count, healthy by the fixed 3,000 cap (`countHealthyBrigades`), and healthy by each brigade's designed `max_personnel`.

Files: `src/sim/combat/corps_plan_trace.ts`, the topic in `reason_code_debug.ts`, and one gated call in `bot_corps_ai.ts`.

**Inert.** Nothing is written to GameState or to any report, and no decision reads the trace. With the topic off it returns before reading anything.

**Tests.** `tests/sim/corps_plan_trace.test.ts`:
- silent when off;
- one record per corps when on, with healthy 0 by the cap and 2 by design for two full 1,800-designed brigades;
- the same GameState with the topic on and off.

The topic is added to `tests/reason_code_debug.test.ts`.

**Proof.**
- `test:baselines`: all scenarios match (default off).
- A 188w run with the topic ON against main `4064eafaa` (off): all 8 artifacts byte-identical, final_save `19262a0b19df1567`. 3,380 receipts.
- `tsc` 0.

**First reading (main, ARBiH, t99-178).** The army-wide lockout is the EXHAUSTION gate, not the stance gate.
- The 1st, 2nd, 3rd and 4th Corps sit at offensive or balanced stance (doctrine, faction rule), but their corps exhaustion averages 95, 80, 71 and 55 against the gate of 30 (`MAX_EXHAUSTION_FOR_OPERATION`).
- 316 of their 320 corps-turns read "corps exhaustion N above operation threshold 30". The 3rd Corps made one plan, which was abandoned.
- The 5th and 7th Corps (mean exhaustion 6-7) planned 14 and 11 times.
- The t188 reading "defensive stance, no new plans" is the October 1995 ceasefire clamp (driver `ceasefire` from t184), which masks the exhaustion gate.
- Healthy brigades by the 3,000 cap average 0-6 per corps, against 10-32 by designed strength. That yardstick does not gate commander planning.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/rf-corps-plan-trace-20261115/`.
