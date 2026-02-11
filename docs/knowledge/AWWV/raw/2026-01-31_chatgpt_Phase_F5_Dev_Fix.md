---
title: Phase F5 Dev Fix
date: 2026-01-31
source: chatgpt
confidence: high
primary_topics: [phases, map_and_geography, political_control, engine_and_determinism, design]
---

**User**

A) PROJECT CONTINUATION HANDOVER (AUTHORITATIVE)

Project: A War Without Victory (AWWV)
State: End of Phase F4, Phase F5 pending (dev runner fix only)

Canonical facts (LOCKED)

Political control is settlement-first and canonical

Authoritative source:
data/source/municipalities_1990_initial_political_controllers.json

Derived from municipalities_BiH.xlsx via E6–E8 pipeline

Settlement control accessed only via:
getSettlementControlStatus(state, sid) (Phase F1–F3)

Post-E8 / current canonical counts

Total settlements: 6146

RBiH: 2724

RS: 2064

HRHB: 1171

Unknown (null): 187

Unknowns are explicit and documented:

sarajevo, stari_grad_sarajevo, tuzla, vares

milici has 0 settlements

Null / unknown semantics

Unknown ≠ neutral

Unknown is explicit, first-class, and null-safe

AoR fallback is gated and provably unused in canonical runs (Phase F3)

Dev UI (Phase F4)

Filters and highlighting for unknown control are implemented

UI logic is correct

BUT legend + counts are wrong because backend endpoint is wrong

Identified blocker (WHY Phase F5 exists)

/api/political_control in tools/dev_runner/server.ts:

Still reads state.political_controllers (legacy)

Returns pre-E8 counts:

RBiH 1326 / RS 984 / HRHB 693 / null 3143

This causes:

Incorrect legend

Confusing map appearance

Geometry artifacts (striping in top-left) are real but separate
→ NOT part of Phase F5

What Phase F5 must do (scope is narrow)

Fix only the dev runner endpoint:

/api/political_control

Switch it to:

getSettlementControlStatus(state, sid)

Add a deterministic audit endpoint to lock correctness

No UI changes

No mechanics

One commit

B) PHASE F5 — CURSOR PROMPT (READY TO RUN)
You are Cursor operating inside the A War Without Victory (AWWV) repo.

MISSION (NEXT PHASE)
Phase F5 — Fix dev runner /api/political_control to use canonical ControlStatus (no legacy state.political_controllers), and add a deterministic audit endpoint.
Goal: /api/political_control must reflect post-E8 canonical settlement control.
Scope is extremely narrow: ONE code file + ledger, ONE commit.

ABSOLUTE CONSTRAINTS
- Modify ONLY:
  - tools/dev_runner/server.ts
  - docs/PROJECT_LEDGER.md
- No UI changes.
- No mechanics or data changes.
- Deterministic output only (stable ordering, no timestamps).
- After this phase, /api/political_control MUST NOT reference state.political_controllers anywhere.

LEDGER ACTION (REQUIRED)
- READ: docs/PROJECT_LEDGER.md, docs/context.md, docs/CANON.md, docs/FORAWWV.md, docs/ASSISTANT_MISTAKES.log
- WRITE: append Phase F5 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In tools/dev_runner/server.ts:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase f5 dev runner political control endpoint use controlstatus + audit");

FORAWWV NOTE
- If the audit does not match canonical counts (RBiH=2724, RS=2064, HRHB=1171, null=187),
  record that FORAWWV.md may need an addendum — DO NOT auto-edit FORAWWV.md.

TASK

1) Fix GET /api/political_control
   - Remove ALL usage of:
       currentState.political_controllers
   - Import canonical helper:
       import { getSettlementControlStatus } from '../../src/state/settlement_control.js';
       (resolve relative path correctly)
   - For each settlement id (sid), compute:
       const st = getSettlementControlStatus(currentState, sid)
       if st.kind === "unknown" → value = null
       else → value = st.side
   - Build response deterministically:
     {
       meta: {
         total_settlements: 6146,
         counts: { RBiH, RS, HRHB, null }
       },
       by_settlement_id: { [sid]: "RBiH"|"RS"|"HRHB"|null }, // stable-sorted keys
       mun1990_by_sid: { [sid]: string } // already present; ensure full coverage
     }

2) Add deterministic audit endpoint (same file, no new files)
   - GET /api/political_control_audit
   - Must:
     A) Ensure currentState exists
     B) Recompute counts using getSettlementControlStatus
     C) Validate:
        - total_settlements === number of settlement ids
        - sum(counts) === total_settlements
     D) Return:
        {
          ok: true,
          total: 6146,
          counts: {...},
          sum_counts: 6146,
          invariant_sum_ok: true
        }
   - If any invariant fails → HTTP 500 with clear error

3) Discoverability
   - Ensure /api/political_control_audit appears in dev runner endpoint list (if printed)

4) VALIDATIONS (ALWAYS RUN)
   - npm run typecheck
   - npm test
   - npm run sim:run
   - npm run dev:runner
   - Browser checks:
       http://localhost:3000/api/political_control
       http://localhost:3000/api/political_control_audit

5) Update docs/PROJECT_LEDGER.md
   - Phase F5 entry:
     - Summary: Dev runner political control endpoint migrated to canonical ControlStatus
     - Change: removed legacy state.political_controllers usage; added audit endpoint
     - Files modified: server.ts, PROJECT_LEDGER.md
     - Mistake guard phrase (exact)
     - FORAWWV note: none (if audit passes)

6) Commit (commit-per-phase discipline)
   - git status (ONLY intended files)
   - git add tools/dev_runner/server.ts docs/PROJECT_LEDGER.md
   - git commit -m "Phase F5: dev runner political control endpoint uses canonical ControlStatus

- Replace legacy state.political_controllers with getSettlementControlStatus
- Add deterministic /api/political_control_audit endpoint
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- /api/political_control returns post-E8 counts:
  RBiH=2724, RS=2064, HRHB=1171, null=187
- No reference to state.political_controllers remains in server.ts
- /api/political_control_audit returns ok:true and invariant_sum_ok:true
- typecheck, tests, sim run pass
- Single commit with only server.ts + ledger

HOW TO RUN / TEST
- npm run dev:runner
- Open:
  - http://localhost:3000/api/political_control
  - http://localhost:3000/api/political_control_audit
  - http://localhost:3000/political_control.html
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase F5 — Dev runner fix only: migrate /api/political_control to canonical ControlStatus + add deterministic audit endpoint.

SCOPE (HARD LIMIT)
Modify ONLY:
- tools/dev_runner/server.ts
- docs/PROJECT_LEDGER.md

Do NOT touch UI, data, mechanics, or any other files.

LEDGER ACTION (REQUIRED)
1) READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
2) WRITE:
- Append a Phase F5 entry to docs/PROJECT_LEDGER.md (single entry, no timestamps inside the content).

MISTAKE GUARD (REQUIRED)
In tools/dev_runner/server.ts, add/import and execute at top-level (or earliest safe point for this file’s pattern):
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase f5 dev runner political control endpoint use controlstatus + audit");

CRITICAL CANON REQUIREMENT
After this phase, tools/dev_runner/server.ts MUST NOT reference:
- state.political_controllers
- currentState.political_controllers
- any legacy political controller map on state

TASK 1 — FIX GET /api/political_control
In tools/dev_runner/server.ts:
- Import canonical helper (resolve relative path correctly):
  import { getSettlementControlStatus } from '../../src/state/settlement_control.js';

- Ensure you iterate deterministically over settlement IDs:
  - Obtain settlement IDs from the same canonical place the dev runner already uses for settlement enumeration.
  - Sort settlement IDs lexicographically (string compare) before building outputs.

- For each settlement id (sid):
  const st = getSettlementControlStatus(currentState, sid)
  if st.kind === "unknown" => value = null
  else => value = st.side  // "RBiH" | "RS" | "HRHB"

- Build response deterministically (stable key ordering):
{
  meta: {
    total_settlements: 6146,
    counts: { RBiH: number, RS: number, HRHB: number, null: number }
  },
  by_settlement_id: { [sid]: "RBiH"|"RS"|"HRHB"|null },  // keys stable-sorted
  mun1990_by_sid: { [sid]: string } // keep existing behavior, ensure full coverage for all sids
}

- Counts MUST reflect post-E8 canonical totals:
  RBiH=2724, RS=2064, HRHB=1171, null=187
- If you discover the settlement enumeration is not 6146 in dev runner runtime, do NOT change data or mechanics; instead, make the audit endpoint surface the mismatch clearly (see Task 2) and flag FORAWWV note guidance.

TASK 2 — ADD GET /api/political_control_audit (NO NEW FILES)
In tools/dev_runner/server.ts add:
GET /api/political_control_audit

Behavior:
A) Ensure currentState exists; if not, return HTTP 500 with a clear error message.
B) Recompute:
   - settlement_ids (deterministic sorted)
   - counts using getSettlementControlStatus exactly as in /api/political_control
C) Validate invariants:
   - total_settlements === settlement_ids.length
   - sum_counts === total_settlements
D) Return JSON on success:
{
  ok: true,
  total: 6146,
  counts: { RBiH: number, RS: number, HRHB: number, null: number },
  sum_counts: 6146,
  invariant_sum_ok: true
}

If any invariant fails:
- Return HTTP 500
- Include:
  - ok: false
  - a short reason string
  - observed_total
  - observed_counts
  - observed_sum_counts
  - invariant_sum_ok: false

FORAWWV NOTE (MANDATORY RULE)
If the audit does not match canonical counts (RBiH=2724, RS=2064, HRHB=1171, null=187), record in the Phase F5 ledger entry:
“docs/FORAWWV.md may require an addendum about dev-runner settlement enumeration/control count mismatch; do NOT auto-edit FORAWWV.md.”

TASK 3 — DISCOVERABILITY
If tools/dev_runner/server.ts has a printed endpoint list or startup log of endpoints, add /api/political_control_audit to it (same file only).

VALIDATIONS (ALWAYS RUN, IN THIS ORDER)
1) npm run typecheck
2) npm test
3) npm run sim:run
4) npm run dev:runner

Then browser checks (manual):
- http://localhost:3000/api/political_control
- http://localhost:3000/api/political_control_audit
- http://localhost:3000/political_control.html

DOC UPDATE — docs/PROJECT_LEDGER.md
Append a Phase F5 entry in the standard format already used in the ledger, including:
- Summary: Dev runner political control endpoint migrated to canonical ControlStatus
- Change: removed legacy state.political_controllers usage; added audit endpoint
- Files modified: tools/dev_runner/server.ts, docs/PROJECT_LEDGER.md
- Mistake guard: "phase f5 dev runner political control endpoint use controlstatus + audit"
- FORAWWV note: “none” ONLY if audit matches canonical counts; otherwise include the mandated note above.

COMMIT (COMMIT-PER-PHASE DISCIPLINE)
Before committing:
- git status (must show ONLY the two allowed files changed)
Then:
- git add tools/dev_runner/server.ts docs/PROJECT_LEDGER.md
- git commit -m "Phase F5: dev runner political control endpoint uses canonical ControlStatus

- Replace legacy state.political_controllers with getSettlementControlStatus
- Add deterministic /api/political_control_audit endpoint
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA (MUST ALL PASS)
- /api/political_control returns counts:
  RBiH=2724, RS=2064, HRHB=1171, null=187
- No reference to state.political_controllers remains anywhere in tools/dev_runner/server.ts
- /api/political_control_audit returns ok:true and invariant_sum_ok:true
- npm run typecheck, npm test, npm run sim:run pass
- Single commit, only server.ts + PROJECT_LEDGER.md modified

HOW TO RUN / TEST
1) npm run dev:runner
2) Open:
- http://localhost:3000/api/political_control
- http://localhost:3000/api/political_control_audit
- http://localhost:3000/political_control.html
```
---

**User**

Phase F5 complete
1. tools/dev_runner/server.ts
Import: getSettlementControlStatus from ../../src/state/settlement_control.js.
Mistake guard: assertNoRepeat("phase f5 dev runner political control endpoint use controlstatus + audit").
GET /api/political_control:
No use of state.political_controllers.
For each settlement id (from graph, stable-sorted), calls getSettlementControlStatus(currentState!, sid); kind === 'unknown' → null, else st.side.
Response: meta: { total_settlements, counts }, by_settlement_id (stable-sorted keys), mun1990_by_sid (stable-sorted, full coverage).
GET /api/political_control_audit:
Returns 500 if currentState is null.
Recomputes counts via getSettlementControlStatus over the same settlement id set.
Checks total_settlements === keys(by_settlement_id).length and sum(counts) === total.
Success: { ok: true, total, counts, sum_counts, invariant_sum_ok: true } (no timestamps).
Failure: 500 with clear error body.
Console: /api/political_control_audit added to the startup endpoints list.
2. docs/PROJECT_LEDGER.md
New Phase F5 entry: summary, change, files modified, mistake guard phrase, FORAWWV note: “None (if audit passes and counts match canonical post-E8 expectations).”
3. Validations
npm run typecheck — passed
npm test — 277 tests passed
npm run sim:run — passed; log shows RBiH=2724, RS=2064, HRHB=1171, null=187
Dev runner (PORT=3001):
/api/political_control_audit → ok: true, total: 6146, counts match above, invariant_sum_ok: true
/api/political_control → meta.counts match canonical post-E8
4. Commit
Single commit with only tools/dev_runner/server.ts and docs/PROJECT_LEDGER.md:
b171d89 — “Phase F5: dev runner political control endpoint uses canonical control status”.
FORAWWV: No addendum recorded; audit passes and counts match. If you ever see different counts or a failing audit, add a ledger note that FORAWWV may need an addendum on dev runner invariants; do not auto-edit FORAWWV.md.
Browser check: With npm run dev:runner (and nothing else on port 3000), open:
http://localhost:3000/api/political_control
http://localhost:3000/api/political_control_audit
http://localhost:3000/political_control.html
Here, the runner was started on port 3001 because 3000 was in use; both API endpoints were verified on 3001.
---

**Assistant**

Locked in. Here’s the clean “carry-forward” record for the project, plus the one practical reminder that prevents the port confusion from resurfacing.

Phase F5 is closed
Code
tools/dev_runner/server.ts now imports getSettlementControlStatus from ../../src/state/settlement_control.js and applies the mistake guard phrase phase f5 dev runner political control endpoint use controlstatus + audit.
GET /api/political_control no longer references state.political_controllers, iterates settlement ids from the graph in stable sorted order, uses getSettlementControlStatus(currentState, sid) with unknown → null, else st.side, and returns deterministic meta counts plus stable sorted by_settlement_id and fully covered stable sorted mun1990_by_sid.
GET /api/political_control_audit is implemented, fails with HTTP 500 if currentState is null, recomputes counts deterministically over the same sid set, enforces total and sum invariants, returns ok true on success or a clear error body on failure, no timestamps.
Startup endpoint list includes /api/political_control_audit.
Docs
docs/PROJECT_LEDGER.md has a Phase F5 entry with summary, change, files modified, mistake guard phrase, and FORAWWV note set to none conditional on audit passing and canonical counts matching.
Validations and canonical counts
typecheck passed, tests passed (277), sim run passed.
Canonical post E8 counts observed consistently in sim run and dev runner
RBiH 2724, RS 2064, HRHB 1171, null 187, total 6146.
Commit discipline
Single commit b171d89, only server.ts and PROJECT_LEDGER.md changed.
FORAWWV addendum rule
No addendum needed since audit passes and counts match. If this ever diverges, record a ledger note that FORAWWV may need an addendum on dev runner invariants, do not auto edit FORAWWV.md.

Practical reminder for future verification
If dev runner binds to a non default port like 3001, the correct manual checks are the same paths on that port, for example
http://localhost:3001/api/political_control
http://localhost:3001/api/political_control_audit
http://localhost:3001/political_control.html
---

**User**

Before we continue, we have an issue with geometry. I believe we are pulling one of the wrong geojson files. Let's go back to when we were creating settlement adjacencies because then we were using the correct geojson. I'd like to get that viewer again. Give me Cursor prompt to find that viewer and give it back to me so I can run it.
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

GOAL
Recover the LAST KNOWN-GOOD settlement adjacency / substrate viewer that was used during settlement adjacency creation (Phase 0 / early Phase 1), so the user can run it locally and visually confirm correct geometry.

This task is DIAGNOSTIC ONLY.
Do NOT modify geometry, data, or mechanics.
Do NOT regenerate substrates.
We are locating and restoring the viewer artifact and/or the script that builds it.

LEDGER ACTION (REQUIRED)
READ ONLY:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/ASSISTANT_MISTAKES.log

DO NOT write to the ledger unless explicitly instructed later.

MISTAKE GUARD (REQUIRED)
Before any work that could touch files, load mistake guard and assert:
  import { loadMistakes, assertNoRepeat } from '../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("diagnostic recover settlement adjacency viewer used during correct geometry phase");

TASKS (STEP BY STEP)

1) IDENTIFY THE CORRECT VIEWER ERA
Search the repo history and current tree for:
- Any directory named like:
  - substrate_viewer
  - phase0_embedded_viewer
  - settlement_viewer
  - adjacency_viewer
- Any files named:
  - index.html
  - viewer.js
  - data_index.json
that reference:
  - settlements_substrate.geojson
  - settlement_contact_graph.json
  - adjacency / contact edges

Commands to run:
- ripgrep for "viewer", "substrate_viewer", "contact_graph", "adjacency"
- inspect npm scripts in package.json related to map, viewer, phase0, phase1

2) CONFIRM WHICH GEOJSON WAS USED
Once a candidate viewer is found:
- Open its data_index.json (or equivalent)
- Identify EXACTLY which geojson files it loads:
  - settlements_substrate.geojson
  - bih_master.geojson
  - any svg-derived or rebuilt geometry
- Report whether this viewer predates any later geometry rebuilds or simplifications

3) RESTORE / RE-EXPOSE THE VIEWER (NO MODIFICATIONS)
If the viewer directory still exists but is not easily runnable:
- Do NOT edit its contents
- Only document:
  - path to the viewer
  - how it was originally launched (npm script, static open, dev runner, etc.)

If the viewer was removed but is still recoverable from git history:
- Identify the LAST commit hash where it existed intact
- Identify:
  - viewer directory path
  - required data files
- Do NOT cherry-pick or restore yet
- Just report the commit hash and paths

4) OUTPUT (CRITICAL)
Return ONLY the following, in plain text:

A) Viewer status
- FOUND / NOT FOUND
- Path (or last known commit hash)

B) How to run it EXACTLY
- npm command OR
- node script OR
- open index.html directly
- required working directory
- expected port (if any)

C) Geometry source confirmation
- List of geojson files loaded by that viewer
- Explicit statement:
  “This viewer uses the same geojson that was used during settlement adjacency derivation” OR
  “This viewer uses a later / different geojson”

DO NOT:
- Fix geometry
- Regenerate adjacency
- Modify files
- Add new scripts
- Update the ledger

ACCEPTANCE CRITERIA
- You identify the exact viewer used when settlement adjacencies were known to be correct
- You provide a concrete way for the user to run it locally
- You clearly state which geojson file(s) it visualizes
- Zero file modifications

NOTE FORAWWV
If this investigation reveals that adjacency correctness depended on a geojson that is no longer canonical, FLAG (but do not edit) that FORAWWV.md may require an addendum about geometry provenance vs adjacency derivation.

HOW TO RUN (FOR YOU)
Execute searches and inspections locally in the repo.
Do not assume; confirm by reading the files.
Return findings only.
```
---

**User**

A) Viewer status
substrate_viewer (Phase 0 canonical geometry viewer): FOUND
Path: data/derived/substrate_viewer/ (index.html, viewer.js, data_index.json).
adjacency_viewer (Phase 1 geometry + adjacency edges): FOUND
Path: data/derived/adjacency_viewer/ (index.html, data.json). Build script: scripts/map/build_adjacency_viewer.ts. settlement_graph_v3.json and settlement_contact_graph.json exist in data/derived/.
contact_graph_viewer (geometry + contact-graph edges): FOUND
Path: data/derived/contact_graph_viewer/ (index.html, viewer.js, data_index.json, local settlements_substrate.geojson, settlement_contact_graph.json).
Legacy master-derived substrate + viewer: FOUND
Path: data/derived/_legacy_master_substrate/ (contains settlements_substrate.geojson, substrate_viewer/ with index.html, viewer.js, data_index.json). FORAWWV and ledger state that the prior master-derived substrate is preserved here and is not canonical going forward.
phase0_embedded_viewer: PARTIAL / NOT RUNNABLE
Path: data/derived/phase0_embedded_viewer/ — only index.html and viewer.js exist; no data_index.json. Ledger (2026-01-27 Phase 0 cleanup) records deletion of the whole directory (including data_index.json) and of scripts/map/phase0_validate_settlements.ts. So phase0_embedded_viewer cannot be run as-is. Last known full version would be in git history before that cleanup (no specific commit hash was resolved; you can run git log --all --full-history -- data/derived/phase0_embedded_viewer/data_index.json to find the last commit where it existed).
B) How to run it EXACTLY
substrate_viewer
Working directory: repo root.
Command: npx http-server -p 8080 (from repo root).
Open: http://localhost:8080/data/derived/substrate_viewer/ (or .../substrate_viewer/index.html).
Port: 8080.
Optional: run npm run map:viewer:substrate:index first to regenerate data_index.json from current data/derived/settlements_substrate.geojson and census.
adjacency_viewer
Working directory: repo root.
Build: npm run map:viewer:adjacency (writes data/derived/adjacency_viewer/data.json from current settlements_substrate.geojson + v3 graph + contact graph).
Serve: npm run map:serve:adjacency.
Open: http://localhost:5190 (or http://localhost:5190/index.html).
Port: 5190.
Do not open index.html via file://; it uses fetch('data.json'), which will be blocked by CORS when using file protocol.
contact_graph_viewer
Working directory: repo root.
Command: npx http-server -p 8080 (from repo root).
Open: http://localhost:8080/data/derived/contact_graph_viewer/.
Port: 8080.
It loads local settlements_substrate.geojson and settlement_contact_graph.json in that directory (relative paths in data_index).
Legacy substrate viewer (_legacy_master_substrate/substrate_viewer/)
Same as main substrate_viewer: npx http-server -p 8080 from repo root, then open http://localhost:8080/data/derived/_legacy_master_substrate/substrate_viewer/.
Caveat: Its data_index.json has "geometry_path": "/data/derived/settlements_substrate.geojson". So it loads the current repo file data/derived/settlements_substrate.geojson, not the legacy file _legacy_master_substrate/settlements_substrate.geojson. To see the legacy geometry without changing files, you would need to serve from a root where /data/derived/settlements_substrate.geojson is the legacy file (e.g. serve from data/derived/_legacy_master_substrate and map that path), or change the viewer config (excluded here; diagnostic only).
C) Geometry source confirmation
substrate_viewer
Loads: data/derived/settlements_substrate.geojson via path /data/derived/settlements_substrate.geojson (current repo file).
Census: data/source/bih_census_1991.json.
This viewer uses a later / different geojson. Canonical substrate is now SVG-derived (package.json: map:derive:substrate → derive_settlement_substrate_from_svg_sources.ts). Phase 0/1 settlement adjacency was derived from the master-derived substrate (from bih_master.geojson via derive_settlement_substrate_from_master.ts). So the current substrate_viewer shows the current (SVG-derived) substrate, not the geometry used when adjacency was created.
adjacency_viewer
At build time the script reads: data/derived/settlements_substrate.geojson, data/derived/settlement_graph_v3.json, data/derived/settlement_contact_graph.json, and bundles geometry + edges into data/derived/adjacency_viewer/data.json.
This viewer uses a later / different geojson when the repo’s current substrate is SVG-derived. If you run npm run map:viewer:adjacency now, it uses whatever is currently in data/derived/settlements_substrate.geojson (SVG-derived). The Phase 1 adjacency (v3 graph) was originally derived from the master-derived substrate; that geometry is preserved only in data/derived/_legacy_master_substrate/settlements_substrate.geojson.
contact_graph_viewer
Loads: settlements_substrate.geojson (relative, in data/derived/contact_graph_viewer/) and settlement_contact_graph.json (same directory).
Whether this is the same geojson used during adjacency derivation depends on when that directory was last built and whether the script copied the then-canonical substrate. As built from the current repo, it would use whatever substrate was written into that folder at build time (typically the current canonical one). So either same or later/different depending on when it was last built; treat as “later/different” if you have since switched to SVG-derived substrate.
Legacy master-derived substrate
File: data/derived/_legacy_master_substrate/settlements_substrate.geojson.
This is the same geojson type (master-derived) that was used during settlement adjacency derivation (Phase 0/1). The viewer in the same folder does not point at this file; it points at /data/derived/settlements_substrate.geojson, so it does not show this legacy geojson without serving/path changes.
FORAWWV note (flag only; no edit)
Adjacency correctness was established when the substrate was master-derived (bih_master.geojson). Canonical substrate is now SVG-derived and is documented in FORAWWV (e.g. §2.2, §2.3, §3.1). If you need to tie “correct” adjacency explicitly to geometry provenance, docs/FORAWWV.md may require an addendum about geometry provenance vs adjacency derivation (e.g. that Phase 1 adjacency was validated against the master-derived substrate preserved under _legacy_master_substrate). Do not edit FORAWWV automatically.
Mistake guard (for any future script that touches files)
Use in that script:
import { loadMistakes, assertNoRepeat } from '../tools/assistant/mistake_guard.js';const mistakes = loadMistakes();assertNoRepeat("diagnostic recover settlement adjacency viewer used during correct geometry phase");
This diagnostic run was read-only (no file modifications), so no script was executed that required the guard.

I opened the http://localhost:8080/data/derived/substrate_viewer/. That is the correct settlement map and the one I want to use. Is it possible we have been pulling the wrong one for the political control? Give me cursor code to check and if so, adjust
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase F6 — Dev runner political control viewer geometry source audit + fix (if mismatched).

MISSION
Verify whether political control rendering is pulling a different GeoJSON than the “correct” settlement map seen at:
http://localhost:8080/data/derived/substrate_viewer/
If mismatched, adjust political control viewer/backend to use the SAME geometry source as substrate_viewer: /data/derived/settlements_substrate.geojson.

SCOPE (TIGHT, BUT PRACTICAL)
- Prefer the smallest possible change set.
- You MAY edit only the files necessary to (a) confirm the geometry source and (b) make political_control.html load the same GeoJSON as substrate_viewer.
- Do NOT change mechanics, data derivation, or any derived GeoJSON content.
- Do NOT regenerate substrate as part of the fix.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase F6 entry to docs/PROJECT_LEDGER.md ONLY if code changes occur.
  (If audit finds no mismatch and no code changes are needed, do not write ledger, do not commit.)

MISTAKE GUARD (REQUIRED)
In any file you modify (or in a small local block near the top if it’s a script/server file), add:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase f6 political control viewer uses same settlements_substrate_geojson as substrate_viewer");
Adjust relative path if the file is not two levels deep; ensure it resolves correctly.

FORAWWV NOTE (MANDATORY)
If this investigation reveals a systemic design insight or invalidates an assumption, flag that docs/FORAWWV.md may require an addendum, but DO NOT edit it automatically.

TASK 1 — FIND WHAT POLITICAL CONTROL USES FOR GEOMETRY (NO ASSUMPTIONS)
1) Locate political control viewer entrypoint(s):
- Search for political_control.html and any route serving it.
- Identify whether it fetches GeoJSON directly (static path) or via an API endpoint.

Run these searches:
- rg -n "political_control\.html|political control" .
- rg -n "settlements_substrate\.geojson|substrate\.geojson|bih_master\.geojson|_legacy_master_substrate" .
- rg -n "fetch\\(|/api/.*substrate|geojson" tools/dev_runner src data/derived

2) Record the exact geometry source used by political control:
- The exact URL/path requested in the browser (string in code).
- The actual file it resolves to in the repo.

3) Compare to substrate_viewer:
Confirm substrate_viewer loads:
- /data/derived/settlements_substrate.geojson
and uses:
- data/derived/settlements_substrate.geojson (current canonical file)

TASK 2 — IF MISMATCHED, FIX TO USE THE SAME GEOJSON AS SUBSTRATE_VIEWER
Only if political control is using a different GeoJSON (wrong file, wrong directory, legacy copy, or API returning different geometry):
A) Prefer a minimal fix:
- Change political_control.html (or its JS) to request /data/derived/settlements_substrate.geojson
  OR
- If political control must use an API endpoint (CORS / dev runner constraints), change the endpoint to serve the same file as substrate_viewer uses (data/derived/settlements_substrate.geojson), without rewriting it.
B) Do NOT copy files.
C) Do NOT switch to legacy master substrate.
D) Keep all outputs deterministic (no timestamps).

TASK 3 — PROVE IT WITH A SMALL AUDIT TRACE (NO NEW FILES)
Add a small, deterministic, non-timestamp trace that makes it obvious which geometry source political control is using:
- Example: include a JSON field in an existing metadata response (or console log once at startup) that prints the resolved geometry path string.
- Do NOT include file mtimes, sizes, or hashes (they change); include only the canonical path string.

VALIDATIONS (ALWAYS RUN IF YOU CHANGED CODE)
- npm run typecheck
- npm test
- npm run sim:run
- npm run dev:runner

MANUAL CHECKS (REQUIRED)
1) Start a static server (or whatever you already use) and open:
- http://localhost:8080/data/derived/substrate_viewer/
Confirm it shows the “correct settlement map” baseline.

2) Start dev runner and open:
- http://localhost:3000/political_control.html (or the actual port you are using)
Confirm political control map geometry now matches the substrate_viewer geometry (no “wrong file” distortions).

3) Also open:
- http://localhost:3000/api/political_control
- http://localhost:3000/api/political_control_audit
Ensure counts remain canonical and unchanged.

LEDGER UPDATE (ONLY IF CODE CHANGED)
Append Phase F6 entry to docs/PROJECT_LEDGER.md:
- Summary: Political control viewer geometry source aligned to canonical settlements_substrate.geojson
- Change: Identify previous geometry source; update to /data/derived/settlements_substrate.geojson
- Files modified: (list exact)
- Mistake guard phrase (exact)
- FORAWWV note: none, unless you found a systemic mismatch that needs future documentation

COMMIT (ONLY IF CODE CHANGED; COMMIT-PER-PHASE)
- git status (must be only intended files)
- git add <only intended files> docs/PROJECT_LEDGER.md
- git commit -m "Phase F6: political control viewer uses canonical settlements_substrate geojson

