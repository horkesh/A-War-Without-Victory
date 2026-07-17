# RS 20-Turn Calibration Comparison - 2026-07-10

Local-only QA and repair report. No staging, commits, pushes, PRs, installer work, or release tagging.

## Correction - 2026-07-11

The original `RS -3` conclusion in this report is superseded and must not be used as calibration-equivalence evidence. The player branch started from `apr1992_definitive_52w`, while the cited headless comparator was an older `apr1992_definitive_40w` run with different startup control and scenario configuration. The probe also hardcoded final faction totals and did not record the player/headless decision transcript.

The corrected scenario-bound harness is `tools/ai_play/desktop_calibration_compare.ts`, exposed as `npm.cmd run qa:desktop-calibration`. The current closest-policy artifact after the defended-target correction is `tmp-paradox-qa-20260710/desktop-rs-20turn-defended-target-guard-v4.json`.

Corrected provenance and policy:

| Field | Value |
| --- | --- |
| Comparison kind | `player_choice_vs_headless` |
| Scenario source | `data/scenarios/apr1992_definitive_52w.json` |
| Startup snapshot | `data/derived/startup/apr_1992_initial_save.json` |
| Startup SHA-256 | `e8bc41926f783b7040d64d2ca1e75dd0a0331216a885063cce72f78fbd57f59f` |
| Player autonomy | Level 1 Assisted |
| Historical operations | Accept as they appear |
| Event decisions | Historical default, including non-player historical mode |
| Paramilitary requests | Standing allow from turn 0; same-turn resolution |
| Player offensive target scope | Unrestricted |

Opening-turn result after the timing repair:

| Branch | RS attack orders | Combat flips | HRHB | RBiH | RS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current-snapshot headless | 9 | 6 | 103 | 312 | 297 |
| Current-snapshot player | 9 | 6 | 103 | 312 | 297 |

The operation branches agree on eligible attackers, brigade orders, battle targets, combat flips, and faction control totals. They are not state-equivalent: each branch records four RS paramilitary captures, but the offensive capture targets differ because the headless branch is municipality-scoped while the player branch remains unrestricted.

Corrected turn-20 result:

| Branch | HRHB | RBiH | RS | RS delta |
| --- | ---: | ---: | ---: | ---: |
| Current-snapshot headless | 87 | 237 | 388 | 0 |
| Closest player-policy path | 83 | 249 | 380 | -8 |

The remaining `-8` is not nondeterminism and is not a calibration failure by itself. It is deterministic path divergence after different legal target packets produce different turn-1 control topology, with later player/headless Army HQ and decision-timing ownership differences still present. Strict determinism claims require identical state and phase inputs; player-choice comparisons remain labeled as divergence evidence.

## Deeper Input-Equivalence Investigation - 2026-07-11

The follow-up tested whether selecting the apparent headless defaults makes the desktop result equal. It does not, because matching choice labels still does not provide identical phase inputs.

Turn-0 state diff:
- The branches differ at 19 persisted paths before the first advance.
- Headless has `headless_scenario_auto_control=true`, no `player_faction`, `decision_mode=historical`, and six preserved RS/JNA opening operations with their queued follow-ons.
- Desktop has `player_faction=RS`, `decision_mode=emergent`, six authorization reviews, no active player opening operations until accepted injection, and a queued foundational player decision.

The comparator was corrected so `historical_default` now also puts non-player factions in historical decision mode and uses the same first-response fallback that headless uses when an event lacks explicit historical-default metadata. It now exposes decision timing and player paramilitary target scope. `standing_allow` was added to distinguish same-turn standing authority from approving requests between turns.

Closest available policy match after enforcing the canon defended-target guard:

| Field | Value |
| --- | --- |
| Artifact | `tmp-paradox-qa-20260710/desktop-rs-20turn-defended-target-guard-v4.json` |
| Event policy | Historical default; zero deferred events |
| Non-player event mode | Historical |
| Historical operations | Accept as they appear |
| Paramilitary policy | Standing allow from turn 0 |
| Paramilitary timing | Same turn |
| Player offensive target scope | Unrestricted |

Turn 1 now has equal faction totals but different controlled OSIDs:

| Branch | RS | RBiH | RS paramilitary captures |
| --- | ---: | ---: | ---: |
| Headless | 297 | 312 | 4 |
| Player | 297 | 312 | 4 |

