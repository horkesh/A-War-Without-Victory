# Tier-1 Replay-in-Live-Play Wire Scope (2026-06-10)

**Author:** Technical Architect / Gameplay Programmer scoping pass  
**Source:** `20260609_ORPHANED_WIRING_AUDIT_MASTER.md` finding T1-B  
**Target:** `docs/40_reports/proposals/20260610_TIER1_REPLAY_WIRE_SCOPE.md`

---

## 1. The Orphan — Precisely

### What is recorded (harness path — working)

The scenario harness (`src/scenario/scenario_runner.ts`, lines ~2721–2727) calls
`buildReplayFrameSummary(state)` every turn and accumulates sparse summaries into
`replayManifestSummaries[]`. At end-of-run it writes two sidecar files alongside
`final_save.json`:

- `replay_save_manifest.json` — sparse per-turn summary (turn, date, faction
  control counts, casualty totals). Always written; default output mode.
- `replay_save_sequence.json` — full serialized `GameState[]`. Opt-in via
  `replayPayloadMode: 'full'`. Memory-bounded by the streaming JSONL finalizer
  (`streamFinalizeReplaySaveSequenceFromJsonl`, `src/scenario/replay_save_emit.ts:195`).

When a user **loads a `final_save.json` from disk** the desktop handles it in
`ipcMain.handle('load-state-dialog', ...)` (`src/desktop/electron-main.cjs:1611`):
at lines 1622–1625 it reads the sidecar, calls
`sendReplayManifestToRenderer(manifestJson)`, optionally `sendReplaySequenceToRenderer`,
and the renderer stages both via the `pendingReplaySave*` slots in `gameStore.ts`.
The `VerdictScreen` `Replay` tab then gates on
`replaySaveManifest.frame_count > 0 || replaySaveSequence.length > 0`
(`VerdictScreen.tsx:393–394`) and renders the `ReplayScrubber`.

### What is NEVER done (live-play path — the orphan)

The `ipcMain.handle('advance-turn', ...)` handler (`electron-main.cjs:1638–1681`)
does **exactly this** after each turn advance:

```
line 1671  const result = await sim.advanceTurn(state, getBaseDir());
line 1673  currentGameStateJson = sim.serializeState(result.state);
line 1674  sendGameStateToRenderer(currentGameStateJson, _event.sender);
line 1675  if (result.report) sendTurnReportToRenderer(result.report);
line 1676  autoSave();
```

It **never** accumulates a replay frame, **never** calls `buildReplayFrameSummary`,
**never** calls `sendReplayManifestToRenderer`, and **never** updates the
`pendingReplaySaveManifest` store slot. `autoSave()` (`electron-main.cjs:1323`)
writes only `currentGameStateJson` — no sidecar.

Result: when `game_over` fires and the `VerdictScreen` mounts, both
`loadedGameState.replaySaveManifest` and `loadedGameState.replaySaveSequence` are
null. `hasReplay` is false. The Replay tab is invisible. A 188-week campaign played
start→Dayton inside the Electron app gets **no Replay tab**.

### Cited evidence summary

| Layer | File | Lines | Role | Live-play gap |
|---|---|---|---|---|
| Producer (harness) | `src/scenario/scenario_runner.ts` | ~2721–2727 | Writes manifest+sequence | Harness only, never called from desktop |
| Producer functions | `src/scenario/replay_save_emit.ts` | 114, 133, 195, 268 | Frame row + finalizer | Not imported by `desktop_sim.ts` |
| Frame summary | `src/sim/replay/replay_frame_summary.ts` | 103 | `buildReplayFrameSummary()` | Never called in `advance-turn` path |
| Manifest builder | `src/sim/replay/replay_manifest.ts` | 9 | `buildReplaySaveManifest()` | Never called in `advance-turn` path |
| Desktop send fn | `src/desktop/electron-main.cjs` | 166, 177 | `sendReplaySequenceToRenderer`, `sendReplayManifestToRenderer` | Called at load-state (line 1623/1625, 780) only — **zero calls** from `advance-turn` |
| Advance-turn handler | `src/desktop/electron-main.cjs` | 1638–1681 | Live turn loop | Only emits `game-state-updated` + `turn-report-updated` |
| Consumer (verdict) | `src/ui/map/components/VerdictScreen.tsx` | 393–394 | Gates Replay tab | Gates on null → tab hidden for live campaigns |
| Staging store | `src/ui/map/store/gameStore.ts` | 283–286, 637–640, 705–710 | `pendingReplaySaveManifest` | Populated only by `subscribeReplayManifestUpdated` listener |
| IPC subscribe | `src/ui/map/hooks/useDesktopSession.ts` | 75, 90 | Listens for `replay-*-updated` | Desktop never emits during `advance-turn` |