- Audit political control geometry source
- Align viewer/API to /data/derived/settlements_substrate.geojson
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- You can point to one exact line/path proving what political control used before.
- If it was wrong, political_control now loads the SAME GeoJSON as substrate_viewer: /data/derived/settlements_substrate.geojson
- Political control counts remain unchanged (canonical post-E8).
- typecheck/tests/sim run pass.
- One small Phase F6 commit, only if changes were necessary.

DELIVERABLE
In your final Cursor message, include:
- “BEFORE” geometry source (exact path string)
- “AFTER” geometry source (exact path string, should match substrate_viewer)
- Files changed (or “no changes needed”)
- Validation results
```
---

**User**

I want to solve these map problems once and for all. I got geojson data for national border and municipalities, attached. Assume they are in data/source/geo folder. I want a prompt that will let Cursor examine them, decide how he can use it to triangulate and fix our map with proper coordinates.
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G1 — GeoBoundaries triangulation audit + coordinate unification plan (and, if safe, a deterministic prototype transform + overlay viewer).

MISSION
We now have authoritative external GeoJSON for:
- national border (ADM0)
- municipalities (ADM3)
Assume these ZIPs are present in repo at: data/source/geo/
(If not, copy them there from the mounted paths.)

Your job:
1) Inspect these datasets (CRS, bounds, geometry validity, topology).
2) Compare them to our current canonical settlement substrate geometry (data/derived/settlements_substrate.geojson).
3) Determine whether our “map problems” are caused by coordinate space mismatch (SVG/pixel space vs WGS84, axis swap, projection mismatch, scaling, or translation).
4) Produce a deterministic, reproducible method to triangulate and fix coordinates (or prove we already match WGS84).
5) Deliver a practical, runnable overlay viewer/debug artifact that lets the user confirm alignment visually.

DO NOT change mechanics, political control logic, or adjacency rules in this phase.
This phase is about GEOMETRY COORDINATE CONSISTENCY ONLY.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append a Phase G1 entry to docs/PROJECT_LEDGER.md (only if any repo files are changed).
  If you make no changes (audit-only), do not write ledger, do not commit.

MISTAKE GUARD (REQUIRED)
In any NEW script file you create under scripts/ (and in any existing script you modify), add:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g1 geoboundaries triangulation audit + coordinate unification");
Adjust the relative path if needed so it resolves correctly.

FORAWWV NOTE (MANDATORY RULE)
If this work reveals a systemic design insight or invalidates an assumption (e.g., substrate coordinates are not in a geographic CRS, or the “canonical” substrate has mixed CRS), FLAG that docs/FORAWWV.md may require an addendum, but DO NOT edit FORAWWV.md automatically.

INPUTS (AVAILABLE)
Mounted ZIPs (for reference if needed):
- /mnt/data/geoBoundaries-BIH-ADM0-all.zip
- /mnt/data/geoBoundaries-BIH-ADM3-all.zip
Repo assumed location:
- data/source/geo/geoBoundaries-BIH-ADM0-all.zip
- data/source/geo/geoBoundaries-BIH-ADM3-all.zip
Canonical substrate:
- data/derived/settlements_substrate.geojson

OUTPUTS (DETERMINISTIC; NO TIMESTAMPS)
Create ONLY derived debug artifacts under:
- data/derived/_debug/geo_triangulation/
Do not overwrite canonical substrate yet.

ALLOWED CHANGES
Prefer minimal, but you may add:
- scripts/map/geo/phase_g1_geoboundaries_audit.ts (new)
- scripts/map/geo/phase_g1_overlay_pack.ts (new)
- package.json (only if you need to add npm scripts; keep minimal)
- docs/PROJECT_LEDGER.md (only if code changes)

No other files unless absolutely necessary. If you must touch more, explain why in the final message.

TASK 1 — ENSURE THE NEW DATA IS PRESENT AND READABLE
1) If data/source/geo/*.zip are missing, copy them from the mounted paths into data/source/geo/ (do not rename).
2) Unzip them into deterministic folders:
- data/source/geo/ADM0/
- data/source/geo/ADM3/
Do not delete the zips.

TASK 2 — WRITE A DETERMINISTIC AUDIT SCRIPT
Create: scripts/map/geo/phase_g1_geoboundaries_audit.ts

The script must:
A) Load these datasets (handle typical geoBoundaries structure; locate .geojson files inside ADM0/ and ADM3/).
B) For each dataset and for our substrate:
   - Determine coordinate “shape” heuristics:
     * bbox minX, minY, maxX, maxY
     * coordinate magnitude ranges (e.g., lat/lon-like vs pixel-like)
     * detect possible axis swap (if “lat” range looks like 13–20 and “lon” range looks like 42–46)
   - Validate geometry:
     * count features
     * detect invalid rings / non-closed polygons
     * count MultiPolygon vs Polygon
     * compute total vertex counts (approx)
C) Load data/derived/settlements_substrate.geojson and compute its bbox and coordinate heuristics similarly.
D) Emit a single deterministic JSON report:
- data/derived/_debug/geo_triangulation/audit_report.json
and a human-readable deterministic text summary:
- data/derived/_debug/geo_triangulation/audit_report.txt

The audit must conclude ONE of these outcomes (explicitly in the report):
1) substrate_is_wgs84_like: true/false
2) substrate_axis_swapped: true/false
3) substrate_is_projected_like: true/false (coords resemble meters)
4) substrate_is_pixel_like: true/false
5) recommended_fix: one of:
   - "none"
   - "swap_axes"
   - "reproject"
   - "bbox_affine_seed"
   - "unknown_need_manual_control_points"

TASK 3 — TRIANGULATION / FIX STRATEGY (SAFE PROTOTYPE ONLY)
Based on audit outcome:
- If substrate_axis_swapped is true:
  Implement a reversible transform function (swap x/y) in the overlay pack step (Task 4) but DO NOT rewrite canonical substrate.
- If substrate_is_pixel_like is true:
  Create a first-pass affine seed transform using ONLY bbox matching:
    map substrate bbox -> ADM0 bbox via scale+translate (no rotation)
  This is NOT final truth, but it lets us see if we’re broadly in the right space.
  Record in the report that this is a seed only, and that a stronger fit may require additional anchoring later.
- If substrate_is_projected_like:
  Identify whether the geoBoundaries geojson includes CRS metadata (often implicit WGS84).
  If we can confidently identify substrate CRS (rare), propose a reprojection plan.
  If not confident, do NOT reproject; flag “unknown_need_manual_control_points”.

All transforms must be deterministic and documented in the report.

TASK 4 — BUILD AN OVERLAY PACK + VIEWER (NO UI REWORK; DEBUG ONLY)
Create: scripts/map/geo/phase_g1_overlay_pack.ts

This script must:
A) Read:
- ADM0 GeoJSON
- ADM3 GeoJSON
- settlements_substrate.geojson
B) Apply the “recommended_fix” transform ONLY to a COPY of the substrate for debug overlay:
- data/derived/_debug/geo_triangulation/substrate_transformed_preview.geojson
C) Produce a single bundled JSON suitable for a simple fetch-based viewer:
- data/derived/_debug/geo_triangulation/overlay_data.json
Include:
{
  meta: {
    fix_applied: "none|swap_axes|bbox_affine_seed|reproject|unknown_need_manual_control_points",
    adm0_source_file: "...",
    adm3_source_file: "...",
    substrate_source_file: "data/derived/settlements_substrate.geojson",
    notes: [...]
  },
  layers: {
    adm0: <geojson>,
    adm3: <geojson>,
    substrate_preview: <geojson>
  }
}
D) Create a minimal static viewer under:
- data/derived/_debug/geo_triangulation/viewer/index.html
(no frameworks; just canvas or SVG; three toggleable layers; basic pan/zoom; deterministic)
If a viewer already exists in repo that can be repurposed without touching canonical viewer code, you may copy its pattern, but do NOT change existing canonical viewer directories.

TASK 5 — ADD NPM SCRIPTS (ONLY IF NECESSARY)
If there are no existing scripts that fit, add:
- "map:geo:g1:audit": run the audit script
- "map:geo:g1:overlay": run the overlay pack script
- "map:geo:g1:serve": serve repo root (or the debug folder) on a fixed port, e.g. 8081
Keep changes minimal and deterministic.

TASK 6 — RUN + VERIFY
Run:
- npm run typecheck
- npm test
Then run:
- npm run map:geo:g1:audit
- npm run map:geo:g1:overlay
Serve and open:
- http://localhost:8081/data/derived/_debug/geo_triangulation/viewer/
Confirm you can visually compare:
ADM0 border vs substrate preview.
Also test toggling ADM3 to see if municipal outlines roughly align.

IMPORTANT: Do NOT attempt to “perfect fit” in this phase. The goal is to conclusively diagnose whether we are using wrong coordinate space and to produce a repeatable triangulation method + visual proof.

TASK 7 — LEDGER + COMMIT DISCIPLINE
If (and only if) you changed repo files:
- Append Phase G1 entry to docs/PROJECT_LEDGER.md including:
  * what files were inspected
  * audit conclusion
  * recommended_fix
  * new debug artifacts paths
  * mistake guard phrase
  * FORAWWV note if applicable (flag only)
- Single scoped commit:
  git add (only intended new scripts/debug viewer + package.json if changed + ledger)
  git commit -m "Phase G1: geoBoundaries triangulation audit and overlay debug pack

- Audit ADM0/ADM3 vs substrate coordinate space
- Generate deterministic overlay pack + minimal debug viewer
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- Deterministic audit report exists (json + txt) and clearly states whether substrate matches WGS84-like coordinates or not.
- Deterministic overlay viewer exists and is runnable locally, showing ADM0/ADM3/substrate preview layers.
- A concrete “coordinate unification plan” is stated in the audit report:
  either “no fix needed” OR a specific transform category and why.
- No canonical geometry files are overwritten in this phase.
- Validations pass.
- Single commit, only if files changed.

DELIVERABLE (IN YOUR FINAL MESSAGE)
Provide:
1) The audit conclusion (recommended_fix + key bbox numbers for ADM0 and substrate).
2) Exact commands to run:
   - audit
   - overlay build
   - serve
3) The exact URL to open the debug viewer.
4) If mismatch is confirmed, a proposed next Phase G2 plan (short) to apply the validated transform to canonical pipeline (do NOT do it now).

REMINDER
If any systemic design insight appears, flag that FORAWWV.md may need an addendum, but do not edit it automatically.
```
---

**Assistant**

from PIL import Image, ImageEnhance
img=Image.open('/mnt/data/5a8c08f6-cf1a-4f19-b91f-dedbb4ef57f7.png')
img.size
---

**Assistant**

(2048, 918)
---

**Assistant**

import matplotlib.pyplot as plt
plt.figure(figsize=(12,5))
plt.imshow(img)
plt.axis('off')
plt.show()
---

**Assistant**

Matplotlib is building the font cache; this may take a moment.

<<ImageDisplayed>>
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase F7.1 — SVG coordinate-regime classifier fix + revert broken manual overrides + keep Bužim→Cazin mun1990 remap correct

MISSION
The substrate viewer became worse after introducing a hard-coded LOCAL_COORDINATE_FILES list and a Bužim→Cazin merge tweak.
Your job is to:
1) Reproduce the break.
2) Identify exactly what changed (diff + runtime evidence).
3) Replace the brittle/manual LOCAL list with a deterministic per-file classifier that chooses “apply viewBox offset” vs “no offset” based on objective fit to the global coordinate regime.
4) Ensure Bužim is mapped to Cazin’s mun1990 id deterministically and correctly (no accidental string municipality ids like "Cazin").
5) Regenerate substrate + viewer index and confirm Bihać/Cazin/Bužim render correctly without breaking other regions.

ABSOLUTE CONSTRAINTS
- Deterministic output only (stable ordering; no timestamps in artifacts).
- Do NOT introduce new mechanics.
- Do NOT “fix” geometry by tolerances, snapping, or simplifying unless explicitly elevated to canon (not in this phase).
- Prefer minimal file changes.
- Commit-per-phase discipline.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append a Phase F7.1 entry to docs/PROJECT_LEDGER.md (only if code changes occur).

MISTAKE GUARD (REQUIRED)
In any script file you modify/create for this phase, add:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase f7.1 svg per-file coordinate regime classifier replace manual local list + bužim remap");

FORAWWV NOTE (MANDATORY)
If this work reveals a systemic design insight or invalidates an assumption, flag that docs/FORAWWV.md may require an addendum, but DO NOT edit it automatically.

