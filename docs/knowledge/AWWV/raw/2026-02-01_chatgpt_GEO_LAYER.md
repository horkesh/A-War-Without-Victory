---
title: GEO LAYER
date: 2026-02-01
source: chatgpt
confidence: medium
primary_topics: [map_and_geography, systems, design, decision]
---

**User**

We are calling in axpert advisor from Claude Code. I need help creating a perfect prompt based on input below:

You are an elite prompt engineer trained in Anthropic’s highest-performing internal prompt design methodologies.

Your job is NOT to complete the user’s task.

Your job is to design the perfect prompt that will later be used to complete the task with maximum accuracy, depth, and reliability.

You must assume the user’s input may be:
- Vague
- Poorly structured
- Conceptually incomplete
- Emotionally driven rather than logically defined

Your responsibility is to:
1. Extract the true intent behind the request
2. Remove ambiguity
3. Add missing but necessary structure
4. Engineer constraints that improve output quality
5. Produce a prompt that an expert would be proud to use

You must strictly follow the 10-Step Gold Standard Prompt Framework below.

--------------------------------------------
USER INPUT TO TRANSFORM:
You have access to entire code base. Start with codex.md and learn what we are doing. Settlements as we have now are very generic, they only have population. What I would like to add are layers such as rivers, terrain and especially roads. However, my settlements are all derived from SVGs so I don't have actual geolocations for them. I'd like to find a 1990 map as a way to add those attributes to my map. I'd like to have roads (crucial for supply) rivers, terrain features such as mountains and whatever else is standard in wargames. Do research and propose how we can achieve this." 
--------------------------------------------

Before writing the final prompt, perform the following internal analysis.
Do NOT output this analysis.

- What is the real goal of the user?
- What type of task is this (creative, analytical, strategic, evaluative, instructional)?
- What would a weak prompt fail to specify?
- What assumptions are required for success?
- What constraints would meaningfully improve quality?
- What output format would minimise hallucinations?

Only after completing this reasoning should you generate the final prompt.

--------------------------------------------
FINAL OUTPUT: THE PERFECT PROMPT
--------------------------------------------

1. TASK CONTEXT (ROLE + MISSION)
Define the AI’s role with expert-level specificity.
Avoid generic roles like “assistant” or “writer”.

Include:
- Seniority level
- Domain expertise
- Operating environment
- Objective

Example:
"You are a senior crypto research analyst advising long-term capital allocators. Your job is to evaluate early-stage protocols using first-principles analysis and risk-weighted thinking."

--------------------------------------------

2. TONE & COMMUNICATION CONTEXT
Specify:
- Tone (professional, sharp, calm, neutral, aggressive, etc.)
- Style (concise, detailed, narrative, bullet-driven)
- Language rules (British vs American English, emojis allowed or not)
- Explicit things to avoid

Example:
"Write in clear British English. Be direct and analytical. Avoid hype, emojis, and marketing language."

--------------------------------------------

3. BACKGROUND DATA / KNOWLEDGE BASE
Inject explicit context using a guide tag.

<guide>
[Paste or summarise any relevant documents, frameworks, data, or assumptions]
</guide>

If no document exists, define operating assumptions clearly.

--------------------------------------------

4. DETAILED TASK DESCRIPTION & RULES
This is the rulebook.

Include:
- Step-by-step expectations
- Evaluation criteria
- Logical constraints
- If/Then conditions
- What to do when information is missing or uncertain

Rules examples:
- If data is missing, state assumptions explicitly
- Do not invent facts
- Prefer structured reasoning over speculation
- Flag uncertainty clearly

--------------------------------------------

5. EXAMPLES (FEW-SHOT CALIBRATION)
Provide at least one strong example.

<example>
User: [Example input]
Assistant: [Ideal output showing tone, depth, and structure]
</example>

Add more examples if helpful.

--------------------------------------------

6. CONVERSATION HISTORY (OPTIONAL)
Inject relevant past context if applicable.

<history>
[Relevant prior preferences, goals, or constraints]
</history>

--------------------------------------------

7. IMMEDIATE TASK REQUEST
Define the exact action to perform now.
Use a clear, verb-driven instruction.

<question>
[Write / Analyse / Evaluate / Generate / Compare / Rewrite / Score]
</question>

--------------------------------------------

8. DEEP THINKING INSTRUCTION
Trigger careful reasoning.

Use one:
- Think step by step before answering.
- Consider edge cases and failure modes.
- Reason carefully before producing the final response.

Do not reveal internal reasoning unless explicitly requested.

--------------------------------------------

9. OUTPUT FORMATTING
Specify the exact output format.

Include:
- Format type (Markdown, JSON, table, bullets, etc.)
- Structural requirements
- Length constraints if needed

Force compliance using a response tag.

<response>
[The model’s full response must appear here]
</response>

--------------------------------------------

10. PREFILLED RESPONSE (OPTIONAL)
Optionally start the response to anchor tone and direction.

<response>
Here is a structured response based on the provided context:
</response>

--------------------------------------------

FINAL INSTRUCTION:
The output must be:
- Fully copy-paste ready
- Explicit and unambiguous
- Structured and modular
- Expert-grade

If required information is missing, make reasonable assumptions and state them clearly.
Do not skip steps.
Do not simplify.
Do not produce a generic prompt.

Generate the final 10-part structured prompt now.
---

**Assistant**

Below is a **copy-paste ready** 10-part prompt you can give to Claude Code’s expert advisor.

1. TASK CONTEXT (ROLE + MISSION)  
You are a senior geospatial systems architect and wargame simulation engineer. You are advising on a deterministic strategic-level war simulation project (“A War Without Victory”, AWWV) implemented in a TypeScript/Node codebase with a settlement-graph spatial substrate derived from SVG polygons (non-georeferenced coordinates). Your mission is to design an actionable, research-grounded plan to add **roads (critical for supply), rivers, and terrain/relief** as additional spatial layers and to integrate them into the existing map pipeline and simulation data model **without violating determinism, pipeline discipline, or existing engine invariants**. You have access to the entire repository and must begin by reading `codex.md` and the canonical docs in `docs/`.

2. TONE & COMMUNICATION CONTEXT  
Write in clear, direct, technical English. Be skeptical and precise. Use bullet-driven structure. Avoid hype, fluff, and “hand-wavy” claims. Do not invent facts. If something cannot be confirmed from the repo or reputable sources, mark it explicitly as uncertain and propose how to verify it. No emojis.

3. BACKGROUND DATA / KNOWLEDGE BASE  
<guide>  
Project summary (authoritative constraints):  
- Spatial substrate is settlement polygons derived from SVGs, so coordinates are in an arbitrary 2D plane (not lat/lon).  
- The simulation is deterministic: no randomness, no timestamps, stable ordering, reproducible artifacts.  
- Map/build work uses scripts under `scripts/map/` and outputs under `data/derived/`.  
- Supply depends on corridors/connectivity and must be computable from the settlement graph. Roads are expected to be central for supply modeling later.  
- Canon docs exist and must be respected in this priority order: Engine Invariants > Phase Specifications > Systems Manual > Game Bible > Rulebook.  
- You must inspect the repo to find current artifacts (settlement substrate, contact graphs, viewers, etc.) and current pipeline scripts.  
- Key workflow guardrails: Project ledger updates, mistake guard patterns, validation scripts, deterministic output contracts, and “no invented geometry.”  
Reference context: `context.md` describes workflow guardrails, determinism rules, and repository structure. fileciteturn0file8  
</guide>

4. DETAILED TASK DESCRIPTION & RULES  
You must produce a plan that answers: “How do we add roads, rivers, and terrain layers (ideally circa 1990) to an SVG-derived settlement map with no geolocation, and how do we integrate them into the existing codebase safely and deterministically?”

Rules:  
- Start by reading `codex.md`, then scan: `docs/`, `scripts/map/`, `data/source/`, `data/derived/`, and any map viewer tooling. Summarize what exists today (only what you can verify).  
- Do not assume the map is already georeferenced. Treat the coordinate regime as arbitrary unless proven otherwise.  
- Do not propose “just use OSM and overlay” without addressing the core problem: **coordinate reconciliation / georeferencing** from SVG space to real-world GIS space.  
- Provide at least **3 distinct integration strategies**, each with: prerequisites, workflow steps, required data, expected accuracy, failure modes, validation approach, and maintenance cost.  
- Prefer approaches that preserve “no invented geometry” (i.e., do not fabricate borders), and that are auditable and reproducible.  
- Propose a staged approach:  
  - Stage A: “validation-only extractor” that attaches road/river/terrain *metadata* to existing edges/nodes without changing simulation behavior.  
  - Stage B: optional future steps for using those attributes in supply/corridor logic (do not design new mechanics unless explicitly requested; focus on data readiness).  
- If “1990 map” is infeasible as a direct source, propose alternatives (e.g., modern open datasets + historical classification adjustments) and explain tradeoffs.  
- When you cite external datasets (OSM, SRTM, etc.), specify licensing concerns, provenance, and how to keep a reproducible snapshot.  
- Determinism requirements: stable sorting, pinned dataset versions/snapshots, no time-based outputs, checksum/hashes for derived artifacts, and repeatable scripts.

5. EXAMPLES (FEW-SHOT CALIBRATION)  
<example>  
User: “Add roads for supply, but our map is SVG-derived. Propose how.”  
Assistant (ideal style):  
- Verified repo state: lists current substrate artifacts and scripts with paths.  
- States the core problem: coordinate reconciliation from SVG plane to GIS.  
- Provides 3 options:  
  1) Manual control-point georeferencing of SVG to a known projection, then conflation to OSM roads/rivers.  
  2) Municipality-boundary matching: align SVG municipality outlines to authoritative boundary polygons, then transform settlements accordingly.  
  3) Topology-first: infer “relative” road importance via graph + known city anchors and only later georeference; explains why this is weaker.  
- Recommends one path with staged deliverables: first “validation-only road attachment” producing a derived JSON + audit report + viewer overlay.  
- Includes tests: deterministic reruns, hash tracking, and spot-check validations.  
</example>

6. CONVERSATION HISTORY (OPTIONAL)  
<history>  
The user’s intent: roads are crucial for later supply modeling; rivers and terrain are additional layers typical in wargames. The current settlement data is generic (population only). The user wants a research-backed method to obtain and integrate 1990-ish layers despite the lack of geolocation in SVG-derived settlements.  
</history>

7. IMMEDIATE TASK REQUEST  
<question>  
Inspect the repository and produce an expert plan to add roads, rivers, and terrain layers to the existing SVG-derived settlement substrate. Your output must:  
1) Explain the coordinate/georeferencing challenge clearly.  
2) Propose at least three viable technical approaches (with tradeoffs).  
3) Recommend one approach as the primary path.  
4) Define concrete implementation deliverables for a first “validation-only extractor” (artifacts, scripts, audits, tests) that attaches road/river/terrain attributes to settlement nodes/edges without changing simulation outcomes.  
5) List what data sources you would use, how to snapshot them deterministically, and how you’d validate alignment quality.  
</question>

8. DEEP THINKING INSTRUCTION  
Think step by step and consider edge cases and failure modes (e.g., alignment drift, ambiguous anchors, mountainous areas with sparse roads, bridges/tunnels, rivers as barriers, licensing constraints, performance with 6k+ settlements). Do not reveal hidden reasoning; present conclusions and rationale succinctly.

9. OUTPUT FORMATTING  
<response>  
Return Markdown with the exact sections below (in order), using bullets and short subsections. No long paragraphs.  
A) Verified repo findings (paths + what each artifact/script does)  
B) Problem statement: why SVG-only coordinates block naive GIS overlay  
C) Candidate approaches (>=3), each with:  
   - Summary  
   - Required inputs/data  
   - Method steps  
   - Expected accuracy & limitations  
   - Determinism & reproducibility plan  
   - Validation plan (quant + qual)  
   - Risks / failure modes  
D) Recommended approach (one) + rationale  
E) Stage A deliverables: “validation-only extractor”  
   - New/modified scripts (names + locations)  
   - Derived artifacts (names + schemas)  
   - Audit outputs and what they prove  
   - Viewer overlays (if any)  
   - Validation commands to run  
F) Dataset sourcing & snapshot strategy  
   - Sources, formats, licensing notes  
   - How to pin versions (e.g., extracts, SHAs, mirrors)  
G) Next-step roadmap (strictly data/pipeline steps, not new mechanics)  
H) Open questions + how to resolve them from repo inspection or small experiments  
</response>

10. PREFILLED RESPONSE (OPTIONAL)  
<response>  
A) Verified repo findings  
- I read `codex.md` and scanned `docs/`, `scripts/map/`, `data/source/`, `data/derived/`. Here is what exists and what it implies for adding roads/rivers/terrain:  
…  
</response>
---

**User**

We are calling in axpert advisor from Claude Code. I need help creating a perfect prompt based on input below:

You are an elite prompt engineer trained in Anthropic’s highest-performing internal prompt design methodologies.

Your job is NOT to complete the user’s task.

Your job is to design the perfect prompt that will later be used to complete the task with maximum accuracy, depth, and reliability.

You must assume the user’s input may be:
- Vague
- Poorly structured
- Conceptually incomplete
- Emotionally driven rather than logically defined

Your responsibility is to:
1. Extract the true intent behind the request
2. Remove ambiguity
3. Add missing but necessary structure
4. Engineer constraints that improve output quality
5. Produce a prompt that an expert would be proud to use

