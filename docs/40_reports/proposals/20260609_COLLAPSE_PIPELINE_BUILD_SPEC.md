# BUILD SPEC — Phase 3A→3D Pressure / Exhaustion / Collapse Pipeline

**Type:** READ-ONLY build specification. No engine code, no flag flips, no canon edits in producing this.
**Status:** DRAFT for owner ratification. Engine work is blocked on the §6 sign-off (§4) and the constants ratification (§3).
**Predecessor:** `docs/40_reports/proposals/20260609_SCOPE_collapse_pipeline.md` (effort/risk/recommendation). This doc extends that scope into a buildable plan; it does not re-derive its findings.
**Re-sequencing context:** Owner has moved collapse from POST-1.0 to the **next major engine build — BEFORE the D2 full-campaign playtest and BEFORE the final calibration**. Rationale: collapse moves territory, so the single finalization re-floor must follow it, and D2 must validate the complete engine. The scope doc's "POST-1.0" recommendation is therefore **overridden by owner re-sequencing**; this spec assumes collapse ships pre-1.0.
**§6-SENSITIVE.** Collapse fires per-settlement and can reach the eastern genocide-rupture enclaves. The §6 guard (§4) is non-delegable owner + historian sign-off. This document FLAGS; it does not DECIDE.

---

## 0. TL;DR for the owner