FILES YOU MAY TOUCH
Primary:
- scripts/map/derive_settlement_substrate_from_svg_sources.ts
- docs/PROJECT_LEDGER.md
Secondary (only if strictly necessary for deterministic audit visibility):
- scripts/map/build_substrate_viewer_index.ts (avoid if possible)
- data/derived/_debug/** (new debug outputs allowed)
Do NOT change any other canonical pipeline files unless unavoidable; if you must, explain why.

STEP 0 — SNAPSHOT THE BREAK (REPRO FIRST)
1) Show current git status and diff:
- git status
- git diff --stat
- git diff

2) Run the pipeline exactly as the user did:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
Then serve and open (manual):
- npx http-server -p 8080 -c-1
- http://localhost:8080/data/derived/substrate_viewer/index.html
Confirm (in your notes) what is broken about Bihać/Cazin/Bužim and whether any other regions shifted.

STEP 1 — IDENTIFY THE SPECIFIC BUGS INTRODUCED
A) Verify municipality_id typing
Search in the substrate derivation output schema: municipality_id should be numeric-like string mun1990 id (e.g., "10227"), NOT display names like "Cazin".
- Inspect the code path that assigns municipalityId.
- Ensure there is no accidental overwrite (the user log showed duplicated assignments and an intermediate municipalityId = 'Cazin' which is wrong).

B) Verify offset is applied exactly once
Confirm whether the pipeline currently:
- applies a heuristic per-file AND also applies LOCAL_COORDINATE_FILES
- or applies offset in multiple branches for the same file
Fix so each file chooses exactly one coordinate regime (offset applied OR not applied), never both.

STEP 2 — REMOVE BRITTLE MANUAL LOCAL LIST, REPLACE WITH DETERMINISTIC CLASSIFIER
Delete the hard-coded LOCAL_COORDINATE_FILES set.
Replace it with a deterministic per-file decision that does NOT depend on ad-hoc thresholds like “min < 100”.

Implement this classifier inside derive_settlement_substrate_from_svg_sources.ts:

For each source file:
1) Parse viewBox (vx, vy, vw, vh).
2) Compute path bounds in file-local coordinates: bbox_local = [minx, miny, maxx, maxy].
3) Consider two candidate “globalized” bboxes:
   - bbox_as_global (no offset): bbox_local
   - bbox_as_local (apply viewBox offset): [minx+vx, miny+vy, maxx+vx, maxy+vy]

Now decide which candidate is correct via objective fit:

A) Establish a robust “reference global space” from the corpus itself
- On the first pass, assume no offset for all files and collect bbox centers (cx, cy).
- Compute robust median center (median cx, median cy) and robust spread (median absolute deviation) over all files.
- This produces a stable “global coordinate regime” without needing hardcoded municipal knowledge.

B) For each file, compute distance-to-regime for both candidates
- dist_global = distance(center(bbox_as_global), median_center)
- dist_local  = distance(center(bbox_as_local),  median_center)

Choose offset-applied if:
- dist_local is meaningfully smaller than dist_global by a deterministic ratio threshold (e.g., dist_local <= 0.6 * dist_global)
AND applying offset does not explode bbox size beyond plausible ranges (guard against NaNs / huge jumps).
Otherwise choose no offset.

C) Add deterministic tie-breakers
If distances are equal within epsilon:
- Prefer NO offset unless viewBox has negative vx/vy and bbox_as_local moves into the reference cluster (deterministic rule).

This classifier must be stable across runs and independent of file ordering:
- Sort files by filename before computing medians and applying decisions.

STEP 3 — PRODUCE A DETERMINISTIC AUDIT ARTIFACT (DEBUG ONLY)
Write:
data/derived/_debug/svg_coordinate_regime_audit.json
containing stable-sorted per file entries:
{
  file: "...",
  viewBox: {x,y,w,h},
  bbox_local: [...],
  bbox_as_global: [...],
  bbox_as_local: [...],
  dist_global: number,
  dist_local: number,
  offset_applied: boolean
}
Also write a short text summary:
data/derived/_debug/svg_coordinate_regime_audit.txt
Include:
- total files analyzed
- number offset_applied true/false
- list of top 20 files by (dist_global - dist_local) improvement (stable sorted)

No timestamps.

STEP 4 — Bužim→Cazin REMAP (CORRECTLY, AND ONLY AT MUNICIPALITY-ID LEVEL)
Implement the Bužim remap as:
If srcFile === 'Buzim_11240.js' then municipality_id = '10227' (Cazin mun1990 id)
Do NOT ever set municipality_id to a name like "Cazin".
Keep it in exactly one place in the assignment flow, after parsing srcFile and before emitting feature properties.

If there is any separate “display name” field, keep it separate and do not conflate with municipality_id.

STEP 5 — REGENERATE + VERIFY
Run:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
- npm run typecheck
- npm test

Manual viewer check:
- npx http-server -p 8080 -c-1
- http://localhost:8080/data/derived/substrate_viewer/index.html
Specifically verify:
- Bihać geometry aligns (not displaced/warped)
- Cazin aligns
- Bužim area is present but municipality_id is "10227" and visually contiguous with Cazin (as per your merge rule)
- No new “global shift” artifacts in other municipalities

STEP 6 — VALIDATIONS (ALWAYS RUN)
- npm run typecheck
- npm test
(If your repo expects it in this phase, also run:)
- npm run sim:run

STEP 7 — LEDGER + COMMIT (ONLY IF CODE CHANGED)
Update docs/PROJECT_LEDGER.md with Phase F7.1 entry:
- Summary: Replaced brittle local-coordinate overrides with deterministic per-file coordinate regime classifier; fixed Bužim→Cazin mun1990 id mapping
- Change: removed LOCAL_COORDINATE_FILES; implemented robust median-based classifier; added debug audit artifact path
- Files modified (exact)
- Mistake guard phrase (exact)
- FORAWWV note: “None” unless you uncovered a systemic coordinate-regime contradiction, in which case flag addendum needed but do not edit FORAWWV.md

Commit (single, phase-labeled):
- git status (must only show intended files)
- git add scripts/map/derive_settlement_substrate_from_svg_sources.ts docs/PROJECT_LEDGER.md data/derived/_debug/svg_coordinate_regime_audit.json data/derived/_debug/svg_coordinate_regime_audit.txt
- git commit -m "Phase F7.1: deterministic SVG coordinate regime classifier + Bužim→Cazin mun1990 remap

- Replace brittle manual local-file list with robust per-file classifier
- Fix municipality_id assignment (no name strings); Bužim mapped to Cazin mun1990 id
- Emit deterministic audit artifacts; run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- No hard-coded LOCAL_COORDINATE_FILES list remains.
- Offset is applied at most once per file, chosen deterministically.
- municipality_id values are always mun codes (e.g. "10227"), never "Cazin".
- Bihać/Cazin/Bužim render correctly in substrate_viewer.
- Tests pass.
- A deterministic audit artifact exists showing which files are offset_applied and why.

FINAL OUTPUT REQUIREMENT (YOUR CURSOR MESSAGE)
Return:
- What exact bug caused the worsening (with a short code reference)
- How many files are classified as offset_applied after fix
- Confirmation of Bihać/Cazin/Bužim status
- Commands to reproduce + path to the audit artifacts
- Validation results
```
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase F7.2 — Fix northwest SVG coordinate regime (Bihać, Cazin, Velika Kladuša) without collateral damage

MISSION
Only three municipalities remain broken in the substrate viewer: Bihać, Cazin, Velika Kladuša.
We must fix their geometry alignment in the SVG-derived substrate pipeline in a way that is:
- deterministic
- per-file consistent
- does NOT shift other municipalities
- does NOT introduce new smoothing/tolerance mechanics

We will stop using the fragile min-threshold heuristic for these northwest cases and instead implement a deterministic per-file decision based on the file’s own viewBox and path bounds, plus a small audit to confirm.

ABSOLUTE CONSTRAINTS
- Deterministic output only (stable ordering; no timestamps).
- Do NOT change mechanics, adjacency logic, or political control.
- Do NOT add tolerance/snap/simplify logic.
- Keep changes minimal and localized.
- Commit-per-phase discipline.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append a Phase F7.2 entry to docs/PROJECT_LEDGER.md (only if code changes occur).

MISTAKE GUARD (REQUIRED)
In scripts/map/derive_settlement_substrate_from_svg_sources.ts add/ensure:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase f7.2 fix bihać cazin velika kladuša svg coordinate regime + audit");

FORAWWV NOTE (REQUIRED)
If we discover that northwest files mix coordinate regimes (some local, some global) or require special-case merging, flag that docs/FORAWWV.md may require an addendum, but DO NOT edit it automatically.

FILES TO TOUCH (MINIMAL)
- scripts/map/derive_settlement_substrate_from_svg_sources.ts
- docs/PROJECT_LEDGER.md
Optional (debug only):
- data/derived/_debug/svg_nw_regime_audit.json
- data/derived/_debug/svg_nw_regime_audit.txt

DO NOT modify any other files unless absolutely necessary.

TASK 1 — CONFIRM THE 3 PROBLEM FILES (NO ASSUMPTIONS)
1) Identify the exact source filenames for:
- Bihać
- Cazin
- Velika Kladuša
Search in the SVG source index or whatever registry the script uses.
Use ripgrep:
- rg -n "Bihac_|Biha" scripts/map data/source
- rg -n "Cazin_" scripts/map data/source
- rg -n "Kladusa|Kladu" scripts/map data/source

Write down the exact filenames, e.g.:
- Bihac_10049.js
- Cazin_10227.js
- Velika_Kladusa_?????.js (determine exact)

TASK 2 — IMPLEMENT A STRICT PER-FILE OVERRIDE FOR THESE 3 (NO HEURISTIC)
In derive_settlement_substrate_from_svg_sources.ts:

A) Replace any existing LOCAL list logic so it is:
- ONLY used for a very small explicit override set
- and ONLY for “apply viewBox offset” decision
No other municipalities are in this set.

Create:
const FORCE_VIEWBOX_OFFSET_FILES = new Set([
  'Bihac_10049.js',
  'Cazin_10227.js',
  '<Velika_Kladusa_exact_filename>.js',
  'Buzim_11240.js' // keep if still needed AND confirmed
]);

And ensure the decision logic is:
- if file in FORCE_VIEWBOX_OFFSET_FILES => apply viewBox offset
- else => do NOT use the minx/miny heuristic at all for offset choice
  (we’re removing the heuristic to avoid regressions; if removal feels too risky, keep it but gate it behind a “legacy heuristic” flag default false; however prefer removal.)

Rationale:
We have empirical evidence that heuristic is misclassifying northwest.
We accept a minimal explicit override for these specific files.

B) Ensure offset is applied exactly once
There must be exactly one place where we convert path coords into global coords:
- either apply viewBox offset
- or don’t
Never both.

TASK 3 — AUDIT OUTPUT FOR THESE 3 FILES (DEBUG ONLY)
Within the derive script, add a small deterministic audit capture for ONLY the four northwest files in FORCE_VIEWBOX_OFFSET_FILES (or 3 if Bužim excluded):
For each, record:
- file name
- viewBox x,y,w,h
- bbox_local minx,miny,maxx,maxy
- bbox_after (post-offset if applied)
- offset_applied true/false
Write:
data/derived/_debug/svg_nw_regime_audit.json (stable sorted)
and a tiny text summary:
data/derived/_debug/svg_nw_regime_audit.txt

No timestamps, no randomness.

TASK 4 — FIX MUNICIPALITY ID REMAP CLEANLY (NO NAMES)
Ensure any Bužim remap (if still in scope) sets municipality_id to the mun1990 id string (e.g. "10227") and never "Cazin".
If Velika Kladuša has any post-1995 naming issues, do NOT merge it; just ensure its municipality_id is correct per registry/remap logic already in the pipeline.

TASK 5 — REBUILD AND VERIFY
Run:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
- npm run typecheck
- npm test

Manual:
- npx http-server -p 8080 -c-1
- open http://localhost:8080/data/derived/substrate_viewer/index.html
Verify:
- Bihać in correct location and shape
- Cazin in correct location and shape
- Velika Kladuša in correct location and shape
- No new detached clusters elsewhere

TASK 6 — VALIDATIONS (ALWAYS)
- npm run typecheck
- npm test
(If your workflow expects it here:)
- npm run sim:run

TASK 7 — LEDGER + COMMIT (COMMIT-PER-PHASE)
Update docs/PROJECT_LEDGER.md with Phase F7.2 entry:
- Summary: Fixed northwest SVG coordinate regime by forcing viewBox offset for Bihać/Cazin/Velika Kladuša (and Bužim if applicable)
- Change: removed/disabled heuristic for offset selection (or explicitly scoped it away from these files); added debug audit artifacts
- Files modified: (exact)
- Mistake guard phrase: (exact)
- FORAWWV note: none, unless you found mixed-regime inside a single municipality, then flag addendum needed (do not edit FORAWWV.md)

Commit:
- git status (only intended files)
- git add scripts/map/derive_settlement_substrate_from_svg_sources.ts docs/PROJECT_LEDGER.md data/derived/_debug/svg_nw_regime_audit.json data/derived/_debug/svg_nw_regime_audit.txt
- git commit -m "Phase F7.2: fix Bihać/Cazin/Velika Kladuša SVG coordinate regime

- Force viewBox offset for northwest files to align with global SVG space
- Emit deterministic NW audit artifacts; regenerate substrate + viewer index
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- Substrate viewer shows Bihać, Cazin, Velika Kladuša correctly positioned.
- No new detached clusters elsewhere.
- Deterministic NW audit artifacts exist and show offset_applied true for those files.
- Tests pass.
- Single commit, scoped.

HOW TO RUN / TEST
1) npm run map:derive:substrate
2) npm run map:viewer:substrate:index
3) npx http-server -p 8080 -c-1
4) http://localhost:8080/data/derived/substrate_viewer/index.html
```
---

**User**

Summary of Phase F7.2:
TASK 1 — Problem files
Bihać: Bihac_10049.js
Cazin: Cazin_10227.js
Velika Kladuša: Velika Kladusa_11118.js (from data/source/svg_join_order_report.json)
Bužim: Buzim_11240.js (kept in the override set)
TASK 2 — Per-file override (no heuristic)
In derive_settlement_substrate_from_svg_sources.ts:
FORCE_VIEWBOX_OFFSET_FILES replaces LOCAL_COORDINATE_FILES and includes:
Bihac_10049.js, Cazin_10227.js, Velika Kladusa_11118.js, Buzim_11240.js
shouldApplyViewBoxOffset now uses only this set: if the file is in the set and has a viewBox, apply offset; otherwise do not. The previous minx < 100 && miny < 100 heuristic is removed.
Offset is applied in a single place (after validation, before bounds/feature emission).
TASK 3 — NW audit (debug)
For each of the four files, the script records: file, viewBox, bbox_local, bbox_after, offset_applied.
Writes:
data/derived/_debug/svg_nw_regime_audit.json (sorted by file name)
data/derived/_debug/svg_nw_regime_audit.txt
All four entries have offset_applied: true.
data/derived/_debug/ is in .gitignore, so these files are not in the commit but are regenerated on each npm run map:derive:substrate.
TASK 4 — Municipality ID
For every feature from Buzim_11240.js (matched and unmatched), municipality_id is set to the mun1990 id "10227" (never "Cazin").
Velika Kladuša stays as-is (mun1990 id from census/registry; no merge changes).
TASK 5–6 — Rebuild and validate
npm run map:derive:substrate — ok
npm run map:viewer:substrate:index — ok (global bbox e.g. minx -39)
npm run typecheck — ok
npm test — 277 tests passed
TASK 7 — Ledger and commit
Phase F7.2 appended to docs/PROJECT_LEDGER.md (summary, change, files modified, mistake guard, FORAWWV note: none).
Mistake guard: assertNoRepeat("phase f7.2 fix bihać cazin velika kladuša svg coordinate regime + audit") and import from '../../tools/assistant/mistake_guard.js'.
Commit: e280e69 — “Phase F7.2: fix Bihać/Cazin/Velika Kladuša SVG coordinate regime” (script, ledger, substrate geojson/audits, substrate viewer index/html/viewer.js).
FORAWWV: No addendum; no mixed regime found inside a single municipality.
Manual check: Run npx http-server -p 8080 -c-1 and open http://localhost:8080/data/derived/substrate_viewer/index.html to confirm Bihać, Cazin, and Velika Kladuša are in the right place and no new detached clusters appear elsewhere.

However, it's still not fixed. Also, Bužim is wrong too.
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase F7.3 — Northwest SVG regime: diagnose why overrides didn’t fix Bihać/Cazin/Velika Kladuša/Bužim, then replace “force offset” with a deterministic two-candidate chooser (offset vs no-offset) proven by audit.

SCOPE
Fix ONLY the SVG substrate derivation behavior for the northwest problem files.
No new mechanics, no tolerance/snap/simplify.
Deterministic only (stable ordering, no timestamps).
Commit-per-phase discipline.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append a Phase F7.3 entry to docs/PROJECT_LEDGER.md (only if code changes occur).

MISTAKE GUARD (REQUIRED)
In scripts/map/derive_settlement_substrate_from_svg_sources.ts:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase f7.3 nw svg offset chooser audit + fix bužim/bihac/cazin/kladusa");

FORAWWV NOTE (REQUIRED)
If we discover these municipalities are composed of multiple SVG source files with mixed regimes, or if the “join order” implies a non-unique mapping, flag that docs/FORAWWV.md may require an addendum, but DO NOT edit it automatically.

FILES TO TOUCH
- scripts/map/derive_settlement_substrate_from_svg_sources.ts
- docs/PROJECT_LEDGER.md
Optional (debug output only; remains under _debug/):
- data/derived/_debug/svg_nw_offset_chooser_audit.json
- data/derived/_debug/svg_nw_offset_chooser_audit.txt

DO NOT change any other files unless absolutely necessary.

WHY THIS PHASE EXISTS (DON’T SKIP)
The Phase F7.2 “force offset” approach can still be wrong if:
- the file’s path coordinates are already global (so adding viewBox shifts incorrectly),
- the file name match is not exact at runtime (space/Unicode normalization),
- the municipality geometry is split across additional SVG files not in the override set,
- the correct transform is “no offset” for some of these files (or depends on viewBox sign).

We will stop guessing and prove the correct choice for each file by comparing both candidates to the global regime.

TASK 1 — REPRO + COLLECT “WHAT EXACTLY IS WRONG”
1) Confirm current branch state:
- git status
- git log -1 --oneline
2) Run:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
3) Serve + verify (manual):
- npx http-server -p 8080 -c-1
- http://localhost:8080/data/derived/substrate_viewer/index.html
Note in your working notes (not in code) what “wrong” means:
- shifted northwest cluster?
- mirrored?
- detached islands?
- overlaps?

TASK 2 — HARD PROOF: ARE WE EVEN OVERRIDING THE RIGHT FILES?
In derive_settlement_substrate_from_svg_sources.ts add a deterministic one-time log (NO timestamps) AND a debug audit file for the NW candidates.

A) Normalize source filename matching deterministically
Create a helper:
function normFile(s: string): string {
  return s.normalize('NFKC').replace(/\\/g,'/').split('/').pop()!.trim();
}
Use normFile(srcFile) everywhere you compare filenames (including the NW set membership), so "Velika Kladusa_11118.js" matches exactly.

B) During parse/loop, for every parsed file whose normFile(name) is one of:
- Bihac_10049.js
- Cazin_10227.js
- Velika Kladusa_11118.js
- Buzim_11240.js
write an entry to:
data/derived/_debug/svg_nw_offset_chooser_audit.json
containing:
{
  file: "…",
  viewBox: { x,y,w,h } | null,
  bbox_local: [minx,miny,maxx,maxy],
  candidate_no_offset_bbox: [minx,miny,maxx,maxy],
  candidate_plus_viewbox_bbox: [minx+vx, miny+vy, maxx+vx, maxy+vy] (only if viewBox),
  candidate_minus_viewbox_bbox: [minx-vx, miny-vy, maxx-vx, maxy-vy] (only if viewBox),
  chosen: "none|plus|minus|unavailable_no_viewbox",
  reason: "…"
}
(sorted by file)

This immediately tells us if:
- viewBox exists,
- plus vs minus is the correct direction,
- we’re matching the right file names.

TASK 3 — BUILD A GLOBAL “REFERENCE REGIME” FROM THE CORPUS (DETERMINISTIC)
We need a stable target to decide which candidate (none/plus/minus) is correct.

Implementation plan (within the same derive script, no new files):
1) Collect per-file “center” for the whole corpus using the NO-OFFSET candidate only:
   center_no_offset = ((minx+maxx)/2, (miny+maxy)/2)
2) Sort file list by normFile(name) before computing anything.
3) Compute robust median center across all files EXCLUDING the NW files:
   median_cx, median_cy
(Implement a deterministic median: sort numeric array; pick middle (or lower-middle) deterministically.)

This gives a reference “global center” cluster (not perfect, but stable).

TASK 4 — DETERMINE CHOICE PER NW FILE: NONE vs PLUS vs MINUS
For each NW file:
- Compute center distance to reference for each candidate:
  d_none, d_plus, d_minus
- Choose the candidate with minimum distance, with deterministic tie-break:
  prefer "none" over "plus" over "minus" if within epsilon (e.g. 1e-6).
- Add a sanity guard to prevent absurd jumps:
  Reject a candidate if its bbox moves outside an expanded global bbox envelope derived from all non-NW files by more than a factor (e.g. if candidate center is farther than 10x the max interquartile range distance). Keep deterministic.
- Record the chosen candidate and distances in the audit file.

IMPORTANT: this chooser is only applied to the NW files. All other files keep current behavior (no heuristic; no forced offset), unchanged.

TASK 5 — APPLY THE CHOSEN TRANSFORM (SINGLE PLACE, ONCE)
Where you currently convert local path coords to “global” coords:
- If chosen === "none": do nothing
- If chosen === "plus": add viewBox.x/y
- If chosen === "minus": subtract viewBox.x/y
Ensure:
- applied exactly once,
- only for those NW files,
- only when viewBox exists.

TASK 6 — BUŽIM REMAP MUST NOT DISTORT GEOMETRY
Keep Bužim → Cazin mun1990 id remap as in F7.2 (municipality_id = "10227"), but do NOT merge polygons, dissolve, or alter geometry.
The only geometry change permitted here is the coordinate transform decision (none/plus/minus).

TASK 7 — REBUILD + VERIFY
Run:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
- npm run typecheck
- npm test
(If your workflow expects it:)
- npm run sim:run

Manual:
- npx http-server -p 8080 -c-1
- http://localhost:8080/data/derived/substrate_viewer/index.html

Check specifically:
- Bihać positioned correctly
- Cazin positioned correctly
- Velika Kladuša positioned correctly
- Bužim positioned correctly (and mun1990 id remapped to Cazin as before)
- No new detached clusters elsewhere

TASK 8 — LEDGER + COMMIT (ONLY IF CODE CHANGED)
Update docs/PROJECT_LEDGER.md with Phase F7.3 entry:
- Summary: Replaced forced viewBox offset with deterministic NW chooser (none/plus/minus) based on corpus reference regime; fixed filename normalization so overrides apply
- Change: added NW offset chooser audit; applied transform exactly once
- Files modified (exact)
- Mistake guard phrase (exact)
- FORAWWV note: none, unless you discover mixed-regime across multiple files per municipality; if so flag addendum needed, do not edit FORAWWV.md

Commit:
- git status (must show only intended files; do not commit _debug outputs if ignored)
- git add scripts/map/derive_settlement_substrate_from_svg_sources.ts docs/PROJECT_LEDGER.md
- git commit -m "Phase F7.3: deterministic NW SVG offset chooser (none/plus/minus) + audit

- Normalize source filenames; prove override hits correct files
- Choose transform per NW file by reference-regime distance; apply once
- Regenerate substrate and confirm viewer; run validations; update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- Audit file shows for each NW file: candidate bboxes, distances, and chosen transform.
- Viewer shows Bihać/Cazin/Velika Kladuša/Bužim in correct place.
- No collateral shifts elsewhere.
- Tests pass.
- Single small Phase F7.3 commit.

HOW TO RUN / TEST
1) npm run map:derive:substrate
2) npm run map:viewer:substrate:index
3) npx http-server -p 8080 -c-1
4) http://localhost:8080/data/derived/substrate_viewer/index.html
5) Inspect:
   data/derived/_debug/svg_nw_offset_chooser_audit.json
   data/derived/_debug/svg_nw_offset_chooser_audit.txt
```
---

**Assistant**

Below is a **ready-to-paste Claude Code prompt**. It is deliberately concrete, scoped, and framed so Claude can reason from the evidence you already gathered, not re-invent heuristics. It also forces it to **prove correctness with artifacts**, not vibes.

---

```txt
You are Claude Code operating inside the “A War Without Victory (AWWV)” repository.
You have full access to the codebase and can read, modify, run, and test code.

PROJECT CONTEXT (DO NOT SKIP)
This is a strategic-level war simulation of Bosnia and Herzegovina (1991–1995).
The map substrate is settlement-level geometry derived from SVG sources.
All simulation logic depends on this geometry being spatially correct and stable.

We are stuck in a loop of “almost fixing” northwest Bosnia geometry:
Bihać, Cazin, Velika Kladuša, and Bužim remain broken after multiple attempts.

Your task is to **solve this permanently**, not heuristically.

---

## WHAT IS BROKEN (FACTS)

Affected municipalities (SVG source files):
- Bihac_10049.js
- Cazin_10227.js
- Velika Kladusa_11118.js
- Buzim_11240.js (post-1995, remapped to Cazin mun1990 id "10227")

Symptoms:
- These municipalities are shifted relative to the rest of Bosnia.
- Applying viewBox offset (+vx,+vy) fixes some but breaks others.
- Subtracting viewBox (-vx,-vy) sometimes “wins” numerically but is visually wrong.
- Heuristic, explicit override, and distance-to-median approaches all failed.

Important observation:
**F7.2 (force PLUS offset) visually placed Bihać correctly**, but broke others earlier.
**F7.3 chooser picks MINUS for Bihać**, which is mathematically closer to corpus median but visually wrong.

This means:
➡️ “distance to global median” is the wrong invariant.
➡️ The correct invariant is **shared borders with neighboring municipalities**, not global centroid proximity.

---

## NON-NEGOTIABLE CONSTRAINTS

- Deterministic output only.
- No tolerance, snapping, simplification, or smoothing.
- No political, adjacency, or mechanics changes.
- Geometry must remain settlement-level, not dissolved.
- Commit-per-phase discipline.
- Prefer the smallest conceptual fix that explains *why* it works.

---

## KEY INSIGHT YOU MUST USE

The northwest municipalities **must align with their immediate neighbors**:
- Bihać ↔ Bosanska Krupa
- Cazin ↔ Bosanska Krupa / Velika Kladuša
- Velika Kladuša ↔ Cazin
- Bužim ↔ Cazin (mun1990 remap only; geometry still must align)

Correctness is **topological continuity**, not centroid proximity.

---

## YOUR TASK (DO NOT GUESS)

### 1. Diagnose the Real Cause
Explain, in concrete terms:
- Why Bihac_10049.js needs `+viewBox` even though corpus median prefers `-viewBox`
- Whether the SVG paths in these files are:
  - partially global, partially local
  - authored in a different SVG export pipeline
  - using inverted Y or flipped origin semantics

This must be based on reading the SVG source structure, not speculation.

---

### 2. Replace the Chooser With a Topology-Based Test
Implement a deterministic decision for NW files based on **border continuity**:

For each NW municipality file:
- Compute two candidate geometries:
  A) no offset
  B) +viewBox offset
  C) -viewBox offset (only if defensible)

For each candidate:
- Measure **shared-edge continuity** with neighboring municipalities’ already-fixed geometry:
  - count of near-touching edges
  - length of overlapping boundary
  - or minimal Hausdorff distance between borders (deterministic, no tolerance fudge)

Choose the candidate that **maximizes shared boundary continuity**.

This must:
- be deterministic
- not rely on magic thresholds
- be explainable in code comments

---

### 3. Implement the Fix
Where:
- scripts/map/derive_settlement_substrate_from_svg_sources.ts

Requirements:
- Remove the median-distance chooser for NW files.
- Replace with topology-based selection.
- Apply the chosen transform exactly once.
- Keep Bužim → Cazin mun1990 id remap intact.
- Do NOT add more hard-coded filename exceptions unless mathematically justified.

---

### 4. Prove It Works
You must produce:
- A small deterministic audit artifact (JSON or text) for the four NW files showing:
  - chosen transform
  - border continuity score for each candidate
- A clear explanation (in comments and/or commit message) of why this invariant is correct.

Then:
- Rebuild substrate
- Rebuild substrate viewer
- Confirm visually that:
  - Bihać, Cazin, Velika Kladuša, Bužim all align correctly
  - No other municipalities shift

---

## ACCEPTANCE CRITERIA

- NW municipalities render correctly in `substrate_viewer`
- No collateral damage elsewhere
- Tests pass
- One clean, explainable commit
- The solution explains *why previous approaches failed*

---

## DELIVERABLE

Return:
1. Root cause explanation (plain English)
2. Description of the invariant you used
3. Code changes summary
4. Confirmation of visual correctness
5. Exact commands to reproduce

Do not hand-wave. Treat this as a cartographic correctness problem, not a JS bug.

You are allowed to take your time. This problem should be solved once, not patched again.
```

---

If Claude gets this right, you’ll finally have:

- a **principled geometry invariant** (topology, not centroid),
- a **stable fix** that won’t regress elsewhere,
- and something you can actually justify in FORAWWV if needed.

If you want, after Claude responds, paste its analysis here and I’ll sanity-check it brutally before you implement anything.
---

**User**

Give him context also. Like you always do for Cursor, it can read context.md and other essential docs to understand the code structure.
---

**Assistant**

Perfect call. Here is a **revised, fully-contextualized Claude Code prompt**, matching the way you brief Cursor. This gives Claude the structural grounding it needs to reason correctly about *why* the geometry pipeline behaves the way it does, not just how to hack it.

You can paste this verbatim.

---

```txt
You are Claude Code operating inside the “A War Without Victory (AWWV)” repository.
You have full access to the codebase and can read, modify, run, and test code.

This is a hard cartographic / geometry problem, not a UI issue and not a heuristics-tuning exercise.
You are expected to reason from structure, topology, and invariants.

────────────────────────────────────────────────────────
PROJECT CONTEXT (AUTHORITATIVE — READ FIRST)
────────────────────────────────────────────────────────

This project is a strategic-level war simulation of Bosnia and Herzegovina (1991–1995).
It uses a settlement-first geometry substrate; *all* higher-level mechanics depend on this geometry being correct.

You MUST read these documents before proposing changes:
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/PROJECT_LEDGER.md
- docs/ASSISTANT_MISTAKES.log

Key architectural facts you need to internalize:

1) Geometry pipeline
- Canonical settlement geometry is derived from SVG sources.
- The pipeline is implemented in:
  scripts/map/derive_settlement_substrate_from_svg_sources.ts
- Output is:
  data/derived/settlements_substrate.geojson
- This geometry is authoritative and reused everywhere (adjacency, supply, control, viewer).

2) Design constraints (non-negotiable)
- Deterministic output only.
- No snapping, tolerances, smoothing, simplification, or “fixing overlaps”.
- Settlement polygons are never dissolved or merged (except explicit mun1990 remaps).
- Coordinate transforms must be explainable and stable.
- Commit-per-phase discipline is enforced.

3) Historical & political constraints
- Municipalities are reconciled to pre-1991 (mun1990) boundaries.
- Bužim is post-1995 and is remapped to Cazin (mun1990 id "10227").
- Geometry must still align topologically even when political IDs are remapped.

4) What “correct” means
- Correctness is **topological continuity**, not centroid position.
- Neighboring municipalities must share borders cleanly.
- The viewer is diagnostic, not authoritative — but visible misalignment indicates real substrate errors.

────────────────────────────────────────────────────────
THE PROBLEM (CURRENT STATE)
────────────────────────────────────────────────────────

Four northwest municipalities remain broken in the substrate viewer:

SVG source files:
- Bihac_10049.js
- Cazin_10227.js
- Velika Kladusa_11118.js
- Buzim_11240.js

Symptoms:
- These polygons are spatially shifted relative to the rest of Bosnia.
- Different strategies have been tried:
  - heuristics (minx/miny)
  - hard-coded overrides
  - median-distance “chooser”
- All failed or regressed.

Critical observation:
- In Phase F7.2, **forcing +viewBox offset placed Bihać correctly**.
- In Phase F7.3, a corpus-median chooser selected **-viewBox for Bihać**, which is numerically “closer” but visually and topologically wrong.

Conclusion:
➡️ Distance-to-global-centroid is the wrong invariant.
➡️ The correct invariant must be **shared-border continuity with neighbors**.

────────────────────────────────────────────────────────
NON-NEGOTIABLE CONSTRAINTS
────────────────────────────────────────────────────────

- Deterministic output only.
- No tolerance hacks.
- No geometry smoothing or snapping.
- No political logic changes.
- Do not dissolve or merge settlement geometry.
- Fix must generalize and be explainable.

────────────────────────────────────────────────────────
WHAT YOU MUST DO
────────────────────────────────────────────────────────

### 1) Diagnose the TRUE ROOT CAUSE (NO GUESSING)

Explain, based on the actual SVG structure:
- Why Bihac_10049.js requires +viewBox even though -viewBox “wins” numerically.
- Whether these NW SVG files:
  - mix local and global coordinates internally,
  - were exported with a different origin convention,
  - or encode a flipped / translated coordinate frame relative to the rest of the corpus.

Your diagnosis must be grounded in how the SVG paths + viewBox interact, not speculation.

---

### 2) Replace the Current Chooser With a TOPOLOGY-BASED INVARIANT

Implement a deterministic decision mechanism for NW files based on **border continuity**, not centroids.

For each NW SVG file:
- Construct candidate geometries:
  A) no offset
  B) +viewBox offset
  C) -viewBox offset (only if defensible)

For each candidate:
- Measure **shared-border continuity** with already-fixed neighboring municipalities:
  - length of overlapping edges,
  - or minimal boundary-to-boundary distance,
  - or another deterministic topological metric (no arbitrary tolerances).

Select the candidate that maximizes topological continuity.

This must be:
- deterministic
- stable across runs
- documented clearly in code comments

---

### 3) Implement the Fix (MINIMAL AND CLEAN)

Where:
- scripts/map/derive_settlement_substrate_from_svg_sources.ts

Requirements:
- Remove the median-distance chooser for NW files.
- Use the topology-based decision instead.
- Apply the chosen transform exactly once.
- Keep Bužim → Cazin mun1990 id remap intact.
- Do NOT add more filename hacks unless mathematically justified.

---

### 4) Prove Correctness

Produce a deterministic audit artifact (JSON or text) showing for each NW file:
- candidate transforms
- border-continuity score per candidate
- chosen transform and why

Then:
- rebuild the substrate
- rebuild the substrate viewer
- confirm visually that:
  - Bihać, Cazin, Velika Kladuša, Bužim all align correctly
  - no other municipalities shift

────────────────────────────────────────────────────────
ACCEPTANCE CRITERIA
────────────────────────────────────────────────────────

- NW municipalities render correctly in substrate_viewer
- No collateral regressions elsewhere
- Tests pass
- One clean, explainable commit
- The fix explains *why all previous approaches failed*

────────────────────────────────────────────────────────
DELIVERABLE
────────────────────────────────────────────────────────

Return:
1) Root cause explanation (plain English)
2) The invariant you used and why it is correct
3) Summary of code changes
4) Confirmation of visual correctness
5) Exact commands to reproduce

Do not optimize prematurely. This is a cartographic correctness problem.
Solve it once.
```

---

If Claude gets this right, you’ll finally have something you can:

- **defend analytically**
- **document canonically**
- **never touch again**

Once Claude replies, paste its reasoning here. I’ll help you evaluate whether it’s actually *right* or just cleverly wrong.
---

**User**

SOLUTION SUMMARY
1. Root Cause Explanation
The four NW municipalities (Bihać, Cazin, Velika Kladuša, Bužim) use a local coordinate system relative to their SVG viewBox, unlike all other files which use global/absolute SVG coordinates.

The critical insight is that the correct offset transform varies per file based on the sign of the viewBox values:

File	viewBox.x	viewBox.y	Correct Offset
Bihać	-40 (negative)	90	MINUS
Cazin	0	45	PLUS
Velika Kladuša	8	0	PLUS
Bužim	40	30	PLUS
Previous approaches failed because:

Phase F7.2: Forced +viewBox for all NW files → worked for 3/4 but broke Bihać
Phase F7.3: Used centroid-distance chooser which selected offsets based on numerical proximity to the corpus median, not topological correctness. This picked -viewBox for Bihać (correct!) but was unreliable because centroid distance is not the correct invariant.
2. The Invariant Used and Why It Is Correct
Invariant: Maximize neighbor bbox touching/overlap

For each NW file, we compute three candidate transforms (none/plus/minus) and measure how many known-correct neighboring municipalities have overlapping bounding boxes with each candidate.

Neighbor set: {Bosanska Krupa, Bosanski Petrovac, Bosanski Novi, Sanski Most, Ključ, Prijedor}
These neighbors are in global coordinates (no offset applied), so they serve as topological anchors
Selection criteria (in order):

Most touching neighbors (bbox overlap = distance 0)
Lowest total distance to neighbors (tiebreaker)
Deterministic order [none, plus, minus] (final tiebreaker)
This is correct because:

Neighboring municipalities must share borders topologically
If a candidate offset produces bbox overlap with more neighbors, it is placing the geometry in the correct position
The invariant is deterministic and stable across runs
It does not rely on arbitrary thresholds or heuristics
3. Summary of Code Changes
File: scripts/map/derive_settlement_substrate_from_svg_sources.ts

Added NW_NEIGHBOR_FILES constant defining the 6 neighboring municipalities used as topology anchors

Added bboxDistance() helper function that computes the minimum distance between two bboxes (returns 0 if they overlap)

Updated NwOffsetChooserAuditEntry interface to include topology scores:

topology?: {
  none: { touchingNeighbors: number; totalDist: number };
  plus: { touchingNeighbors: number; totalDist: number };
  minus: { touchingNeighbors: number; totalDist: number };
};

Replaced the centroid-distance-based chooser (Phase F7.3) with a topology-based chooser (Phase F8):

Collects neighbor bboxes from parsed files
For each NW file, computes topology score for each candidate offset
Selects the candidate with most touching neighbors (with total distance as tiebreaker)
Produces detailed audit with topology scores
4. Confirmation of Visual Correctness
The topology-based chooser produces the correct offsets:

File	Chosen	Topology Score
Bihac_10049.js	minus	touching=4, totalDist=20.18
Buzim_11240.js	plus	touching=2, totalDist=177.41
Cazin_10227.js	plus	touching=2, totalDist=295.69
Velika Kladusa_11118.js	plus	touching=1, totalDist=421.86
All 277 tests pass
TypeScript typecheck passes
Substrate rebuild succeeds with 6137 features
Substrate viewer rebuilds successfully
5. Exact Commands to Reproduce
cd "C:\Users\User\OneDrive - United Nations Development Programme\Documents\Personal\Wargame\AWWV"

# Rebuild the settlement substrate
npx tsx scripts/map/derive_settlement_substrate_from_svg_sources.ts

# Rebuild the substrate viewer
npx tsx scripts/map/build_substrate_viewer_index.ts

# Run tests to verify
npm test

# Typecheck
npm run typecheck

# View the audit file to see topology scores
cat data/derived/_debug/svg_nw_offset_chooser_audit.json

The audit file at data/derived/_debug/svg_nw_offset_chooser_audit.json shows the complete topology analysis for each NW file, documenting the border-continuity scores that determined the chosen offset.

How can I check?
---

**Assistant**

You can check this in three layers: **(1) the viewer**, **(2) the audit artifact**, and **(3) a quick “sanity overlay” against external boundaries** (optional, but it’s the closest thing to a definitive proof).

Below is a practical checklist you can run right now.

---

## 1) Visual confirmation in the substrate viewer

1) Rebuild everything from repo root:

```bash
npm run map:derive:substrate
npm run map:viewer:substrate:index
```

2) Serve (disable caching so you’re not looking at an old JSON):

```bash
npx http-server -p 8080 -c-1
```

3) Open:

- `http://localhost:8080/data/derived/substrate_viewer/index.html`

4) What to check (don’t just “eyeball it”)

- Zoom into the **NW corner**.
- You should see **no detached islands** for:
  - Bihać
  - Cazin
  - Velika Kladuša
  - (Bužim area should appear in the right place, but note its *municipality_id* remap affects labels/IDs, not shape)
- Pay attention to the seams:
  - Bihać should sit cleanly against the next municipality to its southeast (Bosanska Krupa area)
  - Cazin should sit between Bihać and Velika Kladuša without a gap
  - Velika Kladuša should be the far NW “tip” without being shifted

If you still see a “cluster floating away”, it means the chosen transform is still wrong OR your viewer is loading a different substrate file than the one you just rebuilt.

---

## 2) Confirm the chooser’s decision from the audit JSON

Open the audit file:

```bash
type data\derived\_debug\svg_nw_offset_chooser_audit.json
```

(or on mac/linux)

```bash
cat data/derived/_debug/svg_nw_offset_chooser_audit.json
```

You want to verify three things:

### A) The filenames match exactly
You should see entries for:

- `Bihac_10049.js`
- `Cazin_10227.js`
- `Velika Kladusa_11118.js`
- `Buzim_11240.js`

If a file is missing, the override/chooser did not trigger (usually filename normalization/path mismatch).

### B) The chosen transform matches what Claude claimed
Look for `"chosen": "plus"` / `"minus"` / `"none"` in each entry.

### C) The “topology” scores are plausible
If the code is working as described, each entry should include something like:

- touchingNeighbors counts
- totalDist numbers

If you don’t see topology scores at all, the code is still running the old chooser branch (or audit writing is gated behind a flag).

---

## 3) Hard check: verify these polygons actually sit next to their neighbors numerically

This is the non-visual check: prove they are not floating away by measuring the NW polygons’ bounding boxes versus their neighbor bboxes.

If Claude implemented `bboxDistance()` logic, you can validate the *result* without trusting the code:

### A) Quick manual check using the exported substrate GeoJSON
1) Find a settlement in Bihać region and read its bbox and a neighbor in Bosanska Krupa region, then confirm bboxDistance is near 0 for at least some close pairs.

But doing this by hand is painful.

### B) Better: add a **one-off debug command** (no changes to canonical output)
If you want a deterministic check without editing the pipeline logic, ask Claude/Cursor for a tiny read-only script that:

- reads `data/derived/settlements_substrate.geojson`
- groups features by municipality_id
- computes a bbox per municipality
- prints bboxDistance between:
  - Bihać ↔ Bosanska Krupa
  - Cazin ↔ Velika Kladuša
  - Cazin ↔ Bosanska Krupa
  - Bužim-area ↔ Cazin (same mun id after remap, so you’d check it’s inside the broader Cazin bbox)

If you want, I can write the Cursor prompt for this check-only script in your usual style.

---

## 4) Optional “once and for all” check against the geoBoundaries zips

Since you already have ADM0/ADM3 geoBoundaries, you can use them as anchors:

- Load geoBoundaries ADM0 border
- Load your substrate
- Confirm the NW substrate does not lie outside the country border in the NW corner

This catches big transform mistakes immediately.

Again, easiest as a small debug overlay viewer or a script that checks “percent of substrate vertices outside ADM0 polygon”.

---

## The most common reason people think it’s still broken when it’s actually fixed

Browser caching or serving the wrong file path.

To eliminate that:

- Always use `-c-1` with http-server
- Hard refresh (Ctrl+F5)
- In DevTools → Network tab:
  - click the GeoJSON request
  - confirm it’s loading `data/derived/settlements_substrate.geojson`
  - confirm its “Last Modified” timestamp matches your rebuild run

---

## If you tell me one thing, I can make this airtight

If you paste:
- the 4 audit entries (just those JSON objects), and
- one screenshot zoomed tightly on the NW area,

I can tell you whether the fix is logically working but the viewer is stale, or whether the transform choice is still wrong and why.
---

**User**

Still doesn't work. How about this proposal below:

A War Without Victory: Definitive Coordinate & Rendering Architecture
Here is a contract-driven, deterministic architecture proposal for coordinate systems and map layers that minimizes viewer breakage while supporting future overlays.

A. Problem Restatement in Engineering Terms
Coordinate space ambiguity: Existing artifacts mix SVG-native coordinates (pixels from source artwork), geographic coordinates (lat/lon), and screen/viewport coordinates without explicit declaration, causing silent misalignment across viewers.
Missing transform metadata: Geometry files lack bounding box, origin, and scale declarations, forcing each viewer to guess or hard-code transforms that drift over time.
Schema drift: Layer data files have no version field or required-field contract, so viewers fail silently or crash when fields are added, renamed, or removed.
Unstable identifiers: Settlement and municipality IDs have not been formally frozen, so derived artifacts can reference stale IDs after upstream corrections.
Visualization/simulation conflation: Camera state, layer toggles, and styling are entangled with authoritative geometry, making it hard to isolate what is "data" vs. "view."
No contract validation: There is no automated check that derived artifacts conform to expected schemas before the viewer loads them, so regressions slip through.
Performance blind spots: Thousands of polygons plus multiple overlay layers can choke naive renderers; no explicit guidance exists for level-of-detail or incremental loading.
Reproducibility gaps: Derived artifacts are not hash-stable across builds due to floating-point serialization variance and non-deterministic key ordering.
B. Canonical Coordinate Regime
B.1 World Coordinate System (WCS)
Property	Value
Name	AWWV_WCS_v1
Units	Abstract units (AU), dimensionless, positive integers or fixed-precision decimals (6 decimal places max)
Origin	Top-left of the canonical bounding box (0, 0)
X-axis	Positive rightward
Y-axis	Positive downward (SVG convention, avoids Y-flip bugs)
Canonical bbox	[0, 0, W, H] where W and H are the authoritative map extents in AU
Precision	Coordinates stored as integers (micro-units, 1 AU = 1,000,000 micro-units) or as strings with fixed 6-decimal formatting to avoid float drift
Rationale: A single, unitless coordinate space decouples the simulation from both SVG pixel assumptions and geographic projections. The top-left origin with Y-down matches SVG and most 2D rendering contexts, eliminating sign-flip errors.

B.2 Screen Coordinate System (SCS)
Property	Value
Units	CSS pixels
Origin	Top-left of the viewport element
Transform	Affine: screen = world * scale + translate
B.3 Transform Metadata (required in every geometry artifact)
{
  "coordinate_space": "AWWV_WCS_v1",       // REQUIRED: must match canonical name
  "bbox_world": [0, 0, 10000, 8000],       // REQUIRED: [minX, minY, maxX, maxY] in WCS
  "origin_world": [0, 0],                  // REQUIRED: origin point in WCS
  "precision": "integer_micro",            // REQUIRED: "integer_micro" | "fixed6"
  "source_crs": "SVG_PIXELS",              // OPTIONAL: original source CRS for provenance
  "source_to_wcs_transform": {             // OPTIONAL: how source was mapped to WCS
    "scale": [1.0, 1.0],
    "translate": [0, 0]
  }
}

B.4 Viewport ↔ World Transforms
The viewer maintains a Camera object:

interface Camera {
  center_world: [number, number];  // WCS point at viewport center
  zoom: number;                     // pixels per world unit
  viewport_size: [number, number];  // CSS pixels [width, height]
}

function worldToScreen(p: [number, number], cam: Camera): [number, number] {
  const [cx, cy] = cam.center_world;
  const [vw, vh] = cam.viewport_size;
  return [
    (p[0] - cx) * cam.zoom + vw / 2,
    (p[1] - cy) * cam.zoom + vh / 2
  ];
}

function screenToWorld(s: [number, number], cam: Camera): [number, number] {
  const [cx, cy] = cam.center_world;
  const [vw, vh] = cam.viewport_size;
  return [
    (s[0] - vw / 2) / cam.zoom + cx,
    (s[1] - vh / 2) / cam.zoom + cy
  ];
}

Invariant: All geometry data files are in WCS. The viewer never stores screen-space geometry; it computes screen positions on each frame from WCS + Camera.

C. Artifact Contracts and Versioning
C.1 Master Data Index (data_index.json)
This is the single entry point the viewer loads first. It declares all available datasets and their contracts.

{
  "$schema": "awwv://schemas/data_index_v1.json",
  "schema_version": "1.0.0",
  "generated_at_turn": 0,                    // simulation turn (0 = initial map)
  "build_hash": "sha256:abc123...",          // hash of source inputs for reproducibility
  "coordinate_space": "AWWV_WCS_v1",
  "canonical_bbox": [0, 0, 10000, 8000],
  "datasets": {
    "settlements": {
      "path": "settlements_substrate.geojson",
      "schema": "awwv://schemas/settlements_v1.json",
      "schema_version": "1.2.0",
      "record_count": 4500,
      "id_field": "sid",
      "geometry_type": "Polygon",
      "checksum": "sha256:def456..."
    },
    "municipalities_1990": {
      "path": "municipalities_1990.geojson",
      "schema": "awwv://schemas/municipalities_v1.json",
      "schema_version": "1.0.0",
      "record_count": 109,
      "id_field": "mun1990_id",
      "geometry_type": "Polygon",
      "checksum": "sha256:789abc..."
    }
    // additional datasets registered here
  },
  "layers": {
    "base_settlements": { "dataset": "settlements", "style": "styles/settlements.json" },
    "base_municipalities": { "dataset": "municipalities_1990", "style": "styles/municipalities.json" }
  }
}

Required fields (viewer MUST reject if missing):

schema_version
coordinate_space
canonical_bbox
datasets with at least one entry
Each dataset entry: path, schema, schema_version, id_field, geometry_type, checksum
C.2 Geometry Dataset Header (embedded in GeoJSON)
Every GeoJSON file includes an awwv_meta property at the root:

{
  "type": "FeatureCollection",
  "awwv_meta": {
    "schema": "awwv://schemas/settlements_v1.json",
    "schema_version": "1.2.0",
    "coordinate_space": "AWWV_WCS_v1",
    "bbox_world": [0, 0, 10000, 8000],
    "precision": "integer_micro",
    "id_field": "sid",
    "record_count": 4500,
    "build_hash": "sha256:abc123..."
  },
  "features": [ /* ... */ ]
}

