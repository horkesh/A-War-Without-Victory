# RE — Engine Integrity: probe memory, operation supply, and the cost loop

**Workstream:** RE (new gate lane, sibling of RC)
**Status:** SCOPED — eight-seat panel complete + orchestrator source audit. Not started.
**Created:** 2026-08-26 · **Revised:** 2026-08-26 (panel), 2026-08-26 (source audit — §3 corrections)
**Executable plan for:** Master Roadmap §5 row `RE`
**Evidence packet:** [`20260826_ENGINE_INTEGRITY_PACKET.md`](../40_reports/proposals/20260826_ENGINE_INTEGRITY_PACKET.md)

---

## 0. HOW TO USE THIS DOCUMENT

**Read §1 (authority), §3 (corrections — the panel was wrong about several things), §4 (setup), then
your phase.** Every task carries the same seven fields, so you can start one without reading the rest:

| field | meaning |
|---|---|
| **WHY** | the defect, with evidence |
| **WHERE** | `file:line` **at commit `a1c10b3bd`** plus a grep anchor, because line numbers drift |
| **WHAT** | the precise change |
| **BLAST RADIUS** | every consumer, enumerated and verified — not guessed |
| **TEST** | the assertion *and* the mutation that must break it |
| **MEASURE** | run cost and acceptance criterion |
| **DONE WHEN** | the closing condition |

**Line numbers are a convenience, not an address.** Read files with
`git show a1c10b3bd:<path>` and locate by the grep anchor. The working tree at time of writing
carried unrelated in-flight calibration edits to `sector_offensive.ts`,
`pre_planned_operations.ts`, `operation_preparation.ts` and `tactical_group_selection.ts`; the
packet's original line numbers were taken from that dirty tree and were wrong by ~70 lines.

---

## 1. Authority and scope

> **Owner, 2026-08-26:** *"Engine health is sacrosanct — these issues should be dealt with
> immediately before more calibration work."*

Creates this workstream and sets its precedence over further calibration. Does **not** authorize
editing `docs/10_canon/FORAWWV.md`, crossing the §6 bright line, publication, or disabling any gate.

