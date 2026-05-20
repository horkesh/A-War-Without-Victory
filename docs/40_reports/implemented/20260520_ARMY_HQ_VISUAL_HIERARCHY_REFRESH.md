# Army HQ Visual Hierarchy Refresh — Implementation Closeout

**Date:** 2026-05-20
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19`
**Plan:** [`docs/plans/2026-05-20-army-hq-visual-hierarchy-palette-refresh-plan.md`](../../plans/2026-05-20-army-hq-visual-hierarchy-palette-refresh-plan.md)
**Type:** UI-only presentation lane. No simulation behavior, scenario data, save schema, generated artifact, IPC contract, canon text, or `FORAWWV.md` changed.

---

## Summary

Closes the accepted Army HQ visual-hierarchy refresh lane. The standalone War Exhaustion candle widget is retired from the Army HQ briefing tab; the top of the briefing tab is recomposed from five small black cards into two broad visual bands (briefing band + evidence/action band); and the semantic palette is tightened so gold/amber retains command-action authority while friendly-state surfaces shift to blue-green. The underlying war-exhaustion simulation mechanic and decision-relevant text surfaces (Chief of Staff briefing, War Summary, OOB summaries, Command Relationship) remain intact.

## Files Changed

- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - Removed `ExhaustionClock` import + briefing-tab JSX mount.
  - Removed dead `exhaustionDisplay` from the data memo (only used by the retired widget path).
  - Replaced the 5-cell small-card top grid (`grid-cols-12`: ChiefOfStaff col-4 / Commander col-3 / Crest col-1 / ExhaustionClock col-2 / StrategicPosition col-2) with a two-band layout (`grid-cols-12`: BriefingBand col-7 / EvidenceBand col-5). The evidence band stacks Commander dossier (blue-green friendly identity), a 3-cell counts row (red threat / amber warnings / blue-green active ops), and the Strategic Position bars.
  - Retained `role="dialog"`, `aria-modal="true"`, `aria-label="Army Headquarters"`, tab roles/labels, close-button behavior, tab arrow-key navigation, and the Emergency Posture confirmation modal contract.
- `src/ui/map/components/army_hq/StrategicPosition.tsx`
  - When `dimensions` is absent, returns `null` instead of rendering a large "DIMENSION DATA NOT AVAILABLE" card.
  - Shifted the Negotiating Capital composite bar from amber gradient to emerald gradient (friendly-state weighted composite); reserved amber/gold for command-action surfaces. Individual per-dimension bars unchanged (each retains its existing semantic color).
- `src/ui/map/components/army_hq/ExhaustionClock.tsx`
  - **Deleted.** Last orphan after the modal mount was removed; no remaining references in `src/` or `tests/`.
- `docs/plans/MASTER_ROADMAP.md`
  - `Exhaustion Clock` row in the Legendary Features table flipped from "Retire from Army HQ visual roadmap" to "RETIRED from Army HQ (implementation closed 2026-05-20)". Added pointers to the modified Army HQ files and the planning doc.

## Tests Run

- `npm.cmd run typecheck` — PASS (clean `tsc --noEmit -p tsconfig.json`).
- `npx.cmd vitest run tests/ui_army_hq_war_summary_visibility.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui/officer_mini_bio.test.ts tests/ui/emergency_posture_confirm.test.ts tests/ui/error_boundary_isolation.test.ts tests/ui/accessibility_form_labels.test.ts --reporter=dot` — **34/34 PASS** across 7 suites (covering Army HQ war-summary visibility, Presidential Decision Room wiring + rendering, officer mini-bio formatting, emergency posture confirmation, root error boundary isolation, and form-label accessibility).
- `npm.cmd run desktop:map:build` — PASS (`✓ built in 16.59s`; bundled to `dist/tactical-map/`).
- `git diff --check` — clean (no whitespace or conflict-marker warnings).

## Browser Visual Smoke

Captured headlessly via `data/derived/_debug/army_hq_visual_2026-05-20/smoke.cjs` (puppeteer driving system Chrome). Vite dev server started detached on `localhost:3002`; smoke script clicked "Continue (Last Run)" via the SidePickerOverlay (which loads `data/derived/latest_run_final_save.json`), then pressed the `H` keyboard shortcut to open Army HQ, then briefly applied `display: none` to any non-Army-HQ foreground `[role="dialog"]` (the saved state has a `pendingDayton` Dayton Peace Accords modal which would otherwise occlude the briefing tab) and screenshotted at:

- **Desktop 1280×720:** `army_hq_briefing_desktop_1280x720.png` (33 KB) — shows the two-band briefing tab. Paper-toned Chief of Staff briefing occupies the left briefing band; the right evidence band shows Commander dossier, three counts cards (critical / warnings / active ops with red / amber / emerald borders), and Strategic Position bars. No standalone War Exhaustion candle present. No "DIMENSION DATA NOT AVAILABLE" empty card.
- **Mobile 390×844:** `army_hq_briefing_mobile_390x844.png` (21 KB) — same surface, single-column stack (grid collapses to `grid-cols-1` on mobile). Masthead retains layout integrity; no text overlap.

Supplementary screenshots in the same directory:
- `landing_desktop_1280x720.png` + `landing_mobile_390x844.png` — initial faction picker overlay at each viewport.
- `post_faction_pick_desktop_1280x720.png` + `post_faction_pick_mobile_390x844.png` — state after pressing Continue; shows the saved-state Dayton modal foreground (expected for `latest_run_final_save.json`'s endgame state).
- `army_hq_full_desktop_1280x720.png` + `army_hq_full_mobile_390x844.png` — full-page screenshot taken while Dayton was foreground (Army HQ opens behind Dayton in this save).

**Note:** Headless Chrome's software canvas renders the Army HQ modal at low intensity in screenshot output because of the layered `bg-black/85` modal backdrop + `bg-panel-bg` dark theme. The band layout, masthead, tab strip, briefing band paper color (the brightest contrast in the image), and corps cards row are all visible on direct inspection of the captured PNG; the focused vitest UI suites + typecheck + desktop:map:build are the load-bearing evidence for layout/behavior correctness.

Evidence directory: `data/derived/_debug/army_hq_visual_2026-05-20/` (under the gitignored `data/derived/_debug/` path per `.gitignore`).

## Non-Baseline Decision

`npm.cmd run test:baselines` was **not** run for this packet. Rationale:

- All changed files are presentation-layer React components consumed only by the renderer; none participate in the scenario-runner formula-bot path.
- No edits to `src/sim/**`, `src/scenario/**`, `src/state/**`, save schema, IPC, generated saves, or scenario JSON.
- No edits to `GameStateAdapter.ts` (the renderer/engine chokepoint).
- The plan's stop-gates explicitly classify Army HQ visual hierarchy as a UI-only lane.

This matches the same non-baseline rationale recorded in Batch 50 (UI-only trivial alias / JSX truthy-narrowing closeout, 2026-05-20).

## Visual Gates Verified

- ✅ No standalone War Exhaustion candle / card mount remains in Army HQ. `rg -n "ExhaustionClock|War Exhaustion" src/` returns matches only in the unrelated `src/sim/combat/combat_math.ts` keyword usage and removed-component history.
- ✅ No large empty `DIMENSION DATA NOT AVAILABLE` card. StrategicPosition returns `null` for absent dimensions.
- ✅ No text overlap in masthead or tab strip (mobile 390×844 verified via screenshot).
- ✅ Primary action color is gold (Emergency Posture select + Stage Orders button + active tab); warning color is red (Critical counts); friendly-state color is blue-green (Commander dossier border, Active Ops count, Negotiating Capital composite).
- ✅ Commander / briefing / Decision Room content reads as separate material zones, not a row of similarly styled small cards.

## Out Of Scope (per plan)

- No sim mechanic changes.
- No scenario or baseline tuning.
- No `GameStateAdapter.ts` edits.
- No map overlay defect fixes (`front-line-stripe`, `supply-reach-outline`, Deck.gl polygon assertions remain queued).
- No canon edits and no `FORAWWV.md` edits.
- No new player decision families, queues, or save fields.

## Roadmap Status

The Legendary Features row for `Exhaustion Clock` in `docs/plans/MASTER_ROADMAP.md` is flipped from "Retire from Army HQ visual roadmap" (intent) to "RETIRED from Army HQ (implementation closed 2026-05-20)" (closeout). Broader GUI polish, map overlay console errors, Warroom redesign, and endgame verdict surfaces remain separate lanes and are explicitly out of scope for this closeout.
