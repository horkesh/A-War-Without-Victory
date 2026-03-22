# Army HQ Nerve Center v2 — Design Spec

**Date:** 2026-03-21
**Status:** Design
**Author:** Pyrrhic Games (brainstorm session — UI/UX Developer, Game Designer, Orchestrator)
**Supersedes:** `docs/plans/2026-03-21-army-hq-nerve-center.md` (palette cleanup + flip cards — completed)

---

## 1. Purpose

The Army HQ is the player's nerve center — the one place where the engine's full intelligence picture is synthesized and presented. Today, the engine computes sector intel, combat predictions, supply breakdowns, morale drift reasons, sustainability scores, fatigue accumulation, enemy operation data, and dozens of other signals. Almost none of this reaches the player in a coherent form. The player must click through 5 corps, 30 sectors, and 125 brigades to piece together what's happening.

**Design thesis:** The HQ should feel like sitting at a general's desk while your Chief of Staff delivers the weekly briefing. National pride (army crest), strategic awareness (threat map), and curated intelligence (CoS briefing) — not a dashboard of raw numbers.

**Success criterion:** The player can answer "What needs my attention right now?" and "Where is the enemy threatening me?" within 5 seconds of opening the modal.

---

## 2. Layout Overview

Full-screen modal overlay. Seven zones stacked vertically, scrollable:

