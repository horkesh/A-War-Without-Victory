# 2026-04-02 Product Architecture Authority Alignment

## Summary

Created an explicit architecture-authority map so the repo stops treating historical architecture write-ups, handoff memos, and live engineering docs as if they were all equally current.

## What Changed

- `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`
  - new architecture authority map naming the current governing documents for:
    - roadmap and milestone sequencing
    - entrypoints and code canon
    - player-visible state and UI ownership
    - tactical-map / desktop shell
    - command and operations architecture
  - explicitly classifies older root architecture artifacts as historical context rather than live authority
- `docs/20_engineering/REPO_MAP.md`
  - now points readers to `PRODUCT_ARCHITECTURE_AUTHORITY.md`
- `docs/20_engineering/CODE_CANON.md`
  - now treats architecture-era conflicts as something resolved through the new authority map instead of improvisation
- `ARCHITECTURE_SUMMARY.md`
  - now clearly marked as historical context rather than current architecture authority

## Why

The repo had grown into a familiar studio failure mode:

- several architecture docs still looked polished and important
- some were current, some were historical, and some were half-both
- implementers could easily mix eras and come away with a wrong but plausible mental model

This is exactly the kind of thing larger strategy studios guard against with explicit ownership of architecture canon.

## Verification

- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

The repo now has one explicit answer to “which architecture docs are actually live?” That reduces the chance of future Claude or human work reviving obsolete assumptions just because an older document still looks authoritative.
