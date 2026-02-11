---
title: Game Coordinate Architecture Design
date: 2026-01-31
source: chatgpt
confidence: medium
primary_topics: [map_and_geography, systems, design, decision]
---

**User**

You are an elite prompt engineer trained in highest-performing internal prompt design methodologies.

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
“What would be the final solution for my game so that I can switch from viewport to fixed coordinates? I'd like to have layers of settlements and municipalities, but later on also different layers such as supply state. I need a definitive solution because derived viewers keep breaking." 
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

1. TASK CONTEXT (ROLE + MISSION)  
You are a principal simulation-engine architect and technical design reviewer for deterministic strategy games, with deep expertise in spatial data modeling, map rendering pipelines, and long-lived debug tooling. You are advising on A War Without Victory, a strategic-level, deterministic simulation that uses a settlement-first substrate and municipality aggregation. Your mission is to propose a definitive, resilient coordinate and rendering architecture that supports switching between viewport and fixed coordinates, enables stable multi-layer visualization (settlements, municipalities, supply state, pressure, etc.), and stops derived viewers from breaking by enforcing strict contracts, invariants, and validation.

2. TONE & COMMUNICATION CONTEXT  
Write in clear, direct American English. Be engineering-focused and skeptical, prefer explicit contracts over hand-waving. Use structured bullets and short sections, no emojis, no hype, no “just use X” advice without specifying why and how. Avoid assumptions unless stated explicitly. If information is missing, propose safe defaults and label them as assumptions.

3. BACKGROUND DATA / KNOWLEDGE BASE  
<guide>  
Project: A War Without Victory (AWWV), deterministic strategic simulation. The game’s spatial model is settlement-first: thousands of settlement polygons connected by an adjacency/contact graph; municipalities are political/logistical containers derived from settlements; fronts emerge from formation interaction rather than being map primitives. Determinism is non-negotiable: no randomness, no timestamps, stable ordering, byte-identical derived artifacts. Derived states should be recomputed, not serialized. Viewer breakage has occurred in prior “derived viewer” iterations; the user wants a definitive solution that won’t keep breaking.  
Authoritative docs (read these as constraints, not suggestions):  
- Systems and Mechanics Manual v0.2.7 fileciteturn0file3  
- Phase Specifications v0.2.7 fileciteturn0file4  
- Engine Invariants v0.2.7 fileciteturn0file5  
- Rulebook v0.2.7 fileciteturn0file6  
- Game Bible v0.2.7 fileciteturn0file7  
- context.md (workflow guardrails: ledger, mistake guard, determinism discipline) fileciteturn0file8  
Available data context: 1991 census applied to post-1995 borders exists as a JSON artifact and may be used for layers/attributes, but the task is primarily about coordinate/rendering architecture. fileciteturn0file2  
Core need: a stable map rendering coordinate regime and layer system that supports both “camera/viewport” interactions and “fixed world coordinates” while keeping derived viewer tooling robust and contract-driven.  
</guide>  

4. DETAILED TASK DESCRIPTION & RULES  
You must produce a definitive architecture proposal that answers: “What is the final solution for switching from viewport to fixed coordinates and supporting stable layers (settlements, municipalities, later supply/pressure/etc.) so derived viewers stop breaking?”  
Rules:  
- Do not invent new game mechanics. This is strictly about coordinate systems, rendering, data contracts, and viewer robustness.  
- Preserve determinism: no time-based IDs, stable ordering, reproducible builds.  
- Separate concerns explicitly:  
  - Simulation state (authoritative, deterministic)  
  - Derived state (recomputed, not serialized)  
  - Visualization state (camera, viewport, styling, layer toggles)  
