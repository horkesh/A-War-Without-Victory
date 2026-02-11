# AWWV Project Ledger Reorganization Plan

**Date:** 2026-02-09  
**Status:** Planning Phase  
**Goal:** Transform chronological ledger into knowledge-focused knowledge base

## Current State Analysis

The PROJECT_LEDGER.md has grown to 6,572 lines containing rich technical knowledge but organized purely chronologically. This makes knowledge discovery difficult despite containing valuable patterns, decisions, and domain expertise.

### Knowledge Distribution Analysis
- **Architecture Decisions:** ~1,200 lines scattered across dates
- **Implementation Patterns:** ~800 lines mixed with other entries  
- **Canon Evolution:** ~600 lines interspersed chronologically
- **Process Coordination:** ~400 lines distributed across timeline
- **Technical Failures/Learning:** ~300 lines buried in chronology

## Proposed Thematic Structure

### 1. Project Identity & Governance Hub
**Purpose:** Central authority for project fundamentals
**Structure:**
```
## Project Identity & Governance

### Non-negotiables (Living Document)
- Path A Architecture principles
- Deterministic build requirements  
- Geometry contract terms
- Canvas rendering rules
- [Append-only, updated as principles evolve]

### Phase Tracking & Milestones
- Current phase status with date
- Historical phase completions
- Milestone achievement log
- Future phase planning

### Decision Registry (Chronological within theme)
| Date | Decision | Rationale | Consequences | Theme |
|------|----------|-----------|--------------|-------|
| 2026-01-24 | Adopt Path A | Previous 1:1 matching failed | Clean separation achieved | Architecture |
```

### 2. Architecture & Systems Knowledge Base
**Purpose:** Accumulate architectural knowledge and patterns
**Structure:**
```
## Architecture & Systems Knowledge

### Path A Contract Evolution
- **Current State:** [Latest contract terms]
- **Historical Evolution:**
  - 2026-01-24: Initial adoption
  - 2026-01-25: Crosswalk behavior specified
  - 2026-01-26: Fallback modes defined
- **Rationale Archive:** Why each element was added

### Geometry System Patterns
- **Working Patterns:**
  - Municipality outline derivation from drzava.js
  - Convex hull fallback with inflation measurement
  - Settlement point placement algorithms
- **Failed Approaches:**
  - Union operations on micro-polygons (unreliable)
  - Chaikin smoothing (created visual gaps)
- **Validation Patterns:**
  - Render-valid vs GIS-valid hierarchy
  - Deterministic convex hull salvage
```

### 3. Implementation Knowledge Repository  
**Purpose:** Systematic pattern accumulation
**Structure:**
```
## Implementation Knowledge Base

### Proven Patterns (By Category)
#### Map & Visualization
- War Planning Map scene management (#warroom-scene vs #map-scene)
- Formation marker system (NATO frames, faction fills)
- Tactical map canonical data loading

#### Simulation & State
- Deterministic bot decision flows
- Formation spawn lifecycle (800 → 2500 → second brigade)
- Supply pressure resolution with production facilities

#### Data Pipeline
- Settlement ID uniqueness enforcement
- Municipality crosswalk validation
- GeoJSON output standardization

### Failed Experiments & Lessons
#### Geometry Processing
- Voronoi boolean operations with normalization
- Martinez polygon clipping import issues
- JSTS package root import failures

#### Bot Behavior
- Math.random() in bot logic (nondeterministic)
- Unseeded RNG usage patterns

### Domain Expertise Accumulation
#### Historical Context
- OOB primary source hierarchy
- Brigade naming conventions
- Municipality boundary evolution

#### Technical Constraints
- OneDrive file lock patterns
- PowerShell command chaining
- Canvas polygon isolation requirements
```

### 4. Canon & Specifications Evolution
**Purpose:** Track specification development and compliance
**Structure:**
```
## Canon & Specifications Evolution

### Phase Specifications (Current)
- **Phase 0:** [Current state with date]
- **Phase I:** [Current state with date]  
- **Phase II:** [Current state with date]

### Specification Updates Log
| Date | Specification | Change | Rationale |
|------|---------------|---------|-----------|
| 2026-02-09 | Phase I §4.8 | Added RBiH-HRHB relationship | Alliance redesign requirement |

### Compliance Tracking
- **Engine Invariants:** Current compliance status
- **Systems Manual:** Latest updates
- **Determinism Audit:** Regular compliance checks
```

