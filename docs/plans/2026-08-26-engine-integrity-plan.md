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

### 0.1 ★ ORDER OF WORK — ASK THE DOMAIN OWNER BEFORE YOU WRITE THE CLAIM

**This plan was built in the wrong order and it cost roughly twenty-one wrong claims.** The evidence
packet was written first and eight seats were asked to review it. Every error originated in the
writing phase; every catch came from the review phase. The Formation seat needed **one question** to
find `formation_lifecycle.ts:364`; had it been asked before §3.6 was written rather than after, that
section would never have existed.

The domain skills already say this — `formation-expert` says it must be consulted **before** changes
to formation lifecycle, `operations-expert` **before** changes to operations. Consulting them after
writing claims about their domain inverts the contract.

**So, for every task below:**
1. **Ask the owning seat the question. Do not send them a draft to audit.** Same agent budget,
   opposite order. Owners: Phase 1/3 → `operations-expert` + `corps-army-commander`; Phase 4 →
   `formation-expert`; anything scored → `scenario-creator-runner-tester`; anything historical →
   `historian`.
2. **Never state a code fact without the command that produced it.** Write
   `` `git grep -n "<pattern>"` → N hits `` beside the claim. A narrow lookup then shows as a narrow
   lookup, on the page, to you and to every reviewer.
3. **A negative result needs a positive control.** Before writing "nothing does X", find something
   that *does* do X and confirm your lookup catches it. napkin `00`: a probe that cannot fail is
   indistinguishable from one that works.
4. **Run `node tools/hooks/whowrites.mjs <field>` before hanging any mechanic on a field** (§3.7).

**Three of these are now enforced mechanically, not by memory** — see `tools/hooks/README.md`. They
exist because the written rules already existed, were read at session start, and did not fire.

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

### 3.2 The probe cooldown holds for the median probe and FAILS OUTRIGHT for short ones — and it is NOT the volume lever either

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

### 3.6 ★ FALSIFIED — `readiness` is NOT an absorbing state. I was wrong, and how I got it wrong matters.

**The orchestrator claimed** that `degraded` is a one-way ratchet into dissolution and a candidate
root for the RS brigade-destruction asymmetry, on the grounds that nothing in the war pipeline ever
restores `'active'`. **The Formation seat falsified it with 232 counter-examples.**

**The exit I missed:** `src/state/formation_lifecycle.ts:364`, inside `updateFormationLifecycle`:

```ts
formation.readiness = deriveReadinessState(formation);
```

Unconditional, every formation, every turn — and `updateFormationLifecycle` **is** in the war
pipeline (`war_phases.ts:1194`, step `'update-formation-lifecycle'`).

> **★ THE METHOD ERROR, recorded because it will recur.** I searched for the literal string
> `readiness = 'active'`. **This path assigns a function result, so the literal never appears.**
> A grep for an assigned *value* cannot find an assignment of a *computed* value. When asking "does
> anything restore field X", grep for **`X =`** and read every hit, not for `X = <expected value>`.

**And `deriveReadinessState` reads cohesion and fatigue only — never personnel**
(`formation_lifecycle.ts:186-208`): `degraded` if `cohesion < 15` or `fatigue > 40`; `overextended`
if `cohesion < 30` or `fatigue > 20`; `forming` if `activation_gated`; else `active`.

**So the personnel-triggered `degraded` write at `battle_resolution.ts:753-755` is overwritten on the
next turn's lifecycle step, by a function that cannot see the personnel value that caused it.**

**The punchline lands on the ruling we have now circled four times:** every faction cohesion floor
sits **above** `DEGRADED_THRESHOLD = 15` — RBiH 62, HRHB 30, RS 20. **The cohesion floors make it
structurally impossible for a brigade of any faction to remain `degraded` on cohesion.** Only
`fatigue > 40` can hold it there.

Measured, per brigade-turn below 800 personnel, recomputed from logged cohesion/fatigue:

| faction | brigade-turns < 800 | active | overextended | **degraded** |
|---|---:|---:|---:|---:|
| RBiH | 3,779 | 99.4% | 0.5% | **0.1%** |
| RS | 3,579 | 48.3% | 51.7% | **0.1%** |
| HRHB | 671 | 96.9% | 2.5% | **0.6%** |

