# Full 52-Week Run Report — Bots, Brigade Movement, and Frontline Emergence

**Date:** 2026-02-21  
**Scenario:** apr1992_definitive_52w  
**Run id:** apr1992_definitive_52w__102fea508092873d__w52_n46  
**Run folder:** `runs/apr1992_definitive_52w__102fea508092873d__w52_n46`  
**Final state hash:** 798741a42ffd136a (deterministic; matches prior 52w run)

---

## 1. Executive summary

A second full 52-week headless run of the canonical April 1992 scenario completed successfully. Results are **deterministic** (same final_state_hash as run n45). This report provides a **full** summary of run outcomes and, as requested, **detailed sections on how bots move brigades and how frontlines emerge**.

**Headline outcomes:** 6/8 historical anchors passed (centar_sarajevo and S163520/Sapna failed). Phase II: 82 orders, 73 settlement flips, 424/438 casualties; all 82 battles defender-absent. Formation delta +4 brigades. Front-active and pressure-eligible edge counts stay high and nonzero for all 52 weeks; frontlines are derived every turn from control and adjacency and drive assignable segments and corps front tracking.

---

## 2. Run dimensions (summary table)

| Dimension | Source | Value |
|-----------|--------|--------|
| **Anchors** | run_summary | 6/8 passed. Failed: centar_sarajevo (RBiH→RS), S163520/Sapna (RBiH→RS). Passed: zvornik, bijeljina, srebrenica, bihac, banja_luka, tuzla |
| **Control (net)** | run_summary, end_report | HRHB 1018→1014; RBiH 2297→2256; RS 2507→2552. 109 settlements with controller change |
| **Phase II combat** | run_summary | 82 orders (HRHB 1, RBiH 8, RS 73); 73 flips; 424 att / 438 def casualties; 0 defender-present, 82 defender-absent; 35 weeks with orders |
| **Formations** | run_summary | +4 brigades (HRHB +3, RS +1, RBiH 0). Personnel: HRHB 17646→23355, RBiH 61233→100675, RS 43835→56857 |
| **Activity (front/pressure)** | activity_summary | front_active_set_size: max 3953, mean 3784.7; pressure_eligible_size: max 3944, mean 3779.2; nonzero weeks 52/52 |
| **front_corps_tracking** | run_summary | corps_count 9, corps_front_edges_present true |
| **Bot benchmarks** | run_summary | 6 evaluated, 4 passed, 2 failed (RBiH hold_core_centers, preserve_survival_corridors) |
| **Displacement** | run_summary | Takeover: 25 timers started, 16 matured; 10 camps, 207 routed; 218,355 displaced. Minority flight: 357,186 displaced |

---

## 3. How bots move brigades

Bots move brigades in two ways in Phase II: **(A) municipality-level AoR expansion** (where a brigade is responsible for which municipalities) and **(B) attack orders** (which settlement to attack). This section focuses on **movement of responsibility** (AoR expansion); attack selection is documented in bot_brigade_ai and bot_strategy and is not repeated here.

### 3.1 Pipeline order (Phase II)

Within each Phase II turn, the relevant sequence is:

1. **generate-bot-brigade-orders** — Bots issue orders (reshape, posture, attack, and **brigade_mun_orders**).
2. **apply-municipality-orders** — Brigade municipality orders are applied: `brigade_municipality_assignment` is updated.
3. **ensure-derived-corps-front-edges** — Corps front edges derived from brigade AoR when absent.
4. **apply-corps-front-orders** — Corps front auto-distribution.
5. … (pressure, attack resolution, consolidation flips, displacement, etc.)
6. **phase-e-aor-derivation** — Brigade AoR (settlement-level) is (re)derived from `brigade_municipality_assignment` and control.

So: **bot orders → apply municipality orders → later, AoR is derived from the updated assignment.** Movement of “which municipalities this brigade covers” is therefore: bot writes `brigade_mun_orders`, then `applyBrigadeMunicipalityOrders` updates `brigade_municipality_assignment`; AoR follows from that.

