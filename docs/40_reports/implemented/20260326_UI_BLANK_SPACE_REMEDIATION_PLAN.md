# UI Blank Space Remediation Plan (Layout Density Only)

**Date:** 2026-03-26  
**Owner:** UI/UX remediation agent  
**Scope:** Blank-space and wasted-space fixes only (no gameplay/mechanics changes)  
**Primary input audit:** [20260326_UI_UX_BLANK_SPACE_AUDIT_LIVE.md](../20260326_UI_UX_BLANK_SPACE_AUDIT_LIVE.md)

---

## 1) Prioritized execution plan

### P0 - Highest impact, fastest visual wins (Summary + War Summary + Ops list)

- **Target BS IDs:** `BS-001`, `BS-002`, `BS-003`, `BS-004`, `BS-008`, `BS-013`
- **UI surfaces:**
  - Army HQ modal -> `SUMMARY` tab (`Overview`, `IVP`, `Casualties`)
  - War Summary modal (IVP review flow)
  - Left command panel -> `OPERATIONS` dropdown/list
- **Concrete layout changes:**
  - Convert narrow single-column summary layouts to a full-width responsive grid (2 columns at >= xl, 1 column fallback).
  - Standardize each summary sub-tab to a "metric cards + detail cards" layout with equal horizontal distribution.
  - Remove duplicate IVP block in `SUMMARY -> Casualties`; replace with compact inline IVP chip row only if context is needed.
  - For Operations list, either:
    - reduce container height to content-fit, or
    - keep height and fill with compact secondary rows (timeline/supply/status chips) in existing visual language.
- **Expected UX outcome:**
  - Immediate reduction of "unfinished/empty modal" perception in high-frequency command surfaces.
  - Faster scanning for urgent alert-driven flows (War Summary).
