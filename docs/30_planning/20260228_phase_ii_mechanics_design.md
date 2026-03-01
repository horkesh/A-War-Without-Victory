# Phase II Mechanics Design: Year One (1992)

**Date:** 2026-02-28
**Sources:** BB1/BB2 KB, OOB master docs, engine code analysis, calibration runs n233–n255
**Principle:** Every behavior emerges from material conditions and strategic incentives. No bot assumptions. Player-proof.

---

## Design Philosophy

A human player taking any faction should encounter the SAME constraints the bot encounters:
- HRHB can't attack RS → because HVO has no tanks, limited artillery, no strategic targets in RS territory
- ARBiH doesn't attack in 1992 → because arms embargo, no heavy weapons, CRITICAL supply in enclaves
- RS doesn't waste blood on HRHB → because Herzegovina Corps is defensive and HRHB territory has no strategic value to RS
- Enclave brigades don't attack → because they have no ammunition, no supply, no equipment

If a player-controlled HRHB tried to attack from Livno to Banja Luka, they would fail because:
1. HVO equipment composition = light infantry only → attack scores against entrenched VRS are negative
2. No supply line from Livno into RS interior → supply status degrades to CRITICAL within 2 turns
3. VRS has artillery superiority → defender power multiplier crushes light infantry attackers

---

## Mechanic 1: Morale (Separate from Cohesion)

### What it is
New field `morale: number // [0,100]` on FormationState, alongside existing `cohesion`.

| Field | What it captures | Effect on |
|---|---|---|
| Cohesion | How well organized/trained the unit is | Combat power (multiplicative, existing) |
| Morale | How much the unit WANTS to fight | Retreat resistance, casualty absorption |

### Population affinity drives morale
When a brigade defends an OSID, compute **population affinity** from 1991 census:

```
affinity = fraction of OSID's 1991 population sharing ethnicity with defending faction
```

This data already exists — used for displacement calculations.

| Affinity | Situation | Effect |
|---|---|---|
| > 0.70 | Defending own-majority OSID | Morale +3/turn, retreat requires decisive defeat |
| 0.40–0.70 | Mixed population OSID | Morale neutral |
| < 0.30 | Defending enemy-majority OSID | Morale −2/turn, retreats readily |

### Encirclement reversal
Standard doctrine: encirclement → morale collapse.
BiH 1992: encirclement of own-population defenders → morale SPIKE.
"The nearer they were forced to their original positions, the harder and more grimly they fought" (BB2 p556).

When a brigade is surrounded AND defending high-affinity population:
- Morale drifts UP (+2-3/turn), not down
- This is the "cornered rat" mechanic
- Only triggers when affinity > 0.50 (defending own people)

When surrounded AND defending low-affinity population:
- Morale drifts DOWN (standard doctrine)

### Retreat resistance
Currently: if attacker wins, defender always retreats (if adjacent friendly exists).
New: morale gates the retreat decision.

- High morale (>70) + costly_victory outcome → defender absorbs casualties, stays. Territory holds.
- Medium morale (40-70) + costly_victory → defender retreats (current behavior)
- Low morale (<40) + any loss → defender retreats immediately
- decisive_victory + any morale → defender always retreats (overwhelming force)
- stalemate → no retreat regardless of morale (current behavior)

When a high-morale defender absorbs a costly_victory instead of retreating:
- Both sides take outcome-based casualties (attacker 1.8×, defender 1.2×)
- Defender morale drains by −5 (absorbing is expensive psychologically)
- Attacker morale also affected (hitting a wall)
- Territory does NOT flip

This produces the historical pattern: ARBiH absorbed more total KIA than VRS because they
repeatedly absorbed costly outcomes that would cause conventional armies to retreat.

### Morale initialization
- Per-brigade starting morale based on formation type and faction:
  - Regular army (VRS corps brigade): 60
  - Territorial defense (early ARBiH): 50
  - Enclave militia (Srebrenica, Goražde): 70 (desperation bonus)
  - HVO regular: 55
- These are starting values only. Population affinity and combat outcomes drive drift.

---

## Mechanic 2: ZoC Frontline Defense Extension

### What it is
Currently: linked ZoC blocks enemy MOVEMENT but provides NO DEFENSE for empty OSIDs.
New: ZoC-locked brigades defend adjacent empty OSIDs in their linked ZoC chain.

### How it works
When an attacker targets an unoccupied OSID:
1. Check if the OSID is in a linked ZoC component
2. If yes: find the nearest friendly brigade in that ZoC chain
3. That brigade provides "virtual defense" of the empty OSID

