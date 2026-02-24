# Settlement Clustering Proposal v2: Operational Settlement Aggregation Layer

**Project:** A War Without Victory  
**Date:** 2026-02-21  
**Status:** PROPOSAL (pending canon decision)  
**Affects:** Spatial substrate, adjacency graph, all simulation mechanics, rendering pipeline  
**Design Reference:** Hearts of Iron province/state model — small, individually playable provinces in contested and strategic zones; large merged provinces in homogeneous rear areas

---

## 1. Problem Statement

The canonical settlement substrate contains **5,823 settlements** connected by **17,116 adjacency edges**. Across three factions, the game fields approximately **80–100 brigades** (ARBiH ~55–60, VRS ~45–50, HVO ~25–30 at various points).

The density problem is **asymmetric by position**:

- **Front-active settlements** (those on or near inter-faction adjacency edges) need granularity — they are where pressure, combat, and territorial change occur.
- **Deep rear settlements** are the true density offenders. A brigade with an AoR of 60–70 settlements, most of which are deep rear hamlets of 50–200 people, creates a map that is visually impenetrable and mechanically meaningless at that scale.

The current MAX_MUNICIPALITIES_PER_BRIGADE cap of 8 already signals this problem — the system is fighting density at the brigade level rather than addressing it at the substrate level.

**Target:** Reduce the operational settlement count to approximately **800–1,500 operational units** while preserving all census data, municipality structure, and ethnic composition with perfect fidelity. Strategic zones get fine granularity (HoI-style small provinces); homogeneous rear zones get aggressive merging (HoI-style large provinces).

---

## 2. Design Principles

1. **The canonical 5,823-settlement substrate is never modified.** It remains the authoritative source of truth per the settlement-first doctrine and truthful substrate rule.

2. **The operational layer is a deterministic derived artifact.** Same inputs → same outputs, no randomness, no timestamps. It lives under `data/derived/`.

3. **Census data is preserved by summation.** Every person counted in the 1991 census appears in exactly one operational settlement. Population totals, ethnic breakdowns (Bosniak, Serb, Croat, Other/Yugoslav) are summed from constituent canonical settlements.

4. **Municipality boundaries are inviolable.** No operational settlement may span two 1990 municipalities. This preserves the municipality as a metadata container and ensures all municipality-level mechanics (militia pools, political controller initialization, stability scores, Phase 0 investments) remain valid.

5. **Ethnic composition drives merge eligibility.** Settlements are only merged with neighbors sharing the same ethnic classification. This preserves the ethnic geography that is foundational to the simulation.

6. **Special zones override default clustering.** Strategically significant areas receive fine-grained treatment regardless of ethnic homogeneity. These zones are historically motivated and explicitly enumerated.

---

## 3. Special Case Zones

These zones receive **merge protection at a finer level** than the default algorithm provides. Inside special zones, either all settlements are individually protected (no merging), or the population threshold for protection is lowered significantly. The goal is HoI-style: small, tactically meaningful provinces where the fighting happens.

### 3.1 SARAJEVO COMPLEX (Full Protection — No Merging)

**Municipalities:** Stari Grad Sarajevo, Centar Sarajevo, Novo Sarajevo, Novi Grad Sarajevo, Ilidža, Hadžići, Vogošća, Ilijaš, Pale, Trnovo

**Rationale:** Sarajevo is the political heart of the war. The siege lasted 1,425 days. ARBiH 1st Corps (~50,000 troops) defended the city against VRS Sarajevo-Romanija Corps (~25,000). The front line ran *through* the city — Grbavica (VRS) faced Centar/Stari Grad (RBiH) across the Miljacka river. Ilidža was VRS-held while Hrasnica was an RBiH pocket connected by the tunnel under the airport. Vogošća was split. Pale was the RS political capital 15km from the siege ring.

Every settlement in greater Sarajevo is a potential tactical unit: neighborhoods where snipers operated, hills where artillery sat, suburbs that changed hands, tunnel routes, airport approaches. Merging anything here would destroy the simulation's ability to model the siege.

**Treatment:** ALL settlements in these municipalities are merge-protected. Every canonical settlement becomes its own operational settlement. This is the HoI equivalent of having tiny provinces for Berlin, Stalingrad, or other siege cities.

**Expected count:** ~200–300 operational settlements (Sarajevo municipalities contain many small settlements in the surrounding hills and valleys).