### 3.2 How bots issue brigade municipality orders (Step 3 / 52w plan)

- **Source:** `src/sim/phase_ii/bot_brigade_ai.ts`, `generateAllBotOrders()`.
- **Rule:** **One expansion per bot faction per turn.** For each bot faction, the code:
  - Builds the set of municipalities already assigned to any brigade of that faction (`brigade_municipality_assignment`).
  - Iterates brigades (sorted by ID). For the first brigade that (a) has fewer than `MAX_MUNICIPALITIES_PER_BRIGADE` (8) and (b) can add one **adjacent** municipality that is already in the faction’s set but not in this brigade’s list, it sets:
    - `state.brigade_mun_orders[brigadeId] = [ ...currentAssignment, addedMunId ]`.
  - Stops after issuing one such order per faction per turn (`issued = true`).
- **Effect:** Brigades slowly expand their responsibility along adjacency, into territory already held by the same faction. No cross-front “jump”; expansion is contiguous and within-faction.

### 3.3 How municipality orders are applied

- **Source:** `src/sim/phase_ii/brigade_aor.ts`, `applyBrigadeMunicipalityOrders()`.
- **Input:** `state.brigade_mun_orders` (record of formation ID → list of municipality IDs).
- **Validation:** Each order is checked for: valid brigade, HQ municipality included, all targets adjacent (to HQ or to current/accept set), max municipalities per brigade (8), max brigades per municipality per faction. Rejected orders are counted and cleared; accepted orders update `state.brigade_municipality_assignment`.
- **Output:** `state.brigade_municipality_assignment` updated; `state.brigade_mun_orders` cleared. Later in the same turn, **phase-e-aor-derivation** derives settlement-level `brigade_aor` from `brigade_municipality_assignment` (and control), so brigades “move” in the sense of expanding (or, when orders are rejected, not changing) their area of responsibility.

### 3.4 What this run shows

- **front_corps_tracking:** `corps_front_edges_present: true`, `corps_count: 9` — headless run derives corps front edges (from brigade AoR) and tracks them.
- **Activity:** Front-active and pressure-eligible sets are large (thousands of edges) and nonzero every week, so there is a large, stable set of edges where control opposes; bot AoR expansion and attack resolution act on that landscape.
- **Phase II orders by faction:** RS 73, RBiH 8, HRHB 1 — RS dominates attack orders; municipality expansion is one-per-faction-per-turn and thus modest in aggregate but cumulative over 52 weeks.

---

## 4. How frontlines emerge

Frontlines in this engine are **derived from settlement-level control and adjacency**. They are not stored as persistent geometry; they are recomputed each turn.

### 4.1 Definition of a “front edge”

- **Source:** `src/map/front_edges.ts`, `computeFrontEdges(state, settlementEdges)`.
- **Rule:** For each **settlement adjacency edge** (A, B) in the settlement graph:
  - Read controller of A and B from `state.political_controllers` (via `getSettlementControlStatus`).
  - If **side(A) ≠ side(B)** and both are non-null, the edge is a **front edge** (hostile contact).
  - **Exception:** RBiH–HRHB edges are **not** front edges before `rbih_hrhb_war_earliest_turn` (26) or while `areRbihHrhbAllied(state)` is true.
- **Output:** A sorted list of front edges with `edge_id`, `a`, `b`, `side_a`, `side_b`. So **frontlines emerge wherever two adjacent settlements are held by different (hostile) factions.**

### 4.2 When front edges are updated

- **Source:** `src/sim/turn_pipeline.ts`, `refreshFrontEdgeSnapshot(state, input)`.
- **When:** Called **at the end of every Phase II turn** (after all steps, including attack resolution and consolidation flips). So the snapshot reflects **control at end of turn**.
- **Steps inside refreshFrontEdgeSnapshot:**
  1. `computeFrontEdges(state, edges)` → list of front edges.
  2. `state.front_edges = derivedFrontEdges`.
  3. `deriveAssignableFrontSegments(derivedFrontEdges)` → contiguous components (see below).
  4. `state.assignable_front_segments = assignFrontSegmentTheatres(state, segments)`.
  5. If Phase II, `ensureBrigadeFrontAssignments(state)`.

