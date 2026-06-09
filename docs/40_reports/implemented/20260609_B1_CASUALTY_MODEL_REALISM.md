# B1 — Casualty-Model Realism (WIA:KIA re-anchor + missing/captured fix)

**Date:** 2026-06-09
**Task:** #69 (Pyrrhic Historian must-have B1)
**Branch:** `feat/b1-casualty-realism`
**Status:** BUILT + MEASURED + **HOLD** behind a default-OFF flag for the D1 finalization pass. Not merged; not activated.
**Owner lane:** Calibration / combat-engine.
**Related:** `docs/40_reports/proposals/20260608_CASUALTY_MODEL_REALISM.md` (the proposal this implements), `docs/40_reports/REAL_WAR_MASTER.md`, `docs/40_reports/CALIBRATION_MASTER.md` (floor of record).

---

## 1. What this is

A default-OFF feature gate (`AWWV_CASUALTY_REALISM_V2`, module
`src/sim/combat/casualty_realism_v2_gate.ts`) that re-anchors the casualty *split*
(KIA/WIA/MIA partition) toward historical realism. Flag-OFF is byte-identical to the
calibration floor; flag-ON collapses the over-produced missing/captured bucket into WIA.
Activation is the D1 finalization decision — this lane builds, measures, and HOLDS.

## 2. Key finding that reshaped the lane

