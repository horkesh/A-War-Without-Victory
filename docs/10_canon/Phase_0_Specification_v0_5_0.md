# Phase 0 Specification — Pre-War Phase

**Project:** A War Without Victory
**Phase:** 0 (Pre-War)
**Version:** v0.5.0
**Status:** Canon (consolidated v0.3 + v0.4)
**Date:** 2026-02-02

---

## 1. Purpose and Scope

Phase 0 models the political, organizational, and alliance struggle before sustained organized violence becomes self-sustaining.

This phase exists to:
- Model organizational preparation and institutional positioning
- Allow players to shape early-war asymmetries through capital allocation
- Create initial conditions without scripting outcomes
- Establish alliance states and declaration pressures before war begins
- Initialize Stability Scores and authority states for all municipalities

Phase 0 does NOT:
- Create military formations
- Allow control transfer via force
- Resolve combat or sustained fronts
- Predetermine territorial outcomes
- Script historical events

---

## 2. Conceptual Definition

The Pre-War Phase represents the period from Yugoslavia's disintegration (Sept 1991) through the outbreak of sustained organized violence in Bosnia and Herzegovina (approximately April 1992).

During this period:
- Political control exists (based on 1990 elections and institutional dominance)
- Armed groups organize clandestinely
- Authority erodes in contested areas
- Inter-ethnic tensions escalate
- International recognition crisis unfolds
- Declarations (RS, HRHB) may emerge from accumulated pressure

Pre-War Phase is about **shaping the war that will occur**, not fighting it.

---

## 3. Canonical Inputs (Locked)

Phase 0 operates on fixed historical data representing late 1991 initial conditions.

### 3.1 Initial Political Control

**Source:** `data/source/municipalities_1990_initial_political_controllers.json`

Each municipality has a political controller determined by:
- 1990 election results (primary factor)
- Institutional dominance (SDA, SDS, HDZ control of municipal government)
- Demographic composition (secondary factor, never sole determinant)

Political controller ∈ {RBiH, RS, HRHB, null}

**Null control** is rare and represents municipalities where no faction exercises credible authority at game start.

### 3.2 Demographic Data

**Source:** `data/source/bih_census_1991.json`

Per-municipality demographic composition:
- Bosniak population %
- Serb population %
- Croat population %
- Other/Yugoslav population %

Used for Stability Score calculation and Control Strain potential.

### 3.3 Infrastructure Data

**Source:** `data/derived/settlements_substrate.geojson` and related

- Settlement locations and connectivity
- Strategic routes and corridors
- Geographic isolation factors
- Adjacency relationships

Used for Stability Score geographic vulnerability factors.

### 3.4 Institutional Presence (Historical Research)

**Source:** Historical research (Balkan Battlegrounds, expert sources)

Initial state of:
- Police loyalty (per municipality: loyal/mixed/hostile to controlling faction)
- Territorial Defense (TO) control (per municipality: controlled/contested/hostile)
- SDS organizational penetration (per municipality)
- Patriotska Liga presence (per municipality)
- JNA garrison locations and strength

**Note:** These values are research-derived, not procedurally generated.

**Implementation-note (2026-02-16, non-normative):** Current runtime initialization uses a deterministic A/B/C proxy seeding path for municipality organizational penetration (A = municipality controller, B = faction-aligned population share threshold, C = planned war-start OOB brigade presence). This is tracked as implementation detail in canon references and may be replaced by full research-derived municipality tables in a future canon update.

---

## 4. Phase 0 Systems

### 4.1 Pre-War Capital

Each faction starts with asymmetric **Pre-War Capital** pools representing organizational capacity, legitimacy, and external support.

**Initial Capital (tuning parameters):**
- **RS/SDS:** 100 points (institutional advantage, JNA coordination, FRY support)
- **RBiH:** 70 points (government legitimacy, demographic majority, limited preparation)
- **HRHB:** 40 points (late formation, external dependence on Croatia, limited base)

