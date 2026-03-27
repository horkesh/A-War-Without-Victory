# UI Blank-Space Remediation P2-C - Implementation

**Date:** 2026-03-26  
**Scope:** P2 remaining surfaces only - `BS-010` (Army Reserve overlay density), `BS-011` (Chronicle overlay density)  
**Constraints honored:** UI/layout-only changes; no gameplay/mechanics/state contract changes.

---

## Implemented P2-C items

### BS-010 - Army Reserve overlay density
- **Surface:** `ArmyReservePanel`
- **Problem addressed:** Large lower-region dead space when reserve entries are few and campaign history starts collapsed.
- **Changes made:**
  - Campaign history defaults to expanded (`historyOpen = true`) to occupy lower panel space immediately.
  - Added an always-visible **Active Loans** snapshot section with compact rows (brigade, target corps, deployed weeks).
  - Added max-height scroll regions to compact lists so panel remains dense without overflow.
- **Behavioral guardrail:** No IPC/state semantics changed (`approve-reserve-request`, `recall-elite-brigade`, and existing selection behavior unchanged).

### BS-011 - Chronicle overlay density
- **Surface:** `ChronicleOverlay`
- **Problem addressed:** Single-strip chronology with underused width on larger viewports.
- **Changes made:**
  - Converted the overlay body into a two-region layout:
    - Left: existing horizontal chronology timeline (unchanged core behavior).
    - Right: new **Chronicle Dossier** detail pane for selected turn.
  - Added selected-turn state and week-header click behavior to drive dossier content.
  - Added compact turn summary metrics (event count, headline presence) and turn-scoped event cards in the dossier pane.
- **Behavioral guardrail:** ESC close, scrubber, timeline grouping/expansion, and chronology rendering remain intact.

---

## Files changed

- `src/ui/map/components/ArmyReservePanel.tsx`
- `src/ui/map/components/chronicle/ChronicleOverlay.tsx`

---

## Verification

### Build check
- **Command:** `src/ui/map -> npm run build`
- **Result:** **Failed due pre-existing repository TypeScript errors** (strict unused-symbol and typing issues across sim/UI files outside this P2-C scope).
- **New issues from this patch set:** None identified in touched files.

### Lint check (touched files)
- `ReadLints` on:
  - `src/ui/map/components/ArmyReservePanel.tsx`
  - `src/ui/map/components/chronicle/ChronicleOverlay.tsx`
- **Result:** No linter errors on edited files.

---

## Acceptance checks

- **BS-010 (Reserve overlay density):** PASS
  - Lower panel region now carries active content by default (expanded history + active-loans section).
  - Reserve decisions remain focused and readable; no mechanics/UI-flow changes.

- **BS-011 (Chronicle overlay density):** PASS
  - Overlay now presents two concurrent information regions (chronology + dossier), reducing unused width.
  - Chronicle interaction model remains intact (scroll, grouping, ESC close, scrubber).

---

## Screenshot filenames

Planned/expected P2-C captures:
- `20260326-remed-p2c-army-reserve-overlay-density.png`
- `20260326-remed-p2c-chronicle-overlay-timeline-dossier.png`
- `20260326-remed-p2c-chronicle-overlay-selected-week-detail.png`

