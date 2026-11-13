# Map rail system: every map panel in one rail frame (2026-11-12)

**Status:** ACTIVE. Step 2 of [20261111_PLAYER_SURFACE_AND_AGENCY_REVIEW.md](../40_reports/proposals/20261111_PLAYER_SURFACE_AND_AGENCY_REVIEW.md). Branch `claude/map-rail-system-4fe8c9`, stacked on `claude/r8-name-sweep-recovery` and `claude/truthful-command` (both merged in). The owner decides the PR and merge.
**Scope:** presentation only. No sim, state, IPC or save change. EN and BCS copy. Not in scope: toolbar, Warroom status bar, bottom strip (step 5), `ops_modal/*`, operation briefing/AAR/history (step 3), records and end states (step 4), the Presidential Inbox and the map Operations panel (right edge, unchanged).
**Fixes:** review items M1, M2, M4, M5.

## The rail

One frame, built from the Command Surface parts (`surface/Surface.tsx` tokens), in a new `surface/MapRail.tsx`:

- **Place:** every entity panel opens in the same slot, beside the order-of-battle sidebar on the left (`getMapRailStyle()` in `panelRail.ts`). The settlement panel leaves the right edge, which keeps only the Inbox and the map Operations panel.
- **Width:** one width, `clamp(24rem, 20% of the interface viewport, 28rem)`: 24rem at 1280×720, 28rem on a 2293×960 ultrawide.
- **Plane:** opaque `#11141b`, gold border `accent-gold/35`, the surface shadow. No paper, glass, blur, watermark or "weathered" grain.
- **Header (`MapRailHeader`):** breadcrumb chips (when drilled in), mono gold eyebrow (what kind of thing: Unit, OG, Settlement, Corps, Army reserve, Order of battle), a 20 px title (its name), one plain subtitle line, optional chips, and a text Close button at the right. Every caller keeps its own `data-testid` and `aria-label` on Close.
- **Tabs (`TabBar`, restyled in place):** the same tab row everywhere (sans 14 px, gold underline, WAI-ARIA tablist kept). The sector panel drops its private tab row for `TabBar`.
- **Body:** one scroll region; groups under `SurfaceSection` mono gold labels; figures as label/value rows (`MapRailStat`); links to parents as rows with a chevron (`MapRailLink`); notes as plain 15 px text; actions as surface secondary buttons.
- **Type:** sans for names and data (no mono unit names, no condensed caps prose); mono only for the gold section labels and chips. Floor 13 px, body 15 px.

## Panel by panel

1. **Order-of-battle sidebar (M5).** Same plane and header (eyebrow "Order of battle", title = the army, commander line). The five accordions become four tabs: Army (corps cards, reserves, then mobilisation figures), OGs, Operations, Situation. The Situation sections use surface labels and plain rows. Test ids kept (`oob-section-sectors-toggle` sits on the OGs tab).
2. **Unit panel, `FormationDetail` (M4).** Rail header with the unit's name as the title (no mono green name), parent corps and sector as link rows, posture/readiness/condition as stat rows, TO&E as count rows with the condition in words, so a lone "Artillery 1" no longer draws a one-row bar chart.
3. **Sector/OG panel, `CorpsFrontPanel` (M2).** Dark, not paper: the cream page, typewriter type, "SECRET" watermark and gradient bridge go. Own-side figures that the staff have not reported read "Not reported yet" instead of "—" or blank; enemy force balance without reliable intelligence reads "Not yet assessed" instead of "REDACTED"; the hidden objective reads as words, not a black bar. Report-gap field names become localised.
4. **Settlement panel, `SelectionPanel`.** Moves to the left rail slot and width; rail header.
5. **Corps panel, `CorpsDetail`; OG/ORBAT, `OrbatPanel`; army reserve, `ArmyReservePanel`.** Rail frame and header; inner groups on surface labels.
6. **Order queue, `OrderQueue`.** Stays docked under the sidebar; same plane and header style; text at 13 px or more (it is 12 px today).

## Gates

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
- Affected tests, then all of `tests/ui`; full `npm run test:vitest` (read its own exit status; `tests/fixtures/vitest_balanced` red lines are deliberate controls).
- Real browser drive of the dev map build at 2293×960 and 1280×720 for every panel, screenshots under `F:/AWWV-coordination/surface_steps/step2/`, and the computed minimum font size in each panel (13 px or more).
- `npm run desktop:map:build` entry-chunk size against main.
- Player-experience gate if `package.json` defines one.
- PROJECT_LEDGER entry; GUI_MASTER "Recent GUI changes" line.

Wait gate: no tsc, vitest, dev server, build or Playwright until `F:/AWWV-coordination/crash_recovery_20261112/shake_status.txt` reads `all_shakedowns_done` (written after the RS-06 rerun; changed from `hrhb03_exit` on 2026-11-12).
