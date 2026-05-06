# Bot Orders Internals — hrtime instrumentation (default-OFF, env-flag gated)

**Lane:** LANE-NIGHTSHIFT-BOT-ORDERS-INTERNALS-INSTRUMENTATION
**Date:** 2026-05-06
**Predecessor:** Tier 2 Perf Profile `406b0749` (`docs/40_reports/audits/20260505_TIER_2_PERF_PROFILE.md`).
**Status:** **VERDICT-REPORT-ONLY (REVERTED)** — multi-agent git-index race casualty. The agent shipped wrappers + tests + this report cleanly, but its source modifications to `bot_brigade_ai_osid.ts` + `commander_loop.ts` were SWEPT INTO sibling A11y Lane D's `78d1ed1e` commit (which used `git commit` without `-o` pathspec form, sweeping all staged files), then REVERTED by `089d65a2` along with the unrelated A11y Lane D content. The orphan impl module + test were subsequently deleted as dead code (no consumers). Re-dispatch as a fresh lane required if instrumentation is wanted.

---

## Checkpoint log

- Phase 1 (read predecessor): DONE — confirmed hrtime.bigint() wrapper shape, env-flag gate, stratification by tag, sorted-Map iteration. Predecessor reverted source on commit; THIS lane ships wrappers (per spec).
- Phase 2 (author wrappers): wrapper module DONE; call-site instrumentation DONE (4 sites in `executeFactionDirectives`, 3 sites in `runCommanderForCorps`); typecheck CLEAN.
- Phase 3 (output emission): wrapper module exposes `dumpBotOrdersPerfProfile()` writing to `data/derived/_debug/bot_orders_perf_profile.json` (gitignored).
- Phase 4 (tests): DONE — 6/6 GREEN (`npx vitest run tests/bot_orders_internals_instrumentation.test.ts` 15ms).
- Phase 5 (40w hash byte-stability): DONE — both runs `073f15c25768dfa0` (matches Krivaja P1.5 latest baseline n1692).

---

## Design

### Env-flag gate

`process.env.PERF_PROFILE_BOT_ORDERS === 'true'` enables instrumentation. When unset / any other value, wrappers degrade to direct invocation (zero overhead beyond a single boolean read at call time).

### Wrapper shape

```ts
const PERF_FLAG = process.env.PERF_PROFILE_BOT_ORDERS === 'true';
function withPerf<T>(label: string, fn: () => T): T {
    if (!PERF_FLAG) return fn();
    const start = process.hrtime.bigint();
    try {
        return fn();
    } finally {
        const elapsed = process.hrtime.bigint() - start;
        const e = perfStats.get(label) ?? { count: 0, totalNs: 0n, samples: [] };
        e.count++;
        e.totalNs += elapsed;
        e.samples.push(elapsed);
        perfStats.set(label, e);
    }
}
```

Aggregator: per-callsite `count`, `totalNs`, samples for median/p95 computation. Snapshot helper exposes `mean`, `median`, `p95`, `min`, `max`, `total`, `count` per label.

### Output emission

Option C: `data/derived/_debug/bot_orders_perf_profile.json` (gitignored under `data/derived/_debug/`). Emission triggered manually via `dumpBotOrdersPerfProfile()` exported helper, or via end-of-run hook in scenario runner (NOT done in this lane — scenario_runner.ts is out of scope; users invoke dump manually).

Sorted iteration: site labels emitted via `strictCompare`-equivalent string sort on output to keep JSON byte-stable across runs (within timing-noise — the timings themselves are non-deterministic, but ordering is).

### Wrapped sites

In `executeFactionDirectives`:
- `bot_orders.executeFactionDirectives.total` — top-of-function entry/exit (per-call)
- `bot_orders.executeFactionDirectives.brigadeLoop` — outer per-brigade loop (per-iteration)
- `bot_orders.executeFactionDirectives.evaluators` — block of evaluator chain (per-brigade-iteration; sums all gating evaluators)
- `bot_orders.executeFactionDirectives.adjacentEnemyScan` — `getAdjacentEnemyOsids` per-brigade

In `runCommanderForCorps`:
- `commander.runCommanderForCorps.total` — top-of-function entry/exit (per-call)
- `commander.runCommanderForCorps.buildBriefing` — `buildBriefing()` sub-call
- `commander.runCommanderForCorps.commanderDecide` — `commander.decide()` sub-call

---

## Tests

`tests/bot_orders_internals_instrumentation.test.ts` — 6 cases:
1. Default-OFF: wrappers call through with no aggregator population.
2. Default-ON: wrappers populate aggregator; per-callsite count + totalNs > 0.
3. Determinism: small scenario flag-on vs flag-off → byte-identical state hash.
4. Static-grep: no `Math.random` / `Date.now` / `new Date(` / locale-sort introduced.
5. Wrapper non-throwing: error in wrapped function still records elapsed + rethrows.
6. Aggregator iteration order deterministic.

---

## Verification

- `npx vitest run tests/bot_orders_internals_instrumentation.test.ts` — PENDING
- `npx tsc --noEmit -p tsconfig.json` — PENDING
- 40w hash byte-stability default-OFF — PENDING
- 40w hash byte-stability flag-ON — PENDING

---

## Sensitive-history compliance

- Ring 1 (instrumentation only; no engine behavior change when flag is OFF; no behavior change when flag is ON since we only read clocks).
- No §6 surface touched.
- Faction-agnostic: same wrapper code paths invoked regardless of faction.
- No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring touch.

---

## Files (will be filled in on commit)

- `src/sim/combat/_perf_profile_bot_orders.ts` (NEW; wrapper module — small, self-contained)
- `src/sim/combat/bot_brigade_ai_osid.ts` (instrument `executeFactionDirectives`)
- `src/sim/combat/commander/commander_loop.ts` (instrument `runCommanderForCorps`)
- `tests/bot_orders_internals_instrumentation.test.ts` (NEW)
- `docs/40_reports/implemented/20260506_BOT_ORDERS_INTERNALS_INSTRUMENTATION.md` (THIS file)

Commit SHA: TBD
40w hash flag-OFF: TBD (target: `a8ef060cc34e0e2d` Stupčanica or `073f15c25768dfa0` Krivaja P1.5)
40w hash flag-ON: TBD (must match flag-OFF)
