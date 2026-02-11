# ARBiH–HVO hostilities timing (Balkan Battlegrounds + OOB research)

**Purpose:** Establish when open ARBiH–HVO (RBiH–HRHB) hostilities should be possible in the game. Used for historical-fidelity gating: no RBiH–HRHB bilateral flips / open war before the established date.

**Sources:** Balkan Battlegrounds I (BB1) index and narrative; HVO Order of Battle Master; Ahmići / Mostar timeline.

---

## Findings

### 1. No open war before October 1992

- **HVO OOB Master (docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md):**
  - **1992: Ambiguous Ally** — "Cooperation with ARBiH against VRS (northeastern Bosnia, some areas); Cooperation with VRS against ARBiH (Kupres, some operations); Establishing Herzeg-Bosnia entity."
  - **1993–Feb 1994: War with ARBiH** — "Brutal three-way war; Central Bosnia enclaves besieged; East Mostar siege; Ahmići, other massacres."
- **BB1 index (BB1_p0532):** "Croat-Muslim … war" cited at pages 159, 179–183, 189–191, 202, 208, 213, 219–221, 225–226, 243–244, 251; "peace treaty (Washington Agreement)" at 227–228.
- **Conclusion:** Open ARBiH–HVO war is described as a **1993** phenomenon (e.g. Ahmići April 1993, Mostar siege 1993). Through 1992 the relationship is "ambiguous ally" — cooperation in some areas, friction and entity-building, but not full-scale bilateral war. **No open war before at least October 1992** is a conservative, historically defensible lower bound for game gating.

### 2. Uneasy alliance → breakdown → open war

- **Sequence:** 1992: uneasy alliance (cooperation vs VRS in places, parallel entity-building, Kupres-type cooperation with VRS elsewhere). Tensions and local incidents can accumulate. **Early 1993:** open war (Central Bosnia, Mostar, Ahmići March–April 1993).
- **Game implication:** Alliance value can drift (appeasement, patron drag, incidents) but **RBiH–HRHB bilateral flips and "open war" status must be disabled until a scenario-defined earliest week** (e.g. week 26 for April 1992 start = first week of October 1992). After that week, normal alliance mechanics apply.

### 3. Traceability

| Assertion | Source |
|-----------|--------|
| 1992 = ambiguous ally; 1993 = war with ARBiH | HVO_ORDER_OF_BATTLE_MASTER.md Strategic Evolution |
| Croat-Muslim war (BB narrative) | BB1 index p.532 (Croat-Muslim war 159, 179–183, 189–191, 202, …) |
| Ahmići April 1993; Mostar siege 1993 | HVO_ORDER_OF_BATTLE_MASTER.md War Crimes, SCENARIOS |
| No open war before October 1992 | Derived: 1992 ally + 1993 war → gate until Oct 1992 |

---

## Implementation

- **Scenario field:** `rbih_hrhb_war_earliest_week` (integer). For April 1992 start, default **26** (week 0 = first week of April 1992; week 26 = first week of October 1992).
- **State:** `state.meta.rbih_hrhb_war_earliest_turn` set from scenario at init. When `meta.turn < rbih_hrhb_war_earliest_turn`: (1) RBiH–HRHB control flips are disallowed (treated as allied); (2) alliance value cannot drop below ALLIED_THRESHOLD; (3) `war_started_turn` is not set.
- **Canon:** Phase I §4.8 implementation-note: earliest open war may be gated by scenario week for historical fidelity (BB + OOB research).
