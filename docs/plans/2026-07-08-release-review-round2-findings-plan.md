# Release Review Round 2 — Findings & Repair Packets

**Date:** 2026-07-08
**Status:** READY FOR EXECUTION — RR2-1/RR2-3/RR2-4/RR2-5 dispatchable now; RR2-2 requires specialist consultation before build; RR2-6..RR2-9 are a measure-first structural register, NOT scheduled work.
**Origin:** Owner directive 2026-07-08 ("examine all the recent commits, as well as whole of the repo; identify weaknesses, edge cases and just plain bad design decisions"). This review audited the merged GUI runway PRs #462–#470 line-by-line at the riskiest points, the working state of `main` after `f547c338b`, and repo structure. Companion prior reviews: `2026-07-06-presidential-gui-decision-access-overhaul-plan.md` (merged), `2026-07-06-command-authority-economy-plan.md` (CA-0 done, CA-1 pending), `2026-07-06-ghost-war-design.md` (seed shipped, surfaces gated).
**What this review CLEARED (for the record):** WP-2's `classifyTurnAftermathWeight` is exemplary — `hasOnlyKeys` shape-guarding (`turnAftermath.ts:249-266`) flips classification to `heavy` even when a NEW field is added, exactly the default-to-heavy contract; WP-5's `tests/ui/lever_single_host_guard.test.ts` exists and is strict; `turn_summaries` is properly capped at 3 (`war_phase_briefing_steps.ts:26`). The packet discipline held across nine PRs in 24 hours.

---

## Part A — Verified receipts (all read on current `main`, 2026-07-08)

| # | Finding | Receipt |
|---|---|---|
| 1 | Pre-WP-8 profiles stay muted forever | `audio_preferences.ts:19-21` new default `{muted:false, masterVolume:0.5}`; `saveAudioPreferences` called ONLY from `SettingsScreen.tsx:159` and persists the WHOLE object — any pre-WP-8 Settings save wrote `muted:true` (old default) into `awwv.audio.preferences.v1` as a "choice"; `normalizeAudioPreferences:37` honors it forever |
| 2 | 65th Protection Regiment permanent warning | `corps_front_sectors_constants.ts:28`: `vrs_main_staff` IS exempt; `brigade_assignment.ts:1535`: `if (isSectorAssignmentExemptCorpsId(fCorpsId) && !isLoaned) continue;` — the regiment starts ON LOAN, bypasses the exemption, no loan-target sector absorbs it → `:1537` warns EVERY campaign; 1,200 men in limbo from turn 1 |
| 3 | ~20k LOC dead code in the hot path | `tsconfig.json` `include: ["src","tests"]`, excludes only storybook/mocks/saved — so `src/_archived/ui_legacy/` (13k+ LOC; `MapApp.ts` 5,471 = largest file in repo) and `src/ui/warroom/` (~7.5k LOC; own `index.html`; imported only by itself; zero matches in `electron-main.cjs`) are typechecked, grepped, and context-loaded by every agent |
| 4 | Napkin failed its own charter | `.claude/napkin.md` = 436,171 bytes (425KB two days prior), vs its own "cap 10/category" rule; mandatory session-start read; in practice ~150 of ~6,000 lines get read |
| 5 | Suspicious append-only queues in the save | 188w final save (`runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json`, 8.5MB): `military.pending_officer_events` = 232KB and `military.narrative_queue` = 192KB at WAR'S END — large for anything named "pending"; unverified whether consumed entries are pruned |
| 6 | Full-state IPC per turn, growing | save 1.3MB (w0) → 8.5MB (w188); `military.formations` 1.9MB, `corps_command` 544KB; `advanceTurnAndSync` ships the full save JSON to the renderer each turn + full `GameStateAdapter` (3,760 lines) rebuild; advance latency grows with the war and has never been measured past the first hour |
| 7 | Untyped main-process business logic | `electron-main.cjs` 3,626 lines of unchecked JS with real rules + duplicated literals (e.g. `FORCE_LAUNCH_COST = 15` at :2351); the four-file "MUST match" comment family is the confession; CA-0 guards the CA constants only |
| 8 | God files | `war_phases.ts` 4,096 (151 steps) · `validateGameState.ts` 3,958 · `GameStateAdapter.ts` 3,760 · `MapContainer.tsx` 3,609 · `scenario_runner.ts` 3,349 · `corps_front_sectors.ts` 3,327 |
| 9 | i18n monoliths = merge-conflict engine | `messages.en.ts` 5,221 + `messages.bcs.ts` 5,188 lines; all nine runway PRs touched both; several needed mid-flight merge commits |
| 10 | WP-2 digest says nothing (cosmetic) | `buildTurnAftermathDigest(_view)` at `turnAftermath.ts:280-284` ignores the view, returns one fixed sentence |

