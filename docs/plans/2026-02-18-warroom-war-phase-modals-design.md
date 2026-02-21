# Warroom War-Phase Modals Design

**Date:** 2026-02-18
**Status:** Design approved, updated 2026-02-18 for brigade AoR redesign cross-impacts

## Problem

The warroom has 7 interactive desk objects producing modals. Phase 0 (pre-war) is richly served with thematic, data-driven content. Once war starts (Phase I/II), most modals either hide entirely (Magazine, Reports), go silent (Newspaper), display fake placeholder data (Faction Overview uses `settlements * 500` for personnel, hardcodes `totalDisplaced = 0`), or show "coming soon" (Diplomacy).

Meanwhile, the engine produces rich wartime data every turn: casualty ledger (KIA/WIA/MIA per formation), displacement state (camps, refugees, civilian casualties by ethnicity), exhaustion trends, supply status, formation strength/cohesion/posture, front pressure, corps operations, alliance state, patron pressure, embargo profiles. None of this reaches the warroom.

## Design Principles

### 1. Thematic Repurposing
Each desk object keeps its physical identity but its modal content transforms for war. No new desk objects; no visual changes to the baked PNG background.

### 2. Three-Tier Fog of War
All war-phase modals follow these visibility rules:

| Tier | Visibility | Examples |
|------|-----------|----------|
| **Tier 1 — Own faction** | Full transparency, exact numbers | Your casualties, your formations, your displacement, your patron, your exhaustion |
| **Tier 2 — Contact-revealed** | Partial, earned through combat | Enemy formations fought this turn (approximate strength), front pressure on engaged edges, garrison presence at attacked/defending settlements |
| **Tier 3 — Hidden** | Never shown directly | Enemy exhaustion, enemy patron commitment, enemy internal casualties, enemy supply, enemy corps operations. Hints only via newspaper/ticker framing |

### 3. Faction-Specific Content
Each faction has a different wartime experience. Where modals differ by faction, the design specifies per-faction content. The player sees their war, not an omniscient dashboard.

---

## Desk Object 1: Newspaper — War Communique

### Phase 0 (unchanged)
Event-driven headlines from `phase0_events_log`. Start brief on turn 0. Faction-specific masthead. Works well, keep as-is.

### Phase I / Phase II

Same visual structure: masthead, date (T-1), headline, subhead, photo area, photo caption, body columns. Content draws from battle resolution, control flips, and displacement.

#### Headline Selection (priority order, first match wins)

| Priority | Trigger | Example Headline |
|----------|---------|-----------------|
| 1 | 3+ settlements flipped this turn | "ENEMY OFFENSIVE PUSHES INTO [REGION]" / "OUR FORCES LIBERATE [SETTLEMENT]" |
| 2 | Highest-casualty battle this turn | "FIERCE FIGHTING AT [SETTLEMENT]" |
| 3 | Hostile takeover timer matured / camp created | "THOUSANDS FLEE [MUNICIPALITY]" |
| 4 | Alliance event (ceasefire, Washington, breakdown) | Faction-specific framing |
| 5 | Exhaustion milestone (25/50/75%) | "STRAIN SHOWING ON [FACTION] FORCES" |
| 6 | Sustainability collapse | "SUPPLY CRISIS IN [MUNICIPALITY]" |
| 7 | Fallback | Generic front status summary |

#### Fog of War in Headlines
- **Your losses**: Downplayed ("Light casualties in defensive action near Travnik")
- **Enemy losses**: Inflated ("Heavy enemy losses reported")
- **Your territorial losses**: Reluctant ("Forces withdraw to prepared positions")
- **Your gains**: Celebrated ("Liberation of [settlement]")
- **Displacement**: Your population = humanitarian framing; enemy population = mentioned briefly or omitted

#### Photo Area — Staff Map Crop
Replace `[Photo Area]` placeholder with a rendered staff-map crop of the relevant area (battle location, territorial shift, displacement zone). Uses the same rendering pipeline as the staff map.

**Fog of war applies to the photo**: shows only player-known control, player formations, contact-revealed front lines. Enemy territory beyond the front rendered as muted/dark fill. The newspaper photo is the faction's press working from its own intelligence, not an omniscient view.

#### Data Sources
- `political_controllers` delta (current vs previous turn snapshot)
- `casualty_ledger` (battle outcomes)
- `displacement_state` / `displacement_camp_state` / `hostile_takeover_timers`
- `civilian_casualties`
- `phase_ii_exhaustion`
- `sustainability_state`
- `rbih_hrhb_state` / `phase_i_alliance_rbih_hrhb`

