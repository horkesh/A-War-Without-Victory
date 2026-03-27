# UI Blank-Space Remediation P0 — Implementation

**Date:** 2026-03-26  
**Scope:** P0 only (`BS-001`, `BS-002`, `BS-003`, `BS-004`, `BS-008`, `BS-013`)  
**Constraints honored:** no gameplay/mechanics/state/IPC contract changes; preserved visual language/tokens; preserved keyboard and accessibility behavior.

---

## Implemented P0 items

### BS-001 / BS-002 (Army HQ `SUMMARY` Overview + IVP width/density)
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
  - Expanded container from narrow fixed strip to full-width responsive content area.
  - Converted `overview` display to responsive grid cards for better horizontal occupancy.
  - Wrapped focused-section content in consistent panel framing.

### BS-003 (Army HQ `SUMMARY` Casualties duplication cleanup)
- `src/ui/map/components/SituationTab.tsx`
  - In focused mode (`focusSection` set and not `overview`), now renders only the requested section card.
  - Suppressed generic overview/snapshot/alliance/alerts sections in focused mode.
  - Result: `Casualties` no longer pulls in unrelated IVP/overview blocks.

### BS-004 / BS-008 (War Summary modal narrow column inside wide frame)
- `src/ui/map/components/WarSummaryModal.tsx`
  - Increased modal usable width to `min(1100px, 92vw)`.
  - Converted `overview` body to auto-fit multi-column card grid.
  - Wrapped focused-tab content (`IVP`, `casualties`, etc.) in denser framed container.

### BS-013 (Operations list tall area with sparse rows)
- `src/ui/map/components/OperationsPanel.tsx`
  - Added compact secondary metadata row per operation card:
    - phase turn counter
    - brigade count chip
    - supply readiness chip with existing color semantics
  - Improves vertical information density without changing operation behavior.

---

## Verification

### Build
- Ran in `src/ui/map`: `npm run build`
- Result: **fails due pre-existing repository TypeScript errors outside this P0 scope** (unused imports/vars and unrelated strictness errors across sim/UI files).
- No new build failure type introduced by this P0 patch set was identified during HMR usage.

### Targeted tests
- No dedicated tests currently present for `WarSummaryContent`, `WarSummaryModal`, `SituationTab`, or `OperationsPanel`.

---

## Evidence screenshots

### Before (from live audit baseline)
- `hq-summary-overview.png`
- `hq-summary-ivp.png`
- `hq-summary-casualties.png`
- `map-ivp-modal.png`
- `20260326-live-ops-dropdown.png`

### After (this implementation)
- `20260326-remed-p0-hq-summary-overview.png`
- `20260326-remed-p0-hq-summary-ivp.png`
- `20260326-remed-p0-hq-summary-casualties.png`
- `20260326-remed-p0-war-summary-ivp.png`
- `20260326-remed-p0-ops-list.png`

---

## Risks / Follow-ups (for P1/P2)

- `P1` (HQ Briefing top-zone density): crest/commander/briefing footprint rebalancing can impact perceived hierarchy; keep faction identity anchor intact while reducing dead space.
- `P1` should include a focused 1366x768 pass to avoid top-row compression artifacts.
- `P2` overlays (Pause/Reserve/Chronicle/Ops shell) share backdrop/focus stacks; perform z-index and focus-trap regression checks together, not piecemeal.
- Consider adding small component-level rendering tests for focused `SituationTab` section behavior to prevent regression of BS-003.

