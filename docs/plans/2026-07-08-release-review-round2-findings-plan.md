# Release Review Round 2 - Actionable Repair Plan

**Date:** 2026-07-08
**Status:** FULLY EXECUTED for all dispatchable RR2 work authorized by this plan, including the post-closeout continuation that repaired the later 52w 65th loan lifecycle drift and refreshed the affected baseline hashes. RR2-1, RR2-2, RR2-3A, RR2-3B asset-history cleanup, RR2-4, RR2-5, and RR2-7A are implemented with tests/proofs; RR2-6, RR2-8, RR2-9, and RR2-10 remain trigger-gated structural work outside this execution pass.
**Origin:** Owner directive 2026-07-08: examine recent commits and the broader repo for weaknesses, edge cases, and bad design decisions. This plan supersedes the first RR2 draft where it incorrectly treated `src/ui/warroom` as dormant/dead code.

## Part A - Corrected Findings Register

| ID | Finding | Current verdict | Primary receipts |
|---|---|---|---|
| RR2-1 | Pre-WP-8 audio preference profiles can remain muted forever | FIXED | v2 migration implemented in `src/ui/map/audio/audio_preferences.ts`; v1 exact old default un-mutes, custom v1 values migrate, corrupt v1 falls back safely. |
| RR2-2 | 65th Protection Regiment loan limbo | FIXED | `docs/40_reports/working/20260708_65th_protection_regiment_loan_limbo_investigation.md`: recent sector-exempt active loans and column-deploying elites no longer emit transient unresolved warnings; late/final sector rescue accounts for loaned elites that reach receiving-corps territory. Dynamic active-loan redeploy was tested and rejected after 188w engine-health regression. |
| RR2-3A | `_archived/ui_legacy` is dead code inside `src/` | FIXED | Sandbox slice/scenario utilities were extracted to `src/ui/map/sandbox/`, `tests/sandbox_slice_determinism.test.ts` was retargeted, deadness was re-proven, and `src/_archived/ui_legacy` was removed. |
| RR2-3B | `src/ui/warroom` cleanup was misclassified | PARTIAL CLEANUP COMPLETE | `docs/40_reports/working/20260708_warroom_live_surface_decision_audit.md`: Warroom shell remains live; asset-history dirs `assets/_old` and `assets/raw_sora` were proven non-runtime and removed. |
| RR2-4 | Napkin failed its own charter | FIXED | `.claude/napkin.md` compact index is <=400 lines with linked topic archives; repo-local and active global napkin skill updated to bounded-index behavior. |
| RR2-5 | Pending queue growth | PARTIAL FIX + NO-GO RECORDED | `docs/40_reports/working/20260708_pending_queue_growth_audit.md`: `narrative_queue` is capped to the most recent 128 entries. `pending_officer_events` pruning was attempted, then reverted because unacknowledged non-player/headless rows are command lifecycle/dedupe state and pruning caused 188w engine-health regression. |
| RR2-6 | Full-save IPC and adapter rebuild grows with war length | MEASURE FIRST | 188w saves are ~8.9 MB; no late-war advance latency breakdown exists. |
| RR2-7 | Untyped main-process business logic and duplicated constants | RR2-7A FIXED | Static parity guard now fails on local force-launch literals, and `electron-main.cjs` uses the imported shared `FORCE_LAUNCH_COST`. |
| RR2-8 | God files | REAL; post-1.0 refactor only | `war_phases.ts`, `validateGameState.ts`, `GameStateAdapter.ts`, `MapContainer.tsx`, `scenario_runner.ts`, and `corps_front_sectors.ts` are large shared surfaces. |
| RR2-9 | i18n monoliths cause merge friction | REAL; post-1.0 or conflict-triggered | `messages.en.ts` and `messages.bcs.ts` exceed 5k lines and are touched by most UI lanes. |
| RR2-10 | Turn Aftermath digest is generic | REAL but cosmetic | `buildTurnAftermathDigest(_view)` ignores the view. Fold into a diary-driven quiet-turn packet. |

