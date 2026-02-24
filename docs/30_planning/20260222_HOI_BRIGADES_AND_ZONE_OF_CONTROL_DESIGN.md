# HoI-Style Brigades and Zone of Control — Design Outline

**Date:** 2026-02-22  
**Status:** Draft design / planning outline  
**Scope:** Replace AoR-based brigade model with one-OSID-per-brigade, stacking, and Zone of Control (ZoC). Control changes and front movement only via active attack or frontline/corps operations; new formulas required.  
**Canon impact:** Major. Game Bible, Rulebook, Systems Manual, and Phase II Specification all assume AoRs, front-active settlements, and pressure/breach on settlement graph. This design replaces those with OSID-based placement, ZoC, and attack-driven control change.

---

## 1. Executive Summary

- **Current:** Brigades have Areas of Responsibility (AoRs) over multiple settlements; front-active settlements are assigned exactly one brigade; pressure/breach drive control flips across edges.
- **Target:** Brigades occupy a **single OSID** (operational settlement). Multiple brigades may **stack** on the same OSID. Each brigade radiates **Zone of Control (ZoC)** to all neighboring OSIDs. Enemies entering ZoC are **locked** (no free movement through ZoC; retreat or attack only). **Control changes and front movement occur only when a brigade actively attacks** (or through defined frontline/corps operations), i.e. when the enemy brigade is **pushed back**. Pressure and breach no longer apply passively; they are replaced by **attack-resolution** and **push-back** formulas.

---

## 2. Spatial and Unit Model

### 2.1 Map unit: OSID

- All brigade location, adjacency, and ZoC use **operational settlement IDs (OSIDs)**.
- Graph: `data/derived/operational/operational_contact_graph.json` (753 nodes, edges = adjacency).
- No canonical (5,823) settlement layer for brigade placement; mapping from OSID to canonical exists only where needed (e.g. init, display).

### 2.2 Brigade location and stacking

- **Brigade location:** Each brigade has a single **location_osid: OSID** (or equivalent). The brigade “occupies” that OSID.
- **Stacking:** Multiple brigades may occupy the same OSID. Stacking is allowed; no hard cap specified here (can be limited later by supply/combat width if desired).
- **Deployed vs in-transit:** Only brigades that are **deployed** on an OSID (not in column / in_transit) project ZoC and participate in combat. Movement and ZoC rules apply to deployed brigades; in-transit brigades do not project ZoC until they unpack.

### 2.3 What is removed

- **brigade_aor** (Record<SettlementId, FormationId | null>): removed. No settlement-level “owner” per brigade.
- **brigade_municipality_assignment** and **brigade_mun_orders** as the primary means of “where the brigade is”: replaced by a single location (OSID).
- **Front-active** settlement concept (settlements requiring AoR assignment): removed. “Front” is redefined as hostile boundary in the OSID graph; brigades on OSIDs adjacent to enemy control or enemy brigades define the front.
- **AoR-derived pressure** (density over AoR, pressure diffusion): removed. Pressure/breach replaced by attack and push-back (see §5–§6).

### 2.4 Remapping brigade spawn points and init to OSID

All brigade **spawn points** and **initial locations** must be expressed and stored as **OSIDs**. Today formations use **canonical settlement IDs** (e.g. `hq_sid`) for HQ/placement; scenarios and OOB use **home_mun** and derived or stored SIDs. This must be remapped so that every brigade has a well-defined **location_osid** at creation and at Phase II entry.

