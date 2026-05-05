# A War Without Victory — Phase Specifications v0.9.0

**Last Updated:** 2026-05-05

## v0.9.0 phase model: War only

The simulation has a single lifecycle phase:

- **War**: Sustained conflict with fronts, OSID location, attack resolution, supply, exhaustion, frontage cap, local front density. *(ZoC removed 2026-03-02.)* See [War_Specification_v0_9_0.md](War_Specification_v0_9_0.md).

All canonical scenarios start in April 1992 directly in **War** phase. There is no pre-war or peace phase.

Early-war mechanics (militia emergence, JNA dissolution, pool population, alliance updates) run as part of the war-phase pipeline during the first ~12 weeks. See `src/sim/turn_phases/early_war_phases.ts`.

One game turn equals one week.

## Document purpose

This document is the index for the single-phase (War) lifecycle. The phase specification includes purpose, canonical inputs, mechanical behavior, output contract, and determinism requirements.

## Frozen subsystems (not lifecycle phases)

Phase 3A (Pressure Eligibility), Phase 3B (Pressure to Exhaustion Coupling), and Phase 3C (Exhaustion to Collapse Gating) remain design-frozen **subsystems** referenced by the Systems Manual. They are not lifecycle phases; they integrate into the War phase when enabled.

## Pipeline additions through v0.9.0

The War-phase pipeline (151 NamedPhase steps as of v0.9.x; see `src/sim/turn_phases/war_phases.ts`) accumulates substrate work without breaking the single-phase model. Notable v0.7.x → v0.9.x additions integrated into the War phase:

- **Officer system pipeline steps** (v0.7+): `update-officer-quality`, `officer-succession`, `tick-elite-loans`. See Systems Manual §7.5–§7.7.
- **Operation preparation state machine** (v0.7+): five sub-phases (intel_gathering → force_staging → supply_check → assessment → ready) embedded inside `advance-sector-offensives`. See Systems Manual §7.6.
- **AI commander pipeline steps** (v0.4.5 / v0.4.9): `ai-army-decisions`, `ai-corps-decisions`, `ai-corps-dialogue`, `ai-battle-narratives`, `ai-war-dispatches`. Optional; default `cadet` mode is formula-only and deterministic. See Systems Manual §7.9.
- **Sector intel + fog-of-war** (v0.7+): per-sector confidence model + recon-by-force probes; per-OSID OPSEC reduces enemy passive intel buildup. See Systems Manual §8a.
- **Supply Phase A–E** (2026-03-01 → 2026-03-03): consumption-driven `general_supply_reserve` + `heavy_munitions_reserve` reserves layer + siege drain + patron aid + UN airdrops. Steps `supply-osid`, `update-siege-counters`, `compute-supply-reserves`, `enclave-resilience`. Mission C A0 Tarjan optimization (Wave 2, commit `a60d39c9`, 2026-05-04) replaced O(E²) per-edge BFS-removal in `findBridgesInSubgraphOsid` with O(V+E) iterative Tarjan, byte-identical hash. See Systems Manual §14.2.
- **Triggered + queued operations** (Mission B): `inject-queued-operations`, `check-triggered-operations`. Pipeline order asserted by structural test `tests/triggered_op_temporal_contract.test.ts`.
- **Replay save sequence emit** (LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER + producer, 2026-05-04): per-turn save snapshots written by harness as `replay_save_sequence.json` sidecar. Pure observability; harness emit, not engine.
- **Per-turn brigade temporal log emit** (LANE-2026-05-02-A1-PER-TURN-BRIGADE-SNAPSHOT, 2026-05-02): `brigade_temporal_log.jsonl` 20-field row schema written by harness. Schema extended with optional `officer_quality` + `officer_count_active` fields (Force-Quality Gap 1, commit `0bd5a938`).

None of these additions reintroduce a peace phase or alter the single-phase model. Each is documented in Systems Manual §6 / §7 / §14 / Appendix A as the authoritative implementation spec.

## v0.9.0 Canon audit

This document (v0.9.0) is the canon-doc-version-bump pass for the single-phase (War only) lifecycle. Supersedes the v0.7.3-bodied / v0.6.0-filename Phase_Specifications and the earlier two-phase model (Peace, War). Substantive single-phase content unchanged from v0.7.3; pipeline-additions section new at v0.9.0 to make pipeline accretion through v0.7.x → v0.9.x explicit.

---

*Phase Specifications v0.9.0 — War only; v0.8 Command Chain + v0.9 product-spine pipeline accretion noted explicitly*
