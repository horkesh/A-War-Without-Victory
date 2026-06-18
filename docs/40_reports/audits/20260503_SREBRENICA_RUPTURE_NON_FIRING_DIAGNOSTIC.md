# Srebrenica Rupture Non-Firing — Diagnostic Audit

- **Date:** 2026-05-03
- **Lane:** LANE-NIGHTSHIFT-ROUND2-SREBRENICA-RUPTURE-DIAGNOSTIC
- **Status:** AUDIT-ONLY — no engine fixes proposed. § 6 BLOCKED for fix; this lane delivers the diagnostic tool and the binding canon questions only.
- **Diagnostic tool:** `tools/diagnostics/srebrenica_rupture_trace.cjs`
- **Test:** `tests/srebrenica_rupture_trace_diagnostic.test.ts`
- **Primary fixture run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1623`
- **Cross-reference run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1621`
- **Canon files referenced:**
  - `src/sim/negotiation/rupture_consequences.ts` (Ring-2 rupture evaluator)
  - `src/sim/combat/enclave_resilience.ts` (Ring-1 mechanical preconditions)
  - `data/scenarios/events/consequences.json` (event-layer cross-checks)
  - `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (boundary)

## 0. Executive summary

The `srebrenica_genocide_1995` rupture is **canonically silent in n1623** because the Ring-2 evaluator's three preconditions are not all met. Two of three conditions are MET; the third (RS control of the Srebrenica capital OSID) is UNMET because the enclave never falls in the simulation.

| Cond | Definition | t160 | t170 | t180 | t188 | Class |
|------|---|---|---|---|---|---|
| c1 | `event_flags.srebrenica_enclave_formed === true` | MET | MET | MET | MET | (e) |
| c2 | `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'` | UNMET | UNMET | UNMET | UNMET | **(c) + (d)** |
| c3 | `state.meta.turn >= 160` (current event-owned receipt contract; supersedes this diagnostic's original 140 floor) | MET | MET | MET | MET | (e) |
| ALL | rupture would record | NO | NO | NO | NO | — |

(t160/t170/t180 values inferred from final-state controller history: capital is RBiH-held throughout. The tool reports `(no weekly view)` because `weekly_report.jsonl` does not include `political_controllers` deltas; this is a known gap, not a fault of the tool.)

`rupture_consequences` array is empty in n1623 final state.

## 1. Findings table — per-condition status

### c1 `srebrenica_enclave_formed`

- **t188 status:** MET. `event_flags.srebrenica_enclave_formed === true`.
- **Source:** Set by an event in `data/scenarios/events/war_1992.json` (sets_flags block) once the enclave geometry crystallizes.
- **Classification:** **(e) canon-correct emergent silence on the input side** — flag wiring works.

### c2 `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'`

- **t188 status:** UNMET. Capital is **RBiH-held**. Of 11 enclave OSIDs, **only 1** (`mala_daljegosta_2`) has fallen to RS by t188.
- **Diagnostic context (n1623 t188):**
  - RBiH pocket personnel: **3 000** (capital garrison: **600**, single brigade `arbih_280th_east_bosnian_light`, cohesion 100).
  - VRS Drina-perimeter personnel (Bratunac/Rogatica/Višegrad/Vlasenica/Zvornik): **9 434** in 7 formations.
  - Force ratio VRS-perimeter / RBiH-pocket: **3.14×**.
  - Srebrenica enclave resilience entry: `{ resilience: 25 (cap), isolation_turns: 173, hardening_active: true }`.
  - Žepa parallel: also resilience 20 (cap), isolation 173, hardening, garrison 286 pers — same non-fall pattern; both Ring-2 events historically coupled.
- **AAR evidence — both canonical 1995 trigger ops were attempted and failed:**
  - **Operation Stupčanica-95** (target Žepa, started t172, ended t179, 7 turns):
    - 3 brigades (`rs_1st_milii`, `rs_1st_podrinje`, `rs_1st_vlasenica`), initial strength 5 957.
    - `force_ratio_estimate = 0.84` (sub-parity per predictor).
    - 1 attack, 0 captures, 0 casualties inflicted, 0 suffered.
    - Outcome: **failure**, `recovery_reason: 'max_failures'`. Verdict: "Indecisive" (3 stars).
  - **Operation Krivaja-95** (target Srebrenica capital + 4 pocket OSIDs, started t180, ended t187):
    - 2 brigades (`rs_1st_milii`, `rs_5th_podrinje`), initial strength 2 558.
    - `force_ratio_estimate = 0.092` (~9 %; predictor sees the assault as structurally hopeless).
    - **0 attacks, 0 captures**.
    - Outcome: **failure**, `recovery_reason: 'planning_invalidated'`.

- **Classification:**
  - **(c) bot AI / corps-allocation gap** — Drina Corps committed only 2–3 brigades against the rupture targets. Historical Krivaja-95 used roughly 5 brigades plus heavy artillery and Skorpions police; Stupčanica-95 likewise drew on a corps-scale concentration. The simulation's corps commander is not concentrating force at the rupture moment.
  - **(d) combat math gap** — `getEnclaveDefenseBonus` (resilience 25 × 0.02 = 1.50, then × 1.05 hardening ≈ 1.575) plus `getEnclaveGarrisonPower` (population × 0.05 × 0.15 × 1.50 × 2.0 capital mult) plus baseline P1 defensive fire combine to push the predictor's ratio so far against the attacker that the op aborts in planning. The math is canon-correct in isolation; whether it is correctly *calibrated* against historical July 1995 force levels is the open canon question (§ 5).

### c3 `turn >= 160` (superseded current contract)

- **t188 status:** MET (turn 188 ≥ 140).
- **Classification:** **(e) canon-correct.** No issue.

## 2. Ranked failure-hypothesis table (most likely first)

1. **H1 — VRS Drina Corps under-commits (bot AI gap, type c).**
   The corps does not stage a corps-scale concentration at the rupture window. Operations Stupčanica-95 and Krivaja-95 launch on the historically correct turns (t172 / t180) but with 2–3 brigades each, far below the historical Krivaja-95 concentration. This is a *brigade-allocation* problem, not a *force-availability* problem: the perimeter has 9 434 RS personnel (3.14× the pocket), but the launch op rosters draw only 2 558 / 5 957 of them. Locus: corps commander's decision to assign brigades to the operation, not the operation's existence.

2. **H2 — Combat predictor over-credits the enclave (combat math gap, type d).**
   `force_ratio_estimate = 0.092` for Krivaja-95 implies the predictor multiplies defender power by roughly 8–10× over base. That is the joint product of capital_garrison_mult (×2), resilience defense bonus (×1.575 hardened), enclave garrison-from-population, and standard P1/urban modifiers. Each layer is individually canon-grounded, but their **product** at `resilience: 25, hardening_active: true, capital OSID, urban tag` may exceed what the historical Krivaja-95 force ratio (~3:1) could plausibly overcome under any committed-force level. If H1 is fixed without revisiting H2, the predictor will still abort the op. The two are coupled.

3. **H3 — Sensitive-history gate is canon-correct emergent silence at the rupture-record layer (type e).**
   `evaluateRuptureConsequences` is a *reporter* of locked consequence, not a forcer of capture. The Ring-2 contract is exactly: "if the enclave falls *by mechanics* in 1995, record the genocide rupture." The non-firing in n1623 is consistent with that contract — the bug, if any, is upstream in H1/H2. **No fix to `rupture_consequences.ts` is appropriate.** This hypothesis is listed last because it is the *correct* layer of accountability, not because it is unlikely.

## 3. Cross-cuts and non-issues observed during the trace

- **n1621 (pre-A2 baseline):** the earlier audit's "zero operations launched after turn 150 in n1621" finding is consistent with the AAR pattern in n1623: the corps is launching ops, but they recover at `max_failures` or `planning_invalidated` quickly — a single-data-point check on `operations_active` in `weekly_report.jsonl` will read "near-zero" because the lifecycle is short.
- **Žepa is the second rupture-class enclave** by historical canon (UN Resolution 819 + July 1995 fall). It is *not* currently wired into `rupture_consequences.ts` as a separate consequence — there is no `zepa_genocide_1995` evaluator. Whether that is canon-intentional or a parity gap is a § 5 question.
- The diagnostic tool intentionally does not import from `enclave_resilience.ts`; it copies the OSID list verbatim with provenance comments to remain read-only against engine code.

## 4. § 6 sign-off — binding canon-amendment questions

These are the **specific binding questions** that must be resolved by canon owners before *any* fix is shipped to the engine, OOB, or rupture conditions. Each question is phrased so a future canon-amendment lane has a yes/no or pick-one answer to bind to.

1. **Q-CANON-RUPT-1 (force-commit floor for trigger ops).**
   For the canonical 1995 enclave-capture operations (Krivaja-95, Stupčanica-95), what is the binding minimum committed-brigade count and minimum personnel that the engine must enforce on the VRS Drina Corps when it launches these ops? *Bind a numeric floor* — the current 2–3 brigades / 2 558–5 957 pers is below any plausible historical reading.

2. **Q-CANON-RUPT-2 (combat-math envelope for capital-OSID enclaves).**
   Is `force_ratio_estimate ≈ 0.09` against a hardened capital-OSID enclave with garrison ~600, resilience 25, isolation 173 turns the *intended* canon outcome of the layered defense bonuses? If yes, the rupture cannot fire under any historical force concentration and the historical fall must be modeled by a different mechanism. If no, name which layer (capital_garrison_mult ×2, resilience-defense ×1.575 hardened, garrison-from-population, urban P2, P1 defensive fire) is over-weighted.

3. **Q-CANON-RUPT-3 (Žepa parity).**
   Should `rupture_consequences.ts` carry a separate `zepa_fall_1995` consequence (UNSC Resolution 824 safe-area, mass deportation, no genocide finding by ICTY but ethnic cleansing established), or is the Srebrenica rupture canonically the sole 1995-enclave Ring-2 record? *Bind a yes/no.*

4. **Q-CANON-RUPT-4 (rupture vs. predictor coupling — design intent).**
   Is the Ring-2 rupture intended to fire only when c2 emerges from *unforced* combat (preserving "no railroad" canon), or is there a canon-permitted path for the engine to record the rupture under historical-window heuristics even if the bot/combat predictor would not fall the enclave? *This is the boundary question.* Answer binds whether the fix lives in (a) corps AI, (b) combat math, (c) a new canon-permitted heuristic, or (d) explicit acceptance that the rupture may not fire in some runs.

5. **Q-CANON-RUPT-5 (sensitive-history boundary on diagnostic outputs).**
   Per `SENSITIVE_HISTORY_DESIGN_GATE.md`, is the diagnostic tool's stdout / JSON output (which lists garrison rosters and force ratios at Srebrenica) within the read-only diagnostic envelope, or does it require additional access controls before it lands in `tools/diagnostics/`?

## 5. What this lane does NOT do

- Does **not** modify `enclave_resilience.ts`, OOB JSON, rupture conditions, FORAWWV, paint anchors, or `political_controllers`.
- Does **not** propose a code fix or relax a precondition.
- Does **not** alter run artifacts.

The diagnostic tool is read-only; the test suite verifies that property via mtime+size snapshot equality.

## 6. Verification

- Tool ran cleanly against `runs/apr1992_definitive_188w__210e69404d054959__w188_n1623`, output reproduces this report's t188 numbers verbatim.
- Tool is parametric — invocable as `node tools/diagnostics/srebrenica_rupture_trace.cjs <run_dir> [--write-json] [--turns t1,t2,...]`.
- Test suite (`tests/srebrenica_rupture_trace_diagnostic.test.ts`) covers: determinism (sha256-equal stdout across invocations), read-only (mtime+size hash unchanged after run), and emission of canonical condition keys c1/c2/c3.
