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

### 3.5 War-cost cap on faction grades (`war_cost_index` / `capGradeByCost`)

The faction grade earned by the anchors (§3.2) is then **capped downward** by a war-cost index. This mechanism was previously undocumented in canon (`src/sim/negotiation/scoring.ts`); this section makes it canonical. The cost cap can only LOWER an earned grade, never raise it (`capGradeByCost`), and it is the single arithmetic guarantor of §6 Non-Goal #3 (atrocity never inverts to a better outcome).

**The index.** `war_cost_index` ∈ [0, 1] is built from a casualty / duration / exhaustion **base** (weights 0.4 / 0.2 / 0.4), each sub-score normalized against a fixed reference in `COST_REFERENCE` and clamped to [0, 1], plus an **atrocity term** (war crimes, refugees, civilian casualties) applied ADDITIVELY over that base (weight `ATROCITY_COST_GAIN`), the total then clamped to [0, 1]. Higher index ⇒ costlier war ⇒ harder grade cap (`COST_GRADE_CAPS`; the highest cap threshold is 0.78 → grade C). It is a PURE function of `GameState`: it never writes sim state, uses only field arithmetic (no transcendental, no wall-clock/RNG), and iterates factions in `strictCompare` order.

**Atrocity dominance (the bright line, §6 Non-Goal #3).** Four invariants MUST hold across any future reference re-derivation:
- **A0 — Monotonicity (the inversion guard).** The atrocity sub-score MUST be a non-decreasing function of each of its inputs (war-crimes events, refugees created, civilian casualties caused); `war_cost_index` MUST be non-decreasing in the atrocity sub-score; and `capGradeByCost` MUST be non-increasing in `war_cost_index`. Composed, these forbid any arithmetic path where committing MORE atrocity yields a lower cost or a better grade — §6 Non-Goal #3 stated as arithmetic. Any re-derivation that introduces a non-monotonic blend, curve, or interaction term breaks the bright line even if A1–A3 each still hold.
- **A1 — `ATROCITY_COST_GAIN ≥ 0.78`** (the highest `COST_GRADE_CAPS` threshold). A saturated atrocity sub-score (1.0) alone must force `war_cost_index ≥ 0.78` from ANY base, including base = 0 — mass atrocity alone caps the grade at C irrespective of every other sub-score. A unit test pins this: *"saturated atrocity forces grade ≤ C regardless of base."* (Currently `ATROCITY_COST_GAIN = 0.85` ✓.)
- **A2 — atrocity references stay far below historical magnitude.** `war_crimes_full` (3 events), `refugees_full` (50,000), `civilian_casualties_full` (5,000) are DELIBERATELY set below real magnitude, per term: `civilian_casualties_full` 5,000 vs ~38,476 real civilian dead ≈ 8×; `refugees_full` 50,000 vs ~2.2M displaced ≈ 44×; `war_crimes_full` 3 events against a backdrop of ~97,207 total war dead and Srebrenica ~8,372 adjudicated genocide (RDC *Bosnian Book of the Dead* 2007, UNHCR, ICTY *Prosecutor v. Krstić* IT-98-33). This is BY DESIGN so any significant atrocity saturates the term; it is the backstop that stops "cleansing territory" (large displacement, low discrete event count) slipping through a count-only grade anchor. These references MUST NOT be normalized toward historical scale — doing so weakens the bright line ~8×.
- **A3 — `war_cost_index` is ABSOLUTE.** It MUST NEVER be normalized by territory, objectives, or anything gained. A cost-per-objective ratio is the `atrocity_efficiency` inversion the `RING_3_REFUSED_FLAGS` guard names (cheap cleansing → "efficient" → better outcome). This binds the Phase 5 verdict display ("what it cost vs what you carried out") as much as the arithmetic.

**Grade reachability.** Under the CURRENT references, EVERY full-length (~188-week) campaign has `war_cost_index = 1.0` for all three factions regardless of strategy or exhaustion spread, because the casualties, duration, and exhaustion sub-scores each saturate independently (sim casualties ≫ `casualties_full`; run length 188 > `duration_full_weeks` 156; terminal exhaustion > `exhaustion_full` 8000). Measured on the adopted engine: `war_cost_index` = 1.0000 for RBiH/RS/HRHB (`docs/40_reports/20260806_TERMINAL_MIN_GAP_THRESHOLD_EVIDENCE.md`). This caps every full campaign at grade C. In EMERGENT (free-war) mode — where the atrocity term applies — it also renders that term arithmetically INERT (added to an already-clamped 1.0), so cleansing cannot make the cost index worse; in historical/unset mode the atrocity term is OFF by construction (emergent-gated, keeping the pre-redesign historical baseline byte-identical). This is a KNOWN DEFECT under active redesign, NOT intended canon. Inert ≠ rewarded: the earned-grade war-crimes anchors and condemnation flags (§3.4) still fire, so atrocity is never rewarded — but the cost cap fails to let atrocity be grade-decisive, which §6 Non-Goal #3 intends. After the reference re-derivation, grade reachability must be stated as explicit run-condition bands: a clean/short war keeps its earned grade; a full-length historical-cost war caps at the tier chosen in the re-derivation; A/B become reachable only when casualties, duration, AND exhaustion each stay below their re-derived references.

**Reference basis (units).** `casualties_full` is compared against the sum KIA+WIA+MIA and MUST be set on that same combined basis (historical analogues ≈ 120–155k / 85–105k / 30–40k for ARBiH / VRS / HVO), NOT against KIA-only figures (~31k / 21k / 8k, RDC basis) — mismatching the basis reproduces the saturation defect. `duration_full_weeks` anchors on the ~188-week April 1992 → Dayton length (not 182); it may be scaled above the real length by an explicit severity factor, which is a scoring scale, not a claim the war lasted longer. `exhaustion_full` is COUPLED to the exhaustion accumulator's terminal band (Engine Invariants §8.6) and must be re-derived whenever that band changes — it is NOT independently fixed.

**Engine-health vs grades (do not conflate).** De-saturating the exhaustion accumulator (Engine Invariants §8.6) is an ENGINE-HEALTH fix — it removes the cap-pin and restores faction differentiation in the exhaustion curve. It does NOT by itself unpin grades: grade differentiation is owned ENTIRELY by the `COST_REFERENCE` re-derivation above. These are distinct claims; conflating them sent two prior fix cycles chasing the wrong lever.

**Historical baseline.** Re-deriving `casualties_full` / `duration_full_weeks` changes the historical run's own `war_cost_index`, so the historical baseline's grade moves off its current all-C. This is intended; the new historical-baseline grade must be stated explicitly when the references are chosen. (The atrocity term stays OFF in historical mode — emergent-gated — so this baseline grade move comes purely from the re-derived base sub-scores, not from atrocity.)

**Grade floor vs collapse.** The war-cost cap bottoms at grade C. Pushing an outcome BELOW C (toward failure/collapse) is the job of condemnation flags (§3.4) / `classifyOutcome`, not the cost cap. Neither subsystem is assumed to cover the other.

Any change to `COST_REFERENCE`, `COST_GRADE_CAPS`, or invariants A0–A3 must go through the §8 sign-off structure.

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
- Milestone Comparison rows (optional `historicalComparison.milestone_comparison`, with a duration fallback for older saves)
- Condemnation notice (if any `condemnation_flags` present)

**What VerdictScreen must never do:**
- Announce a "winner" as though one faction won the war
- Use celebratory language ("Victory!", "Triumph")
- Show a leaderboard comparing factions
- Minimize condemnation ("despite some issues…")
- Treat Pyrrhic score as the primary verdict
- Treat milestone timing rows as new scoring inputs or player optimization targets

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
| New outcome class | `/game-designer` + `/narrative-designer` review and Pyrrhic-panel sign-off; BLOCK, split verdict, or bright-line uncertainty escalates to the owner |
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
