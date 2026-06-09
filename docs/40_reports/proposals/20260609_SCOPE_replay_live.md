# SCOPE — Wire the live Replay tab (advance-turn replay emission)

**Date:** 2026-06-09
**Mode:** Read-only scope (no code, no runs)
**Source finding:** `docs/40_reports/proposals/20260609_ORPHANED_WIRING_AUDIT_ui.md` finding #6
**Adjacency:** D2 "play a full campaign start→Dayton" 1.0 gate

---

## 1. The gap, precisely

The replay **consumer** chain is 100% wired and subscribed. The replay **producer** runs only on the file-load path; the live `advance-turn` loop never emits the replay channels. So a campaign played start→game-over inside the app reaches the VerdictScreen with an **empty Replay tab**.

### The consumer chain (live, complete — verified)
- `src/desktop/preload.cjs:38-43` — `ipcRenderer.on('replay-sequence-updated' / 'replay-manifest-updated')` fan out to listener sets; exposed as `subscribeReplaySequenceUpdated` / `subscribeReplayManifestUpdated` (`:54-55`).
- `src/ui/map/desktop/useIPC.ts:446-451` — both subscribe methods surfaced on the IPC object.
- `src/ui/map/hooks/useDesktopSession.ts:75-100` — subscribes both, parses JSON, calls `setPendingReplaySaveSequence` / `setPendingReplaySaveManifest`.
- `src/ui/map/store/gameStore.ts:283-286, 638-640` — pending fields + setters; `loadSave` (`:701-710`) merges pending sidecar into `parseGameState(...)` → `LoadedGameState.replaySaveSequence` / `.replaySaveManifest`.
- `src/ui/map/components/VerdictScreen.tsx:366-367` — Replay tab gates on `replaySaveSequence.length>0 || replaySaveManifest.frame_count>0`; `:531-533` feeds `<ReplayScrubber saveSequence=… saveManifest=… />`.

### The producer — file-load path only
- `src/desktop/electron-main.cjs:142-163` — `readReplaySaveSequenceSidecar()` / `readReplaySaveManifestSidecar()` read `replay_save_sequence.json` / `replay_save_manifest.json` siblings of the loaded save.
- `electron-main.cjs:1611-1636` (`load-state-dialog`) — reads the **manifest first** (lightweight summary), and only falls back to the full sequence when no manifest exists (`:1624`), then `sendReplayManifestToRenderer` / `sendReplaySequenceToRenderer`.
- Both sidecars are written by the **scenario harness**, not the app: `src/scenario/replay_save_emit.ts` (`writeReplayFrame` per turn → `streamFinalizeReplaySaveSequenceFromJsonl` at end-of-run, which also writes the manifest via `writeReplaySaveManifest`).

### The producer — live path (the gap)
- `electron-main.cjs:1638-1681` (`advance-turn`) deserializes `currentGameStateJson`, runs `sim.advanceTurn`, re-serializes, and emits **only** `game-state-updated` (`:1674`) + `turn-report-updated` (`:1675`). It **never** accumulates a per-turn frame nor emits `replay-sequence-updated` / `replay-manifest-updated`.
- Neither does `start-new-campaign` (`:1600-1608`) — and it does **not** reset any stale pending replay sidecar from a prior file-load (see §5 done-definition note).

**Net:** the four push channels are all subscribed (audit "HEALTHY" line), but two of them are dead on the live path. The scrubber can only ever render for an externally-produced sidecar save.

---

## 2. What advance-turn must emit (channel names + frame shape)

To populate the live Replay tab, the `advance-turn` handler needs to, per turn, append the new post-turn state to an accumulating sequence and emit on the existing channels:

- **Channel `replay-manifest-updated`** — payload = JSON string of `ReplaySaveManifest`:
  ```
  { schema_version: 1, frame_count: number, frames: ReplayFrameSummary[] }
  ```
  where `ReplayFrameSummary` = `{ turn, date, activeFormations, totalCasualties, totalDisplaced, controlByFaction[] }` (`src/sim/replay/replay_frame_summary.ts:23-30`). Built by `buildReplayFrameSummary(state)` per turn + `buildReplaySaveManifest(summaries)`.
- **Channel `replay-sequence-updated`** (optional, heavier) — payload = JSON string of `GameState[]` (`[<state1>,…,<stateN>]`), each frame = `serializeState(state)`.

Both channels and their renderer-side merge already exist; the gap is purely that `advance-turn` never produces and sends them.

**Manifest is sufficient to light up the tab.** VerdictScreen's gate is `... || replaySaveManifest.frame_count > 0`, and the file-load path itself prefers the manifest and suppresses the full sequence when a manifest is present (`electron-main.cjs:1624`). The full `GameState[]` sequence is only needed for the scrubber's **map-frame inspection** (`startReplayInspection(frame, …)` in gameStore). For a v1.0 "Replay works for a live campaign" bar, the **manifest-only** path is the cheap, safe target; the full-sequence path is the richer follow-on.

---

## 3. Calibration / determinism: INERT (confirmed)

Wiring this is **calibration-inert** and **determinism-safe**:

- The replay frame is a pure **read-model projection** of post-turn `GameState`. `buildReplayFrameSummary` and `buildReplayFrameRow`/`serializeState` only **read** state; they never write it. The producer module documents this explicitly ("No engine state mutation. Pure read." — `replay_save_emit.ts:74-75`) and the summary builder repeats it ("replay summaries never feed back into sim" — `replay_frame_summary.ts:11-12`).
- The emission is an **observer of the turn**, downstream of `sim.advanceTurn` returning. It cannot change `result.state`, the serialized `currentGameStateJson`, the turn report, or the autosave. No sim input is touched.
- Determinism primitives are clean: `buildReplayFrameSummary` sorts via `strictCompare`, `serializeState` is the same canonical writer that produces `final_save.json`, and there is no RNG / wall-clock / locale-sort in either path.
- **No scenario-harness path changes** → the 40w/52w/188w baselines and `final_save.json` byte-identity gate are untouched by definition. This is desktop-renderer wiring only.

