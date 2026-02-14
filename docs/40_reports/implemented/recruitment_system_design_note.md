# Design Note: Force Recruitment System

**Status:** Draft v2
**Scope:** Pre-war phase output -> April 1992 force generation -> wartime reinforcement
**Replaces:** `init_formations_oob: true` (auto-spawn all 261 OOB brigades)

---

## 1. Core concept

Instead of spawning all OOB formations at Phase I entry, the player (or bot) spends **three resources** -- manpower, recruitment capital, and equipment -- to activate brigades from a historical catalog. Resources are earned during the pre-war phase (Sep 1991 -- Apr 1992) through organizational investment.

Brigades start small (800 personnel) and reinforce over time from local manpower pools, growing up to 3,000 at full strength. The player cannot cover the entire front at game start -- strategic focus on core areas is essential.

This creates a layered decision space:
- **Setup phase:** *Which* brigades to raise, *where*, and *equipped how* -- with tradeoffs between coverage, concentration, and equipment investment.
- **Early war:** *Where to reinforce* existing brigades vs. *where to accept gaps* and rely on emergent militia.
- **Ongoing:** Brigade growth competes with new brigade formation for the same manpower pools.

---

## 2. Resources

Three currencies, each representing a distinct constraint.

### 2.1 Manpower

Already exists as `militia_pools: (mun_id, faction) -> available`.

- Recruiting a brigade from municipality M deducts manpower from M's pool.
- Pool size derives from 1991 census population * faction-eligible ethnicity share.
- Self-limiting: a municipality with 5,000 eligible population cannot field 6 brigades at 800 each.
- No artificial "max N brigades per mun" cap needed -- demographics are the cap.
- **Same pool feeds both recruitment and reinforcement** (see Section 5).

### 2.2 Recruitment capital (new)

Per-faction point pool representing organizational readiness, institutional capture, cadre availability, and political will.

```typescript
interface RecruitmentCapital {
  faction: FactionId;
  points: number;           // available to spend
  points_initial: number;   // set by pre-war phase outcome
}
```

**Where capital comes from** (pre-war phase output -- details TBD):

| Faction | Capital sources |
|---------|----------------|
| RS      | SDS municipal committee activation, command continuity, police control, JNA officer retention |
| RBiH    | Patriotic League organization, TO command cadres, police loyalty, political mobilization |
| HRHB    | HOS/HVO organization, local police, cross-border coordination with Croatia |

The pre-war phase produces a `recruitment_capital` value per faction. Higher investment in organization during pre-war = more capital at war start.

**What capital costs represent:**

- Not money. Abstracts organizational effort, cadre readiness, and command capacity.
- A brigade in a well-organized municipality costs less capital than one improvised from scratch in an unprepared area.

### 2.3 Equipment points (new)

Per-faction pool representing heavy weapons, vehicles, ammunition stocks, and military-grade supplies.

```typescript
interface EquipmentPool {
  faction: FactionId;
  points: number;           // available to spend
  points_initial: number;   // set by pre-war phase outcome
}
```

**Why a separate currency:**

- Equipment is the binding constraint that differentiates factions. RS inherited JNA arsenals; RBiH had manpower but almost no heavy weapons; HRHB had a Croatia pipeline.
- Without equipment as a currency, there's no way to model "we seized 30 tanks from the Tuzla barracks, now we can equip a mechanized brigade" or "Croatia shipped artillery, enabling HVO offensive capability."
- Equipment class is a **player choice at recruitment time**, not fixed per OOB entry. The OOB entry has a `default_equipment_class` (historical reference), but the player can downgrade to save equipment points or upgrade if they have the points.

**Starting equipment by faction:**

| Faction | Equipment points | Rationale |
|---------|-----------------|-----------|
| RS      | High (~300)     | JNA handover -- tanks, artillery, APCs, depots |
| RBiH    | Very low (~60)  | TO remnants, whatever JNA didn't confiscate |
| HRHB    | Moderate (~120) | Croatia pipeline, some HOS/police stocks |

These are baseline values; pre-war phase actions modify them (depot seizures, arms caching, pipeline establishment).

---

## 3. Brigade catalog

The existing `oob_brigades.json` (261 brigades) becomes the **recruitment catalog** rather than an auto-spawn list. Each entry gains cost fields:

