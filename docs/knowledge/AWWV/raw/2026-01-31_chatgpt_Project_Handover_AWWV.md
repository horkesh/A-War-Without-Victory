---
title: Project Handover AWWV
date: 2026-01-31
source: chatgpt
confidence: high
primary_topics: [phases, map_and_geography, systems, engine_and_determinism, design, decision]
---

**User**

A WAR WITHOUT VICTORY (AWWV)
PROJECT CONTINUATION HANDOVER — AUTHORITATIVE
(POST–G3.5, DURING PHASE H0–H5 EXECUTION)

This prompt re-establishes full project context so work can continue seamlessly.
Treat this as authoritative. Do not reopen settled decisions unless explicitly instructed.

════════════════════════════════════
CURRENT EXECUTION STATE (LOCKED)
════════════════════════════════════

• Cursor is CURRENTLY running: Phase H0–H5 (architecture hardening + viewer unification)
• DO NOT re-run, redesign, or duplicate Phase H0–H5 tasks here
• This chat exists to:
  - interpret results after Cursor finishes
  - diagnose residual issues
  - plan the NEXT phase(s) with precision
  - prepare follow-on Cursor prompts

════════════════════════════════════
CANONICAL FACTS (DO NOT CHANGE)
════════════════════════════════════

1) Geometry & substrate
• Canonical settlement geometry is SVG-derived
• NW SVG coordinate ambiguity (Bihać, Cazin, Velika Kladuša, Bužim) is RESOLVED
  - Resolution is anchored to legacy master-derived substrate
  - No heuristic offsets remain
• data/derived/settlements_substrate.geojson is canonical
• Geometry is correct in:
  - substrate_viewer
  - contact_graph_viewer
  - political_control viewer

2) Graphs
• Phase 1 contact graph ≠ v3 shared-border graph
• CASE C mismatch is real, documented, and CANONICAL:
  - v3 degree == 0
  - Phase 1 degree > 0
• This is NOT a bug
• This is documented via:
  - Phase G3.3 diagnostic
  - Phase G3.5 quantification
  - FORAWWV addendum (“Substrate-to-graph continuity mismatch (CASE C)”)
• No silent fixes or heuristics are allowed

3) Viewers
• All viewers are now contract-first:
  - substrate_viewer
  - adjacency_viewer
  - contact_graph_viewer
  - political_control viewer
• data_index.json is the single authoritative entry point
• awwv_meta is present on GeoJSON roots
• SHA-256 checksums are enforced
• Determinism checks pass

4) IDs
• Settlement IDs are canonical as S-prefixed (e.g. S104566)
• Municipality IDs are mun1990 IDs
• Bužim is merged into Cazin (mun1990_id 10227) — geometry preserved, ID remapped
• No further ID changes without explicit migration phase

════════════════════════════════════
ARCHITECTURE STATUS
════════════════════════════════════

✔ Phase G0–G1: Contract-first data_index + awwv_meta — DONE
✔ Phase G2: NW provenance overlay — DONE
✔ Phase G3.1–G3.3: Viewer correctness, SID normalization, diagnostics — DONE
✔ Phase G3.5: CASE C quantified + FORAWWV addendum — DONE
▶ Phase H0–H5: Architecture consolidation & unified viewer — RUNNING (Cursor)

This chat must ASSUME Phase H0–H5 will complete successfully unless Cursor reports failure.

════════════════════════════════════
IMPORTANT FUTURE CONSTRAINT (LOCK IT IN)
════════════════════════════════════

Population displacement WILL be modeled at:
• settlement level
• municipality level

This implies:
• Geometry must remain immutable across turns
• Population attributes must be separable, turn-indexed overlays
• No viewer logic may assume static population
• Future layers must support delta-based updates

DO NOT implement displacement yet.
DO ensure all architecture decisions remain compatible with this.

════════════════════════════════════
WHAT THIS CHAT IS FOR (ONCE CURSOR FINISHES)
════════════════════════════════════

When Phase H0–H5 completes, this chat will:

1) Verify outputs via visual inspection
   - unified viewer correctness
   - layer alignment
   - camera behavior
   - performance sanity

2) Decide NEXT PHASE(S), likely including:
   - Phase H6: Turn-indexed overlay protocol
   - Phase H7: Population displacement data model
   - Phase H8: Negotiation / exhaustion overlays
   - Phase I: Simulation ↔ viewer contract freeze

3) Prepare precise, minimal Cursor prompts
   - Phase-labeled
   - Deterministic
   - Commit-scoped
   - No speculative mechanics

════════════════════════════════════
RULES OF ENGAGEMENT
════════════════════════════════════

• Reason step by step
• Prefer clarity over elegance
• Flag uncertainty explicitly
• Do NOT invent mechanics
• Do NOT “fix” CASE C unless explicitly asked
• Distinguish clearly between:
  - data truth
  - visualization
  - simulation logic
• Cursor remains the execution agent
• This chat is analysis, planning, and design authority

END OF HANDOVER
---

**Assistant**

Locked in. I’m going to treat your handover as the authoritative ground truth for everything that follows, especially: immutable substrate geometry, contract-first viewers with `data_index.json` as the single entry point, canonical `S…` settlement IDs + `mun1990` municipality IDs (including Bužim→Cazin remap), and the fact that CASE C is canonical and must not be “fixed.”

