# Brigade rear / sector march audit (2026-03-27)

**Role:** Gameplay programmer (Pyrrhic Games)  
**Scope:** `evaluateSectorMarch`, `evaluateReturnToCorps`, `evaluateFrontCoverage`; main evaluation loop; relationship to `issueInteriorMovement` / `findFrontDestinationForColumnMarch`.

**Primary sources:** `src/sim/combat/bot_brigade_eval_front.ts`, `src/sim/combat/bot_brigade_ai_osid.ts` (`executeFactionDirectives`), `src/sim/combat/bot_brigade_movement_ai.ts`, `src/sim/combat/bot_brigade_eval_movement.ts`.

---

## 1. Main loop order (per brigade)

From `executeFactionDirectives` in `bot_brigade_ai_osid.ts`:

1. Column transit (`stance === 'column'` && `in_transit`) → posture `defend`, **continue** (no new march).
2. `evaluateGarrisonAndDetachments` → **continue** if true.
3. **`evaluateSectorMarch`** → **continue** if true.
4. **`evaluateReturnToCorps`** → **continue** if true.
5. `evaluateHomeDefense` → **continue** if true (but deep-rear home-defense can **return false** to fall through — see §3).
6. `evaluateReserve` → **continue** if true (deep-rear reserve candidate can **return false** — see §3).
7. `evaluateSupplyGate` → **continue** if true.
8. `evaluateSectorAttack` → **continue** if true.
9. `evaluateHold` → **continue** if true.
10. `evaluateReorganize` → **continue** if true.
11. `evaluateDefensive` → **continue** if true.
12. `evaluateUncontestedOccupation` → **continue** if true.
13. `evaluateOffensive` → **continue** if true.
14. **`evaluateFrontCoverage`** → **continue** if true.
15. **`evaluateInteriorMovement`** — **always invoked** if the loop reaches it (final fallback in this file).

If any step returns **true**, the loop **`continue`s** to the next brigade; **no later step runs** for that brigade.

---

## 2. `evaluateSectorMarch` — false without `column_march_orders`

`evaluateSectorMarch` **only** writes `column_march_orders` when it returns **true** (lines 109, 157). Every **true** exit includes a `column_march_orders[brigade.id]` assignment.

Conditions that end with **`return false`** and **no** `column_march_orders` (and typically no other orders from this function):

| # | Condition | Notes |
|---|-----------|--------|
| A | `!state.military.corps_front_sectors` **or** `isActiveSectorOperationParticipant` | Whole sector-march block skipped; function falls through to final `return false`. Active `sector_attack` participants skip sector march entirely. |
| B | Brigade not in any sector’s `assigned_brigade_ids` or `reserve_brigade_ids` | `assignedSector` stays null → final `return false`. |
| C | Pending `brigade_movement_orders` with `destination_sids` containing **`home_osid`** | Avoids fighting `issuePostOperationReturnMarches`. **No** sector march. |
| D | Brigade not on sector front (`!frontSet.has(loc)`), **reserve**, and **1-hop behind front** (`nearFront`: some neighbor has `enemy_neighbors.length > 0`) | Intentional: 1-hop reserves stay as reinforcement pool; **no** column march here. |
| E | Enclave-tagged brigade (`tags` includes `'enclave'`) and **no** sector front OSID in the **same enclave** as `loc` (`!hasEnclaveTarget`) | Skips marching out of the pocket via sector front set. |
| F | Not on front, `frontSet.size > 0`, but `findNearestFriendlyOsidDestination(...)` returns **null** | Cannot path to a sector front OSID. |
| G | Not on front, `frontSet.size === 0` | Inner block that sets march never runs → final `return false`. |
| H | **Home-distance guard:** `home_osid` set, `bfsDistanceRaw(homeOsid, dest, adjacency, MAX_SECTOR_MARCH_FROM_HOME + 1) > MAX_SECTOR_MARCH_FROM_HOME` (with **`MAX_SECTOR_MARCH_FROM_HOME = 4`**) | `dest` was chosen, but march skipped — **stuck rear** risk when sector front is graph-far from home. |
| I | On sector front (`frontSet.has(loc)`) but **not** in overstack + multi-front redistribution case, or overstack logic finds **no** valid `dest` / all candidates full | No march issued from this branch; final `return false`. |

