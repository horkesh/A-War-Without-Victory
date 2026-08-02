# Locale-sensitive formatting inventory

**Date:** 2026-08-02

**Scope:** production map UI (`src/ui/map/**/*.{ts,tsx}`)

The canonical formatter is `formatLocalizedNumber()` in `src/ui/map/i18n/index.ts`. It resolves Bosnian through `bs-BA` and English / nonpersisted `qps` through `en-US`, so player presentation does not inherit the host operating-system locale.

## Covered core surfaces

The following six player-facing surfaces have no zero-argument `toLocaleString()` calls and are guarded by `tests/ui/r7_locale_surface_contract.test.ts`:

- after-action report (`AARPanel.tsx`);
- brigade row (`BrigadeRow.tsx`);
- settlement detail (`SettlementDetailContent.tsx`);
- endgame verdict (`VerdictScreen.tsx`);
- operation history (`OperationHistoryPanel.tsx`);
- Army HQ operations (`army_hq/OperationsSection.tsx`).

This repair adds 53 production calls to `formatLocalizedNumber()` including the helper definition. The selected core surfaces account for 52 call sites.

## Honest residual

A deterministic source census after the repair finds:

- 46 zero-argument `toLocaleString()` call sites across 26 other map UI files;
- 21 explicit-locale `toLocaleString(...)` / `Intl.NumberFormat(...)` call sites, including legacy `en-US` authored narrative helpers and older direct Bosnian switches;
- no `toLocaleDateString()`, `toLocaleTimeString()`, or `Intl.DateTimeFormat` use in the map UI.

Calendar presentation currently uses UTC arithmetic plus the explicit `en | bs | qps` month table in `utils/formatters.ts`, so it is locale-aware without host date formatting. The 46 residual number sites are not claimed complete and remain follow-up localization debt; this Phase 3 repair covers the six named high-traffic surfaces only.

Reproduce the residual census:

```powershell
rg -n "\.toLocale(String|DateString|TimeString)\(\)" src/ui/map -g "*.ts" -g "*.tsx"
```