## Part B - Execution Rails

Common rails for every packet:

1. Start with `git status --short --branch`.
2. Confirm scope before editing. If a file outside the packet scope is required, stop and record why.
3. Use red-first tests for behavior changes; for docs/process changes, use explicit diff/search verification.
4. Preserve determinism: no timestamps in generated outputs, stable ordering for any new pruning/cap logic, no random iteration.
5. Update `docs/PROJECT_LEDGER.md` with scope, verification, and determinism statement.
6. If a packet changes UI/read-model behavior, update `docs/40_reports/GUI_MASTER.md` or the relevant master report when status changes.
7. If a packet changes sim behavior or persisted output, run the packet-specific baseline/engine-health gates before closeout.

## Part C - Dispatchable Packets

### RR2-1 - Audio Preference v1 to v2 Migration

**Objective:** Players who never chose silence get WP-8's unmuted default; players who made a real preference choice keep it.

**Scope:** `src/ui/map/audio/**`, audio/settings tests, docs/ledger only.

**Steps:**
1. In `audio_preferences.ts`, introduce `awwv.audio.preferences.v2` while keeping the v1 key exported for migration/tests.
2. Load order: v2 first; if absent, read v1; if v1 is exactly the old default `{ muted: true, masterVolume: 0.5 }`, treat it as untouched and return current defaults; otherwise normalize and carry the v1 value forward.
3. Save normalized migrated values to v2 on load or first save. Do not delete v1.
4. Add a short comment naming the ambiguity: a user who deliberately accepted old mute at exactly 0.5 is indistinguishable from untouched default; the product chooses unmute because silent-by-accident is worse and mute remains one click.

**Tests:**
- Extend `tests/ui/audio_preferences.test.ts` and any settings preference tests.
- Required cases: v2 present ignores v1; exact old v1 default migrates to unmuted current default; v1 muted with custom volume stays muted; v1 unmuted stays unmuted; corrupt v1 returns defaults and does not throw.
- Run all grep hits for `audio_preferences|audioPreferences|AUDIO_PREFERENCES_STORAGE_KEY`, then `npm.cmd run qa:player-experience`.

**Acceptance:** Migration cases are pinned; no autoplay/gesture regression; ledger states UI-only/no persisted sim output impact.

### RR2-3A - Delete Archived Legacy UI From `src`

**Objective:** Remove archived legacy tactical UI from typecheck and agent context without touching live runtime paths.

**Scope:** `src/_archived/ui_legacy/**`, `tsconfig.json` only if deletion is not accepted, references/docs/ledger. No live `src/ui/map`, `src/ui/warroom`, sim, state, or desktop edits.

**Steps:**
1. Prove deadness with searches over `src`, `tests`, `tools`, `package.json`, `.github`, and desktop packaging config for `_archived/ui_legacy`, `MapApp.ts`, `tactical_sandbox`, and legacy viewer entrypoints.
2. If any live import/build/runtime reference exists, stop and convert to a decision note.
3. Preferred action: `git rm src/_archived/ui_legacy`. Fallback only if deletion is rejected: add `src/_archived/**` to `tsconfig.exclude`, and state that grep/context tax remains.
4. Record file count, LOC count, and typecheck wall-time before/after.

**Tests:**
- `npm.cmd run typecheck`
- `npm.cmd run desktop:map:build`
- `npm.cmd run desktop:release:check`
- `npm.cmd run test:baselines` byte-identical, because deletion must not move sim artifacts.
- `git diff --check`

**Acceptance:** No references to deleted paths in live/build/test/tool config; baseline artifacts byte-identical; ledger records LOC and timing delta.

### RR2-4 - Napkin Index and Topic Archive Restructure

**Objective:** Make the mandatory session-start runbook readable and enforce its cap.

**Scope:** `.claude/napkin.md`, `.claude/napkin/**`, repo-local `.claude/skills/napkin/**` if present, active Codex skill at `C:/Users/User/.codex/skills/napkin/SKILL.md` if the user wants Codex behavior changed immediately, docs/ledger. No canon edits.