- **Mapping source:** `data/derived/operational/canonical_to_operational_map.json` — each canonical SID maps to exactly one OSID. Use this for all SID → OSID remapping.
- **Formation init (existing formations):** Wherever the engine or scenario loader sets or derives a brigade’s location (currently `hq_sid`), it must instead set **location_osid**. Rule: take the canonical SID that would have been used for that brigade’s HQ/spawn, look up `canonical_to_operational_map[sid]` → **osid**, set `formation.location_osid = osid`. Optionally keep `hq_sid` as a display/legacy field (e.g. representative SID for that OSID) or phase it out; **location_osid** is authoritative for movement, ZoC, and combat.
- **Scenario / OOB:**  
  - **Option A (load-time remap):** Scenario and OOB continue to reference municipalities (`home_mun`) or canonical SIDs where they do today. At load/init, for each brigade we **derive** an OSID: e.g. from `home_mun` choose a deterministic “spawn OSID” (e.g. first faction-controlled OSID in that municipality by stable sort), or from an explicit or derived canonical SID apply `canonical_to_operational_map` to get OSID. Then set `location_osid` and do not store canonical SID as brigade location.  
  - **Option B (data migration):** Add an explicit **spawn_osid** (or **location_osid**) to scenario/OOB brigade definitions where needed, and migrate existing scenarios to populate it once from current `hq_sid`/home_mun via the canonical→operational map.  
  Recommendation: **Option A** for minimal scenario format churn; Option B if we want scenarios to be explicitly OSID-based and auditable.
- **Phase II entry / recruitment:** When a new brigade is created (OOB spawn or player recruitment), its **location_osid** must be set at creation: either from the chosen spawn OSID for that brigade (home_mun → one OSID by deterministic rule) or from scenario/OOB if spawn_osid is stored.
- **Determinism:** Remapping must be deterministic: same inputs (scenario, init_control, formation list) always yield the same **location_osid** per formation. Use stable ordering when picking “first OSID in municipality” or when multiple canonical SIDs map to the same OSID.

**Summary:** Every brigade gets **location_osid** at init; all spawn/HQ logic that currently uses canonical SIDs or home_mun must go through a single remapping path (canonical_to_operational_map + deterministic OSID choice per mun where needed). No brigade should be placed or moved in canonical settlement space for game logic.

---

## 3. Zone of Control (ZoC)

### 3.1 Definition

- **ZoC of a brigade:** The set of OSIDs that are **adjacent** (in the operational contact graph) to the OSID that brigade occupies.
- **ZoC of an OSID (with one or more enemy brigades):** Union of ZoCs of all enemy brigades on that OSID. So if multiple enemy brigades stack on OSID X, the ZoC from X is the union of ZoC(X) for each of those brigades (neighbors of X).

### 3.2 Who projects ZoC

- Only **deployed** brigades (status deployed on an OSID) project ZoC.
- Brigades in **column** (packing / in_transit / unpacking) do not project ZoC until they are deployed again.

### 3.3 ZoC lock rule

- An **enemy** brigade that is **in** the ZoC of a friendly brigade (i.e. the enemy’s OSID is in the friendly ZoC set) is **ZoC-locked**.
- **Allowed moves while ZoC-locked:**  
  1. **Stay** on current OSID.  
  2. **Retreat:** Move to an OSID that is **not** in any enemy ZoC (retreat “out of ZoC” to regain freedom of movement).  
  3. **Attack:** Move into the OSID occupied by the ZoC-owning enemy brigade (attack that tile). Resolution uses attack/combat formulas (see §5–§6).
- **Disallowed:** Any other move that would traverse or end in enemy ZoC (e.g. moving to a different enemy-ZoC tile without attacking the ZoC source).

### 3.4 Retreat

- **Retreat** = movement to an OSID that has no enemy ZoC. After retreat, the brigade is no longer ZoC-locked and may move freely (subject to normal movement rules) until it enters enemy ZoC again.
- Implementation may treat “retreat” as a distinct order type or as a constrained move (destination must be non–enemy-ZoC). To be fixed in spec.

---

## 4. Movement (outline)

### 4.1 Normal movement (no ZoC)

- Brigades move along edges of the **operational contact graph**.
- Movement may be restricted to **friendly-controlled** OSIDs only (canon to confirm), or allow movement into contested/enemy tiles only via attack.
- Movement rate (e.g. N OSIDs per turn for column movement, M for combat movement) to be defined; can mirror current “3 settlements combat, 12 column” idea scaled to OSID graph.

### 4.2 Movement in enemy ZoC

- As in §3.3: in enemy ZoC, only stay, retreat (to non–enemy-ZoC), or attack the ZoC source.
- Pathfinding: any path that would enter or remain in enemy ZoC without retreating or attacking is invalid.

