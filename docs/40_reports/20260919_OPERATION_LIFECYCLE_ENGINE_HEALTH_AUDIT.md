# Operation-lifecycle engine-health audit — 2026-09-19

**Branch:** `codex/january-1993-operations-20260914` (HEAD `de4ddf12e`)
**Scope:** the commander-generated operation lifecycle as a system — CREATION, ASSEMBLY,
EXECUTION, ADAPTATION. Owner packet 2026-09-19 (engine health over January calibration).
**No code changed.** Nothing in this audit qualified as a tiny, obvious, behaviour-free
contract violation, so every finding is returned as a bounded proposal.

## Evidence base

- `runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n422` — retained, the branch's
  measurement of record. Not re-run.
- `runs/apr1992_definitive_188w__ce32e87891e44b55__w36_n424` — **new, 36-week diagnostic
  prefix**, run with `AWWV_DEBUG_REASON_CODES=axis_reject`. Exit 0,
  `final_state_hash 9f5c438b673f242c`. **Not a calibration measurement**: it is shorter than
  the 39-week baseline and the instrumentation writes `launch_blocker_detail` into GameState.
  Run because the central question — *why does an operation fail after a correct assembly* —
  could not be answered from any retained artifact. No 188-week run.
- Source read across `sim/combat/commander/`, `sector_offensive*.ts`,
  `corps_operation_helpers.ts`, `operation_validation.ts`, `triggered_operations.ts`,
  `tactical_group_selection.ts`, `final_operation_truth_reconciliation.ts`,
  `assert_operation_lifecycle.ts`, `operation_reinforcement.ts`, `operation_aar.ts`.
- Field ownership verified with `tools/hooks/whowrites.mjs`, not grep.

The two runs produce an **identical terminal axis-blocker inventory**
(`insufficient_donation` 6, `zero_eligible_axis` 3,
`recent_catastrophic_losses_at_objective` 1), which is the evidence that the `axis_reject`
topic is behaviour-inert for these findings.

`data/derived/latest_run_final_save.json` was overwritten by the diagnostic run. It was
already dirty before this session.

---

## A. Contracts that are healthy

1. **Roster reconciliation and the attrition abort.** `reconcileOperationRoster`
   (`final_operation_truth_reconciliation.ts:85-116`) removes dead, inactive and
   foreign-claimed participants every turn and terminates an executing operation whose roster
   empties (`brigade_attrition`). Observed firing on
   `jna_herzegovina_command:Operation Herzegovina:t0`.
2. **Lifecycle invariants are wired into the turn pipeline.** `assertOperationLifecycle`
   (called from `war_phase_reconciliation_steps.ts:40`) raises errors for participant
   double-commitment across corps, missing participants, inactive participants, execution
   with no active participant, and execution with no target. Non-mutating, sorted, deterministic.
3. **Capture authority is declarative, not fiat.** `occupies_on_victory` is a field the
   resolver reads; probes carry `false`. No type-string test survives in the flip path.
4. **Operational memory exists and fires.** `hasRecentCatastrophicObjectiveMemory` /
   `shouldStallAxisForRecentCatastrophicObjective` stalled `Operation Foca`'s `cajnice_south`
   axis after four attacks — a commander declining to feed a proven meat grinder.
5. **The wait-for-the-slow-axis veto is correctly narrowed.** `approaching` on
   `OpeningAttackReadinessResult` now distinguishes "still marching" from "arrived but too
   weak", closing the self-worsening infinite wait. The source documents its own residual gap
   (below, F).
6. **Determinism is clean.** No `Math.random`, `Date.now`, `new Date`, `performance.now` or
   `localeCompare` in any live path under `src/sim/combat/**` — only doc comments. Ranking
   sites sort with `strictCompare`. **No P0 finding.**
7. **P-A (this branch) does what it claims.** At Prodor's abort the instrumented run reports
   `gate_adjacent: 2`, `staged_adjacent: 2` — the admitted roster physically assembled on
   schedule. The diagnosed `participants_below_assembly_floor` failure is genuinely gone.

---

## B. Demonstrated engine defects