**What happens next** when `evaluateSectorMarch` returns **false:** execution continues with `evaluateReturnToCorps`, then home defense, reserve, supply, attacks, hold, etc., ending in `evaluateInteriorMovement` if nothing earlier **continue**d.

---

## 3. Related fall-through paths (not in `bot_brigade_eval_front.ts`)

These are **not** `evaluateSectorMarch` but affect whether a rear brigade reaches **`evaluateInteriorMovement`**:

- **`evaluateHomeDefense`** (`bot_brigade_eval_attack.ts`): If `home_defense_active` and deep rear (no adjacent enemy, not near front), it **`return false`** so the brigade is **not** held in home defense — falls through toward interior movement.
- **`evaluateReserve`** (`bot_brigade_eval_hold.ts`): If the brigade would be reserve but is **not** within 1 hop of front (`!nearFront`), it **`return false`** — falls through (same intent: avoid idle deep rear).

So “stuck rear” from **H** (home-distance skip) can still be mitigated **later** if the brigade is not caught by supply gate / sector attack / hold / defensive / offensive / front coverage, and lands in **`evaluateInteriorMovement`**.

---

## 4. `evaluateReturnToCorps` — false without `column_march_orders`

This function issues **`movement_orders`** (one hop), **not** `column_march_orders` (see lines 237–239).

It **`return false`** when:

| # | Condition |
|---|-----------|
| A | No `corps_front_sectors` |
| B | Brigade is **assigned** or **reserve** in **any** sector |
| C | Brigade stands on **some** sector **territory** (`territory_osids`) of **its** corps |
| D | No `corpsTerritory` OSIDs collected (empty) |
| E | BFS through **friendly** cells (`political_controllers`) never reaches any corps territory OSID |
| F | First step toward corps territory invalid or `step === loc` |

**Next in loop:** same as §1 from `evaluateHomeDefense` onward.

---

## 5. `evaluateFrontCoverage` — false without `column_march_orders`

- **`evaluateFrontCoverage` returns `false` only at the end** when **`adjEnemy.length === 0`** (brigade has **no** adjacent enemy OSID — interior / deep rear relative to adjacency-based “front contact”).
- If **`adjEnemy.length > 0`**, the function **always returns `true`** (movement and/or posture), including cases that only set **`movement_orders`** or **`posture_orders`** without **`column_march_orders`**.

**Exception path that *does* set `column_march_orders`:** Rule **5b2** (sector reassignment): if `directive.sector_reassignment_orders` matches and hops ≥ `COLUMN_MARCH_MIN_HOPS`, it uses **`column_march_orders`**; else **`movement_orders`**.

**Next in loop:** if **`false`** (not adjacent to enemy), **`evaluateInteriorMovement`** runs.

---

## 6. Interior movement vs sector march: duplicate or replace?

### Different responsibilities

| Aspect | `evaluateSectorMarch` | `issueInteriorMovement` / `findFrontDestinationForColumnMarch` |
|--------|------------------------|------------------------------------------------------------------|
| **When** | Earlier in loop; only if sector-assigned/reserve and not active sector-op participant in the sector-march sense | **`evaluateInteriorMovement`** only if no earlier evaluator **continue**d |
| **Destination** | **Sector-scoped:** `assignedSector.sub_segments` → `friendly_osids` (sector front set), via `findNearestFriendlyOsidDestination` | **Faction graph:** BFS through friendly/unoccupied to nearest **graphAnalysis** front OSID by classification priority (undefended → critical → threatened → active), **not** tied to a single sector’s front set |
| **Distance guard** | **`bfsDistanceRaw` home → chosen `dest` ≤ 4** (raw adjacency) | **No** `MAX_SECTOR_MARCH_FROM_HOME`; uses `computeHopsToFront` only to choose column vs 1-hop |
| **Reserve 1-hop** | Reserve **behind** front may **skip** sector march | **N/A** (different entry: interior / priority sector / directive targets first in `evaluateInteriorMovement`) |

### Verdict

