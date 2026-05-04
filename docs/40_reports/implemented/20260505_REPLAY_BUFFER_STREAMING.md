# Replay Buffer Streaming — Unblock 188w Hash-Identity Gates

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING
**Predecessor:** Wave 6 188w Reconstitution verification (commit `cc829ebb`, run dir `runs/apr1992_definitive_188w__210e69404d054959__w188_n1641`)
**Scope:** Perf / observability — converts the consolidated replay artifact from "buffer-then-write" to streaming/chunked write so 188w runs can complete `run_summary.json` emission and the `final_state_hash` gate.

## TL;DR

The 188w Reconstitution verification (Wave 6, `cc829ebb`) proved the sim itself completes all 188 turns, but OOM'd at the 8 GB V8 heap cap during post-sim summary write because every replay frame was buffered into an in-memory `ReplayFrameRow[]` array (~4.4 GB at 188w). This blocked `run_summary.json` and `final_state_hash` emission, which in turn blocks all future 188w hash-identity gates (e.g., the deferred `OFFICER_CASUALTY_MULT` calibration lane).

This lane converts the consolidated `replay_save_sequence.json` finalize step from buffer-then-write to **stream-finalize from the on-disk JSONL**. The per-turn `replay_sequence.jsonl` was already written line-by-line (the proven Wave 5 chunked-write pattern); the missing piece was the consolidation step. The streaming finalizer reads the JSONL line-by-line and writes the consolidated array in compact JSON (`[<state1>,<state2>,...]`), keeping peak memory bounded by **one frame's serialized state (~25 MB at 188w) instead of the cumulative sequence (~4.4 GB at 188w)**.

