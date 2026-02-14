# context.md - Agent Context for A War Without Victory

## Project Identity

**A War Without Victory (AWWV)** is a strategic-level historical simulation of the 1992-1995 Bosnian War. This is a deterministic, negative-sum war game focused on exhaustion, political collapse, and constrained agency rather than conquest.

**Current Phase:** Post-MVP execution (Phase 6 complete); Phase II battle-resolution pipeline and scenario diagnostics are live; current focus is Phase 7 backlog closure and validation hardening.

## Authoritative Documentation Hierarchy

When conflicts arise between documents, this is the resolution order. See **`docs/10_canon/CANON.md`** for the canonical list and paths.

1. **Engine Invariants v0.5.0** - Defines what MUST be true (correctness constraints)
2. **Phase Specifications v0.5.0** - Defines HOW frozen systems work (when they exist)
3. **Systems Manual v0.5.0** - Defines complete system behavior (implementation spec)
4. **Rulebook v0.5.0** - Defines player-facing experience
5. **Game Bible v0.5.0** - Defines design philosophy and constraints
6. **context.md** - Defines process canon (workflow, ledger, preferences check)

### Document Purposes

| Document | Audience | Purpose | Status |
|----------|----------|---------|--------|
| **Rulebook** | Players, new designers | Teach how to play | v0.5.0 |
| **Engine Invariants** | Developers, QA | Assert correctness constraints | v0.5.0 |
| **Game Bible** | Designers | Establish design principles | v0.5.0 |
| **Systems Manual** | Developers | Complete mechanical specification | v0.5.0 |
| **Phase Specifications** | Developers | Detailed frozen phase specs | v0.5.0 |
| **Phase II Specification** | Developers | Mid-war phase (fronts, supply, exhaustion) | v0.5.0 |

**Current Location:** Canon docs in `docs/10_canon/`. Engineering (code canon, pipelines, determinism) in `docs/20_engineering/`.

**Implementation references:** Brigade Operations: [BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md](../40_reports/BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md) — canon has been updated to reflect it (Phase II, Systems Manual, Engine Invariants, Phase I). Recruitment system: [recruitment_system_implementation_report.md](../40_reports/recruitment_system_implementation_report.md) — three-resource brigade activation at Phase I entry; canon updated in Systems Manual §13, Phase I implementation-note, MILITIA_BRIGADE_FORMATION_DESIGN §10. Battle resolution (Phase II): [battle_resolution_engine_report_2026_02_12.md](../40_reports/battle_resolution_engine_report_2026_02_12.md) — multi-factor combat, terrain, casualty ledger, snap events; canon updated in Phase II §5, §12 and Systems Manual §7.4. Scenario handoff decisions (no-flip semantics, 0-flip interpretation): [ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md](../40_reports/ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md); Phase I implementation-note for military-action-only added 2026-02-13. Bot AI (Phase II): [BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md](../40_reports/implemented/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md) — pipeline ordering (formation lifecycle before brigade ops), pending posture for same-pass attack orders, formation grace-period auto-activation, faction strategic objectives and attack scoring; canon updated in Phase II §5, §12 and Systems Manual §5, §6.5. AI consolidation and breakthrough: [AI_STRATEGY_SPECIFICATION.md](../20_engineering/AI_STRATEGY_SPECIFICATION.md) §Consolidation and rear cleanup — Phase I consolidation bonus and control-flip ordering, Phase II consolidation posture (soft vs real front), exception data (strongholds/holdouts/fast-cleanup muns), casualty-tracked cleanup; Systems Manual §6.1, §6.5; Phase II Spec §12.

### Canon v0.5 implementation-notes policy

Implementation-notes in canon (e.g. Phase I §4.3, Systems Manual) that are explicitly "non-normative unless promoted" **remain as implementation-notes in v0.5**. Promotion to normative is deferred to a future v0.6 if desired. This policy applies to coercion pressure, capability-weighted flip, formation-aware flip, OOB at Phase I start, RBiH–HRHB war earliest week, and military-action-only (disable_phase_i_control_flip) scenarios.

