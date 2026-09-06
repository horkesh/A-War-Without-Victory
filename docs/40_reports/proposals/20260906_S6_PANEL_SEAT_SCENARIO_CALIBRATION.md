# §6 Panel — SCENARIO-TESTER / CALIBRATION seat

**Date:** 2026-09-06 · **Authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md:213`
**Scope of this seat:** cost and measurability. Not history.
**Evidence base:** `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390/` (`final_save.json`,
`weekly_report.jsonl`, `control_delta.json`, `brigade_temporal_log.jsonl`), the six catalog files under
`data/scenarios/events/`, `tools/verify_checkpoints.cjs`, `tools/op_schedule_diff.cjs`,
`docs/40_reports/CALIBRATION_MASTER.md:325-395`.
**No code, data, or canon was changed. No run was executed.**

---

## VERDICTS

| Item | Verdict |
|---|---|
| **P1 — Ahmići gate** | **COMPLIANT** |
| **P2 — Srebrenica/Žepa dating** | **COMPLIANT**, on one hard condition (§P2-b). Narrowing `turn_max` in the same change is **NON-COMPLIANT** from this seat. |
| **Overall** | **GO** — repair work on P1 and P2 may proceed to a plan. |

---

## P1 — the Ahmići gate

### (a) What moves if it fires — MEASURED from the definition

`ahmici_massacre_1993` (`data/scenarios/events/war_1993.json`) carries, in full:

- `effect`: `humanitarian_impact` HRHB `war_crimes_delta: 3`
- `effects[0]`: `negotiation_capital` HRHB `international_credibility -25`
- `effects[1]`: `narrative`
- **no `control_change`, no `sets_flags`, no `casualties`, no `equipment_grant`, no `supply_delta`,
  no `aggression_modifier`, no `offensive_ops_suppression`, no `enclave_formation_displacement`,
  no `response_options`.**

**It cannot touch territory or casualties directly.** It is not informational either — one write is
live. Tracing all three:

1. **`war_crimes_delta: 3`** → `apply_effects.ts:107-108` → `applyHumanitarianImpact` → `:364`
   `capital.HRHB.war_crimes_events += 3`. Four consumers:
   - `patron_pressure.ts:235-236` — `override_authority += min(MAX_WAR_CRIMES_OVERRIDE=15,
     events × WAR_CRIMES_OVERRIDE_PER_EVENT=5)`. **Saturates at 3 events.** MEASURED firing order in
     this run: `sovici_doljani_attack_1993` w54, `east_mostar_siege_1993` w57,
     `hvo_detention_camps_1993` w63 — HRHB is at or past 3 events by w63 with or without Ahmići, and
     ends at **18**. So the term differs only across **w54-w62**, and is identical from w63 to w188.
     Downstream readers (`washington_agreement.ts:237-240`, P3 threshold 50;
     `dayton_negotiation.ts:114,341,383,731`) all bind after saturation. No peace-plan decision falls
     inside w54-62 (Vance-Owen ~w39, Owen-Stoltenberg ~w70).
   - `strategic_dimensions.ts:92-97` — `international_standing = clamp(50 − warCrimes×10 − civCas/5000 …)`.
     HRHB −30 across the same w54-62 window, clamped to 0 either way from w63. Its one combat consumer,
     the op-launch hesitation channel (`sector_offensive.ts:262-376`, `emit.ts:865-878`), is
     **turn-gated: `INTL_STANDING_OPS_HESITATION_MIN_TURN = 100`** (`sector_offensive.ts:373`), and the
     multiplier is a byte-stable `1.0` no-op before it. **The entire window in which the value differs
     lies before the gate.** Provably inert on ops.
     The one catalog consumer of HRHB `international_standing` in that window,
     `csq_political_split_temporary` (`consequences.json`, `turn_min: 50`, `dimension_below … 45`), is
     **already dead** on a sibling conjunct — `flag_at_least cumulative_casualties_x100_HRHB ≥ 35`, one
     of the 32 orphan flags of D4. No coupling.
   - `scoring.ts:268-284` (atrocity sub-score) — **EMERGENT-GATED** (`scoring.ts:302-303`). Calibration
     runs are `meta.decision_mode: 'historical'` (MEASURED in `final_save.json`), so this is inert in
     every calibration run. In an emergent player run it is live and grade-relevant, which is the
     intended behaviour, and it does **not** touch `war_crimes_events_emergent` (`scoring.ts:159` states
     scripted `humanitarian_impact` never does), so the `authorized_cleansing_condemnation` flag is
     unmoved.
   - `compute_capital.ts:92`, `cost_ledger.ts:186`, `dynamic_section_builder.ts:371` — display / verdict.
2. **`international_credibility -25`** → `apply_effects.ts:509-519`. Grep of `src/` finds **no consumer
   outside `scenario_preseeding.ts:161,173`** (which writes an initial value). Display-only.
3. **`narrative`** — inert.

**Answer:** it can touch **no scored territorial field directly**; the sole live channel is
`war_crimes_events`, and every behavioural consumer of that field is either saturated by w63 anyway or
turn-gated past 100. It is **not** informational-only, and should not be sold to the panel as such.

Two further facts the panel should have:
- `hrhb_camp_exposure_response_1993` gates on `war_crimes_above HRHB ≥ 2` (`turn_min: 76`) and fired
  **w79** in this run. HRHB is far past 2 by w76 with or without Ahmići. No change.
- w54 already fires 6 events. Ahmići has no `response_options`, so it bypasses `MAX_EVENTS_PER_TURN`
  (`evaluate_events.ts:546-576`) and adds **zero** player decisions. It has no `mutex_group`.

### (b) Re-floor or byte-neutral to `control_delta`?

**Expected byte-neutral — but a CANDIDATE, not a claim.** The signature matches three accepted
precedents in `CALIBRATION_MASTER.md:957, :961, :967, :971` ("only state delta is `event_flags` /
`event_fire_counts`; `control_delta.json` BYTE-IDENTICAL"). It is **not** provably flat a priori: HRHB
`override_authority` and `international_standing` genuinely differ for ~9 turns (w54-62). I could find
no consumer that reads either inside that window, but "I found no consumer" is INFERRED, not MEASURED.
⇒ **Treat as a calibration-flat candidate requiring a byte-identity proof.** If the proof holds it is a
re-bless of observational hashes only, not a re-floor.

### (c) Acceptance evidence, and the S4 precondition

**Predicted `op_schedule_diff.cjs` rung 4 (corps+objectives) divergence: 0.0%.** Nothing in this change
touches operation selection — the only channel that could (`international_standing` → op-launch
hesitation) is turn-gated at 100 and clamped identical by w63. **It does not approach the 20% ceiling**
(`CALIBRATION_MASTER.md:336-341`), so the checkpoint deltas are readable. **If rung 4 comes back
non-zero, the premise above is falsified and the change must be re-adjudicated, not accepted.**

Acceptance set, pre-committed, each a count of a named thing (S3b amendment, `:346-355`):

1. `control_delta.json` **byte-identical** to baseline (0 of 712 control diffs).
2. `op_schedule_diff` rung 4 diverged-op count == **0**.
3. `weekly_report.jsonl` w54 `events_fired` contains `ahmici_massacre_1993` — count **1**; the run's
   total unique catalog firings goes **177 → 178**.
4. `final_save.json` `capital.HRHB.war_crimes_events` == **21** (baseline 18, MEASURED).
5. All four `verify_checkpoints.cjs` matched counts unchanged, delta exactly **0**.
6. Enclave guard: 7 HOLDS + 2 FALLS unchanged.

**NEGATIVE CONTROL (S3b, `:333-335`) — and a caution.** `turn_min` is 54, so the 40w scenario and the
52w golden baseline **cannot reach the event** and are byte-identical *by construction*. That is a
structural fact, **not evidence**, and must not be quoted as a green. It is useful only as a tripwire:
if either moves, something other than this change moved. The real negative control is item (5) at
`jan1993` (w39) — also before w54 — plus item (2).

**Validate on 188w.** A 40w run proves nothing here.

### (d) Which repair is cheaper to VALIDATE

**The OSID retarget (`territory_control op:vitez:vitez_2 HRHB`), and it is not close.**

Both repairs produce the **identical run**: MEASURED, `political.control_events` contains **zero**
entries for any `op:vitez:*` OSID in 188 weeks, and HRHB holds `op:vitez:vitez_2` at every turn from 0
to 188. So `HRHB ≥ 0.33 of vitez` and `op:vitez:vitez_2 == HRHB` are both true continuously, and the
event fires on its first eligible turn, w54, either way. The 188w cost is the same one run.

They differ in what the run has to prove:

- **Threshold 0.5 → 0.33** leaves the row bound to a municipality-fraction predicate. Vitez has 3 OSIDs,
  so 0.33 silently means "≥1 of 3". If the OSID derivation ever re-splits Vitez, the requirement moves
  under the row with no signal — precisely the "silent premium" hazard the sweep documents at §E
  (`…THRESHOLD_SWEEP.md:96-114`). Its acceptance evidence is a run, and only a run.
- **Retarget to `op:vitez:vitez_2`** pins the row to a named cell. **Part of its acceptance discharges
  statically** — a unit test asserting `op:vitez:vitez_2 == 'HRHB'` in the painted init needs no run and
  never goes stale under map re-derivation. The 188w run then only has to prove byte-neutrality.

Independent of faithfulness, the OSID retarget is the cheaper validation. (It also happens to be the
more faithful option, so there is no trade-off for the panel to adjudicate.)

**Do not bundle the two.** They are alternatives, not a set; adopt one.

---

## P2 — Srebrenica / Žepa dating

### (a) Calibration consequence of a 9-week delay — quantified

**MEASURED, from `final_save.json.political.control_events`:**

```
t162  11 writes  mechanism=event          srebrenica_2, donji_potocari_2, milacevici, ljeskovik_2,
                                          sulice_2, bostahovine_2, luka_2, suceska, radovcici,
                                          brezovice_2 (RS->RS, a no-op write)