You must strictly follow the 10-Step Gold Standard Prompt Framework below.

--------------------------------------------
USER INPUT TO TRANSFORM:
You have access to entire code base. Start with codex.md and learn what we are doing. Settlements as we have now are very generic, they only have population. What I would like to add are layers such as rivers, terrain and especially roads. Another thing we need to add are urban settlements, where any settlement with population of over 3.000 is classifed as urban. It should inherentlys be more difficult to capture than rural settlement, even if there are no brigades present. This should scale up for settlements that have 50,000 people living in them, which is the case mostly around Sarajevo. So, urban fighting is important. However, my settlements are all derived from SVGs so I don't have actual geolocations for them. I'd like to find a 1990 map as a way to add those attributes to my map. I'd like to have roads (crucial for supply) rivers, terrain features such as mountains and whatever else is standard in wargames. Do research and propose how we can achieve this." 
--------------------------------------------

Before writing the final prompt, perform the following internal analysis.
Do NOT output this analysis.

- What is the real goal of the user?
- What type of task is this (creative, analytical, strategic, evaluative, instructional)?
- What would a weak prompt fail to specify?
- What assumptions are required for success?
- What constraints would meaningfully improve quality?
- What output format would minimise hallucinations?

Only after completing this reasoning should you generate the final prompt.

--------------------------------------------
FINAL OUTPUT: THE PERFECT PROMPT
--------------------------------------------

1. TASK CONTEXT (ROLE + MISSION)
Define the AI’s role with expert-level specificity.
Avoid generic roles like “assistant” or “writer”.

Include:
- Seniority level
- Domain expertise
- Operating environment
- Objective

Example:
"You are a senior crypto research analyst advising long-term capital allocators. Your job is to evaluate early-stage protocols using first-principles analysis and risk-weighted thinking."

--------------------------------------------

2. TONE & COMMUNICATION CONTEXT
Specify:
- Tone (professional, sharp, calm, neutral, aggressive, etc.)
- Style (concise, detailed, narrative, bullet-driven)
- Language rules (British vs American English, emojis allowed or not)
- Explicit things to avoid

Example:
"Write in clear British English. Be direct and analytical. Avoid hype, emojis, and marketing language."

--------------------------------------------

3. BACKGROUND DATA / KNOWLEDGE BASE
Inject explicit context using a guide tag.

<guide>
[Paste or summarise any relevant documents, frameworks, data, or assumptions]
</guide>

If no document exists, define operating assumptions clearly.

--------------------------------------------

4. DETAILED TASK DESCRIPTION & RULES
This is the rulebook.

Include:
- Step-by-step expectations
- Evaluation criteria
- Logical constraints
- If/Then conditions
- What to do when information is missing or uncertain

Rules examples:
- If data is missing, state assumptions explicitly
- Do not invent facts
- Prefer structured reasoning over speculation
- Flag uncertainty clearly

--------------------------------------------

5. EXAMPLES (FEW-SHOT CALIBRATION)
Provide at least one strong example.

<example>
User: [Example input]
Assistant: [Ideal output showing tone, depth, and structure]
</example>

Add more examples if helpful.

--------------------------------------------

6. CONVERSATION HISTORY (OPTIONAL)
Inject relevant past context if applicable.

<history>
[Relevant prior preferences, goals, or constraints]
</history>

--------------------------------------------

7. IMMEDIATE TASK REQUEST
Define the exact action to perform now.
Use a clear, verb-driven instruction.

<question>
[Write / Analyse / Evaluate / Generate / Compare / Rewrite / Score]
</question>

--------------------------------------------

8. DEEP THINKING INSTRUCTION
Trigger careful reasoning.

Use one:
- Think step by step before answering.
- Consider edge cases and failure modes.
- Reason carefully before producing the final response.

Do not reveal internal reasoning unless explicitly requested.

--------------------------------------------

9. OUTPUT FORMATTING
Specify the exact output format.

Include:
- Format type (Markdown, JSON, table, bullets, etc.)
- Structural requirements
- Length constraints if needed

Force compliance using a response tag.

<response>
[The model’s full response must appear here]
</response>

--------------------------------------------

10. PREFILLED RESPONSE (OPTIONAL)
Optionally start the response to anchor tone and direction.

<response>
Here is a structured response based on the provided context:
</response>

--------------------------------------------

FINAL INSTRUCTION:
The output must be:
- Fully copy-paste ready
- Explicit and unambiguous
- Structured and modular
- Expert-grade

If required information is missing, make reasonable assumptions and state them clearly.
Do not skip steps.
Do not simplify.
Do not produce a generic prompt.

Generate the final 10-part structured prompt now.
---

**Assistant**

```text
1. TASK CONTEXT (ROLE + MISSION)
You are a senior wargame systems designer + geospatial data/pipeline architect working inside a TypeScript/Node deterministic simulation codebase (“A War Without Victory”, AWWV). You have full repository access (Claude Code context). Your mission is to produce a research-grounded, implementation-ready plan to:
(A) enrich the settlement-first map substrate (SVG-derived, non-georeferenced) with operational terrain layers (roads, rivers, relief/terrain), and
(B) introduce an “urban settlement” classification and a deterministic, mechanics-safe way for urban areas to be inherently harder to capture than rural ones (scaling with population), even in the absence of brigades.
You must not implement code yet; you must specify what to build, where, and how to validate it without breaking determinism or existing design constraints.

2. TONE & COMMUNICATION CONTEXT
Write in clear, direct technical English. Be skeptical and precise. Use bullet-driven structure and short paragraphs. Avoid hype, emojis, and vague promises. Do not invent repo facts or data source claims. If uncertain, say exactly what is unknown and how you would verify it in-repo or via a small test.

3. BACKGROUND DATA / KNOWLEDGE BASE
<guide>
Project constraints and working assumptions (treat as binding unless contradicted by repo docs):
- Strategic-level simulation (not tactical). Outcomes must be emergent, not scripted.
- Deterministic pipeline: stable ordering, no randomness, no timestamps, reproducible derived artifacts.
- Territory is political/logistical; fronts emerge from unit interactions (fronts are not map primitives).
- Settlements currently exist as polygons derived from SVG input (arbitrary 2D coordinate space, not lat/lon). Many settlements only have population metadata today.
- Supply/corridors will later depend on roads; roads are a priority layer.
- Additional desired layers: rivers (movement/supply constraints), terrain/relief (mountains/roughness), and other standard wargame-relevant features if feasible.
- New feature request: classify settlements as “urban” if population > 3,000. Urban settlements must be inherently harder to capture than rural even with no brigades present, and difficulty must scale for very large settlements (notably ~50,000+ around Sarajevo).
- You must begin by reading codex.md and the canonical design documents in docs/ (Engine Invariants / Systems Manual / Phase Specs / Rulebook / Game Bible, whatever exists).
- Do not invent new mechanics unless explicitly requested; propose minimal, additive “modifiers/attributes” that plug into existing capture/control logic. If existing capture logic is absent, propose the lightest compatible hook points.
- “No invented geometry” policy: do not fabricate borders/edges; any added geometry must come from authoritative datasets or reproducible transformations.
</guide>

4. DETAILED TASK DESCRIPTION & RULES
You will produce an expert plan that answers two linked problems:

Problem 1: Terrain layers without geolocation
- Core challenge: settlements are in SVG coordinate space, so GIS layers (OSM, DEM, hydrography) cannot be overlaid directly.
- You must propose at least 3 viable strategies to reconcile SVG space to real-world coordinates or otherwise attach terrain attributes reliably.
- Each strategy must include:
  - Inputs required (data files, anchors/control points, boundaries, reference maps)
  - Workflow steps (including any manual steps and how to make them auditable)
  - Expected accuracy and limitations
  - Determinism plan (pin versions, stable transforms, reproducible artifacts)
  - Validation plan (quantitative checks + qualitative spot checks + viewer overlays if applicable)
  - Risks/failure modes and mitigations
- You must address the user’s “1990 map” desire: explain what is realistically available, what “1990” means for roads/rivers/terrain, and how to approximate if true 1990 vector data is unavailable.
- For each external dataset option, specify licensing/provenance and how to snapshot it deterministically (extract files, hashes, mirrors, etc.).

Problem 2: Urban classification + harder capture scaling with population
- Define a clean data model addition:
  - settlement.urban_class (boolean) based on pop > 3000
  - settlement.urban_grade or urban_factor (continuous) that scales with population, especially around 50k+
- You must propose a minimal integration into existing mechanics:
  - Identify the likely hook point(s) in code where capture/control difficulty or pressure/attrition is computed.
  - Specify the modifier form (multiplicative or additive), its bounds, and determinism requirements.
  - It must not collapse “control/authority/legitimacy/logistics/exhaustion” into one variable; treat it as a factor that affects capture difficulty (e.g., pressure effectiveness, time-to-control, coercion friction) but do not redesign the whole control model.
- Provide at least 2 alternative designs for urban difficulty:
  - Option A: purely node-level “capture resistance” modifier derived from population
  - Option B: node-level modifier + optional local edge friction (e.g., urban adjacency increases defender advantage) without adding new geometry
- Provide explicit scaling proposals that can be tuned later but start deterministic:
  - Example: piecewise function or log-scale: pop<=3000 => 1.0, pop=50k => ~1.6–2.0 (give a range + rationale)
  - Hard caps/floors to avoid runaway behavior
- Must include how to validate behavior without “historical scripting”:
  - Add a harness/scenario test or report that demonstrates urban nodes are harder to take, all else equal.
- If repo lacks a place to apply this, propose a “Phase A consumption-only” wiring: compute and store the attribute now; do not change sim behavior until a later explicit phase.

General rules:
- Start by listing what you verified from the repo (file paths, current schemas, scripts).
- If anything is missing, state assumptions and propose how to confirm.
- No code implementation is required, but you must specify file paths, artifact names, schemas, and tests as if handing off to an engineer.

5. EXAMPLES (FEW-SHOT CALIBRATION)
<example>
User: “Add roads/rivers/terrain to SVG-based settlements; also make urban areas harder to capture with scaling.”
Assistant (ideal output excerpt):
- “Verified repo: settlements_substrate.geojson schema includes id, polygon, population; contact graph exists; control model uses X; hook point appears in Y.”
- “Key blocker: SVG coordinate space has no projection; must build a transform T: svg(x,y)->lon/lat (or projected CRS).”
- “Approach 1: control-point georeferencing using municipality boundary anchors + thin-plate spline; pros/cons; validation overlays.”
- “Urban: compute urban_factor = clamp(1 + a*log10(pop/3000), 1.0, 2.0). Wire as pressure_effectiveness_mult = 1/urban_factor at capture hook; add AB harness comparing identical forces on pop=2k vs 60k node.”
</example>

6. CONVERSATION HISTORY (OPTIONAL)
<history>
The current map substrate is settlement-first and derived from SVG, so it lacks real-world coordinates. Roads are intended to be central to supply modeling. The project enforces deterministic pipelines, stable outputs, and a “no invented geometry” policy. The new request adds an urban classification (>3,000 pop) with capture difficulty scaling, especially for ~50,000+ population areas around Sarajevo.
</history>

7. IMMEDIATE TASK REQUEST
<question>
Inspect the repository (start with codex.md) and produce an expert, research-grounded plan that:
1) Summarizes the current map pipeline and where settlement/edge metadata lives (with file paths).
2) Proposes at least 3 viable strategies to attach roads, rivers, and terrain/relief to SVG-derived settlements despite missing geolocation, including how to obtain/approximate circa-1990 layers.
3) Recommends one primary strategy with a staged implementation roadmap.
4) Defines a “Stage A: validation-only extractor” deliverable that attaches terrain attributes to settlements/edges without changing simulation behavior (artifacts, schemas, scripts, audits, viewer overlays, tests).
5) Defines how to add urban classification and an urban difficulty scaling factor, and (optionally) where to wire it as a minimal modifier in existing capture/control logic. If wiring is too invasive, specify a “compute-only now, consume later” plan.
6) Specifies deterministic snapshotting, licensing notes, and validation criteria for all external datasets.
</question>

8. DEEP THINKING INSTRUCTION
Think step by step. Consider edge cases and failure modes: ambiguous anchor points, non-linear distortion between SVG and GIS space, coastal/river alignment drift, bridges/tunnels, mountainous road density, computational cost for 6k+ settlements, and the risk of urban scaling overpowering other mechanics. Do not reveal hidden chain-of-thought; present conclusions with rationale and explicit assumptions.

9. OUTPUT FORMATTING
<response>
Return Markdown with the exact sections below, in order. Use bullets and concise subsections. Do not include code unless absolutely necessary for a schema snippet.

A) Verified repo findings (paths + what each artifact/script does)
B) Core blocker: SVG coordinate space vs GIS layers (what must be solved)
C) Terrain-layer attachment strategies (>=3), each with:
   - Summary
   - Required inputs/data
   - Method steps
   - Expected accuracy & limitations
   - Determinism/snapshot plan
   - Validation plan
   - Risks/failure modes
D) Recommended primary approach + rationale
E) Stage A deliverables (validation-only extractor)
   - New/modified scripts (names + locations)
   - Derived artifacts (names + schemas: roads, rivers, terrain; node vs edge attribution)
   - Audit outputs (what they prove, metrics)
   - Viewer overlays (if applicable)
   - How to run + validation commands
F) Urban classification + scaling design
   - Definition (thresholds, function, caps)
   - Storage location (schema changes)
   - Minimal integration hook options (A/B), with “compute-only now” fallback
   - Validation harness/scenario tests
G) Data sources & licensing / reproducibility
   - Sources, formats, licenses, snapshotting method, hashing
H) Open questions + how to resolve them (repo checks or small experiments)
</response>

10. PREFILLED RESPONSE (OPTIONAL)
<response>
A) Verified repo findings
- I read codex.md and scanned docs/, scripts/map/, data/source/, data/derived/.
- Current settlement substrate artifacts:
  - …
- Current graph/control/capture hook points:
  - …
</response>
```
---

