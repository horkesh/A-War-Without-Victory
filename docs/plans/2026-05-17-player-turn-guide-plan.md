# Player Turn Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document the playable presidential turn loop and the surfaces that block, inform, or support advance-turn decisions.

**Architecture:** Produce a player-facing guide aligned to current Decision Room, Inbox, Army HQ, Warroom, and advance-turn review ownership.

**Tech Stack:** Markdown guide, UI/read-model contract references, optional docs static tests.

---

## Files

- `docs/20_engineering/GUI_MASTER.md`
- `docs/30_planning/`
- `src/ui/map/components/PresidentialDecisionRoom.tsx`
- `src/ui/map/data/inboxItems.ts`
- `src/state/player_decision_manifest.ts`
- `tests/player_decision_manifest.test.ts`
- `tests/ui/presidential_decision_room.test.ts`
- `tests/ui/pre_advance_command_review.test.ts`

## Implementation Tasks

1. Inventory current player-turn surfaces: Decision Room, Presidential Inbox, Army HQ, Warroom, Operations Planning, diplomacy, convoys, paramilitary, and advance-turn review.
2. Draft guide around what the player can decide, inspect, defer, and what blocks turn advancement.
3. Cross-check every blocking decision family against `player_decision_manifest.ts`.
4. Add static/doc tests if the repo already validates docs; otherwise link exact UI owners and manifest entries.
5. Update GUI docs and roadmap/backlog.
6. Add ledger entry. This is docs-only unless tests are added.

## Verification

- `npx.cmd vitest run tests/player_decision_manifest.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/pre_advance_command_review.test.ts`
- `npm.cmd run typecheck`
- Optional: `npm.cmd run canon:check`

## Documentation And Ledger

- Add guide under `docs/30_planning/` or the player-facing docs area chosen by maintainers.
- Update `docs/20_engineering/GUI_MASTER.md` links.
- Add `docs/PROJECT_LEDGER.md` docs/process entry.

## Stop Gates

- Stop if the guide invents a new UI owner instead of documenting existing Decision Room/Warroom/Army HQ ownership.
- Stop if it describes direct brigade control as the default loop.
