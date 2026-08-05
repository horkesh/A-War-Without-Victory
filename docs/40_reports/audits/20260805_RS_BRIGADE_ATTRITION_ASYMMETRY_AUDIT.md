# RS Brigade-Attrition Asymmetry Audit — Engine-Health Investigation

**Date:** 2026-08-05
**Lane:** R6 Task 0.3 spinoff (Zvornik/Doboj/Gračanica anchor investigation)
**Owner directive that triggered this audit:** "Go for deeper engine investigation. This is a sign that the engine has flaws we need to fix. Engine health is sacrosanct, the anchors are a symptom." Followed by: "Start the investigation now."
**Status:** Audit-only. Root mechanism partially traced, not fully identified. No engine code changed as a result of this audit (one small, unrelated, already-shipped fix — the Zvornik anchor-garrison reactive-defense guard — predates and is independent of this investigation; see `docs/plans/2026-07-31-historical-gameplay-depth-calibration-plan.md` Task 0.3). This document exists to seed a dedicated follow-up workstream.

## TL;DR

While chasing why RS cannot be made to hold three historically-correct anchor OSIDs (Zvornik, Doboj, Gračanica) at week 188 without unpredictable campaign-wide side effects, the investigation found something much bigger than the anchors: **at week 188 of the calibration baseline, every single ARBiH brigade ever fielded across three major corps (`arbih_1st_corps`, `arbih_2nd_corps`, `arbih_3rd_corps` — 103 brigades total) is still `status: active`. Zero permanent losses. RS corps over the same period show 11%–63% permanent brigade destruction** (`vrs_drina` 11%, `vrs_east_bosnian` 20%, `vrs_1st_krajina` 61%, `vrs_herzegovina` 63%).

This is not a subtle calibration drift. It is a near-total, faction-wide asymmetry, and it plausibly explains the entire R6 Task 0.3 saga: RS corps that have lost most of their brigades develop pathologically oversized, thin defensive sectors late-campaign, and any narrow, well-reasoned fix to their remaining brigades' behavior has no slack to absorb without cascading unpredictably elsewhere — which is exactly what sank five independent anchor-fix designs in a row.

Two leading hypotheses have been tested and **ruled out** (dissolution-threshold data asymmetry; reinforcement-multiplier supply as the primary, isolated driver — flattening it made things *worse*). One structural asymmetry has been found and is **not yet fully explained**: RS absorbs roughly 4x the defensive-battle volume RBiH does, and this appears to be substantially intentional (baked into scenario doctrine data), which reframes the question from "is this a bug" to "is the combination of these several individually-plausible design choices correctly calibrated, or does it compound into something worse than any one of them alone."

## How this was found

This audit is a byproduct of R6 Task 0.3 ("fix the Zvornik/Doboj/Gračanica ahistorical 188w losses" — full history in `docs/plans/2026-07-31-historical-gameplay-depth-calibration-plan.md`, Task 0.3 section). Five independently-designed fixes were built, tested, and reverted across that investigation, all failing the same way: a narrow, well-isolated change to how a handful of RS garrison brigades are treated (never a change to combat-power formulas, never a new floor or multiplier on defender strength) produced large, unpredictable, campaign-wide ripples — flipping unrelated anchors, moving `matched_osids` by dozens of OSIDs, sometimes making RS's overall territorial position *worse* despite the fix's intent. After the fifth failure, the owner redirected: stop patching individual anchors, find out why the engine is this sensitive to begin with.

## Evidence chain

### 1. Coarse engine-health metrics are clean — this is not a state-integrity bug

`tools/engine_health_gate.cjs --json` was run against six different 188w configurations (the calibration baseline plus five Task 0.3 fix variants). `zero_eligible_ops` (0-1), `dead_ops` (0-3), `ghost_destroyed` (flat at 2), `stranded_brigades` (flat at 7-8), `consistency_failures` (flat at 0), and K:W ratio (3.77-3.80, essentially flat) show nothing across every configuration, including the ones with the worst downstream anchor/territory regressions. Whatever is wrong, it is invisible to this existing diagnostic class.

