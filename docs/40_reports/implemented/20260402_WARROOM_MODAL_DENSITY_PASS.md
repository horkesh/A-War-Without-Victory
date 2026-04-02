# 2026-04-02 - Warroom modal density pass

## Summary

This pass tightened Warroom's shared shell density so the room, modals, and scenario picker stop wasting space through inherited padding and oversized gaps.

## Scope

- `src/ui/warroom/styles/modals.css`
- `src/ui/warroom/warroom.ts`

## What changed

### Shared dialog shell

- reduced `modal-content` max footprint from `90%` to `88%`
- tightened `wr-dialog` padding, heading margin, body margin, row spacing, and action spacing

### Faction overview

- reduced section padding and vertical gaps
- tightened quadrant and warnings spacing
- kept the same information architecture, but stopped the panel from burning vertical space between every block

### Newspaper and magazine shells

- reduced outer padding
- tightened date/subhead/caption spacing
- reduced preview and stats spacing
- narrowed newspaper column gap

### Main menu / scenario picker

- reduced menu card padding
- tightened subtitle and button spacing
- shrank scenario card gap, padding, and image footprint

### Help modal

- reduced max width
- tightened line height so the control list reads like a compact ops card instead of a poster

## Why this mattered

The branch already improved truth and ownership, but the UX still carried a lot of inherited dead air. In strategy UI, whitespace should create hierarchy, not make the product feel under-filled. Tightening the shared shells gives a broad quality lift without inventing new behavior.

## Verification

- `npm.cmd run warroom:build`
- `node_modules\.bin\vitest.cmd run tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-up

- next UI pass should target mounted Army HQ and map-side panels where padding and blank vertical bands still accumulate
- after that, do the wider repo architecture review and convert the best findings into entrypoint and ownership changes
