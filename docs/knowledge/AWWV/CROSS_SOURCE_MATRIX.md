# AWWV Dual-Source Knowledge Base — Cross-Source Matrix

**Purpose:** Reconcile concepts discussed in ChatGPT vs Claude archives. Recovery-oriented; no invention.

**Sources:** `docs/knowledge/ChatGPT/conversations.json`, `docs/knowledge/Claude/conversations.json`  
**Raw ingest:** `docs/knowledge/AWWV/raw/*.md` (per-conversation, chronological)

---

## 1. Concepts in BOTH ChatGPT and Claude

| Concept | Short description | Depth | Resolved/Canonized? |
|--------|-------------------|-------|---------------------|
| **Determinism** | No randomness; stable ordering; reproducible outputs; no timestamps in derived artifacts | Deep (both) | Yes — Engine Invariants v0.3.0 |
| **Exhaustion** | Monotonic, irreversible; increases under brittle/cut supply, static fronts, coercive control | Deep (both) | Yes — Engine Invariants §8 |
| **Settlement-first substrate** | ~6,137 settlements; SVG-derived geometry; canonical IDs (S-prefix); contact/adjacency graphs | Deep (both) | Yes — Phase H/G docs, FORAWWV |
| **Political control** | Per-settlement; distinct from military presence; stable by default; change only via pressure, authority collapse, or negotiation | Deep (both) | Yes — Engine Invariants §9 |
| **Map / mun1990** | 110 municipalities (mun1990); registry; Banovići, Milići→Vlasenica, Sarajevo split; geometry immutable | Deep (both) | Yes — data/source, Phase H5 |
| **Phases (turn pipeline)** | Fixed order: directives → deployments → military_interaction → fragmentation → supply → political_effects → exhaustion → persistence | Medium (both) | Yes — Phase A, turn_pipeline.ts |
| **Supply & corridors** | Corridors Open/Brittle/Cut; supply traces through corridors or local production; recovery slower than degradation | Deep (ChatGPT), Medium (Claude) | Yes — Engine Invariants §4, §6 |
| **Fronts** | Emerge from interaction; not map primitives; sustained opposing control; no single decisive combat | Deep (both) | Yes — Engine Invariants §6 |
| **Formations / brigades** | Commitment, fatigue, posture; AoR; formation roster; militia pools (municipality-based) | Medium (both) | Yes — Systems Manual, game_state |
| **Rulebook / Systems Manual / Engine Invariants** | Design canon hierarchy; code must not contradict docs | Deep (both) | Yes — CANON.md |
| **Militia system** | Municipality-based militia pools; formation generation (CLI, deterministic); quality levels | Medium (both) | Yes — militia implementation, Claude “Militia system game development” |
| **Negotiation / treaties** | Negotiation pressure (monotonic); negotiation capital; treaty offers; territorial/institutional clauses; peace ends war | Deep (ChatGPT), Shallow (Claude) | Partially — treaty system implemented; capital/spend ledger in design |
| **Mistake log & ledger** | PROJECT_LEDGER, ASSISTANT_MISTAKES.log; do not repeat past mistakes | Medium (both) | Yes — context.md |

---

## 2. Concepts primarily or ONLY in ChatGPT

| Concept | Short description | Depth | Resolved/Canonized? |
|--------|-------------------|-------|---------------------|
| **Terrain pipeline (H6.x)** | OSM/DEM snapshots, scalar schema, toolchain guards (Docker, osmium, gdalwarp), H6.2–H6.7-PREP | Deep | Partially — H6.2 data-only; scalars not consumed by sim yet |
| **CASE C (substrate–graph mismatch)** | v3 degree 0 vs Phase 1 degree > 0 for some settlements; documented, not a bug | Medium | Yes — FORAWWV, G3.5 |
| **NW coordinate ambiguity** | Bihać, Cazin, Velika Kladuša, Bužim; resolved via legacy master-derived substrate | Medium | Yes — Project Handover AWWV |
| **Control-flip proposals** | Deterministic, proposal-only; breaches derived/diagnostic | Medium | Yes — implementation |
| **Territorial valuation** | Liabilities cheaper for treaty scoring | Shallow | In design; not fully formalized in canon |
| **Corridor rights (deprecated)** | Territorial annexes; corridor rights deprecated in treaty system | Shallow | Deprecated in design (Bosnia War Simulation Design) |
| **Population displacement (future)** | Settlement- and municipality-level; turn-indexed overlays; geometry immutable; not implemented yet | Medium | Locked as future constraint; DO NOT implement yet |
| **Project handover / continuation prompts** | Authoritative snapshots; do not reopen settled decisions; Phase H0–H5, G0–G3.5 state | Deep | Yes — multiple raw handover docs |
| **Jajce / Doboj stress tests** | Scenario stress tests for specific historical situations | Medium | Referenced in design; scenario runner exists |
| **Rulebook comparison / naming** | Rulebook v1.2/v1.3, naming clarity | Medium | Doc versions in repo |
| **Godot / game coordinate architecture** | Godot map, game coordinates; design discussions | Medium | Some decisions; Godot viewer/export discussed |