t162   2 writes  mechanism=consolidation  obadi, osmace_2
t164   1 write   mechanism=event          op:rogatica:zepa_2
```

Three findings, in order of weight:

**1. The four checkpoints are first-order unaffected.** `verify_checkpoints.cjs:44` scores at
w39 / 104 / 156 / 188. The whole affected interval (162 → ~173) lies strictly between w156 and w188, and
the endpoints are unchanged: RBiH at w156 either way, RS at w188 either way. `apr1995` and everything
below it cannot move.

**2. The trigger cannot be broken by combat.** MEASURED across all 545 battles in the run: the only
battles ever targeting these cells are `osmace_2` ×3 (w45-47) and `radovcici` ×1 (w52). **Zero battles
target any enclave cell after w52**, and `op:srebrenica:srebrenica_2` — the trigger OSID — is targeted
**zero times in 188 weeks**. The condition `territory_control srebrenica_2 == RBiH` therefore holds
continuously to w188, and the event still fires.
*(This corrects `memory/srebrenica_fall_is_a_hardcoded_write.md`'s "0 of 599 battles ever target the
enclave" — four battles do, all before w53. The conclusion it supports is unchanged.)*

**3. THE REAL COST — an ARBiH order-of-battle injection moves into the decisive window.** MEASURED from
`brigade_temporal_log.jsonl`, the fall's `enclave_formation_displacement`
(`casualty_fraction: 0.6, reconstitute_as: 'reduced'`, destination `op:zivinice:gracanica_2`)
reconstitutes **six ARBiH brigades** at Gračanica on t162 — 280th, 281st, **282nd (which does not exist
before t162)**, 283rd, 284th East Bosnian Light — at 319 personnel each, regenerating to ~630 each by
t167 (**≈3,150 personnel**) and persisting there to t176.

A 9-week delay moves that injection to ~t172-174, cutting its life in the run from ~15 turns to ~4, and
sliding it across **Deliberate Force (w171), Storm (w174), Sana + Mistral 2 (w179)** — MEASURED firing
weeks in this run. `tools/verify_checkpoints.cjs:221-225` records that this exact channel has moved
territory before: *"Turning on enclave-column displacement produced RBiH captures around Lopare … the
destruction of the enclave was converting into offensive capacity on ground that never fell."*

⇒ **P2 is a re-floor, not a re-bless.** Unlike P1 it has a named, plausible blast radius: the
Zivinice/Tuzla–Lopare–Posavina axis and the w171-179 operation window. Anyone pricing this as "the same
cells end in the same hands, so nothing moves" has not looked at the brigade log.

Secondary: 2 of the 13 t162 changes are `mechanism: consolidation`, not `event`. The consolidation
sweep is coupled to the event write **in the same tick**. Delaying the event delays or removes those
two, and that coupling has not been characterised.

### (b) ENCLAVE GUARD risk — LOW as proposed, HIGH if `turn_max` moves with it

The guard (`verify_checkpoints.cjs:175-176`, `:198-210`) asserts FALLS **two-sided**: RBiH at
w39/104/156 **and** RS at w188, and its own comment states an **early** fall is the atrocity-rewarded
breach. Moving w162 → w171 moves *away* from that. **The guard holds by construction** provided the
event still fires before w188.

Firing margin, INFERRED but fitted to two measured firings:

- Srebrenica — `pressure {base_rate 1, threshold 8, decay 0.5}` + `coha_expired` `+2` +
  `un_hostage_crisis_occurred` `+1` ⇒ ~4/turn from eligibility. Baseline fits: eligible t160 → accrual
  3, 7, 11 → **fires t162** (MEASURED). With `turn_min: 171` → **fires ~t172-173**. `turn_max` 185 ⇒
  **~12 turns of slack.**
- Žepa — `{base_rate 3, threshold 6, decay 0}`, gated `requires_events: srebrenica_falls_1995`.
  Baseline: eligible t163 → 3, 6 → **fires t164** (MEASURED), i.e. **exactly 2 turns**. With
  `turn_min: 173` → **fires ~t174-175**. `turn_max` 190 ⇒ **~15 turns of slack.**

**⚠ THE HARD CONDITION — the danger is not `turn_min`, it is `turn_max`.** The Historian's §5a table
(`…DEAD_CATALOG.md:351-353`) proposes `turn_max` **172** for Srebrenica and **174** for Žepa. Under the
fitted pressure model that leaves Srebrenica **1 turn** of slack and Žepa **exactly 0** — Žepa needs
2 turns of accrual after Srebrenica fires, so `srebrenica 171→173` plus `zepa turn_max 174` puts the
Žepa firing on the last legal turn with no margin. Any perturbation of the pressure inputs and **Žepa
never falls: an ENCLAVE GUARD breach.** The report's own Historian flags this unresolved at `:355-358`;
this seat resolves it as a cost:

> **Move `turn_min`. Do NOT narrow `turn_max` in the same change.** A `turn_max` narrowing is a separate
> proposal that must be measured on its own, and as specified (172/174) this seat reads it as
> **NON-COMPLIANT** — it buys date cosmetics with a non-fall risk.

### (c) Measurable, or "measured, unattributable"?

**Unknown, and it must be measured before any checkpoint number is quoted.** The change does not touch
operation-selection *code*, so the S4 precondition's "a structural change to operation SELECTION will
always exceed 20%" (`CALIBRATION_MASTER.md:340-341`) does not automatically bind. But it does change the
**brigade pool available to 2nd-Corps allocation for ~10 turns straddling the three largest ops of the
campaign**, which is an input to op eligibility. I will not pre-declare it readable.

⇒ **Run `tools/op_schedule_diff.cjs <base> <new>` at rung 4 FIRST.** Under 20%: the `oct1995` delta is
readable and the S4 bands bind. Over 20%: the checkpoint number **told you nothing**, must be recorded
as *"measured, unattributable at N%"* (`:346`), and adjudication falls entirely to the behavioural
targets below.

### (d) Pre-committed acceptance target — counts of named things

1. **Enclave guard, 4 named assertions, all must hold:** `op:srebrenica:srebrenica_2` == `RBiH` at w156
   and == `RS` at w188; `op:rogatica:zepa_2` == `RBiH` at w156 and == `RS` at w188.
2. **Count of `control_events` with `mechanism == 'event'` on `op:srebrenica:*` == 11** (baseline 11,
   MEASURED), all sharing one `turn`, and that turn `≥ 171`. Count on `op:rogatica:zepa_2` == **1**,
   turn `≥ 173`.
3. **Count of active ARBiH brigades at `op:zivinice:gracanica_2` at t180 == 1** (baseline: exactly
   `arbih_210th_vitezka_liberation_nesib_maliki`, MEASURED). **This is the S3b NEGATIVE CONTROL** — a
   plausible wrong mechanism (the injection changing *shape*, not just timing) moves it; correct timing
   alone does not. If reconstituted 280th-284th are still sitting at Gračanica at t180, the change did
   more than re-date.
4. **`jan1993`, `apr1994`, `apr1995` matched counts: delta exactly 0.** Any movement at or below w156
   falsifies the premise that this is a post-w156 change, and voids the run.
5. **`oct1995`**: S4 jitter band **0 to −3** — *conditional on (c) returning < 20%*. Above 20% this
   metric is void and adjudication rests on 1-3.

---

## P3 — `operation_lukavac_93` / Trnovo: SETTLED, and the sweep's premise is wrong

### (a) The instrument exists, and I used it

`final_save.json` → **`political.control_events`** is a complete per-turn, per-OSID control-change log:
201 records of `{turn, settlement_id, from, to, mechanism, mun_id, battle_id?, attacker_brigade?}`.
`tools/verify_checkpoints.cjs:83-89` already replays it (`stateAt(week)`) to reconstruct the controller
map at any week. `control_delta.json` is a **net summary derived from it**.

⇒ The sweep's statement at `20260906_FACTION_CONTROLS_MUNICIPALITY_THRESHOLD_SWEEP.md:85-86` —
*"it needs per-turn control resolution, which no current run artifact carries"* — and its self-imposed
limit #2 at `:54-56` are **both incorrect**. The limit is a property of the artifact the sweep chose,
not of the run.

**SETTLED, MEASURED** (replaying `control_events` over `political.initial_political_controllers`,
n390, RS share of the 6 Trnovo OSIDs):

```
w0-w19    RS 2/6 = 0.333
w20-w24   RS 1/6 = 0.167   (tosici RS->RBiH, t20, combat, arbih_102nd_motorized)
w25-w188  RS 2/6 = 0.333   (kijevo_2 RBiH->RS, t25, combat, rs_1st_romanija_infantry)
```

Only **two** Trnovo control events exist in 188 weeks, both before w26. **At w69, w70 and w71 RS holds
2 of 6 = 0.333 against a required 0.5.** `operation_lukavac_93` is dead on exactly the arithmetic that
kills Ahmići. Corroborating: MEASURED, **zero battles target any `op:trnovo:*` cell after w38** (the
last nine are w20-w38).

⇒ **The sweep's headline verdict — *"Ahmići is NOT a class. It is the only hard blocker of its kind"*
(`:15`) — is wrong. There are two.** `operation_lukavac_93` belongs in **Class A**, not Class B, and the
sweep's Class B is empty. *(Refuting the convener's framing is in scope, and this is the refutation:
the panel was briefed on a scope of one when the measured scope is two.)*

**Caveat, stated honestly.** This is one run. Trnovo needs exactly 3/6 = 0.500 with no silent premium,
and unlike Vitez (frozen, zero events all run) Trnovo *can* move — it just has not for 162 consecutive
weeks. Confirm on ≥2 further run dirs before calling it permanent; the same one-line replay does it.
The historical claim buried in it — did the VRS hold 3 of 6 Trnovo cells during Lukavac-93, and does
`turn_min 69-71` match Operation Lukavac 93 — is the Historian's, not mine.

### (b) Is the gap worth closing?

The measurement gap is already closed; what is open is a **discoverability** gap that has now produced
one wrong "unsettled" verdict. Cheapest instrument: expose `stateAt(week)` as a small CLI beside the
tool that already implements it — `node tools/control_at.cjs <run_dir> <week> [--mun X] [--faction Y]`,
roughly 10 lines lifted from `verify_checkpoints.cjs:83-89`. Under an hour, zero runtime cost, zero
calibration risk, read-only.

### (c) Does calibration want a per-turn OSID control timeline generally?

It wants it, it has it, and it did not know. The absence is **not deliberate** — `control_delta.json` is
a convenience summary and `control_events` is the primary record it derives from. Recommendation
(post-1.0 backlog, not a lane): one line in `CALIBRATION_MASTER.md` stating that `control_delta.json` is
**net-only** and `political.control_events` is the **temporal source of truth**, so a third sweep does
not re-derive the same false limit. Pair it with the sweep's own §E suggestion (a loader-time warning
when `ceil(threshold × N)/N − threshold > ~0.1`), which would have surfaced both Vitez **and** Trnovo at
authoring time for zero runtime cost.

---

## OVERALL: **GO**

Repair work on P1 and P2 may proceed to a plan, from this seat's perspective, with four conditions:

1. **P1 and P2 are separate changes and separate runs.** One change per calibration run. P1 is a
   byte-neutrality proof (re-bless); P2 is a re-floor. Bundling them makes P1's clean signal unreadable
   inside P2's blast radius.
2. **P2 moves `turn_min` only.** `turn_max` stays at 185 / 190. A `turn_max` narrowing to the §5a values
   (172 / 174) is **NON-COMPLIANT** from this seat until measured separately.
3. **P2 runs `op_schedule_diff` rung 4 before any checkpoint number is quoted**, and records the result
   as *"measured, unattributable at N%"* if it exceeds 20% — never as an accepted territorial cost.
4. **The sweep is corrected to two Class-A blockers before the panel's verdict is recorded.** The panel
   is being asked to rule on a scope of one; the measured scope is two. `operation_lukavac_93` carries
   the same historical-claim question as Ahmići and should be routed to the Historian seat, not filed
   as unsettled.

**Preferred P1 repair, on validation cost alone:** retarget the condition to
`territory_control op:vitez:vitez_2 HRHB`. Same run, same firing turn, but part of its acceptance
discharges as a static assertion and it does not go stale under map re-derivation.

**MEASURED vs INFERRED, declared:** everything cited from `control_events`, `brigade_temporal_log.jsonl`,
`weekly_report.jsonl` battle records, `final_save.json` capital, the catalog definitions, and the source
constants is **MEASURED**. The pressure-accrual arithmetic in §P2-b is **INFERRED**, fitted to two
measured firings (t162, t164) and consistent with both. "No consumer reads `override_authority` or
`international_standing` inside w54-62" is **INFERRED** from a grep of `src/` and a walk of all six
catalog files — it is why P1's acceptance is a byte-identity proof rather than an assertion.
