# Force Quality Foundation — Phase 5b Tier 1 Synthesis

**Status:** Tier 1 panel reports consolidated. Tier 2 reads this file + the raw-data files for analysis. Orchestrator (parent) does final synthesis.

**Source files:**
- Raw data: `_force_quality_post_phase4_runs.md`, `_force_quality_post_phase4_metrics.md`
- Tier 1 reports: war-or-game, operations-expert, historian (this file consolidates them).

## Tier 1 verdicts at a glance

| Dimension | war-or-game | historian | operations-expert |
|---|---|---|---|
| RBiH professionalization curve | **P1** — too clean; median saturating at 0.90 cap; should be bimodal | **P0** — only 5th Corps + select 7th/3rd warrant the 0.90 tier; rest of ARBiH should be uneven | (n/a — not its scope) |
| RS officer degradation curve | **P2** — plausible mean but flat 156→188w when historical was accelerating decline | **P1** — 0.55 mean defensible but distribution must be bimodal (intact JNA-cadre + attrited Krajina) | (n/a) |
| HRHB officer curve | **P1** — mean 0.65 too high; absolute level wrong even though internal asymmetry is correct | **P1** — only Guards + HV-attached HVO units warrant top-tier; bulk of HVO mountain brigades did not | (n/a) |
| Federation internal balance at 188w | **P1** — RS share ~Dayton-correct (+1.8%); ARBiH overshoots HRHB by 9pp | **P1** — confirmed; HRHB historically held W. Herzegovina, Lašva, Posušje/Tomislavgrad/Livno | (n/a) |
| VRS equipment decay (art_op 1273→14, tank_op 332→1) | (flagged within VRS Krajina ops) | **P0** — contradicts Dayton-era inventory; ICTY *Mladić*, *Tolimir* show late-1995 VRS firing artillery; IFOR cantonment has hundreds operational | (n/a — observed in support_delivery trait) |
| Anchor regressions (brcko, foca_3) | **P1** — ARBiH overshoots into core RS terrain; Brčko fails 104w+188w both | (in §5 map shape) | (n/a) |
| HRHB late-war activity | **P1** — Mistral 2 fires (improvement), still mostly reactive | (n/a) | **0** HRHB ops via plan-path; HRHB authoring is bypassed entirely |
| VRS late-war ops emergence (3 in 104-156w) | **P2 with one P0** inside — Krivaja-95 codename used for fail-stub op; sensitive-history collision risk | (sensitive history context only) | All 3 in vrs_1st_krajina at op:bugojno:kula_2; support_delivery monotonic decline 0.33→0.29→0.25 |
| Phase 4 soft-gate firing rate | (n/a) | (n/a) | **3 firings / 19 traited ops (16%)** — all `staging_extended`, all ARBiH 1st/3rd Corps. **0** `soft_block`, **0** `axis_cap` |
| Phase 4 trait persistence | (n/a) | (n/a) | **AAR works (19/34 ops carry traits)**; **decision_trace persistence BROKEN** (0/19 corps; field stripped before serialization) |
| Phase 4 trait composite | (n/a) | (n/a) | **operation_readiness flattens faction asymmetry** (RBiH 0.59 vs RS 0.58 mean); only `staging_reliability` shows real RBiH/RS divergence (0.47 vs 0.73) |

## Three Tier 2 must-answer questions

