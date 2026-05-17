# IVP Breakdown Modal Stale Row Verification

**Date:** 2026-05-18

**Scope:** Verify the `CONSOLIDATED_BACKLOG.md` row claiming `IvpBreakdownModal` is a dead requirement referenced in CLAUDE.md but never implemented.

## Finding

The row is stale. `IvpBreakdownModal` exists and is wired in the warroom:

- `src/ui/warroom/components/IvpBreakdownModal.ts`
- `src/ui/warroom/ClickableRegionManager.ts`
- `tests/ivp_breakdown_modal_boundary.test.ts`
- `tests/ivp_breakdown.test.ts`

The modal renders a diplomatic press briefing surface from the warroom snapshot boundary. `ClickableRegionManager` exposes it from command-briefing / diplomacy-style IVP affordances when IVP pressure is relevant.

## Verification

Evidence commands:

```powershell
rg --files src tests docs | rg "IvpBreakdown|Ivp|ivp"
rg -n "IvpBreakdownModal|IVP breakdown" src/ui/warroom tests docs/40_reports/CONSOLIDATED_BACKLOG.md
```

The search shows the concrete implementation, wiring, and tests. No code change is needed for this row.

## Disposition

Mark the backlog row as **STALE/VERIFIED CLOSED 2026-05-18** during parent documentation integration. Do not build a second IVP modal.
