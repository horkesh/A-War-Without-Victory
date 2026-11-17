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

**Measured.** TODO (lane lead): historical and emergent 188w, each run twice, against main. Expected: checkpoints and guards equal to the base; fired-event diff shows only the two Belgrade cards lost; no cell changes; the hash moves (all six bases at the boundary, plus the w188 Dayton stamp); re-pin; `ci:structural-fingerprint:check` unchanged. Knife-edges to report, not tune: RS pc at exactly 35 against `csq_patron_arms_pipeline_attenuated` (< 35); `csq_back_channel_communication_RS` at exactly 50 on a desktop path.