```typescript
interface RecruitableBrigade {
  // Existing fields from oob_brigades.json
  id: string;                    // "arbih_101st_mountain"
  faction: FactionId;
  name: string;                  // "101st Mountain"
  home_mun: string;              // municipality_1990_id
  subordinate_to?: string;       // corps reference
  kind: 'brigade' | 'operational_group' | 'corps_asset';

  // New recruitment fields
  manpower_cost: number;         // deducted from home_mun militia pool (default: 800)
  capital_cost: number;          // deducted from faction recruitment capital
  equipment_cost: number;        // deducted from faction equipment pool (depends on chosen class)
  default_equipment_class: EquipmentClass; // historical default; player may choose differently
  priority: number;              // bot AI recruitment order (lower = earlier)
  mandatory?: boolean;           // true = auto-spawns regardless (corps HQs, key garrisons)
  available_from?: number;       // earliest turn recruitable (0 = setup phase)
  max_personnel?: number;        // brigade-specific cap (default: 3000)
}
```

### 3.1 Equipment classes and costs

The player chooses equipment class at recruitment time. Each class has a fixed equipment point cost:

```typescript
type EquipmentClass =
  | 'mechanized'       // tanks + APCs + infantry (RS JNA inheritance)
  | 'motorized'        // vehicles + infantry, light armor
  | 'mountain'         // light infantry, minimal vehicles
  | 'light_infantry'   // foot infantry, improvised
  | 'garrison'         // static defense, minimal mobility
  | 'police'           // police-origin, light arms
  | 'special'          // guards, elite -- higher cohesion, lower numbers
```

**Equipment cost per class:**

| Class | Equipment cost | Manpower cost | Capital cost | Starting composition |
|-------|---------------|---------------|--------------|---------------------|
| mechanized | 40 | 800 | 15 | 800 inf, 12 tanks, 6 arty, 2 AA |
| motorized | 20 | 850 | 12 | 850 inf, 4 tanks, 4 arty, 1 AA |
| mountain | 5 | 800 | 10 | 800 inf, 0 tanks, 2 arty, 0 AA |
| light_infantry | 0 | 800 | 8 | 800 inf, 0 tanks, 1 arty, 0 AA |
| garrison | 5 | 600 | 6 | 600 inf, 0 tanks, 2 arty, 1 AA |
| police | 0 | 500 | 5 | 500 inf, 0 tanks, 0 arty, 0 AA |
| special | 5 | 400 | 15 | 400 inf, 0 tanks, 0 arty, 0 AA |

**Key implication:** RBiH with ~60 equipment points can field at most 1 mechanized + a few mountain brigades, or ~12 mountain brigades, or a mass of light infantry. RS with ~300 can equip 7 mechanized brigades and still have points for motorized and mountain units. This asymmetry is historically accurate and creates genuinely different faction playstyles.

### 3.2 Player choice at recruitment

When recruiting a brigade:
1. Player selects an OOB entry from the catalog (e.g., `arbih_101st_mountain`).
2. Player chooses equipment class. The UI shows the `default_equipment_class` as recommended, but allows:
   - **Downgrade** (always allowed) -- e.g., recruit the 101st as `light_infantry` instead of `mountain` to save 5 equipment points.
   - **Upgrade** (if equipment points available) -- e.g., recruit the 101st as `motorized` for 20 equipment points.
3. Engine deducts manpower + capital + equipment costs.
4. Brigade spawns with 800 personnel (or class-specific amount), the chosen equipment, and `readiness: 'forming'`.

### 3.3 Faction asymmetry

**RS (Republika Srpska):**
- High starting equipment (JNA handover) + high capital.
- Can field mechanized/motorized brigades affordably.
- Manpower is the binding constraint -- Serb population is spread across many municipalities but often a minority.
- Some brigades are `mandatory: true` -- JNA units that simply changed insignia in place (e.g., units inherited from 5th Corps JNA around Banja Luka).

**RBiH (Army of BiH):**
- Low equipment + low-to-moderate capital.
- Large manpower pools (Bosniak population centers) but can only equip a fraction.
- Capital heavily influenced by pre-war Patriotic League investment.
- Key early decisions: Concentrate in Sarajevo or spread across corps areas? Spend scarce equipment on a few motorized units or go all light infantry for coverage?
- Equipment situation improves if pre-war actions preserved TO caches or captured JNA depots.