### Q1 — Is Phase 4 a partial-shipping defect (panel: gap-finder owns)
Operations-expert finding: 44% of ops (15/34) bypass the soft gate because they are pre-planned/JNA-injected, including Krivaja-95, Mistral 2, Op Sana w175 (ARBiH's first multi-axis). The gate's threshold (0.30) is also structurally unreachable in the observed corpus (min 0.47). Phase 4 ships a real wiring path for commander-emitted ops only; for the historically-anchored ops the foundation is inert.

**Question for Tier 2:** is this a Phase 4 acceptance defect that requires a follow-up packet (P1c per audit) before milestone close, or is it correctly scoped — Phase 4 is the foundation, and pre-planned-op coverage is a separate consumer wiring task (per audit §10 item 5)?

### Q2 — Distribution-shape concerns (panel: game-designer owns)
War-or-game and historian both flag RBiH 188w median at the 0.90 cap and HRHB mean at 0.65 as distribution failures, not level failures. The milestone explicitly forbade tuning constants beyond unit semantics; the cap is at `OFFICER_QUALITY_CAP = 0.90`. The Shape C unit fix means the timeline absolute rate (RBiH 0.015/turn) compounds against the diminishing-returns factor `(1 - q*0.5)` and over ~165 turns puts the bulk of brigades against the cap.

**Question for Tier 2:** is the saturation a feature (the cap is the historical "professional" ceiling and 5th Corps did reach it) or a bug (the cap is reached by too many brigades because there's no offsetting per-brigade quality decay tied to e.g. brigade rotation, casualty replacement, recruitment dilution)? Out-of-milestone-scope to fix now, but the verdict shapes the next packet.

### Q3 — Canon compliance (panel: canon-compliance-reviewer owns)
The milestone removed a calendar railroad (good), wired previously-decorative signals (good), and added a soft gate that fires for some ops (partial). The architecture contract's "Forbidden Shapes" prohibit calendar victory rails, raw 1995 ARBiH combat multipliers, total VRS collapse switches, painted-target feedback loops, and sensitive-history bypass. Operations-expert flagged that Krivaja-95 (codename of the historical Srebrenica operation) fires at w168 as a pre-planned injection, 0 attacks. This is NOT the milestone's introduction — Krivaja-95 was likely already in the OOB/pre_planned_operations.ts. But the milestone now intersects with it via the Phase 4 trait carry-through (which the AAR captures even though the gate doesn't intercept).

**Question for Tier 2:** does anything in the milestone (Phase 1-4 + Phase 5a) violate canon hierarchy, the SENSITIVE_HISTORY_DESIGN_GATE, or the architecture contract's Forbidden Shapes? In particular: Krivaja-95's existence + the AAR-traits surface that exposes its force-quality state — is that a sensitive-history boundary issue, or out-of-scope (it was pre-existing OOB)?

## Acknowledged improvements (must not re-litigate)

- RBiH 0.092 → 0.806 mean officer_quality at 188w; the audit's 100× unit bug is gone.
- VRS calendar brain-drain railroad removed.
- VRS late-war ops emerging from absolute zero (3 in 104-156w window).
- HRHB authoring Mistral 2 in late-war (was 0 post-40w in audit corpus).
- 188w RS painted share within +1.8pp of Dayton (substantial improvement).
- Phase 4 wiring exists, soft gate fires (even if asymmetrically); AAR snapshot captured for 56% of ops.
- Determinism preserved (manifest baseline regression passes; 5 deterministic Phase 5a runs).
- 4 commits all phase-coherent; tests added for each phase (40+ new tests).

The architecture contract explicitly accepts: "the fact that late-war painted fit worsens temporarily while removing railroads is not a stop condition." Tier 2 should not penalize that as failure.

## Out-of-milestone-scope follow-ups (record for next lane)

- Equipment decay rate audit (P0 historical violation per historian).
- Distribution-shape adjustments — cap interaction with Shape C learning rate; territorial-brigade dilution.
- Pre-planned-op coverage in Phase 4 trait wiring (P1c per audit).
- decision_trace persistence bug (operations-expert finding 2).
- Composite trait reweighting / threshold review.
- Federation internal-balance — HVO authored-op pipeline (issue #20 / Option K family, separate lane).
- VRS late-war doctrinal arc / endogenous degradation curvature.

## Closing

Phase 5b Tier 1 panel: improvement ratified, four discrete concerns surfaced (3 distribution/wiring + 1 historical equipment decay), no P0 blocker for milestone close on the **architecture contract** axis.