#### New File
- `src/ui/warroom/content/war_headline_templates.ts` — Phase I/II headline template system, same pattern as existing `headline_templates.ts`

---

## Desk Object 2: Magazine — Strategic Assessment

### Phase 0 (unchanged)
Monthly operational review: pre-war capital, org coverage, stability, declaration pressure. Keep as-is.

### Phase I / Phase II

Transforms into a faction dashboard with hard numbers. Published every 4 turns (monthly cadence). Title changes to faction-specific war publication:
- RBiH: "BOSNIAN DEFENCE REVIEW"
- RS: "SERBIAN STRATEGIC DIGEST"
- HRHB: "CROATIAN DEFENCE MONTHLY"

#### Sections

**1. FORCE STRENGTH**
- Total personnel (summed from `formations[].personnel` where `faction === playerFaction && status === 'active'`)
- Active brigades count / total brigades
- Corps count
- Average cohesion across active brigades
- Average readiness
- Delta arrows vs last issue (4 turns ago — store snapshot)
- Average AoR concentration ratio: `average(brigade.aor_count / brigade.max_aor)` — 1.0 = fully spread, 0.25 = fully concentrated. New metric from brigade AoR redesign.
- Brigades below AoR cap due to casualties: brigades that have lost enough personnel that their cap has dropped below their current AoR settlement count (must shed settlements)

**2. CASUALTIES THIS MONTH**
- Military: KIA / WIA / MIA for the last 4 turns (monthly delta) and cumulative total — from `casualty_ledger[playerFaction]`
- Equipment lost: tanks / artillery / AA — same monthly vs cumulative split
- WIA pending return: sum of `formations[].wounded_pending` across player brigades

**3. TERRITORIAL STATUS**
- Settlements controlled / total, percentage
- Delta since last issue
- Settlements gained this month (list, max 5, "...and N more")
- Settlements lost this month (same format)

**4. POPULATION & DISPLACEMENT**
- Total displaced from player-controlled territory (sum `displacement_state[mun].displaced_out` for controlled municipalities)
- Refugees received (sum `displacement_state[mun].displaced_in`)
- Civilian casualties: killed + fled abroad for player's ethnicity from `civilian_casualties`
- Active displacement camps count from `displacement_camp_state`
- Active hostile takeover timers in player territory

**5. EXHAUSTION & SUPPLY**
- Faction exhaustion level from `phase_ii_exhaustion[playerFaction]` with trend arrow from `loss_of_control_trends.by_faction[playerFaction].exhaustion_trend`
- Supply breakdown: adequate / strained / critical settlement counts (derived from supply state)
- Sustainability collapses: municipalities with `sustainability_state[mun].collapsed === true`

**6. ENEMY ASSESSMENT (Tier 2/3 — fog-filtered)**
- Per enemy faction:
  - "Estimated strength: UNKNOWN" (default)
  - "Enemy forces engaged this month: ~N brigades" (count of unique enemy `FormationId`s encountered in battle via `casualty_ledger[enemyFaction].per_formation` keys that had new entries this month)
  - No exact personnel, exhaustion, or supply numbers

#### Data Sources
- `formations` (own faction personnel, cohesion, readiness, composition)
- `casualty_ledger` (own and enemy per-formation — enemy used only for contact count)
- `political_controllers` (territorial status)
- `displacement_state`, `displacement_camp_state`, `hostile_takeover_timers`
- `civilian_casualties`
- `phase_ii_exhaustion`, `loss_of_control_trends`
- Supply state derivation

#### Monthly Snapshot Storage
Store previous-issue snapshot in modal instance or a lightweight `warroom_magazine_snapshot` field so deltas can be computed. Alternatively, compute from `loss_of_control_trends.previous_turn_snapshot` (already stores prior-turn data).

---

## Desk Object 3: Reports — Operational Intelligence Brief

### Phase 0 (unchanged)
Classified sit-rep with municipality intelligence. Keep as-is.

### Phase I / Phase II

Transforms into a field intelligence briefing. Same visual aesthetic: RESTRICTED stamps, FROM/TO headers, monospace body, faction-specific headers (already defined in `REPORT_HEADERS`). Classification changes to "CONFIDENTIAL" during war.

War-phase FROM/TO headers:
- RBiH: FROM "2nd Corps Intelligence Section" TO "ARBiH General Staff, Sarajevo"
- RS: FROM "Main Staff Intelligence Department" TO "VRS Supreme Command, Pale"
- HRHB: FROM "HVO Intelligence Section" TO "HVO General Staff, Mostar"

#### Sections

