# AWWV Dual-Source Knowledge Base — Gap and Recovery Report

**PHASE KB-A — Primary deliverable.** Identifies systems/topics discussed historically but missing or under-justified in current canon, cross-source omissions, and areas where later design silently dropped earlier constraints. **No mechanics proposed;** recovery and visibility only.

---

## 1. Systems discussed historically but NOT present in current canon

| Gap | Where it appeared | Why it matters systemically |
|-----|-------------------|-----------------------------|
| **External patron pressure** | User prompt (PHASE KB-A): “external pressure, patrons, sanctions”; design discourse “pressure → exhaustion → negotiation.” | Pressure in invariants is military/supply/coercive; no distinct “patron” or “international” pressure system. Asymmetry of outside actors (e.g. arms, sanctions) is central to historical BiH war narrative. |
| **Arms embargo asymmetry** | User prompt (PHASE KB-A) as example; common in historical BiH discourse. | Not modeled; affects force composition and supply constraints differently per side. |
| **Heavy equipment / maintenance** | User prompt (PHASE KB-A) as example of “systems discussed historically but NOT in canon.” | If ever discussed in archives, would affect sustainability and exhaustion; not present in current supply/exhaustion or formation systems. |
| **IVP (International Visibility Pressure)** | Claude: Bosnia 1991-1995 strategy simulation audit; search for “IVP,” “peace initiatives.” | Suggests an international visibility/pressure dimension; never formalized in Engine Invariants or Phase specs. |
| **Legitimacy (as a formal dimension)** | context.md: “authority, control, legitimacy are distinct.” | Engine Invariants define control and authority; “legitimacy” is not a defined invariant or state field. Unclear whether it was dropped or left for later. |
| **Sarajevo exceptions** | Claude audit: search for “Sarajevo exceptions.” | No canon clause found; any special rules for Sarajevo (siege, humanitarian, etc.) are not formalized. |
| **Enclaves** | Claude audit: search for “enclaves.” | Not formalized as a system; enclaves are historically significant; no explicit “enclave” state or mechanics. |

---

## 2. Systems present in canon but under-justified in discussion

| System | Issue | Where it appeared |
|--------|--------|-------------------|
| **Negotiation capital / spend ledger** | Design mentions “EU-style peace score,” capital spent on territory and competences; implementation exists. | ChatGPT Bosnia War Simulation Design; not fully spelled out in Engine Invariants. |
| **Territorial valuation (“liabilities are cheaper”)** | Design rule for treaty scoring. | ChatGPT only; not in Phase specs or invariants. |
| **Structural acceptance constraints (treaties)** | Acceptance “computed, not guaranteed”; structural constraints mentioned. | ChatGPT; depth in implementation vs doc unclear. |
| **Every settlement in exactly one brigade (AoR)** | Claude code review stated as requirement; aligns with formation/AoR. | Not verbatim in Engine Invariants; implied by political control and AoR derivation. |
| **Control strain (reversible) vs exhaustion (irreversible)** | Engine Invariants §8. | Both sources mention exhaustion; “control strain” as reversible counterpart less discussed in raw archives. |

---

## 3. Topics in Claude but missing or thin in ChatGPT (and vice versa)

| Topic | In Claude | In ChatGPT | Note |
|-------|-----------|------------|------|
| **IVP / peace initiatives / international pressure** | Audit searched for IVP, peace initiatives. | Not present as named concept. | Claude-only search; no formalization in either. |
| **JNA garrison locations / historical data** | “Game creation project”: add JNA positions, municipality adjacencies. | Not in handovers or design snapshots. | Claude suggested as critical historical data; ChatGPT focused on mun1990, substrate, terrain. |
| **Declaration system (HR H-B, RS, RBiH)** | “Building a game together”: declaration system, hybrid player agency. | Factions in design; “declaration” as UI/milestone layer not emphasized. | Implementation may exist; canon hierarchy does not spell out “declaration” as invariant. |
| **Consolidation addendum / Master_Project_Documentation** | Audit referenced these for design vs implementation. | Handovers reference FORAWWV, Phase docs; “Consolidation addendum” not cited. | Unclear whether same artifact or different; naming inconsistency. |
| **Terrain pipeline (H6.x), CASE C, NW geometry** | Little or no detail. | Deep: Terrain Pipeline Execution, Project Handover, CASE C, NW resolution. | ChatGPT-only depth on map/terrain and graph mismatch. |
| **Treaty system (capital, territorial valuation, corridor rights deprecated)** | Little detail. | Deep in Bosnia War Simulation Design. | ChatGPT-only depth on negotiation/treaty design. |
| **Population displacement (future constraint)** | Not stated as locked constraint. | Explicit: settlement + municipality level; DO NOT implement yet. | ChatGPT-only. |

---

## 4. Areas where later design silently dropped earlier constraints