### 3.2 DRINA VALLEY ENCLAVES (Full Protection — No Merging)

**Municipalities:** Srebrenica, Bratunac, Žepa (within Rogatica), Goražde, Višegrad, Vlasenica, Zvornik, Foča

**Rationale:** The eastern enclaves were the sites of the war's worst atrocities. Srebrenica and Žepa fell in July 1995; Goražde survived. The front lines around these enclaves were tight — pockets of RBiH control surrounded by VRS territory, with settlement-level granularity determining enclave integrity, supply corridors, and humanitarian pressure.

The Drina valley was also the site of the 1992 ethnic cleansing campaign that initiated the VRS land grab. Settlement-level control changes here — Zvornik, Višegrad, Foča — are historically documented and must be modelable.

**Treatment:** ALL settlements in these municipalities are merge-protected. Each canonical settlement becomes its own operational settlement.

**Expected count:** ~250–350 operational settlements.

### 3.3 POSAVINA CORRIDOR (Full Protection — No Merging)

**Municipalities:** Brčko, Bosanski Šamac, Odžak, Derventa, Bosanski Brod, Modriča, Gradačac, Orašje

**Rationale:** The Posavina Corridor was the single most strategically vital piece of terrain in the war — a narrow strip connecting the western and eastern halves of Republika Srpska. At its narrowest point near Brčko, it was only ~3–5 km wide. VRS Operation Corridor 92 (June–July 1992) was fought to open and secure this link. The corridor's vulnerability shaped RS strategic calculus for the entire war, and its status was so contested that Brčko was handled by separate arbitration after Dayton.

HVO forces in this area (101st–106th Brigades, OraÅ¡je pocket) fought alongside ARBiH against VRS. The OraÅ¡je bridgehead survived the entire war. GradaÄac was the site of a famous defense.

Settlement-level granularity here models whether the corridor is 1 settlement wide or 5, whether it can be interdicted, and whether the OraÅ¡je pocket maintains contact with Croatian territory.

**Treatment:** ALL settlements in corridor municipalities are merge-protected.

**Expected count:** ~200–300 operational settlements.

### 3.4 CENTRAL BOSNIA ENCLAVES (Full Protection — No Merging)

**Municipalities:** Vitez, Busovača, Kiseljak, Kreševo, Novi Travnik, Travnik, Fojnica, Bugojno

**Rationale:** The Lašva Valley and surrounding municipalities were the theater of the RBiH-HRHB war (1993–1994). The ethnic patchwork here was the most complex in all of BiH — Croat-majority Vitez surrounded by Bosniak-majority territory, Kiseljak as an isolated HVO pocket south of Sarajevo, Travnik changing hands. The Ahmići massacre occurred in this zone.

After the Washington Agreement (February 1994), these areas became the test case for Federation integration — former enemies sharing municipal governance. The settlement-level ethnic geography (which neighborhoods were Croat, which were Bosniak) determined where fronts formed during the HVO-ARBiH war and where integration was most difficult afterward.

**Treatment:** ALL settlements merge-protected.

**Expected count:** ~200–300 operational settlements.

### 3.5 MOSTAR (Full Protection — No Merging)

**Municipalities:** Mostar, Čapljina, Stolac, Čitluk, Jablanica, Konjic

**Rationale:** Mostar was split along the Neretva river — the west bank was HVO, the east bank was ARBiH. The siege of East Mostar (May 1993–Feb 1994) trapped ~55,000 civilians. The destruction of Stari Most (November 1993) was one of the war's most iconic moments. Čapljina and Stolac were sites of ethnic cleansing. Jablanica and Konjic controlled the only land supply route to besieged Sarajevo (via Mt. Igman).

Settlement-level granularity models the east/west Mostar split, the Neretva crossing points, and the Sarajevo supply corridor.

**Treatment:** ALL settlements merge-protected.

**Expected count:** ~200–300 operational settlements.

### 3.6 BIHAĆ POCKET (Full Protection — No Merging)

**Municipalities:** Bihać, Cazin, Velika Kladuša, Bosanska Krupa, Bosanski Petrovac, Ključ, Sanski Most

