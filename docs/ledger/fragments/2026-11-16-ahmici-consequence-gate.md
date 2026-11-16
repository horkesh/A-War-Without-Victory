## 2026-11-16 — The Ahmići consequence fires only after the 1993 war has begun and the alliance is broken (trigger only; content and wording unchanged; byte-identical)

- **Why.** `csq_hvo_central_bosnia_offensive_1993` ("The Ahmići Massacre and the End of the Alliance") fired at t54-56 on `hrhb_political_goal == croat_republic` alone, whatever the RBiH-HRHB alliance. It sets alliance −1 with a 0.0 ceiling for 60 turns, and its mutex with `csq_alliance_holds_past_w35` only works within one turn. The rupture was therefore scripted from a week-3 flag. Its own text says the alliance was "already broken in practice", and the sibling `ahmici_massacre_1993` already requires the 1993 war.
- **Measured** (instrumented diagnostic 188w; historical and hands-off emergent the same). The alliance is held at 0.40 from t10 to t40 (`ALLIANCE_FLOOR_BEFORE_WAR`), falls after Gornji Vakuf (t41, HRHB `escalate`) to 0.05, and the war starts at **t49** (`croat_bosniak_war_begins_1993`, `war_started_turn` 49). At t54 the alliance is −0.57. So this consequence never started the war in a left-alone game.
- **Rulings** (historian + game designer).
  - Gate the consequence like `ahmici_massacre_1993`: `requires_events: [croat_bosniak_war_begins_1993]` and `alliance_below 0.2`. 0.2 is `ALLIED_THRESHOLD`, matching the card's "already broken in practice"; 0.3 is still a fragile alliance.
  - Keep the turn window, the `croat_republic` flag and the mutex (now logically exclusive). Content and wording are unchanged.
  - Historian: the 1993 offensive was not mainly a reaction to Sarajevo. Prlić IT-04-74-T found a JCE for a Croat entity with Zagreb's participation (the 15 January 1993 ultimatum on Vance-Owen provinces 3, 8 and 10; Gornji Vakuf attacked 18 January; Vol. 2 paras 336-355). Kordić IT-95-14/2: Lašva was planned. Sarajevo's real concessions did not avert it.
- **Proof** (main `71ffa0cb8`; logs `C:/Pyrrhic/AWWV-worktrees/_logs/b5-scorer-20261116/ah_*`, `ally_*_DIAGNOSTIC.jsonl`).
  - Historical 188w byte-identical: `03159b9ee1e5877f` (main's pin).
  - Hands-off emergent identical to main: `dde641b2c74838f0`.
  - `tests/consequence_chains.test.ts`: two new cases (does not fire while the alliance holds; does not fire before the 1993 war). The firing cases now set the war and a broken alliance. Consequence, event, card and codex slices: 15 files, 280 tests pass. tsc clean.
- **Not enough on its own.** Every alliance-breaker after t40 is answered by HRHB, so an RBiH President still has no lever. The orchestrator ruled on 2026-11-16 to build the RBiH lever (capitulation on the substance: ARBiH units under HVO command in provinces 3, 8 and 10, then the union of three republics, at its real price) as a content PR after A2b, with historian, narrative, game-designer and §6 seats.
- **Calibration-pass list (registered, not changed here).**
  - `csq_alliance_holds_past_w35` fires at t35 in every run, because the 0.40 floor makes `alliance_above 0.2` trivially true. Its 0.1 floor lock is doing history work, delaying the war to t49. Retiming it moves the hash.
  - Five consequences check `rbih_hrhb_war_active`, which nothing sets: a dead guard.
