## 2026-11-16 — Played-test harness: Request-op outcomes bound per attempt; several corps on one axis, a weekly cadence (tooling only)

Package "1994-95 attack and defence". Fixes the two Codex review findings (P2) on #706 and adds a stronger played lever. Tooling only: no `src/` change, so the simulation hash is unchanged.

**Codex fixes (`tools/ai_play/president_policies.ts`, used by `desktop_calibration_compare.ts`):**
1. **Each Request-op's outcome is bound to its own attempt, right after the week that consumed it.**
   - The old join took any later after-action report with the same operation name. A refused order could therefore show as a completed operation.
   - The old join also read only the corps' last `op_directive_rejection`.
   - Now a rejection counts only when it names the order's target and was written that week. An operation counts only when it has the order's name and corps and started that week.
2. **`objectives_captured` is the AAR's canonical `objectives_captured`.** That field carries engagement receipts and replayed losses. Before, the harness reported `objectives_logged_captured`.

**Played lever (opt-in):**
- `--request-axis <corps>[+<corps>...]:<mun>,...`: several corps on one axis, one Request-op per corps per request week.
- `--request-every <weeks>`: the Request-op cadence, where 1 is a sustained weekly push.
- Every order is still paid in Command Authority.
- Why: four harness Presidents in Batch B moved the war at most 0.75 pp of territory off history. The played test needs a lever strong enough to show the outcome can differ.

**Tests.** `tests/president_policies_request_axis.test.ts`:
- several-corps candidates;
- a rejected order stays rejected when a later same-target order completes;
- a stale rejection does not bind to a later order;
- an order is not credited with a same-name operation from another week;
- the canonical objectives field.

22/22 pass; tsc 0.
