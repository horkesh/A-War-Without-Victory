## 2026-11-26 — WASH-IMPOSED: Zagreb's acknowledged order imposes the RBiH-HRHB ceasefire

Authority: orchestrator ruling §29 (2026-11-26, coordination c772d4d), after the WASH-TIMING trace (§28 case (b)) with the historian and game-designer seats. A pre-freeze engine item that blocks #883 (P2.4).

**Change.**
- `bilateral_ceasefire.ts` C4 now reads: `stalemate_turns >= CEASEFIRE_STALEMATE_MIN` **or** HRHB's last answer to `zagreb_orders_hrhb_ceasefire` is `acknowledge_pressure`. C1-C3, C5 and C6 are unchanged and still bind. A new report field `c4_imposed` records the imposed path.
- Why: the old C4 was circular. The bot keeps an ARBiH corps on the bilateral offensive until a ceasefire exists, and C4 waited for that offensive to fail for four weeks. Main reached it on time only because probe churn pinned every ARBiH corps above exhaustion 30. Historically, outside pressure on Zagreb brought the 23 February 1994 ceasefire on a stalled front (BB2 p.450).
- Agency: HRHB can refuse Zagreb (`resist_patron`). The ceasefire then waits for a real stalemate.
- `lastEventResponse` and the Zagreb constants now live in `bilateral_ceasefire.ts`; `washington_agreement.ts` imports them (the same logic, de-duplicated).
- Tests: `tests/alliance_lifecycle.test.ts` "imposed C4": acknowledge fires; resist keeps the stalemate-only path; the last answer wins; C1-C3, C5 and C6 still bind.
- Canon: Systems Manual System 10, implementation-note "imposed bilateral ceasefire". No Engine Invariants, Phase/War Spec or Rulebook text states C1-C6. The old Phase I §4.8 citation in the code headers was dead and is corrected.
- Comments only: the `WASHINGTON_AGREEMENT_WEEK` comment and the System 10 Path A' note now date the turns from t0 = 6 April 1992. t102 is about 21 March 1994; the framework (1 March) is about t99 and the signing (18 March) about t101. The constant stays 102.

**Measured.**
- The 188w pair on main e797a09a4 plus this change is **hash-neutral**: hist `0a0990fb803a5fb4`, emer `ca06834c3c61a6a7`, equal to main. Ceasefire t94 and Washington t98 in both modes. On main, C4 is met by the stalemate at t94, before HRHB acknowledges Zagreb at t95, so the imposed path does not change the outcome.
- `run_baseline_regression`'s historical guard (`assertHistoricalWashingtonBeforeQuietFrontWindow`): PASS in hist and emer.
- Live hands-off parity, HRHB as player, to t96 (`desktop_calibration_compare`, event policy `defer`, decision mode historical): at autonomy 0, 1, 2, 3 and production (2), the player save answers `zagreb_orders_hrhb_ceasefire` with `acknowledge_pressure` at t95, as headless does. Control differs from headless on 0 turns, and the final control is HRHB 71 / RBiH 261 / RS 380 in both.
