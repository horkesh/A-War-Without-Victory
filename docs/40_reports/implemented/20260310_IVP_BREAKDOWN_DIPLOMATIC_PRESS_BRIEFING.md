# IVP Breakdown — Diplomatic Press Briefing (2026-03-10)

## Summary

P0 GUI gap closed: players can see **why** composite IVP is what it is. No new simulation mechanics—representation only.

## Engine (single source of weights)

- **`src/state/patron_pressure.ts`**
  - `IVP_WEIGHT_SARAJEVO_SIEGE = 0.4`, `IVP_WEIGHT_ENCLAVE_HUMANITARIAN = 0.3`, `IVP_WEIGHT_ATROCITY_VISIBILITY = 0.2`, `IVP_WEIGHT_NEGOTIATION_MOMENTUM = 0.1`
  - `updateInternationalVisibilityPressure` and `updatePatronState` use these constants (replaced inline literals).
  - `getIvpComponentContributions(ivp)` — fixed-order rows: raw 0–1, weight, contribution (weight × raw).
  - `formatIvpConsequenceLabel(id)`, `IVP_CONSEQUENCE_ORDER` — stable consequence display.

## Map (React)

- **`src/ui/map/components/SituationTab.tsx`**
  - **Bug fix:** `data-summary-section="ivp"` was on Alliance block; moved to International Pressure section. Command briefing `summaryFocus: 'ivp'` now scrolls correctly.
  - **Alliance block** uses `data-summary-section="alliance"`.
  - **Breakdown:** All four components with weighted contribution lines; thresholds 30/60/80%; consequences sorted by `IVP_CONSEQUENCE_ORDER` then `localeCompare`.

## Warroom

- **`src/ui/warroom/components/IvpBreakdownModal.ts`** (NEW) — Diplomatic Press Briefing dialog: composite %, component breakdown, thresholds, active consequences, optional tunnel note and `last_major_shift`.
- **`src/ui/warroom/ClickableRegionManager.ts`**
  - **Diplomacy:** Wrapper with footer button “Diplomatic press briefing (IVP breakdown)” opening `IvpBreakdownModal`.
  - **Command Briefing:** When war phase and (composite ≥ 60% or consequences active), wrapper with “Review IVP (N%)” button opens same modal.

## Tests

- **`tests/ivp_breakdown.test.ts`** — `getIvpComponentContributions` fixed order and weights; `formatIvpConsequenceLabel` smoke.
- **`vitest.config.ts`** — include new test file.

## Docs

- **WARROOM_MASTER.md** — IVP modal moved from Proposed to Implemented; Diplomacy row note updated.
- **GUI_MASTER.md** — Recent GUI changes row.
- **PROJECT_LEDGER.md** — Entry [2026-03-10] IVP Breakdown.

## Verification

- `npx tsc --noEmit` — pass
- `npx vitest run tests/ivp_breakdown.test.ts` — pass
- `npx vitest run tests/warroom_smoke.test.ts` — pass
- `npm run desktop:map:build` — run before commit

## Out of scope (per plan)

- New IVP inputs (e.g. shelling as separate metric).
- Changing composite formula.

## Orchestrator close memo

- **Entry point chosen:** Diplomacy telephone opens faction Diplomacy modal; footer button opens IVP breakdown (no second hotspot). Command Briefing gains IVP button only when composite ≥ 60% or consequences already active—avoids clutter when IVP is low.
- **Next P0 (out of this scope):** Turn-End Intelligence Packet / Enclave Crisis Modal remain on WARROOM_MASTER proposed list; calibration threads stay with other agents.
