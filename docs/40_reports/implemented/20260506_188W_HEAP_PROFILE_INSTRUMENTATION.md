# 188w Heap Profile Instrumentation — VERDICT-REPORT-ONLY (REVERTED)

**Lane:** LANE-NIGHTSHIFT-188W-HEAP-PROFILE-RETRY
**Date:** 2026-05-06
**Status:** **VERDICT-REPORT-ONLY (REVERTED)** — agent runtime cut off mid-188w-validation; no commit landed; orphan impl + test deleted as dead code.

---

## Outcome

Lane intended to instrument 188w memory accumulation per Perf Phase 0 panel (`6f378afd`) recommendation. First attempt (`a12c0d39952b6b942`) cut off at 31s; retry (`a1dc7a60d0a457e21`) reached 40w determinism gate (PASSED byte-identity to predecessor n1692 `073f15c25768dfa0`) and STARTED a profiled 188w run, but the agent's runtime cut off mid-188w (last words: "Now running the 188w profiled run (~20-30 min)").

When parent assessed state after agent timeout:
- `src/sim/heap_profile.ts` (impl) was authored on disk.
- `tests/heap_profile_188w.test.ts` was authored on disk.
- `src/sim/turn_pipeline.ts` per-turn-end hook integration **was NOT visible** in working tree (either never authored or reverted).
- `data/derived/_debug/heap_profile_188w.jsonl` **was not produced** (188w run did not reach completion or the hook was never wired to fire).

Without source-modification integration in `turn_pipeline.ts`, the standalone `heap_profile.ts` module is dead code (no consumers). Test would fail because the hook isn't wired.

## Action

Parent deleted both orphan files (`src/sim/heap_profile.ts` + `tests/heap_profile_188w.test.ts`) as dead code in this closeout commit. Lane is REVERTED.

## Successor recommendation

If 188w heap-profile instrumentation is wanted in a future lane:
1. Re-dispatch with explicit "DRIVE TO COMPLETION" + "agent must verify integration is in working tree before claiming done" + "agent must pass `git show --stat` of expected files including `turn_pipeline.ts` modification."
2. Parent runs the 188w profiled run separately (Bash background) instead of trusting the agent to complete a 20-30 min subprocess (agent runtimes have been cutting off long subprocesses repeatedly in this trip session).
3. After the run, parent commits the artifacts on the agent's behalf with pathspec form.

## Sensitive-history compliance

Ring 1 (instrumentation only; no engine behavior change). Verdict-report-only ship is faction-agnostic + determinism-preserving by construction.

## Cross-references

- Perf Phase 0 panel: `docs/40_reports/audits/20260506_V093_PERF_PHASE_0_PANEL.md` (commit `6f378afd`).
- Sister instrumentation lane (sector-partition) shipped clean at `ce72fc40` despite same agent-runtime-cutoff pattern (parent recovered via pathspec commit).
- Sister instrumentation lane (bot-orders) ALSO REVERTED — see `20260506_BOT_ORDERS_INTERNALS_INSTRUMENTATION.md` for the multi-agent index-race incident details.
