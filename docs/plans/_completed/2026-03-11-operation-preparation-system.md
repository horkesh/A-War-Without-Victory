# Operation Preparation System — Design Document

**Status:** Design
**Priority:** P1 (addresses REAL_WAR_MASTER #21: no probe/recon operations)
**Authors:** Paradox Team (Historian, Game Designer, Technical Architect, War-or-Game, Orchestrator)
**Date:** 2026-03-11

---

## 1. Problem Statement

The bot launches operations blind. Army HQ sets targets, corps immediately launches a `sector_attack`, and brigades check power ratios before attacking. There is no intelligence assessment, no force evaluation, no supply check, no probing — the most important phase of any military operation (preparation) does not exist.

**Current pipeline:**
```
Army HQ sets targets → Corps instantly launches sector_attack →
Planning "phase" = countdown timer (does nothing) →
Execution: brigades check power ratio → attack or don't
```

**Result:** RBiH attacks Lukavica (Novo Sarajevo) 5 times in 40 weeks, catastrophic every time. No real commander would do this. The ops commander assigned to the operation has zero agency — they're a stat modifier, not a decision-maker.

**Historical reality:** Every faction probed before major operations. VRS probing was JNA-doctrine-standard (company-strength, 1-2 weeks before main assault). ARBiH improved from "probing IS the attack" (1992) to proper recon-in-force (1995). Operation Corridor took 6-8 weeks from concept to execution, including intel gathering, supply accumulation, diversionary attacks, and company-strength probes to identify weak points.

---

## 2. Design Principle

**The ops commander drives preparation.** When corps assigns forces and a commander to an operation, the commander takes over. They assess intelligence, order probes if needed, stage forces, check supply, and make a go/no-go recommendation. The commander's personality (competence + aggressiveness) creates emergent variation — aggressive commanders skip preparation and attack blind, cautious ones demand perfect intel before committing.

**The player commands through the chain of command.** Set objectives, assign forces, and watch the commander prepare. Get briefings. Make go/no-go decisions. Override the commander at a cost. This is not an RTS — it's strategic command through institutional filters.

---

## 3. Architecture: Sub-States Within Planning

**Recommended approach (Technical Architect):** Model preparation as sub-states within the existing `planning` phase via a new `preparation_sub_phase` field. This causes zero breaking changes — existing code that checks `op.phase === 'planning'` continues to work. The sub-phase field is optional and ignored by code that doesn't read it.

```
planning [
  intel_gathering  →  probe_ordered?  →  force_staging  →  supply_check  →  assessment  →  ready
] → execution → recovery → removed
```

**Pipeline position:** Runs inside `advance-sector-offensives` (step 590), before the existing `planning → execution` transition check. The `planning_duration` remains the outer boundary; preparation sub-phases run within it.

**Key constraint:** `derive-sector-intel` runs at step ~1416 (end of turn), after combat. Corps AI reads intel from the PREVIOUS turn. This natural 1-turn delay prevents feedback loops between intel → probes → intel.

---

## 4. Preparation Sub-Phases

### Phase A: Intelligence Collection (1-3 turns)

Commander assesses the target sector by reading `state.military.sector_intel[friendlySectorId]` for the enemy sector containing the objectives. The lookup path already exists in `bot_corps_directives.ts` (lines 726-752).

**Gate:** Intel confidence must reach commander's threshold before proceeding.

```
required_confidence = 0.6 - (aggressiveness × 0.06) + (competence × 0.04)
```

| Commander Type | Comp | Agg | Required Confidence |
|---|---|---|---|
| Elite offensive (Dudakovic) | 5 | 5 | 0.30 |
| Reckless (Praljak) | 2 | 5 | 0.22 |
| Defensive master (Hadzihasanovic) | 5 | 1 | 0.70 |
| Paralyzed (low/low) | 2 | 1 | 0.62 |
| VRS standard (Talic) | 4 | 4 | 0.40 |

**If confidence is below threshold:**
- If no active probe and corps has 1-2 healthy brigades: **order probe** (transition to `probe_ordered`)
- If probe already active: wait for results
- If probe completed: reassess with updated confidence

**Historical basis:** VRS corps intelligence officers (OB-2) compiled enemy assessments from JNA-inherited SIGINT, agent networks, observation posts, and patrol reports before any operation. ARBiH early war had no intelligence section — they attacked blind and paid for it.

### Phase A.1: Probe (1 turn sub-action)

When the preparation commander orders a probe, it executes as a single-turn sub-operation within the parent operation:

- **Force:** 1-2 brigades (mechanized/motorized preferred — recon capability)
- **Commitment:** `PROBE_FORCE_COMMITMENT_FACTOR = 0.4` — reduced combat power (testing, not breaking through)
- **Intel gain:** `probe_confidence_gain` from faction profiles (RBiH: 0.50, RS: 0.35, HRHB: 0.35). If combat resolves, confidence → 1.0 (recon-by-force, already exists)
- **Casualties:** Apply `probe_casualty_factor` (RBiH: 0.15, RS: 0.25, HRHB: 0.25)
- **Counter-probe:** Defender's sector_intel for the attacking sector gets a confidence boost — they now know an offensive is being prepared. This telegraphs intentions (historical: surprise was rare in Bosnia)
- **Exhaustion cost:** 5 (already implemented for probes)

**Historical basis:** VRS probes were company-strength (100-150 men) with 1-2 tanks, advancing along a specific axis with artillery on call. Light contact → exploitation; heavy contact → withdrawal and report. ARBiH early-war probes were indistinguishable from full attacks (50-100 men with small arms).

**State schema:**
```typescript
// On CorpsOperation:
active_probe?: {
    target_osid: string;
    brigade_ids: FormationId[];  // 1-2 brigades
    started_turn: number;
    resolved: boolean;
    result_confidence_gain?: number;
};
```

### Phase B: Force Staging (1-2 turns)

Participating brigades move to approach/staging OSIDs. This already partially works via `areParticipantsReadyForExecution()` but becomes an explicit sub-phase.

**Commander evaluates force sufficiency** based on intel assessment:

```
required_force_ratio = 1.5 - (aggressiveness × 0.10) + (competence × 0.05)
```

| Commander Type | Required Force Ratio |
|---|---|
| Elite offensive (5/5) | 1.15:1 |
| Reckless (2/5) | 1.10:1 |
| Defensive master (5/1) | 1.60:1 |
| VRS standard (4/4) | 1.30:1 |

**If force ratio is below threshold:**
- Commander requests reinforcement from corps reserve (already exists: sector density equalization)
- If reinforcement unavailable: cautious commanders (agg ≤ 2) recommend POSTPONE or ABORT; aggressive commanders (agg ≥ 4) proceed anyway

**Estimated force ratio uses intel accuracy:**
- High confidence (≥ 0.5): estimate close to ground truth
- Low confidence (< 0.3): estimate may be wildly wrong — aggressive commanders attacking blind may stumble into unfavorable engagements. **This creates emergent risk.**

### Phase C: Supply Verification (0-1 turns)

Commander checks supply using existing `computeSupplyReadiness()` (already in `sector_offensive.ts` line 432) + `assessCorpsSupplyHealth()` (in `bot_corps_helpers.ts`).

**Thresholds:**
- `supply_readiness ≥ 0.7`: proceed (most brigades supplied)
- `supply_readiness ≥ 0.5`: aggressive commanders (agg ≥ 4) proceed; cautious hold for 1-2 turns
- `supply_readiness < 0.5`: all commanders hold (max 3 turns, then forced decision)
- `general_supply_reserve < 10`: even aggressive commanders abort (faction-level exhaustion)
- `heavy_munitions_reserve ≥ 2`: unlocks artillery preparation option

**Historical basis:** VRS had 0-2 turns supply preparation early war (JNA depot inheritance). ARBiH supply accumulation was the PRIMARY constraint on offensive capability — months of hoarding UN airdrops and captured stocks. 5th Corps in Bihac hoarded for months before major operations. HVO: 1-3 turns via Croatian supply line.

### Phase D: Go/No-Go Assessment (0-1 turns)

Commander synthesizes intel + force ratio + supply into a recommendation: **LAUNCH**, **POSTPONE**, or **ABORT**.

```
assessment_score = (confidence × 0.4) + (force_ratio_met × 0.3) + (supply_readiness × 0.3)
go_threshold = 0.7 - (aggressiveness × 0.08)
```

**Bot behavior:**
- Score ≥ go_threshold → LAUNCH (transition to execution)
- Score ≥ go_threshold - 0.15 → POSTPONE (return to Phase A, max 2 postponements)
- Score < go_threshold - 0.15 → ABORT (low exhaustion cost: 3 instead of 15)

**Player experience:**
When Phase D completes, the player receives a structured briefing:
```
OPERATION BRIEFING: Op Vrbas-93
Commander: Col. Stanislav Galic (comp 4, agg 4)
Assessment: FAVORABLE

Enemy sector: RS 1KK Sector 7 (Jajce)
  Estimated strength: MODERATE (4-6 brigades)
  Confidence: 0.72
  Terrain: 1.4× (hills, river crossing)

Our force: 10 brigades (2 mech, 3 mot, 5 inf)
  Estimated ratio: ~2.1:1
  Supply: ADEQUATE (92% ready)

Commander recommends: LAUNCH
```

**Player options:** Launch / Postpone / Abort / Order Probe First / Override Commander (cohesion penalty + reduced commander modifier)

### Anti-Paralysis Safety Valve

**Maximum preparation time:**
```
preparation_max_turns = max(2, 8 - aggressiveness)
```

- Aggressiveness 5: max 3 turns (blitz commander)
- Aggressiveness 3: max 5 turns (standard)
- Aggressiveness 1: max 7 turns (deliberate planner)

If `preparation_turns_elapsed ≥ preparation_max_turns`, forced decision: aggressive commanders (agg ≥ 3) auto-launch; cautious commanders (agg ≤ 2) auto-abort and corps reassigns to a different objective.

**Historical basis:** ARBiH 4th Corps was largely passive for the first year. Some paralysis is historically accurate — but it must resolve. The army replaces paralyzed commanders (officer succession system already exists).

---

## 5. Faction-Specific Preparation Profiles

### VRS (Early War, w0-12)

- **Intel advantage:** JNA inheritance. Start with 0.6+ confidence against all sectors (JNA knew every ARBiH/HVO position). Scenario parameter: `initial_intel_confidence: 0.6` for VRS sectors.
- **Supply advantage:** JNA depot stocks. supply_readiness ≈ 1.0 for first 12 weeks. Phase C effectively skipped.
- **Commander profile:** Aggressive (standing orders = general_offensive, agg modifier +0.15). Preparation takes 1-2 turns.
- **Result:** VRS early-war operations feel fast and overwhelming, matching historical reality.

### VRS (Late War, w26+)

- **Intel decays:** Confidence decays faster as frontlines stabilize and agents are compromised. VRS passive buildup only 0.20/turn.
- **Supply constraint:** Depot stocks depleted. Serbia pipeline insufficient for sustained ops. Phase C becomes real gate.
- **Commander profile:** Same officers, same aggression, but supply and intel constraints slow them organically.
- **Result:** VRS late-war operations are slower and more deliberate — organic tempo decay.

### ARBiH (Early War, w0-15)

- **Intel deficit:** Near-zero initial confidence. Passive buildup 0.30/turn (better than VRS — local population as intelligence network). Reaches 0.3 confidence after ~1 turn.
- **Supply crisis:** supply_readiness often < 0.5. Phase C is the primary gate. Operations delayed or never launched.
- **Commander profile:** Low competence (comp 2-3), variable aggression. Many commanders paralyzed by uncertainty.
- **Result:** ARBiH early-war operations are rare, local, and desperate — matching historical reality. "Operations" are survival-driven counterattacks, not planned offensives.

### ARBiH (Late War, w40+)

- **Intel improved:** Established intelligence sections at corps level. Confidence builds faster (organic officer improvement). Systematic patrol programs.
- **Supply improved:** Iranian/Saudi/Turkish smuggling, captured VRS stocks, UN airdrops hoarded. Phase C still gates but doesn't prevent.
- **Commander profile:** Improved officers (comp 3-4, some 5 like Dudakovic). Recognizable military planning.
- **Result:** ARBiH late-war operations have real preparation — recon, staging, supply accumulation, then coordinated multi-axis assault.

### HVO

- **Intel moderate:** Croatian SIS HUMINT in Herzegovina (best intelligence network outside VRS). Confidence buildup moderate. Central Bosnia HVO: isolated, poor intel.
- **Supply variable:** Croatian supply line through Split. Herzegovina OZ well-supplied (1-3 turns accumulation). Central Bosnia OZ: helicopter resupply, extremely constrained.
- **Commander profile:** When HV staff involved (Roso, comp 5): methodical, 2-3 turn preparation. When local HVO (Praljak, comp 2): ad hoc, reckless.
- **Result:** HVO operations range from professional (Herzegovina with HV support) to militia-quality (Central Bosnia isolated enclaves).

---

## 5a. Commander Selection (Player Experience)

When the player submits a directive from OpsPlanningModal, a **Commander Selection screen** appears before preparation begins. The player picks who runs the operation — and that choice shapes everything that follows.

### Selection Screen

```
╔═══════════════════════════════════════════════════════════════╗
║  ASSIGN OPERATIONS COMMANDER                                  ║
║  Op Vrbas-93 — 5th Corps, Bihać OZ                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ► Brig. Atif Dudaković   ★★★★★ comp  ★★★★★ agg            ║
║    "Minimal prep, attacks immediately. Est. 2 turns."         ║
║    HOME CORPS — no penalty                                    ║
║                                                               ║
║  ► Col. Mirsad Šelmanović  ★★★★ comp   ★★★★ agg             ║
║    "Fast prep, accepts risk. Est. 3 turns."                   ║
║    HOME CORPS — no penalty                                    ║
║                                                               ║
║  ► Col. Izet Nanić         ★★★★ comp   ★★★★★ agg            ║
║    "Blitz commander, attacks blind. Est. 2 turns."            ║
║    HOME CORPS — no penalty  ⚠ High casualty risk             ║
║                                                               ║
║  ░ Gen. Rasim Delić         [ARMY HQ — unavailable]          ║
║  ░ Brig. Naser Orić         [ENCLAVE LOCKED: Srebrenica]     ║
║  ░ Col. Ramiz Bećirović     [ENCLAVE LOCKED: Srebrenica]     ║
║                                                               ║
║  [ASSIGN SELECTED]                       [BACK TO DRAFT]     ║
╚═══════════════════════════════════════════════════════════════╝
```

### What the Player Sees Per Officer

- **Name and rank**
- **Competence stars** (1-5) — accuracy of intel reads, force estimates, briefing quality
- **Aggressiveness stars** (1-5) — preparation speed, risk tolerance, launch thresholds
- **Preparation time estimate** — derived from `max(2, 8 - aggressiveness)`
- **One-line personality summary** — templated from comp×agg quadrant:
  - High comp / High agg: "Fast prep, accepts risk"
  - High comp / Low agg: "Thorough prep, demands intel"
  - Low comp / High agg: "Reckless, attacks blind"
  - Low comp / Low agg: "Hesitant, may never launch"
- **Regional fit** — HOME CORPS (no penalty), COMPATIBLE (small penalty), or OUT OF REGION (large penalty, shown in amber)
- **Availability warnings** — already commanding another op, high casualty vulnerability, enclave-locked

### Unavailable Officers (greyed out, with reason)

Officers appear greyed out but VISIBLE so the player understands the roster:

| Reason | Display |
|---|---|
| Active corps commander | `[CORPS COMMANDER — 5th Corps]` |
| Commanding another operation | `[ASSIGNED: Op Tigar-Sloboda]` |
| Enclave-locked elsewhere | `[ENCLAVE LOCKED: Srebrenica]` |
| Army HQ level | `[ARMY HQ — unavailable]` |
| KIA / Captured / Retired | `[KIA w175]` or `[CAPTURED]` |
| Not yet available | `[ARRIVES w80]` |
| Out of region (visible but penalized) | `⚠ OUT OF REGION — competence -2` |

### Enclave Lock Constraint

Officers physically trapped in pockets cannot command ops outside their enclave. This is a hard constraint, not a penalty — you cannot assign Naser Orić to an operation in Tuzla when he's inside the Srebrenica pocket.

**New field on `NamedOfficer`:**
```typescript
enclave_lock?: {
    enclave_id: string;        // e.g. 'srebrenica', 'bihac', 'sarajevo', 'orasje'
    locked_until_turn?: number; // When enclave breaks out / officer evacuated (undefined = permanent)
};
```

**Enclave-locked officers:**

| Officer | Enclave | Lock Until | Notes |
|---|---|---|---|
| arbih_oric (Orić) | srebrenica | w168 | Evacuated by helicopter |
| arbih_becirovic (Bećirović) | srebrenica | — | Present at fall |
| arbih_dudakovic (Dudaković) | bihac | ~w170 | In pocket from w0 (`available_from_turn: 0`). Reserve pool — best ops commander in the pocket. Player/bot promotes to corps commander when ready (not automatic). Enclave unlocked on breakout |
| arbih_drekovic (Dreković) | bihac | w80 | Replaced by Dudaković |
| arbih_nanic (Nanić) | bihac | w175 | KIA before breakout |
| arbih_selmanovic (Šelmanović) | bihac | — | 5th Corps subordinate |
| arbih_talijan (Talijan) | sarajevo | w68 | Besieged city |
| arbih_karavelic (Karavelić) | sarajevo | — | Besieged city |
| arbih_ajnadzic (Ajnadžić) | sarajevo | — | Besieged city |
| vrs_galic (Galić) | sarajevo_ring | w118 | Siege positions |
| vrs_d_milosevic (D. Milošević) | sarajevo_ring | — | Siege positions |
| hvo_matuzovic (Matuzović) | orasje | — | Totally isolated pocket |

### Data Fix Required: `available_from_turn` vs Promotion

Currently `available_from_turn` conflates two concepts: "when does this officer enter the game" and "when can they become corps commander." Example: Dudaković has `available_from_turn: 80` but was in Bihać from day one — he just wasn't corps commander yet.

**Fix:** Change `available_from_turn` to mean "enters the game." Corps commander promotion is a **separate decision** by bot or player. Officers in the reserve pool can command operations immediately; promotion to corps command is voluntary.

**Officers requiring `available_from_turn` correction:**
- `arbih_dudakovic`: 80 → 0 (in Bihać from April 1992)
- Others to audit: any officer who was physically present but not yet in corps command

**Player/bot promotion choice:** Keep your best officer running individual ops (Dudaković personally leading raids), or promote him to corps commander (5th Corps benefits from his 5/5/5 stats but he can't personally lead ops). This is a real strategic tradeoff.

**Selection filter logic:**
```
eligible = officers.filter(o =>
    o.faction === faction &&
    o.rank === 'corps_commander' &&
    state[o.id].status === 'reserve' &&
    !state[o.id].assigned_operation &&
    (!o.enclave_lock || o.enclave_lock.enclave_id === getCorpsEnclave(corpsId) ||
     currentTurn >= (o.enclave_lock.locked_until_turn ?? Infinity))
);
```

An enclave-locked officer can command ops **within their enclave** — Orić commands Srebrenica raids, Dudaković commands 5th Corps ops inside the Bihać pocket. They just can't be sent elsewhere.

### Regionality Rules

1. **Corps commanders unavailable** — already commanding the corps, shown greyed
2. **Enclave-locked** — hard constraint, cannot leave pocket
3. **Home corps** — best fit, no penalty, shown as "HOME CORPS"
4. **Compatible corps** — small penalty (-1 competence for 8 turns), shown with note
5. **Out of region** — large penalty (-2 competence for 12 turns), shown with amber warning
6. **Army HQ** — `rank: 'army_commander'` or `rank: 'deputy'` unavailable (Mladić, Delić cannot be assigned to corps ops)

The player sees all officers of their faction in one list — available ones selectable, unavailable ones greyed with reason. This teaches the player the roster and makes enclave isolation feel real.

### Bot Behavior

The bot uses the same filter + the existing `selectOperationCommander()` priority cascade (home → compatible → any). No change needed except adding the enclave lock check to the filter.

---

## 5b. Player Experience Flow (Turn-by-Turn)

### Step 1: Draft Directive (existing OpsPlanningModal, unchanged)
Player names operation, picks type, assigns axes/brigades/objectives on the map. Submits.

### Step 2: Select Commander (new — Section 5a)
Commander selection screen appears. Player picks from available officers filtered by corps, enclave, availability. Selection shapes entire preparation.

### Step 3: Watch Preparation (new — op card in CorpsFrontPanel Ops tab)
The operation card evolves each turn with a **preparation progress bar**:

```
┌─────────────────────────────────────────────┐
│  OP. VRBAS-93                    PREPARING  │
│  Cdr: Col. Dudaković (★★★★★)               │
│                                             │
│  ▓▓▓▓▓▓▓░░░░░░░  Intel Collection          │
│  Confidence: 0.42 → target 0.30  ✓ MET     │
│                                             │
│  ░░░░░░░░░░░░░░░  Force Staging             │
│  8/10 brigades in position                  │
│                                             │
│  ░░░░░░░░░░░░░░░  Supply Check              │
│  ░░░░░░░░░░░░░░░  Assessment                │
│                                             │
│  Est. preparation: 2 more turns             │
└─────────────────────────────────────────────┘
```

### Step 4: Probe Decision (conditional — notification)
If commander orders a probe, player gets an action notification:

```
INTELLIGENCE INSUFFICIENT — Op Vrbas-93
Commander Dudaković recommends reconnaissance in force.
Target: Jajce approaches (sector 7)
Force: 2 brigades (7th Motorized, 12th Recon)

[APPROVE PROBE]  [DENY — PROCEED BLIND]  [ABORT OPERATION]
```

Probe results visible on map (small dashed arrow, distinct from full attack). Counter-probe: enemy sector intel card gets "ENEMY RECONNAISSANCE ACTIVITY DETECTED."

### Step 5: Briefing (key moment — modal or expanded card)
When commander reaches Phase D, the **Operation Briefing** appears (see Section 4, Phase D). Player decides: Launch / Postpone / Abort / Order Probe / Override Commander.

**Override:** -10 cohesion on participating brigades, commander modifier reduced 50%, officer loyalty drops. The "I know better" button — historically grounded (Praljak overriding Petković).

### Step 6: Execution (mostly unchanged)
Op card shows commander's assessment as context during execution:

```
  OP. VRBAS-93                      EXECUTING
  Cdr: Col. Dudaković — Assessment: FAVORABLE
  Intel said: 4-6 brigades → Actual: 5 (✓ accurate)
  Attacks: 3 launched, 2 victory, 1 stalemate
```

### UI Integration Map

| Component | Change |
|---|---|
| **CorpsFrontPanel Ops tab** | Op cards get preparation progress bar + sub-phase labels |
| **OpsPlanningModal** | Submit triggers commander selection screen; no other changes |
| **New: CommanderSelectionModal** | Officer roster with stats, availability, regional fit |
| **New: OperationBriefingModal** | Triggered when any player op reaches Phase D assessment |
| **SituationTab** | "Fragile Operations" section gains PREPARING ops with low readiness |
| **TopToolbar notifications** | Probe requests + briefing-ready alerts as turn notifications |
| **Map arrows** | Preparing ops show dashed/ghost arrows (staging, not committed) |

---

## 6. State Schema Changes

### On `NamedOfficer` (officer_types.ts)

```typescript
// New field — optional for backwards compatibility:
enclave_lock?: {
    enclave_id: string;
    locked_until_turn?: number;
};
```

### On `CorpsOperation` (game_state.ts)

```typescript
// New fields — all optional for backwards compatibility:
preparation_sub_phase?: 'intel_gathering' | 'force_staging' | 'supply_check' | 'assessment' | 'ready';
preparation_turns_elapsed?: number;
preparation_max_turns?: number;          // Derived from commander aggressiveness
intel_confidence_at_assessment?: number; // Snapshot for briefing/reporting
supply_readiness_at_assessment?: number;
force_ratio_estimate?: number;           // Commander's estimate (accuracy depends on intel + competence)
commander_assessment?: 'launch' | 'postpone' | 'abort';
postponement_count?: number;             // Max 2 before forced abort
active_probe?: {
    target_osid: string;
    brigade_ids: FormationId[];
    started_turn: number;
    resolved: boolean;
    result_confidence_gain?: number;
};
```

### On `TurnReport` (turn_pipeline_types.ts)

```typescript
preparation_events?: Array<{
    corps_id: string;
    operation_name: string;
    sub_phase: string;
    intel_confidence: number;
    supply_readiness: number;
    commander_assessment?: string;
    probe_ordered?: boolean;
}>;
```

### No changes to SectorIntelRecord, CorpsCommandState, or NamedOfficerState

All existing structures already have the data needed. The preparation phase CONSUMES existing data — it doesn't require new data production.

---

## 7. Implementation Phases

### Phase 1: Preparation Sub-States (core mechanic)
- Add `preparation_sub_phase` field to `CorpsOperation`
- Implement sub-phase transitions in `advanceSectorOffensives()`
- Commander reads sector_intel confidence for target sector
- Commander reads supply_readiness from existing function
- Go/no-go logic driven by competence + aggressiveness
- Anti-paralysis safety valve (max preparation turns)
- **Tests:** Extend `sector_offensive.test.ts` with preparation scenarios

### Phase 2: Probe as Sub-Action
- Implement `active_probe` on `CorpsOperation`
- Probe executes as single-turn sub-operation within preparation
- `PROBE_FORCE_COMMITMENT_FACTOR` reduces combat power
- Probe results update sector_intel confidence
- Counter-probe: defender gains intel about attacker's preparations
- Bot orders probes when confidence < threshold
- **Tests:** New `probe_preparation.test.ts`

### Phase 3: Player Commander Selection + Briefings
- Commander selection screen after directive submission (filter by corps, enclave, availability)
- `enclave_lock` field on `NamedOfficer` + filter in `selectOperationCommander()`
- Update `apr1992_officers.json` with `enclave_lock` for ~12 officers
- Structured briefing in `OpsPlanningModal` or new `OperationBriefingPanel`
- Go/no-go decision UI (launch / postpone / abort / order probe / override)
- Override penalty: cohesion loss + reduced commander modifier
- Operation status display showing preparation sub-phase progress
- Greyed-out roster showing unavailable officers with reasons

### Phase 4: Faction-Specific Initial Intel
- VRS initial intel confidence scenario parameter (JNA inheritance)
- ARBiH initial intel near-zero
- HVO initial intel moderate (Croatian SIS in Herzegovina)
- Calibration run to verify VRS early-war blitz still works with preparation gates

---

## 8. Design Risks and Mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| Bot ops never launch (cautious paralysis) | HIGH for low-agg | Anti-paralysis timer (max 7 turns). Army HQ can force-launch. Officer succession replaces paralyzed commanders. |
| Preparation too slow, war ends | MEDIUM | Max 8 turns worst case. VRS early-war: 1-2 turns (high agg + JNA intel + depot supply). |
| Probes more effective than attacks (cheese) | LOW | Probes reveal intel but don't capture territory. 2-brigade cap. Counter-probe telegraphs intentions. Exhaustion cost (5 pts). |
| Player frustration from waiting | HIGH if opaque | Full visibility into preparation progress. Briefings give agency. "All out" tempo compresses preparation. |
| Intel feedback loop | LOW | 1-turn pipeline delay. Monotonic confidence growth. Bounded preparation duration. |
| Calibration regression | MEDIUM | VRS initial intel 0.6+ means early-war blitz bypasses intel gate. Phase 4 dedicated calibration run. |

---

## 9. What Changes in n590+ Calibration

**Expected effects:**
- **Fewer total attacks** (some ops aborted or delayed by preparation)
- **Higher attack success rate** (only well-prepared attacks launch)
- **Fewer catastrophic outcomes** (blind attacks into fortresses prevented by intel gate)
- **Lukavica problem solved:** Commander probes Lukavica, discovers fortress-level defense, recommends abort instead of sending 5 catastrophic assaults
- **VRS early-war unchanged:** High initial intel + depot supply + aggressive commanders = fast preparation
- **ARBiH early-war fewer ops:** Historically accurate — survival defense, not planned offensives
- **Total casualties may decrease** (fewer pointless attacks), offset by higher casualties per battle (better-prepared attacks are more committed)

---

## 10. Historical Validation Checklist

- [ ] VRS Operation Corridor: 2-3 turn preparation (JNA intel + depot supply + aggressive doctrine)
- [ ] ARBiH early war: operations rare, local, desperate (low intel + no supply + weak officers)
- [ ] ARBiH late war: operations have real preparation cycle (improved officers + better intel + supply)
- [ ] HVO with HV support: 2-3 turn preparation (Croatian intel + Split supply line)
- [ ] Aggressive commanders (Dudakovic, Mladic) attack with lower thresholds
- [ ] Cautious commanders (Boric, early ARBiH) delay or abort
- [ ] Praljak-type commanders: launch without adequate preparation, suffer consequences
- [ ] Probe before Corridor-type major ops: intel gathered, weak points identified, then main assault
- [ ] No 5× catastrophic attacks on same fortified position (Lukavica pattern eliminated)
