# Phase I Overhaul: Militia Pools to Proto-Brigades

**Status:** Design Spec (proposed)
**Date:** 2026-02-28
**Supersedes:** Portions of `MILITIA_BRIGADE_FORMATION_DESIGN.md` (spawn mechanics, naming, growth)
**Preserves:** Pool semantics (mun_id:faction keys), displaced contributions, cross-ethnic rules, authority states

---

## 1. Motivation

The current system creates brigades in one step: when a militia pool reaches 800 (MIN_BRIGADE_SPAWN), a brigade pops into existence at full organizational status. This is historically wrong for RBiH and HRHB:

- **ARBiH** brigades emerged from Territorial Defense (TO) detachments that formed spontaneously in April-May 1992, grew through local recruitment and displaced arrivals, and were only later reorganized into numbered brigades (often months after formation).
- **HVO** followed a similar pattern — local Croatian Defense Councils organized municipal defense before being structured into brigades under Operational Zones.
- **VRS** is the exception — it inherited organized JNA brigades wholesale in May 1992. The 1st Krajina Corps was the old JNA 5th Corps, fully staffed and equipped.

The bottom-up model proposed here replaces the single-threshold spawn with a three-tier growth system where formations emerge as small TO detachments, grow through recruitment and displaced arrivals, and mature into named brigades matching their historical counterparts.

---

## 2. Formation Tiers

### 2.1 Tier Definitions

| Tier | Name Pattern | Personnel | Cohesion | Combat Power | Corps Assignable |
|---|---|---|---|---|---|
| **TO Detachment** | "TO [Municipality]" | 50-499 | 15-25 | Garrison only | No |
| **TO Battalion** | "TO Bn [Municipality]" | 500-1,499 | 25-45 | Defensive + local counter | No |
| **Brigade** | Historical name | 1,500+ | 45-70+ | Full offensive/defensive | Yes |

### 2.2 Formation Kind

Reuse the existing `FormationKind` type. TO detachments and TO battalions use `kind: 'militia'` (currently reserved per FORAWWV H2.4 but never spawned). Brigades continue as `kind: 'brigade'`. The tier is derived from personnel count at runtime — no new persisted field needed.

```typescript
function getFormationTier(f: FormationState): 'detachment' | 'battalion' | 'brigade' {
    const p = f.personnel ?? 0;
    if (f.kind === 'brigade') return 'brigade';  // Already promoted
    if (p >= 1500) return 'brigade';  // Ready for promotion
    if (p >= 500) return 'battalion';
    return 'detachment';
}
```

### 2.3 Tier Capabilities

**TO Detachment** (< 500):
- Can garrison home municipality OSIDs (existing militia garrison mechanics)
- **Terrain-amplified defense**: in urban/mountain OSIDs, TO detachments impose real assault costs on attackers even without heavy weapons (see Section 6.3). Historically, VRS chose siege over urban assault because even lightly armed TO detachments in built-up terrain were too costly to storm (BB1 pp. 136-141).
- Cannot be assigned offensive posture
- Cannot move outside home municipality
- Does not count for corps front-line calculations
- Low ZoC readiness (0.30x)

**TO Battalion** (500-1,499):
- Can garrison and defend (defensive posture)
- Can execute local counterattacks within home municipality + 1 adjacent
- Cannot be assigned to corps offensive operations
- Moderate ZoC readiness (0.50x)
- Eligible for corps assignment once promoted to brigade

**Brigade** (1,500+):
- Full combat capability (attack, defend, reserve)
- Assignable to corps directives
- Full ZoC readiness (1.0x)
- Gets historical name on promotion (see Section 5)

---

## 3. Formation Lifecycle

### 3.1 Emergence (replaces current MIN_BRIGADE_SPAWN threshold)

A TO detachment **emerges** when a municipality pool reaches **MIN_DETACHMENT_SPAWN** (proposed: **100**). This is much lower than the current 800 threshold, reflecting that even 100 armed men with a local leader constituted a TO detachment in April 1992.

```
Emergence condition:
  pool.available >= MIN_DETACHMENT_SPAWN (100)
  AND faction has presence in municipality
  AND municipality not fragmented
  AND formation_spawn_directive active (FORAWWV H2.4)
```

The detachment is created with `kind: 'militia'`, personnel = MIN_DETACHMENT_SPAWN, and name = `"TO [Municipality]"`.

### 3.2 Growth (replaces current reinforcement-then-spawn)

Each turn, existing formations absorb manpower from their home municipality pool:

```
growth_rate = REINFORCEMENT_RATE × getFactionReinforcementMult(faction, turn)
transfer = min(growth_rate, pool.available, tier_cap - personnel)
```

**Tier caps** (soft — controls when new formation spawns, not when growth stops):
- TO Detachment: grows until 500 → automatic promotion to TO Battalion
- TO Battalion: grows until 1,500 → eligible for brigade promotion
- Brigade: grows until MAX_BRIGADE_PERSONNEL (3,000)