- **What collapse is, mechanically (verified; corrected per Codex review on PR #368 P1):** Phase 3D writes `state.political.collapse_damage.by_entity[entityId]` (monotonic damage tracks; `getOrInitCollapseDamage` `:103`) **and derives** `state.political.capacity_modifiers.by_sid[osid]` from that damage (four multipliers in `[0,1]`; `updateCapacityModifiers` `:169–188`, also reconstructible via `recomputePhase3DCapacityModifiersFromDamage` `:197`). The damage track is also read directly by `loss_of_control_trends.ts:132`, which sets `will_not_recover` from the presence of a `collapse_damage` entry. These outputs are **already consumed** by live code (`front_pressure.ts`, `formation_fatigue.ts`, `loss_of_control_trends.ts`). Collapse therefore degrades a settlement's *pressure generation* and *formation supply*; it does **NOT** ever flip `political_controllers`. This is the single most important §6 fact: **collapse cannot directly fall an enclave** — it can only indirectly starve/soften it, which combat then resolves. (Canon §9.6 lists "internal authority collapse" as an *authorized* control-change mechanism, but Phase 3D **does not implement a control flip** — and this spec recommends it stays that way for 1.0.)
- **What's built vs stubbed:** 3A geometry weights = built; 3A *state coupling* = stubbed (all accessors return `undefined`). 3B exhaustion accrual = built. 3C eligibility state-machine = built, but its **constants are unverified placeholders** and three gates (`checkSuppression`/`checkImmunity`/`checkSpatialDegradation`) are placeholders, and a fail-fast (`PHASE3C_CONSTANTS_VERIFIED=false`) **throws** if enabled. 3D severity/damage→modifier derivation = built, **constants unverified placeholders**.
- **The load-bearing deliverable (§3):** the constants table. Canon (Engine Invariants §8, Systems Manual §7.1–7.3) gives the **invariants** (monotonic exhaustion, multi-causal/delayed collapse, no passive control flip) but **no numeric values** — the frozen Appendix A/B/C numeric tables were archived in the v0.4→v0.9 fold. So every constant is an **owner/design decision with a proposed default**, not a canon citation. This spec proposes defaults + rationale; ratification is required before `PHASE3C_CONSTANTS_VERIFIED` flips.
- **LOC estimate:** ~210–360 net engine LOC + ~200 test LOC. **Calibration: 10–16 serial 188w runs** across likely 2–3 sessions.
- **Build order:** constants ratification + §6 guard sign-off (gates) → 3A accessors → 3C gates → 3D bounds → enable behind a scenario flag → calibration campaign → re-floor. §6 guard lands BEFORE any enable.

---

## 1. Phase-by-phase contract

Data flow (verified end-to-end):

```
state (exhaustion, authority, formation fatigue, supply_sources, front_pressure)
  │
  ├─[3A] enriched contact graph + buildStateAccessors → effective edges (w∈[0,1])   [in-memory: context.phase3aEffectiveEdges]
  │
  ├─[3B] front_pressure × w → faction.profile.exhaustion (monotonic +)              [state, persisted]
  │
  ├─[3C] exhaustion vs thresholds + persistence + coherence gate
  │        → collapse_eligibility (Tier-0 faction) + collapse_eligibility_tier1 (per-OSID)
  │        + local_strain.by_entity (monotonic accumulator)                          [state, persisted]
  │
  └─[3D] Tier-1 eligibility + local_strain → severity → collapse_damage (monotonic)
           → capacity_modifiers.by_sid[osid] = {authority_mult, cohesion_mult, supply_mult, pressure_cap_mult}  [state, persisted]
                 │
                 ├─→ front_pressure.ts:149–167   supply_mult scales supplied-intent; pressure_cap_mult scales generated delta (SOLE site)
                 ├─→ formation_fatigue.ts:201–235 supply_mult scales per-edge/per-region logistics × priority
                 └─→ loss_of_control_trends.ts    reads modifiers + collapse_damage → diagnostic flags (capacity_degraded / supply_fragile / will_not_recover)
```

The chain is strictly serial (3D requires 3C requires 3B requires 3A). All four gate to `false` via getters; only the CLI audit harnesses (`phase3abc_audit_harness.ts:965–978`, `phase3a_ab_harness.ts`) ever call the setters. No scenario/desktop/sim entrypoint flips them today.

### Phase 3A — Pressure eligibility (`src/sim/pressure/phase3a_pressure_eligibility.ts`)

| | |
|---|---|
| **Inputs** | `data/derived/settlement_contact_graph_enriched.json` (edge geometry: type, centroid_distance_svg, bbox_overlap_ratio); per-edge state via `StateAccessors` (exhaustion/cohesion/posture/pressure). |
| **Transform** | `w = base(type) × f_distance × f_shape × f_state × f_posture`, clamped `[0,1]`. base = {shared_border 1.0, point_touch 0.7, distance_contact 0.4}. Hard gates: `exhaustion ≥ E_collapse(100)` or `cohesion ≤ C_floor(0.1)` → ineligible (`w=0`). |
| **Output** | `context.phase3aEffectiveEdges: EffectivePressureEdge[]` (in-memory only, NOT persisted) + `report.phase3a_pressure_eligibility` audit. |
| **BUILT** | All geometry factors (`f_distance`, `f_shape`), base weights, hard gates, deterministic edge sort, audit. |
| **STUBBED** | `buildStateAccessors()` (`:170–192`) returns `undefined` for **all four** accessors → `f_state` and `f_posture` are always neutral (1.0). The edges are **geometry-only**; the state→coupling the design intends is not built. |
| **LOC to complete** | **~50–90.** Implement `getExhaustion(sid)` (map OSID→controlling faction→`faction.profile.exhaustion`), `getCohesion(sid)` (no per-settlement cohesion exists — decide: derive from controlling-faction formation cohesion, or leave neutral and ratify absence), `getPosture`/`getPressure` (per-front-edge today; either aggregate to endpoints or ratify neutral). Owner decision: 3A state coupling can be deliberately deferred (ship geometry-only weights for 1.0) — see §6 build phasing. |

### Phase 3B — Pressure → exhaustion (`src/sim/pressure/phase3b_pressure_exhaustion.ts`)

| | |
|---|---|
| **Inputs** | `state.military.front_pressure` (per-edge `value`), `derivedFrontEdges` (side attribution), `phase3aEffectiveEdges` (coupling `w`). |
| **Transform** | per edge: `inc = min(|p| × COUPLE_FRACTION(0.02) × w, COUPLE_MAX_PER_EDGE(1.0))`; split half/half to `side_a`/`side_b`; sum per faction; `floor`; apply monotonic to `faction.profile.exhaustion`. |
| **Output** | `faction.profile.exhaustion` incremented (irreversible, `max(before, after)`). |
| **BUILT** | Fully. Honors Engine Invariants §8 (monotonic/irreversible). Requires 3A on + non-empty effective edges. |
| **STUBBED** | Nothing functionally. **Calibration unknown:** whether any faction actually crosses the 3C threshold within 188w under `COUPLE_FRACTION=0.02` is **unmeasured** — must be probed before authoring 3C thresholds (§3, §5 run 0). |
| **LOC to complete** | **~0** (possibly a tuning change to `COUPLE_FRACTION` if the probe shows nobody crosses threshold — that is a constant, see §3). |

### Phase 3C — Exhaustion → collapse gating (`src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`)

| | |
|---|---|
| **Inputs** | `faction.profile.exhaustion`, `faction.profile.authority`, formation `ops.fatigue`, `faction.supply_sources`/`areasOfResponsibility`, per-OSID pressure exposure (`computePressureExposureByEntity`). |
| **Transform — Tier-0 (faction):** | per domain {authority,cohesion,spatial}: if `exhaustion > EXHAUSTION_THRESHOLD_*`, increment persistence; at `persistence ≥ PERSISTENCE_REQUIRED_TURNS` AND a coherence-gate (`checkAuthorityDegradation`/`checkCohesionDegradation`/`checkSpatialDegradation`) holds → domain eligible. Suppression pauses persistence; immunity blocks eligibility. |
| **Transform — Tier-1 (per-OSID):** | `local_strain[osid] = clamp(strain + exposure × STRAIN_FRACTION, 0, STRAIN_MAX)`; per domain: if `strain > TIER1_*_THRESHOLD` AND faction Tier-0 eligible in that domain AND `persistence ≥ TIER1_PERSIST_TURNS` AND Tier-1 degradation → OSID eligible. |
| **Output** | `collapse_eligibility` (Tier-0), `collapse_eligibility_tier1` (per-OSID), `local_strain.by_entity`. |
| **BUILT** | Full state-machine (persistence counters, domain independence, Tier-0→Tier-1 gating, local_strain accumulator, deterministic sort, stats/audit). `checkAuthorityDegradation` (reads `faction.profile.authority < 30`) and `checkCohesionDegradation` (formation fatigue > 30) are real. |
| **STUBBED** | (1) `PHASE3C_CONSTANTS_VERIFIED=false` → **throws** if enabled (`:54,367`). (2) All 11 constants `SPEC VALUE REQUIRED` (`:58–74`). (3) `checkSpatialDegradation` (`:185–202`) is a crude `supply_sources.size / controlled.size` proxy, comment-flagged "actual implementation would use supply reachability." (4) `checkSuppression`/`checkImmunity`/`checkTier1Suppression`/`checkTier1Immunity` (`:207–219,306–316`) all `return false` (no brake). |
| **LOC to complete** | **~80–140.** Real `checkSpatialDegradation` via the existing `SupplyReachabilityOsidReport` (the BFS isolation report — already computed; `isEnclaveContainable` reads it). Suppression/immunity: either implement minimal rules (e.g. immunity for factions under a patron-aid floor; suppression during an active ceasefire) **or** ratify "none for 1.0" and delete the placeholders. Plus the constants (§3) and flipping `PHASE3C_CONSTANTS_VERIFIED`. |

### Phase 3D — Collapse resolution (`src/sim/collapse/phase3d_collapse_resolution.ts`)

| | |
|---|---|
| **Inputs** | `collapse_eligibility_tier1`, `local_strain.by_entity`. |
| **Transform** | per eligible OSID-domain: `severity = clamp((strain − STRAIN_THRESHOLD)/(STRAIN_MAX − STRAIN_THRESHOLD), 0, 1)`, zeroed below `SEVERITY_MIN`; `damage[domain] = max(prev, severity)` (monotonic); `authority_mult = 1 − AUTHORITY_IMPACT × damage.authority` (likewise cohesion/supply); `pressure_cap_mult = min(authority_mult, cohesion_mult, supply_mult)`. |
| **Output** | `collapse_damage.by_entity` (monotonic) + `capacity_modifiers.by_sid[osid]`. |
| **BUILT** | Full severity→damage→modifier derivation, monotonicity, deterministic event ordering, `recomputePhase3DCapacityModifiersFromDamage` (harness/seed helper). |
| **STUBBED** | Constants `STRAIN_THRESHOLD/MAX`, `SEVERITY_MIN`, `AUTHORITY/COHESION/SPATIAL_IMPACT` all `SPEC VALUE REQUIRED` (`:41–49`). With `*_IMPACT=0.5`, a single domain at `damage=1.0` halves the multiplier — effect size is unbounded-by-design until ratified. |
| **STUBBED — §6** | **The §6 guard does not exist anywhere in 3D.** There is no enclave-OSID exclusion at the `capacity_modifiers` write site. This is the gap §4 fills. |
| **LOC to complete** | **~30–60** (constants + the §6 guard exclusion at the write site). |

---

## 2. Data-flow completeness summary

| Phase | Built | Stubbed | LOC to complete |
|---|---|---|---|
| 3A | geometry weights, gates, audit | state accessors (4× `undefined`) | ~50–90 (or ratify geometry-only) |
| 3B | full coupling + monotonic accrual | none (tuning-only unknown) | ~0 |
| 3C | eligibility state-machine, auth/cohesion gates | constants (11), spatial gate, suppress/immune (4), fail-fast flag | ~80–140 |
| 3D | severity→damage→modifier, monotonic | constants (6), **§6 guard** | ~30–60 + guard |
| **Total engine** | | | **~160–290** |
| Tests | | | **~150–200** |

---

## 3. The missing constants (LOAD-BEARING)

**Canon status — verified:** Engine Invariants §8 and Systems Manual §7.1–7.3 are **normative prose only**. They mandate the *invariants* (exhaustion monotonic/irreversible; collapse "delayed, contingent, multi-causal"; eligibility ≠ immediate failure; no passive control flip) but state **no numeric values**. The "complete frozen specification, see Appendix A/B/C" pointers in the Systems Manual resolve to tables that were **archived during the v0.4→v0.9 fold** (Systems Manual line 982 / 1012) and are not present in the v0.9.0 canon. **Therefore every constant below is an owner/design decision with a proposed default — NOT a canon citation.** Where a value is constrained by an invariant, that is noted.

| # | Constant (file:loc) | Current placeholder | Proposed default | Derivation / rationale | Decision owner |
|---|---|---|---|---|---|
| C1 | `COUPLE_FRACTION` (3b:35) | 0.02 | **probe-then-set** | Run 0 (§5) measures peak `faction.profile.exhaustion` at 188w. Set so the most-pressed faction (RBiH) crosses the 3C authority threshold only in **late 1994–1995**, never in 1992. If nobody crosses, raise; if 1992 crossings appear, lower. | Owner (calibration) |
| C2 | `EXHAUSTION_THRESHOLD_AUTHORITY` (3c:58) | 50 | **70** | Exhaustion is open-ended (live accumulator + 3B). 50 is reached mid-war by static-front factions → premature. 70 keys collapse to the late-war exhaustion plateau. **Invariant link:** must be high enough that "eligibility ≠ immediate failure" (Systems Manual §7.3). | Owner |
| C3 | `EXHAUSTION_THRESHOLD_COHESION` (3c:59) | 50 | **70** | Same band as authority; cohesion gate (`checkCohesionDegradation`) provides the differentiation, not the threshold. | Owner |
| C4 | `EXHAUSTION_THRESHOLD_SPATIAL` (3c:60) | 50 | **65** | Slightly lower: spatial collapse (supply isolation) historically precedes authority collapse (a pocket starves before its government dissolves). | Owner + `/historian` |
| C5 | `PERSISTENCE_REQUIRED_TURNS` (3c:61) | 3 | **4** | "Multi-turn persistence" per Engine Invariants §7 (fragmentation requires persistence; one-turn invalid). 4 weeks ≈ a month of sustained over-threshold exhaustion before eligibility. | Owner |
| C6 | `AUTHORITY_DEGRADATION_THRESHOLD` (3c:64) | 30 | **30 (keep)** | `faction.profile.authority < 30`. Already a real read; 30/100 is a defensible "institutional distress" line. Verify against actual authority trajectories in run 0. | Owner |
| C7 | `COHESION_DEGRADATION_THRESHOLD` (3c:65) | 30 | **30 (keep)** | Formation `ops.fatigue > 30`. Consistent with existing fatigue bands. | Owner |
| C8 | `SPATIAL_DEGRADATION_THRESHOLD` (3c:66) | 0.5 ratio | **replace with BFS isolation** | The ratio proxy is unsound. Replace `checkSpatialDegradation` with: faction is spatially degraded if its BFS `SupplyReachabilityOsidReport` lists ≥ N isolated OSIDs (propose N keyed to a fraction, e.g. ≥10% of controlled OSIDs isolated). This is the documented "actual implementation." | Owner + `/historian` (enclave interaction) |
| C9 | `TIER1_AUTH_THRESHOLD` / `TIER1_COH_THRESHOLD` / `TIER1_SPA_THRESHOLD` (3c:69–71) | 20 | **40** | local_strain on `[0,100]`. With `STRAIN_FRACTION=0.1`, strain 40 = sustained high per-OSID pressure exposure over many turns. 20 is too eager (most front OSIDs reach it). | Owner (calibration) |
| C10 | `TIER1_PERSIST_TURNS` (3c:72) | 3 | **4** | Match C5 (Tier-1 should not be faster than Tier-0). | Owner |
| C11 | `STRAIN_FRACTION` (3c:73) | 0.1 | **0.05** | Slower strain accrual → only chronically-exposed OSIDs (besieged pockets, cut corridors) reach Tier-1 threshold. Couples with C9; tune as a pair in §5. | Owner (calibration) |
| C12 | `STRAIN_MAX` (3c:74, 3d:42) | 100 | **100 (keep)** | Clamp ceiling; defines the severity-normalization range. Keep consistent across 3C/3D. | — |
| C13 | `STRAIN_THRESHOLD` (3d:41) | 20 | **40** | Must equal the Tier-1 thresholds (C9) so an OSID that is Tier-1-eligible can actually produce non-zero severity. **Consistency invariant: C13 == C9.** | Owner |
| C14 | `SEVERITY_MIN` (3d:43) | 0.25 | **0.25 (keep)** | Floor below which no damage applies — enforces "delayed/contingent." Reasonable. | Owner |
| C15 | `AUTHORITY_IMPACT` (3d:47) | 0.5 | **0.3** | `authority_mult = 1 − 0.3×damage`. At full damage, authority capacity → 0.7 (−30%), not −50%. Bounds the territorial shock; the negative-sum effect should be **chronic, not catastrophic** (Systems Manual §7.2 "narrowing future options rather than immediate collapse"). | Owner (calibration) |
| C16 | `COHESION_IMPACT` (3d:48) | 0.5 | **0.3** | Same rationale. | Owner |
| C17 | `SPATIAL_IMPACT` (3d:49) | 0.5 | **0.4** | Supply degradation is the most historically load-bearing (siege starvation); slightly stronger than authority/cohesion but still bounded. | Owner + `/historian` |

**Critical consistency constraints (encode as a unit test):**
- C13 (`STRAIN_THRESHOLD`) **must equal** C9 (`TIER1_*_THRESHOLD`), else 3D severity is zero for all 3C-eligible OSIDs (silent no-op) or non-eligible OSIDs produce severity (leak).
- C12 (`STRAIN_MAX`) must be identical in 3C and 3D.
- `*_IMPACT` (C15–C17) ∈ `(0,1)` so multipliers stay in `[0,1]` even at `damage=1`.

**`E_collapse` (3a:37, =100) and `C_floor` (3a:41, =0.1):** these are 3A hard-gate constants, currently inert because the accessors are stubbed. If 3A state coupling is built (§1), they become live; keep `E_collapse=100` (a faction at exhaustion 100 is fully collapsed and its edges should stop coupling) — this is internally consistent with C2–C4 (eligibility at 65–70, full decoupling at 100).

---

## 4. The §6 guard (CRITICAL — owner + historian sign-off, NON-DELEGABLE)

### 4.1 The exact §6 surface (verified)

The Srebrenica rupture (`src/sim/negotiation/rupture_consequences.ts`) records `srebrenica_genocide_1995` **iff all three hold**: `event_flags.srebrenica_enclave_formed === true`, `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'`, and `turn ≥ 140`. The rupture is **locked, idempotent, permanent** (Sensitive History Gate §1.5 #36). Žepa follows the same enclave/fall machinery.

The eastern enclaves are RBiH-held, isolated, supply-fragile (`enclave_resilience.ts`): Srebrenica/Žepa **MUST FALL** (genocide rupture); Goražde/Bihać **HELD** (no `*_falls_1995` event; held by resilience). These are exactly the OSIDs **most likely** to register Tier-1 spatial/authority strain.

### 4.2 The good news (verified, and the basis of the guard)

**Phase 3D does NOT flip `political_controllers`.** Its outputs are `collapse_damage.by_entity` (the monotonic damage tracks) and the `capacity_modifiers` derived from them — multipliers consumed by pressure/supply, plus the `will_not_recover` diagnostic `loss_of_control_trends.ts:132` reads off the damage entry (corrected per Codex review on PR #368 P1; an earlier draft mis-stated `capacity_modifiers` as the "sole output"). None of these flip control. So collapse **cannot directly fall or save an enclave**; it can only degrade RBiH's pressure generation / formation supply at those OSIDs, which combat then resolves through the normal `attack_resolution` / triggered-op path (Krivaja-95 / Stupčanica-95 inject objectives directly). This means:

- **Premature fall risk** is INDIRECT: collapse-damaged supply_mult at Srebrenica could *weaken* the defender so the scripted fall lands early, or the enclave falls *before* turn 140 (the rupture floor) → rupture **fails to record** despite RS taking the OSID — the worst §6 failure.
- **Suppressed-fall risk** is also INDIRECT: there is no path by which collapse *stops* RS from taking the OSID (collapse degrades RBiH, the defender, not RS the attacker) — so collapse cannot suppress the fall. It can only accelerate it. **This asymmetry simplifies the guard: we only need to prevent acceleration, not suppression.**

### 4.3 Proposed guard (mark each line for owner/historian ratification)

**G1 — Enclave-OSID exclusion at the 3D damage-write root (PRIMARY; corrected per Codex review on PR #368 P1).** In `applyPhase3DCollapseResolution`, skip any OSID where `getEnclaveDefForOsid(osid) !== null` AND the enclave faction is RBiH (Srebrenica, Žepa, Goražde, Bihać, Sarajevo, Teočak) **at the `collapse_damage` write itself** (the `getOrInitCollapseDamage` / damage-accumulation site, `:103`) — NOT merely at the `capacity_modifiers` write. **Why the root and not the modifier write:** the modifiers are *derived from* `collapse_damage` (`updateCapacityModifiers` `:169`, `recomputePhase3DCapacityModifiersFromDamage` `:197`), and `loss_of_control_trends.ts:132` sets `will_not_recover` directly from the presence of a `collapse_damage` entry. So an earlier draft's "let damage accumulate as a diagnostic, only skip the modifier write" would still (a) feed the recompute-from-damage path and (b) mark `will_not_recover` on a protected enclave. Guarding at the damage-write root transitively blocks **all three**: no `collapse_damage` entry → no derived modifier → no `will_not_recover`. Result: for every protected OSID there is no `collapse_damage.by_entity` entry and no `capacity_modifiers.by_sid` entry → its pressure/supply/diagnostic state is untouched → its fall timing is driven exclusively by the existing enclave/event/triggered-op machinery. This stays within the owner-ratified "exclude enclave OSIDs from the 3D write" intent. ~10 LOC. **[OWNER + /historian sign-off]**

- *Alternative considered & rejected:* exclude only the four eastern enclaves and let Sarajevo/Bihać collapse. Rejected for 1.0 — Sarajevo siege is a calibration anchor and Bihać is a near-margin pocket; both are too sensitive for a first collapse build. Ship the broad exclusion; relax later if owner wants.

**G2 — Rupture-floor invariant test (SECONDARY, defense-in-depth).** A determinism/regression test that asserts, with collapse ON in 188w: (a) `srebrenica_genocide_1995` rupture STILL records, (b) at `recorded_turn ≥ 140`, (c) Žepa still falls on its historical window, (d) Goražde/Bihać still HELD at Dayton. If G1 holds, these pass trivially — but the test is the proof that G1 is sufficient, and it catches any future regression that lets collapse reach an enclave. **[/historian verifies the historical timing assertions]**

**G3 — Tier-0 spatial-domain note.** `checkSpatialDegradation` (C8, BFS isolation) will flag RBiH spatially-degraded whenever the eastern enclaves are isolated — which is *always*. With G1, this only affects **non-enclave** RBiH OSIDs (those still get modifiers). Confirm the historian is comfortable that RBiH-wide spatial eligibility (driven partly by the enclaves' isolation) degrading *non-enclave* RBiH settlements is historically defensible (it is — a state losing its eastern pockets is institutionally strained elsewhere). **[/historian acknowledgment]**

**Sign-off routing (Sensitive History Gate §6 table):** "Change to enclave mechanics" → `/gameplay-programmer` + `/historian` (Srebrenica/Žepa specifically). Plus "any change that could produce a reward-for-atrocity effect → user approval, not delegable." **The guard must be merged and its G2 test green BEFORE any `setEnablePhase3D(true)` reaches a non-harness path.**

---

## 5. Test + determinism plan

### 5.1 Determinism requirements
- No `Math.random()`, no `Date.now()`, no timestamps anywhere in the new logic (Sacred Rules). All four phases already use sorted iteration (`localeCompare` / `strictCompare`); new code must too.
- 3A loads a JSON file async — the only I/O. Determinism test must assert the same input graph → byte-identical effective edges across two runs.
- Exhaustion/strain/damage are integer- or float-monotonic; never decrease (Engine Invariants §8). Add an explicit monotonicity assertion test per phase.

### 5.2 Unit tests (new, ~150–200 LOC)
- **3A accessors:** OSID→faction→exhaustion mapping correct; neutral fallback when faction unknown; gate fires at `E_collapse`.
- **3B:** `inc = min(|p|·0.02·w, 1)`; half-split attribution; monotonic; no-op when 3A off / no effective edges (existing reasons preserved).
- **3C:** persistence increment/reset; Tier-0→Tier-1 gating (Tier-1 cannot be eligible without Tier-0 in that domain); local_strain clamp; **C13==C9 consistency test**; suppression pauses persistence (if implemented); fail-fast no longer throws once `PHASE3C_CONSTANTS_VERIFIED=true`.
- **3D:** severity zero below `SEVERITY_MIN`; monotonic damage; multiplier bounds `[0,1]`; deterministic event ordering.
- **§6 guard (G1/G2):** no `collapse_damage` entry AND no `capacity_modifiers` written for any enclave OSID even when Tier-1-eligible (the no-`collapse_damage` assertion is the true proof of inertness — see G1 root-write guard, §4.3); rupture-floor invariant (G2).

### 5.3 Byte-identical-disabled proof (the gate to merge before enabling)
- A regression test that runs 40w with all flags OFF (default) and asserts the manifest hash is **byte-identical to the current baseline** (`be76e56dd9d288c2` per MEMORY current floor). This proves the build is inert until flipped. Must stay green through the entire build until the deliberate enable+re-floor.
- The existing `structural_fingerprint_40w` CI gate (C1, alpha-band) must remain untouched until the enable step.

---

## 6. Calibration-campaign plan (one-change-per-run, 188w)

Enabling moves territory via the `pressure_cap_mult`/`supply_mult` feedback at degraded **non-enclave** OSIDs. The 649 floor and 30/30 anchors are pressure-driven and near margins (Zvornik garrison-pin, Sana cluster, Sarajevo ring) — the new multiplicative term lands hardest there. Per `feedback_calibrate_a_healthy_engine_not_the_floor`, a healthier engine that moves the floor is acceptable if owner-signed; 649 is a guard, not a target.

| Run | Change (ONE) | Gate |
|---|---|---|
| **0 (probe)** | 3A+3B ON only (3C/3D OFF). Measure peak `faction.profile.exhaustion` per faction across 188w. | No territory change expected (3B doesn't write modifiers). Sets C1/C2–C4. **If nobody crosses ~65, raise C1 first.** |
| 1 | Set C2–C5 from run 0; enable 3C (constants verified, `checkSpatialDegradation`=BFS). 3D still OFF. | No territory change (3C writes eligibility/strain, not modifiers). Inspect: which factions/OSIDs become eligible, and *when* (must be late-war, never 1992). |
| 2 | Enable 3D + §6 guard (G1). First live territory run. | 30/30 anchors; **G2 §6 invariant GREEN** (Srebrenica rupture records ≥t140; Žepa falls; Goražde/Bihać held); OSID count recorded (may differ from 649). |
| 3 | Tune `*_IMPACT` (C15–C17) toward the desired chronic-not-catastrophic shock. | anchors + §6 + floor delta within owner tolerance. |
| 4 | Tune `STRAIN_FRACTION`/`TIER1_THRESHOLD` pair (C9/C11) for which OSIDs reach Tier-1. | same. |
| 5–N | Reconcile anchors knocked out by collapse; re-floor candidate. | 30/30 + §6 + owner-signed OSID count. |

**Estimated runs: 10–16** (probe + 4 structural + 5–11 reconciliation), plausibly 2–3 sessions. Each is a synchronous 188w (per `feedback_188w_validate_combat_changes_before_merge` — 40w + CI is a false-green for combat-behavior changes).

**Composition with the (shelved) casualty-realism arc — IMPORTANT interaction:** both collapse and casualty-realism (PR-1 v2 Path A attrition retune) move territory through the **same pressure/attrition pipeline**. They must NOT be calibrated simultaneously (violates one-change-per-run). Sequence decision for owner: **(A)** finalize casualty-realism first (it's further along — already re-floored to 649 at `89ef697d`), then build collapse on top of that floor; or **(B)** build collapse against the current floor and fold casualty-realism after. Recommend **(A)** — collapse's exhaustion accrual reads `front_pressure` which casualty-realism's attrition retune already perturbs; building collapse on a moving attrition baseline doubles the reconciliation cost. Flag for owner.

---

## 7. Build phasing with owner gates

```
GATE 0 — RATIFICATION (no code)
  ├─ Owner ratifies the §3 constants table (or amends defaults).
  └─ Owner + /historian + /gameplay-programmer ratify the §4 §6 guard design (G1/G2/G3). NON-DELEGABLE.
        ▼
PHASE I — Build the guard + constants (calibration-flat, flags still OFF)
  ├─ Implement §6 guard G1 in 3D + G2 invariant test (~15 LOC + test).
  ├─ Replace 3C placeholder constants with ratified values; flip PHASE3C_CONSTANTS_VERIFIED=true (still gated OFF).
  ├─ Real checkSpatialDegradation via SupplyReachabilityOsidReport (~30 LOC).
  ├─ Suppression/immunity: implement-or-ratify-absent (~0–40 LOC).
  └─ Byte-identical-disabled proof (§5.3) GREEN.
        ▼  [GATE: tsc + vitest + desktop:map:build + 40w hash byte-identical]
PHASE II — 3A state coupling (OPTIONAL for 1.0)
  └─ Implement buildStateAccessors (~50–90 LOC) OR ratify geometry-only weights and skip.
        ▼
PHASE III — Enable + calibrate (the territory-moving work)
  ├─ Thread setEnablePhase3A/B/C/D into scenario_runner behind a scenario flag (default OFF) (~20–40 LOC).
  ├─ Run 0 probe → set C1–C4 → runs 1–N (§6).
  └─ §6 G2 invariant GREEN on EVERY territory-moving run.
        ▼  [GATE: 30/30 anchors + §6 invariant + owner-signed OSID floor]
PHASE IV — Re-floor + finalize
  ├─ New baseline of record (188w hash, 40w, 52w golden); update CALIBRATION_MASTER + MEMORY.
  └─ Hand to D2 full-campaign playtest with collapse live.
```

**Owner gates (hard stops):** GATE 0 §6 ratification before any 3D guard code merges to main; the §6 G2 invariant must be GREEN before AND on every run after `setEnablePhase3D(true)` reaches a non-harness path; the final re-floor OSID count is owner-signed (not auto-accepted as "must equal 649").

---

## 8. Estimate summary

| Workstream | LOC | Notes |
|---|---|---|
| §6 guard (G1) | ~15 | gate-blocking; merges first |
| 3C constants + verify flag | ~5 | ratification-gated |
| 3C `checkSpatialDegradation` (BFS) | ~30 | reuses existing report |
| 3C suppression/immunity | 0–40 | implement or ratify-absent |
| 3D constants + bounds | ~20 | ratification-gated |
| 3A state accessors | 0–90 | optional for 1.0 |
| Enable path (scenario flag) | ~20–40 | default OFF |
| **Engine total** | **~90–240** (core) / **~160–290** (with 3A coupling) | |
| Tests (unit + §6 G2 + byte-identical) | ~150–200 | |
| **Calibration** | — | **10–16 serial 188w runs, ~2–3 sessions** |

**Critical path:** GATE 0 §6 ratification → guard + constants → enable → 188w campaign. The dominant cost is the calibration campaign + the §6 gate, not LOC.

---

## Appendix — evidence map (file:line)

- Steps registered: `src/sim/turn_phases/war_phases.ts:3696–3772`
- Gates default-false (getters): `phase3a_pressure_eligibility.ts:19–21`, `phase3b_pressure_exhaustion.ts:19–21`, `phase3c_exhaustion_collapse_gating.ts:20–22`, `phase3d_collapse_resolution.ts:25–27`
- Setters harness-only: `phase3abc_audit_harness.ts:963–978`
- 3A accessor stub: `phase3a_pressure_eligibility.ts:170–192`; 3A constants `:34–51`
- 3B coupling: `phase3b_pressure_exhaustion.ts:35,187,229–236` (monotonic)
- 3C fail-fast + constants: `phase3c_exhaustion_collapse_gating.ts:54,58–74,367`; spatial proxy `:185–202`; suppress/immune `:207–219,306–316`
- 3D constants + write site: `phase3d_collapse_resolution.ts:41–49,169–188,350–384`; recompute helper `:197–210`
- Consumers (live): `capacity_modifiers.ts:38–62` → `front_pressure.ts:143–168` (pressure_cap_mult SOLE site), `formation_fatigue.ts:201–235`, `loss_of_control_trends.ts`
- §6 rupture trigger: `rupture_consequences.ts:16–72` (`political_controllers['op:srebrenica:srebrenica_2']==='RS'` + turn≥140 + enclave_formed)
- Enclave definitions + faction: `enclave_resilience.ts:82–202` (`getEnclaveDefForOsid`, `getEnclaveIdForOsid`)
- Canon — exhaustion invariants: Engine Invariants v0.9.0 §8 (monotonic/irreversible)
- Canon — authorized control change: Engine Invariants v0.9.0 §9.6 ("internal authority collapse"); Systems Manual v0.9.0 §6.62 (no passive pressure flip)
- Canon — Phase 3 overviews (prose, no numerics): Systems Manual v0.9.0 §7.1–7.3; Appendix pointers archived (line 982/1012)
- Canon — Phase 3 are frozen subsystems not lifecycle phases: Phase_Specifications_v0_9_0.md:23
- Canon — sensitive history gate + §6 sign-off table: SENSITIVE_HISTORY_DESIGN_GATE.md §1, §6 (enclave-mechanics row → /gameplay-programmer + /historian)
```

