# Operations surfaces (player-surface review, step 3)

**Status.** Active plan, 2026-11-12. Branch `claude/ops-surfaces-e1fb18` (base: `main` at `651a56ae6` + `origin/claude/r8-name-sweep-recovery` + `origin/claude/truthful-command`). Source: step 3 of `docs/40_reports/proposals/20261111_PLAYER_SURFACE_AND_AGENCY_REVIEW.md`. The owner decides the PR and merge.

## Goal

Operation planning, the operation briefing, the after-action report and operation history read as surfaces in the Command Surface style (`src/ui/map/components/surface/Surface.tsx`): opaque planes, a gold-bordered frame, the surface type scale (13 px floor, 16–19 px body, 26–34 px titles), mono gold section labels, big gold primary buttons. No translucent blur, no paper sheets, no `amber-400`.

## Scope (files)

- `src/ui/map/components/ops_modal/*.tsx`: `OpsPlanningModal`, `CommanderPhase`, `PlanPhase`, `ObjectiveList`, `BrigadeTray`, `BrigadeCard`, `PlanParameters`, `G2Phase`, `NarrativeTab`, `MapLegendTab`, `RawIntelTab` (debug only, classes only), `AuthorizePhase`, `OpordDocument`, `OpsMap` (container and legend only).
- `src/ui/map/components/OperationBriefingModal.tsx`, `AARPanel.tsx`, `OperationHistoryPanel.tsx`.
- i18n EN + BCS (with diacritics) for new labels and for the hardcoded English left in `OperationHistoryPanel`.
- Tests that pin the old source strings, updated in the same change.

Out of scope: map rail panels (step 2, including `OperationsPanel`), records and end states (step 4), `army_hq/RecordsContent.tsx` (the Records tab host), `CommanderSelectionModal`.

## Design

1. **Planning** becomes one overlay surface (`Z.MODAL`, dimmed backdrop). Header: eyebrow "Operation planning · <corps>", title = operation name, a four-step phase stepper (numbered, 15 px labels), Close (`ops-planning-close`). Body: `content-wide-detail` columns. Left: the planning map (MapLibre, resized in rAF on container change), with the legend as an opaque card. Right: the phase content, a scrolling body of `SurfaceSection`s and a fixed footer holding the phase's primary action. The discard confirmation and phase-gate notice become opaque surface notices over the map.
   - Commander: corps facts, officer cards (two per row), confirm in the footer, unavailable officers listed with their reason.
   - Plan: plan status figures + Suggest plan, objectives (reorder, main effort, remove), staging, parameters as option buttons, brigades as a card grid, G2 assessment in the footer.
   - G2: snapshot figures, Assessment / Map legend tabs, the G-2 report on a dark panel (no clipboard paper), proceed in the footer.
   - Authorize: the order (OPORD) on a dark panel with the approval stamp, eligibility and cost, authorize/probe in the footer.
2. **Briefing** keeps the shared `Modal` (focus trap, Esc, `Z.CRITICAL_MODAL`, `operation-briefing-title`) with `SURFACE_MODAL_PANEL_MEDIUM`: header, body of figures/sections, footer with Launch / Order probe / Postpone / Abort / Close.
3. **AAR and history** bodies (embedded in Army HQ Records): collapsible sections become surface sections; battle rows, operation cards and chips at the surface scale. Test ids `aar-battle-row`, `aar-formation-link`, `aar-operation-activity`, `operation-history-exclusion` and `data-operation-history-id` unchanged.

## Boundaries (operations-expert)

Presentation only. These stay byte-identical: plan state and `handleOsidClick`/`selectableOsids` in `OpsPlanningModal`; `phaseGate.ts`, `autoPropose.ts`, `stagingChoice.ts`, `usePrediction.ts`, `opsPlanningDraft.ts`; `AuthorizePhase.submitOperation` (payload, probe overrides, `authorizeBlocked`, stamp timing); CommanderPhase availability and sort; PlanPhase auto-propose effects; OpsMap click filtering. No IPC or store change. Test ids and `data-*` attributes kept.

## Gates

`NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`; affected tests, then `tests/ui`; dev map build rendered at 2293×960 and 1280×720 with Playwright for each planning phase, the briefing, AAR and history (screenshots `F:/AWWV-coordination/surface_steps/step3/`); computed minimum font ≥ 13 px; entry chunk vs main (`npm run desktop:map:build`); full `npm run test:vitest`. Ledger entry. Commit and push; no PR. Runtime gates wait until the R8 shakedown status file reports `hrhb03_exit`.