```
+------------------------------------------------------------------+
| [← MAP]  ARBIH MAIN STAFF    CoS: Gen. Divjak    Week 40  [×]   |
+------------------------------------------------------------------+
|                                                                   |
| ┌─COMMANDER──┐  ┌──ARMY CREST───┐  ┌──STRATEGIC SITUATION──────┐ |
| │ Officer    │  │               │  │ ⬡ Territory  👥 Personnel │ |
| │ Profile    │  │   [180px]     │  │   24.8%▼       137,728▼   │ |
| │            │  │               │  │ ⚔ Brigades  🎯 Operations │ |
| │            │  │  ARMIJA RBiH  │  │   125 active   4 active   │ |
| └────────────┘  └───────────────┘  │ ⚙ Combat Eff  📦 Supply  │ |
|                                    │   28,966 (A)    48 ▼-4/t  │ |
|                                    │ 💀 Exhaustion  🔫 Equip   │ |
|                                    │   270.8 CRIT▲  🛡105/170  │ |
|                                    └────────────────────────────┘ |
+------------------------------------------------------------------+
| ┌─ CHIEF OF STAFF BRIEFING ─────────────────────────────────────┐ |
| │ Gen. Divjak: "Commander, three matters require your attention │ |
| │ this morning. First, Drina Corps sector is showing signs of   │ |
| │ VRS offensive preparation — I recommend we reinforce 3rd..."  │ |
| │                                                               │ |
| │ PRIORITY: Op SABUR awaits GO/NO-GO          [→ 2ND CORPS]    │ |
| │ PRIORITY: Officer replacement pending        [→ PERSONNEL]   │ |
| │ THREAT: VRS Drina Corps massing              [→ 3RD CORPS]   │ |
| └───────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
| ┌─ THREAT ASSESSMENT ───────────────────────────────────────────┐ |
| │ ▲ ACTIVE THREATS                                              │ |
| │ [!] VRS DRINA — OFFENSIVE PREP · Dense · Conf 73%  → 3RD CRP │ |
| │ [!] VRS 1ST KRAJINA — Op KORIDORI · Mom 2 · 3/5 obj  → 2ND  │ |
| │                                                               │ |
| │ △ HARDENED POSITIONS                                          │ |
| │ Goražde: repelled 4 attacks — 8-turn cooldown                 │ |
| │                                                               │ |
| │ ○ INTELLIGENCE GAPS                                           │ |
| │ 4th Corps sector: confidence 12% — BLIND                     │ |
| └───────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
| ┌─ FORCE READINESS ─────────────────────────────────────────────┐ |
| │ 1ST CORPS — DEGRADED · 19 ineff · fatigue 18 · 4 disrupted   │ |
| │ 2ND CORPS — STRAINED · 13 ineff · Op SABUR (8 brg committed) │ |
| │ 3RD CORPS — ADEQUATE · ⚠ INCOMING · well-entrenched (4.2t)   │ |
| │ 4TH CORPS — DEGRADED · 9 ineff · conf 12% (BLIND)            │ |
| │ 5TH CORPS — STRAINED · Op KIŠA active · fatigue 14           │ |
| └───────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
| ┌─ SUPPLY & SUSTAINABILITY ─────────────────────────────────────┐ |
| │ SUPPLY: 48 ▼ Net -4.0/turn · Depletion ~12 turns (Week 52)   │ |
| │  maint -8.4 · siege -1.2 · prod +3.2 · patron +2.4           │ |
| │                                                               │ |
| │ ENCLAVES                                                      │ |
| │ Sarajevo  ████████░░ 44 res · 40t siege                      │ |
| │ Goražde   ██████░░░░ 33 res · 40t siege                      │ |
| │ Srebrenica ███░░░░░░░ 17 res · 25t siege                     │ |
| │ Žepa      ██░░░░░░░░ 15 res · 25t siege                      │ |
| │ Bihać     ██░░░░░░░░ 12 res · 21t siege                      │ |
| │                                                               │ |
| │ MOBILIZATION: 12 mun at cap · 3,200 this turn (▼ from 4,800) │ |
| └───────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
|  ALL CORPS (5)                                                    |
|  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ |
|  │ 1ST CORPS│ │ 2ND CORPS│ │ 3RD CORPS│ │ 4TH CORPS│ │5TH CRP │ |
|  │ ⚠INCOMING│ │          │ │ ⚠INCOMING│ │          │ │        │ |
|  │ Zaim I.  │ │ Željko K.│ │ Selmo C. │ │ Midhad H.│ │Ramiz D.│ |
|  │ 🛡20/29  │ │ 🛡24/6   │ │ 🛡18/12  │ │ 🛡6/0    │ │🛡6/10  │ |
|  │ 🏹35/84  │ │ 🏹39/6   │ │ 🏹27/12  │ │ 🏹11/7   │ │🏹10/10 │ |
|  │ 21k 35brg│ │ 47k 40brg│ │ 47k 27brg│ │ 5k 11brg │ │14k 10b │ |
|  │ ●Op Plam │ │ ●Op Sabur│ │          │ │          │ │●Op Kiša│ |
|  │ ═══coh═══│ │ ═══coh═══│ │ ═══coh═══│ │ ═══coh═══│ │══coh══ │ |
|  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ |
+------------------------------------------------------------------+
| ┌─ STAFF SITUATION MAP (canvas 2D) ─────────────────────────────┐ |
| │ Simplified territory shading · corps boundary lines           │ |
| │ Front line · operation arrows · threat zones (pulsing red)    │ |
| │ Enclave markers with supply-state color                       │ |
| │                                                 ~350px tall   │ |
| └───────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
| ┌─ DISPATCHES & FIELD REPORTS ──────────────────────────────────┐ |
| │ ▸ UNHCR Zagreb: "12,000 displaced from Prijedor corridor..." │ |
| │ ▸ Field Report — 1st Corps: "We held the ridge at Igman..."  │ |
| │ ▸ NATO Intel: "Serbian armour concentration near Brčko..."    │ |
| └───────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
```

---

## 3. Chief of Staff System

### 3.1 Identity

The CoS is a real named deputy officer from the faction's OOB:

| Faction | CoS | Rank | Personality | Briefing Tone |
|---------|-----|------|-------------|---------------|
| RBiH | Gen. Jovan Divjak | Deputy Commander | Competence 4, Aggression 2, Defense 4 | Cautious, analytical, emphasizes threats and sustainability |
| RS | Gen. Manojlo Milovanović | Chief of Staff | Competence 5, Aggression 3, Defense 4 | Professional, precise, force-ratio focused |
| HRHB | Gen. Milivoj Petković | Deputy Commander | Competence 4, Aggression 4, Defense 3 | Direct, operationally aggressive |