Defense parameters for virtual defense:
- Same brigade combat power (they're covering the sector)
- Entrenchment: 50% of the brigade's actual entrenchment (outpost, not main position)
- If the virtual defense LOSES: the empty OSID flips, but the brigade does NOT retreat
  (it stays at its actual OSID; it lost a forward position)
- Brigade takes partial casualties (50% of normal defender casualties)
- If the virtual defense WINS (stalemate/repulsed): attacker takes full casualties

### Why this matters
n254: 188 battles had NO defender present. That's 46% of all combats. Many of these are
attacks on empty OSIDs in the front line that SHOULD have been defended by adjacent brigades.
This mechanic should reduce "free" OSID captures dramatically and produce more realistic
front-line behavior.

### Simultaneous attack limit
If a brigade is attacked at its own OSID, that takes priority over virtual defense.
A brigade can only provide virtual defense if it's not already in combat at its own position.

---

## Mechanic 3: Rear-Area Cleanup Priority

### What it is
In weeks 0-10 (early war), all factions prioritize securing undefended hostile-population
settlements behind their front line. This is a corps-level directive priority, not brigade
autonomy.

### Historical basis
- VRS: Systematic cleanup of Krajina — Prijedor, Sanski Most, Kotor Varoš, Ključ (BB1 pp496-501)
- ARBiH: Cleanup of isolated settlements (Bilješevo, Čardak — user-confirmed)
- All sides secured their rear before pushing forward

### Data-driven targeting
Corps directive generation adds "rear cleanup" targets when:
1. OSID is behind the front line (no enemy-controlled neighbors)
2. OSID has hostile-majority population (>40% enemy ethnicity from 1991 census)
3. OSID is undefended (no enemy brigade present)
4. Week < REAR_CLEANUP_END_WEEK (~10-12)

Priority score for cleanup: `hostile_population_fraction × CLEANUP_WEIGHT`

### Player-proof
If a player controls RS: they can ALSO issue cleanup orders for rear areas. The mechanic
is available to all factions equally. VRS does more cleanup because Krajina has many
non-Serb-majority settlements; ARBiH does less because their core territory is more
ethnically homogeneous. Emergent from census data.

---

## Mechanic 4: Cut-Off Brigade Breakthrough

### What it is
Currently: cut-off brigade with no retreat destinations → last stand → win or die (destroyed).
New: cut-off brigade can attempt breakthrough toward nearest friendly territory.

### Historical basis
HVO 103rd Derventa and 105th Modriča brigades retreated through hostile territory to Orašje
after Posavina corridor was overrun. "Heavy combat losses in 1992 and early 1993" (BB1 p438).
Orasje Corps: 3,000 dead + 10,000 wounded total war (BB1 p462).

### How it works
When a brigade has NO valid retreat destination AND there exists at least one friendly OSID
within N hops (N = 3-4):
1. Brigade plots shortest path to nearest friendly OSID
2. Each turn, brigade attempts "breakthrough movement" to next OSID in path
3. Breakthrough is resolved as a special attack:
   - Brigade fights at 60% normal power (disorganized, desperate)
   - If OSID is undefended: movement succeeds, brigade takes 10% casualties (march attrition)
   - If OSID is defended: combat resolves normally, but brigade only needs "stalemate" to move through
     (doesn't need to capture — just pass through)
   - Brigade takes heavy casualties regardless of outcome (20-30% per hop)
4. If path is blocked (defended OSID, breakthrough fails): brigade falls back to last stand

### Result
- HVO Derventa brigade: 2-3 hops through hostile territory to Orašje, losing 40-60% strength
- Surviving fragment arrives at Orašje with low cohesion, low morale, but alive
- Better than instant destruction (historically they survived)
- Costly enough that it's a desperation move, not a tactic

---

## Mechanic 5: Enclave Material Deprivation

### What it is
Enclave brigades (Srebrenica, Goražde, Žepa) get historically accurate equipment:
- Composition: infantry=1000, tanks=0, art=0, aa=0
- Condition: 0.35-0.45
- Supply status: CRITICAL (besieged, no resupply)

### Why it stops attacks without behavioral blocks
- CRITICAL supply penalty for RBiH attacks: -300 score
- Zero heavy weapons → no artillery suppression → enemy entrenchment fully effective
- Result: attack scores go strongly negative → bot AI generates no offensive targets for these brigades
- If a PLAYER controls ARBiH and tries to attack from Srebrenica anyway: they will lose because
  infantry-only at 35% condition vs entrenched VRS with tanks/artillery = catastrophic outcome

### Interaction with morale
Enclave brigades start at morale 70 (desperation bonus). When defending their own-population
OSID (Srebrenica = 73% Bosniak), affinity bonus applies. When encircled, morale drifts UP.
These brigades become extremely hard to dislodge despite terrible cohesion and equipment.
They don't attack. They hold and bleed. Historically accurate.

---

## Mechanic 6: Equipment-Based Offensive Capability (Player-Proofing)

### The principle
No faction needs a "don't attack faction X" rule. Offensive capability is gated by equipment:

| Faction | Tanks | Artillery | Can attack entrenched VRS? |
|---|---|---|---|
| VRS | 200-300 | Extensive | Yes (artillery suppresses entrenchment) |
| ARBiH 1992 | 1-3 | 1-5 | Barely (no artillery suppression, entrenchment at full) |
| HVO | 10-15 | 10-15 | Very limited (some suppression, insufficient for breakthrough) |
| Enclave (ARBiH) | 0 | 0 | No (zero suppression, full entrenchment, CRITICAL supply) |

VRS attacking ARBiH: works because artillery suppresses entrenchment (up to 0.7 suppression factor).
ARBiH attacking VRS: fails because no artillery → VRS entrenchment at full → ARBiH power insufficient.
HVO attacking VRS: fails because limited artillery → VRS entrenchment mostly intact → HVO lacks force ratio.

This is why HRHB "can't" attack RS. It's physics, not a rule.

### RS-HRHB "alliance"
The RS-HRHB non-aggression in 1992 emerges from:
1. HVO material inability to threaten VRS (see above)
2. VRS strategic priorities are elsewhere (Drina, Corridor, Sarajevo)
3. Co-ethnic scoring: RS attacking HRHB = negative utility unless strategic compulsion

No RS bot rule says "HRHB won't attack." RS defends based on threat assessment. If VRS
sees zero HRHB attack orders → VRS allocates fewer defenders to HRHB border → more
forces for Drina/Corridor. If a player takes HRHB and somehow attacks: VRS bot responds
to the actual threat, not to a faction assumption.

---

## Mechanic 7: Command Hierarchy Enforcement

### What already works
Corps→Brigade directive system is correct. CorpsDirective specifies offensive_targets;
brigades choose from the list. No freelancing.

### What to add: operation-scale attacks
Historical: major operations were multi-brigade, corps-coordinated:
- VRS Operation Breza 94: 2nd Krajina Corps leads, 1st Krajina follows (BB2 p540)
- ARBiH Vozuća offensive: General Staff coordinated 2nd + 3rd Corps (BB2 p506)

Current: max_attackers_per_target=3 allows concentration. Named Operations system exists in bot_corps_ai.ts.
No changes needed for basic command hierarchy.

### Enclave brigade exception
Srebrenica/Goražde enclave brigades: formally under 1st Corps/28th Division/81st Division
but de facto autonomous due to isolation. BB confirms 28th Division in Srebrenica (BB1 p444).
In engine: these brigades receive CorpsDirective from 1st Corps but material conditions
(no equipment, CRITICAL supply) override any offensive targets in the directive. Even if
1st Corps directive says "attack," enclave brigades can't (scores negative). Correct behavior
without special-casing.

---

## Interaction Map

```
Population Affinity (census data)
    ↓
  Morale (new field)
    ↓
  Retreat Resistance → casualties absorbed instead of territory yielded
    ↓
  Casualty Distribution → approaches historical (ARBiH > VRS despite defending)

Equipment Composition (OOB data)
    ↓
  Attack Viability → gated by artillery suppression vs entrenchment
    ↓
  Faction Behavior → emerges from physics, not rules
    ↓
  Player-Proof → same constraints for bot and player

ZoC Frontline Defense
    ↓
  Fewer Free OSID Captures → more actual combat required
    ↓
  More Casualties → front stabilizes earlier, both sides bleed
    ↓
  Realistic Front Line Behavior

Rear Cleanup (weeks 0-10)
    ↓
  Corps Directive → hostile-population OSIDs behind front
    ↓
  Early Territory Consolidation → correct rear-area control
    ↓
  Front Stabilizes → matches painted targets

Cut-Off Breakthrough
    ↓
  Desperate Escape → high-casualty movement through hostile territory
    ↓
  Formation Survival (diminished) → historical HVO Orašje retreat
```

---

## Mechanic 8: Per-Municipality Displacement Routing

### What is wrong
Current routing (`displacement_takeover.ts:getPrimaryRouteForSourceMun`) covers only 3 regions
for RBiH (15 muns), 2 for HRHB (17 muns), and 1 for RS (9 muns). The remaining ~70 municipalities
fall through to generic `FALLBACK_ROUTES_BY_FACTION` lists. This produces wrong results:
- A Bosniak from Prijedor routes to Travnik (correct) but a Bosniak from Bosanski Brod also
  routes to Tuzla (wrong — geographically closer to Slavonski Brod/Croatia or Zenica).
- A Serb from Tuzla has NO primary route — falls to Banja Luka (wrong — nearest RS territory
  is Bijeljina/Doboj).
- A Croat from Kakanj has NO primary route — falls to Mostar (possibly correct but should
  route through Kiseljak/Fojnica/Busovača first).

### Design principles
1. **Every municipality gets origin-specific routing** for each displaced ethnicity
2. **Frontline settlements first** (nearest friendly-controlled territory)
3. **Bigger centers second** (regional hubs with capacity)
4. **Abroad last** (Croats → Croatia, Serbs → Serbia, Bosniaks → 0%)
5. **Geography drives routing** — people flee along roads, not across mountains
6. **Faction control gates routing** — destinations must be friendly-controlled at routing time
7. **Brigade presence required** — destination must have a friendly brigade (existing rule)

### Current system architecture (what changes, what stays)

**Stays:**
- Timer system (4-turn delay from flip → displacement, 4-turn delay camp → routing)
- Kill fractions (10% normal, 35% enclave overrun)
- Flee-abroad fractions (RS 30%, HRHB 25%, RBiH 0%, Posavina Croats 70%)
- Receiving capacity constraints (150% normal, 110% Sarajevo)
- Militia pool reinforcement from displaced (5%/turn, cap 2000)
- Deterministic sorting via strictCompare throughout

**Changes:**
- `getPrimaryRouteForSourceMun()` → replaced by comprehensive lookup table
- `FALLBACK_ROUTES_BY_FACTION` → kept as last-resort overflow only
- Add origin OSID tracking to DisplacementState
- Add destination OSID tracking to routing records
- Add per-event ethnicity tracking

### Tracking additions

**DisplacementState** (per municipality) — add fields:
```typescript
// NEW: Track displacement at OSID granularity
displaced_out_by_osid?: Record<string, number>;     // origin OSID → count displaced from
displaced_in_by_osid?: Record<string, number>;       // destination OSID → count settled in
```

**DisplacementRoutingRecord** — extend:
```typescript
interface DisplacementRoutingRecord {
    from_mun: MunicipalityId;
    to_mun: MunicipalityId;
    from_osid?: string;          // NEW: origin OSID (if available)
    to_osid?: string;            // NEW: destination OSID (if available)
    amount: number;
    ethnicity?: FactionId;       // NEW: displaced ethnicity (RBiH/RS/HRHB)
    reason: string;
}
```

**DisplacementEventLog** — new cumulative log:
```typescript
interface DisplacementEvent {
    turn: number;
    origin_mun: MunicipalityId;
    origin_osid?: string;
    dest_mun: MunicipalityId;
    dest_osid?: string;
    ethnicity: FactionId;
    displaced: number;
    killed: number;
    fled_abroad: number;
    settled: number;
}
// Stored on GameState: displacement_event_log?: DisplacementEvent[]
```

### Per-municipality routing data structure

```typescript
interface DisplacementRoute {
    primary: MunicipalityId[];      // frontline settlements, ordered by geographic proximity
    secondary: MunicipalityId[];    // bigger centers further back
    abroad_fraction: number;        // 0.0–1.0; fraction that leaves BiH entirely
}

// Full routing table: origin_mun → displaced_ethnicity → route
type DisplacementRoutingTable = Record<MunicipalityId, Partial<Record<FactionId, DisplacementRoute>>>;
```

---

### Region 1: KRAJINA (RS-controlled)

**Municipalities:** banja_luka, prijedor, sanski_most, kljuc, bosanski_novi, bosanski_petrovac,
titov_drvar, bosanska_dubica, bosanska_kostajnica, bosanska_gradiska, kotor_varos, celinac,
laktasi, mrkonjic_grad, sipovo, glamoc, bosansko_grahovo, prnjavor, srbac, skender_vakuf

**Displaced Bosniaks** (largest displacement wave — Krajina ethnic cleansing):

| Origin sub-region | Municipalities | Primary (frontline) | Secondary (centers) | Notes |
|---|---|---|---|---|
| Northwest (Sana valley) | prijedor, sanski_most, kljuc, bosanski_novi | travnik, jajce | zenica, bihac | Sana→Vrbas valley route south. Bihać accessible via Bosanska Krupa |
| Banja Luka metro | banja_luka, celinac, laktasi, prnjavor | travnik, jajce, tesanj | zenica, tuzla | South via Vrbas valley or east via Tešanj corridor |
| Bosanska Krajina (west) | bosanski_petrovac, titov_drvar, bosansko_grahovo, glamoc | bihac, cazin | velika_kladusa | West toward Bihać pocket (geographic reality) |
| Posavina border | bosanska_dubica, bosanska_kostajnica, bosanska_gradiska, srbac | doboj, tesanj | tuzla, zenica | Northeast along Sava then south |
| Kotor Varoš area | kotor_varos, skender_vakuf | travnik, tesanj | zenica, tuzla | South or east along valleys |
| Mountain interior | mrkonjic_grad, sipovo | jajce, travnik, bugojno | zenica | South via Vrbas valley to Jajce then Travnik |

**Displaced Croats** (smaller numbers — Krajina Croats mostly fled early):

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| All Krajina | all above | livno, kupres | mostar, capljina | Croatia (25%) |
| Kotor Varoš (special) | kotor_varos | travnik, vitez, kiseljak | mostar | Croatia (25%) |
| Banja Luka Croats | banja_luka, laktasi | livno | mostar | Croatia (25%) |

**Displaced Serbs**: Not displaced in Krajina (RS-controlled from war start).

---

### Region 2: POSAVINA / NORTHEAST (Contested corridor)

**Municipalities:** brcko, bijeljina, bosanski_samac, odzak, orasje, gradacac, derventa,
modrica, bosanski_brod, doboj, lopare, ugljevik

**Displaced Bosniaks:**

| Origin | Municipalities | Primary (frontline) | Secondary (centers) | Notes |
|---|---|---|---|---|
| Bijeljina area | bijeljina, lopare, ugljevik | kalesija, zivinice | tuzla, srebrenik | East to Tuzla basin via Kalesija |
| Brčko area | brcko | gradacac, srebrenik | tuzla | South to Tuzla via Gradačac |
| Bosanski Šamac/Odžak | bosanski_samac, odzak | gradacac, gracanica | tuzla | Southwest to Tuzla |
| Doboj area | doboj | tesanj, maglaj | zenica, tuzla | South along Bosna valley |
| Derventa/Modriča | derventa, modrica | tesanj, doboj | tuzla, zenica | South along Bosna valley |
| Bosanski Brod | bosanski_brod | tesanj, doboj | zenica | South toward Maglaj/Tešanj |

**Displaced Croats:**

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| Orašje pocket | orasje | (stays in pocket) | — | Croatia (70%) |
| Posavina (rest) | bosanski_samac, odzak, bosanski_brod, derventa, modrica | orasje | gradacac | Croatia (70%) |
| Brčko Croats | brcko | orasje, gradacac | — | Croatia (70%) |
| Doboj Croats | doboj | tesanj, zepce | travnik | Croatia (25%) |

**Displaced Serbs:**

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| Gradačac/Srebrenik area | gradacac, srebrenik | bijeljina, brcko | doboj | Serbia (30%) |
| Tuzla basin (if flipped) | (see Region 3) | — | — | — |

---

### Region 3: TUZLA BASIN / CENTRAL CORRIDOR (RBiH-controlled)

**Municipalities:** tuzla, zenica, travnik, tesanj, maglaj, zavidovici, kakanj, visoko,
lukavac, gracanica, banovici, kalesija, srebrenik, zivinice, kladanj, olovo, breza, vares

**Displaced Serbs** (primary displacement pattern — Serb minorities leaving RBiH areas):

| Origin | Municipalities | Primary (frontline) | Secondary (centers) | Abroad |
|---|---|---|---|---|
| Tuzla area | tuzla, lukavac, gracanica, banovici, zivinice | bijeljina, lopare | doboj, banja_luka | Serbia (30%) |
| Maglaj/Tešanj corridor | tesanj, maglaj, zavidovici | doboj, teslic | banja_luka | Serbia (30%) |
| Zenica/Kakanj | zenica, kakanj, breza, visoko | ilijas, pale | doboj, banja_luka | Serbia (30%) |
| Travnik area | travnik | skender_vakuf, mrkonjic_grad | banja_luka | Serbia (30%) |
| East corridor | kalesija, kladanj, olovo | vlasenica, han_pijesak | bijeljina, zvornik | Serbia (30%) |
| Srebrenik/Gradačac | srebrenik | bijeljina, brcko | doboj | Serbia (30%) |
| Vareš | vares | ilijas, sokolac | pale, banja_luka | Serbia (30%) |

**Displaced Croats** (from RBiH-controlled mixed areas):

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| Kakanj/Breza | kakanj, breza | kiseljak, fojnica | travnik, vitez | Croatia (25%) |
| Travnik Croats | travnik | novi_travnik, vitez | busovaca, kiseljak | Croatia (25%) |
| Zenica Croats | zenica | travnik, vitez | kiseljak, mostar | Croatia (25%) |
| Tešanj/Maglaj Croats | tesanj, maglaj | zepce | travnik | Croatia (25%) |
| Vareš Croats | vares | kiseljak, fojnica | busovaca | Croatia (25%) |
| Zavidovići Croats | zavidovici | zepce | travnik | Croatia (25%) |

**Displaced Bosniaks**: Not typically displaced (RBiH-controlled). In scenario where RS
overruns corridor: route internally (tesanj→zenica, maglaj→zenica, etc.).

---

### Region 4: CENTRAL BOSNIA (Contested — Bosniak/Croat mixed)

**Municipalities:** bugojno, gornji_vakuf, donji_vakuf, novi_travnik, vitez, busovaca,
kiseljak, fojnica, kresevo, jajce, kupres, prozor

**Displaced Bosniaks** (if HRHB or RS takes territory):

| Origin | Municipalities | Primary (frontline) | Secondary (centers) | Notes |
|---|---|---|---|---|
| Lašva valley | novi_travnik, vitez, busovaca | travnik, zenica | kakanj, visoko | North toward Bosniak-majority centers |
| Kiseljak/Fojnica | kiseljak, fojnica, kresevo | visoko, kakanj | zenica | East then north along Bosna |
| Jajce | jajce | travnik, donji_vakuf | zenica | East along Vrbas valley |
| Kupres | kupres | bugojno, gornji_vakuf | travnik | East toward Bugojno |
| Prozor | prozor | jablanica, konjic | zenica, travnik | Southeast toward Neretva then north |
| Bugojno/Gornji Vakuf | bugojno, gornji_vakuf | travnik, donji_vakuf | zenica | North along Vrbas |
| Donji Vakuf | donji_vakuf | travnik | zenica | East along valley |

**Displaced Croats** (if RBiH takes territory):

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| Lašva valley | novi_travnik, vitez, busovaca | kiseljak, kresevo | mostar, livno | Croatia (25%) |
| Kiseljak/Fojnica/Kreševo | kiseljak, fojnica, kresevo | busovaca, vitez | mostar | Croatia (25%) |
| Jajce Croats | jajce | travnik (if HRHB-held) | livno, mostar | Croatia (25%) |
| Kupres Croats | kupres | livno, duvno | mostar | Croatia (25%) |
| Prozor Croats | prozor | gornji_vakuf (if HRHB) | mostar, jablanica | Croatia (25%) |
| Bugojno Croats | bugojno | gornji_vakuf, prozor | livno, mostar | Croatia (25%) |

**Displaced Serbs:**

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| Jajce/D.Vakuf Serbs | jajce, donji_vakuf | mrkonjic_grad, sipovo | banja_luka | Serbia (30%) |
| Bugojno Serbs | bugojno | donji_vakuf (if RS) | mrkonjic_grad, banja_luka | Serbia (30%) |
| Kupres Serbs | kupres | glamoc, sipovo | banja_luka | Serbia (30%) |

---

### Region 5: SARAJEVO (Besieged — mixed)

**Municipalities:** centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo,
ilidza, hadzici, vogosca, ilijas, trnovo, pale

**Displaced Serbs** (from RBiH-held Sarajevo):

| Origin | Municipalities | Primary (frontline) | Secondary (centers) | Abroad |
|---|---|---|---|---|
| Sarajevo center | centar_sarajevo, stari_grad_sarajevo, novo_sarajevo, novi_grad_sarajevo | pale, sokolac | han_pijesak, rogatica | Serbia (30%) |
| Ilidža/Hadžići | ilidza, hadzici | pale, trnovo | sokolac | Serbia (30%) |
| Vogošća/Ilijaš | vogosca, ilijas | pale, sokolac | han_pijesak | Serbia (30%) |

**Displaced Bosniaks** (from RS-held suburbs):

| Origin | Municipalities | Primary | Secondary | Notes |
|---|---|---|---|---|
| Ilidža (RS-held parts) | ilidza | centar_sarajevo, novo_sarajevo | visoko, zenica | Into besieged city or escape north |
| Ilijaš | ilijas | visoko, breza | zenica, kakanj | North along Bosna |
| Vogošća | vogosca | centar_sarajevo | visoko | Into city or north |
| Pale | pale | centar_sarajevo (if accessible) | visoko, zenica | Rarely — Serb-majority municipality |
| Trnovo | trnovo | centar_sarajevo | konjic, jablanica | Into city or south |
| Hadžići | hadzici | centar_sarajevo, ilidza | visoko | Into city |

**Displaced Croats** (small numbers in Sarajevo):

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| All Sarajevo | all above | kiseljak, fojnica | travnik, mostar | Croatia (25%) |

---

### Region 6: DRINA VALLEY / EAST BOSNIA (RS corridor + enclaves)

**Municipalities:** zvornik, bratunac, srebrenica, vlasenica, sekovici, han_pijesak,
rogatica, visegrad, foca, gorazde, cajnice, kalinovik, rudo

**Displaced Bosniaks** (largest civilian casualties — ethnic cleansing + enclave overruns):

| Origin sub-region | Municipalities | Primary (frontline) | Secondary (centers) | Notes |
|---|---|---|---|---|
| North Drina | zvornik, bratunac, vlasenica | srebrenica (enclave), kalesija | tuzla, kladanj | To Srebrenica enclave or west to Tuzla basin |
| Srebrenica | srebrenica | (stays — enclave) | tuzla, kladanj | Trapped. 35% kill fraction if overrun. |
| Goražde | gorazde | (stays — enclave) | visoko, zenica | Trapped. 35% kill fraction if overrun. |
| Žepa area | (within vlasenica/rogatica) | gorazde, srebrenica | tuzla | Trapped between enclaves |
| Višegrad/Rogatica | visegrad, rogatica | gorazde | centar_sarajevo, zenica | South to Goražde or west to Sarajevo |
| Foča | foca | gorazde | centar_sarajevo | North to Goražde enclave |
| Čajniče/Rudo | cajnice, rudo | gorazde | — | To Goražde if accessible; otherwise abroad (rare) |
| Sekovići/Han Pijesak | sekovici, han_pijesak | kladanj, olovo | tuzla | West toward Tuzla basin |
| Kalinovik | kalinovik | gorazde, konjic | centar_sarajevo | To Goražde or west toward Konjic |

**Displaced Serbs**: Not displaced in Drina valley (RS-controlled from war start).

**Displaced Croats**: Negligible numbers in Drina valley.

---

### Region 7: HERZEGOVINA (HRHB-controlled + mixed)

**Municipalities:** mostar, capljina, stolac, ljubuski, citluk, grude, posusje, listica (Široki Brijeg),
neum, livno, duvno (Tomislavgrad), jablanica, konjic, trebinje, bileca, nevesinje, ljubinje, gacko

**Displaced Bosniaks** (from HRHB or RS territory):

| Origin | Municipalities | Primary (frontline) | Secondary (centers) | Notes |
|---|---|---|---|---|
| Mostar (east bank) | mostar | jablanica, konjic | zenica, travnik | North along Neretva |
| Čapljina/Stolac | capljina, stolac | mostar (if RBiH) | jablanica, konjic | North along Neretva |
| Jablanica/Konjic | jablanica, konjic | visoko, zenica | travnik | North along Neretva-Bosna |
| Trebinje/Bileća area | trebinje, bileca, ljubinje, gacko, nevesinje | gorazde | centar_sarajevo | North to Goražde or west to Sarajevo |

**Displaced Serbs** (from HRHB territory):

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| Mostar Serbs | mostar | nevesinje, gacko | trebinje, bileca | Serbia (30%) |
| Livno Serbs | livno | glamoc, bosansko_grahovo | banja_luka | Serbia (30%) |
| Konjic Serbs | konjic | kalinovik, foca | pale | Serbia (30%) |
| Kupres Serbs | kupres | sipovo, glamoc | banja_luka | Serbia (30%) |
| Trebinje/east Herz. Serbs | trebinje, bileca, nevesinje, gacko, ljubinje | (stays — RS-controlled) | — | — |

**Displaced Croats**: Not displaced in Herzegovina heartland (HRHB-controlled).

---

### Region 8: BIHAĆ POCKET (RBiH-controlled, besieged)

**Municipalities:** bihac, cazin, velika_kladusa, bosanska_krupa

**Displaced Bosniaks** (internal displacement within pocket):

| Origin | Municipalities | Primary | Secondary | Notes |
|---|---|---|---|---|
| Bosanska Krupa (edge) | bosanska_krupa | bihac, cazin | velika_kladusa | Into pocket interior |
| Bihać (if attacked) | bihac | cazin | velika_kladusa | Internal displacement only |

**Displaced Serbs:**

| Origin | Municipalities | Primary | Secondary | Abroad |
|---|---|---|---|---|
| All Bihać pocket | bihac, cazin, velika_kladusa, bosanska_krupa | bosanski_petrovac, kljuc | banja_luka, prijedor | Serbia (30%) |

**Displaced Croats**: Negligible numbers.

**Special case — Abdić pocket**: Velika Kladuša may separate from Bihać pocket later in war.
Not modeled in 1992 (Abdić rebellion is 1993+).

---

### Summary: Routing table by displaced ethnicity

**Displaced Bosniaks (RBiH-aligned):**
```
KRAJINA_NORTHWEST:  [travnik, jajce, zenica, bihac]
KRAJINA_BANJALUKA:  [travnik, jajce, tesanj, zenica, tuzla]
KRAJINA_WEST:       [bihac, cazin, velika_kladusa]
KRAJINA_POSAVINA:   [doboj, tesanj, tuzla, zenica]
KRAJINA_KOTOR:      [travnik, tesanj, zenica, tuzla]
KRAJINA_MOUNTAIN:   [jajce, travnik, bugojno, zenica]
POSAVINA_BIJELJINA: [kalesija, zivinice, tuzla, srebrenik]
POSAVINA_BRCKO:     [gradacac, srebrenik, tuzla]
POSAVINA_SAMAC:     [gradacac, gracanica, tuzla]
POSAVINA_DOBOJ:     [tesanj, maglaj, zenica, tuzla]
POSAVINA_DERVENTA:  [tesanj, doboj, tuzla, zenica]
POSAVINA_BROD:      [tesanj, doboj, zenica]
DRINA_NORTH:        [srebrenica, kalesija, tuzla, kladanj]
DRINA_SOUTH:        [gorazde, centar_sarajevo, zenica]
DRINA_SEKOVICI:     [kladanj, olovo, tuzla]
SARAJEVO_RS_HELD:   [centar_sarajevo, visoko, zenica]
CENTRAL_BOSNIA:     [travnik, zenica, kakanj, visoko]
HERZEGOVINA:        [jablanica, konjic, zenica, travnik]
HERCEG_EAST:        [gorazde, centar_sarajevo]
BIHAC_EDGE:         [bihac, cazin, velika_kladusa]
abroad_fraction:    0.00
```

**Displaced Croats (HRHB-aligned):**
```
KRAJINA_ALL:        [livno, kupres, mostar, capljina]
KOTOR_VAROS:        [travnik, vitez, kiseljak, mostar]
POSAVINA_ORASJE:    [orasje]                           // stays in pocket
POSAVINA_REST:      [orasje, gradacac]
DOBOJ_AREA:         [tesanj, zepce, travnik]
CENTRAL_BOSNIA_LASVA: [kiseljak, kresevo, mostar, livno]
CENTRAL_BOSNIA_JAJCE: [livno, mostar]
CENTRAL_BOSNIA_KUPRES: [livno, duvno, mostar]
CENTRAL_BOSNIA_PROZOR: [mostar, jablanica]
KAKANJ_BREZA:       [kiseljak, fojnica, travnik, vitez]
ZENICA_TRAVNIK:     [novi_travnik, vitez, busovaca, kiseljak]
TESANJ_MAGLAJ:      [zepce, travnik]
VARES:              [kiseljak, fojnica, busovaca]
SARAJEVO:           [kiseljak, fojnica, travnik, mostar]
abroad_fraction:    0.25 (general), 0.70 (Posavina)
```

**Displaced Serbs (RS-aligned):**
```
TUZLA_AREA:         [bijeljina, lopare, doboj, banja_luka]
MAGLAJ_TESANJ:      [doboj, teslic, banja_luka]
ZENICA_KAKANJ:      [ilijas, pale, doboj, banja_luka]
TRAVNIK:            [skender_vakuf, mrkonjic_grad, banja_luka]
EAST_CORRIDOR:      [vlasenica, han_pijesak, bijeljina, zvornik]
SARAJEVO:           [pale, sokolac, han_pijesak, rogatica]
MOSTAR:             [nevesinje, gacko, trebinje, bileca]
LIVNO:              [glamoc, bosansko_grahovo, banja_luka]
KONJIC:             [kalinovik, foca, pale]
BIHAC_POCKET:       [bosanski_petrovac, kljuc, banja_luka, prijedor]
CENTRAL_BOSNIA:     [mrkonjic_grad, sipovo, banja_luka]
VARES:              [ilijas, sokolac, pale, banja_luka]
abroad_fraction:    0.30
```

---

### Municipality-to-region mapping

For implementation, each municipality maps to a routing region per ethnicity:

```typescript
const BOSNIAK_ROUTING_REGION: Record<MunicipalityId, string> = {
    // Krajina Northwest
    prijedor: 'KRAJINA_NORTHWEST', sanski_most: 'KRAJINA_NORTHWEST',
    kljuc: 'KRAJINA_NORTHWEST', bosanski_novi: 'KRAJINA_NORTHWEST',
    // Krajina Banja Luka metro
    banja_luka: 'KRAJINA_BANJALUKA', celinac: 'KRAJINA_BANJALUKA',
    laktasi: 'KRAJINA_BANJALUKA', prnjavor: 'KRAJINA_BANJALUKA',
    // Krajina West
    bosanski_petrovac: 'KRAJINA_WEST', titov_drvar: 'KRAJINA_WEST',
    bosansko_grahovo: 'KRAJINA_WEST', glamoc: 'KRAJINA_WEST',
    // Krajina Posavina border
    bosanska_dubica: 'KRAJINA_POSAVINA', bosanska_kostajnica: 'KRAJINA_POSAVINA',
    bosanska_gradiska: 'KRAJINA_POSAVINA', srbac: 'KRAJINA_POSAVINA',
    // Krajina Kotor Varoš
    kotor_varos: 'KRAJINA_KOTOR', skender_vakuf: 'KRAJINA_KOTOR',
    // Krajina Mountain interior
    mrkonjic_grad: 'KRAJINA_MOUNTAIN', sipovo: 'KRAJINA_MOUNTAIN',
    // Posavina
    bijeljina: 'POSAVINA_BIJELJINA', lopare: 'POSAVINA_BIJELJINA',
    ugljevik: 'POSAVINA_BIJELJINA',
    brcko: 'POSAVINA_BRCKO',
    bosanski_samac: 'POSAVINA_SAMAC', odzak: 'POSAVINA_SAMAC',
    doboj: 'POSAVINA_DOBOJ',
    derventa: 'POSAVINA_DERVENTA', modrica: 'POSAVINA_DERVENTA',
    bosanski_brod: 'POSAVINA_BROD',
    // Drina Valley
    zvornik: 'DRINA_NORTH', bratunac: 'DRINA_NORTH',
    vlasenica: 'DRINA_NORTH', srebrenica: 'DRINA_NORTH',
    visegrad: 'DRINA_SOUTH', rogatica: 'DRINA_SOUTH',
    foca: 'DRINA_SOUTH', gorazde: 'DRINA_SOUTH',
    cajnice: 'DRINA_SOUTH', rudo: 'DRINA_SOUTH', kalinovik: 'DRINA_SOUTH',
    sekovici: 'DRINA_SEKOVICI', han_pijesak: 'DRINA_SEKOVICI',
    // Sarajevo (RS-held parts)
    ilidza: 'SARAJEVO_RS_HELD', ilijas: 'SARAJEVO_RS_HELD',
    vogosca: 'SARAJEVO_RS_HELD', hadzici: 'SARAJEVO_RS_HELD',
    pale: 'SARAJEVO_RS_HELD', trnovo: 'SARAJEVO_RS_HELD',
    // Central Bosnia
    bugojno: 'CENTRAL_BOSNIA', gornji_vakuf: 'CENTRAL_BOSNIA',
    donji_vakuf: 'CENTRAL_BOSNIA', novi_travnik: 'CENTRAL_BOSNIA',
    vitez: 'CENTRAL_BOSNIA', busovaca: 'CENTRAL_BOSNIA',
    kiseljak: 'CENTRAL_BOSNIA', fojnica: 'CENTRAL_BOSNIA',
    kresevo: 'CENTRAL_BOSNIA', jajce: 'CENTRAL_BOSNIA',
    kupres: 'CENTRAL_BOSNIA', prozor: 'CENTRAL_BOSNIA',
    // Herzegovina
    mostar: 'HERZEGOVINA', capljina: 'HERZEGOVINA',
    stolac: 'HERZEGOVINA', jablanica: 'HERZEGOVINA', konjic: 'HERZEGOVINA',
    trebinje: 'HERCEG_EAST', bileca: 'HERCEG_EAST',
    nevesinje: 'HERCEG_EAST', gacko: 'HERCEG_EAST', ljubinje: 'HERCEG_EAST',
    // Bihać pocket
    bosanska_krupa: 'BIHAC_EDGE',
    bihac: 'BIHAC_EDGE', cazin: 'BIHAC_EDGE', velika_kladusa: 'BIHAC_EDGE',
    // Central corridor (Bosniak-controlled — internal displacement only)
    tuzla: 'INTERNAL', zenica: 'INTERNAL', travnik: 'INTERNAL',
    tesanj: 'INTERNAL', maglaj: 'INTERNAL', zavidovici: 'INTERNAL',
    kakanj: 'INTERNAL', visoko: 'INTERNAL', lukavac: 'INTERNAL',
    gracanica: 'INTERNAL', banovici: 'INTERNAL', kalesija: 'INTERNAL',
    srebrenik: 'INTERNAL', zivinice: 'INTERNAL', kladanj: 'INTERNAL',
    olovo: 'INTERNAL', breza: 'INTERNAL', vares: 'INTERNAL',
    // Sarajevo center
    centar_sarajevo: 'INTERNAL', novi_grad_sarajevo: 'INTERNAL',
    novo_sarajevo: 'INTERNAL', stari_grad_sarajevo: 'INTERNAL',
    // HRHB-only muns (no Bosniak displacement)
    citluk: 'NONE', grude: 'NONE', posusje: 'NONE', listica: 'NONE',
    neum: 'NONE', ljubuski: 'NONE', livno: 'NONE', duvno: 'NONE',
    gradacac: 'INTERNAL', orasje: 'NONE', zepce: 'INTERNAL'
};
```

Similar mapping tables needed for `CROAT_ROUTING_REGION` and `SERB_ROUTING_REGION`.

---

### Dynamic routing validation

At routing time, the system MUST verify each destination:
1. **Faction control**: destination municipality has ≥1 OSID controlled by displaced person's faction
2. **Brigade presence**: destination has a friendly brigade (existing `factionHasBrigadeInMunicipality` check)
3. **Capacity**: destination below receiving cap (existing check)
4. **Accessibility**: NOT behind enemy lines (new check — destination must be reachable without crossing enemy territory; approximate via: source and destination in same connected component of friendly-controlled OSIDs)

If primary route is blocked (enemy controls all primary destinations), fall through to secondary.
If secondary blocked, fall through to `FALLBACK_ROUTES_BY_FACTION`.
If all domestic routes blocked, add to abroad fraction (special case for besieged populations).

### Enclave special cases

| Enclave | If overrun by | Kill fraction | Survivors route to | Notes |
|---|---|---|---|---|
| Srebrenica | RS | 0.35 | tuzla, kalesija, kladanj | BB2: mass atrocity |
| Goražde | RS | 0.35 | centar_sarajevo, visoko, zenica | If corridor exists |
| Žepa | RS | 0.35 | gorazde, srebrenica, tuzla | Nearest enclave then out |
| Bihać pocket | RS | 0.35 | — (abroad only) | Pocket surrounded; flee to Croatia/RSK |
| Orašje pocket | RS | 0.10 | — | Croatia (70%+) |

### Siege effects on routing

When a municipality is under siege (no friendly supply path):
- `FLEE_ABROAD_FRACTION` → 0.0 (can't leave)
- Receiving capacity → 0 (can't receive new displaced)
- Internal displacement only (within municipality between OSIDs)
- This affects Sarajevo (siege from w0), enclaves (permanent siege), Bihać pocket (partial)

---

## Phase Restructuring Note

**Previous:** Phase 0 (pre-war) → Phase I (militia chaos) → Phase II (front lines)
**New:** Peace Phase → War Phase

When war starts, war starts. No assumptions about "what happened in Phase I."
The `init_control: "apr1992"` snapshot is the start of the War Phase.
All mechanics (morale, ZoC, displacement, combat) apply from turn 0 of the War Phase.
Displacement rules run from turn 0 — no "4-week timer at scenario start" workaround.

---

## Implementation Priority

| # | Mechanic | Impact | Complexity | Dependencies |
|---|---|---|---|---|
| 1 | ZoC Frontline Defense | Highest (46% of combats affected) | Medium | None |
| 2 | Morale + Population Affinity | High (casualty distribution) | High | Census data already available |
| 3 | Enclave Material Deprivation | High (Drina 62.5%) | Low | OOB data change only |
| 4 | Rear-Area Cleanup | Medium (early-war territory) | Medium | Census data + corps directive |
| 5 | Cut-Off Breakthrough | Medium (specific scenarios) | Medium | Retreat system |
| 6 | Equipment-Based Player-Proofing | High (correctness) | Low | OOB equipment review |
| 7 | RS-HRHB Scoring | Low (if equipment gates already work) | Low | Mechanic 6 |
| 8 | Per-Municipality Displacement Routing | High (correctness + tracking) | High | Per-mun route data + census |

**Implementation status (2026-03-01):** Mechanics 1 (morale), 2 (ZoC virtual defense), 3 (enclave deprivation), and 8 (displacement routing) are fully implemented. Mechanic 8 was extended with per-OSID census displacement depth (n319): actual per-OSID population and ethnic composition from `operational_settlements.geojson` replaced municipality-level averaging. Total displaced: 668k (RBiH 458k, HRHB 150k, RS 60k). Displacement system is complete. See `docs/40_reports/20260301_DISPLACEMENT_DEPTH_CALIBRATION.md`.

---

## Success Criteria (n256 and beyond)

| Metric | n254 | Target | Mechanic |
|---|---|---|---|
| Overall OSID match | 81.4% | >88% | 1, 2, 3, 4 |
| DRINA region | 62.5% | >82% | 2, 3 |
| CORRIDOR region | 77.7% | >87% | 1, 4 |
| Defender KIA | ~775 | ~5,000+ | 2 (morale absorption) |
| Total KIA (40w) | ~6,750 | ~15,000+ | 1, 2 |
| Free OSID captures | ~188 | <50 | 1 (ZoC defense) |
| RBiH attack orders | 87 | ~35–50 | 3 (material deprivation) |
| VRS strength | 116k | ~100k | Pool scale fix |
| HRHB territory | 83 | 87–90 | 6, 7 |
