# RF-F1: legacy S-id consumer sweep (sustainability, militia fatigue, negotiation momentum)

Date: 2026-11-14. Lane RF-F1 (audit F1, P0; register F1, SD2, SD3). Branch `claude/rf-f1-sid-sweep-c0780d`.

## 1. Premise, measured on main

Main after #600/#608, 188w, `final_state_hash` `53ffe8e9545686ad`, 712/709/710/705. A 112-week trace with a save every 2 weeks gave:

| Turn | Collapsed muns | Σ pressure | Momentum |
|---:|---:|---:|---:|
| 2 | 0 | 68 | 0.32 |
| 4 | 0 | 136 | **1.00** |
| 6 | 104 | 520 | 1.00 |
| 8 | 109 | 1,223 | 1.00 |
| 188 | 109 | 65,133 | 1.00 |

- Every sustainability municipality but Han Pijesak was `surrounded` and `collapsed` from t8 on. Scores fell about 17 a turn, because the per-pool loop degraded each municipality once per pool (2-3 pools per municipality share one record).
- Pressure was already 68 at t2, before any collapse: militia fatigue marked all 324 pools unsupplied every turn (`floor(110/10)` = 11 a turn per faction).
- Cause: the war steps handed the operational settlement map (keys `op:…`) together with `context.input.settlementEdges`, the legacy edge list (ids `S…`). No BFS neighbour was ever found and the legacy supply search reached nothing.

## 2. Fix

- `update-sustainability` and `update-militia-fatigue` take the OSID front and supply from `buildOsidDisplacementPressureInputs` (RF-3), the same id space as their settlements.
- Sustainability (OSID path): one evaluation per municipality with a pool, for one holder. A faction whose OSIDs there are all cut off from its supply sources goes first (so minority pockets like Srebrenica after spring 1993 and Žepa inside Rogatica count); otherwise the faction holding most OSIDs; ties by `CANONICAL_FACTIONS` order. Surrounded = that holder's OSIDs there are unreachable from its supply sources (equivalent to the canonical "friendly path to a supplied friendly municipality"). A faction with no supply entry is not judged cut off.
- Militia fatigue (OSID path): a pool is supply-isolated only where its faction holds ground. Measured on main, 32-89 pools per faction sit in municipalities their faction holds none of; counting them as "unsupplied" would re-pin momentum within a few turns.
- `update-negotiation-pressure` builds its front edges from the same OSID inputs. Breach candidates still read 0 (see §5).
- Legacy paths (no OSID input) are unchanged for fixtures and CLI harnesses; the legacy sustainability loop now calls the shared `applySustainabilityTurn` and stays byte-identical (independent review).
- Probe: `npx tsx tools/diagnostics/f1_sustainability_probe.ts <save…>` replays both paths on any save.

What the OSID path flags on main's own saves (instantaneous status): t2 the 1992 takeover pockets (Prijedor, Sanski Most, Ključ, Bosanski Novi, Srebrenica …); t30 Srebrenica, Bratunac, Vlasenica, Jajce; t60 the HVO Lašva-Kiseljak pocket (Vitez, Busovača, Kiseljak, Kreševo, Žepče, Travnik, Fojnica, Vareš …); t94 Goražde, Rogatica (Žepa), Srebrenica, Foča plus the HVO pocket; t112 Goražde, Rogatica, Srebrenica.

## 3. Measured result

| Run | Head | Hash | Jan93 | Apr94 | Apr95 | Oct95 |
|---|---|---|---:|---:|---:|---:|
| main ref | e07847268 | `53ffe8e9545686ad` | 712 | 709 | 710 | 705 |
| 1 (saves every 4w) | f2e779012 | `4ff4a7665c0a35b5` | 712 | 709 | 710 | 705 |
| 2 (final head) | 81c57fab9 | `4ff4a7665c0a35b5` | 712 | 709 | 710 | 705 |