- **Candidate files/components likely to edit:**
  - `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - `src/ui/map/components/army_hq/*Summary*.tsx` (Overview/IVP/Casualties sections)
  - `src/ui/map/components/WarSummaryModal.tsx`
  - `src/ui/map/components/OperationsPanel.tsx` (or current operations list container)
  - `src/ui/map/styles/*` or Tailwind class blocks used by those panels
- **Acceptance criteria (measurable):**
  - On 1920x1080, Summary and War Summary active content occupies >= 65% of modal width.
  - No duplicated IVP full block appears inside Casualties tab.
  - Operations list presents at least one additional information row per operation OR the panel height is reduced to near-content-fit (<= 20% empty vertical area in viewport capture).
  - Zero overlap/clipping at 1366x768 and 1920x1080.
- **Risk notes:**
  - Medium risk of style drift if card density is increased without reusing existing Army HQ panel tokens.
  - Low risk of behavior impact (display-only changes).

---

### P1 - Nerve-center density correction (Army HQ Briefing top zone)

- **Target BS IDs:** `BS-005`, `BS-006`, `BS-007`
- **UI surfaces:**
  - Army HQ modal -> `BRIEFING` tab
  - Top row: Commander panel, center crest block, Situation/briefing card area
- **Concrete layout changes:**
  - Rebalance top-row column widths (reduce center crest footprint; allocate recovered space to data-bearing columns).
  - Cap minimum/maximum heights for Daily Briefing card to avoid tall empty paper body.
  - Add compact density rows in existing language (priorities/constraints/alerts) using existing data sources only (no new mechanics).
  - Tighten vertical spacing and card padding in low-content states.
- **Expected UX outcome:**
  - Army HQ "nerve center" reads as information-dense and intentional, not sparse.
  - Better first-impression command readiness without adding new systems.
- **Candidate files/components likely to edit:**
  - `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - `src/ui/map/components/army_hq/SituationBriefing.tsx`
  - `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`
  - shared Army HQ card wrappers/utilities in `src/ui/map/components/army_hq/`
- **Acceptance criteria (measurable):**
  - In BRIEFING viewport screenshot, top-row combined dead space reduced by >= 35% vs baseline capture.
  - Center crest column width <= 20% of top-row width on desktop.
  - Daily Briefing card visible content density: no > 180px contiguous empty vertical area.
  - No regressions in keyboard navigation (`H`, `ESC`, tab focus within modal).
- **Risk notes:**
  - Medium risk of over-compression harming readability if typography scales are not preserved.
  - Must preserve faction identity center anchor while shrinking footprint.

---

### P2 - Overlay footprint normalization (Reserve, Chronicle, Pause, Ops planner shell)

- **Target BS IDs:** `BS-009`, `BS-010`, `BS-011`, `BS-012`
- **UI surfaces:**
  - Pause overlay
  - Army Reserve overlay (`Main Staff`)
  - Chronicle overlay
  - Operation modal/planning shell
- **Concrete layout changes:**
  - Pause: choose a single compact strategy and make it intentional:
    - either wider info-dense command card, or
    - tighter dimmer + compact panel footprint.
  - Army Reserve: promote collapsed lower region to active scroll region with compact rows.
  - Chronicle: move from "left strip + blurred void" to 2-column layout (timeline + detail) within existing theme.
  - Ops modal: widen planner surface into two internal columns while preserving map presence.
- **Expected UX outcome:**
  - Full-screen overlays no longer feel like narrow sidebars stretched across the viewport.
  - Planning and records views feel first-class, not underfilled.
- **Candidate files/components likely to edit:**
  - `src/ui/map/components/PauseMenu*.tsx` (or equivalent pause overlay component)
  - `src/ui/map/components/ArmyReservePanel.tsx`
  - `src/ui/map/components/ChronicleOverlay.tsx`
  - `src/ui/map/components/ops_modal/*` (layout shell components)
  - overlay container wrappers in `src/ui/map/App.tsx`
- **Acceptance criteria (measurable):**
  - Each overlay active-content footprint >= 60% width on 1920x1080 captures.
  - Chronicle and Ops planner each show two concurrently visible information regions without horizontal clipping.
  - Pause overlay primary action group remains within central 60% viewport and is immediately visible.
  - No map interaction leak-through when overlays are open (except intended read-through visuals).
- **Risk notes:**
  - Higher risk because overlays share z-index/focus/backdrop patterns.
  - Ops modal is sensitive due to existing MapLibre + modal rendering constraints; layout changes must avoid touching map source update logic.

---

## 2) Recommended implementation order (quickest visible wins)

1. **P0 first** (Summary + War Summary + Ops list): highest frequency surfaces, smallest layout-only blast radius, immediate visible improvement.
2. **P1 second** (Army HQ Briefing top zone): same modal context as P0, preserves implementation momentum and shared component reuse.
3. **P2 last** (large overlays): broader surface area and higher integration risk, but now applied on top of stabilized density patterns from P0/P1.

---

## 3) Verification checklist (walkthrough + screenshots)

### Browser walkthrough (run after each phase)

1. Launch dev map and load a representative live state with Army HQ + operations available.
2. Open Army HQ (`H`) -> `SUMMARY` tabs -> `BRIEFING`.
3. Trigger War Summary via alert flow ("Review IVP" path).
4. Open command `OPERATIONS` list.
5. Open overlays in sequence: Main Staff (Army Reserve), Chronicle, Operation modal, Pause.
6. Repeat checks at:
   - 1920x1080
   - 1366x768
7. Validate keyboard and close behavior:
   - `ESC` closes intended top-most surface only.
   - Focus remains trapped in active modal where expected.

### Screenshot set to capture after each phase

- **After P0:**
  - `20260326-remed-p0-hq-summary-overview.png`
  - `20260326-remed-p0-hq-summary-ivp.png`
  - `20260326-remed-p0-hq-summary-casualties.png`
  - `20260326-remed-p0-war-summary-ivp.png`
  - `20260326-remed-p0-ops-list.png`
- **After P1:**
  - `20260326-remed-p1-hq-briefing-full.png`
  - `20260326-remed-p1-hq-briefing-top-row.png`
  - `20260326-remed-p1-hq-daily-briefing-card.png`
- **After P2:**
  - `20260326-remed-p2-pause-overlay.png`
  - `20260326-remed-p2-army-reserve-overlay.png`
  - `20260326-remed-p2-chronicle-overlay.png`
  - `20260326-remed-p2-ops-planning-modal.png`

### Pass/fail checks

- No targeted surface shows large empty side columns (> 35% total horizontal unused area) at desktop resolution.
- No targeted surface shows large empty vertical slabs (> 180px contiguous dead area) unless intentionally occupied by scrollable content.
- No layout regressions in existing panel typography, spacing tokens, or faction visual language.

---

## 4) Spec ambiguities needing clarification before implementation

1. **HOI visual spec path mismatch**
   - `GUI_MASTER.md` references `../30_planning/.../HOI_VISUAL_GUI_OVERHAUL_SPEC.md`.
   - Requested path `docs/20_engineering/HOI_VISUAL_GUI_OVERHAUL_SPEC.md` is not present.
   - **Clarify:** Which document is the current authority for visual/layout constraints?

2. **Ops modal target scope**
   - Audit calls out `BS-012` as operation modal width/density issue.
   - There are multiple ops modal states/components under `ops_modal/`.
   - **Clarify:** Apply density change to all phases (Commander/Plan/G-2/Authorize), or Planning-heavy states first?

3. **Pause overlay intent**
   - Two valid directions exist (compact intentional card vs denser expanded command card).
   - **Clarify:** Which direction aligns with desired UX tone for pause state?

---

## 5) Out of scope guardrail

- No simulation, command-chain, operations logic, or gameplay mechanics changes.
- No new player powers; only information architecture, spacing, hierarchy, and visual density adjustments.