---

## Part B — Repair packets (dispatchable)

Execution rails: every packet inherits the Common Rails of `2026-07-06-presidential-gui-decision-access-overhaul-plan.md` Part A (read-first, premise checks, TDD red-first, full grep-derived suites, honest evidence, ledger+GUI_MASTER-when-UI) **except the scope fence, which is defined per packet below** — RR2-2 and RR2-5(b) are deliberately sim-touching and carry the heavier proof obligations the GUI rails forbid.

### RR2-1 — Audio preference migration (finding 1; UI-only; ~half day)

**Objective:** Players who never chose silence get WP-8's un-mute; players who chose it keep it.

**Scope fence:** `src/ui/map/audio/**`, `tests/**`, docs. Nothing else.

**Steps:**
1. In `audio_preferences.ts`, bump storage to `awwv.audio.preferences.v2` with a load-time migration: read v2; if absent, read v1; if the v1 object is EXACTLY the old default (`muted === true && masterVolume === <old default value — recover it from git history of this file and pin it in a comment>`), treat as never-customized → adopt current defaults; any other v1 shape → carry over normalized as a real choice. Write v2, leave v1 in place (no destructive cleanup; it is one small key).
2. Edge cases the test must pin: v1 `{muted:true, masterVolume:0.7}` (customized volume ⇒ user touched settings ⇒ KEEP muted:true), v1 `{muted:false, ...}` (keep), corrupt v1 JSON (defaults), v2 present (v1 ignored entirely).
3. The known ambiguity — a pre-WP-8 user who deliberately confirmed mute without changing volume is indistinguishable from an untouched default — resolves in favor of UN-muting (they keep one-click mute; the reverse error, a player who never hears the game exists, is strictly worse). State this in a code comment.

**Tests:** extend the WP-8 preferences suite (grep `audio_preferences|audioPreferences` in tests/, run all hits) + new migration cases red-first.
**Acceptance:** all four migration cases test-pinned; `qa:player-experience` green; no console errors on first gesture.

### RR2-2 — The 65th Protection Regiment loan limbo (finding 2; SIM-TOUCHING; consultation-gated)

**Objective:** No formation is permanently unresolvable by the sector pipeline; the campaign does not open with a warning everyone must learn to ignore.

**MANDATORY consultations before any edit (CLAUDE.md):** `corps-army-commander` (brigade_assignment.ts is on its must-consult list), `operations-expert` if the fix touches loan semantics, `formation-expert` for the OOB reading. Historian check on what the 65th actually did (main-staff protection at Han Pijesak/Crna Rijeka — historically NOT a line brigade).

**Investigate first (report before building):** why does the 65th start `on_loan`, and to which corps? Enumerate every other formation that hits `brigade_assignment.ts:1537` at turn 1 across all three factions (run a 2w scenario, collect the warns) — fix the CLASS, not the instance.

**Fix options (pick via the consultation, not by default):**
- **(a) Data:** the 65th should not start loaned — remove/repair the opening loan in the OOB/startup state so the `vrs_main_staff` exemption applies. Smallest blast radius IF historically right.
- **(b) Engine:** loaned exempt-corps formations are absorbed by the loan-target corps' rear-guard/reserve path instead of falling through. More general; more baseline risk.

