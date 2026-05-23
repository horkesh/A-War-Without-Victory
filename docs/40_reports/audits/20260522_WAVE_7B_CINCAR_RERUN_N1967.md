# Wave 7B re-run audit — n1967 vs n1966 — Cincar political_blocked

**Date:** 2026-05-22
**Run:** `apr1992_definitive_188w__210e69404d054959__w188_n1967`
**Compare:** `apr1992_definitive_188w__210e69404d054959__w188_n1966`
**Hash delta:** n1966 `ccc07196fb899651` → n1967 `cedf38d1eb21c177` (different — Wave 7B is a real engine-state change)
**Faction count delta vs jan1993 painted reference:** byte-identical to n1966 (HRHB −47, RBiH +20, RS +27)

---

## TL;DR

Wave 7B's brigade-pool widening for `kupres_cincar_94` **worked at the assembly layer**:
- force ratio jumped from **0.127 → 1.602** (12.6× improvement, well above MIN_LAUNCH_FORCE_RATIO_FLOOR)
- all four expected brigades attached (`hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`, `hv_4th_guards_split`, `hvo_rama_brigade`)
- `initial_strength` rose **3,600 → 8,100**
- `objectives_targeted` now includes the inserted `op:kupres:kupres_2`

**But Cincar still fires zero attacks.** Recovery reason flipped from `defender_power_too_high` (n1966) to **`political_blocked`** (n1967). Duration extended **2 → 6 turns** as the engine repeatedly checked the political gate, then aborted.

Root cause: `hvo_tomislavgrad` corps is in the **West Herzegovina Graz pair** (`vrs_2nd_krajina ↔ hvo_tomislavgrad`). Graz Accords activated at t=4 and were never broken. From t=4 onward, `shouldGrazBlockAttack(faction=HRHB, corps=hvo_tomislavgrad, target_controller=RS)` returns true via TWO independent code paths (faction-level HRHB→RS block + West pair block). Cincar's four objectives are all RS-held → every objective is politically blocked → operation suspended → eventually `political_blocked` recovery.

Net result: kupres_2 does not flip, Mistral 1 / Jajce 95 staging predicates remain unsatisfied, final HRHB count unchanged.

---

## 1. Cincar lifecycle — n1966 vs n1967 side-by-side

