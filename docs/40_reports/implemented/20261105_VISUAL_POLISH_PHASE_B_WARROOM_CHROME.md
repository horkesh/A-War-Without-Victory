# Visual polish Phase B — diegetic warroom chrome (2026-11-05)

**Packet:** [2026-11-05-visual-polish-art-direction-plan.md](../../plans/2026-11-05-visual-polish-art-direction-plan.md), Phase B, run after Phase C on the owner's accepted re-order.
**Branch:** `claude/visual-polish-phase-b`, stacked on `claude/visual-polish-phase-c` (PR #526) and `claude/visual-polish-art-direction` (PR #525), worktree `F:/AWWV-worktrees/visual-polish`.
**Scope:** presentation only. No queue, docket, hotspot, navigation, dismissal or state logic changed. No data file changed. `AdvanceTurnModal.tsx` untouched.

## What changed

- **The inbox is a dossier on the desk in the Warroom.** `PresidentialInbox.tsx` gains a `material` prop. `panel` (default) is the full-height right rail the tactical map keeps. `dossier` mounts the same component lower (`top: 34%`), narrower (20 rem), inset from the right edge, inside a manila-edged frame with a folder tab reading the inbox title. The Warroom opening-brief mount in `App.tsx` passes `material="dossier"`; the map-route mount is unchanged. Items, actions, badge and the opening-brief logic are identical.
- **The warroom navigation is a brass rail.** The `WarroomToolbar` in `WarroomShellLayer.tsx` drops the glass-and-blur bar for a lacquered rail with a brass edge; buttons become engraved cream labels on the rail with the Advance entry underlined in warm red. Same nine entries, order, labels, test ids and `aria-label`; `data-material="rail"` marks the surface.
- **Command cards are art first.** `CommandCard.tsx` keeps the blurb in the card (still in the DOM for readers and tests) but reveals it only on hover or keyboard focus; the bottom gradient covers half the card instead of two thirds, so more of the per-faction plate shows. Title, role label, counts and the action pip stay.
- **The corkboard map is left as it is.** It is the owner-accepted WR01 design (paper sheet with margin, luminance-matched to the fifteen plates, land tint, player ink, dashed fronts, four matte pins, no municipality borders by owner ruling of 2026-09-12). The plan's "hand-inked control, front line, pins" items were already true; adding enemy inks or a stamp would reopen that design and is not done.
- **Tests.** New `tests/ui/warroom_chrome_material.test.ts` (RED 3/4 before, GREEN 4/4 after): default panel mount, dossier mount (position, width, tab, title retained), rail attribute with the accepted entries, blurb-on-hover classes on every card.

## Evidence (`F:/AWWV-worktrees/_logs/visual-polish/B/`)

- `chrome_RED.log` (3 failed before implementation), `chrome_GREEN.log` / `vitest_final.log`: 20 files / 263 tests pass (warroom shell accessibility, ownership, luminance, continuity, marker date, docket; card strip accessibility; command-surface panels; categories and desk assets; backdrop readability; label discipline; palette unification; no-CRT; first-hour gate contract; toolbar fit; inbox items and dedup; typography).
- `tsc.log` exit 0; `map_build.log` `desktop:map:build` exit 0.
- `desk_dossier_rail_1366_after.jpg`: RBiH 1992 desk on the real Vite route (port 3003) with the rail, the dossier lower right, and the corkboard, whiteboard date and flag unobstructed. `command_surface_1366_after.jpg`: the six cards art-first. `desk_1920_after.jpg`: the same desk at 1920x1080 with the command surface open. `desk_rs_1366_after_crop.jpg`: the RS 1992 room (rail and corkboard; the capture is cropped because the preview pane was not on screen), with the dossier mount, its tab and the rail verified through the DOM (`data-material="dossier"`, `top: 34%`, tab text "Presidential Inbox", `data-material="rail"`). `desk_rbih_1366_final_crop.jpg`: the RBiH desk after the simplify pass (cropped for the same reason); the DOM confirms the dossier mount, the paper-token tab (`bg-paper`) and the rail.
- Zero turns advanced.

## Simplify pass

Four review lenses (reuse, simplification, efficiency, altitude) ran on the diff. Fixed in this slice:

- The dossier's layout numbers live in one exported `DOSSIER_LAYOUT`, and the panel and dossier style and class strings are named module constants instead of two long ternaries; the test imports the layout rather than repeating its values.
- The dossier uses project tokens (`bg-paper`, `border-accent-gold`, `ring-accent-gold`, `text-panel-bg`) instead of three new hex literals.
- The rail's style objects are hoisted module constants (`TOOLBAR_STYLE`, `TOOLBAR_ITEM_STYLE`, `TOOLBAR_ADVANCE_STYLE`) on the file's existing brass value, named once as `BRASS_RGB`, instead of a fourth brass variant built inline per render.
- The card test asserts the `group` root and one hover-or-focus reveal pattern instead of three exact class strings.

Recorded, not done: move the rail styles to BEM classes in `globals.css` (`.warroom-toolbar__item`, with real `:hover` and `:focus-visible` states) when the toolbar is next touched; the two other `rgba(214,174,76,…)` literals in `WarroomShellLayer.tsx` can then share `BRASS_RGB`; extract a shared `DOSSIER_PANEL_STYLE` into `panelRail.ts` only if a second dossier consumer appears; add `@media (hover: none)` to show card blurbs on touch if touch ever matters. The altitude review kept the `material` prop, the opacity-based reveal (the blurb stays in the button's accessible text) and the inline-to-constant step as the right depth. The efficiency review found no meaningful waste.

After the fixes: `tsc` exit 0, 9 files / 84 tests pass, `desktop:map:build` exit 0 (`B/tsc_post_simplify.log`, `B/vitest_post_simplify.log`, `B/map_build_post_simplify.log`).

## Not done in this phase

- The 1995 rooms were not captured in the browser (a fresh campaign starts in 1992 and the dev route does not advance turns); the dossier and rail are plate-independent CSS, and the luminance contract tests cover all fifteen plates.
- Card size is unchanged (six columns at 1366); a larger two-row layout would exceed the 768 px room height with the strip anchored above the status dock.
