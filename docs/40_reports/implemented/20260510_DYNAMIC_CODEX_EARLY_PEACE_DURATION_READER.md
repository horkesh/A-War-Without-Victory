# Dynamic Codex Early-Peace Duration Reader

**Date:** 2026-05-10
**Commit:** this commit
**Milestone:** v0.9.1 Dynamic Essay + Endgame Comparison
**Ring:** Ring 2 narrative reflection

## Summary

The Dynamic Codex now consumes the Cost Ledger's accepted-peace duration finding. The Vance-Owen essay can render a source-labeled inserted section when `early_peace_implementation_record` exists, using a new `{cost_duration_findings}` token that filters Cost Ledger findings by `duration`.

## Implementation

- Added the `cost_duration_findings` interpolation token in `codexEssayResolver`.
- Added a Vance-Owen dynamic section gated by `GAME_OVER AND FINDING:early_peace_implementation_record`.
- Extended resolver and vocabulary integration tests so duration findings render deterministically and only after the Cost Ledger emits the real finding.

## Canon Posture

This is a read-only narrative reader bridge. It does not change peace-plan acceptance, war termination, scoring, scenario data, save schema, rupture handling, or sensitive-history adjudication. The inserted text preserves the Packet C3 framing: early termination is a recorded fact, not proof that political or civilian costs vanished.

## Verification

- `npx.cmd vitest run tests/ui/codex_essay_resolver.test.ts tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` passed 65/65.
