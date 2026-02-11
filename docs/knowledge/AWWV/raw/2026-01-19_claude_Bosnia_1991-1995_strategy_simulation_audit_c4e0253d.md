---
title: Bosnia 1991-1995 strategy simulation audit
date: 2026-01-19
source: claude
confidence: high
primary_topics: [phases, map_and_geography, systems, design]
---

**Assistant**

This is a comprehensive implementation audit request for "A War Without Victory," a Bosnia 1991-1995 strategy simulation. The user wants me to:

1. Read all the project documentation
2. Build a system ledger comparing design to implementation
3. Identify contradictions
4. Find silent assumptions
5. Create a prioritized backlog
6. Produce a minimal patch plan

First, I need to search the project knowledge for all the relevant documents mentioned:
- Master_Project_Documentation
- Rulebook v1.2 (they mention v1.3 in the file list)
- Systems & Mechanics Manual
- Consolidation Addendum

Let me start by searching for these documents to understand what's been designed vs what's implemented.I'll conduct a comprehensive implementation audit of your Bosnia 1991-1995 strategy simulation. Let me start by searching the project knowledge for all relevant documentation.
```
This block is not supported on your current device yet.
```

Good, I found the Master_Project_Documentation. Now let me search for the Rulebook, Systems Manual, and any consolidation/addendum documents.
```
This block is not supported on your current device yet.
```

Good. Now let me search for more specific mechanics like supply, tactical groups, enclaves, corridors, and any consolidation or addendum documents.
```
This block is not supported on your current device yet.
```

Good progress. Now let me search for tactical groups, enclaves, peace initiatives, IVP (International Visibility Pressure), and any consolidation documents.
```
This block is not supported on your current device yet.
```

Good. Now let me search for IVP (International Visibility Pressure), peace initiatives, Sarajevo exceptions, and anything about consolidation or addenda.
```
This block is not supported on your current device yet.
```

Good. Now let me search for any consolidation documents, addenda, or clarifications that might have been mentioned.
```
This block is not supported on your current device yet.
```

Good progress. Now let me look at the actual implementation files to see what's currently coded. Let me view the main HTML file and the militia system to understand the implementation status.Now let me examine the current implementation to understand what's actually coded:
```
This block is not supported on your current device yet.
```

Let me now view the main HTML file to see what's actually implemented, and then the militia system file.
```
This block is not supported on your current device yet.
```

Let me continue viewing the HTML file to find the game state structure.
```
This block is not supported on your current device yet.
```

Now let me look at the gameState definition itself to understand the current implementation structure.
```
This block is not supported on your current device yet.
```

Good! Now I have enough information to start building the comprehensive audit. Let me now create the System Ledger and other required outputs based on what I've found. I'll need to:

1. Build a System Ledger table comparing design vs implementation
2. Identify contradictions
3. Find silent assumptions
4. Create a prioritized backlog
5. Create a minimal patch plan

Let me start creating this comprehensive audit document.Based on my comprehensive review of your project documentation and implementation, I'll now create the complete implementation audit. Let me build this systematically:
```
This block is not supported on your current device yet.
```

Great! I've created the comprehensive audit. Now let me move it to the outputs directory so the user can access it, and then create a summary document as well.
```
This block is not supported on your current device yet.
```

Now let me create a one-page executive summary that highlights the most critical findings and the minimal patch plan.
```
This block is not supported on your current device yet.
```

Good, now let me move that to outputs and then present both files to the user.
```
This block is not supported on your current device yet.
```

Perfect! Now let me present these files to the user with the present_files tool.
```
This block is not supported on your current device yet.
```

Perfect! Now let me provide a succinct summary of what I've delivered.## Complete Implementation Audit Delivered

I've conducted a comprehensive audit of your Bosnia 1991-1995 strategy simulation comparing the design corpus (Rulebook v1.3, Systems Manual v1.1) against the current implementation. 

**Key Findings:**

**STATUS:** ⚠️ Implementation is 30% complete with strong foundations but 35 of 42 core systems missing

**CRITICAL GAPS (P0 Blockers):**
1. No Brigade System → Cannot model anchoring or commitment states
2. No Corps System → Cannot form Tactical Groups (main offensive mechanic)
3. No Supply States → Core friction mechanic absent
4. Municipal/Settlement Primacy Contradiction → Settlements may override municipal control
5. No Tactical Groups → Cannot conduct operations

