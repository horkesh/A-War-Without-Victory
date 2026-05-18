# Batch 33 — Serialization Attribution + Replay-Frame Consumer Audit

**Date:** 2026-05-18
**Baseline:** 40w `b14179d65639860c`
**Type:** Attribution scaffolding (sidecar-only) + consumer audit; no behavior change.

## Summary

Added 6 sub-labels inside the `serialization_artifacts` timing bucket of `src/scenario/scenario_runner.ts`, gated by `PERF_PROFILE_SERIALIZATION=true`. The label is independent of the `--timing-json` flag so the default 40w npm script can profile. n1911 (flag-on) confirms byte-identity at `b14179d65639860c`.

Consumer audit on `replay_sequence.jsonl` / `replay_save_sequence.json` found that blanket per-turn replay-frame downgrade is **NO-GO** — four full-state consumers hard-require the canonical per-turn `serializeState(state)` payload. A smaller byte-identical win is identified for the next session.

## Spike Evidence (n1911, `PERF_PROFILE_SERIALIZATION=true`, no `--timing-json`)

| Label | ms | calls | ms/call |
|---|---:|---:|---:|
| `replay-sequence-write` | 2502.3 | 40 | 62.6 |
| `final-save-serialize` | 227.6 | 2 | 113.8 |
| `final-save-write` | 145.9 | 1 | 145.9 |
| `brigade-temporal-write` | 105.1 | 40 | 2.6 |
| `final-save-hash` | 53.6 | 2 | 26.8 |
| `weekly-report-write` | 11.7 | 40 | 0.3 |
| **labeled total** | **3046.3** | — | — |

Hash: `b14179d65639860c` matches baseline → spike instrumentation is sim-neutral.

## Headline finding — `replay-sequence-write` Is The Tip Of A Larger Iceberg

The labeled cost (2502 ms / 40 = 62.5 ms/call) wraps only the `replaySequenceStream.write(JSON.stringify(replayFrameRow) + '\n')` line. The heavy `serializeState(state)` call that produces `replayFrameRow.state` runs **immediately before** the label, inside `buildReplayFrameRow` (`src/scenario/replay_save_emit.ts:114-121`). That call uses the same canonical full-state writer as `final_save.json`. So every 40w run executes:

- 40× full-state serializations from `buildReplayFrameRow` (per-turn replay frame) — currently un-labeled
- 1× full-state serialization in the in-loop `week_index === weeks - 1` block (lines 2408-2415)
- 1× full-state serialization in the post-loop final-save block (lines 2496-2497)

= **42 full-state serializations per 40w run**. The Batch-6 truth report measured the entire `serialization_artifacts` bucket at 10,581 ms on n1881; subtracting our labeled 3,046 ms leaves ~7-8 s of un-attributed cost, the majority of which is the hidden `serializeState` in `buildReplayFrameRow`.

## Consumer Audit — Replay-Frame Downgrade Verdict: NO-GO For Blanket Change

`buildReplayFrameSummary` (`src/sim/replay/replay_frame_summary.ts:89-110`) exists as a projection alternative. The natural optimization would be to swap per-turn full-state for summary projection. Audit of consumers found **four hard requirements** for full per-turn state:

| Consumer | Path | Why full state is required |
|---|---|---|
| ReplayScrubber → "Inspect Map" → tactical map | `src/ui/map/components/replay/ReplayScrubber.tsx:27,164-173` → `src/ui/map/store/gameStore.ts:251,532-576` → `parseGameState` | Pipes the selected frame through `parseGameState` to drive formations, sectors, control, supply, fronts, displacement event log. Canonical UX documented in `docs/20_engineering/GUI_PLAYBOOK_DESKTOP.md:12,23,40`. |
| Calibration tooling | `tools/extract_weekly_save_from_replay.cjs:59-117` | Synthesizes `final_save.json` at arbitrary weeks from `replay_sequence.jsonl`, fed to `compare_painted_vs_sim.cjs`. |
| Fatigue audit | `tools/diagnostics/fatigue_distribution_audit.cjs:60-90,235-294` | Reads deep `military.formations[].ops.fatigue`, `brigade_history.engagements`, `corps_command[].active_operations`, `corps_front_sectors[].assigned_brigade_ids` per week. |
| Smoke test (pinned 40w hash) | `tests/supply_sensitive_history_smoke.test.ts:33-62` | Reads `political.last_supply_state_by_osid` and `political.political_controllers` from per-turn frames at weeks 10/20/30/40 against retained 40w artifact with pinned `final_state_hash`. |
| Test contract | `tests/replay_save_emit.test.ts:71-352` (T1/T2/T4/T6/T7) | Asserts `JSON.parse(row.state).meta.turn` and full GameState[] re-parse byte-identity. |

