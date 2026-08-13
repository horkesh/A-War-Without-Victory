# RC Collapse Panel — Reconciler Synthesis (2026-08-13)

> ## OWNER DECISION — TAKEN, NOT PROPOSED
>
> The owner ruled on this synthesis on **2026-08-13**:
>
> - **Option B now** — the Stage 0/0b defect packet plus ONE measurement 188w. Adopted **unconditionally**,
>   as recommended, independent of any later scope call.
> - **Then D-shape** — the canon ruling on whether `local_strain` is §8's "Control Strain".
> - **Then D-selection** — re-source the edge magnitude to combat incidence.
> - **Option C is STRUCK.** "Tune breadth + re-floor", which is what the MASTER_ROADMAP RC row currently
>   says the lane is, is no longer the plan.
> - **D-topology is RESERVED** for an explicit later owner decision.
>
> The recommendation in §8 was adopted essentially intact. **Read §8 as a decision record, not as options
> still open.** The roadmap RC row had not yet been amended to match at the time of writing.
>
> ---
>
> ## WHAT THIS DOCUMENT IS
>
> The integration of a four-seat Pyrrhic panel on workstream **RC** (pressure → exhaustion → COLLAPSE).
> Its companion is the frozen four-seat artifact:
> [`20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md`](20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md).
>
> The two are **different kinds of evidence and are deliberately kept apart**. The artifact records what
> each seat found independently, frozen and unamended. This document records what a single named
> reconciler concluded from adjudicating them. Collapsing the two would destroy the freeze/reconcile
> distinction that gave the panel its integrity — parallel panels in this project detect well and
> integrate badly, and the separation is the countermeasure.
>
> **THE PANEL RAN READ-ONLY. NO SCENARIO WAS FIRED** — no 188w, no 40w, by any seat or by the reconciler.
> The reconciler **sequenced** the measurement run; it did not fire one. Every number here comes from
> existing run artifacts, source reads, or reconstruction, and §"PROVENANCE" separates what the reconciler
> VERIFIED from what it INHERITED from the seats.
>
> ## WHY THIS IS STRONGER THAN THE ARTIFACT ALONE
>
> Because the reconciler questioned the seats and **two claims were retracted under questioning**.
> **CORRECTION TO THIS DOCUMENT'S OWN §0 AND OPENING LINE:** the body says "two seats … both returned
> retractions". That phrasing is imprecise and has already caused a downstream misreading. The accurate
> account is:
>
> - **RC-WarOrGame retracted TWO claims** — (1) its RBiH Tier-0 trip-point failure mode, re-derived and
>   found to be nowhere near the gate; (2) its own recommended BFS-contiguity tripwire, which it showed
>   would yield a false positive.
> - **RC-Systems retracted nothing.** It answered two follow-up questions, confirming one structural
>   finding on all three sub-questions and pricing one option as feasible.
> - **The reconciler logged one self-correction** (the exhaustion timing gate binds HRHB only, not all
>   factions).
>
> So: **two retractions, both from one seat**, plus a reconciler self-correction. The body text at §0
> is left exactly as written rather than silently edited; this note is the correction.
>
> ## THE MOST MISUSABLE OUTPUT OF THIS WORK — READ BEFORE USING ANY NUMBER HERE
>
> The Historian's figures — **8–12 episodes, ~100–180 cumulative OSIDs, 40–80 concurrent at the
> Sept–Oct 1995 peak** — are **SHAPE, NOT ACCEPTANCE THRESHOLDS.** They rest on BB's per-*municipality*
> narrative. The Historian was explicit that per-OSID cascade membership could not be established, that
> the Axis-2 figures are *"orders of magnitude, not fit targets,"* and that the eligible-but-held ratio is
> *"ordinal, not measured."*
>
> Every gap adjudicated in this document — 0 episodes, no representable peak, nothing before turn 108,
> inverted geography, HRHB structurally zero — **holds at any plausible calibration of those numbers**,
> which is why the conclusions stand. But **if a future lane starts fitting to 100–180 as a target, that
> is the moment this panel will have been misread.** See the closing caution in §8.

---

Reconciler: RC-Reconciler (gap-finder). Works from `RC_PANEL_FROZEN_ARTIFACT.md`
(preserved as [`20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md`](20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md)).
Read-only. No scenario runs, no repo edits, no git writes.

Two seats answered follow-up questions after the freeze and **both returned retractions**.
The panel is now stronger than the frozen artifact: two wrong claims are out, replaced by measurement.

## PROVENANCE