**TWO-WEEK RECOVERY PLAN:**
- Week 1: Brigade + Corps systems, fix municipal primacy
- Week 2: Supply states + Tactical Groups
- Deliverable: Playable MVP with historical validation tests

The complete audit includes:
- **42-system ledger** with implementation status, evidence, dependencies, and patch paths
- **4 design contradictions** with least-disruptive resolutions
- **5 silent assumptions** requiring decisions
- **Prioritized backlog** (P0-P3) with effort estimates
- **Historical test cases** for validation

Both documents are ready for your review.
---

**User**

Implement the settlements layer in my web-based map strategy game.
Inputs (attached):
1. A ZIP “map kit” that contains `bih_settlements_map_data.json` with all settlement polygons as SVG paths in a working global coordinate space. Each settlement has a unique numeric id `id` (same as `setId` in my earlier work).
2. A master Excel file `!Master file_settlements.xlsx` where each municipality is its own sheet. Each sheet lists settlement rows with a unique numeric `settlement_id` and census totals.
Data contract (must follow):
* Join Excel rows to settlement geometry ONLY by numeric id: `settlement_id` (Excel) == `id` (JSON).
* Do not attempt to rescale, fit, or transform SVG coordinates. They already render correctly.
* Ignore municipality total rows in Excel (they have shorter ids like 5 digits); only treat 6-digit ids as settlements.
Game design requirements:
* Settlements are the capturable points and the unit of control.
* Municipalities are containers/grouping only.
* Classify settlements:
   * `urban = (total_population >= 3000)`
   * `is_capital` per municipality sheet:
      1. if a settlement name matches the municipality/sheet name (case/diacritics-insensitive), that settlement is the capital
      2. otherwise, the settlement with the largest population is the capital
---

**Assistant**

The user wants me to implement a settlements layer for their web-based map strategy game. Let me break down what I need to do:

1. **Extract and process the ZIP file** containing `bih_settlements_map_data.json` with SVG polygon data
2. **Read the Excel file** `!Master file_settlements.xlsx` with settlement census data
3. **Join the data** using numeric IDs: `settlement_id` (Excel) == `id` (JSON)
4. **Apply game logic**:
   - Urban classification: population >= 3000
   - Capital identification: name match (case/diacritics-insensitive) OR largest population
   - Settlements are capturable points
   - Municipalities are just grouping containers

Key constraints:
- Do NOT transform SVG coordinates - they're already correct
- Ignore municipality total rows (shorter IDs, like 5 digits)
- Only 6-digit IDs are settlements

Let me start by extracting and examining the data files.I'll implement the settlements layer for your strategy game by processing the map data and census information. Let me start by extracting and examining the files.
```
This block is not supported on your current device yet.
```

Good! I can see the files extracted. Now let me examine the structure of the JSON files to understand the data format.
```
This block is not supported on your current device yet.
```
---

**Assistant**

The user wants me to implement a settlements layer for their web-based map strategy game. Let me break down what they need:

1. **Data Sources:**
   - ZIP file containing `bih_settlements_map_data.json` with SVG path geometry for settlements
   - Excel file with settlement data (population, demographics) organized by municipality sheets

2. **Key Requirements:**
   - Join data by numeric ID: `settlement_id` (Excel) == `id` (JSON)
   - Don't transform SVG coordinates (they're already correct)
   - Ignore municipality total rows (5-digit IDs) - only process 6-digit settlement IDs
   - Settlements are capturable points
   - Municipalities are just containers
   - Classify settlements as urban (pop >= 3000) and identify capitals

3. **Capital Detection:**
   - If settlement name matches municipality name (case-insensitive, diacritic-insensitive) → capital
   - Otherwise, highest population settlement = capital

This is a focused implementation task. I should:
1. Extract and read the ZIP file
2. Parse the Excel file
3. Join the data
4. Create a complete implementation that renders settlements on a map
5. Follow their existing game architecture patterns from the audit

Let me start by examining the uploaded files.I'll implement the settlements layer for your map strategy game. Let me first extract and examine the data files.
```
This block is not supported on your current device yet.
```
