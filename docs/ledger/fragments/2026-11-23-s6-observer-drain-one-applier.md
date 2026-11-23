## 2026-11-23 — §6: the Observer drain applies a drained answer in full (one applier for every decision path; hash-neutral headless)

Under the owner rule of 2026-11-22 (staff or the bot playing a human faction applies the headless historical default; shared answers, §6 round 4s, answer 2: "At Observer the automatic answer applies the historical default (at fire time, or by the pending drain)").

**Defect.** The Observer pending-decision drain (`evaluateEvents`, "OBSERVER SWEEP") applied a drained answer's effects, flags, shifts and log row, but not its response-level runtime causality (`enables_events_runtime`, `closes_events_runtime`) or its `notifications_to_other_factions`. The in-person path and the fire-time bot/Observer branch applied both. Measured on a 2-turn live RS probe: `rs_strategic_goals` drained at Observer enabled 0 of its 12 follow-ups (in person: 12 enabled, the Drina close, 13 causality rows). Not reachable in the product today: a pending required card hard-blocks Advance at every autonomy level, so only harnesses that raise autonomy mid-run reach the drain.

**Change.**
- One applier, `applyChosenEventResponse` (`src/sim/events/evaluate_events.ts`): effects, flags, dimension shifts, the decision-log row (unless already filed), runtime causality, then notifications, in the order every path already used. All four entry points use it: the in-person answer (`resolve_decision_core.ts`), the answer filed ahead of firing, the fire-time bot/Observer answer and the drain.
- The drain still chooses its answer before anything is applied (F1-B read before write).
- `applyAIDefaultResponse` keeps no engine caller (kept for tests; marked not an engine path).

**Tests.** New `tests/s6_observer_drain_causality.test.ts` (9; 7 failed before the fix). `tests/paramilitary_observer_in_person_order_f1b.test.ts`: 6 drain cases asserted "the drain sends no notifications" (the defect); they now expect the authored notifications, as at fire time.

**Measured.** Headless is unchanged: neither the drain nor the Observer branch runs without `autonomy_level`/`player_faction`. 40w structural fingerprint `8f132d17cbb0f47c` matches main. 188w final_state_hash historical `9a2570d2e1c0f4d4`, emergent `4adaa322f8faa0a7`, both identical to main 2ce56f47d (first measured identical on 9bb9a5316 as well). No re-pin.
