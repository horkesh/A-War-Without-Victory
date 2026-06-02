# 2026-06-02 Pyrrhic Parallel Dispatch - Warroom Product Shell

## Orchestrator Decision

Canonical lane: P0 Product-facing alpha hardening / Presidential Command Surface (Warroom)

Owner: Codex overseer / architect

Primary implementer: Pyrrhic UI/UX implementer

Independent reviewers:
- Technical architecture reviewer
- Modern wargame UX reviewer
- QA/browser reviewer
- Process/canon guard reviewer

Demoted or out of scope for this dispatch:
- Brigade, formation, 712, calibration, Tactical Group, and scenario-tuning work
- Runtime simulation changes
- New presidential authority beyond the accepted command model
- Broad docs rewrites beyond reporting implementation results

Done means:
- Warroom has a visible Warroom-only toolbar/dock that mirrors clickable room affordances.
- President's Desk is reachable as a Warroom overlay, not a Warroom replacement.
- Command Surface is reachable from the Desk/briefing folio and is visually tied to presidential command.
- Non-map/non-calendar hotspots open dedicated Warroom-native overlays first.
- Only map/cork board exits to War Map, and only calendar opens advance flow.
- Tutorial/coachmark rendering is disabled in the live UI flow.
- Focused Warroom/UI tests and typecheck pass, or failures are explicitly reported with cause.
- Reviewers sign off on route parity, information architecture, accessibility, and non-collision constraints.

## Dispatch 1 - Warroom Product Shell Implementer

You are the Pyrrhic team UI/UX implementer for the Warroom Product Shell lane. Work in your forked workspace.

Goal: implement the accepted Warroom toolbar/hotspot IA plan without touching simulation, brigade, formation, calibration, Tactical Group, or 712-related work. Claude is working that area; avoid it entirely.

Read first:
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/plans/2026-06-02-warroom-toolbar-hotspot-ia-plan.md`
- `docs/40_reports/PRODUCT_FACING_MASTER.md`
- Current Warroom/UI files under `src/ui/map/components/warroom` and `src/ui/map/App.tsx`

Scope you own:
- Warroom-only player-facing access: create or update a Warroom toolbar/dock that mirrors clickable room affordances.
- Map/cork board and calendar should remain the only Warroom affordances that bypass dedicated Warroom-native overlays.
- Every other hotspot should open a Warroom-native overlay first, not dump the player into Army HQ briefing.
- President's Desk must be reachable as a Warroom overlay, not a full Warroom replacement.
- Command Surface must be reachable from the Desk/briefing folio and should be visually tied to presidential command, not accidentally triggered by unrelated Warroom modals.
- Remove/disable tutorial/coachmark rendering from the live UI flow. Do not do broad dead-code cleanup unless needed for tests.

Likely files, but follow the repo:
- `src/ui/map/App.tsx`
- `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- Optional new component in `src/ui/map/components/warroom/`
- `tests/warroom_shell_layer.test.ts`
- `tests/ui/warroom_shell_accessibility.test.ts`
- Optional focused test for toolbar access

Constraints:
- You are not alone in the codebase. Do not revert existing edits; accommodate them.
- Do not edit docs unless a tiny test-facing note is truly necessary; return implementation details instead.
- Do not touch data, scenarios, sim, canon outputs, brigades, TGs, calibration, or 712.
- Keep changes narrow and player-facing.

Verification to run if available:
- Focused Warroom/UI tests you touched
- `npm.cmd run typecheck`

Return:
- Files changed
- Exact behavior implemented
- Tests run and results
- Remaining gaps or anything the reviewer/orchestrator must decide

## Dispatch 2 - Technical Architecture Reviewer

You are the Pyrrhic technical architecture reviewer. Work read-only unless the orchestrator explicitly authorizes a fix.

Goal: review the Warroom Product Shell implementer's output for architecture, route ownership, and collision risk.

Read first:
- `docs/plans/2026-06-02-warroom-toolbar-hotspot-ia-plan.md`
- `docs/plans/COMMAND_BOARD.md`
- The implementer's changed files and test diffs

Review questions:
- Is Warroom navigation represented by one clear dispatch model rather than scattered click handlers?
- Are toolbar actions and hotspot actions equivalent where they should be equivalent?
- Are map/cork board and calendar the only bypasses?
- Does President's Desk remain an overlay over Warroom?
- Does Command Surface open only from Desk/briefing folio or explicit command affordance?
- Did any edit touch sim, data, brigade, formation, calibration, TG, or 712 areas?
- Are tests focused on behavior rather than brittle class names?

Return:
- Blocking findings with file/line references
- Non-blocking improvements
- Verification commands you ran or reviewed
- Signoff: GO / NO-GO
## Dispatch 3 - Modern Wargame UX Reviewer

You are the Pyrrhic modern-wargame UX reviewer. Work read-only.

Goal: judge whether the implemented Warroom shell reads like an AAA command room rather than a collection of modal shortcuts.

Read first:
- `docs/40_reports/PRODUCT_FACING_MASTER.md`
- `docs/plans/2026-06-02-warroom-toolbar-hotspot-ia-plan.md`
- Implementer's UI changes

Review questions:
- Can a first-time player find President's Desk and Command Surface without tutorial text?
- Does each Warroom affordance make institutional sense: desk, folio, phone, radio, staff table, faction/political surface, chronicle/history, map, calendar?
- Do overlays answer "what is this, what can I inspect, what can I decide, what happens next"?
- Are there confusing Army HQ leaks where the player expected a Warroom-native item?
- Is the toolbar useful without feeling like developer chrome?
- Would image cards improve a specific surface now, or should that wait for the next art pass?

Return:
- Player-facing blocking issues
- AAA polish recommendations ordered by impact
- Any labels or visual hierarchy that need renaming
- Signoff: GO / NO-GO

## Dispatch 4 - QA / Browser Reviewer

You are the Pyrrhic QA/browser reviewer. Work read-only unless explicitly authorized.

Goal: reproduce the main Warroom access paths in browser and confirm the implementation matches the accepted plan.

Browser target:
- `http://127.0.0.1:3002/`

Minimum QA path:
1. Start or continue a campaign.
2. Enter Warroom.
3. Confirm no tutorial/coachmark appears.
4. Use toolbar/dock to open: President's Desk, Command Surface, Diplomacy, Intelligence, Staff, Chronicle, Faction, War Map, Advance.
5. Use matching Warroom hotspots and compare behavior to toolbar/dock behavior.
6. Confirm map/cork board and calendar bypass only to War Map / Advance.
7. Confirm phone and radio do not dump into Army HQ briefing.
8. Confirm closing President's Desk returns to Warroom and does not leave a dangling command strip.
9. Confirm keyboard/focus behavior is minimally sane for overlays and close controls.

Return:
- Browser evidence summary
- Failing paths with reproduction steps
- Screens or DOM observations if useful
- Signoff: GO / NO-GO

## Dispatch 5 - Process / Canon Guard Reviewer

You are the Pyrrhic process and canon guard. Work read-only.

Goal: ensure the implementation is process-clean and does not accidentally change canon, sim, calibration, or Claude-owned lanes.

Review questions:
- Did the implementer stay inside the UI-only lane?
- Were #138/#141, TG, brigade, formation, 712, and calibration areas untouched?
- Are roadmap/command-board docs already adequate for this slice, or is a minimal ledger/board update required after merge?
- Does the implementation claim anything as shipped before tests/browser evidence exist?
- Is the worktree clean enough to merge without dragging unrelated dirty files?

Return:
- Process blockers
- Required closeout docs, if any
- Merge hygiene notes
- Signoff: GO / NO-GO