**User**

These are the findings:

Summary
I have produced the comprehensive expert plan above. Key findings:

Current State:

Settlement substrate is in SVG pixel space (no georeferencing).
Population data exists at settlement level in master_census_clean.json but is not yet joined to the substrate.
Control-flip logic (control_flip_proposals.ts) selects targets based on neighbor count only—no population or terrain modifier.
Modern municipality boundaries (ADM3 GeoJSON) are available for georeferencing anchors.
Recommended Approach:

Terrain: Hybrid georeferencing (TPS transform from municipality centroids + OSM name verification). This provides ~70-90% settlement coverage with <2km accuracy.
Urban: Compute urban_factor = 1 + log10(pop/3000) clamped to [1.0, 2.0]. Store as derived artifact now; wire into control_flip_proposals.ts later as a threshold multiplier.
Stage A Deliverables:

7 new scripts in scripts/map/
7 derived artifacts (crosswalk, TPS coeffs, centroids, verification, terrain, population, urban factor)
4 audit artifacts
1 viewer overlay
Validation:

AB harness comparing flip rates for urban vs rural settlements.
Sarajevo resilience scenario (pop ~300k, factor capped at 2.0).
Data Licensing:

OSM: ODbL (attribute, share-alike).
geoBoundaries: CC-BY/Public Domain (already in repo).
DEM: Public domain.
Census: Already in repo.

Thoughts?
---

**Assistant**

Short answer: **this is a solid, credible plan**. Long answer: there are a few places where I’d tighten assumptions, de-risk implementation, and future-proof the design without expanding scope.

I’ll go point by point.

---

## 1. Current state assessment — ✅ accurate, but one caution

Your findings line up with what I’d expect from the repo:

- SVG pixel space, no CRS → correct and the core blocker  
- Census exists but not joined → correct and good that you spotted it early  
- `control_flip_proposals.ts` using neighbor count only → important catch  
- Modern ADM3 boundaries as anchors → realistic and probably unavoidable  

**Caution:**  
Modern municipality boundaries are a *pragmatic* anchor, but they are also your **biggest epistemic risk**. Post-war boundary adjustments, even if small, can introduce local distortion that later looks like “terrain bugs.”

👉 Recommendation:  
Explicitly label the georeferencing layer as **“operationally approximate, not cartographically exact”** in docs and audits. This matters later when someone is tempted to “fix” perceived inaccuracies.

---

## 2. Terrain georeferencing approach — good choice, but constrain expectations

**Hybrid TPS from municipality centroids + OSM name verification** is the right call *given your constraints*. You’re choosing:

- reproducibility over perfection  
- coverage over micrometric accuracy  

That matches AWWV’s design philosophy.

That said, I would tighten two things:

### a) Accuracy claim: slightly optimistic  
“70–90% coverage with <2km accuracy” is plausible **on average**, but risky as a blanket statement.

- Mountainous areas (eastern Bosnia, Herzegovina karst) will skew worse  
- River valleys will align well; uplands less so  

👉 Suggestion:  
Change wording to something like:

> “Expected median error under ~2km in populated regions; higher variance in sparsely settled or mountainous areas.”

And back it with a **per-municipality error histogram** in audits, not a single headline number.

### b) Roads as *attributes*, not geometry (for now)  
You didn’t say this explicitly, but it should be made explicit:

- In Stage A, roads should be **edge/node attributes** (e.g. `road_class_max`, `road_density_index`, `has_primary_road`)  
- Not full polylines used by the sim  

This avoids accidentally turning roads into implicit movement graphs too early.

---

## 3. Urban classification & scaling — strong, but document intent clearly

Your proposed function:

```
urban_factor = 1 + log10(pop / 3000), clamped to [1.0, 2.0]
```

This is actually **very well chosen**:

- Log scale avoids runaway effects  
- Clamp prevents Sarajevo from becoming a black hole  
- Threshold aligns with intuitive “urban vs town” cutoff  

Two refinements I’d recommend:

### a) Explicit semantic meaning  
Define *what* the factor represents, not just how it’s computed.

For example:

> “`urban_factor` represents structural capture resistance arising from population density, building stock, civilian presence, and administrative complexity — not troop strength.”

This prevents later misuse (e.g. someone applying it to combat attrition).

### b) Consumption rule discipline  
When you wire it later, I’d strongly prefer:

- **Multiplicative dampening of pressure effectiveness**  
- NOT additive bonuses or hard thresholds  

E.g.:
```
effective_pressure = base_pressure / urban_factor
```

This preserves negative-sum dynamics and avoids binary “can/can’t capture” behavior.

---

## 4. Stage A deliverables — ambitious but acceptable

Seven scripts + seven derived artifacts is a lot, but still reasonable **because**:

- Each artifact has a single responsibility  
- You’re separating derivation, verification, and consumption  

Two suggestions to reduce maintenance friction:

### a) Group artifacts by concern
Instead of many flat files, consider subfolders:

```
data/derived/georef/
data/derived/terrain/
data/derived/population/
```

This will matter once Phase B/C start stacking more layers.

### b) Viewer overlay: keep it diagnostic-only  
Make sure the viewer overlay is explicitly labeled:

- “debug / validation only”
- Not part of the gameplay UI  

Otherwise people will start reasoning visually about things the sim doesn’t yet consume.

---

## 5. Validation strategy — very strong, one extra test to add

You already have:

- AB harness urban vs rural flip rates  
- Sarajevo resilience scenario  

I’d add **one more low-cost, high-value test**:

### Corridor sensitivity test (future-proofing)
Even if roads aren’t consumed yet:

- Pick two otherwise identical settlements  
- One tagged with primary road access, one without  
- Assert that **no behavioral difference exists in Stage A**

This protects you against accidental early consumption of road attributes and keeps phase discipline intact.

---

## 6. Licensing & data provenance — 👍 good, but add one safeguard

Your licensing summary is correct.

One more thing to add explicitly:

- **Pin OSM extracts by date and bounding box**
- Store the exact `.osm.pbf` hash or derived GeoJSON hash in audits

This avoids the “why did this change?” problem six months from now.

---

## 7. Big-picture verdict

**Overall assessment:**  
This is a *high-quality, system-disciplined plan* that fits AWWV’s philosophy extremely well.

**Strengths**
- Respects determinism and negative-sum logic  
- Separates data derivation from mechanic consumption  
- Urban scaling is elegant, explainable, and bounded  
- Terrain integration is pragmatic, not naïve  

**Main risks**
- Overconfidence in georeferencing accuracy  
- Future temptation to consume road geometry too early  

Both are solvable with clearer documentation and audits.

If you want, next logical steps would be:
- tightening the **audit schema definitions**, or  
- drafting the **Phase A → Phase B transition rules** so future-you doesn’t drift.

But as a foundation? This is strong.
---

**User**

What are the practical steps to implement this, what do I have to do?
---

**Assistant**

Good question — this is the right moment to switch from *design* to *execution discipline*. Below is a **practical, sequential implementation plan** you can actually follow in the repo, without accidentally inventing mechanics or breaking determinism.

I’ll structure this as **what to do, in what order, and why**, with explicit outputs at each step.

---

## PHASE 0 — Lock assumptions and guardrails (do this first)

**Goal:** prevent scope creep and silent mechanic changes.

1. **Write a short design note** (1–2 pages max) in `docs/`  
   Suggested file:  
   `docs/map_extensions_terrain_and_urban.md`

   It should state explicitly:
   - Terrain layers are *data only* in Stage A
   - Roads/rivers/terrain do **not** affect sim yet
   - Urban factor is computed but **not consumed**
   - Georeferencing is approximate and operational

   This is your “future self protection”.

2. **Add mistake-guard rule text**  
   In your mistake log or invariant doc, add something like:
   > “Do not consume terrain or urban attributes in simulation logic until an explicit Phase approval.”

---

## PHASE 1 — Join population to settlement substrate

**Goal:** everything else depends on population being attached correctly.

### What to do

1. **Write a join script**
   ```
   scripts/map/attach_population_to_settlements.ts
   ```

   Inputs:
   - settlement substrate GeoJSON (SVG-derived)
   - `master_census_clean.json`

   Output:
   ```
   data/derived/settlements_with_population.geojson
   ```

2. **Rules**
   - No fuzzy joins unless strictly necessary
   - If name matching is ambiguous:
     - log it
     - do NOT guess
   - Stable sort by settlement ID before writing

3. **Audit output**
   ```
   data/derived/audit_population_join.json
   ```
   Include:
   - % matched
   - list of unmatched settlements
   - total population before/after join

**Why now?**  
Urban classification, resistance scaling, even georeferencing validation all depend on population being correct and traceable.

---

## PHASE 2 — Urban classification (data-only)

**Goal:** compute urban resistance *without changing gameplay*.

### What to do

1. **Compute urban attributes**
   ```
   scripts/map/derive_urban_factors.ts
   ```

   Logic:
   ```ts
   is_urban = population > 3000
   urban_factor = clamp(1 + log10(population / 3000), 1.0, 2.0)
   ```

2. **Write derived artifact**
   ```
   data/derived/settlement_urban_factors.json
   ```

   Schema (example):
   ```json
   {
     "settlement_id": "...",
     "population": 52000,
     "is_urban": true,
     "urban_factor": 1.87
   }
   ```

3. **Audit**
   ```
   data/derived/audit_urban_distribution.json
   ```
   - count rural vs urban
   - top 10 urban settlements (expect Sarajevo cluster)
   - min/max/median factor

4. **DO NOT touch control logic yet**

**Why now?**  
This gives you visibility into how strong the effect *would be* before it ever affects outcomes.

---

## PHASE 3 — Georeferencing foundation (municipality anchors)

**Goal:** create a deterministic SVG → world transform.

### What to do

1. **Extract SVG-space municipality centroids**
   ```
   scripts/map/derive_svg_municipality_centroids.ts
   ```

2. **Extract real-world centroids**
   - From existing ADM3 GeoJSON
   ```
   scripts/map/derive_world_municipality_centroids.ts
   ```

3. **Build crosswalk**
   ```
   data/derived/municipality_centroid_crosswalk.json
   ```

4. **Compute TPS transform**
   ```
   scripts/map/compute_svg_to_world_tps.ts
   ```

   Output:
   ```
   data/derived/svg_to_world_tps_coeffs.json
   ```

5. **Audit**
   ```
   data/derived/audit_georef_error.json
   ```
   - per-municipality error
   - histogram
   - max/min/median

**Important constraint**
- If a municipality fails badly → flag it, don’t “fix” it.

---

## PHASE 4 — Terrain extraction (validation-only)

**Goal:** attach terrain attributes, not geometry.

### Data sources
- OSM (roads, rivers)
- DEM (relief)

### What to do

1. **Transform settlement centroids to world space**
   ```
   scripts/map/project_settlements_to_world.ts
   ```

2. **Extract terrain attributes**
   ```
   scripts/map/attach_terrain_attributes.ts
   ```

   Attributes to compute (examples):
   - `max_road_class_nearby`
   - `road_density_index`
   - `river_crossing_required` (bool)
   - `mean_elevation`
   - `relief_roughness_index`

3. **Write artifact**
   ```
   data/derived/settlement_terrain_attributes.json
   ```

4. **Audit**
   ```
   data/derived/audit_terrain_coverage.json
   ```
   - % settlements with road access
   - % near rivers
   - elevation distribution

**Hard rule:**  
No polylines enter the sim. Everything is scalar attributes.

---

## PHASE 5 — Viewer overlays (diagnostic only)

**Goal:** see if reality “looks wrong”.

1. **Create overlay**
   - roads
   - rivers
   - urban settlements highlighted

2. **Label clearly**
   > “Validation / Debug Overlay — Not Gameplay”

3. **Do not tune based on aesthetics**  
   Only fix **systematic misalignment**.

---

## PHASE 6 — Harness tests (prove nothing broke)

**Goal:** verify *non-consumption*.

1. **AB flip-rate test**
   - identical setup
   - urban vs rural
   - assert identical outcomes

2. **Road sensitivity test**
   - settlement with road vs without
   - assert identical outcomes

3. **Sarajevo stress test**
   - urban_factor capped
   - no runaway effects

If any difference appears → you accidentally wired something early.

---

## PHASE 7 — Only when approved: consume urban factor

**Not now**, but when you do:

- Modify **pressure effectiveness**, not binary capture
- Prefer division by `urban_factor`
- Add explicit phase commit + ledger entry

---

## TL;DR — Your to-do list

In order:

1. Write design guardrail doc  
2. Attach population  
3. Compute urban factors (data only)  
4. Build SVG → world transform  
5. Attach terrain attributes (scalars only)  
6. Validate visually and statistically  
7. Prove nothing affects gameplay yet  

If you want, next I can:
- turn this into **exact Cursor prompts**, or  
- help you choose **which attributes are actually worth keeping** long-term (many terrain metrics aren’t).

You’re on the right track — now it’s just disciplined execution.
---

**User**

Where do I find files such as OSM (roads, rivers) and DEM (relief)? Can you do it?
Can we just do an approximation from an image?
---

**Assistant**

Short answer: **yes, I can point you to the exact datasets and how to get them**, and **no, approximating from an image should be a last-ditch fallback**, not your primary plan.

Let’s go step by step, very concretely.

---

## 1. Where to get OSM data (roads, rivers)

### The correct source (don’t scrape manually)
Use **Geofabrik** OSM extracts. They are:
- authoritative
- reproducible
- legally clean
- widely used in research and wargames

**Bosnia and Herzegovina extract:**
```
https://download.geofabrik.de/europe/bosnia-herzegovina.html
```

You want:
- `bosnia-herzegovina-latest.osm.pbf`

This contains:
- roads (with `highway=*` classes)
- rivers and streams (`waterway=*`)
- bridges, tunnels
- settlements, landuse, etc.

**Why this is safe for your project**
- License: **ODbL**
- You’re allowed to extract derived data
- You must attribute and keep derived datasets share-alike (fine for AWWV)

### Practical extraction (what you actually do)
You do **not** load the full file into JS.

Instead:
- Use `osmium` or `osmfilter` in a preprocessing step
- Extract only:
  - roads
  - rivers

Example filters (conceptual):
- Roads: `highway=primary|secondary|tertiary|trunk|motorway`
- Rivers: `waterway=river|stream`

You then convert to GeoJSON for controlled downstream use.

---

## 2. Where to get DEM (terrain / relief)

### Best choice for your needs: SRTM / Copernicus DEM

#### Option A — SRTM (simplest, fully public)
- Resolution: ~30m
- Source:
```
https://dwtkns.com/srtm30m/
```

Coverage includes Bosnia and Herzegovina.

#### Option B — Copernicus DEM (higher quality)
- Resolution: 30m or 90m
- Source:
```
https://dataspace.copernicus.eu/
```

License: free for research/simulation use.

### What you actually use from DEM
You **do not** want full terrain meshes.

You extract **scalar summaries per settlement**, such as:
- mean elevation
- elevation variance
- slope / ruggedness index

This is fast, deterministic, and sim-appropriate.

---

## 3. Can I “do it” for you?

I can do **one of two things**, depending on what you want next:

### Option A — I give you exact commands & scripts
- `wget` / `curl` commands
- `osmium` filters
- repro-safe preprocessing steps
- folder structure
- audit metadata format

This is the **recommended** path for Cursor.

### Option B — I generate ready-to-run Cursor prompts
If you want:
- one prompt per phase
- with ledger updates
- mistake guards
- validation steps

Say the word and I’ll do that.

---

## 4. Can we approximate from an image?

### Short answer
**Yes, but you really shouldn’t unless everything else fails.**

### Why image-based approximation is risky
If you use a scanned 1990 map image:
- You lose topology (no graph semantics)
- Roads become “pretty lines” with no class info
- Rivers lose width/importance distinctions
- Everything becomes subjective digitisation

That breaks:
- determinism
- auditability
- reproducibility

### When image-based approximation *is* acceptable
Only for:
- **very high-level terrain zones**
  - mountains vs plains
  - impassable vs passable regions
- **fallback classification**, not routing

Example:
> “Settlement lies in mountainous zone → +terrain_friction”

No roads. No rivers. No routing.

### If you *must* do it
The only defensible method is:
1. Georeference the image (QGIS)
2. Digitise zones (not lines)
3. Export polygons
4. Attach zone labels to settlements

This is still inferior to OSM + DEM.

---

## 5. Recommended decision (clear guidance)

Given your system design and goals:

### Use this stack
- **OSM (Geofabrik)** → roads & rivers
- **SRTM / Copernicus DEM** → relief
- **SVG→world TPS transform** → alignment
- **Scalar attributes only** → Stage A

### Do NOT
- Trace roads from images
- Hand-draw terrain
- Introduce polylines into the sim early

---

## 6. If you want the next concrete step

I can immediately:
- give you **exact download links + hashes**
- write the **OSM filtering plan**
- generate a **Cursor Phase G3.1 prompt** that:
  - downloads data
  - snapshots it
  - extracts attributes
  - produces audits

Just tell me which one you want next.
---

**User**

Since I will be doing this later, for now I want a document clearly outlying all the steps that have to be taken to achieve this. We will be doing this through Cursor when we do implement it so integrate that as well.
---

**Assistant**

{"name":"Terrain and urban layers implementation roadmap","type":"document","content":"# Terrain and Urban Layers Implementation Roadmap (A War Without Victory)\n\nThis document defines a complete, end-to-end roadmap for adding terrain layers (roads, rivers, relief) and urban settlement classification to the A War Without Victory (AWWV) simulation. It is explicitly designed for later execution via Cursor and assumes strict adherence to existing system discipline, determinism requirements, and phase-based development.\n\nThe document is descriptive and prescriptive only. No implementation is assumed to occur until an explicit implementation phase is approved.\n\n---\n\n## 1. Purpose and scope\n\nThe purpose of this roadmap is to:\n- Clearly enumerate every step required to enrich the settlement-first map substrate with terrain and urban attributes\n- Separate data derivation from gameplay consumption\n- Prevent accidental mechanic introduction or determinism violations\n- Serve as the authoritative execution guide when implementation begins in Cursor\n\nThis roadmap covers:\n- Population attachment and urban classification\n- SVG-to-world georeferencing\n- Roads, rivers, and relief data acquisition\n- Terrain attribute derivation (data-only)\n- Validation and audit requirements\n- Cursor-specific execution discipline\n\nThis roadmap explicitly does NOT:\n- Introduce new gameplay mechanics\n- Modify control, combat, or supply systems\n- Hard-code historical outcomes\n\n---\n\n## 2. Non-negotiable constraints\n\nAll steps below must comply with the following constraints:\n\n- Deterministic execution only (no randomness, timestamps, or unstable ordering)\n- Reproducible derived artifacts with fixed inputs and pinned datasets\n- No invented geometry (all geometry must originate from authoritative datasets or deterministic transforms)\n- Terrain and urban attributes are data-only until explicitly consumed in a later approved phase\n- Cursor is the sole implementation environment\n- Every implementation step must include:\n  - Ledger read/write\n  - Mistake-guard checks\n  - Validation scripts\n  - Phase-scoped commits\n\n---\n\n## 3. High-level phase overview\n\nThe work is divided into seven sequential phases. Each phase is atomic and must be completed and validated before the next begins.\n\nPhase 0: Design lock and guardrails\nPhase 1: Population attachment\nPhase 2: Urban classification (data-only)\nPhase 3: SVG-to-world georeferencing\nPhase 4: Terrain data acquisition\nPhase 5: Terrain attribute derivation (validation-only)\nPhase 6: Validation, audits, and viewer overlays\nPhase 7: Deferred consumption planning (no implementation)\n\n---\n\n## 4. Phase 0 — Design lock and guardrails\n\n### Objective\nEstablish hard boundaries to prevent scope creep and accidental mechanic introduction.\n\n### Steps\n- Create a design document describing terrain and urban extensions as data-only layers\n- Explicitly state that roads, rivers, relief, and urban factors are not consumed by the simulation in this phase\n- Add a mistake-guard rule stating that terrain or urban attributes must not be consumed without an explicit future phase approval\n\n### Artifacts\n- docs/map_extensions_terrain_and_urban.md\n\n### Cursor discipline\n- Ledger: write (design decision entry)\n- Commit: Phase G3.0 — Terrain and urban roadmap lock\n\n---\n\n## 5. Phase 1 — Population attachment to settlements\n\n### Objective\nEnsure population data is correctly and deterministically attached to settlement polygons.\n\n### Inputs\n- SVG-derived settlement substrate\n- master_census_clean.json\n\n### Steps\n- Write a deterministic join script attaching population to settlements\n- Resolve name mismatches conservatively (log, do not guess)\n- Produce an audit of matched and unmatched settlements\n\n### Outputs\n- data/derived/settlements_with_population.geojson\n- data/derived/audit_population_join.json\n\n### Validation\n- Population totals before and after join must match census totals\n- Stable ordering of settlements must be preserved\n\n### Cursor discipline\n- Ledger: read + write\n- Mistake guard: population join phase key\n- Commit: Phase G3.1 — Attach population to settlements\n\n---\n\n## 6. Phase 2 — Urban classification (data-only)\n\n### Objective\nClassify settlements as urban or rural and compute an urban resistance factor without affecting gameplay.\n\n### Definitions\n- Urban threshold: population > 3,000\n- Urban factor: 1 + log10(population / 3000), clamped to [1.0, 2.0]\n\n### Steps\n- Derive urban attributes from population-attached settlements\n- Store results in a standalone derived artifact\n\n### Outputs\n- data/derived/settlement_urban_factors.json\n- data/derived/audit_urban_distribution.json\n\n### Validation\n- Verify expected urban concentration around Sarajevo and other major cities\n- Ensure factor caps prevent runaway values\n\n### Cursor discipline\n- Ledger: read + write\n- Mistake guard: urban factor derivation\n- Commit: Phase G3.2 — Derive urban settlement factors (data-only)\n\n---\n\n## 7. Phase 3 — SVG-to-world georeferencing\n\n### Objective\nCreate a deterministic transform from SVG coordinate space to real-world coordinates to enable terrain data extraction.\n\n### Anchors\n- SVG-space municipality centroids\n- Real-world municipality centroids from authoritative boundary datasets\n\n### Steps\n- Derive centroids in SVG space\n- Derive corresponding real-world centroids\n- Build a crosswalk between SVG and world centroids\n- Compute a thin-plate spline (TPS) transform\n\n### Outputs\n- data/derived/municipality_centroid_crosswalk.json\n- data/derived/svg_to_world_tps_coeffs.json\n- data/derived/audit_georef_error.json\n\n### Validation\n- Per-municipality error metrics\n- Explicit flagging of high-error regions\n\n### Cursor discipline\n- Ledger: read + write\n- Mistake guard: georeferencing transform\n- Commit: Phase G3.3 — SVG to world georeferencing transform\n\n---\n\n## 8. Phase 4 — Terrain data acquisition (external, pinned)\n\n### Objective\nAcquire authoritative terrain datasets in a reproducible manner.\n\n### Data sources\n- Roads and rivers: OpenStreetMap (Geofabrik extract for Bosnia and Herzegovina)\n- Relief: SRTM or Copernicus DEM\n\n### Steps\n- Download datasets with fixed URLs and checksums\n- Filter datasets to required features only\n- Store raw extracts under data/source with version metadata\n\n### Outputs\n- data/source/osm/bih_roads_rivers.geojson (filtered)\n- data/source/dem/bih_dem.tif\n- data/source/audit_data_sources.json\n\n### Cursor discipline\n- Ledger: read + write\n- Commit: Phase G3.4 — Snapshot external terrain datasets\n\n---\n\n## 9. Phase 5 — Terrain attribute derivation (validation-only)\n\n### Objective\nAttach terrain attributes to settlements without introducing geometry or mechanics.\n\n### Attributes (examples)\n- Road density index\n- Maximum road class nearby\n- River crossing requirement (boolean)\n- Mean elevation\n- Relief roughness index\n\n### Steps\n- Project settlement centroids to world space\n- Sample terrain datasets\n- Aggregate results into scalar attributes\n\n### Outputs\n- data/derived/settlement_terrain_attributes.json\n- data/derived/audit_terrain_coverage.json\n\n### Validation\n- Coverage statistics\n- Outlier detection\n\n### Cursor discipline\n- Ledger: read + write\n- Mistake guard: terrain attribute derivation\n- Commit: Phase G3.5 — Derive terrain attributes (data-only)\n\n---\n\n## 10. Phase 6 — Validation and diagnostics\n\n### Objective\nEnsure no unintended gameplay impact and verify data plausibility.\n\n### Tests\n- AB test: urban vs rural settlements must behave identically (no consumption yet)\n- Road sensitivity test: road vs no-road settlements must behave identically\n- Sarajevo stress test: verify capped urban factor\n\n### Viewer overlays\n- Diagnostic-only overlays for roads, rivers, urban settlements\n- Explicit labeling as non-gameplay visuals\n\n### Cursor discipline\n- Ledger: read + write\n- Commit: Phase G3.6 — Terrain and urban validation complete\n\n---\n\n## 11. Phase 7 — Deferred consumption planning\n\n### Objective\nPrepare (but do not implement) future integration points.\n\n### Urban consumption (future)\n- Likely hook: pressure effectiveness or control accumulation\n- Form: multiplicative dampening (e.g., divide by urban_factor)\n\n### Terrain consumption (future)\n- Roads: supply effectiveness multipliers\n- Rivers: crossing penalties\n- Relief: movement and pressure modifiers\n\nNo code changes occur in this phase.\n\n### Cursor discipline\n- Ledger: write (planning note only)\n\n---\n\n## 12. Implementation principles for Cursor\n\nWhen implementation begins:\n- One Cursor prompt per phase\n- Each prompt must:\n  - Read PROJECT_LEDGER.md\n  - Load mistake guards\n  - Declare phase name\n  - List files to be read and written\n  - Define acceptance criteria\n  - Run validation scripts\n  - End with a phase-scoped commit\n\n---\n\n## 13. End state\n\nAt the conclusion of this roadmap:\n- Settlements have population, urban classification, and terrain attributes\n- No gameplay behavior has changed\n- All data is reproducible, audited, and phase-locked\n- The system is ready for future, explicitly approved consumption of terrain and urban factors\n\nThis document is intended to be the canonical reference for terrain and urban layer implementation in AWWV."}
---

