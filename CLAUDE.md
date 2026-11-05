# CLAUDE.md — A War Without Victory

AWWV is a deterministic strategic simulation of the 1992–1995 Bosnian War. It is a negative-sum wargame about exhaustion, political collapse, and constrained agency. Canonical factions are `RBiH`, `RS`, and `HRHB`.

Read [AGENT_WORKFLOW.md](docs/20_engineering/AGENT_WORKFLOW.md) for the shared execution contract and [CLAUDE_EXECUTION_STANDARD.md](docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md) for Claude-specific routing. Read `.claude/napkin.md` as an index, then load only relevant topic files.

## Hard boundaries

- Canon precedence: Engine Invariants > Phase Specifications > Systems Manual > Rulebook > Game Bible > `context.md`.
- Determinism: no `Math.random()`, wall-clock time, timestamps, or unstable ordering in deterministic simulation state/artifacts; use `strictCompare` where ordered output requires it.
- `src/state/game_state.ts` owns GameState truth. Preserve serialization, save compatibility, and protected data/control boundaries.
- Never override initial OSID control or use `avoided_osids_by_faction`; resolve the underlying engine, OOB, operation, or scenario issue.
- Brigades attack only through `CorpsOperation`.
- Calibration changes remain one change per measured run. Preserve required full-suite, 188-week, anchor, provenance, and acceptance gates.
- FORAWWV and sensitive-history changes retain their applicable unanimous Pyrrhic panels, independent seats, §6/enclave delegation, broader bright-line panel, same-change canon record, and owner proposal visibility described in `AGENT_WORKFLOW.md` and canon.
- Packaging remains paused until its recorded owner gates permit product package work.

## Task routing

- Simulation/state: affected canon/specs, invariants, determinism matrix, code and tests.
- Map/UI: relevant GUI/map/warroom master, player-visible-state, UI ownership, and rendered evidence for presentation changes.
- Calibration/history: calibration master, active scenario plan/provenance, source hierarchy, protected anchors.
- Release: active release plan, open gates, build/package/provenance authorities.
- Documentation/process: active plan or board/roadmap as needed; ledger only when continuity or an entry is required.
- Prior failure patterns: consult `docs/life_lessons.md` and only its relevant topic when the task could repeat a recorded mistake; this is not a blanket startup read.
- Repository/branch maintenance: use the safeguards below when branch inventory, cleanup, or post-merge hygiene is requested.

## Key Commands

```bash
npm run test:vitest
npm run test:vitest -- <file>
npx tsc --noEmit
npm run sim:scenario:run:188w
npm run sim:scenario:run:40w
npm run desktop
npm run dev:map
npm run desktop:map:build
```

Select commands from the changed behavior; the smoke triad is not a documentation-only gate. Before long work, verify runtime prerequisites and success/failure selectors, retain logs, and use the command's own exit status. On this Windows host, scenario/release Bash checks require Git Bash where their paths use MSYS syntax.

## Host-specific enforcement and tools

`.claude/settings.json` scenario hooks enforce Claude-specific specialist attribution/routing. Preserve them unchanged. Their presence does not establish Codex or Cursor parity.

The local executor is a bounded proposal tool. Claude owns repository writes, repo-derived expectations, verification, and verdicts. Use `npm run local:check` for availability. Prove applied proposals with `npm run gate:local -- --tests <files>`; see [tools/local_executor/README.md](tools/local_executor/README.md) for procedures, schemas, context limits, ledger use, and benchmark evidence.

Architecture entrypoints: simulation `src/sim/`; state `src/state/`; scenarios `src/scenario/`; desktop `src/desktop/`; tactical map `src/ui/map/`; canon `docs/10_canon/`; engineering `docs/20_engineering/`; reports `docs/40_reports/`.

## Repository and Branch Maintenance

When branch inventory, cleanup, or post-merge hygiene is in scope, use `npm run repo:branches` to classify and `npm run repo:branches:clean` for the guarded cleanup route.

- Classify squash-landed work with `git cherry`, not `--no-merged` or `git diff main..branch`; ancestry and main's later changes misclassify squash merges.
- Delete a branch only when it has zero unique commits or an `archive/<branch>` recovery tag.
- Restore archived work with `git switch -c <branch> archive/<branch>`; keep archive tags on the remote so recovery does not depend on one machine.
- A guarded prune must refuse rather than lose unique work.