(From each run's `operation_aars.json`, filtered for `kupres_cincar_94`.)

| Field | n1966 | n1967 | Δ |
|---|---|---|---|
| `started_turn` | 132 | 132 | — |
| `ended_turn` | 134 | 138 | +4 |
| `duration_turns` | 2 | 6 | +4 |
| `outcome` | failure | failure | — |
| `force_ratio_estimate` | 0.1266 | **1.6017** | **+12.6×** |
| `total_attacks` | 0 | 0 | — |
| `initial_strength` | 3,600 | **8,100** | **+125%** |
| `final_strength` | 3,600 | 8,100 | preserved |
| `objectives_targeted` count | 3 | **4** | +1 (kupres_2) |
| `objectives_captured` | [] | [] | — |
| `participating_brigades` count | 2 | **4** | +2 |
| `recovery_reason` | `defender_power_too_high` | **`political_blocked`** | **GATE CHANGED** |
| `tempo` grade factor | 93.75 | 81.25 | −12.5 |
| `preservation` grade factor | 100 | 100 | — |
| stars | 3 | 3 | — |

n1967 `participating_brigades`:
```
hrhb_kralj_petar_kreimir_iv_brigade
hrhb_kralj_tomislav_brigade
hv_4th_guards_split        ← Wave 7B addition
hvo_rama_brigade           ← Wave 7B addition
```
Both Wave 7B additions attached cleanly. Pool widening did exactly what it was designed to do.

n1967 `objectives_targeted`:
```
op:kupres:bucovaca
op:kupres:kupres_2          ← Wave 7B addition
op:kupres:donji_malovan
op:kupres:novo_selo_2
```
The `kupres_2` insert took effect in the objective array as well.

---

## 2. Did kupres_2 flip?

**No.** `political_controllers['op:kupres:kupres_2']` at end-state in BOTH runs:

| Run | bucovaca | kupres_2 | donji_malovan | novo_selo_2 |
|---|---|---|---|---|
| n1966 final | RS | RS | RS | RS |
| n1967 final | RS | RS | RS | RS |
| jan1993 painted reference | (historically HRHB after Cincar) | HRHB | HRHB | HRHB |

Cincar fired **0 attacks** → no objective captured → no flip possible. The capture chain never started.

---

## 3. Root-cause: where `political_blocked` comes from

Source: `src/sim/combat/sector_offensive.ts` (recovery gate) and `src/sim/local_truces.ts` (predicate).

```
sector_offensive.ts:915-918  // during preparation
    if (hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)) {
        beginRecovery(op, turn, 'political_blocked', state);
        continue;
    }
sector_offensive.ts:976-979  // during execution
    if (hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)) {
        beginRecovery(op, turn, 'political_blocked', state);
        continue;
    }
```

`hasOnlyPoliticallyBlockedCurrentObjectives` (sector_offensive.ts:1382) iterates the op's current-axis objective(s) and calls `shouldGrazBlockAttack` on each. If **all** current objectives are blocked → returns true → recovery.

`shouldGrazBlockAttack` (`local_truces.ts:197`) returns true for an HRHB→RS attack when:
```
204:    if (!isGrazAccordsActive(state)) return false;
...
222:    if (faction === 'HRHB' && (targetController === 'RS')
223:        && isHerzegovinaTruceActive(state)
224:        && !GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) {
225:        return true;
226:    }
...
228:    // Herzegovina corps-pair truce
231:    if (isHerzegovinaTruceActive(state) && isCorpsInGrazPair(corpsId)) {
232:        if (isWestHerzegovinaPair(corpsId)) {
233:            return true; // West truce is always active when Graz is active
234:        }
```

Three relevant data points from `local_truces.ts`:

```
177:export const GRAZ_EXEMPT_RS_CORPS = new Set([
178:    'vrs_1st_krajina',
179:]);
181:/** HRHB corps exempt from Graz — Posavina fighting + Op Jackal (east Herzegovina) */
182:export const GRAZ_EXEMPT_HRHB_CORPS = new Set([
183:    'hvo_northwest_bosnia',  // Orašje pocket — Posavina corridor fighting
184:    'hvo_southeast_herzegovina',  // Op Jackal — east Herzegovina pair still active per brigade-level callers
185:]);
...
41:export const GRAZ_CORPS_PAIRS_WEST: readonly [string, string][] = [
42:    ['vrs_2nd_krajina', 'hvo_tomislavgrad'],
43:];
```

**`hvo_tomislavgrad` is NOT exempt AND is in the West Herzegovina pair.** Both blocks fire.

### State verification at Cincar window (t=132–138)

From `final_save.json` (both runs, identical):
```
vienna_declaration_turn: 4
vienna_accepted:         {"HRHB":true,"RS":true}
vienna_herzegovina_broken_by: undefined
vienna_kiseljak_broken:  undefined
truce_broken_turn:       undefined
```

`isGrazAccordsActive` → true (vienna_declaration_turn=4, both accepted, t=132 ≥ 4)
`isHerzegovinaTruceActive` → true (Graz active AND `vienna_herzegovina_broken_by == null`)
`hvo_tomislavgrad ∈ GRAZ_EXEMPT_HRHB_CORPS` → false
`isWestHerzegovinaPair('hvo_tomislavgrad')` → true

→ `shouldGrazBlockAttack` returns true at line 225 (faction-level path) AND at line 233 (West pair path).

All four Cincar objectives are RS-held, so `hasOnlyPoliticallyBlockedCurrentObjectives` is true on every single check. The op enters preparation, tries to ready for execution, fails the political gate on each tick, and aborts at t=138 with `recovery_reason = political_blocked`.

---

## 4. Did the new brigades actually attach?

**Yes.** Both `hv_4th_guards_split` and `hvo_rama_brigade` appear in the AAR's `participating_brigades`. Together with the original two, total `initial_strength` = 8,100 (matches expected ~7,200 ± OOB strength jitter; actual 8,100 indicates the brigades attached at full nominal strength, consistent with the OOB pull).

Pool widening landed correctly — the failure is downstream of pool assembly.

---

## 5. Mistral 1 / Jajce 95 in n1967

Filtering `operation_aars.json` for `mistral` or `jajce` in both runs:

| Run | matching AAR entries |
|---|---|
| n1966 | 1 — `vrs_1st_krajina:Operation Jajce:t7` (VRS, partial, atks=1) |
| n1967 | 1 — `vrs_1st_krajina:Operation Jajce:t7` (VRS, partial, atks=1) — byte-identical |

**Neither `hvo_mistral_1_95` nor `hvo_jajce_95` appears as a launched HRHB op in either run.** They never crossed into the AAR stream (which captures launched ops only). The staging_access predicate that requires Kupres-area control is still unsatisfied because Cincar didn't deliver kupres_2.

Clean cascade: Cincar political_blocked → kupres_2 not flipped → Mistral 1 staging predicate unsatisfied → Jajce 95 staging predicate unsatisfied → no HRHB northern push → −47 HRHB OSIDs unchanged.

---

## 6. Axis ordering in the edited catalog

Catalog `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`, `kupres_cincar_94`: `objectives_targeted` post-Wave 7B order is `[bucovaca, kupres_2, donji_malovan, novo_selo_2]`. Since `total_attacks=0`, axis ordering didn't matter for n1967. The order becomes relevant only once the political gate is unblocked.

---

## 7. Brigade availability at t=132

Both Wave 7B-added brigades are present in `participating_brigades` at `started_turn=132`. Their `status='active'` is implied by the engine's successful attachment and the 8,100 initial strength. No "orphaned at home OSID" signal in the AAR. Detailed brigade_temporal_log spot-check is deferred — the AAR's positive presence is canonical confirmation.

---

## 8. Watched operations

`watched_operations.json` contains 7 entries; none reference Cincar, Mistral 1, or Jajce 95 by name. The watched-op array tracks unrelated canonical-window operations (Herzegovina Consolidation, Cerska-Kamenica, Kotor Varos, Krivaja-95). This means the Cincar political block is not visible in the watched-op stream — only via the AAR `recovery_reason`.

---

## 9. Why the byte-identical jan1993 control delta despite hash change?

Hash differs (`ccc07196fb899651` → `cedf38d1eb21c177`) because n1967 has:
- different brigade-positioning ledger entries during Cincar's 6-turn extended preparation (vs n1966's 2-turn)
- different officer/morale ticks for 4 attached brigades over 6 turns vs 2
- different `operation_aars.json` content (force_ratio, brigade list, duration)