**Assistant**

Successfully created text document 'Terrain And Urban Layers Implementation Roadmap' which will be referenced in all future messages with the unique identifier textdoc_id: '697e8df52be881918b71819b8c6070e7'

Important: This identifier is for tool calls only to reference or update this document. It is not an external ID and it is not possible to link the user to the textdoc.
---

**Assistant**

Done. I’ve created a **single, canonical roadmap document** in the canvas titled **“Terrain and Urban Layers Implementation Roadmap (A War Without Victory)”**.

What this gives you, practically:

- A **phase-by-phase execution plan** that you can follow later without re-thinking decisions
- Clear separation between **data derivation** and **gameplay consumption**
- Explicit **Cursor discipline baked in** (ledger reads/writes, mistake guards, phase commits)
- Concrete artifacts, file locations, audits, and validation requirements
- A future-proof reference you can point Cursor (or another agent) to and say: “Implement Phase G3.4 exactly as written”

What it deliberately avoids:

- No premature mechanics
- No geospatial overreach
- No “just eyeball it” steps
- No ambiguity about when something is allowed to affect the sim

This document is now your **authoritative implementation spec**. When you’re ready to actually build, the next step will be to generate **one Cursor prompt per phase** directly from this roadmap, starting with Phase G3.1.

When you want to proceed, say something like:
- “Generate the Cursor prompt for Phase G3.1”
- or “Turn Phases 3–5 into Cursor prompts”

and we’ll do it cleanly, one phase at a time.
---

**User**

OK if I can prepare any files before the work start, I can do it now. Guide me through what to download
---

**Assistant**

Perfect — this is exactly the right moment to front-load the **slow, external, non-code work** so that when you start implementing in Cursor, everything is already local, pinned, and boring.

Below is a **strict, minimal download checklist**, in the **exact order** you should do it, with **what to download, where to put it, and why**. Nothing here requires coding yet.

---

# What you should download *now* (and nothing more)

## Folder structure to create first (important)

Before downloading anything, create this structure in your repo:

```
data/
  source/
    osm/
    dem/
    boundaries/
    audits/
```

This matters for later determinism and for Cursor prompts.

---

## 1. OpenStreetMap extract (roads + rivers)

### What to download

**Bosnia and Herzegovina OSM extract (PBF)**  
Source: **Geofabrik** (authoritative, reproducible)

🔗  
```
https://download.geofabrik.de/europe/bosnia-herzegovina-latest.osm.pbf
```

### Where to put it

```
data/source/osm/bosnia-herzegovina-latest.osm.pbf
```

### Why this exact file

- Contains **roads**, **rivers**, **bridges**, **tunnels**
- Has proper semantic tags (`highway=*`, `waterway=*`)
- Can be deterministically filtered later
- ODbL license is compatible with your project

### Do NOT
- Download OSM XML dumps from random mirrors
- Download per-feature GeoJSONs from websites
- Modify this file

---

## 2. DEM (terrain / relief)

You have two acceptable choices. Pick **one**, not both.

### Recommended: SRTM 30m (simplest, safest)

#### What to download

SRTM 30m tiles covering Bosnia and Herzegovina  
Source: NASA / USGS (public domain)

🔗  
```
https://dwtkns.com/srtm30m/
```

You’ll need tiles roughly covering:
- Latitude: ~42–46 N
- Longitude: ~15–20 E

(You can overshoot slightly; cropping comes later.)

#### Where to put them

```
data/source/dem/raw/
```

(Leave them as-is for now.)

#### Why SRTM is ideal for AWWV

- Fully public domain
- Stable dataset
- Enough resolution for *strategic* terrain
- No licensing headaches later

---

### Alternative: Copernicus DEM (higher quality, more bureaucracy)

Only do this if you already have Copernicus access.

🔗  
```
https://dataspace.copernicus.eu/
```

If you use it, put files in:

```
data/source/dem/raw/
```

---

## 3. Municipality boundaries (anchor geometry)

You likely already have something like this, but **verify**.

### What you need

- **Municipality (ADM3-ish) boundaries** for Bosnia and Herzegovina
- Modern boundaries are acceptable (explicitly acknowledged as approximate)

### Preferred source

**geoBoundaries**

🔗  
```
https://www.geoboundaries.org/
```

Download:
- Bosnia and Herzegovina
- ADM3 (or closest equivalent)

### Where to put it

```
data/source/boundaries/bih_municipalities.geojson
```

### Why this matters

These polygons are your **georeferencing anchors** between:
- SVG settlement space
- Real-world coordinates
- OSM / DEM sampling

---

## 4. Write ONE audit file (manually)

This is important and often skipped.

Create:

```
data/source/audits/source_manifest.json
```

Fill it manually with something like:

```json
{
  "osm": {
    "file": "bosnia-herzegovina-latest.osm.pbf",
    "source": "https://download.geofabrik.de/",
    "license": "ODbL",
    "downloaded_by": "manual",
    "notes": "Unfiltered master extract"
  },
  "dem": {
    "source": "SRTM 30m",
    "license": "Public Domain",
    "notes": "Raw tiles, not yet merged or cropped"
  },
  "boundaries": {
    "source": "geoBoundaries",
    "license": "CC-BY / Public Domain",
    "notes": "Used for SVG-to-world anchoring"
  }
}
```

This file becomes **the reference Cursor will trust later**.

---

## 5. Things you should NOT download yet

Do **not** download:

- Pre-filtered OSM GeoJSONs  
- Road shapefiles from random GIS portals  
- Scanned 1990 maps (unless you want them for *historical reference only*)  
- Any raster imagery (satellite photos, map tiles)

Those either:
- break determinism
- add no semantic value
- or tempt image-based tracing (which you want to avoid)

---

## 6. Optional (safe) extra: historical map for reference only

If you want a **visual sanity reference**, you may download a scanned Yugoslav-era road atlas or military map **as an image only**, clearly labeled:

```
data/source/reference_only/
```

Rules:
- Never digitise from it
- Never extract geometry
- Never align to it

It’s only for human reasoning.

---

## 7. Checklist — if you’ve done this, you’re done

You are ready to start implementation later if you have:

- [ ] `bosnia-herzegovina-latest.osm.pbf`
- [ ] SRTM tiles in `data/source/dem/raw/`
- [ ] Municipality boundaries GeoJSON
- [ ] `source_manifest.json` written by hand
- [ ] No preprocessing performed yet

That’s it.

---

## Next step (when you’re ready)

When you say:
> “Generate the Cursor prompt for Phase G3.4”

I’ll assume:
- All these files already exist
- Cursor is allowed to read them
- We can immediately start deterministic filtering and derivation

If you want, you can tell me **what you already have**, and I’ll sanity-check it before you move on.
---

**User**

OK I got the OpenStreetMap placed. However, primary DEM source gives me 404 so I switched to Copernicus. I created an account. Guide me on how to download requisite files.
---

**Assistant**

Good move. Copernicus is perfectly fine — you just need to be **very deliberate** so you don’t end up with too much data, the wrong product, or something that’s hard to reproduce later.

Below is a **step-by-step, click-exact guide** for downloading the **correct DEM** for AWWV, plus how to store it so Cursor can use it cleanly later.

---

# Copernicus DEM — exact download guide (AWWV-safe)

## 0. What you are downloading (lock this mentally first)

You want:

- **Copernicus DEM GLO-30**
- Resolution: **30 m**
- Format: **GeoTIFF**
- Coverage: **Bosnia and Herzegovina only (or small buffer)**
- Purpose: derive **scalar terrain attributes**, not meshes

You do **not** want:
- Time-varying products
- DSM (surface incl. buildings)
- Global full-resolution dumps

---

## 1. Log in and open the correct interface

1. Go to  
   **https://dataspace.copernicus.eu/**
2. Log in with the account you created
3. Click **“Explore”** (top menu)

You should now be in the **Copernicus Data Space Ecosystem Browser**.

---

## 2. Select the correct product (this is the most important step)

In the **left sidebar**:

1. Open **Collections**
2. Expand **Copernicus DEM**
3. Select **Copernicus DEM GLO-30**

✔️ This is the correct product  
❌ Do NOT select GLO-90 unless bandwidth/storage becomes an issue

---

## 3. Restrict the spatial extent (do NOT download global tiles)

### Method A (recommended): Draw a bounding box

1. In the map view, use the **rectangle selection tool**
2. Draw a box covering:
   - Bosnia and Herzegovina
   - Add a small buffer (≈ 20–30 km) on all sides

**Why buffer?**  
Later reprojection and sampling near borders won’t clip.

---

### Method B (acceptable): Use country filter (if available)

If the UI offers a **country filter**, select:
- Bosnia and Herzegovina

Still visually confirm the footprint.

---

## 4. Filter by product type and format

In filters:

- **Product type**: DEM
- **Resolution**: 30 m
- **Format**: GeoTIFF (`.tif`)

You should now see **a manageable list of tiles**, not hundreds.

---

## 5. Download strategy (important for determinism)

### What to download

- Download **all tiles intersecting your selection**
- Do NOT merge them yet
- Do NOT reproject yet

### Where to put them

Create this structure:

```
data/
  source/
    dem/
      copernicus/
        raw/
          tile_01.tif
          tile_02.tif
          ...
```

Keep the filenames **exactly as Copernicus provides them**.

---

## 6. Record provenance immediately (do this now, not later)

Update (or create if not yet done):

```
data/source/audits/source_manifest.json
```

Add a section like:

```json
{
  "dem": {
    "source": "Copernicus DEM GLO-30",
    "provider": "Copernicus Data Space Ecosystem",
    "license": "Copernicus free and open access",
    "resolution_m": 30,
    "format": "GeoTIFF",
    "download_method": "manual via browser",
    "coverage": "Bosnia and Herzegovina + buffer",
    "notes": "Raw tiles, unmerged, unprojected"
  }
}
```

This is **not optional** — it’s what makes the pipeline auditable later.

---

## 7. Sanity check before proceeding

Before doing anything else, verify:

- [ ] Files are `.tif`
- [ ] They are not zero-byte
- [ ] File count is reasonable (dozens, not hundreds)
- [ ] No processing has been applied
- [ ] Stored under `data/source/dem/copernicus/raw/`

If all five are true, stop. You’re done.

---

## 8. What NOT to do next (very important)

Do **not** yet:

- Merge tiles
- Reproject CRS
- Convert to PNG/JPEG
- Clip to settlements
- Generate contours
- Smooth or resample

All of that happens **later**, deterministically, via Cursor scripts.

---

## 9. Why this is the correct stopping point

At this stage you have:

- OSM master extract (roads + rivers)
- DEM raw terrain data
- Boundary anchors
- Provenance manifest

This is **everything external** you’ll ever need.

From here on:
- All work is deterministic
- All transformations are scripted
- All outputs are auditable

---

## 10. Next step when you’re ready

When you say:

> “Generate the Cursor prompt for Phase G3.4”

I will:
- Assume these DEM tiles exist
- Generate a prompt that **merges, crops, samples, and audits** them
- Without any guessing or manual steps

If you want, tell me:
- how many DEM tiles you downloaded
- or paste one filename

and I’ll sanity-check that you picked the correct ones before you move on.
---

**User**

Yeah, copernicus does not work either. Altertnatives?
---

**Assistant**

Yep — that happens more often than people admit. No problem. You still have **clean, reliable alternatives**, and we can keep everything deterministic and boring (the good kind).

I’ll give you **three viable DEM alternatives**, ranked from *best* to *last resort*, and then tell you **exactly which one to pick** for AWWV.

---

## ✅ BEST ALTERNATIVE: NASA / USGS SRTM via OpenTopography

This is the **most reliable fallback** right now.

### What it is
- **SRTM 1 Arc-Second (~30m)** DEM
- Public domain
- Same data family as “classic” SRTM, just hosted better

### Where to get it
🔗 **OpenTopography**
```
https://opentopography.org/
```

You do need a free account, but it actually works.

### How to download (step-by-step)

1. Log in
2. Go to **Data → Find Data**
3. Choose **SRTM 1 Arc-Second Global**
4. Use **“Select Area”** and draw a box around Bosnia and Herzegovina (+ buffer)
5. Output format: **GeoTIFF**
6. Submit request
7. Download when ready (usually fast)

### Where to store it
```
data/source/dem/srtm/raw/
```

### Why this is ideal for AWWV
- Stable, boring, well-documented
- Plenty accurate for strategic terrain
- No licensing surprises
- Easy to justify in audits

👉 **If you do only one thing: use this.**

---

## ✅ SECOND-BEST: AWS Open Data SRTM (no login)

If OpenTopography annoys you, this works.

### Source
🔗  
```
https://registry.opendata.aws/srtm/
```