Both branches issue nine RS attack orders and apply six combat flips. Rear-pocket captures match at `op:banja_luka:dragocaj` and `op:banja_luka:potkozarje_3`. The offensive targets do not: headless's municipality-scoped RS pass captures `op:bosanski_novi:blagaj_japra` and `op:bosanski_novi:novi_grad_3`; the unrestricted player pass captures `op:bijeljina:bijeljina_2` and `op:bileca:zausje`. The previous player candidate `op:banovici:seona` is no longer generated because it is defended. Equal totals therefore conceal an exact-OSID topology difference, and the ordinary player branch still cannot select the headless packet because it is never offered there.

Different controlled OSIDs change graph topology, legal targets, sector ownership, and later combat even when turn-1 totals match. By turn 20 the RS delta is `-8`:

| Branch at turn 20 | HRHB | RBiH | RS |
| --- | ---: | ---: | ---: |
| Headless | 87 | 237 | 388 |
| Closest player-policy path | 83 | 249 | 380 |

Two additional structural boundaries were confirmed:
- Headless RS receives Army HQ campaign plans at turns 8 and 16; player RS receives none because Army HQ gathering intentionally skips `player_faction`. The owner-approved Level 1 scope covers routine corps/brigade staff execution, not bot-owned Army HQ strategic planning.
- Player operation/event decisions are surfaced after their generating phase and can be applied only between turns. Headless resolves bot choices inside the phase. The earlier v3 run found that accepting all 21 generated `APPROVE_OP:*` staff proposals at the earliest available boundary did not change its result; that is retained as pre-guard diagnostic history, not asserted as a separate v4 replay.

Concrete defects found and fixed:
- `resolvePlayerParamilitaryDecisions` preserved offensive mode in decision history but discarded it when spawning an allowed unit, creating a 150-person zero-ETA rear-pocket unit instead of the authored 600-person one-turn offensive formation. The resolver now passes request mode through to spawn logic.
- Offensive target detection could generate deployments against an exactly defended OSID, and the resolver allowed offensive paramilitaries to defeat defenders at or below the removed 500-person threshold. Detection now rejects exact and adjacent organized defense, while any organized defender present at arrival forces paramilitary retreat casualties and dissolution without capture or defender losses.

Conclusion: equal faction totals are not state equality. Exact equality remains expected only for identical state and phase inputs. The current interactive player branch cannot express an exact headless replay merely by choosing similarly named options because target candidates, decision timing, and Army HQ ownership differ. An exact replay would require a dedicated phase-level headless-action replay/delegation mode; it should not be inferred from ordinary player choices.

## Scope

The request was to run a 20-turn RS game review and compare it to calibration results, while keeping the work local. This pass used:

- Existing Electron full-surface RS run: `tmp-paradox-qa-20260710/paradox-local-qa-first20-rs-calibration-compare-fullsurface-v1.json`
- Fast Electron RS run: `tmp-paradox-qa-20260710/paradox-local-qa-first20-rs-calibration-compare-v1.json`
- Headless 20-week comparator: `runs/apr1992_definitive_40w__480d0219cf3c09ca__w20_n56`
- Post-fix desktop logic probe with all starting RS historical authorizations accepted: `tmp-paradox-qa-20260710/desktop-rs-20turn-accepted-starting-historical-ops-v2.json`
- Post-decision Level 1 Assisted probe with all RS historical authorizations accepted as they appear: `tmp-paradox-qa-20260710/desktop-rs-20turn-level1-assisted-execution-v1.json`

## Calibration Reference

Headless 20-week comparator command:

```powershell
npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_40w.json --weeks 20 --unique --out runs
```

Result:

| Metric | Value |
| --- | --- |
| Run dir | `runs/apr1992_definitive_40w__480d0219cf3c09ca__w20_n56` |
| Final state hash | `4627bbe009010713` |
| Control counts | HRHB 93 / RBiH 252 / RS 367 |
| Active located formations | HRHB 32 / RBiH 104 / RS 82 |
| Attack orders processed | 151 |
| Attack orders by faction | HRHB 23 / RBiH 22 / RS 106 |
| Flips applied | 61 |
| Bot benchmark | 3 evaluated, 3 passed, 0 failed, 3 not reached |
| Anchors | 29/30 passed; `op:derventa:derventa_2` HRHB instead of expected RS at week 20 |
| Anomalies | 11 total, 1 warning, 0 critical |

Committed 40-week structural floor remained intact after the repair:

```powershell
npm.cmd run ci:structural-fingerprint:check
```

Latest gate result:

- Run dir: `runs/apr1992_definitive_40w__1aa96054bcc8af09__w40_n61`
- Final state hash: `82dae12f3f42b3b6`
- Structural fingerprint: `6806ddd157044afa`
- Result: matched expected.
- The gate still prints the existing non-fatal final validator warning: `F_RBiH_0002` at `op:lopare:lopare_2` controlled by RS.

