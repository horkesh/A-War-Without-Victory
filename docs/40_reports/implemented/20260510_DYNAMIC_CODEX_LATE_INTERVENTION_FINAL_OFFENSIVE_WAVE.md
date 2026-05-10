# Dynamic Codex Late Intervention And Final Offensive Breadth Wave

**Date:** 2026-05-10
**Commit:** this commit
**Roadmap lane:** v0.9.1 Dynamic Essay + Endgame Comparison

## Summary

Added a seventh authored Dynamic Codex breadth wave that routes existing endgame truth into eight late-war essays:

- Operation Deliberate Force
- UN hostage crisis
- Gorazde crisis
- Operation Mistral 2
- Operation Sana
- Operation Summer '95
- Washington halts the Federation advance
- Washington Agreement

The wave is read-only. It adds `dynamic_sections` in `data/scenarios/essays/essay_index.json` and consumes already-live Cost Ledger and milestone atoms/tokens only.

## Canon Posture

Ring 2 narrative reflection only. No NATO/intervention trigger, operation result, Cost Ledger producer, event trigger, rupture logic, score rule, save schema, scenario data, casualty/displacement math, or sensitive-history adjudication changed.

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

Passed 39/39.

## Follow-Up

v0.9.1 still has broader authored Codex coverage and narrative polish open. Future additions should continue the same rule: only attach `dynamic_sections` where existing endgame packets emit real truth.
