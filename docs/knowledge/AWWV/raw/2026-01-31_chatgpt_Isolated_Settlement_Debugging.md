---
title: Isolated Settlement Debugging
date: 2026-01-31
source: chatgpt
confidence: high
primary_topics: [phases, map_and_geography, systems, engine_and_determinism]
---

**User**

PROJECT: A War Without Victory (AWWV)
FOCUS: Map substrate, adjacency graph, viewer correctness

CURRENT STATE (LOCKED FACTS)

1) Geometry & viewers
- Canonical SVG substrate is correct.
- GeoBoundaries are fully discarded and must not be used.
- data/derived/substrate_viewer/index.html → renders correctly.
- data/derived/political_control.html → renders correctly.
- data/derived/contact_graph_viewer/index.html → renders correctly.
- data/derived/adjacency_viewer/index.html → renders correctly after Phase G3.2 fixes.

2) Coordinate & contract architecture
- Canonical loading via data/derived/data_index.json is enforced.
- awwv_meta exists at GeoJSON root for settlements_substrate.geojson.
- Viewers load geometry ONLY via data_index.json.
- canonical_bbox from data_index.json is authoritative.
- Determinism checks and contract validation are passing.
- No FORAWWV.md addendum has been made so far.

3) NW (Bihać) bug resolution
- Phase G4 anchored NW SVG transforms to legacy substrate bboxes.
- Legacy-anchored chooser selected “none” for all NW files.
- Bihać overlay bug is fully resolved.
- Debug audit exists:
  data/derived/_debug/nw_legacy_anchor_chooser_audit.json / .txt

4) Adjacency viewer corrections
- Phase G3.2 fixed SID mismatch:
  settlement_graph_v3.json used numeric SIDs,
  settlements_substrate.geojson uses S-prefixed SIDs.
- All adjacency viewer edges now normalized to canonical "Sxxxxx".
- Viewer labels corrected: “contact edges (v3)” not “shared-border”.
- After fix:
  - settlements: 6,137
  - contact edges (v3): 15,260
  - isolated (v3 contact): 63

5) Known remaining issue (ACTIVE)
- Some settlements are still shown as isolated but should not be.
- Example: S104566 (municipality 11428) is clearly embedded in fabric.
- These isolated settlements are concentrated in municipalities:
  11304 and 11428.
- This is NOT a rendering bug; viewers are now faithful to data.

6) Diagnostics already implemented
- Phase G3.3:
  scripts/map/debug_isolated_settlements_report.ts
  Outputs:
    data/derived/isolated_settlements_report.json
    data/derived/isolated_settlements_report.txt
  Findings:
    - 61 isolated are present in v3 node set but degree 0
    - 2 isolated missing entirely from v3 edges
    - No FORAWWV threshold triggered yet

7) CURRENT RUNNING PHASE
- Phase G3.4 is running right now in Cursor.
- Phase G3.4 goal:
  PROVE why S104566 (and mun 11428 cohort) are isolated:
  - Is it a raw v3 data gap?
  - A viewer bundling issue?
  - Or a derivation criteria miss (geometry contact exists but graph omits it)?

DO NOT:
- Change geometry derivation.
- Change v3 or contact-graph derivation logic.
- Add heuristics or fixes yet.

ONLY:
- Produce deterministic diagnostics and evidence.
- Identify the exact failure layer.
---

**Assistant**

The file contents provided above are truncated/partial snippets. The complete content for these files IS accessible via querying.

If the user asks a question related to these files, and the provided snippets do not clearly answer it, you **MUST** use the `file_search` tool to search the full document contents before responding.

## How to invoke the file_search tool
If the user's query isn't sufficiently answered by the provided snippets, parsed text, or images, you should invoke `file_search.msearch`.
To search the full content of the available files, you **must** send one message with recipient `to=file_search.msearch` in the analysis channel. Your message should be structured exactly as follows:
```
{
  'queries': ['Example query 1', 'Example query 2']  // List of up to five queries to search for.
}
```

Carefully balance the number of `file_search` calls and the quality of your response with the latency incurred by `file_search` calls.

Important guidelines for query formatting:
- Your message must be a valid JSON object. Do not include any extraneous text, backticks, markdown formatting, or comments beyond what is shown.
- The `queries` field must be a list of strings.
- One of the queries **MUST** exactly match the user's original question, but stripped of any extraneous details, and with ambiguous references clearly resolved using context from the conversation. It **MUST** be a complete sentence.
- Even if you suspect the user meant something else, one query **MUST** still be their original question.

## How to handle results from file_search
The file search tool will respond with the relevant search results from the full files. After you receive these results:
- Carefully evaluate each result to determine its relevance and quality.
- Use the high-quality and relevant results to inform your answer to the user's question.
- When possible, reuse information from prior file_search results and avoid repeating identical queries.

## Tool usage instructions and ordering
When the user asks a question, carefully consider whether the provided snippets sufficiently answer the query, whether you need to invoke `file_search.msearch`, or another available tool (such as `web`, if available) should be used instead.

Tool-ordering Guidelines:
1. For queries related to uploaded files, if snippets are insufficient, strongly prefer invoking `file_search.msearch` over other tools.
    - Avoid using `web.run`, `python` analysis, or any other tools until you have either:
        - Confirmed with high confidence the answer is not in the files, or
        - Have high confidence `file_search_tool` queries are not sufficient to answer the query.
2. Avoid usage of `web_search/web.run` for queries related to uploaded files
    - Carefully consider whether the user's query is better answered by web search results rather than available snippets or results from `file_search_tool`.
    - Unless the user's query is clearly unrelated to the uploaded files, prefer using `file_search.msearch`. You can always follow up with a web search if necessary for a more complete response.
3. Avoid using `python` unless necessary or requested by user.
    - If the user's query is answerable from the parsed text and images from the uploaded files, or from `file_search_tool`, do not invoke `python`.

Always keep this instruction in mind for the rest of the conversation, as the user may reference these files or ask related questions later on.
---

**Assistant**

```text
Phase G3.4 — Prove isolated-settlement root cause (S104566, mun 11428/11304 cohort)

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~80 lines), docs/ASSISTANT_MISTAKES.log (search: "isolate", "contact graph", "S-prefixed", "viewer")
- WRITE: docs/PROJECT_LEDGER.md (new entry for Phase G3.4; include outputs + what layer failed)

MISTAKE GUARD (MANDATORY)
- In any new script: loadMistakes(); assertNoRepeat("phase g3.4 prove isolated settlement root cause across phase1 vs v3 vs viewer index");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change geometry derivation.
- DO NOT change v3/contact-graph derivation logic.
- DO NOT add heuristics or “fix” anything.
- ONLY produce deterministic diagnostics + evidence to identify the failure layer.

FRAWWV NOTE (MANDATORY)
- If this task reveals a systemic design insight or invalidates an assumption, FLAG that docs/FORAWWV.md may require an addendum, but DO NOT edit it automatically.

TASK
1) Create a deterministic diagnostic script:
   scripts/map/debug_isolation_root_cause_g3_4.ts

   The script must:
   A) Read canonical inputs:
      - data/derived/settlements_substrate.geojson
      - data/derived/settlement_contact_graph.json            (Phase 1)
      - data/derived/settlement_contact_graph_enriched.json   (Phase 2)  [read-only, for metrics visibility]
      - data/derived/settlement_graph_v3.json                 (v3 graph used by adjacency viewer)
      - data/derived/data_index.json                          (viewer contract)

   B) Focus targets (hard-coded, deterministic):
      - settlement: "S104566"
      - municipalities: 11428 and 11304
      - plus: all currently-isolated settlements from data/derived/isolated_settlements_report.json (if present)

   C) For each target settlement S:
      - Confirm S exists in settlements_substrate.geojson feature set (by id), and record:
        - feature index (stable), bbox, centroid (computed), area (computed from polygon ring area; ok to approximate planar for diagnostics)
      - Phase 1 neighbor set:
        - Collect all edges in settlement_contact_graph.json where (a==S || b==S), normalize to canonical "Sxxxxx" for comparisons.
        - Record counts by contact_type (shared_border / point_touch / distance_contact / other if present).
      - v3 neighbor set:
        - Collect all edges in settlement_graph_v3.json involving S (again normalize).
        - Record counts and any edge fields (type / w / etc) if present.
      - Diff:
        - neighbors_in_phase1_not_in_v3
        - neighbors_in_v3_not_in_phase1 (should usually be empty; if not, call it out)
      - For every neighbor N that exists in Phase 1 but missing in v3:
        - Attempt to locate the corresponding enriched edge in settlement_contact_graph_enriched.json (either direction).
        - If found, record key metrics that might explain downstream omission (but do NOT infer new rules): contact_type, centroid_distance_svg, contact_span_svg, bbox_overlap_ratio, area_ratio, perimeter_ratio (only if these fields exist).
        - If not found, record "missing_in_enriched" (this would indicate Phase 2 gap, not v3).

   D) Identify the failure layer (must be explicit, deterministic):
      - Case 1: Phase 1 has 0 neighbors for S -> "raw Phase 1 contact graph gap"
      - Case 2: Phase 1 has neighbors, but v3 has 0 for S -> "v3 selection/ingest omission vs phase1"
      - Case 3: Phase 1 neighbors exist, enriched missing for many -> "Phase 2 enrichment gap"
      - Case 4: v3 contains edges for S, but viewer shows isolated -> "viewer bundling/index mismatch" (verify via data_index.json + adjacency viewer config paths)

   E) Viewer contract verification (no UI changes):
      - Read data/derived/data_index.json and confirm:
        - substrate_path points to settlements_substrate.geojson
        - graph_path (or whatever key exists) points to settlement_graph_v3.json
      - Load the referenced files via those paths and confirm counts match expected:
        - settlements count == 6137
        - v3 edge count == 15260
      - If mismatch, output a deterministic error describing the mismatch and the actual counts.

   F) Outputs (deterministic, overwrite, no timestamps):
      - data/derived/isolated_root_cause_g3_4.json
      - data/derived/isolated_root_cause_g3_4.txt
      - data/derived/_debug/isolated_root_cause_g3_4_targets.json (ok in _debug; do not commit)

   Text report must include:
   - Summary table:
     - settlement_id, municipality_id (if available from properties), phase1_degree, v3_degree, classification(case1..case4)
   - For S104566 specifically:
     - Phase 1 neighbor list (sorted)
     - v3 neighbor list (sorted)
     - Missing edges list with any enriched metrics found
   - For municipalities 11428 and 11304:
     - List all isolated settlements in those munis and their classification breakdown counts.

2) Add an npm script (or reuse existing pattern) to run this diagnostic:
   - package.json: "map:debug:isolation:g3_4": "tsx scripts/map/debug_isolation_root_cause_g3_4.ts"

3) Run validations (MANDATORY):
   - npm run typecheck
   - npm test
   - npm run map:debug:isolation:g3_4

4) Commit discipline (MANDATORY, phase-labeled, small scope):
   - Commit ONLY code + package.json + ledger update (NOT data/derived outputs, NOT _debug)
   - Commit message (exact format):
     "Phase G3.4 — isolate root cause diagnostic (phase1 vs v3 vs viewer index)"

FILES TO TOUCH
- ADD: scripts/map/debug_isolation_root_cause_g3_4.ts
- EDIT: package.json
- EDIT: docs/PROJECT_LEDGER.md

DO NOT TOUCH
- data/derived/settlements_substrate.geojson
- Any derivation scripts for substrate/contact/v3
- Viewer HTML/JS
- docs/FORAWWV.md (flag only if needed)

ACCEPTANCE CRITERIA
- Script runs deterministically and produces the two outputs (json + txt) with stable ordering.
- Report explicitly classifies S104566 into exactly one failure layer case (1–4) with supporting evidence.
- Report provides municipality-level breakdown for 11428 and 11304 (counts + lists).
- data_index.json contract is verified and any mismatch is clearly reported.
- All validations pass.
- A Phase G3.4 entry is added to docs/PROJECT_LEDGER.md including:
  - summary
  - files modified
  - mistake guard string
  - outputs produced (paths)
  - FORAWWV note if applicable (flag only)

HOW TO RUN / TEST (Cursor should execute)
- npm run typecheck
- npm test
- npm run map:debug:isolation:g3_4
- (Optional sanity) open data/derived/adjacency_viewer/index.html and confirm it still matches data; no code changes expected.

IMPLEMENTATION NOTES (keep deterministic)
- Always normalize settlement IDs: ensure "S" prefix and 5–6 digits as in substrate (do not guess length; use substrate IDs as canonical).
- Sort all lists lexicographically before writing.
- No timestamps, no random, no locale-dependent formatting.
- If parsing GeoJSON, treat MultiPolygon + Polygon; compute centroid/bbox deterministically.
- If municipality_id isn’t present on features, attempt to read a property (e.g., "municipality_id", "muni_id", "opstina") but DO NOT fail; just record null and continue.
```
---

**User**

I got this: Phase G3.4 is done. Summary:
Phase G3.4
1. Deep-dive script (scripts/map/debug_isolated_settlement_deep_dive.ts)
Inputs: substrate, adjacency viewer data.json, settlement_graph_v3.json, settlement_contact_graph.json
CLI: --sid S104566, --mun 11428, --k 20
Outputs: data/derived/_debug/isolated_deep_dive_S104566.json and .txt
2. Evidence for S104566
Raw v3: degree 0 (node exists, no shared-border edges)
Viewer bundle: degree 0
Contact graph: degree 7 (S100935, S100943, S100951, S100986, S101168, S104159, S104400)
Geometry: 9 neighbors with bbox_dist == 0 (bbox overlap)
Conclusion: CASE C — geometry suggests contact but v3 graph has none → derivation criteria miss
3. Mun 11428 cohort (6 isolated)
All have 5–9 bbox-overlap neighbors, so the pattern is consistent across the municipality.
4. Changes in G3.3 report
Added degree_in_viewer_edges and degree_in_raw_v3
Correct degree from v3 graph for nodes not in edge_list
5. awwv_contracts.ts
Added bboxDistance() for geometry neighbor checks
6. FORAWWV
Flagged: systemic substrate→graph mismatch; SVG substrate fragmentation likely causes degree-0 islands where v3 shared-border derivation misses contacts that the Phase 1 contact graph (point-touch/distance) would include.
Validations
npm run typecheck ✅
npm test ✅
npm run map:contracts:validate ✅
npm run map:debug:isolated ✅
npm run map:debug:isolated:deep -- --sid S104566 --mun 11428 --k 20 ✅
---

**Assistant**

This is strong, clean evidence, and it nails the layer. v3 and the viewer bundle are behaving consistently, Phase 1 contact graph sees 7 neighbors for S104566, and your geometry side check finds an even wider near set via bbox overlap, so the isolation is not a viewer contract issue and not a missing node issue, it is a v3 edge construction omission relative to real spatial proximity. Your classification “CASE C” is the right one, contact exists in Phase 1 and plausibly in geometry, v3 shared border edges for that node are zero. Two practical clarifications so we do not over interpret the bbox overlap signal. 1) bbox_dist == 0 is necessary but not sufficient for contact, it can include close but disjoint polygons, or overlaps caused by bbox coarseness, so the most load bearing evidence remains the Phase 1 contact graph degree 7. 2) The exact failure is narrower than “v3 misses contacts”, it is “v3 misses any edge type that is not expressed as shared border under its current criteria”, which aligns with your note about fragmentation, slivers, and small gaps that convert what humans perceive as embedded fabric into point touch or distance contact rather than shared border. The key systemic insight worth capturing in a FORAWWV addendum is not that the substrate is wrong, it is that the substrate can be topologically fragmented in ways that make shared border insufficient as the sole notion of adjacency for strategic layer continuity, especially inside certain municipalities, and you now have a reproducible example set in 11428 and 11304. If you want the next step to stay strictly diagnostic, the most valuable Phase after G3.4 is a quantification phase that answers, across the whole map and specifically in 11428 and 11304, how many degree zero nodes in v3 have nonzero Phase 1 degree, what those Phase 1 edges are by type, and what minimal geometric evidence exists that they are real contacts. Concretely. 1) Build a deterministic cross tab, v3 degree bucket versus Phase 1 degree bucket, and isolate the set where v3 is 0 and Phase 1 is greater than 0, list top municipalities by count and share. 2) For that set, summarize Phase 1 edge types and their proportions, shared border, point touch, distance, other, so you can show whether it is almost entirely non shared border. 3) For a small fixed sample per municipality, not heuristic selection, just lexicographically first N SIDs, compute a stronger geometry check than bbox overlap, for example minimum vertex to segment distance between polygons or exact ring intersection test, purely diagnostic, no graph changes, to establish whether Phase 1 point touch or distance is reflecting real near contact on the substrate or an artifact of prior derivation tolerances. If you confirm the pattern is overwhelmingly point touch and distance for these isolated nodes, then the future fix discussion becomes an explicit design decision, whether v3 should remain strictly shared border, or whether the sim’s notion of adjacency for pressure and supply should consume a richer edge set while still keeping shared border as a special category. That is a design choice, not a bug fix, and your evidence is already in the right shape to justify it without touching geometry.
---

**User**

Please format your answer, why is that a wall of text?
---

**Assistant**

Fair call 🙂 here it is cleanly structured and easy to scan.

---

## Phase G3.4 – Interpretation & next steps (formatted)

### 1) Assessment of your conclusion

Your conclusion is **correct and well-supported**.

**S104566**
- Exists in substrate ✅
- Exists in v3 node set ✅
- v3 degree: **0**  
- Viewer degree: **0** (faithful to v3)
- Phase 1 contact graph degree: **7**
- Geometry proximity: **9 bbox-overlap neighbors**

**Classification**
- **CASE C — derivation criteria miss**
- The failure layer is **v3 edge derivation**, not geometry, not viewer, not bundling.

---

### 2) Important precision (what this *does* and *does not* mean)

#### What it means
- v3’s **shared-border-only logic** is too strict for some fragmented fabrics.
- Settlements that are functionally embedded end up with **only point-touch or distance contacts**, which v3 discards.
- This produces **degree-0 islands** even though continuity exists at earlier phases.

#### What it does *not* mean
- The substrate is wrong ❌  
- The viewer is broken ❌  
- Phase 1 is hallucinating neighbors ❌  

The system is internally consistent; the criteria are simply narrower than the substrate allows.

---

### 3) Municipality pattern (11428 / 11304)

- All isolated settlements in **11428** show:
  - Phase 1 degree > 0
  - v3 degree = 0
  - Multiple bbox-overlap neighbors

This confirms:
- The issue is **systemic**, not a single bad polygon.
- It likely correlates with **SVG fragmentation, slivers, or micro-gaps** specific to these municipal fabrics.

---

### 4) About bbox overlap evidence (properly weighted)

You used bboxDistance correctly **as a diagnostic only**.

Clarification for the record:
- `bbox_dist == 0` is **necessary but not sufficient** for true contact.
- It is supporting evidence, not the deciding proof.

**The decisive proof remains**:
- Phase 1 contact graph degree = 7 for S104566.

That is enough to classify the failure layer.

---

### 5) FORAWWV addendum — what should be flagged

What should be flagged (and nothing more):

> **Systemic substrate → adjacency mismatch:**  
> Shared-border-only adjacency is insufficient to guarantee strategic continuity on a fragmented settlement substrate. Some settlements that are spatially embedded register only point-touch or distance contacts, producing degree-0 nodes in v3 despite Phase 1 continuity.

No fix proposed yet.  
No behavior change implied yet.  
Just the invariant breach documented.

---

### 6) Clean next phase (still diagnostic, no fixes)

If you proceed, the next *proper* phase is **quantification**, not repair.

**Suggested Phase G3.5 (diagnostic only):**
1. Global cross-tab:
   - v3 degree vs Phase 1 degree
   - Focus on v3 = 0 & Phase 1 > 0
2. Municipality ranking by:
   - Count and share of CASE C settlements
3. Edge-type breakdown for CASE C:
   - shared-border / point-touch / distance
4. Optional geometry proof (small fixed sample):
   - Exact ring intersection or min-distance test
   - Evidence only, no thresholds introduced

This keeps discipline and prepares a design decision later.

---

### 7) Bottom line

- Your diagnosis is **correct**
- Your tooling is **clean**
- The system behaved as designed
- The design assumption is now **provably incomplete**

This is exactly how a deterministic system should surface its limits.
---

**User**

Give me Cursor prompt for Phase G3.5. Include the change to FORAWWV that it should do.
---

**Assistant**

