# Live January 1993: independent scenario-tester assessment (2026-11-05)

Read-only review of `claude/live-jan1993-measurement` (b78cdda5a plus the final-save export). Evidence: `compare-t39-*.json`, the six final saves (`political.control_events`, `corps_command`, `pending_proposal_reviews`), the cell diffs, and the code at the lines cited.

## 1. Validity: not a valid live-equivalent baseline

What was measured:
- **The two branches start the same apart from player identity.** Both start at 322/286/104. Both run `decision_mode=historical`. The HRHB-player branch matches headless control exactly from t1 to t11. The changes `startNewCampaign` makes at startup are not what moves control.
- **The tool forces autonomy 1.** It sets `autonomy_level = 1` (`desktop_calibration_compare.ts:680`). This overrides production startup, which sets Level 2 and documents why: Level 1 holds plans at `ready` (`desktop_sim.ts:350-359`).
- **The Level-1 plan guard has no faction check** (`commander_loop.ts:236-296`). In every player branch the final save shows `vrs_1st_krajina`, `vrs_2nd_krajina`, `vrs_sarajevo_romanija`, `arbih_1st_corps` and `arbih_3rd_corps` held at "awaiting player approval at Level 1". RS/HRHB-player also hold `vrs_east_bosnian`. Headless holds none. Approval proposals are only generated for the player's corps (`proposal_generation.ts:192`), so non-player corps can never be released. `plan_vrs_2nd_krajina_t4_opportunity` (target arapusa_2) is still held at t39 in all three runs.
- **The player's own pre-planned plans can never be approved either.** They have empty `target_osids`, and the proposal generator skips those (`proposal_generation.ts:211`). The harness never answers `APPROVE_OP`; RS-player's two proposals expired as `accepted=false`.
- **`emit.ts:775` blocks local-occupation operations for every corps at Level 1**, again with no faction check.
- **`--paramilitary-policy deny` did nothing.** No transcript contains a paramilitary row.
- **Provenance gap.** The `HISTORICAL_OP` accepts that appear in the final saves are not in the tool's transcript. Something outside the tool accepted them; I did not trace what.

Verdict: the player branch measures a Level-1 staff left unattended, with a guard that also freezes the bot factions. It is not historical live play. Do not read 688/694/697 as the live baseline.

## 2. Mechanisms

Measured, from `control_events`:
- **A. Six western cells.** In headless, RS takes arapusa_2 (t20), hotonj (t20), volari_2 (t27), jezero_2 (t33), baljvine_2 (t36) and donji_koricani (t39) in combat. In every player branch none of these has any event, so they stay with their initial holder. This matches the held 1st/2nd Krajina and Sarajevo-Romanija plans. Three of them are named captures (Jezero, Baljvine, Donji Korićani). Named-capture score: headless 7/8 (it misses Lupnica, which is HRHB); RBiH-player 4/8; RS-player 3/8 (Korenići is also lost); HRHB-player 4/8. Hotonj is painted RBiH, so here the stall happens to help.
- **B. RBiH early east.** In headless, RBiH bot paramilitaries take bukvik_gornji_2 and obadi at t1 and olovci_2 at t2. When RBiH is the player, the engine blocks the player's paramilitaries while the policy event is pending (`paramilitary_sweep.ts:421-449`). That event fires at t3 and its default is always_deny. RS-player shows the mirror: RS paramilitaries start two turns late.
- **C. RBiH later east.** Headless ARBiH combat captures are missing from the RBiH-player branch: jezestica_2 (t16, 1st Cerska), sebiocina (t17), cardak_2 (t22), sopotnica (t26) and glamoc (t27, both 801st). In the player branch only, RS paramilitaries also take cerska_2 (t6) and pobudje_2 (t14).
- **D. RS-player Zvornik.** In headless, rs_1st_zvornik and rs_1st_birac take novo_selo (t2), krizevici (t5) and donja_kamenica (t6). The RS-player branch has no event for any of them.

Inferred, not proven cell by cell:
- C and D look like the player's own corps being stalled by the Level-1 gates. The local-operation block after t20 fits the t22/t26/t27 losses.
- Cerska and Pobudje are probably knock-on effects of B, which changes which pockets RS paramilitaries target.
- Fits: from about t16, attack orders in the player branch run well below headless in every run (RBiH t36–39: 0 against 3–6).

## 3. Single most useful next step: fix the harness, not the engine first

Re-run this brief with production autonomy (Level 2, as `startNewCampaign` sets it). Make autonomy a recorded CLI input and keep everything else the same. Level 2 is what the live game actually runs. It removes the suspected cause of A, C and D without touching the engine, and it isolates B.

Two separate items follow. Neither is a calibration lever.
1. **Engine defect** (gameplay-programmer with corps-army-commander). Scope the Level-1 guard (`commander_loop.ts:271`) and the `emit.ts:775` block to the player faction. Make pre-planned plans approvable. Right now a live Level-1 player freezes both enemy armies' plans.
2. **Owner design question (B).** On this source, three painted RBiH cells (Bukvik, Obadi, Olovci) are held only through bot paramilitary captures in t1–2. A live RBiH player cannot get those captures under the historical always_deny default. Should early TO/Patriotic League holds count as paramilitary, or have another lawful path?
   - Inference: if B is the only gap left, a Level-2 RBiH run lands near 699, below 700.

Even headless misses the bar on this source: 702 with 7/8 named captures (Lupnica). None of this involves railroads, ownership writes or a change to the 707 target.
