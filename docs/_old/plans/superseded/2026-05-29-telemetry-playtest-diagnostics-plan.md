# Telemetry / Playtest Diagnostics — Local-First Execution Plan

**Date:** 2026-05-29
**Status:** READY (planning only — no code, no run, no commit; network egress GATED on a separate provider+privacy decision)
**Owner lane:** Platform / Telemetry (`platform-specialist`)
**Reviewers:** `devops-specialist`, `qa-engineer`, `determinism-auditor`
**Expands:** `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 5 (the ~30-line stub)
**Source policy memo:** `docs/40_reports/audits/20260517_TELEMETRY_CONSENT_POLICY_DECISION.md`
**Source impl skeleton:** `docs/plans/2026-05-17-telemetry-crash-reporting-plan.md`
**Command-board row:** `docs/plans/COMMAND_BOARD.md:44` — P2 Telemetry/playtest diagnostics, status ACTIVE.

> Command-board contract (verbatim, `COMMAND_BOARD.md:44`):
> - **Verification/Proof:** "Telemetry tests, no-network/default-off proof."
> - **STOP GATE:** "External upload/aggregation without provider and privacy decision."

---

## 1. Objective & Why

Build a **local-first, default-OFF** playtest-diagnostics sidecar that captures the data a designer needs to understand *player comprehension and friction* during a playtest session — which decisions the player makes, how long turns take, where they stall or back out — **without** ever touching the deterministic simulation core and **without any network egress**.

**Why it matters:** AWWV is a dense negative-sum strategy game whose comprehension burden (events, operations, supply, sectors) is its primary adoption risk. Right now we capture *what the sim did* (decision log, replay sidecars) but not *how the human interacted with the shell*: nothing records that the player stared at the event modal for 90 seconds, opened the operation predictor three times, or repeatedly cleared and re-staged orders. That UX-friction signal is the gap this lane closes. It is the prerequisite evidence base for the P3 gold playtest pass.

This plan deliberately scopes to **capture + local storage + export/clear UI only**. Upload/aggregation is a separate, gated decision (§8).

## 2. Scope & Non-Scope

**In scope:**
- A renderer-side typed diagnostics emitter + bounded in-memory queue (tactical-map shell).
- A main-process **wall-clock** turn-timing capture wrapped around the `advance-turn` IPC handler (`src/desktop/electron-main.cjs:1582`) — outside the sim.
- Local-only persistence to a dedicated JSONL file in Electron `userData/` (NOT inside `settings.json`, NOT inside any save).
- A single default-OFF master flag (`diagnosticsEnabled: false`) added to `DEFAULT_SETTINGS` (`src/desktop/settings_store.cjs:8`).
- Settings UI controls: opt-in toggle, export, clear, status text, all working offline.
- Redaction helper (strip usernames/paths/free-form text before anything is written).
- A no-network upload **stub** that returns a typed disabled result and is never called by default.
- Tests: opt-in gate, default-off, redaction, queue bounds, no-network, determinism static scan.

**Non-scope (do NOT bundle):**
- **NO network egress of any kind.** No `http`/`https`/`net`/`fetch`/`dgram` import in any telemetry module. (STOP GATE.)
- **NO provider selection, NO aggregation, NO upload wiring** — gated on §8.
- **NO sim-core changes.** Nothing in `src/sim/`, `src/state/`, `src/scenario/`. No new persisted GameState field; no save-migration version bump.
- **NO general gameplay analytics beyond the approved shape** (memo §"Approved Data Shape"). No raw saves, no scenario dumps, no political/historical player notes.
- **NO GUI shell layout changes** owned by the GUI branch — only additive Settings controls.
- **NO crash-reporting redesign** — crash capture from the 2026-05-17 plan may share the queue substrate but is a parallel concern; this plan focuses on *playtest friction* events. Reuse the queue/redaction primitives if both land, but do not block on crash capture.

## 3. Current-State Findings (verified against code)

**Already captured (do NOT duplicate):**
- **Player decisions are already in-sim**: `state.military.event_decision_log[]` (`src/state/game_state.ts:2275-2281`) records every event resolution with `decision_source: 'player'`, `event_id`, `response_id`, `faction`, `turn`. This is append-only and deterministic. Diagnostics should *reference* this (e.g. via `event_id` + `turn`) for cross-correlation, not re-derive it.
- **Replay sidecars** stream `GameState[]` per turn via `replay-sequence-updated` / `replay-manifest-updated` (`src/desktop/preload.cjs:6-8,38-43`). These give end-of-turn sim state but carry **no wall-clock timing** and **no shell-interaction signal**.
- **Settings persistence exists**: `src/desktop/settings_store.cjs` writes `userData/settings.json` with `DEFAULT_SETTINGS` (line 8). It already has `debugMode: false`. This is the correct owner for the default-OFF flag.
- **Wall-clock outside sim is already established precedent**: `save-game` uses `new Date().toISOString()` in the main process (`src/desktop/electron-main.cjs:1631`). This proves wall-clock in the Electron main/UI layer is acceptable — it is *outside* the deterministic sim boundary.

**Playtest signals that are MISSING (this lane fills these):**
- Per-turn wall-clock duration (how long the human deliberated + how long the sim ran). Natural hook: wrap `sim.advanceTurn(...)` at `src/desktop/electron-main.cjs:1615`.
- Modal/panel dwell + open counts (event modal, operation predictor `query-operation-prediction`, supply paths, codex) — renderer-only.
- Order churn (stage → clear → re-stage cycles) as a confusion proxy — renderer-only, derived from the `stage-*` / `clear-orders` IPC surface (`preload.cjs:60-86`).
- Blocked-advance friction: `advance-turn` already returns `pending_required_decisions` (`electron-main.cjs:1600-1612`) — count how often the player hits this gate.

**Determinism baseline confirmed clean:** sim core has only legitimate `Math.random`/`Date.now` occurrences in the LLM-advisor sidecar (`src/sim/ai_commander/anthropic_client.ts`) and bot files; the deterministic turn pipeline (`src/sim/turn_phases/war_phases.ts`) is the boundary we must not cross. A static scan test already pattern exists (`tests/political_dimensions_snapshot.test.ts` and siblings demonstrate the diagnostic-test convention).

## 4. Design

### 4.1 The determinism boundary (drawn explicitly)

```
  +-------------------- DETERMINISTIC CORE (PURE) --------------------+
  |  src/sim/  src/state/  src/scenario/                             |
  |  - no Date.now, no Math.random, no wall-clock, no timers         |
  |  - produces event_decision_log[], replay sidecars (canon)        |
  +------------------------------ ↑ reads only ----------------------+
                                  | (diagnostics may READ post-turn
                                  |  state by reference: turn #, event_id;
                                  |  NEVER writes sim state)
  +========================= DIAGNOSTICS SIDECAR ====================+
  |  src/ui/map/services/diagnostics/  (renderer)                    |
  |  src/desktop/diagnostics_store.cjs  (main, local file I/O)       |
  |  - wall-clock timing (performance.now / Date.now) LIVES HERE     |
  |  - bounded queue, redaction, JSONL persist to userData/          |
  |  - default OFF; no-network; upload = disabled stub               |
  +==================================================================+