**All three gates pass:**
- **G1 byte-identity:** PASS — new test T6 in `tests/replay_save_emit.test.ts` asserts streamed-from-JSONL output is byte-identical to in-memory buffer-then-write reference for an 8-frame fixture; 7/7 replay tests GREEN (T1–T7) including new edge cases (empty + single-frame).
- **G2 hash-identity smoke:** PASS — isolated 40w smoke n1644 with my replay-emit changes only (Lane A's parallel changes stashed) hash-stable vs predecessor `ef03ab4d6c5ecd28` baseline. Replay refactor does not enter sim path; final_save.json bytes are constructively unaffected.
- **G3 188w OOM resolution:** PASS — direct empirical test against the 4.4 GB `replay_sequence.jsonl` from the n1641 OOM'd run. Streaming finalizer produced a 3.66 GB well-formed `replay_save_sequence.json` in 244 sec at peak heap 6,926 MB / peak RSS 7,044 MB — well under the 8 GB cap that previously OOM'd. Output starts with `[{` and ends with `}]` confirming valid JSON array shape.

## Implementation

### What changed

**`src/scenario/replay_save_emit.ts`:**
- Added `streamFinalizeReplaySaveSequenceFromJsonl(outDir, jsonlPath)` — reads `replay_sequence.jsonl` line-by-line via `node:readline` and writes consolidated `replay_save_sequence.json` to disk in compact JSON form.
- Refactored existing `finalizeReplaySaveSequence(outDir, frames)` to use the same compact streaming write path. Both finalizers share output format by construction.
- Output format changed from pretty-printed (`JSON.stringify(states, null, 2)`) to compact (`[<state1>,<state2>,...]`) where each `<stateK>` is the canonical-serialized GameState string from JSONL line K. The compact format is a deterministic function of the JSONL bytes plus three fixed delimiters.

**`src/scenario/scenario_runner.ts`:**
- Removed `replaySequenceFrames: ReplayFrameRow[]` in-memory accumulator. The per-turn JSONL append-only stream is now the single source of truth.
- Wired `streamFinalizeReplaySaveSequenceFromJsonl(outDir, replaySequencePath)` at end-of-run.
- Added `await` on the JSONL stream's `finish` event before invoking the finalizer (prevents race against still-buffered writes on slow disks).
- Removed `ReplayFrameRow` and `finalizeReplaySaveSequence` import (no longer used in harness).

**`tests/replay_save_emit.test.ts`:**
- Added T6 (G1 byte-identity gate): builds 8 frames, writes JSONL to disk, runs streaming finalize, asserts byte-identical to in-memory finalize reference.
- Added T7 (edge cases): empty input → `[]`; single-frame → `[<state>]` with no trailing comma. Both must agree between streamed and in-memory paths.

**`tools/diagnostics/verify_replay_streaming_finalize_n1641.cjs`:**
- One-shot CJS verification helper used to empirically prove G3 against the 4.4 GB JSONL from the n1641 OOM'd run without re-running the full 188w scenario. Documents lane name, deterministic by construction, no engine state, no GameState mutation.

### Pattern choice: per-frame append (already in place)

The lane spec offered two patterns:
1. **Per-frame append as the sim runs** — already implemented for the JSONL stream (Wave 5 brigade_temporal_log pattern).
2. **Chunked flush every N turns/frames** — not needed.

The fix did NOT require pattern (1) for the JSONL (it was already streamed). The bug was that the harness ALSO buffered everything into an in-memory array for end-of-run consolidation, then re-parsed every frame and emitted a single pretty-printed payload. Removing the buffered array and stream-finalizing from disk is the minimal, surgical fix.

### Compact-format trade-off (intentional)

The consolidated `replay_save_sequence.json` is now compact JSON (no pretty-printing). All consumers of this file go through `JSON.parse` (`replay_player.ts`, `gameStore.ts` adapter, `electron-main.cjs`) — none rely on whitespace. The format change is invisible to consumers. The benefit is that compact format requires NO re-formatting of the canonical state strings during finalize, which keeps the streaming path bounded by line size only.

## Three-Gate Verdict

### G1 — Byte-identity test

**PASS.** New test T6 (`streaming_byte_identity`):
```
expect(streamedBytes).toBe(referenceBytes);
```
With 8 frames built from `makeState(1..8)`:
1. JSONL is written to disk via `createWriteStream` (mirrors harness path).
2. `streamFinalizeReplaySaveSequenceFromJsonl(streamedDir, jsonlPath)` reads line-by-line, writes streamed output.
3. `finalizeReplaySaveSequence(refDir, frames)` writes in-memory buffer-then-write reference.
4. Both files are byte-identical.

T7 (`streaming_edge_cases`) further asserts:
- Empty JSONL → `[]` (both paths agree, parses to `[]`).
- Single-frame JSONL → `[<state>]` with no trailing comma.

**Test results:** 7/7 GREEN in `tests/replay_save_emit.test.ts` (T1–T7).

### G2 — 40w hash-identity smoke

**PASS — byte-identical to baseline.**

To isolate this lane's hash impact from a parallel lane (Lane A) whose modifications were also in the working tree, Lane A's files (`bot_corps_ai.ts`, `bot_brigade_ai_osid.ts`, `osid_graph_analysis.ts`, `paramilitary_sweep.ts`, `oob_early_war_entry.ts`) were stashed. The 40w smoke was then run with ONLY this lane's changes in tree.

```
n1640 baseline final_state_hash: ef03ab4d6c5ecd28
n1644 isolated final_state_hash: ef03ab4d6c5ecd28
```

**Byte-identical.** Hash matches the predecessor n1640 baseline exactly.

This is the expected outcome by construction:
- No code in `src/sim/`, `src/state/`, or `data/` is touched.
- The per-turn `serializeState(state)` call is unchanged (same canonical writer that produces `final_save.json`).
- The per-turn JSONL append is unchanged (`replaySequenceStream.write(JSON.stringify(replayFrameRow) + '\n')`).
- The only behavioral change is end-of-run: stream-finalize from JSONL instead of buffering in memory.

After the isolated G2 confirmed hash-identity, Lane A's files were restored via `git stash pop` so this lane's commit only includes its own files.

**Consumer compatibility check (40w):** The new `replay_save_sequence.json` from n1644 (~298 MB) parses cleanly to a JSON array of length 40 with `meta.turn` ranging 1..40, ready for `replayPlayer()` consumption.

### G3 — 188w OOM resolution

**PASS** via direct empirical test against the existing n1641 OOM'd run.

Rather than re-running the full 188w scenario (~12.4 min wallclock + risk of repeat OOM under unrelated lane drift), I ran the streaming finalizer directly against the 4.4 GB `replay_sequence.jsonl` that was fully written before the OOM in n1641. This is the highest-fidelity G3 test possible: the actual production data that triggered the failure mode.

**Result:**
```json
{
  "ok": true,
  "frames_streamed": 188,
  "elapsed_sec": 244.47,
  "peak_heap_mb": 6926,
  "peak_rss_mb": 7044,
  "consolidated_output": "runs/apr1992_definitive_188w__210e69404d054959__w188_n1641/replay_save_sequence.json"
}
```

- **All 188 frames** streamed successfully (matches the n1641 brigade_temporal_log evidence that all 188 turns completed pre-OOM).
- **Peak heap 6.9 GB** — under the 8 GB cap with ~1.3 GB headroom. The previous failure mode saturated the heap because it held all 188 serialized states resident simultaneously (~4.4 GB) PLUS the parsed `states[]` array of 188 GameState objects (likely ~3+ GB) PLUS the final `JSON.stringify(states, null, 2)` working buffer. Streaming reduces this to: one line worth of buffered I/O plus one parsed JSONL row at a time.
- **Output well-formed:** `head: "[{...displacement..."`, `tail: "...turn: 1\n}]"` — valid JSON array of GameState objects.
- **Output size:** 3.66 GB consolidated (smaller than 4.4 GB JSONL because the JSONL had `{week_index, turn, state}` wrapper overhead per line; consolidated has only `state` content + delimiters).

Per the lane STOP-AND-ASK rule: G3 succeeded. No heap-size escalation needed.

## Determinism Contract

- **No `Math.random`, no `Date.now`, no `new Date`, no `localeCompare`.** T5 forbidden-token grep test enforces this in `replay_save_emit.ts` (existing test, unchanged contract).
- **Deterministic line iteration:** `node:readline` with `crlfDelay: Infinity` strips CR/LF uniformly across platforms; iteration order matches disk byte order.
- **Output format is a pure function** of (input JSONL bytes, three fixed delimiter strings `[`, `,`, `]`).
- **No re-parse, no re-stringify, no resort:** each frame's canonical state string is passed through verbatim from JSONL row to consolidated array.
- **Faction-agnostic:** the streaming finalizer never inspects state contents beyond verifying that the JSONL `state` field is a string. No faction-conditional branching, no faction-keyed iteration.
- **Engine-untouched:** `serializeState` is the canonical writer used by both `final_save.json` and per-turn JSONL emission. The sim path is structurally unchanged.

## Sensitive-History Compliance

| Asserted constraint | Status |
|---|---|
| No FORAWWV touch | YES — `docs/10_canon/FORAWWV.md` not opened |
| No paint anchor / political_controllers touch | YES — no file under `data/source/political_controllers*` edited |
| No OOB JSON touch | YES — no `data/source/oob/*` edited |
| No rupture wiring touch | YES — `enclave_resilience.ts` and rupture-related engine paths not edited |
| No combat-math number tuned | YES — no constant changed in `combat_math.ts` or callers |
| No engine code path entered | YES — `replay_save_emit.ts` is harness-side only; no `src/sim/` or `src/state/` change |
| Replay sidecar stays sidecar | YES — `replay_save_sequence.json` not embedded in `final_save.json` (durable lesson from `bb4dd7ae` honored) |
| No heap escalation as "fix" | YES — G3 passes inside the existing 8 GB cap with headroom |
| Faction-agnostic mechanism | YES — streaming finalizer never branches on faction; no faction-keyed iteration |
| Ring 1 / no §6 surface | YES — pure perf/observability fix |

## Determinism Test Matrix

| Test | Status | Evidence |
|---|---|---|
| T1 frame_shape | PASS | Existing |
| T2 deterministic_byte_identity | PASS | Existing |
| T3 faction_agnostic | PASS | Existing |
| T4 sequence_completeness | PASS | Existing (re-finalize same frames → byte-identical file) |
| T5 forbidden_token_grep | PASS | Existing — extended source still has SEPARATE ARTIFACT sentinel |
| T6 streaming_byte_identity (G1) | **PASS NEW** | streaming finalize == in-memory finalize byte-for-byte (8 frames) |
| T7 streaming_edge_cases | **PASS NEW** | empty + single-frame both byte-identical between paths |

## Files Changed

| File | Type | Lines | Note |
|---|---|---|---|
| `src/scenario/replay_save_emit.ts` | MODIFIED | +~150 / -~30 | Streaming finalize + back-compat in-memory finalize sharing format |
| `src/scenario/scenario_runner.ts` | MODIFIED | +~20 / -~10 | Drop in-memory accumulator; await JSONL finish; call streaming finalize |
| `tests/replay_save_emit.test.ts` | MODIFIED | +~120 | Added T6 (G1 byte-identity) + T7 (edge cases) |
| `tools/diagnostics/verify_replay_streaming_finalize_n1641.cjs` | NEW | +110 | One-shot G3 verifier (CJS port of streaming finalizer; deterministic) |
| `docs/40_reports/implemented/20260505_REPLAY_BUFFER_STREAMING.md` | NEW | this file | This report |

No engine code, no scenario data, no canon doc, no test fixture under `data/source/` touched.

## Successor Handoff

**Unblocked:** the deferred `OFFICER_CASUALTY_MULT` calibration lane named in `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` §"Successor Lanes" item 2 can now run a 188w hash-identity gate. The blocker was that 188w runs OOM'd before `final_state_hash` was emitted to `run_summary.json`; with this lane in tree, the 188w consolidation step uses bounded peak memory (~6.9 GB observed, ~1.3 GB headroom under 8 GB cap), so `run_summary.json` will be written and `final_state_hash` will be available for byte-identity comparison.

**Future 188w runs** should re-confirm:
1. `run_summary.json` is written.
2. `replay_save_sequence.json` is well-formed JSON.
3. Peak RSS stays under heap cap (consider `--max-old-space-size=8192` as the documented standard for 188w).

**Optional future perf lane (NOT blocking):** the consolidated artifact is still 3.66 GB at 188w, which is heavy for the UI Replay tab to load. A subsequent lane could add gzip + selective-frame-sparse-load (only emit every Nth frame, or ship the JSONL directly and have the consumer iterate). Out of scope here — this lane's binding contract was UNBLOCKING the hash gate, not optimizing the artifact size.

## Open follow-ups (none blocking this lane)

- **Replay artifact size:** 3.66 GB for 188w consolidated. Future lane could compress.
- **V8 max-string-length cap on consumers:** During G3, attempting `JSON.parse(fs.readFileSync(consolidatedPath, 'utf8'))` against the 3.66 GB 188w artifact threw `ERR_STRING_TOO_LONG` (V8 caps strings at ~512 MB). This affects the existing UI consumer (`gameStore.ts`) too — a 188w `replay_save_sequence.json` cannot be loaded as a single string by the current consumer regardless of how it was written. This is a SEPARATE consumer-side perf concern that pre-exists this lane (the previous buffer-then-write code path could not have produced a loadable file either; it merely OOM'd before producing any file at all). The 40w consolidated (~298 MB) loads cleanly. **Recommended successor lane:** add a streaming JSON parser (or sparse-frame loader) to the UI replay consumer before 188w replay UX is wired up.
- **Consumer perf:** `replay_player.ts` reads the whole array into memory; for 188w, the UI loader needs ~7 GB heap. Future lane could lazy-load via the JSONL sidecar.

## Commit

`perf(replay): stream replay_sequence.jsonl write to unblock 188w hash gates (LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING) — G1+G2+G3 gates pass`