---

## 2. The Wire-In Points

The minimal wire-in requires three things:

### A. In-memory manifest accumulation in `electron-main.cjs`

**Where:** `electron-main.cjs` — after `currentGameStateJson` declaration at line 79.

Add a module-level manifest accumulator:

```js
// TIER1-REPLAY-LIVE: sparse manifest accumulator for live-play sessions.
// Reset on campaign start or state load; appended per advance-turn.
let liveReplayManifestFrames = [];
```

There are **five** session-start paths that set `currentGameStateJson` from a fresh
state; all five must reset the accumulator:

| # | Handler / path | Line (serialize call) |
|---|---|---|
| 1 | `ipcMain.handle('start-new-campaign', ...)` | 1603 |
| 2 | `ipcMain.handle('load-state-dialog', ...)` | 1617 |
| 3 | `ipcMain.handle('load-scenario-dialog', ...)` | 1583 |
| 4 | Menu `Load scenario...` click handler | 764 |
| 5 | Menu `Load state file...` click handler | 776 |

(Line 848 is the packaged-app startup probe — `startNewCampaign` called during
`app.whenReady` smoke test — not a live session entry; still safe to reset there
but it is a one-time probe path, not a player-facing reset site. Line 955 is the
endgame reachability proof in the same startup block — same reasoning.)

After `currentGameStateJson = sim.serializeState(state)` at each of the five
lines above, add:
```js
liveReplayManifestFrames = [];
```

### B. Per-turn frame append + manifest emit in `advance-turn`

**Where:** `electron-main.cjs`, inside `ipcMain.handle('advance-turn', ...)` at
line 1671–1677. After the existing `autoSave()` call (line 1676), add:

```js
// TIER1-REPLAY-LIVE: accumulate sparse replay summary for the live-play
// manifest so the VerdictScreen Replay tab works for campaigns played in-app.
// Uses buildReplayFrameSummary (browser-safe — no Node imports) to build the
// sparse summary. Does NOT store full GameState[] (memory safety).
const liveSummaryFrame = sim.buildReplayFrameSummary(result.state);
if (liveSummaryFrame) {
    liveReplayManifestFrames.push(liveSummaryFrame);
    const liveManifest = sim.buildReplaySaveManifest(liveReplayManifestFrames);
    sendReplayManifestToRenderer(JSON.stringify(liveManifest));
}
```

**Note:** `buildReplayFrameSummary` and `buildReplaySaveManifest` must be exported
from `desktop_sim.ts` and re-exported through the bundled `desktop.js` sim module
(the `getDesktopSim()` instance). See §2-C below.

### C. Expose `buildReplayFrameSummary` + `buildReplaySaveManifest` from `desktop_sim.ts`

**Where:** `src/desktop/desktop_sim.ts`

Add two re-exports alongside the existing imports:

```ts
// src/sim/replay/ modules are browser-safe (no Node imports).
export { buildReplayFrameSummary } from '../sim/replay/replay_frame_summary.js';
export { buildReplaySaveManifest } from '../sim/replay/replay_manifest.js';
```

These are pure functions with zero Node dependencies (`replay_frame_summary.ts`
imports only `game_state.ts`, `validateGameState.js`, `schema_validators.js`;
`replay_manifest.ts` imports only `replay_frame_summary.ts`). They are already
used in the browser-side `ReplayScrubber` via direct import, confirming
browser-safety.

**The desktop sim build (`npm run desktop:sim:build`) bundles `desktop_sim.ts`
into a CJS module loaded by `electron-main.cjs` via `getDesktopSim()`.** Adding
these exports makes them available as `sim.buildReplayFrameSummary(...)` and
`sim.buildReplaySaveManifest(...)` in the main process without any Node-only I/O.

### D. `useDesktopSession.ts` — no change needed

The `subscribeReplayManifestUpdated` listener at `useDesktopSession.ts:90` already
parses incoming manifest JSON, validates `schema_version === 1`, and calls
`setPendingReplaySaveManifest(parsed)`. The `gameStore.ts:705-710` `loadSave` path
already merges `pendingReplaySaveManifest` into `parseGameState`. **These consumer
paths are already complete and correct.** The orphan is 100% on the producer side.

### E. The `game_over` transition — already handled

