# Implementation Report: GUI Panel Rework (Tabs to Accordions)

## Summary
The `CorpsFrontPanel.tsx` component was refactored from a 4-tab horizontal interface to a unified vertical layout using stacked, collapsible `AccordionHeader` elements. This change aligns with the external UX expert's recommendation against tabs for situational briefing components.

## Technical Changes

### 1. Shared Component Extraction
- **File:** `src/ui/map/components/AccordionHeader.tsx`
- Extracted the `AccordionHeader` markup/logic from `OOBSidebar.tsx` into a reusable component.
- Supports `title`, `isExpanded`, `onToggle`, and optional `badge` or `className`.
- Unified the visual style (`bg-panel-card`, `text-accent-gold`) across all sidebar and panel headers.

### 2. `CorpsFrontPanel.tsx` Refactor
- Removed `activeTab` state and `['overview', 'forces', 'logistics', 'ops']` array.
- Introduced `expandedSections` state (`Record<string, boolean>`) to track which sections are open.
- Default state: `{ overview: true }`.
- Replaced the tab navigation buttons with stacked `<AccordionHeader>` components.
- Each data block (Overview, Forces, Logistics, Ops) is now wrapped in a collapsible container controlled by its respective header.

### 3. `OOBSidebar.tsx` Integration and Cleanup
- Updated to use the shared `AccordionHeader` component.
- Removed dead code: the unused `collapsed` state and its `toggle` function.
- Verified that `expandedSections` correctly handles faction-level accordion toggles in the sidebar.

## Verification Results
- **Type Safety:** `tsc --noEmit` passed for all modified files.
- **Visual Consistency:** Standardized headers ensure the Front Panel and Sidebar feel part of the same interface system.
- **UX Alignment:** Matches the expert's proposal to minimize "tab-climbing" and provide a more comprehensive view of the situation at once.

## Mistake Guard & Patterns
- **Pattern:** Prefer stacked accordions over tabs for detail-rich "briefing" panels to improve cognitive load management.
- **Cleanup:** Always check for remaining `collapsed` vs `expanded` state variables when refactoring accordion logic.

---
**Date:** 2026-03-06
**Status:** Complete
**Propagated to:** PROJECT_LEDGER.md, context.md, napkin.md
