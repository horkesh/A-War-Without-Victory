# Tactical Shell Frame Cohesion

## Summary

This slice addresses the visible "UI islands" problem in the tactical shell. The immediate examples were the command sidebar corps-card gaps and side panels that did not visually dock to the top and bottom chrome. The broader root cause was inconsistent local layout assumptions across shell owners.

## Root Causes

- `FlipCard` rendered front and back faces in the same grid cell, so the hidden detailed back face still sized the visible corps card.
- `OOBSidebar` used Tailwind `bottom-9`, while right rail panels used hard-coded `bottom: '2.5rem'`.
- Primary right panels used `right: '1rem'`, which made the rail float off the frame while the bottom and top bars were full-bleed.
- `PeaceWarTransition` used the low `GLASS_PANEL_PEACE_WAR` z-index tier, so the blocking War Begins overlay rendered beneath higher tactical rail panels.

## Implementation

- Added `--awwv-bottom-bar-clearance` beside the existing `--awwv-toolbar-clearance` at the `App` shell root.
- Updated `OOBSidebar` and all panel-rail styles to consume the shared bottom clearance.
- Made the primary right rail flush with the viewport edge.
- Changed `FlipCard` so only the active face participates in normal layout; the inactive face is absolute and pointer-inert.
- Raised War Begins to `Z.MODAL_HARD` so it blocks the full tactical shell.
- Updated legacy left/right `GlassPanel` side panels to consume the same top/bottom frame variables.
- Replaced Side Picker load/continue emoji glyphs with the existing in-game `Icon` component.
- Added `tests/ui_shell_frame_contract.test.ts` to pin the frame and flip-card contracts.

## Verification

- `npx.cmd vitest run tests\ui_shell_frame_contract.test.ts tests\ui\peace_war_transition.test.ts tests\ui_presidential_toolbar_summary_click.test.ts tests\v093_a11y_lane_b_map_landmarks.test.ts` passed 16/16.
- `npm.cmd run typecheck` passed.
- Browser inspection on `http://127.0.0.1:3002/index.html?dev=1` confirmed War Begins covers both rails, corps cards stack without hidden back-face gaps, and command/inbox rails align to the shared tactical frame.
- Follow-up browser inspection confirmed the Side Picker no longer renders the save/continue emoji glyphs.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/chunk warnings.
- `git diff --check` reported only CRLF normalization warnings.

## Remaining Polish

This does not finish the full AAA-style pass. Follow-up should audit remaining hard-coded offsets in ops planning, minimap, map legend, modal trays, and Warroom/tactical handoffs, then consolidate them under the same frame contract where appropriate.