### 4.3 Stacking and movement

- Multiple friendly brigades may end movement on the same OSID (stacking).
- No change to ZoC rule: each deployed brigade projects ZoC independently; enemy in any of those ZoCs is locked.

---

## 5. Combat and Control Change (attack-driven)

### 5.1 Principle

- **Control changes and front movement happen only when a brigade actively attacks** (or through defined frontline/corps operations). There is **no passive pressure/breach** that flips control over time without an attack.
- **Push-back:** When an attack succeeds (defender retreats or is eliminated), the **defender’s OSID** may change control to the attacker (and the attacker may advance into it). That is the primary mechanism for “front moves.”

### 5.2 Attack

- **Attack** = a brigade (or stack) on OSID A orders an attack on **adjacent** OSID B (where B is enemy-controlled or has enemy brigades).
- Resolution: combat formula (strength, terrain, stacking, etc.) produces outcome: **defender holds**, **defender retreats**, or **defender eliminated** (and optionally attacker advances). Exact outcomes to be defined in formulas.

### 5.3 Push-back and control flip

- When the **defender retreats** or is **eliminated** from OSID B:
  - **Control of B** flips to the attacker’s faction (political_controller(B) = attacker faction).
  - Attacker may **advance** into B (one or more attacking brigades move from A to B). If defender is eliminated, B may be empty and attacker occupies; if defender retreated, B might be empty or still have other defenders.
- **Front** then updates: hostile boundary is recomputed from control (and optionally brigade positions) on the OSID graph.

### 5.4 Frontline / corps operations

- **Frontline or corps operations** may provide additional ways to generate control change or “push-back” (e.g. coordinated multi-tile offensives, corps-level orders). Scope: to be defined; design should allow **only** (a) direct attack resolution, and (b) defined frontline/corps operations, as triggers for control change.

### 5.5 No passive pressure flip

- There is **no** mechanic whereby “pressure accumulates and after N turns the settlement flips” without an attack. All control change is **event-driven** by attack (or corps/frontline op) resolution.

---

## 6. New Formulas (outline)

The following need to be specified in a later pass (or in canon):

1. **Attack resolution**
   - Inputs: attacker strength (personnel/readiness), defender strength, terrain (OSID), stacking on both sides, optional posture/doctrine.
   - Outputs: casualties (both sides), outcome (hold / retreat / eliminated), and optionally retreat direction or advance.

2. **Push-back and control**
   - When defender retreats or is eliminated from OSID B: set political_controller(B) = attacker faction; update any state that tracks control by OSID.

3. **Retreat rules**
   - Valid retreat destinations: OSIDs not in any enemy ZoC; optionally restricted to friendly-controlled or contiguous-friendly to avoid “teleport” retreats. Priority if multiple (e.g. prefer rear, prefer same corps sector).

4. **Frontline / corps operations**
   - How corps or “frontline” orders translate into one or more attacks or coordinated push-backs; formula or procedure for multi-brigade ops.

5. **ZoC and combat modifier (optional)**
   - Whether attacking **into** enemy ZoC applies a modifier (e.g. defender bonus). If so, single formula or table.

All formulas must remain **deterministic** (no randomness, stable ordering).

---

## 7. State Model (outline)

### 7.1 Removed or deprecated

- `brigade_aor`: removed.
- `brigade_aor_orders`: removed (no settlement-level AoR reshaping).
- `brigade_municipality_assignment` / `brigade_mun_orders`: removed or repurposed (see below).

### 7.2 New or repurposed

- **Brigade location:** Each formation (brigade) has a single **location_osid: OSID**. Replaces “brigade is spread over AoR.” Movement updates this (and optionally movement_state: deployed | packing | in_transit | unpacking).
- **Control:** Political control is stored **by OSID** (or derived from existing control map via canonical→operational mapping). All “who controls this tile” checks use OSID.
- **ZoC-locked (optional):** Per-brigade flag or derived each turn: “this brigade is in enemy ZoC” (drives UI and allowed-orders validation).
- **Municipality / legacy:** If scenario or init still uses municipalities, keep a minimal link (e.g. brigade home_mun or corps sector) for display or supply; **movement and combat use only OSID**.