**Steps:**
1. Snapshot current byte/line counts.
2. Convert `.claude/napkin.md` into an index no longer than 400 lines: category headers plus top-10 rules per category, one compact rule each, each with "Do instead".
3. Move historical/detail material into topic archives under `.claude/napkin/` such as `qa_gates.md`, `unreported.md`, `map_counters.md`, `release_process.md`, and `engine_runtime.md`.
4. Merge duplicate absence/unreported rules into one canonical index rule with archive pointers.
5. Add an index header rule: adding an index entry requires evicting or demoting another entry in that category.
6. Update the napkin skill instructions to read the index always and topic files only on demand. If updating the active global Codex skill is not desired, state that repo-local restructuring alone will not change Codex session-start behavior.

**Tests:**
- Scripted count check: index line count <= 400 and every archive linked from the index exists.
- Search for orphan topic archive files not linked from index.
- `git diff --check`.

**Acceptance:** Session-start read is bounded; every archive is reachable; ledger records before/after bytes and whether global skill behavior was updated.

### RR2-5A - Pending Queue Growth Audit

**Objective:** Determine whether `military.pending_officer_events` and `military.narrative_queue` are bounded, intentionally historical, or leaking.

**Scope:** Read-only audit plus report at `docs/40_reports/working/20260708_pending_queue_growth_audit.md`. No code changes in this packet.

**Steps:**
1. Enumerate all producers, consumers, UI readers, validators, migrations, and IPC handlers for both fields.
2. For each field, classify lifecycle as consumed-and-removed, consumed-and-flagged, never-consumed, or historical-log-by-design.
3. Measure counts and JSON byte size at w2 and w188 using the existing run dirs.
4. Sample representative entries to identify whether old entries remain actionable, acknowledged, historical, or never read.
5. Deliver a table: field, producers, consumers, prune path, w2 count/bytes, w188 count/bytes, verdict, recommended next packet.

**Tests/verification:**
- Report must carry file:line receipts for every lifecycle claim.
- `git diff --check`.

**Acceptance:** Audit report exists with a verdict for each field. Any pruning/cap work becomes a new sim-touching packet with deterministic stable-order pruning, save compatibility proof, 188w comparison, and `npm run test:baselines`.

### RR2-7A - Main-Process Constant Parity Guards

**Objective:** Reduce `.cjs` business-logic divergence risk without starting a full typed-main-process migration.

**Scope:** Static/parity tests and minimal handler cleanup for duplicated command-authority constants. No behavior change.

**Steps:**
1. Inventory duplicated "MUST match" constant families in `src/desktop/*.cjs`, `src/ui/map/desktop/useIPC.ts`, and shared contract helpers.
2. Add or extend a static parity test that fails when a command-authority cost literal is reintroduced in an Electron handler instead of using `autonomy_ipc_contract.cjs`.
3. Replace the local `const FORCE_LAUNCH_COST = 15` in `electron-main.cjs` with the already imported shared constant if the focused test proves parity.
4. Record all remaining `.cjs` duplication families as follow-up rows, not drive-by refactors.

**Tests:**
- Focused parity/static test.
- `npm.cmd run typecheck`
- Relevant desktop IPC/runtime contract tests.
- `git diff --check`.

**Acceptance:** No runtime behavior changes; parity guard catches the current duplicated literal if reverted; ledger states no simulation/output drift.

## Part D - Consultation-Gated Packet

### RR2-2 - 65th Protection Regiment Loan Limbo

**Objective:** No campaign-start formation should be permanently unresolvable by the sector pipeline, and no warning should become accepted background noise.

**Required consultations before edit:** formation expert for OOB semantics, operations expert for loan semantics, corps/army command expert for sector assignment behavior, historian check for the 65th Protection Regiment's intended historical role.