**1. FRONT STATUS**
Top 5 most pressured front edges where player brigades are engaged.
- Location: settlement names on both sides of the edge
- Pressure value and trend (from `front_pressure[edge].value`)
- Friction level (from `front_segments[edge].friction`)
- Corridor status: open / brittle / cut
- Sorted by threat level (highest pressure against player first)
- **Front tier** for the player-side settlement: DEFENDED (brigade name), GARRISONED (militia strength value), or EXPOSED (no garrison — shown in red)
- EXPOSED front edges are critical warnings — surfaced in red before the main table

**2. FORMATION READINESS**
Player's 5 weakest brigades by personnel or cohesion.
- Formation name
- Personnel count
- Cohesion level
- Current posture
- Disrupted status (yes/no)
- WIA pending return count
- Movement status: DEPLOYED / PACKING / IN TRANSIT / UNPACKING (from `brigade_movement_state`)
- Sorted worst-first

> **Brigade AoR note**: A brigade IN TRANSIT has 0% garrison effectiveness — if it appears in the weakest-5 list with IN TRANSIT status, it is an emergency requiring immediate attention.

**3. ENEMY CONTACT (Tier 2 — contact-revealed)**
Enemy formations encountered in battle this turn.
- Formation name (if identified from battle resolution)
- Approximate strength category: WEAK (<400 personnel), MODERATE (400-800), STRONG (800-1200), FORTRESS (>1200)
- These align with the brigade AoR cap thresholds — a FORTRESS brigade holds 4 settlements at full garrison
- Location of contact (settlement where battle occurred)
- Formations not engaged this turn: not shown

**4. DISPLACEMENT ALERTS**
- Active hostile takeover timers in player territory: municipality, turns remaining before camp creation
- Displacement camps holding population: municipality, population held
- Municipalities where minority flight is ongoing (from `minority_flight_state`)
- **ENCIRCLED FORMATIONS** (all factions): formation name, AoR settlements, turns encircled, supply status — derived from `brigade_movement_state` encirclement detection. Any faction's brigade can be encircled under the new AoR system.
- RBiH enclave sub-list: Srebrenica, Gorazde, Zepa, Bihac — named enclave status shown separately below the mechanical encirclement list

**5. SUSTAINABILITY WARNINGS**
- Surrounded municipalities (from `sustainability_state[mun].is_surrounded`)
- Unsupplied streak counts (`sustainability_state[mun].unsupplied_turns`)
- Municipalities approaching collapse (sustainability_score < 20)
- Collapsed municipalities (sustainability_score <= 0)

**6. CORPS OPERATIONS**
Active corps operations for player's own forces:
- Operation name
- Type (general_offensive / sector_attack / strategic_defense / reorganization)
- Phase (planning / execution / recovery)
- Target area (settlement names)
- Corps stance (defensive / balanced / offensive / reorganize)

#### Data Sources
- `front_pressure`, `front_segments` (front status)
- `formations` (readiness, contact identification)
- `casualty_ledger` (enemy contact — which enemy formations took casualties)
- `hostile_takeover_timers`, `displacement_camp_state`, `minority_flight_state`
- `sustainability_state`
- `corps_command` (operations)
- Settlement graph for corridor derivation

---

## Desk Object 4: Faction Overview — Strategic Dashboard

### Phase 0 (unchanged)
Capital, investments, org coverage, control status, declaration pressure, alliance status. Keep as-is.

### Phase I / Phase II

Replaces the current placeholder-heavy `renderPhaseIPlus()`. Uses actual GameState data instead of fake multipliers.

#### Bug Fix
Current code: `(snapshot.authority.centralAuthority * 100).toFixed(0)%` — but `profile.authority` is already on a 0-100 scale, so this displays 5000% when authority is 50. Fix: display `profile.authority` directly as percentage.

#### Quadrants

**TERRITORY**
- Settlements controlled / total (from `political_controllers` — already works)
- Territory percentage
- **New**: Delta since last turn (settlements gained / lost)
- **New**: Municipalities with sustainability collapse

**MILITARY**
- Personnel: **sum from `formations[id].personnel`** where `formations[id].faction === playerFaction && formations[id].status === 'active'` (replaces `controlledSettlements * 500`)
- Active brigades / total brigades count
- Average cohesion across active brigades
- **New**: Equipment summary — total tanks / artillery / AA across all player formations from `formations[id].composition`
- Exhaustion: from `phase_ii_exhaustion[playerFaction]` (replaces `profile.exhaustion * 100` which may be stale or wrong scale)
- **Brigades in transit**: count of brigades with `brigade_movement_state.status === 'in_transit'` — shown as `IN TRANSIT: N` (single line; if >0, shown in amber)
- **OG detachment note**: "Active brigade personnel (excludes N OG detachments)" to clarify that donated OG personnel are temporarily absent from parent brigade totals

