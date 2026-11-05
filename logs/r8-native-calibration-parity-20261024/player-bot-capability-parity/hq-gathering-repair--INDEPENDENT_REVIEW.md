# Independent review — Army HQ gathering routing repair

**Verdict: GO for one bounded scenario-first headless 188-week candidate after the frozen cheap preflight passes.** If that campaign satisfies its territory, protected-anchor, provenance, archive, and health gates, proceed to the one required full suite. Stop on the first failed prerequisite or campaign gate; do not spend the full suite or retry the campaign automatically.

## Bound candidate

| Item | SHA-256 |
|---|---|
| `src/sim/turn_phases/war_phases.ts` | `0d11a7c5fbf73f19e1a30256218a48c482a76042d620b8107fd1f7b06b799d2d` |
| `tests/army_hq_gathering_phase_routing.test.ts` | `dee244a1f7a0f6fe2a053739202a161e66f24d60aa73fb3c74600e7960eae4ef` |
| `final.diff` | `c9eedfa2ad7d995a61a7c1429d367a637cd4158a40fe8fdf69c1c40d2a70ef73` |
| `RESULT.json` | `5364ec03d1ff4727c38e2cdec4e449a8a3ba9192dd3c54a2065ce6591c06a525` |
| `focused-suite-final.log` | `3e361e9de4efe3e4616cedb2ba79ffee327d0247ec2f73f8a6fc6ecb575b10ba` |

The production diff is one routing change: the phase uses membership from the existing `selectBotBrigadeOrderFactions` authority while retaining literal `RS`, `RBiH`, `HRHB` mutation order. The other changed file is the focused test.

## Review findings

1. **The change repairs a real delegated-staff capability gap.** The canonical player automation rule in `docs/10_canon/Systems_Manual_v0_9_0.md:199-201` includes the selected player faction in deterministic corps and brigade staff execution at autonomy 1 and above, treats autonomy 0 as manual, and treats headless auto-control as controlling all factions. `selectBotBrigadeOrderFactions` implements exactly that boundary (`war_phases.ts:947-957`). Reusing its membership for Army HQ gathering aligns the missing producer with its existing downstream consumers.

2. **Manual and authorization boundaries remain intact.** At level 0 the selected player faction remains excluded. The gathering writes a `CampaignPlan`, `last_gathering_turn`, and possible per-turn Army HQ directive overrides (`army_hq_gathering.ts:993-1015`); it does not itself create an active operation, resolve a player proposal, accept an authored historical operation, write policy, or change control. The phase fixture confirms that level-1 delegated planning changes the real strategy consumer while leaving active operations and authored-operation response fields empty. Existing operation authorization rules therefore remain in force.

3. **Headless behavior and deterministic order are corrected without introducing a new branch.** `headless_scenario_auto_control` nulls the selected-player exclusion in the shared selector. The literal phase loop preserves the established `RS -> RBiH -> HRHB` order even though the selector returns a sorted list. No thresholds, iteration order, RNG, schema, save migration, history, control writer, policy, or reference data changed.

4. **The focused evidence is meaningful.** The pre-change test had five intended failures: selected headless, selected autonomy 1/2/3, and the real consumer observation; the three controls plus manual level 0 passed. The final seven-file focused run passed 145/145 in 20.29 seconds, including 10/10 new phase-routing tests, 68 Army-HQ tests, campaign-plan wiring, operation decisions, military priorities, and desktop historical authorization/start contracts. Nonincremental TypeScript exited 0 and the retained final diff matches the two-file scope. `RESULT.json` refers to a `diff-check.log` that is not present; this is an evidence-packaging omission, not a code finding, because `final.diff` and the current bound hashes were directly reviewed.

5. **No sensitive-history or canon-design panel is triggered.** This is an ordinary mechanical repair implementing the already recorded delegation rule. It does not alter an authored operation, historical event, consent policy, moral-risk response, painted control, or factual historical claim. Its possible downstream territory effect is why the campaign and full-suite gates remain mandatory, not a reason to convene a sensitive-history panel.

## Validation authorization boundary

- Before launch, bind the exact two candidate hashes above, the intended scenario/data/runtime, immutable n91-n94 references and thresholds, clean process state, fresh output paths, command, cost cap, and stop rule.
- Run exactly one scenario-first no-player/headless 188-week regression under the active plan's 35-minute cap. Require complete turn/archive coverage, deterministic/provenance receipts, protected controls, and the predeclared territory/operation/displacement comparisons. This run measures consequences; the source review does not predict a score gain or attribute any particular cell to Army HQ gathering.
- If the candidate is nonqualifying or any required campaign gate fails, preserve it and stop. Do not retry, tune, adopt, or run the full suite.
- If the candidate qualifies, run the one required full suite with its separately frozen command/cap. Focused 145/145 is not a substitute for either expensive gate.
- A later player/native campaign still remains necessary to demonstrate the repaired capability through ordinary packaged gameplay. This review authorizes no native run and makes no 707/707/706/706 claim.

No source, test, build, package, native session, or campaign was run or changed by this review.