### 5. Process & Team Knowledge
**Purpose:** Accumulate coordination and process knowledge
**Structure:**
```
## Process & Team Coordination

### Paradox Team Coordination
#### Meeting Knowledge Accumulation
- **State of Game Meetings:** Key decisions and outcomes
- **Orchestrator Reports:** Strategic direction evolution
- **Handover Documentation:** Knowledge transfer patterns

### External Expert Coordination  
#### Handover Documentation
- External expert handover scope (map-only GUI)
- Knowledge transfer requirements
- Deliverable specifications

### Strategic Planning
#### Roadmap Evolution
- MVP declaration rationales
- Phase 7 backlog development
- Early docs implementation planning
```

### 6. Technical Decision Chain
**Purpose:** Cross-reference related decisions across themes
**Structure:**
```
## Technical Decision Chains

### Decision Trees by Topic
#### Geometry Processing Chain
Path A adoption → Union reliability issues → Drzava.js sourcing → Convex hull fallback

#### Bot Evolution Chain  
Random bot behavior → Determinism requirements → Seeded RNG → Strategy profiles → Time adaptation

#### Map System Chain
Settlement display issues → Tactical map canonical data → Formation positioning → Viewer standardization

### Decision Consequence Tracking
- **Immediate impacts**
- **Long-term effects**  
- **Related decision dependencies**
```

## Implementation Strategy

### Phase 1: Knowledge Extraction (1-2 days)
1. **Thematic Tagging:** Tag existing entries with knowledge themes
2. **Cross-reference Mapping:** Identify related decisions across time
3. **Pattern Identification:** Extract recurring patterns and anti-patterns

### Phase 2: Structure Creation (1 day)
1. **Create new thematic sections** in parallel with existing ledger
2. **Migrate tagged knowledge** into thematic structure
3. **Preserve original chronological order** within each theme

### Phase 3: Cross-reference Integration (1 day)
1. **Link related decisions** across themes
2. **Create decision trees** showing evolution paths  
3. **Add consequence tracking** for major decisions

### Phase 4: Validation & Transition (1 day)
1. **Knowledge audit:** Ensure no information loss
2. **Navigation testing:** Verify discoverability improvements
3. **Team review:** Get feedback on new structure
4. **Gradual transition:** Maintain parallel systems briefly

## Maintenance Model

### New Entry Workflow
1. **Primary entry:** Add to chronological ledger (existing practice)
2. **Knowledge extraction:** Tag and categorize new knowledge
3. **Thematic integration:** Update relevant knowledge base sections
4. **Cross-reference updates:** Link to related decisions/patterns

### Regular Maintenance
- **Monthly knowledge audit:** Ensure thematic sections stay current
- **Pattern consolidation:** Merge related patterns as they emerge
- **Decision chain updates:** Trace new consequences of past decisions

## Success Metrics

### Knowledge Discovery
- **Time to find specific knowledge:** <30 seconds for major topics
- **Pattern recognition:** Easy identification of working vs failed approaches
- **Decision context:** Full rationale and consequences readily available

### Knowledge Accumulation  
- **Pattern capture rate:** All significant patterns documented
- **Learning integration:** New knowledge systematically incorporated
- **Knowledge reuse:** Reduced repetition of failed approaches

### Team Effectiveness
- **Onboarding speed:** New team members can understand project evolution
- **Decision quality:** Access to historical rationale improves new decisions
- **Knowledge retention:** Critical knowledge preserved across team changes

## Risk Mitigation

### Information Preservation
- **Backup strategy:** Preserve original chronological ledger
- **Audit trail:** Maintain links to original entries
- **Validation process:** Verify no knowledge loss during migration

### Adoption Resistance
- **Gradual transition:** Parallel operation during adoption
- **Team involvement:** Include team in structure design
- **Training support:** Document new navigation patterns

### Maintenance Burden
- **Automated extraction:** Tools to simplify knowledge categorization
- **Process integration:** Embed in existing workflows
- **Regular review:** Periodic assessment of maintenance effort

## Next Steps

1. **Team review:** Present plan to Paradox team for feedback
2. **Pilot implementation:** Test with subset of knowledge themes
3. **Tool development:** Create extraction and categorization tools
4. **Migration execution:** Implement full reorganization
5. **Process integration:** Establish ongoing maintenance procedures