## Electron 20-Turn Result

The full-surface Electron run reached turn 20 with 178 captured events/screenshots and 0 console messages.

Final RS player state:

| Metric | Value |
| --- | --- |
| Turn | 20 |
| Control counts | HRHB 115 / RBiH 328 / RS 269 |
| Active located formations | HRHB 38 / RBiH 86 / RS 79 |
| Player-owned formations | 90 owned, 79 located |
| Paramilitary requests | 0 |
| Paramilitary policy | `always_deny` |
| Pending event | `milosevic_isolation_warning_aug92` |
| Pending proposal | `PROP_20_historical_op_triggered_vrs_1st_krajina_operation_kotor_varos` |

Manual screenshot sampling confirmed that brigade counters are visible in Krajina and elsewhere. The initial map probe reported 132 rendered counters, 77 RS-like counters, and 16 Krajina-rendered counters; the broader formation audit reported 48 Krajina-owned formations and 23 Krajina-rendered entries in the overview state.

## Historical Comparison - Superseded

The rows below preserve the original probe record for audit history. Their deltas mix `40w` and `52w` scenario inputs and are not valid calibration-equivalence measurements; use the corrected comparison at the top of this report.

| Run | HRHB | RBiH | RS | Historical cross-scenario delta |
| --- | ---: | ---: | ---: | ---: |
| Headless 20w calibration comparator | 93 | 252 | 367 | 0 |
| Electron RS player, turn 20 | 115 | 328 | 269 | -98 |
| Desktop RS logic, all starting historical authorizations accepted, turn 20 | 115 | 328 | 269 | -98 |
| Desktop RS Level 1 Assisted, all historical authorizations accepted as they appear, turn 20 | 88 | 260 | 364 | -3 |
| Committed 40w structural floor | 90 | 252 | 370 | +3 vs 20w comparator |

The live-player result should not be interpreted as a calibration failure by itself. Headless calibration auto-controls every faction and issued 106 RS attack orders in 20 weeks. Manual Level 0 live player mode excludes the player faction from broad bot control, so simply accepting historical operation authorizations does not cause RS to follow the bot-calibrated operational tempo. The Level 1 probe demonstrated broader staff execution, but its apparent proximity to the old comparator was a cross-scenario coincidence and is superseded by the corrected same-snapshot run.

That said, the comparison exposed a real player-flow bug: turn-0 `HISTORICAL_OP:*` authorizations were advisory, but unresolved rows could be garbage-collected at the next advance. A new player could therefore miss opening operation authorizations and have them silently disappear.

## Fix Implemented Locally

Implemented local-only source changes:

- Added historical-operation authorization predicates in `src/sim/combat/historical_operation_authorization.ts`.
- Preserved unresolved historical-operation authorization reviews across proposal cleanup.
- Preserved explicit declines so a declined historical operation does not re-prompt.
- Added a live-player-only `inject-player-pre-planned-operations` step before queued operation injection.
- Added a faction filter to `injectPrePlannedOperations` so the live-player step injects only the selected player's historical operation chain.
- Let accepted authorization rows expire after injection has had a chance to consume them, preventing repeated objective-overlap warning loops.
- Added desktop regression tests proving:
  - Fresh RS campaign does not silently auto-launch baked player-faction historical operations.
  - Unresolved RS historical operation authorization survives advance.
  - Accepted RS `Operation Drina` launches on advance, queues the Drina follow-on chain, and removes the consumed accepted review row.

## Post-Fix Probe

Direct desktop simulation with all six starting RS historical operation authorizations accepted:

- Artifact: `tmp-paradox-qa-20260710/desktop-rs-20turn-accepted-starting-historical-ops-v2.json`
- Final turn: 20
- Final control: HRHB 115 / RBiH 328 / RS 269
- Final active player preplanned operations: none; starting operations had resolved or completed by the stop point.
- Later queued/triggered authorizations remained pending for Kotor Varos, Podrinje Sweep, Corridor, and Foca.
- `opInjectionWarningCount`: 1, unrelated HRHB Jackal all-objectives-owned warning.

Interpretation: the authorization lifecycle is now truthful and bounded, but the live player still does not match headless calibration unless the player actively drives RS operations or a deliberate assisted/autonomy mode is introduced for the player faction.

## Assisted Historical Operation Probe - 2026-07-11

Implemented and re-ran a local desktop-logic probe that accepts every RS `HISTORICAL_OP:*` review before the next advance. The new assist path remains operation-scoped: it reuses the existing brigade bot order evaluator only for formations assigned to active accepted historical operations, and it does not restore general player-faction bot control.