### 2. Reactive-defense loaning starts almost immediately, not after a "quiet period"

Diffing `weekly_report.jsonl` battle-by-battle between the baseline and a Task 0.3 fix variant, the first divergence is at week 4-5: a Doboj-area garrison brigade (`rs_2nd_armored`) was already being pulled to defend a different region (`op:skender_vakuf:donji_koricani`) as a reactive/distance-weighted contributor from week 4 of a 188-week war. The sector-coverage reactive-defense system (`getStandingOgDefenseBrigadeIds` in `src/sim/combat/attack_resolution_osid.ts`) has no settling-in period and, at the time this was checked, no locality gate beyond a flat 5-hop BFS cutoff (`REACTIVE_DISTANCE_MAX_HOPS = 5` in `src/sim/combat/combat_math.ts`) that doesn't account for how large the underlying sector actually is.

### 3. RS sector geometry becomes pathologically oversized late-campaign — but not from turn 1

At week 188 of the baseline run (`runs/apr1992_definitive_188w__63a3a0858050b865__w188_n122`, `final_state_hash bfc7e2cbebfbb9bc`), reading `state.military.corps_front_sectors` directly:

- `sector:vrs_1st_krajina:1` covers **53 territory OSIDs with exactly 1 assigned brigade**.
- `sector:vrs_herzegovina:2` covers **25 territory OSIDs with exactly 1 assigned brigade**.
- Faction-wide territory-OSID-per-assigned-brigade ratio: **RS 7.92**, RBiH 3.38, HRHB 3.42 — RS is more than double either other faction.
- Per-corps ratio, worst three are all RS: `vrs_herzegovina` 14.3, `vrs_1st_krajina` 9.6, `vrs_drina` 8.3 — exactly the corps at the center of the Task 0.3 anchor investigation.

Checked `initial_save.json` (turn 1): this disparity is **not present at the start** (161 sectors exist at turn 1; ratios are comparable across factions at that point). It develops over the course of the campaign, which redirected the investigation from "bad initial OOB/scenario setup" toward "something that erodes over 188 weeks of simulated war."

### 4. The actual driver: brigade destruction, not OOB under-allocation

`vrs_1st_krajina` starts with **36 OOB brigades** — comparable to `arbih_1st_corps` (36 OOB brigades) and not far off `arbih_2nd_corps` (40). So the oversized-sector problem is not because RS was under-provisioned in the scenario data. Checking `formations[*].status` and `formations[*].stranded_status` grouped by `corps_id` in the baseline's `final_save.json` at week 188:

| Corps | Faction | Total (OOB-tagged) | Active | Inactive | Destruction rate |
|---|---|---|---|---|---|
| `arbih_1st_corps` | RBiH | 36 | 36 | 0 | **0%** |
| `arbih_2nd_corps` | RBiH | 40 | 40 | 0 | **0%** |
| `arbih_3rd_corps` | RBiH | 27 | 27 | 0 | **0%** |
| `vrs_drina` | RS | 9 | 8 | 1 | 11% |
| `vrs_east_bosnian` | RS | 10 | 8 | 2 | 20% |
| `vrs_1st_krajina` | RS | 36 | 14 | 22 | **61%** |
| `vrs_herzegovina` | RS | 8 | 3 | 5 | **63%** |

All destroyed RS brigades show `status: 'inactive'`, `stranded_status: 'none'` — this is plain, ordinary combat destruction via `brigade_dissolution.ts`'s threshold check, **not** the previously-diagnosed `stranded_status: 'collapsed'` mechanism from the June 2026 EH-3 investigation (`docs/40_reports/audits/eh3_stranded_status_load_bearing` line of work). This is a different, previously-unquantified phenomenon.

### 5. Ruled out: the dissolution mechanism itself is not the source of the asymmetry

