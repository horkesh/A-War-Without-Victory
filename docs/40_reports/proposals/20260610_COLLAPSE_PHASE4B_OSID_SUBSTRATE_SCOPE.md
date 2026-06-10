# Collapse Phase IV-b — OSID-Substrate Re-Route SCOPE

**Type:** READ-ONLY scoping / design document. No engine code, no flag flips, no canon edits were produced in writing this. Every claim is file:line-cited against the working tree (`main` @ `b7d7d58fd`) and branch `feat/collapse-phase4a-first-fire`.
**Status:** DRAFT for owner ratification. The build is BLOCKED on the §6 owner+historian re-verification gate (§B) and the floor-impact acknowledgment (§C) — both NON-DELEGABLE.
**Predecessors:**
- `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md` (Phase I spec — constants + G1 guard, MERGED #375).
- `docs/40_reports/20260610_COLLAPSE_PHASE4A_FIRST_FIRE.md` (on branch `feat/collapse-phase4a-first-fire`; HELD/EXPLORATORY — Tier-0 now fires, Phase 3D writes nothing).
**Scope:** The single named blocker from IV-a §5: Phase 3D writes nothing because the collapse exposure substrate reads the **settlement-level** `front_pressure`, which is empty in OSID-native scenarios. This doc specifies the minimal, lowest-risk re-route onto the OSID front model.

---

## 0. IV-a root-cause claim — VERIFIED CORRECT (code evidence)

The IV-a report's root cause is **confirmed in code**, not merely inferred. The chain:

1. **The substrate producer is settlement-level.** `accumulate-front-pressure` step (`war_phases.ts:3668–3676`) calls `computeFrontEdges(context.state, edges)` (settlement model) and passes the result to `accumulateFrontPressure(...)` (`front_pressure.ts:78–191`), which is the SOLE writer of `state.military.front_pressure` in the live pipeline (`front_pressure.ts:171–187`).
2. **`computeFrontEdges` returns 0 edges in OSID-native scenarios.** `computeFrontEdges` (`front_edges.ts:33–85`) skips any pair where `getSettlementControlStatus` is `unknown` (`:43–45`). `getSettlementControlStatus` (`settlement_control.ts:21–49`) reads `political_controllers[settlementId]` keyed by **canonical SID**; in these scenarios `political_controllers` is keyed by **OSID** (`op:mun:slug`), so canonical-SID lookups return `undefined`, then AoR fallback also misses (AoR is OSID-keyed too — see below) → `{ kind: 'unknown' }`. Every settlement-edge pair is therefore `unknown` → **0 front edges** → `accumulateFrontPressure` writes nothing → `front_pressure` stays empty. (IV-a measured: `getSettlementControlStatus` `unknown` for 2000/2000 sampled pairs; 0 derived front edges every turn.)
3. **The exposure reader reads the empty field.** `computePressureExposureByEntity(state, derivedFrontEdges)` (`pressure_exposure.ts:39–83`) reads `state.military.front_pressure` (`:45`); empty input → empty exposure map. It is called from Phase 3C at `phase3c_exhaustion_collapse_gating.ts:578`.
4. **No exposure → no Tier-1 → no 3D write.** Empty exposure → `local_strain` never accrues (3C `:589–595`) → no Tier-1-eligible OSID → `applyPhase3DCollapseResolution` finds `collapse_eligibility_tier1` empty and returns `no_tier1_eligibility_state` (`phase3d_collapse_resolution.ts:353–369`). Zero `collapse_damage`, zero `capacity_modifiers`. Matches IV-a §2 exactly.
5. **The live OSID front model exists and is populated.** `computeFrontEdgesOsid` (`front_edges.ts:110–146`) uses `getPoliticalControllerOSID` (`settlement_control.ts:71–106`, OSID-aware, majority-vote fallback) and writes `state.military.war_front_edges_osid` at `war_phases.ts:1455–1459` (+ `war_phase_reconciliation_steps.ts:30–31`, `scenario_runner.ts:194,1828,2766`). It returns a non-empty `FrontEdge[]` whose `a`/`b` are OSIDs. **But there is NO accumulated-pressure field over those OSID edges** — `war_front_edges_osid` is a topology list, not a pressure record. There is no `war_front_pressure_osid` anywhere (grep: zero hits).

**This is the documented life-lesson napkin #5 (2026-04-03):** *"Canonical and operational edge universes must be bridged explicitly… Never let mismatched geometry silently collapse activity or pressure to zero."* The collapse substrate is exactly this failure: it consumes canonical settlement edges while the live war runs on OSID edges, silently collapsing pressure to zero.

**Verdict: IV-a is right. The blocker is an architectural edge-universe mismatch, not a tuning miss.**

---

## A. PRECISE WIRING DIFF

### A.1 The exact reads to re-source

There are **three settlement-level reads** the collapse substrate depends on, all keyed off the empty `front_pressure` / settlement `computeFrontEdges`:

| # | Read site (file:line) | What it consumes | OSID-native value today |
|---|---|---|---|
| R1 | `phase3c_exhaustion_collapse_gating.ts:578` — `computePressureExposureByEntity(state, derivedFrontEdges)` | per-OSID exposure for Tier-1 `local_strain` | empty (derivedFrontEdges = 0 settlement edges; `front_pressure` empty) |
| R2 | `pressure_exposure.ts:45` — `state.military.front_pressure` (inside R1) | edge-keyed pressure magnitudes | empty `{}` |
| R3 | `war_phases.ts:3762` (3C step) + `:3743` (3B step) + `:3686/:3802` — `computeFrontEdges(context.state, edges)` | the `derivedFrontEdges` validation set passed to R1 and to 3B coupling | `[]` (0 edges) |

The Tier-1 entity→faction map (`phase3c…:582–586`) reads `faction.areasOfResponsibility`, which **is OSID-keyed at runtime** (populated from control-flip proposal `t.sid` in the same key space as `political_controllers` — `control_flip_proposals.ts:171–175`). So once exposure keys become OSIDs, the entity→faction gating aligns with no further change. **This is the load-bearing fact that makes the re-route cheap:** the consumer side is already OSID-native; only the producer side is settlement-native.

### A.2 The minimal change — populate an OSID-keyed exposure, source it from `war_front_edges_osid`

The substrate needs a per-OSID **exposure magnitude**. `war_front_edges_osid` gives the OSID front **topology** but not a magnitude. Two ways to get the magnitude:

- **Option 1 — read-site swap to a magnitude that already exists per OSID edge.** There is no OSID-keyed pressure magnitude in state today (no `war_front_pressure_osid`). So a pure read-site swap is NOT available without first producing a magnitude. REJECTED as insufficient alone.
- **Option 2 — adapter: derive an OSID exposure map directly from `war_front_edges_osid` + an OSID-edge magnitude.** Add a sibling exposure function `computePressureExposureByEntityOsid(state)` that iterates `state.military.war_front_edges_osid` and, per edge, attributes a magnitude to each OSID endpoint (half-split, mirroring `pressure_exposure.ts:76–79`). The magnitude source is the open question (A.4). Phase 3C calls the OSID variant when `war_front_edges_osid` is non-empty, else falls back to the settlement variant (preserves the harness/settlement-scenario path byte-identically). **~30–50 LOC, no new persisted state if the magnitude is computed transiently.**
- **Option 3 — populate `front_pressure` from the OSID model (parallel accumulator).** Add a `war_front_pressure_osid` accumulator that mirrors `accumulateFrontPressure` but over OSID edges (a full second pressure pipeline: posture intent, supply reachability, capacity-mult consumption, monotonic accrual). This is the "real" pressure-on-OSID-edges build. **~120–200 LOC + a new persisted state field + save-migration + its own determinism/monotonicity tests + a `getEdgeCapacityMultiplier` consumption decision (see §B).** Higher fidelity, much higher risk, and it makes the edge-min capacity residual LIVE (see §B.2).

### A.3 RECOMMENDATION — Option 2 (adapter), spatial-exposure only

**Lowest-risk, smallest-surface, and matches the IV-a scenario-tester read** that the **spatial domain is the correct primary channel** and authority/cohesion are structurally dead for now. Recommended adapter:

- New `computePressureExposureByEntityOsid(state): Map<OSID, number>` in `pressure_exposure.ts` (sibling to the existing function; reuses `parseEdgeId`-style half-split attribution but iterates `state.military.war_front_edges_osid` directly — the `edge_id` is already `a__b` over OSIDs, so the existing `parseEdgeId` works unchanged).
- Magnitude per edge = a **transient, derived** scalar (A.4), NOT a new persisted accumulator. Keeps the byte-identical-when-disabled invariant trivially (no new save field, no migration).
- Phase 3C dispatch: in the 3C step (`war_phases.ts:3786`) and inside `applyPhase3CExhaustionCollapseGating`, prefer the OSID exposure when `war_front_edges_osid?.length > 0`, else the settlement path. One branch, mirrors the existing `useOsid` pattern already used in `war_data_extractor.ts:745` and the front model selection elsewhere.

**Touch points (Option 2):**
1. `src/sim/pressure/pressure_exposure.ts` — add `computePressureExposureByEntityOsid` (~30–40 LOC). The magnitude helper (A.4) lives here too.
2. `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts:578` — branch: `const exposureByEntity = (state.military.war_front_edges_osid?.length ?? 0) > 0 ? computePressureExposureByEntityOsid(state) : computePressureExposureByEntity(state, derivedFrontEdges);` (~4 LOC + import).
3. (No change to `front_pressure.ts`, `phase3d_collapse_resolution.ts`, or the G1 guard — the guard already keys on OSIDs via `getEnclaveDefForOsid`.)

### A.4 The one real design decision inside Option 2 — the OSID-edge magnitude

`war_front_edges_osid` is topology-only. The adapter needs a per-edge magnitude. Candidates, lowest-risk first:

- **M1 — uniform unit magnitude (presence = 1.0 per active OSID front edge).** Exposure becomes "number of hostile OSID fronts touching this OSID," accrued monotonically into `local_strain` via `STRAIN_FRACTION`. Crudest but fully deterministic, zero new dependencies, and sufficient for the spatial channel (an OSID with many isolated hostile fronts is exactly the besieged-pocket signal). **Recommended for the first build** — it is the minimum that makes 3D fire, and Tier-1 thresholds (C9/C13=40) + `STRAIN_FRACTION` (C11) are the tuning levers (build-spec runs 3–4). The magnitude calibration is then a single scalar, not a second pressure pipeline.
- **M2 — derive magnitude from the OSID edge's supply/isolation state** (e.g. each OSID front edge whose endpoint is BFS-isolated contributes more). Couples exposure to the same `SupplyReachabilityOsidReport` the 3C spatial coherence gate already uses (`war_phases.ts:3778`). Higher fidelity, ~20 extra LOC, still no persisted state. Reasonable Phase-IV-c refinement; do NOT bundle into the first build.
- **M3 — port the full `accumulateFrontPressure` math to OSID edges** = Option 3. Out of scope.

**Recommendation: Option 2 + M1 for the first build.** It is the lowest-risk path that makes Phase 3D fire, preserves byte-identical-when-disabled, and leaves the magnitude model as a single tunable for the calibration campaign.

---

## B. §6 RISK SURFACE (NON-DELEGABLE owner + /historian gate)

### B.1 The re-route does NOT open a new path to enclave collapse_damage — G1 already covers OSID space

The G1 guard is keyed on `getEnclaveDefForOsid(osid)` (`phase3d_collapse_resolution.ts:90–97, 159–166, 434`), which is **already an OSID predicate** — its protected keys ARE OSIDs (`op:srebrenica:srebrenica_2`, `op:rogatica:zepa_2`, `op:gorazde:gorazde_2`, etc.). The guard fires at the `getOrInitCollapseDamage` chokepoint (`:159–166`) AND at the resolution loop-skip (`:434`) AND in the recompute helper (`:291`). Because the re-route makes the **exposure keys** OSIDs (the same key space the guard already protects), a protected enclave OSID that now accrues exposure → `local_strain` → Tier-1 eligibility will STILL be short-circuited before any `collapse_damage` / `capacity_modifier` / `will_not_recover` write. **The guard surface does not move; the keys flowing into it do not change type.** IV-a §0 already measured this empirically on the branch: 0 `collapse_damage`, 0 `capacity_modifier`, `will_not_recover` false on all 9 ENCLAVE_DEFINITIONS OSIDs, with collapse-ON.

**Confirmation required from owner+/historian:** that making the exposure substrate OSID-native (so enclave OSIDs DO now reach Tier-1 eligibility, just to be guarded at the 3D write) is acceptable — i.e. the guard-by-exclusion-at-write model, not guard-by-never-evaluating. This is the existing ratified G1 design (packet #368); the re-route does not change it, but it makes the guard's exclusion path actually exercised on enclaves for the first time (previously the substrate was empty so nothing reached it). **The G2 invariant test is the proof and must be GREEN on every territory-moving run.**

### B.2 THE LIVE RESIDUAL — `getEdgeCapacityMultiplier` edge-min (FLAG, conservative)

The documented residual (`phase3d_collapse_resolution.ts:151–157`): `getEdgeCapacityMultiplier(state, a, b, which)` returns `Math.min(mult_a, mult_b)` (`capacity_modifiers.ts:53–62`). G1 is **own-OSID-only**: it keeps the enclave OSID out of `capacity_modifiers.by_sid`, so `getSidCapacityModifiers(enclave)` returns DEFAULT (all 1.0). BUT for an **edge between a protected enclave OSID and a COLLAPSED non-protected neighbor**, `min(1.0, collapsed_value)` = the collapsed value — so the enclave's edge would carry the neighbor's degraded multiplier.

- **Today (Option 2 + M1): this residual stays INERT for the collapse substrate.** The re-route reads `war_front_edges_osid` topology + a derived magnitude (M1 = presence). It does NOT consume `getEdgeCapacityMultiplier` — that consumer is `accumulateFrontPressure` (`front_pressure.ts:149–150,164–167`), which is the **settlement** pipeline and is NOT on the OSID exposure path. So Option 2 does not make the residual live on any enclave-adjacent edge.
- **The residual WOULD go live under Option 3** (a real `war_front_pressure_osid` accumulator that ports the `getEdgeCapacityMultiplier` consumption to OSID edges). That is the precise reason Option 3 is NOT recommended for the first build: it converts a documented-inert residual into a live §6 path (a collapsed Krajina OSID adjacent to Bihać could degrade Bihać's edge pressure). **If owner ever wants Option 3, the edge-min residual must be re-reviewed under §6 first** (the fix is a per-edge guard: if either endpoint is enclave-guarded, return 1.0 for that endpoint's contribution — but that is a separate ratified change).

**§6 VERDICT:** Option 2 + M1 introduces **no new §6 exposure path**. G1 covers the OSID key space unchanged; the edge-min residual remains inert because Option 2 does not consume it. The re-route's only §6-relevant effect is that the guard's exclusion branch is now actually exercised on enclave OSIDs — which is the ratified G1 design and is proven by the G2 invariant test. **CONDITIONAL PASS, pending owner+/historian re-verification of B.1 and explicit acknowledgment of the B.2 residual staying inert (i.e. owner picks Option 2, not Option 3).**

### B.3 Rupture-timing invariant

`srebrenica_genocide_1995` records iff `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'` AND `turn ≥ 140` (canon floor; IV-a measured the actual recorded_turn = 162, both ON and OFF). Collapse **never flips `political_controllers`** (3D writes only `collapse_damage` + `capacity_modifiers`). The only INDIRECT risk is acceleration of a defender's fall via a degraded `supply_mult` — but G1 zeroes that for every enclave OSID, so Srebrenica/Žepa fall on their existing event/triggered-op timing, unchanged. G2 asserts: rupture records, at recorded_turn ≥ 160, Žepa falls, Goražde/Bihać/Sarajevo/Teočak held. **Must be GREEN on every territory-moving run.**

---

## C. CALIBRATION-COUPLING PREDICTION (qualitative — NO scenarios run)

Once Phase 3D fires, it writes `capacity_modifiers.by_sid[osid]` that are consumed by `front_pressure.ts:149–167` (`supply_mult` scales supplied intent; `pressure_cap_mult` scales generated delta) and `formation_fatigue.ts`. These degrade a defender's pressure generation / supply — they can **only accelerate a fall, never save an enclave or throttle an attacker** (collapse degrades the degraded faction's own OSIDs). **This is the FIRST floor-moving collapse change** — expected and intended.

### C.1 Regions most likely to move (from the IV-a eligibility map)

| Region / faction | Eligibility signal (IV-a measured / inferred) | Predicted direction once 3D fires |
|---|---|---|
| **HRHB central-Bosnia pockets** | `eligible_spatial = true from ~t60`, persistence 141 by t188 (≥10% of HRHB OSIDs BFS-isolated). | HRHB's isolated Žepče/Vitez/Kiseljak-class pockets accrue spatial damage → degraded supply_mult/pressure_cap → easier loss to whichever neighbor presses. **NOTE the 3 HRHB enclaves (kiseljak/lasva_valley/zepce) are G1-GUARDED** — they will NOT collapse; only NON-enclave HRHB OSIDs move. Net: small number of marginal central-Bosnia HRHB OSIDs flip earlier. |
| **RS western Krajina (Sana/Storm/Mistral corridor)** | RBiH/RS spatial = false at IV-a (each <10% isolated). BUT IV-a §3(3): "once the substrate feeds real pressure, the western-Krajina over-extension is where RS spatial isolation should emerge." | With OSID-native exposure feeding Tier-1, over-extended RS corridor OSIDs (the same Sana/Ključ cluster that is the chronic late-war calibration battleground) become the most likely NEW spatial-collapse sites → accelerated RS losses in the 1995 western cascade. This is where the floor will move most. |
| **RBiH non-enclave** | RBiH Tier-0 spatial false (eastern enclaves isolated but G1-guarded → don't count toward the ≥10% non-enclave gate the way IV-a's spatial gate is wired — confirm in run 1). | Least movement expected; RBiH's pressure is offensive late-war, not collapsing. |

### C.2 Floor-impact verdict

**YES — this WILL move the 649 floor, and that is the point.** Direction: collapse accelerates defender falls at over-extended / isolated OSIDs. The near-margin late-war anchors (Zvornik garrison-pin, Sana/Ključ cluster, Storm/Mistral corridor) are exactly where the new `pressure_cap_mult`/`supply_mult` term lands hardest, because those are pressure-driven and near their tipping point. Magnitude is qualitatively **moderate** under the chronic-not-catastrophic constants (AUTHORITY/COHESION_IMPACT=0.3, SPATIAL_IMPACT=0.4 → at full damage supply capacity → 0.6, not 0): a degraded OSID is softened, not deleted, so combat still resolves the fall. Most likely net effect: a **small-to-moderate increase** in late-war RS/HRHB territorial loss (toward the historical 1995 collapse), i.e. the OSID count may rise above 649 at the western cascade. Per `feedback_calibrate_a_healthy_engine_not_the_floor`: 649 is a guard, not a target; a healthier engine that moves the floor with owner sign-off is acceptable. **The re-floor OSID count is owner-signed, not auto-accepted as "must equal 649."**

---

## D. BUILD PLAN (ordered, one-change-per-run, byte-identical-when-disabled preserved)

**Invariant held throughout:** every step keeps the collapse-OFF (default) path byte-identical to baseline (40w `be76e56dd9d288c2` / 188w `5f57d17287b87dfb` per MEMORY current floor; the IV-a branch's plain-188w collapse-OFF baseline is `ad190ed644972150`). The collapse flags are OFF by default (`getEnablePhase3*()` → false); only `ENABLE_COLLAPSE=true` env (IV-a, `scenario_runner.ts`) flips them. No default, no scenario file, no save field is touched by Option 2 + M1.

**HARD §6 GATE:** `tests/collapse_phase1_g2_section6_invariant.test.ts` (G2) must be GREEN before AND on every run after the substrate re-route reaches a non-harness path. NON-DELEGABLE owner+/historian sign-off on §B before any of D2+ merges.

| Step | Change (ONE) | LOC | Gate / STOP condition |
|---|---|---|---|
| **D0** | Owner ratifies §A recommendation (Option 2 + M1, spatial-only first), §B §6 re-verification (B.1 + B.2-inert acknowledgment), §C floor-move acknowledgment. NO CODE. | 0 | Owner sign-off recorded. **STOP if owner picks Option 3** → re-scope with edge-min §6 review. |
| **D1** | Add `computePressureExposureByEntityOsid` (Option 2 adapter, M1 magnitude) + unit tests. NOT yet wired into 3C. | ~30–40 + ~40 test | `tsc` + new unit tests green; deterministic (sorted OSID iteration, half-split). No pipeline change → 40w/188w byte-identical (proof). |
| **D2** | Wire the OSID-exposure branch into Phase 3C (`:578`), `war_front_edges_osid`-present dispatch. Behind the existing collapse flags (still OFF by default). | ~6 | **40w collapse-OFF hash byte-identical** (proof of inertness). With `ENABLE_COLLAPSE=true`: 3D now fires; **§6 G2 GREEN**; record OSID delta. STOP-and-surface if G2 fails OR if any enclave OSID gets a `collapse_damage`/`capacity_modifier` entry OR if Srebrenica/Žepa fall before t160. |
| **D3** | First territory-moving 188w (collapse-ON). Measure floor delta, anchors, §6. NO tuning. | 0 | 30/30 anchors recorded (may break — expected); §6 G2 GREEN; OSID count recorded. This is the go/no-go data artifact for owner. |
| **D4** | Tune `STRAIN_FRACTION` (C11) / `TIER1_*_THRESHOLD` (C9, with C13==C9 invariant) — which OSIDs reach Tier-1. ONE constant pair per run. | ~2/run | anchors + §6 + owner floor-tolerance. |
| **D5** | Tune `SPATIAL_IMPACT` (C17) — how hard supply_mult bites. ONE constant. | ~1 | same. |
| **D6–Dn** | Reconcile anchors knocked out by collapse; owner-signed re-floor (new 40w/188w/52w baseline of record + CALIBRATION_MASTER + MEMORY). | varies | 30/30 (or owner-signed deviation) + §6 + owner OSID-count sign-off. |

**Estimate:** engine ~36–46 LOC (Option 2 + M1) + ~40–80 test LOC. **188w campaign runs: ~6–10** (D2 ON measurement + D3 first-fire + D4/D5 tuning pairs + D6–Dn reconciliation), plausibly 2 sessions. Each is a synchronous 188w (per `feedback_188w_validate_combat_changes_before_merge` — 40w + CI is a false-green for combat-behavior changes; the western cascade compounds only at 188w).

**Composition warning (carried from build-spec §6):** collapse and the shelved casualty-realism arc (PR-1 v2 / Lane-3) both move territory through the same pressure/attrition pipeline. Do NOT calibrate simultaneously. Lane-3 is CLOSED-by-hold at 649 (`feedback…lane3_casualty_realism_held_at_649`), so collapse builds on the current 649 floor cleanly — but if Lane-3 is ever reopened, sequence it AFTER collapse's re-floor.

---

## E. OPEN QUESTIONS FOR THE OWNER (before any build)

1. **Option 2 vs Option 3 (THE decision).** Adapter (Option 2 + M1, ~40 LOC, edge-min residual stays inert, spatial-only) vs full OSID pressure accumulator (Option 3, ~150–200 LOC + save field + makes the §6 edge-min residual LIVE)? Recommendation: **Option 2 + M1** — minimum that makes 3D fire, lowest §6 surface, leaves magnitude as a single tunable. Owner must explicitly pick, because Option 3 reopens a §6 review.
2. **Magnitude model (M1 vs M2).** Start with uniform presence (M1), or couple exposure to BFS isolation from turn one (M2, reusing the `SupplyReachabilityOsidReport` the 3C spatial gate already computes)? Recommendation: M1 first (simpler tuning), M2 as a Phase IV-c refinement if the cascade is under-discriminating.
3. **§6 re-verification of the guard-by-exclusion model (NON-DELEGABLE).** Confirm it is acceptable that enclave OSIDs now reach Tier-1 eligibility and are excluded at the 3D write (G1), rather than never evaluated. This is the ratified #368 design unchanged, but the re-route exercises it on enclaves for the first time. /historian must re-bless the G2 timing assertions (rupture ≥160, Žepa falls, Goražde/Bihać/Sarajevo/Teočak held) against a collapse-ON run.
4. **Authority/cohesion domains (carried from IV-a §5.2).** For 1.0, ratify **spatial-only collapse** (the cleanest single causal story: isolation → starvation → collapse; HRHB/RS pockets), OR commit to animating `profile.authority` / formation fatigue past their gates (authority pinned 50, fatigue capped 30 → both dead). Recommendation: **spatial-only for 1.0** — it is historically load-bearing and already differentiates correctly.
5. **Floor-move tolerance.** What OSID-count band around 649 is acceptable as the collapse re-floor before owner sign-off is required vs auto-accept? (Expected direction: UP, toward historical 1995 collapse, at the western RS cascade.)
6. **Bundle the IV-a branch first?** IV-a (`feat/collapse-phase4a-first-fire`) is HELD/EXPLORATORY and carries the war_exhaustion/100 reconciliation + the Math.floor removal that IV-b's fire depends on. Confirm IV-a's reconciliation merges (or is folded into the IV-b branch) before IV-b's substrate re-route, since IV-b is meaningless without Tier-0 firing.

---

## Appendix — evidence map (file:line, working tree)

- Substrate producer (settlement): `war_phases.ts:3668–3676` (`accumulate-front-pressure` → `accumulateFrontPressure`); `front_pressure.ts:78–191` (sole `front_pressure` writer, `:171–187`).
- `computeFrontEdges` skips unknown: `front_edges.ts:33–85` (`:43–45`); `getSettlementControlStatus` canonical-SID read: `settlement_control.ts:21–49`.
- OSID front model (live, populated): `computeFrontEdgesOsid` `front_edges.ts:110–146`; `getPoliticalControllerOSID` `settlement_control.ts:71–106`; writes `war_front_edges_osid` at `war_phases.ts:1455–1459`, `war_phase_reconciliation_steps.ts:30–31`, `scenario_runner.ts:194,1828,2766`.
- Exposure reader: `computePressureExposureByEntity` `pressure_exposure.ts:39–83` (reads `front_pressure` `:45`); called `phase3c_exhaustion_collapse_gating.ts:578`.
- Tier-1 entity→faction (OSID-keyed AoR): `phase3c…:582–586`; AoR populated in `political_controllers` key space `control_flip_proposals.ts:171–175`.
- 3D no-fire guard: `phase3d_collapse_resolution.ts:353–369` (`no_tier1_eligibility_state`).
- §6 G1 guard (OSID-keyed): `phase3d_collapse_resolution.ts:90–97` (predicate), `:159–166` (chokepoint), `:434` (loop-skip), `:291` (recompute).
- Edge-min residual: `phase3d_collapse_resolution.ts:151–157` (doc); `getEdgeCapacityMultiplier` `capacity_modifiers.ts:53–62`; consumer (settlement-only) `front_pressure.ts:149–150,164–167`.
- Capacity-modifier consumers: `front_pressure.ts:143–168` (SOLE pressure_cap_mult site), `formation_fatigue.ts:201–235`.
- IV-a reconciliation (branch `feat/collapse-phase4a-first-fire`): `phase3c…:455–484` (war_exhaustion/100), `phase3b…:224–235` (Math.floor removed), `scenario_runner.ts` (+`ENABLE_COLLAPSE` env gate).
- Life-lesson: napkin §"Canonical and operational edge universes must be bridged explicitly" (#5, 2026-04-03).
- Canon — collapse never flips control: build-spec §0/§4.2 citing Engine Invariants §8 + Systems Manual §7.1–7.3; §6 gate SENSITIVE_HISTORY_DESIGN_GATE.md §6.