**Rationale:** The Bihać pocket was completely isolated for most of the war, besieged by VRS 2nd Krajina Corps, with RSK (Krajina Serb) cooperation from the west. The pocket contained ~180,000 people. Critically, it was also the site of an internal civil war: Fikret Abdić's breakaway "Autonomous Province" based in Velika Kladuša fought against the loyal ARBiH 5th Corps based in Bihać and Cazin. This is a three-way (arguably four-way) conflict within a pocket.

Sanski Most and Ključ were VRS-held municipalities on the pocket's eastern edge; Bosanski Petrovac was VRS 2nd Krajina Corps HQ area. The 1995 Federation/HV offensives overran these areas.

**Treatment:** ALL settlements merge-protected.

**Expected count:** ~250–350 operational settlements.

### 3.7 TUZLA-MAJEVICA INDUSTRIAL ZONE (Lowered Threshold)

**Municipalities:** Tuzla, Lukavac, Živinice, Banovići, Gračanica, Srebrenik, Doboj, Tešanj, Maglaj, Žepče

**Rationale:** The Tuzla region was ARBiH 2nd and 3rd Corps territory — the largest contiguous RBiH-controlled area, with significant industrial capacity (mines, factories). Doboj was a VRS stronghold facing RBiH across the front. Tešanj, Maglaj, and Žepče were mixed-ethnicity municipalities with active fronts throughout the war. The 28th Independent Division operated from Živinice.

This zone doesn't need full per-settlement protection but needs finer grain than default to model the industrial base and the contested northern front.

**Treatment:** Protection threshold lowered to **P_PROTECT_LOW = 300** (instead of default 1,000). Settlements above 300 population are preserved individually; smaller settlements cluster normally within ethnic key constraints.

**Expected count:** Roughly half the canonical settlements survive as individual units; the rest cluster.

### 3.8 KRAJINA REAR (Default Clustering)

**Municipalities:** Banja Luka, Prijedor, Bosanska Dubica, Bosanski Novi, Čelinac, Laktaši, Prnjavor, Srbac, Kotor Varoš, Mrkonjić Grad, Šipovo, Jajce, Glamoč, Drvar, Kupres

**Rationale:** Western RS territory — the VRS 1st and 2nd Krajina Corps rear area. Mostly Serb-supermajority after 1992 ethnic cleansing. Banja Luka was the VRS's strongest base. Most of this area saw limited direct combat (except the 1995 Federation offensives that overran the western edge). Prijedor was the site of concentration camps (Omarska, Keraterm, Trnopolje) but was firmly VRS-controlled throughout.

This is classic HoI "rear province" territory — large merged units are fine. The 1995 offensives and Jajce (captured by VRS in October 1992, retaken in 1995) justify some granularity at the western edge.

**Treatment:** Default clustering algorithm (§5). Municipal seats and settlements ≥ 1,000 are protected.

### 3.9 EASTERN HERZEGOVINA REAR (Default Clustering)

**Municipalities:** Trebinje, Nevesinje, Gacko, Bileća, Čajniče, Kalinovik

**Rationale:** VRS Herzegovina Corps rear area. Firmly RS-controlled, Serb-supermajority, limited combat. Trebinje was a logistics hub; Bileća was corps HQ. This area saw no significant territorial changes during the war.

**Treatment:** Default clustering algorithm. Municipal seats protected.

### 3.10 WESTERN HERZEGOVINA (Default Clustering)

**Municipalities:** Široki Brijeg, Ljubuški, Grude, Neum, Posušje, Tomislavgrad, Livno

**Rationale:** HVO rear area. Croat-supermajority, firmly HRHB-controlled throughout the war. Supply route from Croatia. Livno and Tomislavgrad were staging areas for 1995 offensives but saw no direct combat in the area proper.

**Treatment:** Default clustering algorithm. Municipal seats protected.

---

## 4. Zone Summary

