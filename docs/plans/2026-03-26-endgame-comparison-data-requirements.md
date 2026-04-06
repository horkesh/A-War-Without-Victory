# Endgame Comparison Data Requirements — Design Doc

> **PLANNING STATUS NOTE (2026-04-06):** Superseded as the milestone execution plan by `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`. This document remains a requirements/source-gaps input.

**Date:** 2026-03-26
**Status:** PLACEHOLDER — awaiting daytime review
**Author:** /technical-architect (nightshift scaffold)
**Depends on:** v0.9.0 Consequence System, Cost Ledger template format
**Reference:** `docs/plans/2026-03-24-v090-consequence-system-plan.md`, `docs/plans/2026-03-26-cost-ledger-template-format.md`

---

## Scope

The Endgame Comparison system shows the player how their war diverged from the historical outcome. At Dayton scoring, the player sees their results side-by-side with what actually happened: territory, casualties, displacement, war duration, international standing. This document defines the historical data required for that comparison and identifies gaps that need sourcing.

The comparison is NOT a score — it is a mirror. The player sees what changed and what stayed the same. Some players will do "better" than history on one axis and "worse" on another. The system makes no judgment; it presents facts.

---

## Open Questions — FLAGGED FOR DAYTIME REVIEW

1. **Historical casualty figures:** Multiple authoritative sources disagree. RDC (Research and Documentation Center Sarajevo) gives ~97,000 killed. ICTY proceedings cite varying figures per case. BB (Balkan Battlegrounds) uses different methodology. Which source is canonical for comparison? /historian must advise. Recommendation: RDC for total, ICTY for specific events (Srebrenica = 8,372 per Krstic judgment).

2. **Territory at Dayton:** The 51/49 split is well-documented. But week-by-week territorial control through the war is not precisely mapped in any single source. The sim's painted targets (`data/scenarios/painted_targets/`) provide our best approximation. Is this sufficient for comparison, or do we need an independent historical territory timeline?

3. **Displacement figures:** UNHCR estimates 2.2 million displaced (of 4.4 million population). Per-municipality displacement data exists in UNHCR and RDC records but is incomplete for early-war months. What level of granularity is needed?

4. **War crimes count:** The sim tracks war crimes via event flags. Historical war crimes are documented in ICTY indictments. Should comparison use number of events/incidents, number of victims, or ICTY charge categories? These are very different numbers.

5. **Economic destruction:** The sim does not currently model economic infrastructure. Should endgame comparison include economic cost (estimated $50-100 billion)? If so, this requires a new data source — no GameState field exists for economic damage.

6. **Faction-specific comparisons:** Should each faction see different comparison data? RS player sees RS-specific historical data (territory held, forces remaining, patron relationship). RBiH player sees RBiH data. Or does everyone see the full picture?

7. **Early peace comparison:** If the player ends the war at Vance-Owen (w50-70), what is the comparison baseline? Historical Dayton (1995) or projected outcome at the player's stopping point? /game-designer must decide.

---

## Required Historical Data Points

### Category A: Territory (well-sourced)

| Data Point | Historical Value | Source | Status |
|------------|-----------------|--------|--------|
| RS territory at Dayton | 49% | Dayton Agreement Annex 2 | AVAILABLE |
| Federation territory at Dayton | 51% | Dayton Agreement Annex 2 | AVAILABLE |
| RS maximum extent (~w20) | ~70% | BB Vol. 1 maps | NEEDS VERIFICATION |
| RBiH minimum extent (~w20) | ~25% | BB Vol. 1 maps | NEEDS VERIFICATION |
| HRHB-controlled territory peak | ~15% | BB Vol. 1 maps | NEEDS VERIFICATION |

### Category B: Casualties (sourced, figures disputed)