## Mandatory Workflow Guardrails

### 0. Code Canon Entry Point - ALWAYS READ

**Read before any new phase or entrypoint change:**
- `docs/20_engineering/CODE_CANON.md`
- `docs/20_engineering/REPO_MAP.md`
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`

**Rationale:** Prevents canon drift, entrypoint divergence, and silent nondeterminism.

### 1. Project Ledger - ALWAYS UPDATE

**Ledger structure (two-part, process canon):**

| Document | Location | Purpose |
|----------|----------|---------|
| **Changelog** | `docs/PROJECT_LEDGER.md` | Single authoritative append-only chronological record. All work that affects behavior, outputs, or scenarios MUST be appended here. |
| **Thematic knowledge base** | `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Decisions, patterns, and rationale by topic (Identity & Governance, Architecture, Implementation, Canon, Process, Decision Chains). Use for discovery; do not duplicate full changelog. |

**CRITICAL RULE:** Every work session MUST update the Project Ledger (changelog) before and after work. New entries are **appended at the end** of the changelog in `docs/PROJECT_LEDGER.md`.

**When an entry carries reusable knowledge** (e.g. a pattern, a decision with rationale, a failed approach or lesson): add or update the relevant section in `docs/PROJECT_LEDGER_KNOWLEDGE.md` and link to the ledger date. See `docs/PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md` §6 (Ongoing maintenance).

**Required Format (changelog entry):**
```markdown
**[YYYY-MM-DD] Task Name**

- **Summary:** One-line description
- **Change:** What was changed and why
- **Failure mode prevented:** One line (e.g., "prevents silent nondeterminism")
- **Files modified:** List of files
- **Mistake guard:** Key phrase used
- **FORAWWV note:** Required if design insights revealed
```

**When to update:**
- Start of session: Read current state (changelog and, if needed, thematic knowledge base)
- During work: Append entries to the changelog for each logical unit of work
- End of session: Confirm all changes documented; optionally update thematic knowledge base for new patterns/decisions

### 2. Napkin - SESSION START

**Location:** `.agent/napkin.md`

**CRITICAL RULE:** At session start, read `.agent/napkin.md` before doing anything else. It tracks corrections, user preferences, and patterns that work or don't. Update it continuously as you work.

### 3. Git Updates - ALWAYS FOLLOW

**Before any commit:**
1. Check git status: `git status`
2. Verify only intended files staged
3. Run relevant validation: `npm run typecheck` or `npm test`
4. Check for untracked sensitive files
5. Update Project Ledger with changes

**Commit Message Format:**
```
Brief description (imperative mood)

- Change 1
- Change 2
- Change 3

Refs: docs/PROJECT_LEDGER.md entry [date]
```

**Protected Paths (never commit):**
- `data/derived/_debug/` - Debug outputs
- `data/derived/settlements_substrate.geojson` - Large derived file (regenerated)
- `docs/cleanup/cleanup_audit.*` - Audit outputs (regenerated)
- `node_modules/` - Dependencies
- `*.log` - Log files

**Always track:**
- Source code changes (`src/`, `scripts/`, `tools/`)
- Canonical documentation (`docs/**/*.md`)
- Configuration (`package.json`, `tsconfig.json`)
- Project metadata (`docs/PROJECT_LEDGER.md`, `.agent/napkin.md`)

### 4. Determinism - ALWAYS ENFORCE

**CRITICAL RULES:**
- No `Date.now()` or timestamps in derived artifacts
- No randomness in simulation logic
- Stable ordering for all iterations affecting output
- Canonical IDs only (no auto-generated IDs with timestamps)
- Serialization must be reproducible

**Canonical enforcement gate (default):**
- `npm run canon:check` (runs static scan; runs baseline regression if manifest exists)

**When processing data:**
```typescript
// ✅ GOOD: Deterministic ordering
const items = [...collection].sort((a, b) => 
  a.id.localeCompare(b.id)
);

// ❌ BAD: Non-deterministic iteration
for (const item of collection) { ... }

// ✅ GOOD: No timestamps in output
const output = { data: processedData };

// ❌ BAD: Timestamp in output
const output = { data: processedData, generated_at: Date.now() };
```

