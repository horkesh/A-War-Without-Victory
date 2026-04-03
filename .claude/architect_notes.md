# Architect Notes

Purpose: repo-local architect board for active findings, accepted direction, and outstanding infrastructure. This is not a session log. Keep it current enough that prompt generation and review do not depend on chat memory.

## Current Product Direction

- The player is the faction president.
- Default play is presidential:
  - strategic guidance
  - reserve allocation
  - plan approval / denial
  - directives to Army HQ / corps
  - selective intervention
- Direct brigade-level control is exceptional override, not baseline fantasy.
- Operations are the spikes of excitement.
- Events, delegation, reserve decisions, and command review are the tension between spikes.

## Accepted Findings

### Wrong Now

- Command abstraction is still not fully singular across engine, UI, and reports.
- Sector semantics still need finishing: sectors must remain frontlines, not slide back into territory buckets.
- Reporting/activity truth still has proxy-driven surfaces that can drift from canonical phase outputs.
- Warroom / Army HQ / Tactical Map shell ownership is improved but not finished.

### Strong Systems To Push Harder

- Operation preparation is one of the game's signature mechanics and should remain central.
- Army-level reserve loans create real scarcity and presidential decision weight.
- Constrained institutional command is the game's core identity and should shape future UX/mechanics.
- Best 10x direction: make operations + sectors + command review the center of play.

## Active / Recent Accepted Lanes

- `3a80f60a` map-first usability restoration
- `962414fc` player-knowledge integrity wave 1
- `25cea9ea` presidential command doctrine codification
- `1ae662de` presidential shell language + roadmap reminder
- `a8c982c9` army HQ presidential shell behavior
- `992328de` command authority vertical slice
- `dcdc5156` first full presidential command-review loop
- `c0e3eea8` first playable between-ops presidential decisions
- `37698eb5` + `f4cfe051` player-knowledge integrity wave 2

## Next Priority Lanes

1. Finish behavior-level shell ownership so Warroom, Army HQ, and Tactical Map feel like one coherent presidential product.
   - React WarroomShellLayer foundation is in place (2026-04-03): scene plate + hotspot overlays + regionToShellHandoff mapping, activated by `?view=warroom`. warroom.ts canvas still active.
   - Runtime wiring DONE (2026-04-03): `REACT_SHELL_ENABLED=true` in warroom.ts — on campaign start, iframe loads with `?embedded=1&view=warroom`; React WarroomShellLayer is now the active room-navigation surface. Hotspot click sends handoff directly to iframe (no reload). Back-to-HQ posts `awwv-shell:show-warroom` to iframe; React sets `appScreen='warroom'` without scene swap. Legacy canvas path preserved under `REACT_SHELL_ENABLED=false`. Report: `docs/40_reports/implemented/20260403_WARROOM_REACT_SHELL_ENTRY.md`.
   - Wave 2 consolidation DONE (2026-04-03): canvas render loop gated (self-stops when React owns room, restarts on legacy reversion); canvas mouse handlers gated (no dual hotspot ownership); scene plate + flag HTMLImageElement loading skipped (React uses static Vite imports); `wall_calendar_area` hotspot wired to `advance-turn` ShellHandoffCommand; `AdvanceTurnModal` created and wired into App.tsx; `advanceTurnPending` in gameStore. Report: `docs/40_reports/implemented/20260403_WARROOM_REACT_MIGRATION_WAVE2.md`.
   - NEXT (final deletion pass): once React path is validated in Electron production, delete `renderLoop()`, `loadScenePlateAssets()`, `loadFlagAssets()`, `onMouseMove()`, `onClick()` canvas methods from warroom.ts, and remove `REACT_SHELL_ENABLED` flag entirely. Main menu / side picker / scenario picker stay in warroom.ts HTML.
2. Canonicalize live runtime assets to `webp` where intended; remove/archive duplicate PNG twins from live UI paths and keep PNG only for raw/archive/generated/docs contexts unless explicitly justified.

## Closed Lanes

- Make Command Authority legible inside command review / override flow: CLOSED 2026-04-03.
  - `CommandRecord` in `OperationBriefingModal` is the canonical four-part surface.
  - `commander_assessment_at_launch` is the permanent decision-time snapshot.
  - `ForceLaunchBadge` is demoted to legacy fallback.
  - See `docs/40_reports/implemented/20260403_PRESIDENTIAL_COMMAND_REVIEW_LOOP.md`.

- Continue player-knowledge integrity beyond adapter wave 1: CLOSED 2026-04-03.
  - RawIntelTab removed from normal play.
  - Threat assessment now uses uncertainty-qualified language and bucketed confidence.
  - Remaining candidate later: own-sector force-balance precision in `CorpsFrontPanel`.
  - See `docs/40_reports/implemented/20260403_PLAYER_KNOWLEDGE_INTEGRITY_WAVE2.md`.

- Use event-layer presidential decisions to fill between-operation dead zones: CLOSED 2026-04-03.
  - Strategic Posture Review + Visit to the Front shipped for all 3 factions.
  - EventModal already had correct presidential wording.
  - See `docs/40_reports/implemented/20260403_PRESIDENTIAL_BETWEEN_OPS_EVENTS.md`.

## Infrastructure / Process Watchlist

- `tools/architect/` is now landed and usable as the canonical repo-local architect-to-executor handoff system. Future cleanup should focus on ergonomics and reliability, not whether the system exists.
- Do not rely on chat memory for accepted findings or next lanes; update this file when major architect decisions change.
- Bundle roadmap-memory follow-ups into Claude prompts when they are part of the same lane.
- Explorer findings should be summarized here after review instead of staying only in chat.
- Live Warroom/runtime asset rule: current runtime already imports `.webp` for backgrounds, crests, flags, scenario plates, and wall-map frame. Cleanup target is residue and tooling drift, not a runtime panic. Check `src/ui/warroom/assets` duplicate `.png` twins, `src/ui/warroom/vite.config.ts` MIME handling, and PNG-centric Warroom tooling/docs before claiming the asset pipeline is clean.

## Open Questions

- Which remaining player-facing surfaces still leak staff certainty or internal jargon?
- Which Warroom behaviors should move under React shell ownership first while preserving the authored room and hotspot map?
