# Investigation: 803rd Light with 223 Settlements in Latest Run

## Summary

In the latest run (`data/derived/latest_run_final_save.json`), the **803rd Light** (ARBiH, home mun Goražde) has **223 settlements** in its brigade AoR. The hard operational cap is 48 settlements; the dynamic cap further limits how many are treated as actively covered for garrison/pressure. So the brigade *owns* 223 settlements in `brigade_aor` but only a capped subset is used for gameplay. The investigation explains why 803rd ended up with so many settlements in the first place.

## Findings

### 1. Design: AoR size vs operational coverage

- **`brigade_aor`** is the full set of settlements assigned to a brigade (ownership). It is **not** capped at 48.
- **Operational coverage** is capped: `getBrigadeOperationalCoverageSettlements()` returns at most `BRIGADE_OPERATIONAL_AOR_HARD_CAP` (48) settlements, and the dynamic cap (personnel/readiness/posture) can reduce that further.
- So 223 in AoR is allowed by design; only the *usage* of that AoR (pressure, garrison, attack) is capped. The oddity is that 803rd *owns* 223, not that the game treats all 223 as operationally covered.

### 2. How 803rd got 223 settlements

AoR is **derived from municipality assignment**:

1. **Municipality layer**  
   Each brigade has `brigade_municipality_assignment`: a list of municipalities it is responsible for.

2. **Settlement assignment**  
   `deriveBrigadeAoRFromMunicipalities()` assigns to brigades only settlements that are in **expanded front-active** (front line + 1 hop behind). For each (faction, municipality), it assigns all such settlements in that municipality to the brigade(s) that have that municipality. If only one brigade has that municipality, it gets all of them; if several share it, `assignSharedMunicipalitySettlements()` splits by BFS with deterministic tie-breaks.

So the size of 803rd’s AoR is:

- **Number of municipalities** assigned to 803rd, and  
- **Number of expanded-front-active settlements** in those municipalities.

803rd has **multiple municipalities** (not only Goražde). Goražde alone has ~184 settlements in the data; 223 − 184 ≈ 39, so at least one other municipality (or more) is contributing the rest.

### 3. Why 803rd got so many municipalities

In `ensureBrigadeMunicipalityAssignment()` the flow is:

1. **Voronoi BFS** (or bootstrap from existing AoR) assigns front-active settlements to brigades and builds an initial municipality list per brigade (one mun per claimed settlement, then unique).
2. **HQ fallback** gives brigades with no municipalities their HQ municipality.
3. **“Ensure every front-active (faction, municipality) has at least one brigade”**  
   For each (faction, mun) that has at least one settlement in `allFrontActive` and is not yet covered, the code picks the brigade with **the fewest municipalities** (then by formation id). That brigade gets that municipality added.

So any brigade that starts with **fewer** municipalities than others (e.g. 803rd with only Goražde from Voronoi/HQ) is repeatedly chosen for **uncovered** (faction, mun) pairs. In a scenario with many RBiH front municipalities (e.g. apr1992 Phase II, hybrid_1992, many OOB brigades), 803rd can be assigned many of these “fill” municipalities. Deterministic ordering (sid sort, then formation id) makes this reproducible but can concentrate municipalities on one brigade.

### 4. Data consistency

- **Settlement → municipality** in the run comes from `buildSidToMunMap(Object.keys(pc), graph.settlements)`. The graph is loaded from `settlements_initial_master.json`, which has 5823 settlements with `mun_code` and `mun1990_id`. So sid→mun is complete for all settlements in the graph; no fallback to “sid as municipality” was needed for this run.
- **Goražde** has ~184 settlements in `political_control_data.json` (mun1990_by_sid). 803rd’s 223 = Goražde’s expanded-front-active settlements plus those from the extra municipalities it received in the fill step.

## Root cause (concise)

803rd Light has 223 settlements because:

1. It is assigned to **multiple municipalities** (Goražde plus others).
2. The “ensure every (faction, mun) has a brigade” heuristic assigns uncovered front municipalities to the brigade with **fewest** current municipalities, so 803rd (starting with one) received many of these.
3. **Derive** then gives 803rd every **expanded-front-active** settlement in all those municipalities, yielding 223 in total.

Operational behavior is still correct: only a capped subset of those 223 is used for garrison/pressure/attack. The issue is **imbalanced municipality assignment**, not a bug in the cap or in derivation.

## Recommendations

1. **Cap or balance municipality assignment**  
   When assigning “uncovered” (faction, mun) to a brigade, consider:
   - A **max municipalities per brigade** (e.g. from canon or design), or  
   - A **balance** so that no brigade receives more than K municipalities from the fill step (e.g. round-robin by mun count after Voronoi/HQ).

2. **Optional: cap raw AoR size**  
   If design wants to limit how many settlements a brigade can *own* (not only how many are “operationally covered”), add a cap when building or deriving AoR (e.g. per-brigade max settlements in `brigade_aor`), with a deterministic rule for which settlements to keep (e.g. by distance from HQ, then sid).

3. **Leave as-is**  
   If the intent is that AoR can be large and only operational coverage is capped, no change is required beyond documenting that 803rd (and similar cases) can have large AoR when they are assigned many municipalities by the current fill heuristic.

## References

- `src/sim/phase_ii/brigade_aor.ts`: `ensureBrigadeMunicipalityAssignment`, `deriveBrigadeAoRFromMunicipalities`, `getBrigadeOperationalCoverageSettlements`
- `src/state/formation_constants.ts`: `BRIGADE_OPERATIONAL_AOR_HARD_CAP` (48)
- `src/state/brigade_operational_cap.ts`: dynamic cap from personnel/readiness/posture
- `docs/40_reports/municipality_supra_layer_implementation_report.md`
- Napkin: “Hard frontage cap”, “Municipality supra-layer”