```

**The rule:** diagnostics is strictly downstream and write-only-to-disk. It may **read** `state.military.event_decision_log[]` and turn numbers to correlate, but it **never** feeds any value back into the sim, RNG, save/load, or scenario diagnostics (memo §"Explicit Exclusions", `20260517_TELEMETRY_CONSENT_POLICY_DECISION.md:43`). Because no diagnostics value ever re-enters `src/sim/`, scenario hashes are provably untouched (§7).

### 4.2 Capture surface

| Signal | Where captured | Layer | Wall-clock? |
|---|---|---|---|
| `turn_timing` (turn #, deliberation ms, sim-run ms, blocked flag) | wrap `advance-turn` handler | main | yes (outside sim) |
| `decision_dwell` (event_id, modal open→resolve ms, reopen count) | event modal component | renderer | yes (`performance.now`) |
| `panel_open` (panel id, open/close, dwell ms) | shell panel mounts | renderer | yes |
| `order_churn` (stage/clear counts per turn) | IPC call interception in shell service | renderer | no (counts) |
| `blocked_advance` (count of `pending_required_decisions`) | `advance-turn` result handler | renderer/main | no |

Each event is a flat record: `{ schema_version, session_id (anon, per-launch), app_version, platform, kind, turn, payload, t_ms }`. `t_ms` is session-relative wall-clock (`performance.now` delta), never an absolute timestamp tied to identity.

### 4.3 Local storage

- New main-process module `src/desktop/diagnostics_store.cjs` (mirrors `settings_store.cjs` shape) writes append-only JSONL to `userData/diagnostics/playtest-<session>.jsonl`.
- Bounded: cap event count per session (e.g. 5000) and total file size; oldest-dropped ring behavior in the renderer queue before flush.
- **Gated entirely on `diagnosticsEnabled === true`.** If false, the emitter is a no-op, no file is created, no queue grows.

### 4.4 Default-OFF flag

Add `diagnosticsEnabled: false` to `DEFAULT_SETTINGS` (`settings_store.cjs:8`). The renderer reads it via the existing `get-settings` IPC (`electron-main.cjs:2515`). Off is the only default. Enabling is an explicit, affirmative Settings action (EDPB consent basis, memo §"Research Basis").

### 4.5 No-network guarantee

`telemetryUploadAdapter` exposes one function returning `{ ok: false, reason: 'disabled' }` and contains **zero** network imports. A test asserts the module's import graph has no `http`/`https`/`net`/`fetch`/`dgram` (§6). Gameplay and save/load never depend on upload (matches `2026-05-17-telemetry-crash-reporting-plan.md:84-88`).

## 5. Step-by-Step Implementation (discrete commits)

> Each commit is independently typecheck-green + test-green. Commit only when the session is authorized; otherwise report staged file list + message.

**Commit 1 — default-OFF flag + settings plumbing.**
- `src/desktop/settings_store.cjs`: add `diagnosticsEnabled: false` to `DEFAULT_SETTINGS`.
- Test `tests/telemetry_default_off.test.ts`: assert `DEFAULT_SETTINGS.diagnosticsEnabled === false` and that a fresh `loadSettings(app)` returns false.
- Commit: `feat(telemetry): add default-off diagnostics flag to settings`.

**Commit 2 — redaction helper.**
- `src/ui/map/services/diagnostics/diagnosticsRedaction.ts`: strip absolute paths, usernames, free-form strings; whitelist only approved fields (memo §"Approved Data Shape").
- Test `tests/telemetry_redaction.test.ts`: paths/usernames/notes are dropped; approved fields pass.
- Commit: `feat(telemetry): add diagnostics redaction helper`.

**Commit 3 — bounded queue + emitter (renderer).**
- `src/ui/map/services/diagnostics/diagnosticsQueue.ts`: typed emitter, ring buffer, hard cap, flush API; **no-op when flag off**.
- Test `tests/telemetry_queue.test.ts`: opt-in gate (off → no records), bounds (cap enforced, oldest dropped), redaction-on-enqueue.
- Commit: `feat(telemetry): add bounded local diagnostics queue`.

**Commit 4 — local store (main, file I/O).**
- `src/desktop/diagnostics_store.cjs`: JSONL append to `userData/diagnostics/`, bounded, `loadDiagnostics`/`appendDiagnostics`/`clearDiagnostics`/`exportDiagnostics`; flag-gated; mirror `settings_store.cjs` error handling.
- New IPC handlers in `electron-main.cjs` (after `save-settings`, ~line 2532): `diagnostics:append`, `diagnostics:export`, `diagnostics:clear`, `diagnostics:status`; expose in `preload.cjs`.
- Test `tests/telemetry_store.test.ts`: flag-off writes nothing; clear empties; export round-trips; bounds enforced.
- Commit: `feat(telemetry): add local-first diagnostics store and IPC`.

**Commit 5 — turn-timing capture (main, outside sim).**
- In `advance-turn` (`electron-main.cjs:1582`): capture `const t0 = Date.now()` before `sim.advanceTurn` (line 1615), `t1` after; if `diagnosticsEnabled`, append a `turn_timing` record (turn #, sim-run ms, blocked flag from the existing `pending_required_decisions` branch). **No sim signature changes; sim return value untouched.**
- Test `tests/telemetry_turn_timing.test.ts`: timing record only when flag on; sim result object byte-identical regardless of flag.
- Commit: `feat(telemetry): capture wall-clock turn timing outside sim`.

**Commit 6 — renderer capture wiring (dwell / churn / blocked).**
- Hook event-modal dwell, panel open/close, order-churn counts, blocked-advance counts into the queue via the shell service. Renderer-only.
- Test `tests/telemetry_capture_wiring.test.ts`: each kind enqueues correctly under flag-on; nothing under flag-off.
- Commit: `feat(telemetry): wire playtest friction capture in shell`.

**Commit 7 — Settings UI controls.**
- Settings component (discover exact file via `rg -n "getSettings|saveSettings" src/ui/map`): add opt-in toggle, export button, clear button, status text + consent copy from memo §"Proposed Consent Copy". Offline-safe.
- Test `tests/ui_settings_diagnostics_controls.test.ts`: toggle persists; export/clear call IPC; copy present; works without network.
- Commit: `feat(telemetry): add diagnostics opt-in/export/clear settings controls`.

**Commit 8 — no-network upload stub + guard test + docs.**
- `src/ui/map/services/diagnostics/diagnosticsUploadAdapter.ts`: returns `{ ok: false, reason: 'disabled' }`; zero network imports.
- Test `tests/telemetry_no_network.test.ts`: static import-graph scan of all `diagnostics/` modules + `diagnostics_store.cjs` asserts no `http`/`https`/`net`/`dgram`/`fetch`/`axios`/`undici`.
- Docs: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` (diagnostics sidecar + determinism boundary), `docs/PROJECT_LEDGER.md` (behavioral/output change — note: cannot affect sim determinism), implemented report under `docs/40_reports/implemented/`.
- Commit: `feat(telemetry): add no-network upload stub and egress guard test`.