| Zone | Type | Municipalities | Est. Op. Settlements | Rationale |
|---|---|---|---|---|
| **Sarajevo Complex** | Full protection | 10 | ~200–300 | Siege city, front runs through urban area |
| **Drina Valley Enclaves** | Full protection | 8 | ~250–350 | Genocide sites, enclave mechanics, 1992 cleansing |
| **Posavina Corridor** | Full protection | 8 | ~200–300 | Narrowest strategic chokepoint of the war |
| **Central Bosnia Enclaves** | Full protection | 8 | ~200–300 | RBiH-HRHB war theater, ethnic patchwork |
| **Mostar** | Full protection | 6 | ~200–300 | Split city, siege, supply corridor to Sarajevo |
| **Bihać Pocket** | Full protection | 7 | ~250–350 | Isolated pocket, internal civil war, three-way fight |
| **Tuzla-Majevica** | Lowered threshold (300) | 10 | ~150–250 | Industrial base, contested northern front |
| **Krajina Rear** | Default (1,000) | 15 | ~100–150 | VRS rear, limited combat |
| **E. Herzegovina Rear** | Default (1,000) | 6 | ~30–50 | VRS rear, no territorial change |
| **W. Herzegovina** | Default (1,000) | 7 | ~30–50 | HVO rear, no direct combat |
| **Remaining municipalities** | Default (1,000) | ~25 | ~100–200 | Various transitional areas |
| | | **~110 mun** | **~1,500–2,500** | |

**Observation:** The estimate lands at 1,500–2,500, higher than the original 800–1,400 target. This is because the special zones protect a large number of settlements. The exact count depends on how many canonical settlements exist in each municipality. If the count runs too high, we can selectively reduce some "full protection" zones to "lowered threshold" — for example, the outer ring of Bihać pocket municipalities (Bosanski Petrovac, Ključ, Sanski Most) could use threshold-300 instead of full protection, since they were solidly VRS-controlled.

**Tuning lever:** The tradeoff is granularity vs. playability. Full protection in 47 municipalities (~43% of all 110) is aggressive. An alternative is to apply full protection only to Sarajevo, the three eastern enclaves (Srebrenica, Goražde, Žepa proper), and the Brčko narrows — and use lowered-threshold (300) everywhere else in contested zones. This would likely bring the total to ~1,200–1,800.

---

## 5. Ethnic Classification Scheme

Each canonical settlement receives an **ethnic key** based on its 1991 census composition:

| Classification | Rule | Ethnic Key |
|---|---|---|
| **Bosniak supermajority** | Bosniak ≥ 70% | `B` |
| **Serb supermajority** | Serb ≥ 70% | `S` |
| **Croat supermajority** | Croat ≥ 70% | `C` |
| **Bosniak majority** | Bosniak is plurality AND Bosniak ≥ 40% | `Bm` |
| **Serb majority** | Serb is plurality AND Serb ≥ 40% | `Sm` |
| **Croat majority** | Croat is plurality AND Croat ≥ 40% | `Cm` |
| **Mixed** | No group ≥ 40%, or Other/Yugoslav is plurality | `X` |

**Merge compatibility matrix:**

| | B | S | C | Bm | Sm | Cm | X |
|---|---|---|---|---|---|---|---|
| **B** | ✓ | | | ✓ | | | |
| **S** | | ✓ | | | ✓ | | |
| **C** | | | ✓ | | | ✓ | |
| **Bm** | ✓ | | | ✓ | | | ✓ |
| **Sm** | | ✓ | | | ✓ | | ✓ |
| **Cm** | | | ✓ | | | ✓ | |
| **X** | | | | ✓ | ✓ | | ✓ |

**Rationale:** Supermajority settlements merge with same-ethnicity majority settlements. Majority settlements can absorb mixed settlements (same community fabric). Mixed settlements merge with each other or with Bosniak/Serb majority settlements. Croat-majority (Cm) does NOT merge with mixed (X) — Croat communities were geographically concentrated and enclave-like; merging with mixed neighbors would distort the sharp Croat/non-Croat boundaries that drove the three-way war.

---

## 6. Merge-Protection Rules

### 6.1 Zone-Based Protection

| Zone Type | Protection Rule |
|---|---|
| **Full protection** | ALL settlements in listed municipalities are individually protected — no merging |
| **Lowered threshold** | Settlements with population ≥ P_PROTECT_LOW (300) are protected; smaller settlements cluster per ethnic key |
| **Default** | Settlements with population ≥ P_PROTECT (1,000) are protected; smaller settlements cluster per ethnic key |

### 6.2 Universal Protection (applies in ALL zones, including default)

These settlements are **always** individually protected regardless of zone or population:

1. **Municipal seats** — administrative center of each 1990 municipality
2. **Urban/town class** — NATO classification URBAN_CENTER or TOWN
3. **Strategic designations** — scenario-flagged settlements (extensible list):
   - Brigade HQ locations from OOB data
   - Supply corridor nodes
   - Bridge/crossing towns
   - Known historical battle sites