`overextended` does **not** block reinforcement. **Zero brigades are stored `degraded` at t188. Zero
stored `forming`.** And 92% of ARBiH brigades went below 800 at some point, of which **98% came back**
(169 downward crossings, 167 followed by recovery).

⇒ **Task 4.0 is deleted. There is no prerequisite. A-3 stands alone.**

⇒ **The RS asymmetry is re-explained, and better:** **20 of 24 RS brigade destructions fall in the
t171-t174 window** — `nato_deliberate_force_1995`, `federation_ground_offensive_1995`,
`operation_summer_95`, `operation_storm_1995`. Week 174 from April 1992 is early August 1995; Storm
was 4-7 August 1995. **That is modelled history, correctly dated — the same class as the cohesion
floors, and it should not be touched.** What still needs explaining is RBiH's zero, and that is the
ungated 256,091-man strategic reserve (§9, Task 4.2), not a destruction mechanism.

### 3.7 ★ THE RULE THIS REPO KEEPS RELEARNING — check it before writing any mechanic

**A field owned by a per-turn recompute cannot carry a persistent penalty.** Three instances in this
single review:

| proposed mechanic | field | the recompute that erases it |
|---|---|---|
| A-2 cohesion dilution | `cohesion` | `cohesion_drift.ts:170-186` faction floor clamp, applied unconditionally before the `next === prev` early-out |
| A-3 hung on `readiness` (**the obvious way to build it**) | `readiness` | `formation_lifecycle.ts:364` `deriveReadinessState`, unconditional, every turn |
| consolidation-sweep gate (2026-08-25) | `to_control` | the field reads `'controlled'` for every municipality in the game |

**MANDATORY PRE-IMPLEMENTATION CHECK for every task in this plan:** before hanging a mechanic on a
field, `git grep -n "<field> ="` across `src/` and identify **who rewrites it every turn**. If a
per-turn pass owns it, the mechanic is a no-op you will not see in the result — the most expensive
failure mode in this repo, because it costs a 188w run to discover and looks like a design failure
rather than a plumbing one.

**A-3 survives this test only because `disrupted_turns` has no per-turn recompute** — it is
decremented by its own owner (`brigade_movement_orders.ts:85`) and cleared by reconstitution. The
Formation seat notes this was "luck as much as judgement" and flags it explicitly so an implementer
does not "simplify" A-3 onto `readiness` and silently rebuild the no-op.


---

## 4. Setup — do this first