`brigade_dissolution.ts` (personnel < 400, OR cohesion ≤ 20, OR morale ≤ 15 → `status = 'inactive'`) is explicitly documented in its own source as "faction-symmetric MECHANISM... faction-asymmetric DATA drives Krivaja-95 calibration drift correction" via a `war_timeline.dissolution_*_threshold` step-curve override that exists for exactly this purpose. Checked: **no scenario data file currently populates any of the three `dissolution_*_threshold` timeline fields for any faction.** The lookup falls through to the same hardcoded defaults (400/20/15) for RS, RBiH, and HRHB alike. The same rule, with the same numbers, produces 0% ARBiH destruction and up to 63% RS destruction — the asymmetry is emergent from actual combat/attrition outcomes, not from a hidden threshold tuning bug in the dissolution gate.

### 6. Ruled out (counter-intuitively): reinforcement-multiplier supply as the primary, isolated driver

`getFactionReinforcementMult` (`src/state/formation_constants.ts`) is a genuine, deliberate, faction-asymmetric per-turn personnel-replenishment multiplier, confirmed identical between the hardcoded fallback and the live scenario data (`data/scenarios/timelines/apr1992.json`'s `reinforcement_mult` block):

- **RBiH**: 0.25 (turns 0-12) → 0.50 (12-26) → 0.75 (26-52) → **1.0 (52-9999) — flat full rate for the remaining 136 weeks, 72% of the campaign, with no late-war decline at any point.**
- **RS**: 1.0 (0-52) → 0.85 (52-78) → 0.65 (78-104) → **0.45 (104-9999) — the last 85 weeks, 45% of the campaign, at less than half rate.**
- **HRHB**: 0.50 (0-12) → 0.75 (12-52) → 0.65 (52-78) → 0.50 (78-9999) — also declines late-war, though less steeply than RS.

The code comment traces this curve's origin to a prior, opposite-direction bug: an earlier audit (`docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md`, 2026-05-04) found VRS personnel *rising* +753 over a 188-week run ("reconstitution outpacing battle attrition for VRS") because the RS multiplier used to be flat 1.0× indefinitely, with no late-war decline. This decay curve was added afterward specifically to correct that inversion.

This looked like the obvious next lever to test, so it was tested directly: `data/scenarios/timelines/apr1992.json`'s RS `reinforcement_mult` array was temporarily replaced with a single flat `{start_turn: 0, end_turn: 9999, value: 1.0}` entry (matching RBiH's late-war pattern), and 188w was re-run (`run_summary` hash `f06948fc46102902`, vs baseline `bfc7e2cbebfbb9bc`). The change was reverted immediately after measurement; confirmed zero diff against `HEAD`.

**Result: giving RS full reinforcement for the whole war made destruction WORSE, not better**, for the two hardest-hit corps:

| Corps | Baseline destruction | RS-flattened-to-1.0x destruction |
|---|---|---|
| `vrs_1st_krajina` | 61% | **72%** |
| `vrs_east_bosnian` | 20% | **50%** |
| `vrs_herzegovina` | 63% | 63% (unchanged) |
| `vrs_drina` | 11% | ~11% (unchanged) |

`matched_osids` also dropped slightly (638→636) and RS's net campaign-wide territory dropped slightly (292→286) under the "more generous" reinforcement setting. This rules out reinforcement supply as a simple, isolated, additive lever — more replacement personnel does not straightforwardly translate to fewer permanent losses. The leading (untested) explanation: reinforcement level likely feeds into the corps-commander AI's operation-launch/commitment decisions — a brigade that "looks" healthier on paper may get thrown into more fights rather than conserved, and if the underlying combat *outcome* per fight is unchanged, more reinforced brigades simply mean more brigades exposed to the same adverse odds more often.

### 7. Found instead: a ~4x combat-exposure-volume asymmetry, substantially by design

Pure data analysis of the baseline `weekly_report.jsonl` (no rerun required) — attacker/defender battle counts and outcomes by faction, full 188-week campaign:

| Faction | Battles as defender | Held (%) | Battles as attacker | Won (%) | Own casualties (defending) | Inflicted (defending) |
|---|---|---|---|---|---|---|
| RS | **416** | 69.7% | 136 | **77.9%** | **144,365** | 131,370 |
| RBiH | **112** | 76.8% | 367 | 68.1% | 26,929 | 19,190 |
| HRHB | 43 | 65.1% | 68 | 70.6% | 5,546 | 7,260 |