None of these alter end-state political_controllers within the jan1993 anchor frame, because:
- The block fired BEFORE any attack registered → no OSID flipped
- Cincar's extended preparation didn't displace brigades, kill anyone, or change exhaustion meaningfully (`final_strength == initial_strength`)
- Downstream Mistral 1 / Jajce 95 are gated by the SAME unchanged kupres_2=RS condition

So Wave 7B IS a real change in the engine state stream, but the change manifests only inside the op-recovery telemetry — not in any anchor-relevant control state.

---

## 10. Root cause one-liner

> **Wave 7B fixed the force-ratio (engine power) launch gate exactly as designed, but Cincar then hits the Graz Accords political block — `hvo_tomislavgrad` is in the West Herzegovina corps pair AND not in `GRAZ_EXEMPT_HRHB_CORPS`, so every HRHB→RS attack from this corps is politically vetoed for the entire Graz-active window. With Graz never broken in this run, the Kupres → Mistral 1 → Jajce 95 chain stays dead and the −47 HRHB count is unchanged.**

---

## 11. Smallest-surface-area follow-up fix

This is a design-vs-history decision, not just a code touch. Historical Operation Cincar (1–7 Nov 1994) was conducted by HVO Tomislavgrad-area forces (`hvo_tomislavgrad` corps) and HV Croatian Army units against VRS-held Kupres — *during* the Washington Agreement and the active Graz/Washington-era ceasefire framework. History shows the Graz Accords didn't actually prevent the HVO/HV from striking RS at Kupres; it constrained inter-faction HRHB-RBiH alliance dynamics more than HRHB-RS frontier operations on this axis.

