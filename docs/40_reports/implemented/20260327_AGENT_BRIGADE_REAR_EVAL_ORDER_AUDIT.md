# Bot brigade evaluation order — rear stranding audit (2026-03-27)

**Scope:** `executeFactionDirectives` in `bot_brigade_ai_osid.ts` — which evaluators return `true` with **`continue`**, skipping `evaluateInteriorMovement`, and whether they issue movement/column orders.

**Mechanism:** The per-brigade loop uses `if (evaluateX(ctx)) continue;` for every step **before** `evaluateInteriorMovement`. Any evaluator that returns `true` **ends the iteration for that brigade**; `evaluateInteriorMovement` is **not** invoked (`bot_brigade_ai_osid.ts` 414–427).

---

## 1. Confirmed evaluation order

| Order | Function | Source |
|------:|----------|--------|
| — | *(column `in_transit` → posture + `continue`)* | `bot_brigade_ai_osid.ts` 408–413 |
| 1 | `evaluateGarrisonAndDetachments` | `bot_brigade_eval_hold.ts` 6–29 |
| 2 | `evaluateSectorMarch` | `bot_brigade_eval_front.ts` 39–169 |
| 3 | `evaluateReturnToCorps` | `bot_brigade_eval_front.ts` 181–243 |
| 4 | `evaluateHomeDefense` | `bot_brigade_eval_attack.ts` 38–65 |
| 5 | `evaluateReserve` | `bot_brigade_eval_hold.ts` 32–65 |
| 6 | `evaluateSupplyGate` | `bot_brigade_eval_attack.ts` 68–78 |
| 7 | `evaluateSectorAttack` | `bot_brigade_eval_attack.ts` 81–285 |
| 8 | `evaluateHold` | `bot_brigade_eval_hold.ts` 68–100 |
| 9 | `evaluateReorganize` | `bot_brigade_eval_attack.ts` 287–306 |
| 10 | `evaluateDefensive` | `bot_brigade_eval_attack.ts` 323–378 |
| 11 | `evaluateUncontestedOccupation` | `bot_brigade_eval_attack.ts` 418–514 |
| 12 | `evaluateOffensive` | `bot_brigade_eval_attack.ts` 381–404 |
| 13 | `evaluateFrontCoverage` | `bot_brigade_eval_front.ts` 245–352 |
| 14 | `evaluateInteriorMovement` *(always reached if no earlier `continue`)* | `bot_brigade_eval_movement.ts` 7–48 |

---

## 2. Evaluators that return `true` without issuing movement

These push **posture only** (and/or bookkeeping) and **no** `movement_orders` / `column_march_orders` / `attack_orders` on that path, so they **block** `evaluateInteriorMovement` when they fire.

| Function | File:lines | Behavior (no movement) |
|----------|------------|-------------------------|
| `evaluateGarrisonAndDetachments` | `bot_brigade_eval_hold.ts` 9–12, 16–18, 24–26 | `garrison === true` → defend; militia detachment → defend; `personnel < MIN_ATTACK_PERSONNEL` (500) → defend |
| `evaluateHomeDefense` | `bot_brigade_eval_attack.ts` 57–63 | When `home_defense_active && !isActiveSectorOperationParticipant`, after **not** taking the deep-rear `return false` branch (46–55): counterattack or defend posture only |
| `evaluateReserve` | `bot_brigade_eval_hold.ts` 58–60 | Reserve slot: defend only *(deep rear exits earlier at 57 with `return false`)* |
| `evaluateSupplyGate` | `bot_brigade_eval_attack.ts` 70–76 | `brigadeSupplyState === 'critical'` and **not** `isActiveSectorOperationParticipant` → defend only |
| `evaluateSectorAttack` | `bot_brigade_eval_attack.ts` 86–89 | `personnel < COMBAT_INEFFECTIVE_PERSONNEL` (400) → defend only *(see §3 — interaction with 500 gate)* |
| `evaluateSectorAttack` | `bot_brigade_eval_attack.ts` 133–135, 138–140, 150–152, 278–280 | Sector-op phases/objective branches that end in defend only (no column/attack issued on that path) |
| `evaluateHold` | `bot_brigade_eval_hold.ts` 95–97 | `hold_osids.includes(loc)` and **not** `(corpsStance === 'offensive' && adjEnemy.length > 0)` → defend only |
| `evaluateReorganize` | `bot_brigade_eval_attack.ts` 303–304 | `corpsStance === 'reorganize'` → defend only *(deep rear can `return false` at 300)* |
| `evaluateDefensive` | `bot_brigade_eval_attack.ts` 369–374 | `corpsStance === 'defensive'` after gap/counter paths: dig_in or defend *(deep rear can `return false` at 338)* |
| `evaluateOffensive` | `bot_brigade_eval_attack.ts` 399–403 | `corpsStance` offensive/balanced **and** `adjEnemy.length > 0`: dig_in/defend only |
| `evaluateFrontCoverage` | `bot_brigade_eval_front.ts` 347–348 | On front (`adjEnemy.length > 0`), no other branch matched: defend only |

**Not “no movement” when `true`:** `evaluateSectorMarch` and `evaluateReturnToCorps` set `column_march_orders` / `movement_orders` when they return `true` (typical paths). `evaluateUncontestedOccupation` sets attack orders.

---

## 3. `evaluateSectorAttack` personnel `< 400` vs `evaluateGarrisonAndDetachments` `< 500`