```powershell
# 1. RE branches from a CLEAN four-checkpoint pin, never from the shared tree.
#    Precondition: Codex has landed the January lane and a git_dirty:false 188w exists.
# WARNING: `git worktree add` on this repo CAN TIME OUT MID-CHECKOUT, leaving a partial tree whose
#   INDEX IS MISSING ENTRIES. Committing from it records those files as DELETED -- this happened on
#   2026-08-26 and silently removed 4,978 files from a branch before it was caught.
#   If you create one: verify `git -C <wt> ls-files | wc -l` matches the main tree BEFORE any commit.
#   For DOC-ONLY edits skip the worktree entirely and use an ISOLATED INDEX -- it cannot touch another
#   agent's checkout and has no partial-checkout failure mode:
#     export GIT_INDEX_FILE=/tmp/re.index && git read-tree <branch>
#     git update-index --add --cacheinfo 100644,$(git hash-object -w --path <p> <p>),<p>
#     git commit-tree $(git write-tree) -p <branch> -F msg   # then git update-ref
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
| 0.5b | **Write `last_probe_turn` on `CommanderState` — INERT, written but never read.** Task 1.2 needs this field; landing the schema here, proven inert in Phase 0's identity run, means any failure at 1.2 is unambiguously **behavioural** rather than a migration fault. **Acceptance, pre-committed:** every artifact byte-identical **except `final_save.json`, which differs only by the added key** — plus one golden re-pin. A new serialized key moves `final_state_hash` without moving behaviour; **do not let a moved hash be read as a behavioural change** — that is the same trap B-1 carries. | added key only, zero value differences |
| 0.6 | **Name-collision assertion test.** Zero collisions today (112 pool names vs 27 authored) but `operation_names.ts:71` carries `'Operacija Lukavac'` against an authored Lukavac 93, and the file records a prior Stupčanica-95 collision. | Test present and green. |

> **Why 0.2 ships reported-not-gated.** The corrected predicate reads **`dead_ops` 11 against a
> ceiling of 6** and **axis-scoped `zero_eligible_ops` 13 against 3** — both RED — while the shipped
> gate reads green against 11 of 45 operations with zero attacks. Blessing 11/13 as the ceiling now
> would ratchet the defect in as the floor. Promote to a hard ceiling only after Phase 3.

---

## 6. PHASE 1 ★ — probe memory

> ### ⚠ MEASURED: PHASE 1.1 BUYS FIDELITY, NOT VOLUME. SAY SO.
>
> The counterfactual was replayed offline against `n294` by the calibration seat. **Probe volume does
> not fall materially — it MOVES.**
>
> | | faithful op-end rule |
> |---|---:|
> | probe battles suppressed at their own target | **57 / 365 (15.6%)** |
> | of those, an alternative adjacent enemy OSID existed | 31 |
> | **no alternative existed → genuinely removed** | **25 / 365 = 6.8%** |
> | **redistributed to another cell** | **31 / 365 = 8.5%** |
> | attacker casualties in suppressed battles | 22,982 (10.8% of the run's 213,308) — **at most ~10,000 actually disappear** |
>
> **What it DOES buy, and this is worth having:** the pathological single-cell loops break.
> `op:centar_sarajevo:radava` 26 probe battles → 11. `op:visoko:gornja_vratnica_2` 39 → 27.
> `op:gradacac:pelagicevo` 24 → 15.
>
> **What it does NOT fix:** `op:lukavac:brijesnica_donja_2` — **12 probe battles, zero wins, 7,866
> attacker casualties** — is untouched, because its probes are spaced too widely to reach two
> failures inside the 8-turn window.
>
> ### ★★ AND NEITHER IS TASK 1.2. THE WHOLE OF PHASE 1 IS NOT AN ATTRITION FIX.
>
> The calibration seat corrected its own earlier finding after I promoted 1.2 on it. The
> "cooldown breached 22.9% of the time" figure is a count of **re-emissions, not of volume** — and
> the breaching ops are the *short* ones, which is *why* they breach, so they carry ~1 battle each:
>
> | | n | share |
> |---|---:|---:|
> | probe ops starting inside a breached cooldown | 43 / 200 | 21.5% |
> | **probe BATTLES they carry** | **41 / 373** | **11.0%** |
> | **attacker casualties in them** | **18,435 / 131,577** | **14.0%** |
>
> **So 1.2's ceiling is ~11% of probe battles — roughly the same size as 1.1, not an order above it.**
> Combined ceiling for 1.1 + 1.2 ≈ 18% of probe battles ≈ 11% of all battles.
>
> **THE VOLUME LEVER IS THE EMISSION GATE, AND IT IS IN NEITHER TASK.** Median idle gap between one
> probe ending and the next starting is **1 turn**; 108 of 188 re-emissions happen the very next
> turn; probes are 62.4% of all battles and have captured **zero** ground in 188 weeks. That is
> Task 1.3 or beyond. **If this programme needs an attrition fix, Phase 1 is not it** — do not let
> that get discovered after two runs.
>
> **DO NOT SELL PHASE 1.1 AS AN ATTRITION FIX.** The attrition is cadence-driven, not
> target-driven: the median idle gap between one probe ending and the next starting is **1 turn**,
> and 57.4% of probes start the very turn the previous one clears. If volume reduction is the goal,
> the lever is **Task 1.2** or the emission gate — not 1.1.
>
> **And a skipped probe is not a deferred probe.** When the cooldown filter empties the candidate
> list, `if (probeObjectives.length > 0)` skips emission entirely — **no op is pushed and no cooldown
> is consumed**, so the corps may re-emit next turn. That is exactly the 25 no-alternative cases.

### ★ ORDER WITHIN PHASE 1: 1.1 → 1.2 → 1.3. Confirmed by the calibration seat.

**The orchestrator's original rationale for this order was WRONG and has been removed.** It argued
that landing 1.2 first would "spend" 1.1's pre-registered prediction. It would not: the calibration
seat wrote and ran the counterfactual replay **three times in one session off existing artifacts, at
~10 minutes and zero runs**. Recomputation is cheap. The claim is deleted rather than softened,
because a reviewer would have found it.

**The order survives on two arguments that are stronger, and neither is mine:**

**(1) Recomputation is unavoidable for whichever task goes second — so the only question is which
prediction is worth more un-recomputed.** 1.1's is **per-cell falsifiable**: radava 26→11,
gornja_vratnica_2 39→27, pelagicevo 24→15, gojcin_2 24→22, and **brijesnica_donja_2 12→12**. 1.2's is
a coarse aggregate (~11% fewer probe battles) with no per-cell structure and therefore almost nothing
to falsify. **Burn the coarse prediction on recomputation; keep the sharp one pre-registered.**

**(2) ★ 1.1-first is the cheapest available test of the INSTRUMENT the rest of Phase 1 rests on.**
The counterfactual is an *offline model of the engine*, not the engine. If radava does not land near
11, the replay model is wrong — **and every number underneath 1.2, including the 11% ceiling above,
comes from that same model.** Landing 1.1 first buys one run's validation of the instrument before
the plan spends further runs trusting it. Land 1.2 first and you find out late, with a re-rolled
campaign in the way.

**(3) Small perturbation before large.** 1.1 removes ≤25 probe battles. 1.2 removes ~41 **and shifts
43 operation start turns**, which under this repo's own ±10 attribution rule re-rolls the schedule. A
6.8% signal measured on top of a re-rolled campaign is unreadable; the reverse is not.

*Tertiary, do not lead with these:* 1.2 carries a save migration and 1.1 does not; 1.3's
cancel/proceed decision depends on 1.1's result.

**They must be measured separately regardless of order** — 1.1 changes WHICH cell a probe targets,
1.2 changes HOW OFTEN one is emitted. Landed together their effects are unattributable, and nothing
in the artifacts separates "never launched because its target was blocked" from "never launched
because the cooldown held."

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

**MEASURE** — territory-moving. One 188w **alone**, against §11.
**Predicted loss set (§11 S3), stated in advance and measured, not guessed:** the 51 OSIDs that
currently receive probe battles, concentrated in the top ten (188 of 365 probe battles, 51.5%). The
probe channel is **252/365 ARBiH**, so losses should be ARBiH-side and adjacent to existing probe
targets. **If losses appear away from those 51 cells, S3 fails and the change is not doing what this
plan says.**

**DONE WHEN** — `op:centar_sarajevo:radava` falls from 26 probe battles toward ~11 and
`op:visoko:gornja_vratnica_2` from 39 toward ~27, with no objective receiving more than
`OBJECTIVE_FAILURE_THRESHOLD` fought-probe attacks inside `OBJECTIVE_FAILURE_COOLDOWN_TURNS`.
**Do not expect total probe count to move more than ~7%.**

---

### Task 1.2 — repair the probe cooldown  *(CORRECTNESS fix with a modest volume dividend — NOT the volume lever; see §6 header)*

**WHY — and my §3.2 claim was wrong.** I wrote that the dead `operation_history` scan "costs about one
turn" because a probe is visible in `active_operations` for ~3 of the 4 cooldown turns. **That holds
only for the median-length probe.** Measured probe-op lifetimes: `{2: 45, 3: 19, 4: 85, 5: 35, …}` —
**64 of 200 probe ops (32%) live 3 turns or fewer.** For those, `active_operations` is empty before
the 4-turn window closes and **nothing else remembers the probe at all.**

**Measured consequence: the cooldown is breached 22.9% of the time.** 43 of 188 consecutive same-corps
probe starts are **less than `PROBE_COOLDOWN_TURNS = 4` apart** — impossible if it were enforced — and
**42 of those 43 immediately follow a probe that lived ≤3 turns.** For compliant pairs the previous op
lasted 4+ turns in 128 of 145 cases. The correlation is not subtle.

⇒ **The dead scan does not cost one turn; it voids the cooldown outright on a third of probes.** The
effective cooldown is ~3.1 turns against a nominal 4, and this is the cadence lever the counterfactual
says Phase 1.1 is not.

**WHERE** — `src/sim/combat/commander/emit.ts:1067`. Anchor:
`grep -n "previous_state?.operation_history ?? \[\]"` inside the `probe.cooldown` thunk.

**WHAT** — **do not** start writing `type: 'probe'` rows into `operation_history`. That log records
*plan* decisions keyed `cmd_<corps>_t<turn>`, feeds `buildUpdatedLessons`, and drives plan.ts
repeat-failure detection via `osids_lost`; polluting it with probe rows is a behaviour change in a
system nobody has scoped.

**Carry an explicit `last_probe_turn?: number` on `CommanderState`**, written when a probe operation
is created and read by the cooldown thunk alongside the existing `active_operations` scan. This closes
the short-probe hole without touching the plan-decision log.

**BLAST RADIUS** — adds a serialized field ⇒ **save migration required** (`save_migration.ts`, default
`undefined`; absent means "no probe recorded", which is the correct cold-start behaviour). No other
consumer.

**TEST** — (1) two probes 3 turns apart where the first lived **2 turns** → second suppressed. This is
the case that fails today and is the whole point. (2) 5 turns apart → allowed. (3) round-trip a save
with the field set and assert it survives. **MUTATION:** remove the write → case (1) goes green-wrong,
i.e. the second probe emits; the test must catch that.

**MEASURE** — territory-moving, 1 × 188w alone. **Expected direction: fewer probes.** This is the task
to measure probe-volume reduction against, not 1.1.

**SEQUENCING NOTE** — 1.1 and 1.2 are independent and must be measured separately: 1.1 changes *which*
cell a probe targets, 1.2 changes *how often* a probe is emitted. Landed together their effects are
unattributable, and they are the two halves the counterfactual explicitly separates.

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

### Task 4.0 — ~~absorbing states~~ **CANCELLED (hypothesis falsified, §3.6)**

**Do not implement. There is no prerequisite for A-3.** The orchestrator's ratchet hypothesis was
falsified with 232 counter-examples: `formation_lifecycle.ts:364` recomputes `readiness` every turn
for every formation, `deriveReadinessState` never reads personnel, and every faction cohesion floor
sits above `DEGRADED_THRESHOLD = 15`. **Zero brigades are stored `degraded` or `forming` at t188.**

**OPTIONAL CLEANUP, LOW value, do not give it its own run.** The personnel-triggered write at
`battle_resolution.ts:753-755` is incoherent — a personnel-triggered readiness change owned by a
personnel-blind recompute — and its only live effect is to block reinforcement for the remainder of
the same turn (~282 brigade-turns across the whole run, worth ~50-400 men each). **Deleting it makes
`deriveReadinessState` the single owner of readiness, which it already effectively is.** If taken,
ride an existing 188w; never claim a dedicated one.

**REJECTED, and recorded so it is not re-proposed:** adding a personnel term to
`deriveReadinessState`. It is territory-moving, touches every brigade every turn, needs hysteresis
(replacement delivers ~42-69 men/turn, so a single 800 threshold flaps weekly), and the corridor
census shows **the RS would absorb the entire cost of it, on top of Storm.** Not before 1.0.

**Memory item to rewrite** (`rs_brigade_destruction_asymmetry_engine_flaw`): *"RS destruction is
event-concentrated (20 of 24 in the t171-t174 Deliberate Force / Summer 95 / Storm window — modelled
history, correctly dated); RBiH survival is reserve-driven (256,091-man ungated strategic reserve,
99% of 169 sub-800 crossings recovered). The degraded-ratchet hypothesis was tested against n294 and
FALSIFIED."* Open remainder, INFERRED and untested: whether RBiH would show comparable destruction
under an equivalent scheduled catastrophe. Nothing on disk tests that.

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

## 9.5 Sequencing, parallelism, and cost

*(This section was LOST in the v3 restructure and is restored here. Its absence was found by grepping
the plan for its own guidance and getting zero hits -- worth repeating as a habit.)*

**Order:** Phase 0 (free) -> **Phase 1 (1.1 -> 1.2 -> 1.3)** -> Phase 2 (legibility) -> Phase 3
(operation supply) -> Phase 4 (cost loop) -> Phase 5 (owner decisions).

**Run cost, honest: ~8-10 x 188w = ~10 hours**, down from ~12-14 after the calibration seat identified
two safe bundling shapes. Plus machine contention with Codex. A `--weeks 39` run is ~15 min but
scores jan1993 only and is blind to Phase 1/3 effects, which compound after w100.

### BUNDLING -- safe in exactly two shapes, and nowhere else

**The rule, stated so it generalises: bundling is safe iff the acceptance criterion is BINARY, never
a magnitude.** You never have to attribute a number, so nothing is lost.

**Shape A -- bundle every provably-inert change into ONE identity run.** Phase 0's 0.1 + 0.2 + 0.5b,
plus Task 2.1. The criterion is byte-identity: the bundle passes and every member is proven inert, or
it fails and you split and re-run. **Saves ~3 runs (~3.5 h).** This is the one place the
one-change-per-run rule was genuinely over-strict.

**Shape B -- one behavioural change plus any number of STATICALLY-UNREAD emissions.** Task 2.6's
probe-selection instrumentation may ride with Task 1.1, because "unread" is a **static** property
verified by grep, not a measured one. **Requirement: the reader-count grep must return zero and be
recorded in the packet** -- the way `failed_offensive_objectives` was verified to have exactly one
reader (section 3.1). **Saves ~1 run.**

**NOWHERE ELSE. Never two behavioural changes** -- not 1.1+1.2, not 1.2+1.3, not any Phase-1 item
with any Phase-2 item. **Stop looking for further savings; there are none**, and the repo carries a
documented n747 four-fix bundle that cost more in lost attribution than it saved in runs.

### Parallelism with Codex -- decisive

| Codex lane class | Carries over? | Action |
|---|---|---|
| Painted-reference repaints, `init_control` corrections | **YES** -- a correctly painted cell is correct under any engine | continue unimpeded |
| Op-objective, axis, timing, roster lanes | **NO** -- their deltas are measured against combat behaviour Phases 1-4 change globally | stop, or bank as "re-measure after RE" |

**Precondition:** Codex lands a clean `git_dirty:false` four-checkpoint pin; RE branches from *that*.
There is currently **no four-checkpoint measurement of the working tree** -- every post-retraction run
is `--weeks 39`, so apr1994/apr1995/oct1995 are **NOT ESTABLISHED**.

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
> **S3a — the prediction is a COMMITTED ARTIFACT and the check is mechanical.** Write it to a file and
> commit it; the run's `run_meta.provenance.git_commit` must be a **descendant** of the prediction's
> commit. Two lines, fail-closed, same shape as the existing run-provenance binding. **An
> uncommitted prediction does not count as a prediction.**
> **S3b — ★ every prediction MUST name a NEGATIVE CONTROL: at least one cell predicted NOT to move.**
> A prediction made only of positives can absorb any outcome; one carrying a negative control dies if
> the negative moves. **This is the amendment that actually closes S6's loophole.** Task 1.1 already
> has one by luck — `op:lukavac:brijesnica_donja_2`, 12 probe battles, 0 wins, predicted **unchanged**.
> **S4 — Bands, per checkpoint:** **0 to −3** jitter, decide on mechanism · **−4 to −10**
> unattributable, requires a schedule-fingerprint diff; if ≥20% of ops differ in creation turn the
> number told you nothing · **−11 to −25** real signal, adoptable only with S3 satisfied · **worse
> than −25 on any checkpoint** STOP, owner decision.
> **S5 — Tripwires override any score.** All four anchor sets (31/32/40/31); the enclave guard
> (Srebrenica/Žepa fall; Goražde/Bihać/Teočak/Sarajevo core hold); the western-Bosnia cascade
> (Grahovo 4/4, Šipovo 5/5, Glamoč 6/6, Sanski Most 10/10); **and §8.5.**
> **S6 — CONDITIONAL. Pre-registration is what buys the right to argue from mechanism.**
> **Where S3 was satisfied** — predicted set committed before the run, including at least one
> negative control — the discriminator is the **LOCATION** of the losses, not their magnitude: adopt
> if ≥2/3 of losses fall inside the predicted set **and no negative control moved**.
> **Where S3 was NOT satisfied, S6 does not apply and the S4 bands are binding on the count alone.**
>
> *(Amended after a canon reviewer attacked the original wording — "never adopt or reject on the
> count" — as unfalsifiable: any loss set has some story, and a seat motivated to ship will find one.
> The calibration seat agreed and declined to defend it. The hole was real: nothing mechanically
> enforced S3, so S6 was an unconditional escape hatch. It is now a reward for pre-registering.)*

**The real gate is four per-checkpoint hard minimums** — `jan1993` 674 / `apr1994` 660 / `apr1995`
659 / `oct1995` 644 — with **3-6 OSIDs of headroom**, not 622's apparent +28. When a run fails it:
record it as evidence, present the *explained* loss set to the panel, and if accepted the **owner**
re-blesses by hand-edit with a written note. **Never `--force`, never blanket `--update`, never
disable.**

---

## 12. Risk register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | **Phase 1.1 redistributes probes rather than reducing them** | **CONFIRMED — measured** | Resolved: 1.1 is a fidelity fix (≤6.8% volume). **Task 1.2 is the volume lever.** Plan restated; do not re-sell 1.1 as attrition. |
| R2 | **A-3 is built on `readiness` and is silently a no-op** — the obvious way to build it | **High** | §3.7 mandatory pre-implementation check. A-3 must use `disrupted_turns`, which no per-turn pass recomputes. |
| R3 | **A fix flips Donji Vakuf or Bugojno** and the score improves for the wrong reason | Moderate on 3.3/3.4 | §8.5 tripwire, checked every run |
| R4 | **A blanket baseline re-pin** bakes in the red `apr1992_52w` regression | Moderate on 2.2 | Re-pin only attributable artifacts, with a zero-value-change diff |
| R5 | **Codex file collision** on `sector_offensive.ts`, `pre_planned_operations.ts`, `operation_preparation.ts` | **High — all three are in-flight now** | RE starts only after Codex lands; own worktree; rebase before each task |
| R6 | **Measuring against a baseline nobody has** — the tree's apr1994/apr1995/oct1995 are NOT ESTABLISHED | Certain today | S0 blocks all work until 0.3 |
| R7 | Phase 1.1, 1.2 and 3.1 all change operation volume; **landed together they are unattributable** | Moderate | One change per run, always. 1.1 changes WHICH cell; 1.2 changes HOW OFTEN. |
| R8 | **A mechanic is hung on a field a per-turn pass owns**, and dies silently | **High — three instances already** | §3.7 check is mandatory before writing any mechanic |

---

## 13. Open questions — owners and status

| # | Question | Owner | Status |
|---|---|---|---|
| **OPEN-1** | Is `degraded` a one-way ratchet and the root of the RS asymmetry? | Formation seat | **CLOSED — FALSIFIED.** §3.6. Task 4.0 cancelled. |
| **OPEN-2** | Does Phase 1.1 reduce probe volume or redistribute it? | Calibration seat | **CLOSED — redistributes.** ≤6.8% removed, 8.5% moved. Task 1.2 promoted. |
| **OPEN-3** | Was the RS strategic reserve ever non-zero and drained, or never filled? | Formation seat | **OPEN** — decides Task 4.2's shape |
| **OPEN-4** | Of the 31 "alternative existed" suppressions, how many actually redistribute? `predictedViable` and `politicallyBlocked` are not reconstructible from artifacts, so the true volume drop lies in **[6.8%, 15.6%]** of probe battles. | Calibration seat | **OPEN** — needs the Phase 2 instrumentation, not another replay |
| **OPEN-5** | Would RBiH show comparable brigade destruction under an equivalent scheduled catastrophe? | Historian + Formation | **OPEN** — nothing on disk tests it |

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