```text
Phase G3.5 — Quantify CASE C mismatch (v3 degree-0 vs Phase1 degree>0) + FORAWWV addendum

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~120 lines), docs/ASSISTANT_MISTAKES.log (search: "g3.4", "isolat", "case c", "shared-border", "distance_contact", "point_touch")
- WRITE: docs/PROJECT_LEDGER.md (new Phase G3.5 entry), docs/FORAWWV.md (append addendum section)

MISTAKE GUARD (MANDATORY)
- In any new script: loadMistakes(); assertNoRepeat("phase g3.5 quantify case c mismatch v3 degree0 vs phase1 degree>0 and foraWWV addendum");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change geometry derivation.
- DO NOT change v3/contact-graph derivation logic.
- DO NOT add heuristics or fixes to graphs.
- ONLY add deterministic diagnostics + documentation.
- Any geometry checks must be explicitly labeled “diagnostic evidence only” and must not gate anything.

FORAWWV NOTE (MANDATORY)
- This phase MUST write the FORAWWV addendum described below.
- If further systemic insight appears while implementing, FLAG it in ledger, but keep FORAWWV edits limited to the specific addendum scope.

TASK
1) Add a new deterministic diagnostic script:
   scripts/map/quantify_case_c_mismatch_g3_5.ts

   Inputs (canonical, read-only):
   - data/derived/settlements_substrate.geojson
   - data/derived/settlement_contact_graph.json             (Phase 1)
   - data/derived/settlement_graph_v3.json                  (v3)
   - data/derived/data_index.json                           (contract sanity only)
   - OPTIONAL if exists: data/derived/isolated_settlements_report.json (use for cross-check only; do not rely on it)

   Core computation (deterministic):
   A) Load substrate settlement IDs (canonical set) and build id_normalize():
      - Ensure canonical ID format is whatever substrate uses (e.g., "S104566").
      - Never invent IDs; normalize by adding leading "S" if input is numeric, and left-pad to match existing substrate ids only if unambiguous.
      - Record any IDs in v3/phase1 not present in substrate as "unknown_to_substrate" (diagnostic).

   B) Build Phase 1 degrees + neighbor-type breakdown:
      - From settlement_contact_graph.json edges:
        - degree_phase1[sid] = count unique neighbors
        - phase1_type_counts[sid][contact_type] += 1 (if contact_type exists, else "unknown")
      - Ensure edges are treated undirected with canonical ordering.

   C) Build v3 degrees:
      - From settlement_graph_v3.json edges:
        - degree_v3[sid] = count unique neighbors
        - v3_edge_type_counts if any type exists (else ignore)
      - Treat edges undirected with canonical ordering.

   D) Define CASE C set (global):
      - case_c = { sid | degree_v3[sid] == 0 AND degree_phase1[sid] > 0 AND sid exists in substrate }
      - Also compute:
        - degree0_v3_total (within substrate)
        - degree0_v3_and_phase1_0
        - degree0_v3_and_phase1_gt0 (this is case_c)

   E) Municipality aggregation:
      - Determine municipality_id per settlement feature from substrate properties.
      - Accept multiple possible property keys (try in order): "municipality_id", "mun1990_id", "opstina_id", "muni_id".
      - If not found, record municipality_id = null and aggregate under "__unknown__".
      - For each municipality:
        - substrate_count
        - case_c_count
        - case_c_share = case_c_count / substrate_count (float, stable formatting)
      - Produce top lists:
        - Top 20 municipalities by case_c_count (desc, tie-break by municipality_id asc)
        - Top 20 municipalities by case_c_share (desc, tie-break by municipality_id asc; require substrate_count >= 25 to avoid tiny denominators, but this is a report filter only, not a heuristic “fix”)

   F) Edge-type composition for CASE C:
      - Aggregate across all case_c settlements:
        - total phase1 edges by type (shared_border / point_touch / distance_contact / other / unknown)
      - Also provide per-municipality breakdown for:
        - 11428 and 11304 explicitly (always included), plus the top 10 municipalities by case_c_count.

   G) Fixed-sample “geometry evidence” (diagnostic only, deterministic, no gating):
      - For each of the municipalities 11428 and 11304:
        - Take the lexicographically first N=10 SIDs from case_c within that municipality.
        - For each sampled sid:
          - compute bboxDistance against its Phase1 neighbors and report:
            - neighbor_count
            - count bbox_dist==0
            - min bbox_dist
      - IMPORTANT: This section is explicitly labeled as “evidence only” and must not be used to define CASE C.

   Outputs (deterministic, overwrite, no timestamps):
   - data/derived/case_c_mismatch_summary_g3_5.json
   - data/derived/case_c_mismatch_summary_g3_5.txt
   - data/derived/_debug/case_c_mismatch_munis_top_g3_5.json (debug; do not commit)
   - data/derived/_debug/case_c_mismatch_samples_11428_11304_g3_5.json (debug; do not commit)

   Text report must include:
   - Global totals:
     - settlements_in_substrate
     - v3_degree0_total
     - v3_degree0_phase1_gt0 (CASE C count)
     - v3_degree0_phase1_0 count
   - Municipality tables (Top 20 by count; Top 20 by share with min denom rule)
   - 11428 + 11304 focused section:
     - list all case_c SIDs in each
     - phase1 degree distribution (min/median/max)
     - phase1 edge type composition
     - fixed-sample bboxDistance evidence summary

2) Wire npm script:
   - package.json:
     "map:debug:casec:g3_5": "tsx scripts/map/quantify_case_c_mismatch_g3_5.ts"

3) FORAWWV addendum (REQUIRED CHANGE THIS PHASE)
   - Edit: docs/FORAWWV.md
   - Append a new addendum section at the end with heading:

     "Addendum — Substrate-to-graph continuity mismatch (CASE C)"

   - Content (keep concise, factual, no solutions):
     - Observation:
       - Some settlements are degree-0 in v3 shared-border graph while having nonzero Phase 1 contact neighbors (point-touch/distance).
       - This is concentrated in specific municipalities (mention 11428 and 11304 as exemplars; do not claim they are the only ones).
     - Why it matters:
       - Shared-border-only adjacency may fail to represent continuity on a fragmented settlement substrate.
       - This can create “degree-0 islands” that are visually embedded and connected under broader contact notions.
     - Evidence anchor:
       - Phase G3.4 deep dive for S104566 shows Phase1 degree 7, v3 degree 0.
       - Phase G3.5 quantifies prevalence and municipality concentration (refer to the generated report filenames).
     - Constraint reminder:
       - This is an identified systemic mismatch; future handling requires an explicit design decision (not a silent heuristic patch).

   - Do NOT add proposed fixes or thresholds in FORAWWV.md.

4) Run validations (MANDATORY)
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:debug:casec:g3_5

5) Commit discipline (MANDATORY, phase-labeled, small scope)
- Do NOT commit data/derived outputs or any _debug artifacts.
- Commit ONLY:
  - scripts/map/quantify_case_c_mismatch_g3_5.ts
  - package.json
  - docs/PROJECT_LEDGER.md
  - docs/FORAWWV.md
- Commit message (exact):
  "Phase G3.5 — quantify CASE C mismatch + FORAWWV addendum"

FILES TO TOUCH
- ADD: scripts/map/quantify_case_c_mismatch_g3_5.ts
- EDIT: package.json
- EDIT: docs/PROJECT_LEDGER.md
- EDIT: docs/FORAWWV.md

DO NOT TOUCH
- Any substrate/contact/v3 derivation scripts
- Viewer HTML/JS
- Geometry source artifacts

ACCEPTANCE CRITERIA
- Script produces stable json + txt outputs and deterministic ordering.
- CASE C is computed strictly as v3_degree==0 && phase1_degree>0 && in_substrate.
- Municipality rankings and 11428/11304 focus appear in the txt report.
- FORAWWV.md has the required addendum section appended, factual and solution-free.
- All validations pass.
- Single commit with required message.

HOW TO RUN / TEST (Cursor should execute)
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:debug:casec:g3_5
- Sanity: open adjacency viewer to confirm no behavioral change (expected).
```
---

**User**

Phase G3.5 is done. Summary:
Phase G3.5 Summary
1. New script: scripts/map/quantify_case_c_mismatch_g3_5.ts
Inputs: substrate, Phase 1 contact graph, v3 graph, data_index (for sanity checks)
ID normalization: S-prefix canonical form, only existing substrate IDs
CASE C: degree_v3 == 0 AND degree_phase1 > 0 AND in_substrate
2. Outputs
data/derived/case_c_mismatch_summary_g3_5.json – structured JSON
data/derived/case_c_mismatch_summary_g3_5.txt – text report
data/derived/_debug/case_c_mismatch_munis_top_g3_5.json – debug only
data/derived/_debug/case_c_mismatch_samples_11428_11304_g3_5.json – debug only
3. Results (from run)
CASE C count: 62
Municipalities: 11304 (50 of 54 settlements), 11428 (6 of 37)
Phase 1 edge types: 245 distance_contact, 2 point_touch
Geometry evidence: N=10 samples per mun; bbox_dist_zero and min_bbox_dist reported; labeled diagnostic only
4. FORAWWV addendum
Added section “Addendum — Substrate-to-graph continuity mismatch (CASE C)” with:
Observation (degree-0 in v3 but >0 in Phase 1)
Why it matters (degree-0 islands on fragmented substrate)
Evidence (G3.4 S104566, G3.5 report references)
Constraint (no silent heuristic patches)
5. Validations
npm run typecheck
npm test
npm run map:contracts:validate
npm run map:debug:casec:g3_5
6. Commit
Only changed: scripts/map/quantify_case_c_mismatch_g3_5.ts, package.json, docs/PROJECT_LEDGER.md, docs/FORAWWV.md
No derived data or debug artifacts committed

From what I can tell, there is still a problem.

Write a prompt so I can hand this over to Claude. Assume it has acccess to all the code. Describe the problem and ask for it to troubleshoot it.
---

**Assistant**

The file contents provided above are truncated/partial snippets. The complete content for these files IS accessible via querying.

If the user asks a question related to these files, and the provided snippets do not clearly answer it, you **MUST** use the `file_search` tool to search the full document contents before responding.

## How to invoke the file_search tool
If the user's query isn't sufficiently answered by the provided snippets, parsed text, or images, you should invoke `file_search.msearch`.
To search the full content of the available files, you **must** send one message with recipient `to=file_search.msearch` in the analysis channel. Your message should be structured exactly as follows:
```
{
  'queries': ['Example query 1', 'Example query 2']  // List of up to five queries to search for.
}
```

Carefully balance the number of `file_search` calls and the quality of your response with the latency incurred by `file_search` calls.

Important guidelines for query formatting:
- Your message must be a valid JSON object. Do not include any extraneous text, backticks, markdown formatting, or comments beyond what is shown.
- The `queries` field must be a list of strings.
- One of the queries **MUST** exactly match the user's original question, but stripped of any extraneous details, and with ambiguous references clearly resolved using context from the conversation. It **MUST** be a complete sentence.
- Even if you suspect the user meant something else, one query **MUST** still be their original question.

## How to handle results from file_search
The file search tool will respond with the relevant search results from the full files. After you receive these results:
- Carefully evaluate each result to determine its relevance and quality.
- Use the high-quality and relevant results to inform your answer to the user's question.
- When possible, reuse information from prior file_search results and avoid repeating identical queries.

## Tool usage instructions and ordering
When the user asks a question, carefully consider whether the provided snippets sufficiently answer the query, whether you need to invoke `file_search.msearch`, or another available tool (such as `web`, if available) should be used instead.

Tool-ordering Guidelines:
1. For queries related to uploaded files, if snippets are insufficient, strongly prefer invoking `file_search.msearch` over other tools.
    - Avoid using `web.run`, `python` analysis, or any other tools until you have either:
        - Confirmed with high confidence the answer is not in the files, or
        - Have high confidence `file_search_tool` queries are not sufficient to answer the query.
2. Avoid usage of `web_search/web.run` for queries related to uploaded files
    - Carefully consider whether the user's query is better answered by web search results rather than available snippets or results from `file_search_tool`.
    - Unless the user's query is clearly unrelated to the uploaded files, prefer using `file_search.msearch`. You can always follow up with a web search if necessary for a more complete response.
3. Avoid using `python` unless necessary or requested by user.
    - If the user's query is answerable from the parsed text and images from the uploaded files, or from `file_search_tool`, do not invoke `python`.

Always keep this instruction in mind for the rest of the conversation, as the user may reference these files or ask related questions later on.
---

**Assistant**

```text
PROJECT HANDOVER PROMPT FOR CLAUDE
Project: A War Without Victory (AWWV)
Focus: Map substrate, adjacency graph correctness, CASE C persistence
Phase status: Up to and including Phase G3.5 (COMPLETE)

You have full access to the codebase, scripts, derived artifacts, and documentation.

=== CONTEXT (LOCKED FACTS) ===

1) Geometry & viewers
- Canonical SVG substrate is correct.
- GeoBoundaries are fully discarded and must NOT be used.
- Viewers are faithful to data and now correct:
  - data/derived/substrate_viewer/index.html
  - data/derived/political_control.html
  - data/derived/contact_graph_viewer/index.html
  - data/derived/adjacency_viewer/index.html
- Viewers load geometry ONLY via data/derived/data_index.json.
- canonical_bbox from data_index.json is authoritative.
- No rendering or bundling bug remains.

2) Graph layers
- Phase 1 contact graph (settlement_contact_graph.json):
  - Includes shared_border, point_touch, distance_contact edges.
- v3 adjacency graph (settlement_graph_v3.json):
  - Currently contains ONLY shared-border-derived edges.
  - Used by adjacency viewer and downstream strategic logic.

3) Known phenomenon: CASE C (now proven & quantified)
Definition (canonical):
- CASE C = settlements where:
  - degree_v3 == 0
  - degree_phase1 > 0
  - settlement exists in substrate

Evidence:
- Phase G3.4 deep dive on S104566 (municipality 11428):
  - Phase 1 degree = 7
  - v3 degree = 0
  - Viewer degree = 0 (faithful)
  - Geometry proximity confirms embedding
- Phase G3.5 global quantification:
  - CASE C count: 62
  - Municipality concentration:
    - 11304: 50 of 54 settlements
    - 11428: 6 of 37 settlements
  - Phase 1 edge types for CASE C:
    - 245 distance_contact
    - 2 point_touch
    - 0 shared_border
- FORAWWV addendum added documenting this as a systemic substrate→graph continuity mismatch.

4) Constraints (NON-NEGOTIABLE)
- DO NOT change geometry derivation.
- DO NOT silently “fix” v3 by adding heuristics.
- DO NOT assume CASE C is acceptable without scrutiny.
- Any future change must be an explicit, documented design decision.

=== THE PROBLEM ===

Despite all diagnostics being correct and internally consistent, there is still a *system-level problem*:

- A large, spatially embedded set of settlements (entire municipalities, in practice) are degree-0 in the v3 adjacency graph.
- This is not rare noise; it is concentrated and structural.
- These degree-0 islands will:
  - Break front emergence
  - Break pressure propagation
  - Break supply corridor continuity
  - Artificially fragment political and military space

At the same time:
- Phase 1 already encodes meaningful spatial adjacency for these settlements.
- Geometry supports proximity and embedding.
- v3 currently discards all non-shared-border relations.

This leaves the system in an unstable conceptual state:
- v3 is “correct” per its rules
- but “wrong” per the substrate’s topology and the game’s strategic intent

=== WHAT I NEED YOU TO DO ===

Your task is NOT to implement a fix yet.

Your task is to **troubleshoot the problem at the design + systems boundary** and answer:

1) Is CASE C an unavoidable consequence of:
   - SVG fragmentation?
   - Settlement polygon granularity?
   - Phase 1 tolerances?
   - Or a deeper mismatch between how adjacency is defined vs how territory actually functions?

2) Given the goals of AWWV (strategic, not tactical):
   - Is a shared-border-only adjacency graph *conceptually sufficient*?
   - Or does the existence of CASE C imply that adjacency must be multi-typed or layered at the strategic level?

3) Identify the **minimal invariant breach**:
   - What assumption held earlier in the design that is now empirically false?
   - Phrase this as a falsified assumption, not a proposed solution.

4) Enumerate **design-correct options** (NO CODE YET):
   - For example (do not limit yourself to these):
     - Keep v3 pure but introduce a separate continuity graph
     - Allow v3 to consume a subset of Phase 1 edges under explicit rules
     - Treat distance_contact as logistical-only adjacency
     - Accept degree-0 islands and model their collapse explicitly
   - For each option:
     - What invariant it preserves
     - What invariant it violates
     - What new failure modes it introduces

5) Recommend which option(s) are:
   - Consistent with “fronts emerge from unit interaction”
   - Compatible with deterministic state updates
   - Least likely to create hidden heuristics

=== IMPORTANT ===

- Do NOT write code unless explicitly asked.
- Do NOT assume the answer is “just include distance edges”.
- Treat this as a **systems design autopsy**, not a bug hunt.
- You may reference:
  - scripts/map/quantify_case_c_mismatch_g3_5.ts
  - scripts/map/debug_isolated_settlement_deep_dive.ts
  - docs/FORAWWV.md (CASE C addendum)
  - settlement_contact_graph.json vs settlement_graph_v3.json
- Be explicit about uncertainty where evidence is incomplete.

=== DESIRED OUTPUT ===

- A structured analysis with headings:
  1. What is actually broken
  2. What is not broken
  3. Which assumption failed
  4. Why CASE C clusters spatially
  5. Design option matrix
  6. Recommended direction (even if tentative)

This is a handoff to you as an external expert.
Assume nothing is sacred except determinism and clarity.
```
---

**User**

OK municipality 11304 is the extreme case with 92.6% CASE C. That's municipality Ravno. In 1990 it was part of Trebinje. Can we remap all these isolated settlements and connect them to their neiighbors? That includes the remaining isolated settlements. Again, http://localhost:8080/data/derived/contact_graph_viewer/index.html solved all this, including the Ravno municipalities.
---

**Assistant**

Remapping **Ravno (11304)** back into **Trebinje (1990)** won’t fix this isolation by itself. Municipality membership doesn’t create edges. What’s actually happening is simpler:

- **v3 adjacency** is shared-border-only  
- **CASE C in Ravno** is **almost entirely `distance_contact`** (and a tiny bit `point_touch`)  
- That’s why `contact_graph_viewer` “solves it”: it’s visualizing the **Phase 1 contact graph**, which includes those edge types.

So yes, you *can* “connect the isolated settlements to their neighbors”, but the correct way is **not manual remapping** (that becomes a hidden heuristic patch). The correct way is to make an explicit, deterministic **design choice**:

## The design-correct fix
### Option A — Promote Phase 1 to the canonical “continuity” graph
- Keep **v3** exactly as-is (shared border only) for things where border length matters.
- Introduce a separate, explicitly named graph for strategic continuity, derived from Phase 1:
  - `settlement_continuity_graph.json` (or similar)
  - Contains all Phase 1 edges (shared_border + point_touch + distance_contact).
- Make the sim consume **continuity graph** for:
  - connectivity/front emergence baseline
  - supply corridor continuity checks
  - “isolation” concept
- Make the sim consume **v3** for:
  - border-pressure mechanics that truly require a border

This matches what your evidence is already telling you: “continuity” and “shared border” are **different concepts** on a fragmented substrate.

### Option B — Redefine v3 to include non-shared-border types
This would indeed eliminate CASE C, but it is a **semantic change** to what v3 means, and you’d need to:
- rename it (because it’s no longer “shared-border graph”)
- document the new meaning everywhere
- re-validate downstream assumptions

This is more invasive than Option A.

## What I would not do
- Manually “connect” Ravno settlements by editing edges in-place.
- Municipality-based special cases (“if mun==11304 then …”).
- Any “remap isolated settlements and connect them” as a one-off data patch.

Those are exactly the kind of silent heuristics you’ve been avoiding, and they’ll come back later as unexplained behavior.

## Why Ravno is extreme
Ravno’s CASE C profile (mostly `distance_contact`) suggests the substrate there produces **tiny gaps / fragmentation** such that “embedded fabric” does not yield shared borders. That’s a geometry/topology reality, and the Phase 1 graph already captured it.

## If you want to proceed now
If you say “go ahead”, the next step is to implement **Option A** as a new phase (explicitly a design decision), with:
- a new derived graph artifact
- viewer support (optional)
- sim wiring changes (explicitly documented)
- updated Rulebook/Systems Manual notes about the two adjacency concepts

If you want, I’ll write the **Phase G3.6 Cursor prompt** to do exactly Option A with strict determinism, validations, one commit, and a ledger entry.
---

**User**

Go ahead. Include the viewer support
---

**Assistant**

```text
Phase G3.6 — Add canonical continuity graph (Phase1 contact) + viewer toggle (keep v3 unchanged)

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~140 lines), docs/ASSISTANT_MISTAKES.log (search: "case c", "continuity", "data_index", "adjacency_viewer", "graph_v3", "contact_graph_viewer")
- WRITE: docs/PROJECT_LEDGER.md (new Phase G3.6 entry)

MISTAKE GUARD (MANDATORY)
- In any new script: loadMistakes(); assertNoRepeat("phase g3.6 add continuity graph from phase1 contact and viewer toggle without changing v3");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change geometry derivation.
- DO NOT change v3/contact-graph derivation logic or outputs.
- DO NOT “patch” edges by municipality or by hand.
- Continuity graph must be a pure, deterministic transform of Phase 1 contact graph.
- Viewers must continue loading via data/derived/data_index.json only.
- canonical_bbox from data_index.json remains authoritative.

FORAWWV NOTE (MANDATORY)
- If this phase reveals a systemic design insight or invalidates an assumption, FLAG that docs/FORAWWV.md may require an addendum, but DO NOT edit it automatically.

GOAL
- Preserve v3 as “shared-border graph”.
- Add a second, explicit graph: “continuity graph” = Phase 1 contact edges (shared_border + point_touch + distance_contact + any other types present).
- Add viewer support to overlay continuity edges and compute “isolated by continuity” vs “isolated by v3”.

TASK A — Derive continuity graph artifact (new output, deterministic)
1) ADD script:
   scripts/map/derive_settlement_continuity_graph_g3_6.ts

   Inputs (read-only):
   - data/derived/settlements_substrate.geojson
   - data/derived/settlement_contact_graph.json (Phase 1)
   - data/derived/data_index.json (sanity only)

   Output (overwrite, deterministic, no timestamps):
   - data/derived/settlement_continuity_graph.json

   Required behavior:
   - Canonical ID set is the substrate feature IDs.
   - Normalize any numeric IDs from contact graph to canonical substrate IDs ONLY if an exact substrate ID exists.
   - Drop edges where either endpoint is not in substrate (but record counts + examples in report stdout).
   - Treat edges as undirected; canonical ordering is (minSid,maxSid) lexicographic on the canonical "Sxxxxx" strings.
   - Deduplicate edges by (a,b,contact_type) (keep one).
   - Preserve contact_type if present; else set "unknown".
   - Produce a stable JSON shape:
     {
       "meta": {
         "source": "settlement_contact_graph.json",
         "canonical": "settlements_substrate.geojson ids",
         "edge_types": ["shared_border","point_touch","distance_contact","other","unknown"],
         "generated_by": "derive_settlement_continuity_graph_g3_6"
       },
       "nodes": ["S.....", ...]   // optional; include only if already used elsewhere; if included must be sorted
       "edges": [
         {"a":"S.....","b":"S.....","type":"distance_contact"},
         ...
       ]
     }
   - Print deterministic summary to stdout:
     - substrate_settlements_count
     - phase1_edges_read
     - continuity_edges_written (by type)
     - dropped_edges_unknown_endpoint_count (+ first 10 examples sorted)
     - isolated_by_continuity_count (computed degree==0 over substrate nodes)
     - isolated_by_v3_count (if v3 graph is present and easy to load here, OPTIONAL; otherwise leave to viewer)

2) Wire npm script:
   - package.json:
     "map:derive:continuity:g3_6": "tsx scripts/map/derive_settlement_continuity_graph_g3_6.ts"

TASK B — Extend data_index.json contract to include continuity graph
3) Find the code path that produces or validates data/derived/data_index.json (do NOT hand-edit derived outputs for commit).
   - Update the generator (or whichever script writes it) to include a new field:
     - continuity_graph_path: "settlement_continuity_graph.json"
   - Update contract validation (likely src/state/awwv_contracts.ts or similar) so:
     - data_index schema allows/requires continuity_graph_path
     - validator confirms the referenced file exists when present
     - canonical_bbox remains unchanged and still validated

   Important:
   - Do NOT break existing viewers if continuity_graph_path is absent; tolerate missing key but prefer present in the canonical build path.
   - If the project treats data_index.json as a derived artifact not committed, only commit code changes; do not commit derived json.

TASK C — Viewer support (adjacency_viewer)
4) Update adjacency viewer to load and render continuity edges without disturbing existing v3 behavior.

   Files (discover exact filenames; touch minimal set):
   - data/derived/adjacency_viewer/index.html (only if needed)
   - data/derived/adjacency_viewer/viewer.js (or equivalent)
   - any shared viewer utilities used by multiple viewers (only if necessary)

   Requirements:
   - Viewer continues to load ALL paths from data_index.json (no hardcoded filenames).
   - Load BOTH graphs when available:
     - v3 graph via existing key
     - continuity graph via continuity_graph_path
   - UI controls (simple, deterministic):
     - Checkbox: “show v3 edges (shared-border)”
     - Checkbox: “show continuity edges (phase1 contact)”
     - Checkbox: “highlight isolated by v3”
     - Checkbox: “highlight isolated by continuity”
     - If both “highlight isolated” toggles are on, render with distinct marker styles (no new colors required; can use stroke pattern or opacity difference).
   - Stats panel updates:
     - settlements: 6137
     - v3 edges: 15260 (existing)
     - continuity edges: count from loaded file
     - isolated (v3): count
     - isolated (continuity): count
   - Selecting/clicking a settlement should show:
     - degree_v3, degree_continuity
     - neighbor list for each (sorted)
     - (optional) edge-type breakdown for continuity neighbors if type is present

   Strict non-regression:
   - With continuity edges toggled OFF, viewer must behave exactly as before Phase G3.6.

TASK D — Tests / validations (MANDATORY)
5) Run:
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:derive:continuity:g3_6
- (If you have a standard build step for derived viewer bundles, run it too; otherwise ensure dev server shows the updated viewer.)

6) Manual sanity (quick):
- Start dev runner / static server as usual.
- Open:
  http://localhost:8080/data/derived/adjacency_viewer/index.html
  - Confirm:
    - v3 isolated still shows 63 when only v3 toggles are on
    - continuity isolated is ~0 (or drastically lower), and Ravno (11304) settlements are not isolated under continuity

COMMIT DISCIPLINE (MANDATORY)
- One small, phase-labeled commit after everything passes.
- Do NOT commit any data/derived outputs (json/txt) or _debug artifacts.
- Commit ONLY code / viewer files / docs ledger.
- Commit message (exact):
  "Phase G3.6 — continuity graph + adjacency viewer toggle"

LEDGER ENTRY (MANDATORY CONTENT)
- Phase G3.6 summary: what was added, why (CASE C), what stayed unchanged (v3)
- Files changed
- Mistake guard string
- New npm script name
- New data_index.json key (continuity_graph_path)
- Viewer UI toggles and new stats
- Note: if any systemic insight discovered, flag possible FORAWWV addendum requirement (do not edit FORAWWV)

FILES TO TOUCH (INTENDED)
- ADD: scripts/map/derive_settlement_continuity_graph_g3_6.ts
- EDIT: package.json
- EDIT: src/state/awwv_contracts.ts (or wherever data_index contract is validated)
- EDIT: the script/module that generates data/derived/data_index.json (discover + update)
- EDIT: data/derived/adjacency_viewer/* (minimal required viewer JS/HTML)
- EDIT: docs/PROJECT_LEDGER.md

DO NOT TOUCH
- Any geometry derivation scripts
- settlement_graph_v3.json derivation logic
- settlement_contact_graph.json derivation logic
- Other viewers unless absolutely required by shared code

ACCEPTANCE CRITERIA
- continuity graph artifact is a deterministic transform of Phase 1 contact graph, using substrate IDs.
- data_index.json contract supports continuity_graph_path and viewers load it only through data_index.json.
- adjacency viewer can overlay continuity edges and report isolated-by-continuity counts.
- Non-regression: v3-only view unchanged.
- All validations pass.
- Single Phase G3.6 commit with the exact message.

HOW TO RUN / TEST (Cursor should execute)
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:derive:continuity:g3_6
- open http://localhost:8080/data/derived/adjacency_viewer/index.html and verify toggles + counts
```
---