### 5. FORAWWV.md - WHEN TO UPDATE

**Location:** `docs/10_canon/FORAWWV.md`

**Purpose:** Records validated systemic truths discovered during implementation.

**When to flag for addendum:**
- Discovery of data characteristics affecting design (e.g., coordinate regimes)
- Validation of assumptions (e.g., settlement adjacency definitions)
- Detection of mismatches between design intent and data reality

**NEVER edit automatically** - Flag with note:
```
**docs/10_canon/FORAWWV.md may require an addendum** about [insight].
Do NOT edit FORAWWV automatically.
```

### 6. Process QA — Who Validates Process

**Principle:** *Process QA changes everything.* A dedicated QA agent validates that **other** agents followed this process (context, ledger, preferences check, commit discipline). That single checkpoint virtually eliminates micromanagement: others do the work; Process QA verifies they did it by the book.

**Designated validator:** The **Process QA** role (`.cursor/skills/quality-assurance-process` — Paradox roster: "Process QA"). Process QA does not do the work for others; it checks that the roles who did the work followed the mandatory workflow above.

**When to invoke Process QA:** After significant handoffs, after Orchestrator or Product Manager execution, or before merge. All Paradox roles are subject to Process QA validation when they produce work.

**See also:** `docs/20_engineering/AGENT_WORKFLOW.md` (Process QA section), `.cursor/AGENT_TEAM_ROSTER.md` (Process QA in Meta).

## Core Design Principles (Non-Negotiable)

### 1. Determinism
- All simulation logic is deterministic (no randomness)
- All derived artifacts are reproducible
- No timestamps in outputs
- Stable ordering everywhere

### 2. Negative-Sum Conflict
- Violence always produces costs
- Exhaustion is irreversible
- No purely military solutions
- Political collapse as dangerous as military defeat

### 3. Spatial Substrate