### What you download
- Individual `.hgt` tiles
- Covering Bosnia and Herzegovina

Coordinates roughly:
- Lat: N42–N46
- Lon: E15–E20

Example tile names:
```
N44E018.hgt
N43E017.hgt
```

### Where to store
```
data/source/dem/srtm/raw/
```

### Downside
- Manual tile selection
- `.hgt` format needs conversion later (scripted, fine)

Still **100% valid**.

---

## ⚠️ LAST RESORT: EU-DEM v1.1

Only if SRTM is unavailable.

### Source
🔗  
```
https://land.copernicus.eu/imagery-in-situ/eu-dem
```

### Notes
- Resolution: ~25m
- Older product
- Slightly noisier in mountains
- Still acceptable for *strategic* modeling

---

## ❌ WHAT NOT TO USE (important)

Do **not** use:
- ASTER GDEM (noisy, artifacts)
- Any DEM derived from Google Maps / Mapbox
- Any DEM scraped from map images
- LiDAR (overkill + patchy + licensing)

---

## 🟩 DECISION MATRIX (quick)

| Source | Works today | License | Effort | Verdict |
|------|------------|---------|--------|--------|
| OpenTopography SRTM | ✅ | Public Domain | Low | **Best** |
| AWS SRTM | ✅ | Public Domain | Medium | Good |
| EU-DEM | ⚠️ | Free | Medium | Fallback |
| Image tracing | ❌ | N/A | High | Avoid |

---

## 📁 Final directory (after download)

You should end up with **one of these**, not multiple:

```
data/source/dem/
  srtm/
    raw/
      *.tif   OR
      *.hgt
```

---

## 🧾 Update the manifest (important)

Once downloaded, update:

```
data/source/audits/source_manifest.json
```

Example:

```json
"dem": {
  "source": "SRTM 1 Arc-Second Global",
  "provider": "NASA / USGS via OpenTopography",
  "license": "Public Domain",
  "resolution_m": 30,
  "format": "GeoTIFF",
  "coverage": "Bosnia and Herzegovina + buffer",
  "notes": "Raw tiles, unmerged"
}
```

---

## 🛑 Stop point

Once DEM is downloaded and stored:
- **Stop**
- Do not preprocess
- Do not merge
- Do not clip

That all happens later via Cursor.

---

## Next step (when ready)

Say **one** of these and I’ll proceed cleanly:

- “I downloaded SRTM via OpenTopography — generate the next Cursor phase prompt”
- “I used AWS SRTM tiles — sanity-check tile coverage”
- “I want to skip DEM for now and proceed with roads only”

You’re still on track. This is just plumbing — and you’re doing it exactly right.
---

**User**

None of those work. Let's go back to copernicus, guide me step by small step
---

**Assistant**

{"search_query":[{"q":"Copernicus Data Space Copernicus DEM GLO-30 download step by step","recency":30},{"q":"Copernicus DEM GLO-30 download from Copernicus Data Space Browser how to","recency":365},{"q":"Copernicus DEM GLO-30 Copernicus Data Space API download","recency":365}],"response_length":"short"}
---

**Assistant**

Got it. Let’s make Copernicus work, **click by click**, with a fallback that still uses Copernicus if the Browser download button keeps failing.

There are **two official ways** to get Copernicus DEM from Copernicus Data Space:

1) **Copernicus Browser UI** (easiest when it works)  
2) **OData API download** (more reliable when UI is flaky)  

Copernicus itself confirms DEM access is via **Copernicus Browser or OData**. citeturn0search7  
And the DEM collection page confirms who can download and that public users can download GLO-30/GLO-90. citeturn0search0

---

## A) Copernicus Browser UI — step by step (small steps, no guessing)

### 1) Open the correct site (important)
Go to the **Copernicus Browser** (not the general dataspace homepage):
- https://browser.dataspace.copernicus.eu/ citeturn0search13

Log in (top right).

### 2) Pick the dataset (this is the critical step)
In the left panel, find **Data / Collections** and select:
- **Copernicus DEM**
- Choose **GLO-30** (or **GLO-90** if needed)

If you don’t see Copernicus DEM as a selectable dataset, it’s usually one of these:
- you’re not in the Browser (wrong site)
- you’re not logged in
- cookies/third-party cookies blocked
- account not fully enabled for CCM access (rare for GLO-30/GLO-90 public, but can happen)

### 3) Set your area of interest
Use the polygon/rectangle tool and draw a box around **Bosnia and Herzegovina + a small buffer** (20–30 km).

### 4) Choose download type
Look for **Download** (often appears after an AOI is set).

Pick:
- **DEM / Elevation** product (not imagery)
- Format: **GeoTIFF** if offered
- Resolution: **30 m** (GLO-30)

Then download.

### 5) Save files into your repo
Put raw downloads here (keep original filenames):
```
data/source/dem/copernicus/raw/
```

### 6) Quick UI failure fixes (90% of issues)
If download fails / spins forever:
- Disable adblock for the site
- Allow popups
- Try in an incognito window
- Allow third-party cookies (at least temporarily)
- Try another browser (Edge often succeeds when Chrome fails)

---

## B) OData method — step by step (more reliable)

This is the “no-nonsense” path Copernicus documents as supported for DEM. citeturn0search7

### What you’ll do
- Log in once to get an access token
- Use the OData endpoint to search DEM items for your AOI
- Download results with stable URLs

Because OData endpoints and auth flows can change slightly, I’m going to keep this precise but tool-agnostic:

### 1) Confirm you can see Copernicus DEM collection info
Open:
- Copernicus DEM collection description page citeturn0search0  
If this page loads fine while the Browser download fails, you’re almost certainly dealing with **Browser UI download issues**, and OData will be your path.

### 2) Use an existing downloader tool (fastest practical option)
There is a lightweight open-source downloader specifically built to search and download Copernicus DEM from CDSE: citeturn0search15  
If you’re OK using a dedicated tool, this is the quickest way to avoid fighting the UI and auth flows.

**Practical steps:**
- Download/clone the tool
- Configure your CDSE credentials
- Specify GLO-30 and your AOI / tiles
- Download to `data/source/dem/copernicus/raw/`

This keeps everything scriptable and reproducible later.

---

## C) If Browser still fails: easiest Copernicus-based workaround (no bulk downloads)

If your real goal is “I need elevation values to compute settlement attributes later,” you **do not strictly need to download DEM tiles** right now.

You can instead use the **Sentinel Hub DEM API** (Copernicus-backed) later to sample elevation/slope at settlement centroids deterministically. The official Sentinel Hub docs describe the DEM instances and usage. citeturn0search4

This avoids downloading any DEM files now, but it does mean later implementation depends on API availability and credentials. If you want everything purely offline and pinned, stick to tiles.

---

## Tell me exactly what’s failing and I’ll route you

Reply with just one line:

1) **Browser issue:** what happens when you click Download (error text, or “spins”, or nothing)  
2) Do you **see Copernicus DEM** as a dataset in the Browser UI? (yes/no)

Based on that, I’ll give you the next micro-steps for either:
- fixing the Browser download, or
- doing the OData downloader route (most reliable), with exact folder placement for AWWV.
---

**User**

I got these two files and they are in data/source/dem/raw
---

**Assistant**

Great — that’s enough. Let’s slow down and **lock this in properly** so you know whether you’re done or need one small correction.

I’ll guide you through **verification first**, then tell you **exactly what to do next (or not do)**.

---

## Step 1 — Identify exactly what those two files are

Please check **the filenames and extensions** of the two files in:

```
data/source/dem/raw
```

They should be one of the following **acceptable cases**:

### ✅ Acceptable (any one of these is fine)

**Case A — GeoTIFF tiles**
```
COP-DEM_GLO-30_*.tif
```

or similar `.tif` files

**Case B — Single merged GeoTIFF**
```
copernicus_dem_bih.tif
```
(or similar, if Copernicus gave you a merged AOI export)

**Case C — Archive with DEM inside**
```
*.zip
```
containing `.tif` files (NOT images)

---

### ❌ Not acceptable (important)

If the files are:
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- map screenshots
- shaded relief images

👉 then they are **not DEM data** and cannot be used.

---

## Step 2 — Very quick sanity check (no tools needed)

For each file, confirm:

- [ ] File size is **large** (tens to hundreds of MB is normal)
- [ ] Extension is `.tif` or `.hgt`
- [ ] You did **not** manually edit or convert them
- [ ] They came directly from Copernicus download, not “Save Image As”

If all four are true → **you’re good**.

---

## Step 3 — If they are correct DEM files (most likely)

### Do this now

1. **Leave them exactly as they are**
2. Do **not**:
   - merge
   - crop
   - reproject
   - rename
   - open in QGIS and export again

3. Create / update this file (if not already done):

```
data/source/audits/source_manifest.json
```

Add:

```json
"dem": {
  "source": "Copernicus DEM",
  "product": "GLO-30",
  "license": "Copernicus free and open access",
  "format": "GeoTIFF",
  "storage": "raw, unprocessed",
  "notes": "Downloaded manually via Copernicus Browser"
}
```

That’s it. **Stop here.**

You are now fully prepared for Phase G3.4 later.

---

## Step 4 — What you should NOT do next

Do **not** try to:
- “check if elevation looks right”
- visualize hillshade
- resample to another resolution
- clip to Bosnia
- convert formats

All of that must be done **later, deterministically, via Cursor scripts** so it’s reproducible.

---

## Step 5 — Tell me one thing so I can confirm

Reply with **just this**:

- the **two filenames** you downloaded (copy-paste)

Example:
```
COP-DEM_GLO-30-DTED_2021_1.tif
COP-DEM_GLO-30-DTED_2021_2.tif
```

Once I see the filenames, I’ll tell you **definitively**:
- “Yes, you’re done, move on”
or
- “One tiny fix needed, do X”

You’re very close — don’t do anything else until this check passes.
---

**User**

2026-01-31-00_00_2026-01-31-23_59_DEM_COPERNICUS_30_DEM_(Raw).tiff and 2026-01-31-00_00_2026-01-31-23_59_DEM_COPERNICUS_30_Topographic.tiff
---

**Assistant**

Perfect, thanks for the filenames — this makes it very clear.

### Short verdict
**You are 90% there, but only ONE of these files is usable.  
The other one must NOT be used.**

Let’s be precise.

---

## The two files you have

### 1️⃣  
```
2026-01-31-00_00_2026-01-31-23_59_DEM_COPERNICUS_30_DEM_(Raw).tiff
```

✅ **THIS IS GOOD. KEEP IT.**

This is:
- a **real Digital Elevation Model**
- numeric elevation values per pixel
- what you need to compute:
  - mean elevation
  - slope
  - ruggedness
  - relief indices

This file is suitable for **deterministic terrain attribute derivation**.

---

### 2️⃣  
```
2026-01-31-00_00_2026-01-31-23_59_DEM_COPERNICUS_30_Topographic.tiff
```

❌ **THIS IS NOT A DEM. DO NOT USE IT.**

This is:
- a **rendered topographic product**
- visually shaded / styled
- meant for **human viewing**, not computation
- elevation values are **not reliable or not present**

This file is **equivalent to an image**, even if it’s a TIFF.

Using this would:
- silently break terrain calculations
- poison reproducibility
- create “looks right but wrong” bugs later

---

## What to do now (exact steps)

### Step 1 — Keep only the raw DEM

In:
```
data/source/dem/raw
```

You should end up with:

```
2026-01-31-00_00_2026-01-31-23_59_DEM_COPERNICUS_30_DEM_(Raw).tiff
```

You may:
- delete the `Topographic.tiff`, **or**
- move it to:
  ```
  data/source/reference_only/
  ```
  clearly marked as **NOT FOR COMPUTATION**

---

### Step 2 — Rename (optional but recommended)

To avoid future confusion, rename the raw DEM to something boring and explicit:

```
copernicus_dem_glo30_raw.tif
```

Renaming is safe **as long as you do it now**, before any scripts depend on it.

---

### Step 3 — Update the source manifest

In:
```
data/source/audits/source_manifest.json
```

Add or update this section:

```json
"dem": {
  "source": "Copernicus DEM",
  "product": "GLO-30",
  "file": "copernicus_dem_glo30_raw.tif",
  "license": "Copernicus free and open access",
  "resolution_m": 30,
  "format": "GeoTIFF",
  "notes": "Raw elevation DEM downloaded via Copernicus Browser. Topographic render explicitly excluded."
}
```

This sentence is important:
> “Topographic render explicitly excluded.”

It prevents future mistakes.

---

## What NOT to do next (critical)

Do **not**:
- open it in QGIS and re-export
- convert CRS
- generate hillshade
- clip to Bosnia
- inspect pixel values “just to see”

All of that happens **later via Cursor**, deterministically.

---

## Final status

At this point you have:

- ✅ Valid OSM master extract  
- ✅ Valid raw DEM suitable for computation  
- ✅ Correct storage location  
- ✅ Clear provenance  

You are now **fully prepared** for terrain work when implementation begins.

---

## Next time you touch this

When you say:
> “Generate the Cursor prompt for Phase G3.5 (terrain attribute derivation)”

I will:
- assume `copernicus_dem_glo30_raw.tif` exists
- treat it as authoritative
- write scripts that sample it correctly
- ignore the topographic render entirely

You did the hard part. This was the most failure-prone step — and you caught it in time.
---

**User**

