# Repository Agent Entry Points

Use the runtime-provided `orchestrator` skill for cross-domain coordination and efficiency policy. Resolve it through the active skill catalog rather than a machine-specific path. The shared execution contract is [AGENT_WORKFLOW.md](docs/20_engineering/AGENT_WORKFLOW.md); load its task-specific references only when they apply.

Preserve canon, determinism, data integrity, protected control/data/save boundaries, and every check required by affected production behavior. Canon hierarchy and approval panels remain authoritative. Required canon panels and distinct review seats are mandatory exceptions to the default small-team policy.

For an authorized implementation task, continue through implementation, required checks, diagnosis of failures caused by the change, targeted correction, and independent review where required. Small reversible administrative work may be handled directly. Resolve routine reversible choices from project evidence. Ask when authority, acceptance criteria, or costly scope must change; report an unresolved blocker accurately. A request for a plan or review alone does not authorize implementation.

More specific `AGENTS.md` files override this entrypoint within their directories.

Read only the entry points relevant to the task:

- simulation/state: canon index, affected phase/system specs, engine invariants, determinism matrix
- map/UI: GUI or map master, player-visible-state and UI-ownership authorities
- calibration/history: calibration master, scenario provenance, governing historical sources
- release: release plan, packaging/build authority, open gates
- documentation/process: `.claude/napkin.md`, active plan/board/roadmap, and ledger only where continuity matters

Documentation and process-only changes use focused documentation checks instead of the general smoke triad; genuinely specific repository checks still apply. Use existing reports and the project ledger rather than creating duplicate process artifacts.
