# Formation Expert: Tactical Sandbox Canonization Assessment

**Date:** 2026-02-20  
**Source:** Review of `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md` §4.2, §4.3, §4.5, §6.2  
**Role:** Formation Expert (militia spawning, brigade formation, AoR, OOB)

---

## 1. AoR: “Expansion on Deploy” — Canon vs Sandbox-Only

**Sandbox rule (§4.2):** On deploy completion, AoR expands from HQ to “HQ + adjacent friendly/uncontrolled,” cap `min(4, max(1, floor(personnel/400)))`.

**Canon:** AoR is driven by `brigade_municipality_assignment` and rebalance. Pipeline: `initializeBrigadeAoR` (Phase II entry), `rebalance-brigade-aor`, `enforce-brigade-aor-contiguity`, `apply-municipality-orders` (before pressure/attack), `apply-aor-reshaping` (player `brigade_aor_orders`). There is **no** canon step that “expands AoR on deploy”; deploy/undeploy is not a first-class state in the main engine (only pack/in_transit/unpack in `brigade_movement.ts`).

**Recommendation:** Keep **“expansion on deploy” sandbox-only**. Do not add it as a canon pipeline step. Reasons: (1) Canon already has a full AoR lifecycle (municipality assignment → derive AoR → rebalance → contiguity → reshape orders); (2) sandbox expansion also **claims control** for uncontrolled settlements added to AoR, which would conflate AoR assignment with control flips and conflict with Phase II “control changes only via military resolution”; (3) `aor_reshaping` and `enforce-brigade-aor-contiguity` operate on existing assignment/rebalance output—adding an automatic “expand on deploy” step would require defining when it runs (e.g. after movement unpack?) and how it interacts with municipality orders and rebalance, increasing coupling and ambiguity. If a future design wants “deploy = expand AoR” in canon, it should be a **design change** (Game Bible / Phase II spec) with explicit interaction with `apply-municipality-orders` and rebalance, not a silent port from the sandbox.

**Interaction with existing systems:** Sandbox expansion does not call `enforceContiguity` or rebalance; it is a one-off BFS from HQ. Canon `enforce-brigade-aor-contiguity` runs after rebalance and repairs islands. Porting “expand on deploy” would need to run before or after rebalance and still satisfy contiguity; that implies either running contiguity again after expansion or folding expansion into a rebalance-like step. No change recommended.

---

## 2. Movement: Consistency with Phase II and Missing Invariants

**Sandbox (§4.3):** `computeReachableSettlements` BFS, `maxHops` 6 (undeployed) / 3 (deployed). Multi-click destination with contiguity; max settlements = personnel-based `min(4, max(1, floor(personnel/400)))`. Pre-claim: sandbox claims uncontrolled path settlements before calling the engine so that canon BFS (friendly-only) can traverse the path.

**Canon:** `processBrigadeMovement` uses a **fixed** `MOVEMENT_RATE = 3` and `shortestPathThroughFriendly` (friendly-controlled only). No 6 vs 3 by deploy state. Orders are `brigade_movement_orders[brigadeId].destination_sids` (settlement-level); `brigade_mun_orders` are municipality-level and applied in `apply-municipality-orders`. Path cost = `ceil(steps / MOVEMENT_RATE)`; no hop limit other than path length.

**Consistency:**  
- **Inconsistent:** Sandbox 6/3 hop rule and “undeployed = 6, deployed = 3” are **not** in canon. Canon has a single movement rate (3) and no deploy/undeploy state. Porting “movement radius” UI (BFS, maxHops) into the main game is fine for **display** (e.g. show reachable settlements with a chosen max hop count), but making 6/3 or deploy-based rate **canon** would require a spec change (e.g. BrigadeMovementStatus or a new “column march” state and two rates).  
- **Consistent:** Multi-click destination with **contiguity** and **personnel-based max settlements** aligns with existing desktop validation (`validateBrigadeMovementOrder`: 1–4 contiguous same-faction). Personnel-based cap is already reflected in operational coverage (e.g. `computeBrigadeOperationalCoverageCap`); using `min(4, max(1, floor(personnel/400)))` for **movement** destination count is a reasonable and canon-friendly rule if documented.  
- **Pre-claim:** Sandbox pre-claim of uncontrolled path is sandbox-only; canon does not change control for movement. Main game should not pre-claim; movement remains through friendly territory only unless a future design adds “march through neutral” with explicit rules.

