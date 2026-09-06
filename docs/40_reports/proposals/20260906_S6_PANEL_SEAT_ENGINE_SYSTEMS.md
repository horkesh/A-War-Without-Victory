# §6 Panel — ENGINE / SYSTEMS seat verdict

**Date:** 2026-09-06 · **Seat:** Engine/systems (`/gameplay-programmer` half of
`SENSITIVE_HISTORY_DESIGN_GATE.md:221`) · **Scope:** mechanism only. No code, data, or canon changed.
**Answered independently.** Other seats' verdicts not seen.

Primary evidence: `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390/`
(`weekly_report.jsonl`, `final_save.json`, `initial_save.json`, `operation_aars.json`).
Everything marked **[M]** was read out of source or artifact in this session. **[I]** = inferred.

---

## HEADLINE — three corrections to the convener's framing, before the verdicts

**C1 — [M] `faction_controls_municipality` is NOT the only predicate with this defect. It has a
byte-identical twin.** `territory_control` with a `municipality` key
(`src/sim/events/event_types.ts:735-744`) is line-for-line the same computation as
`faction_controls_municipality` (`:749-756`) — same OSID filter, same `?? 0.5` default, same
whole-OSID fraction, same `>=`. Two condition names, one semantics. **The corrected sweep audited
one name.** Any P1 repair applied to `faction_controls_municipality` alone leaves the class half-open,
and any lint written for one name is silent on the other. This changes P1's repair scope and no seat
has reported it.