Invariant: awwv_meta.coordinate_space MUST equal data_index.coordinate_space. Viewer rejects on mismatch.

C.3 Feature Schema (per-feature properties contract)
Example for settlements (awwv://schemas/settlements_v1.json):

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AWWV Settlement Feature",
  "type": "object",
  "required": ["sid", "name", "mun1990_id", "centroid"],
  "properties": {
    "sid": { "type": "string", "pattern": "^S[0-9]{5}$" },
    "name": { "type": "string" },
    "mun1990_id": { "type": "string", "pattern": "^M[0-9]{3}$" },
    "centroid": {
      "type": "array",
      "items": { "type": "number" },
      "minItems": 2,
      "maxItems": 2
    },
    "population_1991": { "type": "integer", "minimum": 0 },
    "control_state": { "type": "string", "enum": ["ARBiH", "VRS", "HVO", "contested", "unknown"] }
  },
  "additionalProperties": true
}

C.4 Layer Descriptor Contract
{
  "$schema": "awwv://schemas/layer_descriptor_v1.json",
  "layer_id": "supply_pressure",
  "display_name": "Supply Pressure Overlay",
  "dataset": "supply_pressure_turn_42",
  "geometry_type": "Polygon",
  "style": "styles/supply_pressure.json",
  "z_index": 200,
  "visibility_default": false,
  "requires_turn_state": true,
  "schema_version": "1.0.0"
}

C.5 Style Contract (minimal)
{
  "$schema": "awwv://schemas/style_v1.json",
  "style_id": "settlements_default",
  "schema_version": "1.0.0",
  "fill": {
    "property": "control_state",
    "mapping": {
      "ARBiH": "#2E7D32",
      "VRS": "#1565C0",
      "HVO": "#F9A825",
      "contested": "#9E9E9E",
      "unknown": "#EEEEEE"
    },
    "default": "#BDBDBD"
  },
  "stroke": { "color": "#000000", "width": 0.5 },
  "opacity": 0.85
}

D. Layer System Design
D.1 Layer Registry
The viewer maintains a LayerRegistry that is populated from data_index.json and extended at runtime for turn-specific overlays.

interface LayerDefinition {
  layer_id: string;
  dataset_key: string;           // key in data_index.datasets
  style_path: string;
  z_index: number;
  visible: boolean;
  requires_turn_state: boolean;  // if true, dataset changes per turn
}

class LayerRegistry {
  private layers: Map<string, LayerDefinition> = new Map();

  register(def: LayerDefinition): void { /* validate & add */ }
  get(layer_id: string): LayerDefinition | undefined { /* ... */ }
  list(): LayerDefinition[] { /* sorted by z_index */ }
  setVisibility(layer_id: string, visible: boolean): void { /* ... */ }
}

D.2 Adding a New Layer (Example: Supply Pressure)
Create dataset file supply_pressure_turn_42.geojson with awwv_meta header conforming to a new schema awwv://schemas/supply_pressure_v1.json.
Register dataset in data_index.json under datasets.supply_pressure_turn_42.
Create style file styles/supply_pressure.json conforming to style contract.
Add layer entry to data_index.layers:
"supply_pressure": {
  "dataset": "supply_pressure_turn_42",
  "style": "styles/supply_pressure.json",
  "z_index": 200,
  "visibility_default": false,
  "requires_turn_state": true
}

Viewer auto-discovers the layer on next load; no code changes required.
Key principle: The viewer core never hard-codes layer names. It iterates data_index.layers, validates each against contracts, and renders generically.

D.3 Styling/State Separation
Concern	Location	Mutability
Geometry (WCS polygons)	*.geojson dataset	Immutable per turn
Style rules	styles/*.json	Editable without regenerating data
Visibility toggles	Viewer runtime state	Ephemeral, not persisted
Camera position	Viewer runtime state	Ephemeral, not persisted
Feature selection	Viewer runtime state	Ephemeral, not persisted
E. Viewer Architecture
E.1 Data Loading Pipeline
┌─────────────────────────────────────────────────────────────────┐
│  1. FETCH data_index.json                                       │
│     └─► Validate against data_index schema                      │
│         └─► REJECT if missing required fields or wrong version  │
├─────────────────────────────────────────────────────────────────┤
│  2. FOR EACH dataset in data_index.datasets:                    │
│     ├─► Fetch file (streaming if >5MB)                          │
│     ├─► Validate checksum (reject on mismatch)                  │
│     ├─► Parse GeoJSON, extract awwv_meta                        │
│     ├─► Validate awwv_meta.coordinate_space == canonical        │
│     ├─► Validate features against declared schema (sample 10%)  │
│     └─► Store in DatasetCache keyed by dataset_key              │
├─────────────────────────────────────────────────────────────────┤
│  3. FOR EACH layer in data_index.layers:                        │
│     ├─► Resolve dataset from DatasetCache                       │
│     ├─► Fetch and validate style file                           │
│     └─► Register in LayerRegistry                               │
├─────────────────────────────────────────────────────────────────┤
│  4. Initialize Camera from canonical_bbox (fit to viewport)     │
├─────────────────────────────────────────────────────────────────┤
│  5. Render loop begins                                          │
└─────────────────────────────────────────────────────────────────┘

E.2 Camera/Viewport Math
class Camera {
  center: [number, number];  // WCS
  zoom: number;              // screen pixels per WCS unit
  viewportSize: [number, number];

  fitToBbox(bbox: [number, number, number, number]): void {
    const [minX, minY, maxX, maxY] = bbox;
    this.center = [(minX + maxX) / 2, (minY + maxY) / 2];
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scaleX = this.viewportSize[0] / worldW;
    const scaleY = this.viewportSize[1] / worldH;
    this.zoom = Math.min(scaleX, scaleY) * 0.95; // 5% margin
  }

  pan(deltaScreen: [number, number]): void {
    this.center[0] -= deltaScreen[0] / this.zoom;
    this.center[1] -= deltaScreen[1] / this.zoom;
  }

  zoomAt(screenPoint: [number, number], factor: number): void {
    const worldBefore = this.screenToWorld(screenPoint);
    this.zoom *= factor;
    this.zoom = Math.max(0.01, Math.min(100, this.zoom)); // clamp
    const worldAfter = this.screenToWorld(screenPoint);
    this.center[0] += worldBefore[0] - worldAfter[0];
    this.center[1] += worldBefore[1] - worldAfter[1];
  }

  worldToScreen(p: [number, number]): [number, number] { /* see B.4 */ }
  screenToWorld(s: [number, number]): [number, number] { /* see B.4 */ }
}

E.3 Error Handling
Failure Mode	Detection	Response
Missing data_index.json	Fetch 404	Fatal error: "Cannot load map data index at {path}"
Schema version mismatch	schema_version parse	Fatal: "data_index requires schema v{x}, viewer supports v{y}"
Coordinate space mismatch	awwv_meta.coordinate_space != canonical	Fatal: "Dataset {name} uses coordinate space {x}, expected {y}"
Checksum mismatch	SHA256 comparison	Fatal: "Dataset {name} checksum mismatch; expected {x}, got {y}"
Missing required field in feature	JSON Schema validation	Warning + skip feature; log to console with feature ID
Style file missing	Fetch 404	Fallback to default gray fill; warn in console
Geometry outside bbox	Centroid check	Warning; render anyway but flag in debug overlay
Principle: Fatal errors halt loading with actionable message. Warnings log but allow partial rendering with visual indicators.

E.4 Debug Modes
Mode	Activation	Behavior
?debug=bbox	Query param	Draw WCS bbox outline in red; show camera state in HUD
?debug=ids	Query param	Render feature IDs as labels at centroids
?debug=contracts	Query param	Run full schema validation on all features; log violations
?debug=perf	Query param	Show FPS, feature count, render time per layer
F. Validation & Regression Prevention
F.1 Contract Validator Script (scripts/validate_map_contracts.ts)
// Pseudo-code structure
async function validateAll(): Promise<ValidationReport> {
  const index = await loadAndValidateIndex("data/derived/data_index.json");
  const results: FeatureValidationResult[] = [];

  for (const [key, dataset] of Object.entries(index.datasets)) {
    const geojson = await loadGeojson(dataset.path);
    
    // 1. Checksum
    assertChecksumMatches(geojson, dataset.checksum);
    
    // 2. Coordinate space
    assertEqual(geojson.awwv_meta.coordinate_space, index.coordinate_space);
    
    // 3. Bbox containment
    for (const feature of geojson.features) {
      assertWithinBbox(feature.geometry, index.canonical_bbox);
    }
    
    // 4. Schema validation
    const schema = await loadSchema(dataset.schema);
    for (const feature of geojson.features) {
      const errors = validateAgainstSchema(feature.properties, schema);
      if (errors.length > 0) results.push({ feature_id: feature.properties[dataset.id_field], errors });
    }
    
    // 5. ID uniqueness
    assertUniqueIds(geojson.features, dataset.id_field);
  }

  return { passed: results.length === 0, violations: results };
}

F.2 Determinism Checks
Check	Implementation
Key ordering	Serialize with JSON.stringify(obj, Object.keys(obj).sort())
Float precision	Store as integers (micro-units) or fixed-decimal strings
Build hash	SHA256 of sorted, normalized JSON
Diff stability	git diff on regenerated artifacts should be empty if inputs unchanged
F.3 CI Hooks (GitHub Actions example)
name: Map Contract Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build:map          # regenerate derived artifacts
      - run: npm run validate:contracts  # run contract validator
      - run: |
          # Determinism check: regenerate and diff
          npm run build:map
          git diff --exit-code data/derived/

F.4 Smoke Tests
Load test: Viewer loads data_index.json and all datasets without fatal errors.
Render test: All layers render at least one visible feature.
Camera test: fitToBbox(canonical_bbox) centers map correctly.
Interaction test: Pan and zoom do not throw; coordinates remain in WCS.
G. Migration Plan
Phase 0: Stop the Bleeding (Week 1)
Freeze current IDs: Document current sid and mun1990_id values as canonical; no further changes without explicit migration.
Add awwv_meta to existing GeoJSON files with current coordinate assumptions (likely SVG pixels).
Create minimal data_index.json pointing to existing files, declaring coordinate_space: "SVG_PIXELS_LEGACY".
Update viewer to read data_index.json and fail loudly if missing.
Phase 1: Normalize Coordinate Space (Week 2)
Define canonical WCS bbox by measuring current SVG extents.
Write transform script to convert all geometries from SVG pixels to WCS (likely identity or simple scale).
Update awwv_meta.coordinate_space to AWWV_WCS_v1.
Regenerate all derived artifacts; verify checksums are stable.
Run contract validator; fix any violations.
Phase 2: Schema Enforcement (Week 3)
Write JSON Schema files for settlements, municipalities, and any other datasets.
Add schema paths to data_index.json.
Integrate schema validation into build pipeline.
Add CI hook to block merges on schema violations.
Phase 3: Layer System (Week 4)
Refactor viewer to use LayerRegistry instead of hard-coded layer loading.
Move styles to separate files; reference from data_index.layers.
Add one new overlay layer (e.g., political control) to validate the pattern.
Document "how to add a layer" process.
Phase 4: Hardening (Week 5+)
Add checksum validation to viewer loading.
Implement debug modes.
Write smoke test suite.
Performance profiling; add level-of-detail if needed.
Compatibility Shims
Legacy viewer fallback: If an old viewer encounters new data_index.json, it should fail with a clear version mismatch error rather than silent breakage.
Dual-write period: During Phase 1, generate both legacy and WCS versions of artifacts; remove legacy after viewer update is deployed.
H. Acceptance Checklist
Use this checklist to declare the architecture "done":

 H.1 data_index.json exists and conforms to data_index_v1.json schema.
 H.2 All geometry files include awwv_meta with coordinate_space: "AWWV_WCS_v1".
 H.3 All geometry files include valid bbox_world matching actual feature extents.
 H.4 All datasets have checksums in data_index.json that match file contents.
 H.5 JSON Schema files exist for settlements, municipalities, and all overlay layers.
 H.6 Contract validator script passes with zero violations.
 H.7 CI pipeline runs contract validation on every push and blocks on failure.
 H.8 Viewer loads data_index.json first and fails with actionable error if missing/invalid.
 H.9 Viewer rejects datasets with mismatched coordinate_space.
 H.10 Camera fitToBbox(canonical_bbox) correctly centers and scales the map.
 H.11 Pan and zoom use worldToScreen/screenToWorld transforms; no hard-coded pixel offsets.
 H.12 Adding a new layer requires only: (a) dataset file, (b) schema, (c) style file, (d) entry in data_index.json—no viewer code changes.
 H.13 Regenerating derived artifacts twice in a row produces byte-identical files (determinism).
 H.14 Debug mode ?debug=contracts runs full validation and displays violations in-viewer.
 H.15 Smoke test suite passes: load, render, camera, interaction.
Appendix: Quick Reference
Coordinate Space Declaration (required in every geometry file)
"awwv_meta": {
  "coordinate_space": "AWWV_WCS_v1",
  "bbox_world": [0, 0, 10000, 8000],
  "precision": "integer_micro"
}

Data Index Entry (minimal valid dataset)
"settlements": {
  "path": "settlements_substrate.geojson",
  "schema": "awwv://schemas/settlements_v1.json",
  "schema_version": "1.0.0",
  "id_field": "sid",
  "geometry_type": "Polygon",
  "checksum": "sha256:..."
}

Layer Entry (minimal)
"base_settlements": {
  "dataset": "settlements",
  "style": "styles/settlements.json",
  "z_index": 100,
  "visibility_default": true
}

End of Architecture Proposal
---

**Assistant**

Your proposal is directionally right. It doesn’t directly “fix Bihać/Cazin/etc.” by itself, but it **prevents this class of breakage from ever being silent again**, and it gives you a clean runway to solve the NW issue with a single, inspectable contract.

A useful way to think about it:

- **Right now:** you’re debugging *implicit transforms* scattered across derivation + viewers.
- **With your architecture:** you move to *explicit transforms* + *contract validation*, so geometry problems become **provable** (metadata mismatch, bbox mismatch, checksum mismatch), not “it looks off”.

### What I would keep as-is

**1) Canonical “world” space that is not lat/lon**
This is exactly what you want for the sim and deterministic rendering. A unitless WCS aligned to SVG conventions (Y-down) is sane.

**2) Metadata embedded in every GeoJSON**
This is the highest leverage. The moment your substrate and your political-control viewer disagree on coordinate space, the viewer should hard-fail.

**3) A single entry point (`data_index.json`)**
Also high leverage. It becomes the one place where paths, schema versions, and checksums live.

**4) Viewer rejection, not viewer guessing**
Yes. Viewer guessing is what got you here.

---

## The parts I’d tighten / adjust

### A) Don’t make “origin is [0,0]” a requirement on day 1
You can still have WCS with arbitrary bbox, as long as it’s explicit.

A safer v1 contract is:

- `coordinate_space: "AWWV_WCS_v1"`
- `bbox_world: [minX, minY, maxX, maxY]` (whatever the canonical substrate currently uses)
- optional `wcs_normalization: { translate_to_zero: true/false }`

Because right now your substrate bbox is something like `[-39, -9.5, 940.9, 910]`. Forcing normalization to `[0,0,W,H]` is fine, but it’s a **migration**, and migrations are where determinism and subtle bugs creep in.

### B) “Integer micro-units” is great, but don’t block on it
Make it a **later hardening step**.

You can get 80% of the benefit immediately by standardizing serialization:
- stable key ordering
- fixed decimal formatting (e.g. 6 decimals)
- deterministic polygon ring closure rules

Then later, when the pipeline is stable, convert to micro-int coordinates if you still want it.

### C) Checksums: keep them, but be careful about what you’re hashing
Hash the **exact bytes** of the file you ship. That’s good.
But don’t try to hash a parsed/re-stringified representation unless you’re 100% sure your serialization is deterministic first.

### D) Schema enforcement should be “sampled” first, then full
Your “sample 10%” idea is correct as an early guardrail.
Full validation on 6k+ polygons can be slow, and slow validation gets skipped.

---

## The big missing piece: coordinate provenance and “what is canonical”

Right now you have two competing truths:
- “this viewer is the correct map”
- “this derivation script is canonical geometry”

Your contract system should make that impossible by enforcing:

- **there is exactly one canonical substrate path**
- every viewer must load geometry only through `data_index.json`

So the real “stop the bleeding” move is:

### **Phase 0 (very small, immediate)**
1) Create `data/derived/data_index.json` that points to exactly one substrate:
   - `data/derived/settlements_substrate.geojson`
2) Add `awwv_meta` to that GeoJSON root (even if minimal).
3) Update every viewer to load **only** through `data_index.json`.
4) If any viewer is hard-coded to load a GeoJSON directly, treat that as a bug.

This alone would likely surface your current issue faster because you’d immediately see which component is loading which file.

---

## How this helps your NW problem specifically

Once contracts are in place, you can add a **diagnostic layer** (not a “fix”) that draws:

- municipal boundary outlines from your new geoBoundaries ADM3
- substrate outlines on top

Even without georeferencing, this will tell you whether NW is:
- in the wrong place relative to neighbors **inside the same WCS**
- or the whole WCS is drifting / mixed-regime inside SVG ingestion

And because the viewer will reject mismatched coordinate spaces, you won’t get misleading overlays.

---

## What I’d recommend as a concrete, deterministic path forward

### Phase 0: Contract-only, no coordinate changes
- Add `data_index.json`
- Add minimal `awwv_meta` headers
- Update viewers to load through index and fail loudly

### Phase 1: Deterministic geometry identity
- Ensure rebuilding the substrate twice produces byte-identical output
- Add a validator script that checks:
  - `awwv_meta.coordinate_space` matches `data_index.coordinate_space`
  - bbox contains all features
  - stable ID uniqueness

### Phase 2: Only then normalize WCS (optional)
- Translate bbox so minX/minY becomes 0/0
- Keep the original bbox in provenance metadata so you can trace back

### Phase 3: GeoBoundaries overlay as an “external anchor”
- Add ADM0/ADM3 layers, but only after you’re sure everything is in one internal WCS

---

## One blunt reality check

This architecture will prevent breakage and make errors explicit, but it won’t magically correct NW if the SVG source files themselves are inconsistent (mixed regimes, wrong viewBox semantics, etc.). What it *will* do is make it obvious **where** the inconsistency enters the pipeline, and stop you from “fixing it in the viewer” ever again.

If you want, I can turn your architecture into a **minimal “Phase 0–1” implementation plan** that fits your repo discipline (ledger read/write, validations, single commit per phase, and no FORAWWV auto-edits).
---

**User**

SVGs are correct by themselves. We created other viewers that had no such issues.
Disregard GeoBoundaries completely as we move on. Forget them.
Assume I accept your suggestion on all other issues. Create a prompt that will implement the Phase 0-1.
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G0–G1 — Contract-first map loading + deterministic artifact metadata (stop-the-bleeding, no coordinate changes)

MISSION
Implement Phase 0–1 of the “Definitive Coordinate & Rendering Architecture” in a minimal, contract-driven way that:
- eliminates silent viewer drift by forcing all viewers to load through a single data_index.json
- embeds minimal awwv_meta headers in canonical GeoJSON artifacts
- adds a deterministic contract validator script
- adds a determinism check (rebuild twice → byte-identical) for canonical artifacts

IMPORTANT USER DIRECTIVE
Disregard GeoBoundaries entirely. Do not mention or use geoBoundaries data. Do not add any ADM layers.

ABSOLUTE CONSTRAINTS
- No geometry changes, no coordinate transforms, no heuristics changes.
- No simulation mechanics changes.
- Deterministic output only: stable key ordering, stable feature ordering, no timestamps in derived artifacts.
- Viewers MUST fail loudly (clear error UI) if contract is missing or mismatched.
- Keep scope tight; do not refactor unrelated viewer code.
- Commit-per-phase discipline: small, scoped commits per subphase (G0 then G1).
- Always run validations.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append entries for Phase G0 and Phase G1 to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In any script file created or modified in this phase:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g0-g1 contract-first data_index + awwv_meta + validator + determinism");

FORAWWV NOTE (MANDATORY RULE)
If this work reveals a systemic design insight or invalidates an assumption, flag that docs/FORAWWV.md may require an addendum, but DO NOT edit FORAWWV.md automatically.

FILES YOU MAY TOUCH
Allowed new files:
- data/derived/data_index.json (canonical entry point for viewers)
- scripts/map/validate_map_contracts.ts
- scripts/map/lib/awwv_contracts.ts (optional helper; keep tiny)
Allowed modifications:
- scripts/map/build_substrate_viewer_index.ts
- data/derived/settlements_substrate.geojson (ONLY to add top-level awwv_meta; do not reorder or change coordinates)
- data/derived/substrate_viewer/index.html
- data/derived/substrate_viewer/viewer.js
- package.json (to add npm scripts)
- docs/PROJECT_LEDGER.md

DO NOT modify other derived geometries or unrelated viewers unless required to route through data_index.json.
If there are multiple viewers, at minimum update substrate_viewer to prove the pattern; do not try to convert every viewer unless it’s trivial.

────────────────────────────────────────────────────────
SUBPHASE G0 — STOP THE BLEEDING (INDEX + VIEWER LOAD PATH)
────────────────────────────────────────────────────────

G0 TASK 1 — Create canonical data_index.json (minimal, deterministic)
Create: data/derived/data_index.json with:
{
  "$schema": "awwv://schemas/data_index_v1.json",
  "schema_version": "1.0.0",
  "coordinate_space": "SVG_PIXELS_LEGACY",
  "canonical_bbox": [minX, minY, maxX, maxY],
  "datasets": {
    "settlements": {
      "path": "settlements_substrate.geojson",
      "schema": "awwv://schemas/settlements_v0.json",
      "schema_version": "0.0.0",
      "id_field": "sid",
      "geometry_type": "Polygon",
      "record_count": <count>,
      "checksum_sha256": "<sha256 of file bytes>"
    }
  },
  "layers": {
    "base_settlements": {
      "dataset": "settlements",
      "style": null,
      "z_index": 100,
      "visibility_default": true
    }
  }
}

Rules:
- canonical_bbox must be computed from settlements_substrate.geojson deterministically.
- checksum_sha256 is SHA256 of the bytes of settlements_substrate.geojson.
- record_count is feature count.
- No timestamps, no build times.

Implement deterministic bbox computation and sha256 in a helper used both by viewer-index builder and validator.

G0 TASK 2 — Make substrate_viewer load ONLY via data_index.json
Update data/derived/substrate_viewer/viewer.js (and index.html if needed):
- First fetch "/data/derived/data_index.json"
- Validate required fields exist:
  schema_version, coordinate_space, canonical_bbox, datasets.settlements.path, datasets.settlements.checksum_sha256
- Then fetch the settlements dataset from:
  "/data/derived/" + datasets.settlements.path
- Compute sha256 of fetched bytes in browser (use SubtleCrypto SHA-256)
- Reject if checksum mismatch with a clear fatal error banner in the UI (not console only)
- Parse GeoJSON and proceed as before
- Initialize camera using canonical_bbox from data_index.json (fit-to-bbox)

If any required field missing/mismatched, show fatal error message with exact missing field name.

G0 TASK 3 — Ensure existing build script writes the viewer’s index to point at data_index
Update scripts/map/build_substrate_viewer_index.ts so it no longer hardcodes geometry paths. It should:
- (re)compute bbox + checksum + record_count
- write data/derived/data_index.json deterministically
- write/update data/derived/substrate_viewer/data_index.json ONLY if that viewer needs a viewer-local index; otherwise delete/stop writing it and have the viewer use the canonical data/derived/data_index.json
Prefer: viewer uses canonical data/derived/data_index.json directly.

G0 VALIDATIONS (ALWAYS RUN)
- npm run typecheck
- npm test
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
Manual:
- npx http-server -p 8080 -c-1
- open http://localhost:8080/data/derived/substrate_viewer/index.html
- Confirm viewer loads and does not fetch settlements_substrate.geojson directly (verify network tab shows data_index.json first).

G0 LEDGER + COMMIT
- Append Phase G0 entry to docs/PROJECT_LEDGER.md: what changed, files, mistake guard phrase, FORAWWV note.
- git add ONLY intended files
- git commit -m "Phase G0: contract-first viewer loading via canonical data_index.json

- Add data/derived/data_index.json with bbox + sha256 checksum
- Update substrate_viewer to load datasets through index and fail loudly on mismatch
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

────────────────────────────────────────────────────────
SUBPHASE G1 — MINIMAL META + VALIDATOR + DETERMINISM CHECK
────────────────────────────────────────────────────────

G1 TASK 1 — Add minimal awwv_meta at GeoJSON root (no coordinate changes)
Update the pipeline so data/derived/settlements_substrate.geojson includes at the root:
"awwv_meta": {
  "schema": "awwv://schemas/settlements_v0.json",
  "schema_version": "0.0.0",
  "coordinate_space": "SVG_PIXELS_LEGACY",
  "bbox_world": [minX, minY, maxX, maxY],
  "precision": "float",
  "id_field": "sid",
  "record_count": <count>,
  "checksum_sha256": "<sha256 bytes>"
}

Rules:
- Do NOT reorder existing features or coordinates.
- awwv_meta must be injected deterministically at the root only.
- bbox_world and checksum must match the file contents and match data_index.json.

Decide where to inject:
- Either in derive_settlement_substrate_from_svg_sources.ts output writer, OR
- as a post-processing step in build_substrate_viewer_index.ts
Prefer: a post-processing step that rewrites the root object with awwv_meta but preserves features array order exactly.

G1 TASK 2 — Add contract validator script
Create: scripts/map/validate_map_contracts.ts
It must:
- load data/derived/data_index.json
- validate presence of required fields
- load each dataset referenced (start with settlements only)
- compute sha256 and compare
- validate GeoJSON root has awwv_meta and that:
  * awwv_meta.coordinate_space matches index.coordinate_space
  * bbox_world matches index.canonical_bbox exactly
  * record_count matches features.length
  * id_field exists on all features and ids are unique
- validate determinism: run computeIndexFromDataset twice in-memory and ensure the emitted JSON strings are byte-identical (stable key ordering)

Output:
- print a clear PASS/FAIL summary
- on fail, exit with non-zero code
No timestamps.

G1 TASK 3 — Add npm scripts
package.json:
- "map:contracts:validate": "tsx scripts/map/validate_map_contracts.ts"
- "map:contracts:determinism": run derive + index twice and ensure no git diff for:
  data/derived/data_index.json and data/derived/settlements_substrate.geojson
Implement determinism check as a node script if needed (preferred) rather than relying on git diff in CI.
But keep it simple: a script can hash the output after each run and compare.

G1 VALIDATIONS (ALWAYS RUN)
- npm run typecheck
- npm test
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
- npm run map:contracts:validate
- npm run map:contracts:determinism
Manual:
- serve viewer again; confirm it still loads.

G1 LEDGER + COMMIT
- Append Phase G1 entry to docs/PROJECT_LEDGER.md.
- git add ONLY intended files
- git commit -m "Phase G1: embed awwv_meta and add map contract validator + determinism check

- Inject minimal awwv_meta into settlements substrate without geometry changes
- Add validator for index/dataset checksum, bbox, ids, and meta consistency
- Add determinism check scripts; run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

────────────────────────────────────────────────────────
ACCEPTANCE CRITERIA
────────────────────────────────────────────────────────
G0:
- substrate_viewer loads data_index.json first and fails loudly if missing/mismatched
- viewer uses canonical_bbox from index to fit camera
- data_index.json includes deterministic bbox + sha256 checksum + record_count

G1:
- settlements_substrate.geojson contains awwv_meta at root with matching bbox/checksum/count
- validator passes and catches deliberate mismatches (spot-check by temporarily editing checksum)
- determinism check passes: repeated builds produce identical outputs (or identical hashes)
- All tests/typecheck pass
- Two commits: Phase G0 and Phase G1, scoped and clean

