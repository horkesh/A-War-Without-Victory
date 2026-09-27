# Agent Workflow

This is the detailed shared execution policy for Codex, Claude, Cursor, and other project agents. Host entrypoints may add model, tool, or hook instructions, but may not weaken this contract.

## Authority and completion

Classify the request before acting:

- A request to plan, explain, diagnose, review, or report status authorizes read-only investigation and that deliverable.
- A request to change, build, fix, or implement authorizes the in-scope implementation steps, checks, targeted corrections, documentation, and any independent review required by risk or project rules.
- Release, publish, push, merge, live activation, canon-authority changes, acceptance-criterion changes, and costly scope expansion require the authority recorded for that action.

For an authorized implementation task, continue through implementation, required checks, diagnosis of failures caused by the change, targeted correction, and independent review where required. Resolve routine reversible choices from project evidence. Ask when authority, acceptance criteria, or costly scope must change; report an unresolved blocker accurately.

## Read by task

Start with the repository entrypoint and runtime skill catalog. Read `.claude/napkin.md` as a routing index and open only the relevant topic archive.

| Task | Governing sources |
|---|---|
| Simulation, state, serialization, AI, combat | `docs/10_canon/CANON.md`; affected phase/system specs; `Engine_Invariants_v0_9_0.md`; `DETERMINISM_TEST_MATRIX.md`; affected code/tests |
| Map, UI, player information | `GUI_MASTER.md` or the relevant map/warroom master; `PLAYER_VISIBLE_STATE.md`; `UI_OWNERSHIP_MATRIX.md`; affected UI tests and real rendered route where presentation changes |
| Calibration, scenario, history | `CALIBRATION_MASTER.md`; scenario plan and provenance; relevant historical source hierarchy; protected anchors and acceptance criteria |
| Release, package, deployment | active release plan; build/package authority; open-gate validator; release and provenance checks |
| Documentation, process, roadmap | active plan when one exists; `COMMAND_BOARD.md` for current priority; `MASTER_ROADMAP.md` for roadmap history; ledger only when dated continuity or a required entry matters |

Do not load all sources for every task. More specific `AGENTS.md` files, canon documents, active plans, and explicit owner instructions take precedence within their scope.

## Canon and protected boundaries

Canon precedence is Engine Invariants > Phase Specifications > Systems Manual > Rulebook > Game Bible > `context.md`. Canonical faction IDs are `RBiH`, `RS`, and `HRHB`.

Preserve deterministic ordering and serialization, GameState ownership, initial-control and authored-data boundaries, save compatibility, campaign provenance, and existing acceptance criteria. No `Math.random()`, wall-clock time, or unstable iteration may enter deterministic simulation state or artifacts.

Edits to `docs/10_canon/FORAWWV.md` require the applicable Pyrrhic panel. The standard §6 panel is exactly Historian, scenario-tester/calibration, Engine/systems, and Red-team. The broader bright-line panel is those four seats plus Game Designer, Narrative Designer, Canon Compliance Reviewer, and War-or-Game: eight independent unanimous seats, with the implementer excluded. See `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` for the operative §6 gate and `docs/10_canon/FORAWWV.md` for the thesis it protects. The panel rules on the delegated §6/enclave questions. A proposal to cross the bright line must still be surfaced to the owner while it is a proposal and must amend the canon statement in the same authorized change.

## Team and review

Use the smallest qualified team. Small reversible administrative work may be handled directly. For nontrivial implementation, default to one implementer and one independent reviewer, with the reviewer covering all relevant lenses. Add a specialist only for a distinct question; required canon seats remain separate.

The lead may inspect evidence, integrate, synthesize, and make routine in-scope decisions. When independent review is required, the implementer must not approve the same implementation. Runtime model names, agent APIs, and concurrency limits belong in host-specific instructions.

The project team is Pyrrhic. Use roles exposed by the current runtime and repo briefs in `.claude/agents/`; do not invent unavailable role or tool identifiers.

## Validation and cost control

Before a long test, build, package, or campaign, state the question, command, pass criteria, expected cost, and stopping rule. Run the cheapest prerequisite checks first. After an unexpected failure, inspect retained evidence, reproduce and correct cheaply, then rerun only the affected expensive gate when it answers a new question.

Choose checks from changed behavior:

- documentation/process-only: focused references, links, Markdown/whitespace and applicable governance checks
- implementation: affected tests, type/static checks and runtime proof proportionate to the change
- territory-moving or calibration-affecting simulation behavior: required full suite, authoritative 188-week run, protected anchors, deterministic artifact/provenance checks, and one change per measured run; focused or shorter runs do not waive these gates
- release/package: required build, inventory, runtime, save-preservation and provenance checks from the active release authority

Reuse unaffected evidence. Passing another check never retires an unmet acceptance criterion.

## Failure, documentation, and closeout

Diagnose the first unexpected failure across all visible categories. Correct the smallest established cause and verify it with the cheapest meaningful check before broadening. Escalate only after a consolidated unresolved diagnosis or when authority must change.

Update `docs/PROJECT_LEDGER.md` for behavioral/output/scenario or adopted process changes when required by repository policy. Put reusable technical knowledge in the existing knowledge ledger or napkin topic; do not create parallel task journals such as `tasks/todo.md` or `tasks/lessons.md`.

Before claiming completion, inspect the final diff, verify every applicable requirement with fresh evidence, report exits/counts/evidence paths, and obtain independent review where required. Keep previous failures and residual gates visible.

## Host enforcement coverage

Repository instructions describe policy; host hooks enforce only where installed and invoked. `.claude/settings.json` currently applies Claude-specific scenario hook checks, including specialist attribution/routing. Codex and Cursor do not acquire that enforcement merely because the file exists. Preserve the hook and its tests unchanged; each active host must document and verify its actual coverage before claiming parity.