**Out of scope, explicitly:** painted references · `init_control` · op objectives · axes · operation
timing · OOB rosters (all Codex's lanes) · weakening `attack_morale_absorption` (governance-gated) ·
the authored `aggression_modifier` decline · the faction cohesion floors · sector-partition
behaviour (observation only) · raising VRS real-operation volume as a lever (§8.5).

---

## 2. The defect, in one page

```
        ┌─ probes cannot capture, by construction ────────────── correct, keep
        │
   A probe that FIGHTS records no objective failure ──┐
   (the exemption is keyed on `probe_complete`,       │  the corps re-picks the
    which IS the "fought and took nothing" outcome)   ├─ same cell forever
                                                      │
   The anti-repetition guard lives on the OPERATION ──┘
   (13 probe ops × 2 attacks each at Radava; the
    guard fires 13 times, resets 13 times)
                       │
                       ▼
   365 of 585 battles (62%) are probes ── 201 wins, ZERO ground, 131,577 attacker casualties
                       │
        ┌──────────────┴───────────────┐
        ▼                              ▼
   Radava: 26 attacks,            Gornja Vratnica: 39 attacks,
   25 catastrophic, 0 wins        24 DECISIVE VICTORIES
        └────────── same two code paths ──────────┘
                  the selector never reads the outcome

   MEANWHILE, the real-operation path is starved:
   the corps AI produces 23 capture-capable attacks in 188 weeks — ALL 23 RBiH.
   14/14 RS commander ops score force_ratio 0.012-0.297 against a 0.3 floor and never attack.
```

**And separately, the cost loop:** replacement restores a shattered brigade with no quality cost,
funded by an ungated `strategic_reserves` pool (RBiH 256,091 / RS 0) that no exhaustion check
touches — while `readiness: 'degraded'` is an absorbing state that locks a brigade out of all
replacement forever.

---

## 3. ★ CORRECTIONS TO THE PANEL — read before implementing

The eight-seat panel refuted fourteen claims in the evidence packet. A subsequent source audit then
refuted **five claims made by the panel itself**. These are the corrected facts; where this section
disagrees with a seat's report, this section wins.

### 3.1 `failed_offensive_objectives` does NOT gate real operations — VERIFIED

The Corps-Commander seat wrote that the VRS "locks its own real objectives out for eight turns per
abort." **It does not.** The map has exactly **one reader** in the entire source tree:

```
src/sim/combat/commander/emit.ts:1175   const cooldown = briefing.failed_offensive_objectives?.[target];
```

and that line sits **inside probe target-ranking** (`.filter(c => !c.onCooldown)` at `:1216`). Real
operation target selection never reads it. Writes come from both `sector_attack` and `probe`
recoveries, but the only consumer is probe selection.

⇒ **This makes Task 1.1 far safer than the panel assumed.** Letting probes write to this map is
contained entirely within probe targeting. It cannot suppress a real operation.

### 3.2 The probe cooldown is mostly WORKING — the dead scan costs about one turn

The Operations seat found that `emit.ts:1067` scans `previous_state.operation_history` for
`type === 'probe'` while both writers hardcode `'sector_attack'`. **True, and it is deader than
that** — both writers record *plan* decisions keyed `cmd_<corps>_t<turn>`, so `operation_history`
was never an operation-level log at all.

**But the cooldown's other half works.** `emit.ts:1064-1066` scans `briefing.active_operations` for
live probes, and:
- `probe_complete` recovery duration is **1 turn** (`sector_offensive.ts:997-1008`);
- `removeOperation(cmd, op)` drops the op only when recovery elapses.

So a probe stays visible in `active_operations` from `started_turn` to roughly `started_turn + 3`,
against a `PROBE_COOLDOWN_TURNS = 4` window measured from `started_turn`. **The dead scan costs
approximately one turn of cooldown, not the brake.** The measured 4-6 turn Radava cadence *is* the
cooldown working.

⇒ **Task 1.2 is demoted from "the brake is disconnected" to a correctness cleanup.** Do not sell it
as a volume fix. See §6 for what actually governs probe volume.

### 3.3 The exemption covers every probe, and the inversion is real — VERIFIED, with a better mechanism

The packet and the Corps-Commander both said "only probes that never fought record a failure."
**The true mechanism is sharper.** Trace every route to a recovery reason for `type === 'probe'`:

| route | reason | records failure? |
|---|---|---|
| attacked ≥1, did not capture (`sector_offensive.ts:1630`) | `probe_complete` | **NO** — exempt at `:846` |
| ran out of objectives, did not capture (`:1045`) | `probe_complete` | **NO** — exempt at `:846` |
| stalled with zero attacks (`getNoAttemptRecoveryReason`, `:1019-1021`) | `planning_invalidated` | **YES** |

`getNoAttemptRecoveryReason` returns `'planning_invalidated'` for probes **unconditionally** — it
early-returns on `op.type === 'probe'` before the attack-count branches. And `planning_invalidated`
was deliberately made failure-recording by `LANE-2026-05-02-B1` (documented in the comment block at
`:848-858`) for exactly this class of unbounded re-emission.

⇒ **The engine already decided this question once and got it right for the stalled case.** A probe
that stalls without fighting records a failure; a probe that fights and takes nothing does not.
**That is the inversion, and Task 1.1 is the same fix the 2026-05-02 lane already applied one door
down.** Cite that precedent in the PR — it is the strongest argument available.

### 3.4 The garrison multiplier is ALREADY capped — the Corps-Commander seat was wrong

It reported that `computeMustHoldMultiplier` "rises as a corps thins" without limit. Source:

```ts
// allocate.ts, anchor: "export function computeMustHoldMultiplier"
const scaled = MUST_HOLD_PRESSURE_COEFFICIENT * observedPressure;   // 0.75 × commitment_ratio
return Math.max(MUST_HOLD_MULT_FLOOR, Math.min(MUST_HOLD_MULT_CAP, scaled));  // clamp(_, 2.0, 5.0)
```

It saturates at `commitment_ratio ≥ 6.67`. `vrs_sarajevo_romanija` at 62 edges / 8 brigades has
ratio 7.75 and is **already at the cap**. ⇒ **Task 3.3 is re-scoped**: the defect is not an unbounded
multiplier, it is that a garrison budget may exceed the brigades that exist with no fallback,
pinning `can_launch_ops: false` permanently. Bounding the multiplier further would not help.

### 3.5 `estimateForceRatio` under-reports, always — VERIFIED, and its comment is inverted

```ts
// operation_preparation.ts, anchor: "Apply estimation error based on confidence and competence"
const accuracyFactor = Math.min(1.0, confidence * 0.6 + competence * 0.08);
// Bias: low accuracy overestimates (commanders tend to be optimistic about own strength)
const bias = (1 - accuracyFactor) * 0.3;
return trueRatio * (accuracyFactor + bias);
```

`accuracyFactor + bias` simplifies to **`0.3 + 0.7 × accuracyFactor`**, i.e. the multiplier is
bounded to **[0.3, 1.0]** — it can never exceed 1.0, so it **never** over-reports. The comment claims
the opposite. Launch floors: `MIN_LAUNCH_FORCE_RATIO_FLOOR = 0.3` for commander ops
(`min_attack_outcome: 'stalemate'`, `corps_operation_helpers.ts:297`) against `0.15` for probes
(`:404`). **Corps-AI operations face twice the launch standard that probes do, using an estimator
that structurally under-states their strength.**

### 3.6 `readiness` has TWO absorbing states, not one — VERIFIED, and it is bigger than A-3

```
battle_resolution.ts   applyPersonnelLoss:  personnel < MIN_BRIGADE_SPAWN (800)  →  readiness = 'degraded'
formation_constants.ts isEligibleForReinforcement:  'degraded' OR 'forming'      →  FALSE
                       ↳ called by BOTH reinforceBrigadesFromPools AND reinforceFromStrategicReserves
brigade_reconstitution.ts:415,464                                                 →  readiness = 'forming'
```

**Nothing in the war pipeline ever restores `'active'`.** The only writer is
`promote_formations.ts:148`, and `promoteFormations` is wired into `early_war_phases.ts:199` only.
With `DISSOLUTION_PERSONNEL_THRESHOLD = 400` and `MIN_COMBAT_PERSONNEL = 100`, the band **400-800 is
a death corridor with no exit**: below 800 a brigade can never take replacements again, so its
personnel can only fall, and at 400 it becomes a dissolution candidate.

⇒ **Candidate root for `rs_brigade_destruction_asymmetry_engine_flaw`** — open for weeks with "root
mechanism not yet found". The RBiH avoids the corridor because its strategic reserve tops brigades
up before they cross 800; the RS, with a reserve of **0**, has no way back out. **Empirical
confirmation is out with the Formation seat** (§9, OPEN-1). If it holds, **Task 4.0 becomes a
prerequisite for A-3**, because A-3 deliberately slows replacement and would push many more brigades
into an absorbing state.

---

## 4. Setup — do this first

```powershell
# 1. RE branches from a CLEAN four-checkpoint pin, never from the shared tree.
#    Precondition: Codex has landed the January lane and a git_dirty:false 188w exists.
git worktree add F:\awwv-re codex/engine-integrity-docs
cd F:\awwv-re
npm ci                       # do NOT junction node_modules — napkin 1c: worktree remove destroys the target

# 2. Verify the baseline you will measure against.
node tools/verify_checkpoints.cjs <run_dir>
#    Required: git_dirty:false, all four checkpoints, hash + consumed-inputs digest recorded.

# 3. Focused verification during work (NOT the full suite — see §10).
npx vitest run tests/sector_offensive.test.ts tests/operation_completion_truth.test.ts
npx tsc --noEmit
```

**Never run `git add -A` after a scenario run.** `data/derived/latest_run_final_save.json` is tracked
and rewritten by every 188w; a blind add ships ~397,674 changed lines.

**Do not run `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` alone** — 38 minutes
with no output until the end. It passes inside the full suite.

---

## 5. PHASE 0 — free work, zero scenario runs

| # | Task | Acceptance |
|---|---|---|
| 0.1 | **Retrospective op-schedule diff** from existing `operation_aars.json`. Report the full ladder — name-only / name+corps+turn / corps+turn / **corps+objectives** / +brigades. **Never a single name-keyed number.** | Reproduces the measured n286/n287 pair: 29 / 23 / 23 / **29** / 24. |
| 0.2 | **Corrected health-gate predicate, REPORTED-NOT-GATED.** Old `dead_ops` stays gated under a renamed `invalid_op_weeks`. | Corrected axis-scoped counts emitted beside the old ones; nothing un-gated in the interim. |
| 0.3 | **Clean four-checkpoint baseline pin.** | `git_dirty:false`, four checkpoints, hash + digest recorded in `CALIBRATION_MASTER.md`. |
| 0.4 | **Write the decision rule (§11) into `CALIBRATION_MASTER.md` before run 1**, unamended after. | Present and dated. |
| 0.5 | **Correct the record.** `REAL_WAR_MASTER #40` P3 → **P0**. Project-memory KIA `~30k/24k/8k` → BB-sourced **18,543 VRS / ~6,400-6,900 HVO**. | Both corrected with citations. |
| 0.6 | **Name-collision assertion test.** Zero collisions today (112 pool names vs 27 authored) but `operation_names.ts:71` carries `'Operacija Lukavac'` against an authored Lukavac 93, and the file records a prior Stupčanica-95 collision. | Test present and green. |

> **Why 0.2 ships reported-not-gated.** The corrected predicate reads **`dead_ops` 11 against a
> ceiling of 6** and **axis-scoped `zero_eligible_ops` 13 against 3** — both RED — while the shipped
> gate reads green against 11 of 45 operations with zero attacks. Blessing 11/13 as the ceiling now
> would ratchet the defect in as the floor. Promote to a hard ceiling only after Phase 3.

---

## 6. PHASE 1 ★ — probe memory

> **⚠ READ §3.2 FIRST, AND SET EXPECTATIONS HONESTLY.** Probe *volume* is governed by the emission
> gate — `ops.length === 0 && !probeOnCooldown && can_launch_ops && surplus_pool.length > 0 &&
> initiative > 0.3` — i.e. by cadence and surplus, **not** by target availability. A per-objective
> cooldown stops the corps returning to the *same* cell; it does not obviously stop it probing
> *somewhere*. **Whether Phase 1 reduces probe count and casualties, or merely redistributes them,
> is measured and pending (§9, OPEN-2).** Until that lands, claim fidelity, not volume.

### Task 1.1 — let a probe that fought record an objective failure

**WHY** — §3.3. The exemption is keyed on `probe_complete`, which is precisely the "fought (or
exhausted its objectives) and took nothing" outcome, while the stalled-without-fighting case routes
to `planning_invalidated` and *does* record. The memory is inverted. Radava carries
`failure_count 1, cooldown_until_turn 0` after 26 attacks; a VRS objective with **zero** attacks
carries `13 / 182`.

