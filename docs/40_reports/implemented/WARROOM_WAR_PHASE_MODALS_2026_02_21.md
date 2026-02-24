# Warroom War-Phase Modals Implementation

**Date:** 2026-02-21
**Status:** Complete (11 batches + refactor pass)
**Design:** `docs/plans/2026-02-18-warroom-war-phase-modals-design.md`
**Plan:** `.claude/plans/toasty-sleeping-seahorse.md`

---

## Overview

Wired all 7 warroom desk objects + declaration events to real war-phase GameState data through a shared extraction layer with three-tier fog of war. Phase 0 content remains completely untouched.

- **7 new files**, **9 modified files**, all under `src/ui/warroom/`
- **No simulation files modified** — all warroom code is read-only over GameState
- **Determinism preserved** — sorted iteration via `strictCompare`, no `Math.random()`, no timestamps

---

## Architecture

### Three-Tier Fog of War (`data/fog_of_war.ts`)

| Tier | Visibility | Example |
|------|-----------|---------|
| 1 | Own faction — exact numbers | Personnel count, cohesion, authority |
| 2 | Contact-revealed — partial | Contacted enemy formation strength category |
| 3 | Hidden — never shown | Enemy exhaustion, uncontacted formations |

### Shared Data Extraction (`data/war_data_extractor.ts`)

Single entry point: `extractWarData(gameState, playerFaction) → WarDataSnapshot`

Sub-snapshots: OwnForces, Casualties, Territory, Displacement, Exhaustion, Supply, Authority, CorpsOperations, FactionDiplomacy, ContactedFormation, FrontEdge, BrigadeMovement.

Fog enforcement at extraction boundary — Tier 3 data never enters the snapshot.

### Delta-Based Event System (`data/turn_event_generator.ts` + `data/warroom_state.ts`)

- `capturePreviousTurnSnapshot(state)` before turn advance → module-level singleton
- `generateTurnEvents(current, previous, playerFaction)` after advance
- 11 event types: control_flip, battle_casualties, displacement, civilian_casualties, formation_created, alliance_change, sustainability_collapse, exhaustion_milestone, ceasefire_started, washington_signed, encirclement
- Consumed by: newspaper, ticker, declaration modal

---

## Desk Objects

### 1. Flag (FactionOverviewPanel)
- **Before:** Fake data (`personnel = settlements * 500`, `totalDisplaced = 0`), authority double-multiplied by 100
- **After:** Real formation personnel sum, casualty ledger KIA/WIA/MIA, supply status counts, 4-quadrant layout (Territory, Military, Casualties, Authority & Supply), formation listing with personnel/posture/kind, data-driven strategic warnings

### 2. Magazine (MagazineModal)
- **Before:** Phase 0 only
- **After:** Phase gate; 6-section strategic assessment: Force Strength, Casualties This Month, Territorial Status, Population & Displacement, Exhaustion & Supply, Enemy Assessment (Tier 2). Faction-specific titles (BOSNIAN DEFENCE REVIEW / SERBIAN STRATEGIC DIGEST / CROATIAN DEFENCE MONTHLY)

### 3. Reports (ReportsModal)
- **Before:** Phase 0 municipality org-pen only
- **After:** Phase gate; 6-section monospace operational intelligence brief: Front Status (top 5 pressured edges), Formation Readiness (5 weakest brigades), Enemy Contact (Tier 2), Displacement Alerts, Sustainability Warnings, Corps Operations. CONFIDENTIAL classification, faction-specific FROM/TO headers

### 4. Telephone (DiplomacyModal) — NEW
- **Before:** "Line Dead" placeholder
- **After:** Faction-specific diplomacy:
  - **RS "Belgrade Channel":** Patron status + commitment trend, negotiation momentum, "No allied channels active"
  - **RBiH "Alliance & International":** Alliance status (exact), 6-condition ceasefire tracker (C1–C6), 6-condition Washington tracker (W1–W6), arms embargo, IVP patron
  - **HRHB "Zagreb Line":** Patron status with constraintSeverity, alliance (patron drag warning), reversed-fog ceasefire/Washington trackers, Washington bonus preview

### 5. Newspaper (NewspaperModal)
- **Before:** Phase 0 headlines only
- **After:** War communique using `pickBestWarHeadline()` from TurnEvents. Priority: multi-flip > ceasefire/washington > alliance war > battle casualties > displacement > exhaustion > sustainability. Faction-framed fog (own losses downplayed, enemy losses inflated). Faction mastheads: OSLOBODENJE, GLAS SRPSKI, HRVATSKI VOJNIK