Capital is spent on Pre-War Phase actions.

Default rule: capital is non-renewable.

**Capital Scarcity:**
Capital pools are insufficient to invest everywhere. Players must prioritize.

#### 4.1.1 Conditional Capital Earn (Scenario-Gated)

When a scenario defines scheduled referendum and war-start turns (`phase_0_scheduled_referendum_turn`, `phase_0_scheduled_war_start_turn`), factions may earn additional pre-war capital via deterministic per-turn trickle.

**Earn Rule:**
- Per turn, each faction gains a fixed `PREWAR_CAPITAL_TRICKLE_PER_TURN` amount.
- Application order is deterministic: canonical faction order (`RBiH`, `RS`, `HRHB`).
- Trickle is additive to `prewar_capital` and constrained by a fixed reserve cap (`PREWAR_CAPITAL_TRICKLE_MAX_BONUS`) above each faction's initial capital.
- When scenario does NOT define scheduled Phase 0 timing, capital remains strictly non-renewable per §4.1.

**Design Intent:**
Preserve scarcity and prioritization while reducing early-exhaustion dead turns in longer pre-war scenarios (e.g. Sep 1991 -> Apr 1992).

**Implementation-note (2026-02-17, non-normative):** Sep 1991 calibration runs (20w/31w) validated constants `PREWAR_CAPITAL_TRICKLE_PER_TURN=1` and `PREWAR_CAPITAL_TRICKLE_MAX_BONUS=20`; all factions reach cap by turn 20; no tuning required. See [SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md](../40_reports/convenes/SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md).

---

### 4.2 Organizational Penetration Investment

Players allocate capital to strengthen organizational presence in municipalities or regions.

**Investment Types:**

#### 4.2.1 Police Organization

**Effect:** Improves Police Loyalty factor in target municipality/region

**Cost:** 5 capital per municipality, 15 capital per region (3-5 municipalities)

**Outcomes:**
- Increases Stability Score organizational factor
- Reduces militia emergence friction in Phase I
- Improves authority consolidation speed (if control held in war)