**WHERE** — `src/sim/combat/sector_offensive.ts:846`.
Anchor: `grep -n "Probes gather intel"`.

**WHAT** — replace the unconditional exemption with an attack-count gate:

```ts
// BEFORE
if (op.recovery_reason === 'probe_complete') return; // Probes gather intel — not a failure

// AFTER
// A probe that FOUGHT and took nothing is evidence about the objective and must be
// recorded, or the corps re-picks the same cell forever (Radava: 26 attacks across 13
// probe ops, failure_count 1). A probe that never fought learned nothing about the
// objective's difficulty and stays exempt. Same correction as LANE-2026-05-02-B1
// applied to planning_invalidated, one door down — see the comment block below.
if (op.recovery_reason === 'probe_complete' && (op.attack_attempt_count ?? 0) === 0) return;
```

For multi-axis probes use `sumAxesField(op.axes!, 'attack_attempt_count')` — mirror the existing
`isMultiAxis(op)` branching already used at `:861`.

**BLAST RADIUS — fully enumerated, verified by `git grep`:**
- `failed_offensive_objectives` is written only in `recordFailedObjectives` and read only at
  `emit.ts:1175`, inside probe target-ranking (§3.1). **Real-operation targeting is unaffected.**
- The `op.recovery_reason !== 'probe_complete'` check at `sector_offensive.ts:1660` (officer
  defeatism) sits inside `if (op.type === 'sector_attack')` at `:1644` and is therefore **dead code
  for probes**. Unaffected — but note it in the PR as a cleanup candidate.
