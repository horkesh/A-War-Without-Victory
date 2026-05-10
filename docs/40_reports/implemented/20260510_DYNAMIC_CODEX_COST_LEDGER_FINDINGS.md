# Dynamic Codex Cost Ledger Findings

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison

## Summary

The Dynamic Codex now consumes the same source-labeled Cost Ledger findings that appear in the War Cost surface. Endgame judgment no longer lives only in `VerdictScreen` / `WarCostSummary`: relevant historical essays can gate and render prosecutorial findings directly through the dynamic essay resolver.

## Implementation

- Added Cost Ledger finding condition atoms to `codexEssayResolver`:
  - `FINDING:<id>`
  - `FINDING_CATEGORY:<category>`
  - `FINDING_SEVERITY:<severity>`
  - `FINDING_FACTION:<faction>`
- Added template tokens:
  - `{cost_findings}` renders deterministic title/faction/text paragraphs.
  - `{cost_rupture_findings}`, `{cost_human_findings}`, `{cost_displacement_findings}`, and `{cost_war_crimes_findings}` render category-filtered finding paragraphs.
  - `{cost_finding_sources}` renders sorted unique source labels.
- Passed `loadedGameState.costLedger` into `CodexPanel` essay resolution.
- Authored two `essay_index.json` sections:
  - `v091_cost_ledger_srebrenica_finding` on the Srebrenica essay, filtered to rupture findings.
  - `v091_cost_ledger_findings_docket` on the Dayton essay.

## Canon Posture

This is Ring 2 narrative reflection. The lane does not add a simulation writer, rupture trigger, scoring rule, player lever, or save schema. It reuses already-built Cost Ledger findings and keeps the wording under the Sensitive History Design Gate: source-labeled, third-person, no achievement language, no minimization, no body-count optimization.

## Verification

- Red first:
  - `tests/ui/codex_essay_resolver.test.ts`
  - `tests/ui/codex_essay_vocab_integration.test.ts`
  - `tests/ui/codex_panel_dynamic_mount.test.ts`
- Green:
  - `npx.cmd vitest run tests/ui/codex_essay_resolver.test.ts tests/ui/codex_essay_vocab_integration.test.ts tests/ui/codex_panel_dynamic_mount.test.ts tests/docs_desktop_v09_truth.test.ts --reporter=dot`
  - 50/50 focused code/docs tests passed after the category-filtered token was added.

## Remaining Work

v0.9.1 remains partial. This closes the Cost Ledger-to-Codex bridge, but richer milestone-week comparison UX and broader dynamic essay authoring remain open.