- Artifact: `tmp-paradox-qa-20260710/desktop-rs-20turn-accepted-all-historical-ops-assisted-v1.json`
- Final turn: 20
- Final control: HRHB 114 / RBiH 309 / RS 289
- Delta vs prior accepted-starting-only desktop probe: RS +20, RBiH -19, HRHB -1
- Delta vs headless 20w comparator: RS -78
- Active player historical operations at turn 20: `Operation Corridor` and `Operation Podrinje Sweep`
- Pending historical reviews at turn 20: `Operation Herzegovina Consolidation` generated at the final stop point and would be actionable before turn 21.
- `opInjectionWarningCount`: 1, the pre-existing HRHB `Operation Jackal` all-objectives-owned warning.

The first assisted probe exposed a real follow-on-chain bug: when later accepted historical reviews woke the scenario-start injector, completed pre-planned operations could be re-offered and false objective-overlap warnings could accumulate. That is now corrected locally. Pre-planned operations already present in operation history or satisfied at scenario start are skipped, and queued follow-ons are owned only by `injectQueuedOperation`, so the player injector cannot bypass the queue or recycle old operation names.

## Level 1 Assisted Execution Probe - 2026-07-11

After owner approval to resolve the remaining friction, Level 1 Assisted was promoted from recommendation-only behavior to broad deterministic staff execution for the selected player faction. Level 0 remains manual except for accepted historical-operation participants. Level 1+ now includes the player faction in corps and brigade staff execution while preserving player-staged attack, movement, and posture orders as authoritative overrides.

- Artifact: `tmp-paradox-qa-20260710/desktop-rs-20turn-level1-assisted-execution-v1.json`
- Final turn: 20
- Autonomy level: 1
- Final control: HRHB 88 / RBiH 260 / RS 364
- Historical cross-scenario delta: RS -3; superseded and invalid as equivalence evidence.
- Delta vs prior historical-operation-only assist probe: RS +75
- Active located formations: HRHB 32 / RBiH 94 / RS 78
- Active player operations at turn 20: `Operation Posavina Corridor`, `probe_vrs_1st_krajina_t19`, and `probe_vrs_2nd_krajina_t20`
- Pending historical reviews at turn 20: none
- Accepted triggered operation reviews during the run: `Operation Posavina Corridor` appeared 10 times and was accepted each time before advance.
- `opInjectionWarningCount`: 0

Interpretation at the time: broad Level 1 Assisted execution resolved the no-player-orders feel gap without changing headless auto-control or baseline calibration. The numeric `RS -3` equivalence conclusion is withdrawn. The initial same-snapshot v2 run ended at player RS 354 versus headless RS 387 and classified that gap as deterministic player-choice divergence; the current defended-target v4 result is the correction at the top of this report.

## Validation

Latest successful local validation after the final source edits:

```powershell
npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/desktop_calibration_compare.test.ts tests/desktop_start_campaign_authorization.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run ci:structural-fingerprint:check
npm.cmd run qa:player-journeys
npm.cmd run desktop:release:check
npm.cmd run test:baselines
git diff --check
```

Results:

- Focused regression suite: 3 files / 51 tests passed.
- Typecheck: passed.
- Structural fingerprint gate: passed; fingerprint `6806ddd157044afa` and final state hash `82dae12f3f42b3b6` matched expected.
- Player-journey gate: 44 files / 718 tests passed.
- Desktop release check: passed (`desktop:map:build`, `desktop:sim:build`, `warroom:build`).
- Strict baseline regression initially exposed the accumulated local output drift. The authorized local refresh changed 12 manifest hashes: all eight `apr1992_52w` artifacts plus `final_save.json` and `run_summary.json` for `baseline_ops_4w` and `noop_4w`. A fresh strict rerun passed all scenarios.
- `git diff --check`: exit 0, with pre-existing CRLF normalization warnings in unrelated touched files.

## Remaining Product Finding

The opening-operation timing defect is locally repaired: an operation accepted before advance now enters before operation lifecycle advancement and retains the authorization review's deterministic `resolved_turn` planning clock. Level 1 still preserves explicit player-staged overrides.

The remaining 20-turn player/headless difference is path evidence, not an operation-execution defect. The closest policies produce equal turn-1 faction totals but different exact control topology because player and headless offensive candidate scopes differ; later Army HQ ownership and decision timing remain different. Future comparison artifacts must use the scenario-bound harness and retain its `player_choice_vs_headless` label unless both state and phase inputs are genuinely identical.