### 7.3 Fronts and assignment

- **Front** = contiguous segment of **hostile boundary in the OSID graph** (two adjacent OSIDs with different political_controller).
- **assignable_front_segments** and **brigade_front_assignment** can remain: brigades are assigned to a front segment; only assigned brigades can attack/move (reserve rule). Front segment geometry is defined by **edges between OSIDs** (not canonical settlements).
- **Theatre / army / corps:** Unchanged hierarchy; brigades still belong to corps/army; assignment to front remains.

---

## 8. Canon Impact (checklist)

The following documents and sections will require amendments:

| Document | Sections / topics to change |
|----------|-----------------------------|
| **Game Bible** | §7 (or equivalent) spatial responsibility: replace AoR with “brigade occupies one OSID; ZoC to neighbors; control change only by attack / push-back.” Rear political control zones: reframe around OSID control and “no flip without attack.” |
| **Rulebook** | AoR scope (§5), reshaping (§5.4), pressure and fronts (§5–§6): replace with OSID location, stacking, ZoC lock, retreat, attack-only control change. |
| **Systems Manual** | §2 (Settlement assignment and AoR): replace with OSID location, stacking, ZoC. §2.1 becomes “Brigade location and Zone of Control.” Pressure/breach (§7, battle resolution): replace with attack resolution and push-back formulas. All references to brigade_aor, brigade_mun_orders, front-active settlements: remove or rewrite. |
| **Phase II Specification** | §4.3 (brigade operations state): remove brigade_aor, brigade_mun_orders, brigade_aor_orders; add location_osid (and ZoC-locked if stored). §5 (pipeline): remove AoR steps (validate-brigade-aor, rebalance-brigade-aor, apply-municipality-orders, apply-aor-reshaping, etc.); add or replace with ZoC computation, attack resolution, push-back and control update. §7.1 (Brigade AoR at Phase II entry): replace with **brigade location init by OSID** — all spawn points and initial placements remapped from canonical SID (or home_mun) to OSID via canonical_to_operational_map; deterministic OSID choice when deriving from municipality. Movement: express in OSIDs; ZoC constraint. |

---

## 9. Phasing and Dependencies

1. **Design locked:** This outline agreed; then canonical formulas (attack, push-back, retreat) drafted and approved.
2. **Canon update:** Game Bible, Rulebook, Systems Manual, Phase II Spec updated per §8 (no code yet).
3. **State and data:** Operational graph and OSID control in state; **remap all brigade spawn points and init locations to OSID** (§2.4) using canonical_to_operational_map and deterministic OSID choice per home_mun; scenario init places brigades by location_osid only.
4. **Engine:** Remove AoR pipeline steps; implement ZoC (compute, lock rule), movement (ZoC-constrained), attack resolution, push-back and control flip.
5. **Bots and GUI:** Bots order movement and attack in OSID space; GUI shows brigades on OSIDs, ZoC, and retreat/attack options.

---

## 10. Summary Table

| Aspect | Current (AoR) | Target (HoI + ZoC) |
|--------|----------------|---------------------|
| Brigade position | AoR over many settlements | One OSID per brigade |
| Stacking | One brigade per settlement | Multiple brigades per OSID allowed |
| ZoC | None | Brigade radiates ZoC to neighboring OSIDs |
| Enemy in ZoC | N/A | Locked: stay, retreat, or attack ZoC source only |
| Control change | Pressure/breach on edges | Only when brigade attacks (or frontline/corps op); push-back |
| Front | Hostile settlement edges | Hostile OSID edges |
| State | brigade_aor, brigade_mun_orders, etc. | location_osid; no AoR |
| Spawn / init | hq_sid (canonical SID), home_mun | location_osid; remap via canonical_to_operational_map + deterministic OSID per mun |

This design outline is intended to guide canon changes and subsequent implementation planning; formula details and exact state keys are to be fixed in follow-up specs.
