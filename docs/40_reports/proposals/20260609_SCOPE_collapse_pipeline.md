# SCOPE — Phase 3A→3D Pressure / Exhaustion / Collapse Pipeline (finding N1)

**Type:** READ-ONLY scoping. No code, no runs. Deliverable = effort / risk / recommendation.
**Source finding:** `docs/40_reports/proposals/20260609_ORPHANED_WIRING_AUDIT_engine.md` §N1.
**Question (owner):** what is the COST of wiring the collapse pipeline ON for 1.0?

---

## TL;DR

- **Build-completeness verdict: PARTIALLY STUBBED — not flip-a-flag.** The 4 war-phase
  steps are registered and run every turn; the *consumption* side is genuinely
  wired (capacity modifiers feed back into the live `front_pressure` and
  `formation_fatigue` pipelines). BUT three load-bearing pieces inside the
  pipeline are explicit placeholders, and one is a hard fail-fast guard:
  1. `PHASE3C_CONSTANTS_VERIFIED = false` — Phase 3C **throws** if enabled. All
     its thresholds are `SPEC VALUE REQUIRED` placeholders.
  2. `buildStateAccessors()` (Phase 3A) returns `undefined` for exhaustion /
     cohesion / posture — the state→edge coupling is a no-op stub.
  3. Phase 3C coherence gates (`checkSuppression`, `checkImmunity`,
     `checkTier1Suppression/Immunity`) and `checkSpatialDegradation` are
     `// Placeholder` returns.
  4. Phase 3D severity/impact constants are all `SPEC VALUE REQUIRED` guesses.
- **Calibration risk: HIGH and real (not inert).** The output modifiers
  multiplicatively reduce pressure generation (`pressure_cap_mult`,
  `supply_mult`) at collapsing settlements via `front_pressure.ts:149-167` and
  reduce formation supply via `formation_fatigue.ts:216-231`. Enabling it WILL
  move OSID territory and therefore the 649 floor and anchors.
- **§6 risk: YES — sign-off required.** A collapsing RBiH degrading its own
  authority/supply in the eastern enclaves intersects the Srebrenica/Žepa fall
  invariant directly. This is exactly the class the 1.0 DoD rules "v1.x by
  definition."
- **Effort: finish-unbuilt-logic + heavy recalibrate**, NOT flip+recalibrate.
  Estimate **~150–300 LOC of net-new/replacement engine logic + spec
  derivation**, **≥8–15 serial 188w runs** (likely a multi-session calibration
  campaign), plus a **§6 historian/owner gate** and new test surface.
- **Recommendation: POST-1.0 (v1.x).** It is the thesis pillar, but it is a
  §6-touching, calibration-moving, partially-unbuilt system landing during
  calibration-LAST. The DoD already classifies it there. Keep the inert steps;
  guard their per-turn registration to remove the perf/clarity wart.

---

## 1. What is actually built

### 1.1 The 4 registered war-phase steps (`war_phases.ts:3696–3772`)

| Step | Name | Gate | What it WOULD do |
|------|------|------|------------------|
| 3A | `phase3a-pressure-eligibility` | `getEnablePhase3A()` | Loads `settlement_contact_graph_enriched.json`, builds per-edge **coupling weights** `w ∈ [0,1]` from contact type × distance × shape × (state) × (posture). Writes effective edges into `context.phase3aEffectiveEdges` (in-memory, not persisted) + an audit report. |
| 3A' | `phase3a-pressure-diffusion` | `getEnablePhase3A() && getEnablePhase3ADiffusion()` | Diffuses pressure across eligible edges. Double-gated; diffusion sub-flag is also OFF. |
| 3B | `phase3b-pressure-exhaustion` | `getEnablePhase3B()` (+ requires 3A on, + requires effective edges) | Couples sustained front pressure → **monotonic per-faction exhaustion accrual** (`inc = min(p·0.02·w, 1.0)`, split half/half per front edge, floored, irreversible). |
| 3C | `phase3c-exhaustion-collapse-gating` | `getEnablePhase3C()` (+ requires 3B on) | Reads `faction.profile.exhaustion` vs thresholds; sets **collapse ELIGIBILITY** (Tier-0 faction + Tier-1 per-settlement) after N persistent turns + a coherence gate. Accumulates `local_strain` per settlement. |
| 3D | `phase3d-collapse-resolution` | `getEnablePhase3D()` (+ requires 3C on) | Reads Tier-1 eligibility + `local_strain` → computes **severity** → writes monotonic `collapse_damage` and derives `capacity_modifiers` (`authority_mult`, `cohesion_mult`, `supply_mult`, `pressure_cap_mult ∈ [0,1]`) per settlement. |

