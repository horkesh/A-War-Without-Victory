# AWWV Versioning System

## Format

```
MAJOR.MINOR.PATCH[-tag]
```

- **MAJOR** — Game era (0 = development, 1 = release/gold)
- **MINOR** — Milestone within the era
- **PATCH** — Individual builds within a milestone
- **tag** — Optional pre-release qualifier (e.g., `-alpha`, `-beta`, `-rc1`)

## Version 1.0.0 = Gold

**1.0.0 is the shipping product.** A fully stable, feature-complete AAA-quality war strategy game with:
- Complete 1992–1995 campaign (all phases, all factions playable)
- Tutorial system, scenario missions, historical scenarios
- Full UI/UX polish (menus, settings, keybindings, accessibility)
- Multiplayer (if scoped)
- Localization
- Performance-optimized, no known crash bugs
- Platform packaging (installers, Steam integration)

Everything before 1.0.0 is development. Everything after is live product.

---

## Pre-1.0 Development Milestones

### 0.1.x — Proof of Concept ✓ (COMPLETED)
Core simulation loop exists. Turn pipeline runs. Factions exist. Map renders.

### 0.2.x — Core Engine ✓ (COMPLETED 2026-03-15)
- War phase combat resolution
- Bot AI (3-tier: army/corps/brigade)
- Corps sector system
- Operations system (preparation, execution, AAR)
- Named officers with succession
- Supply reserves
- OOB with 247 brigades
- Headless scenario runner
- Calibration pipeline (40w/52w runs, area-weighted comparison)
- 627 tests passing

### 0.3.x — Playable Alpha ✓ (COMPLETED 2026-03-15)
- Peace phase fully playable (pre-war diplomacy, referendum)
- War phase fully playable (player orders, operations, officer management)
- Complete turn cycle: peace → war → endgame
- Save/load reliable
- Basic victory/defeat conditions functional
- All three factions selectable and playable
- Desktop app stable (no crashes on normal play)

### 0.4.x — Content Alpha ✓ (COMPLETED 2026-03-18)
- AI Commander infrastructure (14 modules, multi-model routing)
- Operation preparation system (5-phase state machine)
- Officer succession (player-choice for player faction)
- Equipment pipeline (scavenging, capture, barracks events)
- Commander override layer (Phase A + B)
- Corps-level operations replacing per-sector
- HRHB-RBiH war transition (alliance breakdown, mobilization, 6 events)
- Settlement timeline (12 event types, 5 engine tracking features)
- 1100+ tests

### 0.5.x — Feature Complete Beta ✓ (COMPLETED 2026-03-22)
- Emergent event system (pressure-based triggers, 14 condition types, recurrence)
- Strategic dimensions (6 per faction, hybrid base_value + event_modifier)
- 19 events migrated (1992), 3 ICTY-sourced foundational decisions
- Presidential Toolbar (army crest center, floating above toolbar)
- Army HQ multi-tab command center (Briefing/Summary/Records/Personnel)
- Chief of Staff briefing (paper missive, personality-driven)
- Event decision IPC wired (player can respond)
- Pressure indicators, consequence auto-dismiss
- Deck.gl settlement labels, formation counters
- Displacement adapter, Posavina Corridor restructure
- 93.1% area-weighted calibration (n1026), 1410 tests, 116 suites

### 0.6.x — Political Wargame (ACTIVE)
Transforms AWWV from military simulation into political wargame. Master roadmap: `docs/plans/2026-03-22-v06x-master-roadmap.md`

- v0.6.1: Calibration framework (automated regression, baseline freeze) ✓ COMPLETED 2026-03-23
- v0.6.2: 1993-1994 events, Game Chronicle, AI Commander + Events integration, HQ deep drill-down
- v0.6.3: 1995 endgame events, Dayton dimension merge, Chronicle Wrapped, Staff Map
- v0.6.4: Historical essays (100 × 500 words, Sonnet-generated)

### 0.7.x — Dynamic Codex
Plan: `docs/plans/2026-03-23-event-flag-wiring-plan.md`, `2026-03-23-essay-template-engine-plan.md`, `2026-03-23-canon-audit-checklist.md`

The Codex transforms from static essays into a living historical document that morphs with player decisions.

- v0.7.0: Event flag wiring (~25 orphan flags → downstream consumers), FIXED→CONDITIONAL conversion (Srebrenica, 2nd Markale)
- v0.7.1: Essay template engine (dynamic_sections, divergence notes, ghost entries), Codex UI
- v0.7.2: Canon audit (remove September 1991 start, peace phase references from all docs)
- v0.7.3: Warroom React migration (absorbs old v0.7.0 scope)

### 0.8.x — Command Chain
Plans: TBD (write after v0.7 ships)

The player commands through a hierarchy of AI personalities that can be delegated to or overridden.

- v0.8.0: Political leader bot for non-player factions (event responses, alliance, diplomacy, war crimes policy)
- v0.8.1: Order interpretation system (officer personality filters commands — creative interpretation, delay, refusal)
- v0.8.2: Autonomy depth + Claude API at political level

### 0.9.x — Consequences + Polish
Plans: TBD (write after v0.8 ships)

Ahistorical choices produce realistic consequences. Ship preparation.

