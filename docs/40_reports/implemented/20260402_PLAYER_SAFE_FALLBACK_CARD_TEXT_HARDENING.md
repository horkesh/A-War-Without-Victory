# 2026-04-02 Player-Safe Fallback Card Text Hardening

## Summary

Continued the clean-lane player-truth sweep in `F:\AWWV_exec_clean` by removing another class of smaller but still user-visible leaks: raw fallback labels in cards and detail panels. This slice did not change simulation behavior. It hardened the map shell so missing names no longer fall through to engine identifiers in common player-facing components.

## What Changed

- `src/ui/map/components/CombatSummaryPanel.tsx`
  - most-victorious / heaviest-loss brigade labels now use player-safe brigade fallback text instead of raw formation ids
- `src/ui/map/components/CorpsCard.tsx`
  - corps cards now resolve display names through the player-safe corps-name formatter
- `src/ui/map/components/OOBSidebar.tsx`
  - corps cards use player-safe corps naming
  - mobilization "top pools" now humanize municipality labels instead of printing raw `mun_id`
- `src/ui/map/components/FormationDetail.tsx`
  - elite-loan destination text now uses player-facing corps naming instead of falling back to raw `loaned_to_corps`
- `src/ui/map/components/TacticalCard.tsx`
  - tactical-card title fallback now uses neutral brigade labeling instead of raw formation ids
- `src/ui/map/components/EnclaveDashboard.tsx`
  - enclave names now go through player-safe enclave labeling instead of falling back directly to raw enclave ids
- `tests/ui_player_visibility.test.ts`
  - extended the whitelisted player-visibility suite with a fallback-label regression contract

## Why

After the larger omniscience leaks were reduced, the next remaining problem was product polish with architectural consequences: lots of small panels still treated raw ids as acceptable fallback text. In a strategy game, those little labels are still part of the product truth. If they leak engine identifiers, the UI still feels like a debug shell.

This slice tightens the rule that player-facing text must degrade to:

- a real human label, or
- a neutral safe fallback

Never to raw engine ids.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`24` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Notes

- The execution worktree still cannot run a full React/tsc bundle verification because its dependency setup is incomplete (`react` / Vite plugin packages absent in this clean lane). That is an execution-lane environment issue, not a failure introduced by this slice.
- The important protection for this change is therefore the focused player-visibility test suite plus governance validation.

## Outcome

The map shell is now less likely to "look like Codex wrote it straight from raw state." Corps cards, tactical cards, order summaries, and enclave/loan labels all degrade more gracefully and more truthfully for a player-facing product.
