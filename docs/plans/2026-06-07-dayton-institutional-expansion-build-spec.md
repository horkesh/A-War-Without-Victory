# Dayton Institutional-Architecture Expansion — Consolidated Build Spec

**Status:** Phase 1 (DATA + TYPES + dysfunction-index extension) — BUILDING.
**Frame:** `docs/plans/2026-06-07-dayton-comprehensive-negotiation-design.md` (D1/D2/D3 already shipped on main).
**Owner direction:** the Dayton endgame should negotiate not only the **map** but the **detailed state structure** — entity autonomy, jurisdictions/competencies, constitutional architecture, return/justice.
**Gate:** Ring-1, emergent-gated, no §6. 40w `final_state_hash` == `2221700edf20621e` (UNCHANGED) — the historical-default proposal must produce the SAME index + finalInstitutional + verdict as today.

This document is the durable record of the reconciled Historian + Game-Designer design AND the Phase-2/3 contract. Phase 1 builds the additive foundation (data + types + dysfunction extension). Phase 2 wires cost dials + bot preference vectors + verdict bands. Phase 3 builds UI.

---

## Phase split

| Phase | Scope | This PR? |
|---|---|---|
| **1** | DATA (competency + constitutional + return/justice packages), TYPES (optional `DaytonProposal`/`DaytonResult` extensions + `entity_autonomy` dial type), dysfunction-index extension (re-weight + gridlock component + Dim-5 modifiers + 2 new flags + graduated cap) | **YES** |
| 2 | Cost-dial multiplier logic, bot preference vectors, verdict-band wiring into `scoring.ts` / resolution into `dayton_negotiation.ts` | NO |
| 3 | `DaytonNegotiationModal.tsx` 5-dim layout + multi-round panel + readouts | NO |

---

## DIMENSION 3 — competency matrix (`src/sim/negotiation/competency_packages.ts`, NEW)

16 competencies, each owner ∈ `state | entity | shared`. `id / label / 1995-default (cited Annex-4) / weight-class`.

| id | 1995 default | weight-class | Annex-4 cite |
|---|---|---|---|
| `comp_foreign_policy` | state | sovereign-core | III(1)(a) |
| `comp_foreign_trade` | state | sovereign-core | III(1)(b) |
| `comp_monetary` | state | sovereign-core | III(1)(d) + VII |
| `comp_defense` | **entity** | sovereign-core | III(3)(a) residual — TIME-SHIFTED: entity in 1995, state only post-2005 reform; 1995 label = entity |
| `comp_police` | entity | coercive | III(3)(a) |
| `comp_customs` | state | fiscal | III(1)(c) |
| `comp_taxation` | entity | fiscal | III(3)(a) |
| `comp_state_finance` | state | fiscal | III(1)(e) |
| `comp_judiciary` | entity | rule-of-law | III(3)(a) |
| `comp_intl_criminal_enforcement` | **shared** | rule-of-law | III(1)(g) |
| `comp_immigration_asylum` | state | rule-of-law | III(1)(f) |
| `comp_education` | entity | social | III(3)(a) |
| `comp_health_social` | entity | social | III(3)(a) |
| `comp_communications` | state | connective | III(1)(h) |
| `comp_inter_entity_transport` | **shared** | connective | III(1)(i) |
| `comp_air_traffic` | state | connective | III(1)(j) |

### Cost band by weight-class (Phase-1 = base, pre-dial)
`state_cost → RS` (centralizing toward state costs RS); `entity_cost → RBiH` (decentralizing toward entity costs RBiH); `shared_cost → both ½ each`. HRHB pays `floor(cost*0.5)` on the losing side.

| weight-class | state | entity | shared |
|---|---|---|---|
| sovereign-core | 20 | 14 | 16 |
| coercive | 16 | 11 | 12 |
| fiscal | 15 | 10 | 11 |
| rule-of-law | 12 | 9 | 9 |
| social | 10 | 6 | 7 |
| connective | 8 | 5 | 6 |

**Cost is 0 when `choice === historical default`** (only deviation charges).
`getCompetencyCost(comp, choice, faction)` returns the BASE (pre-dial) cost. The dial multiplier is Phase 2.

---

## DIMENSION 4 — constitutional architecture (`src/sim/negotiation/constitutional_packages.ts`, NEW)

5 sub-choices. `id / options / 1995-default / base cost (payer)`:

| id | options (default first) | base costs |
|---|---|---|
| `arch_presidency` | `tripartite_rotating`(default,0) \| `single_elected`(18→RS) \| `collective_civic`(20→RS + 8→HRHB) |
| `arch_veto_regime` | `vital_interest_entity`(default,0) \| `weighted_majority`(16→RS) \| `simple_majority`(22→RS) |
| `arch_constituent_model` | `three_peoples`(default,0) \| `civic_citizens`(18→RS + 10→HRHB) |
| `arch_const_court` | `international_judges`(default,0) \| `domestic_only`(9→RBiH) |
| `arch_ohr_authority` | `bonn_powers`(default,0) \| `monitoring_only`(10→RS) \| `none`(16→RS) |

---

## DIMENSION 5 — return/justice (`return_justice` section in constitutional_packages.ts)

| id | options (default marked) | base costs |
|---|---|---|
| `rj_refugee_return` | `full_right_of_return`(12→RS + 6→HRHB) \| `voluntary_only`(**default**,0) \| `frozen_lines`(8→RBiH) |
| `rj_icty_cooperation` | `full`(14→RS) \| `conditional`(**default**,0) \| `non_cooperation`(0) |

