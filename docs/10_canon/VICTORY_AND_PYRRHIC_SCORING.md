# Victory Conditions and Pyrrhic Scoring — Canonical

**Status:** CANON (v0.9.0 gate)
**Last Updated:** 2026-04-16
**Authority:** Canon hierarchy, Tier 2 (above Rulebook, below Engine Invariants)
**Owners:** Game Designer, Gameplay Programmer, Product Manager
**Supersedes:** open question #5 in `MASTER_ROADMAP.md` ("Endgame scoring / victory conditions")
**Referenced by:** `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`, `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`

---

## 0. Thesis

AWWV is a **negative-sum political wargame**. There is no winning. There are only **graded failures**. The file header of `src/sim/negotiation/scoring.ts` states it plainly: *"The least bad version of a tragedy."*

The player is judged on how much worse they made it versus what was possible — not on who prevailed. Every endgame surface, every score, every outcome label serves this thesis. Any future feature that contradicts it is wrong.

**Corollaries:**
- There is no victory screen. There is a **verdict screen**.
- There is no single winner. The verdict is per-faction.
- There is no scoreboard. Pyrrhic score is *supporting context*, not sovereign truth.
- Outcome class + grade are the primary verdict drivers. Condemnation flags can cap or taint any result.

---

## 1. Termination vs Judgment (owner split)

Two distinct systems decide "this is the end":

| System | Module | Responsibility |
|---|---|---|
| **Termination** | `src/sim/war_termination.ts` → `checkWarTermination()` | *When* the war ends |
| **Judgment** | `src/sim/negotiation/scoring.ts` → `computeFullVerdict()` | *How* the war is assessed |

Termination produces a boolean game-over + an `outcome` label. Judgment produces a `GameVerdict` with per-faction `FactionVerdict` packets. They are computed in that order and never fold into each other.

### Termination priority (first match wins)

1. **Scenario victory conditions** — if a scenario defines `victory_conditions` and any faction passes all checks, fire `victory:{faction}` or `co_victory:{factions}`.
2. **Faction collapse** — if 2+ factions have zero active brigades, the last remaining faction survives; fire `faction_collapse:{collapsed}:winner:{survivor}`.
3. **Turn limit stalemate** — `turn >= (meta.max_turns ?? 208)`; fire `timeout_stalemate`.
4. **No termination** — war continues.

### Judgment is orthogonal

Judgment runs regardless of which termination trigger fired. A victory-condition match does not give that faction automatic A+ — it still gets judged against its grade anchors. A `timeout_stalemate` at turn 208 still produces a full verdict for every faction.

---

## 2. Outcome Taxonomy

Seven `OutcomeClass` values, defined in `src/state/negotiation_types.ts`, classified deterministically in `classifyOutcome()` (`scoring.ts:218-249`):

| Outcome | Meaning | Canonical triggers |
|---|---|---|
| `strategic_success` | Core war aims achieved at acceptable cost | Grade A+ AND no condemnation |
| `survival` | Faction exists at end, functioning state | Grade A |
| `negotiated_escape` | Acceptable Dayton-equivalent compromise | Grade B |
| `pyrrhic_success` | Won something, at cost that broke the nation | Grade C |
| `hollow_victory` | Territorial success tainted by condemnation | Any condemnation flag + territory >30% |
| `failure` | Core objectives lost or genocide condemnation | Grade D or `genocide_condemnation` |
| `collapse` | Faction ceased to function | Grade F or territory ≤0 |

**Classification order matters.** Condemnation flags are checked before territorial grades, which is why Srebrenica genocide forces `failure` regardless of how much territory RS controlled — the condemnation is decisive.

### What each outcome class must not mean

- `strategic_success` is **not** "victory." It is the top of the tragedy scale. A+ grade on a negative-sum war is still a catastrophe for the population.
- `survival` is **not** "par." Historical RBiH in 1995 barely earned survival; survival is already a difficult outcome.
- `pyrrhic_success` is **not** flattering. The outcome name intentionally evokes Pyrrhus of Epirus: "another such victory and we are undone."
- `hollow_victory` and `failure` are **not** interchangeable. Hollow means condemnation without total collapse; failure means systemic or moral disqualification.