**HRHB (HVO):**
- Moderate equipment (Croatia pipeline) + moderate capital.
- Mix of `'motorized'` and `'light_infantry'`.
- Geographically concentrated -- fewer municipalities, less spread.
- Equipment partially dependent on Croatia relationship (pre-war phase).

---

## 4. Historical naming with template structure

Brigades use historical OOB names but are recruited as typed templates. The naming follows corps-based numbering conventions:

### 4.1 Naming convention

| Corps | Brigade number range | Example |
|-------|---------------------|---------|
| ARBiH 1st Corps | 1xx | 101st, 102nd, 105th Mountain |
| ARBiH 2nd Corps | 2xx | 201st, 210th Mountain |
| ARBiH 3rd Corps | 3xx | 301st, 312th Mountain |
| ARBiH 4th Corps | 4xx | 401st, 405th |
| ARBiH 5th Corps | 5xx | 501st, 502nd, 510th |
| ARBiH 7th Corps | 7xx | 701st, 705th |
| VRS 1st Krajina | Named/regional | 1st Armored, 5th Kozara, 43rd Prijedor |
| VRS Drina Corps | Named/regional | Zvornik Brigade, Bratunac Brigade |
| HVO OZs | Named | Knez Domagoj, Petar Kresimir IV |

### 4.2 How it works

The catalog entry defines the historical name. When the player recruits a brigade:
1. Player selects from available catalog entries for a corps area.
2. The brigade spawns with its historical name (`"101st Mountain"`), historical ID (`arbih_101st_mountain`), and chosen equipment class stats.
3. The brigade is a *template instance* -- same name, but equipment composition varies based on player's equipment class choice.

This preserves historical flavor while making recruitment a decision. You're not choosing "whether the 101st existed" -- you're choosing whether to spend resources activating it *now* vs. later vs. spending elsewhere, and *how well to equip it*.

---

## 5. Brigade reinforcement and growth

Brigades start at minimum viable strength and grow over time. This is where the coverage-vs-concentration tradeoff becomes acute.

### 5.1 Personnel scaling

```typescript
const MIN_BRIGADE_SPAWN = 800;     // recruitment minimum (unchanged)
const MAX_BRIGADE_PERSONNEL = 3000; // full-strength brigade (was 1000)
const REINFORCEMENT_RATE = 200;     // max personnel absorbed per turn
const REINFORCEMENT_READINESS_THRESHOLD = 0.5; // brigade must be at least 50% readiness
```

- Brigades recruit at 800 personnel.
- Each turn, a brigade may absorb up to `REINFORCEMENT_RATE` personnel from its home municipality's militia pool.
- Reinforcement requires:
  - Brigade is `readiness: 'active'` (not `'forming'` or `'degraded'`).
  - Home municipality militia pool has `available > 0`.
  - Brigade is below `max_personnel` (default 3,000; some brigade types may have lower caps).
- Reinforcement is **not free** -- it drains the same militia pool used for new brigade formation.

### 5.2 Growth tradeoff

This creates a fundamental tension:

- **Grow existing brigades:** A 2,500-man brigade is much stronger than a 800-man brigade. Pressure, cohesion, and staying power all scale with personnel.
- **Raise new brigades:** More brigades means more coverage, more AoR tiles, more presence across the front.
- **Same pool feeds both:** A municipality with 3,000 available manpower can either grow one brigade to 3,000 (strong but singular), raise 3 brigades at 800 each (wide but thin), or one at 2,000 + one at 800 (balanced).

This is not a min-max puzzle -- it depends on geography. A single strong brigade can hold a narrow front (e.g., a mountain pass into Gorazde). A wide, open front (e.g., Posavina corridor) needs multiple brigades even if each is understrength.

### 5.3 Reinforcement and combat

- Brigades in active combat (`posture: 'attack'` or under pressure) still reinforce, but at half rate (100/turn instead of 200).
- Brigades that are `disrupted` or `readiness: 'degraded'` do not reinforce.
- Casualties are permanent losses from the militia pool (`exhausted` field).
- A heavily engaged brigade near its home municipality reinforces faster than one deployed far from home.

### 5.4 Brigade strength classes (emergent)

Over time, natural force structure emerges:

| Strength | Personnel | Typical role |
|----------|-----------|-------------|
| Understrength | 400--800 | Depleted, needs rest/reinforcement |
| Cadre | 800--1200 | Newly raised, or holding quiet sector |
| Standard | 1200--2000 | Capable of independent operations |
| Reinforced | 2000--2500 | Strong, can anchor a corps front |
| Full strength | 2500--3000 | Elite or priority units (1st Krajina, Guards) |