### 3.3 Promotion: TO Battalion to Brigade

When a TO battalion reaches 1,500 personnel AND meets promotion prerequisites:

1. **Personnel threshold**: >= 1,500
2. **Cohesion threshold**: >= 40 (indicates minimum organizational maturity)
3. **Turns active**: >= 4 (minimum 1 month of existence)
4. **Faction-specific gate**:
   - RS: Immediate (JNA inheritance, see Section 4)
   - RBiH: Only after faction's corps exist (see Section 4.4) — historically turn ~22-28
   - HRHB: Only after faction's corps exist (see Section 4.4) — historically turn ~8-12

On promotion:
- `kind` changes from `'militia'` to `'brigade'`
- Formation receives historical name (see Section 5)
- Cohesion receives a +10 promotion bonus (organizational upgrade)
- Formation becomes eligible for corps assignment
- `readiness` set to `'active'` (was `'forming'`)

### 3.4 Second (and further) Formation in Municipality

When a brigade in municipality M reaches MAX_BRIGADE_PERSONNEL (3,000) AND the pool still has >= MIN_DETACHMENT_SPAWN (100), a **new TO detachment** emerges. This models:

- Sarajevo municipalities with 3-5 brigades each (large Bosniak population + refugees)
- Tuzla canton absorbing displaced Bosniaks from Podrinje (Srebrenica, Bratunac, Zvornik)
- Mostar with both HVO and ARBiH formations

The `max_brigades_per_mun` cap (currently 1 default, 2 for large municipalities) applies to **brigades only**. TO detachments and battalions are uncapped (up to a reasonable limit of 5 per mun per faction to prevent runaway).

### 3.5 Displacement-Driven Formation

When `displaced_in_by_faction[F]` in municipality M exceeds **DISPLACED_FORMATION_THRESHOLD** (proposed: 3,000) and a formation_spawn_directive is active:

- A new TO detachment spawns even if existing formations haven't maxed out
- Named with origin hint: `"TO [Municipality] (Displaced)"` initially
- Later promotion names reflect origin: e.g. "17th Krajina Brigade" in Travnik municipality (historically, displaced Bosniaks from Krajina formed brigades in Central Bosnia)

This requires tracking `displaced_origin_mun` on the formation for naming purposes.

### 3.6 Siege Mobilization (Enclave Mechanics)

When a municipality is **surrounded** — the majority of its OSID neighbors are enemy-controlled — a siege mobilization multiplier activates. This replaces the need for hardcoded enclave brigade exceptions (Srebrenica, Gorazde, Zepa, Orasje).

**Detection** (computed each turn, deterministic):

```typescript
function getSiegeMobilizationMultiplier(
    state: GameState,
    munId: MunicipalityId,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>
): number {
    const munOsids = getOsidsInMunicipality(munId);
    let totalNeighbors = 0;
    let enemyNeighbors = 0;
    for (const osid of munOsids) {
        for (const neighbor of adjacency.get(osid) ?? []) {
            if (isInMunicipality(neighbor, munId)) continue;  // Skip intra-mun
            totalNeighbors++;
            const controller = state.political_controllers[neighbor];
            if (controller && controller !== faction) enemyNeighbors++;
        }
    }
    if (totalNeighbors === 0) return 1.0;
    const ratio = enemyNeighbors / totalNeighbors;
    if (ratio >= 0.90) return 3.0;   // Fully surrounded: near-total mobilization
    if (ratio >= 0.75) return 2.0;   // Mostly surrounded
    if (ratio >= 0.50) return 1.5;   // Partially surrounded
    return 1.0;                       // Not besieged
}
```

**Effects of siege mobilization:**

1. **Pool growth rate multiplied**: `pool_growth × siege_multiplier`. A surrounded Srebrenica (30,000 Bosniaks) at 3.0x mobilizes ~3,000 fighters in the first few weeks instead of ~1,000. Everyone fights because there is nowhere to flee.

2. **max_brigades_per_mun cap lifted**: Under siege (ratio >= 0.75), the municipality can spawn formations beyond the normal cap. Historically, Srebrenica had 5 brigades (280th-284th) from a single municipality — impossible under the default cap of 1.

3. **Displaced persons amplify the pool**: Refugees fleeing from surrounding fallen municipalities accumulate in the enclave, swelling the militia pool. Srebrenica's population grew from ~30,000 to ~40,000-42,000 as Bosniaks from Bratunac, Vlasenica, and Zvornik fled to the one remaining RBiH-held town (BB1 pp. 184-191). The existing `displaced_in_by_faction` mechanic (Section 3.5) feeds directly into this — displaced Bosniaks arriving in Srebrenica municipality add to the RBiH pool, which spawns new TO detachments. This is the primary growth mechanism for enclave forces.

