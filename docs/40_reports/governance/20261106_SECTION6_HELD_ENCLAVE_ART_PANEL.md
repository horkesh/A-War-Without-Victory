# §6 Pyrrhic panel — the held enclave-decision art (8.7, 8.9, 8.10), 2026-11-06

**Question:** may the three plates held "with the feature" since June 2026 — 8.7 `decision_header_enclave_overrun.webp`, 8.9 `decision_overrun_aftermath.webp`, 8.10 `decision_contain_siege.webp` ([prompt pack](../proposals/20260609_ART_PROMPT_PACK_SECTION6.md) §8.7/8.9/8.10; [sign-off record](20260610_SECTION6_ART_SIGNOFF.md) rows 8.7–8.10) — be generated and placed inert ahead of the presidential enclave OVERRUN/CONTAIN feature ([build spec](../proposals/20260610_ENCLAVE_DECISION_BUILD_SPEC.md))?

**Seats (the four the sign-off record names; unanimity required):** Historian, Scenario-tester/calibration, Engine/systems, Red-team. Read-only, in parallel, on main at `edd4b2d67`. Integrator: Claude.

## Outcome: HOLD stands. Not unanimous (2 approve-inert, 2 hold). The plates are not generated. The panel's conditions become the revised brief for the feature's own PR.

| Seat | Verdict | Reason |
|---|---|---|
| Historian | APPROVE-INERT | No code references the names, so an unreferenced file cannot be a Ring-3 surface. The feature has a documented basis on the RS side: Directive 7 (8 March 1995) as a CONTAIN policy and the 9 July 1995 widening of Krivaja-95 as an OVERRUN decision (ICTY Krstić IT-98-33-T; Karadžić IT-95-5/18-T); Goražde 1994 and Bihać 1994 as assaults halted by NATO pressure (BB2). No matching RBiH or HRHB presidential decision exists; offering the card to those factions (spec O-2) is a counterfactual and must be labelled one. |
| Engine | APPROVE-INERT | The files change nothing in the simulation: the determinism scan skips `src/ui/map/`; no tool reads the asset folders; `decision_headers/` is loaded by explicit import only; `event_illustrations/` is globbed but renders only on a matching event key, and none exists. The feature itself is not built: `enclave_decisions` state and its migration (now v39+, not the spec's v37), the levers and trigger, tests T-1…T-10, the default-OFF flag. Spec §2.1 lifts attack restraint inside the bot target builders without naming `CorpsOperation`; this conflicts with the rule that brigades attack only through `CorpsOperation` and must be reconciled before the build. |
| Scenario-tester | HOLD | Zero simulation effect, but no screen exists to show the plates; 8.9/8.10 would ship in the bundle unused. The feature can move Srebrenica/Žepa fall timing (event trigger t169–185), the rupture turn (≥160), Goražde/Bihać holds and the enclave-guard checks in `CALIBRATION_MASTER.md`; it needs byte-identity with the flag OFF and a 188-week run with it ON before shipping. Generate the art with the feature build. |
| Red-team | 8.7 HOLD, 8.9 REJECT as framed, 8.10 HOLD | 8.7's filename names one branch above a two-option set and so brands OVERRUN as the headline choice; rename to a neutral `decision_header_enclave_decision`. 8.9 takes "the besieger's remove" (the perpetrator's viewpoint) and repeats Potočari motifs (a child's coat and shoe), overlapping 8.2, and would render with `alt=""` and the RS colour because it is not in the gated table. 8.10's snow, hearth smoke and stillness read as patience and mercy; it needs a visible starvation cue such as a turned-back convoy, still with no faces. |

## Conditions for the feature's own PR (all four seats, merged)

1. **Art is generated with the feature, not before.** It lands in the same PR, behind the feature's default-OFF flag, and this panel reconvenes on the actual plates.
2. **Rename 8.7** to a branch-neutral name (`decision_header_enclave_decision`); the header is the desk before the order and never names a branch.
3. **Re-prompt 8.9**: no besieger viewpoint, no Potočari signatures (battery factory, UN or Dutchbat vehicles, buses, separation, the column in the woods, stelae), no bodies, faces or belongings that stand for victims; aftermath and absence only.
4. **Re-prompt 8.10** with a starvation cue; CONTAIN is never framed as the good, merciful or "prevented" outcome (gate Ring-3 #10; spec GE-2).
5. **Branch stills are shown only after the engine records the outcome**, never as option previews (the assault can be repulsed; an earlier image is a false forecast under `PLAYER_VISIBLE_STATE.md`).
6. **Safeguards in code:** all three names in `SECTION6_STILL_ALT_KEYS` with factual alt text and the neutral accent; none in `EVENT_CATEGORY_HEADERS`, `TONE_STILLS`, `getConsequenceStillForRecord` or any conscience fallback; a test that fails if they appear there.
7. **Generic plates:** no faction markers, no religious buildings, no identifiable site unless the enclave is named, and never Srebrenica's signatures even then. Any offer of the card to RBiH or HRHB is labelled counterfactual.
8. **Bright lines (reject outright):** the act, killings or executions depicted; an OVERRUN plate paired with any sign of reward or victory; any use of the plates as a decision button, reward, codex header or tone fallback.

## Recorded for the feature lane

- Spec §2.1 vs `CorpsOperation`-only attacks: reconcile before build (Engine).
- Spec's save-schema assumptions are stale (v37 → v39+); the serializer-collision blocker it cites is cleared (Engine).
- Calibration gates the feature must pass: enclave fall timing, rupture turn ≥160, Goražde/Bihać holds, enclave guard 9/9, byte-identity OFF, 188-week ON (Scenario-tester).