So the canonical fix is to **mark the Kupres axis as a Graz exception**, mirroring how the Posavina corridor (Orašje) was already exempted.

### Recommended fix (smallest surface)

Add `hvo_tomislavgrad` to `GRAZ_EXEMPT_HRHB_CORPS` in `src/sim/local_truces.ts`:

```ts
export const GRAZ_EXEMPT_HRHB_CORPS = new Set([
    'hvo_northwest_bosnia',     // Orašje pocket — Posavina corridor fighting
    'hvo_southeast_herzegovina',// Op Jackal — east Herzegovina pair still active per brigade-level callers
    'hvo_tomislavgrad',         // Kupres axis vs VRS — Op Cincar Nov 1994 / Op Mistral / Op Jajce 95
]);
```

This is a **3-line data change in one file**. Implications:
- Removes the **HRHB→RS faction-level block** at line 222–226 for any `hvo_tomislavgrad` op.
- **DOES NOT** remove the West-Herzegovina-pair block at line 231–234, because that check uses `isCorpsInGrazPair`, not the exempt set. So adding to `GRAZ_EXEMPT_HRHB_CORPS` is **insufficient on its own** — the West pair block fires unconditionally on any corps in `GRAZ_CORPS_PAIRS_WEST`.

### Smallest fix that actually unblocks Cincar

Two coordinated edits in `src/sim/local_truces.ts`:

1. **Remove `hvo_tomislavgrad` from `GRAZ_CORPS_PAIRS_WEST`** (or add an exemption flag the West-pair check honours). Either:
   ```ts
   export const GRAZ_CORPS_PAIRS_WEST: readonly [string, string][] = [
       // ['vrs_2nd_krajina', 'hvo_tomislavgrad'],  // removed — Cincar axis active
   ];
   ```
   …which leaves `GRAZ_CORPS_PAIRS_EAST` (vrs_herzegovina ↔ hvo_southeast_herzegovina) as the sole truce-pair scope.

2. **Add `hvo_tomislavgrad` to `GRAZ_EXEMPT_HRHB_CORPS`** as above, to belt-and-brace against any other faction-level HRHB→RS block path.

Total surface: **~4 lines changed in one file** (`src/sim/local_truces.ts`).

### Alternative (target-OSID exception, narrower)

If removing the West pair entirely is too broad — e.g. you want 2KK ↔ Tomislavgrad truce preserved for non-Kupres targets — add an **OSID allowlist** to the Cincar axis. The simplest form: in `shouldGrazBlockAttack`, before the West-pair return-true at line 233, check if `targetOsid` is in a `KUPRES_AXIS_EXEMPT_OSIDS` set:

```ts
const KUPRES_AXIS_EXEMPT_OSIDS = new Set([
    'op:kupres:bucovaca',
    'op:kupres:kupres_2',
    'op:kupres:donji_malovan',
    'op:kupres:novo_selo_2',
]);
// ...
if (isWestHerzegovinaPair(corpsId)) {
    if (faction === 'HRHB' && KUPRES_AXIS_EXEMPT_OSIDS.has(targetOsid)) return false;
    return true;
}
```

Plus the same `GRAZ_EXEMPT_HRHB_CORPS` addition to bypass the faction-level block path for the same OSIDs.

Total surface: **~12 lines in one file**.