**Constraints:**
- Cannot invest in hostile-majority municipalities (blocked by demographics)
- Effect is probabilistic (investment improves odds, doesn't guarantee control)

#### 4.2.2 Territorial Defense (TO) Positioning

**Effect:** Influences TO control state in target municipality/region

**Cost:** 8 capital per municipality, 25 capital per region

**Outcomes:**
- Increases Stability Score organizational factor significantly
- Provides militia nucleus in Phase I (faster emergence)
- Provides initial equipment access (small arms, light weapons)

**Constraints:**
- Only available to RBiH (TO is BiH government institution)
- RS/HRHB must use other organizational methods

#### 4.2.3 Party Organization (SDS, SDA, HDZ)

**Effect:** Strengthens political party institutional control

**Cost:** 4 capital per municipality, 12 capital per region

**Outcomes:**
- Increases Stability Score organizational factor modestly
- Improves recruitment efficiency in Phase I
- Provides information and coordination infrastructure

**Constraints:**
- Less effective than armed organization (Police, TO)
- More effective in demographically aligned areas

#### 4.2.4 Paramilitary Organization (Patriotska Liga, SDS militias, HVO cadres)

**Effect:** Creates clandestine armed organization

**Cost:** 10 capital per municipality, 30 capital per region

**Outcomes:**
- Significant Stability Score organizational factor increase
- Militia emergence in Phase I is immediate (no delay)
- Initial cohesion bonus for Phase I militia

**Constraints:**
- High visibility (international pressure risk)
- Increases declaration pressure (may trigger early escalation)
- Cannot be done openly (incompatible with legitimacy claims)

---

### 4.3 Alliance Management (RBiH-HRHB Only)

RBiH and HRHB begin with an implicit anti-RS alliance.

**Alliance State:** Tracked as relationship value [-1, +1]
- +1: Full cooperation
- 0: Neutral/strained
- -1: Hostile

**Initial State:** +0.6 (aligned but no unified command)

**Alliance Actions:**

#### 4.3.1 Coordinated Investment

RBiH and HRHB may coordinate organizational investments in mixed areas (Central Bosnia, Herzegovina).

**Effect:**
- Reduces capital cost by 20% for both factions in coordinated areas
- Preserves alliance state (no degradation)
- Creates shared authority structures (complicates later split)

**Trade-Off:**
- Slower unilateral consolidation
- Constrains future territorial division
- Preserves alliance for Phase I

#### 4.3.2 Unilateral Investment

Factions invest independently, even in mixed areas.

**Effect:**
- Full capital cost
- Alliance state degrades by -0.05 per unilateral action in contested territory
- Accelerates unilateral positioning
- Enables territorial division preparation

**Trade-Off:**
- Strains alliance
- May trigger early HRHB declaration
- Reduces coordination in Phase I

**Design Intent:**
Alliance management creates genuine dilemma: cooperation vs preparation for eventual split.

---

### 4.4 Declaration Pressure Accumulation

Declarations (RS, HRHB) are NOT player-triggered buttons. They emerge when conditions are met.

#### 4.4.1 RS Declaration

**Enabling Conditions:**

1. **Organizational Threshold:** RS organizational penetration in Serb-majority municipalities ≥ 60% coverage
2. **JNA Coordination:** JNA transition triggered or imminent
3. **Relationship Breakdown:** RBiH-RS relationship ≤ -0.5 (hostile)
4. **External Support:** FRY (Serbia) recognition confirmed

**Pressure Accumulation:**
When ALL enabling conditions met, RS declaration pressure accumulates at +10 per turn.

When pressure ≥ 100, RS declares independence.

**Player Influence:**
- Players can accelerate conditions (invest in organization, escalate tensions)
- Players can delay conditions (avoid escalation, maintain ambiguity)
- Players CANNOT force or prevent if conditions objectively met

**Effects of RS Declaration:**
- Legitimacy: +0.2 internal (RS-controlled areas), -0.3 external (international isolation)
- Authority: Consolidation speed +50% in RS core territories
- RBiH: +0.1 legitimacy (victim narrative, defensive framing)
- War escalation threshold: Reduced by 30% (violence more likely)
- International: Recognition crisis, sanctions eligible, arms embargo pressure

**Declaration Timing:**
Historical window: January-April 1992
Game window: Emergent (may occur earlier or later based on conditions)

#### 4.4.2 HRHB Declaration

**Enabling Conditions:**

1. **Organizational Threshold:** HRHB organizational penetration in Croat-majority municipalities ≥ 50% coverage
2. **External Patron:** Croatian (Zagreb) government support confirmed
3. **Alliance Strain:** RBiH-HRHB relationship ≤ +0.2 (strained or worse)
4. **War Context:** RS declared OR sustained violence begun (Phase I started)

**Pressure Accumulation:**
When ALL enabling conditions met, HRHB declaration pressure accumulates at +8 per turn.

When pressure ≥ 100, HRHB declares (Herzeg-Bosna entity).

**Player Influence:**
Same as RS (influence conditions, cannot force/prevent).

**Effects of HRHB Declaration:**
- Alliance: RBiH-HRHB relationship -0.4 immediately (severe strain)
- Authority: Split in mixed municipalities (Mostar, Travnik, Vitez, etc.)
- Legitimacy: -0.4 international (severe cost, "betraying alliance"), +0.15 internal (Croat areas)
- Patron: Croatian support increases (+0.2 aid), international pressure increases
- RBiH: -0.2 legitimacy (alliance failure), recruitment in mixed areas contested

**Declaration Timing:**
Historical window: Late 1992 - early 1993 (gradual institutionalization)
Game window: Emergent (depends on alliance strain and war conditions)

**Design Constraint:**
HRHB declaration may NEVER occur if alliance is maintained.
This is not a scripted event—it is a possible outcome of systemic interaction.

---

### 4.5 Stability Score Initialization

At game start (before any Pre-War investments), each municipality receives an initial Stability Score.

**Formula:**

```
Stability Score = Base (50)
                + Demographic Factors
                + Organizational Factors
                - Geographic Vulnerabilities
```

**Demographic Factors:**
- Controller's population >60%: +25 (Strong Majority)
- Controller's population 50-60%: +15 (Majority)
- Controller's population 40-50%: +5 (Plurality)
- Controller's population <40%: -15 (Minority, Vulnerable)

**Organizational Factors (Initial):**
- Police Loyalty:
  - Loyal to controller: +15
  - Mixed: -10
  - Hostile to controller: -15

- TO (Territorial Defense) Control:
  - Controlled by faction: +15
  - Contested: -10
  - Lost: 0

- SDS Penetration (affects non-RS areas):
  - Strong SDS presence in RBiH/HRHB area: -15

- Patriotska Liga (affects RBiH areas):
  - Strong PL presence in RBiH area: +10

- JNA Presence:
  - JNA garrison in RS-aligned area: +10
  - JNA garrison in non-RS area: -10 (threatening presence)

**Geographic Vulnerabilities:**
- Adjacent to hostile demographic majority territory: -20
- Strategic route/corridor location: -10
- Isolated/enclave (no friendly connection): -10
- Connected to friendly rear: +10

**Stability Bands:**
- 80-100: **Very Stable** (extremely resistant to flip)
- 60-80: **Stable** (secure control)
- 40-60: **Unstable** (vulnerable under pressure)
- 20-40: **Very Unstable** (high flip risk)
- 0-20: **Collapse Imminent** (will flip quickly in war)

**Pre-War Investment Effects:**
Organizational investments during Pre-War Phase modify organizational factors, changing Stability Scores.

**Output:**
Final Stability Scores (post-investment) are carried forward to Phase I as initial flip resistance.

---

### 4.6 Authority Degradation (Pre-War)

During Pre-War Phase, authority may degrade in contested municipalities.

**Authority States:**
- **Consolidated:** Full governance capacity (recruitment, taxation, services)
- **Contested:** Partial governance, competing claims
- **Fragmented:** Minimal governance, localized control only

**Degradation Triggers:**
- Opposing faction organizational investment in same municipality
- Demographic hostility + opposing organization
- Institutional capture by opposing faction
- Violence (isolated incidents, not sustained combat)

**Authority Degradation Effects:**
- Reduces Stability Score slightly (-5 per degradation tier)
- Increases militia emergence friction in Phase I
- Increases Control Strain accumulation potential (Phase I)

**Authority Does NOT Affect:**
- Political control (control does not flip)
- Turn order priority
- Capital availability

**Design Intent:**
Authority degradation shows the erosion of institutional control before war, without flipping control.

---

## 5. Pre-War Turn Structure

Pre-War Phase uses a simplified turn structure:

**Turn Duration:** 1 week (same as war phases)

**Turn Sequence:**

1. **Directive Phase:** Players allocate Pre-War Capital to actions
2. **Investment Resolution:** Organizational investments resolve, modify factors
3. **Alliance Update:** Alliance strain/cooperation modifies relationship state
4. **Declaration Pressure:** RS/HRHB declaration pressure accumulates if conditions met
5. **Declaration Check:** If pressure ≥ threshold, declaration triggers
6. **Authority Degradation:** Contested municipalities may degrade authority
7. **Stability Score Update:** Reflect organizational and authority changes
8. **Escalation Check:** Check if sustained violence threshold met (transition to Phase I)

**No Combat, No Flips, No Formations:** These systems do not exist in Pre-War Phase.

---

## 6. Transition to Phase I (Early-War)

Pre-War Phase ends when **Escalation Threshold** is met.

**Escalation Threshold (all must be true):**

1. **Sustained Armed Clashes:** Violent incidents between organized armed groups occur for 2+ consecutive weeks
2. **Monopoly Collapse:** Government monopoly on force broken in 3+ municipalities (armed groups openly operating)
3. **Hostile Relationships:** At least one faction pair relationship ≤ -0.6 (hostile)

**Transition is Emergent:**
- May occur naturally from Pre-War tensions
- May be triggered by RS declaration (declaration increases violence likelihood)
- May be delayed by players avoiding escalation
- Is NOT date-triggered (historical April 1992 start is reference, not mandate)

**Transition is Irreversible:**
Once Phase I begins, cannot return to Pre-War Phase.

---

## 7. Phase 0 → Phase I Hand-Off

Phase 0 outputs become Phase I initial conditions.

**Hand-Off Data:**

### 7.1 Stability Scores
- All municipalities: Final Stability Scores (post-investment)
- Used immediately in Phase I flip mechanics

### 7.2 Organizational Factors
- Police Loyalty states (all municipalities)
- TO Control states (all municipalities)
- SDS/SDA/HDZ/PL/JNA presence values
- Used for militia emergence speed and initial cohesion

### 7.3 Alliance State
- RBiH-HRHB relationship value (range [-1, +1])
- Determines coordination capacity, fragmentation risk, HRHB declaration eligibility

### 7.4 Declaration States
- RS: Declared or not
- HRHB: Declared or not (if war started late enough)
- Declaration effects (legitimacy, authority modifiers) persist

### 7.5 Authority States
- Per-municipality authority tier (Consolidated/Contested/Fragmented)
- Affects militia emergence, Control Strain, consolidation speed

### 7.6 Political Control
- Unchanged from Pre-War start (control does NOT flip in Pre-War Phase)
- Serves as initial condition for Phase I contestation

**No Values Reset:**
All Pre-War consequences persist into Phase I. No "clean slate."

---

## 8. Output Contract

Phase 0 MUST produce:

```javascript
{
  // Per-municipality outputs
  municipalities: {
    [mun_id]: {
      political_control: faction_id,        // Unchanged from init
      stability_score: number,              // Post-investment (0-100)
      authority_state: string,              // Consolidated/Contested/Fragmented
      organizational_factors: {
        police_loyalty: string,             // loyal/mixed/hostile
        to_control: string,                 // controlled/contested/lost
        sds_penetration: number,
        patriotska_liga: number,
        jna_presence: boolean
      }
    }
  },

  // Faction-level outputs
  factions: {
    RBiH: {
      capital_remaining: number,            // Unspent capital
      declaration_state: 'not_applicable'
    },
    RS: {
      capital_remaining: number,
      declaration_state: 'declared' | 'not_declared',
      declaration_turn: number | null
    },
    HRHB: {
      capital_remaining: number,
      declaration_state: 'declared' | 'not_declared',
      declaration_turn: number | null
    }
  },

  // Alliance state
  alliance: {
    rbih_hrhb_relationship: number        // Range [-1, +1]
  },

  // Transition info
  transition: {
    phase_0_end_turn: number,
    phase_1_start_turn: number,
    escalation_reason: string             // What triggered transition
  }
}
```

---

## 9. Determinism and Auditability

Phase 0 enforces:
- **Deterministic capital allocation resolution** (same inputs → same outputs)
- **No randomness** in organizational investment effects (deterministic formulas)
- **Stable ordering** of all faction actions (canonical faction order: RBiH, RS, HRHB)
- **Reproducible declaration triggers** (same conditions → same pressure accumulation)

**Auditability:**
All Pre-War actions and their effects are logged and auditable.

Players can reconstruct why Stability Scores have specific values at Phase I start.

---

## 10. Design Constraints (Explicit)

### 10.1 No Outcome Scripting

Pre-War Phase creates **asymmetries and pressures**, NOT predetermined outcomes.

Poor Pre-War investment does NOT guarantee Phase I defeat.
Excellent Pre-War investment does NOT guarantee Phase I victory.

Pre-War shapes the starting conditions; Phase I gameplay determines results.

### 10.2 No Formations

No militia, brigades, or military formations exist in Pre-War Phase.

Organizational investment creates **potential** for fast mobilization, not existing forces.

### 10.3 No Control Flips

Political control is stable during Pre-War Phase.

Violence may occur (isolated incidents) but does NOT flip municipal control.

Authority degrades; control persists.

### 10.4 No Combat Systems

No pressure generation, no fronts, no combat resolution.

Pre-War Phase is preparation, not warfare.

### 10.5 Capital Scarcity

Capital pools are intentionally insufficient to invest everywhere.

Players MUST prioritize, creating strategic trade-offs.

All factions leave some municipalities under-prepared.

### 10.6 Declaration Emergence

Declarations are NOT player buttons.

Declarations emerge from accumulated pressure when conditions are met.

Players influence timing (slightly) but cannot force or prevent if conditions met objectively.

---

## 11. Non-Effects (Explicit)

Phase 0 does NOT:
- Create military formations
- Generate pressure or combat outcomes
- Flip political control via force
- Instantiate Areas of Responsibility
- Activate supply systems (logistics not yet militarized)
- Trigger Control Strain accumulation (no coercive control yet)
- Open negotiation windows (no war to negotiate)
- Accumulate exhaustion (war has not begun)

**Why These Are Absent:**
Pre-War Phase models political and organizational positioning, not warfare.

Warfare begins in Phase I.

---

## 12. Canonical Interpretation (Binding)

The Pre-War Phase models the struggle for organizational positioning and political legitimacy before sustained violence erupts.

It allows players to shape initial asymmetries through scarce capital allocation, creating strategic trade-offs between breadth (many municipalities) and depth (strong investment in key areas).

Declarations (RS, HRHB) emerge from systemic conditions rather than scripted dates or player buttons, maintaining the simulation's commitment to emergent rather than predetermined history.

Authority erosion and organizational competition occur, but control does not flip—the war begins on a foundation of contested legitimacy, not clean territorial division.

Pre-War Phase ensures the war starts with meaningful asymmetries while preserving the possibility space for divergent outcomes.

---

## 13. Freeze Status

**Phase 0 Pre-War Phase specification is Canon v0.5.0 (consolidated).**

Any future modification will require:
- Explicit phase advancement or canon addendum
- Ledger entry in PROJECT_LEDGER.md
- Justification against Engine Invariants
- Design rationale for changes

---

## 14. v0.4 Additions

### Stability-based contested control (System 11)
- Phase 0 stability scores must produce initial control_status values:
  - SECURE, CONTESTED, HIGHLY_CONTESTED.
- control_status is attached to municipality/settlement control initialization and carried into Phase I.
- Thresholds:
  - SECURE: stability_score >= 60
  - CONTESTED: 40 <= stability_score < 60
  - HIGHLY_CONTESTED: stability_score < 40
- Stability score components include demographic, organizational, and geographic factors as defined in the Phase 0 stability rules.

### Baseline external constraint states
- Patron state, embargo profiles, and capability baselines are initialized deterministically at Phase 0 start if defined in Systems Manual v0.4.
- These baselines do not override referendum gating or war start invariants.

### RBiH–HRHB relationship (Phase 0 link to Phase I §4.8)
- The RBiH–HRHB relationship used for HRHB declaration enabling conditions (e.g. "relationship ≤ +0.2" for strained or worse) is the **same** numeric quantity as Phase I §4.8 (`phase_i_alliance_rbih_hrhb`).
- When Phase 0 runs before Phase I, scenario or init may supply an initial value for this relationship; when Phase I state exists, Phase 0 declaration logic must use that state value so that declaration and Phase I flip behaviour are consistent.

---

## 15. v0.5 Canon consolidation

This document (v0.5.0) consolidates the full Phase 0 Specification v0.3.0 with all v0.4 Additions. No content from v0.3 has been deleted.