- Battles per week 2.697 on both (RS 0.952, RBiH 1.441, HRHB 0.303): 0.00% in every faction.
- Final political control and every formation's personnel and location identical to main.
- Strict health gate PASS; enclave and Farz guards intact.
- Consistency 1: `subseg:sector:arbih_1st_corps:4:0` gap, byte-identical on main (pre-existing, SD15).
- What moves: `sustainability_state` (collapsed at t188 109 → 27), militia pool fatigue, negotiation pressure (t188 RBiH 22,283 → 1,716; RS 22,029 → 1,783; HRHB 20,821 → 816), the early IVP-penalty ledger lines (momentum reaches 1.0 at about t19 instead of t4), Dayton package capital and HRHB internal cohesion in the 4th decimal, HRHB war exhaustion 8,078 → 8,065 and its weariness bands one week later (strained t47 → t48, cracking t79 → t80). The exhaustion shift comes from the lower momentum in t1-t19 through the `negotiation_momentum × 0.05` external exhaustion modifier (from t2: HRHB 243.4 → 241.8); it changes `power_ratio` in the second decimal on 30 of the 507 battle records and no battle outcome, casualty figure or control change.
- Baselines re-pinned at the final head: `final_save.json` (`4ff4a766…`), `run_summary.json` (`955b67d8…`), `end_report.md` (`3f7ac25c…`, HRHB exhaustion line only) and `weekly_report.jsonl` (`d137d7a8…`, faction exhaustion and the 30 power ratios). `control_delta.json`, `formation_delta.json`, `activity_summary.json` and `watched_operations.json` reproduce unchanged.

## 4. Standing question: which matched cells depend on a known-broken mechanic?

None through this defect. All four checkpoints and the t188 control are identical (diff 0), battles per week are identical, so no matched cell was bought by the fake collapse. The ceasefire (t94) and Washington (t98) weeks also do not move: the momentum gate (W3 `> 0.50`, C5 `> 0.40`) is open from t4 on main and from about t19 here, and both agreements fire on their other gates. No matched cell depends on the still-saturated momentum in a way this run can detect; that will be re-asked when RF-F1b changes the normalisation and the agreement weeks move.

## 5. SD2 status (front_segments / front_pressure readers)

Covered by this fix: none of the `front_segments`/`front_pressure` readers is revived. The fix only moves the sustainability and negotiation-pressure front-edge inputs into the OSID id space, so their ids match the rest of their inputs.

Still dormant (the legacy front substrate, F9; registered): `sync-front-segments`, `accumulate-front-pressure`, `accumulate-exhaustion` (profile exhaustion, the pressure's exhaustion-delta term), `computeFrontBreaches` and so the breach terms in sustainability, negotiation pressure and negotiation offers, formation-fatigue front-edge supply (edge/region assignments; campaign supply truth comes from the OSID critical-supply check), front-posture normalisation, loss-of-control trends. Reviving them is the F9 engine item (post-1.0 per the audit).

## 6. Out of scope, registered

- **RF-F1b** (orchestrator-registered): momentum `clamp01(Σ cumulative pressure / 100)` saturates at about t19 on honest inputs; W3/C5 stay always-true. Fixing it moves the ceasefire/Washington weeks (historian + game designer).
- **F1c**: `political_peace_plan.ts:121` RS floor erosion `min(15, pressure / 267)`, commented "pressure ~4000 (typical w40)". Fitted to the fake numbers; with honest pressure RS reaches about 6.7 points by t188. Acts only in explicit emergent mode (historical mode uses documented outcomes).
- **F1d**: `treaty_acceptance.ts:133` `PressureFactor = floor(target_pressure / 5)` dwarfs every other acceptance factor on both main (≈4,400) and this branch (≈340).
- **F1e**: collapse is permanent and canon books it to whoever controls the municipality now, so a captor inherits +1 a turn from a collapse it caused; and a single cut-off village outranks a supplied majority holder. Both follow the existing canon rule; design call.
- Legacy-edge consumer inventory: §7.

## 7. Legacy-edge consumer inventory

(see below)
