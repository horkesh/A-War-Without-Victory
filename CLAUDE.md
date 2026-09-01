# CLAUDE.md — A War Without Victory (AWWV)

Deterministic strategic-level simulation of the 1992-1995 Bosnian War. Negative-sum wargame: exhaustion, political collapse, constrained agency — not conquest. Three factions: **RBiH** (ARBiH), **RS** (VRS), **HRHB** (HVO).

## Session Startup (MANDATORY — before any work)

1. Read `.claude/napkin.md` — curated runbook. Internalize silently, curate on read (re-prioritize, merge dupes, cap 10/category). Update during work.
2. Read `docs/PROJECT_LEDGER.md` (latest 80 lines — current state).
3. Read `docs/life_lessons.md` (index) — always read "Recently Violated" and "New Lessons" sections. Then load the topic file(s) relevant to your current task (e.g. `docs/life_lessons/calibration.md` for calibration work, `docs/life_lessons/ui_map.md` for UI work). If about to violate an active lesson, STOP and flag it.
4. If `working-on.md` exists at project root, read it (interrupted task from previous session). Delete after reading.
5. Check crons via `CronList` — reschedule if missing (two required, see napkin §Session Startup).

## Key Commands

```bash
npm run test:vitest          # whole suite, sharded (same gate CI runs)
npm run test:vitest -- <file>  # one file / -t pattern (unsharded)
npx tsc --noEmit             # Typecheck
npm run sim:scenario:run:40w # 40-week calibration scenario
npm run sim:scenario:run:default  # 52-week historical scenario
npm run desktop              # Electron app
npm run dev:map              # Vite tactical map (port 3001)
npm run desktop:map:build    # Build Electron map → dist/tactical-map/
```

Smoke-test triad after every change: `tsc --noEmit` + `vitest run` + `desktop:map:build`.

## Sacred Rules

- **Determinism is sacred**: No `Math.random()`, no timestamps, no `Date.now()` in sim code. Sorted iteration via `strictCompare`.
- **NEVER override initial OSIDs**: Initial OSID control from census/referendum is sacrosanct. Fix engine, OOB, operations, or scenario params instead.
- **NEVER use `avoided_osids_by_faction`**: Banned. Fix bot targeting, OOB stats, or painted targets instead.
- **Canon hierarchy**: Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible > context.md
- **Canonical faction IDs**: `RBiH`, `RS`, `HRHB` only.
- **One change per calibration run**: Change ONE thing, run scenario, compare, sign off. Never bundle.
- **GameState is single source of truth**: `src/state/game_state.ts`.
- **Ops-only attacks**: Brigades NEVER attack independently. All attacks flow through CorpsOperation.
- **Canon edits (incl. `docs/10_canon/FORAWWV.md`) require Pyrrhic-panel sign-off** — convene the appropriate panel (for §6: Historian + scenario-tester/calibration + Engine/systems + Red-team); a unanimous GO is the signature; a BLOCK or split verdict escalates to the owner. Implementer ≠ reviewer.
- **§6, the §6 bright line, and the ENCLAVE GUARD are the panel's to rule on** (owner, 2026-08-12: *"Hand over the enclave guard and bright line to panel as well."* — completing the 2026-06-11 delegation, which had left the enclave guard carved out). The panel rules; it does not escalate these. It decides whether a change touches §6, whether the guard holds (Srebrenica/Žepa fall; Goražde/Bihać/Teočak/Sarajevo core hold), and whether the evidence suffices. Ordinary §6 verdicts are **COMPLIANT / NON-COMPLIANT**; a breach does not merge.
- **Crossing the bright line is possible, and requires a BROADER PANEL** (owner, 2026-08-12: *"Hand over the option to cross it as well, but that requires broader panel."*). The bright line — atrocity is never rewarded; enclave outcomes event-owned per canon **H1.8**; the canon hierarchy — is no longer beyond reach, but it is deliberately expensive to move:
  - **Broader panel = the standard §6 four** (Historian + scenario-tester/calibration + Engine/systems + Red-team) **plus the four seats that own the game's ethic and player experience**: Game Designer, Narrative Designer, Canon Compliance Reviewer, War-or-Game. **Eight seats, unanimous, implementer excluded**, each polled independently rather than briefed toward a conclusion. Anything short of unanimous is a NO.
  - **A crossing must be recorded where the thesis is stated**, not only where the code changed — the relevant canon doc (`docs/10_canon/FORAWWV.md` §IX.6 — H1.8/H1.9/H2.1/H2.4; FORAWWV has no "§6", its headings are roman numerals / `SENSITIVE_HISTORY_DESIGN_GATE.md`, which is where the operative §6 lives / `VICTORY_AND_PYRRHIC_SCORING.md`) is amended in the same change, with the panel's reasoning. A thesis that moves silently in engine behaviour while canon still claims otherwise is the one outcome this rule exists to prevent.
  - **Surface it to the owner as a decision, not as a completed panel outcome.** The delegation makes it *possible* without the owner; it does not make it routine. AWWV's stated thesis is that atrocity is never rewarded and the war is negative-sum — a proposal to change that is a change to what the game is about, and the owner should know it is happening while it is still a proposal.

