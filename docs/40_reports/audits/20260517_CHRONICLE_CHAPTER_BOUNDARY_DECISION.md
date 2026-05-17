# Chronicle Chapter Boundary Decision Memo

**Date:** 2026-05-17
**Lane:** Chronicle chapters
**Status:** Design-gated; no Chronicle runtime changes.

## Decision Required

Chronicle chapters need one boundary rule before implementation:

1. **End-of-month chapters**: predictable calendar grouping, higher chapter count.
2. **End-of-phase chapters**: fewer, campaign-shaped arcs tied to existing phase transitions.
3. **User-triggered bookmarks**: player-authored groupings, broader UX and persistence scope.

Recommended boundary: **hybrid phase-first**. Use deterministic player-faction campaign-phase chapters as the primary boundary, add month labels/subsections inside long chapters for scanability, and defer user-authored bookmarks until a later save-backed UX pass.

Approval status: pending user approval before Chronicle runtime changes.

## Recommendation

Use **hybrid phase-first chapters** for v1.0. The repo's current "end-of-phase" default is directionally right, but "phase" must not mean `meta.phase` because the canonical lifecycle is effectively war-only. Chapter phases should derive from campaign/doctrine structures such as faction standing-order windows or doctrine phases, with month labels inside long arcs.

## Research Basis

- Existing Chronicle generation is flat and turn-sorted, so adding chapters should be a read-model layer rather than a new runtime history owner.
- Turn Aftermath already supplies per-turn archive records and campaign-cost summaries, making it a natural source for chapter contents.
- Cost Ledger is endgame/reflection aggregation, not a new chapter boundary owner.
- Canon lifecycle phase is too broad for chaptering; campaign arcs live in faction timelines, standing orders, doctrine phases, and Army HQ campaign-plan windows.
- User bookmarks require persistence, migration, editing/deletion UX, and save compatibility; they are useful later but too broad for v1.0 boundary selection.

## Implementation Consequences

- No chapter builder or UI should land until the boundary is selected.
- Chapter boundaries should be player-faction scoped.
- Preferred source order: player faction `war_timeline.standing_orders`, then doctrine phases, then month windows as fallback when timeline data is absent.
- Dynamic Army HQ campaign-plan windows can appear as chapter metadata, but should not be the primary splitter because they may churn.
- Chapter titles must be deterministic and cite only source Chronicle/Turn Aftermath/Cost Ledger/Codex entry ids.
- Sensitive-history claims must be inherited from source entries only; no generated title/body may invent an atrocity, rupture, or outcome.

## Ready Follow-Up

After approval, implement `src/ui/map/data/chronicleChapters.ts` with tests for grouping, stable ordering, month labels inside long chapters, source id preservation, player-faction scoping, and sensitive-history guardrails.