Dependency chain is strictly serial: 3D needs 3C needs 3B needs 3A. All four
default-getter to `false`. The only `setEnablePhase3X(true)` call sites are the
CLI audit harnesses (`src/cli/phase3abc_audit_harness.ts:965–978`,
`phase3a_ab_harness.ts`). **No `scenario_runner` / desktop / sim entrypoint ever
flips them.** Confirmed via grep — zero non-harness, non-test setter calls.

### 1.2 The consumption side IS wired (this is the important part)

The output of 3D is **not** a dead sink. `src/sim/collapse/capacity_modifiers.ts`
exposes `getSidCapacityModifiers()` / `getEdgeCapacityMultiplier()`, and these
are read by **live, always-on** sim code:

- **`front_pressure.ts:149–167`** — `supply_mult` multiplies the supplied-intent
  term and `pressure_cap_mult` multiplies the generated pressure delta (documented
  as "the SOLE application point for pressure_cap_mult"). This is the core
  pressure→combat pipeline.
- **`formation_fatigue.ts:216–231`** — `supply_mult` scales per-edge / per-region
  formation logistics (with priority multiplier).
- **`loss_of_control_trends.ts:121–204`** — reads modifiers + `collapse_damage`
  to set `capacity_degraded` / `supply_fragile` / `will_not_recover` diagnostic
  flags (a Phase 5d step that also runs every turn).

Because the modifiers default to `1.0` and 3D never populates them today, these
three consumers are byte-stable no-ops **right now**. The instant 3D writes a
`< 1.0` modifier for any settlement, the feedback loop becomes live: a collapsing
settlement generates less pressure and supplies its formations worse → territory
and combat shift. **This is why N1 is a genuine calibration lane, not inert
substrate.**

### 1.3 What is STUBBED inside (the unbuilt glue)

| Location | Stub | Consequence if flipped as-is |
|----------|------|------------------------------|
| `phase3c…:54,367` | `PHASE3C_CONSTANTS_VERIFIED = false` → **throws** `Phase 3C FREEZE VIOLATION` | Pipeline cannot run at all past 3B without first verifying constants against Engine Invariants / Systems Manual + a design review. **Hard blocker by design.** |
| `phase3c…` constants (`:58–74`) | `EXHAUSTION_THRESHOLD_* = 50`, persistence `3`, `TIER1_*_THRESHOLD = 20`, `STRAIN_FRACTION 0.1` — all `SPEC VALUE REQUIRED` | Thresholds are guesses; calibration meaningless until canon-derived. |
| `phase3a…:170–192` `buildStateAccessors` | exhaustion/cohesion/posture/pressure all return `undefined` (comments: "we'd need to map settlement to faction"; "not yet implemented in state") | Phase 3A `f_state`/`f_posture` coupling factors are inert → weights are geometry-only. The state→pressure coupling the design intends is **not built**. |
| `phase3c…:207–219,306–316` | `checkSuppression`, `checkImmunity`, `checkTier1Suppression`, `checkTier1Immunity` → `// Placeholder ... return false` | No suppression/immunity rules — every eligible faction collapses with no brake. |
| `phase3c…:185–202` `checkSpatialDegradation` | "placeholder — actual implementation would use supply reachability"; uses `supply_sources.size / controlled.size` proxy | Spatial gate is a crude proxy, not real reachability. |
| `phase3d…:41–50` | `STRAIN_THRESHOLD/MAX`, `SEVERITY_MIN`, `AUTHORITY/COHESION/SPATIAL_IMPACT = 0.5` — `SPEC VALUE REQUIRED` | Severity→damage→modifier magnitudes are placeholders. |

Note: `accumulateExhaustion` (`exhaustion.ts`) — the **live, always-on** exhaustion
accrual — already increments `faction.profile.exhaustion` every turn independent
of 3B. So 3C would read real, already-growing exhaustion the moment it is enabled;
it does not strictly need 3B's additional accrual to find factions over threshold
50. (Whether factions actually cross 50 within 188w under the live accumulator is
itself a calibration unknown that must be measured before authoring thresholds.)

