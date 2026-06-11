# MC (Missing/Captured) Over-Count — Root-Cause Diagnosis + Minimal Territory-Orthogonal Fix

**Date:** 2026-06-11
**Authors:** Gameplay Programmer + Systems Programmer (READ-ONLY diagnosis — no code edited, no scenarios run)
**Run of record:** `runs/apr1992_definitive_188w_dayton_close__61ea3ee0de195084__w188_n4/`
**Defect:** 188w ends at **54,282 missing/captured** (RBiH 31,697 + RS 19,477 + HRHB 3,108) vs historical durable-missing anchor ~10,500 → **5.2× over**.

---

## 1. Where MC accumulates (path inventory + numbers)

MC is written ONLY by the per-battle / per-turn casualty-split paths. Every path computes a total, then
splits it KIA/WIA/MIA where **MIA = total − KIA − WIA** and is recorded as `missing_captured`. There is
**no POW-exchange / no return / no reconciliation anywhere** (grep over `src/sim/` + `casualty_ledger.ts`
for `pow|prisoner|exchange|reconcil|missing_captured -=` → zero hits). MC is purely additive and durable.

The five writing paths and their MIA (=1−KIA−WIA) fractions:

| Path | File:line | KIA / WIA / **MIA** |
| --- | --- | --- |
| Main (frontline + battle default + paramilitary self/attacker) | `attack_casualty_distribution.ts:27-29,39-44` (`splitKiaWiaMia`); `frontline_attrition.ts:348-352`; `paramilitary_sweep.ts:154-157` | 0.22 / 0.74 / **0.04** |
| Siege bombardment | `siege_attrition.ts:37,40,164-170` (`SIEGE_*_FRACTION`) | 0.20 / 0.65 / **0.15** |
| Undefended-OSID defender | `battle_resolution.ts:626` (`splitCasualties(defenderTotal, 0.15, 0.5, …)`) | 0.15 / 0.50 / **0.35** |
| **Surrender-cascade defender** | `battle_resolution.ts:652-657` (`defenderKiaFrac=0.10; defenderWiaFrac=0.40; defenderTotal=max(.,0.5×personnel)`) | 0.10 / 0.40 / **0.50** |
| Morale-absorption extra cas | `attack_morale_absorption.ts:154-172` (uses main 0.22/0.74) | 0.22 / 0.74 / **0.04** |

### Aggregate decomposition (n4, total K+W+M = 547,543)

- Overall observed MIA fraction = **9.9%** (vs the 4% the main path alone would yield).
- **(a) Main-path MIA component** (`0.04 × total`) ≈ **21,900** of the 54,282 (~40%).
- **(b+c) Excess from the high-MIA paths** (siege 0.15 / undefended 0.35 / surrender 0.50) ≈ **32,380** (~60%).
- Per-formation MIA fractions span 7%–19% (e.g. `arbih_285th_light` 19.3%, mountain bdes ~7%), i.e. a
  *blend* of main + high-MIA battle outcomes — **no single brigade is dominated by wholesale capture.**

---

## 2. Is brigade-destruction the leak? — **NO.**

The panel's hypothesis (destroyed brigade → remaining personnel dumped into missing/captured) is **FALSE**.

- `brigade_dissolution.ts:dissolveCombatIneffectiveBrigades` — on destruction: 50% of personnel →
  `strategic_reserves` (`:204-212`), equipment salvaged 70% (`:214-242`), then `f.personnel = 0`
  (`:261`). **There is NO `recordBattleCasualties` call and NO `missing_captured` write in this file.**
  The "lost" 50% simply vanishes from the ledger — it is *never* booked as MC (or as anything).
- `attack_resource_aftermath.ts` — supply/facility bookkeeping only; **no casualty recording at all.**
- `destroyed_brigades.json` (n4): only **36 brigades destroyed** over 188w (33 RS, 1 RBiH, 2 HRHB);
  `total_casualties_taken` across them = 75,121, but that is their *lifetime battle attrition already
  booked turn-by-turn through the split paths above* — destruction itself adds zero MC.

**Conclusion:** MC is 100% from the per-battle/per-turn split paths (§1), driven by the high MIA
fractions on the siege/undefended/surrender paths plus a ~2× inflated gross casualty volume
(sim military killed 104,309 ≈ 1.7× the ~60k historical). The destruction pipeline is a red herring.

---

## 3. Minimal territory-orthogonal fix

**A clean, measured, default-OFF fix already exists: PR #344 / branch `feat/b1-casualty-realism`
(commit `15b10b70`).** It does exactly the right thing and nothing more.

What #344 does (the LEDGER-ONLY / split-only approach — the correct one):
- New gate `casualty_realism_v2_gate.ts` (`AWWV_CASUALTY_REALISM_V2`, default OFF, mirrors
  `intel_ambush_depth_gate.ts`). Flag-OFF returns the exact shipped fractions → byte-identical.
- Flag-ON collapses the inflated MIA into **WIA** (KIA held), per path:
  main 0.04→0.02, siege 0.15→0.02, undefended 0.35→0.02, surrender-cascade 0.50→0.35.
- **No casualty TOTAL is touched.** The surrender-cascade forced `defenderTotal = 0.5 × personnel`
  (`battle_resolution.ts:655`) — the only *total* knob on these paths and the one that is
  territory-coupled — is **left unchanged**. Only the K/W/M *partition* of an already-fixed total moves.

