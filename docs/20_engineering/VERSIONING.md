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

### 0.4.x — Content Alpha
- Historical scenarios beyond April 1992 (1993 start, 1994 start)
- Event system (historical events, decisions, news)
- Diplomatic layer (international pressure, negotiations, Dayton-track)
- Economy/industry (beyond supply reserves)
- Full endgame and war termination

### 0.5.x — Feature Complete Beta
- ALL game systems implemented and integrated
- UI/UX complete (all panels, all modes, all tooltips)
- Sound design and music
- Tutorial/onboarding system
- Encyclopedia/Codex
- No placeholder art or missing UI

### 0.6.x — Content Complete Beta
- All scenarios authored and tested
- All historical events in place
- Balance pass complete (all factions, all starts)
- Campaign mode structured
- Achievements/statistics tracking

### 0.7.x — Polish Beta
- Performance optimization pass
- Accessibility pass (colorblind, screen reader, rebindable keys)
- Localization infrastructure + first language
- Platform-specific fixes (Windows, Mac, Linux)
- Memory/leak audits

### 0.8.x — Release Candidate
- External playtesting feedback incorporated
- Final balance tuning
- No known crash bugs
- No known save-breaking bugs
- Determinism verified across platforms
- All tests green, CI pipeline solid

### 0.9.x — Gold Candidate
- Final QA sweep
- Store page, marketing materials
- Platform certification (if applicable)
- Installer/packaging finalized
- Last-minute hotfixes only

### 1.0.0 — Gold / Public Release
Ship it.

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
| Events/decisions | ✓ Functional (19 events, pressure system, 14 condition types, 56 tests) |
| Strategic dimensions | ✓ Functional (6 dimensions, event-driven, UI display) |
| Scenarios (40w/52w/56w) | ✓ Complete |
| AI Commander infrastructure | ✓ Functional (14 modules, multi-model routing) |
| Peace phase | ○ Partial (framework exists, not playable) |
| Dayton negotiation | ○ Partial (UI + engine exist, dimension merge pending) |
| Full turn cycle | ○ Partial |
| Save/load | ○ Partial (headless OK, desktop partial) |
| Player orders UX | ○ Partial (HQ actions wired, event decisions pending IPC) |
| Victory conditions | ○ Stub |
| Diplomacy layer | ○ Partial (patron pressure, alliance, IVP exist) |
| Tutorial | ✗ Not started |
| Sound/music | ✗ Not started |
| Localization | ✗ Not started (v0.8+ scope: B/C/S + English) |

**Current version: 0.5.4** — Feature Complete Beta. 1317 tests, 111 suites. Emergent event system (v0.6.0 merge in progress). Army HQ multi-tab command center. Presidential Toolbar. 93.1% calibration accuracy.

---

## Version Bump Protocol

1. Decide which milestone the work completes
2. Update `package.json` version
3. Create git tag: `git tag -a v0.X.0 -m "Milestone: description"`
4. Update `docs/PROJECT_LEDGER.md` with version note
5. Push tag: `git push origin v0.X.0`

Patch bumps (0.X.1, 0.X.2) are for significant fixes within a milestone — not every commit.