- `getRecoveryDuration` keys on `probe_complete` (`:997`). Unaffected — this change does not alter
  the reason.

**TEST** — extend `tests/sector_offensive_idle_recovery.test.ts` (already asserts on
`failed_offensive_objectives` at `:282`):
1. probe, `attack_attempt_count = 2`, recovers `probe_complete` → objective's `failure_count === 1`.
2. probe, `attack_attempt_count = 0`, recovers `probe_complete` → objective **absent** from the map.
3. two successive fought probes at one objective → `cooldown_until_turn === turn + 8`.
4. **liveness:** assert the map has exactly the expected key count, so an empty-map pass is impossible.

**MUTATION THAT MUST FAIL IT** — restore the unconditional `return`. Test 1 must go red. Also invert
the gate to `> 0` — test 2 must go red. Both, or the test only pins one side.

**MEASURE** — territory-moving. One 188w **alone**, against §11. Predicted loss set (§11 S3): cells
where an ARBiH corps currently probes repeatedly; the probe channel is 252/365 ARBiH.

**DONE WHEN** — no objective in any run receives more than `OBJECTIVE_FAILURE_THRESHOLD` fought-probe
attacks inside `OBJECTIVE_FAILURE_COOLDOWN_TURNS`, and Radava's attack count falls.

---

### Task 1.2 — probe cooldown: correctness cleanup (NOT a volume fix)

**WHY** — §3.2. The `operation_history` half of the cooldown can never match, because that log
records plan decisions (`cmd_<corps>_t<turn>`), not operations. Cost is ~1 turn of cooldown.

**WHERE** — `src/sim/combat/commander/emit.ts:1067`. Anchor:
`grep -n "previous_state?.operation_history ?? \[\]" ` inside the `probe.cooldown` thunk.

**WHAT** — **do not** start writing `type: 'probe'` rows into `operation_history`. That log feeds
`buildUpdatedLessons` and plan.ts repeat-failure detection via `osids_lost`, and polluting it with
probe rows is a behaviour change in a system nobody has scoped. Instead **either**:
- **(a) preferred** — carry an explicit `last_probe_turn?: number` on `CommanderState`, written when
  a probe operation is created, and read by the cooldown; **or**
- **(b) minimal** — delete the dead loop and fix the comment, accepting the ~1-turn gap.

Choose (a) only if OPEN-2 shows cadence is a real lever; otherwise (b) is honest and free.

**BLAST RADIUS** — (a) adds a serialized field ⇒ **save migration**. (b) is comment + dead-code
removal, behaviourally inert.

**TEST** — (a): two probes 3 turns apart → second suppressed; 5 turns apart → allowed; assert across
the recovery transition specifically. (b): a source-text pin that the comment no longer claims a
bridge that does not exist. **MUTATION:** (a) remove the write — the 3-turn case must go red.

**MEASURE** — (b) inert, 0 runs. (a) territory-moving, 1 × 188w.

---

### Task 1.3 — move the anti-repetition guard off the operation

**WHY** — `MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT = 2` (`sector_offensive.ts:610`) lives on
`axis.consecutive_catastrophic_on_current`, **per-axis-per-operation** state. Radava's 26 attacks are
13 separate probe operations of exactly two attacks each: the guard fires correctly 13 times and
nothing survives the operation boundary.

**WHAT** — the corps-scoped `failed_offensive_objectives` map is the correct home, and **Task 1.1
populates it**. Do 1.1 first and re-measure before building anything here: 1.1 may close this
entirely, in which case 1.3 is a no-op and should be **cancelled, not implemented**.

**DONE WHEN** — either the loop is gone after 1.1 (cancel 1.3), or a measured residual justifies it.

---

## 7. PHASE 2 — make refusals legible

| # | Task | Notes |
|---|---|---|
| 2.1 | **Write the missing `factsOut` pin BEFORE flipping any flag.** `sector_offensive_launch_helpers.ts` passes an argument into the live predicate `axisHasExecutableOpeningAttack` that changes from `undefined` to an object under the flag. Traced as write-only — **but no test asserts it.** ~20 lines. | **do first** |
| 2.2 | **B-1: reason codes default-ON.** Re-pin **only** artifacts whose delta is attributable to added keys, with a diff proving zero value changes. **Never a blanket `--update`** — `apr1992_52w` has been red since 2026-08-12 and a blanket re-pin bakes that regression into the golden baseline. `test:baselines` is **not in CI**, so sign-off is a named human step. `tests/strict_null_inventory_progress.test.ts` is a hard-equality ratchet and **will** fail: that is an intended re-pin, not a CI surprise. | after 2.1 |
| 2.3 | **Wire `collectOpInjectionWarnings` into the five silent `return false` paths** in `injectQueuedOperation`. The machinery exists and already warns on two other paths. | recovers Zvezda 94's reason |
| 2.4 | **B-2: emit `launch_blocker_detail` for in-flight operations**, not only at AAR time. | |
| 2.5 | **Creation-time op-schedule emitter** — one append-only row per `buildCorpsOperation`; all five creation sites route through that factory. **AARs cannot be the durable instrument:** structurally blind to probes (62% of battles), to ops executing at t188, and to queued-but-never-injected ops like Zvezda 94 — exactly the class 2.3 exists to catch. Costs one manifest re-pin. **Do not schedule it as free.** | |
| 2.6 | **If probe-selection instrumentation is still wanted, instrument one layer down.** `sector_offensive.ts` already builds `prepEvents` carrying `force_ratio_estimate` and `intel_confidence` per op per turn and drops them at the projection. Add `ownStrength`, `enemyStrength`, `defenderFormations.length`, `accuracyFactor`. | projection change, same flag as 2.2 |

