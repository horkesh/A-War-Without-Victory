# D2 Diffusion Ratification — `setEnablePhase3ADiffusion` ON or OFF for the Collapse D2 188w measurement?

**Date:** 2026-06-10
**Panel:** 2-lens Pyrrhic ratification (ENGINE/systems + CALIBRATION/scenario-tester), read-only
**Question:** The merged #381 `ENABLE_COLLAPSE` gate (`src/scenario/scenario_runner.ts:1900–1905`) enables 4 flags (3A pressure-eligibility + 3B + 3C + 3D) but NOT `setEnablePhase3ADiffusion` (`src/sim/pressure/phase3a_pressure_diffusion.ts:24`). The closed #379 gate enabled all 5. Should D2's 188w measurement pair run diffusion ON or OFF?
**Carried from:** `docs/40_reports/20260610_COLLAPSE_PHASE3_ENABLE_CAMPAIGN.md` (lines 109–111, explicit open question).

---

## Lens 1 — ENGINE/systems

### What diffusion does mechanically

`runPhase3APressureDiffusion` (`phase3a_pressure_diffusion.ts:90–347`) is a **conservative redistribution of `state.military.front_pressure`** — the *settlement-keyed* edge-pressure field (`edge_id = "sidA__sidB"`):

1. Splits each pressure edge's `|value|` half/half onto its two endpoint **settlement** nodes.
2. Moves at most `min(2.0, 5% of node pressure)` per node per turn (`DIFFUSE_FRACTION = 0.05`, `DIFFUSE_MAX_OUTFLOW = 2.0`) along **Phase 3A effective edges** (eligible contact-graph edges, weight 0–1), proportional to edge weight.
3. Maps node pressure back onto the original edges, integer-rounds with deterministic conservation fix-up, and writes `front_pressure` **in place**. Total pressure is conserved.

It consumes `phase3aEffectiveEdges` built by the `phase3a-pressure-eligibility` step and runs as pipeline step `phase3a-pressure-diffusion` (`war_phases.ts:3730–3737`), gated on `getEnablePhase3A() && getEnablePhase3ADiffusion()`.

### Namespace: settlement-keyed — and INERT in OSID-native scenarios

- The function is **settlement-namespace keyed**: both `front_pressure` keys and the Phase 3A effective-edge endpoints are settlement SIDs from the enriched contact graph. A strict namespace check (`:141–157`) **throws** in the production path if pressure keys fall outside the Phase 3A settlement namespace.
- **Decisive fact:** in OSID-native scenarios (the 188w campaign), `state.military.front_pressure` is **structurally empty `{}`** — established by the IV-b scope doc (`20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md` §A.1–A.2, R1/R2): the sole writer `accumulateFrontPressure` receives 0 settlement front edges, so it writes nothing. Diffusion then early-returns at `edgeIds.length === 0` (`:118–124`, reason `no_pressure`) **before** the namespace check — it neither moves pressure nor throws.

### Does it touch anything the D2 exposure adapter reads?

**No.** The D2 adapter `computePressureExposureByEntityOsid` (`pressure_exposure.ts:115–145`, merged #383) reads **`state.military.war_front_edges_osid`** topology with a uniform M1 magnitude (1.0 per edge, half-split). It never reads `front_pressure`. Even in a hypothetical world where diffusion DID move pressure, its output is invisible to the OSID exposure path D2 wires into 3C. The only consumers of diffused `front_pressure` are the settlement-variant exposure (`computePressureExposureByEntity`, `:45`) and 3B's settlement read (`phase3b_pressure_exhaustion.ts:114`) — both already empty-input no-ops in OSID-native runs.

**Engine finding: diffusion is doubly inert for D2** — (a) no input (empty `front_pressure`), (b) no consumer on the OSID exposure path. Enabling it changes nothing D2 measures; it only adds an unexercised code path (with a strict-throw branch) to the run.

## Lens 2 — CALIBRATION/scenario-tester

1. **One-change-per-run (Sacred Rule).** D2's first 188w measurement must isolate ONE change: the 3C call-site wire-in to the OSID adapter. Flipping diffusion ON simultaneously = two changes. If anything moves, attribution is ambiguous — exactly what the rule exists to prevent. "Expected inert" is a prediction, not evidence; predictions get their own run.
2. **Precedent-chain integrity.** Phase IV-a's §6 PASS and byte-identical-when-OFF evidence were measured with diffusion OFF (4-flag gate). The merged #381 gate IS the 4-flag gate. Switching to the 5-flag configuration for D2 invalidates the IV-a precedent chain the D2 sign-off leans on — the comparison baseline would no longer match the measured configuration.
3. **Risk asymmetry.** ON buys nothing (engine lens: doubly inert) and costs precedent validity plus a live strict-throw branch in a 188w run. OFF costs nothing — there is no settlement pressure to diffuse.
4. **Future lane shape.** If diffusion ever becomes material, the real lane is "make a pressure substrate live for OSID-native scenarios" (M2+ magnitude or an OSID-keyed pressure field — note the scope doc marks `war_front_pressure_osid` as FORBIDDEN without a fresh §6 review). The flag flip alone is not a lane; the substrate is.

## VERDICT

**OFF** for the D2 188w measurement pair (concurring with the dispatcher's prior, on independent engine evidence). Revisit-as-its-own-lane only if/when a live OSID-era pressure substrate exists for diffusion to act on — until then there is no lane, just a dead flag.

**One-line rationale:** Diffusion is doubly inert in the D2 configuration (settlement-keyed `front_pressure` is structurally empty in OSID-native 188w runs, and the D2 OSID exposure adapter never reads `front_pressure`), so enabling it adds a second simultaneous change and breaks the diffusion-OFF IV-a precedent chain for zero measurable benefit.

**Directive to the D2 build agent:** run the 188w pair with the merged #381 4-flag `ENABLE_COLLAPSE` gate exactly as-is — do NOT add `setEnablePhase3ADiffusion(true)`.