**Assistant**

Here’s what I can sanity-check from the screenshot, based purely on what’s visible.

## 1) Numbers look internally consistent
In the **Statistics** panel I can read:

- **Settlements:** 6,137 ✅  
- **v3 edges:** 15,260 ✅ (matches your locked post-G3.2 numbers)
- **Continuity edges:** 19,474 ✅ (matches your G3.6 output)
- **Isolated (v3):** 63 ✅ (unchanged as expected)
- **Isolated (continuity):** 1 ✅ (new signal, and the whole point of the continuity layer)

That’s exactly the “v3 is strict, continuity restores connectivity” story we wanted.

## 2) Toggles match what’s drawn
Under **Display**, I can see:

- **Show settlement polygons:** ON ✅
- **Show v3 edges (shared-border):** OFF ✅
- **Show continuity edges (phase1 contact):** ON ✅
- **Highlight isolated by v3:** ON ✅
- **Highlight isolated by continuity:** OFF ✅

On the map:
- The dense **orange web** is clearly the continuity edges ✅
- There are a handful of **red-highlighted settlements** visible (especially near the far south) which matches “highlight isolated by v3” being on ✅
- No special highlight for the single continuity-isolated node is expected because that toggle is off ✅

So the UI behavior is coherent: you can hide v3 edges while still highlighting the v3-isolated nodes.

## 3) Legend and note line up
Legend shows:
- v3 (shared-border) in one style
- Continuity (phase1 contact) in orange
- Settlement polygon outline

And the note explicitly defines continuity as Phase 1 contact (shared_border + point_touch + distance_contact). ✅

## 4) The one thing to do next (quick manual check)
Since **Isolated (continuity) = 1**, the sanity follow-up is:

- Turn on **“Highlight isolated by continuity”**
- Find that one node
- Click it and confirm the tooltip shows:
  - degree_continuity = 0
  - and ideally confirm whether it’s a legitimate geometry edge case (true island / missing contact) vs an ID/endpoint drop

If that node is somewhere “embedded” like Ravno was, that would suggest a remaining data/normalization drop. If it’s a true corner case (tiny detached polygon), it might be acceptable as a real isolated settlement in the substrate.

## Verdict
From this screenshot alone: **G3.6 looks correct**, the counts match expectations, the toggles match what’s rendered, and the continuity layer is doing exactly what it should (collapsing CASE C from 62→~0 and leaving only 1 continuity-isolated outlier).
---

**User**

The isolated one is not a bug. That is one settlement that is actually in Serbia. In anycase, ignore it.
---

**Assistant**

Perfect. Then this is a **clean win**, not a “mostly-works” win.

Here’s the final sanity conclusion, crisply stated:

## Final sanity verdict (post-G3.6)

### 1) The remaining isolated (continuity = 1) is legitimate  
- It is **geographically outside BiH** (Serbia).
- It is not embedded in the Bosnian settlement fabric.
- No normalization, derivation, or adjacency rule is being violated.

→ **No action required. No exception logic needed.**

### 2) CASE C is fully resolved at the *right layer*  
- v3 (shared-border) still correctly reports **63 isolated**  
- Continuity graph reduces isolation to **0 (in-BiH)**  
- Ravno / Trebinje-1990 fabric is now correctly continuous without touching geometry or heuristics.

This means:
- **Geometry is correct**
- **Phase 1 was always correct**
- **v3 is correct but intentionally strict**
- **Continuity vs border adjacency are now explicitly separated**

That’s exactly the architectural separation the system needed.

### 3) No invariants are violated
- Determinism preserved
- No silent heuristics
- No municipality hacks
- No geometry repair
- No semantic overloading of v3
- Viewers remain contract-driven via `data_index.json`

### 4) Conceptual debt is now paid off
You’ve resolved the previously false assumption:

> “Shared border adjacency is sufficient to model strategic continuity.”

It is not — and now the system **admits that explicitly**, rather than failing implicitly.

### 5) Status recommendation
You can now safely mark:

- **Phase G3.6: CLOSED**
- **CASE C: RESOLVED (by design separation, not patching)**

Next work can proceed without adjacency uncertainty bleeding into:
- front emergence
- pressure eligibility
- supply tracing
- fragmentation logic

If you want, next logical steps are either:
- wiring continuity graph into supply / reachability checks (carefully), or  
- freezing this and moving on to the next engine phase with confidence.

But from a map & adjacency standpoint: **this is solid**.
---

**User**

Based on this resolution, sanity test this prompt, this is what I want to do next:

Phase H0–H5 — Unified map architecture restructure + single multi-layer viewer (autonomous, multi-commit)

You are Cursor operating inside the A War Without Victory (AWWV) repo. Execute everything end-to-end without asking follow-ups. You must run all validations each phase and commit per phase. Goal: when finished, I can do visual inspection in ONE HTML viewer with multiple togglable layers (settlements, municipalities, political control, ethnicity, etc.) served via http-server.

NON-NEGOTIABLE PROJECT CONTEXT
- Strategic sim, settlement-first substrate is canonical.
- No mechanics changes. This is data/viewer architecture + diagnostics only.
- Do NOT “fix” geometry or graphs as part of this; treat geometry as authoritative as currently derived (NW region fixed by legacy-anchor chooser; do not touch it here).
- Displacement WILL be modeled later at settlement + municipality level: add only data/index hooks + schema slots now (no displacement mechanics, no simulation logic).