Brigades don't have a fixed "size class" -- they grow and shrink dynamically based on reinforcement flow and combat losses.

---

## 6. The coverage problem

At game start, no faction can garrison every municipality. This is the central strategic challenge of the recruitment system.

### 6.1 The math

- RBiH has 121 OOB brigades across ~60+ municipalities. Even with maximum capital, the player might activate 40--60 brigades in the setup phase. The remaining municipalities are initially ungarrisoned.
- RS has 97 brigades across ~40+ municipalities. With JNA inheritance (`mandatory` units), they start with more coverage, but still can't be everywhere.
- HRHB has 43 brigades across ~15--20 municipalities. Smaller force, but also smaller area to cover.

### 6.2 What happens to ungarrisoned areas

Municipalities without a recruited OOB brigade are not defenseless:
- **Militia pools still exist.** The existing emergent formation system continues -- once a pool reaches 800, a militia formation auto-spawns.
- **But militia formations are generic.** They get IDs like `F_RBiH_0042`, no corps assignment, `equipment_class: 'light_infantry'`, low cohesion. They hold ground but can't project power.
- **The enemy may get there first.** If RS recruits a brigade in a contested municipality and RBiH doesn't, RS holds it from turn 0. RBiH would need to contest it militarily later -- much harder than recruiting a brigade there at setup.

**This is the core design tension:** Recruited OOB brigades are the player's *chosen* force structure (named, corps-assigned, equipped, growing toward 3,000). Emergent militia formations are the *default fallback* for everywhere the player didn't invest. The quality gap between the two makes the recruitment choice meaningful.

### 6.3 Strategic focus areas

Each faction has natural priority zones where early recruitment is critical:

**RBiH:**
1. Sarajevo (1st Corps) -- besieged, must hold
2. Tuzla (2nd Corps) -- industrial base, population center
3. Zenica/Travnik (3rd Corps) -- central corridor
4. Bihac (5th Corps) -- isolated pocket, existential threat
5. Gorazde/Srebrenica -- enclaves, hard to sustain

**RS:**
1. Banja Luka (1st Krajina) -- political/military capital
2. Pale/Sarajevo siege ring -- encirclement of capital
3. Brcko corridor -- links western and eastern RS, strategically vital
4. Drina valley -- eastern border, ethnic consolidation
5. Posavina -- northern corridor control

**HRHB:**
1. Mostar -- political center, split city
2. Livno/Tomislavgrad -- western Herzegovina, Croatia border
3. Vitez/Busovaca -- Central Bosnia, Croat enclaves
4. Capljina/Stolac -- southern Herzegovina

### 6.4 Bot AI: strategic area recruitment

The bot scoring algorithm incorporates strategic area priority:

```
function computeScore(brigade, faction):
  base = 100 - brigade.priority                    // historical importance
  area_bonus = strategicAreaScore(brigade.home_mun) // 0-50 based on priority zone
  frontline = frontlineProximity(brigade.home_mun)  // 0-30, higher = closer to enemy
  equip = equipmentClassValue(brigade.default_equipment_class) // 0-20
  return base + area_bonus + frontline + equip
```

The bot:
1. Recruits `mandatory` formations first (free).
2. Scores all eligible catalog entries.
3. Spends greedily in score order, respecting all three resource pools.
4. Reserves ~10% of capital for extended recruitment window (if enabled).
5. Accepts ungarrisoned peripheral municipalities -- militia will emerge there eventually.

---

## 7. Mandatory formations

Some formations auto-spawn at zero or minimal cost:

- **All corps HQs** (21 total) -- command structure exists regardless.
- **Key garrison brigades** that historically existed before April 1992:
  - RS: JNA units that transformed in place (e.g., units around Banja Luka, Pale). These spawn with their historical equipment class at no equipment cost (equipment was already there).
  - RBiH: Sarajevo TO core units, critical besieged garrisons.
  - HRHB: Initial HVO formations in Mostar, Livno.
- These are marked `mandatory: true` in the catalog.

The player's choices are about *additional* brigades beyond this mandatory baseline.

---

## 8. Recruitment timing

### 8.1 Setup phase (recommended -- simpler)

