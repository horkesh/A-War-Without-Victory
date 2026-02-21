# Run Summary: Per-Faction Order Counts (Scenario Harness + Creator Review)

**Date:** 2026-02-18  
**Purpose:** Document the addition of per-faction attack order counts to `run_summary.json` and end_report.md, with Scenario-harness-engineer and Scenario-creator-runner-tester review.

---

## 1. Scenario-harness-engineer: output format and determinism

### Output format changes (explicit)

| Artifact | Change | Impact |
|----------|--------|--------|
| **run_summary.json** | `phase_ii_attack_resolution.orders_by_faction` added: `Record<string, number>` (faction → count of orders processed in Phase II). Keys in sorted order for determinism. | Consumers can compare HRHB vs RBiH vs RS attack activity; backward compat: new key only. |
| **run_summary.json** | `phase_ii_attack_resolution_weekly[].orders_by_faction` added: same shape per week. | Enables weekly breakdown by faction for calibration loops. |
| **end_report.md** | Phase II attack resolution section: new line "Orders by faction: HRHB=n, RBiH=n, RS=n" when `orders_by_faction` is non-empty. | Human-readable per-faction totals in end_report. |

### Determinism and pipeline

- **resolve_attack_orders.ts:** Builds `orders_by_faction` from `battleReport.battles`; faction from `state.formations[b.attacker_brigade].faction`. Output object keys built from `Object.keys(ordersByFaction).sort()`.
- **scenario_runner.ts:** Aggregates weekly `orders_by_faction` into summary with sorted faction keys; weekly rollup copies with sorted keys. No timestamps; no new RNG.
- **Stable ordering:** Faction keys in all emitted objects are sorted so identical runs produce identical JSON.

### Findings

- Pipeline stage: Phase II resolve-attack-orders report now includes `orders_by_faction`; scenario_runner aggregates and passes through to run_summary and end_report.
- No change to preflight, schema version, or artifact naming. Existing determinism tests (same scenario + seed → same hash) remain valid; new field is additive and deterministic.

---

## 2. Scenario-creator-runner-tester: run summary and plausibility

### Scenario and run

- **Scenario:** apr1992_definitive_52w (April 1992 start, Phase II, hybrid_1992 control).
- **Run:** 2-week checkpoint (w0–w1) for verification; 16-week run available separately.

### Run summary (2w checkpoint)

- **Phase II attack resolution (2 weeks):** orders_processed 114, unique_attack_targets 114, flips_applied 91.
- **Orders by faction (2w total):** HRHB 5, RBiH 93, RS 16.
- **Weekly:** w1 → HRHB 4, RBiH 49, RS 10; w2 → HRHB 1, RBiH 44, RS 6.
- **Control / formations:** Anchor checks passed (Zvornik, Bijeljina RS; Srebrenica, Bihac, Tuzla RBiH; etc.). Formation deltas plausible for 2 weeks.

### Plausibility verdict

- **One-line:** 2-week run is plausible for April 1992: RBiH and RS dominate attack orders; HRHB low in first two weeks (Consolidate Herzegovina phase). Per-faction counts now visible for bot calibration (e.g. HRHB Lasva window 12–26).

### Flags

- None for this change. Per-faction counts are diagnostic only; they do not alter simulation behavior.

### Proposals

1. **Use per-faction counts in bot calibration:** When tuning HRHB (or any faction) activity, compare `phase_ii_attack_resolution.orders_by_faction` and `phase_ii_attack_resolution_weekly[].orders_by_faction` across 4w/16w runs to confirm intended balance (e.g. HRHB higher in weeks 12–26 after Lasva tuning). Scenario-creator-runner-tester can assess plausibility; gameplay-programmer tunes levers.
2. **Optional:** If downstream tooling (e.g. calibration_log.md) is added, document that run_summary.phase_ii_attack_resolution.orders_by_faction is the single source for per-faction order totals.

---

## 3. References

- **Implementation:** `src/sim/phase_ii/resolve_attack_orders.ts` (report), `src/scenario/scenario_runner.ts` (aggregation), `src/scenario/scenario_end_report.ts` (types + end_report line).
- **Handoff:** NEXT_BOT_PRIORITY_AOR_OR_HRHB_HANDOFF_2026_02_18 (Candidate B HRHB activity); per-faction counts enable 4w/16w comparison for HRHB orders.