**Investigation before fix:**
1. Run a short scenario and capture every `brigade_assignment] UNRESOLVED` warning at turn 1 and turn 2 across all factions.
2. Identify why `rs_65th_protection_motorized_regiment` starts `on_loan`, who receives it, and whether its garrison/main-staff role should be sectorless, rear/security, or loan-target reserve.
3. Enumerate every other loaned exempt-corps formation and whether it hits the same class.

**Fix options to choose after consultation:**
- Data fix: remove/repair the opening loan if the regiment is main-staff protection and should remain covered by the `vrs_main_staff` exemption.
- Engine fix: loaned exempt-corps formations route into the receiving corps rear/security/reserve path when historically and mechanically valid.
- UI/reporting fix only: acceptable only if the warning is proven harmless and the formation is accounted for elsewhere; must still remove routine noisy warning.

**Proof obligations:**
- One change per run.
- Focused regression proving the fixed class has zero campaign-start warnings.
- 188w comparison versus current floor: `matched_osids`, anchors, consistency failures, stranded/ghost counts.
- `npm run test:baselines`; any artifact movement requires explicit re-bless decision.
- `engine:health:gate` comparison if that script is available in current package scripts; otherwise document the exact substitute command.

**Acceptance:** Fixed class has zero start warnings; 1,200 personnel are accounted for in ORBAT/reserve/garrison/sector truth; calibration verdict is recorded.

## Part E - Live Warroom Decision Audit

### RR2-3B - Warroom Live-Surface Retirement or Reaffirmation Decision

**Objective:** Stop paying accidental maintenance tax for unclear Warroom ownership, without breaking desktop startup or packaged release.

**Status:** Not a deletion packet. `src/ui/warroom` is live until this audit proves and replaces its product/runtime role.

**Steps:**
1. Inventory every live dependency: `package.json` scripts, electron-builder resources, `electron-main.cjs` protocol/startup/probe paths, GitHub workflows, tests, tools under `tools/ui/warroom_*`, and docs master reports.
2. Classify current Warroom responsibilities: startup shell, main menu/new campaign, embedded tactical map host, priority docket, packaged runtime proof, old player-facing modal system, debug/map viewer.
3. For each responsibility, choose one disposition: keep, migrate to `src/ui/map`, retire with replacement, or archive as developer-only.
4. Produce a decision report with one recommended path:
   - Reaffirm and rename as live desktop shell, then reduce dead submodules only.
   - Migrate startup shell to tactical map app, then remove Warroom after package probe and desktop startup contracts are rewritten.
   - Split developer-only map viewers from player Warroom and exclude only the developer-only branch from release builds.
5. Only after that decision report may a deletion/migration implementation packet be created.

**Verification for audit:** `git diff --check`; file:line receipts for every live path; no runtime code edits.

**Stop gate:** Any proposed deletion of `src/ui/warroom` before replacing `desktop:release:check`, electron-builder `dist/warroom`, `awwv://warroom/index.html`, packaged probe `warroomIndex`, and related tests is a hard NO-GO.

## Part F - Trigger-Gated Structural Register

| ID | Debt | Trigger to act | First action |
|---|---|---|---|
| RR2-6 | Full-save IPC per turn and full adapter rebuild | WP-9 diary reports late-campaign turn advance friction, or measured week 100+ advance exceeds 3 seconds | Instrument serialize, IPC, parse, adapter, and render timing in dev builds; do not optimize before measuring. |
| RR2-8 | God files | Post-1.0 hardening window or a feature touches one of these files enough to justify ownership extraction | Split along existing ownership boundaries with no behavior changes and byte-identical proof where sim is touched. |
| RR2-9 | i18n monoliths | Post-1.0 or the next concurrent UI conflict on `messages.en.ts` / `messages.bcs.ts` | Introduce per-surface message modules and a build-time merge/parity gate. |
| RR2-10 | Generic aftermath digest | A diary identifies quiet-turn comprehension as top-three friction | Add one view-derived sentence; keep it cosmetic and one sentence. |

## Part G - Sequencing

