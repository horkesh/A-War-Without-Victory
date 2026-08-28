# §6 PANEL EVIDENCE PACK — Srebrenica stalemate reachability

**Frozen 2026-08-28.** Do not edit during the poll. Each seat is polled independently
on this identical pack.

## The owner's request

> "Cap coha_expired and make the stalemate reachable."
> "We need a way for RS player to get an A grade."

## VERIFIED MECHANISM — the fall is currently unconditional

`data/scenarios/events/war_1995.json` → `srebrenica_falls_1995`:

    trigger: turn_min 160, turn_max 185, phase war
      condition: srebrenica_enclave_formed == true AND srebrenica_demilitarized == true
    pressure: base_rate 1, threshold 8, decay_rate 0.5
      modifiers: coha_expired +2 | rrf_deployed -0.5 | un_hostage_crisis_occurred +1

`src/sim/events/pressure_system.ts:44-58` — decay is an ELSE branch, not a per-turn drag:

    if (conditionsMet && inWindow && requiresMet) {
        readiness[def.id] = (readiness[def.id] ?? 0) + rate;   // no decay applied
    } else {
        readiness[def.id] = Math.max(0, readiness[def.id] - decay_rate);
    }

While the enclave is formed + demilitarized inside the 26-turn window, readiness
climbs by the full rate every turn with nothing pulling it back.

| modifiers active | rate/turn | cumulative over window | fires |
|---|---|---|---|
| NONE | 1.0 | 26.0 | t167 |
| rrf_deployed only | 0.5 | 13.0 | t175 |
| coha_expired | 3.0 | 78.0 | t162 |
| coha + hostage + rrf | 3.5 | 91.0 | t162 |

**Every combination fires.** Setting `coha_expired` to 0 still fires at t167 on
base_rate alone. The minimum achievable rate is 0.5; the maximum that never
reaches threshold 8 within 26 turns is < 0.308/turn.

⇒ Capping `coha_expired` alone CANNOT make the stalemate reachable. Reaching it
requires three coordinated changes: cap the coha bonus, lower `base_rate` toward
zero, and give some modifier enough negative weight to hold the sum under 0.308.

## VERIFIED — why RS cannot currently reach an A

- `scoring.ts:42-48` grade thresholds: A+ >= 90, A >= 75, B >= 60, C >= 40, D >= 20.
- `scoring.ts:418-425` `capGradeByCondemnation`: `genocide_condemnation` caps the
  grade at **D**; `authorized_cleansing_condemnation` caps at **C**. The cap can
  only LOWER a grade.
- `scoring.ts:663` `genocide_condemnation` also forces OutcomeClass `failure`.
- `scoring.ts:149` names `genocide_condemnation` (Srebrenica) as the only
  pre-existing condemnation flag.

⇒ If the Srebrenica event always fires, and firing sets the genocide flag, RS is
capped at D in every playthrough and A is unreachable by construction.

**OPEN — NOT VERIFIED.** `tools/hooks/whowrites.mjs genocide_condemnation` finds
exactly ONE writer in src/, a UI label literal at `VerdictScreen.tsx:94`. No
runtime writer was located, and no `condemnation_flag` field appears in
`data/scenarios/**`. The flag's actual set-path is therefore UNCONFIRMED. Any seat
relying on "the event sets the flag" should treat that as an assumption to test,
not a fact in this pack.

## EXISTING PRECEDENT IN-REPO

`data/scenarios/events/war_1993.json:1800` (demilitarization compliance), signed
off by /narrative-designer + /historian, states:

> "...consistent with SENSITIVE_HISTORY_DESIGN_GATE Ring 3 item 10 (no gamified
> atrocity-prevention surface; the only outcome is the absence of a
> genocide_condemnation flag)."

`data/scenarios/events/consequences.json:1575` (Divergence Ring 1):

> "Audit-only: does NOT flip genocide_condemnation. Counter-historical preservation
> of the eastern enclaves through t145."

## THE GOVERNING RULES

- **Enclave guard** (CLAUDE.md Sacred Rules): the panel decides whether the guard
  holds — "Srebrenica/Žepa fall; Goražde/Bihać/Teočak/Sarajevo core hold" — and
  whether a change touches §6. Ordinary verdicts are COMPLIANT / NON-COMPLIANT;
  a breach does not merge.