---

## 8. PHASE 3 — operation supply

### Task 3.1 — `assessThreats` is not zone-local  *(pure bug, no tuning)*

**WHY** — the inner loop iterates **every** previous zone for **each** current zone and assigns
`osidsLost = lost`, keeping whichever predecessor last had a loss. **There is no zone↔predecessor
matching at all**, despite the comment claiming *"Compare with closest matching previous zone (by
overlap)"*. Live: `vrs_1st_krajina` at t188 has all three zones `critical` with identical
`recent_losses: ["op:donji_vakuf:pribraca_2"]`. One settlement lost at Donji Vakuf marks a besieged
zone at Travnik critical, suspending a plan staged at Banja Luka — and
`ACTIVE_PLAN_STATUSES = {executing, ready}` means a suspended plan emits nothing. That corps ends the
run with 11 surplus brigades and zero operations.

**WHERE** — `src/sim/combat/commander/assess.ts`, anchor:
`grep -n "Compare with closest matching previous zone"`.

**WHAT** — match each current zone to its predecessor by `zone_id`, falling back to maximum OSID
overlap (which is what the comment already promises), then compute `lost` only against that
predecessor. **Keep `currentZoneOsids` as the union** — that part is correct and intentional: an OSID
that moved between zones has not been lost.

**BLAST RADIUS** — `threat_assessment` feeds plan suspension in `plan.ts`. Expect **more** plans to
survive, hence more operations. Interacts with 3.4: released ops still face the 0.3 floor, so this
alone may change little — which is why it lands before 3.4 and is measured separately.

**TEST** — three zones, one loses an OSID → only that zone is `critical`, the other two retain their
deficit/commitment-derived level. **MUTATION:** restore the all-zones loop → the two unaffected
zones go `critical`, test fails. **Liveness:** assert all three zones were compared.

**MEASURE** — territory-moving, 1 × 188w alone.

---

### Task 3.2 — general "queue if corps busy" rule

**WHY** — five hardcoded per-corps `queued_operations` blocks; a def skipped because its corps is
busy is dropped **before** validation, silently.

**WHAT** — when a def is skipped *because its corps is busy*, append it to `cmd.queued_operations` in
**raw `ALL_PRE_PLANNED` array order**, and emit the reason via `collectOpInjectionWarnings`. Skips
caused by **validation failure** must NOT queue — they must keep falling through inline.

**VERIFIED BEHAVIOUR-NEUTRAL:** the rule reproduces all five existing lists exactly. Note the
`vrs_herzegovina` block **does exist** — it is keyed on `injectedOperations` (operation *name*) not
`injectedCorps` (corps id), which is why a grep for the latter misses it. **Five blocks, not four.**

**HAZARDS, both screened:**
- **Must preserve raw array order; must NOT sort by `available_from`.** n1145: Donji Vakuf promoted
  to 2nd position stalled 23 turns, blocked Operation Corridor, "cascaded everywhere", reverted.
- **R28 not reintroduced.** A queue entry is a bare name string committing no brigades until
  `injectQueuedOperation` succeeds. R28's mechanism needs a *live* op in planning whose participants
  march to staging. Queuing strictly reduces that exposure.

**ALSO FIXES a live player-path hole invisible to every 188w:**
`historical_operation_authorization.ts:61` returns `not_required` when `player_faction !== faction`,
so the deferral branch is dead in calibration and live in a player game. **Declining Operation
Prijedor makes Corridor / Jajce / Donji Vakuf / Bosanski Novi cease to exist for the entire
campaign.**

**TEST** — a declined first op still allows its followers to inject; ordering matches raw array
order; a validation-failure skip does **not** queue. **MUTATION:** sort the queue by `available_from`
→ ordering assertion fails.

---

### Task 3.3 — the garrison budget has no fallback  *(re-scoped, see §3.4)*

**WHY** — **not** an unbounded multiplier; it is already `clamp(0.75 × commitment_ratio, 2.0, 5.0)`.
The defect is that a garrison budget may exceed the brigades a corps actually has, with no fallback,
pinning `can_launch_ops: false` permanently. **5 of 6 VRS corps have zero allocate-stage surplus;
0 of 5 ARBiH and 0 of 4 HVO do.**

**WHAT** — decide a policy for budget > available brigades. Options, in increasing risk: report the
deficit and allow a minimum surplus of 1 when a corps has been at zero for N turns; or make the
must-hold set itself pressure-sensitive. **Do not** simply lower the cap — that is a global
defensive nerf and it is the change most likely to trip §8.5.

**MEASURE** — after Phase 1. Territory-moving, 1 × 188w alone. **Screen against §8.5 before running.**

---

### Task 3.4 — the real-operation launch gate

**WHY** — §3.5. `estimateForceRatio` returns `trueRatio × (0.3 + 0.7 × accuracyFactor)`, bounded to
[0.3, 1.0] — it can never over-report, while its comment claims it does. It pits 2-4 participating
brigades against every standing-OG defence brigade of every facing enemy sector. Commander ops face
floor **0.3**; probes face **0.15**. Self-sealing: an op that aborts before fighting never earns the
combat intel that would let it launch.

