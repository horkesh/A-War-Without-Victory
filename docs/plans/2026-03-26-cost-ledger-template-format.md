# Cost Ledger Template Format — Design Doc

**Date:** 2026-03-26
**Status:** PLACEHOLDER — awaiting daytime review
**Author:** /technical-architect (nightshift scaffold)
**Depends on:** v0.9.0 Consequence System, v0.8.0 Command Chain
**Reference:** `docs/plans/2026-03-24-v090-consequence-system-plan.md`, `docs/plans/2026-03-25-command-chain-architecture.md`

---

## Scope

The Cost Ledger is the endgame accounting system that tallies the human, political, and material costs of the player's war. It is presented at Dayton scoring as a moral reckoning — not a victory screen, but a bill. The ledger answers: "What did your choices cost?"

This document defines the template format for Cost Ledger entries, the data sources that feed them, and the rendering contract for the endgame UI.

---

## Open Questions — FLAGGED FOR DAYTIME REVIEW

1. **ICTY case structure as template:** Should Cost Ledger entries mirror ICTY indictment structure (charges, findings, verdicts)? /historian needs to advise on which case structures are appropriate to template without trivializing the proceedings.

2. **Granularity:** Per-municipality casualty tracking vs. per-faction aggregate? The sim tracks both (`casualty_ledger.ts` has per-brigade data, `displacement` has per-OSID data). How deep should the ledger drill?

3. **Moral framing:** The ledger must avoid both triumphalism ("you won efficiently") and moralism ("you should feel bad"). What tone does /game-designer want? The negative-sum identity suggests: "here is what happened, and here is what it cost."

4. **Dynamic vs. static entries:** Should Cost Ledger entries be static templates filled with numbers, or should they include dynamic narrative text generated from consequence chain outcomes?

5. **Comparison baseline:** Does the Cost Ledger show the historical cost alongside the player's cost? If so, what is the canonical source for historical casualty/displacement figures? RDC (Research and Documentation Center Sarajevo) numbers vs. ICTY findings vs. BB estimates — these differ significantly.

6. **War crimes attribution:** The sim tracks war crimes via flags and events. Should the Cost Ledger attribute specific war crimes to player decisions (e.g., "You tolerated ethnic cleansing in the Drina valley — 50,000 displaced")? This is historically accurate but mechanically complex.

7. **Suppressed events:** When consequence chains suppress historical events (e.g., Srebrenica never falls), should the Cost Ledger note what DIDN'T happen? "In the actual war, 8,000 men and boys were killed at Srebrenica. In yours, the enclave survived."

---

## Preliminary Data Sources

These GameState fields feed Cost Ledger entries at endgame:

| Data Source | Location | What It Provides |
|-------------|----------|------------------|
| `state.military.casualty_ledger` | `src/state/casualty_ledger.ts` | Per-brigade KIA, WIA, MIA by turn |
| `state.displacement` | GameState displacement fields | Per-OSID displaced populations |
| `state.political_controllers` | GameState | Territory control at war's end |
| `state.military.event_flags` | GameState | Which events fired, which were suppressed |
| `state.negotiation` | Negotiation state | Patron relationships, peace plan outcomes |
| `state.meta.turn` | GameState | War duration |
| Strategic dimensions | Per-faction dimensions | International standing, military credibility, etc. |

---

## Preliminary Template Structure

```typescript
// Placeholder — exact shape TBD after daytime review

interface CostLedgerEntry {
    category: 'casualties' | 'displacement' | 'war_crimes' | 'infrastructure' | 'political';
    title: string;
    description_template: string;  // Template with {variable} placeholders
    data_sources: string[];        // GameState field paths
    historical_comparison?: {
        value: number;
        source: string;            // "RDC 2007" or "ICTY IT-xx-xx"
    };
}

interface CostLedger {
    faction: FactionId;
    entries: CostLedgerEntry[];
    total_human_cost: number;      // Aggregate casualties + displacement
    war_duration_weeks: number;
    verdict: string;               // Endgame narrative summary
}
```

---

## Next Steps

1. /historian: Research ICTY case structures suitable for templating. Identify 3-5 landmark cases (Krstic, Karadzic, Prlic) whose structure could inform ledger categories.
2. /game-designer: Define tone and moral framing. Review negative-sum identity constraints.
3. /technical-architect: Map GameState fields to ledger entry data sources. Identify gaps.
4. Resolve open questions 1-7 before implementation begins.
