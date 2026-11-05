# Visual polish Phase A — the war map as a printed map (2026-11-05)

**Packet:** [2026-11-05-visual-polish-art-direction-plan.md](../../plans/2026-11-05-visual-polish-art-direction-plan.md), Phase A.
**Branch:** `claude/visual-polish-art-direction`, worktree `F:/AWWV-worktrees/visual-polish`, base main `f607df7f4`.
**Scope:** presentation only. No simulation, state, save, scenario, calibration, audio, Settings or modal behaviour changed. No click, selection or counter-position contract changed.

## What changed

- **`src/ui/map/map/mapPaperPalette.ts` (new).** Names every base-map colour: linen paper, light grey relief, slate water, olive forest, sepia roads, an inked front with paper ticks, and three printed faction inks. The inks are projections of the canonical `FACTION_GLOW_RGB` tuples pulled 30% toward sepia (`toInk`), so no second faction colour table exists. It also owns the counter print inks (`COUNTER_PRINT`) and the relief raster paint.
- **`src/ui/map/map/awwv_map_style.json`.** Base layers repainted from the palette; the hillshade drops to 0.42 opacity with reduced contrast so the paper shows through; a new `front-line-understroke` layer (blurred sepia) sits under the ink line, and the stripe becomes short paper ticks. Layer ids, sources, filters and the formation/arrow layers are unchanged.
- **`src/ui/map/map/formationIcons.ts`.** Counters are printed: faction ink bodies with a light/shade bevel, paper-coloured NATO symbol, cream strength bar (alarm red under 40%) and gold morale bar. Geometry, halo opacity, size curve and icon-id grammar unchanged.
- **`src/ui/map/components/MapModeLegend.tsx`.** The legend sample's bars match the new counter bars.
- **`src/ui/map/map/MapContainer.tsx`.** The fog overlay reads `MAP_PAPER_PALETTE.fog` (sepia) instead of a black literal. One import added; nothing else touched.
- **`src/ui/map/layers/buildTacticalDeckLayers.ts`.** Settlement labels are ink on a paper outline instead of cream on black.
- **Tests.** New `tests/ui/map_style_contract.test.ts` pins layer order, that every base-layer colour is a named palette value, the relief ceiling, and local glyphs with no remote URL (RED 3/5 before the restyle, GREEN 5/5 after). `tests/ui_map_deck_counter_visibility.test.ts` now pins the opaque-body contract against the palette-derived painter instead of the old literal table.

## Declutter decision (Architect, flagged)

The plan's "inbox not mounted over the map" item is **moved to Phase B** as an inbox-presentation change. `derivePanelRailState` returning `inbox` by default is a tested ownership contract (`panel_rail_ownership`, `panel_rail_exclusivity`, `ui_map_panel_rail`), so the right fix is a narrower, collapsible dossier, not a different default panel.

## Evidence (`F:/AWWV-worktrees/_logs/visual-polish/`)

- `00_baseline/`: Phase 0 screenshots at 1366 and the green `tsc`/contract-test logs on the untouched base.
- `A/style_contract_RED.log`, `A/style_contract_GREEN.log`: the contract test before and after the restyle.
- `A/tsc.log` exit 0; `A/vitest_rerun.log` 12 files / 94 tests pass; `A/map_build.log` `desktop:map:build` exit 0.
- `A/map_political_1366_after.jpg`, `map_political_zoomed_1366_after.jpg`, `map_ethnic_1366_after.jpg`, `map_settlement_selected_1366_after.jpg`, `map_political_1920_after.jpg`: real Vite route on port 3003, RBiH turn 1, no console errors; a settlement click still opens the Settlement rail and the DOM counter buttons still mount.
- Zero turns advanced; no save written.

## Simplify pass

Four review lenses (reuse, simplification, efficiency, altitude) ran on the diff. Fixed in this slice:

- The Deck settlement-label and stack-badge colours were hand-copied tuples with a two-unit drift. The palette now exports `INK_TEXT_RGB`, `PAPER_HALO_RGB` and `COUNTER_HALO_RGB`, derives its CSS strings from them, and the Deck builder spreads the tuples.
- The legend sample bars read `COUNTER_PRINT.strengthBar` and `COUNTER_PRINT.moraleBar` instead of hex class literals.
- The counter painter no longer keeps a hand-maintained known-faction set or a second neutral grey. It calls `factionInk` and `factionBorderInk` directly (an unknown faction prints the palette neutral) and reads `COUNTER_PRINT` at the use sites instead of through alias constants.
- The palette drops the unused `MapPaperPaletteKey` type and un-exports its internal sepia, neutral and alpha constants; `factionInk` and `factionBorderInk` share one `glowFor` lookup; the `COUNTER_PRINT` comment names its real readers.

Recorded, not done: a tuple-based rgba helper shared with `factionPalette.ts` (a fourth copy of the template, low value); per-layer key assertions in the style contract instead of set membership; the 111 remaining colour literals in `MapContainer.tsx` for ethnic, enclave and selection layers as a later palette sweep. The efficiency review found no waste on a hot path: the painter runs once per distinct icon id and is cached.

After the fixes: `tsc` exit 0, the same 12 files / 94 tests pass (`A/tsc_post_simplify.log`, `A/vitest_post_simplify.log`), and the reloaded Vite route renders the map with the simplified painter (`A/map_political_1366_post_simplify.jpg`).

## Not done in this phase

- Ethnic, supply, enclave and selection colours in `MapContainer.tsx` still use their own literals; aligning them to the palette is recorded for a later slice.
- No packaged Electron proof; browser proof only.