A dedicated phase before Turn 0:

1. Engine loads scenario, initializes control, creates militia pools.
2. Engine spawns `mandatory: true` formations.
3. Player receives resource pools (capital, equipment, manpower) and the catalog.
4. Player (or bot) spends resources to activate brigades, choosing equipment class for each.
5. Turn 0 begins with the chosen force structure. All brigades start at 800 personnel.
6. From Turn 0 onward, brigades reinforce from militia pools toward max strength.

No turn pipeline changes needed. The setup phase is a one-shot allocation.

### 8.2 Extended recruitment window (implemented)

During Phase II turns:
- Sides can spend accumulated resources to activate additional OOB brigades after setup.
- Newly activated brigades start at `readiness: 'forming'` (reduced effectiveness for 1--2 turns).
- Capital and equipment can accrue deterministically each turn:
  - `equipment`: production facilities under control x local production capacity x embargo scaling, plus optional scenario trickle.
  - `capital`: organizational base from militia pools, scaled by authority/legitimacy/displacement, plus optional scenario trickle.
- Recruitment remains eligibility-gated (`available_from`, control in home municipality, manpower/capital/equipment checks).

The turn pipeline keeps this deterministic by stable ordering across factions, facilities, municipalities, and brigade IDs.

---

## 9. Eligibility constraints

A brigade can be recruited only if:

1. **Faction controls home municipality** (at least one settlement in mun controlled by faction -- same gate as current OOB spawn).
2. **Sufficient manpower** in home_mun militia pool (`available >= manpower_cost`).
3. **Sufficient capital** (`faction.recruitment_capital.points >= capital_cost`).
4. **Sufficient equipment** (`faction.equipment_pool.points >= equipment_cost` for chosen class).
5. **Not already recruited** (each catalog entry can only be activated once).
6. **`available_from` check** (always enforced).

No separate "force pool limit" needed. The combination of manpower (demographic), capital (organizational), and equipment (material) constraints naturally limits what can be raised where and how.

---

## 10. Bot AI recruitment algorithm

The bot needs a deterministic, priority-ordered spending algorithm:

```
function botRecruit(faction, catalog, capital, equipment, militiaPools):
  eligible = catalog
    .filter(b => b.faction == faction && !b.mandatory && !b.recruited)
    .filter(b => controlCheck(b.home_mun, faction))
    .filter(b => militiaPools[b.home_mun].available >= b.manpower_cost)
    .filter(b => capital.points >= b.capital_cost)

  // Score each eligible brigade
  for b in eligible:
    b.score = computeScore(b, faction)

  // Determine best affordable equipment class per brigade
  for b in eligible:
    b.chosen_class = bestAffordableClass(b, equipment.points)

  // Sort descending by score, spend greedily
  eligible.sort(by: score, descending)
  for b in eligible:
    classCost = equipmentCost(b.chosen_class)
    if capital.points >= b.capital_cost && equipment.points >= classCost:
      activate(b, b.chosen_class)
      capital.points -= b.capital_cost
      equipment.points -= classCost
      militiaPools[b.home_mun].available -= b.manpower_cost
```

### Scoring factors:

| Factor | Weight | Rationale |
|--------|--------|-----------|
| `priority` field (historical importance) | High | Ensures historically critical units form first |
| Strategic area priority | High | Core zones (Sarajevo, Banja Luka, Bihac) recruited first |
| Frontline proximity of home_mun | Medium | Cover threatened areas before rear |
| Equipment class value (mechanized > light) | Medium | Heavy units are force multipliers |
| Municipality population density | Low | Larger cities can sustain brigades better |

The `priority` field in the catalog is the primary lever. Set it from historical formation dates: brigades that existed earliest get lowest priority numbers (= recruited first by bots).

### Bot equipment class selection:

```
function bestAffordableClass(brigade, availableEquipment):
  preferred = brigade.default_equipment_class
  if equipmentCost(preferred) <= availableEquipment:
    return preferred
  // Downgrade chain: mechanized -> motorized -> mountain -> light_infantry
  for class in downgradeChain(preferred):
    if equipmentCost(class) <= availableEquipment:
      return class
  return 'light_infantry'  // always affordable (cost 0)
```

The bot tries to recruit at the historical equipment class, downgrades if equipment is scarce. This naturally produces the right asymmetry: RS bots field mechanized brigades, RBiH bots mostly field light infantry with a few equipped units.