If the faction's deputy is KIA/retired, falls back to the next available `rank: 'deputy'` officer, then to a generic "Staff Officer" with neutral personality.

### 3.2 Briefing Generation

**Pattern:** Same as `corps_dialogue.ts` and `aar_narrative.ts` — structured JSON from Haiku with personality injection.

**Input to the prompt:**
- Officer name, competence, aggressiveness, defensive_skill → personality labels via `getArchetype()` and `getPersonalitySummary()`
- Faction full name (native language, e.g., "Armija Republike Bosne i Hercegovine")
- All data from `generateBriefing()` (existing SituationBriefing items)
- Sector intel summary: sectors with offensive_signs, posture changes, confidence levels
- Force readiness summary: per-corps fatigue avg, disrupted count, ineffective count
- Supply breakdown: net drain, runway, enclave status
- This-turn battle outcomes: casualties, territory changes
- Active operations: phase, momentum, stalls
- Pending decisions: officer events, GO/NO-GO operations

**Output structure:**
```typescript
interface ChiefOfStaffBriefing {
    greeting: string;          // "Commander, three matters this morning."
    priority_items: string[];  // 1-3 sentences on immediate decisions
    threat_summary: string;    // 2-3 sentences on enemy activity
    readiness_note: string;    // 1-2 sentences on force condition
    recommendation: string;    // 1 sentence — the CoS's professional opinion
    tone: 'urgent' | 'concerned' | 'measured' | 'confident';
}
```

**Fallback (no API available):** The briefing degrades gracefully to structured data-only items (the existing `generateBriefing()` output). The CoS section simply hides its personality text and shows the raw priority items. The intelligence panels (Threat, Readiness, Supply) work entirely from local data — no API dependency.

### 3.3 When It Generates

- On modal open (if turn changed since last briefing)
- Cached per turn — opening HQ twice in the same turn reuses the cached briefing
- Async — the modal opens immediately with structured data; the CoS text streams in when ready
- Generation takes ~2-3 seconds via Haiku — show a subtle "CoS is preparing briefing..." indicator

### 3.4 Future: Conversational CoS

The `player_advisor.ts` pattern enables a future "Ask the Chief" feature. The CoS has full context (same data feed) and personality. The player could ask:
- "What do you think about attacking Brčko?"
- "Should I reinforce Goražde or let it fall?"
- "Can we sustain two simultaneous operations?"

This is NOT part of this design — but the architecture supports it with zero additional engine work.

---

## 4. Threat Assessment Panel

### 4.1 Data Sources

**Primary — Sector Intel (needs adapter exposure):**

The engine computes `SectorIntelRecord[]` per friendly sector, containing per-enemy-sector:
- `confidence` [0–1] — how reliable the picture is
- `strength_category`: unknown / thin / moderate / dense / fortress
- `posture_observed`: unknown / defensive / entrenched / offensive_prep
- `offensive_signs`: boolean (requires CONFIDENCE_DEEP_INTEL)
- `turns_in_contact`: how long in contact
- `visible_brigade_ids`: identified enemy brigades

**Currently:** Only `fogOfWar` booleans pass through. The full records are dropped.

**Required:** New `LoadedGameState` field:
```typescript
sectorIntel: Record<string, SectorIntelRecordView[]>;
// keyed by friendly sector_id → array of enemy sector assessments
```

**Secondary — Enemy Operations (already available):**

`LoadedGameState.operations` and `activeOperations` are **unfiltered** — all factions' active operations with objectives, phase, momentum, failure_count, participating brigades, and commander are already in the adapter.

**Secondary — Failed Objectives (needs adapter exposure):**

`CorpsCommandState.failed_offensive_objectives` tracks per-OSID failure count and cooldown timer. Needs a new view field or can be derived from operation history.

**Secondary — Battle History (already available):**