## Long-Running Work — never idle-wait

- **Never end a turn to narrate waiting.** The owner must not have to ask "status?" for work
  to continue. Background Bash (`run_in_background`) fires a completion notification and
  `Monitor` fires per event — both wake you unprompted.
- **Arm a `Monitor` for anything long**, and grep for BOTH success and failure signatures:
  a filter that matches only the happy path is silent through a crash, and silence is
  indistinguishable from "still running".
- **Do other work while it runs.** If there is none, end the turn silently. Return to the
  owner only for a result, a decision that is genuinely theirs, or completion.
- **Never call a job green from a wrapper's exit code or a partial log.** Read the
  command's own status (`${PIPESTATUS[0]}`, or capture `rc=$?` before piping).
- **Check what CI actually runs before spending hours locally.** `npm run test:vitest`
  routes to the sharded runner CI uses; the unsharded `test:vitest:serial` is ~4x slower
  for identical coverage.

## Branch Hygiene (run after every merge)

Lanes create branches; nothing deletes them. On 2026-09-01 this had reached **40 local /
50 remote** branches, mostly abandoned pointers whose work had already landed by
squash-merge — indistinguishable from genuinely stranded work without an audit.

```bash
npm run repo:branches         # report: STRANDED / ARCHIVED / LANDED
npm run repo:branches:clean   # archive unique work as tags, then delete
```

- **Classify with `git cherry`, never `--no-merged` or `git diff`.** `--no-merged` compares
  ancestry, so a squash-merged branch looks unmerged forever. `git diff main..branch`
  counts *main's own progress* as the branch's differences (it reported 300-1200 changed
  files for branches that had fully landed). Only `git cherry` compares patch IDs.
- **Nothing is deleted unless it has zero unique commits or an `archive/<branch>` tag.**
  Restore with `git switch -c <branch> archive/<branch>`. `--prune` exits non-zero and
  refuses if any branch would lose work.
- Archive tags are pushed to origin, so recovery never depends on one machine.

## Shell & Platform

- **Windows**: Use `;` not `&&` to chain commands in PowerShell.
- **tsx**: Use `node_modules/.bin/tsx` directly (not `npx tsx`). Prefer `npm run test:vitest`.
- **Test runner**: `npm run test:vitest` with NO arguments runs the balanced sharded suite —
  the same gate `.github/workflows/full-suite-and-fingerprint.yml` runs, ~4x faster than
  unsharded for identical coverage. Passing a file or `-t` pattern runs it unsharded, because
  the balanced runner gives each shard an explicit file list and a filter would leave the other
  shards with no tests. `npm run test:vitest:serial` is the unsharded whole-suite escape hatch.
- **Paths**: Always use absolute paths for tool calls.

## Architecture (pointers)

- Sim core: `src/sim/` | State: `src/state/` | Scenarios: `src/scenario/`
- Combat: `src/sim/combat/` | Bot AI: `bot_strategy.ts`, `bot_corps_ai.ts`, `bot_brigade_ai_osid.ts`
- Commander: `src/sim/combat/commander/` (v0.8 corps commander intelligence, 10 files)
- War pipeline: `src/sim/turn_phases/war_phases.ts` (151 steps)
- Desktop: `src/desktop/` | Tactical map: `src/ui/map/`
- Canon: `docs/10_canon/` | Engineering: `docs/20_engineering/` | Reports: `docs/40_reports/`
- Skills: `.claude/skills/` (60+ Pyrrhic team roles)

## Deep Reference (read as needed)

- **Napkin** (runbook): `.claude/napkin.md` — curated rules, backlog, patterns
- **Memory** (project knowledge): `.claude/projects/.../memory/MEMORY.md` — indexed topic files
- **Ledger** (changelog): `docs/PROJECT_LEDGER.md` + `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- **Life lessons**: `docs/life_lessons.md` — hard-won development rules
- **Calibration**: `docs/40_reports/CALIBRATION_MASTER.md`
- **Canon docs**: `docs/10_canon/` — Game Bible, Rulebook, Systems Manual, Phase Specs

## Ledger Protocol

- Append behavioral/output changes to `docs/PROJECT_LEDGER.md`.
- Thematic knowledge to `docs/PROJECT_LEDGER_KNOWLEDGE.md`.
- Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off (convene the appropriate panel; unanimous GO = signature; BLOCK or split verdict escalates to the owner; implementer ≠ reviewer). §6, the bright line, and the enclave guard are the panel's to rule on — see Sacred Rules above.