HOW TO RUN / TEST
1) npm run map:derive:substrate
2) npm run map:viewer:substrate:index
3) npm run map:contracts:validate
4) npm run map:contracts:determinism
5) npx http-server -p 8080 -c-1
6) http://localhost:8080/data/derived/substrate_viewer/index.html
```
---

**User**

Summary of what was implemented:
Phase G0 (committed)
G0 TASK 1 — Canonical data_index.json
data/derived/data_index.json with: $schema, schema_version, coordinate_space, canonical_bbox, datasets.settlements (path, schema, schema_version, id_field, geometry_type, record_count, checksum_sha256), layers.base_settlements.
scripts/map/lib/awwv_contracts.ts: computeBboxFromFeatures() and computeSha256Hex() for deterministic bbox and SHA-256 (used by build and validator).
G0 TASK 2 — Substrate viewer loads only via index
data/derived/substrate_viewer/viewer.js (generated by build script):
Fetches /data/derived/data_index.json first.
Checks: schema_version, coordinate_space, canonical_bbox, datasets.settlements.path, datasets.settlements.checksum_sha256.
Fetches dataset from /data/derived/ + path as arrayBuffer, computes SHA-256 (SubtleCrypto), shows a fatal error banner on checksum mismatch.
Uses canonical_bbox from the index for fit-to-bounds.
Then fetches ./data_index.json for by_sid (census/legend).
G0 TASK 3 — Build script
scripts/map/build_substrate_viewer_index.ts: Reads substrate as Buffer for checksum, uses lib for bbox, writes data/derived/data_index.json and keeps writing data/derived/substrate_viewer/data_index.json (viewer index with by_sid only).
Mistake guard: assertNoRepeat("phase g0-g1 contract-first data_index + awwv_meta + validator + determinism") in the build script.
Phase G1 (committed)
G1 TASK 1 — awwv_meta at GeoJSON root
settlements_substrate.geojson gets root awwv_meta (injected in the build script): schema, schema_version, coordinate_space, bbox_world, precision, id_field, record_count, checksum_sha256.
No geometry/coordinate changes: feature order and coordinates unchanged; only root metadata added.
Checksum semantics: awwv_meta.checksum_sha256 = content hash (file with checksum field empty). data_index.datasets.settlements.checksum_sha256 = SHA-256 of full file (so the viewer can verify the fetched file).
G1 TASK 2 — Contract validator
scripts/map/validate_map_contracts.ts: Loads data_index.json, checks required fields, loads dataset, verifies file checksum and awwv_meta content hash, bbox/record_count/id_field and uniqueness; runs index build twice in memory for determinism.
G1 TASK 3 — npm scripts
package.json: map:contracts:validate, map:contracts:determinism.
scripts/map/check_map_contracts_determinism.ts: Runs map:derive:substrate + map:viewer:substrate:index twice and compares SHA-256 of data_index.json and settlements_substrate.geojson; exits non-zero if different.
Mistake guard: Same phrase in validate_map_contracts.ts and check_map_contracts_determinism.ts.
Validations run
npm run typecheck — pass
npm test — pass (277 tests)
npm run map:derive:substrate — pass
npm run map:viewer:substrate:index — pass
npm run map:contracts:validate — pass
npm run map:contracts:determinism — pass
Commits
Phase G0: contract-first viewer loading via canonical data_index.json.
Phase G1: embed awwv_meta and add map contract validator + determinism check.
Manual check: From repo root run npx http-server -p 8080 -c-1, open http://localhost:8080/data/derived/substrate_viewer/index.html. In the network tab you should see /data/derived/data_index.json loaded first, then the dataset by path; checksum is verified and the view fits to canonical_bbox.
FORAWWV: No change to FORAWWV.md; no design change that requires an addendum.
Note: data/derived/settlements_substrate.geojson was not committed in G1 (large, derived file). Regenerate with npm run map:derive:substrate then npm run map:viewer:substrate:index to get the file with awwv_meta.
---

**Assistant**

This is a solid “stop the bleeding” outcome. The most important thing you’ve achieved is: **the viewer can no longer lie** (it’s forced through one canonical index, one canonical bbox, and checksum-verified bytes). That means any remaining NW weirdness is now almost certainly **in the substrate derivation**, not in “which file the viewer happened to load”.

A few sharp checks and next steps that will help you capitalize on G0–G1:

## Quick sanity checks worth doing once

### 1) Make sure you’re not mixing two indices accidentally
Right now the viewer loads:
1) `/data/derived/data_index.json` (canonical, checksum verified)
2) `./data_index.json` (viewer-local, “by_sid”)

That’s fine, but it’s also a potential future foot-gun. The viewer-local file should contain **only non-geometry auxiliary data** (like by_sid/legend), and must never contain geometry paths, bbox, or coordinate metadata.

A quick grep check you can run:
- Confirm `data/derived/substrate_viewer/data_index.json` does **not** include:
  - `datasets`
  - `canonical_bbox`
  - `coordinate_space`
  - any geometry path
If it does, strip it down.

### 2) Confirm contract validator is enforcing the exact invariants you care about
You already validate:
- checksum (file bytes)
- meta content hash
- bbox, record_count
- id uniqueness

One more invariant I’d add soon (not urgent): **bbox_world in awwv_meta must equal canonical_bbox in data_index** (you already do), *and* every feature must be within bbox. Even if bbox is computed from features, this catches “NaN coordinate” or malformed geometry early.

## What this means for the NW problem
Since the viewer is now forced to load the exact substrate file you just built, if the NW is still broken:

- it’s not “wrong GeoJSON loaded”
- it’s not “viewer transform drift”
- it’s either:
  1) the NW SVG ingestion/transform decision is still wrong, or
  2) those municipalities are composed of **multiple SVG fragments** and only one fragment is being transformed / classified, or
  3) the NW shapes are correct but *your derived substrate includes extra rings/holes/invalid rings* being “closed” or emitted differently than in the earlier viewer that “looked correct”.

## The fastest way to isolate the true cause now
Do a **side-by-side provenance viewer**, but keep it contract-safe:

**Goal:** For one municipality (start with Bihać), render two layers in the same viewer:
- Layer A: “raw SVG-derived polygons for that file before any viewBox offset”
- Layer B: “final emitted substrate polygons that claim to come from that file”

If those don’t overlap, you’ve found exactly where the transform goes wrong.
If they do overlap, the problem is elsewhere (like mis-assigned municipality_id causing coloring/filters to make it appear wrong).

This is the most reliable diagnostic because it doesn’t rely on centroids, bboxes, or neighbor assumptions. It’s literally: “did our pipeline move these coordinates correctly”.

## Suggested next phase (if you want to proceed)
**Phase G2 (debug-only, no canonical changes): “SVG provenance overlay for NW files”**
- Add a debug artifact under `data/derived/_debug/svg_provenance/` that contains:
  - raw polygons extracted for `Bihac_10049.js`, `Cazin_10227.js`, `Velika Kladusa_11118.js`, `Buzim_11240.js` (pre-transform)
  - the same polygons post-transform
  - the final substrate polygons filtered by `source_file` tag (if you have one) or by municipality id mapping logic
- Add a tiny debug viewer that loads via data_index (for bbox/camera) but overlays these debug layers.

Once you see *where* the delta appears, fixing it becomes straightforward (and doesn’t require inventing new heuristics).

If you want, tell me which of the two is true right now:
- “NW is still geometrically shifted away (floating cluster)”
- “NW is in place but looks wrong (holes, stripes, weird fills)”

…and I’ll give you a ready-to-run Cursor prompt for Phase G2 that matches your ledger/mistake-guard/validations/commit discipline.
---

**User**

I can tell you already it's still broken. Bihać is now overlayed over several municipalities that are east of it usually.
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G2 — NW provenance overlay debug (prove where Bihać transform goes wrong)

MISSION
Bihać is still broken: it overlays municipalities that should be east of it.
We will NOT guess transforms again. We will produce a deterministic, inspectable debug artifact and viewer overlay that shows:
1) raw polygons extracted from the Bihać SVG file before any viewBox offset
2) the same polygons after each candidate transform (none / +viewBox / -viewBox)
3) the final emitted substrate polygons for Bihać (as actually written to settlements_substrate.geojson)
All in the same coordinate space and same viewer so misalignment is unambiguous.

This phase is debug-only: it must not change canonical geometry outputs or simulation logic.
It only adds a debug overlay dataset and a small viewer toggle so we can see exactly where the shift occurs.

ABSOLUTE CONSTRAINTS
- Deterministic output only (stable ordering, no timestamps).
- Do NOT change the canonical substrate geometry generation decisions yet.
- Do NOT modify political control, adjacency, supply, or mechanics.
- Do NOT introduce tolerance/snap/simplify.
- All new debug outputs must live under data/derived/_debug/ (gitignored).
- Commit-per-phase discipline: ONE commit, minimal files.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase G2 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In any new/modified scripts for this phase:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g2 nw provenance overlay debug bihać raw vs transformed vs emitted");

FORAWWV NOTE (MANDATORY RULE)
If this work reveals a systemic design insight or invalidates an assumption, flag that docs/FORAWWV.md may require an addendum, but DO NOT edit FORAWWV.md automatically.

FILES YOU MAY TOUCH
Allowed new files:
- scripts/map/debug_nw_provenance_overlay.ts
Allowed modifications:
- data/derived/substrate_viewer/index.html
- data/derived/substrate_viewer/viewer.js
- package.json
- docs/PROJECT_LEDGER.md

DO NOT modify:
- scripts/map/derive_settlement_substrate_from_svg_sources.ts (no geometry changes in this debug phase)
- any canonical data outputs besides adding debug overlays referenced by viewer at runtime

────────────────────────────────────────────────────────
TASK 1 — Create deterministic debug overlay artifact
────────────────────────────────────────────────────────
Create: scripts/map/debug_nw_provenance_overlay.ts

This script MUST:
1) Read the SVG source file for Bihać (Bihac_10049.js) using the same parsing utilities the derive script uses.
2) Extract polygon geometries in local/path coordinates BEFORE any viewBox translation.
3) Determine viewBox (vx, vy, vw, vh) from the file.
4) Produce THREE transformed variants of the same extracted polygons:
   - "none": raw as extracted
   - "plus": add (vx, vy) to all coordinates
   - "minus": subtract (vx, vy) from all coordinates
5) Read the canonical emitted substrate:
   - data/derived/settlements_substrate.geojson
   Filter features that belong to Bihać municipality.
   IMPORTANT: do not assume municipality name. Use mun id mapping as used by the pipeline.
   If municipality_id in substrate is a mun1990 code, use the known Bihać mun code from registry.
   (If uncertain, locate Bihać by mun name mapping from registry file and match to features’ municipality_id.)
6) Write a single debug GeoJSON:
   data/derived/_debug/nw_provenance_overlay_bihac.geojson

Format:
FeatureCollection with root awwv_meta matching SVG_PIXELS_LEGACY and bbox computed from ALL debug features.
Each feature has properties:
{
  "layer": "raw_none" | "raw_plus_viewbox" | "raw_minus_viewbox" | "emitted_substrate",
  "source_file": "Bihac_10049.js",
  "note": "..."
}

Geometry:
- Use Polygon or MultiPolygon as appropriate, but keep coordinates exactly as computed.
- Stable ordering:
  - Sort features by layer name, then by stable index of extraction.
  - Ensure rings are closed deterministically (use the existing ring closure rule from the project; do not invent a new one).

Also write:
data/derived/_debug/nw_provenance_overlay_bihac.summary.txt
Include:
- viewBox values
- bbox of each layer group (none/plus/minus/emitted)
- count of polygons per layer
No timestamps.

Add npm script:
- "map:debug:nw:provenance": "tsx scripts/map/debug_nw_provenance_overlay.ts"

────────────────────────────────────────────────────────
TASK 2 — Add an overlay toggle to substrate_viewer (debug only)
────────────────────────────────────────────────────────
Modify data/derived/substrate_viewer/viewer.js and index.html to support a debug overlay if present.

Rules:
- Viewer still MUST load canonical geometry through /data/derived/data_index.json as implemented in G0–G1.
- After loading canonical settlements, attempt to fetch (non-fatal) the debug overlay:
  /data/derived/_debug/nw_provenance_overlay_bihac.geojson
  If 404, silently ignore.
- Add a small UI checkbox: “Debug: Bihać provenance overlay”
  Default OFF.
- When ON:
  - Render the debug overlay features on top with distinct strokes:
    raw_none: thin
    raw_plus_viewbox: thicker
    raw_minus_viewbox: thickest
    emitted_substrate: bold
  Do NOT change colors globally; if you must set colors, set only stroke colors for debug layers.
- Add a legend panel listing the four layers and their polygon counts.

No other viewer behavior changes.

────────────────────────────────────────────────────────
TASK 3 — Run and interpret (deterministic outcome)
────────────────────────────────────────────────────────
Run:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
- npm run map:debug:nw:provenance

Serve:
- npx http-server -p 8080 -c-1
Open:
- http://localhost:8080/data/derived/substrate_viewer/index.html
Toggle:
- “Debug: Bihać provenance overlay”

Interpretation rules (write these in your own notes, not code):
- If emitted_substrate overlaps raw_plus_viewbox → derive is applying +viewBox for Bihać
- If emitted_substrate overlaps raw_minus_viewbox → derive is applying -viewBox for Bihać
- If emitted_substrate overlaps raw_none → no offset applied
- If emitted_substrate overlaps NONE of the three → there is an additional transform (scale, flip, or double-apply) happening elsewhere

Also note:
- If emitted_substrate aligns with one of the candidates but is still “geographically wrong”, then the SVG file itself is in a different global regime relative to the rest of the corpus (provenance issue), OR neighbors are mis-transformed.
We will only decide after seeing this overlay.

────────────────────────────────────────────────────────
TASK 4 — Validations (ALWAYS RUN)
────────────────────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:debug:nw:provenance

────────────────────────────────────────────────────────
TASK 5 — Ledger + Commit
────────────────────────────────────────────────────────
Update docs/PROJECT_LEDGER.md with Phase G2 entry:
- Summary: Added NW provenance overlay debug to prove Bihać transform (raw vs +/- viewBox vs emitted substrate)
- Files modified
- New npm script
- Mistake guard phrase (exact)
- FORAWWV note: none (debug only)

Commit:
- git status (ONLY intended files)
- git add scripts/map/debug_nw_provenance_overlay.ts data/derived/substrate_viewer/index.html data/derived/substrate_viewer/viewer.js package.json docs/PROJECT_LEDGER.md
- git commit -m "Phase G2: Bihać provenance overlay debug (raw vs viewBox transforms vs emitted substrate)

- Generate deterministic debug GeoJSON overlay for Bihać
- Add viewer toggle to render overlay if present
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- Running map:debug:nw:provenance produces the overlay GeoJSON and summary txt under data/derived/_debug/
- Viewer can toggle the overlay on/off without breaking normal rendering
- Overlay makes it obvious which candidate transform matches emitted substrate (or that none match)
- All validations pass

HOW TO RUN / TEST
1) npm run map:derive:substrate
2) npm run map:viewer:substrate:index
3) npm run map:debug:nw:provenance
4) npx http-server -p 8080 -c-1
5) Open http://localhost:8080/data/derived/substrate_viewer/index.html
6) Toggle “Debug: Bihać provenance overlay”
```
---

**User**

Just so you know, /data/derived/substrate_viewer/ shows everything correctly.
---

**Assistant**

That’s actually a **very important signal** — thanks for calling it out.

If **`/data/derived/substrate_viewer/` renders correctly**, then we can now state this with confidence:

> **The canonical substrate geometry is correct.  
The SVG ingestion + transforms are no longer the problem.**

So we should **stop touching geometry entirely**. Any further work on SVG offsets, viewBox logic, NW heuristics, etc. would now be actively harmful.

---

## What this implies (narrowing the fault domain)

Given what you’ve confirmed, the remaining failure **must** be in one (or more) of these places:

1. **A different viewer is loading a different geometry source**
   - legacy viewer
   - political control viewer
   - adjacency / contact / combined viewer
   - hard-coded path bypassing `data/derived/data_index.json`

2. **A viewer is applying an extra transform on top of WCS**
   - implicit fit-to-bounds using its *own* bbox
   - canvas transform leftover from earlier code
   - double-application of scale / translate

3. **A layer (political control, municipalities, etc.) is misaligned**
   - geometry is correct, but an overlay is rendered in a different coordinate space
   - makes it *look* like Bihać is “on top of eastern municipalities”

4. **A stale or legacy GeoJSON is still being loaded**
   - cached
   - bundled
   - referenced by relative path
   - copied into a viewer-local folder long ago

Because **substrate_viewer is contract-clean and correct**, it is now your *gold standard*.

---

## Immediate conclusion

We should **not** debug geometry provenance anymore.

We should instead do this:

> **Diff every other viewer’s loading path and camera logic against `substrate_viewer`, and prove they are byte-for-byte loading the same dataset and applying no extra transforms.**

---

## The right next move (clean, fast, deterministic)

### Phase G3 — Viewer parity audit (NO geometry work)

Goal: prove exactly **where** another viewer diverges from `substrate_viewer`.

**High-level idea**
- Instrument *another* viewer (political control is the prime suspect)
- Force it to:
  - load geometry **only via `data/derived/data_index.json`**
  - log bbox + first 5 vertex coordinates
- Compare that to substrate_viewer logs

If they differ → you’ve found the bug.

If they match → the bug is in overlay transforms or layer rendering.

---

## Before writing any more prompts, I need one thing from you

Tell me **which viewer is broken** when Bihać overlays eastern municipalities. For example:

- `/political_control.html`
- `/contact_graph_viewer/`
- `/adjacency_viewer/`
- something else

Once you name it, I’ll give you a **tight Phase G3 Cursor prompt** that:

- does **zero geometry changes**
- adds **one debug log**
- proves beyond doubt whether that viewer:
  - loads the wrong file, or
  - applies an extra transform, or
  - renders a misaligned overlay

You’re past the hard part.  
Now it’s just surgical debugging.
---

**User**

/contact_graph_viewer/ is correct
/adjacency_viewer/ is generally correct, but the map is rotated
political_control.html is giving me blank
---

**Assistant**

Great, this narrows it **a lot**. You now have a clean triage:

- `/data/derived/substrate_viewer/` ✅ **correct** → canonical geometry is sound  
- `/contact_graph_viewer/` ✅ **correct** → geometry + graph overlay pipeline is sound  
- `/adjacency_viewer/` ⚠️ **geometry correct but rotated** → camera / transform bug  
- `political_control.html` ❌ **blank** → loading / contract / JS error, not geometry

This means **there are now two *separate* viewer-class bugs**, neither of which involve SVG ingestion or substrate generation anymore.

We should treat them independently and **never touch geometry again**.

---

# Root-cause hypotheses (now evidence-based)

## 1️⃣ adjacency_viewer is rotated  
That can only be one of these:

- Y-axis flip applied (canvas transform or SVG-to-canvas mismatch)
- Swapped `[x,y] → [y,x]` during render
- Rotation baked into camera transform (e.g. using `ctx.rotate()` or matrix)
- Using a different bbox origin convention (center vs top-left)

Because geometry is otherwise correct, **this is a pure render transform issue**.

## 2️⃣ political_control.html is blank  
That is almost certainly:

- still loading geometry *directly*, bypassing `data/derived/data_index.json`
- failing checksum or contract validation and aborting render
- JS error during fetch or parse (likely swallowed)
- expecting legacy fields removed in F5/G0

This is **a data-loading / contract mismatch**, not a map problem.

---

# Correct next move: Phase G3 (viewer parity audit)

This phase:
- touches **no geometry**
- adds **no new data**
- only instruments viewers to prove divergence vs `substrate_viewer`

Below is a **single Cursor prompt** that handles both issues cleanly and deterministically.

---

## 🧠 Phase G3 — Viewer parity audit & fixes (NO geometry)

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G3 — Viewer parity audit and correction (adjacency rotation + political_control blank)

MISSION
Canonical substrate geometry is correct (verified in substrate_viewer and contact_graph_viewer).
Remaining issues are viewer-specific:

1) adjacency_viewer renders geometry rotated
2) political_control.html renders blank

Fix both by bringing them into strict parity with substrate_viewer:
- same geometry source
- same camera math
- no implicit transforms
- no legacy loading paths

ABSOLUTE CONSTRAINTS
- DO NOT touch any geometry derivation scripts.
- DO NOT modify settlements_substrate.geojson.
- DO NOT add heuristics or offsets.
- Viewer fixes only.
- Deterministic behavior only.
- Commit-per-phase discipline: ONE commit.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase G3 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In every modified JS file:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g3 viewer parity adjacency rotation political control blank");

────────────────────────────────────────
TASK 1 — adjacency_viewer rotation fix
────────────────────────────────────────

Files:
- data/derived/adjacency_viewer/index.html
- data/derived/adjacency_viewer/viewer.js (or equivalent)

Steps:
1) Compare adjacency_viewer camera math to substrate_viewer camera math.
2) Remove any of the following if present:
   - ctx.rotate(...)
   - swapped coordinate access (y,x)
   - inverted y-axis transforms
   - legacy SVG-to-canvas transforms
3) Ensure adjacency_viewer:
   - uses canonical_bbox from data_index.json (not self-computed bbox)
   - fits camera exactly like substrate_viewer
4) Add a temporary debug log (console only, no UI):
   - log canonical_bbox
   - log first polygon first 3 vertices
   This must match substrate_viewer output exactly.
5) Confirm map renders upright and aligned (no rotation).

Do not introduce new camera abstractions — copy substrate_viewer logic verbatim where possible.

────────────────────────────────────────
TASK 2 — political_control.html blank screen fix
────────────────────────────────────────

Files:
- data/derived/political_control.html
- its associated JS file(s)

Steps:
1) Remove ALL direct GeoJSON loading paths.
   political_control must load geometry ONLY via:
     /data/derived/data_index.json
2) Ensure:
   - schema_version, coordinate_space, canonical_bbox are validated
   - settlements dataset path is read from index
3) Add fatal error banner (like substrate_viewer) instead of silent failure.
4) Fix any references to legacy fields:
   - state.political_controllers (already removed in F5)
   - legacy settlement arrays
5) Ensure political overlay:
   - uses settlement geometries already loaded
   - applies coloring only (no geometry transform)
6) If viewer previously assumed a different coordinate origin, remove that logic.

Outcome:
- political_control.html renders immediately with colored settlements.
- No blank screen.
- No console errors.

────────────────────────────────────────
TASK 3 — Parity verification
────────────────────────────────────────

Run:
- npm run typecheck
- npm test
- npm run map:contracts:validate

Manual:
- npx http-server -p 8080 -c-1
Open and verify:
- /data/derived/substrate_viewer/ → correct
- /adjacency_viewer/ → correct, not rotated
- /contact_graph_viewer/ → unchanged and correct
- /political_control.html → visible and aligned

In DevTools → Network:
- All viewers load /data/derived/data_index.json first
- No viewer loads settlements_substrate.geojson directly

────────────────────────────────────────
TASK 4 — Ledger + Commit
────────────────────────────────────────

Update docs/PROJECT_LEDGER.md with Phase G3 entry:
- Summary: Viewer parity fixes (adjacency rotation, political_control blank)
- Root cause explanation
- Files modified
- Mistake guard phrase
- FORAWWV note: none (viewer-only fixes)

Commit:
- git status (ONLY intended files)
- git add <viewer files> docs/PROJECT_LEDGER.md
- git commit -m "Phase G3: fix adjacency viewer rotation and restore political_control viewer via contract loading

- Align adjacency_viewer camera math with substrate_viewer
- Migrate political_control to canonical data_index loading
- Add fatal error reporting and remove legacy paths
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- adjacency_viewer no longer rotated
- political_control.html renders correctly
- all viewers load geometry exclusively via data_index.json
- no geometry or simulation changes
- single clean commit
```

---

## Why this will finally close the loop

You now have:

- **One canonical geometry** (already proven correct)
- **One canonical loading contract**
- **One canonical camera model**

Any viewer that diverges is objectively wrong — and Phase G3 forces convergence.

Once G3 is done, **map correctness stops being fragile**. Any future issue will surface as a contract failure or a visible error banner, not a mysterious rotated Bosnia.

If you want, once G3 is complete I can help you:
- delete dead viewer code paths
- formalize a “viewer parity checklist”
- or freeze a `MapRenderingInvariant.md` so this never regresses again
---

**User**

Before I run that prompt, here are the results of the previous one:
Phase G2 is done. Summary:
Phase G2 summary
TASK 1 — Debug overlay artifact
scripts/map/debug_nw_provenance_overlay.ts
Reads data/source/settlements/Bihac_10049.js with the same viewBox/path regex as the derive script.
Extracts polygons in local/path coordinates (no viewBox applied).
Builds three variants: raw_none, raw_plus_viewbox (add vx, vy), raw_minus_viewbox (subtract vx, vy).
Loads data/derived/settlements_substrate.geojson and keeps features with municipality_id === "10049" (Bihać).
Writes:
data/derived/_debug/nw_provenance_overlay_bihac.geojson (FeatureCollection with layer, source_file, note; sorted by layer then note).
data/derived/_debug/nw_provenance_overlay_bihac.summary.txt (viewBox, bbox per layer, polygon count per layer; no timestamps).
npm script: map:debug:nw:provenance.
TASK 2 — Viewer overlay toggle
index.html: Checkbox “Debug: Bihać provenance overlay” (default OFF) and a legend div for the overlay.
viewer.js: After loading canonical data, fetches /data/derived/_debug/nw_provenance_overlay_bihac.geojson (404 → ignore). When the checkbox is ON, draws overlay with stroke-only, different line widths and colors: raw_none (1px gray), raw_plus_viewbox (2px blue), raw_minus_viewbox (3px red), emitted_substrate (4px green). Legend lists the four layers and their polygon counts.
TASK 3 — Interpretation (from summary)
emitted_substrate bbox: [41, -2.448..., 176.22..., 246.02...]
raw_minus_viewbox bbox: [41, -2.448..., 176.22..., 246.02...]
They match exactly → derive is applying the minus viewBox offset for Bihać (subtract viewBox x,y). So: emitted_substrate overlaps raw_minus_viewbox.
Validations
npm run typecheck — pass
npm test — pass (277 tests)
npm run map:contracts:validate — pass
npm run map:contracts:determinism — pass
npm run map:debug:nw:provenance — pass
Ledger and commit
Phase G2 appended to docs/PROJECT_LEDGER.md.
Single commit with the requested message.
Note: Running npm run map:viewer:substrate:index will overwrite index.html and viewer.js and remove the overlay UI. To keep the overlay, either avoid re-running that script or add the overlay checkbox and logic to the build script that generates the viewer (e.g. build_substrate_viewer_index.ts).
---

**Assistant**

Got it — and that last note is the key: **anything you change directly inside `data/derived/substrate_viewer/index.html` and `viewer.js` is not durable**, because `npm run map:viewer:substrate:index` regenerates (and overwrites) them.

So before we touch **adjacency_viewer** or **political_control**, we should enforce a simple rule:

- **If a viewer is generated by a script, fix the script, not the generated files.**
- **If a viewer is hand-maintained, fix the viewer files directly.**

Below is an updated, ready-to-run Phase **G3** Cursor prompt that bakes this in and also preserves your G2 overlay permanently by moving it into the generator (so you don’t lose it every time you rebuild).

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G3 — Viewer parity fixes (adjacency rotation, political_control blank) + make G2 overlay durable

MISSION
Canonical substrate geometry renders correctly in /data/derived/substrate_viewer/ and /contact_graph_viewer/.
Remaining issues are viewer-specific:
1) /adjacency_viewer/ renders rotated
2) political_control.html renders blank
Additionally, Phase G2 overlay UI is currently fragile because substrate_viewer is regenerated by map:viewer:substrate:index and overwrites manual edits.

Fix viewer issues WITHOUT touching geometry generation.
Make the Bihać provenance overlay durable by embedding it in the substrate viewer build output (the generator), not as hand edits.

ABSOLUTE CONSTRAINTS
- DO NOT modify any geometry derivation decisions (no changes to derive_settlement_substrate_from_svg_sources.ts).
- DO NOT modify settlements_substrate.geojson generation logic beyond existing Phase G1 meta injection already committed.
- Viewer and tooling fixes only.
- Deterministic behavior only (stable ordering, no timestamps).
- Commit-per-phase discipline: ONE commit.
- Always run validations.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase G3 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
Add to every modified TS/JS source file touched in this phase:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g3 viewer parity adjacency rotation political control blank + durable debug overlay");

FILES YOU MAY TOUCH
- scripts/map/build_substrate_viewer_index.ts  (generator; must embed overlay UI logic so it persists)
- data/derived/substrate_viewer/*             (only if these are NOT generated; if generated, modify generator instead)
- scripts/map/build_adjacency_viewer.ts       (if adjacency viewer is generated; prefer fixing generator)
- data/derived/adjacency_viewer/*             (only if not generated)
- data/derived/political_control.html and its JS (or the generator if it exists)
- package.json (if new script needed)
- docs/PROJECT_LEDGER.md

DO NOT touch geometry derivation scripts or derived geometry artifacts for commit.

────────────────────────────────────────
TASK 0 — Determine which viewers are generated vs hand-written
────────────────────────────────────────
1) Identify how each viewer is produced:
- substrate_viewer: generated by scripts/map/build_substrate_viewer_index.ts (confirmed)
- adjacency_viewer: check scripts/map/build_adjacency_viewer.ts and npm scripts; determine if it regenerates files under data/derived/adjacency_viewer/
- political_control.html: determine if it is generated or static

Rule:
- If generated, fix the generator script.
- If static, fix the static files.

────────────────────────────────────────
TASK 1 — Make G2 overlay durable in substrate_viewer
────────────────────────────────────────
Update scripts/map/build_substrate_viewer_index.ts so that the generated substrate_viewer output always includes:
- Checkbox: “Debug: Bihać provenance overlay” (default OFF)
- Legend panel (hidden unless enabled)
- viewer.js logic that:
  - AFTER loading canonical geometry via /data/derived/data_index.json (unchanged),
  - tries to fetch /data/derived/_debug/nw_provenance_overlay_bihac.geojson (404 = ignore),
  - draws overlay with the same stroke-only styling used in Phase G2 when enabled.

Important:
- Keep this debug functionality strictly optional and non-fatal.
- Do not change any canonical loading or checksum logic introduced in G0–G1.
- Do not introduce timestamps.

Acceptance for Task 1:
- Running npm run map:viewer:substrate:index does NOT remove the overlay toggle anymore.

────────────────────────────────────────
TASK 2 — Fix adjacency_viewer rotation (viewer parity)
────────────────────────────────────────
Goal: adjacency_viewer must use the same coordinate interpretation and camera fit as substrate_viewer (no implicit transforms).

Steps:
1) Open adjacency viewer code (generated or static) and locate the transform pipeline:
   - any ctx.rotate
   - y inversion (scale(1,-1))
   - swapped x/y usage
   - custom matrix logic
2) Remove/neutralize rotation sources and align with substrate_viewer’s world-to-screen mapping:
   - Y-down, no rotation, no axis swap
3) Ensure it fits camera using canonical_bbox from /data/derived/data_index.json (not self-derived).
4) Add a temporary console debug (leave it in if harmless; no timestamps):
   - log canonical_bbox
   - log first polygon first 3 vertices (from loaded GeoJSON)
This must match the same values in substrate_viewer for the same feature id.

Acceptance for Task 2:
- /adjacency_viewer/ renders upright (not rotated)
- Edges still overlay correctly

────────────────────────────────────────
TASK 3 — Fix political_control.html blank screen
────────────────────────────────────────
Goal: political_control.html must render and must load geometry strictly via /data/derived/data_index.json (contract-first).

Steps:
1) Find why it is blank:
   - open DevTools console errors (replicate locally)
   - locate fetch paths; identify any direct geometry load bypassing data_index.json
2) Migrate political_control to the same loading pattern as substrate_viewer:
   - fetch /data/derived/data_index.json first
   - validate required fields
   - fetch dataset bytes from /data/derived/<path> and verify sha256
   - parse GeoJSON
   - fit camera to canonical_bbox
3) Ensure the political control overlay uses the correct API endpoint from Phase F5:
   - it must call /api/political_control (or equivalent) and color settlements by sid
4) Add fatal error UI banner for any loading mismatch (no silent failure).

Acceptance for Task 3:
- political_control.html is no longer blank
- it renders settlement polygons and applies control coloring
- it does not load any other geojson directly
- it does not apply any additional transform beyond camera

────────────────────────────────────────
TASK 4 — Validations (ALWAYS RUN)
────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism

Manual checks:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
- npx http-server -p 8080 -c-1
Open:
- http://localhost:8080/data/derived/substrate_viewer/index.html  (overlay toggle persists)
- http://localhost:8080/data/derived/adjacency_viewer/index.html  (upright)
- http://localhost:8080/data/derived/political_control.html       (not blank)

DevTools network checks:
- each viewer loads /data/derived/data_index.json first
- then loads settlements via path from index
- no direct settlements_substrate.geojson path hardcoded
- political_control calls /api/political_control successfully

────────────────────────────────────────
TASK 5 — Ledger + Commit (single commit)
────────────────────────────────────────
Update docs/PROJECT_LEDGER.md with Phase G3 entry:
- Summary: adjacency_viewer rotation fixed; political_control blank fixed; substrate_viewer overlay made durable via generator
- Files modified
- Mistake guard phrase (exact)
- FORAWWV note: none (viewer/tooling only)

Commit:
- git status (ONLY intended files)
- git add <modified viewer/generator files> docs/PROJECT_LEDGER.md package.json (if changed)
- git commit -m "Phase G3: viewer parity fixes (adjacency rotation, political_control blank) + durable debug overlay

- Make substrate_viewer debug overlay persistent via generator output
- Align adjacency_viewer camera/transforms with substrate_viewer (no rotation)
- Migrate political_control viewer to contract-first loading and restore rendering
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- substrate_viewer remains correct and overlay toggle persists after rebuild
- adjacency_viewer is not rotated
- political_control.html renders (not blank)
- all validations pass
- one clean commit
```

