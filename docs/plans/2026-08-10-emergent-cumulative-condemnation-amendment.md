# FROZEN AMENDMENT PROPOSAL — emergent-cumulative condemnation flag (SENSITIVE_HISTORY_DESIGN_GATE §2 + VICTORY_AND_PYRRHIC_SCORING §3.4)

**Date:** 2026-08-10 · **For:** §6 Pyrrhic canon panel (Historian + calibration/systems + canon/§6 + Red-team). Unanimous GO = signature; BLOCK/split → owner. Implementer ≠ reviewer. The §6 atrocity-never-rewarded bright line is INVARIANT — the panel rules only whether this amendment touches it. · **Artifact FROZEN — evaluate only what is below.**

## Why this is needed
The §6-grade-liveness fix (make atrocity grade-DECISIVE, currently inert at full campaign length) landed as an emergent `mass_atrocity_condemnation` flag: `computeAtrocitySubScore(faction) ≥ 0.5` (emergent mode) → `classifyOutcome` returns `hollow_victory`. Built + validated (`86927cf48`; tsc, 10/10 bright-line incl. a decisive test, 97 scoring tests; historical byte-identical; 634 floor untouched).

**BUT** `SENSITIVE_HISTORY_DESIGN_GATE.md §2` criterion 3 (BINDING) requires condemnation flags to fire on a **discrete game-state condition** (specific OSID control / flag / turn range), *"not a cumulative threshold"*; `VICTORY_AND_PYRRHIC_SCORING §3.4` says flags propagate from recorded **ruptures**. The built flag is a **verdict-time, cumulative-threshold** classification — not a rupture. So it is not canon-compliant as written.

**The intent nuance:** the rule's purpose (criterion 11) is to forbid **calendar-driven** atrocity flags — an ahistorical campaign must not be flagged just because the date matches. The proposed flag is **emergent** — driven by the modeled war's own `war_crimes_events` (paramilitary captures via `recordWarCrime()`), `refugees_created`, `civilian_casualties_caused` — never the calendar. It satisfies the *spirit* while violating the *letter*.

## The proposed amendment (build only on unanimous GO)

### To `SENSITIVE_HISTORY_DESIGN_GATE.md §2` — add a new subsection "§2a — Emergent-cumulative condemnation (verdict-time)"
> Distinct from ruptures (§2, discrete + recorded + permanent), the verdict MAY apply an **emergent-cumulative condemnation flag** subject to ALL of:
> **(i) Emergent-only.** Applies only when `state.meta.decision_mode === 'emergent'`; historical/unset mode is untouched (byte-identical baseline).
> **(ii) Modeled-atrocity-driven, never calendar.** The trigger is a monotonic function of the modeled war's own accrued atrocity state (`war_crimes_events`, `refugees_created`, `civilian_casualties_caused` — the same inputs as `computeAtrocitySubScore`), each produced by emergent game-state events (paramilitary captures, displacement). NO calendar/date/turn predicate may trigger it. An ahistorical war that produces no atrocity carries no flag; a historical-posture war that mechanically produces atrocity carries it — the modeled war, not the calendar, is the sole source. (Preserves criterion-3/11 intent.)
> **(iii) Monotonic + non-reducing.** More atrocity never yields a better outcome (A0). The flag, once the verdict computes it, taints the outcome to `hollow_victory` (or worse); it can never improve one.
> **(iv) Not tradeable.** Like ruptures, it is never negotiable at Dayton, removable by diplomacy, or mitigable by patrons (it is recomputed from terminal state, so this is automatic).
> **(v) Genocide precedence.** When a discrete `genocide_condemnation` rupture is present, it governs (forces `failure`); the emergent-cumulative flag does not down-grade the more severe finding.
> **(vi) Threshold cited + panel-set.** The `atrocitySubScore` threshold is a §6-panel-set constant with a stated rationale, never curve-fit to a target grade.

### To `VICTORY_AND_PYRRHIC_SCORING.md §3.4`
> Amend "Flags propagate from `rupture_consequences[]`…" to: *"Condemnation flags come from two sources: (1) recorded discrete **ruptures** (`rupture_consequences[]` → `collectCondemnationFlags()`), permanent once recorded; and (2) an emergent-only, verdict-time **emergent-cumulative** flag (`mass_atrocity_condemnation`) computed from terminal modeled-atrocity state per `SENSITIVE_HISTORY_DESIGN_GATE §2a`. Both feed `FactionVerdict.condemnation_flags[]` and `classifyOutcome`."*
> Add to §3.5 grade-reachability: below-C atrocity decisiveness for non-genocide cumulative cases is delivered by the §2a flag (→ hollow_victory), not by the cost cap (which bottoms at C per §3.5:166). The additive `ATROCITY_COST_GAIN` term is retained (it still guarantees the C-cap for otherwise-cheap wars, invariant A1).

## Panel questions (each seat: GO / GO-WITH-CONDITIONS / BLOCK + rationale)
1. **Canon/§6:** does §2a preserve the bright line (§6 Non-Goal #3) and the gate's calendar/gamification intent? Is a verdict-time emergent-cumulative flag canon-coherent alongside discrete ruptures, or does it erode the rupture discipline? Exact amendment wording you'd accept.
2. **Historian:** is the `atrocitySubScore ≥ 0.5` threshold a defensible "mass atrocity" line given the deliberately-low atrocity references (war_crimes_full 3, refugees_full 50k, civilian_full 5k)? What threshold does the record justify?
3. **Calibration/systems:** confirm deterministic, emergent-only, historical byte-identical, monotonic; no feedback into territory; no ledger-classification gaming surface.
4. **Red-team:** can §2a be gamed to launder atrocity, re-introduce calendar-driven flagging, or let a high-atrocity run escape the flag (or a low-atrocity run trip it)? Strongest break.