- **Not duplicates:** They are **different selectors** for “where to go.” Sector march is **assignment-faithful** to the corps sector front; interior movement is **global-nearest front** (with caps like `MAX_COLUMN_MARCH_PER_OSID` on destinations).
- **Not strict replacements:** If sector march **skips** (e.g. home-distance, enclave, 1-hop reserve), later stages may still move the brigade via **movement** or **interior column march** to a **different** front than the sector’s `friendly_osids` — **behavioral drift** is possible if those paths disagree.
- **`findFrontDestinationForColumnMarch`** is used **inside** `issueInteriorMovement` for generic interior reinforcement, **not** inside `evaluateSectorMarch`, which uses **`findNearestFriendlyOsidDestination`** into the **sector** `frontSet`.

---

## 7. `MAX_SECTOR_MARCH_FROM_HOME` and faction-filtered distance — assessment

### Design intent (from file comments)

- **`MAX_SECTOR_MARCH_FROM_HOME = 4`** caps **raw** BFS hops from **`brigade.home_osid`** to the **chosen sector-front destination** `dest`.
- **Rationale:** Prevent **brigade drift** when a corps sector spans distant fronts (example in comments: **SRK Vogosča → Goražde**): brigades “belonging” near one sub-theater should not be drawn to a far sector front.
- **`bfsDistanceRaw`** deliberately uses **unfiltered** adjacency so distance is still defined when **`home_osid`** lies in **enemy-controlled** territory (faction-filtered paths might not reach home).

### Raising the cap

- **Pros:** More sector marches succeed for brigades whose **home** is many hops from the **sector** front but still “same corps” — reduces **stuck rear** when **H** fires.
- **Cons:** Directly **reopens** the **Vogosča → Goražde** class of drift if the sector’s `friendly_osids` include both ends of a long sector; the cap is the **primary** guard against that.

### Faction-filtered distance

- **Pros:** Could mirror “reachable through friendly lines” and sometimes differ from raw hop count.
- **Cons:** Comments state **home may be in enemy territory**; a faction-only BFS from home might be **infinite or misleading** for distance. Using it for the **same** guard could **block** marches that should be allowed or **allow** marches that raw distance correctly flags as too long.

### Practical takeaway

- **Raising the cap** without other constraints **trades** drift risk for rear mobility; **calibration-sensitive**.
- **Faction-filtered distance from home** is **not a drop-in fix** for the same guard without revisiting **home_osid** semantics and edge cases (enemy-held home, enclaves).
- Safer directions (if changing behavior): **corps- or sector-local** affinity (e.g. distance from **corps HQ** or **nearest sector territory OSID** instead of home), or **split sectors** so `friendly_osids` do not span incompatible theaters — **design** fixes rather than only raising the cap.

---

## 8. File references

```12:16:src/sim/combat/bot_brigade_eval_front.ts
 * Maximum BFS hops a brigade should march from its home_osid to reach a sector front.
 * Prevents brigade drift: e.g. SRK Vogosca brigades marching 80km to Gorazde because
 * their sector spans both fronts. If dest is farther than this from home, skip the march.
 */
const MAX_SECTOR_MARCH_FROM_HOME = 4;
```

```408:428:src/sim/combat/bot_brigade_ai_osid.ts
        if (existingTransit?.stance === 'column' && existingTransit?.status === 'in_transit') {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            continue;
        }
        if (evaluateGarrisonAndDetachments(ctx)) continue;
        if (evaluateSectorMarch(ctx)) continue;
        if (evaluateReturnToCorps(ctx)) continue; // Before hold/defense — orphans march home first
        if (evaluateHomeDefense(ctx)) continue;
        if (evaluateReserve(ctx)) continue;
        if (evaluateSupplyGate(ctx)) continue;
        if (evaluateSectorAttack(ctx)) continue;
        if (evaluateHold(ctx)) continue;
        if (evaluateReorganize(ctx)) continue;
        if (evaluateDefensive(ctx)) continue;
        if (evaluateUncontestedOccupation(ctx)) continue;
        if (evaluateOffensive(ctx)) continue;
        if (evaluateFrontCoverage(ctx)) continue;
        evaluateInteriorMovement(ctx);
```

---

*End of audit.*