---

## 3. Concepts primarily or ONLY in Claude

| Concept | Short description | Depth | Resolved/Canonized? |
|--------|-------------------|-------|---------------------|
| **IVP (International Visibility Pressure)** | Mentioned in Bosnia 1991-1995 audit; peace initiatives, international pressure | Shallow | Not formalized in current canon |
| **JNA garrison locations** | Historical data for early war; municipality-level or settlement-level | Medium | Suggested in “Game creation project”; not in current canon data contract |
| **Municipality adjacencies (historical)** | For “flip cascades,” geographic pressure | Medium | mun1990 adjacency exists (Phase H5); “historical” adjacency as separate layer not canonized |
| **Turn resolution order (operations → supply → displacement → exhaustion → events)** | Claude stated sequence in “Building a game together” | Medium | Partially aligned with Phase A pipeline; “displacement” and “events” not in current phase order |
| **Declaration system (HR H-B, RS, RBiH)** | Faction declarations; hybrid player agency for historical milestones | Medium | Factions in canon; “declaration” as UI/game layer not fully specified in Engine Invariants |
| **Consolidation addendum / Master_Project_Documentation** | Claude audit referenced these; design vs implementation ledger | Medium | Master docs exist; “Consolidation addendum” as separate artifact unclear |
| **TypeScript migration / strict state / invariant validation** | Code review suggestions: types, validateGameStateShape, denylisted keys | Deep | Yes — implemented (serialize, validateState) |
| **Every settlement assigned to exactly one brigade** | Claude code review: requirement from game docs | Medium | Aligns with AoR/formation coverage; not stated verbatim in Engine Invariants |
| **SVG → GeoJSON extraction with census** | Extracting SVGs into layered GeoJSON with census data | Medium | Map pipeline exists; this specific workflow in tools |

---

## 4. Concepts discussed repeatedly but never formalized

| Concept | Where it appears | Note |
|--------|-------------------|------|
| **External patron pressure** | User prompt (PHASE KB-A) lists “external pressure, patrons, sanctions”; design docs mention pressure → exhaustion | Not in Engine Invariants as a distinct system; “pressure” appears (negotiation pressure, coercive control) |
| **Arms embargo asymmetry** | Common in historical discourse about BiH war | Not in current systems or canon |
| **Heavy equipment / maintenance** | Not found verbatim in raw sample; user prompt cites as example of “systems discussed historically but NOT in canon” | Placeholder for gap audit |
| **Legitimacy (vs control vs authority)** | context.md: “authority, control, legitimacy are distinct”; Engine Invariants: control ≠ authority | “Legitimacy” not defined in invariants; control and authority are |
| **Sarajevo exceptions** | Claude audit search mentioned “Sarajevo exceptions” | No formal canon clause found |
| **Enclaves** | Claude audit searched for “enclaves” | Not formalized as a system in current canon |

---

## 5. Source coverage summary

- **ChatGPT:** Strong on terrain pipeline, handover state, CASE C, NW geometry, treaty/negotiation design, displacement as future constraint, stress tests, Rulebook versions.
- **Claude:** Strong on implementation audit, TypeScript/architecture, JNA/adjacency data suggestions, IVP/peace initiatives, declaration system, consolidation docs.
- **Overlap:** Determinism, exhaustion, substrate, political control, mun1990, phases, supply, fronts, formations, militia, Rulebook hierarchy, mistake log.

---

*Generated as part of PHASE KB-A — Dual-Source Knowledge Base Reconstruction & Gap Audit. Treat both sources as fallible; use this matrix to drive gap closure and canon reconciliation.*
