# Chronicle Chapter Boundary Decision Memo

**Date:** 2026-05-17
**Lane:** Chronicle chapters
**Status:** Design-gated; no Chronicle runtime changes.

## Decision Required

Chronicle chapters need one boundary rule before implementation:

1. **End-of-month chapters**: predictable calendar grouping, higher chapter count.
2. **End-of-phase chapters**: fewer, campaign-shaped arcs tied to existing phase transitions.
3. **User-triggered bookmarks**: player-authored groupings, broader UX and persistence scope.

Selected boundary: pending user decision

## Recommendation

Use **end-of-phase chapters** for v1.0. It best matches the existing campaign structure, avoids excessive monthly fragmentation, and does not require new player-authored persistence.

## Implementation Consequences

- No chapter builder or UI should land until the boundary is selected.
- Chapter titles must be deterministic and cite only source Chronicle/Turn Aftermath/Cost Ledger/Codex entry ids.
- Sensitive-history claims must be inherited from source entries only; no generated title/body may invent an atrocity, rupture, or outcome.

## Ready Follow-Up

After selection, implement `src/ui/map/data/chronicleChapters.ts` with tests for grouping, stable ordering, source id preservation, and sensitive-history guardrails.
