# Calibration-Affecting Prerequisites — Master Execution Sequence

**Status:** PLAN (owner directive 2026-06-08 — finish these before further calibration tuning, so calibration runs ONCE on final mechanics).
**Authoritative floor of record:** 188w 634/712 hash `2fdbff2fdba1b9c2`, anchors 29/30 (only `op:lukavac:brijesnica_donja_2` + `op:zvornik:zvornik` fail); 40w `2221700edf20621e`; 52w `9991ff2d29ebbbcd` (`docs/40_reports/CALIBRATION_MASTER.md`).
**Marking:** see the "⚠️ CALIBRATION-AFFECTING PREREQUISITES" note in `docs/plans/COMMAND_BOARD.md`.

This sequence is the synthesis of six parallel read-only scoping passes (2026-06-08). It supersedes the ad-hoc ordering implied by the individual proposals.

## Central finding — the defender-power spine

The casualty-model lanes, **ADR-0007 Phase C**, and **E-B1 (corps-coherence decay)** all write into the **same `computeDefenderPowerBreakdown` / defender-power-and-attrition surface**. They are NOT independent — each invalidates the others' tuning if run against a moving baseline. They must run **serially, in dependency order, with a 188w re-floor between each**. Everything else is either independent (can interleave) or decision/§6-gated.

**Stale-doc corrections found during scoping (act on these):**
- Intel ambush-depth is **already shipped** (default-off, fully wired) — not "to build". Activation experiment only.
- ADR-0007 non-primary casualty cap is **already built** (default-off, gated on `ENABLE_SHARED_SECTOR_DEFENSE`).
- Farz-95 is **firing and delivering** the `vozuca_2` anchor.
- Casualty lanes 1/2 are **NOT reporting-only** — KIA/MIA split feeds `pool.exhausted`→mobilization→manpower→territory at 188w (`pool_population.ts:441`, `frontline_attrition.ts:359`, `siege_attrition.ts:182`).
- Civilian "split" has **no single constant** (emergent from kill-fractions) — separate data lane, deferrable.
- TG flag comments are stale ("default false" — all 5 are ON).

## Phase 0 — Free / byte-identical (do now; allowed under "no tuning yet")
- **Casualty Lane-1a:** dedupe the 4 hardcoded KIA-split copies into the `attack_casualty_distribution.ts` canonical export (constant-folding; verify 40w hash `2221700edf20621e`).
- **#170 docs fix:** correct the stale "TG flags default false" comments.
- *(Dispatched as one byte-identical PR.)*

## Phase 1 — Owner DECISIONS (no engineering; gate Phase 2) — Pyrrhic research dispatched
1. **ADR-0007:** predictor/resolver cap split (A bless / B reconcile / C ship-B-only) + Guardrail-1 call (flag-on war-cost ~2% below flag-off — accept or tune).
2. **Casualty-model targets** — *Pyrrhic recommendation received:* KIA 0.30→**0.22** (0.18 aggressive floor); surrender-cascade MIA 0.85→**0.50** (complement to WIA) + MIA fraction 0.15→**~0.04**, **keep the garrison floor**, prefer re-split-at-generation over a POW subsystem; front-attrition: **BOMBARDMENT_EXPOSURE_RATE 0.008→0.006 first**, then BASE_ATTRITION 0.005→**0.004** only if needed (**do NOT go to 0.003** — n553 tried+reverted). Durable-missing anchor ~10,500 (ICTY-DU), not the proposal's 2–4k (owner confirm). Lane 3 will NOT fix the RS over-attrition (separate contested-battle path).
3. **PDP channels:** which to activate + cohesion threshold + intl 1992-anachronism (research in flight).

## Phase 2 — The defender-power spine (serial; ONE 188w re-floor each; Zvornik is the canary)
1. Casualty **Lane-1b** (KIA split → 0.22) → re-floor
2. Casualty **Lane-2** (MIA/surrender-cascade re-split) → re-floor
3. Casualty **Lane-3** (front-attrition: bombardment term first, then base-rate) → re-floor
4. **ADR-0007 Phase C+B** flag-flip (Guardrail-1 now judged against the corrected casualty model) → re-floor
5. **E-B1** corps-coherence decay (split: module+diagnostics, then the 2 consumers) → re-floor

*Rationale for order:* casualty volume is the substrate ADR-0007's Guardrail-1 is measured against, and E-B1's periphery penalty rides on top of the defender-power surface both casualty + ADR-0007 reshape. Settling them in this order avoids re-tuning.

## Phase 3 — Independent calibration lanes (interleave anytime; not on the spine)
- **Farz `brijesnica_donja_2` extension** — single objective append; clears the last anchor **29→30/30** (188w 634→635); 40w byte-identical. High value, low risk.
- **E-A5** (51:49 launch-halt) — independent (only blocks launches); wire the inert reader; bounds RBiH overshoot.
- **#170 enclave-resilience denominator** — 40w byte-identical; 188w moves *away* from the boljanic_2 break; owner picks denominator (per-enclave-max recommended).
- **E-A6** (Sloboda-95) — ~0 direct OSID gain (VK already painted RBiH); representational fidelity; **last/optional**.

## Phase 4 — PDP activations (serial, owner-gated, env-flip + re-floor each)
*Pyrrhic (historian) recommendation:* **patron_confidence** (strongest merit — Aug-1994 Belgrade→VRS fuel embargo, Washington HVO cooldown; correctly back-loaded) → **military_credibility** (emergent, benign, no-data-guarded) → **internal_cohesion** (authentic, but recalibrate the `<40` threshold vs the post-#63 distribution first — it currently fires for all factions) → **international_standing** (**do NOT activate as-is** — the 1992 anachronism is real: intl-isolation pressure was 1994–95; in 1992 the arms embargo hurt the Bosnian Muslims, not the Serbs, and an ungated `<30` would ahistorically brake the RS land-grab → turn-gate to ~turn 100+ or fold its real signal into patron_confidence). The verdict doc's "intl first" ordering is engineering-risk-driven, not historical.

## Phase 5 — Blocked / §6 / parked (do NOT pick up)
- **#170 same-axis concentration** — *causes* the boljanic_2 flip; only viable paired with an RS Doboj-garrison OOB bump (2-change, owner-gated).
- **Krivaja** — §6 non-delegable (historian + game-designer + explicit user approval; must NOT suppress the historical Srebrenica fall).
- **Ključ, Mistral SW-belt** — parked (multi-change redesign).

## Gate discipline (every Phase-2/3/4 lane)
One change per run; 40w byte-identity proof + **synchronous 188w pre-merge** (40w+CI is a false-green for combat changes — `feedback_188w_validate_combat_changes_before_merge`); Zvornik/Sana sacred anchors must hold; deliberate re-floor of CALIBRATION_MASTER + memory on GO.