**Flag:** the ONE thing to keep out of sim is the accumulator's *storage*. Keep the per-turn frame buffer in the **electron-main process** (alongside `currentGameStateJson`), NOT inside `GameState`. Embedding `GameState[]` into the saved state would balloon the canonical save and risk the byte-identity gate — exactly the reason the harness chose a separate artifact (`replay_save_emit.ts:36-57`). Do not add a replay field to the persisted state schema.

---

## 4. Effort estimate (LOC + where)

The summary builder, manifest builder, frame-row builder, all four IPC channels, both preload subscribes, the renderer subscribe, the store merge, and the VerdictScreen consumer **already exist and are reused as-is.** The only new code is a per-turn accumulator + emit in `electron-main.cjs`.

### Option A — manifest-only (RECOMMENDED for v1.0). ~30-45 LOC, one file.
`src/desktop/electron-main.cjs`:
1. A module-level `let liveReplaySummaries = []` next to `currentGameStateJson` (~1 line).
2. Reset it to `[]` on `start-new-campaign` and on `load-state-dialog` (so a live campaign doesn't inherit a stale file-loaded sidecar). Seed turn 0 from the initial state. (~6-10 lines across the two handlers.)
3. In `advance-turn`, after `currentGameStateJson = sim.serializeState(result.state)`: `liveReplaySummaries.push(sim.buildReplayFrameSummary(result.state))`, build the manifest via `sim.buildReplaySaveManifest(liveReplaySummaries)`, and `sendReplayManifestToRenderer(JSON.stringify(manifest), _event.sender)`. (~8-12 lines.)
4. **Desktop-sim bundle export:** `buildReplayFrameSummary` + `buildReplaySaveManifest` must be exported from the `dist/desktop/desktop_sim.cjs` bundle so `electron-main` can call them (it lazy-loads `getDesktopSim()`). Verify against `src/desktop/desktop_sim.ts`; if not already exported, add 2 re-exports (~2-4 lines). This is the only plumbing outside the handler.

Total: **~30-45 LOC, one source file + maybe 2 bundle re-exports.** No renderer change, no store change, no schema change.

### Option B — full GameState[] sequence (map-frame inspection too). +~15-25 LOC.
Additionally accumulate `serializeState(result.state)` strings, assemble `[<s1>,…]` compactly, and emit `replay-sequence-updated`. Enables the scrubber to swap the map to a historical frame. Carries the real memory cost (§5). Defer past v1.0 unless map-frame scrubbing is a stated v1.0 requirement.

---

## 5. Storage / perf

- **Manifest-only (Option A):** each `ReplayFrameSummary` is a tiny fixed-shape object (~6 scalars + a ≤3-entry `controlByFaction` array). 188 turns ≈ **188 small objects, low tens of KB total**. Re-serializing the growing manifest each turn is O(turns) string work — negligible at 188. **No concern; effectively unbounded-safe at campaign scale.**
- **Full sequence (Option B):** each frame is a full serialized `GameState` (~150 KB at 40w, growing to **~25 MB per frame at 188w**). Accumulating all frames in the main process for a 188w campaign is the exact failure the harness hit — its in-memory accumulator "collapsed the V8 heap (4.4 GB replay buffer)" and forced the on-disk JSONL streaming rewrite (`replay_save_emit.ts:22-34`). A live in-memory `GameState[]` would reproduce that. If Option B is ever pursued, mirror the harness: stream per-turn frames to a JSONL in `userData`, finalize on game-over via `streamFinalizeReplaySaveSequenceFromJsonl` — do **not** hold the array resident. This is why Option A is the v1.0 target.

---

## 6. Done-definition + 1.0 recommendation

### "Replay works for a live campaign" =
1. A campaign played entirely in-app (start-new-campaign → N× advance-turn → game-over) reaches VerdictScreen with the **Replay tab visible** (gate `replaySaveManifest.frame_count > 0` satisfied) and the scrubber showing one frame per turn played.
2. The manifest reflects the actual turns played (turn/date/casualties/displaced/control per turn), not a stale file-loaded sidecar.
3. Starting a new campaign or loading a different save **resets** the live accumulator (no cross-game bleed).
4. Determinism baselines unaffected (true by construction — no harness/sim path touched); smoke triad (`tsc --noEmit` + `vitest` + `desktop:map:build`) green.

### Recommendation: **YES for v1.0, Option A (manifest-only).**
- It directly serves the D2 "play a full campaign start→Dayton" gate: today, the headline verdict-screen replay artifact is silently empty for exactly the playthrough the gate validates.
- The lift is small and **fully calibration-inert** — ~30-45 LOC in one desktop file (plus possibly 2 bundle re-exports), zero sim/harness/schema change, zero baseline risk. It reuses an already-complete, already-subscribed consumer chain; this is finishing wiring, not building a feature.
- **Defer Option B (full-sequence map-frame scrubbing) past v1.0** unless map inspection during replay is explicitly required — it carries the 188w heap-collapse risk and needs the JSONL-streaming treatment to be safe.
- One caveat worth a line in the build ticket regardless of replay: `start-new-campaign` / live `advance-turn` currently never clear a pending file-loaded replay sidecar in the renderer store. Even without this work, a load-then-new-campaign could surface a stale Replay tab. The Option A reset (item 3) closes that.