**HARD RULE:** return/justice choices mitigate dysfunction TONE only; they NEVER erase a locked Ring-2 condemnation flag (genocide/atrocity). Enforced as a floor mirroring the existing condemnation cap (`condemnation` component floored to ≥75 when `rj_icty_cooperation == non_cooperation`).

---

## `entity_autonomy` dial TYPE (Phase 1 = type + default only)

4 settings: `confederation | dayton-historical | federalized | unitary`. Default `dayton-historical`.
Phase 2 wires the declaration cost + deviation multiplier. Phase 1 ships the type + default constant only.

---

## Dysfunction extension (`peace_dysfunction.ts`)

Preserve sum-to-1.0 + emergent gate + byte-identical default.

### Re-weight (sum = 1.00)
| component | old | new |
|---|---|---|
| autonomy | 0.30 | **0.26** |
| fragmentation | 0.25 | **0.22** |
| **gridlock (NEW)** | — | **0.12** |
| brcko | 0.10 | **0.08** |
| refugees | 0.20 | **0.18** |
| condemnation | 0.15 | **0.14** |

### Dim 3 → folds into EXISTING autonomy component
Extend `computeEntityAutonomyIndex` / `AUTONOMY_DIMENSION_WEIGHTS` to cover the 16 competencies (re-normalized, sovereign-core heaviest). entity-ward = high autonomy. The legacy 6 institutional toggles remain weighted alongside (back-compat: empty competency map = no change to the legacy all-default = 100).

### Dim 4 → new `gridlock` component
```
gridlock_raw = veto{vital=100|weighted=50|simple=0}
             + presidency{tripartite=80|collective=40|single=0}
             + court{intl=40|domestic=0}
             + ohr{bonn=100|monitoring=50|none=0}
gridlock_component = clamp0to100(gridlock_raw / 3.2)
```
At historical default: veto=100 + presidency=80 + court=40 + ohr=100 = 320 → /3.2 = 100.

### Dim 5 modifiers
- refugees component × `{full 0.5 | voluntary 1.0 | frozen 1.25}`.
- condemnation component floored to `max(current, 75)` when `icty == non_cooperation`.

### New flags (KEEP all existing 5 → 7 total)
- `ohr_dependency`: `ohr == bonn_powers` OR `court == international_judges`.
- `sejdic_finci_fault`: `constituent_model == three_peoples`.
- `gridlock_by_design` now trips on `autonomy ≥ 60` **OR** `gridlock ≥ 60`.

### Graduated cap (`capOutcomeByPeaceDysfunction` / scoring.ts)
- `< 45` → no cap.
- `45–59` → cap `strategic_success → survival`.
- `≥ 60` → existing `hollow_victory` behavior (clean-win → hollow_victory). UNCHANGED.
- `≥ 80` AND `ratified_cleansing` → `failure`.

Keep the existing 60 behavior intact; only ADD the finer bands.

---

## Types (`negotiation_types.ts`) — all OPTIONAL, backward-compatible

Extend `DaytonProposal` with optional `entity_autonomy?`, `competency_allocation?` (record), `constitutional_choices?` (record), `return_justice?` (record). Match the shipped `brcko_status?` optional pattern.
Extend `DaytonResult` with the new structural flags (already carries `peace_dysfunction_flags?`; the 2 new flags ride that array). Add optional mirror fields for the new choice records so resolution (Phase 2) can persist them.

---

## Gate / determinism

- **BYTE-IDENTICAL:** the historical-default proposal (dayton-historical dial + all competencies/constitutional/rj at default) must produce the SAME index + finalInstitutional + verdict as today. Whole feature emergent-gated (`computePeaceDysfunctionBreakdown` returns null unless `meta.decision_mode === 'emergent'`) + post-w188. 40w `2221700edf20621e` unchanged.
- The re-weighted vector + extended autonomy index must reproduce the current default index within rounding. **Test pins the all-default index == pre-change value.**
- Determinism: no Date.now/Math.random; strictCompare-sorted; integer-rounded.
- tsc clean + negotiation/peace_dysfunction/scoring suites green + new focused tests (each competency/constitutional/rj default cost == 0; the 2 new flags; the graduated cap bands; the all-default byte-identity).

### Pre-change all-default index (pin target)
Historical default (empty proposal → all-decentralized institutional choices, no competency/constitutional/rj overrides, arbitration Brčko, genocide condemnation, max refugees) — the test computes the pre-change index analytically and pins the post-change index equal within rounding by construction of the gridlock=100 + autonomy=100 defaults.

---

## What Phase 2 MUST honor (contract)

1. **`getCompetencyCost` returns BASE (pre-dial) cost.** Phase 2 multiplies by the `entity_autonomy` dial multiplier; do not double-charge.
2. **Cost == 0 at historical default** is load-bearing for byte-identity — Phase 2's dial must preserve "default = free".
3. **Condemnation floor (≥75 on `non_cooperation`) is a FLOOR, not a tone knob** — Phase 2 verdict wiring must not allow rj choices to lift a locked rupture.
4. **The 16-competency autonomy extension defaults entity-ward** — an empty/partial competency map reads as maximally autonomous (matches the legacy 6-toggle default). Phase 2 resolution must persist `competency_allocation` so the index sees deviations.
5. **gridlock=100 at historical default** — Phase 2 must keep the constitutional defaults (vital_interest_entity / tripartite_rotating / international_judges / bonn_powers) as the free baseline.
6. **Graduated cap bands** are owner-tunable verdict dials in `peace_dysfunction.ts`; Phase 2 scoring wiring reads `capOutcomeByPeaceDysfunction` — do not re-implement.
7. All new `DaytonProposal`/`DaytonResult` fields are OPTIONAL — Phase 2 resolution reads-with-default, never requires them.