> ### ★ 8.5 — TRIPWIRE. THIS TASK CARRIES A WITHDRAWN RECOMMENDATION, AND THE WITHDRAWAL IS BINDING.
>
> Correcting the estimation-error direction was the Corps-Commander seat's leading fix. **That seat
> withdrew it itself** under the historian constraint: **11 of the 14 blocked RS ops sit in theatres
> where the VRS should be losing.**
>
> **The historically correct VRS count after week 101 is two to three capture-capable operations in
> 95 weeks** — Goražde April 1994 (the ARBiH lost the entire southern bank; stopped by NATO
> ultimatum, not by the ARBiH) and Bihać Nov 1994-Jan 1995 (Veliki/Mali Radić retaken, five km of
> depth). **Brčko 13-20 April 1994 is a genuine zero** — a week of attacks, no gains in any
> territory. Srebrenica and Žepa do not rescue the number: canon **H1.8** owns them as events.
>
> **`op:donji_vakuf:jemanlici` and `op:bugojno:medini` are HISTORICALLY INVERTED.** The VRS was
> *defending* at Donji Vakuf, which fell to the ARBiH 7th Corps in September 1995; Bugojno was
> ARBiH-held from July 1993. **A change that flips either cell is manufacturing ahistorical VRS gains
> and improving the score for the wrong reason. It is a FAILURE, whatever it does to
> `matched_osids`.**
>
> **Do not implement 3.4 as a volume lever.** If revisited, it must be a **predictor-honesty** fix,
> tested only on whether the predictor's estimate tracks the resolver's actual outcome, with those
> two cells as a NO-GO gate.

---

## 9. PHASE 4 — the cost loop

### Task 4.0 ★ — the `degraded` / `forming` absorbing states  *(PREREQUISITE, see §3.6)*

**WHY** — §3.6. Below 800 personnel a brigade is locked out of **both** replacement paths forever,
and the 400-800 band is a death corridor with no exit. Nothing in the war pipeline restores
`'active'`. Reconstitution sets `'forming'`, which is blocked identically — so a reconstituted
brigade may be frozen at its 40% spawn strength permanently.

**WHAT** — restore `readiness` to `'active'` when personnel recovers past a threshold, **with
hysteresis** so a brigade oscillating at 800 does not flap. Suggested: degrade at `< 800`, restore at
`≥ 1000`. Exact thresholds pending OPEN-1.

**WHY IT IS A PREREQUISITE** — A-3 deliberately slows replacement. Landing A-3 on top of an absorbing
state would push many more brigades into a corridor they cannot leave, converting a rare latent bug
into a common one, and the resulting brigade losses would be misattributed to A-3.

**DONE WHEN** — no brigade in a 188w run is `degraded` while above the restore threshold, and the
count of brigades stuck below 800 for more than N turns falls.

---

### Task 4.1 — A-3 rebuild latency

**WHY** — the shock rebuild, not the steady rate. Steady-state per-turn gain is already modest
(median RBiH 52 / RS 32 / HRHB 38). `arbih_10th_mountain` at t52: 1,800 men, cohesion 100 → loses 770
(43%) → back to 1,800 men, cohesion 100 by t58.

**WHAT** — trigger: single-turn loss ≥30% of pre-battle personnel → `disrupted_turns = max(_, 3)`.
Effect: multiply `rate` by `REBUILD_LATENCY_MULT` (start 0.33) while `disrupted_turns > 0`.

> **★ PATCH BOTH SITES OR IT IS A NO-OP.** ~95% of replacement flows at reserve-draw magnitude
> (positive deltas ≥200 are only 5% / 2% / 4% of gains; modal gains 45-60 match reserve draw rates
> exactly). The two sites compute `rate` identically:
> - `formation_spawn.ts` — `rate = max(1, floor(baseRate × factionMult))`
> - `strategic_reserve.ts` — `rate = max(1, floor(baseRate × factionMult × drawMult))`
>
> **Implement as a shared helper** (`getReinforcementRateMultiplier(f)`) called by both, so there is
> one place to patch and one place to test. A test that pins only the pool site is a vacuous guard.

**SCREEN BEFORE LANDING** — a declined attack and a lost battle feed the **same** counter, so a
single-axis op can abort at `MAX_TOTAL_FAILURES_SINGLE_AXIS = 4` after four *suppressed non-attacks*.
Separate those counters first.

**WARNING TO MEASURE, NOT ASSUME** — A-3 bites RS/HVO **harder** than RBiH (RS 165 big drops vs RBiH
162, and RS has no reserve). **It may widen the asymmetry it is meant to address.** Combined with
Task 4.0 unfixed it would be actively harmful.

**SHIPS WITH A PLAYER SURFACE OR NOT AT ALL** — a "reconstituting — unavailable, N weeks" state on
`FormationDetail` and the ops-modal `BrigadeCard`. Without it the player sees an operation silently
refuse to launch and reads it as a bug rather than a cost.

---

### Task 4.2 — the strategic-reserve lane

**WHY** — `strategic_reserves`: RBiH **256,091** · HRHB **21,039** · RS **0**. Swept from every pool
above `OVERFLOW_THRESHOLD = 5000` into a faction-level pool that is **not** exhaustion-gated, **not**
decayed, **not** municipality-keyed, and **fed by territorial loss** via orphan-pool drain. **The cap
funds its own bypass:** capped-pool brigades recover 34% of the time against 3% for uncapped ones,
because a pool passes the cap *because* it overflowed. `collectStrategicReserves` does
`pool.committed += excess`, so **30.7% of RBiH's total `committed` sits in the reserve**.