| Data Point | Historical Value | Source | Status |
|------------|-----------------|--------|--------|
| Total killed | ~97,207 | RDC 2007 (name-verified) | AVAILABLE |
| Bosniak killed | ~64,036 (65.88%) | RDC 2007 | AVAILABLE |
| Serb killed | ~24,905 (25.62%) | RDC 2007 | AVAILABLE |
| Croat killed | ~7,788 (8.01%) | RDC 2007 | AVAILABLE |
| Military killed | ~57,523 | RDC 2007 | AVAILABLE |
| Civilian killed | ~39,684 | RDC 2007 | AVAILABLE |
| Srebrenica genocide | ~8,372 | ICTY (Krstic IT-98-33) | AVAILABLE |

### Category C: Displacement (sourced, granularity varies)

| Data Point | Historical Value | Source | Status |
|------------|-----------------|--------|--------|
| Total displaced | ~2.2 million | UNHCR | AVAILABLE |
| Refugees (cross-border) | ~1.2 million | UNHCR | AVAILABLE |
| IDPs (internal) | ~1.0 million | UNHCR | AVAILABLE |
| Per-municipality displacement | Partial | UNHCR + RDC | GAPS — /historian to assess |

### Category D: War Duration & Key Events

| Data Point | Historical Value | Source | Status |
|------------|-----------------|--------|--------|
| War start | April 1992 | — | AVAILABLE |
| War end (Dayton signing) | December 1995 | — | AVAILABLE |
| Duration | ~188 weeks | — | AVAILABLE |
| Srebrenica fall | July 11, 1995 (~w170) | — | AVAILABLE |
| Deliberate Force start | August 30, 1995 (~w177) | — | AVAILABLE |
| Washington Agreement | March 1, 1994 (~w100) | — | AVAILABLE |
| Contact Group plan | July 1994 (~w117) | — | AVAILABLE |

### Category E: Strategic Dimensions (requires derivation)

| Data Point | Historical Value | Source | Status |
|------------|-----------------|--------|--------|
| RS international standing at Dayton | Very low | ICTY narratives | NEEDS QUANTIFICATION |
| RBiH international standing at Dayton | Moderate-high | ICTY narratives | NEEDS QUANTIFICATION |
| Patron relationships at Dayton | Belgrade cut RS loose | ICTY (Perisic, Karadzic) | NEEDS QUANTIFICATION |
| Military balance at ceasefire | Rough parity post-Storm | BB Vol. 2 | NEEDS QUANTIFICATION |

---

## Data Format (Preliminary)

```typescript
// Placeholder — exact shape TBD after daytime review

interface HistoricalBaseline {
    /** Territory percentages at war's end, keyed by faction. */
    territory_pct: Record<FactionId, number>;
    /** Total killed by faction. */
    killed: Record<FactionId, number>;
    /** Total displaced. */
    displaced: number;
    /** War duration in weeks. */
    duration_weeks: number;
    /** Key events that fired historically (event IDs). */
    historical_events: string[];
    /** Strategic dimension values at Dayton (derived from historical record). */
    dimensions: Record<FactionId, Record<string, number>>;
}

interface EndgameComparison {
    player_result: GameEndState;      // Derived from GameState at endgame
    historical: HistoricalBaseline;   // Static data loaded from JSON
    divergence_notes: string[];       // Generated from flag differences
}
```

---

## Next Steps

1. /historian: Verify Category B casualty figures against RDC 2007 dataset. Identify per-faction military vs. civilian breakdown. Assess Category C per-municipality displacement data availability.
2. /historian: Quantify Category E strategic dimensions from ICTY trial narratives. Provide 1-5 scale or 0-100 values with source citations.
3. /game-designer: Decide on comparison presentation (side-by-side table, narrative summary, both). Decide on early-peace comparison baseline (Question 7).
4. /technical-architect: Map comparison data points to existing GameState fields. Identify which require new state fields vs. derivation at endgame.
5. Resolve open questions 1-7 before implementation begins.
6. Create `data/reference/historical_baseline.json` with verified Category A-D values.