`battlesByOsid` provides per-OSID attack frequency. Repeated attacks on the same OSID = sustained pressure.

### 4.2 Threat Categories

**ACTIVE THREATS (red, pulsing):**
- Enemy sector with `offensive_signs: true` — "VRS DRINA — OFFENSIVE PREPARATION"
- Enemy operation in `execution` phase with `momentum ≥ 2` — "Op KORIDORI — BREAKTHROUGH RISK"
- Enemy operation in `force_staging` or `assessment` — "VRS operation staging detected"

**HARDENED POSITIONS (green, reassuring):**
- OSIDs with `failed_offensive_objectives` cooldown active — "Goražde repelled 4 attacks"
- Enemy operation with `status: 'stalled'` and `failure_count ≥ 5` — "Enemy assault SPENT"

**INTELLIGENCE GAPS (amber, actionable):**
- Sectors with `intel_confidence < 0.3` and no recent combat — "4th Corps sector BLIND"
- Recommend PROBE or OPSEC toggle

### 4.3 Visual Treatment

Each threat card has:
- Left border colored by confidence: solid = high conf, dashed = low conf
- Corps badge linking to the relevant corps card
- Clickable → highlights sector on staff map (if implemented)
- Maximum 8 items (most critical first)

---

## 5. Force Readiness Panel

### 5.1 Per-Corps Readiness Grade

Computed from brigade-level data already in `LoadedGameState.formations`:

```typescript
type ReadinessGrade = 'COMBAT READY' | 'ADEQUATE' | 'STRAINED' | 'DEGRADED' | 'INEFFECTIVE';

function computeReadiness(brigades: FormationView[]): ReadinessGrade {
    const ineffCount = brigades.filter(b => (b.personnel ?? 0) < 400).length;
    const ineffPct = ineffCount / brigades.length;
    const avgFatigue = avg(brigades, b => b.fatigue ?? 0);
    const avgCohesion = avg(brigades, b => b.cohesion ?? 0);
    const disruptedCount = brigades.filter(b => (b.disrupted_turns ?? 0) > 0).length;

    if (ineffPct > 0.5 || avgCohesion < 30) return 'INEFFECTIVE';
    if (ineffPct > 0.3 || avgFatigue > 20 || avgCohesion < 45) return 'DEGRADED';
    if (ineffPct > 0.15 || avgFatigue > 15 || disruptedCount > 3) return 'STRAINED';
    if (ineffPct > 0.05 || avgFatigue > 10) return 'ADEQUATE';
    return 'COMBAT READY';
}
```

### 5.2 Per-Corps Detail Line

Each corps gets one summary line showing the most critical issue:
- Ineffective brigade count
- Average fatigue level
- Disrupted brigade count
- Overextended brigades (home distance ≥ 7 hops)
- Active operation commitment (brigades tied up)
- Incoming threat indicator (from threat assessment)
- Recommendation: REORGANIZE / REINFORCE / HOLD / PROBE

### 5.3 Home Distance Intelligence

`home_distance_cache` (already computed) identifies brigades fighting far from home. The readiness panel flags brigades at ≥ 7 hops:
- "3 brigades operating 7+ hops from home (≤84% effectiveness)"

### 5.4 Readiness Grade Drives Corps Card Border

| Grade | Border Color | Card Treatment |
|-------|-------------|----------------|
| COMBAT READY | emerald-400 left border | Clean |
| ADEQUATE | no accent | Clean |
| STRAINED | amber-500 left border | Amber personnel number |
| DEGRADED | red-500 left border | Red personnel, warning icon |
| INEFFECTIVE | red-600 left border + pulsing | Red everything, "CRITICAL" stamp |

---

## 6. Supply & Sustainability Panel

### 6.1 Supply Breakdown

**Needs adapter exposure:** `SupplyReservesFactionEntry` breakdown fields:
- `maintenance_drain` — per-formation upkeep
- `heavy_maintenance_drain` — heavy equipment upkeep
- `siege_drain_general` / `siege_drain_heavy` — enclave siege cost
- `production_income_general` / `production_income_heavy` — domestic production
- `patron_aid_general` / `patron_aid_heavy` — patron support
- `embargo_factor_general` / `embargo_factor_heavy` — embargo impact