So **frontlines “emerge” every turn from current control:** no separate “front state”; they are a view of control + graph.

### 4.3 From front edges to assignable front segments

- **Source:** `src/state/assignable_front_segments.ts`, `deriveAssignableFrontSegments(frontEdges)`.
- **Process:**
  - Group front edges by **side-pair** (e.g. RBiH–RS, RS–HRHB).
  - Build an **edge-adjacency** graph (two edges are adjacent if they share a settlement).
  - For each side-pair, run **BFS** over edges to find **contiguous components**. Each component is one **assignable front segment** with a deterministic `front_id` and list of `edge_ids`.
- **Result:** `assignable_front_segments` = list of segments, each a contiguous stretch of hostile boundary between one pair of factions. These are the HoI-style “fronts” used for brigade assignment and UI.

### 4.4 Corps front edges (headless)

- In desktop, the player can stage `corps_front_edges` via IPC. In **headless** runs, `corps_front_edges` are not staged; the pipeline step **ensure-derived-corps-front-edges** runs and **derives** them from brigade AoR (which settlements each corps’ brigades cover, then which edges sit between those and enemy control). So in this 52w run, corps front edges are **derived**, not player-set, and `run_summary.front_corps_tracking.corps_front_edges_present` is true.

### 4.5 What this run shows

- **activity_summary:** `front_active_set_size` and `pressure_eligible_size` are high (mean ~3780–3784 edges) and nonzero all 52 weeks. So the **number of settlement pairs on the front** is large and stable; the “frontline” is a large, connected (and sometimes multi-component) set of edges that shifts as control changes.
- **Weekly progression (weekly_report.jsonl):** Control counts shift (e.g. RBiH 2297→2256, RS 2507→2552); front_active_set_size drifts from 3953 (week 1) down to 3697 (week 52) as the front contracts slightly with RS gains. So frontlines **evolve with control**: more RS control implies fewer RBiH–RS edges in some regions and a slightly smaller front-active set.
- **Determinism:** Same scenario and seed produce the same `final_state_hash` and thus the same final front_edges and assignable_front_segments.

---

## 5. Run artifacts and references

- **Run directory:** `runs/apr1992_definitive_52w__102fea508092873d__w52_n46/`
- **Key files:** run_summary.json, end_report.md, final_save.json, control_delta.json, activity_summary.json, weekly_report.jsonl, control_events.jsonl, formation_delta.json
- **Latest run copy:** `data/derived/latest_run_final_save.json` (when run used --map)

**Code references:**

- Bot brigade orders and municipality expansion: `src/sim/phase_ii/bot_brigade_ai.ts` (`generateAllBotOrders`), `src/sim/phase_ii/brigade_aor.ts` (`applyBrigadeMunicipalityOrders`).
- Front edges and segments: `src/map/front_edges.ts` (`computeFrontEdges`), `src/state/assignable_front_segments.ts` (`deriveAssignableFrontSegments`), `src/sim/turn_pipeline.ts` (`refreshFrontEdgeSnapshot`), `src/sim/phase_ii/front_emergence.ts` (Phase II front descriptors).
- Pipeline order: `src/sim/turn_pipeline.ts` (Phase II steps: generate-bot-brigade-orders, apply-municipality-orders, ensure-derived-corps-front-edges, phase-e-aor-derivation, etc.).

**Related reports:** ORCHESTRATOR_52W_APR1992_DETAILED_RUN_2026_02_21.md (canon-scenario recommendation; short run report archived to docs/_old/40_reports/convenes/); PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_19_n11.md (prior 52w); ORCHESTRATOR_16W_APR1992_RUN_2026_02_21.md (16w run).