### B1 (P1) — The lifecycle has no concentration step

Measured, `n424` AAR, `vrs_2nd_krajina:Operacija Prodor:t27`, axis `cmd_vrs_2nd_krajina_main`:

```
launch_blocker: zero_eligible_axis
launch_blocker_detail:
  gate_adjacent: 2   staged_adjacent: 2   threshold: stalemate
  collapsed_state: present_too_weak
  rs_11th_krupa_light_infantry  found_in_predictor=true  repulsed  power_ratio 0.589043770834912
  rs_5th_glamo_light_infantry   found_in_predictor=true  repulsed  power_ratio 0.589043770834912
```

Both brigades were physically in position (`racic` t30, `trubar` t31, `brigade_temporal_log`),
the identical ratio shows the contextual predictor already summed both, and the combined
attack is 0.589 against a `stalemate` bar. **The refusal is honest.** The defect is that
nothing can change the situation:

- Assembly is defined as objective-**adjacent** (`countAdjacentStagedParticipants`), never as
  **concentrated**.
- A brigade adjacent-but-below-threshold posts `defend` and returns
  (`bot_brigade_eval_attack.ts`, `if (tacticallyAdjacentToObjective) { … posture 'defend';
  return true; }`), so it never repositions to join its op-mate.
- The operation itself issues no orders. Approach marches are produced only by the per-brigade
  attack evaluator.

Result: an operation whose roster is adjacent but dispersed cannot attack, cannot move, cannot
reduce scope and cannot substitute. It dies on `zero_eligible_axis` — and the commander
immediately re-creates it. `Operacija Prodor` aborted t33 on `op:bihac:orasac_2`;
`Operacija Javor` was created t34 on the same objective with an overlapping roster
(`rs_11th_krupa`, `rs_5th_glamo`, plus `rs_1st_drvar`), all three stationary,
`movement_order_count 0` and `eligible_attacker_count 0` for every turn to the run's end.

### B2 (P1) — Assembly floors are never recomputed when the roster shrinks

`whowrites minimum_assembled_participants` / `minimum_staged_brigades` /
`minimum_viable_participants`: **every writer is creation-time**
(`emit.ts:2010,2012,2038`, authored literals in `pre_planned_operations.ts` /
`triggered_operations.ts`). `reconcileOperationRoster` removes participants each turn without
touching them. Losing one participant converts a satisfiable floor into a permanently
unsatisfiable one, and the operation is then guaranteed to fail on
`participants_below_assembly_floor`. That is a manufactured failure, not a command decision.

### B3 — ✅ REPAIRED 2026-09-19 (commit `9cdb14b99`)

> **BEFORE:** weak donor support could block an operation that zero donor support permitted.
> **AFTER:** TG augmentation is optional; inadequate support declines the augmentation, while
> the underlying operation remains governed by normal opening-attack readiness.
>
> The predicate moved to `tgDonationMeetsReadiness` (`tactical_group_selection.ts`) and is
> consumed only at `formTgsAtReadyTransition`, where the zero-donor and weak-donor cases now
> take the same exit. `DONATION_READINESS_FRACTION` is unchanged at 0.6 — the decision moved,
> the bar did not. `insufficient_donation` is retired as a producible blocker (literal kept for
> save compatibility); the replacement diagnostic is `tg_formation_decline` under the new
> reason-code topic `tg_formation`. Contract recorded in ADR-0005 r3.7.
>
> **Measured, 40-week A/B** (`n426` pre-fix vs `n425` post-fix, same scenario and consumed-input
> digest `21b49604f90cfc2f`): terminal axis blockers `{zero_eligible_axis 3,
> insufficient_donation 4}` → `{zero_eligible_axis 4}`; AARs 31 → 34; attacks 89 → 97;
> `tg_formations_by_corps` total 11 → 7; exactly **three** control cells differ.
>
> **⚠ IT EXPOSED A PRE-EXISTING ANCHOR VULNERABILITY — see "B3 aftermath" below.**

### B3 (P1, as originally diagnosed) — The donation-readiness gate is non-monotonic and vetoes proven-executable attacks

`sector_offensive_launch_helpers.ts:1336-1347`:

```ts
if (donors.length === 0) return false;           // never block
return donated < readinessFraction * anchorPersonnel;
```

**Zero donors passes. One donor lending one man fails.** Adding a donor can block an axis that
would otherwise launch.

Three aggravating facts:

- The gate runs **last** in `classifyAxisOpeningAttack`, after
  `axisHasExecutableOpeningAttack` has already returned executable. It can therefore only ever
  remove attacks the engine has already judged winnable.
- It reads only `donors` and `anchorPersonnel`. **The axis's own `assigned_brigades` are not
  consulted at all** — a fully-rostered 3-brigade authored axis can be held inert by a
  shortfall in a separate selection mechanism.
- It is the **most frequent terminal axis blocker in the run: 6 of 10**, double
  `zero_eligible_axis` (3), identical in both runs.

**Launch refusal vs continuation refusal — stated precisely.** Of the ten blocked axes, eight
had already delivered attacks when the blocker was recorded, so most blockers are
*continuation* refusals, not launch refusals. For `insufficient_donation` specifically: five of
six axes had attacked (`western_sarajevo` 2, `northern_ring` 1, `prijedor_clean` 4,
`brcko_corridor` 2, `gorazde_perimeter` 3) and one had not (`kotor_varos_siege` 0). That does
not weaken the finding — an axis terminated mid-campaign by a donor shortfall unrelated to its
own roster is if anything a worse contradiction than one refused at birth — but the gate should
be described as predominantly closing axes down, not keeping them from starting.