**VERIFIED BY ME (reconciler):**
- The 733-edge-turn arithmetic and its temporal envelope (cross-check of two seats' independent constants).
- `data/derived/scenario/baselines/manifest.json` holds only `apr1992_52w`, `baseline_ops_4w`, `noop_4w` — **no 188w entry**.
- `enclave_resilience.ts:116` sweeps `op:velika_kladusa:` into the `bihac_pocket` prefix set;
  `phase3d_collapse_resolution.ts:88` already names Velika Kladuša "the top relax-later" candidate.
- `matched_osids` is a hard gate — `tools/engine_health_gate.cjs:387`.
- apr1992 `scenario_start_week = 0`, so turn == week (`src/scenario/anomaly_detector.ts:1339-1341`).
- **Engine Invariants §8 line 145** and **§8.6** (`docs/10_canon/Engine_Invariants_v0_9_0.md:140-148`) — quoted in §3.
- `computeSupplyReachabilityOsid` is called on the mainline at `war_phases.ts:1297`, not only from Phase 3C.

**INHERITED** — attributed inline to RC-Canon-S6, RC-WarOrGame, RC-Historian, RC-Systems.

---

## 0. RETRACTIONS — carry these forward

**R1. RC-WarOrGame retracts the RBiH Tier-0 trip-point claim.** See §1 for the full account.

**R2. RC-WarOrGame retracts its own recommended contiguity tripwire.** It proposed "assert the damaged
set is BFS-connected, not scattered" as the test distinguishing real cascade from a step function.
Measured, the 34 form components of 7/4/3/2/2/2/2/2 plus 10 singletons — but these are **co-location,
not propagation**: adjacent cells on the same front accrue near-identical edge-turns and cross a fixed
threshold together. The test yields a **false positive**. A reviewer seeing a 7-cell contiguous cluster
in Trnovo/Pale would reasonably conclude a front broke. It had not. **The honest test is structural —
does a neighbour-coupling term exist in the code — not spatial.** Nobody drafting acceptance criteria
may use the spatial version.

**R3. Reconciler's own correction.** I initially read the exhaustion timing gate as a general constraint.
WarOrGame's measurement shows it binds **HRHB only**; for RBiH and RS the supply BFS is binding. The
finding survives and sharpens, because HRHB is precisely the faction the Historian needs cascading in 1993.

---

## 1. WHY THE TRIP-POINT CLAIM WAS WRONG, AND WHAT REPLACES IT

### What was claimed
The frozen artifact's headline failure mode for widening breadth: *"RBiH sits on the Tier-0 spatial trip
point. Gate is isolated >= 10% of controlled; RBiH controls 293 => trips at ~30. Permanently-isolated
enclave OSIDs alone = Srebrenica 11 + Goražde 18 + Žepa 1 + Teočak 1 = 31."* On trip, the whole RBiH front
would go eligible in one turn, permanently.

### Why I refused to hold it
It contradicted the same seat's cliff measurement. If 31 >= 30 held, RBiH's gate would **already** be open
and those 18 RBiH cells would already be collapsing at HEAD — but measured HEAD breadth is 0-or-1. Both
statements could not be true.

### What the seat found on re-derivation
Reconstructing `computeSupplyReachabilityOsid` + `runSupplyBfs` against the validated per-turn control
replay, the gate is **closed for RBiH and nowhere near the line**:

| turn | HRHB | RBiH | RS |
|---|---|---|---|
| 10 | 35/87 = **40.2% OPEN** | 17/265 = 6.4% | 9/360 = 2.5% |
| 50 | 34/87 = **39.1% OPEN** | 14/259 = 5.4% | 0/366 = 0.0% |
| 100 | 25/75 = **33.3% OPEN** | 14/272 = 5.1% | 0/365 = 0.0% |
| 150 | 25/78 = **32.1% OPEN** | 14/272 = 5.1% | 0/362 = 0.0% |
| 188 | 25/102 = **24.5% OPEN** | 3/293 = **1.0%** | 6/317 = 1.9% |

Two errors in the original paper estimate:
1. **Srebrenica and Žepa are RS-held at t188** — they fell. They are not in RBiH's *controlled* set, so
   they cannot be in RBiH's isolated set. Twelve cells were counted that had already left.
2. **Goražde, Bihać and Teočak are NOT BFS-isolated.** Verified individually: `gorazde_2`, `bihac_2`,
   `teocak_krstac_2` all return isolated = **false**.

RBiH's entire isolated set at t188 is **3 OSIDs** (bratunac, srebrenica, vlasenica — one each).

### What replaces it — three failure modes, and the risk relocated rather than fell

**(a) The threshold-cohort step — same signature, different cause, and NOT fixable by gate tuning.**
Measured: **14 of 34 cross on a single turn**; 19 of 34 land in the final eight weeks. Strain is a
monotonic ramp against a fixed 55 line, so a cohort on comparable frontage arrives together. The
observable is the burst the artifact warned about; the mechanism is not a gate flipping. Consequence:
you cannot prevent it by tuning the gate, only by changing the accrual or the shape of the threshold.

**(b) The §6 rim exposure — now the real headline. See §2. Measured, not theoretical.**

**(c) Faction inversion.** Tier-0 is not a threshold pressure could open; it is a **permanent faction
filter**. HRHB's gate is open from turn <=10 at 24-40% (the HVO really is fragmented into Herzegovina
plus central-Bosnia pockets — structurally correct). RBiH's and RS's are effectively hard-wired closed.
**Collapse is an HVO-only mechanic with two factions permanently exempt.** So removing the gate does not
*widen* the mechanic — it **inverts which factions it applies to** (RBiH 18 / RS 16 / HRHB 0). For
calibration that is a one-sided territorial nudge against the two factions the mechanic never touched.

**Net for the owner: the risk did not decrease, it relocated.** The cliff-edge gate hazard is gone; a
measured §6 break path and a faction-inversion hazard replace it.

---

## 2. `op:zvornik:rastosnica_2` — CONFIRMED, with one precision

**Canon-S6's break path is confirmed by WarOrGame's measurement.** The cell is in the 34:

```
op:zvornik:rastosnica_2   strain 56.40   RBiH   guarded=NO   in-1-ring=YES   in-34=YES
```

**Ten of the 34 are 1-ring enclave-rim cells. Zero of the 6 guard-suppressed cells are rim cells.**
The §6 guard covers enclave *interiors*; the cliff lands exactly where it does not reach.

**Chain:** widen breadth -> `rastosnica_2` takes collapse damage -> `getCollapseDefenderMultiplier`
degrades its defender by up to 40% (`attack_resolution_osid.ts:867`, floor 0.6) -> it becomes takeable
through the ordinary combat path -> Teočak's overland corridor is cut -> Teočak is isolated and can fall.
**"Teočak HOLDS" is a §6 enclave-guard invariant and G1 does not protect the cell it depends on**, because
`rastosnica_2` sits in no enclave `osid_list`. The engine's own comment (`enclave_resilience.ts:148-160`)
identifies this corridor as the reason Teočak is supplied and therefore not BFS-isolated.

**Precision on "cheapest breadth lever":** at 56.40 the cell is **1.40 over the 55 floor** — a marginal
cell. That means it appears in essentially *any* RBiH-inclusive widening, not only in the specific
gate-removal lever measured. The exposure is generic to breadth, not an artifact of one lever.
**So yes: the cheapest breadth lever directly exposes the break path, and so would most others.**

**What follows for criterion 7:**
1. It is no longer a vacuous regression check. It **will** be exercised, and it is now the single most
   important criterion in the packet.
2. The 1-ring check **alone is insufficient** — Canon-S6 established the corridor can be cut at depth 2
   (`kalesija:{kalesija_grad_2, kalesija_selo, kikaci}`, `zvornik:sapna`, `tuzla:{gornja_tuzla, simin_han_2}`
   are all RBiH and unguarded) while `rastosnica_2` itself stays RBiH. The **named-chain BFS-connectivity
   assertion** (Teočak in the same RBiH component as Tuzla, ON as in OFF) is what actually catches it.
3. **New, and free: a pre-run static check.** We now know the cell and its exact strain. Before firing any
   breadth run, assert `rastosnica_2` is either guarded or below threshold. If it is neither, you know
   criterion 7 is live **before** spending the run rather than after.
4. **Do NOT use WarOrGame's retracted spatial-contiguity tripwire** anywhere in this criterion.

**What follows for sequencing:**
- This is the strongest single argument against Option C (§5).
- If breadth widening is ever authorized, **the corridor assertion must be written and merged BEFORE the
  widening run, not alongside it.** Criterion 7 becomes a gate on the work, not a check on its output.
- Operational flag: `trnovo:kijevo_2` is also in the 34, and project memory records `kijevo_2` as
  calibration-sensitive (-26 OSIDs / 2 anchor flips when previously touched).

---

## 3. THE FIVE TENSIONS RESOLVED

### T1 — Guard "structural" (Canon-S6) vs "mis-targeted" (WarOrGame P0-4)
**Both right, about three different claims — and the measurement settles which one matters.**

- Canon-S6's "structural" is about the **write-block**: a pure static OSID-space predicate, no runtime
  state, no turn gate, so widening breadth cannot breach it. True.
- WarOrGame's "mis-targeted" is about the **set**. True — both seats independently reached exact
  agreement on 21 RS-held guarded OSIDs and both singled out Lukavica.
- Canon-S6 already conceded the third: the **outcome** invariant is contingent, because the rim is
  unguarded and the combat consumer went live.

So: **structural in fields, contingent in fates, mis-targeted as a set.** No conflict.

Which matters is now measured: 10 of 34 are rim, 0 of 6 suppressed are rim (§2). The contingent-outcome
limb is the live one.

**Carried, and important:** the over-coverage is **accidentally load-bearing**. Lukavica is a 6-edge cell
at 84.6 strain — one of the two highest on the map — and the guard is the only thing preventing the
besieger's corps HQ from collapsing. **Fix the over-coverage and the output gets worse, not better.**
This is EH-3 again (`eh3_stranded_status_load_bearing`). Do not touch the guard set in this lane;
Canon-S6's criterion 1 already forbids it, and this is the reason why.

### T2 — Exhaustion: "zero discrimination" (WarOrGame) vs "timing gate, ~w60 -> ~w84" (Systems)
**Systems is right on substance; WarOrGame is right on the decision; both miss that it becomes binding
the moment you adopt the Historian's target.**

WarOrGame describes the terminal state (all three pass by t188); Systems describes the trajectory. Both
agree it is not binding against today's output.

Turn == week from Apr 1992 (verified), so **w84 ~ late Nov 1993**. WarOrGame's corrected reading: HRHB is
the one faction whose spatial gate is open, and for HRHB **exhaustion is the binding Tier-0 term**,
crossing at w80 => eligible ~w84. The Historian needs HRHB cascading in *1993 mid-late*: Kakanj w62,
Bugojno w67, Vareš w84. **The exhaustion gate deletes Kakanj and Bugojno outright and catches Vareš at
the boundary — for the only faction that can pass Tier-0 at all.**

And the cause is our own recent win: the 2026-08-06 de-saturation moved first-eligibility ~w60 -> ~w84.
The roadmap's staleness trap (a) called this "constants tuned against a curve that no longer exists";
Systems correctly answered that the thresholds still clear. Both are on the wrong axis.
**The cost of de-saturation to RC was not threshold validity — it was timing.**