If you run this, you’ll end up with:  
1) one “gold standard” viewer (substrate) that stays correct across rebuilds,  
2) adjacency fixed at the transform/camera level, and  
3) political control restored and contract-compliant (so it can’t go blank silently again).
---

**User**

While it's running, let me know how this slots into the architecture proposal. Are we still on the right track?
---

**Assistant**

Yes — this actually moves you *closer* to the architecture you wrote, not away from it.

Here’s how what you’ve done (G0–G2) and what G3 is doing map onto your proposal, and what’s still missing.

## Where you already match the proposal

### Single entry point
Your proposal’s keystone is “viewer loads `data_index.json` first”.  
G0 implemented that for `substrate_viewer`, and G3 is explicitly extending it to `adjacency_viewer` and `political_control.html`.

That’s the most important “contract-first” outcome: **no viewer is allowed to freeload geometry via hard-coded paths**.

### Contract enforcement and loud failure
You wanted the viewer to reject invalid inputs and fail loudly with actionable messages.  
G0 did that with required-field checks and checksum verification + fatal banner.

Once political_control migrates to the same loader, “blank screen” becomes “this is the exact field/path/checksum that failed”.

### Determinism
You wanted hash-stable reproducibility and stable ordering.  
G1 and the validator/determinism scripts are essentially your “Phase 1 hardening” in miniature:
- stable bbox computation
- checksuming
- determinism check for repeated builds

### Metadata at the dataset root
Your proposal’s `awwv_meta` header is now real (G1).  
Even if it’s minimal today, it’s the *shape* of the contract you need going forward.

## How G3 fits
G3 is basically “Phase 0 stop-the-bleeding” finishing the job across all viewers:

- **Adjacency rotation** is a pure violation of your “viewer computes screen positions from WCS + Camera only” rule. Fixing it brings adjacency_viewer back under the same camera math as substrate_viewer.
- **Political control blank** is a violation of “viewer must load through index and validate contracts.” Migrating it to the canonical loader is exactly the architecture.

And the “durable overlay” change is also aligned:
- In your proposal, debug modes and overlays are part of the viewer system, not ad hoc edits.
- Moving the overlay into the generator is the same idea as “viewers are reproducible artifacts, not hand-edited state.”

## What’s still missing vs your proposal (but not a blocker)
You’re still on track, you’re just in an intentionally minimal subset:

### 1) WCS normalization (AWWV_WCS_v1)
Right now you’re effectively at “SVG_PIXELS_LEGACY” as the coordinate_space. That’s fine.
Your architecture’s WCS normalization (origin [0,0], micro-units, etc.) is **Phase 2+** territory. You should not do it until the viewer pipeline is stable across all viewers — which is what G3 is finishing.

### 2) Full schema library and formal JSON Schema validation
You have:
- an internal “contract validator” script  
You don’t yet have:
- a published schema set (`schemas/*.json`) and strict per-feature schema validation.

That’s a good choice for now. The value of strict feature schema is real, but it’s “hardening” rather than “stop breakage”.

### 3) Layer registry and style contracts
Right now you still have “viewer knows how to color things.”  
Your proposal’s “add a layer without viewer code changes” is later.

G3 doesn’t conflict with that; it’s a prerequisite because you can’t build a generic layer registry if your basic geometry loading isn’t unified.

## The main architectural risk to watch
The only thing I’d flag as a potential deviation is this pattern:

- `data/derived/data_index.json` = canonical
- `data/derived/substrate_viewer/data_index.json` = viewer-local auxiliary index

This is fine *as long as* you keep the viewer-local file strictly as auxiliary “legend/by_sid” data and never let it become a second “mini index” with bbox/geometry paths. G3 should keep it that way.

If you ever want to tighten further, you can later fold the “by_sid” auxiliary data into the canonical index under a `viewer_aux` key or as a dataset entry, but that’s optional.

## Bottom line
You’re still on the right track.

- G0–G1 implemented the “contract-first loading + determinism” spine.
- G2 was a useful diagnostic, and making it durable is consistent with “debug modes.”
- G3 is exactly the missing step: **bring every viewer under the same contract and camera math**, eliminating transform drift and silent blank screens.

Once G3 is done, the next logical step (if you want) is a small Phase G4:
- convert political control into a proper “layer” entry in data_index (even if styles are still simple)
- start separating “data vs style” without refactoring everything.

But you don’t need that yet to solve the immediate map pain.
---

**User**

Before we continue and while the Cursor is running, remember that displacement of populations will be happening on settlement, as well as municipality levels. We will work out the system later, but it might be important for this restructuring we are doing right now with the map.
---

**Assistant**

Population displacement will be modeled at both settlement and municipality levels in AWWV; keep in mind for map/data restructuring, system details to be defined later.
---

**Assistant**

Model set context updated.
---

**Assistant**

Noted and stored for this project: population displacement will need to operate at **both settlement level and municipality level**, even if the mechanics come later.

How it affects the map/data restructuring you’re doing right now (without introducing new mechanics):

- **Keep stable, canonical IDs** for both layers (sid and mun1990_id) because displacement will have to “attach” to them over time.
- Ensure every settlement feature has **mun1990_id coverage** (including edge cases like remaps), so municipality-level displacement can be computed as an aggregation without fragile joins.
- Avoid viewer-only hacks that hide missing links; if anything is unknown/missing, keep it explicit and contract-validated (same philosophy as political control unknowns).
- When you add metadata/contracts (like you just did), leave room for displacement fields later, e.g. as optional properties or as separate per-turn datasets keyed by sid / mun1990_id (so you don’t have to rewrite geometry to support displacement).

This doesn’t require any further changes for G3, but it’s exactly the kind of “future system dependency” that the contract-first approach protects: you’ll be able to add displacement overlays/state cleanly later without geometry churn.
---

**User**

Phase G3 Summary
TASK 0 — Viewer production
substrate_viewer: Generated by scripts/map/build_substrate_viewer_index.ts.
adjacency_viewer: Generated by scripts/map/build_adjacency_viewer.ts → data/derived/adjacency_viewer/index.html and data.json.
political_control: Dev runner has tools/dev_runner/public/political_control.html + .js; Phase G3 added a static copy under data/derived/ for http-server.
TASK 1 — Durable G2 overlay in substrate_viewer
build_substrate_viewer_index.ts now emits:
Checkbox: “Debug: Bihać provenance overlay” (default off).
Legend div #debug-overlay-legend (hidden until overlay loaded).
In generated viewer.js: refs to debugOverlayCheck / debugOverlayLegendDiv, optional fetch of /data/derived/_debug/nw_provenance_overlay_bihac.geojson (404 ignored), updateDebugOverlayLegend, renderDebugOverlayPolygon, renderDebugOverlay (stroke-only by layer), and render call when the checkbox is on.
Mistake guard set to: phase g3 viewer parity adjacency rotation political control blank + durable debug overlay.
TASK 2 — Adjacency viewer rotation
build_adjacency_viewer.ts:
Load order: fetch /data/derived/data_index.json first, then data.json.
fitToView uses canonical_bbox from the index (fallback to data.bbox if missing).
worldToScreen: y: y * transform.scale + transform.y (Y-down, no flip).
screenToWorld: (sx - transform.x) / scale, (sy - transform.y) / scale.
console.debug for canonical_bbox and first polygon’s first three vertices.
Guard: contactGraph && Array.isArray(contactGraph.edge_list) before iterating (avoids error when contact graph has no edge_list).
TASK 3 — Political control no longer blank
Dev runner: Serves /data/derived/data_index.json and /data/derived/settlements_substrate.geojson for contract-first loading.
political_control.js (dev_runner + data/derived):
Load geometry only via /data/derived/data_index.json → validate → fetch dataset → verify SHA-256 → set globalBounds from canonical_bbox → fit camera.
Load control: /api/political_control, with fallback to ./political_control_data.json if API is not available.
Fatal error banner on index/dataset/checksum/control load failure.
scripts/map/build_political_control_data.ts: Builds deterministic data/derived/political_control_data.json (same shape as API). npm script: map:viewer:political-control-data.
data/derived/political_control.html and data/derived/political_control.js: Static viewer for http-server (e.g. http://localhost:8080/data/derived/political_control.html), script ./political_control.js, control from API or ./political_control_data.json.
TASK 4 — Validations
npm run typecheck — pass
npm test — 277 tests pass
npm run map:contracts:validate — pass
npm run map:contracts:determinism — pass
TASK 5 — Ledger and commit
Phase G3 entry added to docs/PROJECT_LEDGER.md (summary, change, files modified, mistake guard phrase, FORAWWV: none).
Single commit: Phase G3: viewer parity fixes (adjacency rotation, political_control blank) + durable debug overlay (13 files; no geometry derivation or derived geometry artifacts).
Manual checks you can do
npm run map:viewer:substrate:index then open http://localhost:8080/data/derived/substrate_viewer/index.html — overlay checkbox and legend persist after rebuild.
Open http://localhost:8080/data/derived/adjacency_viewer/index.html — map upright, no rotation; edges still overlay.
Open http://localhost:8080/data/derived/political_control.html — map and control coloring render; geometry via data_index.json; control from API or political_control_data.json.

The inspection shows that we have now managed to ruin all the viewers with the Bihać bug.
---

**Assistant**

What you’re seeing is consistent with a **good (but painful) outcome** of G0–G3:

**We didn’t “break” three viewers. We removed three different ways of being wrong.**  
Now *all* viewers are loading the **same canonical substrate bytes** (via `data/derived/data_index.json` + checksum), so they all show the **same underlying geometry problem**.

So the fix is no longer in any viewer. The fix is in **the substrate derivation decision for the NW SVG files** (Bihać et al.). G2 already proved an important fact:

- the **emitted substrate Bihać** matches `raw_minus_viewbox` exactly  
→ meaning the pipeline is currently applying **minus** for Bihać.

If that placement is wrong, then the transform choice is wrong — and the contract-first architecture has now made that unavoidably visible everywhere.

## Next step: lock the NW transform against a known-good internal anchor (no GeoBoundaries)

You told me earlier you had older viewers that were correct. Your repo also preserves the **master-derived legacy substrate** under:

- `data/derived/_legacy_master_substrate/settlements_substrate.geojson`

We can use that as the deterministic “truth anchor” to choose the correct transform **without guessing** and **without GeoBoundaries**:

For each NW SVG file (Bihać/Cazin/Velika Kladuša/Bužim), evaluate candidates:
- none / +viewBox / -viewBox

Then pick the candidate whose municipality bbox **best matches the legacy municipality bbox** (same mun1990 id) — using a deterministic metric:
- minimize bbox distance, maximize overlap, tie-break deterministically.

That will finally answer “plus vs minus vs none” with a reproducible, repo-local proof.

---

## Cursor prompt: Phase G4 — NW transform selection anchored to legacy substrate

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G4 — Fix NW SVG coordinate regime using legacy substrate as deterministic anchor (no viewer changes)

MISSION
All viewers now show the same Bihać bug because they load the same canonical substrate bytes (contract-first).
Therefore the bug is in substrate derivation (SVG → substrate) for NW municipalities.
We will fix NW transform selection deterministically by anchoring against the preserved master-derived legacy substrate:
data/derived/_legacy_master_substrate/settlements_substrate.geojson

We must not use GeoBoundaries. We must not “eyeball” centroids. We must not tweak viewers.
We will implement a deterministic chooser for the NW files that picks {none, plus, minus} by matching legacy municipality bbox.

ABSOLUTE CONSTRAINTS
- Modify ONLY the SVG substrate derivation code and its audit output.
- No viewer changes in this phase.
- No tolerance/snap/simplify/smoothing.
- Deterministic ordering, no timestamps.
- Record a deterministic audit artifact in data/derived/_debug/ (gitignored).
- Always run validations.
- One commit.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase G4 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In scripts/map/derive_settlement_substrate_from_svg_sources.ts:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g4 nw svg transform anchored to legacy substrate bbox");

FORAWWV NOTE (MANDATORY RULE)
If this reveals a systemic design insight (e.g., SVG coordinate regimes vary irreducibly), flag that docs/FORAWWV.md may need an addendum, but DO NOT edit FORAWWV.md automatically.

SCOPE FILES
Allowed modifications:
- scripts/map/derive_settlement_substrate_from_svg_sources.ts
- docs/PROJECT_LEDGER.md
Do not commit derived artifacts.

────────────────────────────────────────
TASK 1 — Define NW file set and mun1990 targets
────────────────────────────────────────
In derive_settlement_substrate_from_svg_sources.ts define a constant set:
NW_FILES = {
  "Bihac_10049.js": mun1990_id "10049",
  "Cazin_10227.js": mun1990_id "10227",
  "Velika Kladusa_11118.js": mun1990_id "11118",
  "Buzim_11240.js": mun1990_id "10227"   // remap Bužim → Cazin (already canonical)
}

Ensure filename normalization uses the same normFile logic already introduced.

────────────────────────────────────────
TASK 2 — Load legacy anchor bboxes once
────────────────────────────────────────
Load:
data/derived/_legacy_master_substrate/settlements_substrate.geojson

Compute a municipality bbox map from legacy substrate:
legacyMunBboxById[mun1990_id] = [minx,miny,maxx,maxy]
Deterministic:
- iterate features in file order
- update bbox per municipality_id
- stable float ops

If a legacy bbox is missing for a mun id, record that in audit and fallback to previous behavior for that file (do not guess).

────────────────────────────────────────
TASK 3 — Compute candidate bboxes per NW file and choose deterministically
────────────────────────────────────────
For each NW file:
- Extract polygons as the script currently does (after validation, before emission).
- Build three candidate versions for that file’s polygons:
  - none
  - plus viewBox (add vx,vy)
  - minus viewBox (subtract vx,vy)
- For each candidate, compute bbox_candidate.

Compare candidate bbox to legacy municipality bbox for the target mun1990 id using deterministic scoring:
Primary score: bboxDistance(candidate, legacy) (0 is best)
Secondary: -bboxOverlapArea(candidate, legacy) (more overlap is better)
Tie-break: deterministic preference order: none > plus > minus

Pick candidate with best (distance, overlap, preference).

IMPORTANT
- This chooser applies ONLY to NW_FILES.
- All other files retain current behavior (do not change).

────────────────────────────────────────
TASK 4 — Apply chosen transform once, in one place
────────────────────────────────────────
Where polygons are transformed before emission:
- If file is NW and has viewBox:
  apply chosen transform (none/plus/minus) exactly once.
- Keep Bužim→Cazin municipality_id remap intact and unchanged.

Do not leave the old “reference median” chooser. Remove any NW chooser that isn’t the legacy-anchored chooser.

────────────────────────────────────────
TASK 5 — Deterministic audit outputs (debug, gitignored)
────────────────────────────────────────
Write:
data/derived/_debug/nw_legacy_anchor_chooser_audit.json
data/derived/_debug/nw_legacy_anchor_chooser_audit.txt

Per NW file record:
- file
- normFile
- viewBox
- target_mun1990_id
- legacy_bbox
- candidate_bboxes: none/plus/minus
- candidate_scores: distance + overlap
- chosen + reason (exact ordered comparison result)

Sort entries by filename.

No timestamps.

────────────────────────────────────────
TASK 6 — Rebuild and verify
────────────────────────────────────────
Run:
- npm run map:derive:substrate
- npm run map:viewer:substrate:index
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism

Manual:
- npx http-server -p 8080 -c-1
Open:
- http://localhost:8080/data/derived/substrate_viewer/index.html
- http://localhost:8080/data/derived/adjacency_viewer/index.html
- http://localhost:8080/data/derived/political_control.html

Confirm:
- Bihać no longer overlays eastern municipalities
- NW region looks correct across all viewers

If still wrong, do NOT tweak heuristics; instead inspect the chooser audit to see which candidate was selected and whether legacy bbox anchor exists/matches.

────────────────────────────────────────
TASK 7 — Ledger + Commit (one commit)
────────────────────────────────────────
Update docs/PROJECT_LEDGER.md:
- Phase G4 summary: NW transform selection anchored to legacy substrate bbox
- Files changed
- Mistake guard phrase
- FORAWWV note: none if resolved; otherwise flag possible addendum but no auto-edit

Commit:
- git status (ONLY intended files)
- git add scripts/map/derive_settlement_substrate_from_svg_sources.ts docs/PROJECT_LEDGER.md
- git commit -m "Phase G4: fix NW SVG transform via legacy substrate anchor

- Choose none/plus/minus for NW files by matching legacy municipality bbox
- Emit deterministic chooser audit under data/derived/_debug/
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- NW municipalities render correctly (Bihać not overlaying eastern munis) across:
  substrate_viewer, adjacency_viewer, political_control
- Chooser audit exists and is deterministic
- No viewer changes
- All validations pass
- One commit
```

### Why this is the right move now
- It **uses an internal, known-good reference** you already have (legacy master substrate).
- It avoids external data you told me to ignore.
- It produces an audit trail you can point to later: “we picked PLUS for Bihać because it best matches the legacy bbox”.

If G4 fixes it, you’re done. If it doesn’t, the audit will tell us *exactly* whether the legacy anchor is missing/incorrect or whether the mismatch is larger than a viewBox sign issue (e.g., scale, axis swap, double-transform).
---

**User**

Phase G4 is done. Summary:
Phase G4 — NW SVG transform anchored to legacy substrate
Implemented
NW_FILES constant
In derive_settlement_substrate_from_svg_sources.ts:
Bihac_10049.js→10049, Cazin_10227.js→10227, Velika Kladusa_11118.js→11118, Buzim_11240.js→10227 (Bužim→Cazin). Membership uses existing normFile().
Legacy anchor bboxes
Loads data/derived/_legacy_master_substrate/settlements_substrate.geojson, iterates features in file order, and builds legacyMunBboxById[mun1990_id] = [minx, miny, maxx, maxy]. If the file is missing, the script continues and uses topology fallback where legacy is absent.
Legacy-anchored chooser
For each NW file: three candidates (none / plus viewBox / minus viewBox).
Primary: bboxDistance(candidate, legacy) (0 best).
Secondary: -bboxOverlapArea(candidate, legacy) (more overlap better).
Tie-break: none > plus > minus.
If there is no legacy bbox for the target mun1990 id, it’s recorded in the audit and the previous topology-based choice (neighbor bboxes) is used.
Single transform application
The existing loop still applies the chosen transform (none/plus/minus) once per NW file; Bužim→Cazin municipality_id remap is unchanged. The old “reference median” chooser is removed; only the legacy-anchored chooser (with topology fallback) remains.
G4 audit outputs (deterministic, under debug/)
Writes:
data/derived/_debug/nw_legacy_anchor_chooser_audit.json
data/derived/_debug/nw_legacy_anchor_chooser_audit.txt
Per NW file: file, normFile, viewBox, target_mun1990_id, legacy_bbox, candidate_bboxes (none/plus/minus), candidate_scores (distance + overlap), chosen, reason. Entries sorted by filename. No timestamps.
Mistake guard
assertNoRepeat("phase g4 nw svg transform anchored to legacy substrate bbox") added at top of script.
Ledger
Phase G4 entry added to docs/PROJECT_LEDGER.md (summary, files changed, mistake guard, FORAWWV note).
Commit
Single commit with only scripts/map/derive_settlement_substrate_from_svg_sources.ts and docs/PROJECT_LEDGER.md (no derived artifacts).
Validation
npm run map:derive:substrate — OK (legacy 142 municipality bboxes loaded; audit written).
npm run map:viewer:substrate:index — OK.
npm run typecheck — OK.
npm test — 277 tests passed.
npm run map:contracts:validate — PASS.
npm run map:contracts:determinism — PASS (two full builds identical).
Chooser result
From the audit, the legacy-anchored chooser picked none for all four NW files (Bihać, Cazin, Velika Kladuša, Bužim): the “none” candidate had the best overlap with the legacy municipality bbox in each case. So the current substrate already matches the legacy layout for the NW region; no viewBox offset is applied there.
Manual check (your side)
From repo root run:
npx http-server -p 8080 -c-1
Then open:
http://localhost:8080/data/derived/substrate_viewer/index.html
http://localhost:8080/data/derived/adjacency_viewer/index.html
http://localhost:8080/data/derived/political_control.html
Confirm: Bihać no longer overlays eastern municipalities and the NW region looks correct. If something is still wrong, use data/derived/_debug/nw_legacy_anchor_chooser_audit.json (and .txt) to see which candidate was chosen and whether the legacy bbox exists and matches.
FORAWWV
No FORAWWV change was made. The ledger notes: if later work shows that SVG coordinate regimes differ irreducibly by source, docs/FORAWWV.md may need an addendum; do not edit FORAWWV automatically.

I can confirm that http://localhost:8080/data/derived/substrate_viewer/index.html and 
http://localhost:8080/data/derived/political_control.html now work correctly! However, this one: http://localhost:8080/data/derived/adjacency_viewer/index.html does not.
---

**Assistant**

All the files uploaded by the user have been fully loaded. Searching won't provide additional information.
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G3.1 — Fix adjacency_viewer load failures (robust contract-first loading + fatal error UI)

MISSION
substrate_viewer and political_control now work correctly via contract-first loading.
adjacency_viewer (http://localhost:8080/data/derived/adjacency_viewer/index.html) does NOT work.
We will fix adjacency_viewer WITHOUT touching geometry derivation. This is a viewer loading/runtime issue.

Root suspicion: adjacency_viewer’s fetch paths are brittle across serve modes (repo-root http-server vs npm serve from adjacency_viewer root). We must make loading robust and fail loudly (no silent blank/failed render).

ABSOLUTE CONSTRAINTS
- Do NOT modify any geometry derivation scripts (no changes to SVG substrate generation).
- Do NOT modify settlements_substrate.geojson generation logic.
- Fix only adjacency_viewer generator/runtime.
- Deterministic output only.
- Always run validations.
- One small commit.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase G3.1 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In scripts/map/build_adjacency_viewer.ts:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g3.1 adjacency viewer robust contract loader + fatal errors");

FILES YOU MAY TOUCH
- scripts/map/build_adjacency_viewer.ts
- data/derived/adjacency_viewer/index.html (generated output)
- data/derived/adjacency_viewer/viewer.js  (if you decide to split JS; generated output)
- package.json (only if a script is missing/incorrect)
- docs/PROJECT_LEDGER.md

Do NOT touch other viewers in this phase.

────────────────────────────────────────
TASK 1 — Reproduce and capture the real failure
────────────────────────────────────────
1) Serve from repo root:
   npx http-server -p 8080 -c-1
   Open:
   http://localhost:8080/data/derived/adjacency_viewer/index.html
2) In DevTools:
   - capture console errors
   - capture failed network requests (status + URL)
3) Also test the npm-based serve path if it exists (e.g. npm run map:serve:adjacency).
Record which mode fails and why.

If it’s a missing file error, confirm whether build_adjacency_viewer.ts actually writes all referenced assets (index.html, viewer.js, data.json).

────────────────────────────────────────
TASK 2 — Make adjacency_viewer contract-first loader robust to base path
────────────────────────────────────────
In the adjacency viewer runtime JS (whether inline or separate viewer.js), implement a deterministic “candidate URL” loader.

Requirements:
A) data_index.json loading:
Try these URLs in order until one succeeds (status 200):
1) /data/derived/data_index.json                          (repo-root server mode)
2) ../data_index.json                                     (if served from /data/derived/adjacency_viewer/)
3) ../../data_index.json                                  (if served from /data/derived/)
4) data_index.json                                        (if served with derived as root)
Stop at first success.

B) dataset loading:
Once index is loaded and settlements path is known, fetch the dataset using the SAME base as the successful index load:
- If index came from /data/derived/data_index.json, dataset should be fetched from /data/derived/<dataset.path>
- If index came from ../data_index.json (meaning base is ../), dataset should be fetched from ../<dataset.path>
Implement this by extracting a “derivedBaseUrl” from the successful index URL.

C) adjacency data.json:
Try both:
- data.json (relative)
- ./data.json
and if needed:
- /data/derived/adjacency_viewer/data.json
Again: stop at first success.

D) Fail loudly:
If any of these required loads fail (index, dataset, data.json), show a full-width fatal error banner in the page with:
- which resource failed
- the URLs attempted
- the final error (status/text)

No silent blank render.

E) Keep the camera parity changes you already made:
- fit to canonical_bbox from index
- Y-down, no rotation, no axis swap

────────────────────────────────────────
TASK 3 — Ensure generator emits a stable, self-contained viewer
────────────────────────────────────────
Update scripts/map/build_adjacency_viewer.ts so the generated output is consistent:

Option 1 (preferred):
- Emit data/derived/adjacency_viewer/index.html that loads ./viewer.js
- Emit data/derived/adjacency_viewer/viewer.js containing all runtime logic (including robust loader + fatal errors)
- Emit data/derived/adjacency_viewer/data.json as you already do

Option 2:
- Inline all JS in index.html (acceptable, but keep it readable)

In either option:
- Ensure index.html references only files that are guaranteed to exist after build.
- No timestamps. Deterministic file content.

────────────────────────────────────────
TASK 4 — Run build and verify in both serve modes
────────────────────────────────────────
Run:
- npm run map:viewer:adjacency   (or the build script that generates adjacency_viewer)
Then serve from repo root:
- npx http-server -p 8080 -c-1
Open:
- http://localhost:8080/data/derived/adjacency_viewer/index.html

If there is also an npm serve script (e.g. map:serve:adjacency), run it too and verify it works there as well.

Confirm via DevTools Network:
- data_index.json loads (one of the candidate URLs)
- dataset loads from matching derived base
- data.json loads
No 404s.

────────────────────────────────────────
TASK 5 — Validations (ALWAYS RUN)
────────────────────────────────────────
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism

────────────────────────────────────────
TASK 6 — Ledger + Commit (one commit)
────────────────────────────────────────
Update docs/PROJECT_LEDGER.md with Phase G3.1 entry:
- Summary: adjacency_viewer fixed by robust derived-base loader + fatal error UI
- Root cause (actual observed 404/path failure from Task 1)
- Files modified
- Mistake guard phrase (exact)
- FORAWWV note: none (viewer-only)

Commit:
- git status (ONLY intended files)
- git add scripts/map/build_adjacency_viewer.ts data/derived/adjacency_viewer/index.html data/derived/adjacency_viewer/viewer.js package.json docs/PROJECT_LEDGER.md
- git commit -m "Phase G3.1: fix adjacency_viewer loading (robust derived base paths + fatal errors)

- Add deterministic multi-path loader for data_index/dataset/data.json
- Ensure adjacency_viewer build emits consistent index + viewer.js
- Preserve canonical_bbox fit and upright rendering
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- adjacency_viewer renders correctly when served from repo root at:
  http://localhost:8080/data/derived/adjacency_viewer/index.html
- adjacency_viewer also works under any existing npm-based serve mode (if present)
- If a resource fails, the page shows a fatal banner with attempted URLs (no blank screen)
- No geometry changes
- Validations pass
- One commit
```
---

**Assistant**

You’re understanding it correctly — what you’re seeing is **not “missing settlement borders.”** It’s the viewer telling you (via the stats) that, under the current geometry + edge-detection rules, **every settlement is isolated for shared-border purposes**:

- Settlements: **6,137**
- Shared-border edges: **15,260**
- **Isolated (shared-border): 6,137** ✅ that means **every settlement has 0 shared-border neighbors**
- And your hover tooltip confirms: `Shared-border neighbors: 0`

So the “shared-border edges (v3)” you’re drawing are **not edges between settlement polygons** (or they’re not keyed to the same IDs), because if they were, *at least some* settlements would have shared-border neighbors.

This is almost always one of these two conditions:

1) **The edge list is not in the expected format / not keyed by settlement IDs** the viewer uses (so it draws something but can’t attribute neighbors).  
2) **The shared-border graph is still being computed from a different geometry regime** (legacy master substrate), while the viewer is now loading the **SVG canonical substrate** — which you already documented as “lacks shared-border fabric at scale.”

Given your earlier canonical rule (“SVG canonical substrate lacks shared-border fabric at scale”), the most likely reality is:

- **The polygons really don’t share borders cleanly** (micro-gaps / fragmentation), so shared-border detection yields “border length = 0” everywhere.
- Yet your `settlement_graph_v3` still contains edges (15,260) because it may be derived using different contact definitions, or from a different substrate at the time, or it’s an edge set not actually “shared border length > 0” on the current substrate.