When `result.state.meta.game_over === true`, the `advance-turn` handler still
returns `{ ok: true, stateJson: ... }`. The renderer's `handleAdvanceTurn` in
`useDesktopSession.ts` calls `loadSave(stateJson)` which calls `parseGameState`
merging in `pendingReplaySaveManifest`. By the time `VerdictScreen` mounts,
the manifest is already staged in the store from the final-turn emit at step B.
No additional game_over-specific handling is required.

---

## 3. Determinism Risk

**No determinism risk. This is calibration-INERT by construction.**

- `buildReplayFrameSummary` is a pure read of `GameState` fields using
  `strictCompare` for all sorted iterations (`replay_frame_summary.ts:93, 99`).
  No `Math.random()`, no `Date.now()`, no timestamp generation.
- `buildReplaySaveManifest` is a pure array wrap with a fixed `schema_version: 1`.
  No nondeterministic primitives.
- The accumulator array `liveReplayManifestFrames` is module-level state in the
  **Electron main process** (Node.js) — it does not touch the sim engine, does not
  affect `GameState`, does not affect `serializeState()` output, and is never read
  by `advanceTurn()` or any sim function.
- `sendReplayManifestToRenderer(JSON.stringify(liveManifest))` emits a push
  notification to the renderer. The renderer parses it and stores it in a React/
  Zustand store slot. This is purely observational — it modifies UI state, not sim
  state.
- The `autoSave()` path writes only `currentGameStateJson` — unchanged.

**Byte-identity proof strategy:** the headless `scenario_runner` path never routes
through `electron-main.cjs` or `desktop_sim.ts::advanceTurn`. The calibration
scenarios (`npm run sim:scenario:run:40w` / `npm run sim:scenario:run:default`)
call `runScenario()` directly. This wire-in is unreachable from the headless path.

---

## 4. Calibration Risk

**CALIBRATION-INERT.** Confirmed by tracing both call paths:

- **Headless path:** `runScenario()` in `scenario_runner.ts` → `runTurn()` loop.
  Never imports or calls anything in `electron-main.cjs`. The new
  `liveReplayManifestFrames` accumulator and `sendReplayManifestToRenderer` are
  dead code on this path. `buildReplayFrameSummary` is already called on the
  headless path for the manifest sidecar — adding it to `desktop_sim.ts` exports
  does not change any call on the headless path.
- **Desktop path:** `ipcMain.handle('advance-turn', ...)` → `sim.advanceTurn()`
  → `desktop_sim.ts::advanceTurn()` → `runTurn()`. The new manifest accumulation
  happens **after** `autoSave()` and **outside** the sim call. `result.state` is
  already finalized; the summary read is purely observational.

No re-floor required. No `control_delta.json` or territory changes.

---

## 5. §6 Risk

**No §6 risk.**

`buildReplayFrameSummary` reads five fields from `GameState`:
- `military.formations[*].status` — active formation count
- `military.casualty_totals_by_faction` — aggregate numbers only
- `displacement.displacement_humanitarian_aggregates.total_displaced` — aggregate
- `political.political_controllers` — faction control counts per OSID
- `meta.turn` / `metadata.date` — turn number and date string

None of these are §6-sensitive paths. The Srebrenica/Žepa rupture events, enclave
guards, and §6 codex paths are not read by the replay summary layer. The
`replay_frame_summary.ts` module carries a `// faction-agnostic` comment and has
no §6-specific conditional logic.

Confirmation: `replay_frame_summary.ts:6–8` documents "BATCH C §3.10: replay
frames are diagnostic-only — `military` and `displacement` sub-objects are widened
to free-form Record reads." No §6 handler, no atrocity-adjacent field read.

**No owner/§6 sign-off required for this wire-in.**

---

## 6. Browser-Bundle / Smoke Triad Risk

**This wire-in touches `desktop_sim.ts` (Node/Electron main process) and
`electron-main.cjs` (Electron main process). It does NOT touch any file imported
by the Vite/browser bundle.**

However, per the #402 lesson (a UI read-model transitively imported a Node-only
module, breaking `desktop:map:build`), the following must be confirmed:

- `replay_frame_summary.ts` — imports: `game_state.ts`, `validateGameState.js`,
  `schema_validators.js`. All are browser-safe (already imported by
  `ReplayScrubber.tsx` which builds cleanly). **Safe.**
- `replay_manifest.ts` — imports only `replay_frame_summary.ts`. **Safe.**