4. **No-flee constraint**: Under siege (ratio >= 0.90), the `FLEE_ABROAD_FRACTION` for the besieged faction drops to 0 in that municipality. Displaced persons who arrive in a surrounded enclave cannot leave — they stay and fight. This is historically exact: Srebrenica's population could not evacuate until UNPROFOR convoys in 1993.

**Historical validation:**

| Enclave | 1991 Bosniak Pop | Displaced Arrivals | Peak Fighters | Brigades (OOB) |
|---|---|---|---|---|
| Srebrenica | ~27,000 | +10,000-15,000 | 3,500-4,000 | 5 (280th-284th) |
| Gorazde | ~25,000 | +30,000-35,000 | 4,000-6,000 | 7 (801st-851st) |
| Zepa | ~5,000 | +5,000-10,000 | 1,500-2,000 | 1 (285th) |

In the bottom-up model:
- **Srebrenica**: ~27,000 Bosniaks × siege mobilization (3.0x pool growth) → multiple TO detachments by week 2-3. Displaced from Bratunac/Vlasenica/Zvornik swell the pool over weeks 4-12. By week 10, 3-4 TO battalions at 500-1,000 each. Mountain terrain defense multiplier (2.0x) keeps VRS Drina Corps at bay. At week 24 (corps activation), eligible battalions promote to 280th-284th brigades.
- **Gorazde**: Larger population base + more displaced arrivals. More formations, faster growth. Better organized historically (BB: "better supplied than Srebrenica"). 7 brigades emerge naturally.
- **Zepa**: Smallest enclave. 1 TO battalion growing slowly. 285th Brigade promotion late. Historically the most precarious enclave — this fragility should emerge naturally.

**Why this is better than hardcoded enclave brigades:**
- A human player besieging an enclave can choose to starve it (cut off displaced arrivals) or assault it (face terrain-amplified defense)
- A human player defending an enclave gets formations proportional to population + refugees, not a fixed OOB count
- Enclave strength is dynamic — it depends on how many displaced people arrive and when
- No special-case code paths for "enclave brigades" vs "normal brigades"

---

## 4. VRS JNA Exception and Corps Creation

### 4.1 VRS JNA Inheritance (game design starting condition)

The JNA-to-VRS handover (historically May 12, 1992) is abstracted as a **starting condition**. At turn 0, all VRS formations are created fully-formed. This is a deliberate game design choice — the pre-May 12 JNA period is not simulated.

VRS brigades do **not** follow the TO detachment → battalion → brigade pathway. At turn 0, VRS formations from `oob_brigades.json` with `available_from: 0` are created as **full brigades** (`kind: 'brigade'`) with:
- Historical name from OOB data
- `initial_personnel` from OOB (800-1,500 per brigade)
- `initial_cohesion` from OOB (62-75)
- Equipment class from OOB (mechanized, motorized, etc.)
- Corps assignment from OOB (`subordinate_to`)
- Pre-existing entrenchment (4 turns, unchanged)

### 4.2 VRS Late-War Formations

VRS brigades with `available_from > 0` (e.g. Drina Corps reinforcements formed in autumn 1992) follow a **shortened path**:
- Emerge as TO battalions (not detachments) at their `available_from` turn
- Start with `initial_personnel` from OOB
- Promotion to brigade at 1,500 personnel with no minimum-turns gate
- This reflects VRS ability to rapidly organize new units using JNA reservists and command structure

### 4.3 RS Pool Scale

RS `FACTION_POOL_SCALE` (currently 0.28) remains relevant — it controls the *rate* at which municipal pools fill, which in turn controls how fast RS emergent formations grow. RS emergent formations (in municipalities where no OOB brigade exists) follow the full TO → brigade path but with the RS-specific fast promotion gate (no corps-existence prerequisite).

### 4.4 Corps Creation Timeline

Corps are **not** all created at turn 0. Each faction's corps activate at historically-grounded turns. Before a faction's corps exist, its formations operate under army-level standing orders only — no corps directives, no coordinated multi-municipality operations.

| Faction | Corps | Created At | Historical Basis |
|---|---|---|---|
| **RS** | All 6 corps + Main Staff | **Turn 0** | Game design: JNA inheritance is a starting condition. 1KK = JNA 5th Corps, SRK = JNA Sarajevo garrison, etc. |
| **HRHB** | All 4 OZs + Main Staff | **Turn ~10** | HVO Operational Zones formalized July-August 1992 |
| **RBiH** | All 5 corps + General Staff | **Turn ~24** | ARBiH corps established September-November 1992 |

**Implementation**: Add `available_from` field to `oob_corps.json` entries (same pattern as brigade `available_from`). The scenario runner creates corps only when `turn >= available_from`. `initializeCorpsCommand()` already handles incremental corps — it runs each turn and skips corps that already exist.