RS is attacked (defends) **3.7x more often** than RBiH, and nearly 10x more often than HRHB. RS attacks far less often than RBiH (136 vs 367) — RBiH is overwhelmingly on the strategic offensive across the campaign, RS overwhelmingly on the defensive. Notably, **RS is actually the better attacker of the two** (77.9% win rate vs RBiH's 68.1%) — this is not a raw combat-math weakness for RS, it is a volume-of-exposure problem. RS's absolute casualties absorbed while defending (144,365) are over 5x RBiH's (26,929).

This exposure asymmetry looks substantially **intentional**, not accidental: `data/scenarios/timelines/apr1992.json`'s `doctrine_phases.aggression_modifier` has RBiH climbing from **-0.10** (weeks 0-15, "Survival Defense... No offensive operations") to **+0.15** by week 80+ ("Controlled Counteroffensive... Full counteroffensives. Corps-level coordinated operations (1994-1995 campaigns)"), while RS's aggression_modifier *declines* from **+0.15** (weeks 0-12) to **+0.05** (week 26 onward, "Targeted Operations... Tempo constrained by supply, fatigue, and overstretch — not by standing order"). This matches the real war's historical arc: RS made its major territorial gains in 1992 while ARBiH was still forming, then ARBiH built a professional corps structure and went on the strategic offensive by 1994-95 (Operation Sana, Operation Mistral, western Bosnia counteroffensives). The doctrine data is deliberately modeling that arc.

## Current synthesis

The 0%-vs-up-to-63% brigade-destruction asymmetry is **not a single isolated bug**. It is the compounding interaction of at least three individually-plausible, partly-intentional design choices:

1. **RS absorbs roughly 4x the defensive combat volume RBiH does** (§7), plausibly correct in *direction* (matches the historical arc) but of unverified *magnitude* — nobody has checked whether a 3.7x exposure ratio is proportionate to the real war's actual operational tempo, or whether it's overtuned.
2. **RS's reinforcement multiplier independently craters in exactly the same late-war window** (turn 104+) that this exposure is heaviest (§6), while RBiH's has no late-war decline at all — these two effects land in the same weeks and compound rather than offset.
3. **The two factors interact non-additively through AI behavior** — flattening #2 alone made destruction *worse*, meaning simple "give RS more manpower" fixes will not work in isolation; the corps-commander operation-launch logic's relationship to brigade health/reinforcement level has not been traced and is the most likely place the interaction actually lives.
4. Downstream of all three: **oversized late-war RS sectors** (§3) and an **ungated reactive-defense pooling system** (§2) with no real sense of geographic locality, which is why any narrow fix to RS brigade allocation in this hollowed-out state cascades unpredictably — the corps has no slack left to absorb change.

## What has NOT been done (deliberately, out of scope for a same-session investigation)

- Verifying whether the ~4x exposure-volume asymmetry (§7) is well-calibrated against real historical operational-tempo data, or excessive.
- Tracing how reinforcement/personnel level feeds into the corps-commander operation-launch scorer, to explain the counter-intuitive §6 result (more manpower → more destruction for the worst-hit corps).
- Determining whether RBiH's total absence of any late-war exhaustion/decline curve (unlike both RS and HRHB, which both decline late-war) is itself a gap worth closing, versus RS's decline being disproportionately steep.
- Any actual engine or data change. Every experiment run during this audit was reverted; the repository's only net change from this whole investigation is the already-separately-shipped Zvornik anchor-garrison reactive-defense guard (Task 0.3, unrelated to this audit's findings) and one new sector-scoped locality guard on reactive-defense eligibility (`src/sim/combat/attack_resolution_osid.ts`, `src/sim/combat/combat_math.ts` — `ANCHOR_GARRISON_LOAN_MAX_HOPS`).

## Reproducibility

