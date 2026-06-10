# Collapse Phase IV-a — Unit Reconcile + First-Fire (188w measured)

**Status:** HELD / EXPLORATORY — owner Phase IV decision artifact. Do NOT merge, do NOT re-bless the golden manifest, do NOT finalize tuning. baseline-regression CI is EXPECTED to fail (collapse pipeline now activates; territory does not yet move, but the enable path exists).

**Date:** 2026-06-10
**Scenario:** `data/scenarios/apr1992_definitive_188w.json` (188w, plain — not the `_dayton_close` variant). All measurements are collapse-ON vs collapse-OFF on the SAME scenario (the ON/OFF delta is the load-bearing comparison, not the absolute floor; this scenario's collapse-OFF baseline is 649/712 hash `ad190ed644972150`).
**Predecessor:** Phase III (PR #379, enable-campaign) found collapse INERT — `profile.exhaustion` pinned ~0.265 (0..1) vs a Tier-0 threshold of 70 (0..100): a ~260× unit/scale mismatch.

---

## 0. Lead with the §6 GATE VERDICT — PASS

The §6 hard gate (G1 enclave guard + G2 rupture floor) was verified against the real collapse-ON 188w run AND the collapse-OFF baseline:

| §6 invariant | collapse-OFF (n0) | collapse-ON (n1) | verdict |
|---|---|---|---|
| Srebrenica `op:srebrenica:srebrenica_2` | RS | RS | ✅ fell, identical |
| Žepa `op:rogatica:zepa_2` | RS | RS | ✅ fell, identical |
| Goražde `op:gorazde:gorazde_2` | RBiH | RBiH | ✅ held, identical |
| Bihać `op:bihac:bihac_2` | RBiH | RBiH | ✅ held, identical |
| Sarajevo core `op:centar_sarajevo:sarajevo_dio_centar_sajarevo` | RBiH | RBiH | ✅ held, identical |
| Teočak `op:ugljevik:teocak_krstac_2` | RBiH | RBiH | ✅ held, identical |
| rupture `srebrenica_genocide_1995` recorded_turn | 162 | 162 | ✅ ≥160 AND identical ON vs OFF |
| collapse_damage on all 9 ENCLAVE_DEFINITIONS OSIDs | (none) | **0 entries** | ✅ |
| capacity_modifier on all 9 enclave OSIDs | (none) | **0 entries** | ✅ |
| will_not_recover on all 9 enclave OSIDs | false | **false** | ✅ |

`tests/collapse_phase1_g2_section6_invariant.test.ts` (4 tests) GREEN against the collapse-ON run. Per-controller diff ON vs OFF = **0 OSIDs differ**. No §6 regression — collapse does NOT proceed over a §6 violation, and none occurred.

---

## 1. The exact unit reconciliation + threshold set

### Root cause (confirmed empirically, not inferred)
- `faction.profile.exhaustion` — the field Phase 3C Tier-0 read at `phase3c_exhaustion_collapse_gating.ts:459` — is the **legacy NORMALIZED 0..1** field. Measured plateau across a full 188w campaign: **0.2654**, identical across all three factions, monotonic from 0. Comparing it against Tier-0 thresholds 70/65 (a ~260× scale mismatch) made Tier-0 structurally unreachable → pipeline inert.
- The field that actually carries the open-ended late-war exhaustion the constants assume is **`state.political.war_exhaustion`**. `src/sim/combat/exhaustion.ts:113-124` documents that this accumulator was rescaled **100×** (original 0..100 percentage scale → 0..10000, cap 10000) with EVERY downstream gate (WASH_COMBINED_EXHAUSTION, CEASEFIRE_*, combat-tempo thresholds) rescaled in lockstep. Measured trajectory: w1 ≈ 57–149, w41 ≈ 5376–8149, saturates ~10000 by ~w80, flat thereafter.

### The change (ONE conceptual reconciliation)
Phase 3C Tier-0 now reads **`state.political.war_exhaustion[fid] / 100`** (0..10000 cap → 0..100 percentage scale). The constants 70/70/65/100 are UNCHANGED — they are already correct for the 0..100 scale, which is exactly what `war_exhaustion/100` recovers. This honors the build-spec design intent verbatim (§3 C2: "70 keys collapse to the late-war exhaustion plateau"; E_collapse=100 = "fully collapsed").

Secondary: removed Phase 3B's `Math.floor(delta)` at `phase3b_pressure_exhaustion.ts:229` (with COUPLE_FRACTION=0.02 the per-turn increment is <1, so flooring zeroed ALL sub-unit accrual — the scenario-tester read: "the constants are too COLD not too hot"). The 3B accrual field is a float, so a fractional monotonic increment is correct.

### Why no threshold-lowering was needed (mission step 2 contingency NOT triggered)
The mission anticipated that even after rescaling, exhaustion might stay below 70. That was true for `profile.exhaustion×100` (26.5 < 70). But the CORRECT field — `war_exhaustion/100` — climbs through early-war and crosses 65 in early-mid 1993 (~w38–55, never 1992) and saturates ~100 by ~w80. So reconciling to the right field already produces late-war Tier-0 firing with the ratified thresholds intact. **No constant was tuned** — this keeps Phase IV-a to one conceptual change.

### Files changed
- `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts` — Tier-0 reads `war_exhaustion/100`.
- `src/sim/pressure/phase3b_pressure_exhaustion.ts` — removed `Math.floor(delta)`.
- `src/scenario/scenario_runner.ts` — `ENABLE_COLLAPSE=true` env-gated enable of the 3A→3D chain (no default touched; no scenario file edited).
- `tests/collapse_phase1_disabled.test.ts` — unit tests set exhaustion on the reconciled field (`war_exhaustion`, 0..100 scale) via a `setExhaustion0to100` helper. 17/17 green.

---

## 2. Does collapse fire now? — Tier-0 YES, Phase 3D NOT YET (precise blocker identified)

| Metric | collapse-OFF (n0) | collapse-ON (n1) |
|---|---|---|
| Spatial match | 649/712 | **649/712** |
| Per-controller delta vs oct1995 | RS +6, RBiH −5, HRHB −1 | **identical** |
| Anchors | 30/30 | **30/30** |
| Final-state hash | `ad190ed644972150` | `753f2c7b1882f883` |
| OSIDs differing ON vs OFF | — | **0** |

Hash differs (3A/3B/3C ran and perturbed `profile.exhaustion` + eligibility state) but **territory is byte-identical** at the controller level.

### Tier-0 NOW FIRES (reconciliation verified working)
- **HRHB `eligible_spatial = true` from ~t60** — `war_exhaustion/100` crosses 65 AND ≥10% of HRHB-controlled OSIDs are BFS-isolated from supply (its central-Bosnia pockets). Persistence reaches 141 by t188.
- RBiH / RS spatial = **false** (each has <10% controlled OSIDs isolated → spatial coherence gate doesn't pass).
- Authority + cohesion domains = **false for all factions** (see §3).

### Phase 3D did NOT fire — and exactly why
`collapse_damage` entries = 0, `capacity_modifiers` = 0, `local_strain` entries = 0, Tier-1 entities = 0.

**Root cause (debug-instrumented, then reverted):** `computeFrontEdges(state, settlementEdges)` returns **0 derived front edges every turn** → `state.military.front_pressure` stays EMPTY → `computePressureExposureByEntity()` returns an empty map → Tier-1 per-OSID `local_strain` never accrues → Phase 3D has no eligible Tier-1 OSID to resolve.

**Why the substrate is empty:** `settlementEdges` is present (17116 edges) but `getSettlementControlStatus()` returns `unknown` for **all** sampled pairs (2000/2000). This scenario tracks control at the **OSID level** (`political_controllers` keyed `op:mun:osid`), whereas the Phase 3A→3D collapse substrate (`computeFrontEdges` + `pressure_exposure.ts`) is wired to the **legacy settlement-level** front model. The live front model is `computeFrontEdgesOsid` (OSID-level), already populated as `state.military.war_front_edges_osid`. The collapse substrate simply isn't reading it. (The audit harness sidesteps this by seeding `front_pressure` directly — which is why the pipeline tested green in isolation but produces nothing in real play.)

**This is an architectural disconnect, not a tuning miss.** Re-routing Tier-1 exposure onto the OSID front model is a separate engine change with its own §6 + calibration review — out of Phase IV-a scope (which was unit reconcile + first fire via threshold). It is the precise, named next blocker for Phase IV-b.

---

## 3. Scenario-creator-runner-tester calibration read

> **(1) Unit reconciliation — CORRECT.** `war_exhaustion/100` is the right field: it is the engine's open-ended war-weariness accumulator, deliberately 100×-rescaled from the original 0..100 percentage scale (exhaustion.ts:113-124), with all sibling gates rescaled in lockstep. The collapse constants 70/65/100 are unmistakably on that scale. `profile.exhaustion` (0..1) was a normalized legacy artifact. GO on the reconciliation; thresholds stay 70/65.
>
> **(2) The OSID-substrate re-route IS the correct next blocker — no simpler activation exists.** Tier-1 requires a non-empty per-OSID exposure signal, and the only live source is the OSID front model (`war_front_edges_osid`). Feeding Tier-1 exposure from it (plus an OSID-keyed pressure magnitude) is its own change with its own §6 + calibration review; do NOT bundle into IV-a.
>
> **(3) Authority/cohesion gates ARE too cold; spatial is the right channel and looks healthy.** Authority pinned at 50 (never <30) and formation fatigue capped at 30 (never >30) make the authority + cohesion collapse domains structurally dead. For a real late-war cascade those fields must actually move (or the gates be re-anchored to where the fields live). BUT the spatial domain — supply-isolated pockets starving — is the historically correct primary channel and already differentiates: HRHB (isolated central-Bosnia pockets) eligible; RBiH/RS not. Once the substrate feeds real pressure, the western-Krajina over-extension (Sana/Storm corridor) is where RS spatial isolation should emerge. The engine is pointed at the right cascade; it just can't fire it through the empty substrate.
>
> **(4) Tuning direction (AFTER substrate fix — do not apply now):** Do NOT lower Tier-0 spatial below 65 (war_exhaustion saturates 100 by ~w80, so 65 already yields late-war eligibility; lower risks 1992 firing). First real levers once 3D fires: `STRAIN_FRACTION`/`TIER1_THRESHOLD` (which OSIDs reach Tier-1) + `SPATIAL_IMPACT` (how hard supply_mult bites) — build-spec runs 3-4. Re-anchor/animate authority+fatigue before relying on those domains; for 1.0 the spatial-only channel may suffice and is the cleanest single causal story (isolation → starvation → collapse). This is a GUARD-preserving result (649→649, 30/30, §6 intact) — safe to hold; the territory-moving step is gated behind the substrate fix + owner re-floor.

---

## 4. Validation summary

- `tsc --noEmit`: clean.
- Collapse unit + §6 suite (`collapse_phase1_disabled` 17, `collapse_phase1_bfs_disabled_inert` 3, `collapse_phase1_g2_section6_invariant` 4): **24/24 green**.
- **Byte-identical-disabled proof:** collapse-OFF run AFTER the code changes = hash `ad190ed644972150` — IDENTICAL to the pre-change baseline. The changes are provably inert when collapse is OFF (the default; no production path flips the flags — only `ENABLE_COLLAPSE=true`).
- §6 gate: PASS (see §0).

## 5. What Phase IV-b needs (for owner)

1. **Re-route the Tier-1 exposure substrate onto the OSID front model.** Feed `computePressureExposureByEntity` (or a successor) from `state.military.war_front_edges_osid` + an OSID-keyed pressure magnitude, instead of the empty settlement-level `front_pressure`. This is the single blocker between "Tier-0 fires" and "3D writes damage / territory moves." §6 guard G1 already covers the OSID space (it keys on `getEnclaveDefForOsid(osid)`), so the enclave protection survives the re-route — but re-verify.
2. **Decide the authority/cohesion domains' fate:** animate `profile.authority` / formation fatigue past their gates, OR re-anchor the gate thresholds, OR ratify spatial-only collapse for 1.0.
3. **Then** run the build-spec calibration campaign (runs 3-N) and the single owner-signed re-floor. This artifact is the go/no-go input for that decision.
