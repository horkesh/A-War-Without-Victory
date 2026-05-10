# Dynamic Codex UN Mandate And Sanctions Breadth Wave

**Date:** 2026-05-10
**Commit:** this commit
**Roadmap lane:** v0.9.1 Dynamic Essay + Endgame Comparison

## Summary

Added an eighth authored Dynamic Codex breadth wave that routes existing endgame truth into eight international-mandate essays:

- London Conference
- UN Resolution 808 tribunal mandate
- UN Resolution 819 Srebrenica safe-area declaration
- UN Resolution 836 force authority
- No-fly zone enforcement
- Operation Sharp Guard
- NATO air-strike threat
- UN Resolution 820 sanctions

The wave is read-only. It adds `dynamic_sections` in `data/scenarios/essays/essay_index.json` and consumes already-live Cost Ledger and milestone atoms/tokens only.

## Canon Posture

Ring 2 narrative reflection only. No UN/NATO mandate logic, sanctions mechanics, Cost Ledger producer, event trigger, rupture logic, score rule, save schema, scenario data, casualty/displacement math, or sensitive-history adjudication changed.

## Verification

Red first:

```powershell
npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot
```

Failed on the missing eight section ids and missing rendered output.

Green after implementation:

```powershell
npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot
```

Passed 41/41.

## Follow-Up

v0.9.1 still has broader authored Codex coverage and narrative polish open. Future additions should continue the same rule: only attach `dynamic_sections` where existing endgame packets emit real truth.