**CASUALTIES (new — replaces broken POPULATION quadrant)**
- Military: cumulative KIA / WIA / MIA from `casualty_ledger[playerFaction]`
- Civilian: killed + fled abroad from `civilian_casualties` for player ethnicity
- Equipment lost: tanks / artillery / AA cumulative from `casualty_ledger[playerFaction].equipment_lost`
- WIA pending return (sum across player formations)

**AUTHORITY & SUPPLY (replaces broken AUTHORITY quadrant)**
- Authority: `profile.authority` displayed correctly (0-100 scale, no multiplication)
- Legitimacy: `profile.legitimacy` if available
- Supply status: adequate / strained / critical count summary
- Exhaustion trend direction from `loss_of_control_trends`

**FORMATIONS section** — keep existing but enhance:
- Show personnel count next to each formation name
- Show formation kind (brigade / corps / army_hq)
- Show posture for brigades

**STRATEGIC WARNINGS** — replace fake threshold checks with real state queries:
- Sustainability collapses in player territory
- Surrounded brigades (`sustainability_state[mun].is_surrounded` for municipalities containing player formations)
- Supply corridors cut or brittle
- Exhaustion trend worsening
- Displacement camps at capacity
- Authority below 30 (critical)
- Alliance strained (RBiH/HRHB only, when alliance < 0.20)
- **Exposed front gaps**: "EXPOSED FRONT: N settlements undefended" when `militia_garrison[settlement] === 0` and settlement is front-active with no brigade (from `exposedFrontSettlements`)
- **Militia exhausted at front**: when militia pools at front-active settlements hit zero, warn "LOCAL DEFENSE DEPLETED: [municipality]"
- **Stale attack intelligence**: if player has staged attack orders against a settlement last probed/detected 3+ turns ago, warn "STALE INTELLIGENCE: attack target [settlement] last confirmed N turns ago"

#### Data Sources
- `formations` (personnel, cohesion, composition, posture, kind)
- `political_controllers` (territory)
- `casualty_ledger` (casualties)
- `civilian_casualties` (civilian losses)
- `phase_ii_exhaustion`, `loss_of_control_trends` (exhaustion)
- `sustainability_state` (supply/sustainability)
- `factions[].profile` (authority, legitimacy — displayed correctly)
- `rbih_hrhb_state` (alliance warnings)

---

## Desk Object 5: Telephone — Faction-Specific Diplomacy

### Phase 0 (unchanged)
"Line Dead" — diplomacy disabled. Keep as-is.

### Phase I / Phase II

The telephone becomes the **diplomatic channel**. Content is entirely faction-specific — each faction sees a fundamentally different modal when they pick up the phone.

### RS Telephone — "Belgrade Channel"

**PATRON STATUS (Tier 1)**
- Serbia commitment level: exact value from `patron_state.patron_commitment` with trend arrow (declining over time: 0.80→0.55)
- Material support level: `patron_state.material_support_level`
- Diplomatic isolation: `patron_state.diplomatic_isolation` (rising over time)

**CORRIDOR STATUS (Tier 1)**
- Posavina corridor state: open / brittle / cut — derived from corridor analysis on Brcko-Bijeljina-Bosanski Samac edge cluster
- If corridor cut: "LAND BRIDGE TO SERBIA SEVERED — patron support delivery compromised"
- Corridor is RS's diplomatic lifeline; its status belongs here

**NEGOTIATION (Tier 2)**
- IVP negotiation momentum: player's own engagement visible
- International pressure indicators (generic — "increasing" / "stable")

**ENEMY INTELLIGENCE (Tier 3)**
- No bilateral alliance to manage
- "No allied channels active" — RS fights alone with patron backing

### RBiH Telephone — "Alliance & International"

**ALLIANCE STATUS (Tier 1)**
- RBiH-HRHB relationship value: exact number from `phase_i_alliance_rbih_hrhb`
- Trend arrow (from recent turns)
- Bilateral incident count: `rbih_hrhb_state.bilateral_flips_this_turn`
- Stalemate counter: `rbih_hrhb_state.stalemate_turns` (consecutive zero-flip turns)
- Allied mixed municipalities list

**CEASEFIRE TRACKER (Tier 1/2 hybrid)**
Six preconditions displayed as a checklist:
| Condition | Visibility | Display |
|-----------|-----------|---------|
| C1: War duration >= 20 turns | Tier 1 | Exact turn count |
| C2: HRHB exhaustion > 35 | Tier 3 | "MET / NOT MET / UNKNOWN" |
| C3: RBiH exhaustion > 30 | Tier 1 | Exact value + threshold |
| C4: Stalemate >= 4 turns | Tier 1 | Exact count |
| C5: IVP momentum > 0.40 | Tier 2 | Approximate |
| C6: HRHB patron constraint > 0.45 | Tier 3 | "UNKNOWN" |

