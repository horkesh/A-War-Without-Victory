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
- Player-visible truth still needs additional tightening beyond adapter wave 1.
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

## Next Priority Lanes

1. ~~Make Command Authority legible inside command review / override flow, not just as toolbar gauge + button tax.~~ **CLOSED 2026-04-03** — `CommandRecord` section in `OperationBriefingModal` is the canonical four-part surface (commander recommendation + presidential decision + CA cost + op state). `commander_assessment_at_launch` snapshot field flows game_state → electron-main → OperationAAR → adapter → both modal and history panel. `ForceLaunchBadge` demoted to legacy fallback. See `docs/40_reports/implemented/20260403_PRESIDENTIAL_COMMAND_REVIEW_LOOP.md`.
2. ~~Continue player-knowledge integrity beyond adapter wave 1 where live shell still overstates staff certainty.~~ **CLOSED 2026-04-03** — RawIntelTab demoted (exact force ratio/casualties/defense strength removed from normal play); generateThreatAssessment uses uncertainty-qualified language (STRENGTH_DISPLAY map + describeConfidence bucketing); 6 regression tests added to player_knowledge_integrity.test.ts. Remaining candidate: ThreatBadge ratio.toFixed(2) in CorpsFrontPanel (own-sector force balance — wave 3). See `docs/40_reports/implemented/20260403_PLAYER_KNOWLEDGE_INTEGRITY_WAVE2.md`.
3. Finish behavior-level shell ownership so Warroom, Army HQ, and Tactical Map feel like one coherent presidential product.
4. ~~Use event-layer presidential decisions to fill between-operation dead zones.~~ **CLOSED 2026-04-03** — Strategic Posture Review + Visit to the Front shipped for all 3 factions (6 recurring events, war_1993.json). Pressure-driven, `turn_min: 84`, escalating options on 3rd+ fire. Fills 29-turn and 20-turn gaps. EventModal label was already correct. See `docs/40_reports/implemented/20260403_PRESIDENTIAL_BETWEEN_OPS_EVENTS.md`.

## Infrastructure / Process Watchlist

- `tools/architect/` exists locally and is currently untracked. Verify whether Claude is building the repo-local architect→executor handoff system there and land or discard it intentionally.
- Do not rely on chat memory for accepted findings or next lanes; update this file when major architect decisions change.
- Bundle roadmap-memory follow-ups into Claude prompts when they are part of the same lane.
- Explorer findings should be summarized here after review instead of staying only in chat.

## Open Questions

- ~~What is the next smallest truthful command-review slice after Command Authority?~~ Answered: `commander_assessment_at_launch` snapshot + `CommandRecord` UI section. Closed 2026-04-03.
- Which remaining player-facing surfaces still leak staff certainty or internal jargon?
- ~~Which between-ops presidential events should ship first as pure content with zero engine risk?~~ Answered 2026-04-03: Strategic Posture Review + Visit to the Front. Patron Pressure Response → v0.8.2. Commander Confidence Crisis → v0.8.1.
