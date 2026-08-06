# RBiH "best achievable outcome" exploration — four full 188-week strategies (clean re-run)

**Run date**: 2026-08-06 (harness-fix re-run, supersedes the original same-day run). **Status**: numbers below are trustworthy — this is a full rewrite following the fixes identified by the 13-specialist Pyrrhic panel review (`docs/40_reports/20260806_RBIH_PYRRHIC_PANEL_SYNTHESIS.md`), not a patch of the original draft, per the "freeze the artifact, integrate once" lesson from the 2026-08-05 RS playthrough retrospective.

**Purpose**: at the owner's request — following the RS ahistorical playthrough, run RBiH through the full war under several different presidential strategies to find out whether RBiH can do better than history, and what the best achievable outcome actually looks like.

## What changed since the original (confounded) run

Per the panel's fix list, before re-running:

1. **Cross-strategy contamination fixed.** `requestOpCursor` moved from module scope to per-strategy local scope in `run_rbih_best_outcome.ts`; `resetDisplacementPressureCache()` now called at the top of `startCampaign()` in `president_playthrough.ts`. Each of the four strategies below is now a fully independent campaign.
2. **`institutional_choices` keys fixed.** The driver now submits the six real institutional package IDs (`military`, `presidency`, `police`, `judiciary`, `economy`, `education` — `src/sim/negotiation/institutional_packages.ts`) instead of the territorial package IDs that silently no-op'd every institutional demand in the original run. Confirmed working this run: `maximal_activist`/`faithful_activist` now resolve `education`/`judiciary`/`police` to `centralized` (previously always `decentralized`).
3. **New `lever_isolated` control arm added**, specifically to separate the presidential-lever contribution from the `autonomy_level=1`/historical-ops-acceptance contribution — the original run's biggest attribution gap per Scenario Harness Engineer.
4. **`resolveDayton`'s round-trip comment corrected** (kept the round-trip; corrected the stated reason — see `president_playthrough.ts`) and a `DIAGNOSE_DAYTON_FREEZE=1` diagnostic added. Ran with it enabled this time: **no failure occurred** — `historical_comparison` populated normally on all four strategies without needing the diagnostic to fire.
5. **`forceLaunch`'s field-path bug fixed in the harness** (`state.military.corps_command`, not `state.corps_command`). Not called by any of the four strategies below (none use raw force-launch, only proposal-acceptance, which is a different code path). The identical bug in production `src/desktop/electron-main.cjs:2571` is **left unfixed** — out of scope for this harness-only pass, tracked as a separate finding below.
6. **Reproducibility spot-checked.** Independently re-ran the `lever_isolated` arm's full 188-week loop in a second, separate script and got a byte-identical `finalStateHash` (`9f9671a48f17185c`) both times. Full `replayDecisionLog`-based verification (the harness's original, stronger guarantee) is still not wired up for lever/Dayton actions — this spot-check is real but narrower than that.