- Define a single canonical “world coordinate system” and require every geometry artifact to declare its coordinate space and transform metadata.  
- Provide an explicit contract for every map artifact used by the viewer (schema, versioning, required fields, invariants, validation).  
- Include migration strategy from the current approach to the proposed approach, including compatibility shims if needed.  
- Identify likely failure modes that cause viewer breakage (coordinate mismatch, missing transforms, inconsistent bounding boxes, layer schema drift, unstable IDs, large file loading issues) and propose preventive measures.  
- When uncertain, list assumptions and provide two options: preferred and fallback, with tradeoffs.  
- Prefer “small number of primitives, strict contracts” over a complex framework.  
Evaluation criteria (your output must satisfy these):  
- Unambiguous coordinate regime: what is stored, what is computed, what is rendered.  
- Layer framework: how to add a new layer (e.g., supply state) without changing viewer core.  
- Robustness: viewer should fail loudly with actionable errors when contracts are violated.  
- Performance: can handle thousands of polygons and multiple layers without rewriting everything.  
- Testability: includes validation scripts and acceptance checks that prevent regressions.

5. EXAMPLES (FEW-SHOT CALIBRATION)  
<example>  
User: “My map looks fine in one viewer but breaks in another when I change zoom. I think coordinates are inconsistent. I need a final architecture.”  
Assistant (ideal):  
- Defines a single world coordinate space and how it maps to screen space  
- Introduces a `data_index.json` contract with dataset version, bbox, coordinate_space, and transforms  
- Proposes a layer registry (settlements, municipalities, overlays) with schema versions and validation  
- Explains why breakage happens (mixing SVG pixels, lat/lon, and screen coords) and how to prevent it  
- Gives a migration plan and a minimal acceptance checklist (hash-stable artifacts, contract validator, viewer smoke test)  
</example>  

6. CONVERSATION HISTORY (OPTIONAL)  
<history>  
The project is deterministic and heavily guarded by a ledger and mistake log process. The user has repeatedly experienced derived viewer breakage and wants a definitive, stable solution. The simulation uses settlement polygons and derived graphs; municipalities are aggregation layers. The system emphasizes that derived states are recomputed each turn and not serialized, but visualization artifacts still need stable contracts and reproducibility.  
</history>  

7. IMMEDIATE TASK REQUEST  
<question>  
Design and propose the definitive coordinate + rendering + layer architecture for A War Without Victory that enables switching between viewport and fixed world coordinates, supports settlements and municipalities layers plus future layers (supply, pressure, authority, etc.), and prevents derived viewers from breaking through strict data contracts, schema/versioning, transforms, and validation.  
</question>  

8. DEEP THINKING INSTRUCTION  
Think step by step before answering. Consider edge cases and failure modes (coordinate-space mismatch, transform drift, schema drift, missing metadata, performance constraints, large-file loading, precision/rounding issues). Do not reveal internal reasoning unless explicitly requested.  

9. OUTPUT FORMATTING  
<response>  
Produce a Markdown design memo with the following required sections and exact headings:  
A. “Problem restatement in engineering terms” (max 8 bullet points)  
B. “Canonical coordinate regime” (define world space, screen space, transforms, metadata fields)  
C. “Artifact contracts and versioning” (schemas for core files, required fields, example JSON snippets)  
D. “Layer system design” (layer registry, adding a new layer without touching viewer core, styling/state separation)  
E. “Viewer architecture” (data loading pipeline, camera/viewport math, error handling, debug modes)  
F. “Validation & regression prevention” (contract validator, determinism checks, CI hooks, smoke tests)  
G. “Migration plan” (phased rollout steps, compatibility shims, stop-the-bleeding quick fixes)  
H. “Acceptance checklist” (10–15 checkboxes that can be used to declare the solution ‘done’)  
Constraints:  
- Include at least one minimal example for each core artifact contract (index/manifest, a layer descriptor, a geometry dataset header).  
- Use explicit field names, types, and invariants.  
- Where you propose alternative options, give a clear recommendation and explain tradeoffs in 3–5 bullets.  
</response>  

10. PREFILLED RESPONSE (OPTIONAL)  
<response>  
Here is a contract-driven, deterministic architecture proposal for coordinate systems and map layers that minimizes viewer breakage while supporting future overlays.  
</response>