It is **NOT** the territory-coupled base-rate cut that memory records as Lane-3 closed-by-hold at 649.
Lane-3 cut the *gross* (`BASE_ATTRITION_RATE` etc.), which changes personnel-at-OSID and therefore
combat outcomes. #344 deliberately stays out of that: it re-buckets the split only.

**Measured result (from the #344 commit body + closeout doc, 188w):**
- killed 102,621 (**unchanged**), missing/captured 53,881 → **42,034 (−22%)**, K:W 1:3.73 → 1:3.85.
- **control_delta byte-identical** flag-on vs flag-off (`c5d76b0cc514b91b`); per-faction counts
  identical (H106 / RB285 / RS321); 186 flips both → **zero OSIDs moved.**
- Flag-OFF proven byte-identical to floor (40w `235c61f…`, 188w `d311eeac…`).

### Recommendation: **rebase + re-measure #344, then strengthen its surrender/undefended fractions.**

#344 only gets to 42k (−22%) because its V2 still leaves the surrender-cascade at 0.35 MIA and only
trims the others to 0.02 — and the residual is bounded by the inflated gross. To reach the ~10–15k
target while staying territory-orthogonal, two further split-only tightenings (same gate, same idiom,
no total touched) are available:

- **Surrender-cascade MIA 0.35 → ~0.15** (`battle_resolution.ts:653-654` via gate). This is the largest
  single lever: surrender is the only path where capture is genuinely real, but at 0.50/0.35 it over-books
  a *durable* capture with no exchange/return. Trim toward a realistic durable-POW share.
- **Confirm undefended/siege at 0.02** (already in #344).

Even with both, the floor under MC is the **gross volume** (1.7× high). Driving MC below ~20k *durably*
ultimately needs the Lane-3 gross reduction — which is territory-coupled and explicitly out of scope here.
So the honest ceiling for a **strictly territory-orthogonal** fix is roughly **MC → ~25–35k** (split-only),
not 10k. Reaching the ~10.5k anchor requires either (a) a POW-return/reconciliation model that decays MC
over time (new mechanism, ledger-only, also territory-orthogonal — recommended post-1.0), or (b) the
Lane-3 gross cut (territory-coupled, gated).

---

## 4. Territory-orthogonality proof plan

Identical to how #344 was already validated (and re-confirmable by the bundle+track harness):

1. **Flag-gate** every split change behind `AWWV_CASUALTY_REALISM_V2` (done in #344). Flag-OFF MUST be
   byte-identical: assert `final_state_hash` flag-OFF == floor at 40w + 188w (proven: `235c61f…` / `d311eeac…`).
2. **Bundle matrix** baseline (OFF) vs fix (ON) at 188w. Expected:
   - `control_delta.json` **sha256 byte-identical** (proven `c5d76b0cc514b91b` for #344).
   - per-faction `net_control_counts_after` identical; `total_flips` identical (186).
   - ONLY the casualty ledger numbers move: `missing_captured` ↓, `wounded` ↑, `killed` ≈unchanged.
3. **Known caveat (honest):** the split feeds `pool.exhausted += (killed+mia)×0.75`
   (`frontline_attrition.ts:354-361`, `siege_attrition.ts:176+`). Changing MIA perturbs `killed+mia`,
   giving a **sub-threshold ±1 killed/faction drift** → `final_state_hash` legitimately moves, but
   **zero control flips change.** So the fix is territory-orthogonal *in outcome* (control_delta identical),
   not a literal state no-op. Gate it as a finalization toggle, not a silent fold (exactly #344's framing).

---

## 5. Is it a real leak or partly legitimate? — **Real leak, with a legitimate core.**

- **Legitimate:** the Bosnian war had large POW populations and exchanges; *some* durable missing
  (~10.5k all-category) is historical, and the surrender-cascade capturing a surrounded garrison is real.
- **Leak:** 54k *durable, never-reconciled* military MC at war's end is ~5× the all-category anchor and
  is an artifact of (i) high per-path MIA fractions (siege 0.15 / undefended 0.35 / surrender 0.50) with
  (ii) **no POW-return model** stacked on (iii) a ~1.7× inflated gross. The split fix addresses (i);
  (ii)/(iii) are the residual.

**Confidence: HIGH** that the MIA-fraction over-production is a genuine leak (the 9.9% aggregate MIA vs
4% main-path, and the total absence of any reconciliation, are unambiguous). **MODERATE** that a
split-only fix alone reaches the anchor — it gets ~−40–50% (to ~25–35k); the last mile needs a POW-decay
model or the gated Lane-3 gross cut.

---

## Bottom line

**#344 IS the fix — rebase + re-measure it.** It is the clean ledger-only (territory-orthogonal) approach,
already measured (−22%, control_delta byte-identical), NOT the territory-coupled Lane-3 base-rate cut.
Extend it with one more split-only tightening (surrender-cascade MIA 0.35→~0.15, same gate) to roughly
halve MC. Booking the destroyed-brigade personnel is NOT the leak. Reaching the ~10.5k anchor exactly is a
post-1.0 POW-return-model lane (ledger-only) — out of scope for a strictly territory-flat 1.0 fix.