- v0.9.0: Consequence system (divergence events — no cleansing → partisans, alliance holds → no Washington Agreement chain)
- v0.9.1: Dynamic essay content (~30 Tier 3 dynamic sections + ~15 Tier 4 ahistorical templates)
- v0.9.2: External playtesting + balance (absorbs old v0.8.0-v0.8.1)
- v0.9.3: Performance + accessibility (absorbs old v0.7.0-v0.7.1)
- v0.9.4: Platform packaging + store (absorbs old v0.8.2, v0.9.1)

### 1.0.0 — Gold / Public Release
Plan: `docs/plans/2026-03-16-v1.0.0-gold.md` (needs revision for new scope)

Full campaign from April 1992. Dynamic Codex. Command hierarchy. Consequence system. Tutorial. Sound. Ship it.

NOT in v1.0: Localization (v1.1), historical scenarios (v1.2), AI API at corps level (v2.0).

"Another such victory and we are undone."

---

## Post-1.0 Versioning

### Patches: 1.0.x
Bugfixes and hotfixes. No new features. No balance changes.
- 1.0.1 — Day-one patch
- 1.0.2 — Critical bugfix
- etc.

### Feature Updates: 1.x.0
New content, balance changes, quality-of-life improvements, system expansions.
- 1.1.0 — First content patch (new scenario, balance pass)
- 1.2.0 — New system (e.g., naval operations, air support)
- etc.

Each 1.x.0 can have its own hotfix patches (1.1.1, 1.1.2, etc.)

### Named Updates (Paradox-style)
Major updates get codenames for communication:
- 1.1.0 "Operation Corridor" — Posavina expansion
- 1.2.0 "Autumn Leaves" — 1993–1994 content
- etc.

### Major Overhauls: 2.0.0
Reserved for fundamental engine/design changes that break save compatibility or represent a new generation of the game. Unlikely until well post-launch.

---

## Version Mapping to Git

- **Tags**: Every milestone bump gets a git tag: `v0.2.0`, `v0.3.0-alpha`, `v1.0.0`
- **package.json**: `version` field updated at each milestone
- **Patch increments**: Not every commit bumps the version — only meaningful milestones
- **Calibration runs** (n-numbers): Internal tracking continues independently. n-numbers are development session IDs, not version numbers. They don't appear in the version string.
- **Canon versions** (v0.6, v0.7): Document versions are independent of game version. Canon tracks documentation state, not software state.

---

## Current Status Assessment

| System | Status |
|--------|--------|
| Core simulation | ✓ Complete |
| War phase combat | ✓ Complete |
| Bot AI (3-tier) | ✓ Complete |
| Corps sectors | ✓ Complete |
| Operations + preparation | ✓ Complete |
| Named officers + succession | ✓ Complete |
| Supply reserves | ✓ Complete |
| Equipment pipeline | ✓ Complete |
| OOB (247 brigades) | ✓ Complete |
| Scenario runner | ✓ Complete |
| Calibration pipeline | ✓ Complete (93.1% area-weighted, 6/6 benchmarks) |
| Desktop app (Electron) | ✓ Functional |
| Tactical map (React + MapLibre + Deck.gl) | ✓ Functional |
| Warroom (vanilla TS + canvas) | ✓ Functional (v0.7+ React migration planned) |
| Army HQ (4-tab command center) | ✓ Functional (Briefing/Summary/Records/Personnel) |
| Events/decisions | ✓ Functional (94 events, pressure system, 14 condition types, 96-essay Codex certified) |
| Strategic dimensions | ✓ Functional (6 dimensions, Dayton merge complete, UI composite bar) |
| Scenarios (40w/52w/56w) | ✓ Complete |
| AI Commander infrastructure | ✓ Functional (14 modules, multi-model routing) |
| Peace phase | ✗ CUT — game starts April 1992, pre-war events are Codex backstory |
| Dayton negotiation | ✓ Functional (UI + engine, dimension merge complete, composite bar) |
| Full turn cycle | ○ Partial |
| Save/load | ○ Partial (headless OK, desktop partial) |
| Player orders UX | ○ Partial (HQ actions wired, event decisions IPC live) |
| Victory conditions | ○ Stub |
| Diplomacy layer | ○ Partial (patron pressure, alliance, IVP exist) |
| Tutorial | ✗ Not started |
| Sound/music | ✗ Not started |
| Localization | ✗ Not started (v0.8+ scope: B/C/S + English) |

**Current version: 0.6.1** — Political Wargame. 1410 tests, 116 suites. 92.0% area-weighted (honest baseline, n1029). 96-essay Codex (all 5-round QA certified + deep historian audit). 94 events across 1992-1995. Event dependency graph mapped. Dynamic Codex design established. Campaign starts April 1992 (Sep 1991 start CUT).

---

## Version Bump Protocol

1. Decide which milestone the work completes
2. Update `package.json` version
3. Create git tag: `git tag -a v0.X.0 -m "Milestone: description"`
4. Update `docs/PROJECT_LEDGER.md` with version note
5. Push tag: `git push origin v0.X.0`

Patch bumps (0.X.1, 0.X.2) are for significant fixes within a milestone — not every commit.