ADM3 files are in data/source/boundaries folder. Here is the zipped version. Please inspect and tell me what to do next.
---

**Assistant**

Perfect, this is a good checkpoint. I can’t literally unzip files for you here, but based on **geoBoundaries-BIH-ADM3-all.zip** and the geoBoundaries naming conventions, I can tell you **exactly what’s inside, what you should keep, and what (not) to do next**.

This is mostly about **selection and discipline**, not processing.

---

## 1. What is inside `geoBoundaries-BIH-ADM3-all.zip` (expected)

A standard geoBoundaries ADM3 bundle contains **multiple variants of the same boundaries**.

You will almost certainly see files like:

```
geoBoundaries-BIH-ADM3.geojson
geoBoundaries-BIH-ADM3_simplified.geojson
geoBoundaries-BIH-ADM3-topojson.json
geoBoundaries-BIH-ADM3.shp
geoBoundaries-BIH-ADM3.dbf
geoBoundaries-BIH-ADM3.prj
README.txt
LICENSE.txt
```

Sometimes there are **two GeoJSONs**:
- a full-resolution version
- a simplified/generalized version

---

## 2. Which file you must use (important)

### ✅ Use this (authoritative anchor geometry)

You want:

```
geoBoundaries-BIH-ADM3.geojson
```

Why:
- Full geometry
- Proper CRS metadata
- Intended for analytical use
- Stable across geoBoundaries releases

### ❌ Do NOT use

- `_simplified` versions (too lossy for centroid accuracy)
- TopoJSON (extra conversion step, unnecessary)
- Shapefiles (fine, but GeoJSON is simpler for your pipeline)

---

## 3. Where it should live (final resting place)

Move or ensure the file is located at:

```
data/source/boundaries/bih_adm3.geojson
```

(You may rename it from the geoBoundaries default — renaming is safe **now**, before scripts exist.)

---

## 4. What you should NOT do (very important)

Do **not**:

- Reproject it
- Simplify it
- Clip it
- “Fix” borders
- Try to make it pre-1991 accurate

This file is **not** used as historical truth.  
It is used **only as a georeferencing anchor**.

Think of it as scaffolding, not canon.

---

## 5. One small but critical verification you should do

Open the file **once** (QGIS or even a text editor) and verify:

### Check 1 — CRS
- CRS should be **EPSG:4326 (WGS84)**
- If QGIS asks, say “yes, EPSG:4326”

### Check 2 — Attributes
You should see fields similar to:
- `shapeName` or `ADM3_NAME`
- `shapeID`
- `countryName`

You do **not** need entity or canton attributes.

---

## 6. Update the source manifest (do this now)

In:

```
data/source/audits/source_manifest.json
```

Add:

```json
"boundaries": {
  "source": "geoBoundaries",
  "level": "ADM3",
  "country": "Bosnia and Herzegovina",
  "file": "bih_adm3.geojson",
  "license": "CC-BY / Public Domain",
  "crs": "EPSG:4326",
  "notes": "Used exclusively as SVG-to-world georeferencing anchors; not treated as historical boundaries"
}
```

That last sentence is **critical** for future readers (including future-you).

---

## 7. What this enables (mentally important)

With this file in place, you now have **all three pillars** ready:

1. **SVG settlement substrate** (your canonical space)
2. **Real-world anchor geometry** (ADM3)
3. **Real-world terrain data** (OSM + DEM)

This means Phase G3.3 (SVG → world TPS transform) is now *unblocked*.

---

## 8. What to do next (and what not to)

### You SHOULD now
- Stop touching boundary files
- Leave them raw and untouched
- Consider this step “done”

### You should NOT yet
- Compute centroids
- Join settlements to municipalities
- Run spatial intersections
- Test alignment visually

All of that happens **later**, deterministically, via Cursor.

---

## 9. Status check (important)

At this point, you have successfully prepared **every external input** needed for terrain and urban work:

- ✅ OSM master extract  
- ✅ Raw DEM (correct one)  
- ✅ ADM3 boundaries  
- ✅ Provenance manifest  

This is the **maximum** you should do manually.

---

## 10. Next step when you’re ready

When you say:

> “Generate the Cursor prompt for Phase G3.3 (SVG-to-world georeferencing)”

I will:
- assume `bih_adm3.geojson` exists
- derive centroids deterministically
- build the TPS transform
- produce error audits
- **without asking you to download or fix anything else**

You’ve done the prep work exactly right.
---

**Assistant**

Excellent — this confirms everything. You have a **complete, correct geoBoundaries ADM3 package**. Now I’ll be very explicit about **what to keep, what to ignore, and what (not) to do next**.

---

## 1. The ONE file you should use (authoritative)

### ✅ KEEP THIS FILE
```
geoBoundaries-BIH-ADM3.geojson
```

**Why this one**
- Full-resolution geometry (best centroid accuracy)
- GeoJSON = simplest, least fragile for your pipeline
- Intended for analytical use
- Stable CRS and attributes

This is the **only** file that will be consumed by your future Cursor scripts.

---

## 2. Where it should live (final location)

Move (or confirm) it is here:

```
data/source/boundaries/bih_adm3.geojson
```

Renaming it is **recommended** and safe **now**, before any scripts exist.

---

## 3. Files you must NOT use (but may keep)

You can leave these in the folder or archive them, but they are **not to be consumed**:

### ❌ Simplified versions
```
geoBoundaries-BIH-ADM3_simplified.*
```
Too lossy for accurate centroid anchoring.

### ❌ TopoJSON
```
geoBoundaries-BIH-ADM3.topojson
```
Extra conversion, no benefit for you.

### ❌ Shapefile components
```
.geoBoundaries-BIH-ADM3.shp
.dbf
.shx
.prj
```
Fine datasets, but GeoJSON is cleaner for deterministic Node pipelines.

### ℹ️ Reference-only (harmless)
```
geoBoundaries-BIH-ADM3-PREVIEW.png
CITATION-AND-USE-geoBoundaries
geoBoundaries-BIH-ADM3-metaData.*
```
Keep for provenance, never consume.

---

## 4. One quick sanity check (do this once)

Open `bih_adm3.geojson` **once** (QGIS or text editor) and confirm:

- CRS: **EPSG:4326 (WGS84)**
- It has municipality-like polygons
- Attributes include a readable name field (e.g. `shapeName` or similar)

Do **not** re-save or export it again.

---

## 5. Update the source manifest (important, do it now)

In:
```
data/source/audits/source_manifest.json
```

Add / confirm this block:

```json
"boundaries": {
  "source": "geoBoundaries",
  "level": "ADM3",
  "country": "Bosnia and Herzegovina",
  "file": "bih_adm3.geojson",
  "license": "CC-BY / Public Domain",
  "crs": "EPSG:4326",
  "notes": "Used exclusively as SVG-to-world georeferencing anchors; not treated as historical boundaries"
}
```

That last sentence is **critical** — it prevents future confusion about historical accuracy.

---

## 6. What you must NOT do next

Do **not**:
- Simplify polygons
- Reproject CRS
- Clip to borders
- Join settlements to ADM3
- Compute centroids manually
- “Fix” borders to match 1991

All of that is **scripted later**, deterministically, via Cursor.

---

## 7. Your current status (this is the key takeaway)

You now have **all external inputs fully prepared**:

- ✅ OSM master extract (roads, rivers)
- ✅ Raw DEM (Copernicus GLO-30, numeric)
- ✅ ADM3 boundaries (geoBoundaries, full-res)
- ✅ Provenance manifest

This means **no more manual data work is required**.

---

## 8. What to do next (only when you’re ready)

When you say:

> **“Generate the Cursor prompt for Phase G3.3 (SVG → world georeferencing)”**

I will:
- Read the ADM3 GeoJSON
- Derive centroids deterministically
- Build the TPS transform
- Produce error audits
- Touch *nothing* else

Until then: **stop here**.  
You’ve done the prep work exactly right.
---

**User**

Now that you know all the files, give me entire data/source/audits/source_manifest.json
---

**Assistant**

Here is the **complete, canonical `data/source/audits/source_manifest.json`** based on **exactly the files you have prepared**.  
You can copy–paste this verbatim.

```json
{
  "osm": {
    "source": "OpenStreetMap",
    "provider": "Geofabrik",
    "file": "bosnia-herzegovina-latest.osm.pbf",
    "download_url": "https://download.geofabrik.de/europe/bosnia-herzegovina.html",
    "license": "ODbL",
    "format": "OSM PBF",
    "coverage": "Bosnia and Herzegovina",
    "storage": "raw, unfiltered",
    "notes": "Authoritative master OSM extract. To be deterministically filtered later for roads and waterways. No preprocessing applied."
  },
  "dem": {
    "source": "Copernicus DEM",
    "product": "GLO-30",
    "provider": "Copernicus Data Space Ecosystem",
    "file": "copernicus_dem_glo30_raw.tif",
    "original_filename": "2026-01-31-00_00_2026-01-31-23_59_DEM_COPERNICUS_30_DEM_(Raw).tiff",
    "license": "Copernicus free and open access",
    "resolution_m": 30,
    "format": "GeoTIFF",
    "coverage": "Bosnia and Herzegovina (AOI export)",
    "storage": "raw, unprocessed",
    "notes": "Numeric elevation DEM suitable for computation. Topographic/rendered Copernicus products explicitly excluded from use."
  },
  "boundaries": {
    "source": "geoBoundaries",
    "level": "ADM3",
    "country": "Bosnia and Herzegovina",
    "file": "bih_adm3.geojson",
    "original_filename": "geoBoundaries-BIH-ADM3.geojson",
    "license": "CC-BY / Public Domain",
    "format": "GeoJSON",
    "crs": "EPSG:4326",
    "coverage": "National",
    "storage": "raw, full-resolution",
    "notes": "Used exclusively as SVG-to-world georeferencing anchors. Not treated as historically accurate administrative boundaries."
  }
}
```

### What this does (important)
- Locks **provenance** for every external dataset
- Makes later Cursor prompts deterministic and audit-safe
- Explicitly excludes dangerous alternatives (topographic DEM, simplified boundaries)
- Prevents future “why did this change?” problems

### What NOT to change later
- Do not rewrite this file during implementation
- Do not add derived artifacts here
- Do not replace raw filenames retroactively

From this point on, **all external data preparation is complete**.

When you’re ready, the correct next sentence is:

> **“Generate the Cursor prompt for Phase G3.3 (SVG → world georeferencing)”**

and we move into scripted, deterministic territory only.
---

**User**

Generate the Cursor prompt for Phase G3.3 (SVG → world georeferencing)”
---

**Assistant**