## 6. Test Plan

- **Default-off proof** (Commit 1): default flag is false; fresh load is false.
- **Opt-in gate** (Commits 3,5,6): flag-off → zero records, no file created, no queue growth.
- **Redaction** (Commit 2): paths/usernames/free-form text stripped; only approved fields survive.
- **Queue bounds** (Commit 3): cap enforced, oldest dropped, no unbounded memory.
- **No-network proof** (Commit 8): static import-graph scan — **the command-board STOP-GATE evidence**.
- **Determinism static scan**: assert no `src/sim/`, `src/state/`, `src/scenario/` file is modified by this lane (`git diff --stat` restricted to those dirs is empty); assert no telemetry value is imported by any sim module (grep `diagnostics` imports from `src/sim` → none).
- **Sim-output invariance** (Commit 5): `sim.advanceTurn` result identical with flag on vs off; ideally a focused scenario-hash check confirming a short headless run hash is unchanged by the presence of the diagnostics flag (the headless runner never imports the desktop diagnostics sidecar, so this is a sanity assertion).

Verification commands:
```powershell
npx.cmd vitest run tests\telemetry_default_off.test.ts tests\telemetry_redaction.test.ts tests\telemetry_queue.test.ts tests\telemetry_store.test.ts tests\telemetry_turn_timing.test.ts tests\telemetry_capture_wiring.test.ts tests\ui_settings_diagnostics_controls.test.ts tests\telemetry_no_network.test.ts --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:map:build
git diff --check
git diff --stat -- src/sim src/state src/scenario   # must be EMPTY
```

