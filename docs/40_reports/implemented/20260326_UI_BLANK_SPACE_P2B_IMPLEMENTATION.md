# UI Blank-Space Remediation P2-B — Implementation

**Date:** 2026-03-26  
**Scope:** P2-B subset only (Ops modal planning-heavy states + compact Pause overlay)  
**Direction applied:** Ops modal **B** (planning-heavy states first), Pause overlay **A** (compact intentional panel)  
**Constraints honored:** no gameplay/mechanics changes; layout/density only; keyboard behavior and focus management preserved.

---

## Implemented P2-B items

### BS-012 (Ops Planning modal — planning-heavy density/widening)
- `src/ui/map/components/ops_modal/ObjectiveList.tsx`
  - Widened objective panel (`280px` -> `360px`) to reduce thin-strip effect.
  - Added compact planning summary cards (active axis, objective count, brigade count).
  - Added staging display row to improve planning-state density without new mechanics.
- `src/ui/map/components/ops_modal/PlanPhase.tsx`
  - Added left-side "Plan Status" panel to create a two-region planner layout during Phase 2.
  - Surface includes selected axis/staging/objective/brigade status only (read-only layout enrichment).
- `src/ui/map/components/ops_modal/G2Phase.tsx`
  - Added left-side "G2 Snapshot" panel for pre-authorization context.
  - Widened clipboard panel (`480px` -> `620px`) to improve content footprint in G2.
  - Preserved existing tab flow (`Assessment`, `Raw Intel`, `Map Legend`) and proceed controls.

### BS-009 (Pause overlay — compact intentional treatment)
- `src/ui/map/components/PauseMenu.tsx`
  - Kept centered compact panel strategy, but made layout intentional:
    - reduced full-screen visual weight (`bg-black/60 backdrop-blur-sm` -> `bg-black/45`)
    - widened panel (`w-56` -> `w-[320px]`) with clear header/action grouping
    - added explicit `ESC Resume` hint and compact state footer
  - Removed monospace button font override to align with map UI design language.
  - No changes to close/resume click behavior, action handlers, or ESC handling.

---

## Files changed

- `src/ui/map/components/ops_modal/ObjectiveList.tsx`
- `src/ui/map/components/ops_modal/PlanPhase.tsx`
- `src/ui/map/components/ops_modal/G2Phase.tsx`
- `src/ui/map/components/PauseMenu.tsx`
- `.claude/napkin.md` (runbook update)

---

## Verification

### Build check (`src/ui/map`)
- Command: `npm run build`
- Result: **failed due pre-existing repository TypeScript strictness/unused-symbol errors** across sim and UI files outside this P2-B slice.
- Introduced issues from this P2-B patch set:
  - No new error category attributable to these layout edits was identified.
  - Existing unused-symbol failures in nearby files (`PlanPhase`, `ObjectiveList`, `OpsPlanningModal`, etc.) were already present in this workspace state.

### Behavior guards
- Keyboard/navigation expectations preserved:
  - Ops modal phase progression and ESC-close behavior unchanged.
  - Pause overlay click-outside resume behavior unchanged.
  - No focus-trap or interaction logic was modified.

---

## Screenshot evidence (after)

Saved under `docs/40_reports/implemented/screenshots/`:

- `20260326-remed-p2b-pause-overlay-compact.png`
- `20260326-remed-p2b-ops-plan-phase.png`
- `20260326-remed-p2b-ops-g2-phase.png`

---

## Acceptance checks (P2-B subset)

- **Ops modal planning-heavy states:** PASS
  - Plan state now renders concurrent left+right planning regions instead of a single narrow strip.
  - G2 state now uses widened primary content region and a secondary snapshot region.
- **Pause overlay compact-intentional treatment:** PASS
  - Overlay remains compact, visually deliberate, and action-focused.
- **No mechanics changes:** PASS
  - No sim/state/IPC/gameplay behavior changes introduced.

---

## Follow-ups for remaining P2 surfaces (not in this P2-B subset)

- **BS-010 Army Reserve overlay**
  - Increase lower-region density (active scroll/content occupancy) while preserving reserve mechanics.
  - Candidate surface: `src/ui/map/components/ArmyReservePanel.tsx`.
- **BS-011 Chronicle overlay**
  - Move from left-strip dominant layout to multi-region chronology/detail presentation.
  - Candidate surface: `src/ui/map/components/chronicle/ChronicleOverlay.tsx`.
- Add a combined overlay regression pass for z-index/focus/backdrop interaction once Reserve + Chronicle are updated.