The proposal's headline numbers (sim military killed ~144k, killed:wounded 1:1.9, MIA
fraction 0.15) were measured on the OLD `KIA 0.30 / WIA 0.55 / MIA 0.15` split. **PR-1 v2
(#316) already landed the WIA:KIA re-anchor** — the live main-path split is
`KIA 0.22 / WIA 0.74 / MIA 0.04`, and the live 188w floor already runs at
**killed 102,621 / killed:wounded 1:3.73**. So B1's remaining live lever is NOT the
KIA re-anchor (done) but the **missing/captured over-production**: the per-path MIA
fractions (siege 0.15, undefended 0.35, surrender-cascade 0.50) write durable
"missing/captured" on top of an inflated gross, with no POW-return model. The flag-OFF
188w produces **53,881 missing/captured** against a historical durable-military-missing
anchor of ~2–10k.

## 3. The re-anchor (flag-ON fractions)

KIA held at the shipped values (do not disturb the ~1:3.4–3.7 killed:wounded the #316
work achieved); MIA collapsed into WIA on every path. The surrender cascade is the one
path where capture is genuinely real (a surrounded garrison IS taken prisoner), so it
keeps a meaningful but trimmed MIA share.

| Path | Shipped (OFF) KIA/WIA/MIA | V2 (ON) KIA/WIA/MIA |
| --- | --- | --- |
| main (frontline + battle defaults + paramilitary) | 0.22 / 0.74 / **0.04** | 0.22 / 0.76 / **0.02** |
| siege bombardment | 0.20 / 0.65 / **0.15** | 0.20 / 0.78 / **0.02** |
| undefended-OSID defender | 0.15 / 0.50 / **0.35** | 0.15 / 0.83 / **0.02** |
| surrender-cascade defender | 0.10 / 0.40 / **0.50** | 0.10 / 0.55 / **0.35** |

**Totals untouched.** The surrender-cascade forces `defenderTotal = 50% personnel` — that
is a *total* (territory-coupled) knob and is intentionally LEFT UNCHANGED by B1. B1 only
redistributes the split, which is reporting-only EXCEPT for the
`pool.exhausted += (killed+mia)*0.75` demographic feed (see §5 caveat).

## 4. Measurement (188w, the core deliverable)

| Metric | Historical anchor | Flag-OFF (floor) | Flag-ON (V2) |
| --- | --- | --- | --- |
| final_state_hash | — | `d311eeac18492683` | `5e1ad91cf87a508c` |
| military killed (total) | ~57–62k | 102,621 | 102,621 |
| killed : wounded | ~1:3 – 1:3.5 | 1:3.73 | **1:3.85** |
| missing / captured (total) | ~2–10k | 53,881 | **42,034** (−22%) |
| control_delta sha256 | — | `c5d76b0cc514b91b` | `c5d76b0cc514b91b` |
| net_control_counts_after | — | H106/RB285/RS321 | H106/RB285/RS321 |
| total_flips | — | 186 | 186 |

- **Flag-OFF byte-identity PROVEN:** 40w `235c61f408dc3d95` == floor; 188w
  `d311eeac18492683` == floor. The scaffold is inert when unset.
- **OSID-ORTHOGONALITY VERDICT: YES** — `control_delta.json` is byte-identical
  flag-on vs flag-off; zero OSIDs moved; per-faction control counts identical.
- **Direction toward anchors:** missing/captured −22% (toward ~10k, still ~4–20× high);
  killed:wounded 1:3.73→1:3.85 (slightly past the band). killed magnitude unchanged
  (102k vs ~60k) — that is the attrition-*volume* lever (proposal Lane 3), out of B1 scope.

## 5. Honest caveat — split is orthogonal in OUTCOME, not perfectly inert in STATE

The casualty split feeds `pool.exhausted += (killed+mia)*0.75` in frontline + siege
attrition. Reducing MIA changes `killed+mia`, perturbing the exhaustion accumulator. At
188w this surfaced as a **±1 killed drift per faction** (HRHB 8492→8491, RS 36397→36398,
RBiH unchanged; aggregate killed coincidentally identical at 102,621). That perturbation
is real but **sub-threshold**: it did not change a single control flip. So B1 is
OSID-orthogonal *in outcome* (no flips, control_delta byte-identical) even though the
final_state_hash legitimately moves (the ledger wounded/missing numbers + the ±1
exhaustion drift serialize into final_save.json). For D1: flag-ON holds all 188w
territory; it is NOT a true no-op, so it is sequenced as the casualty-realism finalization
toggle, not silently folded.

## 6. Wiring (single source of truth for the split)

All military-ledger casualty splits now route through the gate accessors. Flag-OFF returns
the exact shipped fractions (byte-identity guaranteed + unit-tested):
`splitKiaWiaMia` (attack_casualty_distribution.ts — the central battle path),
`frontline_attrition.ts`, `siege_attrition.ts`, `battle_resolution.ts`
(main + undefended + surrender splits), `paramilitary_sweep.ts`,
`attack_morale_absorption.ts` (deduped onto `splitKiaWiaMia`).
**Not touched:** `operation_casualty_attribution.ts` — a separate operation-AAR layer
with its own hardcoded `0.30/0.55` (different OFF value); rerouting it would break
flag-OFF byte-identity and it is not in the war-total ledger. Pre-existing inconsistency,
flagged, out of B1 scope.

## 7. Determinism / boundaries

No `Math.random` / `Date.now`; `strictCompare` ordering preserved. Initial OSIDs untouched;
no `avoided_osids_by_faction`. The gate mirrors the shipped `intel_ambush_depth_gate.ts`
idiom (module-local override over env read, default-OFF).

## 8. Open / owner-confirm

- **Historical missing target is a band, not a point.** Durable military missing/captured
  ~2–4k (proposal) vs ICTY-DU durable-missing ~10,500 (all categories incl. civilians).
  B1 aims "realistic not zero" and lands at 42k — directionally correct, magnitude still
  gated by the untouched gross (Lane 3 attrition volume). **Owner to confirm the durable
  missing target** when D1 finalizes; B1's V2 fractions can be re-tuned without schema change.
- killed magnitude (102k vs ~60k) is the Lane 3 attrition-volume change — territory-coupled,
  sequenced separately under strict 188w gating.

## Completion block

Canonical owner: `src/sim/combat/casualty_realism_v2_gate.ts` (split fractions, per-path).
Demoted path: hardcoded per-file KIA/WIA/MIA literals → now sourced from the gate (flag-OFF == shipped).
Player-visible truth: none yet (default-OFF; AAR/ledger casualty numbers change only when activated at D1).
Canonical UI surface: n/a (engine ledger; surfaced via existing end_report / AAR when active).
Done means: flag-OFF byte-identical to floor (40w+188w PROVEN); flag-ON measured, OSID-orthogonal, HELD for D1.