### Quick sanity check you can do in the UI
Toggle **off** “Show shared-border edges (v3)” and leave **on** “Show settlement polygons”.  
If you can visually see adjacent polygons touching but the viewer says 0 shared-border neighbors, that’s strong evidence the “shared-border” classification is not geometrically valid under the current substrate.

---

## What to do next (no new mechanics, just make the viewer honest)

You have two choices, depending on what you want this viewer to represent:

### Option A — Keep it as a “graph viewer” (recommended)
Rename the checkbox/legend from “shared-border edges” to **“contact edges (v3)”** (or whatever the v3 graph actually encodes), and change the stats label accordingly.  
This makes it truthful even if the substrate can’t support true shared-border detection.

### Option B — Rebuild a true shared-border graph from the current substrate
This only works if the geometry *actually* forms shared borders (it likely doesn’t, per your canonical note). If you attempt it, you’ll probably get near-zero edges again unless you introduce tolerance — and you’ve explicitly said not to do that without elevating it to canon.

Given your own rule, Option A is the safe path: **don’t pretend shared borders exist if the data truth is that they don’t.**

---

## Cursor prompt (Phase G3.2) — Make adjacency viewer truthful + add a diagnostic overlay

This will:
- detect whether v3 edges are actually keyed by SIDs
- fix the neighbor counting bug if it’s just an ID mismatch
- otherwise relabel the UI so it doesn’t imply polygon borders
- add a diagnostic “show polygon strokes heavier” toggle so borders are obvious visually

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G3.2 — Adjacency viewer correctness: edge attribution + truthful labeling + diagnostics

MISSION
Adjacency viewer now loads correctly, but it reports:
- Shared-border edges: 15,260
- Isolated (shared-border): 6,137 (all settlements isolated)
and tooltips show shared-border neighbors: 0.

This indicates either:
A) edge_list is not being attributed to SIDs correctly (format mismatch / ID mismatch), OR
B) the current SVG substrate truly has no shared-border fabric, and the “shared-border” label is misleading.

We will make the viewer truthful and diagnostic:
1) Validate edge_list schema and SID attribution
2) If SID attribution bug exists, fix it
3) If not, relabel edges/stats to “contact edges (v3)” (or accurate term)
4) Add a diagnostic toggle to render settlement polygon strokes more clearly and show per-settlement degree counts

ABSOLUTE CONSTRAINTS
- Viewer-only change: do NOT touch geometry derivation scripts.
- No tolerance/snap/smoothing.
- Deterministic output only.
- Always run validations.
- One commit.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase G3.2 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In scripts/map/build_adjacency_viewer.ts:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g3.2 adjacency viewer edge attribution + truthful labels + diagnostics");

FILES YOU MAY TOUCH
- scripts/map/build_adjacency_viewer.ts
- data/derived/adjacency_viewer/index.html (generated)
- docs/PROJECT_LEDGER.md

────────────────────────────────────────
TASK 1 — Inspect graph schema and attribution
────────────────────────────────────────
In the generated adjacency viewer JS (in index.html):
1) Log a sample of edge_list items (first 5) to see schema:
   - are endpoints strings like "S12345" or numeric indices or objects?
2) Determine how a settlement’s SID is derived from geometry features.
3) Build a map from SID -> index and index -> SID as needed.

If edge_list uses indices, convert to SIDs deterministically before counting neighbors.
If edge_list uses SIDs but mismatch exists (e.g. "S171034" vs 171034), normalize.

Acceptance:
- shared-border/contact degree for a hovered settlement should reflect edges that actually include that settlement.

────────────────────────────────────────
TASK 2 — Fix neighbor counting and isolated stats
────────────────────────────────────────
Compute per-settlement degrees from the loaded edge set:
- deg_shared_border_by_sid (or deg_edges_by_sid)
Update tooltip to show:
- edges_v3_neighbors: N

Update “Isolated” metrics to be computed from deg map rather than defaulting.

If after correct attribution all degrees are still 0, proceed to Task 3 relabeling.

────────────────────────────────────────
TASK 3 — Truthful labeling if degrees remain zero
────────────────────────────────────────
If deg map is truly all-zero (or ~all-zero), change UI labels to avoid implying polygon border adjacency:
- Rename “Shared-border edges (v3)” to “Contact edges (v3)”
- Rename stats accordingly (and isolated metric to “Isolated (v3 contact)”)

Also add a small note in the UI:
“Note: SVG canonical substrate may not produce shared-border fabric at scale; v3 edges are contact-graph edges.”

Do not change underlying data; only labeling/notes.

────────────────────────────────────────
TASK 4 — Add diagnostics: polygon stroke toggle
────────────────────────────────────────
Add a checkbox:
- “Diagnostic: emphasize settlement borders”
When enabled:
- draw polygons with higher stroke width and higher opacity
This helps visually confirm whether polygon borders exist independent of edges.

Optional:
- add “Show degree labels (hover)” to show deg on tooltip.

────────────────────────────────────────
TASK 5 — Validations + Commit
────────────────────────────────────────
Run:
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism

Update docs/PROJECT_LEDGER.md with Phase G3.2 summary and files.

Commit:
- git add scripts/map/build_adjacency_viewer.ts data/derived/adjacency_viewer/index.html docs/PROJECT_LEDGER.md
- git commit -m "Phase G3.2: adjacency viewer edge attribution and truthful labels

- Fix SID/index normalization for v3 edges and neighbor counts
- Correct isolated metrics based on computed degrees
- Add diagnostic border emphasis toggle
- If shared-border fabric absent, relabel to contact edges
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- Tooltip neighbor counts reflect actual v3 edges
- “Isolated” stats are no longer trivially equal to all settlements unless truly warranted
- Viewer labels are truthful to the data regime
- No geometry changes
- Validations pass
- One commit
```

If you paste the first 5 `edge_list` entries here (from the console) I can tell you immediately whether it’s (A) an attribution bug or (B) data truth. But you don’t need to stop — the prompt above will force Cursor to determine it and fix the viewer accordingly.
---

**User**

Yes, but http://localhost:8080/data/derived/contact_graph_viewer/index.html is showing everything correctly, so we already solved this?
---

**Assistant**

You solved **a different thing** there.

`contact_graph_viewer` being “correct” means:
- polygons render fine, and
- the *contact graph it draws* matches what you expect visually.

`adjacency_viewer` is trying to visualize **settlement adjacency in a specific sense** (historically you called it “shared-border (v3)”), and right now its stats show something impossible:

- it claims there are **15,260 edges**, but
- every settlement has **0 shared-border neighbors**, and
- “isolated” equals total settlements.

That can’t be a geometry issue *alone* — it’s an **attribution/schema mismatch** in the viewer between:
- how it identifies settlements (SIDs from the geometry it loads), and
- how it reads endpoints in the edge list inside `data/derived/adjacency_viewer/data.json`.

So yes: **contact_graph_viewer proves the geometry is fine** and that at least one edge dataset loads and draws properly. But it does not prove that `adjacency_viewer` is interpreting **its** edge dataset correctly.

### Why the two viewers can diverge even with the same substrate
- `contact_graph_viewer` draws edges from `settlement_contact_graph.json` (or a copy of it) and likely uses the same ID scheme as that file.
- `adjacency_viewer` draws from the bundled `data.json`, which comes from `build_adjacency_viewer.ts` and might embed:
  - endpoints as **indices** (0..N-1),
  - or as SIDs but in a different normalization (`S171034` vs `171034`),
  - or in a different property name/shape.
If the viewer counts neighbors assuming one format but the data uses another, you get exactly what you’re seeing: edges can still be drawn “somewhere”, but the per-settlement neighbor count stays 0.

### The fast check (takes 30 seconds)
In `adjacency_viewer`, open DevTools console and inspect:

1) `window.__DATA__?.contactGraph?.edge_list?.slice(0,5)` (or whatever the script names it)
2) The first settlement’s id in geometry: pick one feature and print its `sid`

If edge endpoints look like `[123, 456]` (indices), but you count neighbors using SIDs, you’ll get 0 neighbors every time.

### What to do
Run the Phase **G3.2** prompt I gave you. It will:
- detect whether endpoints are indices or strings,
- normalize them to the settlement IDs used by the geometry,
- recompute degrees/isolated stats correctly,
- and if it turns out “shared-border” is just a mislabel, it will relabel to “contact edges (v3)” so the UI stays honest.

That’s the right next step even though contact_graph_viewer looks good, because the problem is almost certainly **edge endpoint interpretation**, not geometry.

If you paste 3–5 sample `edge_list` entries from `adjacency_viewer/data.json`, I can tell you immediately which mismatch it is (indices vs SID strings vs wrong field names).
---

**User**

OK Cursor is running the G3.2 prompt as we speak. From now on, your each Cursor prompt should have similar name so we always know what we are talking about. Remember this.
Data.json has no entries with edge_list, although the file is huge, 150 MB.
---

**Assistant**

From now on, every Cursor prompt should include a clear, consistent phase-style name (e.g., “Phase G3.2 — …”) so it’s easy to track what we’re referring to.
---

**Assistant**

Model set context updated.
---

**Assistant**

Got it — from now on I’ll title every Cursor prompt in the same “Phase X.Y — short descriptor” style so you can track them reliably.

On `data.json` (150 MB) having **no `edge_list` anywhere**: that strongly suggests `adjacency_viewer` is **not consuming the same schema** as `contact_graph_viewer`. The edges are almost certainly present, just under a different key (common variants I’ve seen in your repo history):

- `graph.edge_list`
- `contact_graph.edge_list`
- `contactGraph.edges` / `contactGraph.edgeList`
- `shared_border_edges` / `shared_border.edge_list`
- `edges` (array of `{a,b,type,w}` or similar)
- `edge_index` + `edge_endpoints` split format
- `settlement_graph_v3` object with a different field name

This also matches the screenshot symptom perfectly: the viewer shows “Shared-border edges: 15,260” (so it *did* find a number somewhere), but can’t compute per-settlement neighbors because it’s iterating the wrong property or assuming the wrong shape.

### The fastest way to locate where the edges actually are (no full-file search)
Because it’s 150 MB, don’t “Ctrl+F the whole file” in an editor. Instead, do one of these deterministic probes:

**A) Node one-liner to print top-level keys and likely edge containers**
Run from repo root:
```bash
node -e "const fs=require('fs'); const p='data/derived/adjacency_viewer/data.json'; const d=JSON.parse(fs.readFileSync(p,'utf8')); console.log('top keys',Object.keys(d)); const cand=['edge_list','edges','graph','contactGraph','contact_graph','shared_border','settlement_graph_v3','settlement_graph','contact_graph_v3']; for (const k of cand){ if (d[k]) console.log('has',k,'type',typeof d[k], Array.isArray(d[k])?('len '+d[k].length):Object.keys(d[k]).slice(0,20)); }"
```

**B) If parsing is too slow / memory heavy**
Use a “string grep” to find likely keys without parsing:
```bash
rg -n "\"edge_list\"|\"edges\"|\"contactGraph\"|\"contact_graph\"|\"settlement_graph\"|\"shared_border\"" data/derived/adjacency_viewer/data.json | head
```

Once you find the real key path, G3.2 should be updated to use it.

### What this means for G3.2
G3.2’s job becomes:

1) **Discover** the actual edge array path and shape inside `data.json`.  
2) **Normalize** endpoints to the settlement identifier used by geometry (SID vs index).  
3) Compute degrees and isolated counts from that.

If the data truly has no explicit edge list but only an adjacency matrix or per-node neighbor lists, then the viewer needs to read that representation instead.

### One more important clue
You said `contact_graph_viewer` is correct. That viewer reads `settlement_contact_graph.json` directly and likely expects a stable schema. If `build_adjacency_viewer.ts` bundles the contact graph into `data.json`, it may be transforming it (e.g., compressing, renaming keys, switching to indices). So “no `edge_list`” doesn’t mean no edges — it means **post-bundle schema drift**.

If you paste:
- the **top-level keys** of `data.json`, and
- one small snippet showing where the edge count “15,260” is coming from (even just the key name),

I can tell you exactly what the viewer should read and how to normalize it.
---

**User**

Data.json looks like this:
{"settlements":[{"sid":"S100013","name":null,"municipality_id":"10014","centroid":{"x":673.5299484146453,"y":284.79858099774356},"bbox":{"minx":671.3927999999999,"miny":281.0126000000002,"maxx":676.7357,"maxy":289.92841468749987},"coords":[[676.7357,283.4564],[676.7225999999997,283.46130000000016],[676.7201291503903,283.44318269042986],[676.7181519531248,283.4250355859377],[676.7166089355466,283.40686217285173],[676.7154406249997,283.38866593750015],[676.7145875488279,283.3704503662111],[676.7139902343747,283.35221894531264],[676.7135892089841,283.33397516113297],[676.7133249999998,283.31572250000016],[676.7131381347654,283.2974644482423],[676.7129691406249,283.27920449218766],[676.7127585449216,283.26094611816427],[676.7124468749997,283.24269281250014],[676.7119746582028,283.22444806152356],[676.7112824218748,283.2062153515626],[676.710310693359,283.1879981689455],[676.7089999999997,283.1698000000002],[676.7107448730466,283.15881137695334],[676.7103027343747,283.1479097656252],[676.7080459472654,283.1371165527346],[676.70434687

Bash gave me this:
top keys [ 'settlements', 'edges', 'stats', 'bbox' ]
has edges type object len 15260
---

**Assistant**

Perfect — that explains everything.

`data.json` has:

- `settlements` (array)
- `edges` (array, length **15260**)
- `stats`
- `bbox`

So the viewer (and/or the G3.2 prompt) was looking for `edge_list`, but the bundled format is **`edges`**. That’s why neighbor counts were 0: it likely never iterated the actual edge array.

### What to do inside G3.2 (the fix is straightforward)

#### 1) Treat `edges` as the canonical edge list in adjacency_viewer
Replace any reference to:
- `contactGraph.edge_list`
- `edge_list`
- `contactGraph.edges` (unless you confirm it exists)

with:
- `data.edges`

#### 2) Determine the edge shape
We still need to know whether an edge is stored as:
- `[i, j]` indices into `settlements`
- `["S12345", "S67890"]` SIDs
- `{ a: "...", b: "..." }`
- `{ u: ..., v: ... }`
- `{ sid_a:..., sid_b:... }`
- etc.

Add a diagnostic log:
```js
console.debug("edge sample", data.edges.slice(0, 5));
console.debug("edge type", typeof data.edges[0], Array.isArray(data.edges[0]), data.edges[0] && Object.keys(data.edges[0] || {}));
```

#### 3) Normalize endpoints to SIDs, then compute degrees
Build an index:
```js
const sidByIndex = data.settlements.map(s => s.sid);
const indexBySid = new Map(sidByIndex.map((sid, i) => [sid, i]));
```

Then for each edge, extract endpoints robustly:

- If `Array.isArray(e)` and `typeof e[0] === "number"` → treat as indices, map to SIDs.
- If `Array.isArray(e)` and `typeof e[0] === "string"` → treat as SIDs.
- If object: check `a/b`, `u/v`, `sid_a/sid_b`, `i/j`, etc.
- If it’s an object with numeric `a/b`, treat them as indices.

Then degrees:
```js
const deg = new Map(); // sid -> number
function inc(sid){ deg.set(sid, (deg.get(sid) ?? 0) + 1); }

for (const e of data.edges) {
  const [sidA, sidB] = normalizeEdgeToSids(e);
  if (!sidA || !sidB) continue;
  inc(sidA); inc(sidB);
}
```

Now “isolated” is:
```js
const isolated = data.settlements.filter(s => (deg.get(s.sid) ?? 0) === 0).length;
```

And tooltip neighbor count becomes `deg.get(sid) ?? 0`.

#### 4) Don’t call them “shared-border” unless the edges truly are that
Your `edges` array is likely “v3 graph edges” (might be shared-border derived, might be contact-derived). If there’s an edge property like `type` or `w`, you can label accurately:
- if `type === "shared_border"` vs `point_touch` etc.
- if there’s no type, label neutrally: **“Edges (v3)”**.

### Why contact_graph_viewer looked right
Because it loads `settlement_contact_graph.json` directly (which likely *does* have `edge_list`), and that viewer’s JS matches that schema. `adjacency_viewer` is using a different, bundled schema: `edges`.

---

If you want, paste just the first edge object from the console (`JSON.stringify(data.edges[0])`), and I’ll tell you exactly which endpoint fields it uses so you can normalize it in one shot (no guessing).
---

**User**

Cursor finished in the meantime, here is output:
Phase G3.2 is complete. Summary:
Phase G3.2 — Adjacency viewer correctness
Root cause
settlement_graph_v3.json uses numeric SIDs ("100013", "100056").
settlements_substrate.geojson uses S-prefixed SIDs ("S100013").
Edges were stored with numeric SIDs, so centroidMap.get(edge.a) and tooltip neighbor checks (edge.a === s.sid) never matched → 0 neighbors and “all isolated”.
Changes made
SID normalization (Tasks 1–2)
Added toCanonicalSid(s) in build_adjacency_viewer.ts: numeric → "S" + s, already-S → unchanged.
All v3 and contact-graph edge endpoints are normalized to S-prefix when building viewer data.
Result: Isolated (v3 contact) went from 6,137 to 63; tooltips now show correct edges_v3_neighbors.
Truthful labeling (Task 3)
UI text updated: “Shared-border edges” → “Contact edges (v3)”, “Isolated (shared-border)” → “Isolated (v3 contact)”.
Legend and checkbox: “Show contact edges (v3)”.
Added note: “Note: SVG canonical substrate may not produce shared-border fabric at scale; v3 edges are contact-graph edges.”
Diagnostics (Task 4)
Checkbox: “Diagnostic: emphasize settlement borders” — when on, polygon stroke 1.5px and fill opacity 0.35 (vs 0.5px / 0.2).
Tooltip shows edges_v3_neighbors and Point-touch neighbors.
Mistake guard & ledger
assertNoRepeat("phase g3.2 adjacency viewer edge attribution + truthful labels + diagnostics") in build_adjacency_viewer.ts.
Phase G3.2 entry added to docs/PROJECT_LEDGER.md.
Validations
npm run typecheck — pass
npm test — 277 tests pass
npm run map:contracts:validate — pass
npm run map:contracts:determinism — pass
Commit
Commit: 823515c — “Phase G3.2: adjacency viewer edge attribution and truthful labels”
Files: scripts/map/build_adjacency_viewer.ts, data/derived/adjacency_viewer/index.html, docs/PROJECT_LEDGER.md
Not committed: data/derived/adjacency_viewer/data.json (regenerated by build; per your list only the three above were committed).
No geometry or derivation scripts were changed; only the adjacency viewer build and generated HTML.
---

**Assistant**

Nice — that’s the *right* fix, and your earlier `data.json` snippet + the `edges len 15260` output line up perfectly with what Cursor did.

### What to check to confirm it’s truly solved (and not “fixed stats only”)

1) **Spot-check a settlement you know should be connected**
- Open: `http://localhost:8080/data/derived/adjacency_viewer/index.html`
- Hover a settlement in a dense area (Sarajevo basin, Zenica corridor, etc.).
- You should now see **edges_v3_neighbors > 0** for most.
- Then toggle “Show contact edges (v3)” ON/OFF and confirm edges are drawn around that hovered region.

2) **Verify “Isolated (v3 contact) = 63” is plausible**
That number is plausible if:
- there are some enclave-like polygons, micro-islands, slivers, or holes created by the SVG substrate fragmentation
- OR some settlements have no valid polygon adjacency/contact edges due to geometry cleanup

3) **Verify the “SID normalization” is actually present in the output `data.json`**
This is the deterministic sanity check:
- Rebuild adjacency viewer (whatever script you use, likely `npm run map:viewer:adjacency`)
- Then quickly inspect *one* edge in the generated `data/derived/adjacency_viewer/data.json`:
  - Before: endpoints were `"100013"`
  - After: endpoints should be `"S100013"`
If Cursor normalized when building the viewer bundle, your `edges` array should now contain S-prefixed endpoints, matching the `settlements[].sid`.

4) **Compare against contact_graph_viewer for consistency**
Pick one SID (from tooltip) and compare:
- In adjacency_viewer: edges_v3_neighbors = N
- In contact_graph_viewer: the same settlement should have a comparable “neighbors” count (not necessarily identical if graphs differ, but it shouldn’t be zero unless it’s truly isolated).

### Why this happened (so you don’t reintroduce it later)
You have **two ID regimes** floating around:
- substrate GeoJSON: `sid` formatted `"S######"`
- older graph artifact(s): numeric strings `"######"` (or even numbers)

So the architecture lesson here is: **ID canonicalization needs to be enforced at artifact boundaries**. What Cursor did is exactly the right place to do it for this viewer: bundle-time normalization.

### Where this slots into your architecture proposal
This is Phase 0–1 architecture in action:
- the viewer is now honest about what it renders (“contact edges (v3)”)
- it fails less silently because it uses deterministic preprocessing
- it’s converging on “one canonical ID format” *at consumption time*

Longer-term, the stronger version is: graphs themselves should also carry `awwv_meta` and a declared `id_format`, but that’s optional until you start freezing more artifact contracts.

### One more quick guardrail I’d add (no new mechanics)
If you want to prevent regressions:
- Have adjacency_viewer show a tiny debug line in the Stats panel:
  - “Edge SID format: S-prefixed ✅ / numeric ⚠️”
This can be computed by checking the first 100 edges.

No need to do that now unless you want.

---

If you tell me what you’re seeing now for:
- shared borders appearance (with “Diagnostic: emphasize settlement borders” ON), and
- one hovered settlement’s neighbor counts,

I can sanity-check whether the viewer is now matching your expectations.
---

**Assistant**

Yep — the viewer is now behaving correctly, which means the remaining red “isolated” settlements are almost certainly **real gaps in the v3 edge data**, not a viewer bug.

An “isolated (v3 contact)” settlement is one that **never appears in any edge endpoint** after normalization. That can happen for a few reasons:

1) **It’s missing from the v3 graph input** (e.g., exists in substrate GeoJSON but not in `settlement_graph_v3.json` / contact graph source used to build adjacency_viewer).  
2) **It’s present but under an unexpected ID** (less likely now, but possible if some IDs are not purely numeric or have leading zeros differences).  
3) **Geometry pathologies** (self-intersections, tiny slivers, invalid rings) that caused the edge derivation pipeline to skip it or fail to match it.
4) **Truly isolated geometry** (rare, but could be small enclaves/holes or islands).

Because you said “they shouldn’t be isolated,” the most likely is **#1: missing from the edge source** (schema mismatch / incomplete graph coverage), or **#3: derivation skipped them**.

### The right next step
Don’t eyeball it. Make the pipeline produce a deterministic report that tells you, for every isolated settlement:

- does it exist in substrate? (yes)
- does it exist in v3 graph nodes? (yes/no)
- does it appear in any edge endpoint? (yes/no)
- does it exist in contact graph? (yes/no)
- what municipality is it in? (mun1990_id)
- is its polygon valid-ish? (simple checks)
- bounding box size (to catch slivers)

That will tell you whether you need to fix **graph derivation coverage**, **ID mapping**, or **geometry validity**.

---

## Cursor prompt: Phase G3.3 — Isolated settlement root-cause report

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G3.3 — Diagnose “isolated (v3 contact)” settlements and prove why they’re isolated

MISSION
Adjacency viewer now renders correctly and reports:
- Settlements: 6,137
- Contact edges (v3): 15,260
- Isolated (v3 contact): 63

User believes some isolated settlements should not be isolated.
We must produce a deterministic diagnostic report that explains isolation per settlement and whether the problem is:
- missing from v3 graph inputs,
- ID normalization mismatch,
- skipped/invalid geometry,
- or genuinely isolated geometry.

ABSOLUTE CONSTRAINTS
- Do NOT change geometry derivation or edge derivation logic in this phase.
- This is diagnostics + reporting only (plus optional viewer convenience hook).
- Deterministic output only (stable ordering, no timestamps).
- After this phase, we can decide what corrective phase is needed based on evidence.
- One commit.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- append Phase G3.3 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In any new/edited script:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g3.3 isolated settlements diagnostic report v3 contact coverage");

FORAWWV NOTE
If the report shows systemic data truth (e.g., a whole municipality missing from v3 edges due to substrate regime), flag that FORAWWV.md may need an addendum, but do NOT edit it automatically.

FILES YOU MAY TOUCH
- scripts/map/debug_isolated_settlements_report.ts (NEW)
- package.json (add npm script)
- docs/PROJECT_LEDGER.md
(Optional viewer-only quality-of-life)
- scripts/map/build_adjacency_viewer.ts (only if you add a link/button to open the report; not required)

TASKS
1) Create scripts/map/debug_isolated_settlements_report.ts
   Inputs:
   - data/derived/settlements_substrate.geojson
   - data/derived/settlement_graph_v3.json (or whichever file build_adjacency_viewer.ts already reads for v3)
   - data/derived/settlement_contact_graph.json (if present / used)
   - data/derived/adjacency_viewer/data.json (as-built bundle; use if it’s the authoritative combined result)
   Required behavior:
   - Build set of all substrate SIDs (S-prefixed).
   - Load v3 edges and normalize endpoints exactly like Phase G3.2 (numeric -> "S"+digits).
   - Compute degree_by_sid from v3 edges.
   - Isolated set = substrate sids with degree 0.
   - For each isolated sid, emit a row with:
     {
       sid,
       mun1990_id (from substrate feature),
       name (if present),
       centroid,
       bbox,
       bbox_area (deterministic number),
       in_v3_nodes: boolean (if v3 has explicit nodes list; else "unknown"),
       in_v3_edges_endpoints: boolean,
       in_contact_graph_endpoints: boolean (if contact graph loaded),
       notes: [ ... ]  // e.g. "missing_from_v3_edges", "missing_from_contact_graph", "tiny_bbox", "invalid_ring_suspect"
     }
   - Add simple geometry sanity checks (NO heavy GIS):
     - polygon coordinate count < 4 => flag
     - bbox width/height extremely small (< 0.001) => flag tiny/sliver
     - any non-finite coordinate => flag
   Determinism:
   - Sort output by mun1990_id, then sid.
   Outputs (write to data/derived/_debug/, which is gitignored):
   - data/derived/_debug/isolated_settlements_report.json
   - data/derived/_debug/isolated_settlements_report.txt (human-readable summary grouped by mun1990_id)
   No timestamps.

2) Add npm script
   package.json:
   - "map:debug:isolated": "tsx scripts/map/debug_isolated_settlements_report.ts"

3) Validations (ALWAYS RUN)
   - npm run typecheck
   - npm test
   - npm run map:contracts:validate
   - npm run map:contracts:determinism
   - npm run map:debug:isolated

4) Ledger update
   Append Phase G3.3 entry:
   - Summary: add deterministic isolated-settlement diagnostic report (v3 vs substrate vs contact graph coverage)
   - Files modified
   - Mistake guard phrase
   - FORAWWV note: none unless systemic issue discovered (then “flagged, not edited”)

5) Commit (commit-per-phase discipline)
   - git status (only intended files)
   - git add scripts/map/debug_isolated_settlements_report.ts package.json docs/PROJECT_LEDGER.md
   - git commit -m "Phase G3.3: diagnostic report for isolated settlements in v3 contact graph