**Not fixed this pass, still open** (documented in the panel synthesis, deliberately out of scope per the owner's explicit "fix harness + re-run only" instruction): the `collectEffects()` double-apply event-effect bug, `forceLaunch`'s production twin in `electron-main.cjs`, and the `duration_full_weeks` grade-cap canon-vs-code conflict.

## The four strategies

| Strategy | Political choices | Autonomy / historical ops | Presidential levers | Peace plans | Dayton demand |
|---|---|---|---|---|---|
| `baseline_historical` | Historical default only | `autonomy_level=0`, no historical-op acceptance | None fired | Always reject | Empty |
| `lever_isolated` | Historical default only | `autonomy_level=1`, accepts historical pre-planned ops | **None fired** (control arm) | Always reject | Empty (accept as offered) |
| `faithful_activist` | Historical-default / staff-recommended | `autonomy_level=1`, accepts historical ops | REQUEST-OP / REPLACE-CO / force-launch-proposal-acceptance, attempted every turn CA allows | Accept once offered (after turn 20) | Moderate (packages not already RBiH-held), centralized institutions |
| `maximal_activist` | Counterfactual where offered, else non-default | `autonomy_level=1`, accepts historical ops | Same lever attempts as `faithful_activist` | Always reject | Maximal (all 8 packages), centralized institutions |

## Results

| Strategy | Territory (OSID count, /712) | Federation territory (area-weighted, vs. historical 51%) | Dayton split (RBiH/RS/HRHB) | `pyrrhic_score` | Grade | Outcome class |
|---|---:|---|---|---:|---|---|
| `baseline_historical` | 243 (34.1%) | 40.0% | 34.4% / 51.7% / 13.9% | 73.6 | C | failure |
| `lever_isolated` | 258 (36.2%) | 44.9% | 36.6% / 48.6% / 14.9% | 73.5 | C | failure |
| `faithful_activist` | 262 (36.8%) | 46.0% | 37.1% / 48.1% / 14.7% | 72.8 | C | pyrrhic_success |
| `maximal_activist` | 263 (36.9%) | 46.0% | 37.3% / 48.0% / 14.7% | 12.4 | C | pyrrhic_success |

**Historical baseline for comparison**: Federation (RBiH+HRHB) held 51% of territory, RS 49%, per `data/reference/historical_baseline.json`. Every strategy tested falls short of this — none of the four recovers the historical Federation share; the best (`maximal_activist`/`faithful_activist`, tied at 46.0%) closes roughly two-thirds of the 11-point gap between the passive `baseline_historical` run (40.0%) and history.

## What actually moves territory, and by how much

The `lever_isolated` control arm cleanly splits the two mechanisms this investigation set out to compare:

- **`autonomy_level=1` + accepting historical pre-planned operations, with *zero* presidential levers fired**, moves RBiH from 243→258 OSIDs (+15, the baseline→`lever_isolated` delta) and from 40.0%→44.9% Federation share — most of the total gain available. `pyrrhic_score` barely moves (73.6→73.5): letting the corps AI act and accepting the historical operation slate is nearly free politically.
- **The presidential levers themselves (REQUEST-OP, REPLACE-CO, force-launch-proposal-acceptance) add only +4 to +5 more OSIDs on top of that** (`lever_isolated`→`faithful_activist`: 258→262; →`maximal_activist`: 258→263), for a real but small further territorial gain, at a cost in `pyrrhic_score` that depends entirely on which political choices ride along with them (see next point).
- **Political choice is what actually swings the composite score, not the levers.** `faithful_activist` and `maximal_activist` use *identical* lever attempts and reach essentially the same territory (262 vs 263 OSIDs, 46.0% Federation both), but `faithful_activist` (historical-default political choices) scores 72.8 — nearly matching the historical-feeling `baseline_historical`/`lever_isolated` runs — while `maximal_activist` (counterfactual political defiance) collapses to 12.4, with `international_standing`, `patron_confidence`, `internal_cohesion`, and `negotiating_leverage` all reading literal 0/F. The one extra OSID maximal defiance buys costs 60 points of negotiating capital.

**Best achievable outcome found in this exploration**: `faithful_activist` — keep RBiH's real historical political/diplomatic posture, but turn on `autonomy_level=1`, accept the historical operations slate, and use the presidential military levers freely. It gains +19 OSIDs and +6.0 points of Federation territory share over the passive baseline, at a `pyrrhic_score` cost of less than 1 point (73.6→72.8). Pure political counterfactual defiance (`maximal_activist`) is not worth it: it buys one more OSID than `faithful_activist` at a 60-point score cost. This is a genuine, load-bearing finding of this exploration, distinct from (and more defensible than) the original run's now-withdrawn claims.

All four strategies still land a `C` letter grade — see the canon-vs-code conflict noted below, carried over unchanged from the original report.

## Findings carried over unchanged (re-confirmed or still open)

1. **Srebrenica's genocide fires at week 162 in all four runs, 9 weeks before the historical week 171 — structurally impossible for RBiH to move.** Unchanged from the original report: the fall is a scripted event reading zero military state (`data/scenarios/events/war_1995.json`), and Srebrenica's garrison brigades are enclave-tagged, area-locked, and personnel-capped regardless of any player strategy. Confirmed again this run (`rupture_divergence: ["srebrenica_genocide_1995"]` on all four `historical_comparison` objects, all delta_weeks -9). No RBiH strategy in this space can change this date; do not build toward that as a follow-up.
2. **Canon-vs-code conflict on the grade cap, unchanged.** All four strategies land grade `C` despite a `pyrrhic_score` range of 12.4–73.6 — `COST_GRADE_CAPS`'s `duration_full_weeks: 156` reference means any full-length ~188-week campaign structurally saturates the duration cost sub-score, guaranteeing `C`-or-worse regardless of strategy, which conflicts with canon text (`VICTORY_AND_PYRRHIC_SCORING.md` §2) describing historical RBiH as having "barely earned survival" (implying a better grade than a strategy that scores 60 points worse on the same letter). Still open, still not touched by this pass — tracked in the panel synthesis.
3. **`replaceCo`: still near-zero successes, now diagnosed as a harness-ordering artifact, not a production bug.** In `maximal_activist`/`faithful_activist`, `replaceCo` was attempted 189 times with 0 successes (`requestOp` was attempted first each turn and consumed the CA pool before `replaceCo`'s turn). A targeted isolated check (30 turns, `replaceCo` as the only lever competing for CA) got 9/30 successes — confirming the lever itself works and this is purely a turn-loop ordering choice in `run_rbih_best_outcome.ts`, not an engine defect. Not fixed this pass (would require a real CA-budget/priority policy across levers, a bigger design question than a harness bug fix); documented so the 0% number in the raw logs isn't mistaken for a broken lever.
4. **Still open, unchanged from original report — tracked in the synthesis doc, explicitly out of scope for this pass**: the `collectEffects()` double-apply event-effect bug (`src/sim/events/evaluate_events.ts`), `forceLaunch`'s identical field-path bug in production `src/desktop/electron-main.cjs:2571`, and the live-production-risk question around `tryDerive`'s silent catch in `endgame_snapshot.ts` (status: confirmed-reachable, not confirmed-fired, per the synthesis doc's verification method).

## Scope and limitations

- Four strategies, not an exhaustive search — the presidential lever space (timing, targeting, CA-budget policy across levers) is much larger than what's tested here.
- Peace-plan timing in `faithful_activist` (accept after turn 20) remains an arbitrary threshold, not tuned.
- All four runs used the same paramilitary-denial doctrine as the RS run (asserting central command authority over irregulars, not an engine requirement).
- Full raw evidence (JSONL logs, final states for all four strategies) is in the session scratchpad, not committed — ephemeral, available on request.
- `replayDecisionLog` full-fidelity replay (lever + Dayton actions, not just event decisions) is still not wired up; the reproducibility claim above rests on a narrower independent-rerun spot-check, not that stronger mechanism.

## Scope (repo)

No canon, `docs/10_canon/FORAWWV.md`, engine, or UI source change made by this investigation. `tools/ai_play/president_playthrough.ts` and `tools/ai_play/run_rbih_best_outcome.ts` updated with the harness-only fixes listed above (typecheck clean, smoke-tested, reproducibility spot-checked). Neither is wired into any npm script.