Consumers that ARE summary-tolerant (already use the sparse manifest path): `ReplayScrubber` summary cards (line 128-141, 247-271), `VerdictScreen` replay gating (line 354-355, 519-525), `replaySummaryPlayer`, `replayPlayer` (metadata-only).

The codebase has already implemented the hybrid pattern (sparse `replay_save_manifest.json` for UI; full `replay_save_sequence.json` for tools/tests). Downgrading the full sequence to summary breaks the four full-state consumers above. **Recommendation: keep current default behavior; future session may add an opt-out flag for fast runs that skip full-state emission, but that's a multi-batch refactor with regression-test migration.**

## Smaller Byte-Identical Win — Candidate For Next Session

The in-loop block at `scenario_runner.ts:2408-2415` is structurally redundant:

```ts
if (week_index === weeks - 1) {
    const serialized = _serTimeSync(.., 'final-save-serialize', () => serializeState(state));
    final_state_hash = _serTimeSync(.., 'final-save-hash', () => createHash('sha256').update(...));
}
```

At week 39, this serializes the state and hashes it BUT the result is overwritten by the post-loop block at `2496-2500` (which serializes the state again after `reconcileFinalSectorTruth` mutates it for war-phase scenarios). The only consumer of the in-loop `final_state_hash` is `replayLine.state_hash` at line 2421-2424, which attaches the pre-reconciliation hash to the replay-actions JSONL — almost certainly wrong if `reconcileFinalSectorTruth` runs (the post-reconciliation state is what gets saved as `final_save.json`).

Two byte-identical follow-on lanes for a future session:
1. **Skip the in-loop week-39 serialize/hash if post-loop reconciliation will run** (war-phase scenarios). Saves 1 full-state serialize. The replay-actions JSONL `state_hash` field would need either: (a) defer to the post-loop hash and write a sentinel during the loop, then patch on close; or (b) accept that the field is only populated for non-war-phase scenarios. Behavior change but only on a non-canonical artifact.
2. **Wrap `buildReplayFrameRow` inside the `replay-sequence-write` label** so the hidden 5-7 s of per-turn `serializeState` shows up. Trivial scope, attribution-only.

Both are byte-identical against the canonical 40w hash.

## Files Changed

| File | Change |
|---|---|
| `src/scenario/scenario_runner.ts` | Added `_serDetailNs` / `_serDetailCalls` module-local Maps, `_serDetailEnabled` gate (independent of `--timing-json`), `_serTimeSync<T>` / `_serTimeAsync<T>` helpers, `_serDetailDumpToStderr` end-of-run dump. Replaced 8 of ~25 existing `timedSync(.., 'serialization_artifacts', ..)` call sites with the new labeled helper at: weekly-report-write, brigade-temporal-write, replay-sequence-write, final-save-serialize (×2), final-save-hash (×3), final-save-write. |
| `tests/serialization_attribution_contract.test.ts` | New static-grep contract test enumerating the 6 label literals. |
| `docs/40_reports/implemented/20260518_BATCH33_SERIALIZATION_ATTRIBUTION.md` | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, napkin, session checkpoint).

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (clean) |
| `vitest run tests/serialization_attribution_contract.test.ts` | _will run on commit_ |
| 40w `PERF_PROFILE_SERIALIZATION=true` (n1911) | hash `b14179d65639860c` — matches baseline |
| Default 40w (no flag) | _will spot-check on commit_ |

## Why Pause Here

The biggest serialization lever (`buildReplayFrameRow` → `serializeState` per turn) is consumer-blocked from blanket downgrade. The hybrid opt-out path is a multi-batch refactor (consumer migration + regression-test reshape). The remaining attribution scaffolding + the in-loop redundant-serialize cleanup are individually small wins (<0.5 s each). After 14 batches in this session (19-32) plus this Batch 33, the safe-scope queue is genuinely thin and the next material move is either user-direction on the hybrid replay path or a new lane entirely.

See `docs/40_reports/audits/20260518_SESSION_CHECKPOINT_BATCHES_19_TO_32.md` for the broader session arc. This Batch 33 extends that checkpoint into the serialization domain.