**Proof obligations (non-negotiable, either option):** one-change-per-run; 188w run with `matched_osids` diff vs the 609 floor + anchors + §6 invariants; `npm run test:baselines` (expect movement if behavior changes — that is a re-bless decision, not a rubber stamp); `engine:health:gate` comparison (ghost/stranded counts should IMPROVE, not just shift); the turn-1 warn count for the fixed class must go to zero and be test-pinned.

**Acceptance:** zero `UNRESOLVED` warns at campaign start for the fixed class; 1,200 men accounted for (reserve, garrison, or sector — visible in ORBAT); calibration verdict explicitly recorded (flat or re-blessed with panel GO).

### RR2-3 — Dead-code excision: `_archived/ui_legacy` + legacy warroom (finding 3; cleanup-discipline; ~1 day)

**Objective:** ~20k LOC leave the typecheck, the greps, and every agent's context.

**Scope fence:** deletions/moves under `src/_archived/**` and `src/ui/warroom/**`, `tsconfig.json`, build configs that reference them, docs. NO live-code edits.

**Steps (cleanup-packet discipline, STOP-and-report on any live consumer):**
1. Tri-scope importer verification (src/tests/tools) for every module in both trees. Known near-misses to resolve explicitly: `WarHasBegunSplash.tsx` and `ui/shared/factionPalette.ts` matched a `ui/warroom` grep — determine whether these are real imports (then STOP for that module) or comments/strings.
2. Check build wiring: no Vite/electron-builder/package.json script may reference `src/ui/warroom/index.html`, `map_viewer_standalone.html`, or anything in `_archived`. If one does, that's a live consumer — STOP and report.
3. Preferred disposition: `git rm` both trees (history preserves them; `_archived` inside `src/` is the worst of both worlds — deleted-but-still-compiled). Acceptable fallback if the owner wants the code visible: move `ui/warroom` into `_archived/` AND add both to tsconfig `exclude` — but say explicitly this keeps the grep/context tax.
4. Proof of deadness: `npm run typecheck` green, `desktop:map:build` green, `desktop:release:check`/package probe green, full vitest green, AND `tools/scenario_runner/run_baseline_regression.ts` byte-identical (pure deletion must not move any artifact).
5. Record the LOC delta in the ledger entry.

**Acceptance:** typecheck wall-time delta reported; zero references to deleted paths anywhere in src/tests/tools/configs; baselines byte-identical.

### RR2-4 — Napkin restructure (finding 4; process/docs; ~half day + standing rule)

**Objective:** The mandatory session-start read becomes a document that a session can actually read.

**Steps (mirror the life_lessons 2026-04-11 restructure):**
1. Split `.claude/napkin.md` into: a ≤400-line INDEX (per-category top-10 rules, one line each, enforcing the existing cap for real) + dated topic archives under `.claude/napkin/` (e.g. `napkin/map_counters.md`, `napkin/qa_gates.md`, `napkin/unreported.md`). Newest-first ordering preserved in the index.
2. Curation pass while splitting: merge the ~30 near-duplicate "unreported/absence" entries into one canonical rule + pointer; archive superseded counter-rendering entries (the 2026-07-05 terrain-compositing rule supersedes several clamp-era ones).
3. Add a hard rule to the index header: an entry added to the index must evict one (cap enforced by count, checked by the napkin skill on read).
4. Update the napkin skill instructions (`.claude/skills/napkin/`) to read INDEX always + topic files on demand, and to enforce the eviction rule.

**Acceptance:** index ≤400 lines; every archived entry reachable from an index pointer; session-start read cost stated in the ledger entry (bytes before/after).

### RR2-5 — "Pending" queue growth audit (finding 5; audit first, fix gated; ~2 hours audit)

**Objective:** Know whether `military.pending_officer_events` (232KB at w188) and `military.narrative_queue` (192KB) prune consumed entries — and cap them if not.