```json
{ "id": "vrs_1st_krajina", "faction": "RS", "available_from": 0, ... },
{ "id": "hvo_central_bosnia", "faction": "HRHB", "available_from": 10, ... },
{ "id": "arbih_1st_corps", "faction": "RBiH", "available_from": 24, ... }
```

### 4.5 Pre-Corps Phase Behavior

Before a faction's corps exist:

- **Formations operate under army-level standing orders** (general_defensive, balanced, etc.)
- **No CorpsDirective generation** — `bot_corps_ai.ts` skips factions with no corps
- **No corps-level offensive coordination** — no multi-brigade attack concentration
- **TO formations defend locally** — garrison home municipality only
- **Brigade promotion is blocked** — TO battalions cannot promote to brigade until their faction's corps exist (Section 3.3, gate #4)

This models the historical reality: ARBiH's failure to mount coordinated counterattacks in April-September 1992 wasn't just troop quality — it was the absence of an operational command layer. Individual municipalities defended independently, sometimes successfully (Sarajevo, Tuzla) but with no ability to concentrate forces across municipal boundaries.

### 4.6 Corps-Brigade Assignment on Corps Activation

When a corps is created (its `available_from` turn is reached):

1. All existing brigades in the corps' AoR are assigned to it (`corps_id` set, `corps:X` tag added)
2. All existing TO battalions in the AoR become eligible for brigade promotion (gate #4 satisfied)
3. TO battalions that already meet personnel/cohesion/turns thresholds promote immediately
4. The corps AI begins generating directives on the next turn

This creates a visible "corps formation event" — a wave of TO battalions promoting to brigades and receiving historical names, followed by the first coordinated corps operations.

---

## 5. Historical Name Matching ("Naming Ceremony")

### 5.1 Name Assignment on Promotion

When a TO battalion promotes to brigade, it receives a historical name matched from `oob_brigades.json`:

```typescript
function matchHistoricalName(
    faction: FactionId,
    home_mun: MunicipalityId,
    ordinal: number,  // 1st, 2nd, 3rd brigade in this mun
    oobBrigades: OobBrigade[]
): string | null {
    // Find OOB brigades for this (faction, home_mun), sorted by id
    const candidates = oobBrigades
        .filter(b => b.faction === faction && b.home_mun === home_mun)
        .sort((a, b) => a.id.localeCompare(b.id));

    if (ordinal <= candidates.length) {
        return candidates[ordinal - 1].name;
    }
    return null;  // No historical match — use fallback
}
```

### 5.2 Fallback Naming

When no historical match exists (emergent formation in a municipality with no OOB entry):

```
"[Ordinal] [Municipality] Brigade"
e.g. "1st Travnik Brigade", "2nd Tuzla Brigade"
```

### 5.3 Name Propagation

On promotion, the formation also inherits from the matched OOB entry:
- `id` remains the runtime-generated ID (F_RBiH_0042) — no ID change
- `name` updates to historical name
- `tags` get `oob:arbih_305th_mountain` (linking to OOB entry)
- `subordinate_to` / corps tag updated if OOB specifies corps assignment
- Equipment class from OOB entry (if different from militia default)

### 5.4 Displaced-Origin Names

Brigades formed primarily from displaced populations get origin-based names when historical data supports it:

```
"17th Krajina Brigade" — Bosniaks from Prijedor/Sanski Most area, formed in Travnik
"210th Liberation Brigade" — displaced from Vlasenica, formed in Tuzla area
```

This requires the OOB data to annotate displaced-origin brigades (a subset of ARBiH brigades are explicitly documented as such in Balkan Battlegrounds).

---

## 6. Equipment Asymmetry and Terrain Defense

### 6.1 Equipment by Tier

| Tier | RBiH | RS | HRHB |
|---|---|---|---|
| TO Detachment | minimal (0.15) | light_infantry (0.5) | light_infantry (0.5) |
| TO Battalion | light_infantry (0.4) | light_infantry (0.7) | light_infantry (0.6) |
| Brigade | light_infantry (0.7) | per OOB (0.7-1.0) | per OOB (0.6-0.8) |

**RBiH equipment scarcity**: ARBiH TO detachments in April 1992 had hunting rifles, police sidearms, hidden TO stockpile remnants, and improvised weapons. Not "unarmed" (0.0) — even 200 men with rifles in a city impose real costs on attackers. Equipment improves as formations grow (captured weapons, foreign supply, some MUP equipment). Historically, Bosnian MUP police forces were among the best-equipped early defenders (BB1 pp. 126, 131-132).

**RS equipment inheritance**: VRS TO detachments have access to JNA weapons stockpiles. Higher equipment effectiveness from day 1.

**HRHB**: Croatian cadre support provided weapons from Croatian army stockpiles. Better than RBiH but not JNA-level.

### 6.2 Equipment Effect on Combat

Equipment multiplier applies to `combat_power` calculation in the battle resolver. Current system uses `default_equipment_class` from OOB. For the proto-brigade path, equipment class is derived from tier + faction:

```typescript
function getEquipmentMultiplier(f: FormationState): number {
    const tier = getFormationTier(f);
    if (tier === 'detachment') {
        if (f.faction === 'RBiH') return 0.15;  // Hunting rifles, police weapons, hidden TO stockpiles
        return 0.5;  // RS/HRHB: JNA/Croatian stockpiles
    }
    if (tier === 'battalion') {
        if (f.faction === 'RBiH') return 0.4;
        if (f.faction === 'RS') return 0.7;
        return 0.6;  // HRHB
    }
    // Brigade: use OOB equipment_class or default
    return getOobEquipmentMult(f) ?? 0.7;
}
```

### 6.3 Terrain-Amplified Defense (Historical Basis)

VRS chose siege over urban assault throughout the war because TO detachments in built-up terrain were too costly to storm, even with overwhelming firepower superiority (BB1 pp. 136-141). Sarajevo with 380,000 people was never assaulted. Tuzla, Zenica, Bihac — same pattern.

**Urban/mountain terrain defense bonus for TO formations:**

TO detachments and battalions receive a **terrain defense multiplier** when defending urban or mountain OSIDs:

```typescript
function getTerrainDefenseMultiplier(f: FormationState, osid: string): number {
    const tier = getFormationTier(f);
    if (tier === 'brigade') return 1.0;  // Brigades use standard combat mechanics

    const terrain = getOsidTerrain(osid);  // 'urban' | 'mountain' | 'forest' | 'open'
    if (terrain === 'urban') return 2.5;     // Dense built-up: 200 men ≈ 500 effective
    if (terrain === 'mountain') return 2.0;  // Mountain passes, forest cover
    if (terrain === 'forest') return 1.5;    // Wooded terrain favors light infantry
    return 1.0;                              // Open terrain: no bonus, VRS rolls over them
}
```

**Effect**: A RBiH TO detachment of 300 men (equipment 0.15) in an urban OSID defends as if it were 750 men — enough to make a VRS brigade assault costly. But the same 300 men in open terrain are swept aside. This naturally produces the historical pattern: VRS takes the countryside, cities hold.

**Historical grounding** (BB1 p. 463): VRS General Milovanovic acknowledged the enemy's "personnel superiority" even when ARBiH was lightly armed. Population density in cities meant defenders always outnumbered attackers at the point of contact, regardless of heavy weapons. BB1 p. 462 confirms that casualties exceeded official ARBiH rolls because armed civilians fought as de facto combatants — exactly what TO detachments represent.

---

## 7. Corps Assignment Timing

### 7.1 Pre-Corps Phase

Before a faction's corps activate (see Section 4.4 for timeline):

- TO detachments and battalions operate independently under army-level standing orders
- Local defense only — no coordinated multi-municipality operations
- No brigade promotions possible (corps existence is a prerequisite)
- **VRS exception**: All VRS corps active from turn 0 (JNA inheritance starting condition)

### 7.2 Corps Activation

When corps are created at their `available_from` turn (Section 4.4, 4.6):
- Existing formations in the corps' AoR are assigned to it
- Eligible TO battalions promote to brigades (wave promotion event)
- Corps AI (`bot_corps_ai.ts`) begins generating directives
- Unassigned TO detachments remain under army-level standing orders

### 7.3 Assignment Priority

Corps assigns formations in priority order:
1. Brigades (highest capability)
2. TO Battalions in front-line municipalities (can hold defensive positions)
3. TO Battalions in rear municipalities (reserve)
4. TO Detachments are **never** corps-assigned (purely local garrison)

---

## 8. Integration with Existing Systems

### 8.1 Modified Pipeline Steps

| Current Step | Change |
|---|---|
| `militia_emergence` | Unchanged — still produces `phase_i_militia_strength` |
| `pool_population` | **Modified**: apply siege mobilization multiplier (Section 3.6) to pool growth rate for surrounded municipalities |
| `formation_spawn` | **Major rewrite**: spawn TO detachments at 100 threshold; respect siege mobilization lifted caps |
| `reinforce_brigades` | **Rename to `reinforce_formations`**: applies to all tiers, respects tier growth caps |
| (new) `promote_formations` | New step: detachment→battalion auto-promote at 500; battalion→brigade on prerequisites (Section 3.3) |
| (new) `activate_corps` | New step: check `available_from` on corps entries; create corps when turn is reached; trigger wave promotions (Section 4.6) |
| (new) `compute_siege_state` | New step (early in pipeline): compute siege mobilization multiplier per municipality per faction for use by pool_population and formation_spawn |
| `wia_trickleback` | Unchanged — applies to all tiers |

### 8.2 Modified Constants

| Constant | Current | Proposed | Rationale |
|---|---|---|---|
| MIN_BRIGADE_SPAWN | 800 | **Kept for brigade threshold** | Still used as the criterion for "can this formation fight as brigade" |
| MIN_DETACHMENT_SPAWN | (new) | **100** | Low bar for TO detachment emergence |
| MIN_BATTALION_THRESHOLD | (new) | **500** | Auto-promote detachment to battalion |
| MIN_BRIGADE_THRESHOLD | (new) | **1,500** | Eligible for brigade promotion |
| MAX_BRIGADE_PERSONNEL | 3,000 | **Unchanged** | Brigade growth cap |
| MAX_TO_PER_MUN | (new) | **5** | Cap on militia-kind formations per mun (lifted under siege) |
| SIEGE_RATIO_FULL | (new) | **0.90** | Enemy neighbor ratio for full siege (3.0x mobilization) |
| SIEGE_RATIO_MOSTLY | (new) | **0.75** | Enemy neighbor ratio for mostly surrounded (2.0x, caps lifted) |
| SIEGE_RATIO_PARTIAL | (new) | **0.50** | Enemy neighbor ratio for partial siege (1.5x) |
| SIEGE_MOBILIZATION_MULT | (new) | **{0.50: 1.5, 0.75: 2.0, 0.90: 3.0}** | Pool growth multiplier by siege tier |

### 8.3 State Changes

**FormationState additions** (optional fields):
```typescript
interface FormationState {
    // ... existing fields ...

    /** Municipality where formation emerged (for naming displaced-origin brigades). */
    origin_mun?: MunicipalityId;

    /** Turn when formation was promoted to current kind. */
    promoted_turn?: number;

    /** OOB brigade ID matched on promotion (for equipment/corps inheritance). */
    matched_oob_id?: string;
}
```

### 8.4 OOB Integration

The OOB system (`oob_brigades.json` + `oob_phase_i_entry.ts`) changes role:

**Current**: OOB entries are created as full FormationState at Phase I entry.
**Proposed**: OOB entries become a **catalog** of historical formations that proto-brigades can match against on promotion.

**VRS exception**: RS OOB entries with `available_from: 0` are still created directly as brigades at Phase I entry (JNA inheritance). RS OOB entries with `available_from > 0` become catalog entries for matching.

**RBiH/HRHB**: All OOB entries become catalog-only. Formations emerge bottom-up from pools. When promoted to brigade, they match against the catalog by (faction, home_mun, ordinal).

### 8.5 Scenario Compatibility

The `recruitment_mode` field in scenarios controls which path is used:

| Mode | Behavior |
|---|---|
| `"auto_oob"` | **Legacy**: current system, no proto-brigades |
| `"bottom_up"` | **New**: proto-brigade emergence for RBiH/HRHB, JNA inheritance for RS |
| `"player_choice"` | **Existing**: player-directed recruitment, unchanged |

Default for new scenarios: `"bottom_up"`. Existing scenarios default to `"auto_oob"` for backward compatibility.

---

## 9. Calibration Impact

### 9.1 Expected Changes to 82% Baseline

The proto-brigade system affects **force generation, defense mechanics, and offensive timing**:

- **RBiH early game (w0-24)**: Many TO detachments garrison municipalities. No brigades, no corps, no coordinated counterattacks. However, terrain-amplified defense (Section 6.3) means urban/mountain TO detachments hold cities — VRS cannot storm Sarajevo, Tuzla, Zenica, Bihac even though RBiH has no brigades. VRS takes countryside and rural OSIDs freely. This should **improve** Drina Valley accuracy (RS takes outlying municipality OSIDs while town centers hold).
- **RBiH mid game (w24-40)**: Corps activation triggers wave of brigade promotions. First coordinated counterattacks. RBiH pushes back in Central Corridor, Central Bosnia — but only where terrain and population support it.
- **HRHB (w0-10)**: TO detachments garrison Croatian municipalities. Similar terrain-defense pattern. After OZ activation at ~w10, HVO brigades form and coordinate.
- **RS (w0+)**: Mostly unchanged — JNA brigades at full strength from turn 0. RS overruns rural areas quickly but stalls at cities. This is the historical pattern.
- **Net effect**: Should produce a more historically accurate early-war map (RS holds 65-70% but can't take cities) that naturally converges to the painted targets by w40 when RBiH/HRHB brigades mature and counterattack.

### 9.2 Interaction with Structural Changes

This overhaul supersedes several of the targeted structural changes proposed in `20260228_STRUCTURAL_CHANGES_FOR_90PCT_CALIBRATION.md`:

- **Enclave-scoped defense** (Structural §1): **Superseded** by siege mobilization (Section 3.6) + terrain-amplified defense (Section 6.3). Enclaves hold emergently — no hardcoded enclave_osids needed.
- **Corps brigade allocation** (Structural §2): **Superseded** by phased corps creation (Section 4.4). SRK brigade count becomes emergent: "how many Sarajevo TO battalions reach 1,500 by week 24 (RS corps activation turn 0)?" — answer: 4-6 (Sarajevo has 5 large municipalities with big Bosniak pools), matching historical SRK opposition strength.
- **Supply overextension** (Structural §3): **Still valuable**. Applies to brigades only, not TO formations. Compatible — can implement after proto-brigade system stabilizes.
- **Orasje pocket** (Structural §4): **Superseded** by siege mobilization. HVO TO formations in Orasje grow through siege mobilization (surrounded by RS) + displaced arrivals. 106th "Bosanska Posavina" Brigade emerges naturally.
- **Teocak/Sapna pocket** (Structural §5): **Superseded**. Same siege mobilization pattern as Orasje.
- **RS recruitment cap** (Structural §6): **Still valuable**. Orthogonal to proto-brigades.
- **Displacement activation** (Structural §7): **Mostly working already**. Systems A (Phase I municipality-level) and B (Phase II hostile takeover + minority flight) are functional and feed `displaced_in_by_faction` into militia pools. The "0/0" in reports was a reporting bug (System C / Phase F settlement-level is broken due to OSID key mismatch, and reporting reads the wrong fields). Siege mobilization and enclave pool growth will work with existing Systems A/B. Phase F fix is desirable but not a blocker.

### 9.3 New Calibration Levers

| Lever | Effect |
|---|---|
| MIN_DETACHMENT_SPAWN | Lower = more/earlier TO formations |
| MIN_BRIGADE_THRESHOLD | Higher = delayed brigade promotion (weaker mid-game) |
| Cohesion threshold for promotion | Higher = more selective brigades |
| Corps `available_from` turns | Controls when each faction's brigades become combat-effective |
| Equipment by tier | Controls TO combat power (especially RBiH 0.15 — key early-war lever) |
| Terrain defense multipliers | Higher urban/mountain = cities hold longer; lower = RS can storm them |
| Siege mobilization multipliers | Higher = enclaves generate defenders faster; lower = enclaves fall |
| SIEGE_RATIO thresholds | Lower = more municipalities qualify as "besieged"; higher = only true enclaves |
| Displacement flow rate | Faster displacement = enclaves swell faster (but also lose source population) |

---

## 10. Implementation Sequence

### Phase 0: Displacement Reporting Fix (low risk, not a blocker)
0. **Fix displacement reporting** — the "0/0" in end reports is a **reporting bug**, not a missing system. Three displacement subsystems exist:
   - **System A** (Phase I municipality-level, `displacement_state`): **WORKING**. 2.2M displaced out, 45k displaced in. Feeds `displaced_in_by_faction` into militia pools via `runDisplacedAndCrossEthnicContributions()`.
   - **System B** (Phase II hostile takeover + minority flight, `displacement_takeover.ts` / `minority_flight.ts`): **WORKING**. 4-turn timer → camp → route to urban centers. Active timers, camps, civilian casualties recorded.
   - **System C** (Phase F settlement-level front-active, `displacement_triggers.ts`): **BROKEN**. `isPressureEligible()` in `pressure_eligibility.ts` looks up canonical settlement IDs (`S100013`) in `political_controllers` which is now OSID-keyed (`op:mun:slug`). Always returns false → zero deltas → zero accumulation.
   - **Reporting bug**: `scenario_reporting.ts` reads System C fields (`settlement_displacement`, `municipality_displacement`) during Phase II, ignoring System A (`displacement_state`) which has the real data.
   - **Fix**: (a) Update reporting to read `displacement_state` during Phase II. (b) Fix `isPressureEligible()` to use OSID keys. Neither blocks proto-brigade implementation — Systems A/B already feed enclave militia pools.

### Phase A: Foundation (low risk)
1. Add new constants (MIN_DETACHMENT_SPAWN, MIN_BATTALION_THRESHOLD, MIN_BRIGADE_THRESHOLD, MAX_TO_PER_MUN, SIEGE_* constants)
2. Add `getFormationTier()` utility function
3. Add optional fields to FormationState (origin_mun, promoted_turn, matched_oob_id)
4. Add `promote_formations` pipeline step (no-op initially)
5. Add `available_from` field to `oob_corps.json` entries (RS: 0, HRHB: 10, RBiH: 24)

### Phase B: Spawn Rewrite
6. Modify `spawnFormationsFromPools()` to create TO detachments at 100 threshold
7. Modify `reinforceBrigadesFromPools()` → `reinforceFormationsFromPools()` to handle all tiers with tier growth caps
8. Implement tier auto-promotion (detachment → battalion at 500)
9. Update formation naming for TO pattern ("TO [Municipality]", "TO Bn [Municipality]")

### Phase C: Corps Phasing
10. Implement `activate_corps` pipeline step — create corps only when `turn >= available_from`
11. Modify `createOobFormationsAtPhaseIEntry()` to skip RBiH/HRHB corps at turn 0
12. Implement corps activation wave: assign formations + trigger eligible brigade promotions (Section 4.6)
13. Implement VRS JNA exception (direct brigade creation for RS turn-0 OOB, unchanged)

### Phase D: Brigade Promotion & Naming
14. Implement brigade promotion logic (battalion → brigade at 1,500 + prerequisites including corps existence)
15. Implement historical name matching from OOB catalog (Section 5.1)
16. Add OOB tag propagation on promotion (Section 5.3)
17. Implement displaced-origin naming on promotion (Section 5.4)

### Phase E: Equipment, Combat & Terrain
18. Implement tier-based equipment multiplier (Section 6.2)
19. Implement terrain-amplified defense for TO formations (Section 6.3)
20. Implement ZoC readiness scaling by tier (0.30x / 0.50x / 1.0x)
21. Add posture restrictions for TO formations (no offensive for detachments, local only for battalions)
22. Modify combat resolver to handle TO formation combat limitations

### Phase F: Siege Mobilization
23. Implement `compute_siege_state` pipeline step — per-municipality siege ratio computation
24. Apply siege mobilization multiplier to pool_population growth
25. Lift max_brigades_per_mun cap under siege
26. Implement no-flee constraint (FLEE_ABROAD_FRACTION → 0 under full siege)
27. Integrate displacement-driven TO emergence with siege state (Section 3.5 + 3.6)

### Phase G: Calibration
28. Run 40w scenario with `recruitment_mode: "bottom_up"`
29. Compare against 82.1% baseline (n241) and painted targets
30. Tune new levers (thresholds, turn gates, equipment, terrain multipliers, siege multipliers)
31. Verify enclave survival (Srebrenica, Gorazde, Zepa hold via siege mobilization)
32. Verify corps activation wave (RBiH brigades appear at ~w24, HRHB at ~w10)
33. Document new baseline

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| RBiH too weak early → RS overruns everything | Terrain-amplified defense (Section 6.3) means TO detachments in urban/mountain OSIDs impose real assault costs. Siege mobilization (Section 3.6) rapidly generates enclave defenders. VRS takes countryside but stalls at cities — the historical pattern. |
| Too many small formations → performance | MAX_TO_PER_MUN cap (5). Merge detachments that don't grow. |
| Historical name matching fails for edge cases | Fallback naming always works. OOB match is best-effort. |
| VRS JNA exception creates two code paths | Clear conditional on faction. RS path is simpler (existing code). |
| Breaks existing 52w scenario | `recruitment_mode: "auto_oob"` preserves current behavior. |
| Calibration regression from 82.1% | Keep n241 parameters as baseline. Proto-brigade system adds levers, doesn't remove them. |
| Determinism violation | All iteration sorted by mun_id + faction. No randomness in tier promotion. |

---

## 12. Open Questions

1. ~~**Should TO detachments participate in battle resolution?**~~ **RESOLVED**: Yes. TO detachments participate as weak defenders with equipment 0.15 (RBiH) or 0.5 (RS/HRHB), amplified by terrain defense multiplier (Section 6.3). Even 200 men with rifles in mountain terrain impose real assault costs.

2. ~~**How to handle enclave TO formations?**~~ **RESOLVED**: No exception needed. Siege mobilization (Section 3.6) handles enclaves emergently: surrounded municipalities get 3.0x pool growth, lifted brigade caps, and displaced persons swell the pool. Enclave forces emerge as TO detachments, grow through displaced arrivals, and promote to historical brigade names at corps activation. See Section 3.6 for full design.

3. ~~**Merged formations**~~ **RESOLVED**: Keep separate. Each TO detachment grows and promotes independently. Multiple brigades per municipality is historically correct (Sarajevo had 5+ per municipality). Merging adds complexity with no benefit.

4. ~~**Formation dissolution**~~ **RESOLVED**: Yes. Below MIN_COMBAT_PERSONNEL (100), formation is `'dissolved'` and remaining manpower returns to the municipality pool. Survivors get absorbed by other formations via normal reinforcement.

5. ~~**Interaction with `activation_gated`**~~ **RESOLVED**: No activation gating for TO detachments — they are active from creation (local defense from day 1). Brigade promotion does not use activation gating either.

6. **Enclave supply ceiling** (deferred): Historically, enclaves had severe ammunition and food shortages that limited offensive capability. A possible future addition: besieged formations cannot exceed equipment 0.4 regardless of tier. Not implementing in v1 — terrain defense multiplier + TO posture restrictions already produce the "hold but can't break out" pattern.