**Political Control (Pre-Front)**
- Settlements have political controllers independent of military presence
- Initialized deterministically before fronts exist
- Stable by default (doesn't drift without defined mechanisms)
- Change only via: sustained pressure, internal collapse, or negotiation

**Areas of Responsibility (Front-Active Only)**
- AoRs apply ONLY to front-active settlements
- Rear Political Control Zones exist without AoR assignment
- Control does not change due to absence of AoR
- Brigades hold spatial responsibility, not corps/OGs

### 4. Pressure → Exhaustion → Collapse Chain

**Phase 3A: Pressure Eligibility and Diffusion**
- Pressure propagates across eligible settlement contacts
- Diffusion is conservative (preserves total pressure)
- Deterministic weights from Phase 2 contact metrics
- Does NOT cause exhaustion directly (substrate only)

**Phase 3B: Pressure → Exhaustion Coupling**
- Sustained pressure converts to irreversible exhaustion
- Edge-based accounting (not node-based)
- Persistence gating (must persist N turns)
- State coherence gating (requires supporting degradation)

**Phase 3C: Exhaustion → Collapse Gating**
- Exhaustion enables collapse eligibility (doesn't trigger it)
- Multi-domain gating (authority, command, spatial)
- Threshold + persistence + state coherence required
- Eligibility ≠ collapse (further resolution needed)

### 5. No Unitless Control
- Military formations required for control
- AoR assignment doesn't create control
- Political control exists independently
- Control contested by formations, not generated by them

## Project Structure

```
AWWV/
├── src/                          # Simulation engine (TypeScript)
│   ├── sim/                      # Core simulation logic
│   │   ├── pressure/             # Phase 3A/B pressure systems
│   │   ├── collapse/             # Phase 3C/D collapse systems
│   │   └── turn_pipeline.ts     # Turn execution order
│   ├── state/                    # Game state definitions
│   ├── cli/                      # CLI tools and harnesses
│   └── tests/                    # Test suites
├── scripts/                      # Build/processing scripts
│   ├── map/                      # Map data processing
│   └── repo/                     # Repository maintenance
├── tools/                        # Development tools
│   ├── assistant/                # Mistake guard, ledger
│   ├── dev_runner/               # Dev server (GameState exposure)
│   ├── dev_viewer/               # HTML viewer (read-only)
│   └── docs/                     # Document generation scripts
├── data/
│   ├── source/                   # Authoritative source data (READ-ONLY)
│   │   ├── bih_master.geojson    # Settlement geometries
│   │   ├── bih_census_1991.json  # Census data
│   │   └── settlements/          # SVG municipality files
│   └── derived/                  # Generated artifacts
│       ├── settlements_substrate.geojson  # Canonical substrate
│       ├── settlement_contact_graph.json  # Phase 1 adjacency
│       ├── settlement_contact_graph_enriched.json  # Phase 2 metrics
│       └── _debug/               # Debug outputs (not tracked)
├── docs/                         # Canonical documentation
│   ├── A_War_Without_Victory_Rulebook_v0_2_7.docx
│   ├── A_War_Without_Victory_Engine_Invariants_v0_2_7.docx
│   ├── A_War_Without_Victory_Game_Bible_v0_2_5.docx (→ v0.2.7)
│   ├── A_War_Without_Victory_Systems_And_Mechanics_Manual_v0_2_5.docx (→ v0.2.7)
│   ├── PROJECT_LEDGER.md         # Authoritative project log
│   └── .agent/napkin.md         # Corrections, preferences, patterns (read at session start)
│   └── FORAWWV.md                # Validated design insights
└── package.json                  # NPM scripts and dependencies
```

## Key NPM Scripts

### Map Building
```bash
npm run map:derive:substrate      # Build canonical settlement substrate
npm run map:merge:adm3-1990       # Regenerate canonical 1990 municipality polygons (data/source/boundaries/bih_adm3_1990.geojson)
npm run map:derive:mun1990:boundaries  # Build municipality 1990 boundary overlay (derived MultiLineString for viewers; canonical polygons = bih_adm3_1990.geojson)
npm run map:derive:contact:phase1 # Build Phase 1 contact graph
npm run map:derive:continuity:g3_6  # Build continuity graph
npm run map:contact:enrich2       # Build Phase 2 enriched graph
npm run map:viewer:substrate:index # Build substrate viewer
npm run map:viewer:contact:phase1  # Build contact graph viewer
npm run map:build:ethnicity       # Build ethnicity attribute dataset
npm run map:viewer:map:build      # Build unified multi-layer map viewer
npm run map:viewer:map:all        # Full build chain for unified viewer
npm run map:smoke:map-viewer      # Smoke test unified map viewer
```

### A1 Tactical Base Map (STABLE — basis for game)
Canonical reference: [docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md](../20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md)
```bash
npm run map:a1:derive             # Build A1_BASE_MAP.geojson (borders, MSRs, roads, hydro, settlements)
npm run map:a1:snapshot           # Re-categorize layers (logic only; viewer is primary)
npm run map:a1:verify             # Verify coordinate transform
# View: npx http-server -p 8080 → http://localhost:8080/data/derived/A1_viewer.html
```

### Viewing Maps
To view the unified multi-layer map viewer:
```bash
# From repository root:
npx http-server -p 8080 -c-1

# Then open in browser:
# http://localhost:8080/data/derived/map_viewer/index.html
```

The unified viewer provides:
- Base layer: settlement polygons
- Overlay layers (togglable): municipality 1990 boundaries, political control, ethnicity majority
- Filters: unknown control only, SID substring highlight
- Contract-first loading with fatal error banner on failures

### Simulation
```bash
npm run phase3:abc_audit          # Run Phase 3A/B/C audit harness
npm run dev:runner                # Start dev runner (port 3000)
```

### Repository Maintenance
```bash
npm run repo:cleanup:audit        # Audit for orphan files
npm run typecheck                 # Type check all TypeScript
npm test                          # Run test suite
```

## Common Workflows

### 1. Starting a New Task

```bash
# 1. Read current state
cat docs/PROJECT_LEDGER.md | tail -50

# 2. Read napkin (corrections + preferences + patterns)
# (see .agent/napkin.md)

# 3. Create your script

# 4. Work on task

# 5. Update ledger
echo "**[$(date +%Y-%m-%d)] Your Task**
- Summary: What you did
- Files modified: list
" >> docs/PROJECT_LEDGER.md
```

### 2. Map Data Processing

```bash
# Check preferences first
# Read .agent/napkin.md at session start

# Run derivation
npm run map:derive:substrate

# Verify determinism (run twice, check hash)
sha256sum data/derived/settlements_substrate.geojson

# Update ledger with results
```

### 3. Document Updates

```bash
# For document changes, always:
# 1. Read current docs/PROJECT_LEDGER.md
# 2. Make changes
# 3. Generate if needed
# 4. Update ledger
# 5. Commit with proper message

git add docs/Your_Document.docx docs/PROJECT_LEDGER.md
git commit -m "Update document: brief description

- Change 1
- Change 2

Refs: PROJECT_LEDGER.md [date]"
```

### 4. Creating New Phases/Features

```bash
# 1. Check if phase exists in specs
ls docs/specs/sim/

# 2. If implementing frozen phase, read spec first
cat docs/specs/sim/phase3a_pressure_eligibility.md

# 3. Check preferences; create script
# 4. Add to turn pipeline with feature flag (default OFF)
# 5. Create audit/validation harness
# 6. Run validation
# 7. Update docs
# 8. Update ledger
```

## Critical File Locations

### Must Read Before Work
- `docs/PROJECT_LEDGER.md` - Current project state
- `.agent/napkin.md` - Corrections, preferences, patterns (read at session start)
- `docs/10_canon/FORAWWV.md` - Validated design insights
- `docs/ENGINE_FREEZE_v0_2_6.md` - Engine freeze contract

### Must Update After Work
- `docs/PROJECT_LEDGER.md` - Always
- `.agent/napkin.md` - Update when you learn something worth recording

### Reference During Work
- `docs/A_War_Without_Victory_Rulebook_v0_2_7.docx` - Player-facing rules
- `docs/A_War_Without_Victory_Engine_Invariants_v0_2_7.docx` - Correctness constraints
- `docs/specs/sim/phase3*_*.md` - Phase specifications (if implementing frozen phases)

## Known Issues and Constraints

### Map Data
- **Settlement polygons**: Independently digitized, use tolerance-based matching (not exact vertex alignment)
- **Coordinate regime**: SVG coordinate space (not geographic CRS)
- **Adjacency definition**: Shared border (positive overlap length) + point-touch + distance contact (D0=0.5)
- **Municipality borders**: Derived from settlement fabric via edge cancellation

### Phase 3 Implementation Status
- ✅ Phase 3A: Pressure eligibility and diffusion (frozen, implemented)
- ✅ Phase 3B: Pressure → exhaustion coupling (frozen, implemented)
- ✅ Phase 3C: Exhaustion → collapse gating (frozen, implemented)
- ✅ Phase 3D: Collapse resolution (implemented, capacity modifiers)
- ⏸️ Phase 4+: Not yet specified

### Dev Tools
- **Dev runner**: Exposes raw GameState via HTTP (port 3000)
- **Dev viewer**: Read-only HTML viewer, no game logic
- **Canonical faction IDs**: RBiH, RS, HRHB only (no aliases)
- **AoR seeding**: Dev-only initialization for viewer rendering

## Validation Commands

Before any commit, run appropriate validation:

```bash
# TypeScript compilation
npm run typecheck

# Simulation validation
npm run phase3:abc_audit

# Map determinism check
npm run map:derive:substrate
sha256sum data/derived/settlements_substrate.geojson
# (run again, verify same hash)

# Document generation (if modified tools/docs/)
npm run docs:validate:phase3a  # etc.
```

## Anti-Patterns (DO NOT DO)

### ❌ Don't Skip Napkin
At session start, read `.agent/napkin.md` and apply its corrections and patterns. Update it as you work.

### ❌ Don't Break Determinism
```typescript
// BAD: Timestamp in output
const output = { data, timestamp: Date.now() };

// BAD: Non-deterministic iteration
for (const [key, value] of Object.entries(map)) { ... }

// GOOD: No timestamp
const output = { data };

// GOOD: Stable ordering
const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
for (const [key, value] of sorted) { ... }
```

### ❌ Don't Forget Project Ledger
```typescript
// BAD: Work without ledger update
// ... make changes ...
// ... commit ...

// GOOD: Update ledger
// 1. Read ledger before work
// 2. Make changes
// 3. Update ledger with entry
// 4. Commit with ledger update
```

### ❌ Don't Invent Geometry
```typescript
// BAD: Create new geometry
const repaired = fixPolygon(brokenPolygon);

// GOOD: Validate and report
if (!isValid(polygon)) {
  console.warn(`Invalid polygon: ${sid}`);
  recordInAudit(sid, "invalid_geometry");
}
```

### ❌ Don't Edit FORAWWV.md Automatically
```typescript
// BAD: Modify FORAWWV.md
fs.appendFileSync('docs/10_canon/FORAWWV.md', newInsight);

// GOOD: Flag for manual review
console.log('**docs/10_canon/FORAWWV.md may require an addendum** about [insight].');
console.log('Do NOT edit FORAWWV automatically.');
```

## Quick Reference Card

**Every work session:**
1. ✅ Read `docs/PROJECT_LEDGER.md` (last 50 lines)
2. ✅ Read `.agent/napkin.md` at session start
4. ✅ Maintain determinism (no timestamps, stable ordering)
5. ✅ Update `docs/PROJECT_LEDGER.md` after work
6. ✅ Check git status before commit
7. ✅ Run validation before commit
8. ✅ Commit with proper message + ledger reference

**Canonical fact hierarchy:**
1. Engine Invariants (what MUST be true)
2. Phase Specifications (how frozen phases work)
3. Systems Manual (complete mechanics)
4. Game Bible (design philosophy)
5. Rulebook (player experience)

**When in doubt:**
- Read napkin at session start
- Read relevant canonical docs
- Validate determinism
- Update ledger
- Flag FORAWWV if design insight discovered

## Document Reconciliation Status (2026-01-29)

**Current Task:** Reconciling all documentation to v0.2.7

**Status:**
- ✅ Rulebook v0.2.7 (needs formatting)
- ✅ Engine Invariants v0.2.7 (needs formatting)
- 🔄 Game Bible v0.2.5 → v0.2.7 (in progress)
- 🔄 Systems Manual v0.2.5 → v0.2.7 (in progress)
- 🔄 Phase Specifications v0.2.7 (creating new document)

**Changes Being Applied:**
1. Remove appendix-style sections from all docs
2. Add proper chapter/section numbering
3. Integrate v0.2.7 political control content
4. Extract Phase 3A/B/C specs to separate document
5. Update all cross-references
6. Ensure terminology consistency

**See:** `docs/document_reconciliation_plan.md` for full details.

## Contact and Escalation

**Primary documentation**: All canonical docs in `docs/` directory
**Project log**: `docs/PROJECT_LEDGER.md` (append-only changelog, authoritative)
**Thematic knowledge**: `docs/PROJECT_LEDGER_KNOWLEDGE.md` (decisions, patterns, rationale by topic)
**Napkin**: `.agent/napkin.md` (corrections, preferences, patterns — read at session start)
**Design insights**: `docs/10_canon/FORAWWV.md` (validated truths only)

**If uncertain:**
1. Check napkin for similar situations
2. Check project ledger for recent context
3. Read relevant canonical documents
4. When in doubt, validate and report rather than guess
5. Flag FORAWWV if design assumption seems violated

---

**Last Updated:** 2026-01-29
**Document Version:** 1.0
**Project Phase:** Engine implementation + document reconciliation