---

## 7. Clustering Algorithm

### 7.1 Inputs

- Canonical substrate: `data/derived/settlements_substrate.geojson` (5,823 features)
- Contact graph: `data/derived/settlement_contact_graph.json` (17,116 edges)
- Census data: `data/source/bih_census_1991.json` + settlement-level ethnicity data
- Settlement index: `data/derived/settlements_index_1990.json` (mun1990_id mapping)
- Municipality registry: `data/source/municipalities_1990_registry_110.json`
- Settlement names: `data/derived/settlement_names.json`
- **Zone configuration:** `data/source/clustering_zone_config.json` (new — lists municipalities per zone type)

### 7.2 Algorithm (Deterministic, Single-Pass with Greedy Absorption)

```
PHASE A: CLASSIFY
  For each canonical settlement:
    1. Determine zone type from municipality membership
    2. Compute ethnic key (§5)
    3. Determine merge-protection status:
       a. Full-protection zone → PROTECTED
       b. Lowered-threshold zone → PROTECTED if pop ≥ P_PROTECT_LOW OR universal rule
       c. Default zone → PROTECTED if pop ≥ P_PROTECT OR universal rule
    4. Assign composite key: (mun1990_id, ethnic_key)

PHASE B: SEED
  Create one operational settlement seed per merge-protected settlement.
  These are fixed — they will not be absorbed.

PHASE C: CLUSTER (greedy, deterministic)
  Collect all unprotected settlements, sorted by:
    PRIMARY:   mun1990_id (alphabetical)
    SECONDARY: population (ascending — smallest first)
    TERTIARY:  SID (alphabetical — determinism tiebreaker)

  For each unprotected settlement S:
    1. Find all contact-graph neighbors of S
    2. Filter neighbors to those that:
       a. Share the same mun1990_id
       b. Have a merge-compatible ethnic key (per §5 matrix)
       c. Are already assigned to an operational settlement
    3. Among compatible neighbors, prefer:
       a. FIRST: neighbor in the cluster with smallest total population
          (produces balanced cluster sizes)
       b. TIEBREAK: closest ethnic key match
          (supermajority prefers supermajority over majority)
       c. TIEBREAK: lowest SID (determinism)
    4. If compatible neighbor exists → absorb S into that cluster
    5. If NO compatible neighbor exists → S becomes a new seed
       (isolated ethnic pocket — matters for enclave mechanics)

PHASE D: MERGE SMALL CLUSTERS
  After Phase C, scan for operational settlements below MIN_CLUSTER_POP (200):
    1. Attempt to merge with adjacent operational settlement sharing
       same (mun1990_id, ethnic_key compatibility)
    2. If no compatible adjacent cluster → leave as-is
       (genuine isolated community)

PHASE E: DERIVE
  For each operational settlement:
    1. Geometry: union of constituent canonical settlement polygons
    2. Census: sum all population fields from constituents
    3. Ethnic composition: recompute percentages from summed absolutes
    4. Name: largest-population constituent's name, or the seed name
       if a protected settlement exists in the cluster
    5. OSID: composite identifier (see §8)
    6. Properties: list of constituent canonical SIDs for traceability
    7. Terrain scalars: population-weighted average of constituent
       terrain values (elevation, slope, urban, river, road, friction)
```

### 7.3 Adjacency Rebuild

The operational adjacency graph is derived from the canonical contact graph:

- Two operational settlements A and B are adjacent if **any** canonical settlement in A is adjacent to **any** canonical settlement in B
- Edge type (shared-border, point-touch, distance-contact) inherits the **strongest** contact type among constituent pairs
- Self-loops discarded
- Preserves D₀ parameter and three-tier adjacency model

---

## 8. Identifier Scheme

### OSID Format

`op:{mun1990_id}:{sequence}`

- `op:` prefix distinguishes from canonical SIDs
- `mun1990_id` preserves municipality attribution
- `sequence` is zero-padded integer in deterministic order

**Example:** `op:visegrad:001`, `op:sarajevo_centar:014`, `op:banja_luka:003`

### Traceability Record

