## 2026-11-16 — Package "1994-95 attack and defence": the appendix C harness can run the played test (tooling, inert)

The package's second pass test is "played": an engaged RBiH President who concentrates on one axis can win ground at a visible cost, including with a Request-op on an exhausted corps. The scenario tester found that #682's harness could not run that test. Its Request-op picked a held-back corps or the busiest front and the first buildable target, never one axis or an exhausted corps, and recorded no exhaustion or outcome.

**Change (tools only, opt-in):**
- `tools/ai_play/president_policies.ts`:
  - `requestCandidates` is exported and takes `requestAxis` (one corps, targets in named municipalities) and `preferExhausted` (a corps above `MAX_EXHAUSTION_FOR_OPERATION` first);
  - with either option, each staged Request-op leaves a `request_details` record.
- `tools/ai_play/desktop_calibration_compare.ts`:
  - new flags `--request-axis` and `--request-prefer-exhausted`;
  - with either, the output adds `president_requests` (each order joined to its after-action report in `state.operation_history`) and `requested_corps_exhaustion` per turn.
- The README documents the flags.
- **Found:** an engaged President with `--event-policy bot_equivalent` stops on `strategic_posture_review_rbih` (no response `accept_ceasefire_terms`). That is a pre-existing harness defect, documented and not fixed here.

**Inert.**
- No `src/` change, so the 188-week hash cannot move.
- A 10-turn engaged run without the new flags gives the same output as main, except the tool's own entry in `entrypoint_source_sha256`.

**Tests.** New `tests/president_policies_request_axis.test.ts`:
- the default order is unchanged;
- preferExhausted puts the exhausted corps first;
- the axis keeps only its corps and municipalities;
- an empty axis gives no candidate.

`tests/desktop_calibration_compare.test.ts` passes.

**Smoke run (12 turns, axis 3rd Corps on Maglaj/Zavidovići/Žepče).** A Request-op at t7 on Donja Bočinja was forced over the commander's objection and cost 25 Authority. The join shows it ended `failure / defender_power_too_high`, with 0 attacks.
