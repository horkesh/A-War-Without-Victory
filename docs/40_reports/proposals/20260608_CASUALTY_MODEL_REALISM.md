# Casualty-Model Realism — Findings & Calibration Targets

**Date:** 2026-06-08
**Status:** PROPOSAL / research complete — **no code, constants, levers, scenario data, or baselines changed.** Owner adjudication required before any implementation.
**Owner lane:** Calibration / combat-engine (NOT event-system).
**Related masters:** `docs/40_reports/REAL_WAR_MASTER.md` (realism verdict, updated 2026-06-08), `docs/40_reports/COMBAT_MASTER.md` (casualty pipeline), `docs/40_reports/CALIBRATION_MASTER.md` (baseline of record).

---

## 1. Trigger

Owner inspected end-of-188w casualty output and flagged military deaths as far too high. Two research agents (historian + war-or-game/combat-instrumentation) were dispatched to (a) establish authoritative targets and (b) find the mechanism. This doc is the writeup.

## 2. Sim output under analysis

Run `runs/apr1992_definitive_188w__3a26ccdf831ca525__w188_n2018/`, end of week 188 (`final_save.json`).

| Faction | Killed | Missing/Captured | Wounded |
| --- | --- | --- | --- |
| RBiH | 81,514 | 60,520 | 154,784 |
| RS | 50,729 | 37,786 | 97,634 |
| HRHB | 11,737 | 7,847 | 22,066 |
| **Total** | **143,980** | **106,153** | **274,484** |

Civilian killed (`displacement.civilian_casualties`): RBiH 36,325 / RS 2,858 / HRHB 3,981 (total 43,164).
Internally displaced (`displaced_in_by_faction`): RBiH 599,808 / RS 216,332 / HRHB 124,963; fled abroad 268,838.

## 3. Authoritative calibration targets (historian)

Source hierarchy: ICTY OTP Demographic Unit + RDC "Bosnian Book of the Dead" primary; Wikipedia/Balkan Insight/ICMP cross-check.

| Metric | Target | Sim | Overshoot |
| --- | --- | --- | --- |
| ARBiH killed | **~31,000** (RDC by-formation 30,906) | 81,514 | 2.6× |
| VRS killed | **~21–25,000** (doc floor 20,775; ~23k mid) | 50,729 | ~2.2× |
| HVO killed | **~6,000** (RDC 5,919) | 11,737 | ~2.0× |
| **Total military killed** | **~57–62,000** | 143,980 | **~2.4×** |
| Killed : wounded | **~1 : 3** | 1 : 1.9 | split too lethal |
| **Military missing/captured (durable)** | **~2,000–4,000** | 106,153 | **~30×** |
| Civilian killed (total) | ~38–40,000 | 43,164 | ~1.1× (OK) |
| Civilian ethnic split | ~83 / 11 / 6 | 84 / 7 / 9 | understates Serb civ |

**The Tabeau pitfall (owner-confirmed rejection).** A prior agent cited ICTY/Tabeau "ARBiH 42,501 / VRS 15,299 / HVO 7,183." That is the ICTY breakdown of dead soldiers **by ethnicity of the dead** (ICTY 2010 Table 6a: Muslim 42,492 / Serb 15,298 / Croat 7,182), **not by army of service.** It undercounts the VRS (late/incomplete RS registries; Serb police counted separately) and conflates burial-status with combat status. **Do not use it as an army split.** The correct per-army figures are the RDC "by Military Formation" table, which validates the owner's ~30k/25k/5k structure.

Sources: ICTY OTP 2010 (Zwierzchowski & Tabeau) `https://www.icty.org/x/file/About/OTP/War_Demographics/en/bih_casualty_undercount_conf_paper_100201.pdf`; RDC/HRDAG `https://hrdag.org/wp-content/uploads/2013/02/rdn5.pdf`; Balkan Insight 2007 `https://balkaninsight.com/2007/06/21/research-shows-97-000-victims-of-war-in-bosnia/`; ICMP `https://icmp.int/srebrenica/`.

## 4. Root cause — the hidden driver (combat instrumentation)

**Passive front-attrition is the single largest casualty source — ~55% of all gross casualties (~290k of 524,617) and ~60% of the killed bucket (~87k of 143,980).** The `end_report` battle figure (92,512/143,395 attacker/defender) covers only the *minority* of casualties.

`src/sim/combat/frontline_attrition.ts`: every **active front-edge brigade** loses **0.5%/turn** (`BASE_ATTRITION_RATE = 0.005`, `:62`, applied `:313`) **with no battle**, plus a **bombardment-exposure term** (`BOMBARDMENT_EXPOSURE_RATE = 0.008 × ln(incoming_FP / own_FP)`, `:315-333`) that hits the firepower-*inferior* side hardest. Writes the same `casualty_ledger` as battles (`:348`) with KIA 0.30 / WIA 0.55 / MIA 0.15 (`:345-347`).