```json
{
  "osid": "op:visegrad:003",
  "name": "Vardište",
  "mun1990_id": "visegrad",
  "zone_type": "full_protection",
  "constituent_sids": ["23:045", "23:046", "23:047", "23:048"],
  "is_protected": false,
  "protection_reason": null,
  "ethnic_key": "S",
  "population_1991": {
    "total": 1842,
    "bosniak": 122,
    "serb": 1634,
    "croat": 8,
    "other": 78
  },
  "terrain": {
    "elevation": 485,
    "slope": 0.12,
    "urban": 0.05,
    "river": 0.3,
    "road": 0.6,
    "friction": 0.45
  }
}
```

---

## 9. Impact on Simulation Systems

### 9.1 Political Control
No change to mechanics. `political_controllers` keyed by OSID. Municipality-level derivation works identically via mun1990_id.

### 9.2 Brigade AoR
Operates on operational settlements. In special zones, brigades have more granular AoRs (10–30 operational settlements in Sarajevo, modeling neighborhood-level deployment). In rear zones, brigades cover larger chunks (5–10 big clustered units).

### 9.3 Fronts and Pressure
Front edges derived from operational adjacency. Special zones produce dense front networks (Sarajevo siege ring, enclave perimeters). Rear zones produce clean, legible fronts.

### 9.4 Sarajevo Siege Mechanics
The Sarajevo special system (System 6: dual supply, siege intensity, international focus) benefits enormously from per-settlement granularity. The siege ring is modeled settlement by settlement — which hilltop positions does VRS hold, which neighborhoods does RBiH defend, where does the tunnel connect. The airport, Dobrinja, Hrasnica, Grbavica, Ilidža are all individually modeled.

### 9.5 Enclave Mechanics
Enclave integrity detection (Engine Invariants §F) operates on the operational adjacency graph. In Drina valley zones, the enclave boundary is defined at settlement resolution, matching the historical reality of pockets that were sometimes only a few villages wide.

### 9.6 Combat and Battle Resolution
Attack orders target operational settlements. In special zones, individual settlement attacks model neighborhood-level fighting (Dobrinja, Grbavica). In default zones, attacks target cluster-sized positions. Terrain scalars are population-weighted averages of constituents.

### 9.7 Displacement, Militia, Supply, Phase 0
All work identically on operational settlements. Phase 0 remains municipality-level.

---

## 10. Rendering Impact

### 10.1 Map Display
The map becomes a proper HoI-style map: dense small provinces in contested zones, large coherent regions in the rear. The Sarajevo area will show dozens of small polygons (neighborhoods, hills, suburbs). Banja Luka's rear will show a few large colored blocks.

### 10.2 Front Lines
Front lines in special zones are detailed and winding (modeling actual siege rings and enclave perimeters). Front lines in default zones are clean and bold.

### 10.3 LOD Behavior
At strategic zoom, clustered rear settlements display as single large regions. At tactical zoom, special-zone settlements display individually with full labeling. This is natural LOD without artificial filtering.

### 10.4 Ethnic Overlay
Faithful to census — ethnic map in contested zones shows the patchwork; ethnic map in rear zones shows homogeneous blocks.

---

## 11. Pipeline Integration

### 11.1 New Artifacts

```
npm run map:derive:operational-settlements
```

**Inputs:** substrate, contact graph, census, settlement index, municipality registry, zone config  
**Outputs:**
- `data/derived/operational_settlements.geojson` — polygons with OSID, census, ethnic key, zone
- `data/derived/operational_settlements_index.json` — OSID ↔ constituent SID mapping
- `data/derived/operational_contact_graph.json` — adjacency over operational settlements
- `data/derived/operational_settlements_audit.json` — merge decisions, cluster sizes, per-zone stats
- `data/derived/operational_settlements_audit.txt` — human-readable summary

### 11.2 Zone Configuration (New Source File)

