# Batch 38 — Scenario Runner Redundant Week-39 Final-Save Cleanup (Byte-Identical)

**Date:** 2026-05-18
**Baseline:** 40w `b14179d65639860c`
**Status:** Edits applied; typecheck PASS; serialization contract test 7/7 PASS; baseline regression all-match; 40w byte-identity proof n1914 hash `b14179d65639860c` (matches baseline); consistency validator PASS.

## Goal

Close the smaller byte-identical win identified in the Batch 33 attribution report (`docs/40_reports/implemented/20260518_BATCH33_SERIALIZATION_ATTRIBUTION.md`, "Smaller Byte-Identical Win — Candidate For Next Session"): the in-loop week-39 `serializeState(state)` + hash block plus the post-loop `if (!final_state_hash)` fallback are both structurally redundant with the unconditional post-reconciliation block.

## Change

`src/scenario/scenario_runner.ts`:

**Removed block 1** (was lines 2415-2422 — in-loop week-39 final-save serialize/hash):
```ts
if (week_index === weeks - 1) {
    const serialized = _serTimeSync(.., 'final-save-serialize', () => serializeState(state));
    final_state_hash = _serTimeSync(.., 'final-save-hash', () => createHash('sha256').update(serialized, 'utf8').digest('hex').slice(0, 16));
}
```

**Removed block 2** (was lines 2454-2461 — post-loop fallback):
```ts
if (!final_state_hash) {
    final_state_hash = _serTimeSync(.., 'final-save-hash', () =>
        createHash('sha256').update(serializeState(state), 'utf8').digest('hex').slice(0, 16)
    );
}
```

**Replay line type change** (was line 2424 — `state_hash?: string` field removed; was line 2428 — `if (final_state_hash) replayLine.state_hash = final_state_hash;` removed):
```ts
// Before:
const replayLine: { week_index: number; actions: ScenarioAction[]; state_hash?: string } = { week_index, actions };
if (final_state_hash) replayLine.state_hash = final_state_hash;
// After:
const replayLine: { week_index: number; actions: ScenarioAction[] } = { week_index, actions };
```

In both removal sites, transitional comments were added explaining the removal rationale (pre-reconciliation hash overwritten by post-loop block; zero consumers of the replay-line state_hash field).

## Why Byte-Identical

The unconditional final-save block at line ~2503 always ran:

```ts
const finalSerialized = _serTimeSync(.., 'final-save-serialize', () => serializeState(state));
final_state_hash = _serTimeSync(.., 'final-save-hash', () =>
    createHash('sha256').update(finalSerialized, 'utf8').digest('hex').slice(0, 16)
);
await _serTimeAsync(.., 'final-save-write', async () => {
    await ensureRunOutputDir(outDir);
    await writeFile(finalSavePath, finalSerialized, 'utf8');
});
```

This block:
1. Always re-serializes the post-reconciliation state.
2. Unconditionally overwrites `final_state_hash` with the canonical post-reconciliation hash.
3. Writes `final_save.json` from the just-serialized bytes.

For war-phase scenarios (the canonical 40w), the post-loop `reconcileFinalSectorTruth(state, ...)` block at lines 2486-2502 mutates state BEFORE this final block. So the in-loop block 1 wrote a pre-reconciliation hash that the canonical block overwrote with a post-reconciliation hash. Block 2 (`if (!final_state_hash)`) similarly produced a pre-reconciliation hash overwritten by the canonical block. Both writes were dead-on-arrival: they never reached `final_save.json`, `run_summary.json`, or any other artifact.

The one place block 1's value reached was `replay.jsonl`'s per-week `state_hash` field (only emitted when `emitWeeklySavesForVideo`). That field had **zero consumers** across `src/`, `tests/`, and `tools/` — verified by exhaustive grep. Batch 33's report had already classified this field as "almost certainly wrong" because it attached the pre-reconciliation hash to the actions JSONL while the canonical `final_save.json` carried the post-reconciliation hash.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (clean) |
| `vitest run tests/serialization_attribution_contract.test.ts` | 7/7 PASS |
| ↪ static contract: in-loop week-39 final-save block removed | PASS |
| ↪ static contract: post-loop `if (!final_state_hash)` fallback removed | PASS |
| ↪ static contract: exactly one `final-save-serialize` and one `final-save-hash` call site | PASS |
| ↪ static contract: replay line type no longer carries `state_hash` | PASS |
| `npm run test:baselines` | PASS — "Baseline regression: all scenarios match." |
| 40w byte-identity (n1914, default) vs `b14179d65639860c` | PASS — hash matches |
| `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1914` | PASS |
| ↪ 0 false owners / 0 disconnected sectors / 0 empty contested / 0 below-floor missed legal donors | PASS |
| Scenario-creator-runner-tester verdict | GO |

## Files Changed

| File | Change |
|---|---|
| `src/scenario/scenario_runner.ts` | Removed in-loop week-39 final-save block (8 lines); removed post-loop `if (!final_state_hash)` fallback (7 lines); removed `state_hash?: string` field and its conditional assignment from the replay actions JSONL line (1 type field + 1 statement). Added two transitional comments explaining the removals. |
| `tests/serialization_attribution_contract.test.ts` | Added 4 new static-grep contract tests pinning the cleanup: in-loop block removed; fallback removed; exactly 1 `final-save-serialize` + 1 `final-save-hash` call site; replay line type no longer carries `state_hash`. |
| `docs/40_reports/implemented/20260518_BATCH38_SERIALIZATION_WEEK39_CLEANUP.md` | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, GAME_STATE_RATING_MASTER, lane-bank queue).

## Expected Perf Effect (Inference — not formally re-instrumented)

Batch 33 attribution (n1911, `PERF_PROFILE_SERIALIZATION=true`) showed:
- `final-save-serialize`: 227.6 ms / 2 calls / 113.8 ms/call
- `final-save-hash`: 53.6 ms / 2 calls (would have been 3 with fallback firing) / 26.8 ms/call

After Batch 38, both labels have exactly 1 call site (the post-reconciliation block). The eliminated `final-save-serialize` call (≈113.8 ms) plus the eliminated `final-save-hash` call (≈26.8 ms) saves ≈140 ms per 40w run on the in-loop redundant work. Re-instrumented attribution in a follow-up batch would confirm; this batch is intentionally measurement-light because the 40w hash already proves no behavioral drift.

## Why This Matters

Batch 33's audit explicitly identified the redundant in-loop serialize/hash + fallback as the smaller byte-identical win waiting to be picked off, after concluding that the bigger lever (blanket `replay_sequence.jsonl` per-turn full-state downgrade) was consumer-blocked by four hard requirements (ReplayScrubber tactical-map inspect, calibration weekly-save extractor, fatigue audit, 40w smoke-test). Batch 38 executes the smaller win cleanly: removes 1 serializeState + 1 SHA-256 per scenario run, drops a documented "almost certainly wrong" pre-reconciliation hash from `replay.jsonl`, and centralizes `final_state_hash` ownership on the unconditional post-reconciliation block.

## Carried Forward

The blanket `replay_sequence.jsonl` per-turn full-state downgrade remains BLOCKED on user-direction (multi-batch refactor with regression-test reshape). The `buildReplayFrameRow` → `serializeState` per-turn hidden cost (≈5-7 s of un-attributed cost per Batch 33's headline finding) remains the next attribution target if perf work continues; that's a label-only attribution batch (wrap `buildReplayFrameRow` inside the `replay-sequence-write` label) with trivial scope.