The new exports are added to `desktop_sim.ts`, which is a Node/Electron module
bundled separately from the Vite browser bundle. The browser bundle does **not**
import `desktop_sim.ts`. **No Vite bundle risk.**

**The smoke triad (`tsc --noEmit` + `vitest run` + `desktop:map:build`) must still
be run** as standard practice, but there is no known pathway for this wire-in to
break the browser bundle.

---

## 7. Test Plan

### Existing tests that cover this surface (must remain green)

| Test file | What it pins |
|---|---|
| `tests/replay_payload_mode_contract.test.ts` | Manifest-only vs full-payload mode; harness-side producer contract; final_save byte-identity. No desktop path — stays green. |
| `tests/replay_artifact_ownership.test.ts` | Artifact ownership matrix; `scenario_runner.ts` JSONL/stream gating patterns. No desktop path — stays green. |
| `tests/replay_surface_truth.test.ts` | No standalone replay-loader IPC; preload/electron-main/useIPC shape; `sendReplayManifestToRenderer` called before `sendGameStateToRenderer` on load path; engineering docs aligned. The ordering assertion at line 23–25 pins the LOAD path only — the advance-turn path adds a new call site that does not violate that assertion. **Must verify** this test still passes (it should, since the ordering constraint is on `load-state-dialog` not `advance-turn`). |
| `tests/replay_player.test.ts` | `replayPlayer()` consumer correctness. Unaffected. |
| `tests/replay_frame_summary_schema_boundary.test.ts` | `buildReplayFrameSummary` schema boundary. Adding an export path does not change the function. |
| `tests/replay_save_emit.test.ts` | `buildReplayFrameRow` / `finalizeReplaySaveSequence`. Unaffected. |
| `tests/replay_save_finalizer_artifact_ownership.test.ts` | Finalizer ownership. Unaffected. |
| `tests/ui/replay_scrubber_autoplay.test.ts` | `ReplayScrubber` UI component. Unaffected. |
| `tests/ui/endgame_verdict_screen_mount.test.ts` | VerdictScreen mount. Replay tab hidden when no manifest — should still pass since it tests the no-manifest case. **Verify** it does not assert `hasReplay === false` as an invariant. |

### New tests needed

1. **`tests/desktop_replay_live_accumulator.test.ts`** (unit, vitest)  
   - Import `buildReplayFrameSummary` and `buildReplaySaveManifest` from
     `src/sim/replay/replay_frame_summary.ts` and `src/sim/replay/replay_manifest.ts`
     directly (same as `desktop_sim.ts` will re-export).
   - Simulate 3 fake `GameState` frames; call `buildReplayFrameSummary` on each;
     call `buildReplaySaveManifest` on the accumulated array.
   - Assert `manifest.schema_version === 1`, `manifest.frame_count === 3`,
     `manifest.frames.length === 3`, each frame has `turn`, `date`, `controlByFaction`.
   - Assert result is deterministic: two identical inputs produce identical JSON
     (`JSON.stringify(a) === JSON.stringify(b)`).

2. **`tests/desktop_replay_live_wire_smoke.test.ts`** (source-anchor, vitest)  
   - Read `src/desktop/electron-main.cjs` as a string.
   - Assert `liveReplayManifestFrames` is declared at module scope.
   - Assert `advance-turn` handler body contains `buildReplayFrameSummary` and
     `sendReplayManifestToRenderer`.
   - Assert `start-new-campaign` handler resets `liveReplayManifestFrames`.
   - Assert `load-state-dialog` handler resets `liveReplayManifestFrames`.
   - Pattern follows `replay_surface_truth.test.ts` (read file as string, assert
     content) — same class as the existing surface-truth test family.

3. **`tests/ui/endgame_verdict_replay_tab_live.test.ts`** (UI component, vitest)  
   - Mount `VerdictScreen` with a mock `loadedGameState` that has
     `replaySaveManifest: { schema_version: 1, frame_count: 3, frames: [...] }`.
   - Assert the Replay tab/section is rendered (present in DOM).
   - Complements the existing `endgame_verdict_screen_mount.test.ts` which covers
     the no-manifest (hidden) case.

---

## 8. Build Steps (ordered micro-commits)

### Pre-flight

Run the smoke triad to confirm current baseline:
```
npx tsc --noEmit
npm run test:vitest
npm run desktop:map:build
```

### Commit 1 — Export `buildReplayFrameSummary` + `buildReplaySaveManifest` from `desktop_sim.ts`

