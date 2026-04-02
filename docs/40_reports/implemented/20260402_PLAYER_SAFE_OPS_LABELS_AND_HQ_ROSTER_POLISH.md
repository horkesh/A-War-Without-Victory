# Player-Safe Ops Labels and HQ Roster Polish

Date: 2026-04-02  
Branch: `codex/engine-health-wave1`

## Why

Even after the larger shell/player-truth cleanup, a few player-facing surfaces were still leaking internal identifiers:

- OPORD documents printed raw OSIDs for staging and schwerpunkt
- objective list hover titles exposed raw OSIDs
- Army HQ ORBAT recent-engagement hover titles still carried raw OSIDs
- the Army HQ war summary still had one stale fallback reference that could break the non-player-faction branch later

These are small leaks, but they add up into a UI that feels like an engine console instead of a command shell.

## What changed

### 1. Operation documents now use player-safe settlement labels

Added:

- `src/ui/map/components/ops_modal/opordDisplay.ts`

This pure helper resolves:

- staging labels
- objective labels
- schwerpunkt labels

through shared display names before the OPORD renders.

### 2. OPORD / objective list no longer expose raw OSIDs

Updated:

- `src/ui/map/components/ops_modal/OpordDocument.tsx`
- `src/ui/map/components/ops_modal/AuthorizePhase.tsx`
- `src/ui/map/components/ops_modal/ObjectiveList.tsx`

The player-facing operation-planning shell now speaks in settlement names rather than engine IDs.

### 3. Army HQ ORBAT engagement hover titles are player-safe

Updated:

- `src/ui/map/components/army_hq/OrbatSection.tsx`

Recent-engagement rows no longer leak a raw OSID in the hover title.

### 4. Army HQ summary fallback bug corrected

Updated:

- `src/ui/map/components/army_hq/WarSummaryContent.tsx`

The wounded-row fallback branch now uses the canonical faction list instead of a stale `FACTIONS` reference.

### 5. Regression test added

Added:

- `tests/ui_opord_player_safe_labels.test.ts`

This verifies OPORD-facing labels resolve to display names instead of raw OSIDs.

## Files

- `src/ui/map/components/ops_modal/opordDisplay.ts`
- `src/ui/map/components/ops_modal/OpordDocument.tsx`
- `src/ui/map/components/ops_modal/AuthorizePhase.tsx`
- `src/ui/map/components/ops_modal/ObjectiveList.tsx`
- `src/ui/map/components/army_hq/OrbatSection.tsx`
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
- `tests/ui_opord_player_safe_labels.test.ts`
- `vitest.config.ts`

## Verification

Passed:

- `node_modules\.bin\vitest.cmd run tests\ui_opord_player_safe_labels.test.ts tests\ui_army_hq_war_summary_visibility.test.ts tests\ui_shell_navigation.test.ts tests\warroom_player_visibility.test.ts tests\warroom_smoke.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Product consequence

The player shell is slightly but meaningfully more trustworthy:

- operation documents read like orders, not raw engine dumps
- HQ roster/history hover surfaces stay in human-facing language
- one more stale fallback bug is gone before it can confuse later work

## Done means

- canonical owner: ops-planning document/list surfaces for operation labels; Army HQ ORBAT for brigade engagement labels
- demoted path: raw OSID strings in player-facing planning and HQ hover surfaces
- player-visible truth: settlement display names, not engine identifiers
- canonical UI surface: OPORD / objective list / Army HQ ORBAT
- proof: `ui_opord_player_safe_labels.test.ts` + Warroom visibility tests + governance check