- **Ring 3** (`SENSITIVE_HISTORY_DESIGN_GATE.md` §1) is an 11-item "Refused" list
  described as exhaustive and binding. Item **#1** = no genocide decision tree.
  Item **#10** = no gamified prevent-genocide mechanic. Ring 3 is NOT among the
  three limbs of the bright line and was NOT delegated to this panel.
- **Bright line** (three limbs): atrocity is never rewarded; enclave outcomes are
  event-owned per canon H1.8; the canon hierarchy. Crossing it requires the
  BROADER EIGHT-SEAT panel plus a canon amendment in the same change.

## WHAT EACH SEAT IS ASKED

1. **Does this change touch §6?** (the panel's call, not the implementer's)
2. **Does the enclave guard still hold** if the historical path continues to fire
   at t162 but a player-driven path can avoid the fall?
3. **Does making the stalemate reachable collide with Ring 3 #1 or #10?** Note
   Ring 3 is outside this panel's delegation — if it is engaged, say so and name
   the escalation.
4. **Does "a way for RS to reach an A" cross the bright line's first limb**
   (atrocity is never rewarded), or is it that limb working correctly — declining
   atrocity ceasing to be punished?
5. **Verdict: COMPLIANT or NON-COMPLIANT**, and whether this needs the broader
   eight-seat panel.

Answer from your own seat only. Do not attempt to reconcile with other seats;
integration is the convener's job.

---

# RULING — §6 panel, closed 2026-08-28

