# Warroom React Shell Foundation

Date: 2026-04-03

## What shipped

- `WarroomShellLayer` React component in `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- `warroom-asset-urls.ts` static Vite asset lookup (15 webp imports: 3 factions × 5 years 1991–1995)
- Regions JSON imported statically from `src/ui/warroom/assets/hq_{faction}_regions.json`
- Renders faction-appropriate scene plate webp as `<img>` background (100% width/height, objectFit contain)
- Renders hotspot regions as absolutely-positioned `<div>` elements with percentage-based bounds (2752×1536 authoring space)
- Hover highlight: amber outline + subtle fill on region hover; `title` from region `tooltip` or `id`
- Maps 5 region IDs to ShellHandoffCommand (wall_flag_area, commander_coatrack, command_briefing_folio, newspaper_stack, intelligence_journal)
- 3 region IDs return undefined (wall_cork_board, wall_calendar_area, diplomatic_telephone, desk_radio — no React equivalent yet)
- `regionToShellHandoff` exported for unit testing
- 8 unit tests in `tests/warroom_shell_layer.test.ts` — all pass
- App.tsx gains `'warroom'` screen state (was `'game' | 'mainMenu'`)
- App.tsx detects `?view=warroom` URL param on mount and sets screen to warroom
- WarroomShellLayer rendered inside `fixed inset-0 z-50 bg-black` when active; `onNavigate` fires applyShellHandoffCommand then returns to game screen

## Year derivation

`metadata?.date` string (e.g. "April 1992") — last 4 characters parsed as integer, clamped to 1992–1995. Falls back to 1992 if no game loaded or date unparseable.

## What this enables

Future slice: pass `?view=warroom` from warroom.ts iframe URL or change Electron entry point, giving React ownership of room navigation. Once wired, canvas-based room rendering in warroom.ts can be progressively deprecated.

## What did NOT change

- `warroom.ts` canvas rendering — still the active runtime path
- `ClickableRegionManager.ts` — still handles all hotspot routing in the active runtime
- Electron entry point — still loads warroom HTML
- No changes to regions JSON files, webp assets, or warroom vite config

## Completion block

Canonical owner: `src/ui/map/components/warroom/WarroomShellLayer.tsx`
Demoted path: warroom.ts canvas rendering (still active; WarroomShellLayer is a parallel foundation only)
Player-visible truth: Not yet player-visible — activates only via `?view=warroom` URL param
Canonical UI surface: Foundation component; runtime wiring (iframe URL or Electron entry) is the next slice
Done means: WarroomShellLayer renders scene plate + hotspot regions; App.tsx shows it on `?view=warroom`; regionToShellHandoff tested (8/8); tsc clean; vitest 8/8 new tests pass (pre-existing failures unchanged); Vite build clean (15 webps in output); governance OK