---

## 11. Pre-war phase linkage (forward reference)

The pre-war phase (Sep 1991 -- Apr 1992) is not yet implemented. When it is, its outputs feed all three resource pools:

### Pre-war actions that affect resources:

**RS:**
- JNA depot seizure -> **equipment points** (major source)
- SDS municipal committee activation -> **capital** (organizational readiness)
- Police force loyalty operations -> **capital** (garrison brigade availability)
- JNA officer corps retention -> **capital** (corps HQ effectiveness)

**RBiH:**
- Patriotic League cell establishment (per-municipality) -> **capital** + reduces capital cost for brigades in those municipalities
- TO weapons cache preservation vs. JNA confiscation -> **equipment points** (critical -- the difference between 30 and 90 equipment points)
- Police force loyalty -> **capital** (police-class brigade availability)
- Political mobilization rallies -> **manpower pool bonuses** (faster reinforcement)

**HRHB:**
- Croatia arms pipeline establishment -> **equipment points** (ongoing supply)
- HOS volunteer coordination -> **capital** (special-class brigade availability)
- Local police takeover -> **capital** (garrison brigade availability)
- Cross-border logistics -> equipment trickle rate in extended recruitment window

### Output format (pre-war -> recruitment):

```typescript
interface PreWarOutput {
  recruitment_capital: Record<FactionId, number>;
  equipment_points: Record<FactionId, number>;
  capital_cost_modifiers: Record<string, number>;  // brigade_id -> cost modifier (0.5 = half cost)
  equipment_cost_modifiers: Record<string, number>; // brigade_id -> equipment modifier
  manpower_bonuses: Record<MunicipalityId, Record<FactionId, number>>;  // extra pool
  mandatory_overrides: string[];  // brigade_ids forced to mandatory (e.g., successful depot seizure)
  equipment_trickle: Record<FactionId, number>;  // per-turn equipment income (HRHB Croatia pipeline)
}
```

---

## 12. Data changes required

### 12.1 `oob_brigades.json` additions

Each of the 261 brigade records gains:

```json
{
  "id": "arbih_101st_mountain",
  "manpower_cost": 800,
  "capital_cost": 10,
  "default_equipment_class": "mountain",
  "priority": 5,
  "mandatory": false,
  "max_personnel": 3000
}
```

Default values if not specified:
- `manpower_cost`: 800 (= `MIN_BRIGADE_SPAWN`)
- `capital_cost`: 10
- `default_equipment_class`: `"light_infantry"`
- `priority`: 50 (mid-range)
- `mandatory`: false
- `max_personnel`: 3000

### 12.2 New scenario fields

```json
{
  "recruitment_mode": "player_choice",
  "recruitment_capital": {
    "RS": 250,
    "RBiH": 150,
    "HRHB": 100
  },
  "equipment_points": {
    "RS": 300,
    "RBiH": 60,
    "HRHB": 120
  }
}
```

`recruitment_mode` values:
- `"player_choice"` -- new system (setup phase recruitment)
- `"auto_oob"` -- legacy behavior (`init_formations_oob: true`)

### 12.3 New data file: `equipment_class_templates.json`

Maps equipment class to starting `BrigadeComposition`:

```json
{
  "mechanized":     { "infantry": 800, "tanks": 12, "artillery": 6, "aa_systems": 2, "equipment_cost": 40 },
  "motorized":      { "infantry": 850, "tanks": 4,  "artillery": 4, "aa_systems": 1, "equipment_cost": 20 },
  "mountain":       { "infantry": 800, "tanks": 0,  "artillery": 2, "aa_systems": 0, "equipment_cost": 5 },
  "light_infantry": { "infantry": 800, "tanks": 0,  "artillery": 1, "aa_systems": 0, "equipment_cost": 0 },
  "garrison":       { "infantry": 600, "tanks": 0,  "artillery": 2, "aa_systems": 1, "equipment_cost": 5 },
  "police":         { "infantry": 500, "tanks": 0,  "artillery": 0, "aa_systems": 0, "equipment_cost": 0 },
  "special":        { "infantry": 400, "tanks": 0,  "artillery": 0, "aa_systems": 0, "equipment_cost": 5 }
}
```

### 12.4 Formation constants update