**Supply runway:** `current_level / abs(net_drain_per_turn)` = turns until depletion. Display as "Depletion in ~12 turns (Week 52)".

### 6.2 Enclave Status Bars

Visual bars for each enclave from `enclaveResilience`:
- Bar length = resilience / max_resilience
- Color: green (> 60%), amber (30-60%), red (< 30%)
- Label: display_name + resilience value + siege turn count
- `supply_state` badge: ADEQUATE / STRAINED / CRITICAL

### 6.3 Mobilization Summary

From `mobilizationSummary` (already in adapter):
- Exhausted municipalities count (at 50% cap)
- Manpower added this turn
- Trend: UP / FLAT / DECLINING (compare with previous turn)

---

## 7. Strategic Situation Dashboard

### 7.1 Stat Cards with Deltas

Replace the current plain text list with icon + value + delta mini-cards:

| Stat | Source | Delta Source |
|------|--------|-------------|
| Territory % | `controlBySettlement` + `osid_areas` | Compare current vs previous turn |
| Personnel | Sum of brigade `personnel` | `latestTurnSummary.casualties` |
| Brigades | Count active brigades | `latestTurnSummary.formations_destroyed` |
| Operations | Count active operations | Count ops in execution vs last turn |
| Combat Eff. | `aggregateEffectiveness()` | Compare with previous |
| War Exhaustion | `warPhaseExhaustion[faction]` | Delta from previous |
| Supply | `factionReserves.generalSupply` | Net drain per turn |
| Equipment | Aggregate tanks/arty op/total | `latestTurnSummary.equipment_losses` |

### 7.2 Delta Color Coding

- Green up-arrow: stat improving (territory gained, personnel up)
- Red down-arrow: stat declining (territory lost, supply draining)
- Amber dash: stable (< 1% change)
- Red text for critical thresholds (exhaustion > 200, supply < 30)

---

## 8. Corps Cards — Fixes & Enhancements

### 8.1 Bug Fixes (immediate)

**Floating point:** Apply `Math.round()` to:
- `data.equipment.tanksOp`, `data.equipment.tanksTotal`, `data.equipment.artyOp`, `data.equipment.artyTotal` in `ArmyHQCorpsCard.tsx`
- All `resilience`, `confidence`, `exhaustion` values in `SituationBriefing.tsx`

**Date display:** In `ArmyHQModal.tsx`, compute date from turn number:
```typescript
const startDate = new Date(1992, 3, 1); // April 1992
const weekDate = new Date(startDate.getTime() + (state.turn ?? 0) * 7 * 24 * 60 * 60 * 1000);
const dateStr = state.metadata?.date ?? weekDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
```

**Stance badge:** Use short labels that never overflow:
```typescript
const STANCE_SHORT: Record<string, string> = {
    offensive: 'OFF', defensive: 'DEF', balanced: 'BAL', reorganize: 'REORG',
};
```

### 8.2 Enhancements

**Threat badge:** If sector intel shows `offensive_signs` facing this corps:
```tsx
{hasThreat && (
    <div className="text-[9px] text-red-400 font-bold animate-pulse tracking-widest">
        ⚠ INCOMING
    </div>
)}
```

**Health stripe:** Multi-segment 4px bar at card bottom:
- Segment 1: cohesion (green/amber/red fill)
- Segment 2: fatigue (blue gradient, width = fatigue/30)
- Segment 3: disrupted pips (red dots, one per disrupted brigade)

**Readiness grade badge:** Small colored badge next to the EF grade showing the corps readiness level from §5.

---

## 9. Staff Situation Map

### 9.1 Purpose

Canvas-rendered strategic overview filling the dead space below corps cards. ~350px tall, full width. Dark background matching `bg-panel-bg`.

### 9.2 Render Layers (bottom to top)