**WASHINGTON TRACKER (Tier 1/2 hybrid)**
Six preconditions, same fog treatment:
| Condition | Visibility | Display |
|-----------|-----------|---------|
| W1: Ceasefire active | Tier 1 | Yes/No |
| W2: Ceasefire >= 4 turns | Tier 1 | Turn count |
| W3: IVP momentum > 0.50 | Tier 2 | Approximate |
| W4: HRHB patron constraint > 0.55 | Tier 3 | "UNKNOWN" |
| W5: RS territory > 40% | Tier 2 | Approximate (from contact) |
| W6: Combined exhaustion > 55 | Tier 1/3 | Own known, HRHB unknown |

**PATRON STATUS (Tier 1)**
- International community commitment (rising: 0.60→0.80)
- Embargo impact: equipment access rate, ammunition resupply rate
- Smuggling efficiency (slowly improving)

**ARMS EMBARGO (Tier 1)**
- Heavy equipment access: 0.20
- Ammunition resupply rate: 0.30
- Maintenance capacity: 0.40
- External pipeline status: 0.40

### HRHB Telephone — "Zagreb Line"

**PATRON STATUS (Tier 1)**
- Croatian commitment: `patron_state.patron_commitment`
- Constraint severity: `patron_state.constraint_severity` — this is the number that eventually forces HRHB to make peace
- Material support level

**ALLIANCE STATUS (Tier 1)**
- RBiH-HRHB relationship value (same data, HRHB perspective)
- Patron drag visible: "Croatian pressure is [straining/stabilizing] the alliance" based on patron_commitment > 0.3 && alliance < 0.20
- Bilateral incident count and stalemate counter

**CEASEFIRE / WASHINGTON TRACKERS**
Same as RBiH but with fog reversed:
- HRHB's own exhaustion: Tier 1 (exact)
- HRHB's own patron constraint: Tier 1 (exact)
- RBiH's exhaustion: Tier 3 ("UNKNOWN")

**CAPABILITY OUTLOOK (Tier 1)**
- Post-Washington equipment boost preview:
  - "If Washington Agreement signed:"
  - "Equipment access: current → 0.65"
  - "Croatian support: current → 0.90"
  - "COORDINATED_STRIKE doctrine enabled"
  - "Joint pressure bonus vs RS: 1.15x"

#### Data Sources
- `factions[].patron_state` (patron commitment, diplomatic isolation, constraint severity, material support)
- `factions[].embargo_profile` (equipment access, ammunition, maintenance, pipeline)
- `phase_i_alliance_rbih_hrhb` / `rbih_hrhb_state` (alliance, ceasefire, Washington)
- `phase_ii_exhaustion` (own faction — for ceasefire conditions)
- Corridor derivation from settlement graph + `front_segments`
- `factions[].negotiation` (IVP momentum)

---

## Desk Object 6: Radio — News Ticker

### Phase 0 (unchanged)
Scrolling historical events from `ticker_events.ts`. Keep existing entries.

### Phase I / Phase II

Two interleaved streams scroll together:

#### Stream 1: Dynamic War Events (generated from GameState each turn)

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Control flips | "[FACTION] forces take [SETTLEMENT]" |
| 2 | Battles with casualties | "Heavy fighting reported near [SETTLEMENT]" |
| 3 | Displacement events | "Refugees flee [MUNICIPALITY] as fighting intensifies" |
| 4 | Civilian casualties | "Reports of civilian casualties in [REGION]" |
| 5 | Formation events (own) | "New brigade activated: [NAME]" |
| 5 | Formation events (enemy, Tier 2) | "Enemy reinforcements reported in [REGION]" |
| 5b | Brigade in transit (own, Tier 1) | "Elements of [BRIGADE] moving to reinforce [REGION]" |
| 5c | Front gap opened (enemy, Tier 2/3) | "Unconfirmed reports of reduced [FACTION] presence near [SETTLEMENT]" — triggered when enemy brigade moves out of recon range and last detection >3 turns stale |
| 5d | Probe contact (Tier 1/2) | "Reconnaissance elements make contact near [SETTLEMENT]" — own probe engaging; vague if received as contact report |
| 6 | Alliance/diplomatic | "Tensions rise between ARBiH and HVO" |
| 7 | Sustainability (own) | "Supply situation deteriorating in [MUNICIPALITY]" |