---

## 3. Scoring Model

### 3.1 Pyrrhic score (0-100)

Computed in `computePyrrhicScore()` (`scoring.ts:260-263`). Pure dimension-weighted assessment:

```
pyrrhic_score = computeNegotiatingCapital(dimensionStore, faction)
              = sum(effective_value * DIMENSION_WEIGHT)
```

Six strategic dimensions feed it (`src/sim/events/strategic_dimensions.ts`):

| Dimension | RBiH weight | RS weight | HRHB weight |
|---|---|---|---|
| military_credibility | 0.15 | **0.25** | 0.15 |
| territorial_legitimacy | 0.15 | **0.25** | 0.20 |
| international_standing | **0.25** | 0.10 | 0.15 |
| patron_confidence | 0.15 | 0.15 | **0.25** |
| internal_cohesion | 0.15 | 0.10 | 0.15 |
| negotiating_leverage | 0.15 | 0.15 | 0.10 |

Each column sums to 1.00. Faction-specific weights encode political identity: RS wins through military credibility *and* territorial legitimacy (the "greater Serbia" thesis); RBiH wins through international standing (the "survivor state" thesis); HRHB wins through patron confidence (the "client of Zagreb" thesis). These are not knobs — they are canon.

**Pyrrhic score is not sovereign.** It is supporting context. A 95/100 score with a `genocide_condemnation` flag still produces `outcome_class: 'failure'`.

### 3.2 Faction grades

Grades A+/A/B/C/D/F are assigned by faction-specific anchors (`scoring.ts:71-199`). Anchors are evaluated in order; first match wins. Each anchor is a predicate on the faction's `NegotiationBreakdown` + `GameState`, not a score threshold.

**Grade anchors encode historical reality:**

| RBiH anchor | Condition |
|---|---|
| A+ | >33% territory AND no enclaves lost AND zero war crimes |
| A | ≥30% territory AND ≤1 enclave lost AND Sarajevo held |
| B | ≥25% territory AND Sarajevo held |
| C | ≥18% territory AND ≤3 enclaves lost |
| D | ≥10% territory |
| F | fallback |

| RS anchor | Condition |
|---|---|
| A+ | >55% territory AND ≤2 war crimes events |
| A | ≥49% territory AND internal cohesion ≥30 |
| B | ≥45% territory |
| C | ≥40% territory |
| D | ≥30% territory |
| F | fallback |

| HRHB anchor | Condition |
|---|---|
| A+ | >20% territory AND cohesion ≥50 |
| A | ≥15% territory AND cohesion ≥40 |
| B | ≥12% territory AND cohesion ≥30 |
| C | ≥8% territory |
| D | ≥4% territory |
| F | fallback |

**Anchors are canon.** Changing them changes what the game means by "roughly historical." Any proposed change must go through the sign-off structure in §6.

### 3.3 Dimension grades

Six per-dimension letter grades (A+/A/B/C/D/F) threshold-gated on raw dimension score (`scoring.ts:41-55`). Displayed in `FactionReport` and `VerdictScreen` tabs. They are descriptive, not judgmental — the faction grade is the judgmental surface.

### 3.4 Condemnation flags

Currently one: `genocide_condemnation`, fired by the Srebrenica rupture (`src/sim/negotiation/rupture_consequences.ts`). See `SENSITIVE_HISTORY_DESIGN_GATE.md` §2 for the expansion rule.

Flags propagate from `rupture_consequences[]` through `collectCondemnationFlags()` into `FactionVerdict.condemnation_flags[]`. Once recorded, a rupture is permanent.

---

## 4. Scenario Contract

### 4.1 Schema

Defined in `src/scenario/scenario_types.ts`:

```typescript
export interface FactionVictoryCondition {
    min_controlled_settlements?: number;
    max_exhaustion?: number;
    required_settlements_all?: string[];
}
export interface ScenarioVictoryConditions {
    by_faction: Record<string, FactionVictoryCondition>;
}
```

Attached as optional `victory_conditions?: ScenarioVictoryConditions` on a `Scenario`.

### 4.2 Fallback behavior (canonical)

The schema distinguishes three states with three distinct semantics:

| Scenario author writes… | `evaluateVictoryConditions(…)` returns | Meaning |
|---|---|---|
| `victory_conditions` absent (undefined) | `null` | No victory-condition termination is evaluated at all. The default. |
| `victory_conditions: { by_faction: {} }` | `{ result: 'no_winner', … }` | Author explicitly declared conditions for zero factions — nobody can win. Rare; use only for what-if scenarios that deliberately exclude a victory termination. |
| `victory_conditions: { by_faction: { … } }` with factions | normal evaluation | Evaluate per-faction checks; return `'winner'`, `'co_winners'`, or `'no_winner'`. |

**In the default (undefined) case, which covers `apr_1992` and all current live scenarios:**

- Termination falls through to faction collapse (priority 2) and turn limit stalemate (priority 3).
- The war runs to its natural Dayton/exhaustion endpoint.
- Judgment still fires on termination and produces a full verdict.

**This is the default by design.** The canonical `apr_1992` campaign has no `victory_conditions` because the thesis is "the war ends when history ended it, and the player is judged on what they made of it." A scenario that specifies `victory_conditions` is declaring itself non-canonical — a training scenario, a what-if, or a bounded exercise.

### 4.3 When to use `victory_conditions`

Appropriate:
- Training / tutorial scenarios with clear pedagogical goals (e.g., "hold Sarajevo for 20 weeks")
- Bounded what-if scenarios with an explicit "what counts as proving the hypothesis" gate
- Regression / test scenarios that need deterministic early termination

Not appropriate:
- The primary April 1992 campaign
- Historical scenarios (April 1993, April 1994, January 1995) when authored
- Any scenario that pretends to simulate "winning the Bosnian War"

### 4.4 Relationship to scoring

Victory conditions terminate the war. They do **not** assign grades, outcome classes, or Pyrrhic scores. A victory-condition match still runs through full judgment. A faction that "wins" via scenario condition can still earn grade F if its capital is in ruins.

---

## 5. UX / Narrative Integration

### 5.1 VerdictScreen (canonical endgame surface)

`src/ui/map/components/VerdictScreen.tsx` is the sole canonical endgame presentation owner. It renders:

- Outcome label (from `outcomeLabel`, not "winner" language)
- Per-faction tabs (pyrrhic_score, grade, outcome_class badge)
- Selected faction detail (FactionReport: dimension bars, grade description, capital breakdown)
- War Cost Summary (cost ledger + historical comparison)
- Condemnation notice (if any `condemnation_flags` present)

**What VerdictScreen must never do:**
- Announce a "winner" as though one faction won the war
- Use celebratory language ("Victory!", "Triumph")
- Show a leaderboard comparing factions
- Minimize condemnation ("despite some issues…")
- Treat Pyrrhic score as the primary verdict

### 5.2 Chronicle and Wrapped

`src/ui/map/components/chronicle/` renders narrative endgame summaries and the slideshow. Both consume the same `gameVerdict`, `costLedger`, `historicalComparison` packets as `VerdictScreen`. They are downstream consumers — they never compute verdict truth independently.

### 5.3 Cost Ledger wording rules

See `SENSITIVE_HISTORY_DESIGN_GATE.md` §4 for the full wording constraints. Summary: historical voice, ICTY-case language where available, no euphemisms, no trivializing comparisons.

### 5.4 What belongs in score vs narrative