**C2 — [M] the Srebrenica municipality is NOT flipped by a single event write. It is flipped by TWO
mechanisms in the same tick.** `final_save.json → political.control_events` at t162 holds **twelve**
records for `op:srebrenica:*`: **ten with `mechanism: "event"`** (one of which, `brezovice_2`, is
`RS -> RS`, a no-op) and **two with `mechanism: "consolidation"`** (`obadi`, `osmace_2`). Both
consolidation cells are also named in the event's `control_change.osids` list, so the event write found
them already RS. The memory note `srebrenica_fall_is_a_hardcoded_write.md` ("all 10 OSIDs flip in one
tick … mechanism=event") is **incomplete**: 9 real event flips + 2 consolidation flips + 1 no-op = 12.

**C3 — [M] "0 of 599 battles ever target the enclave" is FALSE.** `operation_aars.json` records
`vrs_drina:Operation Cerska-Kamenica:t40`, axis `kamenica`, **`objectives_targeted:
["op:srebrenica:osmace_2","op:srebrenica:radovcici","op:srebrenica:sulice_2"]`, `total_attacks: 4`,
`objectives_captured: []`**, AAR verdict *"Costly Stalemate"*, `capture_provenance:
"no_objectives_held"`, attacker losses 278 KIA / 934 WIA against 200/675 inflicted. A second op
(`vrs_drina:Operation Podrinje Sweep:t8`, axis `srebrenica_ring`) took 169 KIA for one Bratunac cell.
**The engine has a live combat path onto the enclave, it has been exercised, and it has never
succeeded.** The correct statement is *"attacked and never taken"*, not *"never attacked"*. This
matters directly to P9(c) and it inverts the usual reading: the enclave is not unreachable, it is
un-takeable-by-attrition on the modelled force ratios. (`verify_checkpoints.cjs:136-142` already warns
that its own contest count is target-only and narrow; it counts `weekly_report.battles`, which is a
different register from operation-axis attacks. Both registers are in the repo; the panel has been
quoting only one.)

---

## P1 — `faction_controls_municipality` / OSID granularity → **NON-COMPLIANT**

Ruled on mechanism. Whether the historical omission is itself a §6 breach is the Historian's seat; my
finding is that the omission is not an emergent outcome but an arithmetic impossibility, which removes
the only defence a §6 review would otherwise have.

**(a) Is the predicate sound?** **No — it is unsound as authored, and only half of the fix is
weighting.**

Two independent faults, and they need different repairs:

1. **[M] Representability.** `controlled / munOsids.length >= threshold` (`event_types.ts:752-755`)
   quantises to `k/N`. For `vitez`, `N = 3` **[M]** (`op:vitez:kruscica`, `op:vitez:preocica_3`,
   `op:vitez:vitez_2`), so `{0, .333, .667, 1}`. A `0.5` threshold is not merely unmet — **it names a
   value the state space cannot express.** No amount of war changes that.
2. **[M] Silent premium.** The effective threshold is `ceil(threshold·N)/N`, never the authored number,
   and nothing in the schema, `event_loader.ts`, or any test surfaces it. `novo_sarajevo` has `N = 2`
   **[M]**, so an author writing `0.3` there is writing `0.5`.

**Area- or population-weighting is the wrong general answer.** `faction_area_ratio`
(`event_types.ts:978-988`) does not weight per-OSID control at all — it reads a **pre-computed
faction-level snapshot**, `state.turn_summaries[0].territory_snapshot[faction]`. It is not a
municipality predicate and cannot be made into one without a new derived per-municipality area index.
It also carries its own hazard, already recorded at §4/D5 of the investigation: `faction_area_ratio`
moves with the calibration floor, so any event gated on it is fitted to a number that is still
drifting. **Swapping an integer-quantised gate for a float gate that tracks the floor trades an
unreachable event for an unstable one.** If weighting is ever wanted it should be *added* as a distinct
condition kind, never as a silent change to the semantics of the two existing ones.

**(b) Threshold `0.33` vs retarget to `territory_control op:vitez:vitez_2 = HRHB` — retarget is
mechanically sounder, and it is not close.**

Both fire. **[M]** the retarget's siblings are all satisfied: `croat_bosniak_war_begins_1993` fired
**w52**, `hvo_arbih_tensions_rise_1992` fired **w23**, and `op:vitez:vitez_2 = HRHB` at t0 and t188
with **zero Vitez control events in 188 weeks** — so under the retarget `ahmici_massacre_1993` fires
deterministically at **w54**, its historically exact turn. `1/3 = 0.3333… >= 0.33` also holds.

The retarget wins on three mechanism grounds:

- **[M] Merge-fragility.** The project's OSID count is not stable — `osid_744_drawn_712_simulated.md`
  records a completed merge, and the derive script has drifted from the committed file. A fraction is a
  function of `N`. **If Vitez ever gains a fourth OSID, `1/4 = 0.25 < 0.33` and the event silently dies
  again, with no test failing.** A named-OSID test is invariant under re-merge of *other* cells and, if
  `vitez_2` itself is ever merged away, fails loudly and lintably (a dangling-OSID check is trivial;
  `event_loader.ts:705-714` already runs exactly this shape of pass for dangling *event* refs).
- **Float fragility.** `0.33` works only because `1/3 > 0.33`. It is a threshold chosen to sit just
  under a repeating decimal. That is a latent trap for the next author, not a fix.
- **Precedent.** The single-OSID form is what the other sensitive-history rows already use —
  `srebrenica_falls_1995` gates on `territory_control osid: op:srebrenica:srebrenica_2` **[M]**,
  `zepa_falls_1995` on `op:rogatica:zepa_2` **[M]**.

Caveat I will not paper over: the retarget narrows the historical claim from *"the HVO held Vitez"* to
*"the HVO held Vitez town"*. That is a fidelity judgement and it is the Historian's, not mine. I rule
only that **if** the claim "HVO held Vitez town" is the one the panel wants, the OSID form expresses it
exactly and the fraction form expresses it by coincidence.

**(c) Loader-time / test-time warning on the silent premium — sound and deterministic, YES, with two
conditions.**

- Deterministic by construction: it reads only the committed catalog and a committed OSID list; no
  RNG, no clock, no state. It must run at **load or test time and emit a diagnostic, never gate
  behaviour at runtime** — a runtime skip would change which events fire and is a calibration event.
- **It must cover BOTH condition names (see C1)** and it must resolve `N` from the same source the
  predicate does. The predicate counts `Object.keys(political_controllers)` at runtime
  (`event_types.ts:751`); a loader has no `GameState`. So the lint's `N` must come from the committed
  operational-settlement master, and the lint is only as true as that file's agreement with the
  scenario's runtime controller set — which the investigation's own §6/P1 note flags as **already
  divergent for Vitez** (*"`operational_initial_master.json` paints all three Vitez OSIDs HRHB, but
  `hybrid_1992` init gives the runtime only one"*). **Write the lint against the count, not the
  controllers**, and it is sound; write it against controllers and it will disagree with the engine.

The sweep's own §E formula (`ceil(threshold·N)/N − threshold > ~0.1`) is the right shape. **[M]** it
would have caught Vitez (+16.7) and, at a lower cut, `novo_sarajevo` (+20.0). It would **not** have
caught `operation_lukavac_93` — Trnovo's premium is exactly 0.0 (`N = 6` **[M]**: `delijas`,
`gornja_presjenica`, `kijevo_2`, `tosici`, `trnovo`, `tusila`). The addendum's claim that the §E
warning *"would have caught **both** Vitez and Trnovo at authoring time"* is **wrong by its own
table**, which prints Trnovo's premium as 0.0. Trnovo is a different defect and needs a different
instrument.

**(d) A THIRD repair nobody has proposed — and it is the one I would build.**

**Add an integer form to the condition: `min_controlled: <n>` alongside (and taking precedence over)
`threshold`.** *"HRHB controls ≥ 1 of Vitez"*, *"RS controls ≥ 3 of Trnovo"*.

- It removes the fraction↔integer impedance mismatch **at the source** rather than compensating for it
  downstream. There is no premium to lint because there is no rounding.
- It is invariant under re-merge in the direction that matters: adding cells to a municipality never
  invalidates an existing `min_controlled`, whereas it always perturbs a fraction.
- It is a strictly additive union member — existing rows keep `threshold` and are byte-identical, so
  it is calibration-flat on its own (**[I]**, but by construction: an unused field cannot be read).
- It gives the panel a way to express *"most of Vitez"* honestly at 3-OSID resolution, which neither
  `0.33` nor a single named OSID does.
- **[M] It must be added to both `territory_control` and `faction_controls_municipality`, or C1
  reopens the class.**

For Ahmići specifically I would still ship the **retarget** — it is the most faithful and the
cheapest — and land `min_controlled` as the class-level fix so that P3's "defect class" is actually
closed rather than patched one row at a time.

**Calibration price of the P1 repair (measured, so the plan can be costed):** **[M]**
`ahmici_massacre_1993` has **no `control_change`, no morale, no supply effect**. Its effects are
`humanitarian_impact HRHB war_crimes_delta 3` and `negotiation_capital HRHB international_credibility
−25`. **No OSID repaint, so the checkpoint-matched floor cannot move directly.** But
`international_credibility` is a live strategic dimension read by other conditions and `war_crimes` is
read by `war_crimes_above`, so it is **not provably calibration-flat** and it will move the Pyrrhic
grade — which is the point of firing it. **One controlled 188w run, one change, per the one-change rule.**

---

## P2 — Srebrenica / Žepa fall dates → **NON-COMPLIANT**

**(a) What actually makes the enclave fall.** **[M] The event write, and only the event write. There
is no path today by which the enclave falls without `srebrenica_falls_1995`.**

Trace:
- `srebrenica_falls_1995.effects[control_change]` names **12** OSIDs; `apply_effects.ts` repaints them
  to RS in one tick.
- `enclave_resilience.ts` **cannot** cause a fall. Its own header (`:11-21`) states the rule and the
  2026-08-26 §6 correction: resilience models *capacity to endure siege* and only ever produces a
  **defence bonus, cohesion recovery, hardening, and exhaustion reduction** — every term is
  defender-favourable. Removal of the defending formations is done by
  `applyEnclaveFormationDisplacement`, invoked by the event's own
  `enclave_formation_displacement` effect **[M]**, not by that file.
- Combat: **[M]** `political.control_events` for `op:srebrenica:*` across 188 weeks contains exactly
  **two** entries outside t162 — `obadi RS→RBiH` at t1, `mechanism: paramilitary`. **Zero `combat`
  records in the municipality, ever.** Yet **[M]** four attacks were made on three of its cells at t40
  and captured nothing (C3). So the combat path exists, is live, and has a 0/4 record.
- **Therefore [M]: with `srebrenica_falls_1995` suppressed, Srebrenica does not fall in this run.**
  The event is not decorating an emergent outcome; it is the sole cause.

**The pressure model is a disguised constant.** **[M]** `updateEventReadiness`
(`pressure_system.ts:22-58`) accrues only when `inWindow && conditionsMet && requiresMet`, and it runs
as pipeline step `update-event-readiness` **immediately before** `evaluate-events`
(`war_phases.ts:1048-1060`). All three pressure modifiers are set by events that fire on fixed
calendar windows, so the rate is a **constant across the whole window** and the fall date is
`turn_min + ceil(threshold / rate) − 1` with no dependence on the war. Reproducing w162 exactly:

| turn | rate | why | readiness |
|---|---|---|---|
| 160 | 1 + 2 | `coha_expired` (w156). `un_hostage_crisis_occurred` **not yet set** — the hostage event fires *later in this same turn* | 3 |
| 161 | 1 + 2 + 1 | hostage flag now set | 7 |
| 162 | 4 | | **11 ≥ 8 → FIRES** |

**[M]** matches the artifact: `srebrenica_falls_1995` at w162. Žepa likewise: `base_rate 3, threshold 6,
decay 0`, prerequisite satisfied from t163 → 3, 6 → **fires t164** **[M]**. Žepa is rigidly
`Srebrenica + 2` and its `turn_min: 160` is indeed inert.

**(b) If `turn_min` moves, what else must move — and this is where the enclave guard actually bites.**

**[M] The Historian's §5a suggestion `turn_min 171 / turn_max 172` DESTROYS THE ENCLAVE GUARD.** Do not
merge it.

Moving the window to 171 activates the `rrf_deployed −0.5` brake **for the first time in the game's
history**, because `rapid_reaction_force_1995` fires at **w168** **[M]** and `rrf_deployed: true` is in
`final_save.json` **[M]**. Rate becomes `1 + 2 + 1 − 0.5 = 3.5`:

| turn | readiness | |
|---|---|---|
| 171 | 3.5 | |
| 172 | 7.0 | **< 8 — window closes** |
| 173 | — | out of window → `inWindow` false → readiness **decays** by `decay_rate 0.5` to 6.5 |

**`srebrenica_falls_1995` never fires. Srebrenica never falls. `verify_checkpoints.cjs:174-197` fails
the FALLS assertion at w188. §6 breach, in the direction the guard exists to prevent.** (`decay_rate
0.5` also guarantees readiness can never claw back: 3.5 gained per in-window turn vs 0.5 lost, but
there are no further in-window turns.)

With `turn_max` left wide (185), `turn_min 171` yields readiness 3.5 / 7.0 / 10.5 → **fall at w173, two
turns late**, and Žepa at **w175** against a true w173. So the naive date fix is *also* wrong, just
less catastrophically.

**What must move together, as one arithmetic package:**

1. **`turn_max ≥ turn_min + ceil(threshold/rate) − 1`, computed under the brake-on rate.** At
   `threshold 8, rate 3.5` that is `turn_min + 2` minimum. **Never author a pressure window narrower
   than the accrual it requires.** This deserves a loader lint of its own — it is exactly D3's
   dead-by-construction shape, one layer down, and the loader currently validates only
   `turn_min <= turn_max` (`event_loader.ts:449-455`).
2. **Retune `threshold` (or `base_rate`) if the fall is wanted on the exact historical turn.**
   `threshold 4` at rate 3.5 gives w172; `threshold 3.5`, or `base_rate 2.5` with `threshold 8`,
   gives w171. Whatever is chosen, `zepa` inherits `Srebrenica + 2` — which happens to be exactly the
   real interval only if Srebrenica lands on 171 (11 Jul → 25 Jul is w171 → w173). **[M]** Žepa needs
   no change of its own; fixing Srebrenica fixes Žepa. That is a genuine piece of good luck in the
   current data and the plan should bank it rather than touch `zepa_falls_1995` at all.
3. **`tests/event_timeline_integrity.test.ts:94,95,107,108` must move in the same commit** — it pins
   `turn_min === 160` on both and `threshold === 8` / `=== 6`. **[M]** It does **not** pin `turn_max`,
   `base_rate`, or any modifier, so the brake can be retuned without touching the test; the two
   `turn_min` pins and the two threshold pins are the only blockers.
4. **The enclave guard itself needs NO change and does not constrain the date.** **[M]**
   `verify_checkpoints.cjs:181` checkpoints at **w39 / w104 / w156 / w188** and asserts FALLS
   two-sided as *RBiH through w156, RS at w188*. **Any fall in (156, 188] passes identically.** The
   guard is blind to the difference between w162 and w173. It constrains only that the event fires
   at all — which is precisely the failure mode in (b) above. **The panel should not take a passing
   guard as evidence the date is right; it never tested the date.**

**Calibration cost, stated plainly:** 11 extra weeks of RBiH control over 12 OSIDs, an
`enclave_formation_displacement` (0.6 casualty fraction, `reconstitute_as: reduced`) moved from t162 to
t173, and 11 weeks of altered force presence in the Drina valley. **[I]** the w156 and w188
checkpoints straddle both dates so `matched_osids` need not move — but `final_state_hash`,
casualties, and downstream formation state will. **This is a re-floor-class change requiring its own
controlled 188w run.** It is not a data one-liner.

**(c) Is the single-tick multi-OSID event write the right mechanism? — Answering as an engineer: it is
the WRONG SHAPE for a mechanic the engine genuinely lacks, and I would not rebuild it now.**

What the engine lacks is not "a way to capture cells" — C3 proves it has one and it ran. What it lacks
is **a way for a besieged enclave's defence to break down** — a collapse/capitulation path in which
sustained isolation, supply exhaustion, and the withdrawal of external protection convert into a rapid
multi-cell loss. Every enclave-facing mechanism in the engine points the other way:
`enclave_resilience.ts` is monotonically defender-favourable by design (`:24-28`), and there is no
counterpart that erodes it to zero and beyond. So the war can grind at the perimeter forever (0/4 at
t40) and never produce a fall. **The event write is compensating for the absence of a
siege-culmination mechanic**, and the 12-OSID single-tick repaint is the crudest possible stand-in:
the artifact even records one **`RS -> RS` no-op write** **[M]** (`brezovice_2`) and two cells that
`consolidation` had already taken **[M]**, which is what a hand-written OSID list looks like when it
has drifted from the state it repaints.

But three things argue against rebuilding it as part of this repair:
- **Canon H1.8 makes enclave outcomes event-owned.** Replacing the event write with an emergent
  culmination mechanic is a change to *who owns the outcome*, which is bright-line territory and
  needs the broader eight seats, not this four.
- An emergent path that *can* take Srebrenica can also take Goražde and Bihać. The enclave guard's
  HOLDS list would go from "passes for free" to genuinely at risk. **[M]** `verify_checkpoints.cjs:127`
  already records that 8 of 9 guard cells are never battle targets — the guard has never been stressed
  and would be, all at once.
- The correct near-term fix is **hygiene on the existing write**, which is cheap and carries no canon
  question: make the `control_change` list self-checking (fail on an OSID the effect does not actually
  change hands, and on an OSID absent from the controller map), and reconcile it against the
  `consolidation` overlap. That converts a silent RS→RS write into a loader error.

**(d) The `−0.5` RRF brake has never applied. Defect in the MODEL, not the constant — and it is the
sharpest evidence for the P2 verdict.**

**[M]** `rapid_reaction_force_1995.trigger.turn_min = 168`; it fired **w168**; the enclave fell **w162**.
Six weeks of gap. The brake is not merely unapplied — **it is unapplicable**, because the event that
sets its flag cannot fire before the event it is supposed to brake.

Why this is a model defect and not a tuning error:
- Every one of the three modifiers is keyed to a **calendar-gated event**, so none of them carries any
  information about the war. The "pressure model" evaluates to a constant on every playthrough. It has
  the *form* of an emergent accumulation and the *behaviour* of a hardcoded date.
- The one modifier that could have represented a countervailing force — international military
  protection arriving in time — was authored **after** the outcome it modifies. Nothing in the loader
  or the tests can see that, because `requires_events` and `turn_min` orderings are checked
  (`tests/event_timeline_integrity.test.ts:39-49`) but **pressure-modifier flag providers are not**.
  A modifier whose flag-writer's `turn_min` exceeds the modified event's achievable fire turn is
  dead by construction — **the same defect class as D3**, in a second place, and it should be added
  to the same lint.
- **Fixing the date makes the brake live for the first time**, which is exactly the trap in (b). So
  (d) is not a curiosity to note; it is the mechanism that breaks the naive P2 fix.

If the panel wants the pressure model to *mean* something, the modifiers must read war state
(`siege_active`, supply, `morale_average_below`, `dimension_below`), not calendar flags. That is a
design question and I flag it without proposing it.

---

## P5 — the Dayton ending

**(a) Trace verified independently. All four claims hold. [M]**

1. **`turn_pipeline.ts:88-91` is a fourth `game_over` writer.**
   ```ts
   if (working.military.event_flags?.dayton_signed === true && !working.meta.game_over) {
       working.meta.game_over = true;
       working.meta.outcome = 'dayton_agreement';
   }
   ```
   `endgame_snapshot.ts:16-22` (path is `src/sim/endgame/endgame_snapshot.ts`, **not**
   `src/sim/negotiation/` as the brief has it) names exactly three writers. **[M]** the three call
   sites are `war_termination.ts:190`, `peace_plans.ts:520`, `dayton_negotiation.ts:483`. **There is no
   `freezeEndgameSnapshot` call in `turn_pipeline.ts`.** Confirmed by exhaustive grep — 4 call sites in
   `src/`, none in the pipeline.
2. **`outcome: 'dayton_agreement'` matches no branch.** `scoring.ts:882-899`: `outcomeType = 'dayton'`
   **only** under `if (neg?.dayton_result)`. Route 1 never writes `dayton_result`. The remaining
   branches test `startsWith('ceasefire')`, `startsWith('peace_plan')`, `startsWith('victory_')`,
   `=== 'timeout_stalemate'`, `=== 'faction_collapse'` — none match — and the final `else if (outcome)`
   sets `outcomeLabel = 'dayton agreement'` while `outcomeType` **remains `'termination'`**. The
   VerdictScreen Dayton block is keyed off `outcomeType`. Confirmed.
3. **Suppression of the modal is real and DOUBLE-gated** — the brief understates it. Both
   `dayton_negotiation.ts:98` (`if (state.meta.game_over) return false`) **and** the pipeline step
   itself, `war_phase_negotiation_steps.ts:70` (`if (context.state.meta.game_over) return`), refuse.
   And it is worse than either: **[M]** `turn_pipeline.ts:93+` short-circuits the *entire* turn to
   report-only once `game_over` is set, so from the turn after `dayton_signed_1995` the negotiation
   steps never execute at all. The menu cannot open on any path.
4. **One sequencing precision the brief omits, in the fix's favour:** the flag is read at the **top of
   `runTurn`**, so the suppression lands on turn `T+1`, not on the turn `dayton_signed_1995` fires.
   With `dayton_signed_1995` at `turn_min 184` requiring `dayton_talks_begin_1995` (also `turn_min
   184`) **[M]**, the chain is ~t184/t185, `game_over` at ~t186, and w188 is never reached in a
   playable state. **The regression stands; the one-turn lag does not rescue it.**

Also **[M]**: `dayton_signed` (the flag) has **exactly one reader in `src/`** — `turn_pipeline.ts:88` —
and **zero writers in `src/`**; its only writer is `dayton_signed_1995.sets_flags` in
`war_1995.json`, and the flag is **absent** from `final_save.json.military.event_flags`. Provable
no-op today.

**(b) "Delete, not repair" — CONFIRMED, and I would strengthen the argument.**

The report's case is that repairing means duplicating `resolveDaytonNegotiation`'s postlude. That is
right but understates it. Route 1 is not a second ending; it is a **third-party write into another
subsystem's terminal state machine**. `meta.game_over` has an owner-contract
(`endgame_snapshot.ts:16-22` + `game_state.ts:1991`) that says every writer freezes the snapshot in the
same breath. Route 1 violates that contract, and it is the *only* writer that does. A repair that
honours the contract is, by definition, a fourth copy of `resolveDaytonNegotiation` — at which point
the correct refactor is to call `resolveDaytonNegotiation`, at which point Route 1 has no reason to
exist.

Two further deletion arguments the report does not make:
- **It is an ordering hazard even if repaired.** Because it fires at the top of `runTurn`, a repaired
  Route 1 would terminate the campaign *before* that turn's combat, negotiation, and scoring steps,
  producing a different final state than the identical decision taken through the modal. Two endings
  that disagree about which turn the war stopped is a determinism-adjacent defect, not a feature.
- **[M] Its removal is provably behaviour-neutral today** (no writer, flag absent from the save), so
  it can land as a standalone commit with a byte-identical 188w run — the cheapest possible change and
  the correct first step in the §11.4 order.

**(c) The `ceasefire_1995` data fix is sound. Do NOT change `flag_not_set` engine-wide. [M]**

`flag_not_set` (`event_types.ts:830-833`) is a **key-presence** test; `flag_equals`
(`:825-828`) is a **value** test. Both are individually coherent and the pair is only a bug where a
writer writes `false`. **[M]** `coha_expires_1995.sets_flags = {"coha_active": false, "coha_expired":
true}` inserts the key; `final_save.json` has `coha_active: false, PRESENT`. The sweep's blast-radius
audit (one collision in 99 usages) is consistent with everything I read.

**However — the panel should prefer `flag_equals coha_active false` over the §10.1 alternative of a
positive test on `coha_expired`.** They are not equivalent under a future re-authoring: `coha_expired`
is a *history* flag (the ceasefire once expired) while `coha_active` is a *state* flag (it is not in
force now), and only the latter is the thing the ceasefire event actually means. **[M]** six combat
sites gate on `coha_active` being true, so `coha_active === false` is the same proposition combat uses.
Same behaviour today, better-aligned semantics tomorrow.

**(d) Is the reader divergence a latent defect beyond this one event? — YES, and it is a separate,
larger one than the brief frames.**

**[M]** There are **three** distinct flag-reading semantics in the engine, not two:

| Reader | Semantics | Site |
|---|---|---|
| `flag_not_set` | key presence: `!(flag in flags)` | `event_types.ts:830-833` |
| `flag_equals` | strict `===` against an authored value | `event_types.ts:825-828` |
| `isTruthyFlag` | coerces: `false`/`0`/`""`/`"0"`/`"false"`/absent → false | `dynamic_section_builder.ts:237-243`, used by `flagOperand` at `:307` |

**The Codex and the event system disagree about what a flag *is*.** Under `isTruthyFlag`, a flag
written `false` and a flag never written are **the same thing**; under `flag_not_set` they are
**opposites**. A flag written the string `"false"` is falsy to the Codex and `!== true` to
`flag_equals`, but *present* to `flag_not_set` — three readers, three answers, one state.

This is latent rather than live because **[M]** only three flags are ever written `false`
(`coha_active`, `joint_operations_agreement_active`, `svk_corps_active`) and the Codex's ghost
predicates happen not to read them. **It becomes live the moment any author writes a `false` for a
flag a ghost entry reads** — and nothing prevents that. My recommendation is documentation and a test,
not a semantic change: **pin the three semantics in a test that asserts each reader's treatment of
`true`/`false`/absent/`"false"`/`0`**, so a future unification is a deliberate act rather than a
silent one. Changing `flag_not_set` engine-wide to a truthiness test would require auditing 99
call sites and is not justified by one collision.

---

## P6 — the same-turn prerequisite deadlock

**(a) One turn of lag is CORRECT BY DESIGN, and it is load-bearing. Do not change the evaluator. [M]**

The evaluator is a strict three-phase pass: **Phase 1** collects candidates
(`evaluate_events.ts:503-523`, calling `isCandidateEligible` at `:510` and `:519`), **Phase 2** sorts,
mutex-filters and caps (`:525-577`), **Phase 3** fires (`:579-580`), and `firedIds.push(def.id)`
happens at **`:776`, inside Phase 3 only**. `triggerMatches` reads `fired_event_ids`
(`event_types.ts:717-719`). So no candidate can ever see a same-turn sibling's firing.

That is not an accident, and removing it would be a serious regression:
- **Order-independence.** Candidate eligibility is currently a pure function of the state at the top of
  the turn. Allow same-turn chaining and eligibility becomes dependent on **firing order within the
  turn**, which is decided by `compareEventCandidates` and the `MAX_EVENTS_PER_TURN = 4` cap. An event
  bumped by the cap would then silently kill its dependents — a cap becoming a causality gate.
- **Determinism.** It would still be deterministic, but it would make the fired set sensitive to
  priority ties and to cap pressure, which is exactly the kind of coupling `strictCompare` discipline
  exists to avoid.
- **Cascade risk.** A chain of same-turn prerequisites would fire N events in one tick. The
  `overflowed` mechanism (**[M]** bound once in 188 weeks, three entries at t96) is not designed for
  that.

**The lag is right. The data that ignores it is wrong.**

**(b) Loader lint — and it must be a lint, not a data-only fix, because the defect recurs. [M]**

Three instances of the same shape are already in the catalog, at two severities:

| Event | Window | Prerequisite | Prereq `turn_min` | Outcome |
|---|---|---|---|---|
| `nato_ultimatum_sarajevo_1994` | **96-96** | `markale_massacre_1994` | 96 (pinpoint) | **DEAD** — never fired **[M]**; takes `sarajevo_exclusion_zone_1994` (97-98) with it **[M]** |
| `rbih_nato_ultimatum_compliance_1994` | 96-98 | `markale_massacre_1994` | 96 | fires **w97** **[M]** — the control |
| `dayton_signed_1995` | 184-215 | `dayton_talks_begin_1995` | 184 | survives on window width alone |

Ruling on the three options:

- **Evaluator change — NO.** See (a). It trades a one-row data bug for an order-dependence defect
  across all 299 rows.
- **Data change alone — INSUFFICIENT.** It fixes two rows and leaves the trap armed. `dayton_signed_1995`
  is one authoring edit away from the same fate.
- **Loader lint — YES, this is the right layer.** Deterministic: it reads only the committed catalog,
  compares integers, and has no state, no RNG, no clock. Zero runtime cost — it never executes during
  a sim turn, so **calibration is byte-identical by construction**. The loader already has the
  machinery: `collectEventRefs` (`event_loader.ts:690-703`) walks `requires_events` and
  `validateEventReferences` (`:705-714`) already throws on dangling refs, sorted via `strictCompare`.

**Precise rule, and it is broader than the brief's:**

> For any event `E` and prerequisite `P`, `E` is dead-by-construction if
> `E.turn_max < P.turn_min + 1`.

This subsumes the `turn_min == turn_max` case and also catches a 2-turn window opening on the
prerequisite's turn. **Emit as a hard `failRow`** — parity with the existing dangling-ref throw; a
warning in a 299-row catalog is a warning nobody reads.

**Add two siblings to the same lint** (both found in this review):
- **P2(d)'s shape:** a `pressure.modifiers` entry whose flag-writing event's `turn_min` exceeds the
  modified event's earliest achievable fire turn is a dead modifier. This is what hid the RRF brake.
- **P2(b)'s shape:** `turn_max − turn_min + 1 < ceil(pressure.threshold / max-achievable-rate)` is a
  pressure event that cannot accumulate inside its own window. This is what would have caught the
  guard-breaking `171/172` proposal before anyone ran it.

**Ordering caution for the plan:** the lint must be written and run **before** any P2 date change, not
after. Landed after, it would have to be authored against data that is already being edited; landed
before, it *audits the proposal*.

---

## P9 — the `enclave_defended` ghost

**(a) VERIFIED, and the situation is worse than reported. [M]**

- `SENSITIVE_HISTORY_DESIGN_GATE.md:199` names `predEnclaveDefended()` gating on
  `enclave_held_through_turn` as the canonical §3-compliant counterfactual recorder. Confirmed.
- **Zero production writers.** `node tools/hooks/whowrites.mjs enclave_held_through_turn` over 1,035
  files under `src/`: *"NO PRODUCTION WRITERS FOUND."* **And zero data writers** — `grep -rn` over
  `data/` returns nothing, which closes the exact hole that caused the Ahmići misdiagnosis (§9 method
  note 2). The flag is **absent** from `final_save.json.military.event_flags` **[M]**.
- Deliberate, and documented in three places: `observer_threshold_flags.ts:18-21` (*"§6-GATED … and is
  DELIBERATELY NOT written here … deferred for separate §6 historian handling"*),
  `war_phases.ts:1083-1085`, and `tests/observer_flag_writer.test.ts:226-244`, which asserts it both
  from the audit-event path and *"even when forced through"*.
- The consumer is live and dark: `dynamic_section_builder.ts:461` reads the flag through
  `flagOperand` → `isTruthyFlag`, so absent reads false and the ghost never emits.

**NEW — [M] the documented predicate names an OSID that does not exist.** `SENSITIVE_HISTORY_DESIGN_GATE.md:199`
and `dynamic_section_builder.ts:453-456` both specify the flag as set when ARBiH retains
`op:srebrenica:srebrenica_2` **AND `op:zepa:zepa_2`** AND `op:gorazde:gorazde_2`.
**There is no `op:zepa:zepa_2` in the controller map.** The only Žepa OSID is
**`op:rogatica:zepa_2`** — which is what `zepa_falls_1995` and `verify_checkpoints.cjs:176` actually
use. `War_Specification_v0_9_0.md:129` repeats the wrong id. **Anyone implementing the writer from the
canon spec would produce a predicate that can never be true**, and the failure would be silent —
`pc['op:zepa:zepa_2']` is `undefined`, which is simply `!== 'RBiH'`. This is a canon-text defect on the
one line the gate points at, and it should be corrected in the same change as any writer.

**(b) What would have to write it — cheap in code, expensive in judgement.**

Mechanically it is **~15 lines and the cheapest item in this whole panel**. The precedent is complete
and adjacent: `observer_threshold_flags.ts` already exists as a default-OFF, `ENABLE_*`-gated,
write-only-booleans observer wired into the pipeline at `war_phases.ts:1077-1096`, running *after*
`evaluate-events` so it reads same-turn results. The writer is a three-OSID read of
`political_controllers` at a chosen turn, with `strictCompare`-sorted iteration. Its calibration risk
is **zero by the same argument the file already makes at `:32-36`**: it writes one boolean to
`event_flags` and touches no control, dimension, morale, or supply surface.

What is *not* cheap, and what I take to be the real reason it has sat unwritten:

1. **[M] With today's data it can never be true anyway.** `srebrenica_falls_1995` fires unconditionally
   at w162 on a calendar-driven pressure constant (P2), so `op:srebrenica:srebrenica_2` is RS from t162
   in every run. Whatever turn N is chosen, either N < 162 (and the flag records "the enclave was still
   held in week N", a triviality) or N ≥ 162 (and it can never be set). **The writer is not blocked by
   §6; it is blocked by P2.** Writing it before fixing P2 ships a second dark mechanism.
2. **The three constants — which enclaves, which turn N, and what "held" means — are exactly the
   §6 judgement**, not an engineering choice. `op:gorazde:gorazde_2` and Bihać hold trivially
   (**[M]** `verify_checkpoints.cjs:127-129`: 8 of 9 guard cells are never battle targets), so a
   conjunction over all three is dominated by the Srebrenica term and the other two contribute nothing.
3. **The canon id is wrong (above).** Fix the text first or the writer is born broken.

**Recommendation: sequence it AFTER P2, and treat the OSID correction as a prerequisite.** Do not
schedule it as a standalone cheap win; it would be a no-op wearing a fix's clothes.

**(c) Ring 3 #10's promise — mechanically reachable? NO. And the reason is not the one in circulation. [M]**

The promise is *"hold the enclave through ordinary military means"*. Three independent mechanisms have
to co-operate, and the third fails absolutely:

| Requirement | Status |
|---|---|
| The enclave can be attacked by ordinary combat | **YES** — C3: 4 attacks on 3 Srebrenica cells at t40, 0 captured |
| The defence can be strengthened by player action | **YES** — `enclave_resilience.ts` defence bonus, cohesion recovery, hardening are all live and defender-favourable |
| Holding the enclave changes the outcome | **NO** — `srebrenica_falls_1995` repaints 12 OSIDs to RS regardless of the military situation. Its trigger tests only that RBiH *still holds* `srebrenica_2` (**[M]** `territory_control osid: op:srebrenica:srebrenica_2, faction: RBiH`) — i.e. **holding the enclave is a PRECONDITION OF LOSING IT.** Successful defence is the trigger for the fall. |

**So the promise is not merely unreachable — the mechanic inverts it.** Every week the player
successfully defends Srebrenica, they satisfy the fall event's own condition. The only way to prevent
the event is to lose the town to combat before w162, which is the opposite of the promise.

The `enclave_defended` ghost was the intended honest register for the counterfactual, and it is dark.
**So today the game makes a promise in Ring 3 #10 that it cannot keep and cannot even record the
absence of.** I state that as a mechanism finding and leave its §6 weight to the Historian, Canon,
and Narrative seats.

I will not propose the fix: making the outcome depend on the military situation is a change to who
owns enclave outcomes, which canon **H1.8** assigns to events. **That is bright-line territory and
requires the broader eight, not this four.** It should be surfaced to the owner as a live tension
between Ring 3 #10 and H1.8, not resolved inside a repair lane.

---

## OVERALL: **GO** — repair work on P1 and P2 may proceed to a plan

**GO**, subject to seven conditions. My seat finds no mechanism reason to block, and one strong reason
to proceed: both defects are **deterministic and silent**, and a non-firing event leaves no trace in
any artifact, so neither can be caught by anything the project currently runs.

**Conditions, all mechanism-derived:**

1. **P1 and P2 are separate changes with separate runs.** One-change-per-calibration-run. P1 has no
   `control_change` **[M]**; P2 moves 12 OSIDs by 11 weeks. Bundling makes the attribution
   unrecoverable.
2. **P1's repair must cover BOTH `faction_controls_municipality` AND `territory_control`+`municipality`
   (C1)**, or the class stays half-open and the next sweep finds it again.
3. **P2 must NOT narrow `turn_max` to `turn_min + 1`.** `171/172` breaks the enclave guard by
   arithmetic — Srebrenica never falls. Any window/threshold/rate change must be recomputed under the
   **brake-on** rate of 3.5 and shown to fire *on paper* before it is run.
4. **Write the D3 loader lint FIRST, with the two P2-derived siblings** (dead pressure-modifier;
   window narrower than required accrual). It costs nothing at runtime and it audits the P2 proposal
   rather than trailing it.
5. **P2 is a re-floor-class change.** Controlled 188w run, `verify_checkpoints.cjs` against current
   painted files, full `anchor_checks` diff — not net `matched_osids`, per
   `feedback_net_matched_masks_anchor_flips`.
6. **`tests/event_timeline_integrity.test.ts:94,95,107,108` moves in the same commit as P2.** **[M]**
   nothing else in that file pins the affected fields.
7. **P9 is sequenced after P2 and is not a cheap win.** Correct `op:zepa:zepa_2` → `op:rogatica:zepa_2`
   in `SENSITIVE_HISTORY_DESIGN_GATE.md:199`, `dynamic_section_builder.ts:453-456`, and
   `War_Specification_v0_9_0.md:129` as a prerequisite.

**Explicitly OUT of this GO and NOT within this panel's authority:** replacing the event-owned enclave
fall with an emergent siege-culmination mechanic (P2c), and resolving the Ring 3 #10 / H1.8
contradiction (P9c). Both change **who owns enclave outcomes**, which is the bright line. They need the
broader eight seats and should reach the owner as a proposal while still a proposal.

**Also recorded, no action requested:** the three-way flag-semantics divergence (P5d) needs a pinning
test, not a semantic change; and `verify_checkpoints.cjs`'s FALLS assertion checkpoints at
w39/104/156/188 and therefore **cannot distinguish w162 from w173** — a passing guard has never been
evidence about the date, and no future §6 verdict should cite it as such.