- Baseline run: `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n122`, `final_state_hash bfc7e2cbebfbb9bc`, scenario `data/scenarios/apr1992_definitive_188w.json` at the state committed on branch `codex/master-roadmap-execution` as of this audit.
- Diagnostic (RS reinforcement flattened to 1.0x whole-war): `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n138`, `final_state_hash f06948fc46102902`. Reverted; not present in the committed scenario data.
- All corps destruction-rate and sector-geometry figures were computed directly from `final_save.json`/`initial_save.json` in the baseline run directory (`state.military.formations`, `state.military.corps_front_sectors`), not from `run_summary.json` aggregates.
- All battle-volume/win-rate figures were computed directly from `weekly_report.jsonl`'s `battles[]` array in the baseline run directory.

## Recommended scope for a dedicated workstream

This deserves its own planning pass, not incremental same-session tuning — every lever touched during R6 Task 0.3 and this audit has shown the same unpredictable, campaign-wide cascade behavior when changed in isolation. Suggested entry points, roughly in priority order:

1. **Confirm or refute the exposure-volume hypothesis as the dominant term.** Design a controlled experiment that isolates §7 from §6 (e.g., hold RS's reinforcement curve fixed at its current, already-shipped values, but reduce the RBiH/HRHB aggression-modifier late-war ramp partially, or increase RS's, and measure whether the 416-vs-112 defensive-battle ratio and the corps destruction rates move together).
2. **Trace the reinforcement-level-to-AI-commitment interaction** that produced the §6 counter-intuitive result. Likely lives in the corps commander's operation-launch scorer (`src/sim/combat/commander/`) — check whether personnel/health level is a factor in which brigades get committed to which operations, and whether "healthier" brigades are disproportionately selected for risky commitments.
3. **Validate exposure-volume magnitude against historical sources** (Balkan Battlegrounds, OOB masters) — is a ~4x defensive-battle-volume ratio between RS and RBiH across 1992-1995 plausible, or does it overstate ARBiH's late-war offensive tempo / understate RS's early-war one?
4. **Decide on RBiH's missing late-war exhaustion curve.** RS and HRHB both have late-war reinforcement decline; RBiH has none. Is that historically correct (ARBiH professionalized and never regressed) or a gap that should be closed symmetrically?
5. Only after 1-4 are understood: revisit R6 Task 0.3's three anchors. The anchors are almost certainly unfixable in isolation while this deeper asymmetry stands — any fix should be validated against corps-level destruction rates and sector-geometry ratios (§3-4 above), not just the three named OSIDs and `matched_osids`.

Given the calibration and canon stakes (any change here will move `matched_osids`/anchors/net-territory broadly, not narrowly), this should go through the same Pyrrhic-panel review discipline used for other engine-health and calibration lanes, with a `technical-architect`-led scoping pass first given the cross-cutting nature (touches combat resolution, corps-commander AI, scenario doctrine data, and reinforcement/dissolution mechanics simultaneously).

## Related prior work

- `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` — the prior audit that diagnosed the opposite-direction "+753 VRS personnel" inversion this session's reinforcement-decay curve was built to fix. Its own recommendation ("the right next packet is the reconstitution policy review, not [a further] multiplier") was never fully followed up — this audit is effectively that follow-up, three months later, arriving from a completely different angle (anchor-holding rather than personnel-total tracking).
- EH-3 (`docs/PROJECT_LEDGER_KNOWLEDGE.md` / memory `eh3_stranded_status_load_bearing`, 2026-06-11) — a related but *different* mechanism (`stranded_status: 'collapsed'`, load-bearing, do-not-clean). This audit's destroyed brigades are plain `status: 'inactive'`, not stranded-collapsed. The two findings independently converge on "RS corps-level attrition/geometry is the real lever," reinforcing each other without being the same bug.
- R6 Task 0.3 (`docs/plans/2026-07-31-historical-gameplay-depth-calibration-plan.md`) — the originating investigation. Five disproven anchor-fix designs are documented there in full technical detail and should not be re-attempted blind; all five failed via the cascade behavior this audit traces to its likely deeper source.