---

## 2. Behavioral / calibration impact

**It changes outcomes — confirmed via the consumption trace, not assumed.**

- The lone mechanical lever is `pressure_cap_mult` × `supply_mult` reducing
  pressure generation and formation supply at degraded settlements
  (`front_pressure.ts`, `formation_fatigue.ts`). Lower pressure generation at a
  collapsing faction's settlements directly alters the pressure→breach→control
  pipeline that the 649 floor is calibrated on.
- **Sacred anchors / 649 floor: threatened.** Any faction crossing the collapse
  threshold in the historical 188w run would suppress its own pressure output in
  a region, which can flip OSIDs near the line. The Zvornik garrison-pin anchor,
  the Sana follow-on cluster, and the Sarajevo siege ring are all pressure-driven
  and near calibration margins — exactly where a new multiplicative term lands
  hardest.
- **Magnitude is unknown and unbounded by design** — severity/impact constants
  are placeholders, so the effect size is whatever the (un-authored) spec values
  produce. Could be negligible (if no faction crosses threshold in 188w) or
  large (if RBiH/HRHB exhaustion crosses 50 mid-campaign). Must be measured.
- **Re-calibration scale:** because the new term touches the same pressure
  pipeline as the entire OSID calibration, this is not a localized lane. Realistic
  expectation = **a multi-run, possibly multi-session re-floor**: derive constants
  → 188w measure → tune severity/impact → re-measure → reconcile anchors → final
  re-floor. The one-change-per-run rule applies, and the pipeline has ~6 tunable
  constants that interact.

---

## 3. §6 surface

**Yes — §6 sign-off required.**

Collapse resolution operates per-settlement and can fire for **RBiH**. The
eastern enclaves (Srebrenica, Žepa, Goražde, Bihać) are RBiH-held, isolated,
high-pressure, and supply-fragile — i.e. the settlements *most* likely to register
spatial/authority collapse and the *exact* settlements covered by the
Srebrenica/Žepa fall + genocide-rupture invariant that the DoD ratified as
"locked & unsuppressible."

Two §6 failure modes:
1. **Premature/altered fall** — collapse-driven supply/pressure degradation moves
   the enclave fall off its scripted/event-gated timing (a §6 outcome must not be
   reshaped by an unverified mechanic).
