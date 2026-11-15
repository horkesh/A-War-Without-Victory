## 2026-11-15 — war-or-game retired from panels, gates and routing (owner directive)

Owner directive, 2026-11-15, verbatim: "I want war-or-game removed from all seats. Too often he ignores history, is too cocky... I had to overrule him plenty of times." This extends the May 2026 removal from automatic review.

**What changed (docs and skill text only; no `src/`, `data/`, hook or settings change):**
- `docs/20_engineering/AGENT_WORKFLOW.md`: the broader bright-line panel now names Operations Expert in place of War-or-Game (still eight independent unanimous seats, implementer excluded).
- `.claude/AGENT_TEAM_ROSTER.md`: the mandatory realism sign-off row is replaced by `scenario-creator-runner-tester` (calibration-run analysis and realism, with `historian` ruling on historical fact); a retirement note is added.
- `docs/20_engineering/PYRRHIC_PROCESS_RULES.md`: the engine-touching sign-off names `scenario-creator-runner-tester`.
- Skills `anomaly-triage`, `corps-army-commander` and `gap-finder` route to `scenario-creator-runner-tester` and `historian`; `.claude/skills/war-or-game/SKILL.md` carries a RETIRED header (explicit owner request only) and is not deleted.
- `docs/40_reports/REAL_WAR_MASTER.md`: ownership moves to `historian` and `scenario-creator-runner-tester`; a realism finding must cite a source (BB or ICTY) or a measured run figure; the historian has the final word on historical fact. `docs/40_reports/README.md` and the roadmap RF row owners follow.

**Not done in this change (canon, held for the owner's explicit go-ahead):** the required-seat wording in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (new-rupture sign-off lines and the realism evidence line), `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` (grade-anchor review row) and `docs/10_canon/Game_Bible_v0_9_0.md` (rupture review line) still name `/war-or-game`; a canon edit that changes who sits on a review gate was refused by the permission classifier here. Until they are amended, the bright-line panel in `AGENT_WORKFLOW.md` and those canon lines disagree, and the directive governs. Past §6 records and historical reports that name War-or-Game stay as written.

**No Pyrrhic merge-gate composition is written in `CLAUDE_EXECUTION_STANDARD.md`, `.claude/commands/` or `.claude/agents/`; there was nothing to replace there.**