### T3 — The breadth number
See §4. Settled empirically against the Historian's target. The cliff does not get anywhere useful and
it is systematically the wrong 34.

### T4 — Scope
Framed in §6. Not mine to decide.

### T5 — Sequencing against the enclave guard
**The split is right but two-way where it must be three-way. The Historian is incomplete here.**

The Historian says §6 and breadth are not in tension because the targets are reachable with zero guarded
OSIDs eligible. True about the **guarded set**, false about **§6 outcomes** — `rastosnica_2` is now
measured to be in the cliff set (§2). The Historian is a historian and could not have known this;
Canon-S6 was right.

Correct formulation, replacing the artifact's:
- **Breadth is §6-safe in fields, NOT safe in outcomes.** Criterion 7 plus the named corridor-chain
  assertion is what makes it safe.
- **Cascade is unsafe in both.** Every route enumerated is a neighbour-coupling term; G1 is own-OSID-only.

The roadmap fuses breadth and cascade into one lane. **Split them.**

---

## 4. THE NUMBERS ADJUDICATED

The two seats' constants reconcile exactly: `strain = 0.075 x SUM(edges)`, floor 55 => **733 edge-turns**,
which at 4 edges is 183 turns — matching Systems' independent "C14 is the bottleneck, ~185 weeks of
continuous front contact." Both correct; neither stated the joint consequence.

**Historian target vs measured cliff — five axes, four now measured:**

| Axis | Historian target | Cliff, measured |
|---|---|---|
| Episodes | 8-12 | **0** — no coupling term exists |
| Cumulative OSIDs | 100-180 (14-25%) | 34 (ceiling ~40-49 with *every* gate removed) |
| Concurrent peak | 40-80 at Sep-Oct 95 | **not representable** |
| Factions | all three; HRHB dominant 1993 | RBiH 18 / RS 16 / **HRHB 0** |
| Timing | ~0 in 1992, 1993 bands, Sep-Oct 95 peak | earliest turn **108**, median **184**, 19 of 34 in the final 8 weeks, **nothing in 1993** |

### The temporal envelope (reconciler-derived, then empirically confirmed)
733 edge-turns is a hard floor on *when* anything can fire:

| Target window | Edges sustained from t0 required |
|---|---|
| 1993 early-mid (w62) | **11.8** |
| 1993 mid-late (w84) | **8.7** |
| 1994 H2 / APZB (w122) | 6.0 |
| 1995 Sep-Oct (w178) | 4.1 |

Max observed degree is ~6 (Lukavica). I predicted clustering at ~183-188; measured median is **184**, with
earliest 108 (= 6.8 edges, consistent). **Both of the Historian's 1993 bands — 20-45 OSIDs, roughly a
quarter of the target — receive literally zero, arithmetically and empirically.**

### The peak is not representable at all — CONFIRMED by Systems on all three sub-questions
- `local_strain` has exactly one writer (`updateLocalStrain`, `phase3c_exhaustion_collapse_gating.ts:292-305`)
  whose increment is provably non-negative. No decrement, decay, reset or reinitialization anywhere in `src/`.
  A cell leaving the front freezes at its lifetime peak; it does not fall.
- `collapse_damage` membership is permanent (zero `delete`/clear/decay hits repo-wide) **and** values are
  monotone via `Math.max(damageBefore, severity)` (`phase3d_collapse_resolution.ts:475-476`), so even a
  later severity drop is discarded.

**Therefore CUMULATIVE == CONCURRENT-AT-END by construction, at any breadth, for both count and magnitude.**
The Historian's ~0 -> trough -> peak shape cannot be produced.