1. **Territory fills** — OSID polygons colored by controlling faction at 30% opacity. Use simplified centroid-based voronoi or pre-computed boundary paths from `osid_areas.json`.
2. **Corps boundary lines** — dashed amber lines between corps zones. Labels at zone centers.
3. **Front line** — thick white/contested line between factions. Computed from front edges.
4. **Operation arrows** — bold directional arrows from staging to objectives. Player ops in gold, enemy ops in red (from unfiltered `operations` data).
5. **Threat zones** — pulsing red overlay on sectors where `offensive_signs: true`.
6. **Enclave markers** — circled icons with supply-state color (green/amber/red).

### 9.3 Interaction

- Hover corps zone → highlights corresponding corps card
- Click operation arrow → opens operation detail
- Click threat zone → scrolls to threat in briefing
- Click enclave → shows enclave detail tooltip

### 9.4 Technical Approach

Pure `<canvas>` 2D context. No MapLibre dependency. Data sources:
- `controlBySettlement` + OSID centroid positions → territory coloring
- `corpsFrontSectors` → corps boundaries
- Front edges → front line rendering
- `operations` → operation arrows (staging_osid → objective osids)
- `sectorIntel` → threat zones
- `enclaveResilience` → enclave markers

Redraws on state change only. Consider `requestAnimationFrame` for the pulse animation on threat zones.

### 9.5 Deferral Note

The staff map is the most complex UI component and can be implemented as a follow-up phase. The nerve center works without it — the intelligence panels are the primary value. The map is a polish item that completes the experience.

---

## 10. Dispatches & Field Reports

### 10.1 Data Sources (need adapter exposure)

| Source | Engine Location | Content |
|--------|----------------|---------|
| War dispatches | `state.military.war_dispatches` | UNHCR, NATO, civilian perspectives (Haiku-generated) |
| Battle narratives | `state.military.battle_narratives` | Terse field reports from this turn's significant battles |
| Corps dialogues | `state.military.corps_dialogues` | Corps commander acknowledgments (in character) |
| Friction events | `state.military.friction_events` | Warlord insubordination events |

### 10.2 Presentation

Collapsible section at the bottom of the HQ. Shows the 3-5 most recent/relevant items:
- War dispatch: source attribution + headline + truncated body
- Battle narrative: corps attribution + tone badge + narrative text
- Corps dialogue: officer name + acknowledgment + concern (if any)
- Friction event: officer name + event type + "IGNORED CORPS DIRECTIVE" / "UNAUTHORIZED OPERATION"

### 10.3 Why This Matters

These systems exist in the engine and produce rich, personality-driven content every turn. None of it reaches the player today. Exposing them in the HQ transforms the modal from a data viewer into a living command experience.

---

## 11. Adapter Changes Required

New fields on `LoadedGameState`:

```typescript
// Sector intelligence records (currently only fog booleans pass through)
sectorIntel?: Record<string, SectorIntelRecordView[]>;

// Supply breakdown (currently only the level is shown)
supplyBreakdown?: {
    maintenance_drain: number;
    siege_drain: number;
    production_income: number;
    patron_aid: number;
    embargo_factor: number;
    net_per_turn: number;
};

// Flavor text systems (currently never forwarded)
warDispatches?: WarDispatchView[];
battleNarratives?: BattleNarrativeView[];
corpsDialogues?: CorpsDialogueView[];
frictionEvents?: FrictionEventView[];

// Loss of control trends
lossOfControlTrends?: {
    by_faction: Record<string, {
        exhaustion_trend: 'up' | 'down' | 'flat';
        collapse_eligible: boolean;
    }>;
};
```

View types for each are thin wrappers around the engine types, exposing only what the UI needs.

---

## 12. Implementation Phases

### Phase 1: Bug Fixes (immediate, no new features)
- Fix floating point in corps cards and briefing
- Fix date display fallback
- Fix stance badge truncation
- **Commit separately before any new feature work**

