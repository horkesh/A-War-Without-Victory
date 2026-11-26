## 2026-11-26 — WASH-IMPOSED: Zagreb's acknowledged order imposes the RBiH-HRHB ceasefire

Authority: orchestrator ruling §29 (2026-11-26, coordination c772d4d), after the WASH-TIMING trace (§28 case (b)) with the historian and game-designer seats. A pre-freeze engine item that blocks #883 (P2.4).

**Change.**
- `bilateral_ceasefire.ts` C4 now reads: `stalemate_turns >= CEASEFIRE_STALEMATE_MIN` **or** HRHB's last answer to `zagreb_orders_hrhb_ceasefire` is `acknowledge_pressure`. C1-C3, C5 and C6 are unchanged and still bind. A new report field `c4_imposed` records the imposed path.
- Why: the old C4 was circular. The bot keeps an ARBiH corps on the bilateral offensive until a ceasefire exists, and C4 waited for that offensive to fail for four weeks. Main reached it on time only because probe churn pinned every ARBiH corps above exhaustion 30. Historically the 23 February 1994 ceasefire was imposed from outside on a stalled front (BB2 pp.450-451).
- Agency: HRHB can refuse Zagreb (`resist_patron`). The ceasefire then waits for a real stalemate.
- `lastEventResponse` and the Zagreb constants now live in `bilateral_ceasefire.ts`; `washington_agreement.ts` imports them (the same logic, de-duplicated).
- Tests: `tests/alliance_lifecycle.test.ts` "imposed C4": acknowledge fires; resist keeps the stalemate-only path; the last answer wins; C1-C3, C5 and C6 still bind.