| Earlier constraint / idea | Current state | Where it appeared |
|----------------------------|---------------|-------------------|
| **Corridor rights in treaties** | Explicitly deprecated (territorial annexes only). | ChatGPT Bosnia War Simulation Design. |
| **“Legitimacy” as distinct from control/authority** | Not in invariants; context.md still says distinct. | Implicit; no later doc that drops it explicitly, but invariants never formalize it. |
| **External/patron pressure as a system** | Never added to invariants; “pressure” in canon is military/supply/coercive. | Design discourse “pressure → exhaustion”; no formal “patron” or “sanctions” system. |
| **JNA / early war garrison data** | Not in current data contract. | Claude suggested; no decision to adopt or reject in canon. |
| **Turn resolution including “displacement” and “events”** | Phase A pipeline has supply_resolution, exhaustion_update; no “displacement” or “events” phase. | Claude “Building a game together”: “operations → supply → displacement → exhaustion → events.” | Either never adopted or renamed/merged; no explicit rejection. |

---

## 5. Candidate areas requiring clarification, formalization, or explicit rejection

| Area | Action suggested | Rationale |
|------|-------------------|-----------|
| **External patron pressure / IVP / sanctions** | Clarify: adopt as a system, or explicitly reject. | Historically salient; currently absent; design language (“pressure”) ambiguous. |
| **Legitimacy** | Formalize in invariants (and state) or state “not in scope.” | context.md says distinct from control/authority; invariants silent. |
| **JNA garrison / historical adjacency as canonical data** | Decide: include in data contract or document as out-of-scope. | Claude suggested; no canon decision. |
| **Territorial valuation and structural acceptance** | Formalize in Phase specs or Systems Manual, or mark tunable/implementation-only. | Design depth in ChatGPT; not in invariants. |
| **“Displacement” and “events” in turn order** | Align Phase docs with Phase A pipeline; document displacement as future phase or remove from narrative. | Claude sequence differs from current pipeline; displacement is future constraint in ChatGPT. |
| **Enclaves / Sarajevo exceptions** | Decide: in scope (formalize) or out of scope (explicit reject). | Searched in Claude; not in canon. |
| **Arms embargo asymmetry** | Decide: in scope (design a system or note as out-of-scope) or out of scope. | User prompt; historically relevant. |

---

## 6. Citation index (raw files used)

- **ChatGPT raw:** `2026-02-01_chatgpt_AWWV_Terrain_Pipeline_Execution.md`, `2026-02-01_chatgpt_GEO_LAYER.md`, `2026-01-31_chatgpt_Project_Handover_AWWV.md`, `2026-01-31_chatgpt_Phase_F5_Dev_Fix.md`, `2026-01-31_chatgpt_Isolated_Settlement_Debugging.md`, `2026-01-31_chatgpt_Game_Coordinate_Architecture_Design.md`, `2026-01-22_chatgpt_Bosnia_War_Simulation_Design.md`, `2026-01-23_chatgpt_War_Simulation_Handover.md`, `2026-01-23_chatgpt_Map_Regeneration_Normalization.md`, `2026-01-20_chatgpt_Wargame_Brigade_Movement_Ideas.md`, `2026-01-20_chatgpt_Missing_Settlements_Integration.md`, `2026-01-19_chatgpt_Godot_Game_Architecture.md`, `2026-01-16_chatgpt_Recruitment_and_Manpower_1991-1995.md`, `2026-01-16_chatgpt_Doboj_1994_Stress_Test.md`, `2026-01-16_chatgpt_Godot_Map_Creation_Guide.md`, `2026-01-15_chatgpt_Jajce_Fall_Stress_Test.md`, `2026-01-15_chatgpt_Rulebook_Comparison_Analysis.md`, `2026-01-15_chatgpt_Rulebook_Naming_Clarification.md`, others in `docs/knowledge/AWWV/raw/` with `_chatgpt_`. |
- **Claude raw:** `2026-01-25_claude_Code_review_and_improvement_suggestions_*.md`, `2026-02-02_claude_Proposal_feedback_request_*.md`, `2026-01-19_claude_Bosnia_1991-1995_strategy_simulation_audit_*.md`, `2026-01-17_claude_Game_creation_project_*.md`, `2026-01-17_claude_Building_a_game_together_*.md`, `2026-01-19_claude_Militia_system_game_development_*.md`, `2026-01-19_claude_Settlement_layer_implementation_for_strategy_game_*.md`, `2026-01-24_claude_Validating_BiH_municipality_data_sources_*.md`, `2026-01-26_claude_Extracting_SVGs_*.md`, `2026-01-26_claude_GeoJSON_settlements_map_viewer_*.md`, others in `docs/knowledge/AWWV/raw/` with `_claude_`. |

---

*End of Gap and Recovery Report. Use for deliberate, disciplined gap-closure phase; do not invent mechanics.*