1. RR2-5A queue audit - read-only, fastest risk clarification.
2. RR2-1 audio migration - direct UI bug fix.
3. RR2-3A archived legacy UI deletion - cleanup only after deadness proof.
4. RR2-4 napkin restructure - process/readability fix.
5. RR2-7A parity guard - small hardening slice, no behavior change.
6. RR2-2 65th regiment - solo sim-touching lane after consultations.
7. RR2-3B Warroom decision audit - can run in parallel with docs/read-only work, but implementation waits for decision.

Current release priority remains unchanged: WP-9 owner friction diaries and the CA-1 panel remain ahead of speculative polish. RR2 packets exist to remove known hazards without displacing the D2 path.

## Part H - Ledger and Board Discipline

Each packet closeout updates:

- `docs/PROJECT_LEDGER.md` with verification and determinism/scope.
- `docs/plans/COMMAND_BOARD.md` if status, next action, stop gate, or sequencing changes.
- `docs/plans/MASTER_ROADMAP.md` only for roadmap-level reclassification or release-gate implications.
- Relevant master report (`GUI_MASTER`, `WARROOM_MASTER`, `CALIBRATION_MASTER`) only when that domain's live truth changes.

`docs/10_canon/FORAWWV.md` is not in scope for this plan.

## Part I - Execution Closeout 2026-07-08

Completed packets:

1. **RR2-1 audio migration:** implemented `awwv.audio.preferences.v2` with v1 migration and tests.
2. **RR2-2 65th loan lifecycle diagnostics:** unresolved diagnostics now treat recent sector-exempt active loans and active column deployments as lifecycle-owned transition state; final seal runs loaned-elite rescue before unresolved warnings. A dynamic active-loan redeploy variant was tested and rejected after 188w engine-health regression. The 2w proof and strict post-rebless baseline proof no longer emit `UNRESOLVED rs_65th_protection_motorized_regiment`.
3. **RR2-3A archived UI deletion:** extracted the deterministic sandbox slice/scenario utilities to `src/ui/map/sandbox/`, updated the live test import, re-proved no `_archived/ui_legacy` references outside the deleted tree, and removed the archived tree.
4. **RR2-3B Warroom asset cleanup:** reaffirmed the Warroom shell as live packaged startup code, then removed only the non-runtime asset-history directories `src/ui/warroom/assets/_old` and `src/ui/warroom/assets/raw_sora`.
5. **RR2-4 napkin restructure:** replaced the oversized mandatory runbook with a bounded index and linked topic archives; updated repo-local and active global napkin skill instructions.
6. **RR2-5 queue lifecycle:** capped `narrative_queue` to the latest 128 entries. Attempted stale non-player/headless `pending_officer_events` pruning was reverted and documented as a no-go until a tombstone/archive design preserves command lifecycle/dedupe semantics.
7. **RR2-7A CA parity guard:** changed the main-process force-launch path to use the imported shared `FORCE_LAUNCH_COST`; static guard catches a reintroduced local literal.

Residual trigger-gated work:

- RR2-6 full-save IPC instrumentation waits for diary/perf evidence.
- RR2-8 god-file splits wait for post-1.0 or a touching feature branch.
- RR2-9 i18n module split waits for post-1.0 or a real merge-conflict trigger.
- RR2-10 aftermath digest copy waits for diary evidence that quiet-turn comprehension is top-three friction.

Important closeout note: the continuation repaired the later 52w active-loan diagnostic issue and performed the explicit baseline-refresh decision. `UPDATE_BASELINES=1 npm.cmd run test:baselines` refreshed the `apr1992_52w` artifacts after the intentional diagnostic/final-sector output change; strict `npm.cmd run test:baselines` then passed with no `UNRESOLVED rs_65th`, no `ENOENT`, and no baseline mismatch. Fresh 188w engine health passed (`dead_ops=12`, `matched_osids=646`, `pass=true`). Further persisted-output movement still requires a new explicit baseline-refresh decision.

Closeout verification commands are recorded in `docs/PROJECT_LEDGER.md`.