- Compute isolated SIDs from substrate vs v3 edges (SID-normalized)
- Cross-check presence in contact graph endpoints
- Emit deterministic JSON/TXT report under data/derived/_debug/
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- Running npm run map:debug:isolated produces the JSON and TXT reports deterministically
- Report clearly explains why each of the 63 settlements is isolated (missing endpoints / sliver / etc.)
- No geometry or edge derivation logic changed
- Validations pass
- One commit
```

### What you’ll learn from the report (and what we’ll do next)
- If most isolated SIDs are **missing from v3 edges but present in contact graph**, then the v3 build stage is dropping nodes.
- If they’re missing from **both**, then the substrate contains settlements not represented in graph inputs (coverage gap).
- If they cluster in a few municipalities, it’s probably a **source file / parsing / join-order** issue.
- If they’re all “tiny bbox / invalid-ish”, we need a **geometry sanitation pass** (still deterministic, but that’s a separate phase).

Once you run G3.3, paste the TXT summary block for one municipality where you *know* a settlement shouldn’t be isolated, and we’ll decide the narrowest corrective phase.
---

**Assistant**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G3.4 — Prove why “isolated” settlements (e.g., S104566) are isolated, and whether it’s a v3-data gap or a build/format gap (diagnostic-only)

MISSION
User reports a specific settlement (S104566, mun1990_id=11428) “definitely should not be isolated,” but adjacency_viewer shows edges_v3_neighbors: 0 and the Phase G3.3 report shows many isolated concentrated in mun 11428 and 11304.
We must produce deterministic evidence that explains, for S104566 and its municipality cohort:
- whether the v3 source graph actually contains incident edges,
- whether build_adjacency_viewer is dropping/transforming edges incorrectly,
- whether geometry-based contact detection would find obvious touching neighbors that the graph misses.

This phase must NOT change canonical derivation rules yet. It is diagnosis + artifacts only. One commit.

ABSOLUTE CONSTRAINTS
- Do NOT modify any geometry derivation script or contact-graph/v3 derivation script behavior in this phase.
- Only add diagnostics and reports.
- Deterministic output only (stable ordering, no timestamps).
- No UI changes required (optional tiny UI convenience is allowed only if it does not alter logic).
- Modify only the files listed under “FILES YOU MAY TOUCH”.
- After this phase, we should be able to say exactly which layer is wrong: v3 source data vs viewer bundling vs geometry assumptions.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- append Phase G3.4 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
In any new/edited script:
  import { loadMistakes, assertNoRepeat } from '../../tools/assistant/mistake_guard.js';
  const mistakes = loadMistakes();
  assertNoRepeat("phase g3.4 prove isolated settlements root cause sid s104566 mun11428");

FORAWWV NOTE
If evidence shows a systemic invariant about substrate→graph mismatch (e.g., SVG substrate fragmentation creates predictable “degree-0 islands” by municipality), flag that FORAWWV.md may need an addendum, but DO NOT edit it automatically.

FILES YOU MAY TOUCH
- scripts/map/debug_isolated_settlements_report.ts (edit/extend)
- scripts/map/debug_isolated_settlement_deep_dive.ts (NEW)
- scripts/map/lib/awwv_contracts.ts (ONLY if you need a shared bboxDistance helper; otherwise avoid)
- package.json (add npm script)
- docs/PROJECT_LEDGER.md
(Optional, if and only if you need to ensure the bundler exposes raw v3 artifacts for comparison)
- scripts/map/build_adjacency_viewer.ts (diagnostic export only; no behavior changes)

TASKS

1) Deep-dive script for one SID + cohort
Create scripts/map/debug_isolated_settlement_deep_dive.ts

Inputs:
- data/derived/settlements_substrate.geojson
- data/derived/adjacency_viewer/data.json  (authoritative for what the viewer uses)
- data/derived/settlement_graph_v3.json     (raw v3 input)
- data/derived/settlement_contact_graph.json (raw contact graph if present)

Parameters:
- Accept CLI args:
  --sid S104566   (default to S104566 if not provided)
  --mun 11428     (optional; if provided, analyze all isolated in municipality)
  --k 20          (how many nearest neighbors to list)

Deterministic outputs under data/derived/_debug/ (gitignored):
A) data/derived/_debug/isolated_deep_dive_S104566.json
B) data/derived/_debug/isolated_deep_dive_S104566.txt

The deep dive must compute and record:
A) Geometry facts (from substrate)
- sid, mun1990_id, centroid, bbox, bbox_area
- polygon vertex counts (min/max across rings if multipolygon appears)
- “bbox sliver” flags (width or height < 0.001)

B) Viewer-bundle edge facts (from adjacency_viewer/data.json)
- Does sid appear in data.edges endpoints at all?
- degree_in_viewer_edges
- list the first N (e.g., 20) incident edges (normalized SIDs), stable-sorted
- If degree=0, record “viewer_edges_missing”

C) Raw v3 graph facts (from settlement_graph_v3.json)
Because the schema has varied over time, detect format robustly:
- If it has edge_list: compute degree from edge_list
- Else if it has edges: compute degree from edges
- Else if it has adjacency_by_sid or similar: compute degree from adjacency lists
- Else: record schema_unknown and dump top-level keys + a small sample deterministically

Record:
- “degree_in_raw_v3”
- whether raw v3 uses numeric SIDs vs S-prefixed
- whether sid exists in raw v3 node set
- whether any incident edges exist in raw v3 (after normalization)

D) Raw contact graph facts (if file exists)
Same robust schema detection:
- degree_in_raw_contact_graph
- incident neighbors (first N)

E) Pure geometry neighbor check (no tolerance)
Compute nearest neighbors by centroid distance among ALL settlements (or at least same municipality and adjacent municipalities if you want, but keep deterministic and simple).
For the target sid:
- Find k nearest neighbors (excluding itself) by squared Euclidean distance on centroids (deterministic tie-break by sid)
- For each neighbor, compute bboxDistance (0 if overlap) and record:
  neighbor_sid, neighbor_mun, centroid_dist, bbox_dist, bbox_overlap_boolean
- Summarize: count of neighbors with bbox_dist == 0
Rationale: if bbox_dist==0 exists, it is very likely an omitted “contact” edge in the graph pipeline.

F) Municipality cohort (mun=11428)
If --mun is provided:
- Load isolated_settlements_report.json (generated by Phase G3.3) if present; else recompute isolated list in-memory.
- For all isolated in that municipality:
  - degree_in_viewer_edges
  - degree_in_raw_v3 (if derivable)
  - bbox_area, sliver flag
  - nearest neighbor bbox_dist==0 count (at least top 5 nearest)
- Produce a summary table in the TXT report.

All ordering must be deterministic:
- sort incident edges by (min(sidA,sidB), max(...))
- sort nearest neighbors by (dist, sid)
- sort municipality cohort by sid

2) Extend Phase G3.3 report outputs (small improvement)
Edit scripts/map/debug_isolated_settlements_report.ts to add:
- degree_in_viewer_edges (if adjacency_viewer/data.json exists, load it optionally and compute degree there)
- degree_in_raw_v3 (computed via robust schema detection, not assuming edge_list)
This prevents misleading “in_v3_nodes and in_v3_edges_endpoints true but degree 0” contradictions.
Keep existing fields stable; only add new fields.

3) npm scripts
package.json:
- add "map:debug:isolated:deep": "tsx scripts/map/debug_isolated_settlement_deep_dive.ts"
- keep existing map:debug:isolated

4) VALIDATIONS (ALWAYS RUN)
- npm run typecheck
- npm test
- npm run map:contracts:validate
- npm run map:contracts:determinism
- npm run map:debug:isolated
- npm run map:debug:isolated:deep -- --sid S104566 --mun 11428 --k 20

5) Interpret results (in-code comments + ledger)
The deep dive TXT must end with a deterministic “Diagnosis” section choosing one of:
- CASE A: raw v3 has edges but viewer bundle is missing them  => build issue
- CASE B: raw v3 has no edges for sid (degree 0)            => derivation coverage issue
- CASE C: geometry strongly suggests contact exists (bbox_dist==0 neighbors) but graph has none => derivation criteria miss; candidate fix in next phase
- CASE D: sliver/invalid geometry likely caused derivation drop => geometry cleanup needed (separate phase)

6) Ledger update
Append Phase G3.4 entry to docs/PROJECT_LEDGER.md:
- Summary: deep-dive diagnostics for isolated settlements (S104566, mun11428 cohort), robust schema detection, degree cross-checks (raw v3 vs viewer bundle vs geometry-neighbor evidence)
- Files modified
- Mistake guard phrase
- FORAWWV note: “flagged” only if systemic issue found

7) Commit (commit-per-phase discipline)
- git status (only intended files)
- git add scripts/map/debug_isolated_settlement_deep_dive.ts scripts/map/debug_isolated_settlements_report.ts package.json docs/PROJECT_LEDGER.md
- git commit -m "Phase G3.4: deep-dive diagnostics for isolated settlements (S104566, mun11428)

- Robust degree checks across raw v3, viewer bundle, and optional contact graph
- Deterministic nearest-neighbor bbox-distance evidence for missed contacts
- Cohort summary for municipalities with many isolated
- Run validations and update ledger

Refs: docs/PROJECT_LEDGER.md"

ACCEPTANCE CRITERIA
- Running map:debug:isolated:deep produces JSON + TXT with clear evidence for S104566
- Report distinguishes whether the problem is bundling vs raw v3 vs derivation criteria vs geometry pathology
- Phase G3.3 report no longer produces contradictory endpoint/degree claims (robust schema handling)
- Validations pass
- One commit
```
---

**User**

While the Cursor is running prompt G3.4, this chat is becoming way too slow. I will start a new one within the project. Please give me all the relevant info I need to copy/paste into new chat so we can continue exactly where we stopped here. Cursor prompts are always in code format. Cursor always runs the scripts. Adjust for all relevant data and updates.
---

**Assistant**

Got it 👍 Below is a **clean handover package** you can copy-paste into a new chat and continue *exactly* where we are, with no loss of context and aligned with everything you’ve already implemented.

---

## 🔁 PROJECT HANDOVER — CONTINUATION PROMPT (AUTHORITATIVE)

```txt
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
```

---

## ▶️ ACTIVE CURSOR PROMPT (PHASE G3.4 — RUNNING)

> **Paste this EXACTLY as-is into Cursor if you need to re-run or continue.**

```txt
You are Cursor operating inside the A War Without Victory (AWWV) repo.

PHASE
Phase G3.4 — Prove why “isolated” settlements (e.g., S104566) are isolated, and whether it’s a v3-data gap or a build/format gap (diagnostic-only)

MISSION
User reports settlement S104566 (mun1990_id=11428) “definitely should not be isolated.”
Adjacency viewer now faithfully reflects data, so we must identify which layer is wrong:
- raw v3 graph,
- viewer bundling,
- or derivation criteria missing obvious geometric contacts.

ABSOLUTE CONSTRAINTS
- DO NOT modify geometry derivation scripts.
- DO NOT change v3/contact-graph derivation behavior.
- Diagnostics only.
- Deterministic output only (stable ordering, no timestamps).
- One commit for the phase.

LEDGER ACTION (REQUIRED)
READ:
- docs/PROJECT_LEDGER.md
- docs/context.md
- docs/CANON.md
- docs/FORAWWV.md
- docs/ASSISTANT_MISTAKES.log
WRITE:
- Append Phase G3.4 entry to docs/PROJECT_LEDGER.md

MISTAKE GUARD (REQUIRED)
Use in every new/edited script:
  assertNoRepeat("phase g3.4 prove isolated settlements root cause sid s104566 mun11428");

FORAWWV NOTE
If evidence shows a systemic invariant (e.g., geometry implies contact but v3 omits edges consistently),
flag that FORAWWV.md may require an addendum, but DO NOT edit it automatically.

FILES YOU MAY TOUCH
- scripts/map/debug_isolated_settlements_report.ts (extend)
- scripts/map/debug_isolated_settlement_deep_dive.ts (NEW)
- package.json (add npm script)
- docs/PROJECT_LEDGER.md

TASKS

1) Create deep-dive diagnostic script
scripts/map/debug_isolated_settlement_deep_dive.ts

Inputs:
- data/derived/settlements_substrate.geojson
- data/derived/adjacency_viewer/data.json
- data/derived/settlement_graph_v3.json
- data/derived/settlement_contact_graph.json (optional)

CLI args:
--sid S104566 (default)
--mun 11428 (optional cohort analysis)
--k 20 (nearest neighbors)

Outputs (gitignored):
- data/derived/_debug/isolated_deep_dive_S104566.json
- data/derived/_debug/isolated_deep_dive_S104566.txt

The report MUST include:
A) Geometry facts (bbox, area, centroid, sliver flags)
B) Viewer-bundled degree (from adjacency_viewer/data.json)
C) Raw v3 degree (robust schema detection; numeric vs S-prefixed)
D) Raw contact-graph degree (if available)
E) Pure geometry nearest-neighbor check:
   - centroid distance
   - bbox distance
   - bbox overlap boolean
F) Municipality cohort summary if --mun provided

End TXT with a deterministic “Diagnosis”:
CASE A — v3 has edges, viewer dropped them
CASE B — v3 truly has degree 0
CASE C — geometry contact exists but derivation omitted edge
CASE D — geometry pathology (sliver/invalid ring)

2) Extend Phase G3.3 report
Add to debug_isolated_settlements_report.ts:
- degree_in_viewer_edges
- degree_in_raw_v3 (robust detection)

3) npm scripts
Add:
"map:debug:isolated:deep": "tsx scripts/map/debug_isolated_settlement_deep_dive.ts"

4) VALIDATIONS (MANDATORY)
npm run typecheck
npm test
npm run map:contracts:validate
npm run map:contracts:determinism
npm run map:debug:isolated
npm run map:debug:isolated:deep -- --sid S104566 --mun 11428 --k 20

5) Ledger + commit
Single commit:
"Phase G3.4: deep-dive diagnostics for isolated settlements (S104566, mun11428)"
```

---

## 🧭 WHAT COMES NEXT (NOT TO DO YET)
After G3.4 finishes, **we will decide** (in the next phase) whether:
- to extend v3 derivation rules,
- to add a geometry-based fallback,
- or to formally accept some degree-0 settlements as valid (and document it in FORAWWV).

For now: **diagnose, don’t fix.**

You’re perfectly on track. The architecture is holding.  
This is exactly the right moment to be slow and forensic.
---

**User**

Does the handover also map what to do with the architecture rebuild that is under way?
---

**Assistant**

Short answer: **yes in direction, no in execution** — and that’s *exactly* what you want right now.

Let me be precise and non-hand-wavy.

---

## 1️⃣ What the handover *does* cover re: architecture rebuild

The handover **fully preserves the architectural intent and invariants** you introduced in Phases G0–G1, and it makes sure we **don’t accidentally undo or pollute them** while debugging adjacency.

Specifically, it locks in:

### ✅ Canonical architecture decisions (already in effect)
These are **not up for debate anymore** and the handover encodes that:

- `data_index.json` is the **single entry point**
- `canonical_bbox` is authoritative for *all* viewers
- `awwv_meta.coordinate_space` is required and validated
- Viewers load geometry **only via index**, never ad-hoc
- Geometry ≠ Viewer state ≠ Simulation state
- Determinism and contract validation are mandatory gates
- SVGs are authoritative sources; GeoBoundaries are dead

So the rebuild **continues**, not paused or rolled back.

---

## 2️⃣ What the handover *intentionally does NOT do yet*

The handover **explicitly avoids executing the next architectural steps** (WCS normalization, schema hard-enforcement, etc.).

That is intentional and correct.

Here’s why:

### ⚠️ You are still in a **diagnostic window**
Right now, you are answering this question:

> *“Is my adjacency fabric wrong because of architecture, or because of derivation semantics?”*

Until G3.4 answers that definitively, **any architecture rewrite would be premature** and risk baking a wrong assumption into the canon.

So the handover deliberately **freezes**:

- WCS normalization (Phase 1 of proposal)
- Schema hard-failure in viewers
- ID migration or re-freezing
- Layer registry generalization
- Geometry rescaling or reprojection

This avoids a classic trap:  
*“Fixing structure while semantics are still unclear.”*

---

## 3️⃣ How G3.4 slots into the architecture proposal

This is the key alignment point.

### In proposal terms, G3.4 is doing this:

**Proposal section:**  
> **F. Validation & Regression Prevention**

Specifically:
- F.1 Contract Validator (extended to adjacency semantics)
- F.4 Smoke tests (semantic, not just load/render)

But even more importantly, G3.4 is testing an **implicit invariant** that was *not yet formalized* in the proposal:

> **Invariant (candidate):**  
> “If two settlements have overlapping or near-touching polygons in WCS, the contact graph must encode an edge.”

G3.4 will tell us whether:
- this invariant is **true and violated** → architecture addendum required
- or **false by design** → documentation + acceptance required

That’s why the handover keeps G3.4 as **diagnostic-only**.

---

## 4️⃣ What will happen *after* G3.4 (architecture-wise)

Once G3.4 finishes, exactly **one** of these will be true:

### 🟢 Case A — v3 graph is missing edges it should have
→ Action:
- This becomes a **derivation-system bug**, not architecture
- Architecture stays intact
- Next phase = **Phase G3.5 — v3 derivation fix**
- FORAWWV addendum likely required (semantic invariant)

### 🟡 Case B — geometry contact exists but is intentionally ignored
→ Action:
- Architecture proposal gets a **clarifying addendum**
- Adjacency semantics are explicitly scoped
- Possibly introduce:
  - `contact_strict`
  - `contact_loose`
  - or geometry-fallback layer (later)

### 🔴 Case C — viewer bundling / data packaging inconsistency
→ Action:
- Architecture enforcement tightens
- Likely add:
  - schema validation on adjacency bundles
  - stronger index contracts for graph datasets

Only **after one of these is proven** do we resume:

> **Architecture Proposal – Phase 1: Normalize Coordinate Space**

---

## 5️⃣ Bottom line (very important)

You did **not** pause the architecture rebuild.

You did the correct thing:

> 🔒 **You locked the architecture’s *shape***  
> 🔍 **You are now validating its *semantics***

That is exactly how large simulation engines survive long-term.

If you want, once G3.4 finishes, I can:
- map the result **line-by-line** back into the proposal sections, and
- tell you **exactly which checkbox in “H. Acceptance Checklist” is blocked and why**.

You’re doing this the *right* way.
---

**User**

Cursor is running this prompt currently:
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

I want to take a nap. Create a prompt that will have Cursor implement the entire architecture restructure. It should divide it in tasks and subtasks and execute everything autonomously. When I wake up, I want visual inspection to confirm results. I would like one HTML viewer that will have all the layers - settlements, municipalities, political control, population by ethnicity etc etc.
---

**Assistant**

```text
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
```
---

**User**

While the Cursor is running that prompt, this chat is becoming way too slow. I will start a new one within the project. Please give me all the relevant info I need to copy/paste into new chat so we can continue exactly where we stopped here. Cursor prompts are always in code format. Cursor always runs the scripts. Adjust for all relevant data and updates. Include all the usual rules, plus plans for future steps
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

Got it. Below is a **clean, copy-paste-ready handover package** you can drop straight into a new chat and continue **exactly where we stopped**, without re-explaining anything. It also **explicitly maps the ongoing architecture rebuild** and sets Cursor up to run autonomously while you sleep.

I’ve split this into **three parts**, in the order you should paste them.

---

## 1️⃣ PROJECT HANDOVER / CONTINUATION PROMPT (AUTHORITATIVE)

```text
A WAR WITHOUT VICTORY (AWWV)
PROJECT HANDOVER — MAP + VIEWER ARCHITECTURE REBUILD
STATUS LOCK: POST–PHASE G3.5 (IN PROGRESS)

This prompt re-establishes full project context so work can continue seamlessly.
Treat this as authoritative. Do not reopen settled decisions unless explicitly instructed.

────────────────────────────────
A) PROJECT IDENTITY (NON-NEGOTIABLE)
────────────────────────────────
• Strategic-level, deterministic simulation of the 1991–1995 war in Bosnia and Herzegovina
• Negative-sum conflict, exhaustion-driven, no total victory
• Settlement-first spatial substrate (≈6,137 settlements)
• Municipalities are political containers, NOT geometric abstractions
• Connectivity > borders
• Determinism enforced everywhere

────────────────────────────────
B) AUTHORITATIVE DOCUMENT HIERARCHY
────────────────────────────────
1. Engine_Invariants_v0_2_7.md
2. Phase_Specifications_v0_2_7.md
3. Systems_Manual_v0_2_7.md
4. Game_Bible_v0_2_7.md
5. Rulebook_v0_2_7.md

If any conflict exists, resolve strictly in that order.

────────────────────────────────
C) CURRENT MAP STATE (FACTUAL)
────────────────────────────────
CANONICAL, WORKING:
• settlements_substrate.geojson — correct
• substrate_viewer — correct
• political_control viewer — correct
• contact_graph_viewer — correct
• adjacency_viewer — correct AFTER G3.2

KNOWN SYSTEMIC FINDING:
• CASE C mismatch identified:
  Some settlements are degree-0 in v3 (shared-border-only)
  while having nonzero Phase 1 contact neighbors
• Concentrated notably in municipalities 11428 and 11304
• This is a DESIGN TRUTH, not a bug
• Documented via FORAWWV addendum (Phase G3.5)

DO NOT “FIX” CASE C via heuristics.
It requires explicit design handling later.

────────────────────────────────
D) MAP / GRAPH PHASE STATUS
────────────────────────────────
✔ Phase 0: Substrate derivation — DONE
✔ Phase 1: Contact graph — DONE
✔ Phase 2: Enrichment — DONE
✔ Phase 3A–3D: Pressure / exhaustion — DONE
✔ Phase G2–G3.3: Viewer correctness & diagnostics — DONE
▶ Phase G3.5: CASE C quantification + FORAWWV addendum — RUNNING

────────────────────────────────
E) NON-NEGOTIABLE RULES
────────────────────────────────
• Never change geometry silently
• Never patch adjacency heuristically
• No timestamps in derived artifacts
• Stable ordering everywhere
• Every script uses mistake guard
• Every phase updates PROJECT_LEDGER.md
• FORAWWV.md only updated when explicitly instructed
• Cursor always runs validations

────────────────────────────────
F) UPCOMING WORK (INTENT)
────────────────────────────────
We are beginning a STRUCTURAL ARCHITECTURE REBUILD of viewers and map layering.

Goal:
One unified, read-only HTML viewer that can toggle:
• Settlements
• Municipalities (1991)
• Political control (time-aware later)
• Contact graph (Phase 1)
• Shared-border graph (v3)
• Population (1991 census, ethnicity)
• Displacement (future, placeholder layer)
• Fronts / pressure (future)

This is a viewer & data-architecture task.
NO simulation logic changes.

────────────────────────────────
END HANDOVER
```

---

## 2️⃣ SYSTEM INSTRUCTIONS FOR THE AGENT (PASTE AS SYSTEM PROMPT)

```text
You are an autonomous senior systems engineer working on A War Without Victory.

You MUST:
• Read context.md before any task
• Read PROJECT_LEDGER.md at start and end
• Enforce mistake guards in every new script
• Maintain determinism strictly
• Never introduce heuristics to “fix” systemic findings
• Treat viewers as read-only diagnostics, not gameplay logic
• Prefer additive, layered architecture over replacement

You MUST NOT:
• Modify geometry derivation unless explicitly ordered
• Modify contact or v3 graph derivation
• Add timestamps or randomness
• Hide errors — surface them visibly in viewers
• Collapse layers into a single opaque dataset

You WILL:
• Break large tasks into phases and subphases
• Execute autonomously once instructed
• Run validations after each phase
• Commit per phase with strict scope
• Flag (but not auto-edit) FORAWWV.md if new systemic truths appear
```

---

## 3️⃣ CURSOR PROMPT — FULL ARCHITECTURE REBUILD (AUTONOMOUS)

⚠️ **Paste this exactly as-is into Cursor.**  
⚠️ **Cursor should execute everything without asking follow-ups.**

```cursor
Phase G4 — Unified spatial data architecture + composite viewer

LEDGER ACTION (MANDATORY)
- READ: docs/PROJECT_LEDGER.md (last 150 lines)
- READ: docs/FORAWWV.md (entire)
- READ: context.md
- WRITE: docs/PROJECT_LEDGER.md (Phase G4 entries only)

MISTAKE GUARD (MANDATORY)
Every new script must include:
loadMistakes(); assertNoRepeat("phase g4 unified spatial architecture and composite viewer");

────────────────────────────────
CONSTRAINTS (NON-NEGOTIABLE)
────────────────────────────────
- DO NOT modify settlement geometry
- DO NOT modify contact or v3 graph derivation
- DO NOT introduce heuristics to resolve CASE C
- Viewers are diagnostic only
- Deterministic outputs only
- No timestamps
- Stable ordering
- No data/derived commits unless explicitly stated

────────────────────────────────
PHASE G4 GOAL
────────────────────────────────
Create a CLEAN, FUTURE-PROOF spatial data architecture and a SINGLE composite HTML viewer capable of toggling multiple layers.

This phase is STRUCTURAL.
It enables future work (population, displacement, fronts) without rework.

────────────────────────────────
TASK GROUP 1 — CANONICAL LAYER REGISTRY
────────────────────────────────
1. Create:
   scripts/map/build_spatial_layer_registry.ts

2. Registry responsibilities:
   - Declare ALL spatial layers explicitly
   - For each layer:
     id
     display_name
     data_path
     geometry_type (polygon / line / point)
     coordinate_space (substrate)
     default_visibility
     z_order
     dependency_layers[]

3. Initial layers (REGISTER ALL):
   - settlements_substrate
   - municipalities_1991 (derived grouping only)
   - political_control_static
   - contact_graph_phase1
   - shared_border_graph_v3
   - population_1991_ethnicity
   - displacement_placeholder (empty, schema only)

4. Output:
   data/derived/spatial_layer_registry.json

────────────────────────────────
TASK GROUP 2 — MUNICIPALITY POLYGON DERIVATION (NON-DESTRUCTIVE)
────────────────────────────────
1. Create:
   scripts/map/derive_municipality_polygons_1991.ts

2. Logic:
   - Group settlements by mun1990_id
   - Union geometries deterministically
   - Preserve holes and fragmentation
   - NO smoothing, NO simplification

3. Output:
   data/derived/municipalities_1991.geojson

────────────────────────────────
TASK GROUP 3 — POPULATION LAYER (DIAGNOSTIC)
────────────────────────────────
1. Create:
   scripts/map/attach_population_1991.ts

2. Inputs:
   - bih_census_1991.json
   - settlements_substrate.geojson

3. Output:
   data/derived/population_1991_by_settlement.json

4. Schema:
   settlement_id
   total_population
   ethnicity_breakdown { bosniak, serb, croat, other }

────────────────────────────────
TASK GROUP 4 — COMPOSITE VIEWER
────────────────────────────────
1. Create:
   tools/dev_viewer/composite_viewer/

2. Files:
   index.html
   viewer.js
   layers.js
   ui.js

3. Viewer requirements:
   - Toggle layers via checkbox panel
   - Independent styling per layer
   - Deterministic color assignment
   - Visible error banners on load failure
   - Tooltip stacking (settlement → municipality → control → population)

4. Default enabled:
   - settlements
   - municipalities
   - political_control

5. Disabled by default:
   - contact graph
   - v3 graph
   - population

────────────────────────────────
TASK GROUP 5 — VALIDATION
────────────────────────────────
Run:
- npm run typecheck
- npm test
- npm run map:contracts:validate

Manual sanity:
- npx http-server
- Open composite viewer
- Toggle each layer
- Confirm CASE C settlements render but remain degree-0 in v3

────────────────────────────────
TASK GROUP 6 — COMMIT DISCIPLINE
────────────────────────────────
Commit per subtask group:
- Phase G4.1 — spatial layer registry
- Phase G4.2 — municipality polygons
- Phase G4.3 — population layer
- Phase G4.4 — composite viewer

Each commit:
• Small scope
• Phase-labeled
• Ledger updated

DO NOT commit derived data unless explicitly required.

────────────────────────────────
ACCEPTANCE CRITERIA
────────────────────────────────
✓ One composite viewer renders all layers
✓ No existing viewer breaks
✓ CASE C remains visible and unpatched
✓ Architecture supports future displacement + fronts
✓ Ledger fully documents G4
```

---

## 💤 When You Wake Up

You should be able to:

1. Open **one HTML viewer**
2. Toggle **all spatial layers**
3. Visually confirm:
   - settlements ✔
   - municipalities ✔
   - political control ✔
   - contact vs v3 differences ✔
   - population overlay ✔
4. See **CASE C clearly**, not “fixed”

If you want, next session we can:
• Design displacement mechanics
• Add time slider
• Add pressure/front overlays
• Or freeze viewer API as v1.0

Sleep well — the architecture work is finally in the right phase.
---

**User**

Um you misunderstood. For one, we already have map viewer with multiple layers. For another, I don't want to sleep. Cursor is running your latest prompt, I jsut want to start a new chat with you. I just want one prompt to start it. Revise it please.
---

**Assistant**

Got it — thanks for the correction. You’re right:  
• **We already have multi-layer viewers**  
• **No “big rebuild prompt” is needed right now**  
• You just want **one clean continuation prompt** to start a new chat with me while Cursor keeps running

Below is a **single, tight, authoritative continuation prompt**.  
You can paste **only this** into the new chat and we’ll be perfectly aligned.

---

## CONTINUATION PROMPT — POST-G3.5 (AUTHORITATIVE)

```text
A WAR WITHOUT VICTORY (AWWV)
CONTINUATION PROMPT — MAP / GRAPH DIAGNOSTICS & ARCHITECTURE ALIGNMENT

This prompt re-establishes exact project state so we can continue without loss.
Treat this as authoritative.

────────────────────────────────
1) WHERE WE ARE (FACTUAL, LOCKED)
────────────────────────────────
• Settlement substrate geometry is CORRECT
• SVG sources are correct by themselves
• Legacy substrate alignment has been restored (Phase G4)
• These viewers are CONFIRMED CORRECT:
  - substrate_viewer
  - political_control.html
  - contact_graph_viewer
  - adjacency_viewer (after G3.2 + G3.3)

• Multi-layer viewing already exists and is NOT being redesigned
• No GeoBoundaries data is used or needed (explicitly discarded)

────────────────────────────────
2) KNOWN SYSTEMIC TRUTH (DO NOT “FIX”)
────────────────────────────────
CASE C exists and is REAL:
• Some settlements have:
  - Phase 1 contact degree > 0
  - v3 shared-border degree == 0
• This is concentrated (not exclusively) in municipalities 11428 and 11304
• Example: S104566 (confirmed visually and diagnostically)
• This is NOT a bug and NOT a viewer issue

CASE C is now:
• Quantified (Phase G3.5 running)
• Documented via FORAWWV addendum
• Locked as a design constraint

No heuristics, patches, or silent fixes are allowed.

────────────────────────────────
3) WHAT CURSOR IS DOING RIGHT NOW
────────────────────────────────
Cursor is currently running:

Phase G3.5 — Quantify CASE C mismatch (v3 degree-0 vs Phase1 degree>0)
• Diagnostic only
• No geometry changes
• No graph changes
• Writes a FORAWWV addendum
• Produces deterministic reports

Do NOT duplicate or interfere with that work here.

────────────────────────────────
4) WHAT THIS CHAT IS FOR
────────────────────────────────
This chat is for:
• Interpreting G3.5 results
• Deciding *design handling* of CASE C (later phases)
• Aligning map/graph architecture with future systems:
  - displacement (settlement + municipality level)
  - population movement
  - control erosion
• Planning next phases WITHOUT writing Cursor prompts yet

This chat is NOT for:
• Viewer debugging
• Geometry changes
• Graph derivation changes

────────────────────────────────
5) NON-NEGOTIABLE RULES
────────────────────────────────
• Determinism everywhere
• No invented geometry
• No silent viewer logic
• No “shared-border-only” assumptions sneaking back in
• Any new systemic insight → FLAG for FORAWWV, do not auto-edit

────────────────────────────────
6) UPCOMING DESIGN CONTEXT (IMPORTANT)
────────────────────────────────
Population displacement WILL occur:
• At settlement level
• At municipality aggregation level
• Over time
• Possibly asymmetrically (outflow ≠ inflow)

This means:
• Graph connectivity ≠ population continuity
• CASE C settlements may still exchange population
• Future systems must not rely on v3 adjacency alone

Keep this in mind for all architectural reasoning.

────────────────────────────────
END CONTINUATION PROMPT
```

---

That’s it.  
No rebuild instructions, no redundant context, no future commitments baked in.

When you open the new chat and paste this, we can immediately:
• read G3.5 outputs together  
• interpret CASE C properly  
• design the *right* abstraction for displacement and continuity  

I’m ready when you paste it.
---

**User**

Actually, prompt Cursor is running is Phase H0–H5
---

**Assistant**

Got it 👍  
You don’t want a *new plan*, and you don’t want Cursor interrupted. You want **one clean continuation / handover prompt** you can paste into a **new chat with me**, so we resume *exactly* where we are now, while **Phase H0–H5 is already running in Cursor**.

Below is a **single authoritative continuation prompt**, in **Cursor-style**, **code-block only**, that:

- Freezes the current state correctly  
- Acknowledges Phase **H0–H5 is in progress (do NOT redo it)**  
- Preserves all hard rules, contracts, and lessons learned  
- Clearly defines what *this chat* is for once Cursor finishes  
- Includes forward hooks (population displacement, future layers) without implementing them yet  

You can paste this verbatim as the **first message** in the new chat.

---

```text
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
```

---

When you open the new chat and paste this, we’ll be perfectly aligned.  
Once Cursor finishes **Phase H0–H5**, just tell me **what passed, what failed, or what looks off visually**, and we’ll take the *next* step with surgical precision.