This is already documented in-source as a measured 188-week regression
(`tactical_group_config.ts`, `DONATION_READINESS_FRACTION_HRHB` rationale: *"A handful of HVO
donors ARE eligible (so the Phase-1.5 zero-donor fallback does NOT apply), but BFS
distance-falloff cuts their personnel_lent below the 60% … the gate blocks the axis"*). It was
worked around with a faction-specific constant (0.25 for HRHB against 0.6 for everyone else)
rather than fixed.

### B3 aftermath (NEW, P1) — central Sarajevo is capturable against no defender, and the donation veto was accidentally hiding it

Repairing B3 turned two anchor tests red — `tests/integration_deployment_health.test.ts`
("anchor strongpoints (40w)") and `tests/integration_run_summary.test.ts`. One anchor fails:

```
op:centar_sarajevo:sarajevo_dio_centar_sajarevo: expected RBiH, got RS
```

**Attribution is clean.** Reverting only the six B3 source files and re-running the same two
tests gives 21/21 PASS; restoring them gives the failure. B3 is the proximate cause.

**But the vulnerability is pre-existing, and the pre-B3 run's own anomaly detector already
reports it.** `end_report.md` in the BEFORE run, Anomaly Detection:

```
[adjacent_uncontested_territory] 5 OSID(s) have no defending brigades with enemy brigades at
adjacent OSIDs: op:centar_sarajevo:sarajevo_dio_centar_sajarevo (RBiH, no defenders) adj to
op:centar_sarajevo:radava (RS brigade present), op:novi_grad_sarajevo:… (RBiH, no defenders),
op:novo_sarajevo:… (RBiH, no defenders), op:stari_grad_sarajevo:… (RBiH, no defenders), …
```

Four of the five Sarajevo city cells stand undefended with an RS brigade next door, in BOTH
runs. The capture is a walkover: `control_events` records
`battle_id 34:op:centar_sarajevo:sarajevo_dio_centar_sajarevo:rs_1st_romanija_infantry:null` —
the trailing `null` is the defender slot. Central Sarajevo did not fall because the attacker
got stronger; it fell because nobody was holding it and, this time, an operation walked in.

**What B3 actually changed is which operations exist.** The commander-generated operation sets
are wholesale different between the runs (BEFORE: Bastion, Bedem, Bunar, Gvožđe, Izlaz, Munja,
Odmazda, Straža, Tvrđava, Vihor, Vijak — AFTER: Bedem, Grab, Hrast, Izlaz, Obruč, Odmazda,
Topola, Tvrđava, Udar, Usjek, Vihor, Vijak, Zaslon), so per-operation comparison is not
like-for-like. `vrs_sarajevo_romanija:Operacija Usjek:t29`, which took the cell, does not
exist in the BEFORE run at all. The old `insufficient_donation` veto was cancelling
operations often enough that this one never came up.

**The finding, stated plainly: the donation gate was doing calibration work under an
engine-health name.** It was protecting a historical anchor by suppressing operations, not by
defending the position. That protection was accidental, non-monotonic, and invisible.

Of the three cells that moved, only one is an anchor breach: `op:odzak:potocani_2` HRHB→RS
moves **toward** the painted reference (the BEFORE run lists it under
`[undefended_painted_mismatch] … op:odzak:potocani_2 (sim=HRHB, painted=RS)`), and
`op:travnik:gornje_krcevine` RS→RBiH is a recorded worth-0 cell.

**Verification status of this section.** The A/B was run twice and is reproducible from the two
retained run directories, but a second seat dispatched to verify it hit a session limit and
produced nothing — **this section is unverified by an independent reader.** The 39-week audit
figures in the rest of this report WERE independently verified and all held.

**NOT ACTED ON IN THIS PACKET.** The B3 packet forbids tuning against checkpoints, lowering
`DONATION_READINESS_FRACTION`, and adding faction exceptions, and the standing owner
instruction is that a sound engine fix is not to be reverted for a calibration cell. So the
fix stands, the two anchor tests are left RED and documented, and the real defect —
**ARBiH 1st Corps leaves the Sarajevo city cells with zero defending brigades while RS
brigades stand adjacent** — is returned as a new finding for owner decision. It is a garrison
/ sector-coverage defect, not a donation defect, and it is the same shape as the
`sector:arbih_5th_corps:0` density-0.000 case already recorded against `op:bihac:orasac_2`.

### B4 (P1) — The injection validator and the operation builder use different eligibility predicates

`operation_validation.ts:136-163` (Check B) tests only *formation exists* and
`isEligibleOperationFormation`. `triggered_operations.ts:936-987` additionally rejects on
`personnel < MIN_ATTACK_PERSONNEL`, `disrupted_turns > 0`, `movementState.status ===
'in_transit'`, and corps mismatch — then drops the axis entirely
(`if (axisBrigades.length === 0) continue;`).

So the validator declares an axis valid, the builder silently deletes it, and **no warning is
recorded anywhere**: `op_injection_warnings` in the run holds 7 entries, all `brigade_missing`,
none `axis_empty`. Authored operational intent is permanently reduced by a single-turn
transient condition, invisibly. This is the mechanism class behind the recorded Kijevo
`praca_approach` drop.

### B5 (P1) — Four approach graphs and three concentration models answer the same question

"Where must a brigade stand to attack this objective?" has four independent implementations:

| owner | graph | controller filter |
|---|---|---|
| creator (`emit.ts:500-506`) | `spatial.sharedBoundaryAdjacency ?? spatial.adjacency` | `friendlyOsidsByFaction` |
| launch gate (`collectObjectiveApproachOsids`) | `war_front_edges_osid` + sub-segment + static fallbacks | `getPoliticalControllerOSID` |
| movement (`operation_approach_osids.ts:45-95`) | `getTacticalAdjacentOsids` + sub-segment fallback | `getPoliticalControllerOSID` |
| staging / executability (`objectiveAdjacentOsids`) | raw `war_front_edges_osid` | **none** |

And three concentration models: the creator projects every participant onto an approach and
runs one contextual prediction; the launch gate sums only participants standing on a live
front-edge neighbour; the brigade evaluator uses a 2-hop distance-weighted count into
`estimateConcentratedOutcome`'s band estimate.

Prodor is the demonstrated disagreement: admitted at ≥ `stalemate` at t27, measured
`repulsed` / 0.589 at t31–33 with both participants correctly staged — and **never
re-evaluated in between**.

### B6 (P2) — Validator Check C is skipped exactly when staging equals the objective

`operation_validation.ts:197`:

```ts
if (staging && firstObjective && staging !== firstObjective) { /* adjacency check */ }
```

The guard exists for the legal waypoint pattern (staging on an *already-owned* first
objective — `Operation Herzegovina` uses it deliberately). But it also whitelists the
impossible case: staging on an **enemy-held** objective.
`Operation Kotor Varos` (`triggered_operations.ts:287` and `:302`) sets
`staging_osid: 'op:kotor_varos:kotor_varos_2'` at both operation and axis level, with that
same OSID as `objectives[0]`. Zero `staging_adjacency` warnings in the run. The module already
imports `isOperationObjectiveHostile`.

### B7 (P2) — `recovery_reason: 'completed'` is assigned from objective state, not contribution — and it suppresses failure learning

`vrs_1st_krajina:Operation Kotor Varos:t10`: `outcome: failure`, `total_attacks: 0`,
`grade.verdict: "No Assault Attempted"`, axis `launch_blocker: insufficient_donation` — and
`recovery_reason: 'completed'`, because `reconcilePlanningObjectives` returned `'completed'`
once `op:kotor_varos:kotor_varos_2` flipped HRHB→RS by a different mechanism
(`control_delta.json`).

`recordObjectiveFailure` returns early on `recovery_reason === 'completed'`
(`sector_offensive.ts:837`). A blocked operation therefore leaves no entry in
`failed_offensive_objectives` and arms no cooldown. The grade verdict is the honest field;
`recovery_reason` and `outcome` disagree.

### B8 (P2) — The AAR derives faction and roster from the roster as it stands at termination

`operation_aar.ts:655-659` and `:444-449` both walk `op.participating_brigades` and take the
first resolvable formation's faction. When the roster has emptied the AAR persists
`faction: ""` (the field is typed `FactionId`) and `participating_brigades: []` — observed on
`jna_herzegovina_command:Operation Herzegovina:t0`, which recorded **7 attacks and one
capture**. Worse, the per-turn tracker at `:459` skips `capturedThisTurn` / `lostThisTurn`
entirely when `opFaction` is null, so an operation stops recording captures the moment its
roster empties. `op.corps_id` resolves the faction trivially and is unused.

### B9 (P2) — Axes pruned in planning leave their brigades committed but unattached

`reconcilePlanningObjectives` rebuilds `op.axes` from surviving candidates and never touches
`op.participating_brigades`. Only axes attack, so those brigades are inert — but they still
count toward `hasMinimumAssembledParticipants` and toward the commander's
`activeOperationParticipants` exclusion, so they read as busy.

### B10 (P2) — Roster reconciliation only aborts in execution

`final_operation_truth_reconciliation.ts:112` gates the `brigade_attrition` abort on
`operation.phase === 'execution'`. A planning-phase operation whose roster empties is not
terminated there; it waits out the planning deadline holding its slot.

### B11 (P3) — The operation-loan subsystem is dead

`computeReinforcementPool` — the only producer of loan candidates — is referenced solely by
`tests/`. `whowrites loaned_brigades` finds exactly two production writers, **both
`.filter()`**. `op.loaned_brigades` is never populated, so `areLoanedBrigadesReady`,
`LOAN_ARRIVAL_THRESHOLD`, `LOAN_STAGING_BUFFER_TURNS` and `MAX_LOANED_PER_OP` are inert. The
ADAPTATION boundary has no substitution capability in production at all.

### B12 (P3) — First-objective short-circuit in both approach collectors

`collectObjectiveApproachOsids` (line 426, and again at 469) and
`getSectorOffensiveApproachOsids` (line 68) both `break` out of the objective loop as soon as
one objective yields any approach. For multi-objective calls (`getCurrentLaunchObjectives`,
`getAllAxisObjectives`) later objectives' approaches are never collected. Duplicated in two
modules, uncommented in both.

---

## C. Brittle but intentional

- **`evaluateLaunchFeasibility` returns `feasible: true, ratio: Infinity`** both when the
  objective has no owning sector and when the owning sector has zero live defenders. Two
  different facts — *unmodelled* and *undefended* — collapse to the same maximally favourable
  verdict.
- **`personality.initiative > 0.3` against `DEFAULT_PERSONALITY.initiative = 0.3`** (strictly
  greater). A corps with no named officer can never consider a local occupation opportunity —
  the same exact-boundary trap already recorded for the probe gate.
- **`axis.current_objective_index === objectives.length` is the completion sentinel**
  (`vlasic_pocket`, `status: 'complete'`, idx 1/1). Safe only because
  `evaluateOpeningAttackReadiness` skips `complete`/`stalled` axes first. `getAllAxisObjectives`
  and the AAR do not check status. Latent, not currently firing.
- **The `min_attack_outcome` ladder is coherent**: probe `repulsed`, commander op `stalemate`,
  catalog `repulsed`, generic default `costly_victory`. Not a defect.
- **Garrison withholding is correct and must be preserved.** `rs_1st_drvar` was withheld from
  Prodor because it held its own sector's front. Donating it would have unstaffed that front.

---

## D. Missing capabilities / design gaps

1. **A concentration order.** Nothing converts an adjacent-but-dispersed roster into a
   concentrated one. (B1.)
2. **Roster-aware floor recomputation.** (B2.)
3. **Substitution.** The module exists and is unwired. (B11.)
4. **Scope reduction and deferral.** Nothing drops an axis, lowers a floor or postpones an
   operation in response to measured infeasibility. The only adaptations in the engine are
   *abort* and *re-create*.
5. **Re-evaluation between creation and the terminal gate.** The creator's prediction is never
   revisited; three brigades can sit committed for the full planning window on a stale estimate.
6. **Outcome-magnitude memory.** `failed_offensive_objectives` stores a count, not the measured
   ratio. A 0.589 refusal and a 0.99 refusal cost the same, and the commander must spend a full
   operation cycle (≈ `planning_duration + grace` turns of committed brigades) per strike
   before `OBJECTIVE_FAILURE_THRESHOLD = 2` arms a cooldown. Prodor t33 → Javor t34 is that
   loop, observed.

---

## E. Duplicate or contradictory authority

- **Approach geometry and concentration**: four graphs, three models. (B5.)
- **Operation slot accounting**: `hasAvailableSlot` counts *all* `active_operations` including
  recovery-phase ones; both commander sites (`emit.ts:1219`, `emit.ts:1626`) exclude recovery —
  under a comment that claims to "mirror `hasAvailableSlot()`". The denominators differ too:
  `briefing.brigades.length` vs `corpsBrigadeIds.size` vs `activeCorpsBrigadeCount(state, corps)`.
  Same corps, same turn, different answers depending on which subsystem asks. There are six
  `active_operations.push` sites across `sim/`.
- **Two concentration authorities can veto each other**: the axis's own `assigned_brigades`,
  and the TG donor pool. The donation gate reads only the latter. (B3.)
- **Validator vs builder eligibility.** (B4.)

---

## F. Diagnostics that are misleading or insufficient

1. **`operation_diagnostics` phase sampling is not a measure of lifecycle time.** Of 31
   non-probe operations in `weekly_report.jsonl`, **15 are never sampled with
   `operation_phase === 'execution'` — and 11 of those attacked and captured an objective**
   per their AAR (`Bosanska Krupa Takeover`, `Srebrenica–Cerska Link-Up`,
   `Visoko–Breza Line Clearing`, `Operacija Izlaz`, `Operacija Odmazda`, `Operation Kijevo`,
   `Operacija Bor`, `Operacija Sjever`, `Operacija Bastion`, `Operacija Stjena`,
   `Operacija Topola`; each `total_attacks ≥ 1`, `objectives_captured ≥ 1`). The sample is
   taken at a point in the turn where a fast operation has already left execution. The
   179-planning : 70-execution ratio derivable from this artifact is therefore **invalid**,
   and the "27% of execution-turns are inert" figure has a biased denominator. Both are
   recorded here as a diagnostics defect, not as findings.
2. **`insufficient_donation` — the most frequent terminal blocker — emits no detail at all.**
   The `axis_reject` topic instruments only the `zero_eligible_axis` path.
3. **`launch_readiness_detail` is never cleared at the planning→execution transition**, so it
   persists in the save describing a decision about a different objective:
   `Operation Donji Vakuf` / `donji_vakuf_sweep` carries a detail naming
   `op:donji_vakuf:torlakovac_2` while the axis sits at `current_objective_index 2`
   (`donji_vakuf_2`). This is exactly the hazard the author guarded against at the in-planning
   sites ("a reason code that explains the wrong refusal is worse than none").
4. **A build-time axis drop leaves no record** — not in `op_injection_warnings`, not in the AAR.
5. `routine_destination_out_of_scope` remains behind a debug topic and absent from run
   artifacts (already noted in the branch's own `MEASUREMENT.md`).
6. `recovery_reason` and `outcome` can contradict each other. (B7.)

---

## G. Prioritized engine-health backlog

| | finding |
|---|---|
| **P0** | *none found* — no state corruption, no invalid authority, no nondeterminism |
| **P1** | ~~B3 donation-gate non-monotonicity~~ **REPAIRED `9cdb14b99`** · **B3-aftermath: Sarajevo city cells undefended with RS brigades adjacent (NEW, owner decision pending)** · B1 missing concentration step · B2 floors not recomputed on roster shrink · B4 validator/builder eligibility divergence · B5 four approach graphs / three concentration models |
| **P2** | B6 staging == enemy objective unvalidated · B7 `completed` vs contribution · B8 AAR faction/roster destroyed at termination · B9 orphaned committed brigades · B10 planning-phase abort gap · E slot accounting |
| **P3** | B11 dead loan subsystem · B12 first-objective break · F3 stale readiness detail · C sentinel and exact-boundary items |

---

## Recommended single next engine fix — ✅ DONE (`9cdb14b99`, 2026-09-19)

> Implemented as specified. The bounded proposal below was followed: the lone-anchor fallback
> now applies to the CONTRIBUTION rather than to the donor-set size, no threshold/floor/
> deadline/speed/power moved, and the decline carries a reason code. See "B3 aftermath" above
> for the anchor regression it exposed, which is NOT a reason to revert it.

**B3 — make `donationReadinessBlocksAxis` monotonic, and give it a reason code.**

Rationale, in order of weight:

1. It runs **after** `axisHasExecutableOpeningAttack` has returned executable, so it can only
   ever remove attacks the engine has already judged winnable. That is the exact shape the
   owner's engine-health rule prohibits: a subsystem manufacturing failure.
2. It is measurably the most frequent terminal axis blocker — **6 of 10**, stable across both
   runs.
3. Its non-monotonicity is provable by inspection: zero donors passes, one small donor blocks.
4. It never reads the axis's own roster, so it can veto a fully-assembled authored axis.
5. Its regression history is already documented in-source and was patched with a per-faction
   constant; fixing the gate shape also retires that band-aid.

**Bounded proposal.** Apply the existing lone-anchor fallback on the *contribution*, not on the
donor-set size: if the pledged donation is below the readiness floor, fall back to the
lone-anchor path (do not block) rather than blocking. Equivalently, block only when donors
exist *and* the axis's own assembled strength is itself below the floor. This changes no
threshold, no assembly floor, no deadline, no movement speed, no combat power, and cannot
create a launch the opening-attack predictor would refuse. Add a `launch_blocker_detail` on the
`insufficient_donation` path under the existing `axis_reject` topic so the next reader does not
have to reconstruct it.

Acceptance should be judged on the contract (does a fully-rostered axis still get vetoed by a
donor shortfall?) and on the blocker inventory, **not** on a checkpoint cell.

**Next after that:** B2 (floors), then B1 (concentration — the only P1 needing a genuinely new
capability, and the real answer to the owner's core question).

---

## What is explicitly NOT claimed

- No claim that Prodor's or Javor's refusal is wrong. The 0.589 ratio is honest; the defect is
  the absence of any adaptation around it.
- No claim that `Operacija Javor` is stuck forever. At the run's end it was at `elapsed 5`
  against `planning_duration 3 + grace 2`; its deadline had not yet passed.
- No 188-week effect is measured. Territorial consequences of any proposal above are unknown.
- January calibration is untouched and remains at 696/712, below the 700 floor.