**SPLIT VERDICT. Escalates to the owner** per CLAUDE.md Sacred Rules ("a unanimous
GO is the signature; a BLOCK or split verdict escalates to the owner"). Nothing
merges on the panel's signature.

| seat | verdict | touches §6 | Ring 3 | broader 8-seat |
|---|---|---|---|---|
| Historian | COMPLIANT (3 merge gates) | YES | NO | NO |
| Calibration | NON-COMPLIANT *as specified* | YES | NO | NO |
| Engine/systems | NON-COMPLIANT *as specified* | YES | YES (#10) | NO |
| Red-team | NON-COMPLIANT | YES | YES (#1) | YES + owner amendment |

Ring 3 splits 2-2. Ring 3 is NOT among the bright line's three limbs and was never
delegated to this panel, so that split alone forces escalation independent of the
merge verdict.

## The tally understates the agreement

Three seats reject the PACK'S CONSTRUCTION (lowering `base_rate`), not the idea.
Two of them specify a construction they would accept, and it is the same one the
Historian's COMPLIANT is conditional on:

- ONE new negative modifier, <= -2.7, keyed on a flag FALSE in
  `apr1992_definitive_188w.json` — byte-identical by construction, the default-OFF
  discipline `contain_posture_gate.ts` already documents;
- `base_rate`, `threshold` and the `coha_expired` bonus UNTOUCHED;
- a historical citation on every pressure term, none chosen for its grade outcome;
- a 188w run showing the default path still fires inside
  `historical_anchors.ts:296` expected_week_max 170 (tolerance 3) WITH MARGIN,
  before merge.

Only Red-team dissents on principle (Ring 3 #1: the turn-1 `rs_strategic_goals`
event becomes a genocide decision tree the moment its outcome stops being invariant).

## Convener's errors in the frozen pack — recorded, not edited

1. The pack marked the runtime writer of `genocide_condemnation` UNVERIFIED. It
   exists at `rupture_consequences.ts:74`, as an object-literal VALUE, which is why
   `whowrites` missed it. Confirming it was one grep. Three seats had to close the
   convener's own hole. **Process defect on the pack.**
2. The pack asked whether this crosses bright-line limb 1 (atrocity never rewarded),
   where the comfortable answer is "no". The limb actually engaged is **limb 2 —
   enclave outcomes are event-owned per H1.8** — because the mechanism makes the
   outcome contingent on player-influenceable flags. The pack never asked. Steering.
3. The pack cited `war_1993.json` demilitarization as supporting precedent. It is
   INERT: `sets_flags: {srebrenica_demilitarized: true}` sits at the ROW level
   (war_1993.json:1982), so all three options set it, including "refuse". Found
   independently by three seats. The precedent supports nothing.

## Verified corrections to the pack's mechanism findings

- The rupture predicate is CONTROL-keyed, not event-keyed
  (`rupture_consequences.ts:57-66`): `srebrenica_enclave_formed` +
  `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'` + `turn >= 160`.
  The event supplies the control; it is not the predicate. A non-fall therefore
  yields no flag automatically, with no new mechanic — Ring 3 #10's "the only
  outcome is the absence of a flag" is already the literal implementation.
- The pack's "minimum achievable rate 0.5" is UNREACHABLE. `coha_expires_1995`
  fires unconditionally at w156 with no condition and no pressure; `rrf_deployed`
  cannot be set until t168, six turns after the fall. Real engine minimum is 2.5,
  and the only reachable outcome is t162.
- The event's 10-OSID `control_change` is not the only flip path: 12 flips at t162
  in the live run — 9 event, 1 RS->RS no-op (`brezovice_2`), and 2 via
  `rear_pocket_consolidation.ts:157` (`osmace_2`, `obadi`).
- Red-team's claimed P0(a) — "capture at t159 evades the flag forever" — is FALSE.
  `war_phase_negotiation_steps.ts:53-58` runs the check EVERY war turn; the
  `turn < 160` early return consumes nothing. Evasion requires capturing AND losing
  the cell before t160, which is not taking the enclave.

## Standing blockers independent of the ruling

- **CALIBRATION_MASTER.md:5-10 — STANDING PAUSE.** No calibration change may land
  until RE (Lean Engine Integrity) closes; no current run satisfies RE-0 S0. This
  blocks the validation the ruling would depend on.
- The guard is machine-checked in THREE places and hard-fails on a stalemate-path
  run: `tools/verify_checkpoints.cjs` FALLS list (exit 1), the run's 31-anchor
  contract (both cells are anchors), and
  `tests/collapse_phase1_g2_section6_invariant.test.ts:477-488`. `zepa_falls`
  carries `requires_events: [srebrenica_falls_1995]`, so both FALLS cells break
  together.
- Measured cost on the stalemate path (counterfactual replay, not estimated):
  jan1993 695->695, apr1994 674->674, apr1995 668->668,
  **oct1995 652->642 (-10)** — 7 beyond verify_checkpoints' -3 SCORE_TOLERANCE.

## Not new ground

`csq_srebrenica_stalemate_1995` already exists (`consequences.json:864`,
canon-reviewed 2026-04-22) and is already XOR-anchored at
`historical_anchors.ts:298` citing canon §3.3. This closes a reachability gap in an
approved design rather than opening a new one.

## On the owner's stated goal

The Historian certified THE MECHANISM, NOT THE GRADE, and flagged that reasoning
backwards from "a way for RS to get an A" to a mechanism is what Ring 3 #4 forbids.
If historically-sourced weights leave A out of reach, that is the correct answer.

Red-team's alternative reaches the same goal without any of this: RS's **A** anchor
(`scoring.ts:552-563`) tests only `territory_controlled_pct >= 49 && cohesion >= 30`
— NO war-crimes term — while **A+** carries `war_crimes_events <= 2`. An A is
already purchasable with a full atrocity record. Giving A a war-crimes term is a
scoring change: no §6 crossing, no Ring 3.

## Four defects found en route, independent of the decision

1. `srebrenica_falls_1995` has `family: undefined`, so `isRing3SensitiveFamily`
   returns false at its first line (`event_families.ts:219-228`) — the
   genocide-producing event sits OUTSIDE the mechanical Ring-3 guard. **P0.**
2. The `war_1993` demilitarization choice is vacuous (all three options set the
   flag). Its own source_note also cites an `enclave_resilience` direction on
   `comply_fully` that no option carries.
3. `pressure_system.ts` accumulate branch has no `Math.max(0, ...)` floor — a
   negative modifier sum drives readiness negative without bound.
4. `evaluateCondition` ends in `default: return true`, and `pressure_system.ts:29,48`
   call it WITHOUT edges — a mistyped condition kind on a NEGATIVE modifier applies
   unconditionally and would switch the fall off in the calibration run too,
   silently.

Items 1 and 3 are §6 hardening that need no ruling.