2. **Suppressed fall** — if a collapse-damage interaction *stalls* the rupture
   release (the DoD's stated worst case: "a stuck release would suppress the
   Srebrenica fall — a worse §6 failure than not building it").

Per the DoD: §6 mechanics are **v1.x by definition — they cannot land after the
final re-floor.** Wiring collapse ON is a §6-mechanic change to enclave-bearing
settlements → owner + historian gate, default-off, historian-verified before any
flip. Non-delegable.

---

## 4. Effort estimate

**Classification: "finish unbuilt logic + heavy recalibrate" — NOT "flip a flag + recalibrate."**

| Workstream | Scope | Rough LOC / effort |
|------------|-------|--------------------|
| Spec derivation | Canon-derive Phase 3C/3D constants (8 thresholds + 6 impact constants) from Engine Invariants + Systems Manual; design review; flip `PHASE3C_CONSTANTS_VERIFIED` | doc + review, ~0 LOC but **gated on canon work** |
| Build 3A state coupling | Implement `buildStateAccessors` (settlement→faction exhaustion map, cohesion, posture) — currently all-`undefined` | ~40–80 LOC |
| Build 3C gates | Real `checkSpatialDegradation` (supply reachability) + suppression/immunity rules (or deliberately ratify "none for 1.x") | ~40–80 LOC |
| Wire the enable path | Thread `setEnablePhase3A/B/C/D` (+ diffusion) into `scenario_runner` behind a scenario flag (default OFF); ensure 3D's `recompute…` not needed in live path | ~20–40 LOC |
| §6 guard | Hard exclusion / verification that enclave-bearing RBiH settlements cannot have their scripted fall reshaped or suppressed by collapse damage | ~20–40 LOC + historian sign-off |
| Test surface | Unit tests for each newly-built gate + a determinism test (the steps are async/file-loading in 3A) + a regression test asserting default-OFF byte-identical | ~150+ LOC test |
| **Calibration** | Derive→measure→tune→reconcile, one-change-per-run, 188w each | **≥8–15× 188w runs; plausibly a multi-session campaign** |

**Net engine LOC: ~150–300** of new/replacement logic (the audit harness already
proves the mechanics *execute*, so this is gap-filling, not greenfield). The
dominant cost is **not LOC — it is the calibration campaign + the §6 gate + the
canon constant-derivation**, any of which can stall the lane independently.

---

## 5. Done-definition + recommendation

### "Collapse is live + healthy" means:
1. `PHASE3C_CONSTANTS_VERIFIED = true` with every constant canon-derived (not placeholder).
2. The four stubs (3A accessors, 3C spatial/suppression gates) built or their
   absence explicitly ratified.
3. Enabled in the historical scenario by default with a deliberate **new re-floor**
   that holds **30/30 anchors** and a defensible OSID count (may differ from 649 —
   per `feedback_calibrate_a_healthy_engine_not_the_floor`, a healthier engine that
   moves the floor is acceptable IF owner-signed).
4. **§6 proven**: Srebrenica/Žepa fall + rupture record still fire reliably and at
   correct timing with collapse ON — historian + owner sign-off.
5. Collapse is **player-legible** (the negative-sum "your faction is breaking"
   signal surfaced — the `loss_of_control_trends` flags exist but have no
   player-facing surface today).

### Recommendation: **POST-1.0 (v1.x).**

Reasoning:
- It is genuinely the **thesis pillar** (the "political collapse" half of
  negative-sum), so the instinct to want it for 1.0 is right *in spirit*.
- But every gate the 1.0 DoD uses to defer work applies to it simultaneously:
  it is **§6-touching** (enclaves), **calibration-moving** (pressure pipeline),
  **partially unbuilt** (4 stubs + a fail-fast guard + unauthored constants), and
  it would have to land **during calibration-LAST / before the single
  finalization re-floor** — which the DoD explicitly forbids for §6 mechanics
  ("v1.x by definition — they cannot land after the final re-floor").
- The 1.0 DoD does **not** list collapse as a MUST-HAVE or SHOULD-HAVE; it sits
  in the POST-1.0 "substrate may ship; surface defers" posture. The substrate
  already ships (steps registered, consumers wired) — that is the correct 1.0 end
  state for this system.
- The true 1.0 blocker is the full-campaign playtest (D2), not this. Spending a
  multi-session calibration campaign + a §6 gate on a thesis-pillar mechanic is a
  **v1.x flagship lane**, not 1.0 finish-work.

### For 1.0 (cheap, do now): tidy the wart, don't wire the mechanic.
The audit's secondary point stands: 4 always-on steps that early-return are a
perf/clarity wart. **Guard their registration** (skip pushing the 4 steps into the
pipeline when all gates are off — they are runtime-flag-gated, so this is a
build-time list filter, byte-identical) **or** document the gate inline. ~10–20
LOC, calibration-flat, removes the per-turn `computeFrontEdges` cost the
disabled 3B/3C steps still pay. This is the only 1.0-appropriate action here.

---

## Appendix — evidence map

- Steps registered: `src/sim/turn_phases/war_phases.ts:3696–3772`
- Gates default false: `phase3a_pressure_eligibility.ts:19-21`, `phase3b…:19-21`,
  `phase3c…:20-22`, `phase3d_collapse_resolution.ts:25-27`
- Setters harness-only: `src/cli/phase3abc_audit_harness.ts:965–978`;
  `src/cli/phase3a_ab_harness.ts:725` (grep: zero non-harness/non-test setter calls)
- Fail-fast guard: `phase3c…:54` (`PHASE3C_CONSTANTS_VERIFIED=false`), `:367` (throw)
- 3A accessor stub: `phase3a…:170-192`
- 3C placeholders: `phase3c…:185-219,290-316`
- Consumers (live): `capacity_modifiers.ts:38,53` →
  `front_pressure.ts:149-167`, `formation_fatigue.ts:216-231`,
  `loss_of_control_trends.ts:121-204`
- Live exhaustion accrual (independent of 3B): `exhaustion.ts:79-87`
- 1.0 DoD scope: `docs/plans/2026-06-08-v1.0-definition-of-done.md` (§MUST-HAVE,
  §POST-1.0, conflict-resolution #2)
