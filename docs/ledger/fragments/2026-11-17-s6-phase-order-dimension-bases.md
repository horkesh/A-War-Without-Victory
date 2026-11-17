## 2026-11-17 — §6 phase order: the one dimension-base owner runs at three points each war turn

**Defect.** `computeDimensionBaseValues`, the one owner of every strategic-dimension `base_value` (§6 E3a1 D2), ran once per turn, mid-turn at `compute-dimension-bases`. Support, standing and capital are written later: in the negotiation steps (patron events, plan rejection, the capital rebuild) and between turns by IPC (resolve-peace-plan; respond-to-event-decision when the turn is not paused). So the next turn's `evaluate-events` read a `patron_confidence` base one turn behind `support_level` while the override was current.
- `csq_back_channel_communication_RS` and `csq_patron_equipment_delivery_confirmed` fired at t119 only through this mix: Belgrade's "delivery" arrived the week after its blockade.
- The between-turn view showed the stale value, and the Dayton menu's frozen `faction_capital` was priced on mid-turn bases.
- This also closes the E3a1 "known timing shift" (a same-turn headless plan resolution and that turn's civCas term reached the base one turn late).

**Ruling.** §6 phase-order panel, unanimous for option (ii) in round 2 (engine/systems, red-team, determinism/QA; the lane lead integrated with no vote).

**Change.**
- One helper, `recomputeDimensionBases(state)` (`src/sim/events/strategic_dimensions.ts`), runs the owner for `RBiH`, `RS`, `HRHB` in that order. It is the only caller of `computeDimensionBaseValues` in `src/`.
- Three call sites:
  - (a) new step `refresh-dimension-bases-turn-start`, after `ensure-negotiation-state` and before `update-event-readiness`. Guards: `phase === 'war'`, not `game_over`, and skipped on the first war turn.
  - (b) `compute-dimension-bases`, now through the helper (behaviour unchanged).
  - (c) new step `refresh-dimension-bases` in `war_phase_negotiation_steps.ts`, directly after `compute-negotiation-capital` and before `evaluate-dayton-trigger`. Guards: `phase === 'war'`, not `game_over`.
- First-war-turn predicate: `meta.turn <= (meta.war_start_turn ?? 0) + 1`. `runTurn` increments `meta.turn` before the steps, and every war start (headless 188w, desktop `apr_1992`, the mid-war-start scenarios) sets `war_start_turn` 0 at `meta.turn` 0, so the first executed war turn is turn 1. The ruling's literal `meta.turn <= war_start_turn` would never skip (measured: test 5 goes red with it). `scenario_preseeding.ts` (`preseedScenarioState`) has no production caller.
- War-phase step count 191 → 193. No state shape change, no save migration.
- Canon: Systems Manual §7.10.3 "One base writer" reworded to the three fixed points; `PLAYER_TURN_GUIDE.md` lists the two new steps.

**Idempotence.** Headless, (a) is a no-op against the previous turn's (c): nothing between them writes a base input. The exception is `recruitment_mode: 'bottom_up'`, whose formation steps after the war phases change the active-brigade set that `internal_cohesion` reads; the 188w scenario uses `player_choice`.

**Known limits.** Between turns the view shows the pre-IPC base until the next turn start (display only). A save from before this change self-heals at the next turn start.

**Tests.** `tests/s6_phase_order_dimension_bases.test.ts` (new) and `tests/war_phase_step_order.test.ts` (count, history lines, order pins):
- turn-boundary consistency after a negotiation-step support write (RED before the change: RS pc base 80 against support 60, standing bases 50 against 35/60/60);
- the desktop gap: Contact Group answered between turns with RS rejecting, then t119 (RED before: pc base 58 against support 53, the delivery card fired);
- an unpaused between-turn support choice (RED before: pc base 50 against support 60);
- Dayton parity, the first war turn (desktop and headless births alike), idempotence ((c) then (a) byte-identical, same-state double `runTurn`, save/reload at a boundary), and a source scan (one helper, three call sites, one owner).

**Measured** (official runner, base main fb63c8353; each branch regime run twice, byte-identical):

| | historical | emergent |
|---|---|---|
| final_save hash, base → new | 964ab22c838c94a8 → 13ceed2efa34ea00 | 32f70252f45bebc4 → 50e1f25b12a1940d |
| checkpoints | 709/709/708/682 = base | 709/709/708/682 = base |
| guards | intact | intact |
| final cells changed | 0 | 0 |
| fired-event set | unchanged | unchanged |
| bot decisions changed | 0 | 0 |
| RS op launches (t56-74 / t104+) | 4 / 5 = base | 4 / 5 = base |

- **One timing change**, the same in both regimes: `csq_patron_equipment_delivery_confirmed` moves t119 → t122. `csq_back_channel_communication_RS` stays at t119.
- **Trace, RS** (end of turn, base → new):
  - t118: support 80, `patron_confidence` base 100 → 80, effective 70 → 50.
  - t119: the delivery card (needs pc ≥ 55) no longer fires on the stale base. The back-channel card (needs pc ≥ 50; `dimension_above` is ≥) still fires, at exactly 50.
  - t121: RS support jumps 79 → 93.5, because main's `belgrade_embargo_rs_1994` carries a `patron_pressure +15` effect, a support writer on main. The delivery card then fires at t122 on consistent values.
- **The ruling's expectation was measured on the §6 E4 branch.** There RS support is 35 from t118 and the embargo writes no support, so both Belgrade cards are lost (prototype: s6_phase_order_measured.md). On main, the t122 delivery is downstream of the embargo's support write, which E4 (#797) removes; it is not a phase-order effect. Whichever of E4 and this change lands second re-measures.
- **Knife-edges**, reported, not tuned:
  - `csq_back_channel_communication_RS` at exactly 50, here on the headless path;
  - on E4, RS pc at exactly 35 against `csq_patron_arms_pipeline_attenuated` (< 35).
- Re-pinned; `ci:structural-fingerprint:check` unchanged (40w control).
