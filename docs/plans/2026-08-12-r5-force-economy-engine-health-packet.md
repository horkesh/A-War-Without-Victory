# Packet — Force Economy / Force-Density Engine Health

**Date:** 2026-08-12
**Lane:** **R6-owned pre-1.0 gate**, engine-health in character (NOT the calibration-% half of R6)

**Placement, stated precisely because it is easy to get wrong.** This is **not a new lane and not an R5
reopen.** `MASTER_ROADMAP.md` §5 already names the **"RS force-density lane"** and the **"deferred RS
force-density knot (Brčko↔Doboj/Gračanica corridor over-subscription)"** — both inside **R6**, both as
pre-1.0 gates. **R5 is CLOSED** (2026-08-05, at the ~1,086 ms/turn performance floor) and its scope was
performance/stability, not force behaviour; nothing here reopens it.

R6 bundles two different kinds of work under one row: *historical gameplay depth* and *final
calibration*. The force-density knot is the **engine-health half**. So the owner directive
(2026-08-12: *"stop chasing calibration, engine health is paramount"*) is satisfied **inside R6** by
working this gate and parking the match-% grind — it does not require a lane change or a resequence.

**Roadmap staleness to correct on adoption:** R6 still describes `op:brcko:brcko` as an accepted 30/31
interim debt "owned by Phase 4 + the RS force-density lane." That anchor debt **closed 2026-08-11** —
the attacker firepower-deficit mechanic (`dc66c6fc0`) took the floor to 31/31. The knot is still live;
that particular anchor is not.

---

## 1. Problem statement

The engine has **no slack in its force economy**. Any commitment of a brigade is effectively zero-sum
against some other front, and *which* brigade gets committed is decided by an unstable, position-based
rule with no hysteresis. Two consequences follow, both demonstrated this session:

1. **Historically-correct data fixes cannot be paid for.** Two independent, well-evidenced objective
   additions each achieved their target and each lost more elsewhere than they gained:

   | change | target | anchors | outcome |
   |---|---|---|---|
   | `op:trnovo:kijevo_2` → Operation Prsten | taken | **29/31** | matched −26; 34 regressed in non-anchor western Krajina; western cascade collapsed |
   | `op:zvornik:djulici` → Operation Drina | taken | 31/31 | matched −6; **9 regressed in the contiguous Birač belt**; western cascade intact |

   The `djulici` case is fully traced: adding one objective extended Operation Drina t0→t10 → t0→t12,
   which cost `rs_1st_birac` ~480 personnel and displaced it (t40: `brezovice_2` 1676 → `bratunac_2`
   1192). Šekovići ×3, Vlasenica, Kladanj, Olovo, Doboj and Ugljevik then fall. **One brigade is
   simultaneously the Zvornik sweep's muscle and the only thing holding Birač.**

2. **Outcomes turn on arbitrary selection.** The western 1995 campaign's success or failure traces to
   which of two interchangeable 2800-man HVO guards brigades is committed at Kupres
   (`hvo_3rd_guard_jastrebovi` vs `hvo_1st_guard_abb`). Both healthy, both available, neither
   destroyed. Nothing historical cares which leads; the engine makes the campaign depend on it.

**Both items are calibration-independent.** Neither requires a view on any painted snapshot.

---

## 2. Sub-items, in recommended execution order

### EH-F1 — Participant-selection stability (recommended first: cheapest, best-understood)

**Evidence.** `operation_opportunities.ts:1185-1210` — `selectEligibleOpportunityParticipants` iterates
`axis.brigades` in **catalog authoring order** and takes the first N passing five binary filters (corps
match, `isEligibleOperationFormation`, `personnel >= MIN_ATTACK_PERSONNEL`, `disrupted_turns === 0`,
`movementState[id].status !== 'in_transit'`). **No scoring, no sorting, no tie-break, no incumbency
preference.** Under `minimum` commitment `targetCount = floor(len/2)`, so half the axis is dropped on
authoring position alone. The roster is then **baked permanently** into `assigned_brigades` at spawn
(`spawnCorpsOperationFromOpportunity:1122`).

Aggravating factor, confirmed from `war_phases.ts` execution order: `apply-brigade-movement` (1542) and
`process-brigade-movement` (1728) both run **before** `apply-resolved-opportunity-decisions` (2057) in
the same turn. So the `in_transit` flag the selector filters on is set by an earlier phase of that very
turn — a transient, intra-turn condition permanently determines a 1995 campaign's roster.