| Score surface | Narrative surface |
|---|---|
| Pyrrhic score (0-100) | Cost Ledger prose |
| Grade (A+/A/…/F) | Chronicle entries |
| Outcome class badge | Wrapped slides |
| Dimension grades | Historian-voiced essays |
| Condemnation flags (structured) | Condemnation text (ICTY-cited) |

**Rule:** Anything that can be optimized against is a score. Anything that is read once and judged is narrative. Do not let the narrative surface drift into score-like comparisons that invite optimization.

---

## 6. Non-Goals

This system **does not and will not**:

1. **Reward body count.** Higher casualties never increase Pyrrhic score. Every dimension is either neutral or penalized by casualties/atrocities.
2. **Treat atrocity as tradeable capital.** Condemnation flags are locked consequences; they cannot be negotiated away at Dayton.
3. **Invert under any input.** There is no combination of war crimes + territory that produces a better outcome than the same territory without the war crimes.
4. **Expose a "difficulty" multiplier.** Scores are absolute historical assessments, not normalized against difficulty.
5. **Produce a "winner" label.** Every scenario ends with a per-faction verdict. Even `victory:{faction}` terminations still judge the other factions.
6. **Rank factions against each other.** The verdict is per-faction against their own grade anchors.
7. **Drift toward arcade endings.** No high-score leaderboard, no achievement list, no "perfect run" badge.

---

## 7. QA Matrix

Regression contracts that must hold (enforced by `tests/victory_conditions_a2.test.ts` and `tests/victory_and_pyrrhic_contract.test.ts`):

| Contract | Assertion |
|---|---|
| Victory conditions fire when met | `evaluateVictoryConditions` returns `winner` for satisfying faction |
| Victory conditions produce run_summary | `scenario_runner` writes `victory` block to `run_summary.json` |
| Fallback (no conditions) runs to turn limit | Scenario without `victory_conditions` terminates on collapse or turn limit |
| `classifyOutcome` deterministic | Same inputs → same output, sorted iteration |
| Genocide condemnation forces `failure` | `condemnation_flags: ['genocide_condemnation']` + any grade → `'failure'` |
| Condemnation taints territorial success | Any flag + territory >30% → `'hollow_victory'` |
| Pyrrhic score is non-inverting | Adding war_crimes_events never increases score; adding civilian casualties never increases score |
| Rupture is idempotent | Re-running `evaluateRuptureConsequences` with same conditions does not duplicate |
| Grade F when territory ≤0 | Any faction with zero territory gets `collapse` |
| No "winner" label in outcomeLabel | `outcome === 'victory_*'` → label is `"{faction} Prevails"`, not "Winner" |

---

## 8. Sign-Off Structure

Changes to this system require explicit review:

| Change | Review required |
|---|---|
| Grade anchor thresholds | `/game-designer` + `/war-or-game` |
| New outcome class | `/game-designer` + `/narrative-designer` + user approval |
| Dimension weights | `/game-designer` + `/historian` |
| New condemnation flag | See `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 |
| Scenario contract schema | `/technical-architect` + `/qa-engineer` |
| VerdictScreen copy | `/narrative-designer` + `/historian` |

The five-question gate applies: who owns this after the change, what competing path is being removed, what proof of real change exists, what UI or doc reflects the new truth, what future work does this unblock.

---

## 9. References

- `src/sim/negotiation/scoring.ts` — verdict computation
- `src/sim/negotiation/rupture_consequences.ts` — condemnation flag source
- `src/sim/war_termination.ts` — termination triggers
- `src/scenario/victory_conditions.ts` — victory condition evaluator
- `src/scenario/scenario_types.ts` — scenario schema
- `src/sim/endgame/cost_ledger.ts` — cost ledger builder
- `src/sim/endgame/endgame_comparison.ts` — historical comparison
- `src/ui/map/components/VerdictScreen.tsx` — canonical endgame UI
- `src/state/negotiation_types.ts` — OutcomeClass, RuptureConsequence, FactionVerdict types
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` — sensitive content boundaries
- `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` — design origin