`data/source/clustering_zone_config.json`:
```json
{
  "full_protection": [
    "stari_grad_sarajevo", "centar_sarajevo", "novo_sarajevo",
    "novi_grad_sarajevo", "ilidza", "hadzici", "vogosca", "ilijas",
    "pale", "trnovo",
    "srebrenica", "bratunac", "rogatica", "gorazde", "visegrad",
    "vlasenica", "zvornik", "foca",
    "brcko", "bosanski_samac", "odzak", "derventa",
    "bosanski_brod", "modrica", "gradacac", "orasje",
    "vitez", "busovaca", "kiseljak", "kresevo",
    "novi_travnik", "travnik", "fojnica", "bugojno",
    "mostar", "capljina", "stolac", "citluk",
    "jablanica", "konjic",
    "bihac", "cazin", "velika_kladusa", "bosanska_krupa",
    "bosanski_petrovac", "kljuc", "sanski_most"
  ],
  "lowered_threshold": [
    "tuzla", "lukavac", "zivinice", "banovici", "gracanica",
    "srebrenik", "doboj", "tesanj", "maglaj", "zepce"
  ],
  "parameters": {
    "P_PROTECT": 1000,
    "P_PROTECT_LOW": 300,
    "MIN_CLUSTER_POP": 200,
    "SUPERMAJORITY_THRESHOLD": 0.70,
    "MAJORITY_THRESHOLD": 0.40
  }
}
```

All remaining municipalities (not listed in either zone) use default clustering with P_PROTECT = 1,000.

### 11.3 Determinism Contract

Byte-identical outputs across runs. No timestamps. Auditable via `map:contracts:determinism`.

---

## 12. Expected Outcome Estimates

| Zone Type | Municipalities | Canonical Settlements (est.) | Operational Settlements (est.) | Compression Ratio |
|---|---|---|---|---|
| Full protection (47 mun) | 47 | ~3,000–3,500 | ~3,000–3,500 | 1:1 |
| Lowered threshold (10 mun) | 10 | ~500–700 | ~250–400 | ~2:1 |
| Default (53 mun) | 53 | ~1,600–2,300 | ~300–500 | ~5:1 |
| **Total** | **110** | **~5,823** | **~1,500–2,500** | **~3:1** |

If this count is too high, the primary tuning lever is converting some full-protection zones to lowered-threshold. The municipalities most amenable to this conversion are the *firmly controlled* outer rings: Bosanski Petrovac, Ključ, Sanski Most (solidly VRS around Bihać); Čitluk, Čapljina (solidly HVO in Herzegovina); Pale, Trnovo (solidly VRS around Sarajevo). Converting ~10 such municipalities would reduce the count by ~300–500.

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Too many operational settlements (>2,500) | Convert full-protection outer rings to lowered-threshold; raise P_PROTECT_LOW |
| Too few (<1,000) — loss of front granularity | Lower P_PROTECT; expand full-protection zones |
| Clustering distorts ethnic geography | Ethnic key compatibility prevents cross-ethnic merging; audit overlay |
| Polygon union artifacts | Same union approach as municipality derivation; topological audit |
| Sarajevo too granular for playability | Could introduce a "Sarajevo neighborhood" aggregation (groups of 3–5 canonical settlements) as an intermediate step — but try 1:1 first |
| Performance with 2,000+ operational settlements | Still 3× fewer than current 5,823; adjacency graph ~4–6× smaller |
| Zone configuration becomes stale as design evolves | Zone config is a source file, versioned and auditable; changes require ledger entry |

---

## 14. Open Questions

1. **Exact municipality membership in zones:** The lists in §3 are based on OOB research and historical analysis. They need validation against the canonical mun1990 registry (110 municipalities). Some municipality names may need normalization to match registry keys.

2. **Žepa:** Žepa is not its own municipality — it's within Rogatica. The Žepa pocket was a subset of settlements within Rogatica municipality. Full protection of Rogatica municipality handles this, but the zone name should note this.

3. **Terrain scalar aggregation:** Proposal uses population-weighted average. Alternative: use min(defense_terrain) for attacker advantage, max(defense_terrain) for defender advantage. This needs playtesting.

4. **Dynamic re-clustering:** Recommendation remains **fixed at game start**. Re-clustering mid-game would break state continuity.

5. **Phase 0 interaction:** Phase 0 stays municipality-level. Operational settlements matter from Phase I onward.

6. **The Cm-X merge block:** Proposal maintains that Croat-majority settlements don't absorb mixed neighbors. This may only matter in default-clustering zones (since contested Croat areas are all in special zones). Worth testing both ways.

7. **Sarajevo "neighborhood grouping":** If 200–300 individual settlements in Sarajevo is too granular for playability, a secondary grouping (canonical → neighborhood → operational) could reduce Sarajevo to ~40–60 units while preserving the siege ring. This is an optional refinement after initial implementation.

---

*End of proposal v2.*