**Steps:**
1. **(a) Read-only audit (dispatch now):** find every producer/consumer of both fields; determine lifecycle (consumed-and-removed vs consumed-and-flagged vs never-consumed); measure entry counts at w2 vs w188 (the run dirs exist: `...40w__c410759aa651b613__w2` and `...188w__acb538b04d79af3c__w188_n39`). Deliver a table: field → producers → consumers → prune path → w2/w188 counts → verdict (BOUNDED / UNBOUNDED / UNBOUNDED-BUT-INTENTIONAL). File as `docs/40_reports/working/20260708_pending_queue_growth_audit.md`. Remember the EH-3 lesson: a "zombie" field can be LOAD-BEARING — the audit recommends, it does not delete.
2. **(b) Fix (only if UNBOUNDED, separate sim-touching packet):** add pruning/cap at the consumer boundary with the full 188w `matched_osids` + `test:baselines` proof obligations (same as RR2-2). Any cap must respect determinism (prune by stable order) and save-compat (older saves with big queues must load).

**Acceptance (a):** the table, with every claim carrying a file:line receipt.

### RR2-10 — Aftermath digest content (finding 10; cosmetic; fold into a diary packet)

Not worth its own dispatch. When the first friction diary touches the quiet-turn flow, upgrade `buildTurnAftermathDigest` to derive one sentence from the view's quiet facts (e.g. supply state, front stability) instead of the fixed string. Keep it one sentence.

---

## Part C — Structural register (findings 6–9; measure-first, NOT scheduled)

These are real design debts, but building any of them now would repeat the mistake this review exists to catch — engineering ahead of played evidence. Each has an explicit TRIGGER; none is dispatched until its trigger fires.

| ID | Debt | Trigger to act | First step when triggered |
|---|---|---|---|
| RR2-6 | Full-save-over-IPC per turn advance (8.5MB late war) + full adapter rebuild | WP-9 diary reports minutes-per-turn degrading with campaign length, OR a measured advance >3s at week 100+ | Instrument first: log advance wall-time (serialize / IPC / parse / adapter / render) per turn in dev builds; then the fix ladder compact-serialization → adapter memoization → delta sync, ONE rung at a time |
| RR2-7 | Untyped business logic in `electron-main.cjs` + `.cjs` handlers; "MUST match" constant families | Next defect traced to a `.cjs` logic divergence, OR post-1.0 hardening window | Extend the CA-0 pattern (static parity guards) to every MUST-match family NOW is cheap and allowed; the full typed-main-process migration waits for post-1.0 |
| RR2-8 | God files (war_phases 4,096 / validateGameState 3,958 / GameStateAdapter 3,760 / MapContainer 3,609 / corps_front_sectors 3,327) | Post-1.0, before any content/DLC lane | Split by ownership seams that already exist in comments (war_phases → phase-group modules; GameStateAdapter → per-surface projections); never as a side effect of a feature PR |
| RR2-9 | i18n monoliths (5,221 + 5,188 lines, touched by every UI PR) | Post-1.0, or the next time two concurrent UI lanes conflict on messages files | Per-surface message modules + build-time merge + the existing CI parity gate pointed at the merged output |

---

## Part D — Sequencing

| Order | Packet | Mode | Blocking? |
|---|---|---|---|
| 1 | RR2-5(a) queue audit | direct, read-only | no |
| 2 | RR2-1 audio migration | direct or builder | no |
| 3 | RR2-3 dead-code excision | builder (cleanup discipline) | no |
| 4 | RR2-4 napkin restructure | direct (napkin skill) | no |
| 5 | RR2-2 65th regiment | consultation → builder | sim-touching: solo lane, one-change-per-run |
| — | RR2-6..9 | register only | trigger-gated |

RR2-1/3/4/5(a) are mutually parallel-safe. RR2-2 must not run concurrently with ANY other sim-touching lane. None of this displaces the actual front of the queue: **WP-9 owner friction diaries and the CA-1 panel remain the next real actions** — this plan exists so the findings are not lost, not to delay play.

## Part E — Ledger/board discipline

Each packet: PROJECT_LEDGER entry with verification evidence; RR2-3 and RR2-4 also update the docs their deletions touch; RR2-2 records its calibration verdict in CALIBRATION_MASTER lineage if a re-bless occurs. COMMAND_BOARD carries this plan's row; GAME_STATE_RATING_MASTER is NOT touched (no grades change until diaries).