- `MIN_ATTACK_PERSONNEL` is **500** (`src/state/formation_constants.ts` 79).
- `evaluateGarrisonAndDetachments` runs **first** and returns `true` with defend-only for `personnel < 500` (`bot_brigade_eval_hold.ts` 24–26).
- Therefore, for the **current** ordering and constants, a brigade with `personnel < 400` **never reaches** `evaluateSectorAttack`; the `COMBAT_INEFFECTIVE_PERSONNEL` (400) block (`bot_brigade_eval_attack.ts` 86–89) is **unreachable** unless the garrison threshold or order changes.

**Practical stranding for “low personnel” in deep rear** is governed by the **500** gate, not the **400** line inside `evaluateSectorAttack`.

---

## 4. Early-return paths that can strand a brigade in “deep rear”

**Working definition (aligned with existing “deep rear” checks):** `adjEnemy.length === 0`, current OSID has no `enemy_neighbors` in `graphAnalysis`, and **no** neighbor OSID is “near front” (neighbor with `enemy_neighbors.length > 0`). Same pattern as `evaluateHomeDefense` / `evaluateReserve` / `evaluateReorganize` / `evaluateDefensive`.

| Path | File:lines | Why it strands interior |
|------|-------------|-------------------------|
| **Garrison / detachment / `< 500` personnel** | `bot_brigade_eval_hold.ts` 9–26 | Returns `true` with defend only; **no** deep-rear exception |
| **Critical supply, non–sector-op** | `bot_brigade_eval_attack.ts` 70–76 | Returns `true` with defend only; op participants **bypass** (`return false` at 73) |
| **`hold_osid` (chokepoint) + not offensive+adjacent** | `bot_brigade_eval_hold.ts` 76–97 | Else branch: defend + `return true`; **no** deep-rear carve-out (unlike home defense / reserve / reorganize / defensive) |
| **`home_defense_active`** (near front or adj enemy context) | `bot_brigade_eval_attack.ts` 42–63 | Deep rear is exempt (46–55 → `return false`); if **not** deep rear, defend/counterattack only |
| **Sector march `return false`** | `bot_brigade_eval_front.ts` 76–84, 88–95, 98–107 | Does not `continue`; later evaluators may still strand or reach interior — not a `continue` blocker by itself |
| **Column transit** | `bot_brigade_ai_osid.ts` 408–413 | `continue` without any interior eval — by design for in-transit column |

**Less relevant for “no adjEnemy” deep rear:** `evaluateOffensive` returns `false` when `adjEnemy.length === 0` (`bot_brigade_eval_attack.ts` 395). `evaluateFrontCoverage` only takes the final “hold front” branch when `adjEnemy.length > 0` (`bot_brigade_eval_front.ts` 325+).

---

## 5. Minimal fix options (conceptual) and risks

| Option | Idea | Upside | Risk |
|--------|------|--------|------|
| **A. Align “ineffective” threshold** | Single personnel gate (or remove redundant 400 block in `evaluateSectorAttack` if 500 remains upstream) | Less confusion; avoids duplicate semantics | If garrison threshold is lowered later, 400 might need to exist only in one place |
| **B. Deep-rear exception for `evaluateSupplyGate`** | If deep rear + critical supply, `return false` so interior can run (column march toward supply/front) | Rear units might reposition for logistics | Could pull critically supplied units toward danger; must match design intent for “critical” |
| **C. Deep-rear exception for `evaluateHold`** | Mirror `evaluateHomeDefense` / reserve: if `hold_osids` but deep rear, `return false` | Chokepoint tags don’t freeze units miles from front | **High:** hold orders may intentionally pin units; corps might rely on hold for enclaves/chokepoints even in “rear” graph sense |
| **D. Narrow “deep rear” for hold** | Only bypass hold when `!directive.hold_osids` relevance *and* e.g. hops-to-front ≥ N | Safer than blanket hold bypass | More parameters; needs tuning and tests |
| **E. Personnel gate** | Allow interior/column for 400–499 if only “defend” is desired without freezing map position | Reduces idle rear stacks | Reopens attack paths if other gates fail; must stay consistent with combat rules |

**Suspected user scenario (`< 400` in `evaluateSectorAttack`):** With current code, **effective** block is **`evaluateGarrisonAndDetachments` at 500**, not the 400 branch in `evaluateSectorAttack`.

---

## 6. `player_faction` exclusion

- `generateAllBotOrdersOsid` does **not** read `player_faction`; it receives an explicit `botFactions` list.
- Call site: `war_phases.ts` 1022–1024 — `factions` excludes `player_faction` when set:

```1022:1024:src/sim/turn_phases/war_phases.ts
            const playerFaction = context.state.meta.player_faction ?? null;
            const factions = (context.state.factions ?? []).map(f => f.id)
                .filter(fid => playerFaction == null || fid !== playerFaction);
```

So this entire evaluation loop applies **only to non-player factions** when a human faction is selected. No additional `player_faction` checks appear inside the bot brigade evaluators audited here.

---

## 7. References (key line ranges)

- Loop + `continue` chain: `bot_brigade_ai_osid.ts` 408–427  
- `evaluateSupplyGate`: `bot_brigade_eval_attack.ts` 68–78  
- `evaluateSectorAttack` (400 gate + sector op): `bot_brigade_eval_attack.ts` 81–285  
- `evaluateGarrisonAndDetachments` / `evaluateReserve`: `bot_brigade_eval_hold.ts` 6–65  
- `evaluateHomeDefense` (deep rear): `bot_brigade_eval_attack.ts` 38–65  
- `evaluateHold`: `bot_brigade_eval_hold.ts` 68–100  
- `evaluateInteriorMovement` (fallback): `bot_brigade_eval_movement.ts` 7–48  
- `MIN_ATTACK_PERSONNEL`: `src/state/formation_constants.ts` 75–79  

---

*Agent: gameplay-programmer audit. No code changes in this report.*
