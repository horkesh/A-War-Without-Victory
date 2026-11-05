# N94 turn-16 resume power-seam diagnostic contract

Date: 2026-10-25

This is an addendum to `RESULT-v2.md`; it does not modify that report or `RESULT.md`. The earlier actual-only two-turn proposal is retired because actual positive contributors are already proven and replaying them would not identify the unresolved n94 predicate.

## Frozen question

Can the current production `runScenario` path faithfully resume the immutable n94 `save_w16.json`, reproduce n94 turns 17 through 39 exactly, and expose the turn-18 Tosici militia-fallback power operands while preserving the genuine scenario boundary in which the prior turn's sector projection is empty?

The result may be interpreted only if both conditions pass:

1. emitted `save_w39.json` is byte-for-byte exact to retained n94 `save_w39.json` (5,105,717 bytes; SHA-256 `e51224ac22a839d4c1af35a0ea828afb79b62f0ed56559c3b47dcda45578eec5`);
2. all 23 weekly rows for weeks 17 through 39 are exact after removing only these opt-in nested battle fields from both sides:
   - `/battles/*/attacker_brigades`
   - `/battles/*/defender_contributions`
   - `/battles/*/power_breakdown`

There is no state stripping. `battle_power` adds `power_breakdown` only to the transient battle report, and `battle_stack` affects the weekly projection. Any other difference fails closed. A failed or timed-out attempt retains its run directory, child logs, run artifacts, and terminal receipt and must not be retried unchanged.

## Production path and boundary seam

The child calls the existing `runScenario` resume API with `resumeFromSavePath`, `resumeFromWeekIndex=16`, `weeksOverride=39`, the original `harness-seed`, headless harness, scenario smart bots, medium difficulty, and collapse disabled. It does not reimplement the turn pipeline. The repository's `tools/diagnostics/run_preserved_preflight.cjs` owns the process boundary, exact command receipt, entry-script snapshot, stdout/stderr capture, timeout, and terminal receipt.

The retained n94 turn-16 boundary has zero `corps_front_sectors` and zero `war_front_edges_osid`. This is a genuine scenario-runner boundary: `repairScenarioArtifactState` runs after each scenario turn and rewrites those derived fields before the next turn. Within `runTurn`, OSID movement reads the prior boundary first; live front edges and sectors are then rebuilt before attack resolution. Desktop `advanceTurn` returns the production `nextState` directly and does not apply the scenario artifact repair, so the next desktop movement phase can receive populated prior-turn sectors. The probe preserves n94's empty boundary and records the subsequent turn-18 resolver diagnostics; it does not infer missing transient state from a later save.

The original n94 consumed-input inventory differs from the current tree in exactly one file: `data/derived/operational/operational_settlements.geojson`. The child creates a private ignored input root, copies every currently exact consumed input, and obtains that one historical file from the bound n94 Git object (`a913286803a095b6dc3f57a44175081d6ae4b8eb`). Its blob hash is the n94 value `c03cc9ce4286b779139ce460e5f515d67415fe633e4ed2dbda1764b9440338c8`. The current worktree file is neither modified nor replaced. Current runtime source remains bound to `bff97de7af9406dc2cb907674e2463fccb43052a` and the exact source-file hashes embedded in the child.

## Reviewed command

Run once only after independent review and root GO:

```powershell
node tools/diagnostics/run_preserved_preflight.cjs `
  --attempt-dir tmp/player-bot-capability-parity-20261024/native703-capability-diagnosis/n94-resume-power-seam-wrapper-01 `
  --entry-script tmp/player-bot-capability-parity-20261024/native703-capability-diagnosis/replay-n94-power-seam.mts `
  --timeout-ms 120000 `
  --allow-artifact launch.json `
  --allow-artifact result.json `
  -- node --import tsx tmp/player-bot-capability-parity-20261024/native703-capability-diagnosis/replay-n94-power-seam.mts `
    --evidence-dir '{evidenceDir}' `
    --run-dir tmp/player-bot-capability-parity-20261024/native703-capability-diagnosis/n94-resume-power-seam-run-01
```

Both `n94-resume-power-seam-wrapper-01` and `n94-resume-power-seam-run-01` must not exist. The preserved wrapper launches exactly one child, enforces the 120-second hard cap, snapshots the entry script, captures stdout/stderr, and writes its terminal receipt. The child writes only `launch.json` and `result.json` in the wrapper evidence directory; its private input root and all scenario outputs remain in the separate inner run directory. The child sets `AWWV_DEBUG_REASON_CODES=battle_stack,battle_power` and removes `ENABLE_COLLAPSE` and `AWWV_S6_GRADE_RUN` immediately before `runScenario`. Expected cost is 23 resumed headless turns and less than 60 seconds. There is no retry.

Static preflight, already run without advancing the engine:

```powershell
pnpm exec tsx tmp/player-bot-capability-parity-20261024/native703-capability-diagnosis/replay-n94-power-seam.mts --contract-check
```

Expected output includes `contract_ok:true`, `turn:16`, `seed:"harness-seed"`, and zero sector/front-edge counts.

## Limits

This is a resumed headless production-path diagnostic. It is not native qualification, it does not replay the actual-player branch, and it does not prove that the scenario/desktop boundary seam alone is sufficient. If fidelity fails, the diagnostic establishes only that the current runtime cannot reproduce the retained n94 suffix under the bound inputs; the Tosici power payload must not be used for causal attribution.