## 7. Determinism Boundary (CRITICAL — proof sim is untouched)

- **No diagnostics value ever re-enters the sim.** The sidecar is downstream-only (§4.1). Therefore no scenario output, RNG draw, ordering, or save byte can depend on it.
- **All wall-clock (`Date.now`/`performance.now`) lives in the Electron main process and the renderer**, never in `src/sim/`. Precedent: `save-game` already uses `new Date().toISOString()` in main (`electron-main.cjs:1631`). The headless scenario runner (`src/scenario/scenario_runner.ts`) does not load the desktop diagnostics sidecar at all.
- **No new persisted GameState field, no save-migration bump.** Diagnostics is a separate `userData/diagnostics/` file, not part of any save; load/save schema and validator are untouched.
- **Static guard** (§6): a test fails the build if any `src/sim`/`src/state`/`src/scenario` file is touched or if any sim module imports a diagnostics module.
- **Smoke triad** (`tsc --noEmit` + `vitest run` + `desktop:map:build`) plus the empty-`git diff --stat` over sim dirs is the deterministic-safety evidence.

## 8. Privacy / Egress Gate (what must be decided before ANY upload)

Until a separate decision lands, **no network code ships** (STOP GATE, `COMMAND_BOARD.md:44`). The following must be decided/approved before the upload stub is replaced with anything real:
1. **Provider selection** (where data goes; jurisdiction; retention).
2. **Privacy/consent wording** for *upload* specifically — distinct from the local-capture consent already approved (memo §"Approval status": upload requires a **second** approval).
3. **PII boundary re-confirmed for the wire**: even though local records are pre-redacted, the upload schema must re-assert exclusion of saves, scenario dumps, usernames, paths, free-form/political/historical player notes (memo §"Explicit Exclusions").
4. **Withdrawal mechanism** as easy as consent (EDPB), incl. delete-already-uploaded path.

