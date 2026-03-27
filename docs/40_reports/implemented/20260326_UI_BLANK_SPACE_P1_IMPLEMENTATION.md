# UI Blank-Space Remediation P1 — Implementation

**Date:** 2026-03-26  
**Scope:** P1 only (`BS-005`, `BS-006`, `BS-007`)  
**Surface:** Army HQ modal `BRIEFING` top zone only  
**Constraints honored:** layout-only changes, no gameplay/mechanics/state/IPC behavior changes, existing visual language/tokens preserved.

---

## Implemented P1 items

### BS-005 (Daily Briefing vertical dead space)
- `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`
  - Added explicit `min-h`/`max-h` bounds to the Daily Briefing card (`min-h-[220px]`, `max-h-[320px]`) to stop oversized low-content paper bodies.
  - Tightened header/body/footer vertical padding to improve content density without changing typography or component identity.

### BS-006 (Commander slab underfilled)
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - Made Commander block more compact (`OfficerProfile` compact mode) to reduce empty container area.
  - Added compact, existing-data-only density rows beneath Commander:
    - critical alert count
    - warning count
    - active operation count
  - No new data sources, no new mechanics, no behavior changes.

### BS-007 (Center crest over-footprint / column balance)
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - Replaced top-zone desktop layout with a 12-column grid distribution:
    - Commander `3/12`
    - Daily Briefing `3/12`
    - Crest `2/12`
    - Exhaustion `2/12`
    - Strategic Position `2/12`
  - Reduced crest image size from large dominant footprint to compact anchor sizing.
  - Net effect: crest column is now <= 20% of top-row width on desktop.

### Supporting density adjustment
- `src/ui/map/components/army_hq/ExhaustionClock.tsx`
  - Reduced minimum height and padding to better match the denser top-row rhythm and avoid over-tall card slabs.

---

## Changed files

- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`
- `src/ui/map/components/army_hq/ExhaustionClock.tsx`

---

## Verification

### Build check (`src/ui/map`)
- Command: `npm run build`
- Result: **fails due pre-existing repository TypeScript errors** (unused imports/vars and unrelated strictness/type issues across sim and other UI files).
- Classification:
  - **Pre-existing:** yes (large existing error set outside this P1 scope; includes many untouched files under `src/sim`, `src/state`, and unrelated `src/ui/map` components).
  - **New from this P1 slice:** no direct new error signature attributable to the three touched files was identified.

### Acceptance checks (P1)
- `BS-005` Daily Briefing contiguous empty slab reduced via bounded card height and denser padding.
- `BS-006` Commander panel density improved with compact profile + metrics row using existing briefing/ops data.
- `BS-007` Crest center column reduced to 2/12 (16.7%) on desktop, meeting the <=20% target.

---

## Screenshot evidence (after)

- `20260326-remed-p1-hq-briefing-full.png`
- `20260326-remed-p1-hq-briefing-top-row.png`
- `20260326-remed-p1-hq-daily-briefing-card.png`

Stored at: `C:\Users\User\AppData\Local\Temp\cursor\screenshots\`

---

## Unresolved risks for next phase

- P1 density improvements rely on one representative state; run explicit 1366x768 + 1920x1080 visual checks before P2 overlay work to ensure no readability compression in low-height windows.
- Existing global TypeScript debt in `src/ui/map` and shared sim/state modules still blocks clean package build, which can mask future UI regressions if left unresolved.
- P2 overlays (Pause / Main Staff / Chronicle / Ops shell) share backdrop and focus stack behavior; changes should be validated together for focus trap and z-index interactions.
