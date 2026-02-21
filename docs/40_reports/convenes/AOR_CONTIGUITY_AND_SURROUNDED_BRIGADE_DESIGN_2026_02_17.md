# AoR Contiguity and Surrounded Brigade — Design and Solution

**Date:** 2026-02-17  
**Goal:** (1) Ensure no brigade covers a non-contiguous settlement (e.g. surrounded by enemy). (2) Define what happens when a brigade is entirely surrounded (pocket/enclave) and recommend a practical solution.

---

## 1. Requirements (from user)

- A brigade **cannot cover a settlement that is not contiguous** — i.e. a settlement surrounded by enemy settlements must not be in any friendly brigade's AoR.
- When a **single brigade is surrounded** (its AoR or position is in a pocket), we must handle it: breakthrough, surrender, annihilation, or another outcome. User suggested **reformation in home territory** as the preferred practical solution.

---

## 2. Contiguity invariant (already in place)

- **Brigade AoR contiguity:** Each brigade's AoR must be one connected component on the settlement graph. Implemented via `checkBrigadeContiguity`, `repairContiguity`, `enforceContiguity` (corps_directed_aor). Orphan (island) settlements are reassigned to an adjacent same-faction brigade or set to null.
- **Gap:** `enforceContiguity` was not run in the turn pipeline after `rebalanceBrigadeAoR`. Rebalance can create receiver-side islands when absorbing from a donor. Also, rebalance did not check that the **receiver** remains contiguous when accepting a transfer.

**Changes made:**
- **Receiver contiguity in rebalance:** When absorbing a settlement into an undersized brigade, only accept the transfer if the receiver's AoR would remain contiguous (i.e. the candidate settlement is graph-adjacent to at least one settlement already in that brigade's AoR). Implemented by checking `checkBrigadeContiguity([...receiverSettlements, sid], adj).contiguous` before transfer.
- **Pipeline:** Add step `enforce-brigade-aor-contiguity` after `rebalance-brigade-aor` and before `enforce-corps-aor-contiguity`, calling `enforceContiguity(state, frontActive, adj)`. This repairs any islands (e.g. from control flips) so no brigade keeps non-contiguous coverage.
- **Enemy-surrounded settlements:** A settlement with no same-faction neighbor cannot be meaningfully "covered" by a brigade (it is an island of control). `enforceContiguity` already sets such settlements to `brigade_aor[sid] = null` when no adjacent same-faction brigade exists. No extra step required.

---

## 3. Historical outcomes for surrounded units (BiH war)

**Sources:** Balkan Battlegrounds (BB1/BB2), enclave/pocket patterns (Srebrenica, Žepa, Goražde, Bihać).

| Outcome | Description | BiH examples |
|--------|--------------|---------------|
| **Breakthrough** | Unit fights out to rejoin main forces. | Local breakouts from pockets; often costly and not always successful. |
| **Surrender** | Unit capitulates; personnel become POWs or displaced. | Various isolated garrisons; not always modeled as formation dissolution. |
| **Annihilation** | Unit destroyed in place. | Possible when pocket is overrun (e.g. enclave fall). |
| **Hold / Defend** | Unit remains in pocket (enclave) and is supplied or supplied by air/convoy. | Srebrenica, Žepa, Goražde, Bihać — sustained as enclaves with external support or humanitarian corridors. |
| **Reformation in rear** | Unit is considered "cut off" and is reconstituted in home/friendly territory; original pocket may hold out separately (militia/defenders) or be written off. | Operationally, some forces were withdrawn or reconstituted; others stayed as garrison. |

**Design takeaway:** For a **single brigade** (not a whole enclave) that is entirely in a pocket:

- **Reformation in home territory** is a practical and historically plausible choice: the formation is treated as cut off and is "reformed" in home municipality (or nearest friendly territory), freeing the player from managing an isolated unit. The pocket settlement(s) remain faction-controlled but lose brigade coverage (militia/rear defense only until next assignment).
- Alternatives (breakthrough attempt, surrender, annihilation) add more systems (combat resolution for breakout, POW state, removal of formation). Reformation keeps the formation in the OOB and avoids one-off edge cases.

---

## 4. Recommended solution: Reform in home territory

**Rule:** If a brigade's **entire AoR** lies inside an **enclave** (disconnected component of faction territory that is not the main territory), the brigade is **surrounded**. Apply **reform in home territory**:

1. **Detect:** Brigade is surrounded iff every settlement in its AoR belongs to an enclave (i.e. the brigade's AoR set has no intersection with the faction's main territory).
2. **Reform:**
   - Clear all `brigade_aor[sid]` entries for settlements currently assigned to this brigade (set to null).
   - Set brigade `hq_sid` to a valid **home-territory** settlement: the faction-controlled HQ settlement of the brigade's home municipality (from formation tags `mun:*` or OOB), or the first (by SID sort) faction-controlled settlement in that municipality. If home municipality has no faction-controlled settlement, use first (by SID sort) faction-controlled settlement in **main territory** (any mun). If no main-territory settlement is faction-controlled, leave HQ as-is and mark formation `status: 'inactive'` (stranded).
   - Do not remove the formation; do not change personnel. The brigade "reappears" at home for the next AoR derivation turn.

**Determinism:** Sorted iteration over brigades and settlements; no randomness. Same faction, same enclave detection (from existing `detectDisconnectedTerritories`).

**Pipeline:** New step `surrounded-brigade-reform` after `enforce-corps-aor-contiguity`. Uses existing `detectDisconnectedTerritories`; for each faction, for each brigade whose AoR is non-empty and entirely within an enclave, apply reform.

---

## 5. Implementation summary

| Item | Location / change |
|------|--------------------|
| Receiver contiguity in rebalance | `rebalanceBrigadeAoR` Phase 2: before accepting a transfer, require `checkBrigadeContiguity([...receiverSettlements, sid], adj).contiguous`. |
| enforceContiguity after rebalance | Turn pipeline: new step `enforce-brigade-aor-contiguity` after `rebalance-brigade-aor`, calling `enforceContiguity(state, frontActive, adj)`. |
| Surrounded-brigade reform | New module or section in `brigade_aor.ts` or `corps_sector_partition.ts`: `applySurroundedBrigadeReform(state, edges)`; called from new pipeline step `surrounded-brigade-reform`. |

---

## 6. References

- Phase II Spec §2.1 (AoR, front-active); Systems Manual §2.1 (AoR assignment, contiguity).
- `detectDisconnectedTerritories`, `enforceContiguity`, `repairContiguity` (aor_contiguity.ts, corps_directed_aor.ts).
- Balkan Battlegrounds historical extractor skill: enclave/pocket survival, holdouts.
- CONSOLIDATED_BACKLOG §7 (AoR extreme imbalance — HIGH).