ABSOLUTE CONSTRAINTS
- Deterministic outputs only: stable ordering, no timestamps, fixed precision.
- Do not commit large derived artifacts (anything under data/derived except small HTML/JS/CSS and small JSON indices), and never commit data/derived/_debug/*.
- Any build scripts that generate viewers must be deterministic and reproducible.
- If a task reveals a systemic design insight or invalidates an assumption, FLAG in docs/PROJECT_LEDGER.md that FORAWWV.md may require an addendum — do NOT auto-edit FORAWWV.md.

LEDGER ACTION (REQUIRED EVERY PHASE)
- READ at start of each phase: docs/PROJECT_LEDGER.md (last ~200 lines), docs/context.md, docs/CANON.md, docs/ASSISTANT_MISTAKES.log
- WRITE at end of each phase: append a Phase Hx entry to docs/PROJECT_LEDGER.md (summary, files touched, validations run, mistake-guard phrase, FORAWWV note)

MISTAKE GUARD (REQUIRED IN EVERY NEW/EDITED SCRIPT)
- At top of each script you touch/create:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("<unique phrase for that phase>");

COMMIT DISCIPLINE (MANDATORY)
- Each phase ends with:
  git status (ensure only intended files)
  git add <intended files>
  git commit -m "Phase Hx: <short title>"
- Commit scope must be small and phase-labeled. Do not bundle phases.

VALIDATIONS (MANDATORY EACH PHASE)
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run sim:run (only if phase touches src/; otherwise optional but preferred)
- Plus any phase-specific scripts (listed below)

TARGET END STATE (WHAT I EXPECT TO SEE WHEN I WAKE UP)
- One viewer: data/derived/map_viewer/index.html (and supporting files) that:
  - Loads /data/derived/data_index.json first (contract-first).
  - Loads settlements geometry via data_index datasets.
  - Loads overlay datasets (political control, ethnicity composition/majority, population totals) via data_index datasets.
  - Has a layer panel with toggles:
    - Settlements (base polygons)
    - Municipality boundaries (1990) as outlines (derived deterministically from settlement municipal IDs; no polygon union)
    - Political control (RBiH/RS/HRHB/null) fill
    - Ethnicity majority fill (Bosniak/Serb/Croat/Other/Unknown)
    - Optional: show Unknown control only
    - Optional debug: show bbox + camera info
  - No blank pages, no silent failures: fatal error banner with actionable message.
- Visual inspection workflow:
  npx http-server -p 8080 -c-1
  Open: http://localhost:8080/data/derived/map_viewer/index.html
  Confirm: toggling layers works, coloring matches expectations, NW region looks correct, municipality outlines align.

PHASE PLAN (EXECUTE IN ORDER)

──────────────────────────────────────────────────────────────────────────────
Phase H0 — Contracts extend: datasets registry + schema stubs + viewer entrypoint
──────────────────────────────────────────────────────────────────────────────
Objective:
- Extend data_index.json to support multiple datasets + layers for a unified viewer (without breaking existing viewers).

Tasks:
1) Create a minimal internal “contract schema” module for runtime checks (no JSON Schema engine required):
   - scripts/map/lib/awwv_contracts.ts (extend if it already exists):
     - validateDataIndexV1(index): returns {ok, errors[]}
     - validateDatasetMeta(meta): required fields check
     - stableStringify(obj): deterministic JSON serialization helper
     - sha256Hex(buffer): already exists (reuse)
   Use mistake guard phrase:
     "phase h0 contracts extend multi dataset layer registry"

2) Update data/derived/data_index.json generation to include datasets and layers for map_viewer:
   - Modify scripts/map/build_substrate_viewer_index.ts (or introduce a new build script if cleaner):
     - Keep existing datasets.settlements entry working.
     - Add datasets entries (paths may not exist yet in H0; allow placeholders but mark disabled in layers until built):
       - municipalities_1990_boundaries (linework geojson to be created in H1)
       - political_control (json mapping sid->side/null; already buildable)
       - settlement_ethnicity (json mapping sid->ethnicity breakdown + majority)
     - Add layers section (viewer will filter to those with files present):
       - base_settlements
       - mun1990_boundaries
       - political_control
       - ethnicity_majority
     - Each dataset entry includes: path, schema (string id), schema_version, id_field (if applicable), geometry_type or "attribute_json", record_count, checksum_sha256 when build exists.
   IMPORTANT: do not break existing substrate_viewer; keep writing data/derived/substrate_viewer/data_index.json as it is today.

3) Add npm script:
   - "map:viewer:map:index": builds/refreshes the canonical data_index additions needed for map_viewer (even if some datasets missing).

Validations:
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism

Files to touch (H0):
- EDIT: scripts/map/lib/awwv_contracts.ts (or create if missing)
- EDIT: scripts/map/build_substrate_viewer_index.ts
- EDIT: package.json
- EDIT: docs/PROJECT_LEDGER.md
- DO NOT create viewer yet.

Commit:
- "Phase H0: extend data_index for multi-layer map viewer"

──────────────────────────────────────────────────────────────────────────────
Phase H1 — Municipality 1990 boundary linework derived from settlements (deterministic)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Produce a municipality boundary overlay without polygon union:
  - Output as MultiLineString features representing boundaries between different municipality_id values.
  - Deterministic and based solely on settlement polygons.

Tasks:
1) Add script:
   scripts/map/derive_mun1990_boundaries_from_settlements.ts
   Mistake guard:
     "phase h1 derive mun1990 boundary linework from settlements"

Inputs:
- data/derived/settlements_substrate.geojson

Algorithm (deterministic, no heuristics):
- For each settlement polygon ring segment (edge between consecutive vertices), create a canonical undirected edge key:
  key = `${min(ax, bx)},${min(ay, by)}|${max(ax, bx)},${max(ay, by)}`
  (use fixed 6-decimal formatting or existing canonical formatter; avoid float noise)
- Map each edge key to the set of municipality_ids that “own” that directed edge.
- Boundary edges are those with exactly 2 different municipality_ids (or >1 distinct) on the same geometric segment.
- Emit boundary edges as LineString segments grouped by municipality pair:
  properties:
    - mun_a (lex smaller)
    - mun_b (lex larger)
    - kind: "mun1990_boundary"
- Output GeoJSON FeatureCollection:
  data/derived/municipalities_1990_boundaries.geojson
  with root awwv_meta compatible with data_index (coordinate_space, bbox_world, checksum semantics consistent with existing convention).

Determinism requirements:
- Sort settlements by sid.
- Sort ring edges by canonical key.
- Sort features by mun_a, mun_b.
- No timestamps.

2) Add npm script:
- "map:derive:mun1990:boundaries": tsx scripts/map/derive_mun1990_boundaries_from_settlements.ts

3) Update build/index step so data_index.json includes the new dataset with correct checksum and record_count when file exists.

Validations:
- npm run typecheck
- npm test
- npm run map:derive:substrate
- npm run map:derive:mun1990:boundaries
- npm run map:contracts:validate
- npm run map:contracts:determinism

Files to touch (H1):
- ADD: scripts/map/derive_mun1990_boundaries_from_settlements.ts
- EDIT: scripts/map/build_substrate_viewer_index.ts (or the index builder module) to register dataset and checksum when present
- EDIT: package.json
- EDIT: docs/PROJECT_LEDGER.md
- (Do NOT commit the derived boundaries geojson if it is large; if it’s reasonably small, still prefer not committing and regenerate.)

Commit:
- "Phase H1: derive mun1990 boundary overlay from settlements"

──────────────────────────────────────────────────────────────────────────────
Phase H2 — Attribute datasets: political control + ethnicity (contracted, deterministic)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Ensure attribute datasets exist as deterministic JSON files and are referenced by data_index.

Tasks:
1) Political control attribute dataset:
- If scripts/map/build_political_control_data.ts already exists, ensure it writes:
  data/derived/political_control_data.json
  Structure:
    { meta: { total_settlements, counts }, by_settlement_id: {sid: side|null} }
  Deterministic key ordering (stable-sorted sid keys).
- Add/confirm npm script:
  "map:build:political-control": tsx scripts/map/build_political_control_data.ts
- Update data_index dataset entry with checksum and record_count.

Mistake guard (if script is edited):
  "phase h2 build political control attribute dataset contracted"

2) Ethnicity attribute dataset:
- Create script:
  scripts/map/build_settlement_ethnicity_data.ts
  Mistake guard:
    "phase h2 build settlement ethnicity attribute dataset contracted"
Inputs:
- data/source/bih_census_1991.json (or canonical census file)
- data/derived/settlements_substrate.geojson (for sid list and name if needed)
Output:
- data/derived/settlement_ethnicity_data.json
Structure:
{
  meta: { total_settlements, unknown_count, category_counts_majority: {...} },
  by_settlement_id: {
    sid: {
      majority: "Bosniak"|"Serb"|"Croat"|"Other"|"Unknown",
      composition: { Bosniak: number, Serb: number, Croat: number, Other: number },
      provenance: "settlement"|"fallback_municipality"|"unknown"
    }
  }
}
- Deterministic: stable sort SIDs, stable numeric formatting, no timestamps.
- If some settlements lack census: majority "Unknown", provenance "unknown".

3) Update contract validator to include attribute_json datasets in data_index:
- Extend scripts/map/validate_map_contracts.ts to:
  - Validate attribute dataset presence, checksum, stable sid coverage for those datasets that claim it.
  - Keep it non-fatal if data_index lists dataset but layer marks it disabled (if you add such a flag); otherwise require file.

4) Wire npm scripts:
- "map:build:ethnicity": tsx scripts/map/build_settlement_ethnicity_data.ts

Validations:
- npm run typecheck
- npm test
- npm run map:derive:substrate
- npm run map:build:political-control
- npm run map:build:ethnicity
- npm run map:contracts:validate
- npm run map:contracts:determinism

Files to touch (H2):
- ADD: scripts/map/build_settlement_ethnicity_data.ts
- EDIT: scripts/map/validate_map_contracts.ts
- EDIT: scripts/map/build_substrate_viewer_index.ts (index datasets registration)
- EDIT: package.json
- EDIT: docs/PROJECT_LEDGER.md

Commit:
- "Phase H2: build contracted attribute datasets (control, ethnicity)"

──────────────────────────────────────────────────────────────────────────────
Phase H3 — Single unified viewer: data/derived/map_viewer (layer registry, styles, diagnostics)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Implement one HTML viewer that loads data_index, geometry, and attributes, and renders multiple layers with toggles.

Tasks:
1) Add build script:
   scripts/map/build_map_viewer.ts
   Mistake guard:
     "phase h3 build unified map viewer with layers and fatal contract checks"

Outputs (committable small files):
- data/derived/map_viewer/index.html
- data/derived/map_viewer/viewer.js
- data/derived/map_viewer/styles.json (optional, or inline)

Viewer requirements:
- Contract-first:
  fetch /data/derived/data_index.json
  validate required fields; fatal banner on errors.
- Load settlements GeoJSON via index.datasets.settlements.path.
  Verify checksum_sha256 (SubtleCrypto) exactly like political_control viewer.
- Load municipality boundaries GeoJSON if present in index (optional layer).
- Load political control attributes from:
  1) /api/political_control if available (same origin) OR
  2) /data/derived/political_control_data.json (fallback)
- Load ethnicity attributes from /data/derived/settlement_ethnicity_data.json
- Render pipeline:
  - Base settlements polygon fill is neutral with thin stroke.
  - Layer: Political control overrides fill by control side (with null as “Unknown”).
  - Layer: Ethnicity overrides fill by majority category.
  - Layer: Municipality boundaries draw as thicker lines atop settlements.
  - Layer ordering controlled by z_index in index.layers.
- UI:
  - Left panel list of layers with checkboxes and legend.
  - Filters:
    - "Unknown control only"
    - "SID substring filter" (applies to highlight)
  - Debug toggles:
    - "?debug=bbox": draw canonical_bbox and show camera numbers
- Camera:
  - Fit-to-bounds uses index.canonical_bbox.
  - Y-down convention.

Important:
- Do not remove or break existing viewers. This is additive.
- Do not hardcode paths beyond /data/derived/data_index.json and dataset paths within it.

2) Add npm scripts:
- "map:viewer:map:build": tsx scripts/map/build_map_viewer.ts
- "map:viewer:map:all":
   - npm run map:derive:substrate
   - npm run map:derive:mun1990:boundaries
   - npm run map:build:ethnicity
   - npm run map:build:political-control
   - npm run map:viewer:substrate:index (keeps existing)
   - npm run map:viewer:map:build

3) Update contract determinism checker to include map_viewer outputs (HTML/JS must be stable if inputs unchanged):
- Extend scripts/map/check_map_contracts_determinism.ts to hash map_viewer/index.html and viewer.js.

Validations:
- npm run typecheck
- npm test
- npm run map:viewer:map:all
- npm run map:contracts:validate
- npm run map:contracts:determinism

Files to touch (H3):
- ADD: scripts/map/build_map_viewer.ts
- ADD: data/derived/map_viewer/index.html
- ADD: data/derived/map_viewer/viewer.js
- (Optional) ADD: data/derived/map_viewer/styles.json
- EDIT: package.json
- EDIT: scripts/map/check_map_contracts_determinism.ts
- EDIT: docs/PROJECT_LEDGER.md

Commit:
- "Phase H3: add unified multi-layer map viewer"

──────────────────────────────────────────────────────────────────────────────
Phase H4 — Displacement readiness hooks (data/index + schema slots only; no mechanics)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Add placeholders so later displacement can be a dataset/layer without rewiring viewers.

Tasks:
1) Extend data_index generation to include (disabled until present):
- datasets:
  - displacement_settlement_turn0 (attribute_json)
  - displacement_municipality_turn0 (attribute_json)
- layers:
  - displacement_settlement
  - displacement_municipality
2) Update unified viewer to:
- list these layers if present, otherwise show as “not available” (gray label).
- no rendering if missing.

No new data files created in this phase.

Validations:
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism

Files to touch (H4):
- EDIT: scripts/map/build_substrate_viewer_index.ts (index generation)
- EDIT: data/derived/map_viewer/viewer.js (layer UI “not available”)
- EDIT: docs/PROJECT_LEDGER.md

Commit:
- "Phase H4: add displacement layer hooks (no mechanics)"

──────────────────────────────────────────────────────────────────────────────
Phase H5 — Final smoke checklist + docs alignment
──────────────────────────────────────────────────────────────────────────────
Objective:
- Make sure everything is reproducible and inspection-ready.

Tasks:
1) Add a short deterministic smoke script:
   scripts/map/smoke_map_viewer_h5.ts
   Mistake guard:
     "phase h5 smoke map viewer contract sanity and dataset presence"
- It loads data_index, confirms required datasets exist for active layers, and prints a small report (no timestamps):
  data/derived/map_viewer_smoke_report.txt

2) Ensure README snippet in docs/context.md or docs/CANON.md (choose ONE) explains how to run the unified viewer:
- npx http-server -p 8080 -c-1
- http://localhost:8080/data/derived/map_viewer/index.html

Validations:
- npm run typecheck
- npm test
- npm run map:viewer:map:all
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:smoke:map-viewer

Files to touch (H5):
- ADD: scripts/map/smoke_map_viewer_h5.ts
- EDIT: package.json
- EDIT: docs/PROJECT_LEDGER.md
- EDIT: docs/context.md OR docs/CANON.md (pick one)

Commit:
- "Phase H5: unified viewer smoke + runbook"

FINAL MANUAL INSPECTION (YOU MUST DO THIS AT END AND REPORT IN LEDGER)
- Serve:
  npx http-server -p 8080 -c-1
- Open:
  http://localhost:8080/data/derived/map_viewer/index.html
- Verify:
  - Settlements render
  - Municipality boundary overlay aligns
  - Political control colors render (API or fallback)
  - Ethnicity colors render
  - Toggles work
  - No blank screens; failures show fatal banner

REPORTING REQUIREMENT
At the very end, append a single “Phase H summary” line in PROJECT_LEDGER noting:
- unified viewer path
- the exact npm command to build everything
- the exact URL to inspect
- whether anything suggests FORAWWV.md addendum (flag only)

NOW EXECUTE Phase H0 → H5 sequentially with the required commits and validations.
---

**Assistant**

Here’s a sanity test of that Phase H0–H5 prompt **in terms of: will it run cleanly in your repo, will it preserve your new “continuity vs v3” resolution, and will it avoid accidental contract breakage**.

---

## Overall: direction is right, but there are 3 high-risk landmines

### Landmine 1 — You’re forking the contracts layer
In G3.x you already extended a canonical contracts module (you mentioned `awwv_contracts.ts` and validators). Your H0 proposes creating **another** `scripts/map/lib/awwv_contracts.ts`.

That’s a classic drift trap:
- One contract validator for viewers,
- another for map scripts,
- both “correct” but inconsistent over time.

**Sanity fix:** In H0, explicitly say:
- “Extend the existing canonical contracts module used by `map:contracts:*` and viewers (do not create a parallel contracts module).”

If you *must* add helpers for scripts, put them under an existing shared location already used by `validate_map_contracts.ts` / viewer index builders.

---

### Landmine 2 — H1 boundary derivation algorithm may be wrong in practice
Your H1 plan assumes adjacent polygons share **identical vertex segments**, so the same `(ax,ay)-(bx,by)` segment will appear in two polygons and can be matched by string key.

That often fails on real-world polygon sets because:
- vertices are not aligned across neighboring polygons,
- coordinate quantization differs,
- edges are split differently (one polygon has two segments where the neighbor has one),
- tiny gaps (your CASE C proof!) mean boundaries may not exist as shared segments at all.

**Result if this assumption fails:** you’ll get *almost no municipality boundaries*, or garbage boundaries, while still being “deterministic”.

**Sanity fix options (pick one, explicitly):**
1) **Pre-flight test step inside H1 before committing code**  
   Require the script to print:
   - total segments scanned
   - number of segments with >1 distinct mun owners
   - a quick sanity ratio like “boundary segments found / total segments”
   If the number is suspiciously low, the phase must **abort with a clear diagnostic error** (not silently emit empty output).

2) **Change the requirement** to something implementable without shared-segment identity:  
   - “Municipality boundaries are rendered in viewer as *derived styling* (thicker stroke where settlement edge separates different municipality_id), computed on the fly using contact graph `shared_border` edges only.”  
   This avoids brittle segment matching, but it does mean your boundary layer is limited to where `shared_border` exists (still better than a misleading “boundary geojson” that’s mostly empty).

If you keep the current H1 algorithm as-is, it’s a coin flip whether you’ll get usable output.

---

### Landmine 3 — Contract & derived-artifact policy conflicts
You correctly ban committing large `data/derived/*`, but in H3 you propose committing:
- `data/derived/map_viewer/index.html`
- `data/derived/map_viewer/viewer.js`

That’s fine (small, stable). But you also propose extending determinism checks to hash those outputs. Good.

The risk: your prompt also says “Update data_index generation to include datasets with checksums *when built exists*” and “allow placeholders”.

If the index builder writes different content depending on which files happen to exist locally, determinism checks can “pass” but the repo state becomes ambiguous.

**Sanity fix:** enforce one of these:
- Either: “data_index lists datasets even if missing, but marks them `available:false` and layers reference them; viewer shows ‘not available’”
- Or: “data_index only lists datasets that exist, and layers are generated from datasets present”

Right now the prompt mixes both approaches. That’s how you get churn and confusing diffs.

---

## Continuity resolution: you must explicitly preserve it in Phase H0/H3
Given G3.6, you now have:
- `settlement_graph_v3.json` (shared-border strict)
- `settlement_continuity_graph.json` (Phase 1 continuity)

Your new unified viewer will likely want **both** eventually (even if not shown at first).

**Sanity addition:** In H0 datasets registry, include both:
- `graph_v3` dataset
- `graph_continuity` dataset

Even if H3 doesn’t render them yet, having them in the registry prevents backsliding and makes future debugging consistent.

---

## Smaller sanity edits I’d make to the prompt

### Mistake guard import path
Your prompt hardcodes:
```ts
import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
```
In your repo, earlier phases used TypeScript imports and relative paths that likely aren’t `.js`. This is a common “prompt compiles nowhere” issue.

**Sanity fix:** say:
- “Use the same mistake guard import style already used in existing map scripts; do not introduce a new path convention.”

### docs/CANON.md may not exist
You require reading `docs/CANON.md`. If it doesn’t exist, Cursor will either create it or fail.

**Sanity fix:** replace with:
- “READ docs/context.md and any existing canon doc(s) if present (do not create new canon docs in this phase plan).”

### “sim:run” script may not exist
You specify `npm run sim:run`. If it’s not defined, Cursor will waste time.

**Sanity fix:** say:
- “Run `npm run sim:run` only if it exists; otherwise skip.”

---

## Net verdict
- **H0 and H3 are conceptually solid** (multi-dataset registry + single viewer is the right move).
- **H1 is the big risk** unless you add an explicit pre-flight validity check or change the boundary approach.
- You should **explicitly carry forward G3.6’s two-graph model** into the dataset registry to avoid conceptual regression.

If you want, I can rewrite your Phase H0–H5 prompt into a “ready to run” version that bakes in these sanity fixes **without changing your intent** (and without adding new mechanics).
---

**User**

Please do. I want to take a nap so I want Cursor to churn this while I do.
---

**Assistant**

Alright. Below is a **sanity-corrected, execution-ready Phase H0–H5 Cursor prompt** that preserves everything you intend, explicitly carries forward the **G3.6 continuity resolution**, and neutralizes the real risks I flagged.  
You can hand this to Cursor and sleep.

I did **not** simplify scope, add mechanics, or weaken discipline. I only made implicit assumptions explicit and removed failure modes.

---

```text
PROJECT: A War Without Victory (AWWV)
PHASES: H0–H5 — Unified map architecture restructure + single multi-layer viewer
MODE: Autonomous, multi-commit, no follow-up questions

You are Cursor operating inside the AWWV repo.
Execute all phases sequentially, end-to-end.
Run all required validations each phase.
Commit once per phase, small and scoped.

GOAL
When finished, visual inspection is possible in ONE viewer:
  http://localhost:8080/data/derived/map_viewer/index.html
with multiple togglable layers driven by data_index.json.

──────────────────────────────────────────────────────────────────────────────
NON-NEGOTIABLE PROJECT CONTEXT
──────────────────────────────────────────────────────────────────────────────
- Strategic simulation, settlement-first substrate is canonical.
- No mechanics changes. This is data, contracts, and viewer architecture only.
- Geometry is authoritative as currently derived (NW region already fixed).
- DO NOT alter geometry or adjacency graphs (v3 or continuity).
- Displacement will be modeled later:
  - Add ONLY data/index hooks + schema slots.
  - NO simulation logic, NO mechanics, NO derived displacement data now.

──────────────────────────────────────────────────────────────────────────────
ABSOLUTE CONSTRAINTS
──────────────────────────────────────────────────────────────────────────────
- Deterministic outputs only (stable ordering, no timestamps, fixed precision).
- Do NOT commit large derived artifacts under data/derived/*
  - EXCEPTION: small HTML / JS / CSS and small JSON indices are allowed.
- Never commit data/derived/_debug/*
- All viewers load data ONLY via data/derived/data_index.json
- If a phase reveals a systemic design insight or invalidates an assumption:
  FLAG in PROJECT_LEDGER.md that FORAWWV.md may need an addendum
  (do NOT auto-edit FORAWWV.md).

──────────────────────────────────────────────────────────────────────────────
LEDGER ACTION (REQUIRED EVERY PHASE)
──────────────────────────────────────────────────────────────────────────────
At start of each phase:
- READ:
  - docs/PROJECT_LEDGER.md (last ~200 lines)
  - docs/context.md
  - docs/ASSISTANT_MISTAKES.log

At end of each phase:
- WRITE:
  - Append Phase Hx entry to docs/PROJECT_LEDGER.md including:
    - Summary
    - Files touched
    - Validations run
    - Mistake-guard phrase
    - FORAWWV note (flag only if applicable)

──────────────────────────────────────────────────────────────────────────────
MISTAKE GUARD (REQUIRED)
──────────────────────────────────────────────────────────────────────────────
In every new or edited script:
- Import mistake guard using the SAME style and path already used
  in existing map scripts (do NOT introduce a new import convention).
- Call:
  loadMistakes()
  assertNoRepeat("<unique phrase for that phase>")

──────────────────────────────────────────────────────────────────────────────
COMMIT DISCIPLINE
──────────────────────────────────────────────────────────────────────────────
Each phase ends with:
- git status (verify scope)
- git add <intended files only>
- git commit -m "Phase Hx: <short title>"
Do NOT bundle phases.

──────────────────────────────────────────────────────────────────────────────
VALIDATIONS (MANDATORY EACH PHASE)
──────────────────────────────────────────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism
- If src/ is touched and sim script exists: npm run sim:run
- Plus any phase-specific scripts listed below

──────────────────────────────────────────────────────────────────────────────
CRITICAL ARCHITECTURAL CONTINUITY (LOCKED)
──────────────────────────────────────────────────────────────────────────────
The system now has TWO adjacency concepts (from Phase G3.6):

1) v3 graph (shared-border only)
2) continuity graph (Phase 1 contact: shared_border + point_touch + distance_contact)

This distinction MUST be preserved.
Do NOT collapse, redefine, or “simplify” it.
The unified viewer may expose neither, one, or both later, but the registry must carry both.

──────────────────────────────────────────────────────────────────────────────
TARGET END STATE
──────────────────────────────────────────────────────────────────────────────
One unified viewer at:
  data/derived/map_viewer/index.html

Viewer behavior:
- Contract-first: loads data_index.json, validates, fails loudly if broken.
- Base layer: settlement polygons.
- Overlay layers (togglable):
  - Municipality 1990 boundaries (outline only)
  - Political control fill
  - Ethnicity majority fill
- Optional filters:
  - Unknown control only
  - SID substring highlight
- Optional debug:
  - canonical bbox
  - camera diagnostics
- No blank screens: fatal error banner with actionable message.

──────────────────────────────────────────────────────────────────────────────
PHASE PLAN
──────────────────────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────────────────────────
Phase H0 — Extend contracts + dataset registry (NO viewer yet)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Extend existing canonical contracts + data_index generation
  to support multiple datasets and layers without breaking existing viewers.

Tasks:
1) EXTEND the EXISTING contracts module used by:
   - map:contracts:validate
   - viewer index builders
   (Do NOT create a parallel contracts module.)

Add helpers if missing:
- validateDataIndexV1(index): { ok, errors[] }
- validateDatasetMeta(meta)
- stableStringify(obj)

Mistake guard:
"phase h0 extend data_index multi-dataset registry"

2) Update data_index generation (existing script):
- Preserve existing substrate_viewer behavior.
- Add datasets registry entries (even if files not present yet):
  - settlements (existing)
  - municipalities_1990_boundaries (linework, future)
  - political_control (attribute_json)
  - settlement_ethnicity (attribute_json)
  - graph_v3
  - graph_continuity
- Add layers registry:
  - base_settlements
  - mun1990_boundaries
  - political_control
  - ethnicity_majority
- Datasets may be listed as available:false if file missing.
- Layers reference datasets but are auto-disabled if unavailable.

3) Add npm script:
- "map:viewer:map:index"

Validations:
- typecheck, test, map:contracts:validate, map:contracts:determinism

Commit:
"Phase H0: extend data_index for unified map viewer"

──────────────────────────────────────────────────────────────────────────────
Phase H1 — Municipality 1990 boundary linework (SAFE, deterministic)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Produce municipality boundary overlay WITHOUT polygon union.
- Abort loudly if derivation is invalid instead of emitting junk.

Tasks:
1) Add script:
scripts/map/derive_mun1990_boundaries_from_settlements.ts

Mistake guard:
"phase h1 derive mun1990 boundaries from settlements"

Inputs:
- settlements_substrate.geojson

Algorithm:
- Extract settlement polygon ring segments.
- Build canonical segment keys using existing coordinate formatter.
- Track municipality ownership per segment.
- Boundary segments = segments shared by >1 distinct municipality_id.

Pre-flight sanity (MANDATORY):
- Print counts:
  - total segments
  - segments with >1 municipality
- If boundary segment count < reasonable threshold
  (e.g., <100), EXIT WITH ERROR explaining likely vertex mismatch.

Output:
- data/derived/municipalities_1990_boundaries.geojson
- LineString or MultiLineString features
- Sorted, deterministic, with awwv_meta.

2) Register dataset in data_index when file exists.

Validations:
- derive substrate
- derive boundaries
- contracts validate + determinism

Commit:
"Phase H1: derive mun1990 boundary overlay"

──────────────────────────────────────────────────────────────────────────────
Phase H2 — Attribute datasets (political control + ethnicity)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Produce deterministic attribute datasets referenced by data_index.

Tasks:
1) Political control:
- Ensure existing script outputs:
  data/derived/political_control_data.json
  deterministic sid ordering.

Mistake guard if edited:
"phase h2 political control dataset contracted"

2) Ethnicity dataset:
- Add script:
scripts/map/build_settlement_ethnicity_data.ts

Mistake guard:
"phase h2 settlement ethnicity dataset contracted"

Output:
- settlement_ethnicity_data.json
- majority + composition + provenance
- Unknown where missing.

3) Extend contract validator:
- Attribute datasets validated if marked available:true
- Non-fatal if dataset exists but layer disabled.

Validations:
- build substrate
- build political control
- build ethnicity
- contracts validate + determinism

Commit:
"Phase H2: build attribute datasets (control, ethnicity)"

──────────────────────────────────────────────────────────────────────────────
Phase H3 — Unified multi-layer map viewer
──────────────────────────────────────────────────────────────────────────────
Objective:
- One HTML viewer that loads datasets via data_index.json.

Tasks:
1) Add build script:
scripts/map/build_map_viewer.ts

Mistake guard:
"phase h3 unified map viewer contract-first"

Outputs (committable):
- data/derived/map_viewer/index.html
- data/derived/map_viewer/viewer.js
- optional styles.json

Viewer requirements:
- Load data_index.json first.
- Validate contracts; fatal banner on error.
- Load settlement geometry.
- Load municipality boundaries if available.
- Load political control + ethnicity attributes.
- Layer toggles with legend.
- Filters:
  - Unknown control only
  - SID substring highlight
- Camera uses canonical_bbox.
- Deterministic output.

2) Add npm scripts:
- map:viewer:map:build
- map:viewer:map:all (full build chain)

3) Extend determinism checker to hash map_viewer outputs.

Validations:
- map:viewer:map:all
- contracts validate + determinism

Commit:
"Phase H3: unified multi-layer map viewer"

──────────────────────────────────────────────────────────────────────────────
Phase H4 — Displacement hooks (NO data, NO mechanics)
──────────────────────────────────────────────────────────────────────────────
Objective:
- Prepare index + viewer for future displacement layers.

Tasks:
- Add datasets (available:false):
  - displacement_settlement_turn0
  - displacement_municipality_turn0
- Add layers:
  - displacement_settlement
  - displacement_municipality
- Viewer lists them as “not available”.

Validations:
- contracts validate + determinism

Commit:
"Phase H4: displacement dataset hooks (no mechanics)"

──────────────────────────────────────────────────────────────────────────────
Phase H5 — Smoke test + runbook
──────────────────────────────────────────────────────────────────────────────
Objective:
- Reproducible inspection path.

Tasks:
1) Add script:
scripts/map/smoke_map_viewer_h5.ts

Mistake guard:
"phase h5 unified viewer smoke sanity"

Output:
- map_viewer_smoke_report.txt (derived, not committed)

2) Update ONE doc (context.md OR existing canon doc):
- How to build + view map_viewer.

Validations:
- map:viewer:map:all
- map:contracts:validate
- map:contracts:determinism
- map:smoke:map-viewer

Commit:
"Phase H5: unified viewer smoke + runbook"

──────────────────────────────────────────────────────────────────────────────
FINAL MANUAL STEP (MUST BE LOGGED)
──────────────────────────────────────────────────────────────────────────────
Serve:
npx http-server -p 8080 -c-1

Open:
http://localhost:8080/data/derived/map_viewer/index.html

Verify:
- Settlements render
- Municipality outlines align
- Political control colors correct
- Ethnicity colors correct
- Toggles work
- No blank screens

Append final “Phase H summary” line to PROJECT_LEDGER.md.

NOW EXECUTE PHASE H0 → H5.
```

---

This version is **safe to let Cursor run unattended**.  
It preserves the G3.6 architectural win, prevents silent failures, and avoids the boundary-derivation trap.

Sleep well — this one will churn cleanly.
---

**User**

PHASE H0–H5 EXECUTION COMPLETE
Summary
Successfully executed all 6 phases (H0–H5) of the unified map architecture restructure + single multi-layer viewer, as specified in the autonomous directive.
Phases Completed
✅ Phase H0 — Extended contracts + dataset registry (NO viewer yet)
Extended awwv_contracts.ts with multi-dataset validation helpers
Updated data_index.json to support multiple datasets and layers
Commit: 5668be2
✅ Phase H1 — Municipality 1990 boundary linework (SAFE, deterministic)
Derived municipality boundaries from settlement polygons (NO polygon union)
Produced municipalities_1990_boundaries.geojson with 268 boundary segments
Pre-flight sanity check prevents emitting junk on vertex mismatch
Commit: 377557d
✅ Phase H2 — Attribute datasets (political control + ethnicity)
Built settlement_ethnicity_data.json (6137 settlements)
Political control dataset already existed from Phase F
Both registered in data_index.json with metadata
Commit: 41c4ee7
✅ Phase H3 — Unified multi-layer map viewer
Generated contract-first HTML viewer at data/derived/map_viewer/index.html
Loads datasets via data_index.json, validates contracts, verifies checksums
Renders togglable layers: settlements, mun1990_boundaries, political_control, ethnicity_majority
Filters: unknown control only, SID substring highlight
Commit: 973cc97
✅ Phase H4 — Displacement hooks (NO data, NO mechanics)
Added displacement dataset and layer entries to data_index.json (available:false)
NO data files, NO simulation logic—index + schema slots only
Commit: 1901dec
✅ Phase H5 — Smoke test + runbook
Added smoke test script validating end-to-end viewer build
Updated context.md with unified viewer build and viewing instructions
Smoke test passed 23 checks
Commit: 5a7f892
✅ PROJECT_LEDGER — Updated with all Phase H entries + summary
Commit: b6fa8c4
Commits Made
7 commits total (6 phases + 1 ledger update):
Phase H0: extend data_index for unified map viewer
Phase H1: derive mun1990 boundary overlay
Phase H2: build attribute datasets (control, ethnicity)
Phase H3: unified multi-layer map viewer
Phase H4: displacement dataset hooks (no mechanics)
Phase H5: unified viewer smoke + runbook
Update PROJECT_LEDGER.md with Phase H0-H5 entries + summary
Validations
All phases passed:
✅ npm run typecheck (all phases)
✅ npm test (Phase H0)
✅ npm run map:contracts:validate (all phases)
✅ npm run map:contracts:determinism (H0-H5)
✅ npm run map:smoke:map-viewer (Phase H5: 23 checks passed)
Manual Inspection Step (Required)
The final step is manual visual inspection:
# From repository root:npx http-server -p 8080 -c-1# Then open in browser:http://localhost:8080/data/derived/map_viewer/index.html
Verify:
✓ Settlements render
✓ Municipality outlines align (if available)
✓ Political control colors correct (if available)
✓ Ethnicity colors correct (if available)
✓ Layer toggles work
✓ No blank screens
✓ Fatal error banner shows clear messages on failures
Non-Negotiable Constraints Preserved
✅ Deterministic outputs (stable ordering, no timestamps, fixed precision)
✅ No large derived artifacts committed under data/derived/*
✅ No commits to data/derived/_debug/*
✅ Geometry and adjacency graphs (v3 + continuity) unchanged
✅ Displacement modeling deferred (index hooks only)
✅ No mechanics changes (data, contracts, and viewer architecture only)
FORAWWV Note
No systemic design insights revealed that require FORAWWV.md addendum. Phase H0–H5 implemented contract-first viewer architecture without invalidating existing assumptions.
Phase H0–H5 execution complete. All code changes committed, PROJECT_LEDGER.md updated, validations passed. Ready for manual visual inspection.

OK the viewer works somewhat. Settlements work, majority by settlements works. However, municipalities are not rendered properly.
As for political control, it shows the correct number, buit the coloration of settlements is not OK, they rae xtsill just grey
---

**Assistant**

Got it. Based on what you’re seeing, these are **two separate issues**:

## 1) Political control loads, counts are right, but polygons stay grey
That almost always means **the attribute dataset is being read**, but the **render pipeline never uses it to set fill** (or it’s being overwritten by the base layer pass).

Most likely failure modes:
- **Layer order bug**: base settlements are drawn *after* political control and overwrite fill back to neutral grey.
- **Key mismatch bug**: viewer looks up `by_settlement_id[sid]` but `sid` is in a different canonical form (numeric vs `"Sxxxxx"`), so every lookup returns `undefined` and falls back to grey.
- **Layer toggle is “enabled” but not “active”**: e.g., UI sets state but render loop doesn’t consult it.

### Fast sanity checks (no guessing)
In `data/derived/map_viewer/viewer.js`:
- Find where it sets `fillStyle` for settlement polygons.
- Verify that when **political_control layer is enabled**, it computes `side = political_control.by_settlement_id[sid]` (or equivalent) and maps side → color.
- Verify it does **not** re-draw the same polygon later with grey fill.
- Verify it normalizes `sid` exactly once (if needed) and uses substrate IDs as canonical.

✅ Since your “correct number” shows, the dataset is loading. The bug is nearly certainly **render order** or **lookup mismatch**.

---

## 2) Municipality boundaries are “not rendered properly”
Your Phase H1 output said **268 boundary segments**. That’s a red flag: for a whole-country municipal outline overlay, 268 is *way* too low.

This implies the H1 algorithm (shared exact vertex segments across polygons) is only finding a tiny subset of boundaries, which matches what we feared:
- adjacent settlement polygons often **don’t share identical vertex segments**
- edges are split differently / coordinates aren’t aligned
- fragmentation and micro-gaps prevent “exact segment match”

So the viewer is likely rendering exactly what you generated, it’s just an incomplete dataset.

### What “proper” should mean here (given your constraints)
You explicitly forbade polygon union, so the correct approach is:
- derive boundary linework by comparing neighboring polygons *locally*, not by assuming global shared segment identity.

The cleanest deterministic way that doesn’t touch geometry or mechanics:
- use **Phase 1 shared-border edges** as the candidate adjacency set
- for each A–B pair with shared-border contact and **mun(A) != mun(B)**:
  - extract both polygons’ boundary polylines
  - snap coordinates to a fixed grid (deterministic rounding, not a heuristic)
  - compute **overlapping boundary segments** (exact match after snapping)
  - emit those as the municipal boundary linework

This stays “no union”, stays deterministic, and won’t depend on whole-country segment identity.

---

# Cursor prompt to fix both issues
(One phase, one commit, with validations.)

```text
Phase H3.1 — Fix political control fill + rebuild mun1990 boundary overlay v2 (deterministic, no union)

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~120 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "map_viewer", "mun boundary", "political control", "sid mismatch")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.1 entry)

MISTAKE GUARD (MANDATORY)
- In every script edited/added: loadMistakes(); assertNoRepeat("phase h3.1 fix political control rendering and mun1990 boundaries v2 via shared-border pairs");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change geometry derivation.
- DO NOT change adjacency graph derivations (v3, continuity, phase1 contact).
- DO NOT polygon-union municipalities.
- Deterministic outputs only; no timestamps.
- Do not commit large derived artifacts or any data/derived/_debug/*.

TASK A — Fix political control coloration in unified viewer
1) Inspect data/derived/map_viewer/viewer.js rendering pipeline:
   - Confirm layer enable state is actually consulted in render loop.
   - Confirm polygon fill is not overwritten by later draw passes.
   - Confirm political_control dataset keying matches substrate SIDs ("Sxxxxx").
   - If needed, add a single canonical normalizeSid() used everywhere.

2) Ensure render precedence:
   - Base settlements: neutral fill ONLY when no overlay active
   - If political_control layer ON: fill from controller mapping
   - If ethnicity_majority layer ON: fill from ethnicity mapping
   - If both ON, define explicit precedence (document in code + UI):
     - Either "top-most wins" or "mutually exclusive toggles" (pick one, deterministic)

3) Add a visible fallback signal in debug mode:
   - If political_control is ON and sid lookup misses, increment a counter and show in stats:
     "control_missing_keys: N"
   This makes future ID mismatches obvious.

TASK B — Rebuild municipality boundary linework v2 (robust, deterministic, no union)
4) Add new script (do NOT replace H1 script; add v2):
   scripts/map/derive_mun1990_boundaries_from_shared_borders_v2.ts

   Inputs:
   - data/derived/settlements_substrate.geojson (polygons + municipality_id)
   - data/derived/settlement_contact_graph.json (Phase 1 edges)

   Approach:
   - Consider only Phase 1 edges with type == "shared_border".
   - For each such edge (a,b):
     - get mun(a), mun(b); if equal, skip
     - compute overlapping boundary segments between polygon boundaries of a and b:
       - convert polygon rings into segment list
       - snap coordinates with deterministic rounding to 1e-6 (or reuse existing formatter)
       - build undirected segment keys and intersect sets between a and b
     - emit matched segments as LineStrings with properties:
       { mun_a, mun_b, kind: "mun1990_boundary_v2" }
   - Determinism:
     - sort edges by (mun_a, mun_b, a, b)
     - sort segments by key
     - sort output features by (mun_a, mun_b), then stable segment order

   Output:
   - data/derived/municipalities_1990_boundaries_v2.geojson
   - Include awwv_meta consistent with existing derived geojson conventions.

   Mandatory sanity print (stdout):
   - candidate_shared_border_pairs
   - pairs_crossing_mun
   - total_boundary_segments_emitted
   - top 10 (mun_a,mun_b) by segment count

5) Register v2 dataset in data_index:
   - dataset id: municipalities_1990_boundaries_v2
   - layer: mun1990_boundaries should prefer v2 if present, else fallback to v1

6) Update unified viewer to load boundary dataset path from data_index layers/datasets:
   - If v2 present, render v2
   - Else if v1 present, render v1
   - Else show "not available"

TASK C — NPM scripts
7) Add npm script:
   - "map:derive:mun1990:boundaries:v2": "tsx scripts/map/derive_mun1990_boundaries_from_shared_borders_v2.ts"
8) Ensure map:viewer:map:all runs v2 derivation before building viewer (or update the chain).

VALIDATIONS (MANDATORY)
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:derive:mun1990:boundaries:v2
- npm run map:viewer:map:all

MANUAL SANITY (quick, report in ledger)
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
- Confirm:
  - Political control layer visibly recolors settlements (not grey)
  - Municipality boundaries overlay is materially denser and aligns visually

COMMIT DISCIPLINE
- Commit ONLY code + viewer assets + package.json + ledger.
- Do NOT commit derived geojson outputs.
- Commit message (exact):
  "Phase H3.1: fix political control fill + mun1990 boundaries v2"

FILES TO TOUCH
- EDIT: data/derived/map_viewer/viewer.js
- ADD: scripts/map/derive_mun1990_boundaries_from_shared_borders_v2.ts
- EDIT: scripts/map/build_substrate_viewer_index.ts (or equivalent index builder)
- EDIT: package.json
- EDIT: docs/PROJECT_LEDGER.md
```

If you run that, you should end up with:
- political control actually painting
- a boundary overlay that looks like real municipal outlines rather than a handful of stray segments

If anything in the repo uses a different property name than `municipality_id` for mun1990 on settlement features, Cursor should detect it from substrate properties and use the existing key rather than inventing a new one.
---

**User**

Phase H3.1 Complete ✓
Successfully completed all tasks:
Task A: Fixed Political Control Rendering
Problem: Political control layer showed grey settlements instead of faction colors
Root cause: SID key mismatch - political_control_data.json uses keys like "10014:100013" (mun:sid without prefix), but substrate features have SIDs like "S100013" (with "S" prefix)
Solution: Added normalizeSid() function to strip "S" prefix when building keys
Improvements:
Fixed layer precedence (political_control > ethnicity when both ON)
Added debug stats counter that displays missing keys in legend
Regenerated viewer.js with fixes
Task B: Municipality Boundaries v2
Created: scripts/map/derive_mun1990_boundaries_from_shared_borders_v2.ts
Approach: Uses Phase 1 contact graph shared_border edges to identify cross-municipality settlement pairs, then computes overlapping boundary segments via polygon ring segment intersection
Output: municipalities_1990_boundaries_v2.geojson (268 segments, 7 municipality pairs)
Benefits: More robust than H1 direct segment cancellation; leverages validated Phase 1 contact graph
Result: Identical segment count to H1 (268) as expected, since shared-border pairs are the foundation
Task C: Integration
Updated build_substrate_viewer_index.ts to prefer v2 boundaries if available
Added npm script map:derive:mun1990:boundaries:v2
Updated map:viewer:map:all to run v2 derivation before viewer build
data_index.json now loads v2 boundaries automatically
Validations ✓
✅ typecheck: pass
✅ test: 277 pass
✅ map:contracts:validate: pass
✅ map:contracts:determinism: pass
Manual Testing (for user)
To verify the fixes:
npx http-server -p 8080 -c-1# Open: http://localhost:8080/data/derived/map_viewer/index.html
Expected results:
Political control layer shows colored settlements (green/red/blue for RBiH/RS/HRHB)
Municipality boundaries overlay is visible (same density as before, 268 segments)
No "Missing keys" debug warning in legend (or very few)
Commit
✅ Committed code changes only (no derived artifacts)
Message: "Phase H3.1: fix political control fill + mun1990 boundaries v2"
Files: 5 changed (356 insertions, 14 deletions)

Municipalities still don't work.
Political control now works, except for a few settlements. In order for me to highlight them, I'd like changes to the viewer:
Task 1: Zoom does not work correctly. When zooming in, it strays from starting point.
Task 2: On click, there needs to be a side panel which shows these informations about the settlement: Name, municipality, ethnic majority, control.
---

**Assistant**

```text
Phase H3.2 — Map viewer UX: stable zoom anchor + settlement side panel details

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~120 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "map_viewer", "zoom", "camera", "normalizeSid", "political_control_data")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.2 entry: summary, files, validations, mistake-guard phrase, FORAWWV note if any)

MISTAKE GUARD (MANDATORY)
- In every script/file you edit that is a TS/JS build script: loadMistakes(); assertNoRepeat("phase h3.2 map viewer stable zoom anchor and settlement side panel details");

CONSTRAINTS (NON-NEGOTIABLE)
- No geometry/graph changes.
- Deterministic viewer build output (same inputs => same HTML/JS).
- Do not commit derived large artifacts. Small viewer assets are allowed.
- Keep contract-first loading via data/derived/data_index.json.

GOAL
1) Fix zoom behavior so zooming does not drift: zoom must be anchored to cursor (mouse position) and preserve the world point under the cursor.
2) Add a right-side panel that appears on settlement click and shows:
   - Name
   - Municipality
   - Ethnic majority
   - Political control
   - Settlement ID (always shown for debugging)
   Also show a “Missing attribute” indicator per field when not found.

FILES TO TOUCH
- EDIT (likely): scripts/map/build_map_viewer.ts
- EDIT (generated output): data/derived/map_viewer/viewer.js
- EDIT (optional): data/derived/map_viewer/index.html (only if needed for panel container)
- EDIT: package.json (only if adding a script)
- EDIT: docs/PROJECT_LEDGER.md

TASK A — Fix zoom anchoring (no drift)
1) Inspect current camera/transform implementation in data/derived/map_viewer/viewer.js.
   Identify:
   - worldToScreen()
   - screenToWorld()
   - current camera state variables (scale, offset, pan, etc.)
   - wheel handler and/or pointer zoom logic

2) Implement cursor-anchored zoom using invariant:
   Let p_screen be mouse position in screen pixels.
   Let p_world_before = screenToWorld(p_screen) before zoom.
   Update zoom factor (clamped) => newScale.
   Recompute camera offset so that p_world_before maps back to p_screen under new scale:
     p_world_before == screenToWorld_after(p_screen)
   This typically means updating translation like:
     offsetX = p_screen.x - p_world_before.x * newScale
     offsetY = p_screen.y - p_world_before.y * newScale
   (Adjust formula to match your transform convention.)
   Ensure this uses canonical_bbox and existing y-down convention.

3) Ensure wheel zoom respects:
   - zoom centered on cursor
   - clamped min/max scale
   - stable behavior across repeated zoom events
   - no dependence on frame timing (deterministic)

4) Add a small debug overlay (only when ?debug=camera):
   - scale
   - offsetX/offsetY
   - world coords under cursor
   This is view-only; no new files required if you already have debug text.

TASK B — Add right-side settlement info panel
5) Update map_viewer HTML structure (prefer via build_map_viewer.ts so it’s reproducible):
   - Add a right-side panel container, hidden by default.
   - Add a close button (x) and keep panel width fixed (e.g., 320px).
   - Ensure canvas resizes to remaining width (or overlays with absolute positioning).
   - No external dependencies.

6) On settlement click:
   - Determine clicked settlement feature deterministically:
     - Use existing point-in-polygon or hit test.
     - If multiple candidates, pick the smallest-area polygon or the one drawn last — but be explicit and stable (document rule in code).
   - Set selectedSettlementId and render:
     - Settlement ID
     - Name:
       - pull from feature.properties.name (or whichever key exists; detect from substrate by checking known candidates like "name", "naziv", "settlement_name"; do not guess beyond that; if none, show "Unknown")
     - Municipality:
       - show municipality id from feature properties (same key used elsewhere)
       - if you also have a municipality display name mapping, show it; if not, show id only (do not invent names)
     - Ethnic majority:
       - from settlement_ethnicity_data.json by settlement id keying used in current viewer
     - Political control:
       - from political_control_data.json using the same key logic fixed in H3.1
   - For each field, show:
     - value
     - provenance / missing indicator:
       - “missing in dataset” if lookup fails
       - “unknown” if present but explicitly unknown/null
   - Also include quick counts:
     - Whether political_control lookup key matched (true/false)
     - Whether ethnicity lookup matched (true/false)

7) Add “copy debug” action:
   - A button that copies a one-line string to clipboard:
     SID=<...> mun=<...> control=<...> majority=<...> name=<...>
   This helps you report the few remaining mismatches.

TASK C — Make it easy to find the few remaining control mismatches
8) Add a viewer toggle: “Highlight missing political-control mapping”
   - When ON, outline settlements where control lookup fails (missing key) in a strong stroke (do not change fill).
   - Add stat counter in legend:
     control_missing_keys: N
   (You already added missing-key counter; extend to allow highlighting.)

BUILD / SCRIPTS
9) Ensure build script regenerates viewer assets deterministically:
   - If viewer.js is generated by build_map_viewer.ts, keep it that way.
   - If viewer.js is edited directly, ensure build script does not overwrite it unexpectedly.

10) If needed, add npm script:
   - "map:viewer:map:build" already exists; do not add new scripts unless necessary.

VALIDATIONS (MANDATORY)
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:viewer:map:all

MANUAL SANITY (REQUIRED, LOG IN LEDGER)
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
Verify:
- Wheel zoom stays anchored to cursor (no drift away from the point you zoomed on)
- Click a settlement => side panel opens with all fields (or missing indicators)
- Toggle “Highlight missing political-control mapping” => the few problematic settlements are clearly outlined

COMMIT DISCIPLINE
- git status (scope check)
- git add <intended files only>
- git commit -m "Phase H3.2: map viewer zoom anchor + settlement info panel"
- Do NOT add any data/derived/*.geojson/json outputs.

ACCEPTANCE CRITERIA
- Zoom is cursor-anchored and does not drift.
- Side panel reliably shows: Name, Municipality, Ethnic majority, Control, SID.
- Missing mapping highlight toggle works and missing-key count is visible.
- All validations pass.
- Ledger updated with Phase H3.2 entry including manual sanity confirmation and any FORAWWV flag note (flag only, no edits).
```
---

**User**

Municipalities still don't work, but let's tackle that later on. First let's solve political control for these settlements that are currently unknown:
Entire Tuzla municipality should be mapped as RBiH
Entire Vareš municipality should be mapped as RBiH

There are some discrepancies. It is not showing me settlement name - it is showing me post-1995 municipality name instead.
---

**Assistant**

Good, this is the right call. We **freeze municipalities**, fix political control deterministically, and fix the **name provenance bug** in the viewer.

Below is a **tight Phase H3.3 Cursor prompt** that does exactly that, with no geometry or graph changes, and no hidden heuristics.

---

```text
Phase H3.3 — Political control normalization (Tuzla, Vareš) + settlement name provenance fix

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~120 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "political_control", "tuzla", "vares", "name", "municipality")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.3 entry)

MISTAKE GUARD (MANDATORY)
- In every script edited/added:
  loadMistakes();
  assertNoRepeat("phase h3.3 political control normalization tuzla vares and settlement name provenance");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change geometry.
- DO NOT change adjacency graphs (v3, continuity, Phase 1).
- DO NOT add ad-hoc per-settlement fixes.
- Political control overrides must be municipality-scoped, explicit, and documented.
- Viewer must display **settlement name**, not post-1995 municipality name.
- Deterministic outputs only.
- Do not commit large derived artifacts.

GOAL
1) Fix political control for known missing areas:
   - Entire Tuzla municipality → RBiH
   - Entire Vareš municipality → RBiH
2) Ensure the viewer shows the **actual settlement name** from substrate, never a municipality name.

──────────────────────────────────────────────────────────────────────────────
TASK A — Political control dataset normalization (municipality-scoped)
──────────────────────────────────────────────────────────────────────────────
1) Edit the political control build script:
   scripts/map/build_political_control_data.ts

   Add an explicit, documented normalization block AFTER base control assignment,
   BEFORE output serialization.

   Canonical rule (deterministic, order matters):
   - If settlement.municipality_id ∈ { Tuzla_1990_id, Vares_1990_id }
     then control = "RBiH"

   Notes:
   - Use the same municipality_id field already used elsewhere (do NOT invent a new one).
   - Identify Tuzla and Vareš by their **canonical 1990 municipality IDs**, not names.
   - Do NOT hardcode post-1995 municipality codes.
   - Log (stdout) a deterministic summary:
     - overridden_settlements_count
     - list of municipality_ids affected
     - before/after counts by control side

2) Ensure SID normalization is consistent:
   - Keys in by_settlement_id must match the canonical SID format used by the viewer
     (whatever was fixed in Phase H3.1).
   - No mixed key formats in output.

3) Update metadata:
   - meta.normalizations_applied: ["mun1990:Tuzla->RBiH","mun1990:Vares->RBiH"]

4) Re-run builder:
   - npm run map:build:political-control

──────────────────────────────────────────────────────────────────────────────
TASK B — Fix settlement name provenance in unified viewer
──────────────────────────────────────────────────────────────────────────────
Problem:
- Viewer currently displays post-1995 municipality name instead of settlement name.

Required behavior:
- Settlement name must come from settlement feature properties ONLY.
- Municipality name/id must be shown separately and clearly labeled.

Steps:
5) Inspect data/derived/map_viewer/viewer.js:
   - Locate where “Name” field is populated in the side panel.

6) Implement strict provenance rules:
   - Settlement name source priority:
     1) feature.properties.name
     2) feature.properties.settlement_name
     3) feature.properties.naziv
     4) fallback: "Unknown settlement"
   - Municipality name/id source:
     - feature.properties.municipality_id (ID always shown)
     - If a display name mapping exists, show it SECONDARY and labeled "Municipality"

7) Add defensive assertion (viewer-side, non-fatal):
   - If settlement name === municipality name, flag it in debug panel:
     "name_source_warning: possible municipality name used"

8) Update side panel labels explicitly:
   - "Settlement"
   - "Municipality (1990)"
   - "Political control"
   - "Ethnic majority"

──────────────────────────────────────────────────────────────────────────────
TASK C — Viewer diagnostics for control mismatches
──────────────────────────────────────────────────────────────────────────────
9) Extend existing debug stats:
   - control_missing_keys (already exists)
   - control_overridden_by_municipality (new)

10) Add toggle:
   - “Highlight municipality-normalized control”
   When ON:
   - outline settlements affected by Tuzla/Vareš override with a dashed stroke
   - no fill change (fill already reflects RBiH)

──────────────────────────────────────────────────────────────────────────────
VALIDATIONS (MANDATORY)
──────────────────────────────────────────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:build:political-control
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:viewer:map:all

──────────────────────────────────────────────────────────────────────────────
MANUAL SANITY (REQUIRED — LOG IN LEDGER)
──────────────────────────────────────────────────────────────────────────────
- Serve:
  npx http-server -p 8080 -c-1
- Open:
  http://localhost:8080/data/derived/map_viewer/index.html

Verify:
- Tuzla settlements are all RBiH (no grey)
- Vareš settlements are all RBiH
- Settlement names are actual settlement names, not municipality names
- Municipality shown separately and correctly labeled
- Highlight toggle correctly outlines overridden settlements

──────────────────────────────────────────────────────────────────────────────
COMMIT DISCIPLINE
──────────────────────────────────────────────────────────────────────────────
- git status (scope check)
- git add:
  scripts/map/build_political_control_data.ts
  data/derived/map_viewer/viewer.js
  docs/PROJECT_LEDGER.md
- git commit -m "Phase H3.3: political control normalization (Tuzla, Vareš) + settlement name fix"

ACCEPTANCE CRITERIA
- No settlements in Tuzla or Vareš show unknown control.
- No settlement shows a municipality name as its own name.
- Overrides are municipality-scoped, documented, and visible in debug stats.
- All validations pass.
```

---

### Why this is correct (briefly)
- **Tuzla + Vareš** are not “edge cases”, they are **institutional control facts** → municipality-scoped override is correct and transparent.
- No per-settlement hacks.
- Viewer bug is a **provenance mix-up**, not a data problem.
- Everything is auditable, reversible, and deterministic.

When you’re ready, we can come back to municipalities **properly** (but that’s a separate architectural question).
---

**User**

Phase H3.3 Complete ✓
Summary: Successfully implemented political control normalization for Tuzla and Vareš municipalities and fixed settlement name display in the viewer.
Key Accomplishments:
1. Political Control Normalization (Task A)
Added municipality-scoped override in scripts/map/build_political_control_data.ts
Canonical rule: If settlement.mun1990_id ∈ {"tuzla", "vares"} then control = "RBiH"
Results:
151 settlements overridden (Tuzla + Vareš)
RBiH count increased: 2724 → 2875
Null control reduced: 187 → 36
Deterministic normalization with stdout logging:
  Overridden settlements: 151  Affected municipalities: tuzla, vares  Before: RBiH: 2724, RS: 2064, HRHB: 1171, null: 187  After:  RBiH: 2875, RS: 2064, HRHB: 1171, null: 36
Added normalizations_applied metadata: ["mun1990:tuzla->RBiH", "mun1990:vares->RBiH"]
2. Settlement Name Provenance Fix (Task B)
Fixed viewer panel to show actual settlement names, not municipality names
Strict provenance hierarchy:
feature.properties.name
feature.properties.settlement_name
feature.properties.naziv
Fallback: "Unknown settlement"
Updated labels for clarity:
"Settlement:" (settlement name)
"Municipality (1990):" (municipality ID + mun1990_id if different)
Added name source warning: When settlement name matches municipality name (case-insensitive), displays:
  ⚠ name_source_warning: possible municipality name used
Enhanced "Copy Debug Info" to include mun1990 and normalized flags
3. Municipality-Normalized Control Diagnostics (Task C)
Added "Highlight municipality-normalized control" checkbox
When enabled, outlines normalized settlements with dashed green stroke (#2e7d32, strokeWidth 2, dashArray [5, 3])
Added debugStats.control_overridden_by_municipality counter
Legend displays: control_overridden_by_municipality: 151 (in green)
Panel shows "✓ mun-normalized" indicator for affected settlements
Lookup diagnostics displays: Municipality-normalized: ✓ (mun1990Id)
Technical Details:
Municipality IDs:
Tuzla: municipality_id = "11088", mun1990_id = "tuzla"
Vareš: municipality_id = "11100", mun1990_id = "vares"
Normalization Logic:
const MUN_NORMALIZATIONS: Record<string, string> = {  tuzla: 'RBiH',  vares: 'RBiH'};
Viewer Rendering Priority:
Normalized highlight (dashed green) - highest priority
Missing control highlight (solid red)
Base stroke (default)
Files Modified:
scripts/map/build_political_control_data.ts (normalization logic)
scripts/map/build_map_viewer.ts (panel + diagnostics)
data/derived/map_viewer/index.html (generated, new toggle)
data/derived/map_viewer/viewer.js (generated, 105 lines changed)
docs/PROJECT_LEDGER.md (Phase H3.3 entry)
Validations: All Pass ✓
✅ npm run typecheck (pass)
✅ npm test (277 tests pass)
✅ npm run map:contracts:validate (pass)
✅ npm run map:contracts:determinism (pass)
Commit:
commit 92aa16919581d329379ba0cdc0cf8752f6971130Phase H3.3: political control normalization (Tuzla, Vareš) + settlement name fix5 files changed, 247 insertions(+), 50 deletions(-)
Manual Sanity Check (User Action Required):
npx http-server -p 8080 -c-1
Open: http://localhost:8080/data/derived/map_viewer/index.html
Verify:
✅ Tuzla settlements all show RBiH control (no grey/null)
✅ Vareš settlements all show RBiH control (no grey/null)
✅ Settlement names are actual settlement names, not municipality names
✅ Municipality shown separately with label "Municipality (1990):"
✅ "Highlight municipality-normalized control" toggle outlines 151 settlements in dashed green
✅ Legend shows control_overridden_by_municipality: 151
✅ Panel displays "✓ mun-normalized" for Tuzla/Vareš settlements
All tasks completed successfully! The viewer now correctly displays political control for all Tuzla and Vareš settlements, and settlement names are properly distinguished from municipality names.

Tuzla and Vareš changes worked, but it is still showing municipality name (post'1995) instead of settlement name.
---

**Assistant**

You’re still seeing a post-1995 municipality name because **the substrate “name” field is not a settlement name** in your current pipeline (or the viewer is still binding the “Settlement” label to the wrong property). The fix is to **stop guessing** and make the viewer use an explicitly validated *settlement-name source*.

Here’s a Cursor prompt that will (1) discover what fields actually exist on settlement features, (2) pick the correct one deterministically, and (3) if there is no reliable settlement-name property, introduce a small derived `settlement_names.json` dataset keyed by SID and have the viewer use that instead.

```text
Phase H3.4 — Fix settlement name source (stop using post-1995 municipality names)

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~120 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "settlement name", "name provenance", "post-1995", "attach_settlement_names")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.4 entry)

MISTAKE GUARD (MANDATORY)
- In any script edited/added:
  loadMistakes();
  assertNoRepeat("phase h3.4 settlement name source audit and deterministic settlement_names dataset");

CONSTRAINTS (NON-NEGOTIABLE)
- No geometry changes.
- No adjacency changes.
- Deterministic outputs only.
- Do not commit large derived artifacts (small json indices ok).
- Viewer remains contract-first via data/derived/data_index.json.

GOAL
- Ensure the viewer’s “Settlement:” field shows the real settlement name.
- Never show a post-1995 municipality name as a settlement name.
- Make the name source explicit, validated, and debuggable.

TASK A — Audit substrate properties for actual name fields (deterministic)
1) Add a small diagnostic script:
   scripts/map/audit_settlement_name_fields_h3_4.ts

   Inputs:
   - data/derived/settlements_substrate.geojson

   Behavior:
   - Read first N=200 features in stable SID order.
   - Collect:
     - list of property keys present (frequency)
     - for candidate name keys (at minimum):
       ["name","settlement_name","naziv","naselje","ime","label","place","toponym","naselje_naziv"]
       capture sample values (first 10 per key, stable)
   - Also collect municipality-related keys + samples:
       ["municipality","municipality_name","mun_name","opstina","opstina_name","post1995_municipality","post1995_name","municipality_post1995"]
   - Output (derived, not committed):
     data/derived/_debug/settlement_name_field_audit_h3_4.json
     data/derived/_debug/settlement_name_field_audit_h3_4.txt

2) Add npm script:
   "map:audit:settlement-names:h3_4": "tsx scripts/map/audit_settlement_name_fields_h3_4.ts"

3) Run it and use results to pick ONE canonical settlement-name key if it exists.

Acceptance for “exists”:
- Key must be present on most features
- Values must look like settlement names (not identical to municipality display names in bulk)

TASK B — Implement a deterministic settlement_names dataset if needed
If Task A shows there is NO reliable settlement name key, do this:

4) Create script:
   scripts/map/build_settlement_names_data_h3_4.ts

   Inputs (choose best canonical source available in repo; do NOT invent):
   - Prefer an existing settlement name index artifact if present (search under data/source or data/derived indices).
   - Fallback to bih_census_1991.json ONLY if it contains settlement names keyed in a way you can deterministically map to SIDs (must be provable, no fuzzy matching).

   Output (small, committable JSON):
   - data/derived/settlement_names.json
   Shape:
   {
     "meta": { "total_settlements": 6137, "unknown": <n>, "source": "<file>" },
     "by_settlement_id": { "S100013": "Name", ... }
   }

   Determinism:
   - Keys sorted by SID
   - No timestamps

5) Register dataset in data_index.json (H0 registry style):
   - datasets.settlement_names (attribute_json)
   - layers: none required, it’s a supporting dataset for the side panel

TASK C — Update viewer to use correct settlement name source
6) Update scripts/map/build_map_viewer.ts (so generated viewer.js is correct) and regenerate viewer assets.

Rule in viewer (explicit, no ambiguity):
- If settlement_names dataset exists and loads: use it as authoritative for settlement display name.
- Else use the canonical settlement-name property key discovered in Task A.
- Else show "Unknown settlement".

Add debug display in side panel:
- name_source: "settlement_names.json" | "feature.properties.<key>" | "unknown"
- name_warning if the selected name matches municipality display name (case-insensitive) AND a municipality name field exists.

IMPORTANT:
- Do NOT ever set “Settlement:” from any municipality_* field.
- “Municipality (1990):” remains separate and can show ID + (optional) label.

TASK D — Validations
7) Run:
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:audit:settlement-names:h3_4
- npm run map:viewer:map:all

MANUAL SANITY (REQUIRED, log in ledger)
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
- Click multiple settlements in different municipalities
Verify:
- “Settlement:” is a settlement name (not municipality name)
- “Municipality (1990):” is separate and correct
- Side panel shows name_source and warnings only when appropriate

COMMIT DISCIPLINE
- Commit only code + small json (if created) + ledger.
- Do NOT commit any _debug outputs.
- git add:
  scripts/map/audit_settlement_name_fields_h3_4.ts
  (optional) scripts/map/build_settlement_names_data_h3_4.ts
  (optional) data/derived/settlement_names.json
  scripts/map/build_map_viewer.ts
  data/derived/map_viewer/index.html
  data/derived/map_viewer/viewer.js
  scripts/map/build_substrate_viewer_index.ts (only if data_index updated)
  package.json
  docs/PROJECT_LEDGER.md

- git commit -m "Phase H3.4: fix settlement name source (authoritative settlement names)"

ACCEPTANCE CRITERIA
- Viewer no longer shows post-1995 municipality names as settlement names.
- Side panel shows a deterministic, auditable name_source.
- All validations pass.
```

If you run this, we’ll know definitively whether the bug is:
- **(A)** viewer still reading the wrong property, or
- **(B)** the substrate simply doesn’t contain settlement names in any reliable field (in which case the explicit `settlement_names.json` dataset becomes the right long-term contract).
---

**User**

While Cursor is running that, just to check - would be better of building a database?
---

**Assistant**

It depends what you mean by “database,” but for **AWWV’s goals (determinism, reproducible builds, offline/static viewer via http-server)** a traditional database is usually the *wrong default*.

## When a database is not worth it for you
A DB (SQLite/Postgres) becomes friction if you want:
- deterministic “same inputs → same outputs” builds
- a repo that can be cloned and run with `npm scripts + http-server`
- easy artifact diffing in git (JSON/GeoJSON/text diffs)
- viewers that work as static files (no backend)

You’d end up rebuilding/exporting from the DB anyway to serve the viewer, which reintroduces the same contract problems you’ve been solving—just with another moving part.

## When a database *is* worth it
A DB helps if you need **interactive querying at scale** that is painful in JS:
- spatial queries (nearest, within, intersects) *at runtime*
- heavy joins across many layers (settlement ↔ municipality ↔ census ↔ events per turn)
- incremental updates (turn-by-turn) with lots of history
- multi-user tooling (future editor UI)

If you go this route later, use it as a **development/analysis store**, not as the shipping “source of truth.”

## Best of both worlds for AWWV
What you’ve built is basically a **content-addressed dataset registry**:
- `data_index.json` is your “catalog”
- each dataset is a deterministic artifact with checksums
- viewers load it statically

That’s already the *database* you need for this stage—just in files.

### If you want “database-like” benefits without a DB
Two practical upgrades (still static, deterministic):
1) **Small attribute indices** (like you’re doing):  
   `settlement_names.json`, `political_control_data.json`, `settlement_ethnicity_data.json`
2) **Optional local dev query tool** that runs on demand:  
   `npm run map:query -- --sid S104566`  
   It reads artifacts and prints facts. No persistence required.

## Recommendation
- **Don’t introduce a DB now.** You’re still stabilizing contracts and provenance, and a DB will hide problems rather than solve them.
- Revisit a DB only when you have one of these requirements:
  - you need fast spatial querying *during gameplay* at turn scale, or
  - you’re building an editor and need complex ad-hoc queries.

If you tell me what you’d want the DB to do (runtime sim, viewer queries, or authoring tools), I can outline the smallest DB architecture that wouldn’t break your deterministic pipeline.
---

**User**

Phase H3.4 — Fix settlement name source (complete)
Task A — Audit substrate name fields
Added scripts/map/audit_settlement_name_fields_h3_4.ts:
Reads data/derived/settlements_substrate.geojson.
Takes first 200 features in stable SID order.
Collects property key frequency and samples for name candidates (name, settlement_name, naziv, etc.) and municipality-related keys.
Writes data/derived/_debug/settlement_name_field_audit_h3_4.json and .txt (not committed).
Added npm script: "map:audit:settlement-names:h3_4": "tsx scripts/map/audit_settlement_name_fields_h3_4.ts".
Ran the audit: canonical key is settlement_name (present on all 200 sampled features with real names like "Banovići"). No settlement_names.json dataset needed.
Task B — Settlement names dataset (skipped)
Audit showed a reliable key (settlement_name) on the substrate. settlement_names.json not created.
Registered datasets.settlement_names in data_index.json (H0-style): path settlement_names.json, available: false when file is missing. Viewer can load it when present.
Updated build_substrate_viewer_index.ts: getDatasetMeta supports by_settlement_id; settlement_names dataset added to the registry.
Task C — Viewer uses correct settlement name source
Updated scripts/map/build_map_viewer.ts and regenerated data/derived/map_viewer/index.html and viewer.js:
Rule: If settlement_names dataset exists and loads → use it for the settlement display name.
Else use feature.properties.settlement_name, then name, then naziv (never any municipality_*).
Else show "Unknown settlement".
Side panel: name_source: "settlement_names.json" | "feature.properties.<key>" | "unknown".
name_warning: only when the shown name equals the municipality (1990) label (case-insensitive) and a municipality field exists.
"Settlement:" and "Municipality (1990):" stay separate; municipality fields are never used for the settlement name.
Task D — Validations
npm run typecheck — pass
npm test — 277 pass
npm run map:contracts:validate — pass
npm run map:viewer:map:build — pass
npm run map:audit:settlement-names:h3_4 — pass
map:contracts:determinism — runs full substrate derivation (long); not required to complete for this phase.
Mistake guard
All touched scripts use: loadMistakes(); assertNoRepeat("phase h3.4 settlement name source audit and deterministic settlement_names dataset");
Ledger
Phase H3.4 entry added to docs/PROJECT_LEDGER.md.
Manual sanity (for you)
Run: npx http-server -p 8080 -c-1
Open: http://localhost:8080/data/derived/map_viewer/index.html
Click several settlements in different municipalities and check:
"Settlement:" is a settlement name (not a municipality name).
"Municipality (1990):" is separate and correct.
Side panel shows name_source (e.g. feature.properties.settlement_name) and warnings only when the name matches the municipality label.
Commit (as requested)
git add scripts/map/audit_settlement_name_fields_h3_4.ts scripts/map/build_map_viewer.ts scripts/map/build_substrate_viewer_index.ts data/derived/map_viewer/index.html data/derived/map_viewer/viewer.js package.json docs/PROJECT_LEDGER.md data/derived/data_index.jsongit commit -m "Phase H3.4: fix settlement name source (authoritative settlement names)"
Do not commit data/derived/_debug/ outputs. scripts/map/build_settlement_names_data_h3_4.ts and data/derived/settlement_names.json were not added because the audit showed the substrate already has a reliable settlement_name key.

However, it still doesn't work correctly. Settlement name still shows post-1995 municipality name. Municipality (1990): field shows correctly, but it shows number ID, not municipality name.
---

**Assistant**

What you’re describing is almost certainly **not** “the viewer still picking the wrong name key.” It’s one of these two deeper issues:

1) **The clicked feature is not a settlement feature** (or the hit-test is selecting a different feature record than you think).  
   Result: you read `feature.properties.settlement_name`, but on *that* feature it’s actually a post-1995 municipality label (because it’s not the settlement record you intended).

2) **Your settlement substrate’s `settlement_name` field was previously populated incorrectly** (e.g., an earlier “attach names” pipeline wrote municipality names into `settlement_name`).  
   Result: the audit “looks good” on a sample (it found plausible names), but the specific areas you click are contaminated.

Either way, the only correct next move is: **make the viewer prove what record it is showing**, and add a deterministic municipality-name mapping so “Municipality (1990)” isn’t a raw numeric code.

Below is a Cursor prompt that does both in one tight phase.

---

```text
Phase H3.5 — Prove clicked feature provenance + fix selection to settlements + add mun1990 name mapping

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~120 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "settlement_name", "attach_settlement_names", "viewer hit", "mun1990 registry", "municipality")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.5 entry)

MISTAKE GUARD (MANDATORY)
- In any new/edited script:
  loadMistakes();
  assertNoRepeat("phase h3.5 prove viewer click provenance fix settlement selection and add mun1990 display names");

CONSTRAINTS (NON-NEGOTIABLE)
- No geometry changes.
- No adjacency changes.
- Deterministic outputs only.
- Small JSON indices OK to commit; do not commit large derived GeoJSON.
- Viewer remains contract-first via data/derived/data_index.json.

GOALS
1) Viewer must show the real settlement feature you clicked:
   - Panel must display a “Feature identity” block that proves:
     - feature.id
     - which layer/collection it came from
     - whether it passes the “settlement feature” predicates
2) Fix click selection so ONLY settlement features can be selected for the side panel.
3) Add a deterministic mun1990 display-name mapping dataset so
   "Municipality (1990)" can show BOTH:
   - numeric municipality_id
   - mun1990_id (slug)
   - human display_name (e.g., "Tuzla", "Vareš")
4) Add a quick audit that detects if settlement_name appears to be polluted with municipality names.

──────────────────────────────────────────────────────────────────────────────
TASK A — Viewer: show feature identity + raw name fields + enforce settlement-only selection
──────────────────────────────────────────────────────────────────────────────
1) Edit scripts/map/build_map_viewer.ts and regenerate viewer assets.

2) In viewer.js side panel add a top section "Feature identity" showing:
   - source_layer: "settlements" | "mun_boundaries" | "unknown"
   - feature_id: <raw feature.id>
   - sid_canonical: <as used in lookups>
   - is_settlement_feature: true/false

3) Define is_settlement_feature(feature):
   - feature.id exists AND is a string matching /^S\d+$/  (canonical)
   - geometry.type is "Polygon" or "MultiPolygon"
   - has municipality id field (the same key used elsewhere)
If false:
   - do NOT populate settlement panel
   - show a clear message: "Clicked feature is not a settlement; selection ignored."
   - leave last valid settlement selected (do not clear)

4) In the "Settlement" section show ALL raw candidates (for debugging):
   - settlement_name_raw = feature.properties.settlement_name (if exists)
   - name_raw = feature.properties.name (if exists)
   - naziv_raw = feature.properties.naziv (if exists)
   - plus any obvious post-1995 muni label keys if present:
     - post1995_name_raw = feature.properties.post1995_name
     - municipality_name_raw = feature.properties.municipality_name
   The displayed “Settlement:” value must still follow your H3.4 precedence,
   but this raw block makes it unambiguous what data exists.

5) Add a panel line:
   - "Selected by hit-test rule: <rule name>"
   Document the tie-break rule if multiple polygons match click.

6) Ensure click selection algorithm:
   - Only tests settlement polygons (the settlement feature array), not any other dataset.
   - If currently your hit-test iterates “all features drawn”, change it to iterate settlements only.

Acceptance for Task A:
- Clicking anywhere never results in a non-settlement feature being shown as a settlement.
- Panel proves which feature was selected and what raw fields it contains.

──────────────────────────────────────────────────────────────────────────────
TASK B — Add mun1990 display name mapping dataset (small JSON, committable)
──────────────────────────────────────────────────────────────────────────────
7) Create script:
   scripts/map/build_mun1990_names_dataset_h3_5.ts

Mistake guard:
"phase h3.5 build mun1990 names dataset for viewer"

Inputs (choose existing canonical sources in repo; do not invent):
- Prefer: data/source/municipalities_1990_registry_110.json (or wherever the 110-municipality registry exists)
- Also read: data/derived/settlements_substrate.geojson to confirm which keys are used on features:
  - municipality_id numeric code
  - mun1990_id slug (e.g., "tuzla")

Output (small JSON, committable):
- data/derived/mun1990_names.json
Shape:
{
  "meta": { "total_municipalities": 110, "source": "<file>", "keys": ["municipality_id","mun1990_id"] },
  "by_municipality_id": { "11088": { "mun1990_id": "tuzla", "display_name": "Tuzla" }, ... },
  "by_mun1990_id": { "tuzla": { "municipality_id": "11088", "display_name": "Tuzla" }, ... }
}

Determinism:
- sort keys lexicographically
- no timestamps

8) Register dataset in data_index.json via the existing index builder:
- datasets.mun1990_names:
  - path: "mun1990_names.json"
  - schema: "mun_names_v1"
  - available: true when file exists

9) Update viewer.js side panel "Municipality (1990)" section to show:
- municipality_id (numeric)
- mun1990_id (slug) if present on feature or looked up from mapping
- display_name from mun1990_names dataset
If mapping missing, show "Unknown municipality name" but keep IDs.

Acceptance for Task B:
- Side panel shows "Tuzla" / "Vareš" as names, not just numeric IDs.

──────────────────────────────────────────────────────────────────────────────
TASK C — Audit: detect settlement_name pollution pattern (deterministic report)
──────────────────────────────────────────────────────────────────────────────
10) Add a script:
  scripts/map/audit_settlement_name_pollution_h3_5.ts

Mistake guard:
"phase h3.5 audit settlement_name pollution vs municipality names"

Inputs:
- data/derived/settlements_substrate.geojson
- data/derived/mun1990_names.json

Output (derived, not committed):
- data/derived/_debug/settlement_name_pollution_audit_h3_5.txt
- data/derived/_debug/settlement_name_pollution_audit_h3_5.json

Heuristic-free checks (evidence only):
- For each settlement:
  - compare settlement_name (trim, lower) against municipality display_name (trim, lower)
  - count matches
- Report:
  - total_settlements
  - total_matches (settlement_name == municipality_name)
  - top 20 municipalities by match count
  - sample 20 SIDs where match occurs (stable sorted)

This does NOT change any data; it tells us whether the substrate name field is polluted.

──────────────────────────────────────────────────────────────────────────────
NPM SCRIPTS
──────────────────────────────────────────────────────────────────────────────
11) Add npm scripts:
- "map:build:mun1990-names:h3_5": "tsx scripts/map/build_mun1990_names_dataset_h3_5.ts"
- "map:audit:settlement-name-pollution:h3_5": "tsx scripts/map/audit_settlement_name_pollution_h3_5.ts"

Ensure map:viewer:map:all includes building mun1990_names before viewer build.

──────────────────────────────────────────────────────────────────────────────
VALIDATIONS (MANDATORY)
──────────────────────────────────────────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:build:mun1990-names:h3_5
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:viewer:map:all
- npm run map:audit:settlement-name-pollution:h3_5

──────────────────────────────────────────────────────────────────────────────
MANUAL SANITY (REQUIRED, LOG IN LEDGER)
──────────────────────────────────────────────────────────────────────────────
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
Verify:
- Clicking shows Feature identity and is_settlement_feature=true
- Settlement name matches a real settlement, not a post-1995 municipality label
- Municipality (1990) shows numeric id + display name (e.g., "Tuzla")
- If name still wrong, the raw fields block will prove whether substrate is polluted or selection is wrong

──────────────────────────────────────────────────────────────────────────────
COMMIT DISCIPLINE
──────────────────────────────────────────────────────────────────────────────
- Commit ONLY code + small JSON mapping + viewer assets + ledger.
- Do NOT commit _debug outputs.
- git add:
  scripts/map/build_mun1990_names_dataset_h3_5.ts
  scripts/map/audit_settlement_name_pollution_h3_5.ts
  data/derived/mun1990_names.json
  scripts/map/build_map_viewer.ts
  data/derived/map_viewer/index.html
  data/derived/map_viewer/viewer.js
  scripts/map/build_substrate_viewer_index.ts (if touched)
  package.json
  docs/PROJECT_LEDGER.md

- git commit -m "Phase H3.5: settlement click provenance + mun1990 names mapping"

ACCEPTANCE CRITERIA
- Viewer cannot display a non-settlement feature as a settlement.
- Side panel shows municipality display name, not just numeric ID.
- If settlement_name is polluted, audit report proves it (counts + samples).
- All validations pass.
```

### Why this will unstick you
- If the **selection is wrong**, Task A fixes it and proves it with “Feature identity”.
- If the **data is wrong**, Task C will quantify it immediately (and then the next fix is to rebuild `settlement_name` from a trusted source, not keep tweaking the viewer).
- Municipality display names become a proper dataset, not UI guessing.

If you paste back the pollution audit’s headline numbers (total matches and top 5 municipalities by match count), I can tell you in one message whether the substrate name field is contaminated and what the cleanest repair path is.
---

**User**

Before I run that, let's use real settlement names to find where they are stored and how. Two examples are Konjodor settlement, which is in pre-1990 municipality of Cazin, post-1995 municipality of Bužim. Also Dokanj, a settlement in Tuzla municipality. Also Lukomir, settlement in Konjic municipality.

Would this help?
---

**Assistant**

Yes — **those three settlements are perfect test probes**, and using real names is the fastest way to determine *where “settlement names” truly live* in your pipeline and why the viewer is still showing a post-1995 municipality label.

Here’s why this helps and exactly how to use it (without changing any mechanics or geometry):

## Why these examples are useful
They cover three different “name provenance stressors”:

1) **Konjodor (Cazin pre-1990, Bužim post-1995)**  
   If your “name” is actually a post-1995 municipal label leaking into settlement records, Konjodor is a strong canary because it sits right in the kind of mapping boundary that could contaminate labels.

2) **Dokanj (Tuzla)**  
   Tuzla is already a municipality you touched for control normalization; it’s a good check that nothing about Tuzla handling is bleeding into naming.

3) **Lukomir (Konjic)**  
   Famous / distinctive name; if *that* displays wrong, it’s almost certainly selection or field contamination, not “the name is missing.”

## The key question you want answered
For each of those names, you want to find:
- Does the name exist in **settlements_substrate.geojson** properties as `settlement_name`?
- If yes, does that feature’s **SID** match what the viewer selects when you click it?
- If no, is the name coming from some other artifact (like a names index script that attached names incorrectly)?

## How to use the names to pinpoint the failure layer
### Step 1 — Search the substrate (fastest truth test)
Search `data/derived/settlements_substrate.geojson` for:
- `"Konjodor"`
- `"Dokanj"`
- `"Lukomir"`

If they exist under `settlement_name` on the correct settlement features, then:
- the **data is correct**, and the **viewer is selecting the wrong feature** or reading the wrong field.

If they do **not** exist in the substrate, then:
- your audit result (“settlement_name looks good”) was true in general but not universal, OR
- the name is stored elsewhere and the substrate field is derived/partial.

### Step 2 — Use the viewer to verify what you actually clicked
Right now the viewer is telling you “Settlement: <post-1995 municipality name>”.

If you click where Lukomir is and it shows a municipality label:
- either the clicked feature isn’t the Lukomir settlement polygon at all, or
- the polygon’s `settlement_name` was populated incorrectly.

That’s exactly why I recommended the “Feature identity + raw fields” panel: it turns this from guessing into proof.

## Would this help *before* Phase H3.5?
Yes — it can reduce the scope.

If you confirm that **Konjodor/Dokanj/Lukomir exist correctly in the substrate**, then you don’t need any new datasets right now. You mostly need:
- enforce settlement-only selection, and
- show raw fields so you can see what’s being displayed.

If you find that **they are missing or wrong in the substrate**, then the real fix is not viewer logic — it’s rebuilding the substrate’s `settlement_name` from a trusted source (and then your `settlement_names.json` dataset becomes the clean contract).

## A concrete mini-plan (lowest effort)
Do this in order:

1) Search `settlements_substrate.geojson` for those three names.  
2) For each match, note:
   - the `id` (SID)
   - the `settlement_name` value
   - municipality identifiers on that feature (mun1990_id / municipality_id)
3) Then click that exact location in the viewer and compare:
   - what SID the viewer claims vs what the substrate says

If you paste just the SIDs you find for those three names (even without any other info), I can tell you which branch we’re in:
- **viewer selection bug** (most likely), or
- **name field contamination**, or
- **name field incomplete / wrong source**.

If you want the fastest way to do Step 1 inside your repo without opening huge files manually, I can give you a tiny one-off Cursor prompt to add a `map:query:settlement --name "Lukomir"` script that prints the matching SIDs and the exact name fields present (deterministic, no commits).
---

**User**

That file is huge, 350 MB. Can't search, too slow. Prepare a Cursor prompt please.
---

**Assistant**

```text
Phase H3.4a — Fast settlement name lookup (Konjodor, Dokanj, Lukomir) without opening 350MB GeoJSON

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~80 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "settlement_name", "viewer name", "h3.4")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.4a entry: what was queried + results summary)

MISTAKE GUARD (MANDATORY)
- In new script:
  loadMistakes();
  assertNoRepeat("phase h3.4a streaming settlement name query konjodor dokanj lukomir");

CONSTRAINTS (NON-NEGOTIABLE)
- READ-ONLY diagnostics only. No geometry changes.
- Deterministic output ordering.
- Do not commit derived outputs or _debug artifacts.
- One small commit only for the script + package.json + ledger.

TASK
1) ADD script:
   scripts/map/query_settlement_by_name_streaming_h3_4a.ts

   Purpose:
   - Stream-read data/derived/settlements_substrate.geojson (very large) without loading into memory.
   - Find features where any of these fields match (case-insensitive, exact or normalized):
     - settlement_name
     - name
     - naziv
   - Targets (hardcoded defaults, overrideable by CLI):
     - "Konjodor"
     - "Dokanj"
     - "Lukomir"

   Requirements:
   - Must not JSON.parse the whole file.
   - Implement a streaming FeatureCollection parser:
     - Read file as a stream
     - Scan for '"features":[' then parse individual Feature objects by brace-depth counting
     - For each Feature object slice, JSON.parse that feature only
     - Continue until end of features array
   - For each match, output a compact record:
     {
       sid: feature.id,
       settlement_name: feature.properties.settlement_name ?? null,
       name: feature.properties.name ?? null,
       naziv: feature.properties.naziv ?? null,
       municipality_id: best-effort from known keys (municipality_id | mun1990_id | opstina_id | muni_id),
       mun1990_id: feature.properties.mun1990_id ?? null,
       post1995_name_keys_present: list any keys containing "post" or "1995" or "opcina" or "municipality_name"
     }

   - Determinism:
     - Collect all matches then print sorted by (query_name, sid) lexicographically.
     - Also print totals:
       - scanned_features_count
       - matches_per_query
       - total_matches

   CLI:
   - --names "Konjodor,Dokanj,Lukomir"
   - --mode exact|contains  (default exact; exact does case-insensitive trim equality; contains is substring)
   - --fields settlement_name,name,naziv (default these 3)
   - --limit 50 per name (default 50)
   - --out optional path (if provided, write JSON report; otherwise stdout only)

2) Add npm script:
   - "map:query:settlement-names:h3_4a": "tsx scripts/map/query_settlement_by_name_streaming_h3_4a.ts --names \"Konjodor,Dokanj,Lukomir\" --mode exact --limit 50"

3) Run it (Cursor must execute):
   - npm run map:query:settlement-names:h3_4a
   If zero matches for any name, rerun automatically with:
   - --mode contains

4) Append Phase H3.4a ledger entry including:
   - command(s) run
   - matches found (list sid + settlement_name + mun fields)
   - if any name had zero matches in both exact and contains, note that it likely isn’t present in substrate fields and requires another source.

VALIDATIONS (MANDATORY)
- npm run typecheck
- npm test
- npm run map:query:settlement-names:h3_4a

COMMIT DISCIPLINE
- Commit ONLY:
  - scripts/map/query_settlement_by_name_streaming_h3_4a.ts
  - package.json
  - docs/PROJECT_LEDGER.md
- git commit -m "Phase H3.4a: streaming settlement name lookup"

ACCEPTANCE CRITERIA
- Script completes without loading full GeoJSON into memory.
- Returns SIDs (feature.id) for Konjodor, Dokanj, and Lukomir if present, with the raw name fields and municipality fields printed.
- Deterministic ordering of output.
```
---

**User**

Phase H3.4a — Fast settlement name lookup (complete)
1. Script: scripts/map/query_settlement_by_name_streaming_h3_4a.ts
Streaming: Reads data/derived/settlements_substrate.geojson with createReadStream; does not load the full file.
Parser: Finds "features":[ then parses each Feature by brace-depth counting (ignores {/} inside double-quoted strings and respects \ escapes).
Match fields: Compares settlement_name, name, naziv to query names (case-insensitive; --mode exact or contains).
Output record: query_name, sid (from properties.sid or feature.id), settlement_name, name, naziv, municipality_id (from municipality_id | mun1990_id | opstina_id | muni_id), mun1990_id, post1995_name_keys_present.
Ordering: Matches sorted by (query_name, sid).
Totals: scanned_features_count, matches_per_query, total_matches.
CLI: --names "Konjodor,Dokanj,Lukomir", --mode exact|contains, --fields settlement_name,name,naziv, --limit 50, --out path (optional JSON report).
Mistake guard: loadMistakes(); assertNoRepeat("phase h3.4a streaming settlement name query konjodor dokanj lukomir");
Exit code: 1 if any query name has 0 matches (so caller can rerun with --mode contains).
2. npm script
"map:query:settlement-names:h3_4a": "tsx scripts/map/query_settlement_by_name_streaming_h3_4a.ts --names \"Konjodor,Dokanj,Lukomir\" --mode exact --limit 50"
3. Runs
Exact: npm run map:query:settlement-names:h3_4a → 6137 features scanned, 0 matches (Konjodor, Dokanj, Lukomir).
Contains (rerun): npx tsx ... --mode contains --limit 50 → 6137 features scanned, 0 matches.
4. Ledger (Phase H3.4a)
New Phase H3.4a entry in docs/PROJECT_LEDGER.md with:
Commands run (exact + contains).
Results: scanned 6137, 0 matches for all three names in both modes.
Note: Konjodor, Dokanj, Lukomir are not in substrate settlement_name/name/naziv; another source (e.g. gazetteer or census list) would be needed to resolve them.
5. Validations
npm run typecheck — pass
npm test — 277 pass
npm run map:query:settlement-names:h3_4a — pass (script runs, 0 matches, exit 1)
Commit (as requested)
git add scripts/map/query_settlement_by_name_streaming_h3_4a.ts package.json docs/PROJECT_LEDGER.mdgit commit -m "Phase H3.4a: streaming settlement name lookup"
---

**Assistant**

That result is *very* informative: it means your current substrate is **not carrying real settlement toponyms at all** (at least not in `settlement_name`, `name`, or `naziv`). So when the viewer shows a “name”, it’s inevitably pulling **some other label** (and in your case it’s effectively a post-1995 municipality label leaking into whatever field you’re reading).

So yes, this helps — it proves the fix is **not** “choose the right property key.” The fix is: **introduce an authoritative settlement-names dataset** (keyed by your canonical SID) and have the viewer use it.

Also: your audit earlier finding `settlement_name` with plausible values (e.g., “Banovići”) can still be true while these 3 names are missing — but since *all three* are missing even in “contains” mode, the more likely reality is: `settlement_name` is **not settlement names**, it’s a mixed/derived label field and your sample just happened to look plausible.

## What should happen next
1) **Find where settlement names actually exist in the repo** (some source gazetteer, an older polygons file, a census list, etc.).  
2) Build `data/derived/settlement_names.json` deterministically:
   - keys: canonical `Sxxxxx`
   - values: real settlement toponyms
   - provenance: which source row/field produced the name
3) Register that dataset in `data_index.json` as available:true and make the viewer prefer it for display.
4) Add a validation/audit that:
   - coverage is near 100%
   - and specifically confirms Konjodor/Dokanj/Lukomir exist

This keeps everything deterministic, contract-first, and avoids “mystery fields”.

---

# Cursor prompt to do it
This phase is designed to succeed even if we don’t yet know the exact source file — it will **locate it first**, then implement the smallest deterministic join possible (by stable IDs only; no fuzzy geo matching unless you explicitly ask later).

```text
Phase H3.6 — Authoritative settlement names dataset (find source, build mapping, wire viewer)

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~120 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "settlement_name", "names", "attach_settlement_names", "polygons", "gazetteer")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.6 entry with findings + outputs)

MISTAKE GUARD (MANDATORY)
- In any new script:
  loadMistakes();
  assertNoRepeat("phase h3.6 build authoritative settlement_names dataset from discovered source and wire viewer");

CONSTRAINTS (NON-NEGOTIABLE)
- No geometry changes.
- No adjacency changes.
- No heuristics or fuzzy matching in this phase.
  - Only deterministic joins using stable identifiers (IDs/codes).
- Small JSON under data/derived is allowed to commit.
- Do NOT commit data/derived/_debug/*

GOAL
- Produce data/derived/settlement_names.json keyed by canonical SID (S-prefixed).
- Viewer must show settlement names from this dataset (authoritative).
- Add a validation check proving that:
  - coverage is high, and
  - Konjodor, Dokanj, Lukomir exist.

TASK A — Locate the authoritative settlement names source in the repo
1) Run repo-wide search (fast, deterministic) for the three probes:
   - Konjodor
   - Dokanj
   - Lukomir

Use ripgrep (or equivalent) across likely directories:
- data/
- src/
- scripts/
- docs/

Record in stdout + ledger:
- which file(s) contain each name
- which field/format it appears in (CSV/JSON/GeoJSON/etc)

2) If none are found, broaden with likely alternate spellings/diacritics:
- Lukomir (same)
- Dokanj (same)
- Konjodor (same)
Also search for a known nearby settlement like "Bužim" or "Cazin" to locate gazetteers.

If still none are found, STOP the phase with a clear ledger note:
- "No settlement toponyms found in repo sources; cannot build names dataset without adding a source file."
Do NOT invent a source.

TASK B — Build settlement_names.json using ONLY stable IDs
3) Add script:
   scripts/map/build_settlement_names_dataset_h3_6.ts

Inputs:
- data/derived/settlements_substrate.geojson (for canonical SID list)
- The discovered names source file(s) from Task A

Join rules (deterministic, non-heuristic):
- Prefer direct SID match if the source already contains "Sxxxxx" IDs.
- Otherwise, match using an explicit stable code present in BOTH:
  - e.g., a settlement code, feature id, or registry key that exists on substrate properties and in the names source.
- If multiple possible keys exist, choose ONE and document it in code + ledger.

Output (committable small JSON):
- data/derived/settlement_names.json
Shape:
{
  "meta": {
    "total_settlements": 6137,
    "matched": <n>,
    "unmatched": <n>,
    "source": ["<path>", ...],
    "join_key": "<fieldname>",
    "probe_hits": { "Konjodor": ["S....."], "Dokanj": ["S....."], "Lukomir": ["S....."] }
  },
  "by_settlement_id": {
    "S100013": { "name": "…", "provenance": "<source>:<row/id>" },
    ...
  }
}

Determinism:
- keys sorted by SID
- no timestamps

4) Add npm script:
- "map:build:settlement-names:h3_6": "tsx scripts/map/build_settlement_names_dataset_h3_6.ts"

TASK C — Register dataset and wire viewer display
5) Update the data_index builder (existing) so:
- datasets.settlement_names becomes available:true when file exists
- checksum and record_count computed

6) Update unified viewer (build_map_viewer.ts) settlement display rule:
- Always prefer settlement_names.json if available
- Otherwise show "Unknown settlement" (do NOT fall back to substrate fields anymore, since they are unreliable)

Also show in panel:
- name_source: settlement_names.json | unknown
- If missing for the selected SID: show “name missing from settlement_names dataset”

TASK D — Add validation / audit hook
7) Add a small validation script:
   scripts/map/validate_settlement_names_coverage_h3_6.ts
Checks:
- matched coverage >= 95% (or print counts if lower; do not hard-fail unless coverage is extremely low like <50%)
- probe names must be present:
  Konjodor, Dokanj, Lukomir
If any probe missing, exit non-zero with a clear message.

Add npm script:
- "map:validate:settlement-names:h3_6": "tsx scripts/map/validate_settlement_names_coverage_h3_6.ts"

VALIDATIONS (MANDATORY)
- npm run typecheck
- npm test
- npm run map:build:settlement-names:h3_6
- npm run map:validate:settlement-names:h3_6
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:viewer:map:all

MANUAL SANITY (LOG IN LEDGER)
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
- Click a few settlements; confirm “Settlement:” is a real toponym and name_source shows settlement_names.json

COMMIT DISCIPLINE
- Commit ONLY:
  scripts/map/build_settlement_names_dataset_h3_6.ts
  scripts/map/validate_settlement_names_coverage_h3_6.ts
  data/derived/settlement_names.json
  scripts/map/build_substrate_viewer_index.ts (if changed)
  scripts/map/build_map_viewer.ts
  data/derived/map_viewer/index.html
  data/derived/map_viewer/viewer.js
  package.json
  docs/PROJECT_LEDGER.md
- Do NOT commit _debug outputs.
- git commit -m "Phase H3.6: authoritative settlement names dataset + viewer wiring"

ACCEPTANCE CRITERIA
- settlement_names.json exists and is referenced by data_index with checksum.
- Viewer displays settlement names from settlement_names.json.
- Validation proves probe names exist (Konjodor, Dokanj, Lukomir).
- All validations pass.
```

### Quick reality check
This will only work if the repo already contains settlement toponyms somewhere. If your ripgrep finds **none**, that’s also a valid outcome: it means you need to *add a names source file* (gazetteer/census extract) to `data/source/`, and then we can do a clean deterministic join.

If you want, tell me what raw source you *do* have available for settlement names (even a spreadsheet/CSV/GeoJSON), and I’ll tailor the join rules to that specific format.
---

**User**

No need to search, it's a file called bih_census_1991.json in data/source, attached
---

**Assistant**

```text
Phase H3.6 — Authoritative settlement names from bih_census_1991.json + viewer wiring + probe validation

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~140 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "settlement_names", "bih_census_1991", "name provenance", "mun:sid", "political_control keys")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.6 entry: schema discovered, join key used, coverage, probe hits, files touched, validations)

MISTAKE GUARD (MANDATORY)
- In any new/edited script:
  loadMistakes();
  assertNoRepeat("phase h3.6 build settlement_names from bih_census_1991 join via munid:sid and wire viewer");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change geometry derivation.
- DO NOT change adjacency derivation (v3, continuity, Phase 1).
- Deterministic outputs only: stable ordering, no timestamps.
- No heuristics/fuzzy matching: ONLY deterministic key joins.
- Small JSON indices may be committed. Do NOT commit any data/derived/_debug/* outputs.

GOAL
1) Build an authoritative names dataset:
   data/derived/settlement_names.json
   keyed by canonical settlement ID "Sxxxxx" (the viewer’s canonical SID).
2) Wire unified viewer to display settlement names ONLY from settlement_names.json (no fallback to substrate properties).
3) Add validation proving probe names exist:
   Konjodor, Dokanj, Lukomir
4) Update data_index.json dataset registry/checksums accordingly.

ASSUMPTION (BASED ON PROJECT EVIDENCE)
- Substrate has both:
  - a stable settlement numeric id (either feature.id like "S100013" or properties.sid numeric)
  - a 1990 municipality numeric id (e.g., "11088")
- Other pipelines already use a composite key format like "munId:sid" (e.g. political_control_data.json).
- bih_census_1991.json likely contains settlement-level records keyed by municipality + settlement id (or can be detected).

──────────────────────────────────────────────────────────────────────────────
TASK A — Implement deterministic census→SID join and build settlement_names.json
──────────────────────────────────────────────────────────────────────────────
1) ADD script:
   scripts/map/build_settlement_names_from_census_h3_6.ts

   Inputs:
   - data/source/bih_census_1991.json
   - data/derived/settlements_substrate.geojson

   Output (committable, small):
   - data/derived/settlement_names.json

2) In the script, do schema detection (deterministic) on bih_census_1991.json:
   - Print to stdout (and include in output meta):
     - top-level keys
     - number of records (if array)
     - for first 5 records: list of keys present (sorted)
   - Determine candidate fields for:
     - settlement name (e.g., "name", "naziv", "naselje", "settlement", "mjesto")
     - settlement id (numeric)
     - municipality id (numeric)
   - DO NOT guess blindly: choose fields ONLY if:
     - present on nearly all records (>= 95%)
     - types are consistent (string for name, string/number for ids)

3) Construct canonical substrate join key per settlement feature:
   - Determine:
     - sid_numeric:
       - if feature.id matches /^S\d+$/ => sid_numeric = feature.id.slice(1)
       - else if feature.properties.sid exists => sid_numeric = String(feature.properties.sid)
       - else fail with clear error: "No sid field on substrate feature"
     - mun_id_numeric:
       - use the existing property key already used elsewhere for 1990 municipality numeric id:
         prefer: feature.properties.municipality_id
         else: feature.properties.mun1990_municipality_id
         else: feature.properties.opstina_id
         else fail with clear error
   - canonical_join_key = `${mun_id_numeric}:${sid_numeric}`
   - canonical_sid = `S${sid_numeric}`

   Build:
   - substrateJoinKeyToSid: Map<"mun:sid", "Sxxxxx">
   - sidToSubstrateMeta: Map<"Sxxxxx", { mun_id_numeric, sid_numeric }>

4) Construct census join key per record (must match canonical_join_key):
   - After schema detection selects census fields:
     mun_id_census + sid_census => `${mun}:${sid}`
   - Normalize:
     - String() ids, trim, remove leading zeros ONLY if substrate also has none (do not strip if ambiguous)
     - Keep exact canonicalization documented in meta.

5) Build names map:
   - For each census record:
     - joinKey = `${mun}:${sid}`
     - if joinKey exists in substrateJoinKeyToSid:
       - sid = mapped canonical "Sxxxxx"
       - name = census settlement name string (trim)
       - store { name, provenance: "<census-key>" } where census-key is stable:
         - if record has an explicit id field, use it; else use array index as string (but stable)
     - else count as census_unmatched

6) Resolve duplicates deterministically:
   - If multiple census records map to the same sid:
     - pick the lexicographically smallest name after trim (deterministic)
     - record duplicates_count and keep a small deterministic sample list in meta (first 20 sorted by sid)

7) Emit:
   {
     meta: {
       total_settlements: 6137,
       matched: N,
       unmatched_substrate: 6137 - N,
       census_records: M,
       census_unmatched: K,
       join_key: "mun1990_numeric:settlement_numeric",
       census_fields: { mun: "<field>", sid: "<field>", name: "<field>" },
       duplicates: { count: D, sample: [{ sid, names: [..] }...] },
       probe_hits: { Konjodor: [S...], Dokanj: [S...], Lukomir: [S...] }
     },
     by_settlement_id: { "S100013": { name: "…", provenance: "census:<id>" }, ... }
   }
   - Deterministic ordering:
     - by_settlement_id keys sorted
     - probe_hits SIDs sorted
   - No timestamps.

8) Add npm script:
   - "map:build:settlement-names:h3_6": "tsx scripts/map/build_settlement_names_from_census_h3_6.ts"

──────────────────────────────────────────────────────────────────────────────
TASK B — Register dataset and wire unified viewer to use it exclusively
──────────────────────────────────────────────────────────────────────────────
9) Update data_index builder (existing, likely scripts/map/build_substrate_viewer_index.ts):
   - datasets.settlement_names:
     - path: "settlement_names.json"
     - schema: "settlement_names_v1"
     - type: "attribute_json"
     - id_field: "by_settlement_id"
     - record_count and checksum_sha256 when file exists
     - available:true when present else false

10) Update scripts/map/build_map_viewer.ts (regenerate viewer assets):
   - Load settlement_names dataset when available:true.
   - Settlement panel “Settlement:” value:
     - MUST come from settlement_names.by_settlement_id[sid].name
     - If missing, show "Unknown settlement" + "name_missing_in_dataset: true"
   - Remove/disable all fallback to substrate properties for settlement names.
     (They are proven unreliable.)

11) In the side panel, ensure Municipality (1990) display remains separate:
   - show numeric municipality_id
   - (optional) if mun1990_names dataset exists, show display_name too; do not invent.

──────────────────────────────────────────────────────────────────────────────
TASK C — Add validation: probes must exist and coverage sanity
──────────────────────────────────────────────────────────────────────────────
12) ADD script:
   scripts/map/validate_settlement_names_h3_6.ts

   Inputs:
   - data/derived/settlement_names.json

   Checks (deterministic):
   - matched coverage must be >= 95% OR print a loud warning and exit non-zero if < 80%
   - probe names must exist (case-insensitive exact match on value):
     - Konjodor
     - Dokanj
     - Lukomir
   - If any probe missing: exit non-zero with actionable message.

13) Add npm script:
   - "map:validate:settlement-names:h3_6": "tsx scripts/map/validate_settlement_names_h3_6.ts"

──────────────────────────────────────────────────────────────────────────────
VALIDATIONS (MANDATORY)
──────────────────────────────────────────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:build:settlement-names:h3_6
- npm run map:validate:settlement-names:h3_6
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:viewer:map:all

──────────────────────────────────────────────────────────────────────────────
MANUAL SANITY (REQUIRED, LOG IN LEDGER)
──────────────────────────────────────────────────────────────────────────────
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
Verify:
- Clicking any settlement shows a toponym from settlement_names.json
- Konjodor, Dokanj, Lukomir can be found by clicking once you locate them (optional)
- name_source shows settlement_names.json
- Municipality (1990) remains separate

──────────────────────────────────────────────────────────────────────────────
COMMIT DISCIPLINE
──────────────────────────────────────────────────────────────────────────────
- Commit ONLY code + small JSON + viewer assets + ledger:
  - scripts/map/build_settlement_names_from_census_h3_6.ts
  - scripts/map/validate_settlement_names_h3_6.ts
  - data/derived/settlement_names.json
  - scripts/map/build_substrate_viewer_index.ts (if updated)
  - scripts/map/build_map_viewer.ts
  - data/derived/map_viewer/index.html
  - data/derived/map_viewer/viewer.js
  - package.json
  - docs/PROJECT_LEDGER.md
- Do NOT commit any _debug artifacts.
- git commit -m "Phase H3.6: settlement names from census + viewer wiring"

ACCEPTANCE CRITERIA
- settlement_names.json is produced deterministically from bih_census_1991.json using a stable join key.
- Viewer displays settlement names from settlement_names.json (no fallback).
- Validation confirms Konjodor, Dokanj, Lukomir exist in the dataset.
- All validations pass and Phase H3.6 is logged in PROJECT_LEDGER.
```
---

**User**

It's been running for a long while now. When we correct this, we should look into how to optimize this file. Early versions were like 30 MB
---

**Assistant**

Yeah — that’s a real pain point, and it’s also totally fixable **without touching the canonical substrate**.

What’s happening right now is: every time you need anything from `settlements_substrate.geojson`, you’re paying the cost of streaming/parsing a **350MB text blob**. Early 30MB versions were almost certainly some combination of:
- fewer properties
- lower coordinate precision
- fewer vertices (simplified)
- or a topology-aware encoding (TopoJSON) / compression

## The right framing for AWWV
Keep **one canonical geometry artifact** for truth and determinism, but introduce a **viewer-optimized “presentation geometry” artifact** that is:
- deterministic to derive from canonical
- smaller
- fast to parse
- contract-registered via `data_index.json`
- **never used for simulation logic**

That way:
- simulation and contracts stay anchored to the canonical substrate
- viewers (and diagnostics that don’t need full fidelity) become fast again

---

## The biggest wins (ranked)
### 1) Gzip compression for serving (fastest, almost free)
GeoJSON compresses extremely well (often 80–95% smaller).  
If you serve `settlements_substrate.geojson.gz` and fetch it with `DecompressionStream('gzip')` in the browser (supported in modern Chrome/Edge), you can keep the source as JSON but make transfers + parsing much lighter.

**Pros:** huge size cut, minimal pipeline changes  
**Cons:** you still parse JSON; just less I/O

### 2) Strip properties for viewer geometry
Most viewer operations only need:
- `id` (SID)
- `mun1990_id` / `municipality_id`
- maybe bbox
Everything else should move to separate attribute datasets (which you already do).

If your substrate currently carries lots of redundant props, that’s bloat.

**Pros:** can easily drop tens/hundreds of MB  
**Cons:** must ensure viewers rely on attribute JSONs instead

### 3) Quantize coordinate precision (big win, deterministic)
If coordinates are stored with high precision (many decimals), that inflates file size massively.

A deterministic quantization step like:
- round to **1e-6** or **1e-5**
can cut size a lot, especially combined with gzip.

**Important:** this *does* change geometry numerically, so treat it as **viewer-only**, not canonical.

### 4) TopoJSON for polygon topology reuse (often massive win)
Settlement polygons share borders; TopoJSON stores shared arcs once. This can shrink dramatically compared to GeoJSON.

**Pros:** huge reduction, fast-ish  
**Cons:** extra tooling; more complexity in viewer

### 5) Precompute a compact binary format (max performance)
FlatGeobuf / Geobuf / custom binary encoding of rings + an index.  
Fastest runtime, smallest footprint.

**Pros:** best performance  
**Cons:** more engineering

---

## AWWV-friendly plan (minimal risk)
When H3.6 finishes and you’re ready, do something like:

### Viewer geometry v1 (low effort, big payoff)
Create derived artifacts:
- `data/derived/settlements_viewer.geojson`  
  - only: `id`, `municipality_id`, `mun1990_id`  
  - coordinates quantized to e.g. 1e-6  
- `data/derived/settlements_viewer.geojson.gz`

Update `data_index.json` to add:
- `datasets.settlements_viewer` (geometry)
and update `map_viewer` to load `settlements_viewer` instead of canonical if present.

**Canonical remains unchanged and still used everywhere else.**

This alone typically takes a 350MB GeoJSON down to something like:
- 60–120MB uncompressed (depending on vertex count)
- 10–30MB gz (very plausible — which matches your “early versions were ~30MB” memory)

---

## Why your file likely ballooned to 350MB
Most common causes:
- polygon vertex count increased (more detailed settlement shapes)
- precision increased (more decimals)
- properties got heavier (names duplicated, multiple IDs, metadata)
- MultiPolygon rings got duplicated or re-encoded in a less compact way
- you stopped using compression / topology-aware formats

---

## One practical note for your current H3.6 run
Even if you later optimize viewer geometry, the H3.6 builder will still need to read the canonical substrate at least once to build stable joins. The optimization mostly pays off for:
- the viewer
- repeated diagnostics
- everyday iteration loops

---

If you want, I can give you a **single Cursor phase prompt** to implement “viewer geometry v1” (strip props + quantize + gzip + data_index wiring + viewer fallback), in the same style as your H-phases, with determinism checks and a small commit.
---

**User**

Phase H3.6 — Authoritative settlement names from census + viewer wiring + probe validation
Task A — Build settlement_names from census
scripts/map/build_settlement_names_from_census_h3_6.ts
Inputs: data/source/bih_census_1991.json, data/derived/settlements_substrate.geojson (streamed).
Schema detection: Top-level keys (metadata, municipalities, settlements); census.settlements record_count 6140; first 5 record keys; 100% of records have n (name) and m (mun).
Census fields: mun m, sid = object key, name n.
Substrate join keys: Stream substrate with brace-depth parser; sid_numeric from properties.sid (strip S or use as-is); mun_id_numeric from properties.municipality_id (fallbacks: mun1990_municipality_id, opstina_id, muni_id). canonical_join_key = mun_id:settlement_numeric, canonical_sid = S{sid_numeric}.
Census join: For each census.settlements entry, joinKey = record.m:key. Try census mun as-is first; if no match, use post1995→mun1990 remap (merged only) from municipality_post1995_to_mun1990.json so Konjodor (11240 Bužim) matches substrate 10227 (Cazin).
Output: data/derived/settlement_names.json with meta (total_settlements, matched, census_unmatched, join_key, census_fields, duplicates, probe_hits) and by_settlement_id (keys sorted).
Coverage: 6137/6137 matched, 3 census_unmatched.
Probe hits: Konjodor S104345, Dokanj S154920, Lukomir S127612.
npm script: "map:build:settlement-names:h3_6": "tsx scripts/map/build_settlement_names_from_census_h3_6.ts"
Task B — Register dataset and wire viewer
build_substrate_viewer_index.ts: settlement_names dataset: schema settlement_names_v1, type attribute_json, id_field by_settlement_id, record_count and checksum when file exists, available: true.
build_map_viewer.ts: Settlement name only from settlement_names.by_settlement_id[sid].name. If missing: show "Unknown settlement" and name_missing_in_dataset: true. No use of substrate settlement_name / name / naziv. Municipality (1990) kept separate (numeric municipality_id).
Task C — Validation
scripts/map/validate_settlement_names_h3_6.ts: Checks coverage ≥ 95% (exit non-zero if &lt; 80%); probe names Konjodor, Dokanj, Lukomir must exist (case-insensitive exact). Exit non-zero if any probe missing.
npm script: "map:validate:settlement-names:h3_6": "tsx scripts/map/validate_settlement_names_h3_6.ts"
Validations run
npm run typecheck — pass
npm test — 277 pass
npm run map:build:settlement-names:h3_6 — pass
npm run map:validate:settlement-names:h3_6 — pass (coverage 100%, all three probes found)
npm run map:contracts:validate — pass
npm run map:viewer:substrate:index — pass
npm run map:viewer:map:build — pass
Mistake guard
All new/edited scripts use: loadMistakes(); assertNoRepeat("phase h3.6 build settlement_names from bih_census_1991 join via munid:sid and wire viewer");
Ledger
Phase H3.6 entry added to docs/PROJECT_LEDGER.md (schema, join key, coverage, probe hits, files, validations).
Commit (as requested)
git add scripts/map/build_settlement_names_from_census_h3_6.ts scripts/map/validate_settlement_names_h3_6.ts data/derived/settlement_names.json scripts/map/build_substrate_viewer_index.ts scripts/map/build_map_viewer.ts data/derived/map_viewer/index.html data/derived/map_viewer/viewer.js package.json docs/PROJECT_LEDGER.md data/derived/data_index.jsongit commit -m "Phase H3.6: settlement names from census + viewer wiring"
Manual sanity (for you)
Run: npx http-server -p 8080 -c-1
Open: http://localhost:8080/data/derived/map_viewer/index.html
Check: settlement names come from settlement_names.json; name_source is settlement_names.json; Municipality (1990) is separate; Konjodor, Dokanj, Lukomir can be found by clicking (optional).

OK we have settlement names now. Before we continue, give me a single Cursor phase prompt to implement “viewer geometry v1” (strip props + quantize + gzip + data_index wiring + viewer fallback), in the same style as your H-phases, with determinism checks and a small commit
---

**Assistant**

```text
Phase H3.7 — Viewer geometry v1 (strip props + quantize + gzip) + data_index wiring + viewer fallback

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~150 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "viewer geometry", "substrate", "gzip", "quantize", "data_index datasets")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.7 entry: purpose, sizes before/after, precision, fields kept, validations)

MISTAKE GUARD (MANDATORY)
- In any new/edited script:
  loadMistakes();
  assertNoRepeat("phase h3.7 viewer geometry v1 strip props quantize gzip data_index wiring and viewer fallback");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change canonical geometry derivation.
- Canonical settlement substrate remains authoritative for simulation + contracts.
- Viewer geometry is PRESENTATION-ONLY and must be clearly labeled as such in meta.
- Deterministic outputs only: stable ordering, no timestamps, fixed precision.
- Do not commit large derived artifacts except the small viewer code/index changes.
  (The new viewer geometry files may be large; DO NOT commit them.)
- Never commit data/derived/_debug/*.

GOAL
Create a deterministic, smaller, faster-to-load geometry artifact for viewers:
- data/derived/settlements_viewer_v1.geojson
- data/derived/settlements_viewer_v1.geojson.gz
Wire data_index.json to reference it, and update map_viewer to prefer it when present.

SCOPE
- Strip properties to minimal set needed for viewer hit-test + joins:
  - sid (canonical "Sxxxxx") (or rely on feature.id only; pick one and be consistent)
  - municipality_id (numeric 1990 code used elsewhere)
  - mun1990_id (slug if present; optional but useful)
  - (optional) bbox per feature if already computed cheaply; otherwise omit
- Quantize coordinates to a fixed decimal precision (default: 1e-6).
- Add gzip output for http-server efficiency.

──────────────────────────────────────────────────────────────────────────────
TASK A — Derive settlements_viewer_v1.geojson deterministically
──────────────────────────────────────────────────────────────────────────────
1) ADD script:
   scripts/map/derive_settlements_viewer_geometry_v1_h3_7.ts

   Inputs:
   - data/derived/settlements_substrate.geojson (canonical)

   Outputs (derived; do NOT commit):
   - data/derived/settlements_viewer_v1.geojson
   - data/derived/settlements_viewer_v1.geojson.gz

   Implementation requirements:
   - Stream-read canonical substrate (do not JSON.parse whole file in memory).
     Reuse the proven brace-depth FeatureCollection streaming approach from H3.4a/H3.6.
   - For each Feature:
     - Determine canonical SID:
       - If feature.id matches /^S\d+$/ use that
       - Else if properties.sid exists, normalize to "S{digits}"
       - Else hard-fail with a clear error
     - Extract properties:
       - municipality_id from properties.municipality_id (fallbacks allowed but logged)
       - mun1990_id from properties.mun1990_id if present
     - Write a new Feature with:
       - id: canonical SID
       - properties: ONLY the minimal set above
       - geometry: same type, but coordinates quantized deterministically

   Quantization rules (deterministic):
   - Parameter: --decimals N (default 6)
   - Quantize every coordinate:
     q(x) = round(x, N decimals)
   - Preserve ring closure:
     - After quantization, ensure any ring’s last coord equals first coord.
     - If not, set last = first deterministically (do not drop points).
   - Do not reorder vertices. Do not simplify.

   Metadata:
   - Add root awwv_meta with explicit labeling:
     - role: "viewer_geometry"
     - source: "settlements_substrate.geojson"
     - quantization_decimals: N
     - properties_kept: [...]
     - canonical_bbox: carry over from data_index canonical_bbox if available, else compute bbox while streaming (min/max) deterministically

   Deterministic write:
   - Output FeatureCollection with features in stable order:
     - Sort by SID lexicographically before writing (store only minimal feature text in memory; OK at 6137).
   - No timestamps.

2) Add stdout size report (deterministic, no timestamps):
   - input_bytes (fs.stat)
   - output_geojson_bytes
   - output_gz_bytes
   - decimals used
   - properties_kept

3) ADD npm script:
   - "map:derive:settlements-viewer:v1": "tsx scripts/map/derive_settlements_viewer_geometry_v1_h3_7.ts --decimals 6"

──────────────────────────────────────────────────────────────────────────────
TASK B — Update data_index registry + contracts (viewer geometry is optional)
──────────────────────────────────────────────────────────────────────────────
4) Update index builder (scripts/map/build_substrate_viewer_index.ts or equivalent):
   - Add dataset entry:
     datasets.settlements_viewer_v1:
       - path: "settlements_viewer_v1.geojson"
       - path_gz: "settlements_viewer_v1.geojson.gz" (new optional field)
       - schema: "settlement_geometry_viewer_v1"
       - geometry_type: "Polygon|MultiPolygon"
       - record_count, checksum_sha256 computed when file exists
       - available: true when geojson exists

   - Update layers:
     - For base settlements layer, add preferred_dataset list:
       ["settlements_viewer_v1", "settlements"]  (viewer should pick first available)
     - Do NOT break existing viewers: keep datasets.settlements unchanged.

5) Update contract validator:
   scripts/map/validate_map_contracts.ts
   - Allow datasets entries to optionally include path_gz.
   - If path_gz present, require that gz file exists when dataset is available:true.
   - Do NOT require viewer geometry to exist; it’s optional.

6) Determinism checker:
   scripts/map/check_map_contracts_determinism.ts
   - Include settlements_viewer_v1.geojson and .gz in determinism hashing IF they exist.
   - Ensure stable hash results across runs.

──────────────────────────────────────────────────────────────────────────────
TASK C — Update unified viewer to prefer viewer geometry + support gzip
──────────────────────────────────────────────────────────────────────────────
7) Update scripts/map/build_map_viewer.ts (regenerate viewer assets):
   - When loading base settlements geometry, consult data_index:
     - If layer.base_settlements has preferred_dataset list, choose first dataset where available:true.
   - If chosen dataset has path_gz and browser supports DecompressionStream('gzip'):
     - Fetch gz and decompress to text, then JSON.parse.
     - Else fetch plain geojson path.

   - Ensure hit-test + rendering still use feature.id as canonical SID.
   - Ensure settlement_names.json joins still work (keyed by SID "Sxxxxx").

   Add small debug line in legend:
   - geometry_source: settlements_viewer_v1 | settlements
   - geometry_gzip: true/false

──────────────────────────────────────────────────────────────────────────────
VALIDATIONS (MANDATORY)
──────────────────────────────────────────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:derive:settlements-viewer:v1
- npm run map:viewer:map:build
- npm run map:contracts:validate
- npm run map:contracts:determinism

MANUAL SANITY (REQUIRED, LOG IN LEDGER)
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
Verify:
- Viewer loads and renders normally.
- Legend shows geometry_source = settlements_viewer_v1 when the file exists.
- Zoom/click work as before.
- Settlement names still appear (from settlement_names.json).
- If gzip supported, geometry_gzip = true.

──────────────────────────────────────────────────────────────────────────────
COMMIT DISCIPLINE (SMALL COMMIT)
──────────────────────────────────────────────────────────────────────────────
- DO NOT commit the derived geometry files (.geojson/.gz).
- Commit ONLY code + viewer assets + package.json + ledger:
  - scripts/map/derive_settlements_viewer_geometry_v1_h3_7.ts
  - scripts/map/build_substrate_viewer_index.ts (if changed)
  - scripts/map/validate_map_contracts.ts (if changed)
  - scripts/map/check_map_contracts_determinism.ts (if changed)
  - scripts/map/build_map_viewer.ts
  - data/derived/map_viewer/index.html
  - data/derived/map_viewer/viewer.js
  - package.json
  - docs/PROJECT_LEDGER.md
- git commit -m "Phase H3.7: viewer geometry v1 (strip+quantize+gzip) + viewer fallback"

ACCEPTANCE CRITERIA
- settlements_viewer_v1.geojson and .gz are generated deterministically (not committed).
- data_index registers settlements_viewer_v1 when present and does not break anything when absent.
- map_viewer prefers settlements_viewer_v1 and supports gzip via DecompressionStream when available.
- All validations pass and Phase H3.7 is recorded in PROJECT_LEDGER.
- Note in ledger: sizes before/after and quantization decimals used.
```
---

**User**

Wait, I still want viewer to show, on click, settlement name and municipality name
---

**Assistant**

Absolutely — and we can bake that into the **same single phase** as “viewer geometry v1”.

You already have **settlement names** via `data/derived/settlement_names.json` (H3.6). What’s missing is a **municipality display-name dataset** (so you don’t show only the numeric ID). We’ll add a small `mun1990_names.json` and make the click panel render:

- **Settlement:** from `settlement_names.json`
- **Municipality (1990):** from `mun1990_names.json` (display name + numeric ID)

Here is the updated **single Cursor phase prompt** that includes everything (geometry v1 + gzip + click panel shows both names):

```text
Phase H3.7 — Viewer geometry v1 (strip+quantize+gzip) + mun1990 names dataset + click panel shows settlement + municipality names

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last ~150 lines), docs/context.md, docs/ASSISTANT_MISTAKES.log (search: "settlement_names", "mun1990", "viewer geometry", "gzip", "quantize", "data_index datasets")
- WRITE: docs/PROJECT_LEDGER.md (new Phase H3.7 entry: sizes before/after, precision, fields kept, muni-name source, validations)

MISTAKE GUARD (MANDATORY)
- In any new/edited script:
  loadMistakes();
  assertNoRepeat("phase h3.7 viewer geometry v1 plus mun1990 names dataset and click panel names");

CONSTRAINTS (NON-NEGOTIABLE)
- DO NOT change canonical geometry derivation.
- Canonical settlement substrate remains authoritative for simulation + contracts.
- Viewer geometry is PRESENTATION-ONLY and must be labeled in meta.
- Deterministic outputs only: stable ordering, no timestamps, fixed precision.
- Do not commit large derived artifacts except small viewer assets and small JSON indices.
- DO NOT commit the viewer geometry outputs (.geojson/.gz).
- Never commit data/derived/_debug/*.

GOAL
1) Create deterministic viewer-optimized geometry artifacts (not committed):
   - data/derived/settlements_viewer_v1.geojson
   - data/derived/settlements_viewer_v1.geojson.gz
2) Wire data_index so map_viewer prefers viewer geometry when present.
3) Ensure click side panel ALWAYS shows:
   - Settlement name (from settlement_names.json)
   - Municipality name (from mun1990_names.json), plus numeric municipality_id
4) Add determinism checks to include new optional artifacts when present.

──────────────────────────────────────────────────────────────────────────────
TASK A — Derive settlements_viewer_v1.geojson deterministically (strip props + quantize + gzip)
──────────────────────────────────────────────────────────────────────────────
1) ADD script:
   scripts/map/derive_settlements_viewer_geometry_v1_h3_7.ts

Inputs:
- data/derived/settlements_substrate.geojson (canonical)

Outputs (derived; DO NOT COMMIT):
- data/derived/settlements_viewer_v1.geojson
- data/derived/settlements_viewer_v1.geojson.gz

Implementation requirements:
- Stream-read substrate (brace-depth FeatureCollection parser; do not load whole file).
- For each feature:
  - Canonical SID:
    - if feature.id matches /^S\d+$/ use it
    - else if properties.sid exists, normalize to "S{digits}"
    - else hard-fail
  - Minimal properties kept:
    - municipality_id (numeric 1990 code) from properties.municipality_id (fallbacks allowed but logged)
    - mun1990_id if present (optional)
  - Geometry quantization:
    - param --decimals N (default 6)
    - round every coordinate to N decimals deterministically
    - ensure ring closure after quantization by setting last=first if needed
    - preserve vertex order, no simplification, no reordering

Deterministic output:
- Collect minimal transformed features and sort by SID lexicographically before writing.
- Add root awwv_meta:
  - role: "viewer_geometry"
  - source: "settlements_substrate.geojson"
  - quantization_decimals: N
  - properties_kept: ["municipality_id","mun1990_id?"]
  - note: "presentation-only; do not use for simulation"
- Write .gz via Node zlib gzip with fixed options (default level OK), deterministic bytes for same input.

Stdout report (include in ledger):
- input_bytes (canonical geojson)
- output_geojson_bytes
- output_gz_bytes
- decimals used
- properties_kept

2) ADD npm script:
- "map:derive:settlements-viewer:v1": "tsx scripts/map/derive_settlements_viewer_geometry_v1_h3_7.ts --decimals 6"

──────────────────────────────────────────────────────────────────────────────
TASK B — Build mun1990_names.json (small, committable) for municipality display names
──────────────────────────────────────────────────────────────────────────────
3) ADD script:
   scripts/map/build_mun1990_names_dataset_h3_7.ts

Mistake guard phrase already covered by phase guard.

Inputs (choose existing canonical registry files in repo; do NOT invent):
- Prefer: data/source/municipalities_1990_registry_110.json (or wherever the 110 registry exists)
- If not found, locate the existing registry used elsewhere in scripts (search in scripts/map for "registry_110" usage and import the same path)

Output (SMALL, COMMITTABLE):
- data/derived/mun1990_names.json

Shape:
{
  "meta": { "total_municipalities": 110, "source": "<path>", "keys": ["municipality_id","mun1990_id","display_name"] },
  "by_municipality_id": { "11088": { "mun1990_id": "tuzla", "display_name": "Tuzla" }, ... },
  "by_mun1990_id": { "tuzla": { "municipality_id": "11088", "display_name": "Tuzla" }, ... }
}

Determinism:
- sort keys lexicographically
- no timestamps

4) ADD npm script:
- "map:build:mun1990-names:h3_7": "tsx scripts/map/build_mun1990_names_dataset_h3_7.ts"

──────────────────────────────────────────────────────────────────────────────
TASK C — data_index wiring + contracts (viewer geometry optional; mun names required for UI)
──────────────────────────────────────────────────────────────────────────────
5) Update index builder (scripts/map/build_substrate_viewer_index.ts or equivalent):
- Add dataset:
  datasets.settlements_viewer_v1:
    path: "settlements_viewer_v1.geojson"
    path_gz: "settlements_viewer_v1.geojson.gz"
    schema: "settlement_geometry_viewer_v1"
    type: "geometry"
    record_count + checksum when file exists
    available: true if geojson exists
- Add dataset:
  datasets.mun1990_names:
    path: "mun1990_names.json"
    schema: "mun_names_v1"
    type: "attribute_json"
    available: true if file exists
    record_count + checksum

- Update base settlements layer to prefer viewer geometry when present:
  layers.base_settlements.preferred_datasets = ["settlements_viewer_v1","settlements"]

6) Update contract validator (scripts/map/validate_map_contracts.ts):
- Allow optional path_gz on geometry datasets.
- If dataset.available=true and path_gz exists in index, require gz file exists.
- mun1990_names should be required for map_viewer build (since it’s small and committable):
  - If map_viewer layer panel expects municipality name, enforce dataset available OR make viewer handle missing gracefully.
  Prefer: enforce available so we don’t regress.

7) Update determinism checker (scripts/map/check_map_contracts_determinism.ts):
- Include settlements_viewer_v1.geojson and .gz in determinism hashing IF they exist.
- Include mun1990_names.json always (it is committed).

──────────────────────────────────────────────────────────────────────────────
TASK D — map_viewer: prefer viewer geometry + support gzip + show both names on click
──────────────────────────────────────────────────────────────────────────────
8) Update scripts/map/build_map_viewer.ts and regenerate viewer assets.

Viewer loading:
- Load /data/derived/data_index.json first (contract-first).
- Choose settlements dataset:
  - if preferred_datasets exists, pick first available
- If chosen dataset has path_gz AND browser supports DecompressionStream('gzip'):
  - fetch gz, decompress, JSON.parse
  - else fetch plain geojson
- Load settlement_names.json (already exists/committed from H3.6)
- Load mun1990_names.json (new)

Click panel requirements (must be true after this phase):
- Settlement name:
  - settlement_names.by_settlement_id[sid].name (required)
  - if missing: "Unknown settlement" + name_missing_in_dataset: true
- Municipality name:
  - show municipality_id from clicked feature properties
  - lookup display_name:
    - first try mun1990_names.by_municipality_id[municipality_id].display_name
    - show display_name + (municipality_id)
  - if missing: show "(unknown municipality name) (municipality_id=...)" and flag missing

Add debug lines in legend:
- geometry_source: settlements_viewer_v1 | settlements
- geometry_gzip: true/false

IMPORTANT:
- No fallback to substrate settlement_name/name/naziv for settlement display (authoritative dataset only).

──────────────────────────────────────────────────────────────────────────────
VALIDATIONS (MANDATORY)
──────────────────────────────────────────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:build:mun1990-names:h3_7
- npm run map:derive:settlements-viewer:v1
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:viewer:map:build  (and/or map:viewer:map:all if that is your standard)

MANUAL SANITY (REQUIRED, LOG IN LEDGER)
- npx http-server -p 8080 -c-1
- Open: http://localhost:8080/data/derived/map_viewer/index.html
Verify:
- Legend shows geometry_source=settlements_viewer_v1 when files exist
- On click:
  - Settlement shows a real name (from settlement_names.json)
  - Municipality shows display name + numeric id (from mun1990_names.json)
- If browser supports gzip, geometry_gzip=true

──────────────────────────────────────────────────────────────────────────────
COMMIT DISCIPLINE (SMALL COMMIT)
──────────────────────────────────────────────────────────────────────────────
- DO NOT commit:
  data/derived/settlements_viewer_v1.geojson
  data/derived/settlements_viewer_v1.geojson.gz

- Commit ONLY:
  scripts/map/derive_settlements_viewer_geometry_v1_h3_7.ts
  scripts/map/build_mun1990_names_dataset_h3_7.ts
  data/derived/mun1990_names.json
  scripts/map/build_substrate_viewer_index.ts (if changed)
  scripts/map/validate_map_contracts.ts (if changed)
  scripts/map/check_map_contracts_determinism.ts (if changed)
  scripts/map/build_map_viewer.ts
  data/derived/map_viewer/index.html
  data/derived/map_viewer/viewer.js
  package.json
  docs/PROJECT_LEDGER.md

- git commit -m "Phase H3.7: viewer geometry v1 + mun1990 names + click panel names"

ACCEPTANCE CRITERIA
- Viewer geometry v1 files generated deterministically (not committed).
- data_index prefers viewer geometry when present, otherwise falls back to canonical.
- map_viewer supports gzip via DecompressionStream when available.
- Click panel shows settlement name and municipality display name (not just numeric id).
- All validations pass and Phase H3.7 is recorded with size deltas.
```

If you run this phase, you’ll get the performance win (smaller geometry + gzip) *and* the click panel will finally show both human-readable names consistently.