```typescript
// Updated constants
const MIN_BRIGADE_SPAWN = 800;       // unchanged
const MAX_BRIGADE_PERSONNEL = 3000;  // was 1000
const REINFORCEMENT_RATE = 200;      // new: max personnel per turn
const COMBAT_REINFORCEMENT_RATE = 100; // new: half rate under combat
```

---

## 13. Interaction: recruited OOB vs. emergent militia formations

Two parallel systems produce formations. Their interaction must be clean.

| | Recruited OOB brigade | Emergent militia formation |
|---|---|---|
| **Source** | Player choice from catalog | Auto-spawn from militia pool at 800 threshold |
| **ID format** | Historical: `arbih_101st_mountain` | Generic: `F_RBiH_0042` |
| **Name** | Historical: `"101st Mountain"` | Generic: `"RBiH Prijedor Brigade 1"` |
| **Corps assignment** | From catalog `subordinate_to` | None (unattached) |
| **Equipment class** | Player's choice | Always `light_infantry` |
| **Starting cohesion** | Moderate (40--60) | Low (20--35) |
| **Max personnel** | Up to 3,000 | Up to 1,000 (current cap, could increase) |
| **Reinforcement** | Yes, from home mun pool | Yes, from home mun pool |
| **Role** | Primary combat force | Gap-filler, rear area security |

**Key rule:** If a recruited OOB brigade exists in a municipality, emergent militia formation is suppressed for that (mun, faction) pair. The OOB brigade absorbs reinforcements instead. Emergent formations only appear where no OOB brigade was recruited.

---

## 14. Implementation order

1. **Update `MAX_BRIGADE_PERSONNEL` to 3000** and add reinforcement rate constants. Low-risk, immediate value.
2. **Add cost fields to `oob_brigades.json`** -- historical research pass to assign default_equipment_class, capital_cost, priority, mandatory flags to all 261 brigades.
3. **Define `RecruitmentCapital` + `EquipmentPool` state and scenario fields** -- types, validation.
4. **Equipment class templates** -- map class -> starting composition + equipment cost.
5. **Implement setup phase** -- UI for human player, algorithm for bot, replacing `createOobFormationsAtPhaseIEntry()`.
6. **Implement reinforcement system** -- per-turn militia pool drain, rate limiting, combat modifier.
7. **Bot AI scoring with strategic areas** -- priority + area zones + frontline proximity + equipment value.
8. **Integration tests** -- verify total force levels are plausible, no orphaned corps, reinforcement flows correctly, deterministic.
9. **Pre-war phase linkage** -- when pre-war is built, wire its output into all three resource pools.

Steps 1--4 are data/type work (low risk). Steps 5--7 are the core implementation. Steps 8--9 are integration.

---

## 15. Backward compatibility

- `recruitment_mode: "auto_oob"` preserves current behavior exactly.
- Existing scenarios and `final_save.json` are unaffected.
- New scenarios opt in with `recruitment_mode: "player_choice"`.
- All 85 existing tests continue to pass (they use `init_formations_oob: true` scenarios).
- `MAX_BRIGADE_PERSONNEL` increase (step 1) is backward-compatible -- existing brigades simply have more room to grow.

---

## 16. Open questions

1. **Resource scale tuning** -- How much of the catalog should be affordable? Suggestion: ~50--60% of a faction's brigades at setup, with the rest coming through extended recruitment window or emergent militia. This makes every choice painful.
2. **Corps HQ cost** -- Should corps HQs cost capital, or are they always free? If they cost capital, the player might skip a corps entirely (interesting but historically unusual).
3. **Mid-war equipment events** -- Capturing JNA depots, Croatia arms shipments (1992+), Iran/mujahideen pipeline (1993+) should grant equipment points. Design these as scenario events that modify `equipment_pool`.
4. **JNA barracks seizure** -- Specific municipalities with known JNA facilities (Tuzla, Sarajevo Marsal Tito barracks, Bihac) should be special pre-war actions that directly affect equipment_points and may unlock `mandatory_overrides` for specific mechanized brigades.
5. **Reinforcement distance** -- Should brigades deployed far from home_mun reinforce more slowly? Adds realism (supply lines) but also complexity.
6. **Multi-player coordination** -- In a 3-player game, do RBiH and HRHB recruit simultaneously or sequentially? Does one see the other's choices?
7. **Emergent formation cap increase** -- Should emergent militia formations also be able to grow beyond 1,000, or is the quality gap with OOB brigades intentional?