**Missing invariants (HQ after move):**  
- **Canon:** `processBrigadeMovement` does **not** set `formation.hq_sid` when unpacking; it only assigns `destination_sids` to `brigade_aor`. The pipeline step **formation-hq-aor-depth-sync** (after `apply-aor-reshaping`) runs `runFormationHqRelocation`, which sets `hq_sid` to a depth-2 settlement within the brigade’s AoR (or relocates if HQ is in enemy territory). So HQ **is** updated after move, but indirectly via formation-hq-aor-depth-sync.  
- **Sandbox:** Explicitly sets HQ to “first (sorted) AoR settlement” after turn. That is a valid, simple invariant.  
- **Recommendation:** Document that canon relies on formation-hq-aor-depth-sync for HQ-after-move; no code change required. If porting sandbox UI, either (a) show HQ from state after sync, or (b) mirror sandbox and set HQ to first AoR settlement in a **display-only** way for the map, without mutating canonical state.

---

## 3. Front Line “Teeth”: Both Settlements Have Brigade in AoR

**Sandbox (§4.5):** Front line teeth drawn only between settlements where **both** have a brigade in AoR (not just faction control).

**Canon / main map:**  
- **Front edges:** `computeFrontEdges(state, edges)` uses **political control** only: different non-null controllers on each side of an edge; RBiH–HRHB gated by war turn and alliance. No brigade-in-AoR condition.  
- **Main tactical map drawing:** `MapApp.drawFrontLines` builds `defendedByFaction` from `brigadeAorByFormationId` and **skips** a segment only when **neither** settlement is defended (`if (!aDefended && !bDefended) continue`). So the main map draws a front segment when **at least one** side has a brigade in AoR (and control differs).

**Conclusion:** Sandbox “both settlements have a brigade in AoR” is **stricter** than the main map’s “at least one defended.” It aligns with a **FEBA (Forward Edge of Battle Area)** interpretation where the drawn line represents actual troop-on-troop contact. The current **front-edge logic** (pressure, breach, etc.) remains control-based; the **visual** “teeth” can consistently use either rule. **Recommendation:** Treat sandbox “both in AoR” as a **valid, stricter visual rule** for FEBA. Optionally document in TACTICAL_MAP_SYSTEM or implementation doc: “Sandbox front teeth: both settlements in brigade AoR; main map front lines: at least one settlement in brigade AoR,” so future 3D or unified rendering can choose. No change to canon front-edge derivation.

---

## 4. What to Canonize vs Keep Sandbox-Only (Summary)

**Canonize (document and/or port behavior, no conflict with existing canon):**  
- **AoR reshape and apply flow:** Already canon (`brigade_aor_orders`, `applyReshapeOrders`, `enforce-brigade-aor-contiguity`). No change.  
- **Deploy/undeploy as UX mapping:** Map sandbox `deployed`/`undeployed` to canon `BrigadeMovementStatus` packed/unpacked for **display** (e.g. “column march” vs “combat posture”) without adding a new engine state, unless design explicitly adopts two movement rates and a deploy step.  
- **Movement destination rules:** Multi-click, contiguity, and personnel-based max settlements (1–4) are consistent with desktop validation; document as the intended movement-destination rule. BFS reachability for **UI** (show reachable settlements with a configurable max hop) can be ported; if a **second** movement rate (e.g. 6 for “column”) is ever canonized, it belongs in Phase II spec and `brigade_movement.ts`.  
- **Front line teeth rendering:** Port the “both in AoR” rule as an **option** for FEBA-style drawing; document the difference from “at least one defended” so both main map and 3D/sandbox can be consistent where desired.

**Keep sandbox-only:**  
- **AoR expansion on deploy:** Do not add as a pipeline step; it would overlap and conflict with municipality assignment, rebalance, and contiguity.  
- **Pre-claim of uncontrolled path:** Canon movement stays friendly-only; no control flip for movement path.  
- **Settlement starting control (all uncontrolled):** Scenario-driven in canon.  
- **Click-to-spawn panel:** Spawning remains formation_spawn / recruitment in canon.

**Formation-expert concerns for future canonization:**  
- **Corps / army_hq:** Sandbox shows corps aggregation and command lines; canon has `corps_command` and formation hierarchy. Any “deploy” or “movement rate by posture” that is canonized should state how it applies to corps HQs and subordinate brigades (e.g. movement rate per brigade, not per corps).  
- **Personnel cap formula:** Using `min(4, max(1, floor(personnel/400)))` for both AoR expansion (sandbox) and movement destination count is consistent with existing operational coverage ideas; if canon ever adds “expand AoR on deploy,” the same formula should be used and defined in one place (e.g. Systems Manual or formation constants).

---

*Assessment complete. No napkin update beyond the sandbox front-line note already added.*