**Three candidates, cheapest first. Each territory-moving. NOT a bundle:**
1. subject `strategic_reserves` to `POOL_DECAY_RATE` as pools already are;
2. stop writing overflow into `pool.committed` — it corrupts the gate denominator in the donor's
   favour;
3. gate reserve draws on a faction-level exhaustion ratio.

**SETTLE FIRST (OPEN-3):** whether the RS reserve was ever non-zero and drained, or never filled. The
t188 save shows 0 and no artifact carries a per-turn series. This decides whether the reserve is an
RBiH-specific escape hatch or a faction-neutral mechanism the RS cannot feed — and the two imply
different fixes.

---

### Task 4.3 — A-1, single-source the loss ledger  *(hygiene, demoted)*

**WHY** — `war_phases.ts` re-derives casualties at `KIA 0.30 / WIA 0.55 / ATK 0.045 / DEF 0.02`
against the real path's `0.22 / 0.74 / 0.08 / 0.06`, drops every multiplier including the ×1.6
last-stand term, and attributes a stack's losses to one named brigade — while its own comment claims
parity that holds at no constant. It re-derives for a mundane reason: written 2026-03-02, before the
per-brigade share fields existed.

**WHAT** — charge `pool.exhausted` **in the resolver at the loss sites** from raw pre-split
`killed + mia`, and delete the separate step. Precedent exists twice —
`frontline_attrition.ts:364-372` and `siege_attrition.ts:186-196` both charge at the point of loss;
the battle path is the only outlier. Attacker shares are at `attack_resolution_osid.ts:1125`
(`casShares`), applied `:1136-1156`; defender shares at `:1078`.

**CONSTRAINTS:**
- **Never source from `casualty_ledger`** — realism-scaled per faction (RBiH 0.39 / RS 0.50 / HRHB
  0.75); it would inject a faction-asymmetric charge.
- **Sort the shares `Map` with `strictCompare` before charging.** Iteration is insertion-order today
  and result-neutral; charging against a shared depletable pool makes order result-bearing, and that
  order derives from `sectorDefenseBrigades`, which is partition-dependent.
- **Expect almost no territorial effect.** `exhausted` is 3.5-8.9% of a numerator dominated by
  monotone `committed`, in pools already capped, feeding brigades drawing from a reserve the gate
  cannot see. **Adopt on mechanism, not on delta.** Do not spend a dedicated 188w ahead of Phase 1.

---

### Task 4.4 — A-2 is BLOCKED and referred to §6

**Cohesion dilution is a measured no-op.** `cohesion_drift.ts` applies the faction floor
**unconditionally, before the `next === prev` early-out**, to every non-engaged formation. The RBiH
floor is 62 from turn 52 (`faction_progression.ts`, `getRBiHCohesionFloor`: keyframes 0→35, 13→42,
26→50, 39→56, 52→62). At t188, **57 of 126 RBiH brigades sit at cohesion exactly 62**; 44% of
below-floor brigade-turns are back at the floor next turn, 71% within two.

**The cited precedent is itself dead:** `RECONSTITUTION_COHESION = 30` is *below* the RBiH floor of
62, so a reconstituted ARBiH brigade snaps back to 62 the first turn it does not fight.

⇒ **A working A-2 would be a floor change wearing a replacement-path costume.** The floors are
owner-settled modelled history (2026-08-12); this is the fourth circling of them, flagged **before**
code was written. **Do not build it.**

**If the effect is wanted, the carrier is `experience`, not cohesion** — verified: written in exactly
three behavioural places (combat gain in `attack_post_battle_effects.ts:73`, capped 1.0; two
commander-casualty losses), **no passive recovery, no floor clamp**, and a direct multiplicative term
in `basePower` via `expMult = EXPERIENCE_BASE + EXPERIENCE_SCALE × rawExp`. **Faction-asymmetric,
VRS-first**, per the Historian: the VRS replaced by cannibalization and its replacements arrived
worse (*"overage reservists and undertrained conscripts"*); the ARBiH was manpower-rich and men were
never its scarce input, so its term is small-but-not-zero.

**But `morale` — the other candidate carrier — sits inside the live §6 absorption referral. REFER;
DO NOT BUILD HERE.**

**Also settled, so it is not re-argued:** **no operation launch gate reads cohesion.**
`areParticipantsReadyForExecution` reads `status`, `personnel ≥ 500`, `disrupted_turns`, and
location. A-2 could never have unfrozen operation selection.

---

## 10. Verification

Global barriers from Master Roadmap §11 apply. RE adds:

- **Two byte-identical long scenarios** after any deterministic change.
- **A named mutation per test.** Every assertion looping over a key set carries a **liveness count**;
  a loop over an empty set is a green test that asserted nothing.
- **`strictCompare` review** on 4.3's share iteration and 2.5's fingerprint serialization
  (`stableStringify`, sorted ids — never `Object.keys()` order).
- **Focused suites, not the full run**, during work — see §4.
- **Never commit an evidence run's tree.**

---

## 11. The pre-committed decision rule

**Write into `CALIBRATION_MASTER.md` before run 1. Do not amend after seeing a number.**