### 6. Radio/Ticker (NewsTicker)
- **Before:** Scripted Phase 0 events only
- **After:** Dynamic war events (max 5 fog-filtered per turn) interleaved with scripted historical events. ~180 new scripted events covering May 1992–December 1995: UN resolutions, UNPROFOR, Vance-Owen, safe areas, Washington Agreement, Srebrenica, Operation Storm, Deliberate Force, Dayton

### 7. Calendar (Turn Advance Dialog)
- **Before:** Phase 0 investment count only
- **After:** "THIS WEEK" preview section: pending operations (packing/transit/arriving), WIA returning, active corps ops, critical warnings (encircled, collapsed supply, exhaustion, exposed front)

### Declaration Events (DeclarationEventModal)
- **Before:** Phase 0 declarations only (RS, HRHB, referendum, war begins)
- **After:** 4 new war milestone events: rbih_hrhb_war_begins, ceasefire_declared, washington_agreement, exhaustion_critical. `findWarMilestoneEvent()` detects threshold crossings via PreviousTurnSnapshot diff

---

## Refactor Pass

Post-implementation cleanup removed:
- Dead exports: `isOwnFaction`, `classifyFormationTier` (fog_of_war.ts)
- Dead field: `avgReadiness` (war_data_extractor.ts)
- Dead variables: `totalNewDisplaced`, `worstMun`, `worstDelta` (turn_event_generator.ts)
- Dead function: `clearPreviousSnapshot` (warroom_state.ts)
- Dead function + constant: `enemyLabel`, `FACTION_ENEMY_LABEL` (war_headline_templates.ts)
- Dead event display: `formation_encircled` (DeclarationEventModal.ts)
- Unused imports: `exhaustionLabel`, `trendArrow`, `strengthCategoryLabel` (ReportsModal.ts)
- Redundant null checks: `!= null && !== null` → `!= null` (war_data_extractor.ts)
- Unnecessary type assertion: `(seg as { friction?: number })` → `seg?.friction` (war_data_extractor.ts)
- Extracted: `checkWarMilestone()` helper replacing 3 duplicate blocks (ClickableRegionManager.ts)

---

## File Inventory

### New Files (7)
| File | LOC | Purpose |
|------|-----|---------|
| `data/fog_of_war.ts` | ~35 | FogTier type, faction field classification, strength categories |
| `data/war_data_extractor.ts` | ~680 | extractWarData → WarDataSnapshot (12 sub-snapshots) |
| `data/warroom_state.ts` | ~130 | PreviousTurnSnapshot singleton + capturePreviousTurnSnapshot |
| `data/turn_event_generator.ts` | ~420 | generateTurnEvents (11 detectors, delta-based) |
| `components/DiplomacyModal.ts` | ~440 | Faction-specific diplomacy (RS/RBiH/HRHB) |
| `content/war_headline_templates.ts` | ~330 | pickBestWarHeadline, fog-framed headlines |
| `content/ticker_war_events.ts` | ~185 | generateTickerWarEvents (max 5, fog-filtered) |

### Modified Files (9)
| File | Changes |
|------|---------|
| `components/FactionOverviewPanel.ts` | War-phase 4-quadrant layout, real data, authority fix |
| `components/MagazineModal.ts` | Phase gate, 6-section war assessment |
| `components/ReportsModal.ts` | Phase gate, 6-section intelligence brief |
| `components/NewspaperModal.ts` | War communique, TurnEvent-driven headlines |
| `components/NewsTicker.ts` | Dynamic war events interleaved with scripted |
| `components/DeclarationEventModal.ts` | 4 war milestone events, findWarMilestoneEvent |
| `components/warroom_utils.ts` | exhaustionLabel, trendArrow, strengthCategoryLabel |
| `ClickableRegionManager.ts` | DiplomacyModal wiring, snapshot capture, milestone detection, THIS WEEK preview |
| `content/ticker_events.ts` | ~180 historical events (turns 32–207), expanded category union |

---

## Verification

- `npx tsc --noEmit`: zero errors
- `npx vitest run`: 143 tests, 12 suites, all pass
- Manual verification: load mid-war save, click each desk object, verify real data
- Phase 0 regression: load Phase 0 save, verify unchanged content

---

## Deferred

- **StaffMapCrop.ts:** Newspaper photo rendering from tactical map canvas — requires headless renderer
- **Monthly snapshot persistence:** Magazine cross-session deltas — in-memory sufficient for now
- **formation_encircled milestone:** Encirclement detection logic not yet wired in findWarMilestoneEvent