Non-battle share of each faction's casualties:

| Faction | Non-battle % | Why |
| --- | --- | --- |
| RBiH | **74.4%** | rifle-only → maximum bombardment-exposure term |
| HRHB | 42.2% | partial firepower disadvantage |
| RS | 28.0% | firepower-superior → bombardment term ≈ 0 |

This single mechanic explains the faction-shape distortion (RBiH killed ≫ VRS): ARBiH dies in the trench, not in battle — directionally real, magnitude not. Two independent methods agree on the share: top-down residual (524,617 − 234,033 battle = 290,584) and bottom-up formula replay (~248,463 floor, excludes the bombardment uplift). **Siege attrition was OFF this run** (`supply_reserves_enabled` false); paramilitary military casualties are negligible (civilian deaths go to a separate ledger).

**Important entanglement:** history-comments (`n303`/`n553`) show the attrition rate was *tuned to hit KIA totals* — i.e. total casualty volume is currently driven by this passive dial, which is coupled to territory calibration. Lowering it moves brigade strength → must 188w-validate against the Zvornik/Sana sacred anchors.

## 5. Diagnosis — three compounding faults

1. **Passive front-attrition volume too high** (~55% of all casualties from standing still). *Load-bearing calibration knob* → cascade risk; 188w-gated.
2. **KIA split too lethal** — `KIA_FRACTION 0.30` (→ 1:1.9 killed:wounded) vs ~0.18 for the historical 1:3. Hardcoded and **duplicated** in `attack_casualty_distribution.ts:27-29`, `battle_resolution.ts:89-90`, `paramilitary_sweep.ts:57-58` (consumed by `frontline_attrition.ts`, `siege_attrition.ts`). Reporting-only; `applyPersonnelLoss` uses the *total*, not the split → **no territory cascade**.
3. **Missing/captured ~30× too high** — 0.15 MIA fraction on the inflated gross + no POW-exchange/return model; surrender-cascade override (`battle_resolution.ts:651-658`) may co-inflate. Reporting-only.

The old `attCasMult` `[,]`-destructuring bug (memory `casualty_ratio_fix`) is **already fixed** — not today's problem.

## 6. Proposed lanes — one 188w-validated change per run

| # | Lane | File / param | Cascade risk | Gate |
| --- | --- | --- | --- | --- |
| 1 | Canonicalize the KIA/WIA/MIA split constant (single source) then lower `KIA_FRACTION 0.30 → ~0.18` | `attack_casualty_distribution.ts:27-29` (+ dedupe the two copies first as a byte-identical refactor) | **None** (reporting-only) | killed ≈ 78–86k at constant gross; anchors byte-identical |
| 2 | Investigate + fix the missing/captured over-production | `battle_resolution.ts:651-658` surrender-cascade; MIA fraction | Low (reporting-only) | military MIA bucket → low thousands |
| 3 | Trim passive front-attrition volume (rate and/or bombardment term) | `frontline_attrition.ts:62`, `:315-333` | **High** — load-bearing calibration dial | **188w-validate before merge**; 40w + CI false-green per standing lesson; Zvornik/Sana anchors must hold |
| 4 | Civilian ethnic split retarget 84/7/9 → ~83/11/6 | civilian-casualty attribution | Low (separate ledger) | optional polish |
| 5 | (Secondary, RBiH-specific) ADR-0007 Phase C shared sector defense | existing default-off flags | per ADR-0007 row | last; reduces RBiH trench-bleed concentration |

**Recommended order:** Lanes 1 & 2 first (reporting-only, zero territory risk, ~half the overshoot) → re-measure → Lane 3 (the entangled dial) under strict 188w gating → Lane 4/5 as polish.

## 7. Boundaries / stop gates

- No `Math.random` / `Date.now`; `strictCompare` ordering preserved (determinism is sacred).
- Lanes 1/2/4 are reporting/attribution only and must stay **calibration-flat on OSID control** (only the casualty *ledger* numbers move).
- Lane 3 moves brigade strength → **NOT** 40w/CI-only; run 188w synchronously in the pre-merge gate (per `feedback_188w_validate_combat_changes_before_merge`).
- war-or-game **withholds approval on the casualty model**: sim military KIA alone (144k) currently exceeds the war's entire real death toll (~97k).
- This is a calibration-owned lane — do **not** close from the docs/tracking lane.

## 8. Provenance

Research dispatched 2026-06-08; historian + war-or-game/combat-instrumentation agents (conceptual analysis only, no code edits). Raw ICTY/RDC PDFs cached under the session tool-results dir. REAL_WAR_MASTER.md carries the realism verdict; this doc is the calibration-facing writeup.