**Proposed change.** Add a stability rule: prefer the **incumbent** (a brigade already committed to this
corps's previous operation) and otherwise order candidates by a **stable key** when they are within
tolerance on the filter-relevant dimensions. Deterministic, `strictCompare`-sorted, no new tunable
beyond a tolerance constant.

**Risk class.** LOW-MEDIUM. Touches selection for opportunity ops only; does not alter combat math,
territory rules, or any gate. But it is a shared path — every opportunity op across all factions uses
it, so it must be measured at 188w.

**Acceptance criteria (see §3 — note matched is advisory).**
- **Mechanism invariant (binding):** under a deliberate early perturbation, the brigade committed to a
  given late-war operation must NOT change. This is directly testable: re-run the `djulici` or `kijevo_2`
  perturbation and assert Mistral 1 still fields the same brigade. **This is the actual success test.**
- Anchors 31/31; §6 invariants correct.
- Op-stream commonality vs baseline reported; expected to *rise* (that is the point).

### EH-F2 — Reserve depth / dual-role brigades

**Evidence.** The `djulici` trace above. `rs_1st_birac` is on Operation Drina's `zvornik_sweep` roster
**and** is the effective garrison for the Birač belt. There is no third option and no reserve.

**Investigation before any change (do not skip).** Enumerate, across all factions, brigades that are
simultaneously (a) on a pre-planned or opportunity op roster and (b) the sole or dominant defender of a
municipality cluster. If the count is small, this is a targeted OOB/roster question. If it is large, it
is a structural reserve-depth question and the fix is architectural, not data.

**Proposed change.** Deferred pending that enumeration. Candidate shapes, none endorsed yet: a garrison
reservation that excludes a sole-defender brigade from offensive rosters; an explicit reserve pool; or
OOB depth added where the historical record supports it.

**Risk class.** HIGH if it touches OOB or garrison rules — this is the class that produced EH-3's −39.
**Do not begin until EH-F1 lands and the enumeration is done.**

### EH-F3 — Operation-stream stability under perturbation

**Evidence.** A single early OSID change replaced **15 of 38** operations (`kijevo_2`); a
territorially-inert probe replaced **0 of 38**; a broken-op probe replaced **8 of 38**. The overlap
between the two perturbing runs' replaced sets is **7**, against **3.16 expected under random draw** on
a maximum of 8 — a statistically real **susceptible set**, concentrated in `vrs_1st_krajina` (Munja
t97, Ponor t104, Stjena t115) and `arbih_4th_corps` (Osvit t124, Ihlas t132, Pravda t175), plus
`arbih_3rd_corps` Farz 95 t162.

**Hypothesis to test, not assume.** These corps emit opportunity operations from a **marginal decision
boundary**, so any upstream perturbation re-rolls them. Cheap to investigate: two independent runs
already hit the same seven.

**Proposed change.** None yet — this is a diagnosis item. Likely overlaps EH-F1 (if selection stabilises,
some churn may resolve for free), so **measure after EH-F1** before designing anything.

**Risk class.** N/A while diagnostic.

### EH-F4 — RS `war_exhaustion` carries no information (separate flag)

**Evidence.** RS `war_exhaustion` is **bit-identical** between two runs that diverge in territory and
battles — `9110.026111973562` at t120 in both, verified at full float precision, while RS territory moves
367→368. Cause unknown; suspected per-turn clamp interacting with asymptotic headroom.

**Risk class.** UNKNOWN until diagnosed. Note this intersects R6 Phase 4 (exhaustion input re-pacing),
which is a **separate, already-scoped, canon-gated lane** — this packet only *reports* the anomaly and
must not silently re-open Phase 4.

### EH-F5 — Mid-war combat is largely territorially inert (classification needed, not a fix)

**Evidence.** In one probe pair, **first battles divergence t10, first control divergence t157** — 147
turns of demonstrably different fighting produced byte-identical territory.

**This is NOT yet a defect.** Attrition without ground change is historically normal for 1993-94 Bosnia,
so it may be correct fidelity. **Requires a war-or-game verdict before anyone acts on it.** It also
explains why the op stream can churn substantially at low calibration cost, which is useful context for
EH-F3.

---

## 3. Acceptance criteria — deliberately NOT keyed on `matched_osids`

This session established that `matched_osids` is the wrong primary instrument for this class of work:

- **A single-change 188w A/B may not be interpretable for changes moving territory early.** One
  observation (n210) shows 40% of the intervening op stream replaced. **This remains a hypothesis at
  n=1** — no second early-territorial perturbation exists in the archive to corroborate it — but it is
  enough to stop leaning on the metric.
- **The reference itself moved.** `op:gorazde:kolovarice` was repainted RBiH → RS on 2026-08-12 from
  verbatim primary source, restating the floor 639 → 638 **with the engine unchanged**. Any comparison
  against a pre-2026-08-12 "639" is against a reference containing a known error.
- **Mechanism-first conclusions survived this session's instrument crisis; delta-first ones did not.**
  The Ključ Lever 2 verdict held because it was traced to a brigade physically in Travnik with no
  reachability check. Four separate delta-based readings were refuted.

**Therefore, for every change in this packet:**

**BINDING**
1. The **mechanism invariant** stated for that sub-item (e.g. EH-F1: the committed brigade does not
   change under perturbation). This is the success test.
2. **All 31 anchors pass**, verified on a full non-net `anchor_checks` diff, entry by entry.
3. **§6 enclave invariants correct** — Srebrenica + Žepa fall; Goražde, Bihać, Teočak, Sarajevo core
   hold. Enclave-guard sign-off remains non-delegable owner authority.
4. `engine_health_gate` passes all 7.
5. **One change per 188w run.** No bundling, and explicitly **no adopting a measured regression on the
   promise of a later offsetting change**.

**ADVISORY (report, do not gate)**
6. `matched_osids`, reported with its delta and a full per-OSID FIXED/REGRESSED classification — never a
   net count.
7. **Op-stream commonality vs baseline** (from `operation_aars.json`, never the weekly report's `ops`
   field, which is a scalar `{enabled, level}`).
8. Whether damage is **contiguous** with a named mechanism's home region (real cost) or **scattered**
   (likely churn). This distinction is what separated the `djulici` −6 from noise.

**STOP CONDITION.** Two consecutive tunings of the same predicate toward the same map outcome is
reverse-engineering. Hard stop at attempt two; write a diagnosis instead.

---

## 4. Sequence

```
EH-F1 (selection stability)  ── land, measure ──┐
                                                ├─→ EH-F3 re-measure (churn may resolve free)
EH-F2 enumeration (no change) ──────────────────┘
                                                └─→ EH-F2 design, only if enumeration justifies it
EH-F4 diagnose (report only; must not re-open R6 Phase 4)
EH-F5 war-or-game classification (verdict, not a fix)
```

**Naming note:** this file is named `...r5-force-economy...` for URL stability since it was first
written under an incorrect R5 assumption. The lane is **R6** per the header. Do not rename; do not infer
R5 ownership from the filename.

EH-F1 first: cheapest, best-understood, has a clean binding invariant, and may reduce EH-F3 for free.
EH-F2 is the highest-risk item and must not start before the enumeration exists.

## 5. Explicitly out of scope

- **All calibration chasing.** Per owner directive. The corridor mismatch lanes (Cerska trigger date,
  the ~9 orphaned corridor OSIDs, Ključ) stay parked. Note the evidence predicts they would behave like
  `kijevo_2` and `djulici` — correct in isolation, paid for elsewhere — which is itself an argument for
  fixing the force economy first.
- **Repainting the remaining Goražde rim** (`hrancici`, `faocici_2`, `zorovici`). LOW-MODERATE evidence
  resting on absence-of-evidence; needs one boundary decision, not three cell edits.
- **The `op:gorazde:kolovarice` merge defect** (23 constituent settlements, 41.7 km², straddles the front
  line, wrong under any single controller). Real, but a **data-pipeline** item, not force economy.
- **R6 Phase 4 exhaustion re-pacing** — separate, canon-gated, already scoped. EH-F4 reports into it,
  does not reopen it.
- **The `anyApproaching` multi-axis readiness fix.** Diagnosed and panel-escalated (4/4
  GO-WITH-CONDITIONS, no signature, owner-escalated). Independent of this packet; do not bundle.

## 6. Evidence index

Full derivation, all runs and all refutations:
`docs/40_reports/20260811_SARAJEVO_ROMANIJA_DRINA_CORRIDOR_MISMATCH_TRIAGE.md`.
Runs: `n200`-`n214` under `runs/apr1992_definitive_188w__9e902ad68783fbe7__w188_*`.
Retained diagnostic: `src/sim/combat/axis_readiness_debug.ts` (env-gated, proven byte-identical; delete
when the `anyApproaching` fix lands).