This plan ships everything up to and including the disabled stub; the stub is the seam a future, separately-approved lane fills.

## 9. Risks

- **Network egress leak** → mitigated by the static import-graph guard test (Commit 8) and the disabled-by-construction stub. **STOP GATE.**
- **PII leak in local records** → mitigated by redaction-on-enqueue (Commit 2) + whitelist-only field policy + tests.
- **Determinism leak** → mitigated by the downstream-only architecture + empty-`git diff --stat` over sim dirs + sim-output-invariance test. The single highest-risk spot is the `advance-turn` timing hook (Commit 5): it must wrap, never alter, `sim.advanceTurn`.
- **Settings-file collision** → diagnostics events go to a *separate* `userData/diagnostics/` file; only the boolean flag lives in `settings.json`, so a corrupt diagnostics file cannot break settings load.
- **Unbounded disk/memory** → ring buffer + file-size/event caps + flag-off no-op.
- **GUI-branch collision** → additive Settings controls only; no shell layout changes.

## 10. Rollback

Each commit is independently revertible. Full rollback = revert Commits 1–8: deletes the `diagnostics/` service dir, `diagnostics_store.cjs`, the IPC handlers, the timing wrap, and the `diagnosticsEnabled` flag. No save-migration, no schema, no sim change to unwind — zero blast radius on existing saves or scenario hashes.

## 11. Dependencies

- **Depends on:** the already-approved default-off local-first consent policy (`20260517_TELEMETRY_CONSENT_POLICY_DECISION.md`, accepted 2026-05-17).
- **Blocks / unblocks:** P3 gold playtest pass (provides the friction-evidence base). Does **not** unblock any upload/aggregation work — that is gated on §8.
- **Must not collide with:** the active GUI shell branch (Settings layout) and any calibration run (no sim files touched, so hash-neutral by construction).

## 12. Owner

Platform / Telemetry lane (`platform-specialist`). Reviewers: `devops-specialist` (build/IPC), `qa-engineer` (test coverage + no-network proof), `determinism-auditor` (sim-boundary sign-off).

## 13. Definition of Done

- `diagnosticsEnabled: false` default added; opt-in toggle + export + clear + status controls present and offline-safe.
- Local JSONL capture working for all five signal kinds; bounded; flag-gated.
- Turn-timing captured in main process, sim result proven byte-identical flag-on vs flag-off.
- **No-network proof test green** (import-graph scan, zero network imports) — STOP-GATE evidence.
- **Determinism proof:** `git diff --stat -- src/sim src/state src/scenario` empty; no sim module imports diagnostics; smoke triad green.
- Redaction tests + queue-bounds tests + default-off test green.
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, implemented report, and `docs/PROJECT_LEDGER.md` updated (noting telemetry cannot affect sim determinism and upload remains gated).
- `COMMAND_BOARD.md:44` row updated (next action → "upload provider+privacy decision" once local-first lands); Phase 5 of `2026-05-24-p2-p3-readiness-execution-plan.md` marked superseded by this detailed plan.
- **NOT done / explicitly deferred:** any upload, provider, or aggregation (gated on §8).