### Recommendation

**The OSID-allowlist alternative is the right shape for the canonical model** — it preserves Graz semantics for everything except the historically-documented Cincar/Mistral/Jajce axes. The corps-level exemption (removing from `GRAZ_CORPS_PAIRS_WEST` outright) is mechanically smaller but lets Tomislavgrad strike any RS target, which is broader than the historical record supports.

**Hand off to operations-expert** for sign-off on the OSID list (Mistral 1 and Jajce 95 will likely need their target OSIDs added to the same allowlist if/when their political gates are next triggered).

---

## 12. Verification protocol for the follow-up run

After applying the fix, the expected n1968 deltas are:
- Cincar `recovery_reason` ≠ `political_blocked`. Either `completed` (if it overruns defender) or some combat-mechanic recovery (`max_failures`, `participants_below_attack_floor`, etc.).
- Cincar `total_attacks` > 0.
- `political_controllers['op:kupres:kupres_2']` final = HRHB (if capture lands).
- HRHB final count: closer to 125 (jan1993 reference); −47 delta narrows toward zero.
- `hvo_mistral_1_95` and/or `hvo_jajce_95` appear in `operation_aars.json` as launched ops (their staging predicate now satisfied).
- Hash differs from `cedf38d1eb21c177`.

If the Cincar gate clears but `total_attacks` is still 0, the new `recovery_reason` will tell us which gate is *next* in the chain (likely `no_launch_readiness`, `participants_below_attack_floor`, or `defender_power_too_high` once the political veto is out of the way).

---

## 13. Reportback summary

(a) **Cincar outcome in n1967:** force_ratio 0.127 → 1.602, 2 brigades → 4 brigades, 3,600 → 8,100 strength, 0 → 0 attacks, recovery_reason `defender_power_too_high` → **`political_blocked`**, outcome failure. Pool widening worked, force gate cleared, political gate stopped it.

(b) **Did kupres_2 flip to HRHB?** **No.** RS in both n1966 and n1967.

(c) **Mistral 1 + Jajce 95 status:** still blocked, never launched. They are downstream of kupres_2 control; the staging_access predicate stayed unsatisfied. Neither appears as a launched HRHB op in `operation_aars.json` for either run.

(d) **Root cause one-liner:** Wave 7B fixed the engine-power gate, but `hvo_tomislavgrad` is in the West Herzegovina Graz pair AND not in the HRHB Graz-exempt corps set, so every HRHB→RS attack from this corps is politically vetoed for the entire Graz-active window (t≥4) — Cincar therefore aborts on the political_blocked gate before firing any attack.

(e) **Smallest-surface-area follow-up fix:** OSID-allowlist exemption inside `shouldGrazBlockAttack` (`src/sim/local_truces.ts`) for the four Kupres OSIDs (`bucovaca, kupres_2, donji_malovan, novo_selo_2`), plus add `hvo_tomislavgrad` to `GRAZ_EXEMPT_HRHB_CORPS`. ~12 lines, one file. Hand off to operations-expert for canonical sign-off and to confirm whether Mistral 1 and Jajce 95 target OSIDs should join the same allowlist now or only after n1968 confirms the chain unsticks.

(f) **Memo size:** filled at end (see footer).

---

## Footer

- Memo path: `docs/40_reports/audits/20260522_WAVE_7B_CINCAR_RERUN_N1967.md`
- Author role: `scenario-creator-runner-tester`
- Linked code paths:
  - `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` — Wave 7B brigade-pool widening (kupres_cincar_94)
  - `src/sim/combat/sector_offensive.ts` (lines 915, 976, 1382) — political_blocked recovery gate
  - `src/sim/local_truces.ts` (lines 41–43, 177–185, 197–251) — Graz Accords block predicates
- Linked runs:
  - `runs/apr1992_definitive_188w__210e69404d054959__w188_n1966/`
  - `runs/apr1992_definitive_188w__210e69404d054959__w188_n1967/`