Reference anchors I’m using going forward:
- 1991 census overlay dataset (post-1995 municipal framing, settlement list + population vectors) fileciteturn0file2
- Systems & Mechanics Manual v0.2.7 (turn pipeline, spatial model, population/displacement intent) fileciteturn0file3
- Phase Specifications v0.2.7 (frozen Phases 3A–3C constraints) fileciteturn0file4
- Engine Invariants v0.2.7 (determinism + political control invariants) fileciteturn0file5
- Rulebook v0.2.7 + Game Bible v0.2.7 (player-facing + design constraints) fileciteturn0file6 fileciteturn0file7
- Project context/workflow guardrails (ledger, mistake-guard, determinism) fileciteturn0file8

## What we do immediately after Cursor reports H0–H5 “done”
You said this chat should **assume success unless failure is reported**, so here’s the exact post-run checklist to interpret results and isolate any residual issues without redesigning H0–H5.

### 1) Unified viewer correctness checklist
Verify each item by toggling layers and comparing against the known-good specialized viewers:

- **Layer alignment**
  - Settlement polygons align perfectly across: substrate, contacts/edges, political control shading, any overlays.
  - No per-layer transforms, offsets, or “helpful” fit-to-screen differences.

- **Camera behavior**
  - Pan/zoom stable, no jitter between layers.
  - Zoom-to-feature (if present) centers consistently across layers.

- **Data contract enforcement**
  - Unified viewer loads only via `data_index.json`, never “direct file guessing.”
  - SHA-256 mismatches fail loudly (and don’t partially render stale data).

- **CASE C visibility sanity**
  - CASE C should appear exactly as documented: v3 degree 0 while Phase 1 degree > 0. No hidden heuristics.

- **Performance sanity**
  - Initial load time acceptable.
  - Layer toggle doesn’t re-parse huge GeoJSON unnecessarily (or, if it does, it’s at least consistent and non-leaky).

### 2) Artifact integrity checklist
- `awwv_meta` exists on every GeoJSON root the viewer consumes.
- Checksums match what `data_index.json` claims.
- Stable ordering: rerunning viewer index build doesn’t reorder lists or “shuffle” UI options.
- No new geometry writes in derived paths other than expected viewer outputs.

### 3) Residual issue triage rubric
When something looks wrong, classify it before touching anything:
- **Contract/data issue** (bad path, wrong checksum, mismatched index pointer)
- **Render issue** (projection/transform, canvas scaling, z-order, style opacity)
- **Performance issue** (blocking parse, repeated fetch, unnecessary recompute)
- **User interaction issue** (layer controls, selection, hover, tooltip correctness)

That classification matters because the next phases (H6+) should mostly be *protocol + overlay* work, not geometry or graph redefinition.

---

## Next phases, scoped and compatible with displacement as turn-indexed overlays
You listed likely next phases; here’s the tightest interpretation that stays inside your constraints and doesn’t invent mechanics.

### Phase H6 — Turn-indexed overlay protocol
Goal: define *how* time-varying attributes are represented and consumed, without implementing displacement yet.

Minimum deliverables:
- A **versioned overlay manifest contract** (per turn or per snapshot) that can attach:
  - settlement-level fields
  - municipality-level fields
- Overlay merges must be:
  - deterministic
  - non-destructive (base geometry immutable)
  - separable per layer (viewer cannot assume population static)
- Viewer must support:
  - selecting a turn index
  - loading overlays as deltas (not full base duplication)

Key “don’ts”:
- No new sim logic.
- No assumptions that overlays are complete (must handle sparse deltas).

### Phase H7 — Population displacement data model
Still “no displacement mechanics,” but define data structures so later systems can write into them.

Minimum deliverables:
- State schema additions (or overlay schema) for:
  - settlement population current (or delta)
  - municipality aggregate population current (or delta)
  - displaced_out, displaced_in, refugees/IDPs (names can be refined later, but structure should allow both directions)
- Aggregation rules:
  - municipality totals derived deterministically from settlement overlays (or explicitly declared as authoritative—pick one and lock it)

Important caution using the census dataset:
- Your current census file is **post-1995 municipality keyed** and includes settlement lists and population vectors per municipality. That’s useful as a *baseline* input, but it can’t be treated as the final authority once everything is reconciled to `mun1990` unless you have a deterministic remap layer. fileciteturn0file2  
So H7 should explicitly separate:
- baseline population source
- mapping layer (post-1995 → mun1990)
- overlay deltas by turn

### Phase H8 — Negotiation / exhaustion overlays
This can remain viewer-only, reading existing sim outputs (or placeholder structured files) without introducing negotiation mechanics.

Minimum deliverables:
- Overlay channels for:
  - exhaustion (by settlement / by municipality / by edge if needed later)
  - negotiation pressure indicators (pure visualization of state variables, not logic)

### Phase I — Simulation ↔ viewer contract freeze
This is where you lock the interface boundary:
- exactly what state is exported
- how checksums/hashes apply
- what the viewer is allowed to interpret vs only display

This should reference (and not violate):
- determinism and “no derived-state serialization” rules in Engine Invariants. fileciteturn0file5
- phase freeze constraints for 3A–3C: overlays must not back-door new effects. fileciteturn0file4

---

## What I need from the H0–H5 completion output to plan the *next* Cursor prompt cleanly
Once Cursor finishes, paste **only** these (no screenshots needed unless something is visually wrong):
1) The final terminal summary (what files changed + what scripts ran + validation results).
2) The unified viewer folder path + the generated `data_index.json` location.
3) Any new NPM scripts added/removed.
4) Any failures/warnings (especially checksum or determinism ones).

Then I’ll produce the next phase prompt(s) in your required Cursor format (phase-style name, ledger action, mistake guard, validations, commit-per-phase discipline, and the FORAWWV note about addendums without auto-edit).
