# Skill And Agent Stale Content Sweep

**Date:** 2026-05-24

**Type:** Process/tooling audit and maintenance.

## Scope

Reviewed the live Codex skill layer under `C:\Users\User\.codex\skills`, the repo-shipped Claude skill layer under `.claude/skills`, the Claude agent briefs under `.claude/agents`, and the repo workflow handoff in `docs/20_engineering/AGENT_WORKFLOW.md`.

The trigger was a concrete failure: a generated Claude prompt referenced stale v0.6 canon files because the local `game-designer` skill still named `Game_Bible_v0_6_0.md` and `Rulebook_v0_6_0.md`.

## Findings

1. Multiple role skills referenced old canon filenames: v0.5, v0.6, and v0.7 canon paths.
2. Several process skills referenced old `.cursor` or `.agent` role/napkin paths instead of the current Codex runtime skill list and repo `.claude` briefs.
3. Some skills assumed a root `CLAUDE.md` as the project-standard source; current Codex runs should rely on active developer instructions plus repo docs such as `COMMAND_BOARD.md` and `docs/20_engineering/*`.
4. The high-risk stale skills were exactly the ones used for prompt construction and canon review: `game-designer`, `canon-compliance-reviewer`, `gameplay-programmer`, `determinism-auditor`, `systems-programmer`, `qa-engineer`, `scenario-report`, and `orchestrator`.

## Changes Made

- Updated live Codex skills under `C:\Users\User\.codex\skills` to use current v0.9 canon paths and the command-board dispatch layer.
- Updated repo-shipped `.claude/skills` to replace stale v0.5/v0.6/v0.7 canon paths with current v0.9 canon paths.
- Updated scenario-report setup guidance to read `.claude/napkin.md`, `docs/life_lessons.md`, `docs/plans/COMMAND_BOARD.md`, and `GAME_STATE_RATING_MASTER.md`.
- Updated process QA to check command-board awareness, not just generic context/napkin awareness.
- Updated `docs/20_engineering/AGENT_WORKFLOW.md` to stop pointing at `.cursor/AGENT_TEAM_ROSTER.md` as the current roster authority and to identify `.claude/agents/` plus runtime-exposed skills as the working role layer.

## Current Canon Path Set

The skill layer now points to:

- `docs/10_canon/CANON.md`
- `docs/10_canon/context.md`
- `docs/10_canon/Game_Bible_v0_9_0.md`
- `docs/10_canon/Rulebook_v0_9_0.md`
- `docs/10_canon/Engine_Invariants_v0_9_0.md`
- `docs/10_canon/Phase_Specifications_v0_9_0.md`
- `docs/10_canon/Systems_Manual_v0_9_0.md`
- `docs/10_canon/War_Specification_v0_9_0.md`
- `docs/10_canon/HISTORICAL_TIMELINE_MASTER.md`
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`
- `docs/10_canon/WAR_TERMINATION_SPEC.md`
- `docs/10_canon/PLAYER_TURN_GUIDE.md`

## Verification

Ran stale-reference scans over the live Codex skills and repo-shipped Claude skills for old canon paths and old role paths. Remaining hits are intentional compatibility/examples only:

- `using-git-worktrees` still checks `CLAUDE.md` as one possible repo instruction file, alongside `AGENTS.md` and `.codex/*`.
- `receiving-code-review` keeps a negative example phrase containing `CLAUDE.md`.
- `writing-skills` mentions `~/.agents/skills` only as an older-doc warning.
- `visual-explainer` says not to assume `.cursor/skills/...` exists.
- `orchestrator` mentions `.agent/skills-catalog.md` only as a fallback when runtime skill metadata is unavailable.

## Future Rule

Before writing prompts, handoffs, or agent instructions that cite canon files, run a live path check against `docs/10_canon/`. Skills are helper memory, not authority.