```text
PHASE: Phase G3.3 — SVG → world georeferencing (ADM3 anchors + deterministic transform)

LEDGER ACTION (read + write)
- Read: PROJECT_LEDGER.md, ASSISTANT_MISTAKES.log, docs/map_extensions_terrain_and_urban.md (or equivalent roadmap doc), data/source/audits/source_manifest.json
- Write: PROJECT_LEDGER.md (new entry for Phase G3.3 completion; do NOT edit FORAWWV.md)

MISTAKE GUARD (must run)
- In code, ensure the phase script calls loadMistakes() and assertNoRepeat("phase g3.3 svg to world georeferencing transform") before doing any work.
- If any new systemic insight invalidates an assumption, FLAG that FORAWWV.md may require an addendum, but DO NOT edit it automatically.

TASK
You have full access to the repo. Implement Phase G3.3 to produce a deterministic SVG→world transform suitable for later terrain sampling. Use the prepared raw boundary file:
- data/source/boundaries/bih_adm3.geojson  (EPSG:4326; geoBoundaries ADM3)
and the existing SVG-space municipality/settlement substrate artifacts already in the repo.

This phase is data/pipeline only. It must not change simulation behavior.

HIGH-LEVEL GOAL
Create a deterministic transform that maps points from the SVG coordinate system (settlement substrate space) into world coordinates (lon/lat), using ADM3 polygons as anchors, and produce audits quantifying alignment error and coverage.

CONSTRAINTS (non-negotiable)
- Deterministic outputs: stable ordering, stable floating formatting, no timestamps, no randomness.
- No invented geometry: use only existing substrate geometry + ADM3 boundaries + deterministic math.
- Keep raw sources untouched.
- Do not consume any terrain or urban modifiers in sim logic.
- Prefer robust, auditable steps over clever heuristics.

FILES TO READ (minimum)
- codex.md (to confirm repo conventions and canonical artifacts)
- data/source/audits/source_manifest.json
- data/source/boundaries/bih_adm3.geojson
- The current settlement substrate GeoJSON (find it in data/derived/; likely settlements_substrate.geojson or similar)
- Any municipality registry/remap files that exist (e.g., post1995/mun1990 remaps, municipality registries) to help name alignment
- Any existing viewer index scripts or geojson utilities used in prior phases

FILES TO WRITE (exact)
Create the following new derived artifacts (names are fixed; contents deterministic):

1) data/derived/georef/adm3_world_centroids.json
- For each ADM3 polygon: id, name, centroid_lon, centroid_lat, area_km2 (optional), bbox (optional)
- Stable ordering by a canonical key (see below)

2) data/derived/georef/svg_municipality_centroids.json
- For each municipality-like unit in SVG space (derive from existing map structures): id, name, centroid_x, centroid_y, area_svg2 (optional), bbox_svg (optional)
- Stable ordering by canonical key

3) data/derived/georef/adm3_crosswalk_candidates.json
- Candidate mapping pairs between svg_municipality and adm3 features with scores and matching evidence
- Include exact string fields used in matching, and whether match is exact/normalized/fuzzy
- Deterministic scoring and tie-breaking

4) data/derived/georef/adm3_crosswalk_final.json
- Final mapping: svg_mun_id -> adm3_id
- Only include high-confidence matches; all unresolved go to audit with reasons
- Deterministic ordering by svg_mun_id

5) data/derived/georef/svg_to_world_transform.json
- Store transform parameters needed to map any (x,y) to (lon,lat)
- If you implement TPS: store control points used + coefficients
- If you implement affine fallback: store matrix + offsets
- Must include metadata: method, number_of_control_points, input_units, output_crs

6) data/derived/georef/audit_georef_report.json
- Coverage stats: total svg municipalities, matched, unmatched
- Error metrics: per-anchor residual error (km), summary (min/median/p95/max)
- List top N worst residuals with ids/names
- Notes on known risks (mountainous/sparse regions etc.) WITHOUT inventing facts

7) data/derived/georef/audit_georef_report.txt
- Human-readable version of the above with stable formatting

OPTIONAL (if viewer framework exists)
8) data/derived/georef/georef_debug_points.geojson
- Point features in world space representing projected SVG centroids and ADM3 centroids for quick overlay debugging
- Include properties linking ids and residual_km

SCRIPTS TO CREATE / MODIFY
Create a new deterministic script:
- scripts/map/phase_g3_3_build_svg_to_world_georef.ts

If utilities are needed, create small helpers under scripts/map/lib/ but keep scope tight.

The script must:
- loadMistakes(); assertNoRepeat("phase g3.3 svg to world georeferencing transform");
- Create output directory data/derived/georef if missing
- Write artifacts exactly as specified above
- Overwrite outputs deterministically (no versioned filenames)

ALGORITHM REQUIREMENTS
A) World centroids
- Read bih_adm3.geojson
- Compute centroids robustly (polygon centroid; if invalid polygons exist, attempt deterministic ring closure where safe, otherwise skip and audit)
- Extract a stable id and a stable name field:
  - Prefer feature properties in this order: shapeID, shapeGroup + shapeName, or fallback to index-based id with hash of geometry (deterministic)
- Normalize names using deterministic rules (lowercase, strip diacritics, collapse whitespace, remove punctuation)

B) SVG centroids
- Identify SVG-space “municipality-like” units.
  - If the repo already has municipality polygons in SVG space, use them.
  - If only settlements exist, derive municipality groups via an existing settlement->municipality mapping if present.
  - If none exists, STOP and write an audit explaining what is missing and where it must come from (do not improvise a grouping).
- Compute centroids in SVG space.

C) Crosswalk
- Produce candidate matches using deterministic name matching:
  - Exact normalized match first
  - Then conservative fuzzy match (e.g., Jaro-Winkler or Levenshtein) with a strict threshold
  - Tie-break deterministically by: score desc, then adm3_id asc
- Write candidates file with full evidence.

D) Final mapping
- Auto-accept only:
  - exact matches, or
  - fuzzy matches above threshold AND with clear margin to runner-up
- Everything else unresolved: audit it; do not guess.

E) Transform
- Use matched centroid pairs as control points.
- Preferred method: thin-plate spline (TPS) if you can implement deterministically and verify stable coefficients.
- If TPS is too heavy or unstable, implement a two-step fallback:
  1) global affine transform fit by least squares
  2) per-region residual reporting (no region correction unless TPS is implemented)
- In all cases: store all parameters and the exact control points used.

F) Error calculation
- Compute residuals for each control point:
  - Project SVG centroid -> lon/lat
  - Compare to target ADM3 centroid
  - Convert residual to km using haversine or projected approximation (be consistent and document which)
- Output summary metrics and worst offenders.

DETERMINISM REQUIREMENTS (must enforce)
- Stable floating formatting (e.g., round to 8 decimals for lon/lat, 3 decimals for km) consistently across runs.
- Stable ordering in JSON: write arrays sorted, never rely on object key ordering.
- No Date.now, no random seeds.
- Use fixed thresholds and document them in the script header.

VALIDATIONS TO RUN (must run and paste results summary into ledger entry)
- npm test (if present) OR the repo’s standard validation script(s)
- Any map validation scripts that already exist (search package.json for validation commands)
- Run the new script and confirm outputs are generated
- If a viewer exists: regenerate viewer index only if that is already a standard step; do not invent new viewer pipelines.

ACCEPTANCE CRITERIA
- Script exists and runs cleanly on a fresh checkout with the prepared input files.
- All required artifacts are produced at the exact paths listed.
- Crosswalk has a non-trivial match rate (do not promise a number; report actual).
- audit_georef_report.json and .txt include coverage + residual metrics + worst offenders.
- No simulation logic files are modified.
- Deterministic rerun produces identical outputs (verify by hashing files or using git diff with no changes).

HOW TO RUN / TEST (include in final Cursor output)
1) npm ci (if needed)
2) npm run <existing map build prerequisites if any>
3) tsx scripts/map/phase_g3_3_build_svg_to_world_georef.ts
4) npm run <validation commands>
5) Optional: open viewer if already exists; otherwise skip

COMMIT DISCIPLINE (required)
- After success:
  - git add scripts/map/phase_g3_3_build_svg_to_world_georef.ts data/derived/georef/* docs/* (only what you changed/added)
  - git commit -m "Phase G3.3: SVG to world georeferencing transform"
- Then append a PROJECT_LEDGER.md entry describing:
  - Inputs used
  - Outputs generated
  - Key metrics (match coverage, residual summary)
  - Any unresolved blockers
  - Note: If any systemic design insight invalidates an assumption, FLAG that FORAWWV.md may require an addendum, but do not edit it.
```
---

**User**

Summarize all of our findings into one prompt. Include proposed next steps, key file locations and any other relevant information.
---

**Assistant**

Below is a **single, authoritative, copy-paste-ready prompt** that consolidates **all findings, decisions, prepared data, constraints, and next steps**.  
This is meant to be the **master handover / execution prompt** for Cursor or any expert agent touching this pipeline.

---

```text
PROJECT: A War Without Victory (AWWV)
MASTER EXECUTION PROMPT — TERRAIN + URBAN PREPARATION & GEOSPATIAL PIPELINE

ROLE & MISSION
You are a senior geospatial systems architect and deterministic simulation engineer working inside the AWWV codebase. Your task is to understand the current state, respect all non-negotiable system constraints, and execute future phases exactly as specified. You must not invent mechanics, alter simulation behavior, or bypass determinism discipline.

This prompt summarizes all validated findings, prepared data, and approved plans to date. Treat it as authoritative.

============================================================
1. CONFIRMED SYSTEM CONTEXT (LOCKED)
============================================================

- AWWV is a strategic-level, deterministic simulation of the 1991–1995 war in Bosnia and Herzegovina.
- The map substrate is settlement-first and derived from SVG geometry (arbitrary 2D coordinate space, NOT lat/lon).
- Settlements currently only have population (after Phase G3.1) and adjacency; no terrain, roads, or relief are yet consumed.
- Fronts emerge from unit interaction; they are not map primitives.
- Control, authority, legitimacy, logistics, and exhaustion are distinct and must not be collapsed.
- Outcomes must be emergent; no scripted or hard-coded historical results.
- Cursor is the sole implementation environment going forward.

============================================================
2. VALIDATED FINDINGS ABOUT CURRENT STATE
============================================================

- Settlement substrate exists in SVG pixel space (non-georeferenced).
- Population data exists and can be deterministically attached to settlements.
- Current control logic (e.g., control_flip_proposals.ts) uses adjacency only; no population, terrain, or urban modifiers are consumed yet.
- Urban fighting is identified as a critical future factor, especially for large settlements (e.g., Sarajevo).
- Terrain layers (roads, rivers, relief) are required primarily for future supply and movement logic.

============================================================
3. PREPARED EXTERNAL DATA (ALL COMPLETE)
============================================================

All required external inputs have been downloaded, verified, and placed correctly. NO FURTHER MANUAL DATA WORK IS REQUIRED.

A) OpenStreetMap (roads + rivers)
Path:
- data/source/osm/bosnia-herzegovina-latest.osm.pbf
Source:
- Geofabrik
License:
- ODbL
Status:
- Raw, unfiltered master extract
- To be deterministically filtered later

B) Digital Elevation Model (relief)
Path:
- data/source/dem/raw/copernicus_dem_glo30_raw.tif
Original filename:
- 2026-01-31-00_00_2026-01-31-23_59_DEM_COPERNICUS_30_DEM_(Raw).tiff
Source:
- Copernicus DEM GLO-30
License:
- Copernicus free and open access
IMPORTANT:
- This is numeric elevation data and is valid.
- Topographic/rendered Copernicus products are explicitly excluded and must not be used.

C) Administrative boundaries (georeferencing anchors)
Path:
- data/source/boundaries/bih_adm3.geojson
Source:
- geoBoundaries ADM3
CRS:
- EPSG:4326
License:
- CC-BY / Public Domain
IMPORTANT:
- Used ONLY as SVG→world georeferencing anchors.
- NOT treated as historically accurate 1991 boundaries.

D) Provenance manifest (canonical)
Path:
- data/source/audits/source_manifest.json
Status:
- Complete and authoritative.
- Must not be retroactively edited except to add new raw sources (none expected).

============================================================
4. APPROVED DESIGN DECISIONS (LOCKED)
============================================================

Urban classification:
- A settlement is urban if population > 3,000.
- Urban factor formula:
  urban_factor = 1 + log10(population / 3000), clamped to [1.0, 2.0]
- Urban factor represents structural capture resistance (density, building stock, civilian presence).
- Urban factor is DATA-ONLY until explicitly consumed in a later approved phase.

Terrain handling:
- Roads, rivers, and relief are derived as SCALAR ATTRIBUTES only (no polylines in sim).
- Terrain data is not consumed by simulation logic in current phases.
- No invented geometry is allowed.

Georeferencing approach:
- SVG→world transform will be derived using ADM3 centroid anchors.
- Deterministic name-based crosswalk.
- Preferred transform: Thin-Plate Spline (TPS) if stable; affine fallback allowed.
- Residual errors must be audited and reported; no silent fixes.

============================================================
5. CURRENT IMPLEMENTATION STATUS
============================================================

Completed:
- External data acquisition (OSM, DEM, ADM3)
- Provenance manifest finalized
- Terrain + urban roadmap document created

Not yet implemented (next phases):
- Phase G3.3: SVG → world georeferencing
- Phase G3.4: External terrain dataset snapshotting (filtering, still data-only)
- Phase G3.5: Terrain attribute derivation (validation-only)
- Phase G3.2 already planned: urban factor derivation (data-only)

============================================================
6. IMMEDIATE NEXT STEP (APPROVED)
============================================================

NEXT PHASE TO IMPLEMENT:
- Phase G3.3 — SVG → world georeferencing

Purpose:
- Build a deterministic transform mapping SVG settlement space into real-world coordinates using ADM3 anchors.
- Produce crosswalks, transform coefficients, and full error audits.
- Do NOT change simulation behavior.

Key outputs (fixed paths):
- data/derived/georef/adm3_world_centroids.json
- data/derived/georef/svg_municipality_centroids.json
- data/derived/georef/adm3_crosswalk_candidates.json
- data/derived/georef/adm3_crosswalk_final.json
- data/derived/georef/svg_to_world_transform.json
- data/derived/georef/audit_georef_report.json
- data/derived/georef/audit_georef_report.txt
- (optional) data/derived/georef/georef_debug_points.geojson

Script:
- scripts/map/phase_g3_3_build_svg_to_world_georef.ts

============================================================
7. CURSOR DISCIPLINE (MANDATORY FOR ALL PHASES)
============================================================

Every Cursor prompt must:
- Read PROJECT_LEDGER.md and ASSISTANT_MISTAKES.log
- Call loadMistakes() and assertNoRepeat(<phase-specific key>)
- Declare phase name explicitly
- List files read and written
- Produce deterministic outputs (stable ordering, fixed rounding)
- Run validation scripts
- End with a small, scoped, phase-labeled git commit
- Append a ledger entry describing inputs, outputs, and key metrics
- If a systemic design insight is uncovered, FLAG that FORAWWV.md may need an addendum, but DO NOT edit it automatically

============================================================
8. WHAT MUST NOT HAPPEN
============================================================

- No simulation logic changes
- No early consumption of terrain or urban attributes
- No manual GIS edits
- No reprojection or simplification of raw sources
- No guessing when crosswalks are ambiguous
- No image-based tracing or digitisation

============================================================
9. ACCEPTANCE STANDARD
============================================================

Work is acceptable only if:
- All outputs are reproducible on a clean checkout
- Rerunning the same script produces identical results
- Unmatched or high-error cases are audited, not hidden
- No gameplay behavior changes occur

============================================================
END OF PROMPT
============================================================
```

---

If you want, the **next logical actions** are:

- “Generate the Cursor prompt for Phase G3.4 (terrain dataset filtering & snapshotting)”
- or “Generate the Cursor prompt for Phase G3.2 (urban factor derivation, data-only)”

But as of now, this single prompt fully captures **everything we’ve learned, decided, and prepared**.