### Lowering the floor makes the geography monotonically worse
Strain is monotone in cumulative frontage-days, so ranking by strain **is** ranking by frontage-days.
Lowering C14 admits cells with *less* front contact. Meanwhile the top of the ranking is already
anti-correlated with history — Teočak (Historian C-1: 52 weeks maximal frontage, five ARBiH attacks, zero
movement) and Lukavica (the besieger's HQ). **There is no setting of the strain floor that reaches the
Historian's magnitude without making the selection more wrong.**

### THE MECHANISM — why breadth is zero, stated for the first time
Tier-0 is a permanent faction filter (§1c). HRHB's gate is open; RBiH's and RS's are hard-wired closed.
Now the strain side: HRHB has **zero** cells reaching the strain floor under all three edge assumptions
(closest `op:stolac:stolac_2` at 53.70).

**The only faction eligible to collapse is the only faction that cannot accumulate enough strain to
collapse.** The two gates are anti-aligned by construction: fragmentation means small pockets, few
sustained max-degree cells, low strain; consolidation means long stable fronts and high strain but a low
isolated fraction and a closed gate. This is WarOrGame's design-level finding sharpened into the two-gate
interaction that actually produces the zero. It is not a conjunction that is hard to satisfy — it is one
that is nearly self-defeating.

### The spatial gate is blind to the enclaves it exists for
Verified individually by WarOrGame: `gorazde_2`, `bihac_2`, `teocak_krstac_2` all return isolated = false.
A supply-isolation metric that cannot see Bihać as isolated is not measuring supply isolation. Teočak has
a documented reason (`enclave_resilience.ts:148-160` — reached via the `rastosnica_2` corridor, explicitly
a calibration pin). **Goražde and Bihać do not.** I verified this reaches past collapse:
`computeSupplyReachabilityOsid` runs on the mainline at `war_phases.ts:1297`, and `phase3c:189` states it
is "the same isolation BFS `isEnclaveContainable` reads." If that comment is accurate — and per
`feedback_verify_code_comments` it must be checked, not trusted — the blindness reaches a live,
non-collapse-gated system. **Escalation E2 below.**

### HEADLINE TEST CASE — the episode the engine cannot represent, for two independent reasons
The Historian's clearest, fastest, best-documented cascade is APZB/Velika Kladuša: an entire faction
erased in ~2.5 weeks, Aug 1994 (~w121-124). It is
(i) **arithmetically unreachable** — w122 needs 6.0 edges sustained from turn 0, on a front that did not
exist until 1993; and
(ii) **explicitly guard-suppressed** — `enclave_resilience.ts:116` sweeps `op:velika_kladusa:` into the
Bihać prefix set (VERIFIED), and `phase3d_collapse_resolution.ts:88` already knows it ("the top
relax-later" candidate).
Two unrelated mechanisms independently erase the one episode that would most clearly demonstrate cascade.

---

## 5. WHAT RC IS — the integrated recommendation

### Do I agree with the three-seat convergence? YES — and I also found the narrow version. Both.

**I agree that breadth is the wrong question, and I tested it rather than inheriting it.**
WarOrGame closes four paths from X's collapse to neighbour Y. I looked for a fifth and found one the
enumeration misses: the **control feedback loop** — the combat consumer is live, so collapse -> weaker
defender -> X flips -> isolated fraction rises -> Tier-0 more likely to trip. But it runs through the
**faction-wide** gate, which is a step function, not local propagation. It cannot break a front; it can
only trip a whole faction at once. **It is a feedback path, not a cascade path — it raises false-positive
risk rather than adding capability.** WarOrGame's corrected numbers weaken it further (RBiH at 1.0%
against a 10% gate leaves enormous slack). **The hole I found makes the convergence stronger, not weaker.**

**Where I dissent: the seats did not price the cheapest interventions.** Every route WarOrGame proposed is
a neighbour-coupling term. Two much smaller doors exist, and the seats' follow-up answers priced them both.

### Narrow-B — SELECTION. Re-source the edge magnitude to combat incidence.
Systems' feasibility read: **no new persisted field, no phase-order violation, no ordering hazard.** The
OSID combat resolver is pipeline step 94 (`war_phases.ts:2873`); Phase 3C is step 158 — combat resolves
**64 steps upstream in the same turn**, and `context.report.attack_resolution_osid.battles[]` already
carries per-battle `target_osid`, factions, outcome, casualties. Cross-step `context.report` reads are an
established pattern right there (`phase5d` reads `context.report.exhaustion`, `war_phases.ts:4057-4059`).
It is a **signature change, not plumbing** — two functions gain one argument, ~20-40 LOC.

This fixes P0-1, P0-2, C-1 and C-3, and is the only candidate that could pass the Historian's
pre-registered **C-2 acceptance test** (Drvar vs Šipovo: same corps, same week, opposite outcomes — any
metric returning the same value for both is falsified). Corroboration: the IV-e report already used this
exact field manually to prove `hatelji_2` was uncontested.

**Two conditions that must not be buried:**
1. `pressure_exposure.ts:99-100` carries a standing IV-b restriction — *"FORBIDDEN without a fresh §6
   review — review Condition 4."* Different source, same class of move; Condition 4 presumptively applies.
2. Substantively: keying strain to attacks-received puts **Srebrenica, Žepa and Goražde at the top of the
   strain table**, because they are the most-attacked OSIDs on the map. Mechanically safe — `target_osid`
   is defender-side own-OSID, no neighbour coupling, and G1 sits at the `collapse_damage` write so no
   protected field can be written regardless of registered strain. But it turns `local_strain` into an
   "amount of attacking suffered" register with the genocide enclaves at the top of it. The #368 panel
   already ruled upstream strain entries on enclaves are not a guard breach
   (`pressure_exposure.ts:106-110`); that precedent should be **re-affirmed against the new semantics,
   not assumed to carry.**
3. **Specify the no-combat fallback deliberately or it becomes a silent behavior fork.**
   `attack_resolution_osid` is only written when operational data is loaded; `battles[]` is empty on
   quiet turns. Falling back to M1-uniform gives a hybrid magnitude; falling back to zero means strain
   accrues only on fought-over turns — which is what you actually want and the honest reading of
   "frontage-days -> combat-days", but it changes the accrual scale and forces a C11/C14 re-derivation.

### Narrow-C — SHAPE. Allow strain to recover. A canon question first, code second.
Systems flagged that §8 may have been applied to collapse fields by analogy. I read the text.
`docs/10_canon/Engine_Invariants_v0_9_0.md` §8 is titled **"Exhaustion Invariants"**, and line 145 states:

> *"Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system."*

**Canon does not merely fail to mandate monotone strain — it affirmatively says Control Strain is
reversible.** §8.6's monotonicity clause is scoped to "any bounded *exhaustion* read." So the panel
question is narrow: **is `local_strain` the "Control Strain" of §8?** Two answers, very different
consequences — if yes, the current implementation is a §8 **non-compliance**, not a design choice; if no,
adding decay is unconstrained. Either way it is decided by reading canon, not by a redesign.
**This is the cheapest door in the whole lane.**

Related, and consolidating two ledger items under one root question: §8.6 **explicitly prohibits**
transcendental functions — *"`exp`, `pow`, `log`, `tanh` are prohibited — they are not correctly-rounded
across V8 versions/platforms and would fork the save-state calibration hash."* Systems found `Math.exp` at
`phase3a:218,223`. If Phase 3A's quantity is a bounded exhaustion read, that is a **direct §8.6 canon
violation**, not merely a style concern. Same scoping question, same panel.

### The synthesis the seats did not reach
**Narrow-B and Narrow-C compose into a correct pressure model.** Strain that accrues *when attacked* and
decays *when not* is precisely the historical mechanism — the Historian's preconditions are all acute
events, and their "controls that HELD" list is full of formations that absorbed cascade-grade strain and
recovered (Bihać Nov-Dec 1994; Goražde Zvezda 94; Bosanska Krupa; Ozren Sep-Oct 1995). Together: ~40-80
LOC plus two canon rulings, **neither adding neighbour coupling.** It still will not cascade — that needs
topology — but it would make the model measure the right cells with the right shape, which is the
precondition for cascade being worth adding at all.

### What RC is, plainly
Not "tune breadth + re-floor": breadth is a solved question with a bad answer. Not necessarily a full
redesign either. It decomposes into four lanes the roadmap fuses into one:

1. **Hygiene** — defects + the missing §6 proof. Calibration-inert; no scope decision needed.
2. **Selection** (Narrow-B) — one input, own-OSID, ~20-40 LOC, testable against C-2.
3. **Shape** (Narrow-C) — a canon reading, then a small change.
4. **Topology** — genuine cascade. Neighbour coupling; genuinely reopens §6; genuinely a redesign.

Lane 4 is the roadmap's stated completion criterion. Lanes 1-3 deliver real value without it.

---

## 6. THE ORDERED WORK PLAN — serial vs parallel

### STAGE 0 — PARALLEL with any other lane. Calibration-inert. No run.
Touches nothing on the OFF path; runs alongside R6 or anything else.
- **Doc-only:** defects 3, 4, 5, 12 below.
- **Harness-only:** defect 1.
- **BLOCKING for measurement validity — must land before Stage 2:** defects 7 and 8.
- **Document, do NOT fix here:** defect 9 (fixing dead consumers is a behaviour change; correcting the
  panel's mental model is the deliverable).
- **Byte-identity proof required, not assertion:** defect 2. `ENCLAVE_DEFINITIONS` is also read by the
  live `enclave_resilience.ts`, so this is **not** trivially inert (napkin rule 0).

### STAGE 0b — SERIAL-BEFORE-STAGE-2. Calibration-inert while gated OFF.
Defect 6 (`computeSeverity` ignores `persistence`). It is ON-path behaviour: land it after R1 and R1
measured the wrong severity function. Nothing is lost by changing it first — Systems established the June
OFF reference `ad190ed644972150` is on a different scenario hash with 30 anchors and a pre-repaint
reference and **must not be used as the OFF side of any pair.**

### STAGE 1 — R0, the OFF baseline. ZERO RUNS, conditionally.
Reuse `n220` (Systems verified marker-free). It also supplies the OFF-baseline RBiH-held rim filter that
criteria 4 and 7 depend on — Canon-S6 used `data/derived/latest_run_final_save.json` as a proxy and
explicitly disowned it; read `n220/final_save.json` instead.

> **THE GATE THAT DECIDES ONE 188w OR TWO:** criterion 2 wants a marker-verified pair *at post-change
> HEAD*, and every Stage-0 commit moves HEAD. Reusing `n220` as the OFF side is licensed **only** if the
> whole Stage-0 diff is provably OFF-path-inert by file inspection. Make that call explicitly before
> firing Stage 2, not after.

### STAGE 2 — R1: ONE 188w, `ENABLE_COLLAPSE=true`. STRICTLY SERIAL.
Owns the calibration lane exclusively; no other calibration-moving lane may run concurrently.
Per Systems this may settle breadth alone: the sole June collapse OSID `op:stolac:hatelji_2` is RS at t0
**and** t188 and never flips (0 mentions in `control_delta.json` for n215 and n220), so HEAD breadth is
plausibly **0, not 1** — and any argument resting on "the one collapse we observed" rests on a two-month-old
engine.

### STAGE 3 — evaluate the pair against criteria 1-9. No run.
- **Criterion 4 as Canon-S6 corrected it: ON-vs-OFF byte-identity across the full 84-key space, NEVER
  absolute RBiH-held.** Worded literally it already fails at HEAD (21 of 84 guarded OSIDs are not held by
  their enclave's faction); an implementer gets a red test on day one and the likely "fix" reverts to the
  four capitals — the exact hole the criterion closes.
- **Criterion 7 plus the named Teočak corridor-chain assertion**, per §2 — now the packet's most important
  criterion, with the pre-run static check added.
- **Do NOT use the retracted spatial-contiguity tripwire.** Use the structural test.
- **Criterion 8: full `anchor_checks` array diffed against 629 / 31-of-31, never net matched**
  (`feedback_net_matched_masks_anchor_flips`; Brčko is the precedent).

### STAGE 4 — owner scope decision (§7).

### PARALLEL-SAFE SUMMARY
- **Parallel (calibration-inert):** Stage 0 in full; both escalations E1/E2; all canon-reading work for
  Narrow-C.
- **Serial (owns the calibration lane):** Stage 2, and every subsequent territory-moving run.
- **Ordering constraints:** 0 and 0b before 1; 1 before 2; 2 before 3; 3 before 4.

### SCHEDULING COLLISION THE OWNER MUST SEE
The roadmap deliberately sequences RC **before** R6 final calibration ("collapse moves territory, so it
must precede final calibration or the map gets calibrated twice"). RC's serial run and R6's remaining work
cannot both hold the lane. Brief under Options A/B; a long hold on R6 under Option D-topology.

---

## 7. THE DEFECT LEDGER — 12 items with file:line

Six were labelled or implied as defects in the frozen artifact (marked **[tracked]**); six are new,
extracted from seat findings that were not filed as defects (marked **[NEW]**).

| # | Defect | Location | Class |
|---|---|---|---|
| 1 | **[tracked]** D1 — unguarded `collapse_damage.by_entity` writer (CLI harness) | `tools/.../phase3abc_audit_harness.ts:1193` | Harness-only; inert |
| 2 | **[tracked]** D2 — dead keys `op:gorazde:novakovici`, `op:gorazde:zorlaci` in `ENCLAVE_DEFINITIONS`; list reads 18, only 16 resolve | `src/sim/combat/enclave_resilience.ts:112-252` | Needs byte-identity PROOF — `ENCLAVE_DEFINITIONS` also feeds live enclave resilience |
| 3 | **[tracked]** Stale header comment — its own revisit condition ("if ever wired into defender-strength") was met by PR #398 / `03eb82c4e`; never updated | `src/sim/collapse/phase3d_collapse_resolution.ts:153-159` | Doc-only |
| 4 | **[tracked]** `FORAWWV §6` citation points at nothing — headings are roman numerals; content at §IX.6, H1.8/H1.9/H2.1/H2.4. Operative §6 is `SENSITIVE_HISTORY_DESIGN_GATE.md` | `CLAUDE.md`; `docs/10_canon/FORAWWV.md` | Doc-only |
| 5 | **[tracked]** BB2 cited by KB index, not printed folio — **all BB2 citations off by 19** | `docs/10_canon/HISTORICAL_TIMELINE_MASTER.md` | Doc-only |
| 6 | **[tracked]** `computeSeverity` never references its `persistence` argument — chronic and acute give identical severity | `src/sim/collapse/phase3d_collapse_resolution.ts:222-246` | ON-path behaviour; **must land before R1** |
| 7 | **[NEW]** Collapse flags **never reset** — `resetEnablePhase3*` exists only in the audit harness, so an ON run **contaminates any later run in the same process** | `src/sim/collapse/` gate + audit harness | **BLOCKING for measurement validity** |
| 8 | **[NEW]** §6 gate test orders run dirs by **filesystem mtime**; `runs/` has ~25 unmarked 188w dirs and **zero marked** => **G2-A and G2-B skip today**, so a green suite is a **FALSE GREEN for §6** | `tests/collapse_phase1_g2_section6_invariant.test.ts:77` | **BLOCKING for criterion 3** |
| 9 | **[NEW]** Three of four documented consumers are **DEAD** — two read **settlement** edge ids while 3D writes **OSID** keys (wrong keyspace; `front_pressure` additionally has 0 entries); the third has no behavioural consumer anywhere in `src/` | `src/sim/pressure/front_pressure.ts:150-151`; `formation_fatigue.ts:217,229`; `loss_of_control_trends.ts` | **Document only** — fixing is a behaviour change |
| 10 | **[NEW]** `E_collapse = 100` is **provably unreachable** post-de-saturation — the asymptote keeps `war_exhaustion < 10000` strictly, so `/100 < 100` always. Pre-fix it hit exactly 100 | `src/sim/collapse/phase3a...:38` | Inert while OFF |
| 11 | **[NEW]** `Math.exp` — the only implementation-defined math in the pipeline. **Upgraded by me from "style bar" to canon:** Engine Invariants **§8.6 explicitly prohibits `exp`/`pow`/`log`/`tanh`** on any bounded exhaustion read. If 3A's value is such a read, this is a direct §8.6 violation | `src/sim/collapse/phase3a...:218,223` | Inert only because 3A feeds the dead 3B; scoping question = Narrow-C's |
| 12 | **[NEW]** `will_not_recover` **enforces nothing** — written at one site, read only by `tools/verify_collapse_section6.cjs:147-158` and the §6 test. **Zero sim consumers.** The name promises enforcement it does not provide; irreversibility actually comes from the `Math.max` in defect-6's neighbourhood | `src/sim/pressure/loss_of_control_trends.ts:133` | Doc/naming; inert |

### TWO ESCALATIONS — NOT RC's to fix. Route them out of this lane.
- **E1. The 188w has no golden-hash gate.** VERIFIED BY ME: `data/derived/scenario/baselines/manifest.json`
  holds only `apr1992_52w`, `baseline_ops_4w`, `noop_4w`. So the 188w floor has `matched_osids_min`
  (hard-gated, `tools/engine_health_gate.cjs:387`) and **no structural fingerprint** — while napkin 0e
  states *"cross-platform authority = the structural fingerprint, NOT the health gate."* For 188w that
  authority does not exist. This affects every 188w floor claim in the project, not just RC.
- **E2. The supply BFS is blind to Bihać and Goražde**, and `computeSupplyReachabilityOsid` runs on the
  mainline (`src/state/supply_reachability_osid.ts:71`, called at `war_phases.ts:1297`). Verify whether
  `isEnclaveContainable` really reads the same BFS as `phase3c:189` claims; if so, this is a live
  enclave-logic defect independent of collapse.

---

## 8. THE OWNER'S SCOPE DECISION — options, costs, recommendation

**This is Tension 4, and it is explicitly the owner's call. I frame it; I do not decide it.**

### Option A — Close RC as built-and-parked; defer post-1.0
- **Buys:** clears the 1.0 critical path immediately; zero 188w spent.
- **Costs:** the roadmap's cascade criterion is unmet at 1.0 — though by the roadmap's own words RC
  *"does NOT improve the historical-match score — the gain is dynamics, emergent realism and
  thesis-depth,"* so no calibration number moves.
- **Risk:** the pipeline has rotted once already (June numbers unreproducible; constants tuned against a
  removed curve). Parking again guarantees a fourth re-measurement, with 17 constants and a live combat
  consumer sitting inert meanwhile.

### Option B — Narrow: Stage 0/0b defect packet + one measurement run, then stop
- **Buys:** everything in A, **plus** the §6 empirical proof that is **currently absent** (zero
  `collapse_enabled.json` markers across 102 run dirs; the only ON PASS on record is expired; G2-A/G2-B
  skip today), plus a real HEAD breadth number replacing the stale June 1, plus a marker-verified ON/OFF
  pair that any future resumption starts from instead of re-measuring a fourth time.
- **Costs:** one serial 188w plus the inert packet.
- **Does not buy:** cascade.

### Option C — Tune breadth + re-floor, as the roadmap currently says
- **Buys:** N goes ~0 -> ~34.
- **Costs:** one-to-several serial 188w, the full 9-criterion §6 packet, a re-floor against 629 / 31-of-31.
- **Against:** the output is now *measured* wrong in magnitude (34 against a ~40-49 hard ceiling, target
  100-180), episode count (0 against 8-12), faction mix (HRHB 0, structurally), shape (cumulative ==
  terminal; no peak possible), timing (nothing before turn 108, median 184, 19 of 34 in the last eight
  weeks), and geography (selects the fronts that historically held) — **and it puts collapse damage on
  `rastosnica_2`, the cell Teočak's §6 hold depends on.**

### Option D — Address the model. Three variants, priced very differently
- **D-shape (Narrow-C):** a canon ruling on whether `local_strain` is §8's "Control Strain." Cheapest
  door in the lane; one possible answer is that the current implementation is already non-compliant.
  Bundles the §8.6 / `Math.exp` scoping question.
- **D-selection (Narrow-B):** re-source the edge magnitude. ~20-40 LOC, no new plumbing, no neighbour
  coupling. Needs a fresh §6 review under Condition 4 and re-affirmation of the #368 precedent against
  the new semantics.
- **D-topology:** the only route to actual cascade. Cheapest defensible route is neighbour-loss-as-a-
  strain-STEP (Historian precondition 4, adjacent-front failure, which BB names most often and which the
  Historian ranks co-equal with the top three). Reopens §6 — but per Canon-S6 this is an **ordinary panel**
  call, not the eight-seat bright-line panel, since it adds an unguarded pathway rather than relaxing the
  guard for the six §6 enclaves. **Canon-S6 should confirm that reading before anyone commits.**

### MY RECOMMENDATION — labelled as a recommendation; the owner decides
1. **Do B now, unconditionally, whatever the scope call.** The §6 empirical proof is missing and the §6
   gate test is a false green. That is a hygiene obligation, not a feature investment, and it is cheap.
2. **Strike C.** It is the option the roadmap currently names and the one the evidence most clearly
   rules out.
3. **Then take D-shape first** — it is a canon reading, not a code change, and it may reveal a compliance
   problem rather than an opportunity. **Then D-selection.** Together: roughly one small PR and two canon
   rulings, no neighbour coupling, and the model would measure the right cells with the right shape.
   **Getting the right 34 is worth more than getting more of the wrong 34.**
4. **Reserve D-topology for an explicit owner decision** that the cascade criterion must be met before
   1.0. If it must, R6 final calibration waits on it. That is the real price and it should be paid
   knowingly rather than discovered.

### ONE CAUTION AGAINST OVER-READING THIS PANEL
Three seats converged and I have largely upheld them — exactly the configuration where a shared wrong
premise survives. The shared premise is that the Historian's target is the right target. It rests on BB's
per-**municipality** narrative, and the Historian is explicit that per-OSID cascade membership could not
be established, that the Axis-2 figures are *"orders of magnitude, not fit targets,"* and that the
eligible-but-held ratio is *"ordinal, not measured."* That candour is why I trust the direction. But the
100-180 and 40-80 figures are **shape, not acceptance thresholds** — and every gap adjudicated here
(0 episodes, no representable peak, nothing before turn 108, inverted geography, HRHB structurally zero)
holds at any plausible calibration of those numbers. **If a future lane starts fitting to 100-180 as a
target, that is the moment this panel will have been misread.**