**File:** `src/desktop/desktop_sim.ts`  
**Change:** Add two re-exports (2 lines).  
**Risk:** Zero — pure re-export of browser-safe pure functions already used in the browser bundle. No behavioral change.  
**Verify:** `tsc --noEmit` green. `desktop:map:build` green (the exports are Node-side only, no Vite churn).

### Commit 2 — Add `liveReplayManifestFrames` accumulator + reset sites in `electron-main.cjs`

**File:** `src/desktop/electron-main.cjs`  
**Change:**  
- Add `let liveReplayManifestFrames = [];` after line 79.
- Add `liveReplayManifestFrames = [];` in the 3 reset sites: `start-new-campaign`
  (line ~1603), `load-state-dialog` (line ~1617), and menu `Load state file...`
  (line ~776).

**Risk:** Zero behavioral change — the accumulator is module-level state that is
never read yet (the per-turn append is in Commit 3).  
**Verify:** `tsc --noEmit` (`.cjs` files are not type-checked, but imports/structure
should be validated). `vitest run` green (especially `replay_surface_truth.test.ts`).

### Commit 3 — Append frame + emit manifest in `advance-turn`

**File:** `src/desktop/electron-main.cjs`  
**Change:** After `autoSave()` at line 1676, add the 6-line frame-append + manifest
emit block (from §2-B above).  
**Risk:** Low. The only new behavior is `buildReplayFrameSummary(result.state)` (a
pure read-only projection, already proven correct), `buildReplaySaveManifest(frames)`
(a pure array wrap), and `sendReplayManifestToRenderer(JSON.stringify(manifest))`
(an existing renderer-push function already exercised on the load path). If
`sim.buildReplayFrameSummary` is undefined (e.g. stale sim bundle), the guard
`if (liveSummaryFrame)` silently skips — no crash.  
**Verify:** Full smoke triad. Manually start a new campaign in the Electron app and
confirm the Replay tab appears at game-over (or after reaching turn 10+ and loading
the autosave). Also verify that loading an existing save file still works and does
not double-accumulate frames.

### Commit 4 — Tests

**Files:** Three new test files from §7.  
**Verify:** `vitest run` — all new tests pass; all existing replay tests remain
green.

---

## 9. Smoke Triad Note

This wire-in touches `electron-main.cjs` (Electron main process) and
`desktop_sim.ts` (desktop sim bundle). It does **not** touch any file in
`src/ui/map/` or any other file imported by the Vite/Rollup browser bundle.

The #402 browser-bundle break pattern (a UI module transitively importing a
Node-only sim module via `state/exhaustion.ts → game_state.ts →
municipality_population.ts`) **does not apply here** because:
- `replay_frame_summary.ts` is already imported directly by `ReplayScrubber.tsx`
  and is proven browser-safe (it builds in the current bundle).
- The new export is added only to `desktop_sim.ts`, not to any file the Vite
  entry-point imports.

**However, `npm run desktop:map:build` MUST be run** as the third leg of the smoke
triad after every commit in this sequence, per CLAUDE.md Sacred Rules.

---

## 10. Is This a True D2 Prerequisite?

**Assessment: YES, required for D2.**

The D2 gate is "play a full campaign start→Dayton inside the app" (`docs/plans/2026-06-08-v1.0-definition-of-done.md`). The verdict experience is the final deliverable of D2. Without this wire-in, the VerdictScreen will mount with no Replay tab — a clearly incomplete verdict for a 188-week campaign. The consumer side (scrubber, manifest player, map inspection, IPC channels, store slots) is 100% complete. The wire-in is small (one accumulator variable, three reset sites, six lines in `advance-turn`, two re-exports) and calibration-INERT.

**Effort estimate:** 2–3 hours of implementation + testing. No owner/§6 sign-off
required. No re-floor required. No new schema. Desktop-layer only.

---

## Appendix — Files Touched

| File | Change |
|---|---|
| `src/desktop/desktop_sim.ts` | +2 lines: re-export `buildReplayFrameSummary`, `buildReplaySaveManifest` |
| `src/desktop/electron-main.cjs` | +1 var, +3 reset lines, +6 lines in `advance-turn` |
| `tests/desktop_replay_live_accumulator.test.ts` | New unit test (pure functions) |
| `tests/desktop_replay_live_wire_smoke.test.ts` | New source-anchor test (file-as-string) |
| `tests/ui/endgame_verdict_replay_tab_live.test.ts` | New UI mount test (with manifest) |

**No sim engine files touched. No state schema changed. No scenario data changed.
No calibration baseline affected.**