> **S0 — Baseline.** No RE run starts until a clean `git_dirty:false` four-checkpoint 188w exists on
> the tree RE branches from.
> **S1 — Inertness gate.** Any step claimed inert must be byte-identical except `run_meta.out_dir`.
> Not identical ⇒ reclassified territory-moving, repriced at 3 runs.
> **S2 — Positive control.** Every instrument returns ≥1 non-zero on a case known to exist.
> **S3 — Predicted loss set, written FIRST.** Name faction, mechanism, and the OSIDs the fix *should*
> cost. **Adopt only if ≥2/3 of actual losses fall inside the predicted set.**
> **S4 — Bands, per checkpoint:** **0 to −3** jitter, decide on mechanism · **−4 to −10**
> unattributable, requires a schedule-fingerprint diff; if ≥20% of ops differ in creation turn the
> number told you nothing · **−11 to −25** real signal, adoptable only with S3 satisfied · **worse
> than −25 on any checkpoint** STOP, owner decision.
> **S5 — Tripwires override any score.** All four anchor sets (31/32/40/31); the enclave guard
> (Srebrenica/Žepa fall; Goražde/Bihać/Teočak/Sarajevo core hold); the western-Bosnia cascade
> (Grahovo 4/4, Šipovo 5/5, Glamoč 6/6, Sanski Most 10/10); **and §8.5.**
> **S6 — THE DISCRIMINATOR IS LOCATION, NOT MAGNITUDE.** Fix-right ⇒ losses cluster on the
> mechanism's causal path. Fix-wrong ⇒ losses scatter. **Never adopt or reject on the count.**

**The real gate is four per-checkpoint hard minimums** — `jan1993` 674 / `apr1994` 660 / `apr1995`
659 / `oct1995` 644 — with **3-6 OSIDs of headroom**, not 622's apparent +28. When a run fails it:
record it as evidence, present the *explained* loss set to the panel, and if accepted the **owner**
re-blesses by hand-edit with a written note. **Never `--force`, never blanket `--update`, never
disable.**

---

## 12. Risk register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | **Phase 1 redistributes probes rather than reducing them**, so casualties and the 62% barely move | **Unknown — OPEN-2** | Measure before claiming volume. Fidelity is the defensible claim today. |
| R2 | **A-3 lands on the absorbing state** and mass-kills RS/HVO brigades | High if 4.0 is skipped | 4.0 is a hard prerequisite |
| R3 | **A fix flips Donji Vakuf or Bugojno** and the score improves for the wrong reason | Moderate on 3.3/3.4 | §8.5 tripwire, checked every run |
| R4 | **A blanket baseline re-pin** bakes in the red `apr1992_52w` regression | Moderate on 2.2 | Re-pin only attributable artifacts, with a zero-value-change diff |
| R5 | **Codex file collision** on `sector_offensive.ts`, `pre_planned_operations.ts`, `operation_preparation.ts` | **High — all three are in-flight now** | RE starts only after Codex lands; own worktree; rebase before each task |
| R6 | **Measuring against a baseline nobody has** — the tree's apr1994/apr1995/oct1995 are NOT ESTABLISHED | Certain today | S0 blocks all work until 0.3 |
| R7 | Phase 1 and 3.1 both change operation volume; **landed together they are unattributable** | Moderate | One change per run, always |

---

## 13. Open questions — owners and status

| # | Question | Owner | Status |
|---|---|---|---|
| **OPEN-1** | Is `degraded` a one-way ratchet into dissolution, and is it the root of the RS brigade-destruction asymmetry? Does 4.0 have to precede A-3? | Formation seat | **out for measurement** |
| **OPEN-2** | Does Phase 1 reduce probe volume and casualties, or only redistribute targets? | Calibration seat | **out for measurement** |
| **OPEN-3** | Was the RS strategic reserve ever non-zero and drained, or never filled? | Formation seat | not started — decides 4.2's shape |
| **OPEN-4** | How much of the 62% is attributable to cadence vs target availability? | Calibration seat | folded into OPEN-2 |

---

## 14. Owner decisions, not tasks

| # | Decision | Recommendation |
|---|---|---|
| 14.1 | **Terrain-blind planner (D).** Six sites; panel unanimous-REFINED (no clean GO ⇒ escalates). `terrain_friction_index` is byte-identical to `slope_index` in 6,137/6,137 settlements — **must not be bundled**. | **Defer until Phase 4 lands**, with the reason recorded. Ship the fail-loud terrain loader regardless. |
| 14.2 | **A-2 → §6 referral.** The only non-inert carrier is `morale`, inside the live absorption referral. | Refer; do not build. |
| 14.3 | **Mobilization ceilings.** 25%/50% of military-age males is **4-5× and 9-10× above the worst national reality** (1.3-1.5% of population dead ≈ 5-6% of MAM). | Do **not** lower onto a KIA-only term. The real drain was desertion, draft evasion, work deferments and refugee flight — and the VRS recorded **36,543 disabled against 18,543 dead**, so a killed+missing gate measures a third of the sink. Design pass needed. |
| 14.4 | **Decrementing `committed` on permanent loss.** Correct ledger semantics, but **releases 66 capped pools back into mobilization** — a large move in the *opposite* direction from RE's intent. | Own lane, never bundled. |
| 14.5 | **Petkovci §6 referral.** The engine holds an ICTY-documented July 1995 execution site in Serb-controlled Zvornik municipality as ARBiH ground. | **Separable and urgent.** Should not wait on RE. |

**Minor tickets, verified:** `sector_offensive.ts` omits the `op.force_launch !== true` check at the
first of three abort gates, so a player force-launch is silently overridden.
`getEligiblePopulationCount` must read `by_mun1990_id`, not `by_municipality_id` — the latter is
post-1995 keyed and collides on merge (Gradačac reads 43 Bosniaks). The `probe_complete` check in the
officer-defeatism block is dead code (that block is `sector_attack`-only).