**Fog of war on the ticker**: The radio is a broadcast. Own events are specific ("3rd Corps activates"). Enemy events are vague ("reports of enemy movement in eastern Bosnia"). Civilian events are humanitarian ("thousands displaced"). The player learns to read between the lines.

#### Stream 2: Scripted Real-World Events (pre-authored, date-anchored)

Extend `ticker_events.ts` with ~220 weeks of coverage: September 1991 through December 1995. Categories:

- **international**: UN resolutions, EU summits, G7 meetings, Vance-Owen plan, Contact Group, Dayton
- **bih_international**: UNPROFOR deployment, no-fly zone enforcement, safe areas declared, NATO ultimatums, Markale massacre response, Operation Deliberate Force
- **world**: Sports (Jordan MVP, Barcelona/Lillehammer/Atlanta Olympics, World Cup 94), culture (Jurassic Park, Schindler's List, Forrest Gump), science/tech (Hubble repair, World Wide Web growth, Windows 95), politics (Clinton inauguration, Mandela president, EU Treaty of Maastricht), entertainment
- **regional**: Croatian War events (Operation Storm), Serbia/Montenegro developments, Macedonian independence

Both streams interleave naturally in the ticker — a battle report followed by "Barcelona Olympics open" followed by a displacement alert. Scripted events provide texture and grounding; dynamic events provide gameplay relevance.

#### Data Sources (dynamic stream)
- `political_controllers` delta
- `casualty_ledger` (battle events)
- `displacement_state`, `displacement_camp_state`
- `civilian_casualties`
- `formations` (new formations created this turn)
- `rbih_hrhb_state` (alliance events)
- `sustainability_state` (supply events)

#### New Content File
- Extend `src/ui/warroom/content/ticker_events.ts` with war-phase events
- Add new `category` values: `'bih_international' | 'world' | 'regional'`
- One-time content authoring job: ~2-4 events per week, ~220 weeks

---

## Desk Object 7: Calendar — Turn Advance Dialog

### Phase 0 (unchanged)
Shows staged investment count and cost, offers "Open Investment Map" button. Keep as-is.

### Phase I / Phase II

Add a **"THIS WEEK" preview** section below turn info:

**PENDING OPERATIONS**
- Attack orders staged for player faction: count
- Quick shifts pending: count (1-turn AoR adjustments, low disruption)
- Brigades packing: count (will enter transit next turn — front gaps opening)
- Brigades arriving (unpacking): count (new positions being established)

**INCOMING**
- Reinforcements arriving (brigades completing recruitment this turn)
- WIA returning to duty: total count across formations with `wounded_pending > 0`

**CRITICAL WARNINGS** (red, shown only when applicable)
- Sustainability collapses imminent (score < 10)
- Surrounded brigades (entire AoR in enclave)
- Supply corridors brittle or cut
- Exhaustion trend accelerating

#### Data Sources
- Player attack/AoR orders from staged state
- `formations[].wounded_pending`
- Recruitment state (brigades with `available_from === current_turn + 1`)
- `sustainability_state`
- `loss_of_control_trends`
- Corridor derivation

---

## Desk Object 8: Declaration Event Modal — War Milestones

### Phase 0 (unchanged)
RS proclaimed, HRHB established, referendum held, war begins. Keep as-is.

### Phase I / Phase II

New dramatic full-screen events during war. Same visual treatment: dark overlay, centered content, large title, faction-colored, ACKNOWLEDGE button blocks game flow.

| Event | Trigger | Title | Color |
|-------|---------|-------|-------|
| RBiH-HRHB war begins | Alliance drops below hostile threshold | "WAR BETWEEN ALLIES — ARBiH AND HVO IN OPEN CONFLICT" | #ff3d00 (red) |
| JNA withdrawal complete | `phase_i_jna.withdrawal_progress >= 0.95` | "JNA WITHDRAWAL COMPLETE — EQUIPMENT TRANSFERRED TO VRS" | #ffab00 (amber) |
| RBiH-HRHB ceasefire | 6 ceasefire preconditions met | "CEASEFIRE DECLARED — ARBiH AND HVO HALT HOSTILITIES" | #00e878 (green) |
| Washington Agreement | 6 Washington preconditions met | "WASHINGTON AGREEMENT SIGNED — FEDERATION ESTABLISHED" | #00e878 (green) |
| Faction exhaustion critical | `phase_ii_exhaustion[faction] > 0.75` (player faction) | "FORCES REACHING BREAKING POINT — EXHAUSTION CRITICAL" | #ff3d00 (red) |
| Enclave falls | All settlements in enclave municipality flipped to enemy | "SREBRENICA HAS FALLEN" / "GORAZDE HAS FALLEN" / etc. | #ff3d00 (red) |
| Formation encircled (5+ turns) | Brigade encircled for 5+ consecutive turns with no breakout | "FORCES ENCIRCLED — [FORMATION] CUT OFF IN [SETTLEMENT]" | #ffab00 (amber) |

Body text for each event is faction-framed:
- RBiH sees Washington as salvation; HRHB sees it as patron-imposed constraint
- RBiH sees enclave fall as catastrophe; RS sees it as strategic objective achieved
- Both sides see ceasefire differently: relief vs imposed settlement

#### Data Sources
- `phase_i_alliance_rbih_hrhb` (alliance threshold crossing)
- `phase_i_jna` (withdrawal completion)
- `rbih_hrhb_state` (ceasefire, Washington)
- `phase_ii_exhaustion` (exhaustion milestone)
- `political_controllers` (enclave settlement control check)

---

## Implementation Architecture

### Shared War Data Extraction Layer

Create `src/ui/warroom/data/war_data_extractor.ts` — a single module that reads GameState and produces typed snapshots for all modals. This avoids each modal independently querying GameState and potentially doing it wrong (as happened with the authority * 100 bug).

```typescript
interface WarDataSnapshot {
  // Tier 1 — own faction
  ownForces: OwnForcesSnapshot;
  ownCasualties: CasualtiesSnapshot;
  ownTerritory: TerritorySnapshot;
  ownDisplacement: DisplacementSnapshot;
  ownExhaustion: ExhaustionSnapshot;
  ownSupply: SupplySnapshot;
  ownAuthority: AuthoritySnapshot;
  ownCorpsOps: CorpsOperationSnapshot[];
  ownDiplomacy: FactionDiplomacySnapshot; // faction-specific

  // Tier 2 — contact-revealed
  contactedEnemyFormations: ContactedFormation[];
  engagedFrontEdges: FrontEdgeSnapshot[];

  // Tier 3 — hidden (used only for fog-filtered hints)
  // Not exposed to modals directly — newspaper/ticker use
  // indirect framing ("reports of enemy supply shortages")

  // Turn events (for newspaper/ticker)
  turnEvents: TurnEventSnapshot;

  // Brigade AoR redesign fields (added when brigade redesign implemented)
  brigadeMovement: {
    packing: FormationId[];
    inTransit: FormationId[];
    unpacking: FormationId[];
    encircled: FormationId[];
  };
  frontTiersByEdge: Record<EdgeId, 'defended' | 'garrisoned' | 'undefended'>;
  exposedFrontSettlements: SettlementId[];   // front-active, no brigade, no militia
  militiaExhaustedFront: SettlementId[];     // front-active, militia=0, no brigade
  averageConcentrationRatio: number;         // average(brigade.aor_count / brigade.max_aor)
  brigadesBelowCapDueToCasualties: number;  // brigades where aor_count > new personnel-based cap
  reconIntelligence: ReconIntelligence;     // pass-through from GameState fog-of-frontage
}
```

Each modal calls `extractWarData(gameState, playerFaction)` and reads the typed snapshot. Fog of war is enforced at the extraction layer — Tier 3 data is simply not included in the snapshot.

### Turn Event Generation

Create `src/ui/warroom/data/turn_event_generator.ts` — compares current GameState to previous-turn snapshot and generates typed events:

```typescript
interface TurnEvent {
  type: 'control_flip' | 'battle' | 'displacement' | 'civilian_casualties' |
        'formation_created' | 'alliance_change' | 'sustainability_collapse' |
        'exhaustion_milestone' | 'enclave_status';
  faction: FactionId;      // which faction this affects
  visibility: 1 | 2 | 3;  // fog tier
  settlement?: string;
  municipality?: string;
  details: Record<string, unknown>;
}
```

The newspaper, ticker, and declaration event modal all consume these events. Each applies its own framing/fog filter.

### Previous-Turn Snapshot

Store a lightweight previous-turn snapshot in the warroom state (not in GameState — this is UI-only state) so deltas can be computed:
- Previous `political_controllers` (for control flip detection)
- Previous `casualty_ledger` totals (for monthly delta in magazine)
- Previous `phase_ii_exhaustion` (for trend detection)

This mirrors what `loss_of_control_trends.previous_turn_snapshot` already does in the engine, but scoped to UI needs.

### File Structure

```
src/ui/warroom/
  data/
    war_data_extractor.ts          -- Shared snapshot extraction
    turn_event_generator.ts        -- Delta-based event generation
    fog_of_war.ts                  -- Tier classification helpers
  content/
    headline_templates.ts          -- Phase 0 headlines (existing)
    war_headline_templates.ts      -- Phase I/II headline templates (new)
    ticker_events.ts               -- Extended to Dec 1995 (modified)
    ticker_war_events.ts           -- Dynamic ticker event generator (new)
  components/
    NewspaperModal.ts              -- Add war-phase rendering path (modified)
    MagazineModal.ts               -- Add war-phase rendering path (modified)
    ReportsModal.ts                -- Add war-phase rendering path (modified)
    FactionOverviewPanel.ts        -- Fix authority bug, real data (modified)
    DiplomacyModal.ts              -- New: faction-specific diplomacy (new)
    DeclarationEventModal.ts       -- Add war milestone events (modified)
    StaffMapCrop.ts                -- Newspaper photo rendering (new)
    warroom_utils.ts               -- Add war-phase utility functions (modified)
```

### Implementation Order

1. **war_data_extractor.ts + fog_of_war.ts** — Foundation; all modals depend on this
2. **FactionOverviewPanel.ts** — Fix authority bug, wire real data (highest-impact, easiest)
3. **MagazineModal.ts** — War-phase strategic assessment (most data-rich)
4. **ReportsModal.ts** — Operational intelligence brief
5. **DiplomacyModal.ts** — Faction-specific diplomacy (new file)
6. **turn_event_generator.ts** — Event generation for newspaper/ticker
7. **NewspaperModal.ts** — War communique with headline templates
8. **war_headline_templates.ts** — Headline template authoring
9. **ticker_events.ts extension** — Real-world events Sept 1991 → Dec 1995
10. **ticker_war_events.ts** — Dynamic ticker event generator
11. **DeclarationEventModal.ts** — War milestone events
12. **StaffMapCrop.ts** — Newspaper photo rendering (can be deferred)
13. **Turn Advance Dialog** — "This week" preview (in ClickableRegionManager.ts)

### Testing Strategy

- **No simulation tests needed** — these are UI-only changes reading existing GameState
- **Manual verification**: Load a mid-war save (week 20+ from a 52w run), open each desk object, verify real data appears
- **Authority bug**: Verify `profile.authority` displays as percentage without double-multiplication
- **Fog of war**: Verify enemy data is not exposed in Tier 1 displays
- **Faction switching**: Test as RBiH, RS, HRHB — verify diplomacy modal shows different content
- **Phase gating**: Verify Phase 0 modals unchanged; war modals appear only in Phase I/II

### Determinism

No determinism concerns — all changes are read-only UI rendering from existing GameState. No writes to GameState, no `Math.random()`, no timestamps in display logic. Turn event generation uses `strictCompare` for sorted iteration.


---

## Brigade AoR Redesign Cross-Impact Summary

*Added 2026-02-18 — documents required warroom changes when the brigade AoR redesign (docs/plans/2026-02-18-brigade-aor-redesign-study.md) is implemented.*

| Warroom Component | Change | New Data Source |
|-------------------|--------|------------------|
| Reports → Formation Readiness | Add movement status column (DEPLOYED/PACKING/IN TRANSIT/UNPACKING) | `brigade_movement_state[id].status` |
| Reports → Enemy Contact | Align strength thresholds: WEAK <400 / MODERATE 400-800 / STRONG 800-1200 / FORTRESS >1200 | Same `casualty_ledger` source, new labels |
| Reports → Front Status | Add three-tier front type per edge (DEFENDED/GARRISONED/EXPOSED) | `brigade_aor`, `militia_garrison` |
| Reports → Displacement | Generalise encirclement to all factions; RBiH enclave list becomes sub-entry | `brigade_movement_state` encirclement detection |
| Faction Overview → Military | Add in-transit count; OG detachment note on personnel totals | `brigade_movement_state`, OG state |
| Faction Overview → Warnings | Add exposed front gaps, militia exhaustion, stale attack intelligence warnings | `exposedFrontSettlements`, `reconIntelligence` |
| Calendar → Pending Operations | Split AoR orders: quick shifts / packing / arriving | `brigade_movement_state` |
| Magazine → Force Strength | Add concentration ratio; brigades below cap due to casualties | AoR cap formula from personnel |
| Newspaper → Photo | Apply `recon_intelligence[playerFaction]` to staff map crop — detected enemy brigade arcs, fog overlay for unknown territory | `recon_intelligence` |
| Ticker → Dynamic Events | Add: brigade in transit, front gap opened, probe contact events | `brigade_movement_state`, `recon_intelligence` |
| Declaration Events | Add: formation encircled 5+ turns | `brigade_movement_state` encirclement tracking |

All changes are **additive** — new state fields read from GameState. No warroom architectural changes required.