# Visual polish Phase E — the opening faction step (2026-11-05)

**Packet:** [2026-11-05-visual-polish-art-direction-plan.md](../../plans/2026-11-05-visual-polish-art-direction-plan.md), Phase E.
**Branch:** `claude/visual-polish-phase-e`, stacked on D (PR #528) → B (#527) → C (#526) → A (#525), worktree `F:/AWWV-worktrees/visual-polish`.
**Scope:** presentation only in `MainMenu.tsx` and its CSS. No start, continue, load, mode or error semantics changed; no i18n key added.

## What changed

- **No empty box before a faction is chosen.** After "New War" the menu used to render a console panel that only repeated the "Choose your faction" heading over an empty box with three decorative dashes. The standby component and its two CSS rules are deleted; the console is rendered only when a view owns it (dossier, mode, landing, records) or when an error must be shown (`showConsole`). The faction step is the rail alone over the neutral monitoring room; picking a faction opens the dossier over that faction's 1992 room, with the crest it already carried.
- **The rail describes a faction, not an army (owner, mid-phase).** Each choice's sublabel was the army name (ARBiH, VRS, HVO). You are choosing a faction, so it now carries the faction's one-line character, the same text the choice already announced to screen readers: "Firm command, scarce means.", "Overwhelming force, uncertain loyalty.", "Capable, but not your own master." The sublabel is set in the command face, sentence case, wrapping, at the same 0.75 rem the readability gate pins.
- **Tests.** New `tests/ui/opening_faction_step.test.ts` (RED before, GREEN after): the rail names no army and shows the three characters; exactly one "Choose your faction" heading and no console on the faction step over the neutral scene; the dossier console and the chosen room after a pick; an error still renders on the faction step.

## Evidence (`F:/AWWV-worktrees/_logs/visual-polish/E/`)

- `faction_step_RED.log` (1 failed before the console change), `faction_step_GREEN.log` (7 files / 60 tests), `rail_RED.log` (the rail assertion failed before the sublabel change), `vitest_post_simplify.log` (opening flow, readability gate, splash, transition, typography, warroom launch contract).
- `tsc.log` / `tsc_post_simplify.log` exit 0; `map_build.log` / `map_build_post_simplify.log` `desktop:map:build` exit 0.
- `faction_step_rail_only_1366_after_crop.jpg`: the rail alone over the neutral room after "New War". `faction_dossier_1366_after_crop.jpg`: the RBiH dossier over the RBiH room after a pick. Both are cropped captures (the preview pane was not on screen); the test asserts the same states. `faction_rail_descriptor_1366_after_crop.jpg`: the rail with the faction characters.
- Zero turns advanced.

## Simplify pass

Two review passes (reuse with simplification, efficiency with altitude) ran on the diff. Fixed in this slice:

- The console gate is one named flag, `showConsole`, beside the existing `campaignView` flag rather than an inline condition.
- The faction's one-line character has one owner, `sidePickerFactionDescriptor` in `sidePickerLabels.ts`, used by the rail sublabel, the rail's accessible label, the dossier header and the in-game side picker; the dossier table no longer carries a parallel descriptor key.

Recorded, not done: a rail-only grid variant for the campaign workspace (the empty second track leaves the rail at the left over the wall map, which reads correctly today); rendering the error alert as a banner independent of the console (a design call); a shared main-menu render harness for the two opening tests (fifteen duplicated lines, signatures differ). The reuse review confirmed `mainMenu.commandBrief` and `mainMenu.chooseFactionHelp` are still used and no CSS is orphaned; the efficiency review found nothing wasted.

## Owner-directed sweep of the faction step (mid-phase)

The owner pointed out that the rail named each faction's army under the faction name, although the choice is a faction. That is a wrong-noun defect, and a sweep of the rest of the step found the same class twice more; all three are fixed here:

- **Rail sublabel:** the army name (ARBiH, VRS, HVO) becomes the faction's character, the same text the choice already announced to screen readers.
- **In-game side picker** (`SidePickerOverlay.tsx`, the no-state Warroom picker): "ARBiH Forces" under each faction becomes the same character line; the BCS i18n test now asserts the character and the absence of "Snage". The `sidePicker.forces` key is left in place, unused.
- **Help line under the heading:** "Three commands. Three different limits…" named a different noun than the heading "Choose your faction"; it now reads "Three factions. Three different limits…" (EN and BCS).
- **Faction name clipping:** the rail clipped "Republic of Bosnia and Herz…" with an ellipsis; a player choosing a faction must be able to read its name, so the name wraps instead.

After these: `tsc` exit 0; 9 files / 83 tests then 4 files / 21 on the final re-run (opening flow, faction step, readability gate, splash, transition, typography, warroom launch and shell accessibility, side picker i18n); `desktop:map:build` exit 0 (`E/tsc_voice2.log`, `E/vitest_voice2.log`, `E/map_build_voice2.log`).

## Not done in this phase

- The two-column campaign grid keeps an empty second track on the faction step, which leaves the rail at the left over the room; a rail-only grid variant is recorded, not built, because the current composition (rail left, wall map right) reads correctly.
- The error alert still mounts inside the console; rendering it as an independent banner is a design call recorded for later.
