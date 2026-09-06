# §6 Panel Record — Ahmići gate, enclave dating, canon-vs-data

**Convened:** 2026-09-06 · **Integrator:** the convener of the
[event-firing investigation](../20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md), who **is not a
seat** (implementer ≠ reviewer).
**Authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md:213` — Historian + scenario-tester/
calibration + Engine/systems + Red-team, incl. `/war-or-game` and `/game-designer`. Unanimous GO = the
signature; a BLOCK or split escalates to the owner.
**Method:** five seats polled **independently and in parallel**, each briefed with evidence rather than
toward a conclusion, each told explicitly that refuting the convener's framing was in scope. No seat saw
another's verdict. No code, data, or canon was changed by this panel.

**Seat verdicts:** [Historian](20260906_S6_PANEL_SEAT_HISTORIAN.md) ·
[Scenario/calibration](20260906_S6_PANEL_SEAT_SCENARIO_CALIBRATION.md) ·
[Engine/systems](20260906_S6_PANEL_SEAT_ENGINE_SYSTEMS.md) ·
[Red-team](20260906_S6_PANEL_SEAT_RED_TEAM.md) ·
[Game designer](20260906_S6_PANEL_SEAT_GAME_DESIGNER.md)

---

## 1. Result

| Seat | P1 Ahmići | P2 enclave dating | P4 canon-vs-data | Overall |
|---|---|---|---|---|
| Historian | NON-COMPLIANT | NON-COMPLIANT | COMPLIANT | **GO** (5 conditions) |
| Game designer | NON-COMPLIANT | — | COMPLIANT | **GO** (9 conditions) |
| Red-team | NON-COMPLIANT | NON-COMPLIANT | COMPLIANT | **GO, conditioned** |
| Engine/systems | NON-COMPLIANT | NON-COMPLIANT | — | **GO** (7 conditions) |
| Scenario/calibration | COMPLIANT | COMPLIANT (1 hard condition) | — | **GO** (4 conditions) |

**UNANIMOUS GO. The signature is given** — repair work on P1 and P2 may proceed **to a plan**.

**The P1/P2 split is a difference of standard, not of fact.** No seat disputed any measurement. The
calibration seat reads "COMPLIANT" as *this breaches no calibration gate and the effects are bounded*;
the other four read it as *this is a historical-fidelity defect*. Both are true of the same rows.
Recorded as a split of framing, not escalated as a split verdict.

**P4 is unanimous COMPLIANT** and needs no build. See §4.

---

## 2. What the panel REFUSED

The GO does not authorize the plan as the convener scoped it. Four things are refused outright:

| Refused | Why | Seat |
|---|---|---|
| **Fixing Srebrenica's date in isolation** | Puts Markale II (fires w170) and Deliberate Force (w171) at or before the fall. Substitutes a worse inversion than the one it fixes. **Net fidelity regression.** | Red-team (BLOCK on that plan shape) |
| **`turn_min 171` + `turn_max 172`** | Activates the `rrf_deployed −0.5` brake for the first time in the game's history; readiness reaches 7.0 < threshold 8 and the window closes. **Srebrenica never falls — §6 breach in the exact direction the guard exists to prevent.** | Engine/systems |
| **Repainting Vitez to match `operational_initial_master.json`** | `hybrid_1992` never reads the master (`political_control_init.ts:895-898` is the fall-through path); the census is the authority. Repainting is the Sacred Rule *"NEVER override initial OSIDs."* **Refused in advance so nobody proposes it as "just fixing a data divergence."** | Red-team, Historian |
| **Gating on the OSID that contains Ahmići** (`preocica_3`) | Would encode *"the HVO already held Ahmići"* as the precondition for the massacre — inverting the fact. **The obvious fix is the historically falsifying one.** | Historian |

Also refused: deleting the control condition (railroad); touching `turn_min: 54` (16 Apr 1993 is exact);
bumping `CONTAIN_RELEASE_TURN_BACKSTOP` 160 → 171 "for consistency" (eleven extra weeks of suppressed
VRS targeting against Goražde and Bihać); narrowing `turn_max` at all.

---

## 3. What the panel AGREED

### P1 — repair the gate, not the date, not the map

**Four seats converge on the same fix and all four reject the alternative.** Replace the municipality
threshold with `territory_control op:vitez:vitez_2 = HRHB`.

- It is the **perpetrators' basing cell** — Blaškić's Operative Zone HQ, the Viteška Brigade, the
  Bungalow at Nadioci (*Blaškić* TJ). The gate then reads "the HVO holds Vitez town," the documented
  precondition for the 16 April 1993 attack.
- It stays **falsifiable**: if the ARBiH ever takes Vitez town, Ahmići does not occur. Constant-true in
  the historical run because the history is constant, not because the predicate is vacuous.
- Collateral is **zero** — `vitez` appears exactly once as a `faction_controls_municipality` municipality
  in the entire catalog.

**`0.5 → 0.33` is rejected** on three independent grounds: it survives on the fourth decimal
(`1/3 ≥ 0.33` true, `≥ 0.34` false), so a later tidy-up silently re-kills the event; it is unfalsifiable
in a 3-OSID municipality and reduces the gate to a calendar trigger, against
`MASTER_ROADMAP.md:282`; and it is merge-fragile — a 4th Vitez OSID makes `1/4 < 0.33` and the event
dies again with no test failing.

**The root cause is not OSID granularity.** `1.00 ≥ 0.5`, so granularity only bites because HRHB holds
one cell. The historically correct state of Vitez at this resolution **is** 1-of-3 — the HVO held the
town, Bosniaks held Kruščica and Preočica. **The gate demands 2-of-3, i.e. an ahistorical HVO position,
as the precondition for the historical massacre. The map is right; the threshold is wrong.**

Ahmići is also **not in `vitez_2`** — census `S160113` merges into `S160318` (Pirići), a constituent of
`op:vitez:preocica_3`, which is RBiH-held and correctly so. Ahmići was a Bosniak village the HVO
*attacked*. The retarget is right for the basing-cell reason, not the "HVO-held zone" reason the
investigation gave.

### P2 — a coherent packet, not a single field

The minimum coherent packet (red-team's dates, for the Historian to ratify):

| Event | Current | Corrected | Real |
|---|---|---|---|
| `tuzla_gate_massacre_1995` | 160 | 164 | 25 May 1995 |
| `un_hostage_crisis_1995` | 160 | 164 | 25 May – 18 Jun 1995 |
| `srebrenica_falls_1995` | 160 | **171** | 11 Jul 1995 |
| `srebrenica_column_breakout_1995` | 160 | 171 | 11-16 Jul 1995 |
| `zepa_falls_1995` | 160 | *(inert — see below)* | 25 Jul 1995 |
| `second_markale_massacre_1995` | 165 | **178** | 28 Aug 1995 |
| `nato_deliberate_force_1995` | 165 | **178** | 30 Aug 1995 |

**Žepa needs no edit.** It fires exactly 2 turns after Srebrenica's receipt via `requires_events` +
`pressure {base_rate 3, threshold 6}`; its own `turn_min` is inert. 11 Jul → 25 Jul is 14 days —
exactly two weeks. Fix Srebrenica and Žepa lands correctly for free.

**The value must be measured, not computed.** With the brake live, rate is 3.5 not 4, so `turn_min 171`
yields a fall at **w173**, not w171. State the remedy as a target — *the receipt lands in w171* — and
solve for `turn_min` against the brake-on rate on a **188w** run. Constraint:
`turn_max ≥ turn_min + ceil(threshold / rate) − 1` under brake-on.

**The enclave guard cannot adjudicate this.** `verify_checkpoints.cjs:181` asserts RBiH through w156 and
RS at w188; any fall in (156, 188] passes identically. **A passing guard has never been evidence about
the date, and no §6 verdict should cite it as such.**

**P2 is re-floor-class, not a data tweak** — 12 OSIDs sit RBiH nine weeks longer, and the
`enclave_formation_displacement` reconstitutes ~3,150 ARBiH personnel at `op:zivinice:gracanica_2`,
sliding across Deliberate Force, Storm, and Sana/Mistral 2. Named blast radius:
Zivinice–Lopare–Posavina, w171-179. Controlled 188w, full `anchor_checks` diff, never bundled with P1.

### P4 — no build; annotate the stale document

Unanimous. `SENSITIVE_HISTORY_DESIGN_GATE.md` is CANON Tier 2 and its header states it **supersedes
`MASTER_ROADMAP.md` open question #7 — *"Srebrenica: how do we handle the genocide mechanically and
narratively?"*** by name. `ENDGAME_AND_NEGOTIATION_DESIGN.md` is headed *"Status: DESIGN — awaiting
review and refinement,"* dated 2026-03-15, and is filed **by the gate's own §9** as *"original design
discussion."* `MASTER_ROADMAP.md` §6.4 **agrees with the gate**.

⇒ **Not a conflict of authorities. Two documents agreeing and one stale line dissenting.** The shipped
data (zero `response_options`) is the gate being obeyed. The defect is the doc.

**Every seat that ruled votes NO on building a Srebrenica restraint decision, and two say they would
vote no on the broader eight.** A restraint branch is Ring 3 #1 verbatim (*"genocide is never … a
multi-option event"*), and because the doc prices it as *"less humanitarian cost"* it is also #5 and #10.
The historical objection is independent of the gate: *"occupy without massacre"* was the defence theory
the tribunals rejected — Directive 7 set the object at the strategic level in March 1995 (*Krstić* ¶28),
and *Krstić* found the forcible transfer of ~25,000 from Potočari part of the genocidal conduct
(¶¶595-599). **Offering the branch teaches that the genocide was a battlefield decision by a man with an
alternative in front of him.**

**Output:** annotate `ENDGAME_AND_NEGOTIATION_DESIGN.md:339` decision #4 as SUPERSEDED by gate §1
Ring 3 #1/#10. **Leave decision #5 (Storm) alone** — Storm is an operation, not an atrocity, and
`operation_storm_1995` at w174 = 4 Aug 1995 is exact. Correct only as wide as the conflict. Standard
four suffices for the annotation; **building** the decision would require the broader eight.

---

## 4. Escalated to the OWNER — beyond this panel's authority

Both change *who owns enclave outcomes*, which is the bright line. Broader eight seats, unanimous, and
surfaced to the owner **while still a proposal**:

1. **Replacing the event-owned enclave fall with an emergent siege-culmination mechanic.**
2. **Resolving the Ring 3 #10 / H1.8 contradiction** — #10 promises the player they may hold the enclave
   through ordinary military means, while H1.8 makes the outcome event-owned.

The contradiction is sharper than it reads. `srebrenica_falls_1995`'s own trigger requires RBiH to
**still hold** `op:srebrenica:srebrenica_2` — so **holding the enclave is a precondition of losing it.
Successful defence is the trigger for the fall.**

---

## 5. New items opened by the panel (not ruled on)

| # | Item |
|---|---|
| **P9** | `enclave_defended` — the gate's own "canonical §3-compliant counterfactual recorder" (`:199`) is gated on `enclave_held_through_turn`, which has **no production writer**, and `tests/observer_flag_writer.test.ts:226-230` asserts nothing writes it. Blocked by P2, not by §6: while Srebrenica falls unconditionally at w162 the flag can never be true. Sequence after P2. |
| **P9-canon** | `SENSITIVE_HISTORY_DESIGN_GATE.md:199`, `dynamic_section_builder.ts:453-456` and `War_Specification_v0_9_0.md:129` all specify the predicate on **`op:zepa:zepa_2` — an OSID that does not exist.** The only Žepa OSID is `op:rogatica:zepa_2`. Anyone implementing the writer from canon builds a predicate that can never be true. Prerequisite to P9. |
| **P10** | **The Ring-3 mechanical guard is unarmed on the events P4 is about.** All seven 1995 rows have `family: undefined`, and `isRing3SensitiveFamily` returns false on a falsy family (`event_families.ts:219`). The data is compliant by authorial restraint, not enforcement. Needs its own §6 pass. |
| **P11** | **Three flag semantics coexist**: `flag_not_set` (key presence), `flag_equals` (strict `===`), `isTruthyFlag` (coercing). The Codex and the event system disagree about what a flag *is*. Latent, not live — pin with a test; do **not** change `flag_not_set` engine-wide. |
| **P12** | **`min_controlled: <n>`** — an integer form for the control predicate, removing the fraction↔integer mismatch at source, invariant under re-merge, calibration-flat. Ships the *class* fix that the Ahmići retarget does not. |

---

## 6. Corrections the panel made to the convener's own record

Recorded because each was committed before it was refuted, and the record should show the refutation
rather than a smoothed-over result.

1. **"Ahmići is the only hard blocker of its kind"** — wrong. `operation_lukavac_93` is a second, on the
   same arithmetic. The sweep asserted an instrument did not exist without looking for one, in a repo
   whose checkpoint scorer had been using it all along.
2. **"No run artifact carries per-turn control"** — wrong. `political.control_events` is exactly that,
   and `verify_checkpoints.cjs:83-89` already replays it.
3. **"The gate encodes a map resolution that does not exist"** — true and irrelevant. `1.00 ≥ 0.5`.
4. **"Ahmići is a village in the HVO-held zone"** — wrong. It is in RBiH-held `preocica_3`, correctly.
5. **"The real defect may be that Vitez never flips"** — wrong. An observer would find a *flipping*
   Vitez absurd; `enclave_resilience.ts:810-816` models the HVO pockets deliberately.
6. **"0 of 599 battles ever target the enclave"** (project memory) — **false.**
   `vrs_drina:Operation Cerska-Kamenica:t40` targeted `osmace_2`, `radovcici`, `sulice_2`: 7 attacks,
   0 captured, `capture_provenance: "no_objectives_held"`. **Attacked and never taken**, not never
   attacked.
7. **"Srebrenica flips by a single event write"** (project memory) — incomplete. t162 carries 12 control
   records: 10 `event` (one a RS→RS no-op) **and 2 `consolidation`**.
8. **The §E premium lint "would have caught both Vitez and Trnovo"** — wrong. Trnovo's premium is 0.0;
   it would have caught Vitez only.