### Phase 2: Adapter Exposure
- Add `sectorIntel` to `GameStateAdapter.ts` and `types.ts`
- Add `warDispatches`, `battleNarratives`, `corpsDialogues`, `frictionEvents`
- Add `supplyBreakdown`
- Add `lossOfControlTrends`
- Build, typecheck, test

### Phase 3: Threat Assessment Panel
- `ThreatAssessment.tsx` component
- `generateThreatAssessment()` pure function reading `sectorIntel` + enemy `operations`
- Wire into `ArmyHQModal` between CoS briefing and corps cards
- Clickable threat cards → corps card navigation

### Phase 4: Force Readiness Panel
- `ForceReadiness.tsx` component
- `computeReadiness()` per-corps grade function
- Readiness grade drives corps card border color
- Threat badge on corps cards (⚠ INCOMING)

### Phase 5: Supply & Sustainability Panel
- `SupplyIntelligence.tsx` component
- Supply breakdown display with runway projection
- Enclave resilience bars
- Mobilization summary with trend

### Phase 6: Strategic Situation Dashboard
- Redesign stat panel with icon + value + delta cards
- Compute deltas from `latestTurnSummary`
- Color-coded trends

### Phase 7: Chief of Staff Briefing
- `ChiefOfStaff.tsx` component
- `generateCoSBriefing()` — Haiku call with personality injection
- Identify deputy officer from OOB
- Async loading with graceful fallback
- Cache per turn

### Phase 8: Dispatches & Field Reports
- `Dispatches.tsx` component
- Render war dispatches, battle narratives, corps dialogues, friction events
- Collapsible section at bottom

### Phase 9: Staff Situation Map (can defer)
- `StaffMap.tsx` with canvas 2D renderer
- Territory shading, corps boundaries, front line, operation arrows
- Threat zone overlays, enclave markers
- Interactive hover/click

### Post-phase discipline (EVERY phase):
1. Smoke-test triad: `tsc --noEmit` + `vitest run` + `desktop:map:build`
2. Visual verification in browser
3. Commit with descriptive message
4. Update `docs/PROJECT_LEDGER.md`

---

## 13. What This Does NOT Change

- **Simulation logic** — zero pipeline/combat/calibration changes. All data is already computed; we only expose it.
- **Existing panels** — sidebar corps cards, CorpsDetail, FormationDetail all remain. The HQ synthesizes, doesn't replace.
- **Bot AI** — bot factions never see this modal.
- **Calibration** — no sim-affecting changes.
- **Determinism** — all new code is UI-only. The Haiku CoS briefing is display-only, not stored in GameState.

---

## 14. Acceptance Criteria

- [ ] Zero floating point gibberish anywhere in Army HQ
- [ ] Date displays correctly (fallback from turn number)
- [ ] Stance badges never truncate
- [ ] Threat Assessment shows enemy offensive preparation, massing, active operations
- [ ] Force Readiness grades each corps with one-word assessment
- [ ] Supply panel shows breakdown, runway, enclave bars, mobilization trend
- [ ] Strategic Situation has deltas (this-turn changes) with color coding
- [ ] Corps cards show ⚠ INCOMING when facing enemy offensive preparation
- [ ] Corps cards show readiness grade border color
- [ ] CoS briefing generates personality-driven text via Haiku (with fallback)
- [ ] Dispatches section shows war dispatches, battle narratives, corps dialogues
- [ ] `desktop:map:build` passes with zero errors
- [ ] No runtime errors when opening Army HQ with loaded save

---

## 15. Design References

- **Gary Grigsby's WitE2:** deep OOB tree, HQ-centric intelligence, command range
- **HoI4:** army group overview, division list, front line assignments
- **EU4:** outliner "everything at a glance", threat indicators
- **Decisive Campaigns:** officer-driven intelligence briefings, personality effects
- **Unity of Command 2:** briefing card layout, visual triage
- **Command: Modern Operations:** dark professional theme, message log, intel panels
- **Existing AWWV sidebar:** compact corps cards with equipment icons — the information density target